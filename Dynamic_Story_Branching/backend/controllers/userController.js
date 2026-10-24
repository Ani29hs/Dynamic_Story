const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// 1. GET ALL USERS - Query users with optional filters (email, role, id)
const getUsers = async (req, res) => {
    try {
        const query = {};
        if (req.query.email) query.email = String(req.query.email).toLowerCase().trim();
        if (req.query.role) query.role = req.query.role;
        if (req.query.id) query.id = String(req.query.id);

        const data = await User.find(query);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. GET SINGLE USER - Fetch user by ID
const getUserById = async (req, res) => {
    try {
        const id = req.params.id;
        const mongoose = require("mongoose");
        const query = { $or: [{ id: String(id) }, { email: String(id).toLowerCase() }] };
        if (mongoose.isValidObjectId(id)) {
            query.$or.push({ _id: id });
        }
        const data = await User.findOne(query);

        if (!data) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. CREATE USER - Store user record in MongoDB
const createUser = async (req, res) => {
    try {
        const userData = { ...req.body };
        if (!userData.id) {
            userData.id = crypto.randomUUID();
        }
        if (userData.email) {
            userData.email = String(userData.email).toLowerCase().trim();
        }
        // Hash password if plain text
        if (userData.password && !userData.password.startsWith("$2a$") && !userData.password.startsWith("$2b$")) {
            userData.password = await bcrypt.hash(userData.password, 10);
        }

        const data = await User.create(userData);
        res.status(201).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 4. UPDATE USER - Update user profile, XP, or settings
const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        const mongoose = require("mongoose");
        const query = { $or: [{ id: String(id) }, { email: String(id).toLowerCase() }] };
        if (mongoose.isValidObjectId(id)) {
            query.$or.push({ _id: id });
        }
        const data = await User.findOneAndUpdate(
            query,
            { $set: req.body },
            { returnDocument: "after" }
        );

        if (!data) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser
};
