'use strict';

function save() {
  if (awaitingChoice) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    $('save-status').textContent = 'Salvo às ' + new Date().toLocaleTimeString('pt-BR');
  } catch (e) { /* armazenamento indisponível */ }
}

// Junta o save com os valores padrão (campos novos ganham o padrão; listas vêm do save)
function mergeDeep(base, saved) {
  const out = { ...base };
  for (const k in saved) {
    const b = base[k], v = saved[k];
    out[k] = b && v && typeof b === 'object' && typeof v === 'object' && !Array.isArray(b) ? mergeDeep(b, v) : v;
  }
  return out;
}

function load() {
  S = newState();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (!(d.meta && d.meta.diffChosen)) legacyChoice = true;
      const base = newState();
      const meta = mergeDeep(base.meta, d.meta || {});
      // saves antigos: aproveita o que já foi conquistado nesta partida
      meta.stats.bestWave = Math.max(meta.stats.bestWave, d.best || 0);
      meta.stats.kills = Math.max(meta.stats.kills, d.kills || 0);
      S = { ...base, ...d, meta,
        res: { ...base.res, ...d.res },
        jobs: { ...base.jobs, ...d.jobs },
        build: { ...base.build, ...d.build },
        horde: { ...base.horde, ...d.horde },
        exps: d.exps || [],
        log: (d.log || []).slice(0, 3) };
      offlineProgress();
    } else {
      firstRun = true;
    }
  } catch (e) { S = newState(); firstRun = true; }
}
let firstRun = false, legacyChoice = false, awaitingChoice = false, modalOpen = false;

function startFirstRun() {
  awaitingChoice = true;
  chooseDifficulty({
    title: '☣ Último Abrigo',
    sub: 'Você e mais dois sobreviventes encontraram um armazém abandonado. A horda chega ao anoitecer. <b>Escolha a dificuldade:</b>',
    cancel: false,
    onPick: diff => {
      S = newState(S.meta, diff);
      addLog(`Você e mais dois sobreviventes encontraram um armazém abandonado. A horda chega ao anoitecer. Prepare-se. (${DIFFS[diff].icon} ${DIFFS[diff].nome})`, 'warn');
      awaitingChoice = false;
      save();
    },
  });
}

// Saves de antes do seletor: escolhe a dificuldade uma vez, sem perder o progresso
function startLegacyChoice() {
  awaitingChoice = true;
  chooseDifficulty({
    title: '☣ Escolha a dificuldade',
    sub: 'O jogo agora tem níveis de dificuldade. Escolha um para a <b>cidade atual</b>: seu progresso continua. Depois, dá para mudar pelo selo ao lado do título (recomeçando a cidade).',
    cancel: false,
    onPick: diff => {
      S.diff = diff;
      addLog(`Dificuldade definida: ${DIFFS[diff].icon} ${DIFFS[diff].nome}.`, 'warn');
      awaitingChoice = false;
      save();
    },
  });
}
