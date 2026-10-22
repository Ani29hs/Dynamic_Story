const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// GET /Users
exports.getUsers = async (req, res) => {
    try {
        const query = {};
        if (req.query.email) query.email = String(req.query.email).toLowerCase().trim();
        if (req.query.role) query.role = req.query.role;
        if (req.query.id) query.id = String(req.query.id);

        const users = await User.find(query);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /Users/:id
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findOne({ id: String(req.params.id) });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /Users
exports.createUser = async (req, res) => {
    try {
        const userData = { ...req.body };
        if (!userData.id) {
            userData.id = crypto.randomUUID();
        }
        if (userData.email) {
            userData.email = String(userData.email).toLowerCase().trim();
        }
        if (userData.password && !userData.password.startsWith('$2a$') && !userData.password.startsWith('$2b$')) {
            userData.password = await bcrypt.hash(userData.password, 10);
        }
        const newUser = await User.create(userData);
        res.status(201).json(newUser);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// PATCH /Users/:id
exports.updateUser = async (req, res) => {
    try {
        const updated = await User.findOneAndUpdate(
            { id: String(req.params.id) },
            { $set: req.body },
            { returnDocument: 'after' }
        );
        if (!updated) return res.status(404).json({ error: 'User not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
