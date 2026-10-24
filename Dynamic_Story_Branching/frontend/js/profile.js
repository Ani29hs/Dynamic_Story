/* ============================================================
   profile.js — LeetCode-Style Badges, Photo Upload & Activity Skyline
   ============================================================ */

const AVATAR_PRESETS = [
    "🧙‍♂️", "🥷", "🕵️", "🚀", 
    "🐉", "🤖", "🦊", "👑", 
    "⚔️", "⚡", "🧟", "🔮", 
    "🐺", "🎭", "🌌", "🦄"
];

const PERSONA_PRESETS = [
    "Story Explorer",
    "RPG Fan",
    "Lore Hunter",
    "Ending Hunter",
    "Plot Theorist",
    "Speedrunner",
    "Branch Walker",
    "Grand Chronicler"
];

let currentUser = null;
let activeBadgeFilter = "all"; // "all" | "unlocked" | "locked"
let currentAvatarValue = "🧙‍♂️";
let cachedBadges = [];

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Guard — ensure signed in
    if (!window.Auth || !Auth.getToken()) {
        window.location.href = "../auth/login.html";
        return;
    }

    try {
        currentUser = await Auth.getProfile();
    } catch (e) {
        currentUser = Auth.getUser();
    }
    if (!currentUser) return;

    currentAvatarValue = currentUser.avatar || "🧙‍♂️";

    // 2. Initialise page components
    renderAvatarPicker();
    renderPersonaChips();
    populateFormValues();
    renderHeroCard();
    setupPhotoUploadHandler();
    await loadAndRenderBadges();
    initReadingActivitySkyline();
});

