import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'

vi.mock('../../services/api/authApi', () => ({
  getMe: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Tester',
    email: 'tester@example.com',
    role: 'RIDER',
    createdAt: new Date(),
  }),
  login: vi.fn(),
  register: vi.fn(),
}))

function Probe() {
  const { status, user } = useAuth()
  return (
    <div>
      <span>{status}</span>
      <span>{user?.name ?? 'none'}</span>
    </div>
  )
}

describe('AuthProvider', () => {
  it('boots without crashing', async () => {
    localStorage.clear()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument())
    expect(screen.getByText('none')).toBeInTheDocument()
  })
})
