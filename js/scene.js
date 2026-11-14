'use strict';

// Cena animada em pixel art desenhada no canvas.
const Scene = (() => {
  const { W, H, GY, WALL_X } = WORLD;
  const FIRE = { x: 100, y: 176 };
  const TOWER_TOP = 124;
  const LEADER = { x: 52, y: 99 };

  let cv, ctx, scale = 1, time = 0, night = 0;
  let shake = 0, redFlash = 0, wallJolt = 0, leaderMuzzle = 0, champMuzzle = 0;
  const towerMuzzle = [0, 0, 0];
  const parts = [], decals = [], tracers = [], texts = [], corpses = [], people = [], lights = [];
  const travelers = [], flashes = [], planes = [], toasts = [];
  const later = [];   // efeitos agendados (ácido ou granada chegando no muro)
  const after = (t, fn) => later.push({ t, fn });
  let hordeVis = 0;
  const hitAt = new Map();
  let banner = null, pid = 1;
  let alert = null;   // alerta de onda perigosa (contagem até a horda)
  const ptr = { x: W / 2, y: H / 2, in: false, down: false };
  let dayHintT = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rand(a, b + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const seeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const shade = (c, f) => c.map(v => Math.max(0, Math.min(255, Math.round(v * f))));
  const prune = (arr, keep) => { for (let i = arr.length - 1; i >= 0; i--) if (!keep(arr[i])) arr.splice(i, 1); };

  // Cores em array recebem o tom da noite; strings (luzes) não.
  function T(c) {
    if (typeof c === 'string') return c;
    const n = night;
    return `rgb(${Math.round(c[0] * (1 - n * 0.5))},${Math.round(c[1] * (1 - n * 0.47))},${Math.round(c[2] * (1 - n * 0.3) + n * 14)})`;
  }
  function rect(c, x, y, w, h) { ctx.fillStyle = T(c); ctx.fillRect(x, y, w, h); }
  function circle(c, x, y, r) { ctx.fillStyle = T(c); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function light(x, y, r, c, a) { lights.push({ x, y, r, c, a }); }

  const city = (() => {
    const r = seeded(7), far = [], near = [];
    for (let x = -10; x < W + 20;) {
      const w = 18 + r() * 30, h = 40 + r() * 55;
      far.push({ x, w, h, jag: [r() * 8, r() * 10, r() * 6, r() * 10] });
      x += w + r() * 4;
    }
    for (let x = 60; x < W + 20;) {
      const w = 16 + r() * 26, h = 22 + r() * 40, win = [];
      for (let wy = 8; wy < h - 4; wy += 7)
        for (let wx = 3; wx < w - 4; wx += 6)
          if (r() < 0.55) win.push({ x: wx, y: wy, lit: r() < 0.15, f: r() * 10 });
      near.push({ x, w, h, win, jag: [r() * 6, r() * 12, r() * 4, r() * 9] });
      x += w + 3 + r() * 12;
    }
    const stars = Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * 95, tw: r() * 6 }));
    const cracks = Array.from({ length: 25 }, () => ({ x: r() * W, y: 160 + r() * 34, w: 2 + r() * 8 }));
    const horde = Array.from({ length: 45 }, () => ({ x: 200 + r() * 300, y: GY - r() * 3, s: 0.5 + r() * 0.4, sp: 2 + r() * 3, ph: r() * 6 }));
    const fog = Array.from({ length: 6 }, () => ({ x: r() * W, y: 162 + r() * 30, w: 60 + r() * 80, sp: 3 + r() * 4 }));
    return { far, near, stars, cracks, horde, fog };
  })();

  // Paletas dos estilos visuais (Configurações → Estilo do cenário)
  const LOOKS = {
    classic: { dayTop: [118, 128, 128], dayBot: [200, 152, 100], nightTop: [22, 28, 52], nightBot: [56, 52, 84], wave: [96, 34, 36],
               far: [128, 118, 110], near: [84, 80, 78], win: [46, 44, 48], lit: ['240,200,96'] },
    synth:   { dayTop: [46, 22, 92], dayBot: [255, 112, 150], nightTop: [26, 14, 56], nightBot: [100, 34, 124], wave: [126, 30, 96],
               far: [104, 50, 140], near: [44, 24, 72], win: [70, 36, 96], lit: ['255,80,200', '80,230,255'], neon: true },
    terror:  { dayTop: [96, 104, 98], dayBot: [156, 150, 124], nightTop: [18, 24, 20], nightBot: [46, 58, 46], wave: [78, 32, 28],
               far: [92, 98, 90], near: [54, 58, 52], win: [30, 34, 30], lit: ['190,220,120'], fog: 0.45 },
  };
  const look = () => LOOKS[sceneStyle()] || LOOKS.classic;

  function building(b, base, color, neon) {
    ctx.fillStyle = T(color);
    ctx.beginPath();
    ctx.moveTo(b.x, base);
    ctx.lineTo(b.x, base - b.h + b.jag[0]);
    ctx.lineTo(b.x + b.w * 0.35, base - b.h + b.jag[1]);
    ctx.lineTo(b.x + b.w * 0.6, base - b.h + b.jag[2]);
    ctx.lineTo(b.x + b.w, base - b.h + b.jag[3]);
    ctx.lineTo(b.x + b.w, base);
    ctx.fill();
    if (neon) {
      // contorno neon no topo dos prédios
      ctx.strokeStyle = neon; ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(b.x, base - b.h + b.jag[0]);
      ctx.lineTo(b.x + b.w * 0.35, base - b.h + b.jag[1]);
      ctx.lineTo(b.x + b.w * 0.6, base - b.h + b.jag[2]);
      ctx.lineTo(b.x + b.w, base - b.h + b.jag[3]);
      ctx.stroke();
    }
  }

  const SKINS = [[234, 192, 160], [200, 150, 110], [150, 100, 70], [110, 72, 50], [224, 176, 140]];
  const HAIRS = [[40, 30, 20], [90, 60, 30], [20, 20, 20], [160, 120, 60], [120, 120, 120], [150, 60, 30]];
  const JOBLOOK = {
    forrageiro: { shirt: [96, 122, 64], pants: [90, 70, 50] },
    coletor:    { shirt: [184, 112, 52], pants: [60, 64, 80] },
    armeiro:    { shirt: [80, 92, 112], pants: [50, 50, 58], apron: true },
    guarda:     { shirt: [88, 98, 62], pants: [70, 74, 52], helmet: true },
    medico:     { shirt: [222, 222, 216], pants: [90, 110, 140], cross: true },
    cientista:  { shirt: [236, 240, 240], pants: [60, 80, 100] },
    ocioso:     {},
    ferido:     { bandage: true },
  };
  const ZSKIN = [[112, 140, 92], [124, 134, 88], [98, 126, 96], [130, 140, 110]];
  const ZSHIRT = [[74, 62, 84], [96, 52, 52], [62, 74, 62], [80, 80, 90], [110, 96, 70]];

  // Armas do líder em pixel art (coordenadas locais do boneco virado para a direita, pés em 0,0).
  // tip: ponta do cano, de onde saem clarão, traçante, granada e foguete.
  const G_DARK = [34, 34, 38], G_STEEL = [96, 100, 108], G_WOOD = [112, 72, 36], G_OLIVE = [78, 88, 48];
  // cores de cada arma vêm da skin equipada (WSkins.pal: o padrão reproduz as cores originais); skin: detalhes por cima
  const gp = w => (typeof WSkins !== 'undefined' ? WSkins.pal(w) : { body: G_WOOD, bodyHi: G_WOOD, bodyLo: G_DARK, metal: G_DARK, metalHi: G_STEEL, metalLo: G_DARK, accent: [170, 40, 30], glow: [150, 200, 230] });
  const skinDeco = (w, R, dy) => { if (typeof WSkins !== 'undefined') WSkins.mini(w, (c, x, y, ww, hh) => R(c, x, y + dy, ww, hh), time); };
  const GUNS = {
    pistola: { tip: [8, -11], draw(R, o, dy) {
      const k = gp('pistola');
      R(o.shirt, 0, -10 + dy, 5, 2);                                  // braço esticado
      R(k.metal, 5, -11 + dy, 3, 1); R(k.metalHi, 5, -12 + dy, 2, 1); // cano e ferrolho
      R(o.skin, 5, -10 + dy, 1, 2); R(k.body, 6, -10 + dy, 1, 1);     // mão no cabo
      skinDeco('pistola', R, dy);
    } },
    espingarda: { tip: [12, -11], draw(R, o, dy) {
      const k = gp('espingarda');
      R(k.body, -1, -10 + dy, 3, 2);                                  // coronha
      R(k.metal, 2, -11 + dy, 3, 2);                                  // caixa
      R(k.metalHi, 5, -11 + dy, 7, 1); R(k.metal, 5, -10 + dy, 5, 1); // cano duplo
      R(k.body, 7, -10 + dy, 2, 1);                                   // telha (pump)
      R(o.shirt, 0, -10 + dy, 3, 2); R(o.skin, 7, -9 + dy, 2, 1);     // braços: gatilho e telha
      skinDeco('espingarda', R, dy);
    } },
    rifle: { tip: [13, -11], draw(R, o, dy) {
      const k = gp('rifle');
      R(k.body, -1, -10 + dy, 4, 2); R(k.body, 3, -11 + dy, 4, 1);    // coronha e guarda-mão
      R(k.metal, 7, -11 + dy, 6, 1);                                  // cano longo
      R(k.metal, 3, -13 + dy, 4, 1); R(k.metalHi, 4, -12 + dy, 1, 1); R(k.glow, 7, -13 + dy, 1, 1);   // luneta
      R(o.shirt, 0, -10 + dy, 3, 2); R(o.skin, 6, -10 + dy, 1, 1);
      skinDeco('rifle', R, dy);
    } },
    smg: { tip: [10, -11], draw(R, o, dy) {
      const k = gp('smg');
      R(k.metal, -1, -11 + dy, 2, 1);                                 // coronha de arame
      R(k.metal, 1, -11 + dy, 6, 2); R(k.metalHi, 7, -11 + dy, 3, 1); // corpo e cano curto
      R(k.bodyLo, 4, -9 + dy, 1, 3);                                  // pente
      R(o.shirt, 0, -10 + dy, 3, 2); R(o.skin, 3, -9 + dy, 1, 1); R(o.skin, 6, -10 + dy, 1, 1);
      skinDeco('smg', R, dy);
    } },
    granadas: { tip: [11, -11], draw(R, o, dy) {
      const k = gp('granadas');
      R(k.metal, -1, -10 + dy, 2, 1);                                 // coronha
      R(k.body, 1, -12 + dy, 9, 3);                                   // tubo grosso
      R(k.bodyLo, 3, -12 + dy, 3, 3);                                 // tambor
      R(k.metal, 10, -12 + dy, 1, 3);                                 // boca
      R(o.shirt, 0, -10 + dy, 2, 2); R(o.skin, 2, -9 + dy, 1, 2); R(o.skin, 7, -9 + dy, 1, 1);
      skinDeco('granadas', R, dy);
    } },
    chamas: { tip: [11, -11], draw(R, o, dy) {
      const k = gp('chamas');
      R(k.accent, -5, -13 + dy, 2, 7); R(shade(k.accent, 0.7), -5, -13 + dy, 2, 1);   // tanque nas costas
      R(k.metalLo, -3, -8 + dy, 3, 1);                                // mangueira
      R(k.metalHi, 1, -11 + dy, 8, 2); R(k.metal, 9, -11 + dy, 2, 1); // lança e bico
      R(k.body, 3, -9 + dy, 1, 2);                                    // cabo
      R(o.shirt, 0, -10 + dy, 3, 2); R(o.skin, 3, -10 + dy, 1, 1);
      R(Math.random() < 0.5 ? [255, 160, 40] : [255, 220, 90], 11, -11 + dy, 1, 1);   // chama-piloto
      skinDeco('chamas', R, dy);
    } },
    bazuca: { tip: [15, -13], draw(R, o, dy) {
      const k = gp('bazuca');
      R(k.bodyLo, -6, -14 + dy, 3, 3);                                // traseira, saindo atrás da cabeça
      R(k.body, 3, -14 + dy, 10, 3);                                  // tubo no ombro, à frente do rosto
      R(k.bodyLo, 13, -15 + dy, 2, 5);                                // boca
      R(k.metal, 6, -16 + dy, 2, 2);                                  // mira
      R(k.metal, 3, -11 + dy, 1, 2); R(k.metal, 6, -11 + dy, 1, 2);   // empunhaduras
      R(o.shirt, 0, -10 + dy, 3, 2); R(o.skin, 3, -10 + dy, 1, 1); R(o.skin, 6, -10 + dy, 1, 1);
      skinDeco('bazuca', R, dy);
    } },
  };
  // ---------- mira: braço e arma do líder acompanham o ponteiro ----------
  // O braço e a arma são desenhados num canvas pequeno (coordenadas do boneco) e girados em volta do ombro como imagem,
  // com o filtro de pixel ligado: a pixel art continua nítida em qualquer ângulo.
  const AIM_PIV = { x: 1, y: -10 }, AIM_MIN = -0.55, AIM_MAX = 0.8;   // ombro · limites (radianos: para cima / para baixo)
  const GOFF = typeof document !== 'undefined' ? document.createElement('canvas') : null, GOX = 14, GOY = 26;
  if (GOFF) { GOFF.width = 48; GOFF.height = 34; }
  let aimAng = 0.2;
  function drawGunAimed(o, dy) {
    const main = ctx, g = GOFF.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, GOFF.width, GOFF.height); g.globalAlpha = 1;
    g.translate(GOX, GOY);
    // skins fantasmas (Caçador Espectral, Água-Viva): a arma inteira fica translúcida e cintila
    if (typeof WSkins !== 'undefined' && WSkins.ghost(o.gun)) g.globalAlpha = 0.6 + 0.2 * Math.sin(time * 3);
    ctx = g;
    GUNS[o.gun].draw((c, a, b, w, h) => rect(o.flash ? '#ffffff' : c, a, b, w, h), o, 0);
    ctx = main;
    main.save();
    main.translate(AIM_PIV.x, AIM_PIV.y + dy);
    main.rotate(o.aim);
    main.imageSmoothingEnabled = false;
    main.drawImage(GOFF, -GOX - AIM_PIV.x, -GOY - AIM_PIV.y);
    main.restore();
  }
  // ângulo da mira (suavizado): para o ponteiro durante a horda; parado, arma levemente abaixada
  function updateAim() {
    const want = S.horde.active && ptr.in
      ? Math.max(AIM_MIN, Math.min(AIM_MAX, Math.atan2(ptr.y - (LEADER.y + AIM_PIV.y), Math.max(4, ptr.x - (LEADER.x + AIM_PIV.x)))))
      : 0.12;
    aimAng += (want - aimAng) * 0.35;
  }
  // ponto girado em volta do ombro do líder
  const aimRot = (lx, ly) => { const dx = lx - AIM_PIV.x, dy = ly - AIM_PIV.y, c = Math.cos(aimAng), si = Math.sin(aimAng);
    return { x: LEADER.x + AIM_PIV.x + dx * c - dy * si, y: LEADER.y + AIM_PIV.y + dx * si + dy * c }; };
  let leaderSwap = 0;   // anima a troca de arma (abaixa e levanta)
  const leaderGun = () => (S.horde.active ? Weapons.current() : null);
  const gunTip = () => { const k = leaderGun(), g = GUNS[k]; const t = g ? g.tip : [9, -11]; return aimRot(t[0] + (k && typeof WSkins !== 'undefined' ? WSkins.tipDx(k) : 0), t[1]); };

  function drawHuman(x, y, o) {
    const s = o.scale || 1;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale((o.face || 1) * s, s * (o.sy || 1));   // sy: achata (agachado) ou estica (no salto)
    // partes soltas do corpo: oy desloca o pivô para o centro da parte; clip mostra só aquela faixa
    if (o.oy) ctx.translate(0, o.oy);
    if (o.clip) { ctx.beginPath(); ctx.rect(-12, o.clip[0], 24, o.clip[1] - o.clip[0]); ctx.clip(); }
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const R = (c, a, b, w, h) => rect(o.flash ? '#ffffff' : c, a, b, w, h);
    const p = o.pose || 'stand';
    const moving = p === 'walk' || p === 'carry' || p === 'zwalk';
    const sw = moving ? Math.round(Math.sin(o.phase) * 1.5) : 0;
    const bob = moving ? -Math.round(Math.abs(Math.sin(o.phase))) : 0;
    const crouch = p === 'work' && o.crouch ? 2 : 0;
    const sit = p === 'sit' ? 3 : 0;
    const dy = bob + crouch + sit;
    const shoe = o.boots || [40, 34, 30];

    // pernas
    if (sit) { R(o.pants, -2, -3, 6, 2); R(shoe, 4, -3, 1, 2); }
    else if (crouch) { R(o.pants, -2, -3, 5, 3); R(shoe, -2, -1, 2, 1); R(shoe, 2, -1, 2, 1); }
    else {
      R(o.pants, -2 + sw, -5, 2, 4); R(o.pants, 1 - sw, -5, 2, 4);
      R(shoe, -2 + sw, -1, 2, 1); R(shoe, 1 - sw, -1, 2, 1);
    }
    if (o.pack) { R(o.pack, -5, -11 + dy, 2, 5); R(shade(o.pack, 0.75), -5, -11 + dy, 2, 1); }
    // corpo
    if (o.fat) {
      R(o.shirt, -4, -12 + dy, 8, 7); R(o.skin, -3, -8 + dy, 6, 2);
      R([190, 160, 90], -2, -10 + dy, 1, 1); R([190, 160, 90], 2, -7 + dy, 1, 1); R([190, 160, 90], 0, -11 + dy, 1, 1);
    } else R(o.shirt, -3, -11 + dy, 6, 6);
    R(o.belt || [40, 32, 26], -3, -6 + dy, 6, 1);
    if (o.vest) { R(o.vest, -3, -11 + dy, 6, 4); R([220, 190, 40], -3, -9 + dy, 6, 1); }
    if (o.spores) { R([190, 120, 220], -2, -10 + dy, 1, 1); R([190, 120, 220], 1, -8 + dy, 1, 1); R([150, 90, 190], 2, -11 + dy, 1, 1); }
    if (o.spikes) { R([220, 210, 190], -4, -13 + dy, 1, 2); R([220, 210, 190], -4, -10 + dy, 1, 2); R([220, 210, 190], -3, -15 + dy, 1, 2); R([120, 20, 20], -1, -10 + dy, 3, 2); }
    if (o.apron) R([110, 80, 50], -1, -9 + dy, 4, 4);
    if (o.cross) { R([200, 40, 40], 0, -10 + dy, 1, 3); R([200, 40, 40], -1, -9 + dy, 3, 1); }
    if (o.torn) { R(o.skin, -2, -8 + dy, 2, 1); R(o.skin, 1, -10 + dy, 1, 1); R([120, 20, 20], 0, -7 + dy, 1, 1); }
    if (o.body) o.body(R, dy, o);   // roupas com detalhes (skins de personagem)
    // cabeça
    const hx = -2 + (o.lean || 0);
    const hairOn = !o.noHair;   // capacetes e capuzes fechados escondem o cabelo
    if (hairOn && o.afro) R(o.hair, hx - 1, -19 + dy, 7, 4);
    if (hairOn && o.bun) R(o.hair, hx - 1, -19 + dy, 3, 2);
    R(o.skin, hx, -16 + dy, 5, 5);
    if (hairOn) {
      if (o.bald || o.mohawk) R(o.hair, hx, -15 + dy, 1, 2);   // só os lados
      else { R(o.hair, hx, -17 + dy, 5, 2); R(o.hair, hx, -16 + dy, 1, 3); }
      if (o.mohawk) R(o.hair, hx + 1, -19 + dy, 3, 3);
      if (o.longHair) R(o.hair, hx - 1, -16 + dy, 2, 7);
      if (o.afro) R(o.hair, hx - 1, -16 + dy, 2, 4);
    }
    if (o.cap) { R(o.cap, hx - 1, -18 + dy, 6, 2); R(o.cap, hx + 4, -17 + dy, 2, 1); }
    if (o.helmet) R(o.helmet === true ? [70, 78, 50] : o.helmet, hx - 1, -18 + dy, 7, 3);
    if (o.bandage) { R([236, 232, 220], hx, -16 + dy, 5, 1); R([180, 30, 30], hx + 1, -16 + dy, 1, 1); R([236, 232, 220], -1, -9 + dy, 4, 2); }
    R(o.eye || [20, 20, 20], hx + 3, -14 + dy, 1, 1);
    if (o.beard) { R(o.beard, hx + 1, -12 + dy, 4, 2); R(o.beard, hx, -14 + dy, 1, 3); }
    if (o.mustache) R(o.mustache, hx + 2, -12 + dy, 3, 1);
    if (o.glasses) { R([30, 30, 30], hx + 2, -14 + dy, 3, 1); R(o.glasses === 'sun' ? [20, 20, 20] : [170, 210, 230], hx + 3, -14 + dy, 1, 1); }
    if (o.goggles) { R([50, 50, 55], hx, -15 + dy, 5, 1); R([120, 200, 220], hx + 3, -15 + dy, 2, 1); }
    if (o.patch) { R([20, 20, 20], hx, -15 + dy, 5, 1); R([20, 20, 20], hx + 3, -14 + dy, 2, 1); }
    if (o.hardhat) { R(o.hardhat, hx - 1, -19 + dy, 6, 3); R(o.hardhat, hx + 5, -17 + dy, 1, 1); R(shade(o.hardhat, 0.8), hx - 1, -17 + dy, 7, 1); }
    if (o.beret) { R(o.beret, hx - 1, -18 + dy, 6, 2); R(o.beret, hx + 4, -19 + dy, 2, 1); }
    if (o.bandana) { R(o.bandana, hx, -17 + dy, 5, 2); R(o.bandana, hx - 2, -16 + dy, 2, 1); R(o.bandana, hx - 2, -15 + dy, 1, 1); }
    if (o.scarf) { R(o.scarf, -3, -11 + dy, 6, 1); R(o.scarf, -4, -11 + dy, 1, 3); }
    if (o.mask) R(o.mask, hx + 1, -13 + dy, 4, 2);
    if (o.riot) { R([24, 28, 38], hx - 1, -18 + dy, 7, 4); R([110, 150, 180], hx + 3, -16 + dy, 3, 2); R([24, 28, 38], hx - 1, -14 + dy, 1, 3); }
    if (o.spores) { R([190, 120, 220], hx + 1, -16 + dy, 1, 1); R([150, 90, 190], hx + 4, -13 + dy, 1, 1); }
    if (o.mouth) R([90, 20, 20], hx + 3, -12 + dy, 2, 1);
    if (o.drool) R('#9be35a', hx + 4, -12 + dy, 1, 2 + Math.round(Math.abs(Math.sin(o.phase))));
    if (o.head) o.head(R, dy, o, hx);   // chapéus, capacetes e máscaras das skins de personagem
    // braços
    switch (p) {
      case 'aim':
        if (o.gun && GUNS[o.gun] && o.aim != null) { drawGunAimed(o.sleeve || o.glove ? { ...o, shirt: o.sleeve || o.shirt, skin: o.glove || o.skin } : o, dy + (o.gunDy || 0)); break; }
        if (o.gun && GUNS[o.gun]) { GUNS[o.gun].draw(R, o.sleeve || o.glove ? { ...o, shirt: o.sleeve || o.shirt, skin: o.glove || o.skin } : o, dy + (o.gunDy || 0)); break; }
        R(o.shirt, 0, -10 + dy, 4, 2); R(o.skin, 4, -10 + dy, 1, 2);
        R([30, 30, 30], 2, -11 + dy, 7, 1); R([90, 60, 30], 0, -10 + dy, 2, 1);
        break;
      case 'work': {
        const up = Math.sin(o.phase * 2.5) > 0, tool = o.crouch ? [90, 70, 40] : [140, 140, 150];
        if (up) { R(o.shirt, 1, -12 + dy, 2, 3); R(o.skin, 1, -13 + dy, 2, 1); R(tool, 2, -16 + dy, 1, 3); }
        else { R(o.shirt, 1, -10 + dy, 3, 2); R(o.skin, 4, -9 + dy, 1, 2); R(tool, 5, -10 + dy, 1, 3); }
        break;
      }
      case 'carry':
        R([122, 90, 48], -6, -13 + dy, 4, 6); R([90, 64, 32], -6, -13 + dy, 4, 1);
        R(o.shirt, 0, -10 + dy, 2, 4);
        break;
      case 'zwalk': case 'zattack': {
        const a = p === 'zattack' ? Math.round(Math.sin(o.phase * 1.5) * 2) : 0;
        if (!o.oneArm) { R(shade(o.shirt, 0.8), 1, -11 + dy - a, 5, 2); R(o.skin, 6, -11 + dy - a, 1, 2); }
        else R([120, 20, 20], 1, -11 + dy, 1, 2);
        R(o.shirt, 0, -9 + dy + a, 5, 2); R(o.skin, 5, -9 + dy + a, 1, 2);
        break;
      }
      case 'sit':
        R(o.shirt, 1, -10 + dy, 2, 3); R(o.skin, 2, -7 + dy, 2, 1);
        break;
      default:
        R(shade(o.sleeve || o.shirt, 0.85), -1 - sw, -10 + dy, 2, 5); R(o.glove || o.skin, -1 - sw, -5 + dy, 2, 1);
    }
    if (o.front) o.front(R, dy, o, hx);   // objetos na frente do corpo (cajado...)
    // detalhes próprios de cada chefe, nas mesmas coordenadas do boneco
    if (o.extra) o.extra(R, dy, o);
    ctx.restore();
  }

  const ZPANTS = [[52, 50, 62], [70, 60, 46], [40, 44, 70], [80, 76, 70]];
  const ZHAIR = [[40, 46, 36], [70, 60, 50], [110, 90, 60], [30, 30, 30], [140, 140, 130]];
  const ZCAPS = [[160, 40, 40], [40, 70, 140], [200, 170, 60]];
  const lookCache = new Map();

  // ---------- chefes: cores próprias e detalhes desenhados por cima do boneco ----------
  const BONE = [214, 204, 180], BONE_D = [160, 150, 128];
  const BOSSLOOK = {
    saltador:   { skin: [120, 152, 172], shirt: [56, 66, 88], pants: [40, 46, 64], eye: [120, 255, 240], lean: 2 },
    rolador:    { skin: [156, 112, 78], shirt: [118, 80, 48], pants: [88, 60, 40], eye: [255, 150, 40] },
    matriarca:  { skin: [150, 118, 140], shirt: [98, 58, 88], pants: [70, 40, 60], eye: [255, 80, 170], hair: [60, 30, 50], longHair: true, bald: false },
    colosso:    { skin: [150, 92, 80], shirt: [96, 74, 62], pants: [62, 50, 44], eye: [255, 200, 60] },
    escavador:  { skin: [128, 116, 88], shirt: [112, 90, 58], pants: [70, 60, 40], eye: [255, 230, 120], hardhat: [220, 176, 46] },
    colossal:   { skin: [176, 156, 108], shirt: [136, 124, 100], pants: [90, 80, 70], eye: [255, 255, 120], fat: true },
    carcaca:    { skin: [196, 186, 164], shirt: [72, 40, 40], pants: [42, 30, 30], eye: [255, 60, 40] },
    cuspideira: { skin: [138, 170, 62], shirt: [68, 90, 40], pants: [50, 60, 36], eye: [200, 255, 80], drool: true },
    reiuivador: { skin: [192, 192, 176], hair: [244, 244, 232], longHair: true, bald: false, shirt: [84, 40, 116], pants: [60, 30, 84], eye: [255, 240, 120] },
    gigante:    { skin: [128, 108, 160], shirt: [70, 54, 96], pants: [52, 42, 70], eye: [220, 150, 255], spores: true },
    chefao:     { shirt: [44, 44, 48], pants: [52, 42, 32], helmet: true, mask: [150, 20, 20], eye: [20, 20, 20], bald: false },
    cria:       { skin: [160, 122, 146], shirt: [150, 112, 136], pants: [140, 104, 126], eye: [255, 80, 170], mouth: true },
    broto:      { skin: [128, 116, 150], shirt: [70, 60, 90], spores: true },
  };
  // detalhes (coordenadas locais: frente em +x, pés em 0) · z: o zumbi, para animar com o estado
  const BOSSX = {
    saltador(R, dy, o, z) {
      const sk = shade(o.skin, 0.75);
      R(sk, -4, -13 + dy, 1, 7);                                   // espinha saltada
      R(sk, -3, -5, 2, 2); R(sk, 1, -5, 2, 2);                     // coxas enormes
      R([230, 230, 220], 7, -11 + dy, 1, 1); R([230, 230, 220], 6, -8 + dy, 1, 1);   // garras
    },
    rolador(R, dy, o) {
      for (let i = 0; i < 4; i++) R(i % 2 ? [128, 100, 70] : [96, 74, 52], -5, -15 + dy + i * 3, 4, 3);   // placas das costas
      R([128, 100, 70], -3, -18 + dy, 7, 2);
    },
    matriarca(R, dy, o) {
      const p = Math.round(Math.sin(time * 4) * 0.8);
      R([170, 120, 150], -9 - p, -16 + dy, 6 + p, 10);              // bolsa de ovos nas costas, pulsando
      R([220, 200, 160], -8, -14 + dy, 1, 1); R([220, 200, 160], -6, -11 + dy, 1, 1); R([220, 200, 160], -8, -9 + dy, 1, 1);
      R(o.skin, 1, -7 + dy, 5, 1); R(o.skin, 6, -6 + dy, 1, 1);    // braços extras
    },
    colosso(R, dy, o, z) {
      if (!z.ph) {                                                 // casca de pedra
        R([112, 110, 104], -5, -14 + dy, 10, 10); R([90, 88, 84], -5, -10 + dy, 10, 1); R([90, 88, 84], -1, -14 + dy, 1, 4);
        R([112, 110, 104], -3, -19 + dy, 8, 3);
      } else {                                                     // carne exposta
        R([176, 52, 52], -3, -11 + dy, 6, 6); R([120, 20, 20], -1, -10 + dy, 1, 4); R([120, 20, 20], 1, -8 + dy, 2, 1);
      }
    },
    escavador(R, dy, o) {
      R([206, 196, 176], 6, -12 + dy, 2, 2); R([206, 196, 176], 7, -10 + dy, 2, 2); R([206, 196, 176], 6, -8 + dy, 2, 2);   // garras de pá
      R([255, 244, 170], 1, -19 + dy, 1, 1);                       // lanterna do capacete
    },
    colossal(R, dy, o, z) {
      const k = z.state === 'fuse' ? Math.min(1, (z.tt || 0) / ZTYPES.colossal.bloat.fuse) : 0;
      const w = 12 + Math.round(k * 3);
      R(o.skin, -w / 2, -14 + dy, w, 10);                          // barriga gigante
      for (const [x, y] of [[-4, -12], [2, -9], [-1, -13], [3, -12], [-3, -7]]) R(k && Math.sin(time * 20) > 0 ? [255, 90, 60] : [200, 170, 80], x, y + dy, 1, 1);
    },
    carcaca(R, dy, o, z) {
      for (let i = 0; i < 4; i++) R(i % 2 ? BONE : BONE_D, -3, -11 + dy + i * 2, 6, 1);   // costelas
      R(BONE, -2, -18 + dy, 5, 2);                                  // crânio
      if (z.open) { const g = Math.sin(time * 14) > 0; R(g ? [255, 210, 80] : [255, 110, 50], -1, -10 + dy, 3, 3); }
      else { R(BONE_D, -2, -10 + dy, 2, 3); R(BONE, 0, -10 + dy, 2, 3); }   // placas fechadas sobre o tumor
    },
    cuspideira(R, dy, o, z) {
      const p = z.told ? 2 : Math.round(Math.abs(Math.sin(time * 3)));
      R([110, 190, 50], 0, -12 + dy, 5 + p, 4 + p);                // papo cheio de ácido
      R([170, 240, 90], 1, -11 + dy, 2, 1);
    },
    reiuivador(R, dy, o) {
      R(o.shirt, -3, -11 + dy, 6, 10); R(shade(o.shirt, 0.7), -3, -2, 6, 1);   // manto até os pés
      R(BONE, -2, -18 + dy, 5, 1); R(BONE, -2, -20 + dy, 1, 2); R(BONE, 0, -21 + dy, 1, 3); R(BONE, 2, -20 + dy, 1, 2);   // coroa de ossos
    },
    gigante(R, dy, o) {
      R([180, 50, 60], -3, -19 + dy, 7, 2); R([240, 230, 220], -2, -19 + dy, 1, 1); R([240, 230, 220], 2, -19 + dy, 1, 1);   // cogumelo na cabeça
      R([170, 100, 200], -5, -13 + dy, 3, 2); R([150, 80, 180], -5, -9 + dy, 2, 2); R([170, 100, 200], 3, -6 + dy, 2, 2);   // brotos no corpo
    },
    chefao(R, dy) {
      R([96, 98, 108], 5, -16 + dy, 2, 12); R([140, 144, 156], 5, -16 + dy, 1, 12); R([200, 40, 40], 6, -11 + dy, 1, 2);   // escudo
    },
    broto(R, dy) { R([170, 100, 200], -4, -12 + dy, 2, 2); R([180, 50, 60], -2, -18 + dy, 5, 1); },
  };
  const BOSSCOLOR = { chefe: '#ff3a3a', saltador: '#6fe0ff', rolador: '#ff9a40', matriarca: '#ff70c0', colosso: '#d8b080', escavador: '#e0c060',
    colossal: '#ffe060', carcaca: '#f0e6d0', cuspideira: '#a8f060', reiuivador: '#c890ff', gigante: '#d080ff', chefao: '#ff5a4a' };

  function zlook(z) {
    let L = lookCache.get(z.id);
    if (L) return { ...L };
    const i = z.id, t = z.type;
    L = {
      skin: ZSKIN[i % 4], shirt: ZSHIRT[(i * 7) % ZSHIRT.length], pants: ZPANTS[(i * 3) % ZPANTS.length],
      hair: ZHAIR[(i * 5) % ZHAIR.length], eye: [230, 40, 30], mouth: true, torn: true, lean: 1,
      scale: ZTYPES[t].scale, face: -1,
      longHair: i % 4 === 1, cap: i % 6 === 2 ? ZCAPS[(i >> 1) % 3] : null, oneArm: i % 7 === 3,
    };
    if (t === 'corredor') L.lean = 2;
    if (t === 'tanque') Object.assign(L, { shirt: [60, 50, 45], longHair: false, cap: null });
    if (t === 'cuspidor') Object.assign(L, { skin: [150, 172, 70], shirt: [70, 90, 50], drool: true, oneArm: false });
    if (t === 'explosivo') Object.assign(L, { skin: [156, 128, 150], shirt: [120, 110, 120], fat: true, cap: null, longHair: false });
    if (t === 'mordido') Object.assign(L, { skin: [168, 172, 140], shirt: [70, 92, 128], pants: [60, 60, 70], bandage: true, oneArm: false, cap: null });
    if (t === 'uivador') Object.assign(L, { skin: [180, 184, 160], hair: [225, 225, 215], longHair: true, shirt: [90, 70, 100], eye: [255, 240, 120], cap: null });
    if (t === 'hospedeiro') Object.assign(L, { skin: [128, 116, 150], shirt: [70, 60, 90], spores: true, cap: null, oneArm: false });
    if (t === 'arremessador') Object.assign(L, { shirt: [110, 90, 60], pack: [90, 84, 76], oneArm: false, cap: null });
    if (t === 'blindado') Object.assign(L, { shirt: [34, 44, 74], pants: [28, 32, 52], vest: [26, 30, 40], riot: true, cap: null, longHair: false, oneArm: false });
    if (ZTYPES[t].human) {
      // gente viva: pele e olhos normais, de pé, rosto coberto por um pano
      Object.assign(L, { skin: SKINS[i % 5], hair: HAIRS[i % 6], eye: [20, 20, 20], mouth: false, torn: false, lean: 0, oneArm: false,
        shirt: pick([[170, 60, 50], [60, 110, 150], [150, 130, 60], [80, 80, 80], [120, 70, 130]]), pants: pick([[50, 60, 90], [40, 40, 44], [80, 70, 55]]),
        mask: t === 'incendiario' ? [30, 30, 30] : pick([[170, 30, 30], [30, 30, 30], [40, 60, 120]]), human: true,
        cap: t === 'incendiario' ? [30, 30, 30] : i % 3 === 0 ? ZCAPS[i % 3] : null, longHair: i % 5 === 1 });
    }
    if (t === 'chefe') Object.assign(L, { skin: [140, 70, 70], shirt: [80, 30, 30], pants: [50, 30, 30], spikes: true,
      eye: [255, 220, 40], longHair: false, cap: null, oneArm: false });
    if (BOSSLOOK[t]) Object.assign(L, { longHair: false, cap: null, oneArm: false, bald: true }, BOSSLOOK[t]);
    lookCache.set(z.id, L);
    if (lookCache.size > 300) lookCache.delete(lookCache.keys().next().value);
    return { ...L };
  }

  // roupa de cada um: a da função e, por cima, o uniforme do grupo (skins de sobrevivente) se houver um equipado
  const THEME_KEYS = ['scarf', 'vest', 'hardhat', 'beret', 'mask', 'body', 'head', 'front', 'boots', 'belt', 'glasses', 'glove', 'sleeve', 'pack', 'cape', 'noHair'];
  function styleOf(p, job) {
    const jl = JOBLOOK[job] || {};
    for (const k of THEME_KEYS) p[k] = undefined;
    p.shirt = jl.shirt || p.ownShirt;
    p.pants = jl.pants || [60, 60, 70];
    p.apron = !!jl.apron; p.helmet = !!jl.helmet; p.cross = !!jl.cross; p.bandage = !!jl.bandage;
    if (typeof OSkins !== 'undefined') OSkins.applySurvivor(p, job);
    applyHonor(p);
  }
  // homenageado com roupa fixa (HONORED.roupa): veste por cima de tudo, inclusive do uniforme do grupo
  function applyHonor(p) {
    if (!p.who || typeof Honored === 'undefined' || typeof OSkins === 'undefined') return;
    const h = Honored.byName(p.who), d = h && h.roupa && OSkins.byId[h.roupa];
    if (!d) return;
    for (const k of THEME_KEYS) p[k] = undefined;
    p.apron = false; p.cross = false; p.helmet = false;
    Object.assign(p, d.look, { body: d.body, head: d.head, front: d.front, noHair: !!d.noHair });
  }
  function dress(p, job) {
    p.job = job;
    styleOf(p, job);
    p.st = 'init'; p.hidden = false; p.carry = false;
  }
  // uniforme trocado: veste de novo quem já está no cenário, sem mexer no que estão fazendo
  const restyle = () => { for (const p of people) styleOf(p, p.job); };
  // mulheres no cenário na mesma proporção do grupo (pelos nomes): cabelo comprido ou coque; homens com cabelo curto,
  // às vezes barba, bigode ou careca
  const femShare = () => {
    const ps = (typeof S !== 'undefined' && S.people) || [];
    return ps.length ? ps.filter(isFemale).length / ps.length : 0.5;
  };
  function newPerson(job) {
    const fem = Math.random() < femShare(), hair = pick(HAIRS);
    const p = {
      id: pid++, x: 33, y: 158, tx: 33, ty: 158, timer: 0, phase: Math.random() * 6, face: 1,
      speed: rand(16, 22), skin: pick(SKINS), hair, muzzle: 0, pose: 'stand', fem,
      ownShirt: pick(fem ? [[150, 70, 110], [70, 110, 130], [130, 120, 80], [110, 80, 140], [160, 90, 60]] : [[120, 60, 60], [60, 80, 120], [130, 120, 80], [90, 90, 90]]),
    };
    if (fem) { const r = Math.random(); if (r < 0.7) p.longHair = true; else p.bun = true; }
    else { const r = Math.random(); if (r < 0.2) p.beard = hair; else if (r < 0.35) p.mustache = hair; if (Math.random() < 0.12) p.bald = true; }
    dress(p, job);
    return p;
  }

  const CAP = 10;
  function syncPeople() {
    const want = { ...S.jobs, ocioso: Math.max(0, idle()), ferido: hurt() };
    const pool = [];
    for (const job in want) {
      const mine = people.filter(p => p.job === job);
      const n = Math.min(want[job], CAP);
      for (let i = mine.length - 1; i >= n; i--) { people.splice(people.indexOf(mine[i]), 1); pool.push(mine[i]); }
    }
    for (const job in want) {
      const have = people.filter(p => p.job === job).length;
      const n = Math.min(want[job], CAP);
      for (let i = have; i < n; i++) {
        const p = pool.pop() || newPerson(job);
        dress(p, job);
        people.push(p);
      }
    }
    assignNames();   // cada boneco com o nome de alguém do grupo (e a roupa fixa dos homenageados)
  }

  const plotCount = () => Math.min(5, 1 + S.build.horta);
  const bedPos = k => ({ x: 66 + (k % 5) * 8, y: 193 - Math.floor(k / 5) * 5 });
  const towerX = k => WALL_X - 20 - k * 22;
  const guards = () => people.filter(p => p.job === 'guarda');

  function updatePeople(dt) {
    syncPeople();
    const wave = S.horde.active;
    // muro caído: quem não está ferido nem no posto de tiro parte para cima de quem entrou
    const inside = Invasion.fighters() ? S.horde.zs.filter(z => !z.dead && z.state === 'invade') : [];
    const slots = {};
    for (const p of people) { slots[p.job] = (slots[p.job] || 0); p.slot = slots[p.job]++; }

    for (const p of people) {
      p.muzzle = Math.max(0, p.muzzle - dt);
      p.crouch = false;
      p.idlePose = 'stand';
      let moving = false;
      const go = (x, y) => { p.tx = x; p.ty = y; };
      const arrive = () => {
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        if (d < 0.8) { p.x = p.tx; p.y = p.ty; return true; }
        const st = Math.min(d, p.speed * dt);
        p.x += dx / d * st; p.y += dy / d * st;
        if (Math.abs(dx) > 0.3) p.face = dx > 0 ? 1 : -1;
        moving = true;
        return false;
      };

      if (inside.length && !p.hidden && p.job !== 'guarda' && p.job !== 'ferido') {
        let z = inside.find(q => q.id === p.foe);
        if (!z) { z = inside[p.slot % inside.length]; p.foe = z.id; p.st = 'x'; }
        go(z.x - 7 - (p.id % 3) * 2, z.y + ((p.id % 5) - 2));
        if (arrive()) { p.face = 1; p.idlePose = 'work'; }
        p.pose = moving ? 'walk' : p.idlePose;
        p.phase += dt * (moving ? 11 : 4);
        continue;
      }

      switch (p.job) {
        case 'forrageiro':
          if (p.st !== 'go' && p.st !== 'work') {
            const i = ri(0, plotCount() - 1);
            go(6 + i * 14 + rand(0, 7), 185); p.st = 'go';
          }
          if (p.st === 'go') { if (arrive()) { p.st = 'work'; p.timer = rand(3, 6); } }
          else {
            p.idlePose = 'work'; p.crouch = true; p.timer -= dt;
            if (p.timer <= 0) {
              p.st = 'x';
              emit('harvest', { x: p.x });
              texts.push({ x: p.x, y: p.y - 18, t: '🥬', c: '#9be35a', life: 0.9 });
            }
          }
          break;

        case 'coletor':
          if (!['out', 'away', 'back', 'drop'].includes(p.st)) { p.st = 'out'; go(-14, rand(156, 166)); }
          if (p.st === 'out') { if (arrive()) { p.st = 'away'; p.hidden = true; p.timer = rand(4, 9); } }
          else if (p.st === 'away') {
            p.timer -= dt;
            if (p.timer <= 0) { p.st = 'back'; p.hidden = false; p.carry = true; go(rand(68, 80), rand(157, 161)); }
          } else if (p.st === 'back') { if (arrive()) { p.st = 'drop'; p.carry = false; p.timer = 1; } }
          else { p.timer -= dt; if (p.timer <= 0) { p.st = 'out'; go(-14, rand(156, 166)); } }
          break;

        case 'armeiro': {
          const tx = 143 + (p.slot % 3) * 5, ty = 163 + Math.floor(p.slot / 3) * 4;
          go(tx, ty);
          if (arrive()) {
            p.face = 1; p.idlePose = 'work';
            if (Math.random() < dt * 2.5) sparks(149, 153);
          }
          break;
        }

        case 'guarda': {
          const i = p.slot;
          go(WALL_X - 7 - (i % 4) * 7 - Math.floor(i / 4) * 3, 161 + (i % 4) * 8 + (Math.floor(i / 4) % 2) * 3);
          if (arrive()) { p.face = 1; p.idlePose = wave ? 'aim' : 'stand'; }
          break;
        }

        case 'cientista': {
          // trabalham na frente do prédio, mexendo em frascos
          const tx = 6 + (p.slot % 4) * 5, ty = 157 + Math.floor(p.slot / 4) * 4;
          go(tx, ty);
          if (arrive()) {
            p.face = 1; p.idlePose = 'work';
            if (Math.random() < dt * 1.5) parts.push({ x: tx + 5, y: ty - 12, vx: rand(-3, 3), vy: rand(-10, -5), life: 0.8, max: 0.8, c: '#9be35a', s: 1, a: 0.8 });
          }
          break;
        }

        case 'medico':
          // cada médico cuida de um ferido
          if (p.slot < hurt() && p.slot < CAP) {
            const b = bedPos(p.slot);
            go(b.x + 5, b.y - 1); p.st = 'x';
            if (arrive()) {
              p.face = -1; p.idlePose = 'work'; p.crouch = true;
              if (Math.random() < dt * 0.8) texts.push({ x: b.x, y: b.y - 12, t: '✚', c: '#ff8a8a', life: 0.8 });
            }
            break;
          }
          if (p.st !== 'walk' && p.st !== 'wait') { p.st = 'walk'; go(rand(70, 140), rand(162, 190)); }
          if (p.st === 'walk') { if (arrive()) { p.st = 'wait'; p.timer = rand(2, 5); } }
          else { p.timer -= dt; if (p.timer <= 0) p.st = 'x'; }
          break;

        case 'ferido': {
          const b = bedPos(p.slot);
          go(b.x, b.y);
          if (arrive()) { p.idlePose = 'sit'; p.face = 1; }
          break;
        }

        default: { // ocioso: senta em volta da fogueira
          const n = Math.max(1, slots.ocioso || 1);
          const a = (p.slot / n) * Math.PI * 2 + 0.4;
          const tx = FIRE.x + Math.cos(a) * 13, ty = FIRE.y + Math.sin(a) * 5;
          go(tx, ty);
          if (arrive()) { p.idlePose = 'sit'; p.face = tx < FIRE.x ? 1 : -1; }
        }
      }
      p.pose = moving ? (p.carry ? 'carry' : 'walk') : p.idlePose;
      p.phase += dt * (moving ? 9 : 3);
    }
  }

  const gore = () => Settings.get('blood');
  function blood(x, y, n, floor) {
    // sem sangue: o impacto levanta poeira
    const cols = gore() ? [[150, 20, 20], [110, 10, 10], [90, 130, 60]] : [[120, 112, 96], [96, 90, 80]];
    for (let i = 0; i < n; i++) parts.push({
      x, y, vx: rand(-28, 28), vy: rand(-38, -5), g: 130, life: rand(0.4, 0.9), max: 0.9,
      c: pick(cols), s: pick([1, 1, 2]), floor: floor ?? y + 10,
    });
  }
  function sparks(x, y) {
    for (let i = 0; i < 4; i++) parts.push({ x, y, vx: rand(-20, 20), vy: rand(-25, -5), g: 90, life: 0.3, max: 0.3, c: '#ffd060', s: 1 });
    light(x, y, 8, '255,200,80', 0.5);
  }
  function chips(y) {
    for (let i = 0; i < 5; i++) parts.push({ x: WALL_X + 10, y: y - 10, vx: rand(-5, 30), vy: rand(-30, -5), g: 120, life: 0.6, max: 0.6, c: pick([[128, 92, 56], [90, 64, 36]]), s: 1, floor: y + 2 });
  }

  // explosão (granadas, foguetes, inchados e o Inchado Colossal)
  function blastFx(x, y, big) {
    blasts.push({ x, y, t: time, r: big ? 40 : 30 });
    if (blasts.length > 12) blasts.shift();
    for (let i = 0; i < 26; i++) parts.push({
      x, y, vx: rand(-60, 60), vy: rand(-70, -5), g: 120, life: rand(0.3, 0.8), max: 0.8,
      c: pick(['#ffd040', '#ff8a20', '#ff5020', [90, 80, 80], [150, 120, 140]]), s: pick([1, 2, 2, 3]), floor: y + 14,
    });
    flashes.push({ x, y, r: big ? 90 : 45, c: '255,150,50', a: 0.9, life: big ? 0.6 : 0.35, max: big ? 0.6 : 0.35 });
    { const life = rand(90, 160); decals.push({ x, y: y + 9, w: big ? 26 : 12, life, max: life, c: [40, 34, 30] }); }
    if (big) for (let i = 0; i < 30; i++) parts.push({ x: x + rand(-20, 20), y: y + rand(-10, 6), vx: rand(-25, 25), vy: rand(-30, -8), life: rand(1, 2), max: 2, c: [90, 85, 85], s: 3, a: 0.5 });
    shake = Math.max(shake, big ? 7 : 3.5);
  }
  // poeira levantada no chão (pouso, impacto, saída da terra)
  const DIRT = [[110, 90, 60], [90, 72, 48], [130, 110, 80]];
  function dust(x, y, n, spread, cols) {
    for (let i = 0; i < n; i++) parts.push({ x: x + rand(-spread, spread), y: y - rand(0, 3), vx: rand(-45, 45), vy: rand(-45, -8), g: 110, life: rand(0.5, 1), max: 1,
      c: pick(cols || [[150, 135, 110], [120, 108, 88], [170, 156, 130]]), s: pick([1, 2, 2, 3]), floor: y + 2, a: 0.85 });
  }
  const say = (x, y, t, c, big) => texts.push({ x, y, t, c, life: big ? 1.8 : 1.2, big });
  // ---------- balões de fala dos homenageados ----------
  // cada homenageado "mora" num boneco do cenário (do mesmo sexo, se der) e fala por cima dele; o visual opcional vale nesse boneco
  const bubbles = [];
  // ---------- reparo do muro: um trabalhador martelando ao lado do muro e as fileiras novas acendendo ----------
  let repairFx = null;   // { t, dur, from, to }
  const REPAIR_DUR = 1.6;
  // cada boneco do cenário representa alguém do grupo (nome e, nos homenageados, o visual)
  function assignNames() {
    const alive = (typeof S !== 'undefined' && S && S.people) || [], used = new Set();
    for (const p of people) {
      if (p.who && alive.includes(p.who) && !used.has(p.who)) { used.add(p.who); continue; }
      const had = p.honor;
      if (p.honorLook) { Object.assign(p, p.honorLook); delete p.honorLook; }
      p.who = null; delete p.honor;
      if (had) styleOf(p, p.job);   // tira a roupa fixa de quem deixou de ser o homenageado
    }
    for (const p of people) {
      if (p.who) continue;
      const pool = alive.filter(n => !used.has(n));
      if (!pool.length) break;
      const n = pool.find(m => isFemale(m) === !!p.fem) || pool[0];
      p.who = n; used.add(n);
    }
    // homenageados com visual próprio: aplica no boneco deles
    if (typeof Honored !== 'undefined') for (const p of people) {
      const h = p.who && Honored.byName(p.who);
      if (h && p.honor !== p.who) {
        p.honor = p.who;
        if (h.visual) { p.honorLook = Object.fromEntries(Object.keys(h.visual).map(k => [k, p[k]])); Object.assign(p, h.visual); }
        applyHonor(p);
      }
    }
  }
  function speaker(name, fem, look) {
    assignNames();
    const mine = people.find(q => q.who === name);
    if (mine) return mine;
    for (const p of people) if (p.honor && !(S.people || []).includes(p.honor)) { delete p.honor; if (p.honorLook) { Object.assign(p, p.honorLook); delete p.honorLook; } }
    let p = people.find(q => q.honor === name);
    if (!p) {
      const free = people.filter(q => !q.honor && q.job !== 'ferido');
      p = free.find(q => !!q.fem === !!fem) || free[0];
      if (!p) return null;
      p.honor = name;
      if (look) { p.honorLook = Object.fromEntries(Object.keys(look).map(k => [k, p[k]])); Object.assign(p, look); }
    }
    return p;
  }

  // efeitos das ações dos chefes (evento 'boss')
  function bossFx(d) {
    switch (d.k) {
      case 'crouch': dust(d.x, d.y, 6, 6); break;
      case 'leap':
        dust(d.x, d.y, 16, 8);
        flashes.push({ x: d.x, y: d.y - 6, r: 30, c: '120,230,255', a: 0.4, life: 0.3, max: 0.3 });
        break;
      case 'land':
        dust(d.x, d.y, 34, 14); chips(d.y); chips(d.y - 12);
        shake = Math.max(shake, 6); wallJolt = 0.3;
        flashes.push({ x: d.x, y: d.y - 8, r: 50, c: '200,220,255', a: 0.5, life: 0.35, max: 0.35 });
        say(d.x + 4, d.y - 40, 'ESTRONDO!', '#9fe8ff', true);
        break;
      case 'interrupt':
        say(d.x, d.y - 20, 'SALTO INTERROMPIDO!', '#ffe066', true);
        sparks(d.x, d.y);
        break;
      case 'curl': dust(d.x, d.y, 8, 6); break;
      case 'roll': dust(d.x, d.y, 18, 6); say(d.x, d.y - 30, 'ROLANDO!', '#ffb060'); break;
      case 'impact':
        dust(d.x, d.y, 30, 10); chips(d.y); chips(d.y - 8); chips(d.y - 16);
        shake = Math.max(shake, 7); wallJolt = 0.35; redFlash = Math.max(redFlash, 0.25);
        flashes.push({ x: d.x, y: d.y - 8, r: 55, c: '255,170,80', a: 0.6, life: 0.35, max: 0.35 });
        say(d.x + 6, d.y - 36, 'BUM!', '#ff9a40', true);
        break;
      case 'daze': say(d.x, d.y - 20, 'TONTO! ATAQUE AGORA!', '#ffe066'); break;
      case 'brood':
        for (let i = 0; i < 16; i++) parts.push({ x: d.x, y: d.y, vx: rand(-30, 30), vy: rand(-40, -5), g: 120, life: rand(0.4, 0.8), max: 0.8, c: pick([[190, 140, 170], [150, 100, 130], [220, 200, 160]]), s: pick([1, 2]), floor: d.y + 10 });
        say(d.x, d.y - 26, `+${d.n} crias`, '#ff90c8');
        break;
      case 'shell':
        for (let i = 0; i < 22; i++) pieces.push({ chunk: true, x: d.x + rand(-6, 6), y: d.y + rand(-12, 6), vx: rand(-70, 70), vy: rand(-110, -30),
          w: pick([2, 3, 3]), h: pick([2, 2, 3]), c: pick([[112, 110, 104], [90, 88, 84], [130, 128, 120]]), floor: d.y + 22 + rand(-2, 4), t: 0, life: 60, rest: false });
        shake = Math.max(shake, 5);
        flashes.push({ x: d.x, y: d.y, r: 60, c: '255,200,140', a: 0.6, life: 0.4, max: 0.4 });
        banner = { t: d.ph === 1 ? '🗿 A CASCA QUEBROU!' : '🗿 ELE RASTEJA!', sub: d.ph === 1 ? 'Menor e muito mais rápido!' : 'Pouca vida, indo direto ao muro!', c: '#d8b080', life: 2.2, max: 2.2 };
        break;
      case 'dig': dust(d.x, d.y, 20, 8, DIRT); say(d.x, d.y - 40, 'CAVANDO!', '#e0c060'); break;
      case 'rise':
        dust(d.x, d.y, 40, 10, DIRT);
        shake = Math.max(shake, 4);
        say(d.x, d.y - 40, 'EMERGIU!', '#e0c060', true);
        break;
      case 'fuse': say(d.x, d.y - 30, 'VAI EXPLODIR!', '#ff5a3a', true); redFlash = Math.max(redFlash, 0.3); break;
      case 'wallBoom': redFlash = Math.max(redFlash, 0.8); shake = Math.max(shake, 10); chips(170); chips(180); chips(160); break;
      case 'nearBoom': say(d.x, d.y - 30, 'PERTO DEMAIS DO MURO!', '#ff6a4a', true); chips(175); break;
      case 'farBoom': say(d.x, d.y - 30, 'LONGE DO MURO!', '#6fe39a', true); break;
      case 'open':
        flashes.push({ x: d.x, y: d.y, r: 30, c: '255,140,50', a: 0.7, life: 0.4, max: 0.4 });
        say(d.x, d.y - 26, 'PONTO FRACO!', '#ffd040');
        break;
      case 'close': sparks(d.x, d.y); break;
      case 'lobTell':
        for (let i = 0; i < 6; i++) parts.push({ x: d.x + rand(-3, 3), y: d.y, vx: rand(-8, 8), vy: rand(-20, -8), life: 0.5, max: 0.5, c: '#b0ff60', s: 1, glow: '150,255,80' });
        break;
      case 'acid': {
        const tx = WALL_X + 9, ty = d.ty - 14;
        parts.push({ x: d.x, y: d.y, vx: (tx - d.x) / 0.85, vy: (ty - d.y) / 0.85 - 85, g: 200, life: 0.85, max: 0.85, solid: true, c: '#9be35a', s: 4, glow: '150,255,80' });
        after(0.85, () => {
          for (let i = 0; i < 20; i++) parts.push({ x: tx, y: ty, vx: rand(-40, 30), vy: rand(-50, -5), g: 150, life: rand(0.4, 0.8), max: 0.8, c: pick(['#9be35a', '#c8ff80', '#6fbf30']), s: pick([1, 2]), floor: d.ty + 2, glow: '150,255,80' });
          chips(d.ty);
        });
        break;
      }
      case 'howlTell': say(d.x, d.y - 30, 'vai uivar...', '#c890ff'); break;
      case 'howl':
        flashes.push({ x: d.x, y: d.y, r: 160, c: '200,90,255', a: 0.55, life: 0.8, max: 0.8 });
        for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; parts.push({ x: d.x, y: d.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 35, life: 0.6, max: 0.6, c: pick([[200, 120, 255], [255, 160, 220]]), s: 1, a: 0.9 }); }
        shake = Math.max(shake, 3);
        say(d.x, d.y - 30, d.n ? `UIVO! ${d.n} curados e mais rápidos` : 'UIVO!', '#d0a0ff', true);
        break;
      case 'stunAll':
        flashes.push({ x: d.x, y: d.y, r: 220, c: '255,255,255', a: 0.6, life: 0.6, max: 0.6 });
        if (d.n) banner = { t: '👑 HORDA ATORDOADA!', sub: `${d.n} zumbis parados por alguns segundos`, c: '#c890ff', life: 2.2, max: 2.2 };
        break;
      case 'split':
        flashes.push({ x: d.x, y: d.y, r: d.big ? 50 : 30, c: '180,100,230', a: 0.6, life: 0.4, max: 0.4 });
        for (let i = 0; i < (d.big ? 30 : 14); i++) parts.push({ x: d.x, y: d.y, vx: rand(-50, 50), vy: rand(-55, -5), g: 100, life: rand(0.4, 0.9), max: 0.9, c: pick([[190, 120, 220], [140, 200, 90], [180, 50, 60]]), s: pick([1, 2]) });
        say(d.x, d.y - 24, d.big ? 'ELE SE DIVIDIU!' : 'dividiu!', '#d080ff', d.big);
        break;
      case 'smash':
        if (d.type !== 'chefe') { dust(WALL_X + 14, d.y, 6, 4); shake = Math.max(shake, 2.5); }
        break;
    }
  }

  function on(type, d) {
    switch (type) {
      case 'weaponSwap': leaderSwap = 0.22; break;
      case 'shot': {
        let ox, oy;
        if (d.src === 'guard' || d.src === 'rock') {
          const g = guards();
          const p = g.length ? g[d.idx % g.length] : null;
          if (p) { ox = p.x + 9; oy = p.y - 11; if (d.src === 'guard') p.muzzle = 0.08; }
        } else if (d.src === 'tower') {
          const k = d.tw ?? 1;
          ox = towerX(k) + 14; oy = TOWER_TOP - 11; towerMuzzle[k] = 0.08;
        } else if (d.src === 'player') {
          ({ x: ox, y: oy } = gunTip()); leaderMuzzle = 0.08;
        } else if (d.src === 'hero') {
          ox = CHAMP_POS.x + 8; oy = CHAMP_POS.y - 11; champMuzzle = 0.08;
        }
        if (ox == null) break;
        if (d.src === 'rock') {
          parts.push({ x: ox, y: oy, vx: (d.x - ox) / 0.5, vy: (d.y - oy) / 0.5 - 50, g: 200, life: 0.5, max: 0.5, c: [140, 140, 140], s: 2, solid: true });
        } else {
          const hot = S.meta.boosts.furia > 0;
          let tx = d.x, ty = d.y;
          // skin da arma: efeito próprio na boca do cano e cor do traçante
          const skinTr = d.src === 'player' && d.w && typeof WSkins !== 'undefined' ? WSkins.onShot(d, ox, oy) : null;
          if (d.launch) break;   // granadas, foguetes e fogo têm efeito próprio
          if (d.exact) {
            if (d.miss) for (let i = 0; i < 3; i++) parts.push({ x: tx, y: ty, vx: rand(-12, 12), vy: rand(-20, -6), g: 80, life: 0.35, max: 0.35, c: [150, 135, 110], s: 1 });
          } else if (d.miss) {
            // passa raspando e bate no chão atrás do zumbi
            tx = d.x + rand(8, 22); ty = Math.min(H - 6, d.y + rand(12, 24));
            for (let i = 0; i < 4; i++) parts.push({ x: tx, y: ty, vx: rand(-14, 14), vy: rand(-26, -8), g: 80, life: 0.45, max: 0.45, c: [150, 135, 110], s: 1 });
          }
          tracers.push({ x1: ox, y1: oy, x2: tx, y2: ty, life: 0.07, c: hot ? '255,110,50' : skinTr || d.c || (d.src === 'player' ? '255,250,200' : '255,220,120') });
        }
        break;
      }
      case 'hit':
        hitAt.set(d.id, time);
        blood(d.x, d.y, 5);
        break;
      // número de dano no boneco do campo de treino (debug)
      case 'dmgNum':
        texts.push({ x: d.x + rand(-7, 7), y: d.y + rand(-3, 3), t: d.t, c: d.c, life: d.big ? 1.1 : 0.8, big: d.big });
        break;
      case 'spit': {
        const tx = WALL_X + 9, ty = d.ty - 14;
        const look = d.proj === 'rock' ? { c: [120, 112, 100], s: 2 } : d.proj === 'molotov' ? { c: '#ff9a30', s: 2, glow: '255,140,40' }
          : d.proj === 'grenade' ? { c: [60, 70, 50], s: 3 } : { c: '#9be35a', s: 2, glow: '150,255,80' };
        parts.push({ x: d.x, y: d.y, vx: (tx - d.x) / 0.6, vy: (ty - d.y) / 0.6 - 60, g: 200, life: 0.6, max: 0.6, solid: true, ...look });
        if (d.proj === 'grenade') after(0.6, () => { blastFx(tx + 2, ty, false); chips(d.ty); });
        break;
      }
      case 'zbuff': {
        const haste = d.kind === 'haste';
        flashes.push({ x: d.x, y: d.y, r: haste ? 60 : 45, c: haste ? '255,70,50' : '180,100,230', a: 0.5, life: 0.5, max: 0.5 });
        for (let i = 0; i < 18; i++) parts.push({ x: d.x, y: d.y, vx: rand(-50, 50), vy: rand(-40, 20), life: rand(0.4, 0.8), max: 0.8,
          c: haste ? pick([[230, 70, 50], [255, 160, 120]]) : pick([[190, 120, 220], [140, 200, 90]]), s: pick([1, 2]), a: 0.8 });
        texts.push({ x: d.x, y: d.y - 14, t: haste ? (d.n ? `GRITO! ${d.n} mais rápido(s)` : 'GRITO!') : (d.n ? `ESPOROS! ${d.n} mais resistente(s)` : 'ESPOROS!'),
          c: haste ? '#ff7a60' : '#d0a0ff', life: 1.4 });
        break;
      }
      case 'armor':
        sparks(d.x - 3, d.y);
        if (d.msg) texts.push({ x: d.x, y: d.y - 14, t: d.msg, c: '#a8c0d8', life: 1 });
        else if (d.src === 'player' && d.msg === undefined) texts.push({ x: d.x, y: d.y - 12, t: 'blindado! mire na cabeça', c: '#a8c0d8', life: 0.9 });
        break;
      case 'boss':
        bossFx(d);
        break;
      case 'headshot':
        sparks(d.x - 2, d.y);
        texts.push({ x: d.x + rand(-3, 3), y: d.y - 8, t: 'NA CABEÇA!', c: '#ffe066', life: 0.8 });
        break;
      case 'dangerWarn':
        alert = { t: d.t, icon: d.icon, nome: d.nome };
        redFlash = Math.max(redFlash, 0.5);
        break;
      case 'countdown':
        texts.push({ x: W / 2, y: 104, t: String(d.n), c: '#ff5a4a', life: 0.9, big: true });
        redFlash = Math.max(redFlash, 0.25);
        break;
      case 'rush':
        banner = { t: '⚠️ INVESTIDA!', sub: `${d.n} zumbis chegaram de uma vez!`, c: '#ff3a3a', life: 3, max: 3 };
        shake = Math.max(shake, 6); redFlash = Math.max(redFlash, 0.6);
        break;
      case 'explode': blastFx(d.x, d.y, d.big); if (typeof WSkins !== 'undefined') WSkins.onExplode(d); break;
      case 'flame':
        for (let i = 0; i < 7; i++) parts.push({ x: d.x + rand(-d.r, d.r) * 0.7, y: d.y + rand(-4, 8), vx: rand(-8, 8), vy: rand(-30, -12), life: rand(0.25, 0.5), max: 0.5, c: pick(['#ffd040', '#ff8a20', '#ff5020']), s: pick([1, 2, 2]), glow: '255,140,40' });
        { const t = gunTip(); tracers.push({ x1: t.x, y1: t.y, x2: d.x, y2: d.y, life: 0.06, c: '255,150,60' }); }
        break;
      case 'pierce':
        tracers.push({ x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2, life: 0.1, c: '255,250,200' });
        break;
      case 'lwAmmo':
        texts.push({ x: d.x, y: d.y, t: d.text, c: '#9be35a', life: 1.4 });
        break;
      case 'noAmmo':
        texts.push({ x: ptr.x, y: ptr.y - 8, t: d.special ? `sem ${SPECIAL_AMMO[d.special].plural}!` : 'sem munição no abrigo!', c: '#ff8070', life: 0.8 });
        break;
      case 'outOfRange':
        texts.push({ x: d.x, y: d.y - 8, t: 'longe demais', c: '#ff9a80', life: 0.6 });
        break;
      case 'cash': {
        const x = d.x ?? LEADER.x + 30, y = d.y ?? LEADER.y - 20;
        texts.push({ x, y, t: `+${d.n} 💵`, c: '#6fe39a', life: 2.2, big: true });
        for (let i = 0; i < 14; i++) parts.push({ x, y, vx: rand(-40, 40), vy: rand(-50, -10), g: 70, life: rand(0.5, 1), max: 1, c: pick(['#6fe39a', '#c8ffd8', '#ffe066']), s: pick([1, 2]) });
        flashes.push({ x, y, r: 22, c: '110,230,150', a: 0.6, life: 0.5, max: 0.5 });
        break;
      }
      case 'shop':
        texts.push({ x: W / 2, y: 52, t: d.text, c: '#6fe39a', life: 2.5, big: true });
        if (d.k === 'aereo') planes.push({ x: -60, y: 34, t: 0 }, { x: -95, y: 46, t: 0 });
        if (d.k === 'muro') for (let i = 0; i < 20; i++) parts.push({ x: WALL_X + rand(-4, 12), y: rand(130, 195), vx: rand(-10, 10), vy: rand(-30, -5), g: 40, life: 0.8, max: 0.8, c: '#ffe066', s: 1 });
        break;
      case 'achievement': // a notificação grande fica na página; aqui só um brilho dourado
        for (let i = 0; i < 24; i++) parts.push({ x: rand(0, W), y: rand(-5, 20), vx: rand(-10, 10), vy: rand(20, 50), g: 30, life: rand(1, 2), max: 2, c: pick(['#ffe066', '#f3d36a', '#fff4b0']), s: pick([1, 2]) });
        break;
      case 'sample':
        texts.push({ x: d.x != null ? d.x : 60, y: d.y != null ? d.y : 120, t: '+' + d.n + ' ' + d.icon, c: '#9be3ff', life: 1.6, big: true });
        break;
      case 'crit':
        texts.push({ x: d.x + rand(-4, 4), y: d.y - 6, t: 'CRÍTICO!', c: '#ffa040', life: 0.6 });
        break;
      case 'trap':
        for (let i = 0; i < 5; i++) parts.push({ x: d.x, y: d.y - 2, vx: rand(-15, 15), vy: rand(-25, -5), g: 100, life: 0.4, max: 0.4, c: [150, 150, 155], s: 1 });
        break;
      case 'shock':
        for (let i = 0; i < 4; i++) parts.push({ x: d.x - 4, y: d.y + rand(-6, 6), vx: rand(-20, 20), vy: rand(-20, 20), life: 0.2, max: 0.2, c: '#a0e0ff', s: 1, glow: '120,200,255' });
        break;
      // ---- heróis de campo
      case 'hbolt': {
        // raio: segmentos tortos entre os pontos da cadeia
        for (let i = 0; i < d.pts.length - 1; i++) {
          const a = d.pts[i], b = d.pts[i + 1];
          let px = a.x, py = a.y;
          for (let s = 1; s <= 4; s++) {
            const nx = a.x + (b.x - a.x) * s / 4 + (s < 4 ? rand(-5, 5) : 0), ny = a.y + (b.y - a.y) * s / 4 + (s < 4 ? rand(-5, 5) : 0);
            tracers.push({ x1: px, y1: py, x2: nx, y2: ny, life: d.sky ? 0.3 : 0.16, c: d.c });
            px = nx; py = ny;
          }
          flashes.push({ x: b.x, y: b.y, r: 14, c: d.c, a: 0.6, life: 0.2, max: 0.2 });
        }
        break;
      }
      case 'laser':
        for (const dy of [-1, 0, 1]) tracers.push({ x1: d.x1, y1: d.y + dy, x2: d.x2, y2: d.y + dy, life: 0.25, c: d.c });
        flashes.push({ x: d.x1, y: d.y, r: 18, c: d.c, a: 0.6, life: 0.25, max: 0.25 });
        break;
      case 'hypno':
        flashes.push({ x: d.x, y: d.y, r: d.r, c: d.c, a: 0.45, life: 0.6, max: 0.6 });
        texts.push({ x: d.x, y: d.y - 14, t: d.t || '💫', c: '#ffe8a0', life: 1.2 });
        break;
      case 'abduct':
        for (let i = 0; i < 3; i++) tracers.push({ x1: d.x + i - 1, y1: 0, x2: d.x + i - 1, y2: d.y, life: 0.4, c: '120,255,140' });
        flashes.push({ x: d.x, y: d.y, r: 16, c: '120,255,140', a: 0.6, life: 0.4, max: 0.4 });
        for (let i = 0; i < 8; i++) parts.push({ x: d.x + rand(-4, 4), y: d.y, vx: rand(-6, 6), vy: rand(-90, -50), life: 0.6, max: 0.6, c: '#a0ffb0', s: 1, glow: '120,255,140' });
        break;
      case 'riff':
        flashes.push({ x: d.x, y: 165, r: d.big ? 90 : 60, c: '255,140,60', a: 0.5, life: 0.5, max: 0.5 });
        for (let i = 0; i < (d.big ? 10 : 5); i++) texts.push({ x: d.x + rand(-30, 40), y: rand(140, 180), t: pick(['♪', '♫', '🤘']), c: '#ffb070', life: 1 });
        break;
      case 'bear':
        texts.push({ x: d.x, y: d.y - 18, t: '🐻', c: '#fff', life: 0.6 });
        break;
      case 'champSup':
        banner = { t: `${d.icon} ${d.nome.toUpperCase()}!`, sub: '', c: `rgb(${d.c})`, life: 2.5, max: 2.5 };
        flashes.push({ x: W / 2, y: H / 2, r: 400, c: d.c, a: 0.35, life: 0.5, max: 0.5 });
        shake = Math.max(shake, 4);
        break;
      case 'champNew':
        banner = { t: '🌟 NOVO HERÓI DE CAMPO', sub: `${CHAMPS[d.k].icon} ${CHAMPS[d.k].nome}`, c: '#ffe066', life: 4, max: 4 };
        break;
      case 'box':
        // caixa de herói caindo onde o chefe morreu: brilho dourado, faíscas e o aviso
        if (d.x != null) {
          flashes.push({ x: d.x, y: d.y, r: 70, c: '255,216,74', a: 0.55, life: 0.6, max: 0.6 });
          for (let i = 0; i < 26; i++) parts.push({ x: d.x, y: d.y, vx: rand(-60, 60), vy: rand(-90, -20), g: 140, life: rand(0.6, 1.1), max: 1.1, c: pick(['#ffd84a', '#fff4b0', '#ffffff']), s: pick([1, 2]), glow: '255,216,74' });
          texts.push({ x: d.x, y: d.y - 24, t: '📦 CAIXA DE HERÓI!', c: '#ffd84a', life: 2.2 });
        }
        break;
      case 'say': {
        const p = speaker(d.name, d.fem, d.look);
        for (const b of bubbles) if (b.name === d.name) b.life = 0;
        bubbles.push({ p, name: d.name, text: d.text, life: 5.5, max: 5.5 });
        break;
      }
      case 'repair': {
        repairFx = { t: 0, dur: REPAIR_DUR, from: d.from, to: d.to, hits: 0 };
        texts.push({ x: WALL_X + 5, y: 150, t: `+${d.amount} 🧱`, c: '#9be35a', life: 1.6 });
        break;
      }
      case 'champLevel':
        texts.push({ x: CHAMP_POS.x, y: CHAMP_POS.y - 28, t: `nível ${d.lvl}!`, c: '#ffe066', life: 1.6 });
        break;
      case 'champReady':
        texts.push({ x: CHAMP_POS.x + 20, y: CHAMP_POS.y - 30, t: 'SUPREMA PRONTA (S)', c: '#ffe066', life: 1.8 });
        break;
      case 'district':
        banner = { t: '🏴 DISTRITO LIBERTADO', sub: Endgame.DISTRICTS[d.k].nome + ': ' + Endgame.DISTRICTS[d.k].bonus, c: '#6fe39a', life: 3.5, max: 3.5 };
        break;
      case 'hero':
        for (let i = 0; i < 20; i++) parts.push({ x: 120, y: 170, vx: rand(-30, 30), vy: rand(-50, -10), g: 60, life: 1, max: 1, c: pick(['#ffe066', '#fff4b0']), s: pick([1, 2]) });
        break;
      case 'cure':
        banner = { t: '💉 A CURA FOI ENCONTRADA', sub: 'A humanidade tem uma chance!', c: '#6fe39a', life: 6, max: 6 };
        for (let i = 0; i < 80; i++) parts.push({ x: rand(0, W), y: rand(-10, 30), vx: rand(-15, 15), vy: rand(20, 60), g: 20, life: rand(2, 4), max: 4, c: pick(['#6fe39a', '#ffe066', '#9be3ff', '#ff8ac0']), s: 2 });
        break;
      case 'bossSpawn': {
        const Z = ZTYPES[d.type] || ZTYPES.chefe;
        banner = { t: `${Z.icon} ${Z.nome.toUpperCase()}!`, sub: Z.tip, c: BOSSCOLOR[d.type] || '#ff3a3a', life: 4, max: 4 };
        shake = 3;
        break;
      }
      case 'expStart':
        for (let i = 0; i < Math.min(d.n, 6); i++) {
          const p = newPerson('ocioso');
          Object.assign(p, { x: FIRE.x + rand(-8, 8), y: FIRE.y - rand(4, 14), carry: true, delay: i * 0.4 });
          p.tx = -16; p.ty = rand(156, 168);
          travelers.push(p);
        }
        break;
      case 'expReturn':
        for (let i = 0; i < Math.min(d.n, 6); i++) {
          const p = newPerson('ocioso');
          Object.assign(p, { x: -12 - i * 8, y: rand(156, 168), carry: true, delay: 0 });
          p.tx = FIRE.x + rand(-10, 10); p.ty = rand(166, 184);
          travelers.push(p);
        }
        if (d.loot) texts.push({ x: 50, y: 140, t: d.loot, c: '#9be35a', life: 2.5 });
        break;
      case 'evacuate':
        people.length = 0; corpses.length = 0; travelers.length = 0; decals.length = 0; pieces.length = 0;
        banner = { t: 'EVACUAÇÃO!', sub: `Cidade ${d.city} · +${d.g} ✨ Esperança`, c: '#f3d36a', life: 4, max: 4 };
        break;
      case 'zdeath': {
        if (d.type === 'explosivo') break;
        const z = { id: d.id, type: d.type };
        const zl = zlook(z);
        if (d.scale) zl.scale = d.scale;
        if (BOSSX[d.type]) zl.extra = (R, dy, o) => BOSSX[d.type](R, dy, o, { ph: d.ph, tt: 0 });
        dismember(d, zl);
        { const live = corpses.filter(c => c.life === Infinity && !c.kept); for (let i = 0; i < live.length - MARKS.corpses; i++) retire(live[i]); }
        blood(d.x, d.y - 8, 14, d.y + 1);
        stain(d.x + rand(-3, 3), d.y + rand(-1, 1), rand(4, 9));
        texts.push({ x: d.x, y: d.y - 22, t: `+${d.loot} 🔩`, c: '#f0d070', life: 1.2 });
        break;
      }
      case 'wallHit':
        chips(d.y);
        wallJolt = 0.15;
        shake = Math.max(shake, 1.2);
        break;
      case 'wallDown':
        shake = 5; redFlash = 0.6;
        banner = { t: 'O MURO CAIU!', sub: 'Os sobreviventes lutam pela própria vida!', c: '#ff5a4a', life: 2.5, max: 2.5 };
        break;
      case 'breach': {
        redFlash = 0.8; shake = 4;
        const x = d.x ?? WALL_X - 20, y = d.y ?? 172;
        blood(x, y, 20);
        texts.push({ x: Math.max(30, x - 10), y: y - 22, t: `☠ ${d.name || 'um sobrevivente'} caiu`, c: '#ff6a5a', life: 2 });
        break;
      }
      case 'injured':
        redFlash = Math.max(redFlash, 0.3);
        blood(d.x, d.y - 8, 8);
        texts.push({ x: Math.max(30, d.x - 10), y: d.y - 22, t: `🤕 ${d.name} se feriu`, c: '#f0a070', life: 1.8 });
        break;
      case 'bitten':
        redFlash = 0.6; shake = Math.max(shake, 2);
        blood(d.x, d.y - 8, 12);
        texts.push({ x: Math.max(30, d.x - 10), y: d.y - 22, t: `🦷 mordida em ${d.name}!`, c: '#c070ff', life: 2.2 });
        break;
      case 'dodge':
        texts.push({ x: d.x, y: d.y - 18, t: 'esquivou!', c: '#c8c0a8', life: 0.8 });
        break;
      case 'melee':
        if (d.hit) { hitAt.set(d.id, time); blood(d.x, d.y, 4); }
        else parts.push({ x: d.x - 4, y: d.y, vx: rand(-10, 10), vy: rand(-20, -8), g: 60, life: 0.3, max: 0.3, c: [200, 200, 200], s: 1 });
        break;
      case 'healed':
        texts.push({ x: 80, y: 172, t: '🩹 recuperado!', c: '#9be35a', life: 1.6 });
        break;
      case 'waveStart':
        banner = d.event
          ? { t: `${Endgame.EVENTS[d.event].icon} ${Endgame.EVENTS[d.event].nome.toUpperCase()}`, sub: `Onda ${d.n}: ${Endgame.EVENTS[d.event].short || Endgame.EVENTS[d.event].desc}`, c: '#ff3a8a', life: 4.5, max: 4.5 }
          : { t: `ONDA ${d.n}`, sub: `${d.count} ${d.word || 'zumbis'} estão vindo!`, c: '#ff5a4a', life: 3, max: 3 };
        alert = null;
        break;
      case 'waveEnd': {
        // fim da onda: a maioria some em poucos segundos; 4 ou 5 corpos e algumas manchas, sorteados, ficam
        // marcados até o fim da próxima onda, quando são trocados (se nada morreu nesta onda, as marcas antigas ficam)
        const quick = () => rand(...MARKS.quick);
        const fresh = corpses.filter(c => c.life === Infinity && !c.kept);
        if (fresh.length) {
          for (const c of corpses) if (c.kept) { c.kept = false; retire(c); }
          const keep = new Set(sample(fresh, ri(...MARKS.keep)));
          for (const c of fresh) { if (keep.has(c)) c.kept = true; else c.life = c.t + quick(); }
        }
        const spots = decals.filter(s => !s.c && !s.kept && s.life === Infinity);
        if (spots.length) {
          for (const s of decals) if (s.kept) { s.kept = false; s.life = MARKS.fadeOut; }
          const keep = new Set(sample(spots, ri(...MARKS.keepBlood)));
          for (const s of spots) { if (keep.has(s)) s.kept = true; else s.life = quick(); }
        }
        for (const p of pieces) if (p.life === Infinity) p.life = p.t + quick();
      }
        banner = { t: 'ONDA SOBREVIVIDA', sub: `${d.kills} ${d.humans ? 'saqueadores repelidos' : 'zumbis abatidos'}`, c: '#9be35a', life: 3, max: 3 };
        break;
      case 'gameOver':
        people.length = 0; corpses.length = 0; travelers.length = 0; decals.length = 0; pieces.length = 0;
        banner = { t: 'O ABRIGO CAIU', sub: 'Um novo grupo recomeça...', c: '#ff5a4a', life: 4, max: 4 };
        break;
      case 'built':
        {
          const info = d.perk ? PERKS[d.k] : BUILD[d.k];
          const t = d.lv === 1 && !d.perk ? `${info.icon} ${info.nome} construído!` : `${info.icon} ${info.nome}: nv. ${d.lv - 1} → ${d.lv}`;
          texts.push({ x: W / 2, y: 60, t, c: d.perk ? '#f3d36a' : '#e8e0c0', life: 2.2 });
        }
        break;
    }
  }

  function drawSky() {
    const wave = S.horde.active, L = look(), st = sceneStyle();
    const top = mix(L.dayTop, L.nightTop, night);
    const ev = Endgame.event() ? S.horde.event : null;
    const bot = mix(L.dayBot, ev === 'sangue' ? [140, 10, 20] : ev === 'acida' ? [40, 70, 30] : wave ? L.wave : L.nightBot, night);
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, `rgb(${top})`); g.addColorStop(1, `rgb(${bot})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, GY);

    if (night < 1) {
      ctx.globalAlpha = 1 - night;
      if (st === 'synth') drawSynthSun(g);
      else if (st === 'terror') {
        // sol pálido atrás da névoa
        const h = ctx.createRadialGradient(390, 44, 0, 390, 44, 40);
        h.addColorStop(0, 'rgba(220,225,200,0.35)'); h.addColorStop(1, 'rgba(220,225,200,0)');
        ctx.fillStyle = h; ctx.fillRect(350, 4, 80, 80);
        ctx.fillStyle = 'rgba(214,218,196,0.75)'; ctx.beginPath(); ctx.arc(390, 44, 8, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,220,160,0.3)'; ctx.beginPath(); ctx.arc(390, 44, 15, 0, 7); ctx.fill();
        ctx.fillStyle = '#f3d9a0'; ctx.beginPath(); ctx.arc(390, 44, 9, 0, 7); ctx.fill();
      }
    }
    if (night > 0) {
      ctx.globalAlpha = night;
      for (const s of city.stars) {
        ctx.fillStyle = Math.sin(time * 2 + s.tw) > 0.6 ? '#ffffff' : '#9aa0c0';
        ctx.fillRect(s.x, s.y, 1, 1);
      }
      if (ev === 'sangue') {
        ctx.fillStyle = 'rgba(255,40,40,0.25)'; ctx.beginPath(); ctx.arc(150, 34, 22, 0, 7); ctx.fill();
        ctx.fillStyle = '#d02a2a'; ctx.beginPath(); ctx.arc(150, 34, 15, 0, 7); ctx.fill();
        ctx.fillStyle = '#a01818'; ctx.fillRect(145, 29, 3, 3); ctx.fillRect(153, 36, 4, 3);
      } else {
        ctx.fillStyle = '#e8e6d8'; ctx.beginPath(); ctx.arc(150, 32, 9, 0, 7); ctx.fill();
        ctx.fillStyle = '#c8c6b8'; ctx.fillRect(147, 29, 2, 2); ctx.fillRect(152, 34, 3, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Sol listrado do synthwave: degradê amarelo → rosa, cortado por faixas da cor do céu
  function drawSynthSun(sky) {
    const x = 390, y = 70, r = 28;
    const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2);
    glow.addColorStop(0, 'rgba(255,90,160,0.35)'); glow.addColorStop(1, 'rgba(255,90,160,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    const sg = ctx.createLinearGradient(0, y - r, 0, y + r);
    sg.addColorStop(0, '#ffe46b'); sg.addColorStop(0.55, '#ff8a5c'); sg.addColorStop(1, '#ff3f9a');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    // faixas ficam mais grossas perto do horizonte
    ctx.fillStyle = sky;
    for (let k = 0, by = y - 2; k < 7; k++) { const h = 1 + k * 0.7; ctx.fillRect(x - r - 1, by, r * 2 + 2, h); by += h + 3.2 - k * 0.25; }
  }

  function drawCity() {
    const L = look();
    const neon = L.neon ? `rgba(255,70,200,${0.35 + night * 0.5})` : null;
    for (const b of city.far) {
      building(b, GY, L.far, L.neon ? `rgba(90,200,255,${0.25 + night * 0.35})` : null);
    }
    for (const b of city.near) {
      building(b, GY, L.near, neon);
      for (const w of b.win) {
        const wx = b.x + w.x, wy = GY - b.h + w.y;
        if (wy < GY - b.h + Math.max(...b.jag) + 2) continue;
        // no synthwave as janelas de neon ficam acesas também de dia
        const glow = L.neon ? Math.max(0.45, night) : night;
        if (w.lit && glow > 0.2 && Math.sin(time * 0.7 + w.f) > -0.8) {
          ctx.fillStyle = `rgba(${L.lit[Math.floor(w.f) % L.lit.length]},${glow * 0.9})`; ctx.fillRect(wx, wy, 2, 3);
        } else rect(L.win, wx, wy, 2, 3);
      }
    }
    // a horda no horizonte
    if (hordeVis > 0.01) {
      ctx.globalAlpha = hordeVis * 0.85;
      for (const h of city.horde) {
        const x = ((h.x - time * h.sp) % 300 + 300) % 300 + 190, s = h.s;
        const b = Math.round(Math.sin(time * 4 + h.ph));
        ctx.fillStyle = 'rgb(22,18,24)';
        ctx.fillRect(x, h.y - 9 * s + b * 0.5, 3 * s, 6 * s);
        ctx.fillRect(x + 0.5 * s, h.y - 12 * s + b * 0.5, 2.5 * s, 3 * s);
        ctx.fillRect(x - 3 * s, h.y - 8 * s + b * 0.5, 3 * s, 1 * s);
        ctx.fillRect(x + (b > 0 ? 0 : 1.5) * s, h.y - 3 * s, 1.2 * s, 3 * s);
        if (night > 0.5) { ctx.fillStyle = 'rgba(255,60,40,0.9)'; ctx.fillRect(x + 0.5 * s, h.y - 11 * s + b * 0.5, 0.8, 0.8); }
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawFog() {
    const amt = Math.max(night, look().fog || 0);
    if (amt < 0.05) return;
    for (const f of city.fog) {
      const x = ((f.x + time * f.sp) % (W + f.w * 2)) - f.w;
      const g = ctx.createRadialGradient(x, f.y, 0, x, f.y, f.w / 2);
      g.addColorStop(0, `rgba(170,180,200,${(S.horde.event === 'neblina' && S.horde.active ? 0.5 : 0.13) * amt})`); g.addColorStop(1, 'rgba(170,180,200,0)');
      ctx.fillStyle = g;
      ctx.save(); ctx.translate(x, f.y); ctx.scale(1, 0.25); ctx.translate(-x, -f.y);
      ctx.fillRect(x - f.w / 2, f.y - f.w / 2, f.w, f.w);
      ctx.restore();
    }
  }

  // neblina pesada sobre o campo de batalha e chuva ácida
  function drawWeather() {
    if (!S.horde.active) return;
    if (S.horde.event === 'neblina') {
      const g = ctx.createLinearGradient(WALL_X + 100, 0, W, 0);
      g.addColorStop(0, 'rgba(160,170,185,0)'); g.addColorStop(0.3, 'rgba(160,170,185,0.55)'); g.addColorStop(1, 'rgba(160,170,185,0.8)');
      ctx.fillStyle = g; ctx.fillRect(WALL_X + 100, 60, W, H);
    }
    if (S.horde.event === 'acida') {
      ctx.strokeStyle = 'rgba(160,230,90,0.45)'; ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let i = 0; i < 90; i++) {
        const x = (i * 53.7 + time * 70) % (W + 20) - 10, y = (i * 37.3 + time * 220) % H;
        ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 6);
      }
      ctx.stroke();
    }
  }

  // bandeiras verdes nos distritos libertados, no horizonte
  const FLAG_X = { shopping: 240, fazendas: 280, fabrica: 330, hospital: 370, universidade: 410, baseaerea: 450 };
  function drawFlags() {
    for (const k in FLAG_X) {
      if (!S.districts[k]) continue;
      const x = FLAG_X[k], y = 98 + (x % 3) * 4, wv = Math.round(Math.sin(time * 3 + x));
      rect([60, 60, 60], x, y, 1, 14);
      rect([70, 170, 80], x + 1, y + wv * 0.5, 7, 4);
      rect([230, 230, 230], x + 3, y + 1 + wv * 0.5, 2, 2);
    }
  }

  function drawPlanes() {
    for (const p of planes) {
      const c = [70, 76, 70];
      rect(c, p.x - 14, p.y - 1, 24, 3);             // fuselagem
      rect(c, p.x + 10, p.y, 4, 2);                  // nariz
      rect([50, 56, 50], p.x - 4, p.y - 6, 7, 12);   // asas
      rect([50, 56, 50], p.x - 14, p.y - 5, 3, 5);   // cauda
      rect('#ffe066', p.x - 16, p.y, 2, 1);
      light(p.x - 16, p.y, 8, '255,180,80', 0.6);
    }
  }

  function drawToasts() {
    toasts.forEach((t, i) => {
      const a = Math.max(0, Math.min(1, (t.max - t.life) / 0.25, t.life / 0.5));
      const slide = (1 - Math.min(1, (t.max - t.life) / 0.25)) * 20;
      const w = 170, h = 24, x = W - w - 6 + slide, y = 40 + i * 28;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(30,24,6,0.88)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#c9a929'; ctx.fillRect(x, y, 2, h);
      ctx.strokeStyle = 'rgba(243,211,106,0.6)'; ctx.lineWidth = 0.6; ctx.strokeRect(x, y, w, h);
      ctx.textAlign = 'left';
      ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#ffe066'; ctx.fillText(t.t, x + 7, y + 10);
      ctx.font = '7px sans-serif'; ctx.fillStyle = '#e8e0c0'; ctx.fillText(t.sub, x + 7, y + 19);
    });
    ctx.globalAlpha = 1;
  }

  // barra de vida de cada chefe na tela (até 3), com o estado atual (tonto, blindado, subterrâneo...)
  function drawBossBar() {
    const list = S.horde.zs.filter(z => ZTYPES[z.type].boss && !z.dead).slice(0, 3);
    list.forEach((boss, i) => {
      const T_ = ZTYPES[boss.type], col = BOSSCOLOR[boss.type] || '#ff3a3a';
      const w = 180, x = W / 2 - w / 2, y = 24 + i * 15;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 2, y - 2, w + 4, 8);
      ctx.fillStyle = '#3a0c0c'; ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, boss.hp) / (boss.maxHp || T_.hp), 4);
      // marcas das fases do Colosso
      if (T_.phases) for (const P of T_.phases) { ctx.fillStyle = '#000'; ctx.fillRect(x + w * P.at, y, 1, 4); }
      const name = `${T_.icon} ${T_.nome.toUpperCase()}`;
      ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(name, W / 2 + 0.6, y - 4 + 0.6);
      ctx.fillStyle = col; ctx.fillText(name, W / 2, y - 4);
      ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'right';
      ctx.fillStyle = '#ffd0c8'; ctx.fillText(`${pts(boss.hp)} / ${pts(boss.maxHp)}`, x + w, y - 4);
      const st = Bosses.status(boss);
      if (st) {
        ctx.textAlign = 'left';
        ctx.fillStyle = Math.sin(time * 8) > 0 || !/!/.test(st) ? '#ffe066' : '#ff8060';
        ctx.fillText(st, x, y - 4);
      }
    });
  }

  function drawGround() {
    rect([86, 76, 60], 0, GY, W, H - GY);
    rect([62, 60, 60], 0, 158, W, 37);
    rect([74, 72, 70], 0, 158, W, 1);
    for (let x = WALL_X + 18; x < W; x += 22) rect([150, 140, 96], x, 176, 10, 1);
    for (const c of city.cracks) if (c.x > WALL_X) rect([48, 46, 46], c.x, c.y, c.w, 1);
    // terra batida dentro do acampamento
    rect([88, 74, 56], 0, 158, WALL_X, 37);
    for (const g of camp.gravel) rect(g.c, g.x, g.y, g.w, 1);
    rect([74, 62, 46], 0, 158, WALL_X, 1);
    rect([70, 62, 48], 0, 195, W, 5);
    // carro queimado e poste
    const cx = 300, cy = 157;
    rect([62, 42, 34], cx, cy - 9, 34, 7); rect([50, 36, 30], cx + 7, cy - 15, 18, 6);
    rect([22, 22, 24], cx + 9, cy - 14, 6, 4); rect([22, 22, 24], cx + 17, cy - 14, 6, 4);
    rect([120, 64, 30], cx + 2, cy - 8, 4, 2); rect([120, 64, 30], cx + 26, cy - 6, 3, 2);
    rect([18, 18, 18], cx + 4, cy - 3, 6, 4); rect([18, 18, 18], cx + 24, cy - 3, 6, 4);
    rect([56, 56, 62], 425, 106, 2, 51); rect([56, 56, 62], 425, 106, 11, 2); rect([80, 80, 70], 433, 108, 4, 2);
    drawWreck(372, 186);
  }

  // Carro abandonado na rua: lataria amassada, vidros estourados, pneus murchos (inclinado por isso)
  function drawWreck(x, y) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.045);
    rect([20, 20, 22], 2, -2, 36, 2);                                   // sombra
    rect([70, 92, 110], 0, -11, 40, 8);                                 // lataria
    rect([58, 76, 92], 0, -5, 40, 2);
    rect([62, 82, 98], 8, -18, 22, 7);                                  // cabine
    rect([70, 92, 110], 6, -12, 3, 1); rect([70, 92, 110], 29, -12, 3, 1);
    // janelas: uma estourada (buraco escuro com cacos), uma trincada
    rect([18, 20, 26], 10, -17, 8, 5);
    rect([150, 180, 200], 10, -17, 2, 1); rect([150, 180, 200], 16, -13, 2, 1); rect([150, 180, 200], 10, -14, 1, 2);
    rect([110, 140, 160], 20, -17, 8, 5);
    rect([220, 235, 240], 21, -16, 1, 1); rect([220, 235, 240], 22, -15, 2, 1); rect([220, 235, 240], 24, -14, 1, 2); rect([220, 235, 240], 25, -16, 2, 1);
    // porta aberta, ferrugem e amassado
    rect([58, 76, 92], 14, -11, 1, 6); rect([110, 70, 40], 30, -9, 4, 2); rect([110, 70, 40], 4, -8, 2, 1);
    rect([46, 60, 72], 22, -10, 5, 2);
    rect([200, 60, 40], 38, -9, 2, 2); rect([230, 210, 120], 0, -9, 2, 2);   // lanternas quebradas
    // pneus murchos: achatados e largos, aro quase no chão
    for (const wx of [4, 28]) { rect([22, 22, 22], wx - 1, -3, 9, 3); rect([90, 90, 96], wx + 2, -3, 3, 1); rect([22, 22, 22], wx, -4, 7, 1); }
    ctx.restore();
    // cacos de vidro no asfalto brilhando
    for (const g of camp.glass) if (Math.sin(time * 2 + g.p) > 0.3) rect([200, 225, 240], x + g.x, y + g.y, 1, 1); else rect([110, 130, 140], x + g.x, y + g.y, 1, 1);
  }

  // ---------- acampamento: elementos fixos ----------
  const camp = (() => {
    const r = seeded(57);
    const gravel = Array.from({ length: 70 }, () => ({ x: r() * (WALL_X - 4), y: 160 + r() * 34, w: 1 + Math.floor(r() * 3), c: pick([[104, 88, 66], [76, 64, 48], [112, 102, 86]]) }));
    const glass = Array.from({ length: 9 }, () => ({ x: -4 + r() * 48, y: -1 + r() * 6, p: r() * 6 }));
    const bulbs = ['255,200,90', '255,120,80', '140,220,255', '255,230,140', '170,255,140'];
    return { gravel, glass, bulbs };
  })();

  // ---------- ambientação: o cenário começa limpo ----------
  // Sangue e corpos só aparecem com as mortes e vão sendo trocados com o tempo (veja MARKS)
  const scenery = { stains: [], drags: [], bodies: [] };
  let bodyLooks = null;
  function sceneryLooks() {
    if (bodyLooks) return bodyLooks;
    bodyLooks = scenery.bodies.map(b => {
      if (b.zombie) return { ...zlook({ id: 900000 + b.seed, type: 'normal' }), face: b.flip ? 1 : -1 };
      const p = newPerson('ocioso');
      return { skin: p.skin, hair: p.hair, shirt: p.ownShirt, pants: [60, 60, 70], face: b.flip ? 1 : -1 };
    });
    return bodyLooks;
  }

  function drawScenery() {
    if (gore()) {
      for (const s of scenery.stains) {
        ctx.globalAlpha = s.a;
        ctx.fillStyle = T([88, 14, 14]);
        ctx.beginPath(); ctx.ellipse(s.x, s.y, s.w, s.w * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      }
      // rastros de algo sendo arrastado
      for (const d of scenery.drags) { ctx.globalAlpha = d.a; rect([80, 12, 12], d.x, d.y, d.len, 1); rect([80, 12, 12], d.x + 3, d.y + 2, d.len * 0.6, 1); }
      ctx.globalAlpha = 1;
    }
    const looks = sceneryLooks();
    scenery.bodies.forEach((b, i) => {
      if (gore()) { ctx.globalAlpha = 0.55; ctx.fillStyle = T([92, 12, 12]); ctx.beginPath(); ctx.ellipse(b.x + 6, b.y + 1, 8, 2.2, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      drawHuman(b.x, b.y, { ...looks[i], pose: 'zwalk', phase: 0, rot: (b.flip ? -1 : 1) * Math.PI / 2, alpha: 0.9 });
    });
  }

  function drawShelter() {
    // prédio
    rect([92, 88, 82], 2, 104, 64, 48);
    for (let y = 108; y < 152; y += 6) rect([84, 80, 75], 2, y, 64, 1);
    rect([60, 56, 52], 0, 99, 68, 6);
    rect([70, 72, 70], 22, 124, 22, 28);
    for (let y = 126; y < 152; y += 4) rect([58, 60, 58], 22, y, 22, 1);
    for (const wx of [6, 50]) {
      rect([30, 30, 34], wx, 114, 10, 8);
      if (night > 0.2) { ctx.fillStyle = `rgba(240,180,80,${night * 0.8})`; ctx.fillRect(wx + 1, 115, 8, 6); light(wx + 5, 118, 16, '255,180,80', night * 0.25); }
      rect([110, 80, 50], wx - 1, 116, 12, 1); rect([110, 80, 50], wx + 4, 113, 1, 10);
    }
    rect([40, 36, 34], 14, 106, 40, 9);
    ctx.fillStyle = T([210, 50, 40]); ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ABRIGO', 34, 113);
    // arame farpado na beira do telhado
    for (let x = 1; x < 67; x += 4) { rect([120, 120, 126], x, 97, 3, 1); rect([150, 150, 156], x + 1, 96, 1, 1); }
    // caixa d'água
    rect([70, 74, 80], 36, 88, 1, 11); rect([70, 74, 80], 45, 88, 1, 11); rect([96, 104, 112], 34, 82, 14, 7); rect([120, 128, 136], 34, 82, 14, 1);
    // sacos de areia dos lados da porta e lampião
    for (const [sx, n] of [[13, 3], [45, 3]]) for (let i = 0; i < n; i++) { rect([150, 132, 96], sx + (i % 2) * 2, 146 - i * 3, 8, 3); rect([120, 104, 74], sx + (i % 2) * 2, 148 - i * 3, 8, 1); }
    rect([60, 50, 40], 46, 128, 1, 4); rect([255, 210, 120], 45, 131, 3, 3);
    light(46, 132, 14 + Math.sin(time * 6) * 0.6, '255,200,110', 0.15 + night * 0.35);
    // tambor de água da chuva
    rect([50, 80, 130], 57, 141, 8, 11); rect([40, 66, 110], 57, 144, 8, 1); rect([40, 66, 110], 57, 149, 8, 1);

    // laboratório no telhado
    if (S.build.lab > 0) {
      rect([200, 205, 200], 6, 86, 22, 13); rect([150, 155, 150], 5, 84, 24, 3);
      rect([40, 60, 50], 9, 89, 7, 5);
      ctx.fillStyle = 'rgba(120,255,140,' + (0.5 + Math.sin(time * 3) * 0.3) + ')'; ctx.fillRect(10, 90, 5, 3);
      rect([90, 200, 120], 20, 90, 3, 5); rect([60, 160, 220], 24, 91, 2, 4);
      if (Math.random() < 0.05) parts.push({ x: 21, y: 89, vx: rand(-2, 2), vy: rand(-8, -4), life: 1, max: 1, c: '#9be35a', s: 1, a: 0.7 });
      light(12, 91, 14, '120,255,140', 0.2 + night * 0.2);
    }

    // rádio
    if (S.build.radio > 0) {
      rect([70, 70, 74], 62, 72, 1, 27); rect([70, 70, 74], 59, 78, 7, 1); rect([70, 70, 74], 60, 85, 5, 1);
      if (Math.sin(time * 5) > 0) { rect('#ff3030', 61, 70, 3, 2); light(62, 71, 10, '255,40,40', 0.5); }
    }

    // caixas de sucata
    const crates = Math.min(6, Math.floor(Math.log10(S.res.sucata + 1) * 2));
    for (let i = 0; i < crates; i++) {
      const x = 68 + (i % 3) * 8, y = 157 - Math.floor(i / 3) * 7;
      rect([126, 94, 52], x, y - 7, 7, 7); rect([96, 70, 38], x, y - 4, 7, 1); rect([96, 70, 38], x + 3, y - 7, 1, 7);
    }

    // varal de lâmpadas entre o abrigo e o poste da lona (acende à noite)
    rect([86, 64, 40], 160, 128, 2, 30);
    for (let i = 0; i <= 12; i++) {
      const f = i / 12, lx = 66 + (160 - 66) * f, ly = 107 + (128 - 107) * f + Math.sin(f * Math.PI) * 9;
      if (i < 12) { const f2 = (i + 1) / 12; ctx.strokeStyle = T([40, 36, 32]); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(66 + 94 * f2, 107 + 21 * f2 + Math.sin(f2 * Math.PI) * 9); ctx.stroke(); }
      if (i % 2 === 0 && i > 0 && i < 12) {
        const c = camp.bulbs[(i / 2) % camp.bulbs.length], on = night > 0.15 && Math.sin(time * 1.3 + i * 2) > -0.95;
        ctx.fillStyle = on ? `rgba(${c},1)` : T([70, 66, 60]); ctx.fillRect(lx - 0.5, ly + 0.5, 2, 2);
        if (on) light(lx + 0.5, ly + 1.5, 9, c, 0.18 + night * 0.25);
      }
    }

    // barracas: duas águas, lado na sombra, porta aberta, cordas e luz dentro à noite
    const TENT = [[74, 96, 72], [120, 92, 56], [70, 82, 110]];
    for (let i = 0; i < Math.min(S.build.beliche, 3); i++) {
      const x = 92 + i * 17, base = 156, c = TENT[i];
      ctx.strokeStyle = T([150, 140, 110]); ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(x + 8, base - 12); ctx.lineTo(x - 3, base); ctx.moveTo(x + 8, base - 12); ctx.lineTo(x + 19, base); ctx.stroke();
      ctx.fillStyle = T(c);
      ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + 8, base - 12); ctx.lineTo(x + 16, base); ctx.fill();
      ctx.fillStyle = T(shade(c, 0.72));
      ctx.beginPath(); ctx.moveTo(x + 8, base - 12); ctx.lineTo(x + 16, base); ctx.lineTo(x + 11, base); ctx.fill();
      rect(shade(c, 1.2), x + 7, base - 12, 2, 1);
      ctx.fillStyle = night > 0.3 ? `rgba(255,190,100,${0.5 + night * 0.4})` : T([28, 26, 24]);
      ctx.beginPath(); ctx.moveTo(x + 5, base); ctx.lineTo(x + 8, base - 7); ctx.lineTo(x + 10, base); ctx.fill();
      if (night > 0.3) light(x + 8, base - 3, 10, '255,180,90', night * 0.3);
      rect([60, 52, 40], x - 3, base - 1, 1, 1); rect([60, 52, 40], x + 19, base - 1, 1, 1);
    }

    // lona sobre a bancada
    rect([86, 64, 40], 136, 136, 1, 22);
    ctx.fillStyle = T([64, 104, 140]);
    ctx.beginPath(); ctx.moveTo(133, 138); ctx.lineTo(163, 129); ctx.lineTo(163, 132); ctx.lineTo(133, 141); ctx.fill();
    rect([52, 86, 116], 133, 140, 1, 2); rect([52, 86, 116], 162, 131, 1, 2);
    // bancada com ferramentas
    rect([110, 78, 46], 138, 152, 22, 2); rect([80, 56, 34], 139, 154, 2, 5); rect([80, 56, 34], 157, 154, 2, 5);
    rect([130, 130, 135], 141, 149, 4, 3); rect([160, 50, 40], 147, 150, 5, 2); rect([90, 90, 96], 154, 148, 2, 4);
    // sacos de areia junto do muro
    for (let i = 0; i < 7; i++) { const row = i < 4 ? 0 : 1, k = row ? i - 4 : i; rect([150, 132, 96], 172 + k * 5 + row * 2, 154 - row * 3, 6, 3); rect([120, 104, 74], 172 + k * 5 + row * 2, 156 - row * 3, 6, 1); }

    // varal de roupas
    rect([86, 64, 40], 6, 160, 1, 14); rect([86, 64, 40], 46, 160, 1, 14);
    ctx.strokeStyle = T([150, 140, 120]); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(6, 161); ctx.quadraticCurveTo(26, 165, 46, 161); ctx.stroke();
    [[10, [150, 60, 60], 5, 6], [19, [70, 90, 140], 6, 5], [29, [200, 190, 160], 4, 7], [37, [90, 110, 70], 5, 5]].forEach(([cx, c, w, h], i) => {
      const sway = Math.round(Math.sin(time * 1.6 + i) * 0.7);
      rect(c, cx + sway, 162 + (i === 1 || i === 2 ? 1 : 0), w, h);
    });

    // horta
    for (let i = 0; i < plotCount(); i++) {
      const x = 4 + i * 14, y = 186;
      rect([70, 48, 30], x, y, 12, 5); rect([92, 64, 38], x, y, 12, 1);
      for (let j = 0; j < 3; j++) {
        const px = x + 2 + j * 4, h = 2 + ((i + j) % 3), sw = Math.round(Math.sin(time * 2 + i + j) * 0.6);
        rect([70, 140, 60], px + sw, y - h, 1, h); rect([90, 170, 70], px - 1 + sw, y - h, 3, 1);
        if (S.build.horta > i) rect([210, 50, 40], px + 1 + sw, y - h + 1, 1, 1);
      }
    }

    // fogueira: troncos para sentar, anel de pedras e panela no tripé
    const f = FIRE;
    rect([96, 66, 40], f.x - 20, f.y - 1, 9, 3); rect([120, 86, 52], f.x - 20, f.y - 1, 9, 1); rect([150, 120, 80], f.x - 20, f.y - 1, 1, 3);
    rect([96, 66, 40], f.x + 12, f.y + 2, 9, 3); rect([120, 86, 52], f.x + 12, f.y + 2, 9, 1); rect([150, 120, 80], f.x + 20, f.y + 2, 1, 3);
    for (const [dx, dy] of [[-7, 0], [-5, 2], [-1, 3], [3, 3], [6, 1], [7, -1], [-6, -2], [5, -2]]) rect([118, 114, 108], f.x + dx, f.y + dy, 2, 1);
    rect([90, 60, 35], f.x - 5, f.y - 1, 10, 2); rect([70, 45, 25], f.x - 3, f.y - 2, 6, 1);
    ctx.strokeStyle = T([70, 58, 46]); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(f.x - 6, f.y + 1); ctx.lineTo(f.x, f.y - 15); ctx.lineTo(f.x + 6, f.y + 1); ctx.moveTo(f.x, f.y - 15); ctx.lineTo(f.x + 1, f.y + 2); ctx.stroke();
    rect([40, 40, 44], f.x - 3, f.y - 12, 6, 4); rect([60, 60, 66], f.x - 3, f.y - 12, 6, 1);
    if (Math.random() < 0.04) parts.push({ x: f.x + rand(-2, 2), y: f.y - 13, vx: rand(-2, 2), vy: rand(-10, -6), life: 1.2, max: 1.2, c: [200, 200, 205], s: 1, a: 0.35 });
    for (const k of [-2, 0, 2]) {
      const h = 3 + Math.abs(Math.sin(time * 9 + k * 1.7)) * 4;
      ctx.fillStyle = '#ff8a20'; ctx.fillRect(f.x + k - 1, f.y - 2 - h, 2, h);
      ctx.fillStyle = '#ffd040'; ctx.fillRect(f.x + k - 0.5, f.y - 2 - h * 0.6, 1, h * 0.6);
    }
    light(f.x, f.y - 4, 30 + Math.sin(time * 7) * 2, '255,140,40', 0.12 + night * 0.3);

    drawTrophy();
    // líder no telhado (você), com a skin escolhida
    updateAim();
    drawLook(LEADER.x, LEADER.y, Profile.look(), {
      pose: S.horde.active ? 'aim' : 'stand', face: 1, phase: 0, aim: S.horde.active && GOFF ? aimAng : null,
      gun: leaderGun(), gunDy: Math.round(Math.sin(Math.min(1, leaderSwap / 0.22) * Math.PI) * 3),
    });
    if (leaderMuzzle > 0) {
      const t = gunTip(), fire = leaderGun() === 'chamas';
      rect(fire ? '#ff9a30' : '#fff4b0', t.x, t.y - 1, 3, 3);
      light(t.x + 1, t.y, leaderGun() === 'bazuca' ? 22 : 12, fire ? '255,140,40' : '255,220,120', 0.7);
    }
    // herói de campo no telhado, ao lado do líder, com a barra da suprema em cima
    const ck = Champions.cur();
    if (ck) {
      const P = CHAMP_POS, c = S.meta.champ;
      drawLook(P.x, P.y, Champions.look(ck), { pose: S.horde.active ? 'aim' : 'stand', face: 1, phase: 0 });
      if (champMuzzle > 0) { rect('#fff4b0', P.x + 8, P.y - 12, 2, 2); light(P.x + 9, P.y - 11, 10, CHAMPS[ck].color, 0.7); }
      if (Champions.rank('sup') >= 1) {
        rect([30, 30, 30], P.x - 5, P.y - 25, 10, 2);
        rect(c.charge >= 1 ? '#ffe066' : '#7fb0ff', P.x - 5, P.y - 25, Math.round(10 * Math.min(1, c.charge)), 2);
        if (c.charge >= 1) light(P.x, P.y - 12, 14 + Math.sin(time * 6) * 3, '255,224,102', 0.5);
      }
    }
  }

  // uma torre por tipo (curta colada ao muro, longa mais atrás), com farda de cor diferente
  const TOWER_SHIRT = [[120, 70, 50], [88, 98, 62], [60, 70, 90]];
  function drawTowers() {
    for (const key in TOWERS) {
      if (!S.build[key]) continue;
      const k = TOWERS[key].slot, x = towerX(k), crew = towerStat(key).crew;
      rect([96, 70, 44], x, TOWER_TOP, 2, 36); rect([96, 70, 44], x + 10, TOWER_TOP, 2, 36);
      for (let y = TOWER_TOP + 8; y < 158; y += 10) rect([80, 58, 36], x, y, 12, 1);
      rect([112, 82, 50], x - 2, TOWER_TOP, 16, 3);
      rect([96, 70, 44], x - 2, TOWER_TOP - 5, 1, 5); rect([96, 70, 44], x + 13, TOWER_TOP - 5, 1, 5);
      drawHuman(x + 5, TOWER_TOP, {
        pose: S.horde.active ? 'aim' : 'stand', face: 1, phase: 0, helmet: true,
        skin: SKINS[k % 5], hair: [40, 30, 20], shirt: TOWER_SHIRT[k], pants: [70, 74, 52],
      });
      rect([112, 82, 50], x - 2, TOWER_TOP - 2, 16, 1);
      if (towerMuzzle[k] > 0) { rect('#fff4b0', x + 14, TOWER_TOP - 12, 3, 3); light(x + 15, TOWER_TOP - 11, 12, '255,220,120', 0.7); }
      if (crew > 1) {
        ctx.fillStyle = '#e8e0c0'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`x${crew}`, x + 6, TOWER_TOP - 22);
      }
    }
  }

  function drawDefenses() {
    const traps = S.meta.tech.armadilhas, elec = S.meta.tech.eletrico;
    if (traps) for (let i = 0; i < 4 + traps * 2; i++) {
      const x = WALL_X + 40 + (i * 37) % 30, y = 162 + (i * 23) % 30;
      rect([120, 120, 125], x, y, 1, 2); rect([120, 120, 125], x + 2, y, 1, 2); rect([90, 90, 95], x - 1, y + 2, 5, 1);
    }
    if (elec) {
      const x = WALL_X + 11;
      for (let y = 158; y < 196; y += 6) rect([70, 70, 80], x, y, 1, 4);
      ctx.strokeStyle = 'rgba(120,200,255,' + (0.4 + Math.random() * 0.4) + ')'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(x, 158);
      for (let y = 158; y < 196; y += 4) ctx.lineTo(x + (Math.random() - 0.5) * 2, y);
      ctx.stroke();
      light(x, 175, 10, '120,200,255', 0.15);
    }
  }

  function drawWall() {
    const jolt = wallJolt > 0 ? Math.round(rand(-1, 1)) : 0;
    const x = WALL_X + jolt, lvl = Math.min(S.build.muro, 6);
    const top = GY - 10 - lvl * 3, bottom = 197;
    const hp = S.wallHp / maxWall(), broken = S.wallHp <= 0;
    const r = seeded(99);

    rect([70, 50, 32], x, top - 4, 2, bottom - top + 4);
    rect([70, 50, 32], x + 8, top - 2, 2, bottom - top + 2);
    for (let y = top, row = 0; y < bottom; y += 5, row++) {
      const miss = r();
      if (broken && y < 178 && miss < 0.8) continue;
      if (!broken && hp < 0.4 && miss < 0.4 - hp) continue;
      rect(row % 2 ? [128, 92, 56] : [112, 80, 48], x - 1, y, 12, 4);
      rect([70, 50, 30], x + 1 + (row % 3) * 3, y + 1, 1, 1);
    }
    if (lvl >= 2 && !broken) rect([110, 115, 120], x + 2, top + 6, 6, 10);
    if (lvl >= 4 && !broken) rect([100, 104, 110], x + 2, top + 24, 6, 12);
    for (let i = 0; i < 4; i++) rect([170, 150, 110], x - 3 + (i % 2) * 7, 188 - Math.floor(i / 2) * 4, 7, 4);
    if (!broken) for (let k = 0; k < 12; k += 2) rect([160, 160, 160], x - 1 + k, top - 2 + (k % 4 ? 1 : 0), 1, 1);
    if (!broken && hp < 0.75) {
      const n = Math.floor((0.75 - hp) * 30);
      for (let i = 0; i < n; i++) rect([40, 28, 18], x + r() * 9, top + r() * (bottom - top), 1, 2 + r() * 3);
    }
    if (broken) for (let i = 0; i < 8; i++) rect([110, 80, 48], x - 6 + r() * 20, 188 + r() * 7, 3, 2);

    rect('#141414', x - 6, top - 10, 22, 3);
    ctx.fillStyle = hp > 0.3 ? '#8fd14f' : '#e05a4f';
    ctx.fillRect(x - 6, top - 10, 22 * Math.max(0, hp), 3);
    if (repairFx) {
      // brilho subindo pelas fileiras (madeira nova) e a barra de vida enchendo com destaque
      const k = Math.min(1, repairFx.t / (repairFx.dur * 0.8)), lineY = bottom - (bottom - top) * k;
      ctx.globalAlpha = 0.45 * (1 - Math.max(0, repairFx.t - repairFx.dur * 0.8) / (repairFx.dur * 0.2));
      for (let y = top; y < bottom; y += 5) if (y >= lineY) rect('#fff1c0', x - 1, y, 12, 1);
      rect('#ffffff', x - 2, Math.round(lineY), 14, 1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x - 6 + 22 * repairFx.from, top - 10, 22 * Math.max(0, hp - repairFx.from), 3);
      // o trabalhador de avental martelando, ao pé do muro
      drawLook(x - 7, 196, { skin: [200, 150, 110], hair: [60, 40, 30], shirt: [80, 92, 112], pants: [50, 50, 58], apron: true, cap: [184, 112, 52] },
        { pose: 'work', crouch: false, face: 1, phase: repairFx.t * 6.2 });
    }
  }

  function drawDecals() {
    for (const d of decals) {
      if (!d.c && !gore()) continue;   // manchas de sangue somem se o sangue for desligado
      // as marcas que ficam de uma onda para a outra ficam mais apagadas que o sangue fresco
      ctx.globalAlpha = Math.min(1, d.life / MARKS.fadeOut) * (d.kept ? 0.5 : 0.75) * (d.max ? 0.35 + 0.65 * d.life / d.max : 1);
      ctx.fillStyle = T(d.c || [110, 16, 16]);
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.w, d.w * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawZombie(z) {
    const t = ZTYPES[z.type], L = zlook(z), s = zsc(z);
    L.scale = s;
    const atk = z.state === 'attack' || z.state === 'spit' || z.state === 'lob' || z.state === 'howl' || (z.state === 'invade' && z.atk);
    L.pose = L.human ? (atk ? 'work' : 'walk') : atk ? 'zattack' : 'zwalk';
    L.phase = atk ? time * (L.human ? 7 : 4) + z.id : time * z.speed * 0.45 + z.id;
    // fortalecidos por um grito (rastro vermelho) ou por esporos (brilho roxo)
    if (z.haste && Math.random() < 0.3) parts.push({ x: z.x + 4, y: z.y - rand(4, 14), vx: rand(10, 25), vy: 0, life: 0.25, max: 0.25, c: [220, 60, 50], s: 1, a: 0.6 });
    if (z.hard) { ctx.fillStyle = `rgba(170,90,220,${0.12 + 0.06 * z.hard})`; ctx.beginPath(); ctx.ellipse(z.x, z.y - 9 * s, 7 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    L.flash = time - (hitAt.get(z.id) ?? -9) < 0.08;
    const lift = z.lift || 0, top = z.y - lift - 19 * s;
    if (BOSSX[z.type]) L.extra = (R, dy, o) => BOSSX[z.type](R, dy, o, z);
    // boneco do campo de treino: preso num poste de madeira, com um alvo pintado
    if (z.dummy) {
      rect('#5a3c22', z.x - 1, z.y - 27 * s, 3, 27 * s);
      rect('#6b4a2a', z.x - 7 * s, z.y - 21 * s, 14 * s, 2);
    }
    if (t.boss) {
      // sombra no chão (mais nítida quando ele está no ar)
      ctx.fillStyle = `rgba(0,0,0,${lift > 1 ? 0.35 : 0.2})`;
      ctx.beginPath(); ctx.ellipse(z.x, z.y + 0.5, 6 * s * Math.max(0.4, 1 - lift / 90), 1.6 * s, 0, 0, Math.PI * 2); ctx.fill();
      if (drawBossBody(z, t, L, s)) { bossMarks(z, t, s, top); return; }
    }
    drawHuman(z.x, z.y - lift, L);
    if (t.boss) bossMarks(z, t, s, top);
    else if (z.stun > 0) stars(z.x, top - 1, 3);
    if (z.maxHp > 1.5 && z.hp < z.maxHp) {
      const by = top - 3;
      rect('#141414', z.x - 6, by, 12, 2);
      ctx.fillStyle = '#e05a4f'; ctx.fillRect(z.x - 6, by, 12 * Math.max(0, z.hp) / z.maxHp, 2);
    }
    if (z.dummy) {
      ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText('🎯 BONECO', z.x + 0.5, top - 6.5);
      ctx.fillStyle = '#ffe066'; ctx.fillText('🎯 BONECO', z.x, top - 7);
    }
    if (z.name) {
      ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(z.name, z.x + 0.5, top - 6.5);
      ctx.fillStyle = '#c9d6a0'; ctx.fillText(z.name, z.x, top - 7);
    }
  }

  // estrelinhas girando sobre quem está atordoado
  function stars(x, y, r) {
    for (let i = 0; i < 3; i++) {
      const a = time * 6 + i * 2.1;
      rect(i % 2 ? '#ffe066' : '#ffffff', x + Math.cos(a) * r, y + Math.sin(a) * r * 0.4, 1, 1);
    }
  }

  // Corpo dos chefes conforme o estado. Devolve true se já desenhou tudo (bola, buraco).
  function drawBossBody(z, t, L, s) {
    const st = z.state, tt = z.tt || 0;
    switch (t.ai) {
      case 'leap':
        if (st === 'crouch') { L.sy = 0.72 + Math.sin(time * 40) * 0.03; L.pose = 'zattack'; }
        else if (st === 'air') L.sy = 1.15;
        else if (st === 'stun') L.sy = 0.85;
        break;
      case 'roll':
        if (st === 'curl' || st === 'roll' || st === 'bounce') {
          const k = st === 'curl' ? Math.min(1, tt / t.roll.curl) : 1;
          if (k < 0.6) { L.sy = 1 - 0.5 * k; L.pose = 'zattack'; drawHuman(z.x + rand(-0.5, 0.5), z.y, L); return true; }
          drawBall(z, L, s);
          return true;
        }
        if (st === 'daze') L.lean = Math.round(Math.sin(time * 5) * 2);
        break;
      case 'burrow':
        if (st === 'dig' || st === 'under' || st === 'rise') { drawDig(z, t, L, s); return true; }
        light(z.x - 2 * s, z.y - 19 * s, 14, '255,240,170', 0.35);   // lanterna
        break;
      case 'phases':
        if (z.crawl) { L.rot = -1.25; L.pose = 'zattack'; L.phase = time * 9; }
        break;
      case 'bloat':
        if (st === 'fuse') {
          const k = Math.min(1, tt / t.bloat.fuse);
          L.scale = s * (1 + 0.18 * k + Math.sin(time * 30) * 0.02 * k);
          if (Math.sin(time * (8 + 22 * k)) > 0) L.flash = true;
          light(z.x, z.y - 10 * s, 20 + 20 * k, '255,80,40', 0.4 + 0.4 * k);
        }
        break;
      case 'weakspot':
        if (z.open) light(z.x - 1 * s, z.y - 9 * s, 16, '255,120,40', 0.6 + 0.3 * Math.sin(time * 14));
        break;
      case 'artillery':
        if (st === 'lob') { L.lean = z.told ? -2 : 0; light(z.x, z.y - 11 * s, 10, '150,255,80', z.told ? 0.6 : 0.25); }
        break;
      case 'howl':
        if (st === 'howl') {
          L.pose = 'zattack';
          if (z.told) { L.lean = -1; light(z.x, z.y - 14 * s, 30, '200,120,255', 0.35 + 0.25 * Math.sin(time * 20)); }
        }
        light(z.x + 1, z.y - 14 * s, 6, '255,240,120', 0.4);   // olhos acesos
        break;
    }
    if (z.state === 'stun' || z.state === 'daze') { drawHuman(z.x, z.y - (z.lift || 0), L); stars(z.x, z.y - 19 * s - 2, 4); return true; }
    return false;
  }

  // Rolador enrolado: bola de placas girando
  function drawBall(z, L, s) {
    const r = 4.4 * s, cx = z.x, cy = z.y - r - (z.lift || 0);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-(z.spin || 0));
    circle(L.flash ? '#ffffff' : shade(L.skin, 0.75), 0, 0, r);
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      rect(L.flash ? '#ffffff' : i % 2 ? [128, 100, 70] : [96, 74, 52], -r * 0.4, -r, r * 0.8, r * 0.5);
    }
    rect(L.eye, r * 0.2, -1, 1.5, 1.5);
    ctx.restore();
    if (z.state === 'roll' && Math.random() < 0.7) parts.push({ x: cx + r, y: z.y - 1, vx: rand(10, 40), vy: rand(-18, -4), g: 60, life: 0.5, max: 0.5, c: [150, 135, 110], s: pick([1, 2]), a: 0.7 });
  }

  // Escavador entrando e saindo da terra (só o que está acima do chão aparece) e o monte de terra andando
  function drawDig(z, t, L, s) {
    const B = t.burrow, tt = z.tt || 0;
    let sink = 1;
    if (z.state === 'dig') sink = Math.min(1, tt / B.dig);
    else if (z.state === 'rise') sink = 1 - Math.min(1, tt / B.rise);
    const ground = z.y + 0.5;
    if (Math.random() < 0.6) parts.push({ x: z.x + rand(-6, 6) * s / 1.8, y: ground - 1, vx: rand(-25, 25), vy: rand(-40, -10), g: 120, life: 0.6, max: 0.6, c: pick([[110, 90, 60], [90, 72, 48], [130, 110, 80]]), s: pick([1, 2]), floor: ground });
    // monte de terra
    rect([96, 78, 52], z.x - 6 * s / 1.8, ground - 2, 12 * s / 1.8, 2);
    rect([118, 98, 66], z.x - 4 * s / 1.8, ground - 3, 8 * s / 1.8, 1);
    if (sink >= 1) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(z.x - 30, ground - 80, 60, 80); ctx.clip();
    L.pose = 'zattack';
    drawHuman(z.x, z.y + sink * 21 * s, L);
    ctx.restore();
  }

  // "!" piscando antes do ataque especial
  function bossMarks(z, t, s, top) {
    if (!Bosses.warn(z)) return;
    if (Math.sin(time * 16) < -0.2) return;
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#000'; ctx.fillText('!', z.x + 0.7, top - 4.3);
    ctx.fillStyle = '#ff4030'; ctx.fillText('!', z.x, top - 5);
  }

  // poças de ácido da Mãe-Cuspideira no pé do muro
  function drawPools() {
    const pools = S.horde.active && S.horde.pools;
    if (!pools || !pools.length) return;
    for (const p of pools) {
      const a = Math.min(1, p.t / 1.5);
      ctx.globalAlpha = 0.8 * a;
      ctx.fillStyle = T([90, 170, 40]);
      ctx.beginPath(); ctx.ellipse(WALL_X + 13, p.y, 8, 2.4, 0, 0, Math.PI * 2); ctx.fill();
      rect([140, 220, 70], WALL_X + 9, p.y - 22, 1, 20);                    // ácido escorrendo no muro
      rect([110, 200, 50], WALL_X + 6, p.y - 14, 1, 12);
      if (Math.random() < 0.15) parts.push({ x: WALL_X + 9 + rand(-5, 8), y: p.y - 1, vx: rand(-3, 3), vy: rand(-14, -6), life: 0.6, max: 0.6, c: '#b0ff60', s: 1, glow: '150,255,80', a: 0.8 });
      light(WALL_X + 12, p.y - 2, 10, '150,255,80', 0.25 * a);
    }
    ctx.globalAlpha = 1;
  }

  // Boneco com skin (líder, vencedores do Hall da Fama e miniaturas): capa atrás, coroa por cima
  function drawLook(x, y, look, o) {
    const face = o.face || 1;
    if (look.cape) rect(look.cape, x - 4 * face - (face < 0 ? 2 : 0), y - 11, 2, 7);
    drawHuman(x, y, { skin: [220, 180, 150], ...look, ...o });
    if (look.crown) {
      const cx = Math.round(x) + (face > 0 ? -2 : -3), cy = Math.round(y) - 19;
      rect([235, 190, 50], cx, cy, 5, 1);
      for (const dx of [0, 2, 4]) rect([235, 190, 50], cx + dx, cy - 1, 1, 1);
      rect([200, 40, 40], cx + 2, cy, 1, 1);
    }
  }
  const skinOfDiff = d => Object.values(LEADER_SKINS).find(s => s.diff === d) || LEADER_SKINS.padrao;

  // Vencedores (deste navegador e do Hall da Fama do site) passeiam na frente do abrigo com o nome em cima
  const HALL_X = [18, 46, 74], HALL_SPOTS = HALL_X.length, HALL_ROTATE = 30;
  function hallNpcs(ents) {
    const all = Profile.hall();
    if (!all.length) return;
    const start = all.length > HALL_SPOTS ? (Math.floor(time / HALL_ROTATE) * HALL_SPOTS) % all.length : 0;
    for (let i = 0; i < Math.min(HALL_SPOTS, all.length); i++) {
      const w = all[(start + i) % all.length], x = HALL_X[i], y = 165 + (i % 2) * 6;
      ents.push([y, () => {
        const face = Math.sin(time * 0.35 + i * 2.1) > 0 ? 1 : -1;
        drawLook(x, y, skinOfDiff(w.d), { pose: 'stand', face, phase: 0 });
        const gold = w.d === 'apocalipse';
        ctx.font = '5px sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(w.n, x + 0.5, y - 20.5, 26);
        ctx.fillStyle = gold ? '#ffd040' : '#efe6c0'; ctx.fillText(w.n, x, y - 21, 26);
      }]);
    }
  }

  // Bandeira de troféu no telhado, na cor da maior dificuldade vencida
  function drawTrophy() {
    const tr = Profile.get().trophy;
    if (tr < 0) return;
    const d = DIFFS[DIFF_ORDER[tr]], wv = Math.round(Math.sin(time * 3));
    rect([60, 60, 60], 6, 84, 1, 15);
    rect(d.color, 7, 84 + wv * 0.5, 8, 5);
    rect([255, 224, 102], 10, 85 + wv * 0.5, 2, 2);
  }

  // Miniatura de uma skin num canvas qualquer (menu e configurações)
  // bust: só cabeça e tronco, maior (retrato dos heróis de campo)
  function portrait(c, look, bust) {
    const oc = ctx, on = night;
    ctx = c.getContext('2d'); night = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    const k = Math.max(1, Math.floor(c.height / (bust ? 15 : 24)));
    ctx.setTransform(k, 0, 0, k, Math.round((c.width - Math.floor(c.width / k) * k) / 2), bust ? Math.round(c.height - 18 * k) : 0);
    drawLook(Math.floor(c.width / k / 2), 22, look, { pose: 'stand', face: 1, phase: 0 });
    ctx = oc; night = on;
  }

  function drawHero(h, x, y) {
    // capa na cor da classe + visual próprio de cada herói
    drawLook(x, y, Endgame.heroLook(h.key), { pose: S.horde.active ? 'aim' : 'stand', face: 1, phase: 0 });
    const b = Math.sin(time * 3 + h.id) * 0.8;
    ctx.fillStyle = '#ffe066'; ctx.font = '6px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('★', x, y - 19 + b);
  }

  // Corpos e sangue: durante a horda tudo fica no chão. No fim de cada onda a maioria some em poucos segundos
  // e só alguns corpos e manchas, sorteados, ficam marcados no cenário até o fim da onda seguinte,
  // quando dão lugar a outros sorteados dela. Passando do limite na horda, os mais antigos desbotam.
  const MARKS = { corpses: 40, keep: [4, 5], keepBlood: [5, 8], quick: [1.2, 4], blood: 90, fadeOut: 2 };
  const sample = (list, n) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const fade = c => Math.max(0, Math.min(1, (c.life - c.t) / MARKS.fadeOut));
  const retire = o => { o.life = Math.min(o.life, o.t + MARKS.fadeOut); };   // começa a desbotar agora
  // mancha de sangue gravada no chão
  function stain(x, y, w) {
    if (!gore()) return;
    decals.push({ x, y, w, life: Infinity });
    const live = decals.filter(d => !d.c && !d.kept && d.life === Infinity);
    for (let i = 0; i < live.length - MARKS.blood; i++) live[i].life = MARKS.fadeOut;
  }
  // faixas do boneco (coordenadas locais, pés em 0): cabeça, tronco, pernas
  const PART = { head: [-19, -11, -15], torso: [-12, -5, -8.5], legs: [-5, 1, -2.5], upper: [-19, -5, -11], body: [-11, 1, -5] };
  const pieces = [], blasts = [];

  // Escolhe como o zumbi morre: cai para trás, cai de cara, perde a cabeça, parte ao meio ou se despedaça
  function dismember(d, look) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const nearBlast = blasts.some(b => time - b.t < 0.25 && Math.abs(b.x - d.x) < b.r && Math.abs(b.y - d.y) < b.r);
    let kind;
    if (!gore()) kind = Math.random() < 0.7 ? 'fall' : 'forward';
    else if (nearBlast || d.src === 'air' || d.src === 'explode') kind = 'gib';
    else if (ZTYPES[d.type].boss) kind = Math.random() < 0.5 ? 'fall' : 'split';
    else {
      const r = Math.random();
      kind = r < 0.35 ? 'fall' : r < 0.5 ? 'forward' : r < 0.7 ? 'headless' : r < 0.87 ? 'split' : 'gib';
    }
    const c = { x: d.x, y: d.y, t: 0, life: Infinity, look, kind, dir, spurt: 0 };
    const s = look.scale || 1, cnt = Settings.get('reduceFx') ? 0.5 : 1;
    const part = (name, vx, vy, vr) => {
      const [a, b, cy] = PART[name];
      pieces.push({ x: d.x, y: d.y + cy * s, cy, clip: [a, b], look, vx, vy, vr, rot: 0, floor: d.y - rand(0, 3) - (b - a) * s * 0.25, t: 0, life: Infinity, rest: false });
      if (pieces.length > 160) pieces.shift();
    };
    if (kind === 'headless') {
      part('head', rand(-15, 45), rand(-75, -40), rand(-14, 14));
      c.spurt = 0.9;
    } else if (kind === 'split') {
      part('upper', dir * rand(10, 30), rand(-45, -25), dir * rand(3, 7));
      c.spurt = 0.7;
    } else if (kind === 'gib') {
      part('head', rand(-50, 50), rand(-110, -60), rand(-16, 16));
      part('torso', rand(-35, 35), rand(-70, -35), rand(-10, 10));
      part('legs', rand(-25, 25), rand(-45, -20), rand(-8, 8));
      for (let i = 0; i < 8 * cnt; i++) pieces.push({ chunk: true, x: d.x + rand(-3, 3), y: d.y - rand(4, 14) * s, vx: rand(-70, 70), vy: rand(-110, -30),
        w: pick([1, 2, 2]), h: pick([1, 1, 2]), c: pick([look.skin, look.shirt, look.pants, [130, 16, 16], [100, 10, 10]]), floor: d.y - rand(-2, 4), t: 0, life: Infinity, rest: false });
      blood(d.x, d.y - 10, 22 * cnt, d.y + 2);
      stain(d.x, d.y + 1, rand(9, 14));
    }
    if (kind !== 'gib') corpses.push(c);
  }

  function drawCorpse(c) {
    const k = Math.min(1, c.t / 0.35), a = fade(c);
    const o = { ...c.look, pose: 'zwalk', phase: 0, alpha: a };
    if (c.kind === 'forward') o.rot = -k * Math.PI / 2 * 0.95;
    else if (c.kind === 'split') {
      // as pernas ficam de pé um instante e depois tombam
      const kl = Math.min(1, Math.max(0, (c.t - 0.45) / 0.3));
      Object.assign(o, { clip: PART.legs.slice(0, 2), rot: kl * Math.PI / 2 * c.dir });
    } else if (c.kind === 'headless') {
      const kh = Math.min(1, Math.max(0, (c.t - 0.25) / 0.4));
      Object.assign(o, { clip: PART.body.slice(0, 2), rot: kh * Math.PI / 2 * c.dir });
    } else o.rot = k * Math.PI / 2;
    drawHuman(c.x, c.y, o);
  }

  function drawPiece(p) {
    const a = fade(p);
    if (p.chunk) { ctx.globalAlpha = a; rect(p.c, p.x, p.y, p.w, p.h); ctx.globalAlpha = 1; return; }
    drawHuman(p.x, p.y, { ...p.look, pose: 'zwalk', phase: 0, rot: p.rot, clip: p.clip, oy: -p.cy, alpha: a });
  }

  // física simples das partes soltas e sangue jorrando dos cortes
  function updateGore(dt) {
    for (const p of pieces) {
      p.t += dt;
      if (p.rest) continue;
      p.vy += 230 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.chunk) p.rot += p.vr * dt;
      if (p.y >= p.floor) {
        p.y = p.floor;
        if (Math.abs(p.vy) > 60 && !p.bounced) { p.vy *= -0.3; p.vx *= 0.5; p.vr = (p.vr || 0) * 0.4; p.bounced = true; }
        else { p.rest = true; if (!p.chunk) p.rot = Math.round(p.rot / (Math.PI / 2)) * (Math.PI / 2) + rand(-0.2, 0.2); }
        if (!p.chunk && p.rest) stain(p.x, p.y + 2, rand(2, 4));
      }
    }
    prune(pieces, p => p.t < p.life);
    for (const c of corpses) {
      if (!(c.spurt > 0)) continue;
      c.spurt -= dt;
      if (!gore() || Math.random() > dt * 30) continue;
      // jorro saindo do pescoço ou da cintura, acompanhando a rotação do corpo
      const s = c.look.scale || 1, ny = (c.kind === 'split' ? -5 : -11) * s;
      const r = c.kind === 'split' ? Math.min(1, Math.max(0, (c.t - 0.45) / 0.3)) * Math.PI / 2 * c.dir : Math.min(1, Math.max(0, (c.t - 0.25) / 0.4)) * Math.PI / 2 * c.dir;
      const nx = c.x - Math.sin(r) * ny, nyw = c.y + Math.cos(r) * ny;
      parts.push({ x: nx, y: nyw, vx: rand(-15, 15) + Math.sin(r) * 30, vy: rand(-55, -25), g: 140, life: 0.6, max: 0.6, c: pick([[150, 20, 20], [110, 10, 10]]), s: 1, floor: c.y + 1 });
    }
  }

  function drawPerson(p) {
    drawHuman(p.x, p.y, p);
    if (p.muzzle > 0 && p.pose === 'aim') { rect('#fff4b0', p.x + 9, p.y - 12, 3, 3); light(p.x + 10, p.y - 11, 12, '255,220,120', 0.7); }
  }

  function drawEffects() {
    for (const t of tracers) {
      ctx.strokeStyle = `rgba(${t.c},${Math.min(1, t.life / 0.07)})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
    }
    for (const p of parts) {
      ctx.globalAlpha = p.solid ? 1 : Math.max(0, p.life / p.max) * (p.a ?? 1);
      rect(p.c, p.x, p.y, p.s, p.s);
      if (p.glow) light(p.x + 1, p.y + 1, 7, p.glow, 0.5);
    }
    for (const f of flashes) light(f.x, f.y, f.r, f.c, f.a * f.life / f.max);
    ctx.globalAlpha = 1;
    if (typeof WSkins !== 'undefined') WSkins.drawFx(ctx);   // efeitos das skins de arma
  }

  // granada em arco; foguete em linha reta com rastro de fumaça
  function drawProjectiles() {
    for (const p of Weapons.projectiles) {
      const f = Math.min(1, p.t / p.dur);
      const x = p.x0 + (p.x - p.x0) * f;
      const y = p.y0 + (p.y - p.y0) * f - (p.rocket ? 0 : Math.sin(f * Math.PI) * 28);
      if (p.rocket) {
        const lk = typeof WSkins !== 'undefined' ? WSkins.projLook(p.k) : null;   // foguete com skin: cores e rastro próprios
        rect(lk ? lk.look[0] : [200, 200, 190], x - 3, y - 1, 6, 2); rect(lk ? lk.look[1] : [220, 60, 40], x + 3, y - 1, 2, 2);
        light(x - 3, y, 10, '255,160,60', 0.6);
        if (lk) WSkins.trail(p.k, x - 4, y);
        else if (Math.random() < 0.8) parts.push({ x: x - 4, y, vx: rand(-10, 0), vy: rand(-6, 6), life: 0.6, max: 0.6, c: [170, 170, 170], s: 2, a: 0.5 });
      } else {
        const lk = typeof WSkins !== 'undefined' ? WSkins.projLook(p.k) : null;   // granada com skin
        rect(lk ? lk.cols[0] : [60, 70, 50], x - 1.5, y - 1.5, 3, 3);
        if (lk) { rect(lk.cols[1], x - 0.5, y - 1.5, 1, 1); WSkins.trail(p.k, x - 1, y); }
      }
    }
  }

  // mira do jogador durante a horda
  function drawReticle() {
    if (!S.horde.active || !ptr.in || paused) return;
    const k = Weapons.current(), w = LWEAPONS[k], st = Weapons.stat(k);
    const far = Weapons.reach(k), out = ptr.x > far + 4, R_ = S.reload;
    const dry = Weapons.ammoOf(k) < 1 && !R_;
    const r = Math.max(4, st.spread * 1.2, w.radius ? st.radius * 0.6 : 0);
    const col = dry || out ? '255,90,80' : R_ ? '150,190,255' : S.clickCd > 0 ? '255,220,120' : '255,255,255';
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    // limite do alcance da arma: linha tracejada no chão
    ctx.strokeStyle = out ? 'rgba(255,90,80,0.55)' : 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.7;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(far, 138); ctx.lineTo(far, 198); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center';
    if (out) { ctx.fillStyle = 'rgba(255,120,100,0.95)'; ctx.fillText('fora de alcance', ptr.x, ptr.y - r - 5); }
    else if (R_) { ctx.fillStyle = 'rgba(170,205,255,0.95)'; ctx.fillText('recarregando...', ptr.x, ptr.y - r - 9); }
    else if (dry) { ctx.fillStyle = 'rgba(255,120,100,0.95)'; ctx.fillText(w.special ? `sem ${SPECIAL_AMMO[w.special].plural}` : 'sem munição no abrigo', ptr.x, ptr.y - r - 5); }
    ctx.strokeStyle = `rgba(${col},0.9)`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(ptr.x, ptr.y, r, 0, 7); ctx.stroke();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.beginPath(); ctx.moveTo(ptr.x + dx * (r - 2), ptr.y + dy * (r - 2)); ctx.lineTo(ptr.x + dx * (r + 3), ptr.y + dy * (r + 3)); ctx.stroke();
    }
    ctx.fillStyle = `rgba(${col},1)`; ctx.fillRect(ptr.x - 0.5, ptr.y - 0.5, 1, 1);
    // recarga do pente: arco azul que se completa
    if (R_) {
      ctx.strokeStyle = 'rgba(150,190,255,0.95)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(ptr.x, ptr.y, r + 5, -Math.PI / 2, -Math.PI / 2 + (1 - R_.t / R_.dur) * Math.PI * 2); ctx.stroke();
    } else if (S.clickCd > 0 && st.cd > 0.3) {
      ctx.strokeStyle = 'rgba(255,220,120,0.9)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(ptr.x, ptr.y, r + 4, -Math.PI / 2, -Math.PI / 2 + (1 - S.clickCd / st.cd) * Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawLights() {
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, `rgba(${l.c},${l.a})`); g.addColorStop(1, `rgba(${l.c},0)`);
      ctx.fillStyle = g; ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    lights.length = 0;
  }

  // balão com o nome em cima e a frase quebrada em linhas
  function drawBubbles() {
    for (const b of bubbles) {
      const p = b.p && !b.p.hidden && people.includes(b.p) ? b.p : null;
      const x = p ? p.x : 46, y = p ? p.y - 22 : 128;
      ctx.font = '6px sans-serif';
      const words = b.text.split(' '), lines = [];
      let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > 92 && cur) { lines.push(cur); cur = w; } else cur = t; }
      if (cur) lines.push(cur);
      ctx.font = 'bold 6px sans-serif';
      const wName = ctx.measureText(b.name).width;
      ctx.font = '6px sans-serif';
      const w = Math.min(100, Math.max(wName, ...lines.map(l => ctx.measureText(l).width))) + 8, h = 9 + lines.length * 7;
      const bx = Math.round(Math.max(2, Math.min(W - w - 2, x - w / 2))), by = Math.round(Math.max(2, y - h));
      ctx.globalAlpha = Math.min(1, b.life / 0.5, (b.max - b.life) / 0.25);
      ctx.fillStyle = 'rgba(250,246,232,0.95)'; ctx.fillRect(bx, by, w, h);
      ctx.fillStyle = 'rgba(40,34,26,0.9)'; ctx.fillRect(bx, by, w, 1); ctx.fillRect(bx, by + h - 1, w, 1); ctx.fillRect(bx, by, 1, h); ctx.fillRect(bx + w - 1, by, 1, h);
      const tx = Math.round(Math.max(bx + 3, Math.min(bx + w - 5, x)));
      ctx.fillStyle = 'rgba(250,246,232,0.95)'; ctx.fillRect(tx - 1, by + h, 3, 2); ctx.fillRect(tx, by + h + 2, 1, 1);
      ctx.textAlign = 'left';
      ctx.font = 'bold 6px sans-serif'; ctx.fillStyle = '#7a3a1a'; ctx.fillText(b.name, bx + 4, by + 7);
      ctx.font = '6px sans-serif'; ctx.fillStyle = '#2a241c';
      lines.forEach((l, i) => ctx.fillText(l, bx + 4, by + 14 + i * 7));
    }
    ctx.globalAlpha = 1;
  }
  function drawTexts() {
    drawBubbles();
    ctx.textAlign = 'center';
    for (const t of texts) {
      ctx.font = t.big ? 'bold 11px sans-serif' : 'bold 8px sans-serif';
      ctx.globalAlpha = Math.min(1, t.life / 0.4);
      ctx.fillStyle = '#000'; ctx.fillText(t.t, t.x + 0.6, t.y + 0.6);
      ctx.fillStyle = t.c; ctx.fillText(t.t, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    const Hd = S.horde;
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left';
    const line = Hd.active
      ? `${Hd.zs.some(z => ZTYPES[z.type].human) || (Hd.queue[0] && ZTYPES[Hd.queue[0]].human) ? '🏴‍☠️' : '🧟'} ONDA ${Hd.n}: ${Hd.queue.length + Hd.zs.length + (Hd.rush ? Hd.rush.length : 0)} ${foeWord(Hd.queue[0] || (Hd.zs[0] && Hd.zs[0].type))} restantes`
      : `☀️ Próxima horda em ${Math.ceil(S.waveTimer)}s (onda ${S.wave})`;
    const w = ctx.measureText(line).width + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(4, 4, w, 14);
    ctx.fillStyle = Hd.active ? '#ff8070' : '#ece6d0'; ctx.fillText(line, 9, 14);

    // boosts ativos
    const B = S.meta.boosts;
    let bx = 4;
    for (const [on, label, bg, fg] of [
      [B.prod > 0, `⚡ 2x ${fmtClock(B.prod)}`, 'rgba(90,75,10,0.75)', '#ffe066'],
      [B.furia > 0, `🔥 Fúria ${fmtClock(B.furia)}`, 'rgba(100,30,15,0.75)', '#ff8a5a'],
      [S.mourn > 0, `🕯️ Luto ${fmtClock(S.mourn)}`, 'rgba(40,40,60,0.75)', '#c8c8e0'],
      [hurt() > 0, `🤕 ${hurt()} ferido(s)`, 'rgba(80,25,20,0.75)', '#f0a090'],
    ]) {
      if (!on) continue;
      ctx.font = 'bold 8px sans-serif';
      const bw = ctx.measureText(label).width + 8;
      ctx.fillStyle = bg; ctx.fillRect(bx, 21, bw, 12);
      ctx.fillStyle = fg; ctx.fillText(label, bx + 4, 30);
      bx += bw + 4;
    }

    ctx.textAlign = 'right'; ctx.font = 'bold 8px sans-serif';
    if (Hd.active) {
      ctx.fillStyle = '#ffd070'; ctx.fillText('🎯 Mire e clique para atirar · (Q) (W) (E) trocam de arma', W - 6, 14);
    }
  }

  // "⚠ INVESTIDA EM 7s": antes de uma onda perigosa e antes da massa da Investida
  function drawAlert() {
    const Hd = S.horde;
    let label = null, secs = 0;
    if (!Hd.active && S.pending !== undefined && S.waveTimer <= WARN_TIME) {
      const dg = Endgame.danger(S.pending, S.wave);
      if (dg) { label = `${dg.icon} ${dg.nome.toUpperCase()}`; secs = S.waveTimer; }
    } else if (Hd.active && Hd.rush && Hd.rushT <= 8) { label = '⚠️ INVESTIDA'; secs = Hd.rushT; }
    if (!label) return;
    const pulse = 0.65 + 0.35 * Math.abs(Math.sin(time * 6));
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(120,10,10,${0.45 * pulse})`; ctx.fillRect(W / 2 - 110, 26, 220, 26);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(`🚨 ${label} EM ${Math.ceil(secs)}s`, W / 2 + 1, 44);
    ctx.fillStyle = `rgba(255,${Math.round(120 + 100 * pulse)},90,1)`; ctx.fillText(`🚨 ${label} EM ${Math.ceil(secs)}s`, W / 2, 43);
  }

  function drawBanner() {
    if (!banner) return;
    const a = Math.max(0, Math.min(1, (banner.max - banner.life) / 0.3, banner.life / 0.6));
    ctx.globalAlpha = a; ctx.textAlign = 'center';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(banner.t, W / 2 + 1.5, 72 + 1.5);
    ctx.fillStyle = banner.c; ctx.fillText(banner.t, W / 2, 72);
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(banner.sub, W / 2 + 1, 89);
    ctx.fillStyle = '#f2eee0'; ctx.fillText(banner.sub, W / 2, 88);
    ctx.globalAlpha = 1;
  }

  function resize() {
    const r = cv.getBoundingClientRect();
    if (!r.width) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.width * dpr * H / W);
    scale = cv.width / W;
  }

  // ---------- passar o mouse num sobrevivente (de dia): nome, função, talento e uma história curta ----------
  const JOBNAME = { forrageiro: 'Forrageiro', coletor: 'Coletor', armeiro: 'Armeiro', guarda: 'Guarda', medico: 'Médico', cientista: 'Cientista', ocioso: 'Sem função', ferido: 'Ferido' };
  let tipEl = null, tipWho = null;
  function personTip(e) {
    if (!tipEl) {
      tipEl = document.createElement('div'); tipEl.className = 'person-tip hidden';
      cv.parentNode.appendChild(tipEl);
    }
    const hide = () => { tipEl.classList.add('hidden'); tipWho = null; cv.classList.remove('over-person'); };
    if (!e || S.horde.active || paused || typeof Honored === 'undefined') return hide();
    assignNames();
    const p = people.filter(q => !q.hidden && q.who && Math.abs(ptr.x - q.x) <= 4 && ptr.y >= q.y - 20 && ptr.y <= q.y + 1).sort((a, b) => b.y - a.y)[0];
    if (!p) return hide();
    cv.classList.add('over-person');
    if (tipWho !== p.who) {
      tipWho = p.who;
      const t = TRAITS[S.traits[p.who]], h = Honored.byName(p.who);
      tipEl.innerHTML = `<b>${h ? '💬 ' : ''}${escHtml(p.who)}</b><small>${JOBNAME[p.job] || ''}${t ? ` · ${t.icon} ${t.nome}` : ''}</small>
        ${h && h.frases && h.frases.length ? `<q>${escHtml(h.frases[0])}</q>` : ''}<p>${Honored.bio(p.who)}</p>`;
    }
    const r = cv.getBoundingClientRect(), pr = cv.parentNode.getBoundingClientRect();
    const left = e.clientX - pr.left + 14, top = e.clientY - pr.top + 14;
    tipEl.style.left = Math.min(left, pr.width - 250) + 'px';
    tipEl.style.top = Math.min(top, r.bottom - pr.top - 10) + 'px';
    tipEl.classList.remove('hidden');
  }

  function init(canvas) {
    cv = canvas;
    ctx = cv.getContext('2d');
    resize();
    new ResizeObserver(resize).observe(cv);
    listeners.push(on);

    // Mira: de noite o clique atira no ponto mirado (segurar dispara as armas automáticas).
    // De dia o cenário não faz nada: vasculhar fica no botão.
    const toLocal = e => { const r = cv.getBoundingClientRect(); ptr.x = (e.clientX - r.left) / r.width * W; ptr.y = (e.clientY - r.top) / r.height * H; };
    cv.addEventListener('pointermove', e => { toLocal(e); ptr.in = true; personTip(e); });
    cv.addEventListener('pointerleave', () => personTip(null));
    cv.addEventListener('pointerleave', () => { ptr.in = false; ptr.down = false; });
    cv.addEventListener('pointerup', () => { ptr.down = false; });
    cv.addEventListener('pointercancel', () => { ptr.down = false; });
    cv.addEventListener('pointerdown', e => {
      toLocal(e); ptr.in = true;
      if (paused) return;
      if (S.horde.active) { ptr.down = true; Weapons.fire(ptr.x, ptr.y); return; }
      if (!dayHintT) { texts.push({ x: ptr.x, y: ptr.y, t: 'Use o botão 🔍 Vasculhar', c: '#ece6d0', life: 1.2 }); dayHintT = 1.5; }
    });
    cv.addEventListener('wheel', e => {
      if (!S.horde.active) return;
      e.preventDefault();
      Weapons.cycle(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });
  }

  // Pequenos acontecimentos aleatórios: vidro quebrando, entulho caindo, metal batendo...
  let ambienceT = 6;
  function ambienceEvent() {
    if (!dtAlive) return;
    const kinds = ['glass', 'glass', 'debris', 'debris', 'metal', 'creak', 'alarm'];
    if (night > 0.4) kinds.push('shot', 'shot');
    const kind = pick(kinds);
    const b = pick(city.near.filter(x => x.x > 60));
    const x = b.x + rand(2, b.w - 2), top = GY - b.h + Math.max(...b.jag) + 2;
    if (kind === 'glass') {
      // cacos brilhando caindo de uma janela
      const y = top + rand(4, Math.max(6, b.h - 14));
      for (let i = 0; i < 6; i++) parts.push({ x, y, vx: rand(-8, 8), vy: rand(-6, 4), g: 120, life: rand(0.5, 0.9), max: 0.9, c: pick(['#cfe8ff', '#ffffff', '#9fc4e0']), s: 1, floor: GY });
    } else if (kind === 'debris') {
      for (let i = 0; i < 7; i++) parts.push({ x: x + rand(-3, 3), y: top, vx: rand(-6, 6), vy: rand(-4, 2), g: 140, life: rand(0.8, 1.3), max: 1.3, c: pick([[110, 100, 90], [80, 76, 70]]), s: pick([1, 1, 2]), floor: GY });
      for (let i = 0; i < 4; i++) parts.push({ x: x + rand(-4, 4), y: GY - 2, vx: rand(-8, 8), vy: rand(-6, -2), life: rand(1, 1.6), max: 1.6, c: [120, 112, 100], s: 2, a: 0.3, delay: 0.6 });
    }
    emit('ambience', { kind, x });
  }
  let dtAlive = false;

  function update(dt) {
    dtAlive = dt > 0;
    time += dt;
    dayHintT = Math.max(0, dayHintT - dt);
    if (cv) cv.classList.toggle('aiming', S.horde.active && ptr.in);
    if (ptr.down && S.horde.active && dt > 0 && Weapons.isAuto()) Weapons.fire(ptr.x, ptr.y);
    // zumbis em chamas soltam fogo
    if (S.horde.zs) for (const z of S.horde.zs) if (z.burn > 0 && Math.random() < dt * 14)
      parts.push({ x: z.x + rand(-3, 3), y: z.y - rand(4, 16), vx: rand(-4, 4), vy: rand(-22, -10), life: 0.4, max: 0.4, c: pick(['#ffd040', '#ff8a20']), s: 1, glow: '255,140,40' });
    const Hd = S.horde;
    const target = Hd.active ? 1
      : S.waveTimer < 25 ? (25 - S.waveTimer) / 25
      : S.wave > 1 && S.waveTimer > waveInterval() - 10 ? (S.waveTimer - (waveInterval() - 10)) / 10
      : 0;
    night += (target - night) * Math.min(1, dt * 1.5);

    shake = Math.max(0, shake - dt * 12);
    redFlash = Math.max(0, redFlash - dt);
    wallJolt = Math.max(0, wallJolt - dt);
    leaderMuzzle = Math.max(0, leaderMuzzle - dt);
    champMuzzle = Math.max(0, champMuzzle - dt);
    leaderSwap = Math.max(0, leaderSwap - dt);
    for (let k = 0; k < 3; k++) towerMuzzle[k] = Math.max(0, towerMuzzle[k] - dt);
    if (banner && (banner.life -= dt) <= 0) banner = null;
    hordeVis += ((Hd.active && Hd.queue.length ? 1 : 0) - hordeVis) * Math.min(1, dt * 0.8);

    updatePeople(dt);

    for (const p of travelers) {
      if (p.delay > 0) { p.delay -= dt; continue; }
      const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.hypot(dx, dy);
      if (dist < 1) { p.done = true; continue; }
      const st = Math.min(dist, p.speed * dt);
      p.x += dx / dist * st; p.y += dy / dist * st;
      p.face = dx > 0 ? 1 : -1; p.pose = 'carry'; p.phase += dt * 9;
    }
    prune(travelers, p => !p.done);
    for (const p of planes) {
      p.t += dt; p.x += 330 * dt;
      if (Math.random() < dt * 30) parts.push({ x: p.x - 10, y: p.y + 1, vx: rand(-20, -5), vy: rand(-3, 3), life: 0.8, max: 0.8, c: [160, 160, 160], s: 2, a: 0.4 });
    }
    prune(planes, p => p.x < W + 80);
    for (const t of toasts) t.life -= dt;
    prune(toasts, t => t.life > 0);
    for (const f of flashes) f.life -= dt;
    prune(flashes, f => f.life > 0);
    for (const l of later) if ((l.t -= dt) <= 0) l.fn();
    prune(later, l => l.t > 0);

    for (const p of parts) {
      p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.floor && p.y > p.floor) { p.y = p.floor; p.vx *= 0.3; p.vy = 0; }
    }
    prune(parts, p => p.life > 0);
    for (const t of tracers) t.life -= dt;
    prune(tracers, t => t.life > 0);
    for (const t of texts) { t.life -= dt; t.y -= 14 * dt; }
    for (const b of bubbles) b.life -= dt;
    if (repairFx) {
      repairFx.t += dt;
      const hit = Math.floor(repairFx.t / 0.32);
      if (hit > repairFx.hits && repairFx.t < repairFx.dur - 0.2) {
        repairFx.hits = hit;
        const top = GY - 10 - Math.min(S.build.muro, 6) * 3, y = 196 - (196 - top) * Math.min(1, repairFx.t / (repairFx.dur * 0.8)) * 0.9;
        for (let i = 0; i < 6; i++) parts.push({ x: WALL_X - 1, y, vx: rand(-14, 4), vy: rand(-18, 2), g: 70, life: 0.45, max: 0.45, c: pick([[200, 170, 120], [170, 140, 100], [230, 210, 160]]), s: 1 });
        for (let i = 0; i < 2; i++) parts.push({ x: WALL_X - 1, y, vx: rand(-20, -4), vy: rand(-20, -6), life: 0.18, max: 0.18, c: '#fff4b0', s: 1 });
      }
      if (repairFx.t >= repairFx.dur) repairFx = null;
    }
    prune(bubbles, b => b.life > 0);
    prune(texts, t => t.life > 0);
    for (const d of decals) d.life -= dt;
    prune(decals, d => d.life > 0);
    for (const c of corpses) c.t += dt;
    prune(corpses, c => c.t < c.life);
    updateGore(dt);

    const reduce = Settings.get('reduceFx');
    ambienceT -= dt;
    if (ambienceT <= 0) { ambienceT = rand(7, 18); ambienceEvent(); }
    if (Math.random() < dt * (reduce ? 1 : 4)) parts.push({ x: FIRE.x + rand(-1, 1), y: FIRE.y - 8, vx: rand(-2, 3), vy: rand(-12, -7), life: 2, max: 2, c: [130, 130, 130], s: 2, a: 0.35 });
    // efeitos reduzidos: limita partículas e clarões na tela
    if (reduce) {
      if (parts.length > 40) parts.splice(0, parts.length - 40);
      if (flashes.length > 2) flashes.splice(0, flashes.length - 2);
      redFlash = Math.min(redFlash, 0.3);
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.save();
    if (shake > 0 && !Settings.get('noShake')) ctx.translate(rand(-shake, shake), rand(-shake, shake));

    drawSky();
    drawCity();
    drawFlags();
    drawGround();
    drawScenery();
    drawShelter();
    drawTowers();
    drawWall();
    drawDefenses();
    drawDecals();
    drawPools();

    const ents = [];
    for (const p of people) if (!p.hidden) ents.push([p.y, () => drawPerson(p)]);
    for (const p of travelers) ents.push([p.y, () => drawHuman(p.x, p.y, p)]);
    S.meta.heroes.filter(h => S.meta.active.includes(h.id)).forEach((h, i) => {
      const x = 118 + i * 11, y = 186;
      ents.push([y, () => drawHero(h, x, y)]);
    });
    hallNpcs(ents);
    for (const c of corpses) ents.push([c.y - 0.5, () => drawCorpse(c)]);
    for (const p of pieces) ents.push([p.rest ? p.floor - 0.4 : p.y, () => drawPiece(p)]);
    for (const z of S.horde.zs || []) ents.push([z.y, () => drawZombie(z)]);
    ents.sort((a, b) => a[0] - b[0]);
    for (const e of ents) e[1]();

    drawWeather();
    drawFog();
    drawPlanes();
    drawProjectiles();
    drawEffects();
    drawLights();
    drawTexts();
    ctx.restore();

    drawHUD();
    drawReticle();
    drawBossBar();
    drawToasts();
    drawBanner();
    drawAlert();
    if (redFlash > 0) { ctx.fillStyle = `rgba(200,20,20,${redFlash * 0.35})`; ctx.fillRect(0, 0, W, H); }
  }

  // Texto flutuante saindo do líder no telhado (usado pelo botão Vasculhar)
  function float(t) {
    texts.push({ x: LEADER.x + rand(-6, 6), y: LEADER.y - 22, t, c: '#ece6d0', life: 1.3 });
    for (let i = 0; i < 5; i++) parts.push({ x: LEADER.x, y: LEADER.y - 4, vx: rand(-20, 20), vy: rand(-25, -5), g: 60, life: 0.5, max: 0.5, c: [180, 170, 140], s: 1 });
  }


  // ---------- prévias animadas (popup ao passar o mouse em armas, loja e pesquisa) ----------
  // Cada prévia é uma cena curta em loop, calculada só a partir do tempo t (sem estado):
  // zs: zumbis { x0, v (px/s), y, hp, type } · ev: eventos ordenados no instante do impacto
  // ev.k: bullet | pellets | pierce | grenade | rocket | flame | burn | bomb | trap | shock | text
  // ev.z: índices dos zumbis atingidos · ev.d: dano em pontos (número ou lista por zumbi)
  const DW = 200, DH = 90, DWALL = 52, DLX = 30, DLY = 58, DSTOP = DWALL + 9;
  const every = (a, b, step, f) => { const out = []; for (let t = a; t <= b + 1e-9; t += step) out.push(f(+t.toFixed(3), out.length)); return out; };
  const DEMOS = {
    'lw:pistola': { gun: 'pistola', zs: [{ x0: 214, v: 60, y: 80, hp: 16 }],
      ev: [0.9, 1.2, 1.5, 1.8].map(t => ({ t, k: 'bullet', z: [0], d: 4 })), reload: [1.85, 3.35], note: '5 tiros e recarga' },
    'lw:espingarda': { gun: 'espingarda', zs: [{ x0: 160, v: 80, y: 77, hp: 14 }, { x0: 172, v: 80, y: 83, hp: 14 }, { x0: 190, v: 80, y: 79, hp: 20 }],
      ev: [{ t: 1.7, k: 'pellets', z: [0, 1, 2], d: [15, 15, 8] }, { t: 2.3, k: 'pellets', z: [2], d: 15 }], reload: [2.35, 3.4], note: 'devastadora de perto' },
    'lw:rifle': { gun: 'rifle', zs: [{ x0: 150, v: 22, y: 80, hp: 16 }, { x0: 168, v: 22, y: 80, hp: 16 }, { x0: 186, v: 22, y: 80, hp: 24 }],
      ev: [{ t: 1.1, k: 'pierce', z: [0, 1, 2], d: [18, 18, 14] }, { t: 2.3, k: 'bullet', z: [2], d: 18 }], note: 'atravessa a fila' },
    'lw:smg': { gun: 'smg', zs: [{ x0: 150, v: 40, y: 78, hp: 16 }, { x0: 175, v: 40, y: 83, hp: 16 }],
      ev: every(0.9, 2.3, 0.1, (t, i) => ({ t, k: 'bullet', z: [i % 2], d: 2.2, quiet: true })), note: 'segure para atirar' },
    'lw:granadas': { gun: 'granadas', zs: [{ x0: 140, v: 70, y: 78, hp: 16 }, { x0: 152, v: 70, y: 83, hp: 16 }, { x0: 160, v: 70, y: 76, hp: 16 }, { x0: 175, v: 70, y: 81, hp: 40, type: 'tanque' }],
      ev: [{ t: 1.45, k: 'grenade', fly: 0.45, z: [0, 1, 2, 3], d: [10, 10, 9, 8] }, { t: 2.05, k: 'grenade', fly: 0.45, z: [0, 1, 2, 3], d: [10, 9, 10, 8] }],
      reload: [2.1, 3.4], note: '2 granadas, raras' },
    'lw:chamas': { gun: 'chamas', reload: [2.2, 3.4], zs: [{ x0: 110, v: 50, y: 78, hp: 16 }, { x0: 122, v: 50, y: 83, hp: 16 }, { x0: 135, v: 50, y: 80, hp: 16 }],
      ev: [{ t: 1.2, k: 'flame', dur: 0.9, x: 72, z: [0, 1, 2], d: 2 }, ...every(1.4, 2.9, 0.25, t => ({ t, k: 'burn', z: [0, 1, 2], d: 2.4 }))], note: 'combustível raro' },
    'lw:bazuca': { gun: 'bazuca', zs: [0, 1, 2, 3, 4].map(i => ({ x0: 150 + i * 9, v: 55, y: 76 + (i * 3) % 9, hp: 20, type: i === 2 ? 'tanque' : 'normal' })),
      ev: [{ t: 1.4, k: 'rocket', fly: 0.3, z: [0, 1, 2, 3, 4], d: 999, big: true }], reload: [1.5, 3.4], note: '1 foguete, recarga lenta' },
    'shop:aereo': { shooter: 'guard', zs: [0, 1, 2, 3, 4, 5].map(i => ({ x0: 120 + i * 16, v: 25, y: 76 + (i * 5) % 9, hp: 20, type: i === 3 ? 'tanque' : 'normal' })),
      planes: [0.6, 1.7], ev: [0, 1, 2, 3, 4, 5].map(i => ({ t: 1.25 + i * 0.07, k: 'bomb', z: [i], d: 999 })), note: 'todos os zumbis na tela' },
    'shop:furia': { shooter: 'guard', fury: true, zs: [{ x0: 170, v: 45, y: 78, hp: 20 }, { x0: 195, v: 45, y: 83, hp: 20 }],
      ev: every(0.7, 2.2, 0.3, (t, i) => ({ t, k: 'bullet', z: [i < 3 ? 0 : 1], d: 8, col: '255,110,50' })), note: '2x mais rápido, 2x dano' },
    'shop:muro': { zs: [], wall: [0.2, 1.3], ev: [{ t: 1.3, k: 'text', x: DWALL + 3, y: 40, text: 'MURO RESTAURADO', c: '#ffe066' }], note: 'muro inteiro na hora' },
    'tech:perfuracao': { shooter: 'guard', zs: [{ x0: 150, v: 25, y: 80, hp: 20 }, { x0: 168, v: 25, y: 80, hp: 20 }],
      ev: [{ t: 1, k: 'pierce', z: [0, 1], d: [10, 6] }, { t: 1.9, k: 'pierce', z: [0, 1], d: [10, 6] }, { t: 2.8, k: 'bullet', z: [1], d: 10 }], note: 'o 2º leva 60% do dano' },
    'tech:pontaoca': { shooter: 'guard', zs: [{ x0: 170, v: 35, y: 80, hp: 30 }],
      ev: [{ t: 1, k: 'bullet', z: [0], d: 10 }, { t: 1.7, k: 'bullet', z: [0], d: 20, crit: true }], note: 'dano dobrado' },
    'tech:armadilhas': { zs: [{ x0: 150, v: 45, y: 79, hp: 16 }, { x0: 175, v: 45, y: 83, hp: 16 }, { x0: 200, v: 45, y: 77, hp: 16 }], traps: [92, 74],
      ev: [0, 1, 2].flatMap(i => [92, 74].map(x => ({ t: +((150 + i * 25 - x) / 45).toFixed(2), k: 'trap', x, z: [i], d: 5 }))).sort((a, b) => a.t - b.t), note: 'dano ao se aproximar' },
    'tech:eletrico': { zs: [{ x0: 110, v: 60, y: 78, hp: 16 }, { x0: 125, v: 60, y: 83, hp: 16 }], fence: true,
      ev: every(1.2, 3.0, 0.3, t => ({ t, k: 'shock', z: [0, 1], d: 3 })), note: 'choque em quem ataca o muro' },
  };
  Object.assign(DEMOS, champDemos());
  for (const s of Object.values(DEMOS)) s.ev.sort((a, b) => a.t - b.t);

  // Prévias dos heróis de campo (chave ch:herói:basic|act|sup). Eventos próprios:
  // hbolt (raio em cadeia) · sky (raios do céu) · beam (laser/raio reto; far: atravessa a tela) · proj (faca, pedra, palheta)
  // orbital (feixe do céu + explosão) · abduct (disco voador) · tractor (ergue e derruba) · banner (nome da habilidade)
  // stun / hypno / riff / confuse (hold: o zumbi fica parado por dur) · tick (dano da confusão, sem número)
  function champDemos() {
    const out = {}, Z = (x0, v, y, hp, type) => ({ x0, v, y, hp, type });
    const add = (k, slot, spec) => { out[`ch:${k}:${slot}`] = { hero: k, col: CHAMPS[k].color, ...spec }; };
    const ban = (t, k, slot) => ({ t, k: 'banner', text: `${CHAMPS[k].skills[slot].icon} ${CHAMPS[k].skills[slot].nome.toUpperCase()}` });
    const six = (x0, v) => [0, 1, 2, 3, 4, 5].map(i => Z(x0 + i * 17, v, 76 + (i * 5) % 10, i === 3 ? 30 : 16, i === 3 ? 'tanque' : 'normal'));
    const all6 = [0, 1, 2, 3, 4, 5];

    add('profeta', 'basic', { zs: [Z(150, 30, 78, 20), Z(164, 30, 84, 20), Z(180, 30, 80, 20)],
      ev: [{ t: 1, k: 'hbolt', z: [0, 1], d: [12, 8] }, { t: 2.5, k: 'hbolt', z: [0, 1], d: [12, 8] }], note: 'raio que salta entre zumbis' });
    add('profeta', 'act', { zs: [Z(140, 25, 80, 60, 'tanque'), Z(156, 25, 76, 16), Z(166, 25, 84, 16), Z(178, 25, 79, 16)],
      ev: [{ t: 1.3, k: 'hbolt', z: [0, 1, 2, 3], d: [40, 25, 25, 25], cast: true }, ban(1.3, 'profeta', 'act')], note: 'o mais resistente leva ×4' });
    add('profeta', 'sup', { dur: 3.8, zs: six(110, 22),
      ev: [{ t: 1.4, k: 'sky', z: all6, d: 999, cast: true }, ban(1.2, 'profeta', 'sup')], note: 'todos os comuns da tela' });

    add('x9', 'basic', { zs: [Z(170, 28, 80, 30)], ev: [0.8, 1.9, 3].map(t => ({ t, k: 'beam', z: [0], d: 10, c: '255,90,90', w: 1 })), note: 'laser' });
    add('x9', 'act', { zs: [Z(120, 30, 80, 16), Z(138, 30, 80, 16), Z(158, 30, 80, 16), Z(180, 30, 80, 30, 'tanque')],
      ev: [{ t: 1.3, k: 'beam', z: [0, 1, 2, 3], d: 48, c: '255,90,90', w: 3, far: true, dur: 0.35, cast: true }, ban(1.3, 'x9', 'act')], note: 'atravessa a faixa inteira' });
    add('x9', 'sup', { dur: 3.8, zs: six(110, 18),
      ev: [[0, 1], [2], [3, 4], [5]].map((z, i) => ({ t: 1.4 + i * 0.35, k: 'orbital', z, d: 999, cast: i === 0 })).concat([ban(1.1, 'x9', 'sup')]), note: 'explosões varrem o campo' });

    add('bilu', 'basic', { zs: [Z(165, 30, 80, 16)], ev: [0.8, 1.7, 2.6].map(t => ({ t, k: 'proj', z: [0], d: 6, fly: 0.25, c: '#dcdce4' })), note: 'facas de circo' });
    add('bilu', 'act', { zs: [Z(105, 40, 78, 16), Z(115, 40, 84, 16), Z(125, 40, 80, 16), Z(200, 30, 80, 16)],
      ev: [{ t: 1.3, k: 'stun', hold: true, z: [0, 1, 2], dur: 1.8, cast: true }, ban(1.3, 'bilu', 'act')], note: 'atordoa quem está no muro' });
    add('bilu', 'sup', { dur: 3.8, zs: six(115, 28),
      ev: [{ t: 1.1, k: 'hypno', hold: true, z: all6, dur: 2.4, cast: true }, ban(1.1, 'bilu', 'sup')], note: 'a horda inteira parada' });

    add('imune', 'basic', { zs: [Z(170, 28, 80, 20)], ev: [1, 2.4].map(t => ({ t, k: 'proj', z: [0], d: 8, fly: 0.45, arc: 12, c: '#8a8070' })), note: 'pedradas' });
    add('imune', 'act', { zs: [Z(130, 30, 78, 16), Z(140, 30, 84, 16), Z(150, 30, 80, 16), Z(195, 30, 80, 16)],
      ev: [{ t: 1, k: 'confuse', hold: true, z: [0, 1, 2], dur: 2.2, cast: true }, ban(1, 'imune', 'act'),
        ...every(1.3, 3.0, 0.35, t => ({ t, k: 'tick', z: [0, 1, 2], d: 2.6, quiet: true }))], note: 'o grupo se ataca' });
    add('imune', 'sup', { dur: 3.8, zs: six(115, 26),
      ev: [{ t: 1, k: 'confuse', hold: true, z: all6, dur: 2.5, cast: true }, ban(1, 'imune', 'sup'),
        ...every(1.3, 3.3, 0.35, t => ({ t, k: 'tick', z: all6, d: 2.6, quiet: true }))], note: 'todos os comuns lutam entre si' });

    add('waldir', 'basic', { zs: [Z(170, 28, 80, 24)], ev: [0.9, 2.3].map(t => ({ t, k: 'beam', z: [0], d: 12, c: '120,255,140', w: 1.6 })), note: 'raio de outro mundo' });
    add('waldir', 'act', { zs: [Z(130, 22, 80, 40, 'tanque'), Z(150, 25, 76, 16), Z(165, 25, 84, 16)],
      ev: [{ t: 1.9, k: 'tractor', hold: true, pre: 0.8, z: [0], d: 999, cast: true }, ban(1.1, 'waldir', 'act')], note: 'ergue e derruba o mais forte' });
    // o disco passa da esquerda para a direita (x = 4 + 70t) e abduz cada zumbi (x0 - 12t) quando está sobre ele
    const wz = [110, 130, 150, 170, 190];
    add('waldir', 'sup', { dur: 3.6, ufo: { t0: 0.5, t1: 3.1, x0: 4, v: 70 }, zs: wz.map((x, i) => Z(x, 12, 76 + (i * 5) % 10, 16)),
      ev: wz.map((x, i) => ({ t: +((x - 4) / 82).toFixed(2), k: 'abduct', z: [i], d: 999, cast: i === 0 })).concat([ban(0.8, 'waldir', 'sup')]), note: 'abduz os zumbis comuns' });

    add('ze', 'basic', { zs: [Z(165, 30, 80, 16)], ev: every(0.8, 3.2, 0.8, t => ({ t, k: 'proj', z: [0], d: 4, fly: 0.2, c: '#ff8c3c' })), note: 'palhetas' });
    add('ze', 'act', { zs: [Z(100, 40, 78, 16), Z(110, 40, 84, 16), Z(122, 40, 80, 16), Z(200, 30, 80, 16)],
      ev: [{ t: 1.2, k: 'riff', hold: true, z: [0, 1, 2], dur: 1.8, cast: true }, ban(1.2, 'ze', 'act')], note: 'atordoa quem está no muro' });
    add('ze', 'sup', { zs: [Z(95, 40, 78, 16), Z(105, 40, 84, 16), Z(115, 40, 80, 30, 'tanque'), Z(175, 30, 77, 16), Z(195, 30, 83, 16)],
      ev: [{ t: 1.3, k: 'riff', big: true, z: [0, 1, 2], d: 999, cast: true }, ban(1.3, 'ze', 'sup')], note: 'derruba quem está no muro' });
    return out;
  }

  const demoT = spec => spec.dur || 3.4;
  // vida, morte e posição de cada zumbi no instante t
  function demoState(spec, t) {
    return spec.zs.map((z, i) => {
      let hp = z.hp, dead = null, hit = -9, burn = false, dmg = [], by = null;
      // janelas em que o zumbi fica parado (atordoado, hipnotizado, confuso, erguido pelo raio trator)
      const holds = spec.ev.filter(e => e.hold && e.z && e.z.includes(i)).map(e => [e.t - (e.pre || 0), e.t + (e.dur || 0), e.k]);
      for (const e of spec.ev) {
        if (e.t > t) break;
        const j = e.z ? e.z.indexOf(i) : -1;
        if (j < 0 || dead !== null) continue;
        const d = Array.isArray(e.d) ? e.d[j] : e.d;
        if (!d) continue;
        hp -= d; hit = e.t;
        if (e.k === 'flame' || e.k === 'burn') burn = true;
        if (e.k !== 'burn' && e.k !== 'flame' && !e.quiet && d < 900) dmg.push({ t: e.t, d, crit: e.crit });
        if (hp <= 0) { dead = e.t; by = e.k; }
      }
      const tt = dead !== null ? dead : t;
      const still = holds.reduce((a, [h0, h1]) => a + Math.max(0, Math.min(h1, tt) - Math.max(h0, 0)), 0);
      const x = Math.max(DSTOP + (i % 3) * 5, z.x0 - z.v * (tt - still));
      const held = dead === null ? holds.find(([h0, h1]) => t >= h0 && t < h1) : null;
      return { ...z, i, hp: Math.max(0, hp), dead, by, hit, burn, dmg, x, atWall: x <= DSTOP + (i % 3) * 5 + 0.01,
        held: held ? held[2] : null, heldAge: held ? t - held[0] : 0 };
    });
  }
  // ponto onde caem a granada, o foguete e as bombas: centro dos atingidos no instante do impacto
  function demoAim(spec, e) {
    if (e.x != null) return { x: e.x, y: e.y ?? 74 };
    const zs = demoState(spec, e.t - 0.001).filter((z, i) => e.z.includes(i));
    return { x: zs.reduce((a, z) => a + z.x, 0) / zs.length, y: zs.reduce((a, z) => a + z.y, 0) / zs.length - 6 };
  }

  function demoBackground() {
    for (let y = 0; y < 66; y += 6) rect(mix([40, 30, 70], [150, 80, 110], y / 66), 0, y, DW, 6);
    for (let i = 0; i < 9; i++) rect([46, 36, 72], i * 24 + 6, 30 + (i * 7) % 18, 18, 40);
    rect([66, 62, 70], 0, 66, DW, 24);
    for (let x = 60; x < DW; x += 22) rect([150, 140, 110], x, 86, 10, 1);
  }
  function demoWall(spec, t) {
    let hpFrac = 1;
    if (spec.wall) hpFrac = t < spec.wall[1] ? 0.2 : 1;
    rect([110, 80, 50], DWALL, 46, 7, 40);
    for (let y = 48; y < 86; y += 4) rect([90, 64, 40], DWALL, y, 7, 1);
    if (hpFrac < 1) {   // muro rachado
      rect([40, 30, 26], DWALL + 2, 52, 1, 8); rect([40, 30, 26], DWALL + 3, 60, 1, 6); rect([40, 30, 26], DWALL + 1, 70, 2, 1);
    }
    if (spec.fence) {
      ctx.strokeStyle = 'rgba(200,200,210,0.8)'; ctx.lineWidth = 0.6;
      for (const y of [56, 64, 72]) { ctx.beginPath(); ctx.moveTo(DWALL + 7, y); ctx.lineTo(DWALL + 11, y); ctx.stroke(); }
      rect([120, 120, 130], DWALL + 11, 52, 1, 30);
    }
    if (spec.wall) {
      const shown = t < spec.wall[1] ? 0.2 : Math.min(1, 0.2 + (t - spec.wall[1]) * 3);
      rect('#141414', DWALL - 8, 40, 23, 3);
      ctx.fillStyle = shown < 0.4 ? '#e05a4f' : '#7cc96b'; ctx.fillRect(DWALL - 8, 40, 23 * shown, 3);
      if (t > spec.wall[1] && t < spec.wall[1] + 0.8)
        for (let k = 0; k < 10; k++) rect('#ffe066', DWALL + ((k * 37 + Math.floor(t * 20) * 13) % 9) - 1, 48 + (k * 11 + Math.floor(t * 20) * 7) % 36, 1, 1);
    }
  }
  function demoShooter(spec, t) {
    rect([122, 90, 48], DLX - 8, DLY, 16, 28); rect([90, 64, 32], DLX - 8, DLY, 16, 2);   // caixotes
    const fired = spec.ev.some(e => e.t - (e.fly || 0) <= t && t - (e.t - (e.fly || 0)) < 0.06 && ['bullet', 'pellets', 'pierce', 'grenade', 'rocket', 'proj', 'beam', 'hbolt'].includes(e.k));
    if (spec.hero) {
      // brilho na cor do herói ao usar a habilidade
      const cast = spec.ev.find(e => e.cast && t >= e.t - (e.pre || 0) - 0.4 && t < e.t + 0.3);
      if (cast) { ctx.fillStyle = `rgba(${spec.col},0.3)`; ctx.beginPath(); ctx.arc(DLX, DLY - 10, 13, 0, 7); ctx.fill(); }
      drawLook(DLX, DLY, CHAMPS[spec.hero].look, { pose: 'aim', face: 1, phase: 0 });
    } else if (spec.shooter === 'guard') {
      drawHuman(DLX, DLY, { pose: 'aim', face: 1, phase: 0, skin: [200, 150, 110], hair: [40, 30, 20], ...JOBLOOK.guarda });
      if (spec.fury) { ctx.fillStyle = 'rgba(255,90,40,0.25)'; ctx.beginPath(); ctx.arc(DLX, DLY - 9, 11, 0, 7); ctx.fill(); }
    } else drawLook(DLX, DLY, Profile.look(), { pose: 'aim', face: 1, phase: 0, gun: spec.gun });
    const tip = demoTip(spec);
    if (fired) { rect('#fff4b0', tip.x, tip.y - 1, 3, 3); }
    if (spec.reload && t >= spec.reload[0] && t <= spec.reload[1]) {
      const f = (t - spec.reload[0]) / (spec.reload[1] - spec.reload[0]);
      ctx.strokeStyle = 'rgba(150,190,255,0.95)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(DLX, DLY - 24, 4, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
      ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#aaccff'; ctx.fillText('recarregando', DLX + 7, DLY - 22);
    }
  }
  // raio em zigue-zague entre dois pontos
  function zig(x1, y1, x2, y2, col) {
    ctx.strokeStyle = `rgba(${col},0.95)`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    for (let s = 1; s < 5; s++) ctx.lineTo(x1 + (x2 - x1) * s / 5 + (s % 2 ? 2 : -2), y1 + (y2 - y1) * s / 5 + (s % 2 ? -2 : 2));
    ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.4; ctx.stroke();
  }
  const ufoAt = (spec, t) => ({ x: spec.ufo.x0 + spec.ufo.v * t, y: 14 + Math.sin(t * 5) * 1.5 });
  const demoTip = spec => {
    const g = spec.gun && GUNS[spec.gun] ? GUNS[spec.gun].tip : [9, -11];
    return { x: DLX + g[0], y: DLY + g[1] };
  };
  function demoZombie(z, t) {
    const L = zlook({ id: 9000 + z.i * 7, type: z.type || 'normal' });
    if (z.dead !== null && z.by === 'abduct') {   // sobe para o disco voador, encolhendo
      const age = t - z.dead;
      if (age > 0.7) return;
      drawHuman(z.x, z.y - age * 55, { ...L, alpha: 1 - age / 0.7, scale: (L.scale || 1) * (1 - age * 0.6), pose: 'zwalk', phase: z.i });
      return;
    }
    if (z.dead !== null) {
      const age = t - z.dead, a = age > 1.2 ? Math.max(0, 1 - (age - 1.2) / 0.6) : 1;
      if (a <= 0) return;
      drawHuman(z.x, z.y, { ...L, rot: Math.PI / 2 * 0.95, alpha: a, pose: 'stand' });
      return;
    }
    const frozen = z.held && z.held !== 'confuse';   // confusos continuam se mexendo (atacando uns aos outros)
    L.pose = frozen ? 'zwalk' : z.atWall || z.held ? 'zattack' : 'zwalk';
    L.phase = frozen ? z.i : t * (z.atWall || z.held ? 4 : z.v * 0.3) + z.i;
    L.flash = t - z.hit < 0.08;
    const lift = z.held === 'tractor' ? Math.min(14, z.heldAge * 22) : 0;
    drawHuman(z.x, z.y - lift, L);
    const top = z.y - lift - 19 * (L.scale || 1);
    if (z.held === 'stun' || z.held === 'hypno' || z.held === 'riff') stars(z.x, top - 2, 4);
    if (z.held === 'confuse') demoText(z.x, top - 1, '?!', '#d0a0ff', 0.1, 1);
    if (z.burn) for (let k = 0; k < 3; k++) rect(pick(['#ffd040', '#ff8a20', '#ff5020']), z.x - 3 + Math.random() * 6, z.y - 6 - Math.random() * 12, 1, 2);
    if (z.hp < z.hp0) {
      const by = z.y - 19 * (L.scale || 1) - 3;
      rect('#141414', z.x - 6, by, 12, 2);
      ctx.fillStyle = '#e05a4f'; ctx.fillRect(z.x - 6, by, 12 * z.hp / z.hp0, 2);
    }
  }
  function demoBoom(x, y, age, big) {
    if (age < 0 || age > 0.5) return;
    const r = (big ? 26 : 16) * Math.min(1, age / 0.15), a = 1 - age / 0.5;
    ctx.fillStyle = `rgba(255,180,60,${0.6 * a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,240,180,${0.8 * a})`; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 7); ctx.fill();
  }
  function demoText(x, y, s, c, age, dur = 0.7) {
    if (age < 0 || age > dur) return;
    ctx.globalAlpha = 1 - age / dur;
    ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#000'; ctx.fillText(s, x + 0.5, y - age * 10 + 0.5);
    ctx.fillStyle = c; ctx.fillText(s, x, y - age * 10);
    ctx.globalAlpha = 1;
  }
  function demoEffects(spec, zs, t) {
    const tip = spec.shooter === 'guard' ? { x: DLX + 9, y: DLY - 11 } : demoTip(spec);
    const at = i => zs[i];
    for (const e of spec.ev) {
      const age = t - e.t;
      // efeitos que começam antes do impacto: projétil em voo, raio trator, feixe do disco, feixe orbital e as notas
      const lead = e.fly || e.pre || { abduct: 0.4, orbital: 0.3, riff: 0.2 }[e.k] || 0;
      if (age < -lead - 0.01 || age > 1.4) continue;
      const col = e.col || '255,250,200';
      const line = (x, y) => { ctx.strokeStyle = `rgba(${col},0.9)`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(x, y); ctx.stroke(); };
      switch (e.k) {
        case 'bullet': if (age >= 0 && age < 0.06) { const z = at(e.z[0]); line(z.x, z.y - 10); } break;
        case 'pellets': if (age >= 0 && age < 0.07) { for (const i of e.z) line(at(i).x, at(i).y - 9); line(at(e.z[0]).x + 14, 70); line(at(e.z[0]).x + 10, 88); } break;
        case 'pierce': if (age >= 0 && age < 0.09) { const far = at(e.z[e.z.length - 1]); line(far.x + 8, far.y - 10); } break;
        case 'grenade': case 'rocket': {
          const p = demoAim(spec, e);
          if (age < 0) {
            const f = 1 + age / e.fly, x = tip.x + (p.x - tip.x) * f;
            const y = tip.y + (p.y - tip.y) * f - (e.k === 'grenade' ? Math.sin(f * Math.PI) * 18 : 0);
            rect(e.k === 'rocket' ? [200, 200, 190] : [60, 70, 40], x - 1, y - 1, 3, 2);
            if (e.k === 'rocket') rect('#ff9a30', x - 4, y - 1, 3, 2);
          } else demoBoom(p.x, p.y, age, e.big);
          break;
        }
        case 'flame':
          if (age >= 0 && age <= e.dur) for (let k = 0; k < 14; k++) {
            const f = ((k * 0.13 + t * 3) % 1), x = tip.x + (e.x + 12 - tip.x) * f, y = tip.y + (82 - tip.y) * f + Math.sin(k * 7 + t * 20) * 4 * f;
            rect(pick(['#ffd040', '#ff8a20', '#ff5020']), x, y, 2, 2);
          }
          break;
        case 'bomb': { const z = at(e.z[0]); demoBoom(z.x, z.y - 6, age, false); break; }
        case 'trap': if (age >= 0 && age < 0.3) for (let k = 0; k < 4; k++) rect('#ffd060', e.x - 2 + k, 84 - k % 2 * 3, 1, 1); break;
        case 'shock':
          if (age >= 0 && age < 0.12) for (const i of e.z) {
            const z = at(i); if (z.dead !== null && z.dead < e.t) continue;
            ctx.strokeStyle = 'rgba(160,220,255,0.95)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(DWALL + 11, z.y - 12);
            for (let s = 1; s <= 4; s++) ctx.lineTo(DWALL + 11 + (z.x - DWALL - 11) * s / 4, z.y - 12 + (s % 2 ? -3 : 3));
            ctx.stroke();
          }
          break;
        case 'text': demoText(e.x, e.y, e.text, e.c, age, 1.2); break;
        // ---- heróis de campo
        case 'hbolt':
          if (age >= 0 && age < 0.2) { let p = tip; for (const i of e.z) { const z = at(i); zig(p.x, p.y, z.x, z.y - 10, spec.col); p = { x: z.x, y: z.y - 10 }; } }
          break;
        case 'sky':
          if (age >= 0 && age < 0.25) for (const i of e.z) { const z = at(i); zig(z.x + ((i * 13) % 20) - 10, 0, z.x, z.y - 10, spec.col); }
          break;
        case 'beam': {
          const dur = e.dur || 0.08;
          if (age < 0 || age > dur) break;
          // far: desce até o primeiro zumbi e segue reto pela faixa até o fim da tela
          const z = at(e.z[0]), a = 1 - age / dur, zy0 = z.y - 10;
          const path = () => { ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(z.x, zy0); if (e.far) ctx.lineTo(DW, zy0); };
          ctx.strokeStyle = `rgba(${e.c},${0.35 * a})`; ctx.lineWidth = e.w * 3; path(); ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${0.9 * a})`; ctx.lineWidth = Math.max(0.6, e.w * 0.6); path(); ctx.stroke();
          break;
        }
        case 'proj': {
          if (age >= 0 || age < -e.fly) break;
          const z = at(e.z[0]), f = 1 + age / e.fly;
          const x = tip.x + (z.x - tip.x) * f, y = tip.y + (z.y - 10 - tip.y) * f - (e.arc ? Math.sin(f * Math.PI) * e.arc : 0);
          rect(e.c, x - 1, y - 1, 3, 2);
          break;
        }
        case 'orbital': {
          const z = at(e.z[0]);
          if (age >= -0.3 && age < 0) { ctx.fillStyle = `rgba(${spec.col},${0.5 + (age + 0.3)})`; ctx.fillRect(z.x - 1, 0, 2, z.y - 4); }
          demoBoom(z.x, z.y - 6, age, true);
          break;
        }
        case 'abduct': {
          const z = at(e.z[0]), u = ufoAt(spec, e.t);
          if (age >= -0.4 && age < 0.5) {
            ctx.fillStyle = `rgba(${spec.col},0.28)`;
            ctx.beginPath(); ctx.moveTo(u.x - 3, u.y + 3); ctx.lineTo(u.x + 3, u.y + 3); ctx.lineTo(z.x + 9, z.y + 2); ctx.lineTo(z.x - 9, z.y + 2); ctx.closePath(); ctx.fill();
          }
          break;
        }
        case 'tractor': {
          const z = at(e.z[0]);
          if (age >= -e.pre && age < 0) {
            ctx.strokeStyle = `rgba(${spec.col},0.6)`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(z.x, z.y - 12 - Math.min(14, (age + e.pre) * 22)); ctx.stroke();
          }
          if (age >= 0 && age < 0.3) demoBoom(z.x, z.y - 2, age, false);
          break;
        }
        case 'stun':   // chicote do domador
          if (age >= 0 && age < 0.2) {
            const z = at(e.z[1] ?? e.z[0]);
            ctx.strokeStyle = 'rgba(120,80,40,0.95)'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.quadraticCurveTo((tip.x + z.x) / 2, tip.y - 20, z.x, z.y - 12); ctx.stroke();
          }
          if (age >= 0) demoText(at(e.z[0]).x + 6, 46, 'ESTALO!', '#ffe066', age, 0.7);
          break;
        case 'hypno': case 'confuse':
          if (age >= 0 && age < 0.8) {
            ctx.strokeStyle = `rgba(${spec.col},${0.8 * (1 - age / 0.8)})`; ctx.lineWidth = 1;
            const cx = e.z.reduce((a, i) => a + at(i).x, 0) / e.z.length;
            for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.ellipse(cx, 74, age * 90 + r * 10, age * 30 + r * 4, 0, 0, 7); ctx.stroke(); }
          }
          break;
        case 'riff':
          if (age >= -0.2 && age < 0.9) for (let n = 0; n < (e.big ? 10 : 6); n++) {
            const f = ((age + 0.2) * 1.1 + n * 0.13) % 1;
            demoText(tip.x + f * (e.big ? 90 : 60), tip.y - 4 + Math.sin(n * 2 + f * 9) * 6, n % 2 ? '♪' : '♫', `rgb(${spec.col})`, 0.05, 1);
          }
          if (age >= 0 && age < 0.4) {
            ctx.strokeStyle = `rgba(${spec.col},${0.8 * (1 - age / 0.4)})`; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(DWALL + 4, 70, 8 + age * (e.big ? 120 : 70), -1.2, 1.2); ctx.stroke();
          }
          break;
        case 'banner':
          if (age >= 0 && age < 1.4) {
            ctx.globalAlpha = Math.min(1, (1.4 - age) * 3);
            ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(DW / 2 - 64, 14, 128, 13);
            ctx.fillStyle = `rgb(${spec.col})`; ctx.fillText(e.text, DW / 2, 24);
            ctx.globalAlpha = 1;
          }
          break;
      }
    }
    if (spec.ufo && t >= spec.ufo.t0 && t < spec.ufo.t1) {   // disco voador do Seu Waldir
      const u = ufoAt(spec, t);
      ctx.fillStyle = '#9aa6b0'; ctx.beginPath(); ctx.ellipse(u.x, u.y, 11, 3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(${spec.col},0.85)`; ctx.beginPath(); ctx.ellipse(u.x, u.y - 2, 5, 3, 0, Math.PI, 0); ctx.fill();
      for (let k = -1; k <= 1; k++) rect((Math.floor(t * 8) + k) % 2 ? '#ffe066' : '#ffffff', u.x + k * 6, u.y + 1, 1, 1);
    }
    // números de dano
    for (const z of zs) for (const h of z.dmg) {
      const age = t - h.t;
      demoText(z.x + 4, z.y - 22 - (z.i % 3) * 7, h.crit ? `-${h.d} CRÍTICO!` : `-${h.d}`, h.crit ? '#ffa040' : '#ffe9a0', age, 0.6);
    }
    if (spec.traps) for (const x of spec.traps) { rect([110, 110, 120], x - 3, 84, 7, 1); for (let k = 0; k < 3; k++) rect([170, 170, 180], x - 2 + k * 2, 82, 1, 2); }
    if (spec.planes && t > spec.planes[0] && t < spec.planes[1]) {
      const f = (t - spec.planes[0]) / (spec.planes[1] - spec.planes[0]);
      for (const [dx, y] of [[0, 14], [-24, 22]]) {
        const x = -30 + (DW + 60) * f + dx;
        rect([70, 76, 70], x - 9, y, 18, 3); rect([60, 66, 60], x - 3, y - 3, 6, 9); rect([60, 66, 60], x - 9, y - 2, 3, 3);
      }
    }
  }

  // Desenha a prévia `key` no canvas c, no instante t (em loop)
  function demo(c, key, t) {
    const spec = DEMOS[key];
    if (!spec) return false;
    t %= demoT(spec);
    const oc = ctx, on = night;
    ctx = c.getContext('2d'); night = 0;
    const k = c.width / DW;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;
    demoBackground();
    demoWall(spec, t);
    const zs = demoState(spec, t).map((z, i) => ({ ...z, hp0: spec.zs[i].hp }));
    demoShooter(spec, t);
    for (const z of [...zs].sort((a, b) => a.y - b.y)) demoZombie(z, t);
    demoEffects(spec, zs, t);
    if (spec.note) {
      ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(DW - ctx.measureText(spec.note).width - 8, 2, ctx.measureText(spec.note).width + 6, 9);
      ctx.fillStyle = '#efe6c0'; ctx.fillText(spec.note, DW - 5, 9);
    }
    ctx = oc; night = on;
    return true;
  }
  const hasDemo = key => !!DEMOS[key];

  // contagem das marcas no chão (usada nos testes e no debug)
  const marks = () => ({ corpses: corpses.length, kept: corpses.filter(c => c.kept).length, blood: decals.filter(d => !d.c).length, keptBlood: decals.filter(d => d.kept).length, pieces: pieces.length });
  return { init, update, draw, float, gunTip, portrait, demo, hasDemo, marks, restyle };
})();
