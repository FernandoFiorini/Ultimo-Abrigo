'use strict';

const VERSION = '1.07.000';
const SAVE_KEY = 'ultimoAbrigo.v1';   // save único das versões até a 1.06 (migrado para o espaço 1)
const SLOT_COUNT = 3;                 // espaços de salvamento
const REPO_URL = 'https://github.com/fernandofiorini/Ultimo-Abrigo';
// Desenvolvimento: true libera o menu de debug (F9), mas só rodando localmente. Deixe false ao publicar.
const DEV_MODE = true;
const OFFLINE_MAX = 8 * 3600;      // produção offline: no máximo isso (segundos) de produção; o tempo além disso se perde, para o jogador voltar
const OFFLINE_YIELD = 0.5;          // fração da produção normal que o abrigo rende offline
const RETURN_NOTICE = 300;          // ausência mínima (segundos) para mostrar o aviso de retorno com o que foi progredido
// (intervalo entre hordas e consumo de comida dependem da dificuldade: veja DIFFS)
const STARVE_TIME = 20;             // segundos sem comida até alguém morrer
const REPAIR_COST = 10;             // sucata
const REPAIR_AMOUNT = 25;           // resistência recuperada
const DMG_PER_DEATH = 10;           // dano que passa do muro necessário para matar 1 sobrevivente
const EVAC_WAVE = 10;               // onda mínima sobrevivida para poder evacuar
const EVENT_FIRST = 150;            // segundos até o primeiro dilema da cidade
const EVENT_GAP = [200, 340];       // intervalo entre dilemas (mín., máx.)
const MERCHANT_FIRST = 240;         // segundos até o primeiro comerciante
const MERCHANT_GAP = [300, 480];    // intervalo entre visitas do comerciante
const MERCHANT_STAY = 100;          // quanto tempo ele fica no abrigo

const WORLD = { W: 480, H: 200, GY: 150, WALL_X: 190, SPAWN_X: 492, RANGE_X: 350, LANE_MIN: 160, LANE_MAX: 192 };
const GUARD_CD = 2.4;     // segundos entre tiros do guarda
const ROCK_CD = 3;        // guarda sem munição joga pedras
const ROCK_HIT = 0.35;
// Torres de vigia: três tipos, cada um com nível próprio (BUILD.torreC / torre / torreL).
// Cada nível: +dano e −tempo entre tiros. A cada TOWER_CREW_EVERY níveis, +1 atirador (não ocupa sobrevivente).
// A cada TOWER_GUN_EVERY níveis, arma nova (dano ×TOWER_GUN_MULT).
// slot: posição na cena (0 = colada ao muro) · reach: só atira até essa distância do muro
// target: 'front' = mais próximo do muro, 'hp' = o mais resistente · head: sempre acerta a cabeça do blindado
const TOWER_CREW_EVERY = 5, TOWER_GUN_EVERY = 10, TOWER_GUN_MULT = 1.25;
const TOWER_LVL_DMG = 0.10, TOWER_LVL_CD = 0.96, TOWER_CD_MIN = 0.6;   // cdMin da torre substitui TOWER_CD_MIN
// Manutenção: cobrada no começo de cada horda (upkeep = fração do custo do próximo nível).
// Sem recurso para pagar, a torre atira com TOWER_UNPAID da cadência naquela horda.
const TOWER_UNPAID = 0.5;

// Cansaço dos guardas (média do grupo, de 0 a 1): cada tiro cansa quem atirou; entre as hordas eles descansam.
const FAT_SHOT = 0.03;      // cansaço de cada tiro, para o guarda que atirou
const FAT_TAU = 60;         // descansando, o cansaço cai para ~37% a cada FAT_TAU segundos
const FAT_FIRE = 0.5;       // com cansaço máximo, atiram na metade da velocidade...
const FAT_ACC = 0.15;       // ...e com 15 pontos a menos de precisão
// Ferimentos de guardas em cima do muro: chance por ácido de cuspidor / por pancada de zumbi no muro.
// No máximo 1 + onda/perWave feridos assim por horda, e só com 2 guardas ou mais.
const GUARD_HURT = { spit: 0.12, smash: 0.01, perWave: 10 };

// Cidades mais perigosas: cada cidade dá +CITY_HP de vida e +CITY_COUNT de zumbis (somando);
// um Novo Mundo conta como CITY_PER_WORLD cidades. Teto de CITY_MAX cidades.
const CITY_HP = 0.12, CITY_COUNT = 0.05, CITY_PER_WORLD = 5, CITY_MAX = 40;
// Cidade tomada: depois da onda SIEGE_WAVE (a da evacuação), cada onda a mais na mesma cidade
// deixa os zumbis SIEGE_HP mais resistentes (somando). Evacuar recomeça a contagem numa cidade nova.
const SIEGE_WAVE = 10, SIEGE_HP = 0.04;

// Esperança: +3% de produção por ponto até HOPE_LINEAR pontos; depois cresce pela raiz (sem salto na transição)
const HOPE_LINEAR = 30;
const TOWERS = {
  torreC: {
    slot: 0, cd: 0.35, dmg: 0.3, acc: 0.6, reach: 70, target: 'front', noArmor: true, quiet: 0.7, cdMin: 0.7, upkeep: { sucata: 0.02, municao: 0.05 },
    guns: ['Submetralhadora', 'Metralhadora', 'Metralhadora pesada', 'Minigun']
  },
  torre: {
    slot: 1, cd: 1.8, dmg: 1, acc: 0.8, target: 'front', upkeep: { sucata: 0.02 },
    guns: ['Carabina', 'Fuzil', 'Fuzil de batalha', 'Fuzil automático']
  },
  torreL: {
    slot: 2, cd: 6, dmg: 6, acc: 0.9, target: 'hp', head: true, upkeep: { sucata: 0.02 },
    guns: ['Rifle de caça', 'Fuzil de precisão', 'Rifle .50', 'Rifle antimaterial']
  },
};

const AMMO_RATE = 0.4;     // munição produzida por armeiro/s
const OFFLINE_EFF = 0.9;   // fração do tempo da onda em que os atiradores têm alvo, quando ela é resolvida de uma vez
// Precisão: chance de cada tiro acertar. O clique do jogador nunca erra.
const GUARD_ACC = 0.65;    // guardas, sem nenhuma melhoria
const TOWER_ACC = 0.8;     // torres (fixas, com mira melhor)
const ACC_MAX = 0.95;      // teto: sempre sobra algum risco
const DEATH_CAP = 1;       // fração máxima dos sobreviventes que pode morrer numa mesma onda

