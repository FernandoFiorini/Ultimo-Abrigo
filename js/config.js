'use strict';

const VERSION = '1.07.000';
const SAVE_KEY = 'ultimoAbrigo.v1';   // save único das versões até a 1.06 (migrado para o espaço 1)
const SLOT_COUNT = 3;                 // espaços de salvamento
const REPO_URL = 'https://github.com/fernandofiorini/Ultimo-Abrigo';
// Desenvolvimento: true libera o menu de debug (F9), mas só rodando localmente. Deixe false ao publicar.
const DEV_MODE = false;
const OFFLINE_MAX = 8 * 3600;      // máximo de progresso offline (segundos)
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
const TOWER_CD = 1.8;

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
  normal:    { nome: 'Zumbi',       hp: 1,  speed: 13, scale: 1,    dmg: 2.5, hits: 2, loot: 1 },
  corredor:  { nome: 'Corredor',    hp: 1,  speed: 24, scale: 0.95, dmg: 2.5, hits: 2, loot: 1 },
  tanque:    { nome: 'Brutamontes', hp: 4,  speed: 8,  scale: 1.4,  dmg: 5,   hits: 2, loot: 4 },
  cuspidor:  { nome: 'Cuspidor',    hp: 2,  speed: 11, scale: 1,    dmg: 2.5, hits: 2, loot: 3,
               spit: { range: 75, cd: 2.2, dmg: 2, count: 4 } },
  explosivo: { nome: 'Inchado',     hp: 2,  speed: 7,  scale: 1.25, dmg: 15,  hits: 1, loot: 3, explode: true },
  chefe:     { nome: 'Abominação',  hp: 30, speed: 5,  scale: 2.2,  dmg: 10,  hits: 4, loot: 40, boss: true },
  // alguém do grupo que foi liberado depois de uma mordida e voltou transformado
  mordido:   { nome: 'Transformado', hp: 3, speed: 17, scale: 1.05, dmg: 4,   hits: 3, loot: 6 },
  // onDeath: ao morrer, o grito acelera os zumbis em volta (haste) ou os esporos os deixam mais resistentes (harden)
  uivador:   { nome: 'Uivador',     hp: 2,  speed: 12, scale: 1,    dmg: 2.5, hits: 2, loot: 3, onDeath: 'haste' },
  hospedeiro:{ nome: 'Hospedeiro',  hp: 3,  speed: 9,  scale: 1.1,  dmg: 3,   hits: 2, loot: 4, onDeath: 'harden' },
  // ataca o muro de longe (spit.proj: o que ele arremessa)
  arremessador: { nome: 'Arremessador', hp: 2, speed: 12, scale: 1.05, dmg: 2.5, hits: 2, loot: 3,
               spit: { range: 130, cd: 2, dmg: 1.5, count: 7, proj: 'rock' } },
  // armadura de choque: tiros no corpo ricocheteiam. Só tiros na cabeça, explosões (metade) e fogo ferem
  blindado:  { nome: 'Policial blindado', hp: 3, speed: 9, scale: 1.05, dmg: 3, hits: 3, loot: 6, armor: true },
  // humanos (Ataque de Saqueadores): rápidos, atk = segundos entre golpes no muro, deixam comida e munição
  saqueador: { nome: 'Saqueador',   hp: 1.5, speed: 30, scale: 1,  dmg: 1.8, hits: 5, atk: 0.5, loot: 2, human: true, food: 4, ammo: 2 },
  incendiario: { nome: 'Incendiário', hp: 1.5, speed: 26, scale: 1, dmg: 2, hits: 3, atk: 0.5, loot: 2, human: true, food: 3, ammo: 3,
               spit: { range: 110, cd: 1.4, dmg: 2, count: 5, proj: 'molotov' } },
};
// Armadura: chance de guardas e torres acertarem a cabeça; no progresso offline o blindado vale por ARMOR_OFFLINE zumbis
const ARMOR_HEAD = { guard: 0.2, tower: 0.3 }, ARMOR_BLAST = 0.5, ARMOR_OFFLINE = 3;
// Efeito de quem morre gritando (haste) ou soltando esporos (harden): alcance, multiplicador e limite de acúmulo
const ZBUFF = { haste: { r: 60, mult: 1.3, max: 2 }, harden: { r: 45, mult: 1.3, max: 3 } };
const WARN_TIME = 10;   // segundos de alarme e contagem regressiva antes de uma onda perigosa
const RUSH_DELAY = 14;  // Investida: segundos depois do início da onda até a massa chegar (os últimos 5 com contagem)
const leakOf = (t, n) => { const Z = ZTYPES[t]; return (Z.dmg * Z.hits + (Z.spit ? Z.spit.dmg * Z.spit.count : 0)) * dmgMult(n); };
const foeWord = t => (ZTYPES[t] && ZTYPES[t].human ? 'saqueadores' : 'zumbis');

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
  // permadeath: se o abrigo cair, o save é apagado · loot: multiplica o saque das expedições
  apocalipse: { nome: 'Apocalipse', icon: '🔥', color: '#ff3b30', count: 1.15, grow: 1.25, hp: 1.25, hpGrow: 0.13, dmg: 1.45, speed: 1.3, early: 2, interval: 60, food: 0.18, prod: 0.7, hope: 4, bossCash: 20,
              loot: 1.5, permadeath: true,
              desc: 'Morte permanente: se o abrigo cair, o save é apagado. Recompensas enormes para quem aguentar.' },
};
// Ordem crescente. Um save nunca volta para uma dificuldade menor do que a maior que já jogou.
const DIFF_ORDER = Object.keys(DIFFS);
const diffRank = k => Math.max(0, DIFF_ORDER.indexOf(k));
const D = () => DIFFS[(S && S.diff) || 'normal'];
const waveInterval = () => D().interval * (hasMod('rapida') ? 0.7 : 1);
const foodPer = () => D().food * (hasMod('fome') ? 1.5 : 1) * traitMult('frugal') * (1 - Endgame.ab('food'));

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
  medico:     { nome: 'Médico',     icon: '⚕️', desc: 'Produz 0,04 remédio/s (cada remédio salva uma vida) e trata os feridos: cada médico cuida de um por vez' },
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
  treino:      { nome: 'Treinamento de tiro', icon: '🎯', desc: '+12% de velocidade de tiro e +3% de precisão (guardas e torres)', cost: 3, mult: 1.6, max: 10 },
  engenharia:  { nome: 'Engenharia',          icon: '📐', desc: '+20% de resistência do muro',                 cost: 2, mult: 1.5, max: 10 },
  mira:        { nome: 'Mira do líder',       icon: '🔭', desc: '+20% de dano das suas armas',                 cost: 3, mult: 1.8, max: 5 },
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
  treino:      lv => `+${12 * lv}% de velocidade de tiro e +${3 * lv}% de precisão`,
  engenharia:  lv => `+${20 * lv}% de resistência do muro`,
  mira:        lv => `+${20 * lv}% de dano das suas armas`,
};

