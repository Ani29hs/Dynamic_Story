const Comment = require("../models/Comment");
const User = require("../models/User");

// 1. GET COMMENTS - Fetch comments for a story (hierarchical with replies) or all for admin
const getComments = async (req, res) => {
    try {
        const { storyId } = req.query;

        // Admin: fetch all comments flat
        if (!storyId) {
            const allComments = await Comment.find({}).sort({ createdAt: -1 });
            return res.status(200).json(allComments);
        }

        // Fetch all comments and replies for this story
        const comments = await Comment.find({ storyId: String(storyId) }).sort({ createdAt: 1 });

        // Lookup latest avatars and display names for all comment authors
        const userIds = [...new Set(comments.map(c => c.userId).filter(Boolean))];
        const users = await User.find({ id: { $in: userIds } }, 'id name avatar');
        const userMap = {};
        users.forEach(u => {
            if (u && u.id) userMap[String(u.id)] = u;
        });

        // Build threaded hierarchy: root comments with replies nested
        const rootComments = [];
        const repliesMap = {};

        comments.forEach(c => {
            const obj = typeof c.toJSON === "function" ? c.toJSON() : c.toObject();
            if (obj.userId && userMap[String(obj.userId)]) {
                const u = userMap[String(obj.userId)];
                if (u.avatar) obj.userAvatar = u.avatar;
                if (u.name) obj.username = u.name;
            }
            obj.replies = [];
            if (!obj.parentId) {
                rootComments.push(obj);
            } else {
                if (!repliesMap[obj.parentId]) {
                    repliesMap[obj.parentId] = [];
                }
                repliesMap[obj.parentId].push(obj);
            }
        });

        // Attach replies to their parent comments
        rootComments.forEach(root => {
            root.replies = repliesMap[root.id] || [];
        });

        // Most recent root comments first
        rootComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({
            total: comments.length,
            comments: rootComments
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. CREATE COMMENT OR REPLY - Post a comment or respond to an existing one
const createComment = async (req, res) => {
    try {
        const { storyId, text, parentId } = req.body;

        if (!storyId) {
            return res.status(400).json({ error: "Story ID is required" });
        }
        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Comment text cannot be empty" });
        }

        const userId = req.user ? String(req.user.id) : (req.body.userId || "anonymous");
        let username = req.user ? (req.user.name || req.user.username) : (req.body.username || "Reader");
        let userAvatar = req.body.userAvatar || (req.user && req.user.avatar) || "";

        // Lookup latest avatar in User collection if not in body
        if ((!userAvatar || userAvatar === "") && userId && userId !== "anonymous") {
            const userDoc = await User.findOne({ id: userId });
            if (userDoc) {
                if (userDoc.avatar) userAvatar = userDoc.avatar;
                if (userDoc.name) username = userDoc.name;
            }
        }

        const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const newComment = await Comment.create({
            id: commentId,
            storyId: String(storyId),
            userId,
            username,
            userAvatar,
            text: text.trim(),
            parentId: parentId ? String(parentId) : null,
            likes: [],
            isEdited: false
        });

        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. LIKE COMMENT - Toggle like on a comment or reply
const likeComment = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.user ? String(req.user.id) : null;

        if (!userId) {
            return res.status(401).json({ error: "Authentication required to like comments" });
        }

        const comment = await Comment.findOne({ id: String(id) });
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        if (!Array.isArray(comment.likes)) {
            comment.likes = [];
        }

        const index = comment.likes.indexOf(userId);
        let isLiked = false;

        if (index > -1) {
            // Already liked -> unlike
            comment.likes.splice(index, 1);
            isLiked = false;
        } else {
            // Not liked -> like
            comment.likes.push(userId);
            isLiked = true;
        }

        await comment.save();

        res.status(200).json({
            id: comment.id,
            likesCount: comment.likes.length,
            isLiked
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. UPDATE COMMENT - Edit comment text
const updateComment = async (req, res) => {
    try {
        const id = req.params.id;
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Comment text cannot be empty" });
        }

        const comment = await Comment.findOne({ id: String(id) });
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        const currentUserId = req.user ? String(req.user.id) : null;
        const isAdmin = req.user && req.user.role === "admin";

        if (!isAdmin && currentUserId !== String(comment.userId)) {
            return res.status(403).json({ error: "You can only edit your own comments" });
        }

        comment.text = text.trim();
        comment.isEdited = true;
        comment.updatedAt = new Date();
        await comment.save();

        res.status(200).json(comment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. DELETE COMMENT - Delete comment and any replies
const deleteComment = async (req, res) => {
    try {
        const id = req.params.id;
        const comment = await Comment.findOne({ id: String(id) });

        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        const currentUserId = req.user ? String(req.user.id) : null;
        const isAdmin = req.user && (String(req.user.role).toLowerCase() === "admin");

        if (!isAdmin && currentUserId !== String(comment.userId)) {
            return res.status(403).json({ error: "You can only delete your own comments" });
        }

        // Delete parent comment and cascade delete its replies
        await Comment.deleteMany({
            $or: [
                { id: String(id) },
                { parentId: String(id) }
            ]
        });

        res.status(200).json({ message: "Comment deleted successfully", deletedId: id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getComments,
    createComment,
    likeComment,
    updateComment,
    deleteComment
};
