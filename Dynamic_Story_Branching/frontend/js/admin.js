
// Admin Security Guard — strictly require valid JWT with role === "Admin"
let adminUser = null;

if (!window.Auth || !Auth.getToken()) {
    window.location.href = "../auth/login.html";
} else {
    Auth.requireAuth("Admin").then(u => {
        adminUser = u;
        if (adminUser) {
            renderAdminProfileHeader();
            if (sessionStorage.getItem("showAdminWelcomeToast")) {
                sessionStorage.removeItem("showAdminWelcomeToast");
                setTimeout(() => {
                    showToastNotification("ADMIN DASHBOARD 🛡️", `Welcome, ${adminUser.name || 'Admin'}! Manage stories & pitches.`, "⚡");
                }, 300);
            }
        }
    });
}

/* ============================================================
   admin.js
   Page:  pages/admin/admin.html
   Role:  Admin Dashboard — manages all stories and reader pitches.

   FLOW (Top to Bottom — Page Load Order):
   ──────────────────────────────────────
   1.  calculateRatingStats()      Utility — compute avg star rating
   2.  Navigation helpers          redirectStory / editStory / previewStory
   3.  handleLogout()              Clear session → Landing.html
   4.  renderAdminProfileHeader()  Inject avatar + dropdown in navbar
   5.  toggleProfileDropdown()     Open/close profile menu
   6.  Global click listener       Close dropdown on outside click
   7.  DOMContentLoaded listener   Kick off renderAdminProfileHeader
   8.  loadStories()               Fetch stories → render story cards
   9.  restoreSampleStory()        Create a sample branching story
   10. currentAdminStories []      In-memory story cache
   11. openDescriptionModal()      Populate + show story detail modal
   12. closeDescriptionModal()     Hide modal
   13. switchTab()                 Toggle Stories ↔ Pitches view
   14. loadReaderPitches()         Fetch pitches → render pitch cards
   15. updatePitchStatus()         Approve / Reject pitch (+ XP award)
   16. saveAdminComment()          Save admin feedback on pitch
   17. deletePitch()               Soft-delete pitch (adminHidden flag)
   18. window.* exports            Make modal functions globally reachable

   DATA FLOW (json-server, port 3000):
   ────────────────────────────────────
   GET    /Stories            → fetch all stories for card grid
   DELETE /Stories/:id        → permanently delete a story
   POST   /Stories            → create sample story
   GET    /ReaderStories      → fetch reader pitch queue
   PATCH  /ReaderStories/:id  → approve / reject / comment / soft-delete
   GET    /Users/:id          → read reader's current XP before awarding
   PATCH  /Users/:id          → +30 XP + pendingToast on pitch approval
   ============================================================ */


/* ============================================================
   SECTION 1 — UTILITY: calculateRatingStats(story)
   Pure helper — no DOM reads, no fetch calls.
   Accepts a story object and reads story.ratings[]
   (each element is either a number OR { stars: number }).
   Returns an object:
     { avg: "4.5", count: 12, display: "⭐ 4.5 (12)", starText: "..." }
   Returns "5.0 (New)" if the story has zero ratings.
   Called by: loadStories() when building each story card.
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
   SECTION 2 — NAVIGATION HELPERS
   Three simple redirect functions called by story card buttons.
   redirectStory()     → add_stories.html   (create new story)
   editStory(id)       → add_stories.html?id=<id> (edit existing)
   deleteStory(id)     → DELETE /Stories/:id, then reload grid
   previewStory(id)    → preview.html?id=<id> (admin story preview)
   ============================================================ */

function redirectStory() {
    try {
        sessionStorage.removeItem("lastEditStoryId");
    } catch (e) {}
    window.location.href = "add_stories";
}

function editStory(storyId) {
    if (!storyId) return;
    try {
        sessionStorage.setItem("lastEditStoryId", String(storyId));
    } catch (e) {}
    window.location.href = `add_stories?id=${encodeURIComponent(storyId)}`;
}

async function deleteStory(storyId) {
    if (!confirm("Are you sure you want to delete this story?")) {
        return;
    }

    let response = await fetch(`${API_BASE}/Stories/${storyId}`, {
        method: "DELETE"
    });

    if (response.ok) {
        showToastNotification("STORY DELETED 🗑️", "Story permanently removed from database.", "🗑️");
        loadStories();
    } else {
        alert("Failed to delete story.");
    }
}


/* ============================================================
   SECTION 3 — LOGOUT: handleLogout()
   Removes the "user" key from localStorage (ends the session)
   and redirects the admin back to the public Landing page.
   ============================================================ */

function handleLogout() {
    if (window.Auth) {
        Auth.logout();
    } else {
        localStorage.clear();
        window.location.href = "../../Landing.html";
    }
}


/* ============================================================
   SECTION 4 — NAVBAR: renderAdminProfileHeader()
   Fetches the logged-in admin directly from MongoDB Atlas /profile
   and injects the profile avatar button + dropdown menu.
   ============================================================ */

