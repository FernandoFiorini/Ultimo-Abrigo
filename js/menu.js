'use strict';

const escHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const NAME_MAX = 16;
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, NAME_MAX) || 'Sobrevivente';
const fmtDate = t => t ? new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
const diffTag = k => { const d = DIFFS[k] || DIFFS.normal; return `<span class="mm-diff" style="--c:${d.color}">${d.icon} ${d.nome}</span>`; };

// ---------- skins do líder ----------
function skinPickerHtml() {
  const P = Profile.get();
  const cards = Object.entries(LEADER_SKINS).map(([k, s]) => {
    const open = Profile.unlocked(k);
    const how = s.diff === '*' ? 'Vença em qualquer dificuldade' : s.diff ? `Vença no ${DIFFS[s.diff].icon} ${DIFFS[s.diff].nome}` : 'Padrão';
    return `<button class="skin-card ${P.skin === k ? 'on' : ''}" data-skin="${k}" ${open ? '' : 'disabled'} title="${how}">
      <canvas width="72" height="72" data-prev="${k}"></canvas>
      <span class="skin-name">${s.icon} ${s.nome}</span>
      <span class="skin-how">${open ? (P.skin === k ? 'Em uso' : 'Liberada') : '🔒 ' + how}</span>
    </button>`;
  }).join('');
  const C = P.custom;
  const custom = Profile.unlocked('custom') ? `
    <div class="skin-custom" ${P.skin === 'custom' ? '' : 'hidden'}>
      <b>🎨 Monte a sua</b>
      <label>Camisa <input type="color" data-col="shirt" value="${C.shirt}"></label>
      <label>Calça <input type="color" data-col="pants" value="${C.pants}"></label>
      <label>Cabelo <input type="color" data-col="hair" value="${C.hair}"></label>
      <label>Capa <input type="color" data-col="cape" value="${C.cape}"></label>
      <label><input type="checkbox" data-col="crown" ${C.crown ? 'checked' : ''}> Coroa</label>
    </div>` : '';
  return `<p class="hint">A skin vale para o líder no telhado em todos os seus saves. Vença (encontre a Cura) para liberar mais.</p>
    <div class="skin-list">${cards}</div>${custom}`;
}
function bindSkinPicker(root) {
  const paint = () => root.querySelectorAll('canvas[data-prev]').forEach(c => {
    const k = c.dataset.prev;
    Scene.portrait(c, k === 'custom' ? customLook() : LEADER_SKINS[k]);
  });
  const customLook = () => {
    const c = Profile.get().custom, rgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    return { shirt: rgb(c.shirt), pants: rgb(c.pants), hair: rgb(c.hair), cape: rgb(c.cape), crown: !!c.crown };
  };
  root.onclick = e => {
    const b = e.target.closest('[data-skin]');
    if (!b || b.disabled) return;
    Profile.setSkin(b.dataset.skin);
    root.querySelectorAll('[data-skin]').forEach(x => {
      const on = x === b;
      x.classList.toggle('on', on);
      if (!x.disabled) x.querySelector('.skin-how').textContent = on ? 'Em uso' : 'Liberada';
    });
    const cu = root.querySelector('.skin-custom');
    if (cu) cu.hidden = b.dataset.skin !== 'custom';
  };
  root.oninput = e => {
    const k = e.target.dataset.col;
    if (!k) return;
    Profile.setCustom(k, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
    paint();
  };
  paint();
}
function showSkins() {
  openDialog({
    title: '🎨 Skin do líder',
    staticBody: true, plain: true,
    body: `<div id="skin-root">${skinPickerHtml()}</div>`,
    onMount: () => bindSkinPicker($('skin-root')),
    cancel: 'Fechar',
  });
}

// ---------- vitória ----------
const Victory = (() => {
  // Assinatura simples (FNV-1a). Não é segura contra quem lê o código, mas evita certificados digitados à mão.
  const SALT = 'ultimo-abrigo:cura';
  const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
  const b64 = s => { const b = new TextEncoder().encode(s); let bin = ''; for (const x of b) bin += String.fromCharCode(x); return btoa(bin); };
  const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));

  function certificate(entry) {
    const body = JSON.stringify(entry);
    return 'UAV1:' + b64(JSON.stringify({ ...entry, s: hash(body + SALT) }));
  }
  // Para o desenvolvedor: Victory.verify('UAV1:...') no console
  function verify(code) {
    try {
      const d = JSON.parse(unb64(String(code).trim().replace(/^UAV1:/, '')));
      const { s, ...entry } = d;
      const ok = s === hash(JSON.stringify(entry) + SALT) && !!DIFFS[entry.d];
      return { ok, entry, line: ok ? `  { n: ${JSON.stringify(entry.n)}, d: '${entry.d}', t: '${entry.t}' },` : null };
    } catch (e) { return { ok: false }; }
  }

  function win() {
    const m = S.meta, d = S.diff, D0 = DIFFS[d];
    if (!m.wins || typeof m.wins !== 'object') m.wins = {};
    const first = !m.wins[d];
    const entry = { n: m.player || 'Sobrevivente', d, t: new Date().toISOString().slice(0, 10), w: m.worlds || 1, c: m.city, k: m.stats.kills, id: m.runId };
    if (!first) { addLog(`👑 Mais uma vitória no ${D0.icon} ${D0.nome}. As recompensas dessa dificuldade já foram recebidas neste save.`, 'good'); return; }
    m.wins[d] = Date.now();
    const fresh = Profile.win({ n: entry.n, d, t: entry.t });
    const cash = VICTORY_CASH[d] || 0;
    m.cash += cash;
    addLog(`👑 VITÓRIA no ${D0.icon} ${D0.nome}! +💵 ${cash}. ${escHtml(entry.n)} agora aparece no abrigo como sobrevivente lendário.`, 'good');
    save();
    const code = certificate(entry);
    const issue = `${REPO_URL}/issues/new?title=${encodeURIComponent(`Hall da Fama: ${entry.n} (${D0.nome})`)}&body=${encodeURIComponent('Certificado de vitória:\n\n' + code)}`;
    openDialog({
      title: '👑 Vitória!',
      staticBody: true, plain: true,
      body: `<p class="event-text">A Cura foi encontrada no <b style="color:${D0.color}">${D0.icon} ${D0.nome}</b>. <b>${escHtml(entry.n)}</b> entra para a história de Voidfall.</p>
        <ul class="win-list">
          <li>💵 <b>+${cash} de cash</b> neste save</li>
          <li>🧍 Seu nome aparece num <b>sobrevivente lendário</b> na frente do abrigo, em todos os seus saves</li>
          ${fresh.length ? `<li>🎨 Skins liberadas: <b>${fresh.map(k => `${LEADER_SKINS[k].icon} ${LEADER_SKINS[k].nome}`).join(', ')}</b></li>` : ''}
          <li>🚩 Bandeira de troféu no telhado do abrigo</li>
          <li>🏆 Seu nome no <b>Hall da Fama</b> do menu principal</li>
        </ul>
        <p class="hint">Para aparecer no <b>Hall da Fama do site</b> (como NPC no abrigo de todos os jogadores), envie este certificado:</p>
        <textarea id="save-code" class="save-code" readonly spellcheck="false">${code}</textarea>
        <p class="hint"><a href="${issue}" target="_blank" rel="noopener">📨 Enviar certificado pelo GitHub</a> <span id="save-msg"></span></p>`,
      onMount: () => { $('save-code').onfocus = e => e.target.select(); },
      buttons: [
        { label: '📋 Copiar certificado', keep: true, onClick: () => copyCode(code) },
        { label: '🎨 Escolher skin', cls: 'primary', onClick: () => setTimeout(showSkins) },
      ],
      cancel: 'Fechar',
    });
  }

  return { win, verify, certificate };
})();

