import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [joinBoardId, setJoinBoardId] = useState('');
  const [mode, setMode] = useState('');
  const navigate = useNavigate(); 

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('user'));
    if (!localUser || !localUser.id) {
      navigate('/');
    } else {
      setUser(localUser);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logged out successfully");
    navigate('/');
  };

  const handleCreateGame = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/game/createGame`, {
        username: user.id
      });
      if (data.success) {
        localStorage.setItem("currentBoard", JSON.stringify({
          board_id: data.board_id,
          myColor: 'blue' // Creator is usually first player / blue
        }));
        toast.success("Game created successfully!");
        navigate(`/play?board_id=${data.board_id}`);
      } else {
        toast.error(data.message || "Failed to create game");
      }
    } catch (err) {
      toast.error('Error creating game: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!joinBoardId) {
      toast.error("Please enter a Board ID");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/game/joinGame`, {
        username: user.id,
        board_id: joinBoardId
      });
      if (data.success) {
        // Find assigned color by refetching or just pass defaults (assuming first to join gets blue/green etc)
        // Since play component socket fetches pawns, we only strictly need boardId.
        localStorage.setItem("currentBoard", JSON.stringify({
          board_id: data.board_id
        }));
        toast.success("Joined game successfully!");
        navigate(`/play?board_id=${data.board_id}`);
      } else {
        toast.error(data.message || "Failed to join game");
      }
    } catch (err) {
      toast.error('Error joining game: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-indigo-900 via-purple-900 to-indigo-900 px-4 py-8 relative">
      <button 
        onClick={handleLogout}
        className="absolute top-4 right-4 bg-white/10 hover:bg-red-500/80 text-white font-semibold py-2 px-4 rounded-xl border border-white/20 hover:border-red-500 transition-all backdrop-blur-md shadow-lg z-50 flex items-center gap-2"
      >
        Logout
      </button>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20 relative z-10">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
            LUDO MASTER
          </h1>
          <p className="text-blue-100 font-medium">Welcome back, {user?.name || user?.username || 'Player'}!</p>
        </div>

        {mode === '' && (
          <div className="space-y-4">
            <button 
              onClick={handleCreateGame}
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-green-400 to-blue-500 p-[1px] transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
            >
              <div className="relative bg-indigo-950/80 backdrop-blur-sm px-6 py-4 rounded-[15px] transition-all group-hover:bg-transparent">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">🎲</span>
                  <span className="text-white font-bold text-lg tracking-wide">START A NEW GAME</span>
                </div>
              </div>
            </button>

            <button 
              onClick={() => setMode('join')}
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-purple-400 to-pink-500 p-[1px] transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              <div className="relative bg-indigo-950/80 backdrop-blur-sm px-6 py-4 rounded-[15px] transition-all group-hover:bg-transparent">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">🤝</span>
                  <span className="text-white font-bold text-lg tracking-wide">JOIN A NEW GAME</span>
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="relative">
              <label className="text-blue-200 text-sm font-semibold mb-1 block ml-1">Enter Game ID</label>
              <input
                type="text"
                value={joinBoardId}
                onChange={(e) => setJoinBoardId(e.target.value)}
                placeholder="e.g. 123e4567-e89b-12d3..."
                className="w-full bg-indigo-950/50 border border-indigo-400/30 rounded-xl px-4 py-3 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setMode('')}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleJoinGame}
                disabled={loading}
                className="flex-[2] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/30 transition-all flex justify-center items-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Join Game</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Floating decorative elements */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-purple-500 rounded-full mix-blend-multiply filter blur-[32px] opacity-70 animate-blob"></div>
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-yellow-500 rounded-full mix-blend-multiply filter blur-[32px] opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-16 left-20 w-32 h-32 bg-pink-500 rounded-full mix-blend-multiply filter blur-[32px] opacity-70 animate-blob animation-delay-4000"></div>
      </div>
    </div>
  );
}
