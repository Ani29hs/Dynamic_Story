let user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "../auth/login.html";
} else if (user.role !== "Admin") {
    window.location.href = "../reader/stories.html";
}

// 1. Read ?id= from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get("id");

let currentStory = null;

// Initialize page data on load
async function initPage() {
    let nodeHidden = document.getElementById("nodeHidden");

    if (storyId) {
        // --- EDIT MODE (URL has ?id=...): Load existing story from backend ---
        try {
            let res = await fetch(`http://localhost:3000/Stories/${storyId}`);
            if (res.ok) {
                currentStory = await res.json();
                localStorage.setItem("currentStory", JSON.stringify(currentStory));

                // Populate metadata form
                if (document.getElementById("story")) document.getElementById("story").value = currentStory.title || "";
                if (document.getElementById("author")) document.getElementById("author").value = currentStory.author || "";
                if (document.getElementById("genre")) document.getElementById("genre").value = currentStory.genre || "";
                if (document.getElementById("status")) document.getElementById("status").value = currentStory.status || "draft";
                if (document.getElementById("storyDescr")) document.getElementById("storyDescr").value = currentStory.description || "";
                if (document.getElementById("image")) document.getElementById("image").value = currentStory.imageURL || currentStory.coverImage || "";

                showNodes(currentStory);
                return;
            }
        } catch (err) {
            console.error("Error loading story:", err);
        }
    }

    // --- CREATE NEW STORY MODE (No ?id= in URL): Start clean ---
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
}

initPage();

// 2. Handle Story Metadata Submit
let handleStory = async (event) => {
    event.preventDefault();

    let story = document.getElementById("story");
    let authorEl = document.getElementById("author");
    let genre = document.getElementById("genre");
    let description = document.getElementById("storyDescr");
    let imageURL = document.getElementById("image");
    let user = JSON.parse(localStorage.getItem("user"));

    let existingId = currentStory && currentStory.id ? currentStory.id : storyId;

    // Saving metadata defaults to draft (private)
    let currentStatus = (currentStory && currentStory.status === "published") ? "published" : "draft";

    let storyObject = {
        id: existingId ? existingId : `story_${Date.now()}`,
        title: story ? story.value : "Untitled",
        author: (authorEl && authorEl.value.trim()) ? authorEl.value.trim() : (user ? user.name : "Admin"),
        genre: genre ? genre.value : "general",
        status: currentStatus,
        description: description ? description.value : "",
        imageURL: imageURL ? imageURL.value : "",
        nodes: (currentStory && currentStory.nodes) ? currentStory.nodes : [],
        startNodeId: (currentStory && currentStory.startNodeId) ? currentStory.startNodeId : null
    };

    let isEditing = Boolean(existingId);
    let url = isEditing ? `http://localhost:3000/Stories/${storyObject.id}` : "http://localhost:3000/Stories";
    let httpMethod = isEditing ? "PUT" : "POST";

    let response = await fetch(url, {
        method: httpMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storyObject)
    });

    let savedStory = await response.json();
    currentStory = savedStory;
    localStorage.setItem("currentStory", JSON.stringify(savedStory));

    alert("💾 Story metadata saved as " + (currentStatus === "published" ? "PUBLISHED!" : "DRAFT (Private)!"));
};

