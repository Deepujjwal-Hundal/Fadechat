/**
 * FadeChat Server
 * Main server file handling Express routes, WebSocket communication,
 * authentication, and message management
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const Datastore = require('nedb');

// Import utilities
const { encryptMessage, decryptMessage, generateKey } = require('./utils/encrypt');
const { startCleanup, calculateLifetime } = require('./utils/cleanup');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'fadechat-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Handle paths for both development and packaged executable
const isPkg = typeof process.pkg !== 'undefined';
const baseDir = isPkg ? path.dirname(process.execPath) : __dirname;

// Serve static files from public directory
app.use(express.static(path.join(baseDir, 'public')));

// Initialize databases (create db directory if it doesn't exist)
const dbDir = path.join(baseDir, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize databases with proper error handling
const usersDb = new Datastore({ 
  filename: path.join(dbDir, 'users.db'), 
  autoload: true,
  onload: (err) => {
    if (err) {
      console.error('Error loading users database:', err);
    } else {
      console.log('Users database loaded successfully');
    }
  }
});

const messagesDb = new Datastore({ 
  filename: path.join(dbDir, 'messages.db'), 
  autoload: true,
  onload: (err) => {
    if (err) {
      console.error('Error loading messages database:', err);
    } else {
      console.log('Messages database loaded successfully');
    }
  }
});

// Ensure database is ready before handling requests
usersDb.loadDatabase((err) => {
  if (err) {
    console.error('Failed to load users database:', err);
  } else {
    console.log('Users database ready');
  }
});

messagesDb.loadDatabase((err) => {
  if (err) {
    console.error('Failed to load messages database:', err);
  } else {
    console.log('Messages database ready');
  }
});

// Store active WebSocket connections by username
const activeConnections = new Map();

// Track message counts for lifetime calculation
const messageCounts = new Map(); // username -> [{timestamp, count}]

// Store pending verifications (username -> {code, expiresAt, userData})
const pendingVerifications = new Map();
const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes

// Cleanup expired verification codes
setInterval(() => {
  const now = Date.now();
  pendingVerifications.forEach((data, username) => {
    if (now > data.expiresAt) {
      pendingVerifications.delete(username);
      console.log('Expired verification code for:', username);
    }
  });
}, 60000); // Check every minute

/**
 * Authentication Middleware
 * Checks if user is logged in via session
 */
function requireAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/');
  }
}

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Registration Route - Step 1: Generate verification code
 */
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  console.log('Registration attempt:', { username, hasPassword: !!password });

  if (!username || !password) {
    console.log('Missing username or password');
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Server-side validation
  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
    return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long' });
  }

  // Ensure database is ready
  if (!usersDb.persistence) {
    return res.status(503).json({ error: 'Database not ready. Please try again in a moment.' });
  }

  // Check if user already exists
  usersDb.findOne({ username: trimmedUsername }, async (err, user) => {
    if (err) {
      console.error('Database error during findOne:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (user) {
      console.log('Username already exists:', trimmedUsername);
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if there's already a pending verification for this username
    if (pendingVerifications.has(trimmedUsername)) {
      const existing = pendingVerifications.get(trimmedUsername);
      if (Date.now() < existing.expiresAt) {
        // Code still valid, send it again
        console.log('Resending verification code for:', trimmedUsername);
        return res.json({ 
          success: true, 
          requiresVerification: true,
          verificationCode: existing.code,
          message: 'Verification code sent. Please check and enter the code.'
        });
      } else {
        // Code expired, generate new one
        pendingVerifications.delete(trimmedUsername);
      }
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = Date.now() + VERIFICATION_CODE_EXPIRY;

    // Hash password (we'll use this when verifying)
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Store pending verification
      pendingVerifications.set(trimmedUsername, {
        code: verificationCode,
        expiresAt: expiresAt,
        username: trimmedUsername,
        password: hashedPassword,
        createdAt: new Date()
      });

      console.log('Verification code generated for:', trimmedUsername, 'Code:', verificationCode);
      console.log('Code expires at:', new Date(expiresAt).toLocaleString());

      // Return verification code (in production, you might want to hide this from response)
      res.json({ 
        success: true, 
        requiresVerification: true,
        verificationCode: verificationCode, // For development - in production, this would be sent via email/SMS
        message: 'Please enter the verification code to complete registration.',
        expiresIn: VERIFICATION_CODE_EXPIRY
      });
    } catch (error) {
      console.error('Password hashing error:', error);
      res.status(500).json({ error: 'Failed to hash password' });
    }
  });
});

