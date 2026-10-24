/**
 * Dynamic Story Engine — Reviews & YouTube-Style Comments Module
 * Provides:
 * - Star Rating Breakdown Graph with clickable star filters (5★, 4★, 3★, 2★, 1★)
 * - Review submission, edit, and delete
 * - YouTube-style comments with likes, inline replies, inline editing, and nested threads
 * - Story view tracking and display
 */

const CommunityHub = (() => {
    // In-memory state per active instance
    const state = {
        storyId: null,
        activeTab: 'reviews', // 'reviews' or 'comments'
        ratingFilter: null,   // null = all, or 1..5
        selectedStars: 5,
        reviewsData: null,
        commentsData: null,
        storyViews: 0,
        expandedReplies: new Set(),
        containerId: null
    };

    const ratingDescriptions = {
        1: "1★ Needs Work",
        2: "2★ Fair Experience",
        3: "3★ Good Adventure",
        4: "4★ Great Storytelling!",
        5: "5★ Masterpiece!"
    };

    function getInitials(name) {
        if (!name) return "R";
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function renderUserAvatar(name, avatar) {
        if (avatar && (avatar.startsWith("data:image/") || avatar.startsWith("http://") || avatar.startsWith("https://") || avatar.startsWith("/"))) {
            return `<div class="user-avatar-badge" style="padding: 0; overflow: hidden; background: #0f172a;"><img src="${avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.onerror=null; this.parentElement.innerText='${getInitials(name)}';"></div>`;
        } else if (avatar && avatar.length <= 4) {
            return `<div class="user-avatar-badge" style="font-size: 19px; line-height: 1; display: flex; align-items: center; justify-content: center;">${avatar}</div>`;
        } else if (avatar && avatar.length > 4) {
            return `<div class="user-avatar-badge" style="padding: 0; overflow: hidden; background: #0f172a;"><img src="${avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.onerror=null; this.parentElement.innerText='${getInitials(name)}';"></div>`;
        }
        return `<div class="user-avatar-badge">${getInitials(name)}</div>`;
    }

    function timeAgo(dateString) {
        if (!dateString) return "just now";
        const now = new Date();
        const past = new Date(dateString);
        const elapsedSec = Math.floor((now - past) / 1000);

        if (elapsedSec < 60) return "just now";
        const mins = Math.floor(elapsedSec / 60);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo ago`;
        return `${Math.floor(months / 12)}y ago`;
    }

    function getCurrentUser() {
        try {
            if (window.user && (window.user.id || window.user._id || window.user.email)) {
                return window.user;
            }
            const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && (parsed.id || parsed._id || parsed.email)) {
                    return parsed;
                }
            }
            const token = localStorage.getItem("token") || (window.Auth && typeof window.Auth.getToken === "function" && window.Auth.getToken());
            if (token && typeof token === "string" && token.includes(".")) {
                const parts = token.split(".");
                if (parts.length >= 2) {
                    const base64Url = parts[1];
                    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
                    const jsonPayload = decodeURIComponent(atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
                    const payload = JSON.parse(jsonPayload);
                    if (payload && (payload.id || payload._id || payload.email)) {
                        const restored = {
                            id: payload.id || payload._id,
                            name: payload.name || (payload.email ? payload.email.split("@")[0] : "Reader"),
                            email: payload.email,
                            role: payload.role || "Reader"
                        };
                        localStorage.setItem("user", JSON.stringify(restored));
                        window.user = restored;
                        return restored;
                    }
                }
            }
            return null;
        } catch (e) {
            console.warn("CommunityHub.getCurrentUser notice:", e);
            return null;
        }
    }

    function getAuthHeaders() {
        const headers = { "Content-Type": "application/json" };
        const token = localStorage.getItem("token") || (window.Auth && typeof window.Auth.getToken === "function" && window.Auth.getToken());
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    }

    // Initialize Hub into target DOM element
    async function init(containerId, storyId, initialViews = 0) {
        state.containerId = containerId;
        state.storyId = storyId;
        state.storyViews = initialViews || 0;
        state.ratingFilter = null;
        state.activeTab = 'reviews';

        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="community-hub-container">
                <div class="community-hub-header">
                    <div class="community-hub-tabs">
                        <button type="button" class="community-tab-btn active" id="tabBtnReviews_${storyId}" onclick="CommunityHub.switchTab('reviews')">
                            ⭐ Reviews & Ratings (<span id="headerReviewCount_${storyId}">0</span>)
                        </button>
                        <button type="button" class="community-tab-btn" id="tabBtnComments_${storyId}" onclick="CommunityHub.switchTab('comments')">
                            💬 Community Comments (<span id="headerCommentCount_${storyId}">0</span>)
                        </button>
                    </div>
                </div>

                <div class="community-tab-pane" id="reviewsPane_${storyId}">
                    <div style="text-align: center; padding: 20px; font-weight: 700; color: #64748b;">Loading community reviews...</div>
                </div>

                <div class="community-tab-pane" id="commentsPane_${storyId}" style="display: none;">
                    <div style="text-align: center; padding: 20px; font-weight: 700; color: #64748b;">Loading discussion comments...</div>
                </div>
            </div>
        `;

        await Promise.all([
            loadReviews(),
            loadComments()
        ]);
    }

    function switchTab(tab) {
        state.activeTab = tab;
        const reviewsPane = document.getElementById(`reviewsPane_${state.storyId}`);
        const commentsPane = document.getElementById(`commentsPane_${state.storyId}`);
        const tabBtnRev = document.getElementById(`tabBtnReviews_${state.storyId}`);
        const tabBtnCom = document.getElementById(`tabBtnComments_${state.storyId}`);

        if (tab === 'reviews') {
            if (reviewsPane) reviewsPane.style.display = 'block';
            if (commentsPane) commentsPane.style.display = 'none';
            if (tabBtnRev) tabBtnRev.classList.add('active');
            if (tabBtnCom) tabBtnCom.classList.remove('active');
        } else {
            if (reviewsPane) reviewsPane.style.display = 'none';
            if (commentsPane) commentsPane.style.display = 'block';
            if (tabBtnRev) tabBtnRev.classList.remove('active');
            if (tabBtnCom) tabBtnCom.classList.add('active');
        }
    }

    // ── REVIEWS LOGIC ──────────────────────────────────────────────
    async function loadReviews(filterStar = state.ratingFilter, isRetry = false) {
        state.ratingFilter = filterStar;
        const pane = document.getElementById(`reviewsPane_${state.storyId}`);
        if (!pane) return;

        try {
            let url = `${API_BASE}/Reviews?storyId=${state.storyId}`;
            if (filterStar) url += `&rating=${filterStar}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to load reviews");
            const data = await res.json();
            state.reviewsData = data;

            // Update tab badge count
            const countEl = document.getElementById(`headerReviewCount_${state.storyId}`);
            if (countEl) countEl.innerText = data.total || 0;

            renderReviewsPane(data);
        } catch (err) {
            if (!isRetry) {
                setTimeout(() => loadReviews(filterStar, true), 600);
                return;
            }
            pane.innerHTML = `
                <div class="community-empty-box">
                    <div>Unable to load reviews: ${err.message}</div>
                    <button type="button" class="primary-btn" style="width: auto; padding: 6px 16px; font-size: 12px; margin-top: 10px;" onclick="CommunityHub.loadReviews()">🔄 Retry Loading</button>
                </div>
            `;
        }
    }

    function renderReviewsPane(data) {
        const pane = document.getElementById(`reviewsPane_${state.storyId}`);
        if (!pane) return;

        const currentUser = getCurrentUser();
        const breakdown = data.breakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const pcts = data.percentages || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const total = data.total || 0;
        const average = data.average || "0.0";
        const reviews = data.reviews || [];

        // Check if current user already left a review
        let userReview = null;
        if (currentUser) {
            userReview = reviews.find(r => String(r.userId) === String(currentUser.id));
        }

        let breakdownHtml = `
            <div class="rating-breakdown-card">
                <div class="rating-overview-box">
                    <div class="rating-large-number">${average}</div>
                    <div class="rating-stars-visual">
                        ${[1, 2, 3, 4, 5].map(i => i <= Math.round(Number(average)) ? '⭐' : '☆').join('')}
                    </div>
                    <div class="rating-count-subtitle">Based on <strong>${total}</strong> verified ${total === 1 ? 'review' : 'reviews'}</div>
                </div>

                <div class="rating-bars-list">
                    ${[5, 4, 3, 2, 1].map(star => {
                        const count = breakdown[star] || 0;
                        const pct = pcts[star] || 0;
                        const isActive = state.ratingFilter === star;
                        return `
                            <div class="rating-bar-row ${isActive ? 'active-filter' : ''}" onclick="CommunityHub.filterReviews(${star})" title="Filter by ${star} star reviews">
                                <div class="rating-bar-label">${star} ⭐</div>
                                <div class="rating-bar-track">
                                    <div class="rating-bar-fill" style="width: ${pct}%;"></div>
                                </div>
                                <div class="rating-bar-count">${count} (${pct}%)</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        let filterBannerHtml = state.ratingFilter ? `
            <div class="filter-active-banner">
                <span>Filtering by <strong>${state.ratingFilter} Star</strong> reviews (${reviews.length} shown)</span>
                <button type="button" class="filter-reset-btn" onclick="CommunityHub.filterReviews(null)">✕ Show All</button>
            </div>
        ` : ``;

        // Write / Edit review form
        let writeFormHtml = ``;
        if (currentUser) {
            const initialStars = userReview ? userReview.rating : state.selectedStars;
            const initialText = userReview ? userReview.reviewText : "";
            const isEditing = !!userReview;

            writeFormHtml = `
                <div class="write-review-card">
                    <div class="write-review-title">
                        <span>${isEditing ? '✏️ Update Your Story Review' : '✍️ Write a Review for Other Readers'}</span>
                    </div>

                    <div class="star-picker-container">
                        <div class="star-picker-icons" id="starPicker_${state.storyId}">
                            ${[1, 2, 3, 4, 5].map(star => `
                                <span class="star-pick-btn ${star <= initialStars ? 'active' : ''}"
                                      data-star="${star}"
                                      onclick="CommunityHub.setReviewStars(${star})"
                                      onmouseover="CommunityHub.previewStars(${star})"
                                      onmouseout="CommunityHub.resetPreviewStars()">⭐</span>
                            `).join('')}
                        </div>
                        <span class="star-rating-hint" id="starRatingHint_${state.storyId}">${ratingDescriptions[initialStars]}</span>
                    </div>

                    <textarea id="reviewTextInput_${state.storyId}" class="review-textarea" placeholder="Share your experience with the choices, endings, lore, and characters...">${initialText}</textarea>

                    <div class="review-submit-row">
                        ${isEditing ? `
                            <button type="button" class="comment-cancel-btn" onclick="CommunityHub.deleteReview('${userReview.id}')" style="color: #dc2626;">🗑️ Delete Review</button>
                        ` : ''}
                        <button type="button" class="primary-btn" style="width: auto; padding: 10px 24px; font-size: 13.5px;" onclick="CommunityHub.submitReview()">
                            ${isEditing ? '💾 Update Review' : '🚀 Post Review'}
                        </button>
                    </div>
                </div>
            `;
        } else {
            writeFormHtml = `
                <div style="background: #f8fafc; border: 2px dashed #000; border-radius: 16px; padding: 16px 20px; text-align: center; margin-bottom: 20px;">
                    <span style="font-weight: 800; font-size: 14px;">Want to share your review? </span>
                    <a href="/pages/auth/login.html" style="font-weight: 900; color: #5c4ade; text-decoration: underline;">Sign In to Review this Story</a>
                </div>
            `;
        }

        // Reviews list
        let reviewsListHtml = ``;
        if (reviews.length === 0) {
            reviewsListHtml = `
                <div class="community-empty-box">
                    ${state.ratingFilter ? `No ${state.ratingFilter}-star reviews found. Click 'Show All' above.` : 'No reviews written yet. Be the first reader to review this story!'}
                </div>
            `;
        } else {
            reviewsListHtml = `
                <div class="reviews-list-container">
                    ${reviews.map(rev => {
                        const isOwner = currentUser && String(currentUser.id) === String(rev.userId);
                        const isAdmin = currentUser && currentUser.role === 'admin';
                        const starPills = '⭐'.repeat(rev.rating);
                        const effectiveAvatar = (isOwner && currentUser.avatar) ? currentUser.avatar : (rev.userAvatar || "");

                        return `
                            <div class="review-item-card" id="reviewCard_${rev.id}">
                                <div class="review-item-header">
                                    <div class="reviewer-profile">
                                        ${renderUserAvatar(rev.username, effectiveAvatar)}
                                        <div>
                                            <div class="reviewer-name">${rev.username}</div>
                                            <div class="review-date">${timeAgo(rev.createdAt || rev.updatedAt)}</div>
                                        </div>
                                    </div>
                                    <div class="review-stars-pill">${starPills} ${rev.rating}.0</div>
                                </div>
                                <div class="review-text-content" id="reviewContent_${rev.id}">${escapeHtml(rev.reviewText)}</div>
                                ${(isOwner || isAdmin) ? `
                                    <div class="review-actions-row">
                                        ${isOwner ? `<button type="button" class="review-action-btn" onclick="CommunityHub.openInlineReviewEdit('${rev.id}', ${rev.rating}, \`${escapeJsString(rev.reviewText)}\`)">✏️ Edit</button>` : ''}
                                        <button type="button" class="review-action-btn delete" onclick="CommunityHub.deleteReview('${rev.id}')">🗑️ Delete</button>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        pane.innerHTML = breakdownHtml + filterBannerHtml + writeFormHtml + reviewsListHtml;
    }

    function setReviewStars(star) {
        state.selectedStars = star;
        const picker = document.getElementById(`starPicker_${state.storyId}`);
        const hint = document.getElementById(`starRatingHint_${state.storyId}`);
        if (hint) hint.innerText = ratingDescriptions[star];

        if (picker) {
            const btns = picker.querySelectorAll('.star-pick-btn');
            btns.forEach((btn, index) => {
                if (index < star) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        }
    }

    function previewStars(star) {
        const picker = document.getElementById(`starPicker_${state.storyId}`);
        if (!picker) return;
        const btns = picker.querySelectorAll('.star-pick-btn');
        btns.forEach((btn, index) => {
            if (index < star) btn.classList.add('hovered');
            else btn.classList.remove('hovered');
        });
        const hint = document.getElementById(`starRatingHint_${state.storyId}`);
        if (hint) hint.innerText = ratingDescriptions[star];
    }

    function resetPreviewStars() {
        const picker = document.getElementById(`starPicker_${state.storyId}`);
        if (!picker) return;
        const btns = picker.querySelectorAll('.star-pick-btn');
        btns.forEach(btn => btn.classList.remove('hovered'));
        const hint = document.getElementById(`starRatingHint_${state.storyId}`);
        if (hint) hint.innerText = ratingDescriptions[state.selectedStars];
    }

    function filterReviews(star) {
        loadReviews(star);
    }

    async function submitReview() {
        const user = getCurrentUser();
        if (!user) {
            alert("Please sign in to post a review!");
            return;
        }

        const input = document.getElementById(`reviewTextInput_${state.storyId}`);
        if (!input || !input.value.trim()) {
            alert("Please write a few words about the story!");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/Reviews`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    storyId: state.storyId,
                    rating: state.selectedStars,
                    reviewText: input.value.trim(),
                    userId: user.id,
                    username: user.name || "Reader",
                    userAvatar: user.avatar || ""
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to post review");
            }

            // Reload reviews to show the new entry and updated breakdown graph
            await loadReviews();
            if (window.checkUserBadgeMilestones) {
                window.checkUserBadgeMilestones(user, {}, true);
            }
        } catch (err) {
            alert(err.message);
        }
    }

    function openInlineReviewEdit(reviewId, initialRating, currentText) {
        const card = document.getElementById(`reviewCard_${reviewId}`);
        if (!card) return;

        let selectedEditRating = initialRating || 5;

        card.innerHTML = `
            <div class="inline-review-edit-box" style="padding: 16px; background: #ffffff; border: 3px solid #000; border-radius: 14px; box-shadow: 4px 4px 0 #000; margin-top: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div style="font-size: 14px; font-weight: 900; color: #0f172a;">✏️ Edit Your Review</div>
                    <div class="star-picker-icons" id="inlineStarPicker_${reviewId}" style="display: flex; gap: 6px; cursor: pointer;">
                        ${[1, 2, 3, 4, 5].map(s => `
                            <span class="inline-star-btn" id="inlineStar_${reviewId}_${s}" 
                                  onclick="CommunityHub.setInlineReviewStars('${reviewId}', ${s})" 
                                  style="font-size: 22px; cursor: pointer; user-select: none; filter: ${s <= selectedEditRating ? 'none' : 'grayscale(1) opacity(0.28)'}; transition: transform 0.15s ease;">⭐</span>
                        `).join('')}
                    </div>
                </div>
                <input type="hidden" id="inlineReviewRating_${reviewId}" value="${selectedEditRating}">
                <textarea id="inlineReviewText_${reviewId}" class="review-textarea" placeholder="Update your thoughts..." style="width: 100%; min-height: 80px; padding: 12px; font-family: inherit; font-size: 13.5px; font-weight: 600; border: 2.5px solid #000; border-radius: 10px; box-sizing: border-box; resize: vertical;">${escapeHtml(currentText)}</textarea>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px;">
                    <button type="button" class="comment-cancel-btn" onclick="CommunityHub.loadReviews()">Cancel</button>
                    <button type="button" class="primary-btn" style="width: auto; padding: 9px 20px; font-size: 13px;" onclick="CommunityHub.saveInlineReview('${reviewId}')">💾 Save Review</button>
                </div>
            </div>
        `;

        const textarea = document.getElementById(`inlineReviewText_${reviewId}`);
        if (textarea) textarea.focus();
    }

    function setInlineReviewStars(reviewId, stars) {
        const input = document.getElementById(`inlineReviewRating_${reviewId}`);
        if (input) input.value = stars;
        for (let s = 1; s <= 5; s++) {
            const starEl = document.getElementById(`inlineStar_${reviewId}_${s}`);
            if (starEl) {
                starEl.style.filter = s <= stars ? 'none' : 'grayscale(1) opacity(0.28)';
            }
        }
    }

    async function saveInlineReview(reviewId) {
        const user = getCurrentUser();
        if (!user) {
            alert("Please sign in to update your review!");
            return;
        }

        const input = document.getElementById(`inlineReviewText_${reviewId}`);
        const ratingInput = document.getElementById(`inlineReviewRating_${reviewId}`);
        const text = input ? input.value.trim() : "";
        const rating = ratingInput ? Number(ratingInput.value) : 5;

        if (!text) {
            alert("Please enter review text!");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/Reviews`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    storyId: state.storyId,
                    rating: rating,
                    reviewText: text,
                    userId: user.id,
                    username: user.name || "Reader",
                    userAvatar: user.avatar || ""
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to update review");
            }

            await loadReviews();
            if (window.checkUserBadgeMilestones) {
                window.checkUserBadgeMilestones(user, {}, true);
            }
        } catch (err) {
            alert(err.message);
        }
    }

    async function deleteReview(reviewId) {
        if (!confirm("Are you sure you want to delete this review?")) return;
        try {
            const res = await fetch(`${API_BASE}/Reviews/${reviewId}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete review");
            await loadReviews();
        } catch (err) {
            alert(err.message);
        }
    }

    // ── COMMENTS LOGIC (YOUTUBE-STYLE) ─────────────────────────────
    async function loadComments(isRetry = false) {
        const pane = document.getElementById(`commentsPane_${state.storyId}`);
        if (!pane) return;

        try {
            const res = await fetch(`${API_BASE}/Comments?storyId=${state.storyId}`);
            if (!res.ok) throw new Error("Failed to load comments");
            const data = await res.json();
            state.commentsData = data;

            // Update tab badge count
            const countEl = document.getElementById(`headerCommentCount_${state.storyId}`);
            if (countEl) countEl.innerText = data.total || 0;

            renderCommentsPane(data);
        } catch (err) {
            if (!isRetry) {
                setTimeout(() => loadComments(true), 600);
                return;
            }
            pane.innerHTML = `<div class="community-empty-box">Unable to load discussion: ${err.message}</div>`;
        }
    }

    function renderCommentsPane(data) {
        const pane = document.getElementById(`commentsPane_${state.storyId}`);
        if (!pane) return;

        const currentUser = getCurrentUser();
        const comments = data.comments || [];
        const total = data.total || 0;

        // Root comment input box (YouTube style)
        let newCommentBoxHtml = ``;
        if (currentUser) {
            newCommentBoxHtml = `
                <div class="new-comment-box">
                    ${renderUserAvatar(currentUser.name || currentUser.username, currentUser.avatar)}
                    <div class="new-comment-input-wrap">
                        <textarea id="rootCommentInput_${state.storyId}" class="comment-input-field" placeholder="Add a public comment..." rows="1" oninput="CommunityHub.handleCommentInput(this, 'rootCommentActions_${state.storyId}', 'rootCommentBtn_${state.storyId}')"></textarea>
                        <div class="comment-input-actions" id="rootCommentActions_${state.storyId}" style="display: none;">
                            <button type="button" class="comment-cancel-btn" onclick="CommunityHub.cancelCommentInput('rootCommentInput_${state.storyId}', 'rootCommentActions_${state.storyId}')">Cancel</button>
                            <button type="button" class="comment-submit-btn" id="rootCommentBtn_${state.storyId}" disabled onclick="CommunityHub.submitComment(null, 'rootCommentInput_${state.storyId}')">Comment</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            newCommentBoxHtml = `
                <div style="background: #f8fafc; border: 2px dashed #000; border-radius: 16px; padding: 14px 20px; text-align: center; margin-bottom: 20px;">
                    <span style="font-weight: 800; font-size: 14px;">Join the community discussion: </span>
                    <a href="/pages/auth/login.html" style="font-weight: 900; color: #5c4ade; text-decoration: underline;">Sign In to Comment</a>
                </div>
            `;
        }

        // Comments list
        let commentsListHtml = ``;
        if (comments.length === 0) {
            commentsListHtml = `
                <div class="community-empty-box">
                    No comments yet on this story. Start the discussion above!
                </div>
            `;
        } else {
            commentsListHtml = `
                <div class="comments-section-container">
                    ${comments.map(c => renderCommentThreadItem(c, currentUser)).join('')}
                </div>
            `;
        }

        pane.innerHTML = `
            <div class="comments-header-row">
                <h3 class="comments-count-title">💬 ${total} ${total === 1 ? 'Comment' : 'Comments'}</h3>
            </div>
            ${newCommentBoxHtml}
            ${commentsListHtml}
        `;
    }

    function renderCommentThreadItem(c, currentUser) {
        const isOwner = currentUser && String(currentUser.id) === String(c.userId);
        const isAdmin = currentUser && currentUser.role === 'admin';
        const isLiked = currentUser && Array.isArray(c.likes) && c.likes.includes(String(currentUser.id));
        const likeCount = Array.isArray(c.likes) ? c.likes.length : 0;
        const replies = c.replies || [];
        const isExpanded = state.expandedReplies.has(c.id);
        const effectiveAvatar = (isOwner && currentUser.avatar) ? currentUser.avatar : (c.userAvatar || "");

        return `
            <div class="comment-thread-item" id="commentItem_${c.id}">
                ${renderUserAvatar(c.username, effectiveAvatar)}
                <div class="comment-thread-body">
                    <div class="comment-author-line">
                        <span class="comment-author-name">@${c.username}</span>
                        <span class="comment-time-ago">${timeAgo(c.createdAt)}</span>
                        ${c.isEdited ? `<span class="comment-edited-tag">(edited)</span>` : ''}
                    </div>

                    <!-- Text display & inline edit container -->
                    <div id="commentTextWrapper_${c.id}">
                        <div class="comment-text-display">${escapeHtml(c.text)}</div>
                    </div>

                    <!-- Action Bar (Like, Reply, Edit, Delete) -->
                    <div class="comment-actions-bar">
                        <button type="button" class="comment-action-pill ${isLiked ? 'liked' : ''}" onclick="CommunityHub.toggleLike('${c.id}')" title="Like comment">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                            </svg>
                            <span>${likeCount > 0 ? likeCount : ''}</span>
                        </button>

                        <button type="button" class="comment-action-pill" onclick="CommunityHub.toggleReplyInput('${c.id}')">
                            💬 Reply
                        </button>

                        ${isOwner ? `
                            <button type="button" class="comment-action-pill" onclick="CommunityHub.openInlineEdit('${c.id}', \`${escapeJsString(c.text)}\`)">
                                ✏️ Edit
                            </button>
                        ` : ''}

                        ${(isOwner || isAdmin) ? `
                            <button type="button" class="comment-action-pill delete" onclick="CommunityHub.deleteComment('${c.id}')">
                                🗑️ Delete
                            </button>
                        ` : ''}
                    </div>

                    <!-- Inline Reply Box (Hidden by default) -->
                    <div id="replyBox_${c.id}" class="inline-reply-box" style="display: none;">
                        <textarea id="replyInput_${c.id}" class="inline-reply-textarea" placeholder="Reply to @${c.username}..." rows="2"></textarea>
                        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
                            <button type="button" class="comment-cancel-btn" onclick="CommunityHub.toggleReplyInput('${c.id}')">Cancel</button>
                            <button type="button" class="comment-submit-btn" onclick="CommunityHub.submitComment('${c.id}', 'replyInput_${c.id}')">Reply</button>
                        </div>
                    </div>

                    <!-- Nested Replies Container -->
                    ${replies.length > 0 ? `
                        <button type="button" class="replies-toggle-btn" onclick="CommunityHub.toggleRepliesVisibility('${c.id}')">
                            ${isExpanded ? '▴ Hide' : '▾ View'} ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}
                        </button>

                        <div id="nestedReplies_${c.id}" class="nested-replies-wrapper" style="display: ${isExpanded ? 'flex' : 'none'};">
                            ${replies.map(rep => renderNestedReplyItem(rep, currentUser, c.id)).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    function renderNestedReplyItem(rep, currentUser, parentCommentId) {
        const isOwner = currentUser && String(currentUser.id) === String(rep.userId);
        const isAdmin = currentUser && currentUser.role === 'admin';
        const isLiked = currentUser && Array.isArray(rep.likes) && rep.likes.includes(String(currentUser.id));
        const likeCount = Array.isArray(rep.likes) ? rep.likes.length : 0;
        const effectiveAvatar = (isOwner && currentUser.avatar) ? currentUser.avatar : (rep.userAvatar || "");

        return `
            <div class="reply-thread-item" id="commentItem_${rep.id}">
                ${renderUserAvatar(rep.username, effectiveAvatar)}
                <div style="flex: 1;">
                    <div class="comment-author-line">
                        <span class="comment-author-name">@${rep.username}</span>
                        <span class="comment-time-ago">${timeAgo(rep.createdAt)}</span>
                        ${rep.isEdited ? `<span class="comment-edited-tag">(edited)</span>` : ''}
                    </div>

                    <div id="commentTextWrapper_${rep.id}">
                        <div class="comment-text-display">${escapeHtml(rep.text)}</div>
                    </div>

                    <div class="comment-actions-bar">
                        <button type="button" class="comment-action-pill ${isLiked ? 'liked' : ''}" onclick="CommunityHub.toggleLike('${rep.id}')" title="Like reply">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                            </svg>
                            <span>${likeCount > 0 ? likeCount : ''}</span>
                        </button>

                        ${isOwner ? `
                            <button type="button" class="comment-action-pill" onclick="CommunityHub.openInlineEdit('${rep.id}', \`${escapeJsString(rep.text)}\`)">
                                ✏️ Edit
                            </button>
                        ` : ''}

                        ${(isOwner || isAdmin) ? `
                            <button type="button" class="comment-action-pill delete" onclick="CommunityHub.deleteComment('${rep.id}')">
                                🗑️ Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function handleCommentInput(el, actionsId, submitBtnId) {
        const actions = document.getElementById(actionsId);
        const btn = document.getElementById(submitBtnId);
        if (actions) actions.style.display = 'flex';
        if (btn) btn.disabled = !el.value.trim();
    }

    function cancelCommentInput(inputId, actionsId) {
        const input = document.getElementById(inputId);
        const actions = document.getElementById(actionsId);
        if (input) input.value = '';
        if (actions) actions.style.display = 'none';
    }

    function toggleReplyInput(commentId) {
        const box = document.getElementById(`replyBox_${commentId}`);
        if (!box) return;
        const isShown = box.style.display !== 'none';
        box.style.display = isShown ? 'none' : 'block';
        if (!isShown) {
            const input = document.getElementById(`replyInput_${commentId}`);
            if (input) input.focus();
        }
    }

    function toggleRepliesVisibility(commentId) {
        const wrapper = document.getElementById(`nestedReplies_${commentId}`);
        if (!wrapper) return;
        if (state.expandedReplies.has(commentId)) {
            state.expandedReplies.delete(commentId);
        } else {
            state.expandedReplies.add(commentId);
        }
        loadComments(); // re-render maintaining expanded state
    }

    async function submitComment(parentId = null, inputElementId) {
        const user = getCurrentUser();
        if (!user) {
            alert("Please sign in to comment!");
            return;
        }

        const input = document.getElementById(inputElementId);
        if (!input || !input.value.trim()) return;

        try {
            const res = await fetch(`${API_BASE}/Comments`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    storyId: state.storyId,
                    text: input.value.trim(),
                    parentId: parentId,
                    userId: user.id,
                    username: user.name || "Reader",
                    userAvatar: user.avatar || ""
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to post comment");
            }

            input.value = "";
            if (parentId) {
                state.expandedReplies.add(parentId);
            }
            await loadComments();
            if (window.checkUserBadgeMilestones) {
                window.checkUserBadgeMilestones(user, {}, true);
            }
        } catch (err) {
            alert(err.message);
        }
    }

    async function toggleLike(commentId) {
        const user = getCurrentUser();
        if (!user) {
            alert("Please sign in to like comments!");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/Comments/${commentId}/like`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ userId: user.id })
            });
            if (!res.ok) throw new Error("Failed to like comment");
            await loadComments();
        } catch (err) {
            alert(err.message);
        }
    }

    function openInlineEdit(commentId, currentText) {
        const wrapper = document.getElementById(`commentTextWrapper_${commentId}`);
        if (!wrapper) return;

        wrapper.innerHTML = `
            <div class="inline-edit-box">
                <textarea id="editInput_${commentId}" class="inline-edit-textarea">${escapeHtml(currentText)}</textarea>
                <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
                    <button type="button" class="comment-cancel-btn" onclick="CommunityHub.cancelInlineEdit('${commentId}', \`${escapeJsString(currentText)}\`)">Cancel</button>
                    <button type="button" class="comment-submit-btn" onclick="CommunityHub.saveInlineEdit('${commentId}')">Save</button>
                </div>
            </div>
        `;
        const textarea = document.getElementById(`editInput_${commentId}`);
        if (textarea) textarea.focus();
    }

    function cancelInlineEdit(commentId, originalText) {
        const wrapper = document.getElementById(`commentTextWrapper_${commentId}`);
        if (wrapper) {
            wrapper.innerHTML = `<div class="comment-text-display">${escapeHtml(originalText)}</div>`;
        }
    }

    async function saveInlineEdit(commentId) {
        const input = document.getElementById(`editInput_${commentId}`);
        if (!input || !input.value.trim()) return;

        try {
            const res = await fetch(`${API_BASE}/Comments/${commentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: input.value.trim() })
            });
            if (!res.ok) throw new Error("Failed to update comment");
            await loadComments();
        } catch (err) {
            alert(err.message);
        }
    }

    async function deleteComment(commentId) {
        if (!confirm("Delete this comment? All replies will also be removed.")) return;
        try {
            const res = await fetch(`${API_BASE}/Comments/${commentId}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete comment");
            await loadComments();
        } catch (err) {
            alert(err.message);
        }
    }

    // Helper functions
    function escapeHtml(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeJsString(str) {
        if (!str) return "";
        return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    }

    // Public API
    return {
        init,
        switchTab,
        setReviewStars,
        previewStars,
        resetPreviewStars,
        filterReviews,
        submitReview,
        deleteReview,
        openInlineReviewEdit,
        setInlineReviewStars,
        saveInlineReview,
        loadReviews,
        handleCommentInput,
        cancelCommentInput,
        toggleReplyInput,
        toggleRepliesVisibility,
        submitComment,
        toggleLike,
        openInlineEdit,
        cancelInlineEdit,
        saveInlineEdit,
        deleteComment
    };
})();

window.CommunityHub = CommunityHub;
