'use strict';

function waveComposition(n) {
  const total = waveSize(n), e = n + D().early;
  const count = {
    chefe: n % 10 === 0 ? n / 10 : 0,
    tanque: e >= 4 ? Math.floor((e - 1) / 3) : 0,
    cuspidor: e >= 6 ? Math.floor((e - 3) / 3) : 0,
    explosivo: e >= 8 ? Math.floor((e - 5) / 3) : 0,
    corredor: e >= 3 ? Math.floor(total * (0.25 + 0.03 * D().early)) : 0,
  };
  const specials = count.chefe + count.tanque + count.cuspidor + count.explosivo;
  const q = [...Array(Math.max(0, total - specials - count.corredor)).fill('normal'), ...Array(count.corredor).fill('corredor')];
  for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
  for (const t of ['tanque', 'cuspidor', 'explosivo'])
    for (let i = 0; i < count[t]; i++) q.splice(Math.floor(q.length * (0.3 + Math.random() * 0.7)), 0, t);
  for (let i = 0; i < count.chefe; i++) q.push('chefe');
  return q;
}

function startWave(quiet) {
  const n = S.wave;
  const event = Endgame.rollEvent(n);
  const queue = Endgame.modifyQueue(waveComposition(n), event);
  // quem foi liberado depois de uma mordida e não resistiu volta com a horda
  const turned = Invasion.addTurned(queue);
  S.horde = { active: true, n, queue, event, spawnT: 1.5, zs: [], kills: 0, loot: 0, dmg: 0, gcd: [], tcd: [], mcd: [], turned,
    deaths: 0, deathCap: Math.max(1, Math.ceil(home() * DEATH_CAP)) };
  if (!quiet) addLog(`🌙 A noite caiu. Onda ${n}: ${queue.length} zumbis se aproximam!` +
    (queue.includes('chefe') ? ' Algo ENORME vem junto...' : ''), 'warn');
  if (event && !quiet) addLog(`${Endgame.EVENTS[event].icon} NOITE ESPECIAL: ${Endgame.EVENTS[event].nome}! ${Endgame.EVENTS[event].desc}`, 'bad');
  Weapons.refill();
  emit('waveStart', { n, count: queue.length, boss: queue.includes('chefe'), event });
}

const zy = z => z.y - 9 * ZTYPES[z.type].scale;

function pickTarget() {
  let best = null;
  for (const z of S.horde.zs) if (!z.dead && z.x <= Endgame.range() && (!best || z.x < best.x)) best = z;
  return best;
}

function damageZombie(z, dmg, src) {
  if (z.dead) return;
  z.hp -= dmg;
  emit('hit', { id: z.id, x: z.x, y: zy(z) });
  if (z.hp <= 0) killZombie(z, src);
}

function killZombie(z, src) {
  if (z.dead) return;
  const H = S.horde, Z = ZTYPES[z.type];
  const loot = src === 'wall' ? 0 : Math.round(Z.loot * Endgame.lootMult());
  z.hp = 0; z.dead = true;
  S.res.sucata += loot;
  S.kills++; H.kills++; H.loot += loot;
  emit('zdeath', { id: z.id, x: z.x, y: z.y, type: z.type, loot, src });
  countKill(z.type);
  Endgame.onKill(z, src);
  if (src === 'player') Weapons.onKill(z);
  Invasion.onKill(z, src);
  if (Z.boss) gainCash(D().bossCash, 'a Abominação foi derrotada!', z.x, zy(z) - 10);
  if (Z.explode) {
    emit('explode', { x: z.x, y: zy(z) });
    // Explodir um inchado longe do muro fere os zumbis próximos
    if (src !== 'wall')
      for (const o of H.zs)
        if (!o.dead && Math.abs(o.x - z.x) < 26 && Math.abs(o.y - z.y) < 14) damageZombie(o, 2, 'explode');
  }
}

