/**
 * Paskey Web - Main Application
 */

import { Auth } from './firebase.js';
import { CryptoUtils } from './crypto.js';

// DOM Elements
const views = {
    loading: document.getElementById('loadingView'),
    login: document.getElementById('loginView'),
    app: document.getElementById('appView')
};

const elements = {
    googleSignInBtn: document.getElementById('googleSignInBtn'),
    signOutBtn: document.getElementById('signOutBtn'),
    themeToggle: document.getElementById('themeToggle'),
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    domain: document.getElementById('domain'),
    username: document.getElementById('username'),
    secretPhrase: document.getElementById('secretPhrase'),
    length: document.getElementById('length'),
    version: document.getElementById('version'),
    includeSymbols: document.getElementById('includeSymbols'),
    generateBtn: document.getElementById('generateBtn'),
    resultSection: document.getElementById('resultSection'),
    generatedPassword: document.getElementById('generatedPassword'),
    copyBtn: document.getElementById('copyBtn'),
    historyList: document.getElementById('historyList'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    toast: document.getElementById('toast')
};

// State
let clearPasswordTimer = null;
let clearClipboardTimer = null;

// ==================== View Management ====================

function showView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName]?.classList.remove('hidden');
}

function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.remove('hidden');

    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 3000);
}

// ==================== Theme Management ====================

function initTheme() {
    // Enable transitions after initial load
    setTimeout(() => {
        document.documentElement.classList.add('theme-transition');
    }, 100);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('paskey-theme', newTheme);
}

// ==================== Auth Handlers ====================

async function handleSignIn() {
    elements.googleSignInBtn.disabled = true;
    elements.googleSignInBtn.innerHTML = '<span>Signing in...</span>';

    const result = await Auth.signIn();

    if (!result.success) {
        elements.googleSignInBtn.disabled = false;
        elements.googleSignInBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            <span>Continue with Google</span>
        `;
        showToast('Sign in failed: ' + result.error, 'error');
    }
}

async function handleSignOut() {
    await Auth.signOut();
}

// ==================== Password Generation ====================

async function generatePassword() {
    const uniqueKey = Auth.getUniqueKey();
    if (!uniqueKey) {
        showToast('Please sign in again', 'error');
        return;
    }

    const domain = elements.domain.value.trim().toLowerCase();
    if (!domain) {
        showToast('Please enter a domain', 'error');
        elements.domain.focus();
        return;
    }

    // Validate domain format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(domain)) {
        showToast('Invalid domain format', 'error');
        elements.domain.focus();
        return;
    }

    const secretPhrase = elements.secretPhrase.value;
    if (!secretPhrase) {
        showToast('Please enter a secret phrase', 'error');
        elements.secretPhrase.focus();
        return;
    }

    try {
        elements.generateBtn.disabled = true;
        elements.generateBtn.textContent = 'Generating...';

        const password = await CryptoUtils.generatePassword(
            uniqueKey,
            secretPhrase,
            domain,
            elements.username.value.trim(),
            parseInt(elements.version.value) || 1,
            parseInt(elements.length.value) || 16,
            elements.includeSymbols.checked
        );

        elements.generatedPassword.value = password;
        elements.generatedPassword.type = 'password';
        elements.resultSection.classList.remove('hidden');

        // Add to history with version
        const version = parseInt(elements.version.value) || 1;
        await Auth.addDomainToHistory(domain, version);
        await loadHistory();

        // Auto-clear after 60s
        if (clearPasswordTimer) clearTimeout(clearPasswordTimer);
        clearPasswordTimer = setTimeout(() => {
            elements.generatedPassword.value = '';
            elements.resultSection.classList.add('hidden');
            showToast('Password cleared for security', 'info');
        }, 60000);

        showToast('Password generated!', 'success');

    } catch (error) {
        showToast('Generation failed', 'error');
    } finally {
        elements.generateBtn.disabled = false;
        elements.generateBtn.textContent = 'Generate Password';
    }
}

async function copyPassword() {
    const password = elements.generatedPassword.value;
    if (!password) return;

    try {
        await navigator.clipboard.writeText(password);
        showToast('Copied! Clipboard clears in 30s', 'success');

        if (clearClipboardTimer) clearTimeout(clearClipboardTimer);
        clearClipboardTimer = setTimeout(async () => {
            try {
                const current = await navigator.clipboard.readText().catch(() => null);
                if (current === password) {
                    await navigator.clipboard.writeText('');
                    showToast('Clipboard cleared', 'info');
                }
            } catch {
                // Silently fail
            }
        }, 30000);

    } catch {
        showToast('Copy failed', 'error');
    }
}

// ==================== History ====================

async function loadHistory() {
    const history = await Auth.getDomainHistory();

    if (history.length === 0) {
        elements.historyList.innerHTML = '<p class="empty-state">No domains yet. Generate a password to get started.</p>';
        return;
    }

    elements.historyList.innerHTML = history.map(item => `
        <div class="history-item" data-domain="${escapeHtml(item.domain)}" data-version="${item.version || 1}">
            <div>
                <div class="history-item-domain">${escapeHtml(item.domain)}</div>
                <div class="history-item-meta">
                    <span class="history-item-date">${formatDate(item.timestamp)}</span>
                    ${item.version && item.version > 1 ? `<span class="history-item-version">v${item.version}</span>` : ''}
                </div>
            </div>
            <div class="history-item-actions">
                <button class="delete-history-item" title="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    // Add click handlers
    elements.historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-history-item')) {
                // Auto-fill domain and version
                elements.domain.value = item.dataset.domain;
                elements.version.value = item.dataset.version || 1;
                elements.secretPhrase.focus();
                showToast('Domain & version loaded', 'info');
            }
        });

        item.querySelector('.delete-history-item')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await Auth.removeDomainFromHistory(item.dataset.domain);
            await loadHistory();
            showToast('Domain removed', 'info');
        });
    });
}

async function clearHistory() {
    if (!confirm('Clear all domain history?')) return;

    await Auth.clearDomainHistory();
    await loadHistory();
    showToast('History cleared', 'info');
}

// ==================== Utilities ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
}

function toggleVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
}

// ==================== Initialization ====================

function updateUI(user) {
    if (user) {
        elements.userAvatar.src = user.photoURL || '';
        elements.userName.textContent = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User';
    }
}

// Initialize
Auth.init(async (authenticated, user) => {
    if (authenticated && Auth.isReady()) {
        updateUI(user);
        await loadHistory();
        showView('app');
    } else {
        showView('login');
    }
});

// Initialize theme
initTheme();

// Event Listeners
elements.googleSignInBtn?.addEventListener('click', handleSignIn);
elements.signOutBtn?.addEventListener('click', handleSignOut);
elements.themeToggle?.addEventListener('click', toggleTheme);
elements.generateBtn?.addEventListener('click', generatePassword);
elements.copyBtn?.addEventListener('click', copyPassword);
elements.clearHistoryBtn?.addEventListener('click', clearHistory);

// Secret phrase enter to generate
elements.secretPhrase?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generatePassword();
});

// Domain enter to focus secret phrase
elements.domain?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        elements.secretPhrase.focus();
    }
});

// Toggle visibility buttons
document.querySelectorAll('.toggle-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
        toggleVisibility(btn.dataset.target);
    });
});

// Clear sensitive data on page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        elements.secretPhrase.value = '';
        elements.generatedPassword.value = '';
        elements.resultSection.classList.add('hidden');
    }
});

// Prevent form submission
document.addEventListener('submit', (e) => e.preventDefault());
