'use strict';

const $ = id => document.getElementById(id);
let logDirty = true;
let curTab = 'equipe';   // aba aberta no painel da direita

function fmt(n) {
  const a = Math.abs(n);
  if (a < 10) return (Math.round(n * 10) / 10).toLocaleString('pt-BR');
  if (a < 1000) return Math.floor(n).toString();
  const u = ['k', 'M', 'B', 'T'];
  let i = -1, v = n;
  while (Math.abs(v) >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  return v.toFixed(1).replace('.', ',') + u[i];
}
// valor exato (17.234.512), para mostrar ao passar o mouse sobre um número abreviado
const exact = n => Math.round(n).toLocaleString('pt-BR');
// número abreviado como nos recursos (17,2M) com o valor exato no title
const num = n => `<span title="${exact(n)}">${fmt(n)}</span>`;
function fmtClock(s) {
  s = Math.ceil(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
function fmtRate(n) { return (n >= 0 ? '+' : '') + (Math.round(n * 100) / 100).toLocaleString('pt-BR') + '/s'; }
function fmtTime(s) {
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  if (h) return `${h}h ${m}min`;
  if (m) return `${m}min ${ss}s`;
  return `${ss}s`;
}
function costHtml(c) {
  return Object.entries(c).map(([r, v]) =>
    `<span class="${S.res[r] < v ? 'missing' : ''}" title="${RES[r].nome}: ${exact(v)}">${RES[r].icon} ${fmt(v)}</span>`).join(' ');
}

function buildUI() {
  $('resources').innerHTML = Object.entries(RES).map(([k, r]) =>
    `<div class="res" title="${r.nome}">${r.icon} <span class="val" id="r-${k}"></span><span class="rate" id="rr-${k}"></span></div>`).join('') +
    `<div class="res hope" title="Esperança (prestígio)">✨ <span class="val" id="r-hope"></span><span class="rate" id="rr-hope"></span></div>` +
    `<div id="boosts" class="boosts"></div>`;

  $('achievements').innerHTML = ACH.map(a => `
    <div class="row ach" id="ar-${a.id}">
      <div class="ach-icon">${a.icon}</div>
      <div class="main">
        <div class="title">${a.nome}</div>
        <div class="desc">${a.desc}</div>
        <div class="bar mini"><div id="ap-${a.id}"></div></div>
        <div class="desc" id="at-${a.id}"></div>
      </div>
      <button class="cashbtn" data-act="claim" data-k="${a.id}" id="ab-${a.id}"></button>
    </div>`).join('');

  $('shop').innerHTML = Object.entries(SHOP).map(([k, it]) => `
    <div class="row"${Demos.attr('shop:' + k)}>
      <div class="main">
        <div class="title">${it.icon} ${it.nome}</div>
        <div class="desc">${it.desc}</div>
        <div class="desc now" id="sn-${k}"></div>
      </div>
      <button class="cashbtn" data-act="shop" data-k="${k}" id="sb-${k}">💵 ${it.cost}</button>
    </div>`).join('');

  $('jobs').innerHTML = Object.entries(JOBS).map(([k, j]) => `
    <div class="row" id="jr-${k}">
      <div class="main"><div class="title">${j.icon} ${j.nome}</div><div class="desc">${j.desc}</div></div>
      <button class="small" data-act="jobSub" data-k="${k}" id="js-${k}">−</button>
      <span class="count" id="jc-${k}"></span>
      <button class="small" data-act="jobAdd" data-k="${k}" id="ja-${k}">+</button>
    </div>`).join('');

  // a descrição fixa (.base) some depois de construir: aí fica só o "Atual" (a descrição vai para o title)
  $('buildings').innerHTML = Object.entries(BUILD).map(([k, b]) => `
    <div class="row" id="br-${k}">
      <div class="main">
        <div class="title" title="${b.desc}">${b.icon} ${b.nome}<span class="lvl" id="bl-${k}"></span></div>
        <div class="desc base">${b.desc}</div>
        <div class="desc now" id="bn-${k}"></div>
        <div class="cost" id="bc-${k}"></div>
      </div>
      <button data-act="build" data-k="${k}" id="bb-${k}">Construir</button>
    </div>`).join('');

  $('expeditions').innerHTML = Object.entries(EXPED).map(([k, e]) => `
    <div class="row" id="er-${k}">
      <div class="main">
        <div class="title">${e.icon} ${e.nome}</div>
        <div class="desc" id="ed-${k}"></div>
      </div>
      <button class="small" data-act="expSub" data-k="${k}" id="es-${k}">−</button>
      <span class="count" id="en-${k}"></span>
      <button class="small" data-act="expAdd" data-k="${k}" id="ea-${k}">+</button>
      <button data-act="expGo" data-k="${k}" id="eg-${k}">Enviar</button>
    </div>`).join('');

  Endgame.buildUI();
  Weapons.buildUI();
  Champions.buildUI();
  if (typeof lockWhilePaused === 'function') lockWhilePaused();

  $('perks').innerHTML = Object.entries(PERKS).map(([k, p]) => `
    <div class="row" id="pr-${k}">
      <div class="main">
        <div class="title" title="${p.desc}">${p.icon} ${p.nome}<span class="lvl" id="pl-${k}"></span></div>
        <div class="desc base">${p.desc}</div>
        <div class="desc now" id="pn-${k}"></div>
      </div>
      <button data-act="perk" data-k="${k}" id="pb-${k}"></button>
    </div>`).join('');

  highlight(document.querySelector('.panes'), '.hint, .row .desc:not(.now), .row .title');

  document.body.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (btn && btn.dataset.act) { actions[btn.dataset.act](btn.dataset.k); render(); }
  });
  const TAB_KEY = 'ultimoAbrigo.tab';
  const showTab = name => {
    if (!Unlocks.tab(name)) name = 'equipe';
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('[data-hub]').forEach(b => b.classList.toggle('active', b.dataset.hub === name));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
    Unlocks.seenTab(name);
    curTab = name;
    try { localStorage.setItem(TAB_KEY, name); } catch (e) { /* sem armazenamento */ }
  };
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  // Conquistas e Loja: botões do topo que abrem o painel ao lado (clicar de novo volta para a aba anterior)
  let backTab = 'equipe';
  document.querySelectorAll('[data-hub]').forEach(b => b.addEventListener('click', () => {
    if (curTab === b.dataset.hub) { showTab(backTab); return; }
    if (curTab !== 'conquistas' && curTab !== 'loja') backTab = curTab;
    showTab(b.dataset.hub);
  }));
  let firstTab = 'equipe';
  try { firstTab = localStorage.getItem(TAB_KEY) || 'equipe'; } catch (e) { /* sem armazenamento */ }
  showTab(document.querySelector(`.tab[data-tab="${firstTab}"]`) ? firstTab : 'equipe');

  // sub-abas (Exército e Loja): cada grupo troca só os painéis da própria aba e lembra a última escolhida
  const subGroups = {};
  document.querySelectorAll('nav.subtabs').forEach(nav => {
    const pane = nav.closest('.pane'), key = 'ultimoAbrigo.sub.' + nav.id;
    const show = name => {
      nav.querySelectorAll('.subtab').forEach(t => t.classList.toggle('active', t.dataset.sub === name));
      pane.querySelectorAll('.subpane').forEach(p => p.classList.toggle('active', p.dataset.subpane === name));
      try { localStorage.setItem(key, name); } catch (e) { /* sem armazenamento */ }
    };
    nav.querySelectorAll('.subtab').forEach(t => t.addEventListener('click', () => show(t.dataset.sub)));
    const first = nav.querySelector('.subtab').dataset.sub;
    let saved = first;
    try { saved = localStorage.getItem(key) || (nav.id === 'army-tabs' && localStorage.getItem('ultimoAbrigo.armyTab')) || first; } catch (e) { /* sem armazenamento */ }
    show(nav.querySelector(`.subtab[data-sub="${saved}"]`) ? saved : first);
    subGroups[nav.id] = show;
  });
  window.openArmy = sub => { openTab('herois'); subGroups['army-tabs'](sub); };
  window.openShop = sub => { openTab('loja'); subGroups['shop-tabs'](sub); };
  window.openCity = sub => { openTab('cidade'); subGroups['city-tabs'](sub); };
  window.citySub = sub => subGroups['city-tabs'](sub);

  $('btn-scavenge').title = `O líder vasculha as ruínas por conta própria. Rende mais conforme sua produção e a onda aumentam. Cada vez gasta 1 carga de fôlego (até ${SCAV_CHARGES}); uma carga volta a cada ${SCAV_REGEN}s.`;
  $('btn-scavenge').onclick = () => { if (paused) return; const g = actions.scavenge(); if (g) Scene.float(g); render(); };
  $('btn-recruit').onclick = () => { actions.recruit(); render(); };
  $('btn-repair').onclick = () => { actions.repair(); render(); };
  // salvar na mão: confirma com um toast curto
  $('btn-save').onclick = () => {
    const ok = save();
    toast(ok
      ? { icon: '💾', label: 'Progresso', name: 'Jogo salvo', desc: `Espaço ${Slots.cur} · ${new Date().toLocaleTimeString('pt-BR')}`, time: 2500 }
      : { icon: '⚠️', label: 'Progresso', name: 'Não foi possível salvar', desc: 'O armazenamento do navegador está cheio ou bloqueado.', time: 4000 });
  };
  $('btn-export').onclick = showExport;
  $('btn-import').onclick = () => showImport();   // sem o evento como argumento (o 1º parâmetro é o espaço)
  $('btn-keys').onclick = showShortcuts;
  $('btn-settings').onclick = openSettings;
  $('btn-locker').onclick = () => showLocker('armas');
  $('btn-codex').onclick = () => Codex.open();
  actions.lwSkin = k => showLocker('armas', k);
  $('btn-speed').onclick = () => { Settings.set('speed2x', !Settings.get('speed2x')); render(); };
  applyBodyPrefs();
  Settings.on(k => { if (k === 'colorblind') applyBodyPrefs(); });
  $('btn-merchant').onclick = () => Events.openMerchant();
  $('pause-badge').onclick = () => togglePause(false);
  setupKeys();
  Tutorial.setup();
  listeners.push((t, d) => { if (t === 'waveEnd' && d.n === EVAC_WAVE) heliPrompt(); });
  $('btn-menu').onclick = () => Slots.toMenu();
  $('btn-bug').onclick = () => BugReport.open();
}

// Abas: só as liberadas aparecem, numeradas na ordem (atalhos 1, 2, 3...); aba nova brilha até ser aberta
let tabSig = '';
function renderTabs() {
  Unlocks.check();
  const tabs = [...document.querySelectorAll('.side > .tabs .tab:not(.hub-tab)')];
  const open = tabs.map(t => Unlocks.tab(t.dataset.tab));
  const sig = open.join() + '|' + tabs.map(t => Unlocks.isNew(t.dataset.tab)).join() + '|' + Unlocks.tab('distritos');
  if (sig === tabSig) return;
  tabSig = sig;
  let n = 0;
  tabs.forEach((t, i) => {
    t.hidden = !open[i];
    t.classList.toggle('is-new', open[i] && Unlocks.isNew(t.dataset.tab));
    t.querySelector('.hk').textContent = open[i] ? `(${++n})` : '';
    // o nome aparece ao passar o mouse (no modo compacto ele some da aba)
    t.title = open[i] ? `${t.querySelector('.tab-name').textContent} (${n})` : '';
  });
  // a partir da 5ª aba: todas numa linha só, com ícone e contador (sem o nome)
  const nav = document.querySelector('.side > .tabs');
  nav.classList.toggle('compact', n > 4);
  nav.style.setProperty('--tabs', Math.max(4, n));
  // sub-aba de distritos (aba Cidade) só a partir da onda dela
  const dist = document.querySelector('#city-tabs .subtab[data-sub="mapa"]');
  if (dist) {
    dist.hidden = !Unlocks.tab('distritos');
    // com uma sub-aba só, a barra some (parecia um botão de ação)
    dist.parentElement.hidden = dist.hidden;
    if (dist.hidden && dist.classList.contains('active') && window.citySub) citySub('exp');
  }
  // a aba aberta foi escondida (não deveria acontecer, mas por garantia)
  const act = document.querySelector('.side > .tabs .tab.active');
  if (act && act.hidden && !act.classList.contains('hub-tab')) openTab('equipe');
}

// Fim da onda 10: o helicóptero chegou. Explica o que a evacuação dá e por que ela é o caminho (uma vez por cidade).
function heliPrompt() {
  if (S.heliShown || !hopeGain()) return;
  S.heliShown = true;
  const g = hopeGain(), now = hopePct(), after = hopePct(S.meta.hopeTotal + g);
  const cureNext = Endgame.CURE[Math.min(S.meta.cureStage || 0, Endgame.CURE.length - 1)];
  openDialog({
    title: '🚁 O helicóptero chegou!',
    body: `<p class="event-text">Um helicóptero respondeu ao rádio e pode levar o grupo para a <b>cidade ${S.meta.city + 1}</b>.</p>
      <div class="stat"><span>✨ Esperança ao evacuar agora</span><span><b>+${g}</b></span></div>
      <div class="stat"><span>Bônus de produção permanente</span><span>+${now}% → <b>+${after}%</b></span></div>
      <p class="hint">A Esperança também compra melhorias permanentes na aba Evacuar. Quanto mais longe você for nesta cidade, mais Esperança leva.</p>
      <p class="hint warn-text">☣️ A partir de agora a cidade vai sendo tomada: cada onda deixa os zumbis ${Math.round(SIEGE_HP * 100)}% mais resistentes.</p>
      ${!S.meta.cured ? `<p class="hint">🧬 A Cura só avança em cidades novas: a próxima etapa (${cureNext.nome}) exige a cidade ${cureNext.city}.</p>` : ''}
      <p class="hint">Evacuar recomeça do zero (grupo, recursos e construções). Ficam: Esperança, pesquisa, amostras, armas do líder, heróis e cash.</p>`,
    buttons: [{ label: '🚁 Evacuar agora', cls: 'primary', onClick: () => evacuate() }],
    cancel: 'Ficar mais um pouco',
  });
}

// "🔒 Em breve: ..." no fim de uma lista, no lugar das linhas travadas
function lockedSum(el, items, what) {
  if (!el) return;
  el.classList.toggle('hidden', !items.length);
  if (!items.length) return;
  const byWave = {};
  for (const it of items) (byWave[it.n] = byWave[it.n] || []).push(it);
  setHtml(el, `🔒 ${what}: ` + Object.keys(byWave).sort((a, b) => a - b)
    .map(n => `<span title="${byWave[n].map(i => i.nome).join(', ')}">${byWave[n].map(i => i.icon).join(' ')} onda ${n}</span>`).join(' · '));
}

function render() {
  renderTabs();
  // aba Evacuar pulsa em dourado enquanto houver Esperança para levar
  const evTab = document.querySelector('.tab[data-tab="evacuacao"]');
  if (evTab) evTab.classList.toggle('evac-ready', hopeGain() > 0 && !evTab.classList.contains('is-new'));
  // bolinhas de novidade nos botões do topo
  for (const [id, on] of [['btn-codex', Codex.hasNew()], ['btn-locker', typeof lockerNew === 'function' && lockerNew()]]) {
    const b = $(id);
    if (b.classList.contains('has-new') !== on) { b.classList.toggle('has-new', on); b.querySelector('.hub-dot').hidden = !on; }
  }
  const r = rates();
  const left = timeLeft(r);
  for (const k in RES) {
    $('r-' + k).textContent = fmt(S.res[k]);
    const el = $('rr-' + k);
    el.textContent = fmtRate(r[k]) + (left[k] != null && left[k] < 300 ? ` · ${fmtClock(left[k])}` : '');
    el.className = 'rate ' + (r[k] > 0.001 ? 'pos' : r[k] < -0.001 ? 'neg' : '');
    el.parentNode.classList.toggle('danger', left[k] != null && left[k] < 60);
    el.parentNode.title = `${RES[k].nome}: ${exact(S.res[k])}` + (left[k] != null ? ` (acaba em ~${fmtTime(left[k])} no ritmo atual)` : '');
  }
  $('r-hope').textContent = S.meta.hope;
  $('diff-chip').textContent = `${D().icon} ${D().nome}` + (S.mods.length ? ' · ' + S.mods.map(k => MODS[k].icon).join('') : '');
  $('diff-chip').title = 'Dificuldade deste save (escolhida ao começar um novo jogo, não muda depois)' + (S.mods.length ? '\nDesafios: ' + S.mods.map(k => MODS[k].nome).join(', ') : '');
  $('pause-badge').classList.toggle('hidden', !paused);
  if (typeof pauseTick === 'function') pauseTick();
  const fast = Settings.get('speed2x'), sp = $('btn-speed');
  sp.classList.toggle('active', fast);
  setHtml(sp, (fast ? (S.horde.active ? '⏩ 2x · pausado na horda' : '⏩ 2x ligado') : '⏩ 2x') + ' ' + hk('F'));
  sp.title = 'Acelera o dia. Na horda o jogo volta ao normal.';
  const mc = $('btn-merchant');
  mc.classList.toggle('hidden', !S.merchant);
  if (S.merchant) setHtml(mc, `🛒 Comerciante · ${Math.ceil(S.merchant.t)}s ${hk('O')}`);
  $('diff-chip').style.setProperty('--c', D().color);
  // o cash fica no selo do botão 🛒 Loja, no topo
  $('btn-shop').title = `Loja: cash e skins (0) · você tem 💵 ${S.meta.cash} de cash e 🏷️ ${(S.meta.champ && S.meta.champ.caps) || 0} Tampinhas`;
  const B = S.meta.boosts;
  $('boosts').innerHTML =
    (B.prod > 0 ? `<span class="boost prod">⚡ 2x ${fmtClock(B.prod)}</span>` : '') +
    (B.furia > 0 ? `<span class="boost furia">🔥 Fúria ${fmtClock(B.furia)}</span>` : '');

  $('shop-cash').textContent = S.meta.cash;
  $('shop-caps').textContent = fmt((S.meta.champ && S.meta.champ.caps) || 0);
  for (const k in SHOP) {
    const block = shopBlock(k);
    $('sb-' + k).disabled = !!block;
    $('sb-' + k).title = block;
    let now = '';
    if (SHOP[k].secs) {
      const g = timeGain(SHOP[k].secs);
      now = 'Você receberia: ' + (Object.keys(g).filter(r => g[r] >= 1).map(r => nbsp(`+${fmt(g[r])} ${RES[r].icon}`)).join(' ') || 'nada (sem produção)');
    } else if (k === 'prod2x' && B.prod > 0) now = `Ativo: ${fmtClock(B.prod)} restantes`;
    else if (k === 'furia' && B.furia > 0) now = `Ativo: ${fmtClock(B.furia)} restantes`;
    else if (block && block !== 'Cash insuficiente') now = block;
    $('sn-' + k).textContent = now;
  }
  $('rr-hope').textContent = S.meta.hopeTotal ? `+${hopePct()}% prod.` : '';

  let info = keepSegs(`<b>${S.survivors}</b> / ${maxSurv()} sobreviventes`) + '<br>' + keepSegs(`${idle() > 0 ? `<b class="idle-warn">${idle()} ocioso(s): dê uma função</b>` : '<b>0</b> ociosos'}`);
  if (away()) info += ` · <b>${away()}</b> em expedição`;
  if (Endgame.tl('autofuncao')) info += heldIdle() > 0
    ? `<br>📋 Distribuição automática: os ${heldIdle()} ocioso(s) que você liberou ficam parados até você dar uma função`
    : `<br>📋 Distribuição automática ativa: quem chega recebe uma função sozinho`;
  if (hurt()) info += ` · <b>${hurt()}</b> ferido(s)` + (treating() ? ` (${treating()} em tratamento)` : '');
  info += `<br>Consumo: ${fmt(home() * foodPer())} comida/s`;
  info += alertsHtml(r, left);
  $('surv-info').innerHTML = info;
  renderPeople();

  const sg = scavGain(), night = nightLocked();
  // cargas: bolinhas cheias/vazias e uma barra no pé do botão enchendo até a próxima
  const sc = Math.floor(S.scav ?? scavMax()), sm = scavMax();
  const pips = `<span class="scav-pips" title="Fôlego do líder: ${sc}/${sm} cargas. Volta 1 a cada ${scavRegen()}s.">${'<i class="on"></i>'.repeat(sc)}${'<i></i>'.repeat(Math.max(0, sm - sc))}</span>`;
  setHtml($('btn-scavenge'), (night ? '🌙 Vasculhar: só de dia'
    : sc < 1 ? `😮‍💨 Sem fôlego…${pips}`
    : `🔍 Vasculhar · ${nbsp(`+${fmt(sg.comida)} 🥫 +${fmt(sg.sucata)} 🔩`)}${pips}`) + ' ' + hk('V'));
  $('btn-scavenge').disabled = night || sc < 1;
  $('btn-scavenge').style.setProperty('--scav', sc >= sm ? '0%' : `${Math.min(100, (S.scavT || 0) / scavRegen() * 100)}%`);

  const rc = recruitCost(), why = recruitBlock(), cap = D().recruitDay;
  const capTxt = cap ? ` · ${recruitLeft()}/${cap} hoje` : '';
  setHtml($('btn-recruit'), ({
    iso: '📵 Isolados: sem recrutamento',
    full: '🧍 Lotado · construa barracas',
    night: '🌙 Recrutar: só de dia',
    cap: '🧍 Recrutas de hoje esgotados',
  }[why] || `🧍 Recrutar · ${RES.comida.icon} ${fmt(rc)}${capTxt}`) + ' ' + hk('R'));
  $('btn-recruit').disabled = !!why;
  $('btn-recruit').title = why === 'iso' || why === 'full' ? ''
    : why === 'night' ? `No ${D().nome}, só dá para recrutar de dia, entre as hordas.`
    : why === 'cap' ? `No ${D().nome}, dá para recrutar ${cap} pessoa(s) por dia. Volta depois da próxima horda.`
    : `Recrutar custa ${exact(rc)} de comida (você tem ${exact(S.res.comida)})` + (cap ? `. No ${D().nome}, até ${cap} por dia (faltam ${recruitLeft()}).` : '');

  const ji = $('jobs-idle'), nIdle = Math.max(0, idle());
  ji.classList.toggle('has', nIdle > 0);
  setHtml(ji, `<span>${nIdle > 0 ? 'Use + para dar uma função' : 'Use − para liberar alguém'}</span>` +
    `<b>🪑 ${nIdle} ocioso${nIdle === 1 ? '' : 's'}</b>` + (hurt() ? ` <small>· 🤕 ${hurt()} ferido${hurt() === 1 ? '' : 's'}</small>` : ''));
  // funções ainda travadas somem (a não ser que alguém já esteja nela) e viram uma linha "Em breve"
  for (const k in JOBS) $('jr-' + k).classList.toggle('hidden', !Unlocks.job(k) && !S.jobs[k]);
  lockedSum($('jobs-next'), Unlocks.nextJobs().map(({ k, n }) => ({ n, icon: JOBS[k].icon, nome: JOBS[k].nome })), 'Novas funções');
  for (const k in JOBS) {
    $('jc-' + k).textContent = S.jobs[k];
    $('ja-' + k).disabled = idle() <= 0;
    $('js-' + k).disabled = S.jobs[k] <= 0;
    $('js-' + k).title = S.jobs[k] <= 0 ? 'Ninguém nesta função' : 'Tirar uma pessoa desta função (fica ociosa)';
    $('ja-' + k).title = idle() > 0 ? 'Colocar um ocioso nesta função' : 'Sem ociosos: tire alguém de outra função, recrute ou espere os feridos se recuperarem';
  }

  // construções travadas (ou bloqueadas por desafio) saem da lista
  const lockedB = [];
  for (const k in BUILD) {
    const off = buildLocked(k) || buildBlocked(k);
    $('br-' + k).classList.toggle('hidden', off);
    $('br-' + k).classList.toggle('built', !!S.build[k]);
    if (buildLocked(k) && !buildBlocked(k)) lockedB.push({ n: BUILD[k].unlock, icon: BUILD[k].icon, nome: BUILD[k].nome });
  }
  lockedSum($('build-next'), lockedB, 'Novas construções');
  for (const k in BUILD) {
    const c = buildCost(k);
    $('bl-' + k).textContent = S.build[k] ? ` nv. ${S.build[k]}` : '';
    $('bn-' + k).textContent = S.build[k] ? `Atual: ${BUILD_FX[k](S.build[k])}` : '';
    const blocked = buildBlocked(k), locked = buildLocked(k);
    $('bb-' + k).textContent = blocked ? '🚫 Bloqueado' : locked ? `🔒 Onda ${BUILD[k].unlock}` : S.build[k] ? `Melhorar para nv. ${S.build[k] + 1}` : 'Construir';
    $('bb-' + k).title = blocked ? 'Desafio "Sem torres" ativo nesta cidade' : locked ? `Libera quando a horda ${BUILD[k].unlock} estiver chegando` : '';
    $('bc-' + k).innerHTML = blocked || locked ? '' : costHtml(c);
    $('bb-' + k).disabled = blocked || locked || !canAfford(c);
  }

  const H = S.horde;
  const wallPct = S.wallHp / maxWall() * 100;
  const top = H.train
    ? `<div class="stat alert"><span>🎯 CAMPO DE TREINO (debug)</span><span>ondas pausadas</span></div>`
    : H.active
    ? (() => {
      const left = H.queue.length + H.zs.length + (H.rush ? H.rush.length : 0);
      const human = H.zs.some(z => ZTYPES[z.type].human) || (H.queue[0] && ZTYPES[H.queue[0]].human);
      return `<div class="wave-head alert"><span class="wh-lbl">${human ? '🏴‍☠️' : '🧟'} HORDA ATACANDO · onda ${H.n}</span><span class="wh-big">${left}<small>restantes</small></span></div>
       <div class="bar wave big"><div style="width:${Math.max(0, 1 - left / Math.max(1, waveSize(H.n))) * 100}%"></div></div>`;
    })()
    : `<div class="wave-head${S.waveTimer <= 10 ? ' soon' : ''}"><span class="wh-lbl">☀️ Próxima horda · onda ${S.wave}</span><span class="wh-big">${Math.ceil(S.waveTimer)}<small>s</small></span></div>
       <div class="bar wave big"><div style="width:${(1 - S.waveTimer / waveInterval()) * 100}%"></div></div>
       <div class="stat"><span>Zumbis esperados</span><span>${num(waveSize(S.wave))}${bossCount(S.wave) ? ` + 👹 ${bossCount(S.wave) > 1 ? `${bossCount(S.wave)} chefes` : 'chefe'}` : ''}</span></div>`;
  // depois da onda 10, a cidade vai sendo tomada (zumbis mais resistentes a cada onda)
  const siegeN = H.active ? H.n : S.wave;
  const siege = siegeMult(siegeN) > 1 ? `<div class="stat warn" title="Depois da onda ${SIEGE_WAVE}, cada onda nesta cidade deixa os zumbis ${Math.round(SIEGE_HP * 100)}% mais resistentes (somando). Evacuar recomeça numa cidade nova."><span class="warn-text">☣️ Cidade sendo tomada</span><span class="warn-text">zumbis +${Math.round((siegeMult(siegeN) - 1) * 100)}% de vida</span></div>` : '';
  $('defense').innerHTML = top + siege + `
    <div class="stat"><span>🧱 Muro</span><span title="${exact(Math.ceil(S.wallHp))} / ${exact(maxWall())}">${fmt(Math.ceil(S.wallHp))} / ${fmt(maxWall())}</span></div>
    <div class="bar ${wallPct < 30 ? 'low' : ''}"><div style="width:${wallPct}%"></div></div>
    ${(() => {
      const towers = Object.keys(TOWERS).filter(k => S.build[k]), score = `<div class="stat"><span>☠ Abates · 🏆 Recorde</span><span>${keepSegs(`${fmt(S.kills)} · onda ${S.best}`)}</span></div>`;
      // antes dos guardas e das torres, a defesa é só o líder
      if (!S.jobs.guarda && !towers.length) return `<div class="stat"><span>🎯 ${Unlocks.job('guarda') ? 'Sem guardas: só você defende' : 'Por enquanto, a defesa é você'}</span></div>${score}`;
      const parts = [S.jobs.guarda ? `${S.jobs.guarda} guarda${S.jobs.guarda > 1 ? 's' : ''}` : '', towers.length ? `${towers.map(k => `${BUILD[k].icon}${towerStat(k).crew}`).join(' ')} nas torres` : ''].filter(Boolean);
      const acc = [S.jobs.guarda ? `guardas ${Math.round(accuracy('guard') * 100)}%` : '', towers.length ? `torres ${Math.round(accuracy('tower') * 100)}%` : ''].filter(Boolean);
      return `<div class="stat"><span>🛡️ Defesa</span><span>${keepSegs(parts.join(' · '))}</span></div>${score}
        <div class="stat" title="Chance de acerto. Melhora com Treinamento de tiro, a pesquisa Miras ópticas, o talento Boa mira e o herói Atirador. Tiro errado também gasta munição."><span>🎯 Precisão</span><span>${keepSegs(acc.join(' · '))}</span></div>`;
    })()}
    ${S.jobs.guarda ? `<div class="stat" title="Cada tiro cansa os guardas; entre as hordas eles descansam. Cansados, atiram mais devagar e erram mais. Ajudam: mais guardas (o cansaço se divide), o Alojamento e a pesquisa Turnos de vigia."><span>😓 Cansaço dos guardas</span><span class="${S.fatigue > 0.5 ? 'warn-text' : ''}">${Math.round((S.fatigue || 0) * 100)}% · cadência ${Math.round(guardFire() * 100)}%</span></div>` : ''}
    ${towerLevels() ? (() => {
      const up = upkeepTotal(), bad = S.horde.active ? (S.horde.unpaid || []).length > 0 : !canAfford(up);
      return `<div class="stat" title="Cobrada no começo de cada horda. Torre sem manutenção atira na metade da velocidade naquela horda."><span>🔧 Manutenção das torres</span><span class="${bad ? 'warn-text' : ''}">${S.horde.active && bad ? 'não paga: torres mais lentas' : nbsp(Object.entries(up).map(([r, v]) => `${fmt(v)} ${RES[r].icon}`).join(' + ') + ' por horda')}</span></div>`;
    })() : ''}`;

  setHtml($('btn-repair'), `🔨 Reparar muro · ${RES.sucata.icon} ${fmt(REPAIR_COST)} ${hk('C')}`);
  $('btn-repair').disabled = S.res.sucata < REPAIR_COST || S.wallHp >= maxWall();
  $('btn-repair').title = `Custa ${exact(REPAIR_COST)} de sucata e recupera ${exact(Math.round(REPAIR_AMOUNT * (1 + Endgame.ab('repair'))))} de resistência. Muro: ${exact(Math.ceil(S.wallHp))} / ${exact(maxWall())}`;

  const scale = expLootScale();
  const sieged = hasMod('semexp');
  const lockedE = [];
  for (const k in EXPED) {
    const L = EXPED[k], early = S.best + 1 < L.unlock, locked = sieged || early, n = expSel[k];
    $('er-' + k).classList.toggle('locked', locked);
    $('er-' + k).classList.toggle('hidden', early && !sieged);
    if (early && !sieged) lockedE.push({ n: L.unlock, icon: L.icon, nome: L.nome });
    $('en-' + k).textContent = n;
    if (sieged) {
      $('ed-' + k).textContent = '⛔ Cidade sitiada: expedições bloqueadas por um desafio';
    } else if (locked) {
      $('ed-' + k).textContent = `🔒 Desbloqueia ao chegar na onda ${L.unlock}`;
    } else {
      const loot = Object.entries(L.loot).map(([r, [a, b]]) =>
        `${RES[r].icon} ${fmt(a * n * scale)}–${fmt(b * n * scale)}`).join(' ');
      $('ed-' + k).innerHTML = keepSegs(`⏱ ${fmtTime(L.dur)} · ☠ ${Math.round(expRisk(k) * 100)}% por pessoa · ${loot}`);
    }
    $('es-' + k).disabled = locked || n <= L.min;
    $('ea-' + k).disabled = locked || n >= idle();
    $('eg-' + k).disabled = locked || idle() < n;
  }
  lockedSum($('exp-next'), lockedE, 'Novos lugares');
  $('exp-active').innerHTML = S.exps.length
    ? S.exps.map(e => `<div class="stat"><span>${EXPED[e.loc].icon} ${EXPED[e.loc].nome} (${e.n})</span><span>${Math.ceil(e.t)}s</span></div>
        <div class="bar"><div style="width:${(1 - e.t / e.dur) * 100}%"></div></div>`).join('')
    : '<div class="desc">Nenhuma expedição em andamento.</div>';

  const g = hopeGain();
  $('prestige').innerHTML = `
    <div class="stat"><span>Cidade atual</span><span>${S.meta.city}</span></div>
    <div class="stat"><span>Esperança disponível</span><span>✨ ${S.meta.hope}</span></div>
    <div class="stat"><span>Bônus de produção permanente</span><span>+${hopePct()}%</span></div>
    <div class="stat"><span>Desafios desta cidade</span><span>${S.mods.length ? S.mods.map(k => `<span title="${MODS[k].nome}: ${MODS[k].desc}">${MODS[k].icon}</span>`).join(' ') + ` (+${Math.round(modBonus() * 100)}% ✨)` : 'nenhum'}</span></div>`;
  $('btn-evac').textContent = g ? `🚁 Evacuar (+${g} ✨ Esperança)` : `🔒 Sobreviva até a onda ${EVAC_WAVE} para evacuar`;
  $('btn-evac').disabled = !g;
  for (const k in PERKS) {
    const lv = perk(k), max = lv >= PERKS[k].max, c = perkCost(k);
    $('pr-' + k).classList.toggle('built', lv > 0);
    $('pl-' + k).textContent = lv ? ` nv. ${lv}` : '';
    $('pn-' + k).textContent = lv ? `Atual: ${PERK_FX[k](lv)}` : '';
    $('pb-' + k).textContent = max ? 'Máximo' : `✨ ${c}`;
    $('pb-' + k).disabled = max || S.meta.hope < c;
  }

  const affordable = Object.keys(BUILD).filter(k => !buildBlocked(k) && !buildLocked(k) && canAfford(buildCost(k))).length;
  const perkReady = Object.keys(PERKS).some(k => perk(k) < PERKS[k].max && S.meta.hope >= perkCost(k));
  $('tb-equipe').textContent = idle() > 0 ? idle() : '';
  $('tb-equipe').classList.toggle('idle', idle() > 0);
  $('tb-construir').textContent = affordable || '';
  $('tb-expedicoes').textContent = S.exps.length || '';
  $('tb-evacuacao').textContent = hopeGain() || perkReady ? '!' : '';
  $('tb-evacuacao').classList.add('gold');
  $('tb-loja').textContent = `💵 ${S.meta.cash}`;
  for (const id of ['tb-caps', 'tb-caps-vis']) $(id).textContent = `🏷️ ${(S.meta.champ && S.meta.champ.caps) || 0}`;

  const toClaim = ACH.filter(a => S.meta.ach[a.id] === 'unlocked');
  const done = ACH.filter(a => S.meta.ach[a.id]).length;
  $('tb-conquistas').textContent = toClaim.length || '';
  $('ach-summary').textContent = `${done} / ${ACH.length} conquistas`;
  $('btn-claim-all').disabled = !toClaim.length;
  $('btn-claim-all').textContent = toClaim.length
    ? `Resgatar todas (💵 ${toClaim.reduce((s, a) => s + a.cash, 0)})` : 'Nada para resgatar';
  for (const a of ACH) {
    const state = S.meta.ach[a.id], v = Math.min(a.val(), a.goal);
    $('ar-' + a.id).className = 'row ach ' + (state || 'locked');
    $('ap-' + a.id).style.width = (state ? 100 : v / a.goal * 100) + '%';
    $('at-' + a.id).textContent = state ? 'Concluída' : `${fmt(v)} / ${fmt(a.goal)}`;
    // conquista secreta: só mostra o que é depois de acontecer
    if (a.secret) {
      const row = $('ar-' + a.id), open = !!state;
      row.querySelector('.ach-icon').textContent = open ? a.icon : '❓';
      row.querySelector('.title').textContent = open ? a.nome : 'Conquista secreta';
      row.querySelector('.desc').textContent = open ? a.desc : 'Algumas ideias são péssimas. Descubra jogando.';
    }
    const b = $('ab-' + a.id);
    b.disabled = state !== 'unlocked';
    b.textContent = state === 'claimed' ? '✔' : state === 'unlocked' ? `Resgatar 💵 ${a.cash}` : `💵 ${a.cash}`;
  }

  Endgame.render();
  Champions.render();
  Weapons.render();
  $('tb-armas').textContent = Weapons.tabBadge() || '';
  // aba Cidade: expedições fora + distritos prontos para atacar
  const cityN = S.exps.length + (+$('tb-mapa').textContent || 0);
  $('tb-cidade').textContent = cityN || '';

  if (logDirty) {
    $('log').innerHTML = S.log.map(l => `<li class="${l.type}">${l.text}</li>`).join('');
    highlight($('log'));
    logDirty = false;
  }
}

// Uma informação por linha, curta o bastante para caber no cartão; [texto, dica ao passar o mouse]
function diffStats(k) {
  const d = DIFFS[k], pct = v => (v >= 1 ? '+' : '') + Math.round((v - 1) * 100) + '%';
  const num = v => String(v).replace('.', ',');
  const sc = d.scav || [SCAV_CHARGES, SCAV_REGEN];
  return [
    [`🧟 Hordas ${pct(d.count)}`, 'Tamanho das hordas'],
    [`📈 +${num(Math.round((d.grow - 1) * 1000) / 10)}% por onda`, 'Quanto cada horda cresce em relação à anterior'],
    [`❤️ Vida dos zumbis ${pct(d.hp)}`],
    [`💥 Dano no muro ${pct(d.dmg)}`],
    [`⏱ ${d.interval}s entre hordas`],
    [`🥫 Consumo ${num(d.food)}/s`, 'Comida por pessoa, por segundo'],
    [`🏭 Produção ${pct(d.prod)}`],
    [`✨ Esperança ×${fmt(d.hope)}`, 'Esperança ganha ao evacuar'],
    [`👹 Chefe 💵 ${d.bossCash}`, 'Cash por chefe abatido'],
    ...(d.loot ? [[`🎒 Saque ×${fmt(d.loot)}`, 'Saque das expedições']] : []),
    d.dayOnly ? [`🌙 Recrutar só de dia`, 'Recrutar e vasculhar só de dia, entre as hordas'] : [`🌙 Recrutar a qualquer hora`, 'Recrutar e vasculhar a qualquer hora, sem limite'],
    ...(d.recruitDay ? [[`🧍 ${d.recruitDay} recruta${d.recruitDay > 1 ? 's' : ''} por dia`, 'Recrutamentos com comida por dia (volta a cada horda vencida)']] : []),
    [`🔍 ${sc[0]} cargas · ${num(sc[1])}s`, `Vasculhar: ${sc[0]} cargas de fôlego, 1 volta a cada ${num(sc[1])}s`],
    ...(d.surge ? [[`⚡ <b>Começo brutal</b>`, `A 1ª noite tem +${Math.round(d.surge * 100)}% de zumbis e +${Math.round(d.surgeHp * 100)}% de vida; o peso extra diminui a cada noite`]] : []),
    ...(d.firstDay ? [[`🌅 1º dia de ${d.firstDay}s`, 'Primeiro dia mais longo para planejar a defesa']] : []),
    ...(d.permadeath ? [['<b class="bad-text">💀 Morte permanente</b>', 'Se o abrigo cair, o save é apagado']] : []),
  ];
}

// Cartões de dificuldade (seletor do jogo e menu principal). min: menor dificuldade permitida neste save.
// only: mostra só essa dificuldade (o save já tem a dele e não pode trocar)
function diffCardsHtml(cur, min = 0, only = null) {
  return Object.entries(DIFFS).filter(([k]) => !only || k === only).map(([k, d]) => {
    const locked = diffRank(k) < min;
    return `
    <button class="diff-card ${cur === k ? 'current' : ''} ${d.permadeath ? 'perma' : ''}" data-diff="${k}" style="--c:${d.color}" ${locked ? 'disabled' : ''}>
      <div class="diff-name">${d.icon} ${d.nome}</div>
      <div class="diff-desc">${d.desc}</div>
      <ul>${diffStats(k).map(([s, tip]) => `<li${tip ? ` title="${tip}"` : ''}>${s}</li>`).join('')}</ul>
      ${locked ? '<div class="diff-lock">🔒 Este save já jogou numa dificuldade maior</div>' : ''}
    </button>`;
  }).join('');
}
// Confirmação na janela do próprio jogo (por cima do menu e do seletor de dificuldade), no lugar do confirm() do navegador.
// Enter confirma, Esc cancela. danger: botão de confirmar em vermelho.
function askConfirm({ title, body, ok = 'Confirmar', cancel = 'Cancelar', danger = false }, onYes) {
  const d = openDialog({ title, body, staticBody: true, plain: true, cancel,
    buttons: [{ label: ok, cls: danger ? 'danger-solid' : 'primary', onClick: () => setTimeout(onYes) }] });
  $('dialog').classList.add('over-menu');
  const key = e => {
    if (!d.open) { document.removeEventListener('keydown', key, true); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); d.close(); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); d.close(true); setTimeout(onYes); }
  };
  document.addEventListener('keydown', key, true);
  return d;
}
// Aviso antes de jogar no Apocalipse (novo jogo ou trocar de dificuldade)
const PERMA_CONFIRM = {
  title: '<span style="color:var(--bad)">🔥 Jogar no Apocalipse?</span>',
  body: `<p class="event-text"><b style="color:var(--bad)">Se você perder, o save será excluído.</b> Tem certeza de que quer começar no Apocalipse?</p>
    <ul class="win-list">
      <li>💀 <b>Morte permanente:</b> se o abrigo cair e todos morrerem, o save é <b>apagado, sem volta</b> (vale também durante o progresso offline).</li>
      <li>🔒 O save nunca mais poderá voltar para uma dificuldade menor.</li>
      <li>📤 Saves do Apocalipse não podem ser exportados.</li>
    </ul>`,
  ok: '🔥 Sim, jogar no Apocalipse', cancel: 'Voltar', danger: true,
};

