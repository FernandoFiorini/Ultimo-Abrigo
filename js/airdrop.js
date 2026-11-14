'use strict';

// Airdrop no meio da horda: um avião solta uma caixa entre os zumbis. Clicando nela, um sobrevivente
// (um ocioso ou, sem ociosos, um guarda) sai pelo portão para buscar. Os zumbis perto dele largam o muro e vão atrás;
// se o pegarem, ele vira um zumbi com o nome dele e vem para o muro. Estado em S.horde.drop:
//   { st: 'wait' | 'fall' | 'ground', t, x, y, kind, r: corredor | null }
//   corredor: { n: nome, g: era guarda, x, y, st: 'out' | 'grab' | 'back', t, has: está com a caixa, ch: ids de quem o persegue, cover }
const Airdrop = (() => {
  const A = AIRDROP;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const D = () => S.horde && S.horde.active && S.horde.drop;
  const GATE = () => ({ x: WORLD.WALL_X + 8, y: 178 });

  // começo da horda: às vezes um avião vem (só jogando ao vivo: precisa de uma decisão sua)
  function plan(H, quiet) {
    // debug: airdrop pedido no menu antes de a horda começar
    if (S.dbgDrop) { const k = S.dbgDrop; delete S.dbgDrop; if (!quiet) force(k === 'any' ? null : k, H); return; }
    if (quiet || simulating || H.train || H.n < A.wave || Math.random() >= A.chance) return;
    H.drop = { st: 'wait', t: rnd(A.delay[0], A.delay[1]), r: null };
  }

  // debug: um airdrop agora (kind: sup, mil, rara ou null para sortear), caindo em ~1s
  function force(kind, H = S.horde) {
    if (!H.active || (H.drop && H.drop.st !== 'wait')) return false;
    H.drop = { st: 'wait', t: 1, r: null, kind: kind || null };
    return true;
  }

  const pickKind = () => { let x = Math.random(); for (const k in A.kinds) { x -= A.kinds[k].p; if (x < 0) return k; } return 'sup'; };

  function tick(dt) {
    const d = D();
    if (!d) return;
    if (d.st === 'wait') {
      d.t -= dt;
      if (d.t > 0) return;
      Object.assign(d, { st: 'fall', t: 0, kind: d.kind || pickKind(), x: Math.round(rnd(A.zone[0], A.zone[1])), y: Math.round(rnd(166, 186)) });
      addLog(`🪂 AIRDROP! Um avião soltou uma caixa de ${A.kinds[d.kind].nome.toLowerCase()} no meio da horda. Clique nela para mandar alguém buscar.`, 'good');
      emit('dropPlane', { x: d.x, kind: d.kind });
      return;
    }
    if (d.st === 'fall') {
      d.t += dt;
      if (d.t >= A.fall) { d.st = 'ground'; d.t = 0; emit('dropLand', { x: d.x, y: d.y, kind: d.kind }); }
      return;
    }
    const r = d.r;
    if (!r) return;
    const sp = A.speed * dt, G = GATE();
    const go = (tx, ty) => { const dx = tx - r.x, dy = ty - r.y, dist = Math.hypot(dx, dy); if (dist <= sp) { r.x = tx; r.y = ty; return true; } r.x += dx / dist * sp; r.y += dy / dist * sp; return false; };
    if (r.st === 'out') { if (go(d.x - 4, d.y)) { r.st = 'grab'; r.t = 0; } }
    else if (r.st === 'grab') { r.t += dt; if (r.t >= A.grab) { r.st = 'back'; r.has = true; emit('dropGrab', { x: d.x, y: d.y }); } }
    else if (go(G.x, G.y)) return arrive(d);
    // quem está perto larga o muro e vai atrás dele
    for (const z of S.horde.zs) {
      if (z.chase || z.dead || z.under || z.dummy || z.state !== 'walk' || ZTYPES[z.type].boss || z.x < WORLD.WALL_X + 18) continue;
      if (Math.hypot(z.x - r.x, z.y - r.y) < A.chase) { z.chase = true; r.ch.push(z.id); }
    }
  }

  // um zumbi perseguindo o corredor (chamado no lugar da caminhada normal). false: volta a andar para o muro
  function steer(z, dt) {
    const d = D(), r = d && d.r;
    if (!r) { z.chase = false; return false; }
    const dx = r.x - z.x, dy = r.y - z.y, dist = Math.hypot(dx, dy);
    if (dist < A.catch) { caught(d, z); return true; }
    const s = Math.min(dist, z.speed * A.chaseMult * dt * Champions.slow(z));
    z.x += dx / dist * s; z.y += dy / dist * s;
    return true;
  }

  // voltou ao portão: entrega a caixa (se pegou) e volta para a função
  function arrive(d) {
    const r = d.r;
    d.r = null;
    if (r.g) S.jobs.guarda++;
    fixJobs();
    for (const z of S.horde.zs) z.chase = false;
    const st = S.meta.stats;
    st.dropCover = Math.max(st.dropCover || 0, r.cover || 0);
    if (!r.has) return;
    st.drops = (st.drops || 0) + 1;
    const txt = reward(d);
    S.horde.drop = null;
    addLog(`📦 ${r.n} voltou com o airdrop! ${txt}`, 'good');
    emit('dropGot', { x: GATE().x, y: GATE().y, kind: d.kind, txt });
    checkAchievements();
  }

  // recompensa: suprimentos e munição militar rendem mais quanto mais longe a caixa caiu
  function reward(d) {
    const w = Math.max(1, S.horde.n), far = Math.max(0, Math.min(1, (d.x - A.zone[0]) / (A.zone[1] - A.zone[0])));
    const m = (0.8 + 0.6 * far) * Endgame.lootMult();
    const give = (k, v) => { v = Math.max(1, Math.round(v * m)); S.res[k] += v; return `+${fmt(v)} ${RES[k].icon}`; };
    if (d.kind === 'sup') return [give('municao', 30 + 12 * w), give('sucata', 20 + 8 * w), give('remedio', 1 + w / 5)].join(' ');
    if (d.kind === 'mil') {
      S.horde.dropBuff = true;
      return `Munição militar: guardas atiram ${Math.round((A.milFire - 1) * 100)}% mais rápido até o fim da horda. ${give('municao', 40 + 15 * w)}`;
    }
    Champions.addBox('airdrop', 'Dentro do airdrop havia uma caixa de herói ★★');
    gainCash(A.rareCash, 'airdrop raro');
    return `Caixa de herói ★★ e 💵 ${A.rareCash}.`;
  }

  // pegaram: morre, vira zumbi com o nome dele ali mesmo e a caixa cai de volta no chão
  function caught(d, z) {
    const r = d.r, H = S.horde;
    d.r = null;
    if (r.has) { d.x = Math.round(r.x); d.y = Math.round(Math.max(166, Math.min(186, r.y))); }
    for (const o of H.zs) o.chase = false;
    S.survivors--;
    forgetPerson(r.n);
    remember(r.n, 'foi buscar um airdrop no meio da horda e não voltou');
    fixJobs();
    const st = S.meta.stats;
    st.dropLost = (st.dropLost || 0) + 1;
    st.dropCover = Math.max(st.dropCover || 0, r.cover || 0);
    const zz = spawnZombie('mordido', H, { x: r.x, y: Math.max(WORLD.LANE_MIN, Math.min(WORLD.LANE_MAX, r.y)) });
    zz.name = r.n;
    zz.stun = 0.8;   // levantando
    addLog(`🧟 Os zumbis pegaram ${r.n} no caminho do airdrop. ${r.n} se levantou… e agora vem para o muro.`, 'bad');
    emit('dropCaught', { x: r.x, y: r.y, name: r.n });
    checkAchievements();
    if (home() <= 0 && !S.exps.length) gameOver();
  }

  // clique na cena: perto da caixa no chão, manda alguém buscar
  function click(x, y) {
    const d = D();
    if (!d || d.st !== 'ground' || Math.abs(x - d.x) > 11 || y < d.y - 18 || y > d.y + 5) return false;
    if (d.r) return true;
    send(d);
    return true;
  }

  function send(d) {
    const fromGuard = idle() <= 0;
    if (fromGuard && S.jobs.guarda <= 0) {
      addLog('📦 Não há ninguém livre para buscar o airdrop: precisa de um ocioso ou de um guarda.', 'warn');
      emit('dropNone');
      return;
    }
    const busy = new Set((S.injured || []).map(w => w.n));
    const pool = S.people.filter(n => !busy.has(n));
    const n = pool[Math.floor(Math.random() * pool.length)] || 'Alguém';
    if (fromGuard) S.jobs.guarda--;
    const G = GATE();
    d.r = { n, g: fromGuard, x: G.x, y: G.y, st: 'out', t: 0, has: false, ch: [], cover: 0 };
    addLog(`🏃 ${n} ${fromGuard ? 'desceu do muro e ' : ''}saiu correndo pelo portão atrás do airdrop! Dê cobertura.`, 'warn');
    emit('dropSend', { name: n });
  }

  // fim da horda: quem estava lá fora volta; caixa largada no chão se perde
  function onWaveEnd(H) {
    const d = H.drop;
    if (!d) return;
    if (d.r) {
      const r = d.r;
      if (r.has) { const G = GATE(); r.x = G.x; r.y = G.y; arrive(d); }
      else { d.r = null; if (r.g) S.jobs.guarda++; fixJobs(); addLog(`🏃 ${r.n} voltou ao abrigo sem o airdrop: a horda acabou antes.`); }
    }
    if (H.drop && H.drop.st === 'ground') addLog('📦 O airdrop ficou lá fora. Os zumbis o despedaçaram durante a noite.', 'warn');
    H.drop = null;
    for (const z of H.zs) z.chase = false;
  }

  // cobertura: zumbis que perseguiam o corredor e caíram
  listeners.push((t, d) => {
    if (t !== 'zdeath') return;
    const r = D() && S.horde.drop.r;
    if (r && r.ch.includes(d.id)) r.cover = (r.cover || 0) + 1;
  });

  const runner = () => { const d = D(); return d && d.r; };
  return { plan, force, tick, steer, click, onWaveEnd, runner, state: D };
})();
