const crypto = require("crypto");
const StorySession = require("../models/StorySession");

// 1. GET ALL SESSIONS - Query reading sessions by userId / storyId
const getSessions = async (req, res) => {
    try {
        const query = {};
        if (req.query.userId) query.userId = String(req.query.userId);
        if (req.query.storyId) query.storyId = String(req.query.storyId);
        if (req.query.id) query.id = String(req.query.id);

        const data = await StorySession.find(query);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// 2. GET SINGLE SESSION - Fetch session by ID
const getSessionById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await StorySession.findOne({ id: String(id) });

        if (!data) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. CREATE SESSION - Start a new reading playthrough session
const createSession = async (req, res) => {
    try {
        const sessionData = { ...req.body };
        if (!sessionData.id) {
            sessionData.id = crypto.randomUUID();
        }

        const data = await StorySession.create(sessionData);
        res.status(201).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 4. UPDATE SESSION - Save current node, visited choices, retreat states
const updateSession = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await StorySession.findOneAndUpdate(
            { id: String(id) },
            { $set: req.body },
            { returnDocument: "after", upsert: true }
        );

        if (!data) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 5. DELETE SESSION - Reset or remove session
const deleteSession = async (req, res) => {
    try {
        const id = req.params.id;
        await StorySession.findOneAndDelete({ id: String(id) });
        res.status(200).json({ message: "Session deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getSessions,
    getSessionById,
    createSession,
    updateSession,
    deleteSession
};
