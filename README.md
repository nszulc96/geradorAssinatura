# Gerador de Assinaturas de E-mail

Aplicação web estática que transforma uma assinatura pronta em PNG em uma assinatura HTML com áreas clicáveis independentes. O projeto foi pensado para o Microsoft Outlook e processa todos os dados localmente no navegador.

## Como executar

1. Abra `index.html` com um navegador moderno, preferencialmente Microsoft Edge ou Google Chrome.
2. Mantenha conexão com a internet durante a geração: o JSZip é carregado pelo CDN do jsDelivr.
3. Selecione o modelo e uma imagem PNG com as dimensões exatas indicadas.
4. Escolha o tamanho final: **Original**, **Médio** ou **Compacto**.
5. Preencha os dados e use **Atualizar preview** para testar os links.
6. Use **Baixar tamanho selecionado** para gerar somente a medida escolhida ou **Baixar os 3 tamanhos** para receber todas de uma vez.

Não é necessário instalar dependências, usar terminal ou executar um servidor. Nenhuma imagem ou informação preenchida é enviada para serviços externos.

## Tamanhos disponíveis

Para o modelo Expresso Tecnologia 900×230, o gerador oferece:

- **Original:** 900×230 px (100%).
- **Médio:** 720×184 px (80%).
- **Compacto:** 585×150 px (65%).

A imagem de entrada continua sendo sempre a PNG original de 900×230. O redimensionamento é feito no Canvas antes do fatiamento, e o ZIP já contém imagens e coordenadas no tamanho escolhido. Assim, não é necessário redimensionar a assinatura dentro do Outlook.

Os arquivos menores recebem um sufixo para evitar confusão, por exemplo `assinatura-nicole-medeiros-medio.zip` e `assinatura-nicole-medeiros-compacto.zip`.

O botão **Baixar os 3 tamanhos** gera `assinatura-nicole-medeiros-3-tamanhos.zip` com esta organização:

```text
assinatura-nicole-medeiros-3-tamanhos/
├── LEIA-ME.txt
├── original-900x230/
├── medio-720x184/
└── compacto-585x150/
```

Cada pasta de tamanho contém seu próprio `assinatura.html`, `LEIA-ME.txt` e diretório `assets`.

## Conteúdo do ZIP

O download cria uma pasta compactada com esta estrutura:

```text
assinatura-nome-do-colaborador/
├── assinatura.html
├── LEIA-ME.txt
└── assets/
    ├── assinatura.png
    └── slice-*.png
```

O `LEIA-ME.txt` contém o passo a passo para abrir, copiar e colar a assinatura no Outlook.

## Estrutura do projeto

```text
index.html
css/
└── style.css
js/
├── app.js
├── templates.js
├── imageProcessor.js
├── signatureGenerator.js
├── zipGenerator.js
└── utils.js
```

- `app.js`: estado da tela, eventos, formulário, validações e preview.
- `templates.js`: dimensões e coordenadas de cada modelo.
- `imageProcessor.js`: leitura da imagem, recortes com Canvas e teste de integridade.
- `signatureGenerator.js`: montagem da tabela HTML compatível com clientes de e-mail.
- `zipGenerator.js`: criação do ZIP, dos assets e do arquivo de instruções.
- `utils.js`: sanitização, normalização de links e download.

## Como funciona a imagem clicável

O processador cria uma grade a partir das coordenadas e recorta a imagem com Canvas. Os recortes são organizados em colunas dentro de uma única linha visual de tabela. As partes clicáveis são elementos `<a>` reais envolvendo imagens, estrutura que o editor do Outlook mantém ao copiar e colar.

A imagem completa também é aplicada como fundo da assinatura. Assim, se algum cliente de e-mail tentar inserir um microespaço entre dois recortes, o espaço revela o mesmo pixel da imagem de fundo em vez de uma faixa branca. O HTML inclui a alternativa VML usada pelo Outlook clássico para imagens de fundo.

