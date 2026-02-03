// const Content = require('../../models/content/Content.model');
// const Media = require('../../models/content/Media.model');
// const ContentModerator = require('../../services/ai/ContentModerator');
// const Pagination = require('../../utils/pagination');
// const errorMiddleware  = require('../../middleware/error.middleware');
// const User = require('../../models/user/User.model');
// const CloudinaryService = require('../../services/cloudinary/cloudinaryService');
// const fs = require('fs').promises;

// const contentModerator = new ContentModerator();

// const postController = {
//     // Get all posts
//     getAllPosts: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.user.academic;
//         const { type, category, departmentId } = req.query;

//         let query = {
//             collegeId,
//             'moderation.status': 'approved',
//             'visibility.isDraft': false
//         };

//         if (type) query.type = type;
//         if (category) query.category = category;
//         if (departmentId) query.departmentId = departmentId;

//         const result = await Pagination.paginate(Content, query, {
//             page: req.pagination.page,
//             limit: req.pagination.limit,
//             select: 'title excerpt type category featuredMedia media createdAt engagement.likes engagement.comments engagement.views',
//             populate: [
//                 { path: 'authorId', select: 'profile.firstName profile.lastName profile.avatar academic.role' },
//                 { path: 'featuredMedia', select: 'url thumbnail' }
//             ],
//             sort: { createdAt: -1 }
//         });

//         res.json(result);
//     }),

//     // Get personalized feed
//     getFeed: errorMiddleware.catchAsync(async (req, res) => {
//         const user = req.user;
//         const { collegeId, departmentId } = user.academic;

//         // Build feed query based on user preferences
//         let query = {
//             collegeId,
//             'moderation.status': 'approved',
//             'visibility.isDraft': false,
//             $or: [
//                 { 'visibility.scope': 'public' },
//                 { 'visibility.scope': 'college' },
//                 { 
//                     'visibility.scope': 'department',
//                     departmentId: departmentId 
//                 },
//                 {
//                     'visibility.scope': 'followers',
//                     authorId: { $in: user.social.following }
//                 }
//             ]
//         };

//         // Filter by user interests if available
//         if (user.aiProfile?.detectedInterests?.length > 0) {
//             const interests = user.aiProfile.detectedInterests.map(i => i.topic);
//             query['ai.tags'] = { $in: interests };
//         }

//         const result = await Pagination.paginate(Content, query, {
//             page: req.pagination.page,
//             limit: req.pagination.limit,
//             select: 'title excerpt type category featuredMedia media createdAt engagement.likes engagement.comments',
//             populate: [
//                 { path: 'authorId', select: 'profile.firstName profile.lastName profile.avatar academic.role' },
//                 { path: 'featuredMedia', select: 'url thumbnail' }
//             ],
//             sort: { 'engagement.hotScore': -1 }
//         });

//         res.json(result);
//     }),

//     // Get trending posts
//     getTrending: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.user.academic;
//         const { timeframe = 'week' } = req.query;

//         const timeframes = {
//             'day': 1,
//             'week': 7,
//             'month': 30
//         };

//         const days = timeframes[timeframe] || 7;
//         const startDate = new Date();
//         startDate.setDate(startDate.getDate() - days);

//         const trendingPosts = await Content.getTrending(collegeId, 20, timeframe);

//         res.json({
//             timeframe,
//             posts: trendingPosts
//         });
//     }),

//     // Search posts
//     searchPosts: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.user.academic;
//         const { q: searchTerm, type, category } = req.query;

//         if (!searchTerm || searchTerm.length < 2) {
//             return res.status(400).json({ error: 'Search term must be at least 2 characters' });
//         }

//         const filters = {};
//         if (type) filters.type = type;
//         if (category) filters.category = category;

//         const results = await Content.search(searchTerm, filters, {
//             collegeId,
//             limit: req.pagination.limit,
//             skip: req.pagination.skip,
//             sortBy: 'relevance'
//         });

//         res.json(results);
//     }),



// createPost: errorMiddleware.catchAsync(async (req, res) => {
//     const user = req.user;
//     const { 
//         title, 
//         content, 
//         type = 'post', 
//         category = 'general', 
//         visibility = 'college', 
//         tags = [],
//         mediaCaptions = [],
//         subtitle,
//         excerpt 
//     } = req.body;
    
//     const mediaFiles = req.files || [];

//     // ========== 1. BASIC VALIDATION ==========
//     if (!title || !title.trim()) {
//         return res.status(400).json({ 
//             success: false,
//             error: 'Title is required' 
//         });
//     }

//     if (visibility === 'department' && !user.academic?.departmentId) {
//         return res.status(400).json({ 
//             success: false,
//             error: 'Cannot post to department without department affiliation' 
//         });
//     }

//     // ========== 2. CLOUDINARY MEDIA UPLOAD ==========
//     const mediaItems = [];
//     const savedMediaIds = [];
//     const uploadedToCloudinary = []; // Track files uploaded to Cloudinary

//     try {
//         // Process each media file
//         for (let i = 0; i < mediaFiles.length; i++) {
//             const file = mediaFiles[i];
            
//             // Get caption (if any)
//             let caption = '';
//             if (mediaCaptions && Array.isArray(mediaCaptions)) {
//                 caption = mediaCaptions[i] || '';
//             } else if (mediaCaptions && typeof mediaCaptions === 'string') {
//                 try {
//                     const parsed = JSON.parse(mediaCaptions);
//                     if (Array.isArray(parsed)) {
//                         caption = parsed[i] || '';
//                     }
//                 } catch (e) {
//                     // Ignore parsing errors
//                 }
//             }

//             // Upload to Cloudinary
//             console.log(`Uploading ${file.originalname} to Cloudinary...`);
//             const cloudinaryResult = await CloudinaryService.uploadMediaFile(
//                 file, 
//                 user, 
//                 user.academic?.collegeId?.toString()
//             );

//             if (!cloudinaryResult.success) {
//                 throw new Error(`Failed to upload ${file.originalname}: ${cloudinaryResult.error}`);
//             }

//             const cloudinaryData = cloudinaryResult.data;
//             uploadedToCloudinary.push({
//                 publicId: cloudinaryData.public_id,
//                 resourceType: cloudinaryData.resource_type,
//                 filePath: file.path
//             });

//             // Generate unique media ID
//             const timestamp = Date.now().toString(36);
//             const random = Math.random().toString(36).substr(2, 9);
//             const mediaId = `media_${timestamp}_${random}`;
            
