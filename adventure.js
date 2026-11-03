/* ============================================================
   ADVENTURE (3D) — STORY ADVENTURE + STORM ROYALE
   STORY: a Pokémon-ROM style journey with a starter, a rival, route
   trainers, tall grass, Pokémon Centers, Marts, 3 gym badges and a
   Champion. STORM ROYALE: 20 trainers drop onto a huge 240 x 240 map. A storm closes in
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
  const EXTRA = [[2, "Ivysaur", "grass,poison", 2], [5, "Charmeleon", "fire", 2], [8, "Wartortle", "water", 2], [64, "Kadabra", "psychic", 2], [93, "Haunter", "ghost,poison", 2], [75, "Graveler", "rock,ground", 2], [67, "Machoke", "fighting", 2], [42, "Golbat", "poison,flying", 2], [44, "Gloom", "grass,poison", 2], [20, "Raticate", "normal", 1], [76, "Golem", "rock,ground", 3]].map(([id, n, t, k]) => ({ id, n, s: n.toLowerCase(), t: t.split(","), k }));
  const SPECIES = {}; POOL.concat(EXTRA, [BOSS]).forEach((p) => { SPECIES[p.id] = p; });
  const EVO = { 1: [2, 16], 2: [3, 32], 4: [5, 16], 5: [6, 36], 7: [8, 16], 8: [9, 36], 25: [26, 22], 19: [20, 20], 63: [64, 16], 64: [65, 36], 92: [93, 25], 93: [94, 38], 74: [75, 25], 75: [76, 38], 66: [67, 28], 67: [68, 38], 41: [42, 22], 43: [44, 21] };
  const xpNeed = (lv) => 6 + lv * 4;
  function restat(c) { c.max = 40 + c.lv * 5 + c.k * 10; c.a = Math.round(4 + c.lv * 0.8 + c.k * 1.2); }
  function mkL(p, lv) { const c = { id: p.id, n: p.n, s: p.s, t: p.t, k: p.k, lv, xp: 0, cd: 0 }; restat(c); c.hp = c.max; return c; }
  const mk = (p, l = 1) => { const max = Math.round((42 + p.k * 12) * l); return { id: p.id, n: p.n, s: p.s, t: p.t, k: p.k, max, hp: max, a: Math.round((7 + p.k * 2) * (0.85 + l * 0.15)), cd: 0 }; };
  const RIVALS = ["Blaze", "Nova", "Viper", "Echo", "Rogue", "Titan", "Ghost", "Raven", "Storm", "Frost", "Hunter", "Zero"];

  /* ---------- site bridge ---------- */
  const toast = (o) => { try { showToast(o); } catch (e) {} };
  function addCoins(n) { try { coins += n; saveStoredNumber(COINS_KEY, coins); updateResourcesUI(); } catch (e) {} }
  const ballCount = () => { try { return totalBalls(); } catch (e) { return 0; } };
  function pickBall() { for (const [id, m, n] of [["ultra", 2, "Ultra Ball"], ["great", 1.5, "Great Ball"], ["pokeball", 1, "Poké Ball"]]) { try { if (getBallCount(id) > 0) return { id, m, n }; } catch (e) {} } return null; }
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
  let A, THREE, renderer, scene, camera, meadow, region = null, zoneG, zoneWall, zoneRing, nextRing;
  let trainer, partnerH, foeH, mode = null, G = null, B = null;
  let built = false, running = false, last = 0, t = 0, runId = 0, camSnap = true;
  const P = { x: 0, z: 24, rot: Math.PI, moving: false };
  const held = {}, pad = {}, COL = [], camLook = { x: 0, y: 1, z: 0 };
  let COLA = COL, BND = { x0: -118, x1: 118, z0: -118, z1: 118 };
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
#av-move-fx{position:absolute;inset:0;z-index:8;pointer-events:none;overflow:hidden}
.av-move-burst{position:absolute;width:clamp(100px,22vw,180px);height:clamp(100px,22vw,180px);transform:translate(-50%,-50%);border-radius:50%;display:grid;place-items:center;animation:avburst .72s ease-out forwards;filter:drop-shadow(0 0 16px var(--move-color))}
.av-move-burst:before{content:"";position:absolute;inset:8%;border-radius:50%;border:5px solid var(--move-color);box-shadow:0 0 20px var(--move-color),inset 0 0 22px var(--move-color);animation:avring .72s ease-out forwards}
.av-move-burst:after{content:"";position:absolute;inset:25%;border-radius:50%;background:radial-gradient(circle,var(--move-color),transparent 72%);opacity:.65;animation:avcore .72s ease-out forwards}
.av-move-burst b{position:relative;z-index:2;font:900 clamp(20px,5vw,34px) var(--font-display);color:#fff;text-shadow:0 2px 4px #000,0 0 14px var(--move-color);animation:avlabel .72s ease-out forwards}
.av-move-particle{position:absolute;left:50%;top:50%;font-size:clamp(15px,3vw,25px);text-shadow:0 2px 5px #000;animation:avparticle .68s cubic-bezier(.12,.7,.2,1) forwards}
@keyframes avburst{0%{opacity:0;scale:.15}18%{opacity:1;scale:1.08}100%{opacity:0;scale:1.5}}
@keyframes avring{0%{transform:scale(.25);opacity:1}100%{transform:scale(1.3);opacity:0}}
@keyframes avcore{0%{transform:scale(.1);opacity:.9}45%{transform:scale(1.2);opacity:.7}100%{transform:scale(.2);opacity:0}}
@keyframes avlabel{0%{opacity:0;transform:scale(.5) translateY(8px)}25%{opacity:1;transform:scale(1) translateY(0)}100%{opacity:0;transform:scale(1.15) translateY(-12px)}}
@keyframes avparticle{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}15%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1.25)}}
#av-3d.av-camera-hit{animation:avcamerahit .24s ease-out}
@keyframes avcamerahit{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
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
`;
    s.textContent += `
.av-idpanel{display:grid;gap:6px;padding:12px;margin:12px 0;background:#0c1b2d;border:1px solid #36506b;border-radius:12px;color:#b9d5ef;font:700 12px var(--font-display)}.av-idpanel b{color:#ffcf45;letter-spacing:1.5px}
.av-room{padding:18px;border-radius:16px;border:4px solid var(--gym-trim);background:linear-gradient(145deg,var(--gym-bg),#101b2c);color:#fff;box-shadow:inset 0 0 0 5px rgba(255,255,255,.06)}.av-room h2{color:var(--gym-accent);text-align:center}.av-room-floor{height:95px;margin:12px 0;border:3px solid var(--gym-trim);border-radius:10px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.07) 0 28px,transparent 28px 56px),repeating-linear-gradient(0deg,rgba(255,255,255,.06) 0 28px,transparent 28px 56px),var(--gym-floor);display:flex;align-items:center;justify-content:space-around;font-size:27px}.av-task{display:flex;gap:10px;align-items:center;padding:10px;margin:7px 0;background:#10253a;border:1px solid #36506b;border-radius:10px;color:#dcecff;font-size:13px}
`;
    s.textContent += `
#av-home-preview{position:fixed;z-index:30;right:18px;bottom:18px;width:min(330px,calc(100vw - 28px));padding:14px;border:1px solid #36506b;border-radius:18px;background:linear-gradient(145deg,#132c46,#081522);box-shadow:0 16px 45px #0009;color:#eaf3ff;font-family:var(--font-body);display:flex;gap:12px;align-items:center;text-align:left}
#av-home-preview .av-home-avatar{width:62px;height:72px;flex:none;border-radius:14px;background:linear-gradient(160deg,#244b70,#0b1c30);display:grid;place-items:center;border:1px solid #4b7598}#av-home-preview .av-home-avatar svg{width:52px;height:62px}
#av-home-preview .av-home-info{min-width:0;flex:1}#av-home-preview b{display:block;color:#ffcf45;font:900 14px var(--font-display);letter-spacing:1px}#av-home-preview small{display:block;color:#a9bed3;font-size:10px;margin-top:3px;overflow-wrap:anywhere}#av-home-preview .av-home-places{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}#av-home-preview .av-home-places span{font-size:9px;color:#cfe6ff;background:#0b1b2d;border:1px solid #29415b;border-radius:7px;padding:4px 6px}#av-home-preview button{margin-top:8px;width:100%;min-height:34px;border:0;border-radius:9px;background:linear-gradient(145deg,#ffcf45,#ff762e);color:#172235;font-weight:900;cursor:pointer}
@media(max-width:560px){#av-home-preview{left:12px;right:12px;bottom:12px;width:auto}}
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
    const leafG = new THREE.IcosahedronGeometry(1.25, 0), la = new THREE.InstancedMesh(leafG, lam(0xffffff), NT), lb = new THREE.InstancedMesh(leafG, lam(0xffffff), NT);
    let n = 0;
    for (let i = 0; i < 6000 && n < NT; i++) {
      const x = (r() - 0.5) * 2 * (W - 3), z = (r() - 0.5) * 2 * (W - 3); if (!freeSpot(x, z, 2)) continue; const s = 0.8 + r() * 0.8;
      dm.rotation.set(0, 0, 0); dm.scale.setScalar(s); dm.position.set(x, 0.75 * s, z); dm.updateMatrix(); trunk.setMatrixAt(n, dm.matrix);
      dm.rotation.y = r() * 6; dm.position.set(x, 2.2 * s, z); dm.updateMatrix(); la.setMatrixAt(n, dm.matrix);
      dm.scale.setScalar(0.75 * s); dm.position.set(x + 0.3 * s, 3.1 * s, z + 0.1 * s); dm.updateMatrix(); lb.setMatrixAt(n, dm.matrix);
      col.setHSL(0.29 + r() * 0.09, 0.5, 0.24 + r() * 0.1); la.setColorAt(n, col); lb.setColorAt(n, col); COL.push({ x, z, r: 0.9 * s }); n++;
    }
    [trunk, la, lb].forEach((m) => { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; meadow.add(m); });
    const NR = 110, rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.8, 0), lam(0x9a9aa8), NR); n = 0;
    for (let i = 0; i < 1500 && n < NR; i++) { const x = (r() - 0.5) * 2 * (W - 3), z = (r() - 0.5) * 2 * (W - 3); if (!freeSpot(x, z, 1)) continue; const s = 0.6 + r() * 1.1; dm.rotation.set(0, r() * 6, 0); dm.scale.set(s, s * 0.8, s); dm.position.set(x, 0.4 * s, z); dm.updateMatrix(); rocks.setMatrixAt(n, dm.matrix); COL.push({ x, z, r: 0.8 * s }); n++; }
    rocks.count = n; rocks.instanceMatrix.needsUpdate = true; meadow.add(rocks);
    const NF = 1100, fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 5), lam(0xffffff), NF), fc = [0xff6b8b, 0xffd43b, 0xffffff, 0xc77dff, 0xff9e5a];
    for (let i = 0; i < NF; i++) { dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.position.set((r() - 0.5) * 2 * W, 0.14, (r() - 0.5) * 2 * W); dm.updateMatrix(); fl.setMatrixAt(i, dm.matrix); col.setHex(fc[i % 5]); fl.setColorAt(i, col); }
    fl.instanceMatrix.needsUpdate = true; fl.instanceColor.needsUpdate = true; meadow.add(fl);
    const mG = new THREE.ConeGeometry(1, 1, 6);
    for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2, d = W + 55 + r() * 12, h = 22 + r() * 26, w = 16 + r() * 12, o = mesh(mG, lam(0x6f8fb8), Math.cos(a) * d, h / 2, Math.sin(a) * d); o.scale.set(w, h, w); meadow.add(o); }
    meadow.userData.clouds = [];
    for (let i = 0; i < 16; i++) { const c = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }); for (let k = 0; k < 4; k++) { const b = mesh(new THREE.SphereGeometry(2.4 + r() * 1.8, 10, 8), m, k * 2.6, r(), r() * 1.8); b.scale.y = 0.55; c.add(b); } c.position.set((r() - 0.5) * 2 * (W + 60), 30 + r() * 10, (r() - 0.5) * 2 * (W + 60)); meadow.add(c); meadow.userData.clouds.push(c); }
    zoneG = new THREE.Group(); scene.add(zoneG);
    zoneWall = mesh(new THREE.CylinderGeometry(1, 1, 30, 72, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }), 0, 15, 0);
    zoneRing = mesh(new THREE.RingGeometry(0.992, 1, 120), new THREE.MeshBasicMaterial({ color: 0xff5a4a, side: THREE.DoubleSide }), 0, 0.08, 0); zoneRing.rotation.x = -Math.PI / 2;
    nextRing = mesh(new THREE.RingGeometry(0.992, 1, 120), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), 0, 0.09, 0); nextRing.rotation.x = -Math.PI / 2;
    zoneG.add(zoneWall, zoneRing, nextRing); zoneG.visible = false;
  }
  function showScene(kind) {
    const st = kind === "region"; meadow.visible = !st; if (region) region.visible = st; zoneG.visible = false;
    COLA = st ? SCOL : COL; BND = st ? { x0: -98, x1: 478, z0: -41, z1: 41 } : { x0: -W + 2, x1: W - 2, z0: -W + 2, z1: W - 2 };
    scene.background = new THREE.Color(0x8fd0ff); scene.fog = new THREE.Fog(0x8fd0ff, 70, 230); trainer.visible = true; camSnap = true;
  }
  const inGrassFree = (x, z) => !(x < BND.x0 || x > BND.x1 || z < BND.z0 || z > BND.z1 || COLA.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.4) ** 2));

  /* ---------- setup ---------- */
  function setup(cb) {
    if (built) return cb(); built = true; injectCSS();
    $("adventure-page").innerHTML = `<div id="av-3d"></div>
      <div id="av-top"><button class="av-btn ghost" id="av-back">← BACK</button><button class="av-btn ghost" id="av-party" hidden>☰ PARTY</button><div id="av-title"></div><span class="av-pill" id="av-res"></span></div>
      <div id="av-hud" hidden></div><canvas id="av-map" width="300" height="300" hidden></canvas><div id="av-feed"></div><div id="av-msg"></div>
      <div id="av-bottom"><div id="av-team"></div><div id="av-pad" hidden><button class="av-btn u" data-k="up">▲</button><button class="av-btn l" data-k="left">◀</button><button class="av-btn d" data-k="down">▼</button><button class="av-btn r" data-k="right">▶</button></div></div>
      <div id="av-battle" hidden><div class="av-cards"><div class="av-card" id="av-mecard"></div><div class="av-card foe" id="av-foecard"></div></div>
        <div class="av-panel"><div id="av-log"></div><div class="av-acts">
          <button class="av-btn" id="av-a1">⚔ Attack<small>Basic hit</small></button><button class="av-btn" id="av-a2">✦ Special<small>1.7× damage</small></button>
          <button class="av-btn ghost" id="av-a3">⚪ Poké Ball<small></small></button><button class="av-btn ghost" id="av-a4">🏃 Run<small>Escape</small></button>
          <button class="av-btn ghost" id="av-a5">⇄ Swap<small>Change creature</small></button><button class="av-btn ghost" id="av-a6">🧪 Potion<small></small></button></div></div></div>
      <div id="av-float"></div><div id="av-move-fx"></div><div id="av-dlg" hidden></div><div id="av-prompt" hidden></div><button class="av-btn" id="av-act" hidden>A</button><div id="av-loc"></div><div id="av-flash"></div><div id="av-modal" hidden></div>`;
    $("av-back").onclick = onBack; $("av-party").onclick = partyMenu; $("av-act").onclick = interact; $("av-dlg").onclick = () => advanceDlg(); $("av-map").onclick = () => { $("av-map").classList.toggle("big"); if (G) drawMap(); };
    document.querySelectorAll("#av-pad button").forEach((b) => { const k = b.dataset.k; b.addEventListener("pointerdown", (e) => { e.preventDefault(); pad[k] = true; }); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => { pad[k] = false; })); });
    [["a1", "atk"], ["a2", "sp"], ["a3", "ball"], ["a4", "run"], ["a5", "swap"], ["a6", "potion"]].forEach(([id, k]) => { $("av-" + id).onclick = () => act(k); });
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
    if (!h || !camera) return; const v = new THREE.Vector3(h.position.x, 2.6 * ((h.userData.s || 2.1) / 2.1), h.position.z).project(camera);
    const p = $("adventure-page"), d = document.createElement("div"); d.className = "av-fl " + (cls || ""); d.textContent = txt;
    d.style.left = ((v.x * 0.5 + 0.5) * p.clientWidth) + "px"; d.style.top = ((-v.y * 0.5 + 0.5) * p.clientHeight) + "px"; $("av-float").appendChild(d); setTimeout(() => d.remove(), 950);
  }
  const MOVE_FX = {
    normal:["#e8e2c8","✦","✧","➤"], fire:["#ff642e","🔥","✹","✦"], water:["#43b9ff","💧","〰","✧"],
    electric:["#ffe34a","⚡","✦","ϟ"], grass:["#75dc62","🍃","✿","❋"], ice:["#9cf5ff","❄","✧","❅"],
    fighting:["#ff654f","✊","✦","➤"], poison:["#c46bdf","☠","●","✧"], ground:["#d8ad62","◆","〰","✦"],
    flying:["#b7d8ff","🪽","〰","✧"], psychic:["#ff72c5","✧","◉","✦"], bug:["#b6d94d","✿","❋","●"],
    rock:["#c8ad75","◆","▪","✦"], ghost:["#a88aff","👻","◉","✧"], dragon:["#9b79ff","🐉","✦","◆"],
    dark:["#9b8aaf","◈","●","✧"], steel:["#c7d7e8","⚙","◆","✦"], fairy:["#ffb8df","✿","♡","✧"]
  };
  function moveEffect(type, target, moveName) {
    if (!target || !camera) return;
    const p = $("adventure-page"), v = new THREE.Vector3(target.position.x, 2.4 * ((target.userData.s || 2.1) / 2.1), target.position.z).project(camera);
    const x = (v.x * .5 + .5) * p.clientWidth, y = (-v.y * .5 + .5) * p.clientHeight;
    const fx = MOVE_FX[type] || MOVE_FX.normal, root = document.createElement("div");
    root.className = "av-move-burst"; root.style.left = x + "px"; root.style.top = y + "px"; root.style.setProperty("--move-color", fx[0]);
    const label = document.createElement("b"); label.textContent = moveName || (type.toUpperCase() + " MOVE"); root.appendChild(label);
    for (let i=0;i<9;i++) { const bit=document.createElement("span"); bit.className="av-move-particle"; bit.textContent=fx[1+(i%3)]; const a=Math.PI*2*i/9,d=48+(i%3)*17; bit.style.setProperty("--dx",Math.cos(a)*d+"px"); bit.style.setProperty("--dy",Math.sin(a)*d+"px"); root.appendChild(bit); }
    $("av-move-fx").appendChild(root); setTimeout(()=>root.remove(),800);
    const stage=$("av-3d"); stage.classList.remove("av-camera-hit"); void stage.offsetWidth; stage.classList.add("av-camera-hit");
  }
  const hpCls = (c) => { const f = c.hp / c.max; return f < 0.25 ? "low" : f < 0.55 ? "mid" : ""; };
  function refresh() {
    let c = 0; try { c = coins; } catch (e) {}
    $("av-res").textContent = "🥮 " + c.toLocaleString() + "  ·  ⚪ " + ballCount();
    $("av-team").innerHTML = G && !B ? G.squad.map((m, i) => `<div class="av-chip${i === G.lead && m.hp > 0 ? " lead" : ""}${m.hp <= 0 ? " down" : ""}"><img src="${ART + m.id}.png" alt=""><div><b>${m.n}${m.lv ? " Lv" + m.lv : ""}</b><span class="av-bar"><u class="${hpCls(m)}" style="width:${Math.max(0, m.hp / m.max * 100)}%"></u></span></div></div>`).join("") : "";
  }
  const showPad = (v) => { $("av-pad").hidden = !v; };

  /* ---------- lobby ---------- */
  function menu() {
    if (G && G.story) saveStory();
    runId++; mode = null; G = null; DL = null; clearBattle(); clearDyn(); showScene("meadow");
    ["av-dlg", "av-prompt", "av-act", "av-party"].forEach((id) => { $(id).hidden = true; }); $("av-loc").classList.remove("show");
    P.x = 0; P.z = 26; P.rot = Math.PI; setPartner(true, siteTeam()); setHud(""); showPad(false); $("av-map").hidden = true; $("av-title").textContent = "ADVENTURE"; $("adventure-page").classList.remove("danger"); say(""); refresh(); zoneG.visible = false;
    const S = A.story, sub = S ? "💾 " + (S.badges || []).length + "/6 BADGES · " + (S.squad || []).length + " POKÉMON" + (S.flags && S.flags.champ ? " · 🏆 TOURNAMENT CHAMPION" : "") : "CREATE YOUR TRAINER";
    const profile = S && S.profile ? S.profile : null;
    const ids = S ? `<div class="av-idpanel"><b>TRAINER REGISTRY</b><span>YOUR ID: ${profile && profile.id || "NOT CREATED"}</span><span>FRIEND IDs: ${profile && profile.friends ? profile.friends.map(f => f.id).join(" · ") : "NPC-MAYA-01 · NPC-LEO-01"}</span></div>` : "";
    modal(`<h2>REGION ADVENTURE</h2><p>Explore a much larger region, complete city requests, earn six badges with your two friends, then enter the Grand League tournament.</p>
      <div class="av-modes"><button class="av-mode" data-m="story" style="--c:#4fb3ff"><div class="ic">🗺️</div><div><b>${S ? "CONTINUE JOURNEY" : "NEW STORY ADVENTURE"}</b><span>Six cities, six themed Gym rooms, side quests, two rival friends and a championship tournament.</span><i>${sub}</i></div></button></div>${ids}
      <div class="av-row2">${S ? '<button class="av-btn ghost" data-m="new">CREATE NEW STORY</button>' : ""}<button class="av-btn ghost" data-m="home">← HOME</button></div>`, (m) => {
      m.querySelectorAll("[data-m]").forEach((b) => { b.onclick = () => {
        const k = b.dataset.m;
        if (k === "story") { closeModal(); if (!S) startStory(true); else startStory(false); } else if (k === "home") { closeModal(); close(); }
        else modal(`<h2 class="lose">CREATE A NEW STORY?</h2><p>This replaces the current story save, badges, trainer profile and party.</p><div class="av-row2"><button class="av-btn ghost" data-a="no">CANCEL</button><button class="av-btn" data-a="yes">CONTINUE</button></div>`, (m2) => { m2.querySelector("[data-a=no]").onclick = menu; m2.querySelector("[data-a=yes]").onclick = () => { closeModal(); startStory(true); }; });
      }; });
    });
  }
  function royaleLobby() {
    const team = siteTeam(), S = A.s;
    modal(`<h2>STORM ROYALE</h2><div class="av-tag">20 TRAINERS · 1 SHRINKING STORM · 1 WINNER</div>
      <div class="av-stats"><div class="av-stat"><small>BOOYAHS</small><b>${S.booyah}</b></div><div class="av-stat"><small>BEST RANK</small><b>${S.best ? "#" + S.best : "—"}</b></div><div class="av-stat"><small>TOTAL KILLS</small><b>${S.kills}</b></div></div>
      <div class="av-squad">${team.slice(0, 4).map((c) => `<div><img src="${ART + c.id}.png" alt="">${c.n}</div>`).join("")}</div>
      <div class="av-rules"><div class="av-rule"><i>🌀</i><span>Stay <b>inside the safe zone</b>. The storm closes in 5 phases and hurts your whole squad.</span></div><div class="av-rule"><i>📦</i><span>Raid cottages for <b>loot crates</b>: Poké Balls, healing and coins.</span></div><div class="av-rule"><i>⚔️</i><span>Touch a rival to battle. <b>Catch</b> them with Poké Balls to add them to your Pokédex.</span></div><div class="av-rule"><i>👑</i><span>Defeat the final boss and win a <b>BOOYAH!</b> Hold Shift to sprint, tap the minimap to enlarge it.</span></div></div>
      <button class="av-btn av-drop" data-a="go">🪂 DROP IN</button><div class="av-row2"><button class="av-btn ghost" data-a="back">← BACK</button></div>`, (m) => {
      m.querySelector("[data-a=go]").onclick = () => { closeModal(); startSurvival(); }; m.querySelector("[data-a=back]").onclick = menu;
    });
  }
  function onBack() {
    if (B && B.lock) return;
    if (DL) return;
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
  function ovl(v) { ["av-hud", "av-map", "av-feed", "av-act", "av-party", "av-loc", "av-prompt"].forEach((id) => { const e = $(id); if (e) e.style.visibility = v ? "" : "hidden"; }); }
  function clearBattle() { if (foeH && (!B || !B.o.h)) scene.remove(foeH); foeH = null; B = null; if ($("av-move-fx")) $("av-move-fx").innerHTML = ""; $("av-battle").hidden = true; $("av-bottom").style.display = ""; ovl(true); }
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
    $("av-mecard").innerHTML = `<div class="nm">${m.n}${m.lv ? " Lv" + m.lv : ""}<small>${m.hp}/${m.max}</small></div><span class="hp"><i style="width:${m.hp / m.max * 100}%"></i></span><div class="av-types">${types(m)}</div>`;
    $("av-foecard").innerHTML = `<div class="nm">${f.boss ? "👑 " : ""}${f.n}${f.lv ? " Lv" + f.lv : ""}<small>${f.hp}/${f.max}</small></div><span class="hp"><i style="width:${f.hp / f.max * 100}%"></i></span><div class="av-types">${types(f)}</div>`;
    const o = B.o; $("av-a2").disabled = m.cd > 0; $("av-a2").innerHTML = "✦ Special<small>" + (m.cd > 0 ? "ready in " + m.cd : "1.7× damage") + "</small>";
    $("av-a3").hidden = !o.ball; $("av-a3").disabled = !!f.boss || ballCount() < 1; { const pb = pickBall(); $("av-a3").querySelector("small").textContent = pb ? pb.n + " ×" + ballCount() : "none left"; }
    $("av-a4").hidden = !o.run; $("av-a4").disabled = !!f.boss; $("av-a5").hidden = !o.swap || G.squad.filter((c) => c.hp > 0).length < 2; $("av-a6").hidden = !o.potion; $("av-a6").disabled = !G.potions; $("av-a6").querySelector("small").textContent = (G.potions || 0) + " left"; refresh();
  }
  function dmg(a, d, mult) { const e = eff(a.t[0], d); return { v: e === 0 ? 0 : Math.max(1, Math.round(a.a * (0.8 + Math.random() * 0.4) * mult * e)), e }; }
  const effTxt = (e) => (e === 0 ? " — no effect!" : e > 1 ? " — super effective!" : e < 1 ? " — not very effective." : ".");
  function lungeTo(h, from, to) { const dx = to.x - from.x, dz = to.z - from.z, l = Math.hypot(dx, dz) || 1; h.userData.lx = dx / l; h.userData.lz = dz / l; h.userData.lunge = 0.0001; }
  function act(kind) {
    if (!B || B.lock) return; const m = me(); if (!m) return; const f = B.foe, o = B.o;
    if (kind === "run") { if (!o.run || f.boss) return; if (Math.random() < 0.65) { log("Got away safely!"); return endBattle("run", 500); } log("Couldn’t escape!"); }
    else if (kind === "swap") { const alt = G.squad.find((c, i) => c.hp > 0 && i !== G.lead); if (!alt) return; G.lead = G.squad.indexOf(alt); setPartner(); log("Go, " + alt.n + "!"); }
    else if (kind === "potion") { if (!o.potion) return; if (!G.potions) { log("You have no Potions left!"); return; } G.potions--; m.hp = Math.min(m.max, m.hp + 60); float(partnerH, "+60", "g"); log("You used a Potion. " + m.n + " recovered HP!"); }
    else if (kind === "ball") {
      if (!o.ball || f.boss) return; const bl = pickBall(); if (!bl) { log("You’re out of Poké Balls!"); return; } try { useBall(bl.id); saveInventory(); } catch (e) {}
      if (Math.random() < Math.min(0.9, 0.12 + 0.75 * (1 - f.hp / f.max)) * (f.k === 3 ? 0.6 : 1) * bl.m) {
        try { if (!isCaptured(f.s)) capturePokemon({ name: f.s, id: f.id, types: f.t }, bl.id); } catch (e) {}
        f.cd = 0; f.hp = Math.max(1, Math.round(f.max * 0.6)); if (G.squad.length < 6) G.squad.push(f);
        log("Gotcha! " + f.n + " joined your squad and your Pokédex!"); float(foeH, "GOTCHA!", "y"); foeH.userData.sink = true; return endBattle("caught", 1200);
      }
      log("It broke free!"); float(foeH, "BROKE FREE", "r");
    } else {
      if (kind === "sp") { if (m.cd > 0) return; m.cd = o.cd || 3; }
      const r = dmg(m, f, kind === "sp" ? 1.7 : 1); f.hp = Math.max(0, f.hp - r.v); moveEffect(m.t[0] || "normal", foeH, kind === "sp" ? "POWER " + cap(m.t[0] || "normal") : cap(m.t[0] || "normal") + " HIT"); lungeTo(partnerH, partnerH.position, foeH.position); foeH.userData.flash = 0.25; foeH.userData.mat.color.set(0xff7070);
      float(foeH, r.e === 0 ? "NO EFFECT" : "-" + r.v, r.e > 1 ? "y" : ""); log(m.n + (kind === "sp" ? " unleashes a special" : " attacks") + " for " + r.v + effTxt(r.e));
      if (f.hp <= 0) { foeH.userData.sink = true; let ms = 1300; if (G.story) { const xg = gainXp(f); log(f.n + " fainted! " + m.n + " gained " + xg.base + " XP!" + (xg.out.length ? " " + xg.out.join(" ") : "")); ms = 2500; } return endBattle("win", ms); }
    }
    ui(); foeTurn();
  }
  function foeTurn() {
    B.lock = true;
    later(() => {
      if (!B) return; B.turn++; G.squad.forEach((c) => { c.cd = Math.max(0, (c.cd || 0) - 1); });
      const m = me(), f = B.foe, big = f.boss && B.turn % 4 === 0, r = dmg(f, m, big ? 1.7 : f.boss ? 1.05 : (B.o.fm || 0.9));
      m.hp = Math.max(0, m.hp - r.v); moveEffect(f.t[0] || "normal", partnerH, big ? "ULTIMATE " + cap(f.t[0] || "psychic") : cap(f.t[0] || "normal") + " STRIKE"); lungeTo(foeH, foeH.position, partnerH.position); partnerH.userData.flash = 0.25; partnerH.userData.mat.color.set(0xff7070);
      float(partnerH, r.e === 0 ? "NO EFFECT" : "-" + r.v, "r");
      log(f.n + (big ? " unleashes Psystrike" : " hits " + m.n) + " for " + r.v + effTxt(r.e) + (m.hp <= 0 ? " " + m.n + " fainted!" : ""));
      B.lock = false; ui();
      if (!me()) { B.lock = true; later(() => endBattle("lose", 0), 1000); } else if (m.hp <= 0) setPartner();
    }, 820);
  }
  function gainXp(foe) {
    const base = Math.round(foe.lv * 4 * (B.o.trainer ? 1.5 : 1) * (B.o.xpMult || 1)), lead = me(), out = [];
    G.squad.forEach((c) => { if (c.hp <= 0) return; c.xp = (c.xp || 0) + (c === lead ? base : Math.round(base * 0.5)); while (c.xp >= xpNeed(c.lv) && c.lv < 60) { c.xp -= xpNeed(c.lv); c.lv++; const om = c.max; restat(c); c.hp = Math.min(c.max, c.hp + c.max - om); out.push(c.n + " grew to Lv." + c.lv + "!"); } });
    return { base, out };
  }
  function endBattle(res, ms) {
    if (!B) return; B.lock = true; const o = B.o, fp = B.foePos.clone(), cb = o.done;
    later(() => {
      if (!(res === "run" && o.h) && foeH) scene.remove(foeH);
      foeH = null; B = null; $("av-battle").hidden = true; $("av-bottom").style.display = ""; ovl(true); if (mode && G && !G.over) showPad(true); refresh();
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
  function blocked(x, z) { return !inGrassFree(x, z) || (mode === "story" && gateHit(x, z)); }
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

  /* ============================================================
     STORY ADVENTURE — a Pokémon-ROM style journey
     Seedling Town → six cities → Victory Road → Championship Stadium.
     Build a trainer profile, travel with Maya and Leo, complete city
     tasks, earn six badges and win the Grand League tournament.
  ============================================================ */
  const RT = [
    { ids: [19, 133, 43, 41, 25, 39], rare: [63], lv: [3, 6] },
    { ids: [74, 66, 54, 63, 81, 58, 92], rare: [133], lv: [8, 12] },
    { ids: [93, 75, 64, 67, 42, 44, 59], rare: [143], lv: [14, 18] },
    { ids: [43, 44, 59, 1, 2, 3], rare: [143], lv: [20, 25] },
    { ids: [58, 59, 5, 6, 74, 75], rare: [130], lv: [25, 30] },
    { ids: [63, 64, 65, 92, 93, 94, 149], rare: [150], lv: [30, 36] },
  ];
  const BADGES = [{ ic: "🪨", n: "Stone" }, { ic: "💧", n: "Wave" }, { ic: "⚡", n: "Spark" }, { ic: "🍃", n: "Grove" }, { ic: "🔥", n: "Ember" }, { ic: "🌙", n: "Lunar" }];
  const REG = { trainers: [], npcs: [], inter: [], gates: [], patches: [], builds: [], starters: [] };
  const SCOL = [];
  let regionBuilt = false, DL = null;
  const locName = (x) => (x < -56 ? "Seedling Town" : x < -22 ? "Route 1" : x < 16 ? "Stonebrook City" : x < 52 ? "Route 2" : x < 93 ? "Bluewater City" : x < 128 ? "Route 3" : x < 171 ? "Voltport City" : x < 210 ? "Route 4" : x < 248 ? "Verdant City" : x < 286 ? "Route 5" : x < 325 ? "Cinder City" : x < 363 ? "Route 6" : x < 402 ? "Moonfall City" : x < 445 ? "Victory Road" : "Championship Stadium");
  const lines = (n, arr) => arr.map((t) => ({ n, t }));

  /* ----- dialogue (white ROM-style text box) ----- */
  function dialog(arr, cb) { DL = { lines: arr.map((l) => (typeof l === "string" ? { t: l } : l)), i: 0, pos: 0, cb }; const d = $("av-dlg"); d.hidden = false; renderDlg(); }
  function renderDlg() { const L = DL.lines[DL.i]; DL.pos = 0; $("av-dlg").innerHTML = '<div class="nm">' + (L.n || "") + '</div><div class="tx"></div><i>▼</i>'; }
  function paintDlg() { if (!DL) return; const L = DL.lines[DL.i], e = $("av-dlg").querySelector(".tx"); if (e) e.textContent = L.t.slice(0, Math.floor(DL.pos)); }
  function advanceDlg() {
    if (!DL) return false; const L = DL.lines[DL.i];
    if (DL.pos < L.t.length) { DL.pos = L.t.length; paintDlg(); return true; }
    DL.i++;
    if (DL.i >= DL.lines.length) { const cb = DL.cb; DL = null; $("av-dlg").hidden = true; if (cb) cb(); } else renderDlg();
    return true;
  }
  function interact() { if (DL) { advanceDlg(); return; } if (mode !== "story" || !G || G.cut || B || modalOpen()) return; if (G.near) G.near.fn(); }
  function transition(cb) { const f = $("av-flash"); f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); later(() => { cb(); setTimeout(() => f.classList.remove("on"), 60); }, 720); }

  /* ----- save / load ----- */
  const unpack = (o) => { const c = mkL(SPECIES[o.id], o.lv); c.xp = o.xp || 0; c.hp = Math.max(0, Math.min(c.max, o.hp == null ? c.max : o.hp)); return c; };
  function saveStory() {
    if (!G || !G.story) return; const S = A.story;
    S.squad = G.squad.map((c) => ({ id: c.id, lv: c.lv, xp: c.xp || 0, hp: c.hp })); S.potions = G.potions; S.badges = G.badges; S.def = G.def; S.flags = G.flags; S.pos = { x: P.x, z: P.z }; save();
  }
  function healAll() { G.squad.forEach((c) => { c.hp = c.max; c.cd = 0; }); refresh(); setPartner(); saveStory(); }
  function giveGems(n) { try { gems += n; saveStoredNumber(GEMS_KEY, gems); updateResourcesUI(); } catch (e) {} }

  /* ----- world pieces ----- */
  function labelSprite(text, w, bg, fg) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128; const x = c.getContext("2d");
    x.fillStyle = bg || "rgba(10,20,40,.88)"; x.fillRect(6, 6, 500, 116); x.lineWidth = 6; x.strokeStyle = fg || "#ffcf45"; x.strokeRect(6, 6, 500, 116);
    x.fillStyle = fg || "#fff"; x.font = "900 54px Rajdhani, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 256, 68);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); sp.scale.set(w, w / 4, 1); return sp;
  }
  function building(o) {
    const b = new THREE.Group(), { w, d, h } = o;
    b.add(mesh(new THREE.BoxGeometry(w, h, d), lam(o.wall), 0, h / 2, 0), mesh(new THREE.BoxGeometry(w + 0.2, 0.35, d + 0.2), lam(o.trim || 0xffffff), 0, h, 0));
    const rg = new THREE.Group(), rf = mesh(new THREE.ConeGeometry((d / Math.SQRT2) * 1.08, o.rh || 2.4, 4), lam(o.roof), 0, h + (o.rh || 2.4) / 2, 0); rf.rotation.y = Math.PI / 4; rg.add(rf); rg.scale.set(w / d, 1, 1); b.add(rg);
    b.add(mesh(new THREE.BoxGeometry(1.2, 1.8, 0.14), lam(0x7a5230), 0, 0.9, d / 2 + 0.03));
    [-1, 1].forEach((k) => { if (w > 4) b.add(mesh(new THREE.BoxGeometry(0.9, 0.9, 0.14), lam(0x8fd0ff, { emissive: 0x16304a }), k * w * 0.3, h * 0.55, d / 2 + 0.03)); });
    if (o.text) { const l = labelSprite(o.text, Math.max(5, w * 0.9), o.bg, o.tc); l.position.set(0, h + (o.rh || 2.4) + 1.1, d / 2 - 0.5); b.add(l); }
    b.position.set(o.x, 0, o.z); region.add(b);
    for (let ox = -w / 2 + 1.4; ox <= w / 2 - 1.2; ox += 2.4) SCOL.push({ x: o.x + ox, z: o.z, r: d / 2 - 0.1 });
    REG.builds.push({ x: o.x, z: o.z, w, d, col: "#" + o.roof.toString(16).padStart(6, "0") });
  }
  function npc(o) {
    const m = makeTrainer(o.c1 || 0x3d6bff, o.c2 || 0xffffff); m.position.set(o.x, 0, o.z); m.rotation.y = o.rot || 0; region.add(m); o.mesh = m;
    if (o.tag) { const l = labelSprite(o.tag, 4.6, "rgba(10,20,40,.88)", o.tc || "#ffcf45"); l.position.set(0, 3, 0); m.add(l); }
    REG.npcs.push(o); SCOL.push({ x: o.x, z: o.z, r: 0.6 });
    if (o.talk) REG.inter.push({ ref: o, r: 2.7, label: o.label || "Talk", when: o.when, fn: () => { m.rotation.y = Math.atan2(P.x - o.x, P.z - o.z); o.talk(o); } });
    return o;
  }
  const gateHit = (x, z) => REG.gates.some((g) => !g.req() && Math.abs(x - g.x) < 1);
  function refreshStory() {
    REG.gates.forEach((g) => { g.mesh.visible = !g.req(); });
    REG.starters.forEach((s) => { s.visible = !G.flags.starter; });
    REG.trainers.forEach((T) => { if (T.mesh) T.mesh.visible = true; });
  }

  /* ----- shops, healing, party ----- */
  function martMenu() {
    const items = [{ id: "pokeball", n: "Poké Ball", p: 150, ic: "⚪" }, { id: "great", n: "Great Ball", p: 300, ic: "🔵" }, { id: "ultra", n: "Ultra Ball", p: 600, ic: "🟡" }, { id: "potion", n: "Potion", p: 80, ic: "🧪", d: "Heals 60 HP (use in battle or from the Party menu)" }];
    const draw = () => { let c = 0; try { c = coins; } catch (e) {}
      modal(`<h2>POKÉ MART</h2><p>You have <b style="color:#ffcf45">🥮 ${c.toLocaleString()}</b></p><div class="av-shop">${items.map((i) => `<div class="av-item"><span style="font-size:24px">${i.ic}</span><div><b>${i.n}</b><span>${i.d || "Owned: " + (() => { try { return getBallCount(i.id); } catch (e) { return 0; } })()}</span></div><button class="av-btn" data-b="${i.id}" ${c >= i.p ? "" : "disabled"}>🥮 ${i.p}</button></div>`).join("")}</div><div class="av-row2"><button class="av-btn" data-a="x">DONE</button></div>`, (m) => {
        m.querySelectorAll("[data-b]").forEach((b) => { b.onclick = () => { const it = items.find((x) => x.id === b.dataset.b); let c2 = 0; try { c2 = coins; } catch (e) {} if (c2 < it.p) return; addCoins(-it.p); if (it.id === "potion") G.potions++; else { try { addBalls(it.id, 1); saveInventory(); } catch (e) {} } saveStory(); refresh(); draw(); }; });
        m.querySelector("[data-a=x]").onclick = closeModal;
      }); };
    draw();
  }
  function partyMenu() {
    if (!G || !G.story || B || DL) return;
    const draw = () => modal(`<h2>PARTY</h2><div class="av-stats"><div class="av-stat"><small>BADGES</small><b>${G.badges.length}/6</b></div><div class="av-stat"><small>POTIONS</small><b>${G.potions}</b></div><div class="av-stat"><small>BALLS</small><b>${ballCount()}</b></div></div>
      <div class="av-shop">${G.squad.map((c, i) => `<div class="av-item"><img src="${ART + c.id}.png" alt="" style="width:46px;height:46px;object-fit:contain"><div><b>${c.n} Lv.${c.lv}${i === G.lead ? " ★" : ""}</b><span>HP ${c.hp}/${c.max} · ATK ${c.a} · XP ${c.xp}/${xpNeed(c.lv)}</span><span class="av-bar"><u class="${hpCls(c)}" style="width:${c.hp / c.max * 100}%"></u></span></div><div style="display:flex;flex-direction:column;gap:4px"><button class="av-btn ghost" data-l="${i}" ${c.hp > 0 && i !== G.lead ? "" : "disabled"}>LEAD</button><button class="av-btn ghost" data-p="${i}" ${c.hp > 0 && c.hp < c.max && G.potions > 0 ? "" : "disabled"}>🧪</button></div></div>`).join("") || "<p>You have no Pokémon yet.</p>"}</div>
      <div class="av-row2"><button class="av-btn ghost" data-a="exit">SAVE & EXIT</button><button class="av-btn" data-a="x">RESUME</button></div>`, (m) => {
      m.querySelectorAll("[data-l]").forEach((b) => { b.onclick = () => { G.lead = +b.dataset.l; setPartner(true); refresh(); saveStory(); draw(); }; });
      m.querySelectorAll("[data-p]").forEach((b) => { b.onclick = () => { const c = G.squad[+b.dataset.p]; G.potions--; c.hp = Math.min(c.max, c.hp + 60); refresh(); saveStory(); draw(); }; });
      m.querySelector("[data-a=x]").onclick = closeModal; m.querySelector("[data-a=exit]").onclick = () => { saveStory(); menu(); };
    });
    draw();
  }

  /* ----- battles ----- */
  function storyBattle(foe, o) {
    const fx = Math.sin(P.rot), fz = Math.cos(P.rot);
    const foePos = new THREE.Vector3(P.x + fx * 4.8, 0, P.z + fz * 4.8), mePos = new THREE.Vector3(P.x + fx * 1.6 - fz * 1.1, 0, P.z + fz * 1.6 + fx * 1.1);
    startBattle(foe, Object.assign({ mePos, foePos, swap: true, potion: true }, o));
  }
  function evolveCheck(cb) {
    const list = G.squad.filter((c) => EVO[c.id] && c.lv >= EVO[c.id][1]);
    const step = () => {
      const c = list.shift(); if (!c) { if (cb) cb(); return; } const to = SPECIES[EVO[c.id][0]]; if (!to) return step();
      dialog(["What? " + c.n + " is evolving!", c.n + " evolved into " + to.n + "!"], () => { const om = c.max; Object.assign(c, { id: to.id, n: to.n, s: to.s, t: to.t, k: to.k }); restat(c); c.hp = Math.min(c.max, c.hp + c.max - om); try { sfxEvolve(); } catch (e) {} setPartner(true); refresh(); saveStory(); step(); });
    };
    step();
  }
  function blackout() {
    G.cut = true; const l = Math.min(100, Math.floor((() => { try { return coins; } catch (e) { return 0; } })() * 0.1)); if (l > 0) addCoins(-l);
    G.squad.forEach((c) => { c.hp = c.max; c.cd = 0; }); const sp = A.story.spawn || { x: -80, z: 2 }; P.x = sp.x; P.z = sp.z; setPartner(true); refreshStory();
    dialog(["You blacked out!", "You were rushed back to the nearest healing spot" + (l ? " and lost 🥮 " + l + "." : ".")], () => { G.cut = false; saveStory(); refresh(); });
  }
  function storyAfter(res) { G.cut = false; if (res === "lose") return blackout(); saveStory(); refresh(); evolveCheck(); }
  function wild(ri) {
    const rt = RT[ri], sp = SPECIES[rnd(Math.random() < 0.07 ? rt.rare : rt.ids)], lv = rt.lv[0] + Math.floor(Math.random() * (rt.lv[1] - rt.lv[0] + 1)), foe = mkL(sp, lv);
    G.cut = true; transition(() => storyBattle(foe, { ball: true, run: true, fm: 0.65, intro: "A wild " + foe.n + " (Lv." + lv + ") appeared!", done: storyAfter }));
  }
  function trainerBattle(T) {
    const team = (typeof T.team === "function" ? T.team() : T.team).map(([id, lv]) => mkL(SPECIES[id], lv)); let i = 0; G.cut = true;
    const won = () => {
      T.mesh.visible = true; G.cut = false; if (T.id && !G.def.includes(T.id)) G.def.push(T.id); addCoins(T.reward || 0); saveStory(); refresh();
      dialog([...lines(T.name, T.win), "You received 🥮 " + (T.reward || 0) + "!"], () => evolveCheck(() => { if (T.after) T.after(); }));
    };
    const nextFoe = () => { const foe = team[i++]; storyBattle(foe, { trainer: true, fm: T.fm || 0.72, xpMult: T.xpm || 1, intro: T.name + " sends out " + foe.n + " (Lv." + foe.lv + ")!", done: (res) => { if (res === "lose") { T.mesh.visible = true; return blackout(); } if (i < team.length) evolveCheck(() => later(nextFoe, 400)); else won(); } }); };
    transition(() => { T.mesh.visible = false; nextFoe(); });
  }
  function engageTrainer(T) {
    G.cut = true; P.moving = false; float(T.mesh, "!", "y"); T.mesh.rotation.y = Math.atan2(P.x - T.x, P.z - T.z); P.rot = Math.atan2(T.x - P.x, T.z - P.z);
    later(() => { G.walk = { T, then: () => dialog(lines(T.name, T.intro), () => trainerBattle(T)) }; }, 700);
  }

  function leagueRoom() {
    if (G.badges.length < 6) return dialog(lines("League Host", ["The Grand League is not open yet. Earn all six Gym Badges first."]));
    if (G.flags.champ) return dialog(lines("League Host", ["Welcome back, Champion " + (A.story.profile.name || "Trainer") + "! Your title is safe for now."]));
    modal(`<div class="av-room" style="--gym-bg:#101a36;--gym-trim:#53649a;--gym-accent:#ffcf45;--gym-floor:#202d50"><div class="av-tag">GRAND LEAGUE · CHAMPIONSHIP STADIUM</div><h2>🏆 THE SIX-BADGE TOURNAMENT</h2><div class="av-room-floor"><span>🥇</span><span>⚔️</span><span>🏆</span></div><p>Four rounds stand between you and the title. Your friends Maya and Leo are also competing.</p><div class="av-task">1 · Qualifier — Kai</div><div class="av-task">2 · Semi-final — Maya</div><div class="av-task">3 · Finalist — Leo</div><div class="av-task">4 · Championship — Orion</div><div class="av-row2"><button class="av-btn ghost" data-a="leave">NOT YET</button><button class="av-btn" data-a="start">ENTER TOURNAMENT</button></div></div>`, (m) => { m.querySelector('[data-a=leave]').onclick = closeModal; m.querySelector('[data-a=start]').onclick = () => { closeModal(); runLeagueTournament(); }; });
  }
  function runLeagueTournament() {
    const rounds = [
      { name:"Qualifier Kai", team:[[54,34],[130,35]], reward:500, intro:["Round one! Show us your skill."], win:["You advanced to the semi-final!"] },
      { name:"Maya", team:[[133,36],[43,37],[3,38]], reward:700, intro:["We made it to the tournament! May the best friend win."], win:["You edged past Maya. One more friend to face!"] },
      { name:"Leo", team:[[58,37],[26,39],[6,40]], reward:900, intro:["I promised I would give you my best. Here it comes!"], win:["You defeated Leo and reached the championship match!"] },
      { name:"Orion", team:[[65,40],[130,41],[248,42],[6,43],[149,44],[150,46]], reward:3000, intro:["I am Orion, the reigning League finalist.","This is the championship battle. Give it everything!"], win:["You did it! You are the new champion of the region!"] }
    ];
    let round = 0;
    const next = () => {
      const data = rounds[round++];
      const T = Object.assign({ id:"league_round_"+round, mesh:{visible:true}, fm:0.86, xpm:2 }, data);
      T.after = () => { if (round < rounds.length) dialog(lines("League Host", ["Round " + round + " complete! Prepare for the next match."]), () => later(next, 450)); else { G.flags.champ = true; giveGems(50); saveStory(); dialog(["🏆 YOU ARE THE GRAND LEAGUE CHAMPION!", "Your trainer ID " + A.story.profile.id + " is now recorded in the Hall of Fame.", "You earned 💎 50 gems!"]); } };
      trainerBattle(T);
    };
    next();
  }

  function gymRoom(T) {
    const themes = { gym0:["#342817","#806238","#d7bd83","🪨","Rock cavern"], gym1:["#092b45","#247db1","#8fd0ff","💧","Tidal arena"], gym2:["#332900","#b28a00","#ffe36b","⚡","Power plant"], gym3:["#17391d","#388a45","#9be89b","🍃","Forest sanctuary"], gym4:["#4a2014","#b64a28","#ffb17a","🔥","Magma chamber"], gym5:["#211d48","#554a9b","#c9c0ff","🌙","Moonlit observatory"] };
    const th = themes[T.id] || themes.gym0, done = G.def.includes(T.id), badgeIndex = Number(T.id.replace("gym", ""));
    modal(`<div class="av-room" style="--gym-bg:${th[0]};--gym-trim:${th[1]};--gym-accent:${th[2]};--gym-floor:${th[0]}"><div class="av-tag">${th[4]} · CITY GYM</div><h2>${th[3]} ${T.name.toUpperCase()}’S GYM</h2><div class="av-room-floor"><span>🏟️</span><span>${th[3]}</span><span>🏆</span></div><p style="text-align:center">${done ? "You have already earned this badge." : "Enter the battle floor and challenge the Gym Leader."}</p><div class="av-task"><span>👤</span><span><b>Gym Leader ${T.name}</b><br>${T.intro[0]}</span></div><div class="av-task"><span>🎖️</span><span>Badge reward: <b>${BADGES[badgeIndex] ? BADGES[badgeIndex].n : "League"} Badge</b></span></div><div class="av-row2"><button class="av-btn ghost" data-a="leave">LEAVE ROOM</button><button class="av-btn" data-a="battle" ${done ? "disabled" : ""}>${done ? "BADGE EARNED" : "CHALLENGE LEADER"}</button></div></div>`, (m) => { m.querySelector('[data-a=leave]').onclick = closeModal; const b=m.querySelector('[data-a=battle]'); if (b) b.onclick = () => { closeModal(); if (G.def.includes(T.id)) return; dialog(lines(T.name, T.intro), () => trainerBattle(T)); }; });
  }

  /* ----- building the region ----- */
  function buildRegion() {
    if (regionBuilt) return; regionBuilt = true;
    let seed = 23; const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    region = new THREE.Group(); scene.add(region); region.userData.clouds = [];
    const gt = grassTex(); gt.repeat.set(66, 27); const ground = mesh(new THREE.PlaneGeometry(580, 180), lam(0xffffff, { map: gt }), 190, 0, 0); ground.rotation.x = -Math.PI / 2; region.add(ground);
    const path = mesh(new THREE.PlaneGeometry(552, 5.5), lam(0xcdb98a), 176, 0.025, 0); path.rotation.x = -Math.PI / 2; region.add(path);
    const TOWNS = [["SEEDLING TOWN", -95, -56], ["STONEBROOK CITY", -22, 16], ["BLUEWATER CITY", 52, 93], ["VOLTPORT CITY", 128, 171], ["VERDANT CITY", 210, 248], ["CINDER CITY", 286, 325], ["MOONFALL CITY", 363, 402], ["CHAMPIONSHIP STADIUM", 445, 475]];
    TOWNS.forEach(([n, a, b]) => {
      const pl = mesh(new THREE.PlaneGeometry(b - a, 15), lam(0xdcd2ac), (a + b) / 2, 0.03, -3); pl.rotation.x = -Math.PI / 2; region.add(pl);
      const sx = a + 5, post = mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), lam(0x7a5230), sx, 1.2, 5); const lb = labelSprite(n, 8, "rgba(10,20,40,.9)", "#8fe6ff"); lb.position.set(sx, 3.4, 5); region.add(post, lb);
    });
    /* buildings */
    const B0 = { z: -12.5, d: 6, h: 3 };
    [{ x: -86, w: 5, wall: 0xf0e2c0, roof: 0xc4483c, text: "YOUR HOME" }, { x: -70, w: 8, d: 7, h: 3.6, wall: 0xe8eefc, roof: 0x3d6bb0, text: "PROF. LAB" }, { x: -62, w: 5, wall: 0xf0e2c0, roof: 0x2f8a5a },
      { x: -15, w: 5, wall: 0xfff0f0, roof: 0xe84a5f, text: "POKÉMON CENTER" }, { x: -5, w: 5, wall: 0xe8f2ff, roof: 0x3d6bff, text: "POKÉ MART" }, { x: 7, w: 9, d: 7, h: 4, wall: 0xb9a37a, roof: 0x6b5a3a, text: "STONE GYM", bg: "#3a2d18", tc: "#e6d2a0" },
      { x: 60, w: 5, wall: 0xfff0f0, roof: 0xe84a5f, text: "POKÉMON CENTER" }, { x: 70, w: 5, wall: 0xe8f2ff, roof: 0x3d6bff, text: "POKÉ MART" }, { x: 82, w: 9, d: 7, h: 4, wall: 0xb8e2f5, roof: 0x2b7fd0, text: "WAVE GYM", bg: "#0b2a4a", tc: "#8fd0ff" },
      { x: 136, w: 5, wall: 0xfff0f0, roof: 0xe84a5f, text: "POKÉMON CENTER" }, { x: 146, w: 5, wall: 0xe8f2ff, roof: 0x3d6bff, text: "POKÉ MART" }, { x: 158, w: 9, d: 7, h: 4, wall: 0xf7e99a, roof: 0xd9a400, text: "SPARK GYM", bg: "#3a3000", tc: "#ffe36b" },
      { x: 178, w: 5, wall: 0xfff0f0, roof: 0xe84a5f, text: "POKÉMON CENTER" }, { x: 188, w: 10, d: 8, h: 8, wall: 0x5a4f8a, roof: 0x2a2250, rh: 4, text: "CHAMPION TOWER", bg: "#1e1640", tc: "#c9b8ff" },
      { x: 218, w: 5, wall: 0xfff0f0, roof: 0xe84a5f, text: "POKÉMON CENTER" }, { x: 228, w: 5, wall: 0xe8f2ff, roof: 0x3d6bff, text: "POKÉ MART" }, { x: 235, w: 9, d: 7, h: 4, wall: 0xcce8c4, roof: 0x388a45, text: "GROVE GYM", bg: "#17391d", tc: "#9be89b" },
      { x: 294, w: 5, wall: 0xfff0f0, roof: 0xe84a5f, text: "POKÉMON CENTER" }, { x: 304, w: 5, wall: 0xe8f2ff, roof: 0x3d6bff, text: "POKÉ MART" }, { x: 310, w: 9, d: 7, h: 4, wall: 0xf4c5a0, roof: 0xd85a32, text: "EMBER GYM", bg: "#4a2014", tc: "#ffb17a" },
      { x: 371, w: 5, wall: 0xfff0f0, roof: 0xe84a5f, text: "POKÉMON CENTER" }, { x: 381, w: 5, wall: 0xe8f2ff, roof: 0x3d6bff, text: "POKÉ MART" }, { x: 385, w: 9, d: 7, h: 4, wall: 0xbcb9df, roof: 0x554a9b, text: "LUNAR GYM", bg: "#211d48", tc: "#c9c0ff" },
      { x: 458, w: 18, d: 12, h: 10, rh: 5, wall: 0xd8e3f0, roof: 0x3b456d, text: "GRAND LEAGUE", bg: "#101a36", tc: "#ffcf45" }].forEach((o) => building(Object.assign({}, B0, o, { z: -12.5 })));
    [[-80, 11], [-68, 12], [-8, 11], [12, 12], [66, 11], [86, 12], [142, 11], [162, 12]].forEach(([x, z]) => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(4, 2.6, 4), lam(0xf0e2c0), 0, 1.3, 0), mesh(new THREE.ConeGeometry(3.1, 1.9, 4), lam([0xc4483c, 0x3d6bb0, 0x7a5aa8, 0x2f8a5a][Math.floor(r() * 4)]), 0, 3.5, 0), mesh(new THREE.BoxGeometry(0.9, 1.5, 0.12), lam(0x7a5230), 0, 0.75, -2.03)); g.children[1].rotation.y = Math.PI / 4; g.position.set(x, 0, z); region.add(g); SCOL.push({ x, z, r: 2.6 }); REG.builds.push({ x, z, w: 4, d: 4, col: "#8a6a4a" }); });
    /* tall grass */
    const blades = []; [[-52, -24, 0], [18, 50, 1], [94, 126, 2], [180, 205, 3], [256, 281, 4], [333, 358, 5]].forEach(([a, b, ri]) => { for (let i = 0; i < 3; i++) { const w = (b - a) / 3; REG.patches.push({ x: a + (i + 0.5) * w, z: i % 2 ? 3 : -3, w: w + 1.2, d: 11, r: ri }); } });
    REG.patches.forEach((p) => { const pl = mesh(new THREE.PlaneGeometry(p.w, p.d), lam(0x3f8f3a), p.x, 0.04, p.z); pl.rotation.x = -Math.PI / 2; region.add(pl); for (let i = 0; i < 90; i++) blades.push([p.x + (r() - 0.5) * p.w, p.z + (r() - 0.5) * p.d, 0.7 + r() * 0.7]); });
    const dm = new THREE.Object3D(), col = new THREE.Color(), bl = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.9, 4), lam(0xffffff), blades.length);
    blades.forEach((b, i) => { dm.rotation.set(0, r() * 6, 0); dm.scale.setScalar(b[2]); dm.position.set(b[0], 0.4 * b[2], b[1]); dm.updateMatrix(); bl.setMatrixAt(i, dm.matrix); col.setHSL(0.3 + r() * 0.06, 0.6, 0.28 + r() * 0.12); bl.setColorAt(i, col); });
    bl.instanceMatrix.needsUpdate = true; bl.instanceColor.needsUpdate = true; region.add(bl);
    /* gates (guard + barrier, blocks the road until requirement is met) */
    [{ x: -57, msg: "Hey, wait! It’s dangerous out there without a Pokémon. Go see Prof. Linden and beat your rival first!", req: () => G.flags.starter && G.def.includes("rival") },
      { x: 16.5, msg: "Stonebrook Gym blocks the way east. Earn the Stone Badge first, then I’ll let you through to Route 2.", req: () => G.badges.includes(0) },
      { x: 93, msg: "Route 3 is closed to trainers without the Wave Badge. Beat Marina in Bluewater Gym!", req: () => G.badges.includes(1) },
      { x: 171.5, msg: "The western road is closed. Earn the Spark Badge in Voltport Gym!", req: () => G.badges.length >= 3 },
      { x: 248.5, msg: "Verdant Pass is sealed. Earn the Grove Badge!", req: () => G.badges.length >= 4 },
      { x: 325.5, msg: "Cinder Road is sealed. Earn the Ember Badge!", req: () => G.badges.length >= 5 },
      { x: 402.5, msg: "Victory Road is reserved for six-badge trainers. Earn the Lunar Badge!", req: () => G.badges.length >= 6 }].forEach((g) => {
      const m = new THREE.Group(); for (let z = -7; z <= 7; z += 2.8) m.add(mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), lam(Math.abs(z) % 5.6 < 0.1 ? 0x222222 : 0xffd43b), 0, 0.8, z));
      m.add(mesh(new THREE.BoxGeometry(0.2, 0.3, 15), lam(0xffffff), 0, 1.3, 0)); const gd = makeTrainer(0x3a3a4a, 0xffd43b); gd.position.set(0, 0, 3); gd.rotation.y = -Math.PI / 2; m.add(gd); m.position.x = g.x; region.add(m); g.mesh = m; REG.gates.push(g);
    });
    /* starter table + professor + mom */
    [[1, -73], [4, -70], [7, -67]].forEach(([id, x]) => {
      const sp = SPECIES[id], b = new THREE.Group(); b.add(mesh(new THREE.SphereGeometry(0.46, 16, 12), lam(0xffffff), 0, 0.5, 0), mesh(new THREE.SphereGeometry(0.47, 16, 8, 0, 6.283, 0, 1.57), lam(0xe53935), 0, 0.5, 0), mesh(new THREE.TorusGeometry(0.46, 0.05, 6, 20), lam(0x222222), 0, 0.5, 0)); b.children[2].rotation.x = Math.PI / 2;
      const l = labelSprite(sp.n, 3.2, "rgba(10,20,40,.9)", "#fff"); l.position.y = 1.7; b.add(l); b.position.set(x, 0, -3.6); region.add(b); REG.starters.push(b);
      REG.inter.push({ x, z: -3.6, r: 1.9, label: "Take " + sp.n, when: () => G.flags.intro && !G.flags.starter, fn: () => chooseStarter(id) });
    });
    npc({ x: -70, z: -6.6, rot: 0, c1: 0xeeeeee, c2: 0x6b4a2a, tag: "PROF. LINDEN", label: "Talk", talk: () => dialog(G.flags.starter ? lines("Prof. Linden", ["Take care out there! Win badges, catch Pokémon, and become Champion!", "Your Pokémon level up when they win battles. Heal at Pokémon Centers!"]) : lines("Prof. Linden", ["Choose one of the three Pokémon on the table!"])) });
    npc({ x: -86, z: -8, rot: 0, c1: 0xe0679a, c2: 0x6b3a2a, tag: "MOM", talk: () => dialog(lines("Mom", ["Welcome home, dear! You look tired. Let me heal your Pokémon."]), () => { healAll(); A.story.spawn = { x: -86, z: -5 }; dialog(lines("Mom", ["All better! Do your best out there!"])); }) });
    const nurse = (x) => npc({ x, z: -8, rot: 0, c1: 0xff8fb1, c2: 0xffffff, tag: "NURSE", talk: (n) => dialog(lines("Nurse", ["Welcome to the Pokémon Center! Let me heal your Pokémon."]), () => { healAll(); A.story.spawn = { x: n.x, z: -5 }; dialog(lines("Nurse", ["Your Pokémon are fully healed! We hope to see you again!"])); }) });
    const clerk = (x) => npc({ x: x, z: -8, rot: 0, c1: 0x3d6bff, c2: 0x3d6bff, tag: "CLERK", talk: () => martMenu() });
    nurse(-15); clerk(-5); nurse(60); clerk(70); nurse(136); clerk(146); nurse(178); nurse(218); clerk(228); nurse(294); clerk(304); nurse(371); clerk(381);
    /* gym leaders + champion */
    const lead = (o) => { const T = Object.assign({ sight: 0, fm: 0.8, xpm: 1.4, label: "Enter Gym" }, o); T.talk = () => { if (T.when && !T.when()) return dialog(lines("League Official", ["The Grand League opens only after you earn all six Gym Badges."])); gymRoom(T); }; npc(T); REG.trainers.push(T); };
    lead({ id: "gym0", name: "Flint", tag: "GYM LEADER FLINT", x: 7, z: -8, rot: 0, c1: 0x8a6a3a, c2: 0xcdb98a, team: [[74, 11], [74, 12], [75, 14]], reward: 300, intro: ["I’m Flint, Stonebrook’s Gym Leader!", "My rock-hard Pokémon will crush you!"], win: ["Amazing! You cracked my defense. Take the Stone Badge!"], done: ["The Stone Badge suits you. Keep climbing!"], after: () => { G.badges.push(0); refreshStory(); saveStory(); dialog(["You received the 🪨 Stone Badge!", "The road to Route 2 is now open."]); } });
    lead({ id: "gym1", name: "Marina", tag: "GYM LEADER MARINA", x: 82, z: -8, rot: 0, c1: 0x2b7fd0, c2: 0xffffff, team: [[54, 16], [8, 18], [130, 20]], reward: 500, intro: ["I’m Marina! Water flows around every attack.", "Let’s see if you can make a splash!"], win: ["You swept me away! Here’s the Wave Badge."], done: ["The Wave Badge looks great on you."], after: () => { G.badges.push(1); refreshStory(); saveStory(); dialog(["You received the 💧 Wave Badge!", "Route 3 is now open."]); } });
    lead({ id: "gym2", name: "Volt", tag: "GYM LEADER VOLT", x: 158, z: -8, rot: 0, c1: 0xd9a400, c2: 0x222222, team: [[81, 21], [25, 22], [26, 25]], reward: 800, intro: ["Bzzzt! I’m Volt, Voltport’s Gym Leader!", "Prepare to be shocked!"], win: ["Electrifying! The Spark Badge is yours!"], done: ["Go on, the Champion awaits you."], after: () => { G.badges.push(2); refreshStory(); saveStory(); dialog(["You received the ⚡ Spark Badge!", "Champion’s Peak is now open."]); } });
    lead({ id: "gym3", name: "Fern", tag: "GYM LEADER FERN", x: 235, z: -8, rot: 0, c1: 0x388a45, c2: 0x9be89b, team: [[43, 25], [3, 27], [59, 28]], reward: 1000, intro: ["Welcome to Grove Gym! I am Fern.", "Let nature show you its strength!"], win: ["You have grown into a fine trainer. Take the Grove Badge!"], done: ["The Grove Badge is yours. Keep going!"], after: () => { if (!G.badges.includes(3)) G.badges.push(3); refreshStory(); saveStory(); dialog(["You received the 🍃 Grove Badge!"]); } });
    lead({ id: "gym4", name: "Cinder", tag: "GYM LEADER CINDER", x: 310, z: -8, rot: 0, c1: 0xd85a32, c2: 0xffb17a, team: [[5, 29], [59, 30], [6, 32]], reward: 1200, intro: ["I am Cinder, the Ember Gym Leader!", "Can you withstand the heat?"], win: ["You burned bright! Accept the Ember Badge!"], done: ["Keep that fire burning, challenger!"], after: () => { if (!G.badges.includes(4)) G.badges.push(4); refreshStory(); saveStory(); dialog(["You received the 🔥 Ember Badge!"]); } });
    lead({ id: "gym5", name: "Selene", tag: "GYM LEADER SELENE", x: 385, z: -8, rot: 0, c1: 0x554a9b, c2: 0xc9c0ff, team: [[64, 32], [94, 34], [65, 36]], reward: 1500, intro: ["I am Selene of Moonfall Gym.", "Your final badge awaits beneath the stars!"], win: ["Your journey has reached its brightest point. Take the Lunar Badge!"], done: ["Six badges. The Grand League awaits!"], after: () => { if (!G.badges.includes(5)) G.badges.push(5); refreshStory(); saveStory(); dialog(["You received the 🌙 Lunar Badge!", "The Grand League Tournament is now open at Championship Stadium!"]); } });
    npc({ x: 450, z: -5, rot: 0, c1: 0x5a4f8a, c2: 0xffd43b, tag: "LEAGUE HOST", label: "Tournament", talk: () => leagueRoom() });
    /* rival */
    const rv = { id: "rival", name: "Rival Ren", x: -61.5, z: 0, rot: -Math.PI / 2, c1: 0x222a44, c2: 0xff8a3d, sight: 9, fm: 0.7, reward: 120, when: () => G.flags.starter, team: () => [[{ 1: 7, 4: 1, 7: 4 }[G.flags.pick] || 4, 5]], intro: ["Hey, wait up! So you got a Pokémon from the Professor too.", "Let’s see who’s stronger — battle me!"], win: ["Whoa, you’re good! I’ll get stronger too. See you on the road!"], talk: (o) => dialog(lines(o.name, G.def.includes("rival") ? ["I’m heading to Stonebrook too. Don’t fall behind!"] : ["Come on, battle me when you’re ready!"])) };
    npc(rv); REG.trainers.push(rv);
    /* Two recurring friends who travel the region with you */
    const friends = [
      { id: "friend_maya", name: "Maya", x: -53, z: 7, rot: Math.PI, c1: 0xe0679a, c2: 0xffffff, team: [[133, 5], [43, 8], [54, 14], [3, 28]], reward: 180, intro: ["I’m Maya! I chose a different path, but we’ll reach the League together.", "Let’s have a friendly battle!"], win: ["Great match! I’ll keep training beside you."], done: ["We’re both getting stronger!"] },
      { id: "friend_leo", name: "Leo", x: -49, z: -7, rot: 0, c1: 0x2b7fd0, c2: 0xffcf45, team: [[58, 5], [81, 9], [26, 16], [6, 29]], reward: 180, intro: ["Hey! I’m Leo. The three of us are going to the Grand League.", "Show me what your team can do!"], win: ["Awesome battle! Let’s meet again at the next city."], done: ["I’ll see you at the tournament!"] }
    ];
    friends.forEach((f) => { const T = Object.assign({ sight: 0, fm: 0.72, xpm: 1.2 }, f); T.talk = () => dialog(lines(T.name, G.def.includes(T.id) ? T.done : T.intro), () => { if (!G.def.includes(T.id)) trainerBattle(T); }); npc(T); REG.trainers.push(T); });
    /* City side quests: complete each request once for coins and supplies */
    let taskStage = 0;
    const taskNpc = (id, name, x, z, request, reward) => { const target = 2 + taskStage++ * 2; return npc({ x, z, rot: 0, c1: 0x4b8b76, c2: 0xffcf45, tag: "CITY TASK", label: "Task", talk: () => {
      G.flags.tasks = G.flags.tasks || {}; if (G.flags.tasks[id]) return dialog(lines(name, ["Thanks again for helping our city!"]));
      const cleared = G.def.filter(v => /^r[1-6]/.test(v)).length;
      if (cleared < target) return dialog(lines(name, [request, "Task progress: " + cleared + "/" + target + " route trainers defeated. Come back when you have cleared " + target + " trainers!"]));
      G.flags.tasks[id] = true; addCoins(reward); giveBalls(2); saveStory(); dialog(lines(name, ["Task complete! Here is your reward: " + reward + " coins and 2 Poké Balls."]));
    } }); };
    taskNpc("seedling_delivery", "Mira", -82, 7, "Help the town by proving yourself against local trainers.", 150);
    taskNpc("stonebrook_cleanup", "Bram", -12, 7, "Clear the trainer challenge and help keep the city safe.", 220);
    taskNpc("bluewater_rescue", "Sailor Nia", 68, 7, "Win more route battles so our rescue crew can travel safely.", 300);
    taskNpc("voltport_power", "Engineer Pax", 144, 7, "Test your strength against the route trainers near the power station.", 380);
    taskNpc("verdant_herbs", "Herbalist Fern", 222, 7, "Show your field experience by defeating the local trainers.", 460);
    taskNpc("cinder_festival", "Cook Ash", 298, 7, "Help prepare the festival by clearing the nearby trainer challenge.", 540);
    taskNpc("moonfall_archive", "Archivist Sol", 375, 7, "Verify the guardian legends by proving your trainer skill.", 650);
    /* route trainers */
    [["r1a", "Youngster Joey", -45, -7, 0, [[19, 4], [19, 5]], 60, 0x3d6bff], ["r1b", "Lass Anna", -31, 7, Math.PI, [[43, 5], [133, 6]], 70, 0xe0679a],
      ["r2a", "Hiker Gus", 24, -7, 0, [[74, 10], [74, 11], [75, 12]], 120, 0x8a6a3a], ["r2b", "Scientist Ivy", 35, 7, Math.PI, [[81, 11], [63, 11], [64, 13]], 140, 0xeeeeee], ["r2c", "Ace Trainer Rex", 46, -7, 0, [[58, 12], [66, 12]], 130, 0xc03028],
      ["r3a", "Swimmer Kai", 100, 7, Math.PI, [[54, 16], [130, 17]], 200, 0x2b7fd0], ["r3b", "Psychic Mira", 110, -7, 0, [[64, 17], [93, 18]], 220, 0xab2f61], ["r3c", "Ace Duo Sol", 120, 7, Math.PI, [[59, 18], [68, 18], [44, 17]], 240, 0x222222]].forEach(([id, name, x, z, rot, team, reward, c1]) => {
      const T = { id, name, x, z, rot, c1, c2: 0xffffff, team, reward, sight: 9, fm: 0.72, intro: ["You’re a trainer? Eyes met — that means we battle!"], win: ["Wow, you’re strong!"], talk: (o) => dialog(lines(name, G.def.includes(id) ? ["You beat me fair and square. Good luck!"] : ["Hey!"])) }; npc(T); REG.trainers.push(T);
    });
    /* extra route trainers across the expanded eastern region */
    [["r4a", "Ranger Willow", 185, -7, 0, [[43, 23], [3, 25]], 280, 0x388a45], ["r4b", "Gardener Moss", 198, 7, Math.PI, [[44, 24], [59, 26]], 300, 0x4b8b55],
      ["r5a", "Firebreather Ash", 260, 7, Math.PI, [[5, 27], [59, 29]], 340, 0xd85a32], ["r5b", "Hiker Coal", 273, -7, 0, [[75, 28], [76, 30]], 360, 0x8a6a3a],
      ["r6a", "Stargazer Lyra", 337, -7, 0, [[64, 31], [65, 33]], 420, 0x554a9b], ["r6b", "Night Ace Noct", 350, 7, Math.PI, [[94, 34], [149, 35]], 450, 0x39305f]].forEach(([id, name, x, z, rot, team, reward, c1]) => {
      const T = { id, name, x, z, rot, c1, c2: 0xffffff, team, reward, sight: 9, fm: 0.78, intro: ["The eastern routes are no place for an unprepared trainer!"], win: ["You have earned your way forward!"], talk: () => dialog(lines(name, G.def.includes(id) ? ["You already defeated me. Good luck at the League!"] : ["Ready for a battle?"])) }; npc(T); REG.trainers.push(T);
    });
    /* villagers */
    [[-80, 4, "Neighbor", "Welcome to Seedling Town! The big building is Professor Linden’s lab."], [-10, 5, "Villager", "Stonebrook’s gym leader Flint uses Rock-type Pokémon. Water and Grass moves work great!"], [75, 5, "Sailor", "Bluewater’s Marina loves Water types. Electric and Grass beat them!"], [150, 5, "Engineer", "Volt’s Electric Pokémon are fast. Ground types don’t take any damage from Electric moves."], [-38, -6, "Hiker", "Tall grass hides wild Pokémon. Weaken them, then throw a Poké Ball!"], [60, 6, "Cooler Kid", "Win battles to level up. Some Pokémon evolve at certain levels!"], [182, 5, "Elite Guard", "Beyond this door waits the Champion. Heal up first!"]].forEach(([x, z, n, t]) => npc({ x, z, rot: Math.PI * r() * 2, c1: 0x58b84a, c2: 0xffcf45, talk: () => dialog(lines(n, [t])) }));
    /* trees / rocks / flowers (instanced) */
    const inTown = (x) => TOWNS.some(([n, a, b]) => x > a - 3 && x < b + 3), NT = 1900, col2 = new THREE.Color();
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.3, 1.5, 6), lam(0x7a5230), NT), lg = new THREE.IcosahedronGeometry(1.25, 0), la = new THREE.InstancedMesh(lg, lam(0xffffff), NT), lb = new THREE.InstancedMesh(lg, lam(0xffffff), NT);
    let n = 0;
    for (let i = 0; i < 18000 && n < NT; i++) {
      const x = -96 + r() * 570, z = (r() - 0.5) * 84; if (Math.abs(z) < (inTown(x) ? 20 : 9)) continue; if (REG.builds.some((b) => Math.hypot(x - b.x, z - b.z) < 8) || REG.gates.some((g) => Math.abs(x - g.x) < 3 && Math.abs(z) < 10)) continue;
      const s = 0.8 + r() * 0.8; dm.rotation.set(0, 0, 0); dm.scale.setScalar(s); dm.position.set(x, 0.75 * s, z); dm.updateMatrix(); trunk.setMatrixAt(n, dm.matrix);
      dm.rotation.y = r() * 6; dm.position.set(x, 2.2 * s, z); dm.updateMatrix(); la.setMatrixAt(n, dm.matrix); dm.scale.setScalar(0.75 * s); dm.position.set(x + 0.3 * s, 3.1 * s, z + 0.1 * s); dm.updateMatrix(); lb.setMatrixAt(n, dm.matrix);
      col2.setHSL(0.29 + r() * 0.09, 0.5, 0.24 + r() * 0.1); la.setColorAt(n, col2); lb.setColorAt(n, col2); SCOL.push({ x, z, r: 0.9 * s }); n++;
    }
    [trunk, la, lb].forEach((m) => { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; region.add(m); });
    const NF = 1500, fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 5), lam(0xffffff), NF), fc = [0xff6b8b, 0xffd43b, 0xffffff, 0xc77dff, 0xff9e5a];
    for (let i = 0; i < NF; i++) { dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.position.set(-96 + r() * 570, 0.14, (r() - 0.5) * 80); dm.updateMatrix(); fl.setMatrixAt(i, dm.matrix); col2.setHex(fc[i % 5]); fl.setColorAt(i, col2); }
    fl.instanceMatrix.needsUpdate = true; fl.instanceColor.needsUpdate = true; region.add(fl);
    const mG = new THREE.ConeGeometry(1, 1, 6);
    for (let i = 0; i < 72; i++) { const x = -110 + i * 8, h = 22 + r() * 26, w = 16 + r() * 12, o = mesh(mG, lam(0x6f8fb8), x, h / 2, i % 2 ? -78 : 78); o.scale.set(w, h, w); region.add(o); }
    for (let i = 0; i < 22; i++) { const c = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }); for (let k = 0; k < 4; k++) { const b = mesh(new THREE.SphereGeometry(2.4 + r() * 1.8, 10, 8), m, k * 2.6, r(), r() * 1.8); b.scale.y = 0.55; c.add(b); } c.position.set(-90 + r() * 570, 30 + r() * 10, (r() - 0.5) * 120); region.add(c); region.userData.clouds.push(c); }
    region.visible = false;
  }

  /* ----- starting / running the story ----- */
  function chooseStarter(id) {
    const sp = SPECIES[id];
    modal(`<h2>YOUR STARTER</h2><p>Choose <b style="color:#ffcf45">${sp.n}</b> as your first partner?</p><div class="av-squad"><div style="width:130px"><img src="${ART + id}.png" alt="" style="width:110px;height:110px">${sp.n}</div></div><div class="av-row2"><button class="av-btn ghost" data-a="no">NOT YET</button><button class="av-btn" data-a="yes">YES!</button></div>`, (m) => {
      m.querySelector("[data-a=no]").onclick = closeModal;
      m.querySelector("[data-a=yes]").onclick = () => {
        closeModal(); const c = mkL(sp, 5); G.squad = [c]; G.lead = 0; G.flags.starter = true; G.flags.pick = id; G.potions += 3; giveBalls(5);
        try { if (!isCaptured(sp.s)) capturePokemon({ name: sp.s, id, types: sp.t }, "pokeball"); } catch (e) {}
        refreshStory(); setPartner(true); refresh(); saveStory();
        dialog([{ n: "Prof. Linden", t: "A fine choice! " + sp.n + " will be a great partner." }, { n: "Prof. Linden", t: "Take these 5 Poké Balls and 3 Potions too. Your rival is waiting down the road!" }, { n: "", t: "You received 5 Poké Balls and 3 Potions!" }]);
      };
    });
  }
  function profileColor(name) { return ({ ocean: 0x2878c8, crimson: 0xc83242, forest: 0x31804b, violet: 0x7953b8, gold: 0xd6a526, charcoal: 0x303744 })[name] || 0x2878c8; }
  function customizeTrainer(done) {
    const makeId = () => "PF-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    modal(`<h2>CREATE YOUR TRAINER</h2><p>Set up your character before starting the six-badge journey.</p><label style="display:block;text-align:left;color:#9fc1df;font-size:12px">TRAINER NAME</label><input id="av-trainer-name" maxlength="16" value="Trainer" style="width:100%;padding:13px;border-radius:10px;border:1px solid #36506b;background:#0c1b2d;color:#fff;margin:6px 0 12px"><label style="display:block;text-align:left;color:#9fc1df;font-size:12px">OUTFIT</label><select id="av-trainer-outfit" style="width:100%;padding:13px;border-radius:10px;background:#0c1b2d;color:#fff;border:1px solid #36506b"><option value="ocean">Ocean Blue</option><option value="crimson">Crimson Red</option><option value="forest">Forest Green</option><option value="violet">Royal Violet</option><option value="gold">Champion Gold</option><option value="charcoal">Charcoal</option></select><div class="av-task">🧢 Your trainer ID will be generated automatically. Friends: Maya and Leo.</div><button class="av-btn av-drop" data-a="create">CREATE STORY</button>`, (m) => { m.querySelector('[data-a=create]').onclick = () => { const name = (m.querySelector('#av-trainer-name').value || 'Trainer').trim().slice(0,16); done({ name, outfit: m.querySelector('#av-trainer-outfit').value, id: makeId(), friends: [{ name: 'Maya', id: 'NPC-MAYA-01' }, { name: 'Leo', id: 'NPC-LEO-01' }] }); }; });
  }

  function startStory(fresh) {
    runId++; mode = "story"; buildRegion(); showScene("region"); clearDyn(); closeModal();
    if (fresh || !A.story) A.story = { squad: [], potions: 0, badges: [], def: [], flags: {}, spawn: { x: -80, z: 2 }, pos: { x: -80, z: 2 }, profile: null };
    const S = A.story; S.badges = (S.badges || []).slice(0, 6); S.flags = S.flags || {};
    if (!S.profile) { customizeTrainer((profile) => { S.profile = profile; save(); startStory(false); }); return; }
    if (trainer && trainer.children) { const outfit = profileColor(S.profile.outfit), shirt = trainer.children[2], armA = trainer.children[4], armB = trainer.children[6], capMesh = trainer.children[8], brim = trainer.children[9], bag = trainer.children[10]; [shirt, armA, armB, capMesh, brim, bag].forEach((o) => { if (o && o.material && o.material.color) o.material.color.set(outfit); }); }

    G = { story: true, squad: S.squad.map(unpack), lead: 0, potions: S.potions || 0, badges: (S.badges || []).slice(), def: (S.def || []).slice(), flags: Object.assign({}, S.flags), cut: false, gd: 0, near: null, loc: "", walk: null, gcool: 0 };
    P.x = S.pos.x; P.z = S.pos.z; P.rot = Math.PI / 2; me();
    if (G.squad.length) setPartner(true); else if (partnerH) { scene.remove(partnerH); partnerH = null; }
    refreshStory(); DL = null; $("av-dlg").hidden = true; hudLast = null;
    $("av-title").textContent = (S.profile && S.profile.name ? S.profile.name.toUpperCase() + " · " : "") + "STORY ADVENTURE"; $("av-map").hidden = false; $("av-map").classList.remove("big"); $("av-party").hidden = false; showPad(true); $("av-feed").innerHTML = ""; refresh();
    if (!G.flags.intro) { G.cut = true; later(() => dialog([{ n: "Prof. Linden", t: "Welcome to the world of Pokémon! I’m Professor Linden." }, { n: "Prof. Linden", t: "This region is full of wild Pokémon, tough trainers and six Gym Leaders guarding the road to the Grand League Tournament." }, { n: "Prof. Linden", t: "First, choose your partner from the three Pokémon on the table next to me. Maya and Leo will travel the region with you! Walk up and press E / the A button!" }], () => { G.flags.intro = true; G.cut = false; saveStory(); }), 600); }
  }
  function story(dt) {
    const busy = DL || G.cut || modalOpen();
    REG.npcs.forEach((n, i) => { if (n.mesh) n.mesh.position.y = Math.sin(t * 2 + i) * 0.03; });
    if (DL && DL.pos < DL.lines[DL.i].t.length) { DL.pos += dt * 60; paintDlg(); }
    if (G.walk) { const w = G.walk, dx = P.x - w.T.x, dz = P.z - w.T.z, d = Math.hypot(dx, dz); w.T.mesh.rotation.y = Math.atan2(dx, dz); if (d > 2.9) { w.T.x += (dx / d) * 6 * dt; w.T.z += (dz / d) * 6 * dt; w.T.mesh.position.set(w.T.x, 0, w.T.z); } else { const f = w.then; G.walk = null; f(); } }
    P.moving = false; G.near = null; G.gcool = Math.max(0, G.gcool - dt);
    if (!busy) {
      let dx = 0, dz = 0;
      if (held.ArrowLeft || held.a || pad.left) dx -= 1; if (held.ArrowRight || held.d || pad.right) dx += 1;
      if (held.ArrowUp || held.w || pad.up) dz -= 1; if (held.ArrowDown || held.s || pad.down) dz += 1;
      P.moving = !!(dx || dz);
      if (P.moving) {
        const l = Math.hypot(dx, dz), st = (held.Shift ? 11.5 : 8) * dt, nx = P.x + (dx / l) * st, nz = P.z + (dz / l) * st; if (!blocked(nx, P.z)) P.x = nx; if (!blocked(P.x, nz)) P.z = nz; P.rot = Math.atan2(dx, dz);
        const pt = REG.patches.find((p) => Math.abs(P.x - p.x) < p.w / 2 && Math.abs(P.z - p.z) < p.d / 2);
        if (pt && me()) { G.gd += st; if (G.gd > 2.1) { G.gd = 0; if (Math.random() < 0.2) return wild(pt.r); } } else if (!pt) G.gd = 0;
      }
      const gt = REG.gates.find((g) => !g.req() && Math.abs(P.x - g.x) < 2);
      if (gt && G.gcool <= 0) { G.gcool = 2; const side = P.x < gt.x ? -1 : 1; G.cut = true; P.x = gt.x + side * 3; dialog(lines("Guard", [gt.msg]), () => { G.cut = false; }); return; }
      for (const T of REG.trainers) { if (!T.sight || G.def.includes(T.id) || (T.when && !T.when()) || !G.squad.length) continue; const tx = P.x - T.x, tz = P.z - T.z, d = Math.hypot(tx, tz); if (d < T.sight && tx * Math.sin(T.rot) + tz * Math.cos(T.rot) > d * 0.55) return engageTrainer(T); }
      let best = null, bd = 99; REG.inter.forEach((I) => { if (I.when && !I.when()) return; const q = I.ref || I, d = Math.hypot(P.x - q.x, P.z - q.z); if (d < I.r && d < bd) { best = I; bd = d; } }); G.near = best;
    }
    const pr = $("av-prompt"); pr.hidden = !G.near || busy; if (G.near && !busy) pr.textContent = "▶ " + G.near.label + "  (E / A)"; $("av-act").hidden = !G.near || busy;
    const loc = locName(P.x); if (loc !== G.loc) { G.loc = loc; const lb = $("av-loc"); lb.textContent = loc; lb.classList.remove("show"); void lb.offsetWidth; lb.classList.add("show"); }
    setHud(`<div class="av-hbox"><small>BADGES</small><b>${BADGES.map((b, i) => (G.badges.includes(i) ? b.ic : "▫️")).join("")}</b></div><div class="av-zbar"><span>LOCATION</span><b>${loc}</b></div><div class="av-hbox"><small>PARTY</small><b>${G.squad.filter((c) => c.hp > 0).length}/${G.squad.length}</b></div>`);
    drawMapStory();
  }
  function drawMapStory() {
    const c = $("av-map"), x = c.getContext("2d"), S = c.width, big = c.classList.contains("big"), k = S / (big ? 600 : 110), X = (v) => big ? (v + 100) * k : (v - P.x) * k + S / 2, Z = (v) => big ? (v + 80) * (S / 160) : (v - P.z) * k + S / 2;
    x.fillStyle = "#245a3c"; x.fillRect(0, 0, S, S); x.fillStyle = "#cdb98a"; x.fillRect(X(-96), Z(-2.75), (big ? 552 : 292) * k, 5.5 * (big ? S / 160 : k));
    x.fillStyle = "#2f7a35"; REG.patches.forEach((p) => x.fillRect(X(p.x - p.w / 2), Z(p.z - p.d / 2), p.w * k, p.d * k));
    REG.builds.forEach((b) => { x.fillStyle = b.col; x.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), b.w * k, b.d * k); });
    x.strokeStyle = "#ff3b3b"; x.lineWidth = 4; REG.gates.forEach((g) => { if (!g.req()) { x.beginPath(); x.moveTo(X(g.x), 0); x.lineTo(X(g.x), S); x.stroke(); } });
    REG.trainers.forEach((T) => { if (T.sight && !G.def.includes(T.id)) { x.fillStyle = "#ff5a5a"; x.beginPath(); x.arc(X(T.x), Z(T.z), 6, 0, 6.283); x.fill(); } });
    x.fillStyle = "#ffcf45"; REG.inter.forEach((I) => { if (I.ref && (!I.when || I.when())) { x.fillRect(X(I.ref.x) - 3, Z(I.ref.z) - 3, 6, 6); } });
    x.save(); x.translate(S / 2, S / 2); x.rotate(-P.rot + Math.PI); x.fillStyle = "#5de4ff"; x.strokeStyle = "#04121f"; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -11); x.lineTo(8, 9); x.lineTo(-8, 9); x.closePath(); x.fill(); x.stroke(); x.restore();
  }

  /* ---------- loop ---------- */
  function frame(now) {
    if (!running) return; const p = $("adventure-page"); if (!p || p.classList.contains("hidden")) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt; update(dt); renderer.render(scene, camera); requestAnimationFrame(frame);
  }
  function update(dt) {
    [partnerH, foeH].forEach((h) => h && tickMon(h, dt));
    meadow.userData.clouds.forEach((c) => { c.position.x += dt * 0.8; if (c.position.x > W + 80) c.position.x = -W - 80; });
    if (region) region.userData.clouds.forEach((c) => { c.position.x += dt * 0.8; if (c.position.x > 210) c.position.x = -110; });
    if (mode === "survival" && !G.over && !B && !modalOpen()) surv(dt);
    else if (mode === "story" && !B) story(dt);
    else if (mode === "survival") { G.roamers.forEach((r) => { if (!B || r.h !== foeH) tickMon(r.h, dt); }); if (!$("av-map").hidden) drawMap(); }
    else if (mode === "story") { $("av-prompt").hidden = true; $("av-act").hidden = true; }
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
    if (mode && B) { const mxp = (P.x + B.foePos.x) / 2, mzp = (P.z + B.foePos.z) / 2; cx = mxp; cy = 6.2; cz = mzp + 8.5; lx = mxp; ly = 1.3; lz = mzp; }
    else if (mode === "survival") { const i = G.intro > 0 ? G.intro : 0; cx = P.x; cy = 9.5 + i * 60; cz = P.z + 11.5 + i * 30; lx = P.x; ly = 1; lz = P.z; }
    else if (mode === "story") { cx = P.x; cy = 9; cz = P.z + 11; lx = P.x; ly = 1; lz = P.z; }
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
  function renderHomePreview() {
    const home = $("home-page"); if (!home) return;
    const d = load(), st = d.story, p = st && st.profile; let card = $("av-home-preview");
    if (!p) { if (card) card.remove(); return; }
    if (!card) { card = document.createElement("div"); card.id = "av-home-preview"; home.appendChild(card); }
    const color = "#" + profileColor(p.outfit).toString(16).padStart(6, "0");
    card.innerHTML = `<div class="av-home-avatar" style="border-color:${color}"><svg viewBox="0 0 64 76" aria-label="${p.name} trainer avatar"><path d="M12 72 Q13 48 32 46 Q51 48 52 72Z" fill="${color}" stroke="#dcecff" stroke-width="2"/><circle cx="32" cy="31" r="15" fill="#e9b995" stroke="#5d3d35" stroke-width="1.5"/><path d="M15 27 Q16 8 34 9 Q48 10 50 25 L43 22 L17 24Z" fill="${color}" stroke="#dcecff" stroke-width="2"/><path d="M13 25 Q31 18 52 25 L49 30 Q29 24 14 31Z" fill="#17283d"/><circle cx="27" cy="32" r="1.5" fill="#17283d"/><circle cx="38" cy="32" r="1.5" fill="#17283d"/></svg></div><div class="av-home-info"><b>${p.name.replace(/[&<>"]/g, "")}</b><small>TRAINER ID · ${p.id}</small><small>${(st.badges || []).length}/6 BADGES ${st.flags && st.flags.champ ? "· 🏆 CHAMPION" : ""}</small><div class="av-home-places"><span>🏥 Pokémon Center</span><span>🏟️ Next Gym</span></div><button type="button" data-av-resume>CONTINUE STORY</button></div>`;
    card.querySelector("[data-av-resume]").onclick = open;
  }
  function close() {
    if (G && G.story) saveStory();
    running = false; runId++; save(); $("adventure-page").classList.add("hidden");
    if (typeof showHomeScreen === "function") showHomeScreen(); else $("home-page").classList.remove("hidden");
    renderHomePreview();
  }
  addEventListener("keydown", (e) => { const p = $("adventure-page"); if (!p || p.classList.contains("hidden")) return; held[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault(); if (!e.repeat && mode === "story" && (e.key === "e" || e.key === "E" || e.key === " " || e.key === "Enter")) { e.preventDefault(); interact(); } });
  addEventListener("keyup", (e) => { held[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  addEventListener("blur", () => { Object.keys(held).forEach((k) => { held[k] = false; }); });
  const initHome = () => { injectCSS(); const b = $("btn-adventure"); if (b) b.onclick = open; renderHomePreview(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initHome); else initHome();
  window.openAdventure = open;
  window.getAdventureHomePreview = function () { const d = load(), st = d.story, p = st && st.profile; return p ? { name: p.name, id: p.id, outfit: p.outfit, badges: (st.badges || []).length, champion: !!(st.flags && st.flags.champ), centerLabel: "Pokémon Center", gymLabel: "Next Gym", avatarColor: "#" + profileColor(p.outfit).toString(16).padStart(6, "0") } : null; };
})();
