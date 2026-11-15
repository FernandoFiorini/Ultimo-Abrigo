# TODO

Ideias aprovadas para versões futuras, ainda não implementadas.

## Plataforma
- [ ] **Versão mobile:** layout pensado para celular (abas na parte de baixo, botões maiores, cenário em tela cheia na horizontal), e não só a versão de desktop adaptada.
- [ ] **PWA:** `manifest.json` e service worker para instalar o jogo no celular e jogar sem internet.
- [ ] **Notificações do navegador:** avisar quando a horda chega com a aba em segundo plano (com permissão do jogador).

## Conteúdo e interface
- [ ] **Painel de estatísticas:** gráfico em Canvas de recursos, sobreviventes e ondas ao longo do tempo.
- [ ] **Versão em inglês:** separar todos os textos em um arquivo por idioma e adicionar o seletor de idioma nas Configurações.

## Heróis de campo
- [ ] **Animações dos heróis de campo:** refinar o visual do ataque básico, da ativa e da suprema de cada herói (hoje são efeitos simples: raios em zigue-zague, laser, feixe do disco, notas musicais, banners e flashes) e dar animações próprias a eles no telhado (cast, comemoração ao subir de nível).
- [ ] **Sons dos heróis de campo:** sons especiais para cada herói (ataque básico, ativa e suprema). Hoje usam o som de tiro comum.
- [ ] **Limite de caixas guardadas:** (o nível e o sorteio fixo já foram feitos na 1.07.000) se um dia as caixas forem vendidas, limitar o acúmulo (ex.: 20) e converter o excesso em 🏷️ Tampinhas.
- [ ] **Caixas de heróis na loja:** vender caixas por cash (hoje só caem de chefes). Pensar preços, se vale vender só caixas de conteúdo garantido (se um dia o cash for vendido por dinheiro real, caixas com sorte têm regras legais em vários países) e como isso afeta o ritmo de liberar heróis.

## Desenvolvimento
- [ ] **Envio do reportar bug:** a janela já existe (js/bugreport.js, `BugReport.build` monta o relatório com o snapshot do save); falta decidir para onde vai o relatório (copiar para a área de transferência, baixar um arquivo ou enviar para um formulário/e-mail) e em não incluir dados pessoais além do nome do jogador.

## Balanceamento
- [ ] **Bot mais completo:** expedições, pesquisa, evacuação, armas do líder e prestígio, para ajustar os desafios de prestígio, os dilemas, o comerciante, os talentos e a velocidade 2x.