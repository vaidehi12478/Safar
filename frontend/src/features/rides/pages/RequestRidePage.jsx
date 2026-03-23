import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { requestRide } from '../../../services/api/ridesApi'
import { getErrorMessage } from '../../../shared/lib/errors'

export function RequestRidePage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    pickup_query: '',
    destination_query: '',
  })

  const mutation = useMutation({
    mutationFn: requestRide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rides'] })
      setForm({ pickup_query: '', destination_query: '' })
    },
  })

  return (
    <section className="card">
      <h1>Request ride</h1>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          mutation.mutate(form)
        }}
      >
        <label>
          Pickup
          <input
            type="text"
            value={form.pickup_query}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, pickup_query: event.target.value }))
            }
            required
          />
        </label>
        <label>
          Destination
          <input
            type="text"
            value={form.destination_query}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, destination_query: event.target.value }))
            }
            required
          />
        </label>
        {mutation.isError ? <p className="error">{getErrorMessage(mutation.error)}</p> : null}
        {mutation.isSuccess ? (
          <div className="success">
            <p>
              Ride created. <Link to={`/rides/${mutation.data.id}`}>Open ride details</Link>
            </p>
            <p>
              <strong>Pickup:</strong> {mutation.data.pickupLocation?.displayName}
            </p>
            <p>
              <strong>Destination:</strong> {mutation.data.destinationLocation?.displayName}
            </p>
            <p>
              <strong>Estimated Fare:</strong>{' '}
              {mutation.data.estimate
                ? `${mutation.data.estimate.currency} ${mutation.data.estimate.estimatedFare}`
                : 'n/a'}
            </p>
            <p>
              <strong>Estimated Distance:</strong>{' '}
              {mutation.data.estimate?.distanceKm ?? mutation.data.distanceKm ?? 'n/a'} km
            </p>
          </div>
        ) : null}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Submitting...' : 'Request ride'}
        </button>
      </form>
    </section>
  )
}
