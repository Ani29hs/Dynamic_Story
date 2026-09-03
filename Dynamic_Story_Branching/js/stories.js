
/* ============================================================
   stories.js
   Page:  pages/admin/add_stories.html
   Role:  Story Builder — Admin tool for creating and editing
          branching stories with nodes (scenes) and choices (edges).

   FLOW (Top to Bottom — Page Load Order):
   ──────────────────────────────────────
   SECTION  1  State variables          user, storyId, currentStory
   SECTION  2  initPage()               Page init: load existing story OR start fresh
   SECTION  3  handleStory()            Form handler: save story metadata (POST/PUT)
   SECTION  4  handleNode()             Form handler: add or edit a scene node (PATCH)
   SECTION  5  showNodes()              Render all scene nodes as builder cards
   SECTION  6  setAsStartNode()         Mark a node as the story start point
   SECTION  7  editNode()               Pre-fill node form for editing an existing node
   SECTION  8  openChoiceModal()        Open the Add/Edit Choice modal for a node
   SECTION  9  closeChoiceModal()       Close the Add/Edit Choice modal
   SECTION 10  handleDeleteChoice()     Delete a specific choice from a node (PATCH)
   SECTION 11  editChoice()             Pre-fill choice form for editing an existing choice
   SECTION 12  handleDelete()           Delete an entire node from the story (PATCH)
   SECTION 13  handleChoice()           Form handler: add or edit a choice on a node
   SECTION 14  publishStory()           Set story status = "published" (makes it live)

   KEY DATA STRUCTURES:
   ─────────────────────────────────────────────────────────────
   Story object (stored in db.json under /Stories):
   {
     id, title, author, genre, status, description, imageURL,
     nodes: [ Node, ... ],
     startNodeId: "<node_id>"
   }

   Node object (element of story.nodes[]):
   {
     id, title, text, location,
     characters: [ "Name", ... ],
     isEnding: boolean, endingType: "good" | "neutral" | "bad",
     choices: [ Choice, ... ]
   }

   Choice object (element of node.choices[]):
   {
     id, text, targetNodeId
   }

   DATA FLOW (json-server, port 3000):
   ──────────────────────────────────────
   GET    /Stories/:id    → load existing story in edit mode
   POST   /Stories        → create new story (first metadata save)
   PUT    /Stories/:id    → full story replace (subsequent metadata saves)
   PATCH  /Stories/:id    → update nodes[], startNodeId, or status
   ============================================================ */


/* ============================================================
   SECTION 1 — STATE VARIABLES
   user          — the logged-in admin from localStorage
   urlParams     — parsed URL query string (?id=, ?fromPitch=)
   storyId       — story ID from ?id= (null if creating a new story)
   currentStory  — the story object being edited in this session
                   also mirrored to localStorage as "currentStory"
                   so the page can survive a refresh
   ============================================================ */

let user        = JSON.parse(localStorage.getItem("user"));
const urlParams = new URLSearchParams(window.location.search);
const storyId   = urlParams.get("id");
let currentStory = null;


/* ============================================================
   SECTION 2 — PAGE INIT: initPage()
   Called immediately on page load. Determines which mode to run in:

   EDIT MODE (?id= is present in the URL):
   ─────────────────────────────────────────
   1. Check localStorage for a cached "currentStory" first (fast).
   2. If not cached, GET /Stories/:id from json-server.
   3. Pre-fill the story metadata form (title, author, genre, etc.).
   4. Call showNodes() to render all existing scene nodes.

   CREATE MODE (no ?id= in URL):
   ─────────────────────────────────────────
   1. Clear any leftover "currentStory" from localStorage.
   2. Reset the story form to blank.
   3. Show the "No Scene Nodes" empty state in the node area.

   PITCH PRE-FILL (?fromPitch= is present):
   ─────────────────────────────────────────
   If a reader pitch was approved, the admin arrives here with
   ?fromPitch=<pitchId>. The pitch data is in localStorage
   under "pitchPrefill". Pre-fill the form fields and show a
   success banner, then clear the prefill from localStorage.
   ============================================================ */

