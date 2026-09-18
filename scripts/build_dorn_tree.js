import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const password = process.argv[2] || 'dorn2026';
const targetPage = path.join(rootDir, 'family-tree.html');

const dornFile = path.join(rootDir, '_data', 'dorn_family.json');
const lucasFile = path.join(rootDir, '_data', 'lucas_family.json');

if (!fs.existsSync(dornFile) || !fs.existsSync(lucasFile)) {
  console.error(`Source files missing: ${dornFile} or ${lucasFile}`);
  process.exit(1);
}

const dornData = JSON.parse(fs.readFileSync(dornFile, 'utf-8'));
const lucasData = JSON.parse(fs.readFileSync(lucasFile, 'utf-8'));

function formatYears(b, by, d, dy) {
  const formatYear = (dt, yr) => {
    if (yr) return yr;
    if (!dt) return '';
    const m = String(dt).match(/\b\d{4}\b/);
    return m ? m[0] : dt;
  };
  const bText = formatYear(b, by);
  const dText = formatYear(d, dy);
  return (bText || dText) ? `${bText}${dText ? '–' + dText : ''}` : '';
}

function renderPersonCard(person) {
  if (!person) return '';
  const initial = person.name ? person.name.trim().charAt(0).toUpperCase() : '?';
  const photoHtml = person.photo
    ? `<img src="${person.photo}" alt="${person.name || 'Unknown'}" class="ft-avatar">`
    : `<div class="ft-avatar-placeholder">${initial}</div>`;

  const maidenText = person.maiden ? `<span class="ft-maiden">(${person.maiden})</span>` : '';
  const years = formatYears(person.birthdate || person.birth_date, person.birth_year, person.death_date || person.deathdate, person.death_year);
  const yearsText = years ? `<div class="ft-years">${years}</div>` : '';

  const displayName = person.name
    ? `${person.name} ${maidenText}`
    : `<span style="color:var(--muted);font-style:italic;">Unknown</span> ${maidenText}`;

  const sibBtn = person.sibling_group_id && person.sibling_count
    ? `
      <button type="button" class="ft-sib-pill-btn" onclick="toggleSiblingGroup(event, '${person.sibling_group_id}')" data-target-group="${person.sibling_group_id}" title="Toggle siblings">
        <span class="ft-pill-icon">▸</span> ${person.sibling_count} Sibling${person.sibling_count > 1 ? 's' : ''}
      </button>
    `
    : '';

  return `
    <div class="ft-person">
      ${photoHtml}
      <div class="ft-name">${displayName}</div>
      ${yearsText}
      ${sibBtn}
    </div>
  `;
}

function getConnections(treeData, prefix) {
  const conns = [];
  treeData.generations.forEach(gen => {
    if (gen.couples) {
      gen.couples.forEach(c => {
        const childId = `card-${prefix}-${c.id.replace(/_/g, '-')}`;
        if (c.parent_couple_1) {
          conns.push({ parent: `card-${prefix}-${c.parent_couple_1.replace(/_/g, '-')}`, child: childId });
        }
        if (c.parent_couple_2) {
          conns.push({ parent: `card-${prefix}-${c.parent_couple_2.replace(/_/g, '-')}`, child: childId });
        }
        if (c.parent_couple) {
          conns.push({ parent: `card-${prefix}-${c.parent_couple.replace(/_/g, '-')}`, child: childId });
        }
      });
    }
    if (gen.individuals) {
      gen.individuals.forEach(ind => {
        const childId = `card-${prefix}-${ind.id.replace(/_/g, '-')}`;
        if (ind.parent_couple) {
          conns.push({ parent: `card-${prefix}-${ind.parent_couple.replace(/_/g, '-')}`, child: childId });
        }
      });
    }
  });
  return conns;
}

