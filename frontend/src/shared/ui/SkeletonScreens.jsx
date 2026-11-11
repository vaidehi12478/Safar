export function AppSkeletonScreen() {
  return (
    <div className="safar-shell" aria-busy="true" aria-label="Loading Safar interface">
      {/* Skeleton Topbar */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="skeleton-box" style={{ width: '130px', height: '38px', borderRadius: '10px' }} />
          <div className="desktop-nav" style={{ display: 'flex', gap: '8px' }}>
            <div className="skeleton-box" style={{ width: '90px', height: '32px', borderRadius: '999px' }} />
            <div className="skeleton-box" style={{ width: '110px', height: '32px', borderRadius: '999px' }} />
            <div className="skeleton-box" style={{ width: '80px', height: '32px', borderRadius: '999px' }} />
          </div>
          <div className="userbox">
            <div className="skeleton-box" style={{ width: '120px', height: '36px', borderRadius: '999px' }} />
          </div>
        </div>
      </header>

      {/* Skeleton Main Area */}
      <main className="main-viewport">
        <div className="safar-dashboard">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <div className="skeleton-box" style={{ width: '220px', height: '32px', marginBottom: '8px' }} />
              <div className="skeleton-box" style={{ width: '150px', height: '16px' }} />
            </div>
            <div className="skeleton-box" style={{ width: '130px', height: '42px', borderRadius: '10px' }} />
          </div>

          <div className="metrics-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="metric-card" style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div className="skeleton-box" style={{ width: '45%', height: '14px', marginBottom: '10px' }} />
                <div className="skeleton-box" style={{ width: '70%', height: '26px' }} />
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '12px' }}>
            <div className="skeleton-box" style={{ width: '100%', height: '52px', borderRadius: '12px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '140px', borderRadius: '14px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '140px', borderRadius: '14px' }} />
          </div>
        </div>
      </main>
    </div>
  )
}

export function RideDetailSkeleton() {
  return (
    <div className="live-trip-container" aria-busy="true" aria-label="Loading ride tracking details">
      {/* Top Header Row */}
      <div className="trip-topbar-row">
        <div className="skeleton-box" style={{ width: '100px', height: '28px', borderRadius: '8px' }} />
        <div className="skeleton-box" style={{ width: '140px', height: '28px', borderRadius: '999px' }} />
      </div>

      <div className="live-trip-grid">
        {/* Left Column Skeleton */}
        <div className="trip-details-panel">
          {/* Stepper Card */}
          <div className="trip-sheet-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div className="skeleton-box" style={{ width: '90px', height: '14px', marginBottom: '6px' }} />
                <div className="skeleton-box" style={{ width: '180px', height: '24px' }} />
              </div>
              <div className="skeleton-box" style={{ width: '90px', height: '26px', borderRadius: '999px' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              {[1, 2, 3, 4].map((step) => (
                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div className="skeleton-box" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                  <div className="skeleton-box" style={{ width: '48px', height: '10px' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Driver Card Skeleton */}
          <div className="trip-sheet-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="skeleton-box" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-box" style={{ width: '100px', height: '12px', marginBottom: '6px' }} />
                <div className="skeleton-box" style={{ width: '140px', height: '18px' }} />
              </div>
              <div className="skeleton-box" style={{ width: '50px', height: '24px', borderRadius: '8px' }} />
            </div>
            <div className="skeleton-box" style={{ width: '100%', height: '36px', marginTop: '12px', borderRadius: '8px' }} />
          </div>

          {/* Route Details Skeleton */}
          <div className="trip-sheet-card">
            <div className="skeleton-box" style={{ width: '100%', height: '80px', marginBottom: '12px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '44px', borderRadius: '8px' }} />
          </div>
        </div>

        {/* Right Column Map Skeleton */}
        <div className="live-map-panel">
          <div className="map-glass-card">
            <div className="skeleton-box" style={{ width: '100%', height: '560px', borderRadius: '16px' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

