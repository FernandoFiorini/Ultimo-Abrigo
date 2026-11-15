'use strict';

const WAVE_SPECIAL = ['tanque', 'cuspidor', 'explosivo', 'arremessador', 'uivador', 'hospedeiro', 'blindado', 'gosma'];

// Quantos zumbis de cada tipo vêm na onda n (sem montar a fila): { tipo: quantidade }
function waveCounts(n) {
  const total = waveSize(n), e = n + D().early;
  const c = {
    chefe: bossCount(n),   // tabela por dificuldade (BOSS_SCALE, em config.js)
    tanque: e >= 4 ? Math.floor((e - 1) / 3) : 0,
    cuspidor: e >= 6 ? Math.floor((e - 3) / 3) : 0,
    explosivo: e >= 8 ? Math.floor((e - 5) / 3) : 0,
    corredor: e >= 3 ? Math.floor(total * (0.25 + 0.03 * D().early)) : 0,
    arremessador: e >= 5 ? Math.floor((e - 1) / 4) : 0,
    uivador: e >= 7 ? Math.floor((e - 3) / 4) : 0,
    hospedeiro: e >= 9 ? Math.floor((e - 5) / 4) : 0,
    blindado: e >= 11 ? Math.floor((e - 8) / 3) : 0,
    gosma: e >= 14 ? Math.floor((e - 10) / 4) : 0,
  };
  const specials = c.chefe + WAVE_SPECIAL.reduce((a, t) => a + c[t], 0);
  c.normal = Math.max(0, total - specials - c.corredor);
  return c;
}

function waveComposition(n) {
  const c = waveCounts(n);
  const q = [...Array(c.normal).fill('normal'), ...Array(c.corredor).fill('corredor')];
  for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
  for (const t of WAVE_SPECIAL)
    for (let i = 0; i < c[t]; i++) q.splice(Math.floor(q.length * (0.3 + Math.random() * 0.7)), 0, t);
  for (let i = 0; i < c.chefe; i++) q.push('chefe');
  return q;
}

// Antes dos guardas, a defesa é só o líder: cada zumbi que chega ao muro bate LONE_HITS vezes a mais
// antes de cair. Quem atira quase não sente (abate antes); quem não atira perde muito muro.
const LONE_HITS = 2;
const loneHits = () => (typeof Unlocks !== 'undefined' && !Unlocks.job('guarda') ? LONE_HITS : 0);

function startWave(quiet) {
  const n = S.wave;
  // o evento pode ter sido sorteado antes, para o alarme de onda perigosa
  const event = S.pending !== undefined ? S.pending : Endgame.rollEvent(n);
  delete S.pending;
  const queue = Endgame.modifyQueue(Bosses.assign(waveComposition(n), n), event);
  // debug: chefe escolhido no menu entra na frente da fila
  if (S.dbgBoss) { queue.unshift(S.dbgBoss); delete S.dbgBoss; }
  // quem foi liberado depois de uma mordida e não resistiu volta com a horda (saqueadores não trazem ninguém)
  const turned = Endgame.EVENTS[event] && Endgame.EVENTS[event].humans ? [] : Invasion.addTurned(queue);
  S.horde = { active: true, n, queue, event, spawnT: 1.5, zs: [], kills: 0, loot: 0, food: 0, ammo: 0, dmg: 0, gcd: [], tcd: [], mcd: [], turned,
    deaths: 0, deathCap: Math.max(1, Math.ceil(home() * DEATH_CAP)), ghurt: 0, unpaid: payUpkeep(quiet) };
  // Investida: uma massa chega toda de uma vez no meio da noite (offline, entra direto na fila)
  if (Endgame.EVENTS[event] && Endgame.EVENTS[event].rush) {
    const mass = rushComposition(n);
    if (quiet) queue.push(...mass); else Object.assign(S.horde, { rush: mass, rushT: RUSH_DELAY });
  }
  const word = foeWord(queue[0]);
  if (!quiet) addLog(`🌙 A noite caiu. Onda ${n}: ${queue.length + (S.horde.rush ? S.horde.rush.length : 0)} ${word} se aproximam!` +
    (queue.some(t => ZTYPES[t].boss) ? ' Algo ENORME vem junto...' : ''), 'warn');
  if (event && !quiet) addLog(`${Endgame.EVENTS[event].icon} NOITE ESPECIAL: ${Endgame.EVENTS[event].nome}! ${Endgame.EVENTS[event].desc}`, 'bad');
  Weapons.refill();
  Airdrop.plan(S.horde, quiet);
  emit('waveStart', { n, count: queue.length + (S.horde.rush ? S.horde.rush.length : 0), boss: queue.some(t => ZTYPES[t].boss), event, word });
}

