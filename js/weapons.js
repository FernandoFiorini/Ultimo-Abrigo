'use strict';

// Armas do líder: mira manual durante a horda, até 3 armas por noite (Q W E).
// Cada arma tem pente, tempo de recarga e alcance. Recarregar gasta 🔫 munição do abrigo (a pistola não gasta).
// Compra e melhorias ficam no metajogo (sobrevivem a evacuações).
const Weapons = (() => {
  const MUZZLE = { x: 61, y: 88 };   // ponta da arma do líder no telhado
  const projectiles = [];
  const N = LW_KEYS.length;

  // saves antigos tinham 4 espaços (Q W E R): a arma do 4º vai para um espaço livre, se houver
  function fixSlots(m) {
    const sl = m.slots;
    if (!Array.isArray(sl)) { m.slots = ['pistola', ...Array(N - 1).fill(null)]; m.cur = 0; return; }
    let cur = m.cur;
    for (let i = 0; i < N; i++) if (sl[i] === undefined) sl[i] = null;
    for (let i = N; i < sl.length; i++) {
      const free = sl.slice(0, N).indexOf(null);
      if (sl[i] && free >= 0) { sl[free] = sl[i]; if (cur === i) cur = free; }
    }
    sl.length = N;
    m.cur = cur >= 0 && cur < N ? cur : 0;
  }
  const M = () => { const m = S.meta.lw; if (!Array.isArray(m.slots) || m.slots.length !== N) fixSlots(m); return m; };
  const lvl = k => M().owned[k] || 0;
  const owned = k => lvl(k) > 0;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  // atributos da arma no nível atual
  function stat(k, l = Math.max(1, lvl(k))) {
    const w = LWEAPONS[k], up = l - 1;
    return {
      dmg: w.dmg * (1 + 0.25 * up),
      cd: w.cd * (1 - 0.06 * up),
      mag: w.mag === 1 ? 1 : Math.round(w.mag * (1 + 0.2 * up)),   // a bazuca tem sempre 1 tiro
      reload: w.reload * (1 - 0.08 * up),
      range: w.range * (1 + 0.08 * up),
      use: w.use || 0,
      pellets: (w.pellets || 1) + (w.pellets ? Math.floor(up / 2) : 0),
      spread: w.spread ? w.spread * (1 - 0.08 * up) : 0,
      pierce: (w.pierce || 0) + (w.pierce ? Math.floor(up / 2) : 0),
      radius: w.radius ? w.radius * (1 + 0.1 * up) : 0,
      burn: w.burn ? w.burn * (1 + 0.2 * up) : 0,
    };
  }
  const fx = k => {
    const s = stat(k), w = LWEAPONS[k], out = [];
    if (w.type === 'rocket') out.push('mata zumbis comuns com 1 tiro');
    else out.push(`dano ${pts(s.dmg)}${s.pellets > 1 ? ` ×${s.pellets} projéteis` : ''}${w.type === 'flame' ? '/s' : ''}`);
    if (s.mag > 1) out.push(`${fmt(1 / s.cd)} tiros/s`);
    out.push(`pente ${s.mag} · recarga ${fmt(s.reload)}s`);
    out.push(`alcance ${Math.round(s.range)}`);
    if (s.pierce) out.push(`atravessa ${s.pierce}`);
    if (s.radius) out.push(`raio ${Math.round(s.radius)}`);
    if (s.burn) out.push(`queima ${fmt(s.burn)}s`);
    if (w.special) {
      const A = SPECIAL_AMMO[w.special];
      out.push(`${A.tank ? `1 ${A.icon} ${A.nome} por carga` : `1 ${A.icon} ${A.nome} por tiro`} (você tem ${spec(w.special)}/${A.max})`);
    } else out.push(s.use ? `${fmt(s.use)} 🔫 por tiro` : 'não gasta munição');
    return out.join(' · ');
  };
  // Quantos tiros (ou disparos) derrubam um zumbi comum na onda atual, com todos os bônus
  function shotsToKill(k) {
    const w = LWEAPONS[k], s = stat(k);
    if (w.type === 'rocket') return 1;
    const per = baseDmg(k) * (w.type === 'flame' ? s.burn : s.pellets);
    return Math.max(1, Math.ceil(ZTYPES.normal.hp * hpMult(S.wave) / per - 1e-9));
  }
  // x máximo que a arma alcança (zumbis além disso estão fora de alcance)
  const reach = (k = current()) => WORLD.WALL_X + stat(k).range;

  const unlocked = k => {
    const w = LWEAPONS[k], st = S.meta.stats;
    return Math.max(st.bestWave, S.best) >= w.wave && (!w.bosses || st.bosses >= w.bosses);
  };
  const lockText = k => {
    const w = LWEAPONS[k], st = S.meta.stats, parts = [];
    if (Math.max(st.bestWave, S.best) < w.wave) parts.push(`chegue à onda ${w.wave}`);
    if (w.bosses && st.bosses < w.bosses) parts.push(`derrote ${w.bosses} chefes (${st.bosses}/${w.bosses})`);
    return '🔒 ' + parts.join(' e ');
  };
  const cost = k => scaledCost(LWEAPONS[k].cost, LW_UP_MULT, lvl(k));

  const current = () => { const k = M().slots[M().cur]; return k && owned(k) ? k : 'pistola'; };
  const mags = () => (S.lwMag && typeof S.lwMag === 'object' ? S.lwMag : (S.lwMag = {}));
  const ammoOf = k => mags()[k] || 0;   // tiros no pente

  // ---------- compra, melhoria e espaços ----------
  function buy(k) {
    if (!unlocked(k) || lvl(k) >= LW_MAX_LVL) return;
    const c = cost(k);
    if (!canAfford(c)) return;
    pay(c);
    const first = !owned(k);
    M().owned[k] = lvl(k) + 1;
    if (first) {
      // vai para o primeiro espaço livre
      const free = M().slots.indexOf(null);
      if (free >= 0) M().slots[free] = k;
      mags()[k] = stat(k).mag;   // o primeiro pente vem junto
      if (LWEAPONS[k].special === 'grenade') addSpecial('grenade', 2);   // e duas granadas de reserva
      addLog(`🔫 Nova arma: ${LWEAPONS[k].icon} ${LWEAPONS[k].nome}! ${free >= 0 ? `Equipada no espaço ${LW_KEYS[free]}.` : 'Equipe na aba Armas.'}`, 'good');
    } else {
      addLog(`⬆️ ${LWEAPONS[k].icon} ${LWEAPONS[k].nome} nível ${lvl(k)}: ${fx(k)}.`, 'good');
    }
    emit('weapon', { rar: Math.min(3, lvl(k) - 1) });
  }

  function equip(arg) {
    const [k, si] = String(arg).split('|'), i = +si;
    if (!owned(k) || !(i >= 0 && i < N)) return;
    const sl = M().slots, prev = sl.indexOf(k);
    if (prev === i) return;
    if (prev >= 0) sl[prev] = sl[i];   // troca de lugar com a que estava lá
    sl[i] = k;
  }

  // Debug: arma no nível máximo, no espaço atual, com pente e munição especial cheios
  function dbgGive(k) {
    M().owned[k] = LW_MAX_LVL;
    const sl = M().slots, prev = sl.indexOf(k), i = M().cur;
    if (prev >= 0 && prev !== i) sl[prev] = sl[i];
    sl[i] = k;
    mags()[k] = stat(k).mag;
    const sp = LWEAPONS[k].special;
    if (sp) setSpec(sp, SPECIAL_AMMO[sp].max);
    if (S.reload) S.reload = null;
    emit('weaponSwap', { k });
  }
  function dbgMaxAll() {
    for (const k in LWEAPONS) { M().owned[k] = LW_MAX_LVL; mags()[k] = stat(k).mag; const sp = LWEAPONS[k].special; if (sp) setSpec(sp, SPECIAL_AMMO[sp].max); }
  }

  function select(i) {
    if (!M().slots[i] || !owned(M().slots[i])) return;
    if (M().cur === i) { if (S.horde.active) flash(); return; }
    M().cur = i;
    if (S.reload && S.reload.k !== current()) S.reload = null;   // trocar de arma interrompe a recarga
    emit('weaponSwap', { k: current() });
    if (S.horde.active) flash();
  }
  function cycle(dir) {
    const sl = M().slots;
    for (let n = 1; n <= N; n++) {
      const i = (M().cur + dir * n + N) % N;
      if (sl[i] && owned(sl[i])) { select(i); return; }
    }
  }

  // Completa o pente pagando a munição do abrigo. Devolve quantos tiros entraram.
  function topUp(k) {
    const st = stat(k), cur = Math.min(ammoOf(k), st.mag), need = st.mag - cur;
    if (need <= 0) return 0;
    const sp = LWEAPONS[k].special;
    if (sp) {   // munição especial: foguetes e granadas um a um; um tanque de combustível enche tudo
      if (spec(sp) < 1) return 0;
      const n = SPECIAL_AMMO[sp].tank ? need : Math.min(need, spec(sp));
      setSpec(sp, spec(sp) - (SPECIAL_AMMO[sp].tank ? 1 : n));
      mags()[k] = cur + n;
      return n;
    }
    const n = st.use ? Math.min(need, Math.floor(S.res.municao / st.use + 1e-9)) : need;
    S.res.municao -= n * st.use;
    mags()[k] = cur + n;
    return n;
  }
  // ---------- munição especial (foguetes, granadas e combustível) ----------
  const store = () => { const m = M(); if (!m.ammo || typeof m.ammo !== 'object') { m.ammo = { rocket: m.rockets || 0 }; delete m.rockets; } return m.ammo; };
  const spec = kind => store()[kind] || 0;
  const setSpec = (kind, n) => { store()[kind] = Math.max(0, n); };
  const specWeapon = kind => Object.keys(LWEAPONS).find(k => LWEAPONS[k].special === kind);
  // quanto ainda cabe: por tiro conta o que está carregado; tanques contam só os guardados
  const room = kind => SPECIAL_AMMO[kind].max - spec(kind) - (SPECIAL_AMMO[kind].tank ? 0 : ammoOf(specWeapon(kind)));
  function addSpecial(kind, n) { const got = Math.max(0, Math.min(n, room(kind))); setSpec(kind, spec(kind) + got); return got; }
  // Ganha munição especial (só para armas que você já tem); devolve quanto entrou
  function gainSpecial(kind, n, where, x, y) {
    const A = SPECIAL_AMMO[kind];
    if (!owned(specWeapon(kind))) return 0;
    const got = addSpecial(kind, n);
    if (!got) return 0;
    addLog(`${A.icon} Você conseguiu ${got > 1 ? `${got} ${A.plural}` : `1 ${A.nome}`} ${where}! (${spec(kind)}/${A.max})`, 'good');
    emit('lwAmmo', { x: x ?? 300, y: y ?? 140, text: `+${got} ${A.icon}` });
    return got;
  }
  // chefe derrotado: quantidades garantidas (cada chefe deixa um saque) · expedição que voltou: chances por lugar
  function bossLoot(type) {
    const t = SPECIAL_DROPS.boss[type] || SPECIAL_DROPS.boss.chefe;
    for (const kind in t) gainSpecial(kind, t[kind], `dos restos ${Bosses.ofThe(type)}`);
  }
  function expLoot(loc, where) {
    const t = SPECIAL_DROPS.exp[loc];
    if (t) for (const kind in t) if (Math.random() < t[kind]) gainSpecial(kind, 1, where);
  }
  // texto "onde conseguir" de cada munição especial
  function howToGet(kind) {
    const out = [];
    const bs = Object.entries(SPECIAL_DROPS.boss).filter(([, t]) => t[kind]).map(([b, t]) => t[kind]);
    if (bs.length) out.push(`${Math.min(...bs)} a ${Math.max(...bs)} por chefe derrotado (varia com o chefe)`);
    for (const loc in SPECIAL_DROPS.exp) if (SPECIAL_DROPS.exp[loc][kind]) out.push(`${Math.round(SPECIAL_DROPS.exp[loc][kind] * 100)}% em expedições: ${EXPED[loc].nome}`);
    for (const t in SPECIAL_DROPS.kill) if (SPECIAL_DROPS.kill[t][kind]) out.push(`${Math.round(SPECIAL_DROPS.kill[t][kind] * 100)}% ao abater um ${ZTYPES[t].nome}`);
    return out.join(' · ');
  }
  // Início da noite: as armas levadas chegam com o pente cheio (se houver munição no abrigo)
  function refill() {
    for (const k of M().slots) if (k && owned(k)) topUp(k);
    S.reload = null;
    projectiles.length = 0;
  }
  // Recarga (automática com o pente vazio, ou manual com R). Leva stat.reload segundos.
  function startReload() {
    const k = current(), st = stat(k);
    if (!S.horde.active || S.reload || ammoOf(k) >= st.mag) return false;
    const sp = LWEAPONS[k].special;
    if (sp ? spec(sp) < 1 : st.use && S.res.municao < st.use) { emit('noAmmo', { k, special: sp }); return false; }
    S.reload = { k, t: st.reload, dur: st.reload };
    emit('reload', { k, phase: 'start' });
    return true;
  }

  // ---------- tiro ----------
  // zumbi sob o ponto (com uma folga, porque os sprites são pequenos)
  function zombieAt(px, py) {
    let best = null, bd = Infinity;
    for (const z of S.horde.zs) {
      if (z.dead || z.under) continue;
      const s = zsc(z), pad = 2, y = z.y - (z.lift || 0);
      if (px > z.x - 7 * s - pad && px < z.x + 7 * s + pad && py > y - 21 * s - pad && py < y + 4) {
        const d = Math.abs(px - z.x) + Math.abs(py - (y - 10 * s)) * 0.3;
        if (d < bd) { bd = d; best = z; }
      }
    }
    return best;
  }

  const dbg = f => typeof Debug !== 'undefined' && Debug.flags[f];
  const baseDmg = k => dbg('maxDmg') ? 1e9 : stat(k).dmg * (1 + 0.2 * perk('mira')) * (furia() ? 2 : 1) * Endgame.mult('dmg') * (1 + Endgame.ab('leader'));

  function fire(x, y) {
    if (!S.horde.active || paused || S.clickCd > 0) return false;
    const k = current(), w = LWEAPONS[k], st = stat(k), far = reach(k);
    if (S.reload) return false;
    if (ammoOf(k) < 1) { S.clickCd = 0.2; startReload(); return false; }
    if (x > far + 4) { S.clickCd = 0.15; emit('outOfRange', { x, y }); return false; }
    if (!dbg('infAmmo')) mags()[k] = ammoOf(k) - 1;
    S.clickCd = st.cd;
    const dmg = baseDmg(k);
    let hits = 0;

    if (w.type === 'bullet') {
      for (let i = 0; i < st.pellets; i++) {
        const px = x + gauss() * st.spread, py = y + gauss() * st.spread * 0.6;
        let z = zombieAt(px, py);
        if (z && z.x > far + 4) z = null;   // o projétil não chega até lá
        emit('shot', { src: 'player', w: k, x: px, y: py, exact: true, miss: !z, quiet: i > 0 });
        if (!z) continue;
        hits++;
        // espingarda: perde força com a distância do muro
        const d = w.falloff ? dmg * Math.max(0.25, 1 - 0.75 * Math.max(0, z.x - WORLD.WALL_X) / st.range) : dmg;
        // a cabeça fica no topo do boneco (só faz diferença contra o blindado)
        Endgame.hit(z, d, 'player', { head: py < z.y - (z.lift || 0) - 12.5 * zsc(z) });
        if (st.pierce) {
          // atravessa os zumbis atrás, na mesma faixa, até o limite do alcance
          const behind = S.horde.zs.filter(o => !o.dead && o !== z && o.x > z.x && o.x <= far && o.x - z.x < 90 && Math.abs(o.y - z.y) < 10)
            .sort((a, b) => a.x - b.x).slice(0, st.pierce);
          for (const o of behind) { Endgame.hit(o, dmg * 0.8, 'player'); hits++; }
          if (behind.length) emit('pierce', { x1: z.x, y1: zy(z), x2: behind[behind.length - 1].x, y2: zy(behind[behind.length - 1]) });
        }
      }
    } else if (w.type === 'grenade' || w.type === 'rocket') {
      const mz = typeof Scene !== 'undefined' ? Scene.gunTip() : MUZZLE;   // ponta da arma desenhada
      const dist = Math.hypot(x - mz.x, y - mz.y);
      projectiles.push({ k, x0: mz.x, y0: mz.y, x, y, t: 0, dur: w.type === 'rocket' ? 0.35 : 0.25 + dist / 600, r: st.radius, dmg, rocket: w.type === 'rocket' });
      emit('shot', { src: 'player', w: k, x, y, exact: true, launch: true });
    } else if (w.type === 'flame') {
      emit('flame', { x, y, r: st.radius });
      emit('shot', { src: 'player', w: k, x, y, exact: true, launch: true, quiet: Math.random() < 0.6 });
      for (const z of S.horde.zs) {
        if (z.dead || Math.hypot(z.x - x, (z.y - 9) - y) > st.radius + 6) continue;
        z.burn = Math.max(z.burn || 0, st.burn);
        z.burnDps = Math.max(z.burnDps || 0, dmg);
        hits++;
      }
    }
    if (hits) S.meta.stats.shots += hits;
    if (ammoOf(k) < 1) startReload();
    return true;
  }

  function explode(p) {
    emit('explode', { x: p.x, y: p.y, big: p.rocket });
    for (const z of S.horde.zs) {
      if (z.dead) continue;
      const d = Math.hypot(z.x - p.x, ((z.y - 8) - p.y) * 1.4);
      if (d > p.r) continue;
      if (p.rocket) {
        if (ZTYPES[z.type].boss) damageZombie(z, z.maxHp * (dbg('maxDmg') ? 1 : 0.4), 'player', { blast: true, rocket: true });
        else killZombie(z, 'player');
      } else {
        Endgame.hit(z, p.dmg * (1 - 0.5 * d / p.r), 'player', { blast: true });
      }
      S.meta.stats.shots++;
    }
  }

  // projéteis em voo e zumbis queimando (só no combate ao vivo)
  function hordeTick(dt) {
    const R = S.reload;
    if (R) {
      if (R.k !== current()) S.reload = null;
      else if ((R.t -= dt) <= 0) { S.reload = null; topUp(R.k); emit('reload', { k: R.k, phase: 'end' }); }
    }
    for (const p of projectiles) {
      p.t += dt;
      if (p.t >= p.dur && !p.done) { p.done = true; explode(p); }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].done) projectiles.splice(i, 1);
    for (const z of S.horde.zs) {
      if (!z.burn || z.dead) continue;
      z.burn = Math.max(0, z.burn - dt);
      z.burnT = (z.burnT || 0) + dt;
      if (z.burnT >= 0.25) { z.burnT = 0; damageZombie(z, z.burnDps * 0.25, 'player', { fire: true }); }
      if (!z.burn) z.burnDps = 0;
    }
  }

  // zumbi abatido pelo líder às vezes deixa um pouco de munição para o abrigo
  function onKill(z) {
    // alguns zumbis abatidos pelo líder carregam munição especial (o policial, granadas; o Inchado, combustível)
    const sd = SPECIAL_DROPS.kill[z.type];
    if (sd) for (const kind in sd) if (Math.random() < sd[kind]) gainSpecial(kind, 1, `com o ${ZTYPES[z.type].nome} abatido`, z.x, z.y - 30);
    if (Math.random() >= LW_DROP) return;
    const n = 1 + Math.floor(Math.random() * 3);
    S.res.municao += n;
    emit('lwAmmo', { x: z.x, y: z.y - 26, text: `+${n} 🔫` });
  }

  // ---------- interface ----------
  function buildUI() {
    $('lweapons').innerHTML = Object.entries(LWEAPONS).map(([k, w]) => `
      <div class="row lw-row" id="lwr-${k}"${Demos.attr('lw:' + k)}>
        <div class="ach-icon">${w.icon}</div>
        <div class="main">
          <div class="title">${w.nome}<span class="lvl" id="lwl-${k}"></span></div>
          <div class="desc">${w.desc}</div>
          <div class="desc now" id="lwn-${k}"></div>
          <div class="cost" id="lwc-${k}"></div>
          <div class="lw-slots" id="lws-${k}"><span class="lw-slots-label">Levar à noite:</span>${LW_KEYS.map((key, i) => `<button class="small" data-act="lwEquip" data-k="${k}|${i}" id="lwe-${k}-${i}" title="Equipar no espaço ${key}">(${key})</button>`).join('')}</div>
        </div>
        <button data-act="lwBuy" data-k="${k}" id="lwb-${k}"></button>
      </div>`).join('');
    $('weapon-bar').innerHTML = LW_KEYS.map((key, i) => `<button class="wslot" data-slot="${i}" id="wsl-${i}"></button>`).join('');
    $('weapon-bar').addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if (b) { select(+b.dataset.slot); render(); } });
    Object.assign(actions, { lwBuy: k => buy(k), lwEquip: a => equip(a) });
  }

  // aviso grande no cenário ao trocar de arma
  let flashT = 0;
  function flash() {
    const el = $('weapon-flash'), k = current(), st = stat(k);
    el.innerHTML = `<span class="hk">(${LW_KEYS[M().cur]})</span> ${LWEAPONS[k].icon} <b>${LWEAPONS[k].nome}</b> <small>equipada · ${ammoOf(k)}/${st.mag} no pente · alcance ${Math.round(st.range)}</small>`;
    el.classList.remove('hidden', 'out');
    void el.offsetWidth;   // reinicia a animação
    el.classList.add('show');
    clearTimeout(flashT);
    flashT = setTimeout(() => el.classList.add('out'), 1100);
  }

  let barSig = '';
  function render() {
    const sl = M().slots;
    for (const k in LWEAPONS) {
      const w = LWEAPONS[k], l = lvl(k), open = unlocked(k), max = l >= LW_MAX_LVL, c = cost(k);
      const si = sl.indexOf(k);
      $('lwr-' + k).classList.toggle('locked', !open && !l);
      $('lwr-' + k).classList.toggle('equipped', si >= 0);
      $('lwl-' + k).innerHTML = (l ? ` nv. ${l}/${LW_MAX_LVL}` : '') + (si >= 0 ? ` <span class="lw-tag">✔ Equipada (${LW_KEYS[si]})</span>` : '');
      $('lwn-' + k).textContent = (l ? `${fx(k)} · ~${shotsToKill(k)} tiro(s) por zumbi comum na onda ${S.wave}` : open ? 'No nível 1: ' + fx(k) : lockText(k))
        + (w.special && (l || open) ? `. ${SPECIAL_AMMO[w.special].icon} Onde conseguir: ${howToGet(w.special)}.` : '');
      $('lwc-' + k).innerHTML = max || (!open && !l) ? '' : costHtml(c);
      const b = $('lwb-' + k);
      b.textContent = max ? 'Máximo' : l ? `Melhorar (nv. ${l + 1})` : 'Comprar';
      b.disabled = max || !open || !canAfford(c);
      $('lws-' + k).style.display = l ? '' : 'none';
      for (let i = 0; i < N; i++) $(`lwe-${k}-${i}`).classList.toggle('primary', sl[i] === k);
    }
    // barra de armas sobre o cenário (só à noite)
    const bar = $('weapon-bar');
    bar.classList.toggle('hidden', !S.horde.active);
    if (!S.horde.active) { $('weapon-flash').classList.add('hidden'); return; }
    const sig = sl.join() + M().cur + sl.map(k => k ? ammoOf(k) : '').join() + (S.clickCd > 0) + (S.reload ? S.reload.k : '') + JSON.stringify(store());
    if (sig === barSig) return;
    barSig = sig;
    for (let i = 0; i < N; i++) {
      const k = sl[i], el = $('wsl-' + i), key = `<span class="hk">(${LW_KEYS[i]})</span>`;
      el.removeAttribute('aria-pressed');
      if (!k || !owned(k)) { el.innerHTML = `${key}<span class="wname">vazio</span>`; el.className = 'wslot empty'; el.title = 'Espaço vazio: equipe uma arma na aba Armas'; continue; }
      const a = ammoOf(k), on = M().cur === i, rl = S.reload && S.reload.k === k;
      el.className = 'wslot' + (on ? ' active' : '') + (a < 1 && !rl ? ' dry' : '');
      el.setAttribute('aria-pressed', on);
      el.title = on ? `${LWEAPONS[k].nome}: equipada agora` : `Trocar para ${LWEAPONS[k].nome} (${LW_KEYS[i]})`;
      el.innerHTML = `${on ? '<span class="wtag">EM MÃOS</span>' : ''}${key}<span class="wicon">${LWEAPONS[k].icon}</span><span class="wname">${LWEAPONS[k].nome}</span><span class="wammo">${rl ? '⟳' : `${a}/${stat(k).mag}`}${LWEAPONS[k].special ? ` +${spec(LWEAPONS[k].special)}${SPECIAL_AMMO[LWEAPONS[k].special].icon}` : ''}</span>`;
    }
  }

  const isAuto = () => !!LWEAPONS[current()].auto;
  const tabBadge = () => Object.keys(LWEAPONS).filter(k => unlocked(k) && lvl(k) < LW_MAX_LVL && canAfford(cost(k))).length;

  return { dbgGive, dbgMaxAll, fire, hordeTick, refill, onKill, select, cycle, current, isAuto, ammoOf, stat, reach, startReload, shotsToKill, gainSpecial, bossLoot, expLoot, spec, howToGet, buildUI, render, tabBadge, projectiles, MUZZLE };
})();
