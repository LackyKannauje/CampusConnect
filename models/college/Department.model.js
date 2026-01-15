const mongoose = require('mongoose');
const { BaseSchema, TimestampsPlugin } = require('../shared/BaseSchema');

const departmentSchema = new mongoose.Schema({
    // Core Identification
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        required: true,
        index: true
    },
    code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        maxlength: 10
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    
    // Department Details
    details: {
        description: String,
        vision: String,
        mission: String,
        establishedYear: Number,
        accreditation: String,
        website: String,
        email: String,
        phone: String
    },
    
    // Academic Information
    academic: {
        degree: String, // e.g., "B.Tech", "MBA"
        duration: Number, // in years
        semesters: Number,
        creditsRequired: Number,
        specialization: [String],
        eligibility: String,
        syllabus: String // URL to syllabus PDF
    },
    
    // Faculty & Staff
    hod: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    faculty: [{
        userId: mongoose.Schema.Types.ObjectId,
        designation: String,
        joinedAt: Date,
        isActive: Boolean
    }],
    
    // Student Information
    students: {
        current: {
            count: { type: Number, default: 0 },
            batches: [{
                year: String, // e.g., "2023-2027"
                count: Number,
                male: Number,
                female: Number
            }]
        },
        alumni: {
            count: { type: Number, default: 0 },
            placed: Number,
            higherStudies: Number
        }
    },
    
    // Infrastructure
    infrastructure: {
        labs: [{
            name: String,
            equipment: [String],
            capacity: Number
        }],
        classrooms: Number,
        smartClasses: Number,
        libraryBooks: Number,
        specialFacilities: [String]
    },
    
    // Courses & Subjects
    courses: [{
        code: String,
        name: String,
        semester: Number,
        credits: Number,
        type: { type: String, enum: ['core', 'elective', 'lab', 'project'] },
        faculty: mongoose.Schema.Types.ObjectId,
        description: String
    }],
    
    // Placement & Career
    placement: {
        averagePackage: Number,
        highestPackage: Number,
        topRecruiters: [String],
        placementRate: Number,
        internshipPartners: [String]
    },
    
    // Research & Projects
    research: {
        ongoingProjects: Number,
        completedProjects: Number,
        publications: Number,
        patents: Number,
        researchAreas: [String],
        funding: Number
    },
    
    // Events & Activities
    events: [{
        name: String,
        type: String,
        date: Date,
        participants: Number
    }],
    
    // Resources
    resources: {
        studyMaterials: Number,
        questionPapers: Number,
        notes: Number,
        videos: Number,
        lastUpdated: Date
    },
    
    // Statistics (Cached)
    stats: {
        facultyCount: { type: Number, default: 0 },
        studentCount: { type: Number, default: 0 },
        contentCount: { type: Number, default: 0 },
        engagementRate: Number,
        activeUsers: Number,
        lastUpdated: Date
    },
    
    // Settings
    settings: {
        visibility: {
            type: String,
            enum: ['public', 'college', 'department', 'private'],
            default: 'college'
        },
        joinPolicy: {
            type: String,
            enum: ['open', 'approval', 'closed'],
            default: 'open'
        },
        postPolicy: {
            type: String,
            enum: ['all', 'faculty_only', 'approved'],
            default: 'all'
        },
        notifications: {
            newStudent: { type: Boolean, default: true },
            newContent: { type: Boolean, default: true },
            events: { type: Boolean, default: true }
        }
    },
    
    // Social
    social: {
        groupChat: String, // URL/ID
        forum: String,
        newsletter: String
    },
    
    // Status
    status: {
        isActive: { type: Boolean, default: true },
        isVerified: { type: Boolean, default: false },
        lastActivity: Date
    },
    
    // Base Schema
    ...BaseSchema
}, {
    timestamps: true,
    toJSON: { virtuals: true }
});

// Apply Timestamps Plugin
TimestampsPlugin(departmentSchema);

// Virtual Fields
departmentSchema.virtual('fullCode').get(function() {
    return `${this.collegeId.code}-${this.code}`;
});

departmentSchema.virtual('activeFaculty').get(function() {
    return this.faculty.filter(f => f.isActive).length;
});

departmentSchema.virtual('totalStudents').get(function() {
    return this.students.current.count + this.students.alumni.count;
});

departmentSchema.virtual('placementPercentage').get(function() {
    if (!this.students.alumni.count) return 0;
    return (this.students.alumni.placed / this.students.alumni.count * 100).toFixed(1);
});

// Indexes
departmentSchema.index({ collegeId: 1, code: 1 }, { unique: true });
departmentSchema.index({ collegeId: 1, name: 1 });
departmentSchema.index({ 'academic.degree': 1 });
departmentSchema.index({ 'placement.averagePackage': -1 });
departmentSchema.index({ 'stats.studentCount': -1 });

