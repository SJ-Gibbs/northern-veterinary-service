# 🧪 Quick Test Guide - Authentication System

## ✅ All Features Implemented

Your website now has a complete authentication system! Here's how to test it:

---

## 🚀 Test the Authentication System

### Preview Server Running:
Access your website at: **http://localhost:5000/**

---

## 📝 Test Steps

### **Step 1: View Non-Authenticated Experience**

1. **Visit Homepage:**
   - URL: `http://localhost:5000/index.html`
   - ✅ Check: Do you see "Login" and "Sign Up" buttons in the top-right?

2. **Try to View Pricing:**
   - URL: `http://localhost:5000/pricing.html`
   - ✅ Check: Do you see the "Member Pricing Access Required" message?
   - ✅ Check: Are the actual prices HIDDEN?
   - ✅ Check: Do you see the lock icon 🔒 and signup/login buttons?

---

### **Step 2: Create a Test Account**

1. **Go to Signup Page:**
   - Click "Sign Up" button OR visit `http://localhost:5000/signup.html`

2. **Fill Out the Form:**
   ```
   Practice Name:    Test Veterinary Clinic
   Email:            test@example.com
   Phone:            01234 567890
   Password:         password123
   Confirm Password: password123
   ☑️ Check: I agree to the terms and conditions
   ```

3. **Submit Form:**
   - Click "Create Account"
   - ✅ Check: Do you see a green success message?
   - ✅ Check: Are you automatically logged in?
   - ✅ Check: Were you redirected to the pricing page?

---

### **Step 3: View Authenticated Experience**

1. **Check Header:**
   - ✅ Check: Do you see a user menu with your practice name?
   - ✅ Check: Did the "Login/Sign Up" buttons disappear?
   - ✅ Check: Do you see a 👤 icon with your practice name?

2. **View Pricing Page:**
   - URL: `http://localhost:5000/pricing.html`
   - ✅ Check: Can you now see ALL the pricing tables?
   - ✅ Check: Are orthopaedic procedure prices visible?
   - ✅ Check: Are soft tissue procedure prices visible?
   - ✅ Check: Are diagnostic service prices visible?

3. **Test User Dropdown:**
   - Click on your practice name/icon in the top-right
   - ✅ Check: Does a dropdown menu appear?
   - ✅ Check: Do you see "My Account" option?
   - ✅ Check: Do you see "Logout" option?

---

### **Step 4: Test Logout**

1. **Logout:**
   - Click on your practice name dropdown
   - Click "Logout"
   - ✅ Check: Were you redirected to the homepage?
   - ✅ Check: Do you see "Login/Sign Up" buttons again?

2. **Try Pricing Page Again:**
   - Visit `http://localhost:5000/pricing.html`
   - ✅ Check: Are prices hidden again?
   - ✅ Check: Do you see the login required message?

---

### **Step 5: Test Login**

1. **Go to Login Page:**
   - Click "Login" button OR visit `http://localhost:5000/login.html`

2. **Enter Credentials:**
   ```
   Email:    test@example.com
   Password: password123
   ```

3. **Submit Form:**
   - Click "Login"
   - ✅ Check: Do you see a green success message?
   - ✅ Check: Are you redirected back?
   - ✅ Check: Is the user menu showing again?

---

### **Step 6: Test All Pages (While Logged In)**

Visit each page and verify the auth UI is consistent:

1. **Homepage** (`index.html`)
   - ✅ User menu visible in top-right

2. **The Team** (`theteam.html`)
   - ✅ User menu visible in top-right

3. **Case Stories** (`casestories.html`)
   - ✅ User menu visible in top-right

4. **Pricing** (`pricing.html`)
   - ✅ User menu visible in top-right
   - ✅ All prices visible

5. **Booking** (`booking.html`)
   - ✅ User menu visible in top-right

6. **Policies** (`policies.html`)
   - ✅ User menu visible in top-right

---

## 📱 Test Mobile Responsiveness

