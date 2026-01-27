# Quick Start Guide - Northern Veterinary Service Website

## Web Application is Now Running! 🎉

The Northern Veterinary Service website is currently running at:
**http://localhost:3000**

### Current Status
✓ Web server is active on port 3000
✓ All HTML pages are accessible
✓ CSS styling is loaded
✓ Images and assets are available

---

## How to Access the Website

### Option 1: Direct Browser Access
Open your web browser and navigate to:
```
http://localhost:3000
```

### Option 2: Use Port Forwarding (if on remote server)
If you're running this on a remote server (like Replit), you may need to:
1. Check the "Webview" or "Browser" tab in your IDE
2. Or use the public URL provided by your hosting environment

---

## Available Pages

1. **Home Page** (`/index.html` or `/`)
   - About NVS services
   - Quick links to advice, booking, and pricing
   - Overview of surgical services

2. **The Team** (`/theteam.html`)
   - Meet the veterinary professionals
   - Steven Gibbs
   - Tasos Tasiki
   - Team member profiles with photos

3. **Case Stories** (`/casestories.html`)
   - Successful case studies
   - Medical case images
   - Before/after examples

4. **Pricing** (`/pricing.html`)
   - Orthopaedic surgery pricing
   - Soft tissue surgery pricing
   - Transparent cost information

5. **Advice & Booking** (`/booking.html`)
   - Online booking form
   - File upload for X-rays/images
   - Service selection options
   - Contact information submission

6. **Policies** (`/policies.html`)
   - Company policies
   - Terms and conditions

---

## Server Management

### Start the Server
```bash
./start.sh
```
or
```bash
nix-shell --run "node server.js"
```

### Stop the Server
Press `Ctrl+C` in the terminal where the server is running

### Restart the Server
1. Stop the server (Ctrl+C)
2. Run the start command again

---

## Technical Details

### Server Configuration
- **Server**: Node.js HTTP server
- **Port**: 3000
- **Base Directory**: `/home/runner/workspace/Atlas Surgical/`
- **Node.js Version**: v22.16.0

### File Structure
```
workspace/
├── start.sh            # Quick start script
├── server.js           # Node.js server
├── package.json        # npm configuration
├── shell.nix           # Nix environment
├── .replit             # Replit configuration
└── Atlas Surgical/     # Website files
    ├── index.html
    ├── booking.html
    ├── casestories.html
    ├── theteam.html
    ├── pricing.html
    ├── policies.html
    ├── style.css
    ├── grid-gallery.css
    ├── index.js
    ├── CSS/
    └── images/
```

---

## Testing the Application

### Check Server Status
```bash
curl -I http://localhost:3000/
```

Expected response:
```
HTTP/1.1 200 OK
Content-Type: text/html
```

### View Server Logs
The server logs all HTTP requests to the console. Look for:
```
GET /index.html
GET /style.css
GET /images/...
```

---

## Troubleshooting

### Server Not Starting
1. Ensure port 3000 is not already in use
2. Check that nix-shell is available: `which nix-shell`
3. Verify Node.js is accessible in nix-shell: `nix-shell --run "node --version"`

### Pages Not Loading
1. Check the browser console for errors
2. Verify the file path in the URL
3. Check server logs for 404 errors

### Images Not Displaying
1. Ensure images exist in the `images/` directory
2. Check file permissions: `ls -la "Atlas Surgical/images/"`
3. Verify image paths in HTML match actual file locations

### CSS Not Applied
1. Check browser developer tools Network tab
2. Verify `style.css` is being loaded
3. Check for CSS syntax errors in browser console

---

## Next Steps

### For Development
1. Edit HTML files in `Atlas Surgical/` directory
2. Modify CSS in `style.css` or `grid-gallery.css`
3. Add functionality in `index.js`
4. Refresh browser to see changes

### For Production Deployment
1. Consider using a production web server (nginx, Apache)
2. Set up SSL/TLS for HTTPS
3. Configure domain name and DNS
4. Implement form backend for booking system
5. Add database for case management
6. Set up user authentication

---

## Support

For technical support or questions:
- Email: sg12709@my.bristol.ac.uk
- Review the full README.md for more details

---

**Enjoy your Northern Veterinary Service website!** 🐾


