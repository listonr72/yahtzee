# Deployment to Railway

Deploy Yahtzee to Railway for public access on any network.

## Prerequisites
- GitHub account

## Steps

### 1. Create GitHub Repository

- Go to [github.com/new](https://github.com/new)
- Name: `yahtzee`
- Description: (optional)
- Public or Private (your choice)
- Click "Create repository"

### 2. Upload Files to GitHub

- In your new repo, click "Add file" → "Upload files"
- Drag & drop your `c:\Source\yahtzee` folder contents (or zip first)
- Include:
  - `index.html`
  - `server.js`
  - `package.json`
  - `start.bat` (optional)
- Commit with message "Initial commit"

### 3. Deploy to Railway

- Go to [railway.app](https://railway.app)
- Sign in with GitHub
- Click "New Project" → "Deploy from GitHub repo"
- Select your `yahtzee` repo
- Railway auto-configures Node.js and deploys
- Wait ~2 minutes for deploy to complete
- Copy your public URL (format: `yahtzee-prod-xyz.up.railway.app`)

## Access Your App

- Visit your Railway URL in any browser
- Share with others to play multiplayer from any network
- App automatically saves game state to the server

## Notes

- Railway includes a generous free tier
- App runs on `node server.js` automatically
- Game data persists in `local-game-state.json` on the server
- To redeploy after code changes, just push to GitHub — Railway auto-deploys
