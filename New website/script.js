/* ═══════════════════════════════════════════════════════════
   SUZUKI MEHRAN — SCROLL SEQUENCE ENGINE
   Premium cinematic scrollytelling with canvas frame animation
   ═══════════════════════════════════════════════════════════ */

'use strict';

(function () {

    /* ─── Image Sequence Config ─────────────────────────────── */
    const FRAME_DIR    = 'New ones/';
    const TOTAL_FRAMES = 100; // actual frames we have

    // Build ordered frame list from the available files
    // Files: 002,003,...,082 (consecutive), then 084,086,...,120 (even only)
    const frameFiles = [];

    // 002 to 082 (consecutive)
    for (let i = 2; i <= 82; i++) {
        frameFiles.push(i.toString().padStart(3, '0') + '.png');
    }
    // 084 to 120 (even steps of 2)
    for (let i = 84; i <= 120; i += 2) {
        frameFiles.push(i.toString().padStart(3, '0') + '.png');
    }

    const NUM_FRAMES = frameFiles.length; // 81 + 19 = 100 frames

    /* ─── Scroll stage height: 6× viewport gives a ~600% scroll pin ─ */
    const SCROLL_MULTIPLIER = 6;

    /* ─── Scroll band definitions ───────────────────────────────────
       Each scene occupies a percentage band of the total scroll range.
    ─────────────────────────────────────────────────────────────── */
    const BANDS = [
        { id: 'scene-1', start: 0.00, end: 0.20, noFadeIn: true },
        { id: 'scene-2', start: 0.16, end: 0.44 },
        { id: 'scene-3', start: 0.40, end: 0.66 },
        { id: 'scene-4', start: 0.62, end: 0.86 },
        { id: 'scene-5', start: 0.83, end: 1.00, noFadeOut: true },
    ];

    /* ─── DOM refs ──────────────────────────────────────────────── */
    const canvas      = document.getElementById('hero-canvas');
    const ctx         = canvas.getContext('2d');
    const stage       = document.getElementById('scroll-stage');
    const navbar      = document.getElementById('navbar');
    const loader      = document.getElementById('loader');
    const loaderBar   = document.getElementById('loader-bar');
    const loaderPct   = document.getElementById('loader-pct');
    const hamburger   = document.getElementById('nav-hamburger');
    const mobileMenu  = document.getElementById('mobile-menu');
    const perfBar     = document.getElementById('perf-bar-fuel');

    /* ─── State ─────────────────────────────────────────────────── */
    let images        = [];
    let loadedCount   = 0;
    let currentFrame  = 0;
    let rafId         = null;
    let targetFrame   = 0;
    let isLoaded      = false;

    /* ─── Canvas Sizing ─────────────────────────────────────────── */
    function resizeCanvas() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        if (images[currentFrame]?.complete) {
            drawFrame(currentFrame);
        }
    }

    /* ─── Draw a single frame ───────────────────────────────────── */
    function drawFrame(index) {
        const img = images[index];
        if (!img || !img.complete || !img.naturalWidth) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cw = canvas.width;
        const ch = canvas.height;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        // "contain" with slight upscale to fill nicely
        const scale = Math.min(cw / iw, ch / ih) * 0.98;
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;

        ctx.drawImage(img, dx, dy, dw, dh);
    }

    /* ─── Smooth frame interpolation via rAF ────────────────────── */
    function animateToFrame() {
        const diff = targetFrame - currentFrame;
        if (Math.abs(diff) < 0.5) {
            currentFrame = targetFrame;
            drawFrame(Math.round(currentFrame));
            rafId = null;
            return;
        }
        currentFrame += diff * 0.18; // easing factor
        drawFrame(Math.round(currentFrame));
        rafId = requestAnimationFrame(animateToFrame);
    }

    function setTargetFrame(frame) {
        targetFrame = Math.max(0, Math.min(NUM_FRAMES - 1, frame));
        if (!rafId) {
            rafId = requestAnimationFrame(animateToFrame);
        }
    }

    /* ─── Compute scroll progress ───────────────────────────────── */
    function getScrollProgress() {
        const stageRect = stage.getBoundingClientRect();
        const stageH    = stage.offsetHeight;
        const viewH     = window.innerHeight;

        // Progress 0→1 as sticky section scrolls through
        const scrolled = -stageRect.top;
        const total    = stageH - viewH;
        return Math.max(0, Math.min(1, scrolled / total));
    }

    /* ─── Scene visibility ──────────────────────────────────────── */
    function updateScenes(progress) {
        BANDS.forEach(band => {
            const el = document.getElementById(band.id);
            if (!el) return;

            let opacity = 0;

            if (progress >= band.start && progress <= band.end) {
                const bandProgress = (progress - band.start) / (band.end - band.start);
                const FADE_IN  = band.noFadeIn  ? 0 : 0.10;
                const FADE_OUT = band.noFadeOut ? 1 : 0.90;

                if (bandProgress <= FADE_IN) {
                    opacity = FADE_IN === 0 ? 1 : bandProgress / FADE_IN;
                } else if (bandProgress >= FADE_OUT) {
                    opacity = FADE_OUT === 1 ? 1 : 1 - (bandProgress - FADE_OUT) / (1 - FADE_OUT);
                } else {
                    opacity = 1;
                }
                el.classList.add('active');
            } else {
                el.classList.remove('active');
                opacity = 0;
            }

            el.style.opacity = Math.max(0, Math.min(1, opacity));
        });
    }

    /* ─── Main scroll handler ───────────────────────────────────── */
    function onScroll() {
        const progress = getScrollProgress();

        // Frame index: 0 → NUM_FRAMES-1 over scroll progress
        const frameIndex = Math.round(progress * (NUM_FRAMES - 1));
        setTargetFrame(frameIndex);

        // Scene overlays
        updateScenes(progress);

        // Navbar
        const sy = window.scrollY;
        navbar.classList.toggle('scrolled', sy > 80);

        // Performance bar animation
        if (perfBar) {
            const perfSection = document.getElementById('performance');
            if (perfSection) {
                const pr = perfSection.getBoundingClientRect();
                if (pr.top < window.innerHeight * 0.8) {
                    perfBar.style.width = '92%';
                }
            }
        }
    }

    /* ─── Intersection observer for below-fold reveals ──────────── */
    function initRevealObserver() {
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        document.querySelectorAll('.reveal-section').forEach(el => {
            observer.observe(el);
        });
    }

    /* ─── Animated counters ─────────────────────────────────────── */
    function initCounters() {
        const cells = document.querySelectorAll('[data-target]');
        const counterObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el     = entry.target;
                const target = parseInt(el.dataset.target);
                const unit   = el.querySelector('.stat-unit')?.outerHTML || '';
                let start    = 0;
                const step   = target / 60;
                const tick   = () => {
                    start += step;
                    if (start >= target) {
                        el.innerHTML = target + unit;
                    } else {
                        el.innerHTML = Math.round(start) + unit;
                        requestAnimationFrame(tick);
                    }
                };
                requestAnimationFrame(tick);
                counterObserver.unobserve(el);
            });
        }, { threshold: 0.5 });

        cells.forEach(c => counterObserver.observe(c));
    }

    /* ─── Image preloading ──────────────────────────────────────── */
    function preloadImages(onComplete) {
        images = new Array(NUM_FRAMES);
        loadedCount = 0;

        frameFiles.forEach((filename, idx) => {
            const img = new Image();
            img.src = FRAME_DIR + filename;
            img.onload = img.onerror = () => {
                loadedCount++;
                const pct = Math.round((loadedCount / NUM_FRAMES) * 100);
                if (loaderBar) loaderBar.style.width = pct + '%';
                if (loaderPct) loaderPct.textContent = pct + '%';
                if (loadedCount === NUM_FRAMES) onComplete();
            };
            images[idx] = img;
        });
    }

    /* ─── Nav hamburger ─────────────────────────────────────────── */
    function initNav() {
        if (!hamburger || !mobileMenu) return;
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
        });
        // Close on link click
        mobileMenu.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => mobileMenu.classList.remove('open'));
        });
    }

    /* ─── Scroll stage height ───────────────────────────────────── */
    function setStageHeight() {
        stage.style.height = (window.innerHeight * SCROLL_MULTIPLIER) + 'px';
    }

    /* ─── Hero scene1 reveal-up elements ───────────────────────── */
    function revealHeroText() {
        document.querySelectorAll('.reveal-up').forEach(el => {
            el.classList.add('visible');
        });
    }

    /* ─── Init ──────────────────────────────────────────────────── */
    function init() {
        resizeCanvas();
        setStageHeight();
        initNav();

        // Set stage height on resize
        window.addEventListener('resize', () => {
            resizeCanvas();
            setStageHeight();
        }, { passive: true });

        // Load images then reveal
        preloadImages(() => {
            isLoaded = true;

            // Hide loader
            if (loader) {
                loader.classList.add('hidden');
            }

            // Show nav
            navbar.classList.add('visible');

            // Draw first frame
            drawFrame(0);

            // Animate hero text
            setTimeout(revealHeroText, 300);

            // Show scene-1 immediately at full opacity (user starts at top)
            const scene1 = document.getElementById('scene-1');
            if (scene1) {
                scene1.style.opacity = '1';
                scene1.classList.add('active');
            }

            // Listen for scroll
            window.addEventListener('scroll', onScroll, { passive: true });

            // Init below-fold features
            initRevealObserver();
            initCounters();

            // Trigger once in case user already scrolled
            onScroll();
        });
    }

    /* ─── Boot ──────────────────────────────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