//             // Create Media document with Cloudinary URLs
//             const mediaDoc = {
//                 mediaId,
//                 uploadedBy: user._id,
//                 collegeId: user.academic?.collegeId,
//                 departmentId: user.academic?.departmentId,
//                 originalName: file.originalname,
//                 file: {
//                     url: cloudinaryData.url,
//                     type: cloudinaryData.resource_type,
//                     size: cloudinaryData.bytes,
//                     mimeType: file.mimetype,
//                     filename: file.filename,
//                     path: file.path,
//                     thumbnail: cloudinaryData.thumbnail_url,
//                     cloudinary: {
//                         public_id: cloudinaryData.public_id,
//                         resource_type: cloudinaryData.resource_type,
//                         format: cloudinaryData.format,
//                         width: cloudinaryData.width,
//                         height: cloudinaryData.height,
//                         duration: cloudinaryData.duration,
//                         raw_response: cloudinaryData.raw
//                     }
//                 },
//                 type: cloudinaryData.resource_type,
//                 category: 'post',
//                 permissions: {
//                     visibility: 'college',
//                     downloadable: true,
//                     shareable: true,
//                     requiresAuth: true
//                 },
//                 processing: {
//                     status: 'ready',
//                     progress: 100,
//                     processedAt: new Date(),
//                     transformations: cloudinaryData.resource_type === 'image' ? [{
//                         type: 'thumbnail',
//                         url: cloudinaryData.thumbnail_url,
//                         size: cloudinaryData.bytes,
//                         createdAt: new Date()
//                     }] : []
//                 },
//                 contentInfo: {
//                     title: file.originalname,
//                     format: cloudinaryData.format,
//                     resolution: cloudinaryData.width && cloudinaryData.height 
//                         ? `${cloudinaryData.width}x${cloudinaryData.height}` 
//                         : null,
//                     duration: cloudinaryData.duration,
//                     quality: 'high'
//                 },
//                 storage: {
//                     provider: 'cloudinary',
//                     bucket: 'college_updates',
//                     region: 'auto',
//                     path: cloudinaryData.public_id,
//                     urls: {
//                         raw: cloudinaryData.url,
//                         optimized: CloudinaryService.generateOptimizedUrl(cloudinaryData.url, { 
//                             width: 800, 
//                             quality: 80 
//                         }),
//                         thumbnail: cloudinaryData.thumbnail_url,
//                         preview: cloudinaryData.thumbnail_url
//                     }
//                 },
//                 moderation: {
//                     status: 'approved'
//                 },
//                 isActive: true
//             };

//             const media = new Media(mediaDoc);
//             const savedMedia = await media.save();
//             savedMediaIds.push(savedMedia._id);

//             // Create media item for post
//             const mediaItem = {
//                 mediaId: savedMedia._id,
//                 type: cloudinaryData.resource_type,
//                 url: cloudinaryData.url,
//                 thumbnail: cloudinaryData.thumbnail_url,
//                 caption: caption,
//                 order: i
//             };

//             console.log(`Successfully uploaded: ${file.originalname} -> ${cloudinaryData.url}`);
//             mediaItems.push(mediaItem);

//             // Clean up local file after successful Cloudinary upload
//             try {
//                 await fs.unlink(file.path);
//                 console.log(`Cleaned up local file: ${file.path}`);
//             } catch (cleanupError) {
//                 console.error(`Failed to clean up local file ${file.path}:`, cleanupError);
//             }
//         }
//     } catch (mediaError) {
//         console.error('Media processing error:', mediaError);
        
//         // Clean up: Delete from Cloudinary if uploaded
//         for (const cloudinaryFile of uploadedToCloudinary) {
//             try {
//                 await CloudinaryService.deleteFile(
//                     cloudinaryFile.publicId, 
//                     cloudinaryFile.resourceType
//                 );
//                 console.log(`Cleaned up Cloudinary file: ${cloudinaryFile.publicId}`);
//             } catch (deleteError) {
//                 console.error(`Failed to clean up Cloudinary file ${cloudinaryFile.publicId}:`, deleteError);
//             }
//         }
        
//         // Clean up: Delete any saved media documents
//         for (const mediaId of savedMediaIds) {
//             try {
//                 await Media.deleteOne({ _id: mediaId });
//             } catch (deleteError) {
//                 console.error('Media document cleanup error:', deleteError);
//             }
//         }
        
//         return res.status(500).json({
//             success: false,
//             error: 'Failed to process media files',
//             details: process.env.NODE_ENV === 'development' ? mediaError.message : undefined
//         });
//     }

//     // ========== 3. CONTENT PROCESSING ==========
//     let postTags = [];
//     let aiAnalysis = {};
    
//     if (content && content.trim()) {
//         try {
//             // Convert tags to array
//             if (tags && Array.isArray(tags)) {
//                 postTags = tags.map(tag => tag.trim().toLowerCase());
//             } else if (tags && typeof tags === 'string') {
//                 postTags = tags.split(',').map(tag => tag.trim().toLowerCase());
//             }
            
//             // Content moderation
//             const moderation = await contentModerator.moderateContent(content, {
//                 contentType: 'text',
//                 collegeId: user.academic?.collegeId,
//                 userId: user._id
//             });

//             if (!moderation.safe && moderation.flagged) {
//                 // Clean up all uploaded media
//                 for (const cloudinaryFile of uploadedToCloudinary) {
//                     try {
//                         await CloudinaryService.deleteFile(
//                             cloudinaryFile.publicId, 
//                             cloudinaryFile.resourceType
//                         );
//                     } catch (deleteError) {
//                         console.error('Cloudinary cleanup error:', deleteError);
//                     }
//                 }
                
//                 // Clean up media documents
//                 for (const mediaId of savedMediaIds) {
//                     try {
//                         await Media.deleteOne({ _id: mediaId });
//                     } catch (deleteError) {
//                         console.error('Media document cleanup error:', deleteError);
//                     }
//                 }
                
//                 return res.status(400).json({ 
//                     success: false,
//                     error: 'Content violates community guidelines',
//                     flags: moderation.categories 
//                 });
//             }

//             // Generate AI analysis if available
//             if (contentModerator.generateSummary) {
//                 try {
//                     const summary = await contentModerator.generateSummary(content, {
//                         collegeId: user.academic?.collegeId,
//                         maxLength: 150
//                     });
                    
//                     aiAnalysis = {
//                         summary: summary.summary || '',
//                         tags: postTags,
//                         sentiment: { label: 'neutral', score: 0.5 }
//                     };
//                 } catch (aiError) {
//                     console.error('AI analysis error:', aiError);
//                 }
//             }
//         } catch (contentError) {
//             console.error('Content processing error:', contentError);
//             // Continue without AI features
//         }
//     }

