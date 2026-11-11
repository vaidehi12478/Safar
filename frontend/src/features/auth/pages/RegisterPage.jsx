import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { getErrorMessage } from '../../../shared/lib/errors'
import { Logo } from '../../../shared/ui/Logo'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'RIDER',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = await register(form)
      navigate(user.role === 'DRIVER' ? '/driver' : '/dashboard')
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please check your information.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-viewport">
      <div className="auth-card-wrap">
        <div className="auth-brand-center">
          <Logo variant="full" size="lg" showTagline={true} />
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-title">Create Your Safar Account</h1>
            <p className="auth-subtitle">Join thousands of commuters and drivers moving smarter every day</p>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            {error && (
              <div className="transit-alert alert-danger" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>{error}</span>
              </div>
            )}

            {/* Segmented Role Selector */}
            <div className="auth-role-segmented-box" role="radiogroup" aria-label="Select account type">
              <button
                type="button"
                role="radio"
                aria-checked={form.role === 'RIDER'}
                className={`auth-role-segment ${form.role === 'RIDER' ? 'active' : ''}`}
                onClick={() => setForm((prev) => ({ ...prev, role: 'RIDER' }))}
              >
                <span className="role-icon">👤</span>
                <div className="role-details">
                  <strong className="role-title">Commuter / Rider</strong>
                  <span className="role-desc">Book solo rides & save with carpooling</span>
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={form.role === 'DRIVER'}
                className={`auth-role-segment ${form.role === 'DRIVER' ? 'active' : ''}`}
                onClick={() => setForm((prev) => ({ ...prev, role: 'DRIVER' }))}
              >
                <span className="role-icon">🚘</span>
                <div className="role-details">
                  <strong className="role-title">Partner Driver</strong>
                  <span className="role-desc">Earn 80% net split on trips</span>
                </div>
              </button>
            </div>

            <div className="auth-field-group">
              <label htmlFor="reg-name">Full Name</label>
              <div className="auth-input-container">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </span>
                <input
                  id="reg-name"
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Ridhi Sharma"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="reg-email">Email Address</label>
              <div className="auth-input-container">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </span>
                <input
                  id="reg-email"
                  type="email"
                  className="auth-input"
                  placeholder="ridhi@example.com"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field-group">
              <div className="auth-field-header">
                <label htmlFor="reg-password">Password</label>
                <span className="field-hint">Min. 6 characters</span>
              </div>
              <div className="auth-input-container">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </span>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  className="auth-input"
                  placeholder="Create a secure password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary-action auth-submit-btn"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'Creating Profile…' : `Join Safar as ${form.role === 'DRIVER' ? 'Driver Partner' : 'Rider'}`}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>

          <div className="auth-footer-prompt">
            <span>Already have an account?</span>{' '}
            <Link to="/login" className="auth-footer-link">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
