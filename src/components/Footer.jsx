import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>Northern Veterinary Service</h3>
          <p>Expert peripatetic veterinary surgery services across Northern England</p>
        </div>
        
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/team">The Team</Link></li>
            <li><Link to="/case-stories">Case Stories</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
            <li><Link to="/booking">Book Appointment</Link></li>
            <li><Link to="/policies">Policies</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Contact Us</h3>
          <p>Email: <a href="mailto:sg12709@my.bristol.ac.uk">sg12709@my.bristol.ac.uk</a></p>
          <p>Available for urgent consultations</p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {currentYear} Verlexis Ltd. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer

