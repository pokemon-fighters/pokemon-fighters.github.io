/* PWA — register the service worker so the laptop "Download" / Install
   button below can offer a real installable, offline-capable app. */

/* PWA — register the service worker so the laptop "Download" / Install
   button below can offer a real installable, offline-capable app.

   Also keeps the app self-updating: sw.js calls skipWaiting()/
   clients.claim() on every new version, so a newly-fetched service
   worker takes over almost immediately. The controllerchange
   listener below catches that handover and reloads the page once,
   so anyone with the app already open converges to the current
   build within a couple of seconds — no manual cache-clearing
   needed. (A stale cached build with an outdated Google OAuth
   Client ID is exactly what caused the earlier sign-in
   "origin_mismatch" issue.) */

if ("serviceWorker" in navigator) {
  let swRefreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (swRefreshing) {
      return;
    }

    swRefreshing = true;

    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        /* Ask the browser to re-check sw.js for a new version right
           away, then again whenever the tab regains focus, rather
           than relying solely on the browser's own update timing. */

        reg.update().catch(() => {});

        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            reg.update().catch(() => {});
          }
        });
      })
      .catch((err) => console.warn("[pwa] service worker failed:", err));
  });
}

const API = "https://pokeapi.co/api/v2/pokemon/";

const POKEMON_COUNT = 1029;

/* jsDelivr serves the same PokéAPI sprite repo from a CDN. Loading
   ~1000 cards straight from raw.githubusercontent.com gets
   rate-limited, which left most un-owned cards with blank images. */
const ARTWORK_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/" +
  "sprites/pokemon/other/official-artwork/";

const ARTWORK_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/" +
  "sprites/pokemon/other/official-artwork/";

const SPRITE_FALLBACK_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/" +
  "sprites/pokemon/";

const CAPTURED_STORAGE_KEY = "pf_captured_pokemon";

const SELECTED_STORAGE_KEY = "pf_selected_fighter";

const COINS_KEY = "pf_coins_v1";

/* There's no true "Poké Ball" emoji in Unicode — ⚪ was standing in
   for it, but doesn't actually look like one. The app already ships
   a real Poké Ball artwork asset (used for the captured-count icon
   in the header), so toasts/shop UI reuse that image instead. */
const POKEBALL_ICON_HTML =
  '<img src="pokeball.png" alt="Poké Ball" />';
const GEMS_KEY = "pf_gems_v1";
const POKEBALLS_KEY = "pf_pokeballs_v1";

/* Every non-basic ball type's count ({ great: 2, ultra: 1, ... }) and
   which ball the key-5 throw uses. The plain Poké Ball keeps its own
   counter (POKEBALLS_KEY) so older saves carry over untouched. */
const BALLS_KEY = "pf_balls_v2";
const SELECTED_BALL_KEY = "pf_selected_ball_v1";
const BERRIES_KEY = "pf_berries_v1";
const POTIONS_KEY = "pf_potions_v1";
const RANK_INDEX_KEY = "pf_rank_index_v1";
const RANK_WINS_KEY = "pf_rank_wins_v1";
const WIN_STREAK_KEY = "pf_win_streak_v1";
const BEST_STREAK_KEY = "pf_best_streak_v1";
const SETTINGS_KEY = "pf_settings_v1";
const GOOGLE_PROFILE_KEY = "pf_google_profile_v1";

const CLOUD_SYNCED_AT_KEY = "pf_cloud_synced_at";

/* ============================================================
   FIREBASE — Google sign-in (real, server-verified sessions) +
   Firestore (cross-device cloud save)
============================================================

Auth: Firebase Auth's Google provider replaces the earlier
"decode the JWT in the browser" approach — Firebase verifies the
sign-in properly, so request.auth.uid in Firestore security rules
can actually be trusted.

Storage: local per-account storage (nsKey() below) still exists
and is still what the rest of the game reads/writes moment to
moment — it's fast and works offline. Firestore is layered on
top purely for cross-device sync:
  - On sign-in (or when a different account than last time is
    detected), pull that account's cloud save (if any) into local
    storage, then reload so the whole app boots under it.
  - While playing, every save also schedules a debounced push of
    the current state up to Firestore.
  - On every load where you're already signed in, a quick
    background check compares the cloud save's timestamp to what
    was last synced locally — if another device saved something
    newer, it's pulled down and the page reloads once.
============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyB9znUIMoIj8Z1vz3m7fQSa6z2kVSt4j1I",
  authDomain: "pokemon-fighters-ac320.firebaseapp.com",
  projectId: "pokemon-fighters-ac320",
  storageBucket: "pokemon-fighters-ac320.firebasestorage.app",
  messagingSenderId: "624604328425",
  appId: "1:624604328425:web:49d986c08f51ca230c1b78",
  measurementId: "G-H06KF7XZ88",
};

/* Firebase App Check: proves requests come from THIS app, not a
   copy of your Firebase keys on someone else's website. To turn it
   on: Firebase Console → App Check → register the web app with
   reCAPTCHA v3, paste the SITE key below, then (after checking it
   works) switch on "Enforce" for Firestore. Leave empty to skip. */
const APP_CHECK_SITE_KEY = "";

let fbAuth = null;
let fbDb = null;

try {
  if (window.firebase && firebase.initializeApp) {
    firebase.initializeApp(firebaseConfig);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();

    if (APP_CHECK_SITE_KEY) {
      const sc = document.createElement("script");

      sc.src =
        "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check-compat.js";

      sc.onload = function () {
        try {
          firebase.appCheck().activate(APP_CHECK_SITE_KEY, true);
        } catch (e) {
          console.warn("[appcheck] activate failed:", e);
        }
      };

      document.head.appendChild(sc);
    }
  }
} catch (e) {
  console.warn("[firebase] init failed:", e);
}

let googleProfile = loadGoogleProfile();

/* ------------------------------------------------------------
   PER-ACCOUNT STORAGE NAMESPACING

   Sign-in is now required to use the app (see #auth-gate in
   index.html). Every piece of saved progress (coins, gems, rank,
   captured Pokémon, selected team, settings…) is namespaced by
   the signed-in Google account's `sub` (its stable unique ID), so
   two different accounts on the same device/browser never share
   or overwrite each other's save data.
------------------------------------------------------------ */

function accountNamespace() {
  return googleProfile && googleProfile.sub ? googleProfile.sub : "guest";
}

function nsKey(baseKey) {
  return baseKey + "__acct_" + accountNamespace();
}

