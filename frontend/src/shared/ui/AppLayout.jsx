import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'

export function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="container">
      <header className="topbar">
        <Link className="brand" to="/dashboard">
          Safar
        </Link>
        <nav className="nav">
          <NavLink to="/dashboard">Rides</NavLink>
          <NavLink to="/rides/new">Request Ride</NavLink>
          {user?.role === 'DRIVER' ? <NavLink to="/driver">Driver</NavLink> : null}
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <div className="userbox">
          <span>{user?.name}</span>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
