let user = null;
try {
    user = JSON.parse(localStorage.getItem("user"));
    if (user) {
        if (user.xp === undefined) user.xp = 100;
        if (!user.completedStories) user.completedStories = [];
        if (!user.usedFreeRetreatStories) user.usedFreeRetreatStories = [];
        localStorage.setItem("user", JSON.stringify(user));
    }
} catch (e) {
    user = null;
}

// Reader must be logged in
if (!user || user.role !== "Reader") {
    window.location.href = "../auth/login.html";
}

function renderUserProfileHeader() {
    let navAuthContainer = document.getElementById("navAuthContainer");
    if (!navAuthContainer || !user) return;

    let initial = user.name ? user.name.charAt(0).toUpperCase() : "U";
    let activeXp = (user.xp !== undefined) ? user.xp : 100;
    let roleTitle = user.role || "Reader";
    let xpBadgeHtml = (user.role !== "Admin") ? `<span class="user-xp-badge">⭐ ${activeXp} XP</span>` : ``;

    navAuthContainer.innerHTML = `
        <div class="user-profile-menu-container">
            <button type="button" class="profile-menu-btn" onclick="toggleProfileDropdown(event)">
                <span class="user-avatar">${initial}</span>
                <span class="user-name-label">${user.name || 'User'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-left: 2px;"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div id="profileDropdown" class="profile-dropdown-menu hidden" onclick="event.stopPropagation()">
                <div class="profile-dropdown-header">
                    <strong>${user.name || 'User'}</strong>
                    <div style="display: flex; gap: 6px; margin-top: 4px; align-items: center;">
                        <span class="user-role-badge">${roleTitle.toUpperCase()}</span>
                        ${xpBadgeHtml}
                    </div>
                </div>
                <div class="profile-dropdown-links">
                    ${user.role === 'Admin' ? `
                        <a href="../admin/admin.html" class="dropdown-item">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            Admin Dashboard
                        </a>
                    ` : ''}
                    <a href="stories.html" class="dropdown-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        Story Library
                    </a>
                    <hr style="border: 0; border-top: 2px solid #000; margin: 6px 0;">
                    <button type="button" class="dropdown-item logout-item" onclick="handleLogout()">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    `;
}

function toggleProfileDropdown(event) {
    if (event) event.stopPropagation();
    let menu = document.getElementById("profileDropdown");
    if (menu) {
        menu.classList.toggle("hidden");
    }
}

document.addEventListener("click", (e) => {
    let menu = document.getElementById("profileDropdown");
    if (menu && !menu.classList.contains("hidden")) {
        if (!e.target.closest(".user-profile-menu-container")) {
            menu.classList.add("hidden");
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
    renderUserProfileHeader();
    checkWelcomeToast();
});
renderUserProfileHeader();

/* =====================================================
   TOAST NOTIFICATION SYSTEM
===================================================== */

function showToastNotification(title, message, icon = "🎉", duration = 4500) {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-notification-container";
        document.body.appendChild(container);
    }

    let toast = document.createElement("div");
    toast.className = "toast-notification-card";
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button type="button" class="toast-close-btn" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("toast-fade-out");
        setTimeout(() => toast.remove(), 350);
    }, duration);
}

function checkWelcomeToast() {
    if (!user || user.role === "Admin") return;

    let userKey = "welcome_toast_shown_" + (user.id || user.email || user.name);

    // Only show ONCE for a brand NEW user account (stored in localStorage)
    if (!localStorage.getItem(userKey)) {
        localStorage.setItem(userKey, "true");
        let activeXp = (user.xp !== undefined) ? user.xp : 100;
        setTimeout(() => {
            showToastNotification(
                "WELCOME EXPLORER!",
                `Welcome, ${user.name || 'Reader'}! You earned +${activeXp} XP starting bonus! ⭐`,
                "🎉"
            );
        }, 400);
    }
}


/* =====================================================
   STORY LIBRARY (SIMPLE & EASY TO EXPLAIN LOGIC)
===================================================== */

let allPublishedStories = [];

// 1. Fetch published stories from backend
function loadStories() {
    let container = document.getElementById("storiesContainer");
    if (!container) return;

    checkWelcomeToast();

    fetch("http://localhost:3000/Stories")
        .then(res => res.json())
        .then(stories => {
            // Keep only published stories
            allPublishedStories = stories.filter(story => story.status === "published");
            filterStories();
        });
}