// ---------- menu principal ----------
const Menu = (() => {
  let screen = 'home', pick = { slot: 1, diff: 'normal', name: '' };
  const box = () => $('mm-box');

  function show(s = 'home') {
    $('main-menu').classList.remove('hidden');
    modalOpen = true;   // bloqueia os atalhos do jogo por trás
    screen = s;
    draw();
  }
  function hide() { $('main-menu').classList.add('hidden'); modalOpen = false; }

  function slotLine(x) {
    if (x.broken) return '<span class="bad-text">Save corrompido</span>';
    const won = Object.keys(x.wins || {}).filter(k => DIFFS[k]);
    return `Mundo ${x.world} · Cidade ${x.city} · onda ${x.wave} <small>(recorde ${x.best})</small> · 🧍 ${x.survivors}` +
      (won.length ? ` · 👑 ${won.map(k => DIFFS[k].icon).join('')}` : '');
  }

  const SCREENS = {
    home() {
      const last = Slots.last(), L = last && Slots.info(last);
      const any = Slots.list().some(Boolean);
      return `
        <div class="mm-title">☣ Voidfall</div>
        <div class="mm-sub">Sobreviva às hordas. Encontre a Cura.</div>
        <div class="mm-buttons">
          <button class="primary mm-big" data-go="continue" ${L && !L.broken ? '' : 'disabled'}>▶ Continuar
            ${L && !L.broken ? `<small>Espaço ${L.i} · ${escHtml(L.name)} · ${diffTag(L.diff)} · Cidade ${L.city}, onda ${L.wave}</small>` : '<small>Nenhum jogo salvo</small>'}</button>
          <button data-go="load" ${any ? '' : 'disabled'}>📂 Carregar</button>
          <button data-go="new">✨ Novo jogo</button>
          <button data-go="hall">🏆 Hall da Fama</button>
          <button data-go="skins">🎨 Skins</button>
          <button data-go="credits">📜 Créditos</button>
        </div>
        <div class="mm-foot">v${VERSION}</div>`;
    },
    load() {
      return `<h2>📂 Carregar</h2>
        <div class="slot-list">${Slots.list().map((x, i) => x ? `
          <div class="slot-card" style="--c:${DIFFS[x.diff].color}">
            <div class="slot-head"><b>Espaço ${i + 1} · ${escHtml(x.name)}</b> ${diffTag(x.diff)}</div>
            <div class="slot-info">${slotLine(x)}</div>
            <div class="slot-info"><small>Jogado em ${fmtDate(x.last)}</small></div>
            <div class="slot-actions">
              <button class="primary" data-load="${i + 1}" ${x.broken ? 'disabled' : ''}>Carregar</button>
              <button class="danger" data-del="${i + 1}">Apagar</button>
            </div>
          </div>` : `
          <div class="slot-card empty">
            <div class="slot-head"><b>Espaço ${i + 1}</b> <small>vazio</small></div>
            <div class="slot-actions"><button data-newin="${i + 1}">✨ Novo jogo aqui</button></div>
          </div>`).join('')}</div>
        <div class="mm-back"><button data-go="home">← Voltar</button></div>`;
    },
    new() {
      const slots = Slots.list();
      return `<h2>✨ Novo jogo</h2>
        <div class="opt-label">Espaço de salvamento</div>
        <div class="slot-pick">${slots.map((x, i) => `
          <button class="${pick.slot === i + 1 ? 'on' : ''}" data-slot="${i + 1}">Espaço ${i + 1}
            <small>${x ? `${escHtml(x.name)} · ${DIFFS[x.diff] ? DIFFS[x.diff].icon : ''} <span class="bad-text">será substituído</span>` : 'vazio'}</small></button>`).join('')}</div>
        <label class="opt-label" for="mm-name">Seu nome <small>(aparece no Hall da Fama se você vencer)</small></label>
        <input id="mm-name" class="mm-name" maxlength="${NAME_MAX}" placeholder="Sobrevivente" value="${escHtml(pick.name)}" autocomplete="off">
        <div class="opt-label">Dificuldade <small>(não dá para mudar depois)</small></div>
        <div class="diff-list">${diffCardsHtml(pick.diff)}</div>
        <div class="mm-back">
          <button data-go="home">← Voltar</button>
          <button class="primary" data-go="start">Começar ▶</button>
        </div>`;
    },
    hall() {
      const local = Profile.get().winners;
      const row = w => `<li>${diffTag(w.d)} <b>${escHtml(w.n)}</b> <small>${escHtml(w.t || '')}</small></li>`;
      return `<h2>🏆 Hall da Fama</h2>
        <p class="hint">Quem encontra a Cura entra para a história: o nome aparece aqui e num sobrevivente lendário na frente do abrigo.</p>
        <h3>🌍 Do site</h3>
        ${HALL_OF_FAME.length ? `<ul class="hall-list">${HALL_OF_FAME.map(row).join('')}</ul>` : '<p class="hint">Ninguém ainda. Seja o primeiro: vença e envie o seu certificado de vitória.</p>'}
        <h3>🏠 Deste navegador</h3>
        ${local.length ? `<ul class="hall-list">${local.map(row).join('')}</ul>` : '<p class="hint">Nenhuma vitória ainda.</p>'}
        <div class="mm-back"><button data-go="home">← Voltar</button></div>`;
    },
    skins() {
      return `<h2>🎨 Skins do líder</h2><div id="skin-root">${skinPickerHtml()}</div>
        <div class="mm-back"><button data-go="home">← Voltar</button></div>`;
    },
    credits() {
      return `<h2>📜 Créditos</h2>
        <div class="credits">
          <div class="mm-title small">☣ Voidfall</div>
          <p><b>Criação, design e programação</b><br>Fernando Fiorini</p>
          <p><b>Arte e trilha sonora</b><br>Pixel art desenhada em código no Canvas 2D<br>Música e efeitos sintetizados em tempo real com a Web Audio API</p>
          <p><b>Tecnologia</b><br>JavaScript puro, sem frameworks, bibliotecas ou arquivos de imagem e áudio</p>
          <p><b>Agradecimentos</b><br>A todos que testaram, deram ideias e sobreviveram mais uma noite. (Roney)${HALL_OF_FAME.length ? `<br>E às lendas do Hall da Fama: ${HALL_OF_FAME.map(w => escHtml(w.n)).join(', ')}.` : ''}</p>
          <p><a href="${REPO_URL}" target="_blank" rel="noopener">Código-fonte no GitHub</a></p>
          <p class="hint">v${VERSION}</p>
        </div>
        <div class="mm-back"><button data-go="home">← Voltar</button></div>`;
    },
    death() {
      const d = Slots.death || {};
      return `<div class="mm-title dead">💀 O abrigo caiu</div>
        <p class="death-text"><b>${escHtml(d.name)}</b> e o grupo resistiram até a <b>onda ${d.best || 0}</b> na cidade ${d.city || 1}${d.world > 1 ? ` do mundo ${d.world}` : ''}, com ${d.kills || 0} zumbis abatidos nesta cidade.</p>
        <p class="death-text">No <b style="color:${DIFFS.apocalipse.color}">🔥 Apocalipse</b> não há segunda chance. <b>Este save foi apagado.</b></p>
        <div class="mm-buttons"><button class="primary" data-go="reload">Voltar ao menu</button></div>`;
    },
  };

  function draw() {
    box().innerHTML = SCREENS[screen]();
    box().classList.toggle('narrow', ['home', 'death', 'credits'].includes(screen));
    box().scrollTop = 0;
    if (screen === 'skins') bindSkinPicker($('skin-root'));
    if (screen === 'new') {
      const n = $('mm-name');
      n.oninput = () => { pick.name = n.value; };
    }
  }

  function startNew() {
    const name = cleanName(pick.name), diff = pick.diff, slot = pick.slot;
    if (Slots.has(slot) && !confirm(`Substituir o save do espaço ${slot}? O progresso dele será perdido.`)) return;
    if (DIFFS[diff].permadeath && !confirm('No Apocalipse a morte é permanente: se todos morrerem, o save é APAGADO, sem volta. Começar mesmo assim?')) return;
    const st = newState(newMeta(), diff);
    Object.assign(st.meta, { player: name, runId: Slots.rid(), minDiff: diffRank(diff), diffChosen: true });
    st.log = [{ text: `${escHtml(name)} e mais ${st.survivors - 1} sobreviventes encontraram um armazém abandonado. A horda chega ao anoitecer. Prepare-se. (${DIFFS[diff].icon} ${DIFFS[diff].nome})`, type: 'warn' }];
    if (!Slots.write(slot, st)) { alert('Não foi possível salvar neste navegador (armazenamento cheio ou bloqueado).'); return; }
    hide();
    startGame(slot);
  }

  function onClick(e) {
    const t = e.target.closest('button');
    if (!t || t.disabled) return;
    const ds = t.dataset;
    if (ds.go) {
      switch (ds.go) {
        case 'continue': { const l = Slots.last(); if (l) { hide(); startGame(l); } return; }
        case 'new': pick = { slot: Slots.firstFree() || Slots.last() || 1, diff: 'normal', name: pick.name }; break;
        case 'start': startNew(); return;
        case 'reload': location.reload(); return;
      }
      screen = ds.go === 'continue' ? 'home' : ds.go;
      draw();
    } else if (ds.load) { hide(); startGame(+ds.load); }
    else if (ds.del) {
      const x = Slots.info(+ds.del);
      if (!confirm(`Apagar o save do espaço ${ds.del}${x ? ` (${x.name})` : ''}? Isso não pode ser desfeito.`)) return;
      Slots.remove(+ds.del);
      draw();
    } else if (ds.newin) { pick = { slot: +ds.newin, diff: 'normal', name: pick.name }; screen = 'new'; draw(); }
    else if (ds.slot) { pick.slot = +ds.slot; draw(); }
    else if (ds.diff) { pick.diff = ds.diff; box().querySelectorAll('.diff-card').forEach(c => c.classList.toggle('current', c === t)); }
  }

  function init() {
    $('main-menu').addEventListener('click', onClick);
    $('main-menu').addEventListener('keydown', e => {
      if (e.key === 'Escape' && screen !== 'home' && screen !== 'death') { screen = 'home'; draw(); }
      if (e.key === 'Enter' && e.target.id === 'mm-name') startNew();
    });
  }

  return { show, hide, init, death: () => show('death') };
})();
