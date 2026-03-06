"use client";

type LottoBallProps = {
  number: number;
  index: number;
};

function getBallColor(num: number): string {
  if (num <= 10) return "bg-slate-400";
  if (num <= 20) return "bg-blue-500";
  if (num <= 30) return "bg-red-500";
  if (num <= 40) return "bg-emerald-500";
  return "bg-amber-400 text-slate-900";
}

export default function LottoBall({ number, index }: LottoBallProps) {
  const color = getBallColor(number);
  return (
    <div
      className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold text-white shadow-lg animate-ball-pop ${color}`}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
    >
      {number}
    </div>
  );
}