// 2. Simple search and genre filter logic
function filterStories() {
    let container = document.getElementById("storiesContainer");
    if (!container) return;

    let searchInput = document.getElementById("searchInput").value.toLowerCase().trim();
    let selectedGenre = document.getElementById("genreFilter").value.toLowerCase();

    container.innerHTML = "";
    let count = 0;

    allPublishedStories.forEach(story => {
        let title = (story.title || "").toLowerCase();
        let author = (story.author || "").toLowerCase();
        let genre = (story.genre || "").toLowerCase();

        // Title OR Author match
        let matchesSearch = title.includes(searchInput) || author.includes(searchInput);

        // Genre match (All Genres or exact genre match)
        let matchesGenre = (selectedGenre === "all") || (genre === selectedGenre);

        // If both conditions match, display story card
        if (matchesSearch && matchesGenre) {
            count++;
            let sceneCount = story.nodes ? story.nodes.length : 0;

            container.innerHTML += `
                <div class="story-card">
                    <img
                        src="${story.imageURL || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80"}"
                        alt="${story.title}"
                    >
                    <div class="story-card-content">
                        <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
                            <span class="badge-genre">${(story.genre || "General").toUpperCase()}</span>
                            <span class="badge-status status-published">PUBLISHED</span>
                        </div>
                        <h2>${story.title}</h2>
                        <div class="author-tag" style="margin-bottom: 10px; font-weight: 800; color: var(--color-voltage-violet);">✍️ BY ${(story.author || "ADMIN").toUpperCase()}</div>
                        <p class="story-description">${(story.description || "").length > 110 ? (story.description || "").substring(0, 110) + '... <button type="button" class="view-more-btn" onclick="openStoryDetails(\'' + story.id + '\')">Read More &rarr;</button>' : (story.description || "")}</p>
                        <div class="stat-lockup-box" style="margin-bottom: 20px;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            <span><strong>${sceneCount}</strong> SCENES / NODES</span>
                        </div>
                        <button
                            type="button"
                            class="primary-btn"
                            onclick="openStoryDetails('${story.id}')">
                            Begin Story Experience →
                        </button>
                    </div>
                </div>
            `;
        }
    });

    if (count === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; background: #fff; border: 2px dashed #000; border-radius: 28px; box-shadow: 4px 4px 0 #000; margin: 20px 0;">
                <h2 style="font-family: var(--font-display); font-size: 28px; margin-bottom: 12px; letter-spacing: -0.01em;">NO PUBLISHED STORIES AVAILABLE</h2>
                <p style="font-weight: 700; font-size: 15px; color: #444; max-width: 500px; margin: 0 auto; line-height: 1.5;">There are no stories matching your filter criteria.</p>
            </div>
        `;
    }
}


/* =====================================================
   STORY DETAIL SHOWCASE MODAL & WORLD PORTAL TRANSITION
===================================================== */

function openStoryDetails(storyId) {
    let story = allPublishedStories.find(s => s.id === storyId);
    if (!story) return;

    let modal = document.getElementById("storyDetailModal");
    if (!modal) return;

    let card = modal.querySelector(".story-detail-card");
    let sceneCount = story.nodes ? story.nodes.length : 0;

    // Count endings (nodes where isEnding === true)
    let endingsCount = 0;
    if (story.nodes && story.nodes.length > 0) {
        endingsCount = story.nodes.filter(n => n.isEnding).length;
    }
    if (endingsCount === 0) endingsCount = 1;

    card.innerHTML = `
        <img class="detail-cover-img" src="${story.imageURL || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'}" alt="${story.title}">
        
        <div class="detail-main-info">
            <div>
                <div class="detail-badges-row">
                    <span class="badge-genre">${(story.genre || "General").toUpperCase()}</span>
                    <span class="badge-status status-published">PUBLISHED</span>
                </div>
                
                <h1 class="detail-title">${story.title}</h1>
                <div class="detail-author">✍️ By ${(story.author || "ADMIN").toUpperCase()}</div>
                
                <div class="detail-description-box">
                    ${story.description || "Immerse yourself in a dynamic choose-your-own-adventure experience where your choices determine the story."}
                </div>
            </div>

            <div>
                <div class="detail-stats-grid">
                    <div class="detail-stat-box yellow">
                        <div class="detail-stat-num">${sceneCount}</div>
                        <div class="detail-stat-label">SCENES / NODES</div>
                    </div>
                    <div class="detail-stat-box green">
                        <div class="detail-stat-num">${endingsCount}</div>
                        <div class="detail-stat-label">UNIQUE ENDINGS</div>
                    </div>
                </div>

                <div class="detail-actions-row">
                    <button type="button" class="enter-world-btn" onclick="enterStoryWorld('${story.id}')">
                        ⚡ Begin Story Experience →
                    </button>
                    <button type="button" class="back-library-btn" onclick="closeStoryDetails()">
                        ← Back to Library
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove("hidden");
}

function closeStoryDetails(event) {
    if (event) event.stopPropagation();
    let modal = document.getElementById("storyDetailModal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

function enterStoryWorld(storyId) {
    window.location.href = `play.html?id=${storyId}`;
}

function startStory(storyId) {
    openStoryDetails(storyId);
}


/* =====================================================
   STORY PLAYER
===================================================== */

// Get story ID from URL
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get("id");

let currentStory = null;
let currentNode = null;
let traversalPath = [];
let storySession = null;

// XP required after free retreat
const RETREAT_COST = 10;
// Starting XP
const STARTING_XP = 100;
// Reward XP for completing story
const COMPLETION_XP = 5;

function getSessionStorageKey(userId, storyId) {
    return `active_session_${userId}_${storyId}`;
}


/* =====================================================
   LOAD SELECTED STORY
===================================================== */

async function loadStory() {
    if (!storyId) {
        return;
    }

    try {
        /* -------------------------------------------------
           LOAD STORY METADATA & NODES
        ------------------------------------------------- */
        let response = await fetch(
            `http://localhost:3000/Stories/${storyId}`
        );

        if (!response.ok) {
            alert("Unable to load story");
            window.location.href = "stories.html";
            return;
        }

        currentStory = await response.json();

        if (!currentStory.nodes || currentStory.nodes.length === 0) {
            alert("This story does not contain any scenes.");
            return;
        }

        let startingNode = currentStory.nodes.find(
            node => node.id === currentStory.startNodeId
        ) || currentStory.nodes[0];

        if (!startingNode) {
            alert("This story does not have a starting scene.");
            return;
        }

        if (user && user.id) {
            try {
                let uRes = await fetch(`http://localhost:3000/Users/${user.id}`);
                if (uRes.ok) {
                    let freshUser = await uRes.json();
                    user.xp = freshUser.xp !== undefined ? freshUser.xp : user.xp;
                    user.completedStories = freshUser.completedStories || user.completedStories || [];
                    localStorage.setItem("user", JSON.stringify(user));
                }
            } catch(e) {}
        }
        const userId = user ? (user.id || user.name) : "guest";
        const storageKey = getSessionStorageKey(userId, storyId);

        /* -------------------------------------------------
           1. CHECK LOCALSTORAGE FIRST FOR FAST & PERSISTENT SESSION
        ------------------------------------------------- */
        let localSaved = localStorage.getItem(storageKey);
        if (localSaved) {
            try {
                let parsedSession = JSON.parse(localSaved);
                if (parsedSession && parsedSession.currentNodeId) {
                    let savedNode = currentStory.nodes.find(
                        node => node.id === parsedSession.currentNodeId
                    );

                    if (savedNode) {
                        storySession = parsedSession;
                        currentNode = savedNode;
                        traversalPath = storySession.traversalPath || [];

                        if (user && user.usedFreeRetreatStories && user.usedFreeRetreatStories.includes(storyId)) {
                            storySession.freeRetreatUsed = true;
                        }

                        showStory();
                        return;
                    }
                }
            } catch (e) {
                console.warn("Invalid local session format, fetching backend session...");
            }
        }

        /* -------------------------------------------------
           2. CHECK BACKEND FOR EXISTING SESSION
        ------------------------------------------------- */
        try {
            let sessionResponse = await fetch(
                `http://localhost:3000/StorySessions?userId=${encodeURIComponent(userId)}&storyId=${encodeURIComponent(storyId)}`
            );

            if (sessionResponse.ok) {
                let sessions = await sessionResponse.json();

                if (sessions && sessions.length > 0) {
                    storySession = sessions[sessions.length - 1];
                    traversalPath = storySession.traversalPath || [];

                    currentNode = currentStory.nodes.find(
                        node => node.id === storySession.currentNodeId
                    );

                    if (!currentNode) {
                        await createNewSession(startingNode, userId);
                        return;
                    }

                    if (user && user.usedFreeRetreatStories && user.usedFreeRetreatStories.includes(storyId)) {
                        storySession.freeRetreatUsed = true;
                    }

                    localStorage.setItem(storageKey, JSON.stringify(storySession));
                    showStory();
                    return;
                }
            }
        } catch (e) {
            console.warn("Backend session query skipped due to network:", e);
        }

        /* -------------------------------------------------
           3. NO SESSION FOUND -> CREATE NEW SESSION
        ------------------------------------------------- */
        await createNewSession(startingNode, userId);
    } catch (error) {
        console.error("Error loading story player:", error);
    }
}


/* =====================================================
   CREATE NEW STORY SESSION
===================================================== */

async function createNewSession(startingNode, userId) {
    currentNode = startingNode;

    traversalPath = [
        {
            nodeId: startingNode.id,
            title: startingNode.title,
            choiceText: null
        }
    ];

    let userXp = (user && user.xp !== undefined) ? user.xp : STARTING_XP;
    let isFreeUsed = Boolean(user && user.usedFreeRetreatStories && user.usedFreeRetreatStories.includes(storyId));

    storySession = {
        userId: userId,
        storyId: storyId,
        currentNodeId: startingNode.id,
        traversalPath: traversalPath,
        visitedNodeIds: [startingNode.id],
        freeRetreatUsed: isFreeUsed,
        xp: userXp,
        alreadyClaimed: false,
        ended: startingNode.isEnding || false,
        endingType: startingNode.isEnding ? startingNode.endingType : null
    };

    const storageKey = getSessionStorageKey(userId, storyId);
    localStorage.setItem(storageKey, JSON.stringify(storySession));

    try {
        let response = await fetch("http://localhost:3000/StorySessions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(storySession)
        });

        if (response && response.ok) {
            storySession = await response.json();
            localStorage.setItem(storageKey, JSON.stringify(storySession));
        }
    } catch (error) {
        console.warn("Could not post new session to backend:", error);
    }

    showStory();
}


/* =====================================================
   SAVE STORY SESSION (NON-BLOCKING)
===================================================== */

async function saveStorySession() {
    if (!storySession) {
        return;
    }

    const userId = user ? (user.id || user.name) : "guest";
    const storageKey = getSessionStorageKey(userId, storyId);

    storySession.traversalPath = traversalPath;
    storySession.currentNodeId = currentNode ? currentNode.id : storySession.currentNodeId;

    if (user && user.xp !== undefined) {
        storySession.xp = user.xp;
    }

    if (user && user.usedFreeRetreatStories && user.usedFreeRetreatStories.includes(storyId)) {
        storySession.freeRetreatUsed = true;
    }

    localStorage.setItem(storageKey, JSON.stringify(storySession));

    try {
        if (storySession.id) {
            await fetch(
                `http://localhost:3000/StorySessions/${storySession.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(storySession)
                }
            ).catch(e => console.warn("Backend PUT failed:", e));
        } else {
            let res = await fetch("http://localhost:3000/StorySessions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(storySession)
            }).catch(e => null);

            if (res && res.ok) {
                let saved = await res.json();
                storySession.id = saved.id;
                localStorage.setItem(storageKey, JSON.stringify(storySession));
            }
        }
    } catch (error) {
        console.warn("Error syncing session to backend:", error);
    }
}


/* =====================================================
   DISPLAY STORY
===================================================== */

function showStory() {
    let storyHeader = document.getElementById("storyHeader");
    let sceneContainer = document.getElementById("sceneContainer");
    let choicesContainer = document.getElementById("choicesContainer");
    let pathContainer = document.getElementById("traversalPath");

    if (!storyHeader || !sceneContainer || !choicesContainer) {
        return;
    }

    let decisions = Math.max(traversalPath.length - 1, 0);
    let pathLength = traversalPath.length;
    let visitedIds = (storySession && storySession.visitedNodeIds) ? storySession.visitedNodeIds : [];

    /* TOP STAT BADGES */
    storyHeader.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
            <span class="stat-pill-yellow">DECISIONS MADE: ${decisions}</span>
            <span class="stat-pill-green">SCENE: ${pathLength}</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 16px;">
            ${traversalPath.map((item, i) => `
                <span style="background:#fff; border:2px solid #000; border-radius:100px; padding:3px 12px; font-size:12px; font-weight:800; box-shadow:2px 2px 0 #000;">${i + 1}. ${item.title}</span>
                ${i < traversalPath.length - 1 ? '<span style="font-weight:900;">→</span>' : ''}
            `).join('')}
        </div>
    `;

    // Clear bottom traversal path during reading
    if (pathContainer) {
        pathContainer.innerHTML = "";
    }

    /* ENDING NODE CARD */
    if (currentNode.isEnding) {
        // Hide top stat bar and breadcrumb on ending screen
        storyHeader.innerHTML = "";

        storySession.ended = true;
        storySession.currentNodeId = currentNode.id;
        storySession.endingType = currentNode.endingType;

        // Colour-code the ending badge by type
        let endType = (currentNode.endingType || "good").toLowerCase();
        let endingBg = endType === "good" ? "#34d399" : endType === "tragic" ? "#fb923c" : "#f87171";

        let endingEmoji = endType === "good" ? "🏆" : endType === "tragic" ? "😢" : "💀";

        let isAlreadyCompleted = user && user.completedStories && user.completedStories.some(id => String(id) === String(storyId));
        let xpMsg = isAlreadyCompleted || storySession.alreadyClaimed
            ? `<p style="color: #555; font-weight: 800; font-size: 14px; margin: 12px 0;">🏁 Story Completed! (XP already earned for this story)</p>`
            : `<p style="color: #1b5e20; font-weight: 800; font-size: 16px; margin: 12px 0;">🎉 +${COMPLETION_XP} XP Earned for Completing Story!</p>`;

        sceneContainer.innerHTML = "";

        choicesContainer.innerHTML = `
            <div class="story-card ending-card" style="border: 3px solid #000; border-radius: 24px; padding: 32px; box-shadow: 6px 6px 0px #000; background: #fff;">
                <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                    <div style="background: ${endingBg}; padding: 8px 20px; border-radius: 100px; border: 2px solid #000; font-weight: 800; font-size: 13px; color: #000; text-transform: uppercase;">
                        ${endingEmoji} ${endType.toUpperCase()} ENDING
                    </div>

                    <h1 style="font-family: var(--font-display); font-size: 34px; margin: 18px 0 14px 0; text-transform: uppercase; color: #000;">${currentNode.title || "THE END"}</h1>
                    
                    <div style="background: var(--color-sky); border: 2px solid #000; border-radius: 16px; padding: 20px; width: 100%; text-align: left; margin-bottom: 20px; box-shadow: 3px 3px 0px #000;">
                        <p style="font-size: 16px; line-height: 1.6; font-weight: 600; color: #000; margin: 0;">${currentNode.text || "You have reached the end of this story path."}</p>
                    </div>

                    <!-- Narrative Traversal Path Box at End (MATCHING SCREENSHOT 2) -->
                    <div style="background: var(--color-lavender); border: 2px solid #000; border-radius: 16px; padding: 20px; width: 100%; margin-bottom: 20px; box-shadow: 3px 3px 0px #000;">
                        <h4 style="font-weight: 800; font-size: 14px; text-transform: uppercase; color: #000; margin-bottom: 12px; text-align: center;">
                            Your Narrative Traversal Path (${decisions} decisions made):
                        </h4>
                        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px;">
                            ${traversalPath.map((item, index) => `
                                <span style="background: #fff; border: 2px solid #000; padding: 6px 14px; border-radius: 100px; font-weight: 800; font-size: 13px; box-shadow: 2px 2px 0px #000; color: #000;">
                                    ${index + 1}. ${item.title}
                                </span>
                                ${index < traversalPath.length - 1 ? `<span style="font-weight: 900; color: #000;">→</span>` : ''}
                            `).join('')}
                        </div>
                    </div>

                    ${xpMsg}

                    <div style="display: flex; gap: 16px; width: 100%; margin-top: 14px; flex-wrap: wrap;">
                        <button type="button" class="primary-btn" onclick="restartStory()" style="flex: 1; background: var(--color-violet); color: #fff;">
                            🔄 Play Again
                        </button>
                        <button type="button" class="primary-btn" onclick="backToLibrary()" style="flex: 1; background: #fff; color: #000;">
                            📚 Return to Library
                        </button>
                    </div>
                </div>
            </div>
        `;
        return;
    }


    let locationText = currentNode.location ? currentNode.location.toUpperCase() : "UNKNOWN";
    let charsText = (currentNode.characters && currentNode.characters.length > 0)
        ? `👥 PRESENT: ${currentNode.characters.join(", ").toUpperCase()}`
        : "";

    let isFreeUsed = (storySession && storySession.freeRetreatUsed) || (user && user.usedFreeRetreatStories && user.usedFreeRetreatStories.includes(storyId));
    let retreatText = isFreeUsed ? `← RETREAT (-${RETREAT_COST} XP)` : "← RETREAT (FREE)";
    let activeXp = (user && user.xp !== undefined) ? user.xp : (storySession ? storySession.xp : STARTING_XP);

    let retreatButtonHtml = "";
    if (traversalPath.length > 1) {
        retreatButtonHtml = `
            <div style="margin-top: 24px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">
                <button type="button" class="primary-btn" onclick="retreat()" style="width: auto; background: var(--color-yellow); padding: 10px 24px;">
                    ${retreatText}
                </button>
                <span style="font-weight: 800; font-size: 13px;">⭐ XP: ${activeXp}</span>
            </div>
        `;
    }

    let choicesHTML = "";
    if (currentNode.choices && currentNode.choices.length > 0) {
        choicesHTML = currentNode.choices.map(choice => {
            let isVisited = visitedIds.includes(choice.targetNodeId);
            let visitedBadge = isVisited
                ? `<span style="font-size:11px; font-weight:900; background:#000; color:#fff; padding:2px 8px; border-radius:100px; margin-left:8px; letter-spacing:0.05em;">VISITED</span>`
                : "";
            let btnStyle = isVisited
                ? `background: #f0f0f0; color: #555; border-color: #999; box-shadow: 2px 2px 0 #999; opacity: 0.85;`
                : ``;
            return `
                <button type="button" class="primary-btn choice-btn-slush" style="${btnStyle}" onclick="selectChoice('${choice.targetNodeId}', '${choice.text.replace(/'/g, "\\'")}')"> 
                    <span>${choice.text}</span>${visitedBadge} <span style="font-size: 18px; font-weight: 900;">→</span>
                </button>
            `;
        }).join("");
    } else {
        choicesHTML = `
            <p style="font-style: italic; color: #666; font-weight: 700; text-align: center; margin: 16px 0;">No choice options available for this scene yet.</p>
        `;
    }

    sceneContainer.innerHTML = `
        <div class="story-card" style="border: 3px solid #000; border-radius: 24px; padding: 32px; box-shadow: 6px 6px 0px #000; background: #fff;">
            <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
                <span class="stat-pill-yellow">📍 ${locationText}</span>
                ${charsText ? `<span class="stat-pill-yellow">${charsText}</span>` : ""}
            </div>
            <h1 style="font-family: var(--font-display); font-size: 32px; margin-bottom: 18px; text-transform: uppercase; color: #000;">${currentNode.title}</h1>
            <div style="background: var(--color-sky); border: 2px solid #000; border-radius: 16px; padding: 20px; margin-bottom: 24px; box-shadow: 3px 3px 0px #000;">
                <p style="font-size: 16px; line-height: 1.6; font-weight: 600; color: #000; margin: 0;">${currentNode.text}</p>
            </div>
            <h3 style="font-weight: 800; font-size: 14px; text-transform: uppercase; margin-bottom: 16px; color: #000;">WHAT DO YOU DO?</h3>
            <div id="readerChoices">
                ${choicesHTML}
                ${retreatButtonHtml}
            </div>
            <div id="xpWarningContainer"></div>
        </div>
    `;

    choicesContainer.innerHTML = "";
}


/* =====================================================
   SHOW TRAVERSAL PATH
===================================================== */

function showTraversalPath() {
    // Only used to trigger render updates
}

function showXpWarning(message) {
    let warningBox = document.getElementById("xpWarningContainer");
    if (warningBox) {
        warningBox.innerHTML = `
            <div style="background-color: #ffebee; color: #c62828; padding: 12px; border-radius: 8px; margin: 10px 0; font-weight: bold; text-align: center; border: 1px solid #ef9a9a;">
                ⚠️ ${message}
            </div>
        `;
    }
}


/* =====================================================
   RETREAT
===================================================== */

function retreat() {
    if (!currentNode) {
        return;
    }

    if (currentNode.isEnding) {
        alert("You cannot retreat after reaching an ending.");
        return;
    }

    if (traversalPath.length <= 1) {
        alert("You are already at the beginning.");
        return;
    }

    let activeXp = (user && user.xp !== undefined) ? user.xp : (storySession ? storySession.xp : STARTING_XP);

    if (!user) {
        user = { xp: activeXp, usedFreeRetreatStories: [] };
    }
    if (!user.usedFreeRetreatStories) {
        user.usedFreeRetreatStories = [];
    }

    let freeAlreadyUsed = user.usedFreeRetreatStories.includes(storyId) || (storySession && storySession.freeRetreatUsed);

    if (!freeAlreadyUsed) {
        user.usedFreeRetreatStories.push(storyId);
        localStorage.setItem("user", JSON.stringify(user));
        if (storySession) {
            storySession.freeRetreatUsed = true;
        }
        showToastNotification("FREE RETREAT USED!", "You rewound 1 scene back using your free retreat token! ⏪", "⚡");
    } else {
        if (activeXp < RETREAT_COST) {
            let msg = "Not enough XP! Read other stories to earn XP.";
            showXpWarning(msg);
            showToastNotification("INSUFFICIENT XP", msg, "⚠️");
            return;
        }

        activeXp -= RETREAT_COST;
        user.xp = activeXp;
        localStorage.setItem("user", JSON.stringify(user));
        if (storySession) {
            storySession.xp = activeXp;
        }
        showToastNotification("TIME-WARP RETREAT!", `Rewound 1 scene back! -${RETREAT_COST} XP used. ⭐`, "⏪");
    }

    // Sync user retreat XP and free retreat token to db.json backend
    if (user && user.id) {
        fetch(`http://localhost:3000/Users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                xp: user.xp,
                usedFreeRetreatStories: user.usedFreeRetreatStories
            })
        }).catch(e => console.warn("Could not sync retreat XP to db.json:", e));
    }

    traversalPath.pop();

    let previous = traversalPath[traversalPath.length - 1];

    currentNode = currentStory.nodes.find(
        node => node.id === previous.nodeId
    );

    storySession.ended = false;
    storySession.endingType = null;
    storySession.currentNodeId = currentNode.id;
    storySession.traversalPath = traversalPath;

    showStory();
    saveStorySession();
}


/* =====================================================
   RESTART STORY
===================================================== */

function restartStory() {
    let startingNode = currentStory.nodes.find(
        node => node.id === currentStory.startNodeId
    ) || currentStory.nodes[0];

    if (!startingNode) {
        alert("Starting node not found.");
        return;
    }

    currentNode = startingNode;

    traversalPath = [
        {
            nodeId: startingNode.id,
            title: startingNode.title,
            choiceText: null
        }
    ];

    let activeXp = (user && user.xp !== undefined) ? user.xp : STARTING_XP;
    let isFreeUsed = Boolean(user && user.usedFreeRetreatStories && user.usedFreeRetreatStories.includes(storyId));

    storySession.currentNodeId = startingNode.id;
    storySession.traversalPath = traversalPath;

    storySession.freeRetreatUsed = isFreeUsed;
    storySession.xp = activeXp;
    storySession.ended = startingNode.isEnding || false;
    storySession.endingType = startingNode.isEnding ? startingNode.endingType : null;

    showStory();
    saveStorySession();
}


/* =====================================================
   BACK TO LIBRARY
===================================================== */

function backToLibrary() {
    window.location.href = "stories.html";
}


/* =====================================================
   SELECT CHOICE
===================================================== */

function selectChoice(targetNodeId, choiceText) {
    let nextNode = currentStory.nodes.find(
        node => node.id === targetNodeId
    );

    if (!nextNode) {
        alert("Target node not found");
        return;
    }

    currentNode = nextNode;

    traversalPath.push({
        nodeId: nextNode.id,
        title: nextNode.title,
        choiceText: choiceText
    });

    // Track visited node IDs so choices can show VISITED badge
    if (!storySession.visitedNodeIds) storySession.visitedNodeIds = [];
    if (!storySession.visitedNodeIds.includes(nextNode.id)) {
        storySession.visitedNodeIds.push(nextNode.id);
    }

    storySession.currentNodeId = nextNode.id;
    storySession.traversalPath = traversalPath;

    if (nextNode.isEnding) {
        storySession.ended = true;
        storySession.endingType = nextNode.endingType;

        if (!user) {
            user = { xp: STARTING_XP, completedStories: [] };
        }
        if (!user.completedStories) {
            user.completedStories = [];
        }

        let isAlreadyCompleted = user.completedStories.some(id => String(id) === String(storyId));

        if (!isAlreadyCompleted) {
            user.completedStories.push(storyId);
            let currentXp = (user.xp !== undefined) ? user.xp : STARTING_XP;
            let updatedXp = currentXp + COMPLETION_XP;
            user.xp = updatedXp;
            localStorage.setItem("user", JSON.stringify(user));
            storySession.xp = updatedXp;
            storySession.alreadyClaimed = false;

            // Sync user completion & XP to db.json backend permanently
            if (user.id) {
                fetch(`http://localhost:3000/Users/${user.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        xp: updatedXp,
                        completedStories: user.completedStories
                    })
                }).catch(e => console.warn("Could not sync user XP to db.json:", e));
            }

            showToastNotification(
                "STORY COMPLETED!",
                `Awesome choice! You completed the story and earned +${COMPLETION_XP} XP bonus! ⭐`,
                "🏆"
            );
        } else {
            storySession.alreadyClaimed = true;
            showToastNotification(
                "STORY ENDING REACHED!",
                `You reached an ending! (Completion XP previously claimed)`,
                "✨"
            );
        }
    } else {
        storySession.ended = false;
        storySession.endingType = null;
    }

    showStory();
    saveStorySession();
}


