package uk.co.northernveterinaryservice.util;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-memory per-IP rate limiter.
 * Mirrors the express-rate-limit middleware used in the Node.js server.
 */
@Component
public class RateLimiter {

    private record Window(long resetAt, AtomicInteger count) {}

    private final ConcurrentHashMap<String, Window> store = new ConcurrentHashMap<>();

    /**
     * Check whether the given key (typically "ruleName:ip") is within limits.
     *
     * @param key       Unique key (e.g. "login:192.168.1.1")
     * @param max       Maximum requests allowed in the window
     * @param windowMs  Window size in milliseconds
     * @return true if the request is allowed, false if rate-limited
     */
    public boolean allow(String key, int max, long windowMs) {
        long now = System.currentTimeMillis();
        Window w = store.compute(key, (k, existing) -> {
            if (existing == null || now > existing.resetAt()) {
                return new Window(now + windowMs, new AtomicInteger(0));
            }
            return existing;
        });
        int count = w.count().incrementAndGet();
        return count <= max;
    }

    /** Convenience: was the last recorded request a success?  Call to exempt successful logins. */
    public void decrement(String key) {
        Window w = store.get(key);
        if (w != null && System.currentTimeMillis() <= w.resetAt()) {
            w.count().decrementAndGet();
        }
    }
}