async function initPage() {
    let nodeHidden = document.getElementById("nodeHidden");

    // ── EDIT MODE: ?id= in URL ──────────────────────────────────────────────
    if (storyId) {
        // Fetch fresh story from json-server to ensure latest ratings & nodes are loaded
        try {
            let res = await fetch(`${API_BASE}/Stories/${storyId}`);
            if (res.ok) {
                currentStory = await res.json();
                if (!Array.isArray(currentStory.nodes)) {
                    currentStory.nodes = currentStory.nodes
                        ? Object.values(currentStory.nodes)
                        : [];
                }
                localStorage.setItem("currentStory", JSON.stringify(currentStory));
            }
        } catch (e) {
            console.warn("Could not fetch story:", e);
        }

        // Step 3: Pre-fill the metadata form with existing values
        if (currentStory) {
            if (document.getElementById("story"))      document.getElementById("story").value      = currentStory.title       || "";
            if (document.getElementById("author"))     document.getElementById("author").value     = currentStory.author      || "";
            if (document.getElementById("genre"))      document.getElementById("genre").value      = currentStory.genre       || "general";
            if (document.getElementById("storyDescr")) document.getElementById("storyDescr").value = currentStory.description || "";
            if (document.getElementById("image"))      document.getElementById("image").value      = currentStory.imageURL    || "";

            // Step 4: Render the existing scene nodes
            showNodes(currentStory);
        }
        return;
    }

    // ── CREATE MODE: no ?id= in URL ────────────────────────────────────────
    localStorage.removeItem("currentStory");
    currentStory = null;

    if (document.getElementById("storyForm")) {
        document.getElementById("storyForm").reset();
    }

    if (nodeHidden) {
        nodeHidden.innerHTML = `
            <h3>No Scene Nodes Added</h3>
            <p>
                Click "+ Add Scene Node" above
                to add the initial scene for your story.
            </p>
        `;
    }

    // ── PITCH PRE-FILL: ?fromPitch= in URL ────────────────────────────────
    let fromPitch = urlParams.get("fromPitch");
    if (fromPitch) {
        let prefill = null;
        try { prefill = JSON.parse(localStorage.getItem("pitchPrefill")); } catch(e) {}

        if (prefill && prefill.pitchId === fromPitch) {
            // Pre-fill title, description, genre from the approved pitch
            if (document.getElementById("story"))      document.getElementById("story").value      = prefill.title       || "";
            if (document.getElementById("storyDescr")) document.getElementById("storyDescr").value = prefill.description || "";
            if (document.getElementById("genre"))      document.getElementById("genre").value      = prefill.genre       || "fantasy";
            if (document.getElementById("author")) {
                let adminUser = JSON.parse(localStorage.getItem("user"));
                document.getElementById("author").value = adminUser ? adminUser.name : "Admin";
            }
            localStorage.removeItem("pitchPrefill");

            // Show a confirmation banner above the form
            let banner = document.createElement("div");
            banner.style.cssText = "background:#39d39f;border:2.5px solid #000;border-radius:16px;padding:14px 22px;margin-bottom:22px;font-weight:800;font-size:14px;box-shadow:4px 4px 0px #000;display:flex;align-items:center;gap:12px;";
            banner.innerHTML = "✨ <span>Story pre-filled from approved reader pitch! Review the metadata, add your scenes, then publish.</span>";
            let storyForm = document.getElementById("storyForm");
            if (storyForm) storyForm.parentNode.insertBefore(banner, storyForm);
        }
    }
}

initPage();


/* ============================================================
   SECTION 3 — METADATA HANDLER: handleStory(event)
   Triggered by: <form onsubmit="handleStory(event)"> (Story Metadata form)
   Saves the story title, author, genre, description, and imageURL.

   Logic:
   - If a story ID already exists (edit mode) → PUT /Stories/:id (full replace)
   - If no ID yet (create mode) → POST /Stories (creates new story)
   - Status is preserved: "draft" if new, or keeps existing "published" state
   - After save: mirrors the full story object to localStorage + currentStory
   ============================================================ */

