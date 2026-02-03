const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { BaseSchema, AIEnrichedSchema, TimestampsPlugin } = require('../shared/BaseSchema');
const { UserRoles, Visibility } = require('../shared/enums');
const { ContactSchema, StatsSchema } = require('../shared/types');

const userSchema = new mongoose.Schema({
    // Unique Identifiers
    uid: { 
        type: String, 
        default: () => `user_${crypto.randomBytes(8).toString('hex')}`,
        immutable: true 
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
        type: String,
        sparse: true,
        trim: true
    },

    // Profile Information
    profile: {
        firstName: { 
            type: String, 
            required: [true, 'First name is required'],
            trim: true 
        },
        lastName: { 
            type: String, 
            trim: true 
        },
        displayName: { 
            type: String, 
            trim: true 
        },
        avatar: {
            url: String,
            thumbnail: String,
            provider: { type: String, enum: ['gravatar', 'upload', 'social'], default: 'gravatar' }
        },
        bio: { 
            type: String, 
            maxlength: [500, 'Bio cannot exceed 500 characters'],
            default: '' 
        },
        pronouns: String,
        dateOfBirth: Date,
        gender: {
            type: String,
            enum: ['male', 'female', 'non-binary', 'prefer-not-to-say', 'other']
        },
        links: [{
            platform: String,
            url: String,
            isPublic: { type: Boolean, default: true }
        }],
        skills: [{ 
            type: String, 
            lowercase: true,
            trim: true 
        }],
        interests: [{ 
            type: String, 
            lowercase: true,
            trim: true 
        }]
    },

    // Academic Information
    academic: {
        collegeId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'College',
            required: true,
            index: true 
        },
        role: {
            type: String,
            enum: Object.values(UserRoles),
            default: UserRoles.STUDENT,
            index: true
        },
        departmentId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Department' 
        },
        departmentName: String,
        batch: {
            startYear: Number,
            endYear: Number,
            name: String // e.g., "2023-2027"
        },
        rollNumber: {
            type: String,
            sparse: true
        },
        studentId: String,
        degree: String,
        specialization: String,
        currentSemester: Number,
        cgpa: Number,
        enrollmentDate: Date,
        graduationDate: Date,
        isAlumni: { type: Boolean, default: false }
    },

    // Authentication & Security
    auth: {
        passwordHash: { 
            type: String, 
            required: true,
            select: false 
        },
        emailVerified: { 
            type: Boolean, 
            default: false 
        },
        phoneVerified: { 
            type: Boolean, 
            default: false 
        },
        twoFactorEnabled: { 
            type: Boolean, 
            default: false 
        },
        twoFactorSecret: {
            type: String,
            select: false
        },
        lastLogin: Date,
        lastPasswordChange: Date,
        passwordResetToken: String,
        passwordResetExpires: Date,
        emailVerificationToken: String,
        emailVerificationExpires: Date,
        failedLoginAttempts: { 
            type: Number, 
            default: 0 
        },
        accountLockedUntil: Date,
        loginHistory: [{
            timestamp: { type: Date, default: Date.now },
            ip: String,
            userAgent: String,
            device: String,
            location: Object,
            success: Boolean
        }]
    },

    // Privacy & Settings
    settings: {
        privacy: {
            profileVisibility: {
                type: String,
                enum: Object.values(Visibility),
                default: Visibility.COLLEGE
            },
            showEmail: { type: Boolean, default: false },
            showPhone: { type: Boolean, default: false },
            showActivity: { type: Boolean, default: true },
            allowMessages: { 
                type: String, 
                enum: ['everyone', 'college', 'followers', 'none'],
                default: 'college'
            },
            searchable: { type: Boolean, default: true }
        },
        notifications: {
            email: {
                enabled: { type: Boolean, default: true },
                frequency: { type: String, enum: ['instant', 'daily', 'weekly'], default: 'instant' }
            },
            push: { type: Boolean, default: true },
            inApp: { type: Boolean, default: true },
            types: {
                likes: { type: Boolean, default: true },
                comments: { type: Boolean, default: true },
                follows: { type: Boolean, default: true },
                mentions: { type: Boolean, default: true },
                announcements: { type: Boolean, default: true },
                events: { type: Boolean, default: true },
                jobs: { type: Boolean, default: true }
            }
        },
        preferences: {
            theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
            language: { type: String, default: 'en' },
            timezone: String,
            emailDigest: { type: Boolean, default: true }
        }
    },

    // Social Graph
    social: {
        followers: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        }],
        following: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        }],
        followingColleges: [{
            collegeId: mongoose.Schema.Types.ObjectId,
            followedAt: Date
        }],
        followingDepartments: [mongoose.Schema.Types.ObjectId],
        blockedUsers: [mongoose.Schema.Types.ObjectId],
        blockedBy: [mongoose.Schema.Types.ObjectId],
        connections: [{
            userId: mongoose.Schema.Types.ObjectId,
            connectedAt: Date,
            strength: Number // AI-calculated connection strength
        }],
        friendRequests: {
            sent: [mongoose.Schema.Types.ObjectId],
            received: [mongoose.Schema.Types.ObjectId]
        }
    },

    // AI-Powered Personalization
    aiProfile: {
        // AI-Detected Interests
        detectedInterests: [{
            topic: String,
            confidence: Number,
            source: String, // 'posts', 'searches', 'interactions'
            lastEngaged: Date
        }],
        
        // Learning Patterns
        learningStyle: {
            type: String,
            enum: ['visual', 'auditory', 'reading', 'kinesthetic', 'mixed']
        },
        
        // Activity Patterns
        activityPattern: {
            peakHours: [Number], // 0-23
            preferredDays: [Number], // 0-6
            avgSessionDuration: Number
        },
        
        // Personality Insights
        personalityTraits: {
            openness: Number,
            conscientiousness: Number,
            extraversion: Number,
            agreeableness: Number,
            neuroticism: Number
        },
        
        // Recommendations
        recommendedContent: [{
            contentId: mongoose.Schema.Types.ObjectId,
            reason: String,
            score: Number,
            shownAt: Date,
            interacted: Boolean
        }],
        
        recommendedUsers: [{
            userId: mongoose.Schema.Types.ObjectId,
            reason: String,
            score: Number,
            suggestedAt: Date
        }],
        
        // Engagement Metrics
        engagementScore: {
            daily: Number,
            weekly: Number,
            monthly: Number,
            trend: String // 'increasing', 'decreasing', 'stable'
        },
        
        // Content Creation Style
        contentStyle: {
            avgPostLength: Number,
            preferredMedia: [String],
            commonTopics: [String],
            sentiment: {
                positive: Number,
                neutral: Number,
                negative: Number
            }
        }
    },

    // Statistics & Analytics
    stats: {
        content: {
            posts: { type: Number, default: 0 },
            comments: { type: Number, default: 0 },
            likesGiven: { type: Number, default: 0 },
            likesReceived: { type: Number, default: 0 },
            shares: { type: Number, default: 0 },
            saves: { type: Number, default: 0 }
        },
        engagement: {
            totalViews: { type: Number, default: 0 },
            avgEngagementRate: Number,
            mostEngagedPost: mongoose.Schema.Types.ObjectId,
            mostEngagedTopic: String
        },
        social: {
            followerGrowth: [{
                date: Date,
                count: Number
            }],
            followingGrowth: [{
                date: Date,
                count: Number
            }]
        },
        activity: {
            lastActive: Date,
            currentStreak: { type: Number, default: 0 },
            longestStreak: { type: Number, default: 0 },
            totalSessions: { type: Number, default: 0 },
            avgSessionTime: Number,
            loginCount: { type: Number, default: 0 }
        }
    },

    // Badges & Achievements
    achievements: {
        badges: [{
            badgeId: String,
            name: String,
            description: String,
            icon: String,
            earnedAt: Date,
            category: String,
            level: Number
        }],
        points: {
            total: { type: Number, default: 0 },
            available: { type: Number, default: 0 },
            spent: { type: Number, default: 0 }
        },
        level: {
            current: { type: Number, default: 1 },
            xp: { type: Number, default: 0 },
            nextLevelXp: { type: Number, default: 100 }
        }
    },

    // Contact Information (Separate from profile)
    contact: ContactSchema,

    // Status & Flags
    status: {
        isOnline: { type: Boolean, default: false },
        lastSeen: Date,
        statusMessage: String,
        isBusy: { type: Boolean, default: false },
        doNotDisturb: { type: Boolean, default: false }
    },

    // Moderation & Compliance
    moderation: {
        warnings: [{
            reason: String,
            severity: { type: String, enum: ['low', 'medium', 'high'] },
            issuedBy: mongoose.Schema.Types.ObjectId,
            issuedAt: Date,
            expiresAt: Date,
            notes: String
        }],
        strikes: { type: Number, default: 0 },
        isSuspended: { type: Boolean, default: false },
        suspensionEnds: Date,
        isBanned: { type: Boolean, default: false },
        banReason: String,
        bannedAt: Date,
        reviewedBy: mongoose.Schema.Types.ObjectId
    },

    // External Integrations
    integrations: {
        googleId: String,
        githubId: String,
        linkedinId: String,
        microsoftId: String,
        lastSync: Date
    },

    // AI Enrichment
    ...AIEnrichedSchema,

    // Base Schema
    ...BaseSchema
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Apply Timestamps Plugin
TimestampsPlugin(userSchema);

