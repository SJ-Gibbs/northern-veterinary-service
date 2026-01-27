import { Link } from 'react-router-dom'
import Hero from '../components/Hero'
import ServiceCard from '../components/ServiceCard'
import './Home.css'

function Home() {
  const services = [
    { icon: '🦴', title: 'Orthopaedic Surgery', description: 'TPLO, fracture repair, arthrodesis, and more' },
    { icon: '🏥', title: 'Soft Tissue Surgery', description: 'Complex reconstructions, mass excisions, specialized procedures' },
    { icon: '🔬', title: 'Diagnostic Services', description: 'Ultrasonography, echocardiography, endoscopy' },
    { icon: '📋', title: 'Radiographic Interpretation', description: 'Free for member practices, 48-hour turnaround' }
  ]

  return (
    <div className="home-page">
      <Hero />
      
      <div className="content-wrapper">
        <section className="content-section">
          <h2>About Us</h2>
          <p>Northern Veterinary Service (NVS) brings specialized veterinary expertise directly to patients across Northern England. Our multidisciplinary mobile service ensures that animals receive the highest quality surgical care in the comfort of their own veterinary practice.</p>
          <p>We partner with veterinary practices to provide advanced surgical procedures, expert consultations, and ongoing support for complex cases.</p>
        </section>

        <section className="content-section services-overview">
          <h2>Our Services</h2>
          <div className="services-grid">
            {services.map((service, index) => (
              <ServiceCard key={index} {...service} />
            ))}
          </div>
        </section>

        <section className="content-section">
          <h2>Request Expert Advice</h2>
          <p>Advice requests, including radiographic interpretation, are performed <strong>without cost</strong> for member practices with an account. Our standard turnaround time is 48 hours.</p>
          <p>For urgent advice or immediate services, please contact us directly via phone or WhatsApp.</p>
          <Link to="/booking" className="btn btn-primary">Submit Advice Request</Link>
        </section>

        <section className="content-section">
          <h2>Surgical Pricing Overview</h2>
          <p>We offer transparent, competitive pricing for all our services. View our complete pricing list for orthopaedic and soft tissue procedures.</p>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/pricing" className="btn btn-primary">View Full Pricing</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Home

