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

const SUFFIXES = new Set(['jr.', 'jr', 'sr.', 'sr', 'ii', 'iii', 'iv', 'v', 'vi']);
const TITLES = new Set(['dr.', 'dr', 'rev.', 'rev', 'mr.', 'mrs.', 'ms.']);

function formatDisplayName(name) {
  if (!name || typeof name !== 'string') return name;
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length <= 2) return trimmed;

  let prefix = '';
  let startIndex = 0;
  if (TITLES.has(tokens[0].toLowerCase())) {
    prefix = tokens[0] + ' ';
    startIndex = 1;
  }

  let suffix = '';
  let endIndex = tokens.length - 1;
  if (SUFFIXES.has(tokens[tokens.length - 1].toLowerCase())) {
    suffix = ' ' + tokens[tokens.length - 1];
    endIndex = tokens.length - 2;
  }

  const coreTokens = tokens.slice(startIndex, endIndex + 1);
  if (coreTokens.length <= 2) {
    return (prefix + coreTokens.join(' ') + suffix).trim();
  }

  const firstName = coreTokens[0];
  const lastName = coreTokens[coreTokens.length - 1];
  const middleTokens = coreTokens.slice(1, coreTokens.length - 1);

  const middleInitials = middleTokens.map(tok => {
    if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith('(')) {
      return tok;
    }
    if (tok.length === 2 && tok.endsWith('.')) {
      return tok;
    }
    const firstChar = tok.charAt(0).toUpperCase();
    return firstChar + '.';
  }).join(' ');

  return (prefix + firstName + ' ' + middleInitials + ' ' + lastName + suffix).trim();
}

function renderPersonCard(person, personKey) {
  if (!person) return '';
  const initial = person.name ? person.name.trim().charAt(0).toUpperCase() : '?';
  const photoHtml = person.photo
    ? `<img src="${person.photo}" alt="${person.name || 'Unknown'}" class="ft-avatar">`
    : `<div class="ft-avatar-placeholder">${initial}</div>`;

  const maidenText = person.maiden ? `<span class="ft-maiden">(${person.maiden})</span>` : '';
  const years = formatYears(person.birthdate || person.birth_date, person.birth_year, person.death_date || person.deathdate, person.death_year);
  const yearsText = years ? `<div class="ft-years">${years}</div>` : '';

  const formattedName = person.name ? formatDisplayName(person.name) : '';
  const displayName = formattedName
    ? `${formattedName} ${maidenText}`
    : `<span style="color:var(--muted);font-style:italic;">Unknown</span> ${maidenText}`;

  const sibBtn = person.sibling_group_id && person.sibling_count
    ? `
      <button type="button" class="ft-sib-pill-btn" onclick="toggleSiblingGroup(event, '${person.sibling_group_id}')" data-target-group="${person.sibling_group_id}" title="Toggle siblings">
        <span class="ft-pill-icon">▸</span> ${person.sibling_count} Sibling${person.sibling_count > 1 ? 's' : ''}
      </button>
    `
    : '';

  const clickAttr = personKey ? `onclick="openPersonDetails(event, '${personKey}')"` : '';

  return `
    <div class="ft-person ft-person-clickable" ${clickAttr} title="Click to view details for ${formattedName || 'this person'}">
      ${photoHtml}
      <div class="ft-name">${displayName}</div>
      ${yearsText}
      ${sibBtn}
    </div>
  `;
}

function getGenCards(gen) {
  if (Array.isArray(gen.items)) {
    return gen.items;
  }
  return [...(gen.couples || []), ...(gen.individuals || [])];
}