//     // ========== 4. CREATE THE POST ==========
//     try {
//         // Generate content ID
//         const timestamp = Date.now().toString(36);
//         const random = Math.random().toString(36).substr(2, 9);
//         const contentId = `post_${timestamp}_${random}`;

//         // Calculate word count
//         const wordCount = content ? content.split(/\s+/).filter(word => word.length > 0).length : 0;
//         const readingTime = Math.ceil(wordCount / 200);

//         // Create the post document
//         const postData = {
//             contentId,
//             authorId: user._id,
//             collegeId: user.academic?.collegeId,
//             departmentId: user.academic?.departmentId,
//             title: title.trim(),
//             subtitle: subtitle ? subtitle.trim() : undefined,
//             excerpt: excerpt ? excerpt.trim() : undefined,
//             content: {
//                 text: content ? content.trim() : '',
//                 wordCount,
//                 readingTime,
//                 language: 'en'
//             },
//             type: type,
//             category: category,
//             tags: postTags,
//             media: mediaItems,
//             featuredMedia: mediaItems.length > 0 ? mediaItems[0].mediaId : null,
//             visibility: {
//                 scope: visibility,
//                 isDraft: false,
//                 publishedAt: new Date()
//             },
//             moderation: {
//                 status: 'approved'
//             },
//             isActive: true
//         };

//         // Save the post
//         const post = new Content(postData);
//         await post.save();

//         // ========== 5. UPDATE USER STATS ==========
//         try {
//             if (user.stats?.content) {
//                 user.stats.content.posts = (user.stats.content.posts || 0) + 1;
//                 user.stats.content.totalMedia = (user.stats.content.totalMedia || 0) + mediaFiles.length;
//                 await user.save();
//             }
//         } catch (userError) {
//             console.error('User stats update error:', userError);
//         }

//         // ========== 6. PREPARE RESPONSE ==========
//         // Get populated post
//         const populatedPost = await Content.findById(post._id)
//             .populate({
//                 path: 'media.mediaId',
//                 select: 'mediaId file.url file.thumbnail file.type file.cloudinary contentInfo.title contentInfo.format contentInfo.resolution'
//             })
//             .populate({
//                 path: 'featuredMedia',
//                 select: 'mediaId file.url file.thumbnail file.type file.cloudinary'
//             })
//             .populate({
//                 path: 'authorId',
//                 select: 'profile.firstName profile.lastName profile.avatar.username'
//             })
//             .lean();

//         // Format media for response
//         const formattedMedia = populatedPost.media ? populatedPost.media.map(item => ({
//             id: item.mediaId?._id,
//             mediaId: item.mediaId?.mediaId,
//             type: item.type,
//             url: item.url,
//             thumbnail: item.thumbnail,
//             caption: item.caption,
//             order: item.order,
//             cloudinary: item.mediaId?.file?.cloudinary,
//             title: item.mediaId?.contentInfo?.title,
//             format: item.mediaId?.contentInfo?.format,
//             resolution: item.mediaId?.contentInfo?.resolution,
//             size: item.mediaId?.file?.size
//         })) : [];

//         // Send success response
//         return res.status(201).json({
//             success: true,
//             message: 'Post created successfully with Cloudinary upload',
//             data: {
//                 id: populatedPost._id,
//                 contentId: populatedPost.contentId,
//                 title: populatedPost.title,
//                 content: populatedPost.content,
//                 type: populatedPost.type,
//                 category: populatedPost.category,
//                 tags: populatedPost.tags,
//                 media: formattedMedia,
//                 mediaCount: formattedMedia.length,
//                 featuredMedia: populatedPost.featuredMedia ? {
//                     id: populatedPost.featuredMedia._id,
//                     mediaId: populatedPost.featuredMedia.mediaId,
//                     url: populatedPost.featuredMedia.file?.url,
//                     thumbnail: populatedPost.featuredMedia.file?.thumbnail,
//                     type: populatedPost.featuredMedia.file?.type,
//                     cloudinary: populatedPost.featuredMedia.file?.cloudinary
//                 } : null,
//                 author: {
//                     id: populatedPost.authorId?._id,
//                     name: `${populatedPost.authorId?.profile?.firstName || ''} ${populatedPost.authorId?.profile?.lastName || ''}`.trim(),
//                     avatar: populatedPost.authorId?.profile?.avatar?.username
//                 },
//                 visibility: populatedPost.visibility,
//                 createdAt: populatedPost.createdAt,
//                 updatedAt: populatedPost.updatedAt
//             }
//         });

//     } catch (postError) {
//         console.error('Post creation error:', postError);
        
//         // Clean up everything on error
//         // 1. Delete from Cloudinary
//         for (const cloudinaryFile of uploadedToCloudinary) {
//             try {
//                 await CloudinaryService.deleteFile(
//                     cloudinaryFile.publicId, 
//                     cloudinaryFile.resourceType
//                 );
//                 console.log(`Cleaned up Cloudinary file on error: ${cloudinaryFile.publicId}`);
//             } catch (deleteError) {
//                 console.error(`Failed to clean up Cloudinary file:`, deleteError);
//             }
//         }
        
//         // 2. Delete media documents
//         for (const mediaId of savedMediaIds) {
//             try {
//                 await Media.deleteOne({ _id: mediaId });
//             } catch (deleteError) {
//                 console.error('Media document cleanup error:', deleteError);
//             }
//         }

//         // Handle specific errors
//         if (postError.name === 'ValidationError') {
//             const errors = Object.values(postError.errors).map(err => ({
//                 field: err.path,
//                 message: err.message,
//                 value: err.value
//             }));
            
//             return res.status(400).json({
//                 success: false,
//                 error: 'Validation failed',
//                 details: errors
//             });
//         }

//         return res.status(500).json({
//             success: false,
//             error: 'Failed to create post',
//             message: process.env.NODE_ENV === 'development' ? postError.message : 'Internal server error'
//         });
//     }
// }),

//     // Get post by ID
//     getPostById: errorMiddleware.catchAsync(async (req, res) => {
//         const { postId } = req.params;
//         const user = req.user;

//         const post = await Content.findById(postId)
//             .populate('authorId', 'profile.firstName profile.lastName profile.avatar academic.role')
//             .populate('featuredMedia', 'url thumbnail')
//             .populate('media.mediaId', 'url thumbnail type');