// Desafios de prestígio: escolhidos ao evacuar, valem para a cidade inteira e aumentam a Esperança ganha nela
const MODS = {
  rapida:     { nome: 'Noites curtas',   icon: '🌘', desc: 'As hordas chegam 30% mais rápido',              bonus: 0.4 },
  horda:      { nome: 'Hordas famintas', icon: '🧟', desc: '+25% de zumbis em cada onda',                   bonus: 0.4 },
  semtorres:  { nome: 'Sem torres',      icon: '🚫', desc: 'Torres de vigia não podem ser construídas',     bonus: 0.35 },
  fome:       { nome: 'Escassez',        icon: '🥀', desc: 'Cada sobrevivente come 50% mais',               bonus: 0.35 },
  semexp:     { nome: 'Cidade sitiada',  icon: '⛔', desc: 'Expedições não podem ser enviadas',             bonus: 0.3 },
  murofraco:  { nome: 'Muro de papel',   icon: '🧻', desc: 'O muro tem 40% menos resistência',              bonus: 0.3 },
  isolados:   { nome: 'Isolados',        icon: '📵', desc: 'Não dá para recrutar (rádio, expedições e eventos ainda trazem gente)', bonus: 0.3 },
  polvora:    { nome: 'Pólvora molhada', icon: '💧', desc: 'Armeiros produzem 50% menos munição',           bonus: 0.25 },
};
const MOD_OFFER = 4;   // quantos desafios são oferecidos a cada evacuação
const hasMod = k => !!(typeof S !== 'undefined' && S && S.mods && S.mods.includes(k));
const modBonus = (list = (S && S.mods) || []) => list.reduce((a, k) => a + (MODS[k] ? MODS[k].bonus : 0), 0);

// Talentos: alguns sobreviventes chegam com um. O bônus vale enquanto a pessoa estiver no grupo
// (até TRAIT_CAP pessoas com o mesmo talento contam). v negativo reduz (consumo, duração).
const TRAITS = {
  mira:    { nome: 'Boa mira',           icon: '🎯', desc: '+6% de dano e +2% de precisão dos tiros', v: 0.06 },
  verde:   { nome: 'Mão verde',          icon: '🌱', desc: '+8% de produção de comida',          v: 0.08 },
  jeito:   { nome: 'Jeito com máquinas', icon: '🔧', desc: '+8% de produção de sucata',          v: 0.08 },
  frugal:  { nome: 'Come pouco',         icon: '🍞', desc: '−4% no consumo de comida do grupo',  v: -0.04 },
  socorro: { nome: 'Primeiros socorros', icon: '🩹', desc: '+10% de produção de remédios',       v: 0.10 },
  forca:   { nome: 'Força bruta',        icon: '💪', desc: '+5% de resistência do muro',         v: 0.05 },
  pes:     { nome: 'Pés ligeiros',       icon: '👟', desc: 'Expedições e operações 5% mais rápidas', v: -0.05 },
  faro:    { nome: 'Faro para achados',  icon: '🍀', desc: '+6% de recompensa em expedições',    v: 0.06 },
};
const TRAIT_CHANCE = 0.35, TRAIT_CAP = 5;
const MEMORIAL_MAX = 200;   // nomes guardados no memorial (o total de mortes é contado à parte)

