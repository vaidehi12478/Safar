import { ActiveRide } from '../components/ActiveRide'
import { AvailableRides } from '../components/AvailableRides'
import { DriverLocationDisplay } from '../components/DriverLocationDisplay'
import { DriverStatusToggle } from '../components/DriverStatusToggle'

export function DriverDashboardPage() {
  return (
    <div className="driver-dashboard">
      <h1>Driver Dashboard</h1>

      <div className="top-section">
        <DriverStatusToggle />
        <DriverLocationDisplay />
      </div>
      
      <div className="dashboard-grid">
        <div className="active-ride-section">
          <ActiveRide />
        </div>
        
        <div className="available-rides-section">
          <AvailableRides />
        </div>
      </div>
    </div>
  )
}
