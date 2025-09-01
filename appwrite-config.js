// Appwrite Configuration for PR Message
const APPWRITE_CONFIG = {
    endpoint: 'https://nyc.cloud.appwrite.io/v1', // Replace with your Appwrite endpoint
    projectId: '68b56cbd00346ee519c7', // Replace with your actual project ID
    databaseId: '68b56db3003e6c5b9b78', // Replace with your actual database ID
    collections: {
        chatRooms: 'chat_rooms',
        messages: 'messages',
        fileShares: 'file_shares'
    },
    buckets: {
        files: 'pr-message-files'
    }
};

// Initialize Appwrite Client
const appwrite = new Appwrite.Client();
appwrite
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId);

// Initialize Appwrite Services
const account = new Appwrite.Account(appwrite);
const databases = new Appwrite.Databases(appwrite);
const storage = new Appwrite.Storage(appwrite);
const realtime = new Appwrite.Realtime(appwrite);

// Appwrite Helper Functions
class AppwriteHelper {
    static async createAnonymousSession() {
        try {
            return await account.createAnonymousSession();
        } catch (error) {
            console.error('Failed to create anonymous session:', error);
            throw error;
        }
    }

    static async createRoom(code, creatorId) {
        try {
            return await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.chatRooms,
                'unique()',
                {
                    code: code,
                    creator_id: creatorId,
                    created_at: new Date().toISOString(),
                    is_active: true
                }
            );
        } catch (error) {
            console.error('Failed to create room:', error);
            throw error;
        }
    }

    static async findRoom(code) {
        try {
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.chatRooms,
                [
                    Appwrite.Query.equal('code', code),
                    Appwrite.Query.equal('is_active', true)
                ]
            );
            return response.documents.length > 0 ? response.documents[0] : null;
        } catch (error) {
            console.error('Failed to find room:', error);
            throw error;
        }
    }

    static async joinRoom(roomId, joinerId) {
        try {
            return await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.chatRooms,
                roomId,
                {
                    joiner_id: joinerId
                }
            );
        } catch (error) {
            console.error('Failed to join room:', error);
            throw error;
        }
    }

    static async sendMessage(roomCode, senderId, content, messageType = 'text') {
        try {
            return await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.messages,
                'unique()',
                {
                    room_code: roomCode,
                    sender_id: senderId,
                    content: content,
                    message_type: messageType,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (error) {
            console.error('Failed to send message:', error);
            throw error;
        }
    }

    static async getMessages(roomCode) {
        try {
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.messages,
                [
                    Appwrite.Query.equal('room_code', roomCode),
                    Appwrite.Query.orderAsc('timestamp'),
                    Appwrite.Query.limit(100)
                ]
            );
            return response.documents;
        } catch (error) {
            console.error('Failed to get messages:', error);
            throw error;
        }
    }

    static async uploadFile(file) {
        try {
            return await storage.createFile(
                APPWRITE_CONFIG.buckets.files,
                'unique()',
                file
            );
        } catch (error) {
            console.error('Failed to upload file:', error);
            throw error;
        }
    }

    static async downloadFile(fileId) {
        try {
            return storage.getFileDownload(
                APPWRITE_CONFIG.buckets.files,
                fileId
            );
        } catch (error) {
            console.error('Failed to download file:', error);
            throw error;
        }
    }

    static subscribeToMessages(roomCode, callback) {
        return realtime.subscribe([
            `databases.${APPWRITE_CONFIG.databaseId}.collections.${APPWRITE_CONFIG.collections.messages}.documents`
        ], (response) => {
            if (response.payload.room_code === roomCode) {
                callback(response);
            }
        });
    }

    static subscribeToRoom(roomCode, callback) {
        return realtime.subscribe([
            `databases.${APPWRITE_CONFIG.databaseId}.collections.${APPWRITE_CONFIG.collections.chatRooms}.documents`
        ], (response) => {
            if (response.payload.code === roomCode) {
                callback(response);
            }
        });
    }
}

// Test Appwrite Connection
async function testAppwriteConnection() {
    try {
        console.log('🔧 Testing Appwrite connection...');
        
        // Test endpoint accessibility
        const health = await fetch(APPWRITE_CONFIG.endpoint + '/health');
        if (!health.ok) {
            throw new Error('Appwrite endpoint not accessible');
        }
        
        // Test project configuration
        try {
            await account.get();
        } catch (error) {
            if (error.code === 401) {
                // Expected for anonymous users
                console.log('✅ Project configuration is correct');
            } else {
                throw error;
            }
        }
        
        console.log('✅ Appwrite connection successful');
        return true;
    } catch (error) {
        console.error('❌ Appwrite connection failed:', error);
        return false;
    }
}

// Configuration validation
function validateAppwriteConfig() {
    const issues = [];
    
    if (APPWRITE_CONFIG.projectId === 'YOUR_PROJECT_ID') {
        issues.push('Project ID not configured');
    }
    
    if (APPWRITE_CONFIG.databaseId === 'YOUR_DATABASE_ID') {
        issues.push('Database ID not configured');
    }
    
    if (issues.length > 0) {
        console.warn('⚠️ Appwrite configuration issues:', issues);
        return false;
    }
    
    return true;
}

// Export for use in main app
window.AppwriteHelper = AppwriteHelper;
window.testAppwriteConnection = testAppwriteConnection;
window.validateAppwriteConfig = validateAppwriteConfig;
window.APPWRITE_CONFIG = APPWRITE_CONFIG;
