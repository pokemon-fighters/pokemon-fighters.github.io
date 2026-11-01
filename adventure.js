/* ============================================================
   ADVENTURE MODE (3D) — walk a 3D trainer around a meadow with
   your 3D partner creature, battle wild creatures in the tall
   grass, catch a team and beat the gate boss. Uses the site's own
   coins and Poké Balls (globals from app.js). The creatures and
   trainer are original low-poly models built from simple shapes;
   Three.js is loaded on demand the first time the mode opens.
============================================================ */
(function () {
  const KEY = "pf_adventure3d_v1";
  const SP = [
    { n: "Emberfox", t: "Fire", hp: 46, a: 9, c1: 0xf08030, c2: 0xffd23f, ears: "cone", tail: "flame" },
    { n: "Tidlet", t: "Water", hp: 52, a: 8, c1: 0x4a90d9, c2: 0x2f6f4f, ears: "none", tail: "shell" },
    { n: "Leafrog", t: "Grass", hp: 48, a: 8, c1: 0x58b84a, c2: 0x2f8f3a, ears: "round", tail: "leaf" },
    { n: "Voltmouse", t: "Electric", hp: 40, a: 10, c1: 0xf5d33b, c2: 0x8a5a2b, ears: "cone", tail: "zig" },
  ];
  const BOSS = { n: "Drakon", t: "Dragon", hp: 110, a: 12, c1: 0x8a3fd1, c2: 0xe0485a, ears: "horn", tail: "flame", s: 2.2, boss: true };
  const EFF = { Fire: { Grass: 2, Water: 0.5 }, Water: { Fire: 2, Grass: 0.5 }, Grass: { Water: 2, Fire: 0.5 }, Electric: { Water: 2 } };
  const GRASS = [{ x: -8, z: -6, w: 12, d: 8 }, { x: 10, z: -10, w: 10, d: 10 }, { x: -2, z: 6, w: 14, d: 6 }, { x: 12, z: 8, w: 8, d: 8 }];
  const COTTAGE = { x: -12, z: 12 };
  const mk = (sp) => ({ ...sp, max: sp.hp, cd: 0 });
  const $ = (id) => document.getElementById(id);
  let A, THREE, renderer, scene, camera, trainer, partnerH, foeH, foe = null;
  let inB = false, lock = false, built = false, running = false, last = 0, t = 0, grassDist = 0, healed = false;
  const P = { x: 0, z: 18, rot: Math.PI, moving: false };
  const held = {}, pad = {}, COL = [];

  function load() {
    try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.team) return r; } catch (e) {}
    return { team: [mk(SP[0])], badge: false };
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) {} };
  const me = () => A.team.find((c) => c.hp > 0);
  const say = (s) => { $("adv-msg").textContent = s; };
  const log = (s) => { $("adv-log").textContent = s; };

  /* ---- site economy bridge (globals declared in app.js) ---- */
  function addCoins(n) { try { coins += n; saveStoredNumber(COINS_KEY, coins); updateResourcesUI(); } catch (e) {} }
  const ballCount = () => { try { return getBallCount("pokeball"); } catch (e) { return 0; } };
  function spendBall() { try { if (!useBall("pokeball")) return false; saveInventory(); return true; } catch (e) { return false; } }

  /* ---- model helpers ---- */
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
  const sph = (r, c, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), lam(c)); m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); return m; };
  const cone = (r, h, c, x, y, z, rx, rz) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), lam(c)); m.position.set(x, y, z); m.rotation.set(rx || 0, 0, rz || 0); return m; };
  const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c)); m.position.set(x, y, z); return m; };

  function makeCreature(sp) {
    const g = new THREE.Group();
    g.add(sph(0.5, sp.c1, 0, 0.55, 0, 1, 0.9, 1.15), sph(0.36, sp.c1, 0, 1.05, 0.3));
    g.add(sph(0.07, 0x111111, -0.14, 1.12, 0.62), sph(0.07, 0x111111, 0.14, 1.12, 0.62));
    [-1, 1].forEach((k) => {
      g.add(sph(0.14, sp.c2, k * 0.25, 0.1, 0.25, 1, 0.7, 1.4));
      if (sp.ears === "cone") g.add(cone(0.12, 0.4, sp.c1, k * 0.22, 1.5, 0.25, 0, -k * 0.25));
      if (sp.ears === "round") g.add(sph(0.13, sp.c2, k * 0.26, 1.38, 0.2));
      if (sp.ears === "horn") g.add(cone(0.1, 0.45, sp.c2, k * 0.2, 1.52, 0.3, 0, -k * 0.3));
      if (sp.boss) g.add(box(0.1, 0.7, 0.9, sp.c2, k * 0.62, 0.95, -0.2));
    });
    if (sp.tail === "flame") g.add(cone(0.16, 0.6, sp.c2, 0, 0.75, -0.65, -0.9, 0));
    if (sp.tail === "zig") g.add(box(0.1, 0.7, 0.1, sp.c2, 0, 0.95, -0.6));
    if (sp.tail === "leaf") g.add(sph(0.22, sp.c2, 0, 0.7, -0.62, 1, 0.3, 1.4));
    if (sp.tail === "shell") g.add(sph(0.56, sp.c2, 0, 0.75, -0.12, 1, 0.7, 1.1));
    g.scale.setScalar(sp.s || 1);
    const h = new THREE.Group(); h.add(g); h.userData.c = g; return h;
  }
  function makeTrainer() {
    const g = new THREE.Group(), legs = [box(0.18, 0.6, 0.2, 0x2b3a6b, -0.13, 0.3, 0), box(0.18, 0.6, 0.2, 0x2b3a6b, 0.13, 0.3, 0)];
    g.add(legs[0], legs[1], box(0.5, 0.7, 0.3, 0xd9363e, 0, 0.95, 0), sph(0.24, 0xf1c9a5, 0, 1.52, 0));
    g.add(box(0.14, 0.55, 0.16, 0xd9363e, -0.34, 0.95, 0), box(0.14, 0.55, 0.16, 0xd9363e, 0.34, 0.95, 0));
    g.add(box(0.5, 0.12, 0.5, 0xffffff, 0, 1.76, 0), box(0.4, 0.04, 0.3, 0xffffff, 0, 1.72, 0.3));
    g.userData.legs = legs; return g;
  }

  /* ---- world ---- */
  function buildWorld() {
    scene.background = new THREE.Color(0x8fd0ff); scene.fog = new THREE.Fog(0x8fd0ff, 32, 75);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8a5a, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.6); sun.position.set(10, 20, 8); scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), lam(0x6bbf59)); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const bladeG = new THREE.ConeGeometry(0.1, 0.7, 4), bladeM = lam(0x2f7a35);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    GRASS.forEach((p) => {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), lam(0x4a9e46)); pl.rotation.x = -Math.PI / 2; pl.position.set(p.x, 0.02, p.z); scene.add(pl);
      for (let i = 0; i < 45; i++) { const b = new THREE.Mesh(bladeG, bladeM); b.position.set(p.x + (rnd() - 0.5) * p.w, 0.35, p.z + (rnd() - 0.5) * p.d); scene.add(b); }
    });
    const trunkG = new THREE.CylinderGeometry(0.2, 0.28, 1.2, 6), leafG = new THREE.ConeGeometry(1.1, 2.6, 7), trunkM = lam(0x7a5230), leafM = lam(0x2d7a3a);
    for (let i = 0, n = 0; n < 38 && i < 400; i++) {
      const x = (rnd() - 0.5) * 56, z = (rnd() - 0.5) * 56;
      if (Math.hypot(x - P.x, z - P.z) < 6 || Math.hypot(x - COTTAGE.x, z - COTTAGE.z) < 7 || (Math.abs(x) < 5 && z < -15) || inGrass(x, z, 1.5)) continue;
      const tr = new THREE.Mesh(trunkG, trunkM), lf = new THREE.Mesh(leafG, leafM); tr.position.set(x, 0.6, z); lf.position.set(x, 2.3, z); scene.add(tr, lf); COL.push({ x, z, r: 0.9 }); n++;
    }
    const house = new THREE.Group(); house.add(box(4, 2.6, 4, 0xf0e2c0, 0, 1.3, 0), cone(3.4, 1.8, 0xc4483c, 0, 3.5, 0, 0, 0), box(0.9, 1.5, 0.1, 0x7a5230, 0, 0.75, 2.05));
    house.children[1].rotation.y = Math.PI / 4; house.position.set(COTTAGE.x, 0, COTTAGE.z); scene.add(house); COL.push({ x: COTTAGE.x, z: COTTAGE.z, r: 2.6 });
    [-1, 1].forEach((k) => { const pil = box(1.2, 5, 1.2, 0x9a9aa8, k * 3.4, 2.5, -24); scene.add(pil); COL.push({ x: k * 3.4, z: -24, r: 0.9 }); });
    scene.add(box(8.2, 1.2, 1.4, 0x7a7a8a, 0, 5.4, -24));
  }
  function inGrass(x, z, pad) { return GRASS.some((p) => Math.abs(x - p.x) < p.w / 2 + (pad || 0) && Math.abs(z - p.z) < p.d / 2 + (pad || 0)); }
  function blocked(x, z) {
    if (Math.abs(x) > 28 || Math.abs(z) > 28) return true;
    return COL.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.4) ** 2);
  }

  /* ---- UI / setup ---- */
  function setup(cb) {
    if (built) return cb(); built = true;
    $("adventure-page").innerHTML = `<div id="adv-3d"></div>
      <div class="adv-top"><button class="adv-btn adv-ghost" id="adv-back">← HOME</button><span class="adv-pill" id="adv-res"></span></div>
      <div class="adv-bottom"><div id="adv-msg"></div><div class="adv-team" id="adv-team"></div>
        <div class="adv-pad"><button class="adv-btn u" data-k="up">▲</button><button class="adv-btn l" data-k="left">◀</button><button class="adv-btn d" data-k="down">▼</button><button class="adv-btn r" data-k="right">▶</button></div></div>
      <div id="adv-battle" hidden><div class="adv-bx">
        <div class="adv-row foe"><div class="adv-grow"><div class="adv-nm" id="adv-fn"></div><div class="adv-hp"><i id="adv-fh"></i></div></div></div>
        <div class="adv-row"><div class="adv-grow"><div class="adv-nm" id="adv-mn"></div><div class="adv-hp"><i id="adv-mh"></i></div></div></div>
        <div id="adv-log"></div>
        <div class="adv-acts"><button class="adv-btn" id="adv-a1">Attack</button><button class="adv-btn" id="adv-a2">Special</button><button class="adv-btn" id="adv-a3">Throw Poké Ball</button><button class="adv-btn adv-ghost" id="adv-a4">Run</button></div>
      </div></div>`;
    $("adv-back").onclick = close;
    document.querySelectorAll(".adv-pad button").forEach((b) => {
      const k = b.dataset.k, on = (e) => { e.preventDefault(); pad[k] = true; }, off = () => { pad[k] = false; };
      b.addEventListener("pointerdown", on); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, off));
    });
    $("adv-a1").onclick = () => act("atk"); $("adv-a2").onclick = () => act("sp"); $("adv-a3").onclick = () => act("ball"); $("adv-a4").onclick = () => act("run");
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = () => { THREE = window.THREE; init3d(); cb(); };
    s.onerror = () => { built = false; $("adv-msg").textContent = "Couldn’t load the 3D engine — check your connection and try again."; };
    document.head.appendChild(s);
  }
  function init3d() {
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    $("adv-3d").appendChild(renderer.domElement);
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
    buildWorld(); trainer = makeTrainer(); scene.add(trainer);
    addEventListener("resize", resize);
  }
  function resize() {
    const p = $("adventure-page"); if (!renderer || !p) return;
    const w = p.clientWidth || innerWidth, h = p.clientHeight || innerHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function setPartner() {
    const m = me(); if (!m) return;
    if (partnerH && partnerH.userData.name === m.n) return;
    if (partnerH) scene.remove(partnerH);
    partnerH = makeCreature(m); partnerH.userData.name = m.n;
    partnerH.position.set(P.x + 1.5, 0, P.z + 1.5); scene.add(partnerH);
  }
  function refresh() {
    let c = 0; try { c = coins; } catch (e) {}
    $("adv-res").textContent = "🥮 " + c.toLocaleString() + "  ·  Poké Balls " + ballCount() + (A.badge ? "  ·  🏅" : "");
    $("adv-team").innerHTML = A.team.map((m) => `<span class="adv-chip${m.hp <= 0 ? " down" : ""}">${m.n} ${m.hp}/${m.max}</span>`).join("");
  }

  /* ---- game loop ---- */
  function frame(now) {
    if (!running) return;
    const p = $("adventure-page"); if (!p || p.classList.contains("hidden")) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt;
    update(dt); renderer.render(scene, camera); requestAnimationFrame(frame);
  }
  function update(dt) {
    let dx = 0, dz = 0;
    if (!inB) {
      if (held.ArrowLeft || held.a || pad.left) dx -= 1; if (held.ArrowRight || held.d || pad.right) dx += 1;
      if (held.ArrowUp || held.w || pad.up) dz -= 1; if (held.ArrowDown || held.s || pad.down) dz += 1;
    }
    P.moving = !!(dx || dz);
    if (P.moving) {
      const l = Math.hypot(dx, dz), step = 6 * dt;
      const nx = P.x + (dx / l) * step, nz = P.z + (dz / l) * step;
      if (!blocked(nx, P.z)) P.x = nx; if (!blocked(P.x, nz)) P.z = nz;
      P.rot = Math.atan2(dx, dz);
      if (inGrass(P.x, P.z)) { grassDist += step; if (grassDist > 2.4) { grassDist = 0; if (Math.random() < 0.25) return startWild(SP[Math.floor(Math.random() * SP.length)]); } }
      else grassDist = 0;
      if (Math.abs(P.x) < 2.4 && P.z < -22.5) return startWild(BOSS);
    }
    const near = Math.hypot(P.x - COTTAGE.x, P.z - COTTAGE.z);
    if (near < 4.6 && !healed) { healed = true; A.team.forEach((m) => { m.hp = m.max; m.cd = 0; }); say("The cottage healed your whole team."); setPartner(); refresh(); save(); }
    if (near > 7) healed = false;
    trainer.position.set(P.x, 0, P.z); trainer.rotation.y = P.rot;
    const lg = trainer.userData.legs, sw = P.moving ? Math.sin(t * 12) * 0.5 : 0; lg[0].rotation.x = sw; lg[1].rotation.x = -sw;
    if (partnerH) {
      if (inB && foeH) {
        partnerH.position.lerp(new THREE.Vector3(P.x + Math.cos(P.rot) * 1.8 - Math.sin(P.rot) * 0.5, 0, P.z - Math.sin(P.rot) * 1.8 - Math.cos(P.rot) * 0.5), 1 - Math.exp(-6 * dt));
        partnerH.rotation.y = Math.atan2(foeH.position.x - partnerH.position.x, foeH.position.z - partnerH.position.z);
      } else {
        const tx = P.x - Math.sin(P.rot) * 1.7 + Math.cos(P.rot) * 1.0, tz = P.z - Math.cos(P.rot) * 1.7 - Math.sin(P.rot) * 1.0;
        const ox = partnerH.position.x, oz = partnerH.position.z;
        partnerH.position.x += (tx - ox) * (1 - Math.exp(-5 * dt)); partnerH.position.z += (tz - oz) * (1 - Math.exp(-5 * dt));
        const mx = partnerH.position.x - ox, mz = partnerH.position.z - oz;
        if (Math.hypot(mx, mz) > 0.002) partnerH.rotation.y = Math.atan2(mx, mz);
      }
      partnerH.position.y = P.moving ? Math.abs(Math.sin(t * 9)) * 0.12 : 0;
    }
    [partnerH, foeH].forEach((h) => {
      if (!h) return; const u = h.userData;
      if (u.pun !== undefined) { u.pun += dt * 3; u.c.position.z = u.pun < 1 ? Math.sin(Math.PI * u.pun) * 1.6 : 0; if (u.pun >= 1) u.pun = undefined; }
      if (u.sink) h.scale.multiplyScalar(Math.max(0.01, 1 - dt * 1.6));
    });
    camera.position.set(P.x, 9, P.z + 12); camera.lookAt(P.x, 1, P.z);
  }

  /* ---- battles ---- */
  function startWild(sp) {
    if (inB) return;
    foe = sp.boss ? { ...sp, max: sp.hp, cd: 0 } : mk(sp); inB = true; lock = false;
    const dist = sp.boss ? 7 : 5.5, fx = Math.max(-26, Math.min(26, P.x + Math.sin(P.rot) * dist)), fz = Math.max(-26, Math.min(26, P.z + Math.cos(P.rot) * dist));
    foeH = makeCreature(sp); foeH.position.set(fx, 0, fz); foeH.rotation.y = Math.atan2(P.x - fx, P.z - fz); scene.add(foeH);
    $("adv-battle").hidden = false; document.querySelector(".adv-bottom").style.display = "none";
    log(sp.boss ? "The gate guardian " + sp.n + " blocks your way!" : "A wild " + sp.n + " appeared!"); ui();
  }
  function ui() {
    const m = me(); if (!m || !foe) return;
    $("adv-fn").innerHTML = foe.n + " <small>" + foe.t + " · " + foe.hp + "/" + foe.max + "</small>"; $("adv-fh").style.width = (foe.hp / foe.max) * 100 + "%";
    $("adv-mn").innerHTML = m.n + " <small>" + m.t + " · " + m.hp + "/" + m.max + "</small>"; $("adv-mh").style.width = (m.hp / m.max) * 100 + "%";
    $("adv-a2").disabled = m.cd > 0; $("adv-a2").textContent = m.cd > 0 ? "Special (" + m.cd + ")" : "Special";
    $("adv-a3").disabled = !!foe.boss || ballCount() < 1; $("adv-a4").disabled = !!foe.boss; refresh();
  }
  function dmg(a, d, mult) { const e = (EFF[a.t] && EFF[a.t][d.t]) || 1; return { v: Math.max(1, Math.round(a.a * (0.8 + Math.random() * 0.4) * mult * e)), e }; }
  function act(kind) {
    if (lock || !foe) return; const m = me(); if (!m) return;
    if (kind === "run") { if (Math.random() < 0.6) { log("Got away safely!"); return done(400); } log("Couldn’t escape!"); }
    else if (kind === "ball") {
      if (!spendBall()) { log("You’re out of Poké Balls!"); return; }
      if (Math.random() < 0.15 + 0.7 * (1 - foe.hp / foe.max)) {
        if (A.team.length < 6) { foe.cd = 0; A.team.push(foe); log("Gotcha! " + foe.n + " joined your team!"); } else { addCoins(30); log("Team full, so " + foe.n + " went to the ranch for 30 coins."); }
        if (foeH) foeH.userData.sink = true; return done(1100);
      }
      log("It broke free!");
    } else {
      if (kind === "sp") { if (m.cd > 0) return; m.cd = 3; }
      const r = dmg(m, foe, kind === "sp" ? 1.6 : 1); foe.hp = Math.max(0, foe.hp - r.v); if (partnerH) partnerH.userData.pun = 0.0001;
      log(m.n + " hits for " + r.v + (r.e > 1 ? " — super effective!" : r.e < 1 ? " — not very effective." : "."));
      if (foe.hp <= 0) return win();
    }
    ui(); foeTurn();
  }
  function foeTurn() {
    lock = true;
    setTimeout(() => {
      A.team.forEach((c) => { c.cd = Math.max(0, (c.cd || 0) - 1); });
      const m = me(), r = dmg(foe, m, 1); m.hp = Math.max(0, m.hp - r.v); if (foeH) foeH.userData.pun = 0.0001;
      log(foe.n + " hits " + m.n + " for " + r.v + "." + (m.hp <= 0 ? " " + m.n + " fainted!" : "")); lock = false; ui();
      if (!me()) { lock = true; setTimeout(blackout, 1000); } else if (m.hp <= 0) setPartner();
    }, 600);
  }
  function win() {
    const gain = foe.boss ? 500 : 40; addCoins(gain); let s = "You won! +" + gain + " 🥮 coins.";
    if (foe.boss) { A.badge = true; s = "You defeated " + foe.n + " and earned the badge! +500 🥮 coins. Adventure complete!"; }
    const m = me(); if (m) m.hp = Math.min(m.max, m.hp + 8); if (foeH) foeH.userData.sink = true; log(s); ui(); done(1500);
  }
  function blackout() {
    A.team.forEach((c) => { c.hp = c.max; c.cd = 0; }); P.x = 0; P.z = 18; setPartner(); log("Your team is out of energy… you wake up back at the start."); done(1400);
  }
  function done(ms) {
    lock = true;
    setTimeout(() => {
      if (foeH) { scene.remove(foeH); foeH = null; }
      if (foe && foe.boss) { P.z = -18; }
      $("adv-battle").hidden = true; document.querySelector(".adv-bottom").style.display = ""; inB = false; lock = false; foe = null; grassDist = 0; setPartner(); refresh(); save();
    }, ms);
  }

  /* ---- open / close ---- */
  function open() {
    A = load(); $("home-page").classList.add("hidden"); $("adventure-page").classList.remove("hidden");
    setup(() => {
      resize(); setPartner(); refresh(); say("Move with WASD, the arrow keys or the pad. Tall grass hides wild creatures; the cottage heals your team.");
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    });
  }
  function close() {
    if (inB) return; running = false; save(); $("adventure-page").classList.add("hidden");
    if (typeof showHomeScreen === "function") showHomeScreen(); else $("home-page").classList.remove("hidden");
  }
  addEventListener("keydown", (e) => { const p = $("adventure-page"); if (!p || p.classList.contains("hidden")) return; held[e.key] = true; if (e.key.startsWith("Arrow")) e.preventDefault(); });
  addEventListener("keyup", (e) => { held[e.key] = false; });
  addEventListener("blur", () => { Object.keys(held).forEach((k) => { held[k] = false; }); });
  document.addEventListener("DOMContentLoaded", () => { const b = $("btn-adventure"); if (b) b.onclick = open; });
  window.openAdventure = open;
})();
