
/* ============================================================
   preview.js
   Page:  pages/admin/preview.html
   Role:  Admin-only story preview engine.
          Allows the admin to play through any story exactly as a
          reader would, without writing XP or saving sessions.

   FLOW (Top to Bottom — Page Load Order):
   ─────────────────────────────────────────────────────────
   1.  Auth guard        — redirect non-admins to login.html
   2.  URL parsing       — extract ?id= from query string
   3.  State variables   — currentStory, currentNode,
                           traversalPath, allStories
   4.  editStoryBtn      — wires the "Edit in Builder" button
   5.  renderAdminProfileHeader() — inject avatar + dropdown
   6.  toggleProfileDropdown()   — open/close profile menu
   7.  Global click listener     — close dropdown on outside click
   8.  loadStoryForPreview()     — fetch stories + start preview
   9.  renderCurrentScene()      — render current node as play card
                                  (handles ending cards too)
   10. selectPreviewChoice()     — advance to chosen node
   11. previewRetreat()          — undo last choice (go back 1 step)
   12. restartPreview()          — reset to story start node
   13. renderPathHistory()       — render visited node breadcrumb trail
   14. escapeHtml()              — XSS-safe HTML string helper
   15. handleLogout()            — clear session → login.html
   16. DOMContentLoaded          — trigger profile header + story load

   NOTE: No XP / session saving happens here.
         This is a pure read-only admin walkthrough tool.

   DATA FLOW:
     GET /Stories         → fetch all stories (to pick one to preview)
     No PATCH/POST calls  — admin preview is read-only
   ============================================================ */


/* ============================================================
   SECTION 1 — AUTH GUARD
   Immediately check localStorage for a logged-in Admin user.
   If none found, redirect to login before rendering anything.
   ============================================================ */

var currentUser = null;
try {
    currentUser = JSON.parse(localStorage.getItem("user"));
} catch (e) {
    currentUser = null;
}

if (!currentUser || currentUser.role !== "Admin") {
    window.location.href = "../auth/login.html";
}


/* ============================================================
   SECTION 2 — URL PARSING + STATE VARIABLES
   storyId    — from ?id= query param (can be null → use first story)
   allStories — full list fetched from /Stories
   currentStory  — the story currently being previewed
   currentNode   — the node (scene) currently displayed
   traversalPath — ordered list of { nodeId, title, choiceText }
                   representing the path the admin has walked so far
   ============================================================ */

const urlParams    = new URLSearchParams(window.location.search);
let storyId        = urlParams.get("id");

let allStories     = [];
let currentStory   = null;
let currentNode    = null;
let traversalPath  = [];


/* ============================================================
   SECTION 3 — EDIT IN BUILDER BUTTON
   Wired once on load. Clicking it redirects to
   add_stories.html?id=<currentStory.id>.
   Falls back to admin.html if no story is loaded yet.
   ============================================================ */

document.getElementById("editStoryBtn")?.addEventListener("click", () => {
    if (currentStory && currentStory.id) {
        window.location.href = `add_stories.html?id=${currentStory.id}`;
    } else {
        window.location.href = "admin.html";
    }
});


/* ============================================================
   SECTION 4 — NAVBAR: renderAdminProfileHeader()
   Identical to the admin dashboard version.
   Reads currentUser and injects the avatar button + dropdown
   into #navAuthContainer.
   Includes links to: Admin Dashboard | Story Preview | Sign Out
   ============================================================ */

