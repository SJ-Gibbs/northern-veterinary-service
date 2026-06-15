package uk.co.northernveterinaryservice.util;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.HexFormat;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Helpers for profile photo handling — mirrors the writeProfilePhotoFromDataUrl()
 * and safeUnlink helpers in the Node.js route files.
 */
public final class FileUtil {

    private FileUtil() {}

    private static final Pattern DATA_URL = Pattern.compile(
            "^data:(image/[a-z+.\\-]+);base64,(.+)$", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    /**
     * Writes a base64 data-URL image to disk under &lt;uploadsDir&gt;/profiles/.
     *
     * @return The relative web path (e.g. /uploads/profiles/123-abc.jpg),
     *         "CLEAR" if dataUrl is empty string or null (caller should clear the stored path),
     *         or null if the dataUrl is invalid (caller should return 400).
     * @throws IllegalArgumentException with message "Image too large" if > 2.5 MB
     */
    public static String writeProfilePhoto(String uploadsDir, long userId, String dataUrl) {
        if (dataUrl == null || dataUrl.isEmpty()) {
            return "CLEAR";
        }
        if (!dataUrl.startsWith("data:image/")) {
            return null;
        }
        Matcher m = DATA_URL.matcher(dataUrl);
        if (!m.matches()) return null;

        String mime = m.group(1);
        byte[] buf = Base64.getDecoder().decode(m.group(2).trim());

        if (buf.length > (long) (2.5 * 1024 * 1024)) {
            throw new IllegalArgumentException("Image too large");
        }

        String ext = mime.contains("png") ? "png" : mime.contains("webp") ? "webp" : "jpg";
        String rand = HexFormat.of().formatHex(randomBytes(6));
        String filename = userId + "-" + rand + "." + ext;
        String relPath = "/uploads/profiles/" + filename;

        Path destDir = Path.of(uploadsDir, "profiles");
        try {
            Files.createDirectories(destDir);
            Files.write(destDir.resolve(filename), buf);
        } catch (IOException e) {
            throw new RuntimeException("Failed to write profile photo", e);
        }

        return relPath;
    }

    /**
     * Deletes a stored profile photo from disk. Silently ignores missing files.
     *
     * @param uploadsDir Base uploads directory
     * @param storedPath The path as stored in the DB (e.g. /uploads/profiles/1-abc.jpg)
     */
    public static void safeDelete(String uploadsDir, String storedPath) {
        if (storedPath == null || storedPath.isBlank()) return;
        String rel = storedPath.startsWith("/") ? storedPath.substring(1) : storedPath;
        rel = rel.replaceFirst("^uploads/?", "");
        File f = new File(uploadsDir, rel);
        if (f.exists()) {
            f.delete();
        }
    }

    private static byte[] randomBytes(int n) {
        byte[] b = new byte[n];
        new java.util.Random().nextBytes(b);
        return b;
    }
}
