/**
 * FadeChat Client - Interactive Chat Interface
 * Handles WebSocket communication, message display, and timer updates
 */

let ws = null;
let currentUsername = null;
let messageTimers = new Map();
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Initialize the chat application
 */
async function init() {
    try {
        // Get current user
        const response = await fetch('/api/user', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        
        const data = await response.json();
        currentUsername = data.username;
        document.getElementById('usernameDisplay').textContent = currentUsername;

        // Load existing messages
        await loadMessages();

        // Connect WebSocket
        connectWebSocket();

        // Setup message form
        const messageForm = document.getElementById('messageForm');
        messageForm.addEventListener('submit', sendMessage);

        // Enter key handling
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
            }
        });

        // Setup logout
        document.getElementById('logoutBtn').addEventListener('click', logout);

        // Update empty state
        updateEmptyState();

    } catch (error) {
        console.error('Initialization error:', error);
        window.location.href = '/';
    }
}

/**
 * Load existing messages from server
 */
async function loadMessages() {
    try {
        const response = await fetch('/api/messages', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/';
                return;
            }
            return;
        }

        const messages = await response.json();
        if (messages && messages.length > 0) {
            messages.forEach(msg => {
                displayMessage(msg);
                startMessageTimer(msg);
            });
            scrollToBottom();
        }
        updateEmptyState();
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

/**
 * Connect to WebSocket server
 */
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0;
        updateConnectionStatus(true);
        
        // Authenticate with username
        if (currentUsername) {
            ws.send(JSON.stringify({
                type: 'auth',
                username: currentUsername
            }));
        }
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'auth-success':
                    console.log('WebSocket authenticated');
                    break;

                case 'new-message':
                    displayMessage(message);
                    startMessageTimer(message);
                    scrollToBottom();
                    updateEmptyState();
                    // Play notification sound (optional)
                    playNotification();
                    break;

                case 'message-expired':
                    removeMessage(message.id);
                    break;

                case 'error':
                    console.error('WebSocket error:', message.message);
                    showNotification(message.message, 'error');
                    break;
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus(false);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateConnectionStatus(false);
        
        // Reconnect with exponential backoff
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`Reconnecting in ${delay/1000} seconds...`);
            setTimeout(connectWebSocket, delay);
        } else {
            showNotification('Connection lost. Please refresh the page.', 'error');
        }
    };
}

/**
 * Send a message via WebSocket
 */
function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const text = input.value.trim();

    if (!text || !ws || ws.readyState !== WebSocket.OPEN) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            showNotification('Not connected. Please wait...', 'error');
        }
        return;
    }

    // Disable input while sending
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.textContent = '...';

    try {
        ws.send(JSON.stringify({
            type: 'chat',
            text: text
        }));

        input.value = '';
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<span>Send</span>';
        input.focus();
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Failed to send message', 'error');
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<span>Send</span>';
    }
}

/**
 * Display a message in the chat
 */
function displayMessage(msg) {
    const container = document.getElementById('messagesContainer');
    
    // Check if message already exists
    const existingMsg = document.getElementById(`msg-${msg.id}`);
    if (existingMsg) {
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.username === currentUsername ? 'own' : 'other'}`;
    messageDiv.id = `msg-${msg.id}`;

    // Handle date formatting
    let createdAt;
    if (msg.createdAt instanceof Date) {
        createdAt = msg.createdAt;
    } else if (typeof msg.createdAt === 'string') {
        createdAt = new Date(msg.createdAt);
    } else {
        createdAt = new Date(msg.createdAt);
    }

    const time = createdAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });

    const remaining = msg.remaining !== undefined ? msg.remaining : (msg.lifetime || 600);

    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-username">${escapeHtml(msg.username)}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-text">${escapeHtml(msg.message)}</div>
        <div class="message-timer" id="timer-${msg.id}">
            Expires in: <span id="time-${msg.id}">${remaining}</span>s
        </div>
    `;

    // Add click effect
    messageDiv.addEventListener('click', function() {
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = '';
        }, 200);
    });

    container.appendChild(messageDiv);
    scrollToBottom();
    updateEmptyState();
}

