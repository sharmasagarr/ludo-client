import { useMemo } from "react";
import { TurnClock } from "./TurnClock";
import DiceForOther from "./Dice3DForOther";

const BaseArea = ({ 
  diceValue, pawnsGroupedByPlayer, position, color, onPawnClick, 
  activePlayers, turnState, turnSecondsLeft,
  playerStat, onlinePlayers, allDiceValues, rollingPlayerId 
}) => {
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

  const bgClasses = {
    bottomLeft: "bg-linear-to-r from-[#65a8df] to-[#4675b8]",
    topLeft: "bg-linear-to-r from-[#a32430] to-[#d33b2e]",
    topRight: "bg-linear-to-r from-[#39673d] to-[#6fb353]",
    bottomRight: "bg-linear-to-r from-[#efc531] to-[#fff350]",
  };

  const ringBorderColor = {
    bottomLeft: "border-blue-600",
    topLeft: "border-red-600",
    topRight: "border-green-400",
    bottomRight: "border-yellow-600",
  };

  // --- derive player info for this color from pawnsGroupedByPlayer ---
  const playerEntry = useMemo(() => {
    if (!pawnsGroupedByPlayer || typeof pawnsGroupedByPlayer !== "object") return null;
    // pawnsGroupedByPlayer: { player_id: { color, pawns: [...] } }
    // find first player whose color matches the area color
    for (const [pid, info] of Object.entries(pawnsGroupedByPlayer)) {
      if ((info.color || "").toLowerCase() === (color || "").toLowerCase()) {
        return { player_id: pid, info };
      }
    }
    return null;
  }, [pawnsGroupedByPlayer, color]);

  const pawnsForPlayer = playerEntry?.info?.pawns ?? [];
  const colorPawnIds = pawnsForPlayer.map(p => p.id);

  // My pawn ids (from pawnsGroupedByPlayer)
  const myPawnIds = (pawnsGroupedByPlayer && pawnsGroupedByPlayer[myId]?.pawns?.map(p => p.id)) || [];
  const activePlayer = activePlayers.find((player) => player.color === color);
  const isActive = myPawnIds.some(id => colorPawnIds.includes(id));

  // Build slots: there are 4 placeholders. A slot is "hasPawn" when there's a pawn at that index
  // and that pawn is of type 'base' or current_position === "0" (treat as base).
  const slots = Array.from({ length: 4 }, (_, idx) => {
    const pawn = pawnsForPlayer[idx];
    if (!pawn) return false;
    return pawn.type === "base" || !pawn.current_position || pawn.current_position === "0";
  });

  const showHints = diceValue === 6 && slots.some(Boolean) && isActive;

  const renderPlayerDetails = () => {
    if (position === "topLeft") {
      return (
        <div className="absolute top-1 left-1 text-white flex items-start justify-between w-full pr-2">
          <TurnClock
            secondsLeft={turnSecondsLeft}
            totalSeconds={30}
            isVisible={turnState?.mode === "turn" && turnState?.currentTurnPlayerId === playerEntry?.player_id}
          />
        </div>
      );
    }

    if (position === "topRight") {
      return (
        <div className="absolute top-1 right-1 text-white flex flex-row-reverse items-start justify-between w-full pl-2">
          <TurnClock
            secondsLeft={turnSecondsLeft}
            totalSeconds={30}
            isVisible={turnState?.mode === "turn" && turnState?.currentTurnPlayerId === playerEntry?.player_id}
          />
        </div>
      );
    }

    if (position === "bottomLeft") {
      return (
        <div className="absolute bottom-1 left-1 text-white flex items-end justify-between w-full pr-2">
          <TurnClock
            secondsLeft={turnSecondsLeft}
            totalSeconds={30}
            isVisible={turnState?.mode === "turn" && turnState?.currentTurnPlayerId === playerEntry?.player_id}
          />
        </div>
      );
    }

    if (position === "bottomRight") {
      return (
        <div className="absolute bottom-1 right-1 text-white flex flex-row-reverse items-end justify-between w-full pl-2">
          <TurnClock
            secondsLeft={turnSecondsLeft}
            totalSeconds={30}
            isVisible={turnState?.mode === "turn" && turnState?.currentTurnPlayerId === playerEntry?.player_id}
          />
        </div>
      );
    }

    return null;
  };

  const isMyTurn = playerEntry && turnState?.currentTurnPlayerId === playerEntry.player_id;

  const renderFloatingLabel = () => {
    if (playerStat?.empty) {
      return (
        <div className={`absolute left-0 w-full z-10 flex-1 opacity-20 bg-gray-500 h-[36px] ${
          position.startsWith('top') ? '-top-[36px] rounded-t-xl' : '-bottom-[36px] rounded-b-xl'
        }`} />
      );
    }
    
    if (!playerStat?.player_id) return null;

    const isOnline = Array.isArray(onlinePlayers) && onlinePlayers.some(online => online.player_id === playerStat.player_id);
    const dice = Array.isArray(allDiceValues) ? allDiceValues.find((d) => d.player_id === playerStat.player_id) : null;
    const playerStartedRolling = Array.isArray(rollingPlayerId) && rollingPlayerId.includes(playerStat.player_id);

    return (
      <div
        className={`absolute left-0 w-full z-10 flex-1 text-xs px-2 py-1.5 flex items-center justify-between gap-1 shadow-lg ${
          position.startsWith('top') ? '-top-[50px] rounded-t' : '-bottom-[50px] rounded-b'
        } ${isOnline ? 'border-2 border-green-500 bg-green-200 text-black' : 'bg-linear-to-r from-[#bbbbbc] to-[#ffffff] text-black'}`}
      >
        {isOnline && (
          <div className="absolute -top-1 -right-1 z-10">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
        )}
        
        {/* Left side: Avatar/Dice */}
        <DiceForOther
          diceValue={dice?.dice_value}
          position={position}
          playerStartedRolling={playerStartedRolling}
        />

        {/* Right side: Name/Team */}
        <div className="font-bold flex-1 text-right truncate">
          {playerStat.teamName ? (
            <div className="flex flex-col leading-tight">
              <span>{playerStat.teamName.split(" ")[0]}</span>
              <span>{playerStat.teamName.split(" ")[1]}</span>
            </div>
          ) : (
            playerStat.playerName?.split(" ")[0] || "Unknown"
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`
        ${bgClasses[position]}
        px-4 py-4 relative
        ${isMyTurn ? "blink-turn" : ""}
      `}
    >
      {renderFloatingLabel()}
      {renderPlayerDetails()}
      <div
        className={`
          aspect-square h-full rounded-full
          grid grid-cols-2 grid-rows-2
          place-items-center gap-4 p-4 bg-white
        `}
      >
        {Array.from({ length: 4 }).map((_, idx) => {
          const hasPawn = !!slots[idx];
          const pawn_id = pawnsForPlayer[idx]?.id ?? null;

          return (
            <PawnPlaceholder
              key={idx}
              color={color}
              position={position}
              hasPawn={hasPawn}
              onPawnClick={() => onPawnClick(pawn_id)}
              hint={showHints && hasPawn}
              ringClass={ringBorderColor[position]}
            />
          );
        })}
      </div>
    </div>
  );
};

export default BaseArea;

const PawnPlaceholder = ({ hasPawn, position, onPawnClick, hint, ringClass }) => {
  const placeholderColors = {
    bottomLeft: "bg-linear-to-r from-[#65a8df] to-[#4675b8]",
    topLeft: "bg-linear-to-r from-[#a32430] to-[#d33b2e]",
    topRight: "bg-linear-to-r from-[#39673d] to-[#6fb353]",
    bottomRight: "bg-linear-to-r from-[#efc531] to-[#fff350]",
  };

  const pawnColors = {
    bottomLeft: "blue",
    topLeft: "red",
    topRight: "green",
    bottomRight: "yellow",
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={!hasPawn || !hint}
        onClick={onPawnClick}
        className={`relative w-7 h-7 flex items-center justify-center aspect-square rotate-45 border-2 border-white ${placeholderColors[position]} shadow-xl
          ${hasPawn ? "cursor-pointer" : "cursor-not-allowed"} overflow-visible`}
        aria-label="Unlock pawn"
      >
        {hint ? (
          <span
            className={`pointer-events-none absolute inset-1 rounded-full border-2 border-gray-50 border-dashed ${ringClass} spin-ring`}
          />) : hasPawn && (
          <span className="pointer-events-none absolute inset-1 rounded-full border border-gray-400" />
          )
        }
        {hasPawn ? (
          <img
            src={`/gameAssets/pawn-${pawnColors[position]}.png`}
            alt="pawn"
            className="
              absolute inset-0
              w-[90%] h-auto max-w-none
              object-contain
              -top-3 -left-[10px] -rotate-45
            "
          />
        ) : (
          <div className="w-3 h-3" />
        )}
      </button>
    </div>
  );
};