// Manutenção das torres, cobrada no começo da horda. Devolve as torres que ficaram sem pagar.
function payUpkeep(quiet) {
  const unpaid = [];
  for (const k in TOWERS) {
    if (!S.build[k]) continue;
    const c = towerUpkeep(k);
    if (canAfford(c)) pay(c); else unpaid.push(k);
  }
  if (unpaid.length && !quiet) addLog(`🔧 Sem recursos para a manutenção: ${unpaid.map(k => `${BUILD[k].icon} ${BUILD[k].nome}`).join(', ')} atira${unpaid.length > 1 ? 'm' : ''} na metade da velocidade nesta horda.`, 'warn');
  return unpaid;
}

// Guarda ferido em cima do muro (ácido do cuspidor ou pancada no muro): vai para os feridos e sai da função
function hurtGuard(kind) {
  const H = S.horde;
  if (S.jobs.guarda < 2 || (H.ghurt || 0) >= 1 + Math.floor(H.n / GUARD_HURT.perWave) || Math.random() >= GUARD_HURT[kind]) return;
  const pool = S.people.filter(n => !S.injured.some(w => w.n === n));
  if (pool.length <= 1) return;
  const name = pool[Math.floor(Math.random() * pool.length)];
  S.injured.push({ n: name, t: HEAL_TIME });
  S.jobs.guarda--;
  H.ghurt = (H.ghurt || 0) + 1;
  fixJobs();
  addLog(`🤕 ${name} se feriu de guarda no muro (${kind === 'spit' ? 'ácido de cuspidor' : 'pancada de zumbi'}). Um médico pode tratar.`, 'bad');
  emit('injured', { x: WORLD.WALL_X - 10, y: 168, name });
}

// A massa da Investida: no mínimo 20, cresce com a onda, com alguns brutamontes no meio
function rushComposition(n) {
  const k = Math.max(20, Math.round(waveSize(n) * 0.6));
  return Array.from({ length: k }, (_, i) => (i % 9 === 4 && n >= 6 ? 'tanque' : Math.random() < 0.35 ? 'corredor' : 'normal'));
}

function spawnZombie(type, H, opts = {}) {
  const Z = ZTYPES[type], hp = Z.hp * hpMult(H.n) * Endgame.hpMultEv();
  const z = {
    id: S.zid++, type, hp, maxHp: hp, state: 'walk', t: 0, hits: 0, spits: 0,
    x: (opts.x ?? WORLD.SPAWN_X + Math.random() * 10) + (Z.boss ? 15 : 0),
    y: opts.y ?? (Z.boss ? 178 : WORLD.LANE_MIN + Math.random() * (WORLD.LANE_MAX - WORLD.LANE_MIN)),
    speed: Z.speed * D().speed * Endgame.speedMultEv() * (0.85 + Math.random() * 0.3),
  };
  z.speed0 = z.speed;
  if (type === 'mordido') z.name = (H.turned || []).shift() || null;
  H.zs.push(z);
  return z;
}

// tamanho atual (o Colosso encolhe ao perder a casca) e altura do corpo (lift: no ar, pulando)
const zsc = z => z.scale || ZTYPES[z.type].scale;
const zy = z => z.y - (z.lift || 0) - 9 * zsc(z);

// Alvo de uma torre: a longa mira no mais resistente, a curta só em quem já chegou perto do muro (e não perde tempo com blindados)
function towerTarget(T) {
  const max = T.reach ? WORLD.WALL_X + T.reach : Endgame.range();
  let best = null;
  for (const z of S.horde.zs) {
    if (z.dead || z.under || z.x > max || (T.noArmor && ZTYPES[z.type].armor)) continue;
    if (!best || (T.target === 'hp' ? z.hp > best.hp || (z.hp === best.hp && z.x < best.x) : z.x < best.x)) best = z;
  }
  return best;
}

