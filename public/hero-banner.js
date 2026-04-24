/**
 * Alternates hero banner between surgeon photos and ultrasound photos (same layout).
 * Respects prefers-reduced-motion (surgeon pair only, no timer).
 */
(function () {
    var strip = document.querySelector('[data-hero-banner-cycle]');
    if (!strip) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    var intervalMs = 8000;
    setInterval(function () {
        strip.classList.toggle('hero-banner-cycle--ultrasound');
    }, intervalMs);
})();
