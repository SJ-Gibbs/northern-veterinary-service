import { Link } from 'react-router-dom'
import './Policies.css'

function Policies() {
  return (
    <div className="policies-page">
      <div className="content-wrapper">
        <section className="content-section">
          <h1>Policies & Terms of Service</h1>
          <p className="text-center">Northern Veterinary Service is committed to providing the highest quality peripatetic surgical services. Please review our policies and terms below.</p>
        </section>

        <section className="content-section">
          <h2>1. Service Agreement</h2>
          <h3>1.1 Scope of Services</h3>
          <p>Northern Veterinary Service provides peripatetic veterinary surgical services to veterinary practices across Northern England. Our services include orthopaedic surgery, soft tissue surgery, diagnostic imaging, and professional consultations.</p>
          
          <h3>1.2 Professional Relationship</h3>
          <p>All surgical procedures are performed at the referring veterinary practice's facilities. The referring veterinarian remains responsible for the overall care of the patient.</p>
        </section>

        <section className="content-section">
          <h2>2. Booking & Cancellation Policy</h2>
          <h3>2.1 Booking Procedures</h3>
          <p>Surgical procedures must be booked in advance through our online booking form or by telephone. We require a minimum of 48 hours' notice for routine procedures.</p>
          
          <h3>2.2 Cancellation Policy</h3>
          <ul>
            <li>Cancellations made more than 48 hours before: No charge</li>
            <li>Cancellations made 24-48 hours before: 50% of procedure fee</li>
            <li>Cancellations made less than 24 hours before: Full procedure fee</li>
            <li>Emergency cancellations due to patient health: Fees waived at our discretion</li>
          </ul>
        </section>

        <section className="content-section">
          <h2>3. Payment Terms</h2>
          <h3>3.1 Billing</h3>
          <p>Invoices are issued to the referring veterinary practice. Payment terms are 30 days from the date of invoice unless alternative arrangements have been agreed in writing.</p>
          
          <h3>3.2 Member Practices</h3>
          <p>Practices with a member account receive preferential payment terms and access to free consultative services.</p>
        </section>

        <section className="content-section">
          <h2>4. Professional Standards</h2>
          <h3>4.1 Qualifications</h3>
          <p>All Northern Veterinary Service surgeons are registered with the Royal College of Veterinary Surgeons (RCVS) and maintain current professional indemnity insurance.</p>
          
          <h3>4.2 Clinical Standards</h3>
          <p>We adhere to RCVS Code of Professional Conduct and maintain the highest standards of veterinary care.</p>
        </section>

        <section className="content-section">
          <h2>5. Liability & Insurance</h2>
          <h3>5.1 Professional Indemnity</h3>
          <p>Northern Veterinary Service maintains comprehensive professional indemnity insurance covering all surgical procedures and consultations.</p>
          
          <h3>5.2 Limitation of Liability</h3>
          <p>While we strive for excellent outcomes in every case, we cannot guarantee specific results. All surgical procedures carry inherent risks.</p>
        </section>

        <section className="content-section">
          <h2>6. Confidentiality & Data Protection</h2>
          <h3>6.1 Client Confidentiality</h3>
          <p>We maintain strict confidentiality regarding all patient information in accordance with RCVS guidelines and GDPR requirements.</p>
          
          <h3>6.2 Data Protection</h3>
          <p>Patient records are stored securely and retained in accordance with RCVS guidelines.</p>
        </section>

        <section className="content-section">
          <h2>7. Emergency Protocols</h2>
          <h3>7.1 Emergency Support</h3>
          <p>Post-operative telephone support is available for emergency situations. Contact details are provided at the time of surgery.</p>
        </section>

        <section className="content-section">
          <h2>8. Complaints Procedure</h2>
          <h3>8.1 Making a Complaint</h3>
          <p>If you have concerns about our services, please contact us at: <a href="mailto:sg12709@my.bristol.ac.uk">sg12709@my.bristol.ac.uk</a></p>
          
          <h3>8.2 Complaint Resolution</h3>
          <p>All complaints will be acknowledged within 2 working days and investigated thoroughly.</p>
        </section>

        <section className="content-section">
          <h2>9. Terms & Conditions Updates</h2>
          <p>We reserve the right to update these policies periodically. Material changes will be communicated to member practices.</p>
          <p><strong>Last Updated:</strong> January 2026</p>
        </section>

        <section className="content-section cta-box">
          <h3>Questions About Our Policies?</h3>
          <p>If you have any questions about our terms, policies, or procedures, please don't hesitate to contact us.</p>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/booking" className="btn btn-primary">Contact Us</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Policies

