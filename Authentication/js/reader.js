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
if (!user ) {
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
                        <p>${story.description || ""}</p>
                        <div class="stat-lockup-box" style="margin-bottom: 20px;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            <span><strong>${sceneCount}</strong> SCENES / NODES</span>
                        </div>
                        <button
                            type="button"
                            class="primary-btn"
                            onclick="startStory('${story.id}')">
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
   START STORY
===================================================== */

function startStory(storyId) {
    window.location.href = `play.html?id=${storyId}`;
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

    /* TOP STAT BADGES (MATCHING SCREENSHOTS) */
    storyHeader.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
            <span class="stat-pill-yellow">DECISIONS MADE: ${decisions}</span>
            <span class="stat-pill-green">PATH LENGTH: ${pathLength} SCENE(S)</span>
        </div>
    `;

    // Clear bottom traversal path during reading
    if (pathContainer) {
        pathContainer.innerHTML = "";
    }

    /* ENDING NODE CARD (MATCHING SCREENSHOT 2) */
    if (currentNode.isEnding) {
        storySession.ended = true;
        storySession.currentNodeId = currentNode.id;
        storySession.endingType = currentNode.endingType;

        let xpMsg = storySession.alreadyClaimed
            ? `<p style="color: #555; font-weight: 800; font-size: 14px; margin: 12px 0;">🏁 Story Completed! (XP already earned for this story)</p>`
            : `<p style="color: #1b5e20; font-weight: 800; font-size: 16px; margin: 12px 0;">🎉 +${COMPLETION_XP} XP Earned for Completing Story!</p>`;

        sceneContainer.innerHTML = "";

        choicesContainer.innerHTML = `
            <div class="story-card ending-card" style="border: 3px solid #000; border-radius: 24px; padding: 32px; box-shadow: 6px 6px 0px #000; background: #fff;">
                <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                    <div style="background: var(--color-green); padding: 8px 20px; border-radius: 100px; border: 2px solid #000; font-weight: 800; font-size: 13px; color: #000; text-transform: uppercase;">
                        🏁 ${currentNode.endingType ? currentNode.endingType.toUpperCase() : "GOOD"} ENDING
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

    /* NORMAL READING NODE (MATCHING SCREENSHOT 1) */
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
        choicesHTML = currentNode.choices.map(choice => `
            <button type="button" class="primary-btn choice-btn-slush" onclick="selectChoice('${choice.targetNodeId}', '${choice.text.replace(/'/g, "\\'")}')">
                <span>${choice.text}</span> <span style="font-size: 18px; font-weight: 900;">→</span>
            </button>
        `).join("");
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

        if (!user.completedStories.includes(storyId)) {
            user.completedStories.push(storyId);
            let currentXp = (user.xp !== undefined) ? user.xp : STARTING_XP;
            let updatedXp = currentXp + COMPLETION_XP;
            user.xp = updatedXp;
            localStorage.setItem("user", JSON.stringify(user));
            storySession.xp = updatedXp;
            storySession.alreadyClaimed = false;

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