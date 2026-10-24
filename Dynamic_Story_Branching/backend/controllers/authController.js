const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Comment = require("../models/Comment");
const Review = require("../models/Review");

const SECRET_KEY = process.env.SECRET_KEY || "PASSKEY";

// 1. REGISTER - Create a new user account with hashed password
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Hash password securely with bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            id: crypto.randomUUID(),
            name: name ? String(name).trim() : "Reader",
            email: normalizedEmail,
            password: hashedPassword,
            role: "Reader",
            xp: 100,
            completedStories: [],
            usedFreeRetreatStories: [],
            unlockedEndings: {},
            hasSeenWelcomeToast: false,
            seenBadges: []
        });

        // Generate JWT token (do not embed base64 avatar in payload to keep header small)
        const safeAvatar = (newUser.avatar && !newUser.avatar.startsWith("data:")) ? newUser.avatar : "🧙‍♂️";
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name, avatar: safeAvatar },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                avatar: newUser.avatar || "🧙‍♂️",
                title: newUser.title || "Story Explorer",
                bio: newUser.bio || "",
                xp: newUser.xp,
                hasSeenWelcomeToast: false,
                seenBadges: []
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. LOGIN - Authenticate user credentials and return JWT token
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: "Email does not exist" });
        }

        // Compare password with bcrypt hash or upgrade legacy plaintext
        let isMatch = false;
        if (user.password && (user.password.startsWith("$2a$") || user.password.startsWith("$2b$"))) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (user.password === password);
            if (isMatch) {
                user.password = await bcrypt.hash(password, 10);
                await user.save();
            }
        }

        if (!isMatch) {
            return res.status(400).json({ message: "Password does not match" });
        }

        // Generate JWT token (do not embed base64 avatar in payload to keep header small)
        const safeAvatar = (user.avatar && !user.avatar.startsWith("data:")) ? user.avatar : "🧙‍♂️";
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name, avatar: safeAvatar },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.status(200).json({
            message: "User Logged In successfully",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || "🧙‍♂️",
                title: user.title || "Story Explorer",
                bio: user.bio || "",
                xp: user.xp || 100,
                completedStories: user.completedStories || [],
                usedFreeRetreatStories: user.usedFreeRetreatStories || [],
                unlockedEndings: user.unlockedEndings || {},
                hasSeenWelcomeToast: user.hasSeenWelcomeToast || false,
                seenBadges: user.seenBadges || []
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. GET PROFILE - Fetch current user info from token
const getProfile = async (req, res) => {
    try {
        const mongoose = require("mongoose");
        const query = { $or: [{ id: String(req.user.id) }] };
        if (req.user.email) query.$or.push({ email: String(req.user.email).toLowerCase() });
        if (mongoose.isValidObjectId(req.user.id)) query.$or.push({ _id: req.user.id });

        const user = await User.findOne(query);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || "🧙‍♂️",
                title: user.title || "Story Explorer",
                bio: user.bio || "",
                xp: user.xp || 100,
                completedStories: user.completedStories || [],
                usedFreeRetreatStories: user.usedFreeRetreatStories || [],
                unlockedEndings: user.unlockedEndings || {},
                pendingToast: user.pendingToast || null,
                hasSeenWelcomeToast: user.hasSeenWelcomeToast || false,
                lastPitchMonth: user.lastPitchMonth || null,
                seenBadges: user.seenBadges || []
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. UPDATE PROFILE - Save avatar, persona title, bio, display name, and game progression
const updateProfile = async (req, res) => {
    try {
        const { name, avatar, title, bio, seenBadges, completedStories, unlockedEndings, xp, usedFreeRetreatStories } = req.body;
        const mongoose = require("mongoose");
        const query = { $or: [{ id: String(req.user.id) }] };
        if (req.user.email) query.$or.push({ email: String(req.user.email).toLowerCase() });
        if (mongoose.isValidObjectId(req.user.id)) query.$or.push({ _id: req.user.id });

        const user = await User.findOne(query);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (name && typeof name === "string" && name.trim()) user.name = name.trim();
        if (avatar !== undefined) user.avatar = String(avatar).trim();
        if (title !== undefined) user.title = String(title).trim().substring(0, 40);
        if (bio !== undefined) user.bio = String(bio).trim().substring(0, 300);
        if (Array.isArray(seenBadges)) user.seenBadges = seenBadges;
        if (Array.isArray(completedStories)) user.completedStories = completedStories;
        if (unlockedEndings !== undefined) user.unlockedEndings = unlockedEndings;
        if (typeof xp === "number") user.xp = xp;
        if (Array.isArray(usedFreeRetreatStories)) user.usedFreeRetreatStories = usedFreeRetreatStories;

        await user.save();

        // Also synchronize user's avatar and name across all their existing comments and reviews
        try {
            await Promise.all([
                Comment.updateMany({ userId: String(user.id) }, { userAvatar: user.avatar, username: user.name }),
                Review.updateMany({ userId: String(user.id) }, { userAvatar: user.avatar, username: user.name })
            ]);
        } catch (syncErr) {
            console.warn("Avatar comment/review sync notice:", syncErr.message);
        }

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || "🧙‍♂️",
                title: user.title || "Story Explorer",
                bio: user.bio || "",
                xp: user.xp || 100,
                completedStories: user.completedStories || [],
                usedFreeRetreatStories: user.usedFreeRetreatStories || [],
                unlockedEndings: user.unlockedEndings || {},
                pendingToast: user.pendingToast || null,
                hasSeenWelcomeToast: user.hasSeenWelcomeToast || false,
                lastPitchMonth: user.lastPitchMonth || null,
                seenBadges: user.seenBadges || []
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile
};

