'use strict';

const escHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const NAME_MAX = 16;
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, NAME_MAX) || 'Sobrevivente';
const fmtDate = t => t ? new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
const diffTag = k => { const d = DIFFS[k] || DIFFS.normal; return `<span class="mm-diff" style="--c:${d.color}">${d.icon} ${d.nome}</span>`; };

// ---------- skins do líder ----------
function skinPickerHtml() {
  const P = Profile.get();
  Podium.sync();
  const title = Podium.title();
  const cards = Object.entries(LEADER_SKINS).map(([k, s]) => {
    const open = Profile.unlocked(k);
    const how = s.podium ? `Fique em ${s.podium === 1 ? '1º lugar' : `${s.podium}º lugar ou melhor`} no ranking do Hall da Fama`
      : s.diff === '*' ? 'Vença em qualquer dificuldade' : s.diff ? `Vença no ${DIFFS[s.diff].icon} ${DIFFS[s.diff].nome}` : 'Padrão';
    // skins de pódio mostram o título único de quem as conquistou
    const lbl = s.podium && open && title ? title : 'Liberada';
    return `<button class="skin-card ${P.skin === k ? 'on' : ''} ${s.podium ? `podium-skin p${s.podium}` : ''}" data-skin="${k}" data-lbl="${escHtml(lbl)}" ${open ? '' : 'disabled'} title="${escHtml(how)}">
      <canvas width="72" height="72" data-prev="${k}"></canvas>
      <span class="skin-name">${s.icon} ${s.nome}</span>
      <span class="skin-how">${open ? (P.skin === k ? (s.podium ? `Em uso · ${escHtml(lbl)}` : 'Em uso') : escHtml(lbl)) : '🔒 ' + how}</span>
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
      const lbl = x.dataset.lbl || 'Liberada', pod = x.classList.contains('podium-skin');
      if (!x.disabled) x.querySelector('.skin-how').textContent = on ? (pod ? `Em uso · ${lbl}` : 'Em uso') : lbl;
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
      const { id, ...pub } = entry;   // o id do save não vai para o Hall da Fama
      return { ok, entry, line: ok ? `  ${JSON.stringify(pub)},` : null };
    } catch (e) { return { ok: false }; }
  }

  // dados do certificado a partir do save aberto (também usado pelo menu de debug para gerar um certificado de teste)
  function entryNow() {
    const m = S.meta, now = Date.now();
    return { n: m.player || 'Sobrevivente', d: S.diff, t: new Date(now).toISOString().slice(0, 10), ts: now, w: m.worlds || 1, c: m.city, k: m.stats.kills,
      h: Math.round((m.stats.time || 0) / 360) / 10, lost: m.fallen || 0, id: m.runId,
      r: m.runId ? hash(m.runId + ':hall') : undefined };   // marca pública do save: o jogo se reconhece no Hall da Fama (pódio e skins)
  }

  // arquivo do certificado (o jogador baixa e manda; o validador lê o código de dentro de qualquer texto)
  function download(entry, code = certificate(entry)) {
    const D = DIFFS[entry.d], slug = String(entry.n).normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'sobrevivente';
    const text = `Certificado de vitória do Voidfall\n\nNome: ${entry.n}\nDificuldade: ${D.nome}\nData: ${String(entry.t).split('-').reverse().join('/')}\n` +
      (entry.h != null ? `Tempo jogado: ${String(entry.h).replace('.', ',')}h\n` : '') + `\n${code}\n`;
    downloadFile(text, `voidfall-certificado-${slug}-${entry.d}.txt`);
  }
  // acha o certificado dentro de um texto qualquer (arquivo baixado, e-mail colado...)
  // O e-mail pode quebrar o código em várias linhas: junta os pedaços depois do UAV1: e fica com o maior trecho cuja assinatura confere
  const extract = text => {
    const m = String(text || '').match(/UAV1:\s*([A-Za-z0-9+/=]+(?:\s+[A-Za-z0-9+/=]+)*)/);
    if (!m) return String(text || '').trim();
    const parts = m[1].split(/\s+/);
    for (let n = parts.length; n >= 1; n--) { const c = 'UAV1:' + parts.slice(0, n).join(''); if (verify(c).ok) return c; }
    return 'UAV1:' + parts[0];
  };

  // Para o desenvolvedor: confere um certificado e aponta o que parece estranho (menu de debug › 🏆 Ranking)
  function check(code) {
    code = extract(code);
    const v = verify(code), warn = [];
    if (!v.ok) return { ...v, warn };
    const e = v.entry, D = DIFFS[e.d];
    if (e.h == null) warn.push('certificado antigo: sem tempo jogado (vai para o fim do ranking)');
    else if (e.h < 1) warn.push(`só ${fmt(e.h)}h de jogo até a Cura: muito rápido, confira`);
    if (e.ts && e.ts > Date.now() + 86400000) warn.push('data no futuro');
    if (!e.r) warn.push('sem a marca do save: o jogador não vai se reconhecer no ranking (pódio e skins)');
    if (e.k != null && e.k < 500) warn.push(`só ${fmt(e.k)} abates: pouco para quem chegou à Cura`);
    if (Slots.buried(e.id)) warn.push('esse save morreu no Apocalipse');
    if (HALL_OF_FAME.some(w => (w.r && e.r && w.r === e.r && w.d === e.d) || (w.n === e.n && w.d === e.d && w.t === e.t))) warn.push(`já está no Hall da Fama (${D.nome})`);
    return { ...v, warn };
  }

  // envio do certificado por e-mail (Web3Forms, a mesma chave do Reportar bug): chega com os dados, os avisos e a linha pronta
  const hasMailKey = () => typeof BUG_REPORT !== 'undefined' && !!BUG_REPORT.web3formsKey;
  async function send(entry, code = certificate(entry), test = false) {
    if (!hasMailKey()) throw new Error('sem chave');
    const D = DIFFS[entry.d], c = check(code);
    const L = [
      `${test ? '[TESTE] ' : ''}Nova vitória para o Hall da Fama do Voidfall`, '',
      `Nome: ${entry.n}`, `Dificuldade: ${D.nome}`, `Venceu em: ${String(entry.t).split('-').reverse().join('/')}`,
      `Tempo jogado: ${entry.h != null ? String(entry.h).replace('.', ',') + 'h' : '—'}`, `Abates: ${entry.k ?? '—'}`, `Perdidos: ${entry.lost ?? '—'}`,
      `Cidade ${entry.c || '?'}, mundo ${entry.w || 1}`, `Versão do jogo: v${VERSION}`, '',
      c.ok ? '✅ Assinatura conferida.' : '❌ A assinatura NÃO confere.',
      ...(c.warn.length ? ['', 'Confira:', ...c.warn.map(w => '- ' + w)] : []), '',
      'Linha para o HALL_OF_FAME (js/config.js):', c.ok ? c.line.trim() : '(nenhuma: certificado inválido)', '',
      'Certificado (para validar no menu de debug › 🏆 Ranking › 🔍 Validar certificado):', code,
    ];
    // o save do jogador vai junto, como backup (o validador guarda tudo num arquivo ao inserir no Hall)
    try { if (typeof S !== 'undefined' && S && typeof exportCode === 'function') L.push('', 'Save do jogador (backup; para abrir: Importar e colar este código):', exportCode()); } catch (e) { /* sem save */ }
    const r = await fetch('https://api.web3forms.com/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ access_key: BUG_REPORT.web3formsKey, subject: `${test ? '[TESTE] ' : ''}👑 Voidfall: ${entry.n} venceu no ${D.nome} (${entry.h != null ? String(entry.h).replace('.', ',') + 'h' : 'sem tempo'})`,
        from_name: entry.n || 'Jogador do Voidfall', message: L.join('\n') }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) throw new Error(j.message || `HTTP ${r.status}`);
  }

  function win() {
    const m = S.meta, d = S.diff, D0 = DIFFS[d];
    if (!m.wins || typeof m.wins !== 'object') m.wins = {};
    const first = !m.wins[d];
    const entry = entryNow();
    if (!first) { addLog(`👑 Mais uma vitória no ${D0.icon} ${D0.nome}. As recompensas dessa dificuldade já foram recebidas neste save.`, 'good'); return; }
    m.wins[d] = Date.now();
    const vfBefore = VFilter.list().filter(VFilter.unlocked);
    const fresh = Profile.win({ n: entry.n, d, t: entry.t, r: entry.r });
    const vfNew = VFilter.list().filter(k => VFilter.unlocked(k) && !vfBefore.includes(k));
    const cash = VICTORY_CASH[d] || 0;
    m.cash += cash;
    addLog(`👑 VITÓRIA no ${D0.icon} ${D0.nome}! +💵 ${cash}. ${escHtml(entry.n)} agora aparece no abrigo como sobrevivente lendário.`, 'good');
    save();
    showWin({ entry, cash, vfNew, fresh });
  }

  // Tela de vitória: um certificado bonito (o código fica escondido; vai pelo e-mail ou no arquivo baixado).
  // test: prévia do menu de debug (nada é dado, o envio vai como [TESTE])
  function showWin({ entry, cash, vfNew = [], fresh = [], test = false }) {
    const D0 = DIFFS[entry.d], code = certificate(entry);
    const canSend = hasMailKey();
    let sending = false, sent = false;
    const msg = h => { const el = $('hall-msg'); if (el) el.innerHTML = h; };
    const stat = (v, l) => `<div class="cert-stat"><b>${v}</b><small>${l}</small></div>`;
    const rewards = [
      `💵 <b>+${cash} de cash</b> neste save`,
      `🧍 Seu nome num <b>sobrevivente lendário</b> na frente do abrigo, em todos os seus saves`,
      vfNew.length ? `📺 Filtros visuais: <b>${vfNew.map(k => `${VFILTERS[k].icon} ${VFILTERS[k].nome}`).join(', ')}</b>` : '',
      fresh.length ? `🎨 Skins: <b>${fresh.map(k => `${LEADER_SKINS[k].icon} ${LEADER_SKINS[k].nome}`).join(', ')}</b>` : '',
      `🚩 Bandeira de troféu no telhado do abrigo`,
    ].filter(Boolean);
    openDialog({
      title: test ? '👑 Vitória! <small class="hint">(prévia do debug)</small>' : '👑 Vitória!',
      staticBody: true, plain: true,
      body: `<div class="cert-card" style="--dc:${D0.color}">
          <div class="cert-seal">🏅</div>
          <div class="cert-kicker">Certificado de vitória · Voidfall</div>
          <canvas class="cert-hero" id="cert-hero" width="120" height="120"></canvas>
          <div class="cert-name">${escHtml(entry.n)}</div>
          <div class="cert-line">encontrou a <b>Cura</b> no <b class="cert-diff">${D0.icon} ${D0.nome}</b></div>
          <div class="cert-stats">${stat(String(entry.t).split('-').reverse().join('/'), 'data')}${stat(entry.h != null ? `${fmt(entry.h)}h` : '—', 'tempo de jogo')}
            ${stat(fmt(entry.k || 0), 'abates')}${stat(fmt(entry.lost || 0), 'perdidos')}${stat(`${entry.c || 1}`, 'cidades')}</div>
        </div>
        <ul class="win-list cert-rewards">${rewards.map(r => `<li>${r}</li>`).join('')}</ul>
        <p class="hint cert-hall">🏆 <b>Hall da Fama do site:</b> envie o certificado para entrar no ranking (quem chega à Cura em menos tempo de jogo) e aparecer no abrigo de todos os jogadores. Os 3 primeiros de cada dificuldade ganham <b>skins de pódio</b> e um título único.
</p>
        <p class="hint" id="hall-msg"></p>`,
      onMount: () => { const c = $('cert-hero'); if (c && typeof Scene !== 'undefined') Scene.portrait(c, Profile.look()); },
      buttons: [
        { label: () => (sent ? '✅ Enviado' : sending ? '📨 Enviando...' : '📨 Enviar para o Hall da Fama'), cls: 'primary', keep: true,
          hidden: () => !canSend, disabled: () => sending || sent,
          onClick: d => {
            sending = true; msg('Enviando...');
            send(entry, code, test).then(() => { sent = true; msg(`<span class="good-text">✅ Enviado${test ? ' (teste)' : ''}! Seu nome aparece no Hall da Fama quando for aprovado.</span>`); },
              () => msg('<span class="bad-text">Não deu para enviar agora (sem internet?). Tente de novo daqui a pouco: esta janela fica aberta.</span>'))
              .finally(() => { sending = false; if (d.open) d.refresh(false); });
          } },
        { label: '🎨 Escolher skin', onClick: () => setTimeout(showSkins) },
      ],
      cancel: 'Fechar',
    });
  }
  // prévia da tela de vitória (menu de debug): com os dados do save aberto e as recompensas da dificuldade, sem dar nada
  function preview() {
    const entry = entryNow(), d = entry.d;
    const fresh = Object.keys(LEADER_SKINS).filter(k => LEADER_SKINS[k].diff === d);
    const vfNew = VFilter.list().filter(k => VFILTERS[k].diff === d);
    showWin({ entry, cash: VICTORY_CASH[d] || 0, vfNew, fresh, test: true });
  }

  // certificado a partir de um save exportado (validador do debug): usa a vitória mais difícil registrada nele.
  // Saves não têm assinatura (dá para editar), então isso é para teste, não prova de vitória.
  function fromSave(st) {
    const m = st.meta || {}, wins = Object.keys(m.wins || {}).filter(k => DIFFS[k]);
    if (!wins.length) return null;
    const d = wins.sort((a, b) => diffRank(b) - diffRank(a))[0], ts = typeof m.wins[d] === 'number' ? m.wins[d] : Date.now();
    return { n: m.player || 'Sobrevivente', d, t: new Date(ts).toISOString().slice(0, 10), ts, w: m.worlds || 1, c: m.city, k: (m.stats && m.stats.kills) || 0,
      h: Math.round(((m.stats && m.stats.time) || 0) / 360) / 10, lost: m.fallen || 0, id: m.runId, r: m.runId ? hash(m.runId + ':hall') : undefined };
  }

  return { win, verify, certificate, entryNow, check, download, extract, send, hasMailKey, showWin, preview, fromSave };
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
    makeLeader();
    built = true;
  }
  // o seu personagem, desenhado pela cena do jogo, em pé no telhado
  function makeLeader() {
    leader = null;
    try {
      if (typeof Scene !== 'undefined' && typeof Profile !== 'undefined') {
        const c = document.createElement('canvas'); c.width = 16; c.height = 24;
        Scene.portrait(c, Profile.look(Profile.lastLook()));
        leader = c;
      }
    } catch (e) { leader = null; }
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
    if (typeof VFilter !== 'undefined') VFilter.overlay(ctx, 1);
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
  // o personagem mudou: redesenha só ele (o cenário sorteado continua o mesmo)
  const refresh = () => { if (!cv) return; makeLeader(); if (reduce()) draw(0); };
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
  let screen = 'home', pick = { slot: 1, diff: 'normal', name: '', look: null }, hallTab = null;
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
          <button class="mm-go" data-go="load"><span>Carregar</span>${any ? '' : '<small>Nenhum jogo salvo · importe um progresso</small>'}</button>
          <button class="mm-go" data-go="hall"><span>Hall da Fama</span></button>
          <button class="mm-go" data-go="skins"><span>Skins</span></button>
          <button class="mm-go" data-go="settings"><span>Configurações</span></button>
          <button class="mm-go" data-go="credits"><span>Créditos</span></button>
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
              <button data-imp="${i + 1}" title="Substituir este espaço por um progresso exportado">📥 Importar</button>
              <button class="danger" data-del="${i + 1}">Apagar</button>
            </div>
          </div>` : `
          <div class="slot-card empty">
            <div class="slot-head"><b>Espaço ${i + 1}</b> <small>vazio</small></div>
            <div class="slot-actions"><button data-newin="${i + 1}">✨ Novo jogo aqui</button>
              <button data-imp="${i + 1}" title="Colar um código ou escolher o arquivo exportado">📥 Importar progresso</button></div>
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
      // ranking do site: uma aba por dificuldade (da mais difícil para a mais fácil), por ordem de quem venceu em menos tempo
      const all = HALL_OF_FAME;
      Podium.sync();
      const dia = w => escHtml(String(w.t || '').split('-').reverse().join('/'));   // AAAA-MM-DD → DD/MM/AAAA
      const order = Object.keys(DIFFS).reverse();
      const count = d => all.filter(w => w.d === d).length;
      if (!DIFFS[hallTab] || (!count(hallTab) && all.length)) hallTab = order.find(count) || order[0];
      // menos tempo jogado até a Cura na frente; empate (ou sem tempo registrado): quem venceu primeiro (Podium.list)
      const list = Podium.list(hallTab);
      const you = w => (Podium.mine(w) ? ' <small class="hall-you">você</small>' : '');
      const myTitle = Podium.title();
      const medal = i => ['🥇', '🥈', '🥉'][i] || `${i + 1}º`;
      const num = v => (v == null ? '—' : fmt(v));
      const D = DIFFS[hallTab];
      // pódio animado para os 3 primeiros (2º à esquerda, 1º no meio, 3º à direita); do 4º em diante, a tabela
      const step = (w, i) => w ? `<div class="podium-step p${i + 1}" style="--d:${[0.25, 0, 0.5][i]}s">
          <div class="podium-medal">${medal(i)}</div>
          <div class="podium-name">${escHtml(w.n)}</div>${Podium.mine(w) ? '<div class="hall-you">você</div>' : ''}
          <div class="podium-info">
            <span>Venceu</span><b>${dia(w)}</b>
            <span>Tempo jogado</span><b>${w.h != null ? `${fmt(w.h)}h` : '—'}</b>
            <span>Abates</span><b>${num(w.k)}</b>
            <span>Perdidos</span><b>${num(w.lost)}</b>
          </div>
          <div class="podium-base"><span>${i + 1}</span></div>
          ${i === 0 ? '<i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i><i class="spark s4"></i>' : ''}
        </div>` : '<div class="podium-step empty"></div>';
      const podium = list.length ? `<div class="podium">${step(list[1], 1)}${step(list[0], 0)}${step(list[2], 2)}</div>` : '';
      const rest = list.slice(3);
      const table = rest.length ? `<div class="hall-rank-wrap"><table class="hall-rank">
          <thead><tr><th>#</th><th>Sobrevivente</th><th>Venceu em</th><th>Tempo jogado</th><th>Abates</th><th>Perdidos</th></tr></thead>
          <tbody>${rest.map((w, j) => `<tr><td class="pos">${medal(j + 3)}</td><td><b>${escHtml(w.n)}</b>${you(w)}</td>
            <td>${dia(w)}</td><td>${w.h != null ? `${fmt(w.h)}h` : '—'}</td><td>${num(w.k)}</td><td>${num(w.lost)}</td></tr>`).join('')}</tbody>
        </table></div>` : '';
      const body = list.length ? podium + table
        : `<p class="hint">Ninguém venceu no ${D.icon} ${D.nome} ainda. Seja o primeiro: vença e envie o seu certificado de vitória.</p>`;
      return `<h2>🏆 Hall da Fama</h2>
        <p class="hint">Quem encontra a Cura entra para a história. O ranking mostra quem chegou lá em menos tempo de jogo, em cada dificuldade.</p>
        ${myTitle ? `<div class="hall-title p${Podium.current() ? Podium.current().pos : 0}">Seu título: <b>${escHtml(myTitle)}</b></div>` : ''}
        <h3>🌍 Ranking do site</h3>
        <div class="hall-tabs">${order.map(d => `<button data-hall="${d}" class="${d === hallTab ? 'on' : ''}" style="--c:${DIFFS[d].color}">${DIFFS[d].icon} ${DIFFS[d].nome} <small>${count(d)}</small></button>`).join('')}</div>
        ${body}
        <div class="mm-back"><button data-go="home">← Voltar</button></div>`;
    },
    skins() {
      return `<h2>🎨 Skins do líder</h2><div id="skin-root">${skinPickerHtml()}</div>
        <div class="mm-back"><button data-go="home">← Voltar</button></div>`;
    },
    // créditos rolando como no fim de um filme (CREDITS em config.js); a roda do mouse e o arrasto também rolam
    credits() {
      const sec = (titulo, body) => `<section class="cr-sec"><h4>${escHtml(titulo)}</h4>${body}</section>`;
      const names = a => (a || []).map(n => `<div class="cr-name">${escHtml(n)}</div>`).join('');
      const lines = a => (a || []).map(l => `<div class="cr-line">${escHtml(l)}</div>`).join('');
      const honored = typeof HONORED !== 'undefined' ? HONORED.map(h => h.nome) : [];
      const legends = [...new Set(HALL_OF_FAME.map(w => w.n))];
      return `<div class="cr-roll" id="cr-roll" tabindex="0" aria-label="Créditos">
          <div class="cr-inner">
            <canvas id="mm-logo" class="mm-logo-sm" aria-label="Voidfall"></canvas>
            ${(typeof CREDITS !== 'undefined' ? CREDITS : []).map(s => sec(s.titulo, names(s.nomes) + lines(s.linhas) + (s.nota ? `<div class="cr-note">${escHtml(s.nota)}</div>` : ''))).join('')}
            ${honored.length ? sec('Sobreviventes homenageados', names(honored) + '<div class="cr-note">pessoas de verdade que vivem no abrigo</div>') : ''}
            ${legends.length ? sec('Lendas do Hall da Fama', names(legends) + '<div class="cr-note">encontraram a Cura</div>') : ''}
            <section class="cr-sec cr-end"><div class="cr-name">Obrigado por jogar.</div>
              <div class="cr-line"><a href="${REPO_URL}" target="_blank" rel="noopener">Código-fonte no GitHub</a></div><div class="cr-note">v${VERSION}</div></section>
          </div>
        </div>
        <div class="mm-back"><button data-go="home">← Voltar</button> <button data-cr="toggle" id="cr-toggle">⏸ Pausar</button></div>`;
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

  // créditos: sobem sozinhos (~28 px/s); mexer na roda do mouse, arrastar ou usar as setas pausa a rolagem por 3s; no fim, voltam ao começo
  let crPaused = false, crRaf = 0;
  function rollCredits() {
    const el = $('cr-roll');
    if (!el) return;
    cancelAnimationFrame(crRaf);
    crPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tg = $('cr-toggle'); if (tg) tg.textContent = crPaused ? '▶ Continuar' : '⏸ Pausar';
    let last = performance.now(), hold = 0, pos = 0, endT = 0;
    const touch = () => { hold = 3; pos = el.scrollTop; };
    el.onwheel = el.onpointerdown = el.onkeydown = touch;
    const step = now => {
      if (!el.isConnected || screen !== 'credits') return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (hold > 0) { hold -= dt; pos = el.scrollTop; }
      else if (!crPaused) {
        const max = el.scrollHeight - el.clientHeight;
        if (pos >= max - 1) { endT += dt; if (endT > 2.5) { pos = 0; endT = 0; } }
        else pos += 28 * dt;
        el.scrollTop = pos;
      }
      crRaf = requestAnimationFrame(step);
    };
    crRaf = requestAnimationFrame(step);
  }

  function draw() {
    box().innerHTML = SCREENS[screen]();
    box().classList.toggle('narrow', ['death', 'credits'].includes(screen));
    box().classList.toggle('home', screen === 'home');
    box().classList.toggle('hall', screen === 'hall');   // Hall da Fama: só a tabela rola, a janela não
    $('main-menu').classList.toggle('at-home', screen === 'home');
    box().scrollTop = 0;
    const lg = $('mm-logo'); if (lg) drawLogo(lg);
    if (screen === 'home') radio(); else clearTimeout(txT);
    if (screen === 'skins') bindSkinPicker($('skin-root'));
    if (screen === 'credits') rollCredits();
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

  function startNew(ok = {}) {
    // nome obrigatório: sem ele, avisa e devolve o foco ao campo
    if (!String(pick.name || '').replace(/[\u0000-\u001f<>]/g, '').trim()) {
      const n = $('mm-name'), err = $('mm-name-err');
      if (err) err.hidden = false;
      if (n) { n.classList.add('err'); n.focus(); }
      return;
    }
    const name = cleanName(pick.name), diff = pick.diff, slot = pick.slot;
    // confirmações em sequência: substituir o espaço ocupado e, no Apocalipse, a morte permanente
    if (Slots.has(slot) && !ok.slot) return askConfirm({ title: `💾 Substituir o espaço ${slot}?`, body: `<p class="event-text">O save que está no espaço ${slot} será <b>perdido</b>.</p>`, ok: 'Substituir', danger: true }, () => startNew({ ...ok, slot: true }));
    if (DIFFS[diff].permadeath && !ok.perma) return askConfirm(PERMA_CONFIRM, () => startNew({ ...ok, perma: true }));
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
      askConfirm({ title: `🗑️ Apagar o espaço ${ds.del}?`, body: `<p class="event-text">O save${x ? ` de <b>${escHtml(x.name)}</b>` : ''} será apagado. <b>Isso não pode ser desfeito.</b></p>`, ok: 'Apagar', danger: true },
        () => { Slots.remove(+ds.del); draw(); });
    } else if (ds.imp) { showImport(+ds.imp); $('dialog').classList.add('over-menu'); }   // a janela abre por cima do menu
    else if (ds.newin) { pick = { slot: +ds.newin, diff: 'normal', name: pick.name, look: pick.look || Profile.lastLook() }; screen = 'new'; draw(); }
    else if (ds.slot) { pick.slot = +ds.slot; draw(); }
    else if (ds.hall) { hallTab = ds.hall; draw(); }
    else if (ds.cr) { crPaused = !crPaused; t.textContent = crPaused ? '▶ Continuar' : '⏸ Pausar'; }
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
