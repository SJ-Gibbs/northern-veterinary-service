package uk.co.northernveterinaryservice.util;

/**
 * Input validation helpers — mirrors server/lib/validators.js.
 */
public final class Validators {

    private Validators() {}

    public static boolean isValidEmail(String email) {
        if (email == null) return false;
        return email.trim().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }

    public record ValidationResult(boolean ok, String message, String value) {
        public static ValidationResult ok(String value) {
            return new ValidationResult(true, null, value);
        }
        public static ValidationResult fail(String message, String value) {
            return new ValidationResult(false, message, value);
        }
    }

    public static ValidationResult validateRcvsRegistrationNumber(Object raw) {
        String s = raw == null ? "" : raw.toString().trim();
        if (s.isEmpty()) {
            return ValidationResult.fail("RCVS registration number is required.", "");
        }
        if (s.length() < 3 || s.length() > 32) {
            return ValidationResult.fail("Enter a valid RCVS registration number.", s);
        }
        return ValidationResult.ok(s);
    }

    public static ValidationResult validatePhoneNumber(Object raw) {
        String s = raw == null ? "" : raw.toString().trim();
        if (s.isEmpty()) {
            return ValidationResult.fail("Phone number is required.", s);
        }
        String digits = s.replaceAll("\\D", "");
        if (digits.length() < 8) {
            return ValidationResult.fail("Enter a valid phone number (at least 8 digits).", s);
        }
        return ValidationResult.ok(s);
    }

    public static String normalizeRole(String role) {
        if (role == null) return "";
        String n = role.trim().toLowerCase();
        if ("nurse".equals(n)) return "veterinary_nurse";
        return n;
    }
}
