# 🚚 Beverage POD Tracker

**A complete system to track, manage, and document proof of delivery (POD) for beverage waste management.**

---

## What This App Does

✅ **Scan PODs** - Capture GTR numbers, SCT numbers, and shipping dates  
✅ **Track Items** - Add beverages with volumes (500ml to 200ml UBC cans)  
✅ **Calculate Automatically** - Total units and litres calculated instantly  
✅ **Generate Documents** - Create collection notes as PDF  
✅ **Manage Signatures** - Space for driver, accountant, and farm signatures  
✅ **Dashboard** - View all PODs with history and status  

---

## Quick Start (3 Steps)

### 1. Install Dependencies
```
npm install
```

### 2. Start the Server
```
npm start
```

You should see:
```
POD Tracking Server running on port 3001
```

### 3. Test It Works
Open your browser and go to:
```
http://localhost:3001/api/pods
```

You should see: `[]` (empty brackets = working!)

Press `Ctrl+C` in terminal to stop the server.

---

## Files in This Project

### Main Application Files
- **server.js** - The backend (what runs on the server)
- **PODTracker.jsx** - The dashboard (what users see)
- **package.json** - List of software packages needed

### Configuration Files
- **.env** - Your settings (secret, don't share)
- **.gitignore** - Tells Git what NOT to upload
- **railway.toml** - Settings for Railway.app hosting
- **render.yaml** - Settings for Render.com hosting

### Documentation
- **README.md** - This file! (overview and quick start)
- **MASTER_CHECKLIST.md** - Deployment checklist
- **DEPLOYMENT_STEPS.md** - Step-by-step copy-paste instructions
- **HANDOFF_SUMMARY.md** - Complete project overview
- **DEPLOYMENT_GUIDE.md** - Cost breakdown and jargon explained

---

## Features Included

### POD Management
- GTR Reference Number
- SCT Number
- Date Shipped & Date Received
- Item tracking (code, description, volume)
- Quantity and pallet counts

### UBC Can Volumes (All Standard Sizes)
- 500ml
- 473ml (US standard)
- 440ml
- 375ml
- 355ml
- 330ml
- 250ml
- 200ml

### Automatic Calculations
- Total units per POD
- Total litres per POD
- Litres per item (quantity × volume ÷ 1000)

### Collection Notes
Generate PDFs that include:
- POD details (GTR, SCT, dates)
- Item list with volumes
- Driver information
- Farm destination
- Signature lines for signing

### Dashboard
- POD history table
- Quick view of all deliveries
- Status tracking
- Easy navigation

---

## API Endpoints (For Developers)

```
POST /api/pod/scan
   Create a new POD
   
GET /api/pods
   List all PODs
   
GET /api/pod/:podId
   Get details of one POD
   
POST /api/collection-note
   Create a collection note
   
GET /api/collection-note/:noteId/pdf
   Download collection note as PDF
   
GET /api/ubc-cans
   Get list of can volumes
```

---

## Installation & Setup

### Required Software
- Node.js (v20.x or higher) - Download from nodejs.org
- Git (v2.x or higher) - Download from git-scm.com
- VS Code (optional) - Download from code.visualstudio.com

### Installation Steps

1. **Download and extract** all files to a folder:
   ```
   C:\Users\YourName\Documents\beverage-pod-tracker
   ```

2. **Open PowerShell** as Administrator in that folder

3. **Install packages:**
   ```
   npm install
   ```
   (This takes 2-3 minutes)

4. **Start the server:**
   ```
   npm start
   ```

5. **Test in browser:**
   ```
   http://localhost:3001/api/pods
   ```

---

## Deployment (Getting It Online)

### For Detailed Instructions
Follow **DEPLOYMENT_STEPS.md** - it has everything copy-paste ready.

### Cloud Hosting (Free Options)
- **Railway.app** - Most popular, easiest setup
- **Render.com** - Also very easy

Both have free tiers that work great for this project.

---

## Folder Structure

After setup, your folder looks like:
```
beverage-pod-tracker/
├── server.js                 (backend)
├── PODTracker.jsx            (frontend dashboard)
├── package.json              (dependencies)
├── README.md                 (this file)
├── .env                      (your settings)
├── .gitignore               (Git rules)
├── railway.toml             (Railway config)
├── render.yaml              (Render config)
├── node_modules/            (downloaded packages)
└── .git/                    (Git files)
```

---

## How It Works

### Backend (server.js)
- Listens on port 3001
- Receives data from the dashboard
- Stores POD information
- Creates PDFs
- Sends back responses

### Frontend (PODTracker.jsx)
- Shows the dashboard
- Users enter POD data
- Forms send data to backend
- Dashboard displays POD history
- Downloads PDFs

### Data Flow
```
User enters POD → Form sends to Backend → Backend stores data
                                         ↓
                          Backend sends back to Frontend
                                         ↓
                          Dashboard shows new POD in list
```

---

## Common Tasks

### Run Locally (For Testing)
```
npm start
```

### Stop the Server
Press `Ctrl+C` in terminal

### Create a Git Commit
```
git add .
git commit -m "Your message here"
```

### Push to GitHub
```
git push
```

### Deploy to Railway.app
1. Push to GitHub
2. Go to railway.app
3. Connect your GitHub repo
4. Railway deploys automatically

### Deploy to Render.com
1. Push to GitHub
2. Go to render.com
3. Create new Web Service
4. Select your repository
5. Render deploys automatically

---

## Troubleshooting

### "npm: command not found"
- Node.js not installed
- Install from nodejs.org

### "Server already running on port 3001"
- Another app using that port
- Wait a minute and try again
- Or change PORT in .env file

### "Can't see dashboard"
- Server not running
- Run `npm start` first
- Make sure you're on http://localhost:3001

### "Can't connect to GitHub"
- Check your GitHub username (LectricBoyZA)
- Check your password
- Create Personal Access Token if using 2FA

### "Deployment failed"
- Check package.json exists
- Check server.js exists
- Check you ran `git push`

---

## Project Details

**GitHub Username:** LectricBoyZA  
**Repository:** beverage-pod-tracker  
**Location:** Cape Town, Western Cape, South Africa  
**Created:** May 2026  
**Technology:** Node.js + React + Express.js  
**License:** MIT  

---

## Next Steps

1. **Get it running locally** - Follow Quick Start above
2. **Test the dashboard** - Create a test POD
3. **Deploy to cloud** - Follow DEPLOYMENT_STEPS.md
4. **Add a database** - Upgrade from memory to MongoDB
5. **Add email sending** - Send PDFs to accountant & farm
6. **Add user accounts** - Multiple roles and permissions

---

## Cost Summary

| Item | Cost | When |
|------|------|------|
| Software (Node, React, Git) | FREE | Always |
| Running locally | FREE | Always |
| Railway.app hosting | FREE | First month, then $5-10/month |
| Render.com hosting | FREE | First month, then $7/month |
| Database (MongoDB) | FREE | Free tier available |
| Email (SendGrid) | FREE | 100 emails/month free |
| **Total Monthly** | **$0-10** | After free tier |

---

## Need Help?

**For deployment instructions:** See DEPLOYMENT_STEPS.md  
**For complete overview:** See HANDOFF_SUMMARY.md  
**For deployment checklist:** See MASTER_CHECKLIST.md  
**For costs and jargon:** See DEPLOYMENT_GUIDE.md  

---

**Ready to deploy? Follow DEPLOYMENT_STEPS.md!** 🚀