//         if (!post) {
//             return res.status(404).json({ error: 'Post not found' });
//         }

//         // Check if user can view this post
//         if (!post.canUserAccess(user)) {
//             return res.status(403).json({ error: 'Access denied' });
//         }

//         // Increment view count
//         post.incrementView(user._id);
//         await post.save();

//         // Check if user has liked/saved the post
//         const hasUserId = (item, userId) =>
//             item &&
//             item.userId &&
//             typeof item.userId.equals === "function" &&
//             item.userId.equals(userId);
          
//           const userLiked =
//             !!(user?._id) &&
//             Array.isArray(post.engagement.likes) &&
//             post.engagement.likes.some(like => hasUserId(like, user._id));
          
//           const userSaved =
//             !!(user?._id) &&
//             Array.isArray(post.engagement.saves) &&
//             post.engagement.saves.some(save => hasUserId(save, user._id));
//           console.log("media:");
//         console.log(post.media);;
//         const response = {
//             id: post._id,
//             title: post.title,
//             content: post.content.text,
//             type: post.type,
//             category: post.category,
//             tags: post.tags,
//             author: {
//                 id: post.authorId._id,
//                 name: post.authorId.profile.fullName,
//                 avatar: post.authorId.profile.avatar?.url,
//                 role: post.authorId.academic.role
//             },
//             media: post.media.map(m => ({
//                 id: m.mediaId?._id,
//                 url: m.mediaId?.url,
//                 type: m.mediaId?.type,
//                 thumbnail: m.mediaId?.thumbnail
//             })),
//             featuredMedia: post.featuredMedia ? {
//                 id: post.featuredMedia._id,
//                 url: post.featuredMedia.url,
//                 thumbnail: post.featuredMedia.thumbnail
//             } : null,
//             engagement: {
//                 likes: post.engagement.likes.length,
//                 comments: post.engagement.comments.length,
//                 views: post.engagement.views,
//                 shares: post.engagement.shares,
//                 userLiked,
//                 userSaved
//             },
//             createdAt: post.createdAt,
//             updatedAt: post.updatedAt
//         };

//         res.json(response);
//     }),

//     // Update post
//     updatePost: errorMiddleware.catchAsync(async (req, res) => {
//         const { postId } = req.params;
//         const user = req.user;
//         const updates = req.body;

//         const post = await Content.findById(postId);
//         if (!post) {
//             return res.status(404).json({ error: 'Post not found' });
//         }

//         // Check ownership
//         if (!post.authorId.equals(user._id) && user.academic.role !== 'admin') {
//             return res.status(403).json({ error: 'Not authorized to update this post' });
//         }

//         // Update fields
//         if (updates.title) post.title = updates.title;
//         if (updates.content) post.content.text = updates.content;
//         if (updates.category) post.category = updates.category;
//         if (updates.tags) post.tags = updates.tags;
//         if (updates.visibility) post.visibility.scope = updates.visibility;

//         post.updatedAt = new Date();
//         await post.save();

//         res.json({
//             message: 'Post updated successfully',
//             post: {
//                 id: post._id,
//                 title: post.title,
//                 updatedAt: post.updatedAt
//             }
//         });
//     }),

//     // Delete post
//     deletePost: errorMiddleware.catchAsync(async (req, res) => {
//         const { postId } = req.params;
//         const user = req.user;

//         const post = await Content.findById(postId);
//         if (!post) {
//             return res.status(404).json({ error: 'Post not found' });
//         }

//         // Check permissions
//         const isOwner = post.authorId.equals(user._id);
//         const isAdmin = ['admin', 'moderator', 'college_admin'].includes(user.academic.role);
        
//         if (!isOwner && !isAdmin) {
//             return res.status(403).json({ error: 'Not authorized to delete this post' });
//         }

//         // Soft delete
//         post.isActive = false;
//         post.moderation.status = 'deleted';
//         await post.save();

//         // Update user stats
//         if (isOwner) {
//             const author = await User.findById(post.authorId);
//             if (author) {
//                 author.stats.content.posts = Math.max(0, author.stats.content.posts - 1);
//                 await author.save();
//             }
//         }

//         res.json({ message: 'Post deleted successfully' });
//     }),

//     // Like post
//     likePost: errorMiddleware.catchAsync(async (req, res) => {
//         const { postId } = req.params;
//         const user = req.user;

//         const post = await Content.findById(postId);
//         if (!post) {
//             return res.status(404).json({ error: 'Post not found' });
//         }

//         const liked = post.addLike(user._id);
//         await post.save();

//         if (liked) {
//             // Update user stats
//             user.stats.content.likesGiven += 1;
//             await user.save();

//             // Update author stats
//             const author = await User.findById(post.authorId);
//             if (author) {
//                 author.stats.content.likesReceived += 1;
//                 await author.save();
//             }

//             // TODO: Send notification to author
//         }

//         res.json({
//             liked: true,
//             likes: post.engagement.likes.length
//         });
//     }),

//     // Unlike post
//     unlikePost: errorMiddleware.catchAsync(async (req, res) => {
//         const { postId } = req.params;
//         const user = req.user;

//         const post = await Content.findById(postId);
//         if (!post) {
//             return res.status(404).json({ error: 'Post not found' });
//         }

//         const unliked = post.removeLike(user._id);
//         await post.save();

//         if (unliked) {
//             // Update user stats
//             user.stats.content.likesGiven = Math.max(0, user.stats.content.likesGiven - 1);
//             await user.save();

//             // Update author stats
//             const author = await User.findById(post.authorId);
//             if (author) {
//                 author.stats.content.likesReceived = Math.max(0, author.stats.content.likesReceived - 1);
//                 await author.save();
//             }
//         }

//         res.json({
//             liked: false,
//             likes: post.engagement.likes.length
//         });
//     }),

//     // Save post
//     savePost: errorMiddleware.catchAsync(async (req, res) => {
//         const { postId } = req.params;
//         const user = req.user;

//         const post = await Content.findById(postId);
//         if (!post) {
//             return res.status(404).json({ error: 'Post not found' });
//         }

//         // Check if already saved
//         const alreadySaved = post.engagement.saves.some(save => 
//             save.userId.equals(user._id)
//         );

//         if (!alreadySaved) {
//             post.engagement.saves.push({
//                 userId: user._id,
//                 savedAt: new Date()
//             });
//             await post.save();
//         }

//         res.json({ saved: true });
//     }),

//     // Unsave post
//     unsavePost: errorMiddleware.catchAsync(async (req, res) => {
//         const { postId } = req.params;
//         const user = req.user;

