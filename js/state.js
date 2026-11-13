'use strict';

let S;

function newMeta() {
  const perks = {};
  for (const k in PERKS) perks[k] = 0;
  return { hope: 0, hopeTotal: 0, city: 1, perks, cash: 0, boosts: { prod: 0, furia: 0 }, stats: newStats(), ach: {}, tutorial: {}, memorial: [], fallen: 0,
    lw: { owned: { pistola: 1 }, slots: ['pistola', null, null], cur: 0 },
    // player: nome do jogador · runId: identidade do save (morte permanente) · minDiff: menor dificuldade permitida · wins: vitórias por dificuldade
    player: 'Sobrevivente', runId: '', minDiff: 0, wins: {},
    ...Endgame.newMetaExtra() };
}

function newState(meta = newMeta(), diff = 'normal') {
  const P = meta.perks, extra = P.estoque * 40;
  const people = makeNames(3 + P.veteranos), traits = {};
  for (const n of people) { const t = rollTrait(); if (t) traits[n] = t; }
  return {
    meta,
    diff,
    res: { comida: 25 + extra, sucata: 15 + extra, municao: 40 + extra, remedio: 0 },
    survivors: 3 + P.veteranos,
    people,
    traits,
    mods: [],
    jobs: { forrageiro: 1, coletor: 1, armeiro: 0, guarda: 1, medico: 0, cientista: 0 },
    build: { muro: 0, horta: 0, oficina: 0, beliche: 0, torre: 0, radio: 0, lab: 0 },
    wallHp: Math.round(100 * (1 + 0.2 * P.engenharia)),
    wallDown: false,
    overflow: 0,
    injured: [],     // feridos: { n: nome, t: tratamento restante }
    injT: 0,         // tempo que algum ferido está sem tratamento
    bitten: [],      // mordidos esperando a decisão do jogador
    turned: [],      // liberados que voltarão transformados na próxima horda
    returning: [],   // liberados que resistiram à infecção: { n, t }
    mourn: 0,        // segundos de luto restantes
    wave: 1,
    waveTimer: DIFFS[diff].interval,
    horde: { active: false, queue: [], zs: [] },
    exps: [],
    ops: [],
    districts: {},
    zid: 1,
    clickCd: 0,
    lwAmmo: {},
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
const prodMult = () => boostMult() * D().prod * Endgame.mult('prod') * (S.mourn > 0 ? 1 - MOURN_PENALTY : 1);
const furia = () => S.meta.boosts.furia > 0;
const foodMult = () => (1 + 0.25 * S.build.horta) * (1 + 0.15 * perk('agricultura')) * hopeMult() * prodMult() * Endgame.mult('food') * traitMult('verde');
const scrapMult = () => (1 + 0.25 * S.build.oficina) * (1 + 0.15 * perk('sucateiros')) * hopeMult() * prodMult() * Endgame.mult('scrap') * traitMult('jeito');
const fireMult = () => (1 + 0.12 * perk('treino')) * (furia() ? 2 : 1) * Endgame.mult('fire');
const maxSurv = () => 4 + S.build.beliche * 2 + perk('veteranos');
const maxWall = () => Math.round((100 + S.build.muro * 50) * (1 + 0.2 * perk('engenharia')) * Endgame.mult('wall') * (hasMod('murofraco') ? 0.6 : 1) * traitMult('forca'));
const assigned = () => Object.values(S.jobs).reduce((a, b) => a + b, 0);
const away = () => S.exps.reduce((a, e) => a + e.n, 0) + S.ops.reduce((a, o) => a + o.n, 0);
const home = () => S.survivors - away();
// feridos ficam no abrigo (comem), mas não trabalham até um médico tratá-los
const hurt = () => Math.min((S.injured || []).length, Math.max(0, home()));
const treating = () => Math.min(S.jobs.medico, hurt());
const idle = () => S.survivors - assigned() - away() - hurt();
// Tira gente das funções até sobrar ninguém trabalhando sem existir (depois de mortes e ferimentos)
function fixJobs() {
  while (idle() < 0) {
    const busy = Object.keys(S.jobs).filter(k => S.jobs[k] > 0);
    if (!busy.length) break;
    S.jobs[busy[Math.floor(Math.random() * busy.length)]]--;
  }
}
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
// Zumbis ficam mais resistentes e mais fortes a cada onda.
// Nas 6 primeiras ondas eles são um pouco mais fracos, para compensar os tiros errados do começo.
const hpMult = n => D().hp * (1 + D().hpGrow * (n - 1)) * Math.min(1, 0.7 + 0.05 * (n - 1));
// Chance de acerto de guardas e torres: melhora com treinamento, pesquisa, talentos e o herói Atirador
function accuracy(src) {
  const base = src === 'tower' ? TOWER_ACC : GUARD_ACC;
  const trained = 0.03 * perk('treino') + Endgame.accBonus() + 0.02 * Math.min(TRAIT_CAP, traitCounts().mira || 0);
  return Math.min(ACC_MAX, base + trained);
}
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
    // médico ocupado tratando um ferido não produz remédio
    remedio: (S.jobs.medico - treating()) * 0.04 * prodMult() * Endgame.mult('meds'),
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
// ---------- talentos ----------
const rollTrait = () => Math.random() < TRAIT_CHANCE ? Object.keys(TRAITS)[Math.floor(Math.random() * Object.keys(TRAITS).length)] : null;
let traitCache = null, traitCacheS = null;
function traitCounts() {
  if (traitCache && traitCacheS === S) return traitCache;
  const c = {};
  if (S && S.traits) for (const n of S.people) { const t = S.traits[n]; if (t) c[t] = (c[t] || 0) + 1; }
  traitCache = c; traitCacheS = S;
  return c;
}
const traitMult = k => (typeof S === 'undefined' || !S) ? 1 : 1 + TRAITS[k].v * Math.min(TRAIT_CAP, traitCounts()[k] || 0);
const traitsChanged = () => { traitCache = null; };
// "Ana (🎯 Boa mira)" para quem tem talento
function personLabel(name) {
  const t = S.traits && TRAITS[S.traits[name]];
  return t ? `${name} (${t.icon} ${t.nome})` : name;
}

// Toda entrada no grupo passa por aqui, para o novo sobrevivente ganhar um nome (e talvez um talento)
function addSurvivor() {
  S.survivors++;
  const name = pickName(S.people);
  S.people.push(name);
  const t = rollTrait();
  if (t) S.traits[name] = t;
  traitsChanged();
  return personLabel(name);
}
// Tira uma pessoa específica da lista de nomes (e o talento dela)
function forgetPerson(name) {
  const i = S.people.indexOf(name);
  if (i >= 0) S.people.splice(i, 1);
  if (!S.people.includes(name)) {
    delete S.traits[name];
    if (S.injured) S.injured = S.injured.filter(w => w.n !== name);
  }
  traitsChanged();
  S.wallHp = Math.min(S.wallHp, maxWall());
}
// Remove n sobreviventes do grupo e devolve os nomes de quem saiu.
// Com uma causa, quem saiu vai para o memorial.
function removeSurvivors(n, cause) {
  const out = [];
  for (let i = 0; i < n && S.survivors > 0; i++) {
    S.survivors--;
    if (S.people.length) {
      const name = S.people[Math.floor(Math.random() * S.people.length)];
      forgetPerson(name);
      out.push(name);
      if (cause) remember(name, cause);
    } else if (cause) S.meta.fallen = (S.meta.fallen || 0) + 1;
  }
  syncPeople();
  return out;
}
function remember(name, cause) {
  const m = S.meta;
  m.fallen = (m.fallen || 0) + 1;
  if (!Array.isArray(m.memorial)) m.memorial = [];
  m.memorial.unshift({ n: name, c: cause, w: S.horde.active ? S.horde.n : S.wave, city: m.city, world: m.worlds || 1 });
  if (m.memorial.length > MEMORIAL_MAX) m.memorial.length = MEMORIAL_MAX;
}
// Garante que a lista de nomes acompanhe a contagem (saves antigos e mudanças diretas em S.survivors)
function syncPeople() {
  if (!Array.isArray(S.people)) S.people = [];
  if (!S.traits || typeof S.traits !== 'object') S.traits = {};
  traitsChanged();
  while (S.people.length < S.survivors) S.people.push(pickName(S.people));
  if (S.people.length > Math.max(0, S.survivors)) S.people.length = Math.max(0, S.survivors);
  for (const k of ['injured', 'bitten', 'turned', 'returning']) if (!Array.isArray(S[k])) S[k] = [];
  S.injured = S.injured.filter(w => w && S.people.includes(w.n));
}
