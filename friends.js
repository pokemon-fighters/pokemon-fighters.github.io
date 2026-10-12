"use strict";

/* ============================================================
   FRIENDS — friend list like Free Fire's

   • Every trainer has a public profile (name + a 9-digit Trainer ID
     + a "last seen" heartbeat) so they can be found and shown
     as Online / In battle / Offline.
   • Add a friend by trainer name or Trainer ID. They get a
     request and can Accept or Decline.
   • Friends show online status; tap ⚔ Invite to open a private
     room and send them a battle invite they can Accept.

   Firestore layout (rules in firestore.rules):
     profiles/{uid}                    public profile + heartbeat
     friendRequests/{from}_{to}        a pending request
     friends/{uid}/list/{friendUid}    each side's friend list
     invites/{toUid}/items/{fromUid}   a battle invite (room code)

   This file loads AFTER app.js and uses its globals (fbAuth, fbDb,
   showToast, myTrainerDisplayName, joinFriendRoom, …).
============================================================ */

(function () {
  const HEARTBEAT_MS = 60000;
  const ONLINE_WINDOW_MS = 130000;
  const STATUS_POLL_MS = 20000;
  const INVITE_FRESH_MS = 120000;
  const MAX_FRIENDS = 100;

  const state = {
    uid: null,
    friends: [], // [{uid, name, since}]
    incoming: [], // [{id, from, fromName}]
    outgoing: [], // [{id, to, toName}]
    invites: [], // [{from, fromName, roomCode, createdMs}]
    status: {}, // uid -> {name, lastSeenMs, activity}
    tab: "friends", // friends | requests | add
    searchResults: null,
    searchMsg: "",
    removeArmed: null,
    inviteFor: null, // friend uid whose wager picker is open
    inviteBet: { amount: 0, currency: "coins" },
    error: null,
    unsubs: [],
    heartbeat: null,
    poll: null,
    shownInvites: {},
  };

  /* ---------- small helpers ---------- */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* Deterministic 9-digit Trainer ID from the uid (cyrb53 hash). */
  function shortIdFor(uid) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;

    for (let i = 0; i < uid.length; i++) {
      const ch = uid.charCodeAt(i);

      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    const n = (4294967296 * (2097151 & h2) + (h1 >>> 0)) % 1000000000;

    return String(n).padStart(9, "0");
  }

  function colorFor(str) {
    let h = 0;

    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;

    return "hsl(" + h + ", 55%, 42%)";
  }

  function toMs(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts === "number") return ts;

    return 0;
  }

  function myName() {
    try {
      return String(myTrainerDisplayName() || "Trainer").slice(0, 24);
    } catch (e) {
      return "Trainer";
    }
  }

  function ready() {
    return !!(fbAuth && fbAuth.currentUser && fbDb);
  }

  function statusOf(uid) {
    const s = state.status[uid];

    if (!s || !s.lastSeenMs) return { kind: "offline", text: "Offline" };

    const age = Date.now() - s.lastSeenMs;

    if (age < ONLINE_WINDOW_MS) {
      return s.activity === "battle"
        ? { kind: "battle", text: "In a battle" }
        : { kind: "online", text: "Online" };
    }

    const mins = Math.floor(age / 60000);
    const text =
      mins < 60
        ? "Last seen " + Math.max(1, mins) + "m ago"
        : mins < 1440
          ? "Last seen " + Math.floor(mins / 60) + "h ago"
          : "Last seen " + Math.floor(mins / 1440) + "d ago";

    return { kind: "offline", text: text };
  }

  /* The wagers the game offers (same list as the online modal). */
  const WAGERS = [
    { amount: 0, currency: "coins", label: "No bet" },
    { amount: 50, currency: "coins", label: "🥮 50" },
    { amount: 150, currency: "coins", label: "🥮 150" },
    { amount: 5, currency: "gems", label: "💎 5" },
    { amount: 15, currency: "gems", label: "💎 15" },
  ];

  function canCover(w) {
    if (!w.amount) return true;

    const have = w.currency === "gems" ? gems : coins;

    return have >= w.amount;
  }

  function wagerText(b) {
    return b && b.amount
      ? b.amount + " " + b.currency + " — winner takes " + b.amount * 2
      : "No wager";
  }

  function isFriend(uid) {
    return state.friends.some((f) => f.uid === uid);
  }

  /* ---------- my public profile + heartbeat ---------- */

  async function writeProfile() {
    if (!ready() || document.visibilityState === "hidden") return;

    const uid = fbAuth.currentUser.uid;
    const name = myName();

    try {
      await fbDb
        .collection("profiles")
        .doc(uid)
        .set(
          {
            uid: uid,
            name: name,
            nameLower: name.toLowerCase(),
            shortId: shortIdFor(uid),
            activity:
              typeof onlineMatch !== "undefined" && onlineMatch && onlineMatch.active
                ? "battle"
                : "menu",
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    } catch (e) {
      console.warn("[friends] profile write failed:", e && e.message);
    }
  }

  /* ---------- listeners ---------- */

  function start(uid) {
    if (state.uid === uid) return;

    stop();

    state.uid = uid;
    state.error = null;

    writeProfile();

    state.heartbeat = setInterval(writeProfile, HEARTBEAT_MS);

    document.addEventListener("visibilitychange", onVisibility);

    const onErr = (label) => (err) => {
      console.warn("[friends] " + label + " listener failed:", err && err.message);

      state.error = err && err.code ? err.code : "error";

      render();
    };

    state.unsubs.push(
      fbDb
        .collection("friends")
        .doc(uid)
        .collection("list")
        .onSnapshot((snap) => {
          state.friends = snap.docs.map((d) => {
            const x = d.data() || {};

            return { uid: d.id, name: x.name || "Trainer", since: toMs(x.since) };
          });

          pollStatuses();
          render();
          updateBadge();
        }, onErr("friends")),
    );

    state.unsubs.push(
      fbDb
        .collection("friendRequests")
        .where("to", "==", uid)
        .onSnapshot((snap) => {
          state.incoming = snap.docs.map((d) => ({
            id: d.id,
            from: d.data().from,
            fromName: d.data().fromName || "Trainer",
          }));

          render();
          updateBadge();
        }, onErr("incoming")),
    );

    state.unsubs.push(
      fbDb
        .collection("friendRequests")
        .where("from", "==", uid)
        .onSnapshot((snap) => {
          state.outgoing = snap.docs.map((d) => ({
            id: d.id,
            to: d.data().to,
            toName: d.data().toName || "Trainer",
          }));

          render();
        }, onErr("outgoing")),
    );

    state.unsubs.push(
      fbDb
        .collection("invites")
        .doc(uid)
        .collection("items")
        .onSnapshot((snap) => {
          state.invites = snap.docs.map((d) => {
            const x = d.data() || {};

            return {
              from: d.id,
              fromName: x.fromName || "A friend",
              roomCode: x.roomCode,
              createdMs: toMs(x.createdAt),
            };
          });

          showNextInvite();
          updateBadge();
        }, onErr("invites")),
    );
  }

  function stop() {
    state.unsubs.forEach((u) => {
      try {
        u();
      } catch (e) {
        /* Already detached. */
      }
    });

    state.unsubs = [];

    if (state.heartbeat) clearInterval(state.heartbeat);
    if (state.poll) clearInterval(state.poll);

    state.heartbeat = null;
    state.poll = null;
    state.uid = null;
    state.friends = [];
    state.incoming = [];
    state.outgoing = [];
    state.invites = [];

    document.removeEventListener("visibilitychange", onVisibility);

    updateBadge();
  }

  function onVisibility() {
    if (document.visibilityState === "visible") writeProfile();
  }

  /* Reads each friend's profile (online status). Firestore's "in"
     queries take 10 ids at a time. */
  async function pollStatuses() {
    if (!ready() || !state.friends.length) {
      updateBadge();
      return;
    }

    const ids = state.friends.map((f) => f.uid);

    try {
      for (let i = 0; i < ids.length; i += 10) {
        const chunk = ids.slice(i, i + 10);

        const snap = await fbDb
          .collection("profiles")
          .where(firebase.firestore.FieldPath.documentId(), "in", chunk)
          .get();

        snap.docs.forEach((d) => {
          const x = d.data() || {};

          state.status[d.id] = {
            name: x.name,
            lastSeenMs: toMs(x.lastSeen),
            activity: x.activity,
          };
        });
      }
    } catch (e) {
      console.warn("[friends] status poll failed:", e && e.message);
    }

    render();
    updateBadge();
  }

  /* ---------- top-bar button badge ---------- */

  function freshInvites() {
    return state.invites.filter(
      (i) => i.createdMs && Date.now() - i.createdMs < INVITE_FRESH_MS && i.roomCode,
    );
  }

  function updateBadge() {
    const online = state.friends.filter((f) => statusOf(f.uid).kind !== "offline").length;
    const count = document.getElementById("friends-online-count");
    const badge = document.getElementById("friends-badge");

    if (count) count.textContent = String(online);

    const pending = state.incoming.length + freshInvites().length;

    if (badge) {
      badge.textContent = String(pending);
      badge.classList.toggle("hidden", pending === 0);
    }
  }

  /* ---------- actions ---------- */

  async function sendRequest(target) {
    if (!ready()) return;

    const me = fbAuth.currentUser.uid;

    if (target.uid === me) {
      toast("That's you!", "You can't add yourself.");
      return;
    }

    if (isFriend(target.uid)) {
      toast("Already friends", target.name);
      return;
    }

    if (state.friends.length >= MAX_FRIENDS) {
      toast("Friend list full", "You can have up to " + MAX_FRIENDS + " friends.");
      return;
    }

    /* They already asked me — adding them back just accepts. */
    const theirs = state.incoming.find((r) => r.from === target.uid);

    if (theirs) {
      await acceptRequest(theirs);
      return;
    }

    try {
      await fbDb
        .collection("friendRequests")
        .doc(me + "_" + target.uid)
        .set({
          from: me,
          to: target.uid,
          fromName: myName(),
          toName: target.name,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      toast("Request sent", "Waiting for " + target.name + " to accept.", "success");
    } catch (e) {
      toast("Couldn't send request", e.message || "Try again.", "error");
    }
  }

  async function acceptRequest(req) {
    if (!ready()) return;

    const me = fbAuth.currentUser.uid;

    if (state.friends.length >= MAX_FRIENDS) {
      toast("Friend list full", "Remove a friend first.", "error");
      return;
    }

    try {
      const batch = fbDb.batch();
      const now = firebase.firestore.FieldValue.serverTimestamp();

      batch.set(fbDb.collection("friends").doc(me).collection("list").doc(req.from), {
        uid: req.from,
        name: req.fromName,
        since: now,
      });

      batch.set(fbDb.collection("friends").doc(req.from).collection("list").doc(me), {
        uid: me,
        name: myName(),
        since: now,
      });

      batch.delete(fbDb.collection("friendRequests").doc(req.id));

      await batch.commit();

      toast("Friend added", req.fromName + " is now your friend.", "success");
    } catch (e) {
      toast("Couldn't accept", e.message || "Try again.", "error");
    }
  }

  async function declineRequest(id) {
    try {
      await fbDb.collection("friendRequests").doc(id).delete();
    } catch (e) {
      toast("Couldn't update the request", e.message || "Try again.", "error");
    }
  }

  async function removeFriend(friendUid) {
    if (!ready()) return;

    const me = fbAuth.currentUser.uid;

    try {
      const batch = fbDb.batch();

      batch.delete(fbDb.collection("friends").doc(me).collection("list").doc(friendUid));
      batch.delete(fbDb.collection("friends").doc(friendUid).collection("list").doc(me));

      await batch.commit();
    } catch (e) {
      toast("Couldn't remove friend", e.message || "Try again.", "error");
    }
  }

  async function search(query) {
    const q = String(query || "").trim();

    state.searchResults = null;
    state.searchMsg = "";

    if (!q) {
      state.searchMsg = "Type a trainer name or a 9-digit Trainer ID.";
      render();
      return;
    }

    if (!ready()) return;

    state.searchMsg = "Searching…";
    render();

    try {
      let snap;

      if (/^\d{6,10}$/.test(q)) {
        snap = await fbDb.collection("profiles").where("shortId", "==", q).limit(5).get();
      } else {
        snap = await fbDb
          .collection("profiles")
          .where("nameLower", "==", q.toLowerCase())
          .limit(5)
          .get();
      }

      state.searchResults = snap.docs.map((d) => {
        const x = d.data() || {};

        return { uid: d.id, name: x.name || "Trainer", shortId: x.shortId || "" };
      });

      state.searchMsg = state.searchResults.length
        ? ""
        : "No trainer found. Check the spelling — names must match exactly.";
    } catch (e) {
      state.searchMsg = "Search failed: " + (e.message || "try again.");
    }

    render();
  }

  /* Opens a private room and sends the friend an invite to it. */
  function inviteFriend(friend, bet) {
    if (!ready()) return;

    bet = bet || { amount: 0, currency: "coins" };

    if (!canCover(bet)) {
      toast("Can't cover that wager", "Pick a smaller one.", "error");
      return;
    }

    if (typeof onlineMatch !== "undefined" && (onlineMatch.active || onlineMatch.ws)) {
      toast("Already in a match", "Finish it before inviting someone.");
      return;
    }

    closePanel();

    state.inviteFor = null;

    pendingInvite = { uid: friend.uid, name: friend.name, bet: bet };

    openOnlineModal();

    /* Use the online modal's own wager chips so the highlight and
       selectedBet stay in sync with what the room is created with. */
    const chip = document.querySelector(
      '.online-bet-chip[data-amount="' + bet.amount + '"][data-currency="' + bet.currency + '"]',
    );

    if (chip) {
      chip.click();
    } else if (typeof selectedBet !== "undefined") {
      selectedBet = { amount: bet.amount, currency: bet.currency };
    }

    createFriendRoom();
  }

  let pendingInvite = null;

  /* createFriendRoom (app.js) calls this once the private room
     exists, with its code. */
  window.onFriendRoomCreated = async function (code) {
    if (!pendingInvite || !ready()) return;

    const target = pendingInvite;

    pendingInvite = null;

    const me = fbAuth.currentUser.uid;

    try {
      await fbDb
        .collection("invites")
        .doc(target.uid)
        .collection("items")
        .doc(me)
        .set({
          from: me,
          fromName: myName(),
          roomCode: code,
          betAmount: target.bet ? target.bet.amount : 0,
          betCurrency: target.bet ? target.bet.currency : "coins",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      toast(
        "Invite sent",
        target.name + " • " + wagerText(target.bet) + " • code " + code,
        "success",
      );
    } catch (e) {
      toast("Couldn't send invite", e.message || "Share the room code instead.", "error");
    }
  };

  /* ---------- incoming battle invites ---------- */

  let showingInvite = false;

  async function showNextInvite() {
    if (showingInvite) return;

    const next = freshInvites().find((i) => !state.shownInvites[i.from + "_" + i.roomCode]);

    if (!next || !ready()) return;

    state.shownInvites[next.from + "_" + next.roomCode] = true;

    const dropInvite = () =>
      fbDb
        .collection("invites")
        .doc(state.uid)
        .collection("items")
        .doc(next.from)
        .delete()
        .catch(() => {});

    /* Read the wager from the ROOM itself (what you'd really be
       paying), not from the invite text, so it can't be misleading.
       A room that's gone or already taken makes the invite stale. */
    let bet = { amount: 0, currency: "coins" };

    showingInvite = true;

    try {
      const snap = await fbDb.collection("rooms").doc(next.roomCode).get();
      const room = snap.exists ? snap.data() : null;

      if (!room || room.status !== "waiting" || room.guestUid || room.hostUid !== next.from) {
        dropInvite();
        showingInvite = false;
        showNextInvite();
        return;
      }

      bet = sanitizeBet(room.betAmount, room.betCurrency);
    } catch (e) {
      showingInvite = false;
      return;
    }

    const old = document.getElementById("friend-invite-popup");

    if (old) old.remove();

    const el = document.createElement("div");

    el.id = "friend-invite-popup";
    el.className = "friend-invite-popup";

    el.innerHTML =
      "<b>⚔ " +
      esc(next.fromName) +
      " invited you to a battle</b>" +
      "<span>Private room " +
      esc(next.roomCode) +
      "</span>" +
      '<span class="invite-wager' +
      (bet.amount ? " has-bet" : "") +
      '">Wager: ' +
      esc(wagerText(bet)) +
      "</span>" +
      '<div class="friend-actions">' +
      '<button type="button" class="catch-btn primary" data-act="yes">Accept</button>' +
      '<button type="button" class="catch-btn" data-act="no">Decline</button>' +
      "</div>";

    document.body.appendChild(el);

    const finish = () => {
      el.remove();
      showingInvite = false;
      dropInvite();
    };

    el.querySelector('[data-act="no"]').onclick = finish;

    el.querySelector('[data-act="yes"]').onclick = () => {
      if (typeof onlineMatch !== "undefined" && (onlineMatch.active || onlineMatch.ws)) {
        toast("Already in a match", "Finish it first.");
        return;
      }

      /* You pay your share too — check before joining. canAffordBet
         explains what's missing if you can't. */
      if (bet.amount && !canAffordBet(bet)) {
        return;
      }

      finish();
      closePanel();

      openOnlineModal();
      joinFriendRoom(next.roomCode);
    };

    setTimeout(() => {
      if (el.isConnected) {
        el.remove();
        showingInvite = false;
      }
    }, INVITE_FRESH_MS);
  }

  /* ---------- the Friends panel ---------- */

  function toast(title, message, tone) {
    showToast({ icon: "👥", title: title, message: message || "", tone: tone || "" });
  }

  function panelEl() {
    let el = document.getElementById("friends-modal");

    if (!el) {
      el = document.createElement("div");
      el.id = "friends-modal";
      el.className = "catch-modal hidden";

      document.body.appendChild(el);
    }

    return el;
  }

  function openPanel() {
    if (!ready()) {
      toast("Sign in required", "Friends need your Google sign-in to be ready.", "error");
      return;
    }

    start(fbAuth.currentUser.uid);

    state.tab = "friends";
    state.removeArmed = null;

    panelEl().classList.remove("hidden");

    render();

    pollStatuses();

    if (state.poll) clearInterval(state.poll);

    state.poll = setInterval(pollStatuses, STATUS_POLL_MS);
  }

  function closePanel() {
    const el = panelEl();

    el.classList.add("hidden");

    if (state.poll) {
      clearInterval(state.poll);
      state.poll = null;
    }
  }

  function render() {
    const el = document.getElementById("friends-modal");

    if (!el || el.classList.contains("hidden")) return;

    const me = ready() ? fbAuth.currentUser.uid : "";

    const tabBtn = (id, label, n) =>
      '<button type="button" class="friends-tab' +
      (state.tab === id ? " active" : "") +
      '" data-tab="' +
      id +
      '">' +
      label +
      (n ? ' <i class="friends-count">' + n + "</i>" : "") +
      "</button>";

    let body = "";

    if (state.error === "permission-denied") {
      body =
        '<div class="friends-empty">Friends aren\'t set up on the server yet. ' +
        "Publish the latest <b>firestore.rules</b> in Firebase and reload.</div>";
    } else if (state.tab === "friends") {
      body = renderFriends();
    } else if (state.tab === "requests") {
      body = renderRequests();
    } else {
      body = renderAdd(me);
    }

    el.innerHTML =
      '<div class="catch-card friends-card">' +
      '<div class="catch-top"><span>FRIENDS</span>' +
      '<button type="button" class="friends-close" data-act="close" aria-label="Close">✕</button></div>' +
      '<div class="friends-tabs">' +
      tabBtn("friends", "Friends", state.friends.length) +
      tabBtn("requests", "Requests", state.incoming.length) +
      tabBtn("add", "Add") +
      "</div>" +
      '<div class="friends-body">' +
      body +
      "</div></div>";

    wire(el);
  }

  function renderFriends() {
    if (!state.friends.length) {
      return (
        '<div class="friends-empty">No friends yet. Open the <b>Add</b> tab and search ' +
        "for a trainer by name or Trainer ID.</div>"
      );
    }

    const order = { battle: 0, online: 0, offline: 1 };

    const rows = state.friends
      .map((f) => {
        const st = statusOf(f.uid);
        const known = state.status[f.uid];

        return { f: f, st: st, name: (known && known.name) || f.name };
      })
      .sort(
        (a, b) =>
          order[a.st.kind] - order[b.st.kind] || a.name.localeCompare(b.name),
      );

    return rows
      .map((r) => {
        const armed = state.removeArmed === r.f.uid;

        return (
          '<div class="friend-row">' +
          '<div class="friend-avatar" style="background:' +
          colorFor(r.name) +
          '">' +
          esc(r.name.charAt(0).toUpperCase()) +
          '<i class="friend-dot ' +
          r.st.kind +
          '"></i></div>' +
          '<div class="friend-info"><b>' +
          esc(r.name) +
          "</b><small class=\"friend-status " +
          r.st.kind +
          '">' +
          esc(r.st.text) +
          "</small></div>" +
          '<div class="friend-btns">' +
          '<button type="button" class="friend-btn" data-act="invite" data-uid="' +
          esc(r.f.uid) +
          '"' +
          (r.st.kind === "offline" ? ' disabled title="They need to be online"' : "") +
          ">⚔ Invite</button>" +
          '<button type="button" class="friend-btn danger" data-act="remove" data-uid="' +
          esc(r.f.uid) +
          '">' +
          (armed ? "Sure?" : "✕") +
          "</button></div></div>" +
          (state.inviteFor === r.f.uid ? renderInvitePicker(r.f) : "")
        );
      })
      .join("");
  }

  /* Wager choice shown under a friend when you tap ⚔ Invite. */
  function renderInvitePicker(f) {
    const chips = WAGERS.map((w) => {
      const on =
        state.inviteBet.amount === w.amount && state.inviteBet.currency === w.currency;
      const afford = canCover(w);

      return (
        '<button type="button" class="invite-chip' +
        (on ? " active" : "") +
        '" data-act="pickbet" data-amount="' +
        w.amount +
        '" data-currency="' +
        w.currency +
        '"' +
        (afford ? "" : ' disabled title="Not enough to cover this"') +
        ">" +
        esc(w.label) +
        "</button>"
      );
    }).join("");

    return (
      '<div class="invite-picker">' +
      "<small>Choose a wager for this match with " +
      esc(f.name) +
      " — they see it before accepting. " +
      "Both of you pay the stake, the winner takes the pot.</small>" +
      '<div class="invite-chips">' +
      chips +
      "</div>" +
      '<div class="invite-send"><span>' +
      esc(wagerText(state.inviteBet)) +
      '</span><button type="button" class="friend-btn good" data-act="sendinvite" data-uid="' +
      esc(f.uid) +
      '">Send invite</button></div></div>'
    );
  }

  function renderRequests() {
    let html = "";

    if (state.incoming.length) {
      html += '<div class="friends-section">RECEIVED</div>';

      html += state.incoming
        .map(
          (r) =>
            '<div class="friend-row">' +
            '<div class="friend-avatar" style="background:' +
            colorFor(r.fromName) +
            '">' +
            esc(r.fromName.charAt(0).toUpperCase()) +
            "</div>" +
            '<div class="friend-info"><b>' +
            esc(r.fromName) +
            "</b><small>wants to be your friend</small></div>" +
            '<div class="friend-btns">' +
            '<button type="button" class="friend-btn good" data-act="accept" data-id="' +
            esc(r.id) +
            '">✔ Accept</button>' +
            '<button type="button" class="friend-btn danger" data-act="decline" data-id="' +
            esc(r.id) +
            '">✕</button></div></div>',
        )
        .join("");
    }

    if (state.outgoing.length) {
      html += '<div class="friends-section">SENT</div>';

      html += state.outgoing
        .map(
          (r) =>
            '<div class="friend-row">' +
            '<div class="friend-avatar" style="background:' +
            colorFor(r.toName) +
            '">' +
            esc(r.toName.charAt(0).toUpperCase()) +
            "</div>" +
            '<div class="friend-info"><b>' +
            esc(r.toName) +
            "</b><small>Waiting for a reply…</small></div>" +
            '<div class="friend-btns">' +
            '<button type="button" class="friend-btn" data-act="decline" data-id="' +
            esc(r.id) +
            '">Cancel</button></div></div>',
        )
        .join("");
    }

    return html || '<div class="friends-empty">No pending requests.</div>';
  }

  function renderAdd(me) {
    const myId = me ? shortIdFor(me) : "";

    let results = "";

    if (state.searchResults) {
      results = state.searchResults
        .map((r) => {
          let action;

          if (r.uid === me) {
            action = '<span class="friend-note">That\'s you</span>';
          } else if (isFriend(r.uid)) {
            action = '<span class="friend-note">Friends ✓</span>';
          } else if (state.outgoing.some((o) => o.to === r.uid)) {
            action = '<span class="friend-note">Requested</span>';
          } else {
            action =
              '<button type="button" class="friend-btn good" data-act="add" data-uid="' +
              esc(r.uid) +
              '" data-name="' +
              esc(r.name) +
              '">+ Add</button>';
          }

          return (
            '<div class="friend-row">' +
            '<div class="friend-avatar" style="background:' +
            colorFor(r.name) +
            '">' +
            esc(r.name.charAt(0).toUpperCase()) +
            "</div>" +
            '<div class="friend-info"><b>' +
            esc(r.name) +
            "</b><small>ID " +
            esc(r.shortId) +
            "</small></div>" +
            '<div class="friend-btns">' +
            action +
            "</div></div>"
          );
        })
        .join("");
    }

    return (
      '<div class="friends-myid">Your Trainer ID: <b id="friends-myid">' +
      esc(myId) +
      '</b> <button type="button" class="friend-btn" data-act="copyid">Copy</button></div>' +
      '<div class="friends-search">' +
      '<input id="friends-search-input" type="text" maxlength="24" ' +
      'placeholder="Trainer name or ID" autocomplete="off" />' +
      '<button type="button" class="friend-btn good" data-act="search">Search</button>' +
      "</div>" +
      (state.searchMsg ? '<div class="friends-empty">' + esc(state.searchMsg) + "</div>" : "") +
      results
    );
  }

  function wire(el) {
    el.querySelectorAll("[data-tab]").forEach((b) => {
      b.onclick = () => {
        state.tab = b.dataset.tab;
        state.removeArmed = null;
        render();
      };
    });

    el.querySelectorAll("[data-act]").forEach((b) => {
      b.onclick = () => handleAct(b);
    });

    const input = el.querySelector("#friends-search-input");

    if (input) {
      input.onkeydown = (e) => {
        if (e.key === "Enter") search(input.value);
      };

      /* Keep what was typed when the panel re-renders. */
      if (state._lastQuery) input.value = state._lastQuery;

      input.oninput = () => {
        state._lastQuery = input.value;
      };
    }
  }

  function handleAct(b) {
    const act = b.dataset.act;

    if (act === "close") return closePanel();

    if (act === "search") {
      const input = document.getElementById("friends-search-input");

      state._lastQuery = input ? input.value : "";

      return search(state._lastQuery);
    }

    if (act === "copyid") {
      const id = (document.getElementById("friends-myid") || {}).textContent || "";

      try {
        navigator.clipboard.writeText(id);
        toast("Copied", "Your Trainer ID is " + id + ".", "success");
      } catch (e) {
        toast("Your Trainer ID", id);
      }

      return;
    }

    if (act === "add") {
      return sendRequest({ uid: b.dataset.uid, name: b.dataset.name });
    }

    if (act === "accept") {
      const req = state.incoming.find((r) => r.id === b.dataset.id);

      return req && acceptRequest(req);
    }

    if (act === "decline") return declineRequest(b.dataset.id);

    if (act === "invite") {
      const uid = b.dataset.uid;

      state.inviteFor = state.inviteFor === uid ? null : uid;
      state.inviteBet = { amount: 0, currency: "coins" };

      return render();
    }

    if (act === "pickbet") {
      state.inviteBet = {
        amount: Number(b.dataset.amount),
        currency: b.dataset.currency === "gems" ? "gems" : "coins",
      };

      return render();
    }

    if (act === "sendinvite") {
      const f = state.friends.find((x) => x.uid === b.dataset.uid);

      return f && inviteFriend(f, state.inviteBet);
    }

    if (act === "remove") {
      const uid = b.dataset.uid;

      if (state.removeArmed === uid) {
        state.removeArmed = null;
        removeFriend(uid);
      } else {
        state.removeArmed = uid;
        render();

        setTimeout(() => {
          if (state.removeArmed === uid) {
            state.removeArmed = null;
            render();
          }
        }, 3000);
      }
    }
  }

  /* ---------- boot ---------- */

  function boot() {
    const btn = document.getElementById("btn-friends");

    if (btn) btn.onclick = openPanel;

    if (fbAuth && fbAuth.onAuthStateChanged) {
      fbAuth.onAuthStateChanged((user) => {
        if (user) start(user.uid);
        else stop();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* Exposed for tests and debugging. */
  window.PokemonFriends = { shortIdFor: shortIdFor, open: openPanel, close: closePanel };
})();