function renderAdminProfileHeader() {
    let navAuthContainer = document.getElementById("navAuthContainer");
    if (!navAuthContainer || !currentUser) return;

    let initial     = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "A";
    let activeXp    = (currentUser.xp !== undefined) ? currentUser.xp : 100;
    let roleTitle   = currentUser.role || "Admin";
    let xpBadgeHtml = (currentUser.role !== "Admin")
        ? `<span class="user-xp-badge">⭐ ${activeXp} XP</span>`
        : ``;

    navAuthContainer.innerHTML = `
        <div class="user-profile-menu-container">
            <button type="button" class="profile-menu-btn" onclick="toggleProfileDropdown(event)">
                <span class="user-avatar">${initial}</span>
                <span class="user-name-label">${currentUser.name || 'Admin'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-left: 2px;"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div id="profileDropdown" class="profile-dropdown-menu hidden" onclick="event.stopPropagation()">
                <div class="profile-dropdown-header">
                    <strong>${currentUser.name || 'Admin'}</strong>
                    <div style="display: flex; gap: 6px; margin-top: 4px; align-items: center;">
                        <span class="user-role-badge">${roleTitle.toUpperCase()}</span>
                        ${xpBadgeHtml}
                    </div>
                </div>
                <div class="profile-dropdown-links">
                    <a href="admin.html" class="dropdown-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                        Admin Dashboard
                    </a>
                    <a href="preview.html" class="dropdown-item" style="background: var(--color-sky-wash); font-weight: 800;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        Story Preview
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
   SECTION 5 — PROFILE DROPDOWN TOGGLE
   toggleProfileDropdown(event) — toggle "hidden" class on #profileDropdown
   Global click listener       — close dropdown on any outside click
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
   SECTION 6 — LOAD STORY: loadStoryForPreview()
   The main initialiser. Called on DOMContentLoaded.

   Steps:
   a. Render the profile header.
   b. GET /Stories — fetch the full story list.
   c. If no stories → show an empty-state message.
   d. If ?id= was in the URL → find that story.
   e. Otherwise default to the first story in the list.
   f. Normalise nodes (handle array or object format).
   g. Populate the story selector dropdown (#storySelector).
   h. Find the start node and initialise traversalPath.
   i. Call renderCurrentScene() to begin the preview.
   ============================================================ */

async function loadStoryForPreview() {
    renderAdminProfileHeader();
    let sceneContainer = document.getElementById("sceneContainer");

    try {
        let allRes = await fetch(`${API_BASE}/Stories`);
        allStories = await allRes.json();

        // Step c: No stories at all
        if (!allStories || allStories.length === 0) {
            if (sceneContainer) {
                sceneContainer.innerHTML = `
                    <div style="background: var(--color-paper-white); border: 3px solid #000; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 6px 6px 0px #000;">
                        <h2 style="font-family: var(--font-display); font-size: 28px; margin-bottom: 12px;">No Stories in Database</h2>
                        <p style="font-weight: 600; margin-bottom: 24px;">Please create a story first on the Admin Dashboard.</p>
                        <a href="admin.html" class="primary-btn" style="padding: 12px 28px;">← Back to Dashboard</a>
                    </div>
                `;
            }
            return;
        }

        // Step d/e: Resolve which story to preview
        if (storyId) {
            currentStory = allStories.find(s => String(s.id) === String(storyId));
        }
        if (!currentStory) {
            currentStory = allStories[0];
            storyId = currentStory.id;
        }

        // Step f: Normalise nodes — support both array and keyed-object formats
        let nodesList = [];
        if (Array.isArray(currentStory.nodes)) {
            nodesList = currentStory.nodes;
        } else if (currentStory.nodes && typeof currentStory.nodes === "object") {
            nodesList = Object.values(currentStory.nodes);
        }
        currentStory.nodes = nodesList;

        // Step g: Populate story selector dropdown
        let storySelector = document.getElementById("storySelector");
        if (storySelector) {
            storySelector.innerHTML = allStories.map(s =>
                `<option value="${s.id}" ${String(s.id) === String(storyId) ? "selected" : ""}>${s.title || "Untitled"}</option>`
            ).join("");
            storySelector.onchange = () => {
                window.location.href = `preview.html?id=${storySelector.value}`;
            };
        }

        // Step h: Find start node and initialise traversalPath
        let startingNode = currentStory.nodes.find(n => n.id === currentStory.startNodeId)
            || currentStory.nodes[0];

        if (!startingNode) {
            if (sceneContainer) sceneContainer.innerHTML = `<p style="font-weight:700;">This story has no nodes yet.</p>`;
            return;
        }

        currentNode   = startingNode;
        traversalPath = [{
            nodeId:     startingNode.id,
            title:      startingNode.title || "Initial Scene",
            choiceText: null
        }];

        // Step i: Render the first scene
        renderCurrentScene();

    } catch (e) {
        console.error("Preview load error:", e);
        if (sceneContainer) {
            sceneContainer.innerHTML = `<p style="font-weight: 700; color: red;">Error loading story. Is json-server running on port 3000?</p>`;
        }
    }
}


/* ============================================================
   SECTION 7 — RENDER SCENE: renderCurrentScene()
   The core rendering function. Called every time the admin
   navigates to a new node.

   Two render paths:
   A. Ending node (currentNode.isEnding === true):
      - Renders an ending card with type badge (good/neutral/bad)
      - Shows "Play Again" and "← Back to Dashboard" buttons
      - Calls renderPathHistory() to show the full traversal

   B. Regular node:
      - Renders a play card with:
          * Location badge and character list
          * Scene title (h1)
          * Scene body text
          * "WHAT DO YOU DO?" prompt
          * Choice buttons (each shows destination node title)
          * "⏪ Rewind 1 Step Back" button (if not at start)
      - Calls renderPathHistory()
   ============================================================ */

function renderCurrentScene() {
    let sceneContainer    = document.getElementById("sceneContainer");
    let choicesContainer  = document.getElementById("choicesContainer");

    if (!sceneContainer || !currentNode) return;

    // ── Path A: Ending node ────────────────────────────────────────────────
    if (currentNode.isEnding) {
        let endingType  = (currentNode.endingType || "good").toUpperCase();
        let endingEmoji = endingType === "GOOD" ? "🏆" : endingType === "BAD" ? "💀" : "⚖️";
        let endingBg    = endingType === "GOOD" ? "#f0fff4" : endingType === "BAD" ? "#fff0f0" : "#fffbeb";
        let badgeBg     = endingType === "GOOD" ? "#34d399" : endingType === "BAD" ? "#f87171" : "#fbbf24";

        sceneContainer.innerHTML = `
            <div style="background: ${endingBg}; border: 3px solid #000; border-radius: 24px; padding: 36px; box-shadow: 8px 8px 0px #000; text-align: center;">
                <div style="margin-bottom: 20px;">
                    <span style="display: inline-block; padding: 8px 24px; background: ${badgeBg}; border: 2.5px solid #000; border-radius: 100px; font-weight: 900; font-size: 14px; box-shadow: 3px 3px 0px #000; text-transform: uppercase; color: #000;">
                        ${endingEmoji} ${endingType} ENDING REACHED
                    </span>
                </div>
                <h1 style="font-family: var(--font-display); font-size: clamp(24px, 4vw, 38px); margin-bottom: 18px; word-break: break-word; line-height: 1.1;">${escapeHtml(currentNode.title)}</h1>
                <div style="background: var(--color-sky-wash); border: 2px solid #000; border-radius: 16px; padding: 22px; margin-bottom: 24px; box-shadow: 4px 4px 0px #000; text-align: left;">
                    <p style="font-size: 16px; line-height: 1.7; font-weight: 600; color: #000; margin: 0;">${escapeHtml(currentNode.text)}</p>
                </div>
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="restartPreview()" class="primary-btn" style="width: auto; padding: 12px 28px; font-size: 14px; background: #ffde59; color: #000; border: 2.5px solid #000; border-radius: 100px; box-shadow: 4px 4px 0px #000; font-weight: 800; cursor: pointer;">🔄 PLAY AGAIN</button>
                    <a href="admin.html" class="secondary-btn" style="width: auto; padding: 12px 28px; font-size: 14px; background: #ffffff; color: #000; border: 2.5px solid #000; border-radius: 100px; box-shadow: 4px 4px 0px #000; font-weight: 800; text-decoration: none; cursor: pointer;">← BACK TO DASHBOARD</a>
                </div>
            </div>
        `;

        if (choicesContainer) choicesContainer.innerHTML = "";
        renderPathHistory();
        return;
    }

    // ── Path B: Regular scene node ────────────────────────────────────────
    let locationTag = currentNode.location
        ? `📍 ${currentNode.location.toUpperCase()}`
        : `📍 SCENE #${traversalPath.length}`;
    let charsTag = (currentNode.characters && currentNode.characters.length > 0)
        ? `👥 Present: ${currentNode.characters.join(', ')}`
        : '';

    let choices = Array.isArray(currentNode.choices) ? currentNode.choices : [];
    let choicesHTML = "";

    if (choices.length > 0) {
        // Build a button for each choice — shows destination node title as a hint
        choicesHTML = choices.map(choice => {
            let targetId  = choice.targetNodeId || choice.destinationNodeId || choice.targetId;
            let destNode  = currentStory.nodes.find(n => n.id === targetId);
            let destTitle = destNode ? destNode.title : `Node ID: ${targetId}`;

            return `
                <button type="button" class="choice-btn" onclick="selectPreviewChoice('${targetId}', '${escapeHtml(choice.text)}')" style="margin-bottom: 10px; width: 100%; padding: 14px 18px; background: #fff; border: 2px solid #000; border-radius: 100px; box-shadow: 3px 3px 0px #000; font-weight: 800; font-size: 14px; text-align: left; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; transition: all 0.15s ease; box-sizing: border-box;">
                    <span style="word-break: break-word;">👉 ${escapeHtml(choice.text)}</span>
                    <span style="font-size: 11px; color: var(--color-voltage-violet); font-weight: 700; white-space: nowrap; flex-shrink: 0;">&rarr; ${escapeHtml(destTitle)}</span>
                </button>
            `;
        }).join('');
    } else {
        // Dead-end warning — node has no choices and is not marked as ending
        choicesHTML = `
            <div style="background: #ffebee; border: 2px solid #000; border-radius: 14px; padding: 14px; font-weight: 800; color: #c62828; margin-bottom: 14px; font-size: 13px;">
                ⚠️ Dead End: This scene has no choices and was not marked as an ending.
            </div>
        `;
    }

    // Show "Rewind" button only if the admin is not at the very first node
    let retreatBtn = traversalPath.length > 1 ? `
        <button type="button" onclick="previewRetreat()" class="secondary-btn" style="width: 100%; margin-top: 6px; padding: 12px 18px; border-radius: 100px; font-weight: 800; cursor: pointer;">
            ⏪ Rewind 1 Step Back
        </button>
    ` : '';

    sceneContainer.innerHTML = `
        <div class="play-card" style="background: var(--color-paper-white); border: 3px solid #000; border-radius: 24px; padding: 28px 24px; box-shadow: 8px 8px 0px #000; width: 100%; box-sizing: border-box;">
            <div class="scene-badge-row">
                <span style="display: inline-block; padding: 5px 14px; background: var(--color-sunburst); border: 2px solid #000; border-radius: 100px; font-weight: 800; font-size: 12px; box-shadow: 2px 2px 0px #000;">
                    ${locationTag}
                </span>
                ${charsTag ? `<span style="font-weight: 700; font-size: 13px; color: #333; line-height: 1.4; word-break: break-word;">${charsTag}</span>` : ''}
            </div>

            <h1 style="font-family: var(--font-display); font-size: clamp(22px, 3.5vw, 32px); margin-bottom: 16px; line-height: 1.15; word-break: break-word;">
                ${escapeHtml(currentNode.title)}
            </h1>

            <div style="background: var(--color-sky-wash); border: 2px solid #000; border-radius: 16px; padding: 18px 20px; margin-bottom: 20px; box-shadow: 4px 4px 0px #000;">
                <p style="font-size: 15px; line-height: 1.7; font-weight: 600; color: #000; margin: 0;">${escapeHtml(currentNode.text)}</p>
            </div>

            <h3 style="font-weight: 800; font-size: 13px; text-transform: uppercase; margin-bottom: 12px; color: #000; letter-spacing: 0.05em;">
                WHAT DO YOU DO?
            </h3>

            <div id="readerChoices" style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                ${choicesHTML}
                ${retreatBtn}
            </div>
        </div>
    `;

    renderPathHistory();
}


