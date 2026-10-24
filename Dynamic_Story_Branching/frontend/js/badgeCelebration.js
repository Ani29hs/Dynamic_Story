/**
 * badgeCelebration.js
 * LeetCode-Style Centered In-Middle Badge Congratulations Celebration System
 */

(function () {
    const BADGE_DEFINITIONS = [
        {
            id: "badge_first_chronicle",
            tier: "bronze",
            tierLabel: "BRONZE TIER",
            title: "First Chronicle",
            icon: "📜",
            medallionColor: "#b45309",
            desc: "Complete 1 full interactive branching story from beginning to a verified ending.",
            criteria: "1 story completed to an ending",
            targetVal: 1,
            unit: "Stories",
            checkUnlocked: (u, stats) => (u.completedStories || []).length >= 1
        },
        {
            id: "badge_fate_pathfinder",
            tier: "silver",
            tierLabel: "SILVER TIER",
            title: "Branch Pathfinder",
            icon: "🧭",
            medallionColor: "#0284c7",
            desc: "Discover at least 6 distinct branching endings across narratives in the story library.",
            criteria: "6 unique story branch endings discovered",
            targetVal: 6,
            unit: "Endings",
            checkUnlocked: (u, stats) => {
                let count = 0;
                if (u.unlockedEndings && typeof u.unlockedEndings === "object") {
                    Object.values(u.unlockedEndings).forEach(arr => {
                        if (Array.isArray(arr)) count += arr.length;
                    });
                }
                return count >= 6;
            }
        },
        {
            id: "badge_multiverse_master",
            tier: "gold",
            tierLabel: "GOLD TIER",
            title: "Master Chronicler",
            icon: "🏆",
            medallionColor: "#d97706",
            desc: "Thoroughly complete at least 5 different branching stories from prologue to climax.",
            criteria: "5 distinct stories fully completed",
            targetVal: 5,
            unit: "Stories",
            checkUnlocked: (u, stats) => (u.completedStories || []).length >= 5
        },
        {
            id: "badge_temporal_guardian",
            tier: "guardian",
            tierLabel: "GUARDIAN TIER",
            title: "Temporal Weaver",
            icon: "⏳",
            medallionColor: "#059669",
            desc: "Use the Time-Warp Retreat 5 times to strategically rewind and explore alternate fates.",
            criteria: "5 successful Time-Warp rewinds executed",
            targetVal: 5,
            unit: "Rewinds",
            checkUnlocked: (u, stats) => (u.usedFreeRetreatStories || []).length >= 5
        },
        {
            id: "badge_knight_lore",
            tier: "knight",
            tierLabel: "KNIGHT TIER",
            title: "Knight of Lore",
            icon: "⚔️",
            medallionColor: "#7c3aed",
            desc: "Contribute to the reading community: write 5 verified story reviews AND post 10 comments.",
            criteria: "5 verified reviews & 10 discussion comments",
            targetVal: 15,
            unit: "Community Acts",
            checkUnlocked: (u, stats) => (stats?.reviewsCount || 0) >= 5 && (stats?.commentsCount || 0) >= 10
        },
        {
            id: "badge_apex_lorekeeper",
            tier: "diamond",
            tierLabel: "DIAMOND TIER",
            title: "Diamond Lorekeeper",
            icon: "💎",
            medallionColor: "#0ea5e9",
            desc: "Accumulate 500+ Total Story XP through narrative traversals, secret endings, and community.",
            criteria: "500+ Total Story XP achieved",
            targetVal: 500,
            unit: "XP",
            checkUnlocked: (u, stats) => (u.xp || 0) >= 500
        },
        {
            id: "badge_story_architect",
            tier: "legend",
            tierLabel: "LEGEND TIER",
            title: "Story Architect",
            icon: "👑",
            medallionColor: "#be185d",
            desc: "Submit a community interactive story pitch and have it officially approved by System Admin.",
            criteria: "Story Pitch accepted & approved by Admin",
            targetVal: 1,
            unit: "Pitches",
            checkUnlocked: (u, stats) => Boolean(u.lastPitchMonth && u.pitchApproved)
        },
        {
            id: "badge_chronicle_streak",
            tier: "annual",
            tierLabel: "ANNUAL MEDAL",
            title: "Chronicle 7-Day Streak",
            icon: "🔥",
            medallionColor: "#e11d48",
            desc: "Maintain an active story reading activity streak for 7 consecutive days.",
            criteria: "7 consecutive active reading days",
            targetVal: 7,
            unit: "Days Streak",
            checkUnlocked: (u, stats) => (u.readingStreak || 1) >= 7
        },
        {
            id: "badge_50_days_streak",
            tier: "mythic",
            tierLabel: "ELITE STREAK",
            title: "50 Days Badge 2026",
            icon: "⚡",
            medallionColor: "#15803d",
            desc: "The legendary endurance challenge: Maintain an active reading activity streak for 50 days in 2026.",
            criteria: "50 consecutive active reading days",
            targetVal: 50,
            unit: "Days Streak",
            checkUnlocked: (u, stats) => (u.readingStreak || 1) >= 50
        },
        {
            id: "badge_grand_omniverse",
            tier: "mythic",
            tierLabel: "ULTIMATE COMPLETIONIST",
            title: "Grand Omniverse Master",
            icon: "🌌",
            medallionColor: "#8b5cf6",
            desc: "The pinnacle narrative feat: explore every single branching ending and complete all 5 stories in the chronicle universe.",
            criteria: "All 5 stories completed & all 28 branch endings unlocked",
            targetVal: 28,
            unit: "Endings",
            checkUnlocked: (u, stats) => {
                let count = 0;
                if (u.unlockedEndings && typeof u.unlockedEndings === "object") {
                    Object.values(u.unlockedEndings).forEach(arr => {
                        if (Array.isArray(arr)) count += arr.length;
                    });
                }
                const completed = (u.completedStories || []).length;
                return completed >= 5 && count >= 28;
            }
        }
    ];

    function getLeetCodeHexagonSvg(badge, size = 140) {
        if (!badge) return '';

        if (badge.id === "badge_grand_omniverse") {
            return `
                <svg width="${size}" height="${Math.round(size * 1.07)}" viewBox="0 0 140 150" fill="none" xmlns="http://www.w3.org/2000/svg" class="leetcode-hexagon-svg">
                    <defs>
                        <linearGradient id="hexFrame_omni" x1="0" y1="0" x2="140" y2="150" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#c084fc" />
                            <stop offset="50%" stop-color="#7c3aed" />
                            <stop offset="100%" stop-color="#2e1065" />
                        </linearGradient>
                        <linearGradient id="hexAccent_omni" x1="70" y1="20" x2="130" y2="130" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#e879f9" />
                            <stop offset="50%" stop-color="#a855f7" />
                            <stop offset="100%" stop-color="#6b21a8" />
                        </linearGradient>
                        <filter id="hexGlow_omni" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="rgba(168,85,247,0.4)" />
                        </filter>
                    </defs>
                    <path d="M70 12 L124 43 L124 105 L70 136 L16 105 L16 43 Z" 
                          fill="#181124" stroke="url(#hexFrame_omni)" stroke-width="5" stroke-linejoin="round" filter="url(#hexGlow_omni)" />
                    <path d="M70 20 L116 47 L116 101 L70 128 L24 101 L24 47 Z" 
                          fill="#100b1a" stroke="#4c1d95" stroke-width="2" stroke-linejoin="round" />
                    <g transform="translate(30, 56)">
                        <text x="0" y="24" fill="#e9d5ff" font-family="'JetBrains Mono', monospace" font-size="24" font-weight="900" letter-spacing="-1">ALL</text>
                        <text x="2" y="38" fill="#a855f7" font-family="'Outfit', sans-serif" font-size="8.5" font-weight="900" letter-spacing="1.2">FATES</text>
                    </g>
                    <path d="M70 26 C95 26 112 45 112 74 C112 103 95 122 70 122 C84 112 94 94 94 74 C94 54 84 36 70 26 Z" 
                          fill="url(#hexAccent_omni)" stroke="#c084fc" stroke-width="1.5" />
                </svg>
            `;
        }

        if (badge.id === "badge_50_days_streak") {
            return `
                <svg width="${size}" height="${Math.round(size * 1.07)}" viewBox="0 0 140 150" fill="none" xmlns="http://www.w3.org/2000/svg" class="leetcode-hexagon-svg">
                    <defs>
                        <linearGradient id="hexFrame_50" x1="0" y1="0" x2="140" y2="150" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#94a3b8" />
                            <stop offset="50%" stop-color="#475569" />
                            <stop offset="100%" stop-color="#1e293b" />
                        </linearGradient>
                        <linearGradient id="hexAccent_50" x1="70" y1="20" x2="130" y2="130" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#84cc16" />
                            <stop offset="50%" stop-color="#22c55e" />
                            <stop offset="100%" stop-color="#15803d" />
                        </linearGradient>
                        <filter id="hexGlow_50" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="rgba(0,0,0,0.55)" />
                        </filter>
                    </defs>
                    <path d="M70 12 L124 43 L124 105 L70 136 L16 105 L16 43 Z" 
                          fill="#1e222b" stroke="url(#hexFrame_50)" stroke-width="5" stroke-linejoin="round" filter="url(#hexGlow_50)" />
                    <path d="M70 20 L116 47 L116 101 L70 128 L24 101 L24 47 Z" 
                          fill="#15181f" stroke="#334155" stroke-width="2" stroke-linejoin="round" />
                    <g transform="translate(32, 58)">
                        <text x="0" y="24" fill="#94a3b8" font-family="'JetBrains Mono', monospace" font-size="28" font-weight="900" letter-spacing="-1">50</text>
                        <text x="2" y="38" fill="#64748b" font-family="'Outfit', sans-serif" font-size="9" font-weight="800" letter-spacing="1.5">DAYS</text>
                    </g>
                    <path d="M70 26 C95 26 112 45 112 74 C112 103 95 122 70 122 C84 112 94 94 94 74 C94 54 84 36 70 26 Z" 
                          fill="url(#hexAccent_50)" stroke="#22c55e" stroke-width="1.5" />
                </svg>
            `;
        }

        const configs = {
            bronze: { frame1: "#d97706", frame2: "#78350f", accent1: "#fbbf24", accent2: "#f59e0b", accent3: "#b45309", sub: "1st", sub2: "STORY" },
            silver: { frame1: "#94a3b8", frame2: "#334155", accent1: "#38bdf8", accent2: "#0284c7", accent3: "#0369a1", sub: "6", sub2: "FATES" },
            gold: { frame1: "#fde047", frame2: "#854d0e", accent1: "#facc15", accent2: "#eab308", accent3: "#a16207", sub: "5", sub2: "STORIES" },
            guardian: { frame1: "#6ee7b7", frame2: "#064e3b", accent1: "#34d399", accent2: "#059669", accent3: "#047857", sub: "TIME", sub2: "WARP" },
            knight: { frame1: "#c4b5fd", frame2: "#4c1d95", accent1: "#a855f7", accent2: "#7c3aed", accent3: "#6d28d9", sub: "LORE", sub2: "KNIGHT" },
            diamond: { frame1: "#bae6fd", frame2: "#0369a1", accent1: "#38bdf8", accent2: "#0ea5e9", accent3: "#0284c7", sub: "500", sub2: "XP" },
            legend: { frame1: "#fbcfe8", frame2: "#831843", accent1: "#f43f5e", accent2: "#be185d", accent3: "#9d174d", sub: "CROWN", sub2: "PITCH" },
            annual: { frame1: "#fecdd3", frame2: "#9f1239", accent1: "#fb7185", accent2: "#e11d48", accent3: "#be123c", sub: "7", sub2: "DAYS" },
            mythic: { frame1: "#94a3b8", frame2: "#1e293b", accent1: "#84cc16", accent2: "#22c55e", accent3: "#15803d", sub: "50", sub2: "DAYS" }
        };

        const cfg = configs[badge.tier] || configs.silver;
        const uid = badge.id;

        return `
            <svg width="${size}" height="${Math.round(size * 1.07)}" viewBox="0 0 140 150" fill="none" xmlns="http://www.w3.org/2000/svg" class="leetcode-hexagon-svg">
                <defs>
                    <linearGradient id="hexFrame_${uid}" x1="0" y1="0" x2="140" y2="150" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stop-color="${cfg.frame1}" />
                        <stop offset="50%" stop-color="${cfg.frame2}" />
                        <stop offset="100%" stop-color="#0f172a" />
                    </linearGradient>
                    <linearGradient id="hexAccent_${uid}" x1="70" y1="20" x2="130" y2="130" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stop-color="${cfg.accent1}" />
                        <stop offset="50%" stop-color="${cfg.accent2}" />
                        <stop offset="100%" stop-color="${cfg.accent3}" />
                    </linearGradient>
                    <filter id="hexGlow_${uid}" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="rgba(0,0,0,0.55)" />
                    </filter>
                </defs>
                <path d="M70 12 L124 43 L124 105 L70 136 L16 105 L16 43 Z" 
                      fill="#1a1e26" stroke="url(#hexFrame_${uid})" stroke-width="5" stroke-linejoin="round" filter="url(#hexGlow_${uid})" />
                <path d="M70 20 L116 47 L116 101 L70 128 L24 101 L24 47 Z" 
                      fill="#12151c" stroke="${cfg.frame2}" stroke-width="2" stroke-linejoin="round" />
                <g transform="translate(30, 56)">
                    <text x="0" y="24" fill="#ffffff" font-family="'JetBrains Mono', monospace" font-size="24" font-weight="900" letter-spacing="-1">${cfg.sub}</text>
                    <text x="2" y="38" fill="#94a3b8" font-family="'Outfit', sans-serif" font-size="9" font-weight="900" letter-spacing="1.5">${cfg.sub2}</text>
                </g>
                <path d="M70 26 C95 26 112 45 112 74 C112 103 95 122 70 122 C84 112 94 94 94 74 C94 54 84 36 70 26 Z" 
                      fill="url(#hexAccent_${uid})" stroke="${cfg.accent1}" stroke-width="1.5" />
            </svg>
        `;
    }

    function showLeetCodeBadgeCelebration(badge) {
        if (!badge) return;

        let existing = document.getElementById("leetcodeCelebrationOverlay");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "leetcodeCelebrationOverlay";
        overlay.className = "leetcode-celebration-overlay";
        overlay.innerHTML = `
            <div class="leetcode-celebration-box" onclick="event.stopPropagation()">
                <div class="leetcode-celebration-rays"></div>
                <button type="button" class="celebration-close-btn" onclick="window.closeLeetCodeCelebration()">&times;</button>
                <div class="leetcode-celebration-content">
                    <span class="celebration-kicker">✨ NEW ACHIEVEMENT UNLOCKED</span>
                    <h1 class="celebration-title">🎉 CONGRATULATIONS!</h1>
                    
                    <div class="celebration-medallion-wrap">
                        ${getLeetCodeHexagonSvg(badge, 160)}
                    </div>

                    <div class="celebration-badge-title">${badge.title}</div>
                    <div>
                        <span class="celebration-badge-tier" style="background: ${badge.medallionColor}; color: #ffffff;">${badge.tierLabel}</span>
                    </div>
                    <div class="celebration-desc">${badge.desc}</div>

                    <div style="margin-bottom: 20px;">
                        <span style="background: #f8fafc; color: #0f172a; border: 2px solid #000; border-radius: 100px; padding: 6px 16px; font-size: 12.5px; font-weight: 900; box-shadow: 3px 3px 0 #000; display: inline-flex; align-items: center; gap: 6px;">
                            🎖️ Official Chronicle Honor Trophy
                        </span>
                    </div>

                    <div class="celebration-btn-row">
                        <button type="button" class="celebration-claim-btn" onclick="window.closeLeetCodeCelebration(); window.location.href='/pages/reader/profile.html#badges';">
                            🏆 View In Badges Collection
                        </button>
                        <button type="button" class="celebration-continue-btn" onclick="window.closeLeetCodeCelebration()">
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        `;

        overlay.onclick = window.closeLeetCodeCelebration;
        document.body.appendChild(overlay);
    }

    function closeLeetCodeCelebration() {
        const el = document.getElementById("leetcodeCelebrationOverlay");
        if (el) el.remove();
    }

    function cleanupLegacyBadgeKeys() {
        try {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith("seen_badges_")) localStorage.removeItem(k);
            });
        } catch (e) {}
    }

    function getCombinedSeenBadges(u) {
        cleanupLegacyBadgeKeys();
        if (u && Array.isArray(u.seenBadges)) {
            return u.seenBadges;
        }
        return [];
    }

    function saveSeenBadges(u, seenIds) {
        cleanupLegacyBadgeKeys();
        if (u) {
            u.seenBadges = Array.from(new Set(seenIds));
            try {
                localStorage.setItem("user", JSON.stringify(u));
                window.user = u;
            } catch (e) {}
            const token = (window.Auth && Auth.getToken) ? Auth.getToken() : localStorage.getItem("token");
            const uid = u.id || u._id;
            if (uid && typeof API_BASE !== "undefined") {
                fetch(`${API_BASE}/Users/${uid}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { "Authorization": `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ seenBadges: u.seenBadges })
                }).catch(() => {});
            }
            if (window.Auth && Auth.updateProfile && token) {
                Auth.updateProfile({ seenBadges: u.seenBadges }).catch(() => {});
            }
        }
    }

    /**
     * Check if user newly unlocked any badge and celebrate it in the middle of the screen!
     * @param {Object} currentUser
     * @param {Object} extraStats
     * @param {Boolean} isLiveAction - ONLY celebrate if explicitly triggered by a live user action
     */
    async function checkUserBadgeMilestones(currentUser, extraStats = {}, isLiveAction = false) {
        if (!currentUser) {
            try {
                if (typeof Auth !== "undefined" && Auth.getUser) {
                    currentUser = Auth.getUser();
                } else {
                    const raw = localStorage.getItem("user");
                    if (raw) currentUser = JSON.parse(raw);
                }
            } catch (e) { }
        }
        if (!currentUser) return;

        let seenIds = getCombinedSeenBadges(currentUser);

        // If NOT an active live achievement event (e.g. initial page load, opening a story, visiting profile):
        // Automatically seed all badges that the user already qualifies for into seenIds so historical badges never pop up!
        if (!isLiveAction) {
            let updated = false;
            for (const b of BADGE_DEFINITIONS) {
                if (!seenIds.includes(b.id) && b.checkUnlocked(currentUser, extraStats)) {
                    seenIds.push(b.id);
                    updated = true;
                }
            }
            if (updated) {
                saveSeenBadges(currentUser, seenIds);
            }
            return;
        }

        // Live action event (e.g. user just completed story or posted review):
        for (const b of BADGE_DEFINITIONS) {
            if (seenIds.includes(b.id)) continue;

            const isUnlocked = b.checkUnlocked(currentUser, extraStats);
            if (isUnlocked) {
                seenIds.push(b.id);
                saveSeenBadges(currentUser, seenIds);
                setTimeout(() => {
                    showLeetCodeBadgeCelebration(b);
                }, 500);
                break; // Celebrate one at a time
            }
        }
    }

    window.getLeetCodeHexagonSvg = getLeetCodeHexagonSvg;
    window.showLeetCodeBadgeCelebration = showLeetCodeBadgeCelebration;
    window.closeLeetCodeCelebration = closeLeetCodeCelebration;
    window.checkUserBadgeMilestones = checkUserBadgeMilestones;
    window.BADGE_DEFINITIONS = BADGE_DEFINITIONS;
})();
