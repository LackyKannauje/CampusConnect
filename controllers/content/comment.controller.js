const Comment = require('../../models/content/Comment.model');
const Content = require('../../models/content/Content.model');
const User = require('../../models/user/User.model');
const Pagination = require('../../utils/pagination');
const errorMiddleware  = require('../../middleware/error.middleware');

const commentController = {
    // Get post comments
    getPostComments: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const { sort = 'new', depth = 0 } = req.query;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        let sortOptions = {};
        switch (sort) {
            case 'new':
                sortOptions = { createdAt: -1 };
                break;
            case 'old':
                sortOptions = { createdAt: 1 };
                break;
            case 'top':
                sortOptions = { 'engagement.hotScore': -1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        const comments = await Comment.find({
            contentId: postId,
            depth: depth,
            'moderation.status': { $ne: 'deleted' }
        })
        .populate('userId', 'profile.firstName profile.lastName profile.avatar academic.role')
        .sort(sortOptions)
        .skip(req.pagination.skip)
        .limit(req.pagination.limit);

        // Get reply counts for each comment
        const commentsWithReplies = await Promise.all(
            comments.map(async (comment) => {
                const replyCount = await Comment.countDocuments({
                    parentCommentId: comment._id,
                    'moderation.status': { $ne: 'deleted' }
                });

                return {
                    ...comment.toObject(),
                    replyCount
                };
            })
        );

        res.json({
            comments: commentsWithReplies,
            total: post.engagement.comments.length
        });
    }),

    // Create comment
    createComment: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const { text, parentCommentId } = req.body;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if comments are enabled
        if (!post.comments.enabled || post.comments.isLocked) {
            return res.status(400).json({ error: 'Comments are disabled for this post' });
        }

        // Check parent comment if replying
        let parentComment = null;
        let depth = 0;
        let threadId = null;

        if (parentCommentId) {
            parentComment = await Comment.findById(parentCommentId);
            if (!parentComment) {
                return res.status(404).json({ error: 'Parent comment not found' });
            }

            // Check depth limit
            depth = parentComment.depth + 1;
            if (depth > 5) {
                return res.status(400).json({ error: 'Maximum comment depth reached' });
            }

            threadId = parentComment.threadId || parentComment._id;
        }

        // Create comment
        const comment = new Comment({
            contentId: postId,
            userId: user._id,
            collegeId: user.academic.collegeId,
            text,
            parentCommentId: parentCommentId || null,
            depth,
            threadId: threadId || null,
            isReply: !!parentCommentId
        });

        await comment.save();

        // Update post comment count
        post.engagement.comments.push(comment._id);
        await post.save();

        // Update user stats
        user.stats.content.comments += 1;
        await user.save();

        // Update parent comment's replies if replying
        if (parentComment) {
            parentComment.engagement.replies.push(comment._id);
            await parentComment.save();
        }

        // TODO: Send notifications
        // - Notify post author if not the commenter
        // - Notify parent comment author if replying
        // - Notify mentioned users

        res.status(201).json({
            message: 'Comment created successfully',
            comment: {
                id: comment._id,
                text: comment.text,
                author: {
                    id: user._id,
                    name: user.profile.fullName,
                    avatar: user.profile.avatar?.url
                },
                createdAt: comment.createdAt
            }
        });
    }),

    // Get comment by ID
    getCommentById: errorMiddleware.catchAsync(async (req, res) => {
        const { commentId } = req.params;

        const comment = await Comment.findById(commentId)
            .populate('userId', 'profile.firstName profile.lastName profile.avatar academic.role');

        if (!comment || comment.moderation.status === 'deleted') {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Get reply count
        const replyCount = await Comment.countDocuments({
            parentCommentId: commentId,
            'moderation.status': { $ne: 'deleted' }
        });

        const response = {
            id: comment._id,
            text: comment.text,
            author: {
                id: comment.userId._id,
                name: comment.userId.profile.fullName,
                avatar: comment.userId.profile.avatar?.url,
                role: comment.userId.academic.role
            },
            engagement: {
                likes: comment.engagement.likes.length,
                replies: replyCount
            },
            createdAt: comment.createdAt,
            isEdited: comment.metadata.isEdited
        };

        res.json(response);
    }),

    // Update comment
    updateComment: errorMiddleware.catchAsync(async (req, res) => {
        const { commentId } = req.params;
        const { text } = req.body;
        const user = req.user;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Check ownership
        if (!comment.userId.equals(user._id) && user.academic.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to update this comment' });
        }

        // Check if comment can be edited (within 24 hours)
        const hoursSinceCreation = (Date.now() - comment.createdAt) / (1000 * 60 * 60);
        if (hoursSinceCreation > 24 && user.academic.role !== 'admin') {
            return res.status(400).json({ error: 'Comment can only be edited within 24 hours' });
        }

        comment.text = text;
        comment.metadata.isEdited = true;
        comment.metadata.lastEdited = new Date();
        await comment.save();

        res.json({
            message: 'Comment updated successfully',
            comment: {
                id: comment._id,
                text: comment.text,
                updatedAt: comment.updatedAt
            }
        });
    }),

    // Delete comment
    deleteComment: errorMiddleware.catchAsync(async (req, res) => {
        const { commentId } = req.params;
        const user = req.user;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Check permissions
        const isOwner = comment.userId.equals(user._id);
        const isAdmin = ['admin', 'moderator', 'college_admin'].includes(user.academic.role);
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }

        // Check if comment has replies (owners cannot delete comments with replies)
        if (isOwner && comment.engagement.replies.length > 0) {
            return res.status(400).json({ error: 'Cannot delete comment with replies' });
        }

        // Soft delete
        comment.moderation.status = 'deleted';
        await comment.save();

        // Remove from post's comments array
        await Content.findByIdAndUpdate(comment.contentId, {
            $pull: { 'engagement.comments': commentId }
        });

        // Update user stats
        if (isOwner) {
            const commenter = await User.findById(comment.userId);
            if (commenter) {
                commenter.stats.content.comments = Math.max(0, commenter.stats.content.comments - 1);
                await commenter.save();
            }
        }

        res.json({ message: 'Comment deleted successfully' });
    }),

    // Like comment
    likeComment: errorMiddleware.catchAsync(async (req, res) => {
        const { commentId } = req.params;
        const user = req.user;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const liked = comment.addLike(user._id);
        await comment.save();

        if (liked) {
            // Update user stats
            user.stats.content.likesGiven += 1;
            await user.save();

            // Update comment author stats
            const author = await User.findById(comment.userId);
            if (author) {
                author.stats.content.likesReceived += 1;
                await author.save();
            }
        }

        res.json({
            liked: true,
            likes: comment.engagement.likes.length
        });
    }),

    // Unlike comment
    unlikeComment: errorMiddleware.catchAsync(async (req, res) => {
        const { commentId } = req.params;
        const user = req.user;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const unliked = comment.removeLike(user._id);
        await comment.save();

        if (unliked) {
            // Update user stats
            user.stats.content.likesGiven = Math.max(0, user.stats.content.likesGiven - 1);
            await user.save();

            // Update comment author stats
            const author = await User.findById(comment.userId);
            if (author) {
                author.stats.content.likesReceived = Math.max(0, author.stats.content.likesReceived - 1);
                await author.save();
            }
        }

        res.json({
            liked: false,
            likes: comment.engagement.likes.length
        });
    }),

    // Get comment replies
    getCommentReplies: errorMiddleware.catchAsync(async (req, res) => {
        const { commentId } = req.params;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const replies = await Comment.find({
            parentCommentId: commentId,
            'moderation.status': { $ne: 'deleted' }
        })
        .populate('userId', 'profile.firstName profile.lastName profile.avatar academic.role')
        .sort({ createdAt: 1 })
        .skip(req.pagination.skip)
        .limit(req.pagination.limit);

        res.json({
            replies,
            total: comment.engagement.replies.length
        });
    }),

    // Report comment
    reportComment: errorMiddleware.catchAsync(async (req, res) => {
        const { commentId } = req.params;
        const { reason } = req.body;
        const user = req.user;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Add report flag
        comment.moderation.flags.push({
            type: 'user_report',
            flaggedBy: user._id,
            flaggedAt: new Date(),
            reason: reason || 'User reported',
            aiConfidence: 0.8
        });

        comment.moderation.requiresManualReview = true;
        await comment.save();

        res.json({ message: 'Comment reported successfully' });
    })
};

module.exports = commentController;