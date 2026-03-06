"use client";

import { useState, useCallback } from "react";
import LottoBall from "./components/LottoBall";

const MIN = 1;
const MAX = 45;
const PICK_COUNT = 6;

function drawLottoNumbers(): number[] {
  const pool = Array.from({ length: MAX - MIN + 1 }, (_, i) => i + MIN);
  const result: number[] = [];
  for (let i = 0; i < PICK_COUNT; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result.sort((a, b) => a - b);
}

export default function Home() {
  const [numbers, setNumbers] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleDraw = useCallback(() => {
    setIsDrawing(true);
    setNumbers([]);
    setTimeout(() => {
      setNumbers(drawLottoNumbers());
      setIsDrawing(false);
    }, 400);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent mb-2">
          로또 번호 뽑기
        </h1>
        <p className="text-slate-400 text-lg">
          1부터 45까지 번호 중 6개를 무작위로 뽑습니다
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 md:gap-4 min-h-[80px] items-center mb-10">
        {numbers.length === 0 && !isDrawing && (
          <p className="text-slate-500 text-lg">아래 버튼을 눌러 번호를 뽑아보세요</p>
        )}
        {isDrawing && (
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-full bg-slate-600 animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        )}
        {numbers.length > 0 &&
          !isDrawing &&
          numbers.map((num, i) => (
            <LottoBall key={i} number={num} index={i} />
          ))}
      </div>

      <button
        onClick={handleDraw}
        disabled={isDrawing}
        className="px-8 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
      >
        {isDrawing ? "뽑는 중..." : "번호 뽑기"}
      </button>

      {numbers.length > 0 && !isDrawing && (
        <p className="mt-6 text-slate-500 text-sm">
          뽑힌 번호: {numbers.join(", ")}
        </p>
      )}
    </main>
  );
}
