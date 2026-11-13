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

  $('perks').innerHTML = Object.entries(PERKS).map(([k, p]) => `
    <div class="row">
      <div class="main">
        <div class="title">${p.icon} ${p.nome}<span class="lvl" id="pl-${k}"></span></div>
        <div class="desc">${p.desc}</div>
        <div class="desc now" id="pn-${k}"></div>
      </div>
      <button data-act="perk" data-k="${k}" id="pb-${k}"></button>
    </div>`).join('');

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
  $('btn-scavenge').onclick = () => { Scene.float(actions.scavenge()); render(); };
  $('btn-recruit').onclick = () => { actions.recruit(); render(); };
  $('btn-repair').onclick = () => { actions.repair(); render(); };
  $('btn-save').onclick = save;
  $('btn-reset').onclick = () => {
    if (!confirm('Apagar TODO o progresso, inclusive Esperança, cash, conquistas e melhorias permanentes?')) return;
    S = newState();
    emit('gameOver');
    render();
    chooseDifficulty({
      title: 'Um novo começo',
      sub: 'Escolha a dificuldade.',
      cancel: false,
      onPick: diff => { S = newState(newMeta(), diff); addLog(`Novo jogo no modo ${DIFFS[diff].icon} ${DIFFS[diff].nome}.`, 'warn'); save(); },
    });
  };
  $('diff-chip').onclick = changeDifficulty;
}

function render() {
  const r = rates();
  for (const k in RES) {
    $('r-' + k).textContent = fmt(S.res[k]);
    const el = $('rr-' + k);
    el.textContent = fmtRate(r[k]);
    el.className = 'rate ' + (r[k] > 0.001 ? 'pos' : r[k] < -0.001 ? 'neg' : '');
  }
  $('r-hope').textContent = S.meta.hope;
  $('diff-chip').textContent = `${D().icon} ${D().nome}`;
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
  info += `<br>Consumo: ${fmt(home() * foodPer())} comida/s`;
  if (S.starve > 0) info += `<br><span class="bad-text">⚠ Sem comida! Alguém morrerá em ${Math.ceil(STARVE_TIME - S.starve)}s</span>`;
  else if (r.comida < 0) info += `<br><span class="warn-text">⚠ A comida está acabando: coloque mais forrageiros</span>`;
  $('surv-info').innerHTML = info;

  const sg = scavGain();
  $('btn-scavenge').textContent = `🔍 Vasculhar (+${sg.comida} 🥫 +${sg.sucata} 🔩)`;

  const rc = recruitCost();
  const full = S.survivors >= maxSurv();
  $('btn-recruit').textContent = full ? '🧍 Lotado (construa barracas)' : `🧍 Recrutar (${RES.comida.icon} ${rc})`;
  $('btn-recruit').disabled = full || S.res.comida < rc;

  for (const k in JOBS) {
    $('jc-' + k).textContent = S.jobs[k];
    $('ja-' + k).disabled = idle() <= 0;
    $('js-' + k).disabled = S.jobs[k] <= 0;
  }

  for (const k in BUILD) {
    const c = buildCost(k);
    $('bl-' + k).textContent = S.build[k] ? ` nv. ${S.build[k]}` : '';
    $('bn-' + k).textContent = S.build[k] ? `Atual: ${BUILD_FX[k](S.build[k])}` : '';
    $('bb-' + k).textContent = S.build[k] ? `Melhorar para nv. ${S.build[k] + 1}` : 'Construir';
    $('bc-' + k).innerHTML = costHtml(c);
    $('bb-' + k).disabled = !canAfford(c);
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
    <div class="stat"><span>🛡️ ${S.jobs.guarda} guardas · 🗼 ${S.build.torre} torres</span><span>☠ ${fmt(S.kills)} · 🏆 onda ${S.best}</span></div>`;

  $('btn-repair').textContent = `🔨 Reparar muro (${RES.sucata.icon} ${REPAIR_COST})`;
  $('btn-repair').disabled = S.res.sucata < REPAIR_COST || S.wallHp >= maxWall();

  const scale = (1 + 0.08 * (S.wave - 1)) * hopeMult();
  for (const k in EXPED) {
    const L = EXPED[k], locked = S.best + 1 < L.unlock, n = expSel[k];
    $('er-' + k).classList.toggle('locked', locked);
    $('en-' + k).textContent = n;
    if (locked) {
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
    <div class="stat"><span>Bônus de produção permanente</span><span>+${Math.round(S.meta.hopeTotal * 3)}%</span></div>`;
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

  if (logDirty) {
    $('log').innerHTML = S.log.map(l => `<li class="${l.type}">${l.text}</li>`).join('');
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
    `✨ Esperança ×${fmt(d.hope)} · 👹 Abominação 💵 ${d.bossCash}`,
  ];
}

function chooseDifficulty({ title, sub, cancel, onPick }) {
  const modal = $('modal');
  $('modal-title').innerHTML = title;
  $('modal-sub').innerHTML = sub;
  $('diff-list').innerHTML = Object.entries(DIFFS).map(([k, d]) => `
    <button class="diff-card ${S && S.diff === k ? 'current' : ''}" data-diff="${k}" style="--c:${d.color}">
      <div class="diff-name">${d.icon} ${d.nome}</div>
      <div class="diff-desc">${d.desc}</div>
      <ul>${diffStats(k).map(s => `<li>${s}</li>`).join('')}</ul>
    </button>`).join('');
  $('modal-cancel').style.display = cancel ? '' : 'none';
  modalOpen = true;
  const close = () => { modal.classList.add('hidden'); modalOpen = false; };
  $('modal-cancel').onclick = close;
  $('diff-list').querySelectorAll('.diff-card').forEach(b => {
    b.onclick = () => {
      close();
      onPick(b.dataset.diff);
      S.meta.diffChosen = true;
      save();
      render();
    };
  });
  modal.classList.remove('hidden');
}

function changeDifficulty() {
  chooseDifficulty({
    title: 'Mudar dificuldade',
    sub: `Mudar a dificuldade <b>recomeça a cidade atual do zero</b>. Você mantém Esperança, cash, conquistas e melhorias permanentes. Dificuldade atual: <b>${D().icon} ${D().nome}</b>.`,
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
