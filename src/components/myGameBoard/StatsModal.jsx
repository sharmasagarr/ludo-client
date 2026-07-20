import { FaCrown } from "react-icons/fa";

const formatPlayerName = (name) => {
  if (!name) return "";
  return name.split(" ")[0];
};

const StatsModal = ({ sortedPlayersStats, onlinePlayers, user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-4 w-full max-w-3xl shadow-2xl border border-gray-600 relative">
        <button 
          onClick={onClose}
          className="absolute -top-3 -right-3 text-white bg-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold border-2 border-white shadow-xl hover:bg-red-700"
        >
          X
        </button>
        <h2 className="text-white text-lg font-bold mb-4 text-center">Scoreboard</h2>
        <div className="flex flex-col gap-3">
          {sortedPlayersStats?.filter(p => !p.empty).sort((a, b) => (
            (a.winPosition || 99) - (b.winPosition || 99)
          )).map((player, idx) => {
            const isOnline = onlinePlayers.some(online => online.player_id === player.player_id);
            const isYou = user?.id === player.player_id;
            const hasWon = player.winPosition !== null && player.winPosition !== undefined;
            
            return (
              <div
                key={player.player_id}
                className={`relative rounded-lg p-2 shadow-md bg-linear-to-r from-[#bbbbbc] to-[#ffffff] 
                  ${hasWon 
                    ? 'border-4 border-yellow-400 bg-yellow-50' 
                    : isYou 
                      ? 'border-2 border-blue-500' 
                      : isOnline 
                        ? 'border-2 border-green-500 bg-white' 
                        : 'border-3 border-gray-300'
                  }
                `}
              >
                {/* Winner Crown and Position */}
                {hasWon && (
                  <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 bg-yellow-400 border-2 border-white rounded-full px-2 py-1 shadow-lg">
                    <FaCrown className="text-yellow-600" size={14} />
                    <span className="text-xs font-bold text-yellow-800">#{player.winPosition}</span>
                  </div>
                )}

                {/* Online Status Indicator Dot */}
                {isOnline && !hasWon && !isYou &&(
                  <div className="absolute -top-1 -right-1 z-10">
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
                    </span>
                  </div>
                )}

                {isYou && !hasWon && (
                  <div className="absolute -top-1 -right-1 z-10">
                    <span className="relative flex">
                      <span className="rounded px-1 bg-blue-500 border-2 border-white text-[8px] text-white">You</span>
                    </span>
                  </div>
                )}

                <div className="absolute -top-2 right-1/2 translate-x-1/2 z-10">
                  <span className="bg-yellow-500 border-2 border-yellow-600 w-4 h-4 text-[10px] text-yellow-700 rounded-full flex items-center justify-center">
                    {player.rank}
                  </span>
                </div>

                <div className="flex items-center gap-1 w-full justify-between border-b border-gray-500">
                  <span className="text-[10px] font-semibold text-gray-800 truncate flex-1">
                    {player.teamName || formatPlayerName(player.playerName)}
                  </span>
                  <span className="font-bold text-xs flex items-center truncate w-fit rounded text-black">
                    <img src="/gameAssets/heart.png" alt="hearts" width={20} height={20} />
                    {player.hearts}
                  </span>
                  <span className="font-bold flex items-center gap-1 text-black">
                    <img src="/gameAssets/moves.png" alt="moves" width={20} height={20} />
                    <span className="text-xl">{player.moves}</span>
                  </span>
                </div>  
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StatsModal;