// 3. Handle Node Submit
let handleNode = async (event) => {

    event.preventDefault();

    let activeStory =
        JSON.parse(localStorage.getItem("currentStory")) || currentStory;

    if (!activeStory) {
        alert("Please save Story Metadata first!");
        return;
    }


    // Get form values
    let nodeTitle =
        document.getElementById("nodeTitle").value;

    let nodeText =
        document.getElementById("nodeText").value;

    let nodeLocation =
        document.getElementById("nodeLocation").value;

    let nodeCharacters =
        document.getElementById("nodeCharacters").value;

    let isEnding =
        document.getElementById("isEnding").checked;

    let endingType =
        document.getElementById("endingType").value;


    // Check whether we are editing
    let editingNodeId =
        document.getElementById("editingNodeId").value;


    // =====================================================
    // EDIT EXISTING NODE
    // =====================================================

    if (editingNodeId) {

        let node = activeStory.nodes.find(
            node => node.id === editingNodeId
        );


        if (!node) {
            alert("Node not found");
            return;
        }


        // Update node properties
        node.title =
            nodeTitle;

        node.text =
            nodeText;

        node.location =
            nodeLocation;

        node.characters =
            nodeCharacters
                .split(",")
                .map(character => character.trim())
                .filter(character => character !== "");

        node.isEnding =
            isEnding;

        node.endingType =
            isEnding ? endingType : null;


        // IMPORTANT:
        // We do NOT touch node.choices
        // Existing choices remain safe.


    }

    // =====================================================
    // CREATE NEW NODE
    // =====================================================

    else {

        let node = {

            id: crypto.randomUUID(),

            title: nodeTitle,

            text: nodeText,

            location: nodeLocation,

            characters:
                nodeCharacters
                    .split(",")
                    .map(character => character.trim())
                    .filter(character => character !== ""),

            isEnding:
                isEnding,

            endingType:
                isEnding ? endingType : null,

            choices: []

        };


        // Add new node
        activeStory.nodes.push(node);


        // First node becomes starting node
        if (activeStory.nodes.length === 1) {

            activeStory.startNodeId =
                node.id;

        }

    }


    // =====================================================
    // UPDATE JSON SERVER
    // =====================================================

    let response = await fetch(
        `http://localhost:3000/Stories/${activeStory.id}`,
        {
            method: "PATCH",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                nodes: activeStory.nodes,

                startNodeId:
                    activeStory.startNodeId

            })
        }
    );


    if (!response.ok) {

        alert("Node could not be saved");

        return;
    }


    // =====================================================
    // UPDATE LOCAL STORAGE
    // =====================================================

    localStorage.setItem(
        "currentStory",
        JSON.stringify(activeStory)
    );

    currentStory =
        activeStory;


    // =====================================================
    // RESET
    // =====================================================

    alert(
        editingNodeId
            ? "Node updated successfully"
            : "Node added successfully"
    );


    document
        .getElementById("nodeForm")
        .reset();


    // Clear edit mode
    document
        .getElementById("editingNodeId")
        .value = "";


    // Reset modal title
    document
        .getElementById("nodeModalTitle")
        .textContent = "ADD SCENE NODE";


    closeNodeModal();


    // Render updated nodes
    showNodes(currentStory);

};

