'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * The caption fold shared by the Instagram, TikTok, and LinkedIn previews (X keeps
 * react-tweet's own). Collapsed, it shows the whole words that fit in `lines` (the
 * platform's native fold: IG/TikTok 2, LinkedIn 3) and ends the last of them with
 * an inline "… more", as the apps do. "more" expands to the full text with an
 * inline "less".
 *
 * The cut is chosen on the plain `text`; `render` turns the visible slice into
 * markup (username prefix, hashtags, links). It must render exactly the slice's
 * characters, because the fit is measured on a copy of its output.
 */
export function ExpandableText({
  text,
  render = (shown) => shown,
  lines = 2,
  toggleColor,
  lessLabel = 'less',
  style,
}: {
  text: string;
  render?: (shown: string) => ReactNode;
  lines?: number;
  /** Color of the "more"/"less" toggle. Defaults to inheriting the text color. */
  toggleColor?: string;
  lessLabel?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const markup = useRef<{ text: string; copy: DocumentFragment } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [fold, setFold] = useState<{ text: string; end: number } | null>(null);

  // Until `text` is measured (SSR, first render, an edit) it renders in full under
  // a CSS clamp: the same lines the fold will take, so measuring shifts nothing.
  const measuring = !expanded && fold?.text !== text;
  const end = !expanded && fold?.text === text ? fold.end : text.length;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) {
      return;
    }
    if (markup.current?.text !== text) {
      // A new text is always rendered in full first, so `el` holds all of it.
      markup.current = { text, copy: copyChildren(el) };
    }
    const { copy } = markup.current;
    const measure = () => {
      const next = findFold(text, fitsIn(el, copy, text.length, lines));
      setFold((prev) => (prev?.text === text && prev.end === next ? prev : { text, end: next }));
    };
    measure();
    // Observing `el`, not the window, also re-measures when a late web font
    // changes its height.
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, lines, expanded]);

  const toggle = (label: string) => (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={() => setExpanded(!expanded)}
      style={{ ...toggleStyle, color: toggleColor ?? 'inherit' }}
    >
      {label}
    </button>
  );

  return (
    <div style={style}>
      <div ref={ref} style={measuring ? clampStyle(lines) : TEXT}>
        {render(text.slice(0, end))}
        {end < text.length ? (
          <>
            {ELLIPSIS}
            {toggle(MORE)}
          </>
        ) : null}
        {expanded ? (
          <>
            {' '}
            {toggle(lessLabel)}
          </>
        ) : null}
      </div>
    </div>
  );
}

// Created on first fold, not at import: the SDK ships as one bundle, so a
// module-level throw (a browser without `Intl.Segmenter`) would break every hook.
let words: Intl.Segmenter | undefined;

/**
 * How many characters of `text` the fold shows: all of them when
 * `fits(text.length)`, else the longest prefix ending on a word that `fits`
 * (with "… more" after it). Ending on a word, never on a space or a ".", is what
 * keeps "order.… more" from happening. If even the first word overflows it is
 * shown anyway, and text with no words at all stays whole.
 */
export function findFold(text: string, fits: (end: number) => boolean): number {
  if (fits(text.length)) {
    return text.length;
  }
  words ??= new Intl.Segmenter(undefined, { granularity: 'word' });
  const ends = Array.from(words.segment(text))
    .filter((segment) => segment.isWordLike)
    .map((segment) => segment.index + segment.segment.length)
    .filter((wordEnd) => wordEnd < text.length);

  let best = ends[0] ?? text.length;
  let low = 0;
  let high = ends.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = ends[mid];
    if (candidate === undefined) {
      break;
    }
    if (fits(candidate)) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

/**
 * Lays a candidate out in a hidden probe at `el`'s width, inside `el` so it
 * inherits the font and wrapping, and checks it stays within `lines`. The probe
 * is gone before the predicate returns, so React never sees it.
 */
function fitsIn(el: HTMLElement, copy: DocumentFragment, length: number, lines: number) {
  return (end: number) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;width:${el.getBoundingClientRect().width}px`;
    el.append(probe);
    try {
      probe.replaceChildren('A');
      // Half a line of slack absorbs rounding without ever admitting another line.
      const maxHeight = (lines + 0.5) * probe.offsetHeight;
      probe.replaceChildren(
        ...(end < length ? [firstChars(copy, end), ELLIPSIS, moreReplica()] : [copy.cloneNode(true)]),
      );
      return probe.offsetHeight <= maxHeight;
    } finally {
      probe.remove();
    }
  };
}

function copyChildren(el: HTMLElement): DocumentFragment {
  const copy = document.createDocumentFragment();
  copy.append(...Array.from(el.childNodes, (node) => node.cloneNode(true)));
  return copy;
}

/** A copy of `markup` cut to its first `count` characters, elements intact. */
function firstChars(markup: DocumentFragment, count: number): Node {
  const copy = markup.cloneNode(true);
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  let left = count;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = node.nodeValue ?? '';
    node.nodeValue = value.slice(0, Math.max(left, 0));
    left -= value.length;
  }
  return copy;
}

/** Same width as the real "more" button: same text, same weight, inherited font. */
function moreReplica(): HTMLElement {
  const replica = document.createElement('span');
  replica.style.fontWeight = String(TOGGLE_WEIGHT);
  replica.textContent = MORE;
  return replica;
}

const ELLIPSIS = '… ';
const MORE = 'more';
const TOGGLE_WEIGHT = 600;

const TEXT: CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

function clampStyle(lines: number): CSSProperties {
  return {
    ...TEXT,
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
}

const toggleStyle: CSSProperties = {
  padding: 0,
  border: 0,
  background: 'transparent',
  font: 'inherit',
  fontWeight: TOGGLE_WEIGHT,
  cursor: 'pointer',
};
