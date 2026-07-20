import { useMemo } from "react";
import Cell from "./Cell";

const PATTERNS = {
  bottom: [
    [18, 12, 1],
    [17, 11, 2],
    [16, 10, 3],
    [15, 9, 4],
    [14, 8, 5],
    [13, 7, 6],
  ],
  left: [
    [13, 14, 15, 16, 17, 18],
    [7, 8, 9, 10, 11, 12],
    [6, 5, 4, 3, 2, 1],
  ],
  top: [
    [6, 7, 13],
    [5, 8, 14],
    [4, 9, 15],
    [3, 10, 16],
    [2, 11, 17],
    [1, 12, 18],
  ],
  right: [
    [1, 2, 3, 4, 5, 6],
    [12, 11, 10, 9, 8, 7],
    [18, 17, 16, 15, 14, 13],
  ],
};

const CellArea = ({ areaId, pawnsGroupedByPlayer, position, diceValue, onPawnClick, socket }) => {
  // Build cells once based on position + areaId
  const cells = useMemo(() => {
    const pattern = PATTERNS[position] || [];
    // Flatten and map to { id, number }
    return pattern.flat().map((n) => ({
      id: `cell-area-${areaId}-id-${n}`,
      number: n,
    }));
  }, [areaId, position]);

  const isVertical = position === "bottom" || position === "top";
  const gridClass = isVertical ? "grid-cols-3 aspect-3/6" : "grid-cols-6 aspect-6/3";

  return (
    <div id={`cell-area-${areaId}`} className={`grid ${gridClass} bg-gray-50 w-full`}>
      {cells.map(({ id }) => (
        <Cell
          key={id}
          diceValue={diceValue}
          id={id}
          onPawnClick={onPawnClick}
          position={position}
          pawnsGroupedByPlayer={pawnsGroupedByPlayer}
          socket={socket}
        />
      ))}
    </div>
  );
};

export default CellArea;
