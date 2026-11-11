export function DashboardSkeletons() {
  return (
    <div className="safar-dashboard" aria-busy="true" aria-label="Loading dashboard data">
      <div className="dashboard-header">
        <div>
          <div className="skeleton-box" style={{ width: '220px', height: '32px', marginBottom: '8px' }} />
          <div className="skeleton-box" style={{ width: '160px', height: '18px' }} />
        </div>
        <div className="skeleton-box" style={{ width: '140px', height: '44px' }} />
      </div>

      <div className="metrics-strip">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="metric-card">
            <div className="skeleton-box" style={{ width: '40%', height: '14px', marginBottom: '8px' }} />
            <div className="skeleton-box" style={{ width: '70%', height: '28px' }} />
          </div>
        ))}
      </div>

      <div className="history-section">
        <div className="history-toolbar">
          <div className="skeleton-box" style={{ width: '100%', height: '40px' }} />
        </div>

        <div className="rides-feed">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="ride-card-enhanced" style={{ minHeight: '140px' }}>
              <div className="skeleton-box" style={{ width: '30%', height: '20px', marginBottom: '12px' }} />
              <div className="skeleton-box" style={{ width: '75%', height: '16px', marginBottom: '8px' }} />
              <div className="skeleton-box" style={{ width: '60%', height: '16px' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

