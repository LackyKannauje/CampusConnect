const express = require('express');
const router = express.Router();
const postController = require('../controllers/content/post.controller');
const commentController = require('../controllers/content/comment.controller');
const mediaController = require('../controllers/content/media.controller');
const validation = require('../utils/validation');
const authMiddleware = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');
const paginationMiddleware = require('../middleware/pagination.middleware');

// Posts Routes
router.get('/posts', 
    authMiddleware.authenticate,
    paginationMiddleware,
    postController.getAllPosts
);

router.get('/posts/feed', 
    authMiddleware.authenticate,
    paginationMiddleware,
    postController.getFeed
);

router.get('/posts/trending', 
    authMiddleware.authenticate,
    paginationMiddleware,
    postController.getTrending
);

router.get('/posts/search', 
    authMiddleware.authenticate,
    paginationMiddleware,
    postController.searchPosts
);

router.post('/posts', 
    authMiddleware.authenticate,
    uploadMiddleware.array('media', 10),
    validation.validate(validation.content.create),
    postController.createPost
);

router.get('/posts/:postId', 
    authMiddleware.authenticate,
    postController.getPostById
);

router.put('/posts/:postId', 
    authMiddleware.authenticate,
    validation.validate(validation.content.update),
    postController.updatePost
);

router.delete('/posts/:postId', 
    authMiddleware.authenticate,
    postController.deletePost
);

// Post Interactions
router.post('/posts/:postId/like', 
    authMiddleware.authenticate,
    postController.likePost
);

router.delete('/posts/:postId/like', 
    authMiddleware.authenticate,
    postController.unlikePost
);

router.post('/posts/:postId/save', 
    authMiddleware.authenticate,
    postController.savePost
);

router.delete('/posts/:postId/save', 
    authMiddleware.authenticate,
    postController.unsavePost
);

router.post('/posts/:postId/share', 
    authMiddleware.authenticate,
    postController.sharePost
);

// Comments Routes
router.get('/posts/:postId/comments', 
    authMiddleware.authenticate,
    paginationMiddleware,
    commentController.getPostComments
);

router.post('/posts/:postId/comments', 
    authMiddleware.authenticate,
    validation.validate(validation.comment.create),
    commentController.createComment
);

router.get('/comments/:commentId', 
    authMiddleware.authenticate,
    commentController.getCommentById
);

router.put('/comments/:commentId', 
    authMiddleware.authenticate,
    commentController.updateComment
);

router.delete('/comments/:commentId', 
    authMiddleware.authenticate,
    commentController.deleteComment
);

// Comment Interactions
router.post('/comments/:commentId/like', 
    authMiddleware.authenticate,
    commentController.likeComment
);

router.delete('/comments/:commentId/like', 
    authMiddleware.authenticate,
    commentController.unlikeComment
);

router.get('/comments/:commentId/replies', 
    authMiddleware.authenticate,
    paginationMiddleware,
    commentController.getCommentReplies
);

// Media Routes
router.post('/media/upload', 
    authMiddleware.authenticate,
    uploadMiddleware.single('file'),
    validation.validateFile,
    mediaController.uploadMedia
);

router.get('/media/:mediaId', 
    authMiddleware.authenticate,
    mediaController.getMedia
);

router.delete('/media/:mediaId', 
    authMiddleware.authenticate,
    mediaController.deleteMedia
);

router.get('/media', 
    authMiddleware.authenticate,
    paginationMiddleware,
    mediaController.getAllMedia
);

// Content Moderation
router.post('/posts/:postId/report', 
    authMiddleware.authenticate,
    postController.reportPost
);

router.post('/comments/:commentId/report', 
    authMiddleware.authenticate,
    commentController.reportComment
);

router.get('/moderation/queue', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'moderator']),
    paginationMiddleware,
    postController.getModerationQueue
);

router.post('/moderation/:contentId/approve', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'moderator']),
    postController.approveContent
);

router.post('/moderation/:contentId/reject', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'moderator']),
    postController.rejectContent
);

module.exports = router;