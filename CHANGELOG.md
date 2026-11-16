# Changelog

As versões seguem o formato `MAIOR.MÉDIA.PEQUENA`:

- **Pequena** (`1.00.000` → `1.00.001`): correções e ajustes pontuais.
- **Média** (`1.00.000` → `1.01.000`): novos recursos ou mudanças grandes.
- **Maior** (`1.00.000` → `2.00.000`): as maiores atualizações, que mudam o jogo como um todo.

## 1.07.000

Apocalipse, saves e vitória.

- **O jogo agora se chama Voidfall** (antes: Último Abrigo). Os saves continuam valendo.

- **História e cutscenes:** o jogo ganhou uma história, a do **Projeto Aurora**: um laboratório que criou um vírus capaz de regenerar tecido morto, o surto, e a equipe da Dra. Helena Vasconcelos fugindo com partes da pesquisa para cidades diferentes. Ela é contada em cenas curtas de pixel art, com texto e som, que pausam o jogo:
  - **abertura** ao começar um jogo novo;
  - **primeira evacuação** (o rastro da equipe de cidade em cidade);
  - **cada etapa da Cura** tem a sua cena (o vírus isolado, as mutações e o Rei Uivador, o sangue de quem resiste à mordida, o teste no zumbi capturado e o amanhecer com a vacina).
  - Cada cena aparece uma vez por save. Clique ou Espaço/Enter avança, Esc pula. Dá para rever as já liberadas no **📖 Códice › 🎞️ Memórias** (atalho B).

- **Pets 🐾:** até 3 companheiros no abrigo, um de cada tipo. **Pets nunca morrem:** na horda, o cachorro e o gato se escondem no abrigo, e o pastor fica no pé do muro. Eles acompanham o grupo na evacuação e no Novo Mundo, andam pelo pátio, deitam perto da fogueira e aparecem na lista de sobreviventes (passe o mouse para ver o bônus).
  - 🐕 **Cachorro:** late **15s antes** das noites perigosas (o alerta vem mais cedo) e tem bom faro: **+15% no saque das expedições**. Chega pelo evento *Um cachorro no portão* (a partir da onda 3) ou, raramente, seguindo uma expedição.
  - 🐈 **Gato:** caça os ratos do depósito (**−8% no consumo de comida**) e faz companhia (**o luto passa 30% mais rápido**). Chega com as expedições (7% por expedição que volta).
  - 🐕‍🦺 **Pastor alemão:** cão de guarda. A cada 8s de horda, **avança no zumbi que está batendo no muro e o atordoa por 2,5s** (chefes não). Chega pelo evento *Um cão do exército* (melhor onda 10+) ou pela expedição à Base militar (6%).
  - **Cansaço:** cada pet dá **+8% de descanso** aos guardas. De dia, **clique num pet para fazer carinho**: o cansaço dos guardas cai 15% (uma vez por minuto por pet).
  - **Nome do pet:** clique no pet na lista de sobreviventes para mudar o nome (até 16 letras, com sugestões).

- **Vasculhar com fôlego:** o líder tem **5 cargas** e cada vasculhada gasta uma; **1 carga volta a cada 3s** (o relógio pausa com o jogo). Em troca, **cada vasculhada rende 50% a mais**. Dá para gastar tudo de uma vez quando falta sucata, mas clicar sem parar (ou usar autoclicker) não multiplica mais a produção. O botão mostra as cargas (●●●○○) e uma barra enchendo até a próxima.
  - **Muda com a dificuldade:** Fácil 6 cargas (1 a cada 2,5s) · Normal 5 (3s) · Difícil 4 (3,5s) · Pesadelo 4 (4s) · Apocalipse 3 (5s).

- **Apocalipse com começo brutal:** as primeiras noites ficaram muito mais duras e o peso vai diminuindo com o tempo, sem deixar de ser a dificuldade mais difícil.
  - A 1ª noite tem **+50% de zumbis e +30% de vida**, e o extra cai a cada noite (quase some depois da 10ª). Os zumbis também não começam mais fracos nas primeiras ondas como nas outras dificuldades.
  - Em troca, o crescimento por onda ficou menor: hordas +23,5%/onda (antes 25%) e vida +11,5%/onda (antes 13%). Comparado ao Pesadelo, o Apocalipse começa **~3× mais pesado** e se estabiliza em **~1,4×** (antes ele ia de 1,2× até mais de 2×).
  - **Primeiro dia de 120s** (em cada cidade) para planejar a defesa antes da primeira noite.
  - Os cartões de dificuldade mostram as cargas de vasculhar, o começo brutal e o primeiro dia longo.
- **Aviso antes do Apocalipse:** escolher o Apocalipse (novo jogo ou trocar de dificuldade) abre uma janela do próprio jogo avisando que **o save será excluído se você perder**, que ele não volta para uma dificuldade menor e que não pode ser exportado. Substituir e apagar saves no menu também usam essa janela (antes eram caixas do navegador).
- **Telas mais limpas:** os cartões de dificuldade mostram um dado por linha (o detalhe fica na dica do mouse); linhas de dados (armas, torres, expedições, loja, defesa) não quebram mais no meio de um valor; a partir da 5ª aba, as abas do painel mostram só ícone e contador numa linha (o nome aparece ao passar o mouse).
- **Menu:** mudar a aparência do personagem no Novo jogo não troca mais o cenário de fundo.

- **Nova dificuldade 🔥 Apocalipse**, acima do Pesadelo: hordas maiores e mais rápidas, zumbis bem mais fortes, especiais chegando 2 ondas antes, 60s entre hordas e produção −30%. Em troca: **Esperança ×4**, **Abominação vale 💵 20** e **saque das expedições ×1,5**.
- **Morte permanente no Apocalipse:** se o abrigo cair e todos morrerem, o save é **apagado**. Vale também para quedas durante o progresso offline. Saves do Apocalipse não podem ser exportados, e um código exportado antes da morte não pode ser importado de novo.
- **Dificuldade travada para cima:** cada save guarda a maior dificuldade em que já jogou e nunca pode voltar para uma menor (nem ao mudar a dificuldade, nem ao evacuar, nem num Novo Mundo). Assim não dá para juntar Esperança e cash numa dificuldade alta e voltar para uma fácil. Saves antigos ficam travados na dificuldade atual.
- **3 espaços de salvamento.** O save antigo vai para o espaço 1 automaticamente.
- **Menu principal** ao abrir o jogo: **Continuar** (último save), **Carregar** (lista dos espaços, com apagar), **Novo jogo** (espaço, nome do jogador e dificuldade), **Hall da Fama**, **Skins** e **Créditos**. No jogo, o botão **☰ Menu** (rodapé ou Configurações › Dados) salva e volta para ele. O antigo botão Reiniciar saiu: para recomeçar, apague o espaço no menu.
- **Vitória** (concluir a Cura), na primeira vez em cada dificuldade de um save:
  - 💵 cash extra (de 10 no Fácil a 150 no Apocalipse);
  - o **nome do jogador aparece num sobrevivente lendário** na frente do abrigo, com a roupa da dificuldade vencida, em todos os saves;
  - **skins do líder**: uma por dificuldade vencida (Escoteiro, Veterano, Caçador, Pesadelo e Lenda do Apocalipse, com coroa) e a **Personalizada**, com cores escolhidas pelo jogador. Troque em Configurações › Visual ou no menu;
  - **bandeira de troféu** no telhado, na cor da maior dificuldade vencida;
  - nome no **Hall da Fama** do menu e um **certificado de vitória** para enviar ao desenvolvedor e entrar no Hall da Fama do site (lista `HALL_OF_FAME` em `js/config.js`; confira com `Victory.verify('UAV1:...')` no console).
- **Heróis únicos:** os heróis agora são um elenco fixo de 12, cada um com **visual próprio** no cenário (capacete de obra, boina, moicano, tapa-olho, óculos, barba, mochila...) e uma **habilidade única** que vale enquanto ele estiver ativo, além do bônus da classe:
  - 🎯 Rafa (crítico +10%), Valéria (+50% de dano na Abominação), Dandara (+25% de dano das armas do líder);
  - 🔧 Tonhão (reparo do muro +60%), Dona Neide (construções −15%), Seu Batista (torres 20% mais rápidas);
  - ⚕️ Dona Cida (feridos se recuperam 50% mais rápido), Lúcia (+1 remédio por horda vencida);
  - 🧭 Bia (expedições e operações 20% mais rápidas), Caio (+15% de chance de achar sobreviventes);
  - 🎖️ Zeca (+2 vagas para sobreviventes), Marcão (−10% no consumo de comida).
- **Heróis bloqueados aparecem na aba Heróis**, com o visual, o bônus da classe, a habilidade e **onde conseguir** cada um: distritos, Abominação ou Base militar (cada origem traz heróis específicos; esgotada a origem, vem qualquer um que falta).
- Saves antigos: cada herói vira um do elenco (mesma classe, e o mesmo nome quando possível), mantendo nível, experiência e arma.
- **Munição especial, rara de propósito:** bazuca, lança-granadas e lança-chamas não usam a munição do abrigo. Ela não se perde ao evacuar, e a aba Armas mostra quanto você tem e onde conseguir.
  - 🚀 **Foguetes** (bazuca, 1 por tiro, máximo 3): 1 por Abominação derrotada e 5% na Base militar.
  - 💣 **Granadas** (lança-granadas, 1 por tiro, máximo 6): 2 por Abominação, 20% na Base militar, 8% na Delegacia e 10% ao abater um Policial blindado com as suas armas. O lança-granadas vem com 2 carregadas e 2 de reserva.
  - ⛽ **Tanques de combustível** (lança-chamas, cada tanque enche a arma, máximo 3): 1 por Abominação, 10% na Base militar, 10% no Ferro-velho e 5% ao abater um Inchado com as suas armas.