// Nomes dos sobreviventes comuns (os heróis têm a própria lista)
const NAMES = ['Ana', 'Jorge', 'Marta', 'Paulo', 'Cláudia', 'Diego', 'Fernanda', 'Luiz', 'Camila', 'Roberto', 'Sueli', 'André',
  'Patrícia', 'Wesley', 'Helena', 'Márcio', 'Renata', 'Igor', 'Beatriz', 'Sérgio', 'Aline', 'Fábio', 'Vera', 'Otávio', 'Larissa',
  'Edson', 'Priscila', 'Gustavo', 'Simone', 'Ricardo', 'Joana', 'Murilo', 'Elaine', 'Vítor', 'Cristina', 'Davi', 'Natália', 'Hélio',
  'Raquel', 'Thiago', 'Sandra', 'Leandro', 'Yara', 'Wagner', 'Lívia', 'Douglas', 'Irene', 'Matheus', 'Gisele', 'Alemão', 'Dona Lurdes',
  'Seu Jair', 'Pietra', 'Caetano', 'Vânia', 'Benedito', 'Kelly', 'Osvaldo', 'Rita', 'Ivan'];

// Armas do líder (mira manual durante a horda). Ficam para sempre depois de compradas.
// Escala: a vida e o dano aparecem multiplicados por PTS (um zumbi comum tem ~10 de vida no começo do jogo).
// type: bullet (projéteis instantâneos) · grenade/rocket (explodem no ponto mirado) · flame (incendeia a área)
// dmg: por projétil · cd: segundos entre tiros · mag: tiros por pente · reload: segundos para recarregar
// use: 🔫 munição do abrigo gasta por tiro ao recarregar (a pistola não gasta) · range: alcance em pixels além do muro
// spread: espalhamento em pixels · pierce: zumbis atravessados · radius: área · auto: segurar para atirar · falloff: perde dano com a distância
// wave: melhor onda (de todas as cidades) para liberar · cost: preço da compra; cada melhoria custa ×LW_UP_MULT
const LWEAPONS = {
  pistola:    { nome: 'Pistola',         icon: '🔫', type: 'bullet', dmg: 0.35, cd: 0.3,  mag: 5,  reload: 1.5, use: 0,   range: 120, spread: 0,  wave: 1,
                cost: { sucata: 60 }, desc: 'Fraca, mas nunca gasta munição do abrigo. 5 tiros por pente.' },
  espingarda: { nome: 'Espingarda',      icon: '💥', type: 'bullet', dmg: 0.3,  cd: 0.75, mag: 2,  reload: 2,   use: 2,   range: 70,  pellets: 5, spread: 9, falloff: true, wave: 4,
                cost: { sucata: 150 }, desc: 'Cinco projéteis em leque, de cano duplo. Devastadora colada no muro, inútil de longe.' },
  rifle:      { nome: 'Rifle de caça',   icon: '🎯', type: 'bullet', dmg: 1.8,  cd: 1.1,  mag: 5,  reload: 2.6, use: 3,   range: 270, pierce: 2, spread: 0, wave: 6,
                cost: { sucata: 250, municao: 40 }, desc: 'Tiro pesado e de longo alcance que atravessa os zumbis em fila.' },
  smg:        { nome: 'Submetralhadora', icon: '🔥', type: 'bullet', dmg: 0.18, cd: 0.09, mag: 30, reload: 2.2, use: 0.5, range: 110, spread: 5, auto: true, wave: 9,
                cost: { sucata: 400, municao: 80 }, desc: 'Segure o clique para despejar balas. Pouco dano por tiro e pente que acaba rápido.' },
  granadas:   { nome: 'Lança-granadas',  icon: '💣', type: 'grenade', dmg: 1,   cd: 1,    mag: 2,  reload: 4,   use: 0,   special: 'grenade', range: 200, radius: 22, wave: 12,
                cost: { sucata: 700, municao: 120 }, desc: 'Explode onde você mirar e fere todos em volta. Só 2 granadas por carga, recarga lenta e granadas raras.' },
  chamas:     { nome: 'Lança-chamas',    icon: '🌋', type: 'flame', dmg: 1,     cd: 0.12, mag: 40, reload: 3,   use: 0,   special: 'fuel', range: 50,  radius: 16, burn: 3, auto: true, wave: 16,
                cost: { sucata: 1200, municao: 200 }, desc: 'Segure para incendiar uma área perto do muro. Cada tanque de combustível enche o lança-chamas, e combustível é raro.' },
  // special: não usa a munição do abrigo, e sim munição especial (raríssima: veja SPECIAL_AMMO)
  bazuca:     { nome: 'Bazuca',          icon: '🚀', type: 'rocket', dmg: 0,    cd: 1,    mag: 1,  reload: 8,   use: 0,   special: 'rocket', range: 230, radius: 36, wave: 25, bosses: 5,
                cost: { sucata: 5000, municao: 600, remedio: 10 }, desc: 'Um único foguete e recarga muito lenta. Mata qualquer zumbi comum da área e tira 40% da vida da Abominação. Guarde para o chefe.' },
};
const LW_MAX_LVL = 5, LW_UP_MULT = 1.7;
const LW_KEYS = ['Q', 'W', 'E'];   // até 3 armas por noite (R recarrega durante a horda; de dia, recruta)
// Munição especial da bazuca, do lança-granadas e do lança-chamas: não vem do abrigo e é rara de propósito.
// Fica no metajogo (não se perde ao evacuar). max: quanto dá para guardar (para munição por tiro, contando o que está carregado)
// tank: cada unidade enche a arma inteira (um tanque de combustível enche o lança-chamas)
const SPECIAL_AMMO = {
  rocket:  { nome: 'foguete',  plural: 'foguetes',  icon: '🚀', max: 3 },
  grenade: { nome: 'granada',  plural: 'granadas',  icon: '💣', max: 6 },
  fuel:    { nome: 'tanque de combustível', plural: 'tanques de combustível', icon: '⛽', max: 3, tank: true },
};
// De onde vem: Abominação (quantidade garantida), expedições (chance) e zumbis abatidos pelo líder (chance)
const SPECIAL_DROPS = {
  boss: { rocket: 1, grenade: 2, fuel: 1 },
  exp:  { base: { rocket: 0.05, grenade: 0.2, fuel: 0.1 }, delegacia: { grenade: 0.08 }, ferro: { fuel: 0.1 } },
  kill: { blindado: { grenade: 0.1 }, explosivo: { fuel: 0.05 } },
};
const LW_DROP = 0.15;  // chance de um zumbi abatido por você deixar um pouco de 🔫 munição para o abrigo
const PTS = 10;        // vida e dano aparecem ×10, em números inteiros
const pts = v => Math.max(0, Math.round(v * PTS));

