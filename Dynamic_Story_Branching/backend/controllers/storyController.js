const Story = require("../models/Story");

// 1. GET ALL STORIES - Fetch all stories (with optional filters)
const getAllStories = async (req, res) => {
    try {
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.id) query.id = String(req.query.id);
        if (req.query.genre && req.query.genre !== "All" && req.query.genre !== "All Genres") {
            query.genre = { $regex: new RegExp(req.query.genre.trim(), "i") };
        }
        if (req.query.search) {
            query.$or = [
                { title: { $regex: new RegExp(req.query.search.trim(), "i") } },
                { author: { $regex: new RegExp(req.query.search.trim(), "i") } },
                { synopsis: { $regex: new RegExp(req.query.search.trim(), "i") } }
            ];
        }

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

// 7. INCREMENT VIEWS - Track unique story read counts per user
const incrementStoryViews = async (req, res) => {
    try {
        const id = req.params.id;
        let viewerId = null;
        if (req.user && req.user.id) {
            viewerId = `user_${req.user.id}`;
        } else if (req.body && req.body.userId) {
            viewerId = `user_${req.body.userId}`;
        } else {
            const ip = req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || req.ip || "127.0.0.1";
            viewerId = `ip_${ip}`;
        }

        const story = await Story.findOne({ $or: [{ id: String(id) }, { _id: (typeof id === 'string' && id.length === 24) ? id : null }] });
        if (!story) {
            return res.status(404).json({ error: "Story not found" });
        }

        if (!Array.isArray(story.viewedBy)) {
            story.viewedBy = [];
        }

        // Only increment view if this user/ip has not viewed this story yet
        if (story.viewedBy.includes(viewerId)) {
            return res.status(200).json({ id: story.id, views: story.views || 0, isNewView: false });
        }

        story.viewedBy.push(viewerId);
        story.views = (story.views || 0) + 1;
        await story.save();
        return res.status(200).json({ id: story.id, views: story.views, isNewView: true });
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
    deleteStory,
    incrementStoryViews
};