// only: a dificuldade fica travada nessa (evacuar e Novo Mundo mantêm a do save; o cartão só confirma)
function chooseDifficulty({ title, sub, cancel, onPick, only = null }) {
  const modal = $('modal');
  const min = S && S.meta ? S.meta.minDiff || 0 : 0;
  $('modal-title').innerHTML = title;
  $('modal-sub').innerHTML = sub + (only
    ? `<br><small>🔒 A dificuldade é escolhida ao começar um novo jogo e não muda depois. Este save joga no <b>${DIFFS[only].icon} ${DIFFS[only].nome}</b>. Clique no cartão para continuar.</small>`
    : min > 0 ? `<br><small>🔒 Para não dar para juntar recursos numa dificuldade alta e depois voltar a uma mais fácil, este save não pode jogar abaixo de <b>${DIFFS[DIFF_ORDER[min]].icon} ${DIFFS[DIFF_ORDER[min]].nome}</b>.</small>` : '');
  $('diff-list').innerHTML = diffCardsHtml(S && S.diff, min, only);
  $('modal-cancel').style.display = cancel ? '' : 'none';
  modalOpen = true;
  const close = () => { modal.classList.add('hidden'); modalOpen = false; };
  $('modal-cancel').onclick = close;
  $('diff-list').querySelectorAll('.diff-card').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.diff;
      if (diffRank(k) < min || (only && k !== only)) return;
      const pickIt = () => {
        close();
        onPick(k);
        S.meta.diffChosen = true;
        S.meta.minDiff = Math.max(S.meta.minDiff || 0, diffRank(S.diff));
        save();
        render();
      };
      if (DIFFS[k].permadeath && !(S && D().permadeath)) askConfirm(PERMA_CONFIRM, pickIt);
      else pickIt();
    };
  });
  modal.classList.remove('hidden');
}

