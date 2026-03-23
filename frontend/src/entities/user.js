import { z } from 'zod'

export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  createdAt: z.string().or(z.date()),
})

export const tokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
})

export function normalizeUser(input) {
  const parsed = userSchema.parse(input)
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
  }
}
