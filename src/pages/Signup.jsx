import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

function Signup() {
  const [username, setusername] = useState("");
  const [name, setname] = useState("");
  const [password, setpassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !name || !password) {
      setMessage("Please fill all fields");
      return;
    }
    try {
      const { data, status } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/signup`,
        { username, name, password }
      );
      toast.success("Signup successful! Please login.");
      setMessage("Signup successful");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
      setMessage(error.response?.data?.message || "Error creating account");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-indigo-900 via-purple-900 to-indigo-900 px-4 py-8 relative overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-purple-500 rounded-full mix-blend-multiply filter blur-[32px] opacity-70 animate-blob"></div>
      <div className="absolute top-1/2 right-12 w-24 h-24 bg-yellow-500 rounded-full mix-blend-multiply filter blur-[32px] opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-16 left-20 w-40 h-40 bg-pink-500 rounded-full mix-blend-multiply filter blur-[32px] opacity-70 animate-blob animation-delay-4000"></div>

      <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20 w-full max-w-sm relative z-10">
        <h2 className="text-3xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-6 drop-shadow-sm">
          Sign Up
        </h2>
        {message && (
          <p
            className={`text-center mb-6 font-semibold ${
              message.includes("successful")
                ? "text-green-400 drop-shadow-md"
                : "text-red-400 drop-shadow-md"
            }`}
          >
            {message}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-blue-200 text-sm font-semibold mb-1.5 block ml-1">Name</label>
            <input
              type="text"
              placeholder="e.g. Sagar Sharma"
              className="w-full bg-indigo-950/50 border border-indigo-400/30 rounded-xl px-4 py-3 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
              onChange={(e)=>setname(e.target.value)}
            />
          </div>
          <div>
            <label className="text-blue-200 text-sm font-semibold mb-1.5 block ml-1">Username</label>
            <input
              type="text"
              placeholder="e.g. sagar_sharma"
              className="w-full bg-indigo-950/50 border border-indigo-400/30 rounded-xl px-4 py-3 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
              onChange={(e)=>setusername(e.target.value)}
            />
          </div>
          <div>
            <label className="text-blue-200 text-sm font-semibold mb-1.5 block ml-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                className="w-full bg-indigo-950/50 border border-indigo-400/30 rounded-xl px-4 py-3 pr-12 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                onChange={(e)=>setpassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 flex items-center text-indigo-300 hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full mt-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all flex justify-center items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Create Account
          </button>
        </form>
        <p className="mt-8 text-center text-blue-200/80 font-medium text-sm">
          Already have an account?{' '}
          <button onClick={() => navigate('/')} className="text-pink-400 font-bold hover:text-pink-300 hover:underline transition-colors">
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}
 
export default Signup;
