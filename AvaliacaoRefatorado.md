Quero refatorar visualmente a seção de avaliações da Barbearia Novo Estilo. Atualmente, ela possui muito espaço vazio, o formulário fica isolado no centro da página e a apresentação não transmite a mesma qualidade visual do restante do site.

O objetivo é tornar essa seção mais elegante, organizada e convidativa, mantendo a identidade visual premium já existente.

### 1. Identidade visual

Preserve integralmente a identidade visual atual:
- Preto e carvão para elementos escuros.
- Branco e marfim para fundos claros.
- Vinho para botões, links e destaques.
- Tipografia serifada nos títulos e sem serifa nos textos auxiliares.
- Bordas discretas, espaçamentos equilibrados e aparência sofisticada.

Não altere o cabeçalho, o logotipo, a navegação ou as demais seções do site.

### 2. Cabeçalho da seção

Reorganize o início da seção com:
- Um pequeno identificador em vinho: “AVALIAÇÕES”.
- Um título de destaque: “Sua experiência importa.”
- Uma descrição curta: “Cada visita conta uma história. Compartilhe a sua com a gente.”

Mantenha o alinhamento consistente com o restante do site e elimine os espaços verticais excessivos existentes atualmente.

### 3. Listagem de avaliações

Prepare uma área visual para apresentar as avaliações publicadas.

Quando existirem avaliações:
- Exiba cada avaliação em um card elegante, com fundo claro, bordas discretas e espaçamento adequado.
- Mostre a nota em estrelas, o comentário, o nome autorizado do cliente e as fotos anexadas, quando disponíveis.
- Utilize uma grade responsiva, com até três colunas no desktop, duas no tablet quando houver espaço e uma no celular.
- Garanta que comentários longos e imagens não quebrem o layout.

Não crie avaliações fictícias nem apresente dados de exemplo como se fossem avaliações reais.

### 4. Estado vazio

Quando ainda não houver avaliações publicadas, não deixe um espaço vazio nem exiba apenas uma mensagem solta no centro da tela.

Apresente um painel visual convidativo com:
- Ícone discreto de comentário ou avaliação.
- Título: “Seja o primeiro a avaliar”.
- Texto: “Sua opinião ajuda outros clientes a conhecerem a experiência da Novo Estilo.”
- Botão vinho: “ESCREVER AVALIAÇÃO”.

Esse estado deve ser elegante, compacto e coerente com a identidade da barbearia.

O botão deve levar o usuário até o formulário de avaliação, por rolagem suave ou pela abertura do formulário, conforme a estrutura atual do projeto.

### 5. Formulário de avaliação

O formulário atual deve ser preservado funcionalmente, mas receber um tratamento visual mais refinado.

Reorganize-o em um painel com fundo marfim, bordas discretas e espaçamento interno consistente.

Mantenha os seguintes elementos:
- Título: “Conte como foi sua experiência”.
- Campo de nota com cinco estrelas interativas.
- Campo de comentário com limite de 600 caracteres e contador.
- Upload opcional de até três fotos.
- Informação sobre os formatos aceitos: JPG, PNG ou WebP.
- Aviso de que os metadados de localização das fotos são removidos automaticamente.
- Botão principal vinho: “PUBLICAR AVALIAÇÃO”.

As estrelas precisam ter estados visuais claros para seleção, hover e foco. No celular, todos os campos e botões devem ocupar a largura disponível, respeitando as margens.

### 6. Organização da página

A ordem visual desejada é:
1. Cabeçalho da seção com título e descrição.
2. Indicadores de reputação, somente quando houver dados reais suficientes.
3. Avaliações publicadas ou o estado vazio.
4. Formulário para enviar uma avaliação.

Se o formulário ficar muito longo na página, você pode propor que ele seja aberto por um botão ou por um painel expansível, desde que a solução seja consistente com os componentes existentes e não prejudique a acessibilidade.

### 7. Responsividade

- Desktop: aproveitar melhor a largura disponível, sem deixar o formulário excessivamente largo.
- Tablet: ajustar a grade e os espaçamentos de forma proporcional.
- Celular: utilizar uma coluna, reduzir espaços vazios e garantir que estrelas, campos, botões e fotos sejam fáceis de utilizar por toque.
- Evitar rolagem horizontal, sobreposição e alturas fixas desnecessárias.

### 8. Requisitos técnicos

Antes de implementar:
- Analise os componentes, estilos e regras atuais da seção.
- Identifique os arquivos que precisam ser modificados.
- Apresente um plano breve de implementação e aguarde minha aprovação.

Preserve a lógica de envio, as validações, o limite de caracteres, o limite de fotos, a remoção de metadados e o fluxo atual de publicação. Não altere o backend, o banco de dados, as rotas ou as regras de negócio.

Prefira ajustes nos componentes e estilos existentes, evitando reescrever funcionalidades que já funcionam.

**Resultado esperado:** uma página de avaliações premium, visualmente organizada e responsiva, que valorize os comentários reais dos clientes e apresente um estado vazio agradável até que as primeiras avaliações sejam publicadas.