- **Bazuca, a arma do chefe:** 1 tiro por carga (mesmo com melhorias) e recarga de 8s.
- **Lança-granadas mais contido:** 2 granadas por carga, recarga de 4s (como a bazuca) e dano menor (de 14 para 10 no centro da explosão).
- **Corpos e sangue que se renovam:** o cenário começa limpo, sem manchas nem corpos antigos. Cada morte deixa corpo e sangue no chão, e durante a horda tudo fica onde caiu (até 40 corpos e 90 manchas; passando disso, os mais antigos desbotam). No fim de cada onda a maioria some em poucos segundos e só **4 ou 5 corpos e 5 a 8 manchas, sorteados**, ficam marcados no cenário. Eles continuam lá durante o dia e a noite seguinte e, no fim da próxima onda, dão lugar a outros sorteados dela, então o cenário muda a cada noite. Evacuar ou perder o abrigo limpa o chão.
- **Prévias animadas:** passe o mouse sobre uma arma (aba Armas), o Ataque aéreo, a Fúria ou o Reparo total (Loja) ou as pesquisas Perfuração, Ponta oca, Armadilhas e Cerca elétrica para ver um pequeno vídeo do que ela faz, num popup no estilo do jogo. As cenas são desenhadas ao vivo com os mesmos bonecos do jogo (sem arquivos de vídeo), mostram o dano de cada golpe e usam a skin do líder. Itens com prévia têm a etiqueta "▶ prévia".
- **Armas do líder rebalanceadas:**
  - **Menos dano:** a pistola tira 4 de vida de um zumbi comum que tem ~7 no começo do jogo e ~16 na onda 8. Ela não mata mais com um tiro; as melhorias, a pesquisa e os heróis é que fazem as armas crescerem. A melhoria permanente Mira do líder caiu de +40% para +20% de dano por nível.
  - **Pente e recarga:** cada arma tem pente (pistola 5, espingarda 2, rifle 5, submetralhadora 30, lança-granadas 2, lança-chamas 40, bazuca 1) e tempo de recarga. A recarga é automática com o pente vazio, ou com **(R)** durante a horda (de dia, R continua recrutando; G também recruta). Trocar de arma interrompe a recarga.
  - **Alcance:** cada arma alcança uma distância a partir do muro (espingarda e lança-chamas curto, pistola e submetralhadora médio, rifle longo). Uma linha tracejada no chão mostra o limite, e a mira fica vermelha com "fora de alcance". A espingarda perde força com a distância.
  - **Munição escassa:** a munição por noite acabou. Recarregar gasta a **🔫 munição do abrigo**, a mesma dos guardas (espingarda 2 por tiro, rifle 3, submetralhadora 0,5). Só a pistola é grátis; bazuca, lança-granadas e lança-chamas usam munição especial. Os zumbis que você abate às vezes deixam 1 a 3 de munição para o abrigo.
  - Na aba Armas, cada arma mostra dano, pente, recarga, alcance, custo por tiro e **quantos tiros derrubam um zumbi comum na onda atual**.
  - **Escala de vida e dano:** os números aparecem ×10 e inteiros (dano 4, vida 16). A barra da Abominação mostra a vida restante.
- **Guardas e torres** alcançam menos: atiram a partir de 160 px do muro em vez de 210 (antes pegavam zumbis quase na borda da tela).
- **Novo som do rifle de caça:** estampido pesado com estalo, soco grave, eco rolando pela cidade e o ferrolho sendo manejado. Novos sons de recarga.
- **Novos inimigos** (entram nas ondas aos poucos, a partir da onda 5; no Apocalipse, 2 ondas antes):
  - 🪨 **Arremessador:** para longe do muro e o acerta com pedras, de mais longe que o Cuspidor.
  - 😱 **Uivador:** ao morrer, solta um grito que deixa os zumbis em volta 30% mais rápidos (acumula até o dobro).
  - 🍄 **Hospedeiro:** ao morrer, espalha esporos que dão +30% de vida aos zumbis em volta (até 3 vezes). Os fortalecidos ganham um brilho roxo; os acelerados, um rastro vermelho.
  - 🪖 **Policial blindado:** tiros no corpo ricocheteiam. **Mire na cabeça** com as armas do líder; guardas e torres só acertam a cabeça de vez em quando (20% e 30%). Explosões ferem pela metade, e fogo, armadilhas e a bazuca funcionam normalmente.
- **Novas noites especiais:**
  - ⚠️ **Investida:** no meio da noite, depois de um alarme e contagem regressiva, pelo menos 20 zumbis chegam **todos de uma vez**. +50% de sucata.
  - 😡 **Horda Furiosa:** zumbis 40% mais resistentes e 30% mais rápidos, mas rendem o dobro de sucata, **comida a cada abate** e um prêmio de comida e munição no fim.
  - 🏴‍☠️ **Noite dos Saqueadores** (a partir da onda 6): **humanos** no lugar dos zumbis. Correm, golpeiam o muro duas vezes por segundo e os Incendiários jogam coquetéis molotov de longe. Deixam comida e munição, e quem eles alcançam dentro do abrigo pode se ferir, mas nunca é mordido.
- **Alarme de onda perigosa:** 10 segundos antes de uma noite perigosa (Investida, Horda Furiosa, Saqueadores ou Abominação), toca uma sirene, aparece um aviso piscando com a contagem no cenário e os últimos 5 segundos são marcados com bipes.
- Novas amostras: Arremessador (ácido), Uivador (gás), Hospedeiro e Policial blindado (tecido).
- Conquistas novas: Na cabeça (100 tiros na cabeça de blindados) e Daqui não passa (repelir 3 ataques de saqueadores).
- Conquistas novas: Fogo cruzado (onda 10 no Apocalipse), Inferno na Terra (onda 30) e Lenda do Apocalipse (vencer no Apocalipse).
- **11 novos chefes.** A Abominação agora é um entre vários: o chefe de cada onda múltipla de 10 é sorteado entre os já liberados, sem repetir o anterior (os que você nunca derrotou aparecem com mais frequência). Cada um tem visual, sons, ataque especial, aviso antes do ataque (um **!** piscando) e saque de munição especial próprios, e a barra de vida mostra o estado dele (tonto, blindado, subterrâneo...). Até 3 barras aparecem quando vem mais de um chefe.
  - Desde a onda 10: 🦘 **Saltador**, que para longe do muro, se agacha e **pula em cima dele** (dano alto e empurra a horda para trás; tiros enquanto ele se agacha **interrompem o salto**); 🌀 **Rolador**, que vira uma bola **blindada**, rola até o muro, bate e quica de volta, e fica **tonto** (dano ×1,5).
  - Desde a onda 20: 🕷️ **Matriarca**, que pare crias sem parar; 🗿 **Colosso**, que perde a casca com 50% de vida (fica menor e bem mais rápido) e **rasteja** com 20%; ⛏️ **Escavador**, que cava longe do muro, passa por baixo da terra sem poder ser atingido e **sai perto do muro** (nunca do outro lado). Com metade da vida, ele foge cavando de novo.
  - Desde a onda 30: 🎈 **Inchado Colossal**, que explode ao morrer (**longe do muro**, a explosão fere a própria horda; perto, o muro também sofre) e, se chegar ao muro, acende o pavio e explode com tudo; 🦴 **Carcaça**, que tem casca de osso e só toma dano quando o **tumor** abre (dano ×1,6); 🤮 **Mãe-Cuspideira**, que fica longe e cospe ácido, deixando **poças que corroem o muro** por alguns segundos.
  - Desde a onda 40: 👑 **Rei Uivador**, que fica atrás da horda e **grita, curando e acelerando** todos (ao morrer, **atordoa a horda inteira**); 🍄 **Hospedeiro Gigante**, que ao morrer **se divide em 2 brotos**, e cada broto em 3 zumbis.
  - 🏴‍☠️ **Chefe Saqueador:** nas ondas de chefe a partir da 20, às vezes vêm os saqueadores, liderados por ele. Tem escudo (mire na cabeça ou use explosivos) e alterna molotovs e granadas.
- Os chefes também valem no progresso offline (os blindados e os de fases custam mais tiros, e a Matriarca traz crias).
- **Conquistas de chefes:** uma para cada chefe novo, Pouso cancelado (interromper 3 saltos), Fogos de artifício (explodir o Inchado Colossal longe do muro) e **Bestiário completo** (derrotar os 12 tipos).
- Textos atualizados para "chefe" no lugar de "Abominação" onde valem para todos (conquistas, desafio semanal, heroína Valéria, bazuca, munição especial).
- Correção: nas noites especiais com menos zumbis (Corredores, Saqueadores), o chefe não some mais da fila.
- **Números grandes abreviados** nos botões de recrutar e reparar, no muro, nos custos e no Vasculhar, como nos recursos (17,2M em vez de 17234512). Passe o mouse para ver o valor exato.
- **Torres reformuladas: três torres com papéis diferentes**, cada uma com nível próprio, no lugar da torre única (a torre antiga vira a **Torre média**, com o mesmo nível):
  - 💥 **Torre curta** (a partir da onda 5): metralhadora colada ao muro, muitos tiros fracos, só atira em quem já chegou perto. Não perde tempo com blindados.
  - 🗼 **Torre média**: fuzil de uso geral, atira no zumbi mais próximo do muro.
  - 🎯 **Torre longa** (a partir da onda 10): atirador de elite, tiro lento e devastador no zumbi **mais resistente** (brutamontes e chefes). Sempre acerta a cabeça do blindado.
  - Cada nível dá +10% de dano e tiros 4% mais rápidos. **A cada 5 níveis, +1 atirador** na torre (não ocupa sobrevivente) e **a cada 10, arma nova** (+25% de dano): da Submetralhadora à Minigun, da Carabina ao Fuzil automático, do Rifle de caça ao Rifle antimaterial. A cena mostra uma torre por tipo, com "x2", "x3" quando há mais atiradores.
- **Manutenção das torres:** no começo de cada horda, cada torre cobra 2% do custo do próximo nível em sucata (a curta também pede 5% em munição). Sem recurso, ela atira na metade da velocidade naquela horda. O painel de defesa mostra o custo.
- **Cansaço dos guardas:** cada tiro cansa; entre as hordas eles descansam. Cansados, atiram até 50% mais devagar e acertam até 15 pontos a menos. Mais guardas dividem o cansaço. O painel de defesa mostra o cansaço e a cadência atual.
  - 🛏️ **Alojamento** (nova construção): +30% de recuperação do cansaço por nível.
  - 🔄 **Turnos de vigia** (nova pesquisa, Defesa): cada tiro cansa 15% menos por nível (até 4).
