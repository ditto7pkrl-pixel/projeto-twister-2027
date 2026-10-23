# Projeto Twister 2027

Aplicativo web instalável (PWA) para Ditto, Jm e Júlio, com meta de R$ 11.000 por pessoa, depósitos sincronizados, histórico editável e ranking semanal.

## O que já está implementado

- Login por e-mail e senha com Firebase Authentication.
- Sincronização em tempo real com Cloud Firestore.
- Cada participante só pode criar, editar e excluir os próprios depósitos.
- Todos os participantes autenticados podem ver o histórico coletivo e o ranking.
- Data do depósito editável e horário de criação salvo pelo servidor.
- Resumo individual, resumo do grupo e ranking de segunda a domingo.
- Interface responsiva em tema escuro, banner visual gerado para o Projeto Twister 2027, fotos individuais das motos e manifest/service worker para instalação como app web.

## Identidade visual incluída\n\n- Banner do Projeto Twister 2027 em `assets/twister-banner.jpg`.\n- Ditto usa o recorte da moto preta à direita (`assets/ditto-moto.jpg`).\n- Jm usa a moto vermelha do meio (`assets/jm-moto.jpg`).\n- Júlio usa a moto da esquerda (`assets/julio-moto.jpg`).\n\n## Antes de usar

Este projeto ainda precisa ser conectado ao SEU projeto Firebase e publicado num serviço de hospedagem. Não existe um link público até concluir esses passos. Nunca coloque uma chave de conta de serviço ou senha administrativa no código.

## Passo 1 — Criar o Firebase

1. Acesse https://console.firebase.google.com/ e crie um projeto chamado `Projeto Twister 2027`.
2. Adicione um aplicativo Web (`</>`), registre-o e copie a configuração Firebase.
3. Abra `app.js` e substitua os valores `COLOQUE_...` no objeto `firebaseConfig` pelos valores fornecidos pelo Firebase.
4. Em **Authentication → Sign-in method**, ative **Email/Password**.
5. Em **Authentication → Users**, crie três contas, uma para cada participante. Combine os e-mails e senhas diretamente com cada pessoa. Não compartilhe senhas entre vocês.
6. Em **Firestore Database**, crie um banco de dados em modo de produção.

## Passo 2 — Criar os perfis dos três participantes

Depois de criar cada conta no Authentication, copie o UID de cada usuário. No Firestore, crie uma coleção chamada `participants` com um documento cujo ID seja exatamente o UID de cada conta.

Campos de cada documento:
- `name` (string): `Ditto`, `Jm` ou `Júlio`
- `initialBalance` (number): saldo inicial guardado antes dos novos registros

Exemplo:
- documento `UID_DO_DITTO`: `{ "name": "Ditto", "initialBalance": 967 }`
- documento `UID_DO_JM`: `{ "name": "Jm", "initialBalance": 0 }`
- documento `UID_DO_JULIO`: `{ "name": "Júlio", "initialBalance": 0 }`

R$ 967 é o saldo anterior mencionado para Ditto. Os valores zero de Jm e Júlio são provisórios: confirme os saldos reais antes de começar. Os saldos iniciais não são depósitos e não entram no ranking semanal.

## Passo 3 — Aplicar as regras de segurança

No Firebase Console, abra **Firestore Database → Rules**, substitua as regras pelo conteúdo de `firestore.rules` e publique.

As regras permitem que usuários autenticados vejam os registros da equipe, mas só alterem/excluam depósitos cujo `ownerUid` corresponda ao seu UID. Os perfis e saldos iniciais precisam ser administrados pelo console.

## Passo 4 — Publicar na web

Opção simples: Netlify Drop.
1. Acesse https://app.netlify.com/drop
2. Arraste a pasta do projeto (ou publique os arquivos por um repositório Git, conforme a interface atual do Netlify).
3. Aguarde a publicação e copie o endereço HTTPS gerado.
4. No Firebase Console, em **Authentication → Settings → Authorized domains**, adicione o domínio do site publicado se ele não estiver listado.
5. Abra o link e teste os três acessos.

Você também pode publicar por GitHub Pages, Vercel ou Firebase Hosting. Para uma PWA, use HTTPS.

## Passo 5 — Instalar no iPhone

1. Abra o link no Safari.
2. Toque em Compartilhar.
3. Escolha **Adicionar à Tela de Início**.
4. Repita em cada celular.

## Como funciona a semana

- A semana vai de segunda a domingo, pelo calendário local do dispositivo.
- O ranking soma apenas depósitos com data dentro da semana atual.
- O saldo individual inclui saldo inicial + todos os depósitos.
- O histórico mostra a data escolhida para o depósito e o horário de criação gravado pelo servidor.
- Ao editar ou excluir um depósito, totais e ranking são recalculados automaticamente.

## Testes antes de compartilhar

- Entrar com cada conta em dispositivos/navegadores diferentes.
- Registrar um depósito de teste em cada conta e confirmar que aparece em tempo real.
- Confirmar que cada pessoa só vê os botões Editar/Excluir nos próprios depósitos.
- Testar edição, exclusão, ranking e metas.
- Conferir os saldos iniciais e o domínio autorizado.

## Limitações conhecidas

- A interface atual edita registros por caixas de diálogo simples do navegador.
- O projeto não movimenta dinheiro, não acessa bancos e depende de internet para sincronização.
- O service worker armazena a estrutura básica para carregamento, mas não faz edição offline.
- O horário de criação é salvo pelo servidor Firebase; a data do depósito pode ser corrigida manualmente.
- Antes de usar com dados reais, teste cuidadosamente as regras e mantenha o projeto Firebase sob controle de um administrador confiável.
