# SENOV Provas — versão aplicativo (PWA + APK)

Aplicativo da **SENOV Educacional** para criar provas adaptadas: prova rápida, gabarito equilibrado, perfil AEE, gráficos e PDF no padrão ABNT.

Este repositório é **separado** de qualquer outro projeto (por exemplo, o app do AEE). Criar este repositório não altera nem apaga nada dos outros.

## O que acontece quando os arquivos chegam ao GitHub

Dois robôs (GitHub Actions) rodam sozinhos a cada envio para a branch `main`:

| Robô | O que faz | Onde ver o resultado |
|---|---|---|
| **Publicar site (PWA)** | Publica o app em `https://SEU-USUARIO.github.io/senov-provas/` | Aba **Actions** → link no final |
| **Gerar APK Android** | Cria o arquivo `SENOV-Provas.apk` | Aba **Releases** (lado direito da página do repositório) |

## Passo a passo (uma vez só)

1. Entre em **github.com** → botão **New** (novo repositório).
2. Nome: `senov-provas` · marque **Public** (o GitHub Pages gratuito exige repositório público) · **Create repository**.
3. Na página do repositório vazio, clique em **uploading an existing file**.
4. Descompacte o ZIP no computador e **arraste todo o conteúdo da pasta** (inclusive a pasta `.github`) para a página. Clique em **Commit changes**.
   - Se a pasta `.github` não aparecer (arquivos ocultos), no Windows ative *Exibir → Itens ocultos*; no Mac, `Cmd + Shift + .`.
5. Vá em **Settings → Pages** e, em *Source*, escolha **GitHub Actions**.
6. Vá em **Actions** e aguarde os dois robôs ficarem verdes (uns 5 minutos). Se o do site falhou porque o passo 5 ainda não estava feito, clique nele → **Re-run jobs**.

## Instalar no celular

**Como PWA (qualquer celular com navegador):** abra o link do site → menu do navegador → **Adicionar à tela inicial** / **Instalar app**. Abre sem internet depois da primeira vez.

**Como APK (Android e HarmonyOS 2, 3 e 4):** no celular, abra a página do repositório → **Releases** → baixe `SENOV-Provas.apk` → abra o arquivo → permita **instalar apps desconhecidos**. Novas versões instalam por cima, sem perder os dados.

> HarmonyOS NEXT (5 ou mais novo) não instala APK. Nesses aparelhos, use a versão PWA pelo navegador.

## Diferenças em relação à versão do claude.ai

- **Banco de questões fica no próprio aparelho.** Para levar questões de um aparelho para outro, use *Escola → Painel SENOV → Exportar banco (JSON)* e *Importar banco (JSON)*. Também dá para importar o JSON exportado da versão do claude.ai.
- **Revisão por IA é opcional:** em *Escola → Revisão por IA*, cole uma chave da API da Anthropic (console.anthropic.com). A chave fica só no aparelho e cada revisão é cobrada na conta da API. Sem chave, as questões ficam "só para mim".
- O app já vem com 16 questões de exemplo para testar.
- O banco compartilhado entre professores virá quando houver um servidor (ex.: Firebase ou Supabase).

## Para atualizar o app

Envie os arquivos novos para o repositório (mesmo caminho do passo 3). Os robôs publicam o site e geram um APK novo automaticamente.

## Estrutura

```
app/senov-provas.html  o app completo (mesmo código da versão do claude.ai)
www/local.js           banco no aparelho, downloads, revisão por IA, botão voltar
tools/build.py         monta o site em www/ (fontes, ícones, jsPDF, service worker)
capacitor.config.json, package.json   configuração do APK (Capacitor 8)
android-debug.keystore chave de TESTE para assinar o APK (não usar para loja)
.github/workflows/     robôs do site e do APK
```

Os robôs rodam `npm install` e `python3 tools/build.py node_modules` antes de publicar,
então as fontes, os ícones e as bibliotecas não precisam ficar no repositório.