- **Guardas podem se ferir no muro:** o ácido do Cuspidor e as pancadas dos zumbis no muro às vezes ferem um guarda (só com 2 guardas ou mais, e no máximo 1 + onda÷10 por horda). Ele sai da função e vai para os médicos.
- **Cidades mais perigosas:** a cada evacuação, os zumbis da nova cidade têm +12% de vida e são 5% mais numerosos (somando; um Novo Mundo conta como 5 cidades, até o limite de 40).
- **Esperança rebalanceada:** continua dando +3% de produção por ponto até 30 pontos; depois disso o ganho por ponto vai diminuindo (cresce pela raiz). Ex.: 100 pontos dão +239% (antes +300%), 192 dão +365% (antes +576%). Assim as construções não viram troco nas cidades avançadas.
- Debug (F9): nova seção **📊 Equilíbrio**, com a razão **defesa ÷ ameaça** de cada onda (dano esperado de guardas e torres sobre a vida total da horda), uma tabela das ondas 1 a 60 e atalhos para cansaço e cidade.
- **Menu de debug reorganizado:** abas (🎬 Cenários, 🧱 Horda, 🧍 Pessoas, 📦 Recursos, 🔫 Armas, ⭐ Heróis, 📊 Equilíbrio), **busca** que procura em todas as abas (sem diferenciar acentos), **descrição curta** em cada botão, **interruptores** (dano máximo, munição infinita) no topo com chave de ligado/desligado, e o **estado atual** sempre no alto, em duas colunas. A busca e as abas ficam presas no topo ao rolar. A tabela de equilíbrio aparece direto na aba Equilíbrio.
- **Debug: 🎯 Campo de treino** (interruptor no topo do menu): pausa as ondas e coloca um **boneco que não morre** na frente do muro (Zumbi, Brutamontes, Policial blindado ou Abominação; perto do muro ou mais longe). Líder, guardas, torres, armadilhas e o herói de campo atacam o boneco como numa horda de verdade. Cada golpe mostra o **dano na tela** (crítico, tiro na cabeça, abate direto), e um painel em cima do cenário mostra **DPS dos últimos 5s**, DPS médio, dano total, maior golpe, em quanto tempo o alvo cairia e uma **tabela por fonte**: cada arma do líder, guardas, torres e cada habilidade do herói (ataque básico, ativa, suprema, passivas), com tiros barrados pela armadura. Botões para zerar, deixar a suprema pronta e tirar a recarga das habilidades. O campo de treino não entra no save.
- **Progresso offline reformulado: só produção, por até 8 horas.** Com o jogo fechado (ou a aba congelada, ou o computador dormindo), o abrigo fica parado: **sem hordas, sem consumo de comida, sem mortes**, e as expedições, os feridos e os boosts esperam a sua volta. Ao voltar, você recebe **50% do que suas funções produziriam** em até 8h (comida, sucata, munição, remédios e pesquisa), sem gastar nada (os armeiros não consomem sucata) e sem o boost de Produção 2x. O tempo fora além de 8h se perde: volte para não desperdiçar.
- **Aviso de retorno:** ao voltar depois de 5 minutos ou mais, uma janela mostra quanto tempo você ficou fora, quanto foi registrado, quanto foi perdido e o que o abrigo produziu.
- **Ondas resolvidas de uma vez** (com a aba em segundo plano) vêm só com a horda comum, sem o chefe (os especiais continuam): **saque de chefes** (munição especial, cash, heróis e conquistas de chefe) **só sai jogando**. Essas ondas agora são calculadas por tipo de zumbi em vez de zumbi por zumbi; antes, ondas acima da 50 podiam travar o jogo por segundos ou minutos.
- Correção: se o abrigo caísse numa onda resolvida de uma vez, o novo grupo continuava jogando sozinho o resto do tempo e o resumo comparava os recursos do abrigo antigo com os do novo (ex.: "Sobreviventes: 75 → 11, −5,7M comida, 0 ondas"). Agora a simulação para na queda.
- Correção: no Fácil, a onda 10 travava o jogo (o chefe da onda saía vazio, porque nenhum chefe estava liberado ainda).
- Desenvolvimento: **jogador automatizado** (`node tools/bot.js`), que joga sozinho ao vivo em cada dificuldade e mostra onde o abrigo cai. Só roda quando chamado; não faz parte do jogo.
- **Heróis de campo:** um herói por vez luta **no telhado, ao lado do líder**, com ataque próprio. Ele ganha experiência com abates, ondas e chefes (não offline) e sobe até o nível 20; cada nível dá 1 ponto para a **árvore de 4 habilidades**: 2 passivas, 1 **ativa (A)**, com recarga, e a **suprema (S)**, liberada no nível 10, que enche com os abates do abrigo (~1 uso a cada 7 ondas). Cada grau custa 1, 2 e 3 pontos, então não dá para ter tudo: é preciso escolher. Os pontos podem ser redistribuídos de dia. O herói fica ao evacuar e no Novo Mundo.
  - ⚡ **Profeta da Tempestade:** raios em cadeia; suprema **Fúria dos Céus** (raios matam todos os zumbis comuns da tela; chefes perdem até 25% da vida).
  - 🤖 **Protótipo X-9:** lasers e muro reforçado; suprema **Bombardeio orbital** (até 9 explosões varrendo o campo).
  - 🎪 **Seu Bilú, o domador:** atordoa e segura a horda, com um urso na frente do muro; suprema **Grande espetáculo** (a horda inteira fica hipnotizada).
  - 🧬 **A Imune:** zumbis comuns se atacam; ajuda mordidos e feridos; suprema **Chamado da colmeia** (todos os zumbis comuns lutam entre si).
  - 🛸 **Seu Waldir, o abduzido:** raio trator, mais munição e tiros na cabeça dos blindados; suprema **Eles voltaram** (o disco voador abduz até 40 zumbis comuns).
  - 🎸 **Zé Distorção:** guardas mais rápidos e menos cansados; suprema **Solo final** (mata os zumbis comuns perto do muro e todos atiram 2x mais rápido).
  - **O primeiro herói de campo chega depois da onda 10**, uma única vez por save, numa **caixa misteriosa** que sempre dá um herói completo, sorteado entre os 6.
- **Mais chefes nas dificuldades altas**, numa tabela por dificuldade. Ondas 10, 20, 30...: onda/10 × multiplicador (Fácil ×0,5, Normal ×1, Difícil ×1,25, Pesadelo ×1,5, Apocalipse ×2), com no máximo 8 por onda. No Difícil (a partir da onda 25) e no Pesadelo e Apocalipse (a partir da 15), as ondas 15, 25, 35... também trazem chefes. O alarme de onda perigosa e o painel da próxima horda mostram quantos chefes vêm.

  | Onda | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 |
  |---|---|---|---|---|---|---|---|---|---|
  | 🌱 Fácil | 1 | - | 1 | - | 2 | - | 2 | - | 3 |
  | Normal | 1 | - | 2 | - | 3 | - | 4 | - | 5 |
  | Difícil | 1 | - | 3 | 1 | 4 | 1 | 5 | 2 | 6 |
  | ☣️ Pesadelo | 2 | 1 | 3 | 1 | 5 | 2 | 6 | 2 | 8 |
  | 🔥 Apocalipse | 2 | 1 | 4 | 2 | 6 | 2 | 8 | 3 | 8 |
- **Músicas para cada momento**, nos 3 estilos (com o timbre de cada um): além do dia e da horda, agora há um tema calmo no **menu principal**, uma trilha de **tensão** nos últimos 20 segundos antes da horda (relógio e coração que aceleram, drone subindo e um crescendo no fim) e uma trilha própria quando há **chefe na tela** (mais rápida e pesada, com power chords, coro e tambores).
- **Reparo do muro animado:** ao reparar, um trabalhador de avental aparece martelando ao pé do muro, as fileiras novas acendem de baixo para cima, voa serragem a cada martelada, a barra de vida enche com o trecho novo em destaque e sobe um "+N 🧱". Com som: marteladas na madeira, a tábua deslizando e encaixando e um acorde curto de pronto.
- **Ficha dos sobreviventes:** de dia, passar o mouse num boneco do cenário mostra quem ele é: nome, função, talento e uma história curta (o que fazia antes, onde morava, como chegou, uma mania e um sonho), sempre a mesma para a mesma pessoa no save. Os homenageados mostram também uma das frases deles.
- **Sobreviventes homenageados:** pessoas de verdade (lista `HONORED` em `js/config.js`) que entram no grupo como qualquer sobrevivente (30% de chance a cada pessoa nova, enquanto não estiverem no grupo) e são os únicos com frases próprias. De tempos em tempos um deles fala num balão em cima do boneco no cenário (e no registro); podem ter frases para quando a horda chega, últimas palavras que ficam no memorial e um visual próprio (cabelo, pele) para reconhecer no cenário. No grupo aparecem com 💬. Cada um pode ter uma **roupa fixa** (não troca nem com o uniforme do grupo) e uma **história fixa** na ficha. Os primeiros: **Valdecir**, policial antes do apocalipse ("Bandido bom é bandido morto."), sempre de farda; **Nardi**, bombeiro ("Só na loucura!"), sempre com a roupa de bombeiro; e **Fabiano**, viciado em jogo antes do apocalipse ("Até eu não conseguir o que eu quero, não vou parar. E tu me conhece, Valde." · "Jogo acima de tudo, farmar acima de todos.").
- **Barras de rolagem do jogo:** no lugar das do navegador, em todas as telas que rolam (painéis, janelas, menu, cards): trilho escuro e polegar verde-oliva quadrado, com relevo, como a pixel art; acende ao passar o mouse. No menu principal, no tom do rádio. No Firefox, só as cores.
- **Janela Visual (🎨) para trocar skins sem ir à loja:** botão 🎨 no topo, atalho **(K)**, botão **🎨 Skin** em cada arma da aba Armas (abre já na arma) e Configurações › Visual. Aba **🔫 Armas**: uma linha por arma com a padrão e todas as skins, em miniatura (e quantas são suas); um clique equipa. As que você ainda não comprou aparecem 🔒 bloqueadas, apagadas e com o preço; o clique leva direto à loja, na aba daquela arma, rolando até a skin e piscando nela. Aba **🧍 Personagem e roupa**: o editor do personagem e as roupas do líder, juntos. A loja fica só para comprar.
- **Mira com o braço:** durante a horda, o braço e a arma do líder giram em volta do ombro e acompanham o ponteiro (de um pouco para cima até bem para baixo, perto do muro), com movimento suave. O tiro, o clarão e os efeitos saem da boca do cano já girada. A pixel art continua nítida em qualquer ângulo.
- **Skins de armas do líder**, compradas com 🏷️ Tampinhas na **Loja › Skins** (Comum 30, Rara 60, Épica 100, Lendária 180) e equipadas uma por arma. Só visual: mudam as cores e os detalhes da arma (no telhado e na vitrine), o efeito do tiro e o som; dano, alcance e recarga não mudam. Na loja, cada uma tem uma vitrine animada e o botão **Testar**. As skins ficam no save, também no Novo Mundo. As 15 primeiras:
  - 🔫 Pistola: **Olho de Hórus** (lendária), **Estrela do Sertão** (rara), **Raio Retrô** (épica, dispara anéis de energia com som de pistola de raio), **Beijo do Vampiro** (épica, solta morcegos).
  - 💥 Espingarda: **Abóbora Maldita** (épica, chumbo de fogo roxo), **Sucata Punk** (comum, chuva de faíscas).
  - 🎯 Rifle de caça: **Fôlego do Dragão** (lendária, o tiro sai como fogo), **Runa de Gelo** (lendária, estilhaços de gelo), **Caçador Espectral** (épica, arma translúcida e almas no ar), **Sakura** (rara, pétalas de cerejeira).
  - 🔥 Submetralhadora: **Neon 2084** (épica, traçantes rosa e ciano), **Enxame** (rara, abelhas).
  - 💣 Lança-granadas: **Natal Explosivo** (rara, granada-presente e explosão de neve), **Martelo do Trovão** (épica, um raio cai na explosão).
  - 🌋 Lança-chamas: **Forja de Hefesto** (épica, metal derretido em gotas).