/* =====================================================
   LOGOUT
===================================================== */

function handleLogout() {
    const userId = user ? (user.id || user.name) : "guest";
    if (storyId) {
        localStorage.removeItem(getSessionStorageKey(userId, storyId));
    }
    localStorage.removeItem("user");
    localStorage.removeItem("storySession");
    window.location.href = "../auth/login.html";
}


/* =====================================================
   PAGE INITIALIZATION
===================================================== */

// Story Library
loadStories();

// Story Player
loadStory();


/* =====================================================
   READER TAB SWITCHING
===================================================== */

function switchReaderTab(tab) {
    let views = ["library", "pitch", "mypitches"];
    let tabs = { library: "tabLibrary", pitch: "tabPitch", mypitches: "tabMyPitches" };
    let viewIds = { library: "viewLibrary", pitch: "viewPitch", mypitches: "viewMyPitches" };
    let controls = document.getElementById("libraryControls");

    views.forEach(t => {
        let viewEl = document.getElementById(viewIds[t]);
        let tabEl = document.getElementById(tabs[t]);
        if (viewEl) viewEl.style.display = (t === tab) ? "" : "none";
        if (tabEl) {
            tabEl.style.background = (t === tab) ? "#000" : "#fff";
            tabEl.style.color = (t === tab) ? "#fff" : "#000";
            tabEl.style.boxShadow = (t === tab) ? "3px 3px 0px #555" : "3px 3px 0px #000";
        }
    });

    if (controls) controls.style.display = (tab === "library") ? "flex" : "none";

    if (tab === "mypitches") loadMyPitches();

    // Reset pitch form on switch
    if (tab === "pitch") {
        let errEl = document.getElementById("pitchFormError");
        let sucEl = document.getElementById("pitchFormSuccess");
        if (errEl) errEl.style.display = "none";
        if (sucEl) sucEl.style.display = "none";
    }
}

