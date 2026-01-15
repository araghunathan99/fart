
# 🚗 FART: Family Road Trip Planner

**FART** (Family Road Trip) is an AI-powered mobile web application designed to take the stress out of family travel. 

## 📲 Publishing as a PWA

To make this app installable on mobile devices:

1. **Deploy to HTTPS**: Use Vercel, Netlify, or GitHub Pages. PWAs require a secure connection.
2. **Build the App**: Run `npm run build` to generate the production files.
3. **Verify with Lighthouse**:
   - Open your deployed site in Chrome.
   - Open DevTools (F12) -> **Lighthouse** tab.
   - Select "PWA" and click "Analyze page load".
   - This will confirm if the app meets all installability criteria.
4. **Install**:
   - **iOS**: Tap the "Share" icon in Safari and select "Add to Home Screen".
   - **Android**: Tap the "Add to Home Screen" banner or the three-dot menu -> "Install app".

## ✨ Features
- **AI-Powered Itineraries**: Multi-day plans based on kids' age groups.
- **Dynamic Weather**: Real-time high/low temps and icons for every stop.
- **Professional Dark Mode**: Premium UI with slate and orange accents.
- **Offline Ready**: Service Worker support for spotty highway connections.
- **Smart Packing Lists**: AI-generated based on destination weather.

## 🛠️ Tech Stack
- **React 19**
- **Tailwind CSS**
- **Google Gemini API**
- **Vite** (Build Tool)

---
*Built with ❤️ for traveling families.*
