module.exports = {
    UserRoles: {
        STUDENT: 'student',
        FACULTY: 'faculty',
        ADMIN: 'admin',
        COLLEGE_ADMIN: 'college_admin',
        SUPER_ADMIN: 'super_admin',
        ALUMNI: 'alumni',
        MODERATOR: 'moderator'
    },

    ContentTypes: {
        POST: 'post',
        EVENT: 'event',
        POLL: 'poll',
        ANNOUNCEMENT: 'announcement',
        STUDY_MATERIAL: 'study_material',
        QUESTION_PAPER: 'question_paper',
        NOTE: 'note',
        JOB: 'job',
        QUESTION: 'question',
        ANSWER: 'answer'
    },

    MediaTypes: {
        IMAGE: 'image',
        VIDEO: 'video',
        PDF: 'pdf',
        DOC: 'doc',
        PPT: 'ppt',
        AUDIO: 'audio'
    },

    Visibility: {
        PUBLIC: 'public',
        COLLEGE: 'college',
        DEPARTMENT: 'department',
        BATCH: 'batch',
        PRIVATE: 'private',
        FOLLOWERS: 'followers'
    },

    AIServices: {
        OPENAI: 'openai',
        GEMINI: 'gemini',
        HUGGINGFACE: 'huggingface',
        CUSTOM: 'custom'
    },

    NotificationTypes: {
        LIKE: 'like',
        COMMENT: 'comment',
        REPLY: 'reply',
        FOLLOW: 'follow',
        MENTION: 'mention',
        EVENT: 'event',
        ANNOUNCEMENT: 'announcement',
        SYSTEM: 'system',
        JOB: 'job'
    }
};