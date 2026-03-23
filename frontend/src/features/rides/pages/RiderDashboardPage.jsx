import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getMyRides } from '../../../services/api/ridesApi'
import { getErrorMessage } from '../../../shared/lib/errors'
import { StatusView } from '../../../shared/ui/StatusView'

export function RiderDashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-rides'],
    queryFn: getMyRides,
  })

  if (isLoading) {
    return <StatusView title="Loading rides..." />
  }

  if (isError) {
    return <StatusView title="Could not load rides" message={getErrorMessage(error)} />
  }

  if (!data?.length) {
    return (
      <StatusView
        title="No rides yet"
        message="Start by requesting your first ride."
        action={<Link to="/rides/new">Request ride</Link>}
      />
    )
  }

  return (
    <section className="card">
      <h1>My rides</h1>
      <ul className="list">
        {data.map((ride) => (
          <li key={ride.id}>
            <Link to={`/rides/${ride.id}`}>
              <strong>#{ride.id}</strong> - {ride.status} - {ride.pickupLocation?.displayName} to{' '}
              {ride.destinationLocation?.displayName}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
