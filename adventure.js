/* ============================================================
   POKÉMON FIGHTER — STORY ADVENTURE (3D)
   • Multiple story saves with a character creator
   • A huge 1000-unit region: 7 towns, 7 routes, 6 gyms + a stadium
   • Walk into buildings: Pokémon Centers, Marts and gyms are big
     themed rooms
   • Quests in every town, two travelling friends, a 6-badge journey
     and a final 8-trainer tournament
   • PokéMMO-style battles with animations for every move type
   • Draws the character on the website home screen
   Uses the site's coins, Poké Balls and Pokédex (globals from app.js).
============================================================ */
(function () {
  "use strict";
  const KEY = "pf_adv_saves_v3";
  const ART = "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/";
  const ITEMB = "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/";
  const $ = (id) => document.getElementById(id);
  const cap = (s) => String(s || "").replace(/(^|-)([a-z])/g, (m, a, b) => (a ? " " : "") + b.toUpperCase());
  const has = (str, t) => (str || "").split(",").includes(t);
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let runId = 0;
  const wait = (ms) => { const r = runId; return new Promise((res, rej) => setTimeout(() => (r === runId ? res() : rej(new Error("cancel"))), ms)); };
  const later = (fn, ms) => { const r = runId; setTimeout(() => { if (r === runId) fn(); }, ms); };

  /* ---------- real item artwork (PokéAPI item sprites) ---------- */
  const IMG = { pokeball: "poke-ball", great: "great-ball", ultra: "ultra-ball", master: "master-ball", potion: "potion", super: "super-potion", hyper: "hyper-potion", revive: "revive", berry: "oran-berry", candy: "rare-candy", map: "town-map", mail: "air-mail" };
  const itemUrl = (k) => ITEMB + (IMG[k] || k) + ".png";
  const itemImg = (k, s) => '<img class="av-it" src="' + itemUrl(k) + '" width="' + (s || 28) + '" height="' + (s || 28) + '" alt="" onerror="this.style.visibility=\'hidden\'">';
  const ITEMS = { potion: { n: "Potion", heal: 40, p: 80 }, super: { n: "Super Potion", heal: 100, p: 220 }, hyper: { n: "Hyper Potion", heal: 200, p: 480 }, revive: { n: "Revive", p: 600 }, berry: { n: "Oran Berry", heal: 20, p: 30 }, candy: { n: "Rare Candy", p: 2000 } };
  const BALLS = [{ id: "pokeball", n: "Poké Ball", m: 1, p: 150 }, { id: "great", n: "Great Ball", m: 1.5, p: 300 }, { id: "ultra", n: "Ultra Ball", m: 2, p: 600 }, { id: "master", n: "Master Ball", m: 99, p: 0 }];
  const ballCnt = (id) => { try { return getBallCount(id); } catch (e) { return 0; } };
  const totalBalls = () => BALLS.reduce((s, b) => s + ballCnt(b.id), 0);
  const useBallItem = (id) => { try { if (!useBall(id)) return false; saveInventory(); return true; } catch (e) { return false; } };
  const giveBalls = (n, id) => { try { addBalls(id || "pokeball", n); saveInventory(); } catch (e) {} };
  const toast = (o) => { try { showToast(o); } catch (e) {} };
  function addCoins(n) { try { coins = Math.max(0, coins + n); saveStoredNumber(COINS_KEY, coins); updateResourcesUI(); } catch (e) {} }
  const getCoins = () => { try { return coins; } catch (e) { return 0; } };
  function giveGems(n) { try { gems += n; saveStoredNumber(GEMS_KEY, gems); updateResourcesUI(); } catch (e) {} }
  const sfx = (f, d, ty, g) => { try { playTone(f, d, ty || "square", g || 0.08); } catch (e) {} };

  /* ---------- species ---------- */
  const POOL = [
    [25, "Pikachu", "electric", 1], [4, "Charmander", "fire", 1], [7, "Squirtle", "water", 1], [1, "Bulbasaur", "grass", 1],
    [133, "Eevee", "normal", 1], [92, "Gastly", "ghost,poison", 1], [74, "Geodude", "rock,ground", 1], [66, "Machop", "fighting", 1],
    [58, "Growlithe", "fire", 1], [54, "Psyduck", "water", 1], [43, "Oddish", "grass,poison", 1], [81, "Magnemite", "electric,steel", 1],
    [39, "Jigglypuff", "normal,fairy", 1], [41, "Zubat", "poison,flying", 1], [63, "Abra", "psychic", 1], [19, "Rattata", "normal", 1],
    [6, "Charizard", "fire,flying", 2], [9, "Blastoise", "water", 2], [3, "Venusaur", "grass,poison", 2], [94, "Gengar", "ghost,poison", 2],
    [65, "Alakazam", "psychic", 2], [26, "Raichu", "electric", 2], [130, "Gyarados", "water,flying", 2], [448, "Lucario", "fighting,steel", 2],
    [68, "Machamp", "fighting", 2], [59, "Arcanine", "fire", 2], [149, "Dragonite", "dragon,flying", 3], [248, "Tyranitar", "rock,dark", 3],
    [445, "Garchomp", "dragon,ground", 3], [376, "Metagross", "steel,psychic", 3], [143, "Snorlax", "normal", 3],
    [2, "Ivysaur", "grass,poison", 2], [5, "Charmeleon", "fire", 2], [8, "Wartortle", "water", 2], [64, "Kadabra", "psychic", 2], [93, "Haunter", "ghost,poison", 2],
    [75, "Graveler", "rock,ground", 2], [67, "Machoke", "fighting", 2], [42, "Golbat", "poison,flying", 2], [44, "Gloom", "grass,poison", 2], [20, "Raticate", "normal", 1],
    [76, "Golem", "rock,ground", 3], [87, "Dewgong", "water,ice", 2], [131, "Lapras", "water,ice", 3], [124, "Jynx", "ice,psychic", 2], [91, "Cloyster", "water,ice", 2], [78, "Rapidash", "fire", 2],
    [150, "Mewtwo", "psychic", 3],
  ].map(([id, n, t, k]) => ({ id, n, s: n.toLowerCase(), t: t.split(","), k }));
  const SPECIES = {}; POOL.forEach((p) => { SPECIES[p.id] = p; });
  const EVO = { 1: [2, 16], 2: [3, 32], 4: [5, 16], 5: [6, 36], 7: [8, 16], 8: [9, 36], 25: [26, 22], 19: [20, 20], 63: [64, 16], 64: [65, 36], 92: [93, 25], 93: [94, 38], 74: [75, 25], 75: [76, 38], 66: [67, 28], 67: [68, 38], 41: [42, 22], 43: [44, 21], 58: [59, 30] };
  const evoAt = (id, lv) => { while (EVO[id] && lv >= EVO[id][1]) id = EVO[id][0]; return id; };
  const SE = { fire: "grass,ice,bug,steel", water: "fire,ground,rock", grass: "water,ground,rock", electric: "water,flying", ice: "grass,ground,flying,dragon", fighting: "normal,ice,rock,dark,steel", poison: "grass,fairy", ground: "fire,electric,poison,rock,steel", flying: "grass,fighting,bug", psychic: "fighting,poison", bug: "grass,psychic,dark", rock: "fire,ice,flying,bug", ghost: "psychic,ghost", dragon: "dragon", dark: "psychic,ghost", steel: "ice,rock,fairy", fairy: "fighting,dragon,dark" };
  const RES = { fire: "fire,water,rock,dragon", water: "water,grass,dragon", grass: "fire,grass,poison,flying,bug,dragon,steel", electric: "electric,grass,dragon", normal: "rock,steel", fighting: "poison,flying,psychic,bug,fairy", psychic: "psychic,steel", ghost: "dark", dragon: "steel", ice: "fire,water,ice,steel", rock: "fighting,ground,steel", ground: "grass,bug", poison: "poison,ground,rock,ghost", flying: "electric,rock,steel", bug: "fire,fighting,poison,flying,ghost,steel,fairy", steel: "fire,water,electric,steel", dark: "fighting,dark,fairy", fairy: "fire,poison,steel" };
  const IMM = { electric: "ground", normal: "ghost", ghost: "normal", ground: "flying", psychic: "dark", fighting: "ghost", dragon: "fairy" };
  const TC = { fire: 0xf08030, water: 0x4a90d9, grass: 0x58b84a, electric: 0xf5d33b, normal: 0xb8b8a8, psychic: 0xf95587, ghost: 0x705898, dragon: 0x6f35fc, fighting: 0xc03028, poison: 0xa040a0, rock: 0xb8a038, ground: 0xe0c068, flying: 0xa890f0, bug: 0xa8b820, steel: 0xb8b8d0, dark: 0x705848, fairy: 0xee99ac, ice: 0x98d8d8 };
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");
  const eff = (a, d) => { let m = 1; d.t.forEach((t) => { if (has(IMM[a], t)) m = 0; else if (has(SE[a], t)) m *= 2; else if (has(RES[a], t)) m *= 0.5; }); return m; };

  /* ---------- moves (4 tiers per type, unlocked by level) ---------- */
  const TM = {
    normal: [["Tackle", 40, 35], ["Quick Attack", 40, 30], ["Slash", 70, 20], ["Body Slam", 85, 15], ["Hyper Beam", 120, 5]],
    fire: [["Ember", 40, 25], ["Flame Wheel", 60, 25], ["Flamethrower", 90, 15], ["Fire Blast", 110, 5]], water: [["Water Gun", 40, 25], ["Bubble Beam", 65, 20], ["Surf", 90, 15], ["Hydro Pump", 110, 5]],
    grass: [["Vine Whip", 45, 25], ["Razor Leaf", 55, 25], ["Giga Drain", 75, 10], ["Solar Beam", 120, 10]], electric: [["Thunder Shock", 40, 30], ["Spark", 65, 20], ["Thunderbolt", 90, 15], ["Thunder", 110, 10]],
    ice: [["Powder Snow", 40, 25], ["Ice Shard", 45, 30], ["Ice Beam", 90, 10], ["Blizzard", 110, 5]], fighting: [["Karate Chop", 50, 25], ["Low Kick", 60, 20], ["Brick Break", 75, 15], ["Close Combat", 120, 5]],
    poison: [["Poison Sting", 35, 35], ["Acid", 40, 30], ["Sludge Bomb", 90, 10], ["Gunk Shot", 120, 5]], ground: [["Mud Slap", 35, 10], ["Dig", 80, 10], ["Earthquake", 100, 10], ["Earth Power", 90, 10]],
    flying: [["Gust", 40, 35], ["Wing Attack", 60, 35], ["Air Slash", 75, 15], ["Brave Bird", 120, 15]], psychic: [["Confusion", 50, 25], ["Psybeam", 65, 20], ["Psychic", 90, 10], ["Psystrike", 100, 10]],
    bug: [["Bug Bite", 60, 20], ["Twineedle", 50, 20], ["X-Scissor", 80, 15], ["Megahorn", 120, 10]], rock: [["Rock Throw", 50, 15], ["Rock Slide", 75, 10], ["Stone Edge", 100, 5], ["Rock Wrecker", 110, 5]],
    ghost: [["Lick", 30, 30], ["Shadow Punch", 60, 20], ["Shadow Ball", 80, 15], ["Phantom Force", 90, 10]], dragon: [["Dragon Breath", 60, 20], ["Dragon Claw", 80, 15], ["Dragon Pulse", 85, 10], ["Outrage", 120, 10]],
    dark: [["Bite", 60, 25], ["Crunch", 80, 15], ["Dark Pulse", 80, 15], ["Night Slash", 70, 15]], steel: [["Metal Claw", 50, 35], ["Iron Tail", 100, 15], ["Flash Cannon", 80, 10], ["Meteor Mash", 90, 10]],
    fairy: [["Fairy Wind", 40, 30], ["Draining Kiss", 50, 10], ["Dazzling Gleam", 80, 10], ["Moonblast", 95, 15]],
  };
  function movesFor(c) {
    const un = Math.min(3, Math.floor((c.lv - 1) / 13)), pool = [];
    c.t.forEach((ty, i) => { const L = TM[ty]; if (L) for (let k = 0; k <= un - (i ? 1 : 0); k++) if (L[k]) pool.push({ n: L[k][0], t: ty, p: L[k][1], pp: L[k][2] }); });
    const N = TM.normal; pool.push({ n: N[0][0], t: "normal", p: N[0][1], pp: N[0][2] }, { n: N[1][0], t: "normal", p: N[1][1], pp: N[1][2] });
    if (c.lv >= 14) pool.push({ n: N[2][0], t: "normal", p: N[2][1], pp: N[2][2] }); if (c.lv >= 27) pool.push({ n: N[3][0], t: "normal", p: N[3][1], pp: N[3][2] }); if (c.lv >= 45) pool.push({ n: N[4][0], t: "normal", p: N[4][1], pp: N[4][2] });
    pool.sort((a, b) => b.p - a.p); const seen = new Set(), out = [];
    for (const m of pool) { if (seen.has(m.n)) continue; seen.add(m.n); out.push(m); if (out.length >= 4) break; }
    return out;
  }
  const ppOf = (c, m) => (c.pp && c.pp[m.n] != null ? c.pp[m.n] : m.pp);
  function restat(c) { c.max = Math.round(20 + c.lv * 3.4 + c.k * 7); c.atk = 10 + c.lv * 1.6 + c.k * 4; c.def = 10 + c.lv * 1.3 + c.k * 4; c.spd = 8 + c.lv + c.k * 3 + (c.id % 7); }
  const xpNeed = (lv) => 6 + lv * 4;
  function mkL(p, lv) { const c = { id: p.id, n: p.n, s: p.s, t: p.t, k: p.k, lv, xp: 0, cd: 0, pp: {} }; restat(c); c.hp = c.max; return c; }
  const healMon = (c) => { c.hp = c.max; c.pp = {}; };

  /* ---------- character looks ---------- */
  const SKIN = ["#f6d3b3", "#e8b88f", "#c68c63", "#9a6240", "#6b4129"], HAIR = ["#2b1d14", "#6b3e1f", "#d9a441", "#c24a2e", "#3d6bff", "#e0679a"];
  const CLOTH = ["#d9363e", "#3d6bff", "#2f9e5f", "#ffcf45", "#7a5aa8", "#222a44", "#ff8a3d", "#e8eefc"], PANTS = ["#2b3a6b", "#222222", "#5a4a3a", "#3a5a3a", "#7a7a8a", "#6b2a5a"];
  const DEF_LOOK = { g: "b", skin: 0, hairS: 0, hairC: 0, jacket: 0, pants: 0, capOn: true, capC: 7, bag: 3 };
  const hx = (s) => parseInt(s.slice(1), 16);
  function npcLook(seed) { let h = 0; String(seed).split("").forEach((c) => { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); const r = (n) => { h = (h * 1103515245 + 12345) >>> 0; return (h >>> 8) % n; }; return { g: r(2) ? "g" : "b", skin: r(5), hairS: r(4), hairC: r(6), jacket: r(8), pants: r(6), capOn: r(3) === 0, capC: r(8), bag: r(8) }; }

  function drawAvatar(c, look, t, o) {
    o = o || {}; const x = c.getContext("2d"), w = c.width, h = c.height; if (!o.noClear) x.clearRect(0, 0, w, h);
    const L = look || DEF_LOOK, skin = SKIN[L.skin], hair = HAIR[L.hairC], jk = CLOTH[L.jacket], pn = PANTS[L.pants], bg = CLOTH[L.bag], cp = CLOTH[L.capC];
    const s = (o.scale || 1) * h / 460, cx = w / 2, bob = Math.sin(t * 2.2) * 3 * s, fy = h * (o.base || 0.93);
    const rr = (a, b, cw, ch, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + cw, b, a + cw, b + ch, r); x.arcTo(a + cw, b + ch, a, b + ch, r); x.arcTo(a, b + ch, a, b, r); x.arcTo(a, b, a + cw, b, r); x.closePath(); };
    const grad = (c1, c2, y0, y1) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };
    x.fillStyle = "rgba(0,0,0,.35)"; x.beginPath(); x.ellipse(cx, fy, 92 * s, 16 * s, 0, 0, 6.283); x.fill();
    /* back hair / ponytail */
    x.fillStyle = hair; if (L.hairS === 2) { rr(cx - 56 * s, fy - 360 * s + bob, 112 * s, 150 * s, 30 * s); x.fill(); } if (L.hairS === 3) { x.beginPath(); x.ellipse(cx + 54 * s, fy - 300 * s + bob, 20 * s, 44 * s, 0.4, 0, 6.283); x.fill(); }
    /* backpack */
    x.fillStyle = bg; rr(cx - 56 * s, fy - 262 * s + bob, 112 * s, 118 * s, 20 * s); x.fill();
    /* legs + shoes */
    [-1, 1].forEach((k) => { x.fillStyle = grad(pn, "#101420", fy - 140 * s, fy - 12 * s); rr(cx + k * 24 * s - 20 * s, fy - 140 * s, 40 * s, 124 * s, 14 * s); x.fill(); x.fillStyle = "#f2f2f2"; x.beginPath(); x.ellipse(cx + k * 26 * s + k * 4 * s, fy - 8 * s, 28 * s, 14 * s, 0, 0, 6.283); x.fill(); x.fillStyle = "#c93b3b"; x.fillRect(cx + k * 26 * s - 14 * s, fy - 12 * s, 36 * s, 4 * s); });
    if (L.g === "g") { x.fillStyle = grad(pn, "#101420", fy - 160 * s, fy - 80 * s); x.beginPath(); x.moveTo(cx - 64 * s, fy - 140 * s); x.lineTo(cx + 64 * s, fy - 140 * s); x.lineTo(cx + 78 * s, fy - 78 * s); x.lineTo(cx - 78 * s, fy - 78 * s); x.closePath(); x.fill(); }
    /* arms + hands */
    [-1, 1].forEach((k) => { x.fillStyle = grad(jk, "#00000066", fy - 268 * s, fy - 150 * s); rr(cx + k * 78 * s - 16 * s, fy - 268 * s + bob, 32 * s, 124 * s, 16 * s); x.fill(); x.fillStyle = skin; x.beginPath(); x.arc(cx + k * 78 * s, fy - 140 * s + bob, 16 * s, 0, 6.283); x.fill(); });
    /* torso */
    x.fillStyle = grad(jk, "#00000088", fy - 270 * s, fy - 120 * s); rr(cx - 62 * s, fy - 270 * s + bob, 124 * s, 150 * s, 24 * s); x.fill();
    x.fillStyle = "#ffffffcc"; rr(cx - 12 * s, fy - 262 * s + bob, 24 * s, 138 * s, 8 * s); x.fill(); x.strokeStyle = "#00000033"; x.lineWidth = 2 * s; x.beginPath(); x.moveTo(cx, fy - 256 * s + bob); x.lineTo(cx, fy - 128 * s + bob); x.stroke();
    x.fillStyle = "#ffffff55"; x.beginPath(); x.arc(cx - 36 * s, fy - 196 * s + bob, 10 * s, 0, 6.283); x.fill();
    /* neck + head */
    x.fillStyle = skin; rr(cx - 13 * s, fy - 292 * s + bob, 26 * s, 28 * s, 8 * s); x.fill();
    x.beginPath(); x.ellipse(cx, fy - 326 * s + bob, 50 * s, 56 * s, 0, 0, 6.283); x.fill();
    x.fillStyle = "#00000014"; x.beginPath(); x.ellipse(cx + 12 * s, fy - 318 * s + bob, 38 * s, 50 * s, 0, 0, 6.283); x.fill();
    /* face */
    x.fillStyle = "#1a1a24"; [-1, 1].forEach((k) => { x.beginPath(); x.ellipse(cx + k * 18 * s, fy - 322 * s + bob, 6 * s, 9 * s, 0, 0, 6.283); x.fill(); }); x.fillStyle = "#fff"; [-1, 1].forEach((k) => { x.beginPath(); x.arc(cx + k * 18 * s + 2 * s, fy - 326 * s + bob, 2.4 * s, 0, 6.283); x.fill(); });
    x.fillStyle = "rgba(255,120,120,.3)"; [-1, 1].forEach((k) => { x.beginPath(); x.ellipse(cx + k * 30 * s, fy - 304 * s + bob, 8 * s, 5 * s, 0, 0, 6.283); x.fill(); });
    x.strokeStyle = "#7a3a2a"; x.lineWidth = 3 * s; x.beginPath(); x.arc(cx, fy - 306 * s + bob, 11 * s, 0.25, Math.PI - 0.25); x.stroke();
    x.strokeStyle = hair; x.lineWidth = 4 * s; [-1, 1].forEach((k) => { x.beginPath(); x.moveTo(cx + k * 28 * s, fy - 340 * s + bob); x.lineTo(cx + k * 10 * s, fy - 343 * s + bob); x.stroke(); });
    /* hair front */
    x.fillStyle = hair;
    if (!L.capOn) { x.beginPath(); x.ellipse(cx, fy - 352 * s + bob, 52 * s, 30 * s, 0, Math.PI, 6.283); x.fill(); if (L.hairS === 1) for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(cx + i * 22 * s - 12 * s, fy - 360 * s + bob); x.lineTo(cx + i * 22 * s, fy - 396 * s + bob - (i % 2 ? 6 * s : 0)); x.lineTo(cx + i * 22 * s + 12 * s, fy - 360 * s + bob); x.fill(); } if (L.hairS === 2 || L.g === "g") { [-1, 1].forEach((k) => { rr(cx + k * 46 * s - 8 * s, fy - 352 * s + bob, 16 * s, 70 * s, 8 * s); x.fill(); }); } }
    else { x.fillStyle = cp; x.beginPath(); x.ellipse(cx, fy - 356 * s + bob, 53 * s, 36 * s, 0, Math.PI, 6.283); x.fill(); x.fillStyle = "#00000033"; x.fillRect(cx - 53 * s, fy - 358 * s + bob, 106 * s, 4 * s); x.fillStyle = cp; x.beginPath(); x.ellipse(cx + 22 * s, fy - 354 * s + bob, 50 * s, 10 * s, 0, 0, 6.283); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.arc(cx, fy - 372 * s + bob, 8 * s, 0, 6.283); x.fill(); x.fillStyle = "#e53935"; x.beginPath(); x.arc(cx, fy - 372 * s + bob, 8 * s, Math.PI, 6.283); x.fill(); }
  }

  /* ---------- saves ---------- */
  let DB = { active: null, saves: [] };
  function loadDB() { try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.saves) DB = r; } catch (e) {} }
  const saveDB = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} try { window.dispatchEvent(new Event("pf-adv-change")); } catch (e) {} };
  const activeSave = () => DB.saves.find((s) => s.id === DB.active) || DB.saves[0] || null;
  const newStory = () => ({ squad: [], box: [], bag: { potion: 3 }, badges: [], def: [], flags: {}, q: {}, picked: [], visited: [0], spawn: { x: 30, z: 4, sc: "world" }, pos: { x: 30, z: 4 }, friends: null, wins: 0 });

  /* ---------- three.js helpers ---------- */
  let THREE, renderer, scene, camera, fxGroup, camSnap = true;
  const lam = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
  const mesh = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); return o; };
  function canvasTex(w, h, fn) { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); return new THREE.CanvasTexture(c); }
  const TX = {}, EM = {};
  function initTex() {
    TX.glow = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    TX.ring = canvasTex(128, 128, (x) => { x.strokeStyle = "#fff"; x.lineWidth = 8; x.beginPath(); x.arc(64, 64, 52, 0, 6.283); x.stroke(); });
    TX.star = canvasTex(64, 64, (x) => { x.fillStyle = "#fff"; x.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? 9 : 30; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.closePath(); x.fill(); });
    TX.slash = canvasTex(128, 64, (x) => { x.fillStyle = "#fff"; x.beginPath(); x.moveTo(4, 56); x.quadraticCurveTo(64, -10, 124, 8); x.quadraticCurveTo(70, 24, 4, 56); x.fill(); });
    TX.bolt = canvasTex(64, 256, (x) => { x.strokeStyle = "#fff"; x.lineWidth = 9; x.lineJoin = "round"; x.beginPath(); let px = 32, py = 0; x.moveTo(px, py); for (let i = 1; i <= 7; i++) { px = 32 + (Math.random() - 0.5) * 34; py = i * 36; x.lineTo(px, py); } x.stroke(); });
    const mk2 = (t, c) => canvasTex(64, 64, (x) => { x.fillStyle = c; x.font = "900 52px Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(t, 32, 34); });
    TX.bang = mk2("!", "#ffcf45"); TX.ques = mk2("?", "#8fe6ff");
  }
  const emojiTex = (ch) => EM[ch] || (EM[ch] = canvasTex(64, 64, (x) => { x.font = "46px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(ch, 32, 36); }));
  const imgTexCache = {};
  function urlTex(u) { if (imgTexCache[u]) return imgTexCache[u]; const t = new THREE.TextureLoader().setCrossOrigin("anonymous").load(u); imgTexCache[u] = t; return t; }
  function itemSprite(k, s) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: urlTex(itemUrl(k)), transparent: true, alphaTest: 0.05 })); sp.scale.set(s, s, 1); return sp; }
  function labelSprite(text, w, bg, fg) {
    const tx = canvasTex(512, 128, (x) => { x.fillStyle = bg || "rgba(10,20,40,.88)"; x.fillRect(6, 6, 500, 116); x.lineWidth = 6; x.strokeStyle = fg || "#ffcf45"; x.strokeRect(6, 6, 500, 116); x.fillStyle = fg || "#fff"; x.font = "900 54px Rajdhani, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 256, 68); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })); sp.scale.set(w, w / 4, 1); return sp;
  }

  /* ---------- particles (move animations) ---------- */
  const PART = [];
  function emit(o) {
    const m = new THREE.SpriteMaterial({ map: o.tex, color: o.color !== undefined ? o.color : 0xffffff, transparent: true, depthWrite: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: 1 });
    const sp = new THREE.Sprite(m); sp.position.set(o.x, o.y, o.z); fxGroup.add(sp);
    PART.push({ sp, m, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: o.life || 0.6, age: 0, s0: o.s0 || 1, s1: o.s1 === undefined ? o.s0 || 1 : o.s1, grav: o.grav || 0, fade: o.fade !== false, rot: o.rot || 0, ax: o.ax || 1, ay: o.ay || 1, op: o.op || 1 });
  }
  function tickPart(dt) {
    for (let i = PART.length - 1; i >= 0; i--) {
      const p = PART[i]; p.age += dt; const u = p.age / p.life;
      if (u >= 1) { fxGroup.remove(p.sp); p.m.dispose(); PART.splice(i, 1); continue; }
      p.vy -= p.grav * dt; p.sp.position.x += p.vx * dt; p.sp.position.y += p.vy * dt; p.sp.position.z += p.vz * dt;
      const s = p.s0 + (p.s1 - p.s0) * u; p.sp.scale.set(s * p.ax, s * p.ay, 1); p.m.opacity = p.op * (p.fade ? 1 - u * u : 1); if (p.rot) p.m.rotation += p.rot * dt;
    }
  }
  let shakeT = 0, shakeP = 0;
  const shake = (p) => { shakeT = 0.32; shakeP = p || 0.25; };
  function flashScr(col, a) { const f = $("bt-flash"); if (!f) return; f.style.transition = "none"; f.style.background = col; f.style.opacity = String(a || 0.5); void f.offsetWidth; f.style.transition = "opacity .4s"; f.style.opacity = "0"; }
  const FXC = { fire: 0xff7a1a, water: 0x3fa7ff, electric: 0xffe14a, grass: 0x62db65, ice: 0x9fe8ff, fighting: 0xe0685a, poison: 0xb567d6, ground: 0xd9b661, flying: 0xdfeeff, psychic: 0xff6fb0, bug: 0xa9d13f, rock: 0xc9b06a, ghost: 0x8f6bd6, dragon: 0x7f6bf0, dark: 0x5a4a8a, steel: 0xdde6f0, fairy: 0xffa0dc, normal: 0xffffff };
  const FXE = { fire: "🔥", water: "💧", electric: "⚡", grass: "🍃", ice: "❄️", fighting: "👊", poison: "☠️", ground: "🪨", flying: "🌪️", psychic: "🔮", bug: "🐛", rock: "🪨", ghost: "👻", dragon: "🐉", dark: "🌑", steel: "⚙️", fairy: "✨", normal: "💥" };
  const V3 = (x, y, z) => ({ x, y, z });
  async function playFx(type, a, b, strong) {
    const col = FXC[type] || 0xffffff, em = emojiTex(FXE[type] || "💥"), s = strong ? 1.3 : 1;
    const glowAt = (p, n, sp, sz, life, c) => { for (let i = 0; i < n; i++) { const an = Math.random() * 6.283; emit({ tex: TX.glow, x: p.x, y: p.y, z: p.z, vx: Math.cos(an) * sp * Math.random(), vy: (Math.random() * 1.4 - 0.2) * sp * 0.6 + 0.5, vz: Math.sin(an) * sp * Math.random(), life: life || 0.6, s0: sz, s1: 0.1, color: c === undefined ? col : c, add: true }); } };
    const proj = async (n, dur, tex, size, gl, spread, rot) => { for (let i = 0; i < n; i++) { const j = () => (Math.random() - 0.5) * (spread || 0.8); const vx = (b.x - a.x) / dur + j(), vy = (b.y - a.y) / dur + j(), vz = (b.z - a.z) / dur + j() * 0.3; emit({ tex, x: a.x, y: a.y, z: a.z, vx, vy, vz, life: dur, s0: size, s1: size * 1.3, fade: false, rot: rot || 0 }); if (gl) emit({ tex: TX.glow, x: a.x, y: a.y, z: a.z, vx, vy, vz, life: dur, s0: size * 2, s1: size, color: col, add: true }); await wait(50); } await wait(dur * 500); };
    const rings = async (p, n, c) => { for (let i = 0; i < n; i++) { emit({ tex: TX.ring, x: p.x, y: p.y, z: p.z, life: 0.7, s0: 0.5, s1: 4.2, color: c === undefined ? col : c, add: true }); await wait(120); } };
    const pop = (p, sz) => emit({ tex: TX.star, x: p.x, y: p.y, z: p.z, life: 0.45, s0: 0.5, s1: sz, color: col, add: true });
    switch (type) {
      case "fire": await proj(8, 0.45, em, 1.1 * s, true, 1.2); glowAt(b, 18, 5, 1.4, 0.8); for (let i = 0; i < 8; i++) emit({ tex: em, x: b.x + (Math.random() - 0.5) * 1.6, y: b.y - 0.6, z: b.z, vy: 2.5 + Math.random() * 2, life: 0.8, s0: 0.9, s1: 0.2 }); shake(0.3); flashScr("#ff7a1a", 0.35); break;
      case "water": await proj(10, 0.4, em, 0.9 * s, true, 1.4); glowAt(b, 20, 4, 1, 0.7); for (let i = 0; i < 8; i++) emit({ tex: em, x: b.x, y: b.y, z: b.z, vx: (Math.random() - 0.5) * 3, vy: 3 + Math.random() * 2, life: 0.9, s0: 0.6, s1: 0.4, grav: 9 }); shake(0.2); flashScr("#3fa7ff", 0.25); break;
      case "electric": flashScr("#ffe14a", 0.5); for (let i = 0; i < 4; i++) { emit({ tex: TX.bolt, x: b.x + (Math.random() - 0.5) * 1.2, y: b.y + 1.6, z: b.z + 0.3, life: 0.28, s0: 4.2, s1: 4.2, ax: 0.25, ay: 1, color: col, add: true, fade: false }); emit({ tex: TX.glow, x: b.x, y: b.y, z: b.z + 0.4, life: 0.3, s0: 3, s1: 1, color: col, add: true }); await wait(140); } glowAt(b, 16, 6, 0.7, 0.5); shake(0.35); break;
      case "grass": await proj(12, 0.55, em, 0.8 * s, false, 2.2, 4); glowAt(b, 14, 3, 1, 0.7); for (let i = 0; i < 8; i++) emit({ tex: em, x: b.x, y: b.y, z: b.z, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 2, life: 0.9, s0: 0.6, s1: 0.5, grav: 3, rot: 3 }); shake(0.2); break;
      case "ice": await proj(7, 0.4, em, 1 * s, true, 1); glowAt(b, 16, 4, 1, 0.7, 0xcff6ff); for (let i = 0; i < 10; i++) emit({ tex: TX.star, x: b.x, y: b.y, z: b.z, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 4, vz: (Math.random() - 0.5) * 3, life: 0.7, s0: 0.5, s1: 0.1, color: 0xbff4ff, add: true }); flashScr("#bff4ff", 0.35); shake(0.25); break;
      case "fighting": pop(b, 3.4 * s); emit({ tex: em, x: b.x, y: b.y + 0.2, z: b.z + 0.5, life: 0.5, s0: 1.2, s1: 3.2, fade: true }); await rings(b, 2); glowAt(b, 12, 6, 0.9, 0.5); shake(0.5); flashScr("#ffffff", 0.3); break;
      case "poison": await proj(7, 0.5, em, 0.9 * s, true, 1.6); glowAt(b, 20, 3, 1.1, 0.9); for (let i = 0; i < 6; i++) emit({ tex: TX.glow, x: b.x + (Math.random() - 0.5), y: b.y - 0.4, z: b.z, vy: 1.4, life: 1, s0: 0.9, s1: 0.4, color: col, add: true }); shake(0.25); flashScr("#b567d6", 0.25); break;
      case "ground": for (let i = 0; i < 7; i++) emit({ tex: em, x: b.x + (Math.random() - 0.5) * 2.4, y: b.y - 1.2, z: b.z + (Math.random() - 0.5), vy: 5 + Math.random() * 2, life: 0.9, s0: 1, s1: 0.8, grav: 11, rot: 2 }); glowAt(V3(b.x, b.y - 1.4, b.z), 14, 4, 1.3, 0.8, 0xc2a368); await rings(V3(b.x, b.y - 1.4, b.z), 2); shake(0.55); break;
      case "rock": for (let i = 0; i < 6; i++) { emit({ tex: em, x: b.x + (Math.random() - 0.5) * 2.2, y: b.y + 5, z: b.z, vy: -9, life: 0.55, s0: 1.1, s1: 1, fade: false, rot: 3 }); await wait(90); } glowAt(b, 14, 5, 1.2, 0.7, 0xc2a368); shake(0.55); flashScr("#c9b06a", 0.25); break;
      case "flying": for (let i = 0; i < 3; i++) { emit({ tex: TX.slash, x: b.x - 1.4, y: b.y + 0.6 - i * 0.5, z: b.z + 0.6, vx: 7, vy: -2, life: 0.35, s0: 2.6, s1: 3.4, ax: 1.3, ay: 0.7, color: 0xffffff, add: true, rot: i * 0.4 }); await wait(130); } glowAt(b, 12, 5, 0.8, 0.5, 0xdfeeff); shake(0.3); break;
      case "psychic": await rings(b, 3); emit({ tex: em, x: b.x, y: b.y, z: b.z + 0.4, life: 0.9, s0: 0.8, s1: 3.2 }); flashScr("#ff6fb0", 0.35); glowAt(b, 12, 2, 1.4, 0.8); shake(0.15); break;
      case "bug": await proj(12, 0.6, em, 0.55, false, 2.4, 3); glowAt(b, 12, 4, 0.9, 0.6); shake(0.2); break;
      case "ghost": for (let i = 0; i < 10; i++) { const an = (i / 10) * 6.283; emit({ tex: TX.glow, x: b.x + Math.cos(an) * 3, y: b.y + Math.sin(an) * 2, z: b.z, vx: -Math.cos(an) * 6, vy: -Math.sin(an) * 4, life: 0.5, s0: 1.4, s1: 0.4, color: col, add: true }); } emit({ tex: em, x: b.x, y: b.y - 0.5, z: b.z + 0.4, vy: 2, life: 1.1, s0: 1.6, s1: 2.4 }); await wait(520); flashScr("#2a1a4a", 0.55); glowAt(b, 14, 4, 1, 0.6); shake(0.25); break;
      case "dragon": await proj(9, 0.45, em, 1.1 * s, true, 1.2); await rings(b, 2); glowAt(b, 18, 6, 1.3, 0.8, 0x9b7bff); flashScr("#7f6bf0", 0.4); shake(0.5); break;
      case "dark": for (let i = 0; i < 2; i++) { emit({ tex: TX.slash, x: b.x, y: b.y + (i ? -0.4 : 0.4), z: b.z + 0.5, life: 0.4, s0: 3.2, s1: 3.6, ax: 1.2, ay: 1, color: 0x1a0f33, fade: true, rot: i ? 0.9 : -0.9 }); await wait(160); } glowAt(b, 14, 4, 1, 0.6, 0x7a5acc); flashScr("#000000", 0.45); shake(0.4); break;
      case "steel": await proj(6, 0.3, TX.slash, 1.6 * s, true, 0.8); pop(b, 3); await rings(b, 1); glowAt(b, 12, 6, 0.8, 0.5); shake(0.35); flashScr("#dde6f0", 0.3); break;
      case "fairy": for (let i = 0; i < 16; i++) emit({ tex: em, x: b.x + (Math.random() - 0.5) * 2.4, y: b.y - 0.8, z: b.z + 0.3, vy: 1.6 + Math.random() * 2, life: 1, s0: 0.7, s1: 0.2 }); await rings(b, 2); glowAt(b, 16, 3, 1.1, 0.9); flashScr("#ffa0dc", 0.3); shake(0.15); break;
      default: pop(b, 3); await rings(b, 1); glowAt(b, 12, 5, 0.9, 0.5, 0xffffff); shake(0.28);
    }
    await wait(250);
  }

  /* ---------- monsters & trainers (3D sprites / low-poly) ---------- */
  function makeMon(c, s) {
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    const mat = new THREE.SpriteMaterial({ color: TC[c.t[0]] || 0xcccccc, transparent: true, alphaTest: 0.08 });
    const sp = new THREE.Sprite(mat); sp.scale.set(s, s, 1); sp.position.y = s * 0.46; inner.add(sp);
    new THREE.TextureLoader().setCrossOrigin("anonymous").load(ART + c.id + ".png", (tx) => { mat.map = tx; mat.color.set(0xffffff); mat.needsUpdate = true; });
    const sh = mesh(new THREE.CircleGeometry(s * 0.3, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.28, depthWrite: false }), 0, 0.04, 0); sh.rotation.x = -Math.PI / 2; g.add(sh);
    g.userData = { s, inner, sp, mat, key: c.s, pop: 0, flash: 0, lunge: -1, lx: 0, lz: 0, ph: Math.random() * 6, idle: true, sink: false };
    return g;
  }
  const face = (h, right) => { const u = h.userData; u.sp.scale.x = (right ? -1 : 1) * u.s; };
  let T = 0;
  function tickMon(h, dt) {
    const u = h.userData;
    if (u.pop < 1) { u.pop = Math.min(1, u.pop + dt * 3); h.scale.setScalar(0.15 + 0.85 * (1 - Math.pow(1 - u.pop, 3))); }
    if (u.sink) { u.sinkT = (u.sinkT || 0) + dt; h.scale.setScalar(Math.max(0.01, 1 - u.sinkT * 2.2)); u.sp.position.y = u.s * 0.46 - u.sinkT * u.s * 0.4; }
    if (u.flash > 0) { u.flash -= dt; u.mat.color.set(Math.floor(u.flash * 14) % 2 ? 0xffffff : 0xff6a6a); if (u.flash <= 0) u.mat.color.set(0xffffff); }
    if (u.lunge >= 0) { u.lunge += dt * 3.4; const k = u.lunge < 1 ? Math.sin(Math.PI * u.lunge) : 0; u.inner.position.set(u.lx * k * 2.4, 0, u.lz * k * 2.4); if (u.lunge >= 1) u.lunge = -1; }
    if (u.idle && !u.sink) u.sp.position.y = u.s * 0.46 + Math.abs(Math.sin(T * 2.6 + u.ph)) * 0.05 * u.s;
  }
  function makeTrainer(look) {
    const L = look || DEF_LOOK, g = new THREE.Group(), skin = hx(SKIN[L.skin]), hair = hx(HAIR[L.hairC]), jk = hx(CLOTH[L.jacket]), pn = hx(PANTS[L.pants]), bg = hx(CLOTH[L.bag]), cp = hx(CLOTH[L.capC]);
    const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), lam(c), x, y, z), sph = (r, c, x, y, z) => mesh(new THREE.SphereGeometry(r, 14, 10), lam(c), x, y, z);
    const legs = [box(0.2, 0.62, 0.22, pn, -0.14, 0.31, 0), box(0.2, 0.62, 0.22, pn, 0.14, 0.31, 0)]; g.add(legs[0], legs[1], box(0.2, 0.12, 0.28, 0xf2f2f2, -0.14, 0.06, 0.03), box(0.2, 0.12, 0.28, 0xf2f2f2, 0.14, 0.06, 0.03));
    if (L.g === "g") g.add(mesh(new THREE.CylinderGeometry(0.22, 0.4, 0.34, 10), lam(pn), 0, 0.62, 0));
    g.add(box(0.56, 0.74, 0.34, jk, 0, 0.99, 0), sph(0.26, skin, 0, 1.58, 0), box(0.4, 0.5, 0.18, bg, 0, 1, -0.26));
    [-1, 1].forEach((k) => g.add(box(0.15, 0.58, 0.17, jk, k * 0.37, 0.98, 0), sph(0.08, skin, k * 0.37, 0.64, 0)));
    g.add(sph(0.035, 0x111111, -0.09, 1.6, 0.24), sph(0.035, 0x111111, 0.09, 1.6, 0.24));
    const dome = (c) => mesh(new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(c), 0, 1.62, 0);
    if (L.capOn) { g.add(dome(cp), box(0.4, 0.04, 0.3, cp, 0, 1.62, 0.3)); if (L.hairS === 2 || L.g === "g") g.add(box(0.46, 0.4, 0.12, hair, 0, 1.45, -0.2)); }
    else { g.add(dome(hair)); if (L.hairS === 1) for (let i = -1; i <= 1; i++) g.add(mesh(new THREE.ConeGeometry(0.08, 0.3, 5), lam(hair), i * 0.15, 1.95, 0)); if (L.hairS === 2 || L.g === "g") g.add(box(0.5, 0.5, 0.14, hair, 0, 1.45, -0.2)); if (L.hairS === 3) g.add(sph(0.14, hair, 0, 1.62, -0.3)); }
    g.userData.legs = legs; return g;
  }

  /* ---------- scenes, collisions, world ---------- */
  function Grid() { this.m = new Map(); }
  Grid.prototype.add = function (x, z, r) { const k = Math.floor(x / 8) + "," + Math.floor(z / 8); let a = this.m.get(k); if (!a) { a = []; this.m.set(k, a); } a.push([x, z, r]); };
  Grid.prototype.hit = function (x, z) { const cx = Math.floor(x / 8), cz = Math.floor(z / 8); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = this.m.get(cx + i + "," + (cz + j)); if (a) for (const c of a) { const dx = x - c[0], dz = z - c[1], rr = c[2] + 0.4; if (dx * dx + dz * dz < rr * rr) return true; } } return false; };
  let SC = null, WORLD = null; const INTS = {};
  const P = { x: 30, z: 4, rot: Math.PI / 2, moving: false };
  function mkScene(id, bnd, bg, fog) { const g = new THREE.Group(); g.visible = false; scene.add(g); return { id, group: g, col: new Grid(), bnd, inter: [], npcs: [], trainers: [], patches: [], gates: [], doors: [], picks: [], builds: [], bg, fog, exit: null, clouds: [] }; }
  function mkNpc(sc, o) {
    const m = makeTrainer(o.look || npcLook(o.name || o.tag || "npc")); m.position.set(o.x, 0, o.z); m.rotation.y = o.rot || 0; sc.group.add(m); o.mesh = m; o.sc = sc;
    if (o.tag) { const l = labelSprite(o.tag, 4.6, "rgba(10,20,40,.88)", o.tc || "#ffcf45"); l.position.set(0, 3, 0); m.add(l); }
    const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.bang, transparent: true, depthWrite: false })); mk.position.set(0, o.tag ? 3.9 : 2.6, 0); mk.visible = false; m.add(mk); o.mark = mk;
    sc.npcs.push(o); sc.col.add(o.x, o.z, 0.6);
    if (o.talk) sc.inter.push({ ref: o, r: o.ir || 2.7, label: o.label || "Talk", when: o.when, fn: () => { m.rotation.y = Math.atan2(P.x - o.x, P.z - o.z); o.talk(o); } });
    return o;
  }
  function mkTrainer(sc, o) {
    const t = Object.assign({ sight: 0, fm: 1, xpm: 1, reward: 60, intro: ["Our eyes met — that means we battle!"], win: ["You’re strong!"], c: 0 }, o);
    t.talk = t.talk || (() => { if (G.def.includes(t.id)) dialog(lines(t.name, t.done || t.win)); else if (t.gate && !t.gate()) dialog(lines(t.name, t.gateMsg)); else dialog(lines(t.name, t.intro), () => guard(() => trainerBattle(t))); });
    mkNpc(sc, t); sc.trainers.push(t); return t;
  }
  const lines = (n, arr) => arr.map((t) => ({ n, t }));
  function grassTex(rx, rz) {
    const t = canvasTex(256, 256, (x) => { x.fillStyle = "#5fb84f"; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 1800; i++) { x.fillStyle = "hsla(" + (90 + Math.random() * 35) + ",55%," + (32 + Math.random() * 22) + "%,.55)"; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 5 + Math.random() * 4); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz); return t;
  }
  function floorMat(pat, c1, c2, rx, rz) {
    const t = canvasTex(256, 256, (x) => { x.fillStyle = c1; x.fillRect(0, 0, 256, 256); x.fillStyle = c2; x.strokeStyle = c2;
      if (pat === "check") { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) x.fillRect(i * 32, j * 32, 32, 32); }
      else if (pat === "plank") { for (let i = 0; i < 8; i++) { x.fillRect(0, i * 32, 256, 3); x.fillRect((i * 97) % 256, i * 32, 3, 32); } }
      else if (pat === "tile") { x.lineWidth = 6; x.strokeRect(0, 0, 256, 256); x.lineWidth = 2; x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke(); }
      else { for (let i = 0; i < 380; i++) x.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz); return lam(0xffffff, { map: t });
  }

  const TOWNS = [
    { n: "Seedling Town", a: -10, b: 70, c: 30 }, { n: "Stonebrook City", a: 130, b: 200, c: 165, gym: 0 }, { n: "Bluewater City", a: 270, b: 340, c: 305, gym: 1 }, { n: "Voltport City", a: 410, b: 480, c: 445, gym: 2 },
    { n: "Mossveil Town", a: 550, b: 620, c: 585, gym: 3 }, { n: "Emberfall City", a: 690, b: 760, c: 725, gym: 4 }, { n: "Frostpeak City", a: 830, b: 900, c: 865, gym: 5 }, { n: "Champions Stadium", a: 960, b: 1030, c: 995, stadium: true },
  ];
  const ROUTES = [[70, 130], [200, 270], [340, 410], [480, 550], [620, 690], [760, 830], [900, 960]];
  const RT = [{ ids: [19, 133, 43, 41, 25, 39], lv: [3, 6] }, { ids: [74, 66, 54, 63, 81, 58, 92], lv: [8, 12] }, { ids: [93, 75, 64, 67, 42, 44, 59], lv: [14, 18] }, { ids: [43, 44, 2, 20, 133, 41, 75], lv: [20, 24] }, { ids: [58, 59, 74, 75, 5, 66, 67, 78], lv: [26, 30] }, { ids: [42, 93, 64, 81, 87, 124, 91], lv: [32, 36] }, { ids: [93, 64, 67, 76, 59, 26, 131, 130], lv: [38, 42] }];
  const GYMS = [
    { badge: "Stone", ic: "🪨", ty: "rock", leader: "Flint", team: [[74, 13], [74, 14], [75, 16]], pat: ["speck", "#6b6258", "#8a7f72"], wall: 0x7a6e60, acc: 0xb9a37a, reward: 300, line: "Rock-solid defense beats everything!" },
    { badge: "Wave", ic: "💧", ty: "water", leader: "Marina", team: [[54, 19], [8, 21], [130, 23]], pat: ["tile", "#2b6fa8", "#5aa9e0"], wall: 0x2b5f9a, acc: 0x4fb3ff, reward: 500, line: "Let the tide carry you!" },
    { badge: "Spark", ic: "⚡", ty: "electric", leader: "Volt", team: [[81, 25], [25, 26], [26, 29]], pat: ["check", "#2a2a2a", "#d9a400"], wall: 0x3a3a22, acc: 0xffe14a, reward: 800, line: "Bzzzt! Feel the voltage!" },
    { badge: "Leaf", ic: "🍃", ty: "grass", leader: "Fern", team: [[44, 31], [2, 33], [3, 35]], pat: ["speck", "#3f8f3a", "#2f6f2f"], wall: 0x2f6f3a, acc: 0x62db65, reward: 1100, line: "Nature never loses!" },
    { badge: "Ember", ic: "🔥", ty: "fire", leader: "Blaze", team: [[58, 36], [78, 38], [59, 39], [6, 41]], pat: ["tile", "#3a1a1a", "#8a2a10"], wall: 0x5a2014, acc: 0xff7a1a, reward: 1500, line: "Burn bright, trainer!" },
    { badge: "Glacier", ic: "❄️", ty: "ice", leader: "Frost", team: [[87, 42], [124, 43], [91, 44], [131, 46]], pat: ["tile", "#bfe8f5", "#ffffff"], wall: 0x7aaed0, acc: 0x9fe8ff, reward: 2000, line: "Cool heads win the day." },
  ];
  const locName = (x) => { for (const t of TOWNS) if (x >= t.a && x < t.b) return t.n; const r = ROUTES.findIndex(([a, b]) => x >= a && x < b); return r >= 0 ? "Route " + (r + 1) : "Wilderness"; };
  const townIdx = (x) => TOWNS.findIndex((t) => x >= t.a && x < t.b);
  const TNAMES = ["Youngster Joey", "Lass Anna", "Hiker Gus", "Scientist Ivy", "Ace Rex", "Swimmer Kai", "Psychic Mira", "Ace Duo Sol", "Camper Finn", "Picnicker Ruby", "Biker Jet", "Sailor Bo", "Gardener Fern", "Skier Nils", "Pilot Wren", "Fisher Luke", "Hex Maniac Vee", "Blackbelt Ryu", "Cool Trainer Ash", "Beauty Lila", "Rocker Zed", "Ranger Hana", "Hunter Dax", "Nurse Joy Jr.", "Clown Pip", "Artist Mo", "Chef Remy", "Dancer Sol"];

  function building(sc, o) {
    const b = new THREE.Group(), w = o.w, d = o.d || 7, h = o.h || 3.4, rh = o.rh || 2.4;
    b.add(mesh(new THREE.BoxGeometry(w, h, d), lam(o.wall), 0, h / 2, 0), mesh(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), lam(o.trim || 0xffffff), 0, h, 0));
    const rg = new THREE.Group(), rf = mesh(new THREE.ConeGeometry((d / Math.SQRT2) * 1.08, rh, 4), lam(o.roof), 0, h + rh / 2, 0); rf.rotation.y = Math.PI / 4; rg.add(rf); rg.scale.set(w / d, 1, 1); b.add(rg);
    if (!o.nodoor) { b.add(mesh(new THREE.BoxGeometry(1.4, 2, 0.14), lam(0x7a5230), 0, 1, d / 2 + 0.03)); b.add(mesh(new THREE.BoxGeometry(2.6, 0.12, 1.4), lam(0xcfc6a8), 0, 0.06, d / 2 + 0.7)); }
    for (let k = -1; k <= 1; k += 2) if (w > 5) b.add(mesh(new THREE.BoxGeometry(1, 1, 0.14), lam(0x8fd0ff, { emissive: 0x16304a }), k * w * 0.3, h * 0.55, d / 2 + 0.03));
    if (o.text) { const l = labelSprite(o.text, Math.max(5.5, w * 0.9), o.bg, o.tc); l.position.set(0, h + rh + 1.1, d / 2 - 0.5); b.add(l); }
    b.position.set(o.x, 0, o.z); if (o.rot) b.rotation.y = o.rot; sc.group.add(b);
    for (let ox = -w / 2 + 1.4; ox <= w / 2 - 1.2; ox += 2.4) sc.col.add(o.x + ox, o.z, d / 2 - 0.1);
    sc.builds.push({ x: o.x, z: o.z, w, d, col: hex(o.roof) });
    if (o.key) sc.doors.push({ x: o.x, z: o.z + d / 2 + 1.3, r: 2.2, key: o.key, label: o.dl || "Enter" });
  }

  function buildWorld() {
    const sc = (WORLD = mkScene("world", { x0: -6, x1: 1034, z0: -40, z1: 40 }, 0x8fd0ff, [70, 230])); sc.kind = "world"; const g = sc.group;
    let seed = 41; const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const ground = mesh(new THREE.PlaneGeometry(1200, 190), lam(0xffffff, { map: grassTex(240, 38) }), 515, 0, 0); ground.rotation.x = -Math.PI / 2; g.add(ground);
    const path = mesh(new THREE.PlaneGeometry(1060, 5.5), lam(0xcdb98a), 515, 0.025, 0); path.rotation.x = -Math.PI / 2; g.add(path);
    TOWNS.forEach((t, i) => {
      const pl = mesh(new THREE.PlaneGeometry(t.b - t.a, 17), lam(0xdcd2ac), t.c, 0.03, -3.5); pl.rotation.x = -Math.PI / 2; g.add(pl);
      const post = mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), lam(0x7a5230), t.a + 6, 1.2, 5), lb = labelSprite(t.n.toUpperCase(), 9, "rgba(10,20,40,.9)", "#8fe6ff"); lb.position.set(t.a + 6, 3.5, 5); g.add(post, lb);
      const bz = (d) => -6.5 - d / 2, c = t.c;
      if (i === 0) {
        building(sc, { x: c - 20, z: bz(7), w: 7, d: 7, wall: 0xf0e2c0, roof: 0xc4483c, text: "YOUR HOME", key: "home", dl: "Enter your home" });
        building(sc, { x: c - 2, z: bz(9), w: 11, d: 9, h: 4, wall: 0xe8eefc, roof: 0x3d6bb0, text: "PROF. LINDEN’S LAB", key: "lab", dl: "Enter the Lab" });
        building(sc, { x: c + 17, z: bz(7), w: 7, d: 7, wall: 0xf0e2c0, roof: 0x2f8a5a });
      } else {
        const cx = t.stadium ? c - 26 : c - 18, mx = t.stadium ? c + 26 : c - 6;
        building(sc, { x: cx, z: bz(8), w: 8, d: 8, wall: 0xfff0f0, roof: 0xe84a5f, text: "POKÉMON CENTER", key: "center", dl: "Enter Pokémon Center" });
        building(sc, { x: mx, z: bz(8), w: 8, d: 8, wall: 0xe8f2ff, roof: 0x3d6bff, text: "POKÉ MART", key: "mart", dl: "Enter Poké Mart" });
        if (t.stadium) building(sc, { x: c, z: bz(14), w: 26, d: 14, h: 8, rh: 4, wall: 0x5a4f8a, roof: 0x2a2250, text: "CHAMPIONS STADIUM", bg: "#1e1640", tc: "#c9b8ff", key: "stadium", dl: "Enter the Stadium" });
        else { const gm = GYMS[t.gym]; building(sc, { x: c + 12, z: bz(10), w: 13, d: 10, h: 5, rh: 3, wall: gm.wall, roof: gm.acc, text: gm.badge.toUpperCase() + " GYM", bg: "rgba(10,10,20,.92)", tc: hex(gm.acc), key: "gym:" + t.gym, dl: "Enter " + gm.badge + " Gym" }); }
      }
      [[c - 26, 12], [c - 6, 13], [c + 14, 12], [c + 28, 13]].forEach(([x, z], k) => { if (x > t.a + 2 && x < t.b - 2) building(sc, { x, z, w: 6, d: 6, wall: 0xf0e2c0, roof: [0xc4483c, 0x3d6bb0, 0x7a5aa8, 0x2f8a5a][(i + k) % 4], nodoor: true, rot: Math.PI }); });
    });
    /* grass patches + trainers per route */
    const blades = []; let tn = 0;
    ROUTES.forEach(([a, b], ri) => {
      const n = Math.floor((b - a) / 20);
      for (let i = 0; i < n; i++) sc.patches.push({ x: a + (i + 0.5) * ((b - a) / n), z: i % 2 ? 4 : -4, w: (b - a) / n + 2, d: 12, r: ri });
      for (let k = 0; k < 4; k++) {
        const x = a + 12 + k * ((b - a - 20) / 3), up = k % 2 === 0, name = TNAMES[tn++ % TNAMES.length], lv = RT[ri].lv[0] - 2 + k, ids = RT[ri].ids, nt = 2 + (k > 1 ? 1 : 0);
        const team = []; for (let q = 0; q < nt; q++) team.push([rnd(ids), lv + q + Math.floor(r() * 2)]);
        mkTrainer(sc, { id: "t" + ri + "_" + k, name, x, z: up ? -8 : 8, rot: up ? 0 : Math.PI, team, reward: 40 + ri * 45 + k * 15, sight: 10, fm: 1, xpm: 1, win: ["Wow, you’re tough!"], done: ["You beat me fair and square. Good luck!"] });
      }
      for (let k = 0; k < 6; k++) { const x = a + 6 + r() * (b - a - 12), z = (r() < 0.5 ? -1 : 1) * (6 + r() * 12); sc.picks.push({ id: "p" + ri + "_" + k, x, z, kind: ["potion", "potion", "super", "pokeball", "great", "revive", "berry", "candy"][Math.floor(r() * 8) % 8] }); }
    });
    TOWNS.forEach((t, i) => { for (let k = 0; k < 3; k++) sc.picks.push({ id: "b" + i + "_" + k, x: t.a + 8 + k * 9 + r() * 4, z: 9 + r() * 4, kind: "berry" }); });
    sc.patches.forEach((p) => { const pl = mesh(new THREE.PlaneGeometry(p.w, p.d), lam(0x3f8f3a), p.x, 0.04, p.z); pl.rotation.x = -Math.PI / 2; g.add(pl); for (let i = 0; i < 70; i++) blades.push([p.x + (r() - 0.5) * p.w, p.z + (r() - 0.5) * p.d, 0.7 + r() * 0.7]); });
    const dm = new THREE.Object3D(), col = new THREE.Color();
    const bl = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.9, 4), lam(0xffffff), blades.length);
    blades.forEach((b, i) => { dm.rotation.set(0, r() * 6, 0); dm.scale.setScalar(b[2]); dm.position.set(b[0], 0.4 * b[2], b[1]); dm.updateMatrix(); bl.setMatrixAt(i, dm.matrix); col.setHSL(0.3 + r() * 0.06, 0.6, 0.28 + r() * 0.12); bl.setColorAt(i, col); });
    bl.instanceMatrix.needsUpdate = true; if (bl.instanceColor) bl.instanceColor.needsUpdate = true; g.add(bl);
    /* gates */
    const gates = [{ x: 66, msg: "Hold on! It’s not safe on the road without a Pokémon. Go see Prof. Linden at the lab first.", req: () => G.flags.starter }];
    TOWNS.forEach((t, i) => { if (i > 0 && !t.stadium) gates.push({ x: t.b - 2, msg: "The road east is closed until you earn the " + GYMS[t.gym].badge + " Badge from " + GYMS[t.gym].leader + "’s gym.", req: () => G.badges.includes(t.gym) }); });
    gates.push({ x: 952, msg: "Only trainers with all 6 badges may enter Champions Stadium!", req: () => G.badges.length >= 6 });
    gates.forEach((gt) => { const m = new THREE.Group(); for (let z = -8; z <= 8; z += 2.8) m.add(mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), lam(Math.abs(z % 5.6) < 0.2 ? 0x222222 : 0xffd43b), 0, 0.8, z)); m.add(mesh(new THREE.BoxGeometry(0.2, 0.3, 17), lam(0xffffff), 0, 1.3, 0)); const gd = makeTrainer(npcLook("guard" + gt.x)); gd.position.set(0, 0, 3.2); gd.rotation.y = -Math.PI / 2; m.add(gd); m.position.x = gt.x; g.add(m); gt.mesh = m; sc.gates.push(gt); });
    /* trees / rocks / flowers (instanced) */
    const inTown = (x) => TOWNS.some((t) => x > t.a - 3 && x < t.b + 3), NT = 2600;
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.3, 1.5, 6), lam(0x7a5230), NT), lg = new THREE.IcosahedronGeometry(1.25, 0), la = new THREE.InstancedMesh(lg, lam(0xffffff), NT), lb2 = new THREE.InstancedMesh(lg, lam(0xffffff), NT);
    let n = 0;
    for (let i = 0; i < 40000 && n < NT; i++) {
      const x = -6 + r() * 1040, z = (r() - 0.5) * 84; if (Math.abs(z) < (inTown(x) ? 22 : 10) || gates.some((q) => Math.abs(x - q.x) < 3)) continue;
      const s = 0.8 + r() * 0.8; dm.rotation.set(0, 0, 0); dm.scale.setScalar(s); dm.position.set(x, 0.75 * s, z); dm.updateMatrix(); trunk.setMatrixAt(n, dm.matrix);
      dm.rotation.y = r() * 6; dm.position.set(x, 2.2 * s, z); dm.updateMatrix(); la.setMatrixAt(n, dm.matrix); dm.scale.setScalar(0.75 * s); dm.position.set(x + 0.3 * s, 3.1 * s, z + 0.1 * s); dm.updateMatrix(); lb2.setMatrixAt(n, dm.matrix);
      const ti = townIdx(x), hue = ti >= 6 ? 0.5 : ti === 5 ? 0.08 : 0.29 + r() * 0.09; col.setHSL(hue, 0.5, 0.24 + r() * 0.1); la.setColorAt(n, col); lb2.setColorAt(n, col); sc.col.add(x, z, 0.9 * s); n++;
    }
    [trunk, la, lb2].forEach((m) => { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; g.add(m); });
    const NR = 160, rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.8, 0), lam(0x9a9aa8), NR); n = 0;
    for (let i = 0; i < 4000 && n < NR; i++) { const x = -6 + r() * 1040, z = (r() - 0.5) * 78; if (Math.abs(z) < 7) continue; const s = 0.6 + r() * 1.1; dm.rotation.set(0, r() * 6, 0); dm.scale.set(s, s * 0.8, s); dm.position.set(x, 0.4 * s, z); dm.updateMatrix(); rocks.setMatrixAt(n, dm.matrix); sc.col.add(x, z, 0.8 * s); n++; }
    rocks.count = n; rocks.instanceMatrix.needsUpdate = true; g.add(rocks);
    const NF = 1600, fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 5), lam(0xffffff), NF), fc = [0xff6b8b, 0xffd43b, 0xffffff, 0xc77dff, 0xff9e5a];
    for (let i = 0; i < NF; i++) { dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.position.set(-6 + r() * 1040, 0.14, (r() - 0.5) * 80); dm.updateMatrix(); fl.setMatrixAt(i, dm.matrix); col.setHex(fc[i % 5]); fl.setColorAt(i, col); }
    fl.instanceMatrix.needsUpdate = true; if (fl.instanceColor) fl.instanceColor.needsUpdate = true; g.add(fl);
    const mG = new THREE.ConeGeometry(1, 1, 6);
    for (let i = 0; i < 90; i++) { const x = -40 + i * 12.5, h = 22 + r() * 30, w = 16 + r() * 14, o = mesh(mG, lam(0x6f8fb8), x, h / 2, i % 2 ? -82 : 82); o.scale.set(w, h, w); g.add(o); }
    for (let i = 0; i < 22; i++) { const c = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }); for (let k = 0; k < 4; k++) { const b = mesh(new THREE.SphereGeometry(2.4 + r() * 1.8, 10, 8), m, k * 2.6, r(), r() * 1.8); b.scale.y = 0.55; c.add(b); } c.position.set(r() * 1100 - 30, 30 + r() * 10, (r() - 0.5) * 140); g.add(c); sc.clouds.push(c); }
    /* town NPCs (quest givers, locals) */
    placeTownNpcs(sc);
    placePickups(sc);
    return sc;
  }
  function placePickups(sc) {
    sc.picks.forEach((p) => {
      const s = itemSprite(p.kind, 1.1); s.position.set(p.x, 0.8, p.z); sc.group.add(s); p.mesh = s;
      sc.inter.push({ x: p.x, z: p.z, r: 1.8, label: "Pick up item", when: () => !G.picked.includes(p.id), fn: () => pickUp(p) });
    });
  }

  /* ---------- interiors ---------- */
  function buildInterior(key) {
    const [kind, arg] = key.split(":"), I = +arg;
    const dim = { center: [32, 24], mart: [28, 22], gym: [38, 54], lab: [24, 18], home: [20, 16], stadium: [48, 38] }[kind], w = dim[0], d = dim[1];
    const sc = mkScene(key, { x0: -w / 2 + 1.2, x1: w / 2 - 1.2, z0: -d / 2 + 1.6, z1: d / 2 - 0.8 }, 0x0d1424, [40, 110]); sc.kind = kind; sc.w = w; sc.d = d; sc.exit = { x: 0, z: d / 2 - 1 };
    const g = sc.group, gt = kind === "gym" ? GYMS[I] : null;
    const th = gt ? { pat: gt.pat, wall: gt.wall, acc: gt.acc } : { center: { pat: ["check", "#fbeef0", "#f4b7c5"], wall: 0xf6d8de, acc: 0xe84a5f }, mart: { pat: ["plank", "#c99b66", "#a87a48"], wall: 0x8fb4e8, acc: 0x3d6bff }, lab: { pat: ["tile", "#e8eef8", "#b9c6dd"], wall: 0xc9d6ee, acc: 0x3d6bb0 }, home: { pat: ["plank", "#c99b66", "#a87a48"], wall: 0xeadcb9, acc: 0xc4483c }, stadium: { pat: ["tile", "#2f3452", "#555d90"], wall: 0x3a3060, acc: 0x8a6aff } }[kind];
    const fl = mesh(new THREE.PlaneGeometry(w, d), floorMat(th.pat[0], th.pat[1], th.pat[2], w / 8, d / 8), 0, 0, 0); fl.rotation.x = -Math.PI / 2; g.add(fl);
    g.add(mesh(new THREE.BoxGeometry(w + 2, 7, 1), lam(th.wall), 0, 3.5, -d / 2 - 0.5), mesh(new THREE.BoxGeometry(1, 7, d + 1), lam(th.wall), -w / 2 - 0.5, 3.5, 0), mesh(new THREE.BoxGeometry(1, 7, d + 1), lam(th.wall), w / 2 + 0.5, 3.5, 0));
    g.add(mesh(new THREE.BoxGeometry(w, 0.5, 0.3), lam(th.acc), 0, 1.2, -d / 2 + 0.1)); const mat = mesh(new THREE.PlaneGeometry(4, 1.6), lam(0x8a2a2a), 0, 0.03, d / 2 - 0.8); mat.rotation.x = -Math.PI / 2; g.add(mat);
    const ex = labelSprite("EXIT ▼", 3, "rgba(10,20,40,.85)", "#ffcf45"); ex.position.set(0, 0.9, d / 2 - 0.2); g.add(ex);
    const prop = (geo, c, x, y, z, rc, o) => { const m = mesh(geo, lam(c, o), x, y, z); g.add(m); if (rc) sc.col.add(x, z, rc); return m; };
    const bx = (bw, bh, bd, c, x, z, noCol) => { const m = prop(new THREE.BoxGeometry(bw, bh, bd), c, x, bh / 2, z); if (!noCol) for (let ox = -bw / 2 + 0.6; ox <= bw / 2 - 0.4; ox += 1.2) sc.col.add(x + ox, z, bd / 2 + 0.1); return m; };
    const plant = (x, z) => { prop(new THREE.CylinderGeometry(0.5, 0.4, 0.8, 8), 0xc4483c, x, 0.4, z, 0.7); prop(new THREE.SphereGeometry(0.8, 10, 8), 0x2f8a3a, x, 1.4, z); };
    const title = (txt, ww, fg) => { const l = labelSprite(txt, ww, "rgba(10,10,20,.92)", fg || hex(th.acc)); l.position.set(0, 4.6, -d / 2 + 0.6); g.add(l); };
    if (kind === "center") {
      bx(14, 1.3, 2.6, 0xffffff, 0, -d / 2 + 5, false); bx(14.4, 0.2, 3, 0xf3a6b8, 0, -d / 2 + 5, true).position.y = 1.4;
      const mach = bx(3.4, 0.9, 1.6, 0xe8e8f0, -4.2, -d / 2 + 5, true); mach.position.y = 1.75; for (let i = 0; i < 6; i++) { const s = itemSprite("pokeball", 0.7); s.position.set(-5.4 + (i % 3) * 1.2, 2.7 + Math.floor(i / 3) * 0.7, -d / 2 + 5); g.add(s); }
      title("POKÉMON CENTER", 12); bx(1.8, 2.4, 1.2, 0x3d6bff, w / 2 - 3.5, -d / 2 + 2.2); const scr = mesh(new THREE.PlaneGeometry(1.3, 0.9), new THREE.MeshBasicMaterial({ color: 0x8fe6ff }), w / 2 - 3.5, 1.7, -d / 2 + 2.85); g.add(scr);
      bx(6.5, 0.9, 1.8, 0xc4483c, -w / 2 + 4.5, 2); bx(6.5, 0.9, 1.8, 0xc4483c, -w / 2 + 4.5, 5); plant(-w / 2 + 2, -d / 2 + 3); plant(w / 2 - 2, 4);
      const dc = mesh(new THREE.CircleGeometry(3.4, 40), lam(0xd9363e), 0, 0.03, 5.5); dc.rotation.x = -Math.PI / 2; g.add(dc); const dw = mesh(new THREE.CircleGeometry(3.4, 40, Math.PI, Math.PI), lam(0xffffff), 0, 0.035, 5.5); dw.rotation.x = -Math.PI / 2; g.add(dw); const db = mesh(new THREE.CircleGeometry(0.9, 24), lam(0x222222), 0, 0.04, 5.5); db.rotation.x = -Math.PI / 2; g.add(db);
      mkNpc(sc, { name: "Nurse", tag: "NURSE", x: 0, z: -d / 2 + 2.8, rot: 0, look: { g: "g", skin: 0, hairS: 2, hairC: 5, jacket: 7, pants: 4, capOn: true, capC: 7, bag: 0 }, ir: 3.6, talk: nurseTalk });
      sc.inter.push({ x: w / 2 - 3.5, z: -d / 2 + 3.8, r: 2.6, label: "Use PC", fn: pcMenu });
      mkNpc(sc, { name: "Visitor", x: -w / 2 + 4.5, z: 3.5, rot: 1.2, talk: () => dialog(lines("Visitor", ["Resting here is the best part of the journey. The nurse heals Pokémon for free!"])) });
    } else if (kind === "mart") {
      title("POKÉ MART", 10); bx(11, 1.3, 2.6, 0x3d6bff, 0, -d / 2 + 5); bx(11.4, 0.2, 3, 0xe8f2ff, 0, -d / 2 + 5, true).position.y = 1.4;
      [-1, 1].forEach((k) => { for (let z = -d / 2 + 8; z < d / 2 - 4; z += 6) { bx(2.4, 3, 4.6, 0xb98b58, k * (w / 2 - 3), z); for (let y = 0; y < 3; y++) { const it = itemSprite(["potion", "pokeball", "super", "great", "revive", "berry"][(y + Math.floor(z)) % 6 < 0 ? 0 : (y + Math.floor(z) + 60) % 6], 0.9); it.position.set(k * (w / 2 - 3) - k * 1.4, 1 + y * 0.9, z); g.add(it); } } });
      [-5, 5].forEach((x, i) => { const s = itemSprite(i ? "great" : "potion", 1.3); s.position.set(x, 2.8, -d / 2 + 5); g.add(s); });
      mkNpc(sc, { name: "Clerk", tag: "CLERK", x: 0, z: -d / 2 + 2.8, rot: 0, look: { g: "b", skin: 1, hairS: 0, hairC: 1, jacket: 1, pants: 1, capOn: true, capC: 1, bag: 1 }, ir: 3.6, talk: () => martMenu() });
      mkNpc(sc, { name: "Shopper", x: -5, z: 3, rot: 0.6, talk: () => dialog(lines("Shopper", ["Potions are great for long routes. Stock up before the next gym!"])) });
    } else if (kind === "lab") {
      title("PROF. LINDEN’S LAB", 12); bx(8.4, 1, 2.6, 0xcdb98a, 0, -d / 2 + 7); for (let i = -1; i <= 1; i += 2) { bx(2.6, 3.4, 5, 0x6b4a2a, i * (w / 2 - 3), -d / 2 + 3.5); bx(4, 1.1, 2, 0x8a95b0, i * 6, 2); }
      [[1, -2.6], [4, 0], [7, 2.6]].forEach(([id, ox]) => { const s = itemSprite("pokeball", 1.2); s.position.set(ox, 1.9, -d / 2 + 7); g.add(s); const l = labelSprite(SPECIES[id].n, 3, "rgba(10,20,40,.9)", "#fff"); l.position.set(ox, 3.1, -d / 2 + 7); g.add(l); sc["st" + id] = s; sc.inter.push({ x: ox, z: -d / 2 + 7, r: 1.9, label: "Take " + SPECIES[id].n, when: () => G.flags.intro && !G.flags.starter, fn: () => chooseStarter(id) }); });
      mkNpc(sc, { name: "Prof. Linden", tag: "PROF. LINDEN", x: 0, z: -d / 2 + 3.4, rot: 0, look: { g: "b", skin: 0, hairS: 0, hairC: 4, jacket: 7, pants: 4, capOn: false, capC: 7, bag: 5 }, ir: 3.4, talk: profTalk });
    } else if (kind === "home") {
      bx(3.2, 0.9, 5.4, 0xc4483c, -w / 2 + 3, -d / 2 + 4); bx(4, 1.1, 2.4, 0x8a5a2a, 3, -d / 2 + 3); bx(2.4, 2.4, 0.6, 0x222a44, 3, -d / 2 + 1.5); plant(w / 2 - 2, 2);
      title("HOME SWEET HOME", 9);
      mkNpc(sc, { name: "Mom", tag: "MOM", x: 2, z: 1, rot: 0, look: { g: "g", skin: 0, hairS: 3, hairC: 1, jacket: 4, pants: 3, capOn: false, capC: 7, bag: 4 }, talk: momTalk });
    } else if (kind === "gym") {
      const accC = new THREE.Color(gt.acc).getHex();
      const lane = mesh(new THREE.PlaneGeometry(6, d - 12), new THREE.MeshBasicMaterial({ color: accC, transparent: true, opacity: 0.28 }), 0, 0.03, 2); lane.rotation.x = -Math.PI / 2; g.add(lane);
      const plat = prop(new THREE.CylinderGeometry(6, 6.4, 0.5, 32), 0x2a2a3a, 0, 0.25, -d / 2 + 6.5); const ring = mesh(new THREE.RingGeometry(3.4, 3.8, 40), new THREE.MeshBasicMaterial({ color: accC, side: THREE.DoubleSide }), 0, 0.52, -d / 2 + 6.5); ring.rotation.x = -Math.PI / 2; g.add(ring);
      title(gt.badge.toUpperCase() + " GYM", 12, hex(gt.acc));
      [-8, 8].forEach((x) => { prop(new THREE.CylinderGeometry(0.8, 1, 1.2, 8), 0x555566, x, 0.6, d / 2 - 6, 1.1); const st = itemSprite("pokeball", 1.6); st.position.set(x, 2.2, d / 2 - 6); g.add(st); });
      const ty = gt.ty;
      if (ty === "rock") [[-12, 4], [12, -2], [-11, -12], [13, 12], [-14, 14], [10, -16]].forEach(([x, z]) => { const m = prop(new THREE.DodecahedronGeometry(2.2, 0), 0x8a7f72, x, 1.6, z, 2.4); m.scale.y = 0.9; });
      if (ty === "water") [[-11, 4], [11, 4], [-11, -12], [11, -12]].forEach(([x, z]) => { const p = mesh(new THREE.CircleGeometry(4.2, 28), new THREE.MeshLambertMaterial({ color: 0x3fa7e8, transparent: true, opacity: 0.9 }), x, 0.05, z); p.rotation.x = -Math.PI / 2; g.add(p); sc.col.add(x, z, 3.6); });
      if (ty === "electric") for (let z = d / 2 - 8; z > -d / 2 + 10; z -= 9) [-1, 1].forEach((k) => { prop(new THREE.CylinderGeometry(0.25, 0.3, 4.5, 8), 0x444444, k * 11, 2.25, z, 0.5); g.add(mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe14a }), k * 11, 4.7, z)); });
      if (ty === "grass") [[-11, 6], [11, -2], [-11, -12], [11, -14]].forEach(([x, z]) => { bx(10, 1.6, 1.6, 0x2f8a3a, x, z); bx(1.6, 1.6, 6, 0x2f8a3a, x + (x < 0 ? -4 : 4), z + 2); });
      if (ty === "fire") [-1, 1].forEach((k) => { const lv = mesh(new THREE.PlaneGeometry(4, d - 16), new THREE.MeshBasicMaterial({ color: 0xff5a1a }), k * 13, 0.04, 0); lv.rotation.x = -Math.PI / 2; g.add(lv); for (let z = -d / 2 + 12; z < d / 2 - 6; z += 10) { prop(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), 0x333333, k * 9.5, 1.5, z, 0.5); const fs = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex("🔥"), transparent: true })); fs.scale.set(1.6, 1.6, 1); fs.position.set(k * 9.5, 3.6, z); g.add(fs); } });
      if (ty === "ice") [[-12, 6], [12, -2], [-12, -12], [12, 14], [-9, 16], [10, -15]].forEach(([x, z]) => { const m = prop(new THREE.OctahedronGeometry(1.8, 0), 0xaee6ff, x, 2.2, z, 1.8, { transparent: true, opacity: 0.85 }); m.scale.y = 1.6; });
      const nt = I < 2 ? 2 : 3;
      for (let j = 0; j < nt; j++) { const lv = gt.team[0][1] - 6 + j * 2, ids = [GYM_POOL[ty] || []].flat(); const team = [[rnd(ids), lv], [rnd(ids), lv + 1]]; mkTrainer(sc, { id: "gt" + I + "_" + j, name: ["Cadet", "Scout", "Ace"][j] + " " + ["Rin", "Tao", "Vic", "Sam"][(I + j) % 4], x: j % 2 ? 7 : -7, z: d / 2 - 14 - j * 10, rot: 0, team, reward: 80 + I * 40, sight: 12, fm: 1, intro: [gt.leader + "’s trainers are no pushovers!"], win: ["Go on, face the Leader!"] }); }
      mkTrainer(sc, { id: "gym" + I, name: gt.leader, tag: "GYM LEADER " + gt.leader.toUpperCase(), x: 0, z: -d / 2 + 5, rot: 0, look: npcLook("leader" + I), team: gt.team, reward: gt.reward, sight: 0, ir: 3.6, fm: 1, xpm: 1.5, intro: [gt.line, "I’m " + gt.leader + ", leader of the " + gt.badge + " Gym. Show me your strength!"], win: ["Incredible! You’ve earned the " + gt.badge + " Badge!"], done: ["The " + gt.badge + " Badge suits you. Keep climbing!"], gate: () => G.def.filter((x) => x.startsWith("gt" + I + "_")).length >= nt, gateMsg: ["Beat my trainers before you challenge me!"], after: () => { G.badges.push(I); G.flags.lastBadge = I; saveStory(); refreshStory(); toast({ icon: gt.ic, title: gt.badge + " Badge earned!", tone: "success" }); dialog(["You received the " + gt.ic + " " + gt.badge + " Badge!", G.badges.length < 6 ? "The road onward is now open." : "You have all 6 badges! Champions Stadium awaits!"]); } });
      mkNpc(sc, { name: "Gym Guide", tag: "GYM GUIDE", x: -6, z: d / 2 - 4, rot: Math.PI, talk: () => dialog(lines("Gym Guide", ["This is the " + gt.badge + " Gym. Beat the gym trainers, then challenge " + gt.leader + "!", "Weak to " + gt.ty.toUpperCase() + "? Bring a counter type!"])) });
    } else if (kind === "stadium") {
      const arenaC = mesh(new THREE.CircleGeometry(10, 48), lam(0x2a1f4a), 0, 0.03, 2); arenaC.rotation.x = -Math.PI / 2; g.add(arenaC); [3, 6, 9.5].forEach((rr, i) => { const rg2 = mesh(new THREE.RingGeometry(rr - 0.12, rr, 48), new THREE.MeshBasicMaterial({ color: i === 2 ? 0xffcf45 : 0x8a6aff, side: THREE.DoubleSide }), 0, 0.05, 2); rg2.rotation.x = -Math.PI / 2; g.add(rg2); });
      title("CHAMPIONS STADIUM", 14, "#c9b8ff"); bx(8, 1.2, 2.4, 0x3a3060, 0, -d / 2 + 6);
      prop(new THREE.CylinderGeometry(0.8, 1.1, 1.6, 10), 0xd9a400, -12, 0.8, -d / 2 + 4, 1.2); prop(new THREE.SphereGeometry(1, 14, 10), 0xffd43b, -12, 2.4, -d / 2 + 4); prop(new THREE.CylinderGeometry(0.8, 1.1, 1.6, 10), 0xd9a400, 12, 0.8, -d / 2 + 4, 1.2); prop(new THREE.SphereGeometry(1, 14, 10), 0xffd43b, 12, 2.4, -d / 2 + 4);
      const cc = [0xffcf45, 0x4fb3ff, 0xff6b8b, 0x8ce99a, 0xc77dff]; for (let i = 0; i < 40; i++) { const a = (i / 40) * 3.14159 + 3.14159, x = Math.cos(a) * 20, z = Math.sin(a) * 15 + 4; if (Math.abs(x) < w / 2 - 1) g.add(mesh(new THREE.SphereGeometry(0.4, 6, 5), lam(cc[i % 5]), x, 1.2, z)); }
      mkNpc(sc, { name: "Registrar", tag: "REGISTRAR", x: 0, z: -d / 2 + 3.8, rot: 0, look: npcLook("registrar"), ir: 3.6, talk: registrarTalk });
      mkNpc(sc, { name: "Stadium Fan", x: -10, z: 8, rot: 0.8, talk: () => dialog(lines("Fan", ["The tournament is the biggest event in the region! Only trainers with 6 badges can enter."])) });
      sc.inter.push({ x: 8, z: -d / 2 + 6, r: 3, label: "Check bracket", fn: () => showBracket(G.flags.bracket) });
    }
    return sc;
  }
  const GYM_POOL = { rock: [74, 75, 66, 68, 63], water: [54, 8, 87, 130, 91], electric: [81, 25, 26, 66], grass: [43, 44, 2, 3], fire: [58, 5, 78, 59], ice: [87, 124, 91, 131] };
  const getInterior = (key) => INTS[key] || (INTS[key] = buildInterior(key));

  /* ============================================================
     BATTLES — PokéMMO-style stage, command menus, move animations
  ============================================================ */
  const SO = { x: 3000, z: 3000 };
  let stage = null, stageM = {}, BT = null;
  const PPOS = () => V3(SO.x - 3.5, 0, SO.z + 2.4), FPOS = () => V3(SO.x + 3.7, 0, SO.z - 3.2);
  function initStage() {
    stage = new THREE.Group(); stage.visible = false; stage.position.set(SO.x, 0, SO.z); scene.add(stage); stage.position.set(0, 0, 0);
    const add = (m) => { stage.add(m); return m; };
    const gd = add(mesh(new THREE.CircleGeometry(60, 48), lam(0x4a9e46), SO.x, -0.02, SO.z)); gd.rotation.x = -Math.PI / 2; stageM.ground = gd.material;
    const mkPlat = (x, z, r) => { const p = add(mesh(new THREE.CylinderGeometry(r, r + 0.3, 0.3, 36), lam(0x78c964), SO.x + x, 0.12, SO.z + z)); const rg = add(mesh(new THREE.RingGeometry(r - 0.3, r, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide }), SO.x + x, 0.3, SO.z + z)); rg.rotation.x = -Math.PI / 2; return p; };
    stageM.pp = mkPlat(-3.5, 2.4, 3.6).material; stageM.fp = mkPlat(3.7, -3.2, 3).material;
    stageM.hills = []; for (let i = 0; i < 9; i++) { const h = add(mesh(new THREE.SphereGeometry(1, 16, 10), lam(0x4a9e46), SO.x - 30 + i * 8, 0, SO.z - 26)); h.scale.set(7 + (i % 3) * 2, 4 + (i % 4) * 2.2, 5); stageM.hills.push(h.material); }
    stageM.trees = []; for (let i = 0; i < 14; i++) { const x = SO.x - 26 + i * 4, z = SO.z - 14 - (i % 3) * 3; add(mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 6), lam(0x7a5230), x, 1, z)); const lf = add(mesh(new THREE.ConeGeometry(1.8, 4.4, 7), lam(0x2d8a3e), x, 4, z)); stageM.trees.push(lf.material); }
    stageM.wall = add(mesh(new THREE.PlaneGeometry(120, 30), lam(0x1a2036), SO.x, 12, SO.z - 30)); stageM.wallMat = stageM.wall.material; stageM.wall.visible = false;
    stageM.themeSet = (th) => {
      const T2 = { grass: [0x8fd0ff, 0x4a9e46, 0x78c964, true], gym: [0x0d1424, 0x2a3252, 0x4a5486, false], stadium: [0x1a1036, 0x2a1f4a, 0x5a49a0, false], road: [0x8fd0ff, 0x6fa05a, 0x8dc070, true] }[th] || [0x8fd0ff, 0x4a9e46, 0x78c964, true];
      scene.background = new THREE.Color(T2[0]); scene.fog = new THREE.Fog(T2[0], 60, 160); stageM.ground.color.set(T2[1]); stageM.pp.color.set(T2[2]); stageM.fp.color.set(T2[2]); stageM.hills.forEach((m, i) => { m.color.set(T2[3] ? [0x4a9e46, 0x3f8f3a, 0x5aae52][i % 3] : 0x232a48); }); stageM.trees.forEach((m) => m.color.set(T2[3] ? 0x2d8a3e : 0x30386a)); stageM.wall.visible = !T2[3];
    };
  }
  const centerOf = (h) => V3(h.position.x, h.position.y + h.userData.s * 0.5, h.position.z);
  const bt$ = (id) => $(id);
  async function tween(ms, fn) { const t0 = performance.now(); for (;;) { const u = Math.min(1, (performance.now() - t0) / ms); fn(u); if (u >= 1) break; await wait(16); } }
  async function msg(text, hold) { bt$("bt-text").textContent = text; bt$("bt-cmd").innerHTML = ""; await wait(hold || 500 + text.length * 22); }
  const hpCls2 = (f) => (f < 0.25 ? "low" : f < 0.5 ? "mid" : "");
  function drawBoxes() {
    const m = BT.pm, f = BT.fmon;
    if (f) { const fr = clamp(BT.dispF / f.max, 0, 1); bt$("bt-foe").innerHTML = `<div class="nm">${f.n}<small>Lv${f.lv}</small></div><div class="hpw"><span>HP</span><div class="hpbar"><i class="${hpCls2(fr)}" style="width:${fr * 100}%"></i></div></div><div class="tys">${f.t.map((x) => `<em style="background:${hex(TC[x])}">${x.toUpperCase()}</em>`).join("")}</div>`; }
    if (m) { const mr = clamp(BT.dispP / m.max, 0, 1), xr = clamp((m.xp || 0) / xpNeed(m.lv), 0, 1); bt$("bt-me").innerHTML = `<div class="nm">${m.n}<small>Lv${m.lv}</small></div><div class="hpw"><span>HP</span><div class="hpbar"><i class="${hpCls2(mr)}" style="width:${mr * 100}%"></i></div></div><div class="hpn">${Math.round(BT.dispP)} / ${m.max}</div><div class="xpw"><span>EXP</span><div class="hpbar xp"><i style="width:${xr * 100}%"></i></div></div>`; }
  }
  async function animHp(side) {
    const t = side === "p" ? BT.pm : BT.fmon, key = side === "p" ? "dispP" : "dispF", from = BT[key], to = t.hp;
    await tween(520, (u) => { BT[key] = from + (to - from) * u; drawBoxes(); }); BT[key] = to; drawBoxes();
  }
  function placeMon(side, c) {
    const isP = side === "p", pos = isP ? PPOS() : FPOS(), h = makeMon(c, isP ? 4.5 : 3.4); h.position.set(pos.x, 0.3, pos.z); face(h, isP); h.userData.pop = 0; scene.add(h); if (isP) BT.pH = h; else BT.fH = h; (BT.meshes = BT.meshes || []).push(h);
    burstAt(V3(pos.x, 1.4, pos.z)); sfx(660, 0.12, "sine", 0.1); return h;
  }
  function burstAt(p) { for (let i = 0; i < 12; i++) { const an = Math.random() * 6.283; emit({ tex: TX.glow, x: p.x, y: p.y, z: p.z, vx: Math.cos(an) * 3, vy: Math.random() * 3, vz: Math.sin(an) * 2, life: 0.6, s0: 1, s1: 0.1, color: 0xffffff, add: true }); } emit({ tex: TX.star, x: p.x, y: p.y, z: p.z, life: 0.5, s0: 0.5, s1: 4, color: 0xffffff, add: true }); }
  function enterStage(theme) {
    if (!stage) initStage(); stage.visible = true; if (SC) SC.group.visible = false; if (fxGroup) fxGroup.visible = true; stageM.themeSet(theme || "grass");
    camera.position.set(SO.x + 0.4, 3.7, SO.z + 10.2); camSnap = true; BT.cam = true; bt$("bt").hidden = false; ["av-hud", "av-map", "av-feed", "av-act", "av-menu", "av-prompt", "av-loc"].forEach((id) => { const e = $(id); if (e) e.style.visibility = "hidden"; }); $("av-bottom").style.display = "none"; $("av-dlg").hidden = true;
    if (partnerH) partnerH.visible = false; trainer.visible = false;
  }
  function leaveStage() {
    BT.cam = false; stage.visible = false; (BT.meshes || []).forEach((m) => scene.remove(m)); bt$("bt").hidden = true; bt$("bt-cmd").innerHTML = ""; if (SC) { SC.group.visible = true; scene.background = new THREE.Color(SC.bg); scene.fog = new THREE.Fog(SC.bg, SC.fog[0], SC.fog[1]); }
    ["av-hud", "av-map", "av-feed", "av-act", "av-menu", "av-prompt", "av-loc"].forEach((id) => { const e = $(id); if (e) e.style.visibility = ""; }); $("av-bottom").style.display = ""; if (partnerH) partnerH.visible = true; trainer.visible = true; camSnap = true;
  }
  const bag = () => G.bag;
  const aliveIdx = () => G.squad.map((c, i) => (c.hp > 0 ? i : -1)).filter((i) => i >= 0);
  const STRUGGLE = { n: "Struggle", t: "normal", p: 50, pp: 1, struggle: true };
  const CONTACT = (mv) => ["fighting", "bug", "steel", "dark"].includes(mv.t) || (mv.t === "normal" && mv.p < 100);
  function lungeTo(h, from, to) { const dx = to.position.x - from.position.x, dz = to.position.z - from.position.z, l = Math.hypot(dx, dz) || 1; h.userData.lx = dx / l; h.userData.lz = dz / l; h.userData.lunge = 0.0001; }
  function dmgCalc(att, def, mv, crit) {
    const e = eff(mv.t, def), stab = has(att.t.join(","), mv.t) ? 1.5 : 1, base = (((2 * att.lv) / 5 + 2) * mv.p * att.atk) / def.def / 50 + 2;
    return { e, v: e === 0 ? 0 : Math.max(1, Math.round(base * stab * e * (crit ? 1.5 : 1) * (0.85 + Math.random() * 0.15))) };
  }
  function aiMove(f, p) {
    const ms = movesFor(f).filter((m) => ppOf(f, m) > 0); if (!ms.length) return STRUGGLE; if (Math.random() < 0.3) return rnd(ms);
    let best = ms[0], bs = -1; ms.forEach((m) => { const sc2 = m.p * eff(m.t, p) * (has(f.t.join(","), m.t) ? 1.5 : 1); if (sc2 > bs) { bs = sc2; best = m; } }); return best;
  }
  async function doMove(side, mv) {
    const isP = side === "p", att = isP ? BT.pm : BT.fmon, def = isP ? BT.fmon : BT.pm, ah = isP ? BT.pH : BT.fH, dh = isP ? BT.fH : BT.pH, pre = isP ? "" : (BT.o.trainer ? "Foe " : "Wild ");
    if (!att || !def || att.hp <= 0) return;
    if (!mv.struggle) { att.pp = att.pp || {}; att.pp[mv.n] = ppOf(att, mv) - 1; }
    await msg(pre + att.n + " used " + mv.n + "!", 600);
    if (mv.p >= 100 && Math.random() < 0.15 || Math.random() < 0.04) { await msg(pre + att.n + "’s attack missed!"); return; }
    if (CONTACT(mv)) lungeTo(ah, ah, dh);
    await playFx(mv.t, centerOf(ah), centerOf(dh), mv.p >= 90);
    const crit = Math.random() < 0.0625, r = dmgCalc(att, def, mv, crit);
    if (r.e === 0) { await msg("It doesn’t affect " + def.n + "…"); return; }
    dh.userData.flash = 0.6; sfx(r.e > 1 ? 180 : 140, 0.12, "square", 0.1);
    def.hp = Math.max(0, def.hp - r.v); await animHp(isP ? "f" : "p");
    if (crit) await msg("A critical hit!", 600); if (r.e > 1) await msg("It’s super effective!", 700); else if (r.e < 1) await msg("It’s not very effective…", 700);
    if (def.hp <= 0) await faint(isP ? "f" : "p");
  }
  async function gainXp(foe) {
    const base = Math.round(foe.lv * 4 * (BT.o.trainer ? 1.5 : 1) * (BT.o.xpm || 1)), lead = BT.pm; let first = true;
    for (const c of G.squad) {
      if (c.hp <= 0) continue; const amt = c === lead ? base : Math.round(base * 0.5); c.xp = (c.xp || 0) + amt;
      if (c === lead) await msg(c.n + " gained " + amt + " Exp. Points!", 800);
      while (c.xp >= xpNeed(c.lv) && c.lv < 60) {
        const before = movesFor(c).map((m) => m.n); c.xp -= xpNeed(c.lv); c.lv++; const om = c.max; restat(c); c.hp = Math.min(c.max, c.hp + c.max - om); if (c === lead) { BT.dispP = c.hp; drawBoxes(); }
        sfx(880, 0.15, "sine", 0.1); await msg(c.n + " grew to Lv. " + c.lv + "!", 900);
        movesFor(c).forEach((m) => { if (!before.includes(m.n)) c._learn = m.n; }); if (c._learn) { const l = c._learn; c._learn = null; await msg(c.n + " learned " + l + "!", 900); }
      }
    }
  }
  async function faint(side) {
    const isP = side === "p", c = isP ? BT.pm : BT.fmon, h = isP ? BT.pH : BT.fH;
    h.userData.sink = true; h.userData.sinkT = 0; sfx(200, 0.3, "triangle", 0.1); await wait(500); await msg((isP ? "" : BT.o.trainer ? "Foe " : "Wild ") + c.n + " fainted!", 800);
    if (isP) {
      if (!aliveIdx().length) { BT.over = true; BT.res = "lose"; return; }
      const i = await askTeam(true); await sendPlayer(i); return;
    }
    await gainXp(c); G.flags.kos = (G.flags.kos || 0) + 1;
    BT.fi++; if (BT.fi >= BT.foes.length) { BT.over = true; BT.res = "win"; return; }
    const nf = BT.foes[BT.fi]; BT.fmon = nf; BT.dispF = nf.hp; scene.remove(BT.fH);
    await msg(BT.o.name + " sent out " + nf.n + "!", 800); placeMon("f", nf); drawBoxes();
  }
  async function sendPlayer(i) {
    G.lead = i; BT.pm = G.squad[i]; BT.dispP = BT.pm.hp; if (BT.pH) { scene.remove(BT.pH); }
    await msg("Go! " + BT.pm.n + "!", 700); placeMon("p", BT.pm); drawBoxes();
  }
  function askMain() { return new Promise((resolve) => { BT.ask = resolve; renderMain(); }); }
  function askTeam(forced) { return new Promise((resolve) => { BT.askT = resolve; renderTeam(forced); }); }
  function renderMain() {
    const c = bt$("bt-cmd"), pm = BT.pm; bt$("bt-text").textContent = "What will " + pm.n + " do?";
    c.className = "main"; c.innerHTML = '<button class="bt-b fight" data-c="fight">FIGHT</button><button class="bt-b bag" data-c="bag">BAG</button><button class="bt-b mon" data-c="mon">POKÉMON</button><button class="bt-b run" data-c="run"' + (BT.o.trainer ? " disabled" : "") + ">RUN</button>";
    c.querySelectorAll("[data-c]").forEach((b) => { b.onclick = () => { const k = b.dataset.c; if (k === "fight") renderMoves(); else if (k === "bag") renderBag(); else if (k === "mon") renderTeam(false); else BT.ask({ t: "run" }); }; });
  }
  function renderMoves() {
    const c = bt$("bt-cmd"), pm = BT.pm, ms = movesFor(pm); c.className = "moves";
    c.innerHTML = ms.map((m, i) => `<button class="bt-m" data-i="${i}" style="--c:${hex(TC[m.t])}" ${ppOf(pm, m) <= 0 ? "disabled" : ""}><b>${m.n}</b><small>${m.t.toUpperCase()} · PP ${ppOf(pm, m)}/${m.pp}</small></button>`).join("") + '<button class="bt-b back" data-i="back">◀ BACK</button>';
    c.querySelectorAll("[data-i]").forEach((b) => { b.onclick = () => { if (b.dataset.i === "back") return renderMain(); BT.ask({ t: "move", mv: ms[+b.dataset.i] }); }; });
    if (ms.every((m) => ppOf(pm, m) <= 0)) { BT.ask({ t: "move", mv: STRUGGLE }); }
  }
  function renderBag() {
    const c = bt$("bt-cmd"); c.className = "bag";
    const rows = []; if (!BT.o.trainer) BALLS.forEach((b) => { const n = ballCnt(b.id); if (n > 0) rows.push(`<button class="bt-m it" data-k="ball:${b.id}">${itemImg(b.id, 30)}<b>${b.n}</b><small>×${n}</small></button>`); });
    ["potion", "super", "hyper", "berry"].forEach((k) => { const n = G.bag[k] || 0; if (n > 0) rows.push(`<button class="bt-m it" data-k="item:${k}">${itemImg(k, 30)}<b>${ITEMS[k].n}</b><small>×${n} · +${ITEMS[k].heal} HP</small></button>`); });
    c.innerHTML = (rows.join("") || '<div class="bt-empty">Your bag is empty.</div>') + '<button class="bt-b back" data-k="back">◀ BACK</button>';
    c.querySelectorAll("[data-k]").forEach((b) => { b.onclick = () => { const [t, id] = b.dataset.k.split(":"); if (t === "back") return renderMain(); BT.ask({ t, id }); }; });
  }
  function renderTeam(forced) {
    const c = bt$("bt-cmd"); c.className = "bag"; bt$("bt-text").textContent = forced ? "Choose the next Pokémon!" : "Choose a Pokémon.";
    c.innerHTML = G.squad.map((m, i) => `<button class="bt-m it" data-i="${i}" ${m.hp <= 0 || m === BT.pm ? "disabled" : ""}><img class="av-it" src="${ART + m.id}.png" width="34" height="34" alt=""><b>${m.n} Lv${m.lv}</b><small>${m.hp}/${m.max} HP</small></button>`).join("") + (forced ? "" : '<button class="bt-b back" data-i="back">◀ BACK</button>');
    c.querySelectorAll("[data-i]").forEach((b) => { b.onclick = () => { if (b.dataset.i === "back") return renderMain(); if (forced) BT.askT(+b.dataset.i); else BT.ask({ t: "switch", i: +b.dataset.i }); }; });
  }
  async function foeAttack() { if (BT.over || !BT.fmon || BT.fmon.hp <= 0 || BT.pm.hp <= 0) return; await doMove("f", aiMove(BT.fmon, BT.pm)); }
  async function throwBall(id) {
    const b = BALLS.find((x) => x.id === id), f = BT.fmon; if (!useBallItem(id)) { await msg("You have none left!"); return false; }
    await msg("You used a " + b.n + "!", 600);
    const hpf = f.hp / f.max, base = [0, 0.62, 0.45, 0.28][f.k] || 0.4, chance = f.id === 150 ? 0.03 : b.m >= 99 ? 1 : clamp(base * (1.6 - hpf * 1.2) * b.m, 0.06, 0.95), caught = Math.random() < chance, shakes = caught ? 3 : Math.floor(Math.random() * 3);
    const sp = itemSprite(id, 1), a = PPOS(), z = FPOS(); sp.position.set(a.x, 1.6, a.z); scene.add(sp); BT.meshes.push(sp);
    await tween(650, (u) => { sp.position.set(a.x + (z.x - a.x) * u, 1.6 + (z.y + 1.8 - 1.6) * u + Math.sin(u * Math.PI) * 2.6, a.z + (z.z - a.z) * u); sp.material.rotation = u * 12; });
    BT.fH.userData.idle = false; await tween(350, (u) => { BT.fH.scale.setScalar(Math.max(0.01, 1 - u)); }); burstAt(V3(z.x, 1.8, z.z));
    await tween(380, (u) => { sp.position.y = 1.8 - 1.4 * u * u; }); sp.position.y = 0.45;
    for (let i = 0; i < shakes; i++) { await wait(380); sfx(300, 0.08, "square", 0.08); await tween(260, (u) => { sp.material.rotation = Math.sin(u * Math.PI * 2) * 0.5; }); }
    await wait(450);
    if (caught) {
      for (let i = 0; i < 10; i++) emit({ tex: TX.star, x: sp.position.x, y: 0.7, z: sp.position.z, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 2, vz: (Math.random() - 0.5) * 2, life: 0.9, s0: 0.5, s1: 0.1, color: 0xffe14a, add: true, grav: 3 });
      sfx(660, 0.15, "sine", 0.12); await msg("Gotcha! " + f.n + " was caught!", 1100);
      try { if (!isCaptured(f.s)) capturePokemon({ name: f.s, id: f.id, types: f.t }, id); } catch (e) {}
      f.hp = Math.max(1, f.hp); f.pp = {}; if (G.squad.length < 6) G.squad.push(f); else { G.box.push(f); await msg(f.n + " was sent to the PC box.", 900); }
      G.flags.caught = (G.flags.caught || 0) + 1; BT.caught = f; BT.over = true; BT.res = "caught"; return true;
    }
    scene.remove(sp); burstAt(V3(z.x, 1.4, z.z)); BT.fH.userData.idle = true; await tween(250, (u) => { BT.fH.scale.setScalar(Math.max(0.01, u)); }); BT.fH.scale.setScalar(1);
    await msg(shakes >= 2 ? "Aargh! Almost had it!" : "Oh no! The Pokémon broke free!", 900); return false;
  }
  async function turnRes(cmd) {
    const pm = BT.pm, fm = BT.fmon;
    if (cmd.t === "run") { const ch = clamp(0.55 + (pm.spd - fm.spd) * 0.02, 0.3, 0.95); if (Math.random() < ch) { await msg("Got away safely!", 900); BT.over = true; BT.res = "run"; return; } await msg("Can’t escape!", 800); await foeAttack(); return; }
    if (cmd.t === "switch") { await msg("Come back, " + pm.n + "!", 600); BT.pH.userData.sink = true; BT.pH.userData.sinkT = 0; await wait(450); await sendPlayer(cmd.i); await foeAttack(); return; }
    if (cmd.t === "item") { const it = ITEMS[cmd.id]; G.bag[cmd.id]--; const before = pm.hp; pm.hp = Math.min(pm.max, pm.hp + it.heal); for (let i = 0; i < 10; i++) emit({ tex: TX.star, x: BT.pH.position.x + (Math.random() - 0.5) * 2, y: 1 + Math.random() * 2, z: BT.pH.position.z, vy: 1.5, life: 0.9, s0: 0.5, s1: 0.1, color: 0x62ff9a, add: true }); await msg("You used a " + it.n + ". " + pm.n + " recovered " + (pm.hp - before) + " HP!", 900); await animHp("p"); await foeAttack(); return; }
    if (cmd.t === "ball") { const ok = await throwBall(cmd.id); if (!ok && !BT.over) await foeAttack(); return; }
    const pmv = cmd.mv, fmv = aiMove(fm, pm), pri = (m) => (m.n === "Quick Attack" ? 1 : 0);
    const pFirst = pri(pmv) !== pri(fmv) ? pri(pmv) > pri(fmv) : pm.spd >= fm.spd; const order = pFirst ? ["p", "f"] : ["f", "p"];
    for (const s of order) {
      if (BT.over) break; if (BT.pm.hp <= 0 || BT.fmon.hp <= 0) break;
      const fmonBefore = BT.fmon, pmBefore = BT.pm; await doMove(s, s === "p" ? pmv : fmv); if (BT.fmon !== fmonBefore || BT.pm !== pmBefore) break;
    }
  }
  async function runBattle() {
    const o = BT.o; enterStage(o.theme); BT.dispP = 0; BT.dispF = 0; BT.meshes = [];
    bt$("bt-foe").innerHTML = ""; bt$("bt-me").innerHTML = ""; await wait(350);
    let ft = null, pt = makeTrainer(G.look); pt.position.set(SO.x - 7.4, 0, SO.z + 4.2); pt.scale.setScalar(1.7); pt.rotation.y = 0.5; scene.add(pt); BT.meshes.push(pt);
    if (o.trainer) { ft = makeTrainer(o.look || npcLook(o.name)); ft.position.set(SO.x + 7.2, 0, SO.z - 4.6); ft.scale.setScalar(1.7); ft.rotation.y = -0.4; scene.add(ft); BT.meshes.push(ft); await msg(o.name + " wants to battle!", 1300); await msg(o.name + " sent out " + o.foes[0].n + "!", 900); scene.remove(ft); }
    else await wait(150);
    BT.fmon = o.foes[0]; BT.dispF = BT.fmon.hp; placeMon("f", BT.fmon); drawBoxes();
    if (!o.trainer) await msg("A wild " + BT.fmon.n + " appeared!", 1000);
    const i0 = G.squad[G.lead] && G.squad[G.lead].hp > 0 ? G.lead : aliveIdx()[0]; await msg("Go! " + G.squad[i0].n + "!", 700); scene.remove(pt); await sendPlayerQuiet(i0);
    while (!BT.over) { const cmd = await askMain(); await turnRes(cmd); }
    bt$("bt-cmd").innerHTML = ""; await wait(300);
    const res = BT.res, caught = BT.caught, resolve = BT.resolve; leaveStage(); BT = null; resolve({ res, caught });
  }
  async function sendPlayerQuiet(i) { G.lead = i; BT.pm = G.squad[i]; BT.dispP = BT.pm.hp; placeMon("p", BT.pm); drawBoxes(); await wait(500); }
  function battle(o) {
    return new Promise((resolve) => { BT = { o, foes: o.foes, fi: 0, over: false, res: null, resolve }; runBattle().catch((e) => { if (e && e.message !== "cancel") showErr(e); }); });
  }
  function abortBattle() { if (BT) { try { leaveStage(); } catch (e) {} BT = null; } }

  /* ============================================================
     STORY LOGIC — dialogue, quests, friends, tournament, menus
  ============================================================ */
  let G = null, mode = null, DL = null, partnerH = null, trainer = null, hudLast = null;
  const held = {}, pad = {};
  const modalOpen = () => !$("av-modal").hidden;
  const say = (arr) => new Promise((res) => dialog(arr, res));
  const flashT = () => new Promise((res) => transition(res));
  function showErr(e) { try { console.error(e); const el = $("av-err"); if (el) { el.hidden = false; el.textContent = "Adventure error: " + (e && e.message ? e.message : e); } } catch (x) {} }
  function guard(fn) { return fn().catch((e) => { if (e && e.message !== "cancel") showErr(e); }); }
  const me = () => { if (!G) return null; const s = G.squad; if (s[G.lead] && s[G.lead].hp > 0) return s[G.lead]; const i = s.findIndex((c) => c.hp > 0); if (i < 0) return null; G.lead = i; return s[i]; };

  /* ----- dialogue (ROM-style white box) ----- */
  function dialog(arr, cb) { DL = { lines: arr.map((l) => (typeof l === "string" ? { t: l } : l)), i: 0, pos: 0, cb }; $("av-dlg").hidden = false; renderDlg(); }
  function renderDlg() { const L = DL.lines[DL.i]; DL.pos = 0; $("av-dlg").innerHTML = '<div class="nm">' + (L.n || "") + '</div><div class="tx"></div><i>▼</i>'; }
  function paintDlg() { if (!DL) return; const L = DL.lines[DL.i], e = $("av-dlg").querySelector(".tx"); if (e) e.textContent = L.t.slice(0, Math.floor(DL.pos)); }
  function advanceDlg() {
    if (!DL) return false; const L = DL.lines[DL.i];
    if (DL.pos < L.t.length) { DL.pos = L.t.length; paintDlg(); return true; }
    DL.i++; if (DL.i >= DL.lines.length) { const cb = DL.cb; DL = null; $("av-dlg").hidden = true; if (cb) cb(); } else renderDlg(); return true;
  }
  function interact() { if (DL) { advanceDlg(); return; } if (mode !== "story" || !G || G.cut || BT || modalOpen()) return; if (G.near) G.near.fn(); }
  function transition(cb) { const f = $("av-flash"); f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); later(() => { cb(); setTimeout(() => f.classList.remove("on"), 60); }, 720); }
  function modal(html, bind, wide) { const m = $("av-modal"); m.innerHTML = '<div class="av-sheet' + (wide ? " wide" : "") + '">' + html + "</div>"; m.hidden = false; if (bind) bind(m); }
  const closeModal = () => { $("av-modal").hidden = true; };
  function setHud(html) { if (html === hudLast) return; hudLast = html; const h = $("av-hud"); h.hidden = !html; h.innerHTML = html || ""; }
  const hpCls = (c) => { const f = c.hp / c.max; return f < 0.25 ? "low" : f < 0.55 ? "mid" : ""; };
  function refresh() {
    $("av-res").textContent = "🥮 " + getCoins().toLocaleString() + "  ·  ⚪ " + totalBalls();
    $("av-team").innerHTML = G && !BT ? G.squad.map((m, i) => `<div class="av-chip${i === G.lead && m.hp > 0 ? " lead" : ""}${m.hp <= 0 ? " down" : ""}"><img src="${ART + m.id}.png" alt=""><div><b>${m.n} Lv${m.lv}</b><span class="av-bar"><u class="${hpCls(m)}" style="width:${Math.max(0, (m.hp / m.max) * 100)}%"></u></span></div></div>`).join("") : "";
  }
  const showPad = (v) => { $("av-pad").hidden = !v; };

  /* ----- saving ----- */
  const unpack = (o) => { const c = mkL(SPECIES[o.id] || SPECIES[25], o.lv); c.xp = o.xp || 0; c.hp = Math.max(0, Math.min(c.max, o.hp == null ? c.max : o.hp)); return c; };
  const pack = (c) => ({ id: c.id, lv: c.lv, xp: c.xp || 0, hp: c.hp });
  function saveStory() {
    if (!G) return; const S = G.sv.story; S.squad = G.squad.map(pack); S.box = G.box.map(pack); S.bag = G.bag; S.badges = G.badges; S.def = G.def; S.flags = G.flags; S.q = G.q; S.picked = G.picked; S.visited = G.visited; S.spawn = G.spawn; S.friends = G.friends;
    const inW = SC && SC.id === "world"; S.pos = inW ? { x: P.x, z: P.z } : G.ret ? { x: G.ret.x, z: G.ret.z } : S.pos; G.sv.played = Date.now(); saveDB();
  }
  function healAll() { G.squad.forEach(healMon); refresh(); setPartner(true); saveStory(); sfx(880, 0.2, "sine", 0.1); }

  /* ----- scenes ----- */
  function enterScene(sc, x, z, rot) {
    if (SC) SC.group.visible = false; SC = sc; sc.group.visible = true; scene.background = new THREE.Color(sc.bg); scene.fog = new THREE.Fog(sc.bg, sc.fog[0], sc.fog[1]);
    P.x = x; P.z = z; if (rot !== undefined) P.rot = rot; camSnap = true; if (G) { G.near = null; G.hist = []; } refreshMarks();
    if (partnerH) partnerH.position.set(x + 1, 0, z + 1);
  }
  function setPartner(force) {
    const m = me(); if (!m) { if (partnerH) { scene.remove(partnerH); partnerH = null; } return; }
    if (!force && partnerH && partnerH.userData.key === m.s) return;
    const pos = partnerH ? partnerH.position.clone() : new THREE.Vector3(P.x + 1.5, 0, P.z + 1.5); if (partnerH) scene.remove(partnerH);
    partnerH = makeMon(m, 2.1); partnerH.position.copy(pos); scene.add(partnerH);
  }
  function goInterior(d) {
    G.cut = true; flashT().then(() => { const sc = getInterior(d.key); G.ret = { x: d.x, z: d.z + 1.2 }; enterScene(sc, 0, sc.d / 2 - 3, Math.PI); G.cut = false; G.loc = ""; saveStory(); if (sc.kind === "gym" && !G.flags["seen" + sc.id]) { G.flags["seen" + sc.id] = 1; } });
  }
  function leaveInterior() { G.cut = true; flashT().then(() => { enterScene(WORLD, G.ret.x, G.ret.z, 0); G.cut = false; G.loc = ""; saveStory(); }); }

  /* ----- quests ----- */
  const QUESTS = [], QBY = {};
  const GN = ["Ranger Hana", "Farmer Pete", "Baker Lulu", "Fisher Marlo", "Teacher Ines", "Mechanic Orla", "Poet Basil", "Painter Yuki", "Captain Reed", "Gardener Tia", "Archer Nico", "Weaver Dune", "Potter Sana", "Smith Brann", "Sailor Moe", "Chef Ottilie", "Monk Ren", "Tailor Vik", "Guide Elara", "Scout Finn", "Doctor Pim", "Miner Gruff", "Skater Zia", "Pilot Quin", "Piper Lark", "Brewer Ash", "Dancer Mina", "Mason Kip", "Clerk Dot", "Herder Bo", "Carver Jun", "Hermit Moss"];
  const ELDERS = ["Mayor Oak", "Elder Rowan", "Mayor Stone", "Elder Vale", "Mayor Fern", "Elder Cinder", "Mayor Frost", "Director Hale"];
  (function genQuests() {
    let gi = 0; const Q = (o) => { QUESTS.push(o); QBY[o.id] = o; };
    TOWNS.forEach((t, i) => {
      Q({ id: "h" + i, town: i, giver: GN[gi++], title: "Wild Trouble", desc: "Defeat " + (3 + i) + " wild Pokémon around " + t.n + ".", k: "wins", n: 3 + i, rw: { coins: 100 + 60 * i, items: { potion: 2 } } });
      if (i % 2 === 0) Q({ id: "c" + i, town: i, giver: GN[gi++], title: "Catch Request", desc: "Catch " + (1 + (i >> 1)) + " wild Pokémon with a Poké Ball.", k: "catch", n: 1 + (i >> 1), rw: { coins: 150 + 70 * i, balls: { great: 2 } } });
      else Q({ id: "b" + i, town: i, giver: GN[gi++], title: "Trainer Practice", desc: "Defeat 2 trainers on the road.", k: "beat", n: 2, rw: { coins: 160 + 70 * i, items: { super: 1 } } });
      Q({ id: "d" + i, town: i, giver: GN[gi++], title: "Special Delivery", desc: "Deliver a letter to " + ELDERS[(i + 1) % 8] + " in " + TOWNS[(i + 1) % 8].n + ".", k: "talk", target: "loc" + ((i + 1) % 8), n: 1, rw: { coins: 220 + 90 * i, items: { revive: 1 } } });
      if (i > 0 && i < 7) Q({ id: "p" + i, town: i, giver: GN[gi++], title: "Berry Picker", desc: "Collect 3 Oran Berries growing near " + t.n + ".", k: "collect", n: 3, rw: { coins: 120 + 50 * i, items: { super: 2 } } });
    });
  })();
  const qState = (id) => (G && G.q[id]) || { s: 0, p: 0 };
  function giveReward(rw) {
    const parts = []; if (rw.coins) { addCoins(rw.coins); parts.push("🥮 " + rw.coins); }
    Object.keys(rw.items || {}).forEach((k) => { G.bag[k] = (G.bag[k] || 0) + rw.items[k]; parts.push(ITEMS[k].n + " ×" + rw.items[k]); });
    Object.keys(rw.balls || {}).forEach((k) => { giveBalls(rw.balls[k], k); parts.push(BALLS.find((b) => b.id === k).n + " ×" + rw.balls[k]); });
    return parts.join(", ");
  }
  function qEvent(kind, n) {
    QUESTS.forEach((q) => { const st = G.q[q.id]; if (!st || st.s !== 1 || q.k !== kind) return; st.p += n || 1; if (st.p >= q.n) { st.s = 2; toast({ icon: itemImg("mail", 22), title: "Quest ready: " + q.title, message: "Return to " + q.giver + ".", tone: "success" }); } });
    refreshMarks(); saveStory();
  }
  function questTalk(q) {
    const st = qState(q.id);
    if (st.s === 0) { const town = TOWNS[q.town].n; dialog(lines(q.giver, ["Hello, trainer! I have a task for you in " + town + ".", q.title + ": " + q.desc]), () => { modal(`<h2>${q.title}</h2><p>${q.desc}</p><p>Reward: <b style="color:#ffcf45">${rwText(q.rw)}</b></p><div class="av-row2"><button class="av-btn ghost" data-a="no">NOT NOW</button><button class="av-btn" data-a="yes">ACCEPT</button></div>`, (m) => { m.querySelector("[data-a=no]").onclick = closeModal; m.querySelector("[data-a=yes]").onclick = () => { closeModal(); G.q[q.id] = { s: 1, p: 0 }; if (q.k === "talk") { G.bag.mail = (G.bag.mail || 0) + 1; } refreshMarks(); saveStory(); toast({ icon: "📜", title: "Quest accepted", message: q.title }); }; }); }); }
    else if (st.s === 1) dialog(lines(q.giver, ["How’s it going? " + q.desc + " (" + st.p + "/" + q.n + ")"]));
    else if (st.s === 2) { st.s = 3; const txt = giveReward(q.rw); dialog(lines(q.giver, ["Fantastic work! Here’s your reward.", "You received " + txt + "!"]), () => { refreshMarks(); refresh(); saveStory(); toast({ icon: "🎁", title: "Quest complete!", message: txt, tone: "success" }); }); }
    else dialog(lines(q.giver, ["Thanks again for your help!"]));
  }
  const rwText = (rw) => [rw.coins ? "🥮 " + rw.coins : "", ...Object.keys(rw.items || {}).map((k) => ITEMS[k].n + " ×" + rw.items[k]), ...Object.keys(rw.balls || {}).map((k) => k + " ball ×" + rw.balls[k])].filter(Boolean).join(", ");
  function localTalk(i) {
    const q = QUESTS.find((x) => x.k === "talk" && x.target === "loc" + i && qState(x.id).s === 1);
    if (q) { G.q[q.id].s = 3; G.bag.mail = Math.max(0, (G.bag.mail || 1) - 1); const txt = giveReward(q.rw); dialog(lines(ELDERS[i], ["A letter for me? Thank you for bringing it all this way!", "Please accept this: " + txt + "."]), () => { refreshMarks(); refresh(); saveStory(); toast({ icon: "🎁", title: "Delivery complete!", message: txt, tone: "success" }); }); return; }
    dialog(lines(ELDERS[i], ["Welcome to " + TOWNS[i].n + "! " + (TOWNS[i].gym !== undefined ? "The gym here uses " + GYMS[TOWNS[i].gym].ty.toUpperCase() + " types." : "Good luck on your journey!")]));
  }
  function placeTownNpcs(sc) {
    TOWNS.forEach((t, i) => {
      const qs = QUESTS.filter((q) => q.town === i);
      qs.forEach((q, k) => { const x = t.c - 25 + k * 13; mkNpc(sc, { name: q.giver, tag: q.giver.toUpperCase(), x, z: 5.4, rot: Math.PI, qid: q.id, label: "Talk (quest)", talk: () => questTalk(q) }); });
      mkNpc(sc, { name: ELDERS[i], tag: ELDERS[i].toUpperCase(), x: t.c + 26, z: 5.4, rot: Math.PI, locIdx: i, tc: "#8fe6ff", talk: () => localTalk(i) });
    });
  }
  function refreshMarks() {
    [WORLD].concat(Object.values(INTS)).forEach((sc) => { if (!sc) return; sc.npcs.forEach((n) => {
      let k = 0; if (G) { if (n.qid) { const s = qState(n.qid).s; k = s === 0 ? 1 : s === 2 ? 2 : 0; } if (n.locIdx !== undefined && QUESTS.some((q) => q.k === "talk" && q.target === "loc" + n.locIdx && qState(q.id).s === 1)) k = 2; }
      n.mark.visible = k > 0; if (k) { n.mark.material.map = k === 1 ? TX.bang : TX.ques; n.mark.material.needsUpdate = true; } }); });
  }
  function pickUp(p) {
    G.picked.push(p.id); p.mesh.visible = false; const k = p.kind;
    if (BALLS.some((b) => b.id === k)) giveBalls(1, k); else G.bag[k] = (G.bag[k] || 0) + 1;
    if (k === "berry") qEvent("collect", 1); else saveStory();
    toast({ icon: itemImg(k, 22), title: "Found " + (ITEMS[k] ? ITEMS[k].n : BALLS.find((b) => b.id === k).n) + "!" }); sfx(740, 0.1, "sine", 0.1); refresh();
  }

  /* ----- characters & shops ----- */
  function nurseTalk(o) { dialog(lines("Nurse", ["Welcome to the Pokémon Center! We’ll heal your Pokémon to full health."]), () => { healAll(); G.spawn = { x: G.ret.x, z: G.ret.z }; dialog(lines("Nurse", ["Thank you for waiting! Your Pokémon are fully healed. We hope to see you again!"])); saveStory(); }); }
  function momTalk() {
    if (!G.flags.momIntro) { G.flags.momIntro = 1; dialog(lines("Mom", ["Good morning, " + G.sv.name + "! Today’s the day you start your journey!", "Prof. Linden is waiting at the lab, just east of here. Your friends " + G.friends.a.name + " and " + G.friends.b.name + " are there too.", "Take care, and remember — I can always heal your Pokémon at home. Now go!"]), () => saveStory()); return; }
    dialog(lines("Mom", ["You look tired. Let me heal your Pokémon."]), () => { healAll(); G.spawn = { x: G.ret.x, z: G.ret.z }; dialog(lines("Mom", ["All better! Do your best out there!"])); });
  }
  function profTalk() {
    if (!G.flags.intro) { G.flags.intro = 1; saveStory(); dialog([{ n: "Prof. Linden", t: "Welcome, " + G.sv.name + "! Welcome to the world of Pokémon." }, { n: G.friends.a.name, t: "Hi, " + G.sv.name + "! " + G.friends.b.name + " and I are starting our journey today too!" }, { n: G.friends.b.name, t: "Let’s all earn 6 badges and enter the Champions Tournament together!" }, { n: "Prof. Linden", t: "Exactly! Three trainers, three partners. Choose your Pokémon from the table first, " + G.sv.name + "." }]); return; }
    if (!G.flags.starter) { dialog(lines("Prof. Linden", ["Walk up to the table and choose your partner Pokémon!"])); return; }
    dialog(lines("Prof. Linden", ["Win battles to level up, complete quests in each town, and earn all 6 badges. A grand tournament awaits the best trainers!"]));
  }
  function chooseStarter(id) {
    const sp = SPECIES[id];
    modal(`<h2>YOUR PARTNER</h2><p>Choose <b style="color:#ffcf45">${sp.n}</b> as your first Pokémon?</p><div class="av-squad"><div style="width:130px"><img src="${ART + id}.png" alt="" style="width:110px;height:110px">${sp.n}</div></div><div class="av-row2"><button class="av-btn ghost" data-a="no">NOT YET</button><button class="av-btn" data-a="yes">YES!</button></div>`, (m) => {
      m.querySelector("[data-a=no]").onclick = closeModal;
      m.querySelector("[data-a=yes]").onclick = () => {
        closeModal(); G.squad = [mkL(sp, 5)]; G.lead = 0; G.flags.starter = true; G.flags.pick = id; G.bag.potion = (G.bag.potion || 0) + 3; giveBalls(5);
        const rest = [1, 4, 7].filter((x) => x !== id); G.friends.a.pick = rest[0]; G.friends.b.pick = rest[1];
        try { if (!isCaptured(sp.s)) capturePokemon({ name: sp.s, id, types: sp.t }, "pokeball"); } catch (e) {}
        ["st1", "st4", "st7"].forEach((k) => { const s = INTS["lab"] && INTS["lab"][k]; if (s) s.visible = false; });
        ensureFriends(); setPartner(true); refresh(); saveStory();
        dialog([{ n: "Prof. Linden", t: "A wonderful choice! " + sp.n + " will be a great partner." }, { n: G.friends.a.name, t: "I’ll take " + SPECIES[rest[0]].n + "!" }, { n: G.friends.b.name, t: "Then I’m with " + SPECIES[rest[1]].n + "! Let’s go, " + G.sv.name + "!" }, { n: "Prof. Linden", t: "Take 5 Poké Balls and 3 Potions. Visit towns, help the locals with quests, and beat the 6 gyms!" }, { n: "", t: "You received 5 Poké Balls and 3 Potions!" }]);
      };
    });
  }
  function martMenu() {
    const items = [{ k: "pokeball", n: "Poké Ball", p: 150, ball: 1 }, { k: "great", n: "Great Ball", p: 300, ball: 1 }, { k: "ultra", n: "Ultra Ball", p: 600, ball: 1 }, { k: "potion", n: "Potion", p: 80, d: "Heals 40 HP" }, { k: "super", n: "Super Potion", p: 220, d: "Heals 100 HP" }, { k: "hyper", n: "Hyper Potion", p: 480, d: "Heals 200 HP" }, { k: "revive", n: "Revive", p: 600, d: "Revives a fainted Pokémon" }];
    const draw = () => { const c = getCoins(); modal(`<h2>POKÉ MART</h2><p>You have <b style="color:#ffcf45">🥮 ${c.toLocaleString()}</b></p><div class="av-shop">${items.map((i) => `<div class="av-item">${itemImg(i.k, 40)}<div><b>${i.n}</b><span>${i.d || "In bag: " + ballCnt(i.k)}</span></div><button class="av-btn" data-b="${i.k}" ${c >= i.p ? "" : "disabled"}>🥮 ${i.p}</button></div>`).join("")}</div><div class="av-row2"><button class="av-btn" data-a="x">DONE</button></div>`, (m) => {
      m.querySelectorAll("[data-b]").forEach((b) => { b.onclick = () => { const it = items.find((x) => x.k === b.dataset.b); if (getCoins() < it.p) return; addCoins(-it.p); if (it.ball) giveBalls(1, it.k); else G.bag[it.k] = (G.bag[it.k] || 0) + 1; sfx(700, 0.08, "sine", 0.1); saveStory(); refresh(); draw(); }; }); m.querySelector("[data-a=x]").onclick = closeModal; }, true); };
    draw();
  }
  function pcMenu() {
    const draw = () => modal(`<h2>POKÉMON PC</h2><p>Party (${G.squad.length}/6) · Box (${G.box.length})</p><div class="av-shop"><b style="text-align:left;color:#7fa6cf">PARTY</b>${G.squad.map((c, i) => `<div class="av-item"><img class="av-it" src="${ART + c.id}.png" width="40" height="40" alt=""><div><b>${c.n} Lv${c.lv}</b><span>${c.hp}/${c.max} HP</span></div><button class="av-btn ghost" data-d="${i}" ${G.squad.length > 1 ? "" : "disabled"}>DEPOSIT</button></div>`).join("")}<b style="text-align:left;color:#7fa6cf">BOX</b>${G.box.map((c, i) => `<div class="av-item"><img class="av-it" src="${ART + c.id}.png" width="40" height="40" alt=""><div><b>${c.n} Lv${c.lv}</b><span>${c.hp}/${c.max} HP</span></div><button class="av-btn ghost" data-w="${i}" ${G.squad.length < 6 ? "" : "disabled"}>WITHDRAW</button></div>`).join("") || "<p>Your box is empty.</p>"}</div><div class="av-row2"><button class="av-btn" data-a="x">CLOSE</button></div>`, (m) => {
      m.querySelectorAll("[data-d]").forEach((b) => { b.onclick = () => { const c = G.squad.splice(+b.dataset.d, 1)[0]; G.box.push(c); G.lead = 0; setPartner(true); refresh(); saveStory(); draw(); }; });
      m.querySelectorAll("[data-w]").forEach((b) => { b.onclick = () => { G.squad.push(G.box.splice(+b.dataset.w, 1)[0]); refresh(); saveStory(); draw(); }; }); m.querySelector("[data-a=x]").onclick = closeModal; }, true);
    draw();
  }

  /* ----- friends (follow the player, duel on the road, join the tournament) ----- */
  function friendTeam(f, lv) { const sec = f === G.friends.a ? [25, 63] : [66, 92]; return [[evoAt(f.pick || 1, lv), lv], [evoAt(sec[0], lv - 2), lv - 2], [evoAt(sec[1], lv - 3), lv - 3]]; }
  function ensureFriends() {
    if (G.fol.length || !G.flags.starter) return;
    [G.friends.a, G.friends.b].forEach((f) => { const m = makeTrainer(f.look); const l = labelSprite(f.name.toUpperCase(), 4, "rgba(10,20,40,.88)", "#8fe6ff"); l.position.set(0, 2.9, 0); m.add(l); scene.add(m); m.position.set(P.x - 1.5, 0, P.z); G.fol.push(m); });
  }
  const FRIEND_TOWN = {
    1: [["a", "Stonebrook! Rock-types here. Water and Grass moves will crush them!"], ["b", "Let’s heal at the Center, then we’ll each take on Flint’s gym."]],
    2: [["b", "Bluewater is so pretty! Marina’s Water gym is up next."], ["a", "Electric and Grass beat Water — think about your team!"]],
    3: [["a", "I can feel static in the air. Volt’s gym is fast — be careful."], ["b", "Ground-types are immune to Electric moves. Remember that!"]],
    4: [["b", "Mossveil smells like fresh leaves. Fern uses Grass types."], ["a", "Fire and Flying moves are great here."]],
    5: [["a", "It’s hot here in Emberfall! Water and Rock moves will help."], ["b", "Only two badges left after this. We’re so close!"]],
    6: [["b", "Brr! Frostpeak is freezing. Frost uses Ice types — bring Fire or Steel."], ["a", "After this, the Champions Stadium! I can’t wait."]],
    7: [["a", "We made it to the Stadium! Time for the big tournament."], ["b", "May the best trainer win — and I hope it’s you, " + "friend!"]],
  };
  async function friendDuel(key) {
    const f = G.friends[key], lv = 8 + G.badges.length * 6;
    G.cut = true; await say([{ n: f.name, t: "Hey " + G.sv.name + "! Let’s see who’s stronger — battle me!" }]); await flashT();
    const r = await fightTeam({ name: f.name, look: f.look, xpm: 1.2 }, friendTeam(f, lv)); G.cut = false;
    if (r.res === "lose") return blackout();
    addCoins(250 + G.badges.length * 100); G.flags["fd" + key + G.badges.length] = 1; saveStory(); refresh(); await say([{ n: f.name, t: "Wow, you beat me! Here, I’ll pay up — see you at the next town!" }, { n: "", t: "You received 🥮 " + (250 + G.badges.length * 100) + "!" }]); await evolveAll();
  }
  async function arrive(i) {
    if (!G.visited.includes(i)) { G.visited.push(i); toast({ icon: "🗺️", title: TOWNS[i].n, message: "Added to your fly list." }); }
    const k = "town" + i; if (G.flags[k]) return; G.flags[k] = 1; saveStory();
    const L = FRIEND_TOWN[i]; if (!L || !G.flags.starter) return; G.cut = true; await say(L.map(([w, t]) => ({ n: G.friends[w].name, t }))); G.cut = false;
  }
  function routeEnter(ri) {
    const key = ri === 1 ? "a" : ri === 3 ? "b" : ri === 5 ? "a" : null; if (!key || !G.flags.starter) return; const f = "fd" + key + G.badges.length; if (G.flags[f]) return; G.flags[f] = 1; guard(() => friendDuel(key));
  }

  /* ----- fights ----- */
  const themeOf = () => (SC && SC.kind === "gym" ? "gym" : SC && SC.kind === "stadium" ? "stadium" : "grass");
  const fightTeam = (T, team) => battle({ foes: team.map(([id, lv]) => mkL(SPECIES[id], lv)), trainer: true, name: T.name, look: T.look, theme: themeOf(), xpm: T.xpm || 1 });
  async function evolveAll() {
    for (const c of G.squad.slice()) { const e = EVO[c.id]; if (!e || c.lv < e[1]) continue; const to = SPECIES[e[0]]; if (!to) continue; await say(["What? " + c.n + " is evolving!", c.n + " evolved into " + to.n + "!"]); const om = c.max; Object.assign(c, { id: to.id, n: to.n, s: to.s, t: to.t, k: to.k }); restat(c); c.hp = Math.min(c.max, c.hp + c.max - om); sfx(880, 0.2, "sine", 0.1); setPartner(true); refresh(); }
    saveStory();
  }
  function blackout() {
    G.cut = true; const l = Math.min(150, Math.floor(getCoins() * 0.1)); if (l > 0) addCoins(-l); G.squad.forEach(healMon);
    const sp = G.spawn || { x: 30, z: 4 }; guard(async () => { await flashT(); enterScene(WORLD, sp.x, sp.z, 0); setPartner(true); refresh(); G.cut = false; await say(["You blacked out!", "You were rushed back to the last place you healed" + (l ? " and dropped 🥮 " + l + "." : ".")]); saveStory(); });
  }
  async function trainerBattle(T) {
    G.cut = true; const team = typeof T.team === "function" ? T.team() : T.team; await flashT(); T.mesh.visible = false;
    const r = await fightTeam(T, team); T.mesh.visible = true; refresh();
    if (r.res === "lose") return blackout();
    G.cut = false; if (!G.def.includes(T.id)) G.def.push(T.id); const rw = Math.round(T.reward || 0); addCoins(rw); qEvent("beat", 1); G.flags.tb = (G.flags.tb || 0) + 1;
    await say([...lines(T.name, T.win), "You received 🥮 " + rw + "!"]); await evolveAll(); if (T.after) T.after(); saveStory();
  }
  function engageTrainer(T) {
    G.cut = true; P.moving = false; floatMark(T.mesh); T.mesh.rotation.y = Math.atan2(P.x - T.x, P.z - T.z); P.rot = Math.atan2(T.x - P.x, T.z - P.z);
    later(() => { G.walk = { T, then: () => dialog(lines(T.name, T.intro), () => guard(() => trainerBattle(T))) }; }, 700);
  }
  function floatMark(m) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.bang, transparent: true, depthWrite: false })); s.scale.set(1.6, 1.6, 1); s.position.set(0, 3.4, 0); m.add(s); setTimeout(() => m.remove(s), 900); sfx(880, 0.15, "square", 0.08); }
  async function wildBattle(ri) {
    const rt = RT[ri], sp = SPECIES[rnd(rt.ids)], lv = rt.lv[0] + Math.floor(Math.random() * (rt.lv[1] - rt.lv[0] + 1)), foe = mkL(sp, lv);
    G.cut = true; await flashT(); const r = await battle({ foes: [foe], trainer: false, theme: "grass" }); refresh();
    if (r.res === "lose") return blackout();
    G.cut = false; if (r.res === "win") { qEvent("wins", 1); G.wins = (G.wins || 0) + 1; } if (r.res === "caught") qEvent("catch", 1);
    saveStory(); await evolveAll();
  }

  /* ----- tournament ----- */
  function showBracket(b, cont) {
    return new Promise((res) => {
      if (!b) { dialog(lines("Registrar", ["No tournament is running. Talk to me to enter!"]), res); return; }
      const col = (arr) => arr.map((m) => `<div class="bk-m">${m.map((n) => `<div class="bk-p${n === b.me ? " me" : ""}${b.out && b.out.includes(n) ? " out" : ""}">${n}</div>`).join("")}</div>`).join("");
      modal(`<h2>TOURNAMENT BRACKET</h2><p>${b.title || "Champions Cup"}</p><div class="bk"><div><small>QUARTER-FINALS</small>${col(b.r[0])}</div><div><small>SEMI-FINALS</small>${col(b.r[1])}</div><div><small>FINAL</small>${col(b.r[2])}</div></div><div class="av-row2"><button class="av-btn" data-a="x">${cont ? "CONTINUE ▶" : "CLOSE"}</button></div>`, (m) => { m.querySelector("[data-a=x]").onclick = () => { closeModal(); res(); }; }, true);
    });
  }
  function registrarTalk() {
    if (G.badges.length < 6) { dialog(lines("Registrar", ["Welcome to Champions Stadium! Only trainers with all 6 badges may enter the tournament."])); return; }
    dialog(lines("Registrar", [G.flags.won ? "Our reigning champion! Care for another round?" : "Welcome, trainer! You and your friends qualify. Ready to enter the Champions Cup?"]), () => {
      modal(`<h2>CHAMPIONS CUP</h2><p>8 trainers, 3 rounds. Win every battle to take the trophy!</p><div class="av-row2"><button class="av-btn ghost" data-a="no">NOT YET</button><button class="av-btn" data-a="go">ENTER</button></div>`, (m) => { m.querySelector("[data-a=no]").onclick = closeModal; m.querySelector("[data-a=go]").onclick = () => { closeModal(); guard(runTournament); }; });
    });
  }
  async function runTournament() {
    G.cut = true; const A1 = G.friends.a.name, B1 = G.friends.b.name, me2 = G.sv.name;
    const pool = [me2, A1, B1, "Ace Nova", "Ace Brook", "Ace Cinder", "Ace Gale", "Champion Drake"].sort(() => Math.random() - 0.5);
    const lookOf = (n) => (n === A1 ? G.friends.a.look : n === B1 ? G.friends.b.look : npcLook(n));
    const teamOf = (n, rd) => { const lv = 38 + rd * 4 + (n === "Champion Drake" ? 3 : 0); if (n === A1) return friendTeam(G.friends.a, lv); if (n === B1) return friendTeam(G.friends.b, lv); const ids = n === "Champion Drake" ? [65, 130, 6, 149] : n === "Ace Nova" ? [26, 64, 59] : n === "Ace Brook" ? [131, 9, 87] : n === "Ace Cinder" ? [6, 78, 59] : [94, 68, 76]; return ids.map((id, i) => [evoAt(id, lv - i), lv - i]); };
    let cur = pool, b = { title: "Champions Cup", me: me2, r: [[], [], []], out: [] };
    for (let rd = 0; rd < 3; rd++) {
      const pairs = []; for (let i = 0; i < cur.length; i += 2) pairs.push([cur[i], cur[i + 1]]); b.r[rd] = pairs; G.flags.bracket = b; saveStory();
      await showBracket(b, true); const next = [];
      for (const [x, y] of pairs) {
        if (x === me2 || y === me2) {
          const opp = x === me2 ? y : x; await say([{ n: "Announcer", t: "Next match: " + me2 + " versus " + opp + "!" }]); await flashT();
          const r = await fightTeam({ name: opp, look: lookOf(opp), xpm: 1.5 }, teamOf(opp, rd)); refresh();
          if (r.res !== "win") { b.out.push(me2); G.flags.bracket = b; G.cut = false; const gain = 300 + rd * 300; addCoins(gain); await say([{ n: "Announcer", t: "You were knocked out in round " + (rd + 1) + "! Better luck next time." }, "You received 🥮 " + gain + " for taking part."]); await showBracket(b, false).catch(() => {}); G.squad.forEach(healMon); refresh(); saveStory(); return; }
          b.out.push(opp); next.push(me2); await say([{ n: "Announcer", t: me2 + " wins the match!" }, opp === A1 || opp === B1 ? { n: opp, t: "Great battle! Go win it all!" } : { n: opp, t: "You’re really strong…" }]); await evolveAll();
        } else { const w = Math.random() < 0.5 ? x : y; next.push(w); b.out.push(w === x ? y : x); }
      }
      cur = next;
    }
    b.r[2] = [[cur[0]]]; G.flags.bracket = b; G.cut = false; const first = !G.flags.won; G.flags.won = true; G.squad.forEach(healMon);
    const gain = first ? 5000 : 1500; addCoins(gain); if (first) { giveGems(50); giveBalls(1, "master"); }
    await say([{ n: "Announcer", t: "🏆 " + me2 + " is the CHAMPION of the Champions Cup!" }, { n: G.friends.a.name, t: "You did it, " + me2 + "! Congratulations!" }, { n: G.friends.b.name, t: "What a journey! The three of us will never forget this." }, "You received 🥮 " + gain + (first ? ", 💎 50 and a Master Ball!" : "!")]);
    modal(`<h2 class="win">🏆 CHAMPION!</h2><p>${G.sv.name} won the Champions Cup with a team of ${G.squad.length}!</p><div class="av-stats"><div class="av-stat"><small>BADGES</small><b>6/6</b></div><div class="av-stat"><small>QUESTS</small><b>${Object.values(G.q).filter((q) => q.s === 3).length}</b></div><div class="av-stat"><small>CAUGHT</small><b>${G.flags.caught || 0}</b></div></div><div class="av-row2"><button class="av-btn" data-a="x">CONTINUE</button></div>`, (m) => { m.querySelector("[data-a=x]").onclick = closeModal; }); saveStory(); refresh();
  }

  /* ----- menu hub (party / bag / quests / map / trainer card) ----- */
  function hub(tab) {
    if (!G || BT || DL || G.cut) return; tab = tab || "party";
    const tabs = [["party", "POKÉMON"], ["bag", "BAG"], ["quests", "QUESTS"], ["map", "MAP"], ["card", "TRAINER"]];
    const head = '<div class="av-tabs">' + tabs.map(([k, n]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${n}</button>`).join("") + "</div>"; let body = "";
    if (tab === "party") body = G.squad.map((c, i) => `<div class="av-item"><img class="av-it" src="${ART + c.id}.png" width="46" height="46" alt=""><div><b>${c.n} Lv.${c.lv}${i === G.lead ? " ★" : ""}</b><span>${c.t.map((x) => x.toUpperCase()).join(" / ")} · HP ${c.hp}/${c.max} · EXP ${c.xp}/${xpNeed(c.lv)}</span><span class="av-bar"><u class="${hpCls(c)}" style="width:${(c.hp / c.max) * 100}%"></u></span><span style="color:#7fa6cf">${movesFor(c).map((m) => m.n).join(" · ")}</span></div><button class="av-btn ghost" data-l="${i}" ${c.hp > 0 && i !== G.lead ? "" : "disabled"}>LEAD</button></div>`).join("");
    else if (tab === "bag") body = '<div class="av-shop">' + ["potion", "super", "hyper", "revive", "berry", "candy", "mail"].filter((k) => G.bag[k]).map((k) => `<div class="av-item">${itemImg(k, 40)}<div><b>${(ITEMS[k] || { n: "Letter" }).n} ×${G.bag[k]}</b><span>${ITEMS[k] && ITEMS[k].heal ? "Heals " + ITEMS[k].heal + " HP" : k === "revive" ? "Revives a fainted Pokémon" : k === "mail" ? "A letter to deliver" : "Raises a level"}</span></div>${ITEMS[k] ? `<button class="av-btn ghost" data-u="${k}">USE</button>` : ""}</div>`).join("") + BALLS.map((b) => ballCnt(b.id) ? `<div class="av-item">${itemImg(b.id, 40)}<div><b>${b.n} ×${ballCnt(b.id)}</b><span>For catching wild Pokémon</span></div></div>` : "").join("") + "</div>";
    else if (tab === "quests") { const act = QUESTS.filter((q) => qState(q.id).s === 1 || qState(q.id).s === 2); body = '<div class="av-shop">' + (act.map((q) => { const st = qState(q.id); return `<div class="av-item"><span style="font-size:22px">${st.s === 2 ? "✅" : "📜"}</span><div><b>${q.title}</b><span>${q.desc}</span><span style="color:#ffcf45">${st.s === 2 ? "Ready — return to " + q.giver : st.p + "/" + q.n + " · from " + q.giver + " (" + TOWNS[q.town].n + ")"}</span></div></div>`; }).join("") || "<p>No active quests. Talk to townspeople with a ❗ above their heads!</p>") + `<p style="color:#7fa6cf">Completed: ${Object.values(G.q).filter((q) => q.s === 3).length} / ${QUESTS.length}</p></div>`; }
    else if (tab === "map") body = '<div class="av-wm"><i></i>' + TOWNS.map((t, i) => `<b class="${G.visited.includes(i) ? "v" : ""}" style="left:${(t.c / 1040) * 100}%" title="${t.n}">${i === 0 ? "🏠" : t.stadium ? "🏆" : G.badges.includes(t.gym) ? GYMS[t.gym].ic : "●"}</b>`).join("") + `<u style="left:${clamp(P.x / 1040, 0, 1) * 100}%">▼</u></div><div class="av-shop">${TOWNS.map((t, i) => (G.visited.includes(i) ? `<div class="av-item"><div><b>${t.n}</b><span>${t.gym !== undefined ? GYMS[t.gym].ty.toUpperCase() + " gym · " + GYMS[t.gym].leader : t.stadium ? "Tournament hall" : "Home town"}</span></div><button class="av-btn ghost" data-f="${i}" ${SC && SC.id === "world" ? "" : "disabled"}>✈ FLY</button></div>` : "")).join("")}</div>`;
    else body = `<canvas id="av-card" width="200" height="240"></canvas><div class="av-stats"><div class="av-stat"><small>NAME</small><b style="font-size:14px">${G.sv.name}</b></div><div class="av-stat"><small>BADGES</small><b>${G.badges.length}/6</b></div><div class="av-stat"><small>MONEY</small><b style="font-size:14px">🥮 ${getCoins().toLocaleString()}</b></div></div><p>${GYMS.map((g, i) => (G.badges.includes(i) ? g.ic : "▫️")).join(" ")}</p><div class="av-row2"><button class="av-btn ghost" data-a="exit">SAVE & EXIT</button><button class="av-btn" data-a="x">RESUME</button></div>`;
    modal(`<h2>MENU</h2>${head}<div class="av-shop">${tab === "bag" || tab === "map" || tab === "quests" ? "" : ""}${body}</div>${tab === "card" ? "" : '<div class="av-row2"><button class="av-btn" data-a="x">RESUME</button></div>'}`, (m) => {
      m.querySelectorAll("[data-t]").forEach((b) => { b.onclick = () => hub(b.dataset.t); }); const x = m.querySelector("[data-a=x]"); if (x) x.onclick = closeModal; const ex = m.querySelector("[data-a=exit]"); if (ex) ex.onclick = () => { saveStory(); menu(); };
      m.querySelectorAll("[data-l]").forEach((b) => { b.onclick = () => { G.lead = +b.dataset.l; setPartner(true); refresh(); saveStory(); hub("party"); }; });
      m.querySelectorAll("[data-u]").forEach((b) => { b.onclick = () => useItemMenu(b.dataset.u); });
      m.querySelectorAll("[data-f]").forEach((b) => { b.onclick = () => { const t = TOWNS[+b.dataset.f]; closeModal(); G.cut = true; flashT().then(() => { enterScene(WORLD, t.c, 2, 0); G.cut = false; setPartner(true); saveStory(); }); }; });
      const cv = m.querySelector("#av-card"); if (cv) drawAvatar(cv, G.look, 0.5);
    }, true);
  }
  function useItemMenu(k) {
    const it = ITEMS[k]; if (!it || !it.heal && k !== "revive" && k !== "candy") return;
    modal(`<h2>USE ${it.n.toUpperCase()}</h2><div class="av-shop">${G.squad.map((c, i) => { const ok = k === "revive" ? c.hp <= 0 : k === "candy" ? c.lv < 60 : c.hp > 0 && c.hp < c.max; return `<div class="av-item"><img class="av-it" src="${ART + c.id}.png" width="40" height="40" alt=""><div><b>${c.n} Lv${c.lv}</b><span>${c.hp}/${c.max} HP</span></div><button class="av-btn" data-p="${i}" ${ok ? "" : "disabled"}>USE</button></div>`; }).join("")}</div><div class="av-row2"><button class="av-btn ghost" data-a="x">BACK</button></div>`, (m) => {
      m.querySelector("[data-a=x]").onclick = () => hub("bag");
      m.querySelectorAll("[data-p]").forEach((b) => { b.onclick = () => { const c = G.squad[+b.dataset.p]; G.bag[k]--; if (k === "revive") c.hp = Math.round(c.max / 2); else if (k === "candy") { c.lv++; c.xp = 0; const om = c.max; restat(c); c.hp = Math.min(c.max, c.hp + c.max - om); } else c.hp = Math.min(c.max, c.hp + it.heal); sfx(780, 0.12, "sine", 0.1); refresh(); saveStory(); if (G.bag[k] > 0) useItemMenu(k); else hub("bag"); }; });
    }, true);
  }

  /* ----- starting / running a story ----- */
  let FOL = [];
  function startStory(sv) {
    runId++; abortBattle(); mode = "story"; DB.active = sv.id; saveDB(); const S = sv.story;
    FOL.forEach((m) => scene.remove(m)); FOL = [];
    G = { sv, name: sv.name, look: sv.look, squad: S.squad.map(unpack), box: (S.box || []).map(unpack), bag: Object.assign({}, S.bag), badges: S.badges.slice(), def: S.def.slice(), flags: Object.assign({}, S.flags), q: JSON.parse(JSON.stringify(S.q || {})), picked: S.picked.slice(), visited: S.visited.slice(), spawn: Object.assign({}, S.spawn), friends: S.friends, lead: 0, cut: false, near: null, walk: null, hist: [], fol: FOL, ret: null, loc: "", gd: 0, gcool: 0, area: "" };
    if (!WORLD) buildWorld();
    scene.remove(trainer); trainer = makeTrainer(G.look); scene.add(trainer);
    WORLD.picks.forEach((p) => { p.mesh.visible = !G.picked.includes(p.id); });
    Object.values(INTS).forEach((sc) => { [1, 4, 7].forEach((id) => { if (sc["st" + id]) sc["st" + id].visible = !G.flags.starter; }); });
    $("av-title").textContent = "STORY ADVENTURE"; $("av-map").hidden = false; $("av-map").classList.remove("big"); $("av-menu").hidden = false; showPad(true); hudLast = null; closeModal();
    if (!G.flags.momIntro && !G.flags.starter) { G.ret = { x: 10, z: -3.8 }; const h = getInterior("home"); enterScene(h, 0, h.d / 2 - 3, Math.PI); }
    else enterScene(WORLD, S.pos.x, S.pos.z, Math.PI / 2);
    me(); setPartner(true); ensureFriends(); refresh(); refreshMarks();
  }
  const gateHit = (x, z) => SC.gates.some((g) => !g.req() && Math.abs(x - g.x) < 1);
  const blocked = (x, z) => x < SC.bnd.x0 || x > SC.bnd.x1 || z < SC.bnd.z0 || z > SC.bnd.z1 || SC.col.hit(x, z) || (SC.id === "world" && gateHit(x, z));
  function story(dt) {
    const busy = DL || G.cut || modalOpen(), world = SC.id === "world";
    SC.npcs.forEach((n, i) => { if (n.mesh) n.mesh.position.y = Math.sin(T * 2 + i) * 0.03; });
    if (DL && DL.pos < DL.lines[DL.i].t.length) { DL.pos += dt * 60; paintDlg(); }
    if (G.walk) { const w = G.walk, dx = P.x - w.T.x, dz = P.z - w.T.z, d = Math.hypot(dx, dz); w.T.mesh.rotation.y = Math.atan2(dx, dz); if (d > 2.9) { w.T.x += (dx / d) * 6 * dt; w.T.z += (dz / d) * 6 * dt; w.T.mesh.position.set(w.T.x, 0, w.T.z); } else { const f = w.then; G.walk = null; f(); } }
    P.moving = false; G.near = null; G.gcool = Math.max(0, G.gcool - dt);
    if (!busy) {
      let dx = 0, dz = 0;
      if (held.ArrowLeft || held.a || pad.left) dx -= 1; if (held.ArrowRight || held.d || pad.right) dx += 1;
      if (held.ArrowUp || held.w || pad.up) dz -= 1; if (held.ArrowDown || held.s || pad.down) dz += 1;
      P.moving = !!(dx || dz);
      if (P.moving) {
        const l = Math.hypot(dx, dz), st = (held.Shift ? 12 : 8.5) * dt, nx = P.x + (dx / l) * st, nz = P.z + (dz / l) * st; if (!blocked(nx, P.z)) P.x = nx; if (!blocked(P.x, nz)) P.z = nz; P.rot = Math.atan2(dx, dz);
        if (world) { const pt = SC.patches.find((p) => Math.abs(P.x - p.x) < p.w / 2 && Math.abs(P.z - p.z) < p.d / 2); if (pt && me()) { G.gd += st; if (G.gd > 2.1) { G.gd = 0; if (Math.random() < 0.18) { guard(() => wildBattle(pt.r)); return; } } } else if (!pt) G.gd = 0; }
        for (const d of SC.doors) if (dz < 0 && Math.hypot(P.x - d.x, P.z - d.z) < d.r) { goInterior(d); return; }
        if (SC.exit && dz > 0 && Math.hypot(P.x - SC.exit.x, P.z - SC.exit.z) < 1.6) { leaveInterior(); return; }
      }
      if (world) {
        const gt = SC.gates.find((g) => !g.req() && Math.abs(P.x - g.x) < 2);
        if (gt && G.gcool <= 0) { G.gcool = 2; G.cut = true; P.x = gt.x + (P.x < gt.x ? -3 : 3); dialog(lines("Guard", [gt.msg]), () => { G.cut = false; }); return; }
        const ti = townIdx(P.x), ri = ROUTES.findIndex(([a, b]) => P.x >= a && P.x < b), area = ti >= 0 ? "t" + ti : ri >= 0 ? "r" + ri : "";
        if (area !== G.area) { G.area = area; if (ti >= 0) guard(() => arrive(ti)); else if (ri >= 0) routeEnter(ri); }
      }
      if (G.squad.length) for (const t of SC.trainers) { if (!t.sight || G.def.includes(t.id) || (t.when && !t.when())) continue; const tx = P.x - t.x, tz = P.z - t.z, d = Math.hypot(tx, tz); if (d < t.sight && tx * Math.sin(t.rot) + tz * Math.cos(t.rot) > d * 0.6) return engageTrainer(t); }
      let best = null, bd = 99; SC.inter.forEach((I) => { if (I.when && !I.when()) return; const q = I.ref || I, d = Math.hypot(P.x - q.x, P.z - q.z); if (d < I.r && d < bd) { best = I; bd = d; } });
      SC.doors.forEach((d) => { const dd = Math.hypot(P.x - d.x, P.z - d.z); if (dd < d.r + 0.6 && dd < bd) { best = { label: d.label, fn: () => goInterior(d) }; bd = dd; } });
      if (SC.exit && Math.hypot(P.x - SC.exit.x, P.z - SC.exit.z) < 2.4) best = { label: "Leave", fn: leaveInterior };
      G.near = best;
    }
    const pr = $("av-prompt"); pr.hidden = !G.near || busy; if (G.near && !busy) pr.textContent = "▶ " + G.near.label + "  (E / A)"; $("av-act").hidden = !G.near || busy;
    const loc = world ? locName(P.x) : SC.kind === "center" ? "Pokémon Center" : SC.kind === "mart" ? "Poké Mart" : SC.kind === "gym" ? GYMS[+SC.id.split(":")[1]].badge + " Gym" : SC.kind === "lab" ? "Prof. Linden’s Lab" : SC.kind === "home" ? "Your Home" : "Champions Stadium";
    if (loc !== G.loc) { G.loc = loc; const lb = $("av-loc"); lb.textContent = loc; lb.classList.remove("show"); void lb.offsetWidth; lb.classList.add("show"); }
    const h = G.hist, lastp = h[h.length - 1]; if (!lastp || Math.hypot(lastp.x - P.x, lastp.z - P.z) > 0.15) { h.push({ x: P.x, z: P.z }); if (h.length > 400) h.shift(); }
    FOL.forEach((m, k) => { const p = h[h.length - 1 - (k + 1) * 10]; if (p) { const dx = p.x - m.position.x, dz = p.z - m.position.z; if (Math.hypot(dx, dz) > 0.02) m.rotation.y = Math.atan2(dx, dz); m.position.set(p.x, 0, p.z); const lg = m.userData.legs, sw = P.moving ? Math.sin(T * 12 + k) * 0.5 : 0; lg[0].rotation.x = sw; lg[1].rotation.x = -sw; } });
    setHud(`<div class="av-hbox"><small>BADGES</small><b style="font-size:17px">${GYMS.map((g, i) => (G.badges.includes(i) ? g.ic : "▫️")).join("")}</b></div><div class="av-zbar"><span>LOCATION</span><b>${loc}</b></div><div class="av-hbox"><small>PARTY</small><b>${G.squad.filter((c) => c.hp > 0).length}/${G.squad.length}</b></div>`);
    drawMap();
  }
  function drawMap() {
    const c = $("av-map"), x = c.getContext("2d"), S = c.width, big = c.classList.contains("big");
    if (SC.id === "world") {
      const k = S / (big ? 260 : 120), X = (v) => (v - P.x) * k + S / 2, Z = (v) => (v - P.z) * k + S / 2;
      x.fillStyle = "#245a3c"; x.fillRect(0, 0, S, S); x.fillStyle = "#cdb98a"; x.fillRect(0, Z(-2.75), S, 5.5 * k);
      x.fillStyle = "#2f7a35"; SC.patches.forEach((p) => x.fillRect(X(p.x - p.w / 2), Z(p.z - p.d / 2), p.w * k, p.d * k));
      SC.builds.forEach((b) => { x.fillStyle = b.col; x.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), b.w * k, b.d * k); });
      x.strokeStyle = "#ff3b3b"; x.lineWidth = 4; SC.gates.forEach((g) => { if (!g.req()) { x.beginPath(); x.moveTo(X(g.x), 0); x.lineTo(X(g.x), S); x.stroke(); } });
      SC.trainers.forEach((t) => { if (t.sight && !G.def.includes(t.id)) { x.fillStyle = "#ff5a5a"; x.beginPath(); x.arc(X(t.x), Z(t.z), 5, 0, 6.283); x.fill(); } });
      x.fillStyle = "#ffcf45"; SC.npcs.forEach((n) => { if (n.mark.visible) x.fillRect(X(n.x) - 3, Z(n.z) - 3, 7, 7); }); SC.picks.forEach((p) => { if (!G.picked.includes(p.id)) { x.fillStyle = "#8fe6ff"; x.fillRect(X(p.x) - 2, Z(p.z) - 2, 5, 5); } });
    } else {
      const k = S / (Math.max(SC.w, SC.d) + 4), X = (v) => (v + SC.w / 2 + 2) * k, Z = (v) => (v + SC.d / 2 + 2) * k;
      x.fillStyle = "#0c1626"; x.fillRect(0, 0, S, S); x.fillStyle = "#2a3a5a"; x.fillRect(X(-SC.w / 2), Z(-SC.d / 2), SC.w * k, SC.d * k);
      x.fillStyle = "#ffcf45"; SC.npcs.forEach((n) => { x.beginPath(); x.arc(X(n.x), Z(n.z), 4, 0, 6.283); x.fill(); }); x.fillStyle = "#c93b3b"; x.fillRect(X(-2), Z(SC.d / 2 - 1.4), 4 * k, 6);
    }
    const px = SC.id === "world" ? S / 2 : (P.x + SC.w / 2 + 2) * (S / (Math.max(SC.w, SC.d) + 4)), pz = SC.id === "world" ? S / 2 : (P.z + SC.d / 2 + 2) * (S / (Math.max(SC.w, SC.d) + 4));
    x.save(); x.translate(px, pz); x.rotate(-P.rot + Math.PI); x.fillStyle = "#5de4ff"; x.strokeStyle = "#04121f"; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -11); x.lineTo(8, 9); x.lineTo(-8, 9); x.closePath(); x.fill(); x.stroke(); x.restore();
  }

  /* ----- main menu: story slots + character creator ----- */
  function enterLobby() {
    if (!WORLD) buildWorld(); const sv = activeSave(); scene.remove(trainer); trainer = makeTrainer(sv ? sv.look : DEF_LOOK); scene.add(trainer);
    G = null; mode = null; enterScene(WORLD, 30, 3, Math.PI); if (partnerH) { scene.remove(partnerH); partnerH = null; }
  }
  function menu() {
    abortBattle(); runId++; if (G) { saveStory(); } FOL.forEach((m) => scene.remove(m)); FOL = []; DL = null; mode = null; G = null; enterLobby();
    ["av-dlg", "av-prompt", "av-act", "av-menu"].forEach((id) => { $(id).hidden = true; }); $("av-loc").classList.remove("show"); setHud(""); showPad(false); $("av-map").hidden = true; $("av-title").textContent = "ADVENTURE"; $("av-team").innerHTML = ""; $("av-res").textContent = "🥮 " + getCoins().toLocaleString() + "  ·  ⚪ " + totalBalls();
    const saves = DB.saves.slice().sort((a, b) => (b.played || 0) - (a.played || 0));
    modal(`<h2>STORY ADVENTURE</h2><p>Journey across the region with your two friends, earn 6 badges and win the Champions Cup. Each story has its own trainer.</p>
      <div>${saves.map((s) => `<div class="slot${s.id === DB.active ? " act" : ""}"><canvas data-s="${s.id}" width="124" height="152"></canvas><div><b>${s.name}</b><span>ID ${s.id.slice(-6).toUpperCase()} · 🏅 ${s.story.badges.length}/6 · ${s.story.squad.length} Pokémon${s.story.flags && s.story.flags.won ? " · 🏆 Champion" : ""}</span></div><button class="av-btn" data-p="${s.id}">PLAY</button><button class="av-btn ghost" data-x="${s.id}">✕</button></div>`).join("") || '<p style="color:#7fa6cf">No stories yet — create your first trainer!</p>'}</div>
      <div class="av-row2"><button class="av-btn ghost" data-a="home">← HOME</button><button class="av-btn" data-a="new">＋ NEW STORY</button></div>`, (m) => {
      m.querySelectorAll("canvas[data-s]").forEach((cv) => { const s = DB.saves.find((q) => q.id === cv.dataset.s); drawAvatar(cv, s.look, 0.4, { base: 0.97 }); });
      m.querySelectorAll("[data-p]").forEach((b) => { b.onclick = () => startStory(DB.saves.find((q) => q.id === b.dataset.p)); });
      m.querySelectorAll("[data-x]").forEach((b) => { b.onclick = () => { const s = DB.saves.find((q) => q.id === b.dataset.x); modal(`<h2 class="lose">DELETE STORY?</h2><p>${s.name}’s story will be erased forever.</p><div class="av-row2"><button class="av-btn ghost" data-a="no">CANCEL</button><button class="av-btn" data-a="yes">DELETE</button></div>`, (m2) => { m2.querySelector("[data-a=no]").onclick = menu; m2.querySelector("[data-a=yes]").onclick = () => { DB.saves = DB.saves.filter((q) => q.id !== s.id); if (DB.active === s.id) DB.active = DB.saves[0] ? DB.saves[0].id : null; saveDB(); menu(); }; }); }; });
      m.querySelector("[data-a=new]").onclick = creator; m.querySelector("[data-a=home]").onclick = () => { closeModal(); close(); };
    }, true);
    if (!saves.length) creator();
  }
  function creator() {
    const look = Object.assign({}, DEF_LOOK); const sw = (key, arr) => arr.map((c, i) => `<button data-o="${key}" data-v="${i}" style="background:${c}"></button>`).join("");
    modal(`<h2>CREATE YOUR TRAINER</h2><div class="cr"><canvas id="cr-cv" width="220" height="300"></canvas><div class="cr-ctl">
      <label>TRAINER NAME<input id="cr-name" maxlength="12" placeholder="Enter a name" autocomplete="off"></label>
      <div class="row"><span>STYLE</span><button class="txt" data-o="g" data-v="b">BOY</button><button class="txt" data-o="g" data-v="g">GIRL</button></div>
      <div class="row"><span>SKIN</span>${sw("skin", SKIN)}</div><div class="row"><span>HAIR</span>${[0, 1, 2, 3].map((i) => `<button class="txt" data-o="hairS" data-v="${i}">${i + 1}</button>`).join("")}</div>
      <div class="row"><span>HAIR COLOR</span>${sw("hairC", HAIR)}</div><div class="row"><span>JACKET</span>${sw("jacket", CLOTH)}</div><div class="row"><span>PANTS</span>${sw("pants", PANTS)}</div>
      <div class="row"><span>CAP</span><button class="txt" data-o="capOn" data-v="1">ON</button><button class="txt" data-o="capOn" data-v="0">OFF</button></div><div class="row"><span>CAP COLOR</span>${sw("capC", CLOTH)}</div><div class="row"><span>BACKPACK</span>${sw("bag", CLOTH)}</div>
      <label>FRIEND 1<input id="cr-fa" maxlength="10" value="Mia"></label><label>FRIEND 2<input id="cr-fb" maxlength="10" value="Leo"></label></div></div>
      <div class="av-row2"><button class="av-btn ghost" data-a="back">← BACK</button><button class="av-btn" data-a="go">START ADVENTURE ▶</button></div>`, (m) => {
      const mark = () => m.querySelectorAll("[data-o]").forEach((b) => { const k = b.dataset.o, v = b.dataset.v, cur = k === "capOn" ? (look.capOn ? "1" : "0") : String(look[k]); b.classList.toggle("on", cur === v); }); mark();
      m.querySelectorAll("[data-o]").forEach((b) => { b.onclick = () => { const k = b.dataset.o, v = b.dataset.v; look[k] = k === "g" ? v : k === "capOn" ? v === "1" : +v; mark(); }; });
      const iv = setInterval(() => { const cv = $("cr-cv"); if (!cv) return clearInterval(iv); drawAvatar(cv, look, performance.now() / 1000); }, 60);
      m.querySelector("[data-a=back]").onclick = () => { clearInterval(iv); menu(); };
      m.querySelector("[data-a=go]").onclick = () => {
        clearInterval(iv); const name = ($("cr-name").value || "").trim() || "Trainer", fa = ($("cr-fa").value || "").trim() || "Mia", fb = ($("cr-fb").value || "").trim() || "Leo";
        const sv = { id: "s" + Date.now(), name, look: Object.assign({}, look), created: Date.now(), played: Date.now(), story: newStory() }; sv.story.friends = { a: { name: fa, look: npcLook(fa + "a"), pick: 0 }, b: { name: fb, look: npcLook(fb + "b"), pick: 0 } };
        DB.saves.push(sv); DB.active = sv.id; saveDB(); closeModal(); startStory(sv);
      };
    }, true);
  }

  /* ----- home screen: draw the active character + a Pokémon Center backdrop ----- */
  function drawHome(c, look, t) {
    const x = c.getContext("2d"), w = c.width, h = c.height; x.clearRect(0, 0, w, h);
    const sky = x.createLinearGradient(0, 0, 0, h * 0.62); sky.addColorStop(0, "#3d86e0"); sky.addColorStop(1, "#bfe3ff"); x.fillStyle = sky; x.fillRect(0, 0, w, h * 0.64);
    x.fillStyle = "rgba(255,255,255,.85)"; [[0.15, 0.1, 60], [0.7, 0.07, 80], [0.5, 0.17, 50]].forEach(([cx, cy, r], i) => { const ox = ((t * 6 + i * 120) % (w + 200)) - 100; x.beginPath(); x.ellipse((cx * w + ox) % (w + 100), cy * h, r, r * 0.35, 0, 0, 6.283); x.fill(); });
    const bx = w * 0.1, bw = w * 0.8, by = h * 0.3, bh = h * 0.34; x.fillStyle = "#f8f3ec"; x.fillRect(bx, by, bw, bh);
    x.fillStyle = "#e84a5f"; x.beginPath(); x.moveTo(bx - 14, by); x.lineTo(bx + bw + 14, by); x.lineTo(bx + bw - 22, by - h * 0.12); x.lineTo(bx + 22, by - h * 0.12); x.closePath(); x.fill(); x.fillStyle = "#c93b4f"; x.fillRect(bx - 14, by - 6, bw + 28, 10);
    x.fillStyle = "#fff"; x.beginPath(); x.arc(w / 2, by - h * 0.06, 28, 0, 6.283); x.fill(); x.fillStyle = "#e84a5f"; x.beginPath(); x.arc(w / 2, by - h * 0.06, 28, Math.PI, 6.283); x.fill(); x.fillStyle = "#222"; x.fillRect(w / 2 - 28, by - h * 0.06 - 3, 56, 6); x.beginPath(); x.arc(w / 2, by - h * 0.06, 9, 0, 6.283); x.fillStyle = "#fff"; x.fill(); x.strokeStyle = "#222"; x.lineWidth = 3; x.stroke();
    x.fillStyle = "#e84a5f"; x.fillRect(bx, by + 8, bw, 26); x.fillStyle = "#fff"; x.font = "900 20px Rajdhani, Arial"; x.textAlign = "center"; x.fillText("POKÉMON CENTER", w / 2, by + 28);
    x.fillStyle = "#7fc4ff"; x.fillRect(w / 2 - 44, by + bh - 82, 88, 82); x.fillStyle = "#a8dcff"; x.fillRect(w / 2 - 40, by + bh - 78, 38, 78); x.fillRect(w / 2 + 2, by + bh - 78, 38, 78);
    [0.22, 0.78].forEach((fx) => { x.fillStyle = "#7fc4ff"; x.fillRect(w * fx - 36, by + 52, 72, 56); x.fillStyle = "#ffffff55"; x.fillRect(w * fx - 32, by + 56, 28, 48); });
    const gr = x.createLinearGradient(0, h * 0.64, 0, h); gr.addColorStop(0, "#d3c4a0"); gr.addColorStop(1, "#9e8d6c"); x.fillStyle = gr; x.fillRect(0, h * 0.64, w, h * 0.36); x.fillStyle = "#4f9e4a"; x.fillRect(0, h * 0.62, w, h * 0.03);
    const glow = x.createRadialGradient(w / 2, h * 0.9, 10, w / 2, h * 0.9, w * 0.4); glow.addColorStop(0, "rgba(93,228,255,.55)"); glow.addColorStop(1, "rgba(93,228,255,0)"); x.fillStyle = glow; x.fillRect(0, h * 0.7, w, h * 0.3);
    x.strokeStyle = "rgba(93,228,255,.8)"; x.lineWidth = 3; x.beginPath(); x.ellipse(w / 2, h * 0.935, 120 + Math.sin(t * 2) * 6, 22, 0, 0, 6.283); x.stroke();
    x.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 14; i++) { const px = (i * 83 + t * 18) % w, py = h - ((i * 47 + t * 30) % (h * 0.5)) - 20; x.fillRect(px, py, 3, 3); }
    drawAvatar(c, look, t, { noClear: true, scale: 0.92, base: 0.955 });
  }
  function initHome() {
    const f = document.querySelector("#home-page .fighters"); if (!f || $("home-avatar")) return;
    const d = document.createElement("div"); d.id = "home-avatar"; d.innerHTML = '<canvas width="560" height="520"></canvas><div class="ha-plate"><b id="ha-name"></b><span id="ha-sub"></span></div>'; f.appendChild(d);
    d.onclick = () => { try { window.openAdventure(); } catch (e) {} };
    const cv = d.querySelector("canvas"), upd = () => { const sv = activeSave(); $("ha-name").textContent = sv ? sv.name.toUpperCase() : "NEW TRAINER"; $("ha-sub").textContent = sv ? "🏅 " + sv.story.badges.length + "/6 · STORY ADVENTURE" : "TAP TO CREATE YOUR TRAINER"; };
    setInterval(() => { const h = $("home-page"); if (!h || h.classList.contains("hidden") || document.hidden) return; const sv = activeSave(); drawHome(cv, sv ? sv.look : DEF_LOOK, performance.now() / 1000); }, 50);
    upd(); addEventListener("pf-adv-change", upd);
  }

  /* ----- loop, camera, setup ----- */
  let running = false, last = 0;
  function update(dt) {
    T += dt; tickPart(dt);
    if (BT && BT.cam) {
      [BT.pH, BT.fH].forEach((h) => h && tickMon(h, dt));
      let sx = 0, sy = 0; if (shakeT > 0) { shakeT -= dt; sx = (Math.random() - 0.5) * shakeP; sy = (Math.random() - 0.5) * shakeP * 0.6; }
      camera.position.set(SO.x + 0.4 + Math.sin(T * 0.35) * 0.35 + sx, 3.7 + Math.sin(T * 0.5) * 0.1 + sy, SO.z + 10.2); camera.lookAt(SO.x + 0.2, 1.7, SO.z - 0.8); return;
    }
    if (WORLD) WORLD.clouds.forEach((c) => { c.position.x += dt * 0.8; if (c.position.x > 1120) c.position.x = -100; });
    if (partnerH) tickMon(partnerH, dt);
    if (mode === "story" && G) story(dt);
    if (trainer) { trainer.position.set(P.x, 0, P.z); trainer.rotation.y = P.rot; const lg = trainer.userData.legs, sw = P.moving ? Math.sin(T * 12) * 0.5 : 0; lg[0].rotation.x = sw; lg[1].rotation.x = -sw; }
    if (partnerH && mode === "story") {
      const tx = P.x - Math.sin(P.rot) * 1.7 + Math.cos(P.rot), tz = P.z - Math.cos(P.rot) * 1.7 - Math.sin(P.rot), ox = partnerH.position.x, oz = partnerH.position.z;
      partnerH.position.x += (tx - ox) * (1 - Math.exp(-5 * dt)); partnerH.position.z += (tz - oz) * (1 - Math.exp(-5 * dt)); const mx = partnerH.position.x - ox; if (Math.abs(mx) > 0.002) face(partnerH, mx > 0);
    }
    let cx, cy, cz, lx, ly, lz;
    if (mode === "story" && SC) { const inn = SC.id !== "world"; cx = P.x; cy = inn ? 11 : 9; cz = P.z + (inn ? 10.5 : 11); lx = P.x; ly = 1; lz = P.z; }
    else { const a = T * 0.12; cx = P.x + Math.sin(a) * 11; cy = 5; cz = P.z + Math.cos(a) * 11; lx = P.x; ly = 1.5; lz = P.z; }
    const k = camSnap ? 1 : 1 - Math.exp(-4.5 * dt); camSnap = false; camera.position.x += (cx - camera.position.x) * k; camera.position.y += (cy - camera.position.y) * k; camera.position.z += (cz - camera.position.z) * k;
    camLook.x += (lx - camLook.x) * k; camLook.y += (ly - camLook.y) * k; camLook.z += (lz - camLook.z) * k; camera.lookAt(camLook.x, camLook.y, camLook.z);
  }
  const camLook = { x: 0, y: 1, z: 0 };
  function frame(now) {
    if (!running) return; const p = $("adventure-page"); if (!p || p.classList.contains("hidden")) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    try { update(dt); renderer.render(scene, camera); } catch (e) { showErr(e); running = false; return; }
    requestAnimationFrame(frame);
  }
  function resize() { const p = $("adventure-page"); if (!renderer || !p) return; const w = p.clientWidth || innerWidth, h = p.clientHeight || innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function webglOK() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")); } catch (e) { return false; } }
  let built = false;
  function setup(cb) {
    if (built) return cb(); built = true; injectCSS();
    $("adventure-page").innerHTML = `<div id="av-3d"></div>
      <div id="av-top"><button class="av-btn ghost" id="av-back">← BACK</button><button class="av-btn ghost" id="av-menu" hidden>☰ MENU</button><div id="av-title"></div><span class="av-pill" id="av-res"></span></div>
      <div id="av-hud" hidden></div><canvas id="av-map" width="300" height="300" hidden></canvas><div id="av-feed"></div>
      <div id="av-bottom"><div id="av-team"></div><div id="av-pad" hidden><button class="av-btn u" data-k="up">▲</button><button class="av-btn l" data-k="left">◀</button><button class="av-btn d" data-k="down">▼</button><button class="av-btn r" data-k="right">▶</button></div></div>
      <div id="av-prompt" hidden></div><button class="av-btn" id="av-act" hidden>A</button><div id="av-loc"></div><div id="av-dlg" hidden></div><div id="av-flash"></div>
      <div id="bt" hidden><div id="bt-flash"></div><div class="bt-box foe" id="bt-foe"></div><div class="bt-box me" id="bt-me"></div><div id="bt-bottom"><div id="bt-text"></div><div id="bt-cmd"></div></div></div>
      <div id="av-modal" hidden></div><div id="av-err" hidden></div>`;
    $("av-back").onclick = onBack; $("av-menu").onclick = () => hub("party"); $("av-act").onclick = interact; $("av-dlg").onclick = () => advanceDlg(); $("av-map").onclick = () => { $("av-map").classList.toggle("big"); };
    document.querySelectorAll("#av-pad button").forEach((b) => { const k = b.dataset.k; b.addEventListener("pointerdown", (e) => { e.preventDefault(); pad[k] = true; }); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => { pad[k] = false; })); });
    if (!webglOK()) { built = false; const e = $("av-err"); e.hidden = false; e.innerHTML = "<b>3D graphics (WebGL) isn’t available in this browser.</b><br>Turn on hardware acceleration in your browser settings (Edge/Chrome → Settings → System), then reload the page."; return; }
    const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = () => { try { init3d(); cb(); } catch (e) { built = false; showErr(e); } };
    s.onerror = () => { built = false; const e = $("av-err"); e.hidden = false; e.textContent = "Couldn’t load the 3D engine — check your connection and try again."; };
    document.head.appendChild(s);
  }
  function init3d() {
    THREE = window.THREE; try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { renderer = new THREE.WebGLRenderer({ antialias: false }); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6)); $("av-3d").appendChild(renderer.domElement);
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(52, 1, 0.1, 520); scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8a5a, 0.95)); const sun = new THREE.DirectionalLight(0xfff2d0, 0.65); sun.position.set(14, 24, 10); scene.add(sun);
    fxGroup = new THREE.Group(); scene.add(fxGroup); initTex(); trainer = makeTrainer(DEF_LOOK); scene.add(trainer); initStage(); addEventListener("resize", resize);
  }
  function onBack() { if (BT || DL) return; if (mode) { menu(); return; } close(); }
  function open() {
    loadDB(); $("home-page").classList.add("hidden"); $("adventure-page").classList.remove("hidden");
    setup(() => { resize(); menu(); if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } });
  }
  function close() {
    try { if (G) saveStory(); } catch (e) {} running = false; runId++; abortBattle(); $("adventure-page").classList.add("hidden");
    if (typeof showHomeScreen === "function") showHomeScreen(); else $("home-page").classList.remove("hidden");
  }
  addEventListener("keydown", (e) => {
    const p = $("adventure-page"); if (!p || p.classList.contains("hidden")) return; if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName || "")) return;
    held[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault();
    if (!e.repeat && mode === "story") { if (e.key === "e" || e.key === "E" || e.key === " " || e.key === "Enter") { e.preventDefault(); interact(); } else if ((e.key === "m" || e.key === "M") && !modalOpen()) hub("party"); }
  });
  addEventListener("keyup", (e) => { held[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  addEventListener("blur", () => { Object.keys(held).forEach((k) => { held[k] = false; }); });

  /* ---------- boot ---------- */
  const CSS = `
#adventure-page{padding:0!important;display:block;background:#0b1220!important;overflow:hidden;font-family:var(--font-body)}
#adventure-page *{box-sizing:border-box}#adventure-page [hidden]{display:none!important}
#av-3d{position:absolute;inset:0}#av-3d canvas{display:block;width:100%;height:100%}
#av-top{position:absolute;top:0;left:0;right:0;z-index:5;display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 18px;background:linear-gradient(180deg,rgba(5,11,20,.8),transparent);pointer-events:none}
#av-top>*{pointer-events:auto}#av-title{flex:1;text-align:center;font:800 14px var(--font-display);letter-spacing:2px;color:#cfe6ff}
.av-btn{font:800 14px var(--font-display);letter-spacing:.6px;color:#fff;min-height:44px;padding:0 16px;border-radius:12px;background:linear-gradient(145deg,#ffcf45,#ff762e);box-shadow:0 6px 18px rgba(255,118,46,.35);cursor:pointer;border:0;touch-action:manipulation}
.av-btn:active{transform:scale(.96)}.av-btn:disabled{opacity:.4;filter:grayscale(.5);cursor:default}
.av-btn.ghost{background:rgba(12,27,45,.85);border:1px solid #36506b;color:#cfe0f0;box-shadow:none;min-height:38px;font-size:12px}
.av-pill{background:rgba(12,27,45,.85);border:1px solid #29415b;border-radius:999px;padding:7px 12px;font:700 12px var(--font-display);color:#eaf3ff;white-space:nowrap}
#av-hud{position:absolute;top:calc(58px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:4;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;pointer-events:none;max-width:92vw}
.av-hchip{background:rgba(7,17,31,.82);border:1px solid #36506b;border-radius:10px;padding:6px 11px;font:800 12px var(--font-display);letter-spacing:.8px;color:#eaf3ff}
.av-hchip.warn{border-color:#ff685e;color:#ff9b93}.av-hchip b{color:#ffcf45}
#av-map{position:absolute;top:calc(100px + env(safe-area-inset-top));right:12px;width:112px;height:112px;z-index:4;border-radius:14px;border:1px solid #36506b;box-shadow:0 6px 20px rgba(0,0,0,.4)}
#av-feed{position:absolute;top:calc(100px + env(safe-area-inset-top));left:12px;z-index:4;display:flex;flex-direction:column;gap:4px;pointer-events:none;max-width:56vw}
.av-feedln{background:rgba(7,17,31,.75);border-left:3px solid #ffcf45;border-radius:6px;padding:4px 9px;font:600 11px var(--font-body);color:#eaf3ff;animation:avfeed 5s forwards}
@keyframes avfeed{0%{opacity:0;transform:translateX(-12px)}6%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0}}
#av-msg{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:4;max-width:min(520px,90vw);text-align:center;color:#fff;background:rgba(7,17,31,.72);border-radius:10px;padding:6px 12px;font-size:12.5px;pointer-events:none}
#av-msg:empty{display:none}
#av-bottom{position:absolute;left:0;right:0;bottom:0;z-index:4;padding:10px 12px calc(10px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}
#av-bottom>*{pointer-events:auto}
#av-team{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.av-chip{display:flex;align-items:center;gap:6px;background:rgba(7,17,31,.85);border:1px solid #29415b;border-radius:12px;padding:3px 10px 3px 4px;min-width:104px}
.av-chip.lead{border-color:#ffcf45;box-shadow:0 0 0 1px #ffcf45 inset}.av-chip.down{opacity:.4;filter:grayscale(1)}
.av-chip img{width:32px;height:32px;object-fit:contain}.av-chip div{flex:1;min-width:0}.av-chip b{display:block;font:700 10.5px var(--font-display);color:#eaf3ff;letter-spacing:.4px}
.av-bar{display:block;height:6px;border-radius:4px;background:#1b2b40;overflow:hidden;margin-top:3px}.av-bar u{display:block;height:100%;background:linear-gradient(90deg,#55e6a0,#b9f36c);transition:width .25s}.av-bar u.mid{background:linear-gradient(90deg,#ffcc55,#ffe08a)}.av-bar u.low{background:linear-gradient(90deg,#ff685e,#ff9b6e)}
#av-pad{display:grid;grid-template-columns:repeat(3,58px);grid-template-rows:repeat(2,50px);gap:6px;padding:8px;border-radius:20px;background:rgba(6,14,24,.4);backdrop-filter:blur(4px)}
#av-pad .av-btn{padding:0;background:rgba(12,27,45,.85);border:1px solid #3a5878;box-shadow:none;touch-action:none;font-size:18px}
#av-pad .u{grid-column:2}#av-pad .l{grid-row:2}#av-pad .d{grid-row:2;grid-column:2}#av-pad .r{grid-row:2;grid-column:3}
#adventure-page.danger::after{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;box-shadow:inset 0 0 130px rgba(255,40,40,.6);animation:avpulse 1s infinite}
@keyframes avpulse{50%{opacity:.35}}
#av-battle{position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none;padding:calc(62px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom))}
#av-battle>*{pointer-events:auto}.av-cards{display:flex;justify-content:space-between;gap:10px}
.av-card{width:min(46%,230px);background:rgba(7,17,31,.88);border:1px solid #36506b;border-radius:14px;padding:9px 11px}.av-card.foe{text-align:right;border-color:#ff685e55}
.av-card .nm{font:800 14px var(--font-display);color:#fff;letter-spacing:.4px}.av-card .nm small{color:#8ba3bd;font-weight:600;font-size:10px;margin-left:4px}
.av-card .hp{display:block;height:9px;border-radius:6px;background:#1b2b40;overflow:hidden;margin-top:6px}.av-card .hp i{display:block;height:100%;background:linear-gradient(90deg,#55e6a0,#b9f36c);transition:width .3s}.av-card.foe .hp i{background:linear-gradient(90deg,#ffcc55,#ff685e)}
.av-types{display:flex;gap:4px;margin-top:5px}.av-card.foe .av-types{justify-content:flex-end}.av-ty{font:800 8.5px var(--font-display);letter-spacing:1px;padding:2px 7px;border-radius:99px;background:#2e5d7f;color:#fff}
.av-panel{max-width:520px;width:100%;margin:0 auto;background:linear-gradient(180deg,#11253b,#0a1729);border:1px solid #2f4d6b;border-radius:18px;padding:12px;box-shadow:0 20px 50px rgba(0,0,0,.5)}
#av-log{min-height:2.7em;color:#b7c8da;font-size:13px;line-height:1.4;margin-bottom:10px}
.av-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px}.av-acts .av-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:6px}.av-acts small{font:600 9px var(--font-body);opacity:.85;letter-spacing:.3px}
.av-acts .ghost small{opacity:.7}
#av-float{position:absolute;inset:0;z-index:7;pointer-events:none;overflow:hidden}
.av-fl{position:absolute;transform:translate(-50%,-50%);font:900 24px var(--font-display);color:#fff;text-shadow:0 2px 0 #000,0 0 10px rgba(0,0,0,.7);animation:avfl .95s ease-out forwards;white-space:nowrap}
.av-fl.g{color:#55e6a0}.av-fl.y{color:#ffcf45;font-size:15px}.av-fl.r{color:#ff9b93}
@keyframes avfl{0%{opacity:0;margin-top:10px}15%{opacity:1}100%{opacity:0;margin-top:-60px}}
#av-modal{position:absolute;inset:0;z-index:9;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,10,18,.78);backdrop-filter:blur(7px);animation:modal-backdrop-in .2s}
.av-sheet{width:min(560px,100%);max-height:92%;overflow-y:auto;background:linear-gradient(180deg,#11253b,#0a1729);border:1px solid #2f4d6b;border-radius:22px;padding:22px 18px 18px;text-align:center;box-shadow:0 25px 60px #000a,0 0 40px rgba(79,179,255,.1);animation:modal-card-in .3s cubic-bezier(.16,1,.3,1)}
.av-sheet h2{font:900 26px var(--font-display);letter-spacing:2px;background:linear-gradient(90deg,#fff,#63c7ff);-webkit-background-clip:text;color:transparent;font-style:italic}
.av-sheet h2.win{background:linear-gradient(90deg,#fff2a3,#ff9e35);-webkit-background-clip:text}.av-sheet h2.lose{background:linear-gradient(90deg,#ffb3ab,#ff685e);-webkit-background-clip:text}
.av-sheet p{color:#9db2c8;font-size:12.5px;line-height:1.5;margin:6px 0 14px}
.av-modes{display:flex;flex-direction:column;gap:10px}
.av-mode{display:flex;align-items:center;gap:14px;text-align:left;width:100%;padding:14px;border-radius:16px;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 22%,#0c1b2d),#0c1b2d 70%);border:1px solid color-mix(in srgb,var(--c) 55%,#29415b);color:#fff;cursor:pointer;transition:transform .12s,box-shadow .15s}
.av-mode:hover{transform:translateY(-2px);box-shadow:0 8px 26px color-mix(in srgb,var(--c) 35%,transparent)}
.av-mode .ic{width:54px;height:54px;flex:none;border-radius:14px;display:grid;place-items:center;font-size:28px;background:color-mix(in srgb,var(--c) 28%,#0a1220);border:1px solid color-mix(in srgb,var(--c) 60%,transparent)}
.av-mode b{display:block;font:900 17px var(--font-display);letter-spacing:1px}.av-mode span{display:block;font-size:11.5px;color:#a9bed3;line-height:1.4;margin-top:2px}.av-mode i{display:block;font:700 10px var(--font-display);letter-spacing:1px;color:var(--c);margin-top:5px;font-style:normal}
.av-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin:10px 0}
.av-pick{background:#0c1b2d;border:1px solid #29415b;border-radius:14px;padding:8px 4px;color:#eaf3ff;cursor:pointer;font:700 11px var(--font-display)}
.av-pick:hover{border-color:#4fb3ff}.av-pick img{width:62px;height:62px;object-fit:contain;display:block;margin:0 auto 2px}.av-pick small{display:block;color:#8ba3bd;font:600 9px var(--font-body)}
.av-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.av-stat{background:#0f1d2f;border:1px solid #23405c;border-radius:12px;padding:10px 4px}.av-stat small{display:block;font:700 9px var(--font-display);letter-spacing:1px;color:#7590aa}.av-stat b{font:900 18px var(--font-display);color:#fff}
.av-shop{display:flex;flex-direction:column;gap:8px;margin:10px 0}.av-item{display:flex;align-items:center;gap:10px;text-align:left;background:#0f1d2f;border:1px solid #23405c;border-radius:14px;padding:10px 12px}
.av-item div{flex:1}.av-item b{display:block;font:800 13px var(--font-display);color:#fff}.av-item span{font-size:11px;color:#8ba3bd}
.av-row2{display:flex;gap:10px;margin-top:12px}.av-row2 .av-btn{flex:1}
#av-bottom{flex-direction:row;justify-content:space-between;align-items:flex-end}
#av-team{flex-direction:column;flex-wrap:nowrap;align-items:stretch;gap:6px;max-width:46vw}
.av-chip{padding:4px 12px 4px 6px;min-width:150px;border-radius:14px;background:linear-gradient(90deg,rgba(14,30,52,.92),rgba(7,17,31,.88))}.av-chip img{width:42px;height:42px;filter:drop-shadow(0 3px 4px #0008)}
#av-hud{flex-wrap:nowrap;align-items:stretch;gap:8px}
.av-hbox{min-width:64px;text-align:center;background:linear-gradient(180deg,rgba(14,30,52,.94),rgba(7,17,31,.94));border:1px solid #36506b;border-radius:12px;padding:5px 10px;box-shadow:0 6px 16px rgba(0,0,0,.35)}
.av-hbox small{display:block;font:800 8.5px var(--font-display);letter-spacing:1.4px;color:#7fa6cf}.av-hbox b{font:900 24px/1.05 var(--font-display);color:#fff}
.av-zbar{position:relative;min-width:178px;text-align:center;background:linear-gradient(180deg,rgba(14,30,52,.94),rgba(7,17,31,.94));border:1px solid #36506b;border-radius:12px;padding:5px 12px 11px;box-shadow:0 6px 16px rgba(0,0,0,.35)}
.av-zbar span{display:block;font:800 9px var(--font-display);letter-spacing:1.3px;color:#9fc1df}.av-zbar b{font:900 19px/1.1 var(--font-display);color:#fff}
.av-zbar i{position:absolute;left:9px;right:9px;bottom:4px;height:4px;border-radius:3px;background:#1b2b40;overflow:hidden}.av-zbar u{display:block;height:100%;background:linear-gradient(90deg,#4fb3ff,#5de4ff);transition:width .25s linear}
.av-zbar.closing u{background:linear-gradient(90deg,#ff685e,#ffcf45)}.av-zbar.closing b{color:#ffcf45}.av-zbar.out{border-color:#ff685e;background:rgba(80,12,16,.92)}.av-zbar.out span{color:#ffb3ab}
#av-map{width:128px;height:128px;border-radius:50%;border:3px solid #36506b;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.5),0 0 0 2px rgba(5,11,20,.7);transition:width .2s,height .2s}
#av-map.big{position:absolute;z-index:8;width:min(88vw,380px);height:min(88vw,380px);top:50%;right:auto;left:50%;transform:translate(-50%,-50%);border-radius:18px;border-color:#5de4ff}
.av-tag{color:#7fa6cf;font:800 11px var(--font-display);letter-spacing:2px;margin:4px 0 12px}
.av-squad{display:flex;gap:8px;justify-content:center;margin:12px 0}.av-squad div{width:78px;background:#0c1b2d;border:1px solid #29415b;border-radius:12px;padding:6px 2px;font:700 10px var(--font-display);color:#cfe0f0}.av-squad img{width:58px;height:58px;object-fit:contain;display:block;margin:0 auto}
.av-rules{display:flex;flex-direction:column;gap:6px;text-align:left;margin:10px 0}.av-rule{display:flex;gap:10px;align-items:center;background:#0f1d2f;border:1px solid #23405c;border-radius:12px;padding:8px 12px;font-size:12px;color:#b7c8da;line-height:1.4}.av-rule i{font-style:normal;font-size:20px}.av-rule b{color:#ffcf45}
.av-drop{width:100%;min-height:56px;font-size:19px;letter-spacing:2px;margin-top:6px}
#av-dlg{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(660px,94vw);z-index:7;background:linear-gradient(180deg,#fbf7ea,#e9dfc4);color:#1b2433;border:4px solid #2b3a55;border-radius:16px;padding:12px 18px 16px;box-shadow:0 8px 0 #1b2433,0 18px 40px rgba(0,0,0,.45);cursor:pointer;font:600 15px/1.5 var(--font-body)}
#av-dlg .nm{font:900 12px var(--font-display);letter-spacing:1.5px;color:#c4483c;min-height:15px}#av-dlg .tx{min-height:3em}#av-dlg i{position:absolute;right:16px;bottom:8px;font-style:normal;color:#c4483c;animation:avblink .8s infinite}
@keyframes avblink{50%{opacity:.2}}
#av-prompt{position:absolute;left:50%;bottom:calc(172px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:5;background:rgba(7,17,31,.9);border:1px solid #ffcf45;color:#ffcf45;font:800 13px var(--font-display);letter-spacing:1px;padding:7px 16px;border-radius:999px;pointer-events:none;white-space:nowrap}
#av-act{position:absolute;right:92px;bottom:calc(150px + env(safe-area-inset-bottom));z-index:5;width:64px;height:64px;border-radius:50%;font-size:24px;padding:0}
#av-loc{position:absolute;top:calc(112px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:5;pointer-events:none;font:900 26px var(--font-display);letter-spacing:3px;color:#fff;text-shadow:0 3px 0 #000,0 0 18px rgba(0,0,0,.6);opacity:0;white-space:nowrap}
#av-loc.show{animation:avloc 3s ease-out}@keyframes avloc{0%{opacity:0;transform:translate(-50%,-12px)}12%{opacity:1;transform:translate(-50%,0)}75%{opacity:1}100%{opacity:0}}
#av-flash{position:absolute;inset:0;z-index:12;pointer-events:none;opacity:0;background:#fff}
#av-flash.on{animation:avflash .72s steps(1,end) forwards}@keyframes avflash{0%{opacity:1;background:#fff}12%{opacity:0}24%{opacity:1;background:#fff}36%{opacity:0}48%{opacity:1;background:#fff}60%{opacity:0}72%{opacity:1;background:#000}100%{opacity:1;background:#000}}
@media(max-width:560px){#av-act{right:78px;bottom:calc(140px + env(safe-area-inset-bottom))}#av-loc{font-size:19px}#av-dlg{font-size:13.5px}}
@media(max-width:560px){.av-zbar{min-width:130px;padding:5px 8px 11px}.av-hbox{min-width:54px;padding:5px 7px}#av-map{width:104px;height:104px}.av-chip{min-width:128px}}
#bt{position:absolute;inset:0;z-index:6;pointer-events:none}#bt>*{pointer-events:auto}
#bt-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:2}
.bt-box{position:absolute;min-width:190px;background:linear-gradient(180deg,#f8f4e8,#e4dcc4);color:#1b2433;border:3px solid #2b3a55;border-radius:14px;padding:7px 12px 9px;box-shadow:0 5px 0 #1b2433}
.bt-box.foe{top:calc(70px + env(safe-area-inset-top));left:12px}.bt-box.me{right:12px;bottom:clamp(150px,30vh,230px)}
.bt-box .nm{font:900 17px var(--font-display);display:flex;justify-content:space-between;gap:10px}.bt-box small{font-size:12px;font-weight:700;color:#445}
.hpw{display:flex;align-items:center;gap:6px;margin-top:4px}.hpw span{font:900 10px var(--font-display);background:#2b3a55;color:#ffd43b;border-radius:4px;padding:1px 4px}
.hpbar{flex:1;height:9px;background:#3b4560;border-radius:6px;overflow:hidden;border:1px solid #1b2433}.hpbar i{display:block;height:100%;background:linear-gradient(90deg,#3ddc84,#b6f36a)}.hpbar i.mid{background:linear-gradient(90deg,#ffcc55,#ffe08a)}.hpbar i.low{background:linear-gradient(90deg,#ff685e,#ff9b6e)}.hpbar.xp i{background:linear-gradient(90deg,#4fb3ff,#8fe6ff)}
.hpn{text-align:right;font:800 12px var(--font-display);margin-top:2px}.xpw{display:flex;align-items:center;gap:6px;margin-top:3px}.xpw span{font:900 9px var(--font-display);background:#3d6bff;color:#fff;border-radius:4px;padding:1px 4px}
.tys{display:flex;gap:4px;margin-top:5px}.tys em{font:800 8.5px var(--font-display);letter-spacing:1px;color:#fff;padding:2px 7px;border-radius:99px;font-style:normal}
#bt-bottom{position:absolute;left:0;right:0;bottom:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom));display:flex;gap:10px;align-items:stretch;justify-content:center;flex-wrap:wrap}
#bt-text{flex:1 1 280px;max-width:520px;min-height:92px;background:linear-gradient(180deg,#fbf7ea,#e9dfc4);color:#1b2433;border:4px solid #2b3a55;border-radius:14px;padding:12px 16px;font:700 16px/1.45 var(--font-body);box-shadow:0 6px 0 #1b2433}
#bt-cmd{flex:0 1 400px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;max-height:42vh;overflow-y:auto}#bt-cmd:empty{display:none}
.bt-b{font:900 16px var(--font-display);letter-spacing:1px;color:#fff;border:3px solid #1b2433;border-radius:12px;padding:14px 8px;box-shadow:0 4px 0 #1b2433;cursor:pointer}
.bt-b.fight{background:#d9363e}.bt-b.bag{background:#d9a400}.bt-b.mon{background:#2f9e5f}.bt-b.run{background:#3d6bff}.bt-b.back{background:#445066;grid-column:1/-1;padding:9px}.bt-b:disabled{opacity:.4}
.bt-m{display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;background:linear-gradient(135deg,var(--c,#667),#0b1220 130%);color:#fff;border:3px solid #1b2433;border-radius:12px;padding:8px 10px;box-shadow:0 4px 0 #1b2433;cursor:pointer;font-family:var(--font-display)}
.bt-m b{font-size:15px}.bt-m small{font-size:10px;opacity:.9}.bt-m:disabled{opacity:.4}.bt-m.it{flex-direction:row;align-items:center;gap:8px;grid-column:1/-1;--c:#34507a}.bt-m.it small{margin-left:auto}.bt-empty{grid-column:1/-1;color:#fff;padding:10px}
@media(max-width:600px){.bt-box{min-width:150px}#bt-text{min-height:70px;font-size:14px}.bt-b{padding:11px 6px;font-size:14px}}
.av-tabs{display:flex;gap:6px;margin:8px 0 12px;flex-wrap:wrap;justify-content:center}.av-tabs button{background:#0c1b2d;border:1px solid #29415b;color:#9db2c8;font:800 11px var(--font-display);letter-spacing:1px;padding:8px 12px;border-radius:999px}.av-tabs button.on{background:#1f3c58;border-color:#64c8ff;color:#fff}
.av-sheet.wide{width:min(720px,100%)}.av-it{object-fit:contain;filter:drop-shadow(0 2px 3px #0008)}
.bk{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0;text-align:left}.bk small{display:block;font:800 9px var(--font-display);letter-spacing:1.2px;color:#7fa6cf;margin-bottom:6px;text-align:center}.bk-m{background:#0f1d2f;border:1px solid #23405c;border-radius:10px;padding:4px;margin-bottom:8px}.bk-p{font:700 11px var(--font-display);color:#cfe0f0;padding:4px 6px;border-radius:6px}.bk-p.me{background:#1f3c58;color:#ffcf45}.bk-p.out{opacity:.35;text-decoration:line-through}
.av-wm{position:relative;height:56px;margin:8px 4px 14px}.av-wm i{position:absolute;left:0;right:0;top:26px;height:4px;background:#36506b;border-radius:3px}.av-wm b{position:absolute;top:14px;transform:translateX(-50%);font-size:16px;opacity:.4}.av-wm b.v{opacity:1}.av-wm u{position:absolute;top:-2px;transform:translateX(-50%);color:#5de4ff;text-decoration:none;font-size:14px}
#av-card{display:block;margin:0 auto}
#av-err{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:20;max-width:min(520px,92vw);background:#2a1014;border:2px solid #ff685e;color:#ffd6d2;border-radius:14px;padding:16px 18px;font:600 13px/1.5 var(--font-body);text-align:center}
.cr{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;text-align:left}.cr canvas{background:radial-gradient(circle at 50% 80%,#27507a,#0b1626);border:1px solid #2f4d6b;border-radius:16px}
.cr-ctl{flex:1 1 260px;display:flex;flex-direction:column;gap:8px}.cr-ctl label{display:flex;flex-direction:column;gap:3px;font:800 10px var(--font-display);letter-spacing:1px;color:#7fa6cf}.cr-ctl input{background:#0c1b2d;border:1px solid #29415b;border-radius:10px;padding:9px 12px;color:#fff;font:600 14px var(--font-body)}
.cr .row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.cr .row>span{width:78px;font:800 10px var(--font-display);letter-spacing:1px;color:#7fa6cf}.cr .row button{min-width:28px;height:28px;border-radius:50%;border:2px solid #29415b;color:#fff;font:800 10px var(--font-display);padding:0 8px;background:#16283e}.cr .row button.txt{border-radius:10px}.cr .row button.on{border-color:#ffcf45;box-shadow:0 0 0 2px #ffcf4566}
.slot{display:flex;align-items:center;gap:12px;text-align:left;background:#0f1d2f;border:1px solid #23405c;border-radius:16px;padding:10px 12px;margin-bottom:8px}.slot canvas{width:62px;height:76px;flex:none;background:radial-gradient(circle at 50% 85%,#27507a,#0b1626);border-radius:12px}.slot div{flex:1}.slot b{display:block;font:900 16px var(--font-display);color:#fff}.slot span{font-size:11px;color:#8ba3bd}.slot.act{border-color:#ffcf45}
#home-page .fighter-card,#home-page .vs{display:none!important}
#home-page .fighters{height:auto!important;min-height:340px;align-items:flex-end}
#home-avatar{position:relative;margin:0 auto;width:min(480px,92%);cursor:pointer;text-align:center}
#home-avatar canvas{display:block;width:100%;height:auto;aspect-ratio:560/520;max-height:46vh;object-fit:contain;border-radius:20px;filter:drop-shadow(0 18px 24px #0009)}
.ha-plate{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);background:linear-gradient(180deg,rgba(14,30,52,.92),rgba(7,17,31,.92));border:1px solid #36506b;border-radius:12px;padding:6px 20px;min-width:200px;box-shadow:0 8px 20px rgba(0,0,0,.5)}.ha-plate b{display:block;font:900 20px var(--font-display);letter-spacing:2px;color:#fff}.ha-plate span{font:800 10px var(--font-display);letter-spacing:1.4px;color:#ffcf45}
`;
  function injectCSS() { if ($("av-css")) return; const s = document.createElement("style"); s.id = "av-css"; s.textContent = CSS; document.head.appendChild(s); }
  function boot() { injectCSS(); loadDB(); initHome(); const b = $("btn-adventure"); if (b) b.onclick = open; }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.openAdventure = open;
})();
