import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserStats, updateUserProfile } from '../../../services/api/usersApi'
import { useAuth } from '../../auth/useAuth'
import { useToast } from '../../../shared/ui/Toast'

export function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })

  // Update local form state if user auth object changes from elsewhere
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
      })
    }
  }, [user])

  const statsQuery = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => getUserStats(),
  })

  const updateMutation = useMutation({
    mutationFn: (payload) => updateUserProfile(payload),
    onSuccess: (updatedUser) => {
      // update global auth object so Header catches changes instantly
      updateUser(updatedUser)
      addToast({ title: 'Profile Updated', message: 'Your profile has been saved successfully', variant: 'success' })
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to update profile'
      addToast({ title: 'Error', message: msg, variant: 'error' })
    }
  })

  function handleSubmit(e) {
    e.preventDefault()
    // only update what actually changed
    const payload = {}
    if (formData.name !== user.name) payload.name = formData.name
    if (formData.email !== user.email) payload.email = formData.email
    
    if (Object.keys(payload).length > 0) {
      updateMutation.mutate(payload)
    }
  }

  function handleChange(e) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const isDriver = user?.role === 'DRIVER'

  return (
    <section className="profile-page" style={{ padding: '2rem 0', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#111827', margin: 0 }}>My Profile</h1>
        <p style={{ color: '#6b7280', fontSize: '1rem', marginTop: '0.5rem' }}>View your stats and update your personal details</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Profile Card */}
        <div style={{ 
          backgroundColor: '#fff', 
          borderRadius: '16px', 
          padding: '2rem', 
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          border: '1px solid #f3f4f6'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>Account Details</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Full Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange}
                disabled={updateMutation.isPending}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f9fafb',
                  fontSize: '1rem',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Email Address</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange}
                disabled={updateMutation.isPending}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f9fafb',
                  fontSize: '1rem',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
              />
            </div>

            <button 
              type="submit" 
              disabled={updateMutation.isPending || (formData.name === user?.name && formData.email === user?.email)}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.875rem',
                backgroundColor: (updateMutation.isPending || (formData.name === user?.name && formData.email === user?.email)) ? '#9ca3af' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: (updateMutation.isPending || (formData.name === user?.name && formData.email === user?.email)) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: (updateMutation.isPending || (formData.name === user?.name && formData.email === user?.email)) ? 'none' : '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
              }}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Stats Card */}
        <div style={{ 
          backgroundColor: '#111827', 
          borderRadius: '16px', 
          padding: '2rem', 
          color: '#fff',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Glassmorphism background decorations */}
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '150px', height: '150px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(37, 99, 235, 0.1))', filter: 'blur(20px)', zIndex: 0 }}></div>
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>My Stats</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {statsQuery.data?.is_suspended && (
                  <span style={{ backgroundColor: '#ef4444', color: '#fff', padding: '0.4rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                    SUSPENDED
                  </span>
                )}
                <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '0.4rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {user?.role}
                </span>
              </div>
            </div>

            {statsQuery.isLoading ? (
              <div style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', height: '150px' }}>Loading stats...</div>
            ) : statsQuery.isError ? (
              <div style={{ color: '#fca5a5' }}>Failed to load stats.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Rating Card */}
                <div style={{ gridColumn: 'span 2', backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#fbbf24', marginBottom: '0.25rem' }}>Average Rating</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24' }}>
                      {statsQuery.data.rating.toFixed(1)} <span style={{ fontSize: '1.25rem' }}>★</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Based on</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>{statsQuery.data.num_ratings} reviews</div>
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Completed Rides</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{statsQuery.data.total_rides || 0}</div>
                </div>
                
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Total Distance</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{(statsQuery.data.total_distance_km || 0).toFixed(1)} <span style={{ fontSize: '1rem', color: '#9ca3af', fontWeight: 500 }}>km</span></div>
                </div>

                {isDriver ? (
                  <>
                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      <div style={{ fontSize: '0.85rem', color: '#60a5fa', marginBottom: '0.5rem' }}>Wallet Balance</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>₹{(statsQuery.data.wallet_balance || 0).toFixed(2)}</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <div style={{ fontSize: '0.85rem', color: '#34d399', marginBottom: '0.5rem' }}>Total Earnings</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>₹{(statsQuery.data.total_earned || 0).toFixed(2)}</div>
                    </div>
                  </>
                ) : (
                  <div style={{ gridColumn: 'span 2', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Total Spent</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>₹{(statsQuery.data.total_spent || 0).toFixed(2)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