//         const post = await Content.findById(postId);
//         if (!post) {
//             return res.status(404).json({ error: 'Post not found' });
//         }

//         post.engagement.saves = post.engagement.saves.filter(save => 
//             !save.userId.equals(user._id)
//         );
//         await post.save();

//         res.json({ saved: false });
//     }),

//     // Share post
//     sharePost: errorMiddleware.catchAsync(async (req, res) => {
//         const { postId } = req.params;
//         const user = req.user;

//         const post = await Content.findById(postId);
//         if (!post) {
//             return res.status(404).json({ error: 'Post not found' });
//         }

//         post.engagement.shares += 1;
//         await post.save();

//         // Update user stats
//         user.stats.content.shares += 1;
//         await user.save();

//         res.json({
//             shared: true,
//             shares: post.engagement.shares
//         });
//     }),

//     // Report post
//     reportPost: errorMiddleware.catchAsync(async (req, res) => {
//         const { postId } = req.params;
//         const { reason } = req.body;
//         const user = req.user;

//         const post = await Content.findById(postId);
//         if (!post) {
//             return res.status(404).json({ error: 'Post not found' });
//         }

//         // Add report flag
//         post.moderation.flags.push({
//             type: 'user_report',
//             flaggedBy: user._id,
//             flaggedAt: new Date(),
//             reason: reason || 'User reported',
//             aiConfidence: 0.8
//         });

//         post.moderation.requiresManualReview = true;
//         await post.save();

//         res.json({ message: 'Post reported successfully' });
//     }),

//     // Get moderation queue
//     getModerationQueue: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.user.academic;

//         const queue = await Content.find({
//             collegeId,
//             'moderation.status': 'pending',
//             'moderation.requiresManualReview': true
//         })
//         .select('title type category createdAt moderation.flags')
//         .populate('authorId', 'profile.firstName profile.lastName academic.role')
//         .sort({ createdAt: 1 })
//         .limit(50);

//         res.json({ queue });
//     }),

//     // Approve content
//     approveContent: errorMiddleware.catchAsync(async (req, res) => {
//         const { contentId } = req.params;
//         const moderator = req.user;

//         const content = await Content.findById(contentId);
//         if (!content) {
//             return res.status(404).json({ error: 'Content not found' });
//         }

//         content.moderation.status = 'approved';
//         content.moderation.reviewedBy = moderator._id;
//         content.moderation.reviewedAt = new Date();
//         await content.save();

//         res.json({ message: 'Content approved' });
//     }),

//     // Reject content
//     rejectContent: errorMiddleware.catchAsync(async (req, res) => {
//         const { contentId } = req.params;
//         const { reason } = req.body;
//         const moderator = req.user;

//         const content = await Content.findById(contentId);
//         if (!content) {
//             return res.status(404).json({ error: 'Content not found' });
//         }

//         content.moderation.status = 'rejected';
//         content.moderation.reviewedBy = moderator._id;
//         content.moderation.reviewedAt = new Date();
//         content.isActive = false;
        
//         if (reason) {
//             content.moderation.flags.push({
//                 type: 'moderator_rejection',
//                 flaggedBy: moderator._id,
//                 flaggedAt: new Date(),
//                 reason
//             });
//         }

//         await content.save();

//         res.json({ message: 'Content rejected' });
//     })
// };

// module.exports = postController;

