import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import './Header.css'

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <header className="site-header">
      <div className="header-container">
        <div className="logo-section">
          <h1 className="site-title">Northern Veterinary Service</h1>
          <p className="tagline">Expert Peripatetic Surgery Services</p>
        </div>
      
        <nav className="navbar" role="navigation" aria-label="Main navigation">
          <button 
            className={`mobile-menu-toggle ${mobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          
          <ul className={`nav-list ${mobileMenuOpen ? 'active' : ''}`}>
            <li>
              <NavLink to="/" onClick={closeMobileMenu}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/team" onClick={closeMobileMenu}>
                The Team
              </NavLink>
            </li>
            <li>
              <NavLink to="/case-stories" onClick={closeMobileMenu}>
                Case Stories
              </NavLink>
            </li>
            <li>
              <NavLink to="/pricing" onClick={closeMobileMenu}>
                Pricing
              </NavLink>
            </li>
            <li>
              <NavLink to="/booking" onClick={closeMobileMenu}>
                Advice & Booking
              </NavLink>
            </li>
            <li>
              <NavLink to="/policies" onClick={closeMobileMenu}>
                Policies
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header

