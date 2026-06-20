import type { FC, ReactNode, SVGProps } from 'react';

/** The music-row note glyph — a real maintained icon (Ionicons io5), not a
 * hand-rolled path. Re-exported so the component imports it from one place. */
export { IoMusicalNotes as MusicNoteIcon } from 'react-icons/io5';

/**
 * TikTok's OWN action-rail + player glyphs, taken verbatim from TikTok's web UI
 * (their official marks) so the preview is pixel-faithful — not a hand-rolled
 * lookalike and not a generic icon-set approximation. Each renders with
 * `currentColor` and a numeric `size`.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const Icon = ({
  size = 24,
  viewBox,
  children,
  ...rest
}: IconProps & { viewBox: string; children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...rest}
  >
    {children}
  </svg>
);

export const HeartIcon: FC<IconProps> = (p) => (
  <Icon viewBox="0 0 24 24" {...p}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.5 2.25C10.5 2.25 12 4.25 12 4.25C12 4.25 13.5 2.25 16.5 2.25C20 2.25 22.5 4.99999 22.5 8.5C22.5 12.5 19.2311 16.0657 16.25 18.75C14.4095 20.4072 13 21.5 12 21.5C11 21.5 9.55051 20.3989 7.75 18.75C4.81949 16.0662 1.5 12.5 1.5 8.5C1.5 4.99999 4 2.25 7.5 2.25Z"
    />
  </Icon>
);

export const CommentIcon: FC<IconProps> = (p) => (
  <Icon viewBox="0 0 48 48" {...p}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 21.5c0-10.22 9.88-18 22-18s22 7.78 22 18c0 5.63-3.19 10.74-7.32 14.8a43.6 43.6 0 0 1-14.14 9.1A1.5 1.5 0 0 1 22.5 44v-5.04C11.13 38.4 2 31.34 2 21.5M14 25a3 3 0 1 0 0-6 3 3 0 0 0 0 6m10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6m13-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0"
    />
  </Icon>
);

export const BookmarkIcon: FC<IconProps> = (p) => (
  <Icon viewBox="0 0 24 24" {...p}>
    <path d="M4 4.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15.13a1 1 0 0 1-1.555.831l-6.167-4.12a.5.5 0 0 0-.556 0l-6.167 4.12A1 1 0 0 1 4 19.63z" />
  </Icon>
);

export const ShareIcon: FC<IconProps> = (p) => (
  <Icon viewBox="0 0 20 20" {...p}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.938 3.175a.674.674 0 0 1 1.138-.488l6.526 6.215c.574.547.554 1.47-.043 1.991l-6.505 5.676a.674.674 0 0 1-1.116-.508V13.49s-6.985-1.258-9.225 2.854c-.209.384-1.023.518-.857-1.395.692-3.52 2.106-9.017 10.082-9.017z"
    />
  </Icon>
);

export const PlusIcon: FC<IconProps> = (p) => (
  <Icon viewBox="0 0 48 48" {...p}>
    <path d="M26 7a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v15H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h15v15a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V26h15a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H26V7Z" />
  </Icon>
);