let handleStory = async (event) => {
    event.preventDefault();

    let story       = document.getElementById("story");
    let authorEl    = document.getElementById("author");
    let genre       = document.getElementById("genre");
    let description = document.getElementById("storyDescr");
    let imageURL    = document.getElementById("image");
    let user        = JSON.parse(localStorage.getItem("user"));

    let existingId    = currentStory && currentStory.id ? currentStory.id : storyId;
    let currentStatus = (currentStory && currentStory.status === "published") ? "published" : "draft";

    let storyObject = {
        id:          existingId ? existingId : `story_${Date.now()}`,
        title:       story       ? story.value       : "Untitled",
        author:      (authorEl && authorEl.value.trim()) ? authorEl.value.trim() : (user ? user.name : "Admin"),
        genre:       genre       ? genre.value       : "general",
        status:      currentStatus,
        description: description ? description.value : "",
        imageURL:    imageURL    ? imageURL.value    : "",
        nodes:       (currentStory && currentStory.nodes) ? currentStory.nodes : [],
        startNodeId: (currentStory && currentStory.startNodeId) ? currentStory.startNodeId : null,
        ratings: (currentStory && currentStory.ratings) ? currentStory.ratings : []
    };

    // PATCH = update existing metadata without touching ratings | POST = create new
    let isEditing  = Boolean(existingId);
    let url        = isEditing ? `${API_BASE}/Stories/${storyObject.id}` : `${API_BASE}/Stories`;
    let httpMethod = isEditing ? "PATCH" : "POST";

    let payload = isEditing ? {
        title:       storyObject.title,
        author:      storyObject.author,
        genre:       storyObject.genre,
        description: storyObject.description,
        imageURL:    storyObject.imageURL
    } : storyObject;

    let response   = await fetch(url, {
        method:  httpMethod,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload)
    });

    let savedStory = await response.json();

    // Re-fetch fresh story from server to keep latest reader ratings intact
    if (isEditing) {
        try {
            let freshRes = await fetch(`${API_BASE}/Stories/${storyObject.id}`);
            if (freshRes.ok) savedStory = await freshRes.json();
        } catch (e) {}
    }

    currentStory = Object.assign({}, currentStory, savedStory);
    localStorage.setItem("currentStory", JSON.stringify(currentStory));

    alert("💾 Story metadata saved as " + (currentStatus === "published" ? "PUBLISHED!" : "DRAFT (Private)!"));
};



/* ============================================================
   SECTION 4 — NODE HANDLER: handleNode(event)
   Triggered by: <form onsubmit="handleNode(event)"> (Add/Edit Node modal form)
   Adds a new scene node OR updates an existing one.

   Fields read from the form:
   - nodeTitle, nodeText, nodeLocation, nodeCharacters (CSV → array)
   - isEnding (checkbox), endingType (dropdown)
   - editingNodeId (hidden field — empty if adding new)

   EDIT path  (editingNodeId is set):
   - Finds the node in activeStory.nodes by ID
   - Updates all fields EXCEPT choices (choices are never touched here)

   CREATE path (editingNodeId is empty):
   - Builds a new node object with crypto.randomUUID() as ID
   - Pushes it to activeStory.nodes[]
   - If it's the first node ever → sets it as startNodeId automatically

   After both paths:
   - PATCH /Stories/:id with { nodes, startNodeId }
   - Mirrors to localStorage + currentStory
   - Resets the form and re-renders showNodes()
   ============================================================ */