function loadGoogleProfile() {
  try {
    const raw = localStorage.getItem(GOOGLE_PROFILE_KEY);

    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveGoogleProfile() {
  try {
    if (googleProfile) {
      localStorage.setItem(GOOGLE_PROFILE_KEY, JSON.stringify(googleProfile));
    } else {
      localStorage.removeItem(GOOGLE_PROFILE_KEY);
    }
  } catch (e) {
    /* Non-fatal. */
  }
}

function buildProfileFromFirebaseUser(user) {
  return {
    name: user.displayName || "",
    given_name: (user.displayName || "").split(" ")[0] || "",
    email: user.email || "",
    picture: user.photoURL || "",
    sub: user.uid,
  };
}

function startGoogleSignIn() {
  if (!fbAuth || !window.firebase) {
    showToast({
      icon: "⚠️",
      title: "Sign-in unavailable",
      message: "Firebase didn't load. Check your connection and try again.",
      tone: "error",
    });

    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();

  fbAuth.signInWithPopup(provider).catch((err) => {
    if (err && err.code === "auth/popup-closed-by-user") {
      return;
    }

    showToast({
      icon: "⚠️",
      title: "Sign-in failed",
      message: (err && err.message) || "Please try again.",
      tone: "error",
    });
  });
}

function handleGoogleSignOut() {
  if (fbAuth) {
    fbAuth.signOut().catch(() => {});
  }

  googleProfile = null;

  saveGoogleProfile();

  try {
    sessionStorage.setItem(
      "pf_pending_toast",
      JSON.stringify({ icon: "👋", title: "Signed out" }),
    );
  } catch (e) {
    /* Non-fatal. */
  }

  /* Reload so the sign-in gate reappears and no in-memory state from
     the signed-out account lingers on screen. */

  location.reload();
}

/* ------------------------------------------------------------
   CLOUD SYNC (Firestore)
------------------------------------------------------------ */

function cloudDocFor(uid) {
  return fbDb.collection("players").doc(uid);
}

function applyCloudDataToLocalStorage(uid, data) {
  const ns = (base) => base + "__acct_" + uid;

  try {
    if (typeof data.coins === "number") {
      localStorage.setItem(ns(COINS_KEY), String(data.coins));
    }

    if (typeof data.gems === "number") {
      localStorage.setItem(ns(GEMS_KEY), String(data.gems));
    }

    if (typeof data.rankIndex === "number") {
      localStorage.setItem(ns(RANK_INDEX_KEY), String(data.rankIndex));
    }

    if (typeof data.rankWins === "number") {
      localStorage.setItem(ns(RANK_WINS_KEY), String(data.rankWins));
    }

    if (typeof data.winStreak === "number") {
      localStorage.setItem(ns(WIN_STREAK_KEY), String(data.winStreak));
    }

    if (typeof data.bestStreak === "number") {
      localStorage.setItem(ns(BEST_STREAK_KEY), String(data.bestStreak));
    }

    if (data.ballCounts && typeof data.ballCounts === "object") {
      localStorage.setItem(ns(BALLS_KEY), JSON.stringify(data.ballCounts));
    }

    if (typeof data.pokeballCount === "number") {
      localStorage.setItem(ns(POKEBALLS_KEY), String(data.pokeballCount));
    }

    if (typeof data.berryCount === "number") {
      localStorage.setItem(ns(BERRIES_KEY), String(data.berryCount));
    }

    if (typeof data.potionCount === "number") {
      localStorage.setItem(ns(POTIONS_KEY), String(data.potionCount));
    }

    if (Array.isArray(data.captured)) {
      localStorage.setItem(ns(CAPTURED_STORAGE_KEY), JSON.stringify(data.captured));
    }

    if (Array.isArray(data.team)) {
      localStorage.setItem(ns(SELECTED_TEAM_KEY), JSON.stringify(data.team));
    }

    if (data.settings && typeof data.settings === "object") {
      localStorage.setItem(ns(SETTINGS_KEY), JSON.stringify(data.settings));
    }

    if (typeof data.selected === "string") {
      localStorage.setItem(ns(SELECTED_STORAGE_KEY), data.selected);
    }

    if (typeof data.updatedAt === "number") {
      localStorage.setItem(ns(CLOUD_SYNCED_AT_KEY), String(data.updatedAt));
    }
  } catch (e) {
    /* Non-fatal. */
  }
}

/* Pulls this account's cloud save (if any) down into local storage,
   then reloads the page so the whole app boots fresh under it. Used
   right after a sign-in, or when switching to a different account
   than whatever was cached locally. */

function pullCloudProgressThenReload() {
  if (!fbDb || !googleProfile) {
    location.reload();

    return;
  }

  const uid = googleProfile.sub;

  cloudDocFor(uid)
    .get()
    .then((snap) => {
      if (snap.exists) {
        applyCloudDataToLocalStorage(uid, snap.data());
      }
    })
    .catch((err) => {
      console.warn("[cloud] pull failed:", err);
    })
    .finally(() => {
      try {
        sessionStorage.setItem(
          "pf_pending_toast",
          JSON.stringify({
            icon: "✅",
            title: "Signed in with Google",
            message:
              googleProfile.given_name ||
              googleProfile.name ||
              googleProfile.email,
            tone: "success",
          }),
        );
      } catch (e) {
        /* Non-fatal. */
      }

      location.reload();
    });
}

/* For an already-signed-in return visit: checks whether another
   device has saved something newer than what's synced locally, and
   if so, pulls it down and reloads once. Doesn't touch anything if
   the local save is already current. */

function backgroundCloudSyncCheck() {
  if (!fbDb || !googleProfile) {
    return;
  }

  const uid = googleProfile.sub;

  cloudDocFor(uid)
    .get()
    .then((snap) => {
      if (!snap.exists) {
        return;
      }

      const data = snap.data();

      const cloudUpdatedAt =
        typeof data.updatedAt === "number" ? data.updatedAt : 0;

      const localSyncedAt = loadStoredNumber(CLOUD_SYNCED_AT_KEY, 0);

      /* A little slack avoids reacting to our own very-recent push. */

      if (cloudUpdatedAt > localSyncedAt + 1000) {
        applyCloudDataToLocalStorage(uid, data);

        try {
          sessionStorage.setItem(
            "pf_pending_toast",
            JSON.stringify({
              icon: "☁️",
              title: "Synced progress from another device",
            }),
          );
        } catch (e) {
          /* Non-fatal. */
        }

        location.reload();
      }
    })
    .catch((err) => {
      console.warn("[cloud] background sync check failed:", err);
    });
}

function pushCloudProgress() {
  if (!fbDb || !googleProfile) {
    return;
  }

  const uid = googleProfile.sub;

  const now = Date.now();

  const payload = {
    coins: loadStoredNumber(COINS_KEY, 0),
    gems: loadStoredNumber(GEMS_KEY, 0),
    rankIndex: loadStoredNumber(RANK_INDEX_KEY, 0),
    rankWins: loadStoredNumber(RANK_WINS_KEY, 0),
    winStreak: loadStoredNumber(WIN_STREAK_KEY, 0),
    bestStreak: loadStoredNumber(BEST_STREAK_KEY, 0),
    pokeballCount: loadStoredNumber(POKEBALLS_KEY, 0),
    ballCounts: loadBallCounts(),
    berryCount: loadStoredNumber(BERRIES_KEY, 0),
    potionCount: loadStoredNumber(POTIONS_KEY, 0),
    captured: loadCapturedList(),
    team: loadSelectedTeamNames(),
    settings: loadSettings(),
    selected: (() => {
      try {
        return localStorage.getItem(nsKey(SELECTED_STORAGE_KEY)) || "";
      } catch (e) {
        return "";
      }
    })(),
    updatedAt: now,
  };

  cloudDocFor(uid)
    .set(payload, { merge: true })
    .then(() => {
      try {
        localStorage.setItem(nsKey(CLOUD_SYNCED_AT_KEY), String(now));
      } catch (e) {
        /* Non-fatal. */
      }
    })
    .catch((err) => {
      console.warn("[cloud] push failed:", err);
    });
}

let cloudPushTimer = null;

/* Call this from every "save" primitive below — it debounces so a
   burst of rapid changes (e.g. leveling through a battle) becomes
   one Firestore write shortly after things settle down. */

function scheduleCloudPush() {
  if (!fbDb || !googleProfile) {
    return;
  }

  if (cloudPushTimer) {
    clearTimeout(cloudPushTimer);
  }

  cloudPushTimer = setTimeout(() => {
    cloudPushTimer = null;

    pushCloudProgress();
  }, 1500);
}

/* Reflects sign-in state in the topbar avatar and the Settings
   modal's Account section. Safe to call any time — no-ops if the
   relevant elements aren't in the DOM yet. */

function updateGoogleAccountUI() {
  const topbarAvatar = document.getElementById("topbar-avatar");

  if (topbarAvatar) {
    if (googleProfile && googleProfile.picture) {
      topbarAvatar.innerHTML =
        '<img src="' +
        googleProfile.picture +
        '" alt="" referrerpolicy="no-referrer" />';
    } else {
      topbarAvatar.textContent = "⚡";
    }
  }

  const signedOutEl = document.getElementById("google-signin-container");

  const signedInEl = document.getElementById("google-account-info");

  if (!signedOutEl || !signedInEl) {
    return;
  }

  if (googleProfile) {
    signedOutEl.classList.add("hidden");

    signedInEl.classList.remove("hidden");

    const avatar = document.getElementById("google-account-avatar");

    const name = document.getElementById("google-account-name");

    const email = document.getElementById("google-account-email");

    if (avatar) {
      avatar.src = googleProfile.picture || "";
    }

    if (name) {
      name.textContent =
        googleProfile.name || googleProfile.given_name || "Trainer";
    }

    if (email) {
      email.textContent = googleProfile.email || "";
    }
  } else {
    signedOutEl.classList.remove("hidden");

    signedInEl.classList.add("hidden");
  }
}

/* Wires the "Sign in with Google" button in the Settings modal. */

function initGoogleSignIn() {
  updateGoogleAccountUI();

  const container = document.getElementById("google-signin-container");

  if (!container) {
    return;
  }

  container.innerHTML =
    '<button type="button" class="google-btn" id="settings-google-btn">' +
    '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" /> Sign in with Google</button>';

  const btn = document.getElementById("settings-google-btn");

  if (btn) {
    btn.addEventListener("click", startGoogleSignIn);
  }
}

/* ============================================================
   AUTH STATE — the single source of truth for whether we're
   signed in. Fires once on load with whatever session Firebase
   already has cached (or null), and again on every sign-in/out.
============================================================ */

if (fbAuth) {
  let nameCheckedForAccount = null;

  fbAuth.onAuthStateChanged((user) => {
    if (user) {
      const profile = buildProfileFromFirebaseUser(user);

      const isSameAccount = googleProfile && googleProfile.sub === profile.sub;

      googleProfile = profile;

      saveGoogleProfile();

      startWalletAdjustmentListener();

      if (!isSameAccount) {
        /* A brand-new sign-in on this device, or a different account
           than whatever was cached — pull that account's cloud save
           (if any) and reload fresh under it. */

        pullCloudProgressThenReload();
      } else {
        /* Same account as already loaded — just check whether
           another device has saved something newer. */

        backgroundCloudSyncCheck();

        /* Reserve this trainer's name now that the signed-in user is
           known (once per account per page load). The check at
           startup ran BEFORE Firebase restored the session, saw no
           user, and silently did nothing — so a new account never
           had its Google first name checked and could end up sharing
           it with someone else. If the name is taken this swaps in a
           free one ("Arman" -> "Arman482"). */
        if (nameCheckedForAccount !== profile.sub) {
          nameCheckedForAccount = profile.sub;

          ensureTrainerNameClaimed();
        }
      }
    } else if (googleProfile) {
      /* Firebase says signed out (session expired, or signed out on
         another tab/device) but we still have a cached profile —
         clear it and show the gate. */

      googleProfile = null;

      saveGoogleProfile();

      location.reload();
    }
  });
}

/* ============================================================
   SIGN-IN GATE — blocks access to the app until the trainer signs
   in with Google. Progress is namespaced per account (see
   nsKey() above), so this also determines *whose* save data the
   rest of the app loads.
============================================================ */

function initAuthGate() {
  const gate = document.getElementById("auth-gate");

  if (!gate) {
    return;
  }

  if (googleProfile) {
    gate.classList.add("hidden");

    document.documentElement.classList.add("pf-authed");
    document.documentElement.classList.remove("pf-gate");

    return;
  }

  document.documentElement.classList.add("pf-gate");
  document.documentElement.classList.remove("pf-authed");

  gate.classList.remove("hidden");

  const container = document.getElementById("gate-google-signin-container");

  const hint = document.getElementById("gate-hint");

  if (!container) {
    return;
  }

  container.innerHTML =
    '<button type="button" class="google-btn google-btn-lg" id="gate-google-btn">' +
    '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" /> Sign in with Google</button>';

  const btn = document.getElementById("gate-google-btn");

  if (btn) {
    btn.addEventListener("click", startGoogleSignIn);
  }

  if (!fbAuth && hint) {
    hint.textContent =
      "Firebase didn't load. Check your connection or ad blocker, then refresh.";

    hint.classList.remove("hidden");
  }
}

/* Replays a toast queued just before a sign-in/sign-out reload
   (see pullCloudProgressThenReload / handleGoogleSignOut /
   backgroundCloudSyncCheck). */

function replayPendingToast() {
  try {
    const raw = sessionStorage.getItem("pf_pending_toast");

    if (!raw) {
      return;
    }

    sessionStorage.removeItem("pf_pending_toast");

    const opts = JSON.parse(raw);

    if (opts) {
      showToast(opts);
    }
  } catch (e) {
    /* Non-fatal. */
  }
}

/* ============================================================
   TOUCH CONTROLS (on-screen buttons for phones/tablets — mirror
   Player 1's keyboard controls by dispatching the same key
   events game.js already listens for, so game.js itself needs
   no changes)
============================================================ */

function dispatchGameKey(type, key, code) {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      key,
      code: code || key,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function wireTapButton(id, key, code) {
  const el = document.getElementById(id);

  if (!el) {
    return;
  }

  const press = (e) => {
    e.preventDefault();

    dispatchGameKey("keydown", key, code);

    dispatchGameKey("keyup", key, code);
  };

  el.addEventListener("pointerdown", press);
}

function wireHoldButton(id, key, code) {
  const el = document.getElementById(id);

  if (!el) {
    return;
  }

  const down = (e) => {
    e.preventDefault();

    el.classList.add("touch-btn-active");

    dispatchGameKey("keydown", key, code);
  };

  const up = (e) => {
    if (e) e.preventDefault();

    el.classList.remove("touch-btn-active");

    dispatchGameKey("keyup", key, code);
  };

  el.addEventListener("pointerdown", down);

  el.addEventListener("pointerup", up);

  el.addEventListener("pointercancel", up);

  el.addEventListener("pointerleave", up);
}

/* DOWNLOAD BUTTON — downloads the real desktop app (.exe installer).
   Deliberately does NOT use `beforeinstallprompt` / the browser's own
   "install as web app" prompt — that installs a stripped-down browser
   window, not the actual Pokémon Fighter app, which is not what this
   button is for. */

// URL of the built Windows installer (electron-builder / NSIS .exe).
// The Windows installer lives in a GitHub Release of the
// pokemon-fighters website repo. "releases/latest/download/<file>"
// always serves the newest release's file, so publishing a new
// version never needs a website change — just attach an installer
// named EXACTLY "Pokemon-Fighter-Setup.exe" (no version number in the
// file name) to each new release.
const WINDOWS_INSTALLER_URL =
  "https://github.com/pokemon-fighters/pokemon-fighters.github.io/releases/latest/download/Pokemon-Fighter-Setup.exe";
const WINDOWS_INSTALLER_FILENAME = "Pokemon-Fighter-Setup.exe";

function isWindows() {
  const uaPlatform =
    navigator.userAgentData?.platform || navigator.platform || "";
  return /Win/i.test(uaPlatform) || /Windows/i.test(navigator.userAgent);
}

function downloadWindowsInstaller() {
  const link = document.createElement("a");
  link.href = WINDOWS_INSTALLER_URL;
  link.download = WINDOWS_INSTALLER_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast({
    icon: "⬇",
    title: "Downloading installer",
    message:
      "Once it finishes, open the .exe and follow the setup wizard to install Pokémon Fighter.",
    duration: 6000,
  });
}

function initInstallPrompt() {
  const installBtn = document.getElementById("install-app-btn");

  if (!installBtn) return;

  // This button always downloads the real desktop app (.exe) — it no
  // longer falls back to the browser's own "install as web app"
  // prompt, which is a different thing (a stripped-down browser
  // window) from actually installing your app.
  installBtn.onclick = () => {
    if (isWindows()) {
      downloadWindowsInstaller();
      return;
    }

    // No Windows build detected for this visitor's OS yet — download
    // the Windows installer anyway (it's the only build that exists),
    // but be upfront that it's Windows-only for now.
    showToast({
      icon: "⬇",
      title: "Windows app only (for now)",
      message:
        "Pokémon Fighter's downloadable app is currently built for Windows. Downloading the .exe now — Mac/Linux support is coming later.",
      duration: 6000,
    });

    downloadWindowsInstaller();
  };
}

function initTouchControls() {
  wireHoldButton("touch-left", "a");

  wireHoldButton("touch-right", "d");

  wireTapButton("touch-jump", "w");

  wireTapButton("touch-attack", "s");

  /* Throw the selected Poké Ball (same as the 5 key). */
  wireTapButton("touch-ball", "5");

  /* Switch which ball type is thrown (same as the 6 key). */
  wireTapButton("touch-ball-next", "6");

  /* Move picker buttons are rebuilt every time the active Pokémon
     changes, so listen once on the container instead of wiring each
     button — tapping slot N presses hotkey N. */
  const touchMoves = document.getElementById("touch-moves");

  if (touchMoves) {
    touchMoves.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".touch-move-btn");

      if (!btn) return;

      e.preventDefault();

      dispatchGameKey("keydown", btn.dataset.slot);
      dispatchGameKey("keyup", btn.dataset.slot);
    });
  }

  wireTapButton("touch-dodge", "q");

  wireTapButton("touch-switch", "Tab", "Tab");

  wireHoldButton("touch-block", "Shift", "ShiftLeft");
}

/* Tiers a trainer climbs through in the League — promotion needs
   WINS_PER_PROMOTION league wins within the current tier. */

const RANK_TIERS = [
  { name: "Bronze III", icon: "🥉" },
  { name: "Bronze II", icon: "🥉" },
  { name: "Bronze I", icon: "🥉" },
  { name: "Silver III", icon: "🥈" },
  { name: "Silver II", icon: "🥈" },
  { name: "Silver I", icon: "🥈" },
  { name: "Gold III", icon: "🥇" },
  { name: "Gold II", icon: "🥇" },
  { name: "Gold I", icon: "🥇" },
  { name: "Platinum III", icon: "💠" },
  { name: "Platinum II", icon: "💠" },
  { name: "Platinum I", icon: "💠" },
  { name: "Diamond", icon: "💎" },
  { name: "Master", icon: "👑" },
];

const WINS_PER_PROMOTION = 3;

const STAT_LABELS = ["HP", "ATK", "DEF", "SP.ATK", "SP.DEF", "SPD"];

/* Small built-in list used only if the full roster call fails. */

const OFFLINE_ROSTER = [
  { name: "pikachu", id: 25 },
  { name: "charizard", id: 6 },
  { name: "lucario", id: 448 },
  { name: "gengar", id: 94 },
  { name: "greninja", id: 658 },
  { name: "blaziken", id: 257 },
  { name: "gyarados", id: 130 },
  { name: "dragonite", id: 149 },
  { name: "tyranitar", id: 248 },
  { name: "eevee", id: 133 },
];

const DEFAULT_STARTER = { name: "pikachu", id: 25 };

let selected = null;

let opponent = null;

let capturedList = loadCapturedList();

const SELECTED_TEAM_KEY = "pf_selected_team";

let teamSelection = new Set(
  loadSelectedTeamNames().filter((n) => capturedList.some((p) => p.name === n)),
);

/* Search query for Player 1's team-select grid — only used in
   2-player mode, when P1 (like P2) picks from the full Pokédex
   instead of just their captured list. */
let teamSelectQuery = "";

let teamSelectSearchTimer = null;

/* Player 2's team (local 2-player mode) is picked from the full
   Pokédex, not the captured list — P2 doesn't have their own
   "captured" pool in this single-device app. */

const SELECTED_TEAM_P2_KEY = "pf_selected_team_p2";

let p2TeamSelection = new Set(loadSelectedTeamP2Names());

/* Maps a Pokémon's name -> its dex id, filled in as each team-select
   grid renders. Lets the lineup strip show a thumbnail for a
   selected Pokémon without re-fetching the roster. */
const teamPickArtworkCache = {};

let selectedName = getPersistedSelectedName();

let rosterList = null;

let rosterLoading = null;

let activeCategory = "all";

let currentSearchQuery = "";

const typeListCache = {};

/* Local 2-player toggle — when on, Player 2 controls the
   opponent team with the keyboard instead of the AI. */
let twoPlayerModeEnabled = false;

/* Evolution: how much battle XP a captured Pokémon needs before it
   evolves. Used to be purely time-based (first 3 minutes, then 30,
   then 3 hours) — now it only evolves by actually being battled and
   winning with its trainer, same as the mainline games, checked
   right after XP is awarded on a win (see awardBattleXp) rather
   than on a timer. EVOLUTION_CHECK_MS keeps a periodic safety-net
   check too, in case XP was ever granted through another path. */
const EVOLUTION_XP_THRESHOLD = 200;
const EVOLUTION_CHECK_MS = 5 * 60 * 1000;
const evolutionChainCache = {};

/* ============================================================
   LEAGUE / ECONOMY STATE (coins, gems, rank, win streak)
============================================================ */

let coins = loadStoredNumber(COINS_KEY, 2450);

let gems = loadStoredNumber(GEMS_KEY, 180);

/* ============================================================
   ITEM INVENTORY (Poké Balls, Berries, Potions — bought in the
   Shop tab; see SHOP_ITEMS below for prices/effects)
============================================================ */

/* Starts with a handful of free balls so nobody who already has a
   save file finds themselves suddenly unable to catch anything the
   moment this update lands. */
let pokeballCount = loadStoredNumber(POKEBALLS_KEY, 10);

/* Small heal (used from the Captured roster). Starts at 0 — has to
   be bought, same as potions. */
let berryCount = loadStoredNumber(BERRIES_KEY, 0);

/* Full heal. */
let potionCount = loadStoredNumber(POTIONS_KEY, 0);

/* ------------------------------------------------------------
   BALL TYPES — every main-series ball, each its own item with its
   real item artwork (PokéAPI's sprite repo, via the jsDelivr CDN;
   falls back to the local pokeball.png if it can't load).

   mult  = flat catch-rate multiplier, OR
   calc  = (pokemon, ctx) => multiplier, for situational balls.
   ctx   = { attempts: throws already made at this Pokémon,
             lead: the trainer's lead Pokémon (or null) }
   onCatch(entry) = optional bonus applied to a Pokémon this ball
   catches; returns a short message to show, or "".
------------------------------------------------------------ */

const BALL_SPRITE_BASE =
  "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/";

function ballIcon(slug, name) {
  return (
    '<img src="' +
    BALL_SPRITE_BASE +
    slug +
    '.png" alt="' +
    name +
    '" loading="lazy" onerror="this.onerror=null;this.src=\'pokeball.png\'" />'
  );
}

function pokeTypes(p) {
  return ((p && p.types) || [])
    .map((t) => (t && t.type && t.type.name) || (t && t.name) || t)
    .filter((t) => typeof t === "string");
}

function pokeBst(p) {
  const stats = p && Array.isArray(p.stats) ? p.stats : null;

  if (!stats || !stats.length) return 450;

  const total = stats.reduce((s, x) => s + (Number(x && x.base_stat) || 0), 0);

  return total > 0 ? total : 450;
}

function pokeStat(p, statName) {
  const stats = p && Array.isArray(p.stats) ? p.stats : [];
  const hit = stats.find((s) => s && s.stat && s.stat.name === statName);

  return hit ? Number(hit.base_stat) || 0 : 0;
}

function sharesType(a, b) {
  const tb = pokeTypes(b);

  return pokeTypes(a).some((t) => tb.includes(t));
}

/* How many captured Pokémon have `type` (types are stored on each
   entry when it's caught; older entries without them don't count). */
function ownedOfType(type) {
  return capturedList.filter(
    (c) => Array.isArray(c.types) && c.types.includes(type),
  ).length;
}

const BALL_TYPES = [
  {
    id: "pokeball", flash: "#ff6b6b", slug: "poke-ball", name: "Poké Ball",
    desc: "The standard ball. Average catch rate.",
    price: 150, currency: "coins", mult: 1,
  },
  {
    id: "great", flash: "#5aa9ff", slug: "great-ball", name: "Great Ball",
    desc: "A good ball with a higher catch rate than a Poké Ball (1.5×).",
    price: 300, currency: "coins", mult: 1.5,
  },
  {
    id: "ultra", flash: "#ffd43b", slug: "ultra-ball", name: "Ultra Ball",
    desc: "A very good ball with an even higher catch rate (2×).",
    price: 600, currency: "coins", mult: 2,
  },
  {
    id: "master", flash: "#c77dff", slug: "master-ball", name: "Master Ball",
    desc: "The ultimate ball. It never fails to catch a Pokémon.",
    price: 300, currency: "gems", mult: Infinity,
  },
  {
    id: "premier", flash: "#ffffff", slug: "premier-ball", name: "Premier Ball",
    desc: "A plain ball made to celebrate. Same odds as a Poké Ball, but cheaper.",
    price: 100, currency: "coins", mult: 1,
  },
  {
    id: "luxury", flash: "#ffd43b", slug: "luxury-ball", name: "Luxury Ball",
    desc: "A comfortable ball. Same odds as a Poké Ball, and you earn 50 bonus coins when it catches something.",
    price: 350, currency: "coins", mult: 1,
    onCatch: () => {
      coins += 50;
      saveStoredNumber(COINS_KEY, coins);
      updateResourcesUI();

      return "+50 coins";
    },
  },
  {
    id: "heal", flash: "#ff9ecb", slug: "heal-ball", name: "Heal Ball",
    desc: "A remedial ball. Same odds as a Poké Ball, and a catch restores 25 HP to all of your Pokémon.",
    price: 250, currency: "coins", mult: 1,
    onCatch: () => {
      capturedList.forEach((c) => {
        c.hp = Math.min(100, (typeof c.hp === "number" ? c.hp : 100) + 25);
      });
      saveCapturedList();

      return "team +25 HP";
    },
  },
  {
    id: "quick", flash: "#4dabf7", slug: "quick-ball", name: "Quick Ball",
    desc: "Great on the first throw at a Pokémon (4×), ordinary after that.",
    price: 450, currency: "coins",
    calc: (p, ctx) => (ctx.attempts === 0 ? 4 : 1),
  },
  {
    id: "timer", flash: "#ff6b6b", slug: "timer-ball", name: "Timer Ball",
    desc: "Gets better with every failed throw at the same Pokémon (up to 4×).",
    price: 450, currency: "coins",
    calc: (p, ctx) => Math.min(4, 1 + 0.5 * ctx.attempts),
  },
  {
    id: "repeat", flash: "#ffa94d", slug: "repeat-ball", name: "Repeat Ball",
    desc: "3× against a Pokémon whose main type you already own 3 or more of (counts Pokémon caught from this update on).",
    price: 450, currency: "coins",
    calc: (p) => {
      const main = pokeTypes(p)[0];

      return main && ownedOfType(main) >= 3 ? 3 : 1;
    },
  },
  {
    id: "nest", flash: "#8ce99a", slug: "nest-ball", name: "Nest Ball",
    desc: "Better against weaker Pokémon: 3× on low base stats, 2× on middling ones.",
    price: 400, currency: "coins",
    calc: (p) => (pokeBst(p) < 400 ? 3 : pokeBst(p) < 500 ? 2 : 1),
  },
  {
    id: "net", flash: "#38d9a9", slug: "net-ball", name: "Net Ball",
    desc: "3× against Water- and Bug-type Pokémon.",
    price: 400, currency: "coins",
    calc: (p) => (pokeTypes(p).some((t) => t === "water" || t === "bug") ? 3 : 1),
  },
  {
    id: "dive", flash: "#339af0", slug: "dive-ball", name: "Dive Ball",
    desc: "3× against Water- and Ice-type Pokémon.",
    price: 400, currency: "coins",
    calc: (p) => (pokeTypes(p).some((t) => t === "water" || t === "ice") ? 3 : 1),
  },
  {
    id: "lure", flash: "#4dabf7", slug: "lure-ball", name: "Lure Ball",
    desc: "4× against Water-type Pokémon.",
    price: 400, currency: "coins",
    calc: (p) => (pokeTypes(p).includes("water") ? 4 : 1),
  },
  {
    id: "dusk", flash: "#9775fa", slug: "dusk-ball", name: "Dusk Ball",
    desc: "3× against Dark- and Ghost-type Pokémon.",
    price: 400, currency: "coins",
    calc: (p) => (pokeTypes(p).some((t) => t === "dark" || t === "ghost") ? 3 : 1),
  },
  {
    id: "level", flash: "#ff8787", slug: "level-ball", name: "Level Ball",
    desc: "3× if your lead Pokémon is stronger (higher base stats) than the target.",
    price: 450, currency: "coins",
    calc: (p, ctx) => (ctx.lead && pokeBst(ctx.lead) > pokeBst(p) ? 3 : 1),
  },
  {
    id: "moon", flash: "#b197fc", slug: "moon-ball", name: "Moon Ball",
    desc: "4× against Fairy-type Pokémon.",
    price: 450, currency: "coins",
    calc: (p) => (pokeTypes(p).includes("fairy") ? 4 : 1),
  },
  {
    id: "friend", flash: "#8ce99a", slug: "friend-ball", name: "Friend Ball",
    desc: "Same odds as a Poké Ball, and the Pokémon it catches joins you with 45 XP.",
    price: 400, currency: "coins", mult: 1,
    onCatch: (entry) => {
      entry.xp = (entry.xp || 0) + 45;

      return "+45 XP";
    },
  },
  {
    id: "love", flash: "#ff8fb1", slug: "love-ball", name: "Love Ball",
    desc: "3× against a Pokémon that shares a type with your lead Pokémon.",
    price: 450, currency: "coins",
    calc: (p, ctx) => (ctx.lead && sharesType(p, ctx.lead) ? 3 : 1),
  },
  {
    id: "heavy", flash: "#adb5bd", slug: "heavy-ball", name: "Heavy Ball",
    desc: "Better against heavy Pokémon: 2× over 100 kg, 3× over 200 kg, 4× over 300 kg.",
    price: 450, currency: "coins",
    calc: (p) => {
      const kg = (Number(p && p.weight) || 0) / 10;

      return kg >= 300 ? 4 : kg >= 200 ? 3 : kg >= 100 ? 2 : 1;
    },
  },
  {
    id: "fast", flash: "#ffd43b", slug: "fast-ball", name: "Fast Ball",
    desc: "4× against very fast Pokémon (base Speed 100 or more).",
    price: 450, currency: "coins",
    calc: (p) => (pokeStat(p, "speed") >= 100 ? 4 : 1),
  },
  {
    id: "dream", flash: "#faa2c1", slug: "dream-ball", name: "Dream Ball",
    desc: "3.5× against Psychic- and Ghost-type Pokémon.",
    price: 500, currency: "coins",
    calc: (p) => (pokeTypes(p).some((t) => t === "psychic" || t === "ghost") ? 3.5 : 1),
  },
  {
    id: "sport", flash: "#ffa94d", slug: "sport-ball", name: "Sport Ball",
    desc: "A special ball used in contests. A modest 1.5× catch rate.",
    price: 350, currency: "coins", mult: 1.5,
  },
  {
    id: "safari", flash: "#a9e34b", slug: "safari-ball", name: "Safari Ball",
    desc: "A camouflage-patterned ball from the Safari Zone. A modest 1.5× catch rate.",
    price: 350, currency: "coins", mult: 1.5,
  },
  {
    id: "park", flash: "#69db7c", slug: "park-ball", name: "Park Ball",
    desc: "A special ball for the Pal Park. A solid 2.5× catch rate.",
    price: 500, currency: "coins", mult: 2.5,
  },
  {
    id: "cherish", flash: "#ff6b6b", slug: "cherish-ball", name: "Cherish Ball",
    desc: "A rare commemorative ball. Same odds as a Poké Ball.",
    price: 10, currency: "gems", mult: 1,
  },
  {
    id: "beast", flash: "#4dabf7", slug: "beast-ball", name: "Beast Ball",
    desc: "5× against Legendary and Mythical Pokémon, but poor (0.4×) against everything else.",
    price: 60, currency: "gems",
    calc: (p) =>
      typeof isLegendaryPokemon === "function" && isLegendaryPokemon(p) ? 5 : 0.4,
  },
].map((b) => ({ ...b, icon: ballIcon(b.slug, b.name) }));

function ballById(id) {
  return BALL_TYPES.find((b) => b.id === id) || BALL_TYPES[0];
}

function loadBallCounts() {
  try {
    const raw = JSON.parse(localStorage.getItem(nsKey(BALLS_KEY)) || "{}");

    return raw && typeof raw === "object" ? raw : {};
  } catch (e) {
    return {};
  }
}

let ballCounts = loadBallCounts();

function getBallCount(id) {
  if (id === "pokeball") return pokeballCount;

  const n = Number(ballCounts[id]);

  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function addBalls(id, qty) {
  if (id === "pokeball") {
    pokeballCount += qty;
  } else {
    ballCounts[id] = getBallCount(id) + qty;
  }
}

function useBall(id) {
  if (getBallCount(id) <= 0) return false;

  if (id === "pokeball") {
    pokeballCount -= 1;
  } else {
    ballCounts[id] = getBallCount(id) - 1;
  }

  return true;
}

function totalBalls() {
  return BALL_TYPES.reduce((sum, b) => sum + getBallCount(b.id), 0);
}

let selectedBallId = (() => {
  try {
    return localStorage.getItem(nsKey(SELECTED_BALL_KEY)) || "pokeball";
  } catch (e) {
    return "pokeball";
  }
})();

/* The ball a throw actually uses: the selected one if any are left,
   otherwise the first type that still has stock. */
function activeBall() {
  if (getBallCount(selectedBallId) > 0) return ballById(selectedBallId);

  const next = BALL_TYPES.find((b) => getBallCount(b.id) > 0);

  return next || ballById(selectedBallId);
}

function selectBall(id) {
  selectedBallId = ballById(id).id;

  try {
    localStorage.setItem(nsKey(SELECTED_BALL_KEY), selectedBallId);
  } catch (e) {
    /* Non-fatal. */
  }
}

function cycleBall() {
  const owned = BALL_TYPES.filter((b) => getBallCount(b.id) > 0);

  if (!owned.length) return activeBall();

  const current = activeBall();
  const i = owned.findIndex((b) => b.id === current.id);
  const next = owned[(i + 1) % owned.length];

  selectBall(next.id);

  return next;
}

function saveInventory() {
  try {
    localStorage.setItem(nsKey(BALLS_KEY), JSON.stringify(ballCounts));
  } catch (e) {
    /* Non-fatal. */
  }

  saveStoredNumber(POKEBALLS_KEY, pokeballCount);
  saveStoredNumber(BERRIES_KEY, berryCount);
  saveStoredNumber(POTIONS_KEY, potionCount);
}

let rankIndex = clampNumber(
  loadStoredNumber(RANK_INDEX_KEY, 0),
  0,
  RANK_TIERS.length - 1,
);

let rankWins = loadStoredNumber(RANK_WINS_KEY, 0);

let winStreak = loadStoredNumber(WIN_STREAK_KEY, 4);

let bestStreak = loadStoredNumber(BEST_STREAK_KEY, 4);

/* Set true right before a battle launched from the League screen so
   handleBattleFinished() knows to apply rank rewards on top of the
   usual capture logic. */

let pendingLeagueMatch = false;

/* ============================================================
   SETTINGS (trainer name, sound, AI difficulty)
============================================================ */

let settings = loadSettings();

window.AI_DIFFICULTY = settings.difficulty;

/* Auto-fill the trainer name from the signed-in Google account the
   first time this account is seen — never clobber a name the
   trainer already chose for this account. */

if (
  googleProfile &&
  (!settings.trainerName ||
    settings.trainerName.trim() === "Player One" ||
    !settings.trainerName.trim())
) {
  settings.trainerName = (
    googleProfile.given_name ||
    googleProfile.name ||
    "Player One"
  ).slice(0, 16);

  saveSettings();
}

function loadSettings() {
  const defaults = {
    trainerName: "Player One",
    sound: true,
    difficulty: "normal",
  };

  try {
    const raw = localStorage.getItem(nsKey(SETTINGS_KEY));

    const parsed = raw ? JSON.parse(raw) : null;

    if (parsed && typeof parsed === "object") {
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    /* Ignore, fall through to defaults. */
  }

  return defaults;
}

function saveSettings() {
  try {
    localStorage.setItem(nsKey(SETTINGS_KEY), JSON.stringify(settings));
  } catch (e) {
    /* Non-fatal. */
  }

  scheduleCloudPush();
}

function loadStoredNumber(key, fallback) {
  try {
    const raw = localStorage.getItem(nsKey(key));

    const n = raw === null ? NaN : Number(raw);

    return Number.isFinite(n) ? n : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveStoredNumber(key, value) {
  try {
    localStorage.setItem(nsKey(key), String(value));
  } catch (e) {
    /* Non-fatal. */
  }

  scheduleCloudPush();
}

/* ============================================================
   TOAST NOTIFICATIONS (dynamic in-app alerts — no blocking
   window.alert()/window.confirm() dialogs anywhere in the app)
============================================================ */

function showToast(opts) {
  const config =
    typeof opts === "string"
      ? { message: opts }
      : opts && typeof opts === "object"
        ? opts
        : {};

  const {
    icon = "",
    title = "",
    message = "",
    duration = 3400,
    tone = "",
  } = config;

  const container = document.getElementById("toast-container");

  if (!container) {
    return;
  }

  const el = document.createElement("div");

  el.className = "toast" + (tone ? " toast-" + tone : "");

  el.innerHTML =
    (icon ? '<span class="toast-icon">' + icon + "</span>" : "") +
    '<div class="toast-body">' +
    (title ? "<b>" + title + "</b>" : "") +
    (message ? "<span>" + message + "</span>" : "") +
    "</div>";

  container.appendChild(el);

  requestAnimationFrame(() => el.classList.add("show"));

  const remove = () => {
    el.classList.remove("show");

    el.classList.add("hide");

    setTimeout(() => el.remove(), 260);
  };

  el.onclick = remove;

  setTimeout(remove, duration);
}

/* ============================================================
   SOUND EFFECTS (tiny WebAudio beeps — no external audio files,
   respects the Settings "Sound Effects" toggle)
============================================================ */

let audioCtx = null;

function ensureAudioCtx() {
  if (audioCtx) {
    return audioCtx;
  }

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    audioCtx = null;
  }

  return audioCtx;
}

function playTone(freq, duration, type, gainPeak) {
  if (!settings.sound) {
    return;
  }

  const ctx = ensureAudioCtx();

  if (!ctx) {
    return;
  }

  const osc = ctx.createOscillator();

  const gain = ctx.createGain();

  osc.type = type || "sine";

  osc.frequency.value = freq;

  gain.gain.value = 0;

  osc.connect(gain).connect(ctx.destination);

  const now = ctx.currentTime;

  gain.gain.linearRampToValueAtTime(gainPeak || 0.16, now + 0.02);

  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.start(now);

  osc.stop(now + duration + 0.05);
}

function sfxClick() {
  playTone(520, 0.07, "square", 0.1);
}

function sfxCapture() {
  playTone(660, 0.12, "sine", 0.16);

  setTimeout(() => playTone(880, 0.18, "sine", 0.16), 110);
}

function sfxEvolve() {
  playTone(440, 0.12, "sine", 0.16);

  setTimeout(() => playTone(660, 0.12, "sine", 0.16), 120);

  setTimeout(() => playTone(880, 0.22, "sine", 0.16), 240);
}

function sfxWin() {
  playTone(523, 0.1, "sine", 0.16);

  setTimeout(() => playTone(659, 0.1, "sine", 0.16), 100);

  setTimeout(() => playTone(784, 0.22, "sine", 0.16), 200);
}

function sfxKnockout() {
  playTone(180, 0.28, "triangle", 0.14);

  setTimeout(() => playTone(120, 0.4, "triangle", 0.12), 140);
}

function sfxPokeball() {
  playTone(760, 0.06, "square", 0.08);

  setTimeout(() => playTone(980, 0.1, "sine", 0.1), 120);
}

function sfxLose() {
  playTone(300, 0.2, "sawtooth", 0.09);

  setTimeout(() => playTone(220, 0.3, "sawtooth", 0.09), 150);
}

document.addEventListener("DOMContentLoaded", async () => {
  /* SIGN-IN GATE — do this first, before anything else wires up. */

  initAuthGate();

  replayPendingToast();

  const normal = document.getElementById("btn-normal-battle");

  const ranked = document.getElementById("btn-ranked-battle");

  /* CAPTURED COUNT */

  updateCapturedCountUI();

  /* RESOURCES / TRAINER NAME */

  updateResourcesUI();

  updateTrainerNameUI();

  ensureTrainerNameClaimed();

  claimDailyReward();

  showWhatsNewOnce();
  showTutorialOnce();

  /* 2-PLAYER TOGGLE */

  const toggle2p = document.getElementById("toggle-2p");

  if (toggle2p) {
    toggle2p.onclick = () => {
      twoPlayerModeEnabled = !twoPlayerModeEnabled;

      toggle2p.classList.toggle("active", twoPlayerModeEnabled);

      const label = document.getElementById("mode-toggle-label");

      if (label) {
        label.textContent = twoPlayerModeEnabled ? "2P" : "1P";
      }

      toggle2p.title = twoPlayerModeEnabled
        ? "2-player mode — Player 2 controls the opponent with arrow keys"
        : "1-player mode — the opponent is AI-controlled";

      syncFighterPreviewForMode().catch(() => {});
    };
  }

  /* EVOLUTION — check periodically, plus once shortly after load
     to catch anything that finished evolving while you were away. */

  setTimeout(checkEvolutions, 5000);

  setInterval(checkEvolutions, EVOLUTION_CHECK_MS);

  /* HOW TO PLAY */

  document.getElementById("btn-info").onclick = openInfoModal;

  document.getElementById("info-close").onclick = closeInfoModal;

  /* ONLINE BATTLE */

  initOnlineBattleUI();

  document.getElementById("info-modal").onclick = (e) => {
    if (e.target.id === "info-modal") {
      closeInfoModal();
    }
  };

  /* POKÉDEX / ROSTER */

  document.getElementById("btn-captured").onclick = () => openRoster("all");

  /* Top-right "captured" counter in the home header doubles as a
     shortcut into the same roster screen as the bottom-nav button. */
  const capturedTopbarBtn = document.getElementById("btn-captured-topbar");
  if (capturedTopbarBtn)
    capturedTopbarBtn.onclick = () => openRoster("captured");

  document.getElementById("roster-back").onclick = closeRoster;

  document.getElementById("roster-search").oninput = handleRosterSearch;

  document.querySelectorAll(".type-chip").forEach((chip) => {
    chip.onclick = () => setCategory(chip.dataset.type);
  });

  document.getElementById("pokedex-close").onclick = closePokedex;

  document.getElementById("pokedex-modal").onclick = (e) => {
    if (e.target.id === "pokedex-modal") {
      closePokedex();
    }
  };

  /* SETTINGS */

  document.getElementById("settings").onclick = openSettings;

  document.getElementById("settings-close").onclick = closeSettings;

  document.getElementById("settings-modal").onclick = (e) => {
    if (e.target.id === "settings-modal") {
      closeSettings();
    }
  };

  document.getElementById("settings-trainer-name").oninput = (e) => {
    settings.trainerName = e.target.value.slice(0, 16);

    saveSettings();

    updateTrainerNameUI();
  };

  document.getElementById("settings-trainer-name").onblur = () => {
    commitTrainerName();
  };

  document.getElementById("settings-trainer-name").onkeydown = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    }
  };

  document.getElementById("settings-sound-toggle").onclick = () => {
    settings.sound = !settings.sound;

    saveSettings();

    const btn = document.getElementById("settings-sound-toggle");

    btn.classList.toggle("active", settings.sound);

    btn.setAttribute("aria-pressed", settings.sound ? "true" : "false");

    if (settings.sound) {
      playTone(660, 0.1, "sine", 0.16);
    }
  };

  document.querySelectorAll("#settings-difficulty button").forEach((btn) => {
    btn.onclick = () => {
      settings.difficulty = btn.dataset.value;

      saveSettings();

      window.AI_DIFFICULTY = settings.difficulty;

      document.querySelectorAll("#settings-difficulty button").forEach((b) => {
        b.classList.toggle("active", b === btn);
      });

      sfxClick();
    };
  });

  document.getElementById("settings-reset").onclick = handleResetProgressClick;

  /* ACCOUNT (Google Sign-In) */

  initGoogleSignIn();

  const googleSignOutBtn = document.getElementById("google-signout-btn");

  if (googleSignOutBtn) {
    googleSignOutBtn.onclick = handleGoogleSignOut;
  }

  /* TOUCH CONTROLS (phones/tablets) */

  initTouchControls();

  /* INSTALL / DOWNLOAD (laptop) */

  initInstallPrompt();

  /* HOME */

  document.getElementById("back-home").onclick = () => {
    location.reload();
  };

  /* Let game.js report battle outcomes back here for the capture mechanic. */

  window.onBattleFinished = handleBattleFinished;

  /* LOAD POKEMON */

  await loadFighters();

  /* START MATCH */

  normal.onclick = () => {
    if (twoPlayerModeEnabled) {
      openTeamSelect();
      return;
    }

    /* AI battles (Normal Match) no longer show a team-select popup
       — they just fight with whichever Pokémon is currently set as
       your fighter on the Home screen, same as before Team Select
       existed. Change your fighter from the Captured tab if you
       want to battle with someone else. */
    teamSelectPurpose = "battle";
    teamSelection.clear();

    if (selectedName) {
      teamSelection.add(selectedName);
    }

    saveSelectedTeamNames();
    startBattle();
  };

  ranked.onclick = openLeague;

  document.getElementById("league-back").onclick = closeLeague;

  const shopBtn = document.getElementById("btn-shop");
  if (shopBtn) shopBtn.onclick = openShop;

  const shopBack = document.getElementById("shop-back");
  if (shopBack) shopBack.onclick = closeShop;

  document.getElementById("league-battle-btn").onclick = () => {
    pendingLeagueMatch = true;

    /* League is solo vs. AI only — local multiplayer isn't offered
       for ranked matches, so force 1-player mode even if the global
       2P toggle was left on from a Normal match. */

    if (twoPlayerModeEnabled) {
      twoPlayerModeEnabled = false;

      if (toggle2p) {
        toggle2p.classList.remove("active");
      }

      const label = document.getElementById("mode-toggle-label");

      if (label) {
        label.textContent = "1P";
      }

      if (toggle2p) {
        toggle2p.title = "1-player mode — the opponent is AI-controlled";
      }
    }

    closeLeague();

    /* League is 1-player only (forced above), so this always skips
       straight to battle with the current Home-screen fighter — no
       team-select popup, same as Normal Match. */
    teamSelectPurpose = "battle";
    teamSelection.clear();

    if (selectedName) {
      teamSelection.add(selectedName);
    }

    saveSelectedTeamNames();
    startBattle();
  };

  /* TEAM SELECT MODAL (Player 1 — from your captured Pokémon) */

  document.getElementById("team-select-close").onclick = closeTeamSelect;

  document.getElementById("team-select-cancel").onclick = closeTeamSelect;

  document.getElementById("team-select-modal").onclick = (e) => {
    if (e.target.id === "team-select-modal") {
      closeTeamSelect();
    }
  };

  document.getElementById("team-select-confirm").onclick = () => {
    saveSelectedTeamNames();

    closeTeamSelect();

    if (teamSelectPurpose === "online-random") {
      teamSelectPurpose = "battle";
      startRandomMatch();
      return;
    }

    if (teamSelectPurpose === "online-friend") {
      teamSelectPurpose = "battle";
      createFriendRoom();
      return;
    }

    if (teamSelectPurpose === "online-join") {
      teamSelectPurpose = "battle";
      const code = pendingOnlineJoinCode;
      pendingOnlineJoinCode = null;
      if (code) joinFriendRoom(code);
      return;
    }

    if (twoPlayerModeEnabled) {
      openTeamSelectP2();
    } else {
      startBattle();
    }
  };

  /* TEAM SELECT MODAL (Player 2 — local 2-player mode, from the
     full Pokédex, since P2 has no captured list of their own). */

  document.getElementById("team-select-p2-close").onclick = closeTeamSelectP2;

  document.getElementById("team-select-p2-cancel").onclick = closeTeamSelectP2;

  document.getElementById("team-select-p2-modal").onclick = (e) => {
    if (e.target.id === "team-select-p2-modal") {
      closeTeamSelectP2();
    }
  };

  document.getElementById("team-select-p2-confirm").onclick = () => {
    saveSelectedTeamP2Names();

    closeTeamSelectP2();

    syncFighterPreviewForMode().catch(() => {});

    startBattle();
  };

  document.getElementById("team-select-p2-search").oninput =
    handleTeamSelectP2Search;

  const teamSelectSearch = document.getElementById("team-select-search");

  if (teamSelectSearch) {
    teamSelectSearch.oninput = handleTeamSelectSearch;
  }

  /* Warm the roster list in the background so the picker opens instantly. */

  ensureRosterList().catch(() => {});
});

/* ============================================================
   RESOURCES / TRAINER NAME UI
============================================================ */

function updateResourcesUI() {
  const coinsEl = document.getElementById("coins");

  if (coinsEl) {
    coinsEl.textContent = coins.toLocaleString();
  }

  const gemsEl = document.getElementById("gems");

  if (gemsEl) {
    gemsEl.textContent = gems.toLocaleString();
  }

  const rankEl = document.getElementById("rank-label");

  if (rankEl) {
    rankEl.textContent = RANK_TIERS[rankIndex].name.toUpperCase();
  }

  const streakEl = document.getElementById("win-streak-label");

  if (streakEl) {
    streakEl.textContent = winStreak + " 🔥";
  }
}

function updateTrainerNameUI() {
  const label = document.getElementById("trainer-name-label");

  if (label) {
    label.textContent = (settings.trainerName || "").trim() || "Player One";
  }
}

/* ============================================================
   HOW TO PLAY MODAL
============================================================ */

function openInfoModal() {
  const body = document.getElementById("info-body");

  if (body) {
    body.innerHTML =
      "<div><h4>CONTROLS</h4>" +
      "<p>Player 1: W jump • A/D move • S attack (or 1-4 to throw a specific move) • Q dodge • Shift block • Tab switch Pokémon • 5 (or the ball button on phones) throw a Poké Ball (1-player) • 6 change ball type</p>" +
      "<p>On phones, tap the move buttons above the controls to throw a specific move. (Tap the ball button to throw your selected Poké Ball.)</p>" +
      "<p>Player 2 (turn on 2P mode on Home first): ↑ jump • ←/→ move • ↓ attack • / dodge • Right Shift block • Enter switch Pokémon</p></div>" +
      "<div><h4>BATTLING</h4>" +
      "<p>Attack after the warning telegraph appears. Jump or dodge to avoid incoming hits. When a Pokémon faints, there's a short pause before the next one comes in — the other side can't attack during it either.</p></div>" +
      "<div><h4>MOVES &amp; TYPE EFFECTIVENESS</h4>" +
      "<p>A captured Pokémon can know up to 4 real moves, bound to hotkeys 1-4 (a plain attack picks one at random). Some moves hit certain types much harder or barely at all — an Electric move barely scratches a Ground-type, for example.</p></div>" +
      "<div><h4>XP, LEARNING MOVES &amp; EVOLVING</h4>" +
      "<p>Win a 1-player battle and every Pokémon on your team earns XP. As XP climbs, a Pokémon can learn a new, higher-level move and forget its weakest one — and once it reaches enough XP, it evolves. Evolving no longer just takes time in your Pokédex.</p></div>" +
      "<div><h4>SWITCHING MID-FIGHT</h4>" +
      "<p>In a multi-Pokémon battle (local 2-player or League), press Tab (or click a bright team dot above the health bar) to swap in another Pokémon from your team without waiting for a faint.</p></div>" +
      "<div><h4>LOCAL 2-PLAYER</h4>" +
      "<p>Turn on 2P mode on Home, then hit Battle. Both trainers pick their own 6 from the full Pokédex before the fight starts, and every Pokémon starts at full health. Nobody's Pokémon get captured, gain XP or keep damage in 2P matches — it's trainer vs trainer.</p></div>" +
      "<div><h4>CAPTURING & POKÉ BALLS</h4>" +
      "<p>In a 1v1 battle against a wild Pokémon, press 5 to throw your selected ball (press 6 to change ball type). The weaker the Pokémon, the lower its health and the better the ball, the better your chance — and not every Pokémon is caught on the first try: it can break free, and you can throw again after a moment. Legendary Pokémon are the hardest, and a Master Ball never fails. After you win a 1-player battle, a catch screen opens where you pick a ball and throw it at the Pokémon you beat. Even a fainted Pokémon may not settle in the ball and can break free — just throw again while you have balls. Every throw uses up one ball. You can also open any wild Pokémon's Pokédex entry and buy it outright with coins or gems — no battle required. You can only battle using Pokémon you've captured — check the Captured tab in the Pokédex to see and pick your team.</p></div>" +
      "<div><h4>HEALING & THE SHOP</h4>" +
      "<p>Damage a captured Pokémon takes in battle carries over to its next fight — it won't reset to full on its own. Visit the Shop (in the footer nav) for every kind of Poké Ball (Poké, Great, Ultra, Master, Premier, Luxury, Heal, Quick, Timer, Repeat, Nest, Net, Dive, Lure, Dusk, Level, Moon, Friend, Love, Heavy, Fast, Dream, Sport, Safari, Park, Cherish and Beast), Berries (a quick +40 HP), and Potions (a full heal), then use a Berry or Potion from that Pokémon's Pokédex entry.</p></div>" +
      "<div><h4>LEGENDARY & MYTHICAL POKÉMON</h4>" +
      "<p>A Pokémon like Mew, Mewtwo, or another Legendary/Mythical (look for the ✨ badge) hits noticeably harder and shrugs off noticeably more damage than an ordinary Pokémon — treat one as a boss fight.</p></div>" +
      "<div><h4>DAILY REWARD</h4>" +
      "<p>Open the game once a day to collect free coins and a Poké Ball.</p></div>" +
      "<div><h4>LEAGUE</h4>" +
      "<p>Win League battles to earn coins and gems, build a win streak, and climb the rank ladder from Bronze all the way to Master.</p></div>" +
      "<div><h4>FRIENDS</h4>" +
      "<p>Tap the 👥 button at the top to open your friend list. Add a trainer by their exact name or 9-digit Trainer ID (shown in the Add tab), and they can accept or decline. Friends show as Online, In a battle, or when they were last seen. Tap ⚔ Invite on an online friend, choose a wager (or none), and send them a battle invite — they see the wager before accepting, and both of you pay the stake. The red number on the button is your pending requests and invites.</p></div>" +
      "<div><h4>ONLINE BATTLES</h4>" +
      "<p>Online fights use the same rules as the CPU: type matchups, immunities and the Legendary bonuses. Pick a wager (or none) before searching — both trainers must choose the same one, the server holds both stakes, and the winner takes the pot. A small number at the top shows your ping to the server (green is good). If your connection drops mid-match the game tries to reconnect for about 20 seconds, and when a match ends you can offer a rematch.</p></div>" +
      '<div><button type="button" id="replay-tutorial-btn" class="catch-btn">▶ Replay the quick tutorial</button></div>';

    const replay = document.getElementById("replay-tutorial-btn");

    if (replay) {
      replay.onclick = function () {
        closeInfoModal();
        showTutorial();
      };
    }
  }

  document.getElementById("info-modal").classList.remove("hidden");
}

function closeInfoModal() {
  document.getElementById("info-modal").classList.add("hidden");
}

/* ============================================================
   SETTINGS MODAL
============================================================ */

let resetArmed = false;

function openSettings() {
  const nameInput = document.getElementById("settings-trainer-name");

  if (nameInput) {
    nameInput.value = settings.trainerName || "";
  }

  setTrainerNameStatus(null, "");

  const soundToggle = document.getElementById("settings-sound-toggle");

  if (soundToggle) {
    soundToggle.classList.toggle("active", settings.sound);

    soundToggle.setAttribute("aria-pressed", settings.sound ? "true" : "false");
  }

  document.querySelectorAll("#settings-difficulty button").forEach((b) => {
    b.classList.toggle("active", b.dataset.value === settings.difficulty);
  });

  resetDangerButton();

  document.getElementById("settings-modal").classList.remove("hidden");
}

function closeSettings() {
  commitTrainerName();

  document.getElementById("settings-modal").classList.add("hidden");
}

function resetDangerButton() {
  resetArmed = false;

  const btn = document.getElementById("settings-reset");

  if (btn) {
    btn.textContent = "Reset Progress";

    btn.classList.remove("armed");
  }
}

function handleResetProgressClick() {
  const btn = document.getElementById("settings-reset");

  if (!resetArmed) {
    resetArmed = true;

    if (btn) {
      btn.textContent = "Tap again to confirm";

      btn.classList.add("armed");
    }

    setTimeout(() => {
      if (resetArmed) {
        resetDangerButton();
      }
    }, 4000);

    return;
  }

  [
    CAPTURED_STORAGE_KEY,
    SELECTED_STORAGE_KEY,
    SELECTED_TEAM_KEY,
    COINS_KEY,
    GEMS_KEY,
    RANK_INDEX_KEY,
    RANK_WINS_KEY,
    WIN_STREAK_KEY,
    BEST_STREAK_KEY,
    SETTINGS_KEY,
  ].forEach((key) => {
    try {
      /* Only this account's data — nsKey() namespaces every one of
         these by the signed-in account, so other accounts that have
         played on this device are untouched. */

      localStorage.removeItem(nsKey(key));
    } catch (e) {
      /* Non-fatal. */
    }
  });

  try {
    localStorage.removeItem(SELECTED_TEAM_P2_KEY);
  } catch (e) {
    /* Non-fatal. */
  }

  /* Also clear the cloud save for this account so it doesn't come
     back on this or any other device's next sync check. */

  if (fbDb && googleProfile) {
    cloudDocFor(googleProfile.sub)
      .delete()
      .catch((err) => console.warn("[cloud] reset delete failed:", err));
  }

  showToast({
    icon: "♻️",
    title: "Progress reset",
    message: "Starting fresh — reloading…",
  });

  setTimeout(() => location.reload(), 900);
}

/* ============================================================
   LEAGUE SCREEN
============================================================ */

/* ============================================================
   SCREEN NAVIGATION

   Every top-level screen (home, battlefield, roster/Pokédex,
   league) is an absolutely-positioned `.screen` element, shown by
   removing its "hidden" class. Several different exit paths (a
   battle ending, backing out of the league, closing the Pokédex,
   a WebSocket disconnect mid-match, a backgrounded tab throttling
   a cleanup setTimeout, etc.) all need to land back on the home
   screen — and each of those used to hide only the ONE screen it
   knew about before showing home again, so if a match ever ended
   in a way that skipped its own cleanup, that screen's health
   cards/name labels/pips (real DOM elements, not canvas pixels)
   stayed visible and rendered on top of the home screen underneath
   it. Routing every "go home" through one place that hides all the
   others removes that whole class of bug regardless of which path
   got taken to get here. Exposed on window so game.js (which loads
   before this file, but only ever calls this later, from inside
   event handlers/timeouts that fire well after app.js has loaded)
   can call it too instead of hiding the battlefield by itself. */
function showHomeScreen() {
  ["battlefield-page", "roster-page", "league-page", "shop-page"].forEach(
    (id) => {
      const el = document.getElementById(id);

      if (el) {
        el.classList.add("hidden");
      }
    },
  );

  const home = document.getElementById("home-page");

  if (home) {
    home.classList.remove("hidden");
  }

  /* The battle engine writes ITS Pokémon names/types into the same
     #player-name / #enemy-name / #player-type / #enemy-type elements
     the home screen uses, but never touches the home artwork and
     power. Coming back from a fight left names/types from the battle
     next to the previous matchup's images (until a page refresh).
     Re-render the home matchup from the real home state so all four
     (image, name, type, power) always agree. */
  if (selected && opponent) {
    try {
      renderPokemon(selected, "player");
      renderPokemon(opponent, "enemy");
    } catch (e) {
      /* Non-fatal — a refresh will redraw it. */
    }
  }
}

window.showHomeScreen = showHomeScreen;

/* After an ONLINE match, show the same "last online matchup" recap a
   page refresh would show (see takeLastOnlineMatchup/loadFighters),
   instead of waiting for the player to refresh. Called by game.js's
   stopOnlineBattleEngine once the home screen is back. */
window.onOnlineBattleEnded = function () {
  loadFighters().catch(() => {});
};

function openLeague() {
  renderLeagueScreen();

  document.getElementById("home-page").classList.add("hidden");

  document.getElementById("league-page").classList.remove("hidden");
}

function closeLeague() {
  document.getElementById("league-page").classList.add("hidden");

  showHomeScreen();
}

function renderLeagueScreen() {
  const tier = RANK_TIERS[rankIndex];

  const isMaxRank = rankIndex >= RANK_TIERS.length - 1;

  const iconEl = document.getElementById("league-rank-icon");

  if (iconEl) {
    iconEl.textContent = tier.icon;
  }

  const nameEl = document.getElementById("league-rank-name");

  if (nameEl) {
    nameEl.textContent = tier.name;
  }

  const fillEl = document.getElementById("league-progress-fill");

  if (fillEl) {
    fillEl.style.width = isMaxRank
      ? "100%"
      : Math.round((rankWins / WINS_PER_PROMOTION) * 100) + "%";
  }

  const progressLabelEl = document.getElementById("league-progress-label");

  if (progressLabelEl) {
    progressLabelEl.textContent = isMaxRank
      ? "Top rank reached!"
      : rankWins + "/" + WINS_PER_PROMOTION + " wins to promote";
  }

  const streakEl = document.getElementById("league-streak-value");

  if (streakEl) {
    streakEl.textContent = winStreak + " 🔥";
  }

  const bestEl = document.getElementById("league-best-streak-value");

  if (bestEl) {
    bestEl.textContent = String(bestStreak);
  }

  const coinsEl = document.getElementById("league-coins-value");

  if (coinsEl) {
    coinsEl.textContent = coins.toLocaleString();
  }

  const gemsEl = document.getElementById("league-gems-value");

  if (gemsEl) {
    gemsEl.textContent = gems.toLocaleString();
  }
}

/* ============================================================
   SHOP (Poké Balls, Berries, Potions)
============================================================ */

const SHOP_ITEMS = [
  ...BALL_TYPES.map((ball) => ({
    id: ball.id,
    icon: ball.icon,
    name: ball.name + (ball.qty ? " ×" + ball.qty : ""),
    desc: ball.desc,
    price: ball.price,
    currency: ball.currency,
    apply: () => {
      addBalls(ball.id, ball.qty || 1);
    },
  })),
  {
    id: "berry",
    icon: "🍒",
    name: "Berry",
    desc: "Heals 40 HP of a captured Pokémon's carried-over battle damage.",
    price: 80,
    currency: "coins",
    apply: () => {
      berryCount += 1;
    },
  },
  {
    id: "potion",
    icon: "🧪",
    name: "Potion",
    desc: "Fully heals a captured Pokémon's carried-over battle damage.",
    price: 60,
    currency: "gems",
    apply: () => {
      potionCount += 1;
    },
  },
];

function openShop() {
  renderShop();

  document.getElementById("home-page").classList.add("hidden");

  document.getElementById("shop-page").classList.remove("hidden");
}

function closeShop() {
  document.getElementById("shop-page").classList.add("hidden");

  showHomeScreen();
}

function renderShop() {
  const coinsEl = document.getElementById("shop-coins-value");
  if (coinsEl) coinsEl.textContent = coins.toLocaleString();

  const gemsEl = document.getElementById("shop-gems-value");
  if (gemsEl) gemsEl.textContent = gems.toLocaleString();

  const ballsInv = document.getElementById("shop-inv-pokeballs");
  if (ballsInv) ballsInv.textContent = String(totalBalls());

  const berriesInv = document.getElementById("shop-inv-berries");
  if (berriesInv) berriesInv.textContent = String(berryCount);

  const potionsInv = document.getElementById("shop-inv-potions");
  if (potionsInv) potionsInv.textContent = String(potionCount);

  const list = document.getElementById("shop-items");

  if (!list) return;

  list.innerHTML = SHOP_ITEMS.map((item) => {
    const affordable =
      item.currency === "gems" ? gems >= item.price : coins >= item.price;

    return (
      '<div class="shop-item-card">' +
      '<div class="shop-item-icon">' +
      item.icon +
      "</div>" +
      '<div class="shop-item-body">' +
      '<div class="shop-item-name">' +
      item.name +
      "</div>" +
      '<div class="shop-item-desc">' +
      item.desc +
      "</div>" +
      "</div>" +
      '<button class="shop-item-buy" data-id="' +
      item.id +
      '"' +
      (affordable ? "" : " disabled") +
      ">" +
      item.price +
      (item.currency === "gems" ? " 💎" : " 🥮") +
      "</button>" +
      "</div>"
    );
  }).join("");

  list.querySelectorAll(".shop-item-buy").forEach((btn) => {
    btn.onclick = () => buyShopItem(btn.dataset.id);
  });
}

function buyShopItem(id) {
  const item = SHOP_ITEMS.find((i) => i.id === id);

  if (!item) return;

  if (item.currency === "gems") {
    if (gems < item.price) {
      showToast({ icon: "⚠️", title: "Not enough gems" });
      return;
    }

    gems -= item.price;
    saveStoredNumber(GEMS_KEY, gems);
  } else {
    if (coins < item.price) {
      showToast({ icon: "⚠️", title: "Not enough coins" });
      return;
    }

    coins -= item.price;
    saveStoredNumber(COINS_KEY, coins);
  }

  item.apply();
  saveInventory();

  showToast({
    icon: item.icon,
    title: item.name + " purchased!",
    tone: "success",
  });

  renderShop();
  updateResourcesUI();
}

function saveLeagueState() {
  saveStoredNumber(COINS_KEY, coins);

  saveStoredNumber(GEMS_KEY, gems);

  saveStoredNumber(RANK_INDEX_KEY, rankIndex);

  saveStoredNumber(RANK_WINS_KEY, rankWins);

  saveStoredNumber(WIN_STREAK_KEY, winStreak);

  saveStoredNumber(BEST_STREAK_KEY, bestStreak);
}

function applyLeagueResult(playerWon) {
  if (playerWon) {
    winStreak += 1;

    bestStreak = Math.max(bestStreak, winStreak);

    rankWins += 1;

    const coinReward = 50 + winStreak * 10;

    coins += coinReward;

    let gemReward = 0;

    if (Math.random() < 0.35) {
      gemReward = 1 + Math.floor(Math.random() * 3);

      gems += gemReward;
    }

    let promoted = false;

    if (rankWins >= WINS_PER_PROMOTION && rankIndex < RANK_TIERS.length - 1) {
      rankWins = 0;

      rankIndex += 1;

      promoted = true;
    }

    saveLeagueState();

    updateResourcesUI();

    sfxWin();

    const rewardText =
      "+" + coinReward + " 🥮" + (gemReward ? " +" + gemReward + " 💎" : "");

    if (promoted) {
      showToast({
        icon: "🏆",
        title: "Promoted to " + RANK_TIERS[rankIndex].name + "!",
        message: rewardText,
        tone: "success",
        duration: 4200,
      });
    } else {
      showToast({
        icon: "⚔",
        title: "League Win!",
        message: rewardText + " • Streak " + winStreak,
        tone: "success",
      });
    }
  } else {
    winStreak = 0;

    let demoted = false;

    if (rankWins === 0 && rankIndex > 0) {
      rankIndex -= 1;

      rankWins = Math.max(0, WINS_PER_PROMOTION - 1);

      demoted = true;
    } else {
      rankWins = Math.max(0, rankWins - 1);
    }

    saveLeagueState();

    updateResourcesUI();

    sfxLose();

    showToast({
      icon: demoted ? "📉" : "💔",
      title: demoted ? "Demoted" : "League Loss",
      message: demoted
        ? "Dropped to " + RANK_TIERS[rankIndex].name + ". Your streak is reset."
        : "Win streak reset. Keep battling to climb the ranks!",
      tone: "error",
    });
  }

  if (!document.getElementById("league-page").classList.contains("hidden")) {
    renderLeagueScreen();
  }
}

/* ============================================================
   CAPTURED POKÉMON (persisted in localStorage)
============================================================ */

function loadCapturedList() {
  try {
    const raw = localStorage.getItem(nsKey(CAPTURED_STORAGE_KEY));

    const parsed = raw ? JSON.parse(raw) : null;

    if (Array.isArray(parsed) && parsed.length) {
      /* Backfill capturedAt on entries saved before the evolution
         feature existed, so they start their evolution clock now
         instead of evolving instantly. */

      let changed = false;

      parsed.forEach((p) => {
        if (!p.capturedAt) {
          p.capturedAt = Date.now();
          changed = true;
        }

        /* Backfill hp on entries saved before persistent battle
           damage existed — start them at full rather than treating
           "no field yet" as 0/fainted. */
        if (typeof p.hp !== "number") {
          p.hp = 100;
          changed = true;
        }

        /* Backfill xp on entries saved before the XP system existed
           — start at 0, same as a freshly-caught Pokémon. */
        if (typeof p.xp !== "number") {
          p.xp = 0;
          changed = true;
        }
      });

      if (changed) {
        try {
          localStorage.setItem(
            nsKey(CAPTURED_STORAGE_KEY),
            JSON.stringify(parsed),
          );
        } catch (e) {
          /* Non-fatal. */
        }
      }

      return parsed;
    }
  } catch (e) {
    /* Fall through to default starter. */
  }

  return [{ ...DEFAULT_STARTER, capturedAt: Date.now(), hp: 100, xp: 0 }];
}

function saveCapturedList() {
  try {
    localStorage.setItem(
      nsKey(CAPTURED_STORAGE_KEY),
      JSON.stringify(capturedList),
    );
  } catch (e) {
    /* Storage unavailable — capture still works for this session. */
  }

  scheduleCloudPush();
}

function isCaptured(name) {
  return capturedList.some((p) => p.name === name);
}

function capturePokemon(pokemon, ballId) {
  if (isCaptured(pokemon.name)) {
    return false;
  }

  capturedList.push({
    name: pokemon.name,
    id: pokemon.id,
    capturedAt: Date.now(),
    hp: 100,
    xp: 0,
    types: pokeTypes(pokemon),
    /* The ball it was caught in — it is released from this same
       ball every time it's sent out in battle. Bought Pokémon
       (no ball thrown) come in a plain Poké Ball. */
    ball: ballById(ballId).id,
  });

  if (typeof window.preloadBallSprites === "function") {
    window.preloadBallSprites([ballById(ballId).id]);
  }

  saveCapturedList();

  updateCapturedCountUI();

  return true;
}

/* ------------------------------------------------------------
   CATCHING

   Not every Pokémon settles in the ball. The chance depends on how
   strong the species is (base-stat total), how hurt it is (a
   fainted Pokémon is easiest, but still not guaranteed), which ball
   you throw, and legendaries are extra stubborn. Only a Master Ball
   never fails.
------------------------------------------------------------ */

function leadPokemon() {
  return selected || null;
}

/* hpFraction: 1 = full health, 0 = fainted. ctx.attempts = throws
   already made at this Pokémon. */
function catchChance(pokemon, ball, hpFraction, ctx) {
  if (ball.mult === Infinity) return 1;

  const c = ctx || { attempts: 0, lead: leadPokemon() };

  const base = clampNumber(1.05 - pokeBst(pokemon) / 700, 0.12, 0.85);

  const hpFactor = 1.5 - clampNumber(hpFraction, 0, 1);

  const mult =
    typeof ball.calc === "function"
      ? ball.calc(pokemon, c)
      : typeof ball.mult === "number"
        ? ball.mult
        : 1;

  let chance = base * hpFactor * mult;

  if (typeof isLegendaryPokemon === "function" && isLegendaryPokemon(pokemon)) {
    chance *= 0.5;
  }

  /* Even a fainted, weak Pokémon can refuse to settle in the ball. */
  return clampNumber(chance, 0.03, 0.9);
}

/* One throw of `ball` at `pokemon`. Spends the ball. Returns
   { result: "caught" | "escaped" | "no-balls" | "skip", note }. */
function rollThrow(pokemon, hpFraction, ball, ctx) {
  if (!pokemon || isCaptured(pokemon.name)) {
    return { result: "skip", note: "" };
  }

  if (!useBall(ball.id)) {
    return { result: "no-balls", note: "" };
  }

  ctx.attempts = (ctx.attempts || 0) + 1;

  const chance = catchChance(pokemon, ball, hpFraction, {
    attempts: ctx.attempts - 1,
    lead: ctx.lead,
  });

  if (Math.random() < chance && capturePokemon(pokemon, ball.id)) {
    const entry = capturedList.find((c) => c.name === pokemon.name);

    let note = "";

    if (entry && typeof ball.onCatch === "function") {
      try {
        note = ball.onCatch(entry) || "";
        saveCapturedList();
      } catch (e) {
        note = "";
      }
    }

    return { result: "caught", note };
  }

  return { result: "escaped", note: "" };
}

/* Which ball a captured Pokémon was caught in (null if it isn't
   captured). game.js uses this to send it out of that exact ball. */
window.getCaughtBallId = function (name) {
  const entry = capturedList.find((c) => c.name === name);

  return entry ? ballById(entry.ball).id : null;
};

/* Ball sprite URL + the color of its "opening" flash, for game.js. */
window.getBallVisual = function (ballId) {
  const b = ballById(ballId);

  return { slug: b.slug, url: BALL_SPRITE_BASE + b.slug + ".png", color: b.flash };
};

const battleThrowContexts = new WeakMap();

/* The key-5 / touch-button throw during a 1-player battle. game.js
   calls this and, when it returns "caught", ends the battle as a
   win (1v1) or sends that team member out (team battle). */
window.throwBallInBattle = function (pokemon, hpFraction) {
  const ball = activeBall();

  let ctx = battleThrowContexts.get(pokemon);

  if (!ctx) {
    ctx = { attempts: 0, lead: leadPokemon() };
    battleThrowContexts.set(pokemon, ctx);
  }

  const r = rollThrow(pokemon, hpFraction, ball, ctx);

  saveInventory();
  updateCapturedCountUI();

  if (r.result === "caught") {
    sfxCapture();
    playCaptureAnimation();

    showToast({
      icon: ball.icon,
      title: "Gotcha!",
      message:
        formatDisplayName(pokemon.name) +
        " was caught with a " +
        ball.name +
        "!" +
        (r.note ? " (" + r.note + ")" : ""),
      tone: "success",
    });
  } else if (r.result === "escaped") {
    showToast({
      icon: ball.icon,
      title: formatDisplayName(pokemon.name) + " broke free!",
      message: "It didn't settle in the ball. Weaken it more or try a better ball.",
      tone: "error",
    });
  } else if (r.result === "no-balls") {
    showToast({
      icon: POKEBALL_ICON_HTML,
      title: "No Poké Balls!",
      message: "Visit the Shop to buy more.",
      tone: "error",
    });
  }

  return r.result;
};

window.cycleBallInBattle = function () {
  const ball = cycleBall();

  showToast({
    icon: ball.icon,
    title: ball.name + " ready",
    message: "×" + getBallCount(ball.id) + " left — press 5 to throw",
  });

  return ball.name;
};

window.getActiveBallLabel = function () {
  const ball = activeBall();

  return ball.name + " ×" + getBallCount(ball.id);
};

/* ------------------------------------------------------------
   CATCH SCREEN — shown after you beat a wild Pokémon (or team) in
   1-player mode. Pick a ball, throw it, watch it shake. The ball
   can fail ("didn't settle") even on a fainted Pokémon, and you can
   keep throwing while you have balls.
------------------------------------------------------------ */

let catchModalState = null;

function ensureCatchModal() {
  let el = document.getElementById("catch-modal");

  if (!el) {
    el = document.createElement("div");
    el.id = "catch-modal";
    el.className = "catch-modal hidden";

    document.body.appendChild(el);
  }

  return el;
}

function openCatchModal(pokemonList) {
  const queue = (pokemonList || []).filter(
    (p) => p && p.id && !isCaptured(p.name),
  );

  if (!queue.length) return;

  catchModalState = {
    queue,
    index: 0,
    ctx: { attempts: 0, lead: leadPokemon() },
    busy: false,
    message: "",
    caught: false,
  };

  ensureCatchModal().classList.remove("hidden");

  renderCatchModal();
}

function closeCatchModal() {
  const el = ensureCatchModal();

  el.classList.add("hidden");
  el.innerHTML = "";

  catchModalState = null;

  saveInventory();
  updateCapturedCountUI();
}

function nextCatchTarget() {
  const st = catchModalState;

  if (!st) return;

  st.index += 1;
  st.ctx = { attempts: 0, lead: leadPokemon() };
  st.message = "";
  st.caught = false;
  st.busy = false;

  if (st.index >= st.queue.length) {
    closeCatchModal();
  } else {
    renderCatchModal();
  }
}

function renderCatchModal() {
  const st = catchModalState;

  if (!st) return;

  const p = st.queue[st.index];
  const el = ensureCatchModal();
  const name = formatDisplayName(p.name);
  const ball = activeBall();
  const owned = BALL_TYPES.filter((b) => getBallCount(b.id) > 0);
  const hasBalls = owned.length > 0;
  const isLast = st.index >= st.queue.length - 1;

  const chance = hasBalls
    ? Math.round(catchChance(p, ball, 0, st.ctx) * 100)
    : 0;

  const chips = owned
    .map(
      (b) =>
        '<button type="button" class="catch-ball-chip' +
        (b.id === ball.id ? " selected" : "") +
        '" data-ball="' +
        b.id +
        '" title="' +
        b.desc.replace(/"/g, "&quot;") +
        '"' +
        (st.busy || st.caught ? " disabled" : "") +
        ">" +
        '<span class="catch-ball-icon">' +
        b.icon +
        "</span>" +
        "<b>" +
        b.name +
        "</b><small>×" +
        getBallCount(b.id) +
        "</small></button>",
    )
    .join("");

  let actions;

  if (st.caught) {
    actions =
      '<button type="button" class="catch-btn primary" data-act="next">' +
      (isLast ? "Done" : "Next ▶") +
      "</button>";
  } else if (!hasBalls) {
    actions =
      '<button type="button" class="catch-btn primary" data-act="shop">Go to Shop</button>' +
      '<button type="button" class="catch-btn" data-act="skip">Let it go</button>';
  } else {
    actions =
      '<button type="button" class="catch-btn primary" data-act="throw"' +
      (st.busy ? " disabled" : "") +
      ">Throw " +
      ball.name +
      "</button>" +
      '<button type="button" class="catch-btn" data-act="skip"' +
      (st.busy ? " disabled" : "") +
      ">Let it go</button>";
  }

  const status =
    st.message ||
    (hasBalls
      ? name + " is weakened — throw a ball!"
      : "You're out of Poké Balls. Visit the Shop to buy some.");

  el.innerHTML =
    '<div class="catch-card">' +
    '<div class="catch-top"><span>CATCH</span>' +
    (st.queue.length > 1
      ? "<span>" + (st.index + 1) + " / " + st.queue.length + "</span>"
      : "") +
    "</div>" +
    '<div class="catch-stage' +
    (st.caught ? " success" : "") +
    '">' +
    '<img class="catch-mon' +
    (st.caught ? " caught" : "") +
    '" id="catch-mon" src="' +
    artworkUrl(p.id) +
    '" alt="' +
    name +
    '" onerror="this.onerror=null;this.src=\'' +
    spriteFallbackUrl(p.id) +
    "'\" />" +
    '<div class="catch-ball-anim hidden" id="catch-ball-anim">' +
    ball.icon +
    "</div>" +
    "</div>" +
    '<div class="catch-name">' +
    name +
    "</div>" +
    '<div class="catch-status" id="catch-status">' +
    status +
    "</div>" +
    (hasBalls && !st.caught
      ? '<div class="catch-chance">Catch chance with ' +
        ball.name +
        ": <b>~" +
        chance +
        "%</b></div>"
      : "") +
    (hasBalls ? '<div class="catch-balls">' + chips + "</div>" : "") +
    '<div class="catch-actions">' +
    actions +
    "</div></div>";

  el.querySelectorAll(".catch-ball-chip").forEach((btn) => {
    btn.onclick = () => {
      selectBall(btn.dataset.ball);
      renderCatchModal();
    };
  });

  const throwBtn = el.querySelector('[data-act="throw"]');
  if (throwBtn) throwBtn.onclick = doCatchThrow;

  const nextBtn = el.querySelector('[data-act="next"]');
  if (nextBtn) nextBtn.onclick = nextCatchTarget;

  const skipBtn = el.querySelector('[data-act="skip"]');
  if (skipBtn) skipBtn.onclick = nextCatchTarget;

  const shopBtn = el.querySelector('[data-act="shop"]');
  if (shopBtn) {
    shopBtn.onclick = () => {
      closeCatchModal();
      openShop();
    };
  }
}

function doCatchThrow() {
  const st = catchModalState;

  if (!st || st.busy || st.caught) return;

  const p = st.queue[st.index];
  const ball = activeBall();

  if (getBallCount(ball.id) <= 0) {
    renderCatchModal();
    return;
  }

  st.busy = true;

  /* Decide the outcome up front, then play the animation to match. */
  const r = rollThrow(p, 0, ball, st.ctx);

  saveInventory();

  const mon = document.getElementById("catch-mon");
  const anim = document.getElementById("catch-ball-anim");
  const status = document.getElementById("catch-status");

  document
    .querySelectorAll("#catch-modal button")
    .forEach((b) => (b.disabled = true));

  if (status) status.textContent = "You threw a " + ball.name + "…";

  if (mon) mon.classList.add("absorb");

  try {
    sfxPokeball();
  } catch (e) {
    /* Cosmetic only. */
  }

  setTimeout(() => {
    if (anim) {
      anim.innerHTML = ball.icon;
      anim.classList.remove("hidden");
      anim.classList.add("wobble");
    }
  }, 450);

  /* A small "click" for each shake of the ball. */
  for (let i = 0; i < (r.result === "caught" ? 3 : 2); i++) {
    setTimeout(() => {
      try {
        playTone(520 + i * 60, 0.07, "square", 0.05);
      } catch (e) {
        /* Cosmetic only. */
      }
    }, 450 + 400 + i * 800);
  }

  const shakes = r.result === "caught" ? 3 : 1 + Math.floor(Math.random() * 2);

  setTimeout(() => {
    if (!catchModalState) return;

    if (anim) {
      anim.classList.remove("wobble");
      anim.classList.add("hidden");
    }

    const name = formatDisplayName(p.name);

    if (r.result === "caught") {
      st.caught = true;
      st.busy = false;
      st.message =
        "Gotcha! " +
        name +
        " was caught and added to your Pokédex!" +
        (r.note ? " (" + r.note + ")" : "");

    } else {
      st.busy = false;
      st.message =
        "Oh no! " +
        name +
        " didn't settle in the ball and broke free! " +
        (getBallCount(activeBall().id) > 0
          ? "Try again."
          : "You're out of balls.");
    }

    /* Update the screen FIRST so a sound/animation hiccup can never
       leave it stuck on "You threw a ball…" with dead buttons. */
    renderCatchModal();

    if (r.result === "caught") {
      try {
        sfxCapture();
        playCaptureAnimation();
      } catch (e) {
        /* Cosmetic only. */
      }
    }
  }, 450 + shakes * 800 + 300);
}

/* ============================================================
   MOVE SLOTS (hotkeys 1-4) & MOVE PROGRESSION

   Each captured Pokémon can learn up to a handful of real,
   PokéAPI-derived attacking moves (resolveLearnableMoves, cached
   once per Pokémon as entry.learnableMoves). Which 4 of those are
   currently "active" — and bindable to hotkeys 1-4 in a local
   battle — is derived fresh from its XP every time: as XP passes
   another move's unlock threshold, that move swaps in and the
   Pokémon's oldest currently-known move drops out, mirroring how
   move learning/forgetting works in the mainline games without
   needing to separately track "did I already learn this."
============================================================ */

/* One derived "level" per XP_PER_LEVEL earned — purely a way to
   gate move unlocks against real per-species learn-levels fetched
   from PokéAPI, not a full stat-growth level system. */
const XP_PER_LEVEL = 15;

function computeMoveLevel(xp) {
  return 1 + Math.floor((typeof xp === "number" ? xp : 0) / XP_PER_LEVEL);
}

/* The 4 moves a Pokémon currently knows, given its cached learnset
   and current XP — highest-level qualifying moves first, capped at
   4, so leveling past a 5th move's threshold naturally drops the
   lowest-level one it knew before. Returns null if no learnset has
   been resolved for it yet (resolveLearnableMoves hasn't run). */
function getActiveMoves(entry) {
  const learnable = Array.isArray(entry && entry.learnableMoves)
    ? entry.learnableMoves
    : null;

  if (!learnable || !learnable.length) {
    return null;
  }

  const level = computeMoveLevel(entry.xp);

  const known = learnable.filter((m) => (m.level || 1) <= level);

  const pool = known.length ? known : learnable.slice(0, 1);

  /* learnable is stored sorted ascending by level, so the last 4
     entries of whatever currently qualifies are its most-advanced
     known moves. */
  return pool.slice(-4);
}

/* Fetches up to a handful of this Pokémon's real level-up attacking
   moves from PokéAPI, in ONE parallel batch (rather than the
   sequential up-to-20-tries approach resolveBattleMove uses for a
   single move) so resolving 4 moves doesn't multiply battle-start
   latency. Falls back to the shared generic type move (no fetch
   needed) if a species genuinely doesn't have enough distinct real
   attacking moves among the candidates tried. */
async function resolveLearnableMoves(pokemon) {
  const moves = Array.isArray(pokemon.moves) ? pokemon.moves : [];

  const levelUp = [];
  const seenNames = new Set();

  moves.forEach((m) => {
    const detail = (m.version_group_details || []).find(
      (d) => d.move_learn_method && d.move_learn_method.name === "level-up",
    );

    if (detail) {
      levelUp.push({
        name: m.move.name,
        url: m.move.url,
        level: Math.max(1, detail.level_learned_at || 1),
      });

      seenNames.add(m.move.name);
    }
  });

  levelUp.sort((a, b) => a.level - b.level);

  const rest = moves
    .filter((m) => !seenNames.has(m.move.name))
    .map((m) => ({ name: m.move.name, url: m.move.url, level: 999 }));

  const candidates = levelUp.concat(rest).slice(0, 10);

  const settled = await Promise.allSettled(
    candidates.map((c) => fetch(c.url).then((r) => (r.ok ? r.json() : null))),
  );

  const learned = [];
  const seenMoveNames = new Set();

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];

    if (result.status !== "fulfilled" || !result.value) continue;

    const data = result.value;

    const isAttack =
      data.power && data.damage_class && data.damage_class.name !== "status";

    if (!isAttack || seenMoveNames.has(data.name)) continue;

    seenMoveNames.add(data.name);

    const move = buildMoveFromApi(data);
    move.level = candidates[i].level >= 999 ? 1 : candidates[i].level;

    learned.push(move);
  }

  learned.sort((a, b) => a.level - b.level);

  if (!learned.length) {
    const fallback = getMove(pokemon);
    fallback.level = 1;
    learned.push(fallback);
  }

  return learned;
}

/* Ensures `entry` (a capturedList record) has a cached learnset,
   fetching it once if missing, and returns it. `pokemon` is the raw
   PokéAPI data for that same species (has the .moves list needed to
   resolve it) — only needed the first time. */
async function ensureLearnableMoves(entry, pokemon) {
  if (Array.isArray(entry.learnableMoves) && entry.learnableMoves.length) {
    return entry.learnableMoves;
  }

  try {
    entry.learnableMoves = await resolveLearnableMoves(pokemon);
    saveCapturedList();
  } catch (e) {
    entry.learnableMoves = [{ ...getMove(pokemon), level: 1 }];
  }

  return entry.learnableMoves;
}

/* Writes each owned team member's ending battle hp back into their
   capturedList entry, floored at 1 (never store a literal 0) so a
   Pokémon that fainted mid-battle isn't permanently bricked without
   a heal — it just comes back critically low next time instead. */
function writeBackTeamHp(team) {
  if (!Array.isArray(team)) return;

  let changed = false;

  team.forEach((p) => {
    if (!p || typeof p.hp !== "number") return;

    const entry = capturedList.find((c) => c.name === p.name);

    if (!entry) return;

    const clamped = Math.max(1, Math.min(100, Math.round(p.hp)));

    if (entry.hp !== clamped) {
      entry.hp = clamped;
      changed = true;
    }
  });

  if (changed) {
    saveCapturedList();
    updateCapturedCountUI();
  }
}

/* How much XP a Pokémon that took part in a win earns per battle.
   Flat amount — simple and predictable, and keeps this an XP *rate*
   the player controls by choosing to battle a lot rather than a
   number that needs balancing against opponent strength. */
const XP_PER_WIN = 40;

/* Awards XP to every OWNED member of the winning player's team
   (auto-filled wild fillers aren't in capturedList, so they're
   naturally skipped — nothing to persist XP into), then checks
   whether any of them are now ready to evolve. Also detects and
   reports a move learned/forgotten from the XP gain, since that's
   otherwise invisible — see getActiveMoves. */
async function awardBattleXp(team) {
  if (!Array.isArray(team)) return;

  const leveledUp = [];

  team.forEach((p) => {
    if (!p) return;

    const entry = capturedList.find((c) => c.name === p.name);

    if (!entry) return;

    const before = getActiveMoves(entry);
    const beforeNames = before ? before.map((m) => m.name).join(",") : "";

    entry.xp = (typeof entry.xp === "number" ? entry.xp : 0) + XP_PER_WIN;

    const after = getActiveMoves(entry);
    const afterNames = after ? after.map((m) => m.name).join(",") : "";

    if (after && beforeNames && afterNames !== beforeNames) {
      const learned = after.find((m) => !before.some((b) => b.name === m.name));
      const forgotten = before.find((m) => !after.some((a) => a.name === m.name));

      if (learned) {
        leveledUp.push({
          name: entry.name,
          learned: learned.name,
          forgotten: forgotten ? forgotten.name : null,
        });
      }
    }
  });

  saveCapturedList();

  const xpEarnedCount = team.filter(
    (p) => p && capturedList.some((c) => c.name === p.name),
  ).length;

  if (xpEarnedCount) {
    setTimeout(() => {
      showToast({
        icon: "⭐",
        title: "+" + XP_PER_WIN + " XP",
        message:
          xpEarnedCount > 1
            ? "Earned by each of your " + xpEarnedCount + " Pokémon."
            : "Your Pokémon is getting stronger.",
        tone: "success",
      });
    }, 300);
  }

  if (leveledUp.length) {
    setTimeout(() => {
      leveledUp.forEach((l, i) => {
        setTimeout(() => {
          showToast({
            icon: "📖",
            title: formatDisplayName(l.name) + " learned " + l.learned + "!",
            message: l.forgotten ? "...forgetting " + l.forgotten + "." : "",
            tone: "success",
          });
        }, i * 350);
      });
    }, 600);
  }

  await checkEvolutions();
}

/* ============================================================
   PURCHASE POKÉMON (buy with coins or gems, no battle required)
============================================================ */

function getPurchasePrice(data) {
  const statTotal = (data.stats || []).reduce(
    (sum, s) => sum + (s.base_stat || 0),
    0,
  );

  const coinPrice = Math.max(200, Math.round(statTotal * 4));

  const gemPrice = Math.max(5, Math.round(statTotal / 14));

  return { coinPrice, gemPrice };
}

function purchasePokemon(data, currency) {
  if (isCaptured(data.name)) {
    return;
  }

  const { coinPrice, gemPrice } = getPurchasePrice(data);

  if (currency === "gems") {
    if (gems < gemPrice) {
      showToast({
        icon: "💎",
        title: "Not enough gems",
        message:
          "You need " +
          gemPrice.toLocaleString() +
          " 💎 to buy " +
          formatDisplayName(data.name) +
          ".",
        tone: "error",
      });

      return;
    }

    gems -= gemPrice;
  } else {
    if (coins < coinPrice) {
      showToast({
        icon: "🥮",
        title: "Not enough coins",
        message:
          "You need " +
          coinPrice.toLocaleString() +
          " 🥮 to buy " +
          formatDisplayName(data.name) +
          ".",
        tone: "error",
      });

      return;
    }

    coins -= coinPrice;
  }

  capturePokemon(data);

  saveLeagueState();

  updateResourcesUI();

  sfxCapture();

        playCaptureAnimation();

  showToast({
    icon: "🛒",
    title: formatDisplayName(data.name) + " purchased!",
    message:
      "Added to your Pokédex for " +
      (currency === "gems"
        ? gemPrice.toLocaleString() + " 💎"
        : coinPrice.toLocaleString() + " 🥮") +
      ".",
    tone: "success",
    duration: 4000,
  });

  renderPokedexBody(data);

  applyRosterFilters().catch(() => {});
}

/* ============================================================
   CAPTURED COUNT (home screen)
============================================================ */

function updateCapturedCountUI() {
  const el = document.getElementById("captured-count");

  if (el) {
    el.textContent = capturedList.length;
  }
}

/* ============================================================
   SELECTED TEAM (persisted in localStorage)
============================================================ */

function loadSelectedTeamNames() {
  try {
    const raw = localStorage.getItem(nsKey(SELECTED_TEAM_KEY));

    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveSelectedTeamNames() {
  try {
    localStorage.setItem(
      nsKey(SELECTED_TEAM_KEY),
      JSON.stringify([...teamSelection]),
    );
  } catch (e) {
    /* Ignore storage failures. */
  }

  scheduleCloudPush();
}

/* Player 2's team (local same-device 2-player mode) isn't tied to a
   signed-in account — it's whoever is sitting at the keyboard for
   this match — so it intentionally stays un-namespaced/shared. */

function loadSelectedTeamP2Names() {
  try {
    const raw = localStorage.getItem(SELECTED_TEAM_P2_KEY);

    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveSelectedTeamP2Names() {
  try {
    localStorage.setItem(
      SELECTED_TEAM_P2_KEY,
      JSON.stringify([...p2TeamSelection]),
    );
  } catch (e) {
    /* Ignore storage failures. */
  }
}

function getPersistedSelectedName() {
  try {
    const stored = localStorage.getItem(nsKey(SELECTED_STORAGE_KEY));

    if (stored && capturedList.some((p) => p.name === stored)) {
      return stored;
    }
  } catch (e) {
    /* Ignore, fall through to starter. */
  }

  return capturedList[0].name;
}

function persistSelectedName(name) {
  try {
    localStorage.setItem(nsKey(SELECTED_STORAGE_KEY), name);
  } catch (e) {
    /* Non-fatal. */
  }

  scheduleCloudPush();
}

/* ============================================================
   BATTLE OUTCOME → CAPTURE
============================================================ */

function handleBattleFinished(
  playerWon,
  enemyPokemon,
  playerPokemonFinal,
  enemyTeam,
  playerTeam,
) {
  if (pendingLeagueMatch) {
    pendingLeagueMatch = false;

    applyLeagueResult(playerWon);
  }

  /* Persist whatever damage each of your own Pokémon is carrying
     out of this battle — a win doesn't heal them, only a Berry or
     Potion (from the Shop/Captured tab) does. Wild/unowned fillers
     on the team are skipped since there's nothing to persist them
     into. */
  if (!twoPlayerModeEnabled) {
    writeBackTeamHp(playerTeam);
  }

  /* XP (and the move-learning/evolution it unlocks) is a 1-player
     concept — a local 2-player match doesn't have "your" trainer
     winning against a wild Pokémon's trainer, so nobody's Pokémon
     gains anything from it. Fire-and-forget: it does its own
     toasts/saves once its awaits (evolution checks) resolve. */
  if (!twoPlayerModeEnabled && playerWon) {
    awardBattleXp(playerTeam);
  }

  /* Capturing the loser's Pokémon only applies to 1-player (vs AI)
     matches. In local 2-player battles both teams belong to human
     trainers, so nobody's Pokémon get caught — Pokémon are only
     added to a Pokédex there through purchase. A catch also always
     costs a Poké Ball now — winning the battle alone isn't enough;
     run out and you keep beating wild Pokémon without keeping any
     of them, same as running out of balls in the real games. */

  if (!twoPlayerModeEnabled && playerWon) {
    /* Hand the beaten Pokémon over to the catch screen: the player
       picks a ball and throws it, and it can fail to settle. */
    const targets =
      Array.isArray(enemyTeam) && enemyTeam.length > 1
        ? enemyTeam
        : [enemyPokemon];

    setTimeout(() => openCatchModal(targets), 350);
  }

  /* Line up a fresh wild opponent for the next match — but only in
     1-player mode. In 2-player mode the right-hand preview should
     keep reflecting Player 2's own chosen team, not a random reroll. */

  if (twoPlayerModeEnabled) {
    syncFighterPreviewForMode().catch(() => {});
  } else {
    rerollOpponent();
  }
}

/* ============================================================
   EVOLUTION (captured Pokémon evolve after time in your Pokédex)
============================================================ */

async function getNextEvolutionName(name) {
  if (Object.prototype.hasOwnProperty.call(evolutionChainCache, name)) {
    return evolutionChainCache[name];
  }

  try {
    /* `name` is the canonical /pokemon/ resource name, which for
       Pokémon with gender or form variants (e.g. "basculegion-male",
       "oricorio-baile", "dudunsparce-two-segment") includes a suffix
       the /pokemon-species/ endpoint doesn't accept — species are
       only ever looked up by their base name. Resolve the real
       species link from the Pokémon's own data instead of guessing
       or stripping suffixes ourselves. */
    const pokemonData = await fetchPokemon(name);

    const speciesUrl = pokemonData.species && pokemonData.species.url;

    if (!speciesUrl) {
      throw new Error("species link missing");
    }

    const speciesRes = await fetch(speciesUrl);

    if (!speciesRes.ok) {
      throw new Error("species request failed");
    }

    const species = await speciesRes.json();

    const chainRes = await fetch(species.evolution_chain.url);

    if (!chainRes.ok) {
      throw new Error("evolution chain request failed");
    }

    const chainData = await chainRes.json();

    /* The chain is keyed by base species names (e.g. "basculegion"),
       so match on species.name — not the form-suffixed `name` this
       function was called with, which would never match. */
    const nextSpeciesName = findNextEvolutionInChain(chainData.chain, species.name);

    if (!nextSpeciesName) {
      evolutionChainCache[name] = null;

      return null;
    }

    /* The chain only ever gives back the base SPECIES name — but for
       species with gender or form variants, that's still not always
       a fetchable /pokemon/ resource name (e.g. species "dudunsparce"
       is actually fetched as "dudunsparce-two-segment"; species
       "jellicent" as "jellicent-male"). Resolve the species' default
       variety to get the real name fetchPokemon() can use. */
    const next = await getDefaultVarietyName(nextSpeciesName);

    evolutionChainCache[name] = next;

    return next;
  } catch (e) {
    evolutionChainCache[name] = null;

    return null;
  }
}

function findNextEvolutionInChain(node, name) {
  if (!node) {
    return null;
  }

  if (node.species && node.species.name === name) {
    const nextNode = node.evolves_to && node.evolves_to[0];

    return nextNode && nextNode.species ? nextNode.species.name : null;
  }

  for (const child of node.evolves_to || []) {
    const found = findNextEvolutionInChain(child, name);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

/* Given a base species name (e.g. "dudunsparce", "jellicent"), return
   the actual fetchable /pokemon/ resource name for that species'
   default variety. For most species these are the same string, but
   species with gender or form variants (dudunsparce, jellicent,
   basculegion, oricorio, etc.) have a default variety whose /pokemon/
   name differs from the species name itself. Falls back to the
   species name unchanged if anything about this lookup is unclear. */
async function getDefaultVarietyName(speciesName) {
  const res = await fetch(
    "https://pokeapi.co/api/v2/pokemon-species/" + speciesName,
  );

  if (!res.ok) {
    throw new Error("species request failed");
  }

  const data = await res.json();

  const varieties = data.varieties || [];

  const defaultVariety =
    varieties.find((v) => v.is_default) || varieties[0];

  return defaultVariety && defaultVariety.pokemon
    ? defaultVariety.pokemon.name
    : speciesName;
}

async function checkEvolutions() {
  const due = capturedList.filter(
    (p) => typeof p.xp === "number" && p.xp >= EVOLUTION_XP_THRESHOLD,
  );

  if (!due.length) {
    return;
  }

  const now = Date.now();

  const evolved = [];

  for (const p of due) {
    try {
      const nextName = await getNextEvolutionName(p.name);

      if (!nextName || nextName === p.name) {
        /* Final stage (or unknown) — stop re-checking every cycle.
           Its XP is left as-is (it's still useful for move
           progression), just capped so it doesn't keep re-testing
           evolution eligibility forever. */

        continue;
      }

      const nextData = await fetchPokemon(nextName);

      const fromDisplay = formatDisplayName(p.name);

      const wasSelected = p.name === selectedName;

      const wasOnTeam = teamSelection.has(p.name);

      if (wasOnTeam) {
        teamSelection.delete(p.name);
        teamSelection.add(nextName);
        saveSelectedTeamNames();
      }

      p.name = nextName;
      p.id = nextData.id;
      p.capturedAt = now;

      /* Fresh progress toward the NEXT evolution stage, rather than
         carrying over and potentially chain-evolving twice in one
         check. Move progression (see getActiveMoves) uses this same
         xp value, so a freshly-evolved Pokémon does drop back to
         its earlier moves — matching how it'd genuinely be starting
         its new stage's learnset from the bottom. */
      p.xp = 0;

      /* Clear any cached learnset from its pre-evolution form — the
         next battle will resolve a fresh one for its new species. */
      delete p.learnableMoves;

      if (wasSelected) {
        selectedName = nextName;

        persistSelectedName(nextName);

        selected = nextData;

        renderPokemon(selected, "player");
      }

      evolved.push(fromDisplay + " → " + formatDisplayName(nextName));
    } catch (e) {
      /* Skip on failure — it'll be retried on the next check. */
    }
  }

  saveCapturedList();

  updateCapturedCountUI();

  if (
    activeCategory &&
    !document.getElementById("roster-page").classList.contains("hidden")
  ) {
    applyRosterFilters();
  }

  if (evolved.length) {
    setTimeout(() => {
      sfxEvolve();

      showToast({
        icon: "✨",
        title: "Evolution!",
        message: evolved.join(" • "),
        tone: "success",
        duration: 4200,
      });
    }, 150);
  }
}

async function rerollOpponent() {
  try {
    const excludeId = selected ? selected.id : null;

    const fresh = await fetchPokemon(randomPokemonId(excludeId));

    opponent = fresh;

    renderPokemon(opponent, "enemy");

    /* A new wild opponent replaces any "LAST ONLINE FOE — NAME"
       recap that loadFighters() put on the card, so the label can't
       claim this CPU Pokémon was your last online foe. (2-player mode
       has its own labels, set by syncFighterPreviewForMode.) */
    const enemyLabel = document.getElementById("enemy-role-label");

    if (enemyLabel && !twoPlayerModeEnabled) {
      enemyLabel.textContent = "OPPONENT";
    }
  } catch (e) {
    /* Keep the current opponent if the reroll fails. */
  }
}

/* Keep the home-screen fighter cards honest about who you're
   actually about to fight. In 1-player mode the right card is a
   wild AI opponent (rerollOpponent() above). In 2-player mode it
   should instead reflect Player 2's own hand-picked team, since
   nobody's Pokémon get auto-matched there — showing a random wild
   Pokémon while the battlefield actually runs Player 2's chosen
   squad was misleading. */

async function syncFighterPreviewForMode() {
  const playerLabel = document.getElementById("player-role-label");

  const enemyLabel = document.getElementById("enemy-role-label");

  if (twoPlayerModeEnabled) {
    if (playerLabel) playerLabel.textContent = "PLAYER 1";

    if (enemyLabel) enemyLabel.textContent = "PLAYER 2";

    const firstPick = [...p2TeamSelection][0];

    if (firstPick) {
      try {
        const data = await fetchPokemon(firstPick);

        renderPokemon(data, "enemy");
      } catch (e) {
        /* Keep whatever is currently shown if the fetch fails. */
      }
    }
  } else {
    if (playerLabel) playerLabel.textContent = "YOUR FIGHTER";

    if (enemyLabel) enemyLabel.textContent = "OPPONENT";

    await rerollOpponent();
  }
}

/* ============================================================
   FETCH POKEMON
============================================================ */

async function fetchPokemon(nameOrId) {
  const res = await fetch(API + nameOrId);

  if (!res.ok) {
    throw new Error("Pokémon request failed");
  }

  return res.json();
}

/* ============================================================
   LOAD FIGHTERS (home screen matchup)
============================================================ */

/* If the player's last action was an online match, show a one-time
   recap of who they actually just fought instead of a freshly
   rerolled random wild opponent — see the matching write in
   game.js's startOnlineBattleEngine. Consumed once (removed right
   after reading) so a normal reload afterward goes back to the
   usual random matchup. Returns null if there's nothing to show. */
function takeLastOnlineMatchup() {
  try {
    const raw = localStorage.getItem("pf_last_online_matchup");

    if (!raw) return null;

    localStorage.removeItem("pf_last_online_matchup");

    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function loadFighters() {
  const status = document.getElementById("api-status");

  const lastOnline = takeLastOnlineMatchup();

  try {
    if (lastOnline) {
      selected = await fetchPokemon(lastOnline.mine.id || lastOnline.mine.name);

      opponent = await fetchPokemon(
        lastOnline.opponent.id || lastOnline.opponent.name,
      );

      const enemyLabel = document.getElementById("enemy-role-label");

      if (enemyLabel) {
        enemyLabel.textContent = lastOnline.opponentTrainer
          ? "LAST ONLINE FOE — " + lastOnline.opponentTrainer.toUpperCase()
          : "LAST ONLINE OPPONENT";
      }
    } else {
      selected = await fetchPokemon(selectedName);

      opponent = await fetchPokemon(randomPokemonId(selected.id));
    }

    renderPokemon(selected, "player");

    renderPokemon(opponent, "enemy");

    status.textContent = "● LIVE • POKÉAPI CONNECTED";

    status.style.color = "#72e6a6";
  } catch (e) {
    status.textContent = "Offline demo data";

    status.style.color = "#ffbf69";

    selected = fallback(
      "Pikachu",
      "Electric",

      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    );

    opponent = fallback(
      "Charizard",
      "Fire",

      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png",
    );

    renderPokemon(selected, "player");

    renderPokemon(opponent, "enemy");
  }
}

/* ============================================================
   RANDOM OPPONENT FROM THE FULL 1029-POKÉMON POOL
============================================================ */

function randomPokemonId(excludeId) {
  let id = Math.floor(Math.random() * POKEMON_COUNT) + 1;

  if (id === excludeId) {
    id = (id % POKEMON_COUNT) + 1;
  }

  return id;
}

/* ============================================================
   FALLBACK (offline demo data)
============================================================ */

/* Known National Dex numbers for the names fallback() gets called with.
   Falling back to a hardcoded id (previously always 6 for anything that
   wasn't Pikachu) made every non-Pikachu offline Pokémon collide on the
   same id, breaking dedupe/exclude checks that key off id. */
const FALLBACK_POKEMON_IDS = {
  pikachu: 25,
  charizard: 6,
  blastoise: 9,
  venusaur: 3,
  gengar: 94,
  dragonite: 149,
  alakazam: 65,
};

function fallback(name, type, img) {
  return {
    name,

    id: FALLBACK_POKEMON_IDS[name.toLowerCase()] || 6,

    types: [
      {
        type: {
          name: type.toLowerCase(),
        },
      },
    ],

    sprites: {
      other: {
        "official-artwork": {
          front_default: img,
        },
      },
    },

    stats: [
      { base_stat: 100 },
      { base_stat: 100 },
      { base_stat: 100 },
      { base_stat: 100 },
      { base_stat: 100 },
      { base_stat: 100 },
    ],

    abilities: [],

    moves: [],
  };
}

/* ============================================================
   DISPLAY POKEMON
============================================================ */

function renderPokemon(p, side) {
  const artwork =
    p.sprites?.other?.["official-artwork"]?.front_default ||
    p.sprites.front_default;

  document.getElementById(side + "-img").src = artwork;

  document.getElementById(side + "-name").textContent = p.name;

  document.getElementById(side + "-type").textContent =
    p.types[0].type.name.toUpperCase();

  const power = Math.round(p.stats.reduce((a, s) => a + s.base_stat, 0) / 5);

  document.getElementById(side + "-power").textContent = power;

  if (side === "player") {
    document.getElementById("p1-label").textContent = p.name;
  } else {
    document.getElementById("p2-label").textContent = p.name;
  }
}

/* ============================================================
   POKÉDEX / ROSTER (all 1029 Pokémon, browsable by type)
============================================================ */

async function ensureRosterList() {
  if (rosterList) {
    return rosterList;
  }

  if (rosterLoading) {
    return rosterLoading;
  }

  rosterLoading = fetch(
    "https://pokeapi.co/api/v2/pokemon?limit=" + POKEMON_COUNT,
  )
    .then((res) => {
      if (!res.ok) {
        throw new Error("Roster request failed");
      }

      return res.json();
    })
    .then((data) => {
      rosterList = data.results.map((entry, index) => {
        const match = entry.url.match(/\/pokemon\/(\d+)\//);

        return {
          name: entry.name,
          id: match ? Number(match[1]) : index + 1,
        };
      });

      return rosterList;
    })
    .finally(() => {
      rosterLoading = null;
    });

  return rosterLoading;
}

async function fetchTypeList(typeName) {
  if (typeListCache[typeName]) {
    return typeListCache[typeName];
  }

  const res = await fetch("https://pokeapi.co/api/v2/type/" + typeName);

  if (!res.ok) {
    throw new Error("Type request failed");
  }

  const data = await res.json();

  const list = data.pokemon
    .map((entry) => {
      const match = entry.pokemon.url.match(/\/pokemon\/(\d+)\//);

      return {
        name: entry.pokemon.name,
        id: match ? Number(match[1]) : null,
      };
    })
    .filter((p) => p.id);

  typeListCache[typeName] = list;

  return list;
}

async function getCategoryList(category) {
  if (category === "all") {
    return ensureRosterList();
  }

  if (category === "captured") {
    return capturedList.slice();
  }

  return fetchTypeList(category);
}

function artworkUrl(id) {
  return ARTWORK_CDN_BASE + id + ".png";
}

function artworkRawUrl(id) {
  return ARTWORK_BASE + id + ".png";
}

function spriteFallbackUrl(id) {
  return SPRITE_FALLBACK_BASE + id + ".png";
}

async function openRoster(initialCategory) {
  document.getElementById("home-page").classList.add("hidden");

  document.getElementById("roster-page").classList.remove("hidden");

  document.getElementById("roster-search").value = "";

  currentSearchQuery = "";

  setCategory(typeof initialCategory === "string" ? initialCategory : "all");
}

function closeRoster() {
  document.getElementById("roster-page").classList.add("hidden");

  showHomeScreen();

  closePokedex();
}

function setCategory(category) {
  activeCategory = category;

  document.querySelectorAll(".type-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.type === category);
  });

  applyRosterFilters();
}

let rosterSearchTimer = null;

function handleRosterSearch(e) {
  const query = e.target.value.trim().toLowerCase();

  clearTimeout(rosterSearchTimer);

  rosterSearchTimer = setTimeout(() => {
    currentSearchQuery = query;

    applyRosterFilters();
  }, 120);
}

async function applyRosterFilters() {
  const count = document.getElementById("roster-count");

  const grid = document.getElementById("roster-grid");

  grid.innerHTML = "";

  count.textContent =
    activeCategory === "captured"
      ? "Loading your captured Pokémon…"
      : "Loading Pokémon…";

  try {
    let list = await getCategoryList(activeCategory);

    if (currentSearchQuery) {
      list = list.filter((p) => p.name.includes(currentSearchQuery));
    }

    count.textContent = buildCountLabel(list.length);

    renderRosterGrid(list, currentSearchQuery);
  } catch (e) {
    count.textContent = "Couldn't load this category — try again";

    renderRosterGrid(
      activeCategory === "all" ? OFFLINE_ROSTER : [],
      currentSearchQuery,
    );
  }
}

function buildCountLabel(n) {
  if (activeCategory === "captured") {
    return n + (n === 1 ? " POKÉMON CAPTURED" : " POKÉMON CAPTURED");
  }

  if (activeCategory === "all") {
    return n + " POKÉMON AVAILABLE";
  }

  return n + " " + activeCategory.toUpperCase() + "-TYPE POKÉMON";
}

function renderRosterGrid(list, query) {
  const grid = document.getElementById("roster-grid");

  grid.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("div");

    empty.className = "roster-empty";

    if (activeCategory === "captured") {
      empty.textContent =
        "You haven't captured any Pokémon yet — win a battle to catch your opponent!";
    } else {
      empty.textContent = query
        ? 'No Pokémon match "' + query + '".'
        : "No Pokémon found.";
    }

    grid.appendChild(empty);

    return;
  }

  const frag = document.createDocumentFragment();

  list.forEach((p) => {
    frag.appendChild(createRosterCard(p));
  });

  grid.appendChild(frag);
}

function createRosterCard(p) {
  const card = document.createElement("button");

  card.type = "button";

  const owned = isCaptured(p.name);

  card.className = "roster-card" + (p.name === selectedName ? " active" : "");

  const img = document.createElement("img");

  img.loading = "lazy";

  img.alt = p.name;

  img.decoding = "async";

  img.src = artworkUrl(p.id);

  /* CDN -> raw GitHub artwork -> small sprite. */
  let attempt = 0;

  img.onerror = () => {
    attempt += 1;

    if (attempt === 1) {
      img.src = artworkRawUrl(p.id);
    } else if (attempt === 2) {
      img.src = spriteFallbackUrl(p.id);
    } else {
      img.onerror = null;
    }
  };

  const label = document.createElement("b");

  label.textContent = p.name.replace(/-/g, " ");

  const dexNumber = document.createElement("small");

  dexNumber.textContent = "#" + String(p.id).padStart(4, "0");

  card.append(img, label, dexNumber);

  if (owned) {
    const badge = document.createElement("span");

    badge.className = "captured-badge";

    const caughtEntry = capturedList.find((c) => c.name === p.name);

    badge.innerHTML = caughtEntry ? ballById(caughtEntry.ball).icon : "⚡";

    badge.title = caughtEntry
      ? "Caught in a " + ballById(caughtEntry.ball).name
      : "Captured";

    card.appendChild(badge);
  } else {
    const buyBadge = document.createElement("span");

    buyBadge.className = "buy-badge";

    buyBadge.textContent = "🛒";

    buyBadge.title = "Available to buy with coins or gems";

    card.appendChild(buyBadge);
  }

  /*
  Clicking a Pokémon opens its Pokédex entry — it no longer
  selects it as your fighter directly. Fighter selection now
  only happens from inside the Pokédex, and only for Pokémon
  you've already captured.
  */

  card.onclick = () => openPokedex(p);

  return card;
}

/* ============================================================
   POKÉDEX DETAIL MODAL
============================================================ */

/* The full PokéAPI data object for whichever Pokémon the detail
   modal currently shows — kept around so healPokemonWithItem can
   re-render the same card after spending a Berry/Potion without
   needing another fetch. */
let currentPokedexData = null;

async function openPokedex(p) {
  const modal = document.getElementById("pokedex-modal");

  const body = document.getElementById("pokedex-body");

  modal.classList.remove("hidden");

  body.innerHTML = '<div class="roster-empty">Loading Pokédex entry…</div>';

  try {
    const data = await fetchPokemon(p.name);

    renderPokedexBody(data);
  } catch (e) {
    body.innerHTML =
      '<div class="roster-empty">Couldn\'t load this Pokémon. Try again.</div>';
  }
}

function closePokedex() {
  document.getElementById("pokedex-modal").classList.add("hidden");
}

function renderPokedexBody(data) {
  currentPokedexData = data;

  const body = document.getElementById("pokedex-body");

  const artwork =
    data.sprites?.other?.["official-artwork"]?.front_default ||
    data.sprites.front_default;

  const owned = isCaptured(data.name);

  const typesHtml = data.types
    .map(
      (t) =>
        '<span class="type-badge" data-type="' +
        t.type.name +
        '">' +
        t.type.name.toUpperCase() +
        "</span>",
    )
    .join("");

  const statsHtml = data.stats
    .map((s, i) => {
      const pct = Math.min(100, Math.round((s.base_stat / 255) * 100));

      return (
        '<div class="pokedex-stat-row">' +
        "<span>" +
        (STAT_LABELS[i] || s.stat.name) +
        "</span>" +
        '<div class="pokedex-stat-track">' +
        '<div class="pokedex-stat-fill" style="width:' +
        pct +
        '%"></div>' +
        "</div>" +
        "<span>" +
        s.base_stat +
        "</span>" +
        "</div>"
      );
    })
    .join("");

  const abilitiesText = (data.abilities || [])
    .map((a) => "<b>" + a.ability.name.replace(/-/g, " ") + "</b>")
    .join(", ");

  const statusHtml = owned
    ? '<div class="pokedex-capture-status owned">✓ CAPTURED — IN YOUR POKÉBALL</div>'
    : '<div class="pokedex-capture-status wild">WILD — WIN A BATTLE OR BUY IT BELOW TO CAPTURE IT</div>';

  let healRowHtml = "";

  if (owned) {
    const entry = capturedList.find((c) => c.name === data.name);
    const hp = entry && typeof entry.hp === "number" ? entry.hp : 100;
    const full = hp >= 100;

    const caughtBall = ballById(entry && entry.ball);

    healRowHtml =
      '<div class="pokedex-hp-row">' +
      '<div class="pokedex-hp-label"><span>CAUGHT WITH</span><b class="pokedex-ball-label">' +
      caughtBall.icon +
      " " +
      caughtBall.name +
      "</b></div>" +
      "</div>" +
      '<div class="pokedex-hp-row">' +
      '<div class="pokedex-hp-label"><span>DAMAGE CARRIED OVER</span><b>' +
      hp +
      " / 100 HP</b></div>" +
      '<div class="pokedex-hp-track">' +
      '<div class="pokedex-hp-fill" style="width:' +
      Math.max(0, Math.min(100, hp)) +
      '%"></div>' +
      "</div>" +
      '<div class="pokedex-heal-row">' +
      '<button id="pokedex-heal-berry-btn" class="pokedex-heal-btn"' +
      (full || berryCount <= 0 ? " disabled" : "") +
      '>🍒 Berry (' +
      berryCount +
      ") +40 HP</button>" +
      '<button id="pokedex-heal-potion-btn" class="pokedex-heal-btn"' +
      (full || potionCount <= 0 ? " disabled" : "") +
      '>🧪 Potion (' +
      potionCount +
      ") Full Heal</button>" +
      "</div>" +
      "</div>";

    /* XP toward its next evolution, plus whichever moves it
       currently knows (if a learnset has been resolved for it yet
       — happens the first time it enters a battle). Evolution and
       move progression both key off this same xp value now,
       instead of the old pure-time evolution timer. */

    const xp = typeof entry.xp === "number" ? entry.xp : 0;

    const xpPct = Math.max(
      0,
      Math.min(100, Math.round((xp / EVOLUTION_XP_THRESHOLD) * 100)),
    );

    const activeMoves = getActiveMoves(entry);

    healRowHtml +=
      '<div class="pokedex-hp-row">' +
      '<div class="pokedex-hp-label"><span>XP TOWARD NEXT EVOLUTION</span><b>' +
      xp +
      " / " +
      EVOLUTION_XP_THRESHOLD +
      "</b></div>" +
      '<div class="pokedex-hp-track">' +
      '<div class="pokedex-hp-fill pokedex-xp-fill" style="width:' +
      xpPct +
      '%"></div>' +
      "</div>" +
      (activeMoves && activeMoves.length
        ? '<div class="pokedex-moves-row">' +
          activeMoves
            .map(function (m, i) {
              return (
                '<span class="pokedex-move-chip">' +
                (i + 1) +
                " " +
                m.name +
                "</span>"
              );
            })
            .join("") +
          "</div>"
        : '<p class="pokedex-moves-pending">Its moveset resolves the first time it enters a battle.</p>') +
      "</div>";
  }

  const fightButtonHtml = owned
    ? '<button id="pokedex-fight-btn" class="pokedex-fight-btn">⚔ SET AS FIGHTER</button>'
    : "";

  let buyButtonsHtml = "";

  if (!owned) {
    const { coinPrice, gemPrice } = getPurchasePrice(data);

    const canAffordCoins = coins >= coinPrice;

    const canAffordGems = gems >= gemPrice;

    buyButtonsHtml =
      '<div class="pokedex-buy-row">' +
      '<button id="pokedex-buy-coins-btn" class="pokedex-buy-btn pokedex-buy-coins"' +
      (canAffordCoins ? "" : " disabled") +
      ">🥮 Buy for " +
      coinPrice.toLocaleString() +
      "</button>" +
      '<button id="pokedex-buy-gems-btn" class="pokedex-buy-btn pokedex-buy-gems"' +
      (canAffordGems ? "" : " disabled") +
      ">💎 Buy for " +
      gemPrice.toLocaleString() +
      "</button>" +
      "</div>";
  }

  body.innerHTML =
    '<div class="pokedex-top">' +
    '<img src="' +
    artwork +
    '" alt="' +
    data.name +
    '" />' +
    '<div class="pokedex-dex-no">#' +
    String(data.id).padStart(4, "0") +
    "</div>" +
    '<div class="pokedex-name">' +
    (isLegendaryPokemon(data) ? '<span class="pokedex-legendary-badge">✨ LEGENDARY</span> ' : "") +
    data.name.replace(/-/g, " ") +
    "</div>" +
    '<div class="pokedex-types">' +
    typesHtml +
    "</div>" +
    "</div>" +
    statusHtml +
    healRowHtml +
    '<div class="pokedex-stats">' +
    statsHtml +
    "</div>" +
    (abilitiesText
      ? '<div class="pokedex-abilities">ABILITIES: ' + abilitiesText + "</div>"
      : "") +
    fightButtonHtml +
    buyButtonsHtml;

  if (owned) {
    document.getElementById("pokedex-fight-btn").onclick = () => {
      setFighterFromCaptured(data.name);
    };

    const berryBtn = document.getElementById("pokedex-heal-berry-btn");
    if (berryBtn) berryBtn.onclick = () => healPokemonWithItem(data.name, "berry");

    const potionBtn = document.getElementById("pokedex-heal-potion-btn");
    if (potionBtn)
      potionBtn.onclick = () => healPokemonWithItem(data.name, "potion");
  } else {
    const buyCoinsBtn = document.getElementById("pokedex-buy-coins-btn");

    if (buyCoinsBtn) {
      buyCoinsBtn.onclick = () => purchasePokemon(data, "coins");
    }

    const buyGemsBtn = document.getElementById("pokedex-buy-gems-btn");

    if (buyGemsBtn) {
      buyGemsBtn.onclick = () => purchasePokemon(data, "gems");
    }
  }
}

/* Spends one Berry (+40 HP) or Potion (full heal) on a captured
   Pokémon's carried-over battle damage, then re-renders the detail
   modal in place so the HP bar and button states update without
   closing/reopening it. */
function healPokemonWithItem(name, kind) {
  const entry = capturedList.find((c) => c.name === name);

  if (!entry) return;

  const hp = typeof entry.hp === "number" ? entry.hp : 100;

  if (hp >= 100) return;

  if (kind === "berry") {
    if (berryCount <= 0) {
      showToast({ icon: "⚠️", title: "No Berries left — visit the Shop" });
      return;
    }

    berryCount -= 1;
    entry.hp = Math.min(100, hp + 40);
  } else {
    if (potionCount <= 0) {
      showToast({ icon: "⚠️", title: "No Potions left — visit the Shop" });
      return;
    }

    potionCount -= 1;
    entry.hp = 100;
  }

  saveCapturedList();
  saveInventory();
  updateCapturedCountUI();

  showToast({
    icon: kind === "berry" ? "🍒" : "🧪",
    title: formatDisplayName(name) + " healed to " + entry.hp + " HP",
    tone: "success",
  });

  if (currentPokedexData && currentPokedexData.name === name) {
    renderPokedexBody(currentPokedexData);
  }
}

async function setFighterFromCaptured(name) {
  selectedName = name;

  persistSelectedName(name);

  closePokedex();

  closeRoster();

  const status = document.getElementById("api-status");

  status.textContent = "Loading " + name + "…";

  status.style.color = "#9fc1df";

  try {
    selected = await fetchPokemon(name);

    renderPokemon(selected, "player");

    status.textContent = "● LIVE • POKÉAPI CONNECTED";

    status.style.color = "#72e6a6";
  } catch (e) {
    status.textContent = "Couldn't load that Pokémon — try another";

    status.style.color = "#ff6d6d";
  }
}

/* ============================================================
   REAL MOVE DATA (fetched from PokéAPI per fighter)
============================================================

Each Pokémon's /pokemon/{name} response already lists every
move it can learn (names + URLs, no stats). To turn that into
a usable battle move we fetch a handful of the most promising
candidates' full move data (power, type, damage class) and
use the first genuine attacking move we find.

Visual presentation (projectile color/speed/range) still
comes from game.js's type-based TYPE_MOVES table, so the
move looks right even though its name/power is real.
============================================================ */

async function resolveBattleMove(pokemon) {
  const candidates = pickMoveCandidates(pokemon);

  /* Try a generous batch of candidates — many Pokémon's highest-level
     "signature" moves are actually status moves (stat boosts, buffs,
     etc.), not attacks, so stopping after just a few candidates left
     plenty of Pokémon without a real move and silently falling back
     to the shared generic type attack. Trying more candidates (and
     falling through level-up → other learn methods, see
     pickMoveCandidates below) makes it very likely every Pokémon
     finds a genuine attacking move of its own. */

  const tryLimit = Math.min(candidates.length, 20);

  for (let i = 0; i < tryLimit; i++) {
    try {
      const res = await fetch(candidates[i].url);

      if (!res.ok) {
        continue;
      }

      const data = await res.json();

      const isAttack =
        data.power && data.damage_class && data.damage_class.name !== "status";

      if (isAttack) {
        return buildMoveFromApi(data);
      }
    } catch (e) {
      /* Try the next candidate. */
    }
  }

  return null;
}

function pickMoveCandidates(pokemon) {
  const moves = Array.isArray(pokemon.moves) ? pokemon.moves : [];

  const levelUp = [];

  const seen = new Set();

  moves.forEach((m) => {
    const detail = (m.version_group_details || []).find(
      (d) => d.move_learn_method && d.move_learn_method.name === "level-up",
    );

    if (detail) {
      levelUp.push({
        name: m.move.name,
        url: m.move.url,
        level: detail.level_learned_at || 0,
      });

      seen.add(m.move.name);
    }
  });

  /* Prefer higher-level moves — usually a Pokémon's strongest, most signature attack. */

  levelUp.sort((a, b) => b.level - a.level);

  /* Everything else the Pokémon can learn (TM/tutor/egg moves), as
     further candidates in case none of its level-up moves turn out
     to deal damage. Combining both pools — instead of only falling
     back to this second pool when there are zero level-up moves —
     is what fixes Pokémon whose top level-up moves are all status
     effects (stat boosts, healing, etc.) from ending up with no real
     move and silently defaulting to the shared generic type attack. */

  const rest = moves
    .filter((m) => !seen.has(m.move.name))
    .map((m) => ({ name: m.move.name, url: m.move.url }));

  return levelUp.length ? levelUp.concat(rest) : rest;
}

function buildMoveFromApi(data) {
  const type = data.type ? data.type.name : "normal";

  const visuals = (window.TYPE_MOVES && window.TYPE_MOVES[type]) ||
    (window.TYPE_MOVES && window.TYPE_MOVES.normal) || {
      range: 220,
      projectile: true,
      color: "#f1f1df",
      speed: 11,
    };

  const damage = clampNumber(Math.round((data.power || 60) * 0.32), 12, 30);

  return {
    name: formatMoveName(data.name),
    type: type,
    damage: damage,
    range: visuals.range,
    projectile: visuals.projectile,
    color: visuals.color,
    speed: visuals.speed,
  };
}

function formatMoveName(name) {
  return String(name)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDisplayName(name) {
  return String(name)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/* ============================================================
   TEAM SELECT MODAL
============================================================ */

/* What should happen after the player confirms their lineup:
   "battle" (the default — start a local/league match), or
   "online-random" / "online-friend" / "online-join" when this
   modal was opened from the Play Online flow, so the confirm
   handler knows to resume matchmaking instead of starting a local
   battle. Set by openTeamSelect's `purpose` argument. */
let teamSelectPurpose = "battle";
let pendingOnlineJoinCode = null;

/* The wager picked on the Play Online screen — "No Bet" (0) by
   default. For Random Opponent and Create Room, this is MY bet and
   becomes the match's bet (written onto the room doc, same as
   trainer names). For Join With a Code, whatever the host already
   set is used instead — see joinFriendRoom. */
let selectedBet = { amount: 0, currency: "coins" };

function openTeamSelect(purpose) {
  teamSelectPurpose = purpose || "battle";

  /* In 2-player mode, Player 1 also gets to pick from the full
     Pokédex (same as Player 2), so there's always something to
     choose from. In 1-player mode, picking is still limited to
     captured Pokémon — skip straight to battle if none are caught
     yet, same as before. Online play always has a real captured
     list to draw from (or the server fills in wild Pokémon for
     empty slots), so this shortcut only applies to local battles. */

  if (
    teamSelectPurpose === "battle" &&
    !twoPlayerModeEnabled &&
    !capturedList.length
  ) {
    startBattle();

    return;
  }

  const search = document.getElementById("team-select-search");

  const searchWrap = document.getElementById("team-select-search-wrap");

  const hint = document.getElementById("team-select-hint");

  teamSelectQuery = "";

  if (search) {
    search.value = "";
  }

  if (searchWrap) {
    searchWrap.classList.toggle("hidden", !twoPlayerModeEnabled);
  }

  if (hint) {
    hint.textContent = twoPlayerModeEnabled
      ? "Pick up to 6 Pokémon from the full Pokédex to fight with. Leave slots empty and they'll be auto-filled with wild Pokémon."
      : isAiTeamSelect()
        ? "Tap the Pokémon you want to battle with."
        : "Pick up to 6 captured Pokémon and put them in the order you want them to fight. Leave slots empty and they'll be auto-filled with wild Pokémon.";
  }

  const confirmBtn = document.getElementById("team-select-confirm");

  if (confirmBtn) {
    confirmBtn.textContent =
      teamSelectPurpose === "battle" ? "⚔ START BATTLE" : "🌐 CONFIRM LINEUP";
  }

  renderTeamSelectGrid();

  document.getElementById("team-select-modal").classList.remove("hidden");
}

function closeTeamSelect() {
  document.getElementById("team-select-modal").classList.add("hidden");
}

function handleTeamSelectSearch(e) {
  const query = e.target.value.trim().toLowerCase();

  clearTimeout(teamSelectSearchTimer);

  teamSelectSearchTimer = setTimeout(() => {
    teamSelectQuery = query;

    renderTeamSelectGrid();
  }, 120);
}

async function renderTeamSelectGrid() {
  const grid = document.getElementById("team-select-grid");

  if (twoPlayerModeEnabled) {
    const lineupEl = document.getElementById("team-select-lineup");

    if (lineupEl) {
      lineupEl.classList.remove("hidden");
    }

    await renderPokedexPickerGrid(
      grid,
      teamSelectQuery,
      teamSelection,
      toggleTeamPick,
      "team-select-lineup",
      renderTeamSelectGrid,
    );
  } else {
    renderCapturedPickerGrid(grid);
  }

  updateTeamSelectCount();
}

function renderCapturedPickerGrid(grid) {
  const aiMode = isAiTeamSelect();

  /* In a 1v1 AI battle only the lead of the saved lineup matters,
     so that's the only card shown as picked, with a plain check
     instead of a lineup number. */
  const leader = aiMode ? [...teamSelection][0] : null;

  grid.innerHTML = capturedList
    .map((p) => {
      const isSelected = aiMode
        ? p.name === leader
        : teamSelection.has(p.name);

      const artwork = artworkUrl(p.id);

      teamPickArtworkCache[p.name] = p.id;

      return (
        '<div class="roster-card team-pick-card' +
        (isSelected ? " active" : "") +
        '" data-name="' +
        p.name +
        '">' +
        (isSelected
          ? aiMode
            ? '<span class="captured-badge">✓</span>'
            : '<span class="captured-badge team-pick-order">' +
              (orderOf(teamSelection, p.name) + 1) +
              "</span>"
          : "") +
        '<img src="' +
        artwork +
        '" alt="' +
        p.name +
        '" />' +
        "<b>" +
        formatDisplayName(p.name) +
        "</b>" +
        "</div>"
      );
    })
    .join("");

  grid.querySelectorAll(".team-pick-card").forEach((card) => {
    card.onclick = () => toggleTeamPick(card.dataset.name);
  });

  const lineupEl = document.getElementById("team-select-lineup");

  if (lineupEl) {
    lineupEl.classList.toggle("hidden", aiMode);
  }

  if (aiMode) {
    return;
  }

  renderTeamLineup(
    "team-select-lineup",
    teamSelection,
    (name, dir) => moveTeamSelectionItem(teamSelection, name, dir, renderTeamSelectGrid),
    (name) => {
      teamSelection.delete(name);
      renderTeamSelectGrid();
    },
  );
}

/* Index of `name` within a Set's insertion order, or -1. Sets keep
   insertion order, and that order IS the battle lineup order — this
   is just how we read "1st out / 2nd out / ..." back from it. */
function orderOf(selectionSet, name) {
  return [...selectionSet].indexOf(name);
}

/* Swaps `name` with its neighbor one slot earlier (dir -1) or later
   (dir 1) in the lineup. Sets don't support reordering directly, so
   this rebuilds the Set from a reordered array — every other Set
   method (has/add/delete/size) used elsewhere keeps working exactly
   as before. */
function moveTeamSelectionItem(selectionSet, name, dir, rerender) {
  const arr = [...selectionSet];
  const idx = arr.indexOf(name);

  if (idx === -1) return;

  const swapWith = idx + dir;

  if (swapWith < 0 || swapWith >= arr.length) return;

  [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];

  selectionSet.clear();
  arr.forEach((n) => selectionSet.add(n));

  rerender();
}

/* Renders the horizontal "battle order" strip above a team-select
   grid: one chip per selected Pokémon, in lineup order, each with
   ‹ / › to swap with its neighbor and ✕ to drop it from the team. */
function renderTeamLineup(containerId, selectionSet, onMove, onRemove) {
  const container = document.getElementById(containerId);

  if (!container) return;

  const names = [...selectionSet];

  if (!names.length) {
    container.innerHTML =
      '<p class="team-lineup-empty">Tap Pokémon below to build your lineup — ' +
      "the order here is the order they'll fight in.</p>";

    return;
  }

  container.innerHTML = names
    .map((name, i) => {
      const id = teamPickArtworkCache[name];
      const artwork = id ? artworkUrl(id) : "";

      return (
        '<div class="team-lineup-item" data-name="' +
        name +
        '">' +
        '<span class="team-lineup-order">' +
        (i + 1) +
        "</span>" +
        (artwork
          ? '<img src="' + artwork + '" alt="' + name + '" />'
          : '<div class="team-lineup-noart"></div>') +
        "<b>" +
        formatDisplayName(name) +
        "</b>" +
        '<div class="team-lineup-controls">' +
        '<button class="team-lineup-move" data-dir="-1"' +
        (i === 0 ? " disabled" : "") +
        ' aria-label="Move earlier">‹</button>' +
        '<button class="team-lineup-remove" aria-label="Remove">✕</button>' +
        '<button class="team-lineup-move" data-dir="1"' +
        (i === names.length - 1 ? " disabled" : "") +
        ' aria-label="Move later">›</button>' +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  container.querySelectorAll(".team-lineup-move").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();

      const item = btn.closest(".team-lineup-item");
      const dir = parseInt(btn.dataset.dir, 10);

      onMove(item.dataset.name, dir);
    };
  });

  container.querySelectorAll(".team-lineup-remove").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();

      const item = btn.closest(".team-lineup-item");

      onRemove(item.dataset.name);
    };
  });
}

/* ============================================================
   SHARED FULL-POKÉDEX PICKER GRID
   (used by both Player 1's and Player 2's team-select modals
   in 2-player mode, where neither is limited to a captured list)
============================================================ */

async function renderPokedexPickerGrid(
  grid,
  query,
  selectionSet,
  onToggle,
  lineupContainerId,
  rerender,
) {
  if (!grid) {
    return;
  }

  grid.innerHTML = '<div class="roster-empty">Loading Pokédex…</div>';

  let list;

  try {
    list = await ensureRosterList();
  } catch (e) {
    list = OFFLINE_ROSTER;
  }

  if (query) {
    list = list.filter((p) => p.name.includes(query));
  }

  if (!list.length) {
    grid.innerHTML =
      '<div class="roster-empty">No Pokémon match "' + query + '".</div>';

    return;
  }

  grid.innerHTML = list
    .map((p) => {
      const isSelected = selectionSet.has(p.name);

      const artwork = artworkUrl(p.id);

      teamPickArtworkCache[p.name] = p.id;

      return (
        '<div class="roster-card team-pick-card' +
        (isSelected ? " active" : "") +
        '" data-name="' +
        p.name +
        '">' +
        (isSelected
          ? '<span class="captured-badge team-pick-order">' +
            (orderOf(selectionSet, p.name) + 1) +
            "</span>"
          : "") +
        '<img src="' +
        artwork +
        '" alt="' +
        p.name +
        '" />' +
        "<b>" +
        formatDisplayName(p.name) +
        "</b>" +
        "</div>"
      );
    })
    .join("");

  grid.querySelectorAll(".team-pick-card").forEach((card) => {
    card.onclick = () => onToggle(card.dataset.name);
  });

  if (lineupContainerId) {
    renderTeamLineup(
      lineupContainerId,
      selectionSet,
      (name, dir) => moveTeamSelectionItem(selectionSet, name, dir, rerender),
      (name) => {
        selectionSet.delete(name);
        rerender();
      },
    );
  }
}

/* True when the Team Select screen is being used for a plain
   1-player battle against the AI (Normal or League) — those are
   1v1, so there's no team to build or order, just one Pokémon to
   pick. Online lineups and local 2-player teams still get the full
   multi-pick + ordering UI. */
function isAiTeamSelect() {
  return teamSelectPurpose === "battle" && !twoPlayerModeEnabled;
}

function toggleTeamPick(name) {
  if (isAiTeamSelect()) {
    /* Single pick: move the chosen Pokémon to the front of the
       saved lineup (so it's the one buildPlayerTeam(1) takes)
       without throwing away the rest of the lineup, which online
       matches still use. */
    const rest = [...teamSelection].filter((n) => n !== name);

    teamSelection.clear();
    teamSelection.add(name);
    rest.forEach((n) => teamSelection.add(n));

    renderTeamSelectGrid();

    return;
  }

  if (teamSelection.has(name)) {
    teamSelection.delete(name);
  } else {
    if (teamSelection.size >= TEAM_SIZE) {
      return;
    }

    teamSelection.add(name);
  }

  renderTeamSelectGrid();
}

function updateTeamSelectCount() {
  const el = document.getElementById("team-select-count");

  if (!el) return;

  if (isAiTeamSelect()) {
    el.classList.add("hidden");
    return;
  }

  el.classList.remove("hidden");
  el.textContent = teamSelection.size + "/" + TEAM_SIZE + " SELECTED";
}

/* ============================================================
   TEAM SELECT MODAL — PLAYER 2 (local 2-player mode)

   P2 has no captured Pokémon of their own in this single-device
   app, so they pick their squad from the full Pokédex instead,
   with a search box to make browsing 1000+ Pokémon practical.
============================================================ */

let teamSelectP2Query = "";

let teamSelectP2SearchTimer = null;

function openTeamSelectP2() {
  const search = document.getElementById("team-select-p2-search");

  if (search) {
    search.value = "";
  }

  teamSelectP2Query = "";

  renderTeamSelectP2Grid();

  document.getElementById("team-select-p2-modal").classList.remove("hidden");
}

function closeTeamSelectP2() {
  document.getElementById("team-select-p2-modal").classList.add("hidden");
}

function handleTeamSelectP2Search(e) {
  const query = e.target.value.trim().toLowerCase();

  clearTimeout(teamSelectP2SearchTimer);

  teamSelectP2SearchTimer = setTimeout(() => {
    teamSelectP2Query = query;

    renderTeamSelectP2Grid();
  }, 120);
}

async function renderTeamSelectP2Grid() {
  const grid = document.getElementById("team-select-p2-grid");

  await renderPokedexPickerGrid(
    grid,
    teamSelectP2Query,
    p2TeamSelection,
    toggleTeamPickP2,
    "team-select-p2-lineup",
    renderTeamSelectP2Grid,
  );

  updateTeamSelectP2Count();
}

function toggleTeamPickP2(name) {
  if (p2TeamSelection.has(name)) {
    p2TeamSelection.delete(name);
  } else {
    if (p2TeamSelection.size >= TEAM_SIZE) {
      return;
    }

    p2TeamSelection.add(name);
  }

  renderTeamSelectP2Grid();
}

function updateTeamSelectP2Count() {
  const el = document.getElementById("team-select-p2-count");

  if (el) {
    el.textContent = p2TeamSelection.size + "/" + TEAM_SIZE + " SELECTED";
  }
}

/* ============================================================
   TEAM BUILDING (6v6)
============================================================ */

const TEAM_SIZE = 6;

/*
Your team: every Pokémon you've captured (up to 6), always
including your current starter, topped up with fresh wild
Pokémon so every match is a full 6v6 even early on.
*/

async function buildPlayerTeam(targetSize) {
  const size =
    typeof targetSize === "number" && targetSize > 0 ? targetSize : TEAM_SIZE;

  /* In 1-player mode, selections only ever come from the captured
     grid, so this is already a no-op guard there. In 2-player mode
     Player 1 can pick from the full Pokédex (same as Player 2), so
     picks don't need to exist in capturedList — fetchPokemon()
     below already validates each name and drops anything invalid. */

  const chosenNames = twoPlayerModeEnabled
    ? [...teamSelection]
    : [...teamSelection].filter((n) => capturedList.some((p) => p.name === n));

  /* An explicit selection is used as-is; otherwise fall back to
     every captured Pokémon, same as before team select existed. */

  const sourceNames = chosenNames.length
    ? chosenNames
    : [...new Set(capturedList.map((p) => p.name))];

  const sourceFetched = (
    await Promise.all(sourceNames.map((n) => fetchPokemon(n).catch(() => null)))
  ).filter(Boolean);

  const team = [];
  const usedIds = new Set();

  /* No selection and nothing captured yet — always include the
     home-screen starter so the battle isn't empty. */

  if (!chosenNames.length && selected) {
    team.push(selected);
    usedIds.add(selected.id);
  }

  for (const p of sourceFetched) {
    if (team.length >= size) break;
    if (usedIds.has(p.id)) continue;
    team.push(p);
    usedIds.add(p.id);
  }

  let attempts = 0;

  while (team.length < size && attempts < 20) {
    attempts++;

    const id = randomPokemonId();

    if (usedIds.has(id)) continue;

    try {
      const p = await fetchPokemon(id);
      usedIds.add(id);
      team.push(p);
    } catch (e) {
      /* Skip a failed fetch and try another id. */
    }
  }

  /* Seed each owned team member with its carried-over battle
     damage (if any) — auto-filled wild Pokémon (not in
     capturedList) are left alone and always start fresh, since
     there's nothing persisted for them. game.js falls back to a
     full heal for anything that isn't a number here. */
  team.forEach((p) => {
    /* Local 2-player matches always start every Pokémon at full
       health (and never save damage afterwards — see
       handleBattleFinished), so battles are fair for both sides. */
    if (twoPlayerModeEnabled) {
      p.hp = 100;
      return;
    }

    const entry = capturedList.find((c) => c.name === p.name);

    if (entry && typeof entry.hp === "number") {
      p.hp = entry.hp;
    }
  });

  /* Resolve (or reuse the cached) 4-move set for each owned team
     member — auto-filled wild fillers don't have a capturedList
     entry to cache into, so they just battle with the single
     generic/signature move as before (see game.js's getMove). All
     of a team's lookups run in parallel so this doesn't multiply
     "start battle" latency by team size; already-cached Pokémon
     resolve instantly (no fetch at all). */
  await Promise.all(
    team.map(async (p) => {
      const entry = capturedList.find((c) => c.name === p.name);

      if (!entry) return;

      await ensureLearnableMoves(entry, p);

      const active = getActiveMoves(entry);

      if (active && active.length) {
        p.moveSlots = active;
      }
    }),
  );

  return team;
}

/*
Opponent team: 6 distinct wild Pokémon, none overlapping your team.
*/

async function buildOpponentTeam(excludeIds, chosenNames, targetSize) {
  const size =
    typeof targetSize === "number" && targetSize > 0 ? targetSize : TEAM_SIZE;

  const team = [];

  /* ownIds tracks species already placed on THIS (opponent) team, so
     we never put the same Pokémon on the opponent's team twice. It
     deliberately does NOT start from excludeIds (the player's team)
     — an explicit pick (Player 2's own choice, or the Pokémon shown
     as the home-screen opponent) should always make it into the
     battle, even if the player happens to be using the same species.
     Only the random wild auto-fill below avoids mirroring the
     player's team, to keep those filler match-ups varied. */

  const ownIds = new Set();

  /* Player 2 (local 2-player mode) may have hand-picked some or all
     of these from the full Pokédex — use those first. In 1-player
     mode this instead carries the single wild Pokémon shown as the
     "OPPONENT" preview on the home screen, so the fighter you see
     there is guaranteed to actually show up in the battle. */

  if (Array.isArray(chosenNames) && chosenNames.length) {
    const chosenFetched = (
      await Promise.all(
        chosenNames.map((n) => fetchPokemon(n).catch(() => null)),
      )
    ).filter(Boolean);

    for (const p of chosenFetched) {
      if (team.length >= size) break;
      if (ownIds.has(p.id)) continue;
      team.push(p);
      ownIds.add(p.id);
    }
  }

  /* Auto-fill any remaining slots with wild Pokémon — these avoid
     both the player's team and whatever explicit picks already made
     it onto this team, so filler matches stay varied. */

  const fillExcludeIds = new Set([...(excludeIds || []), ...ownIds]);

  let attempts = 0;

  while (team.length < size && attempts < 30) {
    attempts++;

    const id = randomPokemonId();

    if (fillExcludeIds.has(id)) continue;

    try {
      const p = await fetchPokemon(id);
      fillExcludeIds.add(id);
      team.push(p);
    } catch (e) {
      /* Skip a failed fetch and try another id. */
    }
  }

  /* Offline fallback so a battle can still start if PokéAPI is unreachable.
     Cycle through a small roster of distinct starters instead of pushing
     the same `opponent` object reference six times — reusing one object
     across every slot made all six "different" Pokémon actually be the
     exact same object (same name, sprite, and even shared mutable state
     like hp/fainted, since they all pointed at one thing in memory). */

  const OFFLINE_FALLBACK_ROSTER = [
    [
      "Charizard",
      "Fire",
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png",
    ],
    [
      "Blastoise",
      "Water",
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png",
    ],
    [
      "Venusaur",
      "Grass",
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png",
    ],
    [
      "Gengar",
      "Ghost",
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png",
    ],
    [
      "Dragonite",
      "Dragon",
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png",
    ],
    [
      "Alakazam",
      "Psychic",
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/65.png",
    ],
  ];

  let fallbackIndex = 0;

  while (team.length < size) {
    const [name, type, img] =
      OFFLINE_FALLBACK_ROSTER[fallbackIndex % OFFLINE_FALLBACK_ROSTER.length];

    fallbackIndex++;

    team.push(fallback(name, type, img));
  }

  return team;
}

/* ============================================================
   START BATTLE
============================================================ */

async function startBattle() {
  document.getElementById("home-page").classList.add("hidden");

  document.getElementById("battlefield-page").classList.remove("hidden");

  resetBattleUI();

  const transcript = document.getElementById("controls-transcript");

  if (transcript) {
    transcript.textContent = twoPlayerModeEnabled
      ? "Assembling your 6v6 teams…"
      : "Assembling your team…";
  }

  /* AI battles (Normal and League) are 1v1 now, not the full 6v6 —
     only local 2-player keeps the full team format. Building the
     right size directly (rather than building 6 and trimming)
     avoids wastefully fetching/resolving movesets for 5 Pokémon
     that would never actually enter the battle. */
  const teamSize = twoPlayerModeEnabled ? TEAM_SIZE : 1;

  const playerTeam = await buildPlayerTeam(teamSize);

  const p2Names = twoPlayerModeEnabled
    ? [...p2TeamSelection]
    : opponent
      ? [opponent.name]
      : null;

  const enemyTeam = await buildOpponentTeam(
    playerTeam.map((p) => p.id),
    p2Names,
    teamSize,
  );

  if (transcript) {
    transcript.textContent = "Loading signature moves…";
  }

  /*
  Give every Pokémon on both teams its own real, PokéAPI-derived
  attack instead of falling back to a shared generic type move —
  otherwise most Pokémon (anything outside the small hand-picked
  list in game.js) end up all throwing the same "special ability".
  */

  await Promise.all(
    [...playerTeam, ...enemyTeam].map(async (p) => {
      try {
        const move = await resolveBattleMove(p);

        if (move) {
          p.realMove = move;
        }
      } catch (e) {
        /* Keep the type-based fallback if a real move can't be found. */
      }
    }),
  );

  initTeamBattleEngine(playerTeam, enemyTeam, twoPlayerModeEnabled);
}

/* ============================================================
   RESET HP
============================================================ */

function resetBattleUI() {
  document.getElementById("p1-hp").style.width = "100%";

  document.getElementById("p2-hp").style.width = "100%";
}

/* ============================================================
   ONLINE BATTLES — matchmaking (Firestore) + live match client
   (WebSocket to the dedicated match server).

   This first version renders the live synced battle as a plain
   text/number debug readout rather than the full animated battle
   screen — it proves the whole pipeline (matchmaking, connecting,
   the server refereeing real moves) end-to-end. The animated
   screen is a follow-up that swaps out only the rendering, not any
   of the networking/matchmaking below.
============================================================ */

const MATCH_SERVER_URL = "wss://pokemon-fighter-server.onrender.com";

/* How old a queue ticket can be before matchmaking ignores it (see
   the freshness filter in startRandomMatch). Generous enough that a
   real, still-searching player is never filtered out mid-search,
   short enough that a ticket left behind by someone who just closed
   their tab stops blocking new matches well within one play
   session. */
const STALE_TICKET_MS = 90 * 1000;

const onlineMatch = {
  active: false,
  ws: null,
  roomId: null,
  mySide: null,
  queueUnsub: null,
  roomUnsub: null,
  input: { left: false, right: false, block: false },
  /* Bumped by every connectToMatch AND every stopOnlineMatch. An
     in-flight connectToMatch compares it after each await, so a
     Cancel pressed while it was still preparing really cancels. */
  attempt: 0,
};

/* Best-effort cleanup if the tab is closed/refreshed mid-search —
   the freshness filter above is what actually keeps matchmaking
   working regardless, but removing the ticket immediately (instead
   of waiting up to STALE_TICKET_MS for it to expire) means the very
   next person to search doesn't even briefly see a ticket that's
   about to disappear. Browsers don't guarantee an async Firestore
   write finishes during unload, so this is a bonus, not the fix. */
window.addEventListener("beforeunload", () => {
  if (fbAuth && fbAuth.currentUser && fbDb) {
    fbDb.collection("queue").doc(fbAuth.currentUser.uid).delete().catch(() => {});
  }
});

function initOnlineBattleUI() {
  const openBtn = document.getElementById("btn-online-battle");
  const closeBtn = document.getElementById("online-close");

  if (openBtn) {
    openBtn.onclick = openOnlineModal;
  }

  if (closeBtn) {
    closeBtn.onclick = closeOnlineModal;
  }

  const randomBtn = document.getElementById("online-random-btn");
  const createBtn = document.getElementById("online-create-room-btn");
  const joinBtn = document.getElementById("online-join-room-btn");
  const cancelBtn = document.getElementById("online-cancel-btn");
  const leaveBtn = document.getElementById("online-leave-btn");

  document.querySelectorAll(".online-bet-chip").forEach((chip) => {
    chip.onclick = () => {
      document
        .querySelectorAll(".online-bet-chip")
        .forEach((c) => c.classList.remove("active"));

      chip.classList.add("active");

      selectedBet = sanitizeBet(chip.dataset.amount, chip.dataset.currency);
    };
  });

  if (randomBtn)
    randomBtn.onclick = () => {
      if (!requireOnlineAuth()) return;
      if (!canAffordBet(selectedBet)) return;
      openTeamSelect("online-random");
    };

  if (createBtn)
    createBtn.onclick = () => {
      if (!requireOnlineAuth()) return;
      if (!canAffordBet(selectedBet)) return;
      openTeamSelect("online-friend");
    };

  if (cancelBtn) cancelBtn.onclick = () => cancelOnlineSearch();
  if (leaveBtn) leaveBtn.onclick = () => leaveOnlineMatch("You left the match.");

  if (joinBtn) {
    joinBtn.onclick = () => {
      const input = document.getElementById("online-room-code-input");
      const code = (input && input.value ? input.value : "").trim().toUpperCase();

      if (code.length < 4) {
        showToast({ icon: "⚠️", title: "Enter a room code first" });
        return;
      }

      if (!requireOnlineAuth()) return;

      pendingOnlineJoinCode = code;
      openTeamSelect("online-join");
    };
  }
}

/* The only wagers the UI offers. Anything read back from Firestore
   (queue tickets, room docs) is forced through sanitizeBet so a
   tampered document can't inject negative, fractional or oversized
   stakes (a negative stake would ADD currency on "payment"). */
const ALLOWED_BETS = [
  { amount: 50, currency: "coins" },
  { amount: 150, currency: "coins" },
  { amount: 5, currency: "gems" },
  { amount: 15, currency: "gems" },
];

function sanitizeBet(amount, currency) {
  const n = Number(amount);
  const cur = currency === "gems" ? "gems" : "coins";

  const ok = ALLOWED_BETS.some((b) => b.amount === n && b.currency === cur);

  return ok ? { amount: n, currency: cur } : { amount: 0, currency: "coins" };
}

/* Checks (and reports) whether the player can cover a wager before
   even starting matchmaking — better to fail here than discover it
   mid-connect. A 0-amount bet always passes. */
function canAffordBet(bet) {
  if (!bet || !bet.amount) return true;

  if (!(bet.amount > 0)) return false;

  const have = bet.currency === "gems" ? gems : coins;

  if (have >= bet.amount) return true;

  showToast({
    icon: "⚠️",
    title: "Not enough " + bet.currency + " for that wager",
    message: "Lower your bet or visit the Shop first.",
  });

  return false;
}

/* Awards both stakes to the winner once a match actually resolves.
   The loser's share was already taken in beginOnlineMatch, so there
   is nothing further to do on a loss — only a winner's balance
   changes here. Clears window.onlineBet so a stray second call
   (e.g. a duplicate match_over) can't pay out twice. */
function settleOnlineBet(won) {
  /* Payouts are normally written by the match server (see
     startWalletAdjustmentListener). Only the legacy path (older
     server) pays out here. */
  const bet = window.onlineBet;

  if (window.onlineBetLegacy && won && bet && bet.amount) {
    const pot = bet.amount * 2;

    if (bet.currency === "gems") {
      gems += pot;
      saveStoredNumber(GEMS_KEY, gems);
    } else {
      coins += pot;
      saveStoredNumber(COINS_KEY, coins);
    }

    updateResourcesUI();

    showToast({
      icon: bet.currency === "gems" ? "💎" : "🥮",
      title: "Won the wager! +" + pot + " " + bet.currency,
      tone: "success",
    });
  }

  window.onlineBet = null;
  window.onlineBetLegacy = false;
}

/* ------------------------------------------------------------
   SERVER-WRITTEN WALLET ADJUSTMENTS

   The match server records wager stakes, payouts and refunds as
   entries under walletAdjustments/{myUid}/entries. This listener
   applies each one to the local wallet exactly once (ids are
   remembered, then the entry is deleted), so a payout that arrives
   while the app was closed is still credited on the next launch.
------------------------------------------------------------ */

const APPLIED_ADJ_KEY = "pf_applied_wallet_adj_v1";

let walletAdjUnsub = null;

function loadAppliedAdjustments() {
  try {
    return JSON.parse(localStorage.getItem(nsKey(APPLIED_ADJ_KEY)) || "[]");
  } catch (e) {
    return [];
  }
}

function saveAppliedAdjustments(list) {
  try {
    localStorage.setItem(nsKey(APPLIED_ADJ_KEY), JSON.stringify(list.slice(-200)));
  } catch (e) {
    /* Non-fatal. */
  }
}

function startWalletAdjustmentListener() {
  if (walletAdjUnsub || !fbDb || !fbAuth || !fbAuth.currentUser) return;

  const uid = fbAuth.currentUser.uid;

  walletAdjUnsub = fbDb
    .collection("walletAdjustments")
    .doc(uid)
    .collection("entries")
    .onSnapshot(
      (snap) => {
        const applied = loadAppliedAdjustments();

        snap.docs.forEach((doc) => {
          if (!applied.includes(doc.id)) {
            const d = doc.data() || {};
            const delta = Number(d.delta);

            if (Number.isFinite(delta) && delta !== 0) {
              if (d.currency === "gems") {
                gems = Math.max(0, gems + delta);
                saveStoredNumber(GEMS_KEY, gems);
              } else {
                coins = Math.max(0, coins + delta);
                saveStoredNumber(COINS_KEY, coins);
              }

              updateResourcesUI();

              const icon = d.currency === "gems" ? "💎" : "🥮";
              const label =
                d.reason === "wager_win"
                  ? "Won the wager! +" + delta
                  : d.reason === "wager_refund"
                    ? "Wager refunded +" + delta
                    : "Wager: " + delta;

              showToast({
                icon: icon,
                title: label + " " + (d.currency === "gems" ? "gems" : "coins"),
                tone: delta > 0 ? "success" : undefined,
              });
            }

            applied.push(doc.id);
          }

          doc.ref.delete().catch(() => {});
        });

        saveAppliedAdjustments(applied);
      },
      (err) => {
        console.warn("[wallet] adjustment listener failed:", err && err.message);

        walletAdjUnsub = null;
      },
    );
}

function requireOnlineAuth() {
  if (!fbAuth || !fbAuth.currentUser || !fbDb) {
    showToast({
      icon: "⚠️",
      title: "Sign in required",
      message: "Online battles need your Google sign-in to be ready.",
      tone: "error",
    });

    return false;
  }

  return true;
}

function openOnlineModal() {
  if (!requireOnlineAuth()) {
    return;
  }

  const modal = document.getElementById("online-modal");
  if (!modal) return;

  modal.classList.remove("hidden");

  showOnlineSection("online-mode-pick");
}

function closeOnlineModal() {
  if (onlineMatch.active || onlineMatch.ws) {
    leaveOnlineMatch(null);
  }

  cancelOnlineSearch();

  const modal = document.getElementById("online-modal");
  if (modal) modal.classList.add("hidden");
}

function showOnlineSection(id) {
  ["online-mode-pick", "online-waiting", "online-debug-battle"].forEach(
    (sectionId) => {
      const el = document.getElementById(sectionId);
      if (el) el.classList.toggle("hidden", sectionId !== id);
    },
  );
}

function setWaitingText(text) {
  const el = document.getElementById("online-waiting-text");
  if (el) el.textContent = text;
}

/* ------------------------------------------------------------
   RANDOM OPPONENT MATCHMAKING

   Two players independently racing to find each other:
   - Whoever calls startRandomMatch() first, if nobody else is
     waiting, adds themselves to the "queue" collection and
     listens for a room to appear that pairs them up.
   - Whoever calls it while someone IS waiting claims that
     waiting ticket (in a transaction, so two simultaneous
     claimants can't both win) and creates the room directly.
------------------------------------------------------------ */

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

async function startRandomMatch() {
  if (!requireOnlineAuth()) return;

  const myUid = fbAuth.currentUser.uid;

  showOnlineSection("online-waiting");
  document.getElementById("online-room-code-display").classList.add("hidden");
  setWaitingText("Looking for an opponent…");

  onlineMatch.matchClaimed = false;

  try {
    /* Put my own ticket in the queue FIRST, unconditionally — this
       is what makes the symmetric watch-and-claim approach below
       actually meet in the middle when two people search at once. */
    const myTrainerName = myTrainerDisplayName();

    await fbDb
      .collection("queue")
      .doc(myUid)
      .set({
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        trainerName: myTrainerName,
        betAmount: selectedBet.amount,
        betCurrency: selectedBet.currency,
      });

    /* Path 1: watch the WHOLE queue for any other ticket — mine
       just now, or one that shows up later — and race to claim it.
       Two people clicking "Random Opponent" within the same
       instant both land here and both try to claim each other;
       Firestore's transaction guarantees only one of them wins,
       and the loser's own ticket then gets claimed by the winner
       anyway (both end up in the same room).

       Only look at tickets created recently (STALE_TICKET_MS) —
       nothing here ever removed a ticket left behind by someone who
       closed their tab mid-search instead of clicking Cancel, and
       orderBy("createdAt","asc") means those old abandoned tickets
       sort FIRST and permanently occupy the limit(5) results ahead
       of any fresh ticket, silently blocking matchmaking for
       everyone after enough of them pile up — exactly what looks
       like "takes forever and never starts." Filtering to only
       recent tickets makes stale ones self-expire instead of
       requiring every client to have cleaned up perfectly. */
    const freshCutoff = firebase.firestore.Timestamp.fromMillis(
      Date.now() - STALE_TICKET_MS,
    );

    const queueUnsub = fbDb
      .collection("queue")
      .where("createdAt", ">", freshCutoff)
      .orderBy("createdAt", "asc")
      .limit(5)
      .onSnapshot(
        (snap) => {
          if (onlineMatch.matchClaimed) return;

          const candidate = snap.docs.find(
            (d) => d.id !== myUid && !(d.data() || {}).claimedBy,
          );

          if (!candidate) return;

          const roomId = "r_" + Math.random().toString(36).slice(2, 10);

          const candidateData = candidate.data() || {};
          const opponentTrainerName = candidateData.trainerName || "Trainer";

          tryClaimQueueTicket(candidate.id, myUid, roomId, myTrainerName).then((claimed) => {
            if (claimed && !onlineMatch.matchClaimed) {
              onlineMatch.matchClaimed = true;
              cancelOnlineSearch();
              connectToMatch(
                roomId,
                { mine: myTrainerName, opponent: opponentTrainerName },
                sanitizeBet(candidateData.betAmount, candidateData.betCurrency),
              );

              /* Firestore's copy of this room has done its job (both
                 sides now have the roomId and are talking to the
                 match server directly) — delete it so it can't later
                 confuse a future search the way old leftover rooms
                 did here (see the mode/staleness checks in Path 2
                 below). */
              fbDb.collection("rooms").doc(roomId).delete().catch(() => {});
            }
          });
        },
        (err) => {
          console.error("[online] queue watch failed:", err);
        },
      );

    /* Path 2: watch for someone ELSE claiming MY ticket and
       creating the room for us.

       Scoped to mode=="random" specifically — without this, ANY
       leftover room where I'm hostUid and status is still "matched"
       (e.g. an old "Play With a Friend" room from a previous
       session that was never cleaned up — Firestore never deletes
       room documents after a match, and these test accounts get
       reused a lot) would satisfy this query the instant it
       attaches, hijacking a brand-new random search into a long-
       dead room with no real opponent behind it. That's exactly
       what "takes forever and never actually starts" looks like:
       it wasn't slow, it was instantly connecting to the wrong
       (dead) room and then waiting on a match that could never
       complete. */
    const roomUnsub = fbDb
      .collection("rooms")
      .where("hostUid", "==", myUid)
      .where("status", "==", "matched")
      .where("mode", "==", "random")
      .onSnapshot(
        (snap) => {
          if (snap.empty || onlineMatch.matchClaimed) return;

          /* Second safety net: ignore anything not created in this
             search (defends against any other future room-reuse
             edge case beyond just the friend-room one above). */
          const fresh = snap.docs.find((d) => {
            const createdAt = d.data().createdAt;
            return (
              createdAt &&
              Date.now() - createdAt.toMillis() < STALE_TICKET_MS
            );
          });

          if (!fresh) return;

          onlineMatch.matchClaimed = true;

          cancelOnlineSearch();

          const roomData = fresh.data();

          connectToMatch(
            fresh.id,
            { mine: roomData.hostTrainerName, opponent: roomData.guestTrainerName },
            sanitizeBet(roomData.betAmount, roomData.betCurrency),
          );

          fbDb.collection("rooms").doc(fresh.id).delete().catch(() => {});
        },
        (err) => {
          console.error("[online] room watch failed:", err);
        },
      );

    onlineMatch.queueUnsub = () => {
      queueUnsub();
      roomUnsub();
    };
  } catch (e) {
    showToast({
      icon: "⚠️",
      title: "Matchmaking failed",
      message: e.message || "Please try again.",
      tone: "error",
    });

    showOnlineSection("online-mode-pick");
  }
}

async function tryClaimQueueTicket(ticketUid, myUid, roomId, myTrainerName) {
  const ticketRef = fbDb.collection("queue").doc(ticketUid);
  const myTicketRef = fbDb.collection("queue").doc(myUid);
  const roomRef = fbDb.collection("rooms").doc(roomId);

  try {
    await fbDb.runTransaction(async (tx) => {
      const ticketSnap = await tx.get(ticketRef);

      /* Reading my OWN ticket too (even though I'm not checking
         its contents) is what makes this safe: if the other player
         is simultaneously trying to claim ME in their own
         transaction, both transactions now touch the exact same
         two documents (my ticket + theirs), so Firestore forces
         one of them to lose and retry — instead of both silently
         succeeding and creating two separate, empty rooms that
         never actually connect (which is what was happening
         before this fix). */
      await tx.get(myTicketRef);

      if (!ticketSnap.exists || ticketSnap.data().claimedBy) {
        throw new Error("ticket_gone");
      }

      /* Mark the other ticket as claimed (its owner deletes it
         themselves once they see the room) instead of deleting it —
         the security rules no longer let anyone delete someone
         else's ticket. */
      const ticketBet = sanitizeBet(
        ticketSnap.data().betAmount,
        ticketSnap.data().betCurrency,
      );

      tx.update(ticketRef, { claimedBy: myUid });
      tx.delete(myTicketRef);

      tx.set(roomRef, {
        hostUid: ticketUid,
        guestUid: myUid,
        status: "matched",
        mode: "random",
        hostTrainerName: ticketSnap.data().trainerName || "Trainer",
        guestTrainerName: myTrainerName,
        betAmount: ticketBet.amount,
        betCurrency: ticketBet.currency,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    return true;
  } catch (e) {
    return false;
  }
}

function cancelOnlineSearch() {
  if (onlineMatch.queueUnsub) {
    onlineMatch.queueUnsub();
    onlineMatch.queueUnsub = null;
  }

  if (onlineMatch.roomUnsub) {
    onlineMatch.roomUnsub();
    onlineMatch.roomUnsub = null;
  }

  if (fbAuth && fbAuth.currentUser && fbDb) {
    fbDb
      .collection("queue")
      .doc(fbAuth.currentUser.uid)
      .delete()
      .catch(() => {});
  }
}

/* ------------------------------------------------------------
   PLAY WITH A FRIEND — room codes
------------------------------------------------------------ */

async function createFriendRoom() {
  if (!requireOnlineAuth()) return;

  const myUid = fbAuth.currentUser.uid;

  showOnlineSection("online-waiting");

  const codeDisplay = document.getElementById("online-room-code-display");

  setWaitingText("Share this code with your friend:");

  try {
    let code = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateRoomCode();
      const snap = await fbDb.collection("rooms").doc(candidate).get();

      if (!snap.exists) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      throw new Error("Could not generate a free room code, try again.");
    }

    const myTrainerName = myTrainerDisplayName();

    await fbDb.collection("rooms").doc(code).set({
      hostUid: myUid,
      guestUid: null,
      status: "waiting",
      mode: "friend",
      hostTrainerName: myTrainerName,
      betAmount: selectedBet.amount,
      betCurrency: selectedBet.currency,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    if (codeDisplay) {
      codeDisplay.textContent = code;
      codeDisplay.classList.remove("hidden");
    }

    /* friends.js sends a battle invite for this room when the host
       came here via "⚔ Invite" in the friend list. */
    if (typeof window.onFriendRoomCreated === "function") {
      window.onFriendRoomCreated(code);
    }

    onlineMatch.roomUnsub = fbDb
      .collection("rooms")
      .doc(code)
      .onSnapshot(
        (snap) => {
          const data = snap.data();

          if (data && data.status === "matched") {
            cancelOnlineSearch();
            connectToMatch(
              code,
              { mine: myTrainerName, opponent: data.guestTrainerName },
              sanitizeBet(data.betAmount, data.betCurrency),
            );

            /* Done with Firestore's copy — delete it so it can't
               sit around and later confuse a future search (this is
               exactly the class of leftover room that was breaking
               Random Opponent — see the mode filter in Path 2 of
               startRandomMatch). */
            fbDb.collection("rooms").doc(code).delete().catch(() => {});
          }
        },
        (err) => {
          console.error("[online] friend room watch failed:", err);

          showToast({
            icon: "⚠️",
            title: "Lost connection to the room",
            message: err.message || "Please try again.",
            tone: "error",
          });

          showOnlineSection("online-mode-pick");
        },
      );
  } catch (e) {
    showToast({
      icon: "⚠️",
      title: "Couldn't create room",
      message: e.message || "Please try again.",
      tone: "error",
    });

    showOnlineSection("online-mode-pick");
  }
}

async function joinFriendRoom(code) {
  if (!requireOnlineAuth()) return;

  const myUid = fbAuth.currentUser.uid;
  const myTrainerName = myTrainerDisplayName();
  const roomRef = fbDb.collection("rooms").doc(code);
  let hostTrainerName = "Trainer";
  let hostBet = { amount: 0, currency: "coins" };

  showOnlineSection("online-waiting");
  document.getElementById("online-room-code-display").classList.add("hidden");
  setWaitingText("Joining room " + code + "…");

  try {
    await fbDb.runTransaction(async (tx) => {
      const snap = await tx.get(roomRef);

      if (!snap.exists) {
        throw new Error("Room not found. Check the code and try again.");
      }

      const data = snap.data();

      if (data.status !== "waiting" || data.guestUid) {
        throw new Error("That room is already full.");
      }

      if (data.hostUid === myUid) {
        throw new Error("You can't join your own room.");
      }

      hostTrainerName = data.hostTrainerName || "Trainer";
      hostBet = sanitizeBet(data.betAmount, data.betCurrency);

      if (hostBet.amount && !canAffordBet(hostBet)) {
        throw new Error(
          "This room has a " +
            hostBet.amount +
            " " +
            hostBet.currency +
            " wager you can't cover.",
        );
      }

      tx.update(roomRef, {
        guestUid: myUid,
        guestTrainerName: myTrainerName,
        status: "matched",
      });
    });

    connectToMatch(code, { mine: myTrainerName, opponent: hostTrainerName }, hostBet);

    /* Same cleanup as the host side above — both parties now have
       what they need via the match server, Firestore's copy of the
       room is done. */
    fbDb.collection("rooms").doc(code).delete().catch(() => {});
  } catch (e) {
    showToast({
      icon: "⚠️",
      title: "Couldn't join room",
      message: e.message || "Please try again.",
      tone: "error",
    });

    showOnlineSection("online-mode-pick");
  }
}

/* ------------------------------------------------------------
   MATCH CONNECTION — WebSocket to the dedicated game server
------------------------------------------------------------ */

/* Turns the player's trainer name (free text, up to 16 chars) into
   the lowercase-hyphenated slug shown next to their Pokémon in
   online battles — "Alex T." -> "alex-t". Falls back to "trainer"
   so a blank/unset name never produces an empty label. */
/* ============================================================
   DAILY REWARD & "WHAT'S NEW"
============================================================ */

const DAILY_REWARD_KEY = "pf_daily_reward_day_v1";
const WHATS_NEW_KEY = "pf_whats_new_v1";

const DAILY_REWARD_COINS = 100;
const DAILY_REWARD_BALLS = 1;

/* Once per calendar day (device local time), the first launch hands
   out a small bundle of coins and a Poké Ball — a reason to come
   back, and a steady trickle of balls now that catching costs one. */
function claimDailyReward() {
  const today = Math.floor(
    (Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000,
  );

  if (loadStoredNumber(DAILY_REWARD_KEY, -1) === today) {
    return;
  }

  saveStoredNumber(DAILY_REWARD_KEY, today);

  coins += DAILY_REWARD_COINS;
  pokeballCount += DAILY_REWARD_BALLS;

  saveStoredNumber(COINS_KEY, coins);
  saveInventory();
  updateResourcesUI();

  setTimeout(() => {
    showToast({
      icon: "🎁",
      title: "Daily reward!",
      message:
        "+" +
        DAILY_REWARD_COINS +
        " coins and +" +
        DAILY_REWARD_BALLS +
        " Poké Ball. Come back tomorrow for more.",
      tone: "success",
      duration: 5000,
    });
  }, 1200);
}

/* ------------------------------------------------------------
   FIRST-RUN TUTORIAL — a short 5-card walkthrough shown once to
   new players (and replayable from How to Play). The full details
   live in How to Play; this is just the essentials.
------------------------------------------------------------ */

const TUTORIAL_KEY = "pf_tutorial_seen_v1";

const TUTORIAL_STEPS = [
  {
    icon: "⚔️",
    title: "Battle",
    text: "Press BATTLE on Home. Move with A / D, jump with W, attack with S, dodge with Q and block with Shift. On a phone, use the on-screen buttons.",
  },
  {
    icon: "🎯",
    title: "Catch Pokémon",
    text: "After you win, a catch screen opens: pick a Poké Ball and throw it. Not every Pokémon settles in the ball, so you may need a few tries. During a 1v1 fight you can also press 5 to throw a ball (6 changes the ball type).",
  },
  {
    icon: "🛒",
    title: "Shop",
    text: "Spend coins and gems on 27 kinds of Poké Ball, plus Berries and Potions to heal your Pokémon.",
  },
  {
    icon: "🌐",
    title: "Play online",
    text: "Battle a real trainer, with or without a wager. Add friends with the 👥 button (by name or Trainer ID) and invite them to a private match. Online fights use the same type and Legendary rules as the CPU.",
  },
  {
    icon: "❓",
    title: "Need help?",
    text: "Tap the ? button any time for the full How to Play guide.",
  },
];

let tutorialIndex = 0;

function showTutorial() {
  tutorialIndex = 0;

  let el = document.getElementById("tutorial-modal");

  if (!el) {
    el = document.createElement("div");
    el.id = "tutorial-modal";
    el.className = "catch-modal";

    document.body.appendChild(el);
  }

  el.classList.remove("hidden");

  renderTutorial();
}

function closeTutorial() {
  const el = document.getElementById("tutorial-modal");

  if (el) el.classList.add("hidden");

  try {
    localStorage.setItem(TUTORIAL_KEY, "1");
  } catch (e) {
    /* Non-fatal. */
  }
}

function renderTutorial() {
  const el = document.getElementById("tutorial-modal");

  if (!el) return;

  const step = TUTORIAL_STEPS[tutorialIndex];
  const last = tutorialIndex === TUTORIAL_STEPS.length - 1;

  el.innerHTML =
    '<div class="catch-card">' +
    '<div class="catch-top"><span>QUICK TUTORIAL</span><span>' +
    (tutorialIndex + 1) +
    " / " +
    TUTORIAL_STEPS.length +
    "</span></div>" +
    '<div class="tutorial-icon">' +
    step.icon +
    "</div>" +
    '<div class="catch-name">' +
    step.title +
    "</div>" +
    '<div class="catch-status" style="min-height:90px">' +
    step.text +
    "</div>" +
    '<div class="catch-actions">' +
    '<button type="button" class="catch-btn" data-act="skip">' +
    (last ? "Close" : "Skip") +
    "</button>" +
    (last
      ? ""
      : '<button type="button" class="catch-btn primary" data-act="next">Next ▶</button>') +
    "</div></div>";

  el.querySelector('[data-act="skip"]').onclick = closeTutorial;

  const next = el.querySelector('[data-act="next"]');

  if (next) {
    next.onclick = function () {
      tutorialIndex += 1;
      renderTutorial();
    };
  }
}

function showTutorialOnce() {
  let seen = false;

  try {
    seen = localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch (e) {
    seen = true;
  }

  if (!seen) {
    setTimeout(showTutorial, 2500);
  }
}

/* One-time heads-up about everything that changed — the How to Play
   screen has the full details. */
function showWhatsNewOnce() {
  if (loadStoredNumber(WHATS_NEW_KEY, 0) >= 1) {
    return;
  }

  saveStoredNumber(WHATS_NEW_KEY, 1);

  setTimeout(() => {
    showToast({
      icon: "✨",
      title: "What's new",
      message:
        "Shop with 27 kinds of Poké Ball, Berries & Potions • Press 5 to throw a ball — Pokémon can break free! • 4 moves per Pokémon (keys 1-4 or the move buttons) • XP, move learning & XP-based evolution • Type matchups • Legendary Pokémon. Tap ? for details.",
      duration: 9000,
    });
  }, 3000);
}

/* Plays the "VS" trainer intro over the battlefield — see the CSS
   in style.css for what it actually does (fly-in names, VS drops
   from the top). Auto-removes itself; safe to call repeatedly. */
window.showVsIntro = function (nameLeft, nameRight) {
  const el = document.getElementById("vs-intro");

  if (!el) return;

  const left = document.getElementById("vs-intro-name-left");
  const right = document.getElementById("vs-intro-name-right");

  if (left) left.textContent = nameLeft;
  if (right) right.textContent = nameRight;

  el.classList.remove("hidden", "fading");

  requestAnimationFrame(() => el.classList.add("playing"));

  setTimeout(() => {
    el.classList.add("fading");

    setTimeout(() => {
      el.classList.remove("playing", "fading");
      el.classList.add("hidden");
    }, 400);
  }, 1800);
};

/* Poké Ball wobble-and-flash shown over a capture, reusing the same
   real artwork the header/Shop icons use (see POKEBALL_ICON_HTML). */
function playCaptureAnimation() {
  let el = document.getElementById("capture-anim");

  if (!el) {
    el = document.createElement("div");
    el.id = "capture-anim";
    el.className = "capture-anim";
    el.innerHTML = POKEBALL_ICON_HTML;
    document.body.appendChild(el);
  }

  el.classList.remove("playing");

  void el.offsetWidth; // restart the CSS animation if it's already mid-play

  el.classList.add("playing");

  setTimeout(() => {
    el.classList.remove("playing");
  }, 1200);
}

function myTrainerDisplayName() {
  return (settings.trainerName || "").trim() || "Trainer";
}

window.getMyTrainerName = myTrainerDisplayName;

function trainerNameSlug() {
  const slug = (settings.trainerName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "trainer";
}

/* ============================================================
   TRAINER NAME UNIQUENESS

   Every signed-in trainer's name is reserved as its own document
   in the trainerNames Firestore collection (doc id = the name,
   lowercased/trimmed, so "Ash" and "ash" collide on purpose) —
   whoever's uid is on that doc owns the name, and the security
   rules only let its owner delete it. Claiming a new name and
   releasing the old one happens in a single transaction, so a
   rename can't ever leave two names claimed or a taken name freed
   by accident.
============================================================ */

/* Whichever name this trainer currently has reserved, kept in sync
   with Firestore rather than just whatever's in the input box — so
   a rejected rename knows exactly what to revert the input back to. */
let lastClaimedTrainerName = settings.trainerName || "";

function trainerNameKey(name) {
  return (name || "").trim().toLowerCase();
}

/* Attempts to reserve `rawName`, releasing `previousRawName` (this
   trainer's current reservation, if any) in the same transaction.
   Returns { ok: true } on success, or { ok: false, reason } —
   reason is "taken", "empty", or "error". If there's no Firestore
   connection at all (offline, or Firebase failed to init), this
   can't check anything shared, so it succeeds locally-only. */
async function claimTrainerName(rawName, previousRawName) {
  const trimmed = (rawName || "").trim();
  const key = trainerNameKey(trimmed);
  const previousKey = trainerNameKey(previousRawName);

  if (!trimmed) {
    return { ok: false, reason: "empty" };
  }

  if (key === previousKey) {
    /* Only casing/whitespace changed, or nothing did — no new claim
       needed, but still worth saving the exact display text. */
    return { ok: true, unchanged: true };
  }

  if (!fbDb || !fbAuth || !fbAuth.currentUser) {
    return { ok: true, offline: true };
  }

  const uid = fbAuth.currentUser.uid;
  const newRef = fbDb.collection("trainerNames").doc(key);

  try {
    return await fbDb.runTransaction(async (tx) => {
      const newSnap = await tx.get(newRef);

      if (newSnap.exists && newSnap.data().uid !== uid) {
        return { ok: false, reason: "taken" };
      }

      let oldSnap = null;

      if (previousKey) {
        oldSnap = await tx.get(fbDb.collection("trainerNames").doc(previousKey));
      }

      if (oldSnap && oldSnap.exists && oldSnap.data().uid === uid) {
        tx.delete(fbDb.collection("trainerNames").doc(previousKey));
      }

      /* Already reserved by THIS account: nothing to write (and the
         security rules only allow creating a reservation, not
         rewriting one). */
      if (!newSnap.exists) {
        tx.set(newRef, {
          uid: uid,
          name: trimmed,
          claimedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { ok: true };
    });
  } catch (e) {
    return { ok: false, reason: "error" };
  }
}

function setTrainerNameStatus(tone, text) {
  const el = document.getElementById("trainer-name-status");

  if (!el) return;

  if (!text) {
    el.classList.add("hidden");
    return;
  }

  el.textContent = text;
  el.className = "settings-hint " + tone;
  el.classList.remove("hidden");
}

/* Runs when the trainer name field loses focus (or Enter is
   pressed) — the actual moment a rename is attempted, rather than
   on every keystroke, which would spam Firestore with a check per
   letter typed and reject perfectly good names that were only
   half-typed so far. */
async function commitTrainerName() {
  const raw = (settings.trainerName || "").trim();

  if (!raw || trainerNameKey(raw) === trainerNameKey(lastClaimedTrainerName)) {
    setTrainerNameStatus(null, "");
    return;
  }

  setTrainerNameStatus("pending", "Checking name availability…");

  const result = await claimTrainerName(raw, lastClaimedTrainerName);

  if (result.ok) {
    lastClaimedTrainerName = raw;

    if (result.offline) {
      setTrainerNameStatus(
        "pending",
        "Saved — sign in to reserve this name so no other trainer can use it.",
      );
    } else {
      setTrainerNameStatus("success", "✓ This name is yours.");
    }

    return;
  }

  /* Rejected — revert to the last name that's actually reserved,
     rather than leaving an unclaimed name sitting in the field. */
  settings.trainerName = lastClaimedTrainerName;
  saveSettings();

  const input = document.getElementById("settings-trainer-name");

  if (input) {
    input.value = lastClaimedTrainerName;
  }

  updateTrainerNameUI();

  setTrainerNameStatus(
    "error",
    result.reason === "taken"
      ? "That trainer name is already taken by another trainer — pick a different one."
      : "Couldn't confirm that name right now — reverted to your last one.",
  );

  showToast({
    icon: "⚠️",
    title:
      result.reason === "taken"
        ? "That name is already taken"
        : "Couldn't confirm that name",
    message: "Reverted to \"" + lastClaimedTrainerName + "\".",
  });
}

/* Builds a free-looking alternative to a taken name: the original
   (shortened if needed so the whole thing still fits the 16-character
   limit) plus a few digits, e.g. "Arman" -> "Arman482". More digits
   are used as the attempts go on, so it can always find something. */
function trainerNameCandidate(rawName, attempt) {
  const digits = attempt < 5 ? 2 : attempt < 9 ? 3 : 4;
  const num = String(
    Math.floor(Math.random() * Math.pow(10, digits)),
  ).padStart(digits, "0");

  return rawName.trim().slice(0, 16 - num.length) + num;
}

/* Run once at startup: makes sure whatever name is saved locally is
   actually reserved under this account.

   • Free (or already yours) -> it's reserved, nothing else happens.
   • TAKEN by another trainer -> previously this only showed a
     warning and left the duplicate name in place, so a brand-new
     account whose Google name (e.g. "Arman") already belonged to
     someone else kept using it. Now it automatically picks the
     nearest free name ("Arman482"), saves it, and tells the player —
     two trainers can never end up sharing a name. They can still
     change it any time in Settings. */
async function ensureTrainerNameClaimed() {
  const raw = (settings.trainerName || "").trim();

  if (!raw) return;

  /* previous = "" on purpose. Passing (raw, raw) made claimTrainerName
     think "nothing changed" and return success WITHOUT touching
     Firestore — so this startup check never reserved or verified the
     name at all, and two accounts could share a Google first name. */
  const result = await claimTrainerName(raw, "");

  if (result.ok) {
    lastClaimedTrainerName = raw;
    return;
  }

  if (result.reason !== "taken") return;

  for (let attempt = 0; attempt < 14; attempt++) {
    const candidate = trainerNameCandidate(raw, attempt);

    /* previous = "" : we don't own the taken name, so there is
       nothing of ours to release. */
    const tryClaim = await claimTrainerName(candidate, "");

    if (tryClaim.ok) {
      settings.trainerName = candidate;
      lastClaimedTrainerName = candidate;

      saveSettings();
      updateTrainerNameUI();

      showToast({
        icon: "🏷️",
        title: "\"" + raw + "\" was already taken",
        message:
          "You're now \"" +
          candidate +
          "\". You can change it in Settings.",
        duration: 6000,
      });

      return;
    }

    if (tryClaim.reason === "error") break;
  }

  showToast({
    icon: "⚠️",
    title: "Your trainer name is already taken",
    message:
      "Another trainer already has \"" +
      raw +
      "\" — pick a new one in Settings.",
  });
}

async function buildOnlineTeamPayload() {
  const team = await buildPlayerTeam();

  await Promise.all(
    team.map(async (p) => {
      try {
        const move = await resolveBattleMove(p);
        if (move) p.realMove = move;
      } catch (e) {
        /* Fall back to the type-based move below. */
      }
    }),
  );

  const trainer = trainerNameSlug();

  return team.map((p) => ({
    name: p.name,
    id: p.id,
    height: p.height,
    types: p.types,
    move: p.realMove || getMove(p),
    trainer: trainer,
    /* Lets the opponent see this Pokémon come out of the ball it was
       actually caught in. */
    ball: window.getCaughtBallId(p.name) || undefined,
  }));
}

async function connectToMatch(roomId, trainerNames, bet) {
  const attempt = ++onlineMatch.attempt;

  showOnlineSection("online-waiting");
  setWaitingText("Connecting to the match server…");
  document.getElementById("online-room-code-display").classList.add("hidden");

  onlineMatch.roomId = roomId;

  /* The agreed wager for this match (whatever the host picked —
     see startRandomMatch/createFriendRoom/joinFriendRoom), settled
     in beginOnlineMatch (stake taken from both sides) and the
     "match_over" handler below (pot awarded to the winner). Exposed
     on window for the same cross-file reason as trainer names. */
  const safeBet = bet ? sanitizeBet(bet.amount, bet.currency) : null;

  /* Refuse to start a match whose stake this player can't cover —
     otherwise the stake would be silently dropped for one side only
     while the winner is still paid the full pot. */
  if (safeBet && safeBet.amount && !canAffordBet(safeBet)) {
    stopOnlineMatch();
    showOnlineSection("online-mode-pick");
    return;
  }

  window.onlineBet = safeBet && safeBet.amount ? safeBet : null;

  /* Trainer names for the "TRAINER BATTLE! X VS Y" banner and the
     "trainer-pokemon" tags — read straight out of the Firestore room
     doc that matchmaking just used (see startRandomMatch/
     createFriendRoom/joinFriendRoom), NOT from the match server.
     The server only round-trips whatever's in each Pokémon's team
     payload, and there's no guarantee it passes an unrecognized
     "trainer" field through unchanged — this way the names are
     right regardless of what the server does with the rest of the
     payload. Exposed on window so game.js (a separate file with no
     access to app.js's own variables) can read them. */
  window.onlineTrainerNames = {
    mine: (trainerNames && trainerNames.mine) || myTrainerDisplayName(),
    opponent: (trainerNames && trainerNames.opponent) || "Trainer",
  };

  let token;
  let teamPayload;

  try {
    token = await fbAuth.currentUser.getIdToken();
    teamPayload = await buildOnlineTeamPayload();
  } catch (e) {
    if (onlineMatch.attempt !== attempt) return;

    showToast({
      icon: "⚠️",
      title: "Couldn't start the match",
      message: e.message || "Please try again.",
      tone: "error",
    });

    showOnlineSection("online-mode-pick");
    return;
  }

  /* The player pressed Cancel / left while we were fetching the login
     token and building the team — don't open a connection for a
     search that no longer exists. */
  if (onlineMatch.attempt !== attempt) return;

  const url =
    MATCH_SERVER_URL +
    "/?token=" +
    encodeURIComponent(token) +
    "&room=" +
    encodeURIComponent(roomId);

  /* Kept so a dropped connection can be re-opened mid-match and so
     "Rematch" knows who/what to reuse. */
  onlineMatch.teamPayload = teamPayload;
  onlineMatch.trainerNames = trainerNames;
  onlineMatch.bet = safeBet && safeBet.amount ? safeBet : null;
  onlineMatch.reconnecting = false;
  onlineMatch.reconnectAttempts = 0;

  /* Rematch room ids: <original>_rm1, _rm2, … — both players derive
     the same next id from the same counter, so they pair up on the
     server with no extra signalling. */
  const base = String(roomId).replace(/_rm\d+$/, "");
  const rmMatch = String(roomId).match(/_rm(\d+)$/);

  onlineMatch.rematchBase = base;
  onlineMatch.rematchCount = rmMatch ? Number(rmMatch[1]) : 0;

  const ws = new WebSocket(url);

  onlineMatch.ws = ws;

  ws.onopen = () => {
    setWaitingText(
      "Connected. If this is the server's first request in a while, it can take up to a minute to wake up…",
    );

    startOnlinePing(ws);
  };

  ws.onmessage = (event) => {
    let msg;

    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      return;
    }

    handleMatchMessage(msg, teamPayload);
  };

  ws.onerror = () => {
    if (!onlineMatch.active) {
      showToast({
        icon: "⚠️",
        title: "Connection failed",
        message:
          "Couldn't reach the match server. It may be waking up — try again in a moment.",
        tone: "error",
      });

      showOnlineSection("online-mode-pick");
    }
  };

  ws.onclose = () => {
    /* An old socket closing after we already replaced it. */
    if (onlineMatch.ws !== ws) return;

    if (onlineMatch.active && !onlineMatch.reconnecting) {
      /* Mid-battle drop (Wi-Fi blip, phone lock screen): the server
         holds the match for ~20s, so try to get back in. */
      reconnectOnlineMatch();
      return;
    }

    if (onlineMatch.reconnecting) return;

    stopOnlineMatch();
  };
}

/* ------------------------------------------------------------
   RECONNECT

   The match server keeps a dropped player's seat for ~20 seconds
   and sends a "resume" message to a returning player. Here we just
   re-open the socket (with a fresh login token) a few times.
------------------------------------------------------------ */

const RECONNECT_MAX_ATTEMPTS = 8;

async function reconnectOnlineMatch() {
  if (!onlineMatch.active || onlineMatch.reconnecting) return;

  onlineMatch.reconnecting = true;
  onlineMatch.reconnectAttempts = 0;

  stopOnlinePing();

  showToast({
    icon: "🔌",
    title: "Connection lost",
    message: "Reconnecting to your match…",
    duration: 5000,
  });

  while (
    onlineMatch.active &&
    onlineMatch.reconnecting &&
    onlineMatch.reconnectAttempts < RECONNECT_MAX_ATTEMPTS
  ) {
    onlineMatch.reconnectAttempts += 1;

    await new Promise((r) =>
      setTimeout(r, Math.min(600 * onlineMatch.reconnectAttempts, 2500)),
    );

    if (!onlineMatch.active || !onlineMatch.reconnecting) return;

    try {
      const token = await fbAuth.currentUser.getIdToken(true);

      const url =
        MATCH_SERVER_URL +
        "/?token=" +
        encodeURIComponent(token) +
        "&room=" +
        encodeURIComponent(onlineMatch.roomId);

      const ok = await openReconnectSocket(url);

      if (ok) return;
    } catch (e) {
      /* Try again on the next loop. */
    }
  }

  if (onlineMatch.reconnecting) {
    onlineMatch.reconnecting = false;

    showToast({
      icon: "💀",
      title: "Couldn't reconnect",
      message: "The match was lost.",
      tone: "error",
    });

    leaveOnlineMatch();
  }
}

/* Resolves true once the server confirms the seat ("resume"), false
   if the socket failed/closed or the match no longer exists. */
function openReconnectSocket(url) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (ok) => {
      if (settled) return;

      settled = true;
      clearTimeout(resumeTimer);

      resolve(ok);
    };

    const ws = new WebSocket(url);

    /* If the server answers "joined" but never "resume", the match
       is already over (the room was cleaned up) — stop waiting. */
    let resumeTimer = null;

    ws.onmessage = (event) => {
      let msg;

      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      if (msg.type === "joined") {
        resumeTimer = setTimeout(() => {
          try {
            ws.close();
          } catch (e) {
            /* Already closed. */
          }

          onlineMatch.reconnecting = false;

          showToast({
            icon: "🏁",
            title: "The match ended while you were away",
          });

          leaveOnlineMatch();

          finish(true);
        }, 3000);

        return;
      }

      if (msg.type === "resume") {
        onlineMatch.ws = ws;
        onlineMatch.reconnecting = false;

        ws.onclose = () => {
          if (onlineMatch.ws !== ws) return;

          if (onlineMatch.active && !onlineMatch.reconnecting) {
            reconnectOnlineMatch();
          } else if (!onlineMatch.reconnecting) {
            stopOnlineMatch();
          }
        };

        startOnlinePing(ws);

        if (window.PokemonOnlineBattle && msg.snapshot) {
          window.PokemonOnlineBattle.applySnapshot(msg.snapshot);
        }

        showToast({ icon: "✅", title: "Reconnected", tone: "success" });

        finish(true);
        return;
      }

      /* Anything else (match_over, state, …) is handled normally
         once we're the active socket. */
      if (onlineMatch.ws === ws) {
        handleMatchMessage(msg, onlineMatch.teamPayload);
      }
    };

    ws.onerror = () => finish(false);

    ws.onclose = () => finish(false);
  });
}

function handleMatchMessage(msg, teamPayload) {
  if (msg.type === "joined") {
    onlineMatch.mySide = msg.side;

    onlineMatch.ws.send(
      JSON.stringify({
        type: "ready",
        team: teamPayload,
        bet: window.onlineBet || null,
      }),
    );

    setWaitingText("Waiting for your opponent…");
    return;
  }

  if (msg.type === "waiting_for_opponent") {
    setWaitingText("Waiting for your opponent…");
    return;
  }

  if (msg.type === "opponent_ready") {
    setWaitingText("Opponent found! Starting…");
    return;
  }

  if (msg.type === "match_cancelled") {
    const reasons = {
      bet_mismatch: "You and your opponent didn't agree on the same wager.",
      cannot_afford: "One of you can't cover the wager (make sure your save is synced).",
      wager_failed: "The wager couldn't be set up. Please try again.",
      opponent_left: "Your opponent left before the match began.",
    };

    showToast({
      icon: "⚠️",
      title: "Match cancelled",
      message: reasons[msg.reason] || "Please try again.",
      tone: "error",
    });

    window.onlineBet = null;
    stopOnlineMatch();
    showOnlineSection("online-mode-pick");
    return;
  }

  if (msg.type === "start") {
    /* The server is the source of truth for the stake. Wallet
       changes (stake taken, pot paid) arrive as server-written
       entries — see startWalletAdjustmentListener. */
    /* A server that predates server-side wagers never sends a "bet"
       field at all (undefined). In that case fall back to the old
       client-side stake/payout so wagers keep working during a
       staggered deploy. A new server always sends bet (null = none). */
    window.onlineBetLegacy = msg.bet === undefined;

    if (msg.bet !== undefined) {
      window.onlineBet =
        msg.bet && msg.bet.amount ? sanitizeBet(msg.bet.amount, msg.bet.currency) : null;
    }

    startWalletAdjustmentListener();

    beginOnlineMatch(msg.myTeam, msg.opponentTeam);
    return;
  }

  if (msg.type === "pong") {
    handleOnlinePong(msg);
    return;
  }

  if (msg.type === "state") {
    if (window.PokemonOnlineBattle) {
      window.PokemonOnlineBattle.applySnapshot(msg.snapshot);
    }
    return;
  }

  if (msg.type === "opponent_reconnected") {
    showToast({ icon: "✅", title: "Opponent is back" });
    return;
  }

  if (msg.type === "opponent_disconnected") {
    showToast({
      icon: "⏳",
      title: "Opponent disconnected",
      message: "Giving them a moment to reconnect…",
    });
    return;
  }

  if (msg.type === "match_over") {
    const won = msg.winnerUid === fbAuth.currentUser.uid;

    if (msg.reason === "forfeit") {
      showToast({
        icon: won ? "🏆" : "💀",
        title: won ? "Your opponent disconnected" : "You disconnected too long",
        tone: won ? "success" : "error",
      });
    }

    settleOnlineBet(won);

    if (window.PokemonOnlineBattle) {
      window.PokemonOnlineBattle.finish(won);
    }

    /* Snapshot what a rematch needs BEFORE stopOnlineMatch wipes it. */
    const rematchInfo = {
      base: onlineMatch.rematchBase,
      next: (onlineMatch.rematchCount || 0) + 1,
      trainerNames: onlineMatch.trainerNames,
      bet: onlineMatch.bet,
      forfeit: msg.reason === "forfeit",
    };

    stopOnlineMatch();

    if (rematchInfo.base && !rematchInfo.forfeit) {
      setTimeout(() => offerRematch(rematchInfo), 2600);
    }

    const modal = document.getElementById("online-modal");
    if (modal) modal.classList.add("hidden");

    showOnlineSection("online-mode-pick");
  }
}

/* ------------------------------------------------------------
   REMATCH

   After an online match, offer to play the same opponent again with
   the same wager. Both players derive the same next room id, so
   whoever taps first just waits in the usual "waiting for opponent"
   screen until the other taps too (or cancels).
------------------------------------------------------------ */

let rematchTimer = null;

function closeRematchPrompt() {
  const el = document.getElementById("rematch-prompt");

  if (el) el.remove();

  if (rematchTimer) {
    clearTimeout(rematchTimer);
    rematchTimer = null;
  }
}

function offerRematch(info) {
  closeRematchPrompt();

  const el = document.createElement("div");

  el.id = "rematch-prompt";
  el.className = "rematch-prompt";

  const bet = info.bet;

  el.innerHTML =
    "<b>Rematch?</b>" +
    "<span>" +
    (bet && bet.amount
      ? "Same wager: " + bet.amount + " " + bet.currency
      : "No wager") +
    "</span>" +
    '<div class="rematch-actions">' +
    '<button type="button" class="catch-btn primary" data-act="go">Rematch</button>' +
    '<button type="button" class="catch-btn" data-act="no">No thanks</button>' +
    "</div>";

  document.body.appendChild(el);

  el.querySelector('[data-act="no"]').onclick = closeRematchPrompt;

  el.querySelector('[data-act="go"]').onclick = () => {
    closeRematchPrompt();

    const modal = document.getElementById("online-modal");
    if (modal) modal.classList.remove("hidden");

    connectToMatch(info.base + "_rm" + info.next, info.trainerNames, info.bet);
  };

  /* The offer expires so it doesn't hang around forever. */
  rematchTimer = setTimeout(closeRematchPrompt, 30000);
}

function beginOnlineMatch(myTeam, opponentTeam) {
  onlineMatch.active = true;
  onlineMatch.input = { left: false, right: false, block: false };

  const modal = document.getElementById("online-modal");
  if (modal) modal.classList.add("hidden");

  /* Normally the stake is taken by the match server, which writes a
     wallet-adjustment entry that startWalletAdjustmentListener
     applies. Only an older server (no "bet" in its start message)
     needs the stake taken here. */
  if (window.onlineBetLegacy && window.onlineBet && window.onlineBet.amount) {
    if (canAffordBet(window.onlineBet)) {
      if (window.onlineBet.currency === "gems") {
        gems = Math.max(0, gems - window.onlineBet.amount);
        saveStoredNumber(GEMS_KEY, gems);
      } else {
        coins = Math.max(0, coins - window.onlineBet.amount);
        saveStoredNumber(COINS_KEY, coins);
      }

      updateResourcesUI();
    } else {
      leaveOnlineMatch("Match cancelled: you can't cover the wager.");
      return;
    }
  }

  if (window.PokemonOnlineBattle) {
    window.PokemonOnlineBattle.start(myTeam, opponentTeam, onlineMatch.mySide);
  }

  window.addEventListener("keydown", handleOnlineKeyDown);
  window.addEventListener("keyup", handleOnlineKeyUp);
}

/* ------------------------------------------------------------
   LATENCY READOUT

   Online lag is almost always network round-trip time to the match
   server. A small badge shows the live ping so you can tell
   "the server is far away / slow" apart from a bug:
   green < 80ms, yellow < 160ms, red above that.
------------------------------------------------------------ */

let onlinePingTimer = null;
let onlinePingMs = null;

function ensurePingBadge() {
  let el = document.getElementById("online-ping");

  if (!el) {
    el = document.createElement("div");
    el.id = "online-ping";
    el.className = "online-ping hidden";

    document.body.appendChild(el);
  }

  return el;
}

function startOnlinePing(ws) {
  stopOnlinePing();

  const send = () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping", t: performance.now() }));
    }
  };

  send();

  onlinePingTimer = setInterval(send, 2000);
}

function handleOnlinePong(msg) {
  const rtt = performance.now() - Number(msg.t);

  if (!Number.isFinite(rtt) || rtt < 0) return;

  /* Light smoothing so the number doesn't flicker. */
  onlinePingMs = onlinePingMs === null ? rtt : onlinePingMs * 0.6 + rtt * 0.4;

  const el = ensurePingBadge();
  const ms = Math.round(onlinePingMs);

  el.textContent = "🌐 " + ms + " ms";
  el.classList.remove("hidden", "ping-good", "ping-ok", "ping-bad");
  el.classList.add(ms < 80 ? "ping-good" : ms < 160 ? "ping-ok" : "ping-bad");
}

function stopOnlinePing() {
  if (onlinePingTimer) {
    clearInterval(onlinePingTimer);
    onlinePingTimer = null;
  }

  onlinePingMs = null;

  const el = document.getElementById("online-ping");

  if (el) el.classList.add("hidden");
}

function stopOnlineMatch() {
  onlineMatch.attempt += 1;
  onlineMatch.active = false;
  onlineMatch.reconnecting = false;

  stopOnlinePing();

  onlineMatch.lastInputSig = null;

  window.removeEventListener("keydown", handleOnlineKeyDown);
  window.removeEventListener("keyup", handleOnlineKeyUp);

  if (onlineMatch.ws) {
    const ws = onlineMatch.ws;

    try {
      if (ws.readyState === WebSocket.CONNECTING) {
        /* Closing a socket that hasn't connected yet makes the browser
           print "WebSocket is closed before the connection is
           established". Let it finish connecting, then close it. */
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.onopen = () => {
          try {
            ws.close();
          } catch (e) {
            /* Already closed. */
          }
        };
      } else {
        ws.close();
      }
    } catch (e) {
      /* Already closed. */
    }

    onlineMatch.ws = null;
  }

  onlineMatch.roomId = null;
  onlineMatch.mySide = null;

  window.onlineTrainerNames = null;

  /* Any bet already taken in beginOnlineMatch stays taken — leaving
     (including a manual "Leave Match") forfeits it, same as any
     other way of not winning. Just clear the flag so it can't leak
     into a future, unrelated match. */
  window.onlineBet = null;
}

function leaveOnlineMatch(toastMessage) {
  const wasActive = onlineMatch.active;

  stopOnlineMatch();

  if (wasActive && window.PokemonOnlineBattle) {
    window.PokemonOnlineBattle.stop();
  }

  if (toastMessage) {
    showToast({ icon: "👋", title: toastMessage });
  }

  showOnlineSection("online-mode-pick");
}

function sendOnlineInput(actions) {
  if (!onlineMatch.ws || onlineMatch.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  /* The arena's raw x-axis is fixed to side "a"/"b" on the server,
     but the battlefield is now mirrored on-screen for side "b" so
     every player sees their own Pokémon on the left (see
     mirrorOnlineX in game.js). Swap which physical key counts as
     "left"/"right" for that side too, so A/D still move you the
     way they visually appear to on the mirrored view instead of
     running backwards. */
  const mirrored = onlineMatch.mySide === "b";

  const left = mirrored ? onlineMatch.input.right : onlineMatch.input.left;
  const right = mirrored ? onlineMatch.input.left : onlineMatch.input.right;
  const block = onlineMatch.input.block;

  /* Holding A/D/Shift makes the browser fire key-repeat events ~30
     times a second. If nothing changed and there's no one-shot action
     (jump/attack/…), the server already has this exact state — don't
     spend bandwidth and server CPU resending it. */
  const sig = (left ? "L" : "-") + (right ? "R" : "-") + (block ? "B" : "-");

  if (!(actions && actions.length) && sig === onlineMatch.lastInputSig) {
    return;
  }

  onlineMatch.lastInputSig = sig;

  onlineMatch.ws.send(
    JSON.stringify({
      type: "input",
      left: left,
      right: right,
      block: block,
      actions: actions || [],
    }),
  );
}

function handleOnlineKeyDown(e) {
  /* Never grab W A S D etc. while typing in a text box or when the
     battlefield isn't showing (see gameKeysShouldIgnore in game.js). */
  if (window.gameKeysShouldIgnore && window.gameKeysShouldIgnore(e)) return;

  const key = e.key.toLowerCase();

  if (e.repeat) {
    if (key === "a" || key === "d" || key === "shift") {
      /* Held keys still need to register once; fall through. */
    } else {
      return;
    }
  }

  if (key === "a") onlineMatch.input.left = true;
  if (key === "d") onlineMatch.input.right = true;
  if (key === "shift") onlineMatch.input.block = true;

  const actions = [];

  if (!e.repeat) {
    if (key === "w") actions.push("jump");
    if (key === "s") actions.push("attack");
    if (key === "q") actions.push("dodge");
    if (key === "tab") actions.push("switch");
  }

  if (["w", "a", "s", "d", "q", "shift", "tab"].includes(key)) {
    e.preventDefault();
  }

  sendOnlineInput(actions);
}

function handleOnlineKeyUp(e) {
  const key = e.key.toLowerCase();

  if (key === "a") onlineMatch.input.left = false;
  if (key === "d") onlineMatch.input.right = false;
  if (key === "shift") onlineMatch.input.block = false;

  sendOnlineInput([]);
}

function renderOnlineDebugState(snapshot) {
  const el = document.getElementById("online-debug-readout");
  if (!el || !snapshot) return;

  const mySide = onlineMatch.mySide;
  const oppSide = mySide === "a" ? "b" : "a";

  const me = snapshot.fighters[mySide];
  const opp = snapshot.fighters[oppSide];

  const line = (label, f) =>
    label +
    ": " +
    (f.name || "?") +
    "  HP " +
    f.hp +
    "/100" +
    (f.attacking ? "  [ATTACKING]" : "") +
    (f.blocking ? "  [BLOCKING]" : "") +
    (f.dodging ? "  [DODGING]" : "") +
    (f.jumping ? "  [JUMPING]" : "") +
    "  combo x" +
    f.combo;

  el.textContent =
    "tick " +
    snapshot.tick +
    "\n\n" +
    line("YOU ", me) +
    "\n" +
    line("THEM", opp);
}


/* Warm up the artwork of every ball type any of your captured
   Pokémon was caught in, so battle send-outs show the right ball
   immediately. */
setTimeout(function () {
  if (typeof window.preloadBallSprites === "function") {
    window.preloadBallSprites(
      capturedList.map(function (c) {
        return ballById(c.ball).id;
      }),
    );
  }
}, 800);
