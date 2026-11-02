/* ============================================================
   ADVENTURE (3D) — three Free Fire-style modes
   1. SURVIVAL ZONE  – 10 trainers, a shrinking storm, loot crates,
                       minimap, last one standing gets a BOOYAH!
   2. CLASH SQUAD    – first to 3 round wins vs rival squads, spend
                       round credits between rounds
   3. LONE WOLF      – one creature, no balls, no swaps, 5 duels
   Uses the site's own coins, Poké Balls and captured Pokémon
   (globals from app.js). Creatures use the same official artwork
   as the rest of the site. Three.js loads on demand.
   Drop-in replacement: styles are injected from this file.
============================================================ */
(function () {
  "use strict";

  const KEY = "pf_adventure3d_v2";
  const ART = "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/";
  const $ = (id) => document.getElementById(id);
  const cap = (s) => String(s || "").replace(/(^|-)([a-z])/g, (m, a, b) => (a ? " " : "") + b.toUpperCase());
  const has = (str, t) => (str || "").split(",").includes(t);
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];

  /* ---------- data ---------- */
  const POOL = [
    [25, "Pikachu", "electric", 1], [4, "Charmander", "fire", 1], [7, "Squirtle", "water", 1], [1, "Bulbasaur", "grass", 1],
    [133, "Eevee", "normal", 1], [92, "Gastly", "ghost,poison", 1], [74, "Geodude", "rock,ground", 1], [66, "Machop", "fighting", 1],
    [58, "Growlithe", "fire", 1], [54, "Psyduck", "water", 1], [43, "Oddish", "grass,poison", 1], [81, "Magnemite", "electric,steel", 1],
    [39, "Jigglypuff", "normal,fairy", 1], [41, "Zubat", "poison,flying", 1], [63, "Abra", "psychic", 1], [19, "Rattata", "normal", 1],
    [6, "Charizard", "fire,flying", 2], [9, "Blastoise", "water", 2], [3, "Venusaur", "grass,poison", 2], [94, "Gengar", "ghost,poison", 2],
    [65, "Alakazam", "psychic", 2], [26, "Raichu", "electric", 2], [130, "Gyarados", "water,flying", 2], [448, "Lucario", "fighting,steel", 2],
    [68, "Machamp", "fighting", 2], [59, "Arcanine", "fire", 2],
    [149, "Dragonite", "dragon,flying", 3], [248, "Tyranitar", "rock,dark", 3], [445, "Garchomp", "dragon,ground", 3],
    [376, "Metagross", "steel,psychic", 3], [143, "Snorlax", "normal", 3],
  ].map(([id, n, t, k]) => ({ id, n, s: n.toLowerCase(), t: t.split(","), k }));
  const BOSS = { id: 150, n: "Mewtwo", s: "mewtwo", t: ["psychic"], k: 3 };
  const SE = { fire: "grass,ice,bug,steel", water: "fire,ground,rock", grass: "water,ground,rock", electric: "water,flying", ice: "grass,ground,flying,dragon", fighting: "normal,ice,rock,dark,steel", poison: "grass,fairy", ground: "fire,electric,poison,rock,steel", flying: "grass,fighting,bug", psychic: "fighting,poison", bug: "grass,psychic,dark", rock: "fire,ice,flying,bug", ghost: "psychic,ghost", dragon: "dragon", dark: "psychic,ghost", steel: "ice,rock,fairy", fairy: "fighting,dragon,dark" };
  const RES = { fire: "fire,water,rock,dragon", water: "water,grass,dragon", grass: "fire,grass,poison,flying,bug,dragon,steel", electric: "electric,grass,dragon", normal: "rock,steel", fighting: "poison,flying,psychic,bug,fairy", psychic: "psychic,steel", ghost: "dark", dragon: "steel", ice: "fire,water,ice,steel", rock: "fighting,ground,steel", ground: "grass,bug", poison: "poison,ground,rock,ghost", flying: "electric,rock,steel", bug: "fire,fighting,poison,flying,ghost,steel,fairy", steel: "fire,water,electric,steel", dark: "fighting,dark,fairy", fairy: "fire,poison,steel" };
  const IMM = { electric: "ground", normal: "ghost", ghost: "normal", ground: "flying", psychic: "dark", fighting: "ghost", dragon: "fairy" };
  const TC = { fire: 0xf08030, water: 0x4a90d9, grass: 0x58b84a, electric: 0xf5d33b, normal: 0xb8b8a8, psychic: 0xf95587, ghost: 0x705898, dragon: 0x6f35fc, fighting: 0xc03028, poison: 0xa040a0, rock: 0xb8a038, ground: 0xe0c068, flying: 0xa890f0, bug: 0xa8b820, steel: 0xb8b8d0, dark: 0x705848, fairy: 0xee99ac, ice: 0x98d8d8 };
  const eff = (a, d) => { let m = 1; d.t.forEach((t) => { if (has(IMM[a], t)) m = 0; else if (has(SE[a], t)) m *= 2; else if (has(RES[a], t)) m *= 0.5; }); return m; };
  const mk = (p, l = 1) => { const max = Math.round((42 + p.k * 12) * l); return { id: p.id, n: p.n, s: p.s, t: p.t, k: p.k, max, hp: max, a: Math.round((7 + p.k * 2) * (0.85 + l * 0.15)), cd: 0 }; };
  const RIVALS = ["Blaze", "Nova", "Viper", "Echo", "Rogue", "Titan", "Ghost", "Raven", "Storm", "Frost", "Hunter", "Zero"];

  /* ---------- site bridge ---------- */
  const toast = (o) => { try { showToast(o); } catch (e) {} };
  function addCoins(n) { try { coins += n; saveStoredNumber(COINS_KEY, coins); updateResourcesUI(); } catch (e) {} }
  const ballCount = () => { try { return getBallCount("pokeball"); } catch (e) { return 0; } };
  const spendBall = () => { try { if (!useBall("pokeball")) return false; saveInventory(); return true; } catch (e) { return false; } };
  const giveBalls = (n) => { try { addBalls("pokeball", n); saveInventory(); } catch (e) {} };
  function siteTeam() {
    let list = []; try { list = capturedList.slice(); } catch (e) {}
    if (!list.length) list = [{ name: "pikachu", id: 25 }];
    try { list.sort((a, b) => (b.name === selectedName) - (a.name === selectedName)); } catch (e) {}
    return list.map((c) => { const p = POOL.find((x) => x.id === c.id); return mk({ id: c.id, n: cap(c.name), s: c.name, t: c.types && c.types.length ? c.types : p ? p.t : ["normal"], k: p ? p.k : 2 }, 1.1); });
  }

  /* ---------- save ---------- */
  function load() { try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.s) return r; } catch (e) {} return { s: { runs: 0, booyah: 0, best: 0, kills: 0, cs: 0, lw: 0 } }; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) {} };

  /* ---------- state ---------- */
  let A, THREE, renderer, scene, camera, meadow, arena, zoneG, zoneWall, zoneRing, nextRing;
  let trainer, rivalT, partnerH, foeH, mode = null, G = null, B = null;
  let built = false, running = false, last = 0, t = 0, runId = 0, camSnap = true;
  const P = { x: 0, z: 24, rot: Math.PI, moving: false };
  const held = {}, pad = {}, COL = [], camLook = { x: 0, y: 1, z: 0 };
  const later = (fn, ms) => { const r = runId; setTimeout(() => { if (r === runId) fn(); }, ms); };
  const modalOpen = () => !$("av-modal").hidden;

  /* ---------- styles ---------- */
  function injectCSS() {
    if ($("av-css")) return;
    const s = document.createElement("style"); s.id = "av-css";
    s.textContent = `
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
`;
    document.head.appendChild(s);
  }

  /* ---------- 3D helpers ---------- */
  const lam = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
  const mesh = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); return o; };

  function makeMon(c, s) {
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    const mat = new THREE.SpriteMaterial({ color: TC[c.t[0]] || 0xcccccc, transparent: true, alphaTest: 0.08 });
    const sp = new THREE.Sprite(mat); sp.scale.set(s, s, 1); sp.position.y = s * 0.46; inner.add(sp);
    new THREE.TextureLoader().setCrossOrigin("anonymous").load(ART + c.id + ".png", (tx) => { mat.map = tx; mat.color.set(0xffffff); mat.needsUpdate = true; });
    const sh = mesh(new THREE.CircleGeometry(s * 0.3, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.28, depthWrite: false }), 0, 0.04, 0);
    sh.rotation.x = -Math.PI / 2; g.add(sh);
    g.userData = { s, inner, sp, mat, key: c.s, pop: 0, flash: 0, lunge: -1, lx: 0, lz: 0, ph: Math.random() * 6 };
    return g;
  }
  const face = (h, right) => { const u = h.userData; u.sp.scale.x = (right ? -1 : 1) * u.s; };
  function tickMon(h, dt) {
    const u = h.userData;
    if (u.pop < 1) { u.pop = Math.min(1, u.pop + dt * 3); h.scale.setScalar(0.15 + 0.85 * (1 - Math.pow(1 - u.pop, 3))); }
    if (u.sink) h.scale.multiplyScalar(Math.max(0.01, 1 - dt * 2));
    if (u.flash > 0) { u.flash -= dt; if (u.flash <= 0) u.mat.color.set(0xffffff); }
    if (u.lunge >= 0) { u.lunge += dt * 3.2; const k = u.lunge < 1 ? Math.sin(Math.PI * u.lunge) : 0; u.inner.position.set(u.lx * k * 1.8, 0, u.lz * k * 1.8); if (u.lunge >= 1) u.lunge = -1; }
    u.sp.position.y = u.s * 0.46 + Math.abs(Math.sin(t * 3 + u.ph)) * 0.05 * u.s;
  }
  function makeTrainer(shirt, capc) {
    const g = new THREE.Group(), skin = 0xf1c9a5, pants = 0x2b3a6b;
    const legs = [mesh(new THREE.BoxGeometry(0.2, 0.62, 0.22), lam(pants), -0.14, 0.31, 0), mesh(new THREE.BoxGeometry(0.2, 0.62, 0.22), lam(pants), 0.14, 0.31, 0)];
    g.add(legs[0], legs[1]);
    g.add(mesh(new THREE.BoxGeometry(0.56, 0.74, 0.34), lam(shirt), 0, 0.99, 0));
    g.add(mesh(new THREE.SphereGeometry(0.26, 14, 10), lam(skin), 0, 1.58, 0));
    [-1, 1].forEach((k) => { g.add(mesh(new THREE.BoxGeometry(0.15, 0.58, 0.17), lam(shirt), k * 0.37, 0.98, 0)); g.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), lam(skin), k * 0.37, 0.64, 0)); });
    g.add(mesh(new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(capc), 0, 1.62, 0));
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.04, 0.3), lam(capc), 0, 1.62, 0.3));
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.5, 0.18), lam(0xffcf45), 0, 1.0, -0.26));
    g.add(mesh(new THREE.SphereGeometry(0.035, 6, 6), lam(0x111111), -0.09, 1.6, 0.24), mesh(new THREE.SphereGeometry(0.035, 6, 6), lam(0x111111), 0.09, 1.6, 0.24));
    g.userData.legs = legs; return g;
  }

  /* ---------- world ---------- */
  function grassTex() {
    const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
    x.fillStyle = "#5fb84f"; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) { x.fillStyle = "hsla(" + (90 + Math.random() * 35) + ",55%," + (32 + Math.random() * 22) + "%,.55)"; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 5 + Math.random() * 4); }
    const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(20, 20); return tx;
  }
  function buildWorld() {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8a5a, 0.95));
    const sun = new THREE.DirectionalLight(0xfff2d0, 0.65); sun.position.set(14, 24, 10); scene.add(sun);
    let seed = 11; const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    meadow = new THREE.Group(); scene.add(meadow);
    const ground = mesh(new THREE.PlaneGeometry(140, 140), lam(0xffffff, { map: grassTex() })); ground.rotation.x = -Math.PI / 2; meadow.add(ground);
    const lake = mesh(new THREE.CircleGeometry(6, 36), new THREE.MeshLambertMaterial({ color: 0x3fa7e8, transparent: true, opacity: 0.88 }), -17, 0.05, -15); lake.rotation.x = -Math.PI / 2; meadow.add(lake); COL.push({ x: -17, z: -15, r: 6.4 });
    const shore = mesh(new THREE.RingGeometry(6, 6.8, 36), lam(0xe6d9a0), -17, 0.04, -15); shore.rotation.x = -Math.PI / 2; meadow.add(shore);
    const trunkG = new THREE.CylinderGeometry(0.22, 0.3, 1.5, 6), leafG = new THREE.IcosahedronGeometry(1.25, 0), trunkM = lam(0x7a5230);
    const leafMs = [lam(0x2d8a3e, { flatShading: true }), lam(0x3ea34a, { flatShading: true }), lam(0x277a44, { flatShading: true })];
    for (let i = 0, n = 0; n < 46 && i < 500; i++) {
      const x = (r() - 0.5) * 62, z = (r() - 0.5) * 62;
      if (Math.hypot(x - P.x, z - P.z) < 5 || Math.hypot(x + 17, z + 15) < 8) continue;
      const m = leafMs[n % 3], s = 0.8 + r() * 0.7;
      const tree = new THREE.Group(); tree.add(mesh(trunkG, trunkM, 0, 0.75, 0), mesh(leafG, m, 0, 2.2, 0), mesh(leafG, m, 0.3, 3.1, 0.1)); tree.children[2].scale.setScalar(0.75);
      tree.position.set(x, 0, z); tree.scale.setScalar(s); meadow.add(tree); COL.push({ x, z, r: 0.9 * s }); n++;
    }
    const rockG = new THREE.DodecahedronGeometry(0.8, 0), rockM = lam(0x9a9aa8, { flatShading: true });
    for (let i = 0; i < 14; i++) { const x = (r() - 0.5) * 60, z = (r() - 0.5) * 60; if (Math.hypot(x - P.x, z - P.z) < 5) continue; const s = 0.6 + r() * 0.9, o = mesh(rockG, rockM, x, 0.4 * s, z); o.scale.set(s, s * 0.8, s); o.rotation.y = r() * 6; meadow.add(o); COL.push({ x, z, r: 0.8 * s }); }
    const fG = new THREE.SphereGeometry(0.11, 6, 5), fCols = [0xff6b8b, 0xffd43b, 0xffffff, 0xc77dff, 0xff9e5a];
    for (let i = 0; i < 90; i++) meadow.add(mesh(fG, lam(fCols[i % 5]), (r() - 0.5) * 64, 0.14, (r() - 0.5) * 64));
    const mG = new THREE.ConeGeometry(1, 1, 6);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, d = 62 + r() * 6, h = 14 + r() * 14, w = 9 + r() * 7, o = mesh(mG, lam(0x6f8fb8, { flatShading: true }), Math.cos(a) * d, h / 2, Math.sin(a) * d); o.scale.set(w, h, w); meadow.add(o); }
    meadow.userData.clouds = [];
    for (let i = 0; i < 7; i++) { const c = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }); for (let k = 0; k < 4; k++) { const b = mesh(new THREE.SphereGeometry(2 + r() * 1.5, 10, 8), m, k * 2.2, r(), r() * 1.5); b.scale.y = 0.55; c.add(b); } c.position.set((r() - 0.5) * 90, 26 + r() * 6, (r() - 0.5) * 80); meadow.add(c); meadow.userData.clouds.push(c); }
    arena = new THREE.Group(); scene.add(arena); buildArena(r);
    zoneG = new THREE.Group(); scene.add(zoneG);
    zoneWall = mesh(new THREE.CylinderGeometry(1, 1, 16, 56, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }), 0, 8, 0);
    zoneRing = mesh(new THREE.RingGeometry(0.985, 1, 72), new THREE.MeshBasicMaterial({ color: 0xff5a4a, side: THREE.DoubleSide }), 0, 0.08, 0); zoneRing.rotation.x = -Math.PI / 2;
    nextRing = mesh(new THREE.RingGeometry(0.985, 1, 72), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), 0, 0.09, 0); nextRing.rotation.x = -Math.PI / 2;
    zoneG.add(zoneWall, zoneRing, nextRing); zoneG.visible = false;
  }
  function buildArena(r) {
    arena.add(mesh(new THREE.PlaneGeometry(120, 120), lam(0x0f1626), 0, -0.02, 0)).rotation.x = -Math.PI / 2;
    const plat = mesh(new THREE.CylinderGeometry(10, 10.6, 0.7, 48), lam(0x2a3552), 0, -0.34, 0); arena.add(plat);
    const inner = mesh(new THREE.CylinderGeometry(8.6, 8.6, 0.06, 48), lam(0x34456b), 0, 0.02, 0); arena.add(inner);
    [3.2, 5.6, 8.4].forEach((rad, i) => { const ring = mesh(new THREE.RingGeometry(rad - 0.08, rad, 64), new THREE.MeshBasicMaterial({ color: i === 2 ? 0xffcf45 : 0x4fb3ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }), 0, 0.06, 0); ring.rotation.x = -Math.PI / 2; arena.add(ring); });
    const mid = mesh(new THREE.PlaneGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: 0x4fb3ff, transparent: true, opacity: 0.35 }), 0, 0.07, 0); mid.rotation.x = -Math.PI / 2; mid.rotation.z = Math.PI / 2; arena.add(mid);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.4, x = Math.cos(a) * 12, z = Math.sin(a) * 12; arena.add(mesh(new THREE.CylinderGeometry(0.5, 0.65, 4.5, 8), lam(0x3a4668), x, 2.2, z), mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff6b3d : 0x4fb3ff }), x, 4.9, z)); }
    const cols = [0xffcf45, 0x4fb3ff, 0xff6b8b, 0x8ce99a, 0xc77dff, 0xffffff];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 46; i++) { const a = (i / 46) * Math.PI * 2, rad = 16 + row * 2.2; arena.add(mesh(new THREE.SphereGeometry(0.32, 6, 5), lam(cols[(i + row) % 6]), Math.cos(a) * rad, 1.1 + row * 0.8 + r() * 0.25, Math.sin(a) * rad)); }
    arena.add(mesh(new THREE.CylinderGeometry(14.5, 14.5, 0.8, 40, 1, true), new THREE.MeshLambertMaterial({ color: 0x1c2640, side: THREE.DoubleSide }), 0, 0.4, 0));
    const l1 = new THREE.PointLight(0xff9a55, 0.9, 40); l1.position.set(-8, 7, 4); const l2 = new THREE.PointLight(0x55aaff, 0.9, 40); l2.position.set(8, 7, -4); arena.add(l1, l2);
    arena.visible = false;
  }
  function showScene(name) {
    const m = name === "meadow";
    meadow.visible = m; arena.visible = !m; zoneG.visible = false;
    scene.background = new THREE.Color(m ? 0x8fd0ff : 0x0b1120); scene.fog = new THREE.Fog(m ? 0x8fd0ff : 0x0b1120, m ? 38 : 24, m ? 90 : 60);
    trainer.visible = true; rivalT.visible = false; camSnap = true;
    if (!m) { trainer.position.set(-7, 0, 3); trainer.rotation.y = Math.PI / 2; if (mode === "cs") { rivalT.visible = true; rivalT.position.set(7, 0, -3); rivalT.rotation.y = -Math.PI / 2; } else trainer.visible = false; }
  }
  const inGrassFree = (x, z) => !(Math.abs(x) > 29 || Math.abs(z) > 29 || COL.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.4) ** 2));

  /* ---------- setup ---------- */
  function setup(cb) {
    if (built) return cb(); built = true; injectCSS();
    $("adventure-page").innerHTML = `<div id="av-3d"></div>
      <div id="av-top"><button class="av-btn ghost" id="av-back">← BACK</button><div id="av-title"></div><span class="av-pill" id="av-res"></span></div>
      <div id="av-hud" hidden></div><canvas id="av-map" width="224" height="224" hidden></canvas><div id="av-feed"></div><div id="av-msg"></div>
      <div id="av-bottom"><div id="av-team"></div><div id="av-pad" hidden><button class="av-btn u" data-k="up">▲</button><button class="av-btn l" data-k="left">◀</button><button class="av-btn d" data-k="down">▼</button><button class="av-btn r" data-k="right">▶</button></div></div>
      <div id="av-battle" hidden><div class="av-cards"><div class="av-card" id="av-mecard"></div><div class="av-card foe" id="av-foecard"></div></div>
        <div class="av-panel"><div id="av-log"></div><div class="av-acts">
          <button class="av-btn" id="av-a1">⚔ Attack<small>Basic hit</small></button><button class="av-btn" id="av-a2">✦ Special<small>1.7× damage</small></button>
          <button class="av-btn ghost" id="av-a3">⚪ Poké Ball<small></small></button><button class="av-btn ghost" id="av-a4">🏃 Run<small>Escape</small></button>
          <button class="av-btn ghost" id="av-a5" style="grid-column:1/-1">⇄ Swap creature</button></div></div></div>
      <div id="av-float"></div><div id="av-modal" hidden></div>`;
    $("av-back").onclick = onBack;
    document.querySelectorAll("#av-pad button").forEach((b) => { const k = b.dataset.k; b.addEventListener("pointerdown", (e) => { e.preventDefault(); pad[k] = true; }); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => { pad[k] = false; })); });
    [["a1", "atk"], ["a2", "sp"], ["a3", "ball"], ["a4", "run"], ["a5", "swap"]].forEach(([id, k]) => { $("av-" + id).onclick = () => act(k); });
    const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = () => { THREE = window.THREE; init3d(); cb(); };
    s.onerror = () => { built = false; $("av-msg").textContent = "Couldn’t load the 3D engine — check your connection and try again."; };
    document.head.appendChild(s);
  }
  function init3d() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    $("av-3d").appendChild(renderer.domElement);
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(52, 1, 0.1, 160);
    trainer = makeTrainer(0xd9363e, 0xffffff); rivalT = makeTrainer(0x3d6bff, 0x222a44); scene.add(trainer, rivalT);
    buildWorld(); addEventListener("resize", resize);
  }
  function resize() { const p = $("adventure-page"); if (!renderer || !p) return; const w = p.clientWidth || innerWidth, h = p.clientHeight || innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }

  /* ---------- UI helpers ---------- */
  const say = (s) => { $("av-msg").textContent = s || ""; };
  const log = (s) => { $("av-log").textContent = s; };
  function modal(html, bind) { const m = $("av-modal"); m.innerHTML = '<div class="av-sheet">' + html + "</div>"; m.hidden = false; if (bind) bind(m); }
  const closeModal = () => { $("av-modal").hidden = true; };
  function setHud(html) { const h = $("av-hud"); h.hidden = !html; h.innerHTML = html || ""; }
  function feed(s) { const f = $("av-feed"), d = document.createElement("div"); d.className = "av-feedln"; d.textContent = s; f.appendChild(d); while (f.children.length > 4) f.firstChild.remove(); setTimeout(() => d.remove(), 5000); }
  function float(h, txt, cls) {
    if (!h || !camera) return; const v = new THREE.Vector3(h.position.x, 2.6 * (h.userData.s / 2.1), h.position.z).project(camera);
    const p = $("adventure-page"), d = document.createElement("div"); d.className = "av-fl " + (cls || ""); d.textContent = txt;
    d.style.left = ((v.x * 0.5 + 0.5) * p.clientWidth) + "px"; d.style.top = ((-v.y * 0.5 + 0.5) * p.clientHeight) + "px"; $("av-float").appendChild(d); setTimeout(() => d.remove(), 950);
  }
  const hpCls = (c) => { const f = c.hp / c.max; return f < 0.25 ? "low" : f < 0.55 ? "mid" : ""; };
  function refresh() {
    let c = 0; try { c = coins; } catch (e) {}
    $("av-res").textContent = "🥮 " + c.toLocaleString() + "  ·  ⚪ " + ballCount();
    $("av-team").innerHTML = G && !B ? G.squad.map((m, i) => `<div class="av-chip${i === G.lead && m.hp > 0 ? " lead" : ""}${m.hp <= 0 ? " down" : ""}"><img src="${ART + m.id}.png" alt=""><div><b>${m.n}</b><span class="av-bar"><u class="${hpCls(m)}" style="width:${Math.max(0, m.hp / m.max * 100)}%"></u></span></div></div>`).join("") : "";
  }
  const showPad = (v) => { $("av-pad").hidden = !v; };

  /* ---------- menu ---------- */
  function menu() {
    runId++; mode = null; G = null; clearBattle(); clearDyn(); showScene("meadow");
    P.x = 0; P.z = 24; P.rot = Math.PI; setPartner(true, [{ ...mk(POOL[0]) }]); setHud(""); showPad(false); $("av-map").hidden = true; $("av-title").textContent = "ADVENTURE"; $("adventure-page").classList.remove("danger"); say(""); refresh();
    const S = A.s, card = (id, ic, nm, ds, st, c) => `<button class="av-mode" data-m="${id}" style="--c:${c}"><div class="ic">${ic}</div><div><b>${nm}</b><span>${ds}</span><i>${st}</i></div></button>`;
    modal(`<h2>CHOOSE YOUR ADVENTURE</h2><p>Your captured Pokémon fight for you. Rewards go straight to your coins and Poké Balls.</p><div class="av-modes">
      ${card("survival", "🔥", "SURVIVAL ZONE", "10 trainers, one shrinking storm. Grab loot, dodge the zone and be the last one standing.", "🏆 " + S.booyah + " BOOYAH · BEST #" + (S.best || "—"), "#ff6b3d")}
      ${card("cs", "⚔️", "CLASH SQUAD", "First to 3 round wins. Beat rival squads and spend round credits between rounds.", "🏆 " + S.cs + " MATCHES WON", "#4fb3ff")}
      ${card("lw", "🐺", "LONE WOLF", "One creature. No balls, no swaps. Survive 5 duels against ever-tougher opponents.", "🏆 BEST " + S.lw + " / 5 DUELS", "#c77dff")}</div>`, (m) => {
      m.querySelectorAll(".av-mode").forEach((b) => { b.onclick = () => { closeModal(); ({ survival: startSurvival, cs: startCS, lw: startLW })[b.dataset.m](); }; });
    });
  }
  function onBack() {
    if (B && B.lock) return;
    if (mode) { menu(); return; }
    close();
  }

  /* ---------- partner / dynamic ---------- */
  let dyn = [];
  function clearDyn() { dyn.forEach((o) => scene.remove(o)); dyn = []; }
  function setPartner(force, squad) {
    const m = squad ? squad[0] : me(); if (!m) return;
    if (!force && partnerH && partnerH.userData.key === m.s) return;
    const pos = partnerH ? partnerH.position.clone() : new THREE.Vector3(P.x + 1.5, 0, P.z + 1.5);
    if (partnerH) scene.remove(partnerH);
    partnerH = makeMon(m, 2.1); partnerH.position.copy(pos); scene.add(partnerH);
  }
  function me() { if (!G) return null; const s = G.squad; if (s[G.lead] && s[G.lead].hp > 0) return s[G.lead]; const i = s.findIndex((c) => c.hp > 0); if (i < 0) return null; G.lead = i; return s[i]; }

  /* ---------- battle core ---------- */
  function clearBattle() { if (foeH && (!B || !B.o.h)) scene.remove(foeH); foeH = null; B = null; $("av-battle").hidden = true; $("av-bottom").style.display = ""; }
  function startBattle(foe, o) {
    const m = me(); if (!m) return;
    B = { foe, o, lock: false, turn: 0, mePos: o.mePos, foePos: o.foePos };
    if (o.h) foeH = o.h; else { foeH = makeMon(foe, foe.boss ? 3.6 : 2.1); foeH.position.copy(o.foePos); scene.add(foeH); }
    foeH.userData.sink = false; if (!o.h) foeH.userData.pop = 0;
    setPartner(); partnerH.userData.pop = 0.4;
    $("av-battle").hidden = false; $("av-bottom").style.display = "none"; showPad(false);
    log(foe.boss ? "The final rival " + foe.n + " blocks your path!" : (o.intro || "A wild " + foe.n + " appeared!")); ui();
  }
  function types(c) { return c.t.map((x) => `<span class="av-ty" style="background:#${(TC[x] || 0x667788).toString(16).padStart(6, "0")}">${x.toUpperCase()}</span>`).join(""); }
  function ui() {
    const m = me(), f = B && B.foe; if (!m || !f) return;
    $("av-mecard").innerHTML = `<div class="nm">${m.n}<small>${m.hp}/${m.max}</small></div><span class="hp"><i style="width:${m.hp / m.max * 100}%"></i></span><div class="av-types">${types(m)}</div>`;
    $("av-foecard").innerHTML = `<div class="nm">${f.boss ? "👑 " : ""}${f.n}<small>${f.hp}/${f.max}</small></div><span class="hp"><i style="width:${f.hp / f.max * 100}%"></i></span><div class="av-types">${types(f)}</div>`;
    const o = B.o; $("av-a2").disabled = m.cd > 0; $("av-a2").innerHTML = "✦ Special<small>" + (m.cd > 0 ? "ready in " + m.cd : "1.7× damage") + "</small>";
    $("av-a3").hidden = !o.ball; $("av-a3").disabled = !!f.boss || ballCount() < 1; $("av-a3").querySelector("small").textContent = ballCount() + " left";
    $("av-a4").hidden = !o.run; $("av-a4").disabled = !!f.boss; $("av-a5").hidden = !o.swap || G.squad.filter((c) => c.hp > 0).length < 2; refresh();
  }
  function dmg(a, d, mult) { const e = eff(a.t[0], d); return { v: e === 0 ? 0 : Math.max(1, Math.round(a.a * (0.8 + Math.random() * 0.4) * mult * e)), e }; }
  const effTxt = (e) => (e === 0 ? " — no effect!" : e > 1 ? " — super effective!" : e < 1 ? " — not very effective." : ".");
  function lungeTo(h, from, to) { const dx = to.x - from.x, dz = to.z - from.z, l = Math.hypot(dx, dz) || 1; h.userData.lx = dx / l; h.userData.lz = dz / l; h.userData.lunge = 0.0001; }
  function act(kind) {
    if (!B || B.lock) return; const m = me(); if (!m) return; const f = B.foe, o = B.o;
    if (kind === "run") { if (!o.run || f.boss) return; if (Math.random() < 0.65) { log("Got away safely!"); return endBattle("run", 500); } log("Couldn’t escape!"); }
    else if (kind === "swap") { const alt = G.squad.find((c, i) => c.hp > 0 && i !== G.lead); if (!alt) return; G.lead = G.squad.indexOf(alt); setPartner(); log("Go, " + alt.n + "!"); }
    else if (kind === "ball") {
      if (!o.ball || f.boss) return; if (!spendBall()) { log("You’re out of Poké Balls!"); return; }
      if (Math.random() < Math.min(0.9, 0.12 + 0.75 * (1 - f.hp / f.max)) * (f.k === 3 ? 0.6 : 1)) {
        try { if (!isCaptured(f.s)) capturePokemon({ name: f.s, id: f.id, types: f.t }, "pokeball"); } catch (e) {}
        f.cd = 0; f.hp = Math.max(1, Math.round(f.max * 0.6)); if (G.squad.length < 6) G.squad.push(f);
        log("Gotcha! " + f.n + " joined your squad and your Pokédex!"); float(foeH, "GOTCHA!", "y"); foeH.userData.sink = true; return endBattle("caught", 1200);
      }
      log("It broke free!"); float(foeH, "BROKE FREE", "r");
    } else {
      if (kind === "sp") { if (m.cd > 0) return; m.cd = o.cd || 3; }
      const r = dmg(m, f, kind === "sp" ? 1.7 : 1); f.hp = Math.max(0, f.hp - r.v); lungeTo(partnerH, partnerH.position, foeH.position); foeH.userData.flash = 0.25; foeH.userData.mat.color.set(0xff7070);
      float(foeH, r.e === 0 ? "NO EFFECT" : "-" + r.v, r.e > 1 ? "y" : ""); log(m.n + (kind === "sp" ? " unleashes a special" : " attacks") + " for " + r.v + effTxt(r.e));
      if (f.hp <= 0) { foeH.userData.sink = true; return endBattle("win", 1300); }
    }
    ui(); foeTurn();
  }
  function foeTurn() {
    B.lock = true;
    later(() => {
      if (!B) return; B.turn++; G.squad.forEach((c) => { c.cd = Math.max(0, (c.cd || 0) - 1); });
      const m = me(), f = B.foe, big = f.boss && B.turn % 4 === 0, r = dmg(f, m, big ? 1.7 : f.boss ? 1.05 : 0.9);
      m.hp = Math.max(0, m.hp - r.v); lungeTo(foeH, foeH.position, partnerH.position); partnerH.userData.flash = 0.25; partnerH.userData.mat.color.set(0xff7070);
      float(partnerH, r.e === 0 ? "NO EFFECT" : "-" + r.v, "r");
      log(f.n + (big ? " unleashes Psystrike" : " hits " + m.n) + " for " + r.v + effTxt(r.e) + (m.hp <= 0 ? " " + m.n + " fainted!" : ""));
      B.lock = false; ui();
      if (!me()) { B.lock = true; later(() => endBattle("lose", 0), 1000); } else if (m.hp <= 0) setPartner();
    }, 650);
  }
  function endBattle(res, ms) {
    if (!B) return; B.lock = true; const o = B.o, fp = B.foePos.clone(), cb = o.done;
    later(() => {
      if (!(res === "run" && o.h) && foeH) scene.remove(foeH);
      foeH = null; B = null; $("av-battle").hidden = true; $("av-bottom").style.display = ""; refresh();
      if (cb) cb(res, fp);
    }, ms);
  }

  /* ============================================================
     MODE 1 — SURVIVAL ZONE
  ============================================================ */
  const PH = [{ r: 20, wait: 18, shrink: 12 }, { r: 13, wait: 16, shrink: 12 }, { r: 7, wait: 14, shrink: 10 }, { r: 2.8, wait: 12, shrink: 10 }];
  function startSurvival() {
    runId++; mode = "survival"; showScene("meadow"); clearDyn();
    G = { squad: siteTeam().slice(0, 4), lead: 0, kills: 0, roamers: [], crates: [], phase: 0, state: "wait", timer: 20, zone: { x: 0, z: 0, r: 28 }, from: null, to: null, tick: 0, over: false, bossed: false };
    P.x = 0; P.z = 24; P.rot = Math.PI; setPartner(true); zoneG.visible = true; nextZone(); G.timer = 20;
    for (let i = 0; i < 9; i++) spawnRoamer();
    for (let i = 0; i < 9; i++) spawnCrate();
    $("av-title").textContent = "SURVIVAL ZONE"; $("av-map").hidden = false; showPad(true); $("av-feed").innerHTML = "";
    say("Move with WASD / arrows / pad. Touch a rival to battle, grab 📦 loot, stay inside the zone!"); later(() => say(""), 7000); refresh();
  }
  function nextZone() {
    const ph = PH[G.phase]; if (!ph) { G.state = "final"; G.to = null; return; }
    const z = G.zone, off = Math.max(0, z.r - ph.r) * 0.75, a = Math.random() * 6.28, d = Math.random() * off;
    G.from = { x: z.x, z: z.z, r: z.r }; G.to = { x: z.x + Math.cos(a) * d, z: z.z + Math.sin(a) * d, r: ph.r }; G.state = "wait"; G.timer = ph.wait;
  }
  function spawnRoamer() {
    const p = rnd(POOL.filter((x) => x.k <= (Math.random() < 0.35 ? 2 : 1))), c = mk(p, 0.78 + Math.random() * 0.22);
    let x, z, n = 0; do { x = (Math.random() - 0.5) * 50; z = (Math.random() - 0.5) * 50; n++; } while ((Math.hypot(x - P.x, z - P.z) < 14 || !inGrassFree(x, z)) && n < 40);
    const h = makeMon(c, 1.9), ring = mesh(new THREE.RingGeometry(0.7, 0.85, 24), new THREE.MeshBasicMaterial({ color: 0xff3b3b, side: THREE.DoubleSide }), 0, 0.06, 0); ring.rotation.x = -Math.PI / 2; ring.visible = false; h.add(ring);
    h.position.set(x, 0, z); scene.add(h); dyn.push(h); G.roamers.push({ c, h, ring, x, z, tx: x, tz: z, wait: 0, chase: false, cool: 0, name: rnd(RIVALS) + "_" + (10 + Math.floor(Math.random() * 90)) });
  }
  function spawnCrate() {
    let x, z, n = 0; do { x = (Math.random() - 0.5) * 50; z = (Math.random() - 0.5) * 50; n++; } while (!inGrassFree(x, z) && n < 40);
    const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), lam(0xffb92e, { emissive: 0x553300 }), 0, 0.6, 0), mesh(new THREE.BoxGeometry(0.95, 0.18, 0.95), lam(0xc4821a), 0, 0.6, 0));
    const beam = mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.45 }), 0, 3.4, 0); g.add(beam);
    g.position.set(x, 0, z); scene.add(g); dyn.push(g); G.crates.push({ g, x, z });
  }
  function eliminate(n) {
    while (n-- > 0 && G.roamers.length > 1) { const i = Math.floor(Math.random() * G.roamers.length), r = G.roamers.splice(i, 1)[0]; scene.remove(r.h); feed("☠ " + r.name + " was lost to the storm"); }
  }
  function surv(dt) {
    let dx = 0, dz = 0;
    if (held.ArrowLeft || held.a || pad.left) dx -= 1; if (held.ArrowRight || held.d || pad.right) dx += 1;
    if (held.ArrowUp || held.w || pad.up) dz -= 1; if (held.ArrowDown || held.s || pad.down) dz += 1;
    P.moving = !!(dx || dz);
    if (P.moving) { const l = Math.hypot(dx, dz), st = 6 * dt, nx = P.x + (dx / l) * st, nz = P.z + (dz / l) * st; if (!blocked(nx, P.z)) P.x = nx; if (!blocked(P.x, nz)) P.z = nz; P.rot = Math.atan2(dx, dz); }
    const z = G.zone;
    if (G.state === "wait") { G.timer -= dt; if (G.timer <= 0) { G.state = "shrink"; G.timer = PH[G.phase].shrink; feed("⚠ The zone is closing!"); eliminate(2); } }
    else if (G.state === "shrink") { G.timer -= dt; const u = Math.min(1, 1 - G.timer / PH[G.phase].shrink); z.x = G.from.x + (G.to.x - G.from.x) * u; z.z = G.from.z + (G.to.z - G.from.z) * u; z.r = G.from.r + (G.to.r - G.from.r) * u; if (G.timer <= 0) { G.phase++; nextZone(); } }
    zoneWall.position.set(z.x, 8, z.z); zoneWall.scale.set(z.r, 1, z.r); zoneRing.position.set(z.x, 0.08, z.z); zoneRing.scale.set(z.r, z.r, 1);
    if (G.to) { nextRing.visible = true; nextRing.position.set(G.to.x, 0.09, G.to.z); nextRing.scale.set(G.to.r, G.to.r, 1); } else nextRing.visible = false;
    const out = Math.hypot(P.x - z.x, P.z - z.z) > z.r; $("adventure-page").classList.toggle("danger", out);
    if (out) { G.tick += dt; if (G.tick >= 1) { G.tick = 0; const d = Math.round(2 + G.phase * 1.5); G.squad.forEach((c) => { if (c.hp > 0) c.hp = Math.max(0, c.hp - d); }); float(partnerH, "-" + d + " STORM", "r"); me(); refresh(); if (!G.squad.some((c) => c.hp > 0)) return endSurv(false); setPartner(); } } else G.tick = 0;
    if (!G.bossed && G.roamers.length === 1) { G.bossed = true; const r = G.roamers[0]; scene.remove(r.h); r.c = mk(BOSS, 1.5); r.c.boss = true; r.h = makeMon(r.c, 3.6); r.h.position.set(r.x, 0, r.z); scene.add(r.h); dyn.push(r.h); r.ring = null; feed("👑 The final rival Mewtwo has appeared!"); }
    G.roamers.forEach((r) => {
      tickMon(r.h, dt); r.cool = Math.max(0, r.cool - dt); const d = Math.hypot(P.x - r.x, P.z - r.z); let tx, tz, sp;
      if (d < 9 && r.cool <= 0) { tx = P.x; tz = P.z; sp = r.c.boss ? 3.5 : 3; r.chase = true; }
      else { r.chase = false; r.wait -= dt; if (r.wait <= 0 || Math.hypot(r.tx - r.x, r.tz - r.z) < 0.6) { const a = Math.random() * 6.28, rr = Math.random() * z.r * 0.8; r.tx = z.x + Math.cos(a) * rr; r.tz = z.z + Math.sin(a) * rr; r.wait = 2 + Math.random() * 3; } tx = r.tx; tz = r.tz; sp = 1.5; }
      const ddx = tx - r.x, ddz = tz - r.z, l = Math.hypot(ddx, ddz) || 1;
      if (l > 0.3) { const nx = r.x + (ddx / l) * sp * dt, nz = r.z + (ddz / l) * sp * dt; if (inGrassFree(nx, nz)) { r.x = nx; r.z = nz; } else r.wait = 0; face(r.h, ddx > 0); }
      r.h.position.set(r.x, 0, r.z); if (r.ring) r.ring.visible = r.chase;
      if (d < 1.9 && r.cool <= 0 && !B && !G.over) engage(r);
    });
    for (let i = G.crates.length - 1; i >= 0; i--) { const c = G.crates[i]; c.g.rotation.y += dt * 1.5; if (Math.hypot(P.x - c.x, P.z - c.z) < 1.5) { scene.remove(c.g); G.crates.splice(i, 1); loot(); } }
    setHud(`<span class="av-hchip">👥 <b>${G.roamers.length + 1}</b> ALIVE</span><span class="av-hchip">☠ <b>${G.kills}</b> KILLS</span><span class="av-hchip${out ? " warn" : ""}">${out ? "⚠ OUTSIDE THE ZONE" : G.state === "final" ? "FINAL ZONE" : G.state === "shrink" ? "ZONE CLOSING" : "ZONE " + (G.phase + 1) + " IN <b>" + Math.ceil(G.timer) + "s</b>"}</span>`);
    drawMap();
  }
  function loot() {
    const k = rnd(["ball", "heal", "coins", "ball"]);
    if (k === "ball") { giveBalls(2); say("📦 +2 Poké Balls"); } else if (k === "heal") { G.squad.forEach((c) => { if (c.hp > 0) c.hp = Math.min(c.max, c.hp + Math.round(c.max * 0.3)); }); say("📦 Squad healed +30%"); } else { addCoins(40); say("📦 +40 coins"); }
    later(() => say(""), 2500); refresh();
  }
  function engage(r) {
    const dx = r.x - P.x, dz = r.z - P.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    const foePos = new THREE.Vector3(P.x + ux * 4.8, 0, P.z + uz * 4.8), mePos = new THREE.Vector3(P.x + ux * 1.6 - uz * 1.1, 0, P.z + uz * 1.6 + ux * 1.1);
    r.x = foePos.x; r.z = foePos.z; r.chase = false; if (r.ring) r.ring.visible = false; P.rot = Math.atan2(ux, uz); face(r.h, P.x > r.x);
    startBattle(r.c, { mePos, foePos, ball: !r.c.boss, run: !r.c.boss, swap: true, h: r.h, intro: r.name + " challenges you with " + r.c.n + "!", done: (res, fp) => survDone(res, r, fp) });
  }
  function survDone(res, r, fp) {
    if (res === "lose") return endSurv(false);
    if (res === "run") { r.x = fp.x; r.z = fp.z; r.cool = 4; const a = Math.atan2(P.x - fp.x, P.z - fp.z); P.x += Math.sin(a) * 3; P.z += Math.cos(a) * 3; return setPartner(); }
    const i = G.roamers.indexOf(r); if (i >= 0) G.roamers.splice(i, 1); scene.remove(r.h); G.kills++;
    feed("☠ You " + (res === "caught" ? "caught " : "eliminated ") + r.name + "’s " + r.c.n); addCoins(25); const m = me(); if (m) m.hp = Math.min(m.max, m.hp + 8);
    setPartner(); refresh(); if (r.c.boss) endSurv(true);
  }
  function endSurv(win) {
    if (G.over) return; G.over = true; const rank = win ? 1 : G.roamers.length + 1, k = G.kills;
    const gain = win ? 400 + k * 30 : Math.max(20, (11 - rank) * 15) + k * 30; addCoins(gain); if (win || rank <= 3) giveBalls(win ? 3 : 1);
    const S = A.s; S.runs++; S.kills += k; if (win) S.booyah++; S.best = S.best ? Math.min(S.best, rank) : rank; save();
    setHud(""); showPad(false); $("adventure-page").classList.remove("danger"); $("av-map").hidden = true; zoneG.visible = false;
    later(() => modal(`<h2 class="${win ? "win" : "lose"}">${win ? "🏆 BOOYAH!" : "ELIMINATED"}</h2><p>${win ? "You are the last trainer standing!" : "Better luck next time — you finished in the top " + rank + "."}</p>
      <div class="av-stats"><div class="av-stat"><small>RANK</small><b>#${rank}</b></div><div class="av-stat"><small>KILLS</small><b>${k}</b></div><div class="av-stat"><small>COINS</small><b>+${gain}</b></div></div>${win || rank <= 3 ? "<p>🎁 Bonus: Poké Balls added to your bag.</p>" : ""}
      <div class="av-row2"><button class="av-btn ghost" data-a="menu">MENU</button><button class="av-btn" data-a="again">PLAY AGAIN</button></div>`, (m) => { m.querySelector("[data-a=menu]").onclick = menu; m.querySelector("[data-a=again]").onclick = () => { closeModal(); startSurvival(); }; }), 900);
  }
  function blocked(x, z) { return !inGrassFree(x, z); }
  function drawMap() {
    const c = $("av-map"), x = c.getContext("2d"), S = c.width, k = S / 64, X = (v) => (v + 32) * k, z = G.zone;
    x.clearRect(0, 0, S, S); x.fillStyle = "rgba(10,22,38,.9)"; x.fillRect(0, 0, S, S);
    x.save(); x.beginPath(); x.rect(0, 0, S, S); x.arc(X(z.x), X(z.z), z.r * k, 0, 6.283, true); x.fillStyle = "rgba(255,60,60,.3)"; x.fill("evenodd"); x.restore();
    x.strokeStyle = "#fff"; x.lineWidth = 2; x.beginPath(); x.arc(X(z.x), X(z.z), z.r * k, 0, 6.283); x.stroke();
    if (G.to) { x.strokeStyle = "rgba(120,200,255,.9)"; x.setLineDash([6, 5]); x.beginPath(); x.arc(X(G.to.x), X(G.to.z), G.to.r * k, 0, 6.283); x.stroke(); x.setLineDash([]); }
    x.fillStyle = "#ffcf45"; G.crates.forEach((q) => x.fillRect(X(q.x) - 3, X(q.z) - 3, 6, 6));
    G.roamers.forEach((r) => { x.fillStyle = r.c.boss ? "#c77dff" : "#ff5a5a"; x.beginPath(); x.arc(X(r.x), X(r.z), r.c.boss ? 6 : 4, 0, 6.283); x.fill(); });
    x.save(); x.translate(X(P.x), X(P.z)); x.rotate(-P.rot + Math.PI); x.fillStyle = "#5de4ff"; x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 6); x.lineTo(-5, 6); x.closePath(); x.fill(); x.restore();
  }

  /* ============================================================
     MODE 2 — CLASH SQUAD (first to 3 round wins)
  ============================================================ */
  const A_ME = () => new THREE.Vector3(-3.4, 0, 0.4), A_FOE = () => new THREE.Vector3(3.4, 0, -0.4);
  function startCS() {
    runId++; mode = "cs"; showScene("arena"); clearDyn(); showPad(false); $("av-map").hidden = true; $("av-title").textContent = "CLASH SQUAD";
    G = { squad: siteTeam().slice(0, 3), lead: 0, round: 1, w: 0, l: 0, credits: 300, boost: 0, queue: [], kills: 0, rival: "" };
    setPartner(true); partnerH.position.copy(A_ME()); face(partnerH, true); buyPhase("Get ready — first to 3 round wins!");
  }
  function csHud() { setHud(`<span class="av-hchip">ROUND <b>${G.round}</b></span><span class="av-hchip">YOU <b>${G.w}</b> – <b>${G.l}</b> RIVAL</span><span class="av-hchip">💳 <b>${G.credits}</b></span>`); }
  function buyPhase(banner) {
    csHud(); refresh();
    const items = [
      { id: "heal", ic: "💊", n: "Heal Squad", d: "Restore every living creature to full HP", c: 120, ok: () => G.squad.some((m) => m.hp > 0 && m.hp < m.max), fn: () => G.squad.forEach((m) => { if (m.hp > 0) m.hp = m.max; }) },
      { id: "rev", ic: "✨", n: "Revive", d: "Bring back fainted creatures at 50% HP", c: 150, ok: () => G.squad.some((m) => m.hp <= 0), fn: () => G.squad.forEach((m) => { if (m.hp <= 0) m.hp = Math.round(m.max / 2); }) },
      { id: "atk", ic: "💥", n: "Power Boost", d: "+3 attack for the whole squad (max 3×)", c: 100, ok: () => G.boost < 3, fn: () => { G.boost++; G.squad.forEach((m) => { m.a += 3; }); } },
    ];
    modal(`<h2>${G.w >= 3 || G.l >= 3 ? "" : "BUY PHASE"}</h2><p>${banner || ""}</p><div class="av-stats"><div class="av-stat"><small>ROUND</small><b>${G.round}/5</b></div><div class="av-stat"><small>SCORE</small><b>${G.w}–${G.l}</b></div><div class="av-stat"><small>CREDITS</small><b>${G.credits}</b></div></div>
      <div class="av-shop">${items.map((i) => `<div class="av-item"><span style="font-size:24px">${i.ic}</span><div><b>${i.n}</b><span>${i.d}</span></div><button class="av-btn" data-b="${i.id}" ${G.credits >= i.c && i.ok() ? "" : "disabled"}>💳 ${i.c}</button></div>`).join("")}</div>
      <div class="av-row2"><button class="av-btn ghost" data-a="menu">LEAVE</button><button class="av-btn" data-a="go">⚔ START ROUND ${G.round}</button></div>`, (m) => {
      m.querySelectorAll("[data-b]").forEach((b) => { b.onclick = () => { const it = items.find((x) => x.id === b.dataset.b); if (G.credits < it.c || !it.ok()) return; G.credits -= it.c; it.fn(); buyPhase(banner); }; });
      m.querySelector("[data-a=menu]").onclick = menu; m.querySelector("[data-a=go]").onclick = () => { closeModal(); startRound(); };
    });
  }
  function startRound() {
    const lv = 0.85 + 0.11 * (G.round - 1), tier = G.round <= 2 ? [1, 1, 2] : G.round <= 4 ? [2, 2, 1] : [2, 3, 2]; G.rival = "Squad " + rnd(RIVALS);
    G.queue = tier.map((k) => mk(rnd(POOL.filter((p) => p.k === k)), lv + Math.random() * 0.1)); csHud(); setPartner(); sendNext(true);
  }
  function sendNext(first) {
    const foe = G.queue.shift(); if (!foe) return; if (!me()) return roundEnd(false);
    setPartner(); partnerH.position.copy(A_ME()); face(partnerH, true);
    startBattle(foe, { mePos: A_ME(), foePos: A_FOE(), swap: true, intro: (first ? G.rival + " enters the arena! " : "") + "Rival sends out " + foe.n + "!", done: (res) => { if (res === "win") { G.kills++; const m = me(); if (m) m.hp = Math.min(m.max, m.hp + 6); if (G.queue.length) later(() => sendNext(false), 600); else roundEnd(true); } else roundEnd(false); } });
    face(foeH, false);
  }
  function roundEnd(won) {
    if (won) G.w++; else G.l++; G.credits += won ? 150 : 100; G.squad.forEach((m) => { m.cd = 0; }); csHud();
    if (G.w >= 3 || G.l >= 3) {
      const win = G.w >= 3, gain = (win ? 400 : 60) + G.w * 25; addCoins(gain); if (win) { giveBalls(2); A.s.cs++; save(); } setHud("");
      return later(() => modal(`<h2 class="${win ? "win" : "lose"}">${win ? "🏆 MATCH WON!" : "MATCH LOST"}</h2><p>Final score ${G.w} – ${G.l}.</p><div class="av-stats"><div class="av-stat"><small>ROUNDS WON</small><b>${G.w}</b></div><div class="av-stat"><small>KOs</small><b>${G.kills}</b></div><div class="av-stat"><small>COINS</small><b>+${gain}</b></div></div>${win ? "<p>🎁 +2 Poké Balls</p>" : ""}<div class="av-row2"><button class="av-btn ghost" data-a="menu">MENU</button><button class="av-btn" data-a="again">REMATCH</button></div>`, (m) => { m.querySelector("[data-a=menu]").onclick = menu; m.querySelector("[data-a=again]").onclick = () => { closeModal(); startCS(); }; }), 500);
    }
    G.round++; later(() => buyPhase(won ? "✅ Round won! +150 credits." : "❌ Round lost. +100 credits."), 500);
  }

  /* ============================================================
     MODE 3 — LONE WOLF (5 duels, one creature)
  ============================================================ */
  function startLW() {
    runId++; mode = "lw"; showScene("arena"); clearDyn(); showPad(false); $("av-map").hidden = true; setHud(""); $("av-title").textContent = "LONE WOLF"; G = null;
    const team = siteTeam();
    modal(`<h2>PICK YOUR WOLF</h2><p>One creature, no Poké Balls, no swapping, no running. Win 5 duels in a row. You heal 30% after each win.</p><div class="av-grid">${team.map((c, i) => `<button class="av-pick" data-i="${i}"><img src="${ART + c.id}.png" alt="">${c.n}<small>HP ${c.max} · ATK ${c.a}</small></button>`).join("")}</div><div class="av-row2"><button class="av-btn ghost" data-a="menu">BACK</button></div>`, (m) => {
      m.querySelectorAll(".av-pick").forEach((b) => { b.onclick = () => { closeModal(); lwBegin(team[+b.dataset.i]); }; });
      m.querySelector("[data-a=menu]").onclick = menu;
    });
  }
  const LW_LV = [0.9, 1.0, 1.1, 1.25, 1.45], LW_K = [1, 1, 2, 2, 3];
  function lwBegin(c) { c.hp = c.max; c.cd = 0; G = { squad: [c], lead: 0, stage: 0 }; setPartner(true); partnerH.position.copy(A_ME()); face(partnerH, true); refresh(); lwDuel(); }
  function lwDuel() {
    const i = G.stage, foe = mk(rnd(POOL.filter((p) => p.k === LW_K[i])), LW_LV[i]);
    setHud(`<span class="av-hchip">DUEL <b>${i + 1}</b> / 5</span><span class="av-hchip">${i === 4 ? "👑 ALPHA" : "OPPONENT " + (i + 1)}</span>`);
    setPartner(); partnerH.position.copy(A_ME()); face(partnerH, true);
    startBattle(foe, { mePos: A_ME(), foePos: A_FOE(), cd: 2, intro: (i === 4 ? "The Alpha " : "Duelist ") + "steps in with " + foe.n + "!", done: (res) => {
      if (res === "win") { G.stage++; const m = G.squad[0]; m.hp = Math.min(m.max, m.hp + Math.round(m.max * 0.3)); m.cd = 0; if (G.stage >= 5) return lwOver(true); toast({ icon: "🐺", title: "Duel " + G.stage + " won!", message: "+30% HP restored" }); later(lwDuel, 700); }
      else lwOver(false);
    } }); face(foeH, false);
  }
  function lwOver(win) {
    const n = G.stage, gain = n * 50 + (win ? 500 : 0); addCoins(gain); if (win) giveBalls(2); if (n > A.s.lw) A.s.lw = n; save(); setHud("");
    later(() => modal(`<h2 class="${win ? "win" : "lose"}">${win ? "🏆 LONE WOLF!" : "DEFEATED"}</h2><p>${win ? "You cleared all 5 duels with a single creature." : "You fell in duel " + (n + 1) + "."}</p><div class="av-stats"><div class="av-stat"><small>DUELS WON</small><b>${n}/5</b></div><div class="av-stat"><small>COINS</small><b>+${gain}</b></div><div class="av-stat"><small>BEST</small><b>${A.s.lw}/5</b></div></div><div class="av-row2"><button class="av-btn ghost" data-a="menu">MENU</button><button class="av-btn" data-a="again">TRY AGAIN</button></div>`, (m) => { m.querySelector("[data-a=menu]").onclick = menu; m.querySelector("[data-a=again]").onclick = () => { closeModal(); startLW(); }; }), 700);
  }

  /* ---------- loop ---------- */
  function frame(now) {
    if (!running) return; const p = $("adventure-page"); if (!p || p.classList.contains("hidden")) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt; update(dt); renderer.render(scene, camera); requestAnimationFrame(frame);
  }
  function update(dt) {
    [partnerH, foeH].forEach((h) => h && tickMon(h, dt));
    meadow.userData.clouds.forEach((c) => { c.position.x += dt * 0.6; if (c.position.x > 55) c.position.x = -55; });
    if (mode === "survival" && !G.over && !B && !modalOpen()) surv(dt); else if (mode === "survival") { G.roamers.forEach((r) => { if (!B || r.h !== foeH) tickMon(r.h, dt); }); if (G.state !== "final" && B) drawMap(); }
    if (mode === "survival" || mode === null) { trainer.position.set(P.x, 0, P.z); trainer.rotation.y = P.rot; }
    const lg = trainer.userData.legs, sw = P.moving && !B ? Math.sin(t * 12) * 0.5 : 0; lg[0].rotation.x = sw; lg[1].rotation.x = -sw;
    rivalT.position.y = Math.sin(t * 2) * 0.03; trainer.position.y = mode === "cs" ? Math.sin(t * 2 + 1) * 0.03 : 0;
    if (partnerH) {
      if (B) { partnerH.position.lerp(B.mePos, 1 - Math.exp(-7 * dt)); face(partnerH, B.foePos.x > partnerH.position.x); if (foeH) { foeH.position.lerp(B.foePos, 1 - Math.exp(-7 * dt)); face(foeH, partnerH.position.x > foeH.position.x); } }
      else if (mode === "survival" || mode === null) {
        const tx = P.x - Math.sin(P.rot) * 1.7 + Math.cos(P.rot), tz = P.z - Math.cos(P.rot) * 1.7 - Math.sin(P.rot), ox = partnerH.position.x, oz = partnerH.position.z;
        partnerH.position.x += (tx - ox) * (1 - Math.exp(-5 * dt)); partnerH.position.z += (tz - oz) * (1 - Math.exp(-5 * dt));
        const mx = partnerH.position.x - ox; if (Math.abs(mx) > 0.002) face(partnerH, mx > 0);
      }
    }
    let cx, cy, cz, lx, ly, lz;
    if (mode === "survival" && B) { const mxp = (P.x + B.foePos.x) / 2, mzp = (P.z + B.foePos.z) / 2; cx = mxp; cy = 6.2; cz = mzp + 8.5; lx = mxp; ly = 1.3; lz = mzp; }
    else if (mode === "survival") { cx = P.x; cy = 9.5; cz = P.z + 11.5; lx = P.x; ly = 1; lz = P.z; }
    else if (mode) { cx = Math.sin(t * 0.3) * 1.2; cy = 6.2; cz = 12.8; lx = 0; ly = 1.4; lz = 0; }
    else { const a = t * 0.12; cx = P.x + Math.sin(a) * 11; cy = 5; cz = P.z + Math.cos(a) * 11; lx = P.x; ly = 1.5; lz = P.z; }
    const k = camSnap ? 1 : 1 - Math.exp(-4.5 * dt); camSnap = false;
    camera.position.x += (cx - camera.position.x) * k; camera.position.y += (cy - camera.position.y) * k; camera.position.z += (cz - camera.position.z) * k;
    camLook.x += (lx - camLook.x) * k; camLook.y += (ly - camLook.y) * k; camLook.z += (lz - camLook.z) * k; camera.lookAt(camLook.x, camLook.y, camLook.z);
  }

  /* ---------- open / close ---------- */
  function open() {
    A = load(); $("home-page").classList.add("hidden"); $("adventure-page").classList.remove("hidden");
    setup(() => { resize(); menu(); if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } });
  }
  function close() {
    running = false; runId++; save(); $("adventure-page").classList.add("hidden");
    if (typeof showHomeScreen === "function") showHomeScreen(); else $("home-page").classList.remove("hidden");
  }
  addEventListener("keydown", (e) => { const p = $("adventure-page"); if (!p || p.classList.contains("hidden")) return; held[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; if (e.key.startsWith("Arrow")) e.preventDefault(); });
  addEventListener("keyup", (e) => { held[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  addEventListener("blur", () => { Object.keys(held).forEach((k) => { held[k] = false; }); });
  document.addEventListener("DOMContentLoaded", () => { const b = $("btn-adventure"); if (b) b.onclick = open; });
  window.openAdventure = open;
})();