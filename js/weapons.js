'use strict';

// Armas do líder: mira manual durante a horda, quatro espaços (Q W E R), munição própria por noite.
// Compra e melhorias ficam no metajogo (sobrevivem a evacuações); a munição é recarregada a cada horda.
const Weapons = (() => {
  const MUZZLE = { x: 61, y: 88 };   // ponta da arma do líder no telhado
  const projectiles = [];

  const M = () => S.meta.lw;
  const lvl = k => M().owned[k] || 0;
  const owned = k => lvl(k) > 0;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  // atributos da arma no nível atual
  function stat(k, l = Math.max(1, lvl(k))) {
    const w = LWEAPONS[k], up = l - 1;
    return {
      dmg: w.dmg * (1 + 0.25 * up),
      cd: w.cd * (1 - 0.06 * up),
      ammo: w.ammo === Infinity ? Infinity : Math.round(w.ammo * (1 + 0.25 * up)),
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
    else out.push(`dano ${fmt(s.dmg)}${s.pellets > 1 ? ` ×${s.pellets} projéteis` : ''}${w.type === 'flame' ? '/s' : ''}`);
    out.push(`${fmt(1 / s.cd)} tiros/s`);
    if (s.pierce) out.push(`atravessa ${s.pierce}`);
    if (s.radius) out.push(`raio ${Math.round(s.radius)}`);
    if (s.burn) out.push(`queima ${fmt(s.burn)}s`);
    out.push(s.ammo === Infinity ? 'munição infinita' : `${s.ammo} por noite`);
    return out.join(' · ');
  };

  const unlocked = k => {
    const w = LWEAPONS[k], st = S.meta.stats;
    return Math.max(st.bestWave, S.best) >= w.wave && (!w.bosses || st.bosses >= w.bosses);
  };
  const lockText = k => {
    const w = LWEAPONS[k], st = S.meta.stats, parts = [];
    if (Math.max(st.bestWave, S.best) < w.wave) parts.push(`chegue à onda ${w.wave}`);
    if (w.bosses && st.bosses < w.bosses) parts.push(`derrote ${w.bosses} Abominações (${st.bosses}/${w.bosses})`);
    return '🔒 ' + parts.join(' e ');
  };
  const cost = k => scaledCost(LWEAPONS[k].cost, LW_UP_MULT, lvl(k));

  const current = () => { const k = M().slots[M().cur]; return k && owned(k) ? k : 'pistola'; };
  const ammoOf = k => (stat(k).ammo === Infinity ? Infinity : (S.lwAmmo[k] || 0));

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
      if (stat(k).ammo !== Infinity) S.lwAmmo[k] = stat(k).ammo;
      addLog(`🔫 Nova arma: ${LWEAPONS[k].icon} ${LWEAPONS[k].nome}! ${free >= 0 ? `Equipada no espaço ${LW_KEYS[free]}.` : 'Equipe na aba Armas.'}`, 'good');
    } else {
      if (stat(k).ammo !== Infinity) S.lwAmmo[k] = Math.max(S.lwAmmo[k] || 0, stat(k).ammo);
      addLog(`⬆️ ${LWEAPONS[k].icon} ${LWEAPONS[k].nome} nível ${lvl(k)}: ${fx(k)}.`, 'good');
    }
    emit('weapon', { rar: Math.min(3, lvl(k) - 1) });
  }

  function equip(arg) {
    const [k, si] = String(arg).split('|'), i = +si;
    if (!owned(k) || !(i >= 0 && i < 4)) return;
    const sl = M().slots, prev = sl.indexOf(k);
    if (prev === i) return;
    if (prev >= 0) sl[prev] = sl[i];   // troca de lugar com a que estava lá
    sl[i] = k;
  }

  function select(i) {
    if (!M().slots[i] || !owned(M().slots[i])) return;
    if (M().cur === i) return;
    M().cur = i;
    emit('weaponSwap', { k: current() });
  }
  function cycle(dir) {
    const sl = M().slots;
    for (let n = 1; n <= 4; n++) {
      const i = (M().cur + dir * n + 4) % 4;
      if (sl[i] && owned(sl[i])) { select(i); return; }
    }
  }

  function refill() {
    for (const k in LWEAPONS) if (owned(k) && stat(k).ammo !== Infinity) S.lwAmmo[k] = Math.max(S.lwAmmo[k] || 0, stat(k).ammo);
    projectiles.length = 0;
  }

  // ---------- tiro ----------
  // zumbi sob o ponto (com uma folga, porque os sprites são pequenos)
  function zombieAt(px, py) {
    let best = null, bd = Infinity;
    for (const z of S.horde.zs) {
      if (z.dead) continue;
      const s = ZTYPES[z.type].scale, pad = 2;
      if (px > z.x - 7 * s - pad && px < z.x + 7 * s + pad && py > z.y - 21 * s - pad && py < z.y + 4) {
        const d = Math.abs(px - z.x) + Math.abs(py - (z.y - 10 * s)) * 0.3;
        if (d < bd) { bd = d; best = z; }
      }
    }
    return best;
  }

  const baseDmg = k => stat(k).dmg * (1 + 0.4 * perk('mira')) * (furia() ? 2 : 1) * Endgame.mult('dmg');

  function fire(x, y) {
    if (!S.horde.active || paused || S.clickCd > 0) return false;
    const k = current(), w = LWEAPONS[k], st = stat(k);
    if (st.ammo !== Infinity) {
      if ((S.lwAmmo[k] || 0) < 1) { S.clickCd = 0.3; emit('noAmmo', { k }); return false; }
      S.lwAmmo[k]--;
    }
    S.clickCd = st.cd;
    const dmg = baseDmg(k);
    let hits = 0;

    if (w.type === 'bullet') {
      for (let i = 0; i < st.pellets; i++) {
        const px = x + gauss() * st.spread, py = y + gauss() * st.spread * 0.6;
        const z = zombieAt(px, py);
        emit('shot', { src: 'player', w: k, x: px, y: py, exact: true, miss: !z, quiet: i > 0 });
        if (!z) continue;
        hits++;
        Endgame.hit(z, dmg, 'player');
        if (st.pierce) {
          // atravessa os zumbis atrás, na mesma faixa
          const behind = S.horde.zs.filter(o => !o.dead && o !== z && o.x > z.x && o.x - z.x < 90 && Math.abs(o.y - z.y) < 10)
            .sort((a, b) => a.x - b.x).slice(0, st.pierce);
          for (const o of behind) { Endgame.hit(o, dmg * 0.8, 'player'); hits++; }
          if (behind.length) emit('pierce', { x1: z.x, y1: zy(z), x2: behind[behind.length - 1].x, y2: zy(behind[behind.length - 1]) });
        }
      }
    } else if (w.type === 'grenade' || w.type === 'rocket') {
      const dist = Math.hypot(x - MUZZLE.x, y - MUZZLE.y);
      projectiles.push({ k, x0: MUZZLE.x, y0: MUZZLE.y, x, y, t: 0, dur: w.type === 'rocket' ? 0.35 : 0.25 + dist / 600, r: st.radius, dmg, rocket: w.type === 'rocket' });
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
    return true;
  }

  function explode(p) {
    emit('explode', { x: p.x, y: p.y, big: p.rocket });
    for (const z of S.horde.zs) {
      if (z.dead) continue;
      const d = Math.hypot(z.x - p.x, ((z.y - 8) - p.y) * 1.4);
      if (d > p.r) continue;
      if (p.rocket) {
        if (ZTYPES[z.type].boss) damageZombie(z, z.maxHp * 0.4, 'player');
        else killZombie(z, 'player');
      } else {
        Endgame.hit(z, p.dmg * (1 - 0.5 * d / p.r), 'player');
      }
      S.meta.stats.shots++;
    }
  }

  // projéteis em voo e zumbis queimando (só no combate ao vivo)
  function hordeTick(dt) {
    for (const p of projectiles) {
      p.t += dt;
      if (p.t >= p.dur && !p.done) { p.done = true; explode(p); }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].done) projectiles.splice(i, 1);
    for (const z of S.horde.zs) {
      if (!z.burn || z.dead) continue;
      z.burn = Math.max(0, z.burn - dt);
      z.burnT = (z.burnT || 0) + dt;
      if (z.burnT >= 0.25) { z.burnT = 0; damageZombie(z, z.burnDps * 0.25, 'player'); }
      if (!z.burn) z.burnDps = 0;
    }
  }

  // zumbi abatido pelo líder pode deixar munição para as armas equipadas
  function onKill(z) {
    if (Math.random() >= LW_DROP) return;
    const opts = M().slots.filter(k => k && owned(k) && stat(k).ammo !== Infinity && (k !== 'bazuca' || Math.random() < 0.1));
    if (!opts.length) return;
    const k = opts[Math.floor(Math.random() * opts.length)], st = stat(k);
    const n = Math.max(1, Math.round(st.ammo * 0.15));
    S.lwAmmo[k] = Math.min(Math.ceil(st.ammo * 1.5), (S.lwAmmo[k] || 0) + n);
    emit('lwAmmo', { x: z.x, y: z.y - 26, text: `+${n} ${LWEAPONS[k].icon}` });
  }

  // ---------- interface ----------
  function buildUI() {
    $('lweapons').innerHTML = Object.entries(LWEAPONS).map(([k, w]) => `
      <div class="row lw-row" id="lwr-${k}">
        <div class="ach-icon">${w.icon}</div>
        <div class="main">
          <div class="title">${w.nome}<span class="lvl" id="lwl-${k}"></span></div>
          <div class="desc">${w.desc}</div>
          <div class="desc now" id="lwn-${k}"></div>
          <div class="cost" id="lwc-${k}"></div>
          <div class="lw-slots" id="lws-${k}">${LW_KEYS.map((key, i) => `<button class="small" data-act="lwEquip" data-k="${k}|${i}" id="lwe-${k}-${i}" title="Equipar no espaço ${key}">${key}</button>`).join('')}</div>
        </div>
        <button data-act="lwBuy" data-k="${k}" id="lwb-${k}"></button>
      </div>`).join('');
    $('weapon-bar').innerHTML = LW_KEYS.map((key, i) => `<button class="wslot" data-slot="${i}" id="wsl-${i}"></button>`).join('');
    $('weapon-bar').addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if (b) { select(+b.dataset.slot); render(); } });
    Object.assign(actions, { lwBuy: k => buy(k), lwEquip: a => equip(a) });
  }

  let barSig = '';
  function render() {
    const sl = M().slots;
    for (const k in LWEAPONS) {
      const w = LWEAPONS[k], l = lvl(k), open = unlocked(k), max = l >= LW_MAX_LVL, c = cost(k);
      $('lwr-' + k).classList.toggle('locked', !open && !l);
      $('lwr-' + k).classList.toggle('equipped', sl.includes(k));
      $('lwl-' + k).textContent = l ? ` nv. ${l}/${LW_MAX_LVL}` : '';
      $('lwn-' + k).textContent = l ? fx(k) : open ? 'No nível 1: ' + fx(k) : lockText(k);
      $('lwc-' + k).innerHTML = max || (!open && !l) ? '' : costHtml(c);
      const b = $('lwb-' + k);
      b.textContent = max ? 'Máximo' : l ? `Melhorar (nv. ${l + 1})` : 'Comprar';
      b.disabled = max || !open || !canAfford(c);
      $('lws-' + k).style.display = l ? '' : 'none';
      for (let i = 0; i < 4; i++) $(`lwe-${k}-${i}`).classList.toggle('primary', sl[i] === k);
    }
    // barra de armas sobre o cenário (só à noite)
    const bar = $('weapon-bar');
    bar.classList.toggle('hidden', !S.horde.active);
    if (!S.horde.active) return;
    const sig = sl.join() + M().cur + sl.map(k => k ? ammoOf(k) : '').join() + (S.clickCd > 0);
    if (sig === barSig) return;
    barSig = sig;
    for (let i = 0; i < 4; i++) {
      const k = sl[i], el = $('wsl-' + i);
      if (!k || !owned(k)) { el.innerHTML = `<kbd>${LW_KEYS[i]}</kbd><span class="wname">vazio</span>`; el.className = 'wslot empty'; continue; }
      const a = ammoOf(k);
      el.className = 'wslot' + (M().cur === i ? ' active' : '') + (a < 1 ? ' dry' : '');
      el.innerHTML = `<kbd>${LW_KEYS[i]}</kbd><span class="wicon">${LWEAPONS[k].icon}</span><span class="wname">${LWEAPONS[k].nome}</span><span class="wammo">${a === Infinity ? '∞' : a}</span>`;
    }
  }

  const isAuto = () => !!LWEAPONS[current()].auto;
  const tabBadge = () => Object.keys(LWEAPONS).filter(k => unlocked(k) && lvl(k) < LW_MAX_LVL && canAfford(cost(k))).length;

  return { fire, hordeTick, refill, onKill, select, cycle, current, isAuto, ammoOf, stat, buildUI, render, tabBadge, projectiles, MUZZLE };
})();