let handleNode = async (event) => {
    event.preventDefault();

    let activeStory = JSON.parse(localStorage.getItem("currentStory")) || currentStory;

    if (!activeStory) {
        alert("Please save Story Metadata first!");
        return;
    }

    // Read all node form fields
    let nodeTitle      = document.getElementById("nodeTitle").value;
    let nodeText       = document.getElementById("nodeText").value;
    let nodeLocation   = document.getElementById("nodeLocation").value;
    let nodeCharacters = document.getElementById("nodeCharacters").value;
    let isEnding       = document.getElementById("isEnding").checked;
    let endingType     = document.getElementById("endingType").value;
    let editingNodeId  = document.getElementById("editingNodeId").value;

    if (editingNodeId) {
        // ── EDIT EXISTING NODE ───────────────────────────────────────────────
        let node = activeStory.nodes.find(node => node.id === editingNodeId);
        if (!node) { alert("Node not found"); return; }

        node.title      = nodeTitle;
        node.text       = nodeText;
        node.location   = nodeLocation;
        node.characters = nodeCharacters
            .split(",")
            .map(c => c.trim())
            .filter(c => c !== "");
        node.isEnding   = isEnding;
        node.endingType = isEnding ? endingType : null;
        // NOTE: node.choices is intentionally NOT touched here — choices are managed separately

    } else {
        // ── CREATE NEW NODE ──────────────────────────────────────────────────
        let node = {
            id:         crypto.randomUUID(),
            title:      nodeTitle,
            text:       nodeText,
            location:   nodeLocation,
            characters: nodeCharacters
                .split(",")
                .map(c => c.trim())
                .filter(c => c !== ""),
            isEnding:   isEnding,
            endingType: isEnding ? endingType : null,
            choices:    []           // Always starts with no choices
        };

        activeStory.nodes.push(node);

        // First node ever → becomes the start node automatically
        if (activeStory.nodes.length === 1) {
            activeStory.startNodeId = node.id;
        }
    }

    // PATCH /Stories/:id with updated nodes array
    let response = await fetch(`${API_BASE}/Stories/${activeStory.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
            nodes:       activeStory.nodes,
            startNodeId: activeStory.startNodeId
        })
    });

    if (!response.ok) { alert("Node could not be saved"); return; }

    // Mirror to localStorage + in-memory state
    localStorage.setItem("currentStory", JSON.stringify(activeStory));
    currentStory = activeStory;

    alert(editingNodeId ? "Node updated successfully" : "Node added successfully");

    // Reset form hidden ID, inputs, and modal title
    if (document.getElementById("nodeForm")) document.getElementById("nodeForm").reset();
    document.getElementById("editingNodeId").value        = "";
    document.getElementById("nodeModalTitle").textContent = "ADD SCENE NODE";

    // Close the node modal
    document.getElementById("nodeModal").classList.add("hidden");

    showNodes(currentStory);
};


/* ============================================================
   SECTION 5 — RENDER NODES: showNodes(currentStory)
   Renders all scene nodes as builder cards inside #nodeHidden.

   Uses standard CSS classes from stories.css:
   - Wrapper card:  node-card (plus is-start or is-ending if applicable)
   - Start badge:   badge-start
   - Ending badge:  badge-ending
   - Text box:      node-text-box
   - Choice card:   choice-item-card
   ============================================================ */

function showNodes(currentStory) {
    let nodeHidden = document.getElementById("nodeHidden");
    if (!nodeHidden) return;

    let nodes = currentStory.nodes || [];

    if (nodes.length > 0) {
        nodeHidden.innerHTML = "";

        nodes.forEach((element, index) => {
            let isStart  = (element.id === currentStory.startNodeId);

            // CSS card classes defined in stories.css
            let cardClass = "node-card";
            if (isStart) cardClass += " is-start";
            if (element.isEnding) cardClass += " is-ending";

            let cardStyle = "";
            let badgeHtml = "";

            if (isStart) {
                badgeHtml = `<span class="badge-start">🚀 START NODE</span>`;
            } else if (element.isEnding) {
                let typeRaw  = (element.endingType || "good").toLowerCase();
                let endType  = typeRaw.toUpperCase();
                let endEmoji = typeRaw === "good" ? "🏆" : typeRaw === "bad" ? "💀" : typeRaw === "tragic" ? "😢" : "⚖️";
                let bgBadge  = typeRaw === "good" ? "#34d399" : typeRaw === "bad" ? "#f87171" : typeRaw === "tragic" ? "#fb923c" : "#fbbf24";
                let accent   = typeRaw === "good" ? "#22c55e" : typeRaw === "bad" ? "#ef4444" : typeRaw === "tragic" ? "#f97316" : "#f59e0b";
                let cardBg   = typeRaw === "good" ? "#f0fff4" : typeRaw === "bad" ? "#fff0f0" : typeRaw === "tragic" ? "#fff7ed" : "#fffbeb";

                badgeHtml = `<span class="badge-ending" style="background: ${bgBadge} !important;">${endEmoji} ${endType} ENDING</span>`;
                cardStyle = `style="border-left: 8px solid ${accent} !important; background: ${cardBg} !important;"`;
            }

            // "Set as Start" button — only shown on regular, non-ending, non-start nodes
            let startBtnHtml = (!isStart && !element.isEnding)
                ? `<button type="button" class="nav-pill" onclick="setAsStartNode('${element.id}')">🚀 Set as Start</button>`
                : "";

            // ── Build choices section ─────────────────────────────────────────
            let choicesHTML = "";
            if (element.choices && element.choices.length > 0) {
                let choiceCards = element.choices.map(choice => {
                    let destNode  = nodes.find(n => n.id === choice.targetNodeId);
                    let destTitle = destNode ? destNode.title : `[Unknown: ${choice.targetNodeId}]`;

                    return `
                        <div class="choice-item-card">
                            <div style="font-weight: 700; font-size: 14px;">
                                👉 <strong>${choice.text}</strong>
                                <span style="font-weight: 500; color: #555; font-size: 13px;"> → ${destTitle}</span>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button type="button" class="nav-pill" onclick="editChoice('${element.id}', '${choice.id}')">✏️ Edit</button>
                                <button type="button" class="danger-btn" onclick="handleDeleteChoice('${element.id}', '${choice.id}')">🗑️ Delete</button>
                            </div>
                        </div>
                    `;
                }).join("");

                choicesHTML = `
                    <div style="margin-top: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <h4 style="color: var(--color-voltage-violet); font-weight: 800; font-size: 15px; text-transform: uppercase;">CHOICES / OUTGOING EDGES (${element.choices.length})</h4>
                            ${!element.isEnding
                                ? `<button type="button" class="nav-pill" onclick="openChoiceModal('${element.id}')">+ Add Choice</button>`
                                : `<span style="color: var(--color-voltage-violet); font-size: 12px; font-weight: 700;">Ending nodes need no outgoing choices</span>`}
                        </div>
                        <div>${choiceCards}</div>
                    </div>
                `;
            } else {
                choicesHTML = `
                    <div style="margin-top: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <h4 style="color: var(--color-voltage-violet); font-weight: 800; font-size: 15px; text-transform: uppercase;">CHOICES / OUTGOING EDGES (0)</h4>
                            ${!element.isEnding
                                ? `<button type="button" class="nav-pill" onclick="openChoiceModal('${element.id}')">+ Add Choice</button>`
                                : `<span style="color: var(--color-voltage-violet); font-size: 12px; font-weight: 700;">Ending nodes need no outgoing choices</span>`}
                        </div>
                        <p style="font-style: italic; color: #666; margin-top: 10px; font-size: 14px;">No choices added yet.</p>
                    </div>
                `;
            }

            // ── Build and append the full node card ───────────────────────────
            nodeHidden.innerHTML += `
                <div class="${cardClass}" ${cardStyle}>
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1; min-width: 260px;">
                            <h3 style="font-size: 20px; font-weight: 800; margin: 0; line-height: 1.25;">#${index + 1}. ${element.title}</h3>
                            ${badgeHtml}
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-left: auto;">
                            ${startBtnHtml}
                            <button type="button" class="nav-pill" onclick="editNode('${element.id}')">✏️ Edit Node</button>
                            <button type="button" class="danger-btn" onclick="handleDelete(${index})">🗑️ Delete Node</button>
                        </div>
                    </div>

                    <div class="node-text-box">
                        <p style="font-size: 15px; line-height: 1.6; color: var(--color-carbon); margin-bottom: 8px;">${element.text}</p>
                        <div style="color: var(--color-voltage-violet); font-weight: 700; font-size: 13px;">
                            📍 Location: ${element.location || "Not specified"}
                        </div>
                    </div>

                    <hr style="border: 0; border-top: 2px solid var(--color-carbon); margin: 20px 0;">

                    ${choicesHTML}
                </div>
            `;
        });

    } else {
        // Empty state — no nodes added yet
        nodeHidden.innerHTML = `
            <div style="border: 3px dashed var(--color-carbon); border-radius: var(--radius-card-lg); padding: 48px 24px; text-align: center; background: #ffffff; box-shadow: var(--shadow-cut); margin-top: 24px;">
                <h2 style="font-family: var(--font-display); font-size: 32px; text-transform: uppercase; margin-bottom: 12px; color: var(--color-carbon);">NO SCENE NODES ADDED</h2>
                <p style="font-weight: 700; color: var(--color-carbon); font-size: 15px;">Click "+ Add Scene Node" above to add the initial scene for your story.</p>
            </div>
        `;
    }
}


/* ============================================================
   SECTION 6 — SET START NODE: setAsStartNode(nodeId)
   Marks a given node as the story's start node.
   Updates: currentStory.startNodeId, localStorage, and backend.
   Calls showNodes() to re-render and visually update the START badge.
   ============================================================ */

async function setAsStartNode(nodeId) {
    if (!currentStory) return;
    currentStory.startNodeId = nodeId;
    localStorage.setItem("currentStory", JSON.stringify(currentStory));

    try {
        await fetch(`${API_BASE}/Stories/${currentStory.id}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ startNodeId: nodeId })
        });
    } catch (e) {
        console.warn("Could not patch start node:", e);
    }

    showNodes(currentStory);
}


