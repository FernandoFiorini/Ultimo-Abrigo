'use strict';

// Tutorial guiado das duas primeiras ondas: pausa o jogo, escurece a tela, destaca onde clicar e explica o fluxo
// num balão. Aparece uma vez por navegador (ultimoAbrigo.guide); dá para desligar ou rever nas Configurações.
// Passos com `ev` esperam aquela ação (evento do jogo); passos com `done` esperam a condição; os demais têm "Próximo".
// `run: true` deixa o jogo correr durante o passo (ex.: atirar na horda).
let guidePaused = false;

const Guide = (() => {
  const KEY = 'ultimoAbrigo.guide';
  let prog = {};
  try { prog = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { /* sem armazenamento */ }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch (e) { /* sem armazenamento */ } };
  const enabled = () => Settings.get('guide') !== false && !prog.done;

  const tabOn = t => !!document.querySelector(`.tab.active[data-tab="${t}"]`);
  const canRecruit = () => !hasMod('isolados') && S.survivors < maxSurv() && S.res.comida >= recruitCost();
  const affordable = () => Object.keys(BUILD).find(k => !buildBlocked(k) && !buildLocked(k) && canAfford(buildCost(k)));
  const veteran = () => Math.max(S.best || 0, (S.meta.stats && S.meta.stats.bestWave) || 0) > 3;

  const CH = [
    { id: 'intro', tips: ['equipe', 'vasculhar'], when: () => !S.horde.active && S.wave === 1 && !S.best, steps: [
      { title: '🏚️ Bem-vindo ao abrigo', text: 'Você e mais dois sobreviventes acharam um armazém abandonado. De dia, o grupo junta recursos e se prepara; à noite, a horda ataca.<br><br>Este guia mostra o fluxo do jogo nas duas primeiras noites. <b>O jogo fica pausado</b> enquanto você lê.' },
      { at: '#resources', title: 'Recursos', text: '🥫 <b>Comida</b> alimenta o grupo e paga os recrutas. 🔩 <b>Sucata</b> constrói e conserta o muro. 🔫 <b>Munição</b> é o que os guardas atiram. 💊 <b>Remédios</b> salvam os feridos.' },
      { at: '#btn-scavenge', title: 'Vasculhe', text: 'Clique em <b>Vasculhar</b>: o líder junta comida e sucata na hora. No começo é a sua principal fonte. Atalho: <b>(V)</b>.', ev: 'scavenge' },
      { at: '#btn-recruit', title: 'Recrute', text: 'Mais gente rende mais produção e mais defesa. Clique em <b>Recrutar</b> (custa comida). Atalho: <b>(R)</b>.', ev: 'recruit', skip: () => !canRecruit() },
      { at: '.tab[data-tab="equipe"]', title: 'Aba Equipe', text: 'Cada sobrevivente precisa de uma função. Abra a aba <b>Equipe</b>.', done: () => tabOn('equipe'), skip: () => tabOn('equipe') },
      { at: '#ja-guarda', title: 'Dê uma função', text: 'Quem chegou está <b>ocioso</b>. Clique em <b>+</b> para torná-lo guarda 🛡️: guardas atiram na horda.<br><small>🌾 Forrageiros produzem comida, ⚙️ armeiros fabricam munição. O − deixa alguém ocioso de novo.</small>', ev: 'assign', skip: () => idle() <= 0 },
      { at: '#defense', title: 'A defesa', text: 'Aqui ficam o <b>cronômetro da próxima horda</b>, a vida do muro 🧱 e quantos guardas defendem. Quando o tempo zerar, os zumbis atacam.' },
      { title: 'Prepare-se', text: 'Continue vasculhando, recrutando e ajustando as funções até a horda chegar. O guia volta quando ela chegar.' },
    ] },
    { id: 'wave1', tips: ['noite'], when: () => S.horde.active && S.horde.n === 1, while: () => S.horde.active, steps: [
      { at: '#scene', title: '🧟 A horda chegou!', text: 'Mire num zumbi e <b>clique</b> para atirar com o líder. Tiro fora do zumbi erra. O jogo volta a correr para você atirar.', ev: 'shot', evOk: d => d && d.src === 'player', run: true, timeout: 25 },
      { at: '#weapon-bar', title: 'Suas armas', text: 'As armas do líder ficam aqui. Troque com <b>(Q) (W) (E)</b> e recarregue com <b>(R)</b>. A pistola não gasta a munição do abrigo.', skip: () => $('weapon-bar').classList.contains('hidden') },
      { at: '#defense', title: 'Os guardas', text: 'Os guardas 🛡️ atiram sozinhos enquanto houver munição; sem ela, jogam pedras. Fique de olho no muro: <b>se ele cair, os zumbis pegam sobreviventes</b>. Agora é com você!' },
    ] },
    { id: 'after1', tips: ['muro', 'construir'], when: () => !S.horde.active && S.wave === 2 && S.best >= 1, steps: [
      { title: '🌅 Primeira noite vencida!', text: 'Entre uma horda e outra é hora de se fortalecer: consertar, construir e aumentar o grupo. <b>Cada horda vem maior que a anterior.</b>' },
      { at: '#btn-repair', title: 'Conserte o muro', text: 'O muro levou pancada. Clique em <b>Reparar muro</b> (custa sucata). Atalho: <b>(C)</b>.', ev: 'repair', skip: () => S.wallHp >= maxWall() || S.res.sucata < REPAIR_COST },
      { at: '.tab[data-tab="construir"]', title: 'Construir', text: 'Abra a aba <b>Construir</b>.', done: () => tabOn('construir'), skip: () => tabOn('construir') },
      { at: () => '#bb-' + affordable(), title: 'Construa', text: () => `Você já pode pagar <b>${BUILD[affordable()].icon} ${BUILD[affordable()].nome}</b>. Clique em <b>Construir</b>.`, ev: 'built', skip: () => !affordable() },
      { at: '#buildings', title: 'Construções', text: 'Barracas ⛺ abrigam mais gente, o muro 🧱 aguenta mais pancada e torres 🗼 atiram sozinhas (pedem um pouco de manutenção a cada horda). Junte sucata e volte aqui sempre.' },
      { title: 'Rumo à segunda noite', text: 'Quando estiver pronto, é só esperar o cronômetro. O guia volta na próxima horda.' },
    ] },
    { id: 'wave2', when: () => S.horde.active && S.horde.n === 2, while: () => S.horde.active, steps: [
      { at: '#defense', title: '🧟 Segunda horda', text: 'Mais zumbis desta vez. <b>(Espaço)</b> pausa o jogo, e dá para mudar as funções do grupo no meio da horda. Boa caçada!' },
    ] },
    { id: 'after2', tips: ['expedicoes'], when: () => !S.horde.active && S.wave === 3 && S.best >= 2, steps: [
      { at: '.tab[data-tab="expedicoes"]', title: '🎒 Expedições', text: 'Mande sobreviventes <b>ociosos</b> atrás de suprimentos. Mais gente traz mais coisa, mas cada um corre o risco de não voltar.', skip: () => hasMod('semexp') },
      { at: '.tab[data-tab="pesquisa"]', title: '🧪 Pesquisa', text: 'Cientistas pesquisam melhorias permanentes para o abrigo: produção, defesa e, um dia, a Cura.' },
      { at: '.tab[data-tab="armas"]', title: '🔫 Armas', text: 'Compre e melhore armas para o líder. Elas ficam para sempre, mesmo depois de evacuar.' },
      { title: '✅ Tudo pronto!', text: 'Esse é o ciclo: <b>produzir de dia, defender à noite e crescer a cada horda</b>. Boa sorte, líder!<br><small>Dá para rever este guia em ⚙️ Configurações.</small>' },
    ] },
  ];

  let ch = null, i = 0, total = 0, seenN = 0, wait = 0, nextIn = 0, runT = 0, root = null, hole = null, bub = null, shown = '';
  const step = () => ch && ch.steps[i];
  const val = v => (typeof v === 'function' ? v() : v);
  const isAction = st => !!(st.ev || st.done);
  const target = st => { const sel = st && val(st.at); const el = sel && document.querySelector(sel); return el && el.getClientRects().length ? el : null; };

  function build() {
    root = document.createElement('div');
    root.id = 'guide';
    root.className = 'guide hidden';
    root.innerHTML = `<div class="g-hole"></div>
      <div class="g-bub" role="dialog" aria-live="polite">
        <i class="g-arrow"></i>
        <div class="g-head"><span class="g-count"></span><span class="g-pause">⏸ jogo pausado</span></div>
        <h4 class="g-title"></h4>
        <div class="g-text"></div>
        <div class="g-act"><button class="link" data-g="skip">Pular tutorial</button><span class="g-wait">👆 faça a ação destacada</span><button class="primary" data-g="next">Próximo ▶</button></div>
      </div>`;
    document.body.appendChild(root);
    hole = root.querySelector('.g-hole');
    bub = root.querySelector('.g-bub');
    bub.addEventListener('click', e => {
      const b = e.target.closest('[data-g]');
      if (!b) return;
      if (b.dataset.g === 'next') next();
      else skipAll();
    });
    // durante o guia, só valem cliques no que está destacado e no balão
    const block = e => {
      if (!ch || modalOpen || root.classList.contains('hidden')) return;
      if (bub.contains(e.target)) return;
      const st = step(), el = target(st);
      if ((isAction(st) || st.run) && el && el.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'click') { bub.classList.remove('nudge'); void bub.offsetWidth; bub.classList.add('nudge'); }
    };
    for (const t of ['pointerdown', 'mousedown', 'click', 'contextmenu']) document.addEventListener(t, block, true);
    document.addEventListener('keydown', e => {
      if (!ch || modalOpen || root.classList.contains('hidden')) return;
      const st = step();
      if (isAction(st) || st.run) return;   // os atalhos (V, R, C…) também cumprem a ação
      if (e.key === 'Enter' || e.key === ' ') next();
      if (e.key !== 'Escape') { e.preventDefault(); e.stopPropagation(); }
    }, true);
    listeners.push((t, d) => {
      const st = step();
      if (st && st.ev === t && (!st.evOk || st.evOk(d)) && !nextIn) nextIn = 0.35;
    });
  }

  function start(c) {
    ch = c; i = -1; seenN = 0;
    total = c.steps.filter(x => !x.skip || !x.skip()).length;
    (prog.ch = prog.ch || {})[c.id] = 1;
    persist();
    const T = S.meta.tutorial || (S.meta.tutorial = {});
    for (const id of c.tips || []) T[id] = 1;   // as dicas soltas que repetem o que o guia ensina
    next();
  }

  function next() {
    if (!ch) return;
    i++;
    nextIn = 0; runT = 0; shown = '';
    while (i < ch.steps.length && ch.steps[i].skip && ch.steps[i].skip()) i++;
    if (i >= ch.steps.length) return finish();
    const el = target(step());
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function finish() {
    if (ch && CH.every(c => (prog.ch || {})[c.id])) { prog.done = true; persist(); }
    ch = null;
    guidePaused = false;
    if (root) root.classList.add('hidden');
  }

  function skipAll() {
    prog.done = true;
    persist();
    finish();
    addLog('🎓 Tutorial guiado desligado. Dá para rever em ⚙️ Configurações.');
  }

  // retângulo do alvo cortado pelos painéis com rolagem em volta dele (só a parte que aparece)
  function visibleRect(el) {
    const r = el.getBoundingClientRect();
    let { left, top, right, bottom } = r;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (!/(auto|scroll|hidden)/.test(o.overflow + o.overflowX + o.overflowY)) continue;
      const q = p.getBoundingClientRect();
      left = Math.max(left, q.left); top = Math.max(top, q.top); right = Math.min(right, q.right); bottom = Math.min(bottom, q.bottom);
    }
    return right > left && bottom > top ? { left, top, right, bottom } : r;
  }

  // desenha o balão e o recorte em volta do alvo (todo quadro: os painéis mudam de tamanho e posição)
  function paint() {
    const st = step(), el = target(st);
    const key = i + '|' + ch.id;
    if (shown !== key) {
      shown = key;
      seenN++;
      bub.querySelector('.g-count').textContent = `🎓 Tutorial · ${seenN}/${Math.max(total, seenN)}`;
      bub.querySelector('.g-title').innerHTML = val(st.title);
      bub.querySelector('.g-text').innerHTML = val(st.text);
      bub.querySelector('[data-g="next"]').hidden = isAction(st) || !!st.run;
      bub.querySelector('[data-g="next"]').textContent = i === ch.steps.length - 1 ? 'Entendi ✓' : 'Próximo ▶';
      bub.querySelector('.g-wait').hidden = !(isAction(st) || st.run);
      bub.querySelector('.g-pause').hidden = !!st.run;
      root.classList.toggle('g-run', !!st.run);
    }
    const W = innerWidth, H = innerHeight, pad = 6, gap = 14;
    if (el) {
      const r = visibleRect(el);
      const x = Math.max(2, r.left - pad), y = Math.max(2, r.top - pad), w = Math.min(W - 4, r.right + pad) - x, h = Math.min(H - 4, r.bottom + pad) - y;
      Object.assign(hole.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      hole.classList.remove('g-none');
      const bw = bub.offsetWidth, bh = bub.offsetHeight;
      let side, bx, by;
      if (y + h + gap + bh < H - 8) { side = 'below'; by = y + h + gap; }
      else if (y - gap - bh > 8) { side = 'above'; by = y - gap - bh; }
      else if (x + w + gap + bw < W - 8) { side = 'right'; bx = x + w + gap; }
      else if (x - gap - bw > 8) { side = 'left'; bx = x - gap - bw; }
      else { side = 'inside'; by = y + 10; }
      if (side === 'below' || side === 'above' || side === 'inside') bx = Math.max(8, Math.min(W - bw - 8, x + w / 2 - bw / 2));
      else by = Math.max(8, Math.min(H - bh - 8, y + h / 2 - bh / 2));
      Object.assign(bub.style, { left: bx + 'px', top: by + 'px' });
      bub.dataset.side = side;
      const ar = bub.querySelector('.g-arrow');
      if (side === 'below' || side === 'above') { ar.style.left = Math.max(14, Math.min(bw - 14, x + w / 2 - bx)) + 'px'; ar.style.top = ''; }
      else { ar.style.top = Math.max(14, Math.min(bh - 14, y + h / 2 - by)) + 'px'; ar.style.left = ''; }
    } else {
      hole.classList.add('g-none');
      Object.assign(hole.style, { left: W / 2 + 'px', top: H / 2 + 'px', width: '0px', height: '0px' });
      bub.dataset.side = 'center';
      Object.assign(bub.style, { left: Math.max(8, (W - bub.offsetWidth) / 2) + 'px', top: Math.max(8, (H - bub.offsetHeight) / 2) + 'px' });
    }
  }

  // chamado a cada quadro, antes da simulação
  function update(dt) {
    if (typeof S === 'undefined' || !S || !Slots.ready || Slots.dead) return;
    if (!root) build();
    if (!ch) {
      guidePaused = false;
      if (!enabled() || modalOpen || awaitingChoice || veteran()) { wait = 0; return; }
      const c = CH.find(x => !(prog.ch || {})[x.id] && x.when());
      if (!c) { wait = 0; return; }
      wait += dt;
      if (wait > 0.8) { wait = 0; start(c); }
      if (!ch) return;
    }
    if (!enabled()) return finish();
    if (ch.while && !ch.while()) return finish();
    const st = step();
    if (modalOpen) { root.classList.add('hidden'); return; }
    root.classList.remove('hidden');
    guidePaused = !st.run;
    if (nextIn > 0) { nextIn -= dt; if (nextIn <= 0) { nextIn = 0; next(); if (!ch) return; } }
    else if (st.done && st.done()) nextIn = 0.25;
    else if (st.timeout && (runT += dt) > st.timeout) next();
    if (ch) paint();
  }

  // Configurações: "Rever tutorial guiado"
  function reset() {
    prog = {};
    persist();
    Settings.set('guide', true);
  }

  return { update, reset, active: () => !!ch };
})();