// ---------- vitória (Cura concluída) ----------
// Cash ganho na primeira vitória de cada save, por dificuldade
const VICTORY_CASH = { facil: 10, normal: 20, dificil: 35, pesadelo: 60, apocalipse: 150 };

// Skins do líder. diff: dificuldade que precisa ser vencida para liberar (custom: qualquer vitória).
const LEADER_SKINS = {
  padrao:     { nome: 'Sobrevivente', icon: '🧍', shirt: [60, 62, 72],  pants: [40, 40, 50], hair: [30, 25, 20] },
  escoteiro:  { nome: 'Escoteiro',    icon: '🌱', diff: 'facil',      shirt: [70, 120, 60], pants: [60, 54, 40], hair: [90, 60, 30], cap: [60, 100, 50] },
  veterano:   { nome: 'Veterano',     icon: '🎖️', diff: 'normal',     shirt: [86, 96, 60],  pants: [60, 66, 44], hair: [30, 25, 20], helmet: true },
  cacador:    { nome: 'Caçador',      icon: '🏹', diff: 'dificil',    shirt: [120, 50, 40], pants: [50, 40, 34], hair: [20, 18, 16], cap: [60, 30, 26], cape: [90, 36, 30] },
  pesadelo:   { nome: 'Pesadelo',     icon: '☣️', diff: 'pesadelo',   shirt: [90, 44, 120], pants: [36, 30, 50], hair: [200, 200, 210], cape: [140, 60, 180] },
  lenda:      { nome: 'Lenda do Apocalipse', icon: '👑', diff: 'apocalipse', shirt: [200, 160, 50], pants: [70, 40, 30], hair: [30, 25, 20], cape: [170, 30, 30], crown: true },
  custom:     { nome: 'Personalizada', icon: '🎨', diff: '*' },
};

// Hall da Fama do site: quem venceu e enviou o certificado de vitória.
// Para adicionar alguém, confira o código com Victory.verify('UAV1:...') no console e copie a linha que ele devolve.
// { n: nome, d: dificuldade, t: data (AAAA-MM-DD) }
const HALL_OF_FAME = [
];
