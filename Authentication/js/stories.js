
let user = JSON.parse(localStorage.getItem("user"))

if(!user){
    window.location.href="../auth/signup.html"
}
else if(user.role!=="Admin"){
    window.location.href="../reader/home.html"
}
let handleStory=async(event)=>{
    event.preventDefault()

    let story = document.getElementById("story")
    let author = document.getElementById("author")
    let genre = document.getElementById("genre")
    let status = document.getElementById("status")
    let description = document.getElementById("storyDescr")
    let imageURL = document.getElementById("image")

    let user = JSON.parse(localStorage.getItem("user"))

    let storyObject ={
        title:story.value,
        author:user.name,
        genre:genre.value,
        status:status.value,
        description:description.value,
        imageURL:imageURL.value,
        nodes :[],
        startNodeId :null
    }

    let response = await fetch("http://localhost:3000/Stories", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(storyObject)
    })

    let createdStory = await response.json();

    localStorage.setItem("currentStory",JSON.stringify(createdStory))

    alert("Story added")
}


let handleNode = async (event) => {

    event.preventDefault();

    // Get current story
    let currentStory = JSON.parse(
        localStorage.getItem("currentStory")
    );

    if (!currentStory) {
        alert("Please create a story first");
        return;
    }


    // Get node form values
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


    // Create node
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

        endingType: isEnding
            ? endingType
            : null,

        choices: []
    }


    // Add node to story
    currentStory.nodes.push(node)


    // If this is the first node,
    // make it the starting node
    if (currentStory.nodes.length === 1) {

        currentStory.startNodeId = node.id

    }


    // Update story in JSON Server
    let response = await fetch(
        `http://localhost:3000/Stories/${currentStory.id}`,
        {
            method: "PATCH",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                nodes: currentStory.nodes,
                startNodeId: currentStory.startNodeId
            })
        }
    );


    if (!response.ok) {
        alert("Node could not be saved")
        return;
    }


    // Update current story in LocalStorage
    localStorage.setItem(
        "currentStory",
        JSON.stringify(currentStory)
    );


    alert("Node added successfully")

    document.getElementById("nodeForm").reset()

}
