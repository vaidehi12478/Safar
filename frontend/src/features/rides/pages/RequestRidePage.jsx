import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { requestRide, estimateRideFare } from '../../../services/api/ridesApi'
import { getErrorMessage } from '../../../shared/lib/errors'

export function RequestRidePage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    pickup_query: '',
    destination_query: '',
  })

  const estimateMutation = useMutation({
    mutationFn: estimateRideFare,
  })

  const rideMutation = useMutation({
    mutationFn: requestRide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rides'] })
      setForm({ pickup_query: '', destination_query: '' })
      estimateMutation.reset()
    },
  })

  return (
    <section className="card">
      <h1>Request ride</h1>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!estimateMutation.isSuccess) {
            estimateMutation.mutate(form)
          } else {
            rideMutation.mutate(form)
          }
        }}
      >
        <label>
          Pickup
          <input
            type="text"
            value={form.pickup_query}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, pickup_query: event.target.value }))
              estimateMutation.reset()
              rideMutation.reset()
            }}
            required
          />
        </label>
        <label>
          Destination
          <input
            type="text"
            value={form.destination_query}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, destination_query: event.target.value }))
              estimateMutation.reset()
              rideMutation.reset()
            }}
            required
          />
        </label>
        {estimateMutation.isError ? <p className="error">{getErrorMessage(estimateMutation.error)}</p> : null}
        {rideMutation.isError ? <p className="error">{getErrorMessage(rideMutation.error)}</p> : null}
        
        {estimateMutation.isSuccess && !rideMutation.isSuccess ? (
          <div className="success" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0, color: '#166534' }}>Fare Estimate</h3>
            <p><strong>Distance:</strong> {estimateMutation.data.distance_km} km</p>
            <p style={{ fontSize: '1.2rem', color: '#15803d' }}>
              <strong>Estimated Fare:</strong> {estimateMutation.data.currency} {estimateMutation.data.estimated_fare}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#166534' }}>{estimateMutation.data.breakdown?.pricing_note}</p>
          </div>
        ) : null}

        {rideMutation.isSuccess ? (
          <div className="success">
            <p>
              Ride created. <Link to={`/rides/${rideMutation.data.id}`}>Open ride details</Link>
            </p>
            <p>
              <strong>Pickup:</strong> {rideMutation.data.pickupLocation?.displayName}
            </p>
            <p>
              <strong>Destination:</strong> {rideMutation.data.destinationLocation?.displayName}
            </p>
            <p>
              <strong>Estimated Fare:</strong>{' '}
              {rideMutation.data.estimate
                ? `${rideMutation.data.estimate.currency} ${rideMutation.data.estimate.estimated_fare}`
                : 'n/a'}
            </p>
            <p>
              <strong>Estimated Distance:</strong>{' '}
              {rideMutation.data.estimate?.distance_km ?? rideMutation.data.distanceKm ?? 'n/a'} km
            </p>
          </div>
        ) : null}

        {!estimateMutation.isSuccess ? (
          <button type="submit" disabled={estimateMutation.isPending || rideMutation.isPending}>
            {estimateMutation.isPending ? 'Calculating...' : 'Get Estimate'}
          </button>
        ) : (
          <button type="submit" disabled={rideMutation.isPending} style={{ backgroundColor: '#10b981' }}>
            {rideMutation.isPending ? 'Booking...' : 'Confirm Booking'}
          </button>
        )}
      </form>
    </section>
  )
}
