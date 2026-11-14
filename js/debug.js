'use strict';

// Menu de debug: atalhos para montar situações de teste (invasão, feridos, mordidos...) sem jogar até elas.
// Só existe com DEV_MODE = true (config.js) E rodando localmente (arquivo, localhost ou 127.0.0.1):
// mesmo que alguém publique com a flag ligada por engano, o menu não aparece no site.
// Abre com F9 ou com a tecla ` (crase), e pelo botão 🐞 no rodapé.
// Organização: estado atual no topo, interruptores (ligado/desligado), busca e abas com as ações.
const Debug = (() => {
  const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  const enabled = DEV_MODE === true && local;

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const isHurt = n => S.injured.some(w => w.n === n);
  const healthy = () => S.people.filter(n => !isHurt(n));
  const note = t => addLog(`🐞 ${t}`, 'warn');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function room(n) { while (maxSurv() < S.survivors + n) S.build.beliche++; }
  function addPeople(n) { room(n); for (let i = 0; i < n; i++) addSurvivor(); emit('expReturn', { n }); }
  function ensurePeople(n) { if (S.survivors < n) addPeople(n - S.survivors); }
  // tira alguém do grupo sem memorial (para virar mordido, transformado ou "voltar curado")
  function takeSomeone() {
    const pool = healthy().length ? healthy() : S.people;
    if (!pool.length) return null;
    const name = pick(pool);
    forgetPerson(name); S.survivors--; syncPeople(); fixJobs();
    return name;
  }
  function injure(n) {
    for (let i = 0; i < n; i++) {
      const pool = healthy();
      if (pool.length <= 1) break;   // sempre sobra alguém de pé
      S.injured.push({ n: pick(pool), t: HEAL_TIME });
    }
    fixJobs();
  }
  function bite(n) {
    ensurePeople(n + 2);
    const names = [];
    for (let i = 0; i < n; i++) { const name = takeSomeone(); if (name) { S.bitten.push(name); names.push(name); } }
    return names;
  }
  function wallDown() { S.wallHp = 0; S.wallDown = true; S.overflow = 0; emit('wallDown'); }
  function hordeNow() { if (!S.horde.active) S.waveTimer = 0.01; }
  // chaves de teste (não vão para o save): lidas por weapons.js
  const flags = { maxDmg: false, infAmmo: false, train: false };

  // ---------- campo de treino
  // As ondas param e um boneco que não morre fica na frente do muro. Todo o dano que ele leva (líder, guardas,
  // torres, herói de campo e cada habilidade) é registrado: número na tela, dano por segundo e tabela por fonte.
  // Usa uma "horda" de mentira (S.horde.train): guardas, torres, armas e heróis atiram nele como numa onda de verdade.
  const DUMMY_TYPES = ['normal', 'tanque', 'blindado', 'chefe'];
  const DPS_WINDOW = 5;   // segundos de jogo para o "DPS agora"
  const TR = { type: 'normal', far: false, noCd: false, min: false };
  let trainUi = null, trainTimer = null;

  function resetTrain() {
    Object.assign(TR, { gt: 0, hits: [], src: {}, total: 0, n: 0, max: 0, last: null, blocked: 0, crits: 0, heads: 0, kills: 0, crit: false, head: false, pend: {} });
  }
  resetTrain();

  // nome legível de quem causou o dano
  function srcLabel(src, o = {}) {
    if (src === 'player') { const W = LWEAPONS[Weapons.current()]; return `${W.icon} ${W.nome}${o.fire ? ' (queimadura)' : ''}`; }
    if (src === 'hero') {
      const k = Champions.cur(), C = k && CHAMPS[k], t = Champions.tag();
      if (!C) return '⭐ Herói';
      const sk = { basic: 'ataque básico', act: `${C.skills.act.icon} ${C.skills.act.nome}`, sup: `${C.skills.sup.icon} ${C.skills.sup.nome}`,
        conf: 'confusão', bear: '🐻 urso', spark: `${C.skills.p1.icon} faísca` }[t] || 'outro';
      return `${C.icon} ${C.nome.split(' ')[0]}: ${sk}`;
    }
    return { guard: '🛡️ Guardas', rock: '🪨 Pedras (sem munição)', tower: '🗼 Torres', trap: '🪤 Armadilhas', shock: '⚡ Cerca elétrica',
      explode: '💥 Explosão', air: '✈️ Ataque aéreo', melee: '🔨 Corpo a corpo' }[src] || src;
  }

  function placeDummy() {
    const H = S.horde;
    H.zs = H.zs.filter(z => !z.dummy);
    const z = spawnZombie(TR.type, H, { x: WORLD.WALL_X + (TR.far ? 110 : 40), y: 176 });
    z.dummy = true; z.speed = z.speed0 = 0;
  }
  const dummy = () => S.horde.train && S.horde.zs.find(z => z.dummy);

  function startTrain() {
    if (S.horde.train) return true;
    if (S.horde.active) { note('espere a horda acabar para abrir o campo de treino.'); return false; }
    S.horde = { active: true, train: true, n: S.wave, queue: [], event: null, spawnT: 1e9, zs: [], kills: 0, loot: 0, food: 0, ammo: 0, dmg: 0,
      gcd: [], tcd: [], mcd: [], turned: [], deaths: 0, deathCap: 99, ghurt: 0, unpaid: [] };
    Weapons.refill();
    placeDummy(); resetTrain();
    flags.train = true;
    showTrainUi();
    note('campo de treino aberto: ondas pausadas e um boneco na frente do muro.');
    return true;
  }
  function stopTrain() {
    if (S.horde.train) S.horde = { active: false, queue: [], zs: [] };
    flags.train = false;
    hideTrainUi();
  }

  // chamado por damageZombie/killZombie quando o alvo é o boneco
  function dummyHit(z, dmg, src, o = {}) {
    const key = srcLabel(src, o), kill = !!o.kill;
    const e = TR.src[key] || (TR.src[key] = { dmg: 0, n: 0, max: 0, kills: 0, blocked: 0 });
    e.dmg += dmg; e.n++; e.max = Math.max(e.max, dmg); if (kill) e.kills++;
    TR.total += dmg; TR.n++; TR.max = Math.max(TR.max, dmg); if (kill) TR.kills++;
    TR.hits.push({ t: TR.gt, d: dmg });
    const crit = TR.crit, head = TR.head;
    TR.crit = TR.head = false;
    TR.last = { key, dmg, crit, head, kill };
    z.hp = z.maxHp;
    // número na tela; golpes pequenos (queimadura, confusão) somam até valer 1 ponto
    const p = (TR.pend[key] || 0) + dmg;
    if (kill || crit || pts(p) >= 1) {
      TR.pend[key] = 0;
      emit('dmgNum', { x: z.x, y: zy(z) - 8 * zsc(z), big: kill || crit,
        t: kill ? `ABATE (${fmt(pts(dmg))})` : `${fmt(pts(p))}${crit ? '!' : ''}${head ? ' 🎯' : ''}`,
        c: kill ? '#ff5a4a' : crit ? '#ffa040' : src === 'hero' ? '#d0b0ff' : src === 'player' ? '#ffffff' : src === 'tower' ? '#9fd3ff' : '#ffe9a0' });
    } else TR.pend[key] = p;
  }
  // críticos, tiros na cabeça e tiros barrados pela armadura chegam como eventos
  function trainEvent(type, d) {
    if (!S.horde.train) return;
    if (type === 'crit') { TR.crit = true; TR.crits++; }
    else if (type === 'headshot') { TR.head = true; TR.heads++; }
    else if (type === 'armor' && d.src) {
      TR.blocked++;
      const key = srcLabel(d.src);
      const e = TR.src[key] || (TR.src[key] = { dmg: 0, n: 0, max: 0, kills: 0, blocked: 0 });
      e.blocked++;
    }
  }
  function trainTick(dt) {
    TR.gt += dt;
    const cut = TR.gt - DPS_WINDOW;
    while (TR.hits.length && TR.hits[0].t < cut) TR.hits.shift();
    if (TR.noCd && Champions.cur()) { S.meta.champ.charge = 1; S.meta.champ.actT = 0; }
  }

  // ---------- painel do campo de treino (em cima do cenário)
  function showTrainUi() {
    if (trainUi) return;
    const stage = document.querySelector('.stage');
    if (!stage) return;
    trainUi = document.createElement('div');
    trainUi.className = 'dbg-train';
    trainUi.innerHTML = '<div class="dt-ctrl"></div><div class="dt-stats"></div>';
    stage.appendChild(trainUi);
    trainUi.onclick = e => {
      const b = e.target.closest('[data-t]');
      if (!b) return;
      const [k, v] = b.dataset.t.split(':');
      if (k === 'type') { TR.type = v; if (S.horde.train) { placeDummy(); resetTrain(); } }
      else if (k === 'far') { TR.far = v === '1'; if (S.horde.train) { placeDummy(); resetTrain(); } }
      else if (k === 'reset') resetTrain();
      else if (k === 'ready') { S.meta.champ.charge = 1; S.meta.champ.actT = 0; }
      else if (k === 'nocd') TR.noCd = !TR.noCd;
      else if (k === 'min') TR.min = !TR.min;
      else if (k === 'exit') { stopTrain(); note('campo de treino fechado: as ondas voltam.'); render(); return; }
      drawTrainCtrl(); drawTrainStats();
    };
    drawTrainCtrl(); drawTrainStats();
    trainTimer = setInterval(() => {
      if (!S.horde.train) { stopTrain(); return; }   // save trocado, evacuação, Novo Mundo...
      drawTrainStats();
    }, 300);
  }
  function hideTrainUi() {
    if (trainTimer) clearInterval(trainTimer);
    trainTimer = null;
    if (trainUi) trainUi.remove();
    trainUi = null;
  }
  function drawTrainCtrl() {
    if (!trainUi) return;
    trainUi.classList.toggle('min', TR.min);
    const b = (t, label, on, title = '') => `<button data-t="${t}" class="${on ? 'on' : ''}" title="${esc(title)}">${label}</button>`;
    trainUi.querySelector('.dt-ctrl').innerHTML = `
      <div class="dt-head"><b>🎯 Campo de treino</b><span>${b('min', TR.min ? '▸' : '▾', false, 'mostrar/esconder')}${b('exit', '✕ Sair', false, 'fecha o campo de treino e as ondas voltam')}</span></div>
      ${TR.min ? '' : `<div class="dt-row">${DUMMY_TYPES.map(t => b('type:' + t, `${ZTYPES[t].icon || ''} ${ZTYPES[t].nome}`.trim(), TR.type === t, ZTYPES[t].armor ? 'só tiros na cabeça ou explosões passam pela armadura' : '')).join('')}</div>
      <div class="dt-row">${b('far:0', 'Perto do muro', !TR.far, 'ao alcance de armadilhas, torre curta e habilidades "perto do muro"')}${b('far:1', 'Mais longe', TR.far)}
        ${b('reset', '↺ Zerar')}${b('ready', '⚡ Suprema pronta', false, 'suprema cheia e ativa sem recarga')}${b('nocd', `${TR.noCd ? '☑' : '☐'} Sem recarga`, TR.noCd, 'ativa e suprema sempre prontas')}</div>`}`;
  }
  function drawTrainStats() {
    if (!trainUi) return;
    const el = trainUi.querySelector('.dt-stats'), z = dummy();
    if (TR.min || !z) {
      el.innerHTML = z ? `<div class="dt-big">${fmt(pts(dpsNow()))} <small>DPS</small></div>` : '';
      return;
    }
    const span = Math.max(0.001, Math.min(DPS_WINDOW, TR.gt)), now = dpsNow(), avg = TR.total / Math.max(1, TR.gt);
    const ttk = now > 0 ? z.maxHp / now : 0;
    const rows = Object.entries(TR.src).sort((a, b) => b[1].dmg - a[1].dmg);
    const L = TR.last;
    el.innerHTML = `
      <div class="dt-kpis">
        <div><small>DPS agora (${Math.round(span)}s)</small><b>${fmt(pts(now))}</b></div>
        <div><small>DPS médio</small><b>${fmt(pts(avg))}</b></div>
        <div><small>Dano total</small><b>${fmt(pts(TR.total))}</b></div>
        <div><small>Maior golpe</small><b>${fmt(pts(TR.max))}</b></div>
      </div>
      <div class="dt-line">Alvo: ${ZTYPES[z.type].nome} da onda ${S.horde.n} · vida ${fmt(pts(z.maxHp))}${ttk ? ` · cairia em ~${ttk < 10 ? ttk.toFixed(1) : Math.round(ttk)}s` : ''}</div>
      <div class="dt-line">${fmtTime(TR.gt)} · ${TR.n} golpes · ${TR.crits} críticos · ${TR.heads} na cabeça${TR.blocked ? ` · <span class="bad-text">${TR.blocked} barrados</span>` : ''}${TR.kills ? ` · ${TR.kills} abates diretos` : ''}</div>
      ${L ? `<div class="dt-line">Último: ${esc(L.key)} → <b>${L.kill ? 'abate direto' : fmt(pts(L.dmg))}</b>${L.crit ? ' (crítico)' : ''}${L.head ? ' (na cabeça)' : ''}</div>` : '<div class="dt-line dbg-dim">Atire no boneco ou espere guardas, torres e o herói.</div>'}
      ${rows.length ? `<table class="dt-table"><tr><th>Fonte</th><th>Dano</th><th>%</th><th>Golpes</th><th>Média</th><th>Maior</th></tr>${rows.map(([k, e]) =>
        `<tr><td>${esc(k)}${e.blocked ? ` <span class="bad-text" title="tiros barrados pela armadura">(${e.blocked}✕)</span>` : ''}</td><td>${fmt(pts(e.dmg))}</td><td>${TR.total ? Math.round(e.dmg / TR.total * 100) : 0}%</td>
          <td>${e.n}${e.kills ? ` (${e.kills}☠)` : ''}</td><td>${e.n ? fmt(pts(e.dmg / e.n)) : '—'}</td><td>${fmt(pts(e.max))}</td></tr>`).join('')}</table>` : ''}`;
  }
  const dpsNow = () => TR.hits.reduce((a, h) => a + h.d, 0) / Math.max(0.5, Math.min(DPS_WINDOW, TR.gt));

  // Equilíbrio: dano esperado de guardas + torres numa onda ÷ vida total da onda (sem contar seus tiros, muro e armadilhas).
  // < 1: o muro apanha · 1 a 1,5: tenso · > 2: a defesa resolve sozinha
  function balance(n, ammo = Infinity) {
    const threat = waveThreat(n), count = waveSize(n);
    const def = defenseEstimate(count, n, ammo).dmg * Endgame.mult('dmg') * Endgame.offlineMult();
    return { n, count, threat, def, r: def / Math.max(0.01, threat) };
  }
  const ratioCell = r => `<b style="color:${r < 1 ? '#ff6a5a' : r <= 1.5 ? '#f0b040' : r <= 2 ? '#9fd38a' : '#6fb0ff'}">${r.toFixed(2)}</b>`;
  function balanceTable() {
    const rows = [1, 3, 5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 50, 60].map(n => balance(n));
    return `<table class="dbg-table"><tr><th>Onda</th><th>Zumbis</th><th>Vida total</th><th>Dano da defesa</th><th>Razão</th></tr>${
      rows.map(b => `<tr${b.n === S.wave ? ' class="dbg-now"' : ''}><td>${b.n}</td><td>${fmt(b.count)}</td><td>${fmt(pts(b.threat))}</td><td>${fmt(pts(b.def))}</td><td>${ratioCell(b.r)}</td></tr>`).join('')}</table>
      <p class="hint">Com a defesa atual e munição infinita. Cidade ${S.meta.city}, mundo ${S.meta.worlds || 1} (ameaça +${Math.round(CITY_HP * cityThreat() * 100)}% de vida, +${Math.round(CITY_COUNT * cityThreat() * 100)}% de zumbis).
      Cor: <span style="color:#ff6a5a">&lt;1 muro apanha</span> · <span style="color:#f0b040">1–1,5 tenso</span> · <span style="color:#9fd38a">1,5–2 folgado</span> · <span style="color:#6fb0ff">&gt;2 resolvido</span></p>`;
  }

  // ---------- interruptores: ficam no topo, sempre visíveis, com o estado ligado/desligado
  const TOGGLES = {
    train: { nome: '🎯 Campo de treino', desc: 'pausa as ondas e põe um boneco que não morre na frente do muro, com dano por golpe e DPS' },
    maxDmg: { nome: '💥 Dano máximo', desc: 'seus tiros matam com 1 tiro, inclusive chefes' },
    infAmmo: { nome: '♾️ Munição infinita', desc: 'o pente das armas do líder não esvazia' },
  };

  // ---------- abas e ações
  // cada ação: [rótulo, função(dlg), descrição curta]. Ações que devolvem true fecham o menu (para ver o efeito na cena).
  // cada aba: [id, título, [[subtítulo, ações], ...]]
  const TABS = [
    ['cenarios', '🎬 Cenários', [
      [null, {
        invasao: ['🧱 Invasão agora', () => { ensurePeople(8); wallDown(); hordeNow(); note('muro derrubado e horda começando.'); return true; }, 'derruba o muro e começa a horda da onda atual (garante 8 pessoas)'],
        invasao10: ['👹 Invasão com Abominação', () => { ensurePeople(10); if (!S.horde.active) S.wave = 10; wallDown(); hordeNow(); note('onda 10 com o muro caído.'); return true; }, 'vai para a onda 10 com o muro caído'],
        mordidos: ['🦷 2 mordidos', () => { const n = bite(2); note(`${joinNames(n)} foram mordidos. Feche o menu para decidir.`); return true; }, 'abre a decisão do que fazer com os mordidos'],
        feridos: ['🤕 3 feridos e 1 médico', () => { ensurePeople(6); injure(3); if (!S.jobs.medico) { if (idle() <= 0) addPeople(1); S.jobs.medico = 1; } note('3 feridos para tratar.'); }, 'para testar o tratamento'],
        transformado: ['🧟 Transformado na horda', () => { ensurePeople(4); const n = takeSomeone(); if (n) S.turned.push(n); hordeNow(); note(`${n} volta transformado nesta horda.`); return true; }, 'alguém do grupo volta como zumbi na horda que começa agora'],
        cura: ['🌅 Liberado volta curado', () => { ensurePeople(3); const n = takeSomeone(); if (n) S.returning.push({ n, t: 5 }); note(`${n} saiu e volta curado em 5s (só fora da horda).`); return true; }, 'alguém sai e volta curado em 5s (só fora da horda)'],
      }],
    ]],
    ['horda', '🧱 Horda', [
      ['Muro e ondas', {
        derrubar: ['Derrubar o muro', () => { wallDown(); note('muro derrubado.'); }, 'vida do muro a zero'],
        consertar: ['Consertar o muro', () => { S.wallHp = maxWall(); S.wallDown = false; S.overflow = 0; note('muro restaurado.'); }, 'vida do muro no máximo'],
        horda: ['Começar a horda agora', () => { hordeNow(); return true; }, 'zera o cronômetro da próxima onda'],
        fim: ['Encerrar a horda', () => { if (S.horde.train) stopTrain(); else if (S.horde.active) { S.horde.queue = []; S.horde.zs = []; } return true; }, 'some com todos os zumbis da horda atual (ou fecha o campo de treino)'],
        ondaMenos: ['Onda −1', () => { if (!S.horde.active) S.wave = Math.max(1, S.wave - 1); }, 'só fora da horda'],
        ondaMais: ['Onda +1', () => { if (!S.horde.active) S.wave++; }, 'só fora da horda'],
        ondaMais5: ['Onda +5', () => { if (!S.horde.active) S.wave += 5; }, 'só fora da horda'],
      }],
      // chefe na hora: entra na horda atual ou começa uma horda com ele na frente
      ['Chefes (aparecem agora)', Object.fromEntries([...BOSS_POOL, 'chefao'].map(t => ['boss_' + t, [`${ZTYPES[t].icon} ${ZTYPES[t].nome}`, () => {
        if (S.horde.active) Bosses.spawned(spawnZombie(t, S.horde));
        else { S.dbgBoss = t; hordeNow(); }
        note(`${ZTYPES[t].nome} chamado.`);
        return true;
      }, 'entra na horda atual ou começa uma com ele na frente']]))],
    ]],
    ['pessoas', '🧍 Pessoas', [
      ['Grupo', {
        mais1: ['+1 sobrevivente', () => addPeople(1), 'constrói beliche se faltar vaga'],
        mais5: ['+5 sobreviventes', () => addPeople(5), 'constrói beliches se faltar vaga'],
        medico: ['+1 médico', () => { if (idle() <= 0) addPeople(1); S.jobs.medico++; }, 'usa um ocioso ou traz alguém'],
        semMedico: ['Tirar todos os médicos', () => { S.jobs.medico = 0; }, 'para testar feridos sem tratamento'],
      }],
      ['Feridos, mordidos e luto', {
        ferir: ['Ferir 1 pessoa', () => injure(1), 'sempre sobra alguém de pé'],
        morder: ['Morder 1 pessoa', () => { bite(1); }, 'abre a decisão ao fechar o menu'],
        curar: ['Curar todos os feridos', () => { S.injured = []; S.injT = 0; }, 'limpa a lista de feridos'],
        piorar: ['Ferido piora agora', () => { if (S.injured.length > treating()) S.injT = WOUND_TIME - 0.05; }, 'só se houver ferido sem médico'],
        luto: ['Começar luto', () => { S.mourn = Math.min(MOURN_TIME * 2, S.mourn + MOURN_TIME); }, 'produção menor por um tempo'],
        semLuto: ['Encerrar luto', () => { S.mourn = 0.01; }, 'acaba com o luto atual'],
      }],
    ]],
    ['recursos', '📦 Recursos', [
      [null, {
        tudo: ['+500 de tudo', () => { for (const r in S.res) S.res[r] += r === 'remedio' ? 20 : 500; }, 'remédio ganha +20'],
        semRemedio: ['Zerar remédios', () => { S.res.remedio = 0; }, 'para testar feridos piorando'],
        municao: ['Zerar munição', () => { S.res.municao = 0; }, 'guardas e torres param de atirar'],
        avancar: ['Avançar 60s', () => { simulate(60); }, 'simula 60s como se fosse progresso offline'],
      }],
    ]],
    // armas do líder: equipa no espaço atual, no nível máximo, com munição cheia
    ['armas', '🔫 Armas', [
      [null, {
        todas: ['⭐ Todas no nível máximo', () => { Weapons.dbgMaxAll(); note('todas as armas no nível máximo, com munição especial cheia.'); }, 'com munição especial cheia'],
      }],
      ['Equipar (nível máximo, no espaço atual)', Object.fromEntries(Object.keys(LWEAPONS).map(k => ['lw_' + k, [`${LWEAPONS[k].icon} ${LWEAPONS[k].nome}`, () => {
        Weapons.dbgGive(k); note(`${LWEAPONS[k].nome} (nível ${LW_MAX_LVL}) equipada no espaço atual.`);
      }, `nível ${LW_MAX_LVL}, pente cheio`]]))],
    ]],
    ['herois', '⭐ Heróis', [
      ['Herói em campo', {
        nivel: ['+5 níveis', () => { const h = S.meta.champ.owned[Champions.cur()]; if (h) h.lvl = Math.min(CHAMP_MAX_LVL, h.lvl + 5); }, 'no herói que está no telhado'],
        carga: ['Suprema e ativa prontas', () => { S.meta.champ.charge = 1; S.meta.champ.actT = 0; }, 'suprema cheia e ativa sem recarga'],
        presente: ['Herói da onda 10 de novo', () => { S.meta.champ.gift = false; }, 'a caixa misteriosa pode chegar outra vez'],
      }],
      ['Caixas', {
        caixa: ['📦 +1 caixa de chefe', () => { Champions.addBox('chefe', 'Debug'); }, 'clique na caixa no cenário'],
        caixa5: ['📦 +5 caixas de chefe', () => { for (let i = 0; i < 5; i++) Champions.addBox('chefe', 'Debug'); }, 'clique na caixa no cenário'],
        caixa3: ['🎁 Caixa ★★★ garantida', () => {
          Champions.addBox('presente', 'Debug'); S.meta.champ.boxes.unshift(S.meta.champ.boxes.pop());
          setTimeout(() => {
            // com todos liberados, a caixa ★★★ não teria quem dar: tira um herói (fora do telhado) só durante o sorteio
            // e devolve o progresso dele depois, para a caixa sempre sair com herói completo
            const c = S.meta.champ, keys = Object.keys(CHAMPS);
            let back = null;
            if (keys.every(k => c.owned[k])) {
              const pool = keys.filter(k => k !== c.cur);
              const k = pool[Math.floor(Math.random() * pool.length)];
              back = { k, d: c.owned[k] }; delete c.owned[k];
            }
            Champions.openBox();
            if (back) c.owned[back.k] = back.d;
          }, 50);
          return true;
        }, 'abre agora e sempre dá um herói completo (se já tiver todos, repete um sem perder o progresso)'],
        frag5: ['🧩 Herói a 1 fragmento', () => {
          const c = S.meta.champ, miss = Object.keys(CHAMPS).filter(k => !c.owned[k]);
          if (!miss.length) { note('todos os heróis já estão liberados.'); return; }
          const k = miss[Math.floor(Math.random() * miss.length)];
          c.frags[k] = 5; note(`${CHAMPS[k].nome}: 5/6 fragmentos. Abra uma caixa ★★ para completar.`);
        }, 'deixa um herói que falta com 5/6 fragmentos'],
        fragOk: ['✨ Fragmentos completos', () => {
          const c = S.meta.champ, miss = Object.keys(CHAMPS).filter(k => !c.owned[k]);
          if (!miss.length) { note('todos os heróis já estão liberados.'); return; }
          const k = miss[Math.floor(Math.random() * miss.length)];
          c.frags[k] = 6; note(`${CHAMPS[k].nome}: pronto para invocar (cenário ou aba Exército).`);
        }, 'um herói que falta fica pronto para invocar'],
      }],
      ['Liberar e pôr em campo', Object.fromEntries(Object.keys(CHAMPS).map(k => ['ch_' + k, [`${CHAMPS[k].icon} ${CHAMPS[k].nome}`, () => {
        Champions.grant(k, 'debug'); S.meta.champ.cur = k;
      }, 'libera se precisar e coloca no telhado']]))],
    ]],
    ['equilibrio', '📊 Equilíbrio', [
      ['Cansaço e ameaça', {
        cansar: ['😓 Guardas exaustos', () => { S.fatigue = 1; }, 'cansaço em 100%'],
        descansar: ['😌 Zerar cansaço', () => { S.fatigue = 0; }, 'guardas descansados'],
        cidade: ['🏙️ Cidade +1', () => { S.meta.city++; note(`cidade ${S.meta.city}: zumbis mais duros.`); }, 'só a ameaça dos zumbis sobe'],
        cidadeMenos: ['🏙️ Cidade −1', () => { S.meta.city = Math.max(1, S.meta.city - 1); }, 'só a ameaça dos zumbis desce'],
      }],
    ]],
  ];
  const ACTIONS = {};
  for (const [tab, , groups] of TABS) for (const [g, acts] of groups) for (const [id, a] of Object.entries(acts)) ACTIONS[id] = { a, tab, g };

  // ---------- estado atual (sempre no topo)
  function status() {
    const H = S.horde, row = (k, v) => `<div><span class="dbg-k">${k}</span> ${v}</div>`;
    const list = a => a.length ? a.join(', ') : '—';
    const b = balance(H.active ? H.n : S.wave, S.res.municao);
    return `<div class="dbg-status">
      ${row('Onda', H.active ? `${H.n} · <b class="bad-text">horda ativa</b>: ${H.queue.length + H.zs.length} zumbis, ${H.zs.filter(z => z.state === 'invade').length} dentro` : `${S.wave} · horda em ${Math.ceil(S.waveTimer)}s`)}
      ${row('Muro', `${Math.round(S.wallHp)} / ${maxWall()}${S.wallDown ? ' · <b class="bad-text">CAÍDO</b>' : ''}`)}
      ${row('Grupo', `${S.survivors} / ${maxSurv()} · ${idle()} ociosos · ${S.jobs.guarda} guardas · ${S.jobs.medico} médicos`)}
      ${row('Feridos', list(S.injured.map(w => `${w.n} (${Math.ceil(w.t)}s)`)) + (S.injured.length > treating() ? ` · piora em ${Math.ceil(WOUND_TIME - S.injT)}s` : ''))}
      ${row('Mordidos', list(S.bitten))}
      ${row('Transformados', list(S.turned))}
      ${row('Voltando curados', list(S.returning.map(r => `${r.n} (${Math.ceil(r.t)}s)`)))}
      ${row('Luto · remédios', `${S.mourn > 0 ? fmtTime(S.mourn) : '—'} · ${fmt(S.res.remedio)} remédios · ${fmt(S.res.municao)} munição`)}
      ${row('Arma', `${LWEAPONS[Weapons.current()].icon} ${LWEAPONS[Weapons.current()].nome} · pente ${Weapons.ammoOf(Weapons.current())}/${Weapons.stat(Weapons.current()).mag}`)}
      ${row('Cansaço', `${Math.round((S.fatigue || 0) * 100)}% · cadência dos guardas ${Math.round(guardFire() * 100)}%`)}
      ${row('Defesa ÷ ameaça', `${ratioCell(b.r)} na onda ${b.n} <span class="dbg-dim">(dano ${fmt(pts(b.def))} contra ${fmt(pts(b.threat))} de vida, com a munição atual)</span>`)}
      ${row('Cidade', `${S.meta.city} · mundo ${S.meta.worlds || 1}`)}
    </div>`;
  }

  function toggles() {
    return `<div class="dbg-toggles">${Object.entries(TOGGLES).map(([k, t]) =>
      `<button class="dbg-switch ${flags[k] ? 'on' : ''}" data-opt="flag:${k}" title="${esc(t.desc)}">
        <span class="dbg-knob"></span><span><b>${t.nome}</b><small>${flags[k] ? 'LIGADO' : 'desligado'} · ${t.desc}</small></span></button>`).join('')}</div>`;
  }

  // ---------- lista de ações: a aba atual, ou tudo o que bate com a busca
  let tab = 'cenarios', query = '';
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const btn = (id, [label, , desc]) => `<button class="dbg-act" data-opt="${id}"><b>${label}</b>${desc ? `<small>${desc}</small>` : ''}</button>`;
  function listHtml() {
    const q = norm(query.trim());
    if (q) {
      const hits = Object.entries(ACTIONS).filter(([, { a, tab: t, g }]) => {
        const T = TABS.find(x => x[0] === t);
        return norm(`${a[0]} ${a[2] || ''} ${g || ''} ${T[1]}`).includes(q);
      });
      if (!hits.length) return `<p class="hint">Nada encontrado para “${esc(query)}”.</p>`;
      return `<div class="dbg-grid">${hits.map(([id, { a, tab: t }]) =>
        btn(id, [a[0], null, `${TABS.find(x => x[0] === t)[1]}${a[2] ? ' · ' + a[2] : ''}`])).join('')}</div>`;
    }
    const T = TABS.find(x => x[0] === tab) || TABS[0];
    return T[2].map(([g, acts]) => `${g ? `<h4 class="dbg-h">${g}</h4>` : ''}<div class="dbg-grid">${
      Object.entries(acts).map(([id, a]) => btn(id, a)).join('')}</div>`).join('') + (T[0] === 'equilibrio' ? `<h4 class="dbg-h">Defesa ÷ ameaça (ondas 1–60)</h4>${balanceTable()}` : '');
  }

  function body() {
    return `<p class="hint">Conquistas e recordes continuam valendo: use um save de teste (Exportar antes ajuda). O jogo fica pausado com o menu aberto. F9 ou \` abre e fecha.</p>
      ${status()}
      ${toggles()}
      <div class="dbg-nav">
        <input type="search" id="dbg-search" placeholder="🔍 Buscar ação (ex.: muro, caixa, médico)" value="${esc(query)}" autocomplete="off">
        <div class="dbg-tabs">${TABS.map(([id, nome]) => `<button data-opt="tab:${id}" class="${!query && id === tab ? 'on' : ''}">${nome}</button>`).join('')}</div>
      </div>
      <div id="dbg-list">${listHtml()}</div>`;
  }

  let dlg = null;
  function open() {
    if (!enabled) return;
    if (dlg && dlg.open) { dlg.close(); return; }
    if (modalOpen || awaitingChoice) return;
    dlg = openDialog({
      title: '🐞 Debug',
      plain: true,
      body,
      cancel: 'Fechar',
      onOpt: (id, d) => {
        if (id.startsWith('tab:')) { tab = id.slice(4); query = ''; return; }
        if (id.startsWith('flag:')) {
          const k = id.slice(5);
          if (k === 'train') {
            if (flags.train) { stopTrain(); note('campo de treino fechado: as ondas voltam.'); }
            else if (startTrain()) d.close();
            return;
          }
          flags[k] = !flags[k];
          note(`${TOGGLES[k].nome} ${flags[k] ? `ligado (${TOGGLES[k].desc})` : 'desligado'}.`);
          return;
        }
        const x = ACTIONS[id];
        if (!x) return;
        const st = S;
        if (x.a[1](d) === true || S !== st) d.close();
      },
    });
    // busca: filtra só a lista, sem redesenhar o resto (o campo não perde o foco)
    const bodyEl = document.getElementById('dialog-body');
    bodyEl.oninput = e => {
      if (!dlg || !dlg.open || e.target.id !== 'dbg-search') return;
      query = e.target.value;
      document.getElementById('dbg-list').innerHTML = listHtml();
      bodyEl.querySelectorAll('.dbg-tabs button').forEach(b => b.classList.toggle('on', !query && b.dataset.opt === 'tab:' + tab));
    };
    const s = document.getElementById('dbg-search');
    if (s) s.focus();
  }

  function init() {
    if (!enabled) return;
    listeners.push(trainEvent);
    document.addEventListener('keydown', e => {
      if (e.key !== 'F9' && e.key !== '`') return;
      // no campo de busca do próprio menu, só F9 fecha (a crase pode ser digitada)
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName) && (e.target.id !== 'dbg-search' || e.key !== 'F9')) return;
      e.preventDefault();
      open();
    });
    const footer = document.querySelector('footer');
    if (footer) {
      const b = document.createElement('button');
      b.id = 'btn-debug';
      b.textContent = '🐞 Debug';
      b.title = 'Menu de debug (F9)';
      b.onclick = open;
      footer.appendChild(b);
    }
  }

  return { init, open, flags, dummyHit, trainTick, startTrain, stopTrain, get enabled() { return enabled; } };
})();
