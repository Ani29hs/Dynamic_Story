
/* ============================================================
   reader.js
   Pages: pages/reader/stories.html  (Story Library tab)
          pages/reader/play.html      (Story Player tab)
   Role:  The entire reader experience — story browsing,
          playing, XP system, pitching, rating, and more.

   ── FLOW (Top to Bottom — Page Load Order) ──────────────────
   SECTION  1  calculateRatingStats()     Utility — compute avg rating
   SECTION  2  Auth Guard + User Setup    Redirect non-readers, init defaults
   SECTION  3  renderUserProfileHeader()  Inject reader avatar + dropdown
   SECTION  4  toggleProfileDropdown()    Open/close profile menu
   SECTION  5  Global click listener      Close dropdown on outside click
   SECTION  6  DOMContentLoaded listener  Init header + welcome toast
   SECTION  7  showToastNotification()    Toast popup system
   SECTION  8  checkWelcomeToast()        Welcome / XP toast on first login
   ────────────────────────────────────────────────────────────
   SECTION  9  allPublishedStories []     State — fetched story list cache
   SECTION 10  loadStories()              Fetch published stories from DB
   SECTION 11  filterStories()            Search + genre filter logic
   SECTION 12  openStoryDetails()         Show story detail modal
   SECTION 13  closeStoryDetails()        Hide story detail modal
   SECTION 14  enterStoryWorld()          Navigate to play.html?id=
   SECTION 15  startStory()              Alias → openStoryDetails()
   ────────────────────────────────────────────────────────────
   SECTION 16  Story Player State         URL params, traversal vars
   SECTION 17  Constants                  XP costs and defaults
   SECTION 18  getSessionStorageKey()     Build localStorage key per user+story
   SECTION 19  loadStory()               Main player init — fetch + resume/create session
   SECTION 20  createNewSession()         Start a brand-new reading session
   SECTION 21  saveStorySession()         Persist session to localStorage + backend
   SECTION 22  showStory()               Render current node (ending card OR scene card)
   SECTION 23  showTraversalPath()        Stub (triggers re-render updates)
   SECTION 24  showXpWarning()            Show XP-too-low warning in scene card
   SECTION 25  retreat()                 Undo last choice (XP cost logic)
   SECTION 26  restartStory()            Reset to story start node
   SECTION 27  backToLibrary()           Navigate back to stories.html
   SECTION 28  selectChoice()            Advance to chosen node + award XP
   ────────────────────────────────────────────────────────────
   SECTION 29  handleLogout()            Clear session → login.html
   SECTION 30  switchReaderTab()         Switch Story Library / Submit / My Pitches tabs
   SECTION 31  submitPitch()             Submit a new story pitch
   SECTION 32  loadMyPitches()           Fetch and render reader's own pitches
   SECTION 33  deleteMyPitch()           Permanently delete a reader's pitch
   SECTION 34  submitStoryRating()       Submit or update a star rating
   SECTION 35  wireNavPillAccents()      IIFE — wire data-accent → CSS var on .tab-pill

   ── DATA FLOW (json-server, port 3000) ───────────────────────
   GET    /Stories                  → published story cards
   GET    /Stories/:id              → single story for rating update
   PATCH  /Stories/:id              → update ratings[]
   GET    /StorySessions?userId=&storyId= → resume active session
   POST   /StorySessions            → create new session
   PUT    /StorySessions/:id        → update session on every move
   GET    /Users/:id                → check for pendingToast
   PATCH  /Users/:id                → clear toast, sync XP + usedFreeRetreat
   GET    /ReaderStories?submittedById= → reader's own pitches
   POST   /ReaderStories            → submit new pitch
   DELETE /ReaderStories/:id        → permanently delete a pitch
   ============================================================ */


/* ============================================================
   SECTION 1 — UTILITY: calculateRatingStats(story)
   Pure helper — no DOM reads, no fetch calls.
   Reads story.ratings[] (each entry is a number or { stars }).
   Returns: { avg, count, display, starText }
   Returns "5.0 (New)" for stories with zero ratings.
   Called by: filterStories() when building story cards.
   ============================================================ */

function calculateRatingStats(story) {
    let ratings = story.ratings || [];
    if (!Array.isArray(ratings)) ratings = [];
    if (ratings.length === 0) {
        return { avg: "0.0", count: 0, display: "⭐ 5.0 (New)", starText: "⭐ 5.0 (New)" };
    }
    let total = ratings.reduce((sum, r) => sum + (typeof r === 'number' ? r : (r.stars || 0)), 0);
    let avg = (total / ratings.length).toFixed(1);
    return {
        avg,
        count: ratings.length,
        display: `⭐ ${avg} (${ratings.length})`,
        starText: `⭐ ${avg} (${ratings.length} ${ratings.length === 1 ? 'rating' : 'ratings'})`
    };
}


/* ============================================================
   SECTION 2 — AUTH GUARD + USER SETUP
   Reads the logged-in user from localStorage.
   Applies safe defaults for fields added after registration:
     xp (default 100), completedStories [], usedFreeRetreatStories []
   Then writes the normalised user back to localStorage.
   If no user or role is not "Reader" → redirect to login.html.
   ============================================================ */

let user = null;
try {
    user = JSON.parse(localStorage.getItem("user"));
    if (user) {
        if (user.xp === undefined)             user.xp = 100;
        if (!user.completedStories)            user.completedStories = [];
        if (!user.usedFreeRetreatStories)      user.usedFreeRetreatStories = [];
        localStorage.setItem("user", JSON.stringify(user));
    }
} catch (e) {
    user = null;
}

// Reader auth guard — only Readers may access reader pages
if (!user || user.role !== "Reader") {
    window.location.href = "../auth/login.html";
}


/* ============================================================
   SECTION 3 — NAVBAR: renderUserProfileHeader()
   Reads `user` from localStorage and injects the avatar button
   + dropdown menu into #navAuthContainer.

   Renders:
   - Name initial as avatar circle
   - Display name + role badge + XP badge
   - Dropdown links: Story Library | Sign Out
   - Extra "Admin Dashboard" link if user is also an Admin
   Called on: DOMContentLoaded + immediately on script parse.
   ============================================================ */

