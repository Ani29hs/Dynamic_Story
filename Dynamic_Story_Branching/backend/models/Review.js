const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    storyId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    userAvatar: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewText: { type: String, required: true },
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

module.exports = mongoose.model("Review", ReviewSchema);
