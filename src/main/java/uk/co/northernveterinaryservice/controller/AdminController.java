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
import uk.co.northernveterinaryservice.util.Validators;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * /api/admin/** — mirrors server/routes/admin.js
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired private JdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwordEncoder;

    // ── GET /api/admin/users ──────────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> listUsers(HttpSession session) {
        if (!isAdmin(session)) return err(session);

        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                SELECT u.id, u.email, u.practice_name, u.account_type, u.role, u.phone,
                       u.rcvs_registration_number, u.is_admin, u.is_active, u.created_at,
                       a.line1 AS addr_line1, a.line2 AS addr_line2, a.city AS addr_city,
                       a.county AS addr_county, a.postcode AS addr_postcode
                FROM users u
                LEFT JOIN addresses a ON a.user_id = u.id
                ORDER BY u.practice_name ASC
                """);

        List<Map<String, Object>> list = rows.stream().map(r -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id",                    String.valueOf(r.get("id")));
            item.put("email",                 nvl(r.get("email")));
            item.put("practiceName",          nvl(r.get("practice_name")));
            item.put("accountType",           nvl(r.get("account_type")));
            item.put("role",                  nvl(r.get("role")));
            item.put("phone",                 nvl(r.get("phone")));
            item.put("rcvsRegistrationNumber", nvl(r.get("rcvs_registration_number")));
            item.put("isAdmin",               boolVal(r.get("is_admin")));
            item.put("isActive",              boolVal(r.get("is_active")));
            item.put("createdAt",             r.get("created_at"));
            item.put("address", Map.of(
                    "line1",    nvl(r.get("addr_line1")),
                    "line2",    nvl(r.get("addr_line2")),
                    "city",     nvl(r.get("addr_city")),
                    "county",   nvl(r.get("addr_county")),
                    "postcode", nvl(r.get("addr_postcode"))));
            return item;
        }).toList();

        return ResponseEntity.ok(Map.of("success", true, "users", list));
    }

    // ── PATCH /api/admin/users/:id ────────────────────────────────────────────

    @PatchMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> updateUser(
            @PathVariable long id,
            @RequestBody Map<String, Object> body,
            HttpSession session) {

        if (!isAdmin(session)) return err(session);

        List<Map<String, Object>> trg = jdbc.queryForList("SELECT * FROM users WHERE id = ?", id);
        if (trg.isEmpty()) return err(404, "User not found.");
        if (boolVal(trg.get(0).get("is_admin"))) return err(400, "Cannot edit admin accounts here.");

        Map<String, Object> u = trg.get(0);

        if (body.containsKey("email")) {
            Object confirmRaw = body.get("confirmEmail");
            if (confirmRaw == null) return err(400, "Email confirmation required.");
            if (!str(body, "email").trim().equalsIgnoreCase(confirmRaw.toString().trim())) {
                return err(400, "Email addresses do not match.");
            }
        }

        String nextEmail    = str(u, "email");
        String nextPractice = str(u, "practice_name");
        String nextPhone    = str(u, "phone");
        String nextRcvs     = str(u, "rcvs_registration_number");

        if (body.containsKey("practiceName")) nextPractice = str(body, "practiceName").trim();

        if (body.containsKey("email")) {
            String newEmail = str(body, "email").trim();
            if (!newEmail.equals(nextEmail)) {
                if (!Validators.isValidEmail(newEmail)) return err(400, "Invalid email address.");
                List<?> ex = jdbc.queryForList("SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ?",
                        newEmail, id);
                if (!ex.isEmpty()) return err(400, "Email already in use by another account.");
            }
            nextEmail = newEmail;
        }

        if (body.containsKey("phone")) {
            Validators.ValidationResult ph = Validators.validatePhoneNumber(body.get("phone"));
            String acct = str(u, "account_type");
            if ("practice".equals(acct) || "team_member".equals(acct)) {
                if (!ph.ok()) return err(400, ph.message());
                nextPhone = ph.value();
            } else {
                nextPhone = str(body, "phone");
            }
        }

        if (body.containsKey("rcvsRegistrationNumber")) {
            Validators.ValidationResult rc = Validators.validateRcvsRegistrationNumber(body.get("rcvsRegistrationNumber"));
            String acct = str(u, "account_type");
            if ("practice".equals(acct) || "team_member".equals(acct)) {
                if (!rc.ok()) return err(400, rc.message());
                nextRcvs = rc.value();
            } else {
                nextRcvs = str(body, "rcvsRegistrationNumber");
            }
        }

        jdbc.update("UPDATE users SET email=?, practice_name=?, phone=?, rcvs_registration_number=? WHERE id=?",
                nextEmail, nextPractice, nextPhone, nextRcvs, id);

        if (body.containsKey("address") && body.get("address") instanceof Map<?, ?> a) {
            jdbc.update("UPDATE addresses SET line1=?, line2=?, city=?, county=?, postcode=? WHERE user_id=?",
                    nvl(a.get("line1")), nvl(a.get("line2")),
                    nvl(a.get("city")), nvl(a.get("county")), nvl(a.get("postcode")), id);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Practice details updated."));
    }

    // ── POST /api/admin/users/:id/active ──────────────────────────────────────

    @PostMapping("/users/{id}/active")
    public ResponseEntity<Map<String, Object>> toggleActive(
            @PathVariable long id,
            @RequestBody Map<String, Object> body,
            HttpSession session) {

        if (!isAdmin(session)) return err(session);

        List<Map<String, Object>> trg = jdbc.queryForList("SELECT is_admin FROM users WHERE id = ?", id);
        if (trg.isEmpty()) return err(404, "User not found.");
        if (boolVal(trg.get(0).get("is_admin"))) return err(400, "Cannot change admin account status here.");

        boolean active = boolVal(body.get("isActive"));
        jdbc.update("UPDATE users SET is_active = ? WHERE id = ?", active ? 1 : 0, id);
        return ResponseEntity.ok(Map.of("success", true,
                "message", (active ? "activated" : "deactivated") + " successfully."));
    }

    // ── DELETE /api/admin/users/:id ───────────────────────────────────────────

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> deleteUser(
            @PathVariable long id, HttpSession session) {

        if (!isAdmin(session)) return err(session);

        List<Map<String, Object>> trg = jdbc.queryForList("SELECT is_admin FROM users WHERE id = ?", id);
        if (trg.isEmpty()) return err(404, "User not found.");
        if (boolVal(trg.get(0).get("is_admin"))) return err(400, "Cannot delete admin accounts.");

        jdbc.update("DELETE FROM users WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Practice account deleted."));
    }

    // ── POST /api/admin/users/:id/reset-password ──────────────────────────────

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(
            @PathVariable long id,
            @RequestBody Map<String, Object> body,
            HttpSession session) {

        if (!isAdmin(session)) return err(session);

        String newPassword = str(body, "newPassword");
        if (newPassword.length() < 6) return err(400, "Password must be at least 6 characters.");

        List<Map<String, Object>> trg = jdbc.queryForList("SELECT is_admin FROM users WHERE id = ?", id);
        if (trg.isEmpty()) return err(404, "User not found.");
        if (boolVal(trg.get(0).get("is_admin"))) return err(400, "Cannot reset admin password here.");

        String hash = passwordEncoder.encode(newPassword);
        jdbc.update("UPDATE users SET password_hash = ? WHERE id = ?", hash, id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Password reset successfully."));
    }

    // ── POST /api/admin/users (admin creates user) ────────────────────────────

    @PostMapping("/users")
    public ResponseEntity<Map<String, Object>> createUser(
            @RequestBody Map<String, Object> body,
            HttpSession session) {

        if (!isAdmin(session)) return err(session);

        String accountType  = "team_member".equals(str(body, "accountType")) ? "team_member" : "practice";
        String email        = str(body, "email").trim();
        String password     = str(body, "password");
        String practiceName = str(body, "practiceName").trim();
        String phone        = str(body, "phone").trim();
        Object addrRaw      = body.get("address");
        String role         = "practice".equals(accountType) ? "practice" : normalizeAdminRole(str(body, "role"));

        if (!Validators.isValidEmail(email) || practiceName.isEmpty()) {
            return err(400, "Valid email and practice name required.");
        }
        if (password.length() < 6) return err(400, "Password must be at least 6 characters.");

        Validators.ValidationResult rc = Validators.validateRcvsRegistrationNumber(body.get("rcvsRegistrationNumber"));
        if (!rc.ok()) return err(400, rc.message());

        Validators.ValidationResult ph = Validators.validatePhoneNumber(phone);
        if (!ph.ok()) return err(400, ph.message());

        List<?> ex = jdbc.queryForList("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", email);
        if (!ex.isEmpty()) return err(400, "Email already registered.");

        String hash = passwordEncoder.encode(password);
        Map<String, String> addr = addrMap(addrRaw);

        KeyHolder kh = new GeneratedKeyHolder();
        final String finalRole = role, finalHash = hash;
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO users (email, password_hash, practice_name, account_type, role, phone, rcvs_registration_number, is_admin, is_active, email_verified) VALUES (?,?,?,?,?,?,?,0,1,1)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, email); ps.setString(2, finalHash); ps.setString(3, practiceName);
            ps.setString(4, accountType); ps.setString(5, finalRole);
            ps.setString(6, ph.value()); ps.setString(7, rc.value());
            return ps;
        }, kh);
        long newId = kh.getKey().longValue();

        jdbc.update("INSERT INTO addresses (user_id, line1, line2, city, county, postcode) VALUES (?,?,?,?,?,?)",
                newId, addr.get("line1"), addr.get("line2"),
                addr.get("city"), addr.get("county"), addr.get("postcode"));

        return ResponseEntity.ok(Map.of("success", true, "message", "User created.", "id", String.valueOf(newId)));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static boolean isAdmin(HttpSession session) {
        Object uid = session.getAttribute("userId");
        Object adm = session.getAttribute("isAdmin");
        return uid != null && boolVal(adm);
    }

    private static ResponseEntity<Map<String, Object>> err(HttpSession session) {
        Object uid = session.getAttribute("userId");
        if (uid == null) return err(401, "Not authenticated.");
        return err(403, "Admin access required.");
    }

    private static String normalizeAdminRole(String r) {
        if (r == null) return "vet";
        String s = r.trim().toLowerCase();
        return ("vet".equals(s) || "veterinary_nurse".equals(s)) ? s : "vet";
    }

    private static Map<String, String> addrMap(Object raw) {
        Map<String, String> result = new LinkedHashMap<>();
        for (String k : List.of("line1", "line2", "city", "county", "postcode")) result.put(k, "");
        if (raw instanceof Map<?, ?> m) {
            for (String k : result.keySet()) {
                Object v = m.get(k);
                result.put(k, v == null ? "" : v.toString().trim());
            }
        }
        return result;
    }

    private static String str(Map<String, Object> m, String key) {
        Object v = m.get(key); return v == null ? "" : v.toString();
    }

    private static String nvl(Object v) { return v == null ? "" : v.toString(); }

    private static boolean boolVal(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean b) return b;
        if (v instanceof Number n) return n.intValue() != 0;
        return false;
    }

    private static ResponseEntity<Map<String, Object>> err(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("success", false, "message", message));
    }
}