function renderUserProfileHeader() {
    let navAuthContainer = document.getElementById("navAuthContainer");
    if (!navAuthContainer || !user) return;

    let initial     = user.name ? user.name.charAt(0).toUpperCase() : "U";
    let activeXp    = (user.xp !== undefined) ? user.xp : 100;
    let roleTitle   = user.role || "Reader";
    let xpBadgeHtml = (user.role !== "Admin")
        ? `<span class="user-xp-badge">⭐ ${activeXp} XP</span>`
        : ``;

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


/* ============================================================
   SECTION 4 — PROFILE DROPDOWN TOGGLE
   toggleProfileDropdown(event) — toggle "hidden" on #profileDropdown
   Global click listener        — close dropdown on outside click
   ============================================================ */

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


/* ============================================================
   SECTION 5 — PAGE INITIALISATION
   On DOMContentLoaded:
   1. Render the reader profile header in the navbar.
   2. Call checkWelcomeToast() to show any pending XP/welcome toasts.
   Also call renderUserProfileHeader() immediately in case DOM is ready.
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    renderUserProfileHeader();
    checkWelcomeToast();
    if (document.getElementById("storiesContainer")) loadStories();
    if (document.getElementById("sceneContainer") && typeof loadStory === "function") loadStory();
});
renderUserProfileHeader();
if (document.getElementById("storiesContainer")) loadStories();


/* ============================================================
   SECTION 6 — TOAST NOTIFICATION SYSTEM
   showToastNotification(title, message, icon, duration)
   Creates a floating toast card at the bottom of the screen.
   - Appends to #toastContainer (creates it if missing).
   - Auto-fades after `duration` ms (default 4500ms).
   - Has an × close button to dismiss early.
   Called by: retreat(), selectChoice(), checkWelcomeToast(),
              submitStoryRating(), and XP award events.
   ============================================================ */

function showToastNotification(title, message, icon = "🎉", duration = 4500) {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id        = "toastContainer";
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

    // Auto-dismiss after duration
    setTimeout(() => {
        toast.classList.add("toast-fade-out");
        setTimeout(() => toast.remove(), 350);
    }, duration);
}


/* ============================================================
   SECTION 7 — WELCOME TOAST: checkWelcomeToast()
   Called once on page load. Checks two toast conditions:

   Check 1 — Pending Pitch Acceptance Toast:
     Fetches the reader's user record from db.json.
     If pendingToast exists (set by admin when approving a pitch):
       - Shows a congratulatory toast with the XP award message.
       - Updates user.xp in localStorage.
       - PATCHes pendingToast: null to clear it from db.json.

   Check 2 — First Login Welcome Toast:
     If user.hasSeenWelcomeToast is false/missing:
       - Shows a welcome toast with starting XP info.
       - Sets hasSeenWelcomeToast = true in localStorage.
   ============================================================ */

let isToastChecking = false;
async function checkWelcomeToast() {
    if (!user || user.role === "Admin" || isToastChecking) return;
    isToastChecking = true;

    // Check 1: Admin-set pending toast from db.json (pitch approval XP award)
    if (user.id) {
        try {
            let res = await fetch(`http://localhost:3000/Users/${user.id}`);
            if (res.ok) {
                let freshUser = await res.json();
                if (freshUser.pendingToast) {
                    let toastData = freshUser.pendingToast;

                    // Update local XP and remove the pendingToast flag
                    user.xp = freshUser.xp;
                    delete user.pendingToast;
                    localStorage.setItem("user", JSON.stringify(user));

                    // Clear pendingToast from db.json (fire and forget)
                    fetch(`http://localhost:3000/Users/${user.id}`, {
                        method:  "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body:    JSON.stringify({ pendingToast: null })
                    }).catch(e => {});

                    // Show the toast after a short delay for visual effect
                    setTimeout(() => {
                        showToastNotification(
                            "PITCH ACCEPTED! 🎉",
                            toastData.message || `+${toastData.xpAwarded || 30} XP earned for your pitch!`,
                            "🎉"
                        );
                    }, 600);
                }
            }
        } catch (e) {
            console.warn("Could not check pendingToast:", e);
        }
    }

    // Check 2: First login welcome toast (checked against persistent key & db.json)
    let toastKey = "welcome_toast_shown_" + (user.id || user.name);
    let alreadyShown = localStorage.getItem(toastKey) || user.hasSeenWelcomeToast;

    if (!alreadyShown) {
        localStorage.setItem(toastKey, "true");
        user.hasSeenWelcomeToast = true;
        localStorage.setItem("user", JSON.stringify(user));

        if (user.id) {
            fetch(`http://localhost:3000/Users/${user.id}`, {
                method:  "PATCH",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ hasSeenWelcomeToast: true })
            }).catch(e => {});
        }

        setTimeout(() => {
            showToastNotification(
                "WELCOME EXPLORER!",
                `Welcome, ${user.name || 'Reader'}! You earned +100 XP starting bonus! ⭐`,
                "🎉"
            );
        }, 400);
    }
}


/* ============================================================
   ──────────────────────────────────────────────────────────────
   STORY LIBRARY SECTION
   These functions run on pages/reader/stories.html only.
   They fetch and display the public story card grid, handle
   search/filter, and manage the story detail modal.
   ──────────────────────────────────────────────────────────────
   ============================================================ */


/* ============================================================
   SECTION 8 — STATE: allPublishedStories []
   In-memory cache of all published stories.
   Populated by loadStories().
   Used by filterStories() and openStoryDetails() so they don't
   need extra network requests after the initial fetch.
   ============================================================ */

let allPublishedStories = [];


/* ============================================================
   SECTION 9 — LOAD STORIES: loadStories()
   Fetches all stories from GET /Stories.
   Filters to only keep stories where status === "published".
   Stores them in allPublishedStories cache.
   Then calls filterStories() to render the initial card grid.
   ============================================================ */

function loadStories() {
    let container = document.getElementById("storiesContainer");
    if (!container) return;

    fetch("http://localhost:3000/Stories")
        .then(res => res.json())
        .then(stories => {
            // Keep only stories that the admin has published
            allPublishedStories = stories.filter(story => story.status === "published");
            filterStories();
        });
}


/* ============================================================
   SECTION 10 — FILTER STORIES: filterStories()
   Reads the current search input and genre dropdown values.
   Filters allPublishedStories on two criteria:
     - matchesSearch: title OR author contains the search term
     - matchesGenre:  genre matches selected filter (or "all")
   Renders matching stories as cards inside #storiesContainer.
   If no stories match → renders an empty-state message.

   Each story card contains:
   - Cover image, genre badge, title, author, description
   - Scene count, star rating, "VIEW DETAILS & READ" button
   ============================================================ */

