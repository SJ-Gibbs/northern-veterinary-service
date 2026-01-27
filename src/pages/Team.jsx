import ServiceCard from '../components/ServiceCard'
import './Team.css'

function Team() {
  const teamMembers = [
    { name: 'Steven Gibbs', title: 'BVSc MRCVS', specialty: 'Orthopaedic Specialist', image: '/Northern Veterinary Service/images/Staff Photos/steven.jpg' },
    { name: 'Tasos Tasiki', title: 'BVetMed MRCVS', specialty: 'Soft Tissue Specialist', image: '/Northern Veterinary Service/images/Staff Photos/tasos.jpg' },
    { name: 'Muffin Man', title: 'BVM&S MRCVS', specialty: 'Surgical Consultant', image: '/Northern Veterinary Service/images/Staff Photos/muffinMan.jpg' },
    { name: 'Eyes McGhee', title: 'BVSc MRCVS', specialty: 'Diagnostic Imaging Specialist', image: '/Northern Veterinary Service/images/Staff Photos/bigeyemcgghee.jpg' }
  ]

  return (
    <div className="team-page">
      <div className="content-wrapper">
        <section className="content-section">
          <h1>Meet Our Expert Team</h1>
          <p className="text-center">Our experienced veterinary surgeons are dedicated to providing exceptional peripatetic surgical services across Northern England. Each team member brings specialized expertise and a commitment to excellence in patient care.</p>
        </section>

        <div className="team-container">
          {teamMembers.map((member, index) => (
            <div key={index} className="staffbox">
              <img className="staffPhoto" src={member.image} alt={`${member.name}, ${member.specialty}`} />
              <h2>{member.name}</h2>
              <p className="staff-title">{member.title}</p>
              <p className="staff-title">{member.specialty}</p>
            </div>
          ))}
        </div>

        <section className="content-section">
          <h2>Our Expertise</h2>
          <div className="services-grid">
            <ServiceCard 
              icon="🎓"
              title="Advanced Qualifications"
              description="All our surgeons hold advanced qualifications and regularly attend continuing professional development courses."
            />
            <ServiceCard 
              icon="⭐"
              title="Years of Experience"
              description="Collectively, our team has decades of experience in complex veterinary surgery."
            />
            <ServiceCard 
              icon="🤝"
              title="Collaborative Approach"
              description="We work closely with referring veterinarians to ensure seamless care and communication."
            />
          </div>
        </section>
      </div>
    </div>
  )
}

export default Team