// Setup Photo Upload via File Input with Client-Side Canvas Compression
function setupPhotoUploadHandler() {
    const fileInput = document.getElementById("avatarFileInput");
    if (!fileInput) return;

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select a valid image file (PNG, JPG, WEBP).");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Resize image to max 220x220 for snappy base64 storage
                const canvas = document.createElement("canvas");
                const maxDim = 220;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
                currentAvatarValue = compressedBase64;

                const urlInput = document.getElementById("customAvatarUrl");
                if (urlInput) urlInput.value = "";

                // Deselect preset buttons
                document.querySelectorAll(".avatar-choice-btn").forEach(b => b.classList.remove("active"));

                updateAvatarPreview();

                if (typeof showToastNotification === "function") {
                    showToastNotification("PHOTO LOADED! 📸", "Click 'Save Profile Changes' to store permanently.", "✨");
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Render the preset avatar buttons
function renderAvatarPicker() {
    const grid = document.getElementById("avatarGrid");
    if (!grid) return;

    grid.innerHTML = AVATAR_PRESETS.map(av => `
        <button type="button" class="avatar-choice-btn ${av === currentAvatarValue ? 'active' : ''}" 
                onclick="selectAvatarPreset('${av}')" title="Select ${av}">
            ${av}
        </button>
    `).join('');
}

function selectAvatarPreset(avatar) {
    currentAvatarValue = avatar;
    const urlInput = document.getElementById("customAvatarUrl");
    if (urlInput) urlInput.value = "";
    const fileInput = document.getElementById("avatarFileInput");
    if (fileInput) fileInput.value = "";

    renderAvatarPicker();
    updateAvatarPreview();
}
window.selectAvatarPreset = selectAvatarPreset;

function updateAvatarPreview() {
    const previewEl = document.getElementById("heroAvatarBox");
    const editPreview = document.getElementById("editAvatarPreview");
    const customInput = document.getElementById("customAvatarUrl");
    const customUrl = customInput ? customInput.value.trim() : "";

    const val = customUrl || currentAvatarValue || "🧙‍♂️";
    const initial = (currentUser && currentUser.name) ? currentUser.name.charAt(0).toUpperCase() : "U";

    const isImage = val.startsWith("data:image/") || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/");

    const html = isImage
        ? `<img src="${val}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;" onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'font-size: 32px; font-weight: 900;\\'>${initial}</span>';">`
        : `<span style="font-size: 40px; line-height: 1;">${val}</span>`;

    if (previewEl) previewEl.innerHTML = html;
    if (editPreview) editPreview.innerHTML = html;
}
window.updateAvatarPreview = updateAvatarPreview;

// Render persona chips (RPG Fan, Story Explorer, etc.)
function renderPersonaChips() {
    const container = document.getElementById("personaChips");
    if (!container) return;

    container.innerHTML = PERSONA_PRESETS.map(chip => `
        <button type="button" class="persona-chip-btn ${currentUser && currentUser.title === chip ? 'active' : ''}" 
                onclick="selectPersonaChip('${chip}')">
            ${chip}
        </button>
    `).join('');
}

function selectPersonaChip(chip) {
    const input = document.getElementById("personaTitleInput");
    if (input) input.value = chip;

    const btns = document.querySelectorAll(".persona-chip-btn");
    btns.forEach(btn => {
        if (btn.innerText.trim() === chip) btn.classList.add("active");
        else btn.classList.remove("active");
    });
}
window.selectPersonaChip = selectPersonaChip;

function populateFormValues() {
    if (!currentUser) return;
    const nameInput = document.getElementById("displayNameInput");
    const titleInput = document.getElementById("personaTitleInput");
    const bioInput = document.getElementById("bioInput");
    const customAvatarInput = document.getElementById("customAvatarUrl");

    if (nameInput) nameInput.value = currentUser.name || "";
    if (titleInput) titleInput.value = currentUser.title || "Story Explorer";
    if (bioInput) bioInput.value = currentUser.bio || "";
    if (customAvatarInput && currentUser.avatar && (currentUser.avatar.startsWith("http://") || currentUser.avatar.startsWith("https://"))) {
        customAvatarInput.value = currentUser.avatar;
    }
}

function renderHeroCard() {
    if (!currentUser) return;

    const heroName = document.getElementById("heroName");
    const heroPersona = document.getElementById("heroPersona");
    const heroEmail = document.getElementById("heroEmail");
    const statXp = document.getElementById("heroStatXp");
    const statStories = document.getElementById("heroStatStories");
    const statEndings = document.getElementById("heroStatEndings");

    if (heroName) heroName.innerText = currentUser.name || "Reader";
    if (heroPersona) heroPersona.innerHTML = `🏷️ ${currentUser.title || "Story Explorer"}`;
    if (heroEmail) heroEmail.innerText = currentUser.email || "";
    if (statXp) statXp.innerText = `${currentUser.xp || 100} XP`;

    const completed = Array.isArray(currentUser.completedStories) ? currentUser.completedStories.length : 0;
    if (statStories) statStories.innerText = completed;

    // Calculate total unlocked branching endings
    let totalEndingsCount = 0;
    if (currentUser.unlockedEndings && typeof currentUser.unlockedEndings === "object") {
        Object.values(currentUser.unlockedEndings).forEach(arr => {
            if (Array.isArray(arr)) totalEndingsCount += arr.length;
        });
    }
    if (statEndings) statEndings.innerText = totalEndingsCount;

    updateAvatarPreview();
}

// Save profile handler — saves to MongoDB Atlas and updates localStorage & navbars
async function handleSaveProfile(event) {
    if (event) event.preventDefault();

    const nameInput = document.getElementById("displayNameInput");
    const titleInput = document.getElementById("personaTitleInput");
    const bioInput = document.getElementById("bioInput");
    const customAvatarInput = document.getElementById("customAvatarUrl");

    const newName = nameInput ? nameInput.value.trim() : currentUser.name;
    const newTitle = titleInput ? titleInput.value.trim() : "Story Explorer";
    const newBio = bioInput ? bioInput.value.trim() : "";
    const customUrl = customAvatarInput ? customAvatarInput.value.trim() : "";
    const finalAvatar = customUrl || currentAvatarValue || "🧙‍♂️";

    try {
        const submitBtn = document.getElementById("saveProfileBtn");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `⏳ Saving Profile to Atlas...`;
        }

        const updated = await Auth.updateProfile({
            name: newName,
            title: newTitle,
            bio: newBio,
            avatar: finalAvatar
        });

        currentUser = updated;
        currentAvatarValue = updated.avatar;
        window.user = updated;
        if (typeof syncCurrentUser === "function") {
            syncCurrentUser(updated);
        }

        // Live immediate DOM update across all page sections
        renderHeroCard();
        updateAvatarPreview();
        populateFormValues();
        renderPersonaChips();
        renderAvatarPicker();

        if (typeof renderUserProfileHeader === "function") {
            renderUserProfileHeader();
        }

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `💾 Save Profile Changes`;
        }

        if (typeof showToastNotification === "function") {
            showToastNotification("PROFILE SAVED! 🎉", "Your profile changes are live across the app.", "✨");
        } else {
            alert("🎉 Profile saved successfully!");
        }
    } catch (err) {
        alert("Failed to save profile: " + err.message);
        const submitBtn = document.getElementById("saveProfileBtn");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `💾 Save Profile Changes`;
        }
    }
}
window.handleSaveProfile = handleSaveProfile;

