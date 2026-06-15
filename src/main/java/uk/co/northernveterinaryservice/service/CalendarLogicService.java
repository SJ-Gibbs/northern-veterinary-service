package uk.co.northernveterinaryservice.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Calendar availability logic — mirrors server/lib/calendar-logic.js.
 */
@Service
public class CalendarLogicService {

    /** Deterministic pseudo-random hash of an ISO date string (same algorithm as JS). */
    public int hashDateStr(String s) {
        int h = 0;
        for (int i = 0; i < s.length(); i++) {
            h = (31 * h + s.charAt(i));
        }
        return Math.abs(h);
    }

    public String getDemoAvailability(String iso) {
        LocalDate date = LocalDate.parse(iso);
        LocalDate today = LocalDate.now();

        if (date.isBefore(today)) return "unavailable";

        int dow = date.getDayOfWeek().getValue(); // 1=Mon, 7=Sun
        if (dow == 7) return "unavailable"; // Sunday
        if (dow == 6) return "limited";     // Saturday

        int h = hashDateStr(iso);
        if (h % 13 == 0) return "unavailable";
        if (h % 5 == 0)  return "limited";
        return "available";
    }

    public String resolveSiteStatus(String iso, Map<String, String> overrideMap) {
        String o = overrideMap == null ? null : overrideMap.get(iso);
        if ("available".equals(o) || "limited".equals(o) || "unavailable".equals(o)) {
            return o;
        }
        return getDemoAvailability(iso);
    }

    public String resolveStaffDay(String iso, String userId,
                                   Map<String, Map<String, String>> staffMap) {
        Map<String, String> dayMap = staffMap == null ? null : staffMap.get(userId);
        String st = dayMap == null ? null : dayMap.get(iso);
        if ("available".equals(st) || "limited".equals(st) || "unavailable".equals(st)) {
            return st;
        }
        return getDemoAvailability(iso);
    }

    /**
     * Compute the member-practice calendar status for a single day.
     *
     * @param iso            Date in YYYY-MM-DD format
     * @param siteOverrides  site_calendar_overrides rows (date -> status)
     * @param staffMap       staff_availability rows (userId -> date -> status)
     * @param teamMemberIds  IDs of active team members
     * @param bookingDates   Dates that have at least one booking request
     */
    public String getMemberPracticeCalendarStatus(
            String iso,
            Map<String, String> siteOverrides,
            Map<String, Map<String, String>> staffMap,
            List<String> teamMemberIds,
            Set<String> bookingDates) {

        String site = resolveSiteStatus(iso, siteOverrides);
        if ("unavailable".equals(site)) return "unavailable";

        if (teamMemberIds == null || teamMemberIds.isEmpty()) {
            return site;
        }

        long staffCount = teamMemberIds.stream()
                .map(tid -> resolveStaffDay(iso, tid, staffMap))
                .filter(s -> "available".equals(s) || "limited".equals(s))
                .count();

        if (staffCount == 0) return "unavailable";

        if (bookingDates != null && bookingDates.contains(iso)) return "limited";

        return "available";
    }
}