- **Mais 9 skins de arma** (24 no total):
  - 💥 Espingarda: **Tridente de Netuno** (lendária: bronze e verde-mar com as pontas do tridente; o chumbo vira jato de água, com um trovão rolando sobre o mar e chuva forte).
  - 🔥 Submetralhadora: **Fliperama 8-bit** (épica, tiros de videogame com som de chiptune), **Chicago 1929** (rara, pente de tambor e cápsulas douradas pulando).
  - 💣 Lança-granadas: **Caixa de Pandora** (lendária: o tambor vira o jarro de Pandora; a explosão solta os males e, por último, sobe a esperança, com tampa rangendo, correntes e sussurros).
  - 🌋 Lança-chamas: **Lixo Tóxico** (rara, fogo verde e contador Geiger), **Cérbero** (lendária, três cabeças, fogo do inferno e três rosnados), **Plasma Solar** (épica, feixe de plasma azul), **Churrasco do Abrigo** (comum, botijão P13, espetinhos e o chiado da brasa).
  - 🚀 Bazuca: **Dragão de Ano Novo** (lendária, rastro de rojão, explosão em fogos de artifício com assobio e estalos de estrelinha).
- **Mais 11 skins de arma** (35 no total):
  - 🔫 Pistola: **Pederneira do Corsário** (rara, fumaça de pólvora negra), **Água-Viva** (épica, translúcida, bolhas de luz), **Ametista** (lendária, estilhaços de cristal), **Mandacaru** (rara, espinhos e berimbau de boca).
  - 💥 Espingarda: **Berserker** (épica, machado viking e trompa de guerra), **Engrenagem a Vapor** (lendária, engrenagem girando e apito de caldeira), **Dia de los Muertos** (lendária, caveira de açúcar e pétalas).
  - 🚀 Bazuca, com sons em três tempos (disparo, voo e impacto na hora da explosão): **Vulcão** (lendária, erupção de lava), **Míssil Teleguiado** (épica, bipes de travar o alvo), **Disparador Alienígena** (lendária, plasma verde), **Avalanche** (épica, estilhaços de gelo).
- **Skins de personagem**, na Loja › Skins (categorias 🧍 Líder, 👥 Sobreviventes e ⭐ Heróis, mesmos preços por raridade) e equipadas na janela 🎨 Visual (abas Personagem e roupa, 👥 Grupo e ⭐ Heróis; as que você ainda não tem aparecem bloqueadas e levam à loja):
  - 🧍 **Roupas do líder** (por cima do seu personagem; algumas escondem o cabelo): Cangaceiro, Bombeiro, Astronauta, Samurai, Ninja, Médico da Peste, Cavaleiro, Escafandrista, Contenção Biológica e Policial.
  - 👥 **Uniformes do grupo** (valem para todos no cenário; cada função mantém um detalhe): Escoteiros, Canteiro de Obras, Festa Junina, Plantão, Pelotão, Seleção do Abrigo e Inverno.
  - ⭐ **Trajes dos heróis de campo** (mantêm rosto, cabelo e o detalhe de cada um): Profeta do Deserto, Protótipo Dourado, Gala do Circo, Jaleco da Pesquisa, Volta ao Espaço e Turnê de Metal. Valem no telhado e nos retratos.
  - As roupas de vitória (Escoteiro, Veterano...) continuam no perfil; uma roupa da loja vestida tem prioridade.
- **Loja de skins organizada:** navegação compacta que fica presa no topo ao rolar: categorias (🔫 Armas; 🧍 Líder e 👥 Sobreviventes "em breve"), uma fileira de ícones das armas (com quantas você tem e ✔ na que tem skin equipada) e, ao lado do nome da arma, o filtro por raridade (Lendárias, Épicas, Raras, Comuns), com as mais raras primeiro.
- **Menu principal novo:** o abrigo à noite, ao vivo, em pixel art (cidade com o horizonte vermelho, lua, farol varrendo o céu, fogueira, **o seu personagem no telhado** e zumbis de olhos vermelhos vindo até o muro, com cinzas caindo). O menu virou uma transmissão do **Rádio do Abrigo**: logo VOIDFALL em pixel art com tinta escorrendo, mensagens de rádio datilografadas e as opções em letras de máquina de escrever. A **música do menu** agora toca (antes o som só era ligado ao entrar no jogo). Os Créditos viraram **Sobre**, com um agradecimento especial a **Erik, Roney, Valde e Natalia**, que ajudaram a testar e a desenvolver as funcionalidades do jogo.
- **Crie o seu personagem** ao começar um jogo (tela Novo jogo, com prévia ao vivo): **sexo** (masculino ou feminino), **tom de pele** (7), **cabelo** (curto, comprido, coque, afro, moicano ou careca), **cor do cabelo** (11, inclusive azul, rosa e verde) e, no masculino, barba ou bigode. O personagem fica no save (também no Novo Mundo) e pode ser mudado depois em Configurações › Visual › Personagem e skin. As **skins agora trocam só a roupa** (camisa, calça, boné, capacete, capa, coroa); a ☣️ Pesadelo também tinge o cabelo de branco e a 🎨 Personalizada usa a cor de cabelo escolhida. Saves antigos começam com o personagem padrão.
- **Mulheres e homens no visual:** os sobreviventes no cenário seguem a proporção de mulheres do grupo (pelos nomes): elas aparecem com cabelo comprido ou coque e roupas de outras cores; eles com cabelo curto e, às vezes, barba, bigode ou careca.
- **Pausa revista:** pausado, não dá para mexer nos sobreviventes (funções, recrutar, expedições e ataques a distritos); o aviso de pausa treme e explica. No ☣️ Pesadelo e no 🔥 Apocalipse a pausa dura no máximo **30 segundos** (o jogo volta sozinho, com contagem no aviso) e só pode ser usada de novo **2 minutos** depois.
- **Bestiário e Visual com destaque no topo:** os dois saíram do meio dos ícones de som e configurações e viraram botões com nome e cor própria (📖 **Bestiário** dourado, 🎨 **Visual** roxo). Uma bolinha vermelha pulsa quando há novidade: ficha nova ou descoberta nova no glossário (que aparecem marcadas com **NOVO** na janela), ou skin comprada que você ainda não viu no Visual. O registro também avisa quando um inimigo entra no bestiário ou a ficha dele sobe de nível.
- **📖 Bestiário e Glossário** (botão **📖 Bestiário** no topo ou atalho **B**): o **Bestiário** tem a ficha de todos os inimigos do jogo (27), e cada um aparece como silhueta **???** até você abater o primeiro. Mais abates liberam mais da ficha: comuns com 1 (nome e desenho), 10 (descrição), 50 (vida, velocidade, dano e saque) e 100 (fraquezas, resistências e uma curiosidade); chefes, que aparecem bem menos, com 1, 3 e 10. O **Glossário** começa vazio: cada fraqueza ou truque entra nele na primeira vez que você o vê acontecer na horda, com o aviso "📖 Nova descoberta". Os abates por tipo passam a ser contados a partir desta versão (os de chefe aproveitam a contagem antiga).
- **O fogo agora importa:** 🍄 o **Hospedeiro** leva o dobro de dano com fogo e, se morrer queimando, não solta esporos; o **Broto** também (dobro) e o **Hospedeiro Gigante** leva +50%; **Gigante ou Broto morrendo queimados não se dividem**; 🕷️ as **Crias** da Matriarca levam o triplo; 🤮 o **Cuspidor** que morre queimando faz o ácido explodir e fere os zumbis em volta.
- **Novo zumbi: 🟢 Gosma** (a partir da onda 14): uma massa de gelatina verde. Balas e pedras fazem só 30% do dano; o fogo faz o triplo. Explosões funcionam normalmente.
- **Airdrop no meio da horda:** a partir da onda 3, em cerca de 1 a cada 5 hordas um avião solta uma caixa de paraquedas entre os zumbis. A cor da fumaça diz o que tem dentro: 🟢 **Suprimentos** (munição, sucata e remédios), 🔵 **Munição militar** (guardas atiram 50% mais rápido até o fim da horda, mais munição) ou 🟣 **Carga rara** (caixa de herói ★★ e 💵 2). Clique na caixa para mandar alguém buscar: vai um ocioso ou, sem ociosos, um guarda, que desce do muro. Os zumbis por perto largam o muro e vão atrás dele; atire neles para dar cobertura. Se o pegarem, ele morre, vai para o memorial e se levanta na hora como um zumbi com o nome dele, vindo para o muro (a caixa cai de volta no chão). Quanto mais longe a caixa cair, maior a recompensa. Caixa largada até o fim da horda se perde. Novas conquistas: 📦 **Entrega especial**, 🪂 **Logística de guerra** (10 airdrops), 🛡️ **Anjo da guarda** (abata 5 perseguidores numa mesma corrida) e uma **conquista secreta**.
- **Tutorial guiado nas duas primeiras ondas:** num jogo novo, o guia pausa o jogo, escurece a tela, destaca onde clicar e explica o fluxo num balão: recursos, Vasculhar, Recrutar, dar função a quem está ocioso e o cartão de defesa; na primeira horda, mirar e atirar, a barra de armas e os guardas; depois dela, reparar o muro e construir; na segunda horda, pausa; e depois, expedições, pesquisa e armas. Os passos de ação esperam você fazer a ação destacada (os atalhos também valem). Aparece só na primeira vez neste navegador; "Pular tutorial" desliga, e dá para desligar ou rever em Configurações › Jogo › **Tutorial guiado**. As dicas soltas que repetiam o mesmo assunto não aparecem mais por cima dele.
- **Aviso ao salvar:** clicar em **Salvar** mostra um toast confirmando que o jogo foi salvo (ou avisando se o navegador não deixou salvar).
- **Configurações no menu principal:** novo botão **Configurações** na tela inicial, para ajustar som, visual e tutorial antes de começar o jogo.
- **Opção para desligar as dicas:** Configurações › Jogo › **Mostrar dicas**. Vale para todos os saves deste navegador; "Rever dicas do tutorial" religa.
- **Dilemas com tempo:** cada dilema agora tem **20 segundos** para ser decidido (barra e contagem no topo, que ficam vermelhas nos últimos 5s). Se ninguém escolher (jogador ausente), **o grupo decide sozinho**, sorteando uma das opções possíveis, com as consequências dela. O resultado mostra o que foi decidido e fecha sozinho em 10s, para o jogo não ficar pausado esperando.
- **A tela principal não rola mais:** o cenário se ajusta ao espaço da janela (sem distorcer) e os cards de baixo (sobreviventes, próxima horda, registro) ocupam o resto. Se o conteúdo de um card passar do espaço, só ele rola por dentro. Os botões rápidos ficam numa linha só em telas menores.
- **Árvore de habilidades dos heróis de campo**, numa janela própria (botão 🌳 nos detalhes do herói, ou clique numa das habilidades): as passivas na base, a ativa no meio e a suprema no topo, ligadas por linhas que acendem conforme você aprende. Cada habilidade é um ladrilho com moldura e 3 marcadores de grau: verde pulsando quando dá para aprender (com o custo no canto), com 🔒 e o nível quando está travada por nível, e dourado quando completa. Ao lado, os 3 graus com o efeito, o custo e o nível exigido de cada um, e o botão Aprender. No topo, o retrato, o nível, a barra de XP e os pontos livres; embaixo, levar ao telhado e redistribuir. Heróis bloqueados também podem ser vistos. As regras não mudaram.
- **Loja com sub-abas:** 💵 **Cash** (a loja de sempre) e 🏷️ **Skins**, a futura loja das Tampinhas: mostra o saldo, como ganhar e as categorias que vão chegar (heróis de campo, armas do líder, sobreviventes e líder), por enquanto marcadas como "em breve".
- **Aba 🪖 Exército** (antes: Heróis), dividida em sub-abas, cada uma com um aviso quando há algo a fazer:
  - **⭐ Herói:** só o que é do herói de campo: a grade com os 6 heróis (nível, "+pontos" quando há pontos para gastar, fragmentos e quantos faltam, ⭐ em quem está no telhado) e, embaixo, os detalhes do escolhido (habilidades, prévias, levar ao telhado, invocar). As caixas abrem pela caixa em cima do abrigo, e as 🏷️ Tampinhas foram para a loja de skins.
  - **🦸 De apoio:** os 3 espaços de heróis ativos ficam no topo (com bônus e botão de desativar), e o elenco vem agrupado por classe (🎯 Atirador, 🔧 Engenheiro...), com quantos você tem de cada.
  - **🗡️ Arsenal:** as armas da equipe de apoio, numa sub-aba própria (aviso "!" quando há arma melhor para equipar).
