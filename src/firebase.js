/**
 * Firebase configuration and authentication for Paskey Web
 */

import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithPopup,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    onAuthStateChanged
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDxJBawNaQX3BfujVaqf9FMArPmOFt1uw4",
    authDomain: "paskey-14ce9.firebaseapp.com",
    projectId: "paskey-14ce9",
    storageBucket: "paskey-14ce9.firebasestorage.app",
    messagingSenderId: "446522123300",
    appId: "1:446522123300:web:9e6cc9f38324e41f4ce4b1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Force account selection on each sign-in
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

export const Auth = {
    currentUser: null,
    userSalt: null,
    uniqueKey: null,
    encryptionKey: null,

    /**
     * Initialize auth state listener
     */
    init(onStateChange) {
        return onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                };

                // Get or create user data
                await this.loadUserData();
                onStateChange(true, this.currentUser);
            } else {
                this.currentUser = null;
                this.userSalt = null;
                this.uniqueKey = null;
                this.encryptionKey = null;
                onStateChange(false, null);
            }
        });
    },

    /**
     * Sign in with Google
     */
    async signIn() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Sign out
     */
    async signOut() {
        try {
            await firebaseSignOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Load or create user data from Firestore
     */
    async loadUserData() {
        if (!this.currentUser) return;

        try {
            const userRef = doc(db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const data = userDoc.data();
                this.userSalt = data.salt;
            } else {
                // Create new user document
                this.userSalt = this.generateSalt();
                await setDoc(userRef, {
                    email: this.currentUser.email,
                    salt: this.userSalt,
                    domains: [],
                    createdAt: new Date().toISOString()
                });
            }

            // Derive unique key from UID + salt
            const { CryptoUtils } = await import('./crypto.js');
            this.uniqueKey = await CryptoUtils.deriveKey(this.currentUser.uid, this.userSalt);

            // Create encryption key for domain history
            this.encryptionKey = await CryptoUtils.deriveKey(
                this.currentUser.uid + ':domains',
                this.userSalt
            );

        } catch (error) {
            throw error;
        }
    },

    /**
     * Get domain history (decrypted)
     */
    async getDomainHistory() {
        if (!this.currentUser || !this.encryptionKey) return [];

        try {
            const userRef = doc(db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) return [];

            const data = userDoc.data();
            const encryptedDomains = data.domains || [];

            const { CryptoUtils } = await import('./crypto.js');
            const decryptedDomains = [];

            for (const encrypted of encryptedDomains) {
                try {
                    const decrypted = await CryptoUtils.decrypt(encrypted, this.encryptionKey);
                    if (decrypted) {
                        const parsed = JSON.parse(decrypted);
                        decryptedDomains.push(parsed);
                    }
                } catch {
                    // Skip invalid entries
                }
            }

            // Sort by timestamp, newest first
            decryptedDomains.sort((a, b) => b.timestamp - a.timestamp);

            return decryptedDomains;
        } catch {
            return [];
        }
    },

    /**
     * Add domain to history (encrypted)
     * @param {string} domain - The domain name
     * @param {number} version - The version number used for this domain
     */
    async addDomainToHistory(domain, version = 1) {
        if (!this.currentUser || !this.encryptionKey) return;

        try {
            const { CryptoUtils } = await import('./crypto.js');

            // First, remove any existing entry for this domain
            await this.removeDomainFromHistory(domain);

            // Create encrypted entry with version
            const entry = JSON.stringify({
                domain: domain.toLowerCase(),
                version: version,
                timestamp: Date.now()
            });

            const encrypted = await CryptoUtils.encrypt(entry, this.encryptionKey);

            const userRef = doc(db, 'users', this.currentUser.uid);
            await updateDoc(userRef, {
                domains: arrayUnion(encrypted)
            });
        } catch {
            // Silently fail - history is not critical
        }
    },

    /**
     * Remove domain from history
     */
    async removeDomainFromHistory(domain) {
        if (!this.currentUser || !this.encryptionKey) return;

        try {
            const history = await this.getDomainHistory();
            const userRef = doc(db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) return;

            const data = userDoc.data();
            const { CryptoUtils } = await import('./crypto.js');

            // Find and remove matching encrypted entries
            for (const encrypted of data.domains || []) {
                try {
                    const decrypted = await CryptoUtils.decrypt(encrypted, this.encryptionKey);
                    if (decrypted) {
                        const parsed = JSON.parse(decrypted);
                        if (parsed.domain === domain.toLowerCase()) {
                            await updateDoc(userRef, {
                                domains: arrayRemove(encrypted)
                            });
                        }
                    }
                } catch {
                    // Skip invalid entries
                }
            }
        } catch {
            // Silently fail
        }
    },

    /**
     * Clear all domain history
     */
    async clearDomainHistory() {
        if (!this.currentUser) return;

        try {
            const userRef = doc(db, 'users', this.currentUser.uid);
            await updateDoc(userRef, {
                domains: []
            });
        } catch {
            // Silently fail
        }
    },

    /**
     * Generate random salt
     */
    generateSalt() {
        const salt = new Uint8Array(32);
        crypto.getRandomValues(salt);
        return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    getUniqueKey() {
        return this.uniqueKey;
    },

    getUser() {
        return this.currentUser;
    },

    isReady() {
        return !!(this.currentUser && this.uniqueKey);
    }
};
