# Refatoração do Hero — Barbearia Novo Estilo

Consulte `/referencia/hero.png` antes de começar.

Use a imagem de referência anexada como inspiração visual para refatorar o Hero da página inicial.

## Direção geral

A página deve transmitir uma barbearia clássica, premium e masculina, misturando estética vintage com acabamento moderno.

A identidade atual deve ser preservada:
- Fundo predominantemente preto/grafite
- Branco/off-white para textos
- Vermelho escuro como cor de destaque
- Tipografia elegante, combinando serifada nos títulos com sans-serif nos textos
- Detalhes sutis inspirados em barbearias clássicas

## Header

Manter o header escuro e minimalista.

À esquerda:
- Logo da Barbearia Novo Estilo
- Nome da barbearia
- Subtítulo "BARBEARIA CLÁSSICA"

Ao centro:
- Início
- Serviços
- Profissionais
- Sobre
- Agendar

À direita:
- Botão vermelho "AGENDAR HORÁRIO"

O header deve ser discreto e não competir visualmente com o Hero.

## Hero

Remover o logo grande que atualmente aparece no lado direito.

O Hero deve ser dividido visualmente em duas áreas:

### Esquerda — conteúdo

Adicionar uma pequena identificação:

"DESDE 2011 · CURITIBA"

Abaixo, usar como título principal:

"Seu estilo.
Seu momento."

O título deve ser grande, elegante e ocupar bastante presença visual.

Abaixo:

"CORTES CLÁSSICOS.
PRECISÃO MODERNA."

Depois, dois CTAs:

[ AGENDAR HORÁRIO → ]
[ CONHECER SERVIÇOS → ]

O primeiro botão deve ser vermelho e claramente o CTA principal.
O segundo deve ser transparente, com borda sutil.

### Direita — imagem

No lugar do logo, utilizar uma fotografia grande e cinematográfica de uma barbearia.

A imagem deve mostrar um barbeiro trabalhando no corte de um cliente.

Preferências:
- Fotografia masculina/premium
- Ambiente de barbearia clássica
- Tons predominantemente escuros
- Tratamento levemente dessaturado/preto e branco
- Pequenos detalhes vermelhos podem aparecer naturalmente na fotografia
- A imagem deve ocupar bastante espaço e funcionar como elemento visual principal do Hero

Não utilizar uma moldura branca ao redor da imagem.

A imagem deve se integrar ao fundo através de gradientes escuros, sem parecer um card isolado.

## Estatísticas

Abaixo do Hero, criar uma faixa horizontal discreta com três indicadores:

13+
ANOS DE TRADIÇÃO

3
ESPECIALISTAS

4.9 ★
AVALIAÇÃO MÉDIA

Cada indicador pode ter um pequeno ícone minimalista vermelho.

Separar os indicadores com linhas verticais muito sutis.

## Bordas e decoração

Remover completamente as listras vermelho/branco/preto das bordas laterais.

Não substituir por outra borda chamativa.

A decoração deve ser muito mais minimalista:
- linhas finas
- pequenos detalhes vermelhos
- divisores discretos
- bastante espaço negativo

A sensação deve ser sofisticada, não temática demais.

## Hierarquia visual

A prioridade visual deve ser:

1. "Seu estilo. Seu momento."
2. Fotografia do barbeiro
3. Botão "Agendar horário"
4. Estatísticas
5. Navegação

Evitar excesso de elementos decorativos.

## Importante

Não transformar a página em um design genérico de "barbearia vintage".

A referência deve parecer uma marca real e premium, com design editorial e contemporâneo.

Preserve a estrutura e os componentes existentes sempre que possível e altere principalmente a composição visual do Hero.
------------------------------------------------------------
# Seção — Nossa equipe / Profissionais

Consulte também as referências visuais da pasta `/referencia/equipe` antes de implementar.

A seção atual possui a estrutura correta, porém deve receber um refinamento
visual para ficar alinhada à nova identidade da Barbearia Novo Estilo.

## Objetivo

Transmitir:

- profissionalismo;
- experiência;
- confiança;
- estética premium;
- proximidade com os profissionais.