- **Caixas de heróis:** cada chefe derrotado (jogando, não offline) deixa uma caixa.
  - **A caixa aparece no cenário:** ao cair, um clarão dourado com faíscas e o aviso "📦 CAIXA DE HERÓI!" saem de onde o chefe morreu, com um som próprio (baque no chão e um "plim"). A caixa fica **pulsando em cima do abrigo** com o número acumulado (📦×3) e abre com um clique, sem precisar ir à aba. Durante a horda ela só pulsa ("depois da horda"), para não atrapalhar a mira. No fim da horda, se houver caixas guardadas, ela cresce e mostra um balão chamando para abrir. Heróis com os fragmentos completos aparecem ali também, com um botão **✨ Invocar**.
  - **Abra clicando:** a caixa começa em ★ e você tem **2 cliques**; cada um sacode a caixa e é uma chance de subir uma estrela (o 1º pode levar a ★★, o 2º pode levar de ★★ a ★★★ ou de ★ a ★★). Depois das tentativas, ela abre e solta os prêmios. O link "abrir direto" pula tudo. As chances são as mesmas de antes (o conteúdo é sorteado ao abrir; os cliques só revelam).
  - **Efeitos:** cor própria por estrela (branco, azul, dourado), raios de luz girando atrás da caixa, clarão, partículas, tremor da janela (mais forte a cada estrela) e **chuva de confete no ★★★**.
  - **Prêmios em cartas:** ao abrir, a caixa encolhe e solta as cartas viradas, todas do mesmo tamanho, que giram uma a uma. Cada carta tem a cor da raridade (dourado: herói; roxo: fragmento de herói novo; laranja: repetido que virou 🏷️ Tampinhas; verde: amostra; cinza: recurso). O herói completo da ★★★ vem numa carta maior, em destaque, com uma faixa de brilho passando de tempos em tempos e o som característico dele. Cada carta virando tem um som, mais rico quanto mais rara.
  - **Fragmentos com cara de fragmento:** a carta mostra o retrato do herói num hexágono partido em 6 fatias, uma por fragmento. As que você já tem ficam acesas, as que faltam ficam escuras e as novas brilham ao encaixar. A carta também diz **quantos faltam** para liberar o herói ("4/6 · faltam 2"). A aba Heróis mostra o mesmo hexágono nos heróis bloqueados.
- **Começo de jogo reformulado: tudo vai liberando conforme a onda.** Antes, as 10 abas e todas as funções apareciam na onda 1, e o guarda inicial vencia as primeiras ondas sozinho.
  - **Ondas 1 e 2: a defesa é o líder.** O grupo começa sem guarda (2 forrageiros e 1 coletor). Enquanto não houver guardas, cada zumbi que chega ao muro bate 2 vezes a mais: quem atira quase não sente, quem não atira perde boa parte do muro.
  - **Funções:** 🛡️ guarda na onda 3 · ⚙️ armeiro e ⚕️ médico na 5 · 🔬 cientista na 7.
  - **Construções:** 🛏️ Alojamento e 🧪 Laboratório na onda 7 · 🗼 Torre média e 📻 Rádio na 10 · 💥 Torre curta na 12 · 🎯 Torre longa na 15.
  - **Expedições:** Supermercado e Ferro-velho na onda 4 · Delegacia e Hospital na 5 · Base militar na 10.
  - **Distritos** a partir da onda 10 (Centro comercial 10, Fazendas 11, Fábrica 12, Hospital central 14, Universidade 16, Base aérea 18).
  - **Abas:** Equipe e Construir desde o começo · Cidade e Armas na onda 4 · Pesquisa na 7 · Evacuar ao sobreviver à onda 10 · Exército quando aparece o primeiro herói, caixa ou fragmento. Aba nova brilha com "NOVO" até ser aberta, e o registro avisa o que liberou.
  - **Abas e funções ficam liberadas para sempre:** depois de evacuar, a nova cidade já começa com elas (e com um guarda). Construções, expedições e distritos continuam liberando por onda em cada cidade.
  - O que ainda não liberou não ocupa mais a lista: no fim de cada lista, uma linha resume o que vem ("🔒 Novas construções: 🛏️ 🧪 onda 7 · 🗼 📻 onda 10...").
  - **Tutorial refeito para o novo ritmo:** o guia das primeiras ondas ensina a defender sozinho, apresenta os guardas na onda 3 e as abas Cidade e Armas na 4. Cada função, aba ou construção nova tem uma dica própria.
- **A evacuação virou o caminho para zerar.** Antes dava para chegar à Cura sem nunca evacuar: a pesquisa não se perde quando o abrigo cai, e a cidade recomeçava do zero sem custo.
  - **Cada etapa da Cura exige uma cidade nova:** etapa 1 na cidade 1, etapa 2 na cidade 2, e assim até a etapa 5, na cidade 5 (do mundo atual). A aba Pesquisa mostra "🚁 Exige a cidade N (você está na M): evacue para continuar".
  - **Cidade sendo tomada:** depois da onda 10, cada onda na mesma cidade deixa os zumbis 4% mais resistentes (somando: onda 15 = +20%, onda 20 = +40%). O painel de defesa mostra o quanto, e o registro avisa a cada 3 ondas. Evacuar recomeça numa cidade nova.
  - **"🚁 O helicóptero chegou!"** No fim da onda 10, uma janela mostra a Esperança que você levaria, o bônus de produção antes e depois, a próxima etapa da Cura e o que fica e o que recomeça, com o botão **Evacuar agora** (ou "Ficar mais um pouco"). Aparece uma vez por cidade.
  - A aba **Evacuar** pulsa em dourado enquanto houver Esperança para levar.
  - Bot (`tools/bot.js --campanha N`): joga N cidades seguidas, evacua quando a defesa não segura a próxima onda (`--evacuar`, padrão 0,6) e gasta a Esperança nas melhorias.
- **Loja: itens de herói e skins por cash, sempre com conteúdo garantido (sem sorte):**
  - **🧩 Fragmento de herói (💵 10, 1 por dia, que volta a cada horda vencida):** você escolhe o herói de campo que ainda não tem e ganha 1 fragmento dele. Dá para comprar pela Loja (abre a escolha do herói) ou direto no herói bloqueado, na aba Exército. Um herói inteiro sai por 💵 60.
  - **🏷️ Pacote de Tampinhas (💵 5):** +15 Tampinhas, para as skins.
  - As caixas de herói continuam só como prêmio dos chefes (não são vendidas).
  - Bot: `--campanha N --gastar fragmento|tampinhas|nada` simula onde o cash é gasto.
- **Toda caixa de herói dá 🏷️ Tampinhas:** ★ dá 3, ★★ e ★★★ dão 10 (além do conteúdo de sempre). Os fragmentos repetidos continuam virando 5 cada.
  - **A ★★★ sempre libera um herói que você ainda não tem.** Com todos os heróis de campo liberados, ela sai mesmo assim (antes, a caixa nunca passava de ★★): o herói aparece na carta como "JÁ LIBERADO" e, logo em seguida, se desfaz em **30 🏷️** (o valor dos 6 fragmentos), com brilho e som de moedinhas, sem a chuva de confete.
  - Se a ★★★ libera um herói que já tinha fragmentos guardados, esses fragmentos viram Tampinhas.
- **Tela de Novo jogo sem rolagem:** os espaços de salvamento ficam numa lista, um abaixo do outro, com o nome logo embaixo; o personagem fica à direita; os cartões de dificuldade ficaram mais compactos.
- **Nome obrigatório no Novo jogo:** sem nome, o campo fica vermelho com o aviso "Digite um nome para começar" (antes, o jogo usava "Sobrevivente").
- **Interface mais enxuta:**
  - **Expedições e Mapa viraram uma aba só, 🗺️ Cidade**, com as sub-abas 🎒 Expedições e 🏴 Distritos (esta só a partir da onda 10).
  - **🏆 Conquistas e 🛒 Loja saíram das abas** e viraram botões no topo, ao lado do Bestiário e do Visual, com a mesma borda colorida (Bestiário em branco, Visual em roxo, Conquistas em dourado, Loja em verde) (atalhos 9 e 0; clicar de novo volta para a aba anterior). O selo da Loja mostra o seu 💵 cash, que saiu da barra de recursos.
  - Os atalhos 1, 2, 3... seguem as abas visíveis, na ordem.
  - Construções, pesquisas e melhorias de Esperança já compradas mostram só o efeito atual: a descrição fica ao passar o mouse no nome.
  - No painel de defesa, antes dos guardas aparece "Por enquanto, a defesa é você", no lugar de "0 guardas · 0 torres", e a precisão só aparece quando há guardas ou torres.
