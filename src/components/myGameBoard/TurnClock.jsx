export const TurnClock = ({ secondsLeft, totalSeconds, isVisible }) => {
  if (!isVisible || secondsLeft == null) return null;

  const progress = secondsLeft / totalSeconds;
  const isLowTime = secondsLeft <= 5;

  return (
    <div className="relative">
      {/* Modern progress ring */}
      <div className="relative w-5 h-5">
        <div className="absolute inset-0 rounded-full bg-linear-to-br from-slate-50 to-slate-100 shadow-sm" />
        
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={isLowTime ? "text-red-400" : "text-blue-400"}
            opacity="0.2"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={`transition-all duration-300 ease-out ${isLowTime ? "text-red-500" : "text-blue-500"}`}
            strokeDasharray="251"
            strokeDashoffset={251 * (1 - progress)}
          />
        </svg>

        {/* Center number */}
        <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
          isLowTime ? 'text-red-600 animate-pulse' : 'text-slate-800'
        }`}>
          {secondsLeft}
        </div>
      </div>
    </div>
  );
};