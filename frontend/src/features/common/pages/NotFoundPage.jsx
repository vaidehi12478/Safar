import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="card">
      <h1>Page not found</h1>
      <p>This route does not exist.</p>
      <Link to="/dashboard">Go to dashboard</Link>
    </section>
  )
}
