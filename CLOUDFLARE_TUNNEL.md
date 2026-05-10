# Hosting on Your Laptop via Cloudflare Tunnel

Expose your local Yahtzee server publicly without port forwarding.

## Prerequisites
- Cloudflare account (you have this)
- Domain (optional but recommended)

## Setup

### 1. Install Cloudflared CLI

**Option A: Via winget**
```powershell
winget install Cloudflare.cloudflared
```

**Option B: Direct download**
- Go to [developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
- Download Windows installer
- Install and restart terminal

### 2. Authenticate with Cloudflare

```powershell
cloudflared tunnel login
```

This opens your browser to authenticate. Approve access.

### 3. Create a Tunnel

```powershell
cloudflared tunnel create yahtzee
```

Saves tunnel credentials locally.

### 4. Route to Your Domain (Optional)

If you have a domain on Cloudflare:

```powershell
cloudflared tunnel route dns yahtzee yourdomain.com
```

This creates a DNS record pointing to your tunnel.

### 5. Start the Tunnel

Keep your server running on `localhost:3000`, then:

```powershell
cloudflared tunnel run yahtzee --url http://localhost:3000
```

This starts the tunnel and shows your public URL.

## Access Your App

- Use the URL shown in the terminal
- Share with others — they can access from any network
- Your laptop must be running both `node server.js` and the cloudflared tunnel

## Stopping

- Press `Ctrl+C` in the cloudflared terminal to stop the tunnel
- App goes offline immediately

## Notes

- Cloudflare Tunnel is free
- No port forwarding needed
- Secure by default (HTTPS)
- Works from anywhere with internet