// Ataque aéreo comprado na loja: atinge todos os zumbis na tela
function airStrike() {
  const H = S.horde;
  for (const z of H.zs) {
    if (z.dead) continue;
    emit('explode', { x: z.x, y: zy(z), air: true });
    if (ZTYPES[z.type].boss) damageZombie(z, 10, 'air');
    else killZombie(z, 'air');
  }
  H.zs = H.zs.filter(z => !z.dead);
}

function updateHorde(dt) {
  const st = S, H = S.horde;

  if (H.strikeT > 0) {
    H.strikeT -= dt;
    if (H.strikeT <= 0) airStrike();
  }

  H.spawnT -= dt;
  if (H.queue.length && H.spawnT <= 0) {
    const type = H.queue.shift(), Z = ZTYPES[type];
    const z = {
      id: S.zid++, type, hp: Z.hp * hpMult(H.n) * Endgame.hpMultEv(), maxHp: Z.hp * hpMult(H.n) * Endgame.hpMultEv(), state: 'walk', t: 0, hits: 0, spits: 0,
      x: WORLD.SPAWN_X + Math.random() * 10 + (Z.boss ? 15 : 0),
      y: Z.boss ? 178 : WORLD.LANE_MIN + Math.random() * (WORLD.LANE_MAX - WORLD.LANE_MIN),
      speed: Z.speed * D().speed * Endgame.speedMultEv() * (0.85 + Math.random() * 0.3),
    };
    if (type === 'mordido') z.name = (H.turned || []).shift() || null;
    H.zs.push(z);
    H.spawnT = spawnGap(H.n) * (0.6 + Math.random() * 0.8);
    if (Z.boss) { emit('bossSpawn', { id: z.id }); addLog('👹 Uma ABOMINAÇÃO surgiu na horda!', 'bad'); }
  }

  // Armadilhas, cerca elétrica e chuva ácida
  Endgame.hordeTick(dt);
  // granadas em voo e zumbis em chamas
  Weapons.hordeTick(dt);
  if (S !== st) return;

  const WX = WORLD.WALL_X + 13;
  for (const z of H.zs) {
    if (z.dead) continue;
    const Z = ZTYPES[z.type];
    // muro caído: quem chega nele (ou estava atacando) entra no abrigo
    if (S.wallDown && z.state !== 'invade' && (z.state === 'attack' || z.x <= WX + (Z.boss ? 8 : 0))) Invasion.enter(z);
    if (z.state === 'invade') {
      if (!Invasion.zombie(z, dt)) return;
    } else if (z.state === 'walk') {
      z.x -= z.speed * dt;
      if (Z.spit && !S.wallDown && z.spits < Z.spit.count && z.x <= WX + Z.spit.range) { z.state = 'spit'; z.t = 0; }
      else if (z.x <= WX + (Z.boss ? 8 : 0)) { z.x = WX + (Z.boss ? 8 : 0); z.state = 'attack'; z.t = 0; }
    } else if (z.state === 'spit') {
      z.t += dt;
      if (z.t >= Z.spit.cd) {
        z.t = 0; z.spits++;
        emit('spit', { x: z.x - 4, y: zy(z) - 4, ty: z.y });
        H.dmg += wallDamage(Z.spit.dmg * dmgMult(H.n), z.y);
        if (S !== st) return;
        if (z.spits >= Z.spit.count || S.wallDown) z.state = 'walk';
      }
    } else {
      z.t += dt;
      if (Z.explode) {
        if (z.t >= 0.6) { H.dmg += wallDamage(Z.dmg * dmgMult(H.n), z.y); if (S !== st) return; killZombie(z, 'wall'); }
      } else if (z.t >= 1) {
        z.t -= 1; z.hits++;
        H.dmg += wallDamage(Z.dmg * dmgMult(H.n), z.y);
        if (S !== st) return;
        if (z.hits >= Z.hits) killZombie(z, 'melee');
      }
    }
  }

  // sobreviventes lutando corpo a corpo com quem entrou
  Invasion.fight(dt);

  const g = S.jobs.guarda, fm = fireMult();
  for (let i = 0; i < g; i++) {
    H.gcd[i] = (H.gcd[i] ?? Math.random() * GUARD_CD) - dt;
    if (H.gcd[i] > 0) continue;
    const z = pickTarget();
    if (!z) { H.gcd[i] = Math.random() * 0.4; continue; }
    if (S.res.municao >= 1) {
      // tiro errado também gasta munição
      S.res.municao -= 1;
      H.gcd[i] = GUARD_CD / fm * (0.85 + Math.random() * 0.3);
      const hit = Math.random() < accuracy('guard');
      emit('shot', { src: 'guard', idx: i, x: z.x, y: zy(z), miss: !hit });
      if (hit) Endgame.hit(z, Endgame.mult('dmg'), 'guard');
    } else {
      H.gcd[i] = ROCK_CD;
      const hit = Math.random() < ROCK_HIT;
      emit('shot', { src: 'rock', idx: i, x: z.x, y: zy(z), hit });
      if (hit) damageZombie(z, 1, 'rock');
    }
  }

  for (let i = 0; i < S.build.torre; i++) {
    H.tcd[i] = (H.tcd[i] ?? Math.random() * TOWER_CD) - dt;
    if (H.tcd[i] > 0) continue;
    const z = pickTarget();
    if (!z) { H.tcd[i] = Math.random() * 0.4; continue; }
    H.tcd[i] = TOWER_CD / fm / (1 + Endgame.ab('tower')) * (0.85 + Math.random() * 0.3);
    const hit = Math.random() < accuracy('tower');
    emit('shot', { src: 'tower', idx: i, x: z.x, y: zy(z), miss: !hit });
    if (hit) Endgame.hit(z, Endgame.mult('dmg'), 'tower');
  }

  H.zs = H.zs.filter(z => !z.dead);
  if (!H.queue.length && !H.zs.length) endWave();
}

