const crypto = require("crypto");
const ReaderStory = require("../models/ReaderStory");
const User = require("../models/User");

// 1. GET PITCHES - Fetch reader pitches (supports filtering by submitter/status)
const getPitches = async (req, res) => {
    try {
        const query = {};
        const filterId = req.query.submittedById || req.query.authorId;
        if (filterId) {
            query.$or = [{ submittedById: String(filterId) }, { authorId: String(filterId) }];
        }
        if (req.query.status) query.status = req.query.status;

        const data = await ReaderStory.find(query).sort({ createdAt: -1 });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. CREATE PITCH - Reader submits a new branching story idea
const createPitch = async (req, res) => {
    try {
        const pitchData = { ...req.body };
        if (!pitchData.id) {
            pitchData.id = crypto.randomUUID();
        }

        const userId = pitchData.submittedById || pitchData.authorId || (req.user ? req.user.id : null);
        const userName = pitchData.submittedBy || pitchData.authorName || (req.user ? req.user.name : "Reader");

        pitchData.submittedById = userId;
        pitchData.authorId = userId;
        pitchData.submittedBy = userName;
        pitchData.authorName = userName;
        if (!pitchData.submittedAt) {
            pitchData.submittedAt = new Date().toISOString();
        }

        // Award +20 XP once per calendar month
        let xpAwarded = 0;
        let newXp = undefined;
        if (userId) {
            const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
            const submitter = await User.findOne({ id: String(userId) });
            if (submitter) {
                if (submitter.lastPitchMonth !== currentMonth) {
                    submitter.xp = (submitter.xp !== undefined ? submitter.xp : 100) + 20;
                    submitter.lastPitchMonth = currentMonth;
                    await submitter.save();
                    xpAwarded = 20;
                }
                newXp = submitter.xp;
            }
        }

        const data = await ReaderStory.create(pitchData);
        const responseData = typeof data.toJSON === "function" ? data.toJSON() : data.toObject();
        responseData.xpAwarded = xpAwarded;
        responseData.newXp = newXp;

        res.status(201).json(responseData);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 3. UPDATE PITCH - Admin updates pitch status (approved/rejected)
const updatePitch = async (req, res) => {
    try {
        const id = req.params.id;
        const pitch = await ReaderStory.findOne({ id: String(id) });
        if (!pitch) {
            return res.status(404).json({ error: "Pitch not found" });
        }

        // Award +30 XP and toast notification when admin approves pitch
        if (req.body.status === "approved" && pitch.status !== "approved") {
            const submitterId = pitch.submittedById || pitch.authorId;
            if (submitterId) {
                const submitter = await User.findOne({ id: String(submitterId) });
                if (submitter) {
                    submitter.xp = (submitter.xp !== undefined ? submitter.xp : 100) + 30;
                    submitter.pendingToast = {
                        message: "🎉 Your story pitch was ACCEPTED by the admin! +30 XP earned!",
                        xpAwarded: 30
                    };
                    await submitter.save();
                }
            }
        }

        const data = await ReaderStory.findOneAndUpdate(
            { id: String(id) },
            { $set: req.body },
            { returnDocument: "after" }
        );
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 4. DELETE PITCH - Reader or Admin removes pitch
const deletePitch = async (req, res) => {
    try {
        const id = req.params.id;
        const pitch = await ReaderStory.findOne({ id: String(id) });
        if (!pitch) {
            return res.status(404).json({ error: "Pitch not found" });
        }

        if (req.user && req.user.role !== "Admin") {
            const userId = req.user.id;
            if (pitch.authorId !== userId && pitch.submittedById !== userId) {
                return res.status(403).json({ error: "Not authorized to delete this pitch" });
            }
        }

        await ReaderStory.findOneAndDelete({ id: String(id) });
        res.status(200).json({ message: "Pitch deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getPitches,
    createPitch,
    updatePitch,
    deletePitch
};
