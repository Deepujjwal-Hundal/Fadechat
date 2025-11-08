# FadeChat

A fully independent private web-based messaging system that runs entirely on localhost without external APIs or databases.

## Features

- 🔐 **Secure Authentication**: Register/login with bcrypt password hashing
- 🔒 **Message Encryption**: AES-256 encryption for all messages
- ⏱️ **Disappearing Messages**: Dynamic lifetime based on message frequency
- 💬 **Real-time Chat**: WebSocket-based bi-directional messaging
- 🎨 **Modern UI**: Clean, responsive interface with fade animations
- 📦 **Standalone Executable**: Can run as a standalone .exe file

## Quick Start

### Option 1: Run the Executable (Windows)

1. Double-click `fadechat.exe` in the fadechat folder
2. Open your browser and go to `http://localhost:3000`
3. Register a new account and start chatting!

### Option 2: Run from Source

1. Navigate to the fadechat directory:
   ```bash
   cd fadechat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open `http://localhost:3000` in your browser

## Deployment

⚠️ **Important**: FadeChat uses WebSockets and file-based storage, which are **not supported** on Vercel serverless functions.

**Recommended platforms:**
- **Railway** (recommended) - Supports WebSockets and persistent storage
- **Render** - Full Node.js support with WebSockets
- **Heroku** - Traditional hosting with all features
- **DigitalOcean App Platform** - Modern platform with WebSocket support

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for detailed deployment instructions.

## Usage

1. **Registration**: Create a new account with a username (3-20 characters, alphanumeric + underscore) and password (minimum 4 characters)
2. **Login**: Use your credentials to access the chat
3. **Chat**: Send messages that automatically disappear based on their calculated lifetime
4. **View Status**: Check the connection indicator (green = connected, red = connecting)

## Message Lifetime Formula

- Base lifetime: 600 seconds (10 minutes)
- Actual lifetime = `600 / (1 + messages_sent_last_5min / 10)`
- The more messages you send in a 5-minute window, the shorter each message's lifetime becomes
- Each message shows a countdown timer that updates in real-time

## Project Structure

```
fadechat/
├── fadechat.exe          # Standalone executable (Windows)
├── server.js             # Main server file
├── package.json          # Dependencies and scripts
├── public/               # Frontend files
│   ├── index.html        # Login/Register page
│   ├── chat.html         # Chat interface
│   ├── style.css         # Styles
│   └── chat.js           # Client-side JavaScript
├── db/                   # NeDB database files (auto-created)
│   ├── users.db          # User database
│   └── messages.db       # Messages database
└── utils/                # Utility modules
    ├── encrypt.js        # Encryption functions
    └── cleanup.js        # Message cleanup logic
```

## Building the Executable

If you need to rebuild the `.exe` file:

```bash
npm install
npm run build-exe
```

The executable will be created as `fadechat.exe` in the fadechat directory.

## Technology Stack

- **Backend**: Node.js, Express, WebSocket (ws)
- **Database**: NeDB (file-based)
- **Security**: bcrypt, AES-256 encryption
- **Frontend**: Pure HTML, CSS, JavaScript (no frameworks)
- **Packaging**: pkg (for executable creation)

## Important Notes

- All data is stored locally in the `db/` directory
- Messages are encrypted before storage
- The server runs entirely on localhost (port 3000)
- No external APIs or services required
- The executable includes all dependencies - no Node.js installation needed to run it
- The `db/` directory will be created automatically when the server first runs

## Troubleshooting

### Cannot connect to server
- Ensure the server is running (either via `node server.js` or `fadechat.exe`)
- Check that port 3000 is not already in use
- Try restarting the server

### Registration fails
- Ensure username is 3-20 characters, alphanumeric + underscores only
- Password must be at least 4 characters
- Check browser console (F12) for detailed error messages

### Messages not appearing
- Check WebSocket connection status (green indicator in header)
- Refresh the page if connection is lost
- Messages expire and are automatically removed

## License

ISC