/* ============================================================
   LEETCODE-STYLE ENGAGING BADGE SYSTEM (CHALLENGING & HARD TO EARN)
   ============================================================ */

async function loadAndRenderBadges() {
    if (!currentUser) return;

    let totalEndingsCount = 0;
    if (currentUser.unlockedEndings && typeof currentUser.unlockedEndings === "object") {
        Object.values(currentUser.unlockedEndings).forEach(arr => {
            if (Array.isArray(arr)) totalEndingsCount += arr.length;
        });
    }

    const completedStoriesCount = (currentUser.completedStories || []).length;
    const usedRetreatCount = (currentUser.usedFreeRetreatStories || []).length;
    const userXp = currentUser.xp || 100;
    const hasPitched = Boolean(currentUser.lastPitchMonth);

    // Fetch user reviews and comments count for community badges
    let reviewsCount = 0;
    let commentsCount = 0;
    try {
        const [revRes, comRes] = await Promise.all([
            fetch(`${API_BASE}/Reviews`),
            fetch(`${API_BASE}/Comments`)
        ]);
        if (revRes.ok) {
            const allRevs = await revRes.json();
            reviewsCount = allRevs.filter(r => String(r.userId) === String(currentUser.id)).length;
        }
        if (comRes.ok) {
            const allComs = await comRes.json();
            commentsCount = allComs.filter(c => String(c.userId) === String(currentUser.id)).length;
        }
    } catch (e) { }

    // 10 Challenging LeetCode-Tier Badges with Strict Hard-To-Gain Criteria (Pure Prestige Trophies)
    cachedBadges = [
        {
            id: "badge_first_chronicle",
            tier: "bronze",
            tierLabel: "BRONZE TIER",
            title: "First Chronicle",
            icon: "📜",
            medallionColor: "#b45309",
            bgGradient: "linear-gradient(135deg, #78350f 0%, #b45309 50%, #f59e0b 100%)",
            desc: "Complete 1 full interactive branching story from beginning to a verified ending.",
            criteria: "1 story completed to an ending",
            currentVal: completedStoriesCount,
            targetVal: 1,
            unit: "Stories",
            unlocked: completedStoriesCount >= 1,
            earnedDate: completedStoriesCount >= 1 ? "Active Earned" : null
        },
        {
            id: "badge_fate_pathfinder",
            tier: "silver",
            tierLabel: "SILVER TIER",
            title: "Branch Pathfinder",
            icon: "🧭",
            medallionColor: "#0284c7",
            bgGradient: "linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #38bdf8 100%)",
            desc: "Discover at least 6 distinct branching endings across narratives in the story library.",
            criteria: "6 unique story branch endings discovered",
            currentVal: totalEndingsCount,
            targetVal: 6,
            unit: "Endings",
            unlocked: totalEndingsCount >= 6,
            earnedDate: totalEndingsCount >= 6 ? "Active Earned" : null
        },
        {
            id: "badge_multiverse_master",
            tier: "gold",
            tierLabel: "GOLD TIER",
            title: "Master Chronicler",
            icon: "🏆",
            medallionColor: "#d97706",
            bgGradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fef08a 100%)",
            desc: "Thoroughly complete at least 5 different branching stories from prologue to climax.",
            criteria: "5 distinct stories fully completed",
            currentVal: completedStoriesCount,
            targetVal: 5,
            unit: "Stories",
            unlocked: completedStoriesCount >= 5,
            earnedDate: completedStoriesCount >= 5 ? "Earned Active" : null
        },
        {
            id: "badge_temporal_guardian",
            tier: "guardian",
            tierLabel: "GUARDIAN TIER",
            title: "Temporal Weaver",
            icon: "⏳",
            medallionColor: "#059669",
            bgGradient: "linear-gradient(135deg, #064e3b 0%, #059669 50%, #6ee7b7 100%)",
            desc: "Use the Time-Warp Retreat 5 times to strategically rewind and explore alternate fates.",
            criteria: "5 successful Time-Warp rewinds executed",
            currentVal: usedRetreatCount,
            targetVal: 5,
            unit: "Rewinds",
            unlocked: usedRetreatCount >= 5,
            earnedDate: usedRetreatCount >= 5 ? "Earned Active" : null
        },
        {
            id: "badge_knight_lore",
            tier: "knight",
            tierLabel: "KNIGHT TIER",
            title: "Knight of Lore",
            icon: "⚔️",
            medallionColor: "#7c3aed",
            bgGradient: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #c4b5fd 100%)",
            desc: "Contribute to the reading community: write 5 verified story reviews AND post 10 comments.",
            criteria: "5 verified reviews & 10 discussion comments",
            currentVal: Math.min(reviewsCount, 5) + Math.min(commentsCount, 10),
            targetVal: 15,
            unit: "Community Acts",
            unlocked: reviewsCount >= 5 && commentsCount >= 10,
            earnedDate: (reviewsCount >= 5 && commentsCount >= 10) ? "Earned Active" : null
        },
        {
            id: "badge_apex_lorekeeper",
            tier: "diamond",
            tierLabel: "DIAMOND TIER",
            title: "Diamond Lorekeeper",
            icon: "💎",
            medallionColor: "#0ea5e9",
            bgGradient: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #bae6fd 100%)",
            desc: "Accumulate 500+ Total Story XP through narrative traversals, secret endings, and community.",
            criteria: "500+ Total Story XP achieved",
            currentVal: userXp,
            targetVal: 500,
            unit: "XP",
            unlocked: userXp >= 500,
            earnedDate: userXp >= 500 ? "Earned Active" : null
        },
        {
            id: "badge_story_architect",
            tier: "legend",
            tierLabel: "LEGEND TIER",
            title: "Story Architect",
            icon: "👑",
            medallionColor: "#be185d",
            bgGradient: "linear-gradient(135deg, #831843 0%, #be185d 50%, #fbcfe8 100%)",
            desc: "Submit a community interactive story pitch and have it officially approved by System Admin.",
            criteria: "Story Pitch accepted & approved by Admin",
            currentVal: (hasPitched && currentUser.pitchApproved) ? 1 : 0,
            targetVal: 1,
            unit: "Pitches",
            unlocked: Boolean(hasPitched && currentUser.pitchApproved),
            earnedDate: (hasPitched && currentUser.pitchApproved) ? "Earned Active" : null
        },
        {
            id: "badge_chronicle_streak",
            tier: "annual",
            tierLabel: "ANNUAL MEDAL",
            title: "Chronicle 7-Day Streak",
            icon: "🔥",
            medallionColor: "#e11d48",
            bgGradient: "linear-gradient(135deg, #9f1239 0%, #e11d48 50%, #fecdd3 100%)",
            desc: "Maintain an active story reading activity streak for 7 consecutive days.",
            criteria: "7 consecutive active reading days",
            currentVal: Math.min(1, 7),
            targetVal: 7,
            unit: "Days Streak",
            unlocked: false,
            earnedDate: null
        },
        {
            id: "badge_50_days_streak",
            tier: "mythic",
            tierLabel: "ELITE STREAK",
            title: "50 Days Badge 2026",
            icon: "⚡",
            medallionColor: "#15803d",
            bgGradient: "linear-gradient(135deg, #14532d 0%, #22c55e 50%, #bbf7d0 100%)",
            desc: "The legendary endurance challenge: Maintain an active reading activity streak for 50 days in 2026.",
            criteria: "50 consecutive active reading days",
            currentVal: Math.min(1, 50),
            targetVal: 50,
            unit: "Days Streak",
            unlocked: false,
            earnedDate: null
        },
        {
            id: "badge_grand_omniverse",
            tier: "mythic",
            tierLabel: "ULTIMATE COMPLETIONIST",
            title: "Grand Omniverse Master",
            icon: "🌌",
            medallionColor: "#8b5cf6",
            bgGradient: "linear-gradient(135deg, #4c1d95 0%, #8b5cf6 50%, #ddd6fe 100%)",
            desc: "The pinnacle narrative feat: explore every single branching ending and complete all 5 stories in the chronicle universe.",
            criteria: "All 5 stories completed & all 28 branch endings unlocked",
            currentVal: totalEndingsCount,
            targetVal: 28,
            unit: "Endings",
            unlocked: completedStoriesCount >= 5 && totalEndingsCount >= 28,
            earnedDate: (completedStoriesCount >= 5 && totalEndingsCount >= 28) ? "Active Earned" : null
        }
    ];

    const unlockedBadges = cachedBadges.filter(b => b.unlocked);
    const unlockedCount = unlockedBadges.length;

    const statBadges = document.getElementById("heroStatBadges");
    if (statBadges) {
        statBadges.innerText = `${unlockedCount} / ${cachedBadges.length}`;
    }

    // Update Authentic LeetCode Widget (Screenshot 4)
    const heroBadgeCount = document.getElementById("heroBadgeCount");
    if (heroBadgeCount) {
        heroBadgeCount.innerText = unlockedCount > 0 ? unlockedCount : "0";
    }

    // Featured badge is the LATEST unlocked badge (or first badge locked if none)
    const latestUnlockedBadge = unlockedBadges.length > 0 ? unlockedBadges[unlockedBadges.length - 1] : null;

    const mostRecentBadgeTitle = document.getElementById("mostRecentBadgeTitle");
    if (mostRecentBadgeTitle) {
        mostRecentBadgeTitle.innerText = latestUnlockedBadge ? latestUnlockedBadge.title : "No Badges Earned Yet";
    }

    const medallionShowcase = document.getElementById("leetcodeMedallionShowcase");
    if (medallionShowcase) {
        if (latestUnlockedBadge) {
            medallionShowcase.innerHTML = getLeetCodeHexagonSvg(latestUnlockedBadge, 140);
        } else {
            // Render locked preview of first badge with dimmed style
            const previewBadge = Object.assign({}, cachedBadges[0], { unlocked: false });
            medallionShowcase.innerHTML = `
                <div style="opacity: 0.45; filter: grayscale(1); transform: scale(0.92); transition: all 0.3s ease;">
                    ${getLeetCodeHexagonSvg(previewBadge, 130)}
                </div>
            `;
        }
    }

    renderBadgesList();

    // Mark all existing unlocked badges as seen in MongoDB Atlas so visiting profile NEVER pops up old celebrations
    if (currentUser) {
        try {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith("seen_badges_") || k.startsWith("hasSeenWelcomeToast_")) {
                    localStorage.removeItem(k);
                }
            });
        } catch (e) {}

        const seenSet = new Set(currentUser.seenBadges || []);
        unlockedBadges.forEach(b => seenSet.add(b.id));
        const finalSeen = Array.from(seenSet);

        currentUser.seenBadges = finalSeen;
        try {
            localStorage.setItem("user", JSON.stringify(currentUser));
            window.user = currentUser;
        } catch (e) {}

        const uid = currentUser.id || currentUser._id;
        if (uid && typeof API_BASE !== "undefined") {
            fetch(`${API_BASE}/Users/${uid}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ seenBadges: finalSeen })
            }).catch(() => {});
        }
    }
}

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

function filterBadges(filter) {
    activeBadgeFilter = filter;
    const btns = document.querySelectorAll(".badge-filter-btn");
    btns.forEach(btn => {
        if (btn.getAttribute("data-filter") === filter) btn.classList.add("active");
        else btn.classList.remove("active");
    });
    renderBadgesList();
}
window.filterBadges = filterBadges;

function renderBadgesList() {
    const grid = document.getElementById("badgesGrid");
    if (!grid) return;

    let filtered = cachedBadges;
    if (activeBadgeFilter === "unlocked") filtered = cachedBadges.filter(b => b.unlocked);
    if (activeBadgeFilter === "locked") filtered = cachedBadges.filter(b => !b.unlocked);

    if (!filtered.length) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 25px; font-weight: 800; color: #64748b;">
                No badges found in this category.
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(badge => {
        return `
            <div class="shelf-badge-card ${badge.unlocked ? 'unlocked' : 'locked'}" onclick="openBadgeInspectModal('${badge.id}')">
                <div class="shelf-medallion-icon" style="background: ${badge.unlocked ? badge.bgGradient : '#334155'};">
                    <span style="${badge.unlocked ? '' : 'filter: grayscale(1) opacity(0.35);'}">${badge.icon}</span>
                </div>
                <div class="shelf-badge-tier">${badge.tierLabel}</div>
                <div class="shelf-badge-title">${badge.title}</div>
                <div class="shelf-badge-status ${badge.unlocked ? 'unlocked' : 'locked'}">
                    ${badge.unlocked ? '✨ Earned' : `🔒 ${badge.currentVal}/${badge.targetVal}`}
                </div>
            </div>
        `;
    }).join('');
}

// ── Open All Earned / Available Badges Modal ──
function openAllBadgesModal(defaultTab = 'earned') {
    let existing = document.getElementById("allBadgesModal");
    if (existing) existing.remove();

    const unlockedBadges = cachedBadges.filter(b => b.unlocked);

    const modal = document.createElement("div");
    modal.id = "allBadgesModal";
    modal.className = "badge-modal-overlay";
    modal.innerHTML = `
        <div class="badge-modal-box collection-modal-box" onclick="event.stopPropagation()">
            <button type="button" class="badge-modal-close" onclick="closeAllBadgesModal()">&times;</button>
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #000; padding-bottom: 14px; margin-bottom: 16px;">
                <div>
                    <div style="font-size: 11px; font-weight: 900; color: #4f46e5; letter-spacing: 0.1em; text-transform: uppercase;">COLLECTION SHOWCASE</div>
                    <h2 style="margin: 2px 0 0; font-size: 22px; font-weight: 900; color: #0f172a;">🎖️ All Earned Badges (${unlockedBadges.length})</h2>
                </div>
                <div class="badges-filter-bar">
                    <button type="button" class="badge-filter-btn ${defaultTab === 'earned' ? 'active' : ''}" id="modalTabEarned" onclick="switchModalBadgesTab('earned')">
                        ✨ Earned (${unlockedBadges.length})
                    </button>
                    <button type="button" class="badge-filter-btn ${defaultTab === 'all' ? 'active' : ''}" id="modalTabAll" onclick="switchModalBadgesTab('all')">
                        🔒 All (${cachedBadges.length})
                    </button>
                </div>
            </div>
            
            <div class="collection-modal-grid" id="modalBadgesContainer">
                ${renderModalBadgesHtml(defaultTab)}
            </div>
        </div>
    `;

    modal.onclick = closeAllBadgesModal;
    document.body.appendChild(modal);
}
window.openAllBadgesModal = openAllBadgesModal;

function closeAllBadgesModal() {
    const m = document.getElementById("allBadgesModal");
    if (m) m.remove();
}
window.closeAllBadgesModal = closeAllBadgesModal;

function switchModalBadgesTab(tab) {
    const tEarned = document.getElementById("modalTabEarned");
    const tAll = document.getElementById("modalTabAll");
    if (tEarned && tAll) {
        if (tab === 'earned') {
            tEarned.classList.add("active");
            tAll.classList.remove("active");
        } else {
            tAll.classList.add("active");
            tEarned.classList.remove("active");
        }
    }
    const container = document.getElementById("modalBadgesContainer");
    if (container) {
        container.innerHTML = renderModalBadgesHtml(tab);
    }
}
window.switchModalBadgesTab = switchModalBadgesTab;

function renderModalBadgesHtml(tab) {
    const list = tab === 'earned' ? cachedBadges.filter(b => b.unlocked) : cachedBadges;
    if (!list.length) {
        return `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; font-weight: 800; color: #64748b;">No badges found in this view.</div>`;
    }

    return list.map(b => `
        <div class="shelf-badge-card ${b.unlocked ? 'unlocked' : 'locked'}" onclick="closeAllBadgesModal(); openBadgeInspectModal('${b.id}')">
            <div style="display: flex; justify-content: center; margin-bottom: 6px;">
                ${getLeetCodeHexagonSvg(b, 75)}
            </div>
            <div class="shelf-badge-tier">${b.tierLabel}</div>
            <div class="shelf-badge-title" style="font-size: 13.5px;">${b.title}</div>
            <div class="shelf-badge-status ${b.unlocked ? 'unlocked' : 'locked'}" style="margin-top: 6px;">
                ${b.unlocked ? '✨ UNLOCKED' : `🔒 ${b.currentVal}/${b.targetVal}`}
            </div>
        </div>
    `).join('');
}

