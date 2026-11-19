'use strict';

const state = {
  data: null,
  selectedStateId: null,
  displayedNews: []
};

// 1. Track active language in state (defaults to saved choice or 'en')
state.lang = localStorage.getItem('siteLang') || 'en';

// 2. Helper to pick localized field with automatic English fallback
// Example: tField(site, 'siteTitle') checks site.siteTitleRu / site.siteTitleUz -> falls back to site.siteTitle
function tField(obj, key) {
  if (!obj) return '';
  if (state.lang === 'ru' && obj[`${key}Ru`]) return obj[`${key}Ru`];
  if (state.lang === 'uz' && obj[`${key}Uz`]) return obj[`${key}Uz`];
  return obj[key] || '';
}

// 3. Wire up the EN / RU / UZ buttons and re-render active views
function initLanguageSwitch() {
  const buttons = document.querySelectorAll('.lang-btn[data-lang]');
  if (!buttons.length) return;

const syncButtons = () => {
    buttons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.lang === state.lang);
    });
    document.documentElement.lang = state.lang;
    applyLanguageUpdates();
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextLang = btn.dataset.lang;
      if (!nextLang || nextLang === state.lang) return;
      state.lang = nextLang;
      localStorage.setItem('siteLang', nextLang);
      syncButtons();
    });
  });

  syncButtons();
}

function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const text = t(key);
    if (text) el.textContent = text;
  });
}

function applyLanguageUpdates() {
  applyStaticTranslations();
  renderSiteMeta();
  initMap();
  renderLegend();
  renderStateChips();
  if (state.selectedStateId && state.data?.states?.[state.selectedStateId]) {
    renderStateDetails(state.data.states[state.selectedStateId]);
  }
  renderParties();
  renderNews(false, false);
  renderComments();
}

