'use strict';

// Menu de debug: atalhos para montar situações de teste (invasão, feridos, mordidos...) sem jogar até elas.
// Só existe com DEV_MODE = true (config.js) E rodando localmente (arquivo, localhost ou 127.0.0.1):
// mesmo que alguém publique com a flag ligada por engano, o menu não aparece no site.
// Abre com F9 ou com a tecla ` (crase), e pelo botão 🐞 no rodapé.
const Debug = (() => {
  const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  const enabled = DEV_MODE === true && local;

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const isHurt = n => S.injured.some(w => w.n === n);
  const healthy = () => S.people.filter(n => !isHurt(n));
  const note = t => addLog(`🐞 ${t}`, 'warn');

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

  // cada ação: [rótulo, função(dlg)]. Ações que devolvem true fecham o menu (para ver o efeito na cena).
  const SECTIONS = [
    ['🎬 Cenários prontos', {
      invasao: ['🧱 Invasão agora (onda atual)', () => { ensurePeople(8); wallDown(); hordeNow(); note('muro derrubado e horda começando.'); return true; }],
      invasao10: ['👹 Invasão com Abominação (onda 10)', () => { ensurePeople(10); if (!S.horde.active) S.wave = 10; wallDown(); hordeNow(); note('onda 10 com o muro caído.'); return true; }],
      mordidos: ['🦷 2 mordidos (abre a decisão)', () => { const n = bite(2); note(`${joinNames(n)} foram mordidos. Feche o menu para decidir.`); return true; }],
      feridos: ['🤕 3 feridos e 1 médico', () => { ensurePeople(6); injure(3); if (!S.jobs.medico) { if (idle() <= 0) addPeople(1); S.jobs.medico = 1; } note('3 feridos para tratar.'); }],
      transformado: ['🧟 Transformado na horda', () => { ensurePeople(4); const n = takeSomeone(); if (n) S.turned.push(n); hordeNow(); note(`${n} volta transformado nesta horda.`); return true; }],
      cura: ['🌅 Liberado volta curado em 5s', () => { ensurePeople(3); const n = takeSomeone(); if (n) S.returning.push({ n, t: 5 }); note(`${n} saiu e volta curado em 5s (só fora da horda).`); return true; }],
    }],
    ['🧱 Muro e horda', {
      derrubar: ['Derrubar o muro', () => { wallDown(); note('muro derrubado.'); }],
      consertar: ['Consertar o muro', () => { S.wallHp = maxWall(); S.wallDown = false; S.overflow = 0; note('muro restaurado.'); }],
      horda: ['Começar a horda agora', () => { hordeNow(); return true; }],
      fim: ['Encerrar a horda (some com os zumbis)', () => { if (S.horde.active) { S.horde.queue = []; S.horde.zs = []; } return true; }],
      ondaMenos: ['Onda −1', () => { if (!S.horde.active) S.wave = Math.max(1, S.wave - 1); }],
      ondaMais: ['Onda +1', () => { if (!S.horde.active) S.wave++; }],
      ondaMais5: ['Onda +5', () => { if (!S.horde.active) S.wave += 5; }],
    }],
    ['🧍 Pessoas', {
      mais1: ['+1 sobrevivente', () => addPeople(1)],
      mais5: ['+5 sobreviventes', () => addPeople(5)],
      ferir: ['Ferir 1 pessoa', () => injure(1)],
      morder: ['Morder 1 pessoa', () => { bite(1); }],
      medico: ['+1 médico', () => { if (idle() <= 0) addPeople(1); S.jobs.medico++; }],
      semMedico: ['Tirar todos os médicos', () => { S.jobs.medico = 0; }],
      curar: ['Curar todos os feridos', () => { S.injured = []; S.injT = 0; }],
      piorar: ['Ferido sem médico piora agora', () => { if (S.injured.length > treating()) S.injT = WOUND_TIME - 0.05; }],
      luto: ['Começar luto', () => { S.mourn = Math.min(MOURN_TIME * 2, S.mourn + MOURN_TIME); }],
      semLuto: ['Encerrar luto', () => { S.mourn = 0.01; }],
    }],
    ['📦 Recursos e tempo', {
      tudo: ['+500 de tudo', () => { for (const r in S.res) S.res[r] += r === 'remedio' ? 20 : 500; }],
      semRemedio: ['Zerar remédios', () => { S.res.remedio = 0; }],
      municao: ['Zerar munição', () => { S.res.municao = 0; }],
      avancar: ['Avançar 60s (como offline)', () => { simulate(60); }],
    }],
  ];
  const ACTIONS = Object.assign({}, ...SECTIONS.map(s => s[1]));

  function status() {
    const H = S.horde, row = (k, v) => `<div><span class="dbg-k">${k}</span> ${v}</div>`;
    const list = a => a.length ? a.join(', ') : '—';
    return `<div class="dbg-status">
      ${row('Onda', H.active ? `${H.n} (horda ativa: ${H.queue.length + H.zs.length} zumbis, ${H.zs.filter(z => z.state === 'invade').length} dentro)` : `${S.wave} · horda em ${Math.ceil(S.waveTimer)}s`)}
      ${row('Muro', `${Math.round(S.wallHp)} / ${maxWall()}${S.wallDown ? ' · <b class="bad-text">CAÍDO</b>' : ''}`)}
      ${row('Grupo', `${S.survivors} / ${maxSurv()} · ${idle()} ociosos · ${S.jobs.guarda} guardas · ${S.jobs.medico} médicos`)}
      ${row('Feridos', list(S.injured.map(w => `${w.n} (${Math.ceil(w.t)}s)`)) + (S.injured.length > treating() ? ` · piora em ${Math.ceil(WOUND_TIME - S.injT)}s` : ''))}
      ${row('Mordidos', list(S.bitten))}
      ${row('Transformados', list(S.turned))}
      ${row('Voltando curados', list(S.returning.map(r => `${r.n} (${Math.ceil(r.t)}s)`)))}
      ${row('Luto', S.mourn > 0 ? fmtTime(S.mourn) : '—')} ${row('Remédios', fmt(S.res.remedio))}
    </div>`;
  }

  let dlg = null;
  function open() {
    if (!enabled) return;
    if (dlg && dlg.open) { dlg.close(); return; }
    if (modalOpen || awaitingChoice) return;
    dlg = openDialog({
      title: '🐞 Debug',
      plain: true,
      body: () => `<p class="hint">Atalhos de teste. Conquistas e recordes continuam valendo: use um save de teste (Exportar antes ajuda). O jogo fica pausado com o menu aberto. F9 ou \` abre e fecha.</p>
        ${status()}
        ${SECTIONS.map(([t, acts]) => `<h4 class="dbg-h">${t}</h4><div class="dbg-grid">${
          Object.entries(acts).map(([id, [label]]) => `<button data-opt="${id}">${label}</button>`).join('')}</div>`).join('')}`,
      cancel: 'Fechar',
      onOpt: (id, d) => {
        const a = ACTIONS[id];
        if (!a) return;
        const st = S;
        if (a[1](d) === true || S !== st) d.close();
      },
    });
  }

  function init() {
    if (!enabled) return;
    document.addEventListener('keydown', e => {
      if (e.key !== 'F9' && e.key !== '`') return;
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
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

  return { init, open, get enabled() { return enabled; } };
})();