/**
 * Verification Route - Step 2: Verify code and create user
 */
app.post('/api/verify', async (req, res) => {
  const { username, code } = req.body;

  console.log('Verification attempt:', { username, code });

  if (!username || !code) {
    return res.status(400).json({ error: 'Username and verification code required' });
  }

  const trimmedUsername = username.trim();
  const trimmedCode = code.trim().replace(/\s/g, ''); // Remove spaces

  // Check if verification exists
  const verification = pendingVerifications.get(trimmedUsername);
  
  if (!verification) {
    return res.status(400).json({ error: 'No pending verification found. Please register again.' });
  }

  // Check if code has expired
  if (Date.now() > verification.expiresAt) {
    pendingVerifications.delete(trimmedUsername);
    return res.status(400).json({ error: 'Verification code has expired. Please register again.' });
  }

  // Verify code
  if (verification.code !== trimmedCode) {
    console.log('Invalid verification code for:', trimmedUsername);
    return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
  }

  // Code is valid, create the user
  const newUser = {
    username: verification.username,
    password: verification.password,
    createdAt: verification.createdAt
  };

  console.log('Creating user after verification:', trimmedUsername);
  console.log('User data:', { username: newUser.username, hasPassword: !!newUser.password, createdAt: newUser.createdAt });

  // Double-check user doesn't already exist before inserting
  usersDb.findOne({ username: trimmedUsername }, (err, existingUser) => {
    if (err) {
      console.error('Error checking for existing user:', err);
      return res.status(500).json({ error: 'Database error during user check' });
    }

    if (existingUser) {
      console.log('User already exists (race condition):', trimmedUsername);
      // Remove from pending verifications
      pendingVerifications.delete(trimmedUsername);
      // Set session and redirect
      req.session.user = trimmedUsername;
      req.session.save((saveErr) => {
        if (saveErr) {
          return res.status(500).json({ error: 'Failed to create session' });
        }
        return res.json({ success: true, username: trimmedUsername, verified: true });
      });
      return;
    }

    // Now insert the user
    usersDb.insert(newUser, (insertErr, insertedUser) => {
      if (insertErr) {
        console.error('Database error during insert:', insertErr);
        console.error('Error type:', typeof insertErr);
        console.error('Error details:', JSON.stringify(insertErr, Object.getOwnPropertyNames(insertErr)));
        if (insertErr.errorType && insertErr.errorType === 'uniqueViolated') {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ 
          error: 'Failed to create user',
          details: insertErr.message || 'Unknown database error'
        });
      }

      if (!insertedUser) {
        console.error('Insert returned null user');
        return res.status(500).json({ error: 'Failed to create user - no user returned' });
      }

      console.log('User created successfully after verification:', trimmedUsername);
      console.log('Inserted user ID:', insertedUser._id);
      console.log('Inserted user data:', insertedUser);
      
      // Verify the user was actually saved by querying it back
      usersDb.findOne({ _id: insertedUser._id }, (verifyErr, verifiedUser) => {
        if (verifyErr) {
          console.error('Error verifying user creation:', verifyErr);
        } else {
          console.log('User verified in database:', verifiedUser ? 'Found' : 'Not found');
        }

        // Remove from pending verifications
        pendingVerifications.delete(trimmedUsername);

        // Set session
        req.session.user = trimmedUsername;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.status(500).json({ error: 'Failed to create session' });
          }
          console.log('Session saved successfully for:', trimmedUsername);
          res.json({ success: true, username: trimmedUsername, verified: true });
        });
      });
    });
  });
});

/**
 * Login Route
 * Authenticates user and creates session
 */
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  usersDb.findOne({ username: username }, async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    try {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        req.session.user = username;
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ error: 'Failed to create session' });
          }
          res.json({ success: true, username: username });
        });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
  });
});

/**
 * Logout Route
 * Destroys session
 */
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

/**
 * Get current user
 */
