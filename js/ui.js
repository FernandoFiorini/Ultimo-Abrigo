'use strict';

const $ = id => document.getElementById(id);
let logDirty = true;

function fmt(n) {
  const a = Math.abs(n);
  if (a < 10) return (Math.round(n * 10) / 10).toLocaleString('pt-BR');
  if (a < 1000) return Math.floor(n).toString();
  const u = ['k', 'M', 'B', 'T'];
  let i = -1, v = n;
  while (Math.abs(v) >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  return v.toFixed(1).replace('.', ',') + u[i];
}
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
    `<span class="${S.res[r] < v ? 'missing' : ''}">${RES[r].icon} ${fmt(v)}</span>`).join(' ');
}

function buildUI() {
  $('resources').innerHTML = Object.entries(RES).map(([k, r]) =>
    `<div class="res" title="${r.nome}">${r.icon} <span class="val" id="r-${k}"></span><span class="rate" id="rr-${k}"></span></div>`).join('') +
    `<div class="res hope" title="Esperança (prestígio)">✨ <span class="val" id="r-hope"></span><span class="rate" id="rr-hope"></span></div>` +
    `<div class="res cash" title="Cash: moeda rara para a loja">💵 <span class="val" id="r-cash"></span></div>` +
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
    <div class="row">
      <div class="main">
        <div class="title">${it.icon} ${it.nome}</div>
        <div class="desc">${it.desc}</div>
        <div class="desc now" id="sn-${k}"></div>
      </div>
      <button class="cashbtn" data-act="shop" data-k="${k}" id="sb-${k}">💵 ${it.cost}</button>
    </div>`).join('');

  $('jobs').innerHTML = Object.entries(JOBS).map(([k, j]) => `
    <div class="row">
      <div class="main"><div class="title">${j.icon} ${j.nome}</div><div class="desc">${j.desc}</div></div>
      <button class="small" data-act="jobSub" data-k="${k}" id="js-${k}">−</button>
      <span class="count" id="jc-${k}"></span>
      <button class="small" data-act="jobAdd" data-k="${k}" id="ja-${k}">+</button>
    </div>`).join('');

  $('buildings').innerHTML = Object.entries(BUILD).map(([k, b]) => `
    <div class="row">
      <div class="main">
        <div class="title">${b.icon} ${b.nome}<span class="lvl" id="bl-${k}"></span></div>
        <div class="desc">${b.desc}</div>
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

  $('perks').innerHTML = Object.entries(PERKS).map(([k, p]) => `
    <div class="row">
      <div class="main">
        <div class="title">${p.icon} ${p.nome}<span class="lvl" id="pl-${k}"></span></div>
        <div class="desc">${p.desc}</div>
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
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
    try { localStorage.setItem(TAB_KEY, name); } catch (e) { /* sem armazenamento */ }
  };
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  let firstTab = 'equipe';
  try { firstTab = localStorage.getItem(TAB_KEY) || 'equipe'; } catch (e) { /* sem armazenamento */ }
  showTab(document.querySelector(`.tab[data-tab="${firstTab}"]`) ? firstTab : 'equipe');

  $('btn-scavenge').title = 'O líder vasculha as ruínas por conta própria. Rende mais conforme sua produção e a onda aumentam. Também dá para clicar direto no cenário.';
  $('btn-scavenge').onclick = () => { if (paused) return; Scene.float(actions.scavenge()); render(); };
  $('btn-recruit').onclick = () => { actions.recruit(); render(); };
  $('btn-repair').onclick = () => { actions.repair(); render(); };
  $('btn-save').onclick = save;
  $('btn-export').onclick = showExport;
  $('btn-import').onclick = showImport;
  $('btn-keys').onclick = showShortcuts;
  $('btn-settings').onclick = openSettings;
  $('btn-speed').onclick = () => { Settings.set('speed2x', !Settings.get('speed2x')); render(); };
  applyBodyPrefs();
  Settings.on(k => { if (k === 'colorblind') applyBodyPrefs(); });
  $('btn-merchant').onclick = () => Events.openMerchant();
  $('pause-badge').onclick = () => togglePause(false);
  setupKeys();
  Tutorial.setup();
  $('btn-menu').onclick = () => Slots.toMenu();
  $('diff-chip').onclick = changeDifficulty;
}

function render() {
  const r = rates();
  const left = timeLeft(r);
  for (const k in RES) {
    $('r-' + k).textContent = fmt(S.res[k]);
    const el = $('rr-' + k);
    el.textContent = fmtRate(r[k]) + (left[k] != null && left[k] < 300 ? ` · ${fmtClock(left[k])}` : '');
    el.className = 'rate ' + (r[k] > 0.001 ? 'pos' : r[k] < -0.001 ? 'neg' : '');
    el.parentNode.classList.toggle('danger', left[k] != null && left[k] < 60);
    el.parentNode.title = RES[k].nome + (left[k] != null ? ` (acaba em ~${fmtTime(left[k])} no ritmo atual)` : '');
  }
  $('r-hope').textContent = S.meta.hope;
  $('diff-chip').textContent = `${D().icon} ${D().nome}` + (S.mods.length ? ' · ' + S.mods.map(k => MODS[k].icon).join('') : '');
  $('diff-chip').title = 'Dificuldade (clique para mudar)' + (S.mods.length ? '\nDesafios: ' + S.mods.map(k => MODS[k].nome).join(', ') : '');
  $('pause-badge').classList.toggle('hidden', !paused);
  const fast = Settings.get('speed2x'), sp = $('btn-speed');
  sp.classList.toggle('active', fast);
  setHtml(sp, (fast ? (S.horde.active ? '⏩ 2x · pausado na horda' : '⏩ 2x ligado') : '⏩ 2x') + ' ' + hk('F'));
  sp.title = 'Acelera o dia. Na horda o jogo volta ao normal.';
  const mc = $('btn-merchant');
  mc.classList.toggle('hidden', !S.merchant);
  if (S.merchant) setHtml(mc, `🛒 Comerciante · ${Math.ceil(S.merchant.t)}s ${hk('O')}`);
  $('diff-chip').style.setProperty('--c', D().color);
  $('r-cash').textContent = S.meta.cash;
  const B = S.meta.boosts;
  $('boosts').innerHTML =
    (B.prod > 0 ? `<span class="boost prod">⚡ 2x ${fmtClock(B.prod)}</span>` : '') +
    (B.furia > 0 ? `<span class="boost furia">🔥 Fúria ${fmtClock(B.furia)}</span>` : '');

  $('shop-cash').textContent = S.meta.cash;
  for (const k in SHOP) {
    const block = shopBlock(k);
    $('sb-' + k).disabled = !!block;
    $('sb-' + k).title = block;
    let now = '';
    if (SHOP[k].secs) {
      const g = timeGain(SHOP[k].secs);
      now = 'Você receberia: ' + (Object.keys(g).filter(r => g[r] >= 1).map(r => `+${fmt(g[r])} ${RES[r].icon}`).join(' ') || 'nada (sem produção)');
    } else if (k === 'prod2x' && B.prod > 0) now = `Ativo: ${fmtClock(B.prod)} restantes`;
    else if (k === 'furia' && B.furia > 0) now = `Ativo: ${fmtClock(B.furia)} restantes`;
    else if (block && block !== 'Cash insuficiente') now = block;
    $('sn-' + k).textContent = now;
  }
  $('rr-hope').textContent = S.meta.hopeTotal ? `+${Math.round(S.meta.hopeTotal * 3)}% prod.` : '';

  let info = `<b>${S.survivors}</b> / ${maxSurv()} sobreviventes · <b>${idle()}</b> ociosos`;
  if (away()) info += ` · <b>${away()}</b> em expedição`;
  if (hurt()) info += ` · <b>${hurt()}</b> ferido(s)` + (treating() ? ` (${treating()} em tratamento)` : '');
  info += `<br>Consumo: ${fmt(home() * foodPer())} comida/s`;
  info += alertsHtml(r, left);
  $('surv-info').innerHTML = info;
  renderPeople();

  const sg = scavGain();
  setHtml($('btn-scavenge'), `🔍 Vasculhar · +${sg.comida} 🥫 +${sg.sucata} 🔩 ${hk('V')}`);

  const rc = recruitCost();
  const full = S.survivors >= maxSurv();
  const iso = hasMod('isolados');
  setHtml($('btn-recruit'), (iso ? '📵 Isolados: sem recrutamento' : full ? '🧍 Lotado · construa barracas' : `🧍 Recrutar · ${RES.comida.icon} ${rc}`) + ' ' + hk('R'));
  $('btn-recruit').disabled = iso || full || S.res.comida < rc;

  for (const k in JOBS) {
    $('jc-' + k).textContent = S.jobs[k];
    $('ja-' + k).disabled = idle() <= 0;
    $('js-' + k).disabled = S.jobs[k] <= 0;
  }

  for (const k in BUILD) {
    const c = buildCost(k);
    $('bl-' + k).textContent = S.build[k] ? ` nv. ${S.build[k]}` : '';
    $('bn-' + k).textContent = S.build[k] ? `Atual: ${BUILD_FX[k](S.build[k])}` : '';
    const blocked = buildBlocked(k);
    $('bb-' + k).textContent = blocked ? '🚫 Bloqueado' : S.build[k] ? `Melhorar para nv. ${S.build[k] + 1}` : 'Construir';
    $('bb-' + k).title = blocked ? 'Desafio "Sem torres" ativo nesta cidade' : '';
    $('bc-' + k).innerHTML = blocked ? '' : costHtml(c);
    $('bb-' + k).disabled = blocked || !canAfford(c);
  }

  const H = S.horde;
  const wallPct = S.wallHp / maxWall() * 100;
  const top = H.active
    ? `<div class="stat alert"><span>🧟 HORDA ATACANDO (onda ${H.n})</span><span>${H.queue.length + H.zs.length} restantes</span></div>
       <div class="bar wave"><div style="width:${(1 - (H.queue.length + H.zs.length) / Math.max(1, waveSize(H.n))) * 100}%"></div></div>`
    : `<div class="stat"><span>Próxima horda (onda ${S.wave})</span><span>${Math.ceil(S.waveTimer)}s</span></div>
       <div class="bar wave"><div style="width:${(1 - S.waveTimer / waveInterval()) * 100}%"></div></div>
       <div class="stat"><span>Zumbis esperados</span><span>${waveSize(S.wave)}${S.wave % 10 === 0 ? ' + 👹 chefe' : ''}</span></div>`;
  $('defense').innerHTML = top + `
    <div class="stat"><span>🧱 Muro</span><span>${Math.ceil(S.wallHp)} / ${maxWall()}</span></div>
    <div class="bar ${wallPct < 30 ? 'low' : ''}"><div style="width:${wallPct}%"></div></div>
    <div class="stat"><span>🛡️ ${S.jobs.guarda} guardas · 🗼 ${S.build.torre} torres</span><span>☠ ${fmt(S.kills)} · 🏆 onda ${S.best}</span></div>
    <div class="stat" title="Chance de acerto. Melhora com Treinamento de tiro, a pesquisa Miras ópticas, o talento Boa mira e o herói Atirador. Tiro errado também gasta munição."><span>🎯 Precisão</span><span>guardas ${Math.round(accuracy('guard') * 100)}% · torres ${Math.round(accuracy('tower') * 100)}%</span></div>`;

  setHtml($('btn-repair'), `🔨 Reparar muro · ${RES.sucata.icon} ${REPAIR_COST} ${hk('C')}`);
  $('btn-repair').disabled = S.res.sucata < REPAIR_COST || S.wallHp >= maxWall();

  const scale = (1 + 0.08 * (S.wave - 1)) * hopeMult();
  const sieged = hasMod('semexp');
  for (const k in EXPED) {
    const L = EXPED[k], locked = sieged || S.best + 1 < L.unlock, n = expSel[k];
    $('er-' + k).classList.toggle('locked', locked);
    $('en-' + k).textContent = n;
    if (sieged) {
      $('ed-' + k).textContent = '⛔ Cidade sitiada: expedições bloqueadas por um desafio';
    } else if (locked) {
      $('ed-' + k).textContent = `🔒 Desbloqueia ao chegar na onda ${L.unlock}`;
    } else {
      const loot = Object.entries(L.loot).map(([r, [a, b]]) =>
        `${RES[r].icon} ${fmt(a * n * scale)}–${fmt(b * n * scale)}`).join(' ');
      $('ed-' + k).innerHTML = `⏱ ${fmtTime(L.dur)} · ☠ ${Math.round(L.risk * 100)}% por pessoa · ${loot}`;
    }
    $('es-' + k).disabled = locked || n <= L.min;
    $('ea-' + k).disabled = locked || n >= idle();
    $('eg-' + k).disabled = locked || idle() < n;
  }
  $('exp-active').innerHTML = S.exps.length
    ? S.exps.map(e => `<div class="stat"><span>${EXPED[e.loc].icon} ${EXPED[e.loc].nome} (${e.n})</span><span>${Math.ceil(e.t)}s</span></div>
        <div class="bar"><div style="width:${(1 - e.t / e.dur) * 100}%"></div></div>`).join('')
    : '<div class="desc">Nenhuma expedição em andamento.</div>';

  const g = hopeGain();
  $('prestige').innerHTML = `
    <div class="stat"><span>Cidade atual</span><span>${S.meta.city}</span></div>
    <div class="stat"><span>Esperança disponível</span><span>✨ ${S.meta.hope}</span></div>
    <div class="stat"><span>Bônus de produção permanente</span><span>+${Math.round(S.meta.hopeTotal * 3)}%</span></div>
    <div class="stat"><span>Desafios desta cidade</span><span>${S.mods.length ? S.mods.map(k => `<span title="${MODS[k].nome}: ${MODS[k].desc}">${MODS[k].icon}</span>`).join(' ') + ` (+${Math.round(modBonus() * 100)}% ✨)` : 'nenhum'}</span></div>`;
  $('btn-evac').textContent = g ? `🚁 Evacuar (+${g} ✨ Esperança)` : `🔒 Sobreviva até a onda ${EVAC_WAVE} para evacuar`;
  $('btn-evac').disabled = !g;
  for (const k in PERKS) {
    const lv = perk(k), max = lv >= PERKS[k].max, c = perkCost(k);
    $('pl-' + k).textContent = lv ? ` nv. ${lv}` : '';
    $('pn-' + k).textContent = lv ? `Atual: ${PERK_FX[k](lv)}` : '';
    $('pb-' + k).textContent = max ? 'Máximo' : `✨ ${c}`;
    $('pb-' + k).disabled = max || S.meta.hope < c;
  }

  const affordable = Object.keys(BUILD).filter(k => canAfford(buildCost(k))).length;
  const perkReady = Object.keys(PERKS).some(k => perk(k) < PERKS[k].max && S.meta.hope >= perkCost(k));
  $('tb-equipe').textContent = idle() > 0 ? idle() : '';
  $('tb-construir').textContent = affordable || '';
  $('tb-expedicoes').textContent = S.exps.length ? `${S.exps.length} fora` : '';
  $('tb-evacuacao').textContent = hopeGain() || perkReady ? '!' : '';
  $('tb-evacuacao').classList.add('gold');
  $('tb-loja').textContent = S.meta.cash || '';
  $('tb-loja').classList.add('cash');

  const toClaim = ACH.filter(a => S.meta.ach[a.id] === 'unlocked');
  const done = ACH.filter(a => S.meta.ach[a.id]).length;
  $('tb-conquistas').textContent = toClaim.length || '';
  $('tb-conquistas').classList.add('gold');
  $('ach-summary').textContent = `${done} / ${ACH.length} conquistas`;
  $('btn-claim-all').disabled = !toClaim.length;
  $('btn-claim-all').textContent = toClaim.length
    ? `Resgatar todas (💵 ${toClaim.reduce((s, a) => s + a.cash, 0)})` : 'Nada para resgatar';
  for (const a of ACH) {
    const state = S.meta.ach[a.id], v = Math.min(a.val(), a.goal);
    $('ar-' + a.id).className = 'row ach ' + (state || 'locked');
    $('ap-' + a.id).style.width = (state ? 100 : v / a.goal * 100) + '%';
    $('at-' + a.id).textContent = state ? 'Concluída' : `${fmt(v)} / ${fmt(a.goal)}`;
    const b = $('ab-' + a.id);
    b.disabled = state !== 'unlocked';
    b.textContent = state === 'claimed' ? '✔' : state === 'unlocked' ? `Resgatar 💵 ${a.cash}` : `💵 ${a.cash}`;
  }

  Endgame.render();
  Weapons.render();
  $('tb-armas').textContent = Weapons.tabBadge() || '';

  if (logDirty) {
    $('log').innerHTML = S.log.map(l => `<li class="${l.type}">${l.text}</li>`).join('');
    highlight($('log'));
    logDirty = false;
  }
}

function diffStats(k) {
  const d = DIFFS[k], pct = v => (v >= 1 ? '+' : '') + Math.round((v - 1) * 100) + '%';
  return [
    `🧟 Hordas ${pct(d.count)} · crescem ${Math.round((d.grow - 1) * 100)}%/onda`,
    `❤️ Vida dos zumbis ${pct(d.hp)} · dano ${pct(d.dmg)}`,
    `⏱ ${d.interval}s entre hordas · 🥫 consumo ${d.food.toLocaleString('pt-BR')}/s por pessoa`,
    `🏭 Produção ${pct(d.prod)}`,
    `✨ Esperança ×${fmt(d.hope)} · 👹 Abominação 💵 ${d.bossCash}` + (d.loot ? ` · 🎒 saque ×${fmt(d.loot)}` : ''),
    ...(d.permadeath ? ['<b class="bad-text">💀 Morte permanente: se o abrigo cair, o save é apagado</b>'] : []),
  ];
}

// Cartões de dificuldade (seletor do jogo e menu principal). min: menor dificuldade permitida neste save.
function diffCardsHtml(cur, min = 0) {
  return Object.entries(DIFFS).map(([k, d]) => {
    const locked = diffRank(k) < min;
    return `
    <button class="diff-card ${cur === k ? 'current' : ''} ${d.permadeath ? 'perma' : ''}" data-diff="${k}" style="--c:${d.color}" ${locked ? 'disabled' : ''}>
      <div class="diff-name">${d.icon} ${d.nome}</div>
      <div class="diff-desc">${d.desc}</div>
      <ul>${diffStats(k).map(s => `<li>${s}</li>`).join('')}</ul>
      ${locked ? '<div class="diff-lock">🔒 Este save já jogou numa dificuldade maior</div>' : ''}
    </button>`;
  }).join('');
}
const PERMA_WARN = 'Atenção: no Apocalipse a morte é permanente. Se todos morrerem, este save será APAGADO, sem volta. O save também nunca mais poderá voltar para uma dificuldade menor. Continuar?';

function chooseDifficulty({ title, sub, cancel, onPick }) {
  const modal = $('modal');
  const min = S && S.meta ? S.meta.minDiff || 0 : 0;
  $('modal-title').innerHTML = title;
  $('modal-sub').innerHTML = sub + (min > 0 ? `<br><small>🔒 Para não dar para juntar recursos numa dificuldade alta e depois voltar a uma mais fácil, este save não pode jogar abaixo de <b>${DIFFS[DIFF_ORDER[min]].icon} ${DIFFS[DIFF_ORDER[min]].nome}</b>.</small>` : '');
  $('diff-list').innerHTML = diffCardsHtml(S && S.diff, min);
  $('modal-cancel').style.display = cancel ? '' : 'none';
  modalOpen = true;
  const close = () => { modal.classList.add('hidden'); modalOpen = false; };
  $('modal-cancel').onclick = close;
  $('diff-list').querySelectorAll('.diff-card').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.diff;
      if (diffRank(k) < min) return;
      if (DIFFS[k].permadeath && !(S && D().permadeath) && !confirm(PERMA_WARN)) return;
      close();
      onPick(k);
      S.meta.diffChosen = true;
      S.meta.minDiff = Math.max(S.meta.minDiff || 0, diffRank(S.diff));
      save();
      render();
    };
  });
  modal.classList.remove('hidden');
}

function changeDifficulty() {
  chooseDifficulty({
    title: 'Mudar dificuldade',
    sub: `Mudar a dificuldade <b>recomeça a cidade atual do zero</b>. Você mantém Esperança, cash, conquistas e melhorias permanentes. Só é possível <b>subir</b> de dificuldade, nunca voltar. Dificuldade atual: <b>${D().icon} ${D().nome}</b>.`,
    cancel: true,
    onPick: diff => {
      if (diff === S.diff) return;
      S = newState(S.meta, diff);
      addLog(`🔄 Cidade recomeçada no modo ${DIFFS[diff].icon} ${DIFFS[diff].nome}.`, 'warn');
      emit('gameOver');
      save();
    },
  });
}

const TOAST_TIME = 7000;

function toast({ icon, label, name, desc, btn, onBtn }) {
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
    <div class="timer" style="animation-duration:${TOAST_TIME}ms"></div>`;
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
  setTimeout(close, TOAST_TIME);
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
  const sig = S.people.join('|') + '|' + away() + '|' + JSON.stringify(S.traits) + '|' + S.injured.map(w => w.n).join('|');
  if (sig !== peopleSig) {
    peopleSig = sig;
    $('people').innerHTML = S.people.length
      ? S.people.map(n => {
          const t = TRAITS[S.traits[n]], w = S.injured.some(i => i.n === n);
          const tip = [t && `${t.nome}: ${t.desc}`, w && 'Ferido: não trabalha até um médico tratar'].filter(Boolean).join(' · ');
          return `<span class="person${t ? ' gifted' : ''}${w ? ' hurt' : ''}"${tip ? ` title="${tip}"` : ''}>${w ? '🤕 ' : ''}${n}${t ? ` ${t.icon}` : ''}</span>`;
        }).join('') + (away() ? `<p class="hint">${away()} estão fora, em expedições ou operações.</p>` : '')
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
      ? mem.slice(0, 30).map(m => `<li><b>${m.n}</b> ${m.c} <span>onda ${m.w} · cidade ${m.city}${m.world > 1 ? ` · mundo ${m.world}` : ''}</span></li>`).join('') +
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
//      cancel (true ou texto do botão de fechar), onOpt(chave, d) para elementos [data-opt], onClose, onMount(d), staticBody }
let dlg = null;
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
  const code = exportCode();
  openDialog({
    title: '💾 Exportar progresso',
    staticBody: true,
    body: `<p class="event-text">Guarde este código em um lugar seguro. Para continuar em outro navegador ou aparelho, use <b>Importar</b> e cole o código.</p>
      <textarea id="save-code" class="save-code" readonly spellcheck="false">${code}</textarea>
      <p id="save-msg" class="hint"></p>`,
    onMount: () => $('save-code').select(),
    buttons: [
      { label: '📋 Copiar', cls: 'primary', keep: true, onClick: () => copyCode(code) },
      { label: '⬇️ Baixar arquivo', keep: true, onClick: () => downloadCode(code) },
    ],
    cancel: 'Fechar',
  });
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

function downloadCode(code) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
  a.download = `voidfall-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $('save-msg').textContent = '✔ Arquivo baixado.';
}

function showImport() {
  openDialog({
    title: '📂 Importar progresso',
    staticBody: true,
    body: `<p class="event-text">Cole o código exportado ou escolha o arquivo <b>.txt</b>. <span class="bad-text">O progresso do espaço ${Slots.cur} (${escHtml(S.meta.player)}) será substituído.</span></p>
      <textarea id="save-code" class="save-code" spellcheck="false" placeholder="UA1:..."></textarea>
      <label class="file-pick"><input type="file" id="save-file" accept=".txt,text/plain"> 📄 Escolher arquivo</label>
      <p id="save-msg" class="hint"></p>`,
    onMount: () => {
      $('save-code').focus();
      $('save-file').onchange = e => {
        const f = e.target.files[0];
        if (!f) return;
        f.text().then(t => { $('save-code').value = t.trim(); $('save-msg').textContent = `Arquivo "${f.name}" carregado. Clique em Importar.`; });
      };
    },
    buttons: [{ label: 'Importar', cls: 'primary', keep: true, onClick: () => {
      const code = $('save-code').value;
      if (!code.trim()) { $('save-msg').innerHTML = '<span class="bad-text">Cole um código primeiro.</span>'; return; }
      try { importSave(code); } catch (e) { $('save-msg').innerHTML = `<span class="bad-text">${e.message}</span>`; }
    } }],
    cancel: 'Cancelar',
  });
}

// ---------- realce de palavras-chave ----------
// Cada grupo vira uma classe kw-<grupo> (cores no CSS). Só mexe em texto: botões, campos e atalhos ficam de fora.
const KEYWORDS = [
  ['danger', 'hordas?|zumbis?|Abominaç(?:ão|ões)|invas(?:ão|ões)|morreu|morreram|mort[oa]s?|infectad[oa]s?|mordida|saqueadores|fome|Lua de Sangue|chefe'],
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
