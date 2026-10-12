"use strict";

/*
============================================================
 POKÉMON FIGHTER
 GAME.JS
 UNIVERSAL BATTLE ENGINE
============================================================

 FEATURES

 - Works with Pokémon loaded dynamically from PokéAPI
 - Uses exact Pokémon selected on Home
 - No hard-coded Gengar
 - Pokémon-specific attacks
 - Pokémon-specific move names
 - Fast P2 AI
 - Player and enemy always face each other
 - Jump
 - Move
 - Dodge
 - Block
 - Attack
 - Projectiles
 - Particles
 - VFX
 - Hit effects
 - Attack animation
 - Idle animation
 - Jump animation
 - Damage numbers
 - Combo
 - Screen shake
 - One requestAnimationFrame loop
============================================================
*/

/* ============================================================
   CONFIG
============================================================ */

const GAME = {
  width: 1200,
  height: 650,

  ground: 505,

  gravity: 1.18,
  jumpPower: -19,

  playerSpeed: 6.2,
  enemySpeed: 5.7,

  maxHP: 100,

  minDistance: 115,

  attackCooldown: 430,
  attackDuration: 270,
  attackHitFrame: 155,

  maxParticles: 60,
  maxProjectiles: 10,
  maxEffects: 30,
  maxFloatingTexts: 10,

  playerStartX: 300,
  enemyStartX: 900,
};

/* ============================================================
   TYPE MOVE DATA
============================================================ */

const TYPE_MOVES = {
  normal: {
    name: "Quick Attack",
    type: "normal",
    damage: 16,
    range: 260,
    projectile: true,
    color: "#f1f1df",
    speed: 14,
  },

  fire: {
    name: "Flamethrower",
    type: "fire",
    damage: 20,
    range: 270,
    projectile: true,
    color: "#ff6a22",
    speed: 12,
  },

  water: {
    name: "Water Pulse",
    type: "water",
    damage: 18,
    range: 280,
    projectile: true,
    color: "#42b9ff",
    speed: 13,
  },

  electric: {
    name: "Thunderbolt",
    type: "electric",
    damage: 20,
    range: 300,
    projectile: true,
    color: "#ffe34a",
    speed: 15,
  },

  grass: {
    name: "Vine Whip",
    type: "grass",
    damage: 18,
    range: 260,
    projectile: true,
    color: "#62db65",
    speed: 12,
  },

  ice: {
    name: "Ice Beam",
    type: "ice",
    damage: 21,
    range: 330,
    projectile: true,
    color: "#8eeaff",
    speed: 17,
  },

  fighting: {
    name: "Aura Strike",
    type: "fighting",
    damage: 22,
    range: 250,
    projectile: true,
    color: "#62b7ff",
    speed: 13,
  },

  poison: {
    name: "Poison Burst",
    type: "poison",
    damage: 18,
    range: 270,
    projectile: true,
    color: "#bd68e8",
    speed: 11,
  },

  ground: {
    name: "Earth Power",
    type: "ground",
    damage: 21,
    range: 260,
    projectile: true,
    color: "#c99b61",
    speed: 10,
  },

  flying: {
    name: "Air Slash",
    type: "flying",
    damage: 18,
    range: 290,
    projectile: true,
    color: "#b7e4ff",
    speed: 14,
  },

  psychic: {
    name: "Psychic",
    type: "psychic",
    damage: 22,
    range: 310,
    projectile: true,
    color: "#ff78d5",
    speed: 12,
  },

  bug: {
    name: "Bug Buzz",
    type: "bug",
    damage: 18,
    range: 290,
    projectile: true,
    color: "#a9d63d",
    speed: 13,
  },

  rock: {
    name: "Rock Throw",
    type: "rock",
    damage: 21,
    range: 290,
    projectile: true,
    color: "#b9a27d",
    speed: 9,
  },

  ghost: {
    name: "Shadow Ball",
    type: "ghost",
    damage: 21,
    range: 310,
    projectile: true,
    color: "#a75bea",
    speed: 11,
  },

  dragon: {
    name: "Dragon Pulse",
    type: "dragon",
    damage: 23,
    range: 320,
    projectile: true,
    color: "#7786ff",
    speed: 13,
  },

  dark: {
    name: "Dark Pulse",
    type: "dark",
    damage: 22,
    range: 300,
    projectile: true,
    color: "#77667c",
    speed: 12,
  },

  steel: {
    name: "Metal Burst",
    type: "steel",
    damage: 21,
    range: 260,
    projectile: true,
    color: "#b8c8d8",
    speed: 12,
  },

  fairy: {
    name: "Fairy Wind",
    type: "fairy",
    damage: 20,
    range: 290,
    projectile: true,
    color: "#ff9dd7",
    speed: 12,
  },
};

/* ============================================================
   TYPE EFFECTIVENESS

   The standard Pokémon type chart — attacker type -> defender
   type -> damage multiplier (2 = super effective, 0.5 = not very
   effective, 0 = no effect). Anything not listed for a given
   attacking type is a normal (1x) hit. Applied in hitTarget() to
   whatever move actually lands, using the move's type and the
   target's own Pokémon type(s) — a move can be resisted by one of
   a dual-type Pokémon's types and be super effective against the
   other; both multipliers apply.
============================================================ */

const TYPE_EFFECTIVENESS = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
    steel: 2,
  },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: {
    water: 2,
    electric: 0.5,
    grass: 0.5,
    ground: 0,
    flying: 2,
    dragon: 0.5,
  },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 0.5,
    ground: 2,
    flying: 2,
    dragon: 2,
    steel: 0.5,
  },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: {
    grass: 2,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
    fairy: 2,
  },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2,
  },
  flying: {
    electric: 0.5,
    grass: 2,
    fighting: 2,
    bug: 2,
    rock: 0.5,
    steel: 0.5,
  },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: {
    fire: 2,
    ice: 2,
    fighting: 0.5,
    ground: 0.5,
    flying: 2,
    bug: 2,
    steel: 0.5,
  },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2,
    rock: 2,
    steel: 0.5,
    fairy: 2,
  },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

/* Every type a Pokémon has, lower-cased ("fire", "flying", ...),
   from either a normalized `{ types: [...] }` array or the raw
   PokéAPI shape (`{ type: { name } }` entries). */
function getPokemonTypes(pokemon) {
  if (!pokemon || !Array.isArray(pokemon.types)) {
    return ["normal"];
  }

  const list = pokemon.types
    .map(function (t) {
      if (t && t.type && t.type.name) return t.type.name;
      if (t && t.name) return t.name;
      if (typeof t === "string") return t;
      return null;
    })
    .filter(Boolean);

  return list.length ? list : ["normal"];
}

/* Combined multiplier of `moveType` against every type the
   defending Pokémon has — 4x/quadruple weaknesses and 0x immunities
   both fall out of this naturally since each of the defender's
   types is looked up and multiplied together. */
function typeEffectivenessMultiplier(moveType, defenderPokemon) {
  const chart = TYPE_EFFECTIVENESS[moveType];

  if (!chart) return 1;

  return getPokemonTypes(defenderPokemon).reduce(function (mult, defType) {
    const factor = chart[defType];

    return typeof factor === "number" ? mult * factor : mult;
  }, 1);
}

/* ============================================================
   LEGENDARY / MYTHICAL POKÉMON

   A curated set of species that hit noticeably harder and shrug
   off noticeably more damage than an ordinary Pokémon — Mew,
   Mewtwo, the box legendaries, etc. There's no separate "max HP"
   number anywhere in this engine (every fighter's health bar is
   just a 0-100 gauge), so the way to make one of these feel like
   it has way more effective HP is to have it simply take less
   damage per hit; scaling its outgoing damage up the same way
   makes it hit as hard as it survives. Both numbers apply in
   hitTarget() below, using whichever side (attacker/defender) the
   Pokémon is on for that hit.
============================================================ */

const LEGENDARY_DAMAGE_TAKEN_MULT = 0.55; // takes ~45% less damage
const LEGENDARY_DAMAGE_DEALT_MULT = 1.65; // deals ~65% more damage

const LEGENDARY_POKEMON = new Set(
  [
    "mew",
    "mewtwo",
    "articuno",
    "zapdos",
    "moltres",
    "raikou",
    "entei",
    "suicune",
    "lugia",
    "ho-oh",
    "celebi",
    "regirock",
    "regice",
    "registeel",
    "latias",
    "latios",
    "kyogre",
    "groudon",
    "rayquaza",
    "jirachi",
    "deoxys",
    "uxie",
    "mesprit",
    "azelf",
    "dialga",
    "palkia",
    "giratina",
    "giratina-altered",
    "giratina-origin",
    "heatran",
    "regigigas",
    "cresselia",
    "phione",
    "manaphy",
    "darkrai",
    "shaymin",
    "shaymin-land",
    "shaymin-sky",
    "arceus",
    "victini",
    "cobalion",
    "terrakion",
    "virizion",
    "tornadus",
    "thundurus",
    "landorus",
    "reshiram",
    "zekrom",
    "kyurem",
    "keldeo",
    "meloetta",
    "genesect",
    "xerneas",
    "yveltal",
    "zygarde",
    "diancie",
    "hoopa",
    "volcanion",
    "type-null",
    "silvally",
    "tapu-koko",
    "tapu-lele",
    "tapu-bulu",
    "tapu-fini",
    "cosmog",
    "cosmoem",
    "solgaleo",
    "lunala",
    "necrozma",
    "magearna",
    "marshadow",
    "zeraora",
    "meltan",
    "melmetal",
    "zacian",
    "zamazenta",
    "eternatus",
    "kubfu",
    "urshifu",
    "zarude",
    "regieleki",
    "regidrago",
    "glastrier",
    "spectrier",
    "calyrex",
    "enamorus",
    "wo-chien",
    "chien-pao",
    "ting-lu",
    "chi-yu",
    "koraidon",
    "miraidon",
    "ogerpon",
    "terapagos",
    "pecharunt",
  ].map(cleanPokemonName),
);

/* PokéAPI default-form names carry a form suffix (landorus-incarnate,
   deoxys-normal, keldeo-ordinary, zygarde-50 …). Strip it so those
   still count as legendary. Species whose real name contains a hyphen
   are matched whole first. */
function isLegendaryPokemon(pokemon) {
  if (!pokemon || !pokemon.name) return false;

  const full = cleanPokemonName(pokemon.name);

  if (LEGENDARY_POKEMON.has(full)) return true;

  const raw = String(pokemon.name).toLowerCase();

  // Hyphenated species: ho-oh, type-null, tapu-*, wo-chien, ...
  const parts = raw.split("-");

  for (let n = parts.length - 1; n >= 1; n--) {
    if (LEGENDARY_POKEMON.has(cleanPokemonName(parts.slice(0, n).join("-")))) {
      return true;
    }
  }

  return false;
}

/* ============================================================
   POKÉMON MOVE NAMES
============================================================ */

const POKEMON_MOVE_NAMES = {
  pikachu: "Thunderbolt",
  raichu: "Thunderbolt",

  charizard: "Flamethrower",
  charmeleon: "Flamethrower",
  charmander: "Ember",

  squirtle: "Water Pulse",
  wartortle: "Water Pulse",
  blastoise: "Hydro Pump",

  bulbasaur: "Vine Whip",
  ivysaur: "Vine Whip",
  venusaur: "Solar Beam",

  gengar: "Shadow Ball",

  mewtwo: "Psystrike",
  mew: "Psychic",

  lucario: "Aura Sphere",

  greninja: "Water Shuriken",

  gyarados: "Hydro Pump",

  dragonite: "Dragon Pulse",

  garchomp: "Dragon Claw",

  eevee: "Swift",

  jolteon: "Thunderbolt",

  flareon: "Flamethrower",

  vaporeon: "Water Pulse",

  sylveon: "Fairy Wind",

  cinderace: "Pyro Ball",

  incineroar: "Darkest Lariat",

  dragapult: "Shadow Ball",

  annihilape: "Rage Fist",
};

/* ============================================================
   ARTWORK ORIENTATION OVERRIDES
============================================================

Most official-artwork sprites face LEFT by default, which is
what the mirroring math in drawPokemonImage() assumes.

A handful of Pokémon are drawn in action poses that face
RIGHT instead (e.g. Blaziken's kicking pose). List those
here so they get mirrored the opposite way.

Add more names to this list as you spot them facing the
wrong way in-battle.
============================================================ */

const ARTWORK_FACES_RIGHT = new Set(["blaziken"]);

function getArtworkNaturalFacing(pokemon) {
  const name = cleanPokemonName(pokemon && pokemon.name);

  /*
  1  = artwork naturally faces RIGHT
  -1 = artwork naturally faces LEFT (default)
  */

  return ARTWORK_FACES_RIGHT.has(name) ? 1 : -1;
}

/* ============================================================
   MOVE TYPE OVERRIDES
============================================================ */

const MOVE_TYPE_OVERRIDE = {
  Thunderbolt: "electric",
  Flamethrower: "fire",
  Ember: "fire",

  HydroPump: "water",
  "Hydro Pump": "water",

  "Water Pulse": "water",
  "Water Shuriken": "water",

  "Vine Whip": "grass",
  "Solar Beam": "grass",

  "Shadow Ball": "ghost",

  Psystrike: "psychic",
  Psychic: "psychic",

  "Aura Sphere": "fighting",

  "Dragon Pulse": "dragon",
  "Dragon Claw": "dragon",

  Swift: "normal",

  "Fairy Wind": "fairy",

  "Pyro Ball": "fire",

  "Darkest Lariat": "dark",

  "Rage Fist": "ghost",
};

/* ============================================================
   STATE
============================================================ */

let playerPokemon = {
  id: 25,
  name: "pikachu",
  types: [],
};

let enemyPokemon = {
  id: 6,
  name: "charizard",
  types: [],
};

let playerMove = null;
let enemyMove = null;

/*
TEAM BATTLE STATE (6v6)

playerTeam / enemyTeam hold up to 6 normalized Pokémon each.
playerTeam[playerTeamIndex] / enemyTeam[enemyTeamIndex] is always
the Pokémon currently loaded into playerPokemon / enemyPokemon.
A single-Pokémon battle is just a team of length 1, so all the
old 1v1 code paths keep working unchanged.
*/

let playerTeam = [];
let enemyTeam = [];
let playerTeamIndex = 0;
let enemyTeamIndex = 0;

let canvas = null;
let ctx = null;

let gameRunning = false;
let animationId = null;
let lastTime = 0;

let battleEnded = false;
let screenShake = 0;

/* Set while a fainted Pokémon's KO pause (see beginKoPause) is
   running — both fighters are frozen (no movement, no attacks)
   until it clears. Local/AI and 2-player battles only; online
   battles are server-authoritative and don't run update() at
   all, so this has no effect there. */
let koPause = null;

let playerImage = null;
let enemyImage = null;

const imageCache = new Map();

const keys = Object.create(null);

/* Local 2-player mode: when true, the arrow-key side is driven by a
   second human on the same keyboard instead of the AI. */
let twoPlayerMode = false;

let particles = [];
let projectiles = [];
let effects = [];
let floatingTexts = [];

/* ============================================================
   FIGHTER CREATOR
============================================================ */

function createFighter(x, facing) {
  return {
    x: x,
    y: GAME.ground,

    vx: 0,
    vy: 0,

    hp: GAME.maxHP,

    /*
    IMPORTANT

    1 = face RIGHT
    -1 = face LEFT
    */

    facing: facing,

    jumping: false,

    attacking: false,
    blocking: false,
    dodging: false,
    invulnerable: false,

    attackTimer: 0,
    attackCooldown: 0,
    attackHit: false,

    hitTimer: 0,

    dodgeTimer: 0,

    combo: 0,
    comboTimer: 0,

    animationTime: 0,

    hitFlash: 0,

    aiThink: 0,
    aiAttackDelay: 0,
    aiBlockTimer: 0,

    /* Brief invulnerability window after a team switch-in. */
    swapTimer: 0,

    /* Cooldown that blocks switching again right after a switch. */
    switchLock: 0,
  };
}

/* ============================================================
   FIGHTERS
============================================================ */

const player = createFighter(GAME.playerStartX, 1);

const enemy = createFighter(GAME.enemyStartX, -1);

/* ============================================================
   UTILITIES
============================================================ */

/* ============================================================
   REAL-WORLD SIZE SCALE

   PokéAPI reports height in decimeters. We scale each Pokémon's
   on-screen size against a "reference" height so a Diglett looks
   tiny and an Onix looks enormous — always relative to whoever
   it's fighting, so the pair reads correctly no matter who else
   is on screen.
============================================================ */

const SIZE_REFERENCE_HEIGHT = 12; // ~1.2m, a roughly "average" Pokémon

