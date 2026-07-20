import { useState, useEffect, useMemo } from "react";
import BoardGrid from "../components/otherGameBoard/BoardGrid";
import axios from "axios";
import toast from "react-hot-toast";
import { FaCrown } from 'react-icons/fa';
import { useSwipeable } from 'react-swipeable';
import { IoChevronBack, IoChevronForward, IoRefresh } from 'react-icons/io5';
import { MdLocationOff } from "react-icons/md";

const COLORS = ["blue", "red", "green", "yellow"];

const OtherGameBoard = () => {
  const [pawns, setPawns] = useState([]);
  const [user, setUser] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);
  const [boardId, setBoardId] = useState(null);
  const [allDiceValues, setAllDiceValues] = useState([]);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(false);
  const [boardStatus, setBoardStatus] = useState(null);
  const [start_time, setStartTime] = useState(null);
  const [end_time, setEndTime] = useState(null);

  // Load user from localStorage
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

  // Fetch game state function
  const fetchGameState = async (creator, direction = null, current_board_id = null) => {
    if (!creator) return;

    setLoading(true);
    try {
      const payload = { creator };
      
      if (direction) {
        payload.direction = direction;
      }
      
      if (current_board_id) {
        payload.current_board_id = current_board_id;
      }

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/boards/navigate`,
        payload
      );

      if (res.data?.success) {
        const data = res.data.data;
        
        setPawns(data?.pawns ?? []);
        setPlayerStats(data?.players ?? []);
        setBoardId(data?.board_id ?? null);
        setHasNext(data?.hasNext ?? false);
        setHasPrevious(data?.hasPrevious ?? false);
        setBoardStatus(data?.boardStatus ?? null);
        setStartTime(data?.start_time ?? null);
        setEndTime(data?.end_time ?? null);

        const modifiedDiceValues = data?.dice_value?.map(player => ({
          ...player,
          isDiceRolling: false,
        })) ?? [];
        setAllDiceValues(modifiedDiceValues);

        // toast.success(direction ? `Navigated to ${direction} board` : 'Board loaded successfully');
      }
    } catch (error) {
      console.error("Error fetching game state:", error);
      toast.error(error.response?.data?.message || "Failed to fetch board data");
    } finally {
      setLoading(false);
    }
  };

  // Initial load - fetch first board
  useEffect(() => {
    if (user?.adminId) {
      fetchGameState(user.adminId);
    }
  }, [user]);

  // Navigation handlers
  const handleNext = () => {
    if (hasNext && !loading && user?.adminId && boardId) {
      fetchGameState(user.adminId, 'next', boardId);
    }
  };

  const handlePrevious = () => {
    if (hasPrevious && !loading && user?.adminId && boardId) {
      fetchGameState(user.adminId, 'previous', boardId);
    }
  };

  const handleRefresh = () => {
    if (!loading && user?.adminId && boardId) {
      fetchGameState(user.adminId, 'current', boardId);
    }
  };

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrevious,
    preventScrollOnSwipe: true,
    trackTouch: true
  });

  // Group pawns by player
  const pawnsGroupedByPlayer = useMemo(() => {
    const temp = {};

    for (const p of pawns || []) {
      const player_id = p.player_id;
      if (!player_id) continue;

      const pawnObj = {
        id: p.id,
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

    // Create ordered object following color sequence
    const colorOrder = ["blue", "red", "green", "yellow"];
    const ordered = {};

    const sortedPlayerIds = Object.keys(temp).sort((a, b) => {
      const colorA = (temp[a].color || "").toLowerCase();
      const colorB = (temp[b].color || "").toLowerCase();
      
      const indexA = colorOrder.indexOf(colorA);
      const indexB = colorOrder.indexOf(colorB);
      
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      
      return posA - posB;
    });

    for (const player_id of sortedPlayerIds) {
      ordered[player_id] = temp[player_id];
    }

    return ordered;
  }, [pawns]);

  // Sort player stats
  const order = ["red", "green", "blue", "yellow"];
  const sortedPlayersStats = useMemo(() => {
    return [...playerStats].sort((a, b) => {
      const colorA = pawnsGroupedByPlayer[a.player_id]?.color || "";
      const colorB = pawnsGroupedByPlayer[b.player_id]?.color || "";
      return order.indexOf(colorA) - order.indexOf(colorB);
    });
  }, [playerStats, pawnsGroupedByPlayer]);

  const convertToIST = (dateString) => {
    if (!dateString) return "";

    return new Date(dateString).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  return (
    <div className="flex flex-col h-full gap-2 items-center justify-between mb-16 bg-green-50">
      {/* Navigation Controls */}
      <div className="w-full px-3 py-2 bg-white shadow-md sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={!hasPrevious || loading}
            className={`p-2 rounded-full transition-all ${
              hasPrevious && !loading
                ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Previous board"
          >
            <IoChevronBack size={20} />
          </button>

          {/* Board Info */}
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700 block">
                BoardID - <span className="px-1 bg-gray-300 rounded">{boardId}</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded ${
                boardStatus === 'active' ? 'bg-green-100 text-green-700' : 
                boardStatus === 'finished' ? 'bg-blue-100 text-blue-700' : 
                'bg-gray-100 text-gray-700'
              }`}>
                {boardStatus?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`p-1.5 rounded-full transition-all ${
                loading 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
              }`}
              aria-label="Refresh board"
            >
              <IoRefresh size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!hasNext || loading}
            className={`p-2 rounded-full transition-all ${
              hasNext && !loading
                ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Next board"
          >
            <IoChevronForward size={20} />
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-30 flex items-center justify-center z-2000">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-700 font-semibold">Loading board...</p>
          </div>
        </div>
      )}
      <div className="flex flex-col h-full gap-10 items-center justify-between mb-2" {...swipeHandlers}>
        {/* Player Stats Cards */}
        <div className="w-full p-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {sortedPlayersStats?.map((player) => {
              const hasWon = player.winPosition !== null && player.winPosition !== undefined;
              
              return (
                <div
                  key={player.player_id}
                  className={`relative rounded-lg p-2 shadow-md
                    ${hasWon 
                      ? 'border-4 border-yellow-400 bg-yellow-50' 
                      : 'bg-white border border-gray-200'
                    }
                  `}
                >
                  {/* Winner Crown and Position */}
                  {hasWon && (
                    <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1 bg-yellow-400 border-2 border-white rounded-full px-2 py-1 shadow-lg">
                      <FaCrown className="text-yellow-600" size={14} />
                      <span className="text-xs font-bold text-yellow-800">#{player.winPosition}</span>
                    </div>
                  )}

                  {/* ID and Name in same row */}
                  <div className="flex items-center gap-1 mb-2 pb-1 border-b border-gray-300">
                    <span className="font-bold text-xs truncate flex-1" title={player.playerName}>
                      {player.playerName}
                    </span>
                    <span className="font-bold text-xs truncate px-1 bg-black/10 w-fit rounded" title={player.player_id}>
                      {player.player_id.slice(0, 6)}
                    </span>
                    <span className="font-semibold flex items-center gap-1">
                      <img src="/icons/home.png" alt="home" width={15} height={13} />
                      {player.home}
                    </span>
                  </div>
                  
                  {/* Stats in single row */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold flex items-center gap-1">
                      <MdLocationOff color="red" width={13} height={13} />
                      {player.kills}
                    </span>
                    <span className="font-semibold flex items-center gap-1">
                      <img src="/icons/diamond.png" alt="diamonds" width={15} height={13} />
                      {player.diamonds}
                    </span>
                    <span className="font-semibold flex items-center gap-1">
                      <img src="/icons/moves.png" alt="moves" width={15} height={13} />
                      {player.moves}
                    </span>
                    <span className="font-semibold flex items-center gap-1">
                      <img src="/icons/dice-rolls.png" alt="roll" width={15} height={13} />
                      {player.current_dice_roll_balance}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Board Grid */}
        <div className="w-full">
          <BoardGrid
            pawnsGroupedByPlayer={pawnsGroupedByPlayer}
            allDiceValues={allDiceValues}
            players={sortedPlayersStats}
          />
        </div>

        {/* Board Time Info */}
        {(start_time || end_time) && (
          <div className="w-full p-4 bg-white shadow-md">
            <div className="max-w-7xl mx-auto text-sm text-gray-600 ">
              {start_time && <p>Start Date: {convertToIST(start_time)}</p>}
              {end_time && <p>End Date: {convertToIST(end_time)}</p>}
            </div>
          </div>
        )}
      </div>

      
    </div>
  );
};

export default OtherGameBoard;
