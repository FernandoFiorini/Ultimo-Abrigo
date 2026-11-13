'use strict';

// Invasão: quando o muro cai, os zumbis entram no abrigo e os sobreviventes lutam pela própria vida.
// Quem é alcançado por um zumbi pode morrer, escapar ferido (precisa de médico para voltar a trabalhar)
// ou ser mordido. Cada mordida pede uma decisão do jogador: matar a pessoa ou liberá-la.
const Invasion = (() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const isHurt = n => S.injured.some(w => w.n === n);
  const checkOver = () => { if (home() <= 0 && !S.exps.length && !S.ops.length) gameOver(); };

  function tally(k, name) {
    const H = S.horde;
    if (!H.inv) H.inv = { dead: [], hurt: [], bit: [] };
    H.inv[k].push(name);
  }

  // Tira uma pessoa específica do grupo (morte ou mordida)
  function takeOut(name, cause) {
    forgetPerson(name);
    S.survivors--;
    if (cause) remember(name, cause);
    syncPeople();
    fixJobs();
  }

  // Alguém foi alcançado por um zumbi dentro do abrigo. Devolve o destino: 'dead' | 'hurt' | 'bitten' | null
  function victim(x, y) {
    if (home() <= 0 || !S.people.length) return null;
    const healthy = S.people.filter(n => !isHurt(n));
    const H = S.horde, name = pick(healthy.length && Math.random() < INV.shield ? healthy : S.people);
    const wounded = isHurt(name), r = Math.random();
    let fate = wounded ? (r < INV.hurtDead ? 'dead' : 'bitten')
      : r < INV.dead ? 'dead' : r < INV.dead + INV.bitten ? 'bitten' : 'hurt';

    if (fate === 'dead') {
      let savedBy = null;
      if (H.active && (H.deaths || 0) >= H.deathCap) fate = 'hurt';
      else if (Math.random() < Math.min(0.5, Endgame.hb('medico'))) savedBy = 'O Médico de campo';
      else if (S.res.remedio >= 1) { S.res.remedio -= 1; savedBy = 'Um remédio'; }
      if (savedBy) {
        fate = 'hurt';
        S.meta.stats.saved++;
        addLog(`💊 ${savedBy} salvou ${name}, que escapou com ferimentos graves.`, 'good');
      }
    }

    if (fate === 'dead') {
      takeOut(name, 'morreu lutando contra a invasão do abrigo');
      if (H.active) H.deaths = (H.deaths || 0) + 1;
      tally('dead', name);
      addLog(`☠️ ${name} morreu lutando contra os zumbis dentro do abrigo.`, 'bad');
      emit('breach', { x, y, name });
      checkOver();
    } else if (fate === 'bitten') {
      takeOut(name);
      S.bitten.push(name);
      tally('bit', name);
      addLog(`🦷 ${name} levou uma mordida durante a invasão.`, 'bad');
      emit('bitten', { x, y, name });
      checkOver();
    } else {
      if (!wounded) S.injured.push({ n: name, t: HEAL_TIME });
      fixJobs();
      tally('hurt', name);
      emit('injured', { x, y, name });
    }
    return fate;
  }

  // Zumbi que passou pelo muro caído: anda até o meio do acampamento e ataca quem estiver por perto.
  // Devolve false se o jogo acabou durante o ataque.
  function zombie(z, dt) {
    const st = S, Z = ZTYPES[z.type];
    if (!z.atk) {
      const dx = z.x - z.tx, dy = z.ty - z.y;
      z.x -= Math.min(dx, z.speed * dt);
      z.y += Math.sign(dy) * Math.min(Math.abs(dy), z.speed * 0.5 * dt);
      if (z.x <= z.tx + 0.5) { z.atk = true; z.t = Z.explode ? 0 : INV.atkCd * 0.5; }
      return true;
    }
    z.t += dt;
    if (Z.explode) {
      if (z.t >= 0.6) {
        for (let i = 0; i < 2; i++) { victim(z.x, z.y); if (S !== st) return false; }
        killZombie(z, 'wall');
      }
      return true;
    }
    if (z.t >= INV.atkCd) {
      z.t = 0; z.hits++;
      for (let i = 0; i < (Z.boss ? 2 : 1); i++) {
        if (Math.random() < INV.hit) { victim(z.x - 6, z.y); if (S !== st) return false; }
        else emit('dodge', { x: z.x - 6, y: z.y });
      }
      // depois de alguns ataques o grupo consegue derrubar o zumbi
      if (z.hits >= Z.hits) killZombie(z, 'melee');
    }
    return true;
  }

  // Muro caído: o zumbi deixa de atacar o muro e entra no acampamento
  function enter(z) {
    z.state = 'invade'; z.atk = false; z.hits = 0; z.t = 0;
    z.tx = rnd(WORLD.WALL_X - 75, WORLD.WALL_X - 15);
    z.ty = rnd(WORLD.LANE_MIN, WORLD.LANE_MAX);
  }

  // Os sobreviventes que não estão nos postos de tiro lutam corpo a corpo com quem entrou
  function fight(dt) {
    const H = S.horde;
    const inside = H.zs.filter(z => !z.dead && z.state === 'invade');
    if (!inside.length) return;
    const n = Math.min(INV.maxFighters, Math.max(0, home() - hurt() - S.jobs.guarda));
    if (!H.mcd) H.mcd = [];
    for (let i = 0; i < n; i++) {
      H.mcd[i] = (H.mcd[i] ?? Math.random() * INV.meleeCd) - dt;
      if (H.mcd[i] > 0) continue;
      H.mcd[i] = INV.meleeCd * rnd(0.8, 1.2);
      const alive = inside.filter(z => !z.dead);
      if (!alive.length) return;
      const z = pick(alive), hit = Math.random() < INV.meleeHit;
      emit('melee', { id: z.id, x: z.x, y: zy(z), hit });
      if (hit) damageZombie(z, INV.meleeDmg * hpMult(H.n) * traitMult('forca'), 'melee');
    }
  }
  const fighters = () => S.horde.active && S.horde.zs.some(z => !z.dead && z.state === 'invade');

  // ---------- feridos, luto e quem foi liberado ----------
  function tick(dt) {
    const st = S;
    if (S.mourn > 0) {
      S.mourn = Math.max(0, S.mourn - dt);
      if (!S.mourn) addLog('🕯️ O luto passou. O grupo voltou ao ritmo de trabalho.');
    }
    heal(dt);
    if (S !== st) return;
    comeBack(dt);
  }

  function heal(dt) {
    if (!S.injured.length) { S.injT = 0; return; }
    const k = treating(), speed = Endgame.mult('meds');
    for (let i = 0; i < k; i++) S.injured[i].t -= dt * speed;
    const done = S.injured.filter(w => w.t <= 0);
    if (done.length) {
      S.injured = S.injured.filter(w => w.t > 0);
      const many = done.length > 1;
      addLog(`🩹 ${joinNames(done.map(w => w.n))} ${many ? 'se recuperaram' : 'se recuperou'} dos ferimentos e já ${many ? 'podem' : 'pode'} trabalhar.`, 'good');
      emit('healed', { n: done.length });
    }
    // quem espera sem médico piora com o tempo
    if (S.injured.length > treating()) {
      S.injT += dt;
      if (S.injT < WOUND_TIME) return;
      S.injT = 0;
      const w = S.injured[S.injured.length - 1];
      if (S.res.remedio >= 1) {
        S.res.remedio -= 1;
        addLog(`💊 ${w.n} piorou sem tratamento e gastou um remédio. Coloque médicos para cuidar dos feridos!`, 'warn');
      } else {
        takeOut(w.n, 'não resistiu aos ferimentos sem tratamento');
        addLog(`☠️ ${w.n} não resistiu aos ferimentos. Faltou médico no abrigo.`, 'bad');
        emit('breach', { name: w.n });
        checkOver();
      }
    } else S.injT = 0;
  }

  // Liberados que resistiram à infecção voltam depois de um tempo
  function comeBack(dt) {
    if (!S.returning.length || S.horde.active) return;
    for (const r of S.returning) r.t -= dt;
    const done = S.returning.filter(r => r.t <= 0);
    if (!done.length) return;
    S.returning = S.returning.filter(r => r.t > 0);
    for (const r of done) {
      S.res.remedio += 2;
      S.meta.stats.cured = (S.meta.stats.cured || 0) + 1;
      if (S.survivors < maxSurv()) {
        S.survivors++;
        S.people.push(r.n);
        syncPeople();
        addLog(`🌅 ${r.n} voltou ao portão! A febre passou: o corpo resistiu à infecção. Trouxe 2 💊 de um hospital no caminho.`, 'good');
        emit('expReturn', { n: 1, loot: `🌅 ${r.n} voltou!` });
      } else {
        addLog(`🌅 ${r.n} voltou curado, mas não havia vaga no abrigo. Deixou 2 💊 no portão e seguiu viagem.`, 'good');
      }
    }
  }

  // Liberados que não resistiram voltam na horda seguinte, como zumbis mais fortes e com nome
  function addTurned(queue) {
    const names = S.turned.splice(0);
    for (const n of names) queue.splice(Math.floor(queue.length * rnd(0.2, 0.8)), 0, 'mordido');
    if (names.length) addLog(`👁️ Rostos conhecidos na horda: ${joinNames(names)}. A mordida venceu.`, 'bad');
    return names;
  }
  function onKill(z, src) {
    if (!z.name) return;
    addLog(`🕯️ ${z.name} enfim descansa${src === 'player' ? '. Foi você quem puxou o gatilho' : ''}.`, 'warn');
  }

  function onWaveEnd(H) {
    const I = H.inv;
    if (!I) return;
    const parts = [], uniq = a => new Set(a).size;
    // quem se feriu e depois morreu ou foi mordido conta só no pior destino
    const hurtOnly = I.hurt.filter(n => !I.dead.includes(n) && !I.bit.includes(n));
    if (I.dead.length) parts.push(`${uniq(I.dead)} morto(s)`);
    if (hurtOnly.length) parts.push(`${uniq(hurtOnly)} ferido(s)`);
    if (I.bit.length) parts.push(`${uniq(I.bit)} mordido(s)`);
    let tip = '';
    if (hurt() && !S.jobs.medico) tip += ' Coloque médicos para tratar os feridos.';
    if (S.bitten.length) tip += ' Há uma decisão difícil esperando por você.';
    addLog(`🩸 A invasão deixou ${joinNames(parts)}.${tip}`, 'bad');
  }

  // ---------- decisão sobre quem foi mordido ----------
  let dlg = null;
  function prompt() {
    if ((dlg && dlg.open) || !S.bitten.length || S.horde.active || modalOpen || awaitingChoice) return;
    const name = S.bitten[0], more = S.bitten.length - 1;
    let result = null;
    const opts = [
      { label: `Matar ${name}`, hint: `Sem risco para o grupo · 🕯️ luto: −${Math.round(MOURN_PENALTY * 100)}% de produção por ${fmtTime(MOURN_TIME)}`,
        run: () => {
          remember(name, 'levou uma mordida e não chegou a se transformar');
          S.mourn = Math.min(MOURN_TIME * 2, S.mourn + MOURN_TIME);
          S.meta.stats.mercyKills = (S.meta.stats.mercyKills || 0) + 1;
          return [`O grupo se despediu de ${name} em silêncio, antes que a febre terminasse o serviço. Ninguém dormiu direito. 🕯️ Luto: −${Math.round(MOURN_PENALTY * 100)}% de produção por ${fmtTime(MOURN_TIME)}.`, 'warn'];
        } },
      { label: `Liberar ${name}`, hint: `Sem luto · ${name} deixa o abrigo e provavelmente volta na próxima horda como um zumbi mais forte. Com sorte, resiste à infecção e volta curado`,
        run: () => {
          if (Math.random() < CURE_CHANCE) S.returning.push({ n: name, t: rnd(150, 300) });
          else S.turned.push(name);
          return [`${name} pegou uma mochila, agradeceu com os olhos e saiu pelo portão. Ninguém sabe o que vai acontecer.`, 'warn'];
        } },
    ];
    dlg = openDialog({
      title: '🦷 Uma mordida',
      body: () => result
        ? `<p class="event-result ${result[1]}">${result[0]}</p>`
        : `<p class="event-text">${name} escapou da invasão, mas esconde uma mordida no braço. A febre já começou e não há cura conhecida. O grupo inteiro espera a sua decisão.</p>
           <div class="event-opts">${opts.map((o, i) => `<button class="event-opt" data-opt="${i}" data-hotkey="${i + 1}">
             <span class="eo-label">${hk(i + 1)} ${o.label}</span><span class="eo-hint">${o.hint}</span></button>`).join('')}</div>
           ${more ? `<p class="hint">Mais ${more} pessoa(s) mordida(s) esperando decisão.</p>` : ''}`,
      buttons: [{ label: 'Continuar', cls: 'primary', hidden: () => !result }],
      onOpt: i => {
        if (result || S.bitten[0] !== name) return;
        S.bitten.shift();
        result = opts[+i].run();
        addLog(`🦷 ${result[0]}`, result[1]);
        emit('biteChoice', { kill: +i === 0 });
      },
    });
  }

  return { victim, zombie, enter, fight, fighters, tick, addTurned, onKill, onWaveEnd, prompt };
})();
