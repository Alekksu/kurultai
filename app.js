'use strict';

const state = {
  data: null,
  selectedStateId: null,
  displayedNews: []
};

const $ = (id) => document.getElementById(id);

function isNonVotingRegion(region) {
  return Boolean(region && (region.nonVoting === true || region.status === 'non-voting'));
}

function isCountedRegion(id, region) {
  if (!region || isNonVotingRegion(region)) return false;
  if (id === 'Aral' || id === 'Aral_Sea' || id === 'AralSea' || region.name === 'Aral Sea') {
    return false;
  }
  return Boolean(region.results && Object.keys(region.results).length > 0);
}

function isCountedRegion(id, region) {
  if (!region || region.status === 'non-voting') return false;
  if (id === 'Aral_Sea' || id === 'AralSea' || region.name === 'Aral Sea') return false;
  return Boolean(region.results && Object.keys(region.results).length > 0);
}
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}



function formatNumber(n) {
  return Number(n).toLocaleString('en-US');
}

function getParty(partyId, stateObj = null) {
  if (stateObj?.customParties) {
    const custom = stateObj.customParties.find((p) => p.id === partyId);
    if (custom) return custom;
  }
  if (!state.data?.parties) return null;
  return state.data.parties.find((p) => p.id === partyId) || null;
}

function getSortedResults(stateObj) {
  if (!stateObj?.results) return [];
  return Object.entries(stateObj.results)
    .map(([partyId, pct]) => ({
      partyId,
      pct: Number(pct),
      party: getParty(partyId, stateObj)
    }))
    .sort((a, b) => b.pct - a.pct);
}

// Handles SVG ID "Jarkent" -> data.json key "Dzharkent"
function resolveStateId(svgId) {
  if (!state.data?.states) return null;
  if (state.data.states[svgId]) return svgId;
  if (svgId === 'Jarkent' && state.data.states.Dzharkent) return 'Dzharkent';
  return null;
}

function getPathForStateId(stateId) {
  return (
    document.getElementById(stateId) ||
    (stateId === 'Dzharkent' ? document.getElementById('Jarkent') : null)
  );
}

/* ---------------- SITE CHROME ---------------- */

function renderSiteMeta() {
  const site = state.data?.site || {};
  const title = site.siteTitle || site.name;
  if ($('siteTitle') && title) $('siteTitle').textContent = title;
  if ($('footerTitle') && title) $('footerTitle').textContent = title;
  if ($('editionDate') && site.edition) $('editionDate').textContent = site.edition;

  if (site.telegramUrl) {
    document.querySelectorAll('[data-telegram]').forEach((el) => {
      el.href = site.telegramUrl;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    });
  }
}

/* ---------------- INTERACTIVE MAP ---------------- */