// 4. Render Nodes List
function showNodes(currentStory) {

    let nodeHidden = document.getElementById("nodeHidden");

    if (!nodeHidden) return;

    nodeHidden.innerHTML = "";

    if (
        currentStory &&
        currentStory.nodes &&
        currentStory.nodes.length > 0
    ) {

        currentStory.nodes.forEach((element, index) => {

            let isStart = element.id === currentStory.startNodeId;
            let cardClass = "node-card";
            if (isStart) cardClass += " is-start";
            else if (element.isEnding) cardClass += " is-ending";

            let badgeHtml = "";
            if (isStart) {
                badgeHtml = `<span class="badge-start">🏷️ START NODE</span>`;
            } else if (element.isEnding) {
                badgeHtml = `<span class="badge-ending">🏁 ${(element.endingType || "ENDING").toUpperCase()} ENDING</span>`;
            }

            let startBtnHtml = "";
            if (!isStart && !element.isEnding) {
                startBtnHtml = `
                    <button
                        type="button"
                        class="nav-pill"
                        onclick="setAsStartNode('${element.id}')">
                        Set as Start
                    </button>
                `;
            }

            // Create choices HTML
            let choicesHTML = "";

            if (element.choices && element.choices.length > 0) {
                let choiceCards = "";

                element.choices.forEach((choice) => {
                    let targetNode = currentStory.nodes.find(
                        node => node.id === choice.targetNodeId
                    );

                    choiceCards += `
                        <div class="choice-item-card">
                            <div>
                                <strong style="font-size: 15px; display: block; color: var(--color-carbon);">"${choice.text}"</strong>
                                <span style="font-size: 13px; color: var(--color-voltage-violet); font-weight: 700;">→ ${targetNode ? targetNode.title : "Target node not found"}</span>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button
                                    type="button"
                                    class="nav-pill"
                                    onclick="editChoice('${element.id}', '${choice.id}')">
                                    Edit Choice
                                </button>
                                <button
                                    type="button"
                                    class="danger-btn"
                                    onclick="handleDeleteChoice('${element.id}', '${choice.id}')">
                                    Remove
                                </button>
                            </div>
                        </div>
                    `;
                });

                choicesHTML = `
                    <div style="margin-top: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
                            <h4 style="color: var(--color-voltage-violet); font-weight: 800; font-size: 15px; text-transform: uppercase;">CHOICES / OUTGOING EDGES (${element.choices.length})</h4>
                            ${!element.isEnding ? `
                                <button type="button" class="nav-pill" onclick="openChoiceModal('${element.id}')">+ Add Choice</button>
                            ` : `<span style="color: var(--color-voltage-violet); font-size: 12px; font-weight: 700;">Ending nodes need no outgoing choices</span>`}
                        </div>
                        <div>${choiceCards}</div>
                    </div>
                `;
            } else {
                choicesHTML = `
                    <div style="margin-top: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <h4 style="color: var(--color-voltage-violet); font-weight: 800; font-size: 15px; text-transform: uppercase;">CHOICES / OUTGOING EDGES (0)</h4>
                            ${!element.isEnding ? `
                                <button type="button" class="nav-pill" onclick="openChoiceModal('${element.id}')">+ Add Choice</button>
                            ` : `<span style="color: var(--color-voltage-violet); font-size: 12px; font-weight: 700;">Ending nodes need no outgoing choices</span>`}
                        </div>
                        <p style="font-style: italic; color: #666; margin-top: 10px; font-size: 14px;">No choices added yet.</p>
                    </div>
                `;
            }

            // Create Node Card
            nodeHidden.innerHTML += `
                <div class="${cardClass}">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <h3 style="font-size: 22px; font-weight: 800;">#${index + 1}. ${element.title}</h3>
                            ${badgeHtml}
                        </div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            ${startBtnHtml}
                            <button
                                type="button"
                                class="nav-pill"
                                onclick="editNode('${element.id}')">
                                ✏️ Edit Node
                            </button>
                            <button
                                type="button"
                                class="danger-btn"
                                onclick="handleDelete(${index})">
                                🗑️ Delete Node
                            </button>
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

        nodeHidden.innerHTML = `
            <div style="border: 3px dashed var(--color-carbon); border-radius: var(--radius-card-lg); padding: 48px 24px; text-align: center; background: #ffffff; box-shadow: var(--shadow-cut); margin-top: 24px;">
                <h2 style="font-family: var(--font-display); font-size: 32px; text-transform: uppercase; margin-bottom: 12px; color: var(--color-carbon);">NO SCENE NODES ADDED</h2>
                <p style="font-weight: 700; color: var(--color-carbon); font-size: 15px;">Click "+ Add Scene Node" above to add the initial scene for your story.</p>
            </div>
        `;
    }
}

async function setAsStartNode(nodeId) {
    if (!currentStory) return;
    currentStory.startNodeId = nodeId;
    localStorage.setItem("currentStory", JSON.stringify(currentStory));
    try {
        await fetch(`http://localhost:3000/Stories/${currentStory.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ startNodeId: nodeId })
        });
    } catch (e) {
        console.warn("Could not patch start node:", e);
    }
    showNodes(currentStory);
}

