/* ============================================================
   ADVENTURE (3D) — STORM ROYALE
   20 trainers drop onto a huge 240 x 240 map. A storm closes in
   five phases, loot crates hide around the cottages, rivals roam
   and chase you, and the last rival is the Mewtwo boss. Be the
   last one standing for a BOOYAH!
   Uses the site's own coins, Poké Balls and captured Pokémon
   (globals from app.js). Three.js loads on demand. Drop-in file:
   all styles are injected from here.
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
  let A, THREE, renderer, scene, camera, meadow, zoneG, zoneWall, zoneRing, nextRing;
  let trainer, partnerH, foeH, mode = null, G = null, B = null;
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
@media(max-width:560px){.av-zbar{min-width:130px;padding:5px 8px 11px}.av-hbox{min-width:54px;padding:5px 7px}#av-map{width:104px;height:104px}.av-chip{min-width:128px}}
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
  const W = 120; // half-size of the map (240 x 240 units)
  const LAKES = [[-60, -45, 16], [65, 50, 18], [-25, 78, 11], [80, -70, 12], [-85, 55, 13]];
  const houses = [];
  const freeSpot = (x, z, pad) => !(LAKES.some(([lx, lz, lr]) => Math.hypot(x - lx, z - lz) < lr + pad + 1) || Math.hypot(x, z) < 10 || houses.some((h) => Math.hypot(x - h.x, z - h.z) < 6 + pad));
  function grassTex() {
    const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
    x.fillStyle = "#5fb84f"; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) { x.fillStyle = "hsla(" + (90 + Math.random() * 35) + ",55%," + (32 + Math.random() * 22) + "%,.55)"; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 5 + Math.random() * 4); }
    const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(70, 70); return tx;
  }
  function buildWorld() {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8a5a, 0.95));
    const sun = new THREE.DirectionalLight(0xfff2d0, 0.65); sun.position.set(14, 24, 10); scene.add(sun);
    let seed = 11; const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    meadow = new THREE.Group(); scene.add(meadow);
    const ground = mesh(new THREE.PlaneGeometry(W * 2 + 200, W * 2 + 200), lam(0xffffff, { map: grassTex() })); ground.rotation.x = -Math.PI / 2; meadow.add(ground);
    LAKES.forEach(([x, z, rad]) => {
      const shore = mesh(new THREE.CircleGeometry(rad + 1.2, 40), lam(0xe6d9a0), x, 0.03, z); shore.rotation.x = -Math.PI / 2;
      const water = mesh(new THREE.CircleGeometry(rad, 40), new THREE.MeshLambertMaterial({ color: 0x3fa7e8, transparent: true, opacity: 0.9 }), x, 0.06, z); water.rotation.x = -Math.PI / 2;
      meadow.add(shore, water); COL.push({ x, z, r: rad + 0.4 });
    });
    /* central ancient tower — the heart of the final zone */
    meadow.add(mesh(new THREE.CylinderGeometry(7, 7.6, 0.5, 32), lam(0x8d93a8), 0, 0.25, 0), mesh(new THREE.BoxGeometry(1.6, 8, 1.6), lam(0x4a6fd0, { emissive: 0x16306e }), 0, 4.2, 0), mesh(new THREE.OctahedronGeometry(0.9, 0), new THREE.MeshBasicMaterial({ color: 0x8fe6ff }), 0, 9.2, 0));
    COL.push({ x: 0, z: 0, r: 1.5 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, x = Math.cos(a) * 6.2, z = Math.sin(a) * 6.2; meadow.add(mesh(new THREE.CylinderGeometry(0.45, 0.55, 3.6, 8), lam(0xb6bbcc), x, 2.1, z)); COL.push({ x, z, r: 0.7 }); }
    /* cottages */
    const roofs = [0xc4483c, 0x3d6bb0, 0x7a5aa8, 0x2f8a5a];
    for (let i = 0, n = 0; i < 600 && n < 10; i++) {
      const x = (r() - 0.5) * 2 * (W - 14), z = (r() - 0.5) * 2 * (W - 14);
      if (!freeSpot(x, z, 4) || houses.some((h) => Math.hypot(x - h.x, z - h.z) < 34)) continue;
      const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(4.4, 2.8, 4.4), lam(0xf0e2c0), 0, 1.4, 0), mesh(new THREE.ConeGeometry(3.7, 2, 4), lam(roofs[n % 4]), 0, 3.8, 0), mesh(new THREE.BoxGeometry(0.95, 1.6, 0.1), lam(0x7a5230), 0, 0.8, 2.25), mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), lam(0x8fd0ff), 1.4, 1.6, 2.25));
      g.children[1].rotation.y = Math.PI / 4; g.position.set(x, 0, z); g.rotation.y = r() * 6.28; meadow.add(g); COL.push({ x, z, r: 3 }); houses.push({ x, z }); n++;
    }
    /* trees / rocks / flowers are instanced so a huge map stays fast */
    const dm = new THREE.Object3D(), col = new THREE.Color(), NT = 560;
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.3, 1.5, 6), lam(0x7a5230), NT);
    const leafG = new THREE.IcosahedronGeometry(1.25, 0), la = new THREE.InstancedMesh(leafG, lam(0xffffff, { flatShading: true }), NT), lb = new THREE.InstancedMesh(leafG, lam(0xffffff, { flatShading: true }), NT);
    let n = 0;
    for (let i = 0; i < 6000 && n < NT; i++) {
      const x = (r() - 0.5) * 2 * (W - 3), z = (r() - 0.5) * 2 * (W - 3); if (!freeSpot(x, z, 2)) continue; const s = 0.8 + r() * 0.8;
      dm.rotation.set(0, 0, 0); dm.scale.setScalar(s); dm.position.set(x, 0.75 * s, z); dm.updateMatrix(); trunk.setMatrixAt(n, dm.matrix);
      dm.rotation.y = r() * 6; dm.position.set(x, 2.2 * s, z); dm.updateMatrix(); la.setMatrixAt(n, dm.matrix);
      dm.scale.setScalar(0.75 * s); dm.position.set(x + 0.3 * s, 3.1 * s, z + 0.1 * s); dm.updateMatrix(); lb.setMatrixAt(n, dm.matrix);
      col.setHSL(0.29 + r() * 0.09, 0.5, 0.24 + r() * 0.1); la.setColorAt(n, col); lb.setColorAt(n, col); COL.push({ x, z, r: 0.9 * s }); n++;
    }
    [trunk, la, lb].forEach((m) => { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; meadow.add(m); });
    const NR = 110, rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.8, 0), lam(0x9a9aa8, { flatShading: true }), NR); n = 0;
    for (let i = 0; i < 1500 && n < NR; i++) { const x = (r() - 0.5) * 2 * (W - 3), z = (r() - 0.5) * 2 * (W - 3); if (!freeSpot(x, z, 1)) continue; const s = 0.6 + r() * 1.1; dm.rotation.set(0, r() * 6, 0); dm.scale.set(s, s * 0.8, s); dm.position.set(x, 0.4 * s, z); dm.updateMatrix(); rocks.setMatrixAt(n, dm.matrix); COL.push({ x, z, r: 0.8 * s }); n++; }
    rocks.count = n; rocks.instanceMatrix.needsUpdate = true; meadow.add(rocks);
    const NF = 1100, fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 5), lam(0xffffff), NF), fc = [0xff6b8b, 0xffd43b, 0xffffff, 0xc77dff, 0xff9e5a];
    for (let i = 0; i < NF; i++) { dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.position.set((r() - 0.5) * 2 * W, 0.14, (r() - 0.5) * 2 * W); dm.updateMatrix(); fl.setMatrixAt(i, dm.matrix); col.setHex(fc[i % 5]); fl.setColorAt(i, col); }
    fl.instanceMatrix.needsUpdate = true; fl.instanceColor.needsUpdate = true; meadow.add(fl);
    const mG = new THREE.ConeGeometry(1, 1, 6);
    for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2, d = W + 55 + r() * 12, h = 22 + r() * 26, w = 16 + r() * 12, o = mesh(mG, lam(0x6f8fb8, { flatShading: true }), Math.cos(a) * d, h / 2, Math.sin(a) * d); o.scale.set(w, h, w); meadow.add(o); }
    meadow.userData.clouds = [];
    for (let i = 0; i < 16; i++) { const c = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }); for (let k = 0; k < 4; k++) { const b = mesh(new THREE.SphereGeometry(2.4 + r() * 1.8, 10, 8), m, k * 2.6, r(), r() * 1.8); b.scale.y = 0.55; c.add(b); } c.position.set((r() - 0.5) * 2 * (W + 60), 30 + r() * 10, (r() - 0.5) * 2 * (W + 60)); meadow.add(c); meadow.userData.clouds.push(c); }
    zoneG = new THREE.Group(); scene.add(zoneG);
    zoneWall = mesh(new THREE.CylinderGeometry(1, 1, 30, 72, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }), 0, 15, 0);
    zoneRing = mesh(new THREE.RingGeometry(0.992, 1, 120), new THREE.MeshBasicMaterial({ color: 0xff5a4a, side: THREE.DoubleSide }), 0, 0.08, 0); zoneRing.rotation.x = -Math.PI / 2;
    nextRing = mesh(new THREE.RingGeometry(0.992, 1, 120), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), 0, 0.09, 0); nextRing.rotation.x = -Math.PI / 2;
    zoneG.add(zoneWall, zoneRing, nextRing); zoneG.visible = false;
  }
  function showScene() {
    meadow.visible = true; zoneG.visible = false; scene.background = new THREE.Color(0x8fd0ff); scene.fog = new THREE.Fog(0x8fd0ff, 70, 230);
    trainer.visible = true; camSnap = true;
  }
  const inGrassFree = (x, z) => !(Math.abs(x) > W - 2 || Math.abs(z) > W - 2 || COL.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.4) ** 2));

  /* ---------- setup ---------- */
  function setup(cb) {
    if (built) return cb(); built = true; injectCSS();
    $("adventure-page").innerHTML = `<div id="av-3d"></div>
      <div id="av-top"><button class="av-btn ghost" id="av-back">← BACK</button><div id="av-title"></div><span class="av-pill" id="av-res"></span></div>
      <div id="av-hud" hidden></div><canvas id="av-map" width="300" height="300" hidden></canvas><div id="av-feed"></div><div id="av-msg"></div>
      <div id="av-bottom"><div id="av-team"></div><div id="av-pad" hidden><button class="av-btn u" data-k="up">▲</button><button class="av-btn l" data-k="left">◀</button><button class="av-btn d" data-k="down">▼</button><button class="av-btn r" data-k="right">▶</button></div></div>
      <div id="av-battle" hidden><div class="av-cards"><div class="av-card" id="av-mecard"></div><div class="av-card foe" id="av-foecard"></div></div>
        <div class="av-panel"><div id="av-log"></div><div class="av-acts">
          <button class="av-btn" id="av-a1">⚔ Attack<small>Basic hit</small></button><button class="av-btn" id="av-a2">✦ Special<small>1.7× damage</small></button>
          <button class="av-btn ghost" id="av-a3">⚪ Poké Ball<small></small></button><button class="av-btn ghost" id="av-a4">🏃 Run<small>Escape</small></button>
          <button class="av-btn ghost" id="av-a5" style="grid-column:1/-1">⇄ Swap creature</button></div></div></div>
      <div id="av-float"></div><div id="av-modal" hidden></div>`;
    $("av-back").onclick = onBack; $("av-map").onclick = () => { $("av-map").classList.toggle("big"); if (G) drawMap(); };
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
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(52, 1, 0.1, 480);
    trainer = makeTrainer(0xd9363e, 0xffffff); scene.add(trainer);
    buildWorld(); addEventListener("resize", resize);
  }
  function resize() { const p = $("adventure-page"); if (!renderer || !p) return; const w = p.clientWidth || innerWidth, h = p.clientHeight || innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }

  /* ---------- UI helpers ---------- */
  const say = (s) => { $("av-msg").textContent = s || ""; };
  const log = (s) => { $("av-log").textContent = s; };
  function modal(html, bind) { const m = $("av-modal"); m.innerHTML = '<div class="av-sheet">' + html + "</div>"; m.hidden = false; if (bind) bind(m); }
  const closeModal = () => { $("av-modal").hidden = true; };
  let hudLast = null;
  function setHud(html) { if (html === hudLast) return; hudLast = html; const h = $("av-hud"); h.hidden = !html; h.innerHTML = html || ""; }
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

  /* ---------- lobby ---------- */
  function menu() {
    runId++; mode = null; G = null; clearBattle(); clearDyn(); showScene();
    P.x = 0; P.z = 26; P.rot = Math.PI; const team = siteTeam(); setPartner(true, team); setHud(""); showPad(false); $("av-map").hidden = true; $("av-title").textContent = "STORM ROYALE"; $("adventure-page").classList.remove("danger"); say(""); refresh(); zoneG.visible = false;
    const S = A.s;
    modal(`<h2>STORM ROYALE</h2><div class="av-tag">20 TRAINERS · 1 SHRINKING STORM · 1 WINNER</div>
      <div class="av-stats"><div class="av-stat"><small>BOOYAHS</small><b>${S.booyah}</b></div><div class="av-stat"><small>BEST RANK</small><b>${S.best ? "#" + S.best : "—"}</b></div><div class="av-stat"><small>TOTAL KILLS</small><b>${S.kills}</b></div></div>
      <div class="av-squad">${team.slice(0, 4).map((c) => `<div><img src="${ART + c.id}.png" alt="">${c.n}</div>`).join("")}</div>
      <div class="av-rules"><div class="av-rule"><i>🌀</i><span>Stay <b>inside the safe zone</b>. The storm closes in 5 phases and hurts your whole squad.</span></div><div class="av-rule"><i>📦</i><span>Raid cottages for <b>loot crates</b>: Poké Balls, healing and coins.</span></div><div class="av-rule"><i>⚔️</i><span>Touch a rival to battle. <b>Catch</b> them with Poké Balls to add them to your Pokédex.</span></div><div class="av-rule"><i>👑</i><span>Defeat the final boss and win a <b>BOOYAH!</b> Hold Shift to sprint, tap the minimap to enlarge it.</span></div></div>
      <button class="av-btn av-drop" data-a="go">🪂 DROP IN</button><div class="av-row2"><button class="av-btn ghost" data-a="back">← BACK TO HOME</button></div>`, (m) => {
      m.querySelector("[data-a=go]").onclick = () => { closeModal(); startSurvival(); }; m.querySelector("[data-a=back]").onclick = () => { closeModal(); close(); };
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
  function ovl(v) { ["av-hud", "av-map", "av-feed"].forEach((id) => { const e = $(id); if (e) e.style.visibility = v ? "" : "hidden"; }); }
  function clearBattle() { if (foeH && (!B || !B.o.h)) scene.remove(foeH); foeH = null; B = null; $("av-battle").hidden = true; $("av-bottom").style.display = ""; ovl(true); }
  function startBattle(foe, o) {
    const m = me(); if (!m) return;
    B = { foe, o, lock: false, turn: 0, mePos: o.mePos, foePos: o.foePos };
    if (o.h) foeH = o.h; else { foeH = makeMon(foe, foe.boss ? 3.6 : 2.1); foeH.position.copy(o.foePos); scene.add(foeH); }
    foeH.userData.sink = false; if (!o.h) foeH.userData.pop = 0;
    setPartner(); partnerH.userData.pop = 0.4;
    $("av-battle").hidden = false; $("av-bottom").style.display = "none"; showPad(false); ovl(false);
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
      foeH = null; B = null; $("av-battle").hidden = true; $("av-bottom").style.display = ""; ovl(true); if (mode === "survival" && G && !G.over) showPad(true); refresh();
      if (cb) cb(res, fp);
    }, ms);
  }

  /* ============================================================
     STORM ROYALE
  ============================================================ */
  const PH = [{ r: 80, wait: 40, shrink: 25 }, { r: 54, wait: 35, shrink: 22 }, { r: 34, wait: 30, shrink: 20 }, { r: 18, wait: 25, shrink: 18 }, { r: 7, wait: 20, shrink: 15 }];
  const fmt = (v) => { v = Math.max(0, Math.ceil(v)); return Math.floor(v / 60) + ":" + String(v % 60).padStart(2, "0"); };
  function startSurvival() {
    runId++; mode = "survival"; showScene(); clearDyn();
    G = { squad: siteTeam().slice(0, 4), lead: 0, kills: 0, roamers: [], crates: [], phase: 0, state: "wait", timer: 45, zone: { x: 0, z: 0, r: 115 }, from: null, to: null, tick: 0, over: false, bossed: false, intro: 1 };
    let n = 0; do { const a = Math.random() * 6.283, d = 88 + Math.random() * 18; P.x = Math.cos(a) * d; P.z = Math.sin(a) * d; n++; } while (!inGrassFree(P.x, P.z) && n < 80);
    P.rot = Math.atan2(-P.x, -P.z); setPartner(true); partnerH.position.set(P.x + 1.5, 0, P.z + 1.5);
    zoneG.visible = true; nextZone(); G.timer = 45;
    for (let i = 0; i < 19; i++) spawnRoamer();
    for (let i = 0; i < 30; i++) spawnCrate();
    $("av-title").textContent = "STORM ROYALE"; $("av-map").hidden = false; $("av-map").classList.remove("big"); $("av-feed").innerHTML = ""; hudLast = null; showPad(false);
    say("🪂 Dropping in… head for the safe zone and raid the cottages for loot!"); later(() => { say(""); showPad(true); }, 3200); refresh();
  }
  function nextZone() {
    const ph = PH[G.phase]; if (!ph) { G.state = "final"; G.to = null; return; }
    const z = G.zone, off = Math.max(0, z.r - ph.r) * 0.75, a = Math.random() * 6.28, d = Math.random() * off;
    G.from = { x: z.x, z: z.z, r: z.r }; G.to = { x: z.x + Math.cos(a) * d, z: z.z + Math.sin(a) * d, r: ph.r }; G.state = "wait"; G.timer = ph.wait;
  }
  function spawnRoamer() {
    let x, z, n = 0; do { x = (Math.random() - 0.5) * 2 * (W - 10); z = (Math.random() - 0.5) * 2 * (W - 10); n++; } while ((Math.hypot(x - P.x, z - P.z) < 40 || Math.hypot(x, z) > 108 || !inGrassFree(x, z)) && n < 60);
    const mid = Math.hypot(x, z) < 45, p = rnd(POOL.filter((q) => q.k <= (Math.random() < (mid ? 0.6 : 0.25) ? 2 : 1))), c = mk(p, 0.78 + Math.random() * 0.25);
    const h = makeMon(c, 1.9), ring = mesh(new THREE.RingGeometry(0.7, 0.85, 24), new THREE.MeshBasicMaterial({ color: 0xff3b3b, side: THREE.DoubleSide }), 0, 0.06, 0); ring.rotation.x = -Math.PI / 2; ring.visible = false; h.add(ring);
    h.position.set(x, 0, z); scene.add(h); dyn.push(h); G.roamers.push({ c, h, ring, x, z, tx: x, tz: z, wait: 0, chase: false, cool: 0, name: rnd(RIVALS) + "_" + (10 + Math.floor(Math.random() * 90)) });
  }
  function spawnCrate() {
    let x, z, n = 0;
    do { if (houses.length && Math.random() < 0.65) { const h = rnd(houses); x = h.x + (Math.random() - 0.5) * 12; z = h.z + (Math.random() - 0.5) * 12; } else { x = (Math.random() - 0.5) * 2 * (W - 6); z = (Math.random() - 0.5) * 2 * (W - 6); } n++; } while (!inGrassFree(x, z) && n < 60);
    const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), lam(0xffb92e, { emissive: 0x553300 }), 0, 0.6, 0), mesh(new THREE.BoxGeometry(0.95, 0.18, 0.95), lam(0xc4821a), 0, 0.6, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 9, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.5 }), 0, 4.8, 0));
    g.position.set(x, 0, z); scene.add(g); dyn.push(g); G.crates.push({ g, x, z });
  }
  function eliminate(n) {
    while (n-- > 0 && G.roamers.length > 1) { const i = Math.floor(Math.random() * G.roamers.length), r = G.roamers.splice(i, 1)[0]; scene.remove(r.h); feed("☠ " + r.name + " was lost to the storm"); }
  }
  function hudTick(out) {
    const alive = G.roamers.length + 1, fin = G.state === "final", shr = G.state === "shrink", ph = PH[G.phase];
    const label = out ? "⚠ OUTSIDE THE ZONE" : fin ? "FINAL ZONE" : shr ? "ZONE CLOSING" : "ZONE " + (G.phase + 1) + " CLOSES IN", total = shr ? ph.shrink : ph ? ph.wait : 1, frac = fin ? 1 : Math.max(0, Math.min(1, G.timer / total));
    setHud(`<div class="av-hbox"><small>ALIVE</small><b>${alive}</b></div><div class="av-zbar${out ? " out" : ""}${shr ? " closing" : ""}"><span>${label}</span><b>${fin ? "—" : fmt(G.timer)}</b><i><u style="width:${(frac * 100).toFixed(1)}%"></u></i></div><div class="av-hbox"><small>KILLS</small><b>${G.kills}</b></div>`);
  }
  function surv(dt) {
    const z = G.zone;
    if (G.intro > 0) { G.intro -= dt / 3.2; P.moving = false; hudTick(false); drawMap(); return; }
    let dx = 0, dz = 0;
    if (held.ArrowLeft || held.a || pad.left) dx -= 1; if (held.ArrowRight || held.d || pad.right) dx += 1;
    if (held.ArrowUp || held.w || pad.up) dz -= 1; if (held.ArrowDown || held.s || pad.down) dz += 1;
    P.moving = !!(dx || dz);
    if (P.moving) { const l = Math.hypot(dx, dz), st = (held.Shift ? 12 : 8.5) * dt, nx = P.x + (dx / l) * st, nz = P.z + (dz / l) * st; if (!blocked(nx, P.z)) P.x = nx; if (!blocked(P.x, nz)) P.z = nz; P.rot = Math.atan2(dx, dz); }
    if (G.state === "wait") { G.timer -= dt; if (G.timer <= 0) { G.state = "shrink"; G.timer = PH[G.phase].shrink; feed("⚠ The zone is closing!"); eliminate(4); } }
    else if (G.state === "shrink") { G.timer -= dt; const u = Math.min(1, 1 - G.timer / PH[G.phase].shrink); z.x = G.from.x + (G.to.x - G.from.x) * u; z.z = G.from.z + (G.to.z - G.from.z) * u; z.r = G.from.r + (G.to.r - G.from.r) * u; if (G.timer <= 0) { G.phase++; nextZone(); } }
    zoneWall.position.set(z.x, 15, z.z); zoneWall.scale.set(z.r, 1, z.r); zoneRing.position.set(z.x, 0.08, z.z); zoneRing.scale.set(z.r, z.r, 1);
    if (G.to) { nextRing.visible = true; nextRing.position.set(G.to.x, 0.09, G.to.z); nextRing.scale.set(G.to.r, G.to.r, 1); } else nextRing.visible = false;
    const out = Math.hypot(P.x - z.x, P.z - z.z) > z.r; $("adventure-page").classList.toggle("danger", out);
    if (out) { G.tick += dt; if (G.tick >= 1) { G.tick = 0; const d = Math.round(2 + G.phase * 1.5); G.squad.forEach((c) => { if (c.hp > 0) c.hp = Math.max(0, c.hp - d); }); float(partnerH, "-" + d + " STORM", "r"); me(); refresh(); if (!G.squad.some((c) => c.hp > 0)) return endSurv(false); setPartner(); } } else G.tick = 0;
    if (!G.bossed && G.roamers.length === 1) { G.bossed = true; const r = G.roamers[0]; scene.remove(r.h); r.c = mk(BOSS, 1.5); r.c.boss = true; r.h = makeMon(r.c, 3.6); r.h.position.set(r.x, 0, r.z); scene.add(r.h); dyn.push(r.h); r.ring = null; feed("👑 The final rival Mewtwo has appeared!"); }
    G.roamers.forEach((r) => {
      tickMon(r.h, dt); r.cool = Math.max(0, r.cool - dt); const d = Math.hypot(P.x - r.x, P.z - r.z); let tx, tz, sp;
      if (d < (r.c.boss ? 45 : 12) && r.cool <= 0) { tx = P.x; tz = P.z; sp = r.c.boss ? 4.8 : 4.2; r.chase = true; }
      else { r.chase = false; r.wait -= dt; if (r.wait <= 0 || Math.hypot(r.tx - r.x, r.tz - r.z) < 0.8) { const a = Math.random() * 6.28, rr = Math.random() * z.r * 0.8; r.tx = z.x + Math.cos(a) * rr; r.tz = z.z + Math.sin(a) * rr; r.wait = 3 + Math.random() * 5; } tx = r.tx; tz = r.tz; sp = 2.2; }
      const ddx = tx - r.x, ddz = tz - r.z, l = Math.hypot(ddx, ddz) || 1;
      if (l > 0.3) { const nx = r.x + (ddx / l) * sp * dt, nz = r.z + (ddz / l) * sp * dt; if (inGrassFree(nx, nz)) { r.x = nx; r.z = nz; } else r.wait = 0; face(r.h, ddx > 0); }
      r.h.position.set(r.x, 0, r.z); if (r.ring) r.ring.visible = r.chase;
      if (d < 2 && r.cool <= 0 && !B && !G.over) engage(r);
    });
    for (let i = G.crates.length - 1; i >= 0; i--) { const c = G.crates[i]; c.g.rotation.y += dt * 1.5; if (Math.hypot(P.x - c.x, P.z - c.z) < 1.6) { scene.remove(c.g); G.crates.splice(i, 1); loot(); } }
    hudTick(out); drawMap();
  }
  function loot() {
    const k = rnd(["ball", "heal", "coins", "ball"]);
    if (k === "ball") { giveBalls(2); say("📦 +2 Poké Balls"); feed("📦 Loot: +2 Poké Balls"); } else if (k === "heal") { G.squad.forEach((c) => { if (c.hp > 0) c.hp = Math.min(c.max, c.hp + Math.round(c.max * 0.3)); }); say("📦 Squad healed +30%"); feed("📦 Loot: squad healed"); } else { addCoins(40); say("📦 +40 coins"); feed("📦 Loot: +40 coins"); }
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
    if (res === "run") { r.x = fp.x; r.z = fp.z; r.cool = 5; const a = Math.atan2(P.x - fp.x, P.z - fp.z); P.x += Math.sin(a) * 3; P.z += Math.cos(a) * 3; return setPartner(); }
    const i = G.roamers.indexOf(r); if (i >= 0) G.roamers.splice(i, 1); scene.remove(r.h); G.kills++;
    feed("☠ You " + (res === "caught" ? "caught " : "eliminated ") + r.name + "’s " + r.c.n); addCoins(25); const m = me(); if (m) m.hp = Math.min(m.max, m.hp + 8);
    setPartner(); refresh(); if (r.c.boss) endSurv(true);
  }
  function endSurv(win) {
    if (G.over) return; G.over = true; const rank = win ? 1 : G.roamers.length + 1, k = G.kills;
    const gain = win ? 600 + k * 40 : Math.max(20, (21 - rank) * 12) + k * 40; addCoins(gain); if (win || rank <= 5) giveBalls(win ? 3 : 1);
    const S = A.s; S.runs++; S.kills += k; if (win) S.booyah++; S.best = S.best ? Math.min(S.best, rank) : rank; save();
    setHud(""); showPad(false); $("adventure-page").classList.remove("danger"); $("av-map").hidden = true; zoneG.visible = false;
    later(() => modal(`<h2 class="${win ? "win" : "lose"}">${win ? "🏆 BOOYAH!" : "ELIMINATED"}</h2><p>${win ? "You are the last trainer standing!" : "You finished #" + rank + " out of 20."}</p>
      <div class="av-stats"><div class="av-stat"><small>RANK</small><b>#${rank}</b></div><div class="av-stat"><small>KILLS</small><b>${k}</b></div><div class="av-stat"><small>COINS</small><b>+${gain}</b></div></div>${win || rank <= 5 ? "<p>🎁 Bonus: Poké Balls added to your bag.</p>" : ""}
      <div class="av-row2"><button class="av-btn ghost" data-a="menu">LOBBY</button><button class="av-btn" data-a="again">PLAY AGAIN</button></div>`, (m) => { m.querySelector("[data-a=menu]").onclick = menu; m.querySelector("[data-a=again]").onclick = () => { closeModal(); startSurvival(); }; }), 900);
  }
  function blocked(x, z) { return !inGrassFree(x, z); }
  function drawMap() {
    const c = $("av-map"), x = c.getContext("2d"), S = c.width, span = W * 2 + 12, k = S / span, X = (v) => (v + span / 2) * k, z = G.zone;
    x.clearRect(0, 0, S, S); x.fillStyle = "#16324a"; x.fillRect(0, 0, S, S); x.fillStyle = "#245a3c"; x.fillRect(X(-W), X(-W), W * 2 * k, W * 2 * k);
    x.fillStyle = "#3fa7e8"; LAKES.forEach(([lx, lz, lr]) => { x.beginPath(); x.arc(X(lx), X(lz), lr * k, 0, 6.283); x.fill(); });
    x.fillStyle = "#e6d9a0"; houses.forEach((h) => x.fillRect(X(h.x) - 4, X(h.z) - 4, 8, 8)); x.fillStyle = "#8fe6ff"; x.beginPath(); x.moveTo(X(0), X(0) - 7); x.lineTo(X(0) + 5, X(0)); x.lineTo(X(0), X(0) + 7); x.lineTo(X(0) - 5, X(0)); x.fill();
    x.save(); x.beginPath(); x.rect(0, 0, S, S); x.arc(X(z.x), X(z.z), z.r * k, 0, 6.283, true); x.fillStyle = "rgba(255,60,60,.32)"; x.fill("evenodd"); x.restore();
    x.strokeStyle = "#fff"; x.lineWidth = 3; x.beginPath(); x.arc(X(z.x), X(z.z), z.r * k, 0, 6.283); x.stroke();
    if (G.to) { x.strokeStyle = "rgba(120,200,255,.95)"; x.lineWidth = 3; x.setLineDash([10, 8]); x.beginPath(); x.arc(X(G.to.x), X(G.to.z), G.to.r * k, 0, 6.283); x.stroke(); x.setLineDash([]); }
    x.fillStyle = "#ffcf45"; G.crates.forEach((q) => { if (Math.hypot(q.x - P.x, q.z - P.z) < 70) x.fillRect(X(q.x) - 4, X(q.z) - 4, 8, 8); });
    G.roamers.forEach((r) => { if (r.c.boss || Math.hypot(r.x - P.x, r.z - P.z) < 60) { x.fillStyle = r.c.boss ? "#c77dff" : "#ff5a5a"; x.beginPath(); x.arc(X(r.x), X(r.z), r.c.boss ? 9 : 6, 0, 6.283); x.fill(); } });
    x.save(); x.translate(X(P.x), X(P.z)); x.rotate(-P.rot + Math.PI); x.fillStyle = "#5de4ff"; x.strokeStyle = "#04121f"; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -11); x.lineTo(8, 9); x.lineTo(-8, 9); x.closePath(); x.fill(); x.stroke(); x.restore();
  }

  /* ---------- loop ---------- */
  function frame(now) {
    if (!running) return; const p = $("adventure-page"); if (!p || p.classList.contains("hidden")) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt; update(dt); renderer.render(scene, camera); requestAnimationFrame(frame);
  }
  function update(dt) {
    [partnerH, foeH].forEach((h) => h && tickMon(h, dt));
    meadow.userData.clouds.forEach((c) => { c.position.x += dt * 0.8; if (c.position.x > W + 80) c.position.x = -W - 80; });
    if (mode === "survival" && !G.over && !B && !modalOpen()) surv(dt);
    else if (mode === "survival") { G.roamers.forEach((r) => { if (!B || r.h !== foeH) tickMon(r.h, dt); }); if (!$("av-map").hidden) drawMap(); }
    trainer.position.set(P.x, 0, P.z); trainer.rotation.y = P.rot;
    const lg = trainer.userData.legs, sw = P.moving && !B ? Math.sin(t * 12) * 0.5 : 0; lg[0].rotation.x = sw; lg[1].rotation.x = -sw;
    if (partnerH) {
      if (B) { partnerH.position.lerp(B.mePos, 1 - Math.exp(-7 * dt)); face(partnerH, B.foePos.x > partnerH.position.x); if (foeH) { foeH.position.lerp(B.foePos, 1 - Math.exp(-7 * dt)); face(foeH, partnerH.position.x > foeH.position.x); } }
      else {
        const tx = P.x - Math.sin(P.rot) * 1.7 + Math.cos(P.rot), tz = P.z - Math.cos(P.rot) * 1.7 - Math.sin(P.rot), ox = partnerH.position.x, oz = partnerH.position.z;
        partnerH.position.x += (tx - ox) * (1 - Math.exp(-5 * dt)); partnerH.position.z += (tz - oz) * (1 - Math.exp(-5 * dt));
        const mx = partnerH.position.x - ox; if (Math.abs(mx) > 0.002) face(partnerH, mx > 0);
      }
    }
    let cx, cy, cz, lx, ly, lz;
    if (mode === "survival" && B) { const mxp = (P.x + B.foePos.x) / 2, mzp = (P.z + B.foePos.z) / 2; cx = mxp; cy = 6.2; cz = mzp + 8.5; lx = mxp; ly = 1.3; lz = mzp; }
    else if (mode === "survival") { const i = G.intro > 0 ? G.intro : 0; cx = P.x; cy = 9.5 + i * 60; cz = P.z + 11.5 + i * 30; lx = P.x; ly = 1; lz = P.z; }
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