// Dano total que a defesa causa numa onda resolvida de uma vez (offline).
// Estima a duração da onda (zumbis surgindo + caminhada até o muro) e quantos tiros cabem nela.
function offlineDefense(count) {
  const fm = fireMult(), g = S.jobs.guarda;
  const duration = count * spawnGap(S.horde.n || S.wave) + 15 / D().speed;
  const guardShots = g * duration / GUARD_CD * fm * OFFLINE_EFF;
  const armedShots = Math.min(guardShots, Math.floor(S.res.municao));
  S.res.municao -= armedShots;
  const rockHits = (guardShots - armedShots) * (GUARD_CD / ROCK_CD) * ROCK_HIT;
  const towerShots = S.build.torre * duration / TOWER_CD * fm * (1 + Endgame.ab('tower')) * OFFLINE_EFF;
  // mesma precisão do combate ao vivo
  return armedShots * accuracy('guard') + rockHits + towerShots * accuracy('tower');
}

// Resolve o resto da onda de uma vez (offline / aba em segundo plano)
function flushWave() {
  const st = S, H = S.horde;
  const list = [
    ...H.zs.filter(z => !z.dead).map(z => ({ type: z.type, hp: z.hp })),
    ...H.queue.map(t => ({ type: t, hp: Math.max(0.1, ZTYPES[t].hp * hpMult(H.n) * Endgame.hpMultEv() - Endgame.offlineTrap()) })),
  ];
  let pool = offlineDefense(list.length) * Endgame.mult('dmg') * Endgame.offlineMult(), leak = 0;
  for (const z of list) {
    if (pool >= z.hp) {
      pool -= z.hp;
      const loot = Math.round(ZTYPES[z.type].loot * Endgame.lootMult());
      S.res.sucata += loot; S.kills++; H.kills++; H.loot += loot;
      countKill(z.type);
      Endgame.onKill({ type: z.type }, 'offline');
      if (ZTYPES[z.type].boss) gainCash(D().bossCash, 'a Abominação foi derrotada!');
    } else {
      pool = 0;
      leak += leakOf(z.type, H.n);
    }
  }
  H.queue = []; H.zs = [];
  H.dmg += wallDamage(leak);
  if (S === st) endWave();
}