function editNode(nodeId) {

    let activeStory =
        JSON.parse(localStorage.getItem("currentStory")) || currentStory;

    if (!activeStory) {
        alert("No story selected");
        return;
    }


    // Find the node
    let node = activeStory.nodes.find(
        node => node.id === nodeId
    );


    if (!node) {
        alert("Node not found");
        return;
    }


    // Store node ID
    document.getElementById("editingNodeId").value =
        nodeId;


    // Fill existing values
    document.getElementById("nodeTitle").value =
        node.title || "";

    document.getElementById("nodeText").value =
        node.text || "";

    document.getElementById("nodeLocation").value =
        node.location || "";

    document.getElementById("nodeCharacters").value =
        node.characters
            ? node.characters.join(", ")
            : "";

    document.getElementById("isEnding").checked =
        node.isEnding || false;


    document.getElementById("endingType").value =
        node.endingType || "good";


    // Show/hide ending type
    toggleEndingGroup(
        document.getElementById("isEnding")
    );


    // Change modal title
    document.getElementById("nodeModalTitle").textContent =
        "EDIT SCENE NODE";


    // Open modal
    document.getElementById("nodeModal")
        .classList.remove("hidden");
}

let openChoiceModal = (sourceNodeId) => {
    let activeStory = JSON.parse(localStorage.getItem("currentStory"))

    if (!activeStory) {
        alert("create a story first!")
    }

    document.getElementById("sourceNodeId").value = sourceNodeId;

    let targetDropDown = document.getElementById("targetNodeId");

    targetDropDown.innerHTML = ""

    activeStory.nodes.forEach(node => {
        if (node.id !== sourceNodeId) {
            targetDropDown.innerHTML += `
            <option value="${node.id}">
                ${node.title}
            </option>
            `
        }

    })

    // Clear previous choice
    document.getElementById("choiceText").value = "";


    // Open modal
    document.getElementById("choiceModal")
        .classList.remove("hidden");
}

function closeChoiceModal() {

    document.getElementById("choiceModal")
        .classList.add("hidden");
}

let handleDeleteChoice = async (sourceNodeId, choiceId) => {

    let activeStory =
        JSON.parse(localStorage.getItem("currentStory")) || currentStory;

    if (!activeStory) {
        alert("No story selected");
        return;
    }


    // Find the source node
    let sourceNode = activeStory.nodes.find(
        node => node.id === sourceNodeId
    );


    if (!sourceNode) {
        alert("Source node not found");
        return;
    }


    // Remove the choice
    sourceNode.choices =
        sourceNode.choices.filter(
            choice => choice.id !== choiceId
        );


    // Update JSON Server
    let response = await fetch(
        `http://localhost:3000/Stories/${activeStory.id}`,
        {
            method: "PATCH",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                nodes: activeStory.nodes
            })
        }
    );


    if (!response.ok) {
        alert("Choice could not be deleted");
        return;
    }


    // Update LocalStorage
    localStorage.setItem(
        "currentStory",
        JSON.stringify(activeStory)
    );

    currentStory = activeStory;


    alert("Choice deleted");

    // Re-render
    showNodes(currentStory);
};


function editChoice(sourceNodeId, choiceId) {

    let activeStory =
        JSON.parse(localStorage.getItem("currentStory")) || currentStory;

    if (!activeStory) {
        alert("No story selected");
        return;
    }

    // Find source node
    let sourceNode = activeStory.nodes.find(
        node => node.id === sourceNodeId
    );

    if (!sourceNode) {
        alert("Source node not found");
        return;
    }

    // Find choice
    let choice = sourceNode.choices.find(
        choice => choice.id === choiceId
    );

    if (!choice) {
        alert("Choice not found");
        return;
    }

    // Store IDs
    document.getElementById("sourceNodeId").value =
        sourceNodeId;

    document.getElementById("editingChoiceId").value =
        choiceId;


    // Put existing choice text into input
    document.getElementById("choiceText").value =
        choice.text;


    // Fill target dropdown
    let targetDropdown =
        document.getElementById("targetNodeId");

    targetDropdown.innerHTML = ""

    activeStory.nodes.forEach(node => {

        if (node.id !== sourceNodeId) {

            targetDropdown.innerHTML += `
                <option value="${node.id}">
                    ${node.title}
                </option>
            `;
        }

    });


    // Select existing target
    targetDropdown.value =
        choice.targetNodeId;


    // Open modal
    document.getElementById("choiceModal")
        .classList.remove("hidden");
}