const Content = require('../../models/content/Content.model');
const Media = require('../../models/content/Media.model');
const ContentModerator = require('../../services/ai/ContentModerator');
const Pagination = require('../../utils/pagination');
const errorMiddleware  = require('../../middleware/error.middleware');
const User = require('../../models/user/User.model');
const Analytics = require('../../models/analytics/Analytics.model');
const CloudinaryService = require('../../services/cloudinary/cloudinaryService');
const fs = require('fs').promises;

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

        // Track content view in analytics
        await updateContentAnalytics(collegeId, 'content_views', {
            views: result.data.length,
            type: 'list_view'
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

        // Track feed view in analytics
        await updateUserAnalytics(user._id, {
            activity: {
                sessions: {
                    count: 1
                },
                lastActive: new Date()
            }
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

        // Track trending view in analytics
        await updateContentAnalytics(collegeId, 'trending_views', {
            timeframe: timeframe,
            postsCount: trendingPosts.length
        });

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

        // Track search in analytics
        await updateContentAnalytics(collegeId, 'content_searches', {
            searchTerm: searchTerm,
            resultsCount: results.posts?.length || 0
        });

        res.json(results);
    }),

    createPost: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const { 
            title, 
            content, 
            type = 'post', 
            category = 'general', 
            visibility = 'college', 
            tags = [],
            mediaCaptions = [],
            subtitle,
            excerpt 
        } = req.body;
        
        const mediaFiles = req.files || [];

        // ========== 1. BASIC VALIDATION ==========
        if (!title || !title.trim()) {
            return res.status(400).json({ 
                success: false,
                error: 'Title is required' 
            });
        }

        if (visibility === 'department' && !user.academic?.departmentId) {
            return res.status(400).json({ 
                success: false,
                error: 'Cannot post to department without department affiliation' 
            });
        }

        // ========== 2. CLOUDINARY MEDIA UPLOAD ==========
        const mediaItems = [];
        const savedMediaIds = [];
        const uploadedToCloudinary = []; // Track files uploaded to Cloudinary

        try {
            // Process each media file
            for (let i = 0; i < mediaFiles.length; i++) {
                const file = mediaFiles[i];
                
                // Get caption (if any)
                let caption = '';
                if (mediaCaptions && Array.isArray(mediaCaptions)) {
                    caption = mediaCaptions[i] || '';
                } else if (mediaCaptions && typeof mediaCaptions === 'string') {
                    try {
                        const parsed = JSON.parse(mediaCaptions);
                        if (Array.isArray(parsed)) {
                            caption = parsed[i] || '';
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }

                // Upload to Cloudinary
                console.log(`Uploading ${file.originalname} to Cloudinary...`);
                const cloudinaryResult = await CloudinaryService.uploadMediaFile(
                    file, 
                    user, 
                    user.academic?.collegeId?.toString()
                );

                if (!cloudinaryResult.success) {
                    throw new Error(`Failed to upload ${file.originalname}: ${cloudinaryResult.error}`);
                }

                const cloudinaryData = cloudinaryResult.data;
                uploadedToCloudinary.push({
                    publicId: cloudinaryData.public_id,
                    resourceType: cloudinaryData.resource_type,
                    filePath: file.path
                });

                // Generate unique media ID
                const timestamp = Date.now().toString(36);
                const random = Math.random().toString(36).substr(2, 9);
                const mediaId = `media_${timestamp}_${random}`;
                
                // Create Media document with Cloudinary URLs
                const mediaDoc = {
                    mediaId,
                    uploadedBy: user._id,
                    collegeId: user.academic?.collegeId,
                    departmentId: user.academic?.departmentId,
                    originalName: file.originalname,
                    file: {
                        url: cloudinaryData.url,
                        type: cloudinaryData.resource_type,
                        size: cloudinaryData.bytes,
                        mimeType: file.mimetype,
                        filename: file.filename,
                        path: file.path,
                        thumbnail: cloudinaryData.thumbnail_url,
                        cloudinary: {
                            public_id: cloudinaryData.public_id,
                            resource_type: cloudinaryData.resource_type,
                            format: cloudinaryData.format,
                            width: cloudinaryData.width,
                            height: cloudinaryData.height,
                            duration: cloudinaryData.duration,
                            raw_response: cloudinaryData.raw
                        }
                    },
                    type: cloudinaryData.resource_type,
                    category: 'post',
                    permissions: {
                        visibility: 'college',
                        downloadable: true,
                        shareable: true,
                        requiresAuth: true
                    },
                    processing: {
                        status: 'ready',
                        progress: 100,
                        processedAt: new Date(),
                        transformations: cloudinaryData.resource_type === 'image' ? [{
                            type: 'thumbnail',
                            url: cloudinaryData.thumbnail_url,
                            size: cloudinaryData.bytes,
                            createdAt: new Date()
                        }] : []
                    },
                    contentInfo: {
                        title: file.originalname,
                        format: cloudinaryData.format,
                        resolution: cloudinaryData.width && cloudinaryData.height 
                            ? `${cloudinaryData.width}x${cloudinaryData.height}` 
                            : null,
                        duration: cloudinaryData.duration,
                        quality: 'high'
                    },
                    storage: {
                        provider: 'cloudinary',
                        bucket: 'college_updates',
                        region: 'auto',
                        path: cloudinaryData.public_id,
                        urls: {
                            raw: cloudinaryData.url,
                            optimized: CloudinaryService.generateOptimizedUrl(cloudinaryData.url, { 
                                width: 800, 
                                quality: 80 
                            }),
                            thumbnail: cloudinaryData.thumbnail_url,
                            preview: cloudinaryData.thumbnail_url
                        }
                    },
                    moderation: {
                        status: 'approved'
                    },
                    isActive: true
                };

                const media = new Media(mediaDoc);
                const savedMedia = await media.save();
                savedMediaIds.push(savedMedia._id);

                // Create media item for post
                const mediaItem = {
                    mediaId: savedMedia._id,
                    type: cloudinaryData.resource_type,
                    url: cloudinaryData.url,
                    thumbnail: cloudinaryData.thumbnail_url,
                    caption: caption,
                    order: i
                };

                console.log(`Successfully uploaded: ${file.originalname} -> ${cloudinaryData.url}`);
                mediaItems.push(mediaItem);

                // Clean up local file after successful Cloudinary upload
                try {
                    await fs.unlink(file.path);
                    console.log(`Cleaned up local file: ${file.path}`);
                } catch (cleanupError) {
                    console.error(`Failed to clean up local file ${file.path}:`, cleanupError);
                }
            }
        } catch (mediaError) {
            console.error('Media processing error:', mediaError);
            
            // Clean up: Delete from Cloudinary if uploaded
            for (const cloudinaryFile of uploadedToCloudinary) {
                try {
                    await CloudinaryService.deleteFile(
                        cloudinaryFile.publicId, 
                        cloudinaryFile.resourceType
                    );
                    console.log(`Cleaned up Cloudinary file: ${cloudinaryFile.publicId}`);
                } catch (deleteError) {
                    console.error(`Failed to clean up Cloudinary file ${cloudinaryFile.publicId}:`, deleteError);
                }
            }
            
            // Clean up: Delete any saved media documents
            for (const mediaId of savedMediaIds) {
                try {
                    await Media.deleteOne({ _id: mediaId });
                } catch (deleteError) {
                    console.error('Media document cleanup error:', deleteError);
                }
            }
            
            return res.status(500).json({
                success: false,
                error: 'Failed to process media files',
                details: process.env.NODE_ENV === 'development' ? mediaError.message : undefined
            });
        }

        // ========== 3. CONTENT PROCESSING ==========
        let postTags = [];
        let aiAnalysis = {};
        
        if (content && content.trim()) {
            try {
                // Convert tags to array
                if (tags && Array.isArray(tags)) {
                    postTags = tags.map(tag => tag.trim().toLowerCase());
                } else if (tags && typeof tags === 'string') {
                    postTags = tags.split(',').map(tag => tag.trim().toLowerCase());
                }
                
                // Content moderation
                const moderation = await contentModerator.moderateContent(content, {
                    contentType: 'text',
                    collegeId: user.academic?.collegeId,
                    userId: user._id
                });

                if (!moderation.safe && moderation.flagged) {
                    // Clean up all uploaded media
                    for (const cloudinaryFile of uploadedToCloudinary) {
                        try {
                            await CloudinaryService.deleteFile(
                                cloudinaryFile.publicId, 
                                cloudinaryFile.resourceType
                            );
                        } catch (deleteError) {
                            console.error('Cloudinary cleanup error:', deleteError);
                        }
                    }
                    
                    // Clean up media documents
                    for (const mediaId of savedMediaIds) {
                        try {
                            await Media.deleteOne({ _id: mediaId });
                        } catch (deleteError) {
                            console.error('Media document cleanup error:', deleteError);
                        }
                    }
                    
                    return res.status(400).json({ 
                        success: false,
                        error: 'Content violates community guidelines',
                        flags: moderation.categories 
                    });
                }

                // Generate AI analysis if available
                if (contentModerator.generateSummary) {
                    try {
                        const summary = await contentModerator.generateSummary(content, {
                            collegeId: user.academic?.collegeId,
                            maxLength: 150
                        });
                        
                        aiAnalysis = {
                            summary: summary.summary || '',
                            tags: postTags,
                            sentiment: { label: 'neutral', score: 0.5 }
                        };
                    } catch (aiError) {
                        console.error('AI analysis error:', aiError);
                    }
                }
            } catch (contentError) {
                console.error('Content processing error:', contentError);
                // Continue without AI features
            }
        }

        // ========== 4. CREATE THE POST ==========
        try {
            // Generate content ID
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substr(2, 9);
            const contentId = `post_${timestamp}_${random}`;

            // Calculate word count
            const wordCount = content ? content.split(/\s+/).filter(word => word.length > 0).length : 0;
            const readingTime = Math.ceil(wordCount / 200);

            // Create the post document
            const postData = {
                contentId,
                authorId: user._id,
                collegeId: user.academic?.collegeId,
                departmentId: user.academic?.departmentId,
                title: title.trim(),
                subtitle: subtitle ? subtitle.trim() : undefined,
                excerpt: excerpt ? excerpt.trim() : undefined,
                content: {
                    text: content ? content.trim() : '',
                    wordCount,
                    readingTime,
                    language: 'en'
                },
                type: type,
                category: category,
                tags: postTags,
                media: mediaItems,
                featuredMedia: mediaItems.length > 0 ? mediaItems[0].mediaId : null,
                visibility: {
                    scope: visibility,
                    isDraft: false,
                    publishedAt: new Date()
                },
                moderation: {
                    status: 'approved'
                },
                isActive: true
            };

            // Save the post
            const post = new Content(postData);
            await post.save();

            // ========== 5. UPDATE USER STATS ==========
            try {
                if (user.stats?.content) {
                    user.stats.content.posts = (user.stats.content.posts || 0) + 1;
                    user.stats.content.totalMedia = (user.stats.content.totalMedia || 0) + mediaFiles.length;
                    await user.save();
                }
            } catch (userError) {
                console.error('User stats update error:', userError);
            }

            // ========== 6. TRACK ANALYTICS ==========
            // Track post creation in analytics
            await Promise.all([
                updateContentAnalytics(user.academic.collegeId, 'content_created', {
                    type: type,
                    category: category,
                    mediaCount: mediaFiles.length,
                    wordCount: wordCount
                }),
                
                updateUserAnalytics(user._id, {
                    content: {
                        created: {
                            posts: 1,
                            media: mediaFiles.length
                        }
                    },
                    activity: {
                        lastActive: new Date()
                    }
                })
            ]);

            // ========== 7. PREPARE RESPONSE ==========
            // Get populated post
            const populatedPost = await Content.findById(post._id)
                .populate({
                    path: 'media.mediaId',
                    select: 'mediaId file.url file.thumbnail file.type file.cloudinary contentInfo.title contentInfo.format contentInfo.resolution'
                })
                .populate({
                    path: 'featuredMedia',
                    select: 'mediaId file.url file.thumbnail file.type file.cloudinary'
                })
                .populate({
                    path: 'authorId',
                    select: 'profile.firstName profile.lastName profile.avatar.username'
                })
                .lean();

            // Format media for response
            const formattedMedia = populatedPost.media ? populatedPost.media.map(item => ({
                id: item.mediaId?._id,
                mediaId: item.mediaId?.mediaId,
                type: item.type,
                url: item.url,
                thumbnail: item.thumbnail,
                caption: item.caption,
                order: item.order,
                cloudinary: item.mediaId?.file?.cloudinary,
                title: item.mediaId?.contentInfo?.title,
                format: item.mediaId?.contentInfo?.format,
                resolution: item.mediaId?.contentInfo?.resolution,
                size: item.mediaId?.file?.size
            })) : [];

            // Send success response
            return res.status(201).json({
                success: true,
                message: 'Post created successfully with Cloudinary upload',
                data: {
                    id: populatedPost._id,
                    contentId: populatedPost.contentId,
                    title: populatedPost.title,
                    content: populatedPost.content,
                    type: populatedPost.type,
                    category: populatedPost.category,
                    tags: populatedPost.tags,
                    media: formattedMedia,
                    mediaCount: formattedMedia.length,
                    featuredMedia: populatedPost.featuredMedia ? {
                        id: populatedPost.featuredMedia._id,
                        mediaId: populatedPost.featuredMedia.mediaId,
                        url: populatedPost.featuredMedia.file?.url,
                        thumbnail: populatedPost.featuredMedia.file?.thumbnail,
                        type: populatedPost.featuredMedia.file?.type,
                        cloudinary: populatedPost.featuredMedia.file?.cloudinary
                    } : null,
                    author: {
                        id: populatedPost.authorId?._id,
                        name: `${populatedPost.authorId?.profile?.firstName || ''} ${populatedPost.authorId?.profile?.lastName || ''}`.trim(),
                        avatar: populatedPost.authorId?.profile?.avatar?.username
                    },
                    visibility: populatedPost.visibility,
                    createdAt: populatedPost.createdAt,
                    updatedAt: populatedPost.updatedAt
                }
            });

        } catch (postError) {
            console.error('Post creation error:', postError);
            
            // Clean up everything on error
            // 1. Delete from Cloudinary
            for (const cloudinaryFile of uploadedToCloudinary) {
                try {
                    await CloudinaryService.deleteFile(
                        cloudinaryFile.publicId, 
                        cloudinaryFile.resourceType
                    );
                    console.log(`Cleaned up Cloudinary file on error: ${cloudinaryFile.publicId}`);
                } catch (deleteError) {
                    console.error(`Failed to clean up Cloudinary file:`, deleteError);
                }
            }
            
            // 2. Delete media documents
            for (const mediaId of savedMediaIds) {
                try {
                    await Media.deleteOne({ _id: mediaId });
                } catch (deleteError) {
                    console.error('Media document cleanup error:', deleteError);
                }
            }

            // Handle specific errors
            if (postError.name === 'ValidationError') {
                const errors = Object.values(postError.errors).map(err => ({
                    field: err.path,
                    message: err.message,
                    value: err.value
                }));
                
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Failed to create post',
                message: process.env.NODE_ENV === 'development' ? postError.message : 'Internal server error'
            });
        }
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
        const hasUserId = (item, userId) =>
            item &&
            item.userId &&
            typeof item.userId.equals === "function" &&
            item.userId.equals(userId);
          
          const userLiked =
            !!(user?._id) &&
            Array.isArray(post.engagement.likes) &&
            post.engagement.likes.some(like => hasUserId(like, user._id));
          
          const userSaved =
            !!(user?._id) &&
            Array.isArray(post.engagement.saves) &&
            post.engagement.saves.some(save => hasUserId(save, user._id));
          console.log("media:");
        console.log(post.media);

        // Track content view in analytics
        await Promise.all([
            updateContentAnalytics(post.collegeId, 'content_views', {
                contentId: postId,
                type: 'single_view'
            }),
            
            updateUserAnalytics(user._id, {
                activity: {
                    lastActive: new Date(),
                    sessions: {
                        count: 1
                    }
                }
            })
        ]);

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
            featuredMedia: post.featuredMedia ? {
                id: post.featuredMedia._id,
                url: post.featuredMedia.url,
                thumbnail: post.featuredMedia.thumbnail
            } : null,
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

        // Track post update in analytics
        await updateContentAnalytics(post.collegeId, 'content_updated', {
            contentId: postId,
            updatedFields: Object.keys(updates)
        });

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

        // Track post deletion in analytics
        await updateContentAnalytics(post.collegeId, 'content_deleted', {
            contentId: postId,
            deletedBy: user._id,
            userRole: user.academic.role,
            contentType: post.type,
            mediaCount: post.media.length
        });

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

            // Track like in analytics
            await Promise.all([
                updateContentAnalytics(post.collegeId, 'content_likes', {
                    contentId: postId,
                    contentType: post.type,
                    authorId: post.authorId
                }),
                
                updateUserAnalytics(user._id, {
                    content: {
                        engagement: {
                            likesGiven: 1
                        }
                    }
                }),
                
                updateUserAnalytics(post.authorId, {
                    content: {
                        engagement: {
                            likesReceived: 1
                        }
                    }
                })
            ]);

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

            // Track unlike in analytics
            await updateContentAnalytics(post.collegeId, 'content_unlikes', {
                contentId: postId,
                contentType: post.type
            });
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

            // Track save in analytics
            await updateContentAnalytics(post.collegeId, 'content_saves', {
                contentId: postId,
                contentType: post.type
            });
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

        // Track unsave in analytics
        await updateContentAnalytics(post.collegeId, 'content_unsaves', {
            contentId: postId,
            contentType: post.type
        });

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

        // Track share in analytics
        await updateContentAnalytics(post.collegeId, 'content_shares', {
            contentId: postId,
            contentType: post.type
        });

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

        // Track report in analytics
        await updateContentAnalytics(post.collegeId, 'content_reports', {
            contentId: postId,
            reason: reason || 'User reported'
        });

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

        // Track approval in analytics
        await updateContentAnalytics(content.collegeId, 'content_approved', {
            contentId: contentId,
            contentType: content.type,
            moderatedBy: moderator._id
        });

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

        // Track rejection in analytics
        await updateContentAnalytics(content.collegeId, 'content_rejected', {
            contentId: contentId,
            contentType: content.type,
            reason: reason || 'Moderator rejection',
            moderatedBy: moderator._id
        });

        res.json({ message: 'Content rejected' });
    })
};

