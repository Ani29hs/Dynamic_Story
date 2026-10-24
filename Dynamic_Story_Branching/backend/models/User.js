const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Reader', 'Admin'], default: 'Reader' },
    xp: { type: Number, default: 0 },
    completedStories: { type: Array, default: [] },
    usedFreeRetreatStories: { type: Array, default: [] },
    pendingToast: { type: mongoose.Schema.Types.Mixed, default: null },
    hasSeenWelcomeToast: { type: Boolean, default: false },
    lastPitchMonth: { type: String, default: null },
    unlockedEndings: { type: mongoose.Schema.Types.Mixed, default: {} },
    avatar: { type: String, default: '🧙‍♂️' },
    title: { type: String, default: 'Story Explorer' },
    bio: { type: String, default: '' },
    seenBadges: { type: Array, default: [] }
}, {
    timestamps: true,
    strict: false,
    toJSON: {
        transform: function (doc, ret) {
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

module.exports = mongoose.model('User', UserSchema);
