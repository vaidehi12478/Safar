import { z } from 'zod'

const locationSchema = z.object({
  id: z.number(),
  displayName: z.string().optional(),
  display_name: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  name: z.string().nullable().optional(),
  road: z.string().nullable().optional(),
  postcode: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  countryCode: z.string().nullable().optional(),
  country_code: z.string().nullable().optional(),
})

const rideEstimateSchema = z.object({
  distance_km: z.number().optional(),
  estimated_fare: z.number().optional(),
  currency: z.string().optional(),
  breakdown: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
})

const rideSchema = z.object({
  id: z.number(),
  status: z.string(),
  price: z.number().nullable().optional(),
  distance_km: z.number().nullable().optional(),
  distanceKm: z.number().nullable().optional(),
  created_at: z.string().optional(),
  createdAt: z.string().optional(),
  pickup_location: locationSchema.optional(),
  pickupLocation: locationSchema.optional(),
  destination_location: locationSchema.optional(),
  destinationLocation: locationSchema.optional(),
  estimate: rideEstimateSchema.optional(),
})

function normalizeLocation(location) {
  if (!location) {
    return null
  }
  return {
    id: location.id,
    displayName: location.displayName ?? location.display_name ?? 'Unknown place',
    latitude: location.latitude,
    longitude: location.longitude,
    name: location.name ?? '',
    road: location.road ?? '',
    postcode: location.postcode ?? '',
    city: location.city ?? '',
    country: location.country ?? '',
    countryCode: location.countryCode ?? location.country_code ?? '',
  }
}

export function normalizeRide(input) {
  const parsed = rideSchema.parse(input)
  return {
    id: parsed.id,
    status: parsed.status,
    price: parsed.price ?? null,
    distanceKm: parsed.distanceKm ?? parsed.distance_km ?? null,
    createdAt: parsed.createdAt ?? parsed.created_at ?? null,
    pickupLocation: normalizeLocation(parsed.pickupLocation ?? parsed.pickup_location),
    destinationLocation: normalizeLocation(parsed.destinationLocation ?? parsed.destination_location),
    estimate: parsed.estimate
      ? {
          distanceKm: parsed.estimate.distance_km ?? null,
          estimatedFare: parsed.estimate.estimated_fare ?? null,
          currency: parsed.estimate.currency ?? 'USD',
          breakdown: parsed.estimate.breakdown ?? {},
        }
      : null,
  }
}