// Analytics Helper Functions
async function updateContentAnalytics(collegeId, metric, details = {}) {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let analytics = await Analytics.findOne({
            collegeId,
            period: 'daily',
            timestamp: { 
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (!analytics) {
            analytics = new Analytics({
                collegeId,
                period: 'daily',
                timestamp: today,
                users: { total: 0, active: 0, new: 0 },
                content: { total: 0 },
                engagement: { totalInteractions: 0 }
            });
        }

        // Update content metrics
        switch (metric) {
            case 'content_created':
                analytics.content.total = (analytics.content.total || 0) + 1;
                if (details.type) {
                    if (!analytics.content.byType) {
                        analytics.content.byType = new Map();
                    }
                    const current = analytics.content.byType.get(details.type) || 0;
                    analytics.content.byType.set(details.type, current + 1);
                }
                if (details.category) {
                    if (!analytics.content.byCategory) {
                        analytics.content.byCategory = new Map();
                    }
                    const current = analytics.content.byCategory.get(details.category) || 0;
                    analytics.content.byCategory.set(details.category, current + 1);
                }
                break;
                
            case 'content_views':
                analytics.engagement.views = (analytics.engagement.views || 0) + 1;
                analytics.engagement.totalInteractions = (analytics.engagement.totalInteractions || 0) + 1;
                break;
                
            case 'content_likes':
                analytics.engagement.likes = (analytics.engagement.likes || 0) + 1;
                analytics.engagement.totalInteractions = (analytics.engagement.totalInteractions || 0) + 1;
                break;
                
            case 'content_unlikes':
                analytics.engagement.likes = Math.max(0, (analytics.engagement.likes || 1) - 1);
                break;
                
            case 'content_saves':
                analytics.engagement.saves = (analytics.engagement.saves || 0) + 1;
                break;
                
            case 'content_shares':
                analytics.engagement.shares = (analytics.engagement.shares || 0) + 1;
                analytics.engagement.totalInteractions = (analytics.engagement.totalInteractions || 0) + 1;
                break;
                
            case 'content_updated':
                analytics.content.updates = (analytics.content.updates || 0) + 1;
                break;
                
            case 'content_deleted':
                analytics.content.total = Math.max(0, (analytics.content.total || 1) - 1);
                break;
                
            case 'content_approved':
                analytics.content.approved = (analytics.content.approved || 0) + 1;
                break;
                
            case 'content_rejected':
                analytics.content.rejected = (analytics.content.rejected || 0) + 1;
                break;
                
            case 'content_reports':
                analytics.content.reports = (analytics.content.reports || 0) + 1;
                break;
        }

        await analytics.save();
    } catch (error) {
        console.error('Error updating content analytics:', error);
    }
}

async function updateUserAnalytics(userId, updates) {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let userAnalytics = await require('../../models/analytics/userAnalytics.model').findOne({
            userId,
            period: 'daily',
            date: { 
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (!userAnalytics) {
            userAnalytics = new (require('../../models/analytics/userAnalytics.model'))({
                userId,
                collegeId: user.academic.collegeId,
                period: 'daily',
                date: today,
                activity: {
                    sessions: { count: 0 },
                    logins: 0
                },
                content: {
                    created: { posts: 0, comments: 0, media: 0 },
                    engagement: { likesGiven: 0, likesReceived: 0 }
                }
            });
        }

        // Apply updates
        if (updates.activity) {
            if (updates.activity.logins) {
                userAnalytics.activity.logins += updates.activity.logins;
            }
            if (updates.activity.lastActive) {
                userAnalytics.activity.lastActive = updates.activity.lastActive;
            }
            if (updates.activity.sessions?.count) {
                userAnalytics.activity.sessions.count += updates.activity.sessions.count;
            }
        }

        if (updates.content) {
            userAnalytics.content = {
                ...userAnalytics.content,
                ...updates.content
            };
        }

        await userAnalytics.calculateScores();
        await userAnalytics.save();
    } catch (error) {
        console.error('Error updating user analytics:', error);
    }
}

module.exports = postController;