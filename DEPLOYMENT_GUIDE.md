# FadeChat Deployment Guide

## Platform Comparison

| Platform | WebSocket | File Storage | Persistence | Cost | Recommendation |
|----------|-----------|--------------|-------------|------|-----------------|
| **Railway** | ✅ Yes | ✅ Yes | ✅ Persistent | Free-$5+ | ⭐ **BEST** |
| **Render** | ✅ Yes | ✅ Yes | ✅ Persistent | Free-$7+ | ✅ Good Alternative |
| **Heroku** | ✅ Yes | ✅ Yes | ✅ Persistent | Paid (no free tier) | ✅ Works |
| **DigitalOcean** | ✅ Yes | ✅ Yes | ✅ Persistent | $5+/month | ✅ Works |
| **Vercel** | ❌ No | ❌ No | ❌ Not Suitable | Free-$20+ | ❌ **NOT SUITABLE** |

## Quick Deploy to Railway ⭐ RECOMMENDED

### Step 1: Prepare Repository
```bash
# Make sure all files are committed
git add .
git commit -m "Add deployment configurations"
git push
```

### Step 2: Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Authorize Railway and select your repository
5. Railway will auto-detect Node.js and start building

### Step 3: Configure Environment (Optional)
In Railway dashboard:
1. Go to your project
2. Click on the service
3. Go to Variables tab
4. Add any custom environment variables if needed
5. Deploy will start automatically

### Step 4: Access Your App
- Railway will give you a URL like: `https://fadechat-production.up.railway.app`
- Share this URL to access FadeChat from anywhere!

## Deploy to Render

### Step 1: Prepare Repository
```bash
git add .
git commit -m "Add deployment configurations"
git push
```

### Step 2: Create Render Service
1. Go to [render.com](https://render.com)
2. Click "New +"
3. Select "Web Service"
4. Connect your GitHub account
5. Select your repository
6. Choose settings:
   - **Name**: fadechat
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
7. Click "Create Web Service"

### Step 3: Access Your App
- Render will provide a URL automatically
- Takes about 2-3 minutes to deploy

## Docker Deployment

### Build Image
```bash
docker build -t fadechat:latest .
```

### Run Locally
```bash
docker run -p 3000:3000 -v fadechat-data:/app/db fadechat:latest
```

### Deploy to Docker Hub
```bash
# Login
docker login

# Tag image
docker tag fadechat:latest yourusername/fadechat:latest

# Push
docker push yourusername/fadechat:latest
```

## Environment Variables

Key variables to set on your hosting platform:

```
PORT=3000
NODE_ENV=production
SESSION_SECRET=your-very-long-random-secret-key
```

**IMPORTANT**: Generate a strong `SESSION_SECRET`:
```bash
# On Linux/Mac
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use an online generator for a 64-character random string
```

## File Structure Required

```
fadechat/
├── .env (development only, don't commit)
├── .env.example (template for variables)
├── .gitignore
├── package.json
├── server.js
├── Dockerfile
├── railway.json
├── render.yaml
├── vercel.json
├── public/
├── api/
├── utils/
└── db/ (auto-created)
```

## Database Persistence

FadeChat uses file-based NeDB for simplicity:
- Messages and users are stored in `db/` folder
- **Railway/Render**: Persistent volumes handle this automatically
- **Docker**: Use volume mounts to persist data
- **Vercel**: ❌ NOT SUPPORTED (no persistent file storage)

## Troubleshooting

### Messages disappear after restart
- This is normal with file-based DB if not using persistent volumes
- Make sure your hosting platform supports persistent storage

### Can't connect on deployed site
- Check if WebSocket connections are enabled on your platform
- Verify `PORT` environment variable is set correctly

### Build fails
- Ensure `package.json` has all required dependencies
- Check that Node.js version is 16 or higher
- Review deployment logs for specific errors

## Security Recommendations

1. **Change SESSION_SECRET** - Use a strong random key
2. **Use HTTPS** - Most platforms provide this automatically
3. **Keep Node.js updated** - Check `package.json` periodically
4. **Monitor logs** - Watch for suspicious activity
5. **Limit user registration** - Add rate limiting if needed

## FAQ

**Q: Can I use Vercel?**
A: No, Vercel serverless functions don't support WebSockets or persistent file storage.

**Q: Is my data safe?**
A: Data is encrypted before storage and uses bcrypt for passwords. Use HTTPS on the deployment URL.

**Q: Can I run this locally and online?**
A: Yes! You can run locally with `npm start` AND deploy online simultaneously.

**Q: How much storage do I need?**
A: Very minimal - just the message and user databases. Most free tiers provide enough space.

## Support

For issues specific to your hosting platform:
- **Railway**: [Railway Docs](https://docs.railway.app)
- **Render**: [Render Docs](https://render.com/docs)
- **Docker**: [Docker Docs](https://docs.docker.com)
