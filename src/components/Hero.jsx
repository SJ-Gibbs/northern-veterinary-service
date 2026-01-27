import { Link } from 'react-router-dom'
import './Hero.css'

function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h2>Bringing Expert Veterinary Surgery to Your Practice</h2>
        <p className="hero-subtitle">Multidisciplinary mobile surgery services across Northern England</p>
        <div className="hero-cta">
          <Link to="/booking" className="btn btn-primary">Book a Consultation</Link>
          <Link to="/pricing" className="btn btn-secondary">View Pricing</Link>
        </div>
      </div>
    </section>
  )
}

export default Hero

