import { useMemo, useRef, useEffect, useState } from "react";
import { CiStar } from "react-icons/ci";
import { FaHeart } from "react-icons/fa";
import { canPawnMove } from "../../utils/shouldAutoClearDice";
import toast from "react-hot-toast";

const Cell = ({ id, pawnsGroupedByPlayer, position, diceValue, onPawnClick, socket }) => {
  const myId = useMemo(() => {
    try {
      const c =
        typeof globalThis.window !== "undefined"
          ? globalThis.localStorage.getItem("user")
          : null;
      const parsed = c ? JSON.parse(c) : {};
      return parsed.id;
    } catch {
      return null;
    }
  }, []);

  const cellNum = Number.parseInt(id.split("-").pop(), 10);

  const [selectedPawn, setSelectedPawn] = useState(null);
  const [modalPosition, setModalPosition] = useState({
    top: 0,
    left: 0,
    placement: "right",
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef(null);

  const posToCellId = (pos) => {
    if (pos == null) return null;
    if (typeof pos === "string" && pos.includes("-")) return pos;
    return null;
  };

  const isMoveable = (pawn_id) => {
    const myPawnIds =
      pawnsGroupedByPlayer?.[myId]?.pawns?.map((pawn) => pawn.id) || [];
    const pawn = pawnsGroupedByPlayer?.[myId]?.pawns?.find(
      (pawn) => pawn.id === pawn_id
    );
    return myPawnIds.includes(pawn_id) && diceValue && canPawnMove(pawn, diceValue);
  };

  const isMyPawn = (pawn_id) => {
    const myPawnIds =
      pawnsGroupedByPlayer?.[myId]?.pawns?.map((pawn) => pawn.id) || [];
    return myPawnIds.includes(pawn_id);
  };

  const getPawnDetails = (pawn_id) => {
    for (const player_id in pawnsGroupedByPlayer || {}) {
      const player = pawnsGroupedByPlayer[player_id];
      const pawn = player.pawns.find((p) => p.id === pawn_id);
      if (pawn) {
        return {
          ...pawn,
          playerName: player.playerName || player_id,
          displayColor: player.displayColor,
        };
      }
    }
    return null;
  };

  const colorClasses = {
    blue: "bg-blue-600",
    red: "bg-red-600",
    green: "bg-green-600",
    yellow: "bg-yellow-500",
  };

  // Build flatPawns
  const flatPawns = [];
  if (pawnsGroupedByPlayer) {
    Object.keys(pawnsGroupedByPlayer).forEach((player_id) => {
      const player = pawnsGroupedByPlayer[player_id];
      player.pawns.forEach((pawn, idx) => {
        const cellId = posToCellId(pawn.current_position);
        if (cellId === id) {
          flatPawns.push({
            id: pawn.id,
            displayColor: player.displayColor,
            originalColor: player.color,
            index: idx,
            cellId,
            has_heart: pawn.has_heart,
          });
        }
      });
    });
  }

  // Arrival Ping
  const [arrivalPing, setArrivalPing] = useState(null);
  const prevPawnIdsRef = useRef(new Set());

  useEffect(() => {
    const currentIds = new Set(flatPawns.map((p) => p.id));
    const prevIds = prevPawnIdsRef.current;
    prevPawnIdsRef.current = currentIds;

    const newPawn = flatPawns.find((p) => !prevIds.has(p.id));
    if (!newPawn) return;

    const key = Date.now();
    setArrivalPing({ color: newPawn.displayColor, key });

    const timeoutId = setTimeout(() => setArrivalPing(null), 1000);
    return () => clearTimeout(timeoutId);
  }, [flatPawns]);

  // Click outside modal
  useEffect(() => {
    if (!selectedPawn) return;

    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        closeModal();
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selectedPawn]);

  // Auto move logic
  const lastAutoClickRef = useRef(null);

  useEffect(() => {
    if (!diceValue || !myId || !pawnsGroupedByPlayer?.[myId]) return;

    const myPawns = pawnsGroupedByPlayer[myId].pawns || [];

    // find all pawns that can actually move with this dice
    const movablePawns = myPawns.filter((pawn) => canPawnMove(pawn, diceValue));

    // auto-move only if there is exactly one legal move
    if (movablePawns.length !== 1) return;

    const pawn = movablePawns[0];

    const key = `${pawn.id}-${diceValue}-${Date.now()}`; // always new per roll
    if (lastAutoClickRef.current === key) return;
    lastAutoClickRef.current = key;

    const t = setTimeout(() => {
      onPawnClick(pawn.id);
    }, 20);

    return () => clearTimeout(t);
  }, [diceValue, pawnsGroupedByPlayer, myId, onPawnClick]);

  // ------------------------------
  //  MODAL POSITION & TAIL CENTERED ON EDGE
  // ------------------------------
  const calculateModalPosition = (pawnRect) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const MODAL_WIDTH = 150;  // matches w-[200px]
    const MODAL_HEIGHT = 120; // close to real modal height
    const GAP = 10;
    const PADDING = 8;

    const pawnCenterX = pawnRect.left + pawnRect.width / 2;
    const pawnCenterY = pawnRect.top + pawnRect.height / 2;

    let placement;

    const canPlaceRight =
      pawnRect.right + GAP + MODAL_WIDTH <= viewportWidth - PADDING;
    const canPlaceLeft =
      pawnRect.left - GAP - MODAL_WIDTH >= PADDING;
    const canPlaceBottom =
      pawnRect.bottom + GAP + MODAL_HEIGHT <= viewportHeight - PADDING;
    const canPlaceTop =
      pawnRect.top - GAP - MODAL_HEIGHT >= PADDING;

    if (canPlaceRight) placement = "right";
    else if (canPlaceLeft) placement = "left";
    else if (canPlaceBottom || !canPlaceTop)
      placement = canPlaceBottom ? "bottom" : "top";
    else placement = "top";

    let top, left;

    // Align modal edge center with pawn center
    switch (placement) {
      case "right":
        top = pawnCenterY - MODAL_HEIGHT / 2;
        left = pawnRect.right + GAP;
        break;
      case "left":
        top = pawnCenterY - MODAL_HEIGHT / 2;
        left = pawnRect.left - MODAL_WIDTH - GAP;
        break;
      case "bottom":
        top = pawnRect.bottom + GAP;
        left = pawnCenterX - MODAL_WIDTH / 2;
        break;
      case "top":
      default:
        // align modal bottom approximately to pawn center
        top = pawnCenterY - MODAL_HEIGHT;
        left = pawnCenterX - MODAL_WIDTH / 2;
        break;
    }

    // Clamp so modal stays inside viewport as much as possible
    top = Math.max(PADDING, Math.min(top, viewportHeight - MODAL_HEIGHT - PADDING));
    left = Math.max(PADDING, Math.min(left, viewportWidth - MODAL_WIDTH - PADDING));

    return { placement, top, left };
  };

  const getTailClass = (placement) => {
    const base = "absolute w-0 h-0 border-gray-800";

    switch (placement) {
      case "right":
        return `${base} border-t-6 border-t-transparent border-b-6 border-b-transparent border-r-6`;
      case "left":
        return `${base} border-t-6 border-t-transparent border-b-6 border-b-transparent border-l-6`;
      case "bottom":
        return `${base} border-l-6 border-l-transparent border-r-6 border-r-transparent border-b-6`;
      case "top":
        return `${base} border-l-6 border-l-transparent border-r-6 border-r-transparent border-t-6`;
      default:
        return base;
    }
  };

  // Tail exactly at center of the edge
  const getTailStyle = (placement) => {
    switch (placement) {
      case "right":
        return { top: "50%", left: -6, transform: "translateY(-50%)" };
      case "left":
        return { top: "50%", right: -6, transform: "translateY(-50%)" };
      case "bottom":
        return { left: "50%", top: -6, transform: "translateX(-50%)" };
      case "top":
        return { left: "50%", bottom: -6, transform: "translateX(-50%)" };
      default:
        return {};
    }
  };

  // Pawn click
  const handlePawnClick = (e, pawn_id) => {
    e.stopPropagation();

    if (isMoveable(pawn_id)) {
      onPawnClick(pawn_id);
      return;
    }

    if (isMyPawn(pawn_id)) {
      const details = getPawnDetails(pawn_id);
      if (details) {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = calculateModalPosition(rect);
        setModalPosition(pos);
        setSelectedPawn(details);
        setIsAnimating(true);
      }
    }
  };

  const closeModal = () => {
    setIsAnimating(false);
    setTimeout(() => setSelectedPawn(null), 150);
  };

  const baseStyles =
    "w-full h-full border flex items-center justify-center text-xs font-semibold relative transition-all duration-200";

  let bgColor = "";
  if (position === "bottom" && (cellNum === 14 || (cellNum >= 8 && cellNum <= 12))) {
    bgColor = "bg-linear-to-r from-[#65a8df] to-[#4675b8]";
  } else if (position === "left" && (cellNum === 14 || (cellNum >= 8 && cellNum <= 12))) {
    bgColor = "bg-linear-to-r from-[#a32430] to-[#d33b2e]";
  } else if (position === "top" && (cellNum === 14 || (cellNum >= 8 && cellNum <= 12))) {
    bgColor = "bg-linear-to-r from-[#39673d] to-[#6fb353]";
  } else if (position === "right" && (cellNum === 14 || (cellNum >= 8 && cellNum <= 12))) {
    bgColor = "bg-linear-to-r from-[#efc531] to-[#fff350]";
  }

  const getOverlapOffset = (index, total) => {
    if (total === 1) return 0;
    const pawnWidth = 16;
    const overlapAmount = pawnWidth * 0.5;
    const totalWidth = pawnWidth + (total - 1) * overlapAmount;
    const start = -totalWidth / 2 + pawnWidth / 2;
    return start + index * overlapAmount;
  };

  // ========== HANDLE PROTECTION ==========
  const handleProtection = async (boardId, player_id, pawn_id) => {
    if (!socket) {
      toast.error("Socket connection not available");
      return;
    }

    if (!boardId) {
      toast.error("Board ID is missing");
      return;
    }

    try {
      // Emit socket event with acknowledgment callback
      socket.emit(
        "givePawnHeart",
        {
          boardId,
          pawn_id,
          player_id,
        },
        (response) => {

          if (response.ok) {
            toast.success("Heart given to pawn! 💖");
            closeModal(); // Close modal after successful protection
          } else {
            toast.error(response.msg || "Failed to give heart");
          }
        }
      );
    } catch (error) {
      toast.error("Failed to protect pawn");
      console.error("Protection error:", error);
    }
  };

  return (
    <>
      <div
        id={id}
        className={`${baseStyles} ${bgColor} ${
          cellNum === 7 || cellNum === 18 || cellNum === 3
            ? "border border-red-500"
            : "border-[0.5px] border-black/30"
        }`}
      >
        {(cellNum >= 8 && cellNum < 13) && (
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-white/30 -translate-x-1/2 -translate-y-1/2 rotate-45" />
        )}

        {cellNum === 14 && (
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-white -translate-x-1/2 -translate-y-1/2 rotate-45" />
        )}

        {cellNum === 4 && (
          <CiStar className="absolute inset-0 m-auto w-5 h-5 text-yellow-500" />
        )}

        {cellNum === 3 && (
          <span className="absolute top-1/2 left-1/2 text-red-500 bg-white -translate-x-1/2 -translate-y-1/2">
            -1
          </span>
        )}
        
        {cellNum === 7 && (
          <span className="absolute top-1/2 left-1/2 text-red-500 bg-white -translate-x-1/2 -translate-y-1/2">
            -6
          </span>
        )}

        {cellNum === 18 && (
          <span className="absolute top-1/2 left-1/2 text-red-500 bg-white -translate-x-1/2 -translate-y-1/2">
            -3
          </span>
        )}

        <div className="relative flex items-center justify-center w-full h-full">
          {/* PAWNS */}
          {flatPawns.map((pawn, i) => {
            const canMove = isMoveable(pawn.id);
            const isOwner = isMyPawn(pawn.id);
            const offset = getOverlapOffset(i, flatPawns.length);
            const scale =
              flatPawns.length === 1
                ? 1
                : flatPawns.length === 2
                ? 0.85
                : flatPawns.length === 3
                ? 0.75
                : 0.65;

            return (
              <div
                key={pawn.id + "-" + i}
                className="absolute w-4 h-4"
                style={{
                  left: `calc(50% + ${offset}px)`,
                  transform: "translateX(-50%)",
                  zIndex: canMove ? 999 : i + 60,
                }}
              >
                {canMove ? (
                  <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-gray-800 border-dashed spin-ring" />
                ) : (
                  <span className="pointer-events-none absolute inset-0.5 rounded-full border border-gray-400" />
                )}

                <button
                  className="w-full h-full relative block"
                  onClick={(e) => handlePawnClick(e, pawn.id)}
                  disabled={!canMove && !isOwner}
                >
                  <div className="relative w-full h-full rounded-full">
                    {pawn.has_heart ? (
                      <FaHeart
                        className="absolute -top-4 left-0.5 -translate-x-1/2 rotate-[-20deg] z-1000 drop-shadow-[0_0_2px_white]"
                        color="#ff1744"
                        size={10}
                      />
                    ): null}

                    <img
                      src={`/gameAssets/pawn-${pawn.displayColor}.png`}
                      alt={`pawn-${pawn.displayColor}`}
                      className={`absolute -translate-x-1/2 max-w-none h-auto overflow-auto ${
                        canMove
                          ? "top-3 left-[2.8mm] w-5.5 -translate-y-8"
                          : "top-4.5 left-[2.7mm] w-4.5 -translate-y-8"
                      }`}
                      style={{
                        zIndex: canMove ? 999 : "auto",
                        transform: `scale(${scale})`,
                      }}
                    />
                  </div>
                </button>
              </div>
            );
          })}

          {/* ARRIVAL PING */}
          {arrivalPing && (
            <div
              className="pointer-events-none absolute top-1/2 right-1/2"
              style={{ transform: "translate(50%, -50%)" }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  key={arrivalPing.key}
                  className={`animate-ping-once [animation-delay:400ms] absolute inline-flex h-full w-full rounded-full ${
                    colorClasses[arrivalPing.color]
                  }`}
                />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {selectedPawn && (
        <div
          ref={modalRef}
          className={`fixed z-9999 w-[150px] transition-all duration-200 ease-out ${
            isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
          style={{
            top: modalPosition.top,
            left: modalPosition.left,
          }}
        >
          {/* TAIL */}
          <div
            className={getTailClass(modalPosition.placement)}
            style={getTailStyle(modalPosition.placement)}
          />

          <div className="bg-white shadow-xl overflow-hidden border border-gray-800 rounded-lg">
            <div className="p-2 space-y-1.5">
              
              {/* Moves & Kills */}
              <div className="grid grid-cols-2 gap-1">
                <div className="bg-gray-50 p-1 rounded text-center">
                  <p className="text-[9px] text-gray-500 uppercase">Moves</p>
                  <p className="text-xs font-bold">{selectedPawn.moves || 0}</p>
                </div>
                <div className="bg-gray-50 p-1 rounded text-center">
                  <p className="text-[9px] text-gray-500 uppercase">Kills</p>
                  <p className="text-xs font-bold">{selectedPawn.kills || 0}</p>
                </div>
              </div>

              {/* Status + Protect / Protected */}
              <div className="flex gap-1 items-stretch">
                <div
                  className={`flex-1 px-1.5 py-1 rounded border text-center text-[10px] font-medium ${
                    selectedPawn.is_safe === 1
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {selectedPawn.is_safe === 1 ? "Safe" : "Not Safe"}
                </div>

                {selectedPawn.has_heart === 1 ? (
                  <div className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded border bg-green-50 border-green-200 text-[10px] font-medium text-green-700">
                    Protected
                    <FaHeart size={10} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleProtection(selectedPawn.boardId, selectedPawn.player_id, selectedPawn.id)}
                    className="flex-1 flex items-center gap-1 justify-center bg-blue-50 border border-blue-200 px-1.5 py-1 rounded text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Protect
                    <FaHeart size={10} />
                  </button>
                )}
              </div>

              {/* Can't move message */}
              {diceValue && !canPawnMove(selectedPawn, diceValue) && (
                <div className="bg-orange-50 border border-orange-200 px-2 py-1 rounded">
                  <p className="text-[10px] text-orange-800 text-center">
                    Can't move with {diceValue}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Cell;
