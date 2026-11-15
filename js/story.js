'use strict';

// 🎞️ Cutscenes da história (o Projeto Aurora): abertura, primeira evacuação e cada etapa da Cura.
// Cada cena é uma lista de quadros { art, o, sfx, text }: a arte é pixel art desenhada em código num canvas
// pequeno (como o resto do jogo) e o texto aparece letra por letra. O jogo fica pausado enquanto a cena roda.
// As cenas vistas ficam em S.meta.story (passam pela evacuação e pelo Novo Mundo) e dá para rever no Códice › Memórias.
// No console: Story.play('cure3') toca qualquer cena.
const Story = (() => {
  const W = 240, H = 135, GY = 112, CPS = 42;
  let ctx = null, root = null, cv, txt, ttl, cnt;
  let cur = null, cid = '', fi = 0, ft = 0, shown = 0, raf = 0, last = 0, onEnd = null;
  const queue = [];
  const reduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- desenho ----------
  const R = (c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
  function grad(stops, y0 = 0, y1 = H) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
  }
  function glow(x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const disc = (c, x, y, r) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  function stars(t, seed, n, maxY) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * W | 0, y = r() * maxY | 0, p = r() * 6;
      if (Math.sin(t * 1.5 + p) > -0.4) R(Math.sin(t * 2 + p) > 0.8 ? '#e8e4d0' : '#6a6680', x, y);
    }
  }
  // fileira de prédios (sempre a mesma para a mesma semente) · lit: chance de janela acesa · flick: janelas piscando
  function skyline(seed, col, minH, maxH, gy, lit, litCol, t, flick) {
    const r = rng(seed);
    for (let x = -4; x < W + 4;) {
      const w = 10 + r() * 18 | 0, h = minH + r() * (maxH - minH) | 0;
      R(col, x, gy - h, w, h);
      if (r() < 0.3) R(col, x + w / 3, gy - h - 4, 1, 4);
      for (let wy = gy - h + 3; wy < gy - 3; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3) {
        const p = r();
        if (p < lit && (!flick || Math.sin(t * (1 + p * 9) + p * 50) > -0.6)) R(typeof litCol === 'function' ? litCol(p) : litCol, wx, wy, 1, 2);
      }
      x += w + (r() * 3 | 0);
    }
  }
  // gente e zumbis em silhueta (3 px de largura × k, pés em gy)
  function person(x, gy, col, t, sp = 0, ph = 0, k = 1) {
    const step = sp && Math.sin(t * sp + ph) > 0, P = (dx, dy, w, h) => R(col, x + dx * k, gy + dy * k, w * k, h * k);
    P(0, -9, 3, 3); P(0, -6, 3, 4);
    P(step ? 0 : 1, -2, 1, 2); P(step ? 2 : 1, -2, 1, 2);
  }
  function zombie(x, gy, t, sp = 3, ph = 0, eye = '#ff3a2a', col = '#0b0b0a', k = 1) {
    const step = sp && Math.sin(t * sp + ph) > 0, P = (c, dx, dy, w, h) => R(c, x + dx * k, gy + dy * k, w * k, h * k);
    P(col, 0, -9, 3, 3); P(col, 0, -6, 3, 4); P(col, -2, -5, 2, 1);
    P(col, step ? 0 : 1, -2, 1, 2); P(col, step ? 2 : 1, -2, 1, 2);
    if (eye && Math.sin(t * 2 + ph) > -0.8) P(eye, 0, -8, 1, 1);
  }
  function fire(x, y, t, size = 1) {
    const fl = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 7);
    glow(x, y - 3, 30 * fl * size, '255,150,60', 0.4);
    R('#3a2a1a', x - 4, y, 9, 1); R('#ff8a2a', x - 2, y - 3 * fl, 5, 3); R('#ffd060', x - 1, y - 4 * fl, 3, 3); R('#fff0b0', x, y - 3, 1, 2);
  }
  // fonte de pixel 3×5 (só as letras usadas)
  const F3 = { A: '010101111101101', U: '101101101101111', R: '110101110101101', O: '010101101101010' };
  const word = (s, x, y, col) => [...s].forEach((ch, i) => [...(F3[ch] || '')].forEach((b, j) => { if (b === '1') R(col, x + i * 4 + (j % 3), y + Math.floor(j / 3)); }));
  function smoke(t, x, n = 12, rate = 0.12) {
    for (let k = 0; k < n; k++) {
      const a = (t * rate + k / n) % 1, y = GY - 30 - a * 90, r = 3 + a * 10;
      ctx.globalAlpha = 0.3 * (1 - a);
      disc('#1a0c0c', x + Math.sin(k * 2.3 + t * 0.7) * (2 + a * 10), y, r);
    }
    ctx.globalAlpha = 1;
  }

  // 5 cidades do mapa (na ordem das etapas da Cura) e o laboratório no meio
  const LAB = [120, 66], CITIES = [[44, 34], [196, 30], [204, 100], [40, 104], [122, 14]];

  const ART = {
    // a cidade antes: luzes acesas, carros, um aviso piscando que ninguém lê
    city(t) {
      grad(['#060814', '#101a34', '#24304a'], 0, GY);
      stars(t, 5, 60, 60);
      glow(200, 20, 26, '230,220,190', 0.15); disc('#d8d2bc', 200, 20, 6); R('#b8b09a', 198, 18, 2, 2);
      skyline(11, '#151a2c', 34, 64, GY, 0.2, '#4a5a7a', t);
      skyline(23, '#0c0f1a', 18, 48, GY, 0.5, p => (p < 0.1 ? '#9ad0ff' : '#e8b860'), t, true);
      // painel com o alerta
      R('#1a1a22', 22, 52, 34, 18); R('#2a2a34', 22, 52, 34, 1); R('#2a2a34', 38, 70, 2, 10);
      if (Math.sin(t * 5) > -0.2) { R('#ff3a2a', 25, 55, 28, 3); R('#c8c8d0', 25, 60, 20, 1); R('#c8c8d0', 25, 63, 24, 1); R('#c8c8d0', 25, 66, 14, 1); glow(39, 60, 22, '255,58,42', 0.15); }
      R('#0a0a0e', 0, GY, W, H - GY); R('#2a2a30', 0, GY, W, 1);
      for (let x = 0; x < W; x += 14) R('#3a3a40', x + 4, GY + 11, 6, 1);
      const cx = (t * 40) % (W + 40) - 20;
      glow(cx + 16, GY + 6, 12, '255,230,160', 0.3); R('#c8302a', cx, GY + 5, 10, 3); R('#8a1a14', cx + 2, GY + 3, 6, 2); R('#ffe8a0', cx + 10, GY + 6, 1, 1);
      const cx2 = W - (t * 26 + 90) % (W + 40);
      R('#3a5a8a', cx2, GY + 14, 10, 3); R('#2a4060', cx2 + 2, GY + 12, 6, 2); R('#ff4030', cx2 + 10, GY + 15, 1, 1);
      person(80 + (t * 6) % 60, GY + 8, '#05060a', t, 6);
      person(170 - (t * 5) % 50, GY + 9, '#05060a', t, 5, 1);
    },
    // o laboratório do Projeto Aurora, com o farol vermelho no telhado
    lab(t) {
      grad(['#05070a', '#0e1a1a', '#14261e'], 0, GY);
      stars(t, 9, 30, 50);
      skyline(31, '#0a1210', 14, 34, GY, 0.1, '#4a6a50', t);
      const bx = 70, bw = 100, bh = 52, by = GY - bh;
      glow(bx + bw / 2, by + 26, 70, '90,223,138', 0.1);
      R('#2a3230', bx, by, bw, bh); R('#3a4440', bx, by, bw, 2); R('#1a2220', bx - 3, by - 3, bw + 6, 3);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
        const on = Math.sin(t * 2 + i * 1.7 + j * 2.1) > -0.7;
        R(on ? '#5adf8a' : '#1a3a2a', bx + 8 + i * 15, by + 12 + j * 12, 8, 6);
      }
      R('#0c1412', bx + 36, by + 2, 28, 8); word('AURORA', bx + 39, by + 4, '#8affc0');
      const on = Math.sin(t * 6) > 0;
      R('#3a3a3a', bx + bw - 12, by - 8, 2, 5); R(on ? '#ff3020' : '#5a1410', bx + bw - 13, by - 11, 4, 3);
      if (on) glow(bx + bw - 11, by - 10, 30, '255,48,32', 0.35);
      R('#0a0e0c', bx + 44, GY - 14, 12, 14);
      for (let x = 0; x < W; x += 4) if (x < bx - 6 || x > bx + bw + 6) R('#3a4440', x, GY - 10, 1, 10);
      R('#3a4440', 0, GY - 10, bx - 6, 1); R('#3a4440', bx + bw + 6, GY - 10, W, 1);
      R('#0c100e', 0, GY, W, H - GY);
    },
    // o surto: cidade em chamas, gente fugindo, zumbis atrás
    outbreak(t) {
      grad(['#1a0606', '#4a1010', '#8a2a14'], 0, GY);
      for (let i = 0; i < 4; i++) smoke(t + i * 3, 30 + i * 60);
      skyline(41, '#1a0a0a', 30, 64, GY, 0.35, p => (p < 0.15 ? '#ffd060' : '#ff6a2a'), t, true);
      glow(60, GY - 20, 40, '255,120,40', 0.25 + 0.05 * Math.sin(t * 9)); glow(180, GY - 30, 50, '255,120,40', 0.2 + 0.05 * Math.sin(t * 7));
      R('#3a1810', 0, GY, W, H - GY); R('#5a2a18', 0, GY, W, 1);
      const siren = Math.sin(t * 8) > 0;
      R('#2a2a30', 196, GY + 3, 16, 6); R('#1a1a20', 199, GY + 1, 9, 2); R(siren ? '#ff3020' : '#3060ff', 202, GY, 3, 1);
      glow(203, GY + 1, 20, siren ? '255,48,32' : '48,96,255', 0.4);
      for (let i = 0; i < 4; i++) person(W + 20 - ((t * 34 + i * 67) % (W + 60)), GY + 16 + (i % 2) * 3, '#0b0b0a', t, 16, i, 2);
      for (let i = 0; i < 5; i++) zombie(W + 40 - ((t * 15 + i * 53) % (W + 80)), GY + 18 + (i % 3) * 2, t, 4, i, '#ff3a2a', '#0b0b0a', 2);
    },
    // o mapa: a infecção se espalha do laboratório e a equipe foge para 5 cidades
    // o.full: tudo já espalhado · o.route: a rota do grupo de cidade em cidade
    map(t, o) {
      R('#0a100e', 0, 0, W, H);
      for (let x = 0; x < W; x += 12) R('#111c17', x, 0, 1, H);
      for (let y = 0; y < H; y += 12) R('#111c17', 0, y, W, 1);
      ctx.strokeStyle = '#1a3a4a'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(0, 82); ctx.bezierCurveTo(60, 70, 90, 100, 140, 84); ctx.bezierCurveTo(180, 72, 210, 60, W, 66); ctx.stroke();
      const spread = o.full ? 1 : clamp01(t / 4);
      glow(LAB[0], LAB[1], 14 + spread * 90, '200,30,20', 0.45);
      if (o.route) {
        const k = clamp01(t / 3);
        for (let i = 0; i < 4; i++) {
          const [ax, ay] = CITIES[i], [bx, by] = CITIES[i + 1];
          for (let s = 0; s <= 1; s += 0.05) R(i === 0 ? '#ffd060' : '#5a5040', ax + (bx - ax) * s, ay + (by - ay) * s);
        }
        const [ax, ay] = CITIES[0], [bx, by] = CITIES[1];
        if (Math.sin(t * 8) > -0.3) R('#ffffff', ax + (bx - ax) * k - 1, ay + (by - ay) * k - 1, 3, 3);
      }
      CITIES.forEach(([x, y], i) => {
        const k = o.full ? 1 : clamp01((t - 0.6 - i * 0.25) / 2.5);
        if (!o.route) for (let s = 0; s < k; s += 0.06) R('#3a5a48', LAB[0] + (x - LAB[0]) * s, LAB[1] + (y - LAB[1]) * s);
        R('#2a3a32', x - 4, y - 4, 9, 9); R('#3a4a42', x - 4, y - 4, 9, 1);
        for (let d = 0; d <= i; d++) R('#8a9a90', x - 3 + d * 2, y + 6);   // número da cidade em pontinhos
        const px = LAB[0] + (x - LAB[0]) * k, py = LAB[1] + (y - LAB[1]) * k;
        if (!o.route) R('#8affc0', px - 1, py - 1, 3, 3);
        else R('#8affc0', x - 1, y - 1, 3, 3);
      });
      const on = Math.sin(t * 6) > 0;
      R(on ? '#ff3020' : '#7a1410', LAB[0] - 2, LAB[1] - 2, 5, 5);
    },
    // o abrigo: armazém, muro, fogueira e os primeiros três sobreviventes
    shelter(t) {
      grad(['#07070d', '#141020', '#3a1420'], 0, GY);
      stars(t, 17, 50, 60);
      skyline(81, '#1a1424', 20, 55, GY, 0.12, '#c89a4a', t, true);
      R('#1e1a14', 0, GY, W, H - GY); R('#2a261e', 0, GY, W, 1);
      const ax = 70, aw = 60, ah = 32, ay = GY - ah;
      R('#2a2622', ax, ay, aw, ah); R('#3a342e', ax, ay, aw, 2); R('#1a1714', ax - 2, ay - 2, aw + 4, 2);
      for (let x = ax; x < ax + aw; x += 3) R('#5a5a5a', x, ay - 4, 1, 2);
      const lit = 0.75 + 0.25 * Math.sin(t * 7) * Math.sin(t * 3.1);
      R(`rgba(255,190,90,${lit})`, ax + 8, ay + 14, 5, 5); R(`rgba(255,190,90,${lit * 0.8})`, ax + 47, ay + 14, 5, 5);
      R('#1a1410', ax + 26, ay + 18, 9, 14);
      for (let i = 0; i < 6; i++) R('#5a4e38', ax + aw + 2 + (i % 3) * 5, GY - 3 - Math.floor(i / 3) * 3, 5, 3);
      R('#3a3630', 162, GY - 20, 5, 20); R('#4a443c', 162, GY - 20, 5, 1);
      fire(44, GY + 12, t, 1.4);
      person(26, GY + 16, '#0a0806', t, 0, 0, 2); person(56, GY + 17, '#0a0806', t, 0, 0, 2); person(40, GY + 23, '#050403', t, 0, 0, 2);
      for (let i = 0; i < 4; i++) {
        const x = W + 10 - ((t * 6 + i * 19) % 64);
        zombie(x, GY + 12 + (i % 2) * 4, t, 3, i, '#ff3a2a', '#0b0b0a', 2);
      }
    },
    // helicóptero: à noite, levando o grupo para a próxima cidade · o.day: de dia, largando caixas da vacina
    heli(t, o) {
      if (o.day) grad(['#5a7ab0', '#e8a070', '#ffd090'], 0, GY);
      else { grad(['#05060c', '#0e1224', '#1e2238'], 0, GY); stars(t, 13, 40, 60); }
      skyline(o.day ? 61 : 51, o.day ? '#5a4a5a' : '#0c0e18', 18, 48, GY, o.day ? 0 : 0.15, '#c89a4a', t, true);
      R(o.day ? '#4a4434' : '#0a0a0e', 0, GY, W, H - GY);
      const hx = o.day ? 30 + Math.sin(t * 0.5) * 6 : W + 30 - ((t * 30) % (W + 80)), hy = 30 + Math.sin(t * 1.3) * 2;
      if (!o.day) {
        ctx.save(); ctx.globalAlpha = 0.09; ctx.fillStyle = '#fff4c8'; ctx.beginPath();
        ctx.moveTo(hx + 6, hy + 7); ctx.lineTo(hx - 24, GY + 10); ctx.lineTo(hx + 24, GY + 10); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      const body = o.day ? '#3a4a3a' : '#1e2a1e';
      R(body, hx, hy, 22, 8); R(body, hx + 2, hy - 1, 16, 1); R('#8ac0d0', hx + 1, hy + 1, 5, 3);
      R(body, hx + 22, hy + 2, 16, 2); R(body, hx + 36, hy - 1, 2, 4);
      R('#5a5a5a', hx + 3, hy + 10, 16, 1); R('#5a5a5a', hx + 6, hy + 8, 1, 2); R('#5a5a5a', hx + 15, hy + 8, 1, 2);
      const rw = 4 + Math.abs(Math.sin(t * 30)) * 18;
      R('#8a8a8a', hx + 11 - rw, hy - 3, rw * 2, 1); R('#5a5a5a', hx + 10, hy - 2, 2, 2);
      R(Math.sin(t * 7) > 0.4 ? '#ff3020' : '#3a1010', hx + 37, hy - 1);
      if (o.day) for (let i = 0; i < 4; i++) {
        const a = (t * 0.14 + i * 0.25) % 1, x = 92 + i * 36 + Math.sin(t + i) * 3, y = 26 + a * (GY - 32);
        R('#e8e4d0', x - 6, y - 10, 13, 2); R('#e8e4d0', x - 4, y - 11, 9, 1);
        R('#a8a498', x - 5, y - 8, 1, 7); R('#a8a498', x + 5, y - 8, 1, 7);
        R('#d8d2bc', x - 3, y - 1, 7, 6); R('#d83030', x, y, 1, 4); R('#d83030', x - 1, y + 1, 3, 1);
      }
    },
    // bancada de laboratório improvisada: um tubo de ensaio brilhando
    tube(t) {
      grad(['#0a1210', '#0e1a16'], 0, H);
      for (let x = 0; x < W; x += 10) R('#122019', x, 0, 1, 90);
      for (let y = 0; y < 90; y += 10) R('#122019', 0, y, W, 1);
      R('#e8e0c0', 116, 0, 1, 10); R('#e8e0c0', 112, 10, 9, 2); glow(116, 14, 60, '255,240,200', 0.12);
      R('#2a2a2e', 0, 90, W, 4); R('#1a1a1e', 0, 94, W, H - 94);
      // microscópio
      R('#3a3a42', 30, 84, 22, 6); R('#4a4a52', 46, 56, 4, 30); R('#5a5a64', 36, 52, 14, 6); R('#6a6a74', 34, 48, 5, 5);
      R('#4a4a52', 38, 74, 12, 2);
      // suporte com tubos de ensaio
      R('#4a3a2a', 116, 82, 70, 3); R('#3a2a1a', 118, 85, 2, 5); R('#3a2a1a', 182, 85, 2, 5);
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      for (let i = 0; i < 5; i++) {
        const x = 122 + i * 13, hot = i === 2;
        R('#2a3a3a', x, 58, 7, 26); R('#3a4a4a', x, 58, 7, 1);
        R(hot ? mix('#2aa05a', '#8affb0', pulse) : ['#8a6a2a', '#2a4a8a', '#6a2a2a', '#4a4a2a', '#2a6a6a'][i], x + 1, hot ? 64 : 70 + i % 3 * 3, 5, hot ? 19 : 13 - i % 3 * 3);
        if (hot) {
          glow(x + 3, 72, 34, '90,255,140', 0.18 + 0.12 * pulse);
          for (let b = 0; b < 4; b++) { const a = (t * 0.6 + b / 4) % 1; R('#d8ffe0', x + 2 + (b % 2) * 2, 82 - a * 18); }
        }
      }
      // anotações e caneta
      R('#d8d2bc', 196, 86, 26, 4); R('#c8c2ac', 199, 85, 22, 1);
      R('#5a5a64', 204, 87, 10, 1); R('#7a3a2a', 190, 88, 8, 1);
    },
    // o Rei Uivador: a horda obedece ao grito
    king(t) {
      grad(['#0a0408', '#1e0a10', '#2e0c0c'], 0, H);
      const cx = 120, gy = 118;
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const a = (t * 0.5 + i / 4) % 1;
        ctx.strokeStyle = `rgba(255,200,60,${0.35 * (1 - a)})`;
        ctx.beginPath(); ctx.arc(cx, 50, 14 + a * 110, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      }
      R('#0a0505', 0, gy, W, H - gy);
      const s = '#050304';
      R(s, cx - 7, 40, 14, 14); R(s, cx - 18, 54, 36, 10); R(s, cx - 12, 64, 24, 30);
      R(s, cx - 25, 56, 7, 28); R(s, cx + 18, 56, 7, 28); R(s, cx - 27, 82, 4, 6); R(s, cx + 23, 82, 4, 6);
      R(s, cx - 10, 94, 8, gy - 94); R(s, cx + 2, 94, 8, gy - 94);
      R('#d8d0b8', cx - 8, 39, 17, 1);
      for (let i = 0; i < 5; i++) R('#d8d0b8', cx - 8 + i * 4, 35 - (i % 2 ? 2 : 0), 1, 4 + (i % 2 ? 2 : 0));
      if (Math.sin(t * 0.9) > -0.95) { glow(cx, 45, 12, '255,208,64', 0.3); R('#ffd040', cx - 4, 45, 2, 1); R('#ffd040', cx + 3, 45, 2, 1); }
      R('#3a0a0a', cx - 2, 49, 4, 2 + Math.round(Math.abs(Math.sin(t * 3)) * 2));
      for (let i = 0; i < 10; i++) {
        const x = i < 5 ? 12 + i * 18 : 150 + (i - 5) * 18;
        zombie(x, gy + 10 + (i % 2) * 3, t, 0, i);
      }
    },
    // uma gota de sangue · o.fight: os anticorpos (brancos) cercam o vírus (verde) e ele apaga
    blood(t, o) {
      R('#0c0608', 0, 0, W, H);
      const cx = 120, cy = 66, beat = Math.pow(Math.max(0, Math.sin(t * 4)), 8), pul = 1 + 0.05 * beat;
      glow(cx, cy, 80, '200,20,30', 0.18 + 0.1 * beat);
      ctx.fillStyle = '#7a0e16'; ctx.beginPath(); ctx.arc(cx, cy + 10, 32 * pul, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - 28 * pul, cy); ctx.lineTo(cx, cy - 48 * pul); ctx.lineTo(cx + 28 * pul, cy); ctx.closePath(); ctx.fill();
      R('#c8343c', cx - 18, cy - 2, 3, 12); R('#c8343c', cx - 15, cy - 8, 2, 5); R('#e8707a', cx - 17, cy + 1, 1, 4);
      for (let i = 0; i < 6; i++) {
        const ang = i * 1.05 + t * 0.4, vx = cx + Math.cos(ang) * 17, vy = cy + 12 + Math.sin(ang) * 13;
        const k = o.fight ? clamp01((t - 0.5 - i * 0.4) / 1.4) : 0;
        if (k < 1) {
          const c = k > 0.85 ? '#3a4a3a' : '#7aff5a';
          R(c, vx - 1, vy - 1, 3, 3); R(c, vx, vy - 2); R(c, vx, vy + 2); R(c, vx - 2, vy); R(c, vx + 2, vy);
        } else if (t - 1.9 - i * 0.4 < 0.6) R('#4a2a2a', vx, vy);
        if (o.fight && k > 0) {
          const ax = vx + Math.cos(ang + 0.6) * (40 * (1 - k) + 3), ay = vy + Math.sin(ang + 0.6) * (40 * (1 - k) + 3);
          R('#f0f0f0', ax, ay, 1, 3); R('#f0f0f0', ax - 1, ay - 1); R('#f0f0f0', ax + 1, ay - 1);
        }
      }
    },
    // o zumbi capturado na jaula · o.cured: o efeito da dose (tremor para, olhos apagam, braços baixam)
    cage(t, o) {
      grad(['#101214', '#1a1c1e'], 0, H); R('#0c0c0e', 0, 108, W, H - 108);
      R('#3a3a3a', 119, 0, 2, 8); R('#e8e0c0', 115, 8, 10, 2); glow(120, 12, 80, '255,240,200', 0.12);
      const cured = o.cured ? clamp01((t - 0.5) / 2.5) : 0;
      const jit = (1 - cured) * (Math.sin(t * 40) > 0 ? 1 : 0);
      const zx = 113 + jit, zy = 50, skin = mix('#4a6a3a', '#9a8070', cured);
      R(skin, zx, zy, 14, 13);
      R('#3a3a44', zx - 4, zy + 13, 22, 26); R('#2a2a34', zx + 2, zy + 20, 5, 6);
      if (cured > 0.6) { R(skin, zx - 8, zy + 15, 4, 20); R(skin, zx + 18, zy + 15, 4, 20); }
      else { R(skin, zx - 12, zy + 14, 8, 4); R(skin, zx + 18, zy + 14, 8, 4); R(skin, zx - 14, zy + 13, 3, 3); R(skin, zx + 25, zy + 13, 3, 3); }
      R('#2a2a30', zx - 2, zy + 39, 7, 19); R('#2a2a30', zx + 9, zy + 39, 7, 19);
      const eye = mix('#ff3a2a', '#d8d2bc', cured);
      if (cured < 0.8) glow(zx + 7, zy + 6, 12, '255,58,42', 0.35 * (1 - cured));
      R(eye, zx + 3, zy + 5, 2, 2); R(eye, zx + 9, zy + 5, 2, 2);
      if (cured > 0.9) { R('#1a1a1a', zx + 3.5, zy + 5.5); R('#1a1a1a', zx + 9.5, zy + 5.5); }
      R('#2a0a0a', zx + 4, zy + 9, 6, cured > 0.5 ? 1 : 2);
      for (let x = 88; x <= 152; x += 8) R('#5a5a60', x, 36, 2, 72);
      R('#6a6a70', 86, 34, 70, 3); R('#6a6a70', 86, 106, 70, 3);
      if (!o.cured) {
        const k = clamp01(t / 3), sx = 204 - k * 40;
        R('#c8e0e8', sx, 70, 18, 4); R('#5adf8a', sx + 2, 71, 12, 2); R('#d0d0d0', sx - 8, 71, 8, 1);
        R('#8a8a8a', sx + 18, 71, 6, 2); R('#c89070', sx + 23, 67, 9, 9); R('#e8e4d8', sx + 30, 66, 12, 11);
      } else {
        R('#c8e0e8', 170, 104, 18, 4); R('#d0d0d0', 162, 105, 8, 1);
      }
    },
    // amanhecer: portão aberto, gente saindo do abrigo
    dawn(t) {
      grad(['#3a4a7a', '#e88a6a', '#ffd08a'], 0, GY);
      const sy = GY - 20 - Math.min(36, t * 6);
      glow(176, sy, 70, '255,220,140', 0.5); disc('#fff0c0', 176, sy, 10);
      ctx.globalAlpha = 0.5; R('#ffc8b0', 20 + (t * 3) % 40, 26, 40, 2); R('#ffc8b0', 120 - (t * 2) % 30, 40, 50, 2); ctx.globalAlpha = 1;
      skyline(71, '#7a4a5a', 12, 36, GY, 0, '#000', t);
      R('#4a4434', 0, GY, W, H - GY); R('#5a543e', 0, GY, W, 1);
      for (let i = 0; i < 3; i++) { const bx = (t * 14 + i * 50) % (W + 20) - 10, by = 30 + i * 9 + Math.sin(t * 3 + i) * 2, up = Math.sin(t * 9 + i) > 0; R('#2a2a3a', bx - 2, by + (up ? -1 : 0)); R('#2a2a3a', bx - 1, by); R('#2a2a3a', bx + 1, by); R('#2a2a3a', bx + 2, by + (up ? -1 : 0)); }
      R('#4a3e36', 18, GY - 30, 54, 30); R('#5a4a40', 18, GY - 30, 54, 2); R('#2a2018', 38, GY - 14, 10, 14);
      R('#6a5a4a', 62, GY - 44, 1, 14);
      const wv = Math.sin(t * 4) > 0 ? 1 : 0; R('#e8e4d0', 63, GY - 44 + wv, 8, 5);
      R('#5a5248', 96, GY - 20, 5, 20); R('#7a6040', 101, GY - 18, 12, 16); R('#5a4830', 103, GY - 16, 8, 1);
      const cols = ['#3a3048', '#4a2a2a', '#2a3a4a', '#3a3a2a', '#4a3a2a', '#2a4a3a', '#3a2a3a'];
      for (let i = 0; i < 6; i++) person(106 + ((t * 9 + i * 23) % 136), GY + 14 + (i % 3) * 3, cols[i], t, 7, i, 2);
    },
  };

  // ---------- som (camadas no mesmo formato das skins: Sound.layers) ----------
  const SFX = {
    hum: [['t', 'sine', 110, 0, 2.5, 0.05, 0], ['t', 'sine', 165, 0, 2.5, 0.03, 0.3]],
    alarm: [['t', 'square', 880, 660, 0.3, 0.05, 0], ['t', 'square', 880, 660, 0.3, 0.05, 0.6], ['t', 'square', 880, 660, 0.3, 0.05, 1.2]],
    boom: [['n', 'lowpass', 320, 60, 1.6, 0.3, 0], ['t', 'sawtooth', 70, 40, 1.5, 0.06, 0]],
    drone: [['t', 'sawtooth', 55, 52, 3, 0.05, 0], ['t', 'triangle', 82, 80, 3, 0.04, 0.4]],
    fire: [['n', 'highpass', 2500, 0, 0.6, 0.05, 0], ['n', 'lowpass', 400, 0, 2, 0.08, 0.1], ['t', 'triangle', 220, 0, 2, 0.04, 0.6]],
    heli: [['n', 'lowpass', 260, 200, 2.2, 0.2, 0]],
    bubble: [['t', 'sine', 600, 1200, 0.12, 0.05, 0], ['t', 'sine', 700, 1400, 0.12, 0.05, 0.3], ['t', 'sine', 500, 1000, 0.12, 0.05, 0.7]],
    scream: [['n', 'bandpass', 900, 400, 1.4, 0.18, 0, 3], ['t', 'sawtooth', 300, 180, 1.3, 0.04, 0]],
    heart: [['t', 'sine', 62, 40, 0.18, 0.25, 0], ['t', 'sine', 55, 38, 0.18, 0.18, 0.24], ['t', 'sine', 62, 40, 0.18, 0.25, 1.6], ['t', 'sine', 55, 38, 0.18, 0.18, 1.84]],
    chime: [['t', 'triangle', 523, 0, 1.4, 0.05, 0], ['t', 'triangle', 659, 0, 1.4, 0.05, 0.2], ['t', 'triangle', 784, 0, 1.8, 0.05, 0.4]],
    hope: [['t', 'triangle', 523, 0, 1.2, 0.05, 0], ['t', 'triangle', 659, 0, 1.2, 0.05, 0.3], ['t', 'triangle', 784, 0, 1.2, 0.05, 0.6], ['t', 'triangle', 1047, 0, 2.4, 0.05, 0.9]],
  };
  const sfx = k => { try { if (k && SFX[k] && typeof Sound !== 'undefined') Sound.layers(SFX[k]); } catch (e) { /* sem áudio */ } };

  // ---------- as cenas ----------
  const STORIES = {
    intro: { icon: '🏙️', title: 'O começo', frames: [
      { art: 'city', sfx: 'hum', text: 'Antes, as cidades nunca dormiam. Ninguém deu atenção ao primeiro alerta.' },
      { art: 'lab', sfx: 'alarm', text: 'No Projeto Aurora, a equipe da Dra. Helena Vasconcelos criou um vírus capaz de regenerar tecido morto. Ele prometia curar qualquer ferida.' },
      { art: 'outbreak', sfx: 'boom', text: 'Uma noite, algo escapou do laboratório. Em três dias, os mortos voltaram a andar.' },
      { art: 'map', sfx: 'drone', text: 'A equipe da Aurora fugiu, cada um levando uma parte da pesquisa para uma cidade diferente. Ninguém sabe quem ainda está vivo.' },
      { art: 'shelter', sfx: 'fire', text: 'Você juntou quem sobrou num armazém abandonado. A horda chega ao anoitecer. Este é o último abrigo.' },
    ] },
    evac: { icon: '🚁', title: 'O rastro da Aurora', frames: [
      { art: 'heli', sfx: 'heli', text: 'O rádio do helicóptero chia: "…aqui é da equipe Aurora… os dados da próxima etapa… estão na cidade…"' },
      { art: 'map', o: { full: true, route: true }, sfx: 'drone', text: 'Cada cidade guarda uma parte da pesquisa. Para chegar à Cura, é preciso seguir o rastro deles, de cidade em cidade.' },
    ] },
    cure0: { icon: '🧪', title: 'Isolar o vírus', frames: [
      { art: 'tube', sfx: 'bubble', text: 'Nas anotações da Dra. Helena: "Isolamos o agente. Não é um vírus comum."' },
      { art: 'tube', sfx: 'drone', text: '"Ele não mata o hospedeiro. Reescreve cada célula que toca, e continua se adaptando."' },
    ] },
    cure1: { icon: '👑', title: 'Mapear as mutações', frames: [
      { art: 'king', sfx: 'drone', text: '"Alguns hospedeiros mudam: cospem ácido, incham, crescem até virar monstros."' },
      { art: 'king', sfx: 'scream', text: '"E os maiores parecem comandar os outros. A horda obedece a um grito."' },
    ] },
    cure2: { icon: '🩸', title: 'Anticorpo experimental', frames: [
      { art: 'blood', sfx: 'heart', text: '"Alguns mordidos nunca se transformam. Por meses, ninguém soube por quê."' },
      { art: 'blood', o: { fight: true }, sfx: 'heart', text: '"O sangue deles luta de volta. Se conseguirmos copiar isso, temos uma arma."' },
    ] },
    cure3: { icon: '💉', title: 'Testes em campo', frames: [
      { art: 'cage', sfx: 'drone', text: 'No laboratório improvisado, um zumbi capturado recebe a primeira dose.' },
      { art: 'cage', o: { cured: true }, sfx: 'chime', text: 'Os tremores param. O brilho vermelho some dos olhos. Pela primeira vez, ele fica em silêncio.' },
    ] },
    cure4: { icon: '🌅', title: 'A Cura', frames: [
      { art: 'heli', o: { day: true }, sfx: 'heli', text: 'A vacina sai em caixas, de abrigo em abrigo, de cidade em cidade.' },
      { art: 'dawn', sfx: 'hope', text: 'Pela primeira vez desde o fim, o sol nasce e ninguém precisa correr. Os portões se abrem.' },
    ] },
  };
  const ORDER = ['intro', 'evac', 'cure0', 'cure1', 'cure2', 'cure3', 'cure4'];

  // ---------- estado salvo ----------
  const seenMap = () => (S.meta.story || (S.meta.story = {}));
  const seen = id => typeof S !== 'undefined' && S && !!seenMap()[id];
  function unlocked(id) {
    const m = S.meta;
    if (id === 'intro' || seen(id)) return true;
    if (m.worlds > 1) return true;
    if (id === 'evac') return (m.city || 1) > 1;
    const n = Number(id.slice(4));
    return !!m.cured || (m.cureStage || 0) > n;
  }
  const HINT = { evac: 'Evacue para outra cidade.' };
  function list() {
    return ORDER.map(id => ({ id, icon: STORIES[id].icon, title: STORIES[id].title, unlocked: unlocked(id),
      hint: HINT[id] || `Conclua a etapa ${Number(id.slice(4)) + 1} da Cura (aba Pesquisa).` }));
  }

  // ---------- reprodução ----------
  const canShow = () => typeof HTMLCanvasElement !== 'undefined' && typeof document !== 'undefined' && document.body;

  function build() {
    root = document.createElement('div');
    root.id = 'story';
    root.className = 'story hidden';
    root.innerHTML = `<div class="st-box" role="dialog" aria-modal="true" aria-label="Cena da história">
        <div class="st-head"><span class="st-title"></span><span class="st-count"></span></div>
        <div class="st-frame"><canvas class="st-cv" width="${W}" height="${H}"></canvas></div>
        <p class="st-text" aria-live="polite"></p>
        <div class="st-foot"><button class="link st-skip">Pular cena ⏭</button><span class="st-next">Clique para continuar ▶</span></div>
      </div>`;
    document.body.appendChild(root);
    cv = root.querySelector('.st-cv'); ctx = cv.getContext('2d');
    txt = root.querySelector('.st-text'); ttl = root.querySelector('.st-title'); cnt = root.querySelector('.st-count');
    root.addEventListener('click', e => {
      e.stopPropagation();
      if (e.target.closest('.st-skip')) finish(); else advance();
    });
    // enquanto a cena roda, as teclas são dela (não pausam o jogo nem acionam janelas por baixo)
    window.addEventListener('keydown', e => {
      if (!cur) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.key === 'Escape') finish();
      else if ([' ', 'Enter', 'ArrowRight'].includes(e.key)) advance();
    }, true);
  }

  function showFrame(i) {
    fi = i; ft = 0; shown = reduce() ? Infinity : 0;
    const F = cur.frames[i];
    cnt.textContent = `${i + 1}/${cur.frames.length}`;
    txt.textContent = reduce() ? F.text : '';
    sfx(F.sfx);
  }

  function advance() {
    if (!cur) return;
    const F = cur.frames[fi];
    if (shown < F.text.length) { shown = F.text.length; txt.textContent = F.text; return; }
    if (fi + 1 < cur.frames.length) showFrame(fi + 1); else finish();
  }

  function loop(now) {
    if (!cur) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    ft += dt;
    const F = cur.frames[fi];
    if (shown < F.text.length) {
      shown = Math.min(F.text.length, shown + dt * CPS);
      txt.textContent = F.text.slice(0, Math.floor(shown));
    }
    root.classList.toggle('typing', shown < F.text.length);
    ctx.save();
    ART[F.art](reduce() ? 1.5 : ft, F.o || {});
    ctx.restore();
    // vinheta e entrada do quadro (escurecido no começo)
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    if (ft < 0.6) { ctx.fillStyle = `rgba(0,0,0,${1 - ft / 0.6})`; ctx.fillRect(0, 0, W, H); }
    raf = requestAnimationFrame(loop);
  }

  // toca a cena; se outra estiver tocando, entra na fila. cb roda quando ela termina (ou é pulada)
  function play(id, cb) {
    const st = STORIES[id];
    if (!st || !canShow()) { if (cb) cb(); return; }
    if (cur) { queue.push([id, cb]); return; }
    if (!root) build();
    if (typeof S !== 'undefined' && S) seenMap()[id] = 1;
    cur = st; cid = id; onEnd = cb || null;
    ttl.textContent = `${st.icon} ${st.title}`;
    root.classList.remove('hidden');
    showFrame(0);
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  // só na primeira vez (neste save)
  function playOnce(id, cb) {
    if (seen(id)) { if (cb) cb(); return; }
    play(id, cb);
  }

  function finish() {
    if (!cur) return;
    cancelAnimationFrame(raf); raf = 0;
    cur = null; cid = '';
    root.classList.add('hidden');
    const cb = onEnd; onEnd = null;
    if (typeof save === 'function') try { save(); } catch (e) { /* sem save */ }
    if (cb) cb();
    if (!cur && queue.length) { const [id, next] = queue.shift(); play(id, next); }
  }

  return { play, playOnce, list, on: () => !!cur, current: () => cid, STORIES };
})();