/* ============================================================
   SECTION 7 — EDIT NODE: editNode(nodeId)
   Opens the node modal pre-filled with an existing node's data.
   Sets the hidden #editingNodeId field so handleNode() knows
   to update rather than create.
   Also updates the modal title to "EDIT SCENE NODE".
   ============================================================ */

function editNode(nodeId) {
    let activeStory = JSON.parse(localStorage.getItem("currentStory")) || currentStory;
    if (!activeStory) { alert("No story selected"); return; }

    let node = activeStory.nodes.find(node => node.id === nodeId);
    if (!node) { alert("Node not found"); return; }

    // Store the node ID in the hidden field for handleNode() to detect edit mode
    document.getElementById("editingNodeId").value = nodeId;

    // Pre-fill all form fields with the node's current values
    document.getElementById("nodeTitle").value      = node.title      || "";
    document.getElementById("nodeText").value       = node.text       || "";
    document.getElementById("nodeLocation").value   = node.location   || "";
    document.getElementById("nodeCharacters").value = node.characters ? node.characters.join(", ") : "";
    document.getElementById("isEnding").checked     = node.isEnding   || false;
    document.getElementById("endingType").value     = node.endingType || "good";

    // Show/hide the ending type dropdown based on checkbox state
    toggleEndingGroup(document.getElementById("isEnding"));

    // Update modal title to indicate edit mode
    document.getElementById("nodeModalTitle").textContent = "EDIT SCENE NODE";

    // Open the node modal
    document.getElementById("nodeModal").classList.remove("hidden");
}


