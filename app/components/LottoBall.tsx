"use client";

type LottoBallProps = {
  number: number;
  index: number;
};

/** 그룹별 색상: 1~9(9그룹), 10~18(18그룹), 19~27(27그룹), 28~36(36그룹), 37~45(45그룹) */
export function getBallColor(num: number): string {
  if (num <= 9) return "bg-amber-500 text-white";
  if (num <= 18) return "bg-emerald-500 text-white";
  if (num <= 27) return "bg-sky-500 text-white";
  if (num <= 36) return "bg-violet-500 text-white";
  return "bg-rose-500 text-white";
}

export default function LottoBall({ number, index }: LottoBallProps) {
  const color = getBallColor(number);
  return (
    <div
      className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold shadow-lg animate-ball-pop ${color}`}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
    >
      {number}
    </div>
  );
}