/* =====================================================
   STORY PITCH SUBMISSION SYSTEM
===================================================== */

async function submitPitch() {
    let title = (document.getElementById("pitchTitle").value || "").trim();
    let genre = document.getElementById("pitchGenre").value;
    let description = (document.getElementById("pitchDescription").value || "").trim();

    let errorEl = document.getElementById("pitchFormError");
    let successEl = document.getElementById("pitchFormSuccess");
    errorEl.style.display = "none";
    successEl.style.display = "none";

    if (!title) {
        errorEl.textContent = "⚠️ Please enter a story title.";
        errorEl.style.display = "block";
        return;
    }
    if (description.length < 20) {
        errorEl.textContent = "⚠️ Please write a more detailed pitch (at least 20 characters).";
        errorEl.style.display = "block";
        return;
    }

    let btn = document.getElementById("pitchSubmitBtn");
    btn.disabled = true;
    btn.textContent = "Submitting...";

    let pitch = {
        title: title,
        genre: genre,
        description: description,
        submittedBy: user ? user.name : "Anonymous",
        submittedById: user ? (user.id || null) : null,
        status: "pending",
        submittedAt: new Date().toISOString()
    };

    try {
        let response = await fetch("http://localhost:3000/ReaderStories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pitch)
        });

        if (!response.ok) throw new Error("Server error");

        let savedPitch = await response.json();

        // Award +20 XP — ONCE PER DAY
        let today = new Date().toISOString().slice(0, 10); // "2026-08-23"
        let lastXpDay = localStorage.getItem("lastPitchXpDay");
        let xpAwarded = false;

        if (lastXpDay !== today && user && user.id) {
            let currentXp = user.xp !== undefined ? user.xp : 100;
            let updatedXp = currentXp + 20;
            user.xp = updatedXp;
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("lastPitchXpDay", today);

            fetch("http://localhost:3000/Users/" + user.id, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ xp: updatedXp })
            }).catch(e => {});

            xpAwarded = true;
        }

        // Clear form
        document.getElementById("pitchTitle").value = "";
        document.getElementById("pitchDescription").value = "";
        document.getElementById("pitchCharCount").textContent = "0 / 600";
        document.getElementById("pitchGenre").value = "fantasy";

        successEl.textContent = xpAwarded
            ? "🎉 Pitch submitted! The admin will review your idea. +20 XP awarded!"
            : "✅ Pitch submitted! The admin will review your idea. (Daily XP already earned today)";
        successEl.style.display = "block";

        btn.disabled = false;
        btn.textContent = "🚀 SUBMIT MY PITCH";

        // Auto switch to My Pitches after 2s
        setTimeout(() => {
            switchReaderTab("mypitches");
        }, 2000);

    } catch(e) {
        errorEl.textContent = "❌ Could not submit pitch. Check your connection and try again.";
        errorEl.style.display = "block";
        btn.disabled = false;
        btn.textContent = "🚀 SUBMIT MY PITCH";
    }
}