function initMap() {
  const paths = document.querySelectorAll('#stateShapes .state');
  const labelsGroup = $('mapLabels');
  const tooltip = $('mapTooltip');
  const hoverOutline = $('outlineHover');

  // Clear any existing hatch overlays on re-init
  document.querySelectorAll('#stateShapes .state-hatch-overlay').forEach((el) => el.remove());
  if (labelsGroup) labelsGroup.innerHTML = '';

  paths.forEach((path) => {
    const stateId = resolveStateId(path.id);
    const region = stateId ? state.data.states[stateId] : null;
    const isNonVoting = isNonVotingRegion(region);
    const results = getSortedResults(region);
    const hasVotes = region && results.length > 0;

    if (!region || (!hasVotes && !isNonVoting)) {
      path.style.fill = '#DEDBD2';
      path.classList.add('state--no-data');
      path.setAttribute('aria-disabled', 'true');
      return;
    }

    path.classList.remove('state--no-data', 'state--non-voting');
    path.removeAttribute('aria-disabled');
    path.style.pointerEvents = 'auto';

    const winner = results[0]?.party;
    const nvMeta = isNonVoting ? getNonVotingMeta(region) : null;

    // Always fill the base state shape with the leading party's color
    path.style.fill = winner?.color || '#DEDBD2';

    // If non-voting, place a transparent-backed diagonal stripe overlay directly above the path
    if (isNonVoting) {
      path.classList.add('state--non-voting');
      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      overlay.setAttribute('d', path.getAttribute('d') || '');
      overlay.setAttribute('class', 'state-hatch-overlay');
      overlay.style.fill = `url(#${nvMeta.patternId})`;
      overlay.style.pointerEvents = 'none';
      path.after(overlay);
    }

    path.setAttribute('tabindex', '0');
    path.setAttribute('role', 'button');
    path.setAttribute(
      'aria-label',
      isNonVoting
        ? `${region.name}: ${nvMeta.label}`
        : `${region.name}: ${winner ? `${winner.shortName} leads with ${results[0].pct}%` : 'No data'}`
    );

  
    path.addEventListener('pointerenter', () => {
      if (hoverOutline) {
        hoverOutline.setAttribute('d', path.getAttribute('d') || '');
        hoverOutline.classList.add('is-visible');
      }
      if (tooltip) {
        tooltip.hidden = false;
        tooltip.innerHTML = isNonVoting
          ? `<span class="tip-name">${escapeHtml(region.name)}</span>
             <span class="tip-lead"><span class="swatch" style="background:${nvMeta.swatch}"></span>${escapeHtml(nvMeta.label)}</span>
             <span class="tip-hint">Click for details</span>`
          : winner
            ? `<span class="tip-name">${escapeHtml(region.name)}</span>
               <span class="tip-lead"><span class="swatch" style="background:${escapeHtml(winner.color)}"></span>${escapeHtml(winner.shortName)} · ${results[0].pct}%</span>
               <span class="tip-hint">Click to view profile</span>`
            : `<span class="tip-name">${escapeHtml(region.name)}</span>`;
      }
    });

    path.addEventListener('pointermove', (e) => {
      if (!tooltip || tooltip.hidden) return;
      const stage = path.closest('.map-stage') || path.closest('.map-card');
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      tooltip.style.left = `${e.clientX - rect.left + 14}px`;
      tooltip.style.top = `${e.clientY - rect.top + 14}px`;
    });

    path.addEventListener('pointerleave', () => {
      if (hoverOutline) {
        hoverOutline.classList.remove('is-visible');
        hoverOutline.setAttribute('d', '');
      }
      if (tooltip) tooltip.hidden = true;
    });

    path.addEventListener('click', () => selectState(stateId));
    path.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectState(stateId);
      }
    });
  });
  renderOccupationOutlines();
}

