'use strict';

// Filtros visuais: mudam o "jeito" da imagem do cenário (e do menu), por cima do que já é desenhado.
// A cor vem de um filtro CSS/SVG no canvas; linhas de TV, grade de tela, vinheta e chuvisco são desenhados
// por cima do quadro pronto (VFilter.overlay, chamado no fim do desenho da cena).
// Liberados vencendo (encontrando a Cura): vencer numa dificuldade libera o filtro dela e os das menores.
// Valem para todos os saves deste navegador (a escolha fica nas Configurações, o desbloqueio no Perfil).
// diff: dificuldade que libera (null: sempre liberado)
const VFILTERS = {
  none:     { icon: '🚫', nome: 'Nenhum', diff: null, desc: 'A imagem original do jogo' },
  crt:      { icon: '📺', nome: 'TV de tubo', diff: 'facil', desc: 'Linhas de TV antiga, cores mais vivas e cantos escurecidos',
    css: 'contrast(1.12) saturate(1.3) brightness(1.06)', lines: 0.28, vig: 0.55 },
  sepia:    { icon: '📜', nome: 'Fotografia antiga', diff: 'normal', desc: 'Tons de sépia, como uma foto achada nos escombros',
    css: 'sepia(0.85) contrast(1.06) brightness(0.96)', vig: 0.6, grain: 0.05 },
  noturna:  { icon: '🟢', nome: 'Visão noturna', diff: 'dificil', desc: 'Tudo em verde pelos óculos de visão noturna, com chuvisco',
    svg: 'noturna', css: 'brightness(1.25) contrast(1.1)', lines: 0.18, vig: 0.85, grain: 0.1 },
  sangue:   { icon: '🩸', nome: 'Preto, branco e sangue', diff: 'pesadelo', desc: 'Preto e branco de alto contraste: só o vermelho continua colorido',
    svg: 'sangue', vig: 0.5, grain: 0.06 },
  camera:   { icon: '📼', nome: 'Câmera de segurança', diff: 'apocalipse', desc: 'Gravação de uma câmera de vigilância: cinza azulado, chiado, ● REC e o relógio na tela',
    svg: 'camera', css: 'contrast(1.15) brightness(1.08)', lines: 0.22, vig: 0.7, grain: 0.09, rec: true },
};