Quando um link opcional está vazio, o recorte continua visível sem o elemento `<a>`. Antes da exportação, o sistema remonta os recortes em outro Canvas e compara os pixels com a imagem original. O selo **Integridade visual verificada** indica que as dimensões e coordenadas foram conferidas.

## Como alterar coordenadas

Edite apenas o objeto correspondente em `js/templates.js`:

```javascript
phone: {
    label: 'TELEFONE',
    x: 578,
    y: 115,
    width: 322,
    height: 30
}
```

- `x`: distância em pixels a partir da esquerda.
- `y`: distância em pixels a partir do topo.
- `width`: largura da região clicável.
- `height`: altura da região clicável.

As regiões precisam estar totalmente dentro da imagem e não podem se sobrepor. O modo **Mostrar regiões clicáveis** ajuda a conferir visualmente o posicionamento.

## Como criar um novo template

Adicione uma nova chave em `window.SIGNATURE_TEMPLATES`, mantendo os mesmos nomes de região usados pelo gerador:

```javascript
window.SIGNATURE_TEMPLATES = {
    expresso900x230: {
        name: 'Expresso Tecnologia - 900x230',
        width: 900,
        height: 230,
        regions: {
            phone: { label: 'TELEFONE', x: 578, y: 115, width: 322, height: 30 },
            email: { label: 'E-MAIL', x: 578, y: 145, width: 322, height: 34 },
            whatsapp: { label: 'WHATSAPP', x: 139, y: 179, width: 28, height: 51 },
            instagram: { label: 'INSTAGRAM', x: 173, y: 179, width: 28, height: 51 },
            linkedin: { label: 'LINKEDIN', x: 207, y: 179, width: 28, height: 51 },
            website: { label: 'SITE', x: 241, y: 179, width: 28, height: 51 }
        }
    },
    novoModelo: {
        name: 'Nome exibido - largura x altura',
        width: 900,
        height: 230,
        regions: {
            // Use as mesmas seis chaves do modelo acima.
        }
    }
};
```

A lista da interface é preenchida automaticamente. As dimensões e coordenadas não ficam espalhadas pelos demais arquivos.

## Compatibilidade com Outlook

O HTML exportado usa tabelas com `cellpadding="0"`, `cellspacing="0"`, estilos inline, dimensões explícitas, imagens em bloco e apenas linhas integrais. Os links envolvem diretamente os PNGs clicáveis, sem depender de mapas de imagem invisíveis. O layout não depende de JavaScript, Flexbox, Grid, SVG ou posicionamento absoluto.

Depois de gerar o ZIP:

1. Extraia a pasta completa.
2. Abra `assinatura.html` no navegador.
3. Pressione `Ctrl+A` e `Ctrl+C`.
4. Cole no editor de assinaturas do Outlook.
5. Envie uma mensagem de teste para conferir imagens e links.

O comportamento exato de colagem pode variar entre versões do Outlook e políticas corporativas. Sempre valide em uma mensagem recebida por outro destinatário antes de distribuir a assinatura.

## Teste de integração

Abra `tests/smoke.html` no Edge ou Chrome. A página cria uma imagem de teste em memória e confere automaticamente:

- dimensões e fatiamento da grade;
- dimensões, coordenadas e integridade dos três tamanhos;
- reconstrução pixel a pixel;
- organização dos recortes em colunas sem linhas horizontais intermediárias;
- imagem completa de fundo para ocultar possíveis microespaços;
- âncoras clicáveis preservadas pelo Outlook;
- normalização e segurança dos links;
- estrutura da tabela para Outlook;
- criação e conteúdo interno do ZIP.

O resultado esperado no início da página é `PASSOU`.

## Segurança e privacidade

- URLs aceitam somente `http` e `https`; telefone e e-mail são convertidos internamente para `tel:` e `mailto:`.
- Protocolos perigosos, como `javascript:`, são rejeitados.
- Valores inseridos no HTML são escapados.
- Somente o último template selecionado pode ser guardado no `localStorage`.
- Nome, telefone, e-mail, imagem e demais links não são persistidos pelo sistema.
