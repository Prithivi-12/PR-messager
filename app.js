// PR Messenger - Main Application with Appwrite Integration
class PRMessenger {
    constructor() {
        this.currentUser = null;
        this.currentRoom = null;
        this.currentRoomCode = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isInCall = false;
        this.callStartTime = null;
        this.callTimer = null;
        this.dataChannel = null;
        this.typingTimeout = null;
        this.participants = new Map();
        
        // Initialize after DOM and Appwrite are ready
        this.initWhenReady();
    }

    async initWhenReady() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.waitForAppwrite());
        } else {
            await this.waitForAppwrite();
        }
    }

    async waitForAppwrite() {
        // Wait for Appwrite service to be ready
        const checkAppwrite = async () => {
            if (window.appwriteService && window.appwriteService.isConnectedToAppwrite()) {
                await this.init();
            } else {
                setTimeout(checkAppwrite, 500);
            }
        };
        await checkAppwrite();
    }

    async init() {
        console.log('🚀 PR Messenger initializing with Appwrite...');
        
        try {
            this.bindEvents();
            this.showLandingPage();
            this.setupWebRTC();
            
            console.log('✅ PR Messenger initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize PR Messenger:', error);
            this.showToast('Failed to initialize application', 'error');
        }
    }

    // Event Binding
    bindEvents() {
        // Landing page events
        this.bindElement('createRoomBtn', 'click', () => this.showCreateRoomModal());
        this.bindElement('joinRoomBtn', 'click', () => this.showJoinRoomModal());
        
        // Modal events
        this.bindElement('joinRoomConfirm', 'click', () => this.joinRoom());
        this.bindElement('enterRoomBtn', 'click', () => this.createRoom());
        this.bindElement('copyCodeBtn', 'click', () => this.copyRoomCode());
        
        // Chat events
        this.bindElement('sendMessageBtn', 'click', () => this.sendMessage());
        this.bindElement('messageInput', 'keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.bindElement('messageInput', 'input', () => this.handleTyping());
        this.bindElement('leaveRoomBtn', 'click', () => this.leaveRoom());
        
        // Logo click to return home
        const navbar = document.querySelector('.navbar-brand');
        if (navbar) {
            navbar.addEventListener('click', () => this.leaveRoom());
            navbar.style.cursor = 'pointer';
        }
        
        // Media events
        this.bindElement('voiceRecordBtn', 'click', () => this.startVoiceRecording());
        this.bindElement('fileUploadBtn', 'click', () => this.triggerFileUpload());
        this.bindElement('videoCallBtn', 'click', () => this.startVideoCall());
        this.bindElement('voiceCallBtn', 'click', () => this.startVoiceCall());
        this.bindElement('screenShareBtn', 'click', () => this.startScreenShare());
        
        // Voice recording modal events
        this.bindElement('stopRecordingBtn', 'click', () => this.stopRecording());
        this.bindElement('discardRecordingBtn', 'click', () => this.discardRecording());
        this.bindElement('sendVoiceBtn', 'click', () => this.sendVoiceMessage());
        
        // Call control events
        this.bindElement('endCallBtn', 'click', () => this.endCall());
        this.bindElement('muteBtn', 'click', () => this.toggleMute());
        this.bindElement('cameraBtn', 'click', () => this.toggleCamera());
        this.bindElement('shareScreenBtn', 'click', () => this.toggleScreenShare());
        
        // File upload events
        this.bindElement('fileInput', 'change', (e) => this.handleFileUpload(e));
        
        // Setup drag and drop for files
        this.setupDragAndDrop();
    }

    bindElement(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, (e) => {
                e.preventDefault();
                e.stopPropagation();
                handler(e);
            });
        }
    }

    // Room Management
    generateRoomCode() {
        return appwriteService.generateRoomCode();
    }

    showCreateRoomModal() {
        console.log('📝 Showing create room modal');
        const code = this.generateRoomCode();
        const codeInput = document.getElementById('generatedRoomCode');
        if (codeInput) {
            codeInput.value = code;
        }
        
        const modal = document.getElementById('createRoomModal');
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }
    }

    showJoinRoomModal() {
        console.log('🚪 Showing join room modal');
        const modal = document.getElementById('joinRoomModal');
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }
    }

    copyRoomCode() {
        const codeInput = document.getElementById('generatedRoomCode');
        if (codeInput) {
            codeInput.select();
            navigator.clipboard.writeText(codeInput.value).then(() => {
                this.showToast('Room code copied to clipboard!', 'success');
            }).catch(() => {
                document.execCommand('copy');
                this.showToast('Room code copied to clipboard!', 'success');
            });
        }
    }

    async createRoom() {
        const codeInput = document.getElementById('generatedRoomCode');
        const nameInput = document.getElementById('creatorNameInput');
        
        if (!codeInput || !nameInput) {
            this.showToast('Error accessing form elements', 'error');
            return;
        }
        
        const code = codeInput.value;
        const userName = nameInput.value.trim();
        
        if (!userName) {
            this.showToast('Please enter your name', 'error');
            return;
        }

        try {
            this.showLoading('Creating room...');
            
            // Create room in Appwrite
            this.currentRoom = await appwriteService.createRoom(code, userName);
            this.currentRoomCode = code;
            this.currentUser = {
                id: appwriteService.getCurrentUserId(),
                name: userName,
                currentRoom: code,
                role: 'creator'
            };
            
            // Hide modal
            const modal = document.getElementById('createRoomModal');
            if (modal) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            }
            
            this.hideLoading();
            this.showChatInterface();
            this.setupRoomSubscriptions();
            
            this.showToast(`Room ${code} created successfully!`, 'success');
            
        } catch (error) {
            this.hideLoading();
            console.error('❌ Failed to create room:', error);
            this.showToast('Failed to create room: ' + error.message, 'error');
        }
    }

    async joinRoom() {
        const codeInput = document.getElementById('roomCodeInput');
        const nameInput = document.getElementById('userNameInput');
        
        if (!codeInput || !nameInput) {
            this.showToast('Error accessing form elements', 'error');
            return;
        }
        
        const code = codeInput.value.trim();
        const userName = nameInput.value.trim();
        
        if (!code || code.length !== 6) {
            this.showToast('Please enter a valid 6-digit room code', 'error');
            return;
        }
        
        if (!userName) {
            this.showToast('Please enter your name', 'error');
            return;
        }

        try {
            this.showLoading('Joining room...');
            
            // Join room in Appwrite
            this.currentRoom = await appwriteService.joinRoom(code, userName, false);
            this.currentRoomCode = code;
            this.currentUser = {
                id: appwriteService.getCurrentUserId(),
                name: userName,
                currentRoom: code,
                role: 'participant'
            };
            
            // Hide modal
            const modal = document.getElementById('joinRoomModal');
            if (modal) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            }
            
            this.hideLoading();
            this.showChatInterface();
            this.setupRoomSubscriptions();
            
            this.showToast(`Successfully joined room ${code}!`, 'success');
            
        } catch (error) {
            this.hideLoading();
            console.error('❌ Failed to join room:', error);
            this.showToast('Failed to join room: ' + error.message, 'error');
        }
    }

    async leaveRoom() {
        if (!this.currentRoomCode || !this.currentUser) {
            this.showLandingPage();
            return;
        }
        
        console.log('🚪 Leaving room...');
        
        try {
            // End any active call first
            if (this.isInCall) {
                this.endCall();
            }
            
            // Leave room in Appwrite
            await appwriteService.leaveRoom(this.currentRoomCode, this.currentUser.name);
            
            // Cleanup subscriptions
            appwriteService.unsubscribeFromRoom(this.currentRoomCode);
            
            // Reset state
            this.currentRoom = null;
            this.currentRoomCode = null;
            this.currentUser = null;
            this.participants.clear();
            
            // Clear form inputs
            this.clearFormInputs();
            
            this.showLandingPage();
            this.showToast('Left the room successfully', 'info');
            
        } catch (error) {
            console.error('❌ Failed to leave room:', error);
            this.showToast('Error leaving room', 'error');
            this.showLandingPage(); // Show landing page anyway
        }
    }

    // Real-time Subscriptions
    setupRoomSubscriptions() {
        console.log('🔔 Setting up real-time subscriptions...');
        
        appwriteService.subscribeToRoom(
            this.currentRoomCode,
            (message, event) => this.handleRealtimeMessage(message, event),
            (participant, event) => this.handleRealtimeParticipant(participant, event)
        );
    }

    handleRealtimeMessage(message, event) {
        console.log('📨 Real-time message:', message, event);
        
        if (event.includes('create')) {
            this.displayMessage(message);
            this.scrollToBottom();
            
            // Handle WebRTC signaling messages
            if (message.type === 'signal') {
                this.handleWebRTCSignal(message);
            }
            
            // Show notification if message is from another user
            if (message.senderId !== this.currentUser?.id && message.type === 'text') {
                this.showToast(`New message from ${message.senderName}`, 'info');
            }
        }
    }

    handleRealtimeParticipant(participant, event) {
        console.log('👥 Real-time participant:', participant, event);
        
        if (event.includes('create')) {
            this.participants.set(participant.userId, participant);
            if (participant.userId !== this.currentUser?.id) {
                this.showToast(`${participant.userName} joined the room`, 'success');
            }
        } else if (event.includes('delete')) {
            this.participants.delete(participant.userId);
            this.showToast(`${participant.userName} left the room`, 'info');
        }
        
        this.updateParticipantsList();
    }

    // UI Management
    showLandingPage() {
        console.log('🏠 Showing landing page');
        this.hideAllInterfaces();
        const landingPage = document.getElementById('landingPage');
        if (landingPage) landingPage.classList.remove('d-none');
    }

    showChatInterface() {
        console.log('💬 Showing chat interface');
        this.hideAllInterfaces();
        const chatInterface = document.getElementById('chatInterface');
        if (chatInterface) chatInterface.classList.remove('d-none');
        
        const roomCodeEl = document.getElementById('currentRoomCode');
        if (roomCodeEl && this.currentRoomCode) {
            roomCodeEl.textContent = this.currentRoomCode;
        }
        
        this.loadMessages();
        this.updateParticipantsList();
    }

    hideAllInterfaces() {
        const interfaces = ['landingPage', 'chatInterface', 'callInterface'];
        interfaces.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.classList.add('d-none');
        });
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.querySelector('h5').textContent = message;
            overlay.classList.remove('d-none');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('d-none');
    }

    async loadMessages() {
        if (!this.currentRoomCode) return;
        
        try {
            const messages = await appwriteService.getMessages(this.currentRoomCode);
            const container = document.getElementById('messagesContainer');
            if (container) {
                container.innerHTML = '';
                messages.forEach(message => this.displayMessage(message));
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('❌ Failed to load messages:', error);
            this.showToast('Failed to load messages', 'error');
        }
    }

    displayMessage(message) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        const messageEl = this.createMessageElement(message);
        container.appendChild(messageEl);
        
        // Remove typing indicator if this message is from the typing user
        if (message.type !== 'system') {
            this.hideTypingIndicator();
        }
    }

    createMessageElement(message) {
        const messageEl = document.createElement('div');
        const isOwn = message.senderId === this.currentUser?.id;
        const isSystem = message.type === 'system';

        messageEl.className = `message ${isOwn ? 'own' : ''} ${isSystem ? 'system' : ''}`;

        if (isSystem) {
            messageEl.innerHTML = `<div class="message-bubble">${this.escapeHtml(message.content)}</div>`;
        } else {
            const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            let content = this.createMessageContent(message);

            messageEl.innerHTML = `
                ${content}
                <div class="message-info">
                    ${!isOwn ? `<strong>${this.escapeHtml(message.senderName)}</strong> • ` : ''}${time}
                </div>
            `;
        }

        return messageEl;
    }

    createMessageContent(message) {
        switch (message.type) {
            case 'text':
                return `<div class="message-bubble">${this.escapeHtml(message.content)}</div>`;
                
            case 'voice':
                return `
                    <div class="message-bubble">
                        <div class="voice-message">
                            <button class="play-btn" onclick="this.nextElementSibling.play()">
                                <i class="bi bi-play-fill"></i>
                            </button>
                            <audio controls>
                                <source src="${message.content}" type="audio/webm">
                            </audio>
                            <span class="duration">${message.duration || '0:00'}</span>
                        </div>
                    </div>
                `;
                
            case 'file':
                return `
                    <div class="message-bubble">
                        <div class="file-message">
                            <div class="file-icon ${message.fileType}">
                                <i class="bi bi-${this.getFileIcon(message.fileName)}"></i>
                            </div>
                            <div class="file-info">
                                <div class="file-name">${this.escapeHtml(message.fileName)}</div>
                                <div class="file-size">${this.formatFileSize(message.fileSize)}</div>
                            </div>
                            <button class="btn btn-sm btn-primary download-btn" onclick="window.open('${message.fileUrl}')">
                                <i class="bi bi-download"></i>
                            </button>
                        </div>
                    </div>
                `;
                
            default:
                return `<div class="message-bubble">${this.escapeHtml(message.content)}</div>`;
        }
    }

    updateParticipantsList() {
        const container = document.getElementById('participantsList');
        const count = document.getElementById('participantCount');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        this.participants.forEach(participant => {
            const participantEl = document.createElement('div');
            participantEl.className = 'participant online';
            participantEl.innerHTML = `
                <div class="avatar">${participant.userName.charAt(0).toUpperCase()}</div>
                <div class="name">${this.escapeHtml(participant.userName)}</div>
                <div class="status"></div>
            `;
            container.appendChild(participantEl);
        });

        if (count) {
            const participantCount = this.participants.size;
            count.textContent = `${participantCount} participant${participantCount !== 1 ? 's' : ''}`;
        }
    }

    // Messaging
    async sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input || !this.currentRoomCode || !this.currentUser) return;
        
        const content = input.value.trim();
        if (!content) return;

        try {
            await appwriteService.sendMessage(
                this.currentRoomCode, 
                this.currentUser.name, 
                'text', 
                content
            );
            
            input.value = '';
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            this.showToast('Failed to send message', 'error');
        }
    }

    // Typing Indicator
    handleTyping() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Show typing indicator for other users
        this.showTypingIndicator();
        
        this.typingTimeout = setTimeout(() => {
            this.hideTypingIndicator();
        }, 3000);
    }

    showTypingIndicator() {
        // In a real implementation, you would send a typing signal to other users
        // For now, we'll just handle the UI
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.classList.add('d-none');
        }
    }

    // Voice Recording
    async startVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.recordedChunks = [];
            this.recordingStartTime = Date.now();

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(blob);
                const recordedAudio = document.getElementById('recordedAudio');
                if (recordedAudio) {
                    recordedAudio.src = audioUrl;
                }
                
                this.showRecordedState();
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            
            // Show recording modal
            const modal = document.getElementById('voiceRecordModal');
            if (modal) {
                const bsModal = new bootstrap.Modal(modal);
                bsModal.show();
            }
            
            this.startRecordingTimer();

        } catch (error) {
            console.error('❌ Microphone access denied:', error);
            this.showToast('Microphone access denied', 'error');
        }
    }

    startRecordingTimer() {
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const durationEl = document.getElementById('recordingDuration');
            if (durationEl) {
                durationEl.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            clearInterval(this.recordingTimer);
            
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }

    showRecordedState() {
        const elements = {
            recordingState: document.getElementById('recordingState'),
            recordedState: document.getElementById('recordedState'),
            stopBtn: document.getElementById('stopRecordingBtn'),
            discardBtn: document.getElementById('discardRecordingBtn'),
            sendBtn: document.getElementById('sendVoiceBtn')
        };
        
        if (elements.recordingState) elements.recordingState.classList.add('d-none');
        if (elements.recordedState) elements.recordedState.classList.remove('d-none');
        if (elements.stopBtn) elements.stopBtn.classList.add('d-none');
        if (elements.discardBtn) elements.discardBtn.classList.remove('d-none');
        if (elements.sendBtn) elements.sendBtn.classList.remove('d-none');
    }

    discardRecording() {
        this.recordedChunks = [];
        const modal = document.getElementById('voiceRecordModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        }
        this.resetRecordingModal();
    }

    async sendVoiceMessage() {
        if (!this.currentRoomCode || !this.currentUser) return;
        
        try {
            // Create file from recorded chunks
            const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
            const fileName = `voice_message_${Date.now()}.webm`;
            const file = new File([blob], fileName, { type: 'audio/webm' });
            
            // Upload to Appwrite
            const fileData = await appwriteService.uploadFile(file);
            const duration = this.formatDuration(Date.now() - this.recordingStartTime);
            
            // Send message with file data
            await appwriteService.sendMessage(
                this.currentRoomCode,
                this.currentUser.name,
                'voice',
                fileData.fileUrl,
                { ...fileData, duration }
            );
            
            const modal = document.getElementById('voiceRecordModal');
            if (modal) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            }
            this.resetRecordingModal();
            
        } catch (error) {
            console.error('❌ Failed to send voice message:', error);
            this.showToast('Failed to send voice message', 'error');
        }
    }

    resetRecordingModal() {
        const elements = {
            recordingState: document.getElementById('recordingState'),
            recordedState: document.getElementById('recordedState'),
            stopBtn: document.getElementById('stopRecordingBtn'),
            discardBtn: document.getElementById('discardRecordingBtn'),
            sendBtn: document.getElementById('sendVoiceBtn'),
            duration: document.getElementById('recordingDuration')
        };
        
        if (elements.recordingState) elements.recordingState.classList.remove('d-none');
        if (elements.recordedState) elements.recordedState.classList.add('d-none');
        if (elements.stopBtn) elements.stopBtn.classList.remove('d-none');
        if (elements.discardBtn) elements.discardBtn.classList.add('d-none');
        if (elements.sendBtn) elements.sendBtn.classList.add('d-none');
        if (elements.duration) elements.duration.textContent = '00:00';
    }

    // File Handling
    triggerFileUpload() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.click();
    }

    setupDragAndDrop() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            messagesContainer.addEventListener(eventName, this.preventDefaults);
        });

        messagesContainer.addEventListener('drop', (e) => this.handleDrop(e));
        messagesContainer.addEventListener('dragover', (e) => {
            messagesContainer.classList.add('dragover');
        });
        messagesContainer.addEventListener('dragleave', (e) => {
            messagesContainer.classList.remove('dragover');
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) messagesContainer.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
        e.target.value = ''; // Reset file input
    }

    async processFiles(files) {
        if (!this.currentRoomCode || !this.currentUser) return;
        
        for (const file of files) {
            try {
                if (file.size > CONFIG.MAX_FILE_SIZE) {
                    this.showToast(`File "${file.name}" is too large (max ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`, 'error');
                    continue;
                }

                this.showToast(`Uploading ${file.name}...`, 'info');
                
                // Upload file to Appwrite
                const fileData = await appwriteService.uploadFile(file);
                
                // Send file message
                await appwriteService.sendMessage(
                    this.currentRoomCode,
                    this.currentUser.name,
                    'file',
                    file.name,
                    fileData
                );
                
                this.showToast(`${file.name} uploaded successfully!`, 'success');
                
            } catch (error) {
                console.error('❌ Failed to upload file:', error);
                this.showToast(`Failed to upload ${file.name}: ${error.message}`, 'error');
            }
        }
    }

    // WebRTC Implementation
    setupWebRTC() {
        // WebRTC configuration is in CONFIG
    }

    async startVideoCall() {
        if (this.participants.size < 2) {
            this.showToast('Need at least 2 participants for a call', 'error');
            return;
        }

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            this.setupPeerConnection();
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            const localVideo = document.getElementById('localVideo');
            const callInterface = document.getElementById('callInterface');
            const callStatus = document.getElementById('callStatus');
            
            if (localVideo) localVideo.srcObject = this.localStream;
            if (callInterface) callInterface.classList.remove('d-none');
            if (callStatus) callStatus.textContent = 'Video Call Active';
            
            this.isInCall = true;
            this.startCallTimer();
            
            // Send call signal to other participants
            await this.sendCallSignal('video-call-start');
            
            this.showToast('Video call started', 'success');
            
        } catch (error) {
            console.error('❌ Failed to start video call:', error);
            this.showToast('Failed to start video call: ' + error.message, 'error');
        }
    }

    async startVoiceCall() {
        if (this.participants.size < 2) {
            this.showToast('Need at least 2 participants for a call', 'error');
            return;
        }

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                video: false, 
                audio: true 
            });
            
            this.setupPeerConnection();
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            const callInterface = document.getElementById('callInterface');
            const localVideo = document.getElementById('localVideo');
            const remoteVideo = document.getElementById('remoteVideo');
            const callStatus = document.getElementById('callStatus');
            
            if (callInterface) callInterface.classList.remove('d-none');
            if (localVideo) localVideo.style.display = 'none';
            if (remoteVideo) remoteVideo.style.display = 'none';
            if (callStatus) callStatus.textContent = 'Voice Call Active';
            
            this.isInCall = true;
            this.startCallTimer();
            
            // Send call signal to other participants
            await this.sendCallSignal('voice-call-start');
            
            this.showToast('Voice call started', 'success');
            
        } catch (error) {
            console.error('❌ Failed to start voice call:', error);
            this.showToast('Failed to start voice call: ' + error.message, 'error');
        }
    }

    async startScreenShare() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
                video: true, 
                audio: true 
            });
            
            if (this.peerConnection) {
                const videoTrack = screenStream.getVideoTracks()[0];
                const sender = this.peerConnection.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                
                if (sender) {
                    await sender.replaceTrack(videoTrack);
                }
            }

            const localVideo = document.getElementById('localVideo');
            if (localVideo) localVideo.srcObject = screenStream;
            
            this.showToast('Screen sharing started', 'success');
            
            screenStream.getVideoTracks()[0].onended = () => {
                this.stopScreenShare();
            };
            
        } catch (error) {
            console.error('❌ Failed to start screen sharing:', error);
            this.showToast('Failed to start screen sharing: ' + error.message, 'error');
        }
    }

    async stopScreenShare() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            const sender = this.peerConnection?.getSenders().find(s => 
                s.track && s.track.kind === 'video'
            );
            
            if (sender && videoTrack) {
                await sender.replaceTrack(videoTrack);
                const localVideo = document.getElementById('localVideo');
                if (localVideo) localVideo.srcObject = this.localStream;
            }
        }
        this.showToast('Screen sharing stopped', 'info');
    }

    setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection(CONFIG.RTC_CONFIG);

        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) remoteVideo.srcObject = this.remoteStream;
        };

        this.peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                await this.sendCallSignal('ice-candidate', event.candidate);
            }
        };

        this.dataChannel = this.peerConnection.createDataChannel('fileTransfer');
        this.setupDataChannel();
    }

    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('📡 Data channel opened');
        };

        this.dataChannel.onmessage = (event) => {
            console.log('📡 Received data:', event.data);
        };
    }

    async sendCallSignal(type, data = null) {
        if (!this.currentRoomCode || !this.currentUser) return;
        
        try {
            await appwriteService.sendWebRTCSignal(
                this.currentRoomCode,
                this.currentUser.name,
                type,
                data
            );
        } catch (error) {
            console.error('❌ Failed to send call signal:', error);
        }
    }

    handleWebRTCSignal(message) {
        try {
            const signal = JSON.parse(message.content);
            if (signal.type === 'webrtc-signal' && signal.fromUserId !== this.currentUser?.id) {
                console.log('📡 Received WebRTC signal:', signal);
                // Handle different signal types here
                // This would include offer, answer, ice-candidate, etc.
            }
        } catch (error) {
            console.error('❌ Error handling WebRTC signal:', error);
        }
    }

    endCall() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.remoteStream) {
            this.remoteStream.getTracks().forEach(track => track.stop());
            this.remoteStream = null;
        }

        const callInterface = document.getElementById('callInterface');
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        
        if (callInterface) callInterface.classList.add('d-none');
        if (localVideo) localVideo.style.display = 'block';
        if (remoteVideo) remoteVideo.style.display = 'block';
        
        this.isInCall = false;
        this.stopCallTimer();
        
        // Send end call signal
        this.sendCallSignal('call-end');
        
        this.showToast('Call ended', 'info');
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const btn = document.getElementById('muteBtn');
                if (btn) {
                    btn.innerHTML = audioTrack.enabled ? 
                        '<i class="bi bi-mic"></i>' : 
                        '<i class="bi bi-mic-mute"></i>';
                }
            }
        }
    }

    toggleCamera() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                const btn = document.getElementById('cameraBtn');
                if (btn) {
                    btn.innerHTML = videoTrack.enabled ? 
                        '<i class="bi bi-camera-video"></i>' : 
                        '<i class="bi bi-camera-video-off"></i>';
                }
            }
        }
    }

    toggleScreenShare() {
        const localVideo = document.getElementById('localVideo');
        if (localVideo && localVideo.srcObject !== this.localStream) {
            this.stopScreenShare();
        } else {
            this.startScreenShare();
        }
    }

    startCallTimer() {
        this.callStartTime = Date.now();
        this.callTimer = setInterval(() => {
            const elapsed = Date.now() - this.callStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const durationEl = document.getElementById('callDuration');
            if (durationEl) {
                durationEl.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
    }

    // Utility Functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    getFileType(fileName) {
        return appwriteService.getFileType(fileName);
    }

    getFileIcon(fileName) {
        const type = this.getFileType(fileName);
        const icons = {
            images: 'image',
            documents: 'file-text',
            audio: 'music-note',
            video: 'camera-video'
        };
        return icons[type] || 'file';
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('notificationToast');
        const toastBody = document.getElementById('toastMessage');
        
        if (!toast || !toastBody) return;
        
        toastBody.textContent = message;
        
        const header = toast.querySelector('.toast-header i');
        if (header) {
            const iconClass = {
                'success': 'bi-check-circle-fill text-success',
                'error': 'bi-exclamation-triangle-fill text-danger',
                'warning': 'bi-exclamation-triangle-fill text-warning',
                'info': 'bi-info-circle-fill text-primary'
            };
            header.className = `${iconClass[type] || iconClass.info} me-2`;
        }
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    clearFormInputs() {
        const inputs = ['roomCodeInput', 'userNameInput', 'creatorNameInput', 'messageInput'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
    }
}

// Initialize the application
let prMessenger;

// Auto-initialize when everything is ready
document.addEventListener('DOMContentLoaded', () => {
    prMessenger = new PRMessenger();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (prMessenger) {
        prMessenger.leaveRoom();
    }
});
