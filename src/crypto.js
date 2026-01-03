/**
 * Cryptographic utilities for Paskey Web
 * All operations happen client-side - nothing leaves the browser
 */

export const CryptoUtils = {
    /**
     * Generate a random salt (32 bytes)
     */
    generateSalt() {
        const salt = new Uint8Array(32);
        crypto.getRandomValues(salt);
        return this.arrayToHex(salt);
    },

    /**
     * Derive a unique key using PBKDF2
     */
    async deriveKey(input, salt) {
        const encoder = new TextEncoder();
        const inputBuffer = encoder.encode(input);
        const saltBuffer = this.hexToArray(salt);

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            inputBuffer,
            'PBKDF2',
            false,
            ['deriveBits']
        );

        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );

        return new Uint8Array(derivedBits);
    },

    /**
     * HMAC-SHA256
     */
    async hmacSHA256(key, message) {
        const encoder = new TextEncoder();
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
        return new Uint8Array(signature);
    },

    /**
     * Generate password from hash using rejection sampling (no modulo bias)
     */
    hashToPassword(hash, length, includeSymbols) {
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const digits = '0123456789';
        const symbols = '!@#$%^&*';

        const charset = lower + upper + digits + (includeSymbols ? symbols : '');
        const charsetLen = charset.length;
        const maxValid = Math.floor(256 / charsetLen) * charsetLen;

        let password = [];
        let hashIndex = 0;
        let extraEntropy = hash;

        while (password.length < length) {
            const byte = extraEntropy[hashIndex % extraEntropy.length];
            hashIndex++;

            if (byte < maxValid) {
                password.push(charset[byte % charsetLen]);
            }

            if (hashIndex >= extraEntropy.length * 2 && password.length < length) {
                const counter = Math.floor(hashIndex / extraEntropy.length);
                const newBytes = new Uint8Array(32);
                for (let i = 0; i < 32; i++) {
                    newBytes[i] = hash[i] ^ (counter & 0xFF);
                }
                extraEntropy = newBytes;
                hashIndex = 0;
            }
        }

        const result = password.slice();

        const ensureChar = (regex, charSet, position) => {
            if (!result.join('').match(regex)) {
                let byte = hash[position % hash.length];
                while (byte >= Math.floor(256 / charSet.length) * charSet.length) {
                    byte = (byte + hash[(position + 1) % hash.length]) % 256;
                }
                result[position] = charSet[byte % charSet.length];
            }
        };

        ensureChar(/[a-z]/, lower, 0);
        ensureChar(/[A-Z]/, upper, 1);
        ensureChar(/[0-9]/, digits, 2);
        if (includeSymbols) {
            ensureChar(/[!@#$%^&*]/, symbols, 3);
        }

        return result.join('');
    },

    /**
     * Generate a password
     */
    async generatePassword(uniqueKey, secretPhrase, domain, username, version, length, includeSymbols) {
        const normalizedDomain = domain.toLowerCase().trim();
        const normalizedUsername = (username || '').toLowerCase().trim();
        const normalizedPhrase = secretPhrase.trim();

        const message = [
            normalizedDomain,
            normalizedUsername,
            version.toString()
        ].join(':');

        const innerKey = await this.hmacSHA256(uniqueKey, normalizedPhrase);
        const finalHash = await this.hmacSHA256(innerKey, message);

        return this.hashToPassword(finalHash, length, includeSymbols);
    },

    /**
     * Encrypt data using AES-GCM
     */
    async encrypt(data, key) {
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const cryptoKey = await crypto.subtle.importKey(
            'raw', key, 'AES-GCM', false, ['encrypt']
        );

        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            encoder.encode(data)
        );

        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(ciphertext), iv.length);

        return this.arrayToBase64(combined);
    },

    /**
     * Decrypt data using AES-GCM
     */
    async decrypt(encryptedData, key) {
        try {
            const combined = this.base64ToArray(encryptedData);
            const iv = combined.slice(0, 12);
            const ciphertext = combined.slice(12);

            const cryptoKey = await crypto.subtle.importKey(
                'raw', key, 'AES-GCM', false, ['decrypt']
            );

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                cryptoKey,
                ciphertext
            );

            return new TextDecoder().decode(decrypted);
        } catch {
            return null;
        }
    },

    arrayToHex(array) {
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    hexToArray(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    },

    arrayToBase64(array) {
        return btoa(String.fromCharCode.apply(null, array));
    },

    base64ToArray(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
};
