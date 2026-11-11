export function RideFilterBar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  counts,
}) {
  return (
    <div className="history-toolbar">
      <div className="filter-pills-row" role="tablist" aria-label="Filter rides by status">
        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === 'all'}
          className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          <span>All Trips</span>
          <span className="filter-pill-badge tabular-nums">{counts.all}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === 'active'}
          className={`filter-pill ${activeFilter === 'active' ? 'active' : ''}`}
          onClick={() => onFilterChange('active')}
        >
          <span>Active</span>
          <span className="filter-pill-badge tabular-nums">{counts.active}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === 'completed'}
          className={`filter-pill ${activeFilter === 'completed' ? 'active' : ''}`}
          onClick={() => onFilterChange('completed')}
        >
          <span>Completed</span>
          <span className="filter-pill-badge tabular-nums">{counts.completed}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === 'cancelled'}
          className={`filter-pill ${activeFilter === 'cancelled' ? 'active' : ''}`}
          onClick={() => onFilterChange('cancelled')}
        >
          <span>Cancelled</span>
          <span className="filter-pill-badge tabular-nums">{counts.cancelled}</span>
        </button>
      </div>

      <div className="search-sort-row">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            🔍
          </span>
          <label htmlFor="ride-search-input" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            Search trips by location or address
          </label>
          <input
            id="ride-search-input"
            type="text"
            className="search-input"
            placeholder="Search trips by address or landmark…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {searchQuery ? (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="Clear search input"
            >
              ×
            </button>
          ) : null}
        </div>

        <label htmlFor="ride-sort-select" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          Sort rides by
        </label>
        <select
          id="ride-sort-select"
          className="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="fare_high">Highest fare</option>
          <option value="fare_low">Lowest fare</option>
        </select>
      </div>
    </div>
  )
}

