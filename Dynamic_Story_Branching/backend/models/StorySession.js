const mongoose = require('mongoose');

const StorySessionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    storyId: { type: String, required: true, index: true },
    currentNodeId: { type: String, required: true },
    traversalPath: { type: Array, default: [] },
    visitedNodeIds: { type: Array, default: [] },
    visitedChoiceIds: { type: Array, default: [] },
    freeRetreatUsed: { type: Boolean, default: false },
    xp: { type: Number, default: 0 },
    alreadyClaimed: { type: Boolean, default: false },
    ended: { type: Boolean, default: false },
    endingType: { type: String, default: null }
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

module.exports = mongoose.model('StorySession', StorySessionSchema);