A seção não deve parecer um grid genérico de cards.

---

## Cabeçalho da seção

Manter a estrutura:

"QUEM CUIDA DE VOCÊ"

"Nossa equipe"

"Profissionais experientes, cada um com sua especialidade,
prontos para o seu novo visual."

O pequeno detalhe vermelho ao lado do texto deve ser mantido.

O título deve utilizar a mesma tipografia serifada elegante da Home.

---

## Cards dos profissionais

Manter os três profissionais lado a lado no desktop.

Cada card deve conter:

1. Foto do profissional
2. Nome
3. Cargo/especialidade
4. Especialidade resumida
5. CTA para agendamento

### Imagem

Substituir os placeholders atuais "MS", "LA" e "BC" por fotos reais
quando elas estiverem disponíveis.

As fotos devem seguir uma direção visual consistente:

- fotografia profissional;
- enquadramento semelhante entre os profissionais;
- fundo escuro ou neutro;
- tratamento levemente cinematográfico;
- aparência natural;
- evitar fotos com estilos completamente diferentes.

A imagem deve ser o elemento visual principal do card.

---

## Informações

Exemplo:

Mariana Silva
CABELEIREIRA

Especialista em cortes

O nome deve ter maior destaque.

O cargo deve utilizar vermelho de forma discreta.

A descrição deve ser menor e mais neutra.

---

## CTA

Manter:

"AGENDAR COM ESTE PROFISSIONAL"

Porém, o botão não deve dominar visualmente o card.

Estado normal:
- fundo transparente/off-white;
- borda escura;
- texto escuro.

Hover:
- fundo vermelho;
- texto claro;
- transição suave.

---

## Estética dos cards

Evitar cards excessivamente arredondados.

Preferir:

- bordas retas ou levemente arredondadas;
- bordas finas;
- pouca ou nenhuma sombra;
- bastante espaço interno;
- composição editorial.

A seção deve parecer mais próxima de um editorial de uma barbearia
premium do que de uma interface administrativa.

---

## Composição

Não deixar os cards ocuparem toda a largura da tela.

Manter uma largura confortável e bastante espaço negativo ao redor.

No desktop:

[ PROFISSIONAL ] [ PROFISSIONAL ] [ PROFISSIONAL ]

Os três cards devem ter exatamente a mesma altura e alinhamento.

No mobile:
- transformar em uma coluna;
- manter as imagens grandes;
- manter espaçamento consistente entre os profissionais.

---

## Integração com o restante do site

A seção deve utilizar a mesma linguagem visual da Home:

- preto/grafite;
- off-white;
- vermelho como acento;
- serifada nos títulos;
- sans-serif nos textos;
- linhas finas;
- decoração mínima.

Não adicionar as listras de barber pole nas laterais.

Não exagerar nos elementos decorativos.

A sensação final deve ser:

"Uma equipe de profissionais experientes em uma barbearia premium."

e não "uma lista de funcionários em cards".

------------------------------------------------------------


# Refatoração do fluxo de agendamento

Consulte `/referencia/fluzoAgendamento.png` antes de começar.

Refatore visualmente o fluxo de agendamento existente mantendo toda a lógica,
funcionalidade, etapas e regras atuais.

A referência visual deve ser a identidade da nova home:
barbearia clássica, premium, elegante e contemporânea.

## Objetivo

O agendamento deve parecer parte do mesmo site da Barbearia Novo Estilo,
e não uma tela administrativa separada.

Não alterar a lógica do fluxo.
Não remover etapas.
Não alterar regras de seleção, disponibilidade, pagamento ou validação.

Apenas melhorar a experiência visual e a hierarquia.

---

# Estrutura do fluxo

Manter as 5 etapas:

1. Serviço
2. Profissional
3. Data e horário
4. Dados
5. Pagamento

O indicador de progresso deve continuar sempre visível no topo do card.

Estados:

- etapa concluída → círculo com check
- etapa atual → círculo vermelho
- etapas futuras → círculo neutro
- manter o texto da etapa visível

O usuário deve entender imediatamente onde está e o que já concluiu.

