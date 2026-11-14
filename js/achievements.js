'use strict';

function newStats() {
  return { kills: 0, bosses: 0, bloaters: 0, exps: 0, builds: 0, scav: 0, shots: 0, saved: 0, evacs: 0, airstrikes: 0, flawless: 0, bestWave: 0,
    bk: {}, leapStops: 0, bloatFar: 0 };   // bk: chefes derrotados por tipo
}
let achT = 0;
const stat = k => S.meta.stats[k];

function countKill(type, k = 1) {
  const st = S.meta.stats;
  st.kills += k;
  if (ZTYPES[type].boss) { st.bosses += k; if (!st.bk) st.bk = {}; st.bk[type] = (st.bk[type] || 0) + k; }
  if (type === 'explosivo') st.bloaters += k;
}

// val: valor atual · goal: meta · cash: recompensa
const ACH = [
  { id: 'kill1',    icon: '🩸', nome: 'Primeiro sangue',     desc: 'Abata seu primeiro zumbi',              val: () => stat('kills'), goal: 1,     cash: 1 },
  { id: 'kill100',  icon: '🔪', nome: 'Caçador',             desc: 'Abata 100 zumbis',                      val: () => stat('kills'), goal: 100,   cash: 2 },
  { id: 'kill1k',   icon: '💀', nome: 'Exterminador',        desc: 'Abata 1.000 zumbis',                    val: () => stat('kills'), goal: 1000,  cash: 5 },
  { id: 'kill10k',  icon: '☠️', nome: 'Lenda do apocalipse', desc: 'Abata 10.000 zumbis',                   val: () => stat('kills'), goal: 10000, cash: 15 },
  { id: 'wave5',    icon: '🌙', nome: 'Primeiras noites',    desc: 'Sobreviva até a onda 5',                val: () => stat('bestWave'), goal: 5,  cash: 1 },
  { id: 'wave10',   icon: '🌕', nome: 'Veterano da noite',   desc: 'Sobreviva até a onda 10',               val: () => stat('bestWave'), goal: 10, cash: 3 },
  { id: 'wave20',   icon: '🌑', nome: 'Inquebrável',         desc: 'Sobreviva até a onda 20',               val: () => stat('bestWave'), goal: 20, cash: 6 },
  { id: 'wave30',   icon: '👑', nome: 'Rei das ruínas',      desc: 'Sobreviva até a onda 30',               val: () => stat('bestWave'), goal: 30, cash: 12 },
  { id: 'boss1',    icon: '👹', nome: 'Matador de gigantes', desc: 'Derrote um chefe',                      val: () => stat('bosses'), goal: 1,   cash: 3 },
  { id: 'boss10',   icon: '🗡️', nome: 'Pesadelo dos monstros', desc: 'Derrote 10 chefes',                    val: () => stat('bosses'), goal: 10,  cash: 10 },
  { id: 'bloat25',  icon: '💥', nome: 'Estourador',          desc: 'Elimine 25 Inchados',                   val: () => stat('bloaters'), goal: 25, cash: 2 },
  { id: 'flaw1',    icon: '🛡️', nome: 'Intocável',           desc: 'Vença uma onda 5+ sem dano ao muro',    val: () => stat('flawless'), goal: 1,  cash: 2 },
  { id: 'flaw10',   icon: '🏰', nome: 'Muralha viva',        desc: 'Vença 10 ondas 5+ sem dano ao muro',    val: () => stat('flawless'), goal: 10, cash: 5 },
  { id: 'pop10',    icon: '👥', nome: 'Comunidade',          desc: 'Tenha 10 sobreviventes ao mesmo tempo', val: () => S.survivors, goal: 10,       cash: 2 },
  { id: 'pop25',    icon: '🏘️', nome: 'Pequena cidade',      desc: 'Tenha 25 sobreviventes ao mesmo tempo', val: () => S.survivors, goal: 25,       cash: 6 },
  { id: 'wall500',  icon: '🧱', nome: 'Fortaleza',           desc: 'Tenha um muro com 500 de resistência',  val: () => maxWall(), goal: 500,        cash: 3 },
  { id: 'build10',  icon: '🔨', nome: 'Construtor',          desc: 'Construa ou melhore 10 vezes',          val: () => stat('builds'), goal: 10,  cash: 1 },
  { id: 'build50',  icon: '🏗️', nome: 'Engenheiro-chefe',    desc: 'Construa ou melhore 50 vezes',          val: () => stat('builds'), goal: 50,  cash: 4 },
  { id: 'exp10',    icon: '🎒', nome: 'Explorador',          desc: 'Conclua 10 expedições',                 val: () => stat('exps'), goal: 10,    cash: 2 },
  { id: 'exp50',    icon: '🗺️', nome: 'Desbravador',         desc: 'Conclua 50 expedições',                 val: () => stat('exps'), goal: 50,    cash: 5 },
  { id: 'scav100',  icon: '🔍', nome: 'Catador',             desc: 'Vasculhe 100 vezes',                    val: () => stat('scav'), goal: 100,   cash: 1 },
  { id: 'scav1k',   icon: '🧺', nome: 'Rato de ruínas',      desc: 'Vasculhe 1.000 vezes',                  val: () => stat('scav'), goal: 1000,  cash: 4 },
  { id: 'shot500',  icon: '🎯', nome: 'Atirador de elite',   desc: 'Acerte 500 tiros com o líder',          val: () => stat('shots'), goal: 500,  cash: 3 },
  { id: 'saved10',  icon: '💊', nome: 'Médico de guerra',    desc: 'Remédios salvam 10 vidas',              val: () => stat('saved'), goal: 10,   cash: 2 },
  { id: 'evac1',    icon: '🚁', nome: 'Nova esperança',      desc: 'Evacue para outra cidade',              val: () => stat('evacs'), goal: 1,    cash: 3 },
  { id: 'evac5',    icon: '🌍', nome: 'Nômade',              desc: 'Evacue 5 vezes',                        val: () => stat('evacs'), goal: 5,    cash: 10 },
  { id: 'air1',     icon: '✈️', nome: 'Chuva de fogo',       desc: 'Use um ataque aéreo',                   val: () => stat('airstrikes'), goal: 1, cash: 1 },
];

function checkAchievements() {
  for (const a of ACH) {
    if (S.meta.ach[a.id] || a.val() < a.goal) continue;
    S.meta.ach[a.id] = 'unlocked';
    addLog(`🏆 Conquista desbloqueada: ${a.icon} ${a.nome}! Resgate 💵 ${a.cash} na aba Conquistas.`, 'good');
    emit('achievement', { a });
  }
}

function claimAch(id) {
  const a = ACH.find(x => x.id === id);
  if (!a || S.meta.ach[id] !== 'unlocked') return;
  S.meta.ach[id] = 'claimed';
  gainCash(a.cash, `conquista "${a.nome}"`);
}
