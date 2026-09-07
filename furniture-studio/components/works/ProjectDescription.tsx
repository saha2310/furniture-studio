'use client';

import { useState } from 'react';

const PREVIEW_LIMIT = 150;

function cleanDescription(value: string): string {
  if (!value) return '';
  const cut = value.search(/<\s*(?:main|html|body)\b/i);
  const source = cut > -1 ? value.slice(0, cut) : value;
  return source
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ProjectDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const cleaned = cleanDescription(text);
  const needsExpand = cleaned.length > PREVIEW_LIMIT;
  const preview = needsExpand ? `${cleaned.slice(0, PREVIEW_LIMIT).trimEnd()}…` : cleaned;
  if (!cleaned) return null;

  return (
    <div className="mt-8 min-w-0 max-w-[48rem] border-l border-ink/20 pl-4 sm:pl-5">
      <div
        className={expanded
          ? 'max-h-40 overflow-y-auto overscroll-contain pr-3 text-sm leading-6 text-ink/78 [scrollbar-color:rgb(var(--color-ink)/.28)_transparent] [scrollbar-width:thin] sm:max-h-44'
          : 'max-w-[44ch] text-sm leading-6 text-ink/78 break-words [overflow-wrap:anywhere]'}
      >
        {expanded ? cleaned : preview}
      </div>
      {needsExpand && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 min-h-10 py-2 text-left text-[10px] uppercase tracking-[0.12em] text-ink/90 transition-colors hover:text-ink"
          aria-expanded={expanded}
        >
          {expanded ? 'Свернуть ↑' : 'Читать далее →'}
        </button>
      )}
    </div>
  );
}
