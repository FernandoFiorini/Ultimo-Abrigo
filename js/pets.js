'use strict';

// 🐾 Pets do abrigo: cachorro, gato e pastor alemão (no máximo um de cada).
// Ficam no metajogo (S.meta.pets): acompanham o grupo na evacuação e no Novo Mundo. Pets NUNCA morrem:
// na horda, o cachorro e o gato se escondem no abrigo; o pastor fica no muro.
// Chegam por dilemas (cachorro, pastor) e por expedições (gato; pastor na Base militar).
// Cada pet: +PET_REST de descanso dos guardas. Carinho (clicar no pet, de dia): −PET_PAT do cansaço, a cada PET_PAT_CD s por pet.
const PET_REST = 0.08, PET_PAT = 0.15, PET_PAT_CD = 60;
const PET_DOG_WARN = 15, PET_DOG_LOOT = 0.15;     // cachorro: alerta antecipado (s) e saque das expedições
const PET_CAT_FOOD = 0.08, PET_CAT_MOURN = 0.3;   // gato: consumo de comida a menos e luto mais rápido
const PET_GUARD_CD = 8, PET_GUARD_STUN = 2.5;     // pastor: intervalo entre avanços e atordoamento

const Pets = (() => {
  const KINDS = {
    cao: { nome: 'Cachorro', icon: '🐕', desc: `Late ${PET_DOG_WARN}s antes das noites perigosas (mais tempo para se preparar) e tem bom faro: +${Math.round(PET_DOG_LOOT * 100)}% no saque das expedições.`,
      names: ['Caramelo', 'Pipoca', 'Rex', 'Paçoca', 'Bidu', 'Mel', 'Thor', 'Pandora', 'Farofa', 'Biscoito'] },
    gato: { nome: 'Gato', icon: '🐈', desc: `Caça os ratos do depósito: −${Math.round(PET_CAT_FOOD * 100)}% no consumo de comida. Faz companhia: o luto passa ${Math.round(PET_CAT_MOURN * 100)}% mais rápido.`,
      names: ['Mingau', 'Frajola', 'Nina', 'Tigrinho', 'Salém', 'Mimi', 'Bolinha', 'Chico', 'Fumaça'] },
    pastor: { nome: 'Pastor alemão', icon: '🐕‍🦺', desc: `Cão de guarda: a cada ${PET_GUARD_CD}s de horda, avança no zumbi que está batendo no muro e o atordoa por ${String(PET_GUARD_STUN).replace('.', ',')}s (chefes não).`,
      names: ['Sargento', 'Major', 'Duque', 'Kaiser', 'Atena', 'Zeus', 'Tenente', 'Bala'] },
  };
  const ORDER = ['cao', 'gato', 'pastor'];
  const ALL_DESC = `Todo pet: +${Math.round(PET_REST * 100)}% de descanso dos guardas. Carinho (clique nele, de dia): −${Math.round(PET_PAT * 100)}% do cansaço dos guardas.`;

  const list = () => (typeof S !== 'undefined' && S && S.meta && S.meta.pets) || [];
  const has = k => list().some(p => p.k === k);
  const get = k => list().find(p => p.k === k);
  const label = p => `${KINDS[p.k].icon} ${p.n}`;

  // ---------- ganhar um pet ----------
  function add(k, where) {
    if (!KINDS[k] || has(k)) return null;
    if (!S.meta.pets) S.meta.pets = [];
    const used = new Set(list().map(p => p.n));
    const pool = KINDS[k].names.filter(n => !used.has(n));
    const p = { k, n: pool[Math.floor(Math.random() * pool.length)] || KINDS[k].names[0] };
    S.meta.pets.push(p);
    addLog(`🐾 ${label(p)} (${KINDS[k].nome.toLowerCase()}) agora mora no abrigo${where ? ` (${where})` : ''}! ${KINDS[k].desc}`, 'good');
    emit('pet', { k });
    if (!simulating && typeof toast === 'function' && typeof document !== 'undefined')
      toast({ icon: KINDS[k].icon, label: 'Novo pet no abrigo', name: `${p.n}, o ${KINDS[k].nome.toLowerCase()}`, desc: KINDS[k].desc, time: 7000 });
    return p;
  }

  // ---------- bônus ----------
  const restMult = () => 1 + PET_REST * list().length;
  const lootMult = () => (has('cao') ? 1 + PET_DOG_LOOT : 1);
  const foodMult = () => (has('gato') ? 1 - PET_CAT_FOOD : 1);
  const mournMult = () => (has('gato') ? 1 + PET_CAT_MOURN : 1);
  const warnBonus = () => (has('cao') ? PET_DOG_WARN : 0);

  // noite perigosa sorteada mais cedo: o cachorro late
  function onDanger() {
    const p = get('cao');
    if (!p) return;
    addLog(`🐕 ${p.n} começou a latir para a rua, de pelo arrepiado. Tem coisa grande vindo.`, 'warn');
    const s = sprites.cao; if (s) s.bark = 4;
  }

  // pastor: avança no zumbi que está batendo no muro
  function hordeTick(dt) {
    const H = S.horde;
    if (!has('pastor') || S.wallDown || !H.zs) return;
    H.petCd = (H.petCd ?? PET_GUARD_CD * 0.5) - dt;
    if (H.petCd > 0) return;
    const z = H.zs.find(q => !q.dead && q.state === 'attack' && !q.dummy && !ZTYPES[q.type].boss && !(q.stun > 0));
    if (!z) { H.petCd = 0.5; return; }
    H.petCd = PET_GUARD_CD;
    z.stun = PET_GUARD_STUN;
    const s = sprites.pastor; if (s) { s.lunge = 0.6; s.ly = z.y; }
    emit('petBite', { x: z.x, y: z.y });
  }

  // expedição de volta: chance de achar um gato (qualquer lugar) ou um pastor (Base militar)
  function expFind(loc) {
    if (!has('gato') && Math.random() < 0.07) add('gato', 'estava escondido num prédio e seguiu a expedição');
    else if (loc === 'base' && !has('pastor') && Math.random() < 0.06) add('pastor', 'encontrado na Base militar, ainda de coleira do exército');
    else if (!has('cao') && S.best >= 5 && Math.random() < 0.02) add('cao', 'seguiu a expedição até o portão');
  }

  // ---------- dilemas ----------
  const R = n => Math.max(1, Math.round(n * (1 + 0.12 * (S.wave - 1))));
  if (typeof Events !== 'undefined') Events.DILEMMAS.push(
    {
      id: 'cachorro', icon: '🐕', title: 'Um cachorro no portão',
      text: () => 'Um cachorro magro, de costelas à mostra, seguiu os coletores até o portão. Abana o rabo devagar e não tira os olhos da comida.',
      cond: () => !has('cao') && S.wave >= 3,
      opts: [
        { label: 'Dar comida e deixar entrar', hint: () => `−${R(10)} 🥫 · ganha um cachorro (alerta antes das noites perigosas, +saque)`, ok: () => S.res.comida >= R(10),
          run: () => { S.res.comida -= R(10); const p = add('cao'); return [`Ele comeu tudo em segundos e deitou perto da fogueira. O grupo decidiu chamá-lo de ${p ? p.n : 'Caramelo'}.`, 'good']; } },
        { label: 'Espantar', hint: 'Nada acontece', run: () => ['O cachorro recuou e sumiu na rua. Talvez volte outro dia.', ''] },
      ],
    },
    {
      id: 'pastor', icon: '🐕‍🦺', title: 'Um cão do exército',
      text: () => 'Um pastor alemão com coleira do exército está deitado encostado no muro, com uma pata ferida. Ainda usa a plaqueta de identificação.',
      cond: () => !has('pastor') && S.best >= 10,
      opts: [
        { label: 'Tratar a pata', hint: () => `−1 💊 −${R(10)} 🥫 · ganha um cão de guarda (atordoa zumbis no muro)`, ok: () => S.res.remedio >= 1 && S.res.comida >= R(10),
          run: () => { S.res.remedio -= 1; S.res.comida -= R(10); const p = add('pastor'); return [`Com a pata enfaixada, ${p ? p.n : 'ele'} se levantou e foi direto para o muro, como se soubesse o que fazer.`, 'good']; } },
        { label: 'Deixar comida e seguir', hint: () => `−${R(10)} 🥫 · 30% de chance de ele ficar`, ok: () => S.res.comida >= R(10),
          run: () => {
            S.res.comida -= R(10);
            if (Math.random() < 0.3) { const p = add('pastor'); return [`${p ? p.n : 'Ele'} comeu, mancou até o portão e não foi mais embora.`, 'good']; }
            return ['Ele comeu e foi embora mancando, rumo ao norte.', ''];
          } },
        { label: 'Ignorar', hint: 'Nada acontece', run: () => ['Quando o grupo voltou a olhar, o cão já tinha ido embora.', ''] },
      ],
    },
  );

  // ---------- na cena (coordenadas do mundo: pátio entre x 20 e o muro, y 158 a 196) ----------
  const sprites = {};
  const DOOR = { x: 74, y: 157 };
  const rand = (a, b) => a + Math.random() * (b - a);
  const SPEED = { cao: 22, gato: 13, pastor: 19 };

  function sync() {
    for (const p of list()) if (!sprites[p.k]) sprites[p.k] = { k: p.k, x: DOOR.x + rand(-4, 4), y: DOOR.y + 2, tx: 0, ty: 0, st: 'rest', timer: rand(0.5, 2), face: 1, phase: 0, pose: 'stand', cd: 0, bark: 0, lunge: 0, ly: 0, hidden: false, moving: false };
    for (const k in sprites) if (!has(k)) delete sprites[k];
  }

  function pickSpot(s, A) {
    const F = A.FIRE;
    if (s.k === 'gato') {
      if (Math.random() < 0.65) return [F.x + rand(-16, 16), F.y + rand(5, 10)];
      return [rand(30, 160), rand(162, 194)];
    }
    if (s.k === 'pastor') return [rand(120, A.WALL_X - 14), rand(166, 194)];
    return [rand(24, A.WALL_X - 16), rand(160, 195)];
  }

  function sceneUpdate(dt, A) {
    sync();
    const horde = S.horde.active;
    for (const k in sprites) {
      const s = sprites[k];
      s.cd = Math.max(0, s.cd - dt); s.bark = Math.max(0, s.bark - dt); s.lunge = Math.max(0, s.lunge - dt);
      s.moving = false;
      const walk = (tx, ty, sp) => {
        const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
        if (d < 0.8) { s.x = tx; s.y = ty; return true; }
        const st = Math.min(d, sp * dt);
        s.x += dx / d * st; s.y += dy / d * st;
        if (Math.abs(dx) > 0.3) s.face = dx > 0 ? 1 : -1;
        s.moving = true; s.phase += dt * sp * 0.6;
        return false;
      };
      if (horde && k !== 'pastor') {
        // corre para dentro do abrigo e só sai quando a horda acabar
        if (!s.hidden && walk(DOOR.x, DOOR.y, SPEED[k] * 2)) s.hidden = true;
        s.pose = 'stand'; s.st = 'rest'; s.timer = rand(1, 3);
        continue;
      }
      if (s.hidden) { s.hidden = false; s.x = DOOR.x; s.y = DOOR.y + 1; }
      if (horde) {
        // pastor: de guarda no pé do muro; no avanço, pula no muro e volta
        if (s.lunge > 0.25) walk(A.WALL_X - 2, Math.max(162, Math.min(196, s.ly)), 120);
        else walk(A.WALL_X - 16, 190, s.lunge > 0 ? 80 : SPEED.pastor * 1.5);
        if (!s.moving) s.face = 1;
        s.pose = 'stand';
        if (s.lunge > 0.5 && Math.random() < dt * 20) A.say(A.WALL_X - 6, s.y - 14, 'Grr!', '#ffd0a0');
        continue;
      }
      if (s.st === 'go') {
        if (walk(s.tx, s.ty, SPEED[k] * (s.run ? 2 : 1))) {
          s.st = 'rest';
          s.timer = k === 'gato' ? rand(7, 16) : rand(3, 8);
          s.pose = Math.random() < (k === 'gato' ? 0.8 : 0.45) ? 'lie' : 'stand';
          if (k === 'gato' && Math.abs(s.x - A.FIRE.x) < 20) s.face = s.x < A.FIRE.x ? 1 : -1;
        } else s.pose = 'stand';
      } else {
        s.timer -= dt;
        if (s.timer <= 0) { [s.tx, s.ty] = pickSpot(s, A); s.st = 'go'; s.run = k === 'cao' && Math.random() < 0.25; }
      }
      if (s.bark > 0) { s.pose = 'stand'; s.face = 1; if (Math.random() < dt * 2.5) A.say(s.x + 4, s.y - 12, 'Au! Au!', '#fff4d0'); }
      else if (k === 'gato' && s.pose === 'lie' && !s.moving && Math.random() < dt * 0.15) A.say(s.x, s.y - 8, 'z', '#c8c8e0');
    }
  }

  // desenho em pixel (pés em s.y, virado para s.face)
  const DOG = { c: [176, 122, 64], d: [120, 80, 42], l: [222, 186, 136] };
  const CAT = { c: [206, 130, 58], d: [150, 86, 36], l: [236, 200, 160] };
  const GSD = { c: [176, 124, 62], k: [42, 36, 32], l: [210, 170, 110] };
  const EYE = [20, 18, 16], NOSE = [30, 20, 20];

  function drawPet(s, A) {
    const f = s.face, x = Math.round(s.x), y = Math.round(s.y);
    const P = (dx, dy, w, h, c) => A.rect(c, f > 0 ? x + dx : x - dx - w + 1, y + dy, w, h);
    const t = A.time(), lift = i => (s.moving && (i % 2 === 0) === (Math.sin(s.phase) > 0) ? 1 : 0);
    const wag = Math.sin(t * (s.bark > 0 || s.moving ? 16 : 6)) > 0 ? 1 : 0;
    // sombra
    A.rect('rgba(0,0,0,0.25)', x - 5, y, 11, 1);
    if (s.k === 'cao') {
      const C = DOG;
      if (s.pose === 'lie') {
        P(-4, -3, 9, 3, C.c); P(-3, -1, 7, 1, C.l); P(4, -5, 3, 3, C.c); P(7, -4, 2, 2, C.l); P(8, -4, 1, 1, NOSE); P(4, -6, 1, 2, C.d); P(6, -4, 1, 1, EYE);
        P(-6, -2 - wag, 2, 1, C.c);
        return;
      }
      [-4, -2, 2, 4].forEach((lx, i) => P(lx, -2, 1, 2 - lift(i), C.d));
      P(-4, -5, 9, 3, C.c); P(-3, -3, 7, 1, C.l);
      P(4, -8, 3, 4, C.c); P(7, -7, 2, 2, C.l); P(8, -7, 1, 1, NOSE); P(4, -9, 1, 2, C.d); P(6, -8, 1, 1, EYE);
      if (s.bark > 0 && Math.sin(t * 14) > 0) P(7, -5, 2, 1, [120, 40, 40]);
      P(-6, -6 - wag, 2, 1, C.c); P(-6, -7 - wag, 1, 1, C.c);
    } else if (s.k === 'gato') {
      const C = CAT;
      if (s.pose === 'lie') {
        P(-3, -3, 7, 3, C.c); P(-2, -3, 1, 1, C.d); P(0, -3, 1, 1, C.d); P(2, -4, 3, 3, C.c); P(2, -5, 1, 1, C.c); P(4, -5, 1, 1, C.c);
        P(-4, -1, 7, 1, C.d);
        return;
      }
      [-3, -1, 1, 3].forEach((lx, i) => P(lx, -2, 1, 2 - lift(i), C.c));
      P(-3, -4, 7, 2, C.c); P(-2, -4, 1, 1, C.d); P(0, -4, 1, 1, C.d); P(-2, -2, 5, 1, C.l);
      P(3, -6, 3, 3, C.c); P(3, -7, 1, 1, C.c); P(5, -7, 1, 1, C.c); P(5, -5, 1, 1, [70, 160, 70]); P(6, -4, 1, 1, C.l);
      P(-4, -7, 1, 4, C.c); P(-5 + wag, -8, 1, 1, C.d);
    } else {
      const C = GSD;
      if (s.pose === 'lie') {
        P(-5, -4, 11, 4, C.c); P(-4, -4, 8, 2, C.k); P(5, -6, 4, 4, C.c); P(9, -5, 2, 2, C.k); P(5, -8, 1, 2, C.k); P(7, -8, 1, 2, C.k); P(7, -5, 1, 1, EYE);
        P(-8, -2, 3, 1, C.k);
        return;
      }
      [-5, -3, 3, 5].forEach((lx, i) => P(lx, -3, 1, 3 - lift(i), C.c));
      P(-5, -7, 11, 4, C.c); P(-4, -7, 8, 2, C.k); P(-4, -3, 9, 1, C.l);
      P(5, -10, 4, 4, C.c); P(9, -9, 2, 2, C.k); P(10, -9, 1, 1, NOSE); P(5, -12, 1, 2, C.k); P(7, -12, 1, 2, C.k); P(7, -9, 1, 1, EYE);
      P(5, -7, 1, 2, [70, 100, 60]);
      P(-8, -7 + (s.lunge > 0 ? 0 : wag), 3, 1, C.k); P(-9, -6, 1, 2, C.k);
    }
  }

  function sceneEnts(ents, A) {
    for (const k in sprites) { const s = sprites[k]; if (!s.hidden) ents.push([s.y, () => drawPet(s, A)]); }
  }

  // pet sob o ponteiro (para a dica e o carinho)
  function at(x, y) {
    let best = null;
    for (const k in sprites) {
      const s = sprites[k];
      if (s.hidden || Math.abs(x - s.x) > 7 || y < s.y - 13 || y > s.y + 2) continue;
      if (!best || s.y > best.y) best = s;
    }
    return best && { s: best, p: get(best.k) };
  }
  function tipHtml(hit) {
    const K = KINDS[hit.p.k];
    return `<b>${K.icon} ${escHtml(hit.p.n)}</b><small>${K.nome}${S.horde.active ? '' : hit.s.cd > 0 ? ' · já ganhou carinho' : ' · clique para fazer carinho'}</small><p>${K.desc}</p><small>✏️ Para mudar o nome, clique nele na lista de sobreviventes.</small>`;
  }

  // carinho: só de dia
  function click(x, y, A) {
    if (S.horde.active) return false;
    const hit = at(x, y);
    if (!hit) return false;
    const s = hit.s;
    for (let i = 0; i < 3; i++) A.say(s.x + rand(-4, 4), s.y - 10 - i * 3, '❤', '#ff7a8a');
    if (s.cd > 0) return true;
    s.cd = PET_PAT_CD;
    s.pose = 'stand'; s.st = 'rest'; s.timer = Math.max(s.timer, 2);
    const before = S.fatigue || 0;
    S.fatigue = before * (1 - PET_PAT);
    addLog(`❤️ Carinho em ${label(hit.p)}.${before > 0.01 ? ` Os guardas relaxaram um pouco (cansaço −${Math.round(PET_PAT * 100)}%).` : ''}`, 'good');
    emit('petPat', { k: s.k });
    return true;
  }

  // chips na lista de sobreviventes (clique: renomear)
  function chipsHtml() {
    if (!list().length) return '';
    return `<div class="pet-chips">${list().map(p => `<button class="person pet" data-pet="${p.k}" title="${escHtml(`${KINDS[p.k].nome}: ${KINDS[p.k].desc} ${ALL_DESC} Clique para mudar o nome.`)}">${KINDS[p.k].icon} ${escHtml(p.n)} <small>✏️</small></button>`).join('')}</div>`;
  }

  // ---------- renomear ----------
  const PET_NAME_MAX = 16;
  const cleanPetName = s => String(s || '').replace(/[\u0000-\u001f<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, PET_NAME_MAX);
  function rename(k) {
    const p = get(k);
    if (!p) return;
    const K = KINDS[k];
    const apply = () => {
      const n = cleanPetName(document.getElementById('pet-name').value);
      if (!n) { document.getElementById('pet-name').focus(); return false; }
      if (n !== p.n) { addLog(`🐾 ${K.icon} ${p.n} agora se chama ${n}.`); p.n = n; if (typeof save === 'function') save(); }
      return true;
    };
    openDialog({
      title: `${K.icon} Nome do ${K.nome.toLowerCase()}`,
      staticBody: true, plain: true,
      body: `<p class="event-text">Como o grupo vai chamar ${escHtml(p.n)}?</p>
        <input id="pet-name" class="pet-name-input" maxlength="${PET_NAME_MAX}" value="${escHtml(p.n)}" autocomplete="off" spellcheck="false">
        <p class="hint">Até ${PET_NAME_MAX} letras. Sugestões: ${K.names.filter(n => n !== p.n).slice(0, 4).map(n => `<button class="link" data-pet-sug="${escHtml(n)}">${escHtml(n)}</button>`).join(' ')}</p>`,
      buttons: [{ label: 'Salvar nome', cls: 'primary', keep: true, onClick: d => { if (apply()) d.close(); } }],
      cancel: 'Cancelar',
      onMount: d => {
        const inp = document.getElementById('pet-name');
        inp.focus(); inp.select();
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (apply()) { d.close(); render(); } } });
        document.getElementById('dialog-body').addEventListener('click', e => {
          const b = e.target.closest('[data-pet-sug]');
          if (b) { inp.value = b.dataset.petSug; inp.focus(); }
        });
      },
    });
  }
  if (typeof document !== 'undefined' && typeof HTMLElement !== 'undefined')
    document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-pet]'); if (b) rename(b.dataset.pet); });

  return { KINDS, ORDER, list, has, add, restMult, lootMult, foodMult, mournMult, warnBonus, onDanger, hordeTick, expFind,
    sceneUpdate, sceneEnts, at, tipHtml, click, chipsHtml, rename, sig: () => list().map(p => p.k + p.n).join(',') };
})();