/* ============================================================
   SECTION 8 — OPEN CHOICE MODAL: openChoiceModal(sourceNodeId)
   Opens the Add/Edit Choice modal for a specific source node.
   Stores the sourceNodeId in the hidden #sourceNodeId field.
   Populates the #targetNodeId dropdown with ALL other nodes
   (the source node itself is excluded — a node can't link to itself).
   Clears the choice text and editing ID (so handleChoice() adds new).
   ============================================================ */

let openChoiceModal = (sourceNodeId) => {
    let activeStory = JSON.parse(localStorage.getItem("currentStory"));
    if (!activeStory) { alert("Create a story first!"); return; }

    // Store source node ID for handleChoice()
    document.getElementById("sourceNodeId").value = sourceNodeId;

    // Populate the target dropdown with all nodes except the source
    let targetDropDown = document.getElementById("targetNodeId");
    targetDropDown.innerHTML = "";

    activeStory.nodes.forEach(node => {
        if (node.id !== sourceNodeId) {
            targetDropDown.innerHTML += `
                <option value="${node.id}">
                    ${node.title}
                </option>
            `;
        }
    });

    // Clear the choice text input and any editing ID from previous use
    document.getElementById("choiceText").value    = "";
    document.getElementById("editingChoiceId").value = "";

    // Open the choice modal
    document.getElementById("choiceModal").classList.remove("hidden");
};


/* ============================================================
   SECTION 9 — CLOSE CHOICE MODAL: closeChoiceModal()
   Hides the choice modal by adding the "hidden" CSS class.
   ============================================================ */

function closeChoiceModal() {
    document.getElementById("choiceModal").classList.add("hidden");
}


/* ============================================================
   SECTION 10 — DELETE CHOICE: handleDeleteChoice(sourceNodeId, choiceId)
   Removes a specific choice from a node's choices[] array.
   Steps:
   1. Find the source node by sourceNodeId.
   2. Filter out the choice by choiceId.
   3. PATCH /Stories/:id with the updated nodes[].
   4. Mirror to localStorage + currentStory.
   5. Alert success and re-render showNodes().
   ============================================================ */

