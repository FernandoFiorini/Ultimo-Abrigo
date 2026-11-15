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
  // médicos tratando feridos não produzem remédio
  S.res.remedio += (S.jobs.medico - treating()) * 0.04 * prodMult() * Endgame.mult('meds') * dt;
  S.clickCd = Math.max(0, S.clickCd - dt);
  // fôlego do líder: as cargas de vasculhar voltam com o tempo
  if (S.scav == null) S.scav = scavMax();
  if (S.scav < scavMax()) {
    S.scavT = (S.scavT || 0) + dt;
    while (S.scavT >= scavRegen() && S.scav < scavMax()) { S.scavT -= scavRegen(); S.scav++; }
    if (S.scav >= scavMax()) S.scavT = 0;
  } else S.scavT = 0;

  // feridos, luto e quem foi liberado depois de uma mordida
  Invasion.tick(dt);
  if (S !== st) return;

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
  if (live && !document.hidden) {
    Invasion.prompt();   // decisão sobre quem foi mordido (depois da horda)
    Events.tick(dt);
    if (S !== st) return;
    if (typeof Honored !== 'undefined') Honored.tick(dt);
  }

  if (S.horde.train) {
    // campo de treino (debug): ondas pausadas, só roda ao vivo
    if (live) { updateHorde(dt); Debug.trainTick(dt); }
  } else if (S.horde.active) {
    if (live) updateHorde(dt); else flushWave();
  } else {
    // entre as hordas os guardas descansam
    if (S.fatigue > 0) S.fatigue = S.fatigue < 0.001 ? 0 : S.fatigue * Math.exp(-dt * restRate());
    const before = Math.ceil(S.waveTimer);
    S.waveTimer -= dt;
    // ao vivo, o evento da próxima onda é sorteado um pouco antes: se for perigosa, toca o alarme e conta
    // com o cachorro, o sorteio (e o alerta) vem uns segundos antes: ele late quando sente a horda grande
    if (live && S.waveTimer <= WARN_TIME + Pets.warnBonus() && S.pending === undefined) {
      S.pending = Endgame.rollEvent(S.wave);
      const dg = Endgame.danger(S.pending, S.wave);
      if (dg) {
        Pets.onDanger();
        addLog(`🚨 ALERTA: ${dg.icon} ${dg.nome} em ${Math.ceil(S.waveTimer)} segundos! Prepare a defesa.`, 'bad');
        emit('dangerWarn', { ...dg, t: S.waveTimer });
      }
    }
    const now = Math.ceil(S.waveTimer);
    if (live && now !== before && now <= 5 && now > 0 && Endgame.danger(S.pending, S.wave)) emit('countdown', { n: now });
    if (S.waveTimer <= 0) {
      if (live) startWave(false);
      else offlineWave();
    }
  }
}

// Produção por segundo do abrigo, sem consumo nenhum (comida, sucata gasta pelos armeiros) e sem o boost de produção
function offlineRates() {
  const boost = boostMult();
  return {
    comida: S.jobs.forrageiro * 0.6 * foodMult() / boost,
    sucata: S.jobs.coletor * 0.5 * scrapMult() / boost,
    municao: S.jobs.armeiro * AMMO_RATE * prodMult() / boost * Endgame.mult('ammo'),
    remedio: Math.max(0, S.jobs.medico - treating()) * 0.04 * prodMult() / boost * Endgame.mult('meds'),
    rp: S.jobs.cientista * 0.12 * (1 + 0.25 * Math.max(0, S.build.lab - 1)) * Endgame.mult('rp'),
  };
}

// Ausência: o abrigo fica parado (sem hordas, consumo, expedições ou feridos piorando) e só produz,
// por no máximo OFFLINE_MAX; o resto do tempo se perde. Registra no log e devolve o resumo para o aviso de retorno.
function catchUp(away) {
  const el = Math.min(away, OFFLINE_MAX), r = offlineRates(), gain = {};
  for (const k of Object.keys(RES)) { gain[k] = r[k] * el * OFFLINE_YIELD; S.res[k] += gain[k]; }
  gain.rp = r.rp * el * OFFLINE_YIELD;
  S.meta.rp += gain.rp;
  const rep = { away, el, lost: Math.max(0, away - el), gain };
  const parts = Object.keys(RES).filter(k => gain[k] > 0).map(k => `+${fmt(gain[k])} ${RES[k].nome.toLowerCase()}`);
  if (gain.rp > 0) parts.push(`+${fmt(gain.rp)} de pesquisa`);
  addLog(`⏳ Você ficou fora por ${fmtTime(away)}. O abrigo produziu ${fmtTime(el)}: ${parts.join(', ') || 'nada (ninguém produzindo)'}.` +
    (rep.lost > 60 ? ` ${fmtTime(rep.lost)} não contaram: a produção offline vai só até ${fmtTime(OFFLINE_MAX)}.` : ''), 'warn');
  S.last = Date.now();
  return rep;
}

// Ao abrir o jogo: o resumo fica guardado para o aviso de retorno, mostrado depois que a interface existir
let returnReport = null;
function offlineProgress() {
  const away = (Date.now() - S.last) / 1000;
  if (away < 10) return;
  const rep = catchUp(away);
  if (away >= RETURN_NOTICE) returnReport = rep;
}

function simulate(seconds) {
  simulating = true;
  const st = S;
  while (seconds > 0) {
    const d = Math.min(1, seconds);
    tick(d, false);
    seconds -= d;
    // o abrigo caiu: o novo grupo só começa quando o jogador voltar
    if (S !== st) break;
  }
  simulating = false;
}

function step() {
  const now = Date.now();
  if (modalOpen || paused || (typeof guidePaused !== 'undefined' && guidePaused) || (typeof Story !== 'undefined' && Story.on()) || Slots.dead) { S.last = now; return 0; }
  const away = (now - S.last) / 1000;
  // aba congelada ou computador dormindo por muito tempo: mesmo limite do offline, com aviso de retorno
  if (away >= RETURN_NOTICE) {
    const rep = catchUp(away);
    if (!Slots.dead) showReturn(rep);
    return 0;
  }
  let dt = Math.min(away, OFFLINE_MAX);
  S.last = now;
  // 2x só no jogo ao vivo (nunca no progresso offline) e só de dia
  if (dt < 0.5 && fastOn()) dt *= 2;
  if (dt > 1) simulate(dt);
  else if (dt > 0) tick(dt, true);
  return Math.max(0, Math.min(dt, 0.1));
}
