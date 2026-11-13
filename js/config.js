'use strict';

const VERSION = '1.00.000';
const SAVE_KEY = 'ultimoAbrigo.v1';
const OFFLINE_MAX = 8 * 3600;      // máximo de progresso offline (segundos)
// (intervalo entre hordas e consumo de comida dependem da dificuldade: veja DIFFS)
const STARVE_TIME = 20;             // segundos sem comida até alguém morrer
const REPAIR_COST = 10;             // sucata
const REPAIR_AMOUNT = 25;           // resistência recuperada
const DMG_PER_DEATH = 10;           // dano que passa do muro necessário para matar 1 sobrevivente
const EVAC_WAVE = 10;               // onda mínima sobrevivida para poder evacuar

const WORLD = { W: 480, H: 200, GY: 150, WALL_X: 190, SPAWN_X: 492, RANGE_X: 400, LANE_MIN: 160, LANE_MAX: 192 };
const GUARD_CD = 2.4;     // segundos entre tiros do guarda
const ROCK_CD = 3;        // guarda sem munição joga pedras
const ROCK_HIT = 0.35;
const TOWER_CD = 1.8;
const CLICK_CD = 0.4;     // intervalo dos tiros do jogador

const AMMO_RATE = 0.4;     // munição produzida por armeiro/s
const OFFLINE_EFF = 0.8;   // fração dos tiros que acertam quando a onda é resolvida de uma vez
const DEATH_CAP = 1;       // fração máxima dos sobreviventes que pode morrer numa mesma onda

const ZTYPES = {
  normal:    { nome: 'Zumbi',       hp: 1,  speed: 13, scale: 1,    dmg: 2.5, hits: 2, loot: 1 },
  corredor:  { nome: 'Corredor',    hp: 1,  speed: 24, scale: 0.95, dmg: 2.5, hits: 2, loot: 1 },
  tanque:    { nome: 'Brutamontes', hp: 4,  speed: 8,  scale: 1.4,  dmg: 5,   hits: 2, loot: 4 },
  cuspidor:  { nome: 'Cuspidor',    hp: 2,  speed: 11, scale: 1,    dmg: 2.5, hits: 2, loot: 3,
               spit: { range: 75, cd: 2.2, dmg: 2, count: 4 } },
  explosivo: { nome: 'Inchado',     hp: 2,  speed: 7,  scale: 1.25, dmg: 15,  hits: 1, loot: 3, explode: true },
  chefe:     { nome: 'Abominação',  hp: 30, speed: 5,  scale: 2.2,  dmg: 10,  hits: 4, loot: 40, boss: true },
};
const leakOf = (t, n) => { const Z = ZTYPES[t]; return (Z.dmg * Z.hits + (Z.spit ? Z.spit.dmg * Z.spit.count : 0)) * dmgMult(n); };

// count/grow: tamanho das hordas · hp/hpGrow/dmg/speed: força dos zumbis · early: especiais chegam N ondas antes
// interval: segundos entre hordas · food: consumo por pessoa · prod: produção · hope/bossCash: recompensas
const DIFFS = {
  facil:    { nome: 'Fácil',    icon: '🌱', color: '#7cc96b', count: 0.85, grow: 1.16, hp: 0.8, hpGrow: 0.06, dmg: 0.7, speed: 0.9,  early: -1, interval: 120, food: 0.14, prod: 1.2 , hope: 0.6, bossCash: 3,
              desc: 'Para relaxar. Hordas menores e mais espaçadas, comida sobrando.' },
  normal:   { nome: 'Normal',   icon: '🧟', color: '#e0a940', count: 1,    grow: 1.19, hp: 1,   hpGrow: 0.08, dmg: 1,     speed: 1,    early: 0,  interval: 90,  food: 0.15, prod: 1,    hope: 1,   bossCash: 5,
              desc: 'A experiência pensada para o jogo. Exige planejamento.' },
  dificil:  { nome: 'Difícil',  icon: '💀', color: '#e05a4f', count: 1,    grow: 1.21, hp: 1.05, hpGrow: 0.09, dmg: 1.1, speed: 1.1, early: 0,  interval: 80,  food: 0.16, prod: 0.9 , hope: 1.5, bossCash: 7,
              desc: 'Zumbis mais duros e rápidos, que crescem mais a cada onda. Falta recurso.' },
  pesadelo: { nome: 'Pesadelo', icon: '☣️', color: '#b04ad0', count: 1.05, grow: 1.23, hp: 1.1, hpGrow: 0.11, dmg: 1.25, speed: 1.2, early: 1,  interval: 70,  food: 0.17, prod: 0.8,  hope: 2.2, bossCash: 10,
              desc: 'Só para veteranos. Cada noite pode ser a última.' },
};
const D = () => DIFFS[(S && S.diff) || 'normal'];
const waveInterval = () => D().interval;
const foodPer = () => D().food;

