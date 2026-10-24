const mongoose = require('mongoose');

const ChoiceSchema = new mongoose.Schema({
    id: { type: String, required: true },
    text: { type: String, required: true },
    targetNodeId: { type: String, required: true }
}, { _id: false });

const NodeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, default: 'Untitled Scene' },
    text: { type: String, default: '' },
    location: { type: String, default: 'Unknown Location' },
    characters: [{ type: String }],
    choices: [ChoiceSchema],
    isEnding: { type: Boolean, default: false },
    endingType: { type: String, default: null },
    endingTeaser: { type: String, default: '' }
}, { _id: false });

const StorySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    author: { type: String, default: 'Anonymous' },
    genre: { type: String, default: 'general' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    description: { type: String, default: '' },
    imageURL: { type: String, default: '' },
    startNodeId: { type: String, default: null },
    nodes: [NodeSchema],
    ratings: [{
        userId: String,
        score: Number,
        createdAt: { type: Date, default: Date.now }
    }],
    views: { type: Number, default: 0 },
    viewedBy: [{ type: String }]
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

module.exports = mongoose.model('Story', StorySchema);
