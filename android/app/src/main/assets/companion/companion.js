/* re:Blue - dual-screen panel for Blue Dragon (AYN Thor and other dual-screen handhelds),
 * in the look of the game's camp menu.
 *
 * The game samples a JSON snapshot on its own thread (reblue/src/platform/android_companion.cpp)
 * and this page polls it through the BD bridge (DualScreenCompanion.java). The art is the game's
 * own: game/<path>.png is a texture of the installed game, decoded on the device, and
 * live/minimap.png the minimap floor the game has loaded. Positions and texture crops come from
 * the game's own layouts (d2anime\L_main_chwind_btn.csv, d2anime\uv.csv).
 *
 * Opened in a desktop browser without the bridge it runs on sample data
 * (?mode=field|battle|menu|title). */
(function () {
  'use strict';

  // ---------------------------------------------------------------- text
  // Spanish strings are the game's own (cmp_str_es, sta_str_es, cmn_str_es).
  const STRINGS = {
    es: {
      cmds: { party: 'Estado', shadow: 'Sombra', bag: 'Objetos', map: 'Mapa', battle: 'Combate' },
      items: 'Objetos', settings: 'Ajustes', language: 'Idioma', gold: 'Oro',
      optHaptics: 'Vibración al tocar', optBattle: 'Pasar a Combate al empezar una batalla',
      disable: 'Apagar panel', close: 'Cerrar', wake: 'Toca para despertar',
      waitingBoot: 'Esperando al juego…', waitingTitle: 'Pantalla de título · carga una partida',
      modes: { field: '', battle: 'Combate', menu: 'Menú', event: 'Escena', title: 'Título', loading: 'Cargando…', boot: '' },
      hp: 'PS', mp: 'PM', lv: 'NV', rank: 'RG', sp: 'PH', shadow: 'Clase de sombra', exp: 'EXP',
      accessories: 'Accesorios', free: 'Vacío', none: '—', noClass: 'Sin clase', active: 'EQUIPADA', locked: 'Sin desbloquear',
      emptyBag: 'No tienes objetos.', unknownItem: 'Objeto #{id}', enemy: 'Enemigo', boss: 'Jefe', enemies: 'Enemigos',
      noMap: 'No hay mapa aquí (combate o escena).', allFound: 'No queda nada por encontrar.',
      chests: 'Cofres', points: 'Puntos de búsqueda', barriers: 'Barreras',
      kinds: { item: 'Objeto', gold: 'Oro', heal: 'Curación', damage: 'Trampa', status: 'Estado', medal: 'Medalla',
        lock: 'Cerradura', grass: 'Hierba', param: 'Potenciador', chest: 'Cofre', barrier: 'Barrera', message: 'Mensaje' },
      classes: ['Mago blanco', 'Mago negro', 'Mago de apoyo', 'Magia de barrera', 'Maestro de espada', 'Monje', 'Guardián', 'Asesino', 'Factótum'],
      names: { 1: 'Shu', 2: 'Yiro', 3: 'Kluke', 4: 'Marumaro', 5: 'Zola' },
      artOn: 'Gráficos del juego cargados desde tu instalación.', artOff: 'Aún no se han podido leer los gráficos del juego.'
    },
    en: {
      cmds: { party: 'Status', shadow: 'Shadow', bag: 'Items', map: 'Map', battle: 'Battle' },
      items: 'Items', settings: 'Settings', language: 'Language', gold: 'Gold',
      optHaptics: 'Vibrate on touch', optBattle: 'Switch to Battle when a battle starts',
      disable: 'Turn panel off', close: 'Close', wake: 'Tap to wake',
      waitingBoot: 'Waiting for the game…', waitingTitle: 'Title screen · load a save',
      modes: { field: '', battle: 'Battle', menu: 'Menu', event: 'Scene', title: 'Title', loading: 'Loading…', boot: '' },
      hp: 'HP', mp: 'MP', lv: 'LV', rank: 'RK', sp: 'SP', shadow: 'Shadow class', exp: 'EXP',
      accessories: 'Accessories', free: 'Empty', none: '—', noClass: 'No class', active: 'EQUIPPED', locked: 'Locked',
      emptyBag: 'You have no items.', unknownItem: 'Item #{id}', enemy: 'Enemy', boss: 'Boss', enemies: 'Enemies',
      noMap: 'No map here (battle or scene).', allFound: 'Nothing left to find.',
      chests: 'Chests', points: 'Search points', barriers: 'Barriers',
      kinds: { item: 'Item', gold: 'Gold', heal: 'Healing', damage: 'Trap', status: 'Status', medal: 'Medal',
        lock: 'Lock', grass: 'Grass', param: 'Stat boost', chest: 'Chest', barrier: 'Barrier', message: 'Message' },
      classes: ['White Magic', 'Black Magic', 'Support Magic', 'Barrier Magic', 'Sword Master', 'Monk', 'Guardian', 'Assassin', 'Generalist'],
      names: { 1: 'Shu', 2: 'Jiro', 3: 'Kluke', 4: 'Marumaro', 5: 'Zola' },
      artOn: 'Game graphics loaded from your installation.', artOff: 'The game graphics could not be read yet.'
    }
  };
  // The engine's class names (chara.h ToString(CharaClass)) to its index.
  const CLASS_INDEX = { 'white-magic': 0, 'black-magic': 1, 'support-magic': 2, 'barrier-magic': 3, 'sword-master': 4,
    monk: 5, guardian: 6, assassin: 7, generalist: 8 };

  // ---------------------------------------------------------------- game art (uv.csv)
  const ART = {
    face: 'd2anime/res/cmn_fc', lay: 'd2anime/res/cmn_lay_main01_xx', bar: 'd2anime/res/cmn_stas_bar',
    hpmp: 'd2anime/res/cmn_hpmp_xx', cls: 'd2anime/res/cmn_ic_ct', stas: 'd2anime/res/cmn_icon_stas',
    leader: 'd2anime/res/icon_leader', heada: 'd2anime/res/cmn_heada_xx', win: 'bd_system/wnd/bt_01_of',
    arrow: 'minimap/mm_entrance'
  };
  const url = (path) => `game/${path}.png`;
  // Pc0NFcUv, res\cmn_fc
  const FACE_UV = { 1: [0, 0, 0.5, 0.25], 2: [0, 0.5, 0.5, 0.75], 3: [0, 0.25, 0.5, 0.5], 4: [0, 0.75, 0.5, 1], 5: [0.5, 0, 1, 0.25] };
  // res\cmn_ic_ct, by engine class index: White, Black, Power (support), Barrier, Sword, Monk, Armor (guardian), Assassin, Combi
  const CLASS_UV = [[0.5, 0], [0.25, 0], [0.25, 0.25], [0.5, 0.25], [0, 0], [0.75, 0], [0.75, 0.25], [0, 0.25], [0, 0.5]];
  // res\cmn_icon_stas
  const STATUS_UV = { sleep: [0, 0], poison: [0.25, 0], stink: [0.5, 0], stun: [0.75, 0], dizzy: [0, 0.25], panic: [0.25, 0.25],
    kelolon: [0.5, 0.25], paralyze: [0.75, 0.25], petrify: [0.25, 0.5], 'knocked-out': [0, 0.5] };
  // The port's own marker colors (engine/menus/map_markers.h).
  const KIND_COLOR = { item: '#ffd24a', gold: '#ffa02a', medal: '#6fe0ff', param: '#7ce07c', heal: '#ff8cc0',
    grass: '#9cd86c', chest: '#d8b44a', barrier: '#c08cff', lock: '#b0b0b0', damage: '#ff6a52', status: '#b0b0b0', message: '#b0b0b0' };
  const SQUARE = { chest: true, barrier: true };

  // background-size/position for a uv crop of a texture.
  function crop(path, u0, v0, u1, v1) {
    const w = u1 - u0, h = v1 - v0;
    const px = w < 1 ? (u0 / (1 - w)) * 100 : 0, py = h < 1 ? (v0 / (1 - h)) * 100 : 0;
    return `background-image:url(${url(path)});background-size:${100 / w}% ${100 / h}%;background-position:${px}% ${py}%`;
  }
  const tile = (path, uv, size) => crop(path, uv[0], uv[1], uv[0] + size, uv[1] + size);

  // ---------------------------------------------------------------- settings
  const bridge = window.BD || null;
  const settings = Object.assign({ lang: 'auto', haptics: true, battleView: true, view: 'party', zoom: 1 },
    JSON.parse(localStorage.getItem('bd-companion2') || '{}'));
  settings.zoom = Math.max(1, Math.min(6, Number(settings.zoom) || 1));
  const save = () => localStorage.setItem('bd-companion2', JSON.stringify(settings));
  function lang() {
    if (settings.lang !== 'auto') return settings.lang;
    const l = ((bridge && bridge.language && bridge.language()) || navigator.language || 'es').toLowerCase();
    return l.startsWith('es') ? 'es' : 'en';
  }
  let T = STRINGS[lang()];
  const fmt = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (n) => String(Math.max(0, Math.round(Number(n || 0))));
  const $ = (id) => document.getElementById(id);
  const nameOf = (c) => T.names[c.pc] || '#' + c.slot;
  function haptic() { if (settings.haptics && bridge && bridge.haptic) bridge.haptic(); }

  function applyI18n() {
    T = STRINGS[lang()];
    document.documentElement.lang = lang();
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = T[el.dataset.i18n] || ''; });
    document.querySelector('.txt-gold').textContent = T.gold;
    sig = {};
  }

  // ---------------------------------------------------------------- fit the camp canvas to the screen
  function fit() {
    const W = 900, H = 784;
    const k = Math.min(innerWidth / W, innerHeight / H);
    const app = $('app');
    app.style.transform = `translate(${(innerWidth - W * k) / 2}px, ${(innerHeight - H * k) / 2}px) scale(${k})`;
    document.querySelector('.modal-box').style.transform = `scale(${k})`;
    scale = k;
  }
  let scale = 1;

  // ---------------------------------------------------------------- game art availability
  // The art comes from the installed game through the VFS, which is up once the game has
  // booted; until then the CSS stand-ins draw and this keeps trying.
  let art = false;
  function probeArt() {
    const img = new Image();
    img.onload = () => {
      art = true; document.body.classList.add('art'); sig = {}; render();
      $('artStatus').textContent = T.artOn;
    };
    img.onerror = () => { $('artStatus').textContent = T.artOff; setTimeout(probeArt, 4000); };
    img.src = url(ART.win) + '?t=' + Date.now();
  }
  const images = {};
  function image(path) {
    if (!images[path]) { const im = new Image(); im.onload = () => { if (currentView === 'map') drawMap(); }; im.src = url(path); images[path] = im; }
    return images[path];
  }

  // ---------------------------------------------------------------- state polling
  let state = {};
  let lastSerial = -1;
  let sig = {};
  function changed(key, value) {
    const s = JSON.stringify(value);
    if (sig[key] === s) return false;
    sig[key] = s;
    return true;
  }
  function readState() {
    if (!bridge) return Mock.next();
    try { return JSON.parse(bridge.state() || '{}'); } catch (e) { return {}; }
  }
  let sleeping = false;
  function poll() {
    // Asleep or hidden, nothing reads the game: the native side stops sampling too.
    if (sleeping || document.hidden) return;
    const next = readState();
    if (next.serial !== undefined && next.serial === lastSerial) return;
    lastSerial = next.serial;
    state = next;
    onModeChange();
    render();
  }

  let previousMode = '';
  let viewBeforeBattle = null;
  function onModeChange() {
    const mode = state.mode || '';
    if (mode === previousMode) return;
    if (mode === 'battle' && settings.battleView && currentView !== 'battle') {
      viewBeforeBattle = currentView;
      showView('battle', true);
    } else if (previousMode === 'battle' && mode !== 'battle' && currentView === 'battle') {
      showView(viewBeforeBattle || 'party', true);
      viewBeforeBattle = null;
    }
    previousMode = mode;
  }

  // ---------------------------------------------------------------- views
  let currentView = settings.view === 'battle' ? 'party' : settings.view;
  const hasGame = () => Array.isArray(state.party) && state.party.length > 0 && state.mode !== 'title';

  function showView(view, auto) {
    currentView = view;
    if (!auto && view !== 'battle') { settings.view = view; save(); }
    sig = {};
    render();
  }

  function render() {
    const visible = hasGame() ? currentView : 'waiting';
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + visible));
    renderHeader();
    renderCommands();
    if (visible === 'waiting') $('waitingText').textContent = state.mode === 'title' ? T.waitingTitle : T.waitingBoot;
    if (visible === 'party') renderParty();
    if (visible === 'shadow') renderShadow();
    if (visible === 'bag') renderBag();
    if (visible === 'map') renderMap();
    if (visible === 'battle') renderBattle();
  }

  function renderHeader() {
    if (!changed('header', [state.mode, state.location, state.stage, state.gold, art, lang()])) return;
    $('location').textContent = state.location || state.stage || 'Blue Dragon';
    const m = $('mode');
    m.textContent = T.modes[state.mode] || '';
    m.className = 'mode ' + (state.mode || '');
    $('gold').textContent = state.gold != null ? num(state.gold) : '';
    const hg = document.querySelector('.hdr-gold');
    hg.setAttribute('style', `background-image:url(${url(ART.heada)})`);
  }

  // The camp menu's command column (L_top.csv / L_top_menubtn.csv).
  function renderCommands() {
    const cmds = ['party', 'shadow', 'bag', 'map'];
    if (state.mode === 'battle') cmds.push('battle');
    if (!changed('cmds', [cmds, currentView, lang()])) return;
    $('commands').innerHTML = cmds.map((c) => `<button class="win cmd ${c === currentView ? 'on' : ''}" data-view="${c}">
      ${c === currentView ? '<i class="cursor"></i>' : ''}${esc(T.cmds[c])}</button>`).join('');
  }

  // Character card (L_main_chwind_btn.csv) --------------------------------
  function card(c, top, opts) {
    const o = opts || {};
    const fuv = FACE_UV[c.pc];
    const danger = (v, m) => m > 0 && v / m < 0.25;
    const bw = (v, m) => (m > 0 ? Math.max(0, Math.min(120, Math.round((120 * v) / m))) : 0);
    const ci = CLASS_INDEX[c.cls];
    const st = (c.status || []).filter((s) => STATUS_UV[s]).slice(0, 3);
    return `<button class="win card ${o.sel ? 'on' : ''} ${o.out ? 'out' : ''}" data-slot="${c.slot}" style="top:${top}px">
      ${o.cursor ? '<i class="cursor"></i>' : ''}
      ${fuv ? `<i class="spr face" style="${crop(ART.face, ...fuv)}"></i>` : ''}
      <span class="initial">${esc(nameOf(c)[0])}</span>
      <i class="spr lay" style="background-image:url(${url(ART.lay)})"></i>
      <span class="t lvlbl">${T.lv}</span><span class="t lv num">${c.lv}</span>
      <i class="spr lbl hp" style="background-image:url(${url(ART.hpmp)})"></i><i class="spr lbl mp" style="background-image:url(${url(ART.hpmp)})"></i>
      <span class="t gl hp">${T.hp}</span><span class="t gl mp">${T.mp}</span>
      <i class="spr bar hp ${danger(c.hp, c.maxHp) ? 'danger' : ''}" style="width:${bw(c.hp, c.maxHp)}px;background-image:url(${url(ART.bar)})"></i>
      <i class="spr bar mp ${danger(c.mp, c.maxMp) ? 'danger' : ''}" style="width:${bw(c.mp, c.maxMp)}px;background-image:url(${url(ART.bar)})"></i>
      <span class="gauge hp"><i style="width:${bw(c.hp, c.maxHp)}px"></i></span><span class="gauge mp"><i style="width:${bw(c.mp, c.maxMp)}px"></i></span>
      <span class="t v hp num ${c.hp <= 0 ? 'ko' : ''}">${num(c.hp)}</span><span class="t sl hp num">/</span><span class="t vm hp num">${num(c.maxHp)}</span>
      <span class="t v mp num">${num(c.mp)}</span><span class="t sl mp num">/</span><span class="t vm mp num">${num(c.maxMp)}</span>
      ${ci != null ? `<i class="spr cls" style="${tile(ART.cls, CLASS_UV[ci], 0.25)}"></i><span class="t rk num">${c.rank}</span>` : ''}
      ${st.map((s, i) => `<i class="spr st" style="left:${4 + 33 * i}px;${tile(ART.stas, STATUS_UV[s], 0.25)}"></i>`).join('')}
      ${c.leader ? `<i class="spr lead" style="background-image:url(${url(ART.leader)})"></i>` : ''}
      <span class="t nm">${esc(nameOf(c))}</span><span class="t nme">${esc(nameOf(c).toUpperCase())}</span>
    </button>`;
  }

  // Estado ------------------------------------------------------------------
  let selectedSlot = null;
  const members = () => (state.party || []).concat(state.reserve || []);
  const bySlot = (slot) => members().find((c) => c.slot === slot);

  function renderParty() {
    const party = state.party || [];
    if (selectedSlot == null || !bySlot(selectedSlot)) selectedSlot = party[0] ? party[0].slot : null;
    if (!changed('party', [party, state.reserve, selectedSlot, art, lang()])) return;
    $('cards').innerHTML = party.slice(0, 5).map((c, i) => card(c, i * 102, { sel: c.slot === selectedSlot, cursor: c.slot === selectedSlot })).join('');
    const c = bySlot(selectedSlot);
    if (!c) { $('detail').innerHTML = ''; return; }
    const ci = CLASS_INDEX[c.cls];
    const acc = (c.acc || []).map((a) => (a ? `<span class="win">${esc(a.name || fmt(T.unknownItem, { id: a.id }))}</span>` : `<span class="win free">${T.free}</span>`)).join('');
    $('detail').innerHTML = `
      <div class="row1"><span>${esc(nameOf(c))}</span><span class="k">${T.shadow}</span><span>${ci != null ? esc(T.classes[ci]) + ` · ${T.rank} ${c.rank}` : T.noClass}</span>
        <span class="k">${T.exp}</span><span class="num">${num(c.exp)}</span></div>
      <div class="row1" style="margin-top:10px"><span class="k">${T.accessories}</span></div>
      <div class="acc">${acc || `<span class="free">${T.none}</span>`}</div>`;
  }

  // Sombra ------------------------------------------------------------------
  let shadowSlot = null;
  function renderShadow() {
    const party = members();
    if (shadowSlot == null || !bySlot(shadowSlot)) shadowSlot = party[0] ? party[0].slot : null;
    if (!changed('shadow', [party.map((c) => [c.slot, c.cls, c.classes]), shadowSlot, art, lang()])) return;
    $('shadowFaces').innerHTML = party.slice(0, 5).map((c) => `<button class="win facebtn ${c.slot === shadowSlot ? 'on' : ''}" data-shadow="${c.slot}">
      ${FACE_UV[c.pc] ? `<i class="spr face" style="${crop(ART.face, ...FACE_UV[c.pc])}"></i>` : ''}<span class="nm">${esc(nameOf(c))}</span></button>`).join('');
    const c = bySlot(shadowSlot);
    if (!c) { $('shadowGrid').innerHTML = ''; return; }
    const unlocked = {};
    for (const [i, rank, sp] of c.classes || []) unlocked[i] = { rank, sp };
    const active = CLASS_INDEX[c.cls];
    // The camp menu's order: Sword, White, Black, Guardian, Support, Barrier, Monk, Assassin, Generalist.
    const order = [4, 0, 1, 6, 2, 3, 5, 7, 8];
    $('shadowGrid').innerHTML = order.map((i) => {
      const u = unlocked[i];
      const on = i === active;
      return `<div class="win class ${on ? 'on' : ''} ${u ? '' : 'locked dim'}">
        ${on ? '<i class="cursor"></i><span class="active-tag">' + T.active + '</span>' : ''}
        <i class="spr icon" style="${tile(ART.cls, CLASS_UV[i], 0.25)}"></i>
        <span class="cn">${esc(T.classes[i])}</span>
        <span class="meta">${u ? `<span>${T.rank} <b class="num">${u.rank}</b></span><span>${T.sp} <b class="num">${num(u.sp)}</b></span>` : T.locked}</span>
      </div>`;
    }).join('');
  }

  // Objetos -----------------------------------------------------------------
  function renderBag() {
    const list = state.items || [];
    if (!changed('bag', [list, lang()])) return;
    $('bagCount').textContent = list.length ? String(list.length) : '';
    $('bagGrid').innerHTML = list.length ? list.map((e) =>
      `<div class="win item"><span class="n">${esc(e.name || fmt(T.unknownItem, { id: e.id }))}</span><span class="c num">× ${num(e.count)}</span></div>`).join('')
      : `<div class="empty">${T.emptyBag}</div>`;
  }

  // Mapa: the area map, as the game's own area map screen draws it ---------
  // The whole floor fitted to the window, turned only by the floor's texRot (AreaMap in
  // engine/menus/local_map.cpp), with the leader's arrow and what is left to find on top.
  // The floor and markers are drawn once into a cached layer; an update only redraws the arrow.
  const MAP_W = 704, MAP_H = 548;
  let minimapImg = null;
  let minimapTex = 0;
  let minimapContent = null; // [u0, v0, u1, v1] of the drawn part of the texture
  let baseLayer = null;
  let baseKey = '';
  let lastArrowKey = '';

  function renderMap() {
    const m = state.map || {};
    if (m.tex && m.tex !== minimapTex) {
      minimapTex = m.tex;
      const im = new Image();
      im.onload = () => { minimapImg = im; minimapContent = scanContent(im); baseKey = ''; drawMap(); };
      im.src = 'live/minimap.png?v=' + m.tex;
    }
    $('mapNote').textContent = !m.available ? T.noMap : '';
    drawMap();
    renderLegend(m);
  }

  // The texture outside the flat field its corner carries, like gpu::TextureContent::Scan,
  // so the map fills the window instead of its empty margin. Once per floor.
  function scanContent(im) {
    const w = im.naturalWidth, h = im.naturalHeight;
    const step = Math.max(1, Math.floor(Math.max(w, h) / 256));
    const c = document.createElement('canvas');
    c.width = Math.ceil(w / step); c.height = Math.ceil(h / step);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const r0 = d[0], g0 = d[1], b0 = d[2], a0 = d[3];
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        if (Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0) + Math.abs(d[i + 3] - a0) < 24) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return [0, 0, 1, 1];
    const pad = 0.02;
    return [Math.max(0, x0 / c.width - pad), Math.max(0, y0 / c.height - pad),
      Math.min(1, (x1 + 1) / c.width + pad), Math.min(1, (y1 + 1) / c.height + pad)];
  }

  function renderLegend(m) {
    const markers = (m.available && m.markers) || [];
    if (!changed('legend', [m.available, m.chests, m.points, m.barriers, markers.map((k) => k.k + (k.name || '')), lang()])) return;
    const counts = {};
    for (const k of markers) counts[k.k] = (counts[k.k] || 0) + 1;
    const tally = (label, t) => (t && t[1] ? `<span class="lg tally"><span class="n">${label}</span><span class="num">${t[0]} / ${t[1]}</span></span>` : '');
    let html = tally(T.chests, m.chests) + tally(T.points, m.points) + tally(T.barriers, m.barriers);
    const kinds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    html += kinds.map((k) => `<span class="lg"><span class="dot ${SQUARE[k] ? 'sq' : ''}" style="background:${KIND_COLOR[k] || '#b0b0b0'}"></span>
      <span class="n">${esc(T.kinds[k] || k)}</span><span class="num">${counts[k]}</span></span>`).join('');
    const named = [...new Set(markers.filter((k) => k.name).map((k) => k.name))];
    html += named.map((n) => `<span class="lg"><span class="dot" style="background:${KIND_COLOR.item}"></span><span class="n">${esc(n)}</span></span>`).join('');
    if (m.available && !kinds.length) html += `<span class="lg"><span class="n">${T.allFound}</span></span>`;
    $('legend').innerHTML = html;
  }

  // Where things sit on the map, in map pixels: the floor texture's own pixels when there is
  // one (u = (offset + world) / scale, AreaMap's toScreen), else world units around the
  // markers, so a place without a minimap still shows what is left to find.
  function mapSpace(m) {
    const img = minimapImg && m.scaleX && m.scaleZ ? minimapImg : null;
    if (img) {
      const W = img.naturalWidth, H = img.naturalHeight, c = minimapContent || [0, 0, 1, 1];
      return {
        img, rot: ((m.texRot || 0) * Math.PI) / 180,
        px: (x, z) => [((m.offX + x) / m.scaleX) * W, ((m.offZ + z) / m.scaleZ) * H],
        rect: [c[0] * W, c[1] * H, c[2] * W, c[3] * H]
      };
    }
    const pts = (m.markers || []).map((k) => [k.x, k.z]).concat([[m.x, m.z]]);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, z); y1 = Math.max(y1, z); }
    const pad = Math.max(40, (x1 - x0) * 0.1, (y1 - y0) * 0.1);
    return { img: null, rot: 0, px: (x, z) => [x, z], rect: [x0 - pad, y0 - pad, x1 + pad, y1 + pad] };
  }

  // Map pixels to window pixels: the fitted, zoomed view, turned by rot about its center.
  function mapView(m, sp) {
    const [rx0, ry0, rx1, ry1] = sp.rect;
    const w = rx1 - rx0, h = ry1 - ry0, cos = Math.cos(sp.rot), sin = Math.sin(sp.rot);
    const ac = Math.abs(cos), as = Math.abs(sin);
    const fit = Math.min(MAP_W / (w * ac + h * as), MAP_H / (w * as + h * ac)) * 0.94;
    const s = fit * settings.zoom;
    let cu = (rx0 + rx1) / 2, cv = (ry0 + ry1) / 2;
    if (settings.zoom > 1) {
      // Zoomed in: follow the leader, without running past the edge of the map.
      const [pu, pv] = sp.px(m.x, m.z);
      const hu = MAP_W / s / 2, hv = MAP_H / s / 2;
      if (w / 2 > hu) cu = Math.min(Math.max(pu, rx0 + hu), rx1 - hu);
      if (h / 2 > hv) cv = Math.min(Math.max(pv, ry0 + hv), ry1 - hv);
    }
    const cx = MAP_W / 2, cy = MAP_H / 2;
    return {
      s, cos, sin, cu, cv,
      toScreen: (u, v) => {
        const x = (u - cu) * s, y = (v - cv) * s;
        return [cx + x * cos + y * sin, cy - x * sin + y * cos];
      }
    };
  }

  function drawMap() {
    const canvas = $('minimap');
    const k = scale * (window.devicePixelRatio || 1);
    const DW = Math.max(1, Math.round(MAP_W * k)), DH = Math.max(1, Math.round(MAP_H * k));
    if (canvas.width !== DW || canvas.height !== DH) { canvas.width = DW; canvas.height = DH; baseKey = ''; }
    const g = canvas.getContext('2d');
    const m = state.map || {};
    if (!m.available) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, DW, DH);
      baseKey = ''; lastArrowKey = '';
      return;
    }

    const sp = mapSpace(m);
    const view = mapView(m, sp);
    const key = [minimapTex, !!sp.img, DW, DH, settings.zoom, Math.round(view.cu), Math.round(view.cv), sig.legend, art].join('|');
    if (key !== baseKey) {
      baseKey = key;
      baseLayer = baseLayer || document.createElement('canvas');
      baseLayer.width = DW; baseLayer.height = DH;
      const b = baseLayer.getContext('2d');
      b.setTransform(k, 0, 0, k, 0, 0);
      b.clearRect(0, 0, MAP_W, MAP_H);
      if (sp.img) {
        b.save();
        b.translate(MAP_W / 2, MAP_H / 2);
        b.transform(view.cos, -view.sin, view.sin, view.cos, 0, 0);
        b.scale(view.s, view.s);
        b.translate(-view.cu, -view.cv);
        b.imageSmoothingQuality = 'high';
        b.drawImage(sp.img, 0, 0);
        b.restore();
      }
      for (const mk of m.markers || []) {
        const [u, v] = sp.px(mk.x, mk.z);
        const [x, y] = view.toScreen(u, v);
        if (x < -10 || y < -10 || x > MAP_W + 10 || y > MAP_H + 10) continue;
        b.fillStyle = KIND_COLOR[mk.k] || '#b0b0b0';
        b.strokeStyle = 'rgba(0,0,0,0.85)'; b.lineWidth = 2;
        b.beginPath();
        const h = 8;
        if (SQUARE[mk.k]) { b.moveTo(x, y - h); b.lineTo(x + h, y); b.lineTo(x, y + h); b.lineTo(x - h, y); b.closePath(); }
        else b.arc(x, y, h * 0.75, 0, Math.PI * 2);
        b.fill(); b.stroke();
      }
    }

    // The leader's arrow, as the area map draws it: heading = texRot + yaw - 90 degrees.
    const [pu, pv] = sp.px(m.x, m.z);
    const [ax, ay] = view.toScreen(pu, pv);
    const heading = sp.rot + (m.yaw || 0) - Math.PI / 2;
    const arrowKey = [baseKey, Math.round(ax), Math.round(ay), heading.toFixed(2)].join('|');
    if (arrowKey === lastArrowKey) return;
    lastArrowKey = arrowKey;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, DW, DH);
    g.drawImage(baseLayer, 0, 0);
    g.setTransform(k, 0, 0, k, 0, 0);
    g.save();
    g.translate(ax, ay);
    g.rotate(heading);
    g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 4;
    const arrow = art && image(ART.arrow);
    if (arrow && arrow.complete && arrow.naturalWidth) g.drawImage(arrow, -16, -16, 32, 32);
    else { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(15, 0); g.lineTo(-10, -11); g.lineTo(-10, 11); g.closePath(); g.fill(); }
    g.restore();
  }

  // Combate -----------------------------------------------------------------
  function renderBattle() {
    const b = state.battle || {};
    const foes = b.enemies || [];
    if (!changed('battle', [foes, state.party, art, lang()])) return;
    const seen = {};
    const rows = foes.slice(0, 6).map((e) => {
      seen[e.type] = (seen[e.type] || 0) + 1;
      const label = (e.type >= 10000 ? T.boss : T.enemy) + ' ' + String.fromCharCode(64 + seen[e.type]);
      const pct = e.maxHp > 0 ? Math.max(0, Math.min(100, (100 * e.hp) / e.maxHp)) : 0;
      return `<div class="foe ${e.hp <= 0 ? 'dead' : ''}"><span class="n">${e.acting ? '<i class="cursor"></i>' : ''}${esc(label)}</span>
        <span class="barbg"><i class="${pct < 25 ? 'danger' : ''}" style="width:${pct}%;background-image:url(${url(ART.bar)});background-position:0 ${pct < 25 ? '100%' : '0'}"></i></span>
        <span class="hpv num">${num(e.hp)} / ${num(e.maxHp)}</span></div>`;
    }).join('');
    $('enemies').innerHTML = `<div class="head">${T.enemies} · <span class="num">${foes.filter((e) => e.hp > 0).length}</span></div>${rows}`;
    $('battleCards').innerHTML = (state.party || []).slice(0, 5).map((c, i) => card(c, i * 102, { sel: c.acting, cursor: c.acting })).join('');
  }

  // ---------------------------------------------------------------- interactions
  $('commands').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    haptic(); showView(b.dataset.view);
  });
  $('cards').addEventListener('click', (e) => {
    const b = e.target.closest('[data-slot]');
    if (!b) return;
    haptic(); selectedSlot = Number(b.dataset.slot); renderParty();
  });
  $('shadowFaces').addEventListener('click', (e) => {
    const b = e.target.closest('[data-shadow]');
    if (!b) return;
    haptic(); shadowSlot = Number(b.dataset.shadow); renderShadow();
  });
  const setZoom = (z) => { settings.zoom = Math.max(1, Math.min(6, z)); save(); drawMap(); };
  $('zoomIn').addEventListener('click', () => { haptic(); setZoom(settings.zoom * 1.4); });
  $('zoomOut').addEventListener('click', () => { haptic(); setZoom(settings.zoom / 1.4); });

  $('sleepBtn').addEventListener('click', () => { haptic(); sleeping = true; $('sleep').classList.remove('hidden'); });
  $('sleep').addEventListener('click', () => { haptic(); sleeping = false; $('sleep').classList.add('hidden'); poll(); });

  const opt = { optLang: 'lang', optHaptics: 'haptics', optBattle: 'battleView' };
  $('settingsBtn').addEventListener('click', () => {
    haptic();
    for (const [id, key] of Object.entries(opt)) {
      const el = $(id);
      if (el.type === 'checkbox') el.checked = !!settings[key]; else el.value = settings[key];
    }
    $('artStatus').textContent = art ? T.artOn : T.artOff;
    $('settings').classList.remove('hidden');
  });
  for (const [id, key] of Object.entries(opt)) {
    $(id).addEventListener('change', (e) => {
      settings[key] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      save(); applyI18n(); render();
    });
  }
  $('closeSettings').addEventListener('click', () => { haptic(); $('settings').classList.add('hidden'); });
  $('disableBtn').addEventListener('click', () => { if (bridge && bridge.disable) bridge.disable(); });
  window.addEventListener('resize', () => { fit(); sig = {}; render(); });

  // ---------------------------------------------------------------- sample data (desktop preview)
  const Mock = {
    t: 0,
    next() {
      this.t++;
      const mode = new URLSearchParams(location.search).get('mode') || 'field';
      if (mode === 'title') return { serial: 1, mode: 'title' };
      const step = Math.floor(this.t / 5);
      const wobble = Math.sin(step / 3);
      const mem = (pc, lv, hp, maxHp, mp, maxMp, cls, rank, status, acc, classes, extra) => Object.assign(
        { slot: pc * 10, pc, lv, exp: lv * 1873, hp, maxHp, mp, maxMp, cls, rank, status, acc, classes, leader: pc === 1, acting: false }, extra || {});
      const party = [
        mem(1, 34, Math.round(1480 + 60 * wobble), 1652, 210, 248, 'sword-master', 12, [], [{ id: 1, name: 'Anillo de poder' }, { id: 2, name: 'Brazal' }, null, null], [[4, 12, 340], [0, 3, 40], [6, 5, 120], [7, 2, 0]]),
        mem(2, 33, 1120, 1309, 302, 330, 'black-magic', 14, [], [{ id: 3, name: 'Gema de maná' }, null, null, null], [[1, 14, 980], [4, 4, 60], [3, 2, 10]]),
        mem(3, 33, 980, 1120, 410, 452, 'white-magic', 16, ['poison'], [{ id: 4, name: 'Talismán' }, { id: 5, name: 'Pendiente' }, null, null], [[0, 16, 1200], [2, 6, 210]]),
        mem(4, 32, 210, 1400, 120, 210, 'monk', 9, ['knocked-out'], [null, null, null, null], [[5, 9, 400], [8, 1, 0]]),
        mem(5, 35, 1550, 1702, 280, 300, 'assassin', 11, [], [{ id: 6, name: 'Botas veloces' }, null, null, null, null], [[7, 11, 560], [4, 8, 220], [1, 3, 90]])
      ];
      const out = {
        serial: step, mode, stage: 'dg05_01', location: 'Ruinas del hospital antiguo - 1F', gold: 48210,
        party, reserve: [],
        items: [{ id: 1, name: 'Poción', count: 24 }, { id: 2, name: 'Poción fuerte', count: 9 }, { id: 3, name: 'Éter', count: 17 },
          { id: 4, name: 'Antídoto', count: 6 }, { id: 5, name: 'Colirio', count: 3 }, { id: 6, name: 'Elixir', count: 2 },
          { id: 7, name: 'Pluma de fénix', count: 5 }, { id: 8, name: 'Pan de pasas', count: 11 }],
        map: { available: mode !== 'battle', x: -20 + 30 * wobble, z: 40, yaw: step / 6,
          tex: 1, texW: 1024, texH: 1024, scaleX: 2600, scaleZ: 2600, offX: 1300, offZ: 1300, dispW: 160, dispH: 160,
          texRot: 0, offRot: 0, plyRot: 0,
          chests: [3, 7], points: [11, 24], barriers: [0, 2],
          markers: [
            { k: 'chest', x: 160, z: 80 }, { k: 'chest', x: -120, z: -240 }, { k: 'chest', x: 300, z: -320 }, { k: 'chest', x: 40, z: 300 },
            { k: 'item', x: 200, z: -100, name: 'Poción' }, { k: 'item', x: -200, z: 150, name: 'Éter' }, { k: 'gold', x: 90, z: 40, v: 300 },
            { k: 'medal', x: -50, z: -300 }, { k: 'barrier', x: 220, z: 160 }, { k: 'heal', x: -100, z: 0 }, { k: 'grass', x: 130, z: -40 }] }
      };
      if (mode === 'battle') {
        party[1].acting = step % 4 === 1;
        out.battle = { phase: 1, enemies: [
          { type: 12, hp: Math.max(0, 900 - step * 15), maxHp: 900, acting: false },
          { type: 12, hp: 620, maxHp: 900, acting: step % 4 === 3 },
          { type: 10031, hp: 4200, maxHp: 24000, acting: false }] };
      }
      return out;
    }
  };

  // ---------------------------------------------------------------- boot
  fit();
  applyI18n();
  probeArt();
  poll();
  setInterval(poll, 200);
})();