let handleDeleteChoice = async (sourceNodeId, choiceId) => {
    let activeStory = JSON.parse(localStorage.getItem("currentStory")) || currentStory;
    if (!activeStory) { alert("No story selected"); return; }

    let sourceNode = activeStory.nodes.find(node => node.id === sourceNodeId);
    if (!sourceNode) { alert("Source node not found"); return; }

    // Remove the choice from the array
    sourceNode.choices = sourceNode.choices.filter(choice => choice.id !== choiceId);

    // Persist to backend
    let response = await fetch(`${API_BASE}/Stories/${activeStory.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ nodes: activeStory.nodes })
    });

    if (!response.ok) { alert("Choice could not be deleted"); return; }

    localStorage.setItem("currentStory", JSON.stringify(activeStory));
    currentStory = activeStory;

    alert("Choice deleted");
    showNodes(currentStory);
};


/* ============================================================
   SECTION 11 — EDIT CHOICE: editChoice(sourceNodeId, choiceId)
   Opens the choice modal pre-filled with an existing choice's data.
   Sets #editingChoiceId so handleChoice() updates instead of creating.
   Steps:
   1. Find the source node and then the specific choice.
   2. Store both IDs in their hidden form fields.
   3. Fill the choice text input with the existing text.
   4. Populate and select the correct target in the dropdown.
   5. Open the choice modal.
   ============================================================ */

function editChoice(sourceNodeId, choiceId) {
    let activeStory = JSON.parse(localStorage.getItem("currentStory")) || currentStory;
    if (!activeStory) { alert("No story selected"); return; }

    let sourceNode = activeStory.nodes.find(node => node.id === sourceNodeId);
    if (!sourceNode) { alert("Source node not found"); return; }

    let choice = sourceNode.choices.find(choice => choice.id === choiceId);
    if (!choice) { alert("Choice not found"); return; }

    // Store both IDs in hidden fields
    document.getElementById("sourceNodeId").value    = sourceNodeId;
    document.getElementById("editingChoiceId").value = choiceId;

    // Pre-fill the choice text
    document.getElementById("choiceText").value = choice.text;

    // Rebuild the target dropdown and pre-select the existing target
    let targetDropdown = document.getElementById("targetNodeId");
    targetDropdown.innerHTML = "";

    activeStory.nodes.forEach(node => {
        if (node.id !== sourceNodeId) {
            targetDropdown.innerHTML += `
                <option value="${node.id}">
                    ${node.title}
                </option>
            `;
        }
    });

    targetDropdown.value = choice.targetNodeId;

    // Open the choice modal
    document.getElementById("choiceModal").classList.remove("hidden");
}


/* ============================================================
   SECTION 12 — DELETE NODE: handleDelete(index)
   Removes a node from the story by its array index.
   Steps:
   1. Splice the node out of activeStory.nodes[].
   2. If the story has no nodes left → set startNodeId = null.
   3. Otherwise → reset startNodeId to nodes[0].id (first remaining).
   4. PATCH /Stories/:id with updated nodes[] and startNodeId.
   5. Mirror to localStorage + currentStory.
   6. Alert and re-render.
   ============================================================ */

let handleDelete = async (index) => {
    let activeStory = JSON.parse(localStorage.getItem("currentStory")) || currentStory;

    // Remove node at this index
    activeStory.nodes.splice(index, 1);

    // Recalculate start node
    if (activeStory.nodes.length === 0) {
        activeStory.startNodeId = null;
    } else {
        activeStory.startNodeId = activeStory.nodes[0].id;
    }

    await fetch(`${API_BASE}/Stories/${activeStory.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
            nodes:       activeStory.nodes,
            startNodeId: activeStory.startNodeId
        })
    });

    localStorage.setItem("currentStory", JSON.stringify(activeStory));
    currentStory = activeStory;

    alert("Node deleted");
    showNodes(currentStory);
};