function renderCard(item, prefix) {
  if (!item) return '';
  const isCouple = Boolean(item.person1 && item.person2);
  const childBtn = item.has_children && item.children_group_id && item.children_count
    ? `
      <div class="ft-card-action-bar">
        <button type="button" class="ft-child-pill-btn" onclick="toggleSiblingGroup(event, '${item.children_group_id}')" data-target-group="${item.children_group_id}" title="Toggle children">
          <span class="ft-pill-icon">▸</span> ${item.children_count} Child${item.children_count > 1 ? 'ren' : ''}
        </button>
      </div>
    `
    : '';

  if (isCouple) {
    const p1Key = `${prefix}-${item.id}-p1`;
    const p2Key = `${prefix}-${item.id}-p2`;
    const isDivorced = Boolean(item.divorced);
    const statusTag = isDivorced
      ? `<span class="ft-status-tag ft-divorced-tag">Divorced</span>`
      : (item.status ? `<span class="ft-status-tag">${item.status}</span>` : '');
    const heartContent = isDivorced
      ? `<div class="ft-heart ft-heart-divorced" title="Divorced">&ne;<span class="ft-divorced-text">(div.)</span></div>`
      : `<div class="ft-heart">&amp;</div>`;

    return `
      <div class="ft-couple-card${item.id === 'chris_elyse' ? ' main-couple' : ''}${item.is_sibling ? ' ft-sibling-card' : ''}${isDivorced ? ' ft-divorced-card' : ''}"
           id="card-${prefix}-${item.id.replace(/_/g, '-')}"
           ${item.sibling_group ? `data-sibling-group="${item.sibling_group}" style="display: none;"` : ''}>
        ${statusTag}
        ${item.is_sibling ? '<span class="ft-sibling-tag">Branch</span>' : ''}
        ${renderPersonCard(item.person1, p1Key)}
        ${heartContent}
        ${renderPersonCard(item.person2, p2Key)}
        ${childBtn}
      </div>
    `;
  } else {
    const pKey = `${prefix}-${item.id}`;
    const person = item.person1 || item;
    return `
      <div class="ft-individual-card${item.is_sibling ? ' ft-sibling-card' : ''}"
           id="card-${prefix}-${item.id.replace(/_/g, '-')}"
           ${item.sibling_group ? `data-sibling-group="${item.sibling_group}" style="display: none;"` : ''}>
        ${item.is_sibling ? '<span class="ft-sibling-tag">Branch</span>' : ''}
        ${renderPersonCard(person, pKey)}
        ${childBtn}
      </div>
    `;
  }
}

