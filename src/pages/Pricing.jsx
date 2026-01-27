import { Link } from 'react-router-dom'
import './Pricing.css'

function Pricing() {
  const orthopaedicProcedures = [
    { name: 'Fracture Repair (Simple)', price: '£700' },
    { name: 'Fracture Repair (Complex)', price: '£1,200' },
    { name: 'Tibial Plateau Levelling Osteotomy (TPLO)', price: '£900' },
    { name: 'Femoral Head and Neck Excision (FHO)', price: '£600' },
    { name: 'Medial Patella Luxation Repair', price: '£800' },
    { name: 'Carpal Arthrodesis', price: '£1,000' },
    { name: 'Tarsal Arthrodesis', price: '£800' },
    { name: 'Humeral Intracondylar Fissure (HIF) Repair', price: '£800' },
    { name: 'Triple Pelvic Osteotomy (TPO)', price: '£950' },
    { name: 'Angular Limb Deformity Correction', price: '£900' }
  ]

  const softTissueProcedures = [
    { name: 'Perineal Urethrostomy', price: '£700' },
    { name: 'Total Ear Canal Ablation & Bulla Osteotomy (TECABO)', price: '£900' },
    { name: 'Mass Excision (Simple)', price: '£500' },
    { name: 'Mass Excision with Complex Reconstruction', price: '£700' },
    { name: 'Diaphragmatic Hernia Repair', price: '£800' },
    { name: 'Perineal Hernia Repair', price: '£800' },
    { name: 'Nephrectomy', price: '£800' },
    { name: 'Liver Lobectomy', price: '£800' },
    { name: 'Portosystemic Shunt Ligation', price: '£950' },
    { name: 'Laryngeal Tie-Back (Unilateral)', price: '£650' }
  ]

  const diagnosticServices = [
    { name: 'Ultrasonography (Abdominal)', price: '£200' },
    { name: 'Echocardiography', price: '£250' },
    { name: 'Endoscopy (Gastroscopy/Colonoscopy)', price: '£300' },
    { name: 'Radiographic Interpretation (Member Practices)', price: 'FREE' },
    { name: 'Consultation & Advice (Member Practices)', price: 'FREE' }
  ]

  return (
    <div className="pricing-page">
      <div className="content-wrapper">
        <section className="content-section">
          <h1>Surgical Pricing</h1>
          <p className="pricing-intro">We believe in transparent, competitive pricing. All prices shown are in GBP (£) and represent the surgeon's fee for the procedure.</p>

          <div className="pricing-tables">
            <div className="pricing-category">
              <h3>Orthopaedic Procedures</h3>
              <table className="table-pricing">
                <thead>
                  <tr>
                    <th>Procedure</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {orthopaedicProcedures.map((proc, index) => (
                    <tr key={index}>
                      <td>{proc.name}</td>
                      <td>{proc.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pricing-category">
              <h3>Soft Tissue Procedures</h3>
              <table className="table-pricing">
                <thead>
                  <tr>
                    <th>Procedure</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {softTissueProcedures.map((proc, index) => (
                    <tr key={index}>
                      <td>{proc.name}</td>
                      <td>{proc.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pricing-category" style={{ marginTop: '2rem' }}>
            <h3 style={{ textAlign: 'center' }}>Diagnostic Services</h3>
            <table className="table-pricing">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticServices.map((service, index) => (
                  <tr key={index}>
                    <td>{service.name}</td>
                    <td><strong>{service.price}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="content-section highlight-box">
          <h3>What's Included in the Price?</h3>
          <ul className="included-list">
            <li>✓ Surgeon's professional fee</li>
            <li>✓ Pre-operative consultation</li>
            <li>✓ Surgical procedure</li>
            <li>✓ Immediate post-operative care</li>
            <li>✓ Written surgical report</li>
            <li>✓ Post-operative telephone support</li>
          </ul>
        </section>

        <section className="content-section">
          <p className="pricing-note">
            <strong>Important:</strong> Prices may vary based on individual case complexity. Contact us for a detailed, personalized quote.
          </p>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/booking" className="btn btn-primary" style={{ marginRight: '1rem' }}>Request a Quote</Link>
            <Link to="/" className="btn btn-secondary">Learn More</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Pricing

