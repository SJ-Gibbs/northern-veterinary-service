package uk.co.northernveterinaryservice.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import uk.co.northernveterinaryservice.service.CalendarLogicService;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

/**
 * /api/calendar/** — mirrors server/routes/calendar.js
 */
@RestController
@RequestMapping("/api/calendar")
public class CalendarController {

    @Autowired private JdbcTemplate jdbc;
    @Autowired private CalendarLogicService calendarLogic;

    // ── GET /api/calendar/member-month ────────────────────────────────────────

    @GetMapping("/member-month")
    public ResponseEntity<Map<String, Object>> memberMonth(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            HttpSession session) {

        if (!isAuth(session)) return err(401, "Not authenticated.");
        if (year == null || month == null || month < 0 || month > 11) {
            return err(400, "year and month (0-11) required");
        }

        YearMonth ym = YearMonth.of(year, month + 1);
        String startIso = ym.atDay(1).toString();
        String endIso   = ym.atEndOfMonth().toString();

        // Site overrides
        List<Map<String, Object>> siteRows = jdbc.queryForList(
                "SELECT calendar_date, status FROM site_calendar_overrides WHERE calendar_date BETWEEN ? AND ?",
                startIso, endIso);
        Map<String, String> siteMap = new HashMap<>();
        siteRows.forEach(r -> siteMap.put(fmtDate(r.get("calendar_date")), nvl(r.get("status"))));

        // Active team members
        List<Map<String, Object>> teamRows = jdbc.queryForList(
                "SELECT id FROM users WHERE account_type = 'team_member' AND is_admin = 0 AND is_active = 1");
        List<String> teamIds = teamRows.stream().map(r -> String.valueOf(r.get("id"))).toList();

        // Staff availability
        Map<String, Map<String, String>> staffMap = new HashMap<>();
        if (!teamIds.isEmpty()) {
            String placeholders = String.join(",", Collections.nCopies(teamIds.size(), "?"));
            Object[] params = buildStaffParams(startIso, endIso, teamIds);
            List<Map<String, Object>> stRows = jdbc.queryForList(
                    "SELECT user_id, avail_date, status FROM staff_availability " +
                    "WHERE avail_date BETWEEN ? AND ? AND user_id IN (" + placeholders + ")", params);
            stRows.forEach(r -> {
                String uid = String.valueOf(r.get("user_id"));
                staffMap.computeIfAbsent(uid, k -> new HashMap<>())
                        .put(fmtDate(r.get("avail_date")), nvl(r.get("status")));
            });
        }

        // Dates with booking requests
        List<Map<String, Object>> bookDates = jdbc.queryForList(
                "SELECT DISTINCT preferred_date FROM booking_request_dates WHERE preferred_date BETWEEN ? AND ?",
                startIso, endIso);
        Set<String> bookSet = new HashSet<>();
        bookDates.forEach(r -> bookSet.add(fmtDate(r.get("preferred_date"))));

        Map<String, String> days = new LinkedHashMap<>();
        for (int d = 1; d <= ym.lengthOfMonth(); d++) {
            String iso = LocalDate.of(year, month + 1, d).toString();
            days.put(iso, calendarLogic.getMemberPracticeCalendarStatus(
                    iso, siteMap, staffMap, teamIds, bookSet));
        }

        return ResponseEntity.ok(Map.of("success", true, "year", year, "month", month, "days", days));
    }

    // ── GET /api/calendar/site-overrides ─────────────────────────────────────

    @GetMapping("/site-overrides")
    public ResponseEntity<Map<String, Object>> getSiteOverrides(HttpSession session) {
        if (!isAuth(session)) return err(401, "Not authenticated.");
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT calendar_date, status FROM site_calendar_overrides ORDER BY calendar_date");
        Map<String, String> overrides = new LinkedHashMap<>();
        rows.forEach(r -> overrides.put(fmtDate(r.get("calendar_date")), nvl(r.get("status"))));
        return ResponseEntity.ok(Map.of("success", true, "overrides", overrides));
    }

    // ── PUT /api/calendar/site-overrides/:iso ─────────────────────────────────

