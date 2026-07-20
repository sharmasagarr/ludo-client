import { useState } from "react";
import toast from "react-hot-toast";

const InviteOverlay = ({ boardId, onlinePlayers = [] }) => {
  const [copied, setCopied] = useState(false);
  const playerCount = onlinePlayers.length;

  if (playerCount >= 2 || !boardId) return null;

  const inviteLink = `${window.location.origin}/play?board_id=${boardId}`;

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20 max-w-md w-full text-center">
        <div className="text-5xl mb-4 animate-bounce">🎲</div>
        <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-3">
          Waiting for Players
        </h2>
        <p className="text-blue-100 mb-6 text-sm">
          Share the Board ID or link below to invite a player. The game starts when at least <strong>2 players</strong> are in the room.
        </p>

        {/* Board ID */}
        <div className="mb-4">
          <label className="text-blue-200 text-xs font-semibold block mb-1">Board ID</label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={boardId}
              className="flex-1 bg-indigo-950/50 border border-indigo-400/30 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none select-all"
              onClick={(e) => e.target.select()}
            />
            <button
              onClick={() => copyToClipboard(boardId)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all"
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Invite Link */}
        <div className="mb-6">
          <label className="text-blue-200 text-xs font-semibold block mb-1">Invite Link</label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 bg-indigo-950/50 border border-indigo-400/30 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none select-all truncate"
              onClick={(e) => e.target.select()}
            />
            <button
              onClick={() => copyToClipboard(inviteLink)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all"
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Current Status */}
        <div className="flex items-center justify-center gap-2 text-blue-200 text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span>{playerCount} player{playerCount !== 1 ? "s" : ""} online</span>
        </div>
      </div>
    </div>
  );
};

export default InviteOverlay;
