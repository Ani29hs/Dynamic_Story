const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    storyId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    userAvatar: { type: String, default: "" },
    text: { type: String, required: true },
    parentId: { type: String, default: null, index: true }, // null for top-level comments; parent comment id for replies
    likes: [{ type: String }], // Array of user IDs who liked this comment
    isEdited: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

module.exports = mongoose.model("Comment", CommentSchema);
