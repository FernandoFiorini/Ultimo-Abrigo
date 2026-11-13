'use strict';

// Tutorial curto: dicas que aparecem uma vez, quando a situação pede.
const Tutorial = (() => {
  // when: quando a dica pode aparecer · tab: aba sugerida
  const TIPS = [
    { id: 'equipe', icon: '👥', title: 'Seu grupo', tab: 'equipe', when: () => true,
      text: 'Cada sobrevivente precisa de uma função. Na aba <b>Equipe</b>, use + e −: forrageiros 🌾 produzem comida, guardas 🛡️ atiram na horda e armeiros ⚙️ fabricam munição.' },
    { id: 'noite', icon: '🌙', title: 'A horda chegou', when: () => S.horde.active,
      text: 'Clique nos zumbis para atirar com o líder. Os guardas atiram sozinhos enquanto houver munição; sem ela, jogam pedras. Se o muro cair, sobreviventes morrem.' },
    { id: 'vasculhar', icon: '🔍', title: 'Mãos à obra', when: () => seen('equipe'),
      text: 'Clique no cenário ou no botão <b>Vasculhar</b> para juntar comida e sucata por conta própria. Atalho: <kbd>V</kbd>.' },
    { id: 'construir', icon: '🏗️', title: 'Construa', tab: 'construir', when: () => S.res.sucata >= 25,
      text: 'Barracas ⛺ abrigam mais gente, o muro 🧱 aguenta mais pancada e torres 🗼 atiram sem gastar munição.' },
    { id: 'comida', icon: '🥫', title: 'Comida no vermelho', tab: 'equipe', when: () => rates().comida < 0 && S.res.comida < 40,
      text: 'O grupo está comendo mais do que produz. O painel mostra quanto tempo a comida ainda dura: coloque mais forrageiros antes que acabe.' },
    { id: 'muro', icon: '🧱', title: 'Muro danificado', when: () => !S.horde.active && S.wallHp < maxWall() * 0.6,
      text: 'Use <b>Reparar muro</b> (custa sucata, atalho <kbd>C</kbd>). Remédios 💊 salvam quem for atacado quando o muro cai.' },
    { id: 'expedicoes', icon: '🎒', title: 'Expedições', tab: 'expedicoes', when: () => S.best >= 2 && !hasMod('semexp'),
      text: 'Mande sobreviventes ociosos atrás de suprimentos. Mais gente traz mais coisa, mas cada um corre o risco de não voltar.' },
    { id: 'atalhos', icon: '⌨️', title: 'Atalhos de teclado', when: () => S.best >= 3,
      text: '<kbd>1</kbd>–<kbd>9</kbd> trocam de aba, <kbd>Espaço</kbd> pausa, <kbd>V</kbd> vasculha, <kbd>R</kbd> recruta, <kbd>C</kbd> conserta o muro e <kbd>M</kbd> tira o som. <kbd>H</kbd> mostra todos.' },
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
  ['1 – 9', 'Trocar de aba'],
  ['Espaço', 'Pausar / continuar'],
  ['V', 'Vasculhar'],
  ['R', 'Recrutar'],
  ['C', 'Consertar o muro'],
  ['M', 'Ligar / desligar todo o som'],
  ['O', 'Abrir o comerciante (quando ele estiver no abrigo)'],
  ['H ou ?', 'Mostrar esta lista'],
  ['Esc', 'Fechar janela'],
];

function showShortcuts() {
  openDialog({
    title: '⌨️ Atalhos de teclado',
    body: `<table class="keys">${SHORTCUTS.map(([k, d]) => `<tr><td>${k.split(' ou ').map(x => `<kbd>${x}</kbd>`).join(' ou ')}</td><td>${d}</td></tr>`).join('')}</table>`,
    cancel: 'Fechar',
  });
}

function togglePause(force) {
  paused = force ?? !paused;
  addLog(paused ? '⏸ Jogo pausado.' : '▶ Jogo retomado.');
  render();
}

function setupKeys() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (e.key === 'Escape') { if (dialogEsc()) e.preventDefault(); return; }
    if (modalOpen || awaitingChoice) return;

    const k = e.key.toLowerCase();
    if (/^[1-9]$/.test(k)) {
      const tabs = [...document.querySelectorAll('.tab')];
      const t = tabs[+k - 1];
      if (t) { t.click(); e.preventDefault(); }
      return;
    }
    const click = id => { const b = $(id); if (b && !b.disabled) b.click(); };
    switch (k) {
      case ' ':
        e.preventDefault();
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        if (!e.repeat) togglePause();
        break;
      case 'v': if (!e.repeat) click('btn-scavenge'); break;
      case 'r': click('btn-recruit'); break;
      case 'c': click('btn-repair'); break;
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
