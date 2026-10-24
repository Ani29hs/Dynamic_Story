const Review = require("../models/Review");
const Story = require("../models/Story");
const User = require("../models/User");

// 1. GET REVIEWS - Fetch reviews for a story or all reviews for admin
const getReviews = async (req, res) => {
    try {
        const { storyId, rating } = req.query;

        // If no storyId is supplied, return all reviews (admin view)
        if (!storyId) {
            const allReviews = await Review.find({}).sort({ createdAt: -1 });
            return res.status(200).json(allReviews);
        }

        // Fetch all reviews for this story
        const allStoryReviews = await Review.find({ storyId: String(storyId) });

        // Also fetch story to incorporate any existing ratings recorded on the story
        const story = await Story.findOne({ $or: [{ id: String(storyId) }, { _id: (typeof storyId === 'string' && storyId.length === 24) ? storyId : null }] });
        const existingRatings = (story && Array.isArray(story.ratings)) ? story.ratings : [];

        const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalScore = 0;
        const reviewedUserIds = new Set();

        allStoryReviews.forEach(r => {
            const star = Math.max(1, Math.min(5, Math.round(r.rating)));
            breakdown[star] = (breakdown[star] || 0) + 1;
            totalScore += r.rating;
            if (r.userId) reviewedUserIds.add(String(r.userId));
        });

        // Add any story.ratings that don't have a full written review yet
        const additionalRatings = [];
        existingRatings.forEach(sr => {
            const uId = sr.userId ? String(sr.userId) : null;
            if (uId && reviewedUserIds.has(uId)) return; // already counted from review

            const rawVal = typeof sr === 'number' ? sr : (sr.score || sr.stars || 5);
            const score = Math.max(1, Math.min(5, Math.round(rawVal)));
            breakdown[score] = (breakdown[score] || 0) + 1;
            totalScore += score;
            if (uId) reviewedUserIds.add(uId);

            additionalRatings.push({
                id: `sr_${sr._id || Math.random().toString(36).substring(2, 7)}`,
                storyId: String(storyId),
                userId: uId || "reader",
                username: "Verified Reader",
                userAvatar: "",
                rating: score,
                reviewText: `Rated this story ${score} stars.`,
                createdAt: sr.createdAt || new Date(),
                isRatingOnly: true
            });
        });

        const total = allStoryReviews.length + additionalRatings.length;
        const average = total > 0 ? (totalScore / total).toFixed(1) : "0.0";

        const percentages = {
            1: total > 0 ? Math.round((breakdown[1] / total) * 100) : 0,
            2: total > 0 ? Math.round((breakdown[2] / total) * 100) : 0,
            3: total > 0 ? Math.round((breakdown[3] / total) * 100) : 0,
            4: total > 0 ? Math.round((breakdown[4] / total) * 100) : 0,
            5: total > 0 ? Math.round((breakdown[5] / total) * 100) : 0
        };

        // Filter by star rating if requested
        const query = { storyId: String(storyId) };
        if (rating && !isNaN(rating)) {
            query.rating = Number(rating);
        }

        let filteredReviews = await Review.find(query).sort({ createdAt: -1 });

        // Also include matching additional ratings in the list
        if (rating && !isNaN(rating)) {
            const matchingAdditional = additionalRatings.filter(a => a.rating === Number(rating));
            filteredReviews = [...filteredReviews, ...matchingAdditional];
        } else {
            filteredReviews = [...filteredReviews, ...additionalRatings];
        }

        // Lookup latest avatars and display names for all review authors
        const userIds = [...new Set(filteredReviews.map(r => r.userId).filter(Boolean))];
        const users = await User.find({ id: { $in: userIds } }, 'id name avatar');
        const userMap = {};
        users.forEach(u => {
            if (u && u.id) userMap[String(u.id)] = u;
        });

        const enrichedReviews = filteredReviews.map(r => {
            const obj = typeof r.toJSON === "function" ? r.toJSON() : (typeof r.toObject === "function" ? r.toObject() : { ...r });
            if (obj.userId && userMap[String(obj.userId)]) {
                const u = userMap[String(obj.userId)];
                if (u.avatar) obj.userAvatar = u.avatar;
                if (u.name) obj.username = u.name;
            }
            return obj;
        });

        res.status(200).json({
            total,
            average,
            breakdown,
            percentages,
            reviews: enrichedReviews
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. CREATE OR UPDATE REVIEW - Reader leaves a star review with feedback
const createOrUpdateReview = async (req, res) => {
    try {
        const { storyId, rating, reviewText } = req.body;

        if (!storyId) {
            return res.status(400).json({ error: "Story ID is required" });
        }
        const numericRating = Number(rating);
        if (!numericRating || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
        }
        if (!reviewText || !reviewText.trim()) {
            return res.status(400).json({ error: "Review text is required" });
        }

        const userId = req.user ? String(req.user.id) : (req.body.userId || "anonymous");
        let username = req.user ? (req.user.name || req.user.username) : (req.body.username || "Reader");
        let userAvatar = req.body.userAvatar || (req.user && req.user.avatar) || "";

        // Fallback to User model in database if avatar is not yet set
        if ((!userAvatar || userAvatar === "") && userId && userId !== "anonymous") {
            const userDoc = await User.findOne({ id: userId });
            if (userDoc) {
                if (userDoc.avatar) userAvatar = userDoc.avatar;
                if (userDoc.name) username = userDoc.name;
            }
        }

        // Find existing review by this user on this story
        let review = await Review.findOne({ storyId: String(storyId), userId });

        if (review) {
            review.rating = numericRating;
            review.reviewText = reviewText.trim();
            review.username = username;
            review.userAvatar = userAvatar;
            review.updatedAt = new Date();
            await review.save();
        } else {
            const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            review = await Review.create({
                id: reviewId,
                storyId: String(storyId),
                userId,
                username,
                userAvatar,
                rating: numericRating,
                reviewText: reviewText.trim()
            });
        }

        // Keep Story.ratings[] in sync so library badges reflect the new rating
        const story = await Story.findOne({ $or: [{ id: String(storyId) }, { _id: (typeof storyId === 'string' && storyId.length === 24) ? storyId : null }] });
        if (story) {
            if (!Array.isArray(story.ratings)) story.ratings = [];
            const existingIdx = story.ratings.findIndex(r => r && String(r.userId) === String(userId));
            if (existingIdx !== -1) {
                story.ratings[existingIdx].score = numericRating;
                story.ratings[existingIdx].stars = numericRating;
            } else {
                story.ratings.push({
                    userId,
                    score: numericRating,
                    stars: numericRating,
                    createdAt: new Date()
                });
            }
            await story.save();
        }

        res.status(200).json(review);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. DELETE REVIEW - Remove a review (author or admin)
const deleteReview = async (req, res) => {
    try {
        const id = req.params.id;
        let review = await Review.findOne({ $or: [{ id: String(id) }, { _id: (typeof id === 'string' && id.length === 24) ? id : null }] });

        // Check ownership or admin rights (case-insensitive)
        const currentUserId = req.user ? String(req.user.id) : null;
        const isAdmin = req.user && (String(req.user.role).toLowerCase() === "admin");

        if (!review) {
            // Check if it's a legacy rating entry in Story.ratings
            const cleanId = id.replace(/^sr_/, '');
            const story = await Story.findOne({ "ratings._id": cleanId });
            if (story && (isAdmin || story.ratings.some(r => String(r._id) === cleanId && String(r.userId) === currentUserId))) {
                story.ratings = story.ratings.filter(r => String(r._id) !== cleanId);
                await story.save();
                return res.status(200).json({ message: "Rating deleted successfully", deletedId: id });
            }
            return res.status(404).json({ error: "Review not found" });
        }

        if (!isAdmin && currentUserId !== String(review.userId)) {
            return res.status(403).json({ error: "You can only delete your own reviews" });
        }

        const storyId = review.storyId;
        const reviewerUserId = review.userId;

        await Review.findOneAndDelete({ $or: [{ id: review.id }, { _id: review._id }] });

        // Remove from Story.ratings[] as well
        const story = await Story.findOne({ $or: [{ id: String(storyId) }, { _id: (typeof storyId === 'string' && storyId.length === 24) ? storyId : null }] });
        if (story && Array.isArray(story.ratings)) {
            story.ratings = story.ratings.filter(r => r && String(r.userId) !== String(reviewerUserId));
            await story.save();
        }

        res.status(200).json({ message: "Review deleted successfully", deletedId: id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getReviews,
    createOrUpdateReview,
    deleteReview
};
