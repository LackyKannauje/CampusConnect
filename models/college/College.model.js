const mongoose = require('mongoose');
const { BaseSchema, AIEnrichedSchema, TimestampsPlugin } = require('../shared/BaseSchema');
const { FileSchema, ContactSchema } = require('../shared/types');

const collegeSchema = new mongoose.Schema({
    // Core Identification
    code: {
        type: String,
        required: [true, 'College code is required'],
        uppercase: true,
        trim: true,
        maxlength: 10,
    },
    name: {
        type: String,
        required: [true, 'College name is required'],
        trim: true,
    },
    
    // Domain & Authentication
    domains: [{
        domain: {
            type: String,
            lowercase: true,
            trim: true
        },
        isVerified: { type: Boolean, default: false },
        verifiedAt: Date
    }],
    
    // Contact Information
    contact: ContactSchema,
    
    // Location
    location: {
        address: String,
        city: String,
        state: String,
        country: String,
        pincode: String,
        coordinates: {
            lat: Number,
            lng: Number
        },
        timezone: String
    },
    
    // College Details
    details: {
        type: {
            type: String,
            enum: ['university', 'engineering', 'medical', 'arts', 'commerce', 'science', 'law', 'others']
        },
        establishedYear: Number,
        accreditation: [{
            body: String,
            grade: String,
            validTill: Date
        }],
        description: String,
        mission: String,
        vision: String,
        motto: String
    },
    
    // Media
    media: {
        logo: FileSchema,
        banner: FileSchema,
        gallery: [FileSchema],
        virtualTour: String
    },
    
    // Academic Structure
    academic: {
        academicYear: {
            startMonth: { type: Number, min: 1, max: 12, default: 6 }, // June
            endMonth: { type: Number, min: 1, max: 12, default: 5 } // May
        },
        semesters: [{
            name: String,
            startDate: Date,
            endDate: Date,
            isCurrent: Boolean
        }],
        gradingSystem: String,
        creditsRequired: Number
    },
    
    // Statistics (Cached)
    stats: {
        users: {
            total: { type: Number, default: 0 },
            students: { type: Number, default: 0 },
            faculty: { type: Number, default: 0 },
            admins: { type: Number, default: 0 },
            active: { type: Number, default: 0 }
        },
        content: {
            total: { type: Number, default: 0 },
            daily: { type: Number, default: 0 },
            monthly: { type: Number, default: 0 }
        },
        engagement: {
            avgDailyActive: Number,
            avgSessionDuration: Number,
            engagementRate: Number
        },
        lastUpdated: Date
    },
    
    // Departments (Embedded for quick access)
    departments: [{
        _id: false,
        id: mongoose.Schema.Types.ObjectId,
        code: String,
        name: String,
        hod: mongoose.Schema.Types.ObjectId,
        studentCount: Number,
        facultyCount: Number
    }],
    
    // Configuration
    config: {
        features: {
            aiModeration: { type: Boolean, default: true },
            aiTagging: { type: Boolean, default: true },
            events: { type: Boolean, default: true },
            placements: { type: Boolean, default: true },
            studyMaterials: { type: Boolean, default: true },
            polls: { type: Boolean, default: true }
        },
        limits: {
            maxUsers: { type: Number, default: 10000 },
            maxStorage: { type: Number, default: 100 }, // in GB
            maxDepartments: { type: Number, default: 50 }
        },
        moderation: {
            autoApprove: { type: Boolean, default: false },
            profanityFilter: { type: Boolean, default: true },
            requireVerification: { type: Boolean, default: true }
        }
    },
    
    // Administration
    admins: [{
        userId: mongoose.Schema.Types.ObjectId,
        role: { type: String, enum: ['owner', 'admin', 'moderator'] },
        permissions: [String],
        addedAt: Date,
        addedBy: mongoose.Schema.Types.ObjectId
    }],
    
    // Subscription & Billing
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'basic', 'pro', 'enterprise'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['active', 'expired', 'cancelled', 'pending'],
            default: 'active'
        },
        startDate: Date,
        endDate: Date,
        autoRenew: { type: Boolean, default: true },
        paymentMethod: String,
        billingEmail: String,
        features: Map
    },
    
    // AI Configuration
    aiConfig: {
        enabled: { type: Boolean, default: true },
        provider: {
            type: String,
            enum: ['openai', 'gemini', 'huggingface', 'custom'],
            default: 'openai'
        },
        models: {
            moderation: String,
            tagging: String,
            summarization: String,
            sentiment: String
        },
        thresholds: {
            autoFlag: { type: Number, default: 0.8, min: 0, max: 1 },
            autoApprove: { type: Number, default: 0.9, min: 0, max: 1 }
        }
    },
    
    // Social & Integration
    social: {
        website: String,
        twitter: String,
        linkedin: String,
        facebook: String,
        instagram: String,
        youtube: String
    },
    
    // Settings
    settings: {
        registration: {
            open: { type: Boolean, default: true },
            inviteOnly: { type: Boolean, default: false },
            domainRestriction: { type: Boolean, default: true }
        },
        notifications: {
            emailDigest: { type: Boolean, default: true },
            weeklyReport: { type: Boolean, default: true },
            adminAlerts: { type: Boolean, default: true }
        },
        theme: {
            primaryColor: { type: String, default: '#3b82f6' },
            secondaryColor: { type: String, default: '#1e40af' },
            logoPosition: { type: String, enum: ['left', 'center'], default: 'left' }
        }
    },
    
    // Status
    status: {
        isActive: { type: Boolean, default: true },
        isVerified: { type: Boolean, default: false },
        verificationLevel: { type: String, enum: ['unverified', 'basic', 'full'], default: 'unverified' },
        verificationData: Map,
        lastActivity: Date,
        maintenanceMode: { type: Boolean, default: false }
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
TimestampsPlugin(collegeSchema);

// Virtual Fields
collegeSchema.virtual('activeDepartments').get(function () {
    return (this.departments || []).filter(
      dept => dept.studentCount > 0
    );
  });
  

collegeSchema.virtual('isTrial').get(function() {
    return this.subscription.plan === 'free' && 
           this.stats.users.total < 100;
});

collegeSchema.virtual('storageUsed').get(function() {
    // Would be calculated from actual storage
    return 0;
});

collegeSchema.virtual('storagePercentage').get(function() {
    const max = this.config.limits.maxStorage * 1024 * 1024 * 1024; // Convert GB to bytes
    return this.storageUsed / max * 100;
});

// Indexes
collegeSchema.index({ code: 1 }, { unique: true });
collegeSchema.index({ name: 1 });
collegeSchema.index({ 'domains.domain': 1 });
collegeSchema.index({ 'location.city': 1, 'location.state': 1 });
collegeSchema.index({ 'subscription.status': 1, 'subscription.plan': 1 });
collegeSchema.index({ 'stats.users.total': -1 });
collegeSchema.index({ createdAt: -1 });

// Middleware
collegeSchema.pre('save', async function() {
    // Auto-generate code if not provided
    if (!this.code && this.name) {
        const words = this.name.split(' ');
        this.code = words.map(w => w[0]).join('').toUpperCase();
        
        // Add year if exists
        if (this.details.establishedYear) {
            this.code += this.details.establishedYear.toString().slice(-2);
        }
    }
    
    // Set default domain from college name
    if (this.domains.length === 0 && this.name) {
        const domain = this.name.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .replace(/\s+/g, '') + '.edu';
        
        this.domains.push({
            domain: domain,
            isVerified: false
        });
    }
    
    // Update last activity
    if (this.isModified()) {
        this.status.lastActivity = new Date();
    }
});

// Methods
collegeSchema.methods.canAddUser = function() {
    return this.stats.users.total < this.config.limits.maxUsers;
};

collegeSchema.methods.canAddDepartment = function() {
    return this.departments.length < this.config.limits.maxDepartments;
};

collegeSchema.methods.hasPermission = function(userId, permission) {
    const admin = this.admins.find(a => a.userId.equals(userId));
    return admin && admin.permissions.includes(permission);
};

collegeSchema.methods.updateStats = async function() {
    const User = mongoose.model('User');
    const Content = mongoose.model('Content');
    
    const userStats = await User.aggregate([
        { $match: { 'academic.collegeId': this._id } },
        { $group: {
            _id: '$academic.role',
            count: { $sum: 1 },
            active: { $sum: { $cond: [{ $gt: ['$stats.activity.lastActive', new Date(Date.now() - 7*24*60*60*1000)] }, 1, 0] } }
        }}
    ]);
    
    const contentStats = await Content.countDocuments({ collegeId: this._id });
    
    // Update stats
    this.stats.users.total = userStats.reduce((sum, stat) => sum + stat.count, 0);
    this.stats.users.active = userStats.reduce((sum, stat) => sum + stat.active, 0);
    this.stats.users.students = userStats.find(s => s._id === 'student')?.count || 0;
    this.stats.users.faculty = userStats.find(s => s._id === 'faculty')?.count || 0;
    this.stats.content.total = contentStats;
    this.stats.lastUpdated = new Date();
    
    return this.save();
};

collegeSchema.methods.getDomainEmails = function() {
    return this.domains
        .filter(d => d.isVerified)
        .map(d => `@${d.domain}`);
};

// Static Methods
collegeSchema.statics.findByDomain = function(email) {
    const domain = email.split('@')[1];
    return this.findOne({ 'domains.domain': domain });
};

collegeSchema.statics.getTopColleges = function(limit = 10, sortBy = 'engagement') {
    const sortOptions = {
        'engagement': { 'stats.engagement.engagementRate': -1 },
        'users': { 'stats.users.total': -1 },
        'activity': { 'stats.users.active': -1 },
        'new': { createdAt: -1 }
    };
    
    return this.find({ 'status.isActive': true })
        .sort(sortOptions[sortBy] || { createdAt: -1 })
        .limit(limit)
        .select('code name media.logo stats departments.length location.city');
};

collegeSchema.statics.getAnalytics = function(startDate, endDate) {
    return this.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            newColleges: { $sum: 1 },
            totalUsers: { $sum: '$stats.users.total' },
            totalContent: { $sum: '$stats.content.total' }
        }},
        { $sort: { _id: 1 } },
        { $project: {
            date: '$_id',
            newColleges: 1,
            totalUsers: 1,
            totalContent: 1,
            _id: 0
        }}
    ]);
};

const College = mongoose.model('College', collegeSchema);

module.exports = College;