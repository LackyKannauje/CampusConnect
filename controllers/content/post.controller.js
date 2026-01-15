const Content = require('../../models/content/Content.model');
const Media = require('../../models/content/Media.model');
const Comment = require('../../models/content/Comment.model');
const ContentModerator = require('../../services/ai/ContentModerator');
const Pagination = require('../../utils/pagination');
const errorMiddleware  = require('../../middleware/error.middleware');

const contentModerator = new ContentModerator();

const postController = {
    // Get all posts
    getAllPosts: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.user.academic;
        const { type, category, departmentId } = req.query;

        let query = {
            collegeId,
            'moderation.status': 'approved',
            'visibility.isDraft': false
        };

        if (type) query.type = type;
        if (category) query.category = category;
        if (departmentId) query.departmentId = departmentId;

        const result = await Pagination.paginate(Content, query, {
            page: req.pagination.page,
            limit: req.pagination.limit,
            select: 'title excerpt type category featuredMedia media createdAt engagement.likes engagement.comments engagement.views',
            populate: [
                { path: 'authorId', select: 'profile.firstName profile.lastName profile.avatar academic.role' },
                { path: 'featuredMedia', select: 'url thumbnail' }
            ],
            sort: { createdAt: -1 }
        });

        res.json(result);
    }),

    // Get personalized feed
    getFeed: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const { collegeId, departmentId } = user.academic;

        // Build feed query based on user preferences
        let query = {
            collegeId,
            'moderation.status': 'approved',
            'visibility.isDraft': false,
            $or: [
                { 'visibility.scope': 'public' },
                { 'visibility.scope': 'college' },
                { 
                    'visibility.scope': 'department',
                    departmentId: departmentId 
                },
                {
                    'visibility.scope': 'followers',
                    authorId: { $in: user.social.following }
                }
            ]
        };

        // Filter by user interests if available
        if (user.aiProfile?.detectedInterests?.length > 0) {
            const interests = user.aiProfile.detectedInterests.map(i => i.topic);
            query['ai.tags'] = { $in: interests };
        }

        const result = await Pagination.paginate(Content, query, {
            page: req.pagination.page,
            limit: req.pagination.limit,
            select: 'title excerpt type category featuredMedia media createdAt engagement.likes engagement.comments',
            populate: [
                { path: 'authorId', select: 'profile.firstName profile.lastName profile.avatar academic.role' },
                { path: 'featuredMedia', select: 'url thumbnail' }
            ],
            sort: { 'engagement.hotScore': -1 }
        });

        res.json(result);
    }),

    // Get trending posts
    getTrending: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.user.academic;
        const { timeframe = 'week' } = req.query;

        const timeframes = {
            'day': 1,
            'week': 7,
            'month': 30
        };

        const days = timeframes[timeframe] || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const trendingPosts = await Content.getTrending(collegeId, 20, timeframe);

        res.json({
            timeframe,
            posts: trendingPosts
        });
    }),

    // Search posts
    searchPosts: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.user.academic;
        const { q: searchTerm, type, category } = req.query;

        if (!searchTerm || searchTerm.length < 2) {
            return res.status(400).json({ error: 'Search term must be at least 2 characters' });
        }

        const filters = {};
        if (type) filters.type = type;
        if (category) filters.category = category;

        const results = await Content.search(searchTerm, filters, {
            collegeId,
            limit: req.pagination.limit,
            skip: req.pagination.skip,
            sortBy: 'relevance'
        });

        res.json(results);
    }),

    // Create post
    createPost: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const { title, content, type, category, visibility, tags } = req.body;
        const mediaFiles = req.files || [];

        // Check if user can post
        if (!user.academic.departmentId && visibility === 'department') {
            return res.status(400).json({ error: 'Cannot post to department without department affiliation' });
        }

        // Process media uploads
        const mediaIds = [];
        for (const file of mediaFiles) {
            // TODO: Upload to Cloudinary and create Media document
            // For now, create placeholder
            const media = new Media({
                uploadedBy: user._id,
                collegeId: user.academic.collegeId,
                originalName: file.originalname,
                file: {
                    url: `/uploads/${file.filename}`,
                    type: file.mimetype.split('/')[0],
                    size: file.size
                },
                type: file.mimetype.split('/')[0],
                category: 'post'
            });
            await media.save();
            mediaIds.push(media._id);
        }

        // AI Content Analysis
        let aiAnalysis = {};
        if (content) {
            // Moderation
            const moderation = await contentModerator.moderateContent(content, {
                contentType: 'text',
                collegeId: user.academic.collegeId,
                userId: user._id
            });

            if (!moderation.safe && moderation.flagged) {
                return res.status(400).json({ 
                    error: 'Content violates community guidelines',
                    flags: moderation.categories 
                });
            }

            // Generate tags if not provided
            let postTags = tags || [];
            if (!tags || tags.length === 0) {
                const tagResult = await contentModerator.generateTags(content, {
                    collegeId: user.academic.collegeId
                });
                postTags = tagResult.tags || [];
            }

            // Generate summary
            const summary = await contentModerator.generateSummary(content, {
                collegeId: user.academic.collegeId,
                maxLength: 150
            });

            aiAnalysis = {
                tags: postTags,
                summary: summary.summary,
                sentiment: {
                    label: 'neutral',
                    score: 0
                }
            };
        }

        // Create post
        const post = new Content({
            authorId: user._id,
            collegeId: user.academic.collegeId,
            departmentId: user.academic.departmentId,
            title,
            content: { text: content },
            type,
            category: category || 'general',
            tags: aiAnalysis.tags || [],
            media: mediaIds.map((id, index) => ({
                mediaId: id,
                type: 'image',
                order: index
            })),
            featuredMedia: mediaIds[0],
            visibility: {
                scope: visibility || 'college',
                isDraft: false
            },
            ai: aiAnalysis
        });

        await post.save();

        // Update user stats
        user.stats.content.posts += 1;
        await user.save();

        res.status(201).json({
            message: 'Post created successfully',
            post: {
                id: post._id,
                title: post.title,
                type: post.type,
                category: post.category,
                createdAt: post.createdAt
            }
        });
    }),

    // Get post by ID
    getPostById: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId)
            .populate('authorId', 'profile.firstName profile.lastName profile.avatar academic.role')
            .populate('featuredMedia', 'url thumbnail')
            .populate('media.mediaId', 'url thumbnail type');

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if user can view this post
        if (!post.canUserAccess(user)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Increment view count
        post.incrementView(user._id);
        await post.save();

        // Check if user has liked/saved the post
        const userLiked = post.engagement.likes.some(like => 
            like.userId.equals(user._id)
        );
        const userSaved = post.engagement.saves.some(save => 
            save.userId.equals(user._id)
        );

        const response = {
            id: post._id,
            title: post.title,
            content: post.content.text,
            type: post.type,
            category: post.category,
            tags: post.tags,
            author: {
                id: post.authorId._id,
                name: post.authorId.profile.fullName,
                avatar: post.authorId.profile.avatar?.url,
                role: post.authorId.academic.role
            },
            media: post.media.map(m => ({
                id: m.mediaId?._id,
                url: m.mediaId?.url,
                type: m.mediaId?.type,
                thumbnail: m.mediaId?.thumbnail
            })),
            engagement: {
                likes: post.engagement.likes.length,
                comments: post.engagement.comments.length,
                views: post.engagement.views,
                shares: post.engagement.shares,
                userLiked,
                userSaved
            },
            createdAt: post.createdAt,
            updatedAt: post.updatedAt
        };

        res.json(response);
    }),

    // Update post
    updatePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;
        const updates = req.body;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check ownership
        if (!post.authorId.equals(user._id) && user.academic.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to update this post' });
        }

        // Update fields
        if (updates.title) post.title = updates.title;
        if (updates.content) post.content.text = updates.content;
        if (updates.category) post.category = updates.category;
        if (updates.tags) post.tags = updates.tags;
        if (updates.visibility) post.visibility.scope = updates.visibility;

        post.updatedAt = new Date();
        await post.save();

        res.json({
            message: 'Post updated successfully',
            post: {
                id: post._id,
                title: post.title,
                updatedAt: post.updatedAt
            }
        });
    }),

    // Delete post
    deletePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check permissions
        const isOwner = post.authorId.equals(user._id);
        const isAdmin = ['admin', 'moderator', 'college_admin'].includes(user.academic.role);
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }

        // Soft delete
        post.isActive = false;
        post.moderation.status = 'deleted';
        await post.save();

        // Update user stats
        if (isOwner) {
            const author = await User.findById(post.authorId);
            if (author) {
                author.stats.content.posts = Math.max(0, author.stats.content.posts - 1);
                await author.save();
            }
        }

        res.json({ message: 'Post deleted successfully' });
    }),

    // Like post
    likePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const liked = post.addLike(user._id);
        await post.save();

        if (liked) {
            // Update user stats
            user.stats.content.likesGiven += 1;
            await user.save();

            // Update author stats
            const author = await User.findById(post.authorId);
            if (author) {
                author.stats.content.likesReceived += 1;
                await author.save();
            }

            // TODO: Send notification to author
        }

        res.json({
            liked: true,
            likes: post.engagement.likes.length
        });
    }),

    // Unlike post
    unlikePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const unliked = post.removeLike(user._id);
        await post.save();

        if (unliked) {
            // Update user stats
            user.stats.content.likesGiven = Math.max(0, user.stats.content.likesGiven - 1);
            await user.save();

            // Update author stats
            const author = await User.findById(post.authorId);
            if (author) {
                author.stats.content.likesReceived = Math.max(0, author.stats.content.likesReceived - 1);
                await author.save();
            }
        }

        res.json({
            liked: false,
            likes: post.engagement.likes.length
        });
    }),

    // Save post
    savePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if already saved
        const alreadySaved = post.engagement.saves.some(save => 
            save.userId.equals(user._id)
        );

        if (!alreadySaved) {
            post.engagement.saves.push({
                userId: user._id,
                savedAt: new Date()
            });
            await post.save();
        }

        res.json({ saved: true });
    }),

    // Unsave post
    unsavePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.engagement.saves = post.engagement.saves.filter(save => 
            !save.userId.equals(user._id)
        );
        await post.save();

        res.json({ saved: false });
    }),

    // Share post
    sharePost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.engagement.shares += 1;
        await post.save();

        // Update user stats
        user.stats.content.shares += 1;
        await user.save();

        res.json({
            shared: true,
            shares: post.engagement.shares
        });
    }),

    // Report post
    reportPost: errorMiddleware.catchAsync(async (req, res) => {
        const { postId } = req.params;
        const { reason } = req.body;
        const user = req.user;

        const post = await Content.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Add report flag
        post.moderation.flags.push({
            type: 'user_report',
            flaggedBy: user._id,
            flaggedAt: new Date(),
            reason: reason || 'User reported',
            aiConfidence: 0.8
        });

        post.moderation.requiresManualReview = true;
        await post.save();

        res.json({ message: 'Post reported successfully' });
    }),

    // Get moderation queue
    getModerationQueue: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.user.academic;

        const queue = await Content.find({
            collegeId,
            'moderation.status': 'pending',
            'moderation.requiresManualReview': true
        })
        .select('title type category createdAt moderation.flags')
        .populate('authorId', 'profile.firstName profile.lastName academic.role')
        .sort({ createdAt: 1 })
        .limit(50);

        res.json({ queue });
    }),

    // Approve content
    approveContent: errorMiddleware.catchAsync(async (req, res) => {
        const { contentId } = req.params;
        const moderator = req.user;

        const content = await Content.findById(contentId);
        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        content.moderation.status = 'approved';
        content.moderation.reviewedBy = moderator._id;
        content.moderation.reviewedAt = new Date();
        await content.save();

        res.json({ message: 'Content approved' });
    }),

    // Reject content
    rejectContent: errorMiddleware.catchAsync(async (req, res) => {
        const { contentId } = req.params;
        const { reason } = req.body;
        const moderator = req.user;

        const content = await Content.findById(contentId);
        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        content.moderation.status = 'rejected';
        content.moderation.reviewedBy = moderator._id;
        content.moderation.reviewedAt = new Date();
        content.isActive = false;
        
        if (reason) {
            content.moderation.flags.push({
                type: 'moderator_rejection',
                flaggedBy: moderator._id,
                flaggedAt: new Date(),
                reason
            });
        }

        await content.save();

        res.json({ message: 'Content rejected' });
    })
};

module.exports = postController;