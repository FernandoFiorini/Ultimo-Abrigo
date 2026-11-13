'use strict';

// Prévia animada ao passar o mouse em armas, itens da loja e pesquisas (elementos com data-demo="tipo:chave").
// A animação é desenhada ao vivo no canvas pela própria cena (Scene.demo), no mesmo estilo do jogo.
const Demos = (() => {
  const W = 400, H = 180;
  let el = null, cur = null, raf = 0, t0 = 0;

  // título, ícone e texto de cada prévia
  function info(key) {
    const [kind, k] = key.split(':');
    if (kind === 'lw' && LWEAPONS[k]) {
      const st = Weapons.stat(k);
      return { icon: LWEAPONS[k].icon, title: LWEAPONS[k].nome, text: LWEAPONS[k].desc,
        meta: LWEAPONS[k].special ? `${LWEAPONS[k].type === 'rocket' ? '1 tiro' : `dano ${pts(st.dmg)} · pente ${st.mag}`} · recarga ${fmt(st.reload)}s · alcance ${Math.round(st.range)} · usa ${SPECIAL_AMMO[LWEAPONS[k].special].icon} ${SPECIAL_AMMO[LWEAPONS[k].special].plural}, munição rara`
          : `dano ${pts(st.dmg)} · pente ${st.mag} · alcance ${Math.round(st.range)}` + (st.use ? ` · ${fmt(st.use)} 🔫 por tiro` : ' · não gasta munição') };
    }
    if (kind === 'shop' && SHOP[k]) return { icon: SHOP[k].icon, title: SHOP[k].nome, text: SHOP[k].desc, meta: `💵 ${SHOP[k].cost}` };
    if (kind === 'tech' && Endgame.TECH[k]) return { icon: Endgame.TECH[k].icon, title: Endgame.TECH[k].nome, text: Endgame.TECH[k].desc, meta: 'Pesquisa' };
    return null;
  }

  function build() {
    el = document.createElement('div');
    el.className = 'demo-tip hidden';
    el.setAttribute('role', 'tooltip');
    el.innerHTML = `<div class="demo-head"><span class="demo-icon"></span><span class="demo-title"></span><span class="demo-label">▶ prévia</span></div>
      <canvas width="${W}" height="${H}"></canvas>
      <div class="demo-text"></div><div class="demo-meta"></div>`;
    document.body.appendChild(el);
  }

  function place(target) {
    const r = target.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, pad = 10;   // offset*: sem a animação de entrada
    let x = r.left - w - pad, y = r.top + r.height / 2 - h / 2;
    if (x < pad) {   // sem espaço à esquerda: abre acima ou abaixo do item
      x = Math.min(window.innerWidth - w - pad, Math.max(pad, r.left));
      y = r.top - h - pad < pad ? r.bottom + pad : r.top - h - pad;
    }
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(Math.max(pad, Math.min(window.innerHeight - h - pad, y))) + 'px';
  }

  function loop(now) {
    if (!cur) return;
    Scene.demo(el.querySelector('canvas'), cur.key, (now - t0) / 1000);
    raf = requestAnimationFrame(loop);
  }

  function show(target) {
    const key = target.dataset.demo, d = info(key);
    if (!d || !Scene.hasDemo(key)) return;
    if (!el) build();
    if (cur && cur.target === target) return;
    cur = { key, target };
    el.querySelector('.demo-icon').textContent = d.icon;
    el.querySelector('.demo-title').textContent = d.title;
    el.querySelector('.demo-text').textContent = d.text;
    el.querySelector('.demo-meta').textContent = d.meta || '';
    el.classList.remove('hidden');
    place(target);
    t0 = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  function hide() {
    cur = null;
    cancelAnimationFrame(raf);
    if (el) el.classList.add('hidden');
  }

  function init() {
    document.addEventListener('mouseover', e => {
      const t = e.target.closest && e.target.closest('[data-demo]');
      if (t) show(t); else if (cur) hide();
    });
    document.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
  }

  // marca o atributo só onde existe prévia
  const attr = key => (Scene.hasDemo(key) ? ` data-demo="${key}"` : '');
  return { init, show, hide, attr };
})();