function getSizeScale(pokemon) {
  const h =
    pokemon && typeof pokemon.height === "number" && pokemon.height > 0
      ? pokemon.height
      : SIZE_REFERENCE_HEIGHT;

  /* Square-root curve keeps huge height gaps (Wailord vs Joltik)
     dramatic but still playable — a straight linear scale would
     make tiny Pokémon nearly invisible and giants fill the screen. */

  const scale = Math.sqrt(h / SIZE_REFERENCE_HEIGHT);

  return clamp(scale, 0.52, 1.95);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function capitalize(value) {
  if (!value) {
    return "";
  }

  return (
    String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase()
  );
}

function cleanPokemonName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function formatPokemonName(name) {
  if (!name) {
    return "Pokémon";
  }

  return String(name)
    .split("-")
    .map(function (part) {
      return capitalize(part);
    })
    .join(" ");
}

/* Lowercase-hyphenated version of a display name, for the
   "trainer-pokemon" tag — same rule app.js's trainerNameSlug uses,
   duplicated here since game.js can't call an app.js function. */
function slugifyName(name) {
  const slug = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "trainer";
}

/* Online battles only: "trainer-pokemon" (e.g. "alex-charizard").
   Trainer names come from window.onlineTrainerNames — set by
   app.js's connectToMatch straight from the Firestore room doc it
   just used for matchmaking, NOT from the match server, since
   there's no guarantee the server passes an unrecognized "trainer"
   field on each Pokémon through unchanged. Falls back to the plain
   "Charizard" formatting for local/AI battles, or if the names
   genuinely aren't available yet (e.g. right at connection). */
/* Just the Pokémon's own name, in every mode including online —
   trainer names appear once, prominently, in the "TRAINER BATTLE!
   X VS Y" banner (see onlineBattleBannerText) instead of being
   prefixed onto every single name tag during the fight, which read
   as cluttered ("arman-jellicentmale" over the sprite, etc). */
function fighterLabel(pokemon) {
  return formatPokemonName(pokemon && pokemon.name);
}

/* ============================================================
   NORMALIZE POKÉMON
============================================================ */

function normalizePokemon(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "number") {
    return {
      id: value,
      name: "pokemon-" + value,
      types: [],
    };
  }

  if (typeof value === "string") {
    return {
      id: null,
      name: value,
      types: [],
    };
  }

  if (typeof value === "object") {
    return {
      id: Number(value.id) || null,

      name: value.name || "pokemon",

      types: Array.isArray(value.types) ? value.types : [],

      moves: Array.isArray(value.moves) ? value.moves : [],

      stats: Array.isArray(value.stats) ? value.stats : [],

      sprites: value.sprites || null,

      /* Real-world height in decimeters, straight from PokéAPI.
         Used to draw each Pokémon at its size relative to its
         opponent instead of everyone being the same size. */
      height: Number(value.height) || null,

      /* Weight in hectograms (PokéAPI) — used by the Heavy Ball. */
      weight: Number(value.weight) || null,

      /* The Poké Ball this Pokémon was caught in (an id from app.js's
         BALL_TYPES). Online teams carry it so BOTH trainers see each
         Pokémon come out of the right ball. */
      ballId:
        typeof value.ballId === "string"
          ? value.ballId
          : typeof value.ball === "string"
            ? value.ball
            : null,

      /* A real, PokéAPI-derived signature move (fetched by
         app.js's resolveBattleMove), when available. getMove()
         prefers this over the generic type-based fallback so
         every Pokémon — not just the ~30 in POKEMON_MOVE_NAMES —
         fights with its own real attack. */
      realMove: value.realMove || null,

      /* Online battles only: the slugified trainer name this
         Pokémon belongs to (e.g. "alex"), sent alongside the team
         so both players can see whose Pokémon is whose. Absent
         for local/AI battles. */
      trainer: typeof value.trainer === "string" ? value.trainer : null,

      /* Damage carried over from a previous battle (app.js seeds
         this from the captured Pokémon's saved HP). The various
         team-init spots below only fall back to a full heal when
         this ISN'T already a number, so a captured Pokémon that
         went into a fight banged up stays banged up until it's
         actually healed with a Berry/Potion. */
      hp: typeof value.hp === "number" ? value.hp : null,

      /* Local/AI and 2-player battles only: up to 4 real moves
         (app.js's resolveLearnableMoves/getActiveMoves), bindable
         to hotkeys 1-4. Not sent over the online match protocol, so
         this is always null for an online opponent's Pokémon —
         online battles keep using the single realMove above until
         the match server itself understands multiple move slots. */
      moveSlots: Array.isArray(value.moveSlots) ? value.moveSlots : null,
    };
  }

  return null;
}

/* ============================================================
   GET POKÉMON TYPE
============================================================ */

function getPokemonType(pokemon) {
  if (pokemon && Array.isArray(pokemon.types) && pokemon.types.length) {
    const first = pokemon.types[0];

    if (first && first.type && first.type.name) {
      return first.type.name;
    }

    if (first && first.name) {
      return first.name;
    }
  }

  return "normal";
}

/* ============================================================
   GET MOVE
============================================================ */

function getMove(pokemon) {
  /*
  Prefer a real move fetched from PokéAPI (app.js's
  resolveBattleMove) — this is what makes every Pokémon use its
  own signature attack instead of a shared generic type move.
  */

  if (pokemon && pokemon.realMove) {
    return { ...pokemon.realMove };
  }

  const name = cleanPokemonName(pokemon && pokemon.name);

  const overrideName = POKEMON_MOVE_NAMES[name];

  if (overrideName) {
    const normalizedOverride = overrideName.toLowerCase();

    const moveKey = Object.keys(TYPE_MOVES).find(function (key) {
      return TYPE_MOVES[key].name.toLowerCase() === normalizedOverride;
    });

    if (moveKey) {
      return {
        ...TYPE_MOVES[moveKey],
      };
    }

    const type = MOVE_TYPE_OVERRIDE[overrideName] || getPokemonType(pokemon);

    return {
      ...(TYPE_MOVES[type] || TYPE_MOVES.normal),

      name: overrideName,
      type: type,
    };
  }

  const type = getPokemonType(pokemon);

  return {
    ...(TYPE_MOVES[type] || TYPE_MOVES.normal),
  };
}

/* ============================================================
   CREATE CANVAS
============================================================ */

function createCanvas() {
  const container = document.getElementById("game-container");

  if (!container) {
    console.error("#game-container not found.");

    return false;
  }

  container.style.position = "absolute";
  container.style.inset = "0";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.overflow = "hidden";

  if (canvas && canvas.parentElement === container) {
    return true;
  }

  canvas = document.createElement("canvas");

  canvas.id = "pokemon-battle-canvas";

  canvas.width = GAME.width;
  canvas.height = GAME.height;

  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";

  canvas.style.width = "100%";
  canvas.style.height = "100%";

  canvas.style.display = "block";

  canvas.style.zIndex = "1";

  canvas.style.pointerEvents = "none";

  container.appendChild(canvas);

  ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true,
  });

  if (!ctx) {
    return false;
  }

  return true;
}

/* ============================================================
   IMAGE LOADER
============================================================ */

function loadPokemonImage(pokemon) {
  if (!pokemon) {
    return Promise.resolve(null);
  }

  const id = Number(pokemon.id);

  if (!id) {
    return Promise.resolve(null);
  }

  if (imageCache.has(id)) {
    return imageCache.get(id);
  }

  const promise = new Promise(function (resolve) {
    const image = new Image();

    image.crossOrigin = "anonymous";

    let fallbackUsed = false;

    image.onload = function () {
      resolve(image);
    };

    image.onerror = function () {
      if (!fallbackUsed) {
        fallbackUsed = true;

        image.src =
          "https://raw.githubusercontent.com/" +
          "PokeAPI/sprites/master/sprites/pokemon/" +
          id +
          ".png";

        return;
      }

      resolve(null);
    };

    image.src =
      "https://raw.githubusercontent.com/" +
      "PokeAPI/sprites/master/sprites/pokemon/" +
      "other/official-artwork/" +
      id +
      ".png";
  });

  imageCache.set(id, promise);

  return promise;
}

/* ============================================================
   FORCE LANDSCAPE FOR BATTLE
   If the real viewport is narrower than it is tall when a battle
   is open, visually rotate #battlefield-page 90° with a plain CSS
   transform so the battle renders in landscape.

   This intentionally avoids the native Fullscreen / Screen-
   Orientation-Lock APIs. Those behave inconsistently across
   devices, and on some Android builds (confirmed: MIUI/Redmi
   phones, whose system-level "Game Turbo" overlay intercepts
   fullscreen requests from the browser) calling them can crash
   the page outright instead of just failing gracefully. A CSS
   transform can't trigger any of that — it's just paint, so it
   works identically (and safely) on every device, including ones
   where the Fullscreen API would have been risky or unsupported.

   Which way is "up" after a 90° turn depends on which side of the
   phone the person naturally rotates toward, and we have no safe
   way to detect that — so BOTH rotation directions are supported.
   A small flip button (only shown while rotated) lets the player
   switch sides if the first guess renders upside-down for them,
   and the choice is remembered for next time.
============================================================ */

let battleOrientationResizeHandler = null;

const BATTLE_LANDSCAPE_DIRECTION_KEY = "pf_battle_landscape_direction";

function isPortraitViewport() {
  return window.innerWidth < window.innerHeight;
}

function getBattleLandscapeDirection() {
  try {
    return localStorage.getItem(BATTLE_LANDSCAPE_DIRECTION_KEY) === "left"
      ? "left"
      : "right";
  } catch (e) {
    return "right";
  }
}

function setBattleLandscapeDirection(direction) {
  try {
    localStorage.setItem(BATTLE_LANDSCAPE_DIRECTION_KEY, direction);
  } catch (e) {
    /* Private browsing / storage disabled — the choice just won't
       persist across sessions, which is fine. */
  }
}

function applyBattleOrientation() {
  const battlefield = document.getElementById("battlefield-page");

  if (!battlefield) {
    return;
  }

  const flipBtn = document.getElementById("battle-flip-orientation");

  if (isPortraitViewport()) {
    const direction = getBattleLandscapeDirection();

    battlefield.style.width = "100dvh";
    battlefield.style.height = "100dvw";
    battlefield.style.transformOrigin = "left top";

    if (direction === "right") {
      battlefield.style.top = "0";
      battlefield.style.left = "100%";
      battlefield.style.right = "auto";
      battlefield.style.bottom = "auto";
      battlefield.style.transform = "rotate(90deg)";
    } else {
      battlefield.style.top = "100%";
      battlefield.style.left = "0";
      battlefield.style.right = "auto";
      battlefield.style.bottom = "auto";
      battlefield.style.transform = "rotate(-90deg)";
    }

    battlefield.classList.add("force-landscape-rotate");

    if (flipBtn) {
      flipBtn.classList.remove("hidden");
    }
  } else {
    battlefield.style.top = "0";
    battlefield.style.left = "0";
    battlefield.style.right = "";
    battlefield.style.bottom = "";
    battlefield.style.width = "100dvw";
    battlefield.style.height = "100dvh";
    battlefield.style.transform = "";
    battlefield.style.transformOrigin = "";

    battlefield.classList.remove("force-landscape-rotate");

    if (flipBtn) {
      flipBtn.classList.add("hidden");
    }
  }
}

function flipBattleLandscapeDirection() {
  const next = getBattleLandscapeDirection() === "right" ? "left" : "right";

  setBattleLandscapeDirection(next);

  applyBattleOrientation();
}

function enterBattleLandscape() {
  try {
    applyBattleOrientation();

    battleOrientationResizeHandler = applyBattleOrientation;

    window.addEventListener("resize", battleOrientationResizeHandler);

    const flipBtn = document.getElementById("battle-flip-orientation");

    if (flipBtn && !flipBtn.dataset.wired) {
      flipBtn.dataset.wired = "1";

      flipBtn.onclick = flipBattleLandscapeDirection;
    }
  } catch (e) {
    /* Landscape is a nice-to-have — never let it block a battle
       from starting. */
  }
}

function exitBattleLandscape() {
  try {
    if (battleOrientationResizeHandler) {
      window.removeEventListener("resize", battleOrientationResizeHandler);

      battleOrientationResizeHandler = null;
    }

    const battlefield = document.getElementById("battlefield-page");

    if (battlefield) {
      battlefield.style.top = "0";
      battlefield.style.left = "0";
      battlefield.style.right = "";
      battlefield.style.bottom = "";
      battlefield.style.width = "100dvw";
      battlefield.style.height = "100dvh";
      battlefield.style.transform = "";
      battlefield.style.transformOrigin = "";

      battlefield.classList.remove("force-landscape-rotate");
    }

    const flipBtn = document.getElementById("battle-flip-orientation");

    if (flipBtn) {
      flipBtn.classList.add("hidden");
    }
  } catch (e) {
    /* Ignore — worst case the rotated layout lingers until the
       next battle resets it. */
  }
}

/* ============================================================
   INITIALIZE GAME
============================================================ */

/* ============================================================
   INITIALIZE TEAM (6v6) BATTLE
============================================================ */

async function initTeamBattleEngine(
  homePlayerTeam,
  homeOpponentTeam,
  isTwoPlayer,
) {
  twoPlayerMode = Boolean(isTwoPlayer);

  const battlefield = document.getElementById("battlefield-page");

  if (!battlefield) {
    console.error("Battlefield missing.");

    return;
  }

  const normalizedPlayerTeam = (
    Array.isArray(homePlayerTeam) ? homePlayerTeam : [homePlayerTeam]
  )
    .map(normalizePokemon)
    .filter(Boolean);

  const normalizedEnemyTeam = (
    Array.isArray(homeOpponentTeam) ? homeOpponentTeam : [homeOpponentTeam]
  )
    .map(normalizePokemon)
    .filter(Boolean);

  if (!normalizedPlayerTeam.length || !normalizedEnemyTeam.length) {
    /* Not enough data for a team battle — fall back to 1v1. */

    return initGameEngine(normalizedPlayerTeam[0], normalizedEnemyTeam[0]);
  }

  normalizedPlayerTeam.forEach(function (p) {
    p.fainted = false;
    p.hp = typeof p.hp === "number" ? clamp(p.hp, 1, GAME.maxHP) : GAME.maxHP;
  });

  normalizedEnemyTeam.forEach(function (p) {
    p.fainted = false;
    p.hp = GAME.maxHP;
  });

  playerTeam = normalizedPlayerTeam;
  enemyTeam = normalizedEnemyTeam;

  playerTeamIndex = 0;
  enemyTeamIndex = 0;

  playerPokemon = playerTeam[0];
  enemyPokemon = enemyTeam[0];

  /*
  Show battlefield.
  */

  battlefield.classList.remove("hidden");

  battlefield.style.display = "block";

  battlefield.style.visibility = "visible";

  battlefield.style.opacity = "1";

  battlefield.style.position = "fixed";

  battlefield.style.inset = "0";

  battlefield.style.width = "100dvw";

  battlefield.style.height = "100dvh";

  enterBattleLandscape();

  if (!createCanvas()) {
    return;
  }

  /*
  Moves are derived per active Pokémon from the type-based
  table (fast and offline-safe) rather than pre-fetched from
  PokéAPI for all 12 Pokémon up front.
  */

  playerMove = getMove(playerPokemon);

  enemyMove = getMove(enemyPokemon);

  resetBattle();

  /* resetBattle()/resetFighter() always sets the fighter's live hp
     to a full GAME.maxHP — right for the enemy (never persisted),
     but for the player this needs to reflect whatever carried-over
     damage playerPokemon.hp already has, so an unhealed Pokémon
     doesn't quietly start every fight at full anyway. Falls back to
     full HP if .hp isn't a number for any reason — never leave a
     fighter starting at hp 0/null, which would read as an instant
     faint. */
  player.hp =
    typeof playerPokemon.hp === "number" ? playerPokemon.hp : GAME.maxHP;
  enemy.hp =
    typeof enemyPokemon.hp === "number" ? enemyPokemon.hp : GAME.maxHP;

  playerImage = null;
  enemyImage = null;

  loadPokemonImage(playerPokemon).then(function (image) {
    playerImage = image;
  });

  loadPokemonImage(enemyPokemon).then(function (image) {
    enemyImage = image;
  });

  updatePokemonLabels();
  updateHealthBars();
  updateTeamPips();

  window.removeEventListener("keydown", handleKeyDown);

  window.removeEventListener("keyup", handleKeyUp);

  window.addEventListener("keydown", handleKeyDown);

  window.addEventListener("keyup", handleKeyUp);

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  gameRunning = true;
  battleEnded = false;

  lastTime = performance.now();

  draw();

  animationId = requestAnimationFrame(gameLoop);

  updateTranscript(
    (playerTeam.length > 1 || enemyTeam.length > 1
      ? playerTeam.length + "v" + enemyTeam.length + " BATTLE! "
      : "BATTLE! ") +
      formatPokemonName(playerPokemon.name) +
      " VS " +
      formatPokemonName(enemyPokemon.name),
  );

}

/* ============================================================
   INITIALIZE GAME (single 1v1 — also used as the team fallback)
============================================================ */

