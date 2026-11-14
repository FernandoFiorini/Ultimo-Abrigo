'use strict';

// Chefes: cada um tem um comportamento próprio (ZTYPES[t].ai).
// Bosses.tick cuida dos estados especiais; andar, cuspir, atacar o muro e invadir continuam em updateHorde.
// Tudo o que acontece vira o evento 'boss' { k: ação } para a cena (visual) e para o som.
const Bosses = (() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const WX = () => WORLD.WALL_X + 13;
  const live = () => S.horde.zs.filter(o => !o.dead);
  const art = Z => (Z.art === 'o' ? 'o' : 'a');
  // "a Abominação", "o Saltador" · "da Abominação", "do Saltador"
  const the = t => `${art(ZTYPES[t])} ${ZTYPES[t].nome}`;
  const ofThe = t => `${art(ZTYPES[t]) === 'o' ? 'do' : 'da'} ${ZTYPES[t].nome}`;

  // ---------- quais chefes vêm na onda ----------
  // Sorteados entre os já liberados pela onda, sem repetir o anterior. Na Noite dos Saqueadores vem o Chefe Saqueador.
  function assign(queue, n) {
    // no Fácil (especiais 1 onda depois) a onda 10 contaria como 9 e não haveria chefe liberado: o mínimo é o grupo da onda 10
    const e = Math.max(10, n + D().early);
    const pool = BOSS_POOL.filter(k => e >= ZTYPES[k].wave);
    let lastB = S.lastBoss;
    const chosen = [];
    const q = queue.map(t => {
      if (t !== 'chefe') return t;
      let opts = pool.filter(k => k !== lastB && !chosen.includes(k));
      if (!opts.length) opts = pool.filter(k => k !== lastB);
      if (!opts.length) opts = pool;
      // os recém-liberados aparecem com mais frequência (estreia)
      const seen = S.meta.stats.bk || {};
      const fresh = opts.filter(k => !seen[k]);
      const k = fresh.length && Math.random() < 0.6 ? fresh[Math.floor(Math.random() * fresh.length)] : opts[Math.floor(Math.random() * opts.length)];
      chosen.push(k); lastB = k;
      return k;
    });
    S.lastBoss = lastB;
    return q;
  }

  function spawned(z) {
    const Z = ZTYPES[z.type];
    addLog(`${Z.icon} ${art(Z) === 'o' ? 'Um' : 'Uma'} ${Z.nome.toUpperCase()} surgiu na horda! ${Z.tip}.`, 'bad');
    emit('bossSpawn', { id: z.id, type: z.type });
  }

  // ---------- dano: armaduras, fraquezas e momentos vulneráveis ----------
  // o: { blast, fire, rocket } · devolve o dano que realmente entra (0 = ricocheteou ou não alcançou)
  function guard(z, dmg, src, o) {
    const Z = ZTYPES[z.type];
    if (src === 'wall' || src === 'melee') return dmg;
    const blast = o.blast || src === 'explode' || src === 'air';
    if (z.under) return 0;
    if (z.rolling) {
      if (o.rocket) return dmg;
      if (blast || o.fire) return dmg * 0.4;
      ricochet(z, src, 'rolando: espere ele parar!');
      return 0;
    }
    if (Z.ai === 'weakspot') {
      if (!z.open) {
        if (o.rocket) return dmg * 0.6;
        if (blast || o.fire) return dmg * 0.2;
        ricochet(z, src, 'casca de osso! espere abrir');
        return 0;
      }
      dmg *= Z.weak.mult;
    }
    if (z.state === 'daze' || z.state === 'stun') dmg *= 1.5;
    if (z.state === 'crouch') z.taken = (z.taken || 0) + dmg;
    return dmg;
  }
  function ricochet(z, src, msg) {
    const now = performance.now(), show = !z.ricT || now - z.ricT > 700;
    if (show) z.ricT = now;
    emit('armor', { x: z.x, y: zy(z), src, msg: show && (src === 'player' || src === 'guard' || src === 'tower') ? msg : null });
  }

  // depois de levar dano (e continuar vivo): troca de fase do Colosso e fuga do Escavador
  function hurt(z) {
    const Z = ZTYPES[z.type], f = z.hp / z.maxHp;
    if (Z.ai === 'phases') {
      const i = z.ph || 0, P = Z.phases[i];
      if (P && f <= P.at) {
        z.ph = i + 1;
        z.scale = P.scale; z.speed = (z.speed0 || z.speed) * P.speed; z.dmgM = P.dmg; z.atkS = P.atk; z.crawl = !!P.crawl;
        if (z.state !== 'invade') { z.state = 'stun'; z.tt = 0; z.stunFor = 0.7; z.next = 'walk'; }
        emit('boss', { k: 'shell', x: z.x, y: zy(z), ph: z.ph, id: z.id });
        addLog(z.ph === 1 ? `🗿 A casca do Colosso quebrou! Ele ficou menor e bem mais rápido.` : `🗿 O Colosso desabou e agora RASTEJA até o muro!`, 'warn');
      }
    }
    if (Z.ai === 'burrow' && !z.fled && f <= Z.burrow.again && (z.state === 'walk' || z.state === 'attack') && !S.wallDown) {
      z.fled = true;
      dig(z, true);
    }
  }

  // ---------- morte ----------
  function onDeath(z, src) {
    const Z = ZTYPES[z.type], H = S.horde;
    z.under = false; z.rolling = false;
    if (Z.split) split(z, Z.split);
    if (Z.ai === 'howl') {
      let n = 0;
      for (const o of live()) if (!ZTYPES[o.type].boss) { o.stun = Math.max(o.stun || 0, Z.howl.stun); n++; }
      emit('boss', { k: 'stunAll', x: z.x, y: zy(z), n });
      if (n) addLog(`👑 O grito de morte do Rei Uivador atordoou ${n} zumbi(s)!`, 'good');
    }
    if (Z.ai === 'bloat' && src !== 'wall') {
      // estourou antes de chegar: fere a horda em volta (e o muro, se estiver perto)
      const B = Z.bloat, near = z.x <= WX() + B.safe;
      emit('explode', { x: z.x, y: zy(z), big: true });
      for (const o of live()) {
        if (o === z || ZTYPES[o.type].boss) continue;
        const d = Math.hypot(o.x - z.x, (o.y - z.y) * 1.3);
        if (d < B.r) damageZombie(o, B.dmg * hpMult(H.n) * (1 - 0.5 * d / B.r), 'explode', { blast: true });
      }
      if (near && !S.wallDown) {
        H.dmg += wallDamage(B.wall * B.near * dmgMult(H.n), z.y);
        emit('boss', { k: 'nearBoom', x: z.x, y: zy(z) });
      } else {
        S.meta.stats.bloatFar = (S.meta.stats.bloatFar || 0) + 1;
        emit('boss', { k: 'farBoom', x: z.x, y: zy(z) });
      }
    }
  }

  // Hospedeiro Gigante e seus brotos: dividem-se ao morrer
  function split(z, sp) {
    const H = S.horde;
    if (!H.active) return;
    for (let i = 0; i < sp.n; i++) {
      const c = spawnZombie(sp.type, H, { x: z.x + rnd(-6, 8), y: Math.max(WORLD.LANE_MIN, Math.min(WORLD.LANE_MAX, z.y + rnd(-10, 10))) });
      if (z.state === 'invade') { Invasion.enter(c); c.x = z.x; }
      c.stun = 0.5;
    }
    emit('boss', { k: 'split', x: z.x, y: zy(z), n: sp.n, big: ZTYPES[z.type].boss });
  }

  // ---------- comportamento ----------
  // devolve 0 (segue a lógica comum), 1 (já cuidou deste zumbi) ou -1 (o jogo acabou)
  function walkTo(z, dt, x) {
    z.x -= z.speed * dt;
    if (z.x <= x) { z.x = x; return true; }
    return false;
  }
  function hitWall(z, dmg) {
    const st = S, H = S.horde;
    H.dmg += wallDamage(dmg * dmgMult(H.n), z.y);
    return S === st;
  }
  function done(z) {
    z.hits++;
    if (z.hits >= ZTYPES[z.type].hits) { z.lift = 0; z.rolling = false; killZombie(z, 'melee'); return true; }
    return false;
  }
  function dig(z, flee) {
    z.state = 'dig'; z.tt = 0; z.flee = !!flee;
    emit('boss', { k: 'dig', x: z.x, y: z.y, id: z.id });
  }

  function tick(z, dt) {
    const Z = ZTYPES[z.type];
    if (!Z.ai) return 0;
    // muro caído: o chefe larga o que estava fazendo e entra no abrigo
    if (S.wallDown) {
      if (!['walk', 'attack', 'spit'].includes(z.state)) { z.state = 'walk'; z.lift = 0; z.rolling = false; z.under = false; }
      return 0;
    }
    z.tt = (z.tt || 0) + dt;
    switch (Z.ai) {
      case 'leap': return leap(z, dt, Z.leap);
      case 'roll': return roll(z, dt, Z.roll);
      case 'brood': return brood(z, dt, Z.brood);
      case 'burrow': return burrow(z, dt, Z.burrow);
      case 'bloat': return bloat(z, dt, Z.bloat);
      case 'weakspot': return weak(z, dt, Z.weak);
      case 'artillery': return artillery(z, dt, Z.acid);
      case 'howl': return howl(z, dt, Z.howl);
    }
    if (z.state === 'stun') return stun(z);
    return 0;
  }
  // atordoado (depois de um salto interrompido ou da casca quebrando)
  function stun(z) {
    if (z.tt >= (z.stunFor || 1.8)) { z.state = z.next || 'walk'; z.tt = 0; z.taken = 0; }
    return 1;
  }

  // Saltador: para longe do muro, agacha (dá para interromper) e pula em cima dele
  function leap(z, dt, L) {
    const W = WX();
    switch (z.state) {
      case 'walk':
        if (walkTo(z, dt, W + L.stop)) { z.state = 'crouch'; z.tt = 0; z.taken = 0; emit('boss', { k: 'crouch', x: z.x, y: z.y, id: z.id }); }
        return 1;
      case 'crouch':
        if ((z.taken || 0) >= L.interrupt * z.maxHp) {
          z.state = 'stun'; z.tt = 0; z.stunFor = 1.8; z.next = 'crouch'; z.taken = 0;
          S.meta.stats.leapStops = (S.meta.stats.leapStops || 0) + 1;
          emit('boss', { k: 'interrupt', x: z.x, y: zy(z), id: z.id });
          return 1;
        }
        if (z.tt >= L.crouch) { z.state = 'air'; z.tt = 0; z.x0 = z.x; emit('boss', { k: 'leap', x: z.x, y: z.y, id: z.id }); }
        return 1;
      case 'air': {
        const f = Math.min(1, z.tt / L.air);
        z.x = z.x0 + (W + 6 - z.x0) * f;
        z.lift = Math.sin(f * Math.PI) * 48;
        if (f < 1) return 1;
        z.lift = 0;
        // a queda empurra para trás os zumbis colados no muro
        for (const o of live()) if (o !== z && !ZTYPES[o.type].boss && o.state !== 'invade' && Math.abs(o.x - z.x) < 26) { o.x += rnd(10, 18); if (o.state === 'attack') o.state = 'walk'; }
        emit('boss', { k: 'land', x: z.x, y: z.y, id: z.id });
        if (!hitWall(z, ZTYPES[z.type].dmg)) return -1;
        if (done(z)) return 1;
        z.state = 'hop'; z.tt = 0; z.x0 = z.x;
        return 1;
      }
      case 'hop': {
        const f = Math.min(1, z.tt / 0.6);
        z.x = z.x0 + (W + L.stop - z.x0) * f;
        z.lift = Math.sin(f * Math.PI) * 18;
        if (f >= 1) { z.lift = 0; z.state = 'rest'; z.tt = 0; }
        return 1;
      }
      case 'rest':
        if (z.tt >= L.cd) { z.state = 'crouch'; z.tt = 0; z.taken = 0; emit('boss', { k: 'crouch', x: z.x, y: z.y, id: z.id }); }
        return 1;
      case 'stun': return stun(z);
    }
    return 0;
  }

  // Rolador: vira uma bola blindada, rola até o muro, quica de volta e fica tonto
  function roll(z, dt, R) {
    const W = WX();
    switch (z.state) {
      case 'walk':
        if (walkTo(z, dt, W + R.stop)) { z.state = 'curl'; z.tt = 0; emit('boss', { k: 'curl', x: z.x, y: z.y, id: z.id }); }
        return 1;
      case 'curl':
        if (z.tt >= R.curl) { z.state = 'roll'; z.tt = 0; z.rolling = true; emit('boss', { k: 'roll', x: z.x, y: z.y, id: z.id }); }
        return 1;
      case 'roll':
        z.x -= R.speed * dt;
        z.spin = (z.spin || 0) + R.speed * dt / 9;
        // atropela a própria horda no caminho
        for (const o of live()) if (o !== z && !ZTYPES[o.type].boss && o.state !== 'invade' && !o.ran && Math.abs(o.x - z.x) < 7 && Math.abs(o.y - z.y) < 12) {
          o.ran = true; o.x += 6; damageZombie(o, 2 * hpMult(S.horde.n), 'explode');
        }
        if (z.x > W + 6) return 1;
        z.x = W + 6; z.rolling = false;
        emit('boss', { k: 'impact', x: z.x, y: z.y, id: z.id });
        if (!hitWall(z, ZTYPES[z.type].dmg)) return -1;
        for (const o of live()) o.ran = false;
        if (done(z)) return 1;
        z.state = 'bounce'; z.tt = 0; z.x0 = z.x;
        return 1;
      case 'bounce': {
        const f = Math.min(1, z.tt / R.back);
        z.x = z.x0 + (W + R.stop * 0.7 - z.x0) * f;
        z.lift = Math.sin(f * Math.PI) * 22;
        z.spin = (z.spin || 0) - dt * 8;
        if (f >= 1) { z.lift = 0; z.state = 'daze'; z.tt = 0; emit('boss', { k: 'daze', x: z.x, y: zy(z), id: z.id }); }
        return 1;
      }
      case 'daze':
        if (z.tt >= R.daze) { z.state = 'walk'; z.tt = 0; }
        return 1;
    }
    return 0;
  }

  // Matriarca: anda devagar e pare crias de tempos em tempos
  function brood(z, dt, B) {
    const H = S.horde;
    z.bt = (z.bt || 0) + dt;
    if (z.bt >= B.cd && z.x < WORLD.SPAWN_X - 10) {
      z.bt = 0;
      const alive = H.zs.filter(o => !o.dead && o.type === 'cria').length;
      const n = Math.min(B.max - alive, B.n[0] + Math.floor(Math.random() * (B.n[1] - B.n[0] + 1)));
      for (let i = 0; i < n; i++) {
        const c = spawnZombie('cria', H, { x: z.x + rnd(2, 10), y: Math.max(WORLD.LANE_MIN, Math.min(WORLD.LANE_MAX, z.y + rnd(-12, 12))) });
        c.stun = 0.4;
      }
      if (n > 0) emit('boss', { k: 'brood', x: z.x + 6, y: z.y - 8, n, id: z.id });
    }
    return 0;
  }

  // Escavador: cava longe do muro, passa por baixo da terra e sai perto dele (nunca do outro lado)
  function burrow(z, dt, B) {
    const W = WX();
    switch (z.state) {
      case 'walk':
        if (!z.dug && z.x <= W + B.at) { z.dug = true; dig(z); return 1; }
        return 0;
      case 'dig':
        if (z.tt >= B.dig) { z.state = 'under'; z.tt = 0; z.under = true; z.dir = z.flee ? 1 : -1; }
        return 1;
      case 'under':
        z.x += z.dir * B.speed * dt;
        if (z.dir > 0 && z.x >= W + B.at * 0.85) z.dir = -1;   // fugindo: volta para trás e cava de novo
        if (z.dir < 0 && z.x <= W + B.out) { z.x = W + B.out; z.state = 'rise'; z.tt = 0; emit('boss', { k: 'rise', x: z.x, y: z.y, id: z.id }); }
        return 1;
      case 'rise':
        if (z.tt >= B.rise * 0.35) z.under = false;
        if (z.tt >= B.rise) { z.state = 'walk'; z.tt = 0; }
        return 1;
    }
    return 0;
  }

  // Inchado Colossal: chegando ao muro, o pavio acende e ele explode com tudo
  function bloat(z, dt, B) {
    if (z.state === 'attack') { z.state = 'fuse'; z.tt = 0; emit('boss', { k: 'fuse', x: z.x, y: zy(z), id: z.id }); return 1; }
    if (z.state === 'fuse') {
      if (z.tt < B.fuse) return 1;
      const H = S.horde, st = S;
      emit('explode', { x: z.x, y: zy(z), big: true });
      emit('boss', { k: 'wallBoom', x: z.x, y: zy(z) });
      for (const o of live()) if (o !== z && !ZTYPES[o.type].boss && Math.abs(o.x - z.x) < B.r) damageZombie(o, B.dmg * hpMult(H.n), 'explode', { blast: true });
      H.dmg += wallDamage(B.wall * dmgMult(H.n), z.y);
      if (S !== st) return -1;
      killZombie(z, 'wall');
      return 1;
    }
    return 0;
  }

  // Carcaça: a casca de osso abre e fecha; só o tumor exposto recebe dano de verdade
  function weak(z, dt, K) {
    z.wt = (z.wt || 0) + dt;
    if (!z.open && z.wt >= K.closed) { z.open = true; z.wt = 0; emit('boss', { k: 'open', x: z.x, y: zy(z), id: z.id }); }
    else if (z.open && z.wt >= K.open) { z.open = false; z.wt = 0; emit('boss', { k: 'close', x: z.x, y: zy(z), id: z.id }); }
    return 0;
  }

  // Mãe-Cuspideira: fica longe e cospe ácido; as poças corroem o muro por alguns segundos
  function artillery(z, dt, A) {
    const W = WX(), H = S.horde;
    if (z.state === 'walk' && z.spits < A.count) {
      if (walkTo(z, dt, W + A.stop)) { z.state = 'lob'; z.tt = A.cd * 0.5; }
      return 1;
    }
    if (z.state === 'lob') {
      if (!z.told && z.tt >= A.cd - 0.7) { z.told = true; emit('boss', { k: 'lobTell', x: z.x, y: zy(z), id: z.id }); }
      if (z.tt < A.cd) return 1;
      z.tt = 0; z.told = false; z.spits++;
      emit('boss', { k: 'acid', x: z.x - 6, y: zy(z) - 8, ty: z.y, id: z.id });
      if (!hitWall(z, A.dmg)) return -1;
      if (!H.pools) H.pools = [];
      H.pools.push({ y: z.y + rnd(-6, 6), t: A.pool, max: A.pool, dps: A.dps });
      if (H.pools.length > 5) H.pools.shift();
      if (z.spits >= A.count) z.state = 'walk';
      return 1;
    }
    return 0;
  }

  // Rei Uivador: fica atrás da horda e grita, curando e acelerando todo mundo
  function howl(z, dt, R) {
    const W = WX();
    if (z.state === 'walk' && z.spits < R.count) {
      if (walkTo(z, dt, W + R.stop)) { z.state = 'howl'; z.tt = R.cd * 0.4; }
      return 1;
    }
    if (z.state === 'howl') {
      if (!z.told && z.tt >= R.cd - 1.3) { z.told = true; emit('boss', { k: 'howlTell', x: z.x, y: zy(z), id: z.id }); }
      if (z.tt < R.cd) return 1;
      z.tt = 0; z.told = false; z.spits++;
      let n = 0;
      for (const o of live()) {
        if (o === z || ZTYPES[o.type].boss) continue;
        const max = (o.speed0 || o.speed) * ZBUFF.haste.max;
        if (o.speed < max) { o.speed = Math.min(max, o.speed * R.haste); o.haste = true; }
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * R.heal);
        n++;
      }
      emit('boss', { k: 'howl', x: z.x, y: zy(z), n, id: z.id });
      if (z.spits >= R.count) z.state = 'walk';
      return 1;
    }
    return 0;
  }

  // poças de ácido no pé do muro
  function hordeTick(dt) {
    const H = S.horde;
    if (!H.pools || !H.pools.length) return true;
    const st = S;
    for (const p of H.pools) {
      p.t -= dt;
      if (!S.wallDown) H.acid = (H.acid || 0) + p.dps * dmgMult(H.n) * dt;
    }
    H.pools = H.pools.filter(p => p.t > 0);
    if (H.acid >= 1.5) {
      const d = H.acid; H.acid = 0;
      H.dmg += wallDamage(d, 175);
      if (S !== st) return false;
    }
    return true;
  }

  // ---------- informações para a cena ----------
  // estado curto na barra de vida
  function status(z) {
    const Z = ZTYPES[z.type];
    if (z.under) return 'SUBTERRÂNEO';
    if (z.rolling) return 'BLINDADO';
    if (z.state === 'daze') return 'TONTO! ×1,5';
    if (z.state === 'stun') return 'ATORDOADO ×1,5';
    if (z.state === 'crouch') return 'VAI PULAR!';
    if (z.state === 'fuse') return 'VAI EXPLODIR!';
    if (Z.ai === 'weakspot') return z.open ? 'PONTO FRACO ABERTO!' : 'BLINDADA';
    if (Z.ai === 'howl' && z.state === 'howl') return `uivos ${z.spits}/${Z.howl.count}`;
    if (Z.ai === 'artillery' && z.state === 'lob') return `ácido ${z.spits}/${Z.acid.count}`;
    if (Z.ai === 'phases') return ['', 'SEM CASCA', 'RASTEJANDO'][z.ph || 0];
    return '';
  }
  // ataque especial prestes a acontecer: a cena mostra um "!" piscando
  function warn(z) {
    const Z = ZTYPES[z.type];
    return z.state === 'crouch' || z.state === 'curl' || z.state === 'fuse' || z.state === 'dig' ||
      (Z.ai === 'howl' && z.told) || (Z.ai === 'artillery' && z.told);
  }

  // ---------- offline ----------
  // Lista de zumbis de uma onda resolvida de uma vez: chefes ficam mais duros e a Matriarca traz crias
  return { assign, spawned, guard, hurt, onDeath, tick, hordeTick, status, warn, the, ofThe };
})();