---

# Container principal

Manter um container centralizado, porém reduzir a sensação de
"card gigante vazio".

O conteúdo deve ter largura confortável para leitura e bastante
espaçamento interno, mas sem exagerar no espaço vertical.

Usar:

- fundo claro/off-white
- bordas muito sutis
- sombras discretas
- cantos pouco arredondados ou retos
- vermelho da marca apenas para estados ativos e CTAs

Evitar aparência de dashboard/SaaS.

A estética deve continuar parecendo uma barbearia premium.

---

# Etapa 1 — Serviço

Título:

"O que você deseja fazer?"

Subtítulo:

"Escolha o serviço para este agendamento."

Os serviços devem continuar em grid.

Cada serviço deve funcionar como um card selecionável.

Estado normal:
- fundo muito claro
- borda discreta
- nome do serviço em destaque
- duração secundária
- preço alinhado à direita

Estado selecionado:
- borda vermelha
- pequeno indicador vermelho
- destaque visual sutil

Não usar sombras exageradas.

O usuário precisa perceber claramente qual serviço está selecionado.

---

# Etapa 2 — Profissional

Seguir exatamente a mesma linguagem visual da etapa de serviço.

Mostrar os profissionais como opções selecionáveis.

Se houver foto do profissional, utilizar uma imagem pequena e elegante.

Informações:

Nome
Especialidade / descrição curta

Estado selecionado deve utilizar o vermelho da marca.

A interface deve parecer consistente com a etapa anterior.

---

# Etapa 3 — Data e horário

Título:

"Escolha o melhor horário"

Subtítulo:

"Selecione a data e o horário disponível."

A seleção de datas deve ser visualmente simples.

Data selecionada:
- fundo vermelho
- texto claro

Datas indisponíveis:
- aparência claramente desabilitada
- baixo contraste
- não parecer selecionável

Os horários devem ser apresentados em uma grade organizada.

Separar visualmente:

MANHÃ
09:00  09:30  10:00  10:30 ...

TARDE
14:00  14:30  15:00 ...

Horário selecionado:
- vermelho
- texto branco

Horários indisponíveis:
- neutros/desabilitados

---

# Etapa 4 — Dados

Título:

"Quase pronto!"

Subtítulo:

"Informe seus dados para confirmarmos o agendamento."

Manter os campos:

Nome completo
Telefone
E-mail

Os inputs devem seguir a mesma linguagem visual do restante do site.

Ao lado, manter um resumo do agendamento.

Porém, melhorar muito esse resumo.

Em vez de:

ServiçoCorte Masculino
ProfissionalBeatriz Costa
Data12/10/2026
Horário10:30
TotalR$50,00

utilizar uma estrutura visual organizada:

SEU AGENDAMENTO

Corte Masculino
Beatriz Costa

12 OUT · 10:30

R$ 50,00

O resumo deve funcionar como uma pequena confirmação visual
antes do pagamento.

---

# Etapa 5 — Pagamento

Título:

"Como deseja pagar?"

Subtítulo:

"Escolha a forma de pagamento para concluir."

Manter as opções:

PIX
Cartão
Pagar no salão

A opção selecionada deve utilizar o vermelho da marca.

No PIX:

QR Code
instrução curta
valor
botão "JÁ REALIZEI O PAGAMENTO"

Evitar deixar o QR Code com aparência de elemento aleatório.
Ele deve estar integrado ao bloco de pagamento.

---

# Navegação entre etapas

Manter:

← VOLTAR

e

CONTINUAR →

O botão principal deve sempre utilizar o vermelho da marca.

Quando a ação não puder ser executada:
- botão visualmente desabilitado
- não utilizar vermelho forte

Quando estiver disponível:
- vermelho
- contraste alto

O botão deve ficar sempre no mesmo local dentro do fluxo,
criando previsibilidade.

---

# Identidade visual

A paleta deve seguir a home:

Preto/grafite:
#111111 aproximadamente

Vermelho:
utilizar o vermelho já existente no projeto

Branco/off-white:
para áreas de conteúdo

Cinza:
para bordas, textos secundários e estados desabilitados.

