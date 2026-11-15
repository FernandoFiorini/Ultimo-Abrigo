'use strict';

let S;

function newMeta() {
  const perks = {};
  for (const k in PERKS) perks[k] = 0;
  return { hope: 0, hopeTotal: 0, city: 1, perks, cash: 0, boosts: { prod: 0, furia: 0 }, stats: newStats(), ach: {}, tutorial: {}, memorial: [], fallen: 0,
    lw: { owned: { pistola: 1 }, slots: ['pistola', null, null], cur: 0 },
    // player: nome do jogador · runId: identidade do save (morte permanente) · minDiff: menor dificuldade permitida · wins: vitórias por dificuldade
    player: 'Sobrevivente', runId: '', minDiff: 0, wins: {},
    champ: Champions.blank(),
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
    recruits: 0,     // peso de recrutamento: pago conta 1, quem chega de graça conta 0,5
    people,
    traits,
    mods: [],
    // sem guardas antes da onda 3 (na primeira cidade): no começo, quem defende é o líder.
    // Depois que os guardas já foram liberados uma vez, as próximas cidades começam com um.
    jobs: meta.unl && meta.unl['job:guarda']
      ? { forrageiro: 1, coletor: 1, armeiro: 0, guarda: 1, medico: 0, cientista: 0 }
      : { forrageiro: 2, coletor: 1, armeiro: 0, guarda: 0, medico: 0, cientista: 0 },
    build: { muro: 0, horta: 0, oficina: 0, beliche: 0, torreC: 0, torre: 0, torreL: 0, alojamento: 0, radio: 0, lab: 0 },
    fatigue: 0,      // cansaço médio dos guardas (0 a 1)
    scav: DIFFS[diff].scav ? DIFFS[diff].scav[0] : SCAV_CHARGES, scavT: 0,   // cargas de vasculhar e o tempo recuperando a próxima
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
    waveTimer: DIFFS[diff].firstDay || DIFFS[diff].interval,   // o primeiro dia pode ser mais longo (Apocalipse)
    horde: { active: false, queue: [], zs: [] },
    exps: [],
    ops: [],
    districts: {},
    zid: 1,
    clickCd: 0,
    lwMag: {},       // tiros no pente de cada arma do líder
    reload: null,    // recarga em andamento: { k, t, dur }
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
const hopeMult = (h = S.meta.hopeTotal) => h <= HOPE_LINEAR ? 1 + 0.03 * h
  : 1 + 0.03 * HOPE_LINEAR + 0.06 * Math.sqrt(HOPE_LINEAR) * (Math.sqrt(h) - Math.sqrt(HOPE_LINEAR));
// bônus de produção da Esperança em % (para os textos)
const hopePct = (h = S.meta.hopeTotal) => Math.round((hopeMult(h) - 1) * 100);
const boostMult = () => S.meta.boosts.prod > 0 ? 2 : 1;
const prodMult = () => boostMult() * D().prod * Endgame.mult('prod') * (S.mourn > 0 ? 1 - MOURN_PENALTY : 1);
const furia = () => S.meta.boosts.furia > 0;
const foodMult = () => (1 + 0.25 * S.build.horta) * (1 + 0.15 * perk('agricultura')) * hopeMult() * prodMult() * Endgame.mult('food') * traitMult('verde');
const scrapMult = () => (1 + 0.25 * S.build.oficina) * (1 + 0.15 * perk('sucateiros')) * hopeMult() * prodMult() * Endgame.mult('scrap') * traitMult('jeito');
const fireMult = () => (1 + 0.12 * perk('treino')) * (furia() ? 2 : 1) * Endgame.mult('fire') * Champions.fury();
const maxSurv = () => 4 + S.build.beliche * 2 + perk('veteranos') + Endgame.ab('beds');
const maxWall = () => Math.round((100 + S.build.muro * 50) * (1 + 0.2 * perk('engenharia')) * Endgame.mult('wall') * (hasMod('murofraco') ? 0.6 : 1) * traitMult('forca') * (1 + Champions.val('wall')));
const assigned = () => Object.values(S.jobs).reduce((a, b) => a + b, 0);
const away = () => S.exps.reduce((a, e) => a + e.n, 0) + S.ops.reduce((a, o) => a + o.n, 0) + (S.horde && S.horde.drop && S.horde.drop.r ? 1 : 0);
const home = () => S.survivors - away();
// feridos ficam no abrigo (comem), mas não trabalham até um médico tratá-los
const hurt = () => Math.min((S.injured || []).length, Math.max(0, home()));
const treating = () => Math.min(S.jobs.medico, hurt());
const idle = () => S.survivors - assigned() - away() - hurt();
// Ociosos liberados pelo jogador (a distribuição automática respeita esses)
const heldIdle = () => Math.min(S.heldIdle || 0, Math.max(0, idle()));
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
    comida: Math.round(SCAV_GAIN * Math.max(base, S.jobs.forrageiro * 0.6 * foodMult() * 5)),
    sucata: Math.round(SCAV_GAIN * Math.max(base, S.jobs.coletor * 0.5 * scrapMult() * 5)),
  };
};
// cargas de vasculhar (um ponto só para futuras melhorias mexerem)
const scavMax = () => (D().scav ? D().scav[0] : SCAV_CHARGES);
const scavRegen = () => (D().scav ? D().scav[1] : SCAV_REGEN);
// Cada recrutado com comida encarece o próximo em ×1,3; quem chega de graça (rádio, eventos, expedições)
// encarece só meio passo (FREE_JOIN_WEIGHT), para essas chegadas continuarem sendo vantagem.
// Limitado ao tamanho do grupo, para o preço cair quando gente morre (saves antigos usam o grupo todo).
const FREE_JOIN_WEIGHT = 0.5;
// Expedições: risco por pessoa e multiplicador de saque (dificuldade, onda, Esperança, batedor, talentos)
const EXP_RISK_CAP = 0.6;
const expRisk = k => Math.min(EXP_RISK_CAP, EXPED[k].risk * (D().risk || 1) * Endgame.riskMult());
const expLootScale = () => (1 + 0.08 * (S.wave - 1)) * hopeMult() * Endgame.scoutLoot() * (D().loot || 1) * Pets.lootMult();
const recruitCost = () => Math.round(12 * Math.pow(1.3, Math.max(0, Math.min(S.recruits ?? Infinity, S.survivors - 3))));
// Do Normal para cima: recrutar e vasculhar só de dia, e um limite de recrutamentos por dia
// (o "dia" é o intervalo antes de cada horda: a contagem zera quando a onda muda)
const dayOnly = () => !!D().dayOnly;
const nightLocked = () => dayOnly() && S.horde.active;
const recruitsToday = () => (S.recDay === S.wave ? S.recN || 0 : 0);
const recruitLeft = () => (D().recruitDay ? Math.max(0, D().recruitDay - recruitsToday()) : Infinity);
// por que não dá para recrutar agora ('' = pode): isolados, lotado, noite, limite do dia, comida
function recruitBlock() {
  if (hasMod('isolados')) return 'iso';
  if (S.survivors >= maxSurv()) return 'full';
  if (nightLocked()) return 'night';
  if (recruitLeft() <= 0) return 'cap';
  if (S.res.comida < recruitCost()) return 'food';
  return '';
}
const countDay = () => { if (S.recDay !== S.wave) { S.recDay = S.wave; S.recN = 0; } S.recN++; };
const bumpRecruit = w => { S.recruits = Math.min((S.recruits ?? Math.max(0, S.survivors - 4)) + w, S.survivors); };
// Chamado depois de addSurvivor quando a pessoa foi paga com comida: completa o passo inteiro
const countRecruit = () => bumpRecruit(1 - FREE_JOIN_WEIGHT);
// Ameaça da cidade: quantas cidades (e mundos) já ficaram para trás. Deixa os zumbis mais duros e numerosos.
const cityThreat = () => Math.min(CITY_MAX, ((S.meta && S.meta.city) || 1) - 1 + CITY_PER_WORLD * (((S.meta && S.meta.worlds) || 1) - 1));
// Linhas de dados "a · b · c": cada trecho fica inteiro (espaços inseparáveis, sem mexer nas tags HTML),
// então, se faltar espaço, a linha só quebra entre os trechos, nunca no meio de um valor ("recarga 1,5s")
const nbsp = s => String(s).replace(/(<[^>]*>)| |–/g, (m, tag) => tag || (m === ' ' ? ' ' : '–⁠'));   // nem depois do travessão (204–408)
const keepSegs = s => String(s).split(' · ').map(nbsp).join(' · ');
// Pressão inicial (Apocalipse): +amt na primeira onda, diminuindo a cada onda
const surgeMult = (n, amt) => (amt ? 1 + amt * Math.exp(-(n - 1) / (D().surgeTau || 5)) : 1);
const waveSize = n => Math.round((6 * D().count * Math.pow(D().grow, n - 1) * surgeMult(n, D().surge) + n) * (hasMod('horda') ? 1.25 : 1) * (1 + CITY_COUNT * cityThreat()));
const hopeGain = () => S.best >= EVAC_WAVE ? Math.floor((Math.pow(S.best - 5, 1.25) + S.kills / 200) * D().hope * (1 + modBonus())) : 0;
// Zumbis ficam mais resistentes e mais fortes a cada onda.
// Nas 6 primeiras ondas eles são um pouco mais fracos, para compensar os tiros errados do começo.
const siegeMult = n => 1 + SIEGE_HP * Math.max(0, n - SIEGE_WAVE);
const hpMult = n => D().hp * (1 + D().hpGrow * (n - 1)) * Math.min(1, (D().ramp0 ?? 0.7) + 0.05 * (n - 1)) * surgeMult(n, D().surgeHp) * (1 + CITY_HP * cityThreat()) * siegeMult(n);
// Chance de acerto de guardas e torres: melhora com treinamento, pesquisa, talentos e o herói Atirador
// base: precisão própria do tipo de torre (sem ela, a da torre média)
function accuracy(src, base = src === 'tower' ? TOWER_ACC : GUARD_ACC) {
  const trained = 0.03 * perk('treino') + Endgame.accBonus() + 0.02 * Math.min(TRAIT_CAP, traitCounts().mira || 0) + (src === 'guard' ? Champions.val('acc') : 0);
  const tired = src === 'guard' ? FAT_ACC * (S.fatigue || 0) : 0;
  return Math.max(0.05, Math.min(ACC_MAX, base + trained) - tired);
}
// Cansaço dos guardas: multiplicador de cadência, quanto cada tiro cansa e a velocidade de recuperação
const guardFire = () => 1 - FAT_FIRE * (S.fatigue || 0);
const fatigueShot = () => FAT_SHOT * (1 - 0.15 * Endgame.tl('turnos'));
const restRate = () => (1 + 0.3 * (S.build.alojamento || 0)) * (1 + Champions.val('rest')) * Pets.restMult() / FAT_TAU;
const tire = shots => { if (S.jobs.guarda > 0) S.fatigue = Math.min(1, (S.fatigue || 0) + shots * fatigueShot() / S.jobs.guarda); };
const dmgMult = n => D().dmg * (1 + 0.04 * (n - 1));
// A horda inteira chega em ~30s: hordas maiores = mais zumbis por segundo
const spawnGap = n => Math.min(1, Math.max(0.12, 30 / waveSize(n)));

