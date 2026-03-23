import { describe, expect, it } from 'vitest'
import { normalizeRide } from './ride'

describe('normalizeRide', () => {
  it('maps snake_case payload to camelCase', () => {
    const result = normalizeRide({
      id: 1,
      status: 'REQUESTED',
      distance_km: 4.2,
      created_at: '2026-03-20T00:00:00Z',
      pickup_location: {
        id: 10,
        displayName: 'A',
        latitude: 1,
        longitude: 2,
      },
      destination_location: {
        id: 11,
        display_name: 'B',
        latitude: 3,
        longitude: 4,
      },
    })

    expect(result.distanceKm).toBe(4.2)
    expect(result.pickupLocation.displayName).toBe('A')
    expect(result.destinationLocation.displayName).toBe('B')
  })
})
