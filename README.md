# Northern Veterinary Service Website

A professional website for Northern Veterinary Service, providing peripatetic veterinary surgery services across the north of England.

## Features
- **Home Page**: Introduction to NVS services with pricing information
- **The Team**: Meet the veterinary professionals  
- **Case Stories**: View successful case studies with images
- **Pricing**: Transparent pricing for orthopaedic and soft tissue surgeries
- **Booking & Advice**: Online form for booking surgeries and requesting advice
- **Policies**: Company policies and procedures

## Services Offered

### Orthopaedic Surgery
- Fracture repair (£700-1200)
- Tibial Plateau Levelling Osteotomy (TPLO) (£900)
- Femoral Head and Neck Excision (FHO) (£600)
- Medial Patella Luxation (£800)
- Carpal Arthrodesis (£1000)
- Tarsal Arthrodesis (£800)
- Humeral Intracondylar Fissure (HIF) (£800)

### Soft Tissue Surgery
- Perineal Urethrostomy (£700)
- Total Ear Canal Ablation and Bulla Osteotomy (£900)
- Mass excisions with complex reconstruction (£700)
- Diaphragmatic or Perineal Hernia Repair (£800)
- Nephrectomy/Liver Lobectomy (£800)

### Additional Services
- Ultrasonography/Echocardiography
- Endoscopy
- Radiographic interpretation (Free for member practices, 48-hour turnaround)

## Quick Start

### Prerequisites
- Node.js (v12 or higher)

### Running the Application

1. Navigate to the project directory:
```bash
cd /home/runner/workspace
```

2. Start the server:
```bash
npm start
```

3. Open your web browser and navigate to:
```
http://localhost:3000
```

## File Structure

```
workspace/
├── server.js           # Node.js web server
├── package.json        # Node.js package configuration
├── README.md           # This file
└── Atlas Surgical/
    ├── index.html          # Home page
    ├── booking.html        # Booking and advice request form
    ├── casestories.html    # Case studies gallery
    ├── theteam.html        # Team member profiles
    ├── pricing.html        # Pricing information
    ├── policies.html       # Company policies
    ├── style.css           # Main stylesheet
    ├── grid-gallery.css    # Gallery-specific styles
    ├── index.js            # JavaScript functionality
    ├── CSS/
    │   └── theteam.css     # Team page specific styles
    └── images/             # All website images
        ├── Staff Photos/   # Team member photos
        ├── Norman/         # Case images
        ├── Ruby/           # Case images
        ├── Kuba/           # Case images
        └── ...             # More case images
```

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js HTTP server
- **Styling**: Custom CSS with responsive design

## Features Implemented

### Navigation
- Consistent navigation bar across all pages
- Responsive design for mobile devices
- Hover effects on navigation items

### Forms
- Booking form with file upload capability
- Email and phone validation
- Service selection dropdown
- Image upload for X-rays/DICOM files

### Gallery
- Grid-based case study gallery
- Image display for successful cases
- Professional medical case presentation

### Team Section
- Grid layout for team member profiles
- Professional photos with styled borders
- Responsive team member cards

## Browser Compatibility

The website is compatible with all modern browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Notes

The "Atlas Surgical" directory contains all the website files. The server.js file in the root directory serves these files using a simple Node.js HTTP server.

## Contact Information

For inquiries, please contact:
- **Email**: sg12709@my.bristol.ac.uk

## Copyright

© Copyright reserved - Verlexis ltd

## Future Enhancements

- Backend integration for form submissions
- Database for storing case studies
- User authentication system (Sign In functionality)
- Appointment scheduling system
- Real-time availability checker
- Client portal for tracking cases


