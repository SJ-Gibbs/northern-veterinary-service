package uk.co.northernveterinaryservice.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Applies sql/schema.sql on every startup (all statements use CREATE TABLE IF NOT EXISTS).
 * Mirrors the Node.js initDb() function from server/db.js.
 * Runs before any other ApplicationRunner (Order 1).
 */
@Component
@Order(1)
public class InitDbRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InitDbRunner.class);

    @Autowired
    private DataSource dataSource;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        Path schemaFile = Path.of("sql", "schema.sql");
        if (!Files.exists(schemaFile)) {
            log.warn("[db] sql/schema.sql not found — skipping schema init.");
            return;
        }
        String sql = readSchemaFile(schemaFile);
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute(sql);
            log.info("[db] Schema applied (all tables verified).");
        }
    }

    private String readSchemaFile(Path path) throws IOException {
        return Files.readString(path);
    }
}