// Invasão: com o muro caído, os zumbis entram no abrigo e os sobreviventes lutam corpo a corpo
const INV = {
  hit: 0.55,          // chance de o ataque de um zumbi alcançar alguém
  dead: 0.4,          // destino de quem é alcançado: morte...
  bitten: 0.15,       // ...mordida (decisão do jogador)... e o resto escapa ferido
  hurtDead: 0.65,     // quem já estava ferido e é alcançado de novo quase sempre morre
  shield: 0.75,       // chance de o zumbi pegar alguém de pé (o grupo protege os feridos)
  atkCd: 1.3,         // segundos entre ataques de um zumbi dentro do abrigo
  meleeCd: 1.6,       // segundos entre golpes de cada sobrevivente
  meleeHit: 0.55,     // chance de acerto do golpe
  meleeDmg: 0.35,     // dano do golpe (× resistência da onda)
  maxFighters: 12,
};
const HEAL_TIME = 60;        // segundos de tratamento por ferido (cada médico trata um por vez)
const WOUND_TIME = 120;      // feridos sem tratamento: a cada X segundos, um piora (gasta remédio ou morre)
const MOURN_TIME = 150;      // luto depois de matar alguém mordido (segundos)
const MOURN_PENALTY = 0.15;  // produção perdida durante o luto
const CURE_CHANCE = 0.25;    // chance de quem foi liberado resistir à infecção e voltar

