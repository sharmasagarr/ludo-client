const POS = {
  blue:   { top: 80, left: 50 }, // bottom-right
  red:    { top: 50, left: 25 }, // bottom-left
  green:  { top: 20, left: 50 }, // top-left
  yellow: { top: 45, left: 75 }, // top-right
};

// Calculate horizontal offset for pawns with 50% overlap
const getRowOffset = (idx, total) => {
  if (total === 1) return 0;

  // Pawn width in percentage of container (tweak if you change CSS w/h)
  const pawnWidth = 20;
  const overlapAmount = pawnWidth * 0.5; // 50% overlap
  const totalWidth = pawnWidth + (total - 1) * overlapAmount;
  const startOffset = -totalWidth / 2 + pawnWidth / 2;

  return startOffset + idx * overlapAmount;
};

const isFinished = (pawn) => {
  if (pawn.type === "base" || pawn.type === "main" || pawn.type === "home") return false;
  const pos = pawn.current_position;
  return pos === "finished" || pawn.type === "center" || (typeof pos === "string" && /-id-(?:null|19)$/.test(pos));
};

// pawnsGroupedByPlayer: { player_id: { color: "blue", pawns: [ { id, color, current_position, ... }, ... ] } }
const HomeArea = ({ pawnsGroupedByPlayer = {} }) => {
  let boardId;
  // build per-color arrays of finished pawn objects (preserve original input order)
  const finishedByColor = { blue: [], red: [], green: [], yellow: [] };

  Object.values(pawnsGroupedByPlayer).forEach((entry) => {
    const color = (entry.displayColor || "").toLowerCase();
    if (!["blue", "red", "green", "yellow"].includes(color)) return;

    (entry.pawns || []).forEach((pawn) => {
      boardId = pawn.boardId;
      if (isFinished(pawn)) {
        finishedByColor[color].push(pawn);
      }
    });
  });

  const renderPawns = (color) => {
    const finishedPawns = finishedByColor[color] || [];
    const total = finishedPawns.length;
    if (total === 0) return null;

    const basePos = POS[color];

    return finishedPawns.map((pawn, arrayIdx) => {
      const offset = getRowOffset(arrayIdx, total);

      return (
        <img
          key={`${color}-${pawn.id}`}
          src={`/gameAssets/pawn-${color}.png`}
          alt={`finished-${color}`}
          className="w-5 h-auto absolute transition-all duration-300"
          style={{
            top: `${basePos.top}%`,
            left: `calc(${basePos.left}% + ${offset}%)`,
            transform: "translate(-50%, -50%)",
            zIndex: 50 + arrayIdx,
            pointerEvents: "none",
          }}
        />
      );
    });
  };

  return (
    <div className="relative w-full h-full aspect-square overflow-hidden">
      {/* background triangles */}
      <div className="absolute inset-0 bg-linear-to-r from-[#efc531] to-[#fff350] clip-top-right z-10" />
      <div className="absolute inset-0 bg-linear-to-r from-[#39673d] to-[#6fb353] clip-top-left  z-20" />
      <div className="absolute inset-0 bg-linear-to-r from-[#a32430] to-[#d33b2e] clip-bottom-left z-30" />
      <div className="absolute inset-0 bg-linear-to-r from-[#65a8df] to-[#4675b8] clip-bottom-right z-40" />

      {/* pawns */}
      {renderPawns("green")}
      {renderPawns("yellow")}
      {renderPawns("red")}
      {renderPawns("blue")}
    </div>
  );
};

export default HomeArea;
