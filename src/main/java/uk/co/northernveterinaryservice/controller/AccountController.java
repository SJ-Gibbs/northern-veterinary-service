package uk.co.northernveterinaryservice.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import uk.co.northernveterinaryservice.config.AppProperties;
import uk.co.northernveterinaryservice.service.ProfileService;
import uk.co.northernveterinaryservice.util.FileUtil;
import uk.co.northernveterinaryservice.util.Validators;

import java.util.List;
import java.util.Map;

/**
 * /api/account/** — mirrors server/routes/account.js
 */
@RestController
@RequestMapping("/api/account")
public class AccountController {

    @Autowired private JdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ProfileService profileService;
    @Autowired private AppProperties appProperties;

    // ── GET /api/account/me ───────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(HttpServletRequest req, HttpSession session) {
        Long userId = sessionUserId(session);
        if (userId == null) return err(401, "Not authenticated.");

        Map<String, Object> profile = profileService.getProfileById(userId, baseUrl(req));
        if (profile == null) return err(404, "User not found.");
        return ResponseEntity.ok(Map.of("success", true, "user", profile));
    }

    // ── PATCH /api/account/update ─────────────────────────────────────────────

    @PatchMapping("/update")
    public ResponseEntity<Map<String, Object>> update(
            @RequestBody Map<String, Object> body,
            HttpServletRequest req,
            HttpSession session) {

        Long userId = sessionUserId(session);
        if (userId == null) return err(401, "Not authenticated.");

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM users WHERE id = ?", userId);
        if (rows.isEmpty()) return err(404, "User not found.");
        Map<String, Object> u = rows.get(0);

        String nextEmail    = str(u, "email");
        String nextPractice = str(u, "practice_name");
        String nextPhone    = str(u, "phone");
        String nextRcvs     = str(u, "rcvs_registration_number");
        String nextPhoto    = str(u, "profile_photo_path");

        if (body.containsKey("email")) {
            Object confirmRaw = body.get("confirmEmail");
            if (confirmRaw == null) return err(400, "Please confirm your email address.");
            String newEmail = body.get("email").toString().trim();
            String conf     = confirmRaw.toString().trim();
            if (!newEmail.equalsIgnoreCase(conf)) return err(400, "Email addresses do not match.");
            if (!newEmail.equals(nextEmail)) {
                if (!Validators.isValidEmail(newEmail)) return err(400, "Please enter a valid email address.");
                List<?> ex = jdbc.queryForList("SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ?",
                        newEmail, userId);
                if (!ex.isEmpty()) return err(400, "An account with this email already exists.");
            }
            nextEmail = newEmail;
        }

        if (body.containsKey("practiceName")) {
            nextPractice = body.get("practiceName").toString().trim();
        }

        if (body.containsKey("phone")) {
            Validators.ValidationResult ph = Validators.validatePhoneNumber(body.get("phone"));
            boolean isAdm = boolVal(u.get("is_admin"));
            String acct = str(u, "account_type");
            if (!isAdm && ("practice".equals(acct) || "team_member".equals(acct))) {
                if (!ph.ok()) return err(400, ph.message());
                nextPhone = ph.value();
            } else {
                nextPhone = body.get("phone") == null ? "" : body.get("phone").toString();
            }
        }

        if (body.containsKey("rcvsRegistrationNumber")) {
            Validators.ValidationResult rc = Validators.validateRcvsRegistrationNumber(body.get("rcvsRegistrationNumber"));
            boolean isAdm = boolVal(u.get("is_admin"));
            String acct = str(u, "account_type");
            if (!isAdm && ("practice".equals(acct) || "team_member".equals(acct))) {
                if (!rc.ok()) return err(400, rc.message());
                nextRcvs = rc.value();
            } else {
                nextRcvs = body.get("rcvsRegistrationNumber") == null ? "" : body.get("rcvsRegistrationNumber").toString();
            }
        }

        if (body.containsKey("address") && body.get("address") instanceof Map<?, ?> a) {
            jdbc.update("UPDATE addresses SET line1=?, line2=?, city=?, county=?, postcode=? WHERE user_id=?",
                    nvl(a.get("line1")), nvl(a.get("line2")),
                    nvl(a.get("city")), nvl(a.get("county")), nvl(a.get("postcode")), userId);
        }

        if (body.containsKey("servicesOffered")) {
            if (!"team_member".equals(str(u, "account_type")) || boolVal(u.get("is_admin"))) {
                return err(400, "Only team members can update offered services.");
            }
            Object raw = body.get("servicesOffered");
            if (raw instanceof List<?> list) {
                profileService.setUserServices(userId, list.stream().map(Object::toString).toList());
            }
        }

        if (body.containsKey("profilePhotoDataUrl")) {
            Object v = body.get("profilePhotoDataUrl");
            String dataUrl = v == null ? "" : v.toString();
            try {
                String rel = FileUtil.writeProfilePhoto(appProperties.getUploadsDir(), userId, dataUrl);
                if ("CLEAR".equals(rel)) {
                    FileUtil.safeDelete(appProperties.getUploadsDir(), nextPhoto);
                    nextPhoto = null;
                } else if (rel != null) {
                    FileUtil.safeDelete(appProperties.getUploadsDir(), nextPhoto);
                    nextPhoto = rel;
                } else {
                    return err(400, "Invalid profile photo.");
                }
            } catch (IllegalArgumentException e) {
                return err(400, e.getMessage());
            }
        }

        jdbc.update("UPDATE users SET email=?, practice_name=?, phone=?, rcvs_registration_number=?, profile_photo_path=? WHERE id=?",
                nextEmail, nextPractice, nextPhone, nextRcvs, nextPhoto, userId);

        Map<String, Object> profile = profileService.getProfileById(userId, baseUrl(req));
        return ResponseEntity.ok(Map.of("success", true, "message", "Profile updated successfully.", "user", profile));
    }

    // ── POST /api/account/password ────────────────────────────────────────────

    @PostMapping("/password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @RequestBody Map<String, Object> body,
            HttpSession session) {

        Long userId = sessionUserId(session);
        if (userId == null) return err(401, "Not authenticated.");

        String currentPassword = str(body, "currentPassword");
        String newPassword     = str(body, "newPassword");
        if (currentPassword.isEmpty() || newPassword.isEmpty()) {
            return err(400, "Current and new password required.");
        }
        if (newPassword.length() < 6) return err(400, "New password must be at least 6 characters long.");

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT password_hash FROM users WHERE id = ?", userId);
        if (rows.isEmpty()) return err(404, "User not found.");

        if (!passwordEncoder.matches(currentPassword, str(rows.get(0), "password_hash"))) {
            return err(400, "Current password is incorrect.");
        }

        String hash = passwordEncoder.encode(newPassword);
        jdbc.update("UPDATE users SET password_hash = ? WHERE id = ?", hash, userId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Password changed successfully!"));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static Long sessionUserId(HttpSession session) {
        Object v = session.getAttribute("userId");
        if (v == null) return null;
        return v instanceof Long l ? l : Long.parseLong(v.toString());
    }

    private static String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v == null ? "" : v.toString();
    }

    private static String nvl(Object v) { return v == null ? "" : v.toString().trim(); }

    private static boolean boolVal(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean b) return b;
        if (v instanceof Number n) return n.intValue() != 0;
        return false;
    }

    private static String baseUrl(HttpServletRequest req) {
        return req.getScheme() + "://" + req.getHeader("Host");
    }

    private static ResponseEntity<Map<String, Object>> err(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("success", false, "message", message));
    }
}
