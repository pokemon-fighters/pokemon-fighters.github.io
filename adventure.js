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

  const shade = (hexc, f) => { const n = parseInt(hexc.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255, k = f < 0 ? 0 : 255, a = Math.abs(f); return "rgb(" + Math.round(r + (k - r) * a) + "," + Math.round(g + (k - g) * a) + "," + Math.round(b + (k - b) * a) + ")"; };
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
    [-1, 1].forEach((k) => { x.fillStyle = grad(jk, shade(jk, -0.35), fy - 268 * s, fy - 150 * s); rr(cx + k * 78 * s - 16 * s, fy - 268 * s + bob, 32 * s, 124 * s, 16 * s); x.fill(); x.fillStyle = skin; x.beginPath(); x.arc(cx + k * 78 * s, fy - 140 * s + bob, 16 * s, 0, 6.283); x.fill(); });
    /* torso */
    x.fillStyle = grad(jk, shade(jk, -0.4), fy - 270 * s, fy - 120 * s); rr(cx - 62 * s, fy - 270 * s + bob, 124 * s, 150 * s, 24 * s); x.fill();
    x.fillStyle = "#f4f4f4"; rr(cx - 12 * s, fy - 262 * s + bob, 24 * s, 138 * s, 8 * s); x.fill(); x.strokeStyle = "#00000033"; x.lineWidth = 2 * s; x.beginPath(); x.moveTo(cx, fy - 256 * s + bob); x.lineTo(cx, fy - 128 * s + bob); x.stroke();
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


  /* ---------- gym badge artwork (drawn once, used as real images) ---------- */
  const BCACHE = [];
  function badgeUrl(i) {
    if (BCACHE[i]) return BCACHE[i]; const c = document.createElement("canvas"); c.width = c.height = 96; const x = c.getContext("2d");
    const cols = [["#d8c49a", "#6b5a3a"], ["#7cc0ff", "#1f5fa8"], ["#fff07a", "#c89a00"], ["#9cf09c", "#2f8a3a"], ["#ffb36a", "#c4381c"], ["#d6f8ff", "#5aa9d0"]][i];
    const rim = x.createLinearGradient(0, 0, 0, 96); rim.addColorStop(0, "#fff2b0"); rim.addColorStop(0.5, "#e0a82e"); rim.addColorStop(1, "#8a5a10"); x.fillStyle = rim; x.beginPath(); x.arc(48, 48, 46, 0, 6.283); x.fill();
    const bg = x.createRadialGradient(36, 32, 6, 48, 48, 42); bg.addColorStop(0, cols[0]); bg.addColorStop(1, cols[1]); x.fillStyle = bg; x.beginPath(); x.arc(48, 48, 38, 0, 6.283); x.fill(); x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 2; x.beginPath(); x.arc(48, 48, 38, 0, 6.283); x.stroke();
    x.fillStyle = "#fff"; x.strokeStyle = "rgba(0,0,0,.4)"; x.lineWidth = 2.5; x.lineJoin = "round"; x.lineCap = "round";
    if (i === 0) { x.beginPath(); [[48, 20], [72, 34], [72, 62], [48, 76], [24, 62], [24, 34]].forEach(([a, b], k) => (k ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); x.stroke(); x.strokeStyle = "rgba(90,70,40,.7)"; x.beginPath(); x.moveTo(48, 20); x.lineTo(44, 40); x.lineTo(54, 52); x.lineTo(46, 76); x.moveTo(44, 40); x.lineTo(28, 48); x.stroke(); }
    else if (i === 1) { x.strokeStyle = "#fff"; x.lineWidth = 6; [34, 48, 62].forEach((y) => { x.beginPath(); x.moveTo(22, y); x.bezierCurveTo(34, y - 12, 42, y + 12, 52, y); x.bezierCurveTo(60, y - 10, 68, y + 8, 74, y - 2); x.stroke(); }); }
    else if (i === 2) { x.beginPath(); [[54, 16], [28, 52], [46, 52], [38, 80], [68, 40], [50, 40]].forEach(([a, b], k) => (k ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fillStyle = "#fff8c0"; x.fill(); x.stroke(); }
    else if (i === 3) { x.beginPath(); x.moveTo(26, 70); x.bezierCurveTo(22, 36, 46, 18, 74, 22); x.bezierCurveTo(78, 50, 58, 74, 26, 70); x.closePath(); x.fill(); x.stroke(); x.strokeStyle = "rgba(40,110,50,.8)"; x.lineWidth = 3; x.beginPath(); x.moveTo(26, 70); x.lineTo(62, 34); x.stroke(); }
    else if (i === 4) { x.beginPath(); x.moveTo(48, 14); x.bezierCurveTo(66, 34, 74, 46, 68, 62); x.bezierCurveTo(64, 78, 32, 80, 28, 62); x.bezierCurveTo(26, 50, 38, 44, 40, 30); x.bezierCurveTo(46, 36, 46, 24, 48, 14); x.closePath(); x.fillStyle = "#fff4d0"; x.fill(); x.stroke(); x.fillStyle = "#ff9a3a"; x.beginPath(); x.arc(48, 62, 9, 0, 6.283); x.fill(); }
    else { x.strokeStyle = "#fff"; x.lineWidth = 5; for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3; x.beginPath(); x.moveTo(48 + Math.cos(a) * 28, 48 + Math.sin(a) * 28); x.lineTo(48 - Math.cos(a) * 28, 48 - Math.sin(a) * 28); x.stroke(); } x.lineWidth = 3; for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; const bx = 48 + Math.cos(a) * 18, bz = 48 + Math.sin(a) * 18; x.beginPath(); x.moveTo(bx + Math.cos(a + 0.9) * 8, bz + Math.sin(a + 0.9) * 8); x.lineTo(bx, bz); x.lineTo(bx + Math.cos(a - 0.9) * 8, bz + Math.sin(a - 0.9) * 8); x.stroke(); } }
    x.fillStyle = "rgba(255,255,255,.28)"; x.beginPath(); x.ellipse(36, 30, 20, 10, -0.6, 0, 6.283); x.fill();
    return (BCACHE[i] = c.toDataURL());
  }
  const badgeImg = (i, on, s) => '<img class="bdg' + (on ? "" : " off") + '" src="' + badgeUrl(i) + '" width="' + (s || 24) + '" height="' + (s || 24) + '" alt="">';

  /* ---------- saves ---------- */
  let DB = { active: null, saves: [] };
  function loadDB() { try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.saves) DB = r; } catch (e) {} }
  const saveDB = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} try { window.dispatchEvent(new Event("pf-adv-change")); } catch (e) {} };
  const activeSave = () => DB.saves.find((s) => s.id === DB.active) || DB.saves[0] || null;
  const newStory = () => ({ squad: [], box: [], bag: { potion: 3 }, badges: [], def: [], flags: {}, q: {}, picked: [], visited: [0], spawn: { x: 140, z: 784, sc: "world" }, pos: { x: 140, z: 784 }, friends: null, wins: 0, dex: { seen: {}, caught: {} } });

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
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function makeMon(c, s) {
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    const geo = new THREE.PlaneGeometry(1, 1, 10, 12), mat = new THREE.MeshBasicMaterial({ color: TC[c.t[0]] || 0xcccccc, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide });
    const sp = new THREE.Mesh(geo, mat); sp.scale.set(s, s, 1); sp.position.y = s * 0.46; inner.add(sp);
    new THREE.TextureLoader().setCrossOrigin("anonymous").load(ART + c.id + ".png", (tx) => { mat.map = tx; mat.color.set(0xffffff); mat.needsUpdate = true; });
    const sh = mesh(new THREE.CircleGeometry(s * 0.3, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.28, depthWrite: false }), 0, 0.04, 0); sh.rotation.x = -Math.PI / 2; g.add(sh);
    g.userData = { s, inner, sp, mat, geo, base: geo.attributes.position.array.slice(), key: c.s, ghost: isGhost(c), pop: 0, flash: 0, lunge: -1, lx: 0, lz: 0, ph: Math.random() * 6, idle: true, sink: false, px: null, pz: null, walk: 0, cull: false };
    return g;
  }
  const face = (h, right) => { const u = h.userData; u.sp.scale.x = (right ? -1 : 1) * u.s; };
  let T = 0;
  /* body parts move on their own: head sways, arms/tail flap, legs step when walking, body leans into attacks */
  function warpMon(u) {
    const pos = u.geo.attributes.position, a = pos.array, b = u.base, n = pos.count, t = T + u.ph, w = u.walk, atk = u.lunge >= 0 ? Math.sin(Math.PI * Math.min(1, u.lunge)) : 0, hit = u.flash > 0 ? Math.sin(T * 60) * Math.min(1, u.flash) : 0;
    for (let i = 0; i < n; i++) {
      const bx = b[i * 3], by = b[i * 3 + 1], v = by + 0.5, ax = Math.abs(bx), sg = bx < 0 ? -1 : 1;
      const head = sstep(0.55, 1, v), limb = sstep(0.16, 0.5, ax) * sstep(0.12, 0.65, v), leg = 1 - sstep(0.02, 0.32, v), step = Math.sin(t * (7 + w * 4) + (bx > 0 ? 0 : Math.PI));
      let dx = Math.sin(t * 1.5) * 0.03 * head + Math.sin(t * 3 + sg * 1.7) * 0.02 * limb * sg + step * (0.012 + 0.05 * w) * leg;
      let dy = Math.sin(t * 3.1) * 0.012 * head + Math.sin(t * 3.6 + sg * 1.9) * 0.035 * limb * (1 + w) + Math.max(0, step) * 0.03 * w * leg + (v - 0.5) * 0.018 * Math.sin(t * 2.2);
      dx += -atk * 0.16 * v * v + hit * 0.04 * v; dy += atk * 0.03 * head;
      a[i * 3] = bx + dx; a[i * 3 + 1] = by + dy;
    }
    pos.needsUpdate = true;
  }
  function tickMon(h, dt) {
    const u = h.userData;
    if (u.pop < 1) { u.pop = Math.min(1, u.pop + dt * 3); h.scale.setScalar(0.15 + 0.85 * (1 - Math.pow(1 - u.pop, 3))); }
    if (u.sink) { u.sinkT = (u.sinkT || 0) + dt; h.scale.setScalar(Math.max(0.01, 1 - u.sinkT * 2.2)); u.sp.position.y = u.s * 0.46 - u.sinkT * u.s * 0.4; }
    if (u.flash > 0) { u.flash -= dt; u.mat.color.set(Math.floor(u.flash * 14) % 2 ? 0xffffff : 0xff6a6a); if (u.flash <= 0) u.mat.color.set(0xffffff); }
    if (u.lunge >= 0) { u.lunge += dt * 3.4; const k = u.lunge < 1 ? Math.sin(Math.PI * u.lunge) : 0; u.inner.position.set(u.lx * k * 2.4, 0, u.lz * k * 2.4); if (u.lunge >= 1) u.lunge = -1; }
    if (u.idle && !u.sink) u.sp.position.y = u.s * 0.46 + Math.abs(Math.sin(T * 2.6 + u.ph)) * 0.05 * u.s;
    if (camera) { u.sp.quaternion.copy(camera.quaternion); u.cull = h.position.distanceToSquared(camera.position) > 12000; }
    if (u.px !== null && dt > 0) u.walk += (Math.min(1, Math.hypot(h.position.x - u.px, h.position.z - u.pz) / dt / 4) - u.walk) * Math.min(1, dt * 8); u.px = h.position.x; u.pz = h.position.z;
    if (!u.cull) warpMon(u);
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
  function mkScene(id, bnd, bg, fog) { const g = new THREE.Group(); g.visible = false; scene.add(g); return { id, group: g, col: new Grid(), bnd, inter: [], npcs: [], trainers: [], patches: [], gates: [], doors: [], picks: [], builds: [], ambient: [], water: [], bg, fog, exit: null, clouds: [] }; }
  function mkNpc(sc, o) {
    const m = makeTrainer(o.look || npcLook(o.name || o.tag || "npc")); m.position.set(o.x, 0, o.z); m.rotation.y = o.rot || 0; sc.group.add(m); o.mesh = m; o.sc = sc;
    if (o.tag) { const l = labelSprite(o.tag, 4.6, "rgba(10,20,40,.88)", o.tc || "#ffcf45"); l.position.set(0, 3, 0); m.add(l); }
    const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.bang, transparent: true, depthWrite: false })); mk.position.set(0, o.tag ? 3.9 : 2.6, 0); mk.visible = false; m.add(mk); o.mark = mk;
    sc.npcs.push(o); if (!o.wander) sc.col.add(o.x, o.z, 0.6);
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
    const t = canvasTex(256, 256, (x) => { x.fillStyle = "#4c9a3e"; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 1800; i++) { x.fillStyle = "hsla(" + (84 + Math.random() * 40) + ",58%," + (22 + Math.random() * 24) + "%,.55)"; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 5 + Math.random() * 4); } });
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
    { n: "Seedling Town", x: 140, z: 780 }, { n: "Stonebrook City", x: 150, z: 520, gym: 0 }, { n: "Bluewater City", x: 380, z: 330, gym: 1 }, { n: "Voltport City", x: 640, z: 300, gym: 2 },
    { n: "Mossveil Town", x: 460, z: 560, gym: 3 }, { n: "Emberfall City", x: 700, z: 700, gym: 4 }, { n: "Frostpeak City", x: 800, z: 430, gym: 5 }, { n: "Champions Stadium", x: 780, z: 120, stadium: true },
  ];
  const ROUTE_PTS = [
    [[140, 780], [120, 700], [170, 640], [130, 580], [150, 520]], [[150, 520], [230, 500], [270, 430], [330, 400], [380, 330]], [[380, 330], [450, 250], [540, 240], [590, 290], [640, 300]],
    [[640, 300], [660, 380], [590, 450], [520, 500], [460, 560]], [[460, 560], [520, 640], [600, 660], [660, 720], [700, 700]], [[700, 700], [760, 620], [740, 540], [790, 480], [800, 430]], [[800, 430], [830, 340], [770, 260], [810, 190], [780, 120]],
  ];
  const SIDE_PTS = [[[120, 700], [80, 715], [40, 720]], [[270, 430], [262, 380], [250, 330]], [[450, 250], [445, 200], [440, 160]], [[590, 450], [650, 465], [705, 470]], [[600, 660], [595, 730], [590, 790]], [[740, 540], [700, 550], [650, 545]], [[830, 340], [860, 320], [885, 300]]];
  const SIDE_NAMES = ["Cove Trail", "Pond Path", "Glade Trail", "Meadow Trail", "Beach Trail", "Ridge Trail", "Cliff Trail"];
  const RW = 13, SW = 10, SEGS = [];
  (function () {
    const add = (pts, hw, tag) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; SEGS.push({ ax, az, bx, bz, hw, r: tag.r, s: tag.s, tab: tag.tab, len: Math.hypot(bx - ax, bz - az), minx: Math.min(ax, bx) - hw, maxx: Math.max(ax, bx) + hw, minz: Math.min(az, bz) - hw, maxz: Math.max(az, bz) + hw }); } };
    ROUTE_PTS.forEach((p, i) => add(p, RW, { r: i, s: -1, tab: i })); SIDE_PTS.forEach((p, i) => add(p, SW, { r: -1, s: i, tab: i }));
  })();
  const inTownRect = (x, z, t, pad) => x > t.x - 46 - (pad || 0) && x < t.x + 46 + (pad || 0) && z > t.z - 34 - (pad || 0) && z < t.z + 26 + (pad || 0);
  const townAt = (x, z) => TOWNS.findIndex((t) => inTownRect(x, z, t));
  function distSeg(px, pz, s) { const dx = s.bx - s.ax, dz = s.bz - s.az; let t = ((px - s.ax) * dx + (pz - s.az) * dz) / (dx * dx + dz * dz); t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (s.ax + dx * t), pz - (s.az + dz * t)); }
  function nearSeg(x, z, wide) { let best = null, bd = 1e9; for (const s of SEGS) { if (x < s.minx - (wide || 0) || x > s.maxx + (wide || 0) || z < s.minz - (wide || 0) || z > s.maxz + (wide || 0)) continue; const d = distSeg(x, z, s); if (d - s.hw < bd) { bd = d - s.hw; best = s; } } return { s: best, d: bd }; }
  const WATER = [];
  function inWater(list, x, z) { if (!list) return false; for (let i = 0; i < list.length; i++) { const w = list[i], dx = (x - w.x) / w.rx, dz = (z - w.z) / w.rz; if (dx * dx + dz * dz < 1) return true; } return false; }
  const walkable = (x, z) => (townAt(x, z) >= 0 || nearSeg(x, z).d <= 0) && !inWater(WATER, x, z);
  function areaAt(x, z) { const ti = townAt(x, z); if (ti >= 0) return { k: "t", i: ti, key: "t" + ti }; const q = nearSeg(x, z); if (q.s && q.d <= 0) return q.s.r >= 0 ? { k: "r", i: q.s.r, key: "r" + q.s.r, tab: q.s.tab } : { k: "s", i: q.s.s, key: "s" + q.s.s, tab: q.s.tab }; return { k: "x", key: "x" }; }
  const locName = (x, z) => { const a = areaAt(x, z); return a.k === "t" ? TOWNS[a.i].n : a.k === "r" ? "Route " + (a.i + 1) : a.k === "s" ? SIDE_NAMES[a.i] : "Wilderness"; };
  function pointAlong(ri, d) { let acc = 0, last = null; for (const s of SEGS) { if (s.r !== ri) continue; last = s; if (acc + s.len >= d) { const t = (d - acc) / s.len; return { x: s.ax + (s.bx - s.ax) * t, z: s.az + (s.bz - s.az) * t, dx: (s.bx - s.ax) / s.len, dz: (s.bz - s.az) / s.len }; } acc += s.len; } return { x: last.bx, z: last.bz, dx: (last.bx - last.ax) / last.len, dz: (last.bz - last.az) / last.len }; }
  const routeLen = (ri) => SEGS.filter((s) => s.r === ri).reduce((a, s) => a + s.len, 0);
  const RT = [{ ids: [19, 133, 43, 41, 25, 39], lv: [3, 6] }, { ids: [74, 66, 54, 63, 81, 58, 92], lv: [8, 12] }, { ids: [93, 75, 64, 67, 42, 44, 59], lv: [14, 18] }, { ids: [43, 44, 2, 20, 133, 41, 75], lv: [20, 24] }, { ids: [58, 59, 74, 75, 5, 66, 67, 78], lv: [26, 30] }, { ids: [42, 93, 64, 81, 87, 124, 91], lv: [32, 36] }, { ids: [93, 64, 67, 76, 59, 26, 131, 130], lv: [38, 42] }];
  const GYMS = [
    { badge: "Stone", ic: "🪨", ty: "rock", leader: "Flint", team: [[74, 13], [74, 14], [75, 16]], pat: ["speck", "#6b6258", "#8a7f72"], wall: 0x7a6e60, acc: 0xb9a37a, reward: 300, line: "Rock-solid defense beats everything!" },
    { badge: "Wave", ic: "💧", ty: "water", leader: "Marina", team: [[54, 19], [8, 21], [130, 23]], pat: ["tile", "#2b6fa8", "#5aa9e0"], wall: 0x2b5f9a, acc: 0x4fb3ff, reward: 500, line: "Let the tide carry you!" },
    { badge: "Spark", ic: "⚡", ty: "electric", leader: "Volt", team: [[81, 25], [25, 26], [26, 29]], pat: ["check", "#2a2a2a", "#d9a400"], wall: 0x3a3a22, acc: 0xffe14a, reward: 800, line: "Bzzzt! Feel the voltage!" },
    { badge: "Leaf", ic: "🍃", ty: "grass", leader: "Fern", team: [[44, 31], [2, 33], [3, 35]], pat: ["speck", "#3f8f3a", "#2f6f2f"], wall: 0x2f6f3a, acc: 0x62db65, reward: 1100, line: "Nature never loses!" },
    { badge: "Ember", ic: "🔥", ty: "fire", leader: "Blaze", team: [[58, 36], [78, 38], [59, 39], [6, 41]], pat: ["tile", "#3a1a1a", "#8a2a10"], wall: 0x5a2014, acc: 0xff7a1a, reward: 1500, line: "Burn bright, trainer!" },
    { badge: "Glacier", ic: "❄️", ty: "ice", leader: "Frost", team: [[87, 42], [124, 43], [91, 44], [131, 46]], pat: ["tile", "#bfe8f5", "#ffffff"], wall: 0x7aaed0, acc: 0x9fe8ff, reward: 2000, line: "Cool heads win the day." },
  ];
  const TNAMES = ["Youngster Joey", "Lass Anna", "Hiker Gus", "Scientist Ivy", "Ace Rex", "Swimmer Kai", "Psychic Mira", "Ace Duo Sol", "Camper Finn", "Picnicker Ruby", "Biker Jet", "Sailor Bo", "Gardener Fern", "Skier Nils", "Pilot Wren", "Fisher Luke", "Hex Maniac Vee", "Blackbelt Ryu", "Cool Trainer Ash", "Beauty Lila", "Rocker Zed", "Ranger Hana", "Hunter Dax", "Nurse Joy Jr.", "Clown Pip", "Artist Mo", "Chef Remy", "Dancer Sol"];
  const ROCKET_LOOK = { g: "b", skin: 1, hairS: 0, hairC: 5, jacket: 5, pants: 1, capOn: true, capC: 5, bag: 5 };
  const SIDE_NAMES2 = SIDE_NAMES;

  function building(sc, o) {
    const b = new THREE.Group(), w = o.w, d = o.d || 7, h = o.h || 3.4, rh = o.rh || 2.4, trim = o.trim || 0xffffff, F = d / 2, big = w > 9 || h > 4, key = o.key || "";
    const roofDark = new THREE.Color(o.roof).multiplyScalar(0.72).getHex(), GL = { emissive: 0x2a5f8a };
    const bx = (bw, bh, bd, c, x, y, z, op) => { const m = mesh(new THREE.BoxGeometry(bw, bh, bd), lam(c, op), x, y, z); b.add(m); return m; };
    bx(w + 0.3, 0.5, d + 0.3, 0x8d887c, 0, 0.25, 0);
    bx(w, h, d, o.wall, 0, h / 2, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => bx(0.28, h, 0.28, trim, (sx * w) / 2, h / 2, (sz * d) / 2));
    bx(w + 0.5, 0.35, d + 0.5, trim, 0, h, 0);
    const rg = new THREE.Group(), rf = mesh(new THREE.ConeGeometry((d / Math.SQRT2) * 1.12, rh, 4), lam(o.roof), 0, h + rh / 2 + 0.1, 0); rf.rotation.y = Math.PI / 4; rg.add(rf);
    const rf2 = mesh(new THREE.ConeGeometry((d / Math.SQRT2) * 1.2, 0.5, 4), lam(roofDark), 0, h + 0.3, 0); rf2.rotation.y = Math.PI / 4; rg.add(rf2); rg.scale.set(w / d, 1, 1); b.add(rg);
    if (!big) { bx(0.7, 1.7, 0.7, 0x8a4b3a, w * 0.26, h + rh * 0.5, -d * 0.12); bx(0.9, 0.18, 0.9, 0x5c3a2e, w * 0.26, h + rh * 0.5 + 0.9, -d * 0.12); }
    if (!o.nodoor) {
      bx(1.8, 2.3, 0.16, trim, 0, 1.15, F + 0.02); bx(1.3, 2.05, 0.14, 0x6a4424, 0, 1.03, F + 0.09);
      const kn = mesh(new THREE.SphereGeometry(0.07, 8, 6), lam(0xd9b44a), 0.45, 1.0, F + 0.19); b.add(kn);
      const aw = bx(2.8, 0.12, 1.5, o.roof, 0, 2.75, F + 0.8); aw.rotation.x = 0.2; bx(0.12, 2.7, 0.12, trim, -1.3, 1.35, F + 1.45); bx(0.12, 2.7, 0.12, trim, 1.3, 1.35, F + 1.45);
      bx(2.8, 0.14, 1.5, 0xcfc6a8, 0, 0.07, F + 0.8); bx(2.2, 0.1, 0.5, 0xb9b09a, 0, 0.05, F + 1.7);
    }
    if (w > 5) {
      const fl = [0xff6b8b, 0xffd43b, 0xffffff, 0xff9f43];
      for (let k = -1; k <= 1; k += 2) {
        const wx = k * w * 0.3, wy = h * 0.55;
        bx(1.3, 1.3, 0.12, trim, wx, wy, F + 0.02); bx(1, 1, 0.06, 0x9fd8ff, wx, wy, F + 0.07, GL); bx(0.07, 1, 0.05, trim, wx, wy, F + 0.11); bx(1, 0.07, 0.05, trim, wx, wy, F + 0.11);
        bx(1.5, 0.1, 0.3, trim, wx, wy - 0.7, F + 0.12); bx(0.35, 1.1, 0.06, o.roof, wx - 0.9, wy, F + 0.06); bx(0.35, 1.1, 0.06, o.roof, wx + 0.9, wy, F + 0.06);
        bx(1.2, 0.22, 0.3, 0x6b4a2a, wx, wy - 0.88, F + 0.2); for (let i = 0; i < 4; i++) { const f = mesh(new THREE.SphereGeometry(0.12, 6, 5), lam(fl[(i + (k > 0 ? 1 : 0)) % 4]), wx - 0.45 + i * 0.3, wy - 0.7, F + 0.22); b.add(f); }
      }
      for (let s = -1; s <= 1; s += 2) for (let z = big ? -1 : 0; z <= (big ? 1 : 0); z += 2) { const zz = big ? z * d * 0.25 : 0; bx(0.12, 1.2, 1.2, trim, (s * w) / 2, h * 0.55, zz); bx(0.08, 1, 1, 0x9fd8ff, (s * w) / 2 + s * 0.04, h * 0.55, zz, GL); }
    }
    if (key === "center") {
      bx(w + 0.06, 0.3, d + 0.06, 0xe84a5f, 0, 1.75, 0); const R = 0.45, ey = Math.min(h - 0.5, 2.85), ez = F + 0.1;
      const top = mesh(new THREE.CircleGeometry(R, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xd9363e }), 0, ey, ez), bot = mesh(new THREE.CircleGeometry(R, 24, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, ey, ez);
      const bd = mesh(new THREE.PlaneGeometry(R * 2, 0.07), new THREE.MeshBasicMaterial({ color: 0x1a1a1a }), 0, ey, ez + 0.005), bn = mesh(new THREE.CircleGeometry(R * 0.26, 16), new THREE.MeshBasicMaterial({ color: 0x1a1a1a }), 0, ey, ez + 0.01), bw = mesh(new THREE.CircleGeometry(R * 0.15, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, ey, ez + 0.015); b.add(top, bot, bd, bn, bw);
    } else if (key === "mart") {
      const st = canvasTex(64, 16, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#ffffff" : "#3d6bff"; x.fillRect(i * 8, 0, 8, 16); } }), cn = mesh(new THREE.BoxGeometry(w * 0.9, 0.1, 1.3), lam(0xffffff, { map: st }), 0, 3.0, F + 0.75); cn.rotation.x = 0.3; b.add(cn);
    } else if (key.indexOf("gym") === 0) {
      bx(0.9, 2.6, 0.08, o.roof, -w / 2 + 1.1, h - 1.4, F + 0.06); bx(0.9, 2.6, 0.08, o.roof, w / 2 - 1.1, h - 1.4, F + 0.06);
      bx(0.06, 3.2, 0.06, 0xdddddd, 0, h + rh + 1.4, 0); bx(1.5, 0.85, 0.05, o.roof, 0.8, h + rh + 2.4, 0);
    } else if (key === "lab") {
      bx(0.07, 1.4, 0.07, 0xcccccc, -w * 0.3, h + rh * 0.5 + 0.7, 0); const dish = mesh(new THREE.SphereGeometry(0.8, 14, 8, 0, 6.2832, 0, 1.5708), lam(0xe8eef8, { side: THREE.DoubleSide }), -w * 0.3, h + rh * 0.5 + 1.6, 0); dish.rotation.x = 0.7; b.add(dish);
    } else if (key === "stadium") {
      for (let k = -2; k <= 2; k += 1) { const c = mesh(new THREE.CylinderGeometry(0.4, 0.45, h, 10), lam(0xeeeeee), k * (w / 5), h / 2, F + 1.1); b.add(c); }
    }
    if (o.text) { const l = labelSprite(o.text, Math.max(5.5, w * 0.9), o.bg, o.tc); l.position.set(0, h + rh + 1.1, d / 2 - 0.5); b.add(l); }
    b.position.set(o.x, 0, o.z); if (o.rot) b.rotation.y = o.rot; sc.group.add(b);
    for (let ox = -w / 2 + 1.4; ox <= w / 2 - 1.2; ox += 2.4) sc.col.add(o.x + ox, o.z, d / 2 - 0.1);
    for (let oz = -d / 2 + 0.6; oz <= d / 2 - 0.6; oz += 1.4) { sc.col.add(o.x - w / 2 + 0.2, o.z + oz, 0.5); sc.col.add(o.x + w / 2 - 0.2, o.z + oz, 0.5); }
    for (let ox = -w / 2 + 0.6; ox <= w / 2 - 0.6; ox += 1.4) sc.col.add(o.x + ox, o.z - d / 2 + 0.2, 0.5);
    sc.builds.push({ x: o.x, z: o.z, w, d, col: hex(o.roof) });
    if (o.key) sc.doors.push({ x: o.x, z: o.z + d / 2 + 1.3, r: 2.2, key: o.key, label: o.dl || "Enter" });
  }
  function gateHit(x, z) { return WORLD.gates.some((g) => !g.req() && Math.abs((x - g.x) * g.dx + (z - g.z) * g.dz) < 1 && Math.abs(-(x - g.x) * g.dz + (z - g.z) * g.dx) < RW + 3); }

  /* ---------- graphics upgrade: sky, shadows, water, colour grading, Pokémon collision ---------- */
  let SUN = null, SKY = null, POST = null, WTEX0 = null; const WTEX = [], SHADOWED = new WeakSet(), SKY_H = 0xd6e0d1, SUN_V = [34, 26, 20];
  const isGhost = (c) => { const t = c && c.t; return Array.isArray(t) ? t.includes("ghost") : t === "ghost"; };
  const GRADE = {
    uniforms: { tDiffuse: { value: null } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: [
      "uniform sampler2D tDiffuse; varying vec2 vUv;",
      "vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }",
      "void main(){",
      "  vec3 c = texture2D(tDiffuse, vUv).rgb;",
      "  c = mix(c, aces(c * 0.95), 0.7);",
      "  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));",
      "  c = mix(vec3(l), c, 1.3);",
      "  c *= mix(vec3(0.91, 1.0, 1.05), vec3(1.06, 1.0, 0.91), smoothstep(0.15, 0.75, l));",
      "  c = (c - 0.5) * 1.06 + 0.5;",
      "  c = c * 0.95 + 0.035;",
      "  vec2 q = vUv - 0.5;",
      "  c *= 1.0 - smoothstep(0.35, 0.95, length(q) * 1.25) * 0.42;",
      "  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);",
      "}"].join("\n")
  };
  const WCOL = { 0x2a79c9: 0x168aa6, 0x3fa7e8: 0x2fb3c6 };
  function waterMat(col, w, h) {
    if (!WTEX0) WTEX0 = canvasTex(128, 128, (x) => {
      x.fillStyle = "#d4d4d4"; x.fillRect(0, 0, 128, 128); let s = 11; const rr = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
      for (let i = 0; i < 46; i++) { const px = rr() * 128, py = rr() * 128, len = 8 + rr() * 14, light = rr() > 0.35; x.strokeStyle = light ? "rgba(255,255,255,.9)" : "rgba(150,170,200,.55)"; x.lineWidth = 1.4 + rr() * 1.4; x.lineCap = "round"; const bend = 3 + rr() * 3, ang = rr() * 3.1416;
        for (const ox of [-128, 0, 128]) for (const oy of [-128, 0, 128]) { x.save(); x.translate(px + ox, py + oy); x.rotate(ang); x.beginPath(); x.moveTo(-len / 2, 0); x.quadraticCurveTo(0, -bend, len / 2, 0); x.stroke(); x.restore(); } }
    });
    const t = WTEX0.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 9, h / 9); WTEX.push(t);
    return lam(new THREE.Color(WCOL[col] || col).multiplyScalar(1.15).getHex(), { map: t, emissive: 0x06303a });
  }
  function shadowPass(g) {
    if (!g || SHADOWED.has(g)) return; SHADOWED.add(g);
    g.traverse((o) => { if (!o.isMesh || o.isInstancedMesh) return; const ty = o.geometry && o.geometry.type; if (ty === "PlaneGeometry" || ty === "CircleGeometry" || ty === "RingGeometry") { o.receiveShadow = true; return; } const mt = o.material; o.castShadow = !(mt && (mt.type === "MeshBasicMaterial" || mt.transparent)); o.receiveShadow = true; });
  }
  function initFx() {
    const sv = new THREE.Vector3(SUN_V[0], SUN_V[1], SUN_V[2]).normalize(), sd = "vec3(" + sv.x.toFixed(4) + ", " + sv.y.toFixed(4) + ", " + sv.z.toFixed(4) + ")";
    const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec3 vP; void main(){ vec3 d = normalize(vP); float h = clamp(d.y, 0.0, 1.0); vec3 hor = vec3(0.839, 0.878, 0.820); vec3 mid = vec3(0.36, 0.64, 0.90); vec3 top = vec3(0.10, 0.36, 0.78); vec3 c = mix(hor, mid, smoothstep(0.0, 0.26, h)); c = mix(c, top, smoothstep(0.2, 0.9, h)); float s = max(dot(d, " + sd + "), 0.0); c += vec3(1.0, 0.82, 0.5) * (pow(s, 500.0) * 1.4 + pow(s, 24.0) * 0.3 + pow(s, 5.0) * 0.1); gl_FragColor = vec4(c, 1.0); }" });
    SKY = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 14), mat); SKY.frustumCulled = false; SKY.renderOrder = -1000; SKY.visible = false; scene.add(SKY);
    const el = $("av-3d"); if (el) el.classList.add("nopost");
  }
  function fxEnter(sc) { shadowPass(sc.group); }
  function fxTick(dt) {
    if (!SKY) return;
    const world = !!(SC && SC.id === "world") && !(BT && BT.cam);
    SKY.visible = world;
    if (world) { SKY.position.copy(camera.position); if (scene.fog) scene.fog.color.setHex(SKY_H); if (scene.background && scene.background.isColor) scene.background.setHex(SKY_H); }
    if (SUN) { SUN.target.position.set(P.x, 0, P.z); SUN.position.set(P.x + SUN_V[0], SUN_V[1], P.z + SUN_V[2]); }
    WTEX.forEach((t) => { t.offset.x = Math.sin(T * 0.15) * 0.5 + T * 0.01; t.offset.y = Math.cos(T * 0.12) * 0.5; });
  }
  function loadPost() {
    if (POST || window.__pfPostLoading) return; window.__pfPostLoading = true;
    const base = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/";
    const load = (f) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = base + f; s.onload = res; s.onerror = () => rej(new Error(f)); document.head.appendChild(s); });
    ["shaders/CopyShader.js", "shaders/LuminosityHighPassShader.js", "postprocessing/EffectComposer.js", "postprocessing/ShaderPass.js", "postprocessing/RenderPass.js", "postprocessing/UnrealBloomPass.js"].reduce((p, f) => p.then(() => load(f)), Promise.resolve()).then(initPost).catch((e) => { console.warn("[adventure] post-processing unavailable:", e && e.message); });
  }
  function initPost() {
    const pg = $("adventure-page"), w = (pg && pg.clientWidth) || innerWidth, h = (pg && pg.clientHeight) || innerHeight, gl2 = !!(renderer.capabilities && renderer.capabilities.isWebGL2), coarse = matchMedia("(pointer:coarse)").matches;
    const opt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    const rt = gl2 && THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(w, h, opt) : new THREE.WebGLRenderTarget(w, h, opt); if (gl2 && "samples" in rt) rt.samples = coarse ? 2 : 4;
    const c = new THREE.EffectComposer(renderer, rt); c.setPixelRatio(renderer.getPixelRatio()); c.setSize(w, h); c.addPass(new THREE.RenderPass(scene, camera));
    if (!coarse) c.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 0.35, 0.5, 0.9));
    const gp = new THREE.ShaderPass(GRADE); gp.renderToScreen = true; c.addPass(gp); POST = c;
    const el = $("av-3d"); if (el) el.classList.remove("nopost");
  }
  function renderFrame() {
    if (POST) { try { POST.render(); return; } catch (e) { console.warn("[adventure] post-processing disabled:", e && e.message); POST = null; try { renderer.setRenderTarget(null); } catch (x) {} const el = $("av-3d"); if (el) el.classList.add("nopost"); } }
    renderer.render(scene, camera);
  }

  /* ---------- collision helpers: Pokémon (except Ghost types) are solid; unstick + safe respawn ---------- */
  function blockedAt(sc, x, z) { return x < sc.bnd.x0 || x > sc.bnd.x1 || z < sc.bnd.z0 || z > sc.bnd.z1 || sc.col.hit(x, z) || inWater(sc.water, x, z) || (sc.id === "world" && (!walkable(x, z) || gateHit(x, z))); }
  function freeSpot(sc, x, z, maxR) {
    const clear = (a, b) => !blockedAt(sc, a, b) && !blockedAt(sc, a + 1.2, b) && !blockedAt(sc, a - 1.2, b) && !blockedAt(sc, a, b + 1.2) && !blockedAt(sc, a, b - 1.2);
    if (clear(x, z)) return { x, z };
    for (let r = 1.5; r <= (maxR || 60); r += 1.5) { const n = Math.max(8, Math.round(r * 2.5)); for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832 + r, cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r; if (clear(cx, cz)) return { x: cx, z: cz }; } }
    return null;
  }
  function monBlocked(gh, x, z) { return !gh && !!SC && blocked(x, z); }
  function movePartner(dt, tx, tz, ox, oz) {
    const h = partnerH, u = h.userData, gh = u.ghost, k = 1 - Math.exp(-5 * dt), sx = ox + (tx - ox) * k, sz = oz + (tz - oz) * k; let nx = ox, nz = oz;
    if (!monBlocked(gh, sx, sz) || monBlocked(gh, ox, oz)) { nx = sx; nz = sz; } else if (!monBlocked(gh, sx, oz)) nx = sx; else if (!monBlocked(gh, ox, sz)) nz = sz;
    const dd = Math.hypot(P.x - nx, P.z - nz); u.stuck = dd > 4 && Math.hypot(nx - ox, nz - oz) < 0.002 ? (u.stuck || 0) + dt : 0;
    if (dd > 16 || u.stuck > 1.6) { const f = freeSpot(SC, P.x - Math.sin(P.rot) * 1.7, P.z - Math.cos(P.rot) * 1.7, 6) || { x: P.x, z: P.z }; nx = f.x; nz = f.z; u.stuck = 0; }
    h.position.x = nx; h.position.z = nz;
  }
  function townSpawn() { const v = G && G.visited && G.visited.length ? G.visited[G.visited.length - 1] : 0, t = TOWNS[v] || TOWNS[0]; return { x: t.x, z: t.z + 4 }; }
  function safeSpawn() {
    const cands = []; if (G && G.spawn && isFinite(G.spawn.x) && isFinite(G.spawn.z)) cands.push(G.spawn); cands.push(townSpawn(), { x: TOWNS[0].x, z: TOWNS[0].z + 4 });
    for (const c of cands) { const f = freeSpot(WORLD, c.x, c.z, 40); if (f) { if (G) G.spawn = { x: f.x, z: f.z, sc: "world" }; return f; } }
    return { x: TOWNS[0].x, z: TOWNS[0].z + 4 };
  }
  function unstickTick(dt) {
    G.unT = (G.unT || 0) - dt; if (G.unT > 0 || !SC) return; G.unT = 0.5;
    if (!blocked(P.x, P.z)) return;
    const f = freeSpot(SC, P.x, P.z, 160); const s = f || (SC.id === "world" ? safeSpawn() : { x: 0, z: SC.d ? SC.d / 2 - 3 : 0 });
    P.x = s.x; P.z = s.z; camSnap = true; try { toast({ icon: "🧭", title: "You were stuck — moved to a safe spot" }); } catch (e) {}
  }
  function makePalmGeo() {
    const pos = [], col = [], idx = [], vert = (x, y, z, c) => { pos.push(x, y, z); col.push(c[0], c[1], c[2]); return pos.length / 3 - 1; };
    const H = 6.4, lean = 1.1, N = 7, S = 6, rings = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, cx = lean * t * t, cy = H * t, tx = 2 * lean * t, tl = Math.hypot(tx, H), Tx = tx / tl, Ty = H / tl, vx = Ty, vy = -Tx, r = 0.3 - 0.15 * t + (i === 0 ? 0.08 : 0), sh = 0.85 + 0.15 * (i % 2), ring = [];
      for (let k = 0; k < S; k++) { const a = (k / S) * 6.2832, cz = Math.sin(a) * r, cv = Math.cos(a) * r; ring.push(vert(cx + vx * cv, cy + vy * cv, cz, [0.42 * sh, 0.3 * sh, 0.18 * sh])); }
      rings.push(ring);
    }
    for (let i = 0; i < N; i++) for (let k = 0; k < S; k++) { const a = rings[i][k], b = rings[i][(k + 1) % S], c = rings[i + 1][k], d = rings[i + 1][(k + 1) % S]; idx.push(a, b, c, b, d, c); }
    const F = 8, SEG = 5;
    for (let f = 0; f < F; f++) {
      const an = (f / F) * 6.2832 + (f % 2) * 0.2, dx = Math.cos(an), dz = Math.sin(an), sx = -dz, sz = dx, len = 3.6 + (f % 3) * 0.5; let prev = null;
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG, al = len * t, y = H + 1.0 * t - 2.2 * t * t + 0.25, w = 0.08 + 0.75 * Math.sin(3.1416 * Math.pow(t, 0.7)), bx = lean + dx * al, bz = dz * al, g1 = [0.1, 0.36 + 0.1 * t, 0.12], g2 = [0.2, 0.55, 0.18];
        const L = vert(bx + sx * w, y - 0.12 * w, bz + sz * w, g2), M = vert(bx, y + 0.1, bz, g1), R = vert(bx - sx * w, y - 0.12 * w, bz - sz * w, g2);
        if (prev) idx.push(prev[0], prev[1], L, prev[1], M, L, prev[1], prev[2], M, prev[2], R, M);
        prev = [L, M, R];
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  function buildWorld() {
    const sc = (WORLD = mkScene("world", { x0: -5, x1: 905, z0: -5, z1: 905 }, 0xd6e0d1, [55, 210])); sc.kind = "world"; sc.water = WATER; const g = sc.group;
    let seed = 77; const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const flat = (m, y) => { m.rotation.x = -Math.PI / 2; m.position.y = y; g.add(m); return m; };
    flat(mesh(new THREE.PlaneGeometry(6000, 6000), waterMat(0x2a79c9, 6000, 6000), 450, 0, 450), -0.5); flat(mesh(new THREE.PlaneGeometry(940, 940), lam(0xffffff, { map: grassTex(190, 190) }), 450, 0, 450), 0);
    { const mt = canvasTex(512, 512, (x) => { for (let i = 0; i < 70; i++) { const px = Math.random() * 512, py = Math.random() * 512, rr = 40 + Math.random() * 90, dark = Math.random() < 0.5; for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { const gr = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, rr); gr.addColorStop(0, dark ? "rgba(10,60,20,.22)" : "rgba(210,255,140,.16)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(px + ox - rr, py + oy - rr, rr * 2, rr * 2); } } }); mt.wrapS = mt.wrapT = THREE.RepeatWrapping; mt.repeat.set(3, 3); flat(mesh(new THREE.PlaneGeometry(940, 940), new THREE.MeshBasicMaterial({ map: mt, transparent: true, depthWrite: false }), 450, 0, 450), 0.012); }
    const blob = (x, z, rx, rz, col, y) => { const m = mesh(new THREE.CircleGeometry(1, 36), col === 0x2a79c9 || col === 0x3fa7e8 ? waterMat(col, rx * 2, rz * 2) : lam(col), x, 0, z); m.scale.set(rx, rz, 1); flat(m, y); };
    [[40, 890, 120, 70], [330, 912, 160, 70], [620, 912, 150, 80], [880, 870, 110, 110], [920, 640, 70, 150], [920, 330, 60, 120], [-15, 300, 60, 140], [-15, 620, 60, 120], [250, -12, 160, 60], [560, -12, 170, 60]].forEach(([x, z, rx, rz]) => { blob(x, z, rx + 7, rz + 7, 0xe6d9a0, 0.02); blob(x, z, rx, rz, 0x2a79c9, 0.03); WATER.push({ x, z, rx: rx + 2, rz: rz + 2 }); });
    [[330, 470, 34, 26], [590, 505, 30, 24], [255, 645, 36, 28], [560, 150, 38, 30], [470, 430, 26, 20], [700, 560, 30, 24], [60, 400, 30, 24], [300, 220, 28, 22]].forEach(([x, z, rx, rz]) => { const q = nearSeg(x, z, 60); if ((q.s && q.d < Math.max(rx, rz) + 10) || TOWNS.some((t) => inTownRect(x, z, t, Math.max(rx, rz) + 8))) return; blob(x, z, rx + 4, rz + 4, 0xe6d9a0, 0.02); blob(x, z, rx, rz, 0x3fa7e8, 0.03); WATER.push({ x, z, rx: rx + 1, rz: rz + 1 }); });
    SEGS.forEach((s) => { const grp = new THREE.Group(); grp.position.set((s.ax + s.bx) / 2, 0.035, (s.az + s.bz) / 2); grp.rotation.y = -Math.atan2(s.bz - s.az, s.bx - s.ax); const pl = mesh(new THREE.PlaneGeometry(s.len + 0.6, s.hw > 11 ? 6.5 : 5), lam(0xb39c6e)); pl.rotation.x = -Math.PI / 2; grp.add(pl); g.add(grp); const j = mesh(new THREE.CircleGeometry(s.hw > 11 ? 3.25 : 2.5, 14), lam(0xb39c6e), s.ax, 0, s.az); flat(j, 0.036); });
    /* towns */
    TOWNS.forEach((t, i) => {
      flat(mesh(new THREE.PlaneGeometry(92, 60), lam(0xbfae82), t.x, 0, t.z - 4), 0.04);
      const post = mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), lam(0x7a5230), t.x - 40, 1.2, t.z + 8), lb = labelSprite(t.n.toUpperCase(), 9, "rgba(10,20,40,.9)", "#8fe6ff"); lb.position.set(t.x - 40, 3.5, t.z + 8); g.add(post, lb);
      const bz = (d) => t.z - 6.5 - d / 2;
      if (i === 0) {
        building(sc, { x: t.x - 20, z: bz(7), w: 7, d: 7, wall: 0xf0e2c0, roof: 0xc4483c, text: "YOUR HOME", key: "home", dl: "Enter your home" });
        building(sc, { x: t.x - 2, z: bz(9), w: 11, d: 9, h: 4, wall: 0xe8eefc, roof: 0x3d6bb0, text: "PROF. LINDEN’S LAB", key: "lab", dl: "Enter the Lab" });
        building(sc, { x: t.x + 17, z: bz(7), w: 7, d: 7, wall: 0xf0e2c0, roof: 0x2f8a5a });
      } else {
        const cx = t.stadium ? t.x - 26 : t.x - 18, mx = t.stadium ? t.x + 26 : t.x - 6;
        building(sc, { x: cx, z: bz(8), w: 8, d: 8, wall: 0xfff0f0, roof: 0xe84a5f, text: "POKÉMON CENTER", key: "center", dl: "Enter Pokémon Center" });
        building(sc, { x: mx, z: bz(8), w: 8, d: 8, wall: 0xe8f2ff, roof: 0x3d6bff, text: "POKÉ MART", key: "mart", dl: "Enter Poké Mart" });
        if (t.stadium) building(sc, { x: t.x, z: bz(14), w: 26, d: 14, h: 8, rh: 4, wall: 0x5a4f8a, roof: 0x2a2250, text: "CHAMPIONS STADIUM", bg: "#1e1640", tc: "#c9b8ff", key: "stadium", dl: "Enter the Stadium" });
        else { const gm = GYMS[t.gym]; building(sc, { x: t.x + 12, z: bz(10), w: 13, d: 10, h: 5, rh: 3, wall: gm.wall, roof: gm.acc, text: gm.badge.toUpperCase() + " GYM", bg: "rgba(10,10,20,.92)", tc: hex(gm.acc), key: "gym:" + t.gym, dl: "Enter " + gm.badge + " Gym" }); }
        if (i === 4) building(sc, { x: t.x + 33, z: bz(8), w: 9, d: 8, h: 3.6, wall: 0x4a4d58, roof: 0x23252e, text: "OLD WAREHOUSE", bg: "rgba(30,6,6,.92)", tc: "#ff5a5a", key: "rocket", dl: "Enter the Old Warehouse" });
      }
      [[-26, 22], [-6, 23], [14, 22], [28, 23]].forEach(([dx, dz], k) => building(sc, { x: t.x + dx, z: t.z + dz, w: 6, d: 6, wall: 0xf0e2c0, roof: [0xc4483c, 0x3d6bb0, 0x7a5aa8, 0x2f8a5a][(i + k) % 4], nodoor: true, rot: Math.PI }));
    });
    /* grass patches, trainers, pickups along every road */
    let tn = 0; const blades = [];
    SEGS.forEach((s) => { if (s.len < 18) return; const n = Math.max(1, Math.floor(s.len / 34)); for (let k = 0; k < n; k++) { const t2 = (k + 0.5) / n, cx = s.ax + (s.bx - s.ax) * t2, cz = s.az + (s.bz - s.az) * t2, nx = -(s.bz - s.az) / s.len, nz = (s.bx - s.ax) / s.len, off = (k % 2 ? 1 : -1) * (s.hw > 11 ? 5 : 3.5), px = cx + nx * off, pz = cz + nz * off; if (townAt(px, pz, 10) >= 0 || TOWNS.some((t) => inTownRect(px, pz, t, 14))) continue; sc.patches.push({ x: px, z: pz, w: 18, d: 12, r: s.tab }); } });
    ROUTE_PTS.forEach((_, ri) => {
      const L = routeLen(ri);
      for (let k = 0; k < 4; k++) {
        const pa = pointAlong(ri, (L * (k + 1)) / 5), side = k % 2 ? 1 : -1, ox = -pa.dz * side * 9, oz = pa.dx * side * 9, name = TNAMES[tn++ % TNAMES.length], lv = RT[ri].lv[0] - 2 + k, ids = RT[ri].ids, nt = 2 + (k > 1 ? 1 : 0), team = [];
        for (let q = 0; q < nt; q++) team.push([rnd(ids), lv + q + Math.floor(r() * 2)]);
        mkTrainer(sc, { id: "t" + ri + "_" + k, name, x: pa.x + ox, z: pa.z + oz, rot: Math.atan2(-ox, -oz), team, reward: 40 + ri * 45 + k * 15, sight: 10, win: ["Wow, you’re tough!"], done: ["You beat me fair and square. Good luck!"] });
      }
      if (ri >= 2 && ri <= 4) for (let k = 0; k < 2; k++) {
        const pa = pointAlong(ri, (L * (2 * k + 1.5)) / 5.5), side = k ? 1 : -1, ox = -pa.dz * side * 4, oz = pa.dx * side * 4, lv = RT[ri].lv[0] + k;
        mkTrainer(sc, { id: "rg" + ri + "_" + k, name: "Rocket Grunt", tag: "ROCKET", tc: "#ff5a5a", look: ROCKET_LOOK, x: pa.x + ox, z: pa.z + oz, rot: Math.atan2(-ox, -oz), team: [[41, lv], [19, lv - 1], [92, lv]], reward: 120 + ri * 30, sight: 12, intro: ["Hand over your Pokémon! Team Rocket takes what it wants!"], win: ["Tch… the boss won’t be happy about this."], done: ["Team Rocket… will be back!"] });
      }
      for (let k = 0; k < 6; k++) { const pa = pointAlong(ri, 15 + r() * (L - 30)), a = (r() - 0.5) * 2 * 9; sc.picks.push({ id: "p" + ri + "_" + k, x: pa.x - pa.dz * a, z: pa.z + pa.dx * a, kind: ["potion", "potion", "super", "pokeball", "great", "revive", "berry", "candy"][Math.floor(r() * 8) % 8] }); }
    });
    SIDE_PTS.forEach((pts, si) => {
      const e = pts[pts.length - 1], rareK = ["ultra", "candy", "master", "revive", "hyper", "ultra", "candy"][si]; sc.picks.push({ id: "sp" + si + "_0", x: e[0], z: e[1], kind: rareK }, { id: "sp" + si + "_1", x: e[0] + 4, z: e[1] + 3, kind: "super" });
      const m = pts[1]; mkTrainer(sc, { id: "st" + si, name: TNAMES[(tn++ + 7) % TNAMES.length], x: m[0] + 4, z: m[1] + 4, rot: Math.PI, team: [[rnd(RT[si].ids), RT[si].lv[0] + 2], [rnd(RT[si].ids), RT[si].lv[0] + 3]], reward: 90 + si * 40, sight: 10, win: ["Not bad at all!"], done: ["Enjoy the view from here."] });
    });
    TOWNS.forEach((t, i) => { for (let k = 0; k < 3; k++) sc.picks.push({ id: "b" + i + "_" + k, x: t.x - 30 + k * 30 + r() * 6, z: t.z + 16 + r() * 5, kind: "berry" }); });
    sc.patches.forEach((p) => { flat(mesh(new THREE.PlaneGeometry(p.w, p.d), lam(0x3f8f3a), p.x, 0, p.z), 0.045); for (let i = 0; i < 50; i++) blades.push([p.x + (r() - 0.5) * p.w, p.z + (r() - 0.5) * p.d, 0.7 + r() * 0.7]); });
    const dm = new THREE.Object3D(), col = new THREE.Color(), bl = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.9, 4), lam(0xffffff), blades.length);
    blades.forEach((b, i) => { dm.rotation.set(0, r() * 6, 0); dm.scale.setScalar(b[2]); dm.position.set(b[0], 0.4 * b[2], b[1]); dm.updateMatrix(); bl.setMatrixAt(i, dm.matrix); col.setHSL(0.3 + r() * 0.06, 0.6, 0.28 + r() * 0.12); bl.setColorAt(i, col); });
    bl.instanceMatrix.needsUpdate = true; if (bl.instanceColor) bl.instanceColor.needsUpdate = true; g.add(bl);
    /* gates — oriented barriers across the road */
    const mkGate = (ri, dist, msg, req) => { const pa = pointAlong(ri, dist), m = new THREE.Group(); for (let z = -RW + 1; z <= RW - 1; z += 2.8) m.add(mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), lam(Math.abs(z % 5.6) < 0.2 ? 0x222222 : 0xffd43b), 0, 0.8, z)); m.add(mesh(new THREE.BoxGeometry(0.2, 0.3, RW * 2), lam(0xffffff), 0, 1.3, 0)); const gd = makeTrainer(npcLook("guard" + ri + dist)); gd.position.set(-2.2, 0, 2.4); gd.rotation.y = -Math.PI / 2; m.add(gd); m.position.set(pa.x, 0, pa.z); m.rotation.y = Math.atan2(-pa.dz, pa.dx); g.add(m); const gt = { x: pa.x, z: pa.z, dx: pa.dx, dz: pa.dz, msg, req, mesh: m }; sc.gates.push(gt); };
    mkGate(0, 66, "Hold on! It’s not safe on the road without a Pokémon. Go see Prof. Linden at the lab first.", () => G.flags.starter);
    TOWNS.forEach((t, i) => { if (i === 0 || t.stadium) return; const ri = i, ok = i === 4 ? () => G.badges.includes(3) && G.flags.rocket : () => G.badges.includes(t.gym); mkGate(ri, 70, i === 4 ? "The road is closed! Team Rocket has taken over the Old Warehouse in Mossveil. Clear them out and earn the Leaf Badge first." : "The road is closed until you earn the " + GYMS[t.gym].badge + " Badge from " + GYMS[t.gym].leader + "’s gym.", ok); });
    mkGate(6, routeLen(6) - 70, "Only trainers with all 6 badges may enter Champions Stadium!", () => G.badges.length >= 6);
    /* trees, rocks, flowers, mountains, clouds (instanced) */
    const NT = 7400, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.3, 1.5, 6), lam(0x7a5230), NT), lg = new THREE.IcosahedronGeometry(1.25, 0), la = new THREE.InstancedMesh(lg, lam(0xffffff), NT), lb2 = new THREE.InstancedMesh(lg, lam(0xffffff), NT);
    const TS = []; let n = 0; const putTree = (x, z, collide) => { const s = 0.8 + r() * 0.8; TS.push(x, z, s); dm.rotation.set(0, 0, 0); dm.scale.setScalar(s); dm.position.set(x, 0.75 * s, z); dm.updateMatrix(); trunk.setMatrixAt(n, dm.matrix); dm.rotation.y = r() * 6; dm.position.set(x, 2.2 * s, z); dm.updateMatrix(); la.setMatrixAt(n, dm.matrix); dm.scale.setScalar(0.75 * s); dm.position.set(x + 0.3 * s, 3.1 * s, z + 0.1 * s); dm.updateMatrix(); lb2.setMatrixAt(n, dm.matrix); const nearTown = TOWNS.findIndex((t) => Math.hypot(x - t.x, z - t.z) < 160), hue = nearTown === 6 || nearTown === 7 ? 0.5 : nearTown === 5 ? 0.1 : 0.29 + r() * 0.09; col.setHSL(hue, 0.5, 0.24 + r() * 0.1); la.setColorAt(n, col); lb2.setColorAt(n, col); if (collide) sc.col.add(x, z, 0.9 * s); n++; };
    for (let i = 0; i < 160000 && n < 6200; i++) { const x = -15 + r() * 930, z = -15 + r() * 930; if (TOWNS.some((t) => inTownRect(x, z, t, 6))) continue; const q = nearSeg(x, z, 6); if (q.s && q.d < 3) continue; putTree(x, z, false); }
    for (let i = 0; i < 20000 && n < NT; i++) { const s = SEGS[Math.floor(r() * SEGS.length)], t2 = r(), side = r() < 0.5 ? -1 : 1, off = side * (4.4 + r() * (s.hw - 5.4)), x = s.ax + (s.bx - s.ax) * t2 + (-(s.bz - s.az) / s.len) * off, z = s.az + (s.bz - s.az) * t2 + ((s.bx - s.ax) / s.len) * off; if (TOWNS.some((t) => inTownRect(x, z, t, 4)) || sc.patches.some((p) => Math.abs(x - p.x) < p.w / 2 && Math.abs(z - p.z) < p.d / 2)) continue; putTree(x, z, true); }
    [trunk, la, lb2].forEach((m) => { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; g.add(m); });
    { /* palms around every coast + undergrowth along the roads (own RNG: world layout is unchanged) */
      let ps = 4242; const pr = () => { ps = (ps * 16807) % 2147483647; return (ps - 1) / 2147483646; };
      const NP = 460, pm = new THREE.InstancedMesh(makePalmGeo(), lam(0xffffff, { vertexColors: true, side: THREE.DoubleSide }), NP); let pn = 0;
      for (let tries = 0; tries < 9000 && pn < NP; tries++) {
        const w = WATER[Math.floor(pr() * WATER.length)], an = pr() * 6.2832, k = 2 + pr() * 9, x = w.x + Math.cos(an) * (w.rx + k), z = w.z + Math.sin(an) * (w.rz + k);
        if (x < 5 || x > 895 || z < 5 || z > 895 || inWater(WATER, x, z) || townAt(x, z, 8) >= 0 || nearSeg(x, z).d < 3) continue;
        const s = 0.85 + pr() * 0.6; dm.rotation.set((pr() - 0.5) * 0.12, pr() * 6.2832, (pr() - 0.5) * 0.12); dm.scale.setScalar(s); dm.position.set(x, 0, z); dm.updateMatrix(); pm.setMatrixAt(pn++, dm.matrix); TS.push(x, z, s * 0.9);
      }
      pm.count = pn; pm.instanceMatrix.needsUpdate = true; g.add(pm);
      const NB = 2600, bm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.75, 0), lam(0xffffff), NB); let bn = 0;
      for (let tries = 0; tries < 30000 && bn < NB; tries++) {
        const s = SEGS[Math.floor(pr() * SEGS.length)], t2 = pr(), off = (pr() < 0.5 ? -1 : 1) * (4.2 + pr() * Math.max(1, s.hw - 5)), x = s.ax + (s.bx - s.ax) * t2 + (-(s.bz - s.az) / s.len) * off, z = s.az + (s.bz - s.az) * t2 + ((s.bx - s.ax) / s.len) * off;
        if (townAt(x, z, 6) >= 0 || inWater(WATER, x, z)) continue;
        const sz = 0.7 + pr() * 0.9; dm.rotation.set(0, pr() * 6.2832, 0); dm.scale.set(sz * 1.1, sz * 0.7, sz * 1.1); dm.position.set(x, 0.3 * sz, z); dm.updateMatrix(); bm.setMatrixAt(bn, dm.matrix); col.setHSL(0.25 + pr() * 0.11, 0.55, 0.15 + pr() * 0.13); bm.setColorAt(bn++, col);
      }
      bm.count = bn; bm.instanceMatrix.needsUpdate = true; if (bm.instanceColor) bm.instanceColor.needsUpdate = true; g.add(bm);
      const cnt = TS.length / 3, tsh = new THREE.InstancedMesh(new THREE.CircleGeometry(1.5, 10), new THREE.MeshBasicMaterial({ color: 0x0a1a08, transparent: true, opacity: 0.3, depthWrite: false }), cnt);
      for (let i = 0; i < cnt; i++) { dm.rotation.set(-Math.PI / 2, 0, 0); dm.scale.setScalar(TS[i * 3 + 2] * 1.15); dm.position.set(TS[i * 3], 0.05, TS[i * 3 + 1]); dm.updateMatrix(); tsh.setMatrixAt(i, dm.matrix); } tsh.instanceMatrix.needsUpdate = true; g.add(tsh);
    }
    const NR = 140, rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.8, 0), lam(0x9a9aa8), NR); n = 0;
    for (let i = 0; i < 20000 && n < NR; i++) { const s = SEGS[Math.floor(r() * SEGS.length)], t2 = r(), off = (r() < 0.5 ? -1 : 1) * (5 + r() * (s.hw - 5.5)), x = s.ax + (s.bx - s.ax) * t2 - ((s.bz - s.az) / s.len) * off, z = s.az + (s.bz - s.az) * t2 + ((s.bx - s.ax) / s.len) * off; if (TOWNS.some((t) => inTownRect(x, z, t, 4))) continue; const sz = 0.6 + r() * 1.1; dm.rotation.set(0, r() * 6, 0); dm.scale.set(sz, sz * 0.8, sz); dm.position.set(x, 0.4 * sz, z); dm.updateMatrix(); rocks.setMatrixAt(n, dm.matrix); sc.col.add(x, z, 0.8 * sz); n++; }
    rocks.count = n; rocks.instanceMatrix.needsUpdate = true; g.add(rocks);
    const NF = 2200, fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 5), lam(0xffffff), NF), fc = [0xff6b8b, 0xffd43b, 0xffffff, 0xc77dff, 0xff9e5a];
    for (let i = 0; i < NF; i++) { const s = SEGS[Math.floor(r() * SEGS.length)], t2 = r(), off = (r() - 0.5) * 2 * s.hw; dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.position.set(s.ax + (s.bx - s.ax) * t2 - ((s.bz - s.az) / s.len) * off, 0.14, s.az + (s.bz - s.az) * t2 + ((s.bx - s.ax) / s.len) * off); dm.updateMatrix(); fl.setMatrixAt(i, dm.matrix); col.setHex(fc[i % 5]); fl.setColorAt(i, col); }
    fl.instanceMatrix.needsUpdate = true; if (fl.instanceColor) fl.instanceColor.needsUpdate = true; g.add(fl);
    const mG = new THREE.ConeGeometry(1, 1, 6);
    for (let i = 0; i < 160; i++) { const x = -10 + r() * 920, z = -10 + r() * 920; const q = nearSeg(x, z, 40); if ((q.s && q.d < 24) || TOWNS.some((t) => inTownRect(x, z, t, 22))) continue; const h = 14 + r() * 34, w2 = 10 + r() * 14, o = mesh(mG, lam(r() < 0.3 ? 0xdfe8f2 : 0x6f8fb8), x, h / 2, z); o.scale.set(w2, h, w2); g.add(o); }
    for (let i = 0; i < 34; i++) { const c = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }); for (let k = 0; k < 4; k++) { const b = mesh(new THREE.SphereGeometry(2.4 + r() * 1.8, 10, 8), m, k * 2.6, r(), r() * 1.8); b.scale.y = 0.55; c.add(b); } c.position.set(r() * 1000 - 50, 30 + r() * 10, r() * 1000 - 50); g.add(c); sc.clouds.push(c); }
    placeTownNpcs(sc); placePickups(sc);
    return sc;
  }
  function placePickups(sc) {
    sc.picks.forEach((p) => { const s = itemSprite(p.kind, 1.1); s.position.set(p.x, 0.8, p.z); sc.group.add(s); p.mesh = s; sc.inter.push({ x: p.x, z: p.z, r: 1.8, label: "Pick up item", when: () => !G.picked.includes(p.id), fn: () => pickUp(p) }); });
  }

  /* ---------- interiors ---------- */
  function buildInterior(key) {
    const [kind, arg] = key.split(":"), I = +arg;
    const dim = { center: [32, 24], mart: [28, 22], gym: [38, 54], lab: [24, 18], home: [20, 16], stadium: [48, 38], rocket: [52, 64] }[kind], w = dim[0], d = dim[1];
    const sc = mkScene(key, { x0: -w / 2 + 1.2, x1: w / 2 - 1.2, z0: -d / 2 + 1.6, z1: d / 2 - 0.8 }, 0x1b2540, [40, 110]); sc.kind = kind; sc.w = w; sc.d = d; sc.exit = { x: 0, z: d / 2 - 1 };
    const g = sc.group, gt = kind === "gym" ? GYMS[I] : null;
    const th = gt ? { pat: gt.pat, wall: gt.wall, acc: gt.acc } : { center: { pat: ["check", "#fbeef0", "#f4b7c5"], wall: 0xf6d8de, acc: 0xe84a5f }, mart: { pat: ["plank", "#c99b66", "#a87a48"], wall: 0x8fb4e8, acc: 0x3d6bff }, lab: { pat: ["tile", "#e8eef8", "#b9c6dd"], wall: 0xc9d6ee, acc: 0x3d6bb0 }, home: { pat: ["plank", "#c99b66", "#a87a48"], wall: 0xeadcb9, acc: 0xc4483c }, stadium: { pat: ["tile", "#2f3452", "#555d90"], wall: 0x3a3060, acc: 0x8a6aff }, rocket: { pat: ["tile", "#262932", "#3a3f4d"], wall: 0x23252e, acc: 0xff4a4a } }[kind];
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
      title("HOME SWEET HOME", 9); bx(1.8, 2.4, 1.2, 0x3d6bff, w / 2 - 3, -d / 2 + 2.2); g.add(mesh(new THREE.PlaneGeometry(1.3, 0.9), new THREE.MeshBasicMaterial({ color: 0x8fe6ff }), w / 2 - 3, 1.7, -d / 2 + 2.85)); sc.inter.push({ x: w / 2 - 3, z: -d / 2 + 3.8, r: 2.6, label: "Use PC", fn: pcMenu });
      mkNpc(sc, { name: "Mom", tag: "MOM", x: 2, z: 1, rot: 0, look: { g: "g", skin: 0, hairS: 3, hairC: 1, jacket: 4, pants: 3, capOn: false, capC: 7, bag: 4 }, talk: momTalk });
    } else if (kind === "gym") {
      const accC = new THREE.Color(gt.acc).getHex();
      const lane = mesh(new THREE.PlaneGeometry(6, d - 12), new THREE.MeshBasicMaterial({ color: accC, transparent: true, opacity: 0.28 }), 0, 0.03, 2); lane.rotation.x = -Math.PI / 2; g.add(lane);
      const plat = prop(new THREE.CylinderGeometry(6, 6.4, 0.5, 32), 0x2a2a3a, 0, 0.25, -d / 2 + 6.5); const ring = mesh(new THREE.RingGeometry(3.4, 3.8, 40), new THREE.MeshBasicMaterial({ color: accC, side: THREE.DoubleSide }), 0, 0.52, -d / 2 + 6.5); ring.rotation.x = -Math.PI / 2; g.add(ring);
      title(gt.badge.toUpperCase() + " GYM", 12, hex(gt.acc));
      [-8, 8].forEach((x) => { prop(new THREE.CylinderGeometry(0.8, 1, 1.2, 8), 0x555566, x, 0.6, d / 2 - 6, 1.1); const st = itemSprite("pokeball", 1.6); st.position.set(x, 2.2, d / 2 - 6); g.add(st); });
      const ty = gt.ty;
      if (ty === "rock") [[-12, 4], [12, -2], [-11, -12], [13, 12], [-14, 14], [10, -16]].forEach(([x, z]) => { const m = prop(new THREE.DodecahedronGeometry(2.2, 0), 0x8a7f72, x, 1.6, z, 2.4); m.scale.y = 0.9; });
      if (ty === "water") [[-11, 4], [11, 4], [-11, -12], [11, -12]].forEach(([x, z]) => { const p = mesh(new THREE.CircleGeometry(4.2, 28), new THREE.MeshLambertMaterial({ color: 0x3fa7e8, transparent: true, opacity: 0.9 }), x, 0.05, z); p.rotation.x = -Math.PI / 2; g.add(p); sc.col.add(x, z, 3.6); sc.water.push({ x, z, rx: 4.3, rz: 4.3 }); });
      if (ty === "electric") for (let z = d / 2 - 8; z > -d / 2 + 10; z -= 9) [-1, 1].forEach((k) => { prop(new THREE.CylinderGeometry(0.25, 0.3, 4.5, 8), 0x444444, k * 11, 2.25, z, 0.5); g.add(mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe14a }), k * 11, 4.7, z)); });
      if (ty === "grass") [[-11, 6], [11, -2], [-11, -12], [11, -14]].forEach(([x, z]) => { bx(10, 1.6, 1.6, 0x2f8a3a, x, z); bx(1.6, 1.6, 6, 0x2f8a3a, x + (x < 0 ? -4 : 4), z + 2); });
      if (ty === "fire") [-1, 1].forEach((k) => { const lv = mesh(new THREE.PlaneGeometry(4, d - 16), new THREE.MeshBasicMaterial({ color: 0xff5a1a }), k * 13, 0.04, 0); lv.rotation.x = -Math.PI / 2; g.add(lv); for (let z = -d / 2 + 12; z < d / 2 - 6; z += 10) { prop(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), 0x333333, k * 9.5, 1.5, z, 0.5); const fs = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex("🔥"), transparent: true })); fs.scale.set(1.6, 1.6, 1); fs.position.set(k * 9.5, 3.6, z); g.add(fs); } });
      if (ty === "ice") [[-12, 6], [12, -2], [-12, -12], [12, 14], [-9, 16], [10, -15]].forEach(([x, z]) => { const m = prop(new THREE.OctahedronGeometry(1.8, 0), 0xaee6ff, x, 2.2, z, 1.8, { transparent: true, opacity: 0.85 }); m.scale.y = 1.6; });
      const nt = I < 2 ? 2 : 3;
      for (let j = 0; j < nt; j++) { const lv = gt.team[0][1] - 6 + j * 2, ids = [GYM_POOL[ty] || []].flat(); const team = [[rnd(ids), lv], [rnd(ids), lv + 1]]; mkTrainer(sc, { id: "gt" + I + "_" + j, name: ["Cadet", "Scout", "Ace"][j] + " " + ["Rin", "Tao", "Vic", "Sam"][(I + j) % 4], x: j % 2 ? 7 : -7, z: d / 2 - 14 - j * 10, rot: 0, team, reward: 80 + I * 40, sight: 12, fm: 1, intro: [gt.leader + "’s trainers are no pushovers!"], win: ["Go on, face the Leader!"] }); }
      mkTrainer(sc, { id: "gym" + I, name: gt.leader, tag: "GYM LEADER " + gt.leader.toUpperCase(), x: 0, z: -d / 2 + 5, rot: 0, look: npcLook("leader" + I), team: gt.team, reward: gt.reward, sight: 0, ir: 3.6, fm: 1, xpm: 1.5, intro: [gt.line, "I’m " + gt.leader + ", leader of the " + gt.badge + " Gym. Show me your strength!"], win: ["Incredible! You’ve earned the " + gt.badge + " Badge!"], done: ["The " + gt.badge + " Badge suits you. Keep climbing!"], gate: () => G.def.filter((x) => x.startsWith("gt" + I + "_")).length >= nt, gateMsg: ["Beat my trainers before you challenge me!"], after: () => { G.badges.push(I); G.flags.lastBadge = I; saveStory(); refreshStory(); toast({ icon: badgeImg(I, true, 28), title: gt.badge + " Badge earned!", tone: "success" }); dialog(["You received the " + gt.badge + " Badge!", G.badges.length < 6 ? "The road onward is now open." : "You have all 6 badges! Champions Stadium awaits!"], () => showBadge(I)); } });
      mkNpc(sc, { name: "Gym Guide", tag: "GYM GUIDE", x: -6, z: d / 2 - 4, rot: Math.PI, talk: () => dialog(lines("Gym Guide", ["This is the " + gt.badge + " Gym. Beat the gym trainers, then challenge " + gt.leader + "!", "Weak to " + gt.ty.toUpperCase() + "? Bring a counter type!"])) });
    } else if (kind === "rocket") {
      title("TEAM ROCKET HIDEOUT", 14, "#ff5a5a"); const wl = (x0, x1, z) => bx(x1 - x0, 3.2, 1.4, 0x3a3f4d, (x0 + x1) / 2, z);
      wl(-w / 2 + 1, -6, 10); wl(6, w / 2 - 1, 10); wl(-w / 2 + 1, 10, -6); wl(18, w / 2 - 1, -6); wl(-w / 2 + 1, -10, -22); wl(2, w / 2 - 1, -22);
      [[-18, 26], [16, 24], [-20, 2], [20, 4], [-4, -14], [12, -16], [-16, -28], [18, -27]].forEach(([x, z]) => bx(2.6, 2.2, 2.6, 0x6b5a3a, x, z));
      [-8, 8].forEach((x) => { const lt = mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b3b }), x, 3.8, d / 2 - 4); g.add(lt); });
      const tm = (j) => [[41, 33], [92, 34], [19, 33]].map(([id, lv]) => [id, lv + j]);
      [[-14, 22], [12, 5], [-14, -12], [10, -28]].forEach(([x, z], j) => mkTrainer(sc, { id: "rk" + j, name: "Rocket Grunt", tag: "ROCKET", tc: "#ff5a5a", look: ROCKET_LOOK, x, z, rot: 0, team: tm(j), reward: 220, sight: 13, fm: 1, intro: ["You found our hideout?! We can’t let you leave!"], win: ["Argh! Boss is going to flip…"], done: ["…"] }));
      mkTrainer(sc, { id: "rkA", name: "Rocket Admin Ariana", tag: "ADMIN ARIANA", tc: "#ff5a5a", look: Object.assign({}, ROCKET_LOOK, { g: "g", hairS: 3, hairC: 3 }), x: 0, z: -d / 2 + 13, rot: 0, team: [[94, 36], [76, 36], [248, 37]], reward: 500, sight: 12, xpm: 1.5, intro: ["I am Ariana, Team Rocket’s Admin. The Boss has big plans for this town’s Pokémon!"], win: ["Impossible… Boss! Someone is coming!"], done: ["Go on. The Boss is waiting."] });
      mkTrainer(sc, { id: "rkB", name: "Giovanni", tag: "BOSS GIOVANNI", tc: "#ff5a5a", look: Object.assign({}, ROCKET_LOOK, { jacket: 1, hairC: 1, capOn: false }), x: 0, z: -d / 2 + 5, rot: 0, ir: 3.6, team: [[76, 38], [94, 39], [248, 40], [149, 42]], reward: 3000, sight: 0, xpm: 2, gate: () => G.def.includes("rkA"), gateMsg: ["Defeat my Admin first, kid."], intro: ["So you’re the brat who’s been wrecking Team Rocket’s plans.", "I am Giovanni, boss of Team Rocket. Let’s see if you’re worth my time!"], win: ["Impossible… Team Rocket is finished here. We’ll return!"], done: ["Team Rocket has vanished from Mossveil. Thanks to you."], after: () => { G.flags.rocket = 1; G.bag.candy = (G.bag.candy || 0) + 3; saveStory(); refreshStory(); dialog(["Team Rocket has been driven out of Mossveil!", "You found 3 Rare Candies in the boss’s hideout!", "The road east is open again."]); } });
    } else if (kind === "stadium") {
      const arenaC = mesh(new THREE.CircleGeometry(10, 48), lam(0x2a1f4a), 0, 0.03, 2); arenaC.rotation.x = -Math.PI / 2; g.add(arenaC); [3, 6, 9.5].forEach((rr, i) => { const rg2 = mesh(new THREE.RingGeometry(rr - 0.12, rr, 48), new THREE.MeshBasicMaterial({ color: i === 2 ? 0xffcf45 : 0x8a6aff, side: THREE.DoubleSide }), 0, 0.05, 2); rg2.rotation.x = -Math.PI / 2; g.add(rg2); });
      title("CHAMPIONS STADIUM", 14, "#c9b8ff"); bx(8, 1.2, 2.4, 0x3a3060, 0, -d / 2 + 6);
      prop(new THREE.CylinderGeometry(0.8, 1.1, 1.6, 10), 0xd9a400, -12, 0.8, -d / 2 + 4, 1.2); prop(new THREE.SphereGeometry(1, 14, 10), 0xffd43b, -12, 2.4, -d / 2 + 4); prop(new THREE.CylinderGeometry(0.8, 1.1, 1.6, 10), 0xd9a400, 12, 0.8, -d / 2 + 4, 1.2); prop(new THREE.SphereGeometry(1, 14, 10), 0xffd43b, 12, 2.4, -d / 2 + 4);
      const cc = [0xffcf45, 0x4fb3ff, 0xff6b8b, 0x8ce99a, 0xc77dff]; for (let i = 0; i < 40; i++) { const a = (i / 40) * 3.14159 + 3.14159, x = Math.cos(a) * 20, z = Math.sin(a) * 15 + 4; if (Math.abs(x) < w / 2 - 1) g.add(mesh(new THREE.SphereGeometry(0.4, 6, 5), lam(cc[i % 5]), x, 1.2, z)); }
      mkNpc(sc, { name: "Registrar", tag: "REGISTRAR", x: 0, z: -d / 2 + 3.8, rot: 0, look: npcLook("registrar"), ir: 3.6, talk: registrarTalk });
      mkNpc(sc, { name: "Stadium Fan", x: -10, z: 8, rot: 0.8, talk: () => dialog(lines("Fan", ["The tournament is the biggest event in the region! Only trainers with 6 badges can enter."])) });
      sc.inter.push({ x: 8, z: -d / 2 + 6, r: 3, label: "Check bracket", fn: () => showBracket(G.flags.bracket) });
    }
    polishInterior(sc, kind, w, d, th);
    return sc;
  }
  function polishInterior(sc, kind, w, d, th) {
    const g = sc.group, dark = new THREE.Color(th.wall).multiplyScalar(0.7).getHex(), acc = th.acc, hall = kind === "gym" || kind === "rocket" || kind === "stadium";
    const bx = (bw, bh, bd, c, x, y, z, op) => { const m = mesh(new THREE.BoxGeometry(bw, bh, bd), lam(c, op), x, y, z); g.add(m); return m; };
    bx(w - 0.2, 2.2, 0.08, dark, 0, 1.1, -d / 2 + 0.04); bx(w, 0.14, 0.14, acc, 0, 2.25, -d / 2 + 0.07); bx(w, 0.3, 0.16, 0xf4efe6, 0, 0.15, -d / 2 + 0.08); bx(w, 0.18, 0.2, 0xf4efe6, 0, 6.9, -d / 2 + 0.1);
    [-1, 1].forEach((s) => { bx(0.08, 2.2, d - 0.2, dark, s * (w / 2 - 0.04), 1.1, 0); bx(0.14, 0.14, d, acc, s * (w / 2 - 0.07), 2.25, 0); bx(0.16, 0.3, d, 0xf4efe6, s * (w / 2 - 0.08), 0.15, 0); bx(0.2, 0.18, d, 0xf4efe6, s * (w / 2 - 0.1), 6.9, 0); });
    if (!hall) {
      const n = w > 24 ? 3 : 2, art = canvasTex(64, 48, (x) => { const gr = x.createLinearGradient(0, 0, 0, 48); gr.addColorStop(0, "#8fd0ff"); gr.addColorStop(1, "#e9f6ff"); x.fillStyle = gr; x.fillRect(0, 0, 64, 48); x.fillStyle = "#ffd36b"; x.beginPath(); x.arc(46, 14, 7, 0, 6.2832); x.fill(); x.fillStyle = "#4f9a42"; x.beginPath(); x.moveTo(0, 48); x.quadraticCurveTo(20, 20, 40, 48); x.fill(); x.fillStyle = "#3a7d34"; x.beginPath(); x.moveTo(24, 48); x.quadraticCurveTo(46, 26, 64, 48); x.fill(); });
      const step = w / (n + 0.6);
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * step, z = -d / 2 + 0.1;
        bx(2.5, 2.3, 0.12, 0xffffff, x, 4.3, z); bx(2.1, 1.9, 0.06, 0xcfeaff, x, 4.3, z + 0.05, { emissive: 0x6fa8d8 }); bx(0.08, 1.9, 0.08, 0xffffff, x, 4.3, z + 0.1); bx(2.1, 0.08, 0.08, 0xffffff, x, 4.3, z + 0.1);
        const sh = mesh(new THREE.PlaneGeometry(2, 5.5), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), x, 2.1, z + 2.2); sh.rotation.x = -0.75; g.add(sh);
        if (i < n - 1) { const px = x + step / 2; bx(1.5, 1.1, 0.08, 0x5a3b22, px, 3.4, z + 0.05); const pc = mesh(new THREE.PlaneGeometry(1.3, 0.9), new THREE.MeshBasicMaterial({ map: art }), px, 3.4, z + 0.1); g.add(pc); }
      }
      if (kind === "home") { bx(5, 0.04, 3.4, 0xb8434a, -2, 0.03, 1.5); bx(4.4, 0.05, 2.8, 0xe0a458, -2, 0.04, 1.5); }
      if (kind === "lab") bx(6, 0.04, 3.5, 0x3d6bb0, 0, 0.03, 3);
    }
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
    camera.position.set(SO.x + 0.4, 3.7, SO.z + 10.2); camSnap = true; BT.cam = true; bt$("bt").hidden = false; ["av-hud", "av-map", "av-feed", "av-act", "av-menu", "av-prompt", "av-loc", "av-joy", "av-run", "av-view"].forEach((id) => { const e = $(id); if (e) e.style.visibility = "hidden"; }); $("av-bottom").style.display = "none"; $("av-dlg").hidden = true;
    if (partnerH) partnerH.visible = false; trainer.visible = false;
  }
  function leaveStage() {
    BT.cam = false; stage.visible = false; (BT.meshes || []).forEach((m) => scene.remove(m)); bt$("bt").hidden = true; bt$("bt-cmd").innerHTML = ""; if (SC) { SC.group.visible = true; scene.background = new THREE.Color(SC.bg); scene.fog = new THREE.Fog(SC.bg, SC.fog[0], SC.fog[1]); }
    ["av-hud", "av-map", "av-feed", "av-act", "av-menu", "av-prompt", "av-loc", "av-joy", "av-run", "av-view"].forEach((id) => { const e = $(id); if (e) e.style.visibility = ""; }); $("av-bottom").style.display = ""; if (partnerH) partnerH.visible = true; trainer.visible = true; camSnap = true;
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
    const nf = BT.foes[BT.fi]; BT.fmon = nf; dexSeen(nf.id); BT.dispF = nf.hp; scene.remove(BT.fH);
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
    if ((G.bag.revive || 0) > 0 && G.squad.some((m) => m.hp <= 0)) rows.push(`<button class="bt-m it" data-k="rev:go">${itemImg("revive", 30)}<b>Revive</b><small>×${G.bag.revive} · fainted ally</small></button>`);
    c.innerHTML = (rows.join("") || '<div class="bt-empty">Your bag is empty.</div>') + '<button class="bt-b back" data-k="back">◀ BACK</button>';
    c.querySelectorAll("[data-k]").forEach((b) => { b.onclick = () => { const [t, id] = b.dataset.k.split(":"); if (t === "back") return renderMain(); if (t === "rev") return renderRevive(); BT.ask({ t, id }); }; });
  }
  function renderRevive() {
    const c = bt$("bt-cmd"); c.className = "bag"; bt$("bt-text").textContent = "Revive which Pokémon?";
    c.innerHTML = G.squad.map((m, i) => (m.hp <= 0 ? `<button class="bt-m it" data-i="${i}"><img class="av-it" src="${ART + m.id}.png" width="34" height="34" alt=""><b>${m.n} Lv${m.lv}</b><small>fainted</small></button>` : "")).join("") + '<button class="bt-b back" data-i="back">◀ BACK</button>';
    c.querySelectorAll("[data-i]").forEach((b) => { b.onclick = () => { if (b.dataset.i === "back") return renderBag(); BT.ask({ t: "revive", i: +b.dataset.i }); }; });
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
      G.flags.caught = (G.flags.caught || 0) + 1; dexCaught(f.id); BT.caught = f; BT.over = true; BT.res = "caught"; return true;
    }
    scene.remove(sp); burstAt(V3(z.x, 1.4, z.z)); BT.fH.userData.idle = true; await tween(250, (u) => { BT.fH.scale.setScalar(Math.max(0.01, u)); }); BT.fH.scale.setScalar(1);
    await msg(shakes >= 2 ? "Aargh! Almost had it!" : "Oh no! The Pokémon broke free!", 900); return false;
  }
  async function turnRes(cmd) {
    const pm = BT.pm, fm = BT.fmon;
    if (cmd.t === "run") { const ch = clamp(0.55 + (pm.spd - fm.spd) * 0.02, 0.3, 0.95); if (Math.random() < ch) { await msg("Got away safely!", 900); BT.over = true; BT.res = "run"; return; } await msg("Can’t escape!", 800); await foeAttack(); return; }
    if (cmd.t === "switch") { await msg("Come back, " + pm.n + "!", 600); BT.pH.userData.sink = true; BT.pH.userData.sinkT = 0; await wait(450); await sendPlayer(cmd.i); await foeAttack(); return; }
    if (cmd.t === "item") { const it = ITEMS[cmd.id]; G.bag[cmd.id]--; const before = pm.hp; pm.hp = Math.min(pm.max, pm.hp + it.heal); for (let i = 0; i < 10; i++) emit({ tex: TX.star, x: BT.pH.position.x + (Math.random() - 0.5) * 2, y: 1 + Math.random() * 2, z: BT.pH.position.z, vy: 1.5, life: 0.9, s0: 0.5, s1: 0.1, color: 0x62ff9a, add: true }); await msg("You used a " + it.n + ". " + pm.n + " recovered " + (pm.hp - before) + " HP!", 900); await animHp("p"); await foeAttack(); return; }
    if (cmd.t === "revive") { const rc = G.squad[cmd.i]; G.bag.revive--; rc.hp = Math.round(rc.max / 2); rc.pp = {}; const pp = PPOS(); for (let i = 0; i < 12; i++) emit({ tex: TX.star, x: pp.x + (Math.random() - 0.5) * 3, y: 0.5 + Math.random() * 2, z: pp.z, vy: 2, life: 1, s0: 0.6, s1: 0.1, color: 0x8ee6b0, add: true }); sfx(880, 0.2, "sine", 0.1); await msg("You used a Revive. " + rc.n + " is back on its feet!", 1000); await foeAttack(); return; }
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
    BT.fmon = o.foes[0]; dexSeen(BT.fmon.id); BT.dispF = BT.fmon.hp; placeMon("f", BT.fmon); drawBoxes();
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
  const showPad = (v) => { $("av-pad").hidden = !v; $("av-joy").hidden = !v; $("av-run").hidden = !v; };

  /* ----- saving ----- */
  const unpack = (o) => { const c = mkL(SPECIES[o.id] || SPECIES[25], o.lv); c.xp = o.xp || 0; c.hp = Math.max(0, Math.min(c.max, o.hp == null ? c.max : o.hp)); return c; };
  const pack = (c) => ({ id: c.id, lv: c.lv, xp: c.xp || 0, hp: c.hp });
  function saveStory() {
    if (!G) return; const S = G.sv.story; S.squad = G.squad.map(pack); S.box = G.box.map(pack); S.bag = Object.assign({}, G.bag); delete S.bag.revive; S.badges = G.badges; S.def = G.def; S.flags = G.flags; S.q = G.q; S.picked = G.picked; S.visited = G.visited; S.spawn = G.spawn; S.friends = G.friends; S.dex = G.dex;
    const inW = SC && SC.id === "world"; S.pos = inW ? { x: P.x, z: P.z } : G.ret ? { x: G.ret.x, z: G.ret.z } : S.pos; G.sv.played = Date.now(); saveDB();
  }
  function healAll() { G.squad.forEach(healMon); refresh(); setPartner(true); saveStory(); sfx(880, 0.2, "sine", 0.1); }

  /* ----- scenes ----- */
  function enterScene(sc, x, z, rot) {
    if (SC) SC.group.visible = false; SC = sc; sc.group.visible = true; scene.background = new THREE.Color(sc.bg); scene.fog = new THREE.Fog(sc.bg, sc.fog[0], sc.fog[1]);
    fxEnter(sc); P.x = x; P.z = z; if (rot !== undefined) P.rot = rot; camSnap = true; if (G) { G.near = null; G.hist = []; } refreshMarks();
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
  const VILLAGER_LINES = ["The road is long, but the Pokémon are wonderful!", "Wild Pokémon wander the roads here — they move around, so watch out!", "Team Rocket has been spotted nearby… be careful.", "The PC at a Pokémon Center lets you swap your team.", "Try to fill your Pokédex by meeting every Pokémon in the region!", "Trainers on the road challenge you the moment they see you."];
  function placeTownNpcs(sc) {
    TOWNS.forEach((t, i) => {
      QUESTS.filter((q) => q.town === i).forEach((q, k) => mkNpc(sc, { name: q.giver, tag: q.giver.toUpperCase(), x: t.x - 25 + k * 13, z: t.z + 5.4, rot: Math.PI, qid: q.id, label: "Talk (quest)", talk: () => questTalk(q) }));
      mkNpc(sc, { name: ELDERS[i], tag: ELDERS[i].toUpperCase(), x: t.x + 26, z: t.z + 5.4, rot: Math.PI, locIdx: i, tc: "#8fe6ff", talk: () => localTalk(i) });
      for (let v = 0; v < 3; v++) { const hx0 = t.x - 28 + v * 28, hz0 = t.z + 11; mkNpc(sc, { name: "Villager", x: hx0, z: hz0, rot: v, wander: true, home: { x: hx0, z: hz0 }, wr: 6, talk: () => dialog(lines("Villager", [VILLAGER_LINES[(i + v) % VILLAGER_LINES.length]])) }); }
      for (let a = 0; a < 4; a++) {
        const sp = SPECIES[rnd([25, 133, 19, 39, 54, 41, 43, 63, 4, 7, 1, 92, 81, 74])], c = mkL(sp, 5), m = makeMon(c, 1.6), o = { c, mesh: m, x: t.x - 28 + Math.random() * 56, z: t.z + 2 + Math.random() * 12, wait: 0, home: { x: t.x, z: t.z + 8 }, wr: 24 };
        m.position.set(o.x, 0, o.z); sc.group.add(m); sc.ambient.push(o); sc.inter.push({ ref: o, r: 2.2, label: "Pet " + sp.n, fn: () => dialog([sp.n + " nuzzles up to you happily!"]) });
      }
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
        closeModal(); G.squad = [mkL(sp, 5)]; G.lead = 0; G.flags.starter = true; G.flags.pick = id; dexCaught(id); G.bag.potion = (G.bag.potion || 0) + 3; giveBalls(5);
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
    const draw = () => modal(`<h2>POKÉMON PC</h2><p>Party (${G.squad.length}/6) · Box (${G.box.length})</p><div class="av-shop"><b style="text-align:left;color:#7fa6cf">PARTY</b>${G.squad.map((c, i) => `<div class="av-item"><img class="av-it" src="${ART + c.id}.png" width="40" height="40" alt=""><div><b>${c.n} Lv${c.lv}</b><span>${c.hp}/${c.max} HP</span></div><button class="av-btn ghost" data-d="${i}" ${G.squad.length > 1 && G.box.length < 60 ? "" : "disabled"}>DEPOSIT</button></div>`).join("")}<b style="text-align:left;color:#7fa6cf">BOX</b>${G.box.map((c, i) => `<div class="av-item"><img class="av-it" src="${ART + c.id}.png" width="40" height="40" alt=""><div><b>${c.n} Lv${c.lv}</b><span>${c.hp}/${c.max} HP</span></div><button class="av-btn ghost" data-w="${i}" ${G.squad.length < 6 ? "" : "disabled"}>WITHDRAW</button></div>`).join("") || "<p>Your box is empty.</p>"}</div><div class="av-row2"><button class="av-btn" data-a="x">CLOSE</button></div>`, (m) => {
      m.querySelectorAll("[data-d]").forEach((b) => { b.onclick = () => { const c = G.squad.splice(+b.dataset.d, 1)[0]; G.box.push(c); G.lead = 0; setPartner(true); refresh(); saveStory(); draw(); }; });
      m.querySelectorAll("[data-w]").forEach((b) => { b.onclick = () => { G.squad.push(G.box.splice(+b.dataset.w, 1)[0]); refresh(); saveStory(); draw(); }; }); m.querySelector("[data-a=x]").onclick = closeModal; }, true);
    draw();
  }

  /* ----- friends (follow the player, duel on the road, join the tournament) ----- */
  function friendTeam(f, lv) { const sec = f === G.friends.a ? [25, 63] : [66, 92]; return [[evoAt(f.pick || 1, lv), lv], [evoAt(sec[0], lv - 2), lv - 2], [evoAt(sec[1], lv - 3), lv - 3]]; }
  const FOLLOW = { a: [0, 2, 4, 6], b: [1, 3, 5] };
  function ensureFriends() {
    if (!WORLD) return; WORLD.inter = WORLD.inter.filter((i) => !i.friend); (WORLD.fm || []).forEach((f) => WORLD.group.remove(f.mesh)); WORLD.fm = []; G.fm = WORLD.fm;
    if (!G.flags.starter) return;
    ["a", "b"].forEach((key) => {
      const f = G.friends[key], m = makeTrainer(f.look), l = labelSprite(f.name.toUpperCase(), 4, "rgba(10,20,40,.88)", "#8fe6ff"); l.position.set(0, 2.9, 0); m.add(l); WORLD.group.add(m); m.visible = false;
      const o = { key, mesh: m, x: P.x, z: P.z, state: "hidden", name: f.name }; WORLD.fm.push(o);
      WORLD.inter.push({ friend: true, ref: o, r: 2.7, label: "Talk to " + f.name, when: () => o.state === "town", fn: () => { m.rotation.y = Math.atan2(P.x - o.x, P.z - o.z); friendTalk(o); } });
    });
    placeFriends(areaAt(P.x, P.z));
  }
  function placeFriends(a) {
    (G.fm || []).forEach((o) => {
      if (a.k === "t") { const t = TOWNS[a.i]; o.state = "town"; o.x = t.x + (o.key === "a" ? -9 : 9); o.z = t.z + 8; o.mesh.position.set(o.x, 0, o.z); o.mesh.visible = true; }
      else if (a.k === "r" && FOLLOW[o.key].includes(a.i) && G.flags.starter) { if (o.state !== "follow") { o.x = P.x - 2 + (o.key === "a" ? -1.5 : 1.5); o.z = P.z - 2; o.mesh.position.set(o.x, 0, o.z); } o.state = "follow"; o.mesh.visible = true; }
      else { o.state = "hidden"; o.mesh.visible = false; }
    });
  }
  function friendTalk(o) {
    const f = G.friends[o.key], n = G.badges.length;
    const pool = ["Hey " + G.sv.name + "! We don’t have to walk together the whole way — I’ll meet you in the next town!", "I’ve been training hard. " + n + " badge" + (n === 1 ? "" : "s") + " already? Impressive!", "Watch out for Team Rocket — they’ve been stealing trainers’ Pokémon.", "Don’t forget the PC at a Pokémon Center to swap your team."];
    dialog(lines(f.name, [pool[(n + (o.key === "a" ? 0 : 1)) % pool.length], n >= 6 ? "The tournament is the big finale. Good luck!" : "See you on the road!"]));
  }
  const FRIEND_TOWN = {
    1: [["a", "Stonebrook! Rock-types here. Water and Grass moves will crush them!"], ["b", "Let’s heal at the Center, then we’ll each take on Flint’s gym."]],
    2: [["b", "Bluewater is so pretty! Marina’s Water gym is up next."], ["a", "Electric and Grass beat Water — think about your team!"]],
    3: [["a", "I can feel static in the air. Volt’s gym is fast — be careful."], ["b", "Ground-types are immune to Electric moves. Also, I heard Team Rocket is stealing Pokémon from trainers!"]],
    4: [["b", "Mossveil smells like fresh leaves… but the villagers say Team Rocket took over the Old Warehouse!"], ["a", "The road east is closed until they’re stopped. Let’s be careful — and Fern uses Grass types."]],
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
    placeFriends({ k: "t", i });
    if (!G.visited.includes(i)) { G.visited.push(i); toast({ icon: "🗺️", title: TOWNS[i].n, message: "Added to your fly list." }); }
    const k = "town" + i; if (G.flags[k]) return; G.flags[k] = 1; saveStory();
    const L = FRIEND_TOWN[i];
    if (L && G.flags.starter) { G.cut = true; await say(L.map(([w, t]) => ({ n: G.friends[w].name, t }))); G.cut = false; }
    const key = { 2: "a", 4: "b", 6: "a" }[i];
    if (key && G.flags.starter && !G.flags["fd" + key + G.badges.length]) { G.flags["fd" + key + G.badges.length] = 1; await friendDuel(key); }
  }
  const dexSeen = (id) => { if (G && !G.dex.seen[id]) G.dex.seen[id] = 1; };
  const dexCaught = (id) => { if (G) { G.dex.seen[id] = 1; G.dex.caught[id] = 1; } };
  function refreshStory() { if (WORLD) WORLD.gates.forEach((g) => { g.mesh.visible = !g.req(); }); refreshMarks(); }
  const habitat = (id) => { const r = RT.map((t, i) => (t.ids.includes(id) ? "Route " + (i + 1) : null)).filter(Boolean); return r.length ? r.join(", ") : GYMS.some((g) => g.team.some((t) => t[0] === id)) ? "Gym trainers" : "Rare / evolved form"; };
  function dexDetail(id) {
    const sp = SPECIES[id], seen = G.dex.seen[id], c = mkL(sp, 50), ev = EVO[id];
    modal(`<h2>#${String(id).padStart(3, "0")} ${seen ? sp.n : "???"}</h2><img src="${ART + id}.png" alt="" style="width:150px;height:150px;object-fit:contain;${seen ? "" : "filter:brightness(0) opacity(.6)"}"><p>${seen ? sp.t.map((x) => '<em style="background:' + hex(TC[x]) + ';color:#fff;font-style:normal;padding:2px 9px;border-radius:99px;font:800 10px var(--font-display)">' + x.toUpperCase() + "</em>").join(" ") : "Unknown type"}</p>
      <div class="av-stats"><div class="av-stat"><small>HP (Lv50)</small><b>${seen ? c.max : "?"}</b></div><div class="av-stat"><small>ATTACK</small><b>${seen ? Math.round(c.atk) : "?"}</b></div><div class="av-stat"><small>SPEED</small><b>${seen ? Math.round(c.spd) : "?"}</b></div></div>
      <p>${seen ? "Found: " + habitat(id) + (ev ? " · Evolves into " + SPECIES[ev[0]].n + " at Lv." + ev[1] : "") + "<br>Moves: " + movesFor(c).map((m) => m.n).join(", ") : "Meet this Pokémon to fill in its entry."}</p><p>${G.dex.caught[id] ? "✅ Caught" : seen ? "👁 Seen" : ""}</p><div class="av-row2"><button class="av-btn" data-a="x">BACK</button></div>`, (m) => { m.querySelector("[data-a=x]").onclick = () => hub("dex"); }, true);
  }
  function drawTownMap(cv) {
    const x = cv.getContext("2d"), S = cv.width, k = S / 940, X = (v) => (v + 20) * k;
    x.fillStyle = "#2a79c9"; x.fillRect(0, 0, S, S); x.lineCap = "round"; x.lineJoin = "round";
    const stroke = (col, w) => { x.strokeStyle = col; x.lineWidth = w * k; ROUTE_PTS.concat(SIDE_PTS).forEach((p) => { x.beginPath(); p.forEach(([a, b], i) => (i ? x.lineTo(X(a), X(b)) : x.moveTo(X(a), X(b)))); x.stroke(); }); };
    stroke("#e6d9a0", 96); TOWNS.forEach((t) => { x.fillStyle = "#e6d9a0"; x.beginPath(); x.arc(X(t.x), X(t.z), 58 * k, 0, 6.283); x.fill(); });
    stroke("#79c35f", 84); TOWNS.forEach((t) => { x.fillStyle = "#79c35f"; x.beginPath(); x.arc(X(t.x), X(t.z), 50 * k, 0, 6.283); x.fill(); });
    x.fillStyle = "#8a7f72"; [[330, 410], [360, 445], [300, 385], [425, 440], [555, 385], [620, 455], [245, 300], [705, 255], [520, 205], [690, 470]].forEach(([a, b]) => { x.beginPath(); x.moveTo(X(a) - 18 * k * 1.6, X(b) + 12 * k * 1.6); x.lineTo(X(a), X(b) - 22 * k * 1.6); x.lineTo(X(a) + 18 * k * 1.6, X(b) + 12 * k * 1.6); x.fill(); });
    stroke("#cdb98a", 8);
    TOWNS.forEach((t, i) => { const v = G.visited.includes(i), px = X(t.x), pz = X(t.z); x.globalAlpha = v ? 1 : 0.5; x.fillStyle = t.stadium ? "#8a6aff" : t.gym !== undefined ? "#e84a5f" : "#ffcf45"; x.beginPath(); x.arc(px, pz, 9 * Math.max(1, S / 440), 0, 6.283); x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 2; x.stroke(); x.fillStyle = "#fff"; x.strokeStyle = "#0b1626"; x.lineWidth = 3; x.font = "800 " + Math.round(11 * S / 440) + "px Rajdhani, Arial"; x.textAlign = "center"; x.strokeText(t.n, px, pz + 24 * S / 440); x.fillText(t.n, px, pz + 24 * S / 440); x.globalAlpha = 1; });
    const pp = SC && SC.id === "world" ? { x: P.x, z: P.z } : G.ret || { x: P.x, z: P.z }; x.fillStyle = "#5de4ff"; x.strokeStyle = "#04121f"; x.lineWidth = 2; x.beginPath(); x.arc(X(pp.x), X(pp.z), 6 * S / 440, 0, 6.283); x.fill(); x.stroke();
  }
  /* ----- fights ----- */
  const themeOf = () => (SC && SC.kind === "gym" ? "gym" : SC && SC.kind === "stadium" ? "stadium" : "grass");
  const fightTeam = (T, team) => battle({ foes: team.map(([id, lv]) => mkL(SPECIES[id], lv)), trainer: true, name: T.name, look: T.look, theme: themeOf(), xpm: T.xpm || 1 });
  async function evolveAll() {
    for (const c of G.squad.slice()) { const e = EVO[c.id]; if (!e || c.lv < e[1]) continue; const to = SPECIES[e[0]]; if (!to) continue; await say(["What? " + c.n + " is evolving!", c.n + " evolved into " + to.n + "!"]); const om = c.max; dexCaught(to.id); Object.assign(c, { id: to.id, n: to.n, s: to.s, t: to.t, k: to.k }); restat(c); c.hp = Math.min(c.max, c.hp + c.max - om); sfx(880, 0.2, "sine", 0.1); setPartner(true); refresh(); }
    saveStory();
  }
  function blackout() {
    G.cut = true; const l = Math.min(150, Math.floor(getCoins() * 0.1)); if (l > 0) addCoins(-l); G.squad.forEach(healMon);
    const sp = safeSpawn(); guard(async () => { await flashT(); enterScene(WORLD, sp.x, sp.z, 0); setPartner(true); refresh(); G.cut = false; await say(["You blacked out!", "You were rushed back to the last place you healed" + (l ? " and dropped 🥮 " + l + "." : ".")]); saveStory(); });
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

  async function roamBattle(rm) {
    G.cut = true; floatMark(rm.mesh); await wait(350); await flashT();
    const r = await battle({ foes: [rm.c], trainer: false, theme: "grass" }); refresh();
    if (r.res === "lose") return blackout();
    G.cut = false;
    if (r.res === "win" || r.res === "caught") { removeRoamer(rm); if (r.res === "win") { qEvent("wins", 1); G.wins = (G.wins || 0) + 1; } else qEvent("catch", 1); } else rm.cool = 8;
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
    const tabs = [["party", "POKÉMON"], ["dex", "DEX"], ["bag", "BAG"], ["quests", "QUESTS"], ["map", "MAP"], ["pc", "PC"], ["card", "TRAINER"]];
    const head = '<div class="av-tabs">' + tabs.map(([k, n]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${n}</button>`).join("") + "</div>"; let body = "";
    if (tab === "pc") { if (SC && (SC.kind === "center" || SC.kind === "home")) { closeModal(); return pcMenu(); } body = "<p>The Pokémon PC can only be used inside a Pokémon Center or at home.</p>"; }
    else if (tab === "party") body = G.squad.map((c, i) => `<div class="av-item"><img class="av-it" src="${ART + c.id}.png" width="46" height="46" alt=""><div><b>${c.n} Lv.${c.lv}${i === G.lead ? " ★" : ""}</b><span>${c.t.map((x) => x.toUpperCase()).join(" / ")} · HP ${c.hp}/${c.max} · EXP ${c.xp}/${xpNeed(c.lv)}</span><span class="av-bar"><u class="${hpCls(c)}" style="width:${(c.hp / c.max) * 100}%"></u></span><span style="color:#7fa6cf">${movesFor(c).map((m) => m.n).join(" · ")}</span></div><button class="av-btn ghost" data-l="${i}" ${c.hp > 0 && i !== G.lead ? "" : "disabled"}>LEAD</button></div>`).join("") || "<p>You have no Pokémon yet.</p>";
    else if (tab === "dex") { const all = POOL.slice().sort((a, b) => a.id - b.id), seen = Object.keys(G.dex.seen).length, caught = Object.keys(G.dex.caught).length; body = `<p>Seen <b>${seen}</b> · Caught <b>${caught}</b> / ${all.length}</p><div class="dex">${all.map((p) => { const s = G.dex.seen[p.id], c = G.dex.caught[p.id]; return `<button class="dx${s ? "" : " un"}" data-d="${p.id}"><img src="${ART + p.id}.png" alt="" loading="lazy">${c ? "<i>●</i>" : ""}#${String(p.id).padStart(3, "0")}<br>${s ? p.n : "???"}</button>`; }).join("")}</div>`; }
    else if (tab === "bag") body = '<div class="av-shop">' + ["potion", "super", "hyper", "revive", "berry", "candy", "mail"].filter((k) => G.bag[k]).map((k) => `<div class="av-item">${itemImg(k, 40)}<div><b>${(ITEMS[k] || { n: "Letter" }).n} ×${G.bag[k]}</b><span>${ITEMS[k] && ITEMS[k].heal ? "Heals " + ITEMS[k].heal + " HP" : k === "revive" ? "Revives a fainted Pokémon" : k === "mail" ? "A letter to deliver" : "Raises a level"}</span></div>${ITEMS[k] ? `<button class="av-btn ghost" data-u="${k}">USE</button>` : ""}</div>`).join("") + BALLS.map((b) => (ballCnt(b.id) ? `<div class="av-item">${itemImg(b.id, 40)}<div><b>${b.n} ×${ballCnt(b.id)}</b><span>For catching wild Pokémon</span></div></div>` : "")).join("") + "</div>";
    else if (tab === "quests") { const act = QUESTS.filter((q) => qState(q.id).s === 1 || qState(q.id).s === 2); body = '<div class="av-shop">' + (act.map((q) => { const st = qState(q.id); return `<div class="av-item"><span style="font-size:22px">${st.s === 2 ? "✅" : "📜"}</span><div><b>${q.title}</b><span>${q.desc}</span><span style="color:#ffcf45">${st.s === 2 ? "Ready — return to " + q.giver : st.p + "/" + q.n + " · from " + q.giver + " (" + TOWNS[q.town].n + ")"}</span></div></div>`; }).join("") || "<p>No active quests. Talk to townspeople with a ❗ above their heads!</p>") + `<p style="color:#7fa6cf">Completed: ${Object.values(G.q).filter((q) => q.s === 3).length} / ${QUESTS.length}</p></div>`; }
    else if (tab === "map") body = `<canvas id="av-tmap" width="440" height="440"></canvas><p style="margin:6px 0">Tap a visited town to fly there${SC && SC.id === "world" ? "" : " (outdoors only)"}.</p>`;
    else body = `<canvas id="av-card" width="200" height="240"></canvas><div class="av-stats"><div class="av-stat"><small>NAME</small><b style="font-size:14px">${G.sv.name}</b></div><div class="av-stat"><small>BADGES</small><b>${G.badges.length}/6</b></div><div class="av-stat"><small>MONEY</small><b style="font-size:14px">🥮 ${getCoins().toLocaleString()}</b></div></div><p style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">${GYMS.map((g, i) => badgeImg(i, G.badges.includes(i), 40)).join("")}</p><div class="av-row2"><button class="av-btn ghost" data-a="exit">SAVE & EXIT</button></div>`;
    modal(`<h2>MENU</h2>${head}<div class="av-shop">${body}</div><div class="av-row2"><button class="av-btn" data-a="x">RESUME</button></div>`, (m) => {
      m.querySelectorAll("[data-t]").forEach((b) => { b.onclick = () => hub(b.dataset.t); }); const x = m.querySelector("[data-a=x]"); if (x) x.onclick = closeModal; const ex = m.querySelector("[data-a=exit]"); if (ex) ex.onclick = () => { saveStory(); menu(); };
      m.querySelectorAll("[data-l]").forEach((b) => { b.onclick = () => { G.lead = +b.dataset.l; setPartner(true); refresh(); saveStory(); hub("party"); }; });
      m.querySelectorAll("[data-u]").forEach((b) => { b.onclick = () => useItemMenu(b.dataset.u); }); m.querySelectorAll("[data-d]").forEach((b) => { b.onclick = () => dexDetail(+b.dataset.d); });
      const tm = m.querySelector("#av-tmap"); if (tm) { drawTownMap(tm); tm.onclick = (e) => { const r = tm.getBoundingClientRect(), sx = ((e.clientX - r.left) / r.width) * 940 - 20, sz = ((e.clientY - r.top) / r.height) * 940 - 20; let bi = -1, bd = 60; TOWNS.forEach((t, i) => { const d = Math.hypot(t.x - sx, t.z - sz); if (d < bd) { bd = d; bi = i; } }); if (bi >= 0 && G.visited.includes(bi) && SC && SC.id === "world") { const t = TOWNS[bi]; closeModal(); G.cut = true; flashT().then(() => { enterScene(WORLD, t.x, t.z + 2, 0); G.cut = false; setPartner(true); saveStory(); }); } }; }
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
  /* ----- starting / running a story ----- */
  function startStory(sv) {
    runId++; abortBattle(); mode = "story"; DB.active = sv.id; saveDB(); const S = sv.story; clearRoamers();
    G = { sv, name: sv.name, look: sv.look, squad: S.squad.map(unpack), box: (S.box || []).map(unpack), bag: Object.assign({}, S.bag), badges: S.badges.slice(), def: S.def.slice(), flags: Object.assign({}, S.flags), q: JSON.parse(JSON.stringify(S.q || {})), picked: S.picked.slice(), visited: S.visited.slice(), spawn: Object.assign({}, S.spawn), friends: S.friends, dex: JSON.parse(JSON.stringify(S.dex || { seen: {}, caught: {} })), fm: [], lead: 0, cut: false, near: null, walk: null, hist: [], ret: null, loc: "", gd: 0, gcool: 0, area: "", run: false, roamT: 0 };
    G.squad.concat(G.box).forEach((c) => { G.dex.seen[c.id] = 1; G.dex.caught[c.id] = 1; });
    { const legacy = G.bag.revive || 0; delete G.bag.revive; if (legacy) { DB.revive = (DB.revive || 0) + legacy; S.bag.revive = 0; saveDB(); } Object.defineProperty(G.bag, "revive", { get: () => DB.revive || 0, set: (v) => { DB.revive = Math.max(0, v); saveDB(); }, enumerable: true, configurable: true }); }
    if (!WORLD) buildWorld();
    scene.remove(trainer); trainer = makeTrainer(G.look); scene.add(trainer);
    WORLD.picks.forEach((p) => { p.mesh.visible = !G.picked.includes(p.id); });
    Object.values(INTS).forEach((sc) => { [1, 4, 7].forEach((id) => { if (sc["st" + id]) sc["st" + id].visible = !G.flags.starter; }); });
    $("av-title").textContent = "STORY ADVENTURE"; $("av-map").hidden = false; $("av-map").classList.remove("big"); $("av-menu").hidden = false; $("av-view").hidden = false; $("av-run").classList.remove("on"); showPad(true); hudLast = null; closeModal();
    const t0 = TOWNS[0], okPos = S.pos && walkable(S.pos.x, S.pos.z);
    if (!G.flags.momIntro && !G.flags.starter) { G.ret = { x: t0.x - 20, z: t0.z - 3.8 }; const h = getInterior("home"); enterScene(h, 0, h.d / 2 - 3, Math.PI); }
    else enterScene(WORLD, okPos ? S.pos.x : t0.x, okPos ? S.pos.z : t0.z + 4, Math.PI / 2);
    me(); setPartner(true); ensureFriends(); refreshStory(); refresh();
  }
  const blocked = (x, z) => x < SC.bnd.x0 || x > SC.bnd.x1 || z < SC.bnd.z0 || z > SC.bnd.z1 || SC.col.hit(x, z) || inWater(SC.water, x, z) || (SC.id === "world" && (!walkable(x, z) || gateHit(x, z)));

  /* ----- living world: roaming wild Pokémon, wandering townsfolk ----- */
  const ROAM = [];
  function removeRoamer(r) { const i = ROAM.indexOf(r); if (i >= 0) ROAM.splice(i, 1); if (WORLD) WORLD.group.remove(r.mesh); }
  function clearRoamers() { ROAM.slice().forEach(removeRoamer); }
  function spawnRoamer() {
    const an = Math.random() * 6.283, d = 26 + Math.random() * 44, x = P.x + Math.cos(an) * d, z = P.z + Math.sin(an) * d, ar = areaAt(x, z);
    if ((ar.k !== "r" && ar.k !== "s") || !walkable(x, z) || WORLD.col.hit(x, z) || townAt(x, z, 8) >= 0) return;
    const rt = RT[ar.tab], sp = SPECIES[rnd(rt.ids)], lv = rt.lv[0] + Math.floor(Math.random() * (rt.lv[1] - rt.lv[0] + 1)), c = mkL(sp, lv), m = makeMon(c, 1.9);
    m.position.set(x, 0, z); WORLD.group.add(m); ROAM.push({ c, mesh: m, x, z, tx: x, tz: z, wait: 0, cool: 0, aggro: Math.random() < 0.35 });
  }
  function roamTick(dt, busy) {
    G.roamT -= dt; if (G.roamT <= 0) { G.roamT = 1.1; if (ROAM.length < 9) spawnRoamer(); }
    for (let i = ROAM.length - 1; i >= 0; i--) {
      const r = ROAM[i], d = Math.hypot(P.x - r.x, P.z - r.z); if (d > 160) { removeRoamer(r); continue; }
      tickMon(r.mesh, dt); if (busy) continue; r.cool = Math.max(0, r.cool - dt); let tx = r.tx, tz = r.tz, sp = 1.6;
      if (r.aggro && d < 11 && r.cool <= 0) { tx = P.x; tz = P.z; sp = 3.2; } else { r.wait -= dt; if (r.wait <= 0 || Math.hypot(r.tx - r.x, r.tz - r.z) < 0.8) { r.tx = r.x + (Math.random() - 0.5) * 22; r.tz = r.z + (Math.random() - 0.5) * 22; r.wait = 2 + Math.random() * 3; } tx = r.tx; tz = r.tz; }
      const dx = tx - r.x, dz = tz - r.z, l = Math.hypot(dx, dz) || 1;
      if (l > 0.3) { const nx = r.x + (dx / l) * sp * dt, nz = r.z + (dz / l) * sp * dt; if (walkable(nx, nz) && (r.mesh.userData.ghost || !WORLD.col.hit(nx, nz))) { r.x = nx; r.z = nz; } else r.wait = 0; face(r.mesh, dx > 0); }
      r.mesh.position.set(r.x, 0, r.z);
      if (d < 2.1 && r.cool <= 0 && G.squad.length && me()) { guard(() => roamBattle(r)); return true; }
    }
    return false;
  }
  function wanderTick(dt) {
    SC.npcs.forEach((n) => {
      if (!n.wander || Math.hypot(P.x - n.x, P.z - n.z) > 150) return; n.wait = (n.wait || 0) - dt;
      if (n.moving) { const dx = n.tx - n.x, dz = n.tz - n.z, l = Math.hypot(dx, dz); if (l < 0.3) { n.moving = false; n.wait = 1 + Math.random() * 3; } else { n.x += (dx / l) * 1.5 * dt; n.z += (dz / l) * 1.5 * dt; n.mesh.rotation.y = Math.atan2(dx, dz); } }
      else if (n.wait <= 0) { n.tx = n.home.x + (Math.random() - 0.5) * 2 * n.wr; n.tz = n.home.z + (Math.random() - 0.5) * 2 * n.wr; n.moving = true; }
      n.mesh.position.x = n.x; n.mesh.position.z = n.z; const lg = n.mesh.userData.legs, sw = n.moving ? Math.sin(T * 10) * 0.5 : 0; lg[0].rotation.x = sw; lg[1].rotation.x = -sw;
    });
    SC.ambient.forEach((o) => {
      if (Math.hypot(P.x - o.x, P.z - o.z) > 150) return; tickMon(o.mesh, dt); o.wait -= dt;
      if (o.wait <= 0 || Math.hypot(o.tx - o.x, o.tz - o.z) < 0.6) { o.tx = o.home.x + (Math.random() - 0.5) * 2 * o.wr; o.tz = o.home.z + (Math.random() - 0.5) * 6; o.wait = 1.5 + Math.random() * 3; }
      const dx = o.tx - o.x, dz = o.tz - o.z, l = Math.hypot(dx, dz) || 1; if (l > 0.3) { const nx = o.x + (dx / l) * 1.3 * dt, nz = o.z + (dz / l) * 1.3 * dt, gh = o.mesh.userData.ghost; if (!monBlocked(gh, nx, nz) || monBlocked(gh, o.x, o.z)) { o.x = nx; o.z = nz; } else if (!monBlocked(gh, nx, o.z)) o.x = nx; else if (!monBlocked(gh, o.x, nz)) o.z = nz; else o.wait = 0; face(o.mesh, dx > 0); } o.mesh.position.set(o.x, 0, o.z);
    });
  }
  const joy = { x: 0, z: 0 };

  /* friends move on their own: walk beside you, run to catch up, wander and look around when you stop */
  function friendsTick(dt) {
    const fr = (G.fm || []).filter((o) => o.state === "follow"); if (!fr.length) return;
    const idle = (G.idleT || 0) > 1.4, fx = Math.sin(P.rot), fz = Math.cos(P.rot), rx = -fz, rz = fx;
    fr.forEach((o, idx) => {
      const side = o.key === "a" ? -1 : 1; let tx, tz, maxSp = o.key === "a" ? 8.8 : 8.2;
      if (!idle) { o.wp = null; tx = P.x - fx * (3.4 + idx * 1.2) + rx * side * (3 + idx * 0.5); tz = P.z - fz * (3.4 + idx * 1.2) + rz * side * (3 + idx * 0.5); }
      else {
        o.wt = (o.wt || 0) - dt; if (!o.wp || o.wt <= 0) { const an = Math.random() * 6.283, d = 2.4 + Math.random() * 3.4; o.wp = { x: P.x + Math.cos(an) * d, z: P.z + Math.sin(an) * d }; o.wt = 2 + Math.random() * 3.5; o.pause = Math.random() < 0.45 ? 1 + Math.random() * 1.5 : 0; }
        tx = o.wp.x; tz = o.wp.z; maxSp = 2.4; if (o.pause > 0) { o.pause -= dt; maxSp = 0; }
      }
      const dp = Math.hypot(P.x - o.x, P.z - o.z); if (dp > 40) { o.x = P.x - fx * 3 + rx * side * 3; o.z = P.z - fz * 3 + rz * side * 3; }
      const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); let sp = Math.min(d * 2.2, maxSp); if (!idle && dp > 7) sp = Math.min(Math.max(sp, 9.5), 12);
      let moved = 0;
      if (d > 0.25 && sp > 0.05) {
        const ux = dx / d, uz = dz / d, st = sp * dt; let nx = o.x + ux * st, nz = o.z + uz * st;
        if (blocked(nx, nz)) { const sx = o.x - uz * st, sz = o.z + ux * st, tx2 = o.x + uz * st, tz2 = o.z - ux * st; if (!blocked(sx, sz)) { nx = sx; nz = sz; } else if (!blocked(tx2, tz2)) { nx = tx2; nz = tz2; } else { nx = o.x; nz = o.z; } }
        moved = Math.hypot(nx - o.x, nz - o.z) / Math.max(dt, 0.001); o.x = nx; o.z = nz;
        if (moved > 0.2) { const want = Math.atan2(ux, uz); let da = want - o.mesh.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); o.mesh.rotation.y += da * Math.min(1, dt * 9); }
      } else { const want = Math.atan2(P.x - o.x, P.z - o.z); let da = want - o.mesh.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); o.mesh.rotation.y += da * Math.min(1, dt * 3); }
      fr.forEach((q) => { if (q !== o) { const sx = o.x - q.x, sz = o.z - q.z, sd = Math.hypot(sx, sz); if (sd < 1.8 && sd > 0.01) { o.x += (sx / sd) * (1.8 - sd) * 0.5; o.z += (sz / sd) * (1.8 - sd) * 0.5; } } });
      o.mesh.position.set(o.x, Math.abs(Math.sin(T * 9 + idx)) * 0.05 * Math.min(1, moved / 4), o.z);
      const lg = o.mesh.userData.legs, sw = Math.sin(T * (6 + Math.min(1, moved / 8) * 8) + idx) * 0.55 * Math.min(1, moved / 3); lg[0].rotation.x = sw; lg[1].rotation.x = -sw;
    });
  }

  function story(dt) {
    const busy = DL || G.cut || modalOpen(), world = SC.id === "world";
    SC.npcs.forEach((n, i) => { if (n.mesh && !n.wander) n.mesh.position.y = Math.sin(T * 2 + i) * 0.03; });
    if (DL && DL.pos < DL.lines[DL.i].t.length) { DL.pos += dt * 60; paintDlg(); }
    if (G.walk) { const w = G.walk, dx = P.x - w.T.x, dz = P.z - w.T.z, d = Math.hypot(dx, dz); w.T.mesh.rotation.y = Math.atan2(dx, dz); if (d > 2.9) { w.T.x += (dx / d) * 6 * dt; w.T.z += (dz / d) * 6 * dt; w.T.mesh.position.set(w.T.x, 0, w.T.z); } else { const f = w.then; G.walk = null; f(); } }
    P.moving = false; G.near = null; G.gcool = Math.max(0, G.gcool - dt);
    if (world) wanderTick(dt); else wanderTick(dt);
    if (!busy) {
      unstickTick(dt); let dx = joy.x, dz = joy.z;
      if (held.ArrowLeft || held.a || pad.left) dx -= 1; if (held.ArrowRight || held.d || pad.right) dx += 1; if (held.ArrowUp || held.w || pad.up) dz -= 1; if (held.ArrowDown || held.s || pad.down) dz += 1;
      const fp = (DB.view || 0) === 3; let mag, mx, mz;
      if (fp) { if (Math.abs(dx) > 0.05) P.rot -= Math.max(-1, Math.min(1, dx)) * 2.4 * dt; const f = -dz; mag = Math.abs(f); mx = Math.sin(P.rot) * (f >= 0 ? 1 : -1); mz = Math.cos(P.rot) * (f >= 0 ? 1 : -1); }
      else { mag = Math.hypot(dx, dz); mx = mag ? dx / mag : 0; mz = mag ? dz / mag : 0; }
      P.moving = mag > 0.05; G.waterCool = Math.max(0, (G.waterCool || 0) - dt);
      if (P.moving) {
        const u = Math.min(1, mag), st = (held.Shift || G.run ? 12 : 8.5) * u * dt, nx = P.x + mx * st, nz = P.z + mz * st;
        if (!blocked(nx, P.z)) P.x = nx; if (!blocked(P.x, nz)) P.z = nz; if (!fp) P.rot = Math.atan2(dx, dz);
        if (G.waterCool <= 0 && inWater(SC.water, nx, nz)) { G.waterCool = 3; toast({ icon: "🌊", title: "The water is too deep to cross" }); }
        if (world) { const pt = SC.patches.find((p) => Math.abs(P.x - p.x) < p.w / 2 && Math.abs(P.z - p.z) < p.d / 2); if (pt && me()) { G.gd += st; if (G.gd > 2.4) { G.gd = 0; if (Math.random() < 0.14) { guard(() => wildBattle(pt.r)); return; } } } else if (!pt) G.gd = 0; }
        for (const d of SC.doors) if (mz < -0.2 && Math.hypot(P.x - d.x, P.z - d.z) < d.r) { goInterior(d); return; }
        if (SC.exit && mz > 0.2 && Math.hypot(P.x - SC.exit.x, P.z - SC.exit.z) < 1.6) { leaveInterior(); return; }
      }
      if (world) {
        const gt = SC.gates.find((g) => !g.req() && Math.abs((P.x - g.x) * g.dx + (P.z - g.z) * g.dz) < 2.4 && Math.abs(-(P.x - g.x) * g.dz + (P.z - g.z) * g.dx) < RW + 3);
        if (gt && G.gcool <= 0) { G.gcool = 2; G.cut = true; const al = (P.x - gt.x) * gt.dx + (P.z - gt.z) * gt.dz, ac = -(P.x - gt.x) * gt.dz + (P.z - gt.z) * gt.dx, s = al < 0 ? -3.4 : 3.4; P.x = gt.x + gt.dx * s - gt.dz * ac; P.z = gt.z + gt.dz * s + gt.dx * ac; dialog(lines("Guard", [gt.msg]), () => { G.cut = false; }); return; }
        const a = areaAt(P.x, P.z); if (a.key !== G.area && a.k !== "x") { G.area = a.key; if (a.k === "t") guard(() => arrive(a.i)); else placeFriends(a); }
        if (roamTick(dt, false)) return;
      }
      if (G.squad.length) for (const t of SC.trainers) { if (!t.sight || G.def.includes(t.id) || (t.when && !t.when())) continue; const tx = P.x - t.x, tz = P.z - t.z, d = Math.hypot(tx, tz); if (d < t.sight && tx * Math.sin(t.rot) + tz * Math.cos(t.rot) > d * 0.6) return engageTrainer(t); }
      let best = null, bd = 99; SC.inter.forEach((I) => { if (I.when && !I.when()) return; const q = I.ref || I, d = Math.hypot(P.x - q.x, P.z - q.z); if (d < I.r && d < bd) { best = I; bd = d; } });
      SC.doors.forEach((d) => { const dd = Math.hypot(P.x - d.x, P.z - d.z); if (dd < d.r + 0.6 && dd < bd) { best = { label: d.label, fn: () => goInterior(d) }; bd = dd; } });
      if (SC.exit && Math.hypot(P.x - SC.exit.x, P.z - SC.exit.z) < 2.4) best = { label: "Leave", fn: leaveInterior };
      G.near = best;
    } else if (world) roamTick(dt, true);
    const pr = $("av-prompt"); pr.hidden = !G.near || busy; if (G.near && !busy) pr.textContent = "▶ " + G.near.label + "  (E / A)"; $("av-act").hidden = !G.near || busy;
    const loc = world ? locName(P.x, P.z) : SC.kind === "center" ? "Pokémon Center" : SC.kind === "mart" ? "Poké Mart" : SC.kind === "gym" ? GYMS[+SC.id.split(":")[1]].badge + " Gym" : SC.kind === "lab" ? "Prof. Linden’s Lab" : SC.kind === "home" ? "Your Home" : SC.kind === "rocket" ? "Team Rocket Hideout" : "Champions Stadium";
    if (loc !== G.loc) { G.loc = loc; const lb = $("av-loc"); lb.textContent = loc; lb.classList.remove("show"); void lb.offsetWidth; lb.classList.add("show"); }
    const h = G.hist, lastp = h[h.length - 1]; if (!lastp || Math.hypot(lastp.x - P.x, lastp.z - P.z) > 0.15) { h.push({ x: P.x, z: P.z }); if (h.length > 400) h.shift(); }
    G.idleT = P.moving ? 0 : (G.idleT || 0) + dt; if (world) friendsTick(dt);
    setHud(`<div class="av-hbox"><small>BADGES</small><b class="bds">${GYMS.map((g, i) => badgeImg(i, G.badges.includes(i), 22)).join("")}</b></div><div class="av-zbar"><span>LOCATION</span><b>${loc}</b></div><div class="av-hbox"><small>PARTY</small><b>${G.squad.filter((c) => c.hp > 0).length}/${G.squad.length}</b></div>`);
    drawMap();
  }
  function drawMap() {
    const c = $("av-map"), x = c.getContext("2d"), S = c.width, big = c.classList.contains("big");
    if (SC.id === "world") {
      const k = S / (big ? 300 : 130), X = (v) => (v - P.x) * k + S / 2, Z = (v) => (v - P.z) * k + S / 2;
      x.fillStyle = "#1f5a38"; x.fillRect(0, 0, S, S); x.lineCap = "round"; x.lineJoin = "round";
      SEGS.forEach((s) => { x.strokeStyle = "#3f7f4a"; x.lineWidth = s.hw * 2 * k; x.beginPath(); x.moveTo(X(s.ax), Z(s.az)); x.lineTo(X(s.bx), Z(s.bz)); x.stroke(); });
      TOWNS.forEach((t) => { x.fillStyle = "#d8cfa8"; x.fillRect(X(t.x - 46), Z(t.z - 34), 92 * k, 60 * k); });
      SEGS.forEach((s) => { x.strokeStyle = "#cdb98a"; x.lineWidth = 6 * k; x.beginPath(); x.moveTo(X(s.ax), Z(s.az)); x.lineTo(X(s.bx), Z(s.bz)); x.stroke(); });
      x.fillStyle = "#2f7a35"; SC.patches.forEach((p) => x.fillRect(X(p.x - p.w / 2), Z(p.z - p.d / 2), p.w * k, p.d * k));
      SC.builds.forEach((b) => { x.fillStyle = b.col; x.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), b.w * k, b.d * k); });
      x.strokeStyle = "#ff3b3b"; x.lineWidth = 4; SC.gates.forEach((g) => { if (!g.req()) { x.beginPath(); x.moveTo(X(g.x + g.dz * RW), Z(g.z - g.dx * RW)); x.lineTo(X(g.x - g.dz * RW), Z(g.z + g.dx * RW)); x.stroke(); } });
      SC.trainers.forEach((t) => { if (t.sight && !G.def.includes(t.id)) { x.fillStyle = t.look === ROCKET_LOOK ? "#ff9b3d" : "#ff5a5a"; x.beginPath(); x.arc(X(t.x), Z(t.z), 4, 0, 6.283); x.fill(); } });
      x.fillStyle = "#ffcf45"; SC.npcs.forEach((n) => { if (n.mark.visible) x.fillRect(X(n.x) - 3, Z(n.z) - 3, 7, 7); }); SC.picks.forEach((p) => { if (!G.picked.includes(p.id)) { x.fillStyle = "#8fe6ff"; x.fillRect(X(p.x) - 2, Z(p.z) - 2, 5, 5); } });
      x.fillStyle = "#fff"; ROAM.forEach((r) => { x.beginPath(); x.arc(X(r.x), Z(r.z), 3, 0, 6.283); x.fill(); });
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
    G = null; mode = null; enterScene(WORLD, TOWNS[0].x, TOWNS[0].z + 3, Math.PI); if (partnerH) { scene.remove(partnerH); partnerH = null; }
  }
  function menu() {
    abortBattle(); runId++; if (G) { saveStory(); } clearRoamers(); if (WORLD && WORLD.fm) WORLD.fm.forEach((o) => { o.mesh.visible = false; }); DL = null; mode = null; G = null; enterLobby();
    ["av-dlg", "av-prompt", "av-act", "av-menu", "av-view"].forEach((id) => { $(id).hidden = true; }); $("av-loc").classList.remove("show"); setHud(""); showPad(false); $("av-map").hidden = true; $("av-title").textContent = "ADVENTURE"; $("av-team").innerHTML = ""; $("av-res").textContent = "🥮 " + getCoins().toLocaleString() + "  ·  ⚪ " + totalBalls();
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
  let HB = null;
  function drawHome(c, look, t) {
    const x = c.getContext("2d"), w = c.width, h = c.height; x.clearRect(0, 0, w, h);
    /* faded Pokémon Center silhouette — no panel, edges melt into the page */
    HB = HB || document.createElement("canvas"); HB.width = w; HB.height = h; const q = HB.getContext("2d"); q.clearRect(0, 0, w, h); q.globalAlpha = 0.6;
    const bx = w * 0.12, bw = w * 0.76, by = h * 0.3, bh = h * 0.45;
    q.fillStyle = "#f8f3ec"; q.fillRect(bx, by, bw, bh); q.fillStyle = "#e84a5f"; q.beginPath(); q.moveTo(bx - 14, by); q.lineTo(bx + bw + 14, by); q.lineTo(bx + bw - 22, by - h * 0.12); q.lineTo(bx + 22, by - h * 0.12); q.closePath(); q.fill();
    q.fillStyle = "#fff"; q.beginPath(); q.arc(w / 2, by - h * 0.06, 26, 0, 6.283); q.fill(); q.fillStyle = "#e84a5f"; q.beginPath(); q.arc(w / 2, by - h * 0.06, 26, Math.PI, 6.283); q.fill(); q.fillStyle = "#222"; q.fillRect(w / 2 - 26, by - h * 0.06 - 3, 52, 6);
    q.fillStyle = "#e84a5f"; q.fillRect(bx, by + 8, bw, 24); q.fillStyle = "#7fc4ff"; [0.22, 0.78].forEach((fx) => q.fillRect(w * fx - 34, by + 54, 68, 54)); q.fillRect(w / 2 - 40, by + bh - 80, 80, 80);
    q.globalAlpha = 1; q.globalCompositeOperation = "destination-in"; const m = q.createRadialGradient(w / 2, h * 0.5, 30, w / 2, h * 0.5, w * 0.52); m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(0.55, "rgba(0,0,0,.7)"); m.addColorStop(1, "rgba(0,0,0,0)"); q.fillStyle = m; q.fillRect(0, 0, w, h); q.globalCompositeOperation = "source-over";
    x.drawImage(HB, 0, 0);
    const glow = x.createRadialGradient(w / 2, h * 0.9, 10, w / 2, h * 0.9, w * 0.38); glow.addColorStop(0, "rgba(93,228,255,.5)"); glow.addColorStop(1, "rgba(93,228,255,0)"); x.fillStyle = glow; x.fillRect(0, h * 0.7, w, h * 0.3);
    x.strokeStyle = "rgba(93,228,255,.8)"; x.lineWidth = 3; x.beginPath(); x.ellipse(w / 2, h * 0.935, 120 + Math.sin(t * 2) * 6, 22, 0, 0, 6.283); x.stroke();
    x.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 14; i++) { const px = (i * 83 + t * 18) % w, py = h - ((i * 47 + t * 30) % (h * 0.5)) - 20; x.fillRect(px, py, 3, 3); }
    drawAvatar(c, look, t, { noClear: true, scale: 0.92, base: 0.955 });
  }
  function initHome() {
    const f = document.querySelector("#home-page .fighters"); if (!f || $("home-avatar")) return;
    const d = document.createElement("div"); d.id = "home-avatar"; d.innerHTML = '<canvas width="560" height="520"></canvas><img id="ha-mon" class="ha-mon" alt="" hidden><div class="ha-plate"><b id="ha-name"></b><span id="ha-sub"></span></div>'; f.appendChild(d);
    d.onclick = () => { try { window.openAdventure(); } catch (e) {} };
    const cv = d.querySelector("canvas"), upd = () => { const sv = activeSave(); $("ha-name").textContent = sv ? sv.name.toUpperCase() : "NEW TRAINER"; $("ha-sub").textContent = sv ? "🏅 " + sv.story.badges.length + "/6 · STORY ADVENTURE" : "TAP TO CREATE YOUR TRAINER"; const mi = document.querySelector("#home-page .match-info"); if (mi) { const S = sv ? sv.story : null, ca = S && S.dex ? Object.keys(S.dex.caught || {}).length : 0, qd = S ? Object.values(S.q || {}).filter((q) => q.s === 3).length : 0; mi.innerHTML = '<div><small>BADGES</small><b>' + (S ? S.badges.length : 0) + '/6</b></div><div class="divider"></div><div><small>POKÉDEX</small><b>' + ca + '</b></div><div class="divider"></div><div><small>QUESTS</small><b>' + qd + '</b></div>'; } const mon = $("ha-mon"), first = sv && sv.story.squad[0]; if (first) { mon.src = ART + first.id + ".png"; mon.title = (SPECIES[first.id] ? SPECIES[first.id].n : "") + " Lv" + first.lv; mon.hidden = false; } else mon.hidden = true; };
    setInterval(() => { const h = $("home-page"); if (!h || h.classList.contains("hidden") || document.hidden) return; const sv = activeSave(); drawHome(cv, sv ? sv.look : DEF_LOOK, performance.now() / 1000); }, 50);
    upd(); addEventListener("pf-adv-change", upd);
  }

  /* ---------- background music (generated live with WebAudio — no audio files) ---------- */
  const MU = { ctx: null, master: null, tg: null, key: null, step: 0, nextT: 0, timer: null, tr: null, noise: null, cache: {}, chk: 0 };
  const SCALES = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10], pent: [0, 2, 4, 7, 9], dor: [0, 2, 3, 5, 7, 9, 10], phr: [0, 1, 3, 5, 7, 8, 10] };
  const TRACKS = {
    town: { bpm: 112, root: 60, scale: "maj", lead: "square", seed: 11, dens: 0.72, drums: 1 }, route: { bpm: 126, root: 57, scale: "dor", lead: "square", seed: 23, dens: 0.8, drums: 2 },
    inside: { bpm: 86, root: 64, scale: "pent", lead: "sine", seed: 5, dens: 0.55, drums: 0 }, gym: { bpm: 136, root: 55, scale: "min", lead: "sawtooth", seed: 37, dens: 0.85, drums: 3 },
    rocket: { bpm: 104, root: 52, scale: "phr", lead: "sawtooth", seed: 41, dens: 0.6, drums: 4 }, battle: { bpm: 158, root: 57, scale: "min", lead: "square", seed: 53, dens: 0.95, drums: 3 },
  };
  function muGen(def) {
    let s = def.seed; const rn = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }, sc = SCALES[def.scale], mel = [], bas = []; let deg = 2 + Math.floor(rn() * 3);
    for (let i = 0; i < 64; i++) {
      if (i % 2 === 0 && rn() < def.dens) { const m = rn(); deg += m < 0.34 ? 1 : m < 0.68 ? -1 : m < 0.78 ? 2 : m < 0.88 ? -2 : 0; deg = Math.max(-1, Math.min(sc.length + 2, deg)); if (i === 62) deg = 0; mel.push(deg); } else mel.push(null);
      bas.push(i % 8 === 0 ? (i % 32 === 16 ? 3 : 0) : i % 8 === 4 ? (rn() < 0.5 ? 4 : 2) : null);
    }
    return { def, sc, mel, bas };
  }
  const muFreq = (root, sc, deg) => { const n = sc.length, oct = Math.floor(deg / n), idx = ((deg % n) + n) % n; return 440 * Math.pow(2, (root + sc[idx] + 12 * oct - 69) / 12); };
  const muMuted = () => DB.sound === false || (typeof settings !== "undefined" && settings && settings.sound === false);
  function muInit() {
    if (MU.ctx) { try { MU.ctx.resume(); } catch (e) {} return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; MU.ctx = new AC(); MU.master = MU.ctx.createGain(); MU.master.gain.value = muMuted() ? 0 : 0.5; MU.master.connect(MU.ctx.destination);
      const len = MU.ctx.sampleRate * 0.5, buf = MU.ctx.createBuffer(1, len, MU.ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; MU.noise = buf;
      MU.timer = setInterval(muSchedule, 40); document.addEventListener("visibilitychange", () => { try { if (document.hidden) MU.ctx.suspend(); else if (!$("adventure-page").classList.contains("hidden")) MU.ctx.resume(); } catch (e) {} });
    } catch (e) { MU.ctx = null; }
  }
  function muTone(f, t, d, type, v) { const o = MU.ctx.createOscillator(), g = MU.ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(MU.tg); o.start(t); o.stop(t + d + 0.05); }
  function muNoise(t, d, v, hp) { const s = MU.ctx.createBufferSource(); s.buffer = MU.noise; const f = MU.ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp; const g = MU.ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(MU.tg); s.start(t); s.stop(t + d + 0.02); }
  function muKick(t, v) { const o = MU.ctx.createOscillator(), g = MU.ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g); g.connect(MU.tg); o.start(t); o.stop(t + 0.2); }
  function muStep(tr, st, t, dur) {
    const def = tr.def, i = st % 64, m = tr.mel[i], b = tr.bas[i];
    if (m != null) muTone(muFreq(def.root + 12, tr.sc, m), t, dur * (def.lead === "sine" ? 3 : 1.7), def.lead, def.lead === "sawtooth" ? 0.03 : 0.04);
    if (b != null) muTone(muFreq(def.root - 12, tr.sc, b), t, dur * 3.6, "triangle", 0.1);
    if (st % 16 === 0) { [0, 2, 4].forEach((k) => muTone(muFreq(def.root, tr.sc, k + (i >= 32 ? 3 : 0)), t, dur * 14, "sine", 0.018)); }
    const dr = def.drums, s8 = st % 8;
    if (dr === 1) { if (st % 2 === 1) muNoise(t, 0.04, 0.025, 7000); if (s8 === 0) muKick(t, 0.09); }
    else if (dr === 2) { if (s8 === 0 || s8 === 5) muKick(t, 0.12); if (s8 === 4) muNoise(t, 0.09, 0.07, 1800); if (st % 2 === 0) muNoise(t, 0.03, 0.03, 8000); }
    else if (dr === 3) { if (s8 === 0 || s8 === 4 || (s8 === 6 && st % 16 > 7)) muKick(t, 0.15); if (s8 === 2 || s8 === 6) muNoise(t, 0.1, 0.09, 1500); muNoise(t, 0.025, 0.035, 8500); }
    else if (dr === 4) { if (s8 === 0) muKick(t, 0.13); if (s8 === 6) muNoise(t, 0.12, 0.06, 900); }
  }
  function muSchedule() {
    if (!MU.ctx || !MU.tr) return; const ctx = MU.ctx, muted = muMuted(); MU.master.gain.value = muted ? 0 : 0.5;
    if (muted || ctx.state !== "running") { MU.nextT = ctx.currentTime + 0.1; return; }
    const dur = 60 / MU.tr.def.bpm / 4; if (MU.nextT < ctx.currentTime) MU.nextT = ctx.currentTime + 0.05;
    while (MU.nextT < ctx.currentTime + 0.2) { muStep(MU.tr, MU.step, MU.nextT, dur); MU.step++; MU.nextT += dur; }
  }
  function muSet(key) {
    if (!MU.ctx || MU.key === key) return; MU.key = key; const now = MU.ctx.currentTime;
    if (MU.tg) { const old = MU.tg; old.gain.setTargetAtTime(0, now, 0.12); setTimeout(() => { try { old.disconnect(); } catch (e) {} }, 900); }
    MU.tg = MU.ctx.createGain(); MU.tg.gain.value = 0; MU.tg.gain.setTargetAtTime(1, now + 0.05, 0.2); MU.tg.connect(MU.master);
    MU.tr = MU.cache[key] || (MU.cache[key] = muGen(TRACKS[key])); MU.step = 0; MU.nextT = now + 0.15;
  }
  function muStop() { if (!MU.ctx) return; try { if (MU.tg) MU.tg.gain.setTargetAtTime(0, MU.ctx.currentTime, 0.1); } catch (e) {} MU.key = null; MU.tr = null; try { setTimeout(() => { if (!MU.key) MU.ctx.suspend(); }, 600); } catch (e) {} }
  function musicKey() {
    if (BT) return "battle"; if (mode === "story" && SC) { if (SC.id === "world") return areaAt(P.x, P.z).k === "t" ? "town" : "route"; return SC.kind === "rocket" ? "rocket" : SC.kind === "gym" || SC.kind === "stadium" ? "gym" : "inside"; } return "town";
  }
  function musicTick(dt) { if (!MU.ctx) return; MU.chk -= dt; if (MU.chk > 0) return; MU.chk = 0.25; try { if (MU.ctx.state === "suspended" && !muMuted()) MU.ctx.resume(); } catch (e) {} muSet(musicKey()); }
  function updSoundBtn() { const b = $("av-sound"); if (b) b.textContent = muMuted() ? "🔇" : "🔊"; }
  function toggleSound() { DB.sound = muMuted() ? true : false; if (DB.sound !== false && typeof settings !== "undefined" && settings && settings.sound === false) { try { settings.sound = true; saveSettings(); } catch (e) {} } saveDB(); muInit(); updSoundBtn(); }

  /* ----- loop, camera, setup ----- */
  let running = false, last = 0;
  function update(dt) {
    T += dt; tickPart(dt); musicTick(dt); fxTick(dt);
    if (BT && BT.cam) {
      [BT.pH, BT.fH].forEach((h) => h && tickMon(h, dt));
      let sx = 0, sy = 0; if (shakeT > 0) { shakeT -= dt; sx = (Math.random() - 0.5) * shakeP; sy = (Math.random() - 0.5) * shakeP * 0.6; }
      camera.position.set(SO.x + 0.4 + Math.sin(T * 0.35) * 0.35 + sx, 3.7 + Math.sin(T * 0.5) * 0.1 + sy, SO.z + 10.2); camera.lookAt(SO.x + 0.2, 1.7, SO.z - 0.8); return;
    }
    if (WORLD) WORLD.clouds.forEach((c) => { c.position.x += dt * 0.8; if (c.position.x > 1120) c.position.x = -100; });
    if (partnerH) tickMon(partnerH, dt);
    if (mode === "story" && G) story(dt);
    if (trainer && !BT) trainer.visible = !(mode === "story" && (DB.view || 0) === 3);
    if (trainer) { trainer.position.set(P.x, 0, P.z); trainer.rotation.y = P.rot; const lg = trainer.userData.legs, sw = P.moving ? Math.sin(T * 12) * 0.5 : 0; lg[0].rotation.x = sw; lg[1].rotation.x = -sw; }
    if (partnerH && mode === "story") {
      const tx = P.x - Math.sin(P.rot) * 1.7 + Math.cos(P.rot), tz = P.z - Math.cos(P.rot) * 1.7 - Math.sin(P.rot), ox = partnerH.position.x, oz = partnerH.position.z;
      movePartner(dt, tx, tz, ox, oz); const mx = partnerH.position.x - ox; if (Math.abs(mx) > 0.002) face(partnerH, mx > 0);
    }
    let cx, cy, cz, lx, ly, lz;
    if (mode === "story" && SC) {
      const inn = SC.id !== "world", vw = DB.view || 0;
      if (vw === 1) { cx = P.x; cy = inn ? 7.6 : 5.4; cz = P.z + (inn ? 7 : 7.2); lx = P.x; ly = 1.2; lz = P.z; }
      else if (vw === 2) { cx = P.x; cy = inn ? 30 : 26; cz = P.z + 3.5; lx = P.x; ly = 0; lz = P.z; }
      else if (vw === 3) { const fx = Math.sin(P.rot), fz = Math.cos(P.rot); cx = P.x + fx * 0.25; cy = 1.75; cz = P.z + fz * 0.25; lx = P.x + fx * 10; ly = 1.55; lz = P.z + fz * 10; }
      else { cx = P.x; cy = inn ? 11 : 9; cz = P.z + (inn ? 10.5 : 11); lx = P.x; ly = 1; lz = P.z; }
    }
    else { const a = T * 0.12; cx = P.x + Math.sin(a) * 11; cy = 5; cz = P.z + Math.cos(a) * 11; lx = P.x; ly = 1.5; lz = P.z; }
    const k = camSnap || (mode === "story" && (DB.view || 0) === 3) ? 1 : 1 - Math.exp(-4.5 * dt); camSnap = false; camera.position.x += (cx - camera.position.x) * k; camera.position.y += (cy - camera.position.y) * k; camera.position.z += (cz - camera.position.z) * k;
    camLook.x += (lx - camLook.x) * k; camLook.y += (ly - camLook.y) * k; camLook.z += (lz - camLook.z) * k; camera.lookAt(camLook.x, camLook.y, camLook.z);
  }
  const camLook = { x: 0, y: 1, z: 0 };
  function frame(now) {
    if (!running) return; const p = $("adventure-page"); if (!p || p.classList.contains("hidden")) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    try { update(dt); renderFrame(); } catch (e) { showErr(e); running = false; return; }
    requestAnimationFrame(frame);
  }
  function resize() { const p = $("adventure-page"); if (!renderer || !p) return; const w = p.clientWidth || innerWidth, h = p.clientHeight || innerHeight; renderer.setSize(w, h); if (POST) POST.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function webglOK() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")); } catch (e) { return false; } }
  let built = false;
  function setup(cb) {
    if (built) return cb(); built = true; injectCSS();
    $("adventure-page").innerHTML = `<div id="av-3d"></div>
      <div id="av-top"><button class="av-btn ghost" id="av-back">← BACK</button><button class="av-btn ghost" id="av-menu" hidden>☰ MENU</button><button class="av-btn ghost" id="av-view" hidden>👁 VIEW</button><button class="av-btn ghost" id="av-sound">🔊</button><div id="av-title"></div><span class="av-pill" id="av-res"></span></div>
      <div id="av-hud" hidden></div><canvas id="av-map" width="300" height="300" hidden></canvas><div id="av-feed"></div>
      <div id="av-bottom"><div id="av-team"></div><div id="av-pad" hidden><button class="av-btn u" data-k="up">▲</button><button class="av-btn l" data-k="left">◀</button><button class="av-btn d" data-k="down">▼</button><button class="av-btn r" data-k="right">▶</button></div></div>
      <div id="av-prompt" hidden></div><button class="av-btn" id="av-act" hidden>A</button><div id="av-joy" hidden><i></i></div><button class="av-btn" id="av-run" hidden>RUN</button><div id="av-loc"></div><div id="av-dlg" hidden></div><div id="av-flash"></div>
      <div id="bt" hidden><div id="bt-flash"></div><div class="bt-box foe" id="bt-foe"></div><div class="bt-box me" id="bt-me"></div><div id="bt-bottom"><div id="bt-text"></div><div id="bt-cmd"></div></div></div>
      <div id="av-modal" hidden></div><div id="av-err" hidden></div>`;
    $("av-back").onclick = onBack; $("av-menu").onclick = () => hub("party"); $("av-view").onclick = cycleView; $("av-sound").onclick = toggleSound; ["pointerdown", "keydown"].forEach((ev) => $("adventure-page").addEventListener(ev, () => { muInit(); updSoundBtn(); }, { passive: true })); $("av-act").onclick = interact; $("av-dlg").onclick = () => advanceDlg(); $("av-map").onclick = () => { $("av-map").classList.toggle("big"); };
    $("av-run").onclick = () => { if (G) { G.run = !G.run; $("av-run").classList.toggle("on", G.run); } };
    { const jz = $("av-joy"), kn = jz.firstChild; const jm = (e) => { const r = jz.getBoundingClientRect(), R2 = r.width / 2; let dx = e.clientX - (r.left + R2), dy = e.clientY - (r.top + R2); const l = Math.hypot(dx, dy) || 1, m = Math.min(1, l / R2); dx = (dx / l) * m; dy = (dy / l) * m; kn.style.transform = "translate(" + dx * R2 * 0.6 + "px," + dy * R2 * 0.6 + "px)"; joy.x = m > 0.2 ? dx : 0; joy.z = m > 0.2 ? dy : 0; }; let on = false; jz.addEventListener("pointerdown", (e) => { e.preventDefault(); on = true; try { jz.setPointerCapture(e.pointerId); } catch (x) {} jm(e); }); jz.addEventListener("pointermove", (e) => { if (on) jm(e); }); const je = () => { on = false; joy.x = 0; joy.z = 0; kn.style.transform = ""; }; ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => jz.addEventListener(ev, je)); }
    document.querySelectorAll("#av-pad button").forEach((b) => { const k = b.dataset.k; b.addEventListener("pointerdown", (e) => { e.preventDefault(); pad[k] = true; }); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => { pad[k] = false; })); });
    if (!webglOK()) { built = false; const e = $("av-err"); e.hidden = false; e.innerHTML = "<b>3D graphics (WebGL) isn’t available in this browser.</b><br>Turn on hardware acceleration in your browser settings (Edge/Chrome → Settings → System), then reload the page."; return; }
    const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = () => { try { init3d(); cb(); loadPost(); } catch (e) { built = false; showErr(e); } };
    s.onerror = () => { built = false; const e = $("av-err"); e.hidden = false; e.textContent = "Couldn’t load the 3D engine — check your connection and try again."; };
    document.head.appendChild(s);
  }
  function init3d() {
    THREE = window.THREE; try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { renderer = new THREE.WebGLRenderer({ antialias: false }); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; $("av-3d").appendChild(renderer.domElement);
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(52, 1, 0.1, 520); scene.add(new THREE.HemisphereLight(0xbcd8ff, 0x5c6b3a, 0.64)); const sun = new THREE.DirectionalLight(0xffe2b0, 0.7); sun.position.set(34, 26, 20); sun.castShadow = true; const shs = matchMedia("(pointer:coarse)").matches ? 1024 : 2048; sun.shadow.mapSize.set(shs, shs); const sc2 = sun.shadow.camera; sc2.left = -40; sc2.right = 40; sc2.top = 40; sc2.bottom = -40; sc2.near = 1; sc2.far = 130; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target); SUN = sun;
    fxGroup = new THREE.Group(); scene.add(fxGroup); initTex(); initFx(); trainer = makeTrainer(DEF_LOOK); shadowPass(trainer); scene.add(trainer); initStage(); addEventListener("resize", resize);
  }
  const VIEWS = ["Classic", "Close-up", "Top-down", "Player view (first person)"];
  function cycleView() { DB.view = ((DB.view || 0) + 1) % 4; saveDB(); camSnap = true; toast({ icon: "👁", title: "View: " + VIEWS[DB.view], message: DB.view === 3 ? "W/S move, A/D turn (joystick: up/down move, left/right turn)." : "" }); }
  function onBack() { if (BT || DL) return; if (mode) { menu(); return; } close(); }
  function open() {
    loadDB(); muInit(); $("home-page").classList.add("hidden"); $("adventure-page").classList.remove("hidden");
    setup(() => { resize(); updSoundBtn(); menu(); if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } });
  }
  function close() {
    try { if (G) saveStory(); } catch (e) {} running = false; runId++; abortBattle(); muStop(); $("adventure-page").classList.add("hidden");
    if (typeof showHomeScreen === "function") showHomeScreen(); else $("home-page").classList.remove("hidden");
  }
  /* ---------- keyboard control for every menu, shop, PC, battle command and prompt ---------- */
  const KB = { cur: null, idx: 0, n: 0, used: false, obs: false, hint: null };
  const KB_SEL = "button,[onclick],[data-a],[data-x],[data-i],[data-k],[data-s],[data-t],[data-id],[data-q],[data-c],[data-r],.slot";
  const kbOk = (el) => !el.disabled && el.getAttribute("aria-disabled") !== "true";
  function kbRoot() {
    const pg = $("adventure-page"); if (!pg || pg.classList.contains("hidden") || DL) return null;
    if (modalOpen()) return $("av-modal");
    const bt = $("bt"), cmd = $("bt-cmd"); if (BT && bt && !bt.hidden && cmd && cmd.children.length) return cmd;
    return null;
  }
  function kbList(root) {
    const els = Array.from(root.querySelectorAll("*")).filter((el) => (el.matches(KB_SEL) || el.onclick) && !el.hidden && el.getClientRects().length);
    return els.filter((el) => !els.some((o) => o !== el && el.contains(o)));
  }
  function kbSet(el) { if (KB.cur && KB.cur !== el) KB.cur.classList.remove("kb-focus"); KB.cur = el; if (el) { if (KB.used) el.classList.add("kb-focus"); try { el.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) {} } }
  function kbHint(on) {
    const pg = $("adventure-page"); if (!pg) return; if (!KB.hint) { KB.hint = document.createElement("div"); KB.hint.id = "av-kbhint"; KB.hint.textContent = "↑ ↓ ← → Move · Enter Select · Esc Back · 1-9 Quick pick"; pg.appendChild(KB.hint); }
    KB.hint.hidden = !on;
  }
  function kbEnsure() {
    const root = kbRoot(); kbHint(!!root);
    if (!root) { if (KB.cur) { KB.cur.classList.remove("kb-focus"); KB.cur = null; } KB.n = 0; return null; }
    const nav = kbList(root).filter(kbOk); if (nav.length !== KB.n) { if (!KB.cur || !nav.includes(KB.cur)) KB.idx = KB.n && nav.length > KB.n ? KB.idx : 0; KB.n = nav.length; }
    if (nav.length && (!KB.cur || !nav.includes(KB.cur))) kbSet(nav[Math.max(0, Math.min(KB.idx, nav.length - 1))]); else if (KB.cur && KB.used) KB.cur.classList.add("kb-focus");
    return { root, nav };
  }
  function kbMove(nav, cur, dir) {
    const rc = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, c0 = rc(cur); let best = null, bs = 1e9;
    for (const el of nav) {
      if (el === cur) continue; const c = rc(el), dx = c.x - c0.x, dy = c.y - c0.y; let p, s;
      if (dir === "left") { p = -dx; s = Math.abs(dy); } else if (dir === "right") { p = dx; s = Math.abs(dy); } else if (dir === "up") { p = -dy; s = Math.abs(dx); } else { p = dy; s = Math.abs(dx); }
      if (p < 4) continue; const sc = p + s * 2.5; if (sc < bs) { bs = sc; best = el; }
    }
    if (best) return best; const i = nav.indexOf(cur);
    if (dir === "down") return nav[(i + 1) % nav.length]; if (dir === "up") return nav[(i - 1 + nav.length) % nav.length]; return cur;
  }
  function kbBack(root) {
    const isBack = (el) => /^(←|◀|⬅)?\s*(BACK|CLOSE|RESUME|CANCEL|NOT YET|NO|LATER|LEAVE)\b/i.test((el.textContent || "").trim()) || ["x", "no", "back", "close", "home", "cancel"].includes(el.dataset && el.dataset.a) || el.classList.contains("back");
    const b = kbList(root).filter(kbOk).find(isBack); if (b) { b.click(); return true; } return false;
  }
  function kbInit() {
    if (KB.obs) return; KB.obs = true; const re = () => { if (KB.used) (window.requestAnimationFrame || setTimeout)(kbEnsure); };
    [$("av-modal"), $("bt-cmd")].forEach((el) => { if (el && window.MutationObserver) new window.MutationObserver(re).observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "disabled"] }); });
  }
  function kbKey(e) {
    const pg = $("adventure-page"); if (!pg || pg.classList.contains("hidden")) return;
    kbInit(); const k = e.key, tag = (e.target && e.target.tagName) || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) {
      if (k === "Enter" && modalOpen()) { const pri = kbList($("av-modal")).filter(kbOk).filter((b) => b.tagName === "BUTTON" && !b.classList.contains("ghost")).pop(); if (pri) { e.preventDefault(); e.stopImmediatePropagation(); pri.click(); } }
      else if (k === "Escape" && modalOpen()) e.target.blur();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const st = kbEnsure(), hit = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (!st) {
      if (mode === "story" && G && !G.cut && !DL && !BT && !e.repeat) { if (k === "Escape") { hit(); hub("party"); } else if (k === "n" || k === "N") toggleSound(); }
      return;
    }
    const { root, nav } = st, dirs = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
    if (dirs[k]) { hit(); KB.used = true; if (nav.length) { const nx = kbMove(nav, KB.cur || nav[0], dirs[k]); KB.idx = nav.indexOf(nx); kbSet(nx); } return; }
    if (k === "Tab") { hit(); KB.used = true; if (nav.length) { const i = Math.max(0, nav.indexOf(KB.cur)), nx = nav[(i + (e.shiftKey ? -1 : 1) + nav.length) % nav.length]; KB.idx = nav.indexOf(nx); kbSet(nx); } return; }
    if (k === "Enter" || k === " " || k === "e" || k === "E") { hit(); if (!KB.used) { KB.used = true; kbEnsure(); return; } if (!e.repeat && KB.cur) KB.cur.click(); return; }
    if (k === "Escape" || k === "Backspace" || k === "b" || k === "B" || k === "q" || k === "Q") { hit(); if (!e.repeat) kbBack(root); return; }
    if (/^[1-9]$/.test(k)) { hit(); const el = kbList(root)[+k - 1]; if (el && kbOk(el) && !e.repeat) { KB.used = true; kbSet(el); KB.idx = nav.indexOf(el); el.click(); } }
  }
  function kbPointer() { if (KB.used) { KB.used = false; if (KB.cur) KB.cur.classList.remove("kb-focus"); } }
  window.addEventListener("keydown", kbKey, true); window.addEventListener("pointerdown", kbPointer, true);
  addEventListener("keydown", (e) => {
    const p = $("adventure-page"); if (!p || p.classList.contains("hidden")) return; if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName || "")) return;
    held[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault();
    if (!e.repeat && mode === "story") { if (e.key === "e" || e.key === "E" || e.key === " " || e.key === "Enter") { e.preventDefault(); interact(); } else if ((e.key === "m" || e.key === "M") && !modalOpen()) hub("party"); else if ((e.key === "v" || e.key === "V") && !modalOpen()) cycleView(); }
  });
  addEventListener("keyup", (e) => { held[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  addEventListener("blur", () => { Object.keys(held).forEach((k) => { held[k] = false; }); });

  /* ============================================================
     WEBSITE BATTLE UPGRADES — computer, 2-player and online matches
     (runs on top of game.js: animated body parts, richer move
     effects for every type, smarter AI that switches Pokémon, and
     Revive during matches)
  ============================================================ */
  const warpState = new WeakMap();
  function warpedDraw(image, x0, y0, w, h, fighter, walk, atk, fwd) {
    const C = 8, R = 14, sw = image.naturalWidth / C, sh = image.naturalHeight / R, cw = w / C, ch = h / R, t = fighter.animationTime / 60 + (fighter === player ? 0 : 1.7), hit = fighter.hitTimer > 0 ? Math.sin(fighter.hitTimer * 0.5) : 0;
    for (let j = 0; j < R; j++) {
      const v = 1 - (j + 0.5) / R, head = sstep(0.55, 1, v), leg = 1 - sstep(0.02, 0.3, v);
      for (let i = 0; i < C; i++) {
        const u = (i + 0.5) / C - 0.5, ax = Math.abs(u), sg = u < 0 ? -1 : 1, limb = sstep(0.16, 0.5, ax) * sstep(0.12, 0.65, v), step = Math.sin(t * (7 + walk * 5) + (u > 0 ? 0 : Math.PI));
        let dx = Math.sin(t * 1.5) * 0.03 * head + Math.sin(t * 3 + sg * 1.7) * 0.02 * limb * sg + step * (0.012 + 0.05 * walk) * leg;
        let dy = Math.sin(t * 3.1) * 0.012 * head + Math.sin(t * 3.6 + sg * 1.9) * 0.035 * limb * (1 + walk) + Math.max(0, step) * 0.03 * walk * leg + (v - 0.5) * 0.018 * Math.sin(t * 2.2);
        dx += fwd * atk * 0.16 * v * v + hit * 0.04 * v; dy -= atk * 0.03 * head;
        ctx.drawImage(image, i * sw, j * sh, sw, sh, x0 + i * cw + dx * w, y0 + j * ch - dy * h, cw + 1.4, ch + 1.4);
      }
    }
  }
  function patchBattleDraw() {
    if (typeof window.drawPokemonImage !== "function") return;
    window.drawPokemonImage = function (fighter, image, pokemon) {
      const size = 245 * getSizeScale(pokemon); ctx.save();
      if (!fighter.jumping && !fighter.attacking && !fighter.hitTimer && !fighter.dodging) ctx.scale(1, 1 + Math.sin(fighter.animationTime * 0.06) * 0.02);
      const nat = getArtworkNaturalFacing(pokemon); ctx.scale(nat * fighter.facing, 1);
      if (fighter.jumping) { ctx.rotate(fighter.facing * -0.045); ctx.scale(0.97, 1.03); } if (fighter.dodging) ctx.scale(1.12, 0.88);
      let atk = 0; if (fighter.attacking) { const pr = clamp(1 - fighter.attackTimer / GAME.attackDuration, 0, 1); atk = Math.sin(pr * Math.PI); ctx.translate(atk * 18, 0); ctx.rotate(atk * 0.035); }
      if (fighter.attacking || fighter.hitTimer > 0) { ctx.shadowColor = fighter === player ? "#ffe14a" : "#ff6688"; ctx.shadowBlur = 12; }
      const st = warpState.get(fighter) || { x: fighter.x, v: 0 }; st.v += (Math.min(1, Math.abs(fighter.x - st.x) / 6) - st.v) * 0.2; st.x = fighter.x; warpState.set(fighter, st);
      warpedDraw(image, -size / 2, -size + 15, size, size, fighter, st.v, atk, nat);
      ctx.shadowBlur = 0; ctx.restore();
    };
    if (typeof window.drawProjectiles === "function") window.drawProjectiles = function () {
      for (let i = 0; i < projectiles.length; i++) {
        const p = projectiles[i], ty = p.move.type || "normal", col = p.move.color || "#fff", now = performance.now();
        ctx.save(); ctx.translate(p.x, p.y);
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, p.radius * 2.8); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.globalAlpha = 0.6; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.radius * 2.8, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
        if (ty === "electric") { ctx.strokeStyle = "#fff9a6"; ctx.lineWidth = 4; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(-p.radius * 1.4, -4); for (let k = 1; k <= 5; k++) ctx.lineTo(-p.radius * 1.4 + k * p.radius * 0.6, (k % 2 ? 1 : -1) * (6 + Math.sin(now * 0.05 + k) * 3)); ctx.stroke(); }
        else { ctx.rotate(now * 0.009 * (i % 2 ? 1 : -1)); ctx.font = Math.round(p.radius * 2.6) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.fillText(FXE[ty] || "💥", 0, 2); }
        ctx.restore();
      }
    };
    if (typeof window.createImpactEffect === "function") { const orig = window.createImpactEffect; window.createImpactEffect = function (x, y, move) { orig(x, y, move); try { createBurst(x, y, move.color, 10); if (move.type === "ground" || move.type === "rock") screenShake = Math.max(screenShake, 6); showText(x + (Math.random() - 0.5) * 40, y - 30, FXE[move.type] || "💥", move.color); } catch (e) {} }; }
  }
  function aiConsiderSwitch() {
    if (window.AI_DIFFICULTY === "easy") return; const team = enemyTeam;
    if (!team || team.length < 2 || enemy.hp <= 0 || enemy.attacking || enemy.dodging || enemy.hitTimer > 0 || enemy.switchLock > 0) return;
    const hpOf = (p) => (typeof p.hp === "number" ? p.hp : 100), alive = team.map((p, i) => ({ p, i })).filter((o) => o.i !== enemyTeamIndex && o.p && !o.p.fainted);
    if (!alive.length) return;
    const score = (att, def) => typeEffectivenessMultiplier(getMove(att).type, def) / Math.max(0.25, typeEffectivenessMultiplier(getMove(def).type, att));
    const cur = score(enemyPokemon, playerPokemon); let best = null, bs = cur; const low = enemy.hp < 28 && alive.some((o) => hpOf(o.p) > 55);
    alive.forEach((o) => { if (hpOf(o.p) < 35) return; const s = score(o.p, playerPokemon) * (hpOf(o.p) / 100 + 0.4); if (s > bs) { bs = s; best = o; } });
    if (low) best = alive.filter((o) => hpOf(o.p) > 55).sort((a, b) => score(b.p, playerPokemon) - score(a.p, playerPokemon))[0];
    if (best && (low || bs > cur * 1.6) && Math.random() < 0.8) switchToIndex(false, best.i);
  }
  function patchAI() {
    const orig = window.updateEnemyAI; if (typeof orig !== "function") return; let tmr = 0;
    window.updateEnemyAI = function (dt) { try { if (!twoPlayerMode && !onlineBattleActive && gameRunning && !battleEnded && !koPause) { tmr -= 16.67 * dt; if (tmr <= 0) { tmr = 1400 + Math.random() * 900; aiConsiderSwitch(); } } } catch (e) {} return orig(dt); };
  }
  function matchRevive() {
    try {
      if (!gameRunning || battleEnded || onlineBattleActive || koPause) return;
      if ((DB.revive || 0) <= 0) { toast({ icon: itemImg("revive", 22), title: "No Revives left", message: "Buy one in the Shop or find them in Adventure." }); return; }
      const idx = playerTeam.findIndex((p) => p && p.fainted); if (idx < 0) { toast({ icon: "♻️", title: "Nobody has fainted" }); return; }
      const pk = playerTeam[idx]; pk.fainted = false; pk.hp = 50; DB.revive--; saveDB(); showText(player.x, player.y - 250, formatPokemonName(pk.name) + " REVIVED!", "#8ee6b0"); createBurst(player.x, player.y - 100, "#8ee6b0", 22); updateTeamPips(); updateHealthBars(); updateMatchReviveBtn();
    } catch (e) {}
  }
  function updateMatchReviveBtn() {
    const b = $("match-revive"); if (!b) return; let show = false;
    try { const bf = $("battlefield-page"); show = !!(bf && !bf.classList.contains("hidden") && gameRunning && !battleEnded && !onlineBattleActive); } catch (e) {}
    b.style.display = show ? "flex" : "none"; if (show) b.innerHTML = itemImg("revive", 22) + "<span>Revive ×" + (DB.revive || 0) + " <small>(R)</small></span>";
  }
  function patchRevive() {
    const bf = $("battlefield-page"); if (bf && !$("match-revive")) { const b = document.createElement("button"); b.id = "match-revive"; b.type = "button"; b.onclick = matchRevive; b.style.display = "none"; bf.appendChild(b); }
    const orig = window.handleKeyDown; if (typeof orig === "function") window.handleKeyDown = function (e) { try { if (!window.gameKeysShouldIgnore(e) && (e.key === "r" || e.key === "R") && !e.repeat) { e.preventDefault(); matchRevive(); return; } } catch (x) {} return orig(e); };
    setInterval(updateMatchReviveBtn, 500);
  }
  function injectReviveShop() {
    const list = $("shop-items"); if (!list) return;
    const add = () => {
      if ($("shop-revive")) return; const d = document.createElement("div"); d.className = "shop-item-card"; d.id = "shop-revive";
      d.innerHTML = '<div class="shop-item-icon">' + itemImg("revive", 30) + '</div><div class="shop-item-body"><div class="shop-item-name">Revive</div><div class="shop-item-desc">Brings a fainted Pokémon back at half health during a match (press R or tap the Revive button) and in the Story. Owned: <b>' + (DB.revive || 0) + '</b></div></div><button class="shop-item-buy" id="shop-revive-buy" type="button">600 🥮</button>';
      list.appendChild(d); $("shop-revive-buy").onclick = () => { if (getCoins() < 600) { toast({ icon: "⚠️", title: "Not enough coins" }); return; } addCoins(-600); DB.revive = (DB.revive || 0) + 1; saveDB(); toast({ icon: itemImg("revive", 22), title: "Revive purchased!", tone: "success" }); try { renderShop(); } catch (e) {} };
    };
    new MutationObserver(add).observe(list, { childList: true }); add();
  }
  function patchAuth() {
    /* "asks for login twice": the page used to reload the instant Google sign-in finished, before the browser had saved the session — so after the reload you were signed out again. Wait for the session to be stored, and fall back to a redirect if the popup is blocked. */
    if (typeof window.pullCloudProgressThenReload === "function") window.pullCloudProgressThenReload = async function () {
      if (!fbDb || !googleProfile) { location.reload(); return; }
      const uid = googleProfile.sub;
      try { const snap = await cloudDocFor(uid).get(); if (snap.exists) applyCloudDataToLocalStorage(uid, snap.data()); } catch (e) { console.warn("[cloud] pull failed:", e); }
      try { if (fbAuth && fbAuth.currentUser) await fbAuth.currentUser.getIdToken(true); } catch (e) {}
      await new Promise((r) => setTimeout(r, 1300));
      try { sessionStorage.setItem("pf_pending_toast", JSON.stringify({ icon: "✅", title: "Signed in with Google", message: googleProfile.given_name || googleProfile.name || googleProfile.email, tone: "success" })); } catch (e) {}
      location.reload();
    };
    if (typeof window.startGoogleSignIn === "function") window.startGoogleSignIn = function () {
      if (!fbAuth || !window.firebase) { toast({ icon: "⚠️", title: "Sign-in unavailable", message: "Firebase didn’t load. Check your connection and try again.", tone: "error" }); return; }
      const provider = new firebase.auth.GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" });
      const go = () => fbAuth.signInWithPopup(provider).catch((err) => {
        const c = err && err.code; if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return;
        if (c === "auth/popup-blocked" || c === "auth/operation-not-supported-in-this-environment") { try { fbAuth.signInWithRedirect(provider); } catch (e) {} return; }
        toast({ icon: "⚠️", title: "Sign-in failed", message: (err && err.message) || "Please try again.", tone: "error" });
      });
      try { fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(go, go); } catch (e) { go(); }
    };
  }
  function patchSite() { if (window.__pfAdvPatched) return; window.__pfAdvPatched = true; [patchAuth, patchBattleDraw, patchAI, patchRevive, injectReviveShop].forEach((f) => { try { f(); } catch (e) { console.warn("[adventure] site patch skipped:", e && e.message); } }); }

  /* ---------- boot ---------- */
  const CSS = `
#adventure-page{padding:0!important;display:block;background:#0b1220!important;overflow:hidden;font-family:var(--font-body)}
#adventure-page *{box-sizing:border-box}#adventure-page [hidden]{display:none!important}
#av-3d{position:absolute;inset:0}#av-3d canvas{display:block;width:100%;height:100%}#av-3d.nopost::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 55%,rgba(5,12,28,.38) 100%)}@media (hover:hover) and (pointer:fine){#av-3d.nopost canvas{filter:saturate(1.12) contrast(1.05)}}
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
.av-row2{display:flex;gap:10px;margin-top:12px}.av-row2 .av-btn{flex:1}.kb-focus{outline:3px solid #ffcf45!important;outline-offset:2px;box-shadow:0 0 0 5px rgba(255,207,69,.22),0 0 20px rgba(255,207,69,.6)!important;position:relative;z-index:1}#av-kbhint{position:absolute;left:50%;bottom:calc(4px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:30;padding:4px 12px;border-radius:999px;background:rgba(8,16,30,.82);border:1px solid #36506b;color:#cfe0f0;font:700 11px var(--font-body);letter-spacing:.4px;pointer-events:none;white-space:nowrap}#av-kbhint[hidden]{display:none}@media (pointer:coarse){#av-kbhint{display:none}}
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
#btn-home{display:none!important}
#home-avatar canvas{border-radius:0!important;filter:drop-shadow(0 14px 18px #0007)}
.ha-plate{position:relative!important;left:auto!important;bottom:auto!important;transform:none!important;margin:-18px auto 0!important;display:block;width:max-content}
.ha-mon{position:absolute;right:1%;bottom:74px;width:36%;max-width:190px;height:auto;pointer-events:none;filter:drop-shadow(0 12px 12px #0008);animation:haFloat 2.8s ease-in-out infinite}
@keyframes haFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@media(max-width:560px){.ha-mon{width:34%;bottom:64px}}
.bdg{vertical-align:middle;margin:0 1px;filter:drop-shadow(0 2px 3px #0008)}.bdg.off{filter:brightness(0) opacity(.32)}.bdg.big{filter:drop-shadow(0 6px 10px #000a)}.av-hbox b.bds{display:flex;gap:2px;align-items:center;justify-content:center;min-height:24px}
#match-revive{position:absolute;z-index:40;top:calc(78px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);align-items:center;gap:8px;background:rgba(7,17,31,.88);border:1px solid #55e6a0;color:#b9f36c;border-radius:999px;padding:6px 14px;font:800 12px Rajdhani,Arial;letter-spacing:.5px;cursor:pointer}#match-revive small{opacity:.7}
#adventure-page{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#av-pad{display:none!important}
#av-joy{position:absolute;left:16px;bottom:calc(20px + env(safe-area-inset-bottom));width:136px;height:136px;border-radius:50%;background:rgba(6,14,24,.45);border:2px solid #3a5878;z-index:5;touch-action:none;backdrop-filter:blur(3px)}
#av-joy i{position:absolute;left:50%;top:50%;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;background:rgba(93,228,255,.55);border:2px solid #8fe6ff;pointer-events:none}
#av-run{position:absolute;right:20px;bottom:calc(120px + env(safe-area-inset-bottom));z-index:5;width:60px;height:60px;border-radius:50%;padding:0;font-size:11px;background:rgba(12,27,45,.85);border:2px solid #3a5878;box-shadow:none}#av-run.on{background:linear-gradient(145deg,#5de4ff,#3d6bff)}
@media (hover:hover) and (pointer:fine){#av-joy,#av-run{display:none!important}}
@media (hover:none),(pointer:coarse){#av-act{right:22px;bottom:calc(28px + env(safe-area-inset-bottom));width:80px;height:80px;font-size:30px}#av-prompt{bottom:calc(172px + env(safe-area-inset-bottom))}}
.dex{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.dx{position:relative;background:#0c1b2d;border:1px solid #29415b;border-radius:12px;padding:6px 2px;color:#eaf3ff;font:700 9px/1.25 var(--font-display);text-align:center}.dx img{width:52px;height:52px;object-fit:contain;display:block;margin:0 auto 2px}.dx.un img{filter:brightness(0) opacity(.55)}.dx i{position:absolute;top:4px;right:6px;color:#ff6b6b;font-style:normal}
#av-tmap{width:100%;max-width:460px;display:block;margin:0 auto;border-radius:14px;border:2px solid #36506b;cursor:pointer}
@media(max-width:700px){#av-team{position:absolute;top:calc(104px + env(safe-area-inset-top));left:8px;flex-direction:row;flex-wrap:wrap;max-width:60vw;gap:4px}.av-chip{min-width:0;padding:2px 6px 2px 2px}.av-chip b{display:none}.av-chip img{width:30px;height:30px}#av-bottom{padding:0}#av-map{width:96px;height:96px;top:calc(98px + env(safe-area-inset-top))}#av-hud{top:calc(54px + env(safe-area-inset-top))}.av-sheet{padding:16px 12px}#av-top{padding-left:8px;padding-right:8px;gap:6px}#av-title{display:none}.dex{grid-template-columns:repeat(3,1fr)}.bt-box.me{bottom:clamp(200px,36vh,270px)}#bt-bottom{flex-direction:column}#bt-cmd{flex:none;max-height:36vh}#av-dlg{bottom:calc(10px + env(safe-area-inset-bottom))}.av-hbox b{font-size:19px}}
@media(max-height:520px){#av-joy{width:112px;height:112px}.av-sheet{max-height:96%}}
`;
  function injectCSS() { if ($("av-css")) return; const s = document.createElement("style"); s.id = "av-css"; s.textContent = CSS; document.head.appendChild(s); }
  function boot() { injectCSS(); loadDB(); initHome(); patchSite(); const b = $("btn-adventure"); if (b) b.onclick = open; }
  loadDB(); try { patchSite(); } catch (e) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.openAdventure = open;
})();