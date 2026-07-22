import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import BoardGrid from "../components/myGameBoard/BoardGrid";
import Dice from "../components/myGameBoard/Dice3D";
import DiceForOther from "../components/myGameBoard/Dice3DForOther";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { getMyColor, transformGroupedPlayers } from "../utils/gameView";
import { shouldAutoClearDice } from "../utils/shouldAutoClearDice";
import { FaCrown } from 'react-icons/fa';
import {formatPlayerName} from "../utils/formatPlayerName";
import InviteOverlay from "../components/myGameBoard/InviteOverlay";
import StatsModal from "../components/myGameBoard/StatsModal";

const GameBoard = () => {
  const [pawns, setPawns] = useState([]);
  const [diceValue, setDiceValue] = useState(null);
  const [user, setUser] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);
  const [boardId, setBoardId] = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [allDiceValues, setAllDiceValues] = useState([]);
  const [animatingPawn, setAnimatingPawn] = useState(null);
  const [rollingPlayerId, setRollingPlayerId] = useState([]);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [turnState, setTurnState] = useState({});
  const [turnSecondsLeft, setTurnSecondsLeft] = useState(null);
  const animationsRef = useRef(new Map());
  const pendingAnimationsRef = useRef(new Map());
  const socketRef = useRef(null);
  
  // ===== CREATE REFS FOR STATE VALUES =====
  // These refs will always hold the latest state values
  const onlinePlayersRef = useRef([]);
  const pawnsRef = useRef(pawns);
  const userRef = useRef(user);
  const playerStatsRef = useRef(playerStats);
  const animatingPawnRef = useRef(animatingPawn);
  const skipRollEmitRef = useRef(false);
  const lastRolledRef = useRef(null);
  const moveInFlightRef = useRef({
    locked: false,
    pawn_id: null,
    timeoutId: null
  });
  const isAnimatingRef = useRef(false);

  // ===== SYNC REFS WITH STATE =====
  // Every time state changes, update the corresponding ref
  useEffect(() => {
    onlinePlayersRef.current = onlinePlayers;
  }, [onlinePlayers]);

  useEffect(() => {
    pawnsRef.current = pawns;
  }, [pawns]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    playerStatsRef.current = playerStats;
  }, [playerStats]);

  useEffect(() => {
    animatingPawnRef.current = animatingPawn;
  }, [animatingPawn]);

  const myColor = useMemo(() => {
    const me = playerStats?.find(p => p.player_id === user?.id);
    return me?.color || "blue";
  }, [user, playerStats]);

  // 1) Load user and fetch initial board snapshot
  useEffect(() => {
    const saved = localStorage.getItem("user");
    let parsedUser = null;
    try {
      parsedUser = saved ? JSON.parse(saved) : null;
    } catch {
      console.error("Failed to parse user from localStorage");
    }
    setUser(parsedUser);
  }, []);

  // ===== MOVEMENT HELPER FUNCTIONS AS REFS =====
  // These need to access latest state through refs
  const lockMove = (pawn_id) => {
    moveInFlightRef.current.locked = true;
    moveInFlightRef.current.pawn_id = pawn_id;
    // console.log(`🔒 Locked for pawn ${pawn_id}`);
  };

  const unlockMove = (reason = "", pawn_id = null) => {
    if (moveInFlightRef.current.timeoutId) {
      clearTimeout(moveInFlightRef.current.timeoutId);
      moveInFlightRef.current.timeoutId = null;
    }
    
    if (moveInFlightRef.current.locked) {
      if (pawn_id && moveInFlightRef.current.pawn_id !== pawn_id) {
        console.warn(
          `⚠️ Unlock mismatch: expected ${moveInFlightRef.current.pawn_id}, got ${pawn_id}`
        );
        return; // Don't unlock wrong pawn
      }
      
      moveInFlightRef.current.locked = false;
      moveInFlightRef.current.pawn_id = null;
      // console.log(`🔓 Unlocked: ${reason}`);
    }
  };

  const AREAS = 4;
  const MAX_ID_PER_AREA = 18;

  const isCellId = (s) =>
    typeof s === "string" && /^cell-area-\d+-id-\d+$/.test(s);

  const parseCell = (cellStr, player_id) => {
    const m = isCellId(cellStr)
      ? cellStr.match(/^cell-area-(\d+)-id-(\d+)$/)
      : null;

    if (!m) return null;

    const area = Number(m[1]);
    const id = Number(m[2]);

    const areaToColor = { 1: "blue", 2: "red", 3: "green", 4: "yellow" };

    return {
      area,
      id,
      color: areaToColor[area] ?? null,
      player_id
    };
  };

  const toCell = ({ area, id }) => {
    if (id === null) return "finished";
    return `cell-area-${area}-id-${id}`;
  };

  // Store stepForward in a ref so it can access latest playerStats
  const stepForwardRef = useRef();
  stepForwardRef.current = ({ area, id, color, player_id }) => {
    let nextId;
    // Use ref to get latest playerStats and user
    const currentPlayer = playerStatsRef.current?.find((p) => p.player_id === player_id);
    if (id === 7 && !(color === currentPlayer?.color)) nextId = 13;
    else if (id === 12) nextId = null;
    else nextId = id + 1;

    let nextArea = area;
    if (nextId === null) {
      return { area, id: null, color, player_id };
    }
    if (nextId > MAX_ID_PER_AREA) {
      nextId = 1;
      nextArea = (area % AREAS) + 1;
    }
    return { area: nextArea, id: nextId, color, player_id };
  };

  const stepBackwardRef = useRef();
  stepBackwardRef.current = ({ area, id, color, player_id }) => {
    let nextId;
    // Use ref to get latest playerStats and user
    const currentPlayer = playerStatsRef.current?.find((p) => p.player_id === player_id);
    if (id === 13 && !(color === currentPlayer?.color)) nextId = 7;
    else nextId = id - 1;

    let nextArea = area;

    // Handle wrapping backward across areas
    if (nextId < 1) {
      nextId = MAX_ID_PER_AREA;
      nextArea = area - 1;
      if (nextArea < 1) {
        nextArea = AREAS; // Wrap to area 4
      }
    }
    
    return { area: nextArea, id: nextId, color, player_id };
  };

  // Store getAnimationPath in a ref
  const getAnimationPathRef = useRef();
  getAnimationPathRef.current = (startCell, steps, player_id) => {
    const parsed = parseCell(startCell, player_id);
    if (!parsed) return [];
    
    const path = [startCell];
    let pos = parsed;

    if (steps > 0) {
      // Forward movement
      for (let s = 0; s < steps; s++) {
        pos = stepForwardRef.current(pos);
        path.push(toCell(pos));
        if (pos.id === null) break;
      }
    } else if (steps < 0) {
      // Backward movement
      for (let s = 0; s < Math.abs(steps); s++) {
        pos = stepBackwardRef.current(pos);
        path.push(toCell(pos));
        if (pos.id === null) break;
      }
    }
    
    return path;
  };

  // Animation function using refs
  const animatePawnMovementRef = useRef();
  animatePawnMovementRef.current = (pawnIdx, path, pawn_id, callback) => {
    if (!path || path.length <= 1) {
      callback();
      return;
    }

    const startAnimation = (idx, animPath, id, cb) => {
      let stepIndex = 0;

      const intervalId = setInterval(() => {
        stepIndex++;

        if (stepIndex >= animPath.length) {
          clearInterval(intervalId);
          animationsRef.current.delete(id);
          setAnimatingPawn(null);

          // Run callback for this animation
          cb?.();

          // 🔁 After finishing this animation, check if there's another queued for this pawn
          const queue = pendingAnimationsRef.current.get(id);
          if (queue && queue.length > 0) {
            const next = queue.shift(); // { pawnIdx, path, pawn_id, callback }
            if (queue.length === 0) {
              pendingAnimationsRef.current.delete(id);
            } else {
              pendingAnimationsRef.current.set(id, queue);
            }
            // Start the next animation in queue
            startAnimation(next.pawnIdx, next.path, next.pawn_id, next.callback);
          }

          return;
        }

        setPawns((prev) => {
          const updated = [...prev];
          if (updated[idx]) {
            updated[idx] = {
              ...updated[idx],
              current_position: animPath[stepIndex],
            };
          }
          return updated;
        });
      }, 170);

      animationsRef.current.set(id, intervalId);
      setAnimatingPawn(id);
    };

    // If this pawn is already animating → queue this animation
    if (animationsRef.current.has(pawn_id)) {
      const existingQueue = pendingAnimationsRef.current.get(pawn_id) || [];
      existingQueue.push({ pawnIdx, path, pawn_id, callback });
      pendingAnimationsRef.current.set(pawn_id, existingQueue);

      // Optional debug:
      // console.log(`📥 Queued animation for pawn ${pawn_id}. Queue length: ${existingQueue.length}`);
      return;
    }

    // Otherwise, start immediately
    startAnimation(pawnIdx, path, pawn_id, callback);
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      animationsRef.current.forEach((intervalId) => {
        clearInterval(intervalId);
      });
      animationsRef.current.clear();
    };
  }, []);

  // 2) Create socket once
  useEffect(() => {
    const s = io(import.meta.env.VITE_API_URL,{
      auth: { token: localStorage.getItem('token') },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 20000,
    });
    socketRef.current = s;

    return () => {
      s.disconnect();
    };
  }, []);

  // 3) Join the board room ONLY after we know boardId and socket is connected
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !user) return;

    const join = () => {
      const payload = {}; // Identity is securely injected by JWT on backend
      try {
        s.emit("joinGame", payload, (ack) => {

          // 🔹 1. Validate ACK existence
          if (!ack) {
            toast.error("No response from server. Please try again.");
            return;
          }
          // 🔹 2. Handle server error
          if (ack.ok === false) {
            toast.error(ack.msg || "Failed to join board");
            console.error("JoinGame Error:", ack);
            return;
          }
          setTurnState(ack.turnState ?? {});

          // 🔹 3. Safe destructuring
          const data = ack?.data ?? {};
          const parsedDice = data.dice_value ?? [];
          const currentUserDice = parsedDice.find(d => d.player_id === user?.id);

          // 🔹 4. Update states safely
          setOnlinePlayers(ack.onlinePlayers ?? []);
          setPawns(data.pawns ?? []);
          setPlayerStats(data.players ?? []);
          setBoardId(data.board_id ?? null);
          if (data.board_id) {
            window.history.replaceState(null, '', `/play?board_id=${data.board_id}`);
          }
          setAllDiceValues(parsedDice);
          if (currentUserDice?.dice_value != null) {
            setDiceValue(currentUserDice.dice_value);
            skipRollEmitRef.current = true;
            lastRolledRef.current = currentUserDice.dice_value;
          } else {
            setDiceValue(null);
            skipRollEmitRef.current = false;
            lastRolledRef.current = null;
          }
          setLoading(false);
          toast.success("Successfully joined game!", {id: "successfull-join-game"});
        });
      } catch (err) {
        // 🔹 5. Unexpected error
        setLoading(false);
        console.error("Join function crashed", err);
        toast.error("Something went wrong while joining the game.", {id: "unsuccessful-join-game"});
      }
    };

    if (s.connected) join();

    const onConnect = () => {
      // console.log("socket connected:", s.id);
      join();
    };

    const onError = (err) => console.error("socket error", err);

    const onTurnStateUpdate = (data) => {
      if (!data) return;
      if (data.board_id && data.board_id !== boardId) return; // optional guard

      setTurnState(data);
    };

    // player joined
    const onPlayerJoined = ({ socketId, player_id, playerName, teamName, turnState }) => {
      // Check using ref (current state), outside of updater
      const exists = onlinePlayersRef.current.some(
        (p) => p.socketId === socketId
      );
      if (exists) return;

      // ✅ Now it's safe to show toast here
      toast.custom(
        () => (
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-lg border border-gray-200 rounded-2xl px-4 py-3 shadow-xl max-w-md">
            <div className="shrink-0 w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">New Team Joined</p>
              <p className="text-xs text-gray-600">
                <span className="px-1 py-0.5 rounded-lg bg-black/20">
                  {teamName || playerName || player_id}
                </span>{" "}
                have joined the board
              </p>
            </div>
          </div>
        ),
        { id: "playerJoined", duration: 3000 }
      );

      // ✅ Updater function is now pure
      setOnlinePlayers((prev) => [...prev, { socketId, player_id }]);
    };

    // player left
    const onPlayerLeft = ({player_id}) => {
      toast.custom(() => (
        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-lg border border-gray-200 rounded-2xl px-4 py-3 shadow-xl max-w-md">
          <div className="shrink-0 w-10 h-10 bg-linear-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Team Left</p>
            <p className="text-xs text-gray-600"><span className="px-1 py-0.5 rounded-lg bg-black/20">{playerStatsRef.current.find((player) => player_id === player.player_id).teamName}</span> have left the board</p>
          </div>
        </div>
      ), { id: "playerLeft", duration: 3000 });
      setOnlinePlayers((prev) =>
        prev.filter((p) => p.player_id !== player_id)
      );
    };

    const onPlayerStartedRolling = (data) => {
      setRollingPlayerId(prev => [...prev, data.player_id]);
    };

    const onDiceRolled = (data) => {
      // console.log("Dice rolled data:", data);
      const updatedDice = data.allPlayersDice;
      const rolledPlayerId = data.player_id;
      const isLocked = data?.isAllPawnsLocked && data?.dice_value !== 6;
      setRollingPlayerId(prev => prev.filter(id => id !== rolledPlayerId));
      setAllDiceValues((prev) =>
        prev.map((player) => {
          const updated = updatedDice.find((p) => p.player_id === player.player_id);
          const merged = updated ? { ...player, ...updated } : player;

          // if this is the rolled player and all pawns are locked
          if (player.player_id === rolledPlayerId && isLocked) {
            // Delay clearing dice value to allow roll animation to finish
            setTimeout(() => {
              setAllDiceValues((curr) =>
                curr.map((p) =>
                  p.player_id === rolledPlayerId
                    ? { ...p, diceValue: null, isDiceRolling: false }
                    : p
                )
              );
            }, 1000); // ⏱️ delay (in ms) — adjust to match animation timing
            return { ...merged, isDiceRolling: false }; // immediate stop of animation
          }

          // stop rolling for the rolled player normally
          if (player.player_id === rolledPlayerId) {
            return { ...merged, isDiceRolling: false };
          }

          return merged;
        })
      );
      if (data?.dice_value !== 6){
        setPlayerStats((prev) =>
          prev.map((player) =>
            player.player_id === rolledPlayerId
              ? { ...player, current_dice_roll_balance: player.current_dice_roll_balance - 1 }
              : player
          )
        );
      }
    };

    const onDiceCleared = (data) => {
      const updatedDice = data.allPlayersDice;
      const rolledPlayerId = data.player_id;
      // console.log("diceCleared", data)

      setAllDiceValues((prev) =>
        prev.map((player) => {
          // Find if there's an update for this player
          const updated = updatedDice.find((p) => p.player_id === player.player_id);
          
          // If this is the player who cleared dice, set diceValue to null
          if (player.player_id === rolledPlayerId) {
            return {
              ...player,
              ...(updated),
              diceValue: null
            };
          }
          
          // For other players, merge with updates if available
          return updated ? { ...player, ...updated } : player;
        })
      );
      if(rolledPlayerId === userRef.current?.id){
        setDiceValue(null);
        skipRollEmitRef.current = false;
        lastRolledRef.current = null;
      }
    };

    const onPawnMoved = (data) => {
      // console.log("broadcast for pawnMoved", data)
      const payload = data?.data;
      if (!payload) return;

      const {
        updatedPawns = [],
        updatedPlayers = [],
        updatedDice = [],
        movedPawn,
      } = payload;

      // Small helpers to merge arrays by id
      const mergePawns = (prev) => {
        if (!updatedPawns.length) return prev;
        const map = new Map(prev.map((p) => [p.id, p]));

        for (const u of updatedPawns) {
          const prevPawn = map.get(u.id) || {};
          map.set(u.id, { ...prevPawn, ...u });
        }

        return Array.from(map.values());
      };

      const mergePlayers = (prev) => {
        if (!updatedPlayers.length) return prev;
        const map = new Map(prev.map((p) => [p.player_id, p]));

        for (const u of updatedPlayers) {
          const prevPlayer = map.get(u.player_id) || {};
          map.set(u.player_id, { ...prevPlayer, ...u });
        }

        return Array.from(map.values());
      };

      const mergeDice = (prev) => {
        if (!updatedDice.length) return prev;
        const map = new Map(prev.map((d) => [d.player_id, d]));

        for (const u of updatedDice) {
          const prevDie = map.get(u.player_id) || {};
          map.set(u.player_id, { ...prevDie, ...u });
        }

        return Array.from(map.values());
      };

      // If there is a moved pawn, we want to ANIMATE FIRST
      if (movedPawn) {
        const { pawn_id, prev_position, steps, player_id } = movedPawn;
        
        // ⚠️ CRITICAL: Use current pawns state, not updated
        const idx = pawnsRef.current.findIndex((p) => p.id === pawn_id);

        if (idx === -1) {
          console.warn(`⚠️ Pawn ${pawn_id} not found in current state`);
          setPawns(mergePawns);
          setPlayerStats(mergePlayers);
          setAllDiceValues(mergeDice);

          if (player_id === userRef.current?.id) {
            setDiceValue(null);
            skipRollEmitRef.current = false;
            lastRolledRef.current = null;
            unlockMove("fallback idx === -1", pawn_id);
          }
          return;
        }

        // Generate path from PREVIOUS position (not current)
        const path = getAnimationPathRef.current(prev_position, steps, player_id);

        // Check if we have a valid path
        if (!path || path.length <= 1) {
          console.warn(`⚠️ Invalid path for pawn ${pawn_id}:`, path);
          // No animation needed, just update state
          setPawns(mergePawns);
          setPlayerStats(mergePlayers);
          setAllDiceValues(mergeDice);

          if (player_id === userRef.current?.id) {
            setDiceValue(null);
            skipRollEmitRef.current = false;
            lastRolledRef.current = null;
            unlockMove("no valid path", pawn_id);
          }
          return;
        }

        setAnimatingPawn(pawn_id);

        // Start animation from the FIRST step in path
        animatePawnMovementRef.current(idx, path, pawn_id, () => {
          // After animation completes, apply server state
          setPawns(mergePawns);
          setPlayerStats(mergePlayers);
          setAllDiceValues(mergeDice);

          if (player_id === userRef.current?.id) {
            setDiceValue(null);
            skipRollEmitRef.current = false;
            lastRolledRef.current = null;
            unlockMove("animation done", pawn_id);
          }
          setAnimatingPawn(null);
        });
      } else {
        // No animation, direct state update
        setPawns(mergePawns);
        setPlayerStats(mergePlayers);
        setAllDiceValues(mergeDice);
      }
    };

    const onPlayerStatsUpdated = (data) => {
      setPlayerStats((prev) => {
        if (!prev || prev.length === 0) return data;
        const map = new Map(prev.map((p) => [p.player_id, p]));
        for (const u of data) {
          const old = map.get(u.player_id) || {};
          map.set(u.player_id, { ...old, ...u });
        }
        return Array.from(map.values());
      });
    };

    s.on("connect", onConnect);
    s.on("connect_error", onError);
    s.on("reconnect_error", onError);
    s.on("error", onError);

    // listeners
    s.on("playerJoined", onPlayerJoined);
    s.on("playerLeft", onPlayerLeft);
    s.on("playerStartedRolling", onPlayerStartedRolling);
    s.on("diceRolled", onDiceRolled);
    s.on("diceCleared", onDiceCleared);
    s.on("pawnMoved", onPawnMoved);
    s.on("turnStateUpdate", onTurnStateUpdate);
    s.on("playerStatsUpdated", onPlayerStatsUpdated);

    return () => {
      s.off("connect", onConnect);
      s.off("connect_error", onError);
      s.off("reconnect_error", onError);
      s.off("error", onError);

      s.off("playerJoined", onPlayerJoined);
      s.off("playerLeft", onPlayerLeft);
      s.off("playerStartedRolling", onPlayerStartedRolling);
      s.off("diceRolled", onDiceRolled);
      s.off("diceCleared", onDiceCleared);
      s.off("pawnMoved", onPawnMoved);
      s.off("turnStateUpdate", onTurnStateUpdate);
    };
  }, [user, boardId]);

  useEffect(() => {
    // If no turnState yet or not in turn mode => no timer
    if (!turnState || turnState.mode !== "turn") {
      setTurnSecondsLeft(null);
      return;
    }

    const currentTurnPlayerId = turnState.currentTurnPlayerId;
    if (!currentTurnPlayerId) {
      setTurnSecondsLeft(null);
      return;
    }

    // We want to show a timer for whoever's turn it is
    // (If you only want for "me", you can check if currentTurnPlayerId === userRef.current?.id)
    const TOTAL = Number(import.meta.env.VITE_TURN_TIMER_SECONDS) || 30; // seconds
    setTurnSecondsLeft(TOTAL);

    const start_time = Date.now();

    const intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start_time) / 1000);
      const remaining = TOTAL - elapsed;

      if (remaining <= 0) {
        setTurnSecondsLeft(0);
        clearInterval(intervalId);
      } else {
        setTurnSecondsLeft(remaining);
      }
    }, 1000);

    // Cleanup if turn changes or component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, [turnState?.mode, turnState?.currentTurnPlayerId, turnState?.timerNonce]);


  const pawnsGroupedByPlayer = useMemo(() => {
    // 1) Group pawns by player_id first
    const temp = {};

    for (const p of pawns || []) {
      const player_id = p.player_id;
      if (!player_id) continue;

      const pawnObj = {
        id: p.id,
        boardId: p.boardId,
        player_id: p.player_id,
        color: p.color,
        type: p.type,
        current_position: p.current_position,
        prev_position: p.prev_position,
        is_safe: p.is_safe,
        moves: p.moves,
        kills: p.kills,
        has_heart: p.has_heart
      };

      if (!temp[player_id]) {
        temp[player_id] = {
          color: (p.color || null),
          pawns: [pawnObj]
        };
      } else {
        temp[player_id].pawns.push(pawnObj);
        if (!temp[player_id].color && p.color) {
          temp[player_id].color = p.color;
        }
      }
    }

    // 2) Create ordered object following color sequence
    const colorOrder = ["blue", "red", "green", "yellow"];
    const ordered = {};

    // Sort playerIds by their color
    const sortedPlayerIds = Object.keys(temp).sort((a, b) => {
      const colorA = (temp[a].color || "").toLowerCase();
      const colorB = (temp[b].color || "").toLowerCase();
      
      const indexA = colorOrder.indexOf(colorA);
      const indexB = colorOrder.indexOf(colorB);
      
      // If color not found, put at end
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      
      return posA - posB;
    });

    // Build ordered object
    for (const player_id of sortedPlayerIds) {
      ordered[player_id] = temp[player_id];
    }

    return ordered;
  }, [pawns]);

  // Triggered manually when the player clicks the dice component
  const handleRollDice = () => {
    if (diceValue !== null || skipRollEmitRef.current || isAnimatingRef.current) return;

    const payload = {
      board_id: boardId,
    };

    socketRef.current?.emit("rollDice", payload, (ack) => {
      if (!ack?.ok) {
        console.log("Roll rejected:", ack?.msg);
      } else {
        // Backend generated the dice roll! We pass it to our Dice component to animate towards
        setDiceValue(ack.dice_value);
      }
    });
  };

  // ===== main move handler =====
  const movePawn = useCallback((pawn_id) => {
    const player_id = userRef.current?.id;
    
    if (diceValue === null) return;
    if (!boardId || !player_id || !pawn_id) return;
    if (moveInFlightRef.current.locked) return;
    if (animatingPawnRef.current === pawn_id) return;

    lockMove(pawn_id);

    const timeoutId = setTimeout(() => {
      console.warn("⚠️ Move timeout - force unlocking");

      // 🧹 Treat as failed move: clear this dice on client
      setDiceValue(null);
      skipRollEmitRef.current = false;
      lastRolledRef.current = null;

      unlockMove("timeout");
    }, 5000);

    moveInFlightRef.current.timeoutId = timeoutId;


    emitMoveToServer(boardId, pawn_id, player_id, diceValue);

  }, [boardId, diceValue]);

  const emitMoveToServer = (boardId, pawn_id, player_id, diceValue) => {
    const payload = {
      board_id: boardId,
      pawn_id
    };

    // console.log("Emitting movePawn:", payload);
    socketRef.current?.emit("movePawn", payload, (ack) => {
      // console.log("movePawn ack:", ack);
      if (!ack?.ok) {
        console.log("Move rejected:", ack?.msg);
        // Revert to previous state
        setPawns(prev => prev);
        unlockMove("ack error", pawn_id);
      }
    });
  };
  const playerRollBalance = playerStats.find(p => p.player_id === user?.id)?.current_dice_roll_balance || 0;
  const playerHomeCount = playerStats.find(p => p.player_id === user?.id)?.home || 0;

  const mode = turnState?.mode ?? "free";
  const isMyTurn = turnState?.currentTurnPlayerId === userRef.current?.id;

  const canRoll =
    diceValue === null &&
    playerRollBalance > 0 &&
    playerHomeCount < 4;

  const canActuallyRoll =
    canRoll && mode === "turn" && isMyTurn;

  const transformedPawnsGroupedPlayers = transformGroupedPlayers(pawnsGroupedByPlayer, myColor);
  const cornerMap = {
    blue:   { TL: "red",    TR: "green",  BL: "blue",   BR: "yellow" },
    red:    { TL: "green",  TR: "yellow", BL: "red",    BR: "blue"   },
    yellow: { TL: "blue",   TR: "red",    BL: "yellow", BR: "green"  },
    green:  { TL: "yellow", TR: "blue",   BL: "green",  BR: "red"    },
  };
  const myCorners = cornerMap["blue"];
  const order = [myCorners.TL, myCorners.TR, myCorners.BL, myCorners.BR];

  const sortedPlayersStats = useMemo(() => {
    return order.map(c => {
      const p = playerStats.find(x => {
        // x.color is the original server color assigned to the user
        const pColor = transformedPawnsGroupedPlayers[x.player_id]?.displayColor || x.color;
        return pColor === c;
      });
      return p || { empty: true, color: c, player_id: `empty-${c}` };
    });
  }, [playerStats, transformedPawnsGroupedPlayers, order]);

  const activePlayers = useMemo(() => {
    return sortedPlayersStats.map(player => ({
      id: player.activePlayer ? player.activePlayerId : player.player_id,
      name: player.activePlayer ? player.activePlayerName : player.playerName,
      color: player.color
    }));
  }, [sortedPlayersStats]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-[100vw]">
      {/* Invite overlay when waiting for players */}
      <InviteOverlay boardId={boardId} onlinePlayers={onlinePlayers} />

      {/* Fixed UI Overlays */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={() => setShowStatsModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center justify-center gap-2 font-bold hover:bg-blue-500 transition-all border-2 border-blue-400"
        >
          Stats
        </button>
      </div>

      {showStatsModal && (
        <StatsModal 
          sortedPlayersStats={sortedPlayersStats}
          onlinePlayers={onlinePlayers}
          user={user}
          onClose={() => setShowStatsModal(false)}
        />
      )}

      <div className="w-full">
        <BoardGrid
          myColor={myColor}
          pawnsGroupedByPlayer={transformedPawnsGroupedPlayers}
          diceValue={diceValue}
          onPawnClick={movePawn}
          turnState={turnState}
          turnSecondsLeft={turnSecondsLeft}
          activePlayers={activePlayers}
          socket={socketRef.current}
          sortedPlayersStats={sortedPlayersStats}
          onlinePlayers={onlinePlayers}
          allDiceValues={allDiceValues}
          rollingPlayerId={rollingPlayerId}
        />
      </div>

      {/* Floating User Dice at Bottom Center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center justify-center w-[80px] h-[80px] rounded-2xl bg-white/10 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-white/30 p-2 pointer-events-auto shadow-2xl">
          <Dice
            disabled={!canActuallyRoll}
            diceValue={diceValue}
            onRollClick={handleRollDice}
            size={70}
          />
        </div>
      </div>

    </div>
  );
};

export default GameBoard;
