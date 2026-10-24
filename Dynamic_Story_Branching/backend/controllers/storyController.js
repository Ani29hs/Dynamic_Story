const Story = require("../models/Story");

// 1. GET ALL STORIES - Fetch all stories (with optional filters)
const getAllStories = async (req, res) => {
    try {
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.id) query.id = String(req.query.id);

        const data = await Story.find(query).sort({ createdAt: -1 });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. GET SINGLE STORY - Fetch single story by its ID
const getStoryById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await Story.findOne({ id: String(id) });

        if (!data) {
            return res.status(404).json({ error: "Story not found" });
        }
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. CREATE STORY - Store new branching story in MongoDB
const createStory = async (req, res) => {
    try {
        const storyData = { ...req.body };
        if (!storyData.id) {
            storyData.id = `story_${Date.now()}`;
        }
        // Normalize nodes array if sent as an object
        if (storyData.nodes && !Array.isArray(storyData.nodes) && typeof storyData.nodes === "object") {
            storyData.nodes = Object.values(storyData.nodes);
        }

        const data = await Story.create(storyData);
        res.status(201).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 4. UPDATE STORY (PATCH) - Update specific fields of a story
const updateStory = async (req, res) => {
    try {
        const id = req.params.id;
        const updateData = { ...req.body };

        if (updateData.nodes && !Array.isArray(updateData.nodes) && typeof updateData.nodes === "object") {
            updateData.nodes = Object.values(updateData.nodes);
        }

        const data = await Story.findOneAndUpdate(
            { id: String(id) },
            { $set: updateData },
            { returnDocument: "after" }
        );

        if (!data) {
            return res.status(404).json({ error: "Story not found" });
        }
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 5. REPLACE STORY (PUT) - Fully replace story data
const replaceStory = async (req, res) => {
    try {
        const id = req.params.id;
        const replaceData = { ...req.body };

        if (replaceData.nodes && !Array.isArray(replaceData.nodes) && typeof replaceData.nodes === "object") {
            replaceData.nodes = Object.values(replaceData.nodes);
        }

        const data = await Story.findOneAndReplace(
            { id: String(id) },
            replaceData,
            { returnDocument: "after", upsert: true }
        );
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 6. DELETE STORY - Remove story by ID
const deleteStory = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await Story.findOneAndDelete({ id: String(id) });

        if (!data) {
            return res.status(404).json({ error: "Story not found" });
        }
        res.status(200).json({ message: "Story deleted successfully", deletedId: id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllStories,
    getStoryById,
    createStory,
    updateStory,
    replaceStory,
    deleteStory
};
