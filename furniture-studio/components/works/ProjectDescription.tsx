'use client';

import { useState } from 'react';

const PREVIEW_LIMIT = 150;

export function ProjectDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsExpand = text.length > PREVIEW_LIMIT;
  const preview = needsExpand ? `${text.slice(0, PREVIEW_LIMIT).trimEnd()}…` : text;

  return (
    <div className="mt-8 max-w-[48rem] border-l border-white/20 pl-5">
      <div
        className={expanded
          ? 'max-h-44 overflow-y-auto pr-4 text-sm leading-6 text-white/78 overscroll-contain [scrollbar-width:thin]'
          : 'text-sm leading-6 text-white/78'}
      >
        {expanded ? text : preview}
      </div>
      {needsExpand && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 text-[10px] uppercase tracking-[0.12em] text-white/90 transition-colors hover:text-white"
          aria-expanded={expanded}
        >
          {expanded ? 'Свернуть ↑' : 'Читать далее →'}
        </button>
      )}
    </div>
  );
}