function filterStories() {
    let container = document.getElementById("storiesContainer");
    if (!container) return;

    let searchInput   = document.getElementById("searchInput").value.toLowerCase().trim();
    let selectedGenre = document.getElementById("genreFilter").value.toLowerCase();

    container.innerHTML = "";
    let count = 0;

    allPublishedStories.forEach(story => {
        let title  = (story.title  || "").toLowerCase();
        let author = (story.author || "").toLowerCase();
        let genre  = (story.genre  || "").toLowerCase();

        let matchesSearch = title.includes(searchInput) || author.includes(searchInput);
        let matchesGenre  = (selectedGenre === "all") || (genre === selectedGenre);

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
                            VIEW DETAILS & READ
                        </button>
                    </div>
                </div>
            `;
        }
    });

    // Empty state — no stories match the current filter
    if (count === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; background: #fff; border: 2px dashed #000; border-radius: 28px; box-shadow: 4px 4px 0 #000; margin: 20px 0;">
                <h2 style="font-family: var(--font-display); font-size: 28px; margin-bottom: 12px; letter-spacing: -0.01em;">NO PUBLISHED STORIES AVAILABLE</h2>
                <p style="font-weight: 700; font-size: 15px; color: #444; max-width: 500px; margin: 0 auto; line-height: 1.5;">There are no stories matching your filter criteria.</p>
            </div>
        `;
    }
}


/* ============================================================
   SECTION 11 — STORY DETAIL MODAL
   openStoryDetails(storyId)
   Looks up the story in allPublishedStories, populates the
   #storyDetailModal card with:
     - Cover image, genre/status badges, title, author
     - Full description text
     - Scene count and unique endings count stat boxes
     - "BEGIN STORY EXPERIENCE" and "Back to Library" buttons
   Then removes the "hidden" class to show the modal overlay.

   closeStoryDetails(event)
   Adds "hidden" class back to #storyDetailModal to hide it.

   enterStoryWorld(storyId) / startStory(storyId)
   Navigate to play.html?id=<storyId> to begin playing.
   startStory is an alias for openStoryDetails (shows details first).
   ============================================================ */

function openStoryDetails(storyId) {
    let story = allPublishedStories.find(s => s.id === storyId);
    if (!story) return;

    let modal = document.getElementById("storyDetailModal");
    if (!modal) return;

    let card       = modal.querySelector(".story-detail-card");
    let sceneCount = story.nodes ? story.nodes.length : 0;

    // Count ending nodes (isEnding === true)
    let endingsCount = 0;
    if (story.nodes && story.nodes.length > 0) {
        endingsCount = story.nodes.filter(n => n.isEnding).length;
    }
    if (endingsCount === 0) endingsCount = 1; // Minimum 1 implied ending

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
                        ⚡ BEGIN STORY EXPERIENCE →
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


/* ============================================================
   ──────────────────────────────────────────────────────────────
   STORY PLAYER SECTION
   These functions run on pages/reader/play.html only.
   They handle the full branching-story playing experience:
   session management, node rendering, XP, retreat, and rating.
   ──────────────────────────────────────────────────────────────
   ============================================================ */


/* ============================================================
   SECTION 12 — STORY PLAYER STATE
   URL params: storyId from ?id= query string
   currentStory   — the story object fetched from /Stories/:id
   currentNode    — the node (scene) currently displayed
   traversalPath  — array of { nodeId, title, choiceText }
                    tracking the path the reader has taken
   storySession   — the active session object (synced to db.json)
   ============================================================ */

const urlParams   = new URLSearchParams(window.location.search);
const storyId     = urlParams.get("id");

let currentStory  = null;
let currentNode   = null;
let traversalPath = [];
let storySession  = null;


/* ============================================================
   SECTION 13 — CONSTANTS
   RETREAT_COST  — XP deducted per retreat after the free one is used
   STARTING_XP   — default XP for accounts with no xp field
   COMPLETION_XP — XP awarded when a story is completed for the first time
   ============================================================ */

const RETREAT_COST    = 10;  // XP per retreat (after free retreat is used)
const STARTING_XP     = 100; // Default XP for new accounts
const COMPLETION_XP   = 5;   // XP awarded on story completion


/* ============================================================
   SECTION 14 — SESSION KEY: getSessionStorageKey(userId, storyId)
   Builds the localStorage key used to cache the reading session
   for a specific user + story combination.
   Format: "active_session_<userId>_<storyId>"
   ============================================================ */

function getSessionStorageKey(userId, storyId) {
    return `active_session_${userId}_${storyId}`;
}


/* ============================================================
   SECTION 15 — LOAD STORY (PLAYER INIT): loadStory()
   The main player initialiser. Called when play.html loads.

   Three-phase resolution:
   Phase 1 — localStorage cache:
     Check for a saved session under the storage key.
     If found and valid → restore it and call showStory().

   Phase 2 — Backend query:
     GET /StorySessions?userId=&storyId= from json-server.
     If an active session exists → restore it, cache it locally.

   Phase 3 — New session:
     If no session anywhere → call createNewSession() to start fresh.

   Also fetches the story object from GET /Stories/:id,
   normalises nodes to an array, and validates storyId.
   ============================================================ */

async function loadStory() {
    if (!storyId) {
        alert("No story selected.");
        window.location.href = "stories.html";
        return;
    }

    try {
        // Fetch the full story object from the backend
        let response = await fetch(`http://localhost:3000/Stories/${storyId}`);
        if (!response.ok) {
            alert("Story not found.");
            window.location.href = "stories.html";
            return;
        }

        currentStory = await response.json();

        // Normalise nodes — support both array and keyed-object formats
        if (!Array.isArray(currentStory.nodes)) {
            currentStory.nodes = currentStory.nodes
                ? Object.values(currentStory.nodes)
                : [];
        }

        if (!currentStory.nodes || currentStory.nodes.length === 0) {
            alert("This story has no scenes yet.");
            window.location.href = "stories.html";
            return;
        }

        // Find the designated start node (fallback: first node)
        let startingNode = currentStory.nodes.find(node => node.id === currentStory.startNodeId)
            || currentStory.nodes[0];

        let userId     = user ? (user.id || user.name) : "guest";
        let storageKey = getSessionStorageKey(userId, storyId);

        /* ── Phase 1: Check localStorage cache first ──────────────── */
        let cachedSession = null;
        try {
            cachedSession = JSON.parse(localStorage.getItem(storageKey));
        } catch (e) {
            cachedSession = null;
        }

        if (cachedSession && cachedSession.currentNodeId) {
            let restoredNode = currentStory.nodes.find(node => node.id === cachedSession.currentNodeId);
            if (restoredNode) {
                storySession  = cachedSession;
                traversalPath = cachedSession.traversalPath || [];
                currentNode   = restoredNode;

                if (user && user.usedFreeRetreatStories && user.usedFreeRetreatStories.includes(storyId)) {
                    storySession.freeRetreatUsed = true;
                }

                showStory();
                return;
            }
        }

        /* ── Phase 2: Query backend for an active session ─────────── */
        try {
            let sessionRes = await fetch(
                `http://localhost:3000/StorySessions?userId=${encodeURIComponent(userId)}&storyId=${encodeURIComponent(storyId)}`
            );
            if (sessionRes.ok) {
                let sessions = await sessionRes.json();
                if (sessions && sessions.length > 0) {
                    storySession  = sessions[sessions.length - 1]; // Use the most recent
                    traversalPath = storySession.traversalPath || [];

                    currentNode = currentStory.nodes.find(
                        node => node.id === storySession.currentNodeId
                    );

                    if (!currentNode) {
                        // Corrupted session — start fresh
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

        /* ── Phase 3: No session found — create a new one ────────── */
        await createNewSession(startingNode, userId);

    } catch (error) {
        console.error("Error loading story player:", error);
    }
}


/* ============================================================
   SECTION 16 — CREATE NEW SESSION: createNewSession(startingNode, userId)
   Called by loadStory() when no existing session is found.

   Steps:
   1. Set currentNode to startingNode.
   2. Initialise traversalPath with the starting node entry.
   3. Read user's current XP and freeRetreatUsed status.
   4. Build the storySession object with all required fields.
   5. Save to localStorage immediately (fast, offline-safe).
   6. POST to /StorySessions to persist in db.json.
   7. Update storySession.id from the backend response.
   8. Call showStory() to render the first scene.
   ============================================================ */

async function createNewSession(startingNode, userId) {
    currentNode   = startingNode;
    traversalPath = [{
        nodeId:     startingNode.id,
        title:      startingNode.title,
        choiceText: null
    }];

    let userXp     = (user && user.xp !== undefined) ? user.xp : STARTING_XP;
    let isFreeUsed = Boolean(user && user.usedFreeRetreatStories && user.usedFreeRetreatStories.includes(storyId));

    storySession = {
        userId:         userId,
        storyId:        storyId,
        currentNodeId:  startingNode.id,
        traversalPath:  traversalPath,
        visitedNodeIds: [startingNode.id],
        freeRetreatUsed: isFreeUsed,
        xp:             userXp,
        alreadyClaimed: false,
        ended:          startingNode.isEnding || false,
        endingType:     startingNode.isEnding ? startingNode.endingType : null
    };

    const storageKey = getSessionStorageKey(userId, storyId);
    localStorage.setItem(storageKey, JSON.stringify(storySession));

    // POST to backend — non-blocking, save locally first
    try {
        let response = await fetch("http://localhost:3000/StorySessions", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(storySession)
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


/* ============================================================
   SECTION 17 — SAVE SESSION: saveStorySession()
   Called after every navigation event (selectChoice, retreat, restart).
   Non-blocking — errors are silently warned and never throw.

   Steps:
   1. Sync traversalPath + currentNodeId to storySession.
   2. Sync user.xp and freeRetreatUsed to storySession.
   3. Save to localStorage immediately.
   4. PUT /StorySessions/:id if an ID exists.
      Otherwise POST to create (session may not have been saved yet).
      On successful POST, capture the backend-assigned id.
   ============================================================ */

async function saveStorySession() {
    if (!storySession) return;

    const userId     = user ? (user.id || user.name) : "guest";
    const storageKey = getSessionStorageKey(userId, storyId);

    // Sync latest state into the session object
    storySession.traversalPath = traversalPath;
    storySession.currentNodeId = currentNode ? currentNode.id : storySession.currentNodeId;

    if (user && user.xp !== undefined) {
        storySession.xp = user.xp;
    }
    if (user && user.usedFreeRetreatStories && user.usedFreeRetreatStories.includes(storyId)) {
        storySession.freeRetreatUsed = true;
    }

    // Save to localStorage first (fast, offline-safe)
    localStorage.setItem(storageKey, JSON.stringify(storySession));

    // Sync to backend
    try {
        if (storySession.id) {
            // Session already exists in backend — update it
            await fetch(`http://localhost:3000/StorySessions/${storySession.id}`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(storySession)
            }).catch(e => console.warn("Backend PUT failed:", e));
        } else {
            // No backend ID yet — try to create it
            let res = await fetch("http://localhost:3000/StorySessions", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(storySession)
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


/* ============================================================
   SECTION 18 — RENDER SCENE: showStory()
   The core display function. Called after every navigation event.
   Renders the current node into the DOM.

   Two render paths:

   Path A — Ending Node (currentNode.isEnding === true):
   - Hides the top stat bar (storyHeader).
   - Marks the session as ended.
   - Colour-codes by ending type (good/tragic/bad).
   - Shows Lottie badge animation (#endingBadgeLottie).
   - Displays: story title, ending text, XP earned message.
   - Buttons: ⭐ Rate Story | 🔄 Restart Story | 📚 Back to Library.
   - Awards COMPLETION_XP if not already claimed.
   - PATCHes user.xp + completedStories to backend.

   Path B — Regular Scene Node:
   - Renders location badge + character list at top.
   - Renders scene title (h1) and body text.
   - Renders "WHAT DO YOU DO?" prompt.
   - Renders choice buttons (VISITED badge on already-seen nodes).
   - Renders RETREAT button if not at the start node.
   ============================================================ */

function showStory() {
    let storyHeader      = document.getElementById("storyHeader");
    let sceneContainer   = document.getElementById("sceneContainer");
    let choicesContainer = document.getElementById("choicesContainer");
    let pathContainer    = document.getElementById("traversalPath");

    if (!storyHeader || !sceneContainer || !choicesContainer) return;

    let decisions  = Math.max(traversalPath.length - 1, 0);
    let pathLength = traversalPath.length;
    let visitedIds = (storySession && storySession.visitedNodeIds) ? storySession.visitedNodeIds : [];

    // ── Top stat badges + breadcrumb path ─────────────────────────────────
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

    if (pathContainer) pathContainer.innerHTML = "";

    // ── Path A: Ending Node ────────────────────────────────────────────────
    if (currentNode.isEnding) {
        // Hide the top stat bar on ending screens
        storyHeader.innerHTML = "";

        storySession.ended       = true;
        storySession.currentNodeId = currentNode.id;
        storySession.endingType  = currentNode.endingType;

        let endType    = (currentNode.endingType || "good").toLowerCase();
        let endingBg   = endType === "good" ? "#34d399" : endType === "tragic" ? "#fb923c" : "#f87171";
        let endingEmoji = endType === "good" ? "🏆" : endType === "tragic" ? "😢" : "💀";

        // XP message — show earned or "already claimed" depending on state
        let isAlreadyCompleted = user && user.completedStories && user.completedStories.some(id => String(id) === String(storyId));
        let xpMsg = isAlreadyCompleted || storySession.alreadyClaimed
            ? `<div style="background: #f1f5f9; border: 2px solid #000; border-radius: 100px; padding: 8px 22px; font-weight: 800; font-size: 13.5px; color: #475569; margin: 16px 0; box-shadow: 2.5px 2.5px 0px #000; display: inline-flex; align-items: center; gap: 6px;">🏁 Story Completed! (XP already earned for this story)</div>`
            : `<div style="background: #dcfce7; border: 2px solid #000; border-radius: 100px; padding: 10px 24px; font-weight: 900; font-size: 15px; color: #15803d; margin: 16px 0; box-shadow: 3px 3px 0px #000; display: inline-flex; align-items: center; gap: 8px;">🎉 +${COMPLETION_XP} XP Earned for Completing Story!</div>`;

        // Star rating UI showcase box
        let starRatingHtml = `
            <div style="background: #f8fafc; border: 2px solid #000; border-radius: 20px; padding: 20px 28px; margin: 16px 0 24px; box-shadow: 4px 4px 0px #000; text-align: center; width: 100%; max-width: 480px; box-sizing: border-box;">
                <label style="font-weight: 900; font-size: 12px; color: #000; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 12px;">⭐ RATE THIS STORY</label>
                <div id="starRatingContainer_${storyId}" style="display: flex; justify-content: center; gap: 14px; margin-bottom: 10px;">
                    ${[1,2,3,4,5].map(star => `
                        <span onclick="submitStoryRating('${storyId}', ${star})"
                              style="font-size: 36px; cursor: pointer; opacity: 0.35; transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s ease; filter: drop-shadow(1px 2px 0px rgba(0,0,0,0.12)); display: inline-block;"
                              onmouseover="this.style.opacity='1'; this.style.transform='scale(1.35) rotate(12deg)'"
                              onmouseout="this.style.transform='scale(1)'"
                              title="${star} star${star > 1 ? 's' : ''}">⭐</span>
                    `).join('')}
                </div>
                <div id="ratingFeedback_${storyId}" style="display:none; font-weight:800; font-size:13.5px; color:#15803d; background: #dcfce7; border: 1.5px solid #000; border-radius: 100px; padding: 6px 16px; margin-top: 8px; box-shadow: 2px 2px 0px #000;"></div>
            </div>
        `;

        sceneContainer.innerHTML = "";

        choicesContainer.innerHTML = `
            <div class="story-card ending-card" style="border: 3px solid #000; border-radius: 24px; padding: 36px 32px; box-shadow: 8px 8px 0px #000; background: #fff; width: 100%; box-sizing: border-box;">
                <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                    <!-- Lottie Badge Animation — plays once when story ends -->
                    <div id="endingBadgeLottie" style="width: 120px; height: 120px; margin: 0 auto 8px;"></div>

                    <div style="background: ${endingBg}; border: 3px solid #000; border-radius: 100px; padding: 10px 28px; font-weight: 900; font-size: 20px; margin-bottom: 20px; box-shadow: 4px 4px 0px #000; letter-spacing: 0.03em;">
                        ${endingEmoji} ${endType.toUpperCase()} ENDING
                    </div>

                    <h1 style="font-family: var(--font-display); font-size: clamp(24px, 4vw, 38px); text-transform: uppercase; margin-bottom: 16px; word-break: break-word; line-height: 1.1;">
                        ${currentStory.title}
                    </h1>

                    <div style="background: var(--color-sky-wash); border: 2px solid #000; border-radius: 16px; padding: 22px 24px; margin-bottom: 20px; box-shadow: 4px 4px 0px #000; text-align: left; width: 100%; box-sizing: border-box;">
                        <p style="font-size: 16px; line-height: 1.7; font-weight: 600; color: #000; margin: 0;">${currentNode.text}</p>
                    </div>

                    ${xpMsg}
                    ${starRatingHtml}

                    <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; width: 100%; margin-top: 10px;">
                        <button type="button" class="primary-btn" onclick="restartStory()" style="width: auto; padding: 14px 32px; font-size: 14px; background: #ffde59; color: #000; border: 2.5px solid #000; border-radius: 100px; box-shadow: 4px 4px 0px #000; font-weight: 900; cursor: pointer; letter-spacing: 0.5px;">🔄 RESTART STORY</button>
                        <button type="button" class="secondary-btn" onclick="backToLibrary()" style="width: auto; padding: 14px 32px; font-size: 14px; background: #ffffff; color: #000; border: 2.5px solid #000; border-radius: 100px; box-shadow: 4px 4px 0px #000; font-weight: 900; cursor: pointer; letter-spacing: 0.5px;">📚 BACK TO LIBRARY</button>
                    </div>
                </div>
            </div>
        `;

        // Inject and play the Lottie ending badge animation (plays once)
        setTimeout(() => {
            let lottieContainer = document.getElementById("endingBadgeLottie");
            if (lottieContainer && typeof lottie !== "undefined") {
                lottie.loadAnimation({
                    container: lottieContainer,
                    renderer:  "svg",
                    loop:      false,
                    autoplay:  true,
                    path:      "../../css/Top Badge animation.json"
                });
            }
        }, 100);

        // Award COMPLETION_XP if this is the reader's first completion
        if (!isAlreadyCompleted && !storySession.alreadyClaimed) {
            storySession.alreadyClaimed = true;

            if (user) {
                user.xp = (user.xp || 0) + COMPLETION_XP;
                if (!user.completedStories) user.completedStories = [];
                user.completedStories.push(storyId);
                localStorage.setItem("user", JSON.stringify(user));

                // Sync XP + completedStories to the backend
                if (user.id) {
                    fetch(`http://localhost:3000/Users/${user.id}`, {
                        method:  "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body:    JSON.stringify({
                            xp:               user.xp,
                            completedStories: user.completedStories
                        })
                    }).catch(e => console.warn("Could not sync completion XP:", e));
                }

                showToastNotification(
                    "STORY COMPLETE! 🏆",
                    `You completed "${currentStory.title}"! +${COMPLETION_XP} XP earned!`,
                    "🏆"
                );
            }
        }

        saveStorySession();
        return;
    }

    // ── Path B: Regular Scene Node ─────────────────────────────────────────
    let locationText = currentNode.location ? currentNode.location.toUpperCase() : "UNKNOWN";
    let charsText    = (currentNode.characters && currentNode.characters.length > 0)
        ? `👥 PRESENT: ${currentNode.characters.join(", ").toUpperCase()}`
        : "";

    // Determine retreat button label (FREE vs XP cost)
    let isFreeUsed  = (storySession && storySession.freeRetreatUsed)
        || (user && user.usedFreeRetreatStories && user.usedFreeRetreatStories.includes(storyId));
    let retreatText = isFreeUsed ? `← RETREAT (-${RETREAT_COST} XP)` : "← RETREAT (FREE)";
    let activeXp    = (user && user.xp !== undefined) ? user.xp : (storySession ? storySession.xp : STARTING_XP);

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

    // Build choice buttons — show VISITED badge for already-seen nodes
    let choicesHTML = "";
    if (currentNode.choices && currentNode.choices.length > 0) {
        choicesHTML = currentNode.choices.map(choice => {
            let isVisited   = visitedIds.includes(choice.targetNodeId);
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


/* ============================================================
   SECTION 19 — TRAVERSAL PATH DISPLAY
   showTraversalPath()  — stub, used to trigger re-render updates
   showXpWarning(msg)   — injects an XP warning into #xpWarningContainer
                          when the reader cannot afford a retreat
   ============================================================ */

function showTraversalPath() {
    // Reserved for future traversal path panel updates
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


/* ============================================================
   SECTION 20 — RETREAT: retreat()
   Allows the reader to undo their last choice and go back one node.

   Rules:
   - Cannot retreat from an ending node.
   - Cannot retreat from the very first node (traversalPath.length ≤ 1).
   - First retreat per story is FREE (freeRetreatUsed flag).
   - Subsequent retreats cost RETREAT_COST XP.
   - If not enough XP → show warning toast and return.

   After a valid retreat:
   1. Mark free retreat used (if applicable) or deduct XP.
   2. Sync XP + usedFreeRetreatStories to backend.
   3. Pop the last entry from traversalPath.
   4. Set currentNode to the previous node.
   5. Update session state and call showStory() + saveStorySession().
   ============================================================ */

function retreat() {
    if (!currentNode) return;

    if (currentNode.isEnding) {
        alert("You cannot retreat after reaching an ending.");
        return;
    }

    if (traversalPath.length <= 1) {
        alert("You are already at the beginning.");
        return;
    }

    let activeXp = (user && user.xp !== undefined) ? user.xp : (storySession ? storySession.xp : STARTING_XP);

    if (!user) user = { xp: activeXp, usedFreeRetreatStories: [] };
    if (!user.usedFreeRetreatStories) user.usedFreeRetreatStories = [];

    let freeAlreadyUsed = user.usedFreeRetreatStories.includes(storyId)
        || (storySession && storySession.freeRetreatUsed);

    if (!freeAlreadyUsed) {
        // Use the free retreat token for this story
        user.usedFreeRetreatStories.push(storyId);
        localStorage.setItem("user", JSON.stringify(user));
        if (storySession) storySession.freeRetreatUsed = true;

        showToastNotification("FREE RETREAT USED!", "You rewound 1 scene back using your free retreat token! ⏪", "⚡");
    } else {
        // Paid retreat — check XP
        if (activeXp < RETREAT_COST) {
            let msg = "Not enough XP! Read other stories to earn XP.";
            showXpWarning(msg);
            showToastNotification("INSUFFICIENT XP", msg, "⚠️");
            return;
        }

        // Deduct XP
        activeXp  -= RETREAT_COST;
        user.xp    = activeXp;
        localStorage.setItem("user", JSON.stringify(user));
        if (storySession) storySession.xp = activeXp;

        showToastNotification("TIME-WARP RETREAT!", `Rewound 1 scene back! -${RETREAT_COST} XP used. ⭐`, "⏪");
    }

    // Sync XP + free retreat record to backend
    if (user && user.id) {
        fetch(`http://localhost:3000/Users/${user.id}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                xp:                    user.xp,
                usedFreeRetreatStories: user.usedFreeRetreatStories
            })
        }).catch(e => console.warn("Could not sync retreat XP to db.json:", e));
    }

    // Go back one node
    traversalPath.pop();
    let previous  = traversalPath[traversalPath.length - 1];
    currentNode   = currentStory.nodes.find(node => node.id === previous.nodeId);

    storySession.ended        = false;
    storySession.endingType   = null;
    storySession.currentNodeId = currentNode.id;
    storySession.traversalPath = traversalPath;

    showStory();
    saveStorySession();
}


/* ============================================================
   SECTION 21 — RESTART STORY: restartStory()
   Resets the player to the start node of the current story.
   Does NOT reset XP, completedStories, or freeRetreatUsed.
   The session object is updated in place (same session ID).
   ============================================================ */

function restartStory() {
    let startingNode = currentStory.nodes.find(node => node.id === currentStory.startNodeId)
        || currentStory.nodes[0];

    if (!startingNode) {
        alert("Starting node not found.");
        return;
    }

    currentNode   = startingNode;
    traversalPath = [{
        nodeId:     startingNode.id,
        title:      startingNode.title,
        choiceText: null
    }];

    let activeXp   = (user && user.xp !== undefined) ? user.xp : STARTING_XP;
    let isFreeUsed = Boolean(user && user.usedFreeRetreatStories && user.usedFreeRetreatStories.includes(storyId));

    storySession.currentNodeId   = startingNode.id;
    storySession.traversalPath   = traversalPath;
    storySession.freeRetreatUsed = isFreeUsed;
    storySession.xp              = activeXp;
    storySession.ended           = startingNode.isEnding || false;
    storySession.endingType      = startingNode.isEnding ? startingNode.endingType : null;

    showStory();
    saveStorySession();
}


/* ============================================================
   SECTION 22 — BACK TO LIBRARY: backToLibrary()
   Saves the current session and navigates back to stories.html.
   ============================================================ */

function backToLibrary() {
    saveStorySession();
    window.location.href = "stories.html";
}


/* ============================================================
   SECTION 23 — SELECT CHOICE: selectChoice(targetNodeId, choiceText)
   Called when the reader clicks a choice button.

   Steps:
   1. Find the target node in currentStory.nodes by ID.
   2. Push it onto traversalPath.
   3. Mark it as visited in storySession.visitedNodeIds.
   4. Update currentNode and session state.
   5. Call showStory() to render the new scene.
   6. Save session asynchronously.
   ============================================================ */

function selectChoice(targetNodeId, choiceText) {
    let nextNode = currentStory.nodes.find(node => node.id === targetNodeId);
    if (!nextNode) {
        alert("Destination node not found: " + targetNodeId);
        return;
    }

    currentNode = nextNode;
    traversalPath.push({
        nodeId:     nextNode.id,
        title:      nextNode.title || "Scene",
        choiceText: choiceText
    });

    // Track visited nodes for the VISITED badge system
    if (storySession) {
        if (!storySession.visitedNodeIds) storySession.visitedNodeIds = [];
        if (!storySession.visitedNodeIds.includes(targetNodeId)) {
            storySession.visitedNodeIds.push(targetNodeId);
        }
        storySession.currentNodeId  = nextNode.id;
        storySession.traversalPath  = traversalPath;
    }

    showStory();
    saveStorySession();
}


/* ============================================================
   SECTION 24 — LOGOUT: handleLogout()
   Clears the "user" key from localStorage (ends the session)
   and redirects to login.html.
   ============================================================ */

function handleLogout() {
    localStorage.removeItem("user");
    window.location.href = "../auth/login.html";
}


/* ============================================================
   SECTION 25 — TAB SWITCHER: switchReaderTab(tab)
   Controls which tab panel is visible on stories.html:
     "library"   → #librarySection    — Story card grid
     "pitch"     → #pitchSection      — Submit a Pitch form
     "mypitches" → #myPitchesSection  — Reader's own pitches

   Uses CSS class "tab-active" on .tab-pill buttons.
   Calling with "mypitches" also triggers loadMyPitches().
   ============================================================ */

function switchReaderTab(tab) {
    // Show/hide tab content panels (supporting both view* and *Section IDs)
    let viewLibrary      = document.getElementById("viewLibrary")      || document.getElementById("librarySection");
    let viewPitch        = document.getElementById("viewPitch")        || document.getElementById("pitchSection");
    let viewMyPitches    = document.getElementById("viewMyPitches")    || document.getElementById("myPitchesSection");
    let libraryControls  = document.getElementById("libraryControls");

    if (viewLibrary)     viewLibrary.style.display     = (tab === "library")   ? "" : "none";
    if (libraryControls) libraryControls.style.display = (tab === "library")   ? "flex" : "none";
    if (viewPitch)       viewPitch.style.display       = (tab === "pitch")     ? "" : "none";
    if (viewMyPitches)   viewMyPitches.style.display   = (tab === "mypitches") ? "" : "none";

    // Update tab-pill active state (class-based)
    let tabMap = {
        "library":   "tabLibrary",
        "pitch":     "tabPitch",
        "mypitches": "tabMyPitches"
    };

    Object.entries(tabMap).forEach(([tabKey, btnId]) => {
        let btn = document.getElementById(btnId);
        if (btn) {
            if (tabKey === tab) {
                btn.classList.add("tab-active");
                btn.setAttribute("aria-pressed", "true");
            } else {
                btn.classList.remove("tab-active");
                btn.setAttribute("aria-pressed", "false");
            }
        }
    });

    // Auto-load pitches when switching to My Pitches tab
    if (tab === "mypitches") {
        loadMyPitches();
    }
}


/* ============================================================
   SECTION 26 — SUBMIT PITCH: submitPitch()
   Triggered by the Submit Pitch form on the "pitch" tab.

   Steps:
   1. Read title, genre, description from the form.
   2. Validate that all fields are filled.
   3. Build a pitch object with submitter info + timestamp.
   4. POST to /ReaderStories (json-server → db.json).
   5. Show a success toast.
   6. Reset the form and switch to "My Pitches" tab.
   ============================================================ */

async function submitPitch() {
    let titleEl       = document.getElementById("pitchTitle");
    let genreEl       = document.getElementById("pitchGenre");
    let descriptionEl = document.getElementById("pitchDescription");
    let errorBanner   = document.getElementById("pitchFormError");
    let successBanner = document.getElementById("pitchFormSuccess");

    if (errorBanner)   errorBanner.style.display   = "none";
    if (successBanner) successBanner.style.display = "none";

    if (!titleEl || !genreEl || !descriptionEl) return;

    let title       = titleEl.value.trim();
    let genre       = genreEl.value.trim();
    let description = descriptionEl.value.trim();

    // Validate empty fields
    if (!title || !genre || !description) {
        let msg = "Please fill in all fields before submitting.";
        if (errorBanner) { errorBanner.textContent = "⚠️ " + msg; errorBanner.style.display = "block"; }
        alert(msg);
        return;
    }

    // Validate minimum 30 words requirement
    let words = description.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 30) {
        let errorMsg = `Your pitch description must be at least 30 words long! (Currently ${words.length} words — please add at least ${30 - words.length} more words).`;
        if (errorBanner) {
            errorBanner.textContent = "⚠️ " + errorMsg;
            errorBanner.style.display = "block";
        }
        showToastNotification(
            "PITCH TOO SHORT",
            `Pitch must be at least 30 words! (Currently ${words.length}/30 words)`,
            "⚠️"
        );
        return;
    }

    let pitchObject = {
        title:            title,
        genre:            genre,
        description:      description,
        submittedBy:      user ? (user.name || "Reader") : "Reader",
        submittedById:    user ? (user.id || null)       : null,
        submittedAt:      new Date().toISOString(),
        status:           "pending",     // Admin will set to "approved" or "rejected"
        adminComment:     null,
        adminHidden:      false          // Set to true by admin to soft-delete from queue
    };

    try {
        let res = await fetch("http://localhost:3000/ReaderStories", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(pitchObject)
        });

        if (res.ok) {
            showToastNotification(
                "PITCH SUBMITTED! 📝",
                "Your story pitch has been sent to the admin for review!",
                "📝"
            );

            // Reset the form
            titleEl.value       = "";
            genreEl.value       = "";
            descriptionEl.value = "";

            // Switch to My Pitches tab so reader can see their submission
            switchReaderTab("mypitches");
        } else {
            alert("Failed to submit pitch. Please try again.");
        }
    } catch (e) {
        alert("Error connecting to server.");
    }
}


/* ============================================================
   SECTION 27 — LOAD MY PITCHES: loadMyPitches()
   Fetches the reader's own pitch submissions from:
     GET /ReaderStories?submittedById=<user.id>
   Renders each pitch as a status card in #myPitchesContainer.

   Each pitch card shows:
   - Genre badge + status badge (PENDING / APPROVED / REJECTED)
   - Submission date
   - Story title + description
   - Admin comment (if any) or "Awaiting review" placeholder
   - 🗑 Delete Pitch button

   Empty state: shown if the reader has no pitches.
   ============================================================ */

async function loadMyPitches() {
    let container = document.getElementById("myPitchesContainer");
    if (!container) return;
    container.innerHTML = '<p style="font-weight: 700; color: #888; padding: 16px;">Loading your pitches...</p>';

    if (!user || !user.id) {
        container.innerHTML = '<p style="font-weight: 700; color: #888; padding: 16px;">Please log in to see your pitches.</p>';
        return;
    }

    try {
        let res     = await fetch(`http://localhost:3000/ReaderStories?submittedById=${user.id}`);
        let pitches = res.ok ? await res.json() : [];

        if (pitches.length === 0) {
            container.innerHTML = `
                <div style="border: 3px dashed #000; border-radius: 24px; padding: 48px; text-align: center; background: #fff; box-shadow: 6px 6px 0px #000;">
                    <h2 style="font-family: var(--font-display);">NO PITCHES YET</h2>
                    <p style="font-weight: 700; color: #555;">You haven't submitted any story pitches yet. Use the Submit a Pitch tab to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = pitches.map(p => {
            // Status badge styling
            let statusBg     = p.status === "approved" ? "#dcfce7" : p.status === "rejected" ? "#fee2e2" : "#fef3c7";
            let statusBorder = p.status === "approved" ? "#86efac" : p.status === "rejected" ? "#fca5a5" : "#fde047";
            let statusColor  = p.status === "approved" ? "#166534" : p.status === "rejected" ? "#991b1b" : "#92400e";
            let statusText   = (p.status || "pending").toUpperCase();
            let statusIcon   = p.status === "approved" ? "✅" : p.status === "rejected" ? "✕" : "⏳";
            let dateStr      = p.submittedAt
                ? new Date(p.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "";

            // Admin comment section (or awaiting review placeholder)
            let adminCommentHtml = p.adminComment
                ? `<div style="margin-top: 14px; background: ${p.status === "approved" ? "#f0fff4" : p.status === "rejected" ? "#fff5f5" : "#fffbeb"}; border: 1.5px solid ${p.status === "approved" ? "#bbf7d0" : p.status === "rejected" ? "#fecdd3" : "#fde68a"}; border-radius: 12px; padding: 12px 16px; font-size: 13.5px; font-weight: 600; color: #1e293b; line-height: 1.6;">
                    💬 <span style="font-weight: 800; color: #0f172a;">Admin Comment:</span> <span style="font-style: italic;">"${p.adminComment}"</span>
                </div>`
                : (p.status === "pending" ? `<div style="margin-top: 14px; background: #fffbeb; border: 1px dashed #f59e0b; border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 600; color: #92400e; display: flex; align-items: center; gap: 8px;">
                    ⏳ <span>Awaiting admin review &amp; feedback...</span>
                </div>` : "");

            return `
                <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01); display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%; word-break: break-word; overflow-wrap: anywhere; transition: transform 0.2s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                            <span style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 100px; padding: 4px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.3px;">${(p.genre || "general").toUpperCase()}</span>
                            <span style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; border-radius: 100px; padding: 4px 14px; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">${statusIcon} ${statusText}</span>
                        </div>
                        <div style="font-size: 13px; font-weight: 600; color: #64748b; margin-left: auto;">${dateStr}</div>
                    </div>
                    <div style="word-break: break-word; overflow-wrap: anywhere; width: 100%;">
                        <h3 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 4px 0 10px; line-height: 1.3; font-family: var(--font-ui, sans-serif);">${p.title}</h3>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; font-size: 14px; color: #334155; font-weight: 500; line-height: 1.65; word-break: break-word; overflow-wrap: anywhere; box-sizing: border-box; width: 100%;">
                            ${p.description}
                        </div>
                        ${adminCommentHtml}
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 2px;">
                        <button type="button" onclick="deleteMyPitch('${p.id}')" style="padding: 8px 18px; border: 1px solid #fee2e2; border-radius: 100px; background: #fff; font-weight: 700; font-size: 12.5px; cursor: pointer; color: #ef4444; transition: all 0.2s ease;" title="Delete pitch permanently">
                            🗑 Delete Pitch
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    } catch(e) {
        container.innerHTML = '<p style="font-weight: 700; color: #e00; padding: 16px;">Could not load pitches.</p>';
    }
}


/* ============================================================
   SECTION 28 — DELETE MY PITCH: deleteMyPitch(pitchId)
   Permanently DELETE the reader's own pitch from /ReaderStories.
   Also removes it from the localStorage "myPitches" cache.
   Reloads the My Pitches tab after deletion.
   ============================================================ */

async function deleteMyPitch(pitchId) {
    if (!confirm("Are you sure you want to delete this pitch permanently?")) return;

    try {
        let res = await fetch("http://localhost:3000/ReaderStories/" + pitchId, {
            method: "DELETE"
        });
        if (res.ok) {
            // Also remove from localStorage cache
            let cached      = JSON.parse(localStorage.getItem("myPitches") || "[]");
            let updatedCache = cached.filter(p => String(p.id) !== String(pitchId));
            localStorage.setItem("myPitches", JSON.stringify(updatedCache));

            loadMyPitches();
        } else {
            alert("Could not delete pitch.");
        }
    } catch(e) {
        alert("Error connecting to server.");
    }
}


/* ============================================================
   SECTION 29 — STORY RATING: submitStoryRating(storyId, stars)
   Called when the reader clicks a star on the ending card.

   Steps:
   1. Fetch the story's current ratings[] from /Stories/:id.
   2. Find if the reader already rated this story (by user.id).
   3. Update their existing rating or push a new one.
   4. PATCH /Stories/:id with the updated ratings[].
   5. Recalculate and display the new average.
   6. Highlight selected stars visually.
   7. Show a rating confirmation toast.
   8. Reload story cards (updates rating badge in the library).
   ============================================================ */

async function submitStoryRating(storyId, stars) {
    if (!user) {
        alert("Please login to rate stories!");
        return;
    }

    let feedbackEl    = document.getElementById("ratingFeedback_" + storyId);
    let starsContainer = document.getElementById("starRatingContainer_" + storyId);

    try {
        let res = await fetch("http://localhost:3000/Stories/" + storyId);
        if (!res.ok) return;

        let story   = await res.json();
        let ratings = story.ratings || [];
        if (!Array.isArray(ratings)) ratings = [];

        // Update existing rating or add new entry
        let existingIndex = ratings.findIndex(r => typeof r === 'object' && String(r.userId) === String(user.id));
        if (existingIndex !== -1) {
            ratings[existingIndex].stars = stars;
        } else {
            ratings.push({ userId: user.id, stars: stars });
        }

        let patchRes = await fetch("http://localhost:3000/Stories/" + storyId, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ ratings: ratings })
        });

        if (patchRes.ok) {
            let updatedStory = await patchRes.json();
            if (currentStory && String(currentStory.id) === String(storyId)) {
                currentStory.ratings = updatedStory.ratings;
            }
            let newStats = calculateRatingStats(updatedStory);

            // Update the feedback label badge
            if (feedbackEl) {
                feedbackEl.style.display = "inline-block";
                feedbackEl.innerHTML = "⭐ Rated " + stars + " Stars! Avg: <strong>" + newStats.avg + "</strong> (" + newStats.count + " ratings)";
            }

            // Highlight the selected stars visually
            if (starsContainer) {
                let starSpans = starsContainer.querySelectorAll("span");
                starSpans.forEach((s, idx) => {
                    s.style.opacity = (idx < stars) ? "1" : "0.3";
                });
            }

            showToastNotification("RATING SUBMITTED!", "Thank you for rating " + stars + " Stars! ⭐", "⭐");

            // Refresh library card grid to show updated rating badge
            if (typeof loadStories === 'function') {
                loadStories();
            }
        }
    } catch(e) {
        console.warn("Could not submit rating:", e);
    }
}


