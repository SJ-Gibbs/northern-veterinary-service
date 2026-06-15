package uk.co.northernveterinaryservice.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import uk.co.northernveterinaryservice.config.AppProperties;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.*;

/**
 * /api/bookings/** — mirrors server/routes/bookings.js
 */
@RestController
@RequestMapping("/api/bookings")
public class BookingsController {

    @Autowired private JdbcTemplate jdbc;
    @Autowired private AppProperties appProperties;

    // ── POST /api/bookings/ ───────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<Map<String, Object>> submit(
            @RequestParam(defaultValue = "") String servicerequired,
            @RequestParam(defaultValue = "") String locumRole,
            @RequestParam(defaultValue = "") String procedureNameIfKnown,
            @RequestParam(defaultValue = "") String History,
            @RequestParam(defaultValue = "") String preferredDate,
            @RequestParam(defaultValue = "") String preferredDates,
            @RequestParam(required = false)  MultipartFile file,
            HttpSession session) {

        Long userId = sessionUserId(session);
        if (userId == null) return err(401, "Not authenticated.");

        if (servicerequired.isBlank()) return err(400, "Service required.");
        if (History.isBlank() || History.length() < 10) return err(400, "Please provide more detail in history.");

        Set<String> uniqueDates = new LinkedHashSet<>();
        if (preferredDate.matches("\\d{4}-\\d{2}-\\d{2}")) uniqueDates.add(preferredDate);
        for (String s : preferredDates.split(",")) {
            String t = s.trim();
            if (t.matches("\\d{4}-\\d{2}-\\d{2}")) uniqueDates.add(t);
        }

        KeyHolder kh = new GeneratedKeyHolder();
        String svcFinal = servicerequired;
        String locFinal = locumRole.isBlank() ? null : locumRole;
        String procFinal = procedureNameIfKnown.isBlank() ? null : procedureNameIfKnown.trim();
        String histFinal = History;

        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO booking_requests (submitter_user_id, service_required, locum_role, procedure_name, history, status) VALUES (?,?,?,?,?,'new')",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, userId);
            ps.setString(2, svcFinal);
            ps.setString(3, locFinal);
            ps.setString(4, procFinal);
            ps.setString(5, histFinal);
            return ps;
        }, kh);
        long bookingId = kh.getKey().longValue();

        for (String d : uniqueDates) {
            jdbc.update("INSERT INTO booking_request_dates (booking_request_id, preferred_date) VALUES (?,?)",
                    bookingId, d);
        }

        if (file != null && !file.isEmpty()) {
            try {
                String origName = file.getOriginalFilename();
                String ext = (origName != null && origName.contains("."))
                        ? origName.substring(origName.lastIndexOf('.')) : ".bin";
                byte[] randBytes = new byte[8];
                new Random().nextBytes(randBytes);
                String rand = HexFormat.of().formatHex(randBytes);
                String storedName = bookingId + "-" + rand + ext;
                String relPath = "/uploads/bookings/" + storedName;

                Path dir = Path.of(appProperties.getUploadsDir(), "bookings");
                Files.createDirectories(dir);
                file.transferTo(dir.resolve(storedName).toFile());

                jdbc.update("INSERT INTO booking_attachments (booking_request_id, original_name, stored_name, mime_type, file_path) VALUES (?,?,?,?,?)",
                        bookingId,
                        origName != null ? origName : "upload",
                        storedName,
                        file.getContentType() != null ? file.getContentType() : "application/octet-stream",
                        relPath);
            } catch (IOException e) {
                // Booking is saved; attachment failure is non-fatal (log only)
            }
        }

        return ResponseEntity.ok(Map.of("success", true,
                "message", "Booking request submitted.", "id", String.valueOf(bookingId)));
    }

    // ── GET /api/bookings/inbox ───────────────────────────────────────────────

    @GetMapping("/inbox")
    public ResponseEntity<Map<String, Object>> inbox(HttpSession session) {
        Long userId = sessionUserId(session);
        if (userId == null) return err(401, "Not authenticated");

        boolean isMaster = boolVal(session.getAttribute("isMasterAdmin"));
        if (!isMaster) {
            List<Map<String, Object>> me = jdbc.queryForList(
                    "SELECT account_type FROM users WHERE id = ?", userId);
            if (me.isEmpty() || !"team_member".equals(me.get(0).get("account_type"))) {
                return err(403, "Access denied");
            }
        }

        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                SELECT br.id, br.submitted_at, br.service_required, br.locum_role,
                       br.procedure_name, br.history,
                       u.practice_name, u.email,
                       GROUP_CONCAT(brd.preferred_date ORDER BY brd.preferred_date SEPARATOR ',') AS dates
                FROM booking_requests br
                JOIN users u ON u.id = br.submitter_user_id
                LEFT JOIN booking_request_dates brd ON brd.booking_request_id = br.id
                GROUP BY br.id
                ORDER BY br.submitted_at DESC
                """);

        List<Map<String, Object>> list = rows.stream().map(r -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", String.valueOf(r.get("id")));
            item.put("submittedAt", r.get("submitted_at") != null
                    ? r.get("submitted_at").toString() : null);
            item.put("data", Map.of(
                    "practiceName",         nvl(r.get("practice_name")),
                    "email",                nvl(r.get("email")),
                    "servicerequired",      nvl(r.get("service_required")),
                    "locumRole",            nvl(r.get("locum_role")),
                    "procedureNameIfKnown", nvl(r.get("procedure_name")),
                    "preferredDate",        "",
                    "preferredDates",       nvl(r.get("dates")),
                    "History",              nvl(r.get("history"))
            ));
            return item;
        }).toList();

        return ResponseEntity.ok(Map.of("success", true, "requests", list));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static Long sessionUserId(HttpSession session) {
        Object v = session.getAttribute("userId");
        if (v == null) return null;
        return v instanceof Long l ? l : Long.parseLong(v.toString());
    }

    private static boolean boolVal(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean b) return b;
        if (v instanceof Number n) return n.intValue() != 0;
        return false;
    }

    private static String nvl(Object v) { return v == null ? "" : v.toString(); }

    private static ResponseEntity<Map<String, Object>> err(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("success", false, "message", message));
    }
}
