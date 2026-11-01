/* ============================================================
   ADVENTURE MODE — explore a map, battle wild critters in the
   tall grass, catch a team, beat the gate boss. Uses the site's
   own coins and Poké Balls (globals from app.js); the critters
   themselves are original, kept in this mode's own save.
============================================================ */
(function () {
  const KEY = "pf_adventure_v1", TILE = 32, W = 15, H = 11;
  const M = ["TTTTTTTTTTTTTTT","T..gggg...~~~BT","T..gggg...~~~.T","T.TT..gg..TT..T","T.TT..gg......T","T..ggg..ggg.TTT","T..ggg..ggg...T","T.~~....TT.gg.T","T.~~.H..TT.gg.T","T.......gg....T","TTTTTTTTTTTTTTT"];
  const SP = [
    { n: "Emberfox", e: "🦊", t: "Fire", hp: 46, a: 9 },
    { n: "Tidlet", e: "🐢", t: "Water", hp: 52, a: 8 },
    { n: "Leafrog", e: "🐸", t: "Grass", hp: 48, a: 8 },
    { n: "Voltmouse", e: "🐭", t: "Electric", hp: 40, a: 10 },
  ];
  const BOSS = { n: "Drakon", e: "🐲", t: "Dragon", hp: 110, a: 12, boss: true };
  const EFF = { Fire: { Grass: 2, Water: 0.5 }, Water: { Fire: 2, Grass: 0.5 }, Grass: { Water: 2, Fire: 0.5 }, Electric: { Water: 2 } };
  const mk = (sp) => ({ ...sp, max: sp.hp, cd: 0 });
  const $ = (id) => document.getElementById(id);
  let A, ctx, foe = null, inB = false, lock = false, built = false;

  function load() {
    try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.team) return r; } catch (e) {}
    return { team: [mk(SP[0])], badge: false, x: 1, y: 9 };
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) {} };
  const me = () => A.team.find((c) => c.hp > 0);
  const say = (t) => { $("adv-msg").textContent = t; };
  const log = (t) => { $("adv-log").textContent = t; };

  /* Site economy bridge (globals declared in app.js). */
  function addCoins(n) {
    try { coins += n; saveStoredNumber(COINS_KEY, coins); updateResourcesUI(); } catch (e) {}
  }
  const ballCount = () => { try { return getBallCount("pokeball"); } catch (e) { return 0; } };
  function spendBall() {
    try { if (!useBall("pokeball")) return false; saveInventory(); return true; } catch (e) { return false; }
  }

  function build() {
    if (built) return; built = true;
    $("adventure-page").innerHTML = `<div class="adv-wrap">
      <div class="adv-top"><button class="adv-btn adv-ghost" id="adv-back">← HOME</button><h2>ADVENTURE</h2><span class="adv-pill" id="adv-res"></span></div>
      <canvas id="adv-map" width="480" height="352" aria-label="Adventure map"></canvas>
      <div id="adv-msg"></div>
      <div class="adv-pad"><button class="adv-btn u" data-d="0,-1">▲</button><button class="adv-btn l" data-d="-1,0">◀</button><button class="adv-btn d" data-d="0,1">▼</button><button class="adv-btn r" data-d="1,0">▶</button></div>
      <div class="adv-team" id="adv-team"></div>
      <button class="adv-btn adv-ghost" id="adv-reset">Reset adventure</button>
      <div id="adv-battle" hidden><div class="adv-bx">
        <div class="adv-row foe"><div class="adv-em" id="adv-fe"></div><div class="adv-grow"><div class="adv-nm" id="adv-fn"></div><div class="adv-hp"><i id="adv-fh"></i></div></div></div>
        <div class="adv-row"><div class="adv-em" id="adv-me"></div><div class="adv-grow"><div class="adv-nm" id="adv-mn"></div><div class="adv-hp"><i id="adv-mh"></i></div></div></div>
        <div id="adv-log"></div>
        <div class="adv-acts"><button class="adv-btn" id="adv-a1">Attack</button><button class="adv-btn" id="adv-a2">Special</button><button class="adv-btn" id="adv-a3">Throw Poké Ball</button><button class="adv-btn adv-ghost" id="adv-a4">Run</button></div>
      </div></div></div>`;
    ctx = $("adv-map").getContext("2d");
    $("adv-back").onclick = close;
    $("adv-reset").onclick = () => { try { localStorage.removeItem(KEY); } catch (e) {} A = load(); draw(); refresh(); say("Adventure reset."); };
    document.querySelectorAll(".adv-pad button").forEach((b) => b.addEventListener("click", () => { const d = b.dataset.d.split(",").map(Number); step(d[0], d[1]); }));
    $("adv-a1").onclick = () => act("atk"); $("adv-a2").onclick = () => act("sp");
    $("adv-a3").onclick = () => act("ball"); $("adv-a4").onclick = () => act("run");
    say("Arrow keys, WASD or the pad to move. Tall grass hides wild critters; the cottage heals your team.");
  }

  function draw() {
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "24px serif";
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = M[y][x], px = x * TILE, py = y * TILE;
      ctx.fillStyle = c === "g" || c === "T" ? "#3f8f4a" : c === "~" ? "#3b82c4" : "#cdb98a";
      ctx.fillRect(px, py, TILE, TILE);
      if (c === "g") { ctx.fillStyle = "#2f7539"; ctx.fillRect(px + 6, py + 8, 3, 10); ctx.fillRect(px + 16, py + 12, 3, 12); ctx.fillRect(px + 23, py + 6, 3, 9); }
      const ico = c === "T" ? "🌲" : c === "H" ? "🏠" : c === "B" ? "🏯" : "";
      if (ico) ctx.fillText(ico, px + 16, py + 17);
    }
    ctx.fillText("🧑", A.x * TILE + 16, A.y * TILE + 17);
  }
  function refresh() {
    let c = 0; try { c = coins; } catch (e) {}
    $("adv-res").textContent = "🥮 " + c.toLocaleString() + "  ·  Poké Balls " + ballCount() + (A.badge ? "  ·  🏅" : "");
    $("adv-team").innerHTML = A.team.map((m) => `<span class="adv-chip${m.hp <= 0 ? " down" : ""}">${m.e} ${m.n} ${m.hp}/${m.max}</span>`).join("");
  }
  function step(dx, dy) {
    if (inB) return;
    const nx = A.x + dx, ny = A.y + dy, c = M[ny] && M[ny][nx];
    if (!c || c === "T" || c === "~") return;
    A.x = nx; A.y = ny; draw();
    if (c === "H") { A.team.forEach((m) => { m.hp = m.max; m.cd = 0; }); say("The cottage healed your whole team."); }
    else if (c === "B") fight({ ...BOSS, max: BOSS.hp, cd: 0 });
    else if (c === "g" && Math.random() < 0.2) fight(mk(SP[Math.floor(Math.random() * SP.length)]));
    else say("");
    refresh(); save();
  }
  function fight(f) {
    foe = f; inB = true; $("adv-battle").hidden = false;
    log(f.boss ? "The gate guardian " + f.n + " blocks your way!" : "A wild " + f.n + " appeared!");
    ui();
  }
  function ui() {
    const m = me(); if (!m || !foe) return;
    $("adv-fe").textContent = foe.e; $("adv-fn").innerHTML = foe.n + " <small>" + foe.t + "</small>";
    $("adv-fh").style.width = (foe.hp / foe.max) * 100 + "%";
    $("adv-me").textContent = m.e; $("adv-mn").innerHTML = m.n + " <small>" + m.t + " · " + m.hp + "/" + m.max + "</small>";
    $("adv-mh").style.width = (m.hp / m.max) * 100 + "%";
    $("adv-a2").disabled = m.cd > 0; $("adv-a2").textContent = m.cd > 0 ? "Special (" + m.cd + ")" : "Special";
    $("adv-a3").disabled = !!foe.boss || ballCount() < 1; $("adv-a4").disabled = !!foe.boss;
    refresh();
  }
  function dmg(a, d, mult) {
    const e = (EFF[a.t] && EFF[a.t][d.t]) || 1;
    return { v: Math.max(1, Math.round(a.a * (0.8 + Math.random() * 0.4) * mult * e)), e };
  }
  function act(kind) {
    if (lock || !foe) return;
    const m = me(); if (!m) return;
    if (kind === "run") {
      if (Math.random() < 0.6) { log("Got away safely!"); return done(400); }
      log("Couldn’t escape!");
    } else if (kind === "ball") {
      if (!spendBall()) { log("You’re out of Poké Balls!"); return; }
      if (Math.random() < 0.15 + 0.7 * (1 - foe.hp / foe.max)) {
        if (A.team.length < 6) { foe.cd = 0; A.team.push(foe); log("Gotcha! " + foe.n + " joined your team!"); }
        else { addCoins(30); log("Team full, so " + foe.n + " went to the ranch for 30 coins."); }
        return done(1000);
      }
      log("It broke free!");
    } else {
      if (kind === "sp") { if (m.cd > 0) return; m.cd = 3; }
      const r = dmg(m, foe, kind === "sp" ? 1.6 : 1);
      foe.hp = Math.max(0, foe.hp - r.v);
      log(m.n + " hits for " + r.v + (r.e > 1 ? " — super effective!" : r.e < 1 ? " — not very effective." : "."));
      if (foe.hp <= 0) return win();
    }
    ui(); foeTurn();
  }
  function foeTurn() {
    lock = true;
    setTimeout(() => {
      A.team.forEach((c) => { c.cd = Math.max(0, (c.cd || 0) - 1); });
      const m = me(), r = dmg(foe, m, 1);
      m.hp = Math.max(0, m.hp - r.v);
      log(foe.n + " hits " + m.n + " for " + r.v + "." + (m.hp <= 0 ? " " + m.n + " fainted!" : ""));
      lock = false; ui();
      if (!me()) { lock = true; setTimeout(blackout, 1000); }
    }, 600);
  }
  function win() {
    const gain = foe.boss ? 500 : 40; addCoins(gain);
    let t = "You won! +" + gain + " 🥮 coins.";
    if (foe.boss) { A.badge = true; t = "You defeated " + foe.n + " and earned the badge! +500 🥮 coins. Adventure complete!"; }
    const m = me(); if (m) m.hp = Math.min(m.max, m.hp + 8);
    log(t); ui(); done(1400);
  }
  function blackout() {
    A.team.forEach((c) => { c.hp = c.max; c.cd = 0; }); A.x = 1; A.y = 9;
    log("Your team is out of energy… you wake up back at the start."); done(1400);
  }
  function done(ms) {
    lock = true;
    setTimeout(() => { $("adv-battle").hidden = true; inB = false; lock = false; foe = null; refresh(); save(); draw(); }, ms);
  }

  function open() {
    A = load(); build();
    $("home-page").classList.add("hidden");
    $("adventure-page").classList.remove("hidden");
    draw(); refresh();
  }
  function close() {
    if (inB) return;
    $("adventure-page").classList.add("hidden");
    if (typeof showHomeScreen === "function") showHomeScreen(); else $("home-page").classList.remove("hidden");
  }
  const KEYS = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
  addEventListener("keydown", (e) => {
    const p = $("adventure-page"); if (!p || p.classList.contains("hidden")) return;
    const k = KEYS[e.key]; if (k) { e.preventDefault(); step(k[0], k[1]); }
  });
  document.addEventListener("DOMContentLoaded", () => { const b = $("btn-adventure"); if (b) b.onclick = open; });
  window.openAdventure = open;
})();