/* ============================================================
   SECTION 13 — CHOICE HANDLER: handleChoice(event)
   Triggered by: <form onsubmit="handleChoice(event)"> (Choice modal form)
   Adds a new choice OR updates an existing one on a source node.

   Fields read from the form:
   - sourceNodeId   (hidden — which node this choice belongs to)
   - editingChoiceId (hidden — empty if adding new, set if editing)
   - choiceText     (the label the reader will see)
   - targetNodeId   (dropdown — which node this choice leads to)

   EDIT path  (editingChoiceId is set):
   - Finds the choice in sourceNode.choices by ID
   - Updates text and targetNodeId

   CREATE path (editingChoiceId is empty):
   - Builds a new choice with crypto.randomUUID()
   - Pushes to sourceNode.choices[]

   After both paths:
   - PATCH /Stories/:id with updated nodes[]
   - Mirrors to localStorage + currentStory
   - Resets form, clears editingChoiceId, closes modal, re-renders
   ============================================================ */

let handleChoice = async (event) => {
    event.preventDefault();

    let activeStory = JSON.parse(localStorage.getItem("currentStory")) || currentStory;
    if (!activeStory) { alert("No story selected"); return; }

    let sourceNodeId    = document.getElementById("sourceNodeId").value;
    let editingChoiceId = document.getElementById("editingChoiceId").value;
    let choiceText      = document.getElementById("choiceText").value.trim();
    let targetNodeId    = document.getElementById("targetNodeId").value;

    if (!choiceText) {
        alert("Choice text cannot be empty. Please enter a choice.");
        return;
    }

    let sourceNode = activeStory.nodes.find(node => node.id === sourceNodeId);
    if (!sourceNode) { alert("Source node not found"); return; }

    if (editingChoiceId) {
        // ── EDIT EXISTING CHOICE ──────────────────────────────────────────────
        let choice = sourceNode.choices.find(choice => choice.id === editingChoiceId);
        if (!choice) { alert("Choice not found"); return; }
        choice.text         = choiceText;
        choice.targetNodeId = targetNodeId;
    } else {
        // ── ADD NEW CHOICE ────────────────────────────────────────────────────
        let choice = {
            id:           crypto.randomUUID(),
            text:         choiceText,
            targetNodeId: targetNodeId
        };
        sourceNode.choices.push(choice);
    }

    // Persist to backend
    let response = await fetch(`${API_BASE}/Stories/${activeStory.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ nodes: activeStory.nodes })
    });

    if (!response.ok) { alert("Choice could not be saved"); return; }

    localStorage.setItem("currentStory", JSON.stringify(activeStory));
    currentStory = activeStory;

    alert(editingChoiceId ? "Choice updated successfully" : "Choice added successfully");

    // Reset choice form fields
    document.getElementById("choiceForm").reset();
    document.getElementById("editingChoiceId").value = "";

    closeChoiceModal();
    showNodes(currentStory);
};


/* ============================================================
   SECTION 14 — PUBLISH STORY: publishStory()
   Makes the current story publicly visible to readers.

   Guards:
   - Story must have a title AND an existing ID (metadata must be saved first).
   - Story must have at least 1 scene node.

   If guards pass:
   - PATCH /Stories/:id with { status: "published" }
   - Mirrors the updated story to localStorage + currentStory
   - Alerts success

   This is a one-way operation from the UI — to unpublish,
   the admin must edit the story and save it as Draft.
   ============================================================ */

async function publishStory() {
    let existingId  = (currentStory && currentStory.id) ? currentStory.id : storyId;
    let storyInput  = document.getElementById("story");
    let titleVal    = storyInput ? storyInput.value.trim() : "";

    // Guard: must have metadata saved
    if (!existingId && !titleVal) {
        alert("⚠️ Cannot Publish! Please fill out and save Story Metadata first.");
        return;
    }

    // Guard: must have at least 1 node
    let currentNodes = (currentStory && currentStory.nodes)
        ? (Array.isArray(currentStory.nodes) ? currentStory.nodes : Object.keys(currentStory.nodes))
        : [];
    if (currentNodes.length === 0) {
        alert("⚠️ Cannot Publish Story! You must add at least 1 Scene Node before publishing.");
        return;
    }

    try {
        let response = await fetch(`${API_BASE}/Stories/${existingId || currentStory.id}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: "published" })
        });

        if (response.ok) {
            let updated  = await response.json();
            currentStory = Object.assign({}, currentStory, updated, { status: "published" });
            localStorage.setItem("currentStory", JSON.stringify(currentStory));
            alert("🎉 Story Published Successfully! It is now live in the Story Library.");
        } else {
            alert("Could not publish story. Please try again.");
        }
    } catch (e) {
        alert("Error connecting to server to publish story.");
    }
}