// 5. Handle Delete Node
let handleDelete = async (index) => {
    let activeStory = JSON.parse(localStorage.getItem("currentStory")) || currentStory;

    activeStory.nodes.splice(index, 1);

    if (activeStory.nodes.length === 0) {
        activeStory.startNodeId = null;
    } else {
        activeStory.startNodeId = activeStory.nodes[0].id;
    }

    await fetch(`http://localhost:3000/Stories/${activeStory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nodes: activeStory.nodes,
            startNodeId: activeStory.startNodeId
        })
    });

    localStorage.setItem("currentStory", JSON.stringify(activeStory));
    currentStory = activeStory;

    alert("Node deleted");
    showNodes(currentStory);
};

// handling choices

let handleChoice = async (event) => {

    event.preventDefault();

    let activeStory =
        JSON.parse(localStorage.getItem("currentStory")) || currentStory;

    if (!activeStory) {
        alert("No story selected");
        return;
    }

    let sourceNodeId =
        document.getElementById("sourceNodeId").value;

    let editingChoiceId =
        document.getElementById("editingChoiceId").value;

    let choiceText =
        document.getElementById("choiceText").value.trim();

    if (!choiceText) {
        alert("Choice text cannot be empty. Please enter a choice.");
        return;
    }

    let targetNodeId =
        document.getElementById("targetNodeId").value;


    let sourceNode = activeStory.nodes.find(
        node => node.id === sourceNodeId
    );

    if (!sourceNode) {
        alert("Source node not found");
        return;
    }


    // EDIT EXISTING CHOICE
    if (editingChoiceId) {

        let choice = sourceNode.choices.find(
            choice => choice.id === editingChoiceId
        );

        if (!choice) {
            alert("Choice not found");
            return;
        }

        choice.text = choiceText;
        choice.targetNodeId = targetNodeId;

    }

    // ADD NEW CHOICE
    else {

        let choice = {
            id: crypto.randomUUID(),
            text: choiceText,
            targetNodeId: targetNodeId
        };

        sourceNode.choices.push(choice);
    }


    // Save to JSON Server
    let response = await fetch(
        `http://localhost:3000/Stories/${activeStory.id}`,
        {
            method: "PATCH",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                nodes: activeStory.nodes
            })
        }
    );


    if (!response.ok) {
        alert("Choice could not be saved");
        return;
    }


    localStorage.setItem(
        "currentStory",
        JSON.stringify(activeStory)
    );

    currentStory = activeStory;


    alert(
        editingChoiceId
            ? "Choice updated successfully"
            : "Choice added successfully"
    );


    document.getElementById("choiceForm").reset();

    document.getElementById("editingChoiceId").value = "";

    closeChoiceModal();

    showNodes(currentStory);
};

/* =====================================================
   PUBLISH STORY FUNCTION
===================================================== */


async function publishStory() {
    let existingId = (currentStory && currentStory.id) ? currentStory.id : storyId;

    let storyInput = document.getElementById("story");
    let titleVal = storyInput ? storyInput.value.trim() : "";

    if (!existingId && !titleVal) {
        alert("⚠️ Cannot Publish! Please fill out and save Story Metadata first.");
        return;
    }

    // Check node requirement — MUST have at least 1 node
    let currentNodes = (currentStory && currentStory.nodes) ? (Array.isArray(currentStory.nodes) ? currentStory.nodes : Object.keys(currentStory.nodes)) : [];
    if (currentNodes.length === 0) {
        alert("⚠️ Cannot Publish Story! You must add at least 1 Scene Node before publishing.");
        return;
    }

    try {
        let response = await fetch("http://localhost:3000/Stories/" + (existingId || currentStory.id), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "published" })
        });

        if (response.ok) {
            let updated = await response.json();
            currentStory = updated;
            localStorage.setItem("currentStory", JSON.stringify(currentStory));
            alert("🎉 Story Published Successfully! It is now live in the Story Library.");
        } else {
            alert("Could not publish story. Please try again.");
        }
    } catch (e) {
        alert("Error connecting to server to publish story.");
    }
}