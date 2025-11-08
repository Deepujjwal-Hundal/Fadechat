# 🚀 How to Start FadeChat

## Method 1: Using the Executable (Easiest - Windows)

1. **Navigate to the fadechat folder:**
   - Open File Explorer
   - Go to: `D:\Python codes\fadechat`

2. **Double-click `fadechat.exe`**
   - The server will start automatically
   - You'll see a terminal window with server messages

3. **Open your web browser:**
   - Go to: `http://localhost:3000`
   - You should see the FadeChat login page!

4. **To stop the server:**
   - Close the terminal window
   - Or press `Ctrl+C` in the terminal

---

## Method 2: Using Node.js (If you prefer)

1. **Open Command Prompt or PowerShell:**
   - Press `Win + R`, type `cmd` or `powershell`, press Enter

2. **Navigate to the fadechat folder:**
   ```bash
   cd "D:\Python codes\fadechat"
   ```

3. **Start the server:**
   ```bash
   node server.js
   ```

4. **Open your web browser:**
   - Go to: `http://localhost:3000`
   - You should see the FadeChat login page!

5. **To stop the server:**
   - Press `Ctrl+C` in the terminal

---

## Quick Start Guide

### Step 1: Start the Server
- **Option A:** Double-click `fadechat.exe`
- **Option B:** Run `node server.js` in terminal

### Step 2: Open Browser
- Open Chrome, Firefox, Edge, or any browser
- Type in address bar: `http://localhost:3000`
- Press Enter

### Step 3: Register
1. Click the **Register** tab
2. Enter username (e.g., "good")
3. Enter password (e.g., "12345")
4. Click **Register**
5. Enter the 6-digit verification code shown in the modal
6. Click **Verify**

### Step 4: Start Chatting!
- After verification, you'll be redirected to the chat page
- Type messages and watch them disappear!

---

## Troubleshooting

**Problem: "Cannot connect to server"**
- Make sure the server is running (check for terminal window)
- Verify you're using `http://localhost:3000` (not https)

**Problem: Port 3000 already in use**
- Close any other applications using port 3000
- Or change the port in `server.js` (line 621)

**Problem: "node is not recognized"**
- Install Node.js from https://nodejs.org
- Restart your computer after installation
- Then use Method 1 (the .exe file)

---

## What You Should See

✅ **Login Page** - Beautiful purple gradient with login/register forms
✅ **Verification Modal** - Shows 6-digit code after registration
✅ **Chat Interface** - Modern chat UI with:
   - Your username in header
   - Connection status indicator (green = connected)
   - Message area
   - Input box at bottom
   - Messages with countdown timers

Enjoy your private messaging!