Tipografia:
- títulos com a mesma serifada elegante utilizada na home
- textos e controles com sans-serif

---

# Importante: não exagerar na estética

Não transformar o agendamento em uma "barbearia vintage temática".

Evitar:
- listras de barber pole nas laterais
- excesso de vermelho
- texturas pesadas
- muitos ícones
- ornamentos decorativos
- sombras exageradas
- cards excessivamente arredondados

A interface deve transmitir:

"luxo discreto + tradição + facilidade"

e não:

"site temático de barbearia".

---

# Responsividade

No desktop:
- manter o fluxo centralizado
- aproveitar melhor a largura disponível
- evitar excesso de espaço vazio

No mobile:
- etapas devem continuar claras
- conteúdo deve ocupar praticamente toda a largura
- grids devem se adaptar para uma coluna quando necessário
- resumo do agendamento pode ficar abaixo dos campos

O fluxo precisa continuar extremamente simples no celular.

---

# Regra principal

A pessoa deve conseguir responder rapidamente:

"Onde estou?"
"O que estou escolhendo?"
"O que já escolhi?"
"O que falta?"
"Como volto?"
"Como avanço?"

A estética é importante, mas a prioridade é a clareza do processo de agendamento.

-----------------------------------------------------------

# Seção — Footer

Consulte as referências visuais da pasta `/referencia/footer` antes de implementar.

O footer atual já possui uma boa estrutura e deve ser refinado,
não completamente reconstruído.

Ele deve funcionar como o fechamento visual da página, mantendo a
identidade clássica, elegante e contemporânea da Barbearia Novo Estilo.

---

## Direção visual

O footer deve permanecer em fundo escuro/grafite, mantendo continuidade
com o restante da identidade.

Utilizar:

- fundo #111111 aproximadamente;
- textos em branco/off-white;
- textos secundários em cinza;
- vermelho apenas como pequeno detalhe;
- linhas divisórias finas;
- bastante espaço negativo.

Não adicionar elementos decorativos excessivos.

Não utilizar novamente as listras de barber pole nas laterais.

---

## Estrutura

Organizar o footer em quatro áreas principais:

### 1. Marca

Mostrar:

Logo
Barbearia Novo Estilo

Descrição:

"Barbearia com essência clássica inglesa e atendimento contemporâneo,
no coração de Curitiba."

A marca deve ter maior destaque visual que as outras colunas.

---

### 2. Navegação

Título:

NAVEGAÇÃO

Links:

Início
Serviços
Profissionais
Agendar

Os links devem possuir hover discreto utilizando o vermelho da marca.

---

### 3. Contato

Título:

CONTATO

Informações:

Rua das Palmeiras, 482
Batel — Curitiba, PR
(41) 3025-1187

Os dados devem ter boa legibilidade e espaçamento.

Telefone deve ser clicável no mobile.

---

### 4. Funcionamento

Título:

FUNCIONAMENTO

Informações:

Terça a sábado
09h às 19h

@barbearianovoestilo

O Instagram deve funcionar como link.

---

# Linha inferior

Separar a área principal do footer através de uma linha horizontal
extremamente discreta.

Na parte inferior:

À esquerda:

"ELEGÂNCIA EM CADA DETALHE."

À direita:

"© 2026 Barbearia Novo Estilo. Todos os direitos reservados."

A frase "ELEGÂNCIA EM CADA DETALHE." deve funcionar como uma pequena
assinatura da marca.

Pode utilizar letras maiúsculas e espaçamento entre caracteres.

---

# Hierarquia

A prioridade visual deve ser:

1. Logo / nome da barbearia
2. Descrição da marca
3. Títulos das colunas
4. Informações
5. Copyright

Não deixar todas as informações com o mesmo peso visual.

---

# Tipografia

Utilizar a mesma linguagem tipográfica do restante do site.

Nome da marca:
serifada elegante.

Títulos das colunas:
sans-serif, caixa alta, pequeno e com letter-spacing.

Conteúdo:
sans-serif, confortável para leitura.

Copyright:
menor e com contraste reduzido.

---

# Responsividade