async function initGameEngine(
  homePlayer,
  homeOpponent,
  homePlayerMove,
  homeEnemyMove,
) {
  const battlefield = document.getElementById("battlefield-page");

  if (!battlefield) {
    console.error("Battlefield missing.");

    return;
  }

  const normalizedPlayer = normalizePokemon(homePlayer);

  const normalizedEnemy = normalizePokemon(homeOpponent);

  if (normalizedPlayer) {
    playerPokemon = normalizedPlayer;
  }

  if (normalizedEnemy) {
    enemyPokemon = normalizedEnemy;
  }

  /*
  Restore saved Pokémon if necessary.
  */

  if (!normalizedPlayer || !normalizedEnemy) {
    readSavedPokemon();
  }

  playerPokemon.fainted = false;
  enemyPokemon.fainted = false;

  playerTeam = [playerPokemon];
  enemyTeam = [enemyPokemon];

  playerTeamIndex = 0;
  enemyTeamIndex = 0;

  /*
  Show battlefield.
  */

  battlefield.classList.remove("hidden");

  battlefield.style.display = "block";

  battlefield.style.visibility = "visible";

  battlefield.style.opacity = "1";

  battlefield.style.position = "fixed";

  battlefield.style.inset = "0";

  battlefield.style.width = "100dvw";

  battlefield.style.height = "100dvh";

  enterBattleLandscape();

  /*
  Canvas.
  */

  if (!createCanvas()) {
    return;
  }

  /*
  Moves.

  If real move data was fetched from PokéAPI (passed in from
  app.js), use it. Otherwise fall back to the built-in
  type-based move table so battles always work even offline.
  */

  playerMove = homePlayerMove || getMove(playerPokemon);

  enemyMove = homeEnemyMove || getMove(enemyPokemon);

  /*
  Reset.
  */

  resetBattle();

  /* Same reasoning as initTeamBattleEngine — resetFighter()
     always sets the fighter's live hp back to full, so sync the
     player's carried-over damage (if any) back in afterward.
     Falls back to full HP if .hp isn't a number for any reason. */
  player.hp =
    typeof playerPokemon.hp === "number" ? playerPokemon.hp : GAME.maxHP;
  enemy.hp =
    typeof enemyPokemon.hp === "number" ? enemyPokemon.hp : GAME.maxHP;

  /*
  Load images.
  */

  playerImage = null;
  enemyImage = null;

  loadPokemonImage(playerPokemon).then(function (image) {
    playerImage = image;
  });

  loadPokemonImage(enemyPokemon).then(function (image) {
    enemyImage = image;
  });

  /*
  UI.
  */

  updatePokemonLabels();
  updateHealthBars();

  /*
  Keyboard.
  */

  window.removeEventListener("keydown", handleKeyDown);

  window.removeEventListener("keyup", handleKeyUp);

  window.addEventListener("keydown", handleKeyDown);

  window.addEventListener("keyup", handleKeyUp);

  /*
  One loop only.
  */

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  gameRunning = true;
  battleEnded = false;

  lastTime = performance.now();

  draw();

  animationId = requestAnimationFrame(gameLoop);

  updateTranscript(
    formatPokemonName(playerPokemon.name) +
      " uses " +
      playerMove.name +
      " • " +
      formatPokemonName(enemyPokemon.name) +
      " is ready!",
  );

}

/* ============================================================
   SAVED POKÉMON
============================================================ */

function readSavedPokemon() {
  try {
    const p1 = localStorage.getItem("pokemonP1");

    const p2 = localStorage.getItem("pokemonP2");

    if (p1) {
      const parsed = JSON.parse(p1);

      const normalized = normalizePokemon(parsed);

      if (normalized) {
        playerPokemon = normalized;
      }
    }

    if (p2) {
      const parsed = JSON.parse(p2);

      const normalized = normalizePokemon(parsed);

      if (normalized) {
        enemyPokemon = normalized;
      }
    }
  } catch (error) {
    console.warn("Could not read saved Pokémon.");
  }
}

/* ============================================================
   RESET BATTLE
============================================================ */

function resetBattle() {
  resetFighter(player, GAME.playerStartX, 1);

  resetFighter(enemy, GAME.enemyStartX, -1);

  /* True AI battles (not 2-player, not online) are against a wild
     Pokémon that's already standing there rather than something
     coming out of anyone's Poké Ball — only the player's own side
     gets the "sent out" treatment there. 2-player and online
     matches are trainer vs. trainer, so both sides still get it. */
  const isAiOnly = !twoPlayerMode && !onlineBattleActive;

  /* Opening send-out — both Pokémon pop in from their Poké Balls
     at the start of the match too, not just on a mid-battle swap
     (except the AI opponent above). */
  player.swapTimer = SEND_OUT_MS;
  player.swapTimerMax = SEND_OUT_MS;
  player.invulnerable = true;

  if (!isAiOnly) {
    enemy.swapTimer = SEND_OUT_MS;
    enemy.swapTimerMax = SEND_OUT_MS;
    enemy.invulnerable = true;
  }

  particles.length = 0;
  projectiles.length = 0;
  effects.length = 0;
  floatingTexts.length = 0;

  screenShake = 0;

  koPause = null;

  battleEnded = false;

  spawnPokeballEffect(player.x, player.y, ballIdFor(true, playerPokemon));

  if (!isAiOnly) {
    spawnPokeballEffect(enemy.x, enemy.y, ballIdFor(false, enemyPokemon));
  }
}

/* ============================================================
   RESET FIGHTER
============================================================ */

function resetFighter(fighter, x, facing) {
  fighter.x = x;
  fighter.y = GAME.ground;

  fighter.vx = 0;
  fighter.vy = 0;

  fighter.hp = GAME.maxHP;

  fighter.facing = facing;

  fighter.jumping = false;

  fighter.attacking = false;
  fighter.blocking = false;
  fighter.dodging = false;
  fighter.invulnerable = false;

  fighter.attackTimer = 0;
  fighter.attackCooldown = 0;
  fighter.attackHit = false;

  fighter.hitTimer = 0;

  fighter.dodgeTimer = 0;

  fighter.combo = 0;
  fighter.comboTimer = 0;

  fighter.animationTime = 0;

  fighter.hitFlash = 0;

  fighter.aiThink = 100;
  fighter.aiAttackDelay = 0;
  fighter.aiBlockTimer = 0;

  fighter.swapTimer = 0;
  fighter.swapTimerMax = 0;

  /* Online-only interpolation history (see pushOnlinePositionSample /
     interpolateOnlinePosition) — clear it so a new battle renders at
     its real starting position instead of blending against stale
     timestamps from a previous online match. */
  fighter.posBuffer = null;
}

/* ============================================================
   MAIN LOOP
============================================================ */

function gameLoop(time) {
  if (!gameRunning) {
    return;
  }

  let dt = (time - lastTime) / 16.6667;

  dt = clamp(dt, 0.5, 1.7);

  lastTime = time;

  update(dt);
  draw();

  animationId = requestAnimationFrame(gameLoop);
}

/* ============================================================
   UPDATE
============================================================ */

function update(dt) {
  if (koPause) {
    koPause.timer -= 16.6667 * dt;

    /* Cosmetic-only systems keep animating during the pause
       (impact particles, floating damage numbers, screen shake)
       so it doesn't feel like the whole screen locked up — but no
       fighter moves, attacks, or takes any action. */
    updateParticles(dt);
    updateEffects(dt);
    updateFloatingTexts(dt);
    updateScreenShake(dt);

    if (koPause.timer <= 0) {
      const finishedTarget = koPause.target;
      const finishedAttacker = koPause.attacker;

      koPause = null;

      completeFaintSwap(finishedTarget, finishedAttacker);
    }

    return;
  }

  updatePlayer(dt);

  if (twoPlayerMode) {
    updatePlayer2(dt);
  } else {
    updateEnemyAI(dt);
  }

  if (player.switchLock > 0) {
    player.switchLock -= 16.6667 * dt;
  }

  if (enemy.switchLock > 0) {
    enemy.switchLock -= 16.6667 * dt;
  }

  updatePhysics(player, enemy, dt);

  updatePhysics(enemy, player, dt);

  updateAttack(player, enemy, dt);

  updateAttack(enemy, player, dt);

  updateProjectiles(dt);

  updateParticles(dt);

  updateEffects(dt);

  updateFloatingTexts(dt);

  separateFighters();

  /*
  IMPORTANT:
  Update facing AFTER movement/separation.
  This guarantees both Pokémon look at each other.
  */

  updateFacing();

  updateScreenShake(dt);
}

/* ============================================================
   PLAYER
============================================================ */

function updatePlayer(dt) {
  player.animationTime += dt;

  if (player.hitTimer > 0) {
    return;
  }

  if (player.attacking || player.blocking || player.dodging) {
    return;
  }

  let moving = false;

  if (keys["a"]) {
    player.x -= GAME.playerSpeed * dt;

    moving = true;
  }

  if (keys["d"]) {
    player.x += GAME.playerSpeed * dt;

    moving = true;
  }

  player.vx = moving ? player.vx * 0.85 : 0;
}

/* ============================================================
   PLAYER 2 (local multiplayer — same keyboard, arrow keys)
============================================================ */

function updatePlayer2(dt) {
  enemy.animationTime += dt;

  if (enemy.hitTimer > 0) {
    return;
  }

  if (enemy.attacking || enemy.blocking || enemy.dodging) {
    return;
  }

  let moving = false;

  if (keys["arrowleft"]) {
    enemy.x -= GAME.enemySpeed * dt;

    moving = true;
  }

  if (keys["arrowright"]) {
    enemy.x += GAME.enemySpeed * dt;

    moving = true;
  }

  enemy.vx = moving ? enemy.vx * 0.85 : 0;
}

/* ============================================================
   ENEMY AI
============================================================ */

/* Difficulty tuning, set from Settings (window.AI_DIFFICULTY, one
   of "easy" | "normal" | "hard"). Scales the enemy's reaction time,
   block chance, dodge chance, and jump frequency relative to the
   normal-mode baseline used throughout updateEnemyAI(). */

const AI_DIFFICULTY_TUNING = {
  easy: { reaction: 1.6, block: 0.4, dodge: 0.5, jump: 0.6 },
  normal: { reaction: 1, block: 1, dodge: 1, jump: 1 },
  hard: { reaction: 0.55, block: 1.8, dodge: 1.7, jump: 1.3 },
};

function getAiTuning() {
  const key =
    window.AI_DIFFICULTY && AI_DIFFICULTY_TUNING[window.AI_DIFFICULTY]
      ? window.AI_DIFFICULTY
      : "normal";

  return AI_DIFFICULTY_TUNING[key];
}

function updateEnemyAI(dt) {
  enemy.animationTime += dt;

  if (enemy.hp <= 0) {
    return;
  }

  if (enemy.hitTimer > 0) {
    return;
  }

  if (enemy.attacking) {
    return;
  }

  if (enemy.dodging) {
    return;
  }

  const tuning = getAiTuning();

  const dx = player.x - enemy.x;

  const distance = Math.abs(dx);

  /*
  Enemy immediately faces player.
  */

  enemy.facing = dx >= 0 ? 1 : -1;

  /*
  Block when player attacks nearby.
  */

  if (
    player.attacking &&
    distance < 250 &&
    Math.random() < 0.025 * tuning.block
  ) {
    enemy.blocking = true;

    enemy.aiBlockTimer = 180;
  }

  if (enemy.aiBlockTimer > 0) {
    enemy.aiBlockTimer -= 16.666 * dt;

    if (enemy.aiBlockTimer <= 0) {
      enemy.blocking = false;
    }

    return;
  }

  /*
  Attack.
  */

  const attackRange = enemyMove && enemyMove.range ? enemyMove.range : 220;

  if (distance <= attackRange && enemy.attackCooldown <= 0) {
    enemy.aiAttackDelay -= 16.666 * dt;

    if (enemy.aiAttackDelay <= 0) {
      attackWithRandomMoveSlot(enemy, enemyPokemon);

      enemy.aiAttackDelay = (80 + Math.random() * 90) * tuning.reaction;
    }

    return;
  }

  /*
  Approach player.
  */

  if (distance > 155) {
    const speed = GAME.enemySpeed * dt;

    enemy.x += enemy.facing * speed;

    return;
  }

  /*
  Back away if extremely close.
  */

  if (distance < 130) {
    enemy.x -= enemy.facing * 1.5 * dt;
  }

  /*
  Jump.
  */

  if (!enemy.jumping && Math.random() < 0.006 * tuning.jump) {
    jump(enemy);
  }

  /*
  Dodge incoming projectile.
  */

  if (
    projectiles.some(function (p) {
      return p.target === enemy && Math.abs(p.x - enemy.x) < 190;
    })
  ) {
    if (Math.random() < 0.25 * tuning.dodge) {
      dodge(enemy);
    }
  }
}

/* ============================================================
   PHYSICS
============================================================ */

function updatePhysics(fighter, opponent, dt) {
  /*
  Jump.
  */

  if (fighter.jumping) {
    fighter.vy += GAME.gravity * dt;

    fighter.y += fighter.vy * dt;

    if (fighter.y >= GAME.ground) {
      fighter.y = GAME.ground;

      fighter.vy = 0;

      fighter.jumping = false;

      createLandingEffect(fighter);
    }
  }

  /*
  Dodge.
  */

  if (fighter.dodging) {
    fighter.x += fighter.facing * 11 * dt;

    fighter.dodgeTimer -= 16.666 * dt;

    if (fighter.dodgeTimer <= 0) {
      fighter.dodging = false;
      fighter.invulnerable = false;
    }
  }

  /*
  Switch-in grace period (6v6 team battles).
  */

  if (fighter.swapTimer > 0) {
    fighter.swapTimer -= 16.666 * dt;

    if (fighter.swapTimer <= 0) {
      fighter.swapTimer = 0;
      fighter.invulnerable = false;
    }
  }

  /*
  Attack cooldown.
  */

  if (fighter.attackCooldown > 0) {
    fighter.attackCooldown -= 16.666 * dt;

    if (fighter.attackCooldown < 0) {
      fighter.attackCooldown = 0;
    }
  }

  /*
  Hit timer.
  */

  if (fighter.hitTimer > 0) {
    fighter.hitTimer -= 16.666 * dt;

    if (fighter.hitTimer < 0) {
      fighter.hitTimer = 0;
    }
  }

  /*
  Combo.
  */

  if (fighter.comboTimer > 0) {
    fighter.comboTimer -= 16.666 * dt;
  } else {
    fighter.combo = 0;
  }

  /*
  Hit flash.
  */

  if (fighter.hitFlash > 0) {
    fighter.hitFlash -= dt;
  }

  /*
  Arena bounds.
  */

  fighter.x = clamp(fighter.x, 90, GAME.width - 90);
}

/* ============================================================
   FACE EACH OTHER
============================================================ */

function updateFacing() {
  /*
  ============================================================
  PLAYER
  ============================================================

  If enemy is to the RIGHT:
      player faces RIGHT

  If enemy is to the LEFT:
      player faces LEFT
  */

  if (!player.dodging && player.hitTimer <= 0) {
    if (enemy.x > player.x) {
      player.facing = 1;
    } else {
      player.facing = -1;
    }
  }

  /*
  ============================================================
  ENEMY
  ============================================================

  If player is to the RIGHT:
      enemy faces RIGHT

  If player is to the LEFT:
      enemy faces LEFT
  */

  if (!enemy.dodging && enemy.hitTimer <= 0) {
    if (player.x > enemy.x) {
      enemy.facing = 1;
    } else {
      enemy.facing = -1;
    }
  }
}

/* ============================================================
   SEPARATE FIGHTERS
============================================================ */

function separateFighters() {
  const dx = enemy.x - player.x;

  const distance = Math.abs(dx);

  if (distance >= GAME.minDistance) {
    return;
  }

  const push = (GAME.minDistance - distance) / 2;

  if (dx >= 0) {
    player.x -= push;
    enemy.x += push;
  } else {
    player.x += push;
    enemy.x -= push;
  }

  player.x = clamp(player.x, 90, GAME.width - 90);

  enemy.x = clamp(enemy.x, 90, GAME.width - 90);
}

/* ============================================================
   JUMP
============================================================ */

function jump(fighter) {
  if (
    fighter.jumping ||
    fighter.attacking ||
    fighter.hitTimer > 0 ||
    fighter.dodging
  ) {
    return;
  }

  fighter.jumping = true;

  fighter.vy = GAME.jumpPower;

  createJumpEffect(fighter);
}

/* ============================================================
   DODGE
============================================================ */

function dodge(fighter) {
  if (fighter.dodging || fighter.attacking || fighter.hitTimer > 0) {
    return;
  }

  fighter.dodging = true;

  fighter.invulnerable = true;

  fighter.dodgeTimer = 220;

  fighter.x += fighter.facing * 60;

  createDashEffect(fighter);
}

/* ============================================================
   START ATTACK
============================================================ */

function startAttack(fighter) {
  if (
    fighter.attacking ||
    fighter.blocking ||
    fighter.dodging ||
    fighter.hitTimer > 0 ||
    fighter.attackCooldown > 0 ||
    fighter.hp <= 0
  ) {
    return;
  }

  fighter.attacking = true;

  fighter.attackTimer = GAME.attackDuration;

  fighter.attackCooldown = GAME.attackCooldown;

  fighter.attackHit = false;

  const move = fighter === player ? playerMove : enemyMove;

  createAttackChargeEffect(fighter, move);
}

/* ============================================================
   UPDATE ATTACK
============================================================ */

function updateAttack(attacker, target, dt) {
  if (!attacker.attacking) {
    return;
  }

  attacker.attackTimer -= 16.666 * dt;

  /*
  Hit once.
  */

  if (attacker.attackTimer <= GAME.attackHitFrame && !attacker.attackHit) {
    attacker.attackHit = true;

    performAttack(attacker, target);
  }

  /*
  Finish.
  */

  if (attacker.attackTimer <= 0) {
    attacker.attacking = false;
    attacker.attackHit = false;
  }
}

/* ============================================================
   PERFORM ATTACK
============================================================ */