/* ============================================================
   SECTION 8 — CHOICE SELECTION: selectPreviewChoice(targetNodeId, choiceText)
   Called when the admin clicks a choice button.
   Finds the target node in currentStory.nodes by ID,
   pushes it onto traversalPath, and re-renders the scene.
   ============================================================ */

function selectPreviewChoice(targetNodeId, choiceText) {
    let nextNode = currentStory.nodes.find(n => n.id === targetNodeId);
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

    renderCurrentScene();
}


/* ============================================================
   SECTION 9 — REWIND: previewRetreat()
   Removes the last entry from traversalPath and returns to
   the previous node. Does nothing if already at the start node.
   ============================================================ */

function previewRetreat() {
    if (traversalPath.length <= 1) return;
    traversalPath.pop();
    let prev    = traversalPath[traversalPath.length - 1];
    currentNode = currentStory.nodes.find(n => n.id === prev.nodeId);
    renderCurrentScene();
}


/* ============================================================
   SECTION 10 — RESTART: restartPreview()
   Resets the preview to the story's defined start node
   (or falls back to nodes[0] if startNodeId is unset).
   Clears traversalPath back to a single entry.
   ============================================================ */

function restartPreview() {
    let startingNode = currentStory.nodes.find(n => n.id === currentStory.startNodeId)
        || currentStory.nodes[0];

    currentNode   = startingNode;
    traversalPath = [{
        nodeId:     startingNode.id,
        title:      startingNode.title || "Initial Scene",
        choiceText: null
    }];

    renderCurrentScene();
}


