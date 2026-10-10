const PATHS = {
  back: 'M15 5l-7 7 7 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 4.5v15l12-7.5z',
  home: 'M4 11l8-7 8 7M6 10v10h4v-6h4v6h4V10',
  settings: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 00-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 00-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 000 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 001.7 1l.3 2.5h4l.4-2.5a7.4 7.4 0 001.7-1l2.4 1 2-3.4z',
  book: 'M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5zM4 20.5A2.5 2.5 0 006.5 23H20v-5',
  cards: 'M8 3h11a1 1 0 011 1v13a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM4 7v13a1 1 0 001 1h11',
  trophy: 'M8 4h8v6a4 4 0 01-8 0zM8 6H4.5a3.5 3.5 0 003.6 4M16 6h3.5a3.5 3.5 0 01-3.6 4M12 14v4M8 21h8M9.5 18h5',
  chart: 'M5 20V10M12 20V4M19 20v-7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  skip: 'M5 5l8 7-8 7zM15 5v14',
  alert: 'M12 4l9 16H3zM12 10v4M12 17.2v.3',
  share: 'M12 15V3M7.5 7.5L12 3l4.5 4.5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 21a7.5 7.5 0 0115 0',
  users: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20a6.5 6.5 0 0113 0M16 4.3a3.5 3.5 0 010 6.4M18 14a6.5 6.5 0 013.5 6',
  ear: 'M7 9a5 5 0 0110 0c0 3-3 4-3 7a3 3 0 01-6 0M10 9a2 2 0 014 0',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 5v6h-6',
  download: 'M12 3v12M7.5 10.5L12 15l4.5-4.5M5 21h14',
  bolt: 'M13 2L4.5 13.5H11L10 22l8.5-11.5H12z',
  volume: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12',
  volumeOff: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  vibrate: 'M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM3 8v8M21 8v8M11 18h2',
  vibrateOff: 'M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM3 3l18 18',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0z',
  musicOff: 'M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0zM2 2l20 20',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  monitor: 'M3 5h18v11H3zM8 21h8M12 16v5',
  wifiOff: 'M3 3l18 18M8.5 16.5a5 5 0 017 0M5 13a10 10 0 014.4-2.6M19 13a10 10 0 00-3-2M2 9a15 15 0 015.5-3.3M22 9a15 15 0 00-9.5-3.9M12 20h.01',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'icon', label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