function pickTarget() {
  let best = null;
  for (const z of S.horde.zs) if (!z.dead && !z.under && z.x <= Endgame.range() && (!best || z.x < best.x)) best = z;
  return best;
}

// o: { blast, fire, rocket }: tipo do dano, para as armaduras e fraquezas dos chefes
// tipo do dano para as fraquezas e resistências (ZTYPES[t].res)
const dmgKind = (src, o) => o.fire ? 'fire' : (o.blast || o.rocket || src === 'explode' || src === 'air') ? 'blast' : src === 'wall' || src === 'melee' ? null : 'bullet';

function damageZombie(z, dmg, src, o = {}) {
  if (z.dead) return;
  const res = ZTYPES[z.type].res, kind = res && dmgKind(src, o);
  if (kind && res[kind]) {
    dmg *= res[kind];
    if (!z.wk) { z.wk = 1; emit('weak', { x: z.x, y: zy(z), mult: res[kind], kind }); }
    Codex.discover(kind + '_' + z.type);
  }
  if (ZTYPES[z.type].ai) { dmg = Bosses.guard(z, dmg, src, o); if (!(dmg > 0)) return; }
  // boneco do campo de treino (debug): só registra o dano e nunca morre
  if (z.dummy) { emit('hit', { id: z.id, x: z.x, y: zy(z) }); Debug.dummyHit(z, dmg, src, o); return; }
  z.hp -= dmg;
  emit('hit', { id: z.id, x: z.x, y: zy(z) });
  if (z.hp <= 0) killZombie(z, src);
  else if (ZTYPES[z.type].ai) Bosses.hurt(z);
}

function killZombie(z, src) {
  if (z.dead) return;
  if (z.dummy) { Debug.dummyHit(z, z.maxHp, src, { kill: true }); return; }   // abate direto no boneco
  const H = S.horde, Z = ZTYPES[z.type];
  const loot = src === 'wall' ? 0 : Math.round(Z.loot * Endgame.lootMult());
  z.hp = 0; z.dead = true;
  S.res.sucata += loot;
  S.kills++; H.kills++; H.loot += loot;
  if (src !== 'wall') bountyOf(z.type, H);
  emit('zdeath', { id: z.id, x: z.x, y: z.y, type: z.type, loot, src, scale: z.scale, ph: z.ph });
  // morrendo queimando: o Hospedeiro não solta esporos e o ácido do Cuspidor explode
  const burning = z.burn > 0;
  if (Z.onDeath && !(burning && Z.onDeath === 'harden')) zombieBuff(z, Z.onDeath);
  else if (Z.onDeath) { emit('weak', { x: z.x, y: zy(z), text: 'esporos queimados!' }); Codex.discover('burn_spores'); }
  if (Z.acidBurst && burning) acidBurst(z);
  countKill(z.type);
  Endgame.onKill(z, src);
  Champions.onKill(z, src);
  if (src === 'player') Weapons.onKill(z);
  Invasion.onKill(z, src);
  if (Z.boss) { gainCash(D().bossCash, `${Bosses.the(z.type)} foi derrotad${Z.art || 'a'}!`, z.x, zy(z) - 10); Weapons.bossLoot(z.type); }
  if (Z.ai || Z.split) Bosses.onDeath(z, src);
  if (Z.explode) {
    emit('explode', { x: z.x, y: zy(z) });
    // Explodir um inchado longe do muro fere os zumbis próximos
    if (src !== 'wall')
      for (const o of H.zs)
        if (!o.dead && Math.abs(o.x - z.x) < 26 && Math.abs(o.y - z.y) < 14) damageZombie(o, 2, 'explode');
  }
}

// ácido do Cuspidor explodindo no fogo: fere quem está em volta
function acidBurst(z) {
  emit('acidBurst', { x: z.x, y: zy(z), r: ACID_BURST.r });
  Codex.discover('burn_acid');
  for (const o of S.horde.zs)
    if (!o.dead && o !== z && Math.abs(o.x - z.x) < ACID_BURST.r && Math.abs(o.y - z.y) < ACID_BURST.r * 0.6) damageZombie(o, ACID_BURST.dmg * hpMult(S.horde.n), 'explode');
}

