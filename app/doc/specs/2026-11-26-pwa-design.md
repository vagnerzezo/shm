# App de celular como PWA (parte A: instalar) — desenho

Data: 2026-11-26. Situação: aprovado pelo Vagner.

Legenda: **[decidido]** veio do Vagner; **[escolha minha]** foi definido por mim e pode ser trocado.

## Para quê

O estúdio quer um "app de celular" para clientes, barbeiros e admin. **[decidido]** Em vez de um app de loja (Apple/Google), o próprio site vira um PWA instalável. Esta parte A entrega só a instalação; notificações no celular ficam para uma parte B, que não desfaz nada desta.

## Abordagens consideradas

- **App de loja (nativo / Expo) usando a API v1:** custo de contas de desenvolvedor, aprovação das lojas e um segundo projeto para manter; a API também não cobre o que o barbeiro ganhou no site em 2026-11-20. Descartado.
- **PWA só para instalar (A):** pequeno, sem banco nem chaves novas. **[decidido]** Escolhido.
- **PWA com notificações (B):** tabela de inscrições (migração), chaves VAPID na Vercel, tela de ligar/desligar; no iPhone só com o app instalado e iOS 16.4+. Fica para depois.

## O que entra

- **Manifesto** (`app/manifest.ts`, convenção do Next 16.3): nome "Studio Heitor Macks", **[decidido]** nome curto **"SHM"**, `display: standalone`, `start_url: "/"` (a página inicial já leva cada perfil ao seu lugar), cores preto e branco do site.
- **Ícones** **[escolha minha]**: logo branco sobre fundo preto, gerados de `public/img/logo.png`: 192 e 512 px (Android, com versão "maskable" com margem) e 180 px para o iPhone (`apple-touch-icon`). Metadados do iPhone (`appleWebApp`) e `themeColor` no `app/layout.tsx`.
- **Faixa "Instale o app do estúdio"** **[escolha minha: só depois do login]**: no alto das áreas logadas (cliente, barbeiro, admin), só no celular e só quando o app não está instalado.
  - Android/Chrome: botão **Instalar** que abre o pedido de instalação do navegador (`beforeinstallprompt`). Se o navegador não oferecer, a faixa não aparece.
  - iPhone/Safari: texto com o caminho Compartilhar → "Adicionar à Tela de Início".
  - "Agora não" esconde a faixa naquele aparelho (guardado no navegador).
  - Some quando o app já está aberto instalado (`display-mode: standalone` / `navigator.standalone`).

## Fora do escopo

- Funcionamento sem internet / service worker com cache (agenda e horários precisam de dados atuais).
- Notificações no celular (parte B).
- Mudanças no banco, na API ou em variáveis da Vercel.

## O que não pode acontecer

- A faixa atrapalhar o uso no computador ou reaparecer depois de "Agora não".
- Quebrar o login ou o redirecionamento de `/`.

## Deixado para quem constrói

- Onde exatamente encaixar a faixa em cada moldura (painel do cliente, do barbeiro e do admin) e o visual dela, seguindo os componentes que já existem.
- Como gerar os ícones (script local com o que já houver no projeto, ex. `scripts/gerar-icones-email.mjs`).
