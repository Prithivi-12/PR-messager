class ChatConnectProApp {
    constructor() {
        // Application state
        this.chatRooms = {};
        this.currentUser = null;
        this.currentRoom = null;
        this.userRole = null; // 'creator' or 'joiner'
        this.messagePollingInterval = null;
        this.pollingFrequency = 500;
        this.codeLength = 6;
        this.maxRoomAge = 3600000; // 1 hour
        this.messageCounter = 0;

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

        // DOM elements - will be initialized after DOM is ready
        this.screens = {};
        this.elements = {};

        this.init();
    }

    init() {
        this.initializeElements();
        this.bindEvents();
        this.showScreen('home');
        this.startRoomCleanup();
        this.updateDebugInfo();
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
            // Home screen
            createInviteBtn: document.getElementById('createInviteBtn'),
            joinWithCodeBtn: document.getElementById('joinWithCodeBtn'),
            debugPanel: document.getElementById('debugPanel'),
            debugContent: document.getElementById('debugContent'),
            showDebugBtn: document.getElementById('showDebugBtn'),
            toggleDebugBtn: document.getElementById('toggleDebugBtn'),

            // Create invite screen
            backFromCreateBtn: document.getElementById('backFromCreateBtn'),
            codeGenerating: document.getElementById('codeGenerating'),
            codeGenerated: document.getElementById('codeGenerated'),
            inviteCode: document.getElementById('inviteCode'),
            copyCodeBtn: document.getElementById('copyCodeBtn'),

            // Join screen
            backFromJoinBtn: document.getElementById('backFromJoinBtn'),
            joinForm: document.getElementById('joinForm'),
            codeInput: document.getElementById('codeInput'),
            joinBtn: document.getElementById('joinBtn'),
            joinBtnText: document.getElementById('joinBtnText'),
            joinSpinner: document.getElementById('joinSpinner'),
            joinError: document.getElementById('joinError'),
            validationSteps: document.getElementById('validationSteps'),

            // Chat screen
            chatTitle: document.getElementById('chatTitle'),
            connectionStatus: document.getElementById('connectionStatus'),
            leaveChatBtn: document.getElementById('leaveChatBtn'),
            settingsBtn: document.getElementById('settingsBtn'),

            // Media controls
            videoCallBtn: document.getElementById('videoCallBtn'),
            voiceCallBtn: document.getElementById('voiceCallBtn'),
            screenShareBtn: document.getElementById('screenShareBtn'),
            voiceRecordBtn: document.getElementById('voiceRecordBtn'),
            fileShareBtn: document.getElementById('fileShareBtn'),
            connectionQuality: document.getElementById('connectionQuality'),
            qualityText: document.getElementById('qualityText'),

            // Video interface
            videoInterface: document.getElementById('videoInterface'),
            localVideo: document.getElementById('localVideo'),
            remoteVideo: document.getElementById('remoteVideo'),
            toggleCameraBtn: document.getElementById('toggleCameraBtn'),
            toggleMicBtn: document.getElementById('toggleMicBtn'),
            endCallBtn: document.getElementById('endCallBtn'),

            // Screen share interface
            screenShareInterface: document.getElementById('screenShareInterface'),
            screenVideo: document.getElementById('screenVideo'),
            stopScreenShareBtn: document.getElementById('stopScreenShareBtn'),

            // Voice recording interface
            voiceRecordInterface: document.getElementById('voiceRecordInterface'),
            recordingTimer: document.getElementById('recordingTimer'),
            stopRecordingBtn: document.getElementById('stopRecordingBtn'),
            cancelRecordingBtn: document.getElementById('cancelRecordingBtn'),

            // Messages
            messagesList: document.getElementById('messagesList'),
            messageForm: document.getElementById('messageForm'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            attachBtn: document.getElementById('attachBtn'),
            fileInput: document.getElementById('fileInput'),
            fileDropZone: document.getElementById('fileDropZone'),

            // Settings modal
            settingsModal: document.getElementById('settingsModal'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            cameraSelect: document.getElementById('cameraSelect'),
            microphoneSelect: document.getElementById('microphoneSelect'),
            speakerSelect: document.getElementById('speakerSelect')
        };
    }

    bindEvents() {
        // Navigation events
        if (this.elements.createInviteBtn) {
            this.elements.createInviteBtn.addEventListener('click', () => {
                console.log('Create Invite clicked');
                this.createInvite();
            });
        }

        if (this.elements.joinWithCodeBtn) {
            this.elements.joinWithCodeBtn.addEventListener('click', () => {
                console.log('Join with Code clicked');
                this.showJoinScreen();
            });
        }

        if (this.elements.backFromCreateBtn) {
            this.elements.backFromCreateBtn.addEventListener('click', () => this.showScreen('home'));
        }

        if (this.elements.backFromJoinBtn) {
            this.elements.backFromJoinBtn.addEventListener('click', () => this.showScreen('home'));
        }

        if (this.elements.leaveChatBtn) {
            this.elements.leaveChatBtn.addEventListener('click', () => this.leaveChat());
        }

        // Debug panel
        if (this.elements.showDebugBtn) {
            this.elements.showDebugBtn.addEventListener('click', () => {
                console.log('Show debug clicked');
                this.toggleDebugPanel(true);
            });
        }

        if (this.elements.toggleDebugBtn) {
            this.elements.toggleDebugBtn.addEventListener('click', () => {
                console.log('Toggle debug clicked');
                this.toggleDebugPanel(false);
            });
        }

        // Invite functionality
        if (this.elements.copyCodeBtn) {
            this.elements.copyCodeBtn.addEventListener('click', () => this.copyInviteCode());
        }

        // Join functionality with real-time validation
        if (this.elements.joinForm) {
            this.elements.joinForm.addEventListener('submit', (e) => this.handleJoinSubmit(e));
        }

        if (this.elements.codeInput) {
            this.elements.codeInput.addEventListener('input', (e) => this.handleCodeInput(e));
        }

        // Settings
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
        }

        if (this.elements.closeSettingsBtn) {
            this.elements.closeSettingsBtn.addEventListener('click', () => this.hideSettings());
        }

        if (this.elements.settingsModal) {
            this.elements.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.elements.settingsModal) this.hideSettings();
            });
        }

        // Media controls
        if (this.elements.videoCallBtn) {
            this.elements.videoCallBtn.addEventListener('click', () => this.toggleVideoCall());
        }

        if (this.elements.voiceCallBtn) {
            this.elements.voiceCallBtn.addEventListener('click', () => this.toggleVoiceCall());
        }

        if (this.elements.screenShareBtn) {
            this.elements.screenShareBtn.addEventListener('click', () => this.toggleScreenShare());
        }

        if (this.elements.voiceRecordBtn) {
            this.elements.voiceRecordBtn.addEventListener('click', () => this.startVoiceRecording());
        }

        if (this.elements.fileShareBtn && this.elements.fileInput) {
            this.elements.fileShareBtn.addEventListener('click', () => this.elements.fileInput.click());
        }

        // Video controls
        if (this.elements.toggleCameraBtn) {
            this.elements.toggleCameraBtn.addEventListener('click', () => this.toggleCamera());
        }

        if (this.elements.toggleMicBtn) {
            this.elements.toggleMicBtn.addEventListener('click', () => this.toggleMicrophone());
        }

        if (this.elements.endCallBtn) {
            this.elements.endCallBtn.addEventListener('click', () => this.endCall());
        }

        if (this.elements.stopScreenShareBtn) {
            this.elements.stopScreenShareBtn.addEventListener('click', () => this.stopScreenShare());
        }

        // Voice recording controls
        if (this.elements.stopRecordingBtn) {
            this.elements.stopRecordingBtn.addEventListener('click', () => this.stopRecording(true));
        }

        if (this.elements.cancelRecordingBtn) {
            this.elements.cancelRecordingBtn.addEventListener('click', () => this.stopRecording(false));
        }

        // Chat functionality
        if (this.elements.messageForm) {
            this.elements.messageForm.addEventListener('submit', (e) => this.handleMessageSubmit(e));
        }

        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleMessageSubmit(e);
                }
            });
        }

        // File handling
        if (this.elements.attachBtn && this.elements.fileInput) {
            this.elements.attachBtn.addEventListener('click', () => this.elements.fileInput.click());
        }

        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        }

        // Drag and drop
        this.bindDragAndDropEvents();
    }

    bindDragAndDropEvents() {
        const chatContainer = document.querySelector('.chat-container');
        if (!chatContainer) return;
        
        chatContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.elements.fileDropZone) {
                this.elements.fileDropZone.classList.remove('hidden');
            }
        });

        chatContainer.addEventListener('dragleave', (e) => {
            if (!chatContainer.contains(e.relatedTarget) && this.elements.fileDropZone) {
                this.elements.fileDropZone.classList.add('hidden');
            }
        });

        chatContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.elements.fileDropZone) {
                this.elements.fileDropZone.classList.add('hidden');
            }
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
    }

    // Debug functionality
    toggleDebugPanel(show) {
        if (show) {
            if (this.elements.debugPanel) {
                this.elements.debugPanel.classList.remove('hidden');
            }
            if (this.elements.showDebugBtn) {
                this.elements.showDebugBtn.classList.add('hidden');
            }
        } else {
            if (this.elements.debugPanel) {
                this.elements.debugPanel.classList.add('hidden');
            }
            if (this.elements.showDebugBtn) {
                this.elements.showDebugBtn.classList.remove('hidden');
            }
        }
        this.updateDebugInfo();
    }

    updateDebugInfo() {
        if (!this.elements.debugContent) return;

        const info = {
            'Active Rooms': Object.keys(this.chatRooms).length,
            'Current Room': this.currentRoom || 'None',
            'User Role': this.userRole || 'None',
            'WebRTC State': this.peerConnection?.connectionState || 'None',
            'Video Active': this.isVideoCall,
            'Voice Active': this.isVoiceCall,
            'Screen Share': this.isScreenSharing,
            'Recording': this.isRecording
        };

        const debugText = Object.entries(info)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        this.elements.debugContent.textContent = debugText;
    }

    // Code validation with real-time feedback
    validateCode(code) {
        if (!this.elements.validationSteps) return false;

        const steps = [
            {
                key: 'length',
                text: `Code must be ${this.codeLength} characters`,
                valid: code.length === this.codeLength
            },
            {
                key: 'format',
                text: 'Only letters and numbers allowed',
                valid: /^[A-Z0-9]+$/.test(code)
            },
            {
                key: 'exists',
                text: 'Code must exist in system',
                valid: code.length === this.codeLength ? !!this.chatRooms[code] : null
            },
            {
                key: 'available',
                text: 'Room must be available',
                valid: code.length === this.codeLength && this.chatRooms[code] ? 
                    !this.chatRooms[code].joiner : null
            }
        ];

        // Update validation UI
        this.elements.validationSteps.innerHTML = steps.map(step => {
            let className = 'validation-step';
            if (step.valid === true) className += ' valid';
            else if (step.valid === false) className += ' invalid';
            
            return `<div class="${className}">${step.text}</div>`;
        }).join('');

        return steps.every(step => step.valid === true);
    }

    handleCodeInput(e) {
        // Convert to uppercase, remove invalid characters, and limit length
        let value = e.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        e.target.value = value.substring(0, this.codeLength);
        
        // Real-time validation
        this.validateCode(value);
        this.clearJoinError();
    }

    showScreen(screenName) {
        try {
            console.log(`Switching to screen: ${screenName}`);
            
            // Hide all screens
            Object.values(this.screens).forEach(screen => {
                if (screen) {
                    screen.classList.remove('active');
                }
            });
            
            // Show target screen
            if (this.screens[screenName]) {
                this.screens[screenName].classList.add('active');
                console.log(`Screen ${screenName} is now active`);
            } else {
                console.error(`Screen '${screenName}' not found`);
            }
            
            this.updateDebugInfo();
        } catch (error) {
            console.error('Error switching screens:', error);
        }
    }

    generateSecureCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        
        // Use crypto.getRandomValues for cryptographically secure random generation
        if (crypto && crypto.getRandomValues) {
            const randomBytes = new Uint8Array(this.codeLength);
            crypto.getRandomValues(randomBytes);
            
            for (let i = 0; i < this.codeLength; i++) {
                result += characters.charAt(randomBytes[i] % characters.length);
            }
        } else {
            // Fallback for environments without crypto API
            for (let i = 0; i < this.codeLength; i++) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        }
        
        return result;
    }

    createInvite() {
        console.log('Creating invite...');
        this.showScreen('createInvite');
        
        // Show loading state
        if (this.elements.codeGenerating) {
            this.elements.codeGenerating.classList.remove('hidden');
        }
        if (this.elements.codeGenerated) {
            this.elements.codeGenerated.classList.add('hidden');
        }

        // Generate code after a short delay for better UX
        setTimeout(() => {
            try {
                // Generate unique room code
                let roomCode;
                do {
                    roomCode = this.generateSecureCode();
                } while (this.chatRooms[roomCode]);

                console.log(`Generated room code: ${roomCode}`);

                // Create chat room
                this.currentRoom = roomCode;
                this.userRole = 'creator';
                this.currentUser = 'creator_' + Date.now();
                
                this.chatRooms[roomCode] = {
                    roomCode: roomCode,
                    creator: this.currentUser,
                    joiner: null,
                    messages: [],
                    createdAt: Date.now(),
                    connected: false
                };

                // Update UI
                if (this.elements.inviteCode) {
                    this.elements.inviteCode.textContent = roomCode;
                }
                
                if (this.elements.codeGenerating) {
                    this.elements.codeGenerating.classList.add('hidden');
                }
                
                if (this.elements.codeGenerated) {
                    this.elements.codeGenerated.classList.remove('hidden');
                }

                console.log('Room created successfully');
                
                // Start polling for joiner
                this.startConnectionPolling();
                this.updateDebugInfo();
                
                this.showToast('Room created! Share the code to invite someone.');
            } catch (error) {
                console.error('Error generating invite:', error);
                this.showToast('Error generating invite code. Please try again.', 'error');
                this.showScreen('home');
            }
        }, 1500); // Slightly longer delay to show the loading animation
    }

    startConnectionPolling() {
        const pollForConnection = () => {
            try {
                const room = this.chatRooms[this.currentRoom];
                if (room && room.joiner && room.connected) {
                    console.log('Connection established, entering chat');
                    this.enterChat();
                    return;
                }
                if (room) {
                    setTimeout(pollForConnection, this.pollingFrequency);
                }
            } catch (error) {
                console.error('Error in connection polling:', error);
            }
        };
        
        setTimeout(pollForConnection, this.pollingFrequency);
    }

    copyInviteCode() {
        if (!this.elements.inviteCode) return;
        
        const code = this.elements.inviteCode.textContent;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => {
                this.showToast('Code copied to clipboard!');
                this.updateCopyButton();
            }).catch(() => {
                this.fallbackCopyText(code);
            });
        } else {
            this.fallbackCopyText(code);
        }
    }

    fallbackCopyText(text) {
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
            this.showToast('Code copied to clipboard!');
            this.updateCopyButton();
        } catch (err) {
            console.error('Fallback copy failed:', err);
            this.showToast('Unable to copy code. Please copy manually.', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    updateCopyButton() {
        if (!this.elements.copyCodeBtn) return;
        
        const originalText = this.elements.copyCodeBtn.textContent;
        this.elements.copyCodeBtn.textContent = 'Copied!';
        setTimeout(() => {
            this.elements.copyCodeBtn.textContent = originalText;
        }, 2000);
    }

    showJoinScreen() {
        console.log('Showing join screen...');
        this.showScreen('join');
        setTimeout(() => {
            if (this.elements.codeInput) {
                this.elements.codeInput.focus();
            }
        }, 100);
        this.clearJoinError();
        if (this.elements.validationSteps) {
            this.elements.validationSteps.innerHTML = '';
        }
    }

    handleJoinSubmit(e) {
        e.preventDefault();
        
        if (!this.elements.codeInput) return;
        
        const code = this.elements.codeInput.value.trim().toUpperCase();
        
        // Validate code format first
        if (!this.validateCode(code)) {
            this.showJoinError('Please fix the validation errors above.');
            return;
        }

        // Show loading state
        this.setJoinButtonLoading(true);

        // Simulate network delay
        setTimeout(() => {
            try {
                const room = this.chatRooms[code];
                
                if (!room) {
                    this.showJoinError('Invalid code. Room not found.');
                    this.setJoinButtonLoading(false);
                    return;
                }

                if (room.joiner) {
                    this.showJoinError('This room is already full.');
                    this.setJoinButtonLoading(false);
                    return;
                }

                // Join the room
                this.currentRoom = code;
                this.userRole = 'joiner';
                this.currentUser = 'joiner_' + Date.now();
                
                room.joiner = this.currentUser;
                room.connected = true;

                // Add system message
                this.addSystemMessage(code, 'Connected! Advanced features available.');

                this.setJoinButtonLoading(false);
                this.enterChat();
                
                console.log(`Successfully joined room: ${code}`);
            } catch (error) {
                console.error('Error joining room:', error);
                this.showJoinError('Error joining room. Please try again.');
                this.setJoinButtonLoading(false);
            }
        }, 800);
    }

    setJoinButtonLoading(loading) {
        if (loading) {
            if (this.elements.joinBtnText) {
                this.elements.joinBtnText.textContent = 'Joining...';
            }
            if (this.elements.joinSpinner) {
                this.elements.joinSpinner.classList.remove('hidden');
            }
            if (this.elements.joinBtn) {
                this.elements.joinBtn.disabled = true;
            }
        } else {
            if (this.elements.joinBtnText) {
                this.elements.joinBtnText.textContent = 'Join Room';
            }
            if (this.elements.joinSpinner) {
                this.elements.joinSpinner.classList.add('hidden');
            }
            if (this.elements.joinBtn) {
                this.elements.joinBtn.disabled = false;
            }
        }
    }

    showJoinError(message) {
        if (this.elements.joinError) {
            this.elements.joinError.textContent = message;
            this.elements.joinError.classList.remove('hidden');
        }
    }

    clearJoinError() {
        if (this.elements.joinError) {
            this.elements.joinError.classList.add('hidden');
        }
    }

    enterChat() {
        console.log('Entering chat...');
        this.showScreen('chat');
        
        if (this.elements.chatTitle) {
            this.elements.chatTitle.textContent = `Room: ${this.currentRoom}`;
        }
        
        setTimeout(() => {
            if (this.elements.messageInput) {
                this.elements.messageInput.focus();
            }
        }, 100);
        
        this.loadMessages();
        this.startMessagePolling();
        this.updateConnectionStatus();
        this.updateDebugInfo();
    }

    updateConnectionStatus() {
        if (!this.elements.connectionStatus) return;
        
        const status = this.peerConnection?.connectionState || 'connected';
        const statusElement = this.elements.connectionStatus;
        
        statusElement.classList.remove('status--success', 'status--warning', 'status--error');
        
        switch (status) {
            case 'connected':
                statusElement.textContent = 'Connected';
                statusElement.classList.add('status--success');
                break;
            case 'connecting':
                statusElement.textContent = 'Connecting...';
                statusElement.classList.add('status--warning');
                break;
            case 'disconnected':
            case 'failed':
                statusElement.textContent = 'Disconnected';
                statusElement.classList.add('status--error');
                break;
            default:
                statusElement.textContent = 'Connected';
                statusElement.classList.add('status--success');
        }
    }

    // Media functionality stubs for now (will be implemented later)
    async toggleVideoCall() {
        this.isVideoCall = !this.isVideoCall;
        if (this.elements.videoCallBtn) {
            this.elements.videoCallBtn.classList.toggle('active', this.isVideoCall);
        }
        this.showToast(this.isVideoCall ? 'Video call started (demo)' : 'Video call ended');
        this.updateDebugInfo();
    }

    async toggleVoiceCall() {
        this.isVoiceCall = !this.isVoiceCall;
        if (this.elements.voiceCallBtn) {
            this.elements.voiceCallBtn.classList.toggle('active', this.isVoiceCall);
        }
        this.showToast(this.isVoiceCall ? 'Voice call started (demo)' : 'Voice call ended');
        this.updateDebugInfo();
    }

    async toggleScreenShare() {
        this.isScreenSharing = !this.isScreenSharing;
        if (this.elements.screenShareBtn) {
            this.elements.screenShareBtn.classList.toggle('active', this.isScreenSharing);
        }
        this.showToast(this.isScreenSharing ? 'Screen sharing started (demo)' : 'Screen sharing stopped');
        this.updateDebugInfo();
    }

    startVoiceRecording() {
        this.isRecording = !this.isRecording;
        if (this.elements.voiceRecordBtn) {
            this.elements.voiceRecordBtn.classList.toggle('active', this.isRecording);
        }
        this.showToast(this.isRecording ? 'Voice recording started (demo)' : 'Voice recording stopped');
        this.updateDebugInfo();
    }

    toggleCamera() {
        this.showToast('Camera toggled (demo)');
    }

    toggleMicrophone() {
        this.showToast('Microphone toggled (demo)');
    }

    endCall() {
        this.isVideoCall = false;
        this.isVoiceCall = false;
        if (this.elements.videoCallBtn) {
            this.elements.videoCallBtn.classList.remove('active');
        }
        if (this.elements.voiceCallBtn) {
            this.elements.voiceCallBtn.classList.remove('active');
        }
        this.showToast('Call ended');
        this.updateDebugInfo();
    }

    stopScreenShare() {
        this.isScreenSharing = false;
        if (this.elements.screenShareBtn) {
            this.elements.screenShareBtn.classList.remove('active');
        }
        this.showToast('Screen sharing stopped');
        this.updateDebugInfo();
    }

    stopRecording(send = false) {
        this.isRecording = false;
        if (this.elements.voiceRecordBtn) {
            this.elements.voiceRecordBtn.classList.remove('active');
        }
        this.showToast(send ? 'Voice message sent (demo)' : 'Recording cancelled');
        this.updateDebugInfo();
    }

    handleFileSelection(e) {
        const files = Array.from(e.target.files);
        this.showToast(`${files.length} file(s) selected for sharing (demo)`);
        e.target.value = ''; // Reset input
    }

    handleFiles(files) {
        this.showToast(`${files.length} file(s) dropped for sharing (demo)`);
    }

    // Message handling
    handleMessageSubmit(e) {
        e.preventDefault();
        
        if (!this.elements.messageInput) return;
        
        const messageText = this.elements.messageInput.value.trim();
        if (!messageText) return;

        this.sendMessage(messageText);
        this.elements.messageInput.value = '';
    }

    sendMessage(text, type = 'text', metadata = null) {
        const room = this.chatRooms[this.currentRoom];
        if (!room) return;

        const message = {
            id: ++this.messageCounter,
            text: text,
            type: type,
            metadata: metadata,
            sender: this.currentUser,
            timestamp: Date.now()
        };

        room.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
    }

    addSystemMessage(roomCode, text) {
        const room = this.chatRooms[roomCode];
        if (!room) return;

        const message = {
            id: ++this.messageCounter,
            text: text,
            type: 'system',
            sender: 'system',
            timestamp: Date.now()
        };

        room.messages.push(message);
    }

    loadMessages() {
        const room = this.chatRooms[this.currentRoom];
        if (!room || !this.elements.messagesList) return;

        this.elements.messagesList.innerHTML = '';
        
        if (room.messages.length === 0) {
            this.showEmptyState();
        } else {
            room.messages.forEach(message => this.renderMessage(message));
            this.scrollToBottom();
        }
    }

    renderMessage(message) {
        if (!this.elements.messagesList) return;
        
        // Remove empty state if it exists
        const emptyState = this.elements.messagesList.querySelector('.empty-messages');
        if (emptyState) {
            emptyState.remove();
        }

        if (message.sender === 'system') {
            this.renderSystemMessage(message);
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender === this.currentUser ? 'message--sent' : 'message--received'}`;
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        
        const textP = document.createElement('p');
        textP.className = 'message-text';
        textP.textContent = message.text;
        
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'message-timestamp';
        timestampDiv.textContent = this.formatTimestamp(message.timestamp);
        
        bubbleDiv.appendChild(textP);
        bubbleDiv.appendChild(timestampDiv);
        messageDiv.appendChild(bubbleDiv);
        
        this.elements.messagesList.appendChild(messageDiv);
    }

    renderSystemMessage(message) {
        if (!this.elements.messagesList) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.padding = '16px';
        messageDiv.style.color = 'var(--color-text-secondary)';
        messageDiv.style.fontSize = '14px';
        messageDiv.style.fontStyle = 'italic';
        messageDiv.textContent = message.text;
        
        this.elements.messagesList.appendChild(messageDiv);
    }

    showEmptyState() {
        if (!this.elements.messagesList) return;
        
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-messages';
        emptyDiv.innerHTML = `
            <div class="empty-messages-icon">💬</div>
            <p>No messages yet. Start the conversation!</p>
        `;
        this.elements.messagesList.appendChild(emptyDiv);
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    scrollToBottom() {
        if (!this.elements.messagesList) return;
        
        const container = this.elements.messagesList;
        container.scrollTop = container.scrollHeight;
    }

    startMessagePolling() {
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
        }

        this.messagePollingInterval = setInterval(() => {
            this.pollForNewMessages();
        }, this.pollingFrequency);
    }

    pollForNewMessages() {
        const room = this.chatRooms[this.currentRoom];
        if (!room || !this.elements.messagesList) {
            this.stopMessagePolling();
            return;
        }

        // Simple check - in a real app this would sync with other users
        // For now, just ensure messages are rendered
        const currentMessageCount = this.elements.messagesList.children.length;
        const actualMessageCount = room.messages.length;

        if (actualMessageCount > currentMessageCount) {
            this.loadMessages();
        }
    }

    stopMessagePolling() {
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
            this.messagePollingInterval = null;
        }
    }

    // Settings
    showSettings() {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.classList.remove('hidden');
        }
        this.showToast('Settings opened (demo functionality)');
    }

    hideSettings() {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.classList.add('hidden');
        }
    }

    leaveChat() {
        this.stopMessagePolling();
        
        // Clean up room if user was creator
        if (this.userRole === 'creator' && this.chatRooms[this.currentRoom]) {
            delete this.chatRooms[this.currentRoom];
        }
        
        // Reset state
        this.currentRoom = null;
        this.currentUser = null;
        this.userRole = null;
        this.isVideoCall = false;
        this.isVoiceCall = false;
        this.isScreenSharing = false;
        this.isRecording = false;
        
        // Reset forms
        if (this.elements.codeInput) {
            this.elements.codeInput.value = '';
        }
        this.clearJoinError();
        if (this.elements.validationSteps) {
            this.elements.validationSteps.innerHTML = '';
        }
        
        this.showScreen('home');
        this.updateDebugInfo();
        
        console.log('Left chat, returned to home');
    }

    startRoomCleanup() {
        setInterval(() => {
            const now = Date.now();
            Object.keys(this.chatRooms).forEach(roomCode => {
                const room = this.chatRooms[roomCode];
                if (now - room.createdAt > this.maxRoomAge) {
                    delete this.chatRooms[roomCode];
                }
            });
            this.updateDebugInfo();
        }, 300000); // Clean up every 5 minutes
    }

    showToast(message, type = 'success') {
        // Remove existing toasts
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type === 'error' ? 'toast--error' : ''}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing ChatConnect Pro...');
        window.chatApp = new ChatConnectProApp();
        console.log('ChatConnect Pro initialized successfully');
    } catch (error) {
        console.error('Failed to initialize ChatConnect Pro app:', error);
    }
});
