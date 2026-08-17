 function redirectStory(){
        window.location.href = "add_stories.html"
    }

function handleLogout() {
        localStorage.removeItem("user");
        alert("Logged out successfully");
        window.location.href = "../auth/login.html";
}

let loadStories = async () => {
    let response = await fetch("http://localhost:3000/Stories");
    let stories = await response.json();
    let storyCard = document.getElementById("storyCard");

    if (!storyCard) return;

    // 1. If no stories exist, render empty state
    if (stories.length === 0) {
        storyCard.innerHTML = `
            <div class="empty-state">
                <h1>No stories created yet</h1>
                <p>Create your first interactive branching story or seed the sample adventure.</p>
                <a href="../admin/add_stories.html" class="primary-btn">+ Create Story</a>
            </div>
        `;
        return;
    }

    // 2. Clear container before looping
    storyCard.innerHTML = "";

    // 3. Loop through stories and append cards
    stories.forEach((element) => {
        let nodeCount = element.nodes ? element.nodes.length : 0;
        let statusClass = element.status === "published" ? "badge-published" : "badge-draft";
        
        let coverImg = element.imageURL || element.coverImage 
            ? `<img src="${element.imageURL || element.coverImage}" alt="${element.title}" onerror="this.src='https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'">`
            : `<div class="no-image">📖 No Cover Image</div>`;

        storyCard.innerHTML += `
            <div class="story-card">
                <div class="story-card-image">
                    ${coverImg}
                </div>
                <div class="story-card-content">
                    <div class="story-card-header">
                        <h3>${element.title || "Untitled Story"}</h3>
                        <span class="badge ${statusClass}">${element.status || "draft"}</span>
                    </div>
                    <span class="story-genre">
                        🏷️ ${element.genre || "Uncategorized"} &bull; By ${element.author || "Anonymous"}
                    </span>
                    <p class="story-description">
                        ${element.description || "No description provided."}
                    </p>
                    <div class="story-info">
                        <span>📊 Scenes/Nodes: ${nodeCount}</span>
                    </div>
                </div>
                <div class="story-actions">
                    <button class="secondary-btn" onclick="editStory('${element.id}')">✏️ Edit Story</button>
                    <button class="danger-btn delete-btn" onclick="deleteStory('${element.id}')">🗑️ Delete</button>
                </div>
            </div>
        `;
    });
};

// Global function to Edit Story
let editStory = (storyId) => {
    // Navigate to editor with story ID
    window.location.href = `add_stories.html?id=${storyId}`;
};

// Global function to Delete Story
let deleteStory = async (storyId) => {
    if (confirm("Are you sure you want to delete this story?")) {
        await fetch(`http://localhost:3000/Stories/${storyId}`, {
            method: "DELETE"
        });
        alert("Story deleted successfully!");
        loadStories(); // Refresh list
    }
};

loadStories();
