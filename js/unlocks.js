'use strict';

// Desbloqueio progressivo: abas, funções, construções e expedições aparecem conforme a onda,
// para o começo do jogo não despejar tudo de uma vez.
// "Onda N" = a horda N é a próxima (você já sobreviveu à N−1). Construções, expedições e distritos
// usam o próprio campo `unlock` (config.js / endgame.js) e valem por cidade.
// Abas e funções, uma vez liberadas, ficam liberadas para sempre (também nas próximas cidades).
const UNLOCK_JOBS = { forrageiro: 1, coletor: 1, guarda: 3, armeiro: 5, medico: 5, cientista: 7 };
const UNLOCK_TABS = { equipe: 1, construir: 1, cidade: 4, armas: 4, pesquisa: 7, distritos: 10 };
// o que cada desbloqueio explica no aviso (ícone, nome, texto curto)
const UNLOCK_INFO = {
  'job:guarda':   ['🛡️', 'Guardas', 'Guardas atiram sozinhos na horda (1 munição por tiro). Sem munição, jogam pedras. Dê a função na aba Equipe.'],
  'job:armeiro':  ['⚙️', 'Armeiros', 'Armeiros transformam sucata em munição para os guardas e as suas armas.'],
  'job:medico':   ['⚕️', 'Médicos', 'Médicos tratam os feridos e produzem remédios, que salvam vidas quando o muro cai.'],
  'job:cientista': ['🔬', 'Cientistas', 'Construa um Laboratório e contrate cientistas para gerar pesquisa.'],
  'tab:cidade':   ['🗺️', 'Aba Cidade', 'Mande sobreviventes ociosos em expedições atrás de suprimentos. Mais tarde, liberte distritos daqui.'],
  'tab:armas':    ['🔫', 'Aba Armas', 'Compre e melhore armas para o líder. Elas ficam para sempre, mesmo depois de evacuar.'],
  'tab:pesquisa': ['🧪', 'Aba Pesquisa', 'Laboratório, cientistas e melhorias permanentes. E, um dia, a Cura.'],
  'tab:distritos': ['🏴', 'Distritos', 'Na aba Cidade: mande esquadrões libertar distritos. Cada um dá um bônus até você evacuar.'],
  'tab:herois':   ['🪖', 'Aba Exército', 'Heróis de campo lutam no telhado; heróis de apoio dão bônus. Abra as caixas que os chefes deixam.'],
  'tab:evacuacao': ['🚁', 'Aba Evacuar', 'Evacue para recomeçar numa nova cidade e ganhar ✨ Esperança, um bônus permanente.'],
  'build:torre':  ['🗼', 'Torres', 'Torres de vigia atiram sozinhas e não gastam munição (só um pouco de manutenção por horda).'],
};

const Unlocks = (() => {
  const M = () => S.meta.unl || (S.meta.unl = {});
  const wave = () => (S && S.wave) || 1;

  // condição "ao vivo" de cada aba que não depende só da onda
  const anyHero = () => {
    const c = S.meta.champ || {}, m = S.meta;
    return !!(Object.keys(c.owned || {}).length || (c.boxes || []).length || Object.keys(c.frags || {}).length || (m.heroes || []).length || (m.weapons || []).length);
  };
  const LIVE = {
    herois: anyHero,
    evacuacao: () => S.best >= EVAC_WAVE || (S.meta.hopeTotal || 0) > 0,
  };

  function tab(k) {
    if (k === 'conquistas' || k === 'loja') return true;
    if (M()['tab:' + k]) return true;
    return LIVE[k] ? LIVE[k]() : wave() >= (UNLOCK_TABS[k] || 1);
  }
  function job(k) {
    return !!M()['job:' + k] || wave() >= (UNLOCK_JOBS[k] || 1);
  }
  // próximos desbloqueios de funções (para a linha "🔒 Em breve")
  const nextJobs = () => Object.keys(UNLOCK_JOBS).filter(k => !job(k)).map(k => ({ k, n: UNLOCK_JOBS[k] }));

  // marca o que acabou de liberar e avisa (chamado no render; o bot não usa)
  let primed = false;
  function check() {
    const m = M(), fresh = [];
    const mark = (key, ok) => { if (ok && !m[key]) { m[key] = 1; fresh.push(key); } };
    for (const k in UNLOCK_JOBS) mark('job:' + k, wave() >= UNLOCK_JOBS[k]);
    for (const k of [...Object.keys(UNLOCK_TABS), ...Object.keys(LIVE)]) mark('tab:' + k, LIVE[k] ? LIVE[k]() : wave() >= UNLOCK_TABS[k]);
    // torres: aviso uma vez por save (são por cidade, então não entram no mapa permanente)
    if (!buildLocked('torre') && !m['build:torre']) { m['build:torre'] = 1; fresh.push('build:torre'); }
    // a primeira chamada só registra o que já estava aberto (sem avisos ao carregar o jogo)
    if (!primed) { primed = true; if (!m.seen0) { m.seen0 = 1; return; } }
    for (const key of fresh) announce(key);
  }
  function announce(key) {
    const info = UNLOCK_INFO[key];
    if (!info || key === 'job:forrageiro' || key === 'job:coletor') return;
    const [icon, name, text] = info;
    if (key.startsWith('tab:')) newTab(key.slice(4));
    // registro + aba brilhando; a explicação maior vem na dica do tutorial
    addLog(`🆕 Liberado: ${icon} ${name}. ${text}`, 'good');
    emit('unlock', { key });
  }
  // aba nova: brilha até ser aberta
  const newTabs = new Set();
  function newTab(k) { newTabs.add(k === 'distritos' ? 'cidade' : k); }
  const isNew = k => newTabs.has(k);
  const seenTab = k => newTabs.delete(k);

  // ao começar do zero (Novo jogo), o mapa de desbloqueios fica no meta e continua valendo
  return { tab, job, nextJobs, check, isNew, seenTab, anyHero };
})();