const UI_STRINGS = {
  en: {
    datelineEdition: 'Politics · Elections · Analysis',
    navMap: 'Map',
    navParties: 'Parties',
    navNews: 'News',
    navComments: 'Comments',
    mapEyebrow: 'Interactive Map',
    mapHeading: 'Who leads where',
    mapSubtitle: 'Each region is colored by the party with the highest vote share. Hover for a quick look, then select a region for the full breakdown.',
    stateProfileEyebrow: 'State profile',
    selectStateTitle: 'Select a state',
    selectStateBody: 'Tap or click a region on the map, or pick one above, to see its capital, population, party results and key facts.',
    capital: 'Capital',
    population: 'Population',
    voteShare: 'Vote Share',
    partyPopularity: 'Party Popularity',
    keyFacts: 'Key Facts',
    clickForDetails: 'Click for details',
    clickForProfile: 'Click to view profile',
    ofStates: '{count} of {total} states',
    nonVotingTerritory: 'Non-voting territory',
    occupiedByWhites: 'Occupied by Whites',
    occupiedByReds: 'Occupied by Reds',
    occupiedByAlash: 'Occupied by Alash',
    nonVotingReasonPrefix: 'State is not voting due to:',
    noReasonSpecified: 'No reason specified.',
    leadsBy: '{party} leads by {margin} pts',
    leadsWith: '{party} leads with {pct}%',
    partiesEyebrow: 'The contenders',
    partiesHeading: 'Political parties',
    partiesSubtitle: 'Who they are, who leads them and where they are strongest.',
    leader: 'Leader',
    ideology: 'Ideology',
    strongholds: 'Strongholds',
    leadsIn: 'Leads in',
    noStatePlurality: 'No state plurality',
    newsEyebrow: "Today's reading",
    newsHeading: 'Top stories',
    newsSubtitle: 'Four stories picked at random from the newsroom archive.',
    shuffleNews: 'Shuffle News',
    readDispatch: 'Read dispatch →',
    dispatch: 'Dispatch',
    newsLoadedStatus: 'Loaded four new stories.',
    liveFeed: 'Live feed preview',
    commentsHeading: 'Reader voices',
    recentMessages: '{count} recent messages from Telegram',
    readerFallback: 'Reader',
    joinTelegram: 'Join & Comment on Telegram',
    commentsFoot: 'Read-only on this site. Replies are posted in our Telegram channel.',
    footerNote: 'All parties, regions, results and stories on this site are fictional sample data.',
    followTelegram: 'Follow on Telegram',
    discussTelegram: 'Discuss on Telegram',
    close: 'Close'
  },
  ru: {
    datelineEdition: 'Политика · Выборы · Аналитика',
    navMap: 'Карта',
    navParties: 'Партии',
    navNews: 'Новости',
    navComments: 'Комментарии',
    mapEyebrow: 'Интерактивная карта',
    mapHeading: 'Кто лидирует в регионах',
    mapSubtitle: 'Каждый регион окрашен в цвет партии с наибольшей долей голосов. Наведите курсор для просмотра или выберите регион.',
    stateProfileEyebrow: 'Профиль региона',
    selectStateTitle: 'Выберите регион',
    selectStateBody: 'Нажмите на регион на карте или выберите его из списка ниже, чтобы увидеть столицу, население, результаты партий и ключевые факты.',
    capital: 'Столица',
    population: 'Население',
    voteShare: 'Доля голосов',
    partyPopularity: 'Популярность партий',
    keyFacts: 'Ключевые факты',
    clickForDetails: 'Нажмите для подробностей',
    clickForProfile: 'Нажмите, чтобы открыть профиль',
    ofStates: '{count} из {total} регионов',
    nonVotingTerritory: 'Неголосующая территория',
    occupiedByWhites: 'Оккупировано белыми',
    occupiedByReds: 'Оккупировано красными',
    occupiedByAlash: 'Оккупировано «Алаш»',
    nonVotingReasonPrefix: 'Регион не голосует по причине:',
    noReasonSpecified: 'Причина не указана.',
    leadsBy: '{party} лидирует с отрывом {margin} п.п.',
    leadsWith: '{party} лидирует с {pct}%',
    partiesEyebrow: 'Участники',
    partiesHeading: 'Политические партии',
    partiesSubtitle: 'Кто они, кто их возглавляет и где они наиболее сильны.',
    leader: 'Лидер',
    ideology: 'Идеология',
    strongholds: 'Оплоты',
    leadsIn: 'Лидирует в:',
    noStatePlurality: 'Нет большинства ни в одном регионе',
    newsEyebrow: 'Чтение на сегодня',
    newsHeading: 'Главные новости',
    newsSubtitle: 'Четыре случайные статьи из архива редакции.',
    shuffleNews: 'Обновить новости',
    readDispatch: 'Читать материал →',
    dispatch: 'Сводка',
    newsLoadedStatus: 'Загружены четыре новые статьи.',
    liveFeed: 'Прямой эфир',
    commentsHeading: 'Голоса читателей',
    recentMessages: '{count} последних сообщений из Telegram',
    readerFallback: 'Читатель',
    joinTelegram: 'Присоединиться и обсудить в Telegram',
    commentsFoot: 'Только для чтения на сайте. Комментарии публикуются в нашем Telegram-канале.',
    footerNote: 'Все партии, регионы, результаты и новости на этом сайте основаны на исторической реконструкции.',
    followTelegram: 'Подписаться в Telegram',
    discussTelegram: 'Обсудить в Telegram',
    close: 'Закрыть'
  },
  uz: {
    datelineEdition: 'Siyosat · Saylovlar · Tahlil',
    navMap: 'Xarita',
    navParties: 'Partiyalar',
    navNews: 'Xabarlar',
    navComments: 'Fikrlar',
    mapEyebrow: 'Jonli xarita',
    mapHeading: 'Qayerda kim yetakchi',
    mapSubtitle: "Har bir o‘lka eng ko‘p ovoz olgan partiya rangiga bo‘yalgan. Qisqa ko‘rish uchun ustiga olib boring, to‘liq ma’lumot uchun o‘lkani tanlang.",
    stateProfileEyebrow: 'O‘lka ko‘rsatkichi',
    selectStateTitle: 'O‘lkani tanlang',
    selectStateBody: "Boshkent, aholi soni, partiyalar natijasi va asosiy ma’lumotlarni ko‘rish uchun xaritadagi o‘lkani bosing yoki yuqoridan tanlang.",
    capital: 'Boshkent',
    population: 'Aholi soni',
    voteShare: 'Ovoz ulushi',
    partyPopularity: 'Partiyalar nufuzi',
    keyFacts: 'Asosiy ma’lumotlar',
    clickForDetails: 'Tafsilotlar uchun bosing',
    clickForProfile: 'Ko‘rsatkichni ochish uchun bosing',
    ofStates: '{total} o‘lkadan {count} tasi',
    nonVotingTerritory: 'Ovoz bermaydigan yer',
    occupiedByWhites: 'Oqlar egallagan yer',
    occupiedByReds: 'Qizillar egallagan yer',
    occupiedByAlash: '«Alash» egallagan yer',
    nonVotingReasonPrefix: 'O‘lka quyidagi sababga ko‘ra ovoz bermayapti:',
    noReasonSpecified: 'Sababi ko‘rsatilmagan.',
    leadsBy: '{party} {margin} foiz band farq bilan oldinda',
    leadsWith: '{party} {pct}% ovoz bilan yetakchi',
    partiesEyebrow: 'Kurashuvchilar',
    partiesHeading: 'Siyosiy partiyalar',
    partiesSubtitle: 'Ular kimlar, yetakchilari kim va qayerda eng kuchli.',
    leader: 'Yetakchi',
    ideology: 'G‘oya',
    strongholds: 'Tayanch o‘lkalar',
    leadsIn: 'Yetakchi o‘lkalari:',
    noStatePlurality: 'Hech bir o‘lkada ustunlik yo‘q',
    newsEyebrow: 'Bugungi o‘qish',
    newsHeading: 'Asosiy xabarlar',
    newsSubtitle: 'Tahririyat xazinasidan tasodifiy tanlangan to‘rtta yozuv.',
    shuffleNews: 'Xabarlarni yangilash',
    readDispatch: 'Yozuvni o‘qish →',
    dispatch: 'Bildirish',
    newsLoadedStatus: 'To‘rtta yangi xabar yuklandi.',
    liveFeed: 'Jonli oqim',
    commentsHeading: 'O‘quvchilar ovozi',
    recentMessages: 'Telegram’dagi so‘nggi {count} ta yozishma',
    readerFallback: 'O‘quvchi',
    joinTelegram: 'Telegram’ga qo‘shiling va fikr bildiring',
    commentsFoot: 'Saytda faqat o‘qish mumkin. Fikrlar Telegram kanalimizda yoziladi.',
    footerNote: 'Ushbu saytdagi barcha partiyalar, o‘lkalar, natijalar va xabarlar to‘qima namuna ma’lumotlardir.',
    followTelegram: 'Telegram’da kuzatish',
    discussTelegram: 'Telegram’da muhokama qilish',
    close: 'Yopish'
  }
};