    @PutMapping("/site-overrides/{iso}")
    public ResponseEntity<Map<String, Object>> setSiteOverride(
            @PathVariable String iso,
            @RequestBody Map<String, Object> body,
            HttpSession session) {

        if (!isAuth(session)) return err(401, "Not authenticated.");
        if (!isMasterAdmin(session)) return err(403, "Master admin only.");
        if (!iso.matches("\\d{4}-\\d{2}-\\d{2}")) return err(400, "Invalid date");

        String status = body.get("status") == null ? null : body.get("status").toString();
        if ("clear".equals(status) || status == null) {
            jdbc.update("DELETE FROM site_calendar_overrides WHERE calendar_date = ?", iso);
            return ResponseEntity.ok(Map.of("success", true));
        }
        if (!Set.of("available", "limited", "unavailable").contains(status)) {
            return err(400, "Invalid status");
        }
        jdbc.update(
                "INSERT INTO site_calendar_overrides (calendar_date, status) VALUES (?,?) ON DUPLICATE KEY UPDATE status = VALUES(status)",
                iso, status);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ── GET /api/calendar/staff/:userId ──────────────────────────────────────

    @GetMapping("/staff/{userId}")
    public ResponseEntity<Map<String, Object>> getStaff(
            @PathVariable long userId,
            HttpSession session) {

        if (!isAuth(session)) return err(401, "Not authenticated.");
        Long sessionId = sessionUserId(session);
        if (sessionId == null || (sessionId != userId && !isMasterAdmin(session))) {
            return err(403, "Access denied");
        }

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT avail_date, status FROM staff_availability WHERE user_id = ?", userId);
        Map<String, String> overrides = new LinkedHashMap<>();
        rows.forEach(r -> overrides.put(fmtDate(r.get("avail_date")), nvl(r.get("status"))));
        return ResponseEntity.ok(Map.of("success", true, "userId", String.valueOf(userId), "overrides", overrides));
    }

    // ── PUT /api/calendar/staff/:userId/:iso ──────────────────────────────────

    @PutMapping("/staff/{userId}/{iso}")
    public ResponseEntity<Map<String, Object>> setStaffDay(
            @PathVariable long userId,
            @PathVariable String iso,
            @RequestBody Map<String, Object> body,
            HttpSession session) {

        if (!isAuth(session)) return err(401, "Not authenticated.");
        Long sessionId = sessionUserId(session);
        if (sessionId == null || (sessionId != userId && !isMasterAdmin(session))) {
            return err(403, "Access denied");
        }
        if (!iso.matches("\\d{4}-\\d{2}-\\d{2}")) return err(400, "Invalid date");

        String status = body.get("status") == null ? null : body.get("status").toString();
        if ("clear".equals(status) || status == null) {
            jdbc.update("DELETE FROM staff_availability WHERE user_id = ? AND avail_date = ?", userId, iso);
            return ResponseEntity.ok(Map.of("success", true));
        }
        if (!Set.of("available", "limited", "unavailable").contains(status)) {
            return err(400, "Invalid status");
        }
        jdbc.update(
                "INSERT INTO staff_availability (user_id, avail_date, status) VALUES (?,?,?) ON DUPLICATE KEY UPDATE status = VALUES(status)",
                userId, iso, status);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static boolean isAuth(HttpSession session) {
        return session.getAttribute("userId") != null;
    }

    private static boolean isMasterAdmin(HttpSession session) {
        return boolVal(session.getAttribute("isMasterAdmin"));
    }

    private static Long sessionUserId(HttpSession session) {
        Object v = session.getAttribute("userId");
        if (v == null) return null;
        return v instanceof Long l ? l : Long.parseLong(v.toString());
    }

    private static String fmtDate(Object d) {
        if (d == null) return "";
        String s = d.toString();
        return s.length() >= 10 ? s.substring(0, 10) : s;
    }

    private static String nvl(Object v) { return v == null ? "" : v.toString(); }

    private static boolean boolVal(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean b) return b;
        if (v instanceof Number n) return n.intValue() != 0;
        return false;
    }

    private static Object[] buildStaffParams(String start, String end, List<String> ids) {
        Object[] p = new Object[2 + ids.size()];
        p[0] = start; p[1] = end;
        for (int i = 0; i < ids.size(); i++) p[2 + i] = Long.parseLong(ids.get(i));
        return p;
    }

    private static ResponseEntity<Map<String, Object>> err(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("success", false, "message", message));
    }
}