function renderOccupationOutlines() {
  const container = $('occupationOutlines');
  const svg = container?.closest('svg');
  const defs = svg?.querySelector('defs');
  if (!container || !defs) return;

  container.innerHTML = '';
  defs.querySelectorAll('.occupation-mask, .occupation-filter').forEach((el) => el.remove());

  // Group non-voting paths by their occupation type
  const groups = {};
  document.querySelectorAll('#stateShapes .state').forEach((path) => {
    const stateId = resolveStateId(path.id);
    const region = stateId ? state.data.states[stateId] : null;
    if (!isNonVotingRegion(region)) return;

    const key = String(region.nonVotingType || 'independent').toLowerCase();
    const meta = NON_VOTING_TYPES[key] || NON_VOTING_TYPES.independent;
    groups[key] = groups[key] || { meta, paths: [] };
    groups[key].paths.push(path);
  });

  // Tune these two values (in screen pixels):
  const GAP_PX = 4;        // Gap between the actual state border and the inner outline
  const THICKNESS_PX = 26;  // Thickness of the unified inner outline

  Object.entries(groups).forEach(([key, { meta, paths }]) => {
    const outerFilterId = `occ-erode-outer-${key}`;
    const innerFilterId = `occ-erode-inner-${key}`;
    const maskId = `occ-mask-${key}`;

    // Filter 1: shrinks the unified white bloc inward by GAP_PX
    const fOuter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    fOuter.setAttribute('id', outerFilterId);
    fOuter.setAttribute('class', 'occupation-filter');
    const mOuter = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
    mOuter.setAttribute('operator', 'erode');
    mOuter.setAttribute('radius', String(GAP_PX));
    fOuter.appendChild(mOuter);
    defs.appendChild(fOuter);

    // Filter 2: shrinks the unified black center inward by (GAP_PX + THICKNESS_PX)
    const fInner = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    fInner.setAttribute('id', innerFilterId);
    fInner.setAttribute('class', 'occupation-filter');
    const mInner = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
    mInner.setAttribute('operator', 'erode');
    mInner.setAttribute('radius', String(GAP_PX + THICKNESS_PX));
    fInner.appendChild(mInner);
    defs.appendChild(fInner);

    // Mask combines the two eroded silhouettes into a single unified inset ring
    const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
    mask.setAttribute('id', maskId);
    mask.setAttribute('class', 'occupation-mask');

    // Step 1: White unified bloc eroded by GAP_PX (creates the outer gap inside the border)
    const whiteUnion = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    whiteUnion.setAttribute('filter', `url(#${outerFilterId})`);
    paths.forEach((p) => {
      const wp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      wp.setAttribute('d', p.getAttribute('d') || '');
      wp.setAttribute('fill', '#fff');
      wp.setAttribute('stroke', '#fff');
      wp.setAttribute('stroke-width', '6'); // Bridges white borders between touching states
      whiteUnion.appendChild(wp);
    });
    mask.appendChild(whiteUnion);

    // Step 2: Black unified bloc eroded by (GAP_PX + THICKNESS_PX) (hollows out the center)
    const blackHole = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    blackHole.setAttribute('filter', `url(#${innerFilterId})`);
    paths.forEach((p) => {
      const bp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      bp.setAttribute('d', p.getAttribute('d') || '');
      bp.setAttribute('fill', '#000');
      bp.setAttribute('stroke', '#000');
      bp.setAttribute('stroke-width', '6');
      blackHole.appendChild(bp);
    });
    mask.appendChild(blackHole);

    defs.appendChild(mask);

    // Render the solid occupation color through the unified inset ring mask
    const groupEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    groupEl.setAttribute('mask', `url(#${maskId})`);

    paths.forEach((p) => {
      const fill = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      fill.setAttribute('d', p.getAttribute('d') || '');
      fill.setAttribute('fill', meta.stroke);
      groupEl.appendChild(fill);
    });

    container.appendChild(groupEl);
  });
}

function renderLegend() {
  const legend = $('mapLegend');
  if (!legend || !state.data?.parties) return;

  const votingStates = Object.entries(state.data.states || {})
    .filter(([id, s]) => isCountedRegion(id, s))
    .map(([, s]) => s);
  const totalVoting = votingStates.length;

  const winCounts = {};
  votingStates.forEach((s) => {
    const top = getSortedResults(s)[0];
    if (top) winCounts[top.partyId] = (winCounts[top.partyId] || 0) + 1;
  });

  legend.innerHTML = state.data.parties
    .map((p) => {
      const count = winCounts[p.id] || 0;
      return `
        <li class="legend-item">
          <span class="swatch" style="background:${escapeHtml(p.color)}"></span>
          <div>
            <strong>${escapeHtml(p.shortName)} · ${count} of ${totalVoting} states</strong>
            <span>${escapeHtml(p.name)}</span>
          </div>
        </li>`;
    })
    .join('');
}

function renderStateChips() {
  const chipsList = $('stateChips');
  if (!chipsList || !state.data?.states) return;

  const listedStates = Object.entries(state.data.states).filter(([id, s]) => {
    if (!s) return false;
    if (id === 'Aral' || id === 'Aral_Sea' || id === 'AralSea' || s.name === 'Aral Sea') {
      return false;
    }
    return true;
  });

  chipsList.innerHTML = listedStates
    .map(([id, s]) => {
      const active = state.selectedStateId === id;
      return `
        <li>
          <button type="button" class="chip" data-state-chip="${escapeHtml(id)}" aria-pressed="${active}">
            ${escapeHtml(s.name)}
          </button>
        </li>`;
    })
    .join('');

  chipsList.querySelectorAll('[data-state-chip]').forEach((btn) => {
    btn.addEventListener('click', () => selectState(btn.dataset.stateChip));
  });
}

