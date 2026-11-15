'use strict';

// Reportar bug: janela para o jogador descrever o problema, com um snapshot do save (o mesmo código do Exportar),
// a versão, a dificuldade, a onda, o navegador, as últimas linhas do registro e os erros recentes anexados sozinhos.
// Envio (BUG_REPORT, em config.js):
//   - com a chave do Web3Forms, o relatório chega no seu e-mail direto do jogo (sem o jogador precisar de conta);
//   - sem a chave, o jogador copia ou baixa o relatório e abre uma issue no GitHub (o arquivo vai anexado).
// Dados pessoais: só o nome do jogador (o que já está no save); nada de e-mail, IP ou identificador do aparelho.
//
// Rede de segurança: erros de código são guardados (os últimos ERR_MAX), o jogo continua rodando e um aviso
// oferece o Reportar bug com o erro já anexado.
const BugReport = (() => {
  const KINDS = { erro: '💥 Erro ou travamento', visual: '🎨 Problema visual', equilibrio: '⚖️ Muito fácil ou muito difícil', texto: '✏️ Texto errado', outro: '❔ Outro' };
  const inGame = () => typeof S !== 'undefined' && S && S.meta && typeof Slots !== 'undefined' && Slots.ready;
  const ERR_MAX = 8, TOAST_GAP = 60000;

  // ---------- erros capturados
  const errors = [];
  let lastToast = 0;
  function caught(e, where) {
    const msg = String((e && (e.message || e.reason && e.reason.message)) || e || 'erro desconhecido');
    const stack = String((e && e.stack) || '').split('\n').slice(0, 4).join(' | ');
    const same = errors.find(x => x.msg === msg);
    if (same) { same.n++; same.t = Date.now(); }
    else { errors.push({ msg, stack, where: where || '', n: 1, t: Date.now() }); if (errors.length > ERR_MAX) errors.shift(); }
    try { console.error('[Voidfall]', where || '', e); } catch (x) { /* sem console */ }
    // aviso, no máximo um por minuto (o mesmo erro a cada quadro não vira uma chuva de avisos)
    if (Date.now() - lastToast > TOAST_GAP && typeof toast === 'function' && document.getElementById('toasts')) {
      lastToast = Date.now();
      try {
        toast({ icon: '⚠️', label: 'Algo deu errado', name: 'O jogo encontrou um erro', desc: 'Ele continua rodando, mas pode se comportar de um jeito estranho. Nos conte o que você estava fazendo!',
          btn: '🐞 Reportar bug', onBtn: () => open('erro'), time: 9000 });
      } catch (x) { /* a própria interface quebrou: só guarda o erro */ }
    }
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('error', ev => caught(ev.error || ev.message, ev.filename ? `${String(ev.filename).split('/').pop()}:${ev.lineno}` : ''));
    window.addEventListener('unhandledrejection', ev => caught(ev.reason, 'promise'));
  }

  // navegador e sistema, de forma resumida (sem a linha inteira do user agent)
  function browser() {
    const ua = navigator.userAgent;
    const b = /Edg\/(\d+)/.exec(ua) ? `Edge ${RegExp.$1}` : /OPR\/(\d+)/.exec(ua) ? `Opera ${RegExp.$1}` : /Firefox\/(\d+)/.exec(ua) ? `Firefox ${RegExp.$1}`
      : /Chrome\/(\d+)/.exec(ua) ? `Chrome ${RegExp.$1}` : /Version\/(\d+).*Safari/.exec(ua) ? `Safari ${RegExp.$1}` : 'Outro';
    const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '?';
    return `${b} · ${os} · tela ${screen.width}×${screen.height}`;
  }

  // o que vai junto com a descrição
  function info() {
    const out = { versao: VERSION, navegador: browser() };
    if (errors.length) out.erros = errors.map(e => `${e.msg}${e.where ? ` (${e.where})` : ''}${e.n > 1 ? ` ×${e.n}` : ''}${e.stack ? ` · ${e.stack}` : ''}`);
    if (!inGame()) return out;
    const Df = DIFFS[S.diff] || DIFFS.normal;
    return {
      ...out,
      jogador: S.meta.player || 'Sobrevivente',
      dificuldade: `${Df.icon} ${Df.nome}`,
      onda: S.horde.active ? `${S.horde.n} (horda em andamento)` : `${S.wave}`,
      cidade: `${S.meta.city || 1} · mundo ${S.meta.worlds || 1}`,
      registro: (S.log || []).map(l => String(l.text).replace(/<[^>]+>/g, '')),
    };
  }

  // relatório completo, em texto (o que vai por e-mail, no arquivo ou na área de transferência)
  function build(kind, desc) {
    const I = info(), L = [];
    L.push(`Voidfall · relatório de bug · ${new Date().toISOString()}`);
    L.push(`Tipo: ${KINDS[kind] || kind}`, '', 'O que aconteceu:', String(desc || '(sem descrição)').slice(0, 2000), '');
    L.push(`Versão: v${I.versao}`, `Navegador: ${I.navegador}`);
    if (I.jogador) L.push(`Jogador: ${I.jogador}`, `Dificuldade: ${I.dificuldade}`, `Onda: ${I.onda}`, `Cidade: ${I.cidade}`);
    if (I.registro && I.registro.length) L.push('', 'Registro:', ...I.registro.map(r => '  ' + r));
    if (I.erros) L.push('', 'Erros:', ...I.erros.map(r => '  ' + r));
    if (inGame()) L.push('', 'Save (para abrir: Importar e Ctrl+V com este código copiado, ou salve num arquivo .voidfall):', exportCode());
    return L.join('\n');
  }

  // envio pelo Web3Forms: o relatório chega como e-mail
  async function send(kind, desc) {
    const key = typeof BUG_REPORT !== 'undefined' && BUG_REPORT.web3formsKey;
    if (!key) throw new Error('sem chave');
    const I = info();
    const r = await fetch('https://api.web3forms.com/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ access_key: key, subject: `🐞 Voidfall v${I.versao}: ${KINDS[kind] || kind}`, from_name: I.jogador || 'Jogador do Voidfall', message: build(kind, desc) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) throw new Error(j.message || `HTTP ${r.status}`);
  }

  function open(kind0) {
    const I = info(), code = inGame() ? exportCode() : '';
    const kb = Math.max(1, Math.round(code.length / 1024));
    const row = (k, v) => `<dt>${k}</dt><dd>${escHtml(v)}</dd>`;
    const hasKey = typeof BUG_REPORT !== 'undefined' && !!BUG_REPORT.web3formsKey;
    const repo = typeof REPO_URL !== 'undefined' ? REPO_URL : '';
    const field = () => ({ kind: ($('bug-kind') || {}).value || 'outro', desc: ($('bug-desc') || {}).value || '' });
    const msg = t => { const m = $('bug-msg'); if (m) m.innerHTML = t; };
    let sending = false, sent = false;
    openDialog({
      title: '🐞 Reportar bug',
      staticBody: true, plain: true,
      body: `<div class="bug-form">
        <p class="hint">Conte o que aconteceu. Os dados abaixo vão junto sozinhos para ajudar a reproduzir o problema.</p>
        <label>Tipo <select id="bug-kind">${Object.entries(KINDS).map(([k, n]) => `<option value="${k}"${k === kind0 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>O que aconteceu?
          <textarea id="bug-desc" class="bug-desc" maxlength="2000" placeholder="Ex.: depois de evacuar, a caixa de herói sumiu do cenário. Eu estava na onda 12..."></textarea></label>
        <b>📎 Anexado automaticamente</b>
        <dl class="bug-info">
          ${row('Versão', 'v' + I.versao)}
          ${I.jogador ? row('Jogador', I.jogador) + row('Dificuldade', I.dificuldade) + row('Onda', I.onda) + row('Cidade', I.cidade) : row('Jogo', 'nenhum save aberto')}
          ${row('Navegador', I.navegador)}
          ${I.registro && I.registro.length ? `<dt>Registro</dt><dd>${I.registro.map(escHtml).join('<br>')}</dd>` : ''}
          ${I.erros ? `<dt>Erros</dt><dd>${I.erros.map(e => escHtml(e.split(' · ')[0])).join('<br>')}</dd>` : ''}
        </dl>
        ${code ? `<details><summary>💾 Snapshot do save (${kb} KB)</summary>
          <textarea class="save-code" readonly spellcheck="false">${code}</textarea></details>` : ''}
        ${hasKey ? '' : `<p class="hint">Para enviar: <b>baixe o relatório</b> e anexe o arquivo numa issue do GitHub (precisa de uma conta), ou copie e mande para quem cuida do jogo.</p>`}
        <p class="hint" id="bug-msg"></p>
        <span id="save-msg" hidden></span><textarea id="save-code" hidden></textarea>
      </div>`,
      onMount: () => { const t = $('bug-desc'); if (t) t.focus(); },
      buttons: hasKey ? [
        { label: () => (sent ? '✔ Enviado' : sending ? 'Enviando...' : '📨 Enviar'), cls: 'primary', keep: true, disabled: () => sending || sent, onClick: d => {
          const f = field();
          if (f.desc.trim().length < 5) { msg('✏️ Conte em poucas palavras o que aconteceu antes de enviar.'); return; }
          sending = true; msg('Enviando...');
          send(f.kind, f.desc).then(() => { sent = true; msg('✔ Relatório enviado. Obrigado por ajudar!'); },
            () => msg('⚠️ Não deu para enviar agora (sem internet?). Baixe o relatório e mande depois.'))
            .finally(() => { sending = false; if (d.open) d.refresh(false); });
        } },
        { label: '⬇️ Baixar relatório', keep: true, onClick: () => { const f = field(); downloadCode(build(f.kind, f.desc)); msg('✔ Arquivo baixado.'); } },
      ] : [
        { label: '⬇️ Baixar relatório', cls: 'primary', keep: true, onClick: () => { const f = field(); downloadCode(build(f.kind, f.desc)); msg('✔ Arquivo baixado. Agora é só anexar na issue.'); } },
        { label: '📋 Copiar', keep: true, onClick: () => {
          const f = field(), txt = build(f.kind, f.desc);
          const ok = () => msg('✔ Relatório copiado.');
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, () => msg('Não deu para copiar: use Baixar relatório.'));
          else msg('Não deu para copiar: use Baixar relatório.');
        } },
        ...(repo ? [{ label: '🐙 Abrir issue no GitHub', keep: true, onClick: () => {
          const f = field(), title = `🐞 ${KINDS[f.kind] || f.kind}: ${f.desc.trim().slice(0, 60) || 'bug'}`;
          const body = `${f.desc.trim() || '(descreva o problema)'}\n\nVersão v${I.versao} · ${I.navegador}${I.dificuldade ? ` · ${I.dificuldade} · onda ${I.onda}` : ''}\n\n📎 Arraste aqui o arquivo do relatório (botão Baixar relatório).`;
          window.open(`${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
        } }] : []),
      ],
      cancel: 'Fechar',
    });
  }

  return { open, build, send, caught, errors, KINDS };
})();
