let user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "../auth/login.html";
} else if (user.role !== "Admin") {
    window.location.href = "../reader/home.html";
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
    let genre = document.getElementById("genre");
    let status = document.getElementById("status");
    let description = document.getElementById("storyDescr");
    let imageURL = document.getElementById("image");

    let user = JSON.parse(localStorage.getItem("user"));

    // Read current story ID if available
    let existingId = currentStory && currentStory.id ? currentStory.id : storyId;

    let storyObject = {
        id: existingId ? existingId : `story_${Date.now()}`,
        title: story.value,
        author: user.name,
        genre: genre.value,
        status: status.value,
        description: description.value,
        imageURL: imageURL.value,
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

    // Save in LocalStorage
    localStorage.setItem("currentStory", JSON.stringify(savedStory));
    currentStory = savedStory;

    // UPDATE BROWSER URL to include ?id=... so refresh keeps this story active!
    if (!storyId) {
        window.history.pushState({}, "", `add_stories.html?id=${savedStory.id}`);
    }

    alert(isEditing ? "Story updated successfully!" : "Story added successfully!");
    showNodes(currentStory);
};

// 3. Handle Node Submit
let handleNode = async (event) => {
    event.preventDefault();

    let activeStory = JSON.parse(localStorage.getItem("currentStory")) || currentStory;

    if (!activeStory) {
        alert("Please save Story Metadata first!");
        return;
    }

    let nodeTitle = document.getElementById("nodeTitle").value;
    let nodeText = document.getElementById("nodeText").value;
    let nodeLocation = document.getElementById("nodeLocation").value;
    let nodeCharacters = document.getElementById("nodeCharacters").value;
    let isEnding = document.getElementById("isEnding").checked;
    let endingType = document.getElementById("endingType").value;

    let node = {
        id: crypto.randomUUID(),
        title: nodeTitle,
        text: nodeText,
        location: nodeLocation,
        characters: nodeCharacters
            .split(",")
            .map(character => character.trim())
            .filter(character => character !== ""),
        isEnding: isEnding,
        endingType: isEnding ? endingType : null,
        choices: []
    };

    activeStory.nodes.push(node);

    if (activeStory.nodes.length === 1) {
        activeStory.startNodeId = node.id;
    }

    let response = await fetch(
        `http://localhost:3000/Stories/${activeStory.id}`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nodes: activeStory.nodes,
                startNodeId: activeStory.startNodeId
            })
        }
    );

    if (!response.ok) {
        alert("Node could not be saved");
        return;
    }

    localStorage.setItem("currentStory", JSON.stringify(activeStory));
    currentStory = activeStory;

    alert("Node added successfully");

    document.getElementById("nodeForm").reset();
    closeNodeModal();
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

            // Create choices HTML
            let choicesHTML = "";

            if (element.choices && element.choices.length > 0) {

                choicesHTML = `
                    <div class="choices-section">

                        <h4>Choices</h4>

                        <div class="choices-list">
                `;

                element.choices.forEach((choice) => {

                    // Find the node this choice points to
                    let targetNode = currentStory.nodes.find(
                        node => node.id === choice.targetNodeId
                    );

                    choicesHTML += `
                        <div class="choice-card">

                            <span class="choice-text">
                                → ${choice.text}
                            </span>

                            <span class="choice-target">
                                → ${targetNode
                                    ? targetNode.title
                                    : "Target node not found"}
                            </span>

                        </div>
                    `;

                });

                choicesHTML += `
                        </div>

                    </div>
                `;

            } else {

                choicesHTML = `
                    <div class="choices-section">

                        <h4>Choices</h4>

                        <p>No choices added yet.</p>

                    </div>
                `;
            }


            // Create Node Card
            nodeHidden.innerHTML += `

                <div class="node-card">

                    <h2>Node ${index + 1}</h2>

                    <h3>${element.title}</h3>

                    <p>${element.text}</p>

                    <p>
                        <strong>Location:</strong>
                        ${element.location || "Not specified"}
                    </p>


                    ${choicesHTML}


                    <div class="node-actions">

                        <button
                            class="primary-btn"
                            onclick="openChoiceModal('${element.id}')">
                            + Add Choice
                        </button>

                        <button
                            class="danger-btn"
                            onclick="handleDelete(${index})">
                            Delete
                        </button>

                    </div>

                </div>

            `;
        });

    } else {

        nodeHidden.innerHTML = `

            <h3>No Scene Nodes Added</h3>

            <p>
                Click "+ Add Scene Node" above
                to add the initial scene for your story.
            </p>

        `;
    }
}

let openChoiceModal=(sourceNodeId)=>{
    let activeStory = JSON.parse(localStorage.getItem("currentStory"))

    if(!activeStory){
        alert("create a story first!")
    }

    document.getElementById("sourceNodeId").value=sourceNodeId;

    let targetDropDown = document.getElementById("targetNodeId");
    
    targetDropDown.innerHTML=""

    activeStory.nodes.forEach(node=>{
        if(node.id!==sourceNodeId){
            targetDropDown.innerHTML+=`
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

let handleChoice=async(event)=>{

    event.preventDefault()

    let activeStory = JSON.parse(localStorage.getItem("currentStory"))

    if(!activeStory){
        alert("No story selected")
    }

    let sourceNodeId = document.getElementById("sourceNodeId").value

    let choiceText = document.getElementById("choiceText").value  

    let targetNodeId = document.getElementById("targetNodeId").value

    if(!sourceNodeId||!choiceText||!targetNodeId){
        alert("Please fill the details first!")
        return
    }

    
    let sourceNode = activeStory.nodes.find(node=>
        node.id==sourceNodeId
    )

    if(!sourceNode){
        alert("Source Node not found")
        return
    }

    let choice = {
        id:crypto.randomUUID(),
        text:choiceText,
        targetNodeId:targetNodeId
    }

    sourceNode.choices.push(choice)

    let response= await fetch(`http://localhost:3000/Stories/${activeStory.id}`,{
        method:"PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nodes: activeStory.nodes
        })
    })

    if (!response.ok) {

        alert("Choice could not be saved");

        return;
    }


    localStorage.setItem("currentStory",JSON.stringify(activeStory))

    currentStory = activeStory;

    alert("Choice added successfully");

    closeChoiceModal();

    showNodes(currentStory);

}
