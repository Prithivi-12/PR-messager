// PR Message - Main Application with Appwrite Integration
class PRMessageApp {
    constructor() {
        // Application state
        this.chatRooms = new Map(); // Local cache
        this.currentUser = null;
        this.currentRoom = null;
        this.currentRoomDoc = null;
        this.userRole = null; // 'creator' or 'joiner'
        this.messagePollingInterval = null;
        this.pollingFrequency = 1000; // Reduced frequency with Appwrite real-time
        this.codeLength = 6;
        this.messageCounter = 0;
        
        // Appwrite state
        this.session = null;
        this.messageSubscription = null;
        this.roomSubscription = null;
        
        // WebRTC state
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.screenStream = null;
        this.dataChannel = null;
        this.mediaRecorder = null;
        this.recordingChunks = [];
        this.isVideoCall = false;
        this.isVoiceCall = false;
        this.isScreenSharing = false;
        this.isRecording = false;
        this.recordingStartTime = null;
        this.recordingTimer = null;

        // WebRTC Configuration
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun.stunprotocol.org:3478' }
            ]
        };

        // Media constraints
        this.mediaConstraints = {
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: { echoCancellation: true, noiseSuppression: true }
        };

        // DOM elements
        this.screens = {};
        this.elements = {};

        this.init();
    }

    async init() {
        console.log('🚀 Initializing PR Message App...');
        
        // Initialize DOM elements
        this.initializeElements();
        this.bindEvents();
        
        // Initialize Appwrite
        await this.initializeAppwrite();
        
        // Show home screen
        this.showScreen('home');
        this.updateDebugInfo();
        
        console.log('✅ PR Message App initialized successfully');
    }

    async initializeAppwrite() {
        try {
            console.log('🔧 Initializing Appwrite...');
            
            // Validate configuration
            if (!validateAppwriteConfig()) {
                throw new Error('Appwrite configuration is incomplete');
            }
            
            // Test connection
            const connectionOk = await testAppwriteConnection();
            if (!connectionOk) {
                throw new Error('Cannot connect to Appwrite');
            }
            
            // Create anonymous session
            try {
                this.session = await AppwriteHelper.createAnonymousSession();
                console.log('✅ Anonymous session created:', this.session.$id);
            } catch (error) {
                // Session might already exist
                try {
                    this.session = await account.get();
                    console.log('✅ Using existing session:', this.session.$id);
                } catch (getError) {
                    throw new Error('Failed to create or get session');
                }
            }
            
            this.currentUser = this.session.$id;
            
        } catch (error) {
            console.error('❌ Appwrite initialization failed:', error);
            this.showError('Failed to connect to Appwrite. Please check your configuration.');
        }
    }

    initializeElements() {
        // Screen elements
        this.screens = {
            home: document.getElementById('homeScreen'),
            createInvite: document.getElementById('createInviteScreen'),
            join: document.getElementById('joinScreen'),
            chat: document.getElementById('chatScreen')
        };

        // Interactive elements
        this.elements = {
            // Navigation
            createInviteBtn: document.getElementById('createInviteBtn'),
            joinWithCodeBtn: document.getElementById('joinWithCodeBtn'),
            backFromCreateBtn: document.getElementById('backFromCreateBtn'),
            backFromJoinBtn: document.getElementById('backFromJoinBtn'),
            
            // Create invite
            codeGenerating: document.getElementById('codeGenerating'),
            codeGenerated: document.getElementById('codeGenerated'),
            inviteCode: document.getElementById('inviteCode'),
            copyCodeBtn: document.getElementById('copyCodeBtn'),
            storageStatus: document.getElementById('storageStatus'),
            waitingForJoiner: document.getElementById('waitingForJoiner'),
            
            // Join room
            joinForm: document.getElementById('joinForm'),
            codeInput: document.getElementById('codeInput'),
            joinBtn: document.getElementById('joinBtn'),
            joinBtnText: document.getElementById('joinBtnText'),
            joinSpinner: document.getElementById('joinSpinner'),
            joinError: document.getElementById('joinError'),
            
            // Validation feedback
            lengthCheck: document.getElementById('lengthCheck'),
            formatCheck: document.getElementById('formatCheck'),
            existsCheck: document.getElementById('existsCheck'),
            
            // Chat interface
            chatTitle: document.getElementById('chatTitle'),
            connectionStatus: document.getElementById('connectionStatus'),
            leaveChatBtn: document.getElementById('leaveChatBtn'),
            messagesList: document.getElementById('messagesList'),
            messageForm: document.getElementById('messageForm'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            
            // Media controls
            videoCallBtn: document.getElementById('videoCallBtn'),
            voiceCallBtn: document.getElementById('voiceCallBtn'),
            screenShareBtn: document.getElementById('screenShareBtn'),
            voiceMessageBtn: document.getElementById('voiceMessageBtn'),
            fileShareBtn: document.getElementById('fileShareBtn'),
            fileInput: document.getElementById('fileInput'),
            
            // Video/Screen containers
            videoContainer: document.getElementById('videoContainer'),
            screenShareContainer: document.getElementById('screenShareContainer'),
            localVideo: document.getElementById('localVideo'),
            remoteVideo: document.getElementById('remoteVideo'),
            screenVideo: document.getElementById('screenVideo'),
            
            // Video controls
            toggleCameraBtn: document.getElementById('toggleCameraBtn'),
            toggleMicBtn: document.getElementById('toggleMicBtn'),
            endCallBtn: document.getElementById('endCallBtn'),
            stopScreenShareBtn: document.getElementById('stopScreenShareBtn'),
            
            // Voice recording
            voiceRecorder: document.getElementById('voiceRecorder'),
            recordingTime: document.getElementById('recordingTime'),
            stopRecordingBtn: document.getElementById('stopRecordingBtn'),
            cancelRecordingBtn: document.getElementById('cancelRecordingBtn'),
            
            // File transfer
            fileDropZone: document.getElementById('fileDropZone'),
            fileTransferProgress: document.getElementById('fileTransferProgress'),
            transferProgressBar: document.getElementById('transferProgressBar'),
            transferFileName: document.getElementById('transferFileName'),
            transferSpeed: document.getElementById('transferSpeed'),
            cancelTransferBtn: document.getElementById('cancelTransferBtn'),
            
            // Debug panel
            debugPanel: document.getElementById('debugPanel'),
            debugContent: document.getElementById('debugContent'),
            showDebugBtn: document.getElementById('showDebugBtn'),
            toggleDebugBtn: document.getElementById('toggleDebugBtn'),
            clearRoomsBtn: document.getElementById('clearRoomsBtn'),
            testConnectionBtn: document.getElementById('testConnectionBtn')
        };
    }

    bindEvents() {
        // Navigation events
        this.elements.createInviteBtn?.addEventListener('click', () => this.createInvite());
        this.elements.joinWithCodeBtn?.addEventListener('click', () => this.showJoinScreen());
        this.elements.backFromCreateBtn?.addEventListener('click', () => this.showScreen('home'));
        this.elements.backFromJoinBtn?.addEventListener('click', () => this.showScreen('home'));
        this.elements.leaveChatBtn?.addEventListener('click', () => this.leaveChat());
        
        // Join form events
        this.elements.joinForm?.addEventListener('submit', (e) => this.handleJoinForm(e));
        this.elements.codeInput?.addEventListener('input', (e) => this.validateCodeInput(e.target.value));
        
        // Copy code event
        this.elements.copyCodeBtn?.addEventListener('click', () => this.copyInviteCode());
        
        // Message form events
        this.elements.messageForm?.addEventListener('submit', (e) => this.handleMessageForm(e));
        
        // Media control events
        this.elements.videoCallBtn?.addEventListener('click', () => this.toggleVideoCall());
        this.elements.voiceCallBtn?.addEventListener('click', () => this.toggleVoiceCall());
        this.elements.screenShareBtn?.addEventListener('click', () => this.toggleScreenShare());
        this.elements.voiceMessageBtn?.addEventListener('click', () => this.toggleVoiceRecording());
        this.elements.fileShareBtn?.addEventListener('click', () => this.elements.fileInput?.click());
        
        // File input event
        this.elements.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Video control events
        this.elements.toggleCameraBtn?.addEventListener('click', () => this.toggleCamera());
        this.elements.toggleMicBtn?.addEventListener('click', () => this.toggleMicrophone());
        this.elements.endCallBtn?.addEventListener('click', () => this.endCall());
        this.elements.stopScreenShareBtn?.addEventListener('click', () => this.stopScreenShare());
        
        // Voice recording events
        this.elements.stopRecordingBtn?.addEventListener('click', () => this.stopVoiceRecording());
        this.elements.cancelRecordingBtn?.addEventListener('click', () => this.cancelVoiceRecording());
        
        // Debug events
        this.elements.showDebugBtn?.addEventListener('click', () => this.showDebugPanel());
        this.elements.toggleDebugBtn?.addEventListener('click', () => this.hideDebugPanel());
        this.elements.clearRoomsBtn?.addEventListener('click', () => this.clearAllRooms());
        this.elements.testConnectionBtn?.addEventListener('click', () => this.testConnection());
        
        // Drag and drop events
        this.setupDragAndDrop();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    // Core room management with Appwrite
    async createInvite() {
        try {
            console.log('🔒 Creating bulletproof room...');
            this.showScreen('createInvite');
            
            // Show generating state
            this.elements.codeGenerating?.classList.remove('hidden');
            this.elements.codeGenerated?.classList.add('hidden');
            
            // Generate unique code
            const code = this.generateInviteCode();
            console.log('Generated code:', code);
            
            // Store in Appwrite
            const roomDoc = await AppwriteHelper.createRoom(code, this.currentUser);
            console.log('Room created in Appwrite:', roomDoc);
            
            // Store locally
            const roomData = {
                code: code,
                creator: this.currentUser,
                joiner: null,
                messages: [],
                createdAt: new Date(),
                appwriteId: roomDoc.$id
            };
            
            this.chatRooms.set(code, roomData);
            this.currentRoom = code;
            this.currentRoomDoc = roomDoc;
            this.userRole = 'creator';
            
            // Show generated code
            this.displayGeneratedCode(code);
            
            // Subscribe to room updates
            this.subscribeToRoom(code);
            
            // Update storage status
            this.elements.storageStatus.textContent = '🟢 Stored in Appwrite';
            this.elements.storageStatus.style.color = 'var(--color-teal-600)';
            
            console.log('✅ Room created successfully');
            
        } catch (error) {
            console.error('❌ Failed to create room:', error);
            this.showError('Failed to create room. Please try again.');
            this.showScreen('home');
        }
    }

    generateInviteCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        
        // Use crypto.getRandomValues for secure random generation
        const array = new Uint8Array(this.codeLength);
        crypto.getRandomValues(array);
        
        for (let i = 0; i < this.codeLength; i++) {
            code += characters[array[i] % characters.length];
        }
        
        return code;
    }

    displayGeneratedCode(code) {
        this.elements.codeGenerating?.classList.add('hidden');
        this.elements.codeGenerated?.classList.remove('hidden');
        this.elements.inviteCode.textContent = code;
        this.elements.waitingForJoiner?.classList.remove('hidden');
    }

    async copyInviteCode() {
        const code = this.elements.inviteCode?.textContent;
        if (!code) return;
        
        try {
            await navigator.clipboard.writeText(code);
            
            // Visual feedback
            const originalText = this.elements.copyCodeBtn.innerHTML;
            this.elements.copyCodeBtn.innerHTML = '<span>✅ Copied!</span>';
            
            setTimeout(() => {
                this.elements.copyCodeBtn.innerHTML = originalText;
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy code:', error);
            // Fallback for older browsers
            this.fallbackCopyTextToClipboard(code);
        }
    }

    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            console.log('Fallback: Text copied to clipboard');
        } catch (err) {
            console.error('Fallback: Could not copy text:', err);
        }
        
        document.body.removeChild(textArea);
    }

    showJoinScreen() {
        this.showScreen('join');
        this.elements.codeInput?.focus();
    }

    validateCodeInput(value) {
        const code = value.trim().toUpperCase();
        
        // Length validation
        if (code.length === 6) {
            this.elements.lengthCheck.textContent = '✅';
            this.elements.lengthCheck.style.color = 'var(--color-teal-600)';
        } else {
            this.elements.lengthCheck.textContent = code.length > 6 ? '❌' : '⚪';
            this.elements.lengthCheck.style.color = code.length > 6 ? 'var(--color-red-500)' : 'var(--color-gray-400)';
        }
        
        // Format validation
        const isValidFormat = /^[A-Z0-9]*$/.test(code);
        if (isValidFormat && code.length > 0) {
            this.elements.formatCheck.textContent = '✅';
            this.elements.formatCheck.style.color = 'var(--color-teal-600)';
        } else if (code.length > 0 && !isValidFormat) {
            this.elements.formatCheck.textContent = '❌';
            this.elements.formatCheck.style.color = 'var(--color-red-500)';
        } else {
            this.elements.formatCheck.textContent = '⚪';
            this.elements.formatCheck.style.color = 'var(--color-gray-400)';
        }
        
        // Room existence validation (async)
        if (code.length === 6 && isValidFormat) {
            this.checkRoomExists(code);
        } else {
            this.elements.existsCheck.textContent = '⚪';
            this.elements.existsCheck.style.color = 'var(--color-gray-400)';
        }
        
        // Auto-format input
        this.elements.codeInput.value = code;
    }

    async checkRoomExists(code) {
        try {
            const room = await AppwriteHelper.findRoom(code);
            if (room) {
                this.elements.existsCheck.textContent = '✅';
                this.elements.existsCheck.style.color = 'var(--color-teal-600)';
            } else {
                this.elements.existsCheck.textContent = '❌';
                this.elements.existsCheck.style.color = 'var(--color-red-500)';
            }
        } catch (error) {
            console.error('Failed to check room existence:', error);
            this.elements.existsCheck.textContent = '⚠️';
            this.elements.existsCheck.style.color = 'var(--color-orange-500)';
        }
    }

    async handleJoinForm(e) {
        e.preventDefault();
        
        const code = this.elements.codeInput?.value.trim().toUpperCase();
        if (!code || code.length !== 6) {
            this.showJoinError('Please enter a valid 6-character code');
            return;
        }
        
        try {
            // Show loading state
            this.setJoinButtonLoading(true);
            this.hideJoinError();
            
            console.log('🛡️ Attempting to join room:', code);
            
            // Find room in Appwrite
            const roomDoc = await AppwriteHelper.findRoom(code);
            if (!roomDoc) {
                throw new Error('Room not found');
            }
            
            // Check if room is available
            if (roomDoc.joiner_id) {
                throw new Error('Room is full');
            }
            
            // Join the room
            await AppwriteHelper.joinRoom(roomDoc.$id, this.currentUser);
            
            // Set up local state
            this.currentRoom = code;
            this.currentRoomDoc = roomDoc;
            this.userRole = 'joiner';
            
            // Load room data
            const roomData = {
                code: code,
                creator: roomDoc.creator_id,
                joiner: this.currentUser,
                messages: [],
                createdAt: new Date(roomDoc.created_at),
                appwriteId: roomDoc.$id
            };
            
            this.chatRooms.set(code, roomData);
            
            // Subscribe to room updates
            this.subscribeToRoom(code);
            this.subscribeToMessages(code);
            
            // Load existing messages
            await this.loadMessages(code);
            
            // Enter chat
            this.enterChat();
            
            console.log('✅ Successfully joined room');
            
        } catch (error) {
            console.error('❌ Failed to join room:', error);
            let errorMessage = 'Failed to join room';
            
            if (error.message === 'Room not found') {
                errorMessage = 'Room code not found. Please check the code and try again.';
            } else if (error.message === 'Room is full') {
                errorMessage = 'This room is already full. Please get a new invite code.';
            }
            
            this.showJoinError(errorMessage);
        } finally {
            this.setJoinButtonLoading(false);
        }
    }

    setJoinButtonLoading(loading) {
        if (loading) {
            this.elements.joinBtnText.textContent = 'Joining...';
            this.elements.joinSpinner?.classList.remove('hidden');
            this.elements.joinBtn.disabled = true;
        } else {
            this.elements.joinBtnText.textContent = 'Join Room';
            this.elements.joinSpinner?.classList.add('hidden');
            this.elements.joinBtn.disabled = false;
        }
    }

    showJoinError(message) {
        this.elements.joinError.textContent = message;
        this.elements.joinError?.classList.remove('hidden');
    }

    hideJoinError() {
        this.elements.joinError?.classList.add('hidden');
    }

    // Chat functionality
    enterChat() {
        this.showScreen('chat');
        this.elements.chatTitle.textContent = `PR Message - Room ${this.currentRoom}`;
        this.elements.messageInput?.focus();
        
        // Show connection status
        this.updateConnectionStatus('connected');
    }

    async loadMessages(roomCode) {
        try {
            const messages = await AppwriteHelper.getMessages(roomCode);
            const roomData = this.chatRooms.get(roomCode);
            if (roomData) {
                roomData.messages = messages;
                this.displayMessages(messages);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    displayMessages(messages) {
        this.elements.messagesList.innerHTML = '';
        messages.forEach(msg => this.displayMessage(msg));
        this.scrollToBottom();
    }

    displayMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.sender_id === this.currentUser ? 'message--sent' : 'message--received'}`;
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        
        messageEl.innerHTML = `
            <div class="message__content">
                <div class="message__text">${this.escapeHtml(message.content)}</div>
                <div class="message__time">${timestamp}</div>
            </div>
        `;
        
        this.elements.messagesList.appendChild(messageEl);
        this.scrollToBottom();
    }

    async handleMessageForm(e) {
        e.preventDefault();
        
        const content = this.elements.messageInput?.value.trim();
        if (!content || !this.currentRoom) return;
        
        try {
            // Send message to Appwrite
            await AppwriteHelper.sendMessage(this.currentRoom, this.currentUser, content);
            
            // Clear input
            this.elements.messageInput.value = '';
            
        } catch (error) {
            console.error('Failed to send message:', error);
            this.showError('Failed to send message. Please try again.');
        }
    }

    // Real-time subscriptions
    subscribeToRoom(roomCode) {
        try {
            this.roomSubscription = AppwriteHelper.subscribeToRoom(roomCode, (response) => {
                console.log('Room update:', response);
                
                if (response.events.includes('databases.*.collections.*.documents.*.update')) {
                    // Someone joined the room
                    if (response.payload.joiner_id && this.userRole === 'creator') {
                        this.elements.waitingForJoiner?.classList.add('hidden');
                        this.subscribeToMessages(roomCode);
                        this.loadMessages(roomCode);
                        this.enterChat();
                    }
                }
            });
        } catch (error) {
            console.error('Failed to subscribe to room updates:', error);
        }
    }

    subscribeToMessages(roomCode) {
        try {
            this.messageSubscription = AppwriteHelper.subscribeToMessages(roomCode, (response) => {
                console.log('Message update:', response);
                
                if (response.events.includes('databases.*.collections.*.documents.*.create')) {
                    // New message received
                    this.displayMessage(response.payload);
                }
            });
        } catch (error) {
            console.error('Failed to subscribe to messages:', error);
        }
    }

    // Utility functions
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen?.classList.remove('active');
        });
        this.screens[screenName]?.classList.add('active');
    }

    showError(message) {
        // Create or update error notification
        let errorEl = document.getElementById('errorNotification');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'errorNotification';
            errorEl.className = 'error-notification';
            document.body.appendChild(errorEl);
        }
        
        errorEl.textContent = message;
        errorEl.classList.add('show');
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorEl.classList.remove('show');
        }, 5000);
    }

    updateConnectionStatus(status) {
        const statusEl = this.elements.connectionStatus;
        const dot = statusEl?.querySelector('.status-dot');
        const text = statusEl?.querySelector('.status-text');
        
        if (status === 'connected') {
            dot?.classList.remove('disconnected');
            dot?.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            dot?.classList.remove('connected');
            dot?.classList.add('disconnected');
            text.textContent = 'Disconnected';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        this.elements.messagesList.scrollTop = this.elements.messagesList.scrollHeight;
    }

    // Debug functionality
    showDebugPanel() {
        this.elements.debugPanel?.classList.remove('hidden');
        this.elements.showDebugBtn?.classList.add('hidden');
        this.updateDebugInfo();
    }

    hideDebugPanel() {
        this.elements.debugPanel?.classList.add('hidden');
        this.elements.showDebugBtn?.classList.remove('hidden');
    }

    updateDebugInfo() {
        if (!this.elements.debugContent) return;
        
        const debugInfo = {
            'Active Rooms': this.chatRooms.size,
            'Current Room': this.currentRoom || 'None',
            'User Role': this.userRole || 'None',
            'Session ID': this.session?.$id || 'None',
            'Appwrite Status': this.session ? 'Connected' : 'Disconnected'
        };
        
        let html = '<div class="debug-info">';
        for (const [key, value] of Object.entries(debugInfo)) {
            html += `<div class="debug-item"><strong>${key}:</strong> ${value}</div>`;
        }
        html += '</div>';
        
        if (this.chatRooms.size > 0) {
            html += '<div class="debug-rooms"><h5>Room Details:</h5>';
            for (const [code, room] of this.chatRooms) {
                html += `<div class="debug-room">
                    <strong>${code}:</strong> 
                    Creator: ${room.creator?.substr(0, 8)}..., 
                    Joiner: ${room.joiner?.substr(0, 8) || 'None'}..., 
                    Messages: ${room.messages?.length || 0}
                </div>`;
            }
            html += '</div>';
        }
        
        this.elements.debugContent.innerHTML = html;
    }

    async clearAllRooms() {
        if (confirm('Are you sure you want to clear all rooms? This will reset the application.')) {
            this.chatRooms.clear();
            this.currentRoom = null;
            this.currentRoomDoc = null;
            this.userRole = null;
            
            // Unsubscribe from real-time updates
            if (this.messageSubscription) this.messageSubscription();
            if (this.roomSubscription) this.roomSubscription();
            
            this.showScreen('home');
            this.updateDebugInfo();
            
            console.log('🧹 All rooms cleared');
        }
    }

    async testConnection() {
        const result = await testAppwriteConnection();
        const message = result ? 'Appwrite connection successful!' : 'Appwrite connection failed!';
        alert(message);
    }

    leaveChat() {
        if (confirm('Are you sure you want to leave this chat?')) {
            // Clean up subscriptions
            if (this.messageSubscription) this.messageSubscription();
            if (this.roomSubscription) this.roomSubscription();
            
            // Clean up WebRTC
            this.cleanupWebRTC();
            
            // Reset state
            this.currentRoom = null;
            this.currentRoomDoc = null;
            this.userRole = null;
            
            this.showScreen('home');
            console.log('👋 Left chat room');
        }
    }

    // Placeholder functions for WebRTC features
    toggleVideoCall() {
        console.log('🎥 Video call feature - Coming soon with WebRTC implementation');
    }

    toggleVoiceCall() {
        console.log('📞 Voice call feature - Coming soon with WebRTC implementation');
    }

    toggleScreenShare() {
        console.log('🖥️ Screen share feature - Coming soon with WebRTC implementation');
    }

    toggleVoiceRecording() {
        console.log('🎤 Voice recording feature - Coming soon');
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            console.log('📎 File sharing feature - Coming soon', files);
        }
    }

    setupDragAndDrop() {
        console.log('🎯 Drag and drop setup - Coming soon');
    }

    handleKeyboardShortcuts(e) {
        // ESC to close modals/panels
        if (e.key === 'Escape') {
            if (!this.elements.debugPanel?.classList.contains('hidden')) {
                this.hideDebugPanel();
            }
        }
    }

    cleanupWebRTC() {
        // Cleanup WebRTC connections
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.prMessageApp = new PRMessageApp();
});

// Export for debugging
if (typeof window !== 'undefined') {
    window.PRMessageApp = PRMessageApp;
}
