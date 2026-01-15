
# 🚗 FART: Family Road Trip Planner

**FART** (Family Road Trip) is an AI-powered mobile web application designed to take the stress out of family travel. 

## 🚀 Automated Deployment (GitHub Actions)

This project is pre-configured to deploy automatically via GitHub Actions.

### Setup Instructions:
1. **Push to GitHub**: Push your code to a repository on your GitHub account.
2. **Enable Actions**: 
   - Go to your repo on GitHub.
   - Click **Settings** > **Actions** > **General**.
   - Ensure "Allow all actions and reusable workflows" is selected.
   - Under "Workflow permissions", select **"Read and write permissions"** (required to push the build to the `gh-pages` branch).
3. **Configure Pages**:
   - Once the first Action completes, a new branch `gh-pages` will be created.
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Branch**, select `gh-pages` and the `/(root)` folder.
   - Click **Save**.

### Build Path:
The production build is generated in the **`dist/`** folder. The GitHub Action automatically grabs this folder and hosts it for you.

## 📲 Publishing as a PWA
To install FART on your device:
1. Open your deployed URL in Safari (iOS) or Chrome (Android).
2. Tap **"Add to Home Screen"**.
3. The app will now appear on your home screen with the custom orange car icon and work offline!

## ✨ Features
- **AI-Powered Itineraries**: Multi-day plans based on kids' age groups.
- **Dynamic Weather**: Real-time high/low temps and icons for every stop.
- **Professional Dark Mode**: Premium UI with slate and orange accents.
- **Offline Ready**: Service Worker support for spotty highway connections.

---
*Built with ❤️ for traveling families.*
