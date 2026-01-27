import { Link } from 'react-router-dom'
import './CaseStories.css'

function CaseStories() {
  const cases = [
    { title: 'TPLO Surgery - Norman', image: '/Northern Veterinary Service/images/Norman/norman.jpeg' },
    { title: 'Soft Tissue Reconstruction - Ruby', image: '/Northern Veterinary Service/images/Ruby/ruby.jpg' },
    { title: 'Fracture Repair - Kuba', image: '/Northern Veterinary Service/images/Kuba/kuba.jpg' },
    { title: 'TPLO Procedure', image: '/Northern Veterinary Service/images/tplo.jpeg' },
    { title: 'Spinal Surgery - Dachshund', image: '/Northern Veterinary Service/images/daschund.jpg' },
    { title: 'Complex Dental - Chihuahua', image: '/Northern Veterinary Service/images/chihuahua.jpg' },
    { title: 'Post-Operative Recovery', image: '/Northern Veterinary Service/images/Norman/norman.jpeg' },
    { title: 'Arthrodesis Case', image: '/Northern Veterinary Service/images/Norman/norman.jpeg' },
    { title: 'Hernia Repair', image: '/Northern Veterinary Service/images/Norman/norman.jpeg' }
  ]

  return (
    <div className="case-stories-page">
      <h1 className="page-title">Case Stories</h1>

      <div className="gallery-intro">
        <p>Here are some of the cases our NVS team has successfully assisted with. These examples demonstrate our expertise across a range of orthopaedic and soft tissue procedures.</p>
        <p><strong>Please Note:</strong> Some images may contain intra-operative photos, X-rays, and CT scans that show surgical procedures.</p>
      </div>

      <div className="gallery-container">
        {cases.map((caseItem, index) => (
          <div key={index} className="gallery-item">
            <div className="caseimage">
              <img src={caseItem.image} alt={caseItem.title} />
            </div>
            <div className="case-text">{caseItem.title}</div>
          </div>
        ))}
      </div>

      <div className="content-wrapper">
        <section className="content-section">
          <h2>Want to Share a Case?</h2>
          <p>If you'd like to refer a case or discuss a complex surgical procedure, please don't hesitate to contact us. We're always happy to provide advice and consultation.</p>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/booking" className="btn btn-primary">Request Consultation</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default CaseStories

