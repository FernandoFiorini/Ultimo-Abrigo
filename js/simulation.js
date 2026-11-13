'use strict';

function tick(dt, live) {
  const st = S;
  S.res.comida += S.jobs.forrageiro * 0.6 * foodMult() * dt;
  S.res.sucata += S.jobs.coletor * 0.5 * scrapMult() * dt;

  const need = S.jobs.armeiro * 0.3 * dt;
  if (need > 0) {
    const frac = Math.min(1, S.res.sucata / need);
    S.res.sucata -= need * frac;
    S.res.municao += S.jobs.armeiro * AMMO_RATE * prodMult() * Endgame.mult('ammo') * dt * frac;
  }
  S.res.remedio += S.jobs.medico * 0.04 * prodMult() * Endgame.mult('meds') * dt;
  S.clickCd = Math.max(0, S.clickCd - dt);

  // Conquistas (verificadas duas vezes por segundo)
  Endgame.tick(dt);
  if (S !== st) return;
  achT += dt;
  if (achT >= 0.5) { achT = 0; checkAchievements(); }

  const B = S.meta.boosts;
  for (const k in B) {
    if (B[k] > 0) {
      B[k] = Math.max(0, B[k] - dt);
      if (B[k] === 0) { addLog(`⌛ O boost ${SHOP[k === 'prod' ? 'prod2x' : 'furia'].nome} acabou.`); emit('boostEnd', { k }); }
    }
  }

  // Fome (quem está em expedição leva as próprias rações)
  S.res.comida -= home() * foodPer() * dt;
  if (S.res.comida < 0) {
    S.res.comida = 0;
    S.starve += dt;
    if (S.starve >= STARVE_TIME) {
      S.starve = 0;
      killSurvivors(1, 'morreu de fome', false);
      if (S !== st) return;
    }
  } else {
    S.starve = 0;
  }

  if (S.build.radio > 0 && S.survivors < maxSurv() && S.res.comida > 0 &&
      Math.random() < 0.004 * S.build.radio * dt) {
    addLog(`📻 ${addSurvivor()} ouviu o rádio e chegou ao abrigo.`, 'good');
    emit('expReturn', { n: 1 });
  }

  if (S.exps.length) {
    for (const e of S.exps) e.t -= dt;
    const done = S.exps.filter(e => e.t <= 0);
    if (done.length) {
      S.exps = S.exps.filter(e => e.t > 0);
      for (const e of done) { expReturn(e); if (S !== st) return; }
    }
  }

  // dilemas e comerciante só com o jogo aberto na tela
  if (live && !document.hidden) { Events.tick(dt); if (S !== st) return; }

  if (S.horde.active) {
    if (live) updateHorde(dt); else flushWave();
  } else {
    S.waveTimer -= dt;
    if (S.waveTimer <= 0) {
      if (live) startWave(false);
      else { startWave(true); flushWave(); }
    }
  }
}

function offlineProgress() {
  const el = Math.min((Date.now() - S.last) / 1000, OFFLINE_MAX);
  if (el < 10) return;
  const r0 = { ...S.res }, s0 = S.survivors, w0 = S.wave;
  simulate(el);
  const parts = Object.keys(RES).map(k => {
    const d = S.res[k] - r0[k];
    return `${d >= 0 ? '+' : ''}${fmt(d)} ${RES[k].nome.toLowerCase()}`;
  });
  addLog(`⏳ Você ficou fora por ${fmtTime(el)}. ${Math.max(0, S.wave - w0)} onda(s) enfrentada(s). ` +
    `Sobreviventes: ${s0} → ${S.survivors}. ${parts.join(', ')}.`, 'warn');
  S.last = Date.now();
}

function simulate(seconds) {
  simulating = true;
  while (seconds > 0) {
    const d = Math.min(1, seconds);
    tick(d, false);
    seconds -= d;
  }
  simulating = false;
}

function step() {
  const now = Date.now();
  if (modalOpen || paused) { S.last = now; return 0; }
  const dt = Math.min((now - S.last) / 1000, OFFLINE_MAX);
  S.last = now;
  if (dt > 1) simulate(dt);
  else if (dt > 0) tick(dt, true);
  return Math.max(0, Math.min(dt, 0.1));
}