// ── LEETCODE IN-MIDDLE CONGRATULATIONS CELEBRATION MODAL ──
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
            <button type="button" class="celebration-close-btn" onclick="closeLeetCodeCelebration()">&times;</button>
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
                    <button type="button" class="celebration-claim-btn" onclick="closeLeetCodeCelebration(); openAllBadgesModal('earned');">
                        🏆 View In Badges Collection
                    </button>
                    <button type="button" class="celebration-continue-btn" onclick="closeLeetCodeCelebration()">
                        Continue
                    </button>
                </div>
            </div>
        </div>
    `;

    overlay.onclick = closeLeetCodeCelebration;
    document.body.appendChild(overlay);
}
window.showLeetCodeBadgeCelebration = showLeetCodeBadgeCelebration;

function closeLeetCodeCelebration() {
    const el = document.getElementById("leetcodeCelebrationOverlay");
    if (el) el.remove();
}
window.closeLeetCodeCelebration = closeLeetCodeCelebration;

window.testCelebrationModal = function() {
    const b = cachedBadges.find(b => b.id === 'badge_grand_omniverse') || cachedBadges[0];
    showLeetCodeBadgeCelebration(b);
};

function checkAndTriggerNewBadgeCelebration(unlockedBadges) {
    if (!currentUser || !unlockedBadges.length) return;
    const pendingId = sessionStorage.getItem("new_badge_to_celebrate");
    if (!pendingId) return;

    sessionStorage.removeItem("new_badge_to_celebrate");
    const badgeToCelebrate = unlockedBadges.find(b => b.id === pendingId);
    if (badgeToCelebrate) {
        setTimeout(() => {
            showLeetCodeBadgeCelebration(badgeToCelebrate);
        }, 500);
    }
}

// 3D Medallion Inspection Modal
function openBadgeInspectModal(badgeId) {
    const badge = cachedBadges.find(b => b.id === badgeId);
    if (!badge) return;

    let existingModal = document.getElementById("badgeModal");
    if (existingModal) existingModal.remove();

    const pct = Math.min(100, Math.round((badge.currentVal / badge.targetVal) * 100));

    const modal = document.createElement("div");
    modal.id = "badgeModal";
    modal.className = "badge-modal-overlay";
    modal.innerHTML = `
        <div class="badge-modal-box" onclick="event.stopPropagation()">
            <button type="button" class="badge-modal-close" onclick="closeBadgeInspectModal()">&times;</button>
            <div class="badge-modal-medallion-wrap">
                <div style="display: flex; justify-content: center; margin-bottom: 8px;">
                    ${getLeetCodeHexagonSvg(badge, 120)}
                </div>
            </div>
            <div class="badge-tier-ribbon" style="margin-top: 10px;">${badge.tierLabel}</div>
            <h2 style="margin: 8px 0 4px; font-size: 22px; font-weight: 900; color: #0f172a;">${badge.title}</h2>
            <p style="font-size: 13.5px; color: #475569; font-weight: 600; line-height: 1.5; margin: 0 0 16px;">
                ${badge.desc}
            </p>

            <div style="background: #f8fafc; border: 2px solid #000; border-radius: 8px; padding: 12px; margin-bottom: 16px; text-align: left;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; color: #64748b; margin-bottom: 6px;">
                    <span>TARGET CRITERIA</span>
                    <span style="color: ${badge.unlocked ? '#059669' : '#0284c7'};">${badge.currentVal} / ${badge.targetVal} ${badge.unit} (${pct}%)</span>
                </div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
                    🎯 ${badge.criteria}
                </div>
                <div class="badge-progress-track">
                    <div class="badge-progress-fill" style="width: ${pct}%;"></div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #e2e8f0; padding-top: 14px;">
                <span style="font-size: 13px; font-weight: 800; color: #64748b;">
                    ${badge.unlocked ? 'STATUS: <strong style="color: #059669;">EARNED</strong>' : 'STATUS: <strong style="color: #dc2626;">LOCKED</strong>'}
                </span>
                <span style="font-size: 12.5px; font-weight: 900; background: ${badge.unlocked ? '#dcfce7' : '#f1f5f9'}; color: ${badge.unlocked ? '#166534' : '#475569'}; border: 1.5px solid #000; border-radius: 100px; padding: 4px 12px; box-shadow: 2px 2px 0 #000;">
                    ${badge.unlocked ? '✨ UNLOCKED' : '🔒 LOCKED'}
                </span>
            </div>
        </div>
    `;

    modal.onclick = closeBadgeInspectModal;
    document.body.appendChild(modal);
}
window.openBadgeInspectModal = openBadgeInspectModal;

function closeBadgeInspectModal() {
    const modal = document.getElementById("badgeModal");
    if (modal) modal.remove();
}
window.closeBadgeInspectModal = closeBadgeInspectModal;

/* ============================================================
   DAILY READING ACTIVITY SKYLINE INTEGRATION
   ============================================================ */

function initReadingActivitySkyline() {
    const mount = document.getElementById("skylineMount");
    if (!mount || !window.SlushSkyline) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const endMs = Date.now();

    // Check real activity log in localStorage
    let log = {};
    try {
        log = JSON.parse(localStorage.getItem("story_reading_activity_log") || "{}");
    } catch (e) { log = {}; }

    // If today has no recorded count yet, use real completed stories / endings count
    let todayCount = log[todayStr] || 0;
    if (todayCount === 0) {
        const completedCount = (currentUser && currentUser.completedStories) ? currentUser.completedStories.length : 0;
        todayCount = completedCount > 0 ? completedCount : 1;
        log[todayStr] = todayCount;
        try { localStorage.setItem("story_reading_activity_log", JSON.stringify(log)); } catch (e) {}
    }

    // Build exactly 371-day grid where ALL PREVIOUS DAYS ARE BLANK (0 count)
    const realActivityData = [];
    for (let i = 370; i >= 0; i--) {
        const dMs = endMs - i * 86400000;
        const dStr = new Date(dMs).toISOString().slice(0, 10);
        // Only today has real activity, all previous days are 0 (blank)
        const count = (dStr === todayStr) ? todayCount : 0;
        realActivityData.push({ date: dStr, count: count });
    }

    SlushSkyline.render(mount, {
        data: realActivityData,
        endDate: todayStr,
        defaultView: '3d'
    });
}
