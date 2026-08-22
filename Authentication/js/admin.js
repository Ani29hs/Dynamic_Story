function redirectStory() {
    window.location.href = "add_stories.html";
}

function editStory(storyId) {
    window.location.href = `add_stories.html?id=${storyId}`;
}

async function deleteStory(storyId) {
    if (!confirm("Are you sure you want to delete this story?")) {
        return;
    }

    let response = await fetch(`http://localhost:3000/Stories/${storyId}`, {
        method: "DELETE"
    });

    if (response.ok) {
        // Remove active session for this story from localStorage
        let user = JSON.parse(localStorage.getItem("user"));
        let userId = user ? (user.id || user.name) : "guest";
        localStorage.removeItem(`active_session_${userId}_${storyId}`);

        // Remove currentStory draft if open
        let currentStory = JSON.parse(localStorage.getItem("currentStory"));
        if (currentStory && currentStory.id === storyId) {
            localStorage.removeItem("currentStory");
        }

        alert("Story deleted successfully!");
        loadStories();
    } else {
        alert("Failed to delete story.");
    }
}

function handleLogout() {
    localStorage.removeItem("user");
    window.location.href = "../auth/login.html";
}

function renderAdminProfileHeader() {
    let navAuthContainer = document.getElementById("navAuthContainer");
    let user = JSON.parse(localStorage.getItem("user"));
    if (!navAuthContainer || !user) return;

    let initial = user.name ? user.name.charAt(0).toUpperCase() : "A";
    let activeXp = (user.xp !== undefined) ? user.xp : 100;
    let roleTitle = user.role || "Admin";
    let xpBadgeHtml = (user.role !== "Admin") ? `<span class="user-xp-badge">⭐ ${activeXp} XP</span>` : ``;

    navAuthContainer.innerHTML = `
        <div class="user-profile-menu-container">
            <button type="button" class="profile-menu-btn" onclick="toggleProfileDropdown(event)">
                <span class="user-avatar">${initial}</span>
                <span class="user-name-label">${user.name || 'Admin'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-left: 2px;"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div id="profileDropdown" class="profile-dropdown-menu hidden" onclick="event.stopPropagation()">
                <div class="profile-dropdown-header">
                    <strong>${user.name || 'Admin'}</strong>
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
                    <a href="../reader/stories.html" class="dropdown-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        Reader View
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

document.addEventListener("DOMContentLoaded", renderAdminProfileHeader);
renderAdminProfileHeader();

async function loadStories() {
    let response = await fetch("http://localhost:3000/Stories");
    if (!response.ok) return;

    let stories = await response.json();
    let container = document.getElementById("storiesContainer");

    if (!container) return;

        // 1. If no stories exist, render empty state
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

        // 2. Clear container before looping
        container.innerHTML = "";

        // 3. Loop through stories and append cards
        stories.forEach((element) => {
            let nodeCount = element.nodes ? element.nodes.length : 0;
            let statusClass = element.status === "published" ? "status-published" : "status-draft";
            let statusText = element.status === "published" ? "PUBLISHED" : "DRAFT";

            let coverImg = element.imageURL || element.coverImage
                ? `<img src="${element.imageURL || element.coverImage}" alt="${element.title}" onerror="this.src='https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'">`
                : `<div class="no-image" style="display: flex; align-items: center; justify-content: center; height: 100%; font-weight: 800; color: #666;">No Cover Image</div>`;

            container.innerHTML += `
                <div class="story-card">
                    <div class="story-card-image">
                        ${coverImg}
                    </div>
                    <div class="story-card-content">
                        <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
                            <span class="badge-genre">${(element.genre || "General").toUpperCase()}</span>
                            <span class="badge-status ${statusClass}">${statusText}</span>
                        </div>
                        <h3>${element.title || "Untitled Story"}</h3>
                        <div class="author-tag" style="margin-bottom: 10px;">BY ${(element.author || "ADMIN").toUpperCase()}</div>
                        <p class="story-description">
                            ${element.description || "No description provided."}
                        </p>
                        <div class="stat-lockup-box">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            <span><strong>${nodeCount}</strong> SCENES / NODES</span>
                        </div>
                    </div>
                    <div class="story-actions">
                        <button class="secondary-btn" onclick="editStory('${element.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            Edit Story
                        </button>
                        <button class="danger-btn delete-btn" onclick="deleteStory('${element.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            Delete
                        </button>
                    </div>
                </div>
            `;
        });
}

async function restoreSampleStory() {
    let user = JSON.parse(localStorage.getItem("user"));

    if (!user || user.role !== "Admin") {
        alert("Only Admin can restore sample story");
        return;
    }

    // Create node IDs first
    let villageId = crypto.randomUUID();
    let forestId = crypto.randomUUID();
    let castleId = crypto.randomUUID();
    let treasureId = crypto.randomUUID();
    let returnId = crypto.randomUUID();
    let defeatId = crypto.randomUUID();

    // Create nodes
    let villageNode = {
        id: villageId,
        title: "The Village",
        text: "You stand at the center of a mysterious village. Two paths lie before you.",
        location: "Village",
        characters: ["Traveler"],
        isEnding: false,
        endingType: null,
        choices: [
            { id: crypto.randomUUID(), text: "Enter the Dark Forest", targetNodeId: forestId },
            { id: crypto.randomUUID(), text: "Visit the Castle", targetNodeId: castleId }
        ]
    };

    let forestNode = {
        id: forestId,
        title: "The Dark Forest",
        text: "The trees grow taller around you. You hear something moving in the shadows.",
        location: "Dark Forest",
        characters: ["Traveler", "Guardian"],
        isEnding: false,
        endingType: null,
        choices: [
            { id: crypto.randomUUID(), text: "Follow the mysterious path", targetNodeId: treasureId },
            { id: crypto.randomUUID(), text: "Turn back to the village", targetNodeId: returnId }
        ]
    };

    let castleNode = {
        id: castleId,
        title: "The Ancient Castle",
        text: "You enter the castle and find the mysterious king waiting for you.",
        location: "Ancient Castle",
        characters: ["Traveler", "King"],
        isEnding: false,
        endingType: null,
        choices: [
            { id: crypto.randomUUID(), text: "Challenge the King", targetNodeId: defeatId }
        ]
    };

    let treasureNode = {
        id: treasureId,
        title: "The Hidden Treasure",
        text: "You follow the path and discover a legendary treasure hidden beneath the ancient trees.",
        location: "Hidden Cave",
        characters: ["Traveler"],
        isEnding: true,
        endingType: "good",
        choices: []
    };

    let returnNode = {
        id: returnId,
        title: "Back to the Village",
        text: "You safely return to the village. Perhaps another adventure awaits you.",
        location: "Village",
        characters: ["Traveler"],
        isEnding: true,
        endingType: "neutral",
        choices: []
    };

    let defeatNode = {
        id: defeatId,
        title: "The King's Victory",
        text: "The king defeats you. Your journey ends inside the ancient castle.",
        location: "Ancient Castle",
        characters: ["Traveler", "King"],
        isEnding: true,
        endingType: "bad",
        choices: []
    };

    // Create complete story
    let sampleStory = {
        title: "The Lost Kingdom",
        author: user.name || "Admin",
        genre: "adventure",
        status: "published",
        description: "A branching adventure where your decisions determine the fate of your journey.",
        imageURL: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23",
        nodes: [
            villageNode,
            forestNode,
            castleNode,
            treasureNode,
            returnNode,
            defeatNode
        ],
        startNodeId: villageId
    };

    try {
        let response = await fetch("http://localhost:3000/Stories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sampleStory)
        });

        if (!response.ok) {
            alert("Sample story could not be created");
            return;
        }

        alert("Sample story restored successfully!");
        loadStories();
    } catch (e) {
        console.error("Error restoring sample story:", e);
        alert("Error connecting to server.");
    }
}

// Initial load
document.addEventListener("DOMContentLoaded", loadStories);
loadStories();