1. **Open Browser DevTools:**
   - Press `F12` or right-click → Inspect
   - Click the device/mobile icon (or press `Ctrl+Shift+M`)

2. **Select Mobile Device:**
   - Choose "iPhone 12 Pro" or similar from dropdown

3. **Check Mobile View:**
   - ✅ Do login/signup buttons display properly?
   - ✅ Does the user menu work on mobile?
   - ✅ Does the dropdown appear correctly?
   - ✅ Are forms easy to use on mobile?

---

## 🔍 Test Error Handling

### **Invalid Login:**
1. Go to login page
2. Enter wrong email/password: `wrong@email.com` / `wrongpass`
3. ✅ Check: Do you see a red error message?

### **Password Mismatch (Signup):**
1. Go to signup page
2. Enter different passwords in the two fields
3. ✅ Check: Do you see "Passwords do not match" error?

### **Duplicate Email:**
1. Try to signup again with `test@example.com`
2. ✅ Check: Do you see "email already exists" error?

---

## 🎯 Expected Behavior Summary

| Action | Not Logged In | Logged In |
|--------|--------------|-----------|
| **View Homepage** | See Login/Signup buttons | See user menu |
| **View Pricing** | See "Login Required" message | See all prices |
| **View Other Pages** | See Login/Signup buttons | See user menu |
| **Click Logout** | N/A | Redirect to homepage, logout |

---

## 💾 Where Is Data Stored?

### Browser LocalStorage:
All user accounts and sessions are stored in your browser's localStorage.

**View Stored Data:**
1. Open DevTools (F12)
2. Go to "Application" or "Storage" tab
3. Look under "Local Storage" → `http://localhost:5000`
4. You'll see:
   - `nvs_users` - All registered practice accounts
   - `nvs_current_user` - Current logged-in session

**Clear All Data:**
```javascript
// Open browser console (F12) and run:
localStorage.clear()
// Then refresh the page
```

---

## 🚨 Troubleshooting

### **Problem: Login/Signup buttons not appearing**
- **Solution:** Clear browser cache (Ctrl+Shift+Delete)
- **Solution:** Check browser console (F12) for JavaScript errors

### **Problem: Prices still showing when logged out**
- **Solution:** Refresh the page (F5)
- **Solution:** Clear localStorage and refresh

### **Problem: Can't create account**
- **Check:** Are all required fields filled?
- **Check:** Is email format valid?
- **Check:** Is password at least 6 characters?
- **Check:** Did you check the terms checkbox?

### **Problem: User menu not appearing after login**
- **Solution:** Refresh the page
- **Solution:** Clear localStorage and login again

---

## ✅ Success Checklist

Before deploying to Hostinger, verify:

- [ ] Can create new account via signup page
- [ ] Can login with created account
- [ ] User menu displays practice name when logged in
- [ ] Pricing page shows login prompt when logged out
- [ ] Pricing page shows all prices when logged in
- [ ] Logout works and returns to homepage
- [ ] Login/Signup buttons appear when logged out
- [ ] Dropdown menu works properly
- [ ] All pages have consistent auth UI
- [ ] Mobile view works correctly
- [ ] Error messages display for invalid inputs

---

## 🎉 You're All Set!

Once all tests pass, your authentication system is working perfectly!

**Ready to upload to Hostinger?**
- Upload all files from the `deploy/` folder
- Include `auth.js`, `login.html`, and `signup.html`
- Updated `style.css` with auth styling
- All HTML pages with auth sections

**For production:** See `AUTHENTICATION-GUIDE.md` for server-side implementation recommendations.

---

## 📊 Test Results

Fill this out as you test:

```
✅ Signup Form Works
✅ Login Form Works
✅ Logout Works
✅ Pricing Protection Works
✅ User Menu Displays
✅ Dropdown Menu Works
✅ Mobile View Works
✅ Error Handling Works
✅ All Pages Consistent
✅ Session Persists on Refresh

TOTAL: ___/10 Tests Passed
```

---

**Need help with testing? Just let me know!** 🚀

