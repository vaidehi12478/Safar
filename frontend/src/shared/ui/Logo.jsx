export function Logo({
  variant = 'compact',
  size = 'md',
  className = '',
  showTagline = false,
}) {
  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 48,
  }

  const px = iconSizes[size] || 36

  return (
    <div className={`safar-brand ${className} safar-brand-${size}`}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="safar-logo-svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="safarRouteGrad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="45%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <filter id="safarGlow" x1="-20%" y1="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563EB" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Ambient background container with soft rounded border */}
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="12"
          fill="#0F172A"
        />

        {/* Dynamic Road / Highway Path forming an "S" curve */}
        <path
          d="M 34 14 C 26 14 14 16 14 24 C 14 32 34 30 34 36 C 34 38 30 40 24 40"
          stroke="url(#safarRouteGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#safarGlow)"
        />

        {/* Dashed Center Lane Line */}
        <path
          d="M 32 14 C 25 14 16 16 16 24 C 16 32 32 30 32 36"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="2 3"
          strokeOpacity="0.8"
        />

        {/* Emerald Origin / Pickup Node */}
        <circle cx="34" cy="14" r="3.5" fill="#10B981" />
        <circle cx="34" cy="14" r="1.5" fill="#FFFFFF" />

        {/* Cobalt Destination Terminal Node */}
        <circle cx="24" cy="40" r="3.5" fill="#3B82F6" />
        <circle cx="24" cy="40" r="1.5" fill="#FFFFFF" />
      </svg>

      {variant !== 'icon' && (
        <div className="safar-brand-text-wrap">
          <div className="safar-brand-name">
            Safar<span className="safar-brand-dot">.</span>
          </div>
          {showTagline && (
            <span className="safar-brand-tagline">Smarter Urban Journeys</span>
          )}
        </div>
      )}
    </div>
  )
}

