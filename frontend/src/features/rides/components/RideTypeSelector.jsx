import { formatCurrency } from '../../../entities/ride'

export function RideTypeSelector({ selectedType, onChange, soloFare, currency = 'USD' }) {
  const carpoolFare = soloFare ? soloFare * 0.7 : null

  return (
    <div className="ride-type-section" role="radiogroup" aria-labelledby="ride-type-heading">
      <div className="ride-type-header-row">
        <span id="ride-type-heading" className="ride-type-section-title">
          Select Ride Category
        </span>
        <span className="ride-type-subtitle">Instant booking with upfront transparent fares</span>
      </div>

      <div className="ride-type-grid">
        {/* Solo Ride Card */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedType === 'SOLO'}
          className={`ride-type-card ${selectedType === 'SOLO' ? 'selected' : ''}`}
          onClick={() => onChange('SOLO')}
        >
          <div className="ride-type-card-top">
            <div className="ride-tier-badge">
              <span className="tier-icon" aria-hidden="true">🚘</span>
              <span className="ride-type-name">Solo Direct</span>
            </div>
            <span className="ride-capacity-pill" title="Up to 4 passengers">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>4 seats</span>
            </span>
          </div>

          <div className="ride-type-price tabular-nums">
            {soloFare !== null ? formatCurrency(soloFare, currency) : '—'}
          </div>

          <span className="ride-type-desc">
            Direct, private trip with no intermediate stops or route deviations.
          </span>
        </button>

        {/* Carpool Group Card */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedType === 'CARPOOL'}
          className={`ride-type-card ${selectedType === 'CARPOOL' ? 'selected' : ''}`}
          onClick={() => onChange('CARPOOL')}
        >
          <div className="ride-type-card-top">
            <div className="ride-tier-badge">
              <span className="tier-icon" aria-hidden="true">🌱</span>
              <span className="ride-type-name">Carpool</span>
            </div>
            <span className="ride-type-badge-discount">SAVE 30%</span>
          </div>

          <div className="ride-type-price tabular-nums carpool-highlight">
            {carpoolFare !== null ? formatCurrency(carpoolFare, currency) : '—'}
          </div>

          <span className="ride-type-desc">
            Eco-friendly ride shared with up to 3 verified commuters on your route.
          </span>
        </button>
      </div>
    </div>
  )
}
