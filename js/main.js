'use strict';

// Ao abrir: menu principal (Continuar, Carregar, Novo jogo). Trocar de save recarrega a página direto no espaço escolhido.
function boot() {
  Slots.migrate();
  Menu.init();
  const auto = Slots.takeAutoload();
  if (auto && Slots.has(auto)) startGame(auto);
  else Menu.show();
}

function startGame(slot) {
  Slots.cur = slot;
  Slots.setLast(slot);
  load();
  // o abrigo caiu no Apocalipse enquanto você estava fora
  if (Slots.dead) { Menu.death(); return; }
  Slots.ready = true;
  buildUI();
  $('version').textContent = 'v' + VERSION;
  Scene.init($('scene'));
  Scene.draw();
  Sound.setup();
  Debug.init();
  Demos.init();
  listeners.push((t, d) => { if (t === 'achievement') achToast(d.a); });
  render();

  if (firstRun) startFirstRun();
  else if (legacyChoice) startLegacyChoice();
  else if (returnReport) showReturn(returnReport);
  returnReport = null;

  // Conquistas que ficaram pendentes (ou que foram desbloqueadas enquanto você estava fora)
  checkAchievements();
  const pending = ACH.filter(a => S.meta.ach[a.id] === 'unlocked');
  if (pending.length) {
    const total = pending.reduce((s, a) => s + a.cash, 0);
    toast({
      icon: '🏆', label: 'Conquistas para resgatar',
      name: `${pending.length} conquista(s) esperando você`,
      desc: pending.map(a => `${a.icon} ${a.nome}`).join(' · '),
      btn: `Resgatar 💵 ${total}`, onBtn: () => { actions.claimAll(); openTab('conquistas'); },
    });
  }

  // A simulação segue o relógio do jogo (pausa, progresso offline); a cena anima pelo tempo real dos quadros.
  let panelT = 0, lastFrame = performance.now();
  function frame(now) {
    const frameDt = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    step();
    // pausado: a cena congela (pessoas, fogo, partículas), mas a música continua
    Scene.update(paused ? 0 : frameDt);
    Scene.draw();
    panelT += frameDt;
    if (panelT > 0.15) { Tutorial.update(panelT); panelT = 0; render(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Mantém o jogo rodando com a aba em segundo plano
  setInterval(() => { if (document.hidden) step(); }, 1000);
  setInterval(save, 10000);
  window.addEventListener('beforeunload', save);
}
window.addEventListener('load', boot);
