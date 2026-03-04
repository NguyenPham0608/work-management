# Flow — Deployment & Firestore Setup Guide

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Enter a project name (e.g., `flow-work-management`)
4. Disable Google Analytics (optional, not needed)
5. Click **Create project**

## 2. Enable Cloud Firestore

1. In the Firebase Console sidebar, click **Build > Firestore Database**
2. Click **Create database**
3. Select **Start in test mode** (allows open read/write access — fine for a private team tool)
4. Choose a Firestore location closest to your team (e.g., `us-central1`)
5. Click **Enable**

### Firestore Security Rules (Private Team Use)

Since this is a private team tool with no authentication, use these rules. They allow anyone with the URL to read/write:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow read, write: true;
    }
  }
}
```

> **Warning:** These rules are fully open. Only use this for a private, internal tool. Do not expose the URL publicly.

To set these rules:
1. Go to **Firestore Database > Rules** tab
2. Replace the default rules with the rules above
3. Click **Publish**

## 3. Get Your Firebase Config

1. In Firebase Console, click the **gear icon** (Project Settings)
2. Scroll down to **Your apps** and click the web icon (`</>`) to add a web app
3. Enter a nickname (e.g., `flow-web`)
4. **Do not** enable Firebase Hosting (unless you want to use it for deployment)
5. Click **Register app**
6. Copy the `firebaseConfig` object. It looks like this:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

7. Open `app.js` and replace the placeholder `firebaseConfig` object at the top with your actual config values

## 4. Deploy

Choose one of these deployment methods:

### Option A: Firebase Hosting (Recommended)

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Log in:
   ```bash
   firebase login
   ```

3. Initialize hosting from the project directory:
   ```bash
   firebase init hosting
   ```
   - Select your Firebase project
   - Set the public directory to `.` (current directory)
   - Configure as a single-page app: **No**
   - Do not overwrite `index.html`

4. Deploy:
   ```bash
   firebase deploy --only hosting
   ```

5. Your app will be live at `https://your-project-id.web.app`

### Option B: Netlify (Drag & Drop)

1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag your project folder (containing `index.html`, `styles.css`, `app.js`) onto the page
3. Your site is live instantly with a generated URL
4. Optionally set a custom domain in Netlify settings

### Option C: GitHub Pages

1. Push your project to a GitHub repository
2. Go to **Settings > Pages**
3. Under **Source**, select `main` branch and `/ (root)` folder
4. Click **Save**
5. Your site will be available at `https://username.github.io/repo-name`

### Option D: Local / LAN Only

For local-only use (no public deployment):

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (npx)
npx serve .
```

Then open `http://localhost:8000` in your browser. Share your local IP with teammates on the same network.

## 5. Verify

1. Open the deployed URL in your browser
2. Add a test task — it should appear in the To Do column
3. Open the same URL in a second browser/tab — the task should appear in real time
4. Drag the task to Done — confetti should fire

## Project Structure

```
work-management/
├── index.html      # Main HTML structure
├── styles.css      # Glass UI styles and animations
├── app.js          # Firestore integration and app logic
└── DEPLOY.md       # This file
```