const RES = {
  comida:  { nome: 'Comida',   icon: '🥫' },
  sucata:  { nome: 'Sucata',   icon: '🔩' },
  municao: { nome: 'Munição',  icon: '🔫' },
  remedio: { nome: 'Remédios', icon: '💊' },
};

const JOBS = {
  forrageiro: { nome: 'Forrageiro', icon: '🌾', desc: 'Produz 0,6 comida/s' },
  coletor:    { nome: 'Coletor',    icon: '🔧', desc: 'Produz 0,5 sucata/s' },
  armeiro:    { nome: 'Armeiro',    icon: '⚙️', desc: 'Transforma 0,3 sucata em 0,4 munição/s' },
  guarda:     { nome: 'Guarda',     icon: '🛡️', desc: 'Atira nos zumbis (1 munição por tiro). Sem munição, joga pedras' },
  medico:     { nome: 'Médico',     icon: '⚕️', desc: 'Produz 0,04 remédio/s. Cada remédio salva uma vida' },
  cientista:  { nome: 'Cientista',  icon: '🔬', desc: 'Gera pontos de pesquisa (precisa de Laboratório: 2 vagas por nível)' },
};

const BUILD = {
  muro:    { nome: 'Muro reforçado', icon: '🧱', desc: '+50 de resistência máxima do muro', cost: { sucata: 30 }, mult: 1.3 },
  horta:   { nome: 'Horta',          icon: '🥬', desc: '+25% de produção de comida',         cost: { sucata: 20, comida: 15 }, mult: 1.35 },
  oficina: { nome: 'Oficina',        icon: '🛠️', desc: '+25% de produção de sucata',         cost: { sucata: 35 }, mult: 1.35 },
  beliche: { nome: 'Barracas',       icon: '⛺', desc: '+2 vagas para sobreviventes',        cost: { sucata: 25, comida: 10 }, mult: 1.4 },
  torre:   { nome: 'Torre de vigia', icon: '🗼', desc: 'Atirador fixo que não gasta munição', cost: { sucata: 60, municao: 10 }, mult: 1.45 },
  radio:   { nome: 'Rádio',          icon: '📻', desc: 'Atrai sobreviventes sozinho de vez em quando', cost: { sucata: 120, remedio: 2 }, mult: 1.7 },
  lab:     { nome: 'Laboratório',    icon: '🧪', desc: 'Libera cientistas (+2 vagas por nível) e +25% de pesquisa por nível acima do 1º', cost: { sucata: 150, remedio: 3 }, mult: 1.6 },
};

const EXPED = {
  mercado:   { nome: 'Supermercado saqueado', icon: '🛒', dur: 45,  min: 1, risk: 0.04, unlock: 1, loot: { comida: [20, 40] } },
  ferro:     { nome: 'Ferro-velho',           icon: '🚗', dur: 60,  min: 1, risk: 0.05, unlock: 1, loot: { sucata: [25, 50] } },
  delegacia: { nome: 'Delegacia',             icon: '🚓', dur: 90,  min: 2, risk: 0.08, unlock: 3, loot: { municao: [12, 25], sucata: [8, 15] } },
  hospital:  { nome: 'Hospital',              icon: '🏥', dur: 120, min: 2, risk: 0.10, unlock: 5, loot: { remedio: [1, 3], comida: [8, 16] } },
  base:      { nome: 'Base militar',          icon: '🪖', dur: 240, min: 3, risk: 0.15, unlock: 8, loot: { municao: [40, 80], sucata: [40, 70], remedio: [1, 3] } },
};

// O cash só vem de conquistas e da Abominação (o zumbi mais forte da horda)
const BOSS_CASH = 5;
const BOOST_MAX = 4 * 3600;

