/**
 * 21st.dev Component Enhancements — Slush Interactive Story Engine
 * 
 * Features:
 * 1. 3D Perspective Tilt Physics with Spring Reset
 * 2. Radial Cursor Spotlight Glare
 * 3. Physics-Driven Canvas Confetti Explosion
 * 4. Ambient Cyber Sparks / Particle Backdrop
 * 5. Web Audio API Zero-Dependency SFX Synthesizer
 * 6. Sound Toggle Pill Widget
 * 7. Dynamic DOM Mutation Observer for Live Cards & Choices
 */

(function () {
    'use strict';

    // ── Global Namespace ──────────────────────────────────────────────────────
    window.Slush21st = window.Slush21st || {};

    // Sound effects completely disabled per user preference
    function playSfx() { }
    window.play21stSfx = playSfx;
    window.Slush21st.playSfx = playSfx;

    // Clean up any old FX widget if present
    const oldWidget = document.getElementById('slushSoundWidget');
    if (oldWidget) oldWidget.remove();

    // ── Ambient Cyber Sparks & Stars Backdrop Canvas (Removed per user request) ──
    function initAmbientCanvas() {
        const canvas = document.getElementById('canvasBackdrop21st');
        if (canvas) canvas.remove();
    }

    // ── Confetti Particle Celebration Cannon ─────────────────────────────────
    let confettiCanvas = null;
    let confettiCtx = null;
    let confettiParticles = [];
    let confettiAnimId = null;

    function getConfettiContext() {
        if (!confettiCanvas) {
            confettiCanvas = document.getElementById('canvasConfetti21st');
            if (!confettiCanvas) {
                confettiCanvas = document.createElement('canvas');
                confettiCanvas.id = 'canvasConfetti21st';
                document.body.appendChild(confettiCanvas);
            }
            confettiCanvas.width = window.innerWidth;
            confettiCanvas.height = window.innerHeight;
            confettiCtx = confettiCanvas.getContext('2d');

            window.addEventListener('resize', () => {
                if (confettiCanvas) {
                    confettiCanvas.width = window.innerWidth;
                    confettiCanvas.height = window.innerHeight;
                }
            });
        }
        return confettiCtx;
    }

    function triggerConfetti(originX, originY) {
        const ctx = getConfettiContext();
        if (!ctx) return;

        const startX = originX !== undefined ? originX : window.innerWidth / 2;
        const startY = originY !== undefined ? originY : window.innerHeight * 0.45;

        const colors = ['#ffd731', '#ff5964', '#5c4ade', '#35a7ff', '#38b000', '#f72585', '#ffffff'];
        const total = 90;

        for (let i = 0; i < total; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 14 + 6;
            confettiParticles.push({
                x: startX,
                y: startY,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity - 4,
                size: Math.random() * 10 + 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 16,
                wobble: Math.random() * 10,
                wobbleSpeed: Math.random() * 0.12 + 0.05,
                gravity: 0.38,
                drag: 0.94,
                alpha: 1,
                life: Math.random() * 40 + 70
            });
        }

        if (!confettiAnimId) {
            runConfettiLoop();
        }
    }

    function runConfettiLoop() {
        if (!confettiCtx || !confettiCanvas) return;

        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

        for (let i = confettiParticles.length - 1; i >= 0; i--) {
            const p = confettiParticles[i];
            p.vx *= p.drag;
            p.vy = p.vy * p.drag + p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotSpeed;
            p.wobble += p.wobbleSpeed;
            p.life--;

            if (p.life < 25) {
                p.alpha = Math.max(0, p.life / 25);
            }

            confettiCtx.save();
            confettiCtx.translate(p.x, p.y);
            confettiCtx.rotate((p.rotation * Math.PI) / 180);
            confettiCtx.scale(Math.sin(p.wobble), 1);
            confettiCtx.fillStyle = p.color;
            confettiCtx.globalAlpha = p.alpha;
            confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
            confettiCtx.restore();

            if (p.life <= 0 || p.y > confettiCanvas.height + 40) {
                confettiParticles.splice(i, 1);
            }
        }

        if (confettiParticles.length > 0) {
            confettiAnimId = requestAnimationFrame(runConfettiLoop);
        } else {
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            confettiAnimId = null;
        }
    }

    window.trigger21stConfetti = triggerConfetti;
    window.Slush21st.triggerConfetti = triggerConfetti;

    // ── 3D Perspective Tilt & Spotlight Glare Engine ──────────────────────────
    function attachTiltAndSpotlight(element) {
        if (element._has21stTilt) return;
        element._has21stTilt = true;

        element.classList.add('tilt-card-3d', 'spotlight-card');

        let isHovered = false;

        function onMouseMove(e) {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Compute 3D tilt angles
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = -((y - centerY) / centerY) * 7.5;
            const rotateY = ((x - centerX) / centerX) * 7.5;

            element.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translate3d(0, -4px, 0)`;
        }

        function onMouseEnter() {
            isHovered = true;
            element.style.transition = 'transform 0.08s ease-out, box-shadow 0.2s ease';
        }

        function onMouseLeave() {
            isHovered = false;
            element.style.transition = 'transform 0.45s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.3s ease';
            element.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)';
        }

        element.addEventListener('mousemove', onMouseMove);
        element.addEventListener('mouseenter', onMouseEnter);
        element.addEventListener('mouseleave', onMouseLeave);
    }

    // ── Choice Button Shimmer ────────────────────────────────────────────────
    function attachChoiceEnhancements(btn) {
        if (btn._has21stChoice) return;
        btn._has21stChoice = true;

        btn.classList.add('shimmer-btn-21st');
    }

    // ── 21st.dev Interactive Polaroid Line Carousel Engine ─────────────────
    function initPolaroidCarousel() {
        const root = document.getElementById("polaroidLineCarousel");
        if (!root || root._hasPolaroidLine) return;
        root._hasPolaroidLine = true;

        const pathEl = document.getElementById("plStringPath");
        const trackEl = document.getElementById("plCardsTrack");
        const captionTitle = document.getElementById("plActiveTitle");
        const captionSub = document.getElementById("plActiveSub");
        const countActive = document.getElementById("plActiveNum");
        const countTotal = document.getElementById("plTotalNum");
        const prevBtn = document.getElementById("plPrevBtn");
        const nextBtn = document.getElementById("plNextBtn");

        const slides = [
            {
                title: "THE LOST KINGDOM",
                caption: "A fantasy branching adventure where your decisions determine the fate of an ancient realm.",
                image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80"
            },
            {
                title: "NEON REBELLION 2099",
                caption: "Navigate a futuristic metropolis as a rogue hacker infiltrating corporate mainframe systems.",
                image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80"
            },
            {
                title: "SHADOWS OF ELDORIA",
                caption: "Uncover secrets hidden in dark forests where every choice triggers unforeseen consequences.",
                image: "https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=800&q=80"
            },
            {
                title: "COLD BONE MINE",
                caption: "Four friends are trapped in a freezing mine shaft hunted by a skinless blind stalker.",
                image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=800&q=80"
            },
            {
                title: "THE CRIMSON VOW",
                caption: "Your family's debts are paid the day you marry Julian Ashgrove — a man the village won't speak of.",
                image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80"
            },
            {
                title: "THE THING IN THE ATTIC",
                caption: "Something in the attic of the Whitfield house is scratching. Slow. Steady. Patient.",
                image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80"
            }
        ];

        const n = slides.length;
        if (countTotal) countTotal.textContent = String(n).padStart(2, '0');

        if (trackEl) {
            trackEl.innerHTML = slides.map((s, i) => `
                <div class="pl-card" data-i="${i}" data-on="${i === 0 ? '1' : '0'}">
                    <div class="pl-print">
                        <div class="pl-shot">
                            <img src="${s.image}" alt="${s.title}" draggable="false" />
                        </div>
                        <div class="pl-note">${s.title}</div>
                    </div>
                    <div class="pl-peg"></div>
                </div>
            `).join('');
        }

        const cards = Array.from(root.querySelectorAll('.pl-card'));

        let active = 0;
        let cardWidth = 270;
        let sag = 48;
        let swing = 1;
        let size = { w: root.clientWidth || 1200, h: root.clientHeight || 580, cw: cardWidth };
        let sim = { off: 0, vel: 0, target: 0, a: new Array(n).fill(0), w: new Array(n).fill(0) };
        let drag = null;
        let lastTouch = performance.now();

        function updateSize() {
            const r = root.getBoundingClientRect();
            const cw = Math.round(Math.max(160, Math.min(280, r.width * 0.36, r.height * 0.52)));
            size = { w: r.width, h: r.height, cw };
            root.style.setProperty('--pl-cw', cw + 'px');
        }
        updateSize();
        window.addEventListener('resize', updateSize);

        function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
        function stringY(x, w, y0, s) {
            const t = clamp(x / w, 0, 1);
            return y0 + 4 * s * t * (1 - t);
        }
        function springStep(x, v, target, dt, k = 70) {
            const c = 2 * Math.sqrt(k);
            const nv = v + (k * (target - x) - c * v) * dt;
            return [x + nv * dt, nv];
        }
        function swingStep(a, w, lineVel, dt, gain) {
            const nw = w + (-38 * a - 4.2 * w + lineVel * 0.0034 * gain) * dt;
            return [clamp(a + nw * dt, -0.6, 0.6), nw];
        }
        function nearestAt(off, sp, count) {
            return clamp(Math.round(off / sp), 0, Math.max(0, count - 1));
        }

        function goTo(i) {
            const sp = size.cw * 1.08;
            sim.target = clamp(i, 0, n - 1) * sp;
        }

        function step(dir) {
            lastTouch = performance.now();
            goTo(active + dir);
        }

        prevBtn?.addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
        nextBtn?.addEventListener('click', (e) => { e.stopPropagation(); step(1); });

        // Pointer drag interaction
        root.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.pl-bar') || e.target.closest('button') || e.target.closest('a')) return;
            lastTouch = performance.now();
            drag = { x: e.clientX, off: sim.off, lx: e.clientX, lt: e.timeStamp, v: 0, moved: false };
        });

        window.addEventListener('pointermove', (e) => {
            if (!drag) return;
            const dx = e.clientX - drag.x;
            if (!drag.moved && Math.abs(dx) > 5) {
                drag.moved = true;
                root.setAttribute('data-drag', '1');
                root.setPointerCapture?.(e.pointerId);
            }
            if (!drag.moved) return;
            const dt = Math.max(1, e.timeStamp - drag.lt);
            drag.v = 0.7 * ((e.clientX - drag.lx) / dt) + 0.3 * drag.v;
            drag.lx = e.clientX;
            drag.lt = e.timeStamp;
            const sp = size.cw * 1.08;
            const max = (n - 1) * sp;
            let off = drag.off - dx;
            if (off < 0) off *= 0.35;
            if (off > max) off = max + (off - max) * 0.35;
            sim.off = off;
        });

        window.addEventListener('pointerup', (e) => {
            if (!drag) return;
            const d = drag;
            drag = null;
            lastTouch = performance.now();
            root.removeAttribute('data-drag');
            const sp = size.cw * 1.08;
            if (d.moved) {
                sim.vel = -d.v * 1000;
                goTo(nearestAt(sim.off - d.v * 180, sp, n));
                return;
            }
            const card = e.target.closest('[data-i]');
            if (card) {
                goTo(Number(card.getAttribute('data-i')));
            }
        });

        root.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
            else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
        });

        // Autoplay
        setInterval(() => {
            if (document.hidden || drag || performance.now() - lastTouch < 4500) return;
            goTo(active >= n - 1 ? 0 : active + 1);
        }, 4500);

        // Frame simulation
        let prev = performance.now();
        function loop(now) {
            const dt = Math.min(0.033, (now - prev) / 1000);
            prev = now;

            const { w, h, cw } = size;
            const y0 = Math.max(40, h * 0.18);
            const sp = cw * 1.08;

            let lineVel;
            if (drag && drag.moved) {
                lineVel = drag.v * 1000;
            } else {
                const before = sim.off;
                [sim.off, sim.vel] = springStep(sim.off, sim.vel, sim.target, dt);
                lineVel = -(sim.off - before) / Math.max(dt, 1e-3);
            }

            const near = nearestAt(sim.off, sp, n);

            for (let i = 0; i < n; i++) {
                const el = cards[i];
                if (!el) continue;
                const x = w / 2 + i * sp - sim.off;
                if (x < -cw * 1.5 || x > w + cw * 1.5) {
                    el.style.visibility = 'hidden';
                    continue;
                }
                el.style.visibility = 'visible';
                let a = sim.a[i] || 0;
                let av = sim.w[i] || 0;
                [a, av] = swingStep(a, av, lineVel, dt, swing);
                if (swing) a += Math.sin(now / 1300 + i * 1.7) * 0.001 * swing;
                sim.a[i] = a;
                sim.w[i] = av;

                const y = stringY(x, w, y0, sag) - 6;
                el.style.transform = `translate(${(x - cw / 2).toFixed(1)}px, ${y.toFixed(1)}px) rotate(${a.toFixed(4)}rad)`;
                el.style.zIndex = String(i === near ? n + 1 : n - Math.abs(i - near));
                el.setAttribute('data-on', i === near ? '1' : '0');
            }

            pathEl?.setAttribute('d', `M0 ${y0} Q${w / 2} ${y0 + 2 * sag} ${w} ${y0}`);

            if (near !== active) {
                active = near;
                const s = slides[active];
                if (s) {
                    if (captionTitle) captionTitle.textContent = s.title;
                    if (captionSub) captionSub.textContent = s.caption;
                    if (countActive) countActive.textContent = String(active + 1).padStart(2, '0');
                }
            }

            requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
    }

    // ── 21st.dev Interactive Stacking Cards Engine ──────────────────────────
    function initStackingCards() {
        const container = document.getElementById('stackingCardsContainer');
        if (!container || container._hasStacking) return;
        container._hasStacking = true;

        const cards = Array.from(container.querySelectorAll('.stacking-card-item'));
        if (!cards.length) return;

        const total = cards.length;

        function updateStacking() {
            cards.forEach((card, i) => {
                const rect = card.getBoundingClientRect();
                const topThreshold = 90 + i * 28;

                if (rect.top <= topThreshold + 4) {
                    const nextCard = cards[i + 1];
                    if (nextCard) {
                        const nextRect = nextCard.getBoundingClientRect();
                        const distance = nextRect.top - topThreshold;
                        const progress = Math.min(1, Math.max(0, 1 - distance / (window.innerHeight * 0.65)));
                        const targetScale = 1 - (total - i) * 0.045;
                        const currentScale = 1 - progress * (1 - targetScale);
                        const currentBrightness = 1 - progress * 0.07;
                        card.style.transform = `scale(${currentScale.toFixed(3)})`;
                        card.style.filter = `brightness(${currentBrightness.toFixed(2)})`;
                    }
                } else {
                    card.style.transform = 'scale(1)';
                    card.style.filter = 'brightness(1)';
                }
            });
        }

        window.addEventListener('scroll', updateStacking, { passive: true });
        window.addEventListener('resize', updateStacking, { passive: true });
        updateStacking();
    }

    // ── 18. 21st.dev Dynamic Interactive 3D Tilt Holographic Story Cards ─────
    function initDynamicStoryCards() {
        const cards = document.querySelectorAll('.dynamic-story-card');
        cards.forEach(card => {
            if (card._hasDynamicTilt) return;
            card._hasDynamicTilt = true;

            let isHovered = false;
            let bounds = null;

            function onMouseEnter() {
                isHovered = true;
                bounds = card.getBoundingClientRect();
                card.classList.add('is-hovering');
            }

            function onMouseMove(e) {
                if (!isHovered) return;
                if (!bounds) bounds = card.getBoundingClientRect();
                const mouseX = e.clientX - bounds.left;
                const mouseY = e.clientY - bounds.top;
                const xPct = (mouseX / bounds.width) - 0.5;
                const yPct = (mouseY / bounds.height) - 0.5;

                // 3D tilt calculation
                const rotateX = (-yPct * 13).toFixed(2);
                const rotateY = (xPct * 13).toFixed(2);

                card.style.setProperty('--card-rotate-x', `${rotateX}deg`);
                card.style.setProperty('--card-rotate-y', `${rotateY}deg`);
                card.style.setProperty('--mouse-x', `${mouseX.toFixed(1)}px`);
                card.style.setProperty('--mouse-y', `${mouseY.toFixed(1)}px`);

                // Dynamic reactive drop shadow
                const shadowX = (xPct * -10).toFixed(1);
                const shadowY = (yPct * -10 + 8).toFixed(1);
                card.style.setProperty('--shadow-dynamic', `${shadowX}px ${shadowY}px 0px #000000`);
            }

            function onMouseLeave() {
                isHovered = false;
                card.classList.remove('is-hovering');
                card.style.setProperty('--card-rotate-x', '0deg');
                card.style.setProperty('--card-rotate-y', '0deg');
                card.style.setProperty('--shadow-dynamic', '6px 6px 0px #000000');
            }

            card.addEventListener('mouseenter', onMouseEnter);
            card.addEventListener('mousemove', onMouseMove);
            card.addEventListener('mouseleave', onMouseLeave);
        });
    }
    window.initDynamicStoryCards = initDynamicStoryCards;

    // ── Scan & Attach to DOM Elements ─────────────────────────────────────────
    function scanAndEnhance() {
        initDynamicStoryCards();
        const cards = document.querySelectorAll('.story-card:not([data-slush-enhanced]), .story-detail-card:not([data-slush-enhanced]), .trophy-stats-banner:not([data-slush-enhanced]), .ending-card:not([data-slush-enhanced])');
        cards.forEach(card => {
            card.setAttribute('data-slush-enhanced', 'true');
            attachTiltAndSpotlight(card);
        });

        const choices = document.querySelectorAll('.choice-btn-slush:not([data-slush-btn]), .primary-btn:not([data-slush-btn]), #readerChoices button:not([data-slush-btn]), .tab-pill:not([data-slush-btn])');
        choices.forEach(btn => {
            btn.setAttribute('data-slush-btn', 'true');
            attachChoiceEnhancements(btn);
        });
    }

    // ── 21st.dev Skiper49 3D Swiper Coverflow Carousel ───────────────────────
    function initSkiper49Swiper() {
        if (typeof Swiper === 'undefined') {
            setTimeout(initSkiper49Swiper, 150);
            return;
        }
        const el = document.getElementById('skiper49Swiper');
        if (!el || el.swiper) return;

        new Swiper(el, {
            effect: 'coverflow',
            grabCursor: true,
            centeredSlides: true,
            slidesPerView: 'auto',
            initialSlide: 1,
            slideToClickedSlide: true,
            loop: false,
            speed: 500,
            coverflowEffect: {
                rotate: 35,
                stretch: 0,
                depth: 120,
                modifier: 1,
                slideShadows: true,
            },
            pagination: {
                el: el.querySelector('.swiper-pagination') || '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '#skiper49Next',
                prevEl: '#skiper49Prev',
            }
        });
    }
    window.initSkiper49Swiper = initSkiper49Swiper;

    // ── 16. 21st.dev Circular Testimonials (3D Rotating Stage) ───────────────
    const fallbackReviews = [
        {
            quote: "The choices genuinely feel meaningful! Replaying stories to unlock every ending is super fun. Hands down the most engaging interactive fiction experience.",
            name: "Alex Rivera",
            designation: "Avid Reader",
            src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop"
        },
        {
            quote: "The Neo-brutalist Slush theme UI is gorgeous! Smooth transitions, crisp decision paths, and the DAG graph visualization keeps me hooked for hours.",
            name: "Sophia Chen",
            designation: "Story Explorer",
            src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop"
        },
        {
            quote: "The time-warp retreat feature saved my playthrough! I could test daring branching choices without losing all my campaign XP progress.",
            name: "Marcus Vance",
            designation: "RPG Enthusiast",
            src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop"
        }
    ];

    let circularReviewsData = [...fallbackReviews];

    let currentReviewIdx = 0;
    let reviewAutoplayTimer = null;

    function calculateCircularGap(width) {
        if (width <= 480) return 22;
        if (width <= 768) return 36;
        const minWidth = 1024;
        const maxWidth = 1456;
        const minGap = 55;
        const maxGap = 82;
        if (width <= minWidth) return minGap;
        if (width >= maxWidth) return Math.max(minGap, maxGap + 0.06018 * (width - maxWidth));
        return minGap + (maxGap - minGap) * ((width - minWidth) / (maxWidth - minWidth));
    }

    function renderCircularTestimonial(idx) {
        const stage = document.getElementById('circularImgStage');
        const quoteEl = document.getElementById('circularQuoteText');
        const nameEl = document.getElementById('circularName');
        const desigEl = document.getElementById('circularDesignation');
        const dotsContainer = document.getElementById('circularDots');
        if (!stage) return;

        currentReviewIdx = (idx + circularReviewsData.length) % circularReviewsData.length;
        const total = circularReviewsData.length;
        const width = stage.offsetWidth || 400;
        const gap = calculateCircularGap(width);
        const maxStickUp = gap * 0.8;

        const images = stage.querySelectorAll('.circular-testi-img');
        images.forEach((img, index) => {
            const isActive = index === currentReviewIdx;
            const isLeft = (currentReviewIdx - 1 + total) % total === index;
            const isRight = (currentReviewIdx + 1) % total === index;

            if (isActive) {
                img.style.zIndex = '3';
                img.style.opacity = '1';
                img.style.pointerEvents = 'auto';
                img.style.transform = 'translateX(0px) translateY(0px) scale(1) rotateY(0deg)';
            } else if (isLeft) {
                img.style.zIndex = '2';
                img.style.opacity = '1';
                img.style.pointerEvents = 'auto';
                img.style.transform = `translateX(-${gap}px) translateY(-${maxStickUp}px) scale(0.85) rotateY(15deg)`;
            } else if (isRight) {
                img.style.zIndex = '2';
                img.style.opacity = '1';
                img.style.pointerEvents = 'auto';
                img.style.transform = `translateX(${gap}px) translateY(-${maxStickUp}px) scale(0.85) rotateY(-15deg)`;
            } else {
                img.style.zIndex = '1';
                img.style.opacity = '0';
                img.style.pointerEvents = 'none';
                img.style.transform = 'translateX(0px) translateY(0px) scale(0.7) rotateY(0deg)';
            }
        });

        const activeData = circularReviewsData[currentReviewIdx];
        if (nameEl) nameEl.textContent = activeData.name;
        if (desigEl) desigEl.textContent = activeData.designation;

        if (quoteEl) {
            quoteEl.style.opacity = '0';
            setTimeout(() => {
                quoteEl.textContent = `"${activeData.quote}"`;
                quoteEl.style.opacity = '1';
            }, 180);
        }

        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll('.circular-dot');
            dots.forEach((dot, dIdx) => {
                if (dIdx === currentReviewIdx) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
    }

    function initCircularTestimonials() {
        const stage = document.getElementById('circularImgStage');
        if (!stage || stage.getAttribute('data-init') === 'true') return;
        stage.setAttribute('data-init', 'true');

        stage.innerHTML = '';
        circularReviewsData.forEach((item, index) => {
            const img = document.createElement('img');
            img.src = item.src;
            img.alt = item.name;
            img.className = 'circular-testi-img';
            img.addEventListener('click', () => {
                renderCircularTestimonial(index);
                restartCircularAutoplay();
            });
            stage.appendChild(img);
        });

        const dotsContainer = document.getElementById('circularDots');
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            circularReviewsData.forEach((_, i) => {
                const dot = document.createElement('div');
                dot.className = 'circular-dot' + (i === 0 ? ' active' : '');
                dot.addEventListener('click', () => {
                    renderCircularTestimonial(i);
                    restartCircularAutoplay();
                });
                dotsContainer.appendChild(dot);
            });
        }

        const prevBtn = document.getElementById('circPrevBtn');
        const nextBtn = document.getElementById('circNextBtn');

        if (prevBtn) {
            prevBtn.onclick = () => {
                renderCircularTestimonial(currentReviewIdx - 1);
                restartCircularAutoplay();
            };
        }
        if (nextBtn) {
            nextBtn.onclick = () => {
                renderCircularTestimonial(currentReviewIdx + 1);
                restartCircularAutoplay();
            };
        }

        renderCircularTestimonial(0);
        restartCircularAutoplay();

        window.addEventListener('resize', () => {
            renderCircularTestimonial(currentReviewIdx);
        });
    }

    function restartCircularAutoplay() {
        if (reviewAutoplayTimer) clearInterval(reviewAutoplayTimer);
        reviewAutoplayTimer = setInterval(() => {
            renderCircularTestimonial(currentReviewIdx + 1);
        }, 5500);
    }
    window.initCircularTestimonials = initCircularTestimonials;

    // Load real 5-star story reviews from MongoDB Atlas (failsafe with fallback)
    // Load real 5-star story reviews from MongoDB Atlas using reviewers' actual pictures / avatars
    async function loadRealStoryReviews() {
        const stage = document.getElementById('circularImgStage');
        if (!stage) return;

        try {
            const apiBase = (typeof API_BASE !== 'undefined') ? API_BASE : 'http://localhost:5000';

            const [reviewsRes, storiesRes, usersRes] = await Promise.allSettled([
                fetch(`${apiBase}/Reviews`),
                fetch(`${apiBase}/Stories`),
                fetch(`${apiBase}/Users`)
            ]);

            if (reviewsRes.status !== 'fulfilled' || !reviewsRes.value.ok) return;

            const allReviews = await reviewsRes.value.json();
            if (!Array.isArray(allReviews) || allReviews.length === 0) return;

            // Map story IDs to titles
            const storyTitleMap = {};
            if (storiesRes.status === 'fulfilled' && storiesRes.value.ok) {
                try {
                    const allStories = await storiesRes.value.json();
                    if (Array.isArray(allStories)) {
                        allStories.forEach(s => {
                            if (s && s.id && s.title) {
                                storyTitleMap[String(s.id)] = s.title;
                            }
                        });
                    }
                } catch (_) {}
            }

            // Map user IDs and usernames to user avatars / pictures
            const userAvatarMap = {};
            if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
                try {
                    const allUsers = await usersRes.value.json();
                    if (Array.isArray(allUsers)) {
                        allUsers.forEach(u => {
                            const uid = u.id || u._id || u.userId;
                            const pic = u.avatar || u.profilePicture || u.picture;
                            if (pic) {
                                if (uid) userAvatarMap[String(uid)] = pic;
                                if (u.username) userAvatarMap[String(u.username).toLowerCase()] = pic;
                            }
                        });
                    }
                } catch (_) {}
            }

            // Strictly filter 5-star reviews with valid text
            const fiveStarReviews = allReviews.filter(r => {
                const rating = Number(r.rating);
                const text = (r.reviewText || r.comment || r.text || '').trim();
                return rating === 5 && text.length > 3;
            });

            if (fiveStarReviews.length === 0) return;

            // Sort to select the 3 best reviews: prioritize helpfulness, then review detail / length
            fiveStarReviews.sort((a, b) => {
                const helpDiff = (Number(b.helpfulCount) || 0) - (Number(a.helpfulCount) || 0);
                if (helpDiff !== 0) return helpDiff;
                const textA = (a.reviewText || a.comment || a.text || '').trim().length;
                const textB = (b.reviewText || b.comment || b.text || '').trim().length;
                return textB - textA;
            });

            // Pick 3 best
            const topThree = fiveStarReviews.slice(0, 3);

            // Generates an SVG avatar with the user's chosen emoji or name initial (no hardcoded stock photos)
            function getReviewerAvatar(candidate, name, index) {
                const trimmed = (candidate || '').trim();
                // If it is a real uploaded base64 picture or web image URL, use it directly!
                if (
                    trimmed.startsWith('data:image/') ||
                    trimmed.startsWith('http://') ||
                    trimmed.startsWith('https://') ||
                    trimmed.startsWith('blob:') ||
                    trimmed.startsWith('/uploads/') ||
                    trimmed.startsWith('./')
                ) {
                    return trimmed;
                }

                // Vibrant modern SVG avatar for user emoji or initial
                const gradients = [
                    ['#4f46e5', '#7c3aed'], // Indigo -> Purple
                    ['#ec4899', '#f43f5e'], // Pink -> Rose
                    ['#0ea5e9', '#2563eb'], // Sky -> Blue
                    ['#10b981', '#14b8a6'], // Emerald -> Teal
                    ['#f59e0b', '#ef4444']  // Amber -> Red
                ];
                const [c1, c2] = gradients[index % gradients.length];
                const isEmoji = trimmed && (trimmed.length <= 4 || /\p{Extended_Pictographic}/u.test(trimmed));
                const displayChar = isEmoji ? trimmed : ((name || 'U').trim().charAt(0).toUpperCase() || '★');
                const fontSize = isEmoji ? '135' : '110';
                const yOffset = isEmoji ? '62%' : '58%';

                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
                    <defs>
                        <linearGradient id="user_grad_${index}" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="${c1}"/>
                            <stop offset="100%" stop-color="${c2}"/>
                        </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" rx="36" fill="url(#user_grad_${index})"/>
                    <text x="50%" y="${yOffset}" font-size="${fontSize}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${displayChar}</text>
                </svg>`;

                return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
            }

            const realMapped = topThree.map((r, i) => {
                const quoteText = (r.reviewText || r.comment || r.text || '').trim();
                const rawName = (r.username || r.userName || (r.userId ? "Explorer " + String(r.userId).slice(-4) : "Story Explorer")).trim();
                const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                const storyName = storyTitleMap[String(r.storyId)];
                const designation = storyName ? `Explorer of "${storyName}"` : "Verified 5★ Explorer";
                
                // Priority: review's own avatar -> user's profile avatar from /Users -> dynamic SVG avatar
                const candidateAvatar = r.userAvatar || userAvatarMap[String(r.userId)] || (rawName ? userAvatarMap[rawName.toLowerCase()] : '') || '';
                const portrait = getReviewerAvatar(candidateAvatar, userName, i);

                return {
                    quote: quoteText,
                    name: userName,
                    designation: designation,
                    src: portrait
                };
            });

            // Pad with fallback reviews if fewer than 3 reviews returned, applying dynamic avatar
            while (realMapped.length < 3) {
                const fallback = fallbackReviews[realMapped.length];
                realMapped.push({
                    ...fallback,
                    src: getReviewerAvatar('', fallback.name, realMapped.length)
                });
            }

            circularReviewsData = realMapped;

            // Smoothly refresh stage with real reviews
            stage.removeAttribute('data-init');
            initCircularTestimonials();
        } catch (err) {
            console.warn("Could not load real story reviews, keeping defaults:", err);
        }
    }
    window.loadRealStoryReviews = loadRealStoryReviews;

    // ── 17. 21st.dev Scroll-Locked Video Hero Engine (Disabled) ──────────────────────────
    function initScrollLockedHero() {
        return;
    }
    window.initScrollLockedHero = initScrollLockedHero;

    // ── Initialize on Ready ───────────────────────────────────────────────────
    function init() {
        initAmbientCanvas();
        scanAndEnhance();
        initPolaroidCarousel();
        initStackingCards();
        initSkiper49Swiper();
        initCircularTestimonials();
        loadRealStoryReviews();
        initScrollLockedHero();

        let mutationDebounce = null;
        const observer = new MutationObserver(() => {
            if (mutationDebounce) return;
            mutationDebounce = setTimeout(() => {
                mutationDebounce = null;
                scanAndEnhance();
            }, 300);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ── Elastic Stats Gallery Interactions ──────────────────────────────────
    window.setElasticStatActive = function(id) {
        const items = document.querySelectorAll('.elastic-stat-item');
        items.forEach(item => {
            if (item.getAttribute('data-id') === id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    };

})();