- **Recrutar e vasculhar só de dia, do Normal para cima,** com um **limite de recrutamentos por dia**: 4 no Normal, 3 no Difícil, 2 no Pesadelo e 1 no Apocalipse (volta a cada horda vencida). O botão mostra quantos restam ("4/4 hoje"). Quem chega pelo rádio, por eventos ou por expedições não conta. No Fácil, nada muda. Os cartões de dificuldade mostram a regra.
- **Bot de balanceamento** (`tools/bot.js`): o líder agora também atira (`--mirar`, chance de acerto de 0 a 1; padrão 0,6), e o relatório mostra o muro no fim das primeiras ondas.
- **HUD das habilidades no cenário:** a ativa (A) e a suprema (S) do herói de campo agora ficam em botões redondos no canto inferior esquerdo do cenário, e não só numa linha do painel de defesa. Cada botão tem um anel na cor do herói que enche com a recarga (com os segundos no meio) ou com a carga da suprema (em %). Clique ou use as teclas A e S.
  - **Ativa de volta:** o botão pula e acende, aparece "ATIVA PRONTA (A)" no telhado e toca um som curto.
  - **Suprema pronta:** o botão fica dourado e pulsando, com um som próprio.
  - Tentar usar fora de hora (em recarga ou de dia) faz o botão balançar.
  - Habilidades ainda não aprendidas aparecem com 🔒; clicar abre a árvore de habilidades.
  - **Lembrete de pontos:** quando o herói do telhado tem pontos de habilidade para gastar, um selo "⭐ +N pontos" aparece em cima do HUD e abre a árvore.
  - A antiga linha da ativa e da suprema saiu do painel de defesa.
