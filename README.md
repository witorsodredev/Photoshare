# PhotoShare

Plataforma auto-hospedada para fotógrafos profissionais entregarem ensaios:

- **Login + workspace por usuário** — cada fotógrafo tem sua área isolada.
- **Álbuns** — crie, edite, apague; upload por drag-and-drop.
- **Link compartilhável por álbum** — público sob demanda, revogável, com opção
  de permitir/bloquear download.
- **Qualidade original preservada** — os bytes enviados são gravados no
  storage sem nenhuma recompressão. As miniaturas/preview são derivados
  separados (WebP) usados só para exibição.
- **Aprovação de cadastro + cota por usuário** — novas contas ficam pendentes
  até um admin aprovar; cada usuário tem um limite de armazenamento.
- **Download** — foto a foto (bytes originais) ou o álbum inteiro em `.zip`
  (sem compressão, arquivos intactos).
- **Pronto para produção** — HTTPS automático, captcha, limites por IP,
  backups diários, LGPD (exportar/excluir conta) e Marco Civil (registros de
  acesso, denúncias e remoção de conteúdo).

Para colocar no ar, siga o **[DEPLOY.md](DEPLOY.md)**.

## Stack

| Camada     | Tecnologia                                         |
| ---------- | -------------------------------------------------- |
| App        | Next.js 16 (App Router) + React 19 + Tailwind      |
| Banco      | PostgreSQL 16 + Prisma                             |
| Storage    | MinIO (S3-compatível)                              |
| Proxy      | Caddy (HTTPS com Let's Encrypt automático)         |
| Auth       | Sessão JWT em cookie httpOnly (bcrypt)             |
| Anti-robô  | Cloudflare Turnstile (opcional)                    |
| E-mail     | SMTP via nodemailer (opcional)                     |
| Imagens    | sharp (derivados), archiver (zip)                  |

## Rodar localmente (Docker ou Podman)

```bash
cp .env.example .env
# preencha JWT_SECRET, POSTGRES_PASSWORD e MINIO_ROOT_PASSWORD
# (cada um: openssl rand -hex 32)

docker compose up -d --build      # ou: podman compose up -d --build
```

- App: <https://localhost> (certificado local do Caddy — o navegador avisa;
  aceite para continuar)
- Console do MinIO: <http://localhost:9001> (`MINIO_ROOT_USER` /
  `MINIO_ROOT_PASSWORD` do `.env`)

O schema do banco é aplicado automaticamente no start (`prisma db push`) e o
bucket `photos` é criado pelo serviço `createbuckets`.

```bash
docker compose down          # para, mantendo fotos e banco
docker compose down -v       # apaga tudo
```

### Desenvolvimento sem container

```bash
docker compose up -d db minio createbuckets   # só a infra
npm install
npm run db:push
npm run dev                                   # http://localhost:3000
```

Para isso, publique a porta do Postgres (`5432`) e ajuste `DATABASE_URL` e
`S3_*` no fim do `.env`.

## Usuários, aprovação e cota

- A **primeira conta** criada vira **admin** (ativa, sem limite de espaço).
  Em instalações que já tinham contas, a mais antiga é promovida a admin no
  start do container.
- Os cadastros seguintes ficam **pendentes** até o admin aprovar em
  **Usuários** (`/workspace/admin`). Com SMTP configurado, a pessoa também
  precisa confirmar o e-mail.
- Em **Usuários** o admin aprova/recusa, desativa/reativa, desbloqueia,
  define a cota (GB ou ilimitada), promove outros admins, gera link de nova
  senha e exclui contas.
- Desativar uma conta derruba as sessões dela na hora e tira do ar os links
  públicos dos álbuns dela.
- A cota conta o tamanho dos **originais**. Upload que passaria do limite, ou
  maior que `MAX_UPLOAD_MB`, é recusado com HTTP 413.

## Segurança