const VFilter = (() => {
  let debugAll = false;   // menu de debug: todos liberados nesta sessão
  const rank = k => (VFILTERS[k] && VFILTERS[k].diff ? diffRank(VFILTERS[k].diff) : -1);
  const bestWin = () => {
    const p = typeof Profile !== 'undefined' ? Profile.get() : null;
    return p ? Math.max(-1, ...(p.winners || []).filter(w => DIFFS[w.d]).map(w => diffRank(w.d))) : -1;
  };
  const unlocked = k => !!VFILTERS[k] && (debugAll || !VFILTERS[k].diff || bestWin() >= rank(k));
  const how = k => { const d = VFILTERS[k].diff; return d ? `Vença no ${DIFFS[d].icon} ${DIFFS[d].nome} (ou numa dificuldade maior)` : ''; };
  // o que está valendo: a escolha das Configurações, se estiver liberada
  const current = () => { const k = Settings.get('vfilter'); return k && unlocked(k) ? k : 'none'; };

  // ---------- filtros SVG (cor): ficam num <svg> escondido no documento
  const SVG = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <filter id="vf-noturna" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0.06 0.12 0.03 0 0  0.33 0.75 0.16 0 0.06  0.06 0.12 0.03 0 0  0 0 0 1 0"/>
    </filter>
    <filter id="vf-sangue" color-interpolation-filters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" result="g0"/>
      <feComponentTransfer in="g0" result="gray">
        <feFuncR type="linear" slope="1.45" intercept="-0.18"/><feFuncG type="linear" slope="1.45" intercept="-0.18"/><feFuncB type="linear" slope="1.45" intercept="-0.18"/>
      </feComponentTransfer>
      <feColorMatrix in="SourceGraphic" type="matrix" values="1.2 0 0 0 0  0 0.6 0 0 0  0 0 0.6 0 0  2.2 -2 -1.2 0 -0.2" result="mask"/>
      <feComposite in="mask" in2="SourceGraphic" operator="in" result="red"/>
      <feMerge><feMergeNode in="gray"/><feMergeNode in="red"/></feMerge>
    </filter>
    <filter id="vf-camera" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0.27 0.53 0.1 0 0  0.29 0.57 0.11 0 0.01  0.31 0.6 0.12 0 0.04  0 0 0 1 0"/>
    </filter>
  </defs></svg>`;
  let svgIn = false;
  const cssOf = k => { const F = VFILTERS[k]; return [F.svg ? `url(#vf-${F.svg})` : '', F.css || ''].join(' ').trim() || 'none'; };

  function apply() {
    if (typeof document === 'undefined') return;
    if (!svgIn && document.body) { document.body.insertAdjacentHTML('beforeend', SVG); svgIn = true; }
    const k = current(), f = k === 'none' ? '' : cssOf(k);
    for (const id of ['scene', 'mm-scene']) { const c = document.getElementById(id); if (c) c.style.filter = f; }
    if (document.body) document.body.dataset.vf = k;
  }

  // ---------- por cima do quadro: linhas, grade, vinheta (pré-desenhadas e guardadas) e chuvisco
  // px: tamanho de um pixel do jogo em pixels do canvas
  let cache = null, cacheKey = '';
  function layer(k, w, h, px) {
    const key = `${k}|${w}|${h}|${px.toFixed(3)}`;
    if (key === cacheKey) return cache;
    const F = VFILTERS[k], c = cache || document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.clearRect(0, 0, w, h);
    const lineH = Math.max(1, Math.round(px * 0.4));
    if (F.lines && px >= 2) {
      g.fillStyle = `rgba(0,0,0,${F.lines})`;
      for (let y = 0; y < h; y += px) g.fillRect(0, Math.round(y + px - lineH), w, lineH);
    }
    if (F.vig) {
      const r = Math.hypot(w, h) / 2, gr = g.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, `rgba(0,0,0,${F.vig})`);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
    cache = c; cacheKey = key;
    return c;
  }
  // ctx: contexto do canvas · px: pixels do canvas por pixel do jogo
  function overlay(ctx, px) {
    const k = current();
    if (k === 'none') return;
    const F = VFILTERS[k], w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (F.grain && !Settings.get('reduceFx')) {
      const n = Math.round(w * h / (px * px) / 90), s = Math.max(1, Math.round(px));
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${F.grain})` : `rgba(0,0,0,${F.grain * 1.5})`;
        ctx.fillRect(Math.floor(Math.random() * w / s) * s, Math.floor(Math.random() * h / s) * s, s, s);
      }
    }
    ctx.drawImage(layer(k, w, h, px), 0, 0);
    if (F.rec) {   // câmera de segurança: ● REC piscando e a data/hora da gravação
      const fs = Math.max(9, Math.round(Math.min(w, h * 2.4) / 46)), m = Math.round(fs * 0.9), now = new Date();
      ctx.font = `bold ${fs}px monospace`; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      const pad = n => String(n).padStart(2, '0');
      const ts = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      ctx.textAlign = 'left'; ctx.fillText('● REC', m + 1, m + 1); ctx.textAlign = 'right'; ctx.fillText(ts, w - m + 1, m + 1); ctx.fillText('CAM 01', w - m + 1, h - m - fs + 1);
      ctx.fillStyle = '#e8ece8';
      ctx.textAlign = 'right'; ctx.fillText(ts, w - m, m); ctx.fillText('CAM 01', w - m, h - m - fs);
      ctx.textAlign = 'left';
      if (now.getMilliseconds() < 600) { ctx.fillStyle = '#ff3030'; ctx.fillText('●', m, m); }
      ctx.fillStyle = '#e8ece8'; ctx.fillText('  REC', m, m);
    }
    ctx.restore();
  }

  return {
    unlocked, how, current, apply, overlay,
    list: () => Object.keys(VFILTERS),
    get debugAll() { return debugAll; },
    set debugAll(v) { debugAll = !!v; apply(); },
  };
})();
Settings.on(k => { if (k === 'vfilter') VFilter.apply(); });
VFilter.apply();
