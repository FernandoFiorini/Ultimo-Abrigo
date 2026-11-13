'use strict';

function expReturn(e) {
  const L = EXPED[e.loc];
  let dead = 0;
  for (let i = 0; i < e.n; i++) if (Math.random() < L.risk * Endgame.riskMult()) dead++;
  const back = e.n - dead;
  const scale = (1 + 0.08 * (S.wave - 1)) * hopeMult() * Endgame.scoutLoot();
  const got = [];
  for (const r in L.loot) {
    const [a, b] = L.loot[r];
    const v = Math.round((a + Math.random() * (b - a)) * back * scale);
    if (v > 0) { S.res[r] += v; got.push(`+${fmt(v)} ${RES[r].icon}`); }
  }
  S.survivors -= dead;
  let found = 0;
  if (back > 0 && S.survivors < maxSurv() && Math.random() < Math.min(0.5, 0.12 * back)) { S.survivors++; found = 1; }

  let msg = `🎒 Expedição ao ${L.nome} voltou`;
  msg += back ? `: ${got.join(' ')}` : ' vazia...';
  if (dead) msg += `. ${dead} não voltou(aram).`;
  if (found) msg += ' Encontraram um sobrevivente!';
  addLog(msg, dead ? 'warn' : 'good');
  emit('expReturn', { n: back + found, loot: got.join(' ') });
  S.meta.stats.exps++;
  Endgame.count('exps', 1);
  if (back > 0 && e.loc === 'base' && Math.random() < 0.25) Endgame.gainWeapon('na Base militar');
  if (back > 0 && e.loc === 'base' && Math.random() < 0.08) Endgame.gainHero('na Base militar');
  if (S.survivors <= 0) gameOver();
}

function evacuate() {
  const g = hopeGain();
  if (!g) return;
  chooseDifficulty({
    title: `🚁 Evacuar para a cidade ${S.meta.city + 1}`,
    sub: `Você ganha <b>✨ ${g} de Esperança</b> e recomeça do zero (sobreviventes, recursos e construções). Escolha a dificuldade da próxima cidade. Quanto mais difícil, mais Esperança você ganhará lá.`,
    cancel: true,
    onPick: diff => {
      const meta = S.meta;
      meta.hope += g;
      meta.hopeTotal += g;
      meta.city++;
      meta.stats.evacs++;
      S = newState(meta, diff);
      addLog(`🚁 Evacuação concluída! Cidade ${meta.city} (${DIFFS[diff].icon} ${DIFFS[diff].nome}). +${g} de Esperança (agora +${Math.round(meta.hopeTotal * 3)}% de produção).`, 'good');
      emit('evacuate', { city: meta.city, g });
      save();
    },
  });
}