async function renderAdminProfileHeader() {
    let navAuthContainer = document.getElementById("navAuthContainer");
    if (!navAuthContainer) return;
    let user = null;
    if (window.Auth) {
        user = await Auth.getProfile();
    }
    if (!navAuthContainer || !user) return;

    let avatarContent = `<span style="font-weight: 900; font-family: var(--font-display, sans-serif); color: #000;">A</span>`;

    navAuthContainer.innerHTML = `
        <div class="user-profile-menu-container">
            <button type="button" class="profile-menu-btn" onclick="toggleProfileDropdown(event)">
                <span class="user-avatar" style="background: #ffd731; color: #000; font-weight: 900; display: flex; align-items: center; justify-content: center;">${avatarContent}</span>
                <span class="user-name-label">ADMIN</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-left: 2px;"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div id="profileDropdown" class="profile-dropdown-menu hidden" onclick="event.stopPropagation()">
                <div class="profile-dropdown-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="user-avatar" style="width: 36px; height: 36px; font-size: 16px; background: #ffd731; color: #000; font-weight: 900; border: 2.5px solid #000; box-shadow: 2px 2px 0 #000; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">A</span>
                        <div style="min-width: 0;">
                            <strong style="color: #ffffff; display: block; font-size: 15px;">Admin</strong>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 10px; align-items: center; flex-wrap: wrap;">
                        <span class="user-role-badge">ADMIN</span>
                    </div>
                </div>
                <div class="profile-dropdown-links">
                    <a href="admin.html" class="dropdown-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                        Admin Dashboard
                    </a>
                    <a href="preview.html" class="dropdown-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                        Story Preview
                    </a>
                    <div style="height: 1.5px; background: #e2e8f0; margin: 4px 6px;"></div>
                    <button type="button" class="dropdown-item logout-item" onclick="handleLogout()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    `;
}


/* ============================================================
   SECTION 5 — PROFILE DROPDOWN TOGGLE
   toggleProfileDropdown(event)
   Opens or closes #profileDropdown by toggling the "hidden" class.
   Stops event propagation so the global document click listener
   below does not immediately close the menu when it opens.

   Global "click" listener:
   Closes the dropdown whenever the user clicks anywhere outside
   the .user-profile-menu-container element.
   ============================================================ */

function toggleProfileDropdown(event) {
    if (event) event.stopPropagation();
    let menu = document.getElementById("profileDropdown");
    if (menu) {
        menu.classList.toggle("hidden");
    }
}

// Close profile dropdown on any outside click
document.addEventListener("click", (e) => {
    let menu = document.getElementById("profileDropdown");
    if (menu && !menu.classList.contains("hidden")) {
        if (!e.target.closest(".user-profile-menu-container")) {
            menu.classList.add("hidden");
        }
    }
});



renderAdminProfileHeader(); 


/* ============================================================
   SECTION 6 — STORY CARD GRID: loadStories()
   Fetches all stories from GET /Stories (json-server).
   Stores them in currentAdminStories cache for modal lookups.
   Renders story cards inside #storiesContainer.

   Card contents:
   - Cover image (with Unsplash fallback if none provided)
   - Genre badge, Status badge (PUBLISHED / DRAFT)
   - ⭐ Rating badge from calculateRatingStats()
   - Story title, author, truncated description + "Read More" button
   - Scene/node count stat box
   - Action row: ✏️ Edit | 👁️ Preview | 🗑️ Delete

   Empty state: Shown if /Stories returns an empty array.
   Called on: DOMContentLoaded and after any story CRUD action.
   ============================================================ */