function renderBranchTree(treeData, prefix) {
  return `
    <div class="ft-diagram-tree ft-branch-view" id="ft-diagram-tree-${prefix}">
      ${treeData.generations.map((gen) => `
        <div class="ft-gen" id="gen-${prefix}-${gen.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">
          <div class="ft-gen-label">${gen.label}</div>
          
          <!-- Cards Row for Couples & Individuals -->
          <div class="ft-cards-row">
            ${gen.couples ? gen.couples.map(c => {
              const childBtn = c.has_children && c.children_group_id && c.children_count
                ? `
                  <div class="ft-card-action-bar">
                    <button type="button" class="ft-child-pill-btn" onclick="toggleSiblingGroup(event, '${c.children_group_id}')" data-target-group="${c.children_group_id}" title="Toggle children">
                      <span class="ft-pill-icon">▸</span> ${c.children_count} Child${c.children_count > 1 ? 'ren' : ''}
                    </button>
                  </div>
                `
                : '';

              return `
                <div class="ft-couple-card${c.id === 'chris_elyse' ? ' main-couple' : ''}${c.is_sibling ? ' ft-sibling-card' : ''}"
                     id="card-${prefix}-${c.id.replace(/_/g, '-')}"
                     ${c.sibling_group ? `data-sibling-group="${c.sibling_group}" style="display: none;"` : ''}>
                  ${c.is_sibling ? '<span class="ft-sibling-tag">Family Branch</span>' : ''}
                  ${renderPersonCard(c.person1)}
                  <div class="ft-heart">&amp;</div>
                  ${renderPersonCard(c.person2)}
                  ${childBtn}
                </div>
              `;
            }).join('') : ''}
            
            ${gen.individuals ? gen.individuals.map(ind => {
              const childBtn = ind.has_children && ind.children_group_id && ind.children_count
                ? `
                  <div class="ft-card-action-bar">
                    <button type="button" class="ft-child-pill-btn" onclick="toggleSiblingGroup(event, '${ind.children_group_id}')" data-target-group="${ind.children_group_id}" title="Toggle children">
                      <span class="ft-pill-icon">▸</span> ${ind.children_count} Child${ind.children_count > 1 ? 'ren' : ''}
                    </button>
                  </div>
                `
                : '';

              return `
                <div class="ft-individual-card${ind.is_sibling ? ' ft-sibling-card' : ''}"
                     id="card-${prefix}-${ind.id.replace(/_/g, '-')}"
                     ${ind.sibling_group ? `data-sibling-group="${ind.sibling_group}" style="display: none;"` : ''}>
                  ${ind.is_sibling ? '<span class="ft-sibling-tag">Family Branch</span>' : ''}
                  ${renderPersonCard(ind)}
                  ${childBtn}
                </div>
              `;
            }).join('') : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderUnifiedTree(dornTree, lucasTree) {
  const dornConns = getConnections(dornTree, 'dorn');
  const lucasConns = getConnections(lucasTree, 'lucas');
  const allConnections = [...dornConns, ...lucasConns];

  return `
    <div class="family-tree-container">
      <div class="ft-header-bar">
        <h2 class="ft-title">Family Tree</h2>
        <p class="ft-subtitle">Interactive family tree with expandable sibling cards, spouses, and children.</p>

        <!-- Segmented Branch Toggle -->
        <div class="ft-branch-toggle-group">
          <button type="button" class="ft-toggle-btn active" id="btn-branch-dorn" onclick="switchBranch('dorn')">
            Dorn Family Line
          </button>
          <button type="button" class="ft-toggle-btn" id="btn-branch-lucas" onclick="switchBranch('lucas')">
            Lucas Family Line
          </button>
        </div>
      </div>

      <div class="ft-viewport-wrapper">
        <!-- Floating Zoom & Toolbar -->
        <div class="ft-toolbar">
          <button type="button" class="ft-btn" id="ft-zoom-in" title="Zoom In">+</button>
          <button type="button" class="ft-btn" id="ft-zoom-out" title="Zoom Out">&minus;</button>
          <button type="button" class="ft-btn" id="ft-zoom-reset" title="Reset View">&#x21bb;</button>
          <button type="button" class="ft-btn" id="ft-zoom-fit" title="Fit to Screen">&#x26F6;</button>
          <div class="ft-toolbar-divider"></div>
          <button type="button" class="ft-btn" id="ft-toggle-all-cards" onclick="toggleAllSiblingCards()" title="Expand / Collapse All Extended Family">
            <span id="ft-all-icon">👥</span>
          </button>
        </div>

        <!-- Pan / Zoom Canvas Viewport -->
        <div class="ft-canvas-viewport" id="ft-canvas-viewport">
          <div class="ft-canvas-content" id="ft-canvas-content">
            <svg class="ft-svg-lines" id="ft-svg-lines"></svg>
            
            ${renderBranchTree(dornTree, 'dorn')}
            ${renderBranchTree(lucasTree, 'lucas')}
          </div>
        </div>
      </div>
    </div>

    <script>
    (function() {
      const viewport = document.getElementById('ft-canvas-viewport');
      const content = document.getElementById('ft-canvas-content');
      if (!viewport || !content) return;

      let scale = 1;
      let panX = 0;
      let panY = 0;
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let currentBranch = 'dorn';
      let allExpanded = false;

      // Initialize initial branch view display
      const dornView = document.getElementById('ft-diagram-tree-dorn');
      const lucasView = document.getElementById('ft-diagram-tree-lucas');
      if (dornView) dornView.style.display = 'flex';
      if (lucasView) lucasView.style.display = 'none';

      window.switchBranch = function(branchKey) {
        currentBranch = branchKey;
        const dView = document.getElementById('ft-diagram-tree-dorn');
        const lView = document.getElementById('ft-diagram-tree-lucas');
        const dBtn = document.getElementById('btn-branch-dorn');
        const lBtn = document.getElementById('btn-branch-lucas');

        if (branchKey === 'lucas') {
          if (dView) dView.style.display = 'none';
          if (lView) lView.style.display = 'flex';
          if (dBtn) dBtn.classList.remove('active');
          if (lBtn) lBtn.classList.add('active');
        } else {
          if (lView) lView.style.display = 'none';
          if (dView) dView.style.display = 'flex';
          if (lBtn) lBtn.classList.remove('active');
          if (dBtn) dBtn.classList.add('active');
        }

        scale = 1;
        panX = 0;
        panY = 0;
        updateTransform();
        setTimeout(drawConnectors, 60);
      };

      // Toggle individual group cards (siblings or children)
      window.toggleSiblingGroup = function(e, groupId) {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
        const activeTree = document.getElementById(\`ft-diagram-tree-\${currentBranch}\`);
        if (!activeTree) return;

        const cards = activeTree.querySelectorAll(\`[data-sibling-group="\${groupId}"]\`);
        if (cards.length === 0) return;

        const isCurrentlyHidden = cards[0].style.display === 'none' || cards[0].style.display === '';
        
        cards.forEach(card => {
          card.style.display = isCurrentlyHidden ? (card.classList.contains('ft-couple-card') ? 'flex' : 'block') : 'none';
        });

        // Update trigger buttons
        const btns = activeTree.querySelectorAll(\`[data-target-group="\${groupId}"]\`);
        btns.forEach(btn => {
          const icon = btn.querySelector('.ft-pill-icon');
          if (icon) icon.textContent = isCurrentlyHidden ? '▾' : '▸';
          btn.classList.toggle('active', isCurrentlyHidden);
        });

        setTimeout(drawConnectors, 80);
      };

      // Global toggle for all extended cards
      window.toggleAllSiblingCards = function() {
        allExpanded = !allExpanded;
        const activeTree = document.getElementById(\`ft-diagram-tree-\${currentBranch}\`);
        if (!activeTree) return;

        const cards = activeTree.querySelectorAll('[data-sibling-group]');
        const btns = activeTree.querySelectorAll('.ft-sib-pill-btn, .ft-child-pill-btn');

        cards.forEach(card => {
          card.style.display = allExpanded ? (card.classList.contains('ft-couple-card') ? 'flex' : 'block') : 'none';
        });

        btns.forEach(btn => {
          const icon = btn.querySelector('.ft-pill-icon');
          if (icon) icon.textContent = allExpanded ? '▾' : '▸';
          btn.classList.toggle('active', allExpanded);
        });

        const toggleAllBtn = document.getElementById('ft-toggle-all-cards');
        if (toggleAllBtn) {
          toggleAllBtn.classList.toggle('active', allExpanded);
        }

        setTimeout(drawConnectors, 100);
      };

      function updateTransform() {
        content.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${scale})\`;
      }

      // Mouse Drag Panning
      viewport.addEventListener('mousedown', (e) => {
        if (e.target.closest('.ft-btn') || e.target.closest('.ft-toggle-btn') || e.target.closest('.ft-sib-pill-btn') || e.target.closest('.ft-child-pill-btn')) return;
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        viewport.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransform();
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          viewport.style.cursor = 'grab';
        }
      });

      // Wheel Zooming centered on cursor
      viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const rect = viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const oldScale = scale;
        if (e.deltaY < 0) {
          scale = Math.min(scale * zoomFactor, 3);
        } else {
          scale = Math.max(scale / zoomFactor, 0.25);
        }

        panX = mouseX - (mouseX - panX) * (scale / oldScale);
        panY = mouseY - (mouseY - panY) * (scale / oldScale);
        updateTransform();
      }, { passive: false });

      // Touch Drag & Pinch Zoom
      let initialPinchDist = 0;
      let initialScale = 1;

      viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          if (e.target.closest('.ft-sib-pill-btn') || e.target.closest('.ft-child-pill-btn') || e.target.closest('.ft-btn') || e.target.closest('.ft-toggle-btn')) return;
          isDragging = true;
          startX = e.touches[0].clientX - panX;
          startY = e.touches[0].clientY - panY;
        } else if (e.touches.length === 2) {
          isDragging = false;
          initialPinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          initialScale = scale;
        }
      });

      viewport.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length === 1) {
          panX = e.touches[0].clientX - startX;
          panY = e.touches[0].clientY - startY;
          updateTransform();
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (initialPinchDist > 0) {
            scale = Math.min(Math.max(initialScale * (dist / initialPinchDist), 0.25), 3);
            updateTransform();
          }
        }
      });

      viewport.addEventListener('touchend', () => {
        isDragging = false;
      });

      // Toolbar Controls
      document.getElementById('ft-zoom-in')?.addEventListener('click', () => {
        scale = Math.min(scale * 1.25, 3);
        updateTransform();
      });

      document.getElementById('ft-zoom-out')?.addEventListener('click', () => {
        scale = Math.max(scale / 1.25, 0.25);
        updateTransform();
      });

      document.getElementById('ft-zoom-reset')?.addEventListener('click', () => {
        scale = 1;
        panX = 0;
        panY = 0;
        updateTransform();
      });

      document.getElementById('ft-zoom-fit')?.addEventListener('click', () => {
        const vpRect = viewport.getBoundingClientRect();
        const activeTree = document.getElementById(\`ft-diagram-tree-\${currentBranch}\`);
        if (!activeTree) return;
        const treeRect = activeTree.getBoundingClientRect();
        const scaleX = (vpRect.width - 40) / (treeRect.width / scale);
        const scaleY = (vpRect.height - 40) / (treeRect.height / scale);
        scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.2);
        panX = (vpRect.width - (treeRect.width / (scale / 1)) * scale) / 2;
        panY = 20;
        updateTransform();
      });

      // SVG Connector Drawing
      function drawConnectors() {
        const svg = document.getElementById('ft-svg-lines');
        if (!svg) return;
        svg.innerHTML = '';

        const vpRect = content.getBoundingClientRect();

        function getCenterBottom(el) {
          const r = el.getBoundingClientRect();
          return {
            x: (r.left + r.width / 2 - vpRect.left) / scale,
            y: (r.bottom - vpRect.top) / scale
          };
        }

        function getCenterTop(el) {
          const r = el.getBoundingClientRect();
          return {
            x: (r.left + r.width / 2 - vpRect.left) / scale,
            y: (r.top - vpRect.top) / scale
          };
        }

        function addPath(p1, p2, isSibling) {
          const midY = (p1.y + p2.y) / 2;
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const d = \`M \${p1.x} \${p1.y} C \${p1.x} \${midY}, \${p2.x} \${midY}, \${p2.x} \${p2.y}\`;
          path.setAttribute('d', d);
          path.setAttribute('stroke', isSibling ? 'var(--muted, #8c857b)' : 'var(--accent, #b84b29)');
          path.setAttribute('stroke-width', isSibling ? '1.5' : '2');
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke-dasharray', isSibling ? '3 3' : '4 2');
          svg.appendChild(path);
        }

        const connections = ${JSON.stringify(allConnections)};
        connections.forEach(conn => {
          const pEl = document.getElementById(conn.parent);
          const cEl = document.getElementById(conn.child);
          if (pEl && cEl && pEl.offsetParent !== null && cEl.offsetParent !== null) {
            const isSibling = cEl.classList.contains('ft-sibling-card');
            addPath(getCenterBottom(pEl), getCenterTop(cEl), isSibling);
          }
        });
      }

      window.drawConnectors = drawConnectors;
      setTimeout(drawConnectors, 100);
      window.addEventListener('resize', drawConnectors);
    })();
    </script>
  `;
}

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

const plaintext = renderUnifiedTree(dornData, lucasData);
const payload = await encrypt(password, plaintext);
const SESSION_KEY = 'unified_family_tree_session_v6';

const pageHtml = `---
layout: default
title: "Family Tree"
permalink: /family-tree.html
description: "Interactive & Zoomable Dorn and Lucas Family Tree with Expandable Sibling and Children Cards."
---

<article class="post shell wide">
  <header class="post-header">
    <div class="post-meta-bar">
      <span class="post-kicker-badge"><span class="signal-dot"></span> Private Lineage</span>
    </div>
    <h1 class="post-title">Family Tree</h1>
  </header>

  <div class="post-content">
    <div id="gate-container" class="password-gate-card">
      <div class="gate-icon-badge">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <h2>Protected Family Tree</h2>
      <p class="gate-subtitle">Enter password to view the interactive family tree.</p>
      
      <form id="password-form" class="gate-form" onsubmit="return handleUnlock(event)">
        <div class="gate-input-group">
          <input type="password" id="gate-password" placeholder="Enter password" autocomplete="current-password" required>
          <button type="button" id="toggle-pw-btn" class="gate-toggle-pw" onclick="togglePasswordVisibility()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
        <button type="submit" id="unlock-btn" class="button gate-submit-btn">Unlock Tree &rarr;</button>
        <p id="gate-error" class="gate-error-message" style="display: none;">Incorrect password.</p>
      </form>
    </div>

    <div id="private-content" style="display: none;"></div>
    
    <div id="gate-toolbar" style="display: none; margin-top: 1.5rem; border-top: 1px solid var(--line); padding-top: 1rem; text-align: right;">
      <button type="button" onclick="lockPage()" class="button button-outline" style="font-size: 0.85rem;">
        &times; Lock Page
      </button>
    </div>
  </div>
</article>

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
  width: 56px; height: 56px; margin: 0 auto 18px;
  background: rgba(184, 75, 41, 0.1); color: var(--accent, #b84b29);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
}
.gate-form { display: flex; flex-direction: column; gap: 14px; }
.gate-input-group { position: relative; display: flex; align-items: center; }
.gate-input-group input {
  width: 100%; padding: 12px 42px 12px 16px;
  font-size: 1rem; border: 1px solid var(--line); border-radius: var(--radius-sm);
}
.gate-toggle-pw { position: absolute; right: 12px; background: none; border: none; cursor: pointer; color: var(--muted); }
.gate-submit-btn { width: 100%; padding: 12px; font-size: 1rem; font-weight: 600; cursor: pointer; }
.gate-error-message { color: #c92a2a; font-size: 0.88rem; margin: 6px 0 0; }

/* Interactive Family Tree Layout */
.family-tree-container { display: flex; flex-direction: column; gap: 15px; }
.ft-header-bar { text-align: center; }
.ft-title { font-family: var(--font-serif-display); font-size: 2.2rem; margin: 0 0 4px; color: var(--ink); }
.ft-subtitle { color: var(--muted); font-size: 0.95rem; margin-bottom: 18px; }

/* Segmented Lineage Toggle */
.ft-branch-toggle-group {
  display: inline-flex;
  background: var(--paper-subtle, #f0ede6);
  border: 1px solid var(--line, #e3dfd6);
  border-radius: 30px;
  padding: 4px;
  margin-bottom: 20px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.04);
}

.ft-toggle-btn {
  border: none;
  background: transparent;
  padding: 8px 22px;
  font-family: var(--font-sans, sans-serif);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--muted, #61665d);
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ft-toggle-btn.active {
  background: var(--surface-card, #ffffff);
  color: var(--accent, #b84b29);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.08));
}

.ft-toggle-btn:hover:not(.active) {
  color: var(--ink, #1f2421);
}

.ft-viewport-wrapper {
  position: relative;
  width: 100%;
  height: 700px;
  background: var(--paper-subtle, #f9f8f6);
  border: 1px solid var(--line, #e3dfd6);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.03);
}

.ft-toolbar {
  position: absolute;
  top: 16px; right: 16px;
  z-index: 20;
  display: flex; flex-direction: column; gap: 6px;
  background: var(--surface-card, #ffffff);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 4px;
  box-shadow: var(--shadow-sm, 0 4px 12px rgba(0,0,0,0.08));
}

.ft-toolbar-divider {
  height: 1px;
  background: var(--line, #e3dfd6);
  margin: 2px 4px;
}

.ft-btn {
  width: 34px; height: 34px;
  border: none; background: transparent;
  color: var(--ink); font-size: 1.1rem; font-weight: bold;
  border-radius: 6px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
}
.ft-btn:hover { background: var(--paper-subtle, #f0ede6); color: var(--accent); }
.ft-btn.active { background: rgba(184, 75, 41, 0.12); color: var(--accent); }

.ft-canvas-viewport {
  width: 100%; height: 100%;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.ft-canvas-content {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  transform-origin: 0 0;
  transition: transform 0.05s ease-out;
}

.ft-svg-lines {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none; z-index: 1;
}

.ft-diagram-tree {
  position: relative;
  z-index: 2;
  display: flex; flex-direction: column; align-items: center;
  gap: 60px; padding: 40px 20px;
}

.ft-gen { display: flex; flex-direction: column; align-items: center; width: 100%; }
.ft-gen-label {
  font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1.5px; color: var(--muted); margin-bottom: 16px;
  background: var(--surface-card); padding: 3px 10px; border-radius: 12px;
  border: 1px solid var(--line);
}

.ft-cards-row {
  display: flex;
  gap: 28px;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: nowrap;
}

.ft-couple-card {
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  background: var(--surface-card); border: 1px solid var(--line);
  border-radius: var(--radius-md, 12px); padding: 18px 20px;
  box-shadow: var(--shadow-sm, 0 4px 14px rgba(0,0,0,0.05));
  transition: transform 0.2s, box-shadow 0.2s;
}
.ft-couple-card > .ft-person, .ft-couple-card > .ft-heart {
  display: flex;
}
.ft-couple-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.ft-couple-card.main-couple { border: 2px solid var(--accent); background: var(--surface); }

/* Horizontal inner layout for couple cards */
.ft-couple-card {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 12px;
}

.ft-individual-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--surface-card); border: 1px solid var(--line);
  border-radius: var(--radius-md, 12px); padding: 18px 22px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s, box-shadow 0.2s;
}
.ft-individual-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

/* Sibling Card Accent */
.ft-sibling-card {
  border: 1px dashed rgba(184, 75, 41, 0.45);
  background: rgba(255, 255, 255, 0.95);
}
.ft-sibling-tag {
  position: absolute;
  top: -9px;
  right: 12px;
  background: var(--paper-subtle, #f0ede6);
  border: 1px solid var(--line, #d4cfc4);
  color: var(--muted, #61665d);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 1px 6px;
  border-radius: 8px;
}

.ft-person { display: flex; flex-direction: column; align-items: center; text-align: center; max-width: 160px; }
.ft-avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent); margin-bottom: 8px; }
.ft-avatar-placeholder {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--paper-subtle); color: var(--accent);
  font-family: var(--font-serif-display); font-size: 1.35rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--line); margin-bottom: 8px;
}
.ft-name { font-weight: 600; font-size: 0.9rem; color: var(--ink); line-height: 1.25; }
.ft-maiden { font-size: 0.8rem; color: var(--muted); font-weight: normal; }
.ft-years { font-size: 0.76rem; color: var(--muted); margin-top: 2px; }
.ft-heart { font-family: var(--font-serif-display); font-style: italic; color: var(--accent); font-size: 1.2rem; font-weight: bold; margin-top: 18px; }

/* Action Buttons on Cards */
.ft-card-action-bar {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.ft-sib-pill-btn, .ft-child-pill-btn {
  margin-top: 8px;
  background: rgba(184, 75, 41, 0.08);
  color: var(--accent, #b84b29);
  border: 1px solid rgba(184, 75, 41, 0.3);
  border-radius: 14px;
  padding: 3px 10px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}
.ft-child-pill-btn {
  background: rgba(74, 114, 94, 0.09);
  color: #3b6b55;
  border-color: rgba(74, 114, 94, 0.35);
}
.ft-sib-pill-btn:hover, .ft-sib-pill-btn.active {
  background: var(--accent, #b84b29);
  color: #ffffff;
  border-color: var(--accent);
  box-shadow: 0 2px 6px rgba(184, 75, 41, 0.25);
}
.ft-child-pill-btn:hover, .ft-child-pill-btn.active {
  background: #3b6b55;
  color: #ffffff;
  border-color: #3b6b55;
  box-shadow: 0 2px 6px rgba(74, 114, 94, 0.25);
}
.ft-pill-icon { font-size: 0.7rem; }
</style>

<script>
(function() {
  const SESSION_KEY = '${SESSION_KEY}';

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
      submitBtn.textContent = 'Unlock Tree →';
    }
    return false;
  };

  window.togglePasswordVisibility = function() {
    const input = document.getElementById('gate-password');
    input.type = input.type === 'password' ? 'text' : 'password';
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
    input.focus(); input.select();
  }

  function renderDecrypted(html) {
    document.getElementById('gate-container').style.display = 'none';
    const target = document.getElementById('private-content');
    target.innerHTML = html;
    target.style.display = 'block';
    document.getElementById('gate-toolbar').style.display = 'block';

    // Execute scripts inside decrypted payload
    const scripts = target.querySelectorAll('script');
    scripts.forEach(s => {
      const newScript = document.createElement('script');
      newScript.textContent = s.textContent;
      document.body.appendChild(newScript);
    });
  }

  async function decryptPayload(password, payload) {
    const enc = new TextEncoder();
    const salt = Uint8Array.from(atob(payload.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));

    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  }

  const cached = sessionStorage.getItem(SESSION_KEY);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      if (data.password) {
        const payloadEl = document.getElementById('encrypted-payload');
        const payload = JSON.parse(payloadEl.textContent);
        decryptPayload(data.password, payload).then(decryptedHtml => {
          if (decryptedHtml) {
            renderDecrypted(decryptedHtml);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ password: data.password, decryptedHtml }));
          }
        }).catch(() => {
          sessionStorage.removeItem(SESSION_KEY);
        });
      } else if (data.decryptedHtml) {
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
console.log(`Successfully built unified interactive family tree with multi-level sibling/children cards into ${targetPage}`);