function selectState(stateId) {
  const region = state.data?.states?.[stateId];
  if (!region) return;

  state.selectedStateId = stateId;

  const selectedOutline = $('outlineSelected');
  const path = getPathForStateId(stateId);
  if (selectedOutline) {
    if (path) {
      selectedOutline.setAttribute('d', path.getAttribute('d') || '');
      selectedOutline.classList.add('is-visible');
    } else {
      selectedOutline.classList.remove('is-visible');
      selectedOutline.setAttribute('d', '');
    }
  }

  document.querySelectorAll('[data-state-chip]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.stateChip === stateId));
  });

  renderStateDetails(region);
}

const NON_VOTING_TYPES = {
  independent: {
    patternId: 'nonVotingHatch-independent',
    swatch: '#B8B4A8',
    stroke: '#8C887C',
    label: 'Non-voting territory'
  },
  whites: {
    patternId: 'nonVotingHatch-whites',
    swatch: '#8EC49E',
    stroke: '#4E8F63',
    label: 'Occupied by Whites'
  },
  reds: {
    patternId: 'nonVotingHatch-reds',
    swatch: '#DF8E8E',
    stroke: '#B84B4B',
    label: 'Occupied by Reds'
  },
  alash: {
    patternId: 'nonVotingHatch-alash',
    swatch: '#E5A86E',
    stroke: '#C47733',
    label: 'Occupied by Alash'
  }
};

function getNonVotingMeta(region) {
  const key = String(region?.nonVotingType || 'independent').toLowerCase();
  return NON_VOTING_TYPES[key] || NON_VOTING_TYPES.independent;
}

function renderStateDetails(region) {
  const details = $('stateDetails');
  if (!details) return;

  const panel = details.closest('.state-panel');
  const isNonVoting = isNonVotingRegion(region);
  const nvMeta = isNonVoting ? getNonVotingMeta(region) : null;
  const results = getSortedResults(region);
  const leader = results[0];
  const runnerUp = results[1];
  const accent = isNonVoting ? 'var(--muted)' : leader?.party?.color || 'var(--ink)';
  const leadMargin =
    leader && runnerUp ? (leader.pct - runnerUp.pct).toFixed(1) : null;

  if (panel) panel.style.setProperty('--accent', accent);

  const barsHtml = results
    .map((r) => {
      const color = r.party?.color || 'var(--ink)';
      const fullName = r.party?.name || r.partyId;
      const shortName = r.party?.shortName || '';
      return `
        <li class="bar-row">
          <div class="bar-head">
            <span class="bar-name">
              <span class="swatch" style="background:${escapeHtml(color)}"></span>
              <span>${escapeHtml(fullName)}</span>
              ${shortName ? `<span class="bar-short">${escapeHtml(shortName)}</span>` : ''}
            </span>
            <span class="bar-pct">${r.pct.toFixed(1)}%</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" data-target-width="${Math.min(100, r.pct)}%" style="width:0%;background:${escapeHtml(color)}"></div>
          </div>
        </li>`;
    })
    .join('');

  const factsHtml = (region.facts || [])
    .map((fact) => `<li>${escapeHtml(fact)}</li>`)
    .join('');

  details.innerHTML = `
    <h3 class="panel-title">${escapeHtml(region.name)}</h3>
    ${isNonVoting
      ? `<div class="lead-badge lead-badge--non-voting">
        <div class="non-voting-head">
          <span class="swatch" style="background:${nvMeta.swatch}"></span>
          <strong>${escapeHtml(nvMeta.label)}</strong>
        </div>
        <p class="non-voting-text">
          State is not Voting Due to: ${escapeHtml(region.reason || 'No reason specified.')}
        </p>
      </div>`
      : leader?.party
        ? `<p class="lead-badge">
              <span class="swatch" style="background:${escapeHtml(accent)}"></span>
              <span>${escapeHtml(leader.party.shortName)} leads${leadMargin !== null ? ` by ${leadMargin} pts` : ` with ${leader.pct}%`}</span>
            </p>`
        : ''
    }

    <dl class="stat-grid">
      <div class="stat">
        <dt>Capital</dt>
        <dd>${escapeHtml(region.capital || '—')}</dd>
      </div>
      <div class="stat">
        <dt>Population</dt>
        <dd>${region.population ? formatNumber(region.population) : '—'}</dd>
      </div>
    </dl>

    ${barsHtml
      ? `<h4 class="sub-head">${isNonVoting ? 'Party Popularity' : 'Vote Share'}</h4>
           <ul class="bars">${barsHtml}</ul>`
      : ''
    }

    ${factsHtml
      ? `<h4 class="sub-head">Key Facts</h4>
           <ul class="facts">${factsHtml}</ul>`
      : ''
    }
  `;

  requestAnimationFrame(() => {
    details.querySelectorAll('.bar-fill').forEach((bar) => {
      bar.style.width = bar.dataset.targetWidth;
    });
  });
}

