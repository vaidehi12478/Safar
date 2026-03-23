import { StatusView } from '../../../shared/ui/StatusView'

export function DriverDashboardPage() {
  return (
    <section className="card">
      <h1>Driver dashboard</h1>
      <p>Your driver experience is wired and ready for endpoint expansion.</p>
      <StatusView
        title="No driver action endpoints yet"
        message="When accept/start/complete APIs are available, they can plug into this module."
      />
    </section>
  )
}
