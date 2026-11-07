/* re:Blue - dual-screen panel for Blue Dragon (AYN Thor and other dual-screen handhelds),
 * in the look of the game's camp menu, used like a 3DS game's bottom screen: it changes by
 * itself with what the game is doing (title -> logo, field -> camp menu, battle -> battle
 * view with the turn and a hit log, scene -> scene view), and tapping things opens a card.
 *
 * The game samples a JSON snapshot on its own thread (reblue/src/platform/android_companion.cpp)
 * and this page polls it through the BD bridge (DualScreenCompanion.java); BD.pos() gives the
 * leader's position every frame for the map. The art is the game's own: game/<path>.png is a
 * texture of the installed game, decoded on the device, and live/minimap.png the minimap floor
 * the game has loaded. Positions and texture crops come from the game's own layouts
 * (d2anime\L_main_chwind_btn.csv, d2anime\uv.csv).
 *
 * Opened in a desktop browser without the bridge it runs on sample data
 * (?mode=field|battle|event|title). */
(function () {
  'use strict';

  // ---------------------------------------------------------------- text
  // Spanish strings are the game's own where it has them (cmp_str_es, sta_str_es, cmn_str_es).
  const STRINGS = {
    es: {
      cmds: { party: 'Estado', shadow: 'Sombra', bag: 'Objetos', map: 'Mapa', log: 'Diario', battle: 'Combate' },
      items: 'Objetos', settings: 'Ajustes', language: 'Idioma', gold: 'Oro', journal: 'Diario de viaje',
      optPower: 'Ahorro de energía (juego)', powerOff: 'Desactivado', powerAuto: 'Automático', powerMax: 'Máximo (30 fps)',
      perfFps: 'fps', perfCapHot: 'por calor', perfCapLow: 'con batería', perfCapMax: 'modo máximo',
      perfTemp: ['Temperatura normal', 'Templada', 'Caliente', 'Muy caliente', 'Crítica', 'Crítica', 'Crítica'],
      perfBattery: 'Batería', perfCharging: 'cargando',
      optHaptics: 'Vibración al tocar', optBattle: 'Pasar a Combate al empezar una batalla',
      optScene: 'Mostrar la vista de escena durante las escenas',
      optRest: 'Reposo (pantalla negra con reloj) tras un rato sin tocar, fuera de combate',
      optRestMin: 'Minutos hasta el reposo', optBright: 'Brillo del panel',
      optClear: 'Borrar el recorrido del mapa y el diario', clear: 'Borrar', confirmClear: '¿Borrar el recorrido y el diario?',
      disable: 'Apagar panel', close: 'Cerrar', wake: 'Toca para volver',
      waitingBoot: 'Esperando al juego…', waitingTitle: 'Pantalla de título · carga una partida',
      modes: { field: '', battle: 'Combate', menu: 'Menú', event: 'Escena', title: 'Título', loading: 'Cargando…', boot: '' },
      hp: 'PS', mp: 'PM', lv: 'NV', rank: 'RG', sp: 'PH', shadow: 'Clase de sombra', exp: 'EXP',
      accessories: 'Accesorios', free: 'Vacío', none: '—', noClass: 'Sin clase', active: 'EQUIPADA', locked: 'Sin desbloquear',
      emptyBag: 'No tienes objetos.', unknownItem: 'Objeto #{id}', enemy: 'Enemigo', boss: 'Jefe', enemies: 'Enemigos',
      noMap: 'No hay mapa aquí (combate o escena).', allFound: 'No queda nada por encontrar.',
      follow: 'Seguirme', whole: 'Ver todo',
      chests: 'Cofres', points: 'Puntos de búsqueda', barriers: 'Barreras',
      kinds: { item: 'Objeto', gold: 'Oro', heal: 'Curación', damage: 'Trampa', status: 'Estado', medal: 'Medalla',
        lock: 'Cerradura', grass: 'Hierba', param: 'Potenciador', chest: 'Cofre', barrier: 'Barrera', message: 'Mensaje' },
      classes: ['Mago blanco', 'Mago negro', 'Mago de apoyo', 'Magia de barrera', 'Maestro de espada', 'Monje', 'Guardián', 'Asesino', 'Factótum'],
      status: { sleep: 'Sueño', poison: 'Veneno', stink: 'Hedor', stun: 'Aturdido', dizzy: 'Mareo', panic: 'Pánico',
        kelolon: 'Kelolón', paralyze: 'Parálisis', petrify: 'Piedra', 'knocked-out': 'K.O.' },
      names: { 1: 'Shu', 2: 'Yiro', 3: 'Kluke', 4: 'Marumaro', 5: 'Zola' },
      artOn: 'Gráficos del juego cargados desde tu instalación.', artOff: 'Aún no se han podido leer los gráficos del juego.',
      scene: 'Escena', lately: 'Lo último del diario', turnOf: 'Turno de {n}', enemyTurn: 'Turno del enemigo', waitTurn: 'Elige una orden',
      hits: 'Registro del combate', noHits: 'Los golpes aparecerán aquí.', alive: '{n} en pie',
      ev: {
        area: 'Llegas a {p}', battle: 'Combate contra {n} enemigos', boss: '¡Combate contra un jefe!', win: 'Victoria', end: 'Fin del combate',
        level: '{n} sube al nivel {v}', rank: '{n}: {c} sube al rango {v}', unlock: '{n} aprende la clase {c}',
        item: 'Obtienes {i} ×{v}', used: 'Gastas {i} ×{v}', gold: '+{v} de oro', spent: '−{v} de oro',
        chest: 'Cofre abierto ({v})', point: 'Punto de búsqueda ({v})', barrier: 'Barrera rota ({v})', ko: '{n} cae', revive: '{n} se levanta'
      },
      hit: { dmg: '{t} recibe <b class="d">{v}</b>', heal: '{t} recupera <b class="h">{v} PS</b>', ko: '<b class="d">{t} cae</b>',
        mp: '{t} gasta {v} PM', turn: 'Turno de {t}', up: '<b class="h">{t} se levanta</b>' },
      sheetEnemy: 'Tipo {id}', hpLeft: 'Le queda el {v} % de PS.', bossNote: 'Jefe: no se puede huir.',
      sheetItem: 'Tienes ×{v}', onMap: 'Aún hay {v} en este mapa.', posNote: 'Sigue la flecha del mapa: la marca amarilla es el objeto.',
      memberHint: 'Toca una ficha para ver sus accesorios.', count: '{v}',
      emptyJournal: 'Aquí se irá apuntando tu viaje: lugares, combates, niveles, objetos y cofres.'
    },
    en: {
      cmds: { party: 'Status', shadow: 'Shadow', bag: 'Items', map: 'Map', log: 'Journal', battle: 'Battle' },
      items: 'Items', settings: 'Settings', language: 'Language', gold: 'Gold', journal: 'Travel journal',
      optPower: 'Power saving (game)', powerOff: 'Off', powerAuto: 'Auto', powerMax: 'Max (30 fps)',
      perfFps: 'fps', perfCapHot: 'while hot', perfCapLow: 'on battery', perfCapMax: 'max mode',
      perfTemp: ['Temperature normal', 'Warm', 'Hot', 'Very hot', 'Critical', 'Critical', 'Critical'],
      perfBattery: 'Battery', perfCharging: 'charging',
      optHaptics: 'Vibrate on touch', optBattle: 'Switch to Battle when a battle starts',
      optScene: 'Show the scene view during scenes',
      optRest: 'Rest (black screen with a clock) after a while untouched, outside battle',
      optRestMin: 'Minutes until rest', optBright: 'Panel brightness',
      optClear: 'Clear the map trail and the journal', clear: 'Clear', confirmClear: 'Clear the trail and the journal?',
      disable: 'Turn panel off', close: 'Close', wake: 'Tap to return',
      waitingBoot: 'Waiting for the game…', waitingTitle: 'Title screen · load a save',
      modes: { field: '', battle: 'Battle', menu: 'Menu', event: 'Scene', title: 'Title', loading: 'Loading…', boot: '' },
      hp: 'HP', mp: 'MP', lv: 'LV', rank: 'RK', sp: 'SP', shadow: 'Shadow class', exp: 'EXP',
      accessories: 'Accessories', free: 'Empty', none: '—', noClass: 'No class', active: 'EQUIPPED', locked: 'Locked',
      emptyBag: 'You have no items.', unknownItem: 'Item #{id}', enemy: 'Enemy', boss: 'Boss', enemies: 'Enemies',
      noMap: 'No map here (battle or scene).', allFound: 'Nothing left to find.',
      follow: 'Follow me', whole: 'Whole map',
      chests: 'Chests', points: 'Search points', barriers: 'Barriers',
      kinds: { item: 'Item', gold: 'Gold', heal: 'Healing', damage: 'Trap', status: 'Status', medal: 'Medal',
        lock: 'Lock', grass: 'Grass', param: 'Stat boost', chest: 'Chest', barrier: 'Barrier', message: 'Message' },
      classes: ['White Magic', 'Black Magic', 'Support Magic', 'Barrier Magic', 'Sword Master', 'Monk', 'Guardian', 'Assassin', 'Generalist'],
      status: { sleep: 'Sleep', poison: 'Poison', stink: 'Stink', stun: 'Stun', dizzy: 'Dizzy', panic: 'Panic',
        kelolon: 'Kelolon', paralyze: 'Paralysis', petrify: 'Stone', 'knocked-out': 'KO' },
      names: { 1: 'Shu', 2: 'Jiro', 3: 'Kluke', 4: 'Marumaro', 5: 'Zola' },
      artOn: 'Game graphics loaded from your installation.', artOff: 'The game graphics could not be read yet.',
      scene: 'Scene', lately: 'Latest in the journal', turnOf: '{n}\'s turn', enemyTurn: 'Enemy turn', waitTurn: 'Choose a command',
      hits: 'Battle log', noHits: 'Hits will show up here.', alive: '{n} standing',
      ev: {
        area: 'You reach {p}', battle: 'Battle against {n} enemies', boss: 'Boss battle!', win: 'Victory', end: 'Battle over',
        level: '{n} reaches level {v}', rank: '{n}: {c} reaches rank {v}', unlock: '{n} learns the {c} class',
        item: 'You get {i} ×{v}', used: 'You use {i} ×{v}', gold: '+{v} gold', spent: '−{v} gold',
        chest: 'Chest opened ({v})', point: 'Search point ({v})', barrier: 'Barrier broken ({v})', ko: '{n} falls', revive: '{n} gets up'
      },
      hit: { dmg: '{t} takes <b class="d">{v}</b>', heal: '{t} recovers <b class="h">{v} HP</b>', ko: '<b class="d">{t} falls</b>',
        mp: '{t} spends {v} MP', turn: '{t}\'s turn', up: '<b class="h">{t} gets up</b>' },
      sheetEnemy: 'Type {id}', hpLeft: '{v} % of its HP left.', bossNote: 'Boss: you cannot run.',
      sheetItem: 'You have ×{v}', onMap: '{v} more on this map.', posNote: 'Follow the map arrow: the yellow mark is the item.',
      memberHint: 'Tap a card to see its accessories.', count: '{v}',
      emptyJournal: 'Your journey will be noted here: places, battles, levels, items and chests.'
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
  const faceStyle = (pc) => (FACE_UV[pc] ? crop(ART.face, ...FACE_UV[pc]) : '');

  // ---------------------------------------------------------------- settings
  const bridge = window.BD || null;
  const settings = Object.assign({ lang: 'auto', haptics: true, battleView: true, sceneView: true, view: 'party', zoom: 2.2,
    rest: true, restMin: 5, bright: 100 }, JSON.parse(localStorage.getItem('bd-companion2') || '{}'));
  settings.zoom = Math.max(1, Math.min(8, Number(settings.zoom) || 2.2));
  const save = () => localStorage.setItem('bd-companion2', JSON.stringify(settings));
  function lang() {
    if (settings.lang !== 'auto') return settings.lang;
    const l = ((bridge && bridge.language && bridge.language()) || navigator.language || 'es').toLowerCase();
    return l.startsWith('es') ? 'es' : 'en';
  }
  let T = STRINGS[lang()];
  const fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v[k] == null ? '' : v[k]));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (n) => String(Math.max(0, Math.round(Number(n || 0))));
  const $ = (id) => document.getElementById(id);
  const nameOf = (c) => T.names[c.pc] || '#' + c.slot;
  const itemName = (e) => e.name || fmt(T.unknownItem, { id: e.id });
  function haptic() { if (settings.haptics && bridge && bridge.haptic) bridge.haptic(); }

  function applyI18n() {
    T = STRINGS[lang()];
    document.documentElement.lang = lang();
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = T[el.dataset.i18n] || ''; });
    document.querySelector('.txt-gold').textContent = T.gold;
    sig = {};
  }

  // ---------------------------------------------------------------- fit the camp canvas to the screen
  // The Thor's bottom WebView is about 620x540 CSS px: the 900x784 stage is scaled to fit.
  const STAGE_W = 900, STAGE_H = 784;
  let scale = 1;
  function fit() {
    const k = Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H);
    const app = $('app');
    app.style.transform = `translate(${(innerWidth - STAGE_W * k) / 2}px, ${(innerHeight - STAGE_H * k) / 2}px) scale(${k})`;
    document.querySelector('.modal-box').style.transform = `scale(${k})`;
    scale = k;
  }

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
    if (!images[path]) { const im = new Image(); im.src = url(path); images[path] = im; }
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
    if (next.serial !== undefined && next.serial === lastSerial) { restCheck(); return; }
    lastSerial = next.serial;
    const prev = state;
    state = next;
    journalDiff(prev, state);
    battleDiff(prev, state);
    onModeChange();
    render();
  }

  // ---------------------------------------------------------------- context views (3DS style)
  let previousMode = '';
  let viewBeforeAuto = null;
  let autoView = null; // 'battle' or 'scene' while the game puts us there
  function onModeChange() {
    const mode = state.mode || '';
    if (mode === previousMode) return;
    const want = mode === 'battle' && settings.battleView ? 'battle' : mode === 'event' && settings.sceneView ? 'scene' : null;
    if (want && autoView !== want) {
      if (!autoView) viewBeforeAuto = currentView;
      autoView = want;
      currentView = want;
      sig = {};
    } else if (!want && autoView && mode !== 'loading') {
      // Back to where the player was (a loading screen between keeps the auto view).
      currentView = viewBeforeAuto || 'party';
      autoView = null; viewBeforeAuto = null;
      sig = {};
    }
    previousMode = mode;
  }

  let currentView = ['party', 'shadow', 'bag', 'map', 'log'].includes(settings.view) ? settings.view : 'party';
  const hasGame = () => Array.isArray(state.party) && state.party.length > 0 && state.mode !== 'title' && state.mode !== 'boot';

  function showView(view) {
    currentView = view;
    if (view !== 'battle' && view !== 'scene') {
      settings.view = view; save();
      // Picked by hand: the game no longer moves the panel back when the battle or scene ends.
      autoView = null; viewBeforeAuto = null;
    }
    sig = {};
    render();
  }

  function render() {
    let visible = hasGame() ? currentView : 'waiting';
    if (visible === 'battle' && state.mode !== 'battle') visible = currentView = 'party';
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + visible));
    document.body.dataset.mode = state.mode || '';
    renderHeader();
    renderCommands(visible);
    if (visible === 'waiting') $('waitingText').textContent = state.mode === 'title' ? T.waitingTitle : T.waitingBoot;
    if (visible === 'party') renderParty();
    if (visible === 'shadow') renderShadow();
    if (visible === 'bag') renderBag();
    if (visible === 'map') renderMap();
    if (visible === 'log') renderJournal();
    if (visible === 'battle') renderBattle();
    if (visible === 'scene') renderScene();
    restCheck();
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
  function renderCommands(visible) {
    const cmds = ['party', 'shadow', 'bag', 'map', 'log'];
    if (state.mode === 'battle') cmds.push('battle');
    if (!changed('cmds', [cmds, visible, hasGame(), lang()])) return;
    $('commands').classList.toggle('hidden', !hasGame());
    $('commands').innerHTML = cmds.map((c) => `<button class="win cmd ${c === visible ? 'on' : ''} ${c === 'battle' ? 'hot' : ''}" data-view="${c}">
      ${c === visible ? '<i class="cursor"></i>' : ''}${esc(T.cmds[c])}</button>`).join('');
  }

  // Character card (L_main_chwind_btn.csv) --------------------------------
  function card(c, top, opts) {
    const o = opts || {};
    const danger = (v, m) => m > 0 && v / m < 0.25;
    const bw = (v, m) => (m > 0 ? Math.max(0, Math.min(120, Math.round((120 * v) / m))) : 0);
    const ci = CLASS_INDEX[c.cls];
    const st = (c.status || []).filter((s) => STATUS_UV[s]).slice(0, 3);
    return `<button class="win card ${o.sel ? 'on' : ''} ${o.out ? 'out' : ''} ${c.hp <= 0 ? 'down' : ''}" data-slot="${c.slot}" style="top:${top}px">
      ${o.cursor ? '<i class="cursor"></i>' : ''}
      ${FACE_UV[c.pc] ? `<i class="spr face" style="${faceStyle(c.pc)}"></i>` : ''}
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
    if (!c) { $('detail').innerHTML = `<span class="hint">${T.memberHint}</span>`; return; }
    const ci = CLASS_INDEX[c.cls];
    const acc = (c.acc || []).map((a) => (a ? `<span class="win">${esc(itemName(a))}</span>` : `<span class="win free">${T.free}</span>`)).join('');
    const st = (c.status || []).map((s) => T.status[s]).filter(Boolean);
    $('detail').innerHTML = `
      <div class="row1"><span>${esc(nameOf(c))}</span><span class="k">${T.shadow}</span><span>${ci != null ? esc(T.classes[ci]) + ` · ${T.rank} ${c.rank}` : T.noClass}</span>
        <span class="k">${T.exp}</span><span class="num">${num(c.exp)}</span>${st.length ? `<span class="bad">${esc(st.join(' · '))}</span>` : ''}</div>
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
      ${FACE_UV[c.pc] ? `<i class="spr face" style="${faceStyle(c.pc)}"></i>` : ''}<span class="nm">${esc(nameOf(c))}</span></button>`).join('');
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
      `<button class="win item" data-item="${e.id}"><span class="n">${esc(itemName(e))}</span><span class="c num">× ${num(e.count)}</span></button>`).join('')
      : `<div class="empty">${T.emptyBag}</div>`;
  }

  // ---------------------------------------------------------------- map
  // The floor the game's own area map draws (the minimap texture it has loaded), turned by
  // the floor's texRot (AreaMap in engine/menus/local_map.cpp), with what is left to find, the
  // path walked on this stage and the leader's arrow. "Follow me" keeps the leader centred,
  // read every frame from BD.pos() and eased; drag to look around, pinch to zoom.
  const MAP_W = 704, MAP_H = 548;
  let minimapImg = null, minimapTex = 0, minimapContent = null;
  const mapState = { follow: true, free: 1, cu: null, cv: null, stage: '' };

  function renderMap() {
    const m = state.map || {};
    if (m.tex && m.tex !== minimapTex) {
      minimapTex = m.tex;
      const im = new Image();
      im.onload = () => { minimapImg = im; minimapContent = scanContent(im); };
      im.src = 'live/minimap.png?v=' + m.tex;
    }
    if (state.stage !== mapState.stage) { mapState.stage = state.stage; mapState.follow = true; mapState.cu = null; }
    $('mapNote').textContent = !m.available ? T.noMap : '';
    $('mapFollow').classList.toggle('on', mapState.follow);
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
        rect: [c[0] * W, c[1] * H, c[2] * W, c[3] * H],
        unit: W / m.scaleX
      };
    }
    const pts = (m.markers || []).map((k) => [k.x, k.z]).concat([[m.x, m.z]]);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, z); y1 = Math.max(y1, z); }
    const pad = Math.max(40, (x1 - x0) * 0.1, (y1 - y0) * 0.1);
    return { img: null, rot: 0, px: (x, z) => [x, z], rect: [x0 - pad, y0 - pad, x1 + pad, y1 + pad], unit: 1 };
  }

  function fitScale(sp) {
    const [rx0, ry0, rx1, ry1] = sp.rect;
    const w = rx1 - rx0, h = ry1 - ry0, ac = Math.abs(Math.cos(sp.rot)), as = Math.abs(Math.sin(sp.rot));
    return Math.min(MAP_W / (w * ac + h * as), MAP_H / (w * as + h * ac)) * 0.94;
  }

  // The leader, eased each frame: the snapshot only arrives every 200 ms.
  const live = { x: null, z: null, yaw: 0 };
  function readLive() {
    if (bridge && bridge.pos) {
      const s = bridge.pos();
      if (s) { const a = s.split(',').map(Number); if (a.length >= 3 && a.every(isFinite)) return { x: a[0], z: a[1], yaw: a[2] }; }
      return null;
    }
    const m = state.map || {};
    return m.available ? { x: m.x, z: m.z, yaw: m.yaw || 0 } : null;
  }
  function stepLive(p, jump) {
    if (!p) return null;
    if (live.x == null || Math.hypot(p.x - live.x, p.z - live.z) > jump) Object.assign(live, p);
    const k = 0.45;
    live.x += (p.x - live.x) * k; live.z += (p.z - live.z) * k;
    let dy = p.yaw - live.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); live.yaw += dy * k;
    return live;
  }

  // Path walked, per stage, kept on the device.
  const trails = JSON.parse(localStorage.getItem('bd-trails') || '{}');
  let trailDirty = 0;
  function recordTrail(stage, p, step) {
    if (!stage || !p) return;
    const t = trails[stage] || (trails[stage] = []);
    const last = t[t.length - 1];
    if (!last || Math.hypot(last[0] - p.x, last[1] - p.z) > step) {
      t.push([Math.round(p.x * 10) / 10, Math.round(p.z * 10) / 10]);
      if (t.length > 3000) t.splice(0, t.length - 3000);
      if (++trailDirty > 12) saveTrails();
    }
  }
  function saveTrails() {
    trailDirty = 0;
    try { localStorage.setItem('bd-trails', JSON.stringify(trails)); } catch (e) { /* full: keep in memory */ }
  }

  // Only the map view animates. Everywhere else (another tab, the panel asleep
  // or hidden) the loop drops to a slow timer that walks the trail from the
  // 200 ms snapshot and never calls into the game, so the native side can stop
  // sampling and the WebView stops drawing; on the map a frame whose picture
  // would not change is skipped.
  let lastDrawKey = '';
  function mapFrame() {
    const m = state.map || {};
    const onMap = currentView === 'map' && hasGame() && !sleeping && !document.hidden;
    if (!onMap) {
      lastDrawKey = '';
      setTimeout(mapFrame, 250);
      if (m.available && !sleeping && !document.hidden) {
        const sp = mapSpace(m);
        const worldPerPx = 1 / Math.max(1e-6, sp.unit);
        recordTrail(state.stage, stepLive({ x: m.x, z: m.z, yaw: m.yaw || 0 }, worldPerPx * 120), worldPerPx * 6);
      }
      return;
    }
    requestAnimationFrame(mapFrame);
    if (!m.available) { if (lastDrawKey !== 'clear') { clearMap(); lastDrawKey = 'clear'; } return; }
    const sp = mapSpace(m);
    // Snapshot units per map pixel decide what counts as a step and a teleport.
    const worldPerPx = 1 / Math.max(1e-6, sp.unit);
    const p = stepLive(readLive() || { x: m.x, z: m.z, yaw: m.yaw || 0 }, worldPerPx * 120);
    recordTrail(state.stage, p, worldPerPx * 6);
    const key = [lastSerial, state.stage, p.x.toFixed(1), p.z.toFixed(1), p.yaw.toFixed(3), mapState.follow, mapState.free,
      mapState.cu, mapState.cv, settings.zoom, scale, window.devicePixelRatio, sp.img ? sp.img.complete && sp.img.naturalWidth : 0].join('|');
    if (key === lastDrawKey) return;
    lastDrawKey = key;
    drawMap(m, sp, p);
  }

  function clearMap() {
    const canvas = $('minimap');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawMap(m, sp, p) {
    const canvas = $('minimap');
    const k = scale * (window.devicePixelRatio || 1);
    const DW = Math.max(1, Math.round(MAP_W * k)), DH = Math.max(1, Math.round(MAP_H * k));
    if (canvas.width !== DW || canvas.height !== DH) { canvas.width = DW; canvas.height = DH; }
    const g = canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, DW, DH);

    const fit = fitScale(sp);
    const zoom = mapState.follow ? settings.zoom : mapState.free;
    const s = fit * zoom;
    const [pu, pv] = sp.px(p.x, p.z);
    const [rx0, ry0, rx1, ry1] = sp.rect;
    if (mapState.follow) {
      mapState.cu = pu; mapState.cv = pv;
    } else if (mapState.cu == null) {
      mapState.cu = (rx0 + rx1) / 2; mapState.cv = (ry0 + ry1) / 2;
    }
    const cos = Math.cos(sp.rot), sin = Math.sin(sp.rot);
    const toScreen = (u, v) => {
      const x = (u - mapState.cu) * s, y = (v - mapState.cv) * s;
      return [MAP_W / 2 + x * cos + y * sin, MAP_H / 2 - x * sin + y * cos];
    };
    g.setTransform(k, 0, 0, k, 0, 0);
    if (sp.img) {
      g.save();
      g.translate(MAP_W / 2, MAP_H / 2);
      g.transform(cos, -sin, sin, cos, 0, 0);
      g.scale(s, s);
      g.translate(-mapState.cu, -mapState.cv);
      g.imageSmoothingQuality = 'high';
      g.drawImage(sp.img, 0, 0);
      g.restore();
    }
    // walked path: dark edge, light dotted line
    const t = trails[state.stage] || [];
    if (t.length > 1) {
      const jump = (1 / Math.max(1e-6, sp.unit)) * 120;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      t.forEach((q, i) => {
        const [x, y] = toScreen(...sp.px(q[0], q[1]));
        if (!i || Math.hypot(q[0] - t[i - 1][0], q[1] - t[i - 1][1]) > jump) g.moveTo(x, y); else g.lineTo(x, y);
      });
      g.setLineDash([]); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 6; g.stroke();
      g.setLineDash([3, 8]); g.strokeStyle = 'rgba(190,225,255,.95)'; g.lineWidth = 3; g.stroke();
      g.setLineDash([]);
    }
    for (const mk of m.markers || []) {
      const [x, y] = toScreen(...sp.px(mk.x, mk.z));
      if (x < -10 || y < -10 || x > MAP_W + 10 || y > MAP_H + 10) continue;
      g.fillStyle = KIND_COLOR[mk.k] || '#b0b0b0';
      g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 2;
      g.beginPath();
      const h = 8;
      if (SQUARE[mk.k]) { g.moveTo(x, y - h); g.lineTo(x + h, y); g.lineTo(x, y + h); g.lineTo(x - h, y); g.closePath(); }
      else g.arc(x, y, h * 0.75, 0, Math.PI * 2);
      g.fill(); g.stroke();
    }
    // The leader: the face in a ring, with the game's arrow for where they face
    // (heading = texRot + yaw - 90 degrees, as the area map draws it).
    const [ax, ay] = toScreen(pu, pv);
    const heading = sp.rot + (p.yaw || 0) - Math.PI / 2;
    g.save();
    g.translate(ax, ay);
    g.save();
    g.rotate(heading);
    g.translate(26, 0);
    g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 4;
    const arrow = art && image(ART.arrow);
    if (arrow && arrow.complete && arrow.naturalWidth) g.drawImage(arrow, -14, -14, 28, 28);
    else { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(12, 0); g.lineTo(-6, -9); g.lineTo(-6, 9); g.closePath(); g.fill(); }
    g.restore();
    const R = 20;
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 6;
    g.fillStyle = '#e8e8f0'; g.beginPath(); g.arc(0, 0, R + 3, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;
    const lead = (state.party || []).find((c) => c.leader) || (state.party || [])[0];
    const face = art && image(ART.face);
    g.save(); g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#2a2a48'; g.fillRect(-R, -R, R * 2, R * 2);
    const uv = lead && FACE_UV[lead.pc];
    if (uv && face && face.complete && face.naturalWidth) {
      const fw = face.naturalWidth, fh = face.naturalHeight;
      const sx = uv[0] * fw, sy = uv[1] * fh, sw = (uv[2] - uv[0]) * fw, sh = (uv[3] - uv[1]) * fh;
      // The face sits in the upper middle of its cell.
      g.drawImage(face, sx + sw * 0.18, sy + sh * 0.06, sw * 0.64, sh * 0.64, -R * 1.15, -R * 1.15, R * 2.3, R * 2.3);
    } else {
      g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(lead ? nameOf(lead)[0] : '?', 0, 1);
    }
    g.restore();
    g.restore();
  }

  // drag to look around (stops following), pinch to zoom
  (function () {
    const pts = new Map();
    let startDist = 0, startZoom = 1, last = null;
    const canvas = $('minimap');
    canvas.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY];
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        startDist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        startZoom = mapState.follow ? settings.zoom : mapState.free;
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      const m = state.map || {};
      if (!m.available) return;
      const sp = mapSpace(m);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const z = Math.max(1, Math.min(8, startZoom * Math.hypot(a[0] - b[0], a[1] - b[1]) / Math.max(startDist, 1)));
        if (mapState.follow) settings.zoom = z; else mapState.free = z;
      } else if (last) {
        const dx = (e.clientX - last[0]) / scale, dy = (e.clientY - last[1]) / scale;
        if (mapState.follow && Math.hypot(dx, dy) > 4) { mapState.free = settings.zoom; mapState.follow = false; $('mapFollow').classList.remove('on'); }
        if (!mapState.follow && mapState.cu != null) {
          const s = fitScale(sp) * mapState.free, cos = Math.cos(sp.rot), sin = Math.sin(sp.rot);
          // screen delta back to map pixels (inverse of the rotation in drawMap)
          mapState.cu -= (dx * cos - dy * sin) / s;
          mapState.cv -= (dx * sin + dy * cos) / s;
        }
        last = [e.clientX, e.clientY];
      }
    });
    const up = (e) => { pts.delete(e.pointerId); if (!pts.size) { last = null; save(); } };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  })();

  // ---------------------------------------------------------------- journal (Diario de viaje)
  // Built from what changes between snapshots: places, battles, levels, shadow ranks, items,
  // gold and what was found. Kept on the device.
  const JOURNAL_KEY = 'bd-journal';
  let journal = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]');
  let goldAcc = 0, goldTimer = null;
  function note(kind, data) {
    journal.push([Date.now(), kind, data]);
    if (journal.length > 400) journal = journal.slice(-400);
    try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal)); } catch (e) { journal = journal.slice(-100); }
  }
  function flushGold() {
    if (goldAcc) note(goldAcc > 0 ? 'gold' : 'spent', { v: Math.abs(goldAcc) });
    goldAcc = 0; goldTimer = null;
  }
  // Older builds listed characters who had not joined yet, and the journal filled with their
  // class unlocks. Once a session, drop entries about anyone not in the party or the reserve.
  let journalPruned = false;
  function pruneStrangers(b) {
    if (journalPruned || !Array.isArray(b.party) || !b.party.length || !Array.isArray(b.reserve)) return;
    journalPruned = true;
    const met = new Set(b.party.concat(b.reserve).map((c) => c.pc));
    const kept = journal.filter((e) => e[2].pc == null || met.has(e[2].pc));
    if (kept.length === journal.length) return;
    journal = kept;
    try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal)); } catch (e) { /* kept in memory */ }
  }
  function journalDiff(a, b) {
    if (b && b.mode !== 'title' && b.mode !== 'boot') pruneStrangers(b);
    if (!a || !a.mode || !b || !Array.isArray(b.party) || b.mode === 'title' || b.mode === 'boot') return;
    if (!Array.isArray(a.party) || !a.party.length || a.mode === 'title') return; // first snapshot of a session or a load
    if (b.location && b.location !== a.location) note('area', { p: b.location });
    if (b.mode === 'battle' && a.mode !== 'battle') {
      const foes = (b.battle && b.battle.enemies) || [];
      note(foes.some((e) => e.type >= 10000) ? 'boss' : 'battle', { n: foes.length });
    }
    if (a.mode === 'battle' && b.mode !== 'battle') {
      const foes = (a.battle && a.battle.enemies) || [];
      note(foes.length && foes.every((e) => e.hp <= 0) ? 'win' : 'end', {});
    }
    const before = {};
    for (const c of (a.party || []).concat(a.reserve || [])) before[c.slot] = c;
    for (const c of (b.party || []).concat(b.reserve || [])) {
      const o = before[c.slot];
      if (!o) continue;
      if (c.lv > o.lv) note('level', { pc: c.pc, v: c.lv });
      const ranks = {};
      for (const [i, r] of o.classes || []) ranks[i] = r;
      for (const [i, r] of c.classes || []) {
        if (ranks[i] == null) note('unlock', { pc: c.pc, c: i });
        else if (r > ranks[i]) note('rank', { pc: c.pc, c: i, v: r });
      }
      if (b.mode !== 'battle') {
        if (o.hp > 0 && c.hp <= 0) note('ko', { pc: c.pc });
      }
    }
    // Items: by id. The bag refreshes on a slower beat, so only compare full lists.
    if (Array.isArray(a.items) && Array.isArray(b.items) && (a.items.length || b.items.length)) {
      const had = {};
      for (const e of a.items) had[e.id] = e;
      const now = {};
      for (const e of b.items) {
        now[e.id] = e;
        const d = e.count - (had[e.id] ? had[e.id].count : 0);
        if (d > 0) note('item', { i: itemName(e), v: d });
        else if (d < 0 && b.mode !== 'battle') note('used', { i: itemName(e), v: -d });
      }
      if (b.mode !== 'battle') for (const id in had) if (!now[id]) note('used', { i: itemName(had[id]), v: had[id].count });
    }
    if (a.gold != null && b.gold != null && b.gold !== a.gold) {
      goldAcc += b.gold - a.gold;
      clearTimeout(goldTimer); goldTimer = setTimeout(flushGold, 2500);
    }
    const am = a.map || {}, bm = b.map || {};
    if (a.stage === b.stage) {
      const tick = (key, kind) => { if (am[key] && bm[key] && bm[key][0] > am[key][0]) note(kind, { v: bm[key][0] + ' / ' + bm[key][1] }); };
      tick('chests', 'chest'); tick('points', 'point'); tick('barriers', 'barrier');
    }
  }
  function entryHtml(e) {
    const [t, kind, d] = e;
    const who = d.pc != null ? T.names[d.pc] || '?' : '';
    const text = fmt(T.ev[kind] || kind, Object.assign({}, d, { n: kind === 'battle' ? d.n : who || d.n, c: d.c != null ? T.classes[d.c] : '' }));
    const time = new Date(t);
    const hh = time.getHours() + ':' + String(time.getMinutes()).padStart(2, '0');
    const face = d.pc != null && FACE_UV[d.pc] ? `<i class="spr jface" style="${faceStyle(d.pc)}"></i>` : `<i class="jdot k-${kind}"></i>`;
    return `<div class="jline k-${kind}">${face}<span class="jt">${esc(text)}</span><span class="jh num">${hh}</span></div>`;
  }
  function renderJournal() {
    if (!changed('journal', [journal.length, journal.length && journal[journal.length - 1][0], art, lang()])) return;
    $('logCount').textContent = journal.length ? String(journal.length) : '';
    const el = $('journal');
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    let html = '', day = '';
    for (const e of journal) {
      const d = new Date(e[0]).toLocaleDateString(lang() === 'es' ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      if (d !== day) { day = d; html += `<div class="jday">${esc(d)}</div>`; }
      if (e[1] === 'area') html += `<div class="jarea">${esc(e[2].p)}</div>`;
      else html += entryHtml(e);
    }
    el.innerHTML = html || `<div class="empty">${T.emptyJournal || ''}</div>`;
    if (atBottom || !el.dataset.seen) el.scrollTop = el.scrollHeight;
    el.dataset.seen = '1';
  }

  // ---------------------------------------------------------------- battle
  // The hit log is read from what changes: HP going down or up, a member falling, whose turn.
  let hits = [];
  const foeLabels = (foes) => {
    const seen = {};
    return foes.map((e) => {
      seen[e.type] = (seen[e.type] || 0) + 1;
      const many = foes.filter((o) => o.type === e.type).length > 1;
      return (e.type >= 10000 ? T.boss : T.enemy) + (many || e.type < 10000 ? ' ' + String.fromCharCode(64 + seen[e.type]) : '');
    });
  };
  function hit(kind, t, v) { hits.push({ kind, t, v }); if (hits.length > 60) hits = hits.slice(-60); }
  function battleDiff(a, b) {
    if (b.mode !== 'battle') { if (a.mode === 'battle') hits = []; return; }
    if (a.mode !== 'battle') { hits = []; return; }
    const fa = (a.battle && a.battle.enemies) || [], fb = (b.battle && b.battle.enemies) || [];
    const labels = foeLabels(fb);
    fb.forEach((e, i) => {
      const o = fa[i];
      if (!o || o.type !== e.type) return;
      if (e.hp < o.hp) { hit('dmg', labels[i], o.hp - e.hp); if (e.hp <= 0) hit('ko', labels[i]); }
      else if (e.hp > o.hp) hit('heal', labels[i], e.hp - o.hp);
      if (e.acting && !o.acting) hit('turn', labels[i]);
    });
    const pa = {};
    for (const c of a.party || []) pa[c.slot] = c;
    for (const c of b.party || []) {
      const o = pa[c.slot];
      if (!o) continue;
      const n = nameOf(c);
      if (c.acting && !o.acting) hit('turn', n);
      if (c.hp < o.hp) { hit('dmg', n, o.hp - c.hp); if (c.hp <= 0) hit('ko', n); }
      else if (c.hp > o.hp) { hit(o.hp <= 0 ? 'up' : 'heal', n, c.hp - o.hp); }
      if (c.mp < o.mp) hit('mp', n, o.mp - c.mp);
    }
  }

  function renderBattle() {
    const b = state.battle || {};
    const foes = b.enemies || [];
    const labels = foeLabels(foes);
    if (changed('battle-foes', [foes, art, lang()])) {
      const rows = foes.slice(0, 6).map((e, i) => {
        const pct = e.maxHp > 0 ? Math.max(0, Math.min(100, (100 * e.hp) / e.maxHp)) : 0;
        return `<button class="foe ${e.hp <= 0 ? 'dead' : ''} ${e.acting ? 'acting' : ''} ${e.type >= 10000 ? 'boss' : ''}" data-foe="${i}">
          <span class="n">${e.acting ? '<i class="cursor"></i>' : ''}${esc(labels[i])}</span>
          <span class="barbg"><i class="${pct < 25 ? 'danger' : ''}" style="width:${pct}%;background-image:url(${url(ART.bar)});background-position:0 ${pct < 25 ? '100%' : '0'}"></i></span>
          <span class="hpv num">${num(e.hp)} / ${num(e.maxHp)}</span><span class="more">›</span></button>`;
      }).join('');
      $('enemies').innerHTML = `<div class="head">${T.enemies} · <span class="num">${fmt(T.alive, { n: foes.filter((e) => e.hp > 0).length })}</span></div>${rows}`;
    }
    const actor = (state.party || []).find((c) => c.acting);
    const foeActing = foes.findIndex((e) => e.acting);
    if (changed('battle-turn', [actor && actor.slot, foeActing, art, lang()])) {
      $('turn').classList.toggle('enemy', !actor && foeActing >= 0);
      $('turn').innerHTML = actor
        ? `${FACE_UV[actor.pc] ? `<i class="spr tface" style="${faceStyle(actor.pc)}"></i>` : ''}<span class="tt">${esc(fmt(T.turnOf, { n: nameOf(actor) }))}</span><span class="ts">${T.waitTurn}</span>`
        : foeActing >= 0 ? `<span class="tt">${esc(T.enemyTurn)}</span><span class="ts">${esc(labels[foeActing])}</span>`
        : `<span class="tt">${T.cmds.battle}</span>`;
    }
    if (changed('battle-log', [hits.length, hits.length && hits[hits.length - 1], lang()])) {
      $('battleLog').innerHTML = `<div class="sub">${T.hits}</div>` + (hits.length
        ? hits.slice(-4).map((h) => `<div class="ev">${fmt(T.hit[h.kind], { t: esc(h.t), v: num(h.v) })}</div>`).join('')
        : `<div class="ev hint">${T.noHits}</div>`);
    }
    if (changed('battle-cards', [state.party, art, lang()])) {
      $('battleCards').innerHTML = (state.party || []).slice(0, 5).map((c, i) => card(c, i * 102, { sel: c.acting, cursor: c.acting })).join('');
    }
  }

  // ---------------------------------------------------------------- scene
  function renderScene() {
    if (!changed('scene', [state.location, state.stage, state.party && state.party.map((c) => [c.pc, c.hp, c.maxHp, c.lv]), journal.length, art, lang()])) return;
    $('sceneWhere').textContent = state.location || state.stage || 'Blue Dragon';
    const party = state.party || [];
    $('sceneMeta').textContent = party.length ? party.map((c) => `${nameOf(c)} ${T.lv} ${c.lv}`).join(' · ') : '';
    $('sceneFaces').innerHTML = party.slice(0, 5).map((c) => {
      const r = c.maxHp > 0 ? c.hp / c.maxHp : 0;
      return `<div class="win sface">${FACE_UV[c.pc] ? `<i class="spr face" style="${faceStyle(c.pc)}"></i>` : ''}<span class="initial">${esc(nameOf(c)[0])}</span>
        <span class="nm">${esc(nameOf(c))}</span><span class="mini"><i style="width:${Math.max(0, Math.min(1, r)) * 100}%" class="${r < 0.25 ? 'danger' : ''}"></i></span></div>`;
    }).join('');
    $('sceneLog').innerHTML = journal.slice(-5).map((e) => (e[1] === 'area' ? `<div class="jarea">${esc(e[2].p)}</div>` : entryHtml(e))).join('')
      || `<div class="hint">—</div>`;
  }

  // ---------------------------------------------------------------- cards (tap for details)
  function openSheet(html) {
    $('sheetCard').innerHTML = html + `<button class="win btn close" data-close>${T.close}</button>`;
    $('sheet').classList.remove('hidden');
  }
  function foeSheet(i) {
    const foes = (state.battle && state.battle.enemies) || [];
    const e = foes[i];
    if (!e) return;
    const label = foeLabels(foes)[i];
    const pct = e.maxHp > 0 ? Math.round((100 * e.hp) / e.maxHp) : 0;
    const taken = hits.filter((h) => h.t === label && h.kind === 'dmg').reduce((s, h) => s + h.v, 0);
    openSheet(`<div class="sh-title">${esc(label)}</div>
      <div class="sh-sub">${fmt(T.sheetEnemy, { id: e.type })}</div>
      <div class="sh-grid"><div><small>${T.hp}</small><b class="num">${num(e.hp)} / ${num(e.maxHp)}</b></div>
        <div><small>%</small><b class="num">${pct} %</b></div>
        <div><small>${T.hits}</small><b class="num">${num(taken)}</b></div></div>
      <span class="barbg big"><i class="${pct < 25 ? 'danger' : ''}" style="width:${pct}%;background-image:url(${url(ART.bar)});background-position:0 ${pct < 25 ? '100%' : '0'}"></i></span>
      <p>${fmt(T.hpLeft, { v: pct })}${e.type >= 10000 ? ' ' + T.bossNote : ''}</p>`);
  }
  function itemSheet(id) {
    const e = (state.items || []).find((x) => x.id === id);
    if (!e) return;
    const left = (((state.map || {}).markers) || []).filter((k) => k.k === 'item' && k.name === e.name).length;
    const got = journal.filter((j) => j[1] === 'item' && j[2].i === itemName(e)).slice(-3).reverse();
    openSheet(`<div class="sh-title">${esc(itemName(e))}</div>
      <div class="sh-sub">${fmt(T.sheetItem, { v: num(e.count) })}</div>
      ${left ? `<p>${fmt(T.onMap, { v: left })} ${T.posNote}</p>` : ''}
      ${got.length ? got.map(entryHtml).join('') : ''}`);
  }

  // ---------------------------------------------------------------- rest + brightness
  let lastTouch = Date.now();
  function restCheck() {
    const idle = Date.now() - lastTouch > settings.restMin * 60000;
    const on = settings.rest && idle && state.mode !== 'battle' && !sleeping;
    if (on && $('sleep').classList.contains('hidden')) { $('sleep').classList.remove('hidden'); $('sleep').dataset.rest = '1'; }
    if (!$('sleep').classList.contains('hidden')) {
      const d = new Date();
      $('sleepClock').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
    }
  }
  function applyBright() { $('dim').style.opacity = String(1 - settings.bright / 100); }

  // ---------------------------------------------------------------- interactions
  document.addEventListener('pointerdown', () => { lastTouch = Date.now(); }, true);
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
  $('bagGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-item]');
    if (!b) return;
    haptic(); itemSheet(Number(b.dataset.item));
  });
  $('enemies').addEventListener('click', (e) => {
    const b = e.target.closest('[data-foe]');
    if (!b) return;
    haptic(); foeSheet(Number(b.dataset.foe));
  });
  $('sheet').addEventListener('click', (e) => {
    if (e.target.id === 'sheet' || e.target.closest('[data-close]')) { haptic(); $('sheet').classList.add('hidden'); }
  });
  const setZoom = (z) => {
    if (mapState.follow) settings.zoom = Math.max(1, Math.min(8, z)); else mapState.free = Math.max(1, Math.min(8, z));
    save();
  };
  $('zoomIn').addEventListener('click', () => { haptic(); setZoom((mapState.follow ? settings.zoom : mapState.free) * 1.4); });
  $('zoomOut').addEventListener('click', () => { haptic(); setZoom((mapState.follow ? settings.zoom : mapState.free) / 1.4); });
  $('mapFollow').addEventListener('click', () => { haptic(); mapState.follow = true; $('mapFollow').classList.add('on'); });
  $('mapAll').addEventListener('click', () => {
    haptic(); mapState.follow = false; mapState.free = 1; mapState.cu = null; $('mapFollow').classList.remove('on');
  });

  $('sleepBtn').addEventListener('click', () => { haptic(); sleeping = true; $('sleep').classList.remove('hidden'); restCheck(); });
  $('sleep').addEventListener('click', () => {
    haptic(); sleeping = false; lastTouch = Date.now();
    $('sleep').classList.add('hidden'); delete $('sleep').dataset.rest; poll();
  });

  const opt = { optLang: 'lang', optHaptics: 'haptics', optBattle: 'battleView', optScene: 'sceneView', optRest: 'rest',
    optRestMin: 'restMin', optBright: 'bright' };
  function syncOpts() {
    for (const [id, key] of Object.entries(opt)) {
      const el = $(id);
      if (el.type === 'checkbox') el.checked = !!settings[key]; else el.value = settings[key];
    }
    $('optRestOut').textContent = settings.restMin + ' min';
    $('optBrightOut').textContent = settings.bright + ' %';
  }
  // The game's power-saving mode and how the console is doing, live while
  // the settings are open (one bridge call a second, nothing otherwise).
  let perfTimer = 0;
  function readPerf() {
    if (!bridge || !bridge.perf) return null;
    try { return JSON.parse(bridge.perf() || 'null'); } catch (e) { return null; }
  }
  function showPerf() {
    const p = readPerf();
    const el = $('perfStatus');
    if (!p) { el.textContent = ''; $('optPower').disabled = !bridge || !bridge.setPower; return; }
    if (document.activeElement !== $('optPower')) $('optPower').value = String(p.mode);
    const parts = [];
    if (p.fps > 0) {
      let f = p.fps + ' ' + T.perfFps;
      if (p.cap > 0) f += ' (' + (p.mode === 2 ? T.perfCapMax : p.hot ? T.perfCapHot : T.perfCapLow) + ')';
      parts.push(f);
    }
    if (p.thermal >= 0) parts.push(T.perfTemp[Math.min(p.thermal, T.perfTemp.length - 1)]);
    if (p.battery >= 0) {
      let b = T.perfBattery + ' ' + p.battery + ' %';
      if (p.charging) b += ', ' + T.perfCharging;
      if (p.temp > 0) b += ' · ' + p.temp.toFixed(1) + ' °C';
      parts.push(b);
    }
    el.textContent = parts.join(' · ');
  }
  function closeSettings() {
    clearInterval(perfTimer); perfTimer = 0;
    $('settings').classList.add('hidden');
  }
  $('optPower').addEventListener('change', (e) => {
    haptic();
    if (bridge && bridge.setPower) bridge.setPower(Number(e.target.value));
    setTimeout(showPerf, 300);
  });
  $('settingsBtn').addEventListener('click', () => {
    haptic(); syncOpts();
    $('artStatus').textContent = art ? T.artOn : T.artOff;
    $('settings').classList.remove('hidden');
    showPerf();
    clearInterval(perfTimer); perfTimer = setInterval(showPerf, 1000);
  });
  for (const [id, key] of Object.entries(opt)) {
    $(id).addEventListener($(id).type === 'range' ? 'input' : 'change', (e) => {
      const el = e.target;
      settings[key] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
      save(); syncOpts(); applyBright();
      if (key === 'lang') { applyI18n(); render(); }
    });
  }
  $('optClear').addEventListener('click', () => {
    if (!confirm(T.confirmClear)) return;
    for (const k in trails) delete trails[k];
    localStorage.removeItem('bd-trails');
    journal = []; localStorage.removeItem(JOURNAL_KEY);
    sig = {}; render();
  });
  $('closeSettings').addEventListener('click', () => { haptic(); closeSettings(); });
  $('disableBtn').addEventListener('click', () => { if (bridge && bridge.disable) bridge.disable(); });
  window.addEventListener('resize', () => { fit(); sig = {}; render(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveTrails(); });

  // ---------------------------------------------------------------- sample data (desktop preview)
  const Mock = {
    t: 0,
    next() {
      this.t++;
      const mode = new URLSearchParams(location.search).get('mode') || 'field';
      if (mode === 'title') return { serial: 1, mode: 'title' };
      const step = this.t;
      const wobble = Math.sin(step / 15);
      const mem = (pc, lv, hp, maxHp, mp, maxMp, cls, rank, status, acc, classes, extra) => Object.assign(
        { slot: pc * 10, pc, lv, exp: lv * 1873, hp, maxHp, mp, maxMp, cls, rank, status, acc, classes, leader: pc === 1, acting: false }, extra || {});
      const party = [
        mem(1, 34, Math.round(1480 + 60 * wobble), 1652, 210, 248, 'sword-master', 12, [], [{ id: 1, name: 'Anillo de poder' }, { id: 2, name: 'Brazal' }, null, null], [[4, 12, 340], [0, 3, 40], [6, 5, 120], [7, 2, 0]]),
        mem(2, 33, 1120, 1309, 302, 330, 'black-magic', 14, [], [{ id: 3, name: 'Gema de maná' }, null, null, null], [[1, 14, 980], [4, 4, 60], [3, 2, 10]]),
        mem(3, 33, 980, 1120, 410, 452, 'white-magic', 16, ['poison'], [{ id: 4, name: 'Talismán' }, { id: 5, name: 'Pendiente' }, null, null], [[0, 16, 1200], [2, 6, 210]]),
        mem(4, 32, 210, 1400, 120, 210, 'monk', 9, [], [null, null, null, null], [[5, 9, 400], [8, 1, 0]]),
        mem(5, 35, 1550, 1702, 280, 300, 'assassin', 11, [], [{ id: 6, name: 'Botas veloces' }, null, null, null, null], [[7, 11, 560], [4, 8, 220], [1, 3, 90]])
      ];
      const ang = step / 25;
      const out = {
        serial: step, mode, stage: 'dg05_01', location: 'Ruinas del hospital antiguo - 1F', gold: 48210 + (step > 40 ? 300 : 0),
        party, reserve: [],
        items: [{ id: 1, name: 'Poción', count: 24 + (step > 60 ? 1 : 0) }, { id: 2, name: 'Poción fuerte', count: 9 }, { id: 3, name: 'Éter', count: 17 },
          { id: 4, name: 'Antídoto', count: 6 }, { id: 5, name: 'Colirio', count: 3 }, { id: 6, name: 'Elixir', count: 2 },
          { id: 7, name: 'Pluma de fénix', count: 5 }, { id: 8, name: 'Pan de pasas', count: 11 }],
        map: { available: mode === 'field', x: 260 * Math.cos(ang), z: 180 * Math.sin(ang), yaw: -ang + Math.PI,
          tex: 1, texW: 1024, texH: 1024, scaleX: 2600, scaleZ: 2600, offX: 1300, offZ: 1300, dispW: 160, dispH: 160,
          texRot: 0, offRot: 0, plyRot: 0,
          chests: [3, 7], points: [11, 24], barriers: [0, 2],
          markers: [
            { k: 'chest', x: 160, z: 80 }, { k: 'chest', x: -120, z: -240 }, { k: 'chest', x: 300, z: -320 }, { k: 'chest', x: 40, z: 300 },
            { k: 'item', x: 200, z: -100, name: 'Poción' }, { k: 'item', x: -200, z: 150, name: 'Éter' }, { k: 'gold', x: 90, z: 40, v: 300 },
            { k: 'medal', x: -50, z: -300 }, { k: 'barrier', x: 220, z: 160 }, { k: 'heal', x: -100, z: 0 }, { k: 'grass', x: 130, z: -40 }] }
      };
      if (mode === 'battle') {
        const turn = Math.floor(step / 8) % 7;
        party.forEach((c, i) => { c.acting = turn === i; });
        party[3].hp = Math.max(0, 210 - Math.floor(step / 8) * 40);
        out.battle = { phase: 1, enemies: [
          { type: 12, hp: Math.max(0, 900 - Math.floor(step / 8) * 120), maxHp: 900, acting: false },
          { type: 12, hp: 620, maxHp: 900, acting: turn === 5 },
          { type: 10031, hp: Math.max(0, 24000 - Math.floor(step / 8) * 900), maxHp: 24000, acting: turn === 6 }] };
      }
      return out;
    }
  };
  if (!bridge && !localStorage.getItem(JOURNAL_KEY)) {
    // Desktop preview: a few entries to look at.
    const now = Date.now();
    journal = [[now - 600000, 'area', { p: 'Aldea de Talta' }], [now - 500000, 'item', { i: 'Poción', v: 2 }],
      [now - 400000, 'battle', { n: 3 }], [now - 380000, 'win', {}], [now - 370000, 'level', { pc: 1, v: 34 }],
      [now - 360000, 'rank', { pc: 3, c: 0, v: 16 }], [now - 200000, 'area', { p: 'Ruinas del hospital antiguo - 1F' }],
      [now - 150000, 'chest', { v: '3 / 7' }], [now - 140000, 'gold', { v: 300 }]];
  }

  // ---------------------------------------------------------------- boot
  fit();
  applyI18n();
  applyBright();
  probeArt();
  poll();
  setInterval(poll, 200);
  setInterval(restCheck, 15000);
  requestAnimationFrame(mapFrame);
})();
