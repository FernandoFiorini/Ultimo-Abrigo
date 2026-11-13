'use strict';

const expSel = {};
for (const k in EXPED) expSel[k] = EXPED[k].min;

const actions = {
  scavenge() {
    const g = scavGain();
    S.res.comida += g.comida;
    S.res.sucata += g.sucata;
    let text = `+${g.comida} 🥫 +${g.sucata} 🔩`;
    if (Math.random() < 0.15) {
      const ammo = 1 + Math.floor(S.wave / 4);
      S.res.municao += ammo;
      text += ` +${ammo} 🔫`;
    }
    S.meta.stats.scav++;
    emit('scavenge');
    return text;
  },
  recruit() {
    const c = recruitCost();
    if (hasMod('isolados') || S.survivors >= maxSurv() || S.res.comida < c) return;
    S.res.comida -= c;
    addLog(`🧍 ${addSurvivor()} se juntou ao grupo.`, 'good');
    emit('recruit');
  },
  repair() {
    if (S.res.sucata < REPAIR_COST || S.wallHp >= maxWall()) return;
    S.res.sucata -= REPAIR_COST;
    S.wallHp = Math.min(maxWall(), S.wallHp + REPAIR_AMOUNT);
    S.wallDown = false;
    S.overflow = 0;
  },
  jobAdd(k) { if (k === 'cientista' && S.jobs.cientista >= Endgame.sciCap()) return; if (idle() > 0) { S.jobs[k]++; emit('assign', { k }); } },
  jobSub(k) { if (S.jobs[k] > 0) { S.jobs[k]--; emit('unassign', { k }); } },
  build(k) {
    const c = buildCost(k);
    if (buildBlocked(k) || !canAfford(c)) return;
    pay(c);
    S.build[k]++;
    if (k === 'muro') { S.wallHp += Math.round(50 * (1 + 0.2 * perk('engenharia'))); S.wallDown = false; S.overflow = 0; }
    const lv = S.build[k];
    S.meta.stats.builds++;
    addLog(lv === 1
      ? `🏗️ ${BUILD[k].icon} ${BUILD[k].nome} construído: nível 1. Agora: ${BUILD_FX[k](lv)}.`
      : `⬆️ ${BUILD[k].icon} ${BUILD[k].nome} melhorado: nível ${lv - 1} → ${lv}. Agora: ${BUILD_FX[k](lv)}.`, 'good');
    emit('built', { k, lv });
  },
  expAdd(k) { expSel[k]++; },
  expSub(k) { expSel[k] = Math.max(EXPED[k].min, expSel[k] - 1); },
  expGo(k) {
    const L = EXPED[k], n = expSel[k];
    if (hasMod('semexp') || S.best + 1 < L.unlock || idle() < n) return;
    S.exps.push({ loc: k, n, t: L.dur * Endgame.durMult(), dur: L.dur * Endgame.durMult() });
    addLog(`🎒 ${n} sobrevivente(s) partiram para: ${L.nome}.`);
    emit('expStart', { n });
  },
  perk(k) {
    const c = perkCost(k);
    if (S.meta.hope < c || perk(k) >= PERKS[k].max) return;
    S.meta.hope -= c;
    S.meta.perks[k]++;
    const lv = perk(k);
    addLog(`✨ ${PERKS[k].icon} ${PERKS[k].nome}: nível ${lv - 1} → ${lv}. Agora: ${PERK_FX[k](lv)}.`, 'good');
    emit('built', { k, lv, perk: true });
  },
  evacuate() { evacuate(); },
  shop(k) { buyShop(k); },
  claim(id) { claimAch(id); },
  claimAll() { for (const a of ACH) claimAch(a.id); },
};
