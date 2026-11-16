'use strict';

// Heróis de campo: um por vez fica no telhado, ao lado do líder, e luta de verdade.
// Ganham XP (abates, ondas, chefes) e nível; cada nível dá 1 ponto para a árvore de 4 habilidades:
// 2 passivas, 1 ativa (tecla A, com recarga) e a suprema (tecla S), com recarga longa que os abates encurtam.
// Ficam no metajogo (não se perdem ao evacuar). Os 12 heróis antigos continuam como equipe de apoio.
const CHAMP_MAX_LVL = 20;
const CHAMP_SUP_LVL = [10, 15, 20];      // nível mínimo para o grau 1, 2 e 3 da suprema
const CHAMP_RANK_COST = [1, 2, 3];       // pontos para comprar o grau 1, 2 e 3 de cada habilidade (tudo no máximo: 24 > 20 pontos)
// Suprema: recarga por tempo de horda (por grau) e cada abate do abrigo desconta um pouco dela.
// SUP_KILL: segundos descontados por uma onda inteira de abates (cada abate vale SUP_KILL / tamanho da onda;
// abates do próprio herói valem 3x) · SUP_BOSS: segundos descontados por chefe abatido
const CHAMP_SUP_CD = [150, 130, 110], CHAMP_SUP_KILL = 30, CHAMP_SUP_BOSS = 8;
const CHAMP_LVL_DMG = 0.12;              // +dano do ataque básico por nível
const CHAMP_GIFT_WAVE = 10;              // onda em que chega o primeiro herói (uma vez por save)
const CHAMP_POS = { x: 38, y: 99 };      // no telhado, à esquerda do líder
const CHAMP_NEAR_WALL = 70;              // "perto do muro": até essa distância dele
// Caixas de heróis (só de chefes derrotados ao vivo). Ao abrir, a caixa começa em ★ e pode subir:
// up2: chance de ★ → ★★ · up3: chance de ★★ → ★★★ (só se faltar algum herói) · frags: fragmentos para invocar
// pity: no máximo isso de caixas seguidas sem fragmento de herói que você ainda não tem · caps: 🏷️ por fragmento repetido
// caps: Tampinhas por fragmento repetido · capsBy: Tampinhas fixas de cada caixa, por estrela (★ pouco, ★★ e ★★★ médio)
// Herói repetido na ★★★ (todos já liberados) vira frags × caps Tampinhas.
const BOX = { up2: 0.20, up3: 0.10, frags: 6, pity: 10, caps: 5, capsBy: [0, 3, 10, 10] };
// Loja: fragmento escolhido (conteúdo garantido, sem sorte) e pacote de Tampinhas
// (os preços em cash ficam no SHOP, em config.js)
const FRAG_COST = SHOP.fragmento.cost, FRAG_DAY = 1, CAPS_PACK = 15;

const champPct = v => `${Math.round(v * 100)}%`;

// atk: ataque básico (cd em segundos, dano por tiro, fx: efeito visual)
// skills: p1/p2 passivas (id: o que elas alteram no jogo) · act: ativa (cd por grau) · sup: suprema
// v: valor em cada grau · fx: texto do efeito com o valor do grau
const CHAMPS = {
  profeta: {
    nome: 'Profeta da Tempestade', icon: '⚡', color: '170,210,255',
    desc: 'Pregador de rua que jura que o céu o escuta. Dano em área com raios em cadeia.',
    look: { skin: [200, 160, 130], hair: [220, 220, 225], longHair: true, beard: [225, 225, 230], shirt: [44, 44, 66], pants: [30, 30, 40], scarf: [240, 220, 90] },
    atk: { cd: 1.6, dmg: 1.2, fx: 'bolt' },
    skills: {
      p1: { id: 'spark', nome: 'Para-raios', icon: '🌩️', v: [0.05, 0.10, 0.15], fx: v => `tiros das torres têm ${champPct(v)} de chance de soltar uma faísca que salta para 2 zumbis` },
      p2: { id: 'chain', nome: 'Pregação', icon: '📖', v: [1, 2, 3], fx: v => `o raio básico salta para mais ${v} zumbi(s)` },
      act: { nome: 'Relâmpago', icon: '⚡', cd: [30, 26, 22], v: [3, 5, 7], fx: v => `acerta o zumbi mais resistente (dano ×4) e salta para ${v} outros` },
      sup: { nome: 'Fúria dos Céus', icon: '🌪️', v: [0.15, 0.20, 0.25], fx: v => `raios matam todos os zumbis comuns da tela; chefes perdem ${champPct(v)} da vida` },
    },
  },
  x9: {
    nome: 'Protótipo X-9', icon: '🤖', color: '255,90,90',
    desc: 'Robô militar achado num laboratório abandonado. Lasers e bombardeio em linha.',
    look: { skin: [150, 160, 175], hair: [70, 75, 85], bald: true, goggles: true, shirt: [96, 106, 122], pants: [62, 68, 80], helmet: true },
    atk: { cd: 1.2, dmg: 1.0, fx: 'laser' },
    skills: {
      p1: { id: 'wall', nome: 'Blindagem', icon: '🛡️', v: [0.05, 0.10, 0.15], fx: v => `muro +${champPct(v)} de resistência máxima` },
      p2: { id: 'acc', nome: 'Mira computadorizada', icon: '🎯', v: [0.03, 0.06, 0.09], fx: v => `guardas +${champPct(v)} de precisão` },
      act: { nome: 'Feixe', icon: '🔴', cd: [28, 24, 20], v: [3, 4, 5], fx: v => `um laser atravessa a faixa inteira do zumbi mais próximo (dano ×${v} em cada um)` },
      sup: { nome: 'Bombardeio orbital', icon: '🛰️', v: [5, 7, 9], fx: v => `${v} explosões varrem o campo: zumbis comuns no raio morrem, chefes perdem 8% da vida em cada uma` },
    },
  },
  bilu: {
    nome: 'Seu Bilú, o domador', icon: '🎪', color: '255,200,80',
    desc: 'Domador de circo que chegou com um urso. Atordoa, segura e controla a horda.',
    look: { skin: [224, 176, 140], hair: [40, 30, 20], mustache: [40, 30, 20], shirt: [190, 40, 40], pants: [240, 240, 235], cap: [30, 30, 30], scarf: [240, 200, 60] },
    atk: { cd: 0.9, dmg: 0.6, fx: 'knife' },
    skills: {
      p1: { id: 'slow', nome: 'Picadeiro', icon: '🎠', v: [0.05, 0.10, 0.15], fx: v => `zumbis perto do muro andam ${champPct(v)} mais devagar` },
      p2: { id: 'bear', nome: 'Urso amigo', icon: '🐻', v: [0.5, 1.0, 1.5], fx: v => `o urso bate em quem ataca o muro (${pts(v)} de dano por segundo, cresce com o nível)` },
      act: { nome: 'Chicotada', icon: '🪢', cd: [24, 20, 16], v: [2, 3, 4], fx: v => `atordoa por ${v}s o grupo mais perto do muro` },
      sup: { nome: 'Grande espetáculo', icon: '🎩', v: [8, 10, 12], fx: v => `a horda inteira fica hipnotizada, parada, por ${v}s (chefes, metade do tempo)` },
    },
  },
  imune: {
    nome: 'A Imune', icon: '🧬', color: '170,120,230',
    desc: 'Foi mordida e não virou. Ouve a horda, e a horda às vezes a escuta.',
    look: { skin: [176, 190, 162], hair: [30, 28, 26], longHair: true, bandage: true, shirt: [92, 92, 80], pants: [60, 58, 52] },
    atk: { cd: 1.4, dmg: 0.8, fx: 'rock' },
    skills: {
      p1: { id: 'cure', nome: 'Sangue resistente', icon: '🩸', v: [0.10, 0.20, 0.30], fx: v => `mordidos liberados têm +${champPct(v)} de chance de resistir à infecção` },
      p2: { id: 'heal', nome: 'Cheiro da colmeia', icon: '🧪', v: [0.2, 0.4, 0.6], fx: v => `feridos se recuperam ${champPct(v)} mais rápido` },
      act: { nome: 'Sussurro', icon: '👂', cd: [30, 26, 22], v: [5, 7, 9], fx: v => `um grupo de zumbis comuns se ataca por ${v}s` },
      sup: { nome: 'Chamado da colmeia', icon: '🐝', v: [10, 13, 16], fx: v => `todos os zumbis comuns da tela lutam entre si por ${v}s` },
    },
  },
  waldir: {
    nome: 'Seu Waldir, o abduzido', icon: '🛸', color: '120,255,140',
    desc: 'Sumiu em 1987 e voltou ontem, com um controle remoto estranho. Ninguém acredita, mas funciona.',
    look: { skin: [210, 165, 125], hair: [150, 150, 150], bald: true, glasses: true, mustache: [150, 150, 150], shirt: [80, 160, 200], pants: [200, 188, 158] },
    atk: { cd: 1.5, dmg: 1.2, fx: 'ray' },
    skills: {
      p1: { id: 'ammo', nome: 'Tecnologia de outro mundo', icon: '🔧', v: [0.05, 0.10, 0.15], fx: v => `+${champPct(v)} de munição produzida pelos armeiros` },
      p2: { id: 'head', nome: 'Visão de raio X', icon: '👁️', v: [0.10, 0.20, 0.30], fx: v => `guardas e torres acertam a cabeça dos blindados ${champPct(v)} mais vezes` },
      act: { nome: 'Raio trator', icon: '🔦', cd: [26, 22, 18], v: [0.10, 0.15, 0.20], fx: v => `ergue e derruba o zumbi comum mais resistente (num chefe: ${champPct(v)} da vida)` },
      sup: { nome: 'Eles voltaram', icon: '🛸', v: [20, 30, 40], fx: v => `o disco voador abduz até ${v} zumbis comuns; chefes perdem 25% da vida` },
    },
  },
  ze: {
    nome: 'Zé Distorção', icon: '🎸', color: '255,140,60',
    desc: 'Roqueiro que nunca largou a guitarra. Quando ele toca, o abrigo inteiro luta melhor.',
    look: { skin: [224, 176, 140], hair: [20, 20, 20], longHair: true, beard: [30, 26, 22], shirt: [28, 28, 32], pants: [44, 54, 92], bandana: [170, 30, 30] },
    atk: { cd: 0.8, dmg: 0.5, fx: 'pick' },
    skills: {
      p1: { id: 'gfire', nome: 'Ritmo', icon: '🥁', v: [0.05, 0.10, 0.15], fx: v => `guardas atiram ${champPct(v)} mais rápido` },
      p2: { id: 'rest', nome: 'Show de domingo', icon: '🎶', v: [0.2, 0.4, 0.6], fx: v => `o cansaço dos guardas se recupera ${champPct(v)} mais rápido` },
      act: { nome: 'Acorde pesado', icon: '🔊', cd: [24, 20, 16], v: [2, 3, 4], fx: v => `atordoa por ${v}s todos os zumbis perto do muro` },
      sup: { nome: 'Solo final', icon: '🤘', v: [15, 20, 25], fx: v => `mata os zumbis comuns perto do muro e todos atiram 2x mais rápido por ${v}s` },
    },
  },
};
const SKILL_SLOTS = ['p1', 'p2', 'act', 'sup'];
const SKILL_KIND = { p1: 'passiva', p2: 'passiva', act: 'ativa (A)', sup: 'suprema (S)' };

const Champions = (() => {
  const rand = (a, b) => a + Math.random() * (b - a);
  // saves antigos podem não ter o campo: cria na hora
  const C = () => S.meta.champ || (S.meta.champ = blank());
  // boxes: caixas para abrir ({ k: 'chefe' | 'presente' | 'airdrop', w: onda em que caiu (o nível), s: semente do sorteio }) · frags: fragmentos de heróis ainda não liberados · caps: 🏷️ Tampinhas
  const blank = () => ({ cur: null, owned: {}, charge: 0, actT: 0, gift: false, frags: {}, caps: 0, boxes: [], pity: 0 });
  const cur = () => { const c = C(); return c && c.cur && c.owned[c.cur] ? c.cur : null; };
  const me = () => { const k = cur(); return k ? C().owned[k] : null; };
  const rank = (slot, k = cur()) => (k && C().owned[k] && C().owned[k].r[slot]) || 0;
  const xpNeed = l => Math.round(50 * 1.28 ** (l - 1));
  const spent = h => SKILL_SLOTS.reduce((a, s) => a + CHAMP_RANK_COST.slice(0, h.r[s]).reduce((x, y) => x + y, 0), 0);
  const points = h => h.lvl - spent(h);
  const dmgLvl = () => 1 + CHAMP_LVL_DMG * ((me() && me().lvl) || 1) - CHAMP_LVL_DMG;
  // dano base de um golpe do herói (ataque básico ×mult)
  const heroDmg = (mult = 1) => CHAMPS[cur()].atk.dmg * dmgLvl() * Endgame.mult('dmg') * mult;
  const isBoss = z => !!ZTYPES[z.type].boss;
  const alive = () => S.horde.zs.filter(z => !z.dead && !z.under);
  const nearWall = z => z.x <= WORLD.WALL_X + CHAMP_NEAR_WALL;

  // Valor de uma passiva do herói em campo (0 se não tiver)
  function val(id) {
    const k = cur();
    if (!k) return 0;
    for (const s of ['p1', 'p2']) {
      const sk = CHAMPS[k].skills[s];
      if (sk.id === id && rank(s, k)) return sk.v[rank(s, k) - 1];
    }
    return 0;
  }
  // Picadeiro (Seu Bilú): zumbis perto do muro mais lentos
  const slow = z => (nearWall(z) ? 1 - val('slow') : 1);
  // Solo final (Zé): todos atiram 2x mais rápido enquanto dura
  const fury = () => (S.horde.active && (S.horde.solo || 0) > 0 ? 2 : 1);

  // ---------- XP e níveis
  function gainXp(n) {
    const h = me();
    if (!h || h.lvl >= CHAMP_MAX_LVL) return;
    h.xp += n;
    while (h.lvl < CHAMP_MAX_LVL && h.xp >= xpNeed(h.lvl)) {
      h.xp -= xpNeed(h.lvl);
      h.lvl++;
      const T = CHAMPS[cur()];
      addLog(`⭐ ${T.icon} ${T.nome} subiu para o nível ${h.lvl}! +1 ponto de habilidade (aba Exército).`, 'good');
      emit('champLevel', { k: cur(), lvl: h.lvl });
    }
    if (h.lvl >= CHAMP_MAX_LVL) h.xp = 0;
  }

  function grant(k, how) {
    const c = C();
    if (c.owned[k]) return false;
    c.owned[k] = { lvl: 1, xp: 0, r: { p1: 0, p2: 0, act: 0, sup: 0 } };
    if (!c.cur) c.cur = k;
    const T = CHAMPS[k];
    addLog(`🌟 Novo herói de campo${how ? ` (${how})` : ''}: ${T.icon} ${T.nome}! ${T.desc} Luta no telhado, ao lado do líder; distribua os pontos de habilidade na aba Exército.`, 'good');
    emit('champNew', { k });
    return true;
  }

  // ---------- combate (ao vivo)
  let atkT = 0, bearT = 0;
  function strongest(list) { let b = null; for (const z of list) if (!b || z.hp > b.hp) b = z; return b; }
  function nearestTo(z, list, n, r = 45) {
    return list.filter(o => o !== z && Math.abs(o.x - z.x) < r && Math.abs(o.y - z.y) < 20)
      .sort((a, b) => Math.abs(a.x - z.x) - Math.abs(b.x - z.x)).slice(0, n);
  }
  const hurt = (z, dmg, o) => { if (!z.dead) Endgame.hit(z, dmg, 'hero', o); };
  // de qual habilidade vem o dano do herói neste momento (para o campo de treino do debug)
  let tag = null;
  const tagged = (t, f) => (...a) => { const p = tag; tag = t; try { return f(...a); } finally { tag = p; } };
  // derruba um zumbi comum de uma vez, ou tira uma fração da vida de um chefe
  function smite(z, bossFrac) {
    if (z.dead) return;
    if (isBoss(z)) damageZombie(z, (z.maxHp || z.hp) * bossFrac, 'hero', { blast: true });
    else killZombie(z, 'hero');
  }
  const bolt = (from, list) => emit('hbolt', { pts: [from, ...list.map(z => ({ x: z.x, y: zy(z) }))], c: CHAMPS.profeta.color });

  const basicAttack = tagged('basic', basicAttack0);
  function basicAttack0() {
    const k = cur(), T = CHAMPS[k], z = pickTarget();
    if (!z) return false;
    const from = { x: CHAMP_POS.x + 8, y: CHAMP_POS.y - 11 };
    if (T.atk.fx === 'bolt') {
      const chain = [z, ...nearestTo(z, alive(), val('chain'))];
      bolt(from, chain);
      chain.forEach((o, i) => hurt(o, heroDmg(i ? 0.7 : 1), { head: true }));
    } else {
      emit('shot', { src: 'hero', x: z.x, y: zy(z), c: T.color, quiet: T.atk.cd < 1 && Math.random() < 0.5 });
      hurt(z, heroDmg());
    }
    return true;
  }

  // Tecla A
  const useActive = tagged('act', useActive0);
  function useActive0() {
    const k = cur();
    if (!k || !S.horde.active || rank('act') < 1 || C().actT > 0) return false;
    const T = CHAMPS[k], r = rank('act'), v = T.skills.act.v[r - 1], zs = alive();
    if (!zs.length) return false;
    const from = { x: CHAMP_POS.x + 8, y: CHAMP_POS.y - 11 };
    if (k === 'profeta') {
      const z = strongest(zs), chain = [z, ...nearestTo(z, zs, v, 70)];
      bolt(from, chain);
      chain.forEach((o, i) => hurt(o, heroDmg(i ? 2.5 : 4), { head: true }));
    } else if (k === 'x9') {
      const z = zs.reduce((a, b) => (b.x < a.x ? b : a));
      emit('laser', { y: zy(z), x1: from.x, x2: WORLD.RANGE_X + 40, c: T.color });
      for (const o of zs) if (Math.abs(o.y - z.y) < 9) hurt(o, heroDmg(v), { head: true });
    } else if (k === 'bilu') {
      const z = zs.reduce((a, b) => (b.x < a.x ? b : a));
      for (const o of [z, ...nearestTo(z, zs, 12, 35)]) o.stun = Math.max(o.stun || 0, v * (isBoss(o) ? 0.5 : 1));
      emit('hypno', { x: z.x, y: zy(z), r: 40, c: T.color });
    } else if (k === 'imune') {
      const commons = zs.filter(o => !isBoss(o));
      if (!commons.length) return false;
      const z = commons.reduce((a, b) => (b.x < a.x ? b : a));
      for (const o of [z, ...nearestTo(z, commons, 10, 40)]) o.conf = Math.max(o.conf || 0, v);
      emit('hypno', { x: z.x, y: zy(z), r: 40, c: T.color, t: '?!' });
    } else if (k === 'waldir') {
      const commons = zs.filter(o => !isBoss(o)), z = commons.length ? strongest(commons) : strongest(zs);
      emit('abduct', { x: z.x, y: zy(z) });
      smite(z, v);
    } else if (k === 'ze') {
      const near = zs.filter(nearWall);
      for (const o of near) o.stun = Math.max(o.stun || 0, v * (isBoss(o) ? 0.5 : 1));
      emit('riff', { x: WORLD.WALL_X + 30 });
    }
    C().actT = T.skills.act.cd[r - 1];
    addLog(`${T.skills.act.icon} ${T.nome}: ${T.skills.act.nome}!`);
    return true;
  }

  // Tecla S
  const useSupreme = tagged('sup', useSupreme0);
  function useSupreme0() {
    const k = cur(), c = C();
    if (!k || !S.horde.active || rank('sup') < 1 || c.charge < 1) return false;
    const T = CHAMPS[k], v = T.skills.sup.v[rank('sup') - 1], zs = alive();
    if (!zs.length) return false;
    c.charge = 0;
    emit('champSup', { k, nome: T.skills.sup.nome, icon: T.skills.sup.icon, c: T.color });
    if (k === 'profeta') {
      for (const z of zs) emit('hbolt', { pts: [{ x: z.x + rand(-20, 20), y: 0 }, { x: z.x, y: zy(z) }], c: T.color, sky: true });
      for (const z of zs) smite(z, v);
    } else if (k === 'x9') {
      const x0 = WORLD.WALL_X + 25, span = (WORLD.RANGE_X + 60 - x0) / v;
      for (let i = 0; i < v; i++) {
        const x = x0 + span * (i + 0.5);
        emit('explode', { x, y: 175, air: true });
        for (const z of alive()) if (Math.abs(z.x - x) < span * 0.75) smite(z, 0.08);
      }
    } else if (k === 'bilu') {
      for (const z of zs) z.stun = Math.max(z.stun || 0, v * (isBoss(z) ? 0.5 : 1));
      emit('hypno', { x: (WORLD.WALL_X + WORLD.RANGE_X) / 2, y: 170, r: 200, c: T.color, t: '💫' });
    } else if (k === 'imune') {
      for (const z of zs) if (!isBoss(z)) z.conf = Math.max(z.conf || 0, v);
      emit('hypno', { x: (WORLD.WALL_X + WORLD.RANGE_X) / 2, y: 170, r: 200, c: T.color, t: '?!' });
    } else if (k === 'waldir') {
      const commons = zs.filter(z => !isBoss(z)).sort((a, b) => a.x - b.x).slice(0, v);
      for (const z of commons) { emit('abduct', { x: z.x, y: zy(z) }); killZombie(z, 'hero'); }
      for (const z of zs) if (isBoss(z)) { emit('abduct', { x: z.x, y: zy(z) }); smite(z, 0.25); }
    } else if (k === 'ze') {
      for (const z of zs) if (nearWall(z) && !isBoss(z)) killZombie(z, 'hero');
      S.horde.solo = v;
      emit('riff', { x: WORLD.WALL_X + 30, big: true });
    }
    addLog(`${T.skills.sup.icon} ${T.nome}: ${T.skills.sup.nome.toUpperCase()}!`, 'good');
    return true;
  }

  // Chamado a cada passo da horda ao vivo (depois de guardas e torres)
  function hordeTick(dt) {
    const H = S.horde, c = C();
    // zumbis confusos (A Imune) ficam parados se mordendo: perdem vida com o tempo
    for (const z of H.zs) {
      if (z.dead || !(z.conf > 0)) continue;
      z.conf -= dt;
      z.stun = Math.max(z.stun || 0, 0.05);
      tagged('conf', damageZombie)(z, ZTYPES[z.type].hp * hpMult(H.n) * 0.15 * dt, 'hero');
    }
    if (H.solo > 0) H.solo = Math.max(0, H.solo - dt);
    const k = cur();
    if (!k) return;
    if (c.actT > 0) {
      c.actT = Math.max(0, c.actT - dt);
      if (c.actT === 0 && rank('act')) emit('champActReady', { k });
    }
    supCharge(dt);
    atkT -= dt;
    if (atkT <= 0) atkT = basicAttack() ? CHAMPS[k].atk.cd / fireMult() * (0.9 + Math.random() * 0.2) : 0.3;
    // Urso amigo (Seu Bilú): bate em quem está atacando o muro
    if (val('bear')) {
      bearT -= dt;
      if (bearT <= 0) {
        bearT = 1;
        const at = H.zs.filter(z => !z.dead && z.state === 'attack');
        if (at.length) { const z = at[Math.floor(Math.random() * at.length)]; emit('bear', { x: z.x, y: z.y }); tagged('bear', hurt)(z, val('bear') * dmgLvl() * Endgame.mult('dmg')); }
      }
    }
  }

  // Para-raios (Profeta): tiro de torre que acerta pode soltar uma faísca
  function onTowerHit(z) {
    if (!val('spark') || Math.random() >= val('spark')) return;
    const near = nearestTo(z, alive(), 2);
    if (!near.length) return;
    bolt({ x: z.x, y: zy(z) }, near);
    for (const o of near) tagged('spark', hurt)(o, heroDmg(0.6), { head: true });
  }

  function onKill(z, src) {
    const k = cur(), c = C(), Z = ZTYPES[z.type];
    // cada chefe derrotado ao vivo deixa uma caixa de herói
    if (Z.boss && S.horde.active) addBox('chefe', `${Bosses.the(z.type)} deixou uma caixa de herói`, { x: z.x, y: zy(z) });
    if (!k || !S.horde.active) return;
    if (src === 'hero') gainXp(Z.loot || 1);
    if (Z.boss) gainXp(30);
    supCharge((src === 'hero' ? 3 : 1) * CHAMP_SUP_KILL / Math.max(1, waveSize(S.horde.n)) + (Z.boss ? CHAMP_SUP_BOSS : 0));
  }

  // adianta a recarga da suprema em `sec` segundos (charge vai de 0 a 1)
  function supCharge(sec) {
    const k = cur(), c = C(), r = rank('sup');
    if (!k || r < 1 || c.charge >= 1) return;
    c.charge = Math.min(1, c.charge + sec / CHAMP_SUP_CD[r - 1]);
    if (c.charge >= 1) { addLog(`${CHAMPS[k].skills.sup.icon} Suprema pronta: ${CHAMPS[k].skills.sup.nome} (S)!`, 'good'); emit('champReady', { k }); }
  }

  function onWaveEnd(H) {
    const c = C();
    if (cur()) gainXp(6 * H.n);
    // primeiro herói de campo: chega uma única vez por save, a partir da onda 10
    if (!c.gift && H.n >= CHAMP_GIFT_WAVE) {
      c.gift = true;
      if (Object.keys(CHAMPS).some(k => !c.owned[k])) {
        addBox('presente', `Depois da onda ${H.n}, uma caixa misteriosa apareceu na porta do abrigo`);
        // ao vivo, ela abre na hora (com a animação)
        if (!simulating && typeof document !== 'undefined' && !document.hidden) setTimeout(() => { if (!modalOpen) openBox(); }, 1200);
        return;
      }
    }
    // caixas guardadas: no fim da horda, a caixa do cenário chama para abrir
    if (!simulating && typeof document !== 'undefined' && c.boxes.length) setTimeout(() => { if (!S.horde.active) nudge(); }, 1800);
  }

  // ---------- caixas e fragmentos
  // at: onde a caixa caiu no cenário (chefe derrotado), para a animação
  // A caixa guarda a onda em que caiu (o nível dela: os recursos seguem essa onda, não a da hora de abrir)
  // e uma semente: o sorteio sai sempre igual, então exportar/importar o save não dá outra chance.
  const dropWave = () => Math.max(1, (S.horde.active && S.horde.n) || S.wave || 1);
  const newSeed = () => (Math.random() * 2 ** 32) >>> 0;
  // saves antigos guardavam só o tipo ('chefe'): vira caixa do nível atual
  const normBox = b => (typeof b === 'string' ? { k: b, w: dropWave(), s: newSeed() } : b);
  function boxes() { const c = C(); if (c.boxes.some(b => typeof b === 'string')) c.boxes = c.boxes.map(normBox); return c.boxes; }
  // gerador com semente (mulberry32)
  const seededRng = seed => () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  function addBox(kind, why, at) {
    const w = dropWave();
    boxes().push({ k: kind, w, s: newSeed() });
    addLog(`📦 ${why} (Nv. ${w})! Clique na caixa em cima do abrigo para abrir.`, 'good');
    emit('box', { kind, ...(at || {}) });
  }
  const missing = () => Object.keys(CHAMPS).filter(k => !C().owned[k]);
  // herói com os fragmentos completos, esperando o jogador invocar (aba Exército)
  const isReady = k => !C().owned[k] && (C().frags[k] || 0) >= BOX.frags;
  const readyList = () => Object.keys(CHAMPS).filter(isReady);
  const pickOf = (a, rng = Math.random) => a[Math.floor(rng() * a.length)];

  // Sorteia o conteúdo de uma caixa: estrelas, fragmentos, herói completo e recursos (sem aplicar nada ainda)
  // box: { k, w, s } · o sorteio usa a semente da caixa e os recursos, o nível (w) dela
  function rollBox(box) {
    box = normBox(box);
    const kind = box.k, rng = seededRng(box.s), pickR = a => pickOf(a, rng);
    const c = C(), all = missing(), miss = all.filter(k => !isReady(k));   // miss: quem ainda precisa de fragmentos
    let stars = 1;
    if (kind === 'presente' && all.length) stars = 3;
    else if (kind === 'airdrop') stars = 2;   // a carga rara do airdrop
    // a ★★★ sai mesmo com todos os heróis liberados: aí o herói vem repetido e vira Tampinhas
    else if (rng() < BOX.up2) { stars = 2; if (rng() < BOX.up3) stars = 3; }
    // garantia: depois de BOX.pity - 1 caixas seguidas sem fragmento de herói novo, a próxima sai ★★
    else if (miss.length && c.pity + 1 >= BOX.pity) stars = 2;
    const r = { kind, w: box.w, stars, frags: {}, hero: null, res: {}, samples: {}, caps: BOX.capsBy[stars] || 0 };
    // ★★★: prefere quem ainda precisa de fragmentos, depois quem falta; com todos liberados, qualquer um (repetido)
    if (stars === 3) { r.hero = pickR(miss.length ? miss : all.length ? all : Object.keys(CHAMPS)); return r; }
    // fragmentos só na ★★ (3 ou 4, ao menos um de quem ainda falta); a ★ traz só recursos
    if (stars === 2) {
      const add = k => { r.frags[k] = (r.frags[k] || 0) + 1; };
      const n = 3 + (rng() < 0.5 ? 1 : 0), every = Object.keys(CHAMPS);
      for (let i = 0; i < n; i++) add(pickR(every));
      if (miss.length && !Object.keys(r.frags).some(k => miss.includes(k))) add(pickR(miss));
    }
    const w = Math.max(1, box.w || 1);
    r.res.sucata = Math.round((stars === 1 ? 25 : 60) * w);
    r.res.municao = Math.round((stars === 1 ? 5 : 12) * w);
    if (stars === 2) for (let i = 0; i < 2; i++) { const s = pickR(['acido', 'gas', 'tecido']); r.samples[s] = (r.samples[s] || 0) + 1; }
    return r;
  }

  // Aplica o conteúdo: fragmentos de quem falta acumulam até 6 (aí o herói fica pronto para invocar, na aba Exército);
  // de quem já está liberado (ou já está pronto), viram 🏷️ Tampinhas
  function applyBox(r) {
    const c = C(), out = { items: [], unlocked: [], ready: [], caps: 0, dupHero: 0 };
    // Tampinhas fixas da caixa (todas as estrelas)
    if (r.caps) { c.caps += r.caps; out.caps += r.caps; }
    if (r.hero) {
      c.pity = 0;
      // herói que você já tem: vira Tampinhas (o valor dos 6 fragmentos)
      if (c.owned[r.hero]) { out.dupHero = BOX.frags * BOX.caps; c.caps += out.dupHero; out.caps += out.dupHero; return out; }
      grant(r.hero, 'caixa ★★★'); out.unlocked.push(r.hero);
      // fragmentos que já estavam guardados para ele não servem mais: viram Tampinhas
      const left = c.frags[r.hero] || 0;
      if (left) { c.frags[r.hero] = 0; const v = left * BOX.caps; c.caps += v; out.caps += v; }
      return out;
    }
    const miss = missing().filter(k => !isReady(k));
    c.pity = Object.keys(r.frags).some(k => miss.includes(k)) ? 0 : c.pity + 1;
    const toCaps = (k, n) => { const caps = n * BOX.caps; c.caps += caps; out.caps += caps; out.items.push({ k, n, caps }); };
    for (const [k, n] of Object.entries(r.frags)) {
      const before = c.frags[k] || 0;
      if (c.owned[k] || before >= BOX.frags) { toCaps(k, n); continue; }
      const add = Math.min(n, BOX.frags - before);
      c.frags[k] = before + add;
      out.items.push({ k, n: add, have: c.frags[k] });
      if (c.frags[k] >= BOX.frags) { out.ready.push(k); addLog(`✨ ${CHAMPS[k].icon} ${CHAMPS[k].nome}: ${BOX.frags} fragmentos reunidos! Invoque no cenário ou na aba Exército.`, 'good'); }
      if (n > add) toCaps(k, n - add);
    }
    for (const [res, v] of Object.entries(r.res)) S.res[res] += v;
    for (const [s, v] of Object.entries(r.samples)) S.meta.samples[s] = (S.meta.samples[s] || 0) + v;
    return out;
  }

  // Abre a próxima caixa. silent: sem animação (bot e testes)
  function openBox(silent) {
    const c = C();
    if (!boxes().length) return null;
    const box = c.boxes.shift(), r = rollBox(box), out = applyBox(r);
    const parts = out.items.map(i => `${CHAMPS[i.k].icon} +${i.n}${i.caps ? ` (+${i.caps} 🏷️)` : ` (${i.have}/${BOX.frags})`}`);
    for (const [res, v] of Object.entries(r.res)) if (v) parts.push(`+${fmt(v)} ${RES[res].icon}`);
    if (r.caps) parts.push(`+${r.caps} 🏷️`);
    const heroTxt = r.hero && (out.dupHero
      ? `${CHAMPS[r.hero].icon} ${CHAMPS[r.hero].nome} repetido, virou +${out.dupHero} 🏷️, e +${r.caps} 🏷️`
      : `herói completo, ${CHAMPS[r.hero].icon} ${CHAMPS[r.hero].nome}!${r.caps ? ` E +${r.caps} 🏷️` : ''}`);
    // o registro só aparece quando a caixa abre (para não estragar a surpresa)
    const log = () => addLog(`📦 Caixa ${'★'.repeat(r.stars)} (Nv. ${r.w}): ${r.hero ? heroTxt : parts.join(', ')}`, r.stars > 1 ? 'good' : '');
    if (silent) { log(); readyList().forEach(k => summon(k, true)); }   // bot e testes: invoca direto
    else showBox(r, out, log);
    return r;
  }

  // ---------- fragmento comprado com cash: conteúdo garantido (você escolhe o herói), 1 por dia
  // (o "dia" é o intervalo antes de cada horda, como o limite de recrutas)
  const fragToday = () => (C().fragDay === S.wave ? 1 : 0);
  function fragBlock(k) {
    if (k && (C().owned[k] || isReady(k))) return 'Este herói não precisa de fragmentos';
    if (!missing().some(x => !isReady(x))) return 'Nenhum herói precisando de fragmentos';
    if (fragToday() >= FRAG_DAY) return 'Já comprou o fragmento de hoje: volta depois da próxima horda';
    if (S.meta.cash < FRAG_COST) return `Cash insuficiente (precisa de 💵 ${FRAG_COST})`;
    return '';
  }
  function buyFrag(k) {
    if (!CHAMPS[k] || fragBlock(k)) return false;
    const c = C();
    S.meta.cash -= FRAG_COST;
    c.fragDay = S.wave;
    c.frags[k] = (c.frags[k] || 0) + 1;
    S.meta.stats.fragsBought = (S.meta.stats.fragsBought || 0) + 1;
    addLog(`🧩 Fragmento de ${CHAMPS[k].icon} ${CHAMPS[k].nome} comprado (${c.frags[k]}/${BOX.frags}).`, 'good');
    if (isReady(k)) addLog(`✨ ${CHAMPS[k].icon} ${CHAMPS[k].nome}: ${BOX.frags} fragmentos reunidos! Invoque no cenário ou na aba Exército.`, 'good');
    emit('summonShard', { i: Math.min(5, c.frags[k] - 1) });
    sig = ''; fsig = '';
    return true;
  }
  // Loja: escolher de qual herói comprar o fragmento
  function fragPicker() {
    const list = () => missing().filter(k => !isReady(k));
    openDialog({
      title: '🧩 Comprar fragmento de herói',
      plain: true,
      body: () => `<p class="event-text">Escolha um herói de campo que você ainda não tem. Cada fragmento custa <b>💵 ${FRAG_COST}</b>, e dá para comprar <b>${FRAG_DAY} por dia</b> (volta a cada horda vencida). ${BOX.frags} fragmentos liberam o herói.</p>
        ${fragBlock() ? `<p class="hint warn-text">${fragBlock()}</p>` : ''}
        <div class="frag-pick">${list().map(k => {
          const T = CHAMPS[k], f = C().frags[k] || 0;
          return `<button class="frag-opt" data-opt="${k}" ${fragBlock(k) ? 'disabled' : ''}>
            <span class="frag-face">${shards(k, 52, f)}</span><b>${T.icon} ${T.nome}</b><small>${f}/${BOX.frags} fragmentos</small></button>`;
        }).join('')}</div>`,
      onMount: () => paintFaces($('dialog-body')),
      onOpt: (k, d) => { if (buyFrag(k)) d.close(); },
      cancel: 'Fechar',
    });
  }

  // ---------- invocar: os 6 fragmentos se juntam e o herói aparece (silent: sem animação)
  function summon(k, silent) {
    if (!isReady(k)) return false;
    const c = C();
    let granted = false;
    const finish = () => { if (granted) return; granted = true; c.frags[k] -= BOX.frags; grant(k, `${BOX.frags} fragmentos reunidos`); };
    if (silent || typeof document === 'undefined') { finish(); return true; }
    const T = CHAMPS[k], col = `rgb(${T.color})`;
    // fragmentos espalhados em volta, cada um com a sua fatia do retrato
    const pieces = HEX.map((p, i) => {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2 + rand(-0.3, 0.3), dist = rand(110, 150);
      return `<div class="sm-shard" style="--dx:${Math.cos(a) * dist}px;--dy:${Math.sin(a) * dist}px;--rot:${rand(-160, 160)}deg;--i:${i};clip-path:polygon(50% 50%, ${p[0]}% ${p[1]}%, ${HEX[(i + 1) % 6][0]}% ${HEX[(i + 1) % 6][1]}%)">${face(k, 120)}</div>`;
    }).join('');
    const steps = [];
    const d = openDialog({
      title: '✨ Invocação',
      plain: true, staticBody: true, cancel: 'Continuar', onClose: () => { steps.forEach(clearTimeout); finish(); },
      body: `<div class="summon" id="summon" style="--hc:${col}">
        <div class="sm-stage"><div class="sm-rays"></div><div class="sm-ring"></div>${pieces}
          <div class="sm-hero">${face(k, 120)}</div><div class="sm-flash"></div><div class="box-fx" id="sm-fx"></div></div>
        <div class="sm-name">${T.icon} ${T.nome}</div>
        <div class="sm-desc">${T.desc}</div>
        <div class="sm-msg" id="sm-msg">Os fragmentos estão se juntando...</div>
        <p class="hint" id="sm-skip"><a href="#" id="sm-skip-btn">pular</a></p>
      </div>`,
    });
    const el = document.getElementById('summon');
    paintFaces(el);
    const later = (ms, f) => steps.push(setTimeout(() => { if (d.open) f(); }, ms));
    const reveal = () => {
      steps.forEach(clearTimeout);
      finish();
      el.classList.add('in', 'charge', 'reveal');
      const m = document.getElementById('sm-msg'); if (m) m.textContent = 'Um novo herói se juntou ao abrigo!';
      const sk = document.getElementById('sm-skip'); if (sk) sk.remove();
      const fx = document.getElementById('sm-fx');
      for (let i = 0; fx && i < 36; i++) {
        const a = Math.random() * Math.PI * 2, dist = 70 + Math.random() * 110, p = document.createElement('i');
        p.className = 'box-p';
        p.style.cssText = `--dx:${Math.cos(a) * dist}px;--dy:${Math.sin(a) * dist}px;--c:${Math.random() < 0.35 ? '#fff' : col};animation-delay:${Math.random() * 0.1}s`;
        fx.appendChild(p); setTimeout(() => p.remove(), 1100);
      }
      const db = document.getElementById('dialog-body');
      if (db) { db.classList.remove('quake3'); void db.offsetWidth; db.classList.add('quake3'); setTimeout(() => db.classList.remove('quake3'), 600); }
      emit('summonBoom', {});
      emit('champCry', { k });
    };
    later(60, () => el.classList.add('float'));
    HEX.forEach((_, i) => later(450 + i * 200, () => { el.querySelectorAll('.sm-shard')[i].classList.add('in'); emit('summonShard', { i }); }));
    later(450 + 6 * 200 + 150, () => { el.classList.add('charge'); emit('summonCharge', {}); });
    later(450 + 6 * 200 + 1250, reveal);
    document.getElementById('sm-skip-btn').onclick = e => { e.preventDefault(); reveal(); };
    return true;
  }

  // ---------- abrir a caixa clicando
  // O conteúdo já foi sorteado (rollBox) e aplicado; os cliques só revelam. A caixa começa em ★ e o jogador
  // tem BOX_TRIES cliques: cada um sacode a caixa e é uma tentativa de subir uma estrela. Depois ela abre.
  const BOX_TRIES = 2;
  const BOX_COLOR = ['', '#e8e8e8', '#8fc8ff', '#ffd84a'];
  // em qual clique cada estrela sobe: ★ nunca sobe, ★★★ sobe nos dois, ★★ sobe no 1º ou no 2º
  function boxPath(stars) {
    if (stars >= 3) return [true, true];
    if (stars === 2) return Math.random() < 0.5 ? [true, false] : [false, true];
    return [false, false];
  }

  function showBox(r, out, log) {
    // prêmios como cartas do mesmo tamanho: raridade (cor), ícone, quantidade, nome e rodapé (barra ou nota)
    // r: 'hero' (herói completo) · 'new' (fragmento de quem falta) · 'caps' (repetido, vira Tampinhas) · 'res' · 'sample'
    const items = [];
    const card = (rar, tag, icon, amount, name, foot = '', badge = '') => items.push({ rar, html:
      `<div class="bx-tag">${tag}</div><div class="bx-icon">${icon}${badge ? `<span class="bx-badge">${badge}</span>` : ''}</div>
       <div class="bx-amt">${amount}</div><div class="bx-name">${name}</div><div class="bx-foot">${foot}</div>` });
    if (r.hero && out.dupHero) {
      // herói repetido: a carta mostra o herói e, logo depois, ele se desfaz em Tampinhas (classe .convert)
      const T = CHAMPS[r.hero];
      items.push({ rar: 'hero', dup: true, cry: r.hero, html: `<div class="bx-view bx-hero-view"><div class="bx-tag">JÁ LIBERADO</div><div class="bx-icon">${face(r.hero, 72)}</div>
          <div class="bx-amt">${T.nome}</div><div class="bx-name">Você já tem este herói...</div></div>
        <div class="bx-view bx-caps-view"><div class="bx-tag">VIROU TAMPINHAS</div><div class="bx-icon">🏷️</div>
          <div class="bx-amt">+${out.dupHero} 🏷️</div><div class="bx-name">${T.nome} já estava liberado: os ${BOX.frags} fragmentos viraram Tampinhas</div></div>` });
    } else if (r.hero) {
      const T = CHAMPS[r.hero];
      items.push({ rar: 'hero', cry: r.hero, html: `<div class="bx-tag">NOVO HERÓI</div><div class="bx-icon">${face(r.hero, 72)}</div>
        <div class="bx-amt">${T.nome}</div><div class="bx-name">${T.desc}</div>` });
    }
    // Tampinhas fixas da caixa
    if (r.caps) card('caps', 'Tampinhas', '🏷️', `+${r.caps} 🏷️`, 'Tampinhas', '<small>para skins na Loja</small>');
    const frags = [...out.items].sort((a, b) => (a.caps ? 1 : 0) - (b.caps ? 1 : 0));
    for (const i of frags) {
      const T = CHAMPS[i.k], fr = `fragmento${i.n > 1 ? 's' : ''}`;
      if (i.caps) { card('caps', 'Repetido', shards(i.k, 48, 1, 0), `+${i.caps} 🏷️`, `${i.n} ${fr} de ${T.nome}`, 'virou Tampinhas', '🏷️'); continue; }
      // o retrato em 6 fragmentos: os que você tem acesos, os novos brilham ao encaixar
      const full = out.ready.includes(i.k), left = BOX.frags - i.have;
      card(full ? 'hero' : 'new', full ? 'Completo!' : 'Fragmento de herói', shards(i.k, 52, i.have, i.n), `+${i.n} ${fr}`, T.nome,
        full ? `<b class="bx-ready">✨ Pronto para invocar!</b>` : `<small>${i.have}/${BOX.frags} · faltam <b>${left}</b> para liberar</small>`);
    }
    if (r.res.sucata) card('res', 'Recurso', '🔩', `+${fmt(r.res.sucata)}`, 'sucata');
    if (r.res.municao) card('res', 'Recurso', '🔫', `+${fmt(r.res.municao)}`, 'munição');
    for (const [s, v] of Object.entries(r.samples)) card('sample', 'Amostra', Endgame.SAMPLES[s].icon, `+${v}`, Endgame.SAMPLES[s].nome);
    const RARE = { hero: 3, new: 2, sample: 1, caps: 1, res: 0 };

    const path = boxPath(r.stars);
    let cur = 1, tries = 0, busy = false, done = false, logged = false;
    const doLog = () => { if (!logged) { logged = true; log(); } };
    const d = openDialog({
      title: `${r.kind === 'presente' ? '🎁 Caixa misteriosa' : '📦 Caixa de herói'} · Nv. ${r.w}`,
      plain: true, staticBody: true, cancel: 'Continuar', onClose: doLog,
      // completou os fragmentos de alguém: dá para invocar direto daqui
      buttons: out.ready.map(k => ({ label: `✨ Invocar ${CHAMPS[k].nome}`, cls: 'primary', hidden: () => !done,
        onClick: () => { doLog(); summon(k); } })),
      body: `<div class="box-anim lv1" id="box-anim">
        <div class="box-confetti" id="box-confetti"></div>
        <div class="box-stage" id="box-stage" title="Clique para sacudir">
          <div class="box-rays"></div><div class="box-flash" id="box-flash"></div>
          <div class="box" id="box-icon">📦</div><div class="box-fx" id="box-fx"></div>
        </div>
        <div class="box-stars" id="box-stars"></div>
        <div class="box-tries" id="box-tries"></div>
        <div class="box-msg" id="box-msg">${r.kind === 'presente' ? 'Alguém deixou isto na porta... clique para sacudir!' : 'Clique na caixa para sacudir!'}</div>
        <div class="box-items" id="box-items"></div>
        <p class="hint box-lv">📦 <b>Nv. ${r.w}</b>: a caixa caiu na onda ${r.w}, e a sucata e a munição seguem esse nível${r.w < S.wave ? ' (guardar caixas não aumenta o prêmio)' : ''}.</p>
        <p class="hint" id="box-skip">Cada clique é uma chance de subir uma estrela · <a href="#" id="box-skip-btn">abrir direto</a></p>
      </div>`,
    });
    const $b = id => document.getElementById(id);
    const steps = [];
    const later = (ms, f) => steps.push(setTimeout(() => { if (d.open) f(); }, ms));
    const anim = $b('box-anim'), dbox = $b('dialog-body');
    // recomeça uma animação CSS (remove a classe, força o reflow e põe de novo)
    const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
    const star = (n, pop) => {
      $b('box-stars').innerHTML = Array.from({ length: n }, (_, i) => `<span class="${pop && i === n - 1 ? 'pop' : ''}" style="color:${BOX_COLOR[n]}">★</span>`).join('');
    };
    const pips = () => {
      $b('box-tries').innerHTML = done ? '' : Array.from({ length: BOX_TRIES }, (_, i) =>
        `<span class="${i < tries ? (path[i] ? 'up' : 'miss') : ''}">${i < tries ? (path[i] ? '▲' : '✕') : '●'}</span>`).join('');
    };
    const level = n => { anim.classList.remove('lv1', 'lv2', 'lv3'); anim.classList.add('lv' + n); };
    const icon = (cls, txt) => { const e = $b('box-icon'); e.className = 'box ' + cls; if (txt) e.textContent = txt; };
    const msg = s => { $b('box-msg').textContent = s; };
    // partículas saindo do centro da caixa
    const burst = (n, count) => {
      const fx = $b('box-fx');
      if (!fx) return;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, dist = 50 + Math.random() * (40 + n * 30);
        const p = document.createElement('i');
        p.className = 'box-p';
        p.style.cssText = `--dx:${Math.cos(a) * dist}px;--dy:${Math.sin(a) * dist}px;--c:${Math.random() < 0.3 ? '#fff' : BOX_COLOR[n]};animation-delay:${Math.random() * 0.08}s`;
        fx.appendChild(p);
        setTimeout(() => p.remove(), 1100);
      }
    };
    const confetti = () => {
      const box = $b('box-confetti');
      if (!box) return;
      const cols = ['#ffd84a', '#ff6b6b', '#6fe39a', '#8fc8ff', '#ff9ff3', '#ffffff'];
      for (let i = 0; i < 70; i++) {
        const p = document.createElement('i');
        p.className = 'box-cf';
        p.style.cssText = `left:${Math.random() * 100}%;background:${pickOf(cols)};--rot:${Math.random() * 720 - 360}deg;--sx:${Math.random() * 80 - 40}px;` +
          `animation-duration:${1.6 + Math.random() * 1.4}s;animation-delay:${Math.random() * 0.5}s`;
        box.appendChild(p);
        setTimeout(() => p.remove(), 3600);
      }
    };
    const quake = n => { if (dbox) replay(dbox, 'quake' + n); setTimeout(() => dbox && dbox.classList.remove('quake' + n), 600); };
    const flash = () => replay($b('box-flash'), 'on');

    star(1); pips(); icon('idle s1');
    emit('boxStar', { n: 1 });

    // as cartas saem da caixa viradas e depois giram uma a uma (o herói completo vem em destaque, maior)
    const deal = instant => {
      const box = $b('box-items');
      anim.classList.add('opened');
      box.innerHTML = items.map((it, i) => `<div class="bx-card r-${it.rar}${it.rar === 'hero' && r.hero && i === 0 ? ' feature' : ''}${instant ? ' up' : ''}" style="--i:${i}">
        <div class="bx-in"><div class="bx-back">?</div><div class="bx-front">${it.html}</div></div></div>`).join('');
      paintFaces(box);
      const cards = [...box.querySelectorAll('.bx-card')];
      const fill = c => c.querySelectorAll('[data-to]').forEach(b => { b.style.width = b.dataset.to; });
      // herói repetido: depois de aparecer, ele se converte em Tampinhas
      const convert = (c, wait) => later(wait, () => { c.classList.add('convert'); emit('capsConvert', {}); });
      if (instant) {
        cards.forEach(fill);
        if (r.hero) emit('champCry', { k: r.hero });
        cards.forEach((c, i) => { if (items[i].dup) convert(c, 1200); });
        return;
      }
      cards.forEach((c, i) => later(650 + cards.length * 70 + i * 420, () => {
        c.classList.add('flip');
        setTimeout(() => {
          c.classList.add('up'); c.classList.remove('flip'); emit('boxItem', { rare: RARE[items[i].rar] });
          if (items[i].cry) setTimeout(() => emit('champCry', { k: items[i].cry }), 250);   // o herói "se apresenta"
        }, 180);
        setTimeout(() => fill(c), 450);
        if (items[i].dup) convert(c, 1900);
      }));
    };

    // abre a caixa e solta os prêmios (instant: tudo de uma vez, ao pular)
    const openIt = instant => {
      if (done) return;
      done = true; busy = true;
      steps.forEach(clearTimeout);
      const n = r.stars;
      cur = n; star(n, !instant); level(n); pips();
      icon('open s' + n, n >= 3 ? '🌟' : '✨');
      flash(); burst(n, 14 + n * 10); quake(n);
      if (n >= 3 && !out.dupHero) confetti();   // herói repetido: sem a festa toda
      emit('boxOpen', { n, hero: !!r.hero });
      msg(r.hero ? (out.dupHero ? 'Um herói saiu da caixa... mas você já tem!' : 'Um herói saiu da caixa!') : n >= 2 ? 'Caixa ★★! Prêmios:' : 'Prêmios:');
      const skip = $b('box-skip'); if (skip) skip.remove();
      deal(instant);
      doLog();
      if (out.ready.length) d.refresh(false);   // mostra o botão de invocar
    };

    // cada clique: a caixa sacode e, no fim da sacudida, sobe uma estrela ou não
    const attempt = () => {
      if (busy || done || tries >= BOX_TRIES) return;
      busy = true; tries++;
      icon('shake s' + cur);
      msg('...');
      emit('boxShake', { n: cur, i: tries });
      later(700, () => {
        const up = path[tries - 1];
        if (up) {
          cur++;
          star(cur, true); level(cur); icon('idle s' + cur);
          flash(); burst(cur, 10 + cur * 8); quake(cur);
          msg(cur >= 3 ? 'LENDÁRIA! ★★★' : 'SUBIU! ★★');
          emit('boxStar', { n: cur });
        } else {
          icon('fail s' + cur);
          msg('Não subiu...');
          emit('boxFail', { n: cur });
        }
        pips();
        if (tries >= BOX_TRIES) later(up ? 1000 : 750, () => openIt(false));
        else later(up ? 450 : 350, () => { busy = false; msg(`Clique de novo! (${BOX_TRIES - tries} tentativa${BOX_TRIES - tries > 1 ? 's' : ''})`); icon('idle s' + cur); });
      });
    };
    $b('box-stage').onclick = attempt;
    $b('box-skip-btn').onclick = e => { e.preventDefault(); e.stopPropagation(); openIt(true); };
  }

  // ---------- árvore de habilidades
  function canRaise(k, slot) {
    const h = C().owned[k];
    if (!h) return false;
    const r = h.r[slot];
    if (r >= 3) return false;
    if (slot === 'sup' && h.lvl < CHAMP_SUP_LVL[r]) return false;
    return points(h) >= CHAMP_RANK_COST[r];
  }
  function raise(arg) {
    const [k, slot] = String(arg).split(':');
    if (!canRaise(k, slot)) return;
    C().owned[k].r[slot]++;
    if (slot === 'sup' && C().owned[k].r.sup === 1) C().charge = C().charge || 0;
  }
  // redistribuir os pontos: só de dia
  function reset(k) {
    const h = C().owned[k];
    if (!h || S.horde.active) return;
    h.r = { p1: 0, p2: 0, act: 0, sup: 0 };
    if (cur() === k) C().charge = 0;
    addLog(`↩️ Pontos de ${CHAMPS[k].nome} devolvidos.`);
  }
  function pick(k) {
    const c = C();
    if (!c.owned[k] || S.horde.active || c.cur === k) return;
    c.cur = k; c.charge = 0; c.actT = 0;
    addLog(`${CHAMPS[k].icon} ${CHAMPS[k].nome} assumiu o posto no telhado.`);
    emit('champPick', { k });
  }

  // ---------- interface
  const pips = r => [0, 1, 2].map(i => (i < r ? '◆' : '◇')).join('');
  // retrato do herói: canvas com data-face, desenhado pela cena com o visual dele (paintFaces depois de pôr no DOM)
  const face = (k, size = 48, cls = '') => `<canvas class="champ-face ${cls}" data-face="${k}" width="${size}" height="${size}" aria-label="${CHAMPS[k].nome}"></canvas>`;
  // fragmentos: o retrato num hexágono partido em 6 fatias (uma por fragmento). have: quantas estão acesas;
  // fresh: as últimas `fresh` acabaram de chegar e brilham ao encaixar
  const HEX = [[50, 0], [93.3, 25], [93.3, 75], [50, 100], [6.7, 75], [6.7, 25]];
  const shards = (k, size, have, fresh = 0) => {
    const tris = HEX.map((p, i) => {
      const q = HEX[(i + 1) % 6], cls = i < have - fresh ? 'on' : i < have ? 'on new' : 'off';
      return `<polygon class="${cls}" style="--j:${i - (have - fresh)}" points="50,50 ${p} ${q}"/>`;
    }).join('');
    return `<div class="shard${have >= BOX.frags ? ' full' : ''}" style="--s:${size}px">${face(k, size)}<svg viewBox="0 0 100 100" aria-hidden="true">${tris}</svg></div>`;
  };
  // visual do herói com o traje alternativo equipado (skins de herói), se houver
  const heroLook = k => (typeof OSkins !== 'undefined' ? OSkins.heroLook(k, CHAMPS[k].look) : CHAMPS[k].look);
  function paintFaces(root) {
    if (!root || typeof Scene === 'undefined') return;
    root.querySelectorAll('canvas[data-face]').forEach(c => Scene.portrait(c, heroLook(c.dataset.face), true));
  }
  // prévia animada (js/demos.js) ao passar o mouse
  const demoAttr = (k, slot) => (typeof Demos !== 'undefined' ? Demos.attr(`ch:${k}:${slot}`) : '');
  const demoChips = k => {
    const T = CHAMPS[k];
    return `<div class="champ-demos"><span class="lvl">▶ Prévias:</span>${[['basic', '⚔️ Ataque básico'], ['act', `${T.skills.act.icon} ${T.skills.act.nome}`], ['sup', `${T.skills.sup.icon} ${T.skills.sup.nome}`]]
      .map(([s, l]) => `<span class="chip"${demoAttr(k, s)}>${l}</span>`).join('')}</div>`;
  };
  // ---------- árvore de habilidades (janela própria)
  // Estado de um nó: max (completo) · can (dá para aprender agora) · lvl (travado por nível) · poor (faltam pontos) · locked (herói bloqueado)
  function nodeState(k, s) {
    const h = C().owned[k];
    if (!h) return { st: 'locked', r: 0 };
    const r = h.r[s];
    if (r >= 3) return { st: 'max', r };
    const need = s === 'sup' ? CHAMP_SUP_LVL[r] : 0, cost = CHAMP_RANK_COST[r];
    if (need && h.lvl < need) return { st: 'lvl', r, need, cost };
    return { st: points(h) >= cost ? 'can' : 'poor', r, cost, missing: cost - points(h) };
  }
  const tile = (k, s, size = '') => {
    const sk = CHAMPS[k].skills[s], n = nodeState(k, s);
    const corner = n.st === 'lvl' ? `<span class="sk-badge lock">🔒 ${n.need}</span>`
      : n.st === 'can' || n.st === 'poor' ? `<span class="sk-badge ${n.st}">+${n.cost}</span>` : '';
    return `<span class="sk-tile ${n.st}${n.r ? ' learned' : ''} ${size}"><span class="sk-ico">${sk.icon}</span>${corner}</span>
      <span class="sk-pips">${[0, 1, 2].map(i => `<i class="${i < n.r ? 'on' : ''}"></i>`).join('')}</span>`;
  };
  // faixa compacta nos detalhes do herói: as 4 habilidades; clicar abre a árvore naquela habilidade
  function skillStrip(k) {
    const h = C().owned[k], free = h ? points(h) : 0, any = h && canSpend(k);
    return `<div class="sk-strip">
      ${['p1', 'p2', 'act', 'sup'].map(s => `<button class="sk-mini" data-act="champTree" data-k="${k}:${s}" title="${CHAMPS[k].skills[s].nome}">${tile(k, s, 'small')}</button>`).join('')}
      <button class="${any ? 'primary' : ''} sk-open" data-act="champTree" data-k="${k}">🌳 Árvore de habilidades${h && free ? ` <span class="sk-free">${free}</span>` : ''}</button>
    </div>`;
  }

  const TREE_POS = { sup: [50, 17], act: [50, 51], p1: [26, 82], p2: [74, 82] };   // % da área da árvore
  const TREE_LINKS = [['p1', 'act'], ['p2', 'act'], ['act', 'sup']];
  function openTree(k, slot) {
    const T = CHAMPS[k];
    let selS = slot && T.skills[slot] ? slot : 'p1';
    const val = v => (v == null ? '' : v);
    const grades = s => {
      const sk = T.skills[s], h = C().owned[k], r = h ? h.r[s] : 0;
      return [0, 1, 2].map(g => {
        const st = g < r ? 'done' : g === r ? 'next' : 'later';
        const need = s === 'sup' ? CHAMP_SUP_LVL[g] : 0;
        return `<li class="${st}"><span class="g-n">${g < r ? '✔' : g + 1}</span><span class="g-fx">${sk.fx(sk.v[g])}${s === 'act' ? ` · recarga ${sk.cd[g]}s` : s === 'sup' ? ` · recarga ${CHAMP_SUP_CD[g]}s (abates encurtam)` : ''}.</span>
          <span class="g-cost">${CHAMP_RANK_COST[g]} pt${need ? ` · nv. ${need}` : ''}</span></li>`;
      }).join('');
    };
    const body = () => {
      const h = C().owned[k], on = C().cur === k, free = h ? points(h) : 0;
      const sk = T.skills[selS], n = nodeState(k, selS);
      const lines = TREE_LINKS.map(([a, b]) => {
        const lit = h && h.r[a] > 0 && h.r[b] > 0 ? 'lit' : h && h.r[a] > 0 ? 'half' : '';
        return `<line class="${lit}" x1="${TREE_POS[a][0]}" y1="${TREE_POS[a][1]}" x2="${TREE_POS[b][0]}" y2="${TREE_POS[b][1]}"/>`;
      }).join('');
      const nodes = SKILL_SLOTS.map(s => `<button class="sk-node${s === selS ? ' sel' : ''}${s === 'sup' ? ' big' : ''}" data-opt="s:${s}" style="left:${TREE_POS[s][0]}%;top:${TREE_POS[s][1]}%">
          ${tile(k, s, s === 'sup' ? 'big' : '')}<span class="sk-name">${T.skills[s].nome}</span></button>`).join('');
      const why = !h ? '🔒 Invoque o herói para aprender'
        : n.st === 'max' ? '✔ Grau máximo'
        : n.st === 'lvl' ? `🔒 Precisa do nível ${n.need} (agora: ${h.lvl})`
        : n.st === 'poor' ? `Falta${n.missing > 1 ? 'm' : ''} ${n.missing} ponto${n.missing > 1 ? 's' : ''} (ganhe níveis)` : '';
      return `<div class="tree-wrap" style="--hc:rgb(${T.color})">
        <div class="tree-head">
          <div class="tree-portrait">${face(k, 84)}</div>
          <div class="tree-id">
            <div class="tree-name">${T.icon} ${T.nome}</div>
            ${h ? `<div class="lvl">nível ${h.lvl}${h.lvl >= CHAMP_MAX_LVL ? ' (máx.)' : ''}${on ? ' · ⭐ no telhado' : ''}</div>
              ${h.lvl < CHAMP_MAX_LVL ? `<div class="bar mini"><div style="width:${h.xp / xpNeed(h.lvl) * 100}%"></div></div><div class="lvl">XP ${fmt(h.xp)} / ${fmt(xpNeed(h.lvl))}</div>` : ''}`
              : `<div class="lvl">🔒 bloqueado · ${Math.min(BOX.frags, C().frags[k] || 0)}/${BOX.frags} fragmentos</div>`}
          </div>
          <div class="tree-points${free ? ' has' : ''}"><b>${free}</b><span>ponto${free === 1 ? '' : 's'} livre${free === 1 ? '' : 's'}</span></div>
        </div>
        <div class="tree-main">
          <div class="tree-area">
            <svg class="tree-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
            <span class="tree-tier t-sup">Suprema (S)</span><span class="tree-tier t-act">Ativa (A)</span><span class="tree-tier t-pas">Passivas</span>
            ${nodes}
          </div>
          <div class="tree-info">
            <div class="ti-head"><span class="ti-ico">${sk.icon}</span><div><b>${sk.nome}</b><div class="lvl">${SKILL_KIND[selS]} · grau ${n.r}/3</div></div></div>
            <ol class="ti-grades">${grades(selS)}</ol>
            ${n.st === 'can' ? `<button class="primary ti-buy" data-opt="up">Aprender grau ${n.r + 1} · ${n.cost} ponto${n.cost > 1 ? 's' : ''}</button>`
              : `<div class="ti-why ${n.st}">${why}</div>`}
            ${selS === 'act' || selS === 'sup' ? `<span class="chip ti-demo"${demoAttr(k, selS)}>▶ Ver prévia</span>` : ''}
          </div>
        </div>
        ${h ? `<div class="tree-foot">
          <button data-opt="pick" ${on || S.horde.active ? 'disabled' : ''}>${on ? '⭐ No telhado' : 'Levar ao telhado'}</button>
          <button data-opt="reset" ${S.horde.active || !spent(h) ? 'disabled' : ''} title="Devolve todos os pontos (só de dia)">↩️ Redistribuir pontos</button>
          <span class="hint">Cada nível dá 1 ponto. Graus custam 1, 2 e 3 pontos; não dá para completar tudo (${CHAMP_MAX_LVL} pontos para ${SKILL_SLOTS.length * CHAMP_RANK_COST.reduce((a, b) => a + b, 0)}), então escolha.</span>
        </div>` : ''}
      </div>`;
    };
    const paint = () => queueMicrotask(() => paintFaces($('dialog-body')));
    openDialog({
      title: '🌳 Árvore de habilidades', plain: true, wide: true, cancel: 'Fechar', body,
      onMount: paint,
      onOpt: o => {
        if (o.startsWith('s:')) selS = o.slice(2);
        else if (o === 'up') { if (canRaise(k, selS)) { raise(`${k}:${selS}`); emit('skillUp', { r: C().owned[k].r[selS] }); } }
        else if (o === 'reset') reset(k);
        else if (o === 'pick') pick(k);
        paint();
      },
    });
  }

  function card(k) {
    const T = CHAMPS[k], h = C().owned[k];
    if (!h) {
      const f = Math.min(BOX.frags, C().frags[k] || 0), ready = f >= BOX.frags;
      return `<div class="row ${ready ? 'ready' : 'locked'} champ-row"><div class="main">
        <div class="champ-head"><div class="champ-portrait shardy"${demoAttr(k, 'basic')}>${shards(k, 60, f)}</div><div class="champ-id">
          <div class="title">${T.icon} ${T.nome} <span class="lvl">${f}/${BOX.frags} fragmentos${ready ? '' : ` · faltam ${BOX.frags - f}`}</span></div>
          <div class="desc">${T.desc}</div>
          ${ready ? `<button class="primary summon-btn" data-act="champSummon" data-k="${k}">✨ Invocar herói</button>`
            : `<button class="cashbtn frag-btn" data-act="champFrag" data-k="${k}" ${fragBlock(k) ? 'disabled' : ''} title="${fragBlock(k) || `Compra 1 fragmento de ${T.nome}`}">🧩 Comprar fragmento · 💵 ${FRAG_COST}</button>`}
        </div></div>
        <div class="desc">${ready ? 'Fragmentos completos!' : `Junte ${BOX.frags} fragmentos (caixas dos chefes, ou 1 por dia na Loja por 💵 ${FRAG_COST}) para invocar.`}</div>
        ${demoChips(k)}
        ${skillStrip(k)}
      </div></div>`;
    }
    const on = C().cur === k, free = points(h);
    const skills = skillStrip(k);
    return `<div class="row hero champ-row ${on ? 'active' : ''}"><div class="main">
        <div class="champ-head"><div class="champ-portrait"${demoAttr(k, 'basic')}>${face(k, 60)}</div><div class="champ-id">
          <div class="title">${T.icon} ${T.nome} <span class="lvl">nv. ${h.lvl}${h.lvl >= CHAMP_MAX_LVL ? ' (máx.)' : ''} · ${free} ponto(s) livre(s)</span></div>
          <div class="desc">${T.desc}</div>
          ${h.lvl < CHAMP_MAX_LVL ? `<div class="bar mini"><div style="width:${h.xp / xpNeed(h.lvl) * 100}%"></div></div>` : ''}
        </div></div>
        <div class="champ-btns">
          <button data-act="champPick" data-k="${k}" ${on || S.horde.active ? 'disabled' : ''}>${on ? '⭐ No telhado' : 'Levar ao telhado'}</button>
          <button class="small" data-act="champReset" data-k="${k}" ${S.horde.active || !spent(h) ? 'disabled' : ''} title="Devolve todos os pontos (só de dia)">↩️ Redistribuir</button>
        </div>
        ${demoChips(k)}
        ${skills}
      </div></div>`;
  }

  // há algo para gastar os pontos deste herói?
  const canSpend = k => SKILL_SLOTS.some(s => canRaise(k, s));
  // herói escolhido na grade (só interface; começa no que está no telhado)
  let sel = null;
  const selected = () => {
    const c = C();
    if (sel && CHAMPS[sel]) return sel;
    return cur() || readyList()[0] || Object.keys(CHAMPS).find(k => c.owned[k]) || Object.keys(CHAMPS)[0];
  };

  let sig = '';
  function render() {
    const el = $('champ');
    renderFloat();
    renderHud();
    if (!el) return;
    const c = C(), nReady = readyList().length, pts = Object.keys(c.owned).some(canSpend);
    const tb = $('tb-herois');
    // aviso na aba: herói pronto para invocar (✨) ou pontos de habilidade para gastar (+); as caixas abrem pelo cenário
    if (tb && (nReady || pts)) { tb.textContent = nReady ? '✨' : '+'; tb.classList.add('gold'); }
    else if (tb) tb.classList.remove('gold');
    const sb = $('sb-campo');
    if (sb) { sb.textContent = nReady ? '✨' : pts ? '+' : ''; sb.classList.toggle('gold', !!(nReady || pts)); }
    renderSkins();
    const key = JSON.stringify([c.owned, c.cur, S.horde.active, c.frags, sel]);
    if (key === sig) return;
    sig = key;
    const keys = Object.keys(CHAMPS), owned = keys.filter(k => c.owned[k]), s = selected();
    // grade: liberados primeiro, depois os prontos para invocar, depois por fragmentos
    const order = [...owned, ...keys.filter(k => !c.owned[k]).sort((a, b) => (c.frags[b] || 0) - (c.frags[a] || 0))];
    const grid = order.map(k => {
      const T = CHAMPS[k], h = c.owned[k], f = Math.min(BOX.frags, c.frags[k] || 0), on = c.cur === k;
      const sub = h ? `nv. ${h.lvl}${canSpend(k) ? ' · <b class="cg-pts">+pontos</b>' : ''}` : f >= BOX.frags ? '<b class="cg-ready">✨ Invocar</b>' : `${f}/${BOX.frags} · faltam ${BOX.frags - f}`;
      return `<button class="cg-card${k === s ? ' sel' : ''}${h ? '' : f >= BOX.frags ? ' ready' : ' locked'}${on ? ' on' : ''}" data-act="champSel" data-k="${k}" title="${T.nome}">
        ${h ? face(k, 56) : shards(k, 56, f)}${on ? '<span class="cg-roof" title="No telhado">⭐</span>' : ''}
        <span class="cg-name">${T.icon} ${T.nome.split(',')[0]}</span><span class="cg-sub">${sub}</span></button>`;
    }).join('');
    el.innerHTML = `
      ${owned.length ? '' : `<p class="hint">⭐ O primeiro herói de campo chega depois da onda ${CHAMP_GIFT_WAVE}.</p>`}
      <div class="champ-grid">${grid}</div>
      <div class="champ-detail">${card(s)}</div>`;
    paintFaces(el);
  }

  // ---------- loja de skins (🏷️ Tampinhas): o texto das Tampinhas; as skins (armas e roupas) vêm de WSkins/OSkins
  let ksig = '';
  function renderSkins() {
    const el = $('skins-shop');
    if (!el) return;
    const caps = C().caps, key = String(caps);
    if (key !== ksig || !el.querySelector('.wsk-slot')) {
      ksig = key;
      el.innerHTML = `<p class="hint">As Tampinhas vêm das <b>caixas de herói</b>: toda caixa traz algumas (★ ${BOX.capsBy[1]}, ★★ ${BOX.capsBy[2]}, ★★★ ${BOX.capsBy[3]}).
          Cada <b>fragmento repetido</b> (de um herói que você já tem ou que já está pronto para invocar) vira <b>${BOX.caps} 🏷️</b>, e um
          <b>herói repetido</b> na ★★★ vira <b>${BOX.frags * BOX.caps} 🏷️</b>. Elas nunca se perdem, nem ao evacuar.</p>
        <h3>🔫 Armas do líder</h3>
        <p class="hint">Só visual: cores, detalhes, efeito do tiro e som. Dano, alcance e recarga não mudam. Uma skin equipada por arma; clique em ✔ Equipada para voltar à padrão.</p>
        <div class="wsk-slot"></div>`;
    }
    if (typeof WSkins !== 'undefined') WSkins.renderShop(el);
  }

  // ---------- caixa pulsando no cenário (e herói pronto para invocar): abre sem precisar ir à aba
  let fsig = '', nudgeT = 0;
  // fica em cima do abrigo, acima da cabeça do líder e do herói (coordenadas do cenário → posição na tela)
  const FLOAT_AT = { x: 45, y: 74 };
  let psig = '';
  function placeFloat(el) {
    const cv = $('scene');
    if (!cv || !cv.offsetWidth || typeof WORLD === 'undefined') return;
    const x = cv.offsetLeft + FLOAT_AT.x / WORLD.W * cv.offsetWidth, y = cv.offsetTop + FLOAT_AT.y / WORLD.H * cv.offsetHeight;
    const key = `${x | 0},${y | 0}`;
    if (key === psig) return;
    psig = key;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
  }
  function renderFloat() {
    const el = typeof document !== 'undefined' && $('box-float');
    if (!el) return;
    placeFloat(el);
    const bx = boxes(), n = bx.length, ready = readyList(), horde = S.horde.active;
    const lvs = bx.map(b => b.w), lv = n ? lvs[0] : 0;
    const key = JSON.stringify([n, ready, horde, lv]);
    if (key === fsig) return;
    const grew = n > (+el.dataset.n || 0);
    fsig = key; el.dataset.n = n;
    el.classList.toggle('hidden', !n && !ready.length);
    const lvTip = `Nível = onda em que a caixa caiu (os prêmios seguem esse nível). ${n > 1 ? `Próximas: Nv. ${lvs.slice(1, 8).join(', ')}${n > 8 ? '...' : ''}` : ''}`;
    el.innerHTML = (n ? `<button class="bf-box${horde ? ' wait' : ''}" data-act="champFloat" title="${horde ? 'A caixa abre no fim da horda' : 'Clique para abrir'} · ${lvTip}">
        <span class="bf-ico">📦</span>${n > 1 ? `<span class="bf-n">×${n}</span>` : ''}<span class="bf-lv">Nv. ${lv}</span>
        <span class="bf-lbl">${horde ? 'depois da horda' : 'Abrir!'}</span></button>` : '') +
      ready.map(k => `<button class="bf-ready" data-act="champSummonFloat" data-k="${k}" title="Fragmentos completos!">
        <span class="bf-ico">${CHAMPS[k].icon}</span><span class="bf-lbl">${horde ? 'depois da horda' : '✨ Invocar'}</span></button>`).join('');
    if (grew) { const b = el.querySelector('.bf-box'); if (b) { b.classList.add('drop'); setTimeout(() => b.classList.remove('drop'), 900); } }
  }
  // ---------- HUD das habilidades no cenário: ativa (A) e suprema (S) com recarga circular, e lembrete de pontos
  let hsig = '', hprev = null;
  function placeHud(el) {
    const cv = $('scene');
    if (!cv || !cv.offsetWidth) return;
    el.style.left = `${cv.offsetLeft + 8}px`;
    el.style.top = `${cv.offsetTop + cv.offsetHeight - 8}px`;
  }
  const flash = (b, cls, ms) => { if (!b) return; b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls); setTimeout(() => b.classList.remove(cls), ms); };
  function renderHud() {
    const el = typeof document !== 'undefined' && $('skill-hud');
    if (!el) return;
    const k = cur();
    el.classList.toggle('hidden', !k);
    if (!k) { hsig = ''; hprev = null; return; }
    placeHud(el);
    const T = CHAMPS[k], h = me(), c = C(), horde = S.horde.active, ra = rank('act'), rs = rank('sup');
    const A = T.skills.act, Su = T.skills.sup, cd = ra ? A.cd[ra - 1] : 1;
    const actOk = !!ra && c.actT <= 0, supOk = !!rs && c.charge >= 1;
    const free = canSpend(k) ? points(h) : 0;
    const key = JSON.stringify([k, ra, rs, horde, free]);
    if (key !== hsig) {
      hsig = key; hprev = null;
      const day = horde ? '' : ' · só durante a horda';
      const tA = ra ? `${A.nome} (A) · ${A.fx(A.v[ra - 1])} · recarga ${cd}s${day}` : `Ativa: ${A.nome}, ainda não aprendida. Clique para abrir a árvore de habilidades.`;
      const tS = rs ? `${Su.nome} (S) · ${Su.fx(Su.v[rs - 1])} · recarga ${CHAMP_SUP_CD[rs - 1]}s, cada abate encurta${day}`
        : `Suprema: ${Su.nome}, ainda não aprendida (a partir do nível ${CHAMP_SUP_LVL[0]}). Clique para abrir a árvore de habilidades.`;
      el.style.setProperty('--hc', `rgb(${T.color})`);
      const q = t => t.replace(/"/g, '&quot;');
      el.innerHTML = `${free ? `<button class="sh-pts" data-act="champTree" data-k="${k}" title="${T.nome} tem pontos de habilidade para gastar">⭐ +${free} ponto${free > 1 ? 's' : ''}</button>` : ''}
        <div class="sh-row">
          <button class="sh-btn sh-act${ra ? '' : ' lock'}" data-act="${ra ? 'champActive' : 'champTree'}" data-k="${k}:act" title="${q(tA)}">
            <span class="sh-ico">${A.icon}</span><span class="sh-val"></span><b class="sh-key">A</b></button>
          <button class="sh-btn sh-sup${rs ? '' : ' lock'}" data-act="${rs ? 'champSupreme' : 'champTree'}" data-k="${k}:sup" title="${q(tS)}">
            <span class="sh-ico">${Su.icon}</span><span class="sh-val"></span><b class="sh-key">S</b></button>
        </div>`;
    }
    const a = el.querySelector('.sh-act'), s = el.querySelector('.sh-sup');
    const set = (b, p, txt, ok) => {
      b.style.setProperty('--p', p);
      b.querySelector('.sh-val').textContent = txt;
      b.classList.toggle('ready', ok && horde);
      b.classList.toggle('full', ok);
    };
    set(a, ra ? 1 - c.actT / cd : 0, !ra ? '🔒' : c.actT > 0 ? `${Math.ceil(c.actT)}` : '', actOk);
    set(s, rs ? Math.min(1, c.charge) : 0, !rs ? '🔒' : supOk ? '' : `${Math.ceil((1 - c.charge) * CHAMP_SUP_CD[rs - 1])}`, supOk);
    // voltou a ficar disponível durante a horda: o botão "pula"
    if (hprev && horde) {
      if (actOk && !hprev.act) flash(a, 'back', 800);
      if (supOk && !hprev.sup) flash(s, 'back', 800);
    }
    hprev = { act: actOk, sup: supOk };
  }
  // tentou usar e não deu (recarga, fora da horda...): o botão balança
  function hudNope(slot) {
    const b = typeof document !== 'undefined' && $('skill-hud') && $('skill-hud').querySelector(slot === 'sup' ? '.sh-sup' : '.sh-act');
    if (b) flash(b, 'nope', 400);
    return false;
  }

  // fim da horda com caixas guardadas: um balão chamando para abrir
  function nudge() {
    const el = typeof document !== 'undefined' && $('box-float');
    const n = boxes().length;
    if (!el || !n) return;
    fsig = ''; renderFloat();
    const b = el.querySelector('.bf-box');
    if (!b) return;
    clearTimeout(nudgeT);
    b.classList.add('nudge');
    const tip = document.createElement('span');
    tip.className = 'bf-tip';
    tip.textContent = n > 1 ? `Você tem ${n} caixas de herói! Clique para abrir` : 'Você ganhou uma caixa de herói! Clique para abrir';
    b.appendChild(tip);
    nudgeT = setTimeout(() => { b.classList.remove('nudge'); tip.remove(); }, 7000);
  }
  function floatClick() {
    if (S.horde.active) {   // durante a horda ela só pulsa: um "não" de leve
      const b = $('box-float') && $('box-float').querySelector('.bf-box');
      if (b) { b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); }
      return;
    }
    if (!modalOpen) openBox();
  }


  function buildUI() {
    Object.assign(actions, {
      champRaise: raise, champReset: reset, champPick: pick,
      champActive: () => useActive() || hudNope('act'), champSupreme: () => useSupreme() || hudNope('sup'), champOpen: () => openBox(),
      champSummon: k => summon(k),
      champFrag: k => buyFrag(k),
      champSel: k => { sel = k; },
      wskBuy: id => WSkins.buy(id),
      wskEquip: id => WSkins.equip(id),
      wskTest: id => WSkins.test(id),
      wskTab: w => WSkins.setTab(w),
      wskRar: r => WSkins.setRar(r),
      wskCat: c => WSkins.setCat(c),
      oskBuy: id => OSkins.buy(id),
      oskEquip: id => OSkins.equip(id),
      champTree: arg => { const [k, s] = String(arg).split(':'); openTree(k, s); },
      champFloat: () => floatClick(),
      champSummonFloat: k => { if (!S.horde.active && !modalOpen) summon(k); },
    });
  }

  return {
    blank, cur, tag: () => tag, val, slow, fury, grant, gainXp, useActive, useSupreme, hordeTick, onTowerHit, onKill, onWaveEnd,
    render, buildUI, hudNope, buyFrag, fragBlock, fragPicker, look: k => heroLook(k), rank, xpNeed, addBox, openBox, rollBox, summon, isReady,
    canRaise, raise,
  };
})();
