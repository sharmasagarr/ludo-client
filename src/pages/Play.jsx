import GameBoard from "./MyGameBoard";

const Play = () => {
  return (
    <div className="min-h-screen w-full bg-linear-to-br from-indigo-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Floating decorative elements behind the board */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-[50px] opacity-50 animate-blob pointer-events-none"></div>
      <div className="absolute top-1/2 right-10 w-48 h-48 bg-yellow-500 rounded-full mix-blend-multiply filter blur-[50px] opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute bottom-10 left-1/4 w-48 h-48 bg-pink-500 rounded-full mix-blend-multiply filter blur-[50px] opacity-50 animate-blob animation-delay-4000 pointer-events-none"></div>

      <div className="w-full max-w-6xl mx-auto flex items-center justify-center relative z-10">
        <GameBoard />
      </div>
    </div>
  );
};

export default Play;