function performAttack(attacker, target) {
  const move = attacker === player ? playerMove : enemyMove;

  updateTranscript(
    formatPokemonName(
      attacker === player ? playerPokemon.name : enemyPokemon.name,
    ) +
      " used " +
      move.name +
      "!",
  );

  /*
  Projectile.
  */

  if (move.projectile) {
    createProjectile(attacker, target, move);

    return;
  }

  /*
  Melee.
  */

  const distance = Math.abs(attacker.x - target.x);

  if (distance <= move.range && Math.abs(attacker.y - target.y) < 160) {
    hitTarget(attacker, target, move);
  } else {
    showText(
      attacker.x + attacker.facing * 70,
      attacker.y - 190,
      "MISS",
      "#b6c9d8",
    );
  }
}

/* ============================================================
   CREATE PROJECTILE
============================================================ */

function createProjectile(attacker, target, move) {
  if (projectiles.length >= GAME.maxProjectiles) {
    return;
  }

  const startX = attacker.x + attacker.facing * 60;

  const startY = attacker.y - 120;

  const targetX = target.x;

  const targetY = target.y - 115;

  const dx = targetX - startX;

  const dy = targetY - startY;

  const distance = Math.hypot(dx, dy) || 1;

  const speed = move.speed || 12;

  projectiles.push({
    x: startX,
    y: startY,

    vx: (dx / distance) * speed,

    vy: (dy / distance) * speed,

    attacker: attacker,
    target: target,

    move: move,

    life: 1000,

    radius: move.type === "dragon" ? 17 : 13,
  });

  addEffect({
    type: "burst",

    x: startX,
    y: startY,

    color: move.color,

    life: 150,
    maxLife: 150,

    radius: 30,
  });
}

/* ============================================================
   UPDATE PROJECTILES
============================================================ */

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];

    projectile.x += projectile.vx * dt;

    projectile.y += projectile.vy * dt;

    projectile.life -= 16.666 * dt;

    /*
    Trail.
    */

    if (particles.length < GAME.maxParticles) {
      addParticle(
        projectile.x,
        projectile.y,
        projectile.move.color,
        -projectile.vx * 0.04,
        -projectile.vy * 0.04,
        140,
        2,
      );
    }

    const target = projectile.target;

    const distance = Math.hypot(
      projectile.x - target.x,

      projectile.y - (target.y - 115),
    );

    if (distance < 50 && target.hp > 0) {
      if (target.invulnerable) {
        showText(target.x, target.y - 190, "DODGE!", "#62e7ff");

        createBurst(target.x, target.y - 115, "#62e7ff", 10);
      } else {
        hitTarget(projectile.attacker, target, projectile.move);
      }

      createImpactEffect(projectile.x, projectile.y, projectile.move);

      projectiles.splice(i, 1);

      continue;
    }

    if (
      projectile.life <= 0 ||
      projectile.x < -100 ||
      projectile.x > GAME.width + 100 ||
      projectile.y < -100 ||
      projectile.y > GAME.height + 100
    ) {
      projectiles.splice(i, 1);
    }
  }
}

/* ============================================================
   HIT TARGET
============================================================ */

function hitTarget(attacker, target, move) {
  if (target.hp <= 0 || target.invulnerable) {
    return;
  }

  const attackerPokemon = attacker === player ? playerPokemon : enemyPokemon;
  const defenderPokemon = target === player ? playerPokemon : enemyPokemon;

  const effectiveness = typeEffectivenessMultiplier(move.type, defenderPokemon);

  /* Immune: no damage, no knockback, no flash, no combo. */
  if (effectiveness === 0) {
    showText(target.x, target.y - 205, "NO EFFECT...", "#9aa7b8");

    return;
  }

  let damage = Math.round((move.damage || 15) * effectiveness);

  if (effectiveness > 0) {
    damage = Math.max(1, damage);
  }

  /*
  Legendary/Mythical Pokémon hit harder and shrug off more damage —
  see LEGENDARY_POKEMON above. Applied after type effectiveness so a
  legendary is still resisted/weak-to types normally, just from a
  much tougher/harder-hitting baseline.
  */

  if (damage > 0 && isLegendaryPokemon(attackerPokemon)) {
    damage = Math.round(damage * LEGENDARY_DAMAGE_DEALT_MULT);
  }

  if (damage > 0 && isLegendaryPokemon(defenderPokemon)) {
    damage = Math.max(1, Math.round(damage * LEGENDARY_DAMAGE_TAKEN_MULT));
  }

  /*
  Blocking.
  */

  if (target.blocking && damage > 0) {
    damage = Math.max(3, Math.round(damage * 0.25));
  }

  target.hp = clamp(target.hp - damage, 0, GAME.maxHP);

  target.hitTimer = target.blocking ? 90 : 180;

  target.hitFlash = 8;

  /*
  Knockback.
  */

  if (!target.blocking) {
    target.x += attacker.facing * 22;
  } else {
    target.x += attacker.facing * 7;
  }

  /*
  Combo.
  */

  attacker.combo += 1;

  attacker.comboTimer = 850;

  /*
  VFX.
  */

  screenShake = target.blocking ? 3 : 7;

  createImpactEffect(target.x - target.facing * 10, target.y - 115, move);

  createBurst(
    target.x,
    target.y - 115,
    target.blocking ? "#62e4ff" : move.color,
    target.blocking ? 8 : 14,
  );

  showText(target.x, target.y - 180, "-" + damage, "#ffffff");

  if (effectiveness === 0) {
    showText(target.x, target.y - 205, "NO EFFECT...", "#9aa7b8");
  } else if (effectiveness > 1) {
    showText(target.x, target.y - 205, "SUPER EFFECTIVE!", "#ffd43b");
  } else if (effectiveness < 1) {
    showText(target.x, target.y - 205, "NOT VERY EFFECTIVE...", "#9aa7b8");
  }

  if (target.blocking) {
    showText(target.x, target.y - 215, "BLOCK!", "#5de4ff");
  }

  if (attacker.combo >= 2) {
    showText(
      attacker.x,
      attacker.y - 235,
      attacker.combo + " HIT COMBO",
      "#ffd43b",
    );
  }

  updateHealthBars();

  /*
  KO — send in the next team member, or end the battle if that
  was the last one standing.
  */

  if (target.hp <= 0) {
    beginKoPause(target, attacker);
  }
}

/* ============================================================
   KO PAUSE — a beat where nobody can act after a Pokémon faints

   Real Pokémon games don't instantly swap the fainted Pokémon out;
   there's a pause where the KO'd Pokémon is "taken out" of the
   fight and neither side can act, then the next one is sent in.
   This freezes the whole match (both fighters — attacker included,
   so the winner can't get free hits during the pause) for
   KO_PAUSE_MS before handing off to completeFaintSwap, which does
   the actual team-switch/battle-end logic that used to run
   immediately on faint.
============================================================ */

const KO_PAUSE_MS = 2000;

function beginKoPause(target, attacker) {
  const isPlayerSide = target === player;

  const team = isPlayerSide ? playerTeam : enemyTeam;
  const currentIndex = isPlayerSide ? playerTeamIndex : enemyTeamIndex;

  if (team[currentIndex]) {
    team[currentIndex].fainted = true;
    team[currentIndex].hp = 0;
  }

  showText(
    target.x,
    target.y - 250,
    formatPokemonName(team[currentIndex] ? team[currentIndex].name : "") +
      " FAINTED!",
    "#ff6d6d",
  );

  updateHealthBars();
  updateTeamPips();

  if (typeof sfxKnockout === "function") {
    sfxKnockout();
  }

  koPause = {
    target: target,
    attacker: attacker,
    timer: KO_PAUSE_MS,
  };
}

/* ============================================================
   TEAM SWITCH ON FAINT (6v6) — runs after the KO pause above ends
============================================================ */

function completeFaintSwap(target, attacker) {
  const isPlayerSide = target === player;

  const team = isPlayerSide ? playerTeam : enemyTeam;
  const currentIndex = isPlayerSide ? playerTeamIndex : enemyTeamIndex;

  let nextIndex = -1;

  for (let i = 0; i < team.length; i++) {
    if (i === currentIndex) {
      continue;
    }

    if (team[i] && !team[i].fainted) {
      nextIndex = i;

      break;
    }
  }

  if (nextIndex === -1) {
    /* Whole team is down — the match is over. */

    finishBattle(attacker);

    return;
  }

  /*
  Send out the next Pokémon in the same fighter slot, fully
  healed, with a brief grace period so it isn't hit the instant
  it appears.
  */

  const startX = isPlayerSide ? GAME.playerStartX : GAME.enemyStartX;

  const facing = isPlayerSide ? 1 : -1;

  resetFighter(target, startX, facing);

  /* Honor whatever HP that team member already had (it may have
     been switched out earlier while still healthy); a Pokémon
     that's never been sent out yet starts at full health. */

  target.hp =
    typeof team[nextIndex].hp === "number" ? team[nextIndex].hp : GAME.maxHP;

  target.invulnerable = true;

  target.swapTimer = SEND_OUT_MS;
  target.swapTimerMax = SEND_OUT_MS;

  spawnPokeballEffect(
    target.x,
    target.y,
    ballIdFor(isPlayerSide, team[nextIndex]),
  );

  if (isPlayerSide) {
    playerTeamIndex = nextIndex;

    playerPokemon = team[nextIndex];

    playerMove = getMove(playerPokemon);

    loadPokemonImage(playerPokemon).then(function (image) {
      playerImage = image;
    });
  } else {
    enemyTeamIndex = nextIndex;

    enemyPokemon = team[nextIndex];

    enemyMove = getMove(enemyPokemon);

    loadPokemonImage(enemyPokemon).then(function (image) {
      enemyImage = image;
    });
  }

  showText(
    target.x,
    target.y - 300,
    "GO! " + formatPokemonName(team[nextIndex].name).toUpperCase(),
    isPlayerSide ? "#8ee6b0" : "#ff9b6a",
  );

  updatePokemonLabels();
  updateHealthBars();
  updateTeamPips();
}

/* ============================================================
   VOLUNTARY SWITCH (change Pokémon mid-fight)

   Unlike completeFaintSwap's forced swap, this can happen any time the
   active fighter isn't mid-action, and it preserves each bench
   Pokémon's own HP — recalling a Pokémon and sending it back out
   later doesn't magically heal it.
============================================================ */

function switchToIndex(isPlayerSide, newIndex) {
  if (!gameRunning || battleEnded) {
    return;
  }

  const fighter = isPlayerSide ? player : enemy;
  const team = isPlayerSide ? playerTeam : enemyTeam;
  const currentIndex = isPlayerSide ? playerTeamIndex : enemyTeamIndex;

  if (
    newIndex === currentIndex ||
    !team[newIndex] ||
    team[newIndex].fainted ||
    fighter.hp <= 0 ||
    fighter.switchLock > 0 ||
    fighter.attacking ||
    fighter.dodging ||
    fighter.hitTimer > 0
  ) {
    return;
  }

  if (team[currentIndex]) {
    team[currentIndex].hp = fighter.hp;
  }

  const startX = isPlayerSide ? GAME.playerStartX : GAME.enemyStartX;
  const facing = isPlayerSide ? 1 : -1;

  resetFighter(fighter, startX, facing);

  fighter.hp =
    typeof team[newIndex].hp === "number" ? team[newIndex].hp : GAME.maxHP;

  fighter.invulnerable = true;
  fighter.swapTimer = SEND_OUT_MS;
  fighter.swapTimerMax = SEND_OUT_MS;
  fighter.switchLock = 1400;

  spawnPokeballEffect(
    fighter.x,
    fighter.y,
    ballIdFor(isPlayerSide, team[newIndex]),
  );

  if (isPlayerSide) {
    playerTeamIndex = newIndex;
    playerPokemon = team[newIndex];
    playerMove = getMove(playerPokemon);

    loadPokemonImage(playerPokemon).then(function (image) {
      playerImage = image;
    });
  } else {
    enemyTeamIndex = newIndex;
    enemyPokemon = team[newIndex];
    enemyMove = getMove(enemyPokemon);

    loadPokemonImage(enemyPokemon).then(function (image) {
      enemyImage = image;
    });
  }

  showText(
    fighter.x,
    fighter.y - 300,
    "GO! " + formatPokemonName(team[newIndex].name).toUpperCase(),
    isPlayerSide ? "#8ee6b0" : "#ff9b6a",
  );

  updatePokemonLabels();
  updateHealthBars();
  updateTeamPips();
}

/*
Cycle to the next non-fainted bench Pokémon (used by the
keyboard shortcut — Tab for P1, Enter for P2).
*/

function cycleSwitch(isPlayerSide) {
  const team = isPlayerSide ? playerTeam : enemyTeam;
  const currentIndex = isPlayerSide ? playerTeamIndex : enemyTeamIndex;

  if (!team || team.length <= 1) {
    return;
  }

  for (let step = 1; step <= team.length; step++) {
    const idx = (currentIndex + step) % team.length;

    if (team[idx] && !team[idx].fainted) {
      switchToIndex(isPlayerSide, idx);
      return;
    }
  }
}

/* ============================================================
   PARTICLES
============================================================ */

function addParticle(x, y, color, vx, vy, life, size) {
  if (particles.length >= GAME.maxParticles) {
    return;
  }

  particles.push({
    x: x,
    y: y,

    vx: vx,
    vy: vy,

    life: life,
    maxLife: life,

    size: size,

    color: color,
  });
}

/* ============================================================
   BURST
============================================================ */

function createBurst(x, y, color, amount) {
  amount = Math.min(amount, GAME.maxParticles - particles.length);

  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;

    const speed = 2 + Math.random() * 5;

    addParticle(
      x,
      y,
      color,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      260 + Math.random() * 180,
      2 + Math.random() * 3,
    );
  }
}

/* ============================================================
   JUMP EFFECT
============================================================ */

function createJumpEffect(fighter) {
  createBurst(fighter.x, GAME.ground, "#8de8ff", 7);

  addEffect({
    type: "ring",

    x: fighter.x,
    y: GAME.ground,

    color: "#8de8ff",

    life: 220,
    maxLife: 220,

    radius: 15,
  });
}

/* ============================================================
   LAND EFFECT
============================================================ */

function createLandingEffect(fighter) {
  createBurst(fighter.x, GAME.ground, "#8de8ff", 6);

  addEffect({
    type: "ring",

    x: fighter.x,
    y: GAME.ground,

    color: "#8de8ff",

    life: 230,
    maxLife: 230,

    radius: 20,
  });
}

/* ============================================================
   DASH EFFECT
============================================================ */

function createDashEffect(fighter) {
  const color = fighter === player ? "#ffe04a" : "#ff6d9b";

  createBurst(fighter.x - fighter.facing * 35, fighter.y - 100, color, 8);

  addEffect({
    type: "dash",

    x: fighter.x,
    y: fighter.y - 110,

    color: color,

    life: 180,
    maxLife: 180,

    radius: 80,
  });
}

/* ============================================================
   ATTACK CHARGE EFFECT
============================================================ */

function createAttackChargeEffect(fighter, move) {
  addEffect({
    type: "charge",

    x: fighter.x + fighter.facing * 55,

    y: fighter.y - 120,

    color: move.color,

    life: 220,
    maxLife: 220,

    radius: 25,
  });
}

/* ============================================================
   IMPACT EFFECT
============================================================ */

function createImpactEffect(x, y, move) {
  addEffect({
    type: "impact",

    x: x,
    y: y,

    color: move.color,

    life: 220,
    maxLife: 220,

    radius: 20,
  });
}

/* Poké Ball send-out/recall animation — see the "pokeball" branch
   in drawEffects for what it actually draws. Called whenever a
   Pokémon enters or leaves the field (voluntary switch, a forced
   swap after a KO, or an online team-index change). */
/* The ball a Pokémon is sent out of. Your own Pokémon always come
   out of the ball they were CAUGHT in (a Great Ball catch opens as a
   Great Ball, etc.). Wild/CPU Pokémon and online opponents use the
   plain default animation; in local 2-player both trainers' captured
   Pokémon use their own balls. Returns null for "default". */
function ballIdFor(isPlayerSide, pokemon) {
  if (!pokemon) return null;

  const local =
    typeof window.getCaughtBallId === "function"
      ? window.getCaughtBallId(pokemon.name)
      : null;

  /* ONLINE: each trainer's team carries the ball every Pokémon was
     caught in (the opponent's arrives via the match server). Your own
     Pokémon fall back to your local catch record. */
  if (onlineBattleActive) {
    return pokemon.ballId || (isPlayerSide ? local : null);
  }

  /* Wild/CPU Pokémon aren't thrown from a ball. */
  if (!isPlayerSide && !twoPlayerMode) return null;

  return local;
}

const ballSpriteCache = {};

function ballSpriteFor(ballId) {
  if (!ballId || typeof window.getBallVisual !== "function") return null;

  if (!ballSpriteCache[ballId]) {
    const visual = window.getBallVisual(ballId);

    const img = new Image();

    img.crossOrigin = "anonymous";
    img.src = visual.url;

    ballSpriteCache[ballId] = { img: img, color: visual.color };
  }

  return ballSpriteCache[ballId];
}

/* How long a thrown-ball send-out lasts (ball flight + burst + the
   Pokémon appearing). */
const SEND_OUT_MS = 900;

/* Starts loading the artwork for these ball ids so the first
   send-out of a Pokémon caught in them is never plain. Called by
   app.js at startup and whenever something new is caught. */