const SHOP = {
  prod2x:   { nome: 'Produção 2x',            icon: '⚡', cost: 5,  desc: 'Dobra toda a produção por 10 minutos (acumula, até 4h)' },
  furia:    { nome: 'Fúria',                  icon: '🔥', cost: 4,  desc: 'Guardas e torres atiram 2x mais rápido e seus tiros causam 2x dano por 10 minutos' },
  tempo15:  { nome: 'Pacote de tempo: 15 min', icon: '⏩', cost: 3,  desc: 'Receba agora 15 minutos de produção', secs: 900 },
  tempo60:  { nome: 'Pacote de tempo: 1 hora', icon: '⏩', cost: 8,  desc: 'Receba agora 1 hora de produção', secs: 3600 },
  tempo240: { nome: 'Pacote de tempo: 4 horas', icon: '⏩', cost: 20, desc: 'Receba agora 4 horas de produção', secs: 14400 },
  aereo:    { nome: 'Ataque aéreo',           icon: '✈️', cost: 5,  desc: 'Bombardeia todos os zumbis na tela. O chefe sofre 10 de dano. Só durante a horda' },
  muro:     { nome: 'Reparo total',           icon: '🧱', cost: 2,  desc: 'Restaura o muro por completo na hora' },
  veterano: { nome: 'Sobrevivente veterano',  icon: '🧍', cost: 3,  desc: '+1 sobrevivente agora, sem gastar comida (precisa de vaga)' },
  medkit:   { nome: 'Kit médico',             icon: '💊', cost: 2,  desc: '+5 remédios' },
  retorno:  { nome: 'Retorno imediato',       icon: '🎒', cost: 2,  desc: 'Todas as expedições em andamento voltam agora' },
};

const PERKS = {
  veteranos:   { nome: 'Veteranos',           icon: '🎖️', desc: '+1 sobrevivente no início e +1 vaga',         cost: 2, mult: 1.7, max: 5 },
  estoque:     { nome: 'Estoque inicial',     icon: '📦', desc: 'Começa com +40 de comida, sucata e munição',  cost: 1, mult: 1.5, max: 10 },
  agricultura: { nome: 'Agricultura',         icon: '🌽', desc: '+15% de produção de comida',                  cost: 2, mult: 1.5, max: 20 },
  sucateiros:  { nome: 'Sucateiros',          icon: '🧰', desc: '+15% de produção de sucata',                  cost: 2, mult: 1.5, max: 20 },
  treino:      { nome: 'Treinamento de tiro', icon: '🎯', desc: '+12% de velocidade de tiro (guardas e torres)', cost: 3, mult: 1.6, max: 10 },
  engenharia:  { nome: 'Engenharia',          icon: '📐', desc: '+20% de resistência do muro',                 cost: 2, mult: 1.5, max: 10 },
  mira:        { nome: 'Mira do líder',       icon: '🔭', desc: '+1 de dano nos seus tiros',                   cost: 3, mult: 1.8, max: 5 },
};

// Efeito total de cada nível (mostrado no registro e no painel)
const BUILD_FX = {
  muro:    lv => `muro com ${maxWall()} de resistência máxima`,
  horta:   lv => `+${25 * lv}% de produção de comida`,
  oficina: lv => `+${25 * lv}% de produção de sucata`,
  beliche: lv => `${maxSurv()} vagas para sobreviventes`,
  torre:   lv => `${lv} atirador(es) fixo(s) nas torres`,
  radio:   lv => `chance de atrair sobreviventes ${lv}x maior`,
  lab:     lv => `${lv * 2} vagas de cientista, +${25 * (lv - 1)}% de pesquisa`,
};
const PERK_FX = {
  veteranos:   lv => `+${lv} sobrevivente(s) no início e +${lv} vaga(s)`,
  estoque:     lv => `começa com +${40 * lv} de comida, sucata e munição`,
  agricultura: lv => `+${15 * lv}% de produção de comida`,
  sucateiros:  lv => `+${15 * lv}% de produção de sucata`,
  treino:      lv => `+${12 * lv}% de velocidade de tiro`,
  engenharia:  lv => `+${20 * lv}% de resistência do muro`,
  mira:        lv => `${1 + lv} de dano por tiro`,
};