/* ---------------- POLITICAL PARTIES ---------------- */

function renderParties() {
  const grid = $('partyGrid');
  if (!grid || !state.data?.parties) return;

  const statesLedMap = {};
  Object.entries(state.data.states || {}).forEach(([id, s]) => {
    if (!isCountedRegion(id, s)) return;
    const sorted = getSortedResults(s);
    if (sorted[0]) {
      const pid = sorted[0].partyId;
      statesLedMap[pid] = statesLedMap[pid] || [];
      statesLedMap[pid].push(s.name);
    }
  });

  grid.innerHTML = state.data.parties
    .map((p) => {
      const led = statesLedMap[p.id] || [];
      const strongholdText =
        led.length > 0
          ? `Leads in <strong>${escapeHtml(led.join(', '))}</strong>`
          : escapeHtml(p.stronghold || 'No state plurality');

      return `
        <article class="party-card" style="--accent:${escapeHtml(p.color)}">
          <div class="party-top">
            <span class="party-badge">${escapeHtml(p.shortName)}</span>
            ${p.ideology ? `<span class="ideology-tag">${escapeHtml(p.ideology)}</span>` : ''}
          </div>
          <h3 class="party-name">${escapeHtml(p.name)}</h3>
          <p class="party-leader"><span class="label">Leader</span>${escapeHtml(p.leader || '—')}</p>
          <p class="party-desc">${escapeHtml(p.description || '')}</p>
          <div class="party-foot">${strongholdText}</div>
        </article>`;
    })
    .join('');
}

/* ---------------- NEWS & MODAL ---------------- */

function pickRandomNews(count = 4) {
  const all = [...(state.data?.news || [])];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, count);
}

function renderNewsCard(item, idx, isLead = false) {
  const party = item.partyId ? getParty(item.partyId) : null;
  const catLabel = party ? party.shortName : item.category || 'Dispatch';
  const metaParts = [item.date, item.readTime].filter(Boolean).map(escapeHtml);

  return `
    <article class="news-card${isLead ? ' news-card--lead' : ''}">
      <p class="kicker">
        <span class="kicker-cat"${party ? ` style="color:${escapeHtml(party.color)}"` : ''}>${escapeHtml(catLabel)}</span>
        ${metaParts.length ? `<span>· ${metaParts.join(' · ')}</span>` : ''}
      </p>
      <h3 class="news-title">
        <button type="button" class="news-open" data-news-index="${idx}">${escapeHtml(item.title)}</button>
      </h3>
      <p class="news-summary">${escapeHtml(item.summary || item.dek || '')}</p>
      <span class="news-more" aria-hidden="true">Read dispatch →</span>
    </article>`;
}

