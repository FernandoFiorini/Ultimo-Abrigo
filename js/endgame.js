'use strict';

// Fim de jogo: amostras, pesquisa, a Cura (2º prestígio), noites especiais,
// desafios semanais, distritos da cidade e heróis com equipamento.
const Endgame = (() => {
  const SAMPLES = {
    acido:  { nome: 'Ácido',                 icon: '🧪' },
    gas:    { nome: 'Gás tóxico',            icon: '☁️' },
    tecido: { nome: 'Tecido mutante',        icon: '🧫' },
    raro:   { nome: 'Amostra da Abominação', icon: '🧬' },
  };
  // valor < 1 = chance de 1 amostra · valor >= 1 = quantidade garantida
  const DROPS = {
    cuspidor:  { acido: 0.6 },
    explosivo: { gas: 0.6 },
    tanque:    { tecido: 0.4 },
    chefe:     { raro: 1, tecido: 3 },
  };

  const BRANCHES = { armas: '🔫 Armas', defesa: '🧱 Defesa', logistica: '🏭 Logística' };
  const C = Math.ceil;
  const TECH = {
    calibre:      { br: 'armas', icon: '🔫', nome: 'Calibre reforçado', desc: '+15% de dano de todos os tiros', max: Infinity,
                    cost: l => ({ rp: C(20 * 1.45 ** l), acido: Math.floor(l * 0.7) }), fx: l => `+${15 * l}% de dano` },
    cadencia:     { br: 'armas', icon: '⚡', nome: 'Cadência', desc: '+8% de velocidade de tiro', max: Infinity,
                    cost: l => ({ rp: C(30 * 1.5 ** l), gas: Math.floor(l * 0.6) }), fx: l => `+${8 * l}% de velocidade` },
    pontaoca:     { br: 'armas', icon: '💥', nome: 'Ponta oca', desc: '+8% de chance de tiro crítico (dano dobrado)', max: 6,
                    cost: l => ({ rp: C(60 * 1.8 ** l), acido: 2 + l, tecido: l }), fx: l => `${8 * l}% de chance de crítico` },
    miras:        { br: 'armas', icon: '🔭', nome: 'Miras ópticas', desc: '+5% de precisão de guardas e torres', max: 5,
                    cost: l => ({ rp: C(35 * 1.6 ** l), acido: l }), fx: l => `+${5 * l}% de precisão` },
    perfuracao:   { br: 'armas', icon: '🎯', nome: 'Perfuração', desc: 'Cada tiro atravessa +1 zumbi (60% do dano)', max: 3,
                    cost: l => ({ rp: C(150 * 3 ** l), tecido: 3 * (l + 1) }), fx: l => `atravessa ${l} zumbi(s)` },
    concreto:     { br: 'defesa', icon: '🧱', nome: 'Concreto armado', desc: '+20% de resistência do muro', max: Infinity,
                    cost: l => ({ rp: C(20 * 1.45 ** l), tecido: Math.floor(l * 0.5) }), fx: l => `+${20 * l}% de resistência` },
    regeneracao:  { br: 'defesa', icon: '💚', nome: 'Muro vivo', desc: 'De dia, o muro se regenera +0,5% por segundo', max: 5,
                    cost: l => ({ rp: C(50 * 1.8 ** l), tecido: 1 + l }), fx: l => `regenera ${fmt(0.5 * l)}%/s` },
    armadilhas:   { br: 'defesa', icon: '🪤', nome: 'Armadilhas', desc: 'Zumbis que se aproximam do muro pisam em armadilhas (+0,5 de dano)', max: 6,
                    cost: l => ({ rp: C(40 * 1.7 ** l), gas: 1 + l }), fx: l => `${fmt(0.5 * l)} de dano em cada zumbi` },
    eletrico:     { br: 'defesa', icon: '🔌', nome: 'Cerca elétrica', desc: 'Zumbis atacando o muro levam choque (+0,6 de dano/s)', max: 5,
                    cost: l => ({ rp: C(80 * 1.8 ** l), acido: 2 + l, gas: 1 + l }), fx: l => `${fmt(0.6 * l)} de dano/s` },
    estoque:      { br: 'logistica', icon: '🏭', nome: 'Linhas de produção', desc: '+15% de toda a produção', max: Infinity,
                    cost: l => ({ rp: C(25 * 1.45 ** l) }), fx: l => `+${15 * l}% de produção` },
    rotas:        { br: 'logistica', icon: '🧭', nome: 'Rotas seguras', desc: 'Expedições e operações 10% mais rápidas e 15% menos arriscadas', max: 5,
                    cost: l => ({ rp: C(40 * 1.7 ** l), acido: 1 + l }), fx: l => `-${10 * l}% de tempo, -${15 * l}% de risco` },
    autoreparo:   { br: 'logistica', icon: '🤖', nome: 'Reparo automático', desc: 'Repara o muro sozinho quando cai abaixo de 50%', max: 1,
                    cost: () => ({ rp: 120, tecido: 2 }), fx: () => 'ativo' },
    autorecruta:  { br: 'logistica', icon: '📢', nome: 'Recrutamento automático', desc: 'Recruta sozinho quando sobra comida', max: 1,
                    cost: () => ({ rp: 150, gas: 2 }), fx: () => 'ativo' },
    autofuncao:   { br: 'logistica', icon: '📋', nome: 'Distribuição automática', desc: 'Coloca os ociosos em funções, equilibrando comida, defesa, munição e pesquisa', max: 1,
                    cost: () => ({ rp: 200, acido: 3 }), fx: () => 'ativo' },
    autoconstroi: { br: 'logistica', icon: '🏗️', nome: 'Mestre de obras', desc: 'A cada 20s constrói a obra mais barata que puder (menos rádio e laboratório)', max: 1,
                    cost: () => ({ rp: 350, tecido: 4, gas: 3 }), fx: () => 'ativo' },
  };

  const CURE = [
    { nome: 'Isolar o vírus',         desc: 'Separar o agente da infecção em laboratório.',            cost: { rp: 300, acido: 5, gas: 5 } },
    { nome: 'Mapear as mutações',     desc: 'Entender por que alguns zumbis se transformam.',           cost: { rp: 1200, tecido: 10, raro: 1 } },
    { nome: 'Anticorpo experimental', desc: 'Primeira molécula capaz de frear a infecção.',             cost: { rp: 4000, acido: 15, gas: 15, raro: 2 } },
    { nome: 'Testes em campo',        desc: 'Testar o anticorpo em zumbis capturados.',                 cost: { rp: 12000, tecido: 25, raro: 4 } },
    { nome: 'A Cura',                 desc: 'Produzir a vacina em escala e salvar a humanidade.',       cost: { rp: 40000, acido: 30, gas: 30, tecido: 30, raro: 8 } },
  ];

  const EVENTS = {
    sangue:   { nome: 'Lua de Sangue',        icon: '🌕', desc: 'Zumbis 50% mais rápidos e 20% mais numerosos. Sucata e amostras em dobro.', count: 1.2, speed: 1.5, loot: 2, samples: 2 },
    neblina:  { nome: 'Neblina',              icon: '🌫️', desc: 'Seus atiradores só enxergam perto do muro. +50% de sucata.', range: 110, loot: 1.5 },
    dupla:    { nome: 'Horda Dupla',          icon: '👥', desc: 'O dobro de zumbis. Amostras garantidas no fim.', count: 2, bonus: { tecido: 2, acido: 1, gas: 1 } },
    acida:    { nome: 'Chuva Ácida',          icon: '☔', desc: 'A chuva corrói o muro, mas os zumbis ficam 25% mais fracos. +3 de ácido.', hp: 0.75, wallDot: 0.4, bonus: { acido: 3 } },
    corrida:  { nome: 'Noite dos Corredores', icon: '🏃', desc: 'Só corredores, mas em menor número. +30% de sucata.', count: 0.7, runners: true, loot: 1.3 },
  };
  const EVENT_CHANCE = 0.25, EVENT_MIN_WAVE = 5;

  const WEEK_POOL = [
    { key: 'kills',     goal: 300,  cash: 2, desc: 'Abata 300 zumbis' },
    { key: 'kills',     goal: 1000, cash: 4, desc: 'Abata 1.000 zumbis' },
    { key: 'evNights',  goal: 2,    cash: 3, desc: 'Sobreviva a 2 noites especiais' },
    { key: 'evKills',   goal: 150,  cash: 3, desc: 'Abata 150 zumbis em noites especiais' },
    { key: 'bosses',    goal: 1,    cash: 3, desc: 'Derrote uma Abominação' },
    { key: 'research',  goal: 5,    cash: 2, desc: 'Conclua 5 pesquisas' },
    { key: 'exps',      goal: 8,    cash: 2, desc: 'Conclua 8 expedições' },
    { key: 'districts', goal: 2,    cash: 3, desc: 'Liberte 2 distritos' },
    { key: 'samples',   goal: 15,   cash: 2, desc: 'Colete 15 amostras' },
    { key: 'waves',     goal: 15,   cash: 2, desc: 'Sobreviva a 15 ondas' },
  ];

  const DISTRICTS = {
    shopping:     { nome: 'Centro comercial',   icon: '🏬', unlock: 3,  n: 2, dur: 90,  power: 30,  bonus: '+25% de sucata',                     fx: { scrap: 0.25 } },
    fazendas:     { nome: 'Fazendas',           icon: '🌾', unlock: 4,  n: 2, dur: 120, power: 45,  bonus: '+30% de comida',                     fx: { food: 0.3 } },
    fabrica:      { nome: 'Fábrica de munição', icon: '🏭', unlock: 6,  n: 3, dur: 150, power: 80,  bonus: '+40% de munição',                    fx: { ammo: 0.4 } },
    hospital:     { nome: 'Hospital central',   icon: '🏥', unlock: 8,  n: 3, dur: 180, power: 130, bonus: '+50% de remédios e +2 vagas de cientista', fx: { meds: 0.5, sci: 2 } },
    universidade: { nome: 'Universidade',       icon: '🎓', unlock: 10, n: 4, dur: 240, power: 200, bonus: '+40% de pesquisa',                   fx: { rp: 0.4 } },
    baseaerea:    { nome: 'Base aérea',         icon: '✈️', unlock: 12, n: 5, dur: 300, power: 320, bonus: '+20% de dano de todos os tiros',     fx: { dmg: 0.2 } },
  };

  const HCLASS = {
    atirador:   { nome: 'Atirador',        icon: '🎯', base: 0.10, per: 0.02,  color: [180, 60, 50],  fx: p => `+${pct(p)} de dano e +${pct(p / 2)} de precisão` },
    engenheiro: { nome: 'Engenheiro',      icon: '🔧', base: 0.10, per: 0.02,  color: [200, 150, 40], fx: p => `+${pct(p)} de sucata e de resistência do muro` },
    medico:     { nome: 'Médico de campo', icon: '⚕️', base: 0.10, per: 0.02,  color: [230, 230, 230], fx: p => `+${pct(p)} de remédios e ${pct(Math.min(0.5, p))} de chance de salvar alguém sem remédio` },
    batedor:    { nome: 'Batedor',         icon: '🧭', base: 0.15, per: 0.03,  color: [70, 140, 90],  fx: p => `+${pct(p)} de recompensa em expedições e operações, -${pct(p / 2)} de risco` },
    comandante: { nome: 'Comandante',      icon: '🎖️', base: 0.08, per: 0.015, color: [60, 90, 160],  fx: p => `+${pct(p)} de toda a produção` },
  };
  // Elenco fixo de heróis. Cada um tem visual próprio, a classe (bônus que cresce com o nível e com a arma)
  // e uma habilidade única, que vale enquanto ele estiver ativo.
  // src: onde ele pode aparecer · look: aparência no cenário (acessórios desenhados em Scene.drawHuman)
  const HSRC = {
    distrito: { icon: '🏴', txt: 'Libertando distritos da cidade (o primeiro distrito libertado sempre traz um herói)' },
    chefe:    { icon: '👹', txt: 'Derrotando a Abominação (15% de chance)' },
    base:     { icon: '🪖', txt: 'Em expedições à Base militar (8% de chance)' },
  };
  const HEROES = {
    rafa:     { nome: 'Rafa',        cls: 'atirador',   src: 'distrito', ab: { id: 'crit',    nome: 'Olho de águia',        desc: '+10% de chance de tiro crítico (dano dobrado) em todos os tiros', v: 0.10 },
                look: { skin: [224, 176, 140], hair: [40, 30, 20], shirt: [150, 50, 45], pants: [50, 50, 62], cap: [170, 40, 40], scarf: [230, 230, 220] } },
    valeria:  { nome: 'Valéria',     cls: 'atirador',   src: 'chefe',    ab: { id: 'boss',    nome: 'Caçadora de monstros', desc: '+50% de dano contra a Abominação', v: 0.5 },
                look: { skin: [234, 192, 160], hair: [170, 60, 30], longHair: true, shirt: [40, 38, 42], pants: [30, 30, 34], patch: true } },
    dandara:  { nome: 'Dandara',     cls: 'atirador',   src: 'base',     ab: { id: 'leader',  nome: 'Instrutora de tiro',   desc: '+25% de dano das armas do líder', v: 0.25 },
                look: { skin: [110, 72, 50], hair: [25, 20, 18], afro: true, shirt: [78, 88, 48], pants: [60, 66, 40], beret: [150, 30, 30] } },
    tonhao:   { nome: 'Tonhão',      cls: 'engenheiro', src: 'distrito', ab: { id: 'repair',  nome: 'Mãos de ferro',        desc: 'Cada reparo do muro restaura 60% a mais', v: 0.6 },
                look: { skin: [200, 150, 110], hair: [60, 40, 30], beard: [60, 40, 30], shirt: [220, 120, 30], pants: [50, 60, 90], hardhat: [240, 200, 40] } },
    neide:    { nome: 'Dona Neide',  cls: 'engenheiro', src: 'distrito', ab: { id: 'build',   nome: 'Gambiarra',            desc: 'Construções 15% mais baratas', v: 0.15 },
                look: { skin: [224, 176, 140], hair: [160, 160, 165], longHair: true, glasses: true, shirt: [140, 80, 140], pants: [70, 60, 80], apron: true } },
    batista:  { nome: 'Seu Batista', cls: 'engenheiro', src: 'base',     ab: { id: 'tower',   nome: 'Mestre de obras',      desc: 'Torres de vigia atiram 20% mais rápido', v: 0.2 },
                look: { skin: [150, 100, 70], hair: [200, 200, 200], bald: true, beard: [210, 210, 210], shirt: [60, 80, 120], pants: [40, 50, 70], pack: [110, 80, 50] } },
    cida:     { nome: 'Dona Cida',   cls: 'medico',     src: 'distrito', ab: { id: 'heal',    nome: 'Benzedeira',           desc: 'Feridos se recuperam 50% mais rápido', v: 0.5 },
                look: { skin: [200, 150, 110], hair: [235, 235, 235], bun: true, glasses: true, shirt: [222, 222, 216], pants: [120, 90, 140], cross: true, scarf: [160, 110, 200] } },
    lucia:    { nome: 'Lúcia',       cls: 'medico',     src: 'chefe',    ab: { id: 'medwave', nome: 'Farmacêutica',         desc: '+1 remédio a cada horda vencida', v: 1 },
                look: { skin: [234, 192, 160], hair: [20, 20, 20], longHair: true, shirt: [60, 150, 140], pants: [60, 150, 140], cross: true } },
    bia:      { nome: 'Bia',         cls: 'batedor',    src: 'distrito', ab: { id: 'speed',   nome: 'Pés de vento',         desc: 'Expedições e operações 20% mais rápidas', v: 0.2 },
                look: { skin: [224, 176, 140], hair: [230, 90, 160], mohawk: true, shirt: [70, 140, 90], pants: [40, 40, 50], pack: [80, 110, 60] } },
    caio:     { nome: 'Caio',        cls: 'batedor',    src: 'base',     ab: { id: 'finder',  nome: 'Olho clínico',         desc: '+15% de chance de achar sobreviventes nas expedições', v: 0.15 },
                look: { skin: [150, 100, 70], hair: [30, 25, 20], bandana: [60, 130, 70], goggles: true, shirt: [110, 80, 50], pants: [70, 64, 50], pack: [90, 70, 40] } },
    zeca:     { nome: 'Zeca',        cls: 'comandante', src: 'distrito', ab: { id: 'beds',    nome: 'Voz de comando',       desc: '+2 vagas para sobreviventes', v: 2 },
                look: { skin: [200, 150, 110], hair: [50, 40, 30], mustache: [50, 40, 30], shirt: [60, 90, 160], pants: [40, 50, 80], cap: [30, 40, 80] } },
    marcao:   { nome: 'Marcão',      cls: 'comandante', src: 'chefe',    ab: { id: 'food',    nome: 'Churrasqueiro',        desc: '−10% no consumo de comida do grupo', v: 0.1 },
                look: { skin: [110, 72, 50], hair: [20, 20, 20], bald: true, beard: [20, 20, 20], shirt: [225, 225, 215], pants: [50, 50, 60], apron: true } },
  };
  const HERO_MAX = Object.keys(HEROES).length, HERO_ACTIVE = 3, HERO_MAX_LVL = 50, WEAPON_MAX = 15;
  const RARITY = [
    { nome: 'Comum',    mult: 1.0, w: 60, color: '#b8bdb5' },
    { nome: 'Rara',     mult: 1.3, w: 28, color: '#4aa3ff' },
    { nome: 'Épica',    mult: 1.7, w: 10, color: '#c060ff' },
    { nome: 'Lendária', mult: 2.2, w: 2,  color: '#ffb020' },
  ];
  const WEAPON_NAMES = ['Pistola', 'Espingarda', 'Rifle', 'Besta', 'Machado', 'Facão', 'Submetralhadora', 'Lança-chamas', 'Taco cravejado', 'Revólver'];
  const WEAPON_ADJ = ['velha', 'improvisada', 'de caça', 'tática', 'militar', 'customizada', 'enferrujada', 'de elite'];

  const pct = v => Math.round(v * 100) + '%';
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const M = () => S.meta;
  const tl = k => M().tech[k] || 0;
  let opSel = {};
  let autoT = 0, buildT = 0;

  function newMetaExtra() {
    return {
      samples: { acido: 0, gas: 0, tecido: 0, raro: 0 }, rp: 0, tech: {}, cureStage: 0, cured: false,
      legado: 0, worlds: 1, heroes: [], weapons: [], active: [], weekly: { id: '', counts: {}, claimed: [] }, records: {}, hid: 1,
    };
  }

  function dist(k) {
    let v = 0;
    for (const d in S.districts) if (S.districts[d]) v += DISTRICTS[d].fx[k] || 0;
    return v;
  }
  function heroPower(h) {
    const c = HCLASS[h.cls], w = h.weapon ? RARITY[h.weapon.rar].mult : 1;
    return (c.base + c.per * (h.lvl - 1)) * w;
  }
  // Habilidade única: soma o valor dos heróis ativos que têm a habilidade
  function ab(id) {
    const m = typeof S !== 'undefined' && S && S.meta;
    if (!m || !m.heroes) return 0;
    let v = 0;
    for (const h of m.heroes) { const H = HEROES[h.key]; if (H && H.ab.id === id && m.active.includes(h.id)) v += H.ab.v; }
    return v;
  }
  const heroLook = key => ({ ...HEROES[key].look, cape: HCLASS[HEROES[key].cls].color });
  // Saves antigos: cada herói aleatório vira um herói do elenco (mesmo nome e classe quando possível), mantendo nível, XP e arma
  function migrateHeroes() {
    const m = M();
    if (!Array.isArray(m.heroes)) { m.heroes = []; m.active = []; return; }
    const used = new Set(m.heroes.filter(h => HEROES[h.key]).map(h => h.key));
    for (const h of m.heroes) {
      if (HEROES[h.key]) continue;
      const free = Object.keys(HEROES).filter(k => !used.has(k));
      if (!free.length) break;
      const k = free.find(k => HEROES[k].nome === h.nome && HEROES[k].cls === h.cls) || free.find(k => HEROES[k].cls === h.cls)
        || free.find(k => HEROES[k].nome === h.nome) || free[0];
      used.add(k);
      Object.assign(h, { key: k, nome: HEROES[k].nome, cls: HEROES[k].cls });
    }
    m.heroes = m.heroes.filter(h => HEROES[h.key]);
    m.active = (m.active || []).filter(id => m.heroes.some(h => h.id === id));
  }

  function hb(cls) {
    let v = 0;
    for (const h of M().heroes) if (h.cls === cls && M().active.includes(h.id)) v += heroPower(h);
    return v;
  }
  function mult(kind) {
    const L = M().legado;
    switch (kind) {
      case 'prod':  return (1 + 0.15 * tl('estoque')) * (1 + 0.25 * L) * (1 + hb('comandante'));
      case 'food':  return 1 + dist('food');
      case 'scrap': return (1 + dist('scrap')) * (1 + hb('engenheiro'));
      case 'ammo':  return (1 + dist('ammo')) * (hasMod('polvora') ? 0.5 : 1);
      case 'meds':  return (1 + dist('meds')) * (1 + hb('medico')) * traitMult('socorro');
      case 'rp':    return (1 + dist('rp')) * (1 + 0.25 * L);
      case 'wall':  return (1 + 0.2 * tl('concreto')) * (1 + hb('engenheiro'));
      case 'fire':  return 1 + 0.08 * tl('cadencia');
      case 'dmg':   return (1 + 0.15 * tl('calibre')) * (1 + hb('atirador')) * (1 + dist('dmg')) * (1 + 0.1 * L) * traitMult('mira');
    }
    return 1;
  }
  const critChance = () => 0.08 * tl('pontaoca') + ab('crit');
  const accBonus = () => 0.05 * tl('miras') + hb('atirador') / 2;
  const sciCap = () => S.build.lab * 2 + dist('sci');
  const durMult = () => (1 - 0.1 * tl('rotas')) * traitMult('pes') * (1 - ab('speed'));
  const riskMult = () => (1 - 0.15 * tl('rotas')) * (1 - hb('batedor') / 2);
  const scoutLoot = () => (1 + hb('batedor')) * traitMult('faro');

  const event = () => (S.horde && S.horde.active && S.horde.event) ? EVENTS[S.horde.event] : null;

  function rollEvent(n) {
    if (n < EVENT_MIN_WAVE || n % 10 === 0 || Math.random() > EVENT_CHANCE) return null;
    return pick(Object.keys(EVENTS));
  }

  function modifyQueue(queue, ev) {
    if (!ev) return queue;
    const E = EVENTS[ev];
    let q = queue;
    if (E.runners) q = q.map(t => (t === 'normal' ? 'corredor' : t));
    if (E.count && E.count !== 1) {
      const target = Math.max(1, Math.round(q.length * E.count));
      if (target < q.length) q = q.slice(0, target);
      else while (q.length < target) q.splice(Math.floor(Math.random() * q.length), 0, E.runners ? 'corredor' : 'normal');
    }
    return q;
  }
  const hpMultEv = () => (event() && event().hp) || 1;
  const speedMultEv = () => (event() && event().speed) || 1;
  const lootMult = () => (event() && event().loot) || 1;
  const range = () => (event() && event().range) ? WORLD.WALL_X + event().range : WORLD.RANGE_X;

  function addSample(k, n, x, y) {
    if (n <= 0) return;
    M().samples[k] += n;
    count('samples', n);
    emit('sample', { k, n, icon: SAMPLES[k].icon, x, y });
  }

  function onKill(z, src) {
    const ev = event();
    count('kills', 1);
    if (ev) count('evKills', 1);
    if (ZTYPES[z.type].boss) {
      count('bosses', 1);
      if (Math.random() < 0.15) gainHero('derrotando a Abominação', 'chefe');
    }
    const drops = DROPS[z.type];
    if (!drops) return;
    const mul = (ev && ev.samples) || 1;
    for (const k in drops) {
      const v = drops[k];
      const n = v >= 1 ? v * mul : (Math.random() < v ? mul : 0);
      addSample(k, n, z.x, z.y != null ? z.y - 20 : null);
    }
  }

  function techCost(k) { return TECH[k].cost(tl(k)); }
  function canPay(c) {
    if ((c.rp || 0) > M().rp) return false;
    for (const s in SAMPLES) if ((c[s] || 0) > M().samples[s]) return false;
    return true;
  }
  function payCost(c) {
    M().rp -= c.rp || 0;
    for (const s in SAMPLES) M().samples[s] -= c[s] || 0;
  }
  function costHtml(c) {
    const parts = [];
    if (c.rp) parts.push(`<span class="${M().rp < c.rp ? 'missing' : ''}">🔬 ${fmt(c.rp)}</span>`);
    for (const s in SAMPLES) if (c[s]) parts.push(`<span class="${M().samples[s] < c[s] ? 'missing' : ''}">${SAMPLES[s].icon} ${c[s]}</span>`);
    return parts.join(' ');
  }

  function research(k) {
    const T = TECH[k];
    if (tl(k) >= T.max) return;
    const c = techCost(k);
    if (!canPay(c)) return;
    payCost(c);
    M().tech[k] = tl(k) + 1;
    M().stats.research = (M().stats.research || 0) + 1;
    count('research', 1);
    addLog(`🔬 Pesquisa: ${T.icon} ${T.nome} nível ${tl(k) - 1} → ${tl(k)}. Agora: ${T.fx(tl(k))}.`, 'good');
    emit('research', { k });
  }

  function researchCure() {
    const st = M().cureStage;
    if (st >= CURE.length) return;
    const c = CURE[st].cost;
    if (!canPay(c)) return;
    payCost(c);
    M().cureStage++;
    if (M().cureStage >= CURE.length) {
      M().cured = true;
      addLog('💉 A CURA FOI ENCONTRADA! A humanidade tem uma chance. Você pode começar um Novo Mundo na aba Pesquisa.', 'good');
      emit('cure');
      Victory.win();
      toast({ icon: '💉', label: 'Fim da campanha', name: 'A Cura foi encontrada!',
        desc: `Comece um Novo Mundo para ganhar ${legadoGain()} de Legado (bônus permanente), ou continue nesta cidade.`,
        btn: 'Ver opções', onBtn: () => openTab('pesquisa') });
    } else {
      addLog(`🧬 Etapa da Cura concluída: ${CURE[st].nome} (${M().cureStage}/${CURE.length}).`, 'good');
      emit('research', { k: 'cure' });
    }
  }

  const legadoGain = () => 1 + Math.floor(Math.sqrt(M().hopeTotal / 10));

  function newWorld() {
    if (!M().cured) return;
    const g = legadoGain();
    chooseDifficulty({
      title: '🌍 Novo Mundo',
      sub: `Com a Cura em mãos, você leva o conhecimento para um novo mundo. Você ganha <b>🏛️ ${g} de Legado</b> (+25% de produção e pesquisa e +10% de dano por ponto, para sempre). ` +
        'Recomeçam: Esperança, melhorias, pesquisas, amostras e a Cura. Ficam: cash, conquistas, heróis, armas, recordes e Legado.',
      cancel: true,
      onPick: diff => {
        const m = M();
        const keep = { cash: m.cash, ach: m.ach, stats: m.stats, heroes: m.heroes, weapons: m.weapons, active: m.active, hid: m.hid,
          records: m.records, weekly: m.weekly, boosts: m.boosts, tutorial: m.tutorial, memorial: m.memorial, fallen: m.fallen, lw: m.lw, legado: m.legado + g, worlds: m.worlds + 1,
          player: m.player, runId: m.runId, minDiff: m.minDiff, wins: m.wins, diffChosen: true };
        S = newState(Object.assign(newMeta(), keep), diff);
        addLog(`🌍 Bem-vindo ao Mundo ${S.meta.worlds}! +${g} de Legado (total ${S.meta.legado}).`, 'good');
        emit('evacuate', { city: 1, g: 0, world: S.meta.worlds });
        save();
      },
    });
  }

  function weekId() {
    const d = new Date(), start = new Date(d.getFullYear(), 0, 1);
    const w = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
    return `${d.getFullYear()}-S${w}`;
  }
  function weekTasks() {
    const id = M().weekly.id;
    let seed = [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 2147483647, 7);
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pool = WEEK_POOL.map((t, i) => ({ ...t, i }));
    const out = [];
    while (out.length < 3 && pool.length) {
      const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      if (!out.some(o => o.key === t.key)) out.push(t);
    }
    return out;
  }
  function weekCheck() {
    const id = weekId();
    if (M().weekly.id !== id) M().weekly = { id, counts: {}, claimed: [] };
  }
  function count(key, n) {
    weekCheck();
    const c = M().weekly.counts;
    const before = weekTasks().filter(t => t.key === key && (c[key] || 0) < t.goal);
    c[key] = (c[key] || 0) + n;
    for (const t of before) if (c[key] >= t.goal) {
      addLog(`📅 Desafio da semana concluído: ${t.desc}! Resgate 💵 ${t.cash} na aba Conquistas.`, 'good');
      emit('achievement', { a: { icon: '📅', nome: t.desc, cash: t.cash } });
    }
  }
  function claimWeekly(i) {
    const t = weekTasks().find(x => String(x.i) === String(i));
    const w = M().weekly;
    if (!t || w.claimed.includes(t.i) || (w.counts[t.key] || 0) < t.goal) return;
    w.claimed.push(t.i);
    gainCash(t.cash, `desafio da semana "${t.desc}"`);
  }

  const req = k => DISTRICTS[k].power * D().hp;
  const squadPower = n => n * 12 * mult('dmg') * (1 + hb('batedor') * 0.5);
  const opChance = (k, n) => clamp(squadPower(n) / req(k), 0.05, 0.95);
  const opAmmo = n => n * 10;
  const opBusy = k => S.ops.some(o => o.k === k);
  const districtOpen = k => S.best + 1 >= DISTRICTS[k].unlock;

  function opGo(k) {
    const d = DISTRICTS[k], n = Math.max(d.n, opSel[k] || d.n);
    if (S.districts[k] || opBusy(k) || !districtOpen(k) || idle() < n || S.res.municao < opAmmo(n)) return;
    S.res.municao -= opAmmo(n);
    const dur = d.dur * durMult();
    S.ops.push({ k, n, t: dur, dur, chance: opChance(k, n) });
    addLog(`⚔️ Esquadrão de ${n} partiu para libertar: ${d.icon} ${d.nome} (${pct(opChance(k, n))} de chance).`);
    emit('expStart', { n });
  }

  function opResolve(o) {
    const d = DISTRICTS[o.k];
    if (Math.random() < o.chance) {
      S.districts[o.k] = true;
      const scrap = Math.round(40 * d.unlock * scoutLoot());
      S.res.sucata += scrap;
      M().stats.districts = (M().stats.districts || 0) + 1;
      count('districts', 1);
      addLog(`🏴 ${d.icon} ${d.nome} LIBERTADO! Bônus: ${d.bonus}. +${fmt(scrap)} 🔩.`, 'good');
      emit('expReturn', { n: o.n, loot: `🏴 ${d.nome} libertado!` });
      emit('district', { k: o.k });
      const sk = pick(['acido', 'gas', 'tecido']);
      addSample(sk, 1 + Math.floor(d.unlock / 4));
      if (Math.random() < 0.5) gainWeapon(`no distrito ${d.nome}`);
      if (Math.random() < 0.4 || !M().heroes.length) gainHero(`libertando ${d.nome}`, 'distrito');
    } else {
      const lost = Math.ceil(o.n / 2);
      const names = removeSurvivors(lost, `morreu tentando libertar: ${d.nome}`);
      addLog(`💀 O ataque a ${d.icon} ${d.nome} fracassou. ${joinNames(names)} não ${lost > 1 ? 'voltaram' : 'voltou'}.`, 'bad');
      emit('expReturn', { n: o.n - lost });
      emit('breach');
      if (S.survivors <= 0) gameOver();
    }
  }

  // src: distrito, chefe ou base. Sai um herói bloqueado daquela origem (ou qualquer bloqueado, se ela já acabou).
  function gainHero(where, src) {
    const m = M();
    const owned = new Set(m.heroes.map(h => h.key));
    const locked = Object.keys(HEROES).filter(k => !owned.has(k));
    if (!locked.length) return;
    const pool = locked.filter(k => HEROES[k].src === src);
    const key = pick(pool.length ? pool : locked), H = HEROES[key];
    const h = { id: m.hid++, key, nome: H.nome, cls: H.cls, lvl: 1, xp: 0, weapon: null };
    m.heroes.push(h);
    if (m.active.length < HERO_ACTIVE) m.active.push(h.id);
    const C_ = HCLASS[h.cls];
    addLog(`🦸 Um herói se juntou a você ${where}: ${C_.icon} ${h.nome}, ${C_.nome}! Habilidade: ✦ ${H.ab.nome}.`, 'good');
    emit('hero', { h });
    toast({ icon: C_.icon, label: '🦸 Novo herói', name: `${h.nome}, ${C_.nome}`, desc: `${C_.fx(heroPower(h))} · ✦ ${H.ab.nome}: ${H.ab.desc}`,
      btn: 'Ver heróis', onBtn: () => openTab('herois') });
  }

  function gainWeapon(where) {
    const m = M();
    let r = Math.random() * 100, rar = 0;
    for (let i = 0; i < RARITY.length; i++) { if (r < RARITY[i].w) { rar = i; break; } r -= RARITY[i].w; }
    const w = { id: m.hid++, nome: `${pick(WEAPON_NAMES)} ${pick(WEAPON_ADJ)}`, rar };
    m.weapons.push(w);
    m.weapons.sort((a, b) => b.rar - a.rar);
    if (m.weapons.length > WEAPON_MAX) m.weapons.length = WEAPON_MAX;
    addLog(`🗡️ Arma encontrada ${where}: ${w.nome} (${RARITY[rar].nome}).`, rar >= 2 ? 'good' : '');
    emit('weapon', { rar });
  }

  const xpNeed = l => Math.round(60 * 1.35 ** (l - 1));

  function onWaveEnd(H) {
    const m = M();
    m.records[S.diff] = Math.max(m.records[S.diff] || 0, H.n);
    count('waves', 1);
    if (H.event) {
      const E = EVENTS[H.event];
      count('evNights', 1);
      if (E.bonus) for (const k in E.bonus) addSample(k, E.bonus[k]);
      addLog(`${E.icon} Você sobreviveu à ${E.nome}!`, 'good');
    }
    if (ab('medwave')) S.res.remedio += ab('medwave');
    // XP dos heróis ativos
    for (const h of m.heroes) {
      if (!m.active.includes(h.id) || h.lvl >= HERO_MAX_LVL) continue;
      h.xp += 10 * H.n;
      while (h.lvl < HERO_MAX_LVL && h.xp >= xpNeed(h.lvl)) {
        h.xp -= xpNeed(h.lvl);
        h.lvl++;
        addLog(`⭐ ${HCLASS[h.cls].icon} ${h.nome} subiu para o nível ${h.lvl}! Agora: ${HCLASS[h.cls].fx(heroPower(h))}.`, 'good');
        emit('heroLevel', { h });
      }
    }
  }

  function heroToggle(id) {
    const m = M(), i = m.active.indexOf(+id);
    if (i >= 0) m.active.splice(i, 1);
    else if (m.active.length < HERO_ACTIVE) m.active.push(+id);
  }

  function heroEquip(id) {
    const m = M(), h = m.heroes.find(x => x.id === +id);
    if (!h || !m.weapons.length) return;
    const best = m.weapons[0];
    if (h.weapon && h.weapon.rar >= best.rar) return;
    m.weapons.shift();
    if (h.weapon) { m.weapons.push(h.weapon); m.weapons.sort((a, b) => b.rar - a.rar); }
    h.weapon = best;
    addLog(`🗡️ ${h.nome} equipou ${best.nome} (${RARITY[best.rar].nome}).`);
    emit('weapon', { rar: best.rar });
  }

  function scrapWeapon(id) {
    const m = M(), i = m.weapons.findIndex(w => w.id === +id);
    if (i < 0) return;
    const w = m.weapons.splice(i, 1)[0];
    const rp = 10 * (w.rar + 1) ** 2;
    m.rp += rp;
    addLog(`🔧 ${w.nome} desmontada: +${rp} 🔬 de pesquisa.`);
  }

  function hit(z, base, src) {
    const crit = Math.random() < critChance();
    const dmg = base * (crit ? 2 : 1) * (ZTYPES[z.type] && ZTYPES[z.type].boss ? 1 + ab('boss') : 1);
    if (crit) emit('crit', { x: z.x, y: zy(z) });
    const behind = tl('perfuracao') && src !== 'rock'
      ? S.horde.zs.filter(o => !o.dead && o !== z && o.x > z.x && o.x - z.x < 60 && Math.abs(o.y - z.y) < 12)
        .sort((a, b) => a.x - b.x).slice(0, tl('perfuracao'))
      : [];
    damageZombie(z, dmg, src);
    for (const o of behind) damageZombie(o, dmg * 0.6, src);
  }

  function hordeTick(dt) {
    const H = S.horde, trap = 0.5 * tl('armadilhas'), elec = 0.6 * tl('eletrico'), ev = event();
    for (const z of H.zs) {
      if (z.dead) continue;
      if (trap && !z.trapped && z.x < WORLD.WALL_X + 70) {
        z.trapped = true;
        emit('trap', { x: z.x, y: z.y });
        damageZombie(z, trap, 'trap');
      }
      if (elec && z.state === 'attack' && !z.dead) {
        z.shock = (z.shock || 0) + dt;
        if (z.shock >= 0.5) { z.shock = 0; emit('shock', { x: z.x, y: zy(z) }); damageZombie(z, elec * 0.5, 'shock'); }
      }
    }
    if (ev && ev.wallDot) S.wallHp = Math.max(0, S.wallHp - ev.wallDot * dt);
  }

  // dano extra das pesquisas quando a onda é resolvida de uma vez (offline)
  const offlineMult = () => (1 + critChance()) * (1 + 0.5 * tl('perfuracao'));
  const offlineTrap = () => 0.5 * tl('armadilhas');

  function tick(dt) {
    const m = M();
    if (S.jobs.cientista > 0)
      m.rp += S.jobs.cientista * 0.12 * (1 + 0.25 * Math.max(0, S.build.lab - 1)) * mult('rp') * dt;
    if (!S.horde.active && tl('regeneracao') && S.wallHp < maxWall()) {
      S.wallHp = Math.min(maxWall(), S.wallHp + maxWall() * 0.005 * tl('regeneracao') * dt);
      if (S.wallHp > 0) S.wallDown = false;
    }
    if (S.ops.length) {
      for (const o of S.ops) o.t -= dt;
      const done = S.ops.filter(o => o.t <= 0);
      if (done.length) {
        S.ops = S.ops.filter(o => o.t > 0);
        const st = S;
        for (const o of done) { opResolve(o); if (S !== st) return; }
      }
    }
    autoT += dt; buildT += dt;
    if (autoT >= 2) { autoT = 0; automate(); }
  }

  function automate() {
    if (tl('autoreparo'))
      while (S.wallHp < maxWall() * 0.5 && S.res.sucata >= REPAIR_COST) actions.repair();
    if (tl('autorecruta') && !hasMod('isolados') && S.survivors < maxSurv() && S.res.comida > recruitCost() * 1.5 + 20 && rates().comida > 0.1) {
      S.res.comida -= recruitCost();
      addLog(`📢 Recrutamento automático: ${addSurvivor()} chegou.`, 'good');
    }
    if (tl('autofuncao')) {
      for (let guard = 0; idle() > 0 && guard < 60; guard++) {
        const r = rates();
        let k;
        if (r.comida < 0.2) k = 'forrageiro';
        else if (S.jobs.armeiro < Math.ceil(S.jobs.guarda / 2)) k = 'armeiro';
        else if (S.jobs.guarda < Math.ceil(S.survivors * 0.35)) k = 'guarda';
        else if (S.build.lab && S.jobs.cientista < sciCap()) k = 'cientista';
        else if (S.jobs.medico < Math.floor(S.survivors / 8)) k = 'medico';
        else k = 'coletor';
        S.jobs[k]++;
      }
    }
    if (tl('autoconstroi') && buildT >= 20) {
      buildT = 0;
      const opts = Object.keys(BUILD).filter(k => k !== 'radio' && k !== 'lab' && !buildBlocked(k) && canAfford(buildCost(k)))
        .sort((a, b) => (buildCost(a).sucata || 0) - (buildCost(b).sucata || 0));
      if (opts.length) actions.build(opts[0]);
    }
  }

  const sig = {};
  function setIfChanged(id, key, html) {
    if (sig[id] === key) return false;
    sig[id] = key;
    $(id).innerHTML = html();
    return true;
  }

  function buildUI() {
    $('tech').innerHTML = Object.entries(BRANCHES).map(([br, label]) => `
      <h3>${label}</h3>` + Object.entries(TECH).filter(([, t]) => t.br === br).map(([k, t]) => `
      <div class="row">
        <div class="main">
          <div class="title">${t.icon} ${t.nome}<span class="lvl" id="tl-${k}"></span></div>
          <div class="desc">${t.desc}</div>
          <div class="desc now" id="tn-${k}"></div>
          <div class="cost" id="tc-${k}"></div>
        </div>
        <button data-act="tech" data-k="${k}" id="tb-${k}">Pesquisar</button>
      </div>`).join('')).join('');

    $('districts').innerHTML = Object.entries(DISTRICTS).map(([k, d]) => `
      <div class="row district" id="dr-${k}">
        <div class="ach-icon">${d.icon}</div>
        <div class="main">
          <div class="title">${d.nome}</div>
          <div class="desc">Bônus: ${d.bonus}</div>
          <div class="desc now" id="ds-${k}"></div>
        </div>
        <button class="small" data-act="opSub" data-k="${k}" id="dm-${k}">−</button>
        <span class="count" id="dn-${k}"></span>
        <button class="small" data-act="opAdd" data-k="${k}" id="dp-${k}">+</button>
        <button data-act="opGo" data-k="${k}" id="dg-${k}">Atacar</button>
      </div>`).join('');

    Object.assign(actions, {
      tech: k => research(k),
      cure: () => researchCure(),
      newWorld: () => newWorld(),
      opAdd: k => { opSel[k] = Math.max(DISTRICTS[k].n, opSel[k] || DISTRICTS[k].n) + 1; },
      opSub: k => { opSel[k] = Math.max(DISTRICTS[k].n, (opSel[k] || DISTRICTS[k].n) - 1); },
      opGo: k => opGo(k),
      heroToggle: id => heroToggle(id),
      heroEquip: id => heroEquip(id),
      scrapWeapon: id => scrapWeapon(id),
      claimWeekly: i => claimWeekly(i),
    });
  }

  function render() {
    const m = M();
    weekCheck();

    const sciRow = $('jc-cientista') && $('jc-cientista').closest('.row');
    if (sciRow) sciRow.style.display = S.build.lab ? '' : 'none';
    if ($('ja-cientista')) $('ja-cientista').disabled = idle() <= 0 || S.jobs.cientista >= sciCap();

    const rpRate = S.jobs.cientista * 0.12 * (1 + 0.25 * Math.max(0, S.build.lab - 1)) * mult('rp');
    $('lab-head').innerHTML = `
      <div class="stat"><span>🔬 Pontos de pesquisa</span><span><b>${fmt(m.rp)}</b> (+${fmt(rpRate)}/s)</span></div>
      <div class="stat"><span>Amostras</span><span>${Object.entries(SAMPLES).map(([k, s]) => `<span title="${s.nome}">${s.icon} ${m.samples[k]}</span>`).join(' &nbsp;')}</span></div>
      <div class="stat"><span>Cientistas</span><span>${S.jobs.cientista} / ${sciCap()}</span></div>
      ${S.build.lab ? '' : '<p class="hint warn-text">Construa um 🧪 Laboratório (aba Construir) para contratar cientistas e gerar pesquisa.</p>'}
      <p class="hint">Amostras caem dos zumbis especiais: Cuspidor 🧪, Inchado ☁️, Brutamontes 🧫 e Abominação 🧬.</p>`;
    for (const k in TECH) {
      const T = TECH[k], lv = tl(k), max = lv >= T.max;
      $('tl-' + k).textContent = lv ? ` nv. ${lv}${T.max !== Infinity ? '/' + T.max : ''}` : '';
      $('tn-' + k).textContent = lv ? `Atual: ${T.fx(lv)}` : '';
      $('tc-' + k).innerHTML = max ? '' : costHtml(techCost(k));
      $('tb-' + k).textContent = max ? 'Máximo' : lv ? 'Melhorar' : 'Pesquisar';
      $('tb-' + k).disabled = max || !canPay(techCost(k));
    }

    const st = m.cureStage;
    setIfChanged('cure', `${st}|${m.cured}|${canPay(CURE[Math.min(st, 4)].cost)}|${m.rp | 0}|${JSON.stringify(m.samples)}`, () =>
      CURE.map((c, i) => `
        <div class="row cure ${i < st ? 'done' : i === st ? 'current' : 'locked'}">
          <div class="ach-icon">${i < st ? '✅' : i === st ? '🧪' : '🔒'}</div>
          <div class="main">
            <div class="title">Etapa ${i + 1}: ${c.nome}</div>
            <div class="desc">${c.desc}</div>
            ${i === st ? `<div class="cost">${costHtml(c.cost)}</div>` : ''}
          </div>
          ${i === st ? `<button class="primary" data-act="cure" ${canPay(c.cost) ? '' : 'disabled'}>Pesquisar</button>` : ''}
        </div>`).join('') +
      (m.cured ? `<div class="cure-done">💉 A Cura foi encontrada! <button class="primary" data-act="newWorld">🌍 Começar Novo Mundo (+${legadoGain()} 🏛️ Legado)</button></div>` : '') +
      (m.legado ? `<p class="hint">🏛️ Legado: ${m.legado} (mundo ${m.worlds}). +${25 * m.legado}% de produção e pesquisa, +${10 * m.legado}% de dano.</p>` : ''));

    for (const k in DISTRICTS) {
      const d = DISTRICTS[k], n = Math.max(d.n, opSel[k] || d.n), free = S.districts[k], busy = opBusy(k), open = districtOpen(k);
      $('dr-' + k).className = 'row district ' + (free ? 'freed' : !open ? 'locked' : '');
      $('dn-' + k).textContent = n;
      let s;
      if (free) s = '🏴 Libertado';
      else if (!open) s = `🔒 Disponível a partir da onda ${d.unlock}`;
      else if (busy) { const o = S.ops.find(x => x.k === k); s = `⚔️ Esquadrão em combate: ${Math.ceil(o.t)}s (${pct(o.chance)} de chance)`; }
      else s = `Precisa de ${n} pessoas e 🔫 ${opAmmo(n)} · ${fmtTime(d.dur * durMult())} · chance de vitória: ${pct(opChance(k, n))}`;
      $('ds-' + k).textContent = s;
      const off = free || busy || !open;
      for (const id of ['dm-', 'dn-', 'dp-', 'dg-']) $(id + k).style.display = free ? 'none' : '';
      $('dm-' + k).disabled = off || n <= d.n;
      $('dp-' + k).disabled = off || n >= idle();
      $('dg-' + k).disabled = off || idle() < n || S.res.municao < opAmmo(n);
    }
    setIfChanged('ops', S.ops.map(o => o.k).join(), () => S.ops.length
      ? S.ops.map(o => `<div class="stat"><span>${DISTRICTS[o.k].icon} ${DISTRICTS[o.k].nome} (${o.n} pessoas)</span><span id="ot-${o.k}"></span></div>`).join('')
      : '<div class="desc">Nenhuma operação em andamento.</div>');
    for (const o of S.ops) if ($('ot-' + o.k)) $('ot-' + o.k).textContent = Math.ceil(o.t) + 's';

    const heroesChanged = setIfChanged('heroes', JSON.stringify([m.heroes, m.active, m.weapons.length && m.weapons[0].rar]), () =>
      (m.heroes.length ? '' : '<p class="hint">Nenhum herói ainda. Veja abaixo quem pode se juntar a você e onde encontrar cada um.</p>') +
      Object.keys(HEROES).map(k => {
        const H = HEROES[k], c = HCLASS[H.cls], h = m.heroes.find(x => x.key === k);
        if (!h) {
          return `
          <div class="row hero locked">
            <canvas class="hero-face" width="48" height="48" data-hero="${k}"></canvas>
            <div class="main">
              <div class="title">🔒 ${H.nome} <span class="lvl">${c.icon} ${c.nome}</span></div>
              <div class="desc">Bônus da classe: ${c.fx(c.base)} <i>(nível 1; cresce a cada nível)</i></div>
              <div class="desc ability">✦ <b>${H.ab.nome}:</b> ${H.ab.desc}</div>
              <div class="desc how">${HSRC[H.src].icon} Como conseguir: ${HSRC[H.src].txt}</div>
            </div>
          </div>`;
        }
        const act = m.active.includes(h.id), w = h.weapon;
          const canEquip = m.weapons.length && (!w || m.weapons[0].rar > w.rar);
          return `
          <div class="row hero ${act ? 'active' : ''}">
            <canvas class="hero-face" width="48" height="48" data-hero="${k}"></canvas>
            <div class="main">
              <div class="title">${h.nome} <span class="lvl">${c.icon} ${c.nome} · nv. ${h.lvl}</span></div>
              <div class="desc now">${c.fx(heroPower(h))}</div>
              <div class="desc ability">✦ <b>${H.ab.nome}:</b> ${H.ab.desc}${act ? '' : ' <i>(só com o herói ativo)</i>'}</div>
              <div class="bar mini"><div style="width:${h.lvl >= HERO_MAX_LVL ? 100 : h.xp / xpNeed(h.lvl) * 100}%"></div></div>
              <div class="desc">${w ? `🗡️ <span style="color:${RARITY[w.rar].color}">${w.nome} (${RARITY[w.rar].nome}, ×${RARITY[w.rar].mult})</span>` : 'Sem arma'}</div>
            </div>
            <div class="hero-btns">
              <button data-act="heroToggle" data-k="${h.id}" class="${act ? 'primary' : ''}" ${!act && m.active.length >= HERO_ACTIVE ? 'disabled' : ''}>${act ? 'Ativo' : 'Ativar'}</button>
              <button data-act="heroEquip" data-k="${h.id}" ${canEquip ? '' : 'disabled'}>Equipar melhor</button>
            </div>
          </div>`;
        }).join(''));
    if (heroesChanged) for (const cv of $('heroes').querySelectorAll('canvas[data-hero]')) Scene.portrait(cv, heroLook(cv.dataset.hero));
    $('hero-count').textContent = `${m.active.length}/${HERO_ACTIVE} ativos · ${m.heroes.length}/${HERO_MAX} heróis`;

    setIfChanged('weapons', JSON.stringify(m.weapons.map(w => w.id)), () => m.weapons.length
      ? m.weapons.map(w => `
        <div class="row">
          <div class="main"><div class="title" style="color:${RARITY[w.rar].color}">🗡️ ${w.nome}</div>
          <div class="desc">${RARITY[w.rar].nome} · multiplica o bônus do herói por ×${RARITY[w.rar].mult}</div></div>
          <button data-act="scrapWeapon" data-k="${w.id}">Desmontar (+${10 * (w.rar + 1) ** 2} 🔬)</button>
        </div>`).join('')
      : '<p class="hint">Nenhuma arma guardada. Armas aparecem ao libertar distritos e em expedições à Base militar.</p>');

    const tasks = weekTasks(), wk = m.weekly;
    setIfChanged('weekly', JSON.stringify([wk.id, wk.claimed, tasks.map(t => Math.min(t.goal, wk.counts[t.key] || 0))]), () =>
      tasks.map(t => {
        const v = Math.min(t.goal, wk.counts[t.key] || 0), done = v >= t.goal, claimed = wk.claimed.includes(t.i);
        return `
        <div class="row ach ${claimed ? 'claimed' : done ? 'unlocked' : 'locked'}">
          <div class="ach-icon">📅</div>
          <div class="main">
            <div class="title">${t.desc}</div>
            <div class="bar mini"><div style="width:${v / t.goal * 100}%"></div></div>
            <div class="desc">${fmt(v)} / ${fmt(t.goal)}</div>
          </div>
          <button class="cashbtn" data-act="claimWeekly" data-k="${t.i}" ${done && !claimed ? '' : 'disabled'}>${claimed ? '✔' : done ? `Resgatar 💵 ${t.cash}` : `💵 ${t.cash}`}</button>
        </div>`;
      }).join(''));

    setIfChanged('records', JSON.stringify(m.records), () =>
      Object.entries(DIFFS).map(([k, d]) => `<div class="stat"><span>${d.icon} ${d.nome}</span><span>${m.records[k] ? `onda ${m.records[k]}` : '—'}</span></div>`).join(''));

    const techReady = Object.keys(TECH).filter(k => tl(k) < TECH[k].max && canPay(techCost(k))).length + (m.cureStage < 5 && canPay(CURE[m.cureStage].cost) ? 1 : 0);
    $('tb-pesquisa').textContent = techReady || '';
    $('tb-mapa').textContent = Object.keys(DISTRICTS).filter(k => !S.districts[k] && districtOpen(k) && !opBusy(k)).length || '';
    $('tb-herois').textContent = m.heroes.length ? m.active.length + '/' + HERO_ACTIVE : '';
    const weekReady = tasks.filter(t => (wk.counts[t.key] || 0) >= t.goal && !wk.claimed.includes(t.i)).length;
    if (weekReady) $('tb-conquistas').textContent = (+$('tb-conquistas').textContent || 0) + weekReady;
  }

  return {
    SAMPLES, TECH, CURE, EVENTS, DISTRICTS, HCLASS, HEROES,
    newMetaExtra, mult, accBonus, sciCap, durMult, riskMult, scoutLoot, hb, ab, heroLook, migrateHeroes,
    rollEvent, modifyQueue, hpMultEv, speedMultEv, lootMult, range, event,
    onKill, onWaveEnd, hit, hordeTick, offlineMult, offlineTrap, tick, gainHero, gainWeapon,
    buildUI, render, count,
  };
})();