const ZTYPES = {
  normal: { nome: 'Zumbi', hp: 1, speed: 13, scale: 1, dmg: 2.5, hits: 2, loot: 1 },
  corredor: { nome: 'Corredor', hp: 1, speed: 24, scale: 0.95, dmg: 2.5, hits: 2, loot: 1 },
  tanque: { nome: 'Brutamontes', hp: 4, speed: 8, scale: 1.4, dmg: 5, hits: 2, loot: 4 },
  cuspidor: {
    nome: 'Cuspidor', hp: 2, speed: 11, scale: 1, dmg: 2.5, hits: 2, loot: 3, acidBurst: true,
    spit: { range: 75, cd: 2.2, dmg: 2, count: 4 }
  },
  explosivo: { nome: 'Inchado', hp: 2, speed: 7, scale: 1.25, dmg: 15, hits: 1, loot: 3, explode: true },
  chefe: {
    nome: 'Abominação', hp: 30, speed: 5, scale: 2.2, dmg: 10, hits: 4, loot: 40, boss: true, art: 'a', icon: '👹', wave: 10,
    tip: 'Concentre o fogo nela!'
  },
  // alguém do grupo que foi liberado depois de uma mordida e voltou transformado
  mordido: { nome: 'Transformado', hp: 3, speed: 17, scale: 1.05, dmg: 4, hits: 3, loot: 6 },
  // onDeath: ao morrer, o grito acelera os zumbis em volta (haste) ou os esporos os deixam mais resistentes (harden)
  uivador: { nome: 'Uivador', hp: 2, speed: 12, scale: 1, dmg: 2.5, hits: 2, loot: 3, onDeath: 'haste' },
  // res: multiplicador de dano por tipo (fire: fogo · bullet: balas, pedras e tiros comuns · blast: explosões). Fraquezas
  // e resistências entram no Glossário (codex.js) quando o jogador as vê acontecer
  hospedeiro: { nome: 'Hospedeiro', hp: 3, speed: 9, scale: 1.1, dmg: 3, hits: 2, loot: 4, onDeath: 'harden', res: { fire: 2 } },
  // ataca o muro de longe (spit.proj: o que ele arremessa)
  arremessador: {
    nome: 'Arremessador', hp: 2, speed: 12, scale: 1.05, dmg: 2.5, hits: 2, loot: 3,
    spit: { range: 130, cd: 2, dmg: 1.5, count: 7, proj: 'rock' }
  },
  // armadura de choque: tiros no corpo ricocheteiam. Só tiros na cabeça, explosões (metade) e fogo ferem
  blindado: { nome: 'Policial blindado', hp: 3, speed: 9, scale: 1.05, dmg: 3, hits: 3, loot: 6, armor: true },
  // gelatina viva: as balas afundam nela (30% do dano), o fogo a derrete (dano triplo). off: mais dura no offline
  gosma: { nome: 'Gosma', hp: 3, speed: 8, scale: 1.15, dmg: 3, hits: 2, loot: 4, res: { bullet: 0.3, fire: 3 }, off: 2 },
  // humanos (Ataque de Saqueadores): rápidos, atk = segundos entre golpes no muro, deixam comida e munição
  saqueador: { nome: 'Saqueador', hp: 1.5, speed: 30, scale: 1, dmg: 1.8, hits: 5, atk: 0.5, loot: 2, human: true, food: 4, ammo: 2 },
  incendiario: {
    nome: 'Incendiário', hp: 1.5, speed: 26, scale: 1, dmg: 2, hits: 3, atk: 0.5, loot: 2, human: true, food: 3, ammo: 3,
    spit: { range: 110, cd: 1.4, dmg: 2, count: 5, proj: 'molotov' }
  },

  // ---------- chefes (lógica em bosses.js) ----------
  // ai: comportamento · wave: onda a partir da qual pode aparecer · hits: ataques no muro até o grupo dar conta dele
  // leak: dano no muro quando a onda é resolvida de uma vez (offline) · off: vida extra no offline (fases, armadura)
  // art: artigo (a/o) · icon e tip: barra de vida e faixa de aviso
  saltador: {
    nome: 'Saltador', art: 'o', icon: '🦘', hp: 24, speed: 9, scale: 1.9, dmg: 14, hits: 4, loot: 40, boss: true, ai: 'leap', wave: 10,
    leap: { stop: 75, crouch: 1.3, air: 0.75, cd: 2.2, interrupt: 0.12 }, leak: 50,
    tip: 'Ele vai pular no muro! Acerte-o enquanto se agacha para interromper'
  },
  rolador: {
    nome: 'Rolador', art: 'o', icon: '🌀', hp: 26, speed: 7, scale: 1.8, dmg: 12, hits: 5, loot: 40, boss: true, ai: 'roll', wave: 10,
    roll: { stop: 95, curl: 0.7, speed: 95, back: 0.7, daze: 2.6 }, leak: 55, off: 1.4,
    tip: 'Rolando, é blindado. Ataque quando ele ficar tonto depois da batida'
  },
  matriarca: {
    nome: 'Matriarca', art: 'a', icon: '🕷️', hp: 30, speed: 4, scale: 2.1, dmg: 9, hits: 4, loot: 45, boss: true, ai: 'brood', wave: 20,
    brood: { cd: 6, n: [2, 3], max: 10 }, leak: 40,
    tip: 'Ela pare crias sem parar. Mate-a rápido!'
  },
  colosso: {
    nome: 'Colosso', art: 'o', icon: '🗿', hp: 44, speed: 4, scale: 2.5, dmg: 12, hits: 5, loot: 55, boss: true, ai: 'phases', wave: 20,
    phases: [{ at: 0.5, scale: 1.7, speed: 3, dmg: 0.8, atk: 0.6 }, { at: 0.2, scale: 1.25, speed: 4.5, dmg: 0.6, atk: 0.45, crawl: true }], leak: 70, off: 1.3,
    tip: 'Ao perder a casca ele fica menor e muito mais rápido'
  },
  escavador: {
    nome: 'Escavador', art: 'o', icon: '⛏️', hp: 28, speed: 8, scale: 1.8, dmg: 11, hits: 4, loot: 45, boss: true, ai: 'burrow', wave: 20,
    burrow: { at: 110, out: 32, speed: 40, dig: 0.9, rise: 1.1, again: 0.5 }, leak: 45, off: 1.2,
    tip: 'Debaixo da terra ninguém o acerta. Espere ele sair!'
  },
  colossal: {
    nome: 'Inchado Colossal', art: 'o', icon: '🎈', hp: 22, speed: 3.5, scale: 2.3, dmg: 0, hits: 1, loot: 45, boss: true, ai: 'bloat', wave: 30,
    bloat: { fuse: 2, wall: 70, safe: 55, r: 55, dmg: 6, near: 0.4 }, leak: 70,
    tip: 'Exploda-o LONGE do muro! Perto, a explosão destrói tudo'
  },
  carcaca: {
    nome: 'Carcaça', art: 'a', icon: '🦴', hp: 26, speed: 5, scale: 2.1, dmg: 11, hits: 5, loot: 50, boss: true, ai: 'weakspot', wave: 30,
    weak: { closed: 4.5, open: 2.6, mult: 1.6 }, leak: 55, off: 2.5,
    tip: 'Só o tumor brilhante fere. Atire quando ele abrir!'
  },
  cuspideira: {
    nome: 'Mãe-Cuspideira', art: 'a', icon: '🤮', hp: 24, speed: 6, scale: 2, dmg: 9, hits: 2, loot: 50, boss: true, ai: 'artillery', wave: 30,
    acid: { stop: 128, cd: 2.8, count: 8, dmg: 3, pool: 8, dps: 0.5 }, leak: 60,
    tip: 'Fica longe e cospe ácido que corrói o muro. Use armas de longo alcance'
  },
  reiuivador: {
    nome: 'Rei Uivador', art: 'o', icon: '👑', hp: 26, speed: 6, scale: 1.9, dmg: 10, hits: 4, loot: 55, boss: true, ai: 'howl', wave: 40,
    howl: { stop: 140, cd: 7, count: 6, heal: 0.2, haste: 1.3, stun: 2.2 }, leak: 50,
    tip: 'O grito dele cura e acelera a horda. Ao morrer, atordoa todos!'
  },
  gigante: {
    nome: 'Hospedeiro Gigante', art: 'o', icon: '🍄', hp: 26, speed: 4.5, scale: 2.3, dmg: 10, hits: 4, loot: 50, boss: true, ai: 'split', wave: 40,
    split: { type: 'broto', n: 2 }, leak: 45, res: { fire: 1.5 },
    tip: 'Ao morrer ele se divide. E os pedaços se dividem de novo!'
  },
  // Noite dos Saqueadores: o líder deles toma o lugar do chefe
  chefao: {
    nome: 'Chefe Saqueador', art: 'o', icon: '🏴‍☠️', hp: 20, speed: 18, scale: 1.6, dmg: 6, hits: 6, atk: 0.6, loot: 40, boss: true, human: true, ai: 'warlord',
    armor: true, food: 30, ammo: 20, spit: { range: 120, cd: 1.6, dmg: 3, count: 8, proj: 'molotov' }, leak: 60,
    tip: 'Escudo à frente: mire na cabeça ou use explosivos'
  },
  // filhotes e pedaços dos chefes
  cria: { nome: 'Cria', hp: 0.5, speed: 22, scale: 0.7, dmg: 1.5, hits: 2, loot: 1, res: { fire: 3 } },
  broto: { nome: 'Broto', hp: 6, speed: 8, scale: 1.5, dmg: 4, hits: 3, loot: 8, split: { type: 'normal', n: 3 }, onDeath: 'harden', res: { fire: 2 } },
};
// chefes que podem aparecer nas ondas múltiplas de 10 (o Chefe Saqueador só vem com os saqueadores)
const BOSS_POOL = Object.keys(ZTYPES).filter(k => ZTYPES[k].boss && ZTYPES[k].wave);
// Quantos chefes vêm, por dificuldade. Ondas múltiplas de 10: onda/10 × mult (arredondado, mínimo 1).
// half: a partir dessa onda, as ondas 15, 25, 35... também trazem chefes (um terço da conta, mínimo 1). max: teto por onda.
//                 onda:  10  15  20  25  30  35  40  45  50
//   Fácil      (×0,5)    1   -   1   -   2   -   2   -   3
//   Normal     (×1)      1   -   2   -   3   -   4   -   5
//   Difícil    (×1,25)   1   -   3   1   4   1   5   2   6
//   Pesadelo   (×1,5)    2   1   3   1   5   2   6   2   8
//   Apocalipse (×2)      2   1   4   2   6   2   8   3   8
const BOSS_SCALE = {
  facil: { mult: 0.5, half: 0 },
  normal: { mult: 1, half: 0 },
  dificil: { mult: 1.25, half: 25 },
  pesadelo: { mult: 1.5, half: 15 },
  apocalipse: { mult: 2, half: 15 },
};
const BOSS_MAX = 8;
function bossCount(n, diff = S.diff) {
  const B = BOSS_SCALE[diff] || BOSS_SCALE.normal;
  if (n % 10 === 0 && n > 0) return Math.min(BOSS_MAX, Math.max(1, Math.round(n / 10 * B.mult)));
  if (n % 10 === 5 && B.half && n >= B.half) return Math.min(BOSS_MAX, Math.max(1, Math.round(n / 10 * B.mult / 3)));
  return 0;
}
// Armadura: chance de guardas e torres acertarem a cabeça; no progresso offline o blindado vale por ARMOR_OFFLINE zumbis
const ARMOR_HEAD = { guard: 0.2, tower: 0.3 }, ARMOR_BLAST = 0.5, ARMOR_OFFLINE = 3;
// Efeito de quem morre gritando (haste) ou soltando esporos (harden): alcance, multiplicador e limite de acúmulo
const ZBUFF = { haste: { r: 60, mult: 1.3, max: 2 }, harden: { r: 45, mult: 1.3, max: 3 } };
const WARN_TIME = 10;   // segundos de alarme e contagem regressiva antes de uma onda perigosa
// Vasculhar gasta 1 carga de fôlego do líder: até SCAV_CHARGES cargas, 1 volta a cada SCAV_REGEN segundos (relógio do jogo).
// Cada clique rende SCAV_GAIN× o normal, para quem vasculha num ritmo comum não perder com o limite.
const SCAV_CHARGES = 5, SCAV_REGEN = 3, SCAV_GAIN = 1.5;
const RUSH_DELAY = 14;  // Investida: segundos depois do início da onda até a massa chegar (os últimos 5 com contagem)
const leakOf = (t, n) => { const Z = ZTYPES[t]; return (Z.leak ?? (Z.dmg * Z.hits + (Z.spit ? Z.spit.dmg * Z.spit.count : 0))) * dmgMult(n); };
const foeWord = t => (ZTYPES[t] && ZTYPES[t].human ? 'saqueadores' : 'zumbis');

