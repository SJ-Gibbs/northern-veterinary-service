package uk.co.northernveterinaryservice.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import uk.co.northernveterinaryservice.config.AppProperties;
import uk.co.northernveterinaryservice.service.MailService;
import uk.co.northernveterinaryservice.service.ProfileService;
import uk.co.northernveterinaryservice.util.FileUtil;
import uk.co.northernveterinaryservice.util.RateLimiter;
import uk.co.northernveterinaryservice.util.ServicesCatalog;
import uk.co.northernveterinaryservice.util.Validators;

import java.security.SecureRandom;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * /api/auth/** — mirrors server/routes/auth.js
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private JdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AppProperties appProperties;
    @Autowired private MailService mailService;
    @Autowired private ProfileService profileService;
    @Autowired private RateLimiter rateLimiter;

    private static final SecureRandom RNG = new SecureRandom();

    // ── POST /api/auth/login ─────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody Map<String, Object> body,
            HttpServletRequest req,
            HttpSession session) {

        String ip = req.getRemoteAddr();
        if (!rateLimiter.allow("login:" + ip, 5, 24 * 60 * 60 * 1000L)) {
            return err(429, "Too many failed login attempts. Please try again in 24 hours.");
        }

        String email    = str(body, "email").trim();
        String password = str(body, "password");
        if (email.isEmpty() || password.isEmpty()) {
            return err(400, "Email and password required.");
        }

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", email);
        if (rows.isEmpty()) {
            return err(401, "Invalid email or password.");
        }
        Map<String, Object> user = rows.get(0);

        if (!passwordEncoder.matches(password, str(user, "password_hash"))) {
            return err(401, "Invalid email or password.");
        }

        boolean isAdmin = boolVal(user.get("is_admin"));
        if (!isAdmin && !boolVal(user.get("is_active"))) {
            return err(403, "This account has been deactivated. Please contact support.");
        }
        if (!isAdmin && !boolVal(user.get("email_verified"))) {
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", false);
            resp.put("code", "EMAIL_NOT_VERIFIED");
            resp.put("message", "Please verify your email address before logging in. Check your inbox for the verification link.");
            return ResponseEntity.status(403).body(resp);
        }

        rateLimiter.decrement("login:" + ip);
        setSessionForUser(session, user);

        long userId = longVal(user.get("id"));
        Map<String, Object> profile = profileService.getProfileById(userId, baseUrl(req));
        return ok(Map.of("success", true, "message", "Login successful", "user", profile));
    }

    // ── POST /api/auth/logout ─────────────────────────────────────────────────

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpSession session) {
        session.invalidate();
        return ok(Map.of("success", true, "message", "Logged out."));
    }

    // ── POST /api/auth/site-gate ──────────────────────────────────────────────

    @PostMapping("/site-gate")
    public ResponseEntity<Map<String, Object>> siteGate(@RequestBody Map<String, Object> body) {
        String expectedUser = appProperties.getSiteGateUser().trim();
        String expectedPass = appProperties.getSiteGatePass().trim();

        if (expectedUser.isEmpty() || expectedPass.isEmpty()) {
            return err(503, "Site gate is not configured on this server.");
        }
        if (expectedUser.equals(str(body, "username")) && expectedPass.equals(str(body, "password"))) {
            return ok(Map.of("success", true));
        }
        return err(401, "Those details are not correct. Please try again.");
    }

    // ── GET /api/auth/me ─────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(HttpServletRequest req, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return err(401, "Not logged in.");
        }
        Map<String, Object> profile = profileService.getProfileById(userId, baseUrl(req));
        if (profile == null) {
            session.invalidate();
            return err(401, "Session invalid.");
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("user", profile);
        resp.put("masterAdminEmail", appProperties.getMasterAdminEmail());
        return ResponseEntity.ok(resp);
    }

    // ── POST /api/auth/register ───────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
            @RequestBody Map<String, Object> body,
            HttpServletRequest req) {

        if (!appProperties.isAllowPublicSignup()) {
            return err(403, "Self-registration is disabled. Contact the practice administrator.");
        }

        String accountType = "practice".equals(str(body, "accountType")) ? "practice" : "team_member";
        String email        = str(body, "email").trim();
        String confirmEmail = str(body, "confirmEmail").trim();
        String password     = str(body, "password");
        String practiceName = str(body, "practiceName").trim();
        String phone        = str(body, "phone").trim();
        Object addrRaw      = body.get("address");
        String rcvsRaw      = str(body, "rcvsRegistrationNumber");
        String photoDataUrl = str(body, "profilePhotoDataUrl");

        if (!confirmEmail.isEmpty() && !email.equalsIgnoreCase(confirmEmail)) {
            return err(400, "Email addresses do not match.");
        }
        if (confirmEmail.isEmpty()) {
            return err(400, "Please confirm your email address.");
        }
        if (!Validators.isValidEmail(email)) {
            return err(400, "Please enter a valid email address.");
        }
        if (password.length() < 6) {
            return err(400, "Password must be at least 6 characters long.");
        }

        Validators.ValidationResult rcvsCheck = Validators.validateRcvsRegistrationNumber(rcvsRaw);
        if (!rcvsCheck.ok()) return err(400, rcvsCheck.message());

        Validators.ValidationResult phCheck = Validators.validatePhoneNumber(phone);
        if (!phCheck.ok()) return err(400, phCheck.message());

        String role = Validators.normalizeRole(str(body, "role"));
        if ("practice".equals(accountType)) {
            role = "practice";
        } else if (!"vet".equals(role) && !"veterinary_nurse".equals(role)) {
            return err(400, "Select a valid role (Vet or Veterinary Nurse).");
        }

        if ("team_member".equals(accountType) && photoDataUrl.isEmpty()) {
            return err(400, "A profile photo is required.");
        }

        List<Map<String, Object>> dup = jdbc.queryForList(
                "SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", email);
        if (!dup.isEmpty()) {
            return err(400, "An account with this email already exists.");
        }

        String hash = passwordEncoder.encode(password);
        Map<String, String> addr = addrMap(addrRaw);

        KeyHolder kh = new GeneratedKeyHolder();
        final String finalRole = role;
        final String finalHash = hash;
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO users (email, password_hash, practice_name, account_type, role, phone, rcvs_registration_number, is_admin, is_active) VALUES (?,?,?,?,?,?,?,0,1)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, email);
            ps.setString(2, finalHash);
            ps.setString(3, practiceName);
            ps.setString(4, accountType);
            ps.setString(5, finalRole);
            ps.setString(6, phCheck.value());
            ps.setString(7, rcvsCheck.value());
            return ps;
        }, kh);
        long newId = kh.getKey().longValue();

        jdbc.update(
                "INSERT INTO addresses (user_id, line1, line2, city, county, postcode) VALUES (?,?,?,?,?,?)",
                newId, addr.get("line1"), addr.get("line2"),
                addr.get("city"), addr.get("county"), addr.get("postcode"));

        if ("team_member".equals(accountType)) {
            for (String code : ServicesCatalog.OFFERABLE_SERVICE_IDS) {
                jdbc.update("INSERT INTO user_services (user_id, service_code) VALUES (?,?)", newId, code);
            }
        }

        if ("team_member".equals(accountType) && !photoDataUrl.isEmpty()) {
            try {
                String relPath = FileUtil.writeProfilePhoto(appProperties.getUploadsDir(), newId, photoDataUrl);
                if (relPath == null) {
                    rollbackNewUser(newId);
                    return err(400, "Invalid profile photo. Please upload a valid image.");
                }
                jdbc.update("UPDATE users SET profile_photo_path = ? WHERE id = ?", relPath, newId);
            } catch (IllegalArgumentException e) {
                rollbackNewUser(newId);
                return err(400, e.getMessage());
            }
        }

        String verifyToken = randomHex(32);
        Timestamp verifyExpires = Timestamp.from(Instant.now().plusSeconds(24 * 60 * 60));
        jdbc.update("UPDATE users SET email_verify_token = ?, email_verify_expires = ? WHERE id = ?",
                verifyToken, verifyExpires, newId);

        mailService.sendVerificationEmail(email, verifyToken);

        return ok(Map.of("success", true,
                "message", "Account created successfully. Please check your email to verify your address before logging in."));
    }

    // ── GET /api/auth/verify-email ────────────────────────────────────────────

    @GetMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@RequestParam(defaultValue = "") String token) {
        if (token.isBlank()) return redirect("/login.html?verified=invalid");
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, email_verify_expires FROM users WHERE email_verify_token = ? LIMIT 1", token);
        if (rows.isEmpty()) return redirect("/login.html?verified=invalid");

        Map<String, Object> user = rows.get(0);
        Object exp = user.get("email_verify_expires");
        if (exp == null || Timestamp.valueOf(exp.toString()).before(new java.util.Date())) {
            return redirect("/login.html?verified=expired");
        }
        jdbc.update("UPDATE users SET email_verified = 1, email_verify_token = NULL, email_verify_expires = NULL WHERE id = ?",
                user.get("id"));
        return redirect("/login.html?verified=1");
    }

    // ── POST /api/auth/forgot-password ────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(
            @RequestBody Map<String, Object> body,
            HttpServletRequest req) {

        String ip = req.getRemoteAddr();
        if (!rateLimiter.allow("forgot:" + ip, 3, 60 * 60 * 1000L)) {
            return err(429, "Too many password reset requests. Please wait before trying again.");
        }

        Map<String, Object> generic = Map.of("success", true,
                "message", "If that email address is registered, a password reset link has been sent.");

        String email = str(body, "email").trim().toLowerCase();
        if (email.isEmpty()) return err(400, "Email address required.");

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, email FROM users WHERE LOWER(email) = ? LIMIT 1", email);
        if (rows.isEmpty()) return ok(generic);

        Map<String, Object> user = rows.get(0);
        String resetToken = randomHex(32);
        Timestamp resetExpires = Timestamp.from(Instant.now().plusSeconds(60 * 60));
        jdbc.update("UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?",
                resetToken, resetExpires, user.get("id"));

        mailService.sendPasswordResetEmail(str(user, "email"), resetToken);
        return ok(generic);
    }

    // ── POST /api/auth/reset-password ────────────────────────────────────────

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, Object> body) {
        String token       = str(body, "token").trim();
        String newPassword = str(body, "newPassword");

        if (token.isEmpty()) return err(400, "Reset token is required.");
        if (newPassword.length() < 6) return err(400, "Password must be at least 6 characters long.");

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, password_reset_expires FROM users WHERE password_reset_token = ? LIMIT 1", token);
        if (rows.isEmpty()) return err(400, "This reset link is invalid or has already been used.");

        Map<String, Object> user = rows.get(0);
        Object exp = user.get("password_reset_expires");
        if (exp == null || Timestamp.valueOf(exp.toString()).before(new java.util.Date())) {
            return err(400, "This reset link has expired. Please request a new one.");
        }
        String hash = passwordEncoder.encode(newPassword);
        jdbc.update("UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?",
                hash, user.get("id"));
        return ok(Map.of("success", true, "message", "Your password has been reset. You can now log in."));
    }

    // ── POST /api/auth/resend-verification ───────────────────────────────────

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, Object>> resendVerification(
            @RequestBody Map<String, Object> body,
            HttpServletRequest req) {

        String ip = req.getRemoteAddr();
        if (!rateLimiter.allow("resend:" + ip, 3, 60 * 60 * 1000L)) {
            return err(429, "Too many resend requests. Please wait before trying again.");
        }

        Map<String, Object> generic = Map.of("success", true,
                "message", "If that address is registered and unverified, a new link has been sent.");

        String email = str(body, "email").trim().toLowerCase();
        if (email.isEmpty()) return err(400, "Email address required.");

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, email, email_verified FROM users WHERE LOWER(email) = ? LIMIT 1", email);
        if (rows.isEmpty() || boolVal(rows.get(0).get("email_verified"))) return ok(generic);

        Map<String, Object> user = rows.get(0);
        String verifyToken = randomHex(32);
        Timestamp verifyExpires = Timestamp.from(Instant.now().plusSeconds(24 * 60 * 60));
        jdbc.update("UPDATE users SET email_verify_token = ?, email_verify_expires = ? WHERE id = ?",
                verifyToken, verifyExpires, user.get("id"));
        mailService.sendVerificationEmail(str(user, "email"), verifyToken);
        return ok(generic);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void setSessionForUser(HttpSession session, Map<String, Object> user) {
        String emailL = str(user, "email").toLowerCase();
        boolean isAdmin = boolVal(user.get("is_admin"));
        session.setAttribute("userId",        longVal(user.get("id")));
        session.setAttribute("isAdmin",       isAdmin);
        session.setAttribute("isMasterAdmin", isAdmin && emailL.equals(appProperties.getMasterAdminEmail()));
        session.setAttribute("userEmail",     str(user, "email"));
    }

    private void rollbackNewUser(long userId) {
        jdbc.update("DELETE FROM user_services WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM addresses WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM users WHERE id = ?", userId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> addrMap(Object raw) {
        Map<String, String> result = new LinkedHashMap<>();
        for (String k : List.of("line1", "line2", "city", "county", "postcode")) {
            result.put(k, "");
        }
        if (raw instanceof Map<?, ?> m) {
            for (String k : result.keySet()) {
                Object v = m.get(k);
                result.put(k, v == null ? "" : v.toString().trim());
            }
        }
        return result;
    }

    private static String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v == null ? "" : v.toString();
    }

    private static boolean boolVal(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean b) return b;
        if (v instanceof Number n) return n.intValue() != 0;
        return false;
    }

    private static long longVal(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number n) return n.longValue();
        return Long.parseLong(v.toString());
    }

    private static String baseUrl(HttpServletRequest req) {
        return req.getScheme() + "://" + req.getHeader("Host");
    }

    private static String randomHex(int bytes) {
        byte[] buf = new byte[bytes];
        RNG.nextBytes(buf);
        return HexFormat.of().formatHex(buf);
    }

    private static ResponseEntity<Map<String, Object>> ok(Map<String, Object> body) {
        return ResponseEntity.ok(body);
    }

    private static ResponseEntity<Map<String, Object>> err(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("success", false, "message", message));
    }

    private static ResponseEntity<Void> redirect(String location) {
        return ResponseEntity.status(302)
                .header("Location", location)
                .build();
    }
}