function scaledCost(base, mult, lvl) {
  const c = {};
  for (const r in base) c[r] = Math.ceil(base[r] * Math.pow(mult, lvl));
  return c;
}
const isTower = k => k in TOWERS;
const buildBlocked = k => isTower(k) && hasMod('semtorres');
// Torres curta e longa só aparecem depois de algumas ondas (quem já construiu mantém)
const buildLocked = k => !!BUILD[k].unlock && !S.build[k] && S.wave < BUILD[k].unlock;
const towerLevels = () => Object.keys(TOWERS).reduce((a, k) => a + (S.build[k] || 0), 0);
// Atributos de uma torre no nível lv (atiradores, arma, dano por tiro, segundos entre tiros, precisão)
function towerStat(k, lv = S.build[k]) {
  const T = TOWERS[k], up = Math.max(0, lv - 1), tier = Math.min(T.guns.length - 1, Math.floor(lv / TOWER_GUN_EVERY));
  return {
    crew: lv > 0 ? 1 + Math.floor(lv / TOWER_CREW_EVERY) : 0,
    gun: T.guns[tier],
    dmg: T.dmg * (1 + TOWER_LVL_DMG * up) * Math.pow(TOWER_GUN_MULT, tier),
    cd: T.cd * Math.max(T.cdMin || TOWER_CD_MIN, Math.pow(TOWER_LVL_CD, up)),
    acc: accuracy('tower', T.acc),
  };
}
// Manutenção cobrada a cada horda (fração do custo do próximo nível)
function towerUpkeep(k) {
  const c = buildCost(k), u = TOWERS[k].upkeep, out = {};
  for (const r in u) out[r] = Math.ceil((c[r] || 0) * u[r]);
  return out;
}
const upkeepTotal = () => {
  const t = {};
  for (const k in TOWERS) if (S.build[k]) for (const [r, v] of Object.entries(towerUpkeep(k))) t[r] = (t[r] || 0) + v;
  return t;
};
// Torre sem manutenção paga nesta horda atira mais devagar
const towerPay = k => S.horde.active && (S.horde.unpaid || []).includes(k) ? TOWER_UNPAID : 1;
function towerFx(k, lv) {
  const t = towerStat(k, lv), next = (Math.floor(lv / TOWER_CREW_EVERY) + 1) * TOWER_CREW_EVERY;
  return keepSegs(`${t.crew} atirador(es) com ${t.gun} · dano ${pts(t.dmg)} · ${t.cd >= 1 ? `1 tiro a cada ${fmt(t.cd)}s` : `${fmt(1 / t.cd)} tiros/s`} cada · ${Math.round(t.acc * 100)}% de acerto · +1 atirador no nv. ${next} · manutenção ${Object.entries(towerUpkeep(k)).map(([r, v]) => `${fmt(v)} ${RES[r].icon}`).join(' + ')} por horda`);
}
const buildCost = k => { const c = scaledCost(BUILD[k].cost, BUILD[k].mult, S.build[k]), f = 1 - Endgame.ab('build'); for (const r in c) c[r] = Math.ceil(c[r] * f); return c; };
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
// Decisões sem janela (só o bot, tools/bot.js, usa): autoDecide(tipo, dados, opções) → índice da opção escolhida.
// tipo: 'dilemma' (eventos do dia) ou 'bite' (o que fazer com quem foi mordido). null: o jogador decide na janela.
let autoDecide = null;
const listeners = [];
function emit(type, data = {}) { if (!simulating) for (const f of listeners) f(type, data); }

function addLog(text, type = '') {
  S.log.unshift({ text, type });
  if (S.log.length > 3) S.log.length = 3;
  logDirty = true;
}

// ---------- sobreviventes com nome ----------
const pickName = taken => {
  // um homenageado que ainda não está no grupo, de vez em quando
  const hon = (typeof HONORED !== 'undefined' ? HONORED : []).filter(h => !taken.includes(h.nome));
  if (hon.length && Math.random() < HONORED_CHANCE) return hon[Math.floor(Math.random() * hon.length)].nome;
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
  bumpRecruit(FREE_JOIN_WEIGHT);
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
  const q = typeof Honored !== 'undefined' ? Honored.lastWords(name) : null;   // últimas palavras de um homenageado
  m.memorial.unshift({ n: name, c: cause, w: S.horde.active ? S.horde.n : S.wave, city: m.city, world: m.worlds || 1, ...(q ? { q } : {}) });
  if (q) addLog(`🕯️ ${name}: "${q}"`, 'bad');
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
