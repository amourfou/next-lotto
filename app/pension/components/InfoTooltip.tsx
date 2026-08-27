'use client';

import { useEffect, useId, useRef, useState } from 'react';

interface InfoTooltipProps {
  text: string;
  /** 툴팁 박스 너비 (기본 w-64). 내용이 길면 'w-72' 또는 'w-80' 지정 */
  width?: string;
  /** 툴팁 방향: 기본 위(top), 필요 시 bottom */
  direction?: 'top' | 'bottom';
}

export default function InfoTooltip({ text, width = 'w-64', direction = 'top' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const isTop = direction === 'top';

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex items-center ml-1 align-middle">
      <button
        type="button"
        aria-label="설명 보기"
        aria-expanded={open}
        aria-controls={tooltipId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={[
          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold leading-none transition-colors',
          open
            ? 'border-blue-500 bg-blue-500 text-white'
            : 'border-gray-400 bg-white text-gray-500 hover:border-blue-400 hover:text-blue-600',
        ].join(' ')}
      >
        ?
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={[
            'absolute left-1/2 -translate-x-1/2 z-50',
            isTop ? 'bottom-full mb-2.5' : 'top-full mt-2.5',
            width,
            'bg-gray-900 text-white text-[11px] leading-relaxed',
            'rounded-xl px-3 py-2.5 shadow-2xl',
            'whitespace-normal font-normal normal-case tracking-normal',
          ].join(' ')}
        >
          {text}
          <span
            className={[
              'absolute left-1/2 -translate-x-1/2 border-[6px] border-transparent',
              isTop
                ? 'top-full border-t-gray-900'
                : 'bottom-full border-b-gray-900',
            ].join(' ')}
          />
        </span>
      )}
    </span>
  );
}
