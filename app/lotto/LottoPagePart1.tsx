"use client";

import Link from "next/link";
import React from "react";

export const LottoPagePart1 = [
  <div key="nav" className="w-full max-w-4xl mb-2 flex flex-wrap items-center gap-2">
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
    >
      🏠 첫 페이지
    </Link>
    <Link
      href="/pension"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
    >
      🎯 연금복권
    </Link>
  </div>,
  <div key="title" className="text-center mb-6">
    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent mb-2">
      Lotto
    </h1>
    <p className="text-slate-400 text-lg">
      1~45 pick 6
    </p>
  </div>,
];
