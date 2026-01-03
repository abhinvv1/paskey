# Paskey

**Stop remembering passwords. Start generating them.**

You have dozens of accounts. Each one wants a unique, complex password. Password managers store them, but what happens when you can't access your vault? What if the service gets breached?

Paskey takes a different approach: **your passwords are never stored anywhere**. Instead, they're mathematically generated on-demand using inputs only you know. Same inputs, same password - every time, on any device.

## The Problem with Traditional Password Managers

- Your passwords live in a database (theirs or yours)
- If that database is compromised, all your passwords are exposed
- You're locked out if you lose access to your vault
- Syncing across devices requires trust in third-party servers

## How Paskey Works

You provide three things:
1. **Your Google account** - establishes your identity
2. **A secret phrase** - something memorable that only you know
3. **The domain name** - the site you need a password for

Paskey combines these using cryptographic functions to generate a unique password. The same combination always produces the same result.

**Nothing is stored. Nothing is transmitted. Nothing to steal.**

### Multiple Accounts, Same Site

Need separate passwords for personal and work accounts on the same site? Just add a username - it becomes part of the generation.

### Password Rotation Made Simple

Site requires you to change your password? Increment the version number. Your old password stays recoverable (version 1), and you have a fresh one (version 2).

### Works Everywhere

Generate passwords on your laptop, phone, or a borrowed computer. As long as you remember your secret phrase, you can regenerate any password instantly.

## Security Architecture

| What | Where | Risk |
|------|-------|------|
| Your passwords | Nowhere - generated on demand | None |
| Your secret phrase | Your memory only | None |
| Domain history | Encrypted in cloud | Names only, encrypted |
| Cryptographic salt | Firebase (per user) | Useless without secret phrase |

All cryptographic operations happen in your browser using the Web Crypto API. Your secret phrase never leaves your device.

## Quick Start

### Use the Hosted Version

Visit [paskey.vercel.app](https://paskey.vercel.app) and sign in with Google.

### Run Locally

```bash
git clone https://github.com/YOUR_USERNAME/paskey-web.git
cd paskey-web
npm install
npm run dev
```

Open `http://localhost:3000`

## Self-Hosting

### Prerequisites

- Node.js 18+
- Firebase project with Authentication and Firestore
- Vercel account (or any static host)

### Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/YOUR_USERNAME/paskey-web.git
   cd paskey-web
   npm install
   ```

2. **Configure Firebase**

   Update `src/firebase.js` with your Firebase config:
   ```javascript
   const firebaseConfig = {
       apiKey: "your-api-key",
       authDomain: "your-project.firebaseapp.com",
       projectId: "your-project-id",
       // ...
   };
   ```

3. **Set Firestore Rules**
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

4. **Deploy**
   ```bash
   npm run build
   vercel --prod
   ```

## Project Structure

```
src/
├── crypto.js      # Password generation and encryption
├── firebase.js    # Authentication and data storage
├── main.js        # Application logic
└── styles.css     # UI styles

index.html         # Main application
privacy.html       # Privacy policy
vercel.json        # Deployment configuration
```

## Technical Details

- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Password Generation**: HMAC-SHA256 with rejection sampling (no modulo bias)
- **Domain Encryption**: AES-256-GCM
- **Authentication**: Google OAuth via Firebase

## FAQ

**What if I forget my secret phrase?**

Your passwords cannot be recovered. This is by design - there's nothing stored that could help an attacker either.

**Is the Firebase config in the code a security risk?**

No. Firebase client configs are designed to be public. Security comes from Firestore rules and OAuth configuration, not from hiding the config.

**Can I use this offline?**

Initial sign-in requires internet. After that, password generation works offline (history sync requires connection).

**What data do you have access to?**

Your email, encrypted domain names, and a cryptographic salt. We cannot see your passwords or secret phrase.

## Privacy

See the full [Privacy Policy](https://paskey.vercel.app/privacy.html).

## License

MIT

---

**Remember one phrase. Generate unlimited passwords.**
