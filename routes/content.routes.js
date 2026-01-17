const express = require('express');
const router = express.Router();
const commentController = require('../controllers/content/comment.controller');
const mediaController = require('../controllers/content/media.controller');
const validation = require('../utils/validation');
const postController = require('../controllers/content/post.controller');
const authMiddleware = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');
const paginationMiddleware = require('../middleware/pagination.middleware');

// Posts Routes
/**
 * @swagger
 * /content/posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of posts
 */
router.get('/posts',
    authMiddleware.authenticate,
    paginationMiddleware,
    postController.getAllPosts
);

/**
 * @swagger
 * /content/posts/feed:
 *   get:
 *     summary: Get user feed
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User feed
 */
router.get('/posts/feed',
    authMiddleware.authenticate,
    paginationMiddleware,
    postController.getFeed
);

/**
 * @swagger
 * /content/posts/trending:
 *   get:
 *     summary: Get trending posts
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trending posts
 */
router.get('/posts/trending',
    authMiddleware.authenticate,
    paginationMiddleware,
    postController.getTrending
);

/**
 * @swagger
 * /content/posts/search:
 *   get:
 *     summary: Search posts
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/posts/search',
    authMiddleware.authenticate,
    paginationMiddleware,
    postController.searchPosts
);

/**
 * @swagger
 * /content/posts:
 *   post:
 *     summary: Create a post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Post created
 */
router.post('/posts',
    authMiddleware.authenticate,
    uploadMiddleware.array('media', 10),
    validation.validate(validation.content.create),
    postController.createPost
);

/**
 * @swagger
 * /content/posts/{postId}:
 *   get:
 *     summary: Get post by ID
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post details
 */
router.get('/posts/:postId',
    authMiddleware.authenticate,
    postController.getPostById
);

/**
 * @swagger
 * /content/posts/{postId}:
 *   put:
 *     summary: Update post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Post updated
 */
router.put('/posts/:postId',
    authMiddleware.authenticate,
    validation.validate(validation.content.update),
    postController.updatePost
);

/**
 * @swagger
 * /content/posts/{postId}:
 *   delete:
 *     summary: Delete post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post deleted
 */
router.delete('/posts/:postId',
    authMiddleware.authenticate,
    postController.deletePost
);

// Post Interactions
/**
 * @swagger
 * /content/posts/{postId}/like:
 *   post:
 *     summary: Like post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post liked
 */
router.post('/posts/:postId/like',
    authMiddleware.authenticate,
    postController.likePost
);

/**
 * @swagger
 * /content/posts/{postId}/like:
 *   delete:
 *     summary: Unlike post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post unliked
 */
router.delete('/posts/:postId/like',
    authMiddleware.authenticate,
    postController.unlikePost
);

/**
 * @swagger
 * /content/posts/{postId}/save:
 *   post:
 *     summary: Save post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post saved
 */
router.post('/posts/:postId/save',
    authMiddleware.authenticate,
    postController.savePost
);

/**
 * @swagger
 * /content/posts/{postId}/save:
 *   delete:
 *     summary: Unsave post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post unsaved
 */
router.delete('/posts/:postId/save',
    authMiddleware.authenticate,
    postController.unsavePost
);

/**
 * @swagger
 * /content/posts/{postId}/share:
 *   post:
 *     summary: Share post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post shared
 */
router.post('/posts/:postId/share',
    authMiddleware.authenticate,
    postController.sharePost
);

// Comments Routes
/**
 * @swagger
 * /content/posts/{postId}/comments:
 *   get:
 *     summary: Get comments for a post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of comments
 */
router.get('/posts/:postId/comments',
    authMiddleware.authenticate,
    paginationMiddleware,
    commentController.getPostComments
);

/**
 * @swagger
 * /content/posts/{postId}/comments:
 *   post:
 *     summary: Add comment to post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added
 */
router.post('/posts/:postId/comments',
    authMiddleware.authenticate,
    validation.validate(validation.comment.create),
    commentController.createComment
);

/**
 * @swagger
 * /content/comments/{commentId}:
 *   get:
 *     summary: Get comment by ID
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment details
 */
router.get('/comments/:commentId',
    authMiddleware.authenticate,
    commentController.getCommentById
);

/**
 * @swagger
 * /content/comments/{commentId}:
 *   put:
 *     summary: Update comment
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated
 */
router.put('/comments/:commentId',
    authMiddleware.authenticate,
    commentController.updateComment
);

/**
 * @swagger
 * /content/comments/{commentId}:
 *   delete:
 *     summary: Delete comment
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted
 */
router.delete('/comments/:commentId',
    authMiddleware.authenticate,
    commentController.deleteComment
);

// Comment Interactions
/**
 * @swagger
 * /content/comments/{commentId}/like:
 *   post:
 *     summary: Like comment
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment liked
 */
router.post('/comments/:commentId/like',
    authMiddleware.authenticate,
    commentController.likeComment
);

/**
 * @swagger
 * /content/comments/{commentId}/like:
 *   delete:
 *     summary: Unlike comment
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment unliked
 */
router.delete('/comments/:commentId/like',
    authMiddleware.authenticate,
    commentController.unlikeComment
);

/**
 * @swagger
 * /content/comments/{commentId}/replies:
 *   get:
 *     summary: Get comment replies
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of replies
 */
router.get('/comments/:commentId/replies',
    authMiddleware.authenticate,
    paginationMiddleware,
    commentController.getCommentReplies
);

// Media Routes
/**
 * @swagger
 * /content/media/upload:
 *   post:
 *     summary: Upload media
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Media uploaded
 */
router.post('/media/upload',
    authMiddleware.authenticate,
    uploadMiddleware.single('file'),
    validation.validateFile,
    mediaController.uploadMedia
);

/**
 * @swagger
 * /content/media/{mediaId}:
 *   get:
 *     summary: Get media by ID
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media details
 */
router.get('/media/:mediaId',
    authMiddleware.authenticate,
    mediaController.getMedia
);

/**
 * @swagger
 * /content/media/{mediaId}:
 *   delete:
 *     summary: Delete media
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media deleted
 */
router.delete('/media/:mediaId',
    authMiddleware.authenticate,
    mediaController.deleteMedia
);

/**
 * @swagger
 * /content/media:
 *   get:
 *     summary: Get all media
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of media
 */
router.get('/media',
    authMiddleware.authenticate,
    paginationMiddleware,
    mediaController.getAllMedia
);

// Content Moderation
/**
 * @swagger
 * /content/posts/{postId}/report:
 *   post:
 *     summary: Report post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post reported
 */
router.post('/posts/:postId/report',
    authMiddleware.authenticate,
    postController.reportPost
);

/**
 * @swagger
 * /content/comments/{commentId}/report:
 *   post:
 *     summary: Report comment
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment reported
 */
router.post('/comments/:commentId/report',
    authMiddleware.authenticate,
    commentController.reportComment
);

/**
 * @swagger
 * /content/moderation/queue:
 *   get:
 *     summary: Get moderation queue
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Moderation queue
 */
router.get('/moderation/queue',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'moderator']),
    paginationMiddleware,
    postController.getModerationQueue
);

/**
 * @swagger
 * /content/moderation/{contentId}/approve:
 *   post:
 *     summary: Approve content
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content approved
 */
router.post('/moderation/:contentId/approve',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'moderator']),
    postController.approveContent
);

/**
 * @swagger
 * /content/moderation/{contentId}/reject:
 *   post:
 *     summary: Reject content
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content rejected
 */
router.post('/moderation/:contentId/reject',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'moderator']),
    postController.rejectContent
);

module.exports = router;