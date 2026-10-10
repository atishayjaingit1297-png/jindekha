/**
 * Jin-Dekha mark: two stacked word-cards with an open eye ("देखा" — seen) on the front card.
 * Original artwork; the same geometry is used for the app icons (scripts/generate-icons.mjs).
 * `animated` adds the home-screen motion: the cards settle in, the eye blinks and glances around.
 */
export function Logo({ className = 'logo', animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg className={`${className} ${animated ? 'logo-animated' : ''}`} viewBox="0 0 120 120" role="img" aria-label="जिनदेखा">
      <rect className="logo-back" x="24" y="14" width="66" height="86" rx="12" fill="#E07B17" transform="rotate(-10 57 57)" />
      <g className="logo-front">
        <rect x="30" y="20" width="66" height="86" rx="12" fill="#FFFAF0" stroke="#7A1F2B" strokeWidth="4" transform="rotate(6 63 63)" />
        <g transform="rotate(6 63 63)">
          <g className="logo-eye">
            <path d="M40 63c7-12 16-18 23-18s16 6 23 18c-7 12-16 18-23 18s-16-6-23-18z" fill="#7A1F2B" />
            <g className="logo-pupil">
              <circle cx="63" cy="63" r="10" fill="#FFFAF0" />
              <circle cx="63" cy="63" r="5.5" fill="#E07B17" />
            </g>
          </g>
          <path d="M44 92h38M50 99h26" stroke="#E07B17" strokeWidth="4" strokeLinecap="round" />
          <path d="M44 34h38" stroke="#7A1F2B" strokeWidth="4" strokeLinecap="round" opacity=".35" />
        </g>
      </g>
    </svg>
  );
}