const TOAST_TIME = 7000;

function toast({ icon, label, name, desc, btn, onBtn, time = TOAST_TIME }) {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <div class="ticon">${icon}</div>
    <div class="tbody">
      <div class="tlabel">${label}</div>
      <div class="tname">${name}</div>
      <div class="tdesc">${desc}</div>
    </div>
    ${btn ? `<button class="cashbtn">${btn}</button>` : ''}
    <div class="timer" style="animation-duration:${time}ms"></div>`;
  const close = () => {
    if (el.classList.contains('out')) return;
    el.classList.add('out');
    setTimeout(() => el.remove(), 400);
  };
  highlight(el.querySelector('.tdesc'));
  if (btn) el.querySelector('button').onclick = e => { e.stopPropagation(); onBtn(); render(); close(); };
  el.onclick = close;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(close, time);
}

function achToast(a) {
  toast({
    icon: a.icon, label: '🏆 Conquista desbloqueada', name: a.nome, desc: a.desc,
    btn: `Resgatar 💵 ${a.cash}`, onBtn: () => claimAch(a.id),
  });
}

function openTab(name) {
  const t = document.querySelector(`.tab[data-tab="${name}"]`);
  if (t) t.click();
}

// ---------- alertas de recursos ----------
// Segundos até cada recurso acabar no ritmo atual (só para os que estão caindo)
function timeLeft(r) {
  const out = {};
  for (const k in RES) if (r[k] < -0.001 && S.res[k] > 0) out[k] = S.res[k] / -r[k];
  return out;
}

// Estimativa grosseira da munição que a próxima horda vai gastar
function ammoNeeded() {
  const n = S.wave;
  return waveSize(n) * hpMult(n) / Endgame.mult('dmg') / accuracy('guard');
}

function alertsHtml(r, left) {
  const out = [];
  if (S.starve > 0) out.push(['bad', `⚠ Sem comida! Alguém morrerá em ${Math.ceil(STARVE_TIME - S.starve)}s`]);
  else if (left.comida != null) out.push([left.comida < 60 ? 'bad' : 'warn', `⚠ A comida acaba em ~${fmtTime(left.comida)}: coloque mais forrageiros`]);
  if (left.sucata != null && left.sucata < 180) out.push(['warn', `⚠ A sucata acaba em ~${fmtTime(left.sucata)}: sem ela, os armeiros param`]);
  if (!S.horde.active && S.jobs.guarda > 0) {
    const ammo = S.res.municao + Math.max(0, r.municao) * S.waveTimer;
    if (ammo < ammoNeeded() * 0.6) out.push(['warn', '⚠ Pouca munição para a próxima horda: os guardas vão jogar pedras']);
  }
  if (hurt() > treating()) out.push(['bad', S.jobs.medico
    ? `⚠ ${hurt() - treating()} ferido(s) esperando um médico livre: sem tratamento, alguém piora em ${Math.ceil(WOUND_TIME - S.injT)}s`
    : `⚠ ${hurt()} ferido(s) sem médico: alguém piora em ${Math.ceil(WOUND_TIME - S.injT)}s (gasta remédio ou morre)`]);
  if (S.mourn > 0) out.push(['warn', `🕯️ Luto: −${Math.round(MOURN_PENALTY * 100)}% de produção por mais ${fmtTime(S.mourn)}`]);
  if (S.wallDown && !S.horde.active) out.push(['bad', '⚠ O muro está caído: na próxima horda os zumbis entram direto no abrigo. Repare!']);
  if (!S.horde.active && S.waveTimer < 30 && S.wallHp < maxWall() * 0.4) out.push(['bad', `⚠ Muro fraco e a horda chega em ${Math.ceil(S.waveTimer)}s: repare agora`]);
  return out.map(([c, t]) => `<br><span class="${c}-text">${t}</span>`).join('');
}

// ---------- lista de sobreviventes ----------
let peopleSig = '', memSig = '';
function renderPeople() {
  const sig = S.people.join('|') + '|' + away() + '|' + JSON.stringify(S.traits) + '|' + S.injured.map(w => w.n).join('|') + '|' + Pets.sig();
  if (sig !== peopleSig) {
    peopleSig = sig;
    $('people').innerHTML = S.people.length
      ? S.people.map(n => {
          const t = TRAITS[S.traits[n]], w = S.injured.some(i => i.n === n);
          const tip = [t && `${t.nome}: ${t.desc}`, w && 'Ferido: não trabalha até um médico tratar'].filter(Boolean).join(' · ');
          const hon = typeof Honored !== 'undefined' && Honored.is(n);
          return `<span class="person${t ? ' gifted' : ''}${w ? ' hurt' : ''}${hon ? ' honored' : ''}"${tip || hon ? ` title="${[hon && 'Homenageado: tem frases próprias', tip].filter(Boolean).join(' · ')}"` : ''}>${w ? '🤕 ' : ''}${hon ? '💬 ' : ''}${n}${t ? ` ${t.icon}` : ''}</span>`;
        }).join('') + (away() ? `<p class="hint">${away()} estão fora, em expedições ou operações.</p>` : '') + Pets.chipsHtml()
      : '<p class="hint">Ninguém no abrigo.</p>';
    const c = traitCounts();
    const parts = Object.keys(TRAITS).filter(k => c[k]).map(k => {
      const T = TRAITS[k], n = Math.min(TRAIT_CAP, c[k]);
      return `<span title="${T.desc} por pessoa (até ${TRAIT_CAP})">${T.icon} ${T.nome}${c[k] > 1 ? ` ×${c[k]}` : ''}: ${T.v > 0 ? '+' : '−'}${Math.round(Math.abs(T.v) * n * 100)}%</span>`;
    });
    $('traits-sum').innerHTML = parts.length ? 'Talentos do grupo: ' + parts.join(' · ') : 'Ninguém no grupo tem talento especial ainda. Cerca de 1 em cada 3 novatos chega com um.';
  }
  const mem = S.meta.memorial || [];
  const ms = (S.meta.fallen || 0) + '|' + (mem[0] ? mem[0].n + mem[0].c : '');
  if (ms !== memSig) {
    memSig = ms;
    $('fallen-count').textContent = S.meta.fallen ? `(${S.meta.fallen})` : '';
    $('memorial').innerHTML = mem.length
      ? mem.slice(0, 30).map(m => `<li><b>${m.n}</b> ${m.c} <span>onda ${m.w} · cidade ${m.city}${m.world > 1 ? ` · mundo ${m.world}` : ''}</span>${m.q ? `<i class="mem-q">"${m.q}"</i>` : ''}</li>`).join('') +
        (S.meta.fallen > 30 ? `<li class="more">e mais ${S.meta.fallen - 30} que não serão esquecidos.</li>` : '')
      : '<li class="more">Ninguém caiu ainda.</li>';
  }
}

// rótulo de atalho padronizado: (R), (1), (Q)...
const hk = k => `<span class="hk">(${k})</span>`;
// troca o HTML só quando muda (os botões são redesenhados várias vezes por segundo)
function setHtml(el, html) {
  if (el._html === html) return;
  el._html = html;
  el.innerHTML = html;
}

// ---------- janela genérica ----------
// o: { title, body (texto ou função), buttons: [{ label, cls, onClick(d), keep, disabled(), hidden() }],
//      cancel (true ou texto do botão de fechar), onOpt(chave, d) para elementos [data-opt], onClose, onEnd (também quando outra janela
//      toma o lugar), onMount(d), staticBody }
let dlg = null;
// Aviso de retorno: quanto tempo o jogador ficou fora e o que o abrigo produziu (no máximo OFFLINE_MAX)
function showReturn(r) {
  const row = (k, v) => `<div class="stat"><span>${k}</span><span>${v}</span></div>`;
  const g = r.gain, any = Object.values(g).some(v => v > 0);
  const body = `<p>Enquanto você esteve fora, o abrigo produziu (offline, ele rende ${Math.round(OFFLINE_YIELD * 100)}% do normal):</p>
    ${Object.keys(RES).filter(k => g[k] > 0).map(k => row(`${RES[k].icon} ${RES[k].nome}`, `+${fmt(g[k])}`)).join('')}
    ${g.rp > 0 ? row('🔬 Pesquisa', `+${fmt(g.rp)}`) : ''}
    ${any ? '' : '<p class="hint">Ninguém estava produzindo.</p>'}
    <p class="hint">Fora por ${fmtTime(r.away)} · produção registrada: ${fmtTime(r.el)}.` +
    (r.lost > 60 ? ` <b class="warn-text">${fmtTime(r.lost)} foram perdidas:</b> a produção offline vai só até ${fmtTime(OFFLINE_MAX)}. Volte antes para não perder nada.` : '') +
    ` Sem você, as hordas não atacam e ninguém consome nada: o abrigo continua de onde parou.</p>`;
  openDialog({ title: '⏳ Bem-vindo de volta', body, cancel: 'Continuar' });
}

function openDialog(o) {
  if (dlg) dlg.close(true);
  const el = $('dialog'), val = v => (typeof v === 'function' ? v() : v);
  const d = {
    refresh(full = !o.staticBody) {
      $('dialog-title').innerHTML = val(o.title);
      if (full) { $('dialog-body').innerHTML = val(o.body); if (!o.plain) highlight($('dialog-body')); }
      $('dialog-actions').innerHTML = (o.buttons || []).map((b, i) => b.hidden && b.hidden() ? '' :
        `<button data-btn="${i}" class="${b.cls || ''}" ${b.disabled && b.disabled() ? 'disabled' : ''}>${val(b.label)}</button>`).join('') +
        (o.cancel ? `<button data-btn="-1">${o.cancel === true ? 'Fechar' : o.cancel}</button>` : '');
    },
    close(silent) {
      if (dlg !== d) return;
      dlg = null;
      el.classList.add('hidden');
      modalOpen = !$('modal').classList.contains('hidden');
      if (!silent && o.onClose) o.onClose();
      if (o.onEnd) o.onEnd();   // sempre que a janela sai (fechada ou trocada por outra)
    },
    get open() { return dlg === d; },
    canCancel: !!o.cancel,
  };
  $('dialog-body').onclick = e => {
    const t = e.target.closest('[data-opt]');
    if (!t || t.disabled || !o.onOpt) return;
    o.onOpt(t.dataset.opt, d);
    if (d.open) d.refresh(true);
    render();
  };
  $('dialog-actions').onclick = e => {
    const t = e.target.closest('[data-btn]');
    if (!t) return;
    const i = +t.dataset.btn;
    if (i < 0) { d.close(); return; }
    const b = o.buttons[i];
    if (b.onClick) b.onClick(d);
    if (!b.keep) d.close(true);
    else if (d.open) d.refresh(false);
    render();
  };
  dlg = d;
  el.querySelector('.dialog-box').classList.toggle('wide', !!o.wide);   // janela mais larga (ex.: árvore de habilidades)
  d.refresh(true);
  el.classList.remove('hidden');
  modalOpen = true;
  if (o.onMount) o.onMount(d);
  return d;
}
// Esc fecha a janela aberta, se ela permitir
function dialogEsc() {
  if (dlg && dlg.canCancel) { dlg.close(); return true; }
  return false;
}

// ---------- exportar / importar ----------
function showExport() {
  if (D().permadeath) {
    openDialog({
      title: '💾 Exportar progresso',
      body: '<p class="event-text">Saves do <b>🔥 Apocalipse</b> não podem ser exportados: a morte é permanente e não existe cópia de segurança.</p>',
      cancel: 'Fechar',
    });
    return;
  }
  openDialog({
    title: '💾 Exportar progresso',
    staticBody: true,
    body: `<p class="event-text">Baixe o arquivo do seu progresso (<b>${SAVE_EXT}</b>) e guarde num lugar seguro. Para continuar em outro navegador ou aparelho, use <b>Importar</b> e arraste o arquivo.</p>
      <p id="save-msg" class="hint"></p>`,
    buttons: [{ label: '⬇️ Baixar save', cls: 'primary', keep: true, onClick: () => downloadSave() }],
    cancel: 'Fechar',
  });
}

// arquivo do save: o mesmo código do exportar, com a extensão própria do jogo (nome: voidfall-jogador-cidade-data)
const SAVE_EXT = '.voidfall';
function downloadSave() {
  const m = S.meta, slug = String(m.player || 'save').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'save';
  downloadFile(exportCode(), `voidfall-${slug}-cidade${m.city || 1}-${new Date().toISOString().slice(0, 10)}${SAVE_EXT}`, 'application/octet-stream');
  $('save-msg').textContent = '✔ Save baixado. Ele está na pasta de downloads do navegador.';
}
function downloadFile(text, name, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function copyCode(code) {
  const ok = () => { $('save-msg').textContent = '✔ Código copiado.'; };
  const fallback = () => {
    $('save-code').select();
    try { document.execCommand('copy'); ok(); } catch (e) { $('save-msg').textContent = 'Não deu para copiar sozinho: selecione o texto e copie.'; }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, fallback);
  else fallback();
}

// texto comum (relatório de bug)
function downloadCode(code) {
  downloadFile(code, `voidfall-${new Date().toISOString().slice(0, 10)}.txt`);
  if ($('save-msg')) $('save-msg').textContent = '✔ Arquivo baixado.';
}

// slot: espaço que recebe o progresso (padrão: o aberto). Pelo menu principal dá para importar em qualquer espaço, sem abrir um jogo antes.
function showImport(slot = Slots.cur) {
  const x = Slots.info(slot);
  openDialog({
    title: '📂 Importar progresso',
    staticBody: true,
    // uma área só: clicar escolhe o arquivo, arrastar o arquivo para cima dela importa na hora
    // (aceita também os .txt das versões antigas; colar o código com Ctrl+V funciona, sem aviso: útil para o save que vem no relatório de bug)
    body: `<div id="imp-root"><p class="event-text">${x
      ? `<span class="bad-text">O progresso do espaço ${slot} (${escHtml(x.name)}) será substituído.</span>`
      : `O progresso vai para o <b>espaço ${slot}</b>, que está vazio.`}</p>
      <label class="drop-zone" id="save-drop" tabindex="0"><input type="file" id="save-file" accept="${SAVE_EXT},.txt">
        <span class="dz-ico">💾</span><b>Arraste o arquivo do save aqui</b><small>ou clique para escolher (arquivo ${SAVE_EXT})</small></label>
      <p id="save-msg" class="hint"></p></div>`,
    onMount: () => {
      const dz = $('save-drop'), msg = h => { $('save-msg').innerHTML = h; };
      const go = (code, from) => {
        if (!String(code || '').trim()) { msg('<span class="bad-text">O arquivo está vazio.</span>'); return; }
        try { msg(`Importando ${from}...`); importSave(code, slot); } catch (e) { msg(`<span class="bad-text">${e.message}</span>`); }
      };
      const file = f => { if (f) f.text().then(t => go(t, `"${escHtml(f.name)}"`), () => msg('<span class="bad-text">Não deu para ler o arquivo.</span>')); };
      $('save-file').onchange = e => file(e.target.files[0]);
      dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); };
      dz.ondragleave = () => dz.classList.remove('over');
      dz.ondrop = e => { e.preventDefault(); dz.classList.remove('over'); file(e.dataTransfer.files[0]); };
      // no elemento desta janela (o #dialog-body é reaproveitado pelas outras janelas)
      $('imp-root').onpaste = e => { const t = e.clipboardData && e.clipboardData.getData('text'); if (t) { e.preventDefault(); go(t, 'o código colado'); } };
      dz.focus();
    },
    cancel: 'Cancelar',
  });
}

// ---------- realce de palavras-chave ----------
// Cada grupo vira uma classe kw-<grupo> (cores no CSS). Só mexe em texto: botões, campos e atalhos ficam de fora.
const KEYWORDS = [
  ['danger', 'hordas?|zumbis?|Abominaç(?:ão|ões)|Saltador|Rolador|Matriarca|Colosso|Escavador|Inchado Colossal|Carcaça|Mãe-Cuspideira|Rei Uivador|Hospedeiro Gigante|Chefe Saqueador|invas(?:ão|ões)|morreu|morreram|mort[oa]s?|infectad[oa]s?|mordida|saqueadores|fome|Lua de Sangue|chefe'],
  ['life',   'vidas?|sobreviventes?|remédios?|salv(?:ou|aram|am|ar)|Cura'],
  ['gold',   'Esperança|Legado|cash|conquistas?'],
  ['food',   'comida'],
  ['scrap',  'sucata'],
  ['ammo',   'munição|munições'],
  ['sci',    'pesquisas?|amostras?|cientistas?'],
  ['wall',   'muro'],
];
const KW_RE = new RegExp('(?<!\\p{L})(?:' + KEYWORDS.map(([, w]) => `(${w})`).join('|') + ')(?!\\p{L})', 'giu');
const KW_SKIP = 'button, kbd, input, textarea, select, output, .kw, script, style';

function highlight(root, selector) {
  if (!root) return;
  const targets = selector ? root.querySelectorAll(selector) : [root];
  for (const t of targets) {
    const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentElement && n.parentElement.closest(KW_SKIP)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const text = n.nodeValue;
      KW_RE.lastIndex = 0;
      if (!KW_RE.test(text)) continue;
      KW_RE.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = KW_RE.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const g = m.slice(1).findIndex(x => x !== undefined);
        const span = document.createElement('span');
        span.className = 'kw kw-' + KEYWORDS[g][0];
        span.textContent = m[0];
        frag.appendChild(span);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      n.parentNode.replaceChild(frag, n);
    }
  }
}