// count/grow: tamanho das hordas · hp/hpGrow/dmg/speed: força dos zumbis · early: especiais chegam N ondas antes
// interval: segundos entre hordas · food: consumo por pessoa · prod: produção · hope/bossCash: recompensas
const DIFFS = {
  facil: {
    nome: 'Fácil', icon: '🌱', color: '#7cc96b', count: 0.85, grow: 1.16, hp: 0.8, hpGrow: 0.06, dmg: 0.7, speed: 0.9, early: -1, interval: 120, food: 0.14, prod: 1.2, hope: 0.6, bossCash: 3, risk: 0.6, loot: 0.85,
    desc: 'Para relaxar. Hordas menores e mais espaçadas, comida sobrando.'
  },
  normal: {
    nome: 'Normal', icon: '🧟', color: '#e0a940', count: 1, grow: 1.19, hp: 1, hpGrow: 0.08, dmg: 1, speed: 1, early: 0, interval: 90, food: 0.15, prod: 1, hope: 1, bossCash: 5, risk: 1, loot: 1, dayOnly: true, recruitDay: 4,
    desc: 'A experiência pensada para o jogo. Exige planejamento.'
  },
  dificil: {
    nome: 'Difícil', icon: '💀', color: '#e05a4f', count: 1, grow: 1.21, hp: 1.05, hpGrow: 0.09, dmg: 1.1, speed: 1.1, early: 0, interval: 80, food: 0.16, prod: 0.9, hope: 1.5, bossCash: 7, risk: 1.3, loot: 1.3, dayOnly: true, recruitDay: 3,
    desc: 'Zumbis mais duros e rápidos, que crescem mais a cada onda. Falta recurso.'
  },
  pesadelo: {
    nome: 'Pesadelo', icon: '☣️', color: '#b04ad0', count: 1.05, grow: 1.23, hp: 1.1, hpGrow: 0.11, dmg: 1.25, speed: 1.2, early: 1, interval: 70, food: 0.17, prod: 0.8, hope: 2.2, bossCash: 10, risk: 1.6, loot: 1.65, dayOnly: true, recruitDay: 2,
    desc: 'Só para veteranos. Cada noite pode ser a última.'
  },
  // permadeath: se o abrigo cair, o save é apagado
  // risk/loot (em todas): multiplicam a chance de morte e o saque das expedições
  // dayOnly: recrutar e vasculhar só de dia · recruitDay: recrutamentos com comida por dia (volta a cada horda vencida)
  apocalipse: {
    nome: 'Apocalipse', icon: '🔥', color: '#ff3b30', count: 1.15, grow: 1.25, hp: 1.25, hpGrow: 0.13, dmg: 1.45, speed: 1.3, early: 2, interval: 60, food: 0.18, prod: 0.7, hope: 4, bossCash: 20,
    risk: 1.8, loot: 2.1, permadeath: true, dayOnly: true, recruitDay: 1,
    desc: 'Morte permanente: se o abrigo cair, o save é apagado. Recompensas enormes para quem aguentar.'
  },
};
// Ordem crescente. Um save nunca volta para uma dificuldade menor do que a maior que já jogou.
const DIFF_ORDER = Object.keys(DIFFS);
const diffRank = k => Math.max(0, DIFF_ORDER.indexOf(k));
const D = () => DIFFS[(S && S.diff) || 'normal'];
const waveInterval = () => D().interval * (hasMod('rapida') ? 0.7 : 1);
const foodPer = () => D().food * (hasMod('fome') ? 1.5 : 1) * traitMult('frugal') * (1 - Endgame.ab('food')) * Pets.foodMult();

const RES = {
  comida: { nome: 'Comida', icon: '🥫' },
  sucata: { nome: 'Sucata', icon: '🔩' },
  municao: { nome: 'Munição', icon: '🔫' },
  remedio: { nome: 'Remédios', icon: '💊' },
};

const JOBS = {
  forrageiro: { nome: 'Forrageiro', icon: '🌾', desc: 'Produz 0,6 comida/s' },
  coletor: { nome: 'Coletor', icon: '🔧', desc: 'Produz 0,5 sucata/s' },
  armeiro: { nome: 'Armeiro', icon: '⚙️', desc: 'Transforma 0,3 sucata em 0,4 munição/s' },
  guarda: { nome: 'Guarda', icon: '🛡️', desc: 'Atira nos zumbis (1 munição por tiro). Sem munição, joga pedras' },
  medico: { nome: 'Médico', icon: '⚕️', desc: 'Produz 0,04 remédio/s (cada remédio salva uma vida) e trata os feridos: cada médico cuida de um por vez' },
  cientista: { nome: 'Cientista', icon: '🔬', desc: 'Gera pontos de pesquisa (precisa de Laboratório: 2 vagas por nível)' },
};

