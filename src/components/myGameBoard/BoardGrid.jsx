import BaseArea from "./BaseArea";
import CellArea from "./CellArea";
import HomeArea from "./HomeArea";

const BoardGrid = ({ 
  diceValue, myColor, pawnsGroupedByPlayer, onPawnClick, activePlayers, 
  turnState, turnSecondsLeft, socket,
  sortedPlayersStats, onlinePlayers, allDiceValues, rollingPlayerId
}) => {
  const cornerMap = {
    blue:   { TL: "red",    TR: "green",  BL: "blue",   BR: "yellow" },
    red:    { TL: "green",  TR: "yellow", BL: "red",    BR: "blue"   },
    yellow: { TL: "blue",   TR: "red",    BL: "yellow", BR: "green"  },
    green:  { TL: "yellow", TR: "blue",   BL: "green",  BR: "red"    },
  };

  const areaIdMap = {
    blue:   { top: 3, midL: 2, midR: 4, bottom: 1 },
    red:    { top: 4, midL: 3, midR: 1, bottom: 2 },
    yellow: { top: 2, midL: 1, midR: 3, bottom: 4 },
    green:  { top: 1, midL: 4, midR: 2, bottom: 3 },
  };

  const { TL, TR, BL, BR } = cornerMap[myColor];
  const { top, midL, midR, bottom } = areaIdMap[myColor];

  const baseProps = {
    diceValue, pawnsGroupedByPlayer, onPawnClick, activePlayers, turnState, turnSecondsLeft, onlinePlayers, allDiceValues, rollingPlayerId
  };

  return (
    <>

      <div
        className="
          grid 
          grid-cols-[1fr_0.5fr_1fr] 
          grid-rows-[1fr_0.5fr_1fr]
          w-full aspect-square
        "
      >
        {/* Top row */}
        <BaseArea {...baseProps} color={TL} position="topLeft" playerStat={sortedPlayersStats?.[0]} />

        {/* position="top" */}
        <CellArea
          {...{ diceValue, pawnsGroupedByPlayer, onPawnClick, socket }}
          areaId={top}
          position="top"
        />

        <BaseArea {...baseProps} color={TR} position="topRight" playerStat={sortedPlayersStats?.[1]} />

        {/* Middle row */}
        {/* position="left" */}
        <CellArea
          {...{ diceValue, pawnsGroupedByPlayer, onPawnClick, socket }}
          areaId={midL}
          position="left"
        />

        <HomeArea pawnsGroupedByPlayer={pawnsGroupedByPlayer} />

        {/* position="right" */}
        <CellArea
          {...{ diceValue, pawnsGroupedByPlayer, onPawnClick, socket }}
          areaId={midR}
          position="right"
        />

        {/* Bottom row */}
        <BaseArea {...baseProps} color={BL} position="bottomLeft" playerStat={sortedPlayersStats?.[2]} />

        {/* position="bottom" */}
        <CellArea
          {...{ diceValue, pawnsGroupedByPlayer, onPawnClick, socket }}
          areaId={bottom}
          position="bottom"
        />

        <BaseArea {...baseProps} color={BR} position="bottomRight" playerStat={sortedPlayersStats?.[3]} />
      </div>
    </>
  );
};

export default BoardGrid;
