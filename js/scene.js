'use strict';

// Cena animada em pixel art desenhada no canvas.
const Scene = (() => {
  const { W, H, GY, WALL_X } = WORLD;
  const FIRE = { x: 100, y: 176 };
  const TOWER_TOP = 124;
  const LEADER = { x: 52, y: 99 };

  let cv, ctx, scale = 1, time = 0, night = 0;
  let shake = 0, redFlash = 0, wallJolt = 0, leaderMuzzle = 0;
  const towerMuzzle = [0, 0, 0];
  const parts = [], decals = [], tracers = [], texts = [], corpses = [], people = [], lights = [];
  const travelers = [], flashes = [], planes = [], toasts = [];
  let hordeVis = 0;
  const hitAt = new Map();
  let banner = null, pid = 1;
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
  const GUNS = {
    pistola: { tip: [8, -11], draw(R, o, dy) {
      R(o.shirt, 0, -10 + dy, 5, 2);                                  // braço esticado
      R(G_DARK, 5, -11 + dy, 3, 1); R(G_STEEL, 5, -12 + dy, 2, 1);    // cano e ferrolho
      R(o.skin, 5, -10 + dy, 1, 2); R(G_DARK, 6, -10 + dy, 1, 1);     // mão no cabo
    } },
    espingarda: { tip: [12, -11], draw(R, o, dy) {
      R(G_WOOD, -1, -10 + dy, 3, 2);                                  // coronha
      R(G_DARK, 2, -11 + dy, 3, 2);                                   // caixa
      R(G_STEEL, 5, -11 + dy, 7, 1); R(G_DARK, 5, -10 + dy, 5, 1);    // cano duplo
      R(G_WOOD, 7, -10 + dy, 2, 1);                                   // telha (pump)
      R(o.shirt, 0, -10 + dy, 3, 2); R(o.skin, 7, -9 + dy, 2, 1);     // braços: gatilho e telha
    } },
    rifle: { tip: [13, -11], draw(R, o, dy) {
      R(G_WOOD, -1, -10 + dy, 4, 2); R(G_WOOD, 3, -11 + dy, 4, 1);    // coronha e guarda-mão de madeira
      R(G_DARK, 7, -11 + dy, 6, 1);                                   // cano longo
      R(G_DARK, 3, -13 + dy, 4, 1); R(G_STEEL, 4, -12 + dy, 1, 1); R([150, 200, 230], 7, -13 + dy, 1, 1);   // luneta
      R(o.shirt, 0, -10 + dy, 3, 2); R(o.skin, 6, -10 + dy, 1, 1);
    } },
    smg: { tip: [10, -11], draw(R, o, dy) {
      R(G_DARK, -1, -11 + dy, 2, 1);                                  // coronha de arame
      R(G_DARK, 1, -11 + dy, 6, 2); R(G_STEEL, 7, -11 + dy, 3, 1);    // corpo e cano curto
      R(G_DARK, 4, -9 + dy, 1, 3);                                    // pente
      R(o.shirt, 0, -10 + dy, 3, 2); R(o.skin, 3, -9 + dy, 1, 1); R(o.skin, 6, -10 + dy, 1, 1);
    } },
    granadas: { tip: [11, -11], draw(R, o, dy) {
      R(G_DARK, -1, -10 + dy, 2, 1);                                  // coronha
      R(G_OLIVE, 1, -12 + dy, 9, 3);                                  // tubo grosso
      R(shade(G_OLIVE, 0.7), 3, -12 + dy, 3, 3);                      // tambor
      R(G_DARK, 10, -12 + dy, 1, 3);                                  // boca
      R(o.shirt, 0, -10 + dy, 2, 2); R(o.skin, 2, -9 + dy, 1, 2); R(o.skin, 7, -9 + dy, 1, 1);
    } },
    chamas: { tip: [11, -11], draw(R, o, dy) {
      R([170, 40, 30], -5, -13 + dy, 2, 7); R([120, 26, 20], -5, -13 + dy, 2, 1);   // tanque nas costas
      R(G_DARK, -3, -8 + dy, 3, 1);                                   // mangueira
      R(G_STEEL, 1, -11 + dy, 8, 2); R(G_DARK, 9, -11 + dy, 2, 1);    // lança e bico
      R(G_DARK, 3, -9 + dy, 1, 2);                                    // cabo
      R(o.shirt, 0, -10 + dy, 3, 2); R(o.skin, 3, -10 + dy, 1, 1);
      R(Math.random() < 0.5 ? [255, 160, 40] : [255, 220, 90], 11, -11 + dy, 1, 1);   // chama-piloto
    } },
    bazuca: { tip: [15, -13], draw(R, o, dy) {
      R(shade(G_OLIVE, 0.7), -6, -14 + dy, 3, 3);                     // traseira, saindo atrás da cabeça
      R(G_OLIVE, 3, -14 + dy, 10, 3);                                 // tubo no ombro, à frente do rosto
      R(shade(G_OLIVE, 0.7), 13, -15 + dy, 2, 5);                     // boca
      R(G_DARK, 6, -16 + dy, 2, 2);                                   // mira
      R(G_DARK, 3, -11 + dy, 1, 2); R(G_DARK, 6, -11 + dy, 1, 2);     // empunhaduras
      R(o.shirt, 0, -10 + dy, 3, 2); R(o.skin, 3, -10 + dy, 1, 1); R(o.skin, 6, -10 + dy, 1, 1);
    } },
  };
  let leaderSwap = 0;   // anima a troca de arma (abaixa e levanta)
  const leaderGun = () => (S.horde.active ? Weapons.current() : null);
  const gunTip = () => { const g = GUNS[leaderGun()]; const t = g ? g.tip : [9, -11]; return { x: LEADER.x + t[0], y: LEADER.y + t[1] }; };

  function drawHuman(x, y, o) {
    const s = o.scale || 1;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale((o.face || 1) * s, s);
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
    const shoe = [40, 34, 30];

    // pernas
    if (sit) { R(o.pants, -2, -3, 6, 2); R(shoe, 4, -3, 1, 2); }
    else if (crouch) { R(o.pants, -2, -3, 5, 3); R(shoe, -2, -1, 2, 1); R(shoe, 2, -1, 2, 1); }
    else {
      R(o.pants, -2 + sw, -5, 2, 4); R(o.pants, 1 - sw, -5, 2, 4);
      R(shoe, -2 + sw, -1, 2, 1); R(shoe, 1 - sw, -1, 2, 1);
    }
    // corpo
    if (o.fat) {
      R(o.shirt, -4, -12 + dy, 8, 7); R(o.skin, -3, -8 + dy, 6, 2);
      R([190, 160, 90], -2, -10 + dy, 1, 1); R([190, 160, 90], 2, -7 + dy, 1, 1); R([190, 160, 90], 0, -11 + dy, 1, 1);
    } else R(o.shirt, -3, -11 + dy, 6, 6);
    R([40, 32, 26], -3, -6 + dy, 6, 1);
    if (o.spikes) { R([220, 210, 190], -4, -13 + dy, 1, 2); R([220, 210, 190], -4, -10 + dy, 1, 2); R([220, 210, 190], -3, -15 + dy, 1, 2); R([120, 20, 20], -1, -10 + dy, 3, 2); }
    if (o.apron) R([110, 80, 50], -1, -9 + dy, 4, 4);
    if (o.cross) { R([200, 40, 40], 0, -10 + dy, 1, 3); R([200, 40, 40], -1, -9 + dy, 3, 1); }
    if (o.torn) { R(o.skin, -2, -8 + dy, 2, 1); R(o.skin, 1, -10 + dy, 1, 1); R([120, 20, 20], 0, -7 + dy, 1, 1); }
    // cabeça
    const hx = -2 + (o.lean || 0);
    R(o.skin, hx, -16 + dy, 5, 5);
    R(o.hair, hx, -17 + dy, 5, 2); R(o.hair, hx, -16 + dy, 1, 3);
    if (o.longHair) R(o.hair, hx - 1, -16 + dy, 2, 7);
    if (o.cap) { R(o.cap, hx - 1, -18 + dy, 6, 2); R(o.cap, hx + 4, -17 + dy, 2, 1); }
    if (o.helmet) R([70, 78, 50], hx - 1, -18 + dy, 7, 3);
    if (o.bandage) { R([236, 232, 220], hx, -16 + dy, 5, 1); R([180, 30, 30], hx + 1, -16 + dy, 1, 1); R([236, 232, 220], -1, -9 + dy, 4, 2); }
    R(o.eye || [20, 20, 20], hx + 3, -14 + dy, 1, 1);
    if (o.mouth) R([90, 20, 20], hx + 3, -12 + dy, 2, 1);
    if (o.drool) R('#9be35a', hx + 4, -12 + dy, 1, 2 + Math.round(Math.abs(Math.sin(o.phase))));
    // braços
    switch (p) {
      case 'aim':
        if (o.gun && GUNS[o.gun]) { GUNS[o.gun].draw(R, o, dy + (o.gunDy || 0)); break; }
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
        R(shade(o.shirt, 0.85), -1 - sw, -10 + dy, 2, 5); R(o.skin, -1 - sw, -5 + dy, 2, 1);
    }
    ctx.restore();
  }

  const ZPANTS = [[52, 50, 62], [70, 60, 46], [40, 44, 70], [80, 76, 70]];
  const ZHAIR = [[40, 46, 36], [70, 60, 50], [110, 90, 60], [30, 30, 30], [140, 140, 130]];
  const ZCAPS = [[160, 40, 40], [40, 70, 140], [200, 170, 60]];
  const lookCache = new Map();

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
    if (t === 'chefe') Object.assign(L, { skin: [140, 70, 70], shirt: [80, 30, 30], pants: [50, 30, 30], spikes: true,
      eye: [255, 220, 40], longHair: false, cap: null, oneArm: false });
    lookCache.set(z.id, L);
    if (lookCache.size > 300) lookCache.delete(lookCache.keys().next().value);
    return { ...L };
  }

  function dress(p, job) {
    const jl = JOBLOOK[job];
    p.job = job;
    p.shirt = jl.shirt || p.ownShirt;
    p.pants = jl.pants || [60, 60, 70];
    p.apron = !!jl.apron; p.helmet = !!jl.helmet; p.cross = !!jl.cross; p.bandage = !!jl.bandage;
    p.st = 'init'; p.hidden = false; p.carry = false;
  }
  function newPerson(job) {
    const p = {
      id: pid++, x: 33, y: 158, tx: 33, ty: 158, timer: 0, phase: Math.random() * 6, face: 1,
      speed: rand(16, 22), skin: pick(SKINS), hair: pick(HAIRS), muzzle: 0, pose: 'stand',
      ownShirt: pick([[120, 60, 60], [60, 80, 120], [130, 120, 80], [90, 90, 90]]),
    };
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
          const k = d.idx % Math.min(3, Math.max(1, S.build.torre));
          ox = towerX(k) + 14; oy = TOWER_TOP - 11; towerMuzzle[k] = 0.08;
        } else if (d.src === 'player') {
          ({ x: ox, y: oy } = gunTip()); leaderMuzzle = 0.08;
        }
        if (ox == null) break;
        if (d.src === 'rock') {
          parts.push({ x: ox, y: oy, vx: (d.x - ox) / 0.5, vy: (d.y - oy) / 0.5 - 50, g: 200, life: 0.5, max: 0.5, c: [140, 140, 140], s: 2, solid: true });
        } else {
          const hot = S.meta.boosts.furia > 0;
          let tx = d.x, ty = d.y;
          if (d.launch) break;   // granadas, foguetes e fogo têm efeito próprio
          if (d.exact) {
            if (d.miss) for (let i = 0; i < 3; i++) parts.push({ x: tx, y: ty, vx: rand(-12, 12), vy: rand(-20, -6), g: 80, life: 0.35, max: 0.35, c: [150, 135, 110], s: 1 });
          } else if (d.miss) {
            // passa raspando e bate no chão atrás do zumbi
            tx = d.x + rand(8, 22); ty = Math.min(H - 6, d.y + rand(12, 24));
            for (let i = 0; i < 4; i++) parts.push({ x: tx, y: ty, vx: rand(-14, 14), vy: rand(-26, -8), g: 80, life: 0.45, max: 0.45, c: [150, 135, 110], s: 1 });
          }
          tracers.push({ x1: ox, y1: oy, x2: tx, y2: ty, life: 0.07, c: hot ? '255,110,50' : d.src === 'player' ? '255,250,200' : '255,220,120' });
        }
        break;
      }
      case 'hit':
        hitAt.set(d.id, time);
        blood(d.x, d.y, 5);
        break;
      case 'spit': {
        const tx = WALL_X + 9, ty = d.ty - 14;
        parts.push({ x: d.x, y: d.y, vx: (tx - d.x) / 0.6, vy: (ty - d.y) / 0.6 - 60, g: 200, life: 0.6, max: 0.6, c: '#9be35a', s: 2, solid: true, glow: '150,255,80' });
        break;
      }
      case 'explode': {
        blasts.push({ x: d.x, y: d.y, t: time, r: d.big ? 40 : 30 });
        if (blasts.length > 12) blasts.shift();
        for (let i = 0; i < 26; i++) parts.push({
          x: d.x, y: d.y, vx: rand(-60, 60), vy: rand(-70, -5), g: 120, life: rand(0.3, 0.8), max: 0.8,
          c: pick(['#ffd040', '#ff8a20', '#ff5020', [90, 80, 80], [150, 120, 140]]), s: pick([1, 2, 2, 3]), floor: d.y + 14,
        });
        flashes.push({ x: d.x, y: d.y, r: d.big ? 90 : 45, c: '255,150,50', a: 0.9, life: d.big ? 0.6 : 0.35, max: d.big ? 0.6 : 0.35 });
        decals.push({ x: d.x, y: d.y + 9, w: d.big ? 26 : 12, life: 30, c: [40, 34, 30] });
        if (d.big) for (let i = 0; i < 30; i++) parts.push({ x: d.x + rand(-20, 20), y: d.y + rand(-10, 6), vx: rand(-25, 25), vy: rand(-30, -8), life: rand(1, 2), max: 2, c: [90, 85, 85], s: 3, a: 0.5 });
        shake = Math.max(shake, d.big ? 7 : 3.5);
        break;
      }
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
        texts.push({ x: ptr.x, y: ptr.y - 8, t: 'sem munição!', c: '#ff8070', life: 0.8 });
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
      case 'bossSpawn':
        banner = { t: 'ABOMINAÇÃO!', sub: 'Concentre o fogo nela!', c: '#ff3a3a', life: 3, max: 3 };
        shake = 3;
        break;
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
        people.length = 0; corpses.length = 0; travelers.length = 0;
        banner = { t: 'EVACUAÇÃO!', sub: `Cidade ${d.city} · +${d.g} ✨ Esperança`, c: '#f3d36a', life: 4, max: 4 };
        break;
      case 'zdeath': {
        if (d.type === 'explosivo') break;
        const z = { id: d.id, type: d.type };
        dismember(d, zlook(z));
        if (corpses.length > 40) corpses.shift();
        blood(d.x, d.y - 8, 14, d.y + 1);
        if (gore()) decals.push({ x: d.x + rand(-3, 3), y: d.y + rand(-1, 1), w: rand(4, 9), life: 45 });
        if (decals.length > 60) decals.shift();
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
          ? { t: `${Endgame.EVENTS[d.event].icon} ${Endgame.EVENTS[d.event].nome.toUpperCase()}`, sub: `Onda ${d.n}: ${Endgame.EVENTS[d.event].desc}`, c: '#ff3a8a', life: 4.5, max: 4.5 }
          : { t: `ONDA ${d.n}`, sub: `${d.count} zumbis estão vindo!`, c: '#ff5a4a', life: 3, max: 3 };
        break;
      case 'waveEnd':
        banner = { t: 'ONDA SOBREVIVIDA', sub: `${d.kills} zumbis abatidos`, c: '#9be35a', life: 3, max: 3 };
        break;
      case 'gameOver':
        people.length = 0; corpses.length = 0; travelers.length = 0;
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

  function drawBossBar() {
    const boss = S.horde.zs.find(z => ZTYPES[z.type].boss && !z.dead);
    if (!boss) return;
    const w = 180, x = W / 2 - w / 2, y = 24, T_ = ZTYPES.chefe;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 2, y - 2, w + 4, 8);
    ctx.fillStyle = '#7a1010'; ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = '#ff3a3a'; ctx.fillRect(x, y, w * Math.max(0, boss.hp) / (boss.maxHp || T_.hp), 4);
    ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#000'; ctx.fillText('👹 ' + T_.nome.toUpperCase(), W / 2 + 0.6, y - 4 + 0.6);
    ctx.fillStyle = '#ffb0a0'; ctx.fillText('👹 ' + T_.nome.toUpperCase(), W / 2, y - 4);
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

  // ---------- ambientação fixa: manchas antigas, corpos e rastros ----------
  const scenery = (() => {
    const r = seeded(31), stains = [], drags = [], bodies = [];
    for (let i = 0; i < 14; i++) {
      stains.push({ x: 215 + r() * 255, y: 162 + r() * 32, w: 3 + r() * 9, a: 0.35 + r() * 0.35 });
    }
    for (let i = 0; i < 4; i++) drags.push({ x: 230 + r() * 220, y: 166 + r() * 24, len: 12 + r() * 26, a: 0.3 + r() * 0.2 });
    // corpos de quem não chegou ao abrigo (pessoas e zumbis antigos)
    const spots = [[262, 186, false], [318, 168, false], [352, 191, true], [404, 176, true], [448, 188, false], [236, 193, false]];
    for (const [x, y, z] of spots) bodies.push({ x: x + r() * 6, y, zombie: z, flip: r() < 0.5, seed: Math.floor(r() * 1000) });
    return { stains, drags, bodies };
  })();
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

    // líder no telhado (você)
    drawHuman(LEADER.x, LEADER.y, {
      pose: S.horde.active ? 'aim' : 'stand', face: 1, phase: 0,
      skin: [220, 180, 150], hair: [30, 25, 20], shirt: [60, 62, 72], pants: [40, 40, 50],
      gun: leaderGun(), gunDy: Math.round(Math.sin(Math.min(1, leaderSwap / 0.22) * Math.PI) * 3),
    });
    if (leaderMuzzle > 0) {
      const t = gunTip(), fire = leaderGun() === 'chamas';
      rect(fire ? '#ff9a30' : '#fff4b0', t.x, t.y - 1, 3, 3);
      light(t.x + 1, t.y, leaderGun() === 'bazuca' ? 22 : 12, fire ? '255,140,40' : '255,220,120', 0.7);
    }
  }

  function drawTowers() {
    const n = Math.min(S.build.torre, 3);
    for (let k = 0; k < n; k++) {
      const x = towerX(k);
      rect([96, 70, 44], x, TOWER_TOP, 2, 36); rect([96, 70, 44], x + 10, TOWER_TOP, 2, 36);
      for (let y = TOWER_TOP + 8; y < 158; y += 10) rect([80, 58, 36], x, y, 12, 1);
      rect([112, 82, 50], x - 2, TOWER_TOP, 16, 3);
      rect([96, 70, 44], x - 2, TOWER_TOP - 5, 1, 5); rect([96, 70, 44], x + 13, TOWER_TOP - 5, 1, 5);
      drawHuman(x + 5, TOWER_TOP, {
        pose: S.horde.active ? 'aim' : 'stand', face: 1, phase: 0, helmet: true,
        skin: SKINS[k % 5], hair: [40, 30, 20], shirt: [88, 98, 62], pants: [70, 74, 52],
      });
      rect([112, 82, 50], x - 2, TOWER_TOP - 2, 16, 1);
      if (towerMuzzle[k] > 0) { rect('#fff4b0', x + 14, TOWER_TOP - 12, 3, 3); light(x + 15, TOWER_TOP - 11, 12, '255,220,120', 0.7); }
    }
    if (S.build.torre > 3) {
      ctx.fillStyle = '#e8e0c0'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`x${S.build.torre}`, towerX(2) + 6, TOWER_TOP - 22);
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
  }

  function drawDecals() {
    for (const d of decals) {
      if (!d.c && !gore()) continue;   // manchas de sangue somem se o sangue for desligado
      ctx.globalAlpha = Math.min(1, d.life / 5) * 0.75;
      ctx.fillStyle = T(d.c || [110, 16, 16]);
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.w, d.w * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawZombie(z) {
    const t = ZTYPES[z.type], L = zlook(z);
    const atk = z.state === 'attack' || (z.state === 'invade' && z.atk);
    L.pose = atk ? 'zattack' : 'zwalk';
    L.phase = atk ? time * 4 + z.id : time * z.speed * 0.45 + z.id;
    L.flash = time - (hitAt.get(z.id) ?? -9) < 0.08;
    drawHuman(z.x, z.y, L);
    if (z.maxHp > 1.5 && z.hp < z.maxHp) {
      const by = z.y - 19 * t.scale - 3;
      rect('#141414', z.x - 6, by, 12, 2);
      ctx.fillStyle = '#e05a4f'; ctx.fillRect(z.x - 6, by, 12 * Math.max(0, z.hp) / z.maxHp, 2);
    }
    if (z.name) {
      ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(z.name, z.x + 0.5, z.y - 19 * t.scale - 6.5);
      ctx.fillStyle = '#c9d6a0'; ctx.fillText(z.name, z.x, z.y - 19 * t.scale - 7);
    }
  }

  function drawHero(h, x, y) {
    const c = Endgame.HCLASS[h.cls];
    rect(c.color, x - 4, y - 11, 2, 7); // capa
    drawHuman(x, y, { pose: S.horde.active ? 'aim' : 'stand', face: 1, phase: 0, skin: SKINS[h.id % 5], hair: HAIRS[h.id % 6],
      shirt: c.color, pants: [50, 50, 60], helmet: h.cls === 'atirador', cross: h.cls === 'medico' });
    const b = Math.sin(time * 3 + h.id) * 0.8;
    ctx.fillStyle = '#ffe066'; ctx.font = '6px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('★', x, y - 19 + b);
  }

  // corpos de zumbis abatidos ficam no chão por um bom tempo e somem devagar
  const CORPSE_LIFE = 40;
  const fade = t => (t > CORPSE_LIFE - 6 ? Math.max(0, (CORPSE_LIFE - t) / 6) : 1);
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
    const c = { x: d.x, y: d.y, t: 0, look, kind, dir, spurt: 0 };
    const s = look.scale || 1, cnt = Settings.get('reduceFx') ? 0.5 : 1;
    const part = (name, vx, vy, vr) => {
      const [a, b, cy] = PART[name];
      pieces.push({ x: d.x, y: d.y + cy * s, cy, clip: [a, b], look, vx, vy, vr, rot: 0, floor: d.y - rand(0, 3) - (b - a) * s * 0.25, t: 0, rest: false });
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
        w: pick([1, 2, 2]), h: pick([1, 1, 2]), c: pick([look.skin, look.shirt, look.pants, [130, 16, 16], [100, 10, 10]]), floor: d.y - rand(-2, 4), t: 0, rest: false });
      blood(d.x, d.y - 10, 22 * cnt, d.y + 2);
      decals.push({ x: d.x, y: d.y + 1, w: rand(9, 14), life: 45 });
    }
    if (kind !== 'gib') corpses.push(c);
  }

  function drawCorpse(c) {
    const k = Math.min(1, c.t / 0.35), a = fade(c.t);
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
    const a = fade(p.t);
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
        if (gore() && !p.chunk && p.rest) decals.push({ x: p.x, y: p.y + 2, w: rand(2, 4), life: 45 });
      }
    }
    prune(pieces, p => p.t < CORPSE_LIFE);
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
  }

  // granada em arco; foguete em linha reta com rastro de fumaça
  function drawProjectiles() {
    for (const p of Weapons.projectiles) {
      const f = Math.min(1, p.t / p.dur);
      const x = p.x0 + (p.x - p.x0) * f;
      const y = p.y0 + (p.y - p.y0) * f - (p.rocket ? 0 : Math.sin(f * Math.PI) * 28);
      if (p.rocket) {
        rect([200, 200, 190], x - 3, y - 1, 6, 2); rect([220, 60, 40], x + 3, y - 1, 2, 2);
        light(x - 3, y, 10, '255,160,60', 0.6);
        if (Math.random() < 0.8) parts.push({ x: x - 4, y, vx: rand(-10, 0), vy: rand(-6, 6), life: 0.6, max: 0.6, c: [170, 170, 170], s: 2, a: 0.5 });
      } else {
        rect([60, 70, 50], x - 1.5, y - 1.5, 3, 3);
      }
    }
  }

  // mira do jogador durante a horda
  function drawReticle() {
    if (!S.horde.active || !ptr.in || paused) return;
    const k = Weapons.current(), w = LWEAPONS[k], st = Weapons.stat(k);
    const dry = Weapons.ammoOf(k) < 1;
    const r = Math.max(4, st.spread * 1.2, w.radius ? st.radius * 0.6 : 0);
    const col = dry ? '255,90,80' : S.clickCd > 0 ? '255,220,120' : '255,255,255';
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.strokeStyle = `rgba(${col},0.9)`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(ptr.x, ptr.y, r, 0, 7); ctx.stroke();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.beginPath(); ctx.moveTo(ptr.x + dx * (r - 2), ptr.y + dy * (r - 2)); ctx.lineTo(ptr.x + dx * (r + 3), ptr.y + dy * (r + 3)); ctx.stroke();
    }
    ctx.fillStyle = `rgba(${col},1)`; ctx.fillRect(ptr.x - 0.5, ptr.y - 0.5, 1, 1);
    // recarga: arco que se completa
    if (S.clickCd > 0 && st.cd > 0.3) {
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

  function drawTexts() {
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
      ? `🧟 ONDA ${Hd.n}: ${Hd.queue.length + Hd.zs.length} zumbis restantes`
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

  function init(canvas) {
    cv = canvas;
    ctx = cv.getContext('2d');
    resize();
    new ResizeObserver(resize).observe(cv);
    listeners.push(on);

    // Mira: de noite o clique atira no ponto mirado (segurar dispara as armas automáticas).
    // De dia o cenário não faz nada: vasculhar fica no botão.
    const toLocal = e => { const r = cv.getBoundingClientRect(); ptr.x = (e.clientX - r.left) / r.width * W; ptr.y = (e.clientY - r.top) / r.height * H; };
    cv.addEventListener('pointermove', e => { toLocal(e); ptr.in = true; });
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

    for (const p of parts) {
      p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.floor && p.y > p.floor) { p.y = p.floor; p.vx *= 0.3; p.vy = 0; }
    }
    prune(parts, p => p.life > 0);
    for (const t of tracers) t.life -= dt;
    prune(tracers, t => t.life > 0);
    for (const t of texts) { t.life -= dt; t.y -= 14 * dt; }
    prune(texts, t => t.life > 0);
    for (const d of decals) d.life -= dt;
    prune(decals, d => d.life > 0);
    for (const c of corpses) c.t += dt;
    prune(corpses, c => c.t < CORPSE_LIFE);
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

    const ents = [];
    for (const p of people) if (!p.hidden) ents.push([p.y, () => drawPerson(p)]);
    for (const p of travelers) ents.push([p.y, () => drawHuman(p.x, p.y, p)]);
    S.meta.heroes.filter(h => S.meta.active.includes(h.id)).forEach((h, i) => {
      const x = 118 + i * 11, y = 186;
      ents.push([y, () => drawHero(h, x, y)]);
    });
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
    if (redFlash > 0) { ctx.fillStyle = `rgba(200,20,20,${redFlash * 0.35})`; ctx.fillRect(0, 0, W, H); }
  }

  // Texto flutuante saindo do líder no telhado (usado pelo botão Vasculhar)
  function float(t) {
    texts.push({ x: LEADER.x + rand(-6, 6), y: LEADER.y - 22, t, c: '#ece6d0', life: 1.3 });
    for (let i = 0; i < 5; i++) parts.push({ x: LEADER.x, y: LEADER.y - 4, vx: rand(-20, 20), vy: rand(-25, -5), g: 60, life: 0.5, max: 0.5, c: [180, 170, 140], s: 1 });
  }

  return { init, update, draw, float, gunTip };
})();