const BUILD = {
  muro: { nome: 'Muro reforçado', icon: '🧱', desc: '+50 de resistência máxima do muro', cost: { sucata: 30 }, mult: 1.3 },
  horta: { nome: 'Horta', icon: '🥬', desc: '+25% de produção de comida', cost: { sucata: 20, comida: 15 }, mult: 1.35 },
  oficina: { nome: 'Oficina', icon: '🛠️', desc: '+25% de produção de sucata', cost: { sucata: 35 }, mult: 1.35 },
  beliche: { nome: 'Barracas', icon: '⛺', desc: '+2 vagas para sobreviventes', cost: { sucata: 25, comida: 10 }, mult: 1.4 },
  // torres: a chave 'torre' é a média (saves antigos continuam com o mesmo nível)
  torreC: { nome: 'Torre curta', icon: '💥', desc: 'Metralhadora junto ao muro: muitos tiros fracos, só em quem chega perto. Ignora blindados. Não gasta munição', cost: { sucata: 90, municao: 20 }, mult: 1.42, unlock: 12 },
  torre: { nome: 'Torre média', icon: '🗼', desc: 'Fuzil de uso geral: atira no zumbi mais próximo do muro. Não gasta munição', cost: { sucata: 60, municao: 10 }, mult: 1.42, unlock: 10 },
  torreL: { nome: 'Torre longa', icon: '🎯', desc: 'Atirador de elite: tiro lento e devastador no zumbi mais resistente (brutamontes, chefes). Sempre acerta a cabeça. Não gasta munição', cost: { sucata: 150, municao: 30 }, mult: 1.45, unlock: 15 },
  alojamento: { nome: 'Alojamento', icon: '🛏️', desc: 'Guardas descansam melhor entre as hordas: +30% de recuperação do cansaço', cost: { sucata: 80, comida: 40 }, mult: 1.5, unlock: 7 },
  radio: { nome: 'Rádio', icon: '📻', desc: 'Atrai sobreviventes sozinho de vez em quando', cost: { sucata: 120, remedio: 2 }, mult: 1.7, unlock: 10 },
  lab: { nome: 'Laboratório', icon: '🧪', desc: 'Libera cientistas (+2 vagas por nível) e +25% de pesquisa por nível acima do 1º', cost: { sucata: 150, remedio: 3 }, mult: 1.6, unlock: 7 },
};

const EXPED = {
  mercado: { nome: 'Supermercado saqueado', icon: '🛒', dur: 45, min: 1, risk: 0.10, unlock: 4, loot: { comida: [20, 40] } },
  ferro: { nome: 'Ferro-velho', icon: '🚗', dur: 60, min: 1, risk: 0.12, unlock: 4, loot: { sucata: [25, 50] } },
  delegacia: { nome: 'Delegacia', icon: '🚓', dur: 90, min: 2, risk: 0.15, unlock: 5, loot: { municao: [12, 25], sucata: [8, 15] } },
  hospital: { nome: 'Hospital', icon: '🏥', dur: 120, min: 2, risk: 0.20, unlock: 5, loot: { remedio: [1, 3], comida: [8, 16] } },
  base: { nome: 'Base militar', icon: '🪖', dur: 240, min: 3, risk: 0.25, unlock: 10, loot: { municao: [40, 80], sucata: [40, 70], remedio: [1, 3] } },
};

// O cash só vem de conquistas e dos chefes (os zumbis mais fortes da horda)
const BOSS_CASH = 5;
const BOOST_MAX = 4 * 3600;

const SHOP = {
  prod2x: { nome: 'Produção 2x', icon: '⚡', cost: 5, desc: 'Dobra toda a produção por 10 minutos (acumula, até 4h)' },
  furia: { nome: 'Fúria', icon: '🔥', cost: 4, desc: 'Guardas e torres atiram 2x mais rápido e seus tiros causam 2x dano por 10 minutos' },
  tempo15: { nome: 'Pacote de tempo: 15 min', icon: '⏩', cost: 3, desc: 'Receba agora 15 minutos de produção', secs: 900 },
  tempo60: { nome: 'Pacote de tempo: 1 hora', icon: '⏩', cost: 8, desc: 'Receba agora 1 hora de produção', secs: 3600 },
  tempo240: { nome: 'Pacote de tempo: 4 horas', icon: '⏩', cost: 20, desc: 'Receba agora 4 horas de produção', secs: 14400 },
  aereo: { nome: 'Ataque aéreo', icon: '✈️', cost: 5, desc: 'Bombardeia todos os zumbis na tela. O chefe sofre 10 de dano. Só durante a horda' },
  muro: { nome: 'Reparo total', icon: '🧱', cost: 2, desc: 'Restaura o muro por completo na hora' },
  veterano: { nome: 'Sobrevivente veterano', icon: '🧍', cost: 3, desc: '+1 sobrevivente agora, sem gastar comida (precisa de vaga)' },
  medkit: { nome: 'Kit médico', icon: '💊', cost: 2, desc: '+5 remédios' },
  retorno: { nome: 'Retorno imediato', icon: '🎒', cost: 2, desc: 'Todas as expedições em andamento voltam agora' },
  // conteúdo garantido (sem sorte): você escolhe o herói / recebe exatamente o que está escrito
  fragmento: { nome: 'Fragmento de herói', icon: '🧩', cost: 15, desc: 'Escolha um herói de campo que você ainda não tem e ganhe 1 fragmento dele (6 liberam o herói). 1 por dia: volta a cada horda vencida' },
  tampinhas: { nome: 'Pacote de Tampinhas', icon: '🏷️', cost: 5, desc: '+15 🏷️ Tampinhas, para comprar skins de armas, heróis, sobreviventes e do líder' },
};

const PERKS = {
  veteranos: { nome: 'Veteranos', icon: '🎖️', desc: '+1 sobrevivente no início e +1 vaga', cost: 2, mult: 1.7, max: 5 },
  estoque: { nome: 'Estoque inicial', icon: '📦', desc: 'Começa com +40 de comida, sucata e munição', cost: 1, mult: 1.5, max: 10 },
  agricultura: { nome: 'Agricultura', icon: '🌽', desc: '+15% de produção de comida', cost: 2, mult: 1.5, max: 20 },
  sucateiros: { nome: 'Sucateiros', icon: '🧰', desc: '+15% de produção de sucata', cost: 2, mult: 1.5, max: 20 },
  treino: { nome: 'Treinamento de tiro', icon: '🎯', desc: '+12% de velocidade de tiro e +3% de precisão (guardas e torres)', cost: 3, mult: 1.6, max: 10 },
  engenharia: { nome: 'Engenharia', icon: '📐', desc: '+20% de resistência do muro', cost: 2, mult: 1.5, max: 10 },
  mira: { nome: 'Mira do líder', icon: '🔭', desc: '+20% de dano das suas armas', cost: 3, mult: 1.8, max: 5 },
};

// Efeito total de cada nível (mostrado no registro e no painel)
const BUILD_FX = {
  muro: lv => `muro com ${fmt(maxWall())} de resistência máxima`,
  horta: lv => `+${25 * lv}% de produção de comida`,
  oficina: lv => `+${25 * lv}% de produção de sucata`,
  beliche: lv => `${maxSurv()} vagas para sobreviventes`,
  torreC: lv => towerFx('torreC', lv),
  torre: lv => towerFx('torre', lv),
  torreL: lv => towerFx('torreL', lv),
  alojamento: lv => `+${30 * lv}% de recuperação do cansaço dos guardas`,
  radio: lv => `chance de atrair sobreviventes ${lv}x maior`,
  lab: lv => `${lv * 2} vagas de cientista, +${25 * (lv - 1)}% de pesquisa`,
};
const PERK_FX = {
  veteranos: lv => `+${lv} sobrevivente(s) no início e +${lv} vaga(s)`,
  estoque: lv => `começa com +${40 * lv} de comida, sucata e munição`,
  agricultura: lv => `+${15 * lv}% de produção de comida`,
  sucateiros: lv => `+${15 * lv}% de produção de sucata`,
  treino: lv => `+${12 * lv}% de velocidade de tiro e +${3 * lv}% de precisão`,
  engenharia: lv => `+${20 * lv}% de resistência do muro`,
  mira: lv => `+${20 * lv}% de dano das suas armas`,
};