// Virtual Fields
userSchema.virtual('profile.fullName').get(function() {
    return `${this.profile.firstName} ${this.profile.lastName}`.trim();
});

userSchema.virtual('profile.initials').get(function() {
    const first = this.profile.firstName?.[0] || '';
    const last = this.profile.lastName?.[0] || '';
    return (first + last).toUpperCase();
});

userSchema.virtual('academic.isCurrentStudent').get(function() {
    if (!this.academic.graduationDate) return true;
    return new Date() < this.academic.graduationDate;
});

userSchema.virtual('stats.engagement.followerCount').get(function() {
    return this.social.followers?.length || 0;
});

userSchema.virtual('stats.engagement.followingCount').get(function() {
    return this.social.following?.length || 0;
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ uid: 1 }, { unique: true });
userSchema.index({ 'academic.collegeId': 1, 'academic.role': 1 });
userSchema.index({ 'academic.collegeId': 1, 'academic.departmentId': 1 });
userSchema.index({ 'academic.batch.startYear': 1, 'academic.batch.endYear': 1 });
userSchema.index({ 'profile.firstName': 'text', 'profile.lastName': 'text', 'profile.displayName': 'text' });
userSchema.index({ 'ai.tags': 1 });
userSchema.index({ 'stats.activity.lastActive': -1 });
userSchema.index({ 'moderation.isSuspended': 1, 'moderation.isBanned': 1 });