async function loadStories() {
    let response = await fetch(`${API_BASE}/Stories`);
    if (!response.ok) return;

    let stories = await response.json();
    currentAdminStories = stories; // Cache for modal use

    let container = document.getElementById("storiesContainer");
    if (!container) return;

    // Empty state — no stories in the database yet
    if (stories.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; border: 3px dashed #000; border-radius: 24px; padding: 48px 24px; text-align: center; background: #fff; box-shadow: 6px 6px 0px #000;">
                <h2 style="font-family: var(--font-display); font-size: 28px; margin-bottom: 12px;">NO STORIES CREATED YET</h2>
                <p style="font-weight: 700; margin-bottom: 20px;">Create your first interactive branching story or restore the sample adventure.</p>
                <button onclick="redirectStory()" class="primary-btn" style="width: auto; padding: 12px 28px;">+ Create Story</button>
            </div>
        `;
        return;
    }

    // Clear and rebuild the card grid
    container.innerHTML = "";

    stories.forEach((element) => {
        let nodeCount   = element.nodes ? element.nodes.length : 0;
        let statusClass = element.status === "published" ? "status-published" : "status-draft";
        let statusText  = element.status === "published" ? "🌐 PUBLISHED" : "🔒 DRAFT (PRIVATE)";

        // Cover image HTML — fallback to Unsplash placeholder
        let coverImg = element.imageURL || element.coverImage
            ? `<img src="${element.imageURL || element.coverImage}" alt="${element.title}" onerror="this.src='https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'">`
            : `<div class="no-image" style="display: flex; align-items: center; justify-content: center; height: 100%; font-weight: 800; color: #666;">No Cover Image</div>`;

        // Truncate long descriptions and add a "Read More" button
        let rawDesc        = element.description || "No description provided.";
        let isLong         = rawDesc.length > 110;
        let truncatedDesc  = isLong ? rawDesc.substring(0, 110) + "..." : rawDesc;
        let readMoreBtnHtml = isLong
            ? ` <button type="button" class="view-more-btn" onclick="openDescriptionModal('${element.id}')">Read More &rarr;</button>`
            : ``;

        container.innerHTML += `
            <div class="story-card">
                <div class="story-card-image">
                    ${coverImg}
                    <div class="story-image-hover-views">
                        <span>👁️ ${(element.views || 0).toLocaleString()} VIEWS</span>
                    </div>
                </div>
                <div class="story-card-content">
                    <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
                        <span class="badge-genre">${(element.genre || "General").toUpperCase()}</span>
                        <span class="badge-status ${statusClass}">${statusText}</span>
                        <span style="background: #ffde59; border: 1.5px solid #000; border-radius: 100px; padding: 2px 10px; font-size: 12px; font-weight: 800; color: #000;">${(calculateRatingStats(element)).display}</span>
                    </div>
                    <h3>${element.title || "Untitled Story"}</h3>
                    <div class="author-tag" style="margin-bottom: 10px;">BY ${(element.author || "ADMIN").toUpperCase()}</div>
                    <p class="story-description">${truncatedDesc}${readMoreBtnHtml}</p>
                    <div class="stat-lockup-box">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                        <span><strong>${nodeCount}</strong> SCENES &bull; <strong>${(element.nodes || []).filter(n => n.isEnding).length}</strong> ENDINGS</span>
                    </div>
                </div>
                <div class="story-actions">
                    <button type="button" class="btn-edit" onclick="editStory('${element.id}')">
                        ✏️ Edit
                    </button>
                    <button type="button" class="btn-preview" onclick="previewStory('${element.id}')">
                        👁️ Preview
                    </button>
                    <button type="button" class="btn-delete" onclick="deleteStory('${element.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    });
}


/* ============================================================
   SECTION 7 — RESTORE SAMPLE STORY: restoreSampleStory()
   Creates a fully-wired 6-node branching story in db.json.
   Story: "The Lost Kingdom" — adventure genre, published.

   Node map:
     Village ──► Dark Forest ──► Hidden Treasure (GOOD ending)
             │                └► Back to Village  (NEUTRAL ending)
             └──► Ancient Castle ──► King's Victory (BAD ending)

   All IDs are generated fresh via crypto.randomUUID() so the
   story can be restored multiple times without ID conflicts.
   Guard: Only runs if the logged-in user has role "Admin".
   ============================================================ */

async function restoreSampleStory() {
    let user = adminUser;
    if (!user && window.Auth) {
        user = await Auth.getProfile();
        adminUser = user;
    }

    if (!user || user.role !== "Admin") {
        alert("Only Admin can restore sample story");
        return;
    }

    // Generate all node IDs upfront so choices can reference them
    let villageId  = crypto.randomUUID();
    let forestId   = crypto.randomUUID();
    let castleId   = crypto.randomUUID();
    let treasureId = crypto.randomUUID();
    let returnId   = crypto.randomUUID();
    let defeatId   = crypto.randomUUID();

    // Define each story node
    let villageNode = {
        id: villageId, title: "The Village",
        text: "You stand at the center of a mysterious village. Two paths lie before you.",
        location: "Village", characters: ["Traveler"],
        isEnding: false, endingType: null,
        choices: [
            { id: crypto.randomUUID(), text: "Enter the Dark Forest", targetNodeId: forestId },
            { id: crypto.randomUUID(), text: "Visit the Castle",      targetNodeId: castleId }
        ]
    };
    let forestNode = {
        id: forestId, title: "The Dark Forest",
        text: "The trees grow taller around you. You hear something moving in the shadows.",
        location: "Dark Forest", characters: ["Traveler", "Guardian"],
        isEnding: false, endingType: null,
        choices: [
            { id: crypto.randomUUID(), text: "Follow the mysterious path", targetNodeId: treasureId },
            { id: crypto.randomUUID(), text: "Turn back to the village",   targetNodeId: returnId }
        ]
    };
    let castleNode = {
        id: castleId, title: "The Ancient Castle",
        text: "You enter the castle and find the mysterious king waiting for you.",
        location: "Ancient Castle", characters: ["Traveler", "King"],
        isEnding: false, endingType: null,
        choices: [
            { id: crypto.randomUUID(), text: "Challenge the King", targetNodeId: defeatId }
        ]
    };
    let treasureNode = {
        id: treasureId, title: "The Hidden Treasure",
        text: "You follow the path and discover a legendary treasure hidden beneath the ancient trees.",
        location: "Hidden Cave", characters: ["Traveler"],
        isEnding: true, endingType: "good", choices: []
    };
    let returnNode = {
        id: returnId, title: "Back to the Village",
        text: "You safely return to the village. Perhaps another adventure awaits you.",
        location: "Village", characters: ["Traveler"],
        isEnding: true, endingType: "neutral", choices: []
    };
    let defeatNode = {
        id: defeatId, title: "The King's Victory",
        text: "The king defeats you. Your journey ends inside the ancient castle.",
        location: "Ancient Castle", characters: ["Traveler", "King"],
        isEnding: true, endingType: "bad", choices: []
    };

    // Assemble the complete story object
    let sampleStory = {
        title:       "The Lost Kingdom",
        author:      user.name || "Admin",
        genre:       "adventure",
        status:      "published",
        description: "A branching adventure where your decisions determine the fate of your journey.",
        imageURL:    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23",
        nodes:       [villageNode, forestNode, castleNode, treasureNode, returnNode, defeatNode],
        startNodeId: villageId
    };

    try {
        let response = await fetch(`${API_BASE}/Stories`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(sampleStory)
        });
        if (!response.ok) { alert("Sample story could not be created"); return; }
        showToastNotification("SAMPLE RESTORED 📚", "The Lost Kingdom restored successfully!", "✨");
        loadStories();
    } catch (e) {
        console.error("Error restoring sample story:", e);
        alert("Error connecting to server.");
    }
}