- **Força bruta:** após **5 senhas erradas seguidas** a conta é bloqueada e
  só o admin desbloqueia. Além disso, cada IP tem limite de tentativas de
  login (10 a cada 15 min), cadastro, "esqueci a senha" e denúncias.
  Se a conta bloqueada for a do próprio admin:
  `docker compose exec app node prisma/unlock-user.mjs <email>`
- **Captcha** (Turnstile) em login, cadastro, "esqueci a senha" e denúncias,
  quando `TURNSTILE_*` está no `.env`.
- **Validação estrita** de nome, e-mail e senha no cadastro.
- **Trocar ou redefinir a senha** encerra as sessões em todos os aparelhos.
- **Headers:** CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy.
- Redefinição de senha: por e-mail (com SMTP) ou por link gerado pelo admin.

## LGPD e Marco Civil

- **Minha conta** (`/workspace/conta`): trocar senha, baixar todos os dados
  (`.zip` com `dados.json` + fotos originais) e excluir a conta (apaga banco e
  storage).
- **Aceite** dos Termos e da Política no cadastro, com versão e data gravadas.
- **Registros de acesso** (IP, data/hora, navegador) de login, cadastro etc.,
  guardados por `ACCESS_LOG_RETENTION_DAYS` (padrão 190 dias ≥ 6 meses, art.
  15 do Marco Civil) e apagados depois — inclusive de contas excluídas.
- **Denúncias:** botão em todo álbum público e página `/denuncias`. O admin
  vê a fila em **Denúncias** e pode retirar o álbum do ar (art. 21).
- **Páginas legais:** `/termos`, `/privacidade`, `/denuncias` e rodapé com a
  identificação do responsável (`LEGAL_*` no `.env`). **Os textos são
  modelos — revise com um advogado antes de publicar.**

## Fluxo de uso

1. Criar conta em `/register` → após aprovação do admin, cai no workspace.
2. **Novo álbum** → abre a página do álbum.
3. Arrastar fotos para a área de upload (enviadas uma a uma, resolução intacta).
4. Ativar **Link público** → copiar o link `/a/<token>`.
5. Cliente abre o link, navega no lightbox, baixa foto a foto ou o `.zip`.
6. Desmarcar **Link público** revoga o acesso; **Apagar álbum** remove tudo
   (banco + storage).

## Notas / limites

- O upload passa por `request.formData()`, que carrega o arquivo em memória.
  O tamanho máximo é `MAX_UPLOAD_MB` (padrão 200 MB); para RAW maiores,
  aumente a memória do container `app` ou troque por upload direto ao S3.
- O limite por IP fica em memória: vale para **um** container `app` (o
  padrão). Para várias réplicas, mova-o para Redis.
- Formatos que o `sharp` não decodifica ainda são armazenados e podem ser
  baixados; só não geram miniatura.

## Estrutura

```
src/
  app/
    page.tsx                    landing
    login/ register/            auth
    esqueci-senha/ redefinir-senha/ verificar-email/
    termos/ privacidade/ denuncias/   páginas legais
    workspace/                  área logada (álbuns, conta, admin)
    a/[token]/                  visualização pública do álbum
    api/
      auth/                     register / login / logout / senha / e-mail
      account/                  exportar dados, excluir conta, trocar senha
      admin/                    usuários, denúncias, moderação de álbuns
      albums/                   CRUD + upload + zip
      photos/[id]/              delete
      image/[id]/               thumb | preview | full  (proxy do storage)
      download/[id]/            bytes originais (attachment)
      public/[token]/           JSON + zip + denúncia do álbum público
      health/                   healthcheck (banco + storage)
  components/                   UI client
  lib/                          auth, validação, captcha, e-mail, rate limit,
                                auditoria, s3, imagens, zip…
prisma/                         schema + scripts (bootstrap, desbloqueio)
backup/                         imagem e scripts de backup/restauração
Caddyfile                       proxy HTTPS
```
