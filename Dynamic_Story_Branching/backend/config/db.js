const mongoose = require('mongoose');

async function connectDB() {
    const uri = process.env.MONGO_URI;
    if (!uri || uri.includes('<YOUR_DB_PASSWORD>')) {
        console.error('⚠️ [MongoDB Error] Please configure your MONGO_URI in .env');
        return false;
    }

    try {
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB Atlas successfully.');
        return true;
    } catch (err) {
        console.error('❌ [MongoDB Connection Error]:', err.message);
        return false;
    }
}

module.exports = connectDB;
