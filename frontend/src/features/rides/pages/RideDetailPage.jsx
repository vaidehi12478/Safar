import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { getRideById, getRideStatus } from '../../../services/api/ridesApi'
import { getErrorMessage } from '../../../shared/lib/errors'
import { StatusView } from '../../../shared/ui/StatusView'

export function RideDetailPage() {
  const { rideId } = useParams()

  const rideQuery = useQuery({
    queryKey: ['ride', rideId],
    queryFn: () => getRideById(rideId),
  })

  const statusQuery = useQuery({
    queryKey: ['ride-status', rideId],
    queryFn: () => getRideStatus(rideId),
    refetchInterval: 7000,
  })

  if (rideQuery.isLoading) {
    return <StatusView title="Loading ride..." />
  }

  if (rideQuery.isError) {
    return <StatusView title="Could not load ride" message={getErrorMessage(rideQuery.error)} />
  }

  if (!rideQuery.data) {
    return <StatusView title="Ride not found" />
  }

  const ride = rideQuery.data

  return (
    <section className="card">
      <h1>Ride #{ride.id}</h1>
      <p>
        <strong>Status:</strong> {statusQuery.data?.status ?? ride.status}
      </p>
      <p>
        <strong>Pickup:</strong> {ride.pickupLocation?.displayName}
      </p>
      <p>
        <strong>Destination:</strong> {ride.destinationLocation?.displayName}
      </p>
      <p>
        <strong>Distance:</strong> {ride.distanceKm ?? 'n/a'} km
      </p>
      <p>
        <strong>Price:</strong> {ride.price ?? 'n/a'}
      </p>
    </section>
  )
}