// 1. UI string helper
function t(key, vars = {}) {
  let str = UI_STRINGS[state.lang]?.[key] || UI_STRINGS.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

// 2. Localized data field helper (reads `fieldRu` when currentLang === 'ru', etc.)
function pick(obj, field) {
  if (!obj) return '';
  if (state.lang === 'ru' && obj[`${field}Ru`] !== undefined && obj[`${field}Ru`] !== '') {
    return obj[`${field}Ru`];
  }
  if (state.lang === 'uz' && obj[`${field}Uz`] !== undefined && obj[`${field}Uz`] !== '') {
    return obj[`${field}Uz`];
  }
  return obj[field] ?? '';
}

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
  const locale = state.lang === 'ru' ? 'ru-RU' : 'en-US';
  return Number(n).toLocaleString(locale);
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
  const title =
    pick(site, 'siteTitle') || pick(site, 'name') || pick(state.data, 'siteTitle');

  if ($('siteTitle') && title) $('siteTitle').textContent = title;
  if ($('footerTitle') && title) $('footerTitle').textContent = title;

  const edition = pick(site, 'edition');
  if ($('editionDate') && edition) $('editionDate').textContent = edition;

  if ($('todayDate')) {
    const localeMap = { en: 'en-US', ru: 'ru-RU', uz: 'uz-Latn-UZ' };
    $('todayDate').textContent = new Date().toLocaleDateString(
      localeMap[state.lang] || 'en-US',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    );
  }

const telegramUrl = site.telegramUrl || 'https://t.me/+vNRX4_hP69xlNjIy';
  document.querySelectorAll('[data-telegram]').forEach((el) => {
    el.href = telegramUrl;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  });
}

