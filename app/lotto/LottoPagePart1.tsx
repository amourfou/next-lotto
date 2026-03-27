"use client";

import Link from "next/link";
import React from "react";

export const LottoPagePart1 = [
  <div key="nav" className="w-full max-w-4xl mb-6 flex border-b border-slate-600/50">
    <Link
      href="/lotto"
      className="px-5 py-2.5 text-sm font-medium border border-b-0 border-slate-600/50 rounded-t-lg bg-slate-800/50 text-amber-400 -mb-px"
    >
      Lotto 6/45
    </Link>
    <Link
      href="/pension"
      className="px-5 py-2.5 text-sm font-medium border border-transparent text-slate-400 hover:text-slate-200 rounded-t-lg transition-colors"
    >
      연금복권
    </Link>
  </div>,
];