// Comida e munição de quem foi abatido: saqueadores carregam suprimentos; a Horda Furiosa rende comida
function bountyOf(type, H, k = 1) {
  const Z = ZTYPES[type], ev = Endgame.event(), m = Endgame.lootMult();
  const food = Math.round(((Z.food || 0) + ((ev && ev.food) || 0)) * m) * k, ammo = Math.round((Z.ammo || 0) * m) * k;
  if (food) { S.res.comida += food; H.food = (H.food || 0) + food; }
  if (ammo) { S.res.municao += ammo; H.ammo = (H.ammo || 0) + ammo; }
}

// Uivador (grito: mais velocidade) e Hospedeiro (esporos: mais vida) fortalecem quem está por perto ao morrer
function zombieBuff(z, kind) {
  const B = ZBUFF[kind];
  let n = 0;
  for (const o of S.horde.zs) {
    if (o.dead || o === z || ZTYPES[o.type].boss || Math.abs(o.x - z.x) > B.r || Math.abs(o.y - z.y) > B.r * 0.6) continue;
    if (kind === 'haste') {
      const max = (o.speed0 || o.speed) * B.max;
      if (o.speed >= max) continue;
      o.speed = Math.min(max, o.speed * B.mult); o.haste = true;
    } else {
      if ((o.hard || 0) >= B.max) continue;
      o.hard = (o.hard || 0) + 1;
      o.maxHp *= B.mult; o.hp *= B.mult;
    }
    n++;
  }
  emit('zbuff', { kind, x: z.x, y: zy(z), n });
}

