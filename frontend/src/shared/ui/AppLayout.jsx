import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { Logo } from './Logo'

export function AppLayout() {
  const { user, logout } = useAuth()
  const initial = (user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()
  const isDriver = user?.role === 'DRIVER'

  return (
    <div className="safar-shell">
      {/* Accessibility Skip Link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to={isDriver ? '/driver' : '/dashboard'} aria-label="Safar Home">
            <Logo variant="compact" size="md" />
          </Link>

          <nav className="nav desktop-nav" aria-label="Main Navigation">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Dashboard</span>
            </NavLink>
            {!isDriver ? (
              <NavLink
                to="/rides/new"
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Request Ride</span>
              </NavLink>
            ) : null}
            {isDriver ? (
              <NavLink
                to="/driver"
                className={({ isActive }) => (isActive ? 'nav-item active nav-item-driver' : 'nav-item nav-item-driver')}
              >
                <span className="driver-live-pulse" aria-hidden="true" />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.3V16c0 .6.4 1 1 1h2"></path>
                  <circle cx="7" cy="17" r="2"></circle>
                  <circle cx="17" cy="17" r="2"></circle>
                </svg>
                <span>Driver Cockpit</span>
              </NavLink>
            ) : null}
            <NavLink
              to="/profile"
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Profile</span>
            </NavLink>
          </nav>

          <div className="userbox">
            <div className="user-profile-badge" title={user?.email || user?.name}>
              <div className="user-avatar-circle" aria-hidden="true">
                {initial}
              </div>
              <div className="user-info-text">
                <span className="user-name">{user?.name || 'Commuter'}</span>
                <span className={`user-role-pill ${isDriver ? 'role-driver' : 'role-rider'}`}>
                  {isDriver ? 'Driver Pro' : 'Rider'}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="btn-logout"
              onClick={logout}
              aria-label="Log out of Safar"
              title="Log Out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span className="logout-text">Exit</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="main-viewport">
        <Outlet />
      </main>

      {/* Mobile Sticky Bottom Navigation for Single-Thumb Ergonomics */}
      <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>Dashboard</span>
        </NavLink>
        {!isDriver ? (
          <NavLink
            to="/rides/new"
            className={({ isActive }) => (isActive ? 'mobile-tab active mobile-tab-cta' : 'mobile-tab mobile-tab-cta')}
          >
            <div className="mobile-cta-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <span>Ride</span>
          </NavLink>
        ) : null}
        {isDriver ? (
          <NavLink
            to="/driver"
            className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.3V16c0 .6.4 1 1 1h2"></path>
              <circle cx="7" cy="17" r="2"></circle>
              <circle cx="17" cy="17" r="2"></circle>
            </svg>
            <span>Driver</span>
          </NavLink>
        ) : null}
        <NavLink
          to="/profile"
          className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  )
}
