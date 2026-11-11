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
  ride_type: z.string().optional(),
  rideType: z.string().optional(),
  carpool_group_id: z.number().nullable().optional(),
  carpoolGroupId: z.number().nullable().optional(),
  rider_distance_km: z.number().nullable().optional(),
  riderDistanceKm: z.number().nullable().optional(),
  created_at: z.string().optional(),
  createdAt: z.string().optional(),
  pickup_location: locationSchema.optional(),
  pickupLocation: locationSchema.optional(),
  destination_location: locationSchema.optional(),
  destinationLocation: locationSchema.optional(),
  estimate: rideEstimateSchema.optional(),
  payment_method: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  payment_status: z.string().nullable().optional(),
  paymentStatus: z.string().nullable().optional(),
  razorpay_order_id: z.string().nullable().optional(),
  razorpayOrderId: z.string().nullable().optional(),
  razorpay_payment_id: z.string().nullable().optional(),
  razorpayPaymentId: z.string().nullable().optional(),
  paid_at: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
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
    rideType: (parsed.rideType ?? parsed.ride_type ?? 'SOLO').toUpperCase(),
    carpoolGroupId: parsed.carpoolGroupId ?? parsed.carpool_group_id ?? null,
    riderDistanceKm: parsed.riderDistanceKm ?? parsed.rider_distance_km ?? null,
    createdAt: parsed.createdAt ?? parsed.created_at ?? null,
    paymentMethod: parsed.paymentMethod ?? parsed.payment_method ?? null,
    paymentStatus: (parsed.paymentStatus ?? parsed.payment_status ?? 'PENDING').toUpperCase(),
    razorpayOrderId: parsed.razorpayOrderId ?? parsed.razorpay_order_id ?? null,
    razorpayPaymentId: parsed.razorpayPaymentId ?? parsed.razorpay_payment_id ?? null,
    paidAt: parsed.paidAt ?? parsed.paid_at ?? null,
    pickupLocation: normalizeLocation(parsed.pickupLocation ?? parsed.pickup_location),
    destinationLocation: normalizeLocation(parsed.destinationLocation ?? parsed.destination_location),
    estimate: parsed.estimate
      ? {
          distanceKm: parsed.estimate.distance_km ?? null,
          estimatedFare: parsed.estimate.estimated_fare ?? null,
          currency: parsed.estimate.currency ?? 'INR',
          breakdown: parsed.estimate.breakdown ?? {},
        }
      : null,
  }
}

export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '—'
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDistance(km) {
  if (km === null || km === undefined || isNaN(km)) {
    return '—'
  }
  return `${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(km)} km`
}

export function formatRideDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
