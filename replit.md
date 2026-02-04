# Northern Veterinary Service

## Overview

This is a professional website for Northern Veterinary Service, a peripatetic veterinary surgery provider serving practices across Northern England. The website showcases veterinary services including orthopaedic and soft tissue surgeries, team profiles, case studies, pricing information, and a booking/advice request system.

## User Preferences

Preferred communication style: Simple, everyday language.

## Project Structure

### Deployment-Ready Files (deploy/)
The `deploy/` folder contains all files ready for upload to Hostinger:
- `index.html` - Homepage
- `theteam.html` - Team profiles page
- `casestories.html` - Case studies page
- `pricing.html` - Pricing information
- `booking.html` - Booking/advice request form
- `policies.html` - Practice policies
- `style.css` - Main stylesheet
- `grid-gallery.css` - Gallery layout styles
- `index.js` - JavaScript functionality
- `favicon.ico` - Site favicon
- `images/` - All image assets (optimized)

### Image Folders
- `images/staff-photos/` - Team member photos
- `images/Kuba/` - Kuba case study images
- `images/MCT-APF/` - MCT-APF case study images
- `images/Norman/` - Norman case study images
- `images/Ruby/` - Ruby case study images
- `images/SkewerDog/` - SkewerDog case study images

### Optimizations Applied
- Large images compressed (chihuahua.jpg, daschund.jpg reduced from ~3.5MB to ~80KB)
- Empty folders and unused files removed
- Folder names with spaces renamed for compatibility

### Legacy Files
- `Northern Veterinary Service/` - Original source files (read-only)
- `src/` - Previous React conversion attempt (unused)
- `public/` - Previous static assets (unused)

## Hostinger Deployment

To deploy to Hostinger:
1. Download the entire `deploy/` folder
2. Upload all contents to your Hostinger public_html directory
3. The site will work immediately as it's pure HTML/CSS/JS

### Preview Server
A local preview server (`preview-server.cjs`) is configured to run on port 5000 for testing before deployment.

## Recent Changes (Feb 2026)
- Prepared static HTML files for Hostinger deployment
- Created clean `deploy/` folder with optimized assets
- Compressed large images to reduce page load times
- Added favicon.ico
- Renamed folders with spaces for server compatibility
- Set up preview server for local testing
