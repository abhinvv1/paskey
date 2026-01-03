# Paskey Web

A secure, zero-knowledge password generator that creates consistent passwords using cryptographic hashing. Your passwords are generated locally and never stored anywhere.

## Features

- **Zero-Knowledge Architecture** - Passwords are generated client-side and never leave your device
- **Deterministic Generation** - Same inputs always produce the same password
- **Google Authentication** - Secure sign-in with your Google account
- **Encrypted History** - Domain history is encrypted before storage
- **Dark Mode** - Toggle between light and dark themes
- **Auto-Clear** - Passwords auto-clear after 60 seconds for security

## How It Works

1. Sign in with your Google account
2. Enter a domain name (e.g., `google`, `amazon`)
3. Enter your secret phrase (only you know this)
4. Click Generate - your unique password is created instantly

The same combination of inputs will always generate the same password, so you can regenerate it anytime without storing it.

## Security

| Feature | Description |
|---------|-------------|
| Client-Side Only | All cryptography happens in your browser |
| No Password Storage | Passwords are generated on-demand, never stored |
| Encrypted History | Domain names are encrypted before cloud storage |
| Web Crypto API | Uses browser's native cryptographic implementation |
| Auto-Clear | Passwords and clipboard clear automatically |

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Build Tool**: Vite
- **Authentication**: Firebase Auth (Google OAuth)
- **Database**: Firebase Firestore
- **Hosting**: Vercel

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/paskey-web.git
cd paskey-web

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
web/
├── src/
│   ├── crypto.js      # Cryptographic utilities
│   ├── firebase.js    # Firebase configuration & auth
│   ├── main.js        # Main application logic
│   └── styles.css     # Styles with dark mode support
├── index.html         # Main application
├── privacy.html       # Privacy policy page
├── vite.config.js     # Vite configuration
├── vercel.json        # Vercel deployment config
└── package.json
```

## Deployment

The app is configured for deployment on Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Google Authentication
3. Create a Firestore database
4. Add your domain to authorized domains
5. Update `src/firebase.js` with your config

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Privacy

- Your secret phrase never leaves your device
- Passwords are never transmitted or stored
- Only encrypted domain names are stored in the cloud
- You can delete all your data at any time

See the full [Privacy Policy](https://paskey.vercel.app/privacy.html) for details.

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

Built with security in mind.
