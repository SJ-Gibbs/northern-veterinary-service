package uk.co.northernveterinaryservice.seed;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import uk.co.northernveterinaryservice.config.AppProperties;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

/**
 * Creates the master admin user if SEED_ADMIN_PASSWORD is set and the
 * user does not already exist.  Mirrors the behaviour of server/seed.js.
 *
 * Usage: set SEED_ADMIN_PASSWORD=YourSecurePass then start the application.
 * The seed runs once on startup; subsequent startups are safe (no duplicates).
 */
@Component
@Order(2)
public class SeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedRunner.class);

    @Autowired private JdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AppProperties appProperties;

    @Override
    public void run(ApplicationArguments args) {
        String password = System.getenv("SEED_ADMIN_PASSWORD");
        if (password == null || password.isBlank()) return;

        String email = appProperties.getMasterAdminEmail();
        String name  = "Northern Veterinary Service Master Admin";

        List<Map<String, Object>> ex = jdbc.queryForList(
                "SELECT id FROM users WHERE LOWER(email) = LOWER(?)", email);
        if (!ex.isEmpty()) {
            log.info("[seed] Master admin already exists: {}", email);
            return;
        }

        String hash = passwordEncoder.encode(password);
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO users (email, password_hash, practice_name, account_type, role, phone, rcvs_registration_number, is_admin, is_active) VALUES (?,?,?,'admin','admin','','',1,1)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, email);
            ps.setString(2, hash);
            ps.setString(3, name);
            return ps;
        }, kh);
        long newId = kh.getKey().longValue();

        jdbc.update("INSERT INTO addresses (user_id, line1, line2, city, county, postcode) VALUES (?,?,?,?,?,?)",
                newId, "", "", "", "", "");

        log.info("[seed] Created master admin: {}", email);
        log.warn("[seed] Change SEED_ADMIN_PASSWORD and update the password after first login.");
    }
}
