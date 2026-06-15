package uk.co.northernveterinaryservice.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import uk.co.northernveterinaryservice.config.AppProperties;
import uk.co.northernveterinaryservice.util.ServicesCatalog;

import java.util.*;

/**
 * User profile helpers — mirrors server/lib/profile.js and server/lib/user-mapper.js.
 */
@Service
public class ProfileService {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private AppProperties appProperties;

    /**
     * Loads a full user profile from the DB, joining addresses and service codes.
     *
     * @param userId  The user's PK
     * @param baseUrl The scheme+host of the current request (e.g. http://localhost:3000)
     * @return A map matching the client-side profile shape, or null if not found
     */
    public Map<String, Object> getProfileById(long userId, String baseUrl) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                SELECT u.*,
                       a.line1 AS addr_line1, a.line2 AS addr_line2, a.city AS addr_city,
                       a.county AS addr_county, a.postcode AS addr_postcode
                FROM users u
                LEFT JOIN addresses a ON a.user_id = u.id
                WHERE u.id = ? LIMIT 1
                """, userId);

        if (rows.isEmpty()) return null;
        Map<String, Object> row = rows.get(0);

        Map<String, Object> address = Map.of(
                "line1",    nvl(row.get("addr_line1")),
                "line2",    nvl(row.get("addr_line2")),
                "city",     nvl(row.get("addr_city")),
                "county",   nvl(row.get("addr_county")),
                "postcode", nvl(row.get("addr_postcode"))
        );

        List<Map<String, Object>> svcRows = jdbc.queryForList(
                "SELECT service_code FROM user_services WHERE user_id = ?", userId);
        List<String> codes = svcRows.stream()
                .map(r -> r.get("service_code").toString())
                .toList();

        return mapUserToClient(row, address, codes, baseUrl);
    }

    private Map<String, Object> mapUserToClient(
            Map<String, Object> row,
            Map<String, Object> address,
            List<String> serviceCodes,
            String baseUrl) {

        String email = nvl(row.get("email"));
        boolean isAdmin = boolVal(row.get("is_admin"));
        boolean isMaster = isAdmin && email.equalsIgnoreCase(appProperties.getMasterAdminEmail());

        String relPath = nvl(row.get("profile_photo_path"));
        if (!relPath.isEmpty() && !relPath.startsWith("/")) relPath = "/" + relPath;
        String photoUrl = relPath.isEmpty() ? null : (baseUrl + relPath).replaceAll("([^:]/)/+", "$1");

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id",                     String.valueOf(row.get("id")));
        profile.put("practiceName",            nvl(row.get("practice_name")));
        profile.put("email",                   email);
        profile.put("phone",                   nvl(row.get("phone")));
        profile.put("address",                 address);
        profile.put("role",                    nvl(row.get("role")));
        profile.put("accountType",             nvl(row.get("account_type")));
        profile.put("rcvsRegistrationNumber",  nvl(row.get("rcvs_registration_number")));
        profile.put("isAdmin",                 isAdmin);
        profile.put("isActive",                boolVal(row.get("is_active")));
        profile.put("isMasterAdmin",           isMaster);
        Object createdAt = row.get("created_at");
        profile.put("createdAt", createdAt != null ? createdAt.toString() : null);
        profile.put("servicesOffered",         serviceCodes);
        profile.put("profilePhotoUrl",         photoUrl);
        profile.put("profilePhotoDataUrl",     null);
        return profile;
    }

    /**
     * Replace all user_services rows for a team member.
     */
    public void setUserServices(long userId, List<String> serviceIds) {
        Set<String> allowed = ServicesCatalog.OFFERABLE_SERVICE_IDS_SET;
        List<String> filtered = serviceIds == null ? List.of()
                : serviceIds.stream().filter(allowed::contains).toList();

        jdbc.update("DELETE FROM user_services WHERE user_id = ?", userId);
        for (String code : filtered) {
            jdbc.update("INSERT INTO user_services (user_id, service_code) VALUES (?, ?)", userId, code);
        }
    }

    private static String nvl(Object v) {
        return v == null ? "" : v.toString();
    }

    private static boolean boolVal(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean b) return b;
        if (v instanceof Number n) return n.intValue() != 0;
        return false;
    }
}