// Middleware
departmentSchema.pre('save', function(next) {
    // Update stats
    this.stats.facultyCount = this.faculty.filter(f => f.isActive).length;
    this.stats.studentCount = this.students.current.count;
    
    // Calculate engagement rate (simplified)
    if (this.stats.contentCount > 0 && this.stats.studentCount > 0) {
        this.stats.engagementRate = (this.stats.contentCount / this.stats.studentCount) * 100;
    }
    
    // Update last activity
    if (this.isModified()) {
        this.status.lastActivity = new Date();
        this.stats.lastUpdated = new Date();
    }
    
    next();
});

departmentSchema.post('save', async function() {
    // Update college's embedded departments
    const College = mongoose.model('College');
    await College.findByIdAndUpdate(this.collegeId, {
        $pull: { departments: { id: this._id } }
    });
    
    await College.findByIdAndUpdate(this.collegeId, {
        $push: {
            departments: {
                id: this._id,
                code: this.code,
                name: this.name,
                hod: this.hod,
                studentCount: this.students.current.count,
                facultyCount: this.faculty.filter(f => f.isActive).length
            }
        }
    });
});

departmentSchema.post('remove', async function() {
    // Remove from college's embedded departments
    const College = mongoose.model('College');
    await College.findByIdAndUpdate(this.collegeId, {
        $pull: { departments: { id: this._id } }
    });
});

// Methods
departmentSchema.methods.addFaculty = function(userId, designation) {
    const existing = this.faculty.find(f => f.userId.equals(userId));
    if (!existing) {
        this.faculty.push({
            userId,
            designation,
            joinedAt: new Date(),
            isActive: true
        });
        this.stats.facultyCount++;
        return true;
    }
    return false;
};

departmentSchema.methods.removeFaculty = function(userId) {
    const index = this.faculty.findIndex(f => f.userId.equals(userId));
    if (index > -1) {
        this.faculty.splice(index, 1);
        this.stats.facultyCount--;
        return true;
    }
    return false;
};

departmentSchema.methods.addStudent = function(batch) {
    const batchEntry = this.students.current.batches.find(b => b.year === batch);
    if (batchEntry) {
        batchEntry.count++;
    } else {
        this.students.current.batches.push({
            year: batch,
            count: 1,
            male: 0,
            female: 0
        });
    }
    this.students.current.count++;
    this.stats.studentCount++;
};

departmentSchema.methods.canUserPost = function(user) {
    if (this.settings.postPolicy === 'all') return true;
    if (this.settings.postPolicy === 'faculty_only') {
        return user.academic.role === 'faculty' || 
               this.faculty.some(f => f.userId.equals(user._id));
    }
    if (this.settings.postPolicy === 'approved') {
        return this.hasPermission(user._id, 'post');
    }
    return false;
};

// Static Methods
departmentSchema.statics.findByCollege = function(collegeId, options = {}) {
    const { activeOnly = true, sortBy = 'name' } = options;
    
    const query = { collegeId };
    if (activeOnly) query['status.isActive'] = true;
    
    return this.find(query)
        .sort({ [sortBy]: 1 })
        .populate('hod', 'profile.firstName profile.lastName profile.avatar');
};

departmentSchema.statics.getTopDepartments = function(collegeId = null, limit = 10) {
    const match = collegeId ? { collegeId: mongoose.Types.ObjectId(collegeId) } : {};
    
    return this.aggregate([
        { $match: { ...match, 'status.isActive': true } },
        { $sort: { 'stats.studentCount': -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'colleges',
                localField: 'collegeId',
                foreignField: '_id',
                as: 'college'
            }
        },
        { $unwind: '$college' },
        {
            $project: {
                _id: 1,
                code: 1,
                name: 1,
                fullCode: { $concat: ['$college.code', '-', '$code'] },
                studentCount: '$stats.studentCount',
                facultyCount: '$stats.facultyCount',
                collegeName: '$college.name',
                placementRate: '$placement.placementRate'
            }
        }
    ]);
};

departmentSchema.statics.getDepartmentStats = function(collegeId) {
    return this.aggregate([
        { $match: { collegeId: mongoose.Types.ObjectId(collegeId), 'status.isActive': true } },
        { $group: {
            _id: null,
            totalDepartments: { $sum: 1 },
            totalStudents: { $sum: '$students.current.count' },
            totalFaculty: { $sum: { $size: '$faculty' } },
            avgPlacementRate: { $avg: '$placement.placementRate' },
            departments: {
                $push: {
                    name: '$name',
                    code: '$code',
                    students: '$students.current.count',
                    faculty: { $size: '$faculty' }
                }
            }
        }},
        { $project: {
            _id: 0,
            totalDepartments: 1,
            totalStudents: 1,
            totalFaculty: 1,
            avgPlacementRate: { $round: ['$avgPlacementRate', 2] },
            departments: 1
        }}
    ]);
};

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;