// Desafios de prestígio: escolhidos ao evacuar, valem para a cidade inteira e aumentam a Esperança ganha nela
const MODS = {
  rapida: { nome: 'Noites curtas', icon: '🌘', desc: 'As hordas chegam 30% mais rápido', bonus: 0.4 },
  horda: { nome: 'Hordas famintas', icon: '🧟', desc: '+25% de zumbis em cada onda', bonus: 0.4 },
  semtorres: { nome: 'Sem torres', icon: '🚫', desc: 'Torres de vigia não podem ser construídas', bonus: 0.35 },
  fome: { nome: 'Escassez', icon: '🥀', desc: 'Cada sobrevivente come 50% mais', bonus: 0.35 },
  semexp: { nome: 'Cidade sitiada', icon: '⛔', desc: 'Expedições não podem ser enviadas', bonus: 0.3 },
  murofraco: { nome: 'Muro de papel', icon: '🧻', desc: 'O muro tem 40% menos resistência', bonus: 0.3 },
  isolados: { nome: 'Isolados', icon: '📵', desc: 'Não dá para recrutar (rádio, expedições e eventos ainda trazem gente)', bonus: 0.3 },
  polvora: { nome: 'Pólvora molhada', icon: '💧', desc: 'Armeiros produzem 50% menos munição', bonus: 0.25 },
};
const MOD_OFFER = 4;   // quantos desafios são oferecidos a cada evacuação
const hasMod = k => !!(typeof S !== 'undefined' && S && S.mods && S.mods.includes(k));
const modBonus = (list = (S && S.mods) || []) => list.reduce((a, k) => a + (MODS[k] ? MODS[k].bonus : 0), 0);

// Talentos: alguns sobreviventes chegam com um. O bônus vale enquanto a pessoa estiver no grupo
// (até TRAIT_CAP pessoas com o mesmo talento contam). v negativo reduz (consumo, duração).
const TRAITS = {
  mira: { nome: 'Boa mira', icon: '🎯', desc: '+6% de dano e +2% de precisão dos tiros', v: 0.06 },
  verde: { nome: 'Mão verde', icon: '🌱', desc: '+8% de produção de comida', v: 0.08 },
  jeito: { nome: 'Jeito com máquinas', icon: '🔧', desc: '+8% de produção de sucata', v: 0.08 },
  frugal: { nome: 'Come pouco', icon: '🍞', desc: '−4% no consumo de comida do grupo', v: -0.04 },
  socorro: { nome: 'Primeiros socorros', icon: '🩹', desc: '+10% de produção de remédios', v: 0.10 },
  forca: { nome: 'Força bruta', icon: '💪', desc: '+5% de resistência do muro', v: 0.05 },
  pes: { nome: 'Pés ligeiros', icon: '👟', desc: 'Expedições e operações 5% mais rápidas', v: -0.05 },
  faro: { nome: 'Faro para achados', icon: '🍀', desc: '+6% de recompensa em expedições', v: 0.06 },
};
const TRAIT_CHANCE = 0.35, TRAIT_CAP = 5;
const MEMORIAL_MAX = 200;   // nomes guardados no memorial (o total de mortes é contado à parte)

// Nomes dos sobreviventes comuns (os heróis têm a própria lista)
const NAMES = ['Ana', 'Jorge', 'Marta', 'Paulo', 'Cláudia', 'Diego', 'Fernanda', 'Luiz', 'Camila', 'Roberto', 'Sueli', 'André',
  'Patrícia', 'Wesley', 'Helena', 'Márcio', 'Renata', 'Igor', 'Beatriz', 'Sérgio', 'Aline', 'Fábio', 'Vera', 'Otávio', 'Larissa',
  'Edson', 'Priscila', 'Gustavo', 'Simone', 'Ricardo', 'Joana', 'Murilo', 'Elaine', 'Vítor', 'Cristina', 'Davi', 'Natália', 'Hélio',
  'Raquel', 'Thiago', 'Sandra', 'Leandro', 'Yara', 'Wagner', 'Lívia', 'Douglas', 'Irene', 'Matheus', 'Gisele', 'Alemão', 'Dona Lurdes',
  'Seu Jair', 'Pietra', 'Caetano', 'Vânia', 'Benedito', 'Kelly', 'Osvaldo', 'Rita', 'Ivan'];

// Quais desses nomes são de mulher (o visual dos sobreviventes no cenário segue a proporção do grupo)
const FEMALE_NAMES = new Set(['Ana', 'Marta', 'Cláudia', 'Fernanda', 'Camila', 'Sueli', 'Patrícia', 'Helena', 'Renata', 'Beatriz', 'Aline',
  'Vera', 'Larissa', 'Priscila', 'Simone', 'Joana', 'Elaine', 'Cristina', 'Natália', 'Raquel', 'Sandra', 'Yara', 'Lívia', 'Irene',
  'Gisele', 'Dona Lurdes', 'Pietra', 'Vânia', 'Kelly', 'Rita']);
