const crypto = require('crypto');
const StorySession = require('../models/StorySession');

// GET /StorySessions
exports.getSessions = async (req, res) => {
    try {
        const query = {};
        if (req.query.userId) query.userId = String(req.query.userId);
        if (req.query.storyId) query.storyId = String(req.query.storyId);
        if (req.query.id) query.id = String(req.query.id);

        const sessions = await StorySession.find(query);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /StorySessions/:id
exports.getSessionById = async (req, res) => {
    try {
        const session = await StorySession.findOne({ id: String(req.params.id) });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /StorySessions
exports.createSession = async (req, res) => {
    try {
        const sessionData = { ...req.body };
        if (!sessionData.id) {
            sessionData.id = crypto.randomUUID();
        }
        const newSession = await StorySession.create(sessionData);
        res.status(201).json(newSession);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// PATCH /StorySessions/:id
exports.updateSession = async (req, res) => {
    try {
        const updated = await StorySession.findOneAndUpdate(
            { id: String(req.params.id) },
            { $set: req.body },
            { returnDocument: 'after', upsert: true }
        );
        if (!updated) return res.status(404).json({ error: 'Session not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// DELETE /StorySessions/:id
exports.deleteSession = async (req, res) => {
    try {
        await StorySession.findOneAndDelete({ id: String(req.params.id) });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