app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json({ username: req.session.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

/**
 * Get all messages (for initial load)
 */
app.get('/api/messages', requireAuth, (req, res) => {
  messagesDb.find({}, (err, messages) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Decrypt messages and calculate remaining time
    const decryptedMessages = messages.map(msg => {
      try {
        const decrypted = decryptMessage(msg.encryptedContent, msg.encryptionKey);
        // Ensure createdAt is a Date object
        const createdAt = msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt);
        const expiresAt = new Date(createdAt.getTime() + msg.lifetime * 1000);
        const now = new Date();
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

        return {
          id: msg._id,
          username: msg.username,
          message: decrypted,
          createdAt: createdAt,
          lifetime: msg.lifetime,
          expiresAt: expiresAt,
          remaining: remaining
        };
      } catch (error) {
        console.error('Error decrypting message:', error);
        return null; // Skip corrupted messages
      }
    }).filter(msg => msg !== null && msg.remaining > 0); // Only return non-expired messages

    res.json(decryptedMessages);
  });
});

/**
 * WebSocket Connection Handler
 * Manages real-time messaging and message expiration notifications
 */
wss.on('connection', (ws, req) => {
  let username = null;

  // Authenticate WebSocket connection
  // Note: In production, you'd want more secure WebSocket authentication
  const cookies = req.headers.cookie;
  if (!cookies) {
    ws.close(1008, 'Authentication required');
    return;
  }

  // Extract session from cookie (simplified - in production use proper session store)
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      // Handle authentication message
      if (message.type === 'auth') {
        username = message.username;
        if (!activeConnections.has(username)) {
          activeConnections.set(username, new Set());
        }
        activeConnections.get(username).add(ws);
        ws.send(JSON.stringify({ type: 'auth-success', username: username }));
        return;
      }

      // Handle chat message
      if (message.type === 'chat' && username) {
        const { text } = message;

        // Calculate lifetime based on message count
        const lifetime = calculateLifetime(username, messageCounts);

        // Generate encryption key for this message
        const encryptionKey = generateKey();

        // Encrypt message
        const encryptedContent = encryptMessage(text, encryptionKey);

        // Store message in database
        const newMessage = {
          username: username,
          encryptedContent: encryptedContent,
          encryptionKey: encryptionKey,
          createdAt: new Date(),
          lifetime: lifetime
        };

        messagesDb.insert(newMessage, (err, insertedMessage) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message' }));
            return;
          }

          // Ensure createdAt is a Date object
          const createdAt = insertedMessage.createdAt instanceof Date 
            ? insertedMessage.createdAt 
            : new Date(insertedMessage.createdAt);
          const expiresAt = new Date(createdAt.getTime() + lifetime * 1000);
          const remaining = lifetime;

          // Broadcast to all connected clients
          const messageToSend = {
            type: 'new-message',
            id: insertedMessage._id,
            username: username,
            message: text, // Send decrypted for display
            createdAt: createdAt,
            lifetime: lifetime,
            expiresAt: expiresAt,
            remaining: remaining
          };

          // Broadcast to all active connections
          activeConnections.forEach((connections, _) => {
            connections.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(messageToSend));
              }
            });
          });
        });

        return;
      }

    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    if (username && activeConnections.has(username)) {
      activeConnections.get(username).delete(ws);
      if (activeConnections.get(username).size === 0) {
        activeConnections.delete(username);
      }
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

/**
 * Periodic message cleanup
 * Checks for expired messages and notifies clients
 */
setInterval(() => {
  const now = new Date();

  messagesDb.find({}, (err, messages) => {
    if (err) return;

    messages.forEach(msg => {
      // Ensure createdAt is a Date object
      const createdAt = msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt);
      const expiresAt = new Date(createdAt.getTime() + msg.lifetime * 1000);
      const remaining = Math.floor((expiresAt - now) / 1000);

      // If message expired, delete it and notify clients
      if (remaining <= 0) {
        messagesDb.remove({ _id: msg._id }, {}, (err) => {
          if (!err) {
            // Notify all clients that message expired
            const expireMessage = {
              type: 'message-expired',
              id: msg._id
            };

            activeConnections.forEach((connections, _) => {
              connections.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(expireMessage));
                }
              });
            });
          }
        });
      }
    });
  });
}, 1000); // Check every second

/**
 * Route handler for chat page
 */
app.get('/chat', requireAuth, (req, res) => {
  res.sendFile(path.join(baseDir, 'public', 'chat.html'));
});

/**
 * Root route - login page
 */
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/chat');
  } else {
    res.sendFile(path.join(baseDir, 'public', 'index.html'));
  }
});

// Start cleanup for message counts
startCleanup(messageCounts);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`FadeChat server running on http://localhost:${PORT}`);
  console.log('Ready to accept connections!');
});

