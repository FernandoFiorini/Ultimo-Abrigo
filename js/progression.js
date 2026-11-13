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
  const lost = removeSurvivors(dead, `não voltou da expedição: ${L.nome}`);
  let found = '';
  if (back > 0 && S.survivors < maxSurv() && Math.random() < Math.min(0.5, 0.12 * back)) found = addSurvivor();

  let msg = `🎒 Expedição ao ${L.nome} voltou`;
  msg += back ? `: ${got.join(' ')}` : ' vazia...';
  if (dead) msg += `. ${joinNames(lost)} não ${dead > 1 ? 'voltaram' : 'voltou'}.`;
  if (found) msg += ` Encontraram ${found}, que se juntou ao grupo!`;
  addLog(msg, dead ? 'warn' : 'good');
  emit('expReturn', { n: back + (found ? 1 : 0), loot: got.join(' ') });
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
      chooseMods();
    },
  });
}

// Desafios opcionais da nova cidade: cada um a deixa mais difícil e aumenta a Esperança ganha nela
function chooseMods() {
  const offer = Object.keys(MODS).sort(() => Math.random() - 0.5).slice(0, MOD_OFFER);
  const sel = new Set();
  const pct = v => Math.round(v * 100) + '%';
  openDialog({
    title: `🎲 Desafios da cidade ${S.meta.city}`,
    body: () => `<p class="event-text">Quer deixar esta cidade mais difícil? Cada desafio aumenta a <b>✨ Esperança</b> que você vai ganhar ao evacuar dela. Os desafios valem até a próxima evacuação, mesmo se o abrigo cair.</p>
      <div class="mod-list">${offer.map((k, i) => `
        <button class="mod-card ${sel.has(k) ? 'on' : ''}" data-opt="${k}" data-hotkey="${(i + 1) % 10}">
          <span class="mod-name">${hk((i + 1) % 10)} ${MODS[k].icon} ${MODS[k].nome}</span>
          <span class="mod-desc">${MODS[k].desc}</span>
          <span class="mod-bonus">+${pct(MODS[k].bonus)} de Esperança</span>
        </button>`).join('')}</div>
      <p class="mod-total">Bônus de Esperança nesta cidade: <b>+${pct(modBonus([...sel]))}</b></p>`,
    onOpt: k => { if (sel.has(k)) sel.delete(k); else sel.add(k); },
    buttons: [{ label: () => sel.size ? `Começar com ${sel.size} desafio(s)` : 'Começar sem desafios', cls: 'primary',
      onClick: () => applyMods([...sel]) }],
  });
}

function applyMods(list) {
  S.mods = list.filter(k => MODS[k]);
  S.wallHp = maxWall();
  S.waveTimer = waveInterval();
  if (S.mods.length) addLog(`🎲 Desafios ativos: ${S.mods.map(k => `${MODS[k].icon} ${MODS[k].nome}`).join(', ')}. +${Math.round(modBonus() * 100)}% de Esperança nesta cidade.`, 'warn');
  save();
}