// Initialise the story grid on page load
document.addEventListener("DOMContentLoaded", loadStories);
loadStories(); // Also call immediately if DOM is already ready


/* ============================================================
   SECTION 8 — STATE: currentAdminStories []
   In-memory cache populated by loadStories().
   Allows openDescriptionModal() to find a story by ID instantly
   without an additional network fetch.
   ============================================================ */

let currentAdminStories = [];


/* ============================================================
   SECTION 9 — DESCRIPTION MODAL
   openDescriptionModal(storyId)
   - Looks up the story in currentAdminStories by ID
   - Fills all modal DOM elements: title, author, genre, status,
     description text, cover image, scene count, rating stats
   - Wires the "Edit" button to close modal and open editor
   - Displays the modal overlay (display = "flex")

   closeDescriptionModal()
   - Hides the modal overlay (display = "none")
   ============================================================ */

function openDescriptionModal(storyId) {
    let story = currentAdminStories.find(s => String(s.id) === String(storyId));
    if (!story) return;

    let modal = document.getElementById("descriptionModal");
    if (!modal) return;

    let sceneCount = story.nodes
        ? (Array.isArray(story.nodes) ? story.nodes.length : Object.keys(story.nodes).length)
        : 0;

    // Populate modal fields
    let modalTitle       = document.getElementById("modalTitle");
    let modalAuthor      = document.getElementById("modalAuthor");
    let modalGenre       = document.getElementById("modalGenre");
    let modalStatus      = document.getElementById("modalStatus");
    let modalDescription = document.getElementById("modalDescription");
    let modalCover       = document.getElementById("modalCover");
    let modalSceneCount  = document.getElementById("modalSceneCount");
    let modalEditBtn     = document.getElementById("modalEditBtn");
    let modalRatingAvg   = document.getElementById("modalRatingAvg");
    let modalRatingCount = document.getElementById("modalRatingCount");

    if (modalTitle)       modalTitle.textContent  = story.title || "Untitled";
    if (modalAuthor)      modalAuthor.textContent = "BY " + (story.author || "ADMIN").toUpperCase();
    if (modalGenre)       modalGenre.textContent  = (story.genre || "GENERAL").toUpperCase();
    if (modalStatus) {
        modalStatus.textContent = (story.status || "DRAFT").toUpperCase();
        modalStatus.className   = "badge-status " + (story.status === "published" ? "status-published" : "status-draft");
    }
    if (modalDescription) {
        modalDescription.textContent   = story.description || "No description provided.";
        modalDescription.style.display = "block";
    }
    if (modalCover)      modalCover.src = story.imageURL || story.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';
    if (modalSceneCount) modalSceneCount.textContent = sceneCount;

    let rStats = calculateRatingStats(story);
    if (modalRatingAvg)   modalRatingAvg.textContent   = rStats.avg;
    if (modalRatingCount) modalRatingCount.textContent = rStats.count;

    let modalViewsCount = document.getElementById("modalViewsCount");
    if (modalViewsCount) modalViewsCount.textContent = (story.views || 0).toLocaleString();

    if (modalEditBtn) {
        modalEditBtn.onclick = () => { closeDescriptionModal(); editStory(story.id); };
    }

    modal.style.display = "flex";
}

function closeDescriptionModal() {
    let modal = document.getElementById("descriptionModal");
    if (modal) modal.style.display = "none";
}


/* ============================================================
   SECTION 10 — TAB SWITCHER: switchTab(tab)
   Controls which admin panel is visible:
     "stories" → #storiesContainer visible, #pitchesContainer hidden
     "pitches" → #pitchesContainer visible, #storiesContainer hidden
                 + triggers loadReaderPitches() immediately

   Also updates the tab button styles (active = black background).
   ============================================================ */