async function loadMyPitches() {
    if (!user) return;

    let container = document.getElementById("myPitchesContainer");
    if (!container) return;
    container.innerHTML = '<p style="font-weight: 700; color: #888;">Loading your pitches...</p>';

    try {
        // Always fetch fresh from backend — do NOT use localStorage cache for status
        let response = await fetch("http://localhost:3000/ReaderStories?submittedById=" + (user.id || ""));
        let pitches = response.ok ? await response.json() : [];

        if (pitches.length === 0) {
            container.innerHTML = `
                <div style="border: 3px dashed #000; border-radius: 24px; padding: 48px 24px; text-align: center; background: #fff; box-shadow: 6px 6px 0px #000;">
                    <h2 style="font-family: var(--font-display); font-size: 26px; margin-bottom: 12px;">NO PITCHES YET</h2>
                    <p style="font-weight: 700; color: #555; margin-bottom: 20px;">You haven't submitted any story pitches yet.</p>
                    <button onclick="switchReaderTab('pitch')" style="padding: 12px 28px; border: 2.5px solid #000; border-radius: 100px; font-family: var(--font-display); font-size: 16px; background: #ffde59; box-shadow: 4px 4px 0px #000; cursor: pointer; font-weight: 900;">✍️ Submit My First Pitch</button>
                </div>
            `;
            return;
        }

        container.innerHTML = pitches.map(p => {
            let statusColor = p.status === "approved" ? "#39d39f" : p.status === "rejected" ? "#ff6b6b" : "#ffde59";
            let statusText = (p.status || "pending").toUpperCase();
            let statusIcon = p.status === "approved" ? "✅" : p.status === "rejected" ? "✕" : "⏳";
            let dateStr = p.submittedAt ? new Date(p.submittedAt).toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"}) : "";

            let adminCommentHtml = (p.adminComment) ? `
                <div style="margin-top: 14px; background: ${p.status === "approved" ? "#f0fff4" : p.status === "rejected" ? "#fff0f0" : "#fffbeb"}; border: 2px solid ${p.status === "approved" ? "#22c55e" : p.status === "rejected" ? "#ff6b6b" : "#f59e0b"}; border-radius: 12px; padding: 12px 16px; font-size: 13px; font-weight: 700; color: #333; line-height: 1.6;">
                    💬 <span style="font-weight: 900;">Admin:</span> <em>${p.adminComment}</em>
                </div>
            ` : (p.status === "pending" ? `
                <div style="margin-top: 14px; background: #fffbeb; border: 1.5px dashed #f59e0b; border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 700; color: #92400e;">
                    ⏳ Awaiting admin review...
                </div>
            ` : "");

            return `
                <div style="background: #fff; border: 2.5px solid #000; border-radius: 20px; padding: 24px 28px; box-shadow: 4px 4px 0px #000;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px;">
                            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
                                <span style="background: #e0e7ff; border: 1.5px solid #000; border-radius: 100px; padding: 3px 12px; font-size: 12px; font-weight: 800;">${(p.genre || "general").toUpperCase()}</span>
                                <span style="background: ${statusColor}; border: 1.5px solid #000; border-radius: 100px; padding: 3px 12px; font-size: 12px; font-weight: 800;">${statusIcon} ${statusText}</span>
                            </div>
                            <h3 style="font-family: var(--font-display); font-size: 20px; margin: 0 0 8px;">${p.title}</h3>
                            <p style="font-size: 14px; color: #444; font-weight: 600; margin: 0; line-height: 1.7;">${p.description}</p>
                            ${adminCommentHtml}
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                            <div style="font-size: 12px; font-weight: 800; color: #888; white-space: nowrap;">${dateStr}</div>
                            <button onclick="deleteMyPitch('${p.id}')" style="padding: 6px 14px; border: 2px solid #000; border-radius: 100px; background: #fff; font-weight: 800; font-size: 12px; cursor: pointer; box-shadow: 2px 2px 0px #000; font-family: var(--font-ui); color: #e00;" title="Delete pitch permanently">
                                🗑 Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

    } catch(e) {
        container.innerHTML = '<p style="font-weight: 700; color: #e00; padding: 8px;">Could not load pitches. Check your connection.</p>';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    switchReaderTab("library");
});


/* Reader function to permanently delete their pitch */
async function deleteMyPitch(pitchId) {
    if (!confirm("Are you sure you want to delete this pitch from your list?")) return;

    try {
        let res = await fetch("http://localhost:3000/ReaderStories/" + pitchId, {
            method: "DELETE"
        });
        if (res.ok) {
            loadMyPitches();
        } else {
            alert("Could not delete pitch.");
        }
    } catch(e) {
        alert("Error connecting to server.");
    }
}
