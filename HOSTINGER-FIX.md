# Hostinger Deployment - Image Display Fixes

## Issues Fixed ✅

### 1. **Staff Photos Appearing as Ovals Instead of Circles**

**Problem:** Photos were being stretched or squeezed into oval shapes.

**Root Cause:**
- Missing `display: block` on images caused inline spacing issues
- No min/max dimensions allowed browser to resize inconsistently
- Container flex properties weren't properly centering content

**Solution Applied:**
Updated `.staffPhoto` CSS in `deploy/style.css`:
```css
.staffPhoto {
    display: block;              /* Prevents inline spacing issues */
    width: 200px;
    height: 200px;
    min-width: 200px;           /* Enforces minimum dimensions */
    min-height: 200px;
    max-width: 200px;           /* Enforces maximum dimensions */
    max-height: 200px;
    border-radius: 50%;         /* Makes it circular */
    object-fit: cover;          /* Crops to fit without distortion */
    object-position: center;    /* Centers the image within the circle */
    margin: 0 auto 1rem auto;  /* Centers horizontally */
    border: 4px solid var(--primary-color);
}
```

Updated `.staffbox` CSS:
```css
.staffbox {
    /* ... existing properties ... */
    display: flex;              /* Uses flexbox for better control */
    flex-direction: column;     /* Stacks content vertically */
    align-items: center;        /* Centers items horizontally */
    justify-content: flex-start; /* Aligns to top */
}
```

---

## Troubleshooting Images Not Showing on Hostinger

### Common Issues & Solutions:

### ✅ Issue 1: Case-Sensitive File Paths
**Hostinger uses Linux servers, which are case-sensitive!**

❌ **Wrong:**
```html
<img src="images/Staff-Photos/Steven.jpg">  <!-- Capital S and P -->
```

✅ **Correct:**
```html
<img src="images/staff-photos/steven.jpg">  <!-- All lowercase -->
```

**Our files are already correct:**
- `images/staff-photos/steven.jpg` ✓
- `images/staff-photos/tasos.jpg` ✓
- `images/staff-photos/muffinMan.jpg` ✓
- `images/staff-photos/bigeyemcgghee.jpg` ✓
- `images/staff-photos/captainlate.jpg` ⚠️ (needs to be uploaded)

---

### ✅ Issue 2: Directory Structure

Ensure your Hostinger folder structure matches exactly:
```
public_html/
├── index.html
├── theteam.html
├── casestories.html
├── booking.html
├── pricing.html
├── policies.html
├── style.css
├── grid-gallery.css
├── index.js
├── favicon.ico
└── images/
    ├── staff-photos/
    │   ├── steven.jpg
    │   ├── tasos.jpg
    │   ├── muffinMan.jpg
    │   ├── bigeyemcgghee.jpg
    │   └── captainlate.jpg (ADD THIS!)
    ├── Kuba/
    ├── MCT-APF/
    ├── Norman/
    ├── Ruby/
    └── SkewerDog/
```

---

### ✅ Issue 3: File Upload Checklist

When uploading to Hostinger:

1. **Upload ALL files from the `deploy/` folder**
2. **Maintain the exact folder structure**
3. **Check file permissions** (should be 644 for files, 755 for folders)
4. **Clear browser cache** after uploading
5. **Test with browser DevTools** (F12 → Network tab) to see if images load

---

### ✅ Issue 4: Missing Captain Late Photo

The HTML references:
```html
<img src="images/staff-photos/captainlate.jpg" alt="Captain Late, Veterinary Surgeon">
```

**Action Required:** Upload a photo named `captainlate.jpg` to the `images/staff-photos/` folder on Hostinger.

---

## Testing Images Locally

Test before uploading by running the preview server:

```bash
node preview-server.cjs
```

Then open: `http://localhost:5000/theteam.html`

- If images show locally but not on Hostinger → Check file paths and case sensitivity
- If images don't show locally → Check that files exist in correct folders

---

## Hostinger-Specific Tips

### File Manager Access
1. Log into Hostinger control panel
2. Go to **Files** → **File Manager**
3. Navigate to `public_html`
4. Upload all files from the `deploy/` folder

### Clear Hostinger Cache
After uploading changes:
1. Go to **Advanced** → **Clear Cache** in Hostinger panel
2. Clear your browser cache (Ctrl+Shift+Delete)
3. Force refresh the page (Ctrl+F5)

### Check .htaccess (if needed)
If images still don't load, add this to `.htaccess` in `public_html`:
```apache
<IfModule mod_headers.c>
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
</IfModule>

# Enable image serving
<FilesMatch "\.(jpg|jpeg|png|gif|ico)$">
    SetEnv no-gzip
</FilesMatch>
```

---

## Verification Checklist

After uploading to Hostinger, verify:

- [ ] Homepage loads correctly
- [ ] All navigation links work
- [ ] Staff photos display as perfect circles (not ovals)
- [ ] Case study images display in gallery
- [ ] Favicon shows in browser tab
- [ ] Mobile navigation menu works
- [ ] All pages load without errors (check browser console F12)

---

## Quick Test URLs

After uploading, test these pages:
1. `https://yourdomain.com/` - Homepage
2. `https://yourdomain.com/theteam.html` - Team page (check photos!)
3. `https://yourdomain.com/casestories.html` - Case stories (check gallery)
4. `https://yourdomain.com/booking.html` - Booking form

---

## Need More Help?

If images still don't show:
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Look for red/failed image requests
5. Click on failed requests to see the exact error
6. Check if the file path matches exactly

**Common error messages:**
- `404 Not Found` → File doesn't exist or wrong path
- `403 Forbidden` → Wrong file permissions
- `ERR_NAME_NOT_RESOLVED` → DNS/domain issue

---

## Summary of Changes Made

✅ Fixed CSS for perfect circular staff photos  
✅ Prevented image stretching/distortion  
✅ Ensured proper centering  
✅ Added flexbox layout for consistent display  
✅ Set explicit min/max dimensions  
✅ Added object-fit and object-position for proper cropping

**All changes committed to Git!**

Upload the entire `deploy/` folder to Hostinger and the issues should be resolved! 🎉

