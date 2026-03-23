import { describe, expect, it } from 'vitest'
import { normalizeUser } from './user'

describe('normalizeUser', () => {
  it('converts createdAt into Date', () => {
    const user = normalizeUser({
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      role: 'RIDER',
      createdAt: '2026-03-21T00:00:00Z',
    })

    expect(user.createdAt).toBeInstanceOf(Date)
  })
})
