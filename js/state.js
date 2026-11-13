'use strict';

let S;

function newMeta() {
  const perks = {};
  for (const k in PERKS) perks[k] = 0;
  return { hope: 0, hopeTotal: 0, city: 1, perks, cash: 0, boosts: { prod: 0, furia: 0 }, stats: newStats(), ach: {}, tutorial: {}, ...Endgame.newMetaExtra() };
}

function newState(meta = newMeta(), diff = 'normal') {
  const P = meta.perks, extra = P.estoque * 40;
  return {
    meta,
    diff,
    res: { comida: 25 + extra, sucata: 15 + extra, municao: 30 + extra, remedio: 0 },
    survivors: 3 + P.veteranos,
    people: makeNames(3 + P.veteranos),
    mods: [],
    jobs: { forrageiro: 1, coletor: 1, armeiro: 0, guarda: 1, medico: 0, cientista: 0 },
    build: { muro: 0, horta: 0, oficina: 0, beliche: 0, torre: 0, radio: 0, lab: 0 },
    wallHp: Math.round(100 * (1 + 0.2 * P.engenharia)),
    wallDown: false,
    overflow: 0,
    wave: 1,
    waveTimer: DIFFS[diff].interval,
    horde: { active: false, queue: [], zs: [] },
    exps: [],
    ops: [],
    districts: {},
    zid: 1,
    clickCd: 0,
    starve: 0,
    kills: 0,
    best: 0,
    log: [],
    eventT: EVENT_FIRST,
    merchantT: MERCHANT_FIRST,
    merchant: null,
    last: Date.now(),
  };
}

const perk = k => S.meta.perks[k];
const hopeMult = () => 1 + 0.03 * S.meta.hopeTotal;
const boostMult = () => S.meta.boosts.prod > 0 ? 2 : 1;
const prodMult = () => boostMult() * D().prod * Endgame.mult('prod');
const furia = () => S.meta.boosts.furia > 0;
const foodMult = () => (1 + 0.25 * S.build.horta) * (1 + 0.15 * perk('agricultura')) * hopeMult() * prodMult() * Endgame.mult('food');
const scrapMult = () => (1 + 0.25 * S.build.oficina) * (1 + 0.15 * perk('sucateiros')) * hopeMult() * prodMult() * Endgame.mult('scrap');
const fireMult = () => (1 + 0.12 * perk('treino')) * (furia() ? 2 : 1) * Endgame.mult('fire');
const maxSurv = () => 4 + S.build.beliche * 2 + perk('veteranos');
const maxWall = () => Math.round((100 + S.build.muro * 50) * (1 + 0.2 * perk('engenharia')) * Endgame.mult('wall') * (hasMod('murofraco') ? 0.6 : 1));
const assigned = () => Object.values(S.jobs).reduce((a, b) => a + b, 0);
const away = () => S.exps.reduce((a, e) => a + e.n, 0) + S.ops.reduce((a, o) => a + o.n, 0);
const home = () => S.survivors - away();
const idle = () => S.survivors - assigned() - away();
// Vasculhar rende mais conforme o abrigo cresce
const scavGain = () => {
  const base = 2 + Math.floor(S.wave / 2);
  return {
    comida: Math.max(base, Math.round(S.jobs.forrageiro * 0.6 * foodMult() * 5)),
    sucata: Math.max(base, Math.round(S.jobs.coletor * 0.5 * scrapMult() * 5)),
  };
};
const recruitCost = () => Math.round(12 * Math.pow(1.3, Math.max(0, S.survivors - 3)));
const waveSize = n => Math.round((6 * D().count * Math.pow(D().grow, n - 1) + n) * (hasMod('horda') ? 1.25 : 1));
const hopeGain = () => S.best >= EVAC_WAVE ? Math.floor((Math.pow(S.best - 5, 1.25) + S.kills / 200) * D().hope * (1 + modBonus())) : 0;
// Zumbis ficam mais resistentes e mais fortes a cada onda
const hpMult = n => D().hp * (1 + D().hpGrow * (n - 1));
const dmgMult = n => D().dmg * (1 + 0.04 * (n - 1));
// A horda inteira chega em ~30s: hordas maiores = mais zumbis por segundo
const spawnGap = n => Math.min(1, Math.max(0.12, 30 / waveSize(n)));

function scaledCost(base, mult, lvl) {
  const c = {};
  for (const r in base) c[r] = Math.ceil(base[r] * Math.pow(mult, lvl));
  return c;
}
const buildBlocked = k => k === 'torre' && hasMod('semtorres');
const buildCost = k => scaledCost(BUILD[k].cost, BUILD[k].mult, S.build[k]);
const perkCost = k => Math.ceil(PERKS[k].cost * Math.pow(PERKS[k].mult, perk(k)));
const canAfford = c => Object.entries(c).every(([r, v]) => S.res[r] >= v);
const pay = c => { for (const r in c) S.res[r] -= c[r]; };

function rates() {
  return {
    comida: S.jobs.forrageiro * 0.6 * foodMult() - home() * foodPer(),
    sucata: S.jobs.coletor * 0.5 * scrapMult() - S.jobs.armeiro * 0.3,
    municao: S.jobs.armeiro * AMMO_RATE * prodMult() * Endgame.mult('ammo'),
    remedio: S.jobs.medico * 0.04 * prodMult() * Endgame.mult('meds'),
  };
}

let simulating = false;
const listeners = [];
function emit(type, data = {}) { if (!simulating) for (const f of listeners) f(type, data); }

function addLog(text, type = '') {
  S.log.unshift({ text, type });
  if (S.log.length > 3) S.log.length = 3;
  logDirty = true;
}

// ---------- sobreviventes com nome ----------
const pickName = taken => {
  const free = NAMES.filter(n => !taken.includes(n));
  const pool = free.length ? free : NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
};
function makeNames(n, taken = []) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(pickName([...taken, ...out]));
  return out;
}
// "Ana", "Ana e Jorge", "Ana, Jorge e Bia"
function joinNames(list) {
  if (list.length <= 1) return list[0] || '';
  return list.slice(0, -1).join(', ') + ' e ' + list[list.length - 1];
}
// Toda entrada no grupo passa por aqui, para o novo sobrevivente ganhar um nome
function addSurvivor() {
  S.survivors++;
  const name = pickName(S.people);
  S.people.push(name);
  return name;
}
// Remove n sobreviventes do grupo e devolve os nomes de quem saiu
function removeSurvivors(n) {
  const out = [];
  for (let i = 0; i < n && S.survivors > 0; i++) {
    S.survivors--;
    if (S.people.length) out.push(S.people.splice(Math.floor(Math.random() * S.people.length), 1)[0]);
  }
  syncPeople();
  return out;
}
// Garante que a lista de nomes acompanhe a contagem (saves antigos e mudanças diretas em S.survivors)
function syncPeople() {
  if (!Array.isArray(S.people)) S.people = [];
  while (S.people.length < S.survivors) S.people.push(pickName(S.people));
  if (S.people.length > Math.max(0, S.survivors)) S.people.length = Math.max(0, S.survivors);
}