// ---------- sobreviventes homenageados ----------
// Pessoas de verdade que aparecem como sobreviventes, com frases só delas. Para adicionar alguém, copie um bloco:
//   nome:   como aparece no jogo (não pode ser igual a um nome da lista NAMES acima)
//   sexo:   'f' ou 'm' (visual do boneco)
//   frases: ditas de vez em quando, num balão em cima da pessoa no cenário e no registro
//   horda:  (opcional) frases quando a horda chega
//   adeus:  (opcional) últimas palavras se a pessoa morrer; ficam no memorial
//   visual: (opcional) para reconhecer no cenário, ex.: { hair: [200, 60, 130], longHair: true }
//           (hair, skin: cores [r, g, b]; longHair, bun, afro, bald: true; beard, mustache: cor)
//   roupa:  (opcional) roupa fixa, que não troca nem com o uniforme do grupo: o id de uma roupa do líder
//           (cangaceiro, bombeiro, astronauta, samurai, ninja, peste, cavaleiro, escafandro, hazmat, policial; ver oskins.js)
//   historia: (opcional) história fixa da ficha (ao passar o mouse), no lugar da gerada
const HONORED = [
  {
    nome: 'Valdecir', sexo: 'm', roupa: 'policial',
    frases: ['Bandido bom é bandido morto.'],
    horda: ['Bandido bom é bandido morto. E zumbi também!'],
    historia: 'Era policial antes do apocalipse. Continua fazendo a ronda do abrigo toda noite, de farda, como se nada tivesse mudado.'
  },
  {
    nome: 'Nardi', sexo: 'm', roupa: 'bombeiro',
    frases: ['Só na loucura!'],
    horda: ['Só na loucura! Bora pro muro!'],
    historia: 'Era bombeiro antes do apocalipse. Já entrou em prédio pegando fogo para tirar gente lá de dentro; zumbi nenhum vai fazê-lo recuar.'
  },
  {
    nome: 'Fabiano', sexo: 'm',
    frases: ['Até eu não conseguir o que eu quero, não vou parar. E tu me conhece, Valde.', 'Jogo acima de tudo, farmar acima de todos.'],
    horda: ['Jogo acima de tudo, farmar acima de todos! Bora farmar zumbi!'],
    historia: 'Era viciado antes do apocalipse, e nem é em drogas. Seu lema é: jogo acima de tudo, farmar acima de todos.'
  },
  // { nome: 'Fulana', sexo: 'f', frases: ['Primeira frase.', 'Segunda frase.'], horda: ['Lá vêm eles!'], adeus: ['Cuidem do abrigo por mim.'], visual: { hair: [200, 60, 130], longHair: true } },
];
// ---------- airdrop no meio da horda (airdrop.js) ----------
// wave: a partir de qual onda · chance: por horda · delay: segundos depois do começo da horda · zone: onde pode cair (x)
// fall: tempo de queda · speed: corrida de quem vai buscar · grab: tempo para pegar a caixa · chase: raio em que os zumbis
// largam o muro e vão atrás · catch: distância da mordida · chaseMult: velocidade de quem persegue
const AIRDROP = {
  wave: 3, chance: 0.2, delay: [6, 22], zone: [245, 430], fall: 4.5, speed: 34, grab: 2, chase: 46, catch: 5, chaseMult: 1.25,
  milFire: 1.5, rareCash: 2,
  kinds: {
    sup: { p: 0.6, nome: 'Suprimentos', icon: '🟢', smoke: [110, 220, 120] },
    mil: { p: 0.3, nome: 'Munição militar', icon: '🔵', smoke: [110, 160, 255] },
    rara: { p: 0.1, nome: 'Carga rara', icon: '🟣', smoke: [200, 110, 255] },
  },
};
// cuspidor que morre queimando: o ácido explode (raio e dano nos zumbis em volta)
const ACID_BURST = { r: 26, dmg: 1.5 };
const HONORED_CHANCE = 0.3;     // chance de quem chega ao grupo ser um dos homenageados (se algum ainda não estiver)
const HONORED_GAP = [45, 110];  // segundos entre uma frase e outra
const isFemale = name => { const h = HONORED.find(x => x.nome === name); return h ? h.sexo === 'f' : FEMALE_NAMES.has(name); };

// Armas do líder (mira manual durante a horda). Ficam para sempre depois de compradas.
// Escala: a vida e o dano aparecem multiplicados por PTS (um zumbi comum tem ~10 de vida no começo do jogo).
// type: bullet (projéteis instantâneos) · grenade/rocket (explodem no ponto mirado) · flame (incendeia a área)
// dmg: por projétil · cd: segundos entre tiros · mag: tiros por pente · reload: segundos para recarregar
// use: 🔫 munição do abrigo gasta por tiro ao recarregar (a pistola não gasta) · range: alcance em pixels além do muro
// spread: espalhamento em pixels · pierce: zumbis atravessados · radius: área · auto: segurar para atirar · falloff: perde dano com a distância
// wave: melhor onda (de todas as cidades) para liberar · cost: preço da compra; cada melhoria custa ×LW_UP_MULT
const LWEAPONS = {
  pistola: {
    nome: 'Pistola', icon: '🔫', type: 'bullet', dmg: 0.35, cd: 0.3, mag: 5, reload: 1.5, use: 0, range: 120, spread: 0, wave: 1,
    cost: { sucata: 60 }, desc: 'Fraca, mas nunca gasta munição do abrigo. 5 tiros por pente.'
  },
  espingarda: {
    nome: 'Espingarda', icon: '💥', type: 'bullet', dmg: 0.3, cd: 0.75, mag: 2, reload: 2, use: 2, range: 70, pellets: 5, spread: 9, falloff: true, wave: 4,
    cost: { sucata: 150 }, desc: 'Cinco projéteis em leque, de cano duplo. Devastadora colada no muro, inútil de longe.'
  },
  rifle: {
    nome: 'Rifle de caça', icon: '🎯', type: 'bullet', dmg: 1.35, cd: 1.6, mag: 5, reload: 2.6, use: 3, range: 270, pierce: 2, spread: 0, wave: 6,
    cost: { sucata: 250, municao: 40 }, desc: 'Tiro pesado e de longo alcance que atravessa os zumbis em fila.'
  },
  smg: {
    nome: 'Submetralhadora', icon: '🔥', type: 'bullet', dmg: 0.18, cd: 0.09, mag: 30, reload: 2.2, use: 0.5, range: 110, spread: 5, auto: true, wave: 9,
    cost: { sucata: 400, municao: 80 }, desc: 'Segure o clique para despejar balas. Pouco dano por tiro e pente que acaba rápido.'
  },
  granadas: {
    nome: 'Lança-granadas', icon: '💣', type: 'grenade', dmg: 1, cd: 1, mag: 2, reload: 4, use: 0, special: 'grenade', range: 200, radius: 22, wave: 12,
    cost: { sucata: 700, municao: 120 }, desc: 'Explode onde você mirar e fere todos em volta. Só 2 granadas por carga, recarga lenta e granadas raras.'
  },
  chamas: {
    nome: 'Lança-chamas', icon: '🌋', type: 'flame', dmg: 1, cd: 0.12, mag: 40, reload: 3, use: 0, special: 'fuel', range: 50, radius: 16, burn: 3, auto: true, wave: 16,
    cost: { sucata: 1200, municao: 200 }, desc: 'Segure para incendiar uma área perto do muro. Cada tanque de combustível enche o lança-chamas, e combustível é raro.'
  },
  // special: não usa a munição do abrigo, e sim munição especial (raríssima: veja SPECIAL_AMMO)
  bazuca: {
    nome: 'Bazuca', icon: '🚀', type: 'rocket', dmg: 0, cd: 1, mag: 1, reload: 8, use: 0, special: 'rocket', range: 230, radius: 36, wave: 25, bosses: 5,
    cost: { sucata: 5000, municao: 600, remedio: 10 }, desc: 'Um único foguete e recarga muito lenta. Mata qualquer zumbi comum da área e tira 40% da vida de um chefe (até de um blindado). Guarde para os chefes.'
  },
};
const LW_MAX_LVL = 5, LW_UP_MULT = 1.7;
const LW_KEYS = ['Q', 'W', 'E'];   // até 3 armas por noite (R recarrega durante a horda; de dia, recruta)
// Munição especial da bazuca, do lança-granadas e do lança-chamas: não vem do abrigo e é rara de propósito.
// Fica no metajogo (não se perde ao evacuar). max: quanto dá para guardar (para munição por tiro, contando o que está carregado)
// tank: cada unidade enche a arma inteira (um tanque de combustível enche o lança-chamas)
const SPECIAL_AMMO = {
  rocket: { nome: 'foguete', plural: 'foguetes', icon: '🚀', max: 3 },
  grenade: { nome: 'granada', plural: 'granadas', icon: '💣', max: 6 },
  fuel: { nome: 'tanque de combustível', plural: 'tanques de combustível', icon: '⛽', max: 3, tank: true },
};
// De onde vem: chefes (quantidade garantida, varia com o chefe), expedições (chance) e zumbis abatidos pelo líder (chance)
const SPECIAL_DROPS = {
  // por chefe: cada um deixa um saque diferente
  boss: {
    chefe: { rocket: 1, grenade: 2, fuel: 1 },
    saltador: { grenade: 3, fuel: 1 },
    rolador: { rocket: 1, grenade: 2 },
    matriarca: { fuel: 2, grenade: 1 },
    colosso: { rocket: 2, grenade: 1 },
    escavador: { grenade: 2, fuel: 1, rocket: 1 },
    colossal: { fuel: 3 },
    carcaca: { rocket: 2, fuel: 1 },
    cuspideira: { grenade: 3, rocket: 1 },
    reiuivador: { rocket: 1, grenade: 2, fuel: 2 },
    gigante: { fuel: 2, grenade: 2 },
    chefao: { grenade: 4, rocket: 1 },
  },
  exp: { base: { rocket: 0.05, grenade: 0.2, fuel: 0.1 }, delegacia: { grenade: 0.08 }, ferro: { fuel: 0.1 } },
  kill: { blindado: { grenade: 0.1 }, explosivo: { fuel: 0.05 } },
};
const LW_DROP = 0.15;  // chance de um zumbi abatido por você deixar um pouco de 🔫 munição para o abrigo
const PTS = 10;        // vida e dano aparecem ×10, em números inteiros
const pts = v => Math.max(0, Math.round(v * PTS));

