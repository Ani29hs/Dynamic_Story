const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const SECRET_KEY = process.env.SECRET_KEY || "PASSKEY";

// POST /register
exports.register = async (req, res) => {
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
            unlockedEndings: {}
        });

        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.status(201).json({
            message: "User registered successfully",
            token: token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                xp: newUser.xp
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /login
exports.login = async (req, res) => {
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

        let isMatch = false;
        // Verify bcrypt hash or upgrade legacy plaintext
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

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.json({
            message: "User Logged In successfully",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                xp: user.xp || 100,
                completedStories: user.completedStories || [],
                usedFreeRetreatStories: user.usedFreeRetreatStories || [],
                unlockedEndings: user.unlockedEndings || {}
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /profile (protected)
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            message: "Welcome to my profile",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                xp: user.xp || 100,
                completedStories: user.completedStories || [],
                usedFreeRetreatStories: user.usedFreeRetreatStories || [],
                unlockedEndings: user.unlockedEndings || {},
                pendingToast: user.pendingToast || null,
                hasSeenWelcomeToast: user.hasSeenWelcomeToast || false,
                lastPitchMonth: user.lastPitchMonth || null
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