function renderNews(announce = false) {
  const grid = $('newsGrid');
  const shuffleBtn = $('shuffleNews');
  if (!grid || !state.data?.news) return;

  if (announce) {
    grid.classList.add('is-swapping');
    if (shuffleBtn) shuffleBtn.classList.add('is-spinning');
  }

  setTimeout(() => {
    state.displayedNews = pickRandomNews(4);
    const [lead, ...rest] = state.displayedNews;

    grid.innerHTML =
      (lead ? renderNewsCard(lead, 0, true) : '') +
      (rest.length
        ? `<div class="news-secondary">${rest.map((item, i) => renderNewsCard(item, i + 1, false)).join('')}</div>`
        : '');

    grid.querySelectorAll('[data-news-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const article = state.displayedNews[Number(btn.dataset.newsIndex)];
        if (article) openArticleModal(article);
      });
    });

    grid.classList.remove('is-swapping');
    if (shuffleBtn) shuffleBtn.classList.remove('is-spinning');

    if (announce && $('newsStatus')) {
      $('newsStatus').textContent = 'Loaded four new stories.';
    }
  }, announce ? 180 : 0);
}

function openArticleModal(article) {
  const modal = $('articleModal');
  if (!modal) return;

  if ($('modalMeta')) {
    $('modalMeta').textContent = [article.category, article.date, article.readTime]
      .filter(Boolean)
      .join(' · ');
  }
  if ($('modalTitle')) $('modalTitle').textContent = article.title || '';
  if ($('modalDek')) $('modalDek').textContent = article.summary || article.dek || '';

  if ($('modalBody')) {
    const paragraphs = Array.isArray(article.body)
      ? article.body
      : String(article.body || article.summary || '').split(/\n\n+/);
    $('modalBody').innerHTML = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  }

  document.documentElement.classList.add('modal-open');
  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }
}

function closeArticleModal() {
  const modal = $('articleModal');
  if (!modal) return;
  document.documentElement.classList.remove('modal-open');
  if (typeof modal.close === 'function') {
    modal.close();
  } else {
    modal.removeAttribute('open');
  }
}

/* ---------------- READER COMMENTS ---------------- */

function renderComments() {
  const list = $('commentList');
  if (!list || !state.data?.comments) return;

  const comments = state.data.comments;
  const avatarColors = ['#1A7DB1', '#2E6F40', '#B45309', '#991B1B', '#4338CA', '#3F3F46'];

  if ($('commentCount')) {
    $('commentCount').textContent = `${comments.length} recent messages from Telegram`;
  }

  list.innerHTML = comments
    .map((c, idx) => {
      const initials = (c.author || '?')
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      const bg = avatarColors[idx % avatarColors.length];
      return `
        <li class="comment">
          <div class="avatar" style="background:${bg}" aria-hidden="true">${escapeHtml(initials)}</div>
          <div>
            <div class="comment-meta">
              <span class="comment-author">${escapeHtml(c.author || 'Reader')}</span>
              ${c.time ? `<time>${escapeHtml(c.time)}</time>` : ''}
            </div>
            <p class="comment-text">${escapeHtml(c.text || '')}</p>
          </div>
        </li>`;
    })
    .join('');
}

/* ---------------- BOOTSTRAP ---------------- */

async function init() {
  try {
    const response = await fetch('data.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while loading data.json`);
    }
    state.data = await response.json();

    renderSiteMeta();
    initMap();
    renderLegend();
    renderStateChips();
    renderParties();
    renderNews(false);
    renderComments();

    if ($('shuffleNews')) {
      $('shuffleNews').addEventListener('click', () => renderNews(true));
    }
    if ($('modalClose')) {
      $('modalClose').addEventListener('click', closeArticleModal);
    }
    if ($('modalDone')) {
      $('modalDone').addEventListener('click', closeArticleModal);
    }
    if ($('articleModal')) {
      $('articleModal').addEventListener('click', (e) => {
        if (e.target === $('articleModal')) closeArticleModal();
      });
      $('articleModal').addEventListener('close', () => {
        document.documentElement.classList.remove('modal-open');
      });
    }
  } catch (err) {
    console.error('Failed to initialize app:', err);
    const errBox = $('loadError');
    if (errBox) {
      errBox.hidden = false;
      errBox.innerHTML = `<strong>Unable to load election data:</strong> ${escapeHtml(err.message)}. Make sure you are serving this folder over HTTP rather than opening <code>index.html</code> directly via <code>file://</code>.`;
    }
  }
}

document.addEventListener('DOMContentLoaded', init);