// Ataque aéreo comprado na loja: atinge todos os zumbis na tela
function airStrike() {
  const H = S.horde;
  for (const z of H.zs) {
    if (z.dead) continue;
    emit('explode', { x: z.x, y: zy(z), air: true });
    if (ZTYPES[z.type].boss) damageZombie(z, 10, 'air', { blast: true, rocket: true });
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
    const type = H.queue.shift(), z = spawnZombie(type, H);
    H.spawnT = spawnGap(H.n) * (0.6 + Math.random() * 0.8);
    if (ZTYPES[type].boss) Bosses.spawned(z);
  }

  // Investida: contagem regressiva com alarme e a massa inteira surgindo de uma vez
  if (H.rush) {
    const before = Math.ceil(H.rushT);
    H.rushT -= dt;
    const now = Math.ceil(H.rushT);
    if (now !== before && now <= 5 && now > 0) emit('countdown', { n: now, rush: true });
    if (H.rushT <= 0) {
      const mass = H.rush;
      H.rush = null;
      mass.forEach((t, i) => spawnZombie(t, H, { x: WORLD.SPAWN_X - 10 + (i % 6) * 6 + Math.random() * 8 }));
      addLog(`⚠️ INVESTIDA! ${mass.length} zumbis chegaram todos de uma vez!`, 'bad');
      emit('rush', { n: mass.length });
    }
  }

  // airdrop: avião, queda e quem foi buscar
  Airdrop.tick(dt);
  if (S !== st) return;

  // Armadilhas, cerca elétrica e chuva ácida
  Endgame.hordeTick(dt);
  // granadas em voo e zumbis em chamas
  Weapons.hordeTick(dt);
  if (S !== st) return;
  // pastor alemão: avança em quem bate no muro
  Pets.hordeTick(dt);
  // poças de ácido da Mãe-Cuspideira
  if (!Bosses.hordeTick(dt)) return;

  const WX = WORLD.WALL_X + 13;
  for (const z of H.zs) {
    if (z.dead) continue;
    // o boneco do campo de treino fica parado e não ataca
    if (z.dummy) { if (z.stun > 0) z.stun = Math.max(0, z.stun - dt); continue; }
    const Z = ZTYPES[z.type];
    // atordoado (grito de morte do Rei Uivador, crias e pedaços recém-nascidos)
    if (z.stun > 0) { z.stun -= dt; continue; }
    // muro caído: quem chega nele (ou estava atacando) entra no abrigo
    if (S.wallDown && z.state !== 'invade' && (z.state === 'attack' || z.x <= WX + (Z.boss ? 8 : 0))) Invasion.enter(z);
    // chefes: estados especiais (pular, rolar, cavar, cuspir ácido...)
    if (Z.ai && z.state !== 'invade') {
      const r = Bosses.tick(z, dt);
      if (r < 0 || S !== st) return;
      if (r > 0 || z.dead) continue;
    }
    if (z.state === 'invade') {
      if (!Invasion.zombie(z, dt)) return;
    } else if (z.state === 'walk') {
      // indo atrás de quem saiu para buscar o airdrop
      if (z.chase) { if (Airdrop.steer(z, dt)) { if (S !== st) return; continue; } }
      z.x -= z.speed * dt * Champions.slow(z);
      if (Z.spit && !S.wallDown && z.spits < Z.spit.count && z.x <= WX + Z.spit.range) { z.state = 'spit'; z.t = 0; }
      else if (z.x <= WX + (Z.boss ? 8 : 0)) { z.x = WX + (Z.boss ? 8 : 0); z.state = 'attack'; z.t = 0; }
    } else if (z.state === 'spit') {
      z.t += dt;
      if (z.t >= Z.spit.cd) {
        z.t = 0; z.spits++;
        // o Chefe Saqueador alterna molotov e granada (mais forte)
        const gren = Z.ai === 'warlord' && z.spits % 2 === 0;
        emit('spit', { x: z.x - 4, y: zy(z) - 4, ty: z.y, proj: gren ? 'grenade' : Z.spit.proj });
        H.dmg += wallDamage(Z.spit.dmg * (gren ? 1.6 : 1) * dmgMult(H.n), z.y);
        if (S === st && !S.wallDown) hurtGuard('spit');
        if (S !== st) return;
        if (z.spits >= Z.spit.count || S.wallDown) z.state = 'walk';
      }
    } else {
      z.t += dt;
      if (Z.explode) {
        if (z.t >= 0.6) { H.dmg += wallDamage(Z.dmg * dmgMult(H.n), z.y); if (S !== st) return; killZombie(z, 'wall'); }
      } else if (z.t >= (z.atkS || Z.atk || 1)) {
        z.t -= z.atkS || Z.atk || 1; z.hits++;
        if (Z.boss) emit('boss', { k: 'smash', x: z.x, y: z.y, type: z.type, id: z.id });
        H.dmg += wallDamage(Z.dmg * (z.dmgM || 1) * dmgMult(H.n), z.y);
        if (S !== st) return;
        if (!S.wallDown) hurtGuard('smash');
        if (z.hits >= Z.hits + loneHits()) killZombie(z, 'melee');
      }
    }
  }

  // sobreviventes lutando corpo a corpo com quem entrou
  Invasion.fight(dt);

  const g = S.jobs.guarda, fm = fireMult(), gfm = fm * guardFire() * (1 + Champions.val('gfire')) * (H.dropBuff ? AIRDROP.milFire : 1);
  for (let i = 0; i < g; i++) {
    H.gcd[i] = (H.gcd[i] ?? Math.random() * GUARD_CD) - dt;
    if (H.gcd[i] > 0) continue;
    const z = pickTarget();
    if (!z) { H.gcd[i] = Math.random() * 0.4; continue; }
    if (S.res.municao >= 1) {
      // tiro errado também gasta munição
      S.res.municao -= 1;
      H.gcd[i] = GUARD_CD / gfm * (0.85 + Math.random() * 0.3);
      tire(1);
      const hit = Math.random() < accuracy('guard');
      emit('shot', { src: 'guard', idx: i, x: z.x, y: zy(z), miss: !hit });
      if (hit) Endgame.hit(z, Endgame.mult('dmg'), 'guard');
    } else {
      H.gcd[i] = ROCK_CD / guardFire();
      tire(1);
      const hit = Math.random() < ROCK_HIT;
      emit('shot', { src: 'rock', idx: i, x: z.x, y: zy(z), hit });
      if (hit) damageZombie(z, 1, 'rock');
    }
  }

  // torres: cada tipo tem seus atiradores, arma e alvo preferido (veja TOWERS)
  const tfm = fm * (1 + Endgame.ab('tower'));
  let j = 0;
  for (const k in TOWERS) {
    if (!S.build[k]) continue;
    const T = TOWERS[k], ts = towerStat(k);
    for (let i = 0; i < ts.crew; i++, j++) {
      H.tcd[j] = (H.tcd[j] ?? Math.random() * ts.cd) - dt;
      if (H.tcd[j] > 0) continue;
      const z = towerTarget(T);
      if (!z) { H.tcd[j] = Math.random() * 0.4; continue; }
      H.tcd[j] = ts.cd / tfm / towerPay(k) * (0.85 + Math.random() * 0.3);
      const hit = Math.random() < ts.acc;
      emit('shot', { src: 'tower', tw: T.slot, idx: i, x: z.x, y: zy(z), miss: !hit, quiet: T.quiet && Math.random() < T.quiet });
      if (hit) { Endgame.hit(z, ts.dmg * Endgame.mult('dmg'), 'tower', { head: T.head }); Champions.onTowerHit(z); }
    }
  }

  // herói de campo: ataque básico, urso, zumbis confusos e contagem das habilidades
  Champions.hordeTick(dt);

  H.zs = H.zs.filter(z => !z.dead);
  if (!H.queue.length && !H.zs.length && !H.rush && !H.train) endWave();
}

