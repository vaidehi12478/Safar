import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { getErrorMessage } from '../../../shared/lib/errors'
import { Logo } from '../../../shared/ui/Logo'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = await login(form)
      navigate(user.role === 'DRIVER' ? '/driver' : '/dashboard')
    } catch (err) {
      setError(getErrorMessage(err, 'Sign in failed. Please check your credentials.'))
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
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to manage your rides, carpool, and earnings</p>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            {error && (
              <div className="transit-alert alert-danger" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>{error}</span>
              </div>
            )}

            <div className="auth-field-group">
              <label htmlFor="auth-email">Email Address</label>
              <div className="auth-input-container">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </span>
                <input
                  id="auth-email"
                  type="email"
                  className="auth-input"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field-group">
              <div className="auth-field-header">
                <label htmlFor="auth-password">Password</label>
              </div>
              <div className="auth-input-container">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </span>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  autoComplete="current-password"
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
              <span>{isSubmitting ? 'Authenticating…' : 'Sign In'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>

          <div className="auth-footer-prompt">
            <span>New to Safar?</span>{' '}
            <Link to="/register" className="auth-footer-link">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