- **Contagem da horda num lugar só:** saiu a faixa do canto superior esquerdo do cenário ("Próxima horda em..." / "ONDA N: X restantes"), que repetia o painel de defesa. No painel, a contagem ganhou destaque: número grande (segundos até a horda ou inimigos restantes), barra mais grossa e tudo em vermelho nos últimos 10s e durante o ataque. Os boosts ativos (2x, Fúria, luto, feridos) subiram para o lugar dela.
- **Correção:** a prévia das habilidades aparecia atrás da janela da árvore de habilidades.
- **Jingle de cada herói de campo** ao levá-lo ao telhado: hino de órgão com trovão do Profeta, bipes de chiptune do X-9, "oom-pah" de picadeiro do Seu Bilú, caixinha de música desafinada e coração d'A Imune, teremim deslizando do Seu Waldir e riff de power chords do Zé.
- **Retrato dos heróis de campo:** cada herói aparece com o próprio boneco (cabeça e tronco, desenhados com o visual do jogo) no lugar do ícone, nas cartas da caixa (fragmentos, repetidos e o herói completo da ★★★) e na aba Heróis, inclusive nos ainda bloqueados (em fragmentos).
- **Prévias das habilidades dos heróis**, no mesmo estilo das armas: passe o mouse no retrato, nos botões "▶ Prévias" ou nas habilidades ativa e suprema para ver uma cena curta em loop com o herói em ação: o **ataque básico**, a **ativa** e a **suprema** de cada um (raio em cadeia e tempestade do Profeta, laser, feixe e bombardeio orbital do X-9, facas, chicotada e hipnose do Seu Bilú, pedradas e confusão d'A Imune, raio trator e disco voador do Seu Waldir, palhetas, acorde e solo do Zé). Funciona também com heróis bloqueados, e o texto mostra o efeito no grau atual (ou no 1º, se ainda não aprendida).
  - **Sons:** a caixa chacoalhando a cada clique, um arpejo de subida (mais forte a cada estrela), um "uóó-uó" quando não sobe e uma fanfarra ao abrir, bem maior no ★★★.
  - ★ (quase sempre): **só recursos** (sucata e munição). Fragmentos de herói vêm apenas da ★★.
  - ★★ (20%): 3 ou 4 fragmentos, pelo menos um de herói que você ainda não tem, + mais recursos e amostras.
  - ★★★ (2%): um **herói completo** que você ainda não tem.
  - **6 fragmentos invocam um herói**, agora pelo botão **✨ Invocar**: ao completar os fragmentos, o herói fica pronto (aviso ✨ na aba Heróis e um botão de invocar na própria caixa). Na invocação, as 6 fatias do retrato voam, encaixam uma a uma, carregam e estouram num clarão revelando o herói, na cor dele, com o **som característico** de cada um: trovão do Profeta, robô ligando do X-9, "tcharã" de circo e o urso do Seu Bilú, coração e sussurros d'A Imune, teremim de disco voador do Seu Waldir e power chord do Zé. Fragmentos de um herói já pronto viram Tampinhas, e a ★★★ dá preferência a quem ainda precisa de fragmentos. Garantia: no máximo 10 caixas seguidas sem fragmento de herói novo (a 10ª sai ★★).
  - **🏷️ Tampinhas:** fragmentos de heróis que você já tem viram Tampinhas (5 cada), a nova moeda. Elas vão comprar skins de heróis, armas, sobreviventes e do líder (loja em breve).
  - Os 12 heróis antigos continuam como **equipe de apoio**, com os mesmos bônus.

- **Nova sobrevivente homenageada: Natalia**, enfermeira antes do apocalipse ("Né miguelzinho!" · "Vou jogar the sims agora."), sempre com **cabelo vermelho** comprido para reconhecer no cenário. Não quer mais lutar: na horda, manda os outros irem no lugar dela.
- **Novo sobrevivente homenageado: Bernardo**, trabalhador incansável antes do apocalipse (12h de trabalho para 12min de descanso) que passava o tempo livre preso no porão pela mulher ("Preso no porão, como sempre." · "Vou entrar pra jogar (on-line pela última vez 200 dias atrás)."). Tem pele preta para reconhecer no cenário.
- **Novo sobrevivente homenageado: Roney**, o melhor de todos no LoL antes do apocalipse (era o que achava) ("Sou muito bom com esse boneco." · "O que eu jogo esse joguinho aqui, não tá escrito."). Na horda, promete resolver tudo sozinho... e morre para um zumbi.
  - **Easter egg:** de vez em quando o Roney "acha um jeito" de duplicar sucata e quebra a economia do abrigo; o desenvolvedor refaz o código quase todo e ele fica só com 1 sucata de consolação. Homenagem ao teste dele, que quebrou a economia de verdade.

- **📺 Filtros visuais** (Configurações › 🎨 Visual): mudam o jeito da imagem do cenário e do menu, por cima do estilo escolhido. Valem para todos os saves deste navegador e são **liberados ao encontrar a Cura**: vencer numa dificuldade libera o filtro dela e os das menores.
  - 📺 **TV de tubo** (vença no 🌱 Fácil): linhas de TV antiga, cores mais vivas, cantos escurecidos.
  - 📜 **Fotografia antiga** (Normal): tons de sépia e grão.
  - 🟢 **Visão noturna** (Difícil): tudo em verde, com chuvisco.
  - 🩸 **Preto, branco e sangue** (Pesadelo): preto e branco de alto contraste, só o vermelho continua colorido.
  - 📼 **Câmera de segurança** (Apocalipse): gravação de câmera de vigilância, em cinza azulado com chiado, ● REC piscando e a data e hora na tela.
  - A tela de vitória mostra os filtros liberados. No menu de debug, a aba **📺 Filtros** aplica qualquer um na hora e libera todos até recarregar.

- **Caixas de herói com nível:** cada caixa agora guarda a **onda em que caiu** (o nível, **Nv.**), e a sucata e a munição seguem esse nível. Guardar caixas da onda 10 para abrir na 40 não rende mais 4x. O nível aparece na caixa do cenário, na janela de abrir e no registro.
  - **O sorteio é decidido quando a caixa cai:** exportar e importar o save não dá outra chance de tirar ★★★. As estrelas e os prêmios saem sempre iguais para a mesma caixa.
  - Caixas guardadas de versões anteriores recebem o nível da onda em que o save for aberto.

- **🐞 Reportar bug** (rodapé e Configurações › 💾 Dados): uma janela para descrever o problema, com o tipo, e que anexa sozinha a versão, a dificuldade, a onda, a cidade, o navegador, as últimas linhas do registro e um **snapshot do save**. Dá para **baixar o relatório** (arquivo com tudo, inclusive o save), **copiar** ou **abrir uma issue no GitHub** já preenchida. Com uma chave do Web3Forms configurada, o botão **Enviar** manda o relatório direto para o e-mail de quem cuida do jogo, sem o jogador precisar de conta.

- **Rede de segurança para erros:** se algum erro de código acontecer, o jogo continua rodando em vez de travar, mostra um aviso "Algo deu errado" com o atalho para o Reportar bug, e os erros recentes vão anexados no relatório.

- **Importar pelo menu principal:** na tela **📂 Carregar**, cada espaço tem um botão **📥 Importar**, inclusive os vazios. Dá para trazer um progresso exportado sem precisar começar um jogo antes. O Carregar fica disponível mesmo sem nenhum jogo salvo. A janela de importar ficou mais simples: **arraste o arquivo do save** para a área (ou clique nela para escolher) e ele importa na hora.

- **Arquivo de save próprio (.voidfall):** o Exportar agora baixa direto um arquivo do jogo, com o nome do jogador, a cidade e a data (ex.: `voidfall-ana-cidade3-2026-11-15.voidfall`), no lugar do código para copiar. Os arquivos .txt exportados antes continuam sendo aceitos no Importar.

- **Cópia de segurança do save:** a cada minuto, o save anterior vira uma cópia de segurança do espaço. Se o save principal corromper (aba fechada no meio da gravação, armazenamento cheio), o jogo abre a cópia sozinho e avisa (pode faltar o último minuto de jogo).

- **♿ Acessibilidade virou uma aba própria nas Configurações** (antes ficava dentro de Visual): reduzir efeitos visuais, desligar o tremor de tela e cores para daltonismo.
  - A janela ficou mais larga, com as 5 abas numa linha só. As abas das Configurações **não têm mais atalho de número** (os números ficam só para as abas do jogo).
  - **Abrir as Configurações durante o jogo pausa o jogo**, e fechar retoma (se já estava pausado, continua pausado). Segue a mesma regra da pausa: no ☣️ Pesadelo e no 🔥 Apocalipse, conta como uma pausa (no máximo 30s, depois 2 min até poder pausar de novo).

- **Dicas do tutorial encaixadas:** a dica (a que fecha com "Entendi") agora ocupa exatamente o quadro de baixo à esquerda, acompanhando o tamanho dele, em vez de flutuar desalinhada por cima. Em telas estreitas continua no canto da tela.

- **📊 Estatísticas no Códice** (atalho B): uma aba nova com os números do save, somando todas as cidades: **tempo jogado** (e nesta sessão), data em que o save começou, melhor onda, evacuações, zumbis abatidos (e abates por hora), chefes, tiros certeiros, vasculhadas, construções, expedições, pesquisas, vidas salvas, perdidos, e a coleção (conquistas, heróis, skins, pets, bestiário, glossário e memórias). Também mostra os 3 inimigos que você mais abateu.
  - O tempo jogado conta enquanto o jogo está aberto na tela, a partir desta versão. Saves antigos não têm a data de início.

- **🎯 Dano por parte do corpo** nas armas de bala do líder (pistola, espingarda, rifle e submetralhadora): tiro na **cabeça** dá **150%** do dano, no **tronco 75%** e na **perna 30%**. A cabeça ocupa a parte de cima do boneco, 15% maior do que a área de cabeça usada antes contra o Policial blindado. Cada acerto na cabeça mostra um **HEADSHOT!** amarelo (inclusive no blindado, que continua só sentindo tiro na cabeça), e a regra entra no Glossário do Códice no primeiro acerto. Granada, foguete, lança-chamas, guardas e torres não mudam.

- **🏆 Hall da Fama com ranking:** uma aba por dificuldade (do 🔥 Apocalipse ao 🌱 Fácil, com quantos venceram em cada), em ordem de quem encontrou a Cura em **menos tempo de jogo** (no empate, quem venceu primeiro). Os 3 primeiros ficam num **pódio animado** (ouro, prata e bronze): os degraus sobem ao abrir, as medalhas flutuam, um reflexo de luz passa pelo metal e o 1º lugar brilha com faíscas douradas. Do 4º em diante, uma tabela com data, tempo jogado, abates e sobreviventes perdidos. A lista "Deste navegador" saiu do Hall da Fama. O certificado de vitória agora leva também o horário exato, o tempo jogado e os perdidos.

- **👑 Skins de pódio e título único** para quem fica entre os 3 primeiros do ranking do Hall da Fama (em qualquer dificuldade):
  - **🥇 Lenda de Ouro** (1º lugar): manto carmim com ombreiras, cinto e faixa de ouro, sol no peito, capa longa até o chão balançando, **coroa alta com três joias**, aura dourada pulsando com halo no chão e estrelas douradas subindo em volta.
  - **🥈 Lenda de Prata** (2º): manto azul-real com detalhes de prata, capa longa, **tiara com pedra azul**, aura prateada e brilhos.
  - **🥉 Lenda de Bronze** (3º): manto verde-escuro com detalhes de bronze, capa longa, **coroa de louros**, aura acobreada.
  - **A skin fica para sempre** com a **melhor posição já alcançada** (quem chegou ao 1º tem as três). Só sai se o nome for removido do Hall da Fama.
  - **Título único**, no Hall da Fama e no cartão da skin: "👑 O Melhor do 🔥 Apocalipse", "🥈 O 2º Melhor do ...", e, para quem caiu, "Já foi o melhor do ..." (ou "o 2º melhor", "o 3º melhor"). Quem caiu de posição mas segue no pódio vê os dois: "🥉 O 3º Melhor do ... · já foi o melhor".
  - **A coroa no abrigo é ao vivo:** os vencedores que passeiam na frente do abrigo usam a roupa de ouro, prata ou bronze só enquanto estão no pódio, com o nome na cor do metal.
  - No Hall da Fama, a sua entrada aparece marcada com **"você"**. O certificado de vitória leva uma marca do save para o jogo reconhecer você no ranking.
  - Menu de debug › **🏆 Ranking**: simula 1º, 2º ou 3º lugar, "já foi 1º e hoje é 3º" e "caiu do pódio", em qualquer dificuldade, e veste a skin de ouro no líder. Também tem **🧪 Gerar certificado deste save** (como se vencesse agora, sem as recompensas) e **🔍 Validar certificado** (arraste o arquivo, escolha ou cole o código; ele acha o código até dentro de um e-mail salvo): confere a assinatura, mostra nome, dificuldade, data, tempo jogado, abates e perdidos, avisa o que parece estranho (vitória rápida demais, poucos abates, sem a marca do save, já no Hall) e entrega a linha pronta para o `HALL_OF_FAME`, com a opção de ver como fica no Hall antes de publicar.

- **👑 Tela de vitória nova:** em vez do código do certificado, um **certificado de verdade** na tela: moldura dourada, selo, o seu personagem (com a skin que estiver usando), o nome em destaque, "encontrou a Cura no ..." na cor da dificuldade e os números da partida (data, tempo de jogo, abates, perdidos e cidades). Embaixo, as recompensas e o convite para o Hall da Fama. O código fica escondido: vai só no e-mail. No menu de debug › 🏆 Ranking, **👑 Ver tela de vitória** mostra a tela com os dados do save, sem vencer nem dar recompensas.
- **Validador de certificados mais esperto:** se receber um **arquivo de save** em vez de um certificado, avisa; se o save tiver uma vitória registrada, gera o certificado a partir dela (para teste). Texto sem certificado nenhum diz o que mandar, e qualquer erro aparece na tela. Aceita o código **quebrado em várias linhas** (como chega no e-mail), e ao validar a janela rola até o resultado e o destaca. Com o certificado válido, **➕ Inserir no Hall da Fama** grava a linha direto no `HALL_OF_FAME` do js/config.js (Chrome/Edge: na primeira vez o navegador pede para escolher o arquivo e autorizar a edição), sem duplicar quem já está lá; em outros navegadores, copia a linha para colar. Ao inserir, também grava um **backup** da vitória (a linha, o certificado e o **save do jogador**, que agora vai junto no e-mail) num .txt na pasta `hall-backup/`, que fica fora do git.

- **📨 Enviar para o Hall da Fama:** a janela de vitória ganhou um botão que manda o certificado direto para o desenvolvedor, sem precisar de conta no GitHub (o link do GitHub saiu). Mostra "Enviado! Seu nome aparece no Hall da Fama quando for aprovado"; se não der para enviar, avisa para tentar de novo. No menu de debug › 🏆 Ranking, **📨 Enviar certificado de teste** manda um para o seu e-mail.

- **🎬 Créditos:** o botão "Sobre" do menu principal virou **Créditos**, que rolam na tela como no fim de um filme: criação, testadores, arte, música, tecnologia, agradecimentos, os sobreviventes homenageados e as lendas do Hall da Fama, terminando em "Obrigado por jogar". Dá para pausar, e a roda do mouse ou as setas rolam à mão (a rolagem automática volta depois de 3s). No fim, recomeçam. Com movimento reduzido no sistema, começam pausados. Os textos ficam em `CREDITS` (js/config.js).

- **O muro muda de visual conforme o nível** do Muro reforçado: 🪵 **Barricada de madeira** (nível 0), **Madeira reforçada com chapas** (2), **Sacos de areia e arame**, com estacas na frente (4), **Muro de concreto**, com vigas de aço e vergalhões no topo (7), e **Muralha de aço** rebitada, com faixa de alerta e luz vermelha piscando (10). A construção mostra o visual atual e em que nível ele muda.

## 1.06.000

Quando o muro cai.

- **Invasão do abrigo:** com o muro destruído, os zumbis não param mais nele: entram no acampamento e atacam quem estiver por perto. Os sobreviventes que não estão nos postos de tiro partem para cima deles e lutam corpo a corpo (causam dano, mas morrem com facilidade). Guardas, torres e as armas do líder continuam atirando em quem entrou.
- **Três destinos para quem é alcançado:** morrer, escapar **ferido** ou ser **mordido**. Remédios e o Médico de campo transformam uma morte em ferimento grave.
- **Feridos:** não trabalham até serem tratados. Cada médico cuida de um ferido por vez (e não produz remédio enquanto isso). Sem médico livre, a cada 2 minutos um ferido piora: gasta um remédio ou morre. Os feridos aparecem enfaixados perto do abrigo, com os médicos ao lado, e marcados com 🤕 na lista da equipe.
- **Decisão sobre os mordidos:** depois da horda, cada pessoa mordida exige uma escolha na tela:
  - **Matar:** sem risco, mas o grupo fica de **luto** (−15% de produção por 2min 30s, acumulável).
  - **Liberar:** sem luto, mas a pessoa provavelmente volta na **próxima horda como Transformado**, um zumbi mais forte e rápido que leva o nome dela. Com sorte (25%), resiste à infecção e volta curada alguns minutos depois, trazendo remédios.
- **Progresso offline:** o dano que passa do muro também gera mortos, feridos e mordidos; as decisões ficam esperando a sua volta.
- **Avisos:** resumo da invasão no registro, alerta de feridos sem médico, de luto e de muro caído antes da horda, e indicadores 🕯️ Luto e 🤕 feridos no cenário.
- Uma onda em que os zumbis invadiram o abrigo não conta mais como "sem dano ao muro" (conquista Intocável).
- **Menu de debug** (F9, \` ou botão 🐞 no rodapé): cenários prontos de invasão, mordidos, feridos, Transformado e cura, além de atalhos para muro, onda, pessoas, luto, recursos e tempo. Desligado por padrão: só aparece com `DEV_MODE = true` em `js/config.js` e rodando localmente.

## 1.05.001

Menus e armas da noite.

- **Até 3 armas por noite**, nos espaços (Q) (W) (E). Saves antigos: a arma que estava no espaço R vai para um espaço livre, se houver.
- **Arma equipada mais visível:** na barra da noite, a arma em uso fica maior, iluminada e com a etiqueta "EM MÃOS"; as outras ficam apagadas. Ao trocar de arma (Q/W/E, clique na barra ou roda do mouse), aparece um aviso no cenário com o nome da arma e a munição.
- **O líder segura a arma escolhida:** cada uma das 7 armas tem desenho próprio no telhado (pistola, espingarda com telha, rifle com luneta, submetralhadora com pente, lança-granadas, lança-chamas com tanque nas costas e bazuca no ombro). Ao trocar, ele abaixa e levanta a arma, e o clarão, a chama e os projéteis saem da ponta do cano certo.
- **Aba Armas:** cada arma equipada mostra "✔ Equipada (Q)", e os botões de espaço ficam em "Levar à noite: (Q) (W) (E)".
- **(R) recruta** (antes era G, que continua funcionando). R deixou de ser espaço de arma.
- **Atalho sem efeito agora avisa:** se o botão estiver indisponível (abrigo lotado, comida insuficiente, desafio Isolados), ele treme e o registro diz o motivo.
- **Atalhos no mesmo formato em todo lugar:** (V), (R), (C), (F) e (O) nos botões, (1) a (0) nas abas, (H) em Atalhos e na lista de atalhos.
- **Menus numerados:** opções dos acontecimentos, ofertas do comerciante, desafios da cidade e abas das Configurações mostram (1), (2)... e podem ser escolhidos com as teclas de número.
- **Configurações em abas:** Jogo, Visual (com Acessibilidade), Áudio e Dados.

## 1.05.000

Ambientação do cenário.

- **Acampamento refeito:** chão de terra batida separado do asfalto da rua; abrigo com arame farpado no telhado, caixa d'água, sacos de areia na porta, lampião e tambor de água; varal de lâmpadas coloridas que acende à noite; barracas com duas águas, cordas e luz dentro à noite; lona sobre a bancada de ferramentas; sacos de areia junto ao muro; varal de roupas balançando; fogueira com anel de pedras, troncos para sentar e panela fumegando no tripé.
- **Mais um carro na rua:** abandonado no meio da pista, inclinado pelos pneus murchos, com um vidro estourado, outro trincado, porta aberta, ferrugem e cacos de vidro brilhando no asfalto.
- **Janela de Configurações:** as descrições das opções voltaram a ficar numa linha só (o realce de palavras-chave as quebrava em pedaços; agora ele não vale nessa janela) e há mais espaço em volta da descrição do estilo musical.
- **Noite mais clara:** o céu e o cenário escurecem bem menos à noite, nos três estilos visuais.
- **Corpos pelo cenário:** pessoas e zumbis caídos na rua, de quem não chegou ao abrigo. Os zumbis que você abate ficam no chão por 40 segundos (antes, 5) e somem devagar.
- **Sangue:** manchas antigas e rastros de arrasto na rua (fora do acampamento), poças sob os corpos e manchas que duram mais onde os zumbis caem.
- **Zumbis se despedaçam ao morrer, de formas diferentes:** caem para trás, caem de cara, perdem a cabeça (que sai rolando, com sangue jorrando do pescoço), partem ao meio (as pernas ficam de pé um instante antes de tombar) ou se desmancham em pedaços. Explosões (granadas, bazuca, ataque aéreo e Inchados) sempre despedaçam. As partes voam, quicam no chão e ficam no cenário junto com os corpos.
- **Opção "Sangue e mutilação" (⚙️ → Visual):** desligada, tira manchas, poças, respingos e o despedaçamento; os zumbis só caem e os impactos levantam poeira.
- **Acontecimentos aleatórios:** a cada 7–18 segundos, algo acontece na cidade, com som leve e distante: vidro quebrando (com cacos caindo de uma janela), entulho despencando de um prédio, metal batendo, madeira rangendo, um alarme de carro ao longe e, à noite, tiros distantes.

## 1.04.001

- **Palavras-chave em destaque:** no registro, nas dicas, nas descrições, nas notificações e nas janelas, termos importantes ganham cor e negrito: perigo em vermelho (horda, zumbis, Abominação, mortes, fome), vida em verde (sobreviventes, remédios, vida, Cura), recompensas em dourado (Esperança, Legado, cash, conquistas), e cores próprias para comida, sucata, munição, pesquisa e muro. No modo para daltonismo, vermelho e verde viram laranja e azul.

## 1.04.000

Mira manual e armas do líder.

- **Mira:** durante a horda, o cursor vira uma mira e o clique atira no ponto mirado. Tiro fora do zumbi erra. De dia, clicar no cenário não vasculha mais: use o botão 🔍 Vasculhar (ou V).
- **Sete armas do líder**, numa aba nova (🔫 Armas): Pistola, Espingarda (5 projéteis em leque), Rifle de caça (atravessa zumbis), Submetralhadora (segure para atirar), Lança-granadas (dano em área), Lança-chamas (incendeia a área) e a **Bazuca**, que mata qualquer zumbi comum da área com um tiro e tira 40% da vida da Abominação. A Bazuca só é liberada na onda 25 e depois de derrotar 5 Abominações.
- **Compra e melhorias:** armas são compradas com recursos da cidade e ficam para sempre (sobrevivem a evacuações e a novos mundos). Cada uma vai até o nível 5, com mais dano, cadência e munição, e melhorias próprias (mais projéteis, mais zumbis atravessados, área maior, fogo mais longo).
- **Munição própria por noite:** cada arma recarrega no início da horda e não usa a munição dos guardas. Zumbis que você abate têm 20% de chance de deixar munição extra para as suas armas. A Pistola tem munição infinita.
- **Quatro espaços (Q W E R):** escolha quais armas levar. Troque durante a horda com Q W E R, com a roda do mouse ou tocando na barra de armas sobre o cenário.
- Cada arma tem som e efeito próprios: granadas em arco, foguete com rastro de fumaça, zumbis em chamas, explosão maior da Bazuca.
- A melhoria permanente **Mira do líder** agora dá +40% de dano das suas armas por nível (antes +1 de dano).
- **Atalhos:** Recrutar passou do R para o **G**; a tecla 0 abre a 10ª aba.

## 1.03.000

Tiros errados e precisão.

- **Guardas e torres podem errar:** guardas começam acertando 65% dos tiros e torres 80%. O tiro errado passa raspando, levanta poeira no chão e às vezes ricocheteia, e **também gasta munição**. O clique do jogador continua acertando sempre.
- **Precisão evolui com o jogo** (até 95%): o Treinamento de tiro agora dá +3% de precisão por nível, a nova pesquisa **🔭 Miras ópticas** dá +5% por nível, o talento Boa mira dá +2% por pessoa e o herói Atirador dá metade do bônus dele em precisão.
- O painel de defesa mostra a precisão atual de guardas e torres, e o alerta de munição passou a considerar os tiros errados.
- No progresso offline, as ondas usam a mesma precisão do jogo ao vivo, no lugar do desconto fixo de antes.
- **Compensação no começo:** os zumbis das 6 primeiras ondas são mais fracos (30% menos vida na onda 1, chegando ao normal na onda 7) e o jogo começa com 40 de munição em vez de 30.

## 1.02.000

Configurações, estilos e um grupo com mais personalidade.

- **Configurações (⚙️):** nova janela com tudo em um lugar: música e efeitos, volume geral, da música e dos efeitos, estilo musical, estilo do cenário, velocidade, acessibilidade, exportar/importar e rever as dicas do tutorial. As preferências ficam salvas no navegador.
- **Três estilos musicais:** Clássica (a trilha original), Synthwave e Terror (caixinha de música desafinada e drones de dia; batidas industriais, coração acelerado e cordas em trêmulo à noite).
- **Estilos do cenário:** Clássico, Synthwave (céu roxo, sol listrado e prédios em neon) e Terror (céu cinzento e neblina constante). O modo Automático acompanha o estilo da música.
- **Memorial:** quem morre entra numa lista na aba Equipe, com a causa, a onda e a cidade. O memorial sobrevive a evacuações e a novos mundos.
- **Talentos:** cerca de 1 em cada 3 sobreviventes chega com um talento (Boa mira, Mão verde, Come pouco, Força bruta e outros) que dá um bônus ao grupo enquanto a pessoa estiver viva.
- **Velocidade 2x:** botão ao lado de Vasculhar (atalho F) que acelera o dia. Na horda o jogo volta à velocidade normal, e o progresso offline não é acelerado.
- **Acessibilidade:** opções para reduzir efeitos visuais, desligar o tremor de tela e trocar verde e vermelho por azul e laranja nos avisos.
- **Pausa congela o cenário:** com o jogo pausado, os personagens, o fogo e as partículas param (a música continua tocando) e não dá para vasculhar.
- O controle de volume saiu do cabeçalho e foi para as Configurações; os botões de música e efeitos continuam lá.

## 1.01.001

- Nova trilha em estilo **synthwave**: de dia, pads de sintetizador, baixo pulsando em oitavas, arpejo com eco e bateria eletrônica suave; à noite, uma versão darksynth mais rápida e pesada, com baixo em semicolcheias, bumbo nos quatro tempos e um tema de lead. Os efeitos sonoros não mudaram.

## 1.01.000

Eventos, comerciante e qualidade de vida.

- **Dilemas:** de tempos em tempos, de dia, o abrigo enfrenta uma situação com escolha (alguém ferido no portão, saqueadores, uma caixa de suprimentos, briga por comida e outras). O jogo pausa até você decidir.
- **Comerciante ambulante:** aparece durante o dia com três ou quatro trocas de recursos, às vezes uma oferta rara (amostra, arma ou um sobrevivente). Vai embora depois de um tempo ou quando a horda chega.
- **Sobreviventes com nome:** cada pessoa do grupo tem nome, que aparece no registro quando alguém chega, morre ou não volta de uma expedição. A lista completa fica na aba Equipe.
- **Desafios de prestígio:** ao evacuar, escolha desafios opcionais para a nova cidade (sem torres, escassez, hordas maiores e outros). Cada um aumenta a Esperança ganha nela.
- **Exportar e importar o progresso:** gere um código (ou arquivo .txt) do save para fazer backup ou continuar em outro aparelho.
- **Tutorial curto:** dicas que aparecem uma vez, no momento certo, no primeiro jogo. Dá para pular.
- **Atalhos de teclado:** 1 a 9 trocam de aba, Espaço pausa, V vasculha, R recruta, C conserta o muro, M tira o som, O abre o comerciante e H mostra a lista.
- **Alertas de recursos:** o painel mostra quanto tempo a comida e a sucata ainda duram, avisa quando falta munição para a próxima horda e quando o muro está fraco perto do anoitecer.

## 1.00.000

Primeira versão publicada.

- Abrigo com seis funções de sobreviventes, construções, fome e recrutamento.
- Hordas em tempo real com seis tipos de zumbi, incluindo a Abominação a cada 10 ondas.
- Cena em pixel art no Canvas com ciclo de dia e noite, partículas e efeitos.
- Música generativa e efeitos sonoros sintetizados com a Web Audio API.
- Expedições, distritos da cidade e heróis com armas de quatro raridades.
- Pesquisa com laboratório, amostras, 14 tecnologias e automações.
- Prestígio em duas camadas: evacuação (Esperança) e a Cura (Legado).
- Noites especiais, conquistas, desafios semanais, loja de boosts e recordes.
- Quatro níveis de dificuldade e progresso offline de até 8 horas.