// Dano que a defesa (guardas e torres) causa numa onda de `count` zumbis, sem mexer no estado.
// Estima a duração da onda (zumbis surgindo + caminhada até o muro) e quantos tiros cabem nela.
// ammo: munição disponível para os guardas. Devolve { dmg, armed (munição gasta), guardShots }.
function defenseEstimate(count, n, ammo = S.res.municao) {
  const fm = fireMult(), g = S.jobs.guarda;
  const duration = count * spawnGap(n) + 15 / D().speed;
  // o cansaço sobe durante a onda: usa o cansaço médio estimado (começo + metade do que a onda vai cansar)
  const f0 = S.fatigue || 0, fresh = duration / GUARD_CD * fm * OFFLINE_EFF * (1 - FAT_FIRE * f0);
  const fAvg = Math.min(1, f0 + fresh * fatigueShot() / 2);
  const guardShots = g * duration / GUARD_CD * fm * (1 - FAT_FIRE * fAvg) * OFFLINE_EFF;
  const armed = Math.min(guardShots, Math.floor(ammo));
  const rockHits = (guardShots - armed) * (GUARD_CD / ROCK_CD) * ROCK_HIT;
  // torres: a curta só atira em parte da onda (quando os zumbis chegam perto) e o tiro da longa
  // não vale mais que o dobro da vida de um zumbi comum (o resto seria desperdiçado em quem morre com 1 tiro)
  let tower = 0;
  for (const k in TOWERS) {
    if (!S.build[k]) continue;
    const T = TOWERS[k], ts = towerStat(k);
    const shots = ts.crew * duration / ts.cd * fm * (1 + Endgame.ab('tower')) * towerPay(k) * OFFLINE_EFF * (T.reach ? 0.5 : 1);
    const per = T.target === 'hp' ? Math.min(ts.dmg, 2 * hpMult(n)) : ts.dmg;
    tower += shots * ts.acc * per;
  }
  // mesma precisão do combate ao vivo
  return { dmg: armed * accuracy('guard') + rockHits + tower, armed, guardShots };
}

// Dano total que a defesa causa numa onda resolvida de uma vez (offline): gasta a munição e cansa os guardas
function offlineDefense(count) {
  const e = defenseEstimate(count, S.horde.n || S.wave);
  S.res.municao -= e.armed;
  tire(e.guardShots);
  return e.dmg;
}

// Ameaça de uma onda: vida total dos zumbis (o blindado vale ARMOR_OFFLINE, como no offline). Para o debug.
function waveThreat(n) {
  const c = waveCounts(n);
  return Object.keys(c).reduce((a, t) => a + c[t] * ZTYPES[t].hp * hpMult(n) * (ZTYPES[t].armor ? ARMOR_OFFLINE : 1), 0);
}

// Resolve o resto da onda de uma vez (aba em segundo plano no meio de uma horda)
function flushWave() {
  const H = S.horde, g = {};
  const add = (t, n, hp) => { const e = g[t] || (g[t] = { n: 0, hp: 0 }); e.n += n; e.hp += hp; };
  for (const z of H.zs) if (!z.dead) add(z.type, 1, z.hp);
  for (const t of [...H.queue, ...(H.rush || [])]) add(t, 1, queuedHp(t, H.n));
  H.rush = null;
  resolveGroups(g);
}

// vida de um zumbi que ainda não entrou na cena (as armadilhas já descontam no offline)
const queuedHp = (t, n) => Math.max(0.1, ZTYPES[t].hp * hpMult(n) * Endgame.hpMultEv() - Endgame.offlineTrap());

// Onda inteira resolvida de uma vez, sem montar a fila zumbi por zumbi (progresso offline).
// Sem chefes: no offline, as ondas de chefe vêm só com a horda comum. Saque, cash e conquistas de chefe só saem jogando.
function offlineWave() {
  const n = S.wave;
  const event = S.pending !== undefined ? S.pending : Endgame.rollEvent(n);
  delete S.pending;
  const E = Endgame.EVENTS[event];
  S.horde = { active: true, n, queue: [], event, spawnT: 0, zs: [], kills: 0, loot: 0, food: 0, ammo: 0, dmg: 0, gcd: [], tcd: [], mcd: [], turned: [],
    deaths: 0, deathCap: Math.max(1, Math.ceil(home() * DEATH_CAP)), ghurt: 0, unpaid: payUpkeep(true) };
  const c = waveCounts(n);
  delete c.chefe;
  // noites especiais, como em modifyQueue (sem o chefe)
  if (E && E.runners) { c.corredor += c.normal; c.normal = 0; }
  if (E && E.humans) {
    const tot = Object.values(c).reduce((a, b) => a + b, 0), inc = Math.round(tot * 0.3);
    for (const t in c) delete c[t];
    c.saqueador = tot - inc; c.incendiario = inc;
  }
  if (E && E.count && E.count !== 1) for (const t in c) c[t] = Math.round(c[t] * E.count);
  if (E && E.rush) {
    const k = Math.max(20, Math.round(waveSize(n) * 0.6)), tanks = n >= 6 ? Math.floor(k / 9) : 0, runners = Math.round((k - tanks) * 0.35);
    c.tanque = (c.tanque || 0) + tanks; c.corredor = (c.corredor || 0) + runners; c.normal = (c.normal || 0) + k - tanks - runners;
  }
  // quem foi liberado depois de uma mordida e não resistiu volta com a horda (saqueadores não trazem ninguém)
  if (!(E && E.humans)) { S.horde.turned = Invasion.addTurned([]); if (S.horde.turned.length) c.mordido = (c.mordido || 0) + S.horde.turned.length; }
  Weapons.refill();
  const g = {};
  for (const t in c) if (c[t] > 0) g[t] = { n: c[t], hp: c[t] * queuedHp(t, n) };
  resolveGroups(g);
}