function switchTab(tab) {
    let storiesSection = document.getElementById("storiesContainer");
    let pitchesSection = document.getElementById("pitchesContainer");
    let reviewsSection = document.getElementById("reviewsCommentsContainer");
    let tabStories     = document.getElementById("tabStories");
    let tabPitches     = document.getElementById("tabPitches");
    let tabReviews     = document.getElementById("tabReviewsComments");

    if (tab === "stories") {
        if (storiesSection) {
            storiesSection.style.setProperty("display", "grid", "important");
            storiesSection.classList.remove("hidden");
        }
        if (pitchesSection) pitchesSection.style.display = "none";
        if (reviewsSection) reviewsSection.style.display = "none";

        if (tabStories) { tabStories.style.background = "#000"; tabStories.style.color = "#fff"; }
        if (tabPitches) { tabPitches.style.background = "#fff"; tabPitches.style.color = "#000"; }
        if (tabReviews) { tabReviews.style.background = "#fff"; tabReviews.style.color = "#000"; }
    } else if (tab === "pitches") {
        if (storiesSection) {
            storiesSection.style.setProperty("display", "none", "important");
            storiesSection.classList.add("hidden");
        }
        if (pitchesSection) pitchesSection.style.display = "flex";
        if (reviewsSection) reviewsSection.style.display = "none";

        if (tabStories) { tabStories.style.background = "#fff"; tabStories.style.color = "#000"; }
        if (tabPitches) { tabPitches.style.background = "#000"; tabPitches.style.color = "#fff"; }
        if (tabReviews) { tabReviews.style.background = "#fff"; tabReviews.style.color = "#000"; }
        loadReaderPitches();
    } else if (tab === "reviewsComments") {
        if (storiesSection) {
            storiesSection.style.setProperty("display", "none", "important");
            storiesSection.classList.add("hidden");
        }
        if (pitchesSection) pitchesSection.style.display = "none";
        if (reviewsSection) reviewsSection.style.display = "flex";

        if (tabStories) { tabStories.style.background = "#fff"; tabStories.style.color = "#000"; }
        if (tabPitches) { tabPitches.style.background = "#fff"; tabPitches.style.color = "#000"; }
        if (tabReviews) { tabReviews.style.background = "#000"; tabReviews.style.color = "#fff"; }
        loadAdminReviewsComments();
    }
}

let adminSelectedStoryFilter = "all";

