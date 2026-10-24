const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Import Routes
const authRoutes = require("./Routes/authRoutes");
const storyRoutes = require("./Routes/storyRoutes");
const sessionRoutes = require("./Routes/sessionRoutes");
const pitchRoutes = require("./Routes/pitchRoutes");
const userRoutes = require("./Routes/userRoutes");

const app = express();

// Global Middlewares
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health Check Endpoints
app.get("/", (req, res) => {
    res.json({
        message: "Dynamic Story Engine API",
        status: "online",
        database: "MongoDB Atlas"
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "online",
        database: "MongoDB Atlas",
        timestamp: new Date().toISOString()
    });
});

// Mount API Routes
app.use("/", authRoutes);                 // /register, /login, /profile
app.use("/Stories", storyRoutes);         // /Stories, /Stories/:id
app.use("/StorySessions", sessionRoutes); // /StorySessions, /StorySessions/:id
app.use("/ReaderStories", pitchRoutes);   // /ReaderStories, /ReaderStories/:id
app.use("/Users", userRoutes);            // /Users, /Users/:id

// Server Port & Startup
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
};

startServer();