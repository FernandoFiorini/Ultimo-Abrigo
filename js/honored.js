'use strict';

// Sobreviventes homenageados (lista HONORED em config.js): entram no grupo como qualquer sobrevivente,
// mas só eles falam as próprias frases, num balão no cenário e no registro. Ver também pickName (state.js).
const Honored = (() => {
  const pickOf = a => a[Math.floor(Math.random() * a.length)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const list = () => (typeof HONORED !== 'undefined' ? HONORED : []);
  const byName = n => list().find(h => h.nome === n);
  const present = () => (S.people || []).filter(byName);
  let wait = rand(20, 35);

  // fala uma frase. kind: 'frases' (do dia a dia) ou 'horda' (quando a horda chega); sem frases desse tipo, usa as do dia a dia
  function say(name, kind = 'frases') {
    const h = byName(name);
    if (!h) return false;
    const pool = (h[kind] && h[kind].length ? h[kind] : h.frases) || [];
    if (!pool.length) return false;
    const text = pickOf(pool);
    emit('say', { name, text, fem: h.sexo === 'f', look: h.visual });
    addLog(`💬 ${name}: "${text}"`);
    return true;
  }

  // easter egg (campo "bug" em HONORED): a pessoa "acha um bug" e quebra a economia, que logo é refeita.
  // Só de mentira: no fim sobra 1 sucata de consolação.
  let bugT = 0, bugWho = null;
  function speak(h, text) {
    emit('say', { name: h.nome, text, fem: h.sexo === 'f', look: h.visual });
    addLog(`💬 ${h.nome}: "${text}"`);
  }
  function startBug(h) {
    speak(h, h.bug.antes);
    addLog(`📈 ${h.nome} achou um jeito de duplicar sucata... a economia do abrigo quebrou completamente!`);
    bugWho = h; bugT = 6;
  }
  function endBug() {
    const h = bugWho; bugWho = null;
    if (!h || !present().includes(h.nome)) return;
    addLog(`🛠️ O desenvolvedor refez o código quase todo e a economia voltou ao normal. ${h.nome} ficou com 1 🔩 sucata de consolação.`);
    S.res.sucata += 1;
    speak(h, h.bug.depois);
  }

  // easter egg (campo "codigo" em HONORED): a pessoa "programa" o abrigo (o código aparece no balão)
  // e, uns segundos depois, comenta. Sobra 1 🔬 de pesquisa.
  let codeT = 0, codeWho = null;
  function startCode(h) {
    speak(h, pickOf(h.codigo.linhas));
    addLog(`🖥️ ${h.codigo.log}`);
    codeWho = h; codeT = 6;
  }
  function endCode() {
    const h = codeWho; codeWho = null;
    if (!h || !present().includes(h.nome)) return;
    S.meta.rp = (S.meta.rp || 0) + 1;
    addLog(`🔬 O código de ${h.nome} até rodou: +1 de pesquisa.`);
    speak(h, h.codigo.depois);
  }

  // de tempos em tempos, de dia ou de noite, alguém da lista que está no grupo fala
  function tick(dt) {
    if (!list().length || (typeof paused !== 'undefined' && paused)) return;
    if (bugWho && (bugT -= dt) <= 0) endBug();
    if (codeWho && (codeT -= dt) <= 0) endCode();
    wait -= dt;
    if (wait > 0) return;
    wait = rand(HONORED_GAP[0], HONORED_GAP[1]);
    const ps = present();
    if (!ps.length) return;
    const name = pickOf(ps), h = byName(name);
    if (h.bug && !bugWho && Math.random() < h.bug.chance) startBug(h);
    else if (h.codigo && !codeWho && Math.random() < h.codigo.chance) startCode(h);
    else say(name);
  }

  // campo "prod": quem está no grupo muda a produção do abrigo (multiplicador e quem causa, para o aviso)
  const prodWho = () => present().map(byName).filter(h => h.prod);
  const prodMult = () => prodWho().reduce((a, h) => a * (1 + h.prod), 1);

  // a horda chegou: às vezes um deles grita a frase de horda
  function onWaveStart() {
    const ps = present();
    if (ps.length && Math.random() < 0.6) { say(pickOf(ps), 'horda'); wait = Math.max(wait, 20); }
  }

  // últimas palavras (vão para o memorial)
  function lastWords(name) { const h = byName(name); return h && h.adeus && h.adeus.length ? pickOf(h.adeus) : null; }

  function setup() { listeners.push(t => { if (t === 'waveStart') onWaveStart(); }); }

  // ---------- história curta de cada sobrevivente (sempre a mesma para o mesmo nome no mesmo save) ----------
  const PROF = [['professor', 'professora'], ['motorista de ônibus', 'motorista de ônibus'], ['enfermeiro', 'enfermeira'], ['pedreiro', 'pedreira'], ['cozinheiro', 'cozinheira'],
    ['mecânico', 'mecânica'], ['estudante de medicina', 'estudante de medicina'], ['pasteleiro na feira', 'pasteleira na feira'], ['bombeiro voluntário', 'bombeira voluntária'],
    ['DJ de festa de bairro', 'DJ de festa de bairro'], ['entregador de aplicativo', 'entregadora de aplicativo'], ['caixa de supermercado', 'caixa de supermercado'],
    ['técnico de informática', 'técnica de informática'], ['pescador', 'pescadora'], ['taxista', 'taxista'], ['carteiro', 'carteira'], ['jogador de futebol de várzea', 'jogadora de futebol de várzea'],
    ['costureiro', 'costureira'], ['padeiro', 'padeira'], ['segurança de shopping', 'segurança de shopping'], ['veterinário', 'veterinária'], ['eletricista', 'eletricista']];
  const PLACE = ['numa cidade do interior', 'num bairro da zona norte', 'numa vila de pescadores', 'num prédio do centro', 'numa fazenda de café', 'numa cidade praiana',
    'numa comunidade no alto do morro', 'numa cidadezinha de serra', 'perto da rodoviária', 'num conjunto habitacional'];
  const HOW = [f => `Passou as primeiras semanas escondid${f ? 'a' : 'o'} num ${pickOf(['supermercado', 'ônibus escolar', 'shopping abandonado', 'túnel do metrô', 'galpão de escola de samba'])}.`,
    f => `Chegou ao abrigo carregando ${pickOf(['uma gaita velha', 'um rádio de pilha', 'um álbum de figurinhas quase completo', 'uma foto da família', 'uma panela de pressão', 'um gato chamado Pipoca', 'um violão sem duas cordas'])}.`,
    f => `Perdeu ${pickOf(['a família', 'o melhor amigo', 'a casa', 'o cachorro'])} na primeira noite e não gosta de falar sobre isso.`,
    f => `Jura que já viu um chefe de perto e saiu viv${f ? 'a' : 'o'} para contar.`,
    f => `Atravessou a cidade a pé, só de noite, para chegar até aqui.`];
  const HABIT = ['Ronca alto.', 'Conta piada ruim nas horas erradas.', 'Guarda tudo o que encontra no caminho.', 'Canta enquanto trabalha.', 'Nunca dorme sem antes conferir o muro.',
    'Divide a comida com quem precisa.', 'Coleciona tampinhas.', 'Acorda todo mundo com café.', 'Fala com as plantas da horta.', 'Conserta qualquer coisa com fita isolante.'];
  const DREAM = ['Quer ver o mar de novo.', 'Sonha em reabrir o próprio negócio.', 'Quer achar a irmã que mora no sul.', 'Promete um churrasco quando tudo acabar.',
    'Quer ensinar as crianças a ler de novo.', 'Sonha com um banho quente.', 'Quer tocar numa banda outra vez.', 'Acredita que a Cura vai sair daqui.'];
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const bioCache = {};
  function bio(name) {
    const fixed = byName(name);
    if (fixed && fixed.historia) return fixed.historia;
    const key = name + '|' + ((S && S.meta && S.meta.runId) || '');
    if (bioCache[key]) return bioCache[key];
    let seed = hash(key) || 1;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, pk = a => a[Math.floor(rnd() * a.length)];
    const f = isFemale(name), real = Math.random;
    Math.random = rnd;   // as escolhas dentro dos textos também ficam fixas para este nome
    try {
      const prof = pk(PROF)[f ? 1 : 0];
      return (bioCache[key] = `Antes de tudo, era ${prof} ${pk(PLACE)}. ${pk(HOW)(f)} ${pk(HABIT)} ${pk(DREAM)}`);
    } finally { Math.random = real; }
  }

  return { say, tick, setup, lastWords, is: n => !!byName(n), byName, bio, prodMult, prodWho };
})();
