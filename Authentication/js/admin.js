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
                    <a href="preview.html" class="dropdown-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
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

document.addEventListener("DOMContentLoaded", renderAdminProfileHeader);
renderAdminProfileHeader();

async function loadStories() {
    let response = await fetch("http://localhost:3000/Stories");
    if (!response.ok) return;

    let stories = await response.json();
    currentAdminStories = stories;
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
            let statusText = element.status === "published" ? "🌐 PUBLISHED" : "🔒 DRAFT (PRIVATE)";

            let coverImg = element.imageURL || element.coverImage
                ? `<img src="${element.imageURL || element.coverImage}" alt="${element.title}" onerror="this.src='https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'">`
                : `<div class="no-image" style="display: flex; align-items: center; justify-content: center; height: 100%; font-weight: 800; color: #666;">No Cover Image</div>`;

            let rawDesc = element.description || "No description provided.";
            let isLong = rawDesc.length > 110;
            let truncatedDesc = isLong ? rawDesc.substring(0, 110) + "..." : rawDesc;
            let readMoreBtnHtml = isLong ? ` <button type="button" class="view-more-btn" onclick="openDescriptionModal('${element.id}')">Read More &rarr;</button>` : ``;

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
                        <p class="story-description">${truncatedDesc}${readMoreBtnHtml}</p>
                        <div class="stat-lockup-box">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            <span><strong>${nodeCount}</strong> SCENES / NODES</span>
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


/* =====================================================
   DESCRIPTION MODAL POPUP FOR ADMIN
===================================================== */
let currentAdminStories = [];

function openDescriptionModal(storyId) {
    let story = currentAdminStories.find(s => String(s.id) === String(storyId));
    if (!story) return;

    let modal = document.getElementById("descriptionModal");
    if (!modal) return;

    let sceneCount = story.nodes ? (Array.isArray(story.nodes) ? story.nodes.length : Object.keys(story.nodes).length) : 0;

    let modalTitle = document.getElementById("modalTitle");
    let modalAuthor = document.getElementById("modalAuthor");
    let modalGenre = document.getElementById("modalGenre");
    let modalStatus = document.getElementById("modalStatus");
    let modalDescription = document.getElementById("modalDescription");
    let modalCover = document.getElementById("modalCover");
    let modalSceneCount = document.getElementById("modalSceneCount");
    let modalEditBtn = document.getElementById("modalEditBtn");

    if (modalTitle) modalTitle.textContent = story.title || "Untitled";
    if (modalAuthor) modalAuthor.textContent = "BY " + (story.author || "ADMIN").toUpperCase();
    if (modalGenre) modalGenre.textContent = (story.genre || "GENERAL").toUpperCase();
    if (modalStatus) {
        modalStatus.textContent = (story.status || "DRAFT").toUpperCase();
        modalStatus.className = "badge-status " + (story.status === "published" ? "status-published" : "status-draft");
    }
    if (modalDescription) {
        modalDescription.textContent = story.description || "No description provided.";
        modalDescription.style.display = "block";
    }
    if (modalCover) modalCover.src = story.imageURL || story.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';
    if (modalSceneCount) modalSceneCount.textContent = sceneCount;

    if (modalEditBtn) modalEditBtn.onclick = () => { closeDescriptionModal(); editStory(story.id); };

    modal.style.display = "flex";
}





/* =====================================================
   ADMIN TABS: Stories vs Reader Pitches
===================================================== */

function switchTab(tab) {
    let storiesSection = document.getElementById("storiesContainer");
    let pitchesSection = document.getElementById("pitchesContainer");
    let tabStories = document.getElementById("tabStories");
    let tabPitches = document.getElementById("tabPitches");

    if (tab === "stories") {
        storiesSection.style.display = "";
        pitchesSection.style.display = "none";
        tabStories.style.background = "#000";
        tabStories.style.color = "#fff";
        tabPitches.style.background = "#fff";
        tabPitches.style.color = "#000";
    } else {
        storiesSection.style.display = "none";
        pitchesSection.style.display = "flex";
        tabStories.style.background = "#fff";
        tabStories.style.color = "#000";
        tabPitches.style.background = "#000";
        tabPitches.style.color = "#fff";
        loadReaderPitches();
    }
}

async function loadReaderPitches() {
    let container = document.getElementById("pitchesContainer");
    if (!container) return;
    container.innerHTML = '<p style="font-weight: 700; color: #888; padding: 16px;">Loading pitches...</p>';

    try {
        let res = await fetch("http://localhost:3000/ReaderStories");
        let rawPitches = res.ok ? await res.json() : [];
        let pitches = rawPitches.filter(p => !p.adminHidden);

        if (pitches.length === 0) {
            container.innerHTML = '<div style="border: 3px dashed #000; border-radius: 24px; padding: 48px; text-align: center; background: #fff; box-shadow: 6px 6px 0px #000;"><h2 style="font-family: var(--font-display);">NO PITCHES YET</h2><p style="font-weight: 700; color: #555;">No pending or active story pitches in your queue.</p></div>';
            return;
        }

        container.innerHTML = pitches.map(p => {
            let isPending = !p.status || p.status === "pending";
            let isDecided = p.status === "approved" || p.status === "rejected";
            let statusColor = p.status === "approved" ? "#39d39f" : p.status === "rejected" ? "#ff6b6b" : "#ffde59";
            let statusText = (p.status || "pending").toUpperCase();
            let dateStr = p.submittedAt ? new Date(p.submittedAt).toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"}) : "";
            let existingComment = p.adminComment || "";

            let actionsHtml = "";
            if (isPending) {
                actionsHtml = `
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 14px;">
                        <button onclick="updatePitchStatus('${p.id}', 'approved')" style="padding: 9px 20px; border: 2px solid #000; border-radius: 100px; background: #39d39f; font-weight: 800; font-size: 13px; cursor: pointer; box-shadow: 3px 3px 0px #000; font-family: var(--font-ui);">✅ Approve Pitch (+30 XP to Reader)</button>
                        <button onclick="updatePitchStatus('${p.id}', 'rejected')" style="padding: 9px 20px; border: 2px solid #000; border-radius: 100px; background: #ff6b6b; color: #fff; font-weight: 800; font-size: 13px; cursor: pointer; box-shadow: 3px 3px 0px #000; font-family: var(--font-ui);">✕ Reject</button>
                        <button onclick="deletePitch('${p.id}')" style="padding: 9px 18px; border: 2px solid #000; border-radius: 100px; background: #fff; font-weight: 800; font-size: 13px; cursor: pointer; box-shadow: 3px 3px 0px #000; font-family: var(--font-ui); color: #555;">🗑 Remove</button>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <div style="margin-top: 16px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 14px; padding: 16px;">
                        <label style="font-weight: 800; font-size: 12px; color: #475569; display: block; margin-bottom: 6px;">📝 ADMIN COMMENT FOR READER</label>
                        <textarea id="comment_${p.id}" placeholder="Leave feedback or comment for reader (e.g. Loved the idea!)..." rows="2" style="width: 100%; padding: 10px 14px; border: 2px solid #000; border-radius: 10px; font-family: var(--font-ui); font-size: 13px; font-weight: 600; resize: none; outline: none; box-sizing: border-box; background: #fff;">${existingComment}</textarea>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button onclick="saveAdminComment('${p.id}')" style="padding: 8px 18px; border: 2px solid #000; border-radius: 100px; background: #ffde59; font-weight: 800; font-size: 12px; cursor: pointer; box-shadow: 2px 2px 0px #000; font-family: var(--font-ui);">💾 Save Comment</button>
                            <button onclick="deletePitch('${p.id}')" style="padding: 8px 18px; border: 2px solid #000; border-radius: 100px; background: #fff; font-weight: 800; font-size: 12px; cursor: pointer; box-shadow: 2px 2px 0px #000; font-family: var(--font-ui); color: #555;">🗑 Remove</button>
                        </div>
                    </div>
                `;
            }

            return `
                <div style="background: #fff; border: 3px solid #000; border-radius: 20px; padding: 24px 28px; box-shadow: 6px 6px 0px #000; display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                            <span style="background: #e0e7ff; border: 1.5px solid #000; border-radius: 100px; padding: 4px 14px; font-size: 12px; font-weight: 800; color: #1e1b4b;">${(p.genre || "general").toUpperCase()}</span>
                            <span style="background: ${statusColor}; border: 1.5px solid #000; border-radius: 100px; padding: 4px 14px; font-size: 12px; font-weight: 800;">${statusText}</span>
                        </div>
                        <div style="font-size: 13px; font-weight: 800; color: #64748b;">
                            By <strong style="color: #0f172a;">${p.submittedBy || "Reader"}</strong> ${dateStr ? '• ' + dateStr : ''}
                        </div>
                    </div>
                    <div>
                        <h3 style="font-family: var(--font-display); font-size: 22px; margin: 4px 0 8px; color: #000;">${p.title}</h3>
                        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; font-size: 14px; color: #334155; font-weight: 500; line-height: 1.6;">
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

async function updatePitchStatus(pitchId, status) {
    let res = await fetch(`http://localhost:3000/ReaderStories/${pitchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status })
    });

    if (!res.ok) {
        alert("Failed to update pitch status.");
        return;
    }

    // If approved, award +30 XP to the reader and queue a login toast
    if (status === "approved") {
        try {
            let pitchData = await res.json();
            let submitterId = pitchData.submittedById;

            if (submitterId) {
                // Fetch current user XP
                let userRes = await fetch(`http://localhost:3000/Users/${submitterId}`);
                if (userRes.ok) {
                    let userData = await userRes.json();
                    let newXp = (userData.xp || 100) + 30;

                    // Patch user: +30 XP + pendingToast flag
                    await fetch(`http://localhost:3000/Users/${submitterId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            xp: newXp,
                            pendingToast: {
                                message: "🎉 Your story pitch was ACCEPTED by the admin! +30 XP earned!",
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

    loadReaderPitches();
}

async function saveAdminComment(pitchId) {
    let textarea = document.getElementById("comment_" + pitchId);
    if (!textarea) return;
    let comment = textarea.value.trim();

    let res = await fetch(`http://localhost:3000/ReaderStories/${pitchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminComment: comment })
    });
    if (res.ok) {
        loadReaderPitches();
    } else {
        alert("Failed to save comment.");
    }
}

async function deletePitch(pitchId) {
    if (!confirm("Remove this pitch from your admin queue? (The reader will still see it marked as REJECTED).")) return;

    let res = await fetch(`http://localhost:3000/ReaderStories/${pitchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            status: "rejected",
            adminComment: "Pitch rejected by admin.",
            adminHidden: true
        })
    });

    if (res.ok) {
        loadReaderPitches();
    } else {
        alert("Failed to remove pitch.");
    }


}

/* =====================================================
   MODAL & NAVIGATION UTILITIES
===================================================== */

window.openDescriptionModal = function(storyId) {
    let story = currentAdminStories.find(s => String(s.id) === String(storyId));
    if (!story) return;

    let modal = document.getElementById("descriptionModal");
    if (!modal) return;

    let sceneCount = story.nodes ? (Array.isArray(story.nodes) ? story.nodes.length : Object.keys(story.nodes).length) : 0;

    let modalTitle = document.getElementById("modalTitle");
    let modalAuthor = document.getElementById("modalAuthor");
    let modalGenre = document.getElementById("modalGenre");
    let modalStatus = document.getElementById("modalStatus");
    let modalDescription = document.getElementById("modalDescription");
    let modalCover = document.getElementById("modalCover");
    let modalSceneCount = document.getElementById("modalSceneCount");
    let modalEditBtn = document.getElementById("modalEditBtn");

    if (modalTitle) modalTitle.textContent = story.title || "Untitled";
    if (modalAuthor) modalAuthor.textContent = "BY " + (story.author || "ADMIN").toUpperCase();
    if (modalGenre) modalGenre.textContent = (story.genre || "GENERAL").toUpperCase();
    if (modalStatus) {
        modalStatus.textContent = (story.status || "DRAFT").toUpperCase();
        modalStatus.className = "badge-status " + (story.status === "published" ? "status-published" : "status-draft");
    }
    if (modalDescription) modalDescription.textContent = story.description || "No description provided.";
    if (modalCover) modalCover.src = story.imageURL || story.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';
    if (modalSceneCount) modalSceneCount.textContent = sceneCount;

    if (modalEditBtn) {
        modalEditBtn.onclick = function() {
            window.closeDescriptionModal();
            editStory(story.id);
        };
    }

    modal.style.display = "flex";
};

window.closeDescriptionModal = function() {
    let modal = document.getElementById("descriptionModal");
    if (modal) {
        modal.style.display = "none";
    }
};

window.previewStory = function(storyId) {
    window.location.href = "preview.html?id=" + storyId;
};