function endWave() {
  const H = S.horde;
  H.active = false;
  S.best = Math.max(S.best, H.n);
  S.wave = H.n + 1;
  S.waveTimer = waveInterval();
  addLog(`☀️ Onda ${H.n} sobrevivida! ${H.kills} zumbis abatidos (+${H.loot} sucata)` +
    (H.inv ? '. Os zumbis invadiram o abrigo.' : H.dmg > 0 ? `. O muro sofreu ${Math.round(H.dmg)} de dano.` : '. Nenhum dano ao muro!'),
    H.dmg > 0 || H.inv ? 'warn' : 'good');
  const st = S.meta.stats;
  st.bestWave = Math.max(st.bestWave, H.n);
  Endgame.onWaveEnd(H);
  Invasion.onWaveEnd(H);
  if (H.dmg === 0 && !H.inv && !S.wallDown && H.n >= 5) st.flawless++;
  if (H.n === EVAC_WAVE) addLog('🚁 Um helicóptero respondeu ao rádio! Agora você pode EVACUAR para outra cidade (painel Evacuação).', 'good');
  emit('waveEnd', { n: H.n, kills: H.kills });
}

function wallDamage(d, y) {
  if (d <= 0) return 0;
  const st = S;
  const real = Math.min(d, S.wallHp);
  S.wallHp -= real;
  emit('wallHit', { y: y ?? 175 });
  const over = d - real;
  if (over > 0) {
    if (!S.wallDown) {
      S.wallDown = true;
      addLog('🚨 O muro caiu! Os zumbis estão invadindo o abrigo e os sobreviventes vão lutar pela própria vida!', 'bad');
      emit('wallDown');
    }
    S.overflow += over;
    // Cada X de dano além do muro alcança 1 pessoa (morte, ferimento ou mordida).
    // Ao vivo os zumbis entram no abrigo; isto vale para o dano que sobra e para a onda resolvida de uma vez.
    const per = DMG_PER_DEATH * dmgMult(S.horde.n || S.wave);
    while (S === st && S.overflow >= per) {
      S.overflow -= per;
      if (!Invasion.victim(WORLD.WALL_X - 20, 172)) { S.overflow = 0; break; }
    }
  }
  return real;
}

function killSurvivors(n, reason, useMeds) {
  let saved = 0;
  if (useMeds) {
    // o Médico de campo (herói) pode salvar alguém sem gastar remédio
    const medic = Math.min(0.5, Endgame.hb('medico'));
    for (let i = n; i > 0; i--) if (Math.random() < medic) { n--; saved++; }
    const meds = Math.min(n, Math.floor(S.res.remedio));
    S.res.remedio -= meds;
    n -= meds;
    saved += meds;
  }
  n = Math.max(0, Math.min(n, home()));
  const names = [];
  for (let i = 0; i < n; i++) {
    names.push(...removeSurvivors(1, reason));
    if (idle() < 0) {
      const busy = Object.keys(S.jobs).filter(k => S.jobs[k] > 0);
      S.jobs[busy[Math.floor(Math.random() * busy.length)]]--;
    }
  }
  if (saved) { addLog(`💊 Remédios salvaram ${saved} sobrevivente(s).`, 'good'); S.meta.stats.saved += saved; }
  if (n === 1) addLog(`☠️ ${names[0] || 'Um sobrevivente'} ${reason}.`, 'bad');
  else if (n > 1) addLog(`☠️ ${joinNames(names)} não resistiram (${reason.replace(/^morreu/, 'morreram')}).`, 'bad');
  if (home() <= 0 && !S.exps.length) gameOver();
  return n;
}

function gameOver() {
  // Apocalipse: o save morre junto com o abrigo
  if (D().permadeath) { Slots.perish(); return; }
  const best = S.best, kills = S.kills, mods = S.mods;
  S = newState(S.meta, S.diff);
  // os desafios valem para a cidade inteira, mesmo depois de o abrigo cair
  S.mods = mods;
  S.wallHp = maxWall();
  S.waveTimer = waveInterval();
  addLog(`💀 O abrigo caiu. Você chegou até a onda ${best} e abateu ${kills} zumbis. Um novo grupo recomeça...`, 'bad');
  emit('gameOver');
}
