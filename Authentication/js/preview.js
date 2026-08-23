/**
 * Admin Story Preview Engine
 * Exact same interactive gameplay and branching logic as Reader mode, tailored for Admin preview.
 */

var currentUser = null;
try {
    currentUser = JSON.parse(localStorage.getItem("user"));
} catch (e) {
    currentUser = null;
}

if (!currentUser || currentUser.role !== "Admin") {
    window.location.href = "../auth/login.html";
}

const urlParams = new URLSearchParams(window.location.search);
let storyId = urlParams.get("id");

let allStories = [];
let currentStory = null;
let currentNode = null;
let traversalPath = [];

// Edit in Builder button
document.getElementById("editStoryBtn")?.addEventListener("click", () => {
    if (currentStory && currentStory.id) {
        window.location.href = `add_stories.html?id=${currentStory.id}`;
    } else {
        window.location.href = "admin.html";
    }
});

/* =====================================================
   ADMIN PROFILE DROPDOWN MENU (MATCHING ADMIN DASHBOARD)
===================================================== */
function renderAdminProfileHeader() {
    let navAuthContainer = document.getElementById("navAuthContainer");
    if (!navAuthContainer || !currentUser) return;

    let initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "A";
    let activeXp = (currentUser.xp !== undefined) ? currentUser.xp : 100;
    let roleTitle = currentUser.role || "Admin";
    let xpBadgeHtml = (currentUser.role !== "Admin") ? `<span class="user-xp-badge">⭐ ${activeXp} XP</span>` : ``;

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

async function loadStoryForPreview() {
    renderAdminProfileHeader();
    let sceneContainer = document.getElementById("sceneContainer");

    try {
        let allRes = await fetch("http://localhost:3000/Stories");
        allStories = await allRes.json();

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

        if (storyId) {
            currentStory = allStories.find(s => String(s.id) === String(storyId));
        }

        if (!currentStory) {
            currentStory = allStories[0];
            storyId = currentStory.id;
        }

        let nodesList = [];
        if (Array.isArray(currentStory.nodes)) {
            nodesList = currentStory.nodes;
        } else if (currentStory.nodes && typeof currentStory.nodes === "object") {
            nodesList = Object.values(currentStory.nodes);
        }
        currentStory.nodes = nodesList;

        if (nodesList.length === 0) {
            renderStoryHeader();
            if (sceneContainer) {
                sceneContainer.innerHTML = `
                    <div style="background: var(--color-paper-white); border: 3px solid #000; border-radius: 20px; padding: 40px 24px; text-align: center; box-shadow: 6px 6px 0px #000; margin-top: 20px;">
                        <h2 style="font-family: var(--font-display); font-size: 26px; margin-bottom: 12px;">⚠️ No Scene Nodes in Story "${escapeHtml(currentStory.title)}"</h2>
                        <p style="font-weight: 600; margin-bottom: 24px; color: #444;">This story has 0 scenes. Add scene nodes in the builder to preview the story.</p>
                        <a href="add_stories.html?id=${currentStory.id}" class="primary-btn" style="padding: 12px 28px; font-weight: 800;">✏️ Open Story Builder & Add Scenes</a>
                    </div>
                `;
            }
            return;
        }

        let startingNode = nodesList.find(n => n.id === currentStory.startNodeId) || nodesList[0];
        currentNode = startingNode;

        traversalPath = [
            {
                nodeId: startingNode.id,
                title: startingNode.title || "Initial Scene",
                choiceText: null
            }
        ];

        renderStoryHeader();
        renderCurrentScene();
    } catch (e) {
        console.error("Error loading story for preview:", e);
        if (sceneContainer) {
            sceneContainer.innerHTML = `
                <div style="background: #ffebee; border: 3px solid #000; border-radius: 20px; padding: 32px 20px; text-align: center; box-shadow: 6px 6px 0px #000;">
                    <h2 style="font-family: var(--font-display); font-size: 24px; margin-bottom: 12px; color: #c62828;">Failed to connect to JSON Server</h2>
                    <p style="font-weight: 600; margin-bottom: 16px;">Make sure json-server is running on port 3000.</p>
                    <a href="admin.html" class="secondary-btn" style="padding: 10px 20px;">← Back to Dashboard</a>
                </div>
            `;
        }
    }
}

function renderStoryHeader() {
    let headerEl = document.getElementById("storyHeader");
    if (!headerEl || !currentStory) return;

    let nodeCount = currentStory.nodes ? currentStory.nodes.length : 0;
    let statusClass = currentStory.status === "published" ? "status-published" : "status-draft";

    let storyOptionsHtml = allStories.map(s => `
        <option value="${s.id}" ${String(s.id) === String(currentStory.id) ? 'selected' : ''}>
            ${s.title} (${s.nodes ? (Array.isArray(s.nodes) ? s.nodes.length : Object.keys(s.nodes).length) : 0} scenes)
        </option>
    `).join('');

    headerEl.innerHTML = `
        <div class="preview-header-card">
            <div class="preview-story-info">
                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
                    <span class="badge-genre" style="padding: 4px 12px; font-weight: 800; font-size: 11px; border: 2px solid #000; border-radius: 100px; background: var(--color-sunburst);">${(currentStory.genre || 'General').toUpperCase()}</span>
                    <span class="badge-status ${statusClass}" style="padding: 4px 12px; font-weight: 800; font-size: 11px; border: 2px solid #000; border-radius: 100px;">${(currentStory.status || 'draft').toUpperCase()}</span>
                    <span style="padding: 4px 12px; font-weight: 800; font-size: 11px; border: 2px solid #000; border-radius: 100px; background: var(--color-lavender); color: #000;">👑 ADMIN PREVIEW MODE</span>
                </div>
                <h1 class="preview-story-title">${escapeHtml(currentStory.title)}</h1>
                <div style="font-weight: 800; font-size: 13px; color: var(--color-voltage-violet);">BY ${(currentStory.author || 'ADMIN').toUpperCase()} &bull; ${nodeCount} TOTAL SCENES</div>
            </div>
            
            <div class="preview-controls-box">
                <div class="preview-switch-group">
                    <label style="font-size: 11px; font-weight: 800; text-transform: uppercase;">Switch Story:</label>
                    <select class="preview-select-input" onchange="switchPreviewStory(this.value)">
                        ${storyOptionsHtml}
                    </select>
                </div>
                <button onclick="restartPreview()" class="secondary-btn" style="padding: 10px 16px; font-size: 13px; white-space: nowrap; height: 42px;">
                    🔄 Restart Path
                </button>
            </div>
        </div>
    `;
}

function switchPreviewStory(newStoryId) {
    window.location.href = `preview.html?id=${newStoryId}`;
}

function renderCurrentScene() {
    let sceneContainer = document.getElementById("sceneContainer");
    let choicesContainer = document.getElementById("choicesContainer");
    if (!sceneContainer || !currentNode) return;

    if (currentNode.isEnding) {
        let endingType = (currentNode.endingType || "neutral").toUpperCase();
        let badgeColor = endingType === "GOOD" ? "var(--color-mint-pop)" : endingType === "BAD" ? "var(--color-ember)" : "var(--color-lavender)";
        let badgeTextColor = endingType === "BAD" ? "#fff" : "#000";

        sceneContainer.innerHTML = `
            <div class="play-card" style="text-align: center; padding: 36px 24px; background: var(--color-paper-white); border: 3px solid #000; border-radius: 24px; box-shadow: 8px 8px 0px #000; width: 100%; box-sizing: border-box;">
                <div style="margin-bottom: 16px;">
                    <span style="display: inline-block; padding: 8px 24px; font-weight: 800; font-size: 13px; border: 2px solid #000; border-radius: 100px; background: ${badgeColor}; color: ${badgeTextColor}; box-shadow: 3px 3px 0px #000;">
                        🏁 ${endingType} ENDING REACHED
                    </span>
                </div>
                <h1 style="font-family: var(--font-display); font-size: clamp(24px, 4vw, 38px); margin-bottom: 18px; word-break: break-word; line-height: 1.1;">${escapeHtml(currentNode.title)}</h1>
                <div style="background: var(--color-sky-wash); border: 2px solid #000; border-radius: 16px; padding: 22px; margin-bottom: 24px; box-shadow: 4px 4px 0px #000; text-align: left;">
                    <p style="font-size: 16px; line-height: 1.7; font-weight: 600; color: #000; margin: 0;">${escapeHtml(currentNode.text)}</p>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="restartPreview()" class="primary-btn" style="padding: 12px 24px; font-size: 14px;">🔄 Play Again</button>
                    <a href="admin.html" class="secondary-btn" style="padding: 12px 24px; font-size: 14px;">← Back to Dashboard</a>
                </div>
            </div>
        `;

        if (choicesContainer) choicesContainer.innerHTML = "";
        renderPathHistory();
        return;
    }

    let locationTag = currentNode.location ? `📍 ${currentNode.location.toUpperCase()}` : `📍 SCENE #${traversalPath.length}`;
    let charsTag = (currentNode.characters && currentNode.characters.length > 0) ? `👥 Present: ${currentNode.characters.join(', ')}` : '';

    let choices = Array.isArray(currentNode.choices) ? currentNode.choices : [];
    let choicesHTML = "";

    if (choices.length > 0) {
        choicesHTML = choices.map(choice => {
            let targetId = choice.targetNodeId || choice.destinationNodeId || choice.targetId;
            let destNode = currentStory.nodes.find(n => n.id === targetId);
            let destTitle = destNode ? destNode.title : `Node ID: ${targetId}`;

            return `
                <button type="button" class="choice-btn" onclick="selectPreviewChoice('${targetId}', '${escapeHtml(choice.text)}')" style="margin-bottom: 10px; width: 100%; padding: 14px 18px; background: #fff; border: 2px solid #000; border-radius: 100px; box-shadow: 3px 3px 0px #000; font-weight: 800; font-size: 14px; text-align: left; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; transition: all 0.15s ease; box-sizing: border-box;">
                    <span style="word-break: break-word;">👉 ${escapeHtml(choice.text)}</span>
                    <span style="font-size: 11px; color: var(--color-voltage-violet); font-weight: 700; white-space: nowrap; flex-shrink: 0;">&rarr; ${escapeHtml(destTitle)}</span>
                </button>
            `;
        }).join('');
    } else {
        choicesHTML = `
            <div style="background: #ffebee; border: 2px solid #000; border-radius: 14px; padding: 14px; font-weight: 800; color: #c62828; margin-bottom: 14px; font-size: 13px;">
                ⚠️ Dead End: This scene has no choices and was not marked as an ending.
            </div>
        `;
    }

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

    if (choicesContainer) choicesContainer.innerHTML = "";
    renderPathHistory();
}

function selectPreviewChoice(targetNodeId, choiceText) {
    let nextNode = currentStory.nodes.find(n => n.id === targetNodeId);
    if (!nextNode) {
        alert("Destination node not found: " + targetNodeId);
        return;
    }

    currentNode = nextNode;
    traversalPath.push({
        nodeId: nextNode.id,
        title: nextNode.title || "Scene",
        choiceText: choiceText
    });

    renderCurrentScene();
}

function previewRetreat() {
    if (traversalPath.length <= 1) return;
    traversalPath.pop();
    let prev = traversalPath[traversalPath.length - 1];
    currentNode = currentStory.nodes.find(n => n.id === prev.nodeId);
    renderCurrentScene();
}

function restartPreview() {
    let startingNode = currentStory.nodes.find(n => n.id === currentStory.startNodeId) || currentStory.nodes[0];
    currentNode = startingNode;
    traversalPath = [
        {
            nodeId: startingNode.id,
            title: startingNode.title || "Initial Scene",
            choiceText: null
        }
    ];
    renderCurrentScene();
}

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

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function handleLogout() {
    localStorage.removeItem("user");
    window.location.href = "../auth/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    renderAdminProfileHeader();
    loadStoryForPreview();
});
renderAdminProfileHeader();
loadStoryForPreview();
