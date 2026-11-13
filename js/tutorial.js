'use strict';

// Tutorial curto: dicas que aparecem uma vez, quando a situação pede.
const Tutorial = (() => {
  // when: quando a dica pode aparecer · tab: aba sugerida
  const TIPS = [
    { id: 'equipe', icon: '👥', title: 'Seu grupo', tab: 'equipe', when: () => true,
      text: 'Cada sobrevivente precisa de uma função. Na aba <b>Equipe</b>, use + e −: forrageiros 🌾 produzem comida, guardas 🛡️ atiram na horda e armeiros ⚙️ fabricam munição.' },
    { id: 'noite', icon: '🌙', title: 'A horda chegou', when: () => S.horde.active,
      text: 'Mire e clique para atirar com o líder: tiros fora do zumbi erram. Os guardas atiram sozinhos enquanto houver munição; sem ela, jogam pedras. Se o muro cair, sobreviventes morrem.' },
    { id: 'armas', icon: '🔫', title: 'Armas do líder', tab: 'armas', when: () => !S.horde.active && Math.max(S.best, S.meta.stats.bestWave) >= 4,
      text: 'Na aba <b>Armas</b> você compra e melhora armas para o líder. Elas ficam para sempre, têm munição própria a cada noite e você leva até 3 por noite, nos espaços <b>(Q) (W) (E)</b>.' },
    { id: 'vasculhar', icon: '🔍', title: 'Mãos à obra', when: () => seen('equipe'),
      text: 'Use o botão <b>Vasculhar</b> para juntar comida e sucata por conta própria. Atalho: <b>(V)</b>.' },
    { id: 'construir', icon: '🏗️', title: 'Construa', tab: 'construir', when: () => S.res.sucata >= 25,
      text: 'Barracas ⛺ abrigam mais gente, o muro 🧱 aguenta mais pancada e torres 🗼 atiram sem gastar munição.' },
    { id: 'comida', icon: '🥫', title: 'Comida no vermelho', tab: 'equipe', when: () => rates().comida < 0 && S.res.comida < 40,
      text: 'O grupo está comendo mais do que produz. O painel mostra quanto tempo a comida ainda dura: coloque mais forrageiros antes que acabe.' },
    { id: 'muro', icon: '🧱', title: 'Muro danificado', when: () => !S.horde.active && S.wallHp < maxWall() * 0.6,
      text: 'Use <b>Reparar muro</b> (custa sucata, atalho <b>(C)</b>). Remédios 💊 salvam quem for atacado quando o muro cai.' },
    { id: 'expedicoes', icon: '🎒', title: 'Expedições', tab: 'expedicoes', when: () => S.best >= 2 && !hasMod('semexp'),
      text: 'Mande sobreviventes ociosos atrás de suprimentos. Mais gente traz mais coisa, mas cada um corre o risco de não voltar.' },
    { id: 'atalhos', icon: '⌨️', title: 'Atalhos de teclado', when: () => S.best >= 3,
      text: '<b>(1)</b>–<b>(0)</b> trocam de aba, <b>(Q) (W) (E)</b> trocam de arma, <b>(Espaço)</b> pausa, <b>(V)</b> vasculha, <b>(R)</b> recruta, <b>(C)</b> conserta o muro, <b>(F)</b> acelera o dia e <b>(M)</b> tira o som. <b>(H)</b> mostra todos.' },
    { id: 'backup', icon: '💾', title: 'Guarde seu progresso', when: () => S.best >= 5,
      text: 'O jogo salva sozinho neste navegador. Use <b>Exportar</b>, no rodapé, para guardar um código do save e continuar em outro aparelho.' },
    { id: 'evacuar', icon: '🚁', title: 'Evacuação liberada', tab: 'evacuacao', when: () => S.best >= EVAC_WAVE,
      text: 'Agora você pode evacuar: recomeça numa nova cidade, mas ganha ✨ Esperança, que dá bônus para sempre. Desafios opcionais aumentam a Esperança da próxima cidade.' },
  ];
  const TAB_NAMES = { equipe: 'Equipe', construir: 'Construir', expedicoes: 'Expedições', evacuacao: 'Evacuar' };

  const T = () => S.meta.tutorial || (S.meta.tutorial = {});
  const seen = id => !!T()[id];
  let cur = null, wait = 2;

  function show(tip) {
    cur = tip;
    const box = $('tip');
    box.innerHTML = `
      <div class="tip-icon">${tip.icon}</div>
      <div class="tip-body">
        <div class="tip-label">Dica</div>
        <div class="tip-title">${tip.title}</div>
        <div class="tip-text">${tip.text}</div>
        <div class="tip-actions">
          ${tip.tab ? `<button data-tip="tab">Abrir ${TAB_NAMES[tip.tab]}</button>` : ''}
          <button class="primary" data-tip="ok">Entendi</button>
          <button class="link" data-tip="skip">Pular tutorial</button>
        </div>
      </div>`;
    highlight(box.querySelector('.tip-text'));
    box.classList.remove('hidden');
  }

  function dismiss(all) {
    if (cur) T()[cur.id] = 1;
    if (all) T().off = true;
    cur = null;
    wait = 4;
    $('tip').classList.add('hidden');
  }

  function setup() {
    $('tip').addEventListener('click', e => {
      const b = e.target.closest('[data-tip]');
      if (!b) return;
      if (b.dataset.tip === 'tab' && cur) openTab(cur.tab);
      dismiss(b.dataset.tip === 'skip');
    });
  }

  // chamado junto com o render (~7x por segundo)
  function update(dt) {
    if (T().off) { if (cur) dismiss(); return; }
    if (cur || awaitingChoice || modalOpen) return;
    wait -= dt;
    if (wait > 0) return;
    const tip = TIPS.find(t => !seen(t.id) && t.when());
    if (tip) show(tip);
  }

  // Ao recomeçar do zero, o tutorial volta a valer
  const reset = () => { S.meta.tutorial = {}; if (cur) { cur = null; $('tip').classList.add('hidden'); } };

  return { setup, update, reset };
})();

