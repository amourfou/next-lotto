"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-2 text-center">
        복권 번호 도우미
      </h1>
      <p className="text-slate-400 text-center mb-10 max-w-md">
        로또 6/45 또는 연금복권 패턴 분석을 선택하세요
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link
          href="/lotto"
          className="group flex flex-col items-center justify-center p-8 sm:p-10 rounded-2xl bg-slate-700/50 border border-slate-600 hover:border-amber-500/50 hover:bg-slate-700/70 transition-all duration-200 shadow-xl"
        >
          <span className="text-5xl sm:text-6xl mb-4" aria-hidden>
            🎱
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2 group-hover:text-amber-300 transition-colors">
            로또 6/45
          </h2>
          <p className="text-slate-400 text-sm text-center">
            번호 뽑기, 필터, 그룹 설정, 분석
          </p>
        </Link>

        <Link
          href="/pension"
          className="group flex flex-col items-center justify-center p-8 sm:p-10 rounded-2xl bg-slate-700/50 border border-slate-600 hover:border-emerald-500/50 hover:bg-slate-700/70 transition-all duration-200 shadow-xl"
        >
          <span className="text-5xl sm:text-6xl mb-4" aria-hidden>
            🎯
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2 group-hover:text-emerald-300 transition-colors">
            연금복권
          </h2>
          <p className="text-slate-400 text-sm text-center">
            패턴 분석, 트렌드, 예측
          </p>
        </Link>
      </div>

      <Link
        href="/lotto"
        className="mt-8 text-slate-500 hover:text-slate-300 text-sm transition-colors"
      >
        ← 첫 페이지
      </Link>
    </main>
  );
}