No desktop:

[ MARCA ] [ NAVEGAÇÃO ] [ CONTATO ] [ FUNCIONAMENTO ]

No mobile, reorganizar verticalmente:

MARCA

NAVEGAÇÃO

CONTATO

FUNCIONAMENTO

E por fim:

ELEGÂNCIA EM CADA DETALHE.
© 2026 Barbearia Novo Estilo.

Manter espaçamento generoso entre os blocos.

---

# Importante

O footer não deve competir com o Hero.

Ele deve ser mais discreto e institucional.

Não adicionar:
- grandes imagens;
- novos cards;
- excesso de ícones;
- mapas;
- muitos botões;
- elementos decorativos desnecessários.

A sensação desejada é:

"Esse é o fechamento elegante de uma marca estabelecida."

e não "mais uma seção cheia de conteúdo".

-----------------------------------------------------------

# Seção — Serviços

Consulte as referências visuais da pasta `/referencia` antes de implementar.

A tela atual possui uma boa estrutura e deve ser refinada visualmente,
sem alterar a lógica dos serviços ou do agendamento.

## Objetivo

A seção deve transmitir:

- precisão;
- qualidade;
- tradição;
- transparência de preços;
- facilidade para agendar.

Ela deve continuar clara e funcional, mas com aparência de catálogo
premium de uma barbearia.

---

## Cabeçalho

Manter:

"O QUE FAZEMOS"

"Nossos serviços"

"Cada atendimento é pensado com técnica e cuidado, do primeiro corte à
finalização."

Manter o pequeno detalhe vermelho ao lado do texto.

Utilizar a mesma tipografia e hierarquia visual das outras seções.

---

## Cards

Manter o grid de 3 colunas no desktop.

Cada serviço deve apresentar:

- número do serviço;
- nome;
- preço;
- duração;
- botão de agendamento.

Exemplo:

01

Corte Feminino

R$ 80,00                         60 min

[ AGENDAR ]

---

## Visual dos cards

Os cards devem ser minimalistas.

Manter:

- fundo branco/off-white;
- borda fina;
- linha superior preta;
- detalhes vermelhos;
- tipografia serifada nos nomes;
- sans-serif nas informações.

Evitar:

- sombras fortes;
- bordas muito arredondadas;
- excesso de ícones;
- gradientes;
- excesso de vermelho.

O vermelho deve ser usado principalmente para:

- número;
- preço;
- estados de interação.

---

## Hierarquia

O nome do serviço deve ser o elemento mais importante do card.

O preço deve ter bastante destaque, utilizando vermelho.

A duração deve ser secundária e ficar visualmente próxima do preço.

O botão deve ser claramente clicável, porém não deve competir com
o nome e o preço.

---

## Interação

No hover:

- borda pode receber o vermelho da marca;
- botão pode receber fundo vermelho e texto branco;
- transição suave;
- evitar animações exageradas.

No estado normal:

[ AGENDAR ]

deve permanecer com fundo transparente/branco e borda escura.

---

## Organização

Os seis serviços devem continuar organizados:

01 Corte Feminino
02 Corte Masculino
03 Corte Infantil

04 Escova
05 Hidratação
06 Coloração

Manter os cards com exatamente a mesma altura e alinhamento.

---

## Responsividade

Desktop:

3 colunas.

Tablet:

2 colunas.

Mobile:

1 coluna.

No mobile, manter boa área de toque para o botão "AGENDAR".

---

## Integração visual

Esta é uma seção clara do site.

O Hero permanece escuro.

A seção de profissionais também deve utilizar fundo claro.

O footer volta para o fundo escuro.

Portanto, manter esta seção em fundo branco/off-white.

Essa alternância entre seções claras e escuras deve ser preservada.

---

## Importante

Não transformar os serviços em uma seção visualmente pesada.

A informação mais importante aqui é:

SERVIÇO → PREÇO → DURAÇÃO → AGENDAR

O usuário deve conseguir comparar os serviços rapidamente.

A estética deve parecer:

"cardápio de serviços de uma barbearia premium"

e não:

"lista de produtos de um e-commerce".