window.preloadBallSprites = function (ids) {
  (ids || []).forEach(function (id) {
    ballSpriteFor(id);
  });
};

function spawnPokeballEffect(x, y, ballId) {
  if (typeof sfxPokeball === "function") {
    sfxPokeball();
  }

  ballSpriteFor(ballId);

  addEffect({
    type: "pokeball",

    ballId: ballId || null,

    /* The ball is thrown in from the edge of the screen on this
       Pokémon's side. */
    fromX: x < GAME.width / 2 ? -60 : GAME.width + 60,
    fromY: GAME.ground - 230,

    x: x,
    y: y - 110,

    life: SEND_OUT_MS,
    maxLife: SEND_OUT_MS,
  });
}

/* ============================================================
   PARTICLE UPDATE
============================================================ */

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx * dt;

    p.y += p.vy * dt;

    p.vy += 0.16 * dt;

    p.life -= 16.666 * dt;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

/* ============================================================
   EFFECTS
============================================================ */

function addEffect(effect) {
  if (effects.length >= GAME.maxEffects) {
    return;
  }

  effects.push(effect);
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i];

    /* A send-out from a special ball waits (up to ~1.5s) for that
       ball's artwork to finish loading instead of playing the whole
       animation with the plain fallback ball. */
    if (effect.ballId && effect.type === "pokeball") {
      const s = ballSpriteCache[effect.ballId];

      if (s && !s.img.complete && (effect.waited || 0) < 1500) {
        effect.waited = (effect.waited || 0) + 16.666 * dt;

        continue;
      }
    }

    effect.life -= 16.666 * dt;

    if (effect.life <= 0) {
      effects.splice(i, 1);
    }
  }
}

/* ============================================================
   FLOATING TEXT
============================================================ */

function showText(x, y, text, color) {
  if (floatingTexts.length >= GAME.maxFloatingTexts) {
    floatingTexts.shift();
  }

  floatingTexts.push({
    x: x,
    y: y,

    text: text,
    color: color,

    life: 750,
    maxLife: 750,
  });
}

function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const item = floatingTexts[i];

    item.y -= 0.75 * dt;

    item.life -= 16.666 * dt;

    if (item.life <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
}

/* ============================================================
   SCREEN SHAKE
============================================================ */

function updateScreenShake(dt) {
  if (screenShake <= 0) {
    return;
  }

  screenShake -= 0.7 * dt;

  if (screenShake < 0) {
    screenShake = 0;
  }
}

/* ============================================================
   DRAW
============================================================ */

function draw() {
  if (!ctx || !canvas) {
    return;
  }

  ctx.clearRect(0, 0, GAME.width, GAME.height);

  ctx.save();

  if (screenShake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * screenShake,

      (Math.random() - 0.5) * screenShake,
    );
  }

  drawBackground();

  drawArena();

  drawFighters();

  drawProjectiles();

  drawParticles();

  drawEffects();

  drawFloatingTexts();

  ctx.restore();
}

/* ============================================================
   BACKGROUND
============================================================ */

function drawBackground() {
  const t = performance.now() * 0.001;

  /*
  Sky gradient.
  */

  const gradient = ctx.createLinearGradient(0, 0, 0, GAME.height);

  gradient.addColorStop(0, "#050d1c");

  gradient.addColorStop(0.42, "#0d2540");

  gradient.addColorStop(0.72, "#164060");

  gradient.addColorStop(1, "#06131f");

  ctx.fillStyle = gradient;

  ctx.fillRect(0, 0, GAME.width, GAME.height);

  /*
  Aurora-style glow bands.
  */

  ctx.save();

  ctx.globalAlpha = 0.16;

  const auroraA = ctx.createRadialGradient(
    GAME.width * 0.22,
    90,
    20,
    GAME.width * 0.22,
    90,
    340,
  );

  auroraA.addColorStop(0, "#7d45ff");
  auroraA.addColorStop(1, "rgba(125,69,255,0)");

  ctx.fillStyle = auroraA;
  ctx.fillRect(0, 0, GAME.width, GAME.height * 0.6);

  const auroraB = ctx.createRadialGradient(
    GAME.width * 0.8,
    60,
    20,
    GAME.width * 0.8,
    60,
    380,
  );

  auroraB.addColorStop(0, "#21b5ff");
  auroraB.addColorStop(1, "rgba(33,181,255,0)");

  ctx.fillStyle = auroraB;
  ctx.fillRect(0, 0, GAME.width, GAME.height * 0.6);

  ctx.restore();

  /*
  Twinkling stars.
  */

  for (let i = 0; i < 40; i++) {
    const x = 20 + ((i * 173) % (GAME.width - 40));

    const y = 20 + ((i * 71) % 230);

    const twinkle = 0.35 + 0.35 * Math.sin(t * 1.6 + i * 12.9);

    ctx.fillStyle = "rgba(180,225,255," + clamp(twinkle, 0.1, 0.85) + ")";

    ctx.fillRect(x, y, i % 5 === 0 ? 2.4 : 1.6, i % 5 === 0 ? 2.4 : 1.6);
  }

  /*
  Distant mountain / skyline silhouette.
  */

  ctx.save();

  ctx.fillStyle = "#0a1f34";

  ctx.beginPath();

  ctx.moveTo(0, GAME.ground - 78);

  const peaks = 9;

  for (let i = 0; i <= peaks; i++) {
    const x = (GAME.width / peaks) * i;

    const peakHeight = 40 + ((i * 53) % 70);

    ctx.lineTo(x, GAME.ground - 78 - peakHeight);
  }

  ctx.lineTo(GAME.width, GAME.ground - 78);

  ctx.closePath();

  ctx.fill();

  ctx.restore();

  /*
  Floodlight beams sweeping from the top corners.
  */

  ctx.save();

  ctx.globalAlpha = 0.1;

  drawFloodlight(70, -20, Math.sin(t * 0.35) * 0.12 + 0.55);

  drawFloodlight(GAME.width - 70, -20, Math.sin(t * 0.35 + 2) * 0.12 - 0.55);

  ctx.restore();
}

/* ============================================================
   FLOODLIGHT BEAM
============================================================ */

function drawFloodlight(x, y, angle) {
  const length = 620;

  const spread = 0.32;

  ctx.save();

  ctx.translate(x, y);

  ctx.rotate(Math.PI / 2 + angle);

  const beam = ctx.createLinearGradient(0, 0, length, 0);

  beam.addColorStop(0, "rgba(150,220,255,.9)");

  beam.addColorStop(1, "rgba(150,220,255,0)");

  ctx.fillStyle = beam;

  ctx.beginPath();

  ctx.moveTo(0, 0);

  ctx.lineTo(length, -Math.tan(spread) * length);

  ctx.lineTo(length, Math.tan(spread) * length);

  ctx.closePath();

  ctx.fill();

  ctx.restore();
}

/* ============================================================
   ARENA
============================================================ */

function drawArena() {
  const t = performance.now() * 0.001;

  /*
  Back wall / stand riser.
  */

  ctx.fillStyle = "#0b2638";

  ctx.fillRect(0, GAME.ground - 80, GAME.width, 80);

  /*
  Crowd stands: rows of small glowing dots receding upward.
  */

  ctx.save();

  const rows = 4;

  for (let r = 0; r < rows; r++) {
    const rowY = GAME.ground - 74 + r * 15;

    const count = 46 - r * 4;

    const spacing = GAME.width / count;

    ctx.globalAlpha = 0.5 - r * 0.09;

    for (let i = 0; i < count; i++) {
      const flicker = 0.5 + 0.5 * Math.sin(t * 3 + i * 7.3 + r * 4);

      const hue = (i + r) % 5 === 0 ? "#ffcf6b" : "#6fb8ff";

      ctx.fillStyle = hue;

      ctx.globalAlpha *= 1;

      ctx.fillRect(
        i * spacing + (r % 2 === 0 ? 0 : spacing / 2),
        rowY,
        3,
        3 + flicker * 1.5,
      );
    }
  }

  ctx.restore();

  /*
  Floor gradient.
  */

  const floor = ctx.createLinearGradient(0, GAME.ground, 0, GAME.height);

  floor.addColorStop(0, "#1a5570");

  floor.addColorStop(0.4, "#123f56");

  floor.addColorStop(1, "#05111c");

  ctx.fillStyle = floor;

  ctx.fillRect(0, GAME.ground, GAME.width, GAME.height - GAME.ground);

  /*
  Perspective floor tiles converging toward the horizon line.
  */

  ctx.save();

  ctx.strokeStyle = "rgba(103,225,255,.14)";

  ctx.lineWidth = 1;

  const vanishX = GAME.width / 2;

  for (let i = -10; i <= 10; i++) {
    ctx.beginPath();

    ctx.moveTo(vanishX + i * 60, GAME.ground);

    ctx.lineTo(vanishX + i * 340, GAME.height);

    ctx.stroke();
  }

  for (let i = 1; i <= 6; i++) {
    const y = GAME.ground + (GAME.height - GAME.ground) * (i / 6.5) * (i / 6.5);

    ctx.beginPath();

    ctx.moveTo(0, y);

    ctx.lineTo(GAME.width, y);

    ctx.stroke();
  }

  ctx.restore();

  /*
  Glowing horizon line.
  */

  ctx.fillStyle = "#64e2ff";

  ctx.fillRect(0, GAME.ground, GAME.width, 4);

  ctx.save();

  ctx.globalAlpha = 0.5;

  ctx.fillStyle = "#64e2ff";

  ctx.fillRect(0, GAME.ground - 3, GAME.width, 3);

  ctx.restore();

  /*
  Center battle circle with slowly rotating energy rings.
  */

  const cx = GAME.width / 2;

  const cy = GAME.ground + 30;

  ctx.save();

  ctx.strokeStyle = "rgba(103,225,255,.5)";

  ctx.lineWidth = 3;

  ctx.beginPath();

  ctx.ellipse(cx, cy, 490, 90, 0, 0, Math.PI * 2);

  ctx.stroke();

  ctx.save();

  ctx.translate(cx, cy);

  ctx.rotate(t * 0.15);

  ctx.strokeStyle = "rgba(125,200,255,.55)";

  ctx.lineWidth = 2;

  ctx.setLineDash([14, 10]);

  ctx.beginPath();

  ctx.ellipse(0, 0, 80, 20, 0, 0, Math.PI * 2);

  ctx.stroke();

  ctx.restore();

  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(100,225,255,.35)";

  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.ellipse(cx, cy, 250, 48, 0, 0, Math.PI * 2);

  ctx.stroke();

  ctx.restore();

  /*
  Center divider.
  */

  ctx.fillStyle = "rgba(100,225,255,.18)";

  ctx.fillRect(cx - 2, GAME.ground - 30, 4, 80);

  /*
  Vignette.
  */

  ctx.save();

  const vignette = ctx.createRadialGradient(
    cx,
    GAME.ground - 40,
    GAME.height * 0.25,
    cx,
    GAME.ground - 40,
    GAME.height * 0.95,
  );

  vignette.addColorStop(0, "rgba(0,0,0,0)");

  vignette.addColorStop(1, "rgba(0,4,10,.55)");

  ctx.fillStyle = vignette;

  ctx.fillRect(0, 0, GAME.width, GAME.height);

  ctx.restore();
}

/* ============================================================
   DRAW FIGHTERS
============================================================ */

function drawFighters() {
  drawFighter(player, playerPokemon, playerImage);

  drawFighter(enemy, enemyPokemon, enemyImage);
}

/* ============================================================
   DRAW FIGHTER
============================================================ */

/* 0 while a thrown ball is still in flight, rising to 1 as the ball
   bursts open and the Pokémon appears (1 when not sending out). */
function sendOutAppear(fighter) {
  if (!(fighter.swapTimer > 0 && fighter.swapTimerMax > 0)) return 1;

  const progress = 1 - fighter.swapTimer / fighter.swapTimerMax;

  return Math.max(0, Math.min(1, (progress - 0.68) / 0.3));
}

function drawFighter(fighter, pokemon, image) {
  const sizeScale = getSizeScale(pokemon);

  const appearNow = sendOutAppear(fighter);

  /*
  Shadow. Scaled with the Pokémon so bigger fighters cast a
  bigger shadow and tiny ones cast a small one.
  */

  ctx.save();

  ctx.globalAlpha = appearNow;

  ctx.fillStyle = "rgba(0,0,0,.35)";

  ctx.beginPath();

  ctx.ellipse(
    fighter.x,
    GAME.ground + 7,

    (fighter.jumping ? 40 : 65) * sizeScale,

    (fighter.jumping ? 8 : 16) * sizeScale,

    0,
    0,
    Math.PI * 2,
  );

  ctx.fill();

  ctx.restore();

  /*
  Fighter transform.
  */

  ctx.save();

  ctx.translate(fighter.x, fighter.y);

  /*
  Idle animation.
  */

  const idleBounce =
    !fighter.jumping &&
    !fighter.attacking &&
    !fighter.hitTimer &&
    !fighter.dodging
      ? Math.sin(fighter.animationTime * 0.08) * 6
      : 0;

  /* Gentle side-to-side sway so idle Pokémon never look frozen,
     even between bounces. */
  const idleSway =
    !fighter.jumping &&
    !fighter.attacking &&
    !fighter.hitTimer &&
    !fighter.dodging
      ? Math.sin(fighter.animationTime * 0.035) * 3
      : 0;

  const jumpBounce = fighter.jumping
    ? Math.sin(fighter.animationTime * 0.2) * 2
    : 0;

  ctx.translate(idleSway, idleBounce + jumpBounce);

  /*
  Dodge.
  */

  if (fighter.dodging) {
    ctx.globalAlpha = 0.5;
  }

  /*
  Hit animation.
  */

  if (fighter.hitTimer > 0) {
    ctx.translate(Math.sin(fighter.hitTimer * 0.35) * 7, 0);
  }

  /*
  Send-out pop-in — grows from small/transparent to full size while
  the Poké Ball effect (see spawnPokeballEffect) plays at its feet,
  instead of just instantly appearing at full size.
  */

  if (fighter.swapTimer > 0 && fighter.swapTimerMax > 0) {
    const progress = 1 - fighter.swapTimer / fighter.swapTimerMax;

    /* Stays hidden while the ball is thrown and lands (first ~70% of
       the ball's flight+landing), then pops out as it bursts open. */
    const appear = Math.max(0, Math.min(1, (progress - 0.68) / 0.3));

    const swapScale = 0.2 + 0.8 * appear;

    ctx.globalAlpha *= appear;

    ctx.scale(swapScale, swapScale);
  }

  /*
  Pokémon image.
  */

  if (image && image.complete && image.naturalWidth > 0) {
    drawPokemonImage(fighter, image, pokemon);
  } else {
    drawFallbackPokemon(fighter);
  }

  /*
  Shield.
  */

  if (fighter.blocking) {
    drawShield(fighter);
  }

  /*
  Melee attack.
  */

  if (fighter.attacking) {
    const move = fighter === player ? playerMove : enemyMove;

    if (!move.projectile) {
      drawMeleeAttack(fighter, move);
    }
  }

  /*
  Hit flash removed — it read as a persistent gray/white smudge
  behind the Pokémon during any fast exchange of hits (each new hit
  re-triggers it before the previous one finishes fading), and in
  online battles it had no decay mechanism at all, so it could get
  stuck on for the rest of the match. fighter.hitFlash is still
  tracked (set on hit, decremented in updatePhysics) in case it's
  used for something else later, but nothing draws it anymore.
  */

  ctx.restore();

  if (appearNow > 0.5) {
    drawName(fighter, pokemon, sizeScale);
  }
}

/* ============================================================
   DRAW POKÉMON IMAGE
============================================================ */

/*
IMPORTANT ORIENTATION FIX

Most official Pokémon artwork is drawn facing toward the
LEFT side of the image, but not all of it — some Pokémon
(see ARTWORK_FACES_RIGHT above) are drawn in action poses
that face RIGHT instead.

getArtworkNaturalFacing() looks up which way this
particular Pokémon's artwork naturally faces, and we only
mirror it when that natural facing doesn't already match
the direction the fighter needs to face.

This makes:

PLAYER  --->    <---  ENEMY
============================================================
*/

function drawPokemonImage(fighter, image, pokemon) {
  /* Real-world size relative to the opponent, instead of every
     Pokémon rendering at the same fixed size. */
  const size = 245 * getSizeScale(pokemon);

  ctx.save();

  /*
  Breathing animation — a slow, subtle squash/stretch so even a
  fully idle Pokémon still reads as "alive" up close, layered on
  top of the whole-body idle bob/sway applied in drawFighter().
  */

  if (
    !fighter.jumping &&
    !fighter.attacking &&
    !fighter.hitTimer &&
    !fighter.dodging
  ) {
    const breathe = 1 + Math.sin(fighter.animationTime * 0.06) * 0.02;

    ctx.scale(1, breathe);
  }

  /*
  ============================================================
  FACE EACH OTHER
  ============================================================

  naturalFacing = which way the artwork already faces
  fighter.facing = which way the fighter needs to face

  Mirror only when they disagree.
  */

  const naturalFacing = getArtworkNaturalFacing(pokemon);

  ctx.scale(naturalFacing * fighter.facing, 1);

  /*
  Jump animation.
  */

  if (fighter.jumping) {
    ctx.rotate(fighter.facing * -0.045);

    ctx.scale(0.97, 1.03);
  }

  /*
  Dodge animation.
  */

  if (fighter.dodging) {
    ctx.scale(1.12, 0.88);
  }

  /*
  Attack animation.

  Move forward in the direction
  the Pokémon is facing.
  */

  if (fighter.attacking) {
    const progress = 1 - fighter.attackTimer / GAME.attackDuration;

    const attackProgress = clamp(progress, 0, 1);

    const attackMove = Math.sin(attackProgress * Math.PI) * 18;

    ctx.translate(attackMove, 0);

    ctx.rotate(Math.sin(attackProgress * Math.PI) * 0.035);
  }

  /*
  Attack / hit glow.
  */

  if (fighter.attacking || fighter.hitTimer > 0) {
    ctx.shadowColor = fighter === player ? "#ffe14a" : "#ff6688";

    ctx.shadowBlur = 12;
  }

  /*
  Draw artwork.
  */

  ctx.drawImage(image, -size / 2, -size + 15, size, size);

  ctx.shadowBlur = 0;

  ctx.restore();
}

/* ============================================================
   FALLBACK POKÉMON
============================================================ */

function drawFallbackPokemon(fighter) {
  const color = fighter === player ? "#ffd43b" : "#ef476f";

  ctx.save();

  /*
  Also make fallback face the
  same direction as the real
  Pokémon.
  */

  ctx.scale(fighter.facing, 1);

  ctx.fillStyle = color;

  ctx.beginPath();

  ctx.ellipse(0, -90, 58, 72, 0, 0, Math.PI * 2);

  ctx.fill();

  ctx.beginPath();

  ctx.arc(0, -165, 50, 0, Math.PI * 2);

  ctx.fill();

  ctx.fillStyle = "#111827";

  ctx.beginPath();

  ctx.arc(-17, -170, 7, 0, Math.PI * 2);

  ctx.arc(17, -170, 7, 0, Math.PI * 2);

  ctx.fill();

  ctx.restore();
}

/* ============================================================
   NAME
============================================================ */

function drawName(fighter, pokemon, sizeScale) {
  ctx.save();

  ctx.textAlign = "center";

  ctx.font = "bold 19px Arial";

  ctx.fillStyle = "#ffffff";

  ctx.strokeStyle = "#06111d";

  ctx.lineWidth = 5;

  /* Nametag floats above the sprite's actual (scaled) height so it
     doesn't overlap a giant Pokémon or hover too far above a tiny one. */
  const scale = typeof sizeScale === "number" ? sizeScale : 1;

  const nameY = fighter.y - 245 * scale - 20;

  const label = fighterLabel(pokemon);

  ctx.strokeText(label, fighter.x, nameY);

  ctx.fillText(label, fighter.x, nameY);

  ctx.restore();
}

/* ============================================================
   SHIELD
============================================================ */

function drawShield(fighter) {
  ctx.save();

  ctx.strokeStyle = "#5de4ff";

  ctx.lineWidth = 6;

  ctx.globalAlpha = 0.75;

  ctx.beginPath();

  if (fighter.facing === 1) {
    ctx.arc(50, -110, 78, -Math.PI / 2, Math.PI / 2);
  } else {
    ctx.arc(-50, -110, 78, Math.PI / 2, Math.PI * 1.5);
  }

  ctx.stroke();

  ctx.restore();
}

/* ============================================================
   MELEE ATTACK
============================================================ */

function drawMeleeAttack(fighter, move) {
  const progress = 1 - fighter.attackTimer / GAME.attackDuration;

  if (progress < 0.2) {
    return;
  }

  const alpha = clamp(Math.sin(progress * Math.PI), 0, 1);

  ctx.save();

  ctx.globalAlpha = alpha;

  ctx.strokeStyle = move.color;

  ctx.lineWidth = 10;

  ctx.beginPath();

  if (fighter.facing === 1) {
    ctx.arc(70, -110, 85, -1.15, 1.15);
  } else {
    ctx.arc(-70, -110, 85, Math.PI - 1.15, Math.PI + 1.15);
  }

  ctx.stroke();

  ctx.restore();
}

/* ============================================================
   DRAW PROJECTILES
============================================================ */

function drawProjectiles() {
  for (let i = 0; i < projectiles.length; i++) {
    const p = projectiles[i];

    ctx.save();

    ctx.shadowColor = p.move.color;

    ctx.shadowBlur = 12;

    if (p.move.type === "electric") {
      drawLightningOrb(p.x, p.y, p.radius);
    } else if (p.move.type === "water") {
      drawWaterOrb(p.x, p.y, p.radius);
    } else if (p.move.type === "fire") {
      drawFireball(p.x, p.y, p.radius);
    } else if (p.move.type === "ghost") {
      drawGhostBall(p.x, p.y, p.radius);
    } else {
      drawGenericOrb(p.x, p.y, p.radius, p.move.color);
    }

    ctx.restore();
  }
}

/* ============================================================
   ELECTRIC PROJECTILE
============================================================ */

function drawLightningOrb(x, y, radius) {
  ctx.fillStyle = "#ffe14a";

  ctx.beginPath();

  ctx.arc(x, y, radius, 0, Math.PI * 2);

  ctx.fill();

  ctx.strokeStyle = "#fff9a6";

  ctx.lineWidth = 3;

  ctx.beginPath();

  ctx.moveTo(x - radius, y);

  ctx.lineTo(x - 3, y - radius);

  ctx.lineTo(x + 2, y + 3);

  ctx.lineTo(x + radius, y - 4);

  ctx.stroke();
}

/* ============================================================
   WATER PROJECTILE
============================================================ */

function drawWaterOrb(x, y, radius) {
  ctx.fillStyle = "#42b9ff";

  ctx.beginPath();

  ctx.arc(x, y, radius, 0, Math.PI * 2);

  ctx.fill();

  ctx.globalAlpha = 0.45;

  ctx.fillStyle = "#d5f6ff";

  ctx.beginPath();

  ctx.arc(x - 4, y - 4, radius * 0.45, 0, Math.PI * 2);

  ctx.fill();
}

/* ============================================================
   FIRE PROJECTILE
============================================================ */

function drawFireball(x, y, radius) {
  ctx.fillStyle = "#ff6a22";

  ctx.beginPath();

  ctx.arc(x, y, radius, 0, Math.PI * 2);

  ctx.fill();

  ctx.fillStyle = "#fff2a3";

  ctx.beginPath();

  ctx.arc(x - 3, y - 3, radius * 0.45, 0, Math.PI * 2);

  ctx.fill();
}

/* ============================================================
   GHOST PROJECTILE
============================================================ */

function drawGhostBall(x, y, radius) {
  ctx.fillStyle = "#a75bea";

  ctx.beginPath();

  ctx.arc(x, y, radius, 0, Math.PI * 2);

  ctx.fill();

  ctx.globalAlpha = 0.55;

  ctx.strokeStyle = "#e1b5ff";

  ctx.lineWidth = 3;

  ctx.stroke();
}

/* ============================================================
   GENERIC PROJECTILE
============================================================ */

function drawGenericOrb(x, y, radius, color) {
  ctx.fillStyle = color;

  ctx.beginPath();

  ctx.arc(x, y, radius, 0, Math.PI * 2);

  ctx.fill();

  ctx.globalAlpha = 0.35;

  ctx.fillStyle = "#ffffff";

  ctx.beginPath();

  ctx.arc(x - 4, y - 4, radius * 0.4, 0, Math.PI * 2);

  ctx.fill();
}

/* ============================================================
   PARTICLE DRAW
============================================================ */

function drawParticles() {
  if (!particles.length) {
    return;
  }

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);

    ctx.fillStyle = p.color;

    ctx.fillRect(p.x, p.y, p.size, p.size);
  }

  ctx.globalAlpha = 1;
}

/* ============================================================
   EFFECT DRAW
============================================================ */

function drawEffects() {
  for (let i = 0; i < effects.length; i++) {
    const effect = effects[i];

    const progress = 1 - effect.life / effect.maxLife;

    const alpha = 1 - progress;

    ctx.save();

    ctx.globalAlpha = alpha;

    ctx.strokeStyle = effect.color;

    ctx.fillStyle = effect.color;

    if (effect.type === "ring") {
      const radius = effect.radius + progress * 70;

      ctx.lineWidth = 4;

      ctx.beginPath();

      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);

      ctx.stroke();
    } else if (effect.type === "burst") {
      const radius = effect.radius * (1 + progress);

      ctx.lineWidth = 3;

      ctx.beginPath();

      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);

      ctx.stroke();
    } else if (effect.type === "impact") {
      const radius = effect.radius + progress * 55;

      ctx.lineWidth = 8 * (1 - progress);

      ctx.beginPath();

      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);

      ctx.stroke();

      for (let r = 0; r < 6; r++) {
        const angle = (r * Math.PI) / 3;

        const x1 = effect.x + Math.cos(angle) * radius;

        const y1 = effect.y + Math.sin(angle) * radius;

        const x2 = effect.x + Math.cos(angle) * (radius + 25);

        const y2 = effect.y + Math.sin(angle) * (radius + 25);

        ctx.beginPath();

        ctx.moveTo(x1, y1);

        ctx.lineTo(x2, y2);

        ctx.stroke();
      }
    } else if (effect.type === "charge") {
      const radius = effect.radius + Math.sin(progress * Math.PI) * 20;

      ctx.lineWidth = 4;

      ctx.beginPath();

      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);

      ctx.stroke();
    } else if (effect.type === "dash") {
      ctx.lineWidth = 5;

      ctx.beginPath();

      ctx.arc(
        effect.x,
        effect.y,
        effect.radius * (1 - progress),
        0,
        Math.PI * 2,
      );

      ctx.stroke();
    } else if (effect.type === "pokeball") {
      /* THROWN-BALL SEND-OUT. The trainer throws the ball from their
         side of the screen in an arc; it lands where the Pokémon will
         stand, shakes, and bursts open (with a flash in that ball's
         own color) as the Pokémon appears. The ball is drawn with the
         real artwork of the ball type the Pokémon was CAUGHT in (see
         ballIdFor); wild/online Pokémon use the plain default ball. */

      const sprite = effect.ballId ? ballSpriteCache[effect.ballId] : null;

      const half = 26;

      const fromX = effect.fromX;
      const fromY = effect.fromY;

      const dir = effect.fromX < effect.x ? 1 : -1;

      const FLIGHT = 0.5;

      const drawBall = function (spin, alpha) {
        ctx.save();

        ctx.globalAlpha = alpha;
        ctx.rotate(spin);

        if (sprite && sprite.img.complete && sprite.img.naturalWidth > 0) {
          ctx.drawImage(sprite.img, -half, -half, half * 2, half * 2);
        } else {
          const r = 17;
          const lidColor = sprite && sprite.color ? sprite.color : "#ee4b4b";

          ctx.fillStyle = "#f4f4f4";
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.save();
          ctx.beginPath();
          ctx.rect(-r - 1, -r - 1, r * 2 + 2, r + 1);
          ctx.clip();
          ctx.fillStyle = lidColor;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.strokeStyle = "#181818";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-r, 0);
          ctx.lineTo(r, 0);
          ctx.stroke();

          ctx.fillStyle = "#181818";
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#f4f4f4";
          ctx.beginPath();
          ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      };

      /* Position along the throw arc for flight fraction u (0..1). */
      const arcPos = function (u) {
        return {
          x: fromX + (effect.x - fromX) * u,
          y:
            fromY +
            (effect.y - fromY) * u -
            4 * 150 * u * (1 - u),
        };
      };

      if (progress < FLIGHT) {
        const u = progress / FLIGHT;

        /* A short fading trail behind the ball. */
        for (let k = 3; k >= 1; k--) {
          const uu = Math.max(0, u - k * 0.05);
          const tp = arcPos(uu);

          ctx.save();
          ctx.translate(tp.x, tp.y);
          drawBall(uu * Math.PI * 5 * dir, 0.16 * (4 - k));
          ctx.restore();
        }

        const p = arcPos(u);

        ctx.save();
        ctx.translate(p.x, p.y);
        drawBall(u * Math.PI * 5 * dir, 1);
        ctx.restore();
      } else {
        /* Landed: wobble, then fade as it bursts open. */
        const t = (progress - FLIGHT) / (1 - FLIGHT);

        const wobble = Math.sin(t * Math.PI * 7) * 0.35 * (1 - t);
        const ballAlpha = t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.3);

        if (ballAlpha > 0) {
          ctx.save();
          ctx.translate(effect.x, effect.y - Math.sin(t * Math.PI) * 6);
          drawBall(wobble, ballAlpha);
          ctx.restore();
        }

        /* The "opens" burst. */
        if (t > 0.4 && t < 0.95) {
          const flashT = (t - 0.4) / 0.55;

          ctx.save();

          ctx.globalAlpha = (1 - flashT) * 0.85;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, 12 + flashT * 64, 0, Math.PI * 2);
          ctx.fill();

          const ring = sprite && sprite.color ? sprite.color : "#ff6b6b";

          ctx.globalAlpha = (1 - flashT) * 0.8;
          ctx.strokeStyle = ring;
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, 20 + flashT * 90, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
        }
      }
    }

    ctx.restore();
  }
}

/* ============================================================
   FLOATING TEXT DRAW
============================================================ */

function drawFloatingTexts() {
  for (let i = 0; i < floatingTexts.length; i++) {
    const item = floatingTexts[i];

    ctx.save();

    ctx.globalAlpha = clamp(item.life / item.maxLife, 0, 1);

    ctx.textAlign = "center";

    ctx.font = "900 23px Arial";

    ctx.fillStyle = item.color;

    ctx.strokeStyle = "#06111d";

    ctx.lineWidth = 5;

    ctx.strokeText(item.text, item.x, item.y);

    ctx.fillText(item.text, item.x, item.y);

    ctx.restore();
  }
}

/* ============================================================
   MOVE SLOTS (hotkeys 1-4)

   playerPokemon.moveSlots / enemyPokemon.moveSlots (see
   normalizePokemon) hold up to 4 real moves for a Pokémon whose
   trainer has actually caught it — app.js resolves and keeps this
   current as XP is earned. Read fresh at the moment of each attack
   rather than cached in a separate variable, so it's always in
   sync with whichever Pokémon is currently active (no extra
   bookkeeping needed at every switch/faint/online-update site that
   already juggles playerMove/enemyMove).
============================================================ */

/* Attacks with a specific move slot (hotkey 1-4) if the fighter's
   Pokémon has a resolved moveset, otherwise just attacks with
   whatever its single move already is — always safe to call even
   for a Pokémon with no moveSlots (online opponents, wild AI, a
   move set that hasn't finished resolving yet). */
function attackWithMoveSlot(fighter, pokemon, slotIndex) {
  const slots =
    pokemon && Array.isArray(pokemon.moveSlots) && pokemon.moveSlots.length
      ? pokemon.moveSlots
      : null;

  if (slots) {
    const chosen = slots[slotIndex] || slots[slots.length - 1];

    if (fighter === player) {
      playerMove = chosen;
    } else {
      enemyMove = chosen;
    }
  }

  startAttack(fighter);
}

/* AI and local Player 2 don't have individually-bound hotkeys for
   each move — instead they pick a random known move each time they
   attack, so a Pokémon with a real moveset still visibly shows off
   more than one move over the course of a fight. */
function attackWithRandomMoveSlot(fighter, pokemon) {
  const slots =
    pokemon && Array.isArray(pokemon.moveSlots) && pokemon.moveSlots.length
      ? pokemon.moveSlots
      : null;

  if (slots) {
    const chosen = slots[Math.floor(Math.random() * slots.length)];

    if (fighter === player) {
      playerMove = chosen;
    } else {
      enemyMove = chosen;
    }
  }

  startAttack(fighter);
}

/* ============================================================
   KEY DOWN
============================================================ */

/* True when the key event belongs to something the player is typing
   into (a text box, search field, room code, …) or the battlefield
   isn't even on screen. In both cases the game's hotkeys (W A S D,
   1-6, arrows, /, Enter…) must stay out of the way — otherwise they
   swallow those letters and digits everywhere on the page. */
function gameKeysShouldIgnore(e) {
  const t = e && e.target;

  if (
    t &&
    (t.isContentEditable ||
      (t.tagName &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName.toUpperCase())))
  ) {
    return true;
  }

  const battlefield = document.getElementById("battlefield-page");

  return !!(battlefield && battlefield.classList.contains("hidden"));
}

window.gameKeysShouldIgnore = gameKeysShouldIgnore;

function handleKeyDown(e) {
  if (gameKeysShouldIgnore(e)) return;

  const key = e.key.toLowerCase();

  keys[key] = true;

  if (
    [
      "w",
      "a",
      "s",
      "d",
      "q",
      "shift",
      "tab",
      "enter",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "/",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ].includes(key)
  ) {
    e.preventDefault();
  }

  /*
  Block is handled per-side below via e.code, since P1 uses the
  left Shift key and P2 (local multiplayer) uses the right one.
  */

  if (key === "shift" && e.code !== "ShiftRight") {
    player.blocking = true;
  }

  if (twoPlayerMode && e.code === "ShiftRight") {
    enemy.blocking = true;
  }

  if (e.repeat) {
    return;
  }

  if (key === "w") {
    jump(player);
  }

  if (key === "s") {
    /* Plain attack — picks a random known move if this Pokémon has
       a resolved moveset (same treatment as AI/Player 2, and what
       the mobile touch-attack button uses, since there's no room
       for 4 separate touch buttons), so there's still visible move
       variety without needing to reach for a specific hotkey. */
    attackWithRandomMoveSlot(player, playerPokemon);
  }

  /* Move hotkeys — 1/2/3/4 pick from Player 1's active Pokémon's
     real moveset (if it has one resolved) and attack immediately,
     same as pressing "s" but with a specific move instead of
     whichever one is currently selected. */

  if (key === "1" || key === "2" || key === "3" || key === "4") {
    attackWithMoveSlot(player, playerPokemon, Number(key) - 1);
  }

  /* 5 = throw a Poké Ball at the wild opponent (1-player, 1v1
     only); 6 = switch which ball type is thrown. */
  if (key === "5") {
    throwPokeballHotkey();
  }

  if (key === "6" && !twoPlayerMode && !onlineBattleActive) {
    if (typeof window.cycleBallInBattle === "function") {
      window.cycleBallInBattle();
      updateBallHint();
    }
  }

  if (key === "q") {
    dodge(player);
  }

  /* Switch active Pokémon mid-fight. Tab always switches P1's
     team; Enter switches P2's team when local 2-player is on. */

  if (key === "tab") {
    cycleSwitch(true);
  }

  if (key === "enter" && twoPlayerMode) {
    cycleSwitch(false);
  }

  /* Local 2-player controls (arrow keys / slash), only live
     when a second human has taken over the enemy side. */

  if (twoPlayerMode) {
    if (key === "arrowup") {
      jump(enemy);
    }

    if (key === "arrowdown") {
      attackWithRandomMoveSlot(enemy, enemyPokemon);
    }

    if (key === "/") {
      dodge(enemy);
    }
  }
}

/* ============================================================
   POKÉ BALL HOTKEY (5)

   Throws the selected ball at the opponent (works in any 1-player battle). Lower enemy HP and
   better balls raise the chance; if it breaks free the fight goes
   on and you can throw again (after a short delay). A catch ends
   the battle as a win.
============================================================ */

let lastBallThrowAt = 0;

function throwPokeballHotkey() {
  if (battleEnded || !gameRunning) return;

  if (twoPlayerMode || onlineBattleActive) {
    return;
  }

  if (typeof window.throwBallInBattle !== "function") return;

  const now = performance.now();

  if (now - lastBallThrowAt < 1200) return;

  lastBallThrowAt = now;

  const hpFraction = enemy.hp / GAME.maxHP;

  const result = window.throwBallInBattle(enemyPokemon, hpFraction);

  if (result === "caught") {
    showText(enemy.x, enemy.y - 205, "GOTCHA!", "#ffd43b");
    createBurst(enemy.x, enemy.y - 80, "#ffd43b", 24);

    if (enemyTeam.length > 1) {
      /* Team battle: the caught Pokémon leaves the field like a KO
         and the next one is sent in (or the battle ends if it was
         the last). */
      beginKoPause(enemy, player);
    } else {
      finishBattle(player);
    }
  } else if (result === "escaped") {
    showText(enemy.x, enemy.y - 205, "BROKE FREE!", "#ff8787");
  } else if (result === "no-balls") {
    showText(player.x, player.y - 205, "NO BALLS!", "#ff8787");
  } else if (result === "skip") {
    showText(enemy.x, enemy.y - 205, "ALREADY CAUGHT", "#9aa7b8");
  }

  updateBallHint();
}

function updateBallHint() {
  const el = document.getElementById("ball-hotkey-hint");

  if (!el) return;

  if (
    twoPlayerMode ||
    onlineBattleActive ||
    typeof window.getActiveBallLabel !== "function"
  ) {
    el.classList.add("hidden");
    return;
  }

  el.innerHTML =
    "<span><b>5</b>Throw " +
    window.getActiveBallLabel() +
    "</span><span><b>6</b>Change ball</span>";

  el.classList.remove("hidden");
}

/* ============================================================
   KEY UP
============================================================ */

function handleKeyUp(e) {
  const key = e.key.toLowerCase();

  keys[key] = false;

  if (key === "shift" && e.code !== "ShiftRight") {
    player.blocking = false;
  }

  if (twoPlayerMode && e.code === "ShiftRight") {
    enemy.blocking = false;
  }
}

/* ============================================================
   HEALTH BARS
============================================================ */

function updateHealthBars() {
  const p1 = document.getElementById("p1-hp");

  const p2 = document.getElementById("p2-hp");

  if (p1) {
    p1.style.width = clamp(player.hp, 0, 100) + "%";
  }

  if (p2) {
    p2.style.width = clamp(enemy.hp, 0, 100) + "%";
  }
}

/* ============================================================
   TEAM PIPS (6v6 roster status)
============================================================ */

function updateTeamPips() {
  renderTeamPips("p1-team-pips", playerTeam, playerTeamIndex);
  renderTeamPips("p2-team-pips", enemyTeam, enemyTeamIndex);
}

function renderTeamPips(elementId, team, currentIndex) {
  const el = document.getElementById(elementId);

  if (!el) {
    return;
  }

  if (!team || team.length <= 1) {
    el.innerHTML = "";

    return;
  }

  const isPlayerSide = elementId === "p1-team-pips";

  /* Enemy pips only become switchable when a human (not the AI)
     is controlling that side. */
  const clickable = isPlayerSide || twoPlayerMode;

  let html = "";

  for (let i = 0; i < team.length; i++) {
    const fainted = team[i] && team[i].fainted;

    const isCurrent = i === currentIndex && !fainted;

    let cls = "pip";

    if (fainted) {
      cls += " pip-fainted";
    } else if (isCurrent) {
      cls += " pip-current";
    } else {
      cls += " pip-alive";

      if (clickable) {
        cls += " pip-clickable";
      }
    }

    const title = team[i] ? fighterLabel(team[i]) : "";

    html +=
      '<span class="' +
      cls +
      '" data-index="' +
      i +
      '" title="' +
      title +
      '"></span>';
  }

  el.innerHTML = html;

  if (clickable) {
    el.querySelectorAll(".pip-clickable").forEach(function (pip) {
      pip.onclick = function () {
        switchToIndex(isPlayerSide, Number(pip.dataset.index));
      };
    });
  }
}

/* ============================================================
   POKÉMON LABELS
============================================================ */

function getBattleTrainerNames() {
  const online = window.onlineTrainerNames;

  if (onlineBattleActive && online) {
    return {
      player: online.mine || "Trainer",
      enemy: online.opponent || "Trainer",
    };
  }

  const mine =
    typeof window.getMyTrainerName === "function"
      ? window.getMyTrainerName()
      : "Trainer";

  return {
    player: mine,
    enemy: twoPlayerMode ? "Player 2" : "CPU",
  };
}

function updatePokemonLabels() {
  const p1 = document.getElementById("p1-label");

  const p2 = document.getElementById("p2-label");

  /* A quick visual tell for a Legendary/Mythical Pokémon — it hits
     harder and shrugs off more damage (see LEGENDARY_POKEMON), so
     it's worth being obvious about which one you're facing. */
  const playerBadge = isLegendaryPokemon(playerPokemon) ? "✨ " : "";
  const enemyBadge = isLegendaryPokemon(enemyPokemon) ? "✨ " : "";

  if (p1) {
    p1.textContent = playerBadge + fighterLabel(playerPokemon);
  }

  if (p2) {
    p2.textContent = enemyBadge + fighterLabel(enemyPokemon);
  }

  /*
  Trainer names under each Pokémon label. Online matches use the
  names from matchmaking; local/AI and 2-player matches use this
  device's trainer name vs "CPU" / "Player 2".
  */

  const trainerNames = getBattleTrainerNames();

  const p1Trainer = document.getElementById("p1-trainer");

  const p2Trainer = document.getElementById("p2-trainer");

  if (p1Trainer) {
    p1Trainer.textContent = trainerNames.player;
  }

  if (p2Trainer) {
    p2Trainer.textContent = trainerNames.enemy;
  }

  /*
  Home-compatible labels.
  */

  const playerName = document.getElementById("player-name");

  const enemyName = document.getElementById("enemy-name");

  if (playerName) {
    playerName.textContent = playerBadge + fighterLabel(playerPokemon);
  }

  updateTeamPips();

  if (enemyName) {
    enemyName.textContent = enemyBadge + fighterLabel(enemyPokemon);
  }

  /*
  Move-slot hotkey hint (1-4).
  */

  updateBallHint();

  const movesHint = document.getElementById("move-hotkeys-hint");

  if (movesHint) {
    const slots =
      playerPokemon &&
      Array.isArray(playerPokemon.moveSlots) &&
      playerPokemon.moveSlots.length
        ? playerPokemon.moveSlots
        : null;

    if (slots) {
      movesHint.innerHTML = slots
        .map(function (m, i) {
          return "<span><b>" + (i + 1) + "</b>" + m.name + "</span>";
        })
        .join("");

      movesHint.classList.remove("hidden");
    } else {
      movesHint.innerHTML = "";
      movesHint.classList.add("hidden");
    }

    /* Same moves as tappable buttons for touch screens. */
    const touchMoves = document.getElementById("touch-moves");

    if (touchMoves) {
      if (slots) {
        touchMoves.innerHTML = slots
          .map(function (m, i) {
            return (
              '<button type="button" class="touch-move-btn" data-slot="' +
              (i + 1) +
              '"><b>' +
              (i + 1) +
              "</b>" +
              m.name +
              "</button>"
            );
          })
          .join("");

        touchMoves.classList.remove("hidden");
      } else {
        touchMoves.innerHTML = "";
        touchMoves.classList.add("hidden");
      }
    }
  }

  /*
  Type labels.
  */

  const playerType = document.getElementById("player-type");

  const enemyType = document.getElementById("enemy-type");

  if (playerType) {
    playerType.textContent = getPokemonType(playerPokemon).toUpperCase();
  }

  if (enemyType) {
    enemyType.textContent = getPokemonType(enemyPokemon).toUpperCase();
  }

  /*
  Controls — or, in an online match, the trainer-vs-trainer banner
  instead (there's no local "AI" side to describe, and re-showing
  the banner here keeps it visible after a mid-match Pokémon
  switch instead of it getting stomped by control hints that don't
  apply to a server-driven match anyway).
  */

  if (onlineBattleActive) {
    updateTranscript(onlineBattleBannerText());
    return;
  }

  const p1Text =
    formatPokemonName(playerPokemon.name) +
    ": W Jump • A/D Move • S " +
    playerMove.name +
    " • Q Dodge • Shift Block • Tab Switch";

  const p2Text = twoPlayerMode
    ? formatPokemonName(enemyPokemon.name) +
      ": ↑ Jump • ←/→ Move • ↓ " +
      enemyMove.name +
      " • / Dodge • RShift Block • Enter Switch"
    : formatPokemonName(enemyPokemon.name) + ": AI";

  updateTranscript(p1Text + " | " + p2Text);
}

/* ============================================================
   TRANSCRIPT
============================================================ */

function updateTranscript(text) {
  const element = document.getElementById("controls-transcript");

  if (element) {
    element.textContent = text;
  }
}

/* ============================================================
   FINISH BATTLE
============================================================ */

function finishBattle(winner) {
  if (battleEnded) {
    return;
  }

  battleEnded = true;

  gameRunning = false;

  if (animationId) {
    cancelAnimationFrame(animationId);

    animationId = null;
  }

  const playerWon = winner === player;

  /* Sync the currently-active Pokémon's live battle hp back into
     the team-data object one last time — switching/fainting
     already keep this in sync for anyone who left the field
     mid-battle, but whichever Pokémon is still in when the match
     itself ends never gets that sync otherwise, and app.js reads
     playerTeam right after this to persist the damage. */
  if (playerTeam[playerTeamIndex]) {
    playerTeam[playerTeamIndex].hp = player.hp;
  }

  if (enemyTeam[enemyTeamIndex]) {
    enemyTeam[enemyTeamIndex].hp = enemy.hp;
  }

  const isTeamBattle = playerTeam.length > 1 || enemyTeam.length > 1;

  const bannerText = isTeamBattle
    ? playerWon
      ? "YOU WIN THE BATTLE!"
      : formatPokemonName(enemyPokemon.name).toUpperCase() + "'S TEAM WINS!"
    : formatPokemonName(
        winner === player ? playerPokemon.name : enemyPokemon.name,
      ) + " WINS!";

  createBurst(GAME.width / 2, 210, "#ffd43b", 20);

  showText(GAME.width / 2, 170, bannerText, "#ffd43b");

  updateTranscript("🏆 " + bannerText);

  draw();

  setTimeout(function () {
    exitBattleLandscape();

    if (typeof window.showHomeScreen === "function") {
      /* Hides battlefield/roster/league and shows home in one place
         — see showHomeScreen in app.js for why this replaced hiding
         just this one screen directly. */
      window.showHomeScreen();
    } else {
      const battlefield = document.getElementById("battlefield-page");
      const home = document.getElementById("home-page");

      if (battlefield) {
        battlefield.classList.add("hidden");
      }

      if (home) {
        home.classList.remove("hidden");
      }
    }

    /*
    Let app.js know how the battle ended (used to capture the
    opponent's Pokémon on a win). Defined outside game.js so
    game.js has no direct dependency on the capture feature.
    */

    if (typeof window.onBattleFinished === "function") {
      window.onBattleFinished(
        playerWon,
        enemyPokemon,
        playerPokemon,
        enemyTeam,
        playerTeam,
      );
    }
  }, 1800);
}

/* ============================================================
   STOP GAME
============================================================ */

function stopGame() {
  gameRunning = false;

  if (animationId) {
    cancelAnimationFrame(animationId);

    animationId = null;
  }

  window.removeEventListener("keydown", handleKeyDown);

  window.removeEventListener("keyup", handleKeyUp);
}

/* ============================================================
   PUBLIC API
============================================================ */

window.PokemonBattle = {
  start: function (homePlayer, homeOpponent, homePlayerMove, homeEnemyMove) {
    initGameEngine(homePlayer, homeOpponent, homePlayerMove, homeEnemyMove);
  },

  startTeam: function (homePlayerTeam, homeOpponentTeam, isTwoPlayer) {
    initTeamBattleEngine(homePlayerTeam, homeOpponentTeam, isTwoPlayer);
  },

  restart: function () {
    /* Full rematch — everyone's back in, nobody's fainted. */

    playerTeam.forEach(function (p) {
      p.fainted = false;
      p.hp = GAME.maxHP;
    });

    enemyTeam.forEach(function (p) {
      p.fainted = false;
      p.hp = GAME.maxHP;
    });

    player.switchLock = 0;
    enemy.switchLock = 0;

    playerTeamIndex = 0;
    enemyTeamIndex = 0;

    playerPokemon = playerTeam[0] || playerPokemon;
    enemyPokemon = enemyTeam[0] || enemyPokemon;

    resetBattle();

    updatePokemonLabels();
    updateTeamPips();

    /*
    Keep whatever moves are already active (which may be
    real API-fetched moves) instead of recomputing the
    type-based fallback on every rematch.
    */

    playerMove = getMove(playerPokemon);

    enemyMove = getMove(enemyPokemon);

    gameRunning = true;

    battleEnded = false;

    lastTime = performance.now();

    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    animationId = requestAnimationFrame(gameLoop);
  },

  stop: function () {
    stopGame();
  },

  getPokemon: function () {
    return {
      player: playerPokemon,

      enemy: enemyPokemon,
    };
  },

  attack: function () {
    startAttack(player);
  },

  jump: function () {
    jump(player);
  },

  dodge: function () {
    dodge(player);
  },

  block: function (value) {
    player.blocking = Boolean(value);
  },
};

/* ============================================================
   GLOBAL SELECTION API
============================================================ */

window.setBattlePokemon = function (p1, p2) {
  const first = normalizePokemon(p1);

  const second = normalizePokemon(p2);

  if (first) {
    playerPokemon = first;
  }

  if (second) {
    enemyPokemon = second;
  }

  playerMove = getMove(playerPokemon);

  enemyMove = getMove(enemyPokemon);

  updatePokemonLabels();

  try {
    localStorage.setItem("pokemonP1", JSON.stringify(playerPokemon));

    localStorage.setItem("pokemonP2", JSON.stringify(enemyPokemon));
  } catch (error) {
    console.warn("Could not save battle Pokémon.");
  }
};

/* ============================================================
   EXPOSE TYPE MOVE VISUALS
============================================================

app.js fetches each fighter's real moves from PokéAPI and
needs sane projectile/color/range/speed defaults per type
to render them. Expose the existing table read-only.
============================================================ */

window.TYPE_MOVES = TYPE_MOVES;

/* ============================================================
   ONLINE BATTLE — RENDERING BRIDGE

   For an online match, a dedicated server (see the match server's
   own src/battle-sim.js — an independent port of the physics/
   combat rules above) runs the ACTUAL simulation. This client
   never runs its own physics for an online match — it only paints
   whatever state the server sends, using the exact same rendering
   code (draw(), health bars, particles, etc.) local battles use,
   so an online battle looks and feels the same. Keyboard input is
   sent to the server (see app.js) instead of being applied here.
============================================================ */

let onlineBattleActive = false;
let onlineMySide = null; // "a" or "b" — which snapshot side is "me"

async function startOnlineBattleEngine(myTeamData, opponentTeamData, mySide) {
  const battlefield = document.getElementById("battlefield-page");
  const home = document.getElementById("home-page");

  if (!battlefield) {
    console.error("Battlefield missing.");
    return;
  }

  const normalizedPlayerTeam = (
    Array.isArray(myTeamData) ? myTeamData : [myTeamData]
  )
    .map(normalizePokemon)
    .filter(Boolean);

  const normalizedEnemyTeam = (
    Array.isArray(opponentTeamData) ? opponentTeamData : [opponentTeamData]
  )
    .map(normalizePokemon)
    .filter(Boolean);

  if (!normalizedPlayerTeam.length || !normalizedEnemyTeam.length) {
    console.error("Online battle: missing team data.");
    return;
  }

  normalizedPlayerTeam.forEach(function (p) {
    p.fainted = false;
    p.hp = GAME.maxHP;
  });

  normalizedEnemyTeam.forEach(function (p) {
    p.fainted = false;
    p.hp = GAME.maxHP;
  });

  onlineBattleActive = true;
  onlineMySide = mySide;
  twoPlayerMode = false;

  playerTeam = normalizedPlayerTeam;
  enemyTeam = normalizedEnemyTeam;

  playerTeamIndex = 0;
  enemyTeamIndex = 0;

  playerPokemon = playerTeam[0];
  enemyPokemon = enemyTeam[0];

  /* Remembered so the Home screen can show who you actually just
     fought online, instead of an unrelated freshly-rerolled wild
     Pokémon — see loadFighters() in app.js, which reads this once
     and then clears it. Written here (battle start) rather than at
     the end so it's captured even if the player leaves mid-match
     via the Home button, which reloads the page. */
  try {
    localStorage.setItem(
      "pf_last_online_matchup",
      JSON.stringify({
        mine: { name: playerPokemon.name, id: playerPokemon.id },
        opponent: { name: enemyPokemon.name, id: enemyPokemon.id },
        opponentTrainer:
          (window.onlineTrainerNames && window.onlineTrainerNames.opponent) ||
          null,
      }),
    );
  } catch (e) {
    /* Non-fatal — Home just falls back to a random wild opponent. */
  }

  battlefield.classList.remove("hidden");
  battlefield.style.display = "block";
  battlefield.style.visibility = "visible";
  battlefield.style.opacity = "1";
  battlefield.style.position = "fixed";
  battlefield.style.inset = "0";
  battlefield.style.width = "100dvw";
  battlefield.style.height = "100dvh";

  if (home) {
    home.classList.add("hidden");
  }

  if (window.showVsIntro) {
    const names = window.onlineTrainerNames;

    window.showVsIntro(
      (names && names.mine) || "You",
      (names && names.opponent) || "Trainer",
    );
  }

  enterBattleLandscape();

  if (!createCanvas()) {
    return;
  }

  playerMove = getMove(playerPokemon);
  enemyMove = getMove(enemyPokemon);

  resetBattle();

  playerImage = null;
  enemyImage = null;

  loadPokemonImage(playerPokemon).then(function (image) {
    playerImage = image;
  });

  loadPokemonImage(enemyPokemon).then(function (image) {
    enemyImage = image;
  });

  updatePokemonLabels();
  updateHealthBars();
  updateTeamPips();

  /* Online input goes through app.js -> WebSocket, never straight
     to the local fighter objects — make sure the local keyboard
     handlers (from a previous local battle this session) aren't
     also still attached and fighting for control. */
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  gameRunning = true;
  battleEnded = false;

  lastTime = performance.now();

  draw();

  animationId = requestAnimationFrame(onlineRenderLoop);

  updateTranscript(onlineBattleBannerText());
}

/* "ALEX VS LUCIA" when both sides' trainer names made it through
   the match server (see buildOnlineTeamPayload/normalizePokemon),
   falling back to the old "trainer-pokemon VS trainer-pokemon"
   phrasing if either side is missing one for any reason. */
function onlineBattleBannerText() {
  const names = window.onlineTrainerNames;
  const myTrainer = names && names.mine;
  const oppTrainer = names && names.opponent;

  if (myTrainer && oppTrainer) {
    return (
      "TRAINER BATTLE! " +
      myTrainer.toUpperCase() +
      " VS " +
      oppTrainer.toUpperCase()
    );
  }

  return (
    "ONLINE BATTLE! " + fighterLabel(playerPokemon) + " VS " + fighterLabel(enemyPokemon)
  );
}

function onlineRenderLoop(time) {
  if (!gameRunning || !onlineBattleActive) {
    return;
  }

  let dt = (time - lastTime) / 16.6667;
  dt = clamp(dt, 0.5, 1.7);
  lastTime = time;

  /* Render fighters and projectiles at their interpolated position
     between two real, known server updates — see
     interpolateOnlinePosition for why this (not a chase-the-target
     filter) is what actually matches offline's smoothness. */
  interpolateOnlinePosition(player);
  interpolateOnlinePosition(enemy);

  for (let i = 0; i < projectiles.length; i++) {
    interpolateOnlinePosition(projectiles[i]);
  }

  /* Cosmetic-only systems keep running locally for smoothness
     (hit sparks, floating damage numbers, screen shake) — none of
     these affect who wins, so there's nothing to referee here. */
  updateParticles(dt);
  updateEffects(dt);
  updateFloatingTexts(dt);
  updateScreenShake(dt);

  /* The send-out/recall pop-in animation (see drawFighter's
     swapScale) is purely cosmetic too, so it's timed locally the
     same way rather than needing the server to track it. */
  if (player.swapTimer > 0) {
    player.swapTimer = Math.max(0, player.swapTimer - 16.6667 * dt);
  }

  if (enemy.swapTimer > 0) {
    enemy.swapTimer = Math.max(0, enemy.swapTimer - 16.6667 * dt);
  }

  draw();

  animationId = requestAnimationFrame(onlineRenderLoop);
}

/* How far in the past to render, in ms. The server only broadcasts
   a position ~30 times/sec (~33ms apart); rendering a bit behind
   the very latest arrival guarantees there are always two REAL
   samples on either side of the moment we're drawing, so motion
   between them is genuinely continuous and constant-speed — not an
   approximation. 70ms comfortably covers one tick's worth of normal
   network jitter without adding a delay a player would consciously
   register as lag. */
const ONLINE_RENDER_DELAY_MS = 70;

/* Push a new timestamped sample into an entity's position history,
   trimming old samples we'll never need again. Called for fighters
   in applyOnlineFighterSnapshot and for projectiles in
   applyOnlineProjectilesSnapshot. */
function pushOnlinePositionSample(entity, x, y) {
  if (!entity.posBuffer) {
    entity.posBuffer = [];
  }

  const now = performance.now();

  entity.posBuffer.push({ t: now, x: x, y: y });

  /* Half a second of history is far more than we ever need to
     interpolate — keep the buffer small. */
  while (
    entity.posBuffer.length > 2 &&
    now - entity.posBuffer[0].t > 500
  ) {
    entity.posBuffer.shift();
  }

  if (entity.posBuffer.length === 1) {
    /* First sample ever for this entity — nothing to interpolate
       between yet, so appear at the real position immediately
       instead of waiting out the render delay. */
    entity.x = x;
    entity.y = y;
  }
}

/* Finds the two real samples bracketing "now minus the render
   delay" and linearly blends between them. This is the standard
   entity-interpolation technique used by most real-time multiplayer
   games — it trades a small, constant, barely-perceptible delay for
   motion that's genuinely smooth (constant velocity between two
   known truths) rather than the wobble you get from continuously
   chasing a moving target. */
function interpolateOnlinePosition(entity) {
  const buf = entity.posBuffer;

  if (!buf || !buf.length) {
    return;
  }

  const renderTime = performance.now() - ONLINE_RENDER_DELAY_MS;

  if (renderTime <= buf[0].t) {
    entity.x = buf[0].x;
    entity.y = buf[0].y;
    return;
  }

  const last = buf[buf.length - 1];

  if (renderTime >= last.t) {
    /* No newer data yet (a hiccup, or we've caught up to the very
       latest sample) — hold at the last known real position rather
       than guessing where it might be next. */
    entity.x = last.x;
    entity.y = last.y;
    return;
  }

  for (let i = 0; i < buf.length - 1; i++) {
    const a = buf[i];
    const b = buf[i + 1];

    if (a.t <= renderTime && renderTime <= b.t) {
      const span = b.t - a.t || 1;
      const t = clamp((renderTime - a.t) / span, 0, 1);

      entity.x = a.x + (b.x - a.x) * t;
      entity.y = a.y + (b.y - a.y) * t;
      return;
    }
  }
}

function applyOnlineSnapshot(snapshot) {
  if (!onlineBattleActive || !snapshot || battleEnded) {
    return;
  }

  const otherSide = onlineMySide === "a" ? "b" : "a";

  applyOnlineFighterSnapshot(
    player,
    playerTeam,
    snapshot.fighters[onlineMySide],
    true,
  );

  applyOnlineFighterSnapshot(
    enemy,
    enemyTeam,
    snapshot.fighters[otherSide],
    false,
  );

  applyOnlineProjectilesSnapshot(snapshot.projectiles);

  /* Hit events from the server: the same damage numbers and
     effectiveness callouts a CPU battle shows. */
  (snapshot.events || []).forEach(function (ev) {
    const targetIsMe = ev.target === onlineMySide;
    const victim = targetIsMe ? player : enemy;

    if (ev.eff === 0) {
      showText(victim.x, victim.y - 205, "NO EFFECT...", "#9aa7b8");
      return;
    }

    showText(victim.x, victim.y - 180, "-" + ev.damage, "#ffffff");

    if (ev.eff > 1) {
      showText(victim.x, victim.y - 205, "SUPER EFFECTIVE!", "#ffd43b");
    } else if (ev.eff < 1) {
      showText(victim.x, victim.y - 205, "NOT VERY EFFECTIVE...", "#9aa7b8");
    }

    if (ev.blocked) {
      showText(victim.x, victim.y - 215, "BLOCK!", "#5de4ff");
    }
  });

  updateHealthBars();
}

/* The match server's world x-axis is tied to a fixed side letter
   ("a" always spawns on the left of the arena, "b" always on the
   right) — the same for both connected players. The HUD cards are
   always personalized ("YOU" in the top-left card, no matter which
   side you actually are), so side "b" players used to see their
   own name in the top-left card while their actual sprite — and
   its floating name tag — sat on the right of the screen, with the
   opponent's sprite on the left instead. Mirroring the x-axis (and
   facing) for side "b" makes the arena match the HUD for every
   viewer: your own Pokémon renders on the left and the opponent on
   the right, same as a local battle, regardless of which side the
   server assigned you. */
function mirrorOnlineX(x) {
  return onlineMySide === "b" ? GAME.width - x : x;
}

function mirrorOnlineFacing(facing) {
  return onlineMySide === "b" ? -facing : facing;
}

/* Like fighters, projectiles were being wiped and fully rebuilt from
   the server's list every single snapshot (~30/sec), so they
   teleported between positions with zero gliding at all — the
   fighter smoothing fix didn't touch this. Instead, match each
   incoming server projectile to an existing client-side one (by
   side + type + closest position, since the server doesn't send
   stable per-projectile ids) and glide toward the new position the
   same way fighters do, rather than replacing it outright. */
function applyOnlineProjectilesSnapshot(list) {
  const incoming = list || [];
  const matchedExisting = new Set();
  const next = [];

  incoming.forEach(function (p) {
    const mx = mirrorOnlineX(p.x);

    let best = null;
    let bestDist = Infinity;

    for (let i = 0; i < projectiles.length; i++) {
      const existing = projectiles[i];

      if (
        matchedExisting.has(existing) ||
        existing.side !== p.side ||
        existing.move.type !== p.type
      ) {
        continue;
      }

      /* Compare against its last known real position (not the
         currently-rendered/interpolated one, which lags slightly
         behind by design) so matching stays accurate. */
      const lastSample =
        existing.posBuffer && existing.posBuffer[existing.posBuffer.length - 1];

      const refX = lastSample ? lastSample.x : existing.x;
      const refY = lastSample ? lastSample.y : existing.y;

      const dist = Math.hypot(refX - mx, refY - p.y);

      if (dist < bestDist) {
        best = existing;
        bestDist = dist;
      }
    }

    const radius = p.type === "dragon" ? 17 : 13;

    if (best) {
      matchedExisting.add(best);

      best.move.color = p.color;

      pushOnlinePositionSample(best, mx, p.y);

      next.push(best);
    } else {
      /* Newly spawned projectile — appear instantly at its actual
         position rather than gliding in from nowhere. */
      const fresh = {
        x: mx,
        y: p.y,
        vx: 0,
        vy: 0,
        side: p.side,
        move: { color: p.color, type: p.type },
        radius: radius,
      };

      pushOnlinePositionSample(fresh, mx, p.y);

      next.push(fresh);
    }
  });

  projectiles.length = 0;

  next.forEach(function (p) {
    projectiles.push(p);
  });
}

function applyOnlineFighterSnapshot(fighter, team, data, isPlayerSide) {
  if (!data) {
    return;
  }

  const prevTeamIndex = isPlayerSide ? playerTeamIndex : enemyTeamIndex;
  const wasAttacking = fighter.attacking;

  /* The server only ticks ~30 times/sec and broadcasts a snapshot
     each time, but the browser renders up to 60fps. Feed each real
     position into a short history buffer and let
     interpolateOnlinePosition (called every render frame from
     onlineRenderLoop) blend between two known points — see that
     function for why this reads as smooth instead of the wobble a
     simple chase-the-target filter produces. */
  pushOnlinePositionSample(fighter, mirrorOnlineX(data.x), data.y);

  fighter.facing = mirrorOnlineFacing(data.facing);
  fighter.hp = data.hp;
  fighter.jumping = data.jumping;
  fighter.attacking = data.attacking;
  fighter.blocking = data.blocking;
  fighter.dodging = data.dodging;
  fighter.invulnerable = data.invulnerable;
  fighter.combo = data.combo;

  if (data.hitFlash && !fighter.hitFlash) {
    fighter.hitFlash = 8;

    const attackerMove = isPlayerSide ? enemyMove : playerMove;

    screenShake = fighter.blocking ? 3 : 7;

    createImpactEffect(
      fighter.x - fighter.facing * 10,
      fighter.y - 115,
      attackerMove,
    );

    createBurst(
      fighter.x,
      fighter.y - 115,
      fighter.blocking ? "#62e4ff" : attackerMove.color,
      fighter.blocking ? 8 : 14,
    );
  }

  if (!data.attacking && wasAttacking) {
    fighter.attackTimer = 0;
    fighter.attackHit = false;
  }

  (data.fainted || []).forEach(function (isFainted, i) {
    if (team[i]) {
      team[i].fainted = !!isFainted;
    }
  });

  if (data.teamIndex !== prevTeamIndex && team[data.teamIndex]) {
    fighter.swapTimer = SEND_OUT_MS;
    fighter.swapTimerMax = SEND_OUT_MS;

    spawnPokeballEffect(
      fighter.x,
      fighter.y,
      ballIdFor(isPlayerSide, team[data.teamIndex]),
    );

    if (isPlayerSide) {
      playerTeamIndex = data.teamIndex;
      playerPokemon = team[data.teamIndex];
      playerMove = getMove(playerPokemon);

      loadPokemonImage(playerPokemon).then(function (image) {
        playerImage = image;
      });
    } else {
      enemyTeamIndex = data.teamIndex;
      enemyPokemon = team[data.teamIndex];
      enemyMove = getMove(enemyPokemon);

      loadPokemonImage(enemyPokemon).then(function (image) {
        enemyImage = image;
      });
    }

    updatePokemonLabels();
    updateTeamPips();
  }
}

function finishOnlineBattle(iWon) {
  if (battleEnded) {
    return;
  }

  battleEnded = true;
  gameRunning = false;
  onlineBattleActive = false;

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  const bannerText = iWon ? "YOU WIN THE MATCH!" : "YOU LOSE";

  createBurst(GAME.width / 2, 210, iWon ? "#ffd43b" : "#ff5c5c", 20);
  showText(GAME.width / 2, 170, bannerText, iWon ? "#ffd43b" : "#ff5c5c");
  updateTranscript((iWon ? "🏆 " : "💀 ") + bannerText);

  draw();

  setTimeout(function () {
    stopOnlineBattleEngine();
  }, 1800);
}

function stopOnlineBattleEngine() {
  onlineBattleActive = false;
  onlineMySide = null;
  gameRunning = false;

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  exitBattleLandscape();

  if (typeof window.showHomeScreen === "function") {
    window.showHomeScreen();
  } else {
    const battlefield = document.getElementById("battlefield-page");
    const home = document.getElementById("home-page");

    if (battlefield) {
      battlefield.classList.add("hidden");
    }

    if (home) {
      home.classList.remove("hidden");
    }
  }

  /* Refresh the home matchup (names, art, types, power) from the
     online match that just ended — see window.onOnlineBattleEnded
     in app.js. */
  if (typeof window.onOnlineBattleEnded === "function") {
    window.onOnlineBattleEnded();
  }
}

window.PokemonOnlineBattle = {
  start: startOnlineBattleEngine,
  applySnapshot: applyOnlineSnapshot,
  finish: finishOnlineBattle,
  stop: stopOnlineBattleEngine,
};

/* ============================================================
   STARTUP
============================================================ */