// Middleware
userSchema.pre('save', async function() {
    // Update display name if not set
    if (!this.profile.displayName) {
        this.profile.displayName = this.profile.fullName;
    }
    
    // Update avatar if not set
    if (!this.profile.avatar?.url) {
        const hash = crypto.createHash('md5').update(this.email.trim().toLowerCase()).digest('hex');
        this.profile.avatar = {
            url: `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`,
            provider: 'gravatar'
        };
    }
    
    // Update batch name
    if (this.academic.startYear && this.academic.endYear && !this.academic.batch.name) {
        this.academic.batch.name = `${this.academic.startYear}-${this.academic.endYear}`;
    }
    
});

userSchema.pre('save', async function() {
    if (this.isModified('auth.passwordHash')) {
        this.auth.lastPasswordChange = new Date();
    }
});

// Methods
userSchema.methods.verifyPassword = async function(password) {
    return bcrypt.compare(password, this.auth.passwordHash);
};

userSchema.methods.generatePasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.auth.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    this.auth.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    return resetToken;
};

userSchema.methods.generateEmailVerificationToken = function() {
    const token = crypto.randomBytes(32).toString('hex');
    this.auth.emailVerificationToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    this.auth.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return token;
};

userSchema.methods.incrementStreak = function() {
    const now = new Date();
    const yesterday = new Date(now.setDate(now.getDate() - 1));
    
    if (!this.stats.activity.lastActive || 
        this.stats.activity.lastActive < yesterday) {
        this.stats.activity.currentStreak = 1;
    } else {
        this.stats.activity.currentStreak += 1;
    }
    
    if (this.stats.activity.currentStreak > this.stats.activity.longestStreak) {
        this.stats.activity.longestStreak = this.stats.activity.currentStreak;
    }
    
    this.stats.activity.lastActive = now;
    this.stats.activity.loginCount += 1;
};

// Static Methods
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase().trim() });
};

userSchema.statics.search = function(query, collegeId = null) {
    const searchQuery = {
        $text: { $search: query },
        isActive: true
    };
    
    if (collegeId) {
        searchQuery['academic.collegeId'] = collegeId;
    }
    
    return this.find(searchQuery)
        .select('profile.firstName profile.lastName profile.displayName profile.avatar academic.role academic.departmentName')
        .limit(20);
};

const User = mongoose.model('User', userSchema);

module.exports = User;