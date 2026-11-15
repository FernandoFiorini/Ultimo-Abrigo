'use strict';

// Ao abrir: menu principal (Continuar, Carregar, Novo jogo). Trocar de save recarrega a página direto no espaço escolhido.
function boot() {
  counter();
  Slots.migrate();
  Menu.init();
  Sound.setup();   // a música do menu começa no primeiro clique ou tecla
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
  if (typeof Honored !== 'undefined') Honored.setup();
  Debug.init();
  Demos.init();
  listeners.push((t, d) => { if (t === 'achievement') achToast(d.a); });
  render();

  if (firstRun) startFirstRun();
  else if (legacyChoice) startLegacyChoice();
  else if (returnReport) showReturn(returnReport);
  returnReport = null;
  // partida nova (criada pelo menu): a abertura da história, uma vez por save. O guia espera ela terminar.
  if (!firstRun && S.wave === 1 && !S.best && (S.meta.city || 1) === 1 && !(S.meta.worlds > 1)) Story.playOnce('intro');

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
  // um erro num quadro não pode parar o jogo: fica registrado (Reportar bug) e o próximo quadro segue
  function frame(now) {
    try { frame0(now); } catch (e) { BugReport.caught(e, 'quadro'); }
    requestAnimationFrame(frame);
  }
  function frame0(now) {
    const frameDt = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    Guide.update(frameDt);   // o tutorial guiado pausa o jogo enquanto explica
    if (!Slots.dead) { S.meta.stats.time = (S.meta.stats.time || 0) + frameDt; sessionT += frameDt; }   // tempo jogado (Códice › Estatísticas)
    step();
    // pausado: a cena congela (pessoas, fogo, partículas), mas a música continua
    Scene.update(paused || guidePaused || Story.on() ? 0 : frameDt);
    Scene.draw();
    panelT += frameDt;
    if (panelT > 0.15) { Tutorial.update(panelT); panelT = 0; render(); }
  }
  requestAnimationFrame(frame);

  // Mantém o jogo rodando com a aba em segundo plano
  setInterval(() => { if (document.hidden) step(); }, 1000);
  setInterval(save, 10000);
  window.addEventListener('beforeunload', save);
}
window.addEventListener('load', boot);

// contador de visitas (GOATCOUNTER, em config.js): só no site publicado, nunca rodando localmente
function counter() {
  const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!GOATCOUNTER || local || !/^[a-z0-9-]+$/i.test(GOATCOUNTER)) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${GOATCOUNTER}.goatcounter.com/count`;
  document.head.appendChild(s);
}
