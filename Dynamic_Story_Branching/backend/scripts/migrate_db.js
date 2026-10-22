require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const User = require('../models/User');
const Story = require('../models/Story');
const StorySession = require('../models/StorySession');
const ReaderStory = require('../models/ReaderStory');

async function migrate() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri || mongoUri.includes('<YOUR_DB_PASSWORD>')) {
        console.error('❌ [Migration Error] Please fill in your real database password in backend/.env before running migration.');
        process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas.');

    // Look for db.json in root or backend
    let dbPath = path.join(__dirname, '..', '..', 'db.json');
    if (!fs.existsSync(dbPath)) {
        dbPath = path.join(__dirname, '..', 'db.json');
    }
    if (!fs.existsSync(dbPath)) {
        console.error('❌ Could not find db.json at:', dbPath);
        process.exit(1);
    }

    console.log('Reading data from:', dbPath);
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    // 1. Migrate Users
    if (Array.isArray(db.Users) && db.Users.length > 0) {
        console.log(`\nImporting ${db.Users.length} Users...`);
        for (const u of db.Users) {
            await User.findOneAndUpdate({ id: String(u.id) }, u, { upsert: true, new: true, setDefaultsOnInsert: true });
        }
        console.log(`✅ ${db.Users.length} Users imported successfully.`);
    }

    // 2. Migrate Stories
    if (Array.isArray(db.Stories) && db.Stories.length > 0) {
        console.log(`\nImporting ${db.Stories.length} Stories...`);
        for (const s of db.Stories) {
            // Ensure nodes is an array
            let storyDoc = { ...s };
            if (!Array.isArray(storyDoc.nodes) && storyDoc.nodes && typeof storyDoc.nodes === 'object') {
                storyDoc.nodes = Object.values(storyDoc.nodes);
            }
            await Story.findOneAndUpdate({ id: String(s.id) }, storyDoc, { upsert: true, new: true, setDefaultsOnInsert: true });
        }
        console.log(`✅ ${db.Stories.length} Stories imported successfully.`);
    }

    // 3. Migrate StorySessions
    if (Array.isArray(db.StorySessions) && db.StorySessions.length > 0) {
        console.log(`\nImporting ${db.StorySessions.length} StorySessions...`);
        for (const ss of db.StorySessions) {
            await StorySession.findOneAndUpdate({ id: String(ss.id) }, ss, { upsert: true, new: true, setDefaultsOnInsert: true });
        }
        console.log(`✅ ${db.StorySessions.length} StorySessions imported successfully.`);
    }

    // 4. Migrate ReaderStories (Pitches)
    if (Array.isArray(db.ReaderStories) && db.ReaderStories.length > 0) {
        console.log(`\nImporting ${db.ReaderStories.length} ReaderStories (Pitches)...`);
        for (const rs of db.ReaderStories) {
            await ReaderStory.findOneAndUpdate({ id: String(rs.id) }, rs, { upsert: true, new: true, setDefaultsOnInsert: true });
        }
        console.log(`✅ ${db.ReaderStories.length} ReaderStories imported successfully.`);
    }

    console.log('\n🎉 ALL DATA MIGRATED TO MONGODB ATLAS SUCCESSFULLY!\n');
    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