async function loadAdminReviewsComments() {
    let container = document.getElementById("reviewsCommentsContainer");
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding: 40px; font-weight:800; font-size:16px;">Loading platform reviews, comments, and story analytics...</div>`;

    try {
        let [storiesRes, reviewsRes, commentsRes] = await Promise.all([
            fetch(`${API_BASE}/Stories`),
            fetch(`${API_BASE}/Reviews`),
            fetch(`${API_BASE}/Comments`)
        ]);

        let stories = storiesRes.ok ? await storiesRes.json() : [];
        let allReviews = reviewsRes.ok ? await reviewsRes.json() : [];
        let allComments = commentsRes.ok ? await commentsRes.json() : [];

        let storyMap = {};
        let totalPlatformViews = 0;
        stories.forEach(s => {
            storyMap[s.id] = s.title || "Untitled";
            totalPlatformViews += (s.views || 0);
        });

        let totalScore = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
        let avgRating = allReviews.length > 0 ? (totalScore / allReviews.length).toFixed(1) : "0.0";

        let filteredReviews = adminSelectedStoryFilter === "all"
            ? allReviews
            : allReviews.filter(r => String(r.storyId) === String(adminSelectedStoryFilter));

        let filteredComments = adminSelectedStoryFilter === "all"
            ? allComments
            : allComments.filter(c => String(c.storyId) === String(adminSelectedStoryFilter));

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 8px;">
                <div style="background: #e0f2fe; border: 2.5px solid #000; border-radius: 18px; padding: 20px; box-shadow: 4px 4px 0px #000;">
                    <div style="font-size: 12px; font-weight: 900; color: #0369a1; text-transform: uppercase;">👁️ TOTAL STORY READS</div>
                    <div style="font-family: var(--font-display); font-size: 32px; margin-top: 4px;">${totalPlatformViews.toLocaleString()}</div>
                    <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-top: 4px;">Across all ${stories.length} stories</div>
                </div>

                <div style="background: #fff8db; border: 2.5px solid #000; border-radius: 18px; padding: 20px; box-shadow: 4px 4px 0px #000;">
                    <div style="font-size: 12px; font-weight: 900; color: #854d0e; text-transform: uppercase;">⭐ TOTAL READER REVIEWS</div>
                    <div style="font-family: var(--font-display); font-size: 32px; margin-top: 4px;">${allReviews.length}</div>
                    <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-top: 4px;">Platform Avg: <strong>${avgRating} / 5.0</strong></div>
                </div>

                <div style="background: #f3e8ff; border: 2.5px solid #000; border-radius: 18px; padding: 20px; box-shadow: 4px 4px 0px #000;">
                    <div style="font-size: 12px; font-weight: 900; color: #6b21a8; text-transform: uppercase;">💬 COMMUNITY COMMENTS</div>
                    <div style="font-family: var(--font-display); font-size: 32px; margin-top: 4px;">${allComments.length}</div>
                    <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-top: 4px;">Reader comments & replies</div>
                </div>
            </div>

            <div style="background: #ffffff; border: 2.5px solid #000; border-radius: 16px; padding: 14px 20px; box-shadow: 3px 3px 0px #000; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: 900; font-size: 13.5px; text-transform: uppercase;">Filter by Story:</span>
                    <select id="adminStoryFilterSelect" onchange="adminSelectedStoryFilter = this.value; loadAdminReviewsComments();" style="border: 2px solid #000; border-radius: 100px; padding: 6px 16px; font-weight: 800; font-size: 13px; background: #f8fafc; cursor: pointer; outline: none;">
                        <option value="all" ${adminSelectedStoryFilter === 'all' ? 'selected' : ''}>All Stories (${stories.length})</option>
                        ${stories.map(s => `
                            <option value="${s.id}" ${adminSelectedStoryFilter === s.id ? 'selected' : ''}>
                                ${s.title} (👁️ ${s.views || 0} views)
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div style="font-size: 12.5px; font-weight: 800; color: #475569;">
                    Showing <strong>${filteredReviews.length}</strong> reviews & <strong>${filteredComments.length}</strong> comments
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; align-items: start;">
                <div style="background: #ffffff; border: 2.5px solid #000; border-radius: 20px; padding: 22px; box-shadow: 4px 4px 0px #000;">
                    <h3 style="font-family: var(--font-display); font-size: 18px; margin: 0 0 16px; text-transform: uppercase;">
                        ⭐ Reader Reviews (${filteredReviews.length})
                    </h3>

                    <div style="display: flex; flex-direction: column; gap: 12px; max-height: 650px; overflow-y: auto; padding-right: 4px;">
                        ${filteredReviews.length === 0 ? `
                            <div class="community-empty-box">No reviews found for this selection</div>
                        ` : filteredReviews.map(r => `
                            <div style="background: #f8fafc; border: 2px solid #000; border-radius: 14px; padding: 14px; box-shadow: 2px 2px 0px #000;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                                    <div>
                                        <div style="font-size: 11px; font-weight: 900; color: #5c4ade; text-transform: uppercase;">
                                            📖 ${storyMap[r.storyId] || r.storyId}
                                        </div>
                                        <div style="font-weight: 800; font-size: 13.5px; margin-top: 2px;">
                                            ${r.username}
                                        </div>
                                    </div>
                                    <span style="background: #ffde59; border: 1.5px solid #000; border-radius: 100px; padding: 2px 8px; font-weight: 900; font-size: 11.5px;">
                                        ⭐ ${r.rating}.0
                                    </span>
                                </div>
                                <div style="font-size: 13.5px; font-weight: 600; color: #1e293b; margin: 8px 0; line-height: 1.5;">
                                    ${escapeHtmlAdmin(r.reviewText)}
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px;">
                                    <span style="font-size: 11px; font-weight: 600; color: #64748b;">${new Date(r.createdAt).toLocaleDateString()}</span>
                                    <button type="button" onclick="deleteAdminReview('${r.id}')" style="background: #fee2e2; color: #dc2626; border: 1.5px solid #dc2626; border-radius: 100px; padding: 3px 10px; font-size: 11px; font-weight: 800; cursor: pointer;">🗑️ Remove Review</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="background: #ffffff; border: 2.5px solid #000; border-radius: 20px; padding: 22px; box-shadow: 4px 4px 0px #000;">
                    <h3 style="font-family: var(--font-display); font-size: 18px; margin: 0 0 16px; text-transform: uppercase;">
                        💬 Comments & Replies (${filteredComments.length})
                    </h3>

                    <div style="display: flex; flex-direction: column; gap: 12px; max-height: 650px; overflow-y: auto; padding-right: 4px;">
                        ${filteredComments.length === 0 ? `
                            <div class="community-empty-box">No comments found for this selection</div>
                        ` : filteredComments.map(c => `
                            <div style="background: #f8fafc; border: 2px solid #000; border-radius: 14px; padding: 14px; box-shadow: 2px 2px 0px #000;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                                    <div>
                                        <div style="font-size: 11px; font-weight: 900; color: #5c4ade; text-transform: uppercase;">
                                            📖 ${storyMap[c.storyId] || c.storyId} ${c.parentId ? '• <span style="color:#0284c7;">REPLY</span>' : '• <span style="color:#16a34a;">ROOT COMMENT</span>'}
                                        </div>
                                        <div style="font-weight: 800; font-size: 13.5px; margin-top: 2px;">
                                            @${c.username}
                                        </div>
                                    </div>
                                    <span style="font-size: 12px; font-weight: 700; color: #64748b;">
                                        👍 ${(c.likes && c.likes.length) || 0}
                                    </span>
                                </div>
                                <div style="font-size: 13.5px; font-weight: 600; color: #1e293b; margin: 8px 0; line-height: 1.5;">
                                    ${escapeHtmlAdmin(c.text)}
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px;">
                                    <span style="font-size: 11px; font-weight: 600; color: #64748b;">${new Date(c.createdAt).toLocaleDateString()}</span>
                                    <button type="button" onclick="deleteAdminComment('${c.id}')" style="background: #fee2e2; color: #dc2626; border: 1.5px solid #dc2626; border-radius: 100px; padding: 3px 10px; font-size: 11px; font-weight: 800; cursor: pointer;">🗑️ Remove Comment</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="community-empty-box">Failed to load admin reviews: ${err.message}</div>`;
    }
}

async function deleteAdminReview(id) {
    if (!confirm("Remove this review from the story?")) return;
    try {
        const token = (window.Auth && Auth.getToken) ? Auth.getToken() : localStorage.getItem("token");
        let res = await fetch(`${API_BASE}/Reviews/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token ? `Bearer ${token}` : ""
            }
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Delete failed");
        }
        loadAdminReviewsComments();
    } catch (e) {
        alert(e.message);
    }
}

async function deleteAdminComment(id) {
    if (!confirm("Remove this comment and any child replies?")) return;
    try {
        const token = (window.Auth && Auth.getToken) ? Auth.getToken() : localStorage.getItem("token");
        let res = await fetch(`${API_BASE}/Comments/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token ? `Bearer ${token}` : ""
            }
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Delete failed");
        }
        loadAdminReviewsComments();
    } catch (e) {
        alert(e.message);
    }
}

function escapeHtmlAdmin(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}


/* ============================================================
   SECTION 11 — READER PITCHES: loadReaderPitches()
   Fetches all pitch records from GET /ReaderStories.
   Excludes pitches where adminHidden === true (soft-deleted).
   Renders each pitch as a card inside #pitchesContainer.

   Pitch card contents:
   - Genre badge + Status badge (PENDING / APPROVED / REJECTED)
   - Submitted-by name and formatted date
   - Story title and description body
   - Pending pitches: Approve (+30 XP) | Reject | Remove buttons
   - Decided pitches: Admin comment textarea + Save / Remove buttons
   ============================================================ */

async function loadReaderPitches() {
    let container = document.getElementById("pitchesContainer");
    if (!container) return;
    container.innerHTML = '<p style="font-weight: 700; color: #888; padding: 16px;">Loading pitches...</p>';

    try {
        let res        = await fetch(`${API_BASE}/ReaderStories`);
        let rawPitches = res.ok ? await res.json() : [];

        // Filter out pitches the admin has soft-deleted
        let pitches = rawPitches.filter(p => !p.adminHidden);

        if (pitches.length === 0) {
            container.innerHTML = '<div style="border: 3px dashed #000; border-radius: 24px; padding: 48px; text-align: center; background: #fff; box-shadow: 6px 6px 0px #000;"><h2 style="font-family: var(--font-display);">NO PITCHES YET</h2><p style="font-weight: 700; color: #555;">No pending or active story pitches in your queue.</p></div>';
            return;
        }

        container.innerHTML = pitches.map(p => {
            let isPending     = !p.status || p.status === "pending";
            // Status badge colours (modern soft style)
            let statusBg      = p.status === "approved" ? "#dcfce7" : p.status === "rejected" ? "#fee2e2" : "#fef3c7";
            let statusBorder  = p.status === "approved" ? "#86efac" : p.status === "rejected" ? "#fca5a5" : "#fde047";
            let statusColor   = p.status === "approved" ? "#166534" : p.status === "rejected" ? "#991b1b" : "#92400e";
            let statusText    = (p.status || "pending").toUpperCase();
            let dateStr       = p.submittedAt
                ? new Date(p.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "";
            let existingComment = p.adminComment || "";

            // Build action buttons based on pitch state
            let actionsHtml = "";
            if (isPending) {
                actionsHtml = `
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 14px;">
                        <button onclick="updatePitchStatus('${p.id}', 'approved')" style="padding: 9px 22px; border: none; border-radius: 100px; background: #22c55e; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25);">✅ Approve Pitch (+30 XP)</button>
                        <button onclick="updatePitchStatus('${p.id}', 'rejected')" style="padding: 9px 22px; border: none; border-radius: 100px; background: #ef4444; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">✕ Reject</button>
                        <button onclick="deletePitch('${p.id}')" style="padding: 8px 18px; border: 1px solid #cbd5e1; border-radius: 100px; background: #fff; font-weight: 700; font-size: 13px; cursor: pointer; color: #64748b;">🗑 Remove</button>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <div style="margin-top: 14px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px;">
                        <label style="font-weight: 800; font-size: 12px; color: #475569; display: block; margin-bottom: 6px;">📝 ADMIN COMMENT FOR READER</label>
                        <textarea id="comment_${p.id}" placeholder="Leave feedback for reader (e.g. Loved the idea!)..." rows="2" style="width: 100%; padding: 10px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-family: var(--font-ui, sans-serif); font-size: 13.5px; font-weight: 500; resize: none; outline: none; box-sizing: border-box; background: #fff;">${existingComment}</textarea>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button onclick="saveAdminComment('${p.id}')" style="padding: 8px 20px; border: none; border-radius: 100px; background: #4f46e5; color: #fff; font-weight: 700; font-size: 12.5px; cursor: pointer; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">💾 Save Comment</button>
                            <button onclick="deletePitch('${p.id}')" style="padding: 8px 18px; border: 1px solid #cbd5e1; border-radius: 100px; background: #fff; font-weight: 700; font-size: 12.5px; cursor: pointer; color: #64748b;">🗑 Remove</button>
                        </div>
                    </div>
                `;
            }

            return `
                <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01); display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%; word-break: break-word; overflow-wrap: anywhere;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                            <span style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 100px; padding: 4px 14px; font-size: 12px; font-weight: 700;">${(p.genre || "general").toUpperCase()}</span>
                            <span style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; border-radius: 100px; padding: 4px 14px; font-size: 12px; font-weight: 800;">${statusText}</span>
                        </div>
                        <div style="font-size: 13px; font-weight: 600; color: #64748b; margin-left: auto;">
                            By <strong style="color: #0f172a;">${p.submittedBy || "Reader"}</strong> ${dateStr ? '• ' + dateStr : ''}
                        </div>
                    </div>
                    <div style="word-break: break-word; overflow-wrap: anywhere; width: 100%;">
                        <h3 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 4px 0 10px; line-height: 1.3; font-family: var(--font-ui, sans-serif);">${p.title}</h3>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; font-size: 14px; color: #334155; font-weight: 500; line-height: 1.65; word-break: break-word; overflow-wrap: anywhere; box-sizing: border-box; width: 100%;">
                            ${p.description}
                        </div>
                    </div>
                    ${actionsHtml}
                </div>
            `;
        }).join("");
    } catch(e) {
        container.innerHTML = '<p style="font-weight: 700; color: #e00; padding: 16px;">Could not load pitches.</p>';
    }
}


/* ============================================================
   SECTION 12 — PITCH ACTIONS

   updatePitchStatus(pitchId, status)
   PATCHes the pitch status to "approved" or "rejected".
   On approval:
     1. Reads submittedById from the PATCH response
     2. Fetches the reader's user record to get current XP
     3. PATCHes the reader with: newXp = currentXp + 30
        and pendingToast: { message, xpAwarded: 30 }
        → The reader sees a toast notification on their next login

   saveAdminComment(pitchId)
   Reads textarea#comment_<id> value and PATCHes adminComment.

   deletePitch(pitchId)
   Soft-delete: PATCHes { adminHidden: true }.
   The pitch remains in db.json but disappears from the admin queue.
   The reader's own "My Pitches" view is unaffected.
   ============================================================ */

async function updatePitchStatus(pitchId, status) {
    let res = await fetch(`${API_BASE}/ReaderStories/${pitchId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: status })
    });

    if (!res.ok) {
        alert("Failed to update pitch status.");
        return;
    }

    // Award +30 XP to the reader when their pitch is approved
    if (status === "approved") {
        try {
            let pitchData   = await res.json();
            let submitterId = pitchData.submittedById;

            if (submitterId) {
                let userRes = await fetch(`${API_BASE}/Users/${submitterId}`);
                if (userRes.ok) {
                    let userData = await userRes.json();
                    let newXp    = (userData.xp || 100) + 30;

                    await fetch(`${API_BASE}/Users/${submitterId}`, {
                        method:  "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body:    JSON.stringify({
                            xp: newXp,
                            pendingToast: {
                                message:   "🎉 Your story pitch was ACCEPTED by the admin! +30 XP earned!",
                                xpAwarded: 30
                            }
                        })
                    });
                }
            }
        } catch(e) {
            console.warn("Could not award XP to pitch submitter:", e);
        }
    }

    if (status === "approved") {
        showToastNotification("PITCH APPROVED! ✅", "Pitch marked approved and +30 XP awarded to reader!", "🎉");
    } else {
        showToastNotification("PITCH REJECTED ✕", "Pitch has been rejected.", "⚠️");
    }

    loadReaderPitches();
}

async function saveAdminComment(pitchId) {
    let textarea = document.getElementById("comment_" + pitchId);
    if (!textarea) return;
    let comment = textarea.value.trim();

    let res = await fetch(`${API_BASE}/ReaderStories/${pitchId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ adminComment: comment })
    });

    if (res.ok) {
        showToastNotification("FEEDBACK SAVED 💾", "Admin comment saved for reader.", "📝");
        loadReaderPitches();
    } else {
        alert("Failed to save comment.");
    }
}

async function deletePitch(pitchId) {
    if (!confirm("Remove this pitch from your admin queue? (The reader will keep seeing their status: Approved/Rejected).")) return;

    let res = await fetch(`${API_BASE}/ReaderStories/${pitchId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ adminHidden: true })
    });

    if (res.ok) {
        showToastNotification("PITCH REMOVED 🗑️", "Pitch removed from your active queue.", "🗑️");
        loadReaderPitches();
    } else {
        alert("Failed to remove pitch.");
    }
}


function previewStory(storyId) {
    if (!storyId) return;
    try {
        sessionStorage.setItem("lastPreviewStoryId", String(storyId));
    } catch (e) {}
    window.location.href = `preview?id=${encodeURIComponent(storyId)}`;
}


