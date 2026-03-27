'use client';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  /** 툴팁 박스 너비 (기본 w-64). 내용이 길면 'w-72' 또는 'w-80' 지정 */
  width?: string;
  /** 툴팁 방향: 기본 위(top), 필요 시 bottom */
  direction?: 'top' | 'bottom';
}

export default function InfoTooltip({ text, width = 'w-64', direction = 'top' }: InfoTooltipProps) {
  const isTop = direction === 'top';
  return (
    <span className="relative group inline-flex items-center ml-1.5 cursor-help align-middle">
      <Info
        size={14}
        className="text-gray-400 group-hover:text-blue-500 transition-colors duration-150 shrink-0"
      />
      {/* 툴팁 박스 */}
      <span
        className={[
          'absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none',
          isTop ? 'bottom-full mb-2.5' : 'top-full mt-2.5',
          width,
          'bg-gray-900 text-white text-[11px] leading-relaxed',
          'rounded-xl px-3 py-2.5 shadow-2xl',
          'opacity-0 group-hover:opacity-100',
          'transition-opacity duration-200',
          'whitespace-normal font-normal',
        ].join(' ')}
      >
        {text}
        {/* 화살표 */}
        <span
          className={[
            'absolute left-1/2 -translate-x-1/2 border-[6px] border-transparent',
            isTop
              ? 'top-full border-t-gray-900'
              : 'bottom-full border-b-gray-900',
          ].join(' ')}
        />
      </span>
    </span>
  );
}
