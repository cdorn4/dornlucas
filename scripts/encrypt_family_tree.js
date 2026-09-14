import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const password = process.argv[2] || 'dorn2026';
const sourceFile = process.argv[3] || path.join(rootDir, '_data', 'family_tree_content.html');
const targetPage = path.join(rootDir, 'family-tree.html');

if (!fs.existsSync(sourceFile)) {
  console.error(`Source content file not found: ${sourceFile}`);
  process.exit(1);
}

const plaintext = fs.readFileSync(sourceFile, 'utf-8');

async function encrypt(pwd, text) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pwd),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    enc.encode(text)
  );

  return {
    salt: Buffer.from(salt).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(encrypted).toString('base64')
  };
}

const payload = await encrypt(password, plaintext);

const pageHtml = `---
layout: default
title: "Family Tree"
permalink: /family-tree.html
description: "Private genealogy and family tree archive."
---

<article class="post shell narrow">
  <header class="post-header">
    <div class="post-meta-bar">
      <span class="post-kicker-badge"><span class="signal-dot"></span> Private Archive</span>
    </div>
    <h1 class="post-title">Family Tree</h1>
    <p class="lede">Genealogy, lineage, and private family records.</p>
  </header>

  <div class="post-content">
    <!-- Password Prompt Gate -->
    <div id="gate-container" class="password-gate-card">
      <div class="gate-icon-badge">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <h2>Protected Content</h2>
      <p class="gate-subtitle">This page is private. Please enter the family password to decrypt and view the family tree.</p>
      
      <form id="password-form" class="gate-form" onsubmit="return handleUnlock(event)">
        <div class="gate-input-group">
          <input type="password" id="gate-password" placeholder="Enter password" autocomplete="current-password" required aria-label="Password">
          <button type="button" id="toggle-pw-btn" class="gate-toggle-pw" onclick="togglePasswordVisibility()" aria-label="Show password">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
        <button type="submit" id="unlock-btn" class="button gate-submit-btn">Unlock Page &rarr;</button>
        <p id="gate-error" class="gate-error-message" style="display: none;" role="alert">Incorrect password. Please try again.</p>
      </form>
    </div>

    <!-- Decrypted Private Content Destination -->
    <div id="private-content" style="display: none;"></div>
    
    <div id="gate-toolbar" style="display: none; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--line); text-align: right;">
      <button type="button" onclick="lockPage()" class="button button-outline" style="font-size: 0.85rem; padding: 6px 14px;">
        &times; Lock Page
      </button>
    </div>
  </div>
</article>

<!-- Encrypted Payload -->
<script id="encrypted-payload" type="application/json">
${JSON.stringify(payload)}
</script>

<style>
.password-gate-card {
  background: var(--surface-card, #ffffff);
  border: 1px solid var(--line, #e3dfd6);
  border-radius: var(--radius-lg, 16px);
  padding: clamp(24px, 5vw, 44px);
  text-align: center;
  box-shadow: var(--shadow-md, 0 8px 30px rgba(0,0,0,0.06));
  max-width: 480px;
  margin: 30px auto;
}

.gate-icon-badge {
  width: 56px;
  height: 56px;
  margin: 0 auto 18px;
  background: rgba(184, 75, 41, 0.1);
  color: var(--accent, #b84b29);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-gate-card h2 {
  font-family: var(--font-serif-display, serif);
  font-size: 1.7rem;
  margin: 0 0 10px;
  color: var(--ink, #1f2421);
}

.gate-subtitle {
  color: var(--muted, #61665d);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 24px;
}

.gate-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.gate-input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.gate-input-group input {
  width: 100%;
  padding: 12px 42px 12px 16px;
  font-family: var(--font-sans, sans-serif);
  font-size: 1rem;
  border: 1px solid var(--line, #d4cfc4);
  border-radius: var(--radius-sm, 8px);
  background: var(--surface, #ffffff);
  color: var(--ink, #1f2421);
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.gate-input-group input:focus {
  outline: none;
  border-color: var(--accent, #b84b29);
  box-shadow: 0 0 0 3px rgba(184, 75, 41, 0.15);
}

.gate-toggle-pw {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--muted, #888);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gate-toggle-pw:hover {
  color: var(--ink, #333);
}

.gate-submit-btn {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-sizing: border-box;
}

.gate-error-message {
  color: #c92a2a;
  font-size: 0.88rem;
  margin: 6px 0 0;
  font-weight: 500;
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
</style>

<script>
(function() {
  const SESSION_KEY = 'family_tree_hub_session_v2';

  window.handleUnlock = async function(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('gate-password');
    const submitBtn = document.getElementById('unlock-btn');
    const errorMsg = document.getElementById('gate-error');
    const password = input.value;

    if (!password) return false;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Decrypting...';
    errorMsg.style.display = 'none';

    try {
      const payloadEl = document.getElementById('encrypted-payload');
      const payload = JSON.parse(payloadEl.textContent);
      const decryptedHtml = await decryptPayload(password, payload);

      if (decryptedHtml) {
        renderDecrypted(decryptedHtml);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ password, decryptedHtml }));
      } else {
        showError();
      }
    } catch (err) {
      console.error(err);
      showError();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Unlock Page →';
    }

    return false;
  };

  window.togglePasswordVisibility = function() {
    const input = document.getElementById('gate-password');
    if (input.type === 'password') {
      input.type = 'text';
    } else {
      input.type = 'password';
    }
  };

  window.lockPage = function() {
    sessionStorage.removeItem(SESSION_KEY);
    document.getElementById('private-content').style.display = 'none';
    document.getElementById('private-content').innerHTML = '';
    document.getElementById('gate-toolbar').style.display = 'none';
    document.getElementById('gate-container').style.display = 'block';
    document.getElementById('gate-password').value = '';
  };

  function showError() {
    const errorMsg = document.getElementById('gate-error');
    errorMsg.style.display = 'block';
    const input = document.getElementById('gate-password');
    input.focus();
    input.select();
  }

  function renderDecrypted(html) {
    document.getElementById('gate-container').style.display = 'none';
    const target = document.getElementById('private-content');
    target.innerHTML = html;
    target.style.display = 'block';
    document.getElementById('gate-toolbar').style.display = 'block';
  }

  async function decryptPayload(password, payload) {
    const enc = new TextEncoder();
    const salt = Uint8Array.from(atob(payload.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  }

  // Check existing session on load
  const cached = sessionStorage.getItem(SESSION_KEY);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      if (data.decryptedHtml) {
        renderDecrypted(data.decryptedHtml);
      }
    } catch (e) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
})();
</script>
`;

fs.writeFileSync(targetPage, pageHtml, 'utf-8');
console.log(`Successfully encrypted ${sourceFile} into ${targetPage} with password '${password}'.`);

