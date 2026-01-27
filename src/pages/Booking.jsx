import { useState } from 'react'
import './Booking.css'

function Booking() {
  const [formData, setFormData] = useState({
    practiceName: '',
    email: '',
    phone: '',
    service: '',
    history: '',
    preferredDate: '',
    file: null
  })

  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value, files } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.practiceName.trim()) {
      newErrors.practiceName = 'Practice name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    if (!formData.service) {
      newErrors.service = 'Please select a service'
    }

    if (!formData.history.trim()) {
      newErrors.history = 'Patient history is required'
    } else if (formData.history.length < 10) {
      newErrors.history = 'Please provide more detail (minimum 10 characters)'
    }

    return newErrors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const newErrors = validate()
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setSubmitted(true)
      setIsSubmitting(false)
      setFormData({
        practiceName: '',
        email: '',
        phone: '',
        service: '',
        history: '',
        preferredDate: '',
        file: null
      })
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitted(false)
      }, 5000)
    }, 1000)
  }

  return (
    <div className="booking-page">
      <div className="content-wrapper">
        <section className="content-section">
          <h1>Request Advice or Book a Surgery</h1>
          <p className="text-center">Complete the form below to request expert advice or book a surgical appointment. We'll respond within 48 hours, or sooner for urgent cases.</p>

          {submitted && (
            <div className="success-message">
              <strong>Thank you for your request!</strong><br />
              We will contact you shortly to confirm your booking.
            </div>
          )}

          <form onSubmit={handleSubmit} className="booking-form">
            <div className="form-group">
              <label htmlFor="practiceName">
                Practice Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="practiceName"
                name="practiceName"
                value={formData.practiceName}
                onChange={handleChange}
                placeholder="Enter your practice name"
                className={errors.practiceName ? 'error' : ''}
              />
              {errors.practiceName && <div className="error-message">{errors.practiceName}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="practice@example.com"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <div className="error-message">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Practice Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="01234 567890"
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <div className="error-message">{errors.phone}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="service">
                Service Required <span className="required">*</span>
              </label>
              <select
                id="service"
                name="service"
                value={formData.service}
                onChange={handleChange}
                className={errors.service ? 'error' : ''}
              >
                <option value="">-- Please Select --</option>
                <option value="orthopaedics">Orthopaedic Surgery</option>
                <option value="softtissue">Soft Tissue Surgery</option>
                <option value="ultrasonography">Ultrasonography/Echocardiography</option>
                <option value="endoscopy">Endoscopy</option>
                <option value="radiographic">Radiographic Interpretation (Free for members)</option>
                <option value="advice">General Advice Request</option>
              </select>
              {errors.service && <div className="error-message">{errors.service}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="history">
                Patient History & Request Details <span className="required">*</span>
              </label>
              <textarea
                id="history"
                name="history"
                value={formData.history}
                onChange={handleChange}
                rows="6"
                placeholder="Please provide details about the patient, symptoms, diagnosis, and what service you're requesting..."
                className={errors.history ? 'error' : ''}
              ></textarea>
              {errors.history && <div className="error-message">{errors.history}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="preferredDate">Preferred Date (if booking surgery)</label>
              <input
                type="date"
                id="preferredDate"
                name="preferredDate"
                value={formData.preferredDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="file">X-rays / Images (Optional)</label>
              <input
                type="file"
                id="file"
                name="file"
                onChange={handleChange}
                accept="image/png, image/jpeg, .dcm, application/dicom"
              />
              <small className="form-help">Accepted formats: PNG, JPEG, DICOM (.dcm)</small>
            </div>

            <div className="form-group">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </section>

        <section className="content-section info-box">
          <h3>What Happens Next?</h3>
          <ul>
            <li><strong>Advice Requests:</strong> Free for member practices. We'll review your case and respond within 48 hours.</li>
            <li><strong>Surgery Bookings:</strong> We'll contact you to confirm availability and arrange the visit details.</li>
            <li><strong>Urgent Cases:</strong> For immediate assistance, please call us directly.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default Booking