/* ---------------- INTERACTIVE MAP ---------------- */

function initMap() {
  const paths = document.querySelectorAll('#stateShapes .state');
  const labelsGroup = $('mapLabels');
  const tooltip = $('mapTooltip');
  const hoverOutline = $('outlineHover');

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
    const regionName = pick(region, 'name');
    const winnerShort = winner ? pick(winner, 'shortName') : '';

    path.style.fill = winner?.color || '#DEDBD2';

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
        ? `${regionName}: ${nvMeta.label}`
        : `${regionName}: ${winner ? t('leadsWith', { party: winnerShort, pct: results[0].pct }) : 'No data'}`
    );

    path.onpointerenter = () => {
      if (hoverOutline) {
        hoverOutline.setAttribute('d', path.getAttribute('d') || '');
        hoverOutline.classList.add('is-visible');
      }
      if (tooltip) {
        tooltip.hidden = false;
        tooltip.innerHTML = isNonVoting
          ? `<span class="tip-name">${escapeHtml(regionName)}</span>
             <span class="tip-lead"><span class="swatch" style="background:${nvMeta.swatch}"></span>${escapeHtml(nvMeta.label)}</span>
             <span class="tip-hint">${escapeHtml(t('clickForDetails'))}</span>`
          : winner
            ? `<span class="tip-name">${escapeHtml(regionName)}</span>
               <span class="tip-lead"><span class="swatch" style="background:${escapeHtml(winner.color)}"></span>${escapeHtml(winnerShort)} · ${results[0].pct}%</span>
               <span class="tip-hint">${escapeHtml(t('clickForProfile'))}</span>`
            : `<span class="tip-name">${escapeHtml(regionName)}</span>`;
      }
    };

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

  const GAP_PX = 4;
  const THICKNESS_PX = 26;

  Object.entries(groups).forEach(([key, { meta, paths }]) => {
    const outerFilterId = `occ-erode-outer-${key}`;
    const innerFilterId = `occ-erode-inner-${key}`;
    const maskId = `occ-mask-${key}`;

    const fOuter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    fOuter.setAttribute('id', outerFilterId);
    fOuter.setAttribute('class', 'occupation-filter');
    const mOuter = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
    mOuter.setAttribute('operator', 'erode');
    mOuter.setAttribute('radius', String(GAP_PX));
    fOuter.appendChild(mOuter);
    defs.appendChild(fOuter);

    const fInner = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    fInner.setAttribute('id', innerFilterId);
    fInner.setAttribute('class', 'occupation-filter');
    const mInner = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
    mInner.setAttribute('operator', 'erode');
    mInner.setAttribute('radius', String(GAP_PX + THICKNESS_PX));
    fInner.appendChild(mInner);
    defs.appendChild(fInner);

    const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
    mask.setAttribute('id', maskId);
    mask.setAttribute('class', 'occupation-mask');

    const whiteUnion = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    whiteUnion.setAttribute('filter', `url(#${outerFilterId})`);
    paths.forEach((p) => {
      const wp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      wp.setAttribute('d', p.getAttribute('d') || '');
      wp.setAttribute('fill', '#fff');
      wp.setAttribute('stroke', '#fff');
      wp.setAttribute('stroke-width', '6');
      whiteUnion.appendChild(wp);
    });
    mask.appendChild(whiteUnion);

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
    .filter((p) => !p.nonVoting)
    .map((p) => {
      const count = winCounts[p.id] || 0;
      const statesLabel = t('ofStates', { count, total: totalVoting });
      return `
        <li class="legend-item">
          <span class="swatch" style="background:${escapeHtml(p.color)}"></span>
          <div>
            <strong>${escapeHtml(pick(p, 'shortName'))} · ${escapeHtml(statesLabel)}</strong>
            <span>${escapeHtml(pick(p, 'name'))}</span>
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
            ${escapeHtml(pick(s, 'name'))}
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
    labelKey: 'nonVotingTerritory'
  },
  whites: {
    patternId: 'nonVotingHatch-whites',
    swatch: '#8EC49E',
    stroke: '#4E8F63',
    labelKey: 'occupiedByWhites'
  },
  reds: {
    patternId: 'nonVotingHatch-reds',
    swatch: '#DF8E8E',
    stroke: '#B84B4B',
    labelKey: 'occupiedByReds'
  },
  alash: {
    patternId: 'nonVotingHatch-alash',
    swatch: '#E5A86E',
    stroke: '#C47733',
    labelKey: 'occupiedByAlash'
  }
};

function getNonVotingMeta(region) {
  const key = String(region?.nonVotingType || 'independent').toLowerCase();
  const base = NON_VOTING_TYPES[key] || NON_VOTING_TYPES.independent;
  return {
    ...base,
    label: t(base.labelKey)
  };
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
      const fullName = r.party ? pick(r.party, 'name') : r.partyId;
      const shortName = r.party ? pick(r.party, 'shortName') : '';
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

  const localizedFacts = pick(region, 'facts');
  const factsList = Array.isArray(localizedFacts) ? localizedFacts : (region.facts || []);
  const factsHtml = factsList
    .map((fact) => `<li>${escapeHtml(fact)}</li>`)
    .join('');

  const leaderShort = leader?.party ? pick(leader.party, 'shortName') : '';
  const leadText =
    leadMargin !== null
      ? t('leadsBy', { party: leaderShort, margin: leadMargin })
      : t('leadsWith', { party: leaderShort, pct: leader?.pct ?? 0 });

  const reasonText = pick(region, 'reason') || t('noReasonSpecified');

  details.innerHTML = `
    <h3 class="panel-title">${escapeHtml(pick(region, 'name'))}</h3>
    ${isNonVoting
      ? `<div class="lead-badge lead-badge--non-voting">
        <div class="non-voting-head">
          <span class="swatch" style="background:${nvMeta.swatch}"></span>
          <strong>${escapeHtml(nvMeta.label)}</strong>
        </div>
        <p class="non-voting-text">
          ${escapeHtml(t('nonVotingReasonPrefix'))} ${escapeHtml(reasonText)}
        </p>
      </div>`
      : leader?.party
        ? `<p class="lead-badge">
              <span class="swatch" style="background:${escapeHtml(accent)}"></span>
              <span>${escapeHtml(leadText)}</span>
            </p>`
        : ''
    }

    <dl class="stat-grid">
      <div class="stat">
        <dt>${escapeHtml(t('capital'))}</dt>
        <dd>${escapeHtml(pick(region, 'capital') || '—')}</dd>
      </div>
      <div class="stat">
        <dt>${escapeHtml(t('population'))}</dt>
        <dd>${region.population ? formatNumber(region.population) : '—'}</dd>
      </div>
    </dl>

    ${barsHtml
      ? `<h4 class="sub-head">${escapeHtml(isNonVoting ? t('partyPopularity') : t('voteShare'))}</h4>
           <ul class="bars">${barsHtml}</ul>`
      : ''
    }

    ${factsHtml
      ? `<h4 class="sub-head">${escapeHtml(t('keyFacts'))}</h4>
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
      statesLedMap[pid].push(pick(s, 'name'));
    }
  });

  grid.innerHTML = state.data.parties
    .map((p) => {
      const led = statesLedMap[p.id] || [];
      const ideology = pick(p, 'ideology');
      const stronghold = pick(p, 'stronghold');
      const strongholdText =
        led.length > 0
          ? `${escapeHtml(t('leadsIn'))} <strong>${escapeHtml(led.join(', '))}</strong>`
          : escapeHtml(stronghold || t('noStatePlurality'));

      return `
        <article class="party-card" style="--accent:${escapeHtml(p.color)}">
          <div class="party-top">
            <span class="party-badge">${escapeHtml(pick(p, 'shortName'))}</span>
            ${ideology ? `<span class="ideology-tag">${escapeHtml(ideology)}</span>` : ''}
          </div>
          <h3 class="party-name">${escapeHtml(pick(p, 'name'))}</h3>
          <p class="party-leader"><span class="label">${escapeHtml(t('leader'))}</span>${escapeHtml(pick(p, 'leader') || '—')}</p>
          <p class="party-desc">${escapeHtml(pick(p, 'description') || '')}</p>
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
  const catLabel = party ? pick(party, 'shortName') : (pick(item, 'category') || t('dispatch'));
  const metaParts = [pick(item, 'date'), pick(item, 'readTime')].filter(Boolean).map(escapeHtml);
  const summaryText = pick(item, 'summary') || pick(item, 'dek') || '';

  return `
    <article class="news-card${isLead ? ' news-card--lead' : ''}">
      <p class="kicker">
        <span class="kicker-cat"${party ? ` style="color:${escapeHtml(party.color)}"` : ''}>${escapeHtml(catLabel)}</span>
        ${metaParts.length ? `<span>· ${metaParts.join(' · ')}</span>` : ''}
      </p>
      <h3 class="news-title">
        <button type="button" class="news-open" data-news-index="${idx}">${escapeHtml(pick(item, 'title'))}</button>
      </h3>
      <p class="news-summary">${escapeHtml(summaryText)}</p>
      <span class="news-more" aria-hidden="true">${escapeHtml(t('readDispatch'))}</span>
    </article>`;
}

function renderNews(announce = false, reshuffle = true) {
  const grid = $('newsGrid');
  const shuffleBtn = $('shuffleNews');
  if (!grid || !state.data?.news) return;

  if (announce) {
    grid.classList.add('is-swapping');
    if (shuffleBtn) shuffleBtn.classList.add('is-spinning');
  }

  setTimeout(() => {
    if (reshuffle || !state.displayedNews.length) {
      state.displayedNews = pickRandomNews(4);
    }
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
      $('newsStatus').textContent = t('newsLoadedStatus');
    }
  }, announce ? 180 : 0);
}

function openArticleModal(article) {
  const modal = $('articleModal');
  if (!modal) return;

  if ($('modalMeta')) {
    $('modalMeta').textContent = [
      pick(article, 'category'),
      pick(article, 'date'),
      pick(article, 'readTime')
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if ($('modalTitle')) $('modalTitle').textContent = pick(article, 'title') || '';
  if ($('modalDek')) $('modalDek').textContent = pick(article, 'summary') || pick(article, 'dek') || '';

  if ($('modalBody')) {
    const rawBody = pick(article, 'body') || pick(article, 'summary') || '';
    const paragraphs = Array.isArray(rawBody)
      ? rawBody
      : String(rawBody).split(/\n\n+/);
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
    $('commentCount').textContent = t('recentMessages', { count: comments.length });
  }

  list.innerHTML = comments
    .map((c, idx) => {
      const authorName = pick(c, 'author') || t('readerFallback');
      const initials = authorName
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
              <span class="comment-author">${escapeHtml(authorName)}</span>
              ${pick(c, 'time') ? `<time>${escapeHtml(pick(c, 'time'))}</time>` : ''}
            </div>
            <p class="comment-text">${escapeHtml(pick(c, 'text') || '')}</p>
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

    initLanguageSwitch();

    if ($('shuffleNews')) {
      $('shuffleNews').addEventListener('click', () => renderNews(true, true));
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