// Conquistas de fim de jogo
ACH.push(
  { id: 'research10', icon: '🔬', nome: 'Cientista maluco',   desc: 'Conclua 10 pesquisas',          val: () => S.meta.stats.research || 0, goal: 10, cash: 3 },
  { id: 'research50', icon: '🧠', nome: 'Gênio do apocalipse', desc: 'Conclua 50 pesquisas',          val: () => S.meta.stats.research || 0, goal: 50, cash: 8 },
  { id: 'district1',  icon: '🏴', nome: 'Libertador',          desc: 'Liberte um distrito',           val: () => S.meta.stats.districts || 0, goal: 1, cash: 2 },
  { id: 'districtAll', icon: '🗺️', nome: 'A cidade é nossa',   desc: 'Liberte os 6 distritos de uma cidade', val: () => Object.values(S.districts).filter(Boolean).length, goal: 6, cash: 8 },
  { id: 'hero1',      icon: '🦸', nome: 'Não estamos sós',     desc: 'Recrute um herói',              val: () => S.meta.heroes.length, goal: 1, cash: 2 },
  { id: 'hero20',     icon: '⭐', nome: 'Lenda viva',          desc: 'Leve um herói ao nível 20',     val: () => Math.max(0, ...S.meta.heroes.map(h => h.lvl)), goal: 20, cash: 6 },
  { id: 'legendary',  icon: '🟧', nome: 'Arma lendária',       desc: 'Encontre uma arma Lendária',    val: () => (S.meta.weapons.some(w => w.rar === 3) || S.meta.heroes.some(h => h.weapon && h.weapon.rar === 3)) ? 1 : 0, goal: 1, cash: 5 },
  { id: 'cure',       icon: '💉', nome: 'A Cura',              desc: 'Encontre a cura da infecção',   val: () => S.meta.cured || S.meta.worlds > 1 ? 1 : 0, goal: 1, cash: 25 },
  { id: 'world2',     icon: '🌍', nome: 'Novo Mundo',          desc: 'Comece um Novo Mundo',          val: () => S.meta.worlds - 1, goal: 1, cash: 10 },
  { id: 'apoc10',     icon: '🔥', nome: 'Fogo cruzado',        desc: 'Sobreviva à onda 10 no Apocalipse', val: () => (S.meta.records && S.meta.records.apocalipse) || 0, goal: 10, cash: 15 },
  { id: 'apoc30',     icon: '🌋', nome: 'Inferno na Terra',    desc: 'Sobreviva à onda 30 no Apocalipse', val: () => (S.meta.records && S.meta.records.apocalipse) || 0, goal: 30, cash: 40 },
  { id: 'apocwin',    icon: '👑', nome: 'Lenda do Apocalipse', desc: 'Encontre a Cura no Apocalipse',     val: () => (S.meta.wins && S.meta.wins.apocalipse) ? 1 : 0, goal: 1, cash: 100 },
);