// ---------- atalhos de teclado ----------
const SHORTCUTS = [
  ['1 – 9 e 0', 'Trocar de aba (nas janelas, escolher a opção com o mesmo número)'],
  ['Q W E', 'Trocar de arma durante a horda (ou a roda do mouse)'],
  ['Clique', 'Atirar durante a horda (segure para as armas automáticas)'],
  ['Espaço', 'Pausar / continuar'],
  ['V', 'Vasculhar'],
  ['R', 'Recrutar'],
  ['C', 'Consertar o muro'],
  ['F', 'Velocidade 2x de dia (liga / desliga)'],
  ['M', 'Ligar / desligar todo o som'],
  ['O', 'Abrir o comerciante (quando ele estiver no abrigo)'],
  ['H ou ?', 'Mostrar esta lista'],
  ['Esc', 'Fechar janela'],
];

function showShortcuts() {
  openDialog({
    title: '⌨️ Atalhos de teclado',
    // mesmo formato dos botões: (R), (1), (Q)...
    body: `<table class="keys">${SHORTCUTS.map(([k, d]) => `<tr><td>${k.split(' ').map(x => ['ou', 'e', '–'].includes(x) ? x : `<b class="hk">(${x})</b>`).join(' ')}</td><td>${d}</td></tr>`).join('')}</table>`,
    cancel: 'Fechar',
  });
}

function togglePause(force) {
  paused = force ?? !paused;
  addLog(paused ? '⏸ Jogo pausado.' : '▶ Jogo retomado.');
  render();
}

let lastNope = 0;   // evita repetir o aviso de botão indisponível
function setupKeys() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (e.key === 'Escape') { if (dialogEsc()) e.preventDefault(); return; }
    const k = e.key.toLowerCase();
    // nas janelas, os números escolhem as opções marcadas com (1), (2)...
    if (modalOpen && /^[0-9]$/.test(k)) {
      const b = document.querySelector(`#dialog:not(.hidden) [data-hotkey="${k}"]`);
      if (b && !b.disabled) { b.click(); e.preventDefault(); }
      return;
    }
    if (modalOpen || awaitingChoice) return;

    if (/^[0-9]$/.test(k)) {
      const tabs = [...document.querySelectorAll('.side > .tabs .tab')];
      const t = tabs[k === '0' ? 9 : +k - 1];
      if (t) { t.click(); e.preventDefault(); }
      return;
    }
    // botão indisponível: treme e (se houver) diz o motivo, para o atalho não parecer quebrado
    const click = (id, why) => {
      const b = $(id);
      if (!b) return;
      if (!b.disabled) { b.click(); return; }
      b.classList.remove('nope');
      void b.offsetWidth;
      b.classList.add('nope');
      const msg = why && why();
      if (msg && !e.repeat && Date.now() - lastNope > 1500) { lastNope = Date.now(); addLog(msg, 'warn'); }
    };
    const recruitWhy = () => hasMod('isolados') ? '📵 Desafio "Isolados": ninguém pode ser recrutado nesta cidade.'
      : S.survivors >= maxSurv() ? `🧍 Abrigo lotado (${S.survivors}/${maxSurv()}): construa barracas para recrutar mais gente.`
      : `🧍 Comida insuficiente para recrutar: precisa de ${RES.comida.icon} ${recruitCost()}.`;
    switch (k) {
      case ' ':
        e.preventDefault();
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        if (!e.repeat) togglePause();
        break;
      case 'v': if (!e.repeat) click('btn-scavenge'); break;
      case 'r': case 'g': click('btn-recruit', recruitWhy); break;
      case 'q': case 'w': case 'e': Weapons.select('qwe'.indexOf(k)); render(); break;
      case 'c': click('btn-repair'); break;
      case 'f': Settings.set('speed2x', !Settings.get('speed2x')); render(); break;
      case 'o': if (S.merchant) Events.openMerchant(); break;
      case 'm': {
        const mb = $('snd-music'), sb = $('snd-sfx');
        const anyOn = !mb.classList.contains('off') || !sb.classList.contains('off');
        if (anyOn !== mb.classList.contains('off')) mb.click();
        if (anyOn !== sb.classList.contains('off')) sb.click();
        break;
      }
      case 'h': case '?': showShortcuts(); break;
      default: return;
    }
  });
}
