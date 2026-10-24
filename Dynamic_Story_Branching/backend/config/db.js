const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB Atlas connection string from .env
const url = process.env.MONGO_URI || process.env.MONGO_URL;

// Function to connect to MongoDB Atlas
const connectDB = async () => {
    try {
        if (!url || url.includes("<YOUR_DB_PASSWORD>")) {
            console.log("⚠️ Please set a valid MONGO_URI in backend/.env");
            return;
        }
        await mongoose.connect(url);
        console.log("✅ Connected to MongoDB Atlas successfully");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
    }
};

module.exports = connectDB;
