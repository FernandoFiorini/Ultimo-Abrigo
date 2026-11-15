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
  return `<p class="hint">A skin troca a roupa do líder (algumas tingem o cabelo) e vale para todos os seus saves. Vença (encontre a Cura) para liberar mais.</p>
    <div class="skin-list">${cards}</div>${custom}`;
}
function bindSkinPicker(root) {
  const paint = () => root.querySelectorAll('canvas[data-prev]').forEach(c => {
    const k = c.dataset.prev;
    Scene.portrait(c, Profile.look(null, k));
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
// ---------- personagem do líder: sexo, pele, cabelo, cor do cabelo, barba ----------
// a: objeto da aparência (editado no lugar) · onChange: chamado a cada mudança
function lookEditorHtml(a) {
  const sw = (list, key) => list.map((c, i) => `<button class="lk-sw${a[key] === i ? ' on' : ''}" data-lk="${key}:${i}" style="--c:rgb(${c})" title="${key === 'skin' ? 'Tom de pele' : 'Cor do cabelo'} ${i + 1}"></button>`).join('');
  const seg = (obj, key, lab = v => v.nome || v) => Object.entries(obj).map(([k, v]) => `<button class="${a[key] === k ? 'on' : ''}" data-lk="${key}:${k}">${lab(v)}</button>`).join('');
  return `<div class="look-ed">
    <canvas class="look-prev" width="96" height="120" aria-label="Prévia do personagem"></canvas>
    <div class="look-opts">
      <div class="lk-row"><span>Sexo</span><div class="lk-seg">
        <button class="${a.sex !== 'f' ? 'on' : ''}" data-lk="sex:m">🧔 Masculino</button><button class="${a.sex === 'f' ? 'on' : ''}" data-lk="sex:f">👩 Feminino</button></div></div>
      <div class="lk-row"><span>Pele</span><div class="lk-sws">${sw(LOOK_SKINS, 'skin')}</div></div>
      <div class="lk-row"><span>Cabelo</span><div class="lk-seg">${seg(LOOK_STYLES, 'style')}</div></div>
      <div class="lk-row"><span>Cor do cabelo</span><div class="lk-sws">${sw(LOOK_HAIRS, 'hair')}</div></div>
      ${a.sex !== 'f' ? `<div class="lk-row"><span>Rosto</span><div class="lk-seg">${seg(LOOK_FACES, 'face')}</div></div>` : ''}
    </div></div>`;
}
function bindLookEditor(root, a, onChange) {
  const paint = () => { const c = root.querySelector('.look-prev'); if (c) Scene.portrait(c, Profile.look(a)); };
  root.onclick = e => {
    const b = e.target.closest('[data-lk]');
    if (!b) return;
    const [k, v] = b.dataset.lk.split(':');
    if (k === 'sex' && a.sex !== v) {
      a.sex = v;
      if (v === 'f') { a.face = 'nada'; if (a.style === 'curto') a.style = 'comprido'; }
      else if (a.style === 'comprido' || a.style === 'coque') a.style = 'curto';
    } else a[k] = k === 'skin' || k === 'hair' ? +v : v;
    root.innerHTML = lookEditorHtml(a);
    paint();
    if (onChange) onChange(a);
  };
  paint();
  return paint;
}

// ---------- Visual: trocar skins sem ir à loja (armas do líder, personagem e roupa) ----------
// tab: 'armas' | 'lider' · focus: arma para destacar (vindo da aba Armas)
// quantas skins você tem (armas + roupas): passando do que já viu no Visual, o botão ganha a bolinha
const lockerOwned = () => ((S.meta.wsk && S.meta.wsk.own.length) || 0) + ((S.meta.osk && S.meta.osk.own.length) || 0);
const lockerNew = () => typeof S !== 'undefined' && S && S.meta && lockerOwned() > (S.meta.lockSeen || 0);
function showLocker(tab = 'armas', focus = null) {
  const inGame = typeof S !== 'undefined' && S && S.meta;
  if (inGame) S.meta.lockSeen = lockerOwned();
  if (!inGame) tab = 'lider';
  const weaponsHtml = () => Object.keys(LWEAPONS).map(w => {
    const W = LWEAPONS[w], all = WSkins.DEFS.filter(d => d.w === w), mine = all.filter(d => WSkins.owned(d.id)), cur = WSkins.equipped(w);
    const opt = (id, nome, rar) => `<button class="lk-opt${(cur ? cur.id : null) === id ? ' on' : ''}${rar ? ' r-' + rar : ''}" data-eq="${w}|${id || ''}" title="${nome}">
        <canvas width="${WSkins.SW}" height="${WSkins.SH}" data-prev="${w}|${id || ''}"></canvas><span>${nome}</span></button>`;
    // ainda não comprada: aparece bloqueada; o clique leva à loja, na aba desta arma
    const locked = d => `<button class="lk-opt locked r-${d.rar}" data-buy="${w}|${d.id}" title="Bloqueada: clique para ver na loja">
        <canvas width="${WSkins.SW}" height="${WSkins.SH}" data-prev="${w}|${d.id}"></canvas><span class="lk-lock">🔒</span><span>${d.nome}</span><small>🏷️ ${WSkins.PRICE[d.rar]} · ver na loja</small></button>`;
    return `<section class="lk-w${focus === w ? ' focus' : ''}" id="lkw-${w}">
      <div class="lk-wh"><b>${W.icon} ${W.nome}</b><span class="lvl">${cur ? `em uso: ${cur.nome}` : 'em uso: padrão'}</span>
        <span class="lvl lk-count">${mine.length}/${all.length} suas</span></div>
      <div class="lk-opts">${opt(null, 'Padrão')}${mine.map(d => opt(d.id, d.nome, d.rar)).join('')}${all.filter(d => !WSkins.owned(d.id)).map(locked).join('')}</div>
    </section>`;
  }).join('');
  const paint = root => root.querySelectorAll('canvas[data-prev]').forEach(c => { const [w, id] = c.dataset.prev.split('|'); WSkins.showcase(c, id || null, w, 0); });
  // roupas: uma linha (líder, grupo) ou uma linha por herói; padrão + as suas + bloqueadas (o clique leva à loja)
  const O = typeof OSkins !== 'undefined' ? OSkins : null;
  const outfitRow = (cat, k, title, list) => {
    const cur = O.equipped(cat, k), mine = list.filter(d => O.owned(d.id)), lockd = list.filter(d => !O.owned(d.id));
    const defName = cat === 'herois' ? 'Original' : cat === 'sobrev' ? 'Sem uniforme' : 'Roupa do perfil';
    const def = `<button class="lk-opt lk-o${cur ? '' : ' on'}" data-oeq="${cat}||${k || ''}"><div class="osk-prev one"><canvas width="48" height="48" data-odef="${cat}|${k || ''}"></canvas></div><span>${defName}</span></button>`;
    const opt = d => `<button class="lk-opt lk-o r-${d.rar}${cur === d ? ' on' : ''}" data-oeq="${cat}|${d.id}|${k || ''}">${O.previewHtml(d, 48)}<span>${d.nome}</span></button>`;
    const lock = d => `<button class="lk-opt lk-o locked r-${d.rar}" data-obuy="${cat}|${d.id}" title="Bloqueada: clique para ver na loja">${O.previewHtml(d, 48)}<span class="lk-lock">🔒</span><span>${d.nome}</span><small>🏷️ ${O.PRICE[d.rar]} · ver na loja</small></button>`;
    return `<section class="lk-w"><div class="lk-wh"><b>${title}</b><span class="lvl">em uso: ${cur ? cur.nome : defName.toLowerCase()}</span><span class="lvl lk-count">${mine.length}/${list.length} suas</span></div>
      <div class="lk-opts">${def}${mine.map(opt).join('')}${lockd.map(lock).join('')}</div></section>`;
  };
  const outfitsHtml = cat => !O ? '' : cat === 'herois'
    ? Object.keys(CHAMPS).filter(k => O.CATS.herois.some(d => d.k === k)).map(k => outfitRow('herois', k, `${CHAMPS[k].icon} ${CHAMPS[k].nome}`, O.CATS.herois.filter(d => d.k === k))).join('')
    : outfitRow(cat, null, cat === 'lider' ? '🛒 Roupas da loja' : '👥 Uniforme do grupo', O.CATS[cat]);
  const paintOutfits = rootEl => {
    if (!O || !rootEl) return;
    O.paintPreviews(rootEl);
    rootEl.querySelectorAll('canvas[data-odef]').forEach(c => {
      const [cat, k] = c.dataset.odef.split('|');
      const look = cat === 'herois' ? CHAMPS[k].look : cat === 'lider' ? Profile.look(null, Profile.get().skin) : { skin: [224, 176, 140], hair: [40, 30, 20], shirt: [96, 122, 64], pants: [90, 70, 50] };
      Scene.portrait(c, look);
    });
  };
  const owned = inGame ? WSkins.DEFS.filter(d => WSkins.owned(d.id)).length : 0;
  openDialog({
    title: '🎨 Visual',
    staticBody: true, plain: true, wide: true,
    body: `<div class="tabs set-tabs lk-tabs" role="tablist">
        ${inGame ? `<button class="tab${tab === 'armas' ? ' active' : ''}" data-ltab="armas">🔫 Armas <small>(${owned} skin${owned === 1 ? '' : 's'})</small></button>` : ''}
        <button class="tab${tab === 'lider' ? ' active' : ''}" data-ltab="lider">🧍 Personagem e roupa</button>
        ${inGame && O ? `<button class="tab${tab === 'sobrev' ? ' active' : ''}" data-ltab="sobrev">👥 Grupo</button><button class="tab${tab === 'herois' ? ' active' : ''}" data-ltab="herois">⭐ Heróis</button>` : ''}
      </div>
      ${inGame ? `<div class="lk-pane" data-lpane="armas"${tab === 'armas' ? '' : ' hidden'}>
        <p class="hint">Clique numa skin para usar. As 🔒 bloqueadas ainda não são suas: o clique leva à loja, na aba da arma. Atalho: <b class="hk">(K)</b>.</p>
        <div id="lk-weapons">${weaponsHtml()}</div></div>` : ''}
      <div class="lk-pane" data-lpane="lider"${tab === 'lider' ? '' : ' hidden'}>
        ${inGame ? `<h3 class="look-h">🧍 Seu personagem <small>(neste save)</small></h3><div id="look-root">${lookEditorHtml(S.meta.look || (S.meta.look = Profile.lastLook()))}</div>
        ${O ? `<div class="lk-outfits" data-ocat="lider">${outfitsHtml('lider')}</div>` : ''}
        <h3 class="look-h">👕 Roupas de vitória</h3>` : ''}<div id="skin-root">${skinPickerHtml()}</div>
      </div>
      ${inGame && O ? `<div class="lk-pane" data-lpane="sobrev"${tab === 'sobrev' ? '' : ' hidden'}><p class="hint">O uniforme vale para todo o grupo no cenário; cada função continua com um detalhe próprio.</p><div class="lk-outfits" data-ocat="sobrev">${outfitsHtml('sobrev')}</div></div>
      <div class="lk-pane" data-lpane="herois"${tab === 'herois' ? '' : ' hidden'}><p class="hint">Trajes alternativos dos heróis de campo: o rosto e o que identifica cada um ficam; só a roupa muda.</p><div class="lk-outfits" data-ocat="herois">${outfitsHtml('herois')}</div></div>` : ''}`,
    onMount: () => {
      const body = $('dialog-body');
      bindSkinPicker($('skin-root'));
      if ($('look-root')) bindLookEditor($('look-root'), S.meta.look, a => { Profile.setLastLook(a); bindSkinPicker($('skin-root')); save(); });
      const wr = $('lk-weapons');
      if (wr) {
        paint(wr);
        if (focus && $('lkw-' + focus)) $('lkw-' + focus).scrollIntoView({ block: 'center' });
        wr.onclick = e => {
          const eq = e.target.closest('[data-eq]'), sh = e.target.closest('[data-buy]');
          if (eq) {
            const [w, id] = eq.dataset.eq.split('|');
            WSkins.setEquip(w, id || null);
            const sc = wr.scrollTop; wr.innerHTML = weaponsHtml(); paint(wr); wr.scrollTop = sc;
            save(); render();
          } else if (sh) {
            // bloqueada: vai para a loja, na aba da arma, com a skin em destaque
            const [w, id] = sh.dataset.buy.split('|');
            dialogEsc();
            WSkins.setCat('armas'); WSkins.setTab(w); WSkins.setRar('all'); WSkins.spotlight(id);
            if (window.openShop) openShop('skins');
            render();
          }
        };
      }
      body.querySelectorAll('.lk-outfits').forEach(box => {
        paintOutfits(box);
        box.onclick = e => {
          const eq = e.target.closest('[data-oeq]'), bu = e.target.closest('[data-obuy]');
          if (eq) {
            const [cat, id, k] = eq.dataset.oeq.split('|');
            if (id) { if (O.equipped(cat, k || undefined) !== O.byId[id]) O.equip(id, true); }
            else O.unequip(cat, k || undefined);
            box.innerHTML = outfitsHtml(box.dataset.ocat); paintOutfits(box);
            if (cat === 'lider') bindSkinPicker($('skin-root'));
            save(); render();
          } else if (bu) {
            const [cat, id] = bu.dataset.obuy.split('|');
            dialogEsc();
            WSkins.setCat(cat); WSkins.spotlight(id);
            if (window.openShop) openShop('skins');
            render();
          }
        };
      });
      body.querySelector('.lk-tabs').onclick = e => {
        const t = e.target.closest('[data-ltab]');
        if (!t) return;
        body.querySelectorAll('[data-ltab]').forEach(b => b.classList.toggle('active', b === t));
        body.querySelectorAll('[data-lpane]').forEach(p => { p.hidden = p.dataset.lpane !== t.dataset.ltab; });
      };
    },
    cancel: 'Fechar',
  });
}

function showSkins() { showLocker('lider'); }

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

// ---------- cena do menu: o abrigo à noite, ao vivo (pixel art desenhada em código, como o resto do jogo) ----------
const MenuScene = (() => {
  let cv, ctx, W = 320, H = 180, raf = 0, last = 0, t = 0, built = false;
  let far = [], near = [], stars = [], zs = [], ash = [], embers = [], leader = null;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const R = (c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  function resize() {
    const k = Math.max(2, Math.floor(innerHeight / 170));
    W = Math.ceil(innerWidth / k); H = Math.ceil(innerHeight / k);
    cv.width = W; cv.height = H;
    build();
  }
  const GY = () => Math.round(H * 0.8);                 // chão
  const SX = () => Math.round(W * 0.6);                 // abrigo
  function build() {
    const gy = GY();
    far = []; near = []; stars = [];
    for (let x = -10; x < W + 10;) { const w = rnd(10, 26), h = rnd(H * 0.2, H * 0.5); far.push({ x, w, h, win: [] }); for (let i = 0; i < w * h / 70; i++) far[far.length - 1].win.push([rnd(2, w - 3) | 0, rnd(3, h - 4) | 0, Math.random()]); x += w + rnd(-2, 3); }
    for (let x = -10; x < W + 10;) { const w = rnd(16, 38), h = rnd(H * 0.12, H * 0.32); near.push({ x, w, h, jag: Math.random() < 0.5 }); x += w + rnd(4, 18); }
    for (let i = 0; i < W * H / 260; i++) stars.push([rnd(0, W) | 0, rnd(0, gy * 0.55) | 0, Math.random() * 6]);
    zs = [];
    for (let i = 0; i < Math.max(4, W / 55); i++) zs.push({ x: rnd(SX() + 60, W + 120), sp: rnd(2.5, 6), ph: Math.random() * 6, h: rnd(7, 9) | 0 });
    ash = []; for (let i = 0; i < W * H / 500; i++) ash.push({ x: rnd(0, W), y: rnd(0, H), v: rnd(4, 10), d: rnd(-3, 3) });
    // o seu personagem, desenhado pela cena do jogo, em pé no telhado
    leader = null;
    try {
      if (typeof Scene !== 'undefined' && typeof Profile !== 'undefined') {
        const c = document.createElement('canvas'); c.width = 16; c.height = 24;
        Scene.portrait(c, Profile.look(Profile.lastLook()));
        leader = c;
      }
    } catch (e) { leader = null; }
    built = true;
  }

  function draw(dt) {
    t += dt;
    const gy = GY(), sx = SX();
    // céu: noite com o horizonte vermelho da cidade queimando
    const g = ctx.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, '#07070d'); g.addColorStop(0.55, '#141020'); g.addColorStop(1, '#3a1420');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, gy);
    for (const [x, y, p] of stars) if (Math.sin(t * 1.3 + p) > -0.3) R(Math.sin(t * 2 + p) > 0.7 ? '#e8e4d0' : '#7a768a', x, y);
    // lua com halo
    const mx = Math.round(W * 0.82), my = Math.round(H * 0.17), mr = Math.max(6, Math.round(H * 0.05));
    const halo = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 4); halo.addColorStop(0, 'rgba(230,220,190,0.18)'); halo.addColorStop(1, 'rgba(230,220,190,0)');
    ctx.fillStyle = halo; ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    ctx.fillStyle = '#d8d2bc'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    R('#b8b09a', mx - 2, my - 1, 2, 2); R('#b8b09a', mx + 2, my + 2, 2, 1); R('#c4bca6', mx - 1, my + 3, 1, 1);
    // farol do abrigo varrendo o céu
    const ang = -Math.PI / 2 + Math.sin(t * 0.35) * 0.9, bx = sx + 6, by = gy - 30;
    ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#fff4c8'; ctx.beginPath(); ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(ang - 0.09) * H * 1.4, by + Math.sin(ang - 0.09) * H * 1.4); ctx.lineTo(bx + Math.cos(ang + 0.09) * H * 1.4, by + Math.sin(ang + 0.09) * H * 1.4); ctx.closePath(); ctx.fill(); ctx.restore();
    // prédios ao longe, com janelas que às vezes piscam
    for (const b of far) { R('#1a1424', b.x, gy - b.h, b.w, b.h); for (const [wx, wy, p] of b.win) if (p < 0.35 && Math.sin(t * 0.5 + p * 40) > -0.6) R(p < 0.12 ? '#c89a4a' : '#5a4a3a', b.x + wx, gy - b.h + wy); }
    // névoa
    ctx.globalAlpha = 0.18; for (let i = 0; i < 3; i++) { const y = gy - 14 - i * 9, off = (t * (3 + i * 2)) % W; ctx.fillStyle = '#3a2a3a'; ctx.fillRect(-off, y, W, 5); ctx.fillRect(W - off, y, W, 5); } ctx.globalAlpha = 1;
    for (const b of near) { R('#0e0c14', b.x, gy - b.h, b.w, b.h); if (b.jag) { R('#07070d', b.x + b.w * 0.3, gy - b.h, b.w * 0.3, 3); } }
    // chão e rua
    R('#100f0c', 0, gy, W, H - gy); R('#1a1814', 0, gy, W, 1);
    for (let x = (-(t * 0) % 16); x < W; x += 16) R('#2a2620', x + sx + 40, gy + Math.round((H - gy) * 0.45), 7, 1);
    // abrigo: prédio, placa, sacos de areia, arame no telhado
    const aw = 50, ah = 28, ax = sx - aw / 2 | 0, ay = gy - ah;
    R('#2a2622', ax, ay, aw, ah); R('#3a342e', ax, ay, aw, 2); R('#1a1714', ax - 2, ay - 2, aw + 4, 2);
    for (let x = ax; x < ax + aw; x += 3) R('#5a5a5a', x, ay - 4, 1, 2);
    R('#5a1a14', ax + 12, ay + 5, 26, 8);
    // placa "ABRIGO" em fonte de pixel 3x5
    const F3 = { A: '010101111101101', B: '110101110101110', R: '110101110101101', I: '111010010010111', G: '011100101101011', O: '010101101101010' };
    [...'ABRIGO'].forEach((ch, i) => [...F3[ch]].forEach((b, j) => { if (b === '1') R('#ff6a4a', ax + 13 + i * 4 + (j % 3), ay + 6 + Math.floor(j / 3)); }));
    const lit = 0.75 + 0.25 * Math.sin(t * 7) * Math.sin(t * 3.1);
    R(`rgba(255,190,90,${lit})`, ax + 5, ay + 15, 4, 4); R(`rgba(255,190,90,${lit * 0.8})`, ax + 41, ay + 15, 4, 4);
    R('#1a1410', ax + 21, ay + 16, 8, 12);
    for (let i = 0; i < 5; i++) R('#5a4e38', ax + aw + 1 + (i % 3) * 4, gy - 3 - Math.floor(i / 3) * 3, 4, 3);
    // muro à direita do abrigo
    R('#3a3630', ax + aw + 14, gy - 16, 4, 16); R('#4a443c', ax + aw + 14, gy - 16, 4, 1);
    // o seu personagem no telhado
    if (leader) ctx.drawImage(leader, ax + aw / 2 - 8 | 0, ay - 2 - 23);
    // fogueira na frente do abrigo
    const fx = ax - 12, fy = gy - 1, fl = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 7);
    const glow = ctx.createRadialGradient(fx, fy - 3, 1, fx, fy - 3, 34 * fl); glow.addColorStop(0, 'rgba(255,150,60,0.35)'); glow.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = glow; ctx.fillRect(fx - 40, fy - 40, 80, 50);
    R('#3a2a1a', fx - 4, fy, 9, 1); R('#ff8a2a', fx - 2, fy - 3 * fl, 5, 3); R('#ffd060', fx - 1, fy - 4 * fl, 3, 3); R('#fff0b0', fx, fy - 3, 1, 2);
    if (!reduce() && Math.random() < dt * 8) embers.push({ x: fx + rnd(-2, 2), y: fy - 4, vx: rnd(-3, 3), vy: rnd(-14, -6), l: rnd(0.8, 1.6) });
    for (const e of embers) { e.x += e.vx * dt; e.y += e.vy * dt; e.l -= dt; ctx.globalAlpha = Math.max(0, Math.min(1, e.l)); R(e.l > 0.6 ? '#ffc040' : '#c84a10', e.x, e.y); }
    ctx.globalAlpha = 1; embers = embers.filter(e => e.l > 0);
    // zumbis chegando pela direita, até o muro
    const wall = ax + aw + 19;
    for (const z of zs) {
      if (!reduce()) z.x -= z.sp * dt;
      if (z.x < wall) z.x = W + rnd(10, 120);
      const step = Math.sin(t * z.sp * 1.4 + z.ph) > 0, x = Math.round(z.x), top = gy - z.h;
      R('#0b0b0a', x, top + 3, 3, z.h - 5); R('#0b0b0a', x, top, 3, 3);
      R('#0b0b0a', x - 2, top + 4, 2, 1);                         // braço esticado para o abrigo
      R('#0b0b0a', step ? x : x + 1, gy - 2, 1, 2); R('#0b0b0a', step ? x + 2 : x + 1, gy - 2, 1, 2);
      R(Math.sin(t * 2 + z.ph) > -0.8 ? '#ff3a2a' : '#5a1410', x, top + 1);
    }
    // cinzas caindo
    for (const a of ash) { if (!reduce()) { a.y += a.v * dt; a.x += (a.d + Math.sin(t + a.y * 0.1) * 2) * dt; } if (a.y > H) { a.y = -2; a.x = rnd(0, W); } R('rgba(200,190,180,0.35)', a.x, a.y); }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    draw(dt);
    if (!reduce()) raf = requestAnimationFrame(frame);
  }
  function start() {
    cv = document.getElementById('mm-scene');
    if (!cv) return;
    ctx = cv.getContext('2d');
    resize();
    if (!start.bound) { addEventListener('resize', () => { if (raf || reduce()) { resize(); if (reduce()) draw(0); } }); start.bound = true; }
    cancelAnimationFrame(raf); last = performance.now();
    if (reduce()) draw(0); else raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  const refresh = () => { if (cv) build(); };   // o personagem mudou
  return { start, stop, refresh };
})();

// Logo "VOIDFALL" em pixel art (5×7 por letra), com escorridos de tinta
const LOGO_GLYPHS = {
  V: ['10001', '10001', '10001', '10001', '01010', '01010', '00100'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
};
function drawLogo(c, word = 'VOIDFALL') {
  const x0 = 1, y0 = 1, cw = 6, ctx = c.getContext('2d');
  c.width = word.length * cw + 2; c.height = 12;
  ctx.clearRect(0, 0, c.width, c.height);
  const ROWS = ['#d8f58a', '#b8e85a', '#9ad83a', '#86c832', '#6fb02a', '#5a9622', '#4a7e1c'];
  const px = [];
  [...word].forEach((ch, i) => (LOGO_GLYPHS[ch] || []).forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') px.push([x0 + i * cw + x, y0 + y, y]); })));
  ctx.fillStyle = '#0a1406'; for (const [x, y] of px) ctx.fillRect(x + 1, y + 1, 1, 1);
  for (const [x, y, r] of px) { ctx.fillStyle = ROWS[r]; ctx.fillRect(x, y, 1, 1); }
  // escorridos embaixo das letras (sempre os mesmos para a mesma palavra)
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // só nas letras de perna reta (I, F, A, L): embaixo do V viraria Y e do D viraria Q; e curtos, para não atrapalhar a leitura
  const base = new Set();[...word].forEach((ch, i) => { const r = (LOGO_GLYPHS[ch] || [])[6] || ''; if ('IFAL'.includes(ch)) [...r].forEach((b, x) => { if (b === '1') base.add(x0 + i * cw + x); }); });
  for (const x of base) if (rnd() < 0.3) { const n = 1 + Math.floor(rnd() * 2); ctx.fillStyle = '#4a7e1c'; ctx.fillRect(x, y0 + 7, 1, n); ctx.fillStyle = '#3a6a14'; ctx.fillRect(x, y0 + 6 + n, 1, 1); }
}

// Mensagens do rádio na tela inicial (uma por vez, datilografadas)
const RADIO_LINES = [
  '...se alguém estiver ouvindo: a horda chega ao anoitecer. Mantenham o fogo aceso.',
  '...aqui é o abrigo. Temos comida para mais uma noite. Talvez duas.',
  '...os laboratórios do centro ainda têm amostras. Quem achar a Cura, responda.',
  '...não abram o portão para quem tem o braço enfaixado. Repito: não abram.',
  '...helicóptero de evacuação depois da décima onda. Aguentem firme.',
  '...os grandões não caem com pedra. Guardem a munição para eles.',
];

// ---------- menu principal ----------
const Menu = (() => {
  let screen = 'home', pick = { slot: 1, diff: 'normal', name: '', look: null };
  const box = () => $('mm-box');

  function show(s = 'home') {
    $('main-menu').classList.remove('hidden');
    modalOpen = true;   // bloqueia os atalhos do jogo por trás
    screen = s;
    draw();
    MenuScene.start();
  }
  function hide() { $('main-menu').classList.add('hidden'); modalOpen = false; MenuScene.stop(); clearTimeout(txT); }

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
        <div class="mm-radio"><span class="mm-rec">● REC</span> Rádio do Abrigo · 87,3 FM</div>
        <h1 class="mm-logo"><canvas id="mm-logo" aria-label="Voidfall"></canvas></h1>
        <p class="mm-tx" id="mm-tx" aria-live="polite"></p>
        <nav class="mm-list" aria-label="Menu principal">
          <button class="mm-go mm-cont" data-go="continue" ${L && !L.broken ? '' : 'disabled'}><span>Continuar</span>
            ${L && !L.broken ? `<small>Espaço ${L.i} · ${escHtml(L.name)} · ${diffTag(L.diff)} · Cidade ${L.city}, onda ${L.wave}</small>` : '<small>Nenhum jogo salvo</small>'}</button>
          <button class="mm-go" data-go="new"><span>Novo jogo</span></button>
          <button class="mm-go" data-go="load" ${any ? '' : 'disabled'}><span>Carregar</span></button>
          <button class="mm-go" data-go="hall"><span>Hall da Fama</span></button>
          <button class="mm-go" data-go="skins"><span>Skins</span></button>
          <button class="mm-go" data-go="settings"><span>Configurações</span></button>
          <button class="mm-go" data-go="credits"><span>Sobre</span></button>
        </nav>
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
      // espaços (em lista) e nome à esquerda, personagem à direita: a tela cabe sem rolagem
      return `<h2>✨ Novo jogo</h2>
        <div class="new-grid">
          <div class="new-left">
            <div class="opt-label">Espaço de salvamento</div>
            <div class="slot-pick list">${slots.map((x, i) => `
              <button class="${pick.slot === i + 1 ? 'on' : ''}" data-slot="${i + 1}"><b>Espaço ${i + 1}</b>
                <small>${x ? `${escHtml(x.name)} · ${DIFFS[x.diff] ? DIFFS[x.diff].icon : ''} <span class="bad-text">será substituído</span>` : 'vazio'}</small></button>`).join('')}</div>
            <label class="opt-label" for="mm-name">Seu nome <b class="req" title="Obrigatório">*</b> <small>(aparece no Hall da Fama se você vencer)</small></label>
            <input id="mm-name" class="mm-name" maxlength="${NAME_MAX}" placeholder="Digite seu nome" value="${escHtml(pick.name)}" autocomplete="off" required aria-required="true" aria-describedby="mm-name-err">
            <div id="mm-name-err" class="mm-err" hidden>Digite um nome para começar.</div>
          </div>
          <div class="new-right">
            <div class="opt-label">Seu personagem <small>(a roupa vem da skin escolhida)</small></div>
            <div id="mm-look">${lookEditorHtml(pick.look || (pick.look = Profile.lastLook()))}</div>
          </div>
        </div>
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
      return `<h2>📜 Sobre</h2>
        <div class="credits">
          <canvas id="mm-logo" class="mm-logo-sm" aria-label="Voidfall"></canvas>
          <p><b>Criação, design e programação</b><br>Fernando Fiorini</p>
          <p><b>Arte e trilha sonora</b><br>Pixel art desenhada em código no Canvas 2D<br>Música e efeitos sintetizados em tempo real com a Web Audio API</p>
          <p><b>Tecnologia</b><br>JavaScript puro, sem frameworks, bibliotecas ou arquivos de imagem e áudio</p>
          
          <p><b>Agradecimentos</b><br>A todos que testaram, deram ideias e sobreviveram mais uma noite.${HALL_OF_FAME.length ? `<br>E às lendas do Hall da Fama: ${HALL_OF_FAME.map(w => escHtml(w.n)).join(', ')}.` : ''}</p>

          <p class="thanks"><b>Agradecimento especial</b><br><span class="thanks-names">Erik · Roney · Valde</span><br>que ajudaram a testar e a desenvolver as funcionalidades do jogo.</p>

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

  // rádio: datilografa uma mensagem, espera e passa para a próxima
  let txT = 0, txI = Math.floor(Math.random() * RADIO_LINES.length);
  function radio() {
    clearTimeout(txT);
    const el = $('mm-tx');
    if (!el) return;
    const line = RADIO_LINES[txI++ % RADIO_LINES.length];
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = line; return; }
    let n = 0;
    const type = () => {
      if (!$('mm-tx')) return;
      el.textContent = line.slice(0, ++n);
      txT = n < line.length ? setTimeout(type, 28 + Math.random() * 40) : setTimeout(radio, 5200);
    };
    type();
  }

  function draw() {
    box().innerHTML = SCREENS[screen]();
    box().classList.toggle('narrow', ['death', 'credits'].includes(screen));
    box().classList.toggle('home', screen === 'home');
    $('main-menu').classList.toggle('at-home', screen === 'home');
    box().scrollTop = 0;
    const lg = $('mm-logo'); if (lg) drawLogo(lg);
    if (screen === 'home') radio(); else clearTimeout(txT);
    if (screen === 'skins') bindSkinPicker($('skin-root'));
    if (screen === 'new') {
      const n = $('mm-name');
      n.oninput = () => {
        pick.name = n.value;
        if (n.value.trim()) { n.classList.remove('err'); $('mm-name-err').hidden = true; }
      };
      if (!pick.look) pick.look = Profile.lastLook();
      bindLookEditor($('mm-look'), pick.look, a => { Profile.setLastLook(a); MenuScene.refresh(); });
    }
  }

  function startNew() {
    // nome obrigatório: sem ele, avisa e devolve o foco ao campo
    if (!String(pick.name || '').replace(/[\u0000-\u001f<>]/g, '').trim()) {
      const n = $('mm-name'), err = $('mm-name-err');
      if (err) err.hidden = false;
      if (n) { n.classList.add('err'); n.focus(); }
      return;
    }
    const name = cleanName(pick.name), diff = pick.diff, slot = pick.slot;
    if (Slots.has(slot) && !confirm(`Substituir o save do espaço ${slot}? O progresso dele será perdido.`)) return;
    if (DIFFS[diff].permadeath && !confirm('No Apocalipse a morte é permanente: se todos morrerem, o save é APAGADO, sem volta. Começar mesmo assim?')) return;
    const st = newState(newMeta(), diff);
    Object.assign(st.meta, { player: name, runId: Slots.rid(), minDiff: diffRank(diff), diffChosen: true, look: { ...(pick.look || Profile.lastLook()) } });
    Profile.setLastLook(st.meta.look);
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
        case 'new': pick = { slot: Slots.firstFree() || Slots.last() || 1, diff: 'normal', name: pick.name, look: pick.look || Profile.lastLook() }; break;
        case 'start': startNew(); return;
        case 'reload': location.reload(); return;
        case 'settings': openSettings(); $('dialog').classList.add('over-menu'); return;   // a janela abre por cima do menu
      }
      screen = ds.go === 'continue' ? 'home' : ds.go;
      draw();
    } else if (ds.load) { hide(); startGame(+ds.load); }
    else if (ds.del) {
      const x = Slots.info(+ds.del);
      if (!confirm(`Apagar o save do espaço ${ds.del}${x ? ` (${x.name})` : ''}? Isso não pode ser desfeito.`)) return;
      Slots.remove(+ds.del);
      draw();
    } else if (ds.newin) { pick = { slot: +ds.newin, diff: 'normal', name: pick.name, look: pick.look || Profile.lastLook() }; screen = 'new'; draw(); }
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