/* ============================================================
   SECTION 11 — PATH HISTORY: renderPathHistory()
   Renders the visited node breadcrumb trail inside #traversalPath.
   Shows each node title as a numbered pill with ➔ arrows between.
   Displays total scene count in the header label.
   ============================================================ */

function renderPathHistory() {
    let pathContainer = document.getElementById("traversalPath");
    if (!pathContainer || traversalPath.length === 0) return;

    let stepsHTML = traversalPath.map((step, idx) => `
        <span style="display: inline-flex; align-items: center; padding: 5px 12px; background: var(--color-paper-white); border: 2px solid #000; border-radius: 100px; font-weight: 800; font-size: 11px; box-shadow: 2px 2px 0px #000;">
            ${idx + 1}. ${escapeHtml(step.title)}
        </span>
        ${idx < traversalPath.length - 1 ? '<span style="font-weight: 800; font-size: 14px; color: #000;">➔</span>' : ''}
    `).join('');

    pathContainer.innerHTML = `
        <div style="background: var(--color-lavender); border: 3px solid #000; border-radius: 20px; padding: 18px 20px; box-shadow: 6px 6px 0px #000; text-align: center; box-sizing: border-box; width: 100%;">
            <strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 10px;">
                Narrative Traversal Path (${traversalPath.length} scenes visited):
            </strong>
            <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px;">
                ${stepsHTML}
            </div>
        </div>
    `;
}


/* ============================================================
   SECTION 12 — UTILITY: escapeHtml(str)
   Converts special HTML characters to safe HTML entities.
   Prevents XSS when injecting story content into innerHTML.
   Used throughout renderCurrentScene() and renderPathHistory().
   ============================================================ */

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,  "&amp;")
        .replace(/</g,  "&lt;")
        .replace(/>/g,  "&gt;")
        .replace(/"/g,  "&quot;")
        .replace(/'/g,  "&#039;");
}


/* ============================================================
   SECTION 13 — LOGOUT: handleLogout()
   Clears the "user" key from localStorage and redirects to
   the login page (not Landing, since this is admin-only).
   ============================================================ */

function handleLogout() {
    localStorage.removeItem("user");
    window.location.href = "../auth/login.html";
}


/* ============================================================
   SECTION 14 — PAGE INITIALISATION
   Wire up everything on DOMContentLoaded.
   Also call immediately in case the DOM is already ready.
   ============================================================ */


renderAdminProfileHeader();
loadStoryForPreview();
