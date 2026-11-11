import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { getMyRides } from '../../../services/api/ridesApi'
import { getUserStats } from '../../../services/api/usersApi'
import { getErrorMessage } from '../../../shared/lib/errors'
import { ActiveRideHero } from '../components/ActiveRideHero'
import { RiderMetrics } from '../components/RiderMetrics'
import { RideFilterBar } from '../components/RideFilterBar'
import { RideCard } from '../components/RideCard'
import { DashboardSkeletons } from '../components/DashboardSkeletons'

export function RiderDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const initialFilter = searchParams.get('status') || 'all'
  const [activeFilter, setActiveFilter] = useState(initialFilter)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  // Fetch all user rides (seamlessly poll when an active trip is pending/in progress)
  const {
    data: rides,
    isLoading: isRidesLoading,
    isError: isRidesError,
    error: ridesError,
    refetch: refetchRides,
  } = useQuery({
    queryKey: ['my-rides'],
    queryFn: getMyRides,
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some((r) =>
        ['REQUESTED', 'MATCHED', 'IN_PROGRESS'].includes(r.status?.toUpperCase())
      )
      return hasActive ? 2500 : 15000
    },
    refetchIntervalInBackground: true,
  })

  // Fetch rider statistics
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: getUserStats,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  })

  const handleFilterChange = (filter) => {
    setActiveFilter(filter)
    const nextParams = new URLSearchParams(searchParams)
    if (filter === 'all') {
      nextParams.delete('status')
    } else {
      nextParams.set('status', filter)
    }
    setSearchParams(nextParams, { replace: true })
  }

  // Detect active ongoing ride
  const activeRide = useMemo(() => {
    if (!rides) return null
    return (
      rides.find(
        (r) =>
          r.status === 'REQUESTED' ||
          r.status === 'MATCHED' ||
          r.status === 'IN_PROGRESS'
      ) ?? null
    )
  }, [rides])

  // Compute status counts for filter tabs
  const counts = useMemo(() => {
    if (!rides) return { all: 0, active: 0, completed: 0, cancelled: 0 }
    return {
      all: rides.length,
      active: rides.filter(
        (r) =>
          r.status === 'REQUESTED' ||
          r.status === 'MATCHED' ||
          r.status === 'IN_PROGRESS'
      ).length,
      completed: rides.filter((r) => r.status === 'COMPLETED').length,
      cancelled: rides.filter((r) => r.status === 'CANCELLED').length,
    }
  }, [rides])

  // Filter and sort the ride list
  const filteredRides = useMemo(() => {
    if (!rides) return []

    let result = [...rides]

    // 1. Status filter
    if (activeFilter === 'active') {
      result = result.filter(
        (r) =>
          r.status === 'REQUESTED' ||
          r.status === 'MATCHED' ||
          r.status === 'IN_PROGRESS'
      )
    } else if (activeFilter === 'completed') {
      result = result.filter((r) => r.status === 'COMPLETED')
    } else if (activeFilter === 'cancelled') {
      result = result.filter((r) => r.status === 'CANCELLED')
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((r) => {
        const pickup = r.pickupLocation?.displayName?.toLowerCase() || ''
        const drop = r.destinationLocation?.displayName?.toLowerCase() || ''
        const idMatch = String(r.id).includes(q)
        const typeMatch = (r.rideType || '').toLowerCase().includes(q)
        return pickup.includes(q) || drop.includes(q) || idMatch || typeMatch
      })
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      }
      if (sortBy === 'fare_high') {
        return (b.price || 0) - (a.price || 0)
      }
      if (sortBy === 'fare_low') {
        return (a.price || 0) - (b.price || 0)
      }
      return 0
    })

    return result
  }, [rides, activeFilter, searchQuery, sortBy])

  // 1. Loading State
  if (isRidesLoading) {
    return <DashboardSkeletons />
  }

  // 2. Error State
  if (isRidesError) {
    return (
      <div className="safar-dashboard">
        <div className="error-state-card" role="alert">
          <h3>Unable to load your trips</h3>
          <p>{getErrorMessage(ridesError)}</p>
          <button type="button" className="btn-retry" onClick={() => refetchRides()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  // 3. First-time Zero Rides Empty State
  if (!rides || rides.length === 0) {
    return (
      <div className="safar-dashboard">
        <div className="dashboard-header">
          <div className="dashboard-title-group">
            <h1>Rider Dashboard</h1>
            <p>Welcome to Safar. Plan, track, and manage your journeys.</p>
          </div>
          <Link to="/rides/new" className="btn-primary-action">
            <span>Book a Ride</span>
            <span aria-hidden="true">+</span>
          </Link>
        </div>

        <RiderMetrics stats={stats} isLoading={isStatsLoading} />

        <div className="empty-state-card">
          <div className="empty-state-icon" aria-hidden="true">
            🚗
          </div>
          <h2>No journeys yet</h2>
          <p>
            Whether you want a private solo ride or an economical carpool with up to 30% savings,
            we are ready to get you moving.
          </p>
          <Link to="/rides/new" className="btn-primary-action" style={{ marginTop: '8px' }}>
            Request Your First Ride
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="safar-dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title-group">
          <h1>Rider Dashboard</h1>
          <p>Manage your transit, monitor active trips, and review journey history.</p>
        </div>
        <Link to="/rides/new" className="btn-primary-action">
          <span>Book a Ride</span>
          <span aria-hidden="true">+</span>
        </Link>
      </header>

      {/* Active Ride Banner (pinned if there is an active ride) */}
      {activeRide ? <ActiveRideHero ride={activeRide} /> : null}

      {/* Rider Travel Metrics */}
      <RiderMetrics stats={stats} isLoading={isStatsLoading} />

      {/* Journey History & Filterable Feed */}
      <section className="history-section" aria-labelledby="history-heading">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="history-heading" style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
            Trip History
          </h2>
          <span className="tabular-nums" style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Showing {filteredRides.length} of {rides.length} {rides.length === 1 ? 'trip' : 'trips'}
          </span>
        </div>

        <RideFilterBar
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          counts={counts}
        />

        {/* Filtered Empty State */}
        {filteredRides.length === 0 ? (
          <div className="empty-state-card" style={{ padding: '36px 16px' }}>
            <div className="empty-state-icon" aria-hidden="true">
              🔍
            </div>
            <h2>No trips match your criteria</h2>
            <p>
              {searchQuery
                ? `No trips found matching “${searchQuery}” in the selected status.`
                : 'There are no trips matching this status filter.'}
            </p>
            {(searchQuery || activeFilter !== 'all') && (
              <button
                type="button"
                className="empty-clear-btn"
                onClick={() => {
                  setSearchQuery('')
                  handleFilterChange('all')
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="rides-feed">
            {filteredRides.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
