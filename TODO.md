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
- [x] **Modo de teste com boneco (debug):** opção no menu de debug que desliga as ondas e coloca um boneco de treino que não morre na frente do muro, para testar dano, habilidades, supremas e animações dos heróis (e das armas) sem esperar hordas. Mostrar o dano de cada golpe e o dano por segundo.
- [ ] **Mais destaque para as habilidades:** hoje a ativa (A) e a suprema (S) ficam escondidas numa linha do painel de defesa. Pensar num HUD no próprio cenário (ícones grandes com recarga circular e brilho quando a suprema estiver pronta), aviso visual quando a ativa voltar e um lembrete quando houver pontos de habilidade para gastar.
- [x] **Abrir a caixa clicando:** hoje a animação de estrelas roda sozinha. A ideia é o jogador clicar para abrir: cada clique é uma tentativa de subir. Começa em ★; o 1º clique pode subir para ★★ ou continuar em ★; o 2º clique pode subir para ★★★ (se já estiver em ★★), subir de ★ para ★★ ou continuar onde está. Depois das tentativas, a caixa abre e solta os prêmios.
- [x] **Animação e sons das caixas:** mais efeitos a cada estrela (brilho, partículas, raios de luz, tremor da tela, cor diferente por estrela, explosão de confete no ★★★) e **sons**: um a cada clique (a caixa sendo sacudida), um de subida de estrela (crescente, mais forte a cada nível), um de "não subiu" e uma fanfarra ao abrir, maior no ★★★.
- [x] **Árvore de habilidades de verdade:** reformular a árvore dos heróis de campo para parecer uma árvore (nós ligados por linhas, passivas na base, ativa no meio e a suprema no topo, travas visíveis por nível e por pontos), mais bonita que a lista atual. Pode abrir numa janela própria (modal) com o retrato do herói, o nível, a barra de XP e os pontos livres.
- [x] **Prévia dos heróis de campo:** retrato e pequenos vídeos mostrando cada habilidade (ataque básico, ativa e suprema) ao passar o mouse, no mesmo estilo das prévias das armas (cenas desenhadas ao vivo com os bonecos do jogo, em js/demos.js). Mostrar também nos heróis ainda bloqueados, para dar vontade de liberá-los.
- [x] **Aba Exército:** a aba Heróis virou **🪖 Exército**, com as sub-abas ⭐ De campo, 🦸 De apoio e 🗡️ Arsenal.
- [x] **Caixa pulsante no cenário:** ao cair, a caixa aparece pulsando no cenário (perto do telhado, sem atrapalhar a mira), com o número acumulado (📦×3), e espera o clique para abrir. Durante a horda ela só pulsa (não abre nem pausa o jogo); a caixa misteriosa da onda 10 continua abrindo sozinha no fim da onda.
- [ ] **Caixas à prova de exploração:** (1) **fixar a recompensa na hora em que a caixa cai** (hoje a sucata e a munição crescem com a onda em que ela é aberta: guardar caixas da onda 10 para abrir na 40 rende 4x); (2) **sortear o conteúdo ao cair** e guardar na caixa, para que exportar/importar o save não permita tentar de novo até sair ★★★ (a animação e os cliques só revelam); (3) se um dia as caixas forem vendidas, limitar o acúmulo (ex.: 20) e converter o excesso em 🏷️ Tampinhas.
- [ ] **Caixas de heróis na loja:** vender caixas por cash (hoje só caem de chefes). Pensar preços, se vale vender só caixas de conteúdo garantido (se um dia o cash for vendido por dinheiro real, caixas com sorte têm regras legais em vários países) e como isso afeta o ritmo de liberar heróis.
- [ ] **Loja de skins:** usar a nova moeda (dos fragmentos repetidos) para skins de heróis, armas, sobreviventes e do líder. A sub-aba 🏷️ Skins da Loja já existe (saldo e categorias "em breve"); falta criar as skins e a compra.

## Desenvolvimento
- [x] **Menu de debug mais claro:** hoje é uma lista longa de botões em seções. Reorganizar em abas (Cenários, Horda, Pessoas, Recursos, Armas, Heróis, Equilíbrio), com busca, descrição curta do que cada botão faz, interruptores visíveis (ligado/desligado) agrupados no topo e o estado atual sempre à vista. Junto com o modo de teste com boneco (veja Heróis de campo).

## Balanceamento
- [x] **Jogador automatizado:** `tools/bot.js` joga sozinho ao vivo por uma hora em cada dificuldade (veja o README).
- [ ] **Bot mais completo:** expedições, pesquisa, evacuação, armas do líder e prestígio, para ajustar os desafios de prestígio, os dilemas, o comerciante, os talentos e a velocidade 2x.