// ---------- conquistas dos chefes ----------
const bossKills = t => {
  const st = S.meta.stats, bk = st.bk || {};
  // saves antigos só tinham a Abominação
  if (t === 'chefe') return Math.max(bk.chefe || 0, (st.bosses || 0) - Object.keys(bk).filter(k => k !== 'chefe').reduce((a, k) => a + bk[k], 0));
  return bk[t] || 0;
};
ACH.push(
  { id: 'b_saltador',   icon: '🦘', nome: 'Pés no chão',            desc: 'Derrote o Saltador',             val: () => bossKills('saltador'), goal: 1, cash: 3 },
  { id: 'b_rolador',    icon: '🌀', nome: 'Fim da linha',           desc: 'Derrote o Rolador',              val: () => bossKills('rolador'), goal: 1, cash: 3 },
  { id: 'b_matriarca',  icon: '🕷️', nome: 'Ninho destruído',        desc: 'Derrote a Matriarca',            val: () => bossKills('matriarca'), goal: 1, cash: 4 },
  { id: 'b_colosso',    icon: '🗿', nome: 'Quanto maior a altura...', desc: 'Derrote o Colosso',            val: () => bossKills('colosso'), goal: 1, cash: 4 },
  { id: 'b_escavador',  icon: '⛏️', nome: 'Sete palmos',            desc: 'Derrote o Escavador',            val: () => bossKills('escavador'), goal: 1, cash: 4 },
  { id: 'b_colossal',   icon: '🎈', nome: 'Balão furado',           desc: 'Derrote o Inchado Colossal',     val: () => bossKills('colossal'), goal: 1, cash: 5 },
  { id: 'b_carcaca',    icon: '🦴', nome: 'Ponto fraco',            desc: 'Derrote a Carcaça',              val: () => bossKills('carcaca'), goal: 1, cash: 5 },
  { id: 'b_cuspideira', icon: '🤮', nome: 'Azia',                   desc: 'Derrote a Mãe-Cuspideira',       val: () => bossKills('cuspideira'), goal: 1, cash: 5 },
  { id: 'b_reiuivador', icon: '👑', nome: 'Rei morto, rei posto',   desc: 'Derrote o Rei Uivador',          val: () => bossKills('reiuivador'), goal: 1, cash: 6 },
  { id: 'b_gigante',    icon: '🍄', nome: 'Erradicação',            desc: 'Derrote o Hospedeiro Gigante',   val: () => bossKills('gigante'), goal: 1, cash: 6 },
  { id: 'b_chefao',     icon: '🏴‍☠️', nome: 'Motim',                  desc: 'Derrote o Chefe Saqueador',      val: () => bossKills('chefao'), goal: 1, cash: 4 },
  { id: 'b_leap',       icon: '✋', nome: 'Pouso cancelado',        desc: 'Interrompa 3 saltos do Saltador', val: () => S.meta.stats.leapStops || 0, goal: 3, cash: 3 },
  { id: 'b_far',        icon: '🎆', nome: 'Fogos de artifício',     desc: 'Exploda o Inchado Colossal longe do muro', val: () => S.meta.stats.bloatFar || 0, goal: 1, cash: 3 },
  { id: 'b_all',        icon: '📖', nome: 'Bestiário completo',     desc: 'Derrote todos os 12 tipos de chefe', val: () => [...BOSS_POOL, 'chefao'].filter(t => bossKills(t) > 0).length, goal: BOSS_POOL.length + 1, cash: 15 },
);