/**
 * Start timer for a message countdown
 */
function startMessageTimer(msg) {
    // Clear existing timer
    if (messageTimers.has(msg.id)) {
        clearInterval(messageTimers.get(msg.id));
    }

    // Parse dates
    let createdAt;
    if (msg.createdAt instanceof Date) {
        createdAt = msg.createdAt;
    } else if (typeof msg.createdAt === 'string') {
        createdAt = new Date(msg.createdAt);
    } else {
        createdAt = new Date(msg.createdAt);
    }

    let expiresAt;
    if (msg.expiresAt instanceof Date) {
        expiresAt = msg.expiresAt;
    } else if (msg.expiresAt) {
        expiresAt = new Date(msg.expiresAt);
    } else {
        expiresAt = new Date(createdAt.getTime() + (msg.lifetime || 600) * 1000);
    }

    let remaining = msg.remaining;
    if (remaining === undefined || remaining === null) {
        const now = new Date();
        remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
    }

    // Update immediately
    updateTimer(msg.id, remaining);

    // Update every second
    const timer = setInterval(() => {
        const now = new Date();
        remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

        if (remaining <= 0) {
            clearInterval(timer);
            messageTimers.delete(msg.id);
            fadeMessage(msg.id);
            updateEmptyState();
        } else {
            updateTimer(msg.id, remaining);
        }
    }, 1000);

    messageTimers.set(msg.id, timer);
}

/**
 * Update timer display
 */
function updateTimer(msgId, remaining) {
    const timerElement = document.getElementById(`time-${msgId}`);
    if (!timerElement) return;

    timerElement.textContent = remaining;

    // Add warning class if less than 30 seconds
    const timerContainer = document.getElementById(`timer-${msgId}`);
    if (timerContainer && remaining < 30) {
        timerElement.classList.add('timer-warning');
    } else if (timerElement) {
        timerElement.classList.remove('timer-warning');
    }
}

/**
 * Fade out and remove a message
 */
function fadeMessage(msgId) {
    const messageDiv = document.getElementById(`msg-${msgId}`);
    if (!messageDiv) return;

    messageDiv.classList.add('fading');

    setTimeout(() => {
        messageDiv.remove();
        if (messageTimers.has(msgId)) {
            clearInterval(messageTimers.get(msgId));
            messageTimers.delete(msgId);
        }
        updateEmptyState();
    }, 500);
}

/**
 * Remove a message immediately
 */
function removeMessage(msgId) {
    const messageDiv = document.getElementById(`msg-${msgId}`);
    if (messageDiv) {
        fadeMessage(msgId);
    }
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        if (connected) {
            statusElement.classList.add('connected');
            statusElement.title = 'Connected';
        } else {
            statusElement.classList.remove('connected');
            statusElement.title = 'Connecting...';
        }
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff6b6b' : '#51cf66'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Play notification sound (optional)
 */
function playNotification() {
    // Simple beep using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Fallback if audio context not available
    }
}

/**
 * Update empty state
 */
function updateEmptyState() {
    const container = document.getElementById('messagesContainer');
    const emptyState = document.getElementById('emptyState');
    const hasMessages = container.children.length > 0 && 
                       !container.children[0].classList.contains('empty-state');
    
    if (emptyState) {
        emptyState.style.display = hasMessages ? 'none' : 'flex';
    }
}

/**
 * Logout user
 */
async function logout() {
    try {
        await fetch('/api/logout', { 
            method: 'POST',
            credentials: 'include'
        });
        
        // Close WebSocket
        if (ws) {
            ws.close();
        }

        // Clear all timers
        messageTimers.forEach(timer => clearInterval(timer));
        messageTimers.clear();

        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/';
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #999;
        gap: 10px;
    }
    .empty-icon {
        font-size: 4em;
        opacity: 0.5;
        animation: float 3s infinite ease-in-out;
    }
`;
document.head.appendChild(style);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);