// Resolve grupos de zumbis { tipo: { n, hp (vida somada) } } contra o dano estimado da defesa.
// A fila é embaralhada, então cada grupo cai na mesma proporção; quem sobra passa pelo muro.
function resolveGroups(groups) {
  const st = S, H = S.horde;
  for (const t in groups) {
    const Z = ZTYPES[t], e = groups[t];
    // o blindado só cai com tiros na cabeça: custa bem mais tiros · chefes com fases e armaduras ficam mais duros
    if (Z.armor) e.hp *= ARMOR_OFFLINE;
    if (Z.off) e.hp *= Z.off;
    // a Matriarca traz crias
    if (Z.ai === 'brood') { const cr = groups.cria || (groups.cria = { n: 0, hp: 0 }); cr.n += 8 * e.n; cr.hp += 8 * e.n * ZTYPES.cria.hp * hpMult(H.n); }
  }
  const total = Object.values(groups).reduce((a, e) => a + e.n, 0);
  let pool = offlineDefense(total) * Endgame.mult('dmg') * Endgame.offlineMult(), leak = 0;
  let cur = groups;
  for (let pass = 0; pass < 4 && Object.keys(cur).length; pass++) {
    const hpAll = Object.values(cur).reduce((a, e) => a + e.hp, 0);
    const f = hpAll > 0 ? Math.min(1, pool / hpAll) : 1;
    pool = Math.max(0, pool - hpAll * f);
    const next = {};
    for (const t in cur) {
      const e = cur[t], k = f >= 1 ? e.n : Math.min(e.n, Math.floor(e.n * f + Math.random()));
      if (k > 0) killGroup(t, k, H, next);
      if (S !== st) return;
      const left = e.n - k;
      if (left > 0) {
        leak += leakOf(t, H.n) * left;
        const spit = ZTYPES[t].spit ? 'spit' : 'smash';
        for (let i = 0, m = Math.min(left, 30); i < m; i++) hurtGuard(spit);
      }
    }
    cur = next;
  }
  H.queue = []; H.zs = [];
  H.dmg += wallDamage(leak);
  if (S === st) endWave();
}

// k zumbis do mesmo tipo abatidos de uma vez: saque, recompensas, amostras e conquistas
function killGroup(t, k, H, next) {
  const Z = ZTYPES[t];
  const loot = Math.round(Z.loot * Endgame.lootMult()) * k;
  S.res.sucata += loot; S.kills += k; H.kills += k; H.loot += loot;
  bountyOf(t, H, k);
  countKill(t, k);
  Endgame.onKills(t, k);
  if (Z.boss) for (let i = 0; i < k; i++) { gainCash(D().bossCash, `${Bosses.the(t)} foi derrotad${Z.art || 'a'}!`); Weapons.bossLoot(t); }
  // o Hospedeiro Gigante e seus brotos se dividem
  const sp = Z.split;
  if (sp) { const e = next[sp.type] || (next[sp.type] = { n: 0, hp: 0 }); e.n += sp.n * k; e.hp += sp.n * k * ZTYPES[sp.type].hp * hpMult(H.n) * Endgame.hpMultEv(); }
}

function endWave() {
  const H = S.horde;
  H.active = false;
  S.best = Math.max(S.best, H.n);
  S.wave = H.n + 1;
  S.waveTimer = waveInterval();
  const extra = (H.food ? `, +${H.food} comida` : '') + (H.ammo ? `, +${H.ammo} munição` : '');
  const ev = Endgame.EVENTS[H.event];
  addLog(`☀️ Onda ${H.n} sobrevivida! ${H.kills} ${ev && ev.humans ? 'saqueadores repelidos' : 'zumbis abatidos'} (+${H.loot} sucata${extra})` +
    (H.inv ? '. Os zumbis invadiram o abrigo.' : H.dmg > 0 ? `. O muro sofreu ${fmt(Math.round(H.dmg))} de dano.` : '. Nenhum dano ao muro!'),
    H.dmg > 0 || H.inv ? 'warn' : 'good');
  Airdrop.onWaveEnd(H);
  const st = S.meta.stats;
  st.bestWave = Math.max(st.bestWave, H.n);
  Endgame.onWaveEnd(H);
  Champions.onWaveEnd(H);
  Invasion.onWaveEnd(H);
  if (H.dmg === 0 && !H.inv && !S.wallDown && H.n >= 5) st.flawless++;
  // cidade sendo tomada: aviso a cada 3 ondas além da 10 (a próxima onda já vem mais resistente)
  if (H.n >= SIEGE_WAVE && (H.n - SIEGE_WAVE) % 3 === 0 && H.n > SIEGE_WAVE)
    addLog(`☣️ A cidade está sendo tomada: a próxima horda vem com zumbis +${Math.round((siegeMult(H.n + 1) - 1) * 100)}% mais resistentes, e piora a cada onda. Evacue para recomeçar numa cidade nova.`, 'warn');
  if (H.n === EVAC_WAVE) addLog('🚁 Um helicóptero respondeu ao rádio! Agora você pode EVACUAR para outra cidade (aba Evacuar).', 'good');
  emit('waveEnd', { n: H.n, kills: H.kills, humans: !!(ev && ev.humans) });
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