function getConnections(treeData, prefix) {
  const conns = [];
  treeData.generations.forEach(gen => {
    const cards = getGenCards(gen);
    cards.forEach(c => {
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
            ${getGenCards(gen).map(item => renderCard(item, prefix)).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function buildPeopleRegistry(dornTree, lucasTree) {
  const registry = {};

  function processTree(tree, prefix) {
    const cardMap = {};
    tree.generations.forEach(gen => {
      const cards = getGenCards(gen);
      cards.forEach(c => {
        cardMap[c.id] = { card: c, genLabel: gen.label };
      });
    });

    tree.generations.forEach(gen => {
      const cards = getGenCards(gen);
      cards.forEach(c => {
        const domCardId = `card-${prefix}-${c.id.replace(/_/g, '-')}`;
        const isCouple = Boolean(c.person1 && c.person2);

        if (isCouple) {
          const p1 = c.person1;
          const p2 = c.person2;
          const p1Key = `${prefix}-${c.id}-p1`;
          const p2Key = `${prefix}-${c.id}-p2`;

          const p1Parents = [];
          if (c.parent_couple_1 && cardMap[c.parent_couple_1]) {
            const pc = cardMap[c.parent_couple_1].card;
            if (pc.person1) p1Parents.push(formatDisplayName(pc.person1.name));
            if (pc.person2) p1Parents.push(formatDisplayName(pc.person2.name));
          } else if (c.parent_couple && cardMap[c.parent_couple]) {
            const pc = cardMap[c.parent_couple].card;
            if (pc.person1) p1Parents.push(formatDisplayName(pc.person1.name));
            if (pc.person2) p1Parents.push(formatDisplayName(pc.person2.name));
          }

          const p2Parents = [];
          if (c.parent_couple_2 && cardMap[c.parent_couple_2]) {
            const pc = cardMap[c.parent_couple_2].card;
            if (pc.person1) p2Parents.push(formatDisplayName(pc.person1.name));
            if (pc.person2) p2Parents.push(formatDisplayName(pc.person2.name));
          }

          registry[p1Key] = {
            key: p1Key,
            name: p1.name,
            formattedName: formatDisplayName(p1.name),
            maiden: p1.maiden,
            nickname: p1.nickname || p1.nick,
            birthdate: p1.birthdate || p1.birth_date,
            birth_year: p1.birth_year,
            death_date: p1.death_date || p1.deathdate,
            death_year: p1.death_year,
            photo: p1.photo,
            photos: p1.photos || [],
            notes: p1.notes || p1.bio || c.notes,
            branch: prefix,
            cardId: domCardId,
            parentGroup: c.sibling_group,
            generationLabel: gen.label,
            spouseName: formatDisplayName(p2.name),
            spouseKey: p2Key,
            childrenCount: c.children_count || 0,
            childrenGroup: c.children_group_id,
            siblingsCount: p1.sibling_count || 0,
            siblingGroup: p1.sibling_group_id,
            parents: p1Parents
          };

          registry[p2Key] = {
            key: p2Key,
            name: p2.name,
            formattedName: formatDisplayName(p2.name),
            maiden: p2.maiden,
            nickname: p2.nickname || p2.nick,
            birthdate: p2.birthdate || p2.birth_date,
            birth_year: p2.birth_year,
            death_date: p2.death_date || p2.deathdate,
            death_year: p2.death_year,
            photo: p2.photo,
            photos: p2.photos || [],
            notes: p2.notes || p2.bio,
            branch: prefix,
            cardId: domCardId,
            parentGroup: c.sibling_group,
            generationLabel: gen.label,
            spouseName: formatDisplayName(p1.name),
            spouseKey: p1Key,
            childrenCount: c.children_count || 0,
            childrenGroup: c.children_group_id,
            siblingsCount: p2.sibling_count || 0,
            siblingGroup: p2.sibling_group_id,
            parents: p2Parents
          };
        } else {
          const p = c.person1 || c;
          const pKey = `${prefix}-${c.id}`;
          const parents = [];
          if (c.parent_couple && cardMap[c.parent_couple]) {
            const pc = cardMap[c.parent_couple].card;
            if (pc.person1) parents.push(formatDisplayName(pc.person1.name));
            if (pc.person2) parents.push(formatDisplayName(pc.person2.name));
          }

          registry[pKey] = {
            key: pKey,
            name: p.name,
            formattedName: formatDisplayName(p.name),
            maiden: p.maiden,
            nickname: p.nickname || p.nick,
            birthdate: p.birthdate || p.birth_date,
            birth_year: p.birth_year,
            death_date: p.death_date || p.deathdate,
            death_year: p.death_year,
            photo: p.photo,
            photos: p.photos || [],
            notes: p.notes || p.bio || c.notes,
            branch: prefix,
            cardId: domCardId,
            parentGroup: c.sibling_group,
            generationLabel: gen.label,
            childrenCount: c.children_count || p.children_count || 0,
            childrenGroup: c.children_group_id || p.children_group_id,
            siblingsCount: p.sibling_count || 0,
            siblingGroup: p.sibling_group_id,
            parents: parents
          };
        }
      });
    });
  }

  processTree(dornTree, 'dorn');
  processTree(lucasTree, 'lucas');
  return registry;
}

function renderUnifiedTree(dornTree, lucasTree) {
  const dornConns = getConnections(dornTree, 'dorn');
  const lucasConns = getConnections(lucasTree, 'lucas');
  const allConnections = [...dornConns, ...lucasConns];
  const peopleRegistry = buildPeopleRegistry(dornTree, lucasTree);

  return `
    <div class="family-tree-container">
      <div class="ft-header-bar">
        <h2 class="ft-title">Family Tree</h2>
        <p class="ft-subtitle">Interactive family tree. Click on any member to explore their full story &amp; photos.</p>

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

      <!-- Person Details & Photo Gallery Drawer -->
      <div class="ft-detail-drawer" id="ft-detail-drawer" style="display: none;">
        <div class="ft-detail-box">
          <button type="button" class="ft-detail-close" onclick="closePersonDetails()" title="Close details">&times;</button>
          
          <div class="ft-detail-grid">
            <!-- Sidebar: Avatar & Action -->
            <div class="ft-detail-sidebar">
              <div class="ft-detail-avatar-container" id="ft-detail-avatar-wrap"></div>
              <div class="ft-detail-vitals" id="ft-detail-vitals"></div>
              <button type="button" class="ft-detail-locate-btn" onclick="locatePersonInTree()">
                <span class="ft-locate-icon">🎯</span> Locate in Tree
              </button>
            </div>

            <!-- Main Content: Bio, Relationships, Gallery -->
            <div class="ft-detail-main">
              <div class="ft-detail-header">
                <h3 class="ft-detail-name" id="ft-detail-name"></h3>
                <div class="ft-detail-meta" id="ft-detail-meta"></div>
              </div>

              <div class="ft-detail-section" id="ft-detail-bio-section" style="display: none;">
                <h4 class="ft-section-heading">Biographical Notes</h4>
                <div class="ft-detail-bio-text" id="ft-detail-bio"></div>
              </div>

              <div class="ft-detail-section" id="ft-detail-rel-section">
                <h4 class="ft-section-heading">Family Connections</h4>
                <div class="ft-detail-chips" id="ft-detail-relationships"></div>
              </div>

              <div class="ft-detail-section" id="ft-detail-gallery-section" style="display: none;">
                <h4 class="ft-section-heading">Photos &amp; Memories</h4>
                <div class="ft-detail-gallery" id="ft-detail-gallery"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Fullscreen Photo Lightbox -->
      <div class="ft-lightbox" id="ft-lightbox" style="display: none;" onclick="closeLightbox()">
        <div class="ft-lightbox-content" onclick="event.stopPropagation()">
          <button type="button" class="ft-lightbox-close" onclick="closeLightbox()">&times;</button>
          <img id="ft-lightbox-img" src="" alt="Full view">
          <div class="ft-lightbox-caption" id="ft-lightbox-caption"></div>
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
      const peopleRegistry = ${JSON.stringify(peopleRegistry)};
      let activePersonKey = null;

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

      // Recursive helper to close a group and all nested groups
      function closeGroup(activeTree, groupId) {
        const cards = activeTree.querySelectorAll(\`[data-sibling-group="\${groupId}"]\`);
        cards.forEach(card => {
          card.style.display = 'none';

          const nestedBtns = card.querySelectorAll('[data-target-group]');
          nestedBtns.forEach(btn => {
            const nestedGroupId = btn.getAttribute('data-target-group');
            if (nestedGroupId && nestedGroupId !== groupId) {
              closeGroup(activeTree, nestedGroupId);
            }
          });
        });

        const triggerBtns = activeTree.querySelectorAll(\`[data-target-group="\${groupId}"]\`);
        triggerBtns.forEach(btn => {
          const icon = btn.querySelector('.ft-pill-icon');
          if (icon) icon.textContent = '▸';
          btn.classList.remove('active');
        });
      }

      function openGroup(activeTree, groupId) {
        const cards = activeTree.querySelectorAll(\`[data-sibling-group="\${groupId}"]\`);
        cards.forEach(card => {
          card.style.display = card.classList.contains('ft-couple-card') ? 'flex' : 'block';
        });

        const triggerBtns = activeTree.querySelectorAll(\`[data-target-group="\${groupId}"]\`);
        triggerBtns.forEach(btn => {
          const icon = btn.querySelector('.ft-pill-icon');
          if (icon) icon.textContent = '▾';
          btn.classList.add('active');
        });
      }

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

        if (isCurrentlyHidden) {
          openGroup(activeTree, groupId);
        } else {
          closeGroup(activeTree, groupId);
        }

        setTimeout(drawConnectors, 80);
      };

      window.toggleAllSiblingCards = function() {
        allExpanded = !allExpanded;
        const activeTree = document.getElementById(\`ft-diagram-tree-\${currentBranch}\`);
        if (!activeTree) return;

        const allGroups = new Set();
        const allBtns = activeTree.querySelectorAll('[data-target-group]');
        allBtns.forEach(btn => allGroups.add(btn.getAttribute('data-target-group')));

        if (allExpanded) {
          allGroups.forEach(g => openGroup(activeTree, g));
        } else {
          allGroups.forEach(g => closeGroup(activeTree, g));
        }

        const toggleAllBtn = document.getElementById('ft-toggle-all-cards');
        if (toggleAllBtn) {
          toggleAllBtn.classList.toggle('active', allExpanded);
        }

        setTimeout(drawConnectors, 100);
      };

      // Person Details & Photo Gallery Drawer
      window.openPersonDetails = function(e, key) {
        if (e) {
          e.stopPropagation();
        }
        const person = peopleRegistry[key];
        if (!person) return;
        activePersonKey = key;

        const drawer = document.getElementById('ft-detail-drawer');
        const avatarWrap = document.getElementById('ft-detail-avatar-wrap');
        const nameEl = document.getElementById('ft-detail-name');
        const metaEl = document.getElementById('ft-detail-meta');
        const vitalsEl = document.getElementById('ft-detail-vitals');
        const bioSection = document.getElementById('ft-detail-bio-section');
        const bioEl = document.getElementById('ft-detail-bio');
        const relSection = document.getElementById('ft-detail-rel-section');
        const relEl = document.getElementById('ft-detail-relationships');
        const gallerySection = document.getElementById('ft-detail-gallery-section');
        const galleryEl = document.getElementById('ft-detail-gallery');

        const initial = person.formattedName ? person.formattedName.charAt(0).toUpperCase() : '?';
        if (person.photo) {
          avatarWrap.innerHTML = \`<img src="\${person.photo}" alt="\${person.formattedName}" class="ft-detail-avatar" onclick="openLightbox('\${person.photo}', '\${person.formattedName}')">\`;
        } else {
          avatarWrap.innerHTML = \`<div class="ft-detail-avatar-placeholder">\${initial}</div>\`;
        }

        const maidenHtml = person.maiden ? \`<span class="ft-detail-maiden">(\${person.maiden})</span>\` : '';
        const nickHtml = person.nickname ? \`<span class="ft-detail-nick">"\${person.nickname}"</span>\` : '';
        nameEl.innerHTML = \`\${person.formattedName} \${maidenHtml} \${nickHtml}\`;

        const branchTitle = person.branch === 'lucas' ? 'Lucas Line' : 'Dorn Line';
        metaEl.innerHTML = \`<span class="ft-meta-badge">\${branchTitle}</span> <span class="ft-meta-badge">\${person.generationLabel || ''}</span>\`;

        let vitalsHtml = '';
        const bText = person.birthdate || person.birth_year;
        const dText = person.death_date || person.death_year;
        if (bText || dText) {
          vitalsHtml += \`<div class="ft-vital-row"><strong>Born:</strong> \${bText || 'Unknown'}</div>\`;
          if (dText) {
            vitalsHtml += \`<div class="ft-vital-row"><strong>Passed:</strong> \${dText}</div>\`;
          }
          const byNum = parseInt(person.birth_year || (bText && String(bText).match(/\\b\\d{4}\\b/) ? String(bText).match(/\\b\\d{4}\\b/)[0] : 0), 10);
          const dyNum = parseInt(person.death_year || (dText && String(dText).match(/\\b\\d{4}\\b/) ? String(dText).match(/\\b\\d{4}\\b/)[0] : 0), 10);
          if (byNum > 1800) {
            if (dyNum > 1800) {
              const age = dyNum - byNum;
              vitalsHtml += \`<div class="ft-vital-badge">Lived ~\${age} years</div>\`;
            } else if (!dText) {
              const curYear = new Date().getFullYear();
              const age = curYear - byNum;
              if (age < 115) {
                vitalsHtml += \`<div class="ft-vital-badge">\${age} years old</div>\`;
              }
            }
          }
        }
        vitalsEl.innerHTML = vitalsHtml;

        if (person.notes) {
          bioSection.style.display = 'block';
          bioEl.textContent = person.notes;
        } else {
          bioSection.style.display = 'none';
        }

        let relHtml = '';
        if (person.parents && person.parents.length > 0) {
          relHtml += \`<div class="ft-rel-group"><span class="ft-rel-label">Parents:</span> \${person.parents.map(p => \`<span class="ft-chip ft-chip-parent">\${p}</span>\`).join('')}</div>\`;
        }
        if (person.spouseName) {
          relHtml += \`<div class="ft-rel-group"><span class="ft-rel-label">Spouse:</span> <span class="ft-chip ft-chip-spouse">\${person.spouseName}</span></div>\`;
        }
        if (person.childrenCount) {
          relHtml += \`<div class="ft-rel-group"><span class="ft-rel-label">Children:</span> <span class="ft-chip ft-chip-child">\${person.childrenCount} Child\${person.childrenCount > 1 ? 'ren' : ''}</span></div>\`;
        }
        if (person.siblingsCount) {
          relHtml += \`<div class="ft-rel-group"><span class="ft-rel-label">Siblings:</span> <span class="ft-chip ft-chip-sib">\${person.siblingsCount} Sibling\${person.siblingsCount > 1 ? 's' : ''}</span></div>\`;
        }
        relEl.innerHTML = relHtml || '<p class="ft-no-info">Direct family member</p>';

        const photos = person.photos && person.photos.length > 0 ? person.photos : (person.photo ? [{ url: person.photo, caption: 'Portrait' }] : []);
        if (photos && photos.length > 0) {
          gallerySection.style.display = 'block';
          galleryEl.innerHTML = photos.map(ph => {
            const url = typeof ph === 'string' ? ph : ph.url;
            const caption = typeof ph === 'string' ? '' : (ph.caption || '');
            return \`
              <div class="ft-gallery-item" onclick="openLightbox('\${url}', '\${caption || person.formattedName}')">
                <img src="\${url}" alt="\${caption || person.formattedName}" class="ft-gallery-thumb" loading="lazy">
                \${caption ? \`<span class="ft-gallery-cap">\${caption}</span>\` : ''}
              </div>
            \`;
          }).join('');
        } else {
          gallerySection.style.display = 'none';
        }

        drawer.style.display = 'block';
        drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };

      window.closePersonDetails = function() {
        const drawer = document.getElementById('ft-detail-drawer');
        if (drawer) drawer.style.display = 'none';
        activePersonKey = null;
      };

      window.locatePersonInTree = function() {
        if (!activePersonKey) return;
        const person = peopleRegistry[activePersonKey];
        if (!person) return;

        if (person.branch !== currentBranch) {
          switchBranch(person.branch);
        }

        const activeTree = document.getElementById(\`ft-diagram-tree-\${person.branch}\`);
        if (!activeTree) return;

        if (person.parentGroup) {
          openGroup(activeTree, person.parentGroup);
        }

        const cardEl = document.getElementById(person.cardId);
        if (!cardEl) return;

        const vpRect = viewport.getBoundingClientRect();
        const cardRect = cardEl.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();

        const cardCenterX = (cardRect.left + cardRect.width / 2 - contentRect.left) / scale;
        const cardCenterY = (cardRect.top + cardRect.height / 2 - contentRect.top) / scale;

        panX = (vpRect.width / 2) - (cardCenterX * scale);
        panY = (vpRect.height / 2) - (cardCenterY * scale);
        updateTransform();

        cardEl.classList.remove('ft-card-pulse');
        void cardEl.offsetWidth;
        cardEl.classList.add('ft-card-pulse');

        viewport.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };

      window.openLightbox = function(imgSrc, caption) {
        const lb = document.getElementById('ft-lightbox');
        const img = document.getElementById('ft-lightbox-img');
        const cap = document.getElementById('ft-lightbox-caption');
        if (!lb || !img) return;
        img.src = imgSrc;
        cap.textContent = caption || '';
        lb.style.display = 'flex';
      };

      window.closeLightbox = function() {
        const lb = document.getElementById('ft-lightbox');
        if (lb) lb.style.display = 'none';
      };

      function updateTransform() {
        content.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${scale})\`;
      }

      // Mouse Drag Panning
      viewport.addEventListener('mousedown', (e) => {
        if (e.target.closest('.ft-btn') || e.target.closest('.ft-toggle-btn') || e.target.closest('.ft-sib-pill-btn') || e.target.closest('.ft-child-pill-btn') || e.target.closest('.ft-person-clickable')) return;
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
          if (e.target.closest('.ft-sib-pill-btn') || e.target.closest('.ft-child-pill-btn') || e.target.closest('.ft-btn') || e.target.closest('.ft-toggle-btn') || e.target.closest('.ft-person-clickable')) return;
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

        const activeTree = document.getElementById(\`ft-diagram-tree-\${currentBranch}\`);
        if (!activeTree || activeTree.style.display === 'none') return;

        const vpRect = content.getBoundingClientRect();

        const w = Math.max(activeTree.scrollWidth, content.scrollWidth, 3200);
        const h = Math.max(activeTree.scrollHeight, content.scrollHeight, 3200);
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
        svg.style.width = w + 'px';
        svg.style.height = h + 'px';

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
          path.setAttribute('stroke', isSibling ? '#96705b' : 'var(--accent, #b84b29)');
          path.setAttribute('stroke-width', isSibling ? '1.8' : '2.2');
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke-dasharray', isSibling ? '4 3' : 'none');
          path.setAttribute('stroke-linecap', 'round');
          svg.appendChild(path);

          const dot1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot1.setAttribute('cx', p1.x);
          dot1.setAttribute('cy', p1.y);
          dot1.setAttribute('r', '3');
          dot1.setAttribute('fill', isSibling ? '#96705b' : 'var(--accent, #b84b29)');
          svg.appendChild(dot1);

          const dot2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot2.setAttribute('cx', p2.x);
          dot2.setAttribute('cy', p2.y);
          dot2.setAttribute('r', '3');
          dot2.setAttribute('fill', isSibling ? '#96705b' : 'var(--accent, #b84b29)');
          svg.appendChild(dot2);
        }

        const connections = ${JSON.stringify(allConnections)};
        connections.forEach(conn => {
          const pEl = document.getElementById(conn.parent);
          const cEl = document.getElementById(conn.child);
          if (pEl && cEl) {
            const pVis = pEl.offsetParent !== null && window.getComputedStyle(pEl).display !== 'none';
            const cVis = cEl.offsetParent !== null && window.getComputedStyle(cEl).display !== 'none';
            if (pVis && cVis) {
              const isSibling = cEl.classList.contains('ft-sibling-card') || pEl.classList.contains('ft-sibling-card');
              addPath(getCenterBottom(pEl), getCenterTop(cEl), isSibling);
            }
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
const SESSION_KEY = 'unified_family_tree_session_v8';

const pageHtml = `---
layout: default
title: "Family Tree"
permalink: /family-tree.html
description: "Interactive & Zoomable Dorn and Lucas Family Tree with Person Details & Photo Gallery."
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
  height: 720px;
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
  gap: 65px; padding: 40px 20px;
}

.ft-gen { display: flex; flex-direction: column; align-items: center; width: 100%; }
.ft-gen-label {
  font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1.5px; color: var(--muted); margin-bottom: 18px;
  background: var(--surface-card); padding: 3px 10px; border-radius: 12px;
  border: 1px solid var(--line);
}

.ft-cards-row {
  display: flex;
  gap: 26px;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: nowrap;
}

.ft-couple-card {
  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 12px;
  background: var(--surface-card); border: 1px solid var(--line);
  border-radius: var(--radius-md, 12px); padding: 18px 20px;
  box-shadow: var(--shadow-sm, 0 4px 14px rgba(0,0,0,0.05));
  transition: transform 0.2s, box-shadow 0.2s;
}
.ft-couple-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.ft-couple-card.main-couple { border: 2px solid var(--accent); background: var(--surface); }

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

.ft-status-tag {
  position: absolute;
  top: -9px;
  left: 12px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 1px 6px;
  border-radius: 8px;
}
.ft-divorced-tag {
  background: #fdf2f2;
  border: 1px solid #f8b4b4;
  color: #c81e1e;
}
.ft-divorced-card {
  border: 1px dashed rgba(200, 30, 30, 0.35);
}
.ft-heart-divorced {
  color: #9b1c1c;
  font-size: 1.1rem;
}
.ft-divorced-text {
  display: block;
  font-size: 0.65rem;
  font-weight: 600;
  color: #c81e1e;
  font-family: var(--font-sans, sans-serif);
  font-style: normal;
  line-height: 1;
  margin-top: -2px;
}

.ft-person {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 155px;
  border-radius: 8px;
  padding: 4px;
  transition: all 0.18s ease;
}

.ft-person-clickable {
  cursor: pointer;
}

.ft-person-clickable:hover {
  background: rgba(184, 75, 41, 0.05);
}

.ft-person-clickable:hover .ft-name {
  color: var(--accent, #b84b29);
}

.ft-person-clickable:hover .ft-avatar,
.ft-person-clickable:hover .ft-avatar-placeholder {
  transform: scale(1.08);
  box-shadow: 0 4px 14px rgba(184, 75, 41, 0.25);
}

.ft-avatar {
  width: 56px; height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--accent);
  margin-bottom: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.ft-avatar-placeholder {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--paper-subtle);
  color: var(--accent);
  font-family: var(--font-serif-display);
  font-size: 1.35rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--line);
  margin-bottom: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.ft-name { font-weight: 600; font-size: 0.9rem; color: var(--ink); line-height: 1.25; transition: color 0.15s; }
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

/* Person Details Drawer Component */
.ft-detail-drawer {
  position: relative;
  background: var(--surface-card, #ffffff);
  border: 1px solid var(--line, #e3dfd6);
  border-radius: var(--radius-lg, 16px);
  padding: clamp(20px, 3.5vw, 32px);
  box-shadow: var(--shadow-md, 0 8px 30px rgba(0,0,0,0.07));
  margin-top: 20px;
  animation: ftSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes ftSlideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.ft-detail-close {
  position: absolute;
  top: 16px;
  right: 18px;
  background: none;
  border: none;
  font-size: 1.6rem;
  line-height: 1;
  color: var(--muted, #61665d);
  cursor: pointer;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.ft-detail-close:hover {
  background: var(--paper-subtle, #f0ede6);
  color: var(--ink, #1f2421);
}

.ft-detail-grid {
  display: grid;
  grid-template-columns: minmax(130px, 180px) 1fr;
  gap: 28px;
}

@media (max-width: 680px) {
  .ft-detail-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}

.ft-detail-sidebar {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}

.ft-detail-avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--accent, #b84b29);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.2s;
}
.ft-detail-avatar:hover {
  transform: scale(1.04);
}

.ft-detail-avatar-placeholder {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: var(--paper-subtle, #f0ede6);
  color: var(--accent, #b84b29);
  font-family: var(--font-serif-display);
  font-size: 2.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--line, #e3dfd6);
}

.ft-detail-vitals {
  font-size: 0.85rem;
  color: var(--muted, #61665d);
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.ft-vital-row {
  line-height: 1.35;
}

.ft-vital-badge {
  display: inline-block;
  background: rgba(184, 75, 41, 0.08);
  color: var(--accent, #b84b29);
  font-weight: 600;
  font-size: 0.78rem;
  padding: 3px 8px;
  border-radius: 12px;
  margin-top: 4px;
}

.ft-detail-locate-btn {
  margin-top: 6px;
  width: 100%;
  padding: 7px 12px;
  background: var(--paper-subtle, #f0ede6);
  border: 1px solid var(--line, #e3dfd6);
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink, #1f2421);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
}
.ft-detail-locate-btn:hover {
  background: var(--accent, #b84b29);
  color: #ffffff;
  border-color: var(--accent);
}

.ft-detail-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ft-detail-name {
  font-family: var(--font-serif-display);
  font-size: 1.65rem;
  color: var(--ink);
  margin: 0 0 4px;
}

.ft-detail-maiden {
  font-size: 1.15rem;
  color: var(--muted);
  font-weight: normal;
}

.ft-detail-nick {
  font-size: 1.15rem;
  color: var(--accent);
  font-style: italic;
}

.ft-detail-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ft-meta-badge {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--paper-subtle, #f0ede6);
  border: 1px solid var(--line, #e3dfd6);
  color: var(--muted, #61665d);
  padding: 2px 8px;
  border-radius: 10px;
}

.ft-section-heading {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  margin: 0 0 6px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 3px;
}

.ft-detail-bio-text {
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--ink);
  margin: 0;
}

.ft-detail-chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.88rem;
}

.ft-rel-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.ft-rel-label {
  font-weight: 600;
  color: var(--muted);
  font-size: 0.82rem;
}

.ft-chip {
  display: inline-flex;
  align-items: center;
  background: var(--paper-subtle, #f0ede6);
  border: 1px solid var(--line, #e3dfd6);
  border-radius: 12px;
  padding: 2px 9px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink);
}
.ft-chip-parent {
  background: rgba(184, 75, 41, 0.08);
  color: var(--accent);
  border-color: rgba(184, 75, 41, 0.25);
}
.ft-chip-spouse {
  background: rgba(184, 75, 41, 0.08);
  color: var(--accent);
}
.ft-chip-child {
  background: rgba(74, 114, 94, 0.09);
  color: #3b6b55;
  border-color: rgba(74, 114, 94, 0.25);
}

.ft-detail-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  margin-top: 6px;
}

.ft-gallery-item {
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #f0ede6;
  aspect-ratio: 4/3;
  transition: transform 0.2s, box-shadow 0.2s;
}
.ft-gallery-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.ft-gallery-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ft-gallery-cap {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0,0,0,0.65);
  color: #fff;
  font-size: 0.65rem;
  padding: 2px 4px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Lightbox Modal */
.ft-lightbox {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.88);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  animation: ftFadeIn 0.2s ease;
}

@keyframes ftFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.ft-lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ft-lightbox-content img {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  object-fit: contain;
}

.ft-lightbox-close {
  position: absolute;
  top: -36px;
  right: 0;
  background: none;
  border: none;
  color: #ffffff;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  padding: 4px;
}

.ft-lightbox-caption {
  color: #ffffff;
  margin-top: 12px;
  font-size: 0.95rem;
  text-align: center;
}

/* Locate in Tree Highlight Pulse */
@keyframes ftPulseGlow {
  0% { box-shadow: 0 0 0 0 rgba(184, 75, 41, 0.8); }
  50% { box-shadow: 0 0 0 14px rgba(184, 75, 41, 0); }
  100% { box-shadow: 0 0 0 0 rgba(184, 75, 41, 0); }
}

.ft-card-pulse {
  animation: ftPulseGlow 1.8s ease-out 2 !important;
  border-color: var(--accent) !important;
}
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
console.log(`Successfully built unified interactive family tree into ${targetPage}`);
