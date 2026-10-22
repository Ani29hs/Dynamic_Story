const mongoose = require('mongoose');

const ReaderStorySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    authorId: { type: String, default: null },
    authorName: { type: String, default: 'Reader' },
    submittedById: { type: String, default: null },
    submittedBy: { type: String, default: 'Reader' },
    title: { type: String, required: true },
    genre: { type: String, default: 'general' },
    description: { type: String, default: '' },
    submittedAt: { type: String, default: () => new Date().toISOString() },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminComment: { type: String, default: '' },
    adminHidden: { type: Boolean, default: false },
    awardXp: { type: Number, default: 0 }
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

module.exports = mongoose.model('ReaderStory', ReaderStorySchema);