// ---------- vitória (Cura concluída) ----------
// Cash ganho na primeira vitória de cada save, por dificuldade
const VICTORY_CASH = { facil: 10, normal: 20, dificil: 35, pesadelo: 60, apocalipse: 150 };

// ---------- personagem do líder (escolhido ao começar um jogo; fica no save) ----------
// sex: 'm' | 'f' · skin: tom de pele · style: cabelo · hair: cor do cabelo · face: barba/bigode (só masculino)
const LOOK_SKINS = [[244, 208, 178], [234, 192, 160], [224, 176, 140], [200, 150, 110], [150, 100, 70], [110, 72, 50], [80, 52, 36]];
const LOOK_HAIRS = [[30, 25, 20], [70, 45, 25], [120, 75, 35], [190, 150, 80], [230, 200, 120], [150, 50, 25], [120, 120, 120], [235, 235, 235], [60, 90, 180], [200, 60, 130], [70, 160, 90]];
const LOOK_STYLES = {
  curto: { nome: 'Curto', flags: {} },
  comprido: { nome: 'Comprido', flags: { longHair: true } },
  coque: { nome: 'Coque', flags: { bun: true } },
  afro: { nome: 'Afro', flags: { afro: true } },
  moicano: { nome: 'Moicano', flags: { mohawk: true } },
  careca: { nome: 'Careca', flags: { bald: true } },
};
const LOOK_FACES = { nada: 'Sem barba', barba: 'Barba', bigode: 'Bigode' };
const defaultLook = sex => (sex === 'f'
  ? { sex: 'f', skin: 2, style: 'comprido', hair: 1, face: 'nada' }
  : { sex: 'm', skin: 2, style: 'curto', hair: 0, face: 'nada' });
// aparência → campos de desenho (drawLook)
function lookBase(a) {
  a = Object.assign(defaultLook(a && a.sex), a || {});
  const hair = LOOK_HAIRS[a.hair] || LOOK_HAIRS[0];
  const L = { skin: LOOK_SKINS[a.skin] || LOOK_SKINS[2], hair, ...(LOOK_STYLES[a.style] || LOOK_STYLES.curto).flags };
  if (a.sex !== 'f' && a.face === 'barba') L.beard = hair;
  if (a.sex !== 'f' && a.face === 'bigode') L.mustache = hair;
  return L;
}

// Skins do líder: trocam a roupa (camisa, calça, boné, capacete, capa, coroa). dye: também tingem o cabelo.
// diff: dificuldade que precisa ser vencida para liberar (custom: qualquer vitória).
const LEADER_SKINS = {
  padrao: { nome: 'Sobrevivente', icon: '🧍', shirt: [60, 62, 72], pants: [40, 40, 50], hair: [30, 25, 20] },
  escoteiro: { nome: 'Escoteiro', icon: '🌱', diff: 'facil', shirt: [70, 120, 60], pants: [60, 54, 40], hair: [90, 60, 30], cap: [60, 100, 50] },
  veterano: { nome: 'Veterano', icon: '🎖️', diff: 'normal', shirt: [86, 96, 60], pants: [60, 66, 44], hair: [30, 25, 20], helmet: true },
  cacador: { nome: 'Caçador', icon: '🏹', diff: 'dificil', shirt: [120, 50, 40], pants: [50, 40, 34], hair: [20, 18, 16], cap: [60, 30, 26], cape: [90, 36, 30] },
  pesadelo: { nome: 'Pesadelo', icon: '☣️', diff: 'pesadelo', shirt: [90, 44, 120], pants: [36, 30, 50], hair: [200, 200, 210], dye: true, cape: [140, 60, 180] },
  lenda: { nome: 'Lenda do Apocalipse', icon: '👑', diff: 'apocalipse', shirt: [200, 160, 50], pants: [70, 40, 30], hair: [30, 25, 20], cape: [170, 30, 30], crown: true },
  custom: { nome: 'Personalizada', icon: '🎨', diff: '*' },
};

// Hall da Fama do site: quem venceu e enviou o certificado de vitória.
// Para adicionar alguém, confira o código com Victory.verify('UAV1:...') no console e copie a linha que ele devolve.
// { n: nome, d: dificuldade, t: data (AAAA-MM-DD) }
const HALL_OF_FAME = [
];
