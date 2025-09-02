// PR Messenger - Appwrite Configuration
// Replace these values with your actual Appwrite project details

const CONFIG = {
    // Appwrite Configuration
    APPWRITE_ENDPOINT: 'https://cloud.appwrite.io/v1', // Replace with your Appwrite endpoint
    APPWRITE_PROJECT_ID: 'your-project-id', // Replace with your Appwrite project ID
    
    // Database Configuration
    DATABASE_ID: 'pr-messenger-db',
    
    // Collection IDs
    COLLECTIONS: {
        ROOMS: 'rooms',
        MESSAGES: 'messages',
        PARTICIPANTS: 'participants',
        USERS: 'users'
    },
    
    // Storage Configuration
    BUCKET_ID: 'pr-messenger-files',
    
    // App Configuration
    APP_NAME: 'PR Messenger',
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    SUPPORTED_FILE_TYPES: {
        images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
        documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
        audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
        video: ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv']
    },
    
    // Real-time Configuration
    REALTIME_CHANNELS: {
        ROOMS: 'databases.' + 'pr-messenger-db' + '.collections.rooms.documents',
        MESSAGES: 'databases.' + 'pr-messenger-db' + '.collections.messages.documents',
        PARTICIPANTS: 'databases.' + 'pr-messenger-db' + '.collections.participants.documents'
    },
    
    // WebRTC Configuration
    RTC_CONFIG: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
    },
    
    // Environment Configuration
    IS_DEVELOPMENT: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    // Feature Flags
    FEATURES: {
        VOICE_MESSAGES: true,
        FILE_SHARING: true,
        VIDEO_CALLS: true,
        SCREEN_SHARING: true,
        TYPING_INDICATORS: true,
        MESSAGE_ENCRYPTION: false, // Future feature
        MESSAGE_REACTIONS: false   // Future feature
    }
};

// Development Configuration Override
if (CONFIG.IS_DEVELOPMENT) {
    console.log('🚀 PR Messenger running in development mode');
    console.log('📱 Config loaded:', {
        endpoint: CONFIG.APPWRITE_ENDPOINT,
        projectId: CONFIG.APPWRITE_PROJECT_ID,
        databaseId: CONFIG.DATABASE_ID
    });
}

// Validation function to check if configuration is complete
function validateConfig() {
    const required = [
        'APPWRITE_ENDPOINT',
        'APPWRITE_PROJECT_ID',
        'DATABASE_ID'
    ];
    
    const missing = required.filter(key => !CONFIG[key] || CONFIG[key].includes('your-'));
    
    if (missing.length > 0) {
        console.warn('⚠️ Missing Appwrite configuration:', missing);
        return false;
    }
    
    return true;
}

// Export configuration
window.CONFIG = CONFIG;
window.validateConfig = validateConfig;

// Auto-validation on load
document.addEventListener('DOMContentLoaded', () => {
    if (!validateConfig()) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('d-none');
            overlay.querySelector('h5').textContent = 'Configuration Required';
            overlay.querySelector('p').innerHTML = `
                Please update <code>config.js</code> with your Appwrite project details.<br>
                <small>Check the console for missing configuration items.</small>
            `;
        }
    }
});
