const Story = require('../models/Story');

// GET /Stories
exports.getAllStories = async (req, res) => {
    try {
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.id) query.id = String(req.query.id);

        const stories = await Story.find(query).sort({ createdAt: -1 });
        res.json(stories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /Stories/:id
exports.getStoryById = async (req, res) => {
    try {
        const story = await Story.findOne({ id: String(req.params.id) });
        if (!story) return res.status(404).json({ error: 'Story not found' });
        res.json(story);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /Stories
exports.createStory = async (req, res) => {
    try {
        const storyData = { ...req.body };
        if (!storyData.id) {
            storyData.id = `story_${Date.now()}`;
        }
        if (storyData.nodes && !Array.isArray(storyData.nodes) && typeof storyData.nodes === 'object') {
            storyData.nodes = Object.values(storyData.nodes);
        }
        const newStory = await Story.create(storyData);
        res.status(201).json(newStory);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// PATCH /Stories/:id
exports.updateStory = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (updateData.nodes && !Array.isArray(updateData.nodes) && typeof updateData.nodes === 'object') {
            updateData.nodes = Object.values(updateData.nodes);
        }
        const updated = await Story.findOneAndUpdate(
            { id: String(req.params.id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );
        if (!updated) return res.status(404).json({ error: 'Story not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// PUT /Stories/:id
exports.replaceStory = async (req, res) => {
    try {
        const replaceData = { ...req.body };
        if (replaceData.nodes && !Array.isArray(replaceData.nodes) && typeof replaceData.nodes === 'object') {
            replaceData.nodes = Object.values(replaceData.nodes);
        }
        const updated = await Story.findOneAndReplace(
            { id: String(req.params.id) },
            replaceData,
            { returnDocument: 'after', upsert: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// DELETE /Stories/:id
exports.deleteStory = async (req, res) => {
    try {
        const deleted = await Story.findOneAndDelete({ id: String(req.params.id) });
        if (!deleted) return res.status(404).json({ error: 'Story not found' });
        res.json({ success: true, deletedId: req.params.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
