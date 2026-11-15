'use strict';

// Reportar bug: janela para o jogador descrever o problema, com um snapshot do save (o mesmo código do Exportar),
// a versão, a dificuldade, a onda, o navegador e as últimas linhas do registro anexados sozinhos.
// O envio ainda não existe: o botão Enviar só avisa que vem em breve.
// Dados pessoais: só o nome do jogador (o que já está no save); nada de e-mail, IP ou identificador do aparelho.
const BugReport = (() => {
  const KINDS = { erro: '💥 Erro ou travamento', visual: '🎨 Problema visual', equilibrio: '⚖️ Muito fácil ou muito difícil', texto: '✏️ Texto errado', outro: '❔ Outro' };
  const inGame = () => typeof S !== 'undefined' && S && S.meta && Slots.ready;

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

  function open() {
    const I = info(), code = inGame() ? exportCode() : '';
    const kb = Math.max(1, Math.round(code.length / 1024));
    const row = (k, v) => `<dt>${k}</dt><dd>${escHtml(v)}</dd>`;
    openDialog({
      title: '🐞 Reportar bug',
      staticBody: true, plain: true,
      body: `<div class="bug-form">
        <p class="hint">Conte o que aconteceu. Os dados abaixo vão junto sozinhos para ajudar a reproduzir o problema.</p>
        <label>Tipo <select id="bug-kind">${Object.entries(KINDS).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <label>O que aconteceu?
          <textarea id="bug-desc" class="bug-desc" maxlength="2000" placeholder="Ex.: depois de evacuar, a caixa de herói sumiu do cenário. Eu estava na onda 12..."></textarea></label>
        <b>📎 Anexado automaticamente</b>
        <dl class="bug-info">
          ${row('Versão', 'v' + I.versao)}
          ${I.jogador ? row('Jogador', I.jogador) + row('Dificuldade', I.dificuldade) + row('Onda', I.onda) + row('Cidade', I.cidade) : row('Jogo', 'nenhum save aberto')}
          ${row('Navegador', I.navegador)}
          ${I.registro && I.registro.length ? `<dt>Registro</dt><dd>${I.registro.map(escHtml).join('<br>')}</dd>` : ''}
        </dl>
        ${code ? `<details><summary>💾 Snapshot do save (${kb} KB)</summary>
          <textarea class="save-code" readonly spellcheck="false">${code}</textarea></details>` : ''}
        <p class="hint" id="bug-msg"></p>
      </div>`,
      onMount: () => { const t = $('bug-desc'); if (t) t.focus(); },
      buttons: [
        // ainda não envia: o relatório fica montado aqui (BugReport.build) para quando o envio existir
        { label: '📨 Enviar', cls: 'primary', keep: true, onClick: () => {
          $('bug-msg').textContent = '🚧 O envio de relatórios chega numa próxima versão. Obrigado por ajudar!';
        } },
      ],
      cancel: 'Fechar',
    });
  }

  // relatório completo (para o envio, quando existir)
  const build = (kind, desc) => ({ tipo: kind, descricao: String(desc || '').slice(0, 2000), ...info(), save: inGame() ? exportCode() : null, data: new Date().toISOString() });

  return { open, build, KINDS };
})();
