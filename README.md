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

## Stack

| Camada     | Tecnologia                                   |
| ---------- | -------------------------------------------- |
| App        | Next.js 14 (App Router) + React + Tailwind   |
| Banco      | PostgreSQL + Prisma                          |
| Storage    | MinIO (S3-compatível)                        |
| Auth       | Sessão JWT em cookie httpOnly (bcrypt)       |
| Imagens    | sharp (derivados), archiver (zip)            |

## Rodar com Podman

Pré-requisitos: `podman` + `podman-compose` **ou** `podman compose` (Podman 4.4+).

```bash
cd photoshare

# crie o .env e coloque nele um segredo de sessão (JWT_SECRET)
cp .env.example .env
openssl rand -hex 32         # cole o resultado em JWT_SECRET no .env

# subir tudo (app, postgres, minio)
podman compose up -d --build
#   ou:  podman-compose up -d --build
```

Acesse:

- App: <http://localhost:3000>
- Console do MinIO: <http://localhost:9001> (`minioadmin` / `minioadmin`)

O schema do banco é aplicado automaticamente no start (`prisma db push`) e o
bucket `photos` é criado pelo serviço `createbuckets`.

Parar / limpar:

```bash
podman compose down          # mantém os volumes (fotos + banco)
podman compose down -v       # apaga tudo
```

### Docker

Os mesmos comandos funcionam com `docker compose up -d --build`.

## Desenvolvimento local (sem container)

```bash
cp .env.example .env         # ajuste se necessário
# suba só a infra:
podman compose up -d db minio createbuckets

npm install
npm run db:push
npm run dev                  # http://localhost:3000
```

## Usuários, aprovação e cota

- A **primeira conta** criada vira **admin** (ativa, sem limite de espaço).
  Em instalações que já tinham contas, a mais antiga é promovida a admin no
  start do container.
- Os cadastros seguintes ficam **pendentes**: a pessoa vê "aguardando
  aprovação" e não consegue entrar até ser aprovada.
- O admin gerencia tudo em **Usuários** (`/workspace/admin`): aprovar/recusar,
  desativar/reativar e definir a cota de cada conta (em GB, ou ilimitada).
- Desativar uma conta derruba as sessões dela na hora e tira do ar os links
  públicos dos álbuns dela (voltam se a conta for reativada).
- A cota conta o tamanho dos **originais** (miniaturas não entram). Upload que
  passaria do limite é recusado com HTTP 413. O uso aparece no topo do
  workspace.
- **Proteção contra força bruta:** após **5 senhas erradas seguidas** a conta
  é bloqueada (mesmo com a senha certa depois) e só o admin desbloqueia, em
  **Usuários → Desbloquear**. Acertar a senha antes do limite zera o contador.
  Se a conta bloqueada for a do próprio admin:
  `docker compose exec app node prisma/unlock-user.mjs <email>`
- Cota padrão para novos cadastros: `DEFAULT_STORAGE_QUOTA_MB` no
  `docker-compose.yml` (padrão 10240 = 10 GB; `0` = ilimitada).

## Fluxo de uso

1. Criar conta em `/register` → após aprovação do admin, cai no workspace.
2. **Novo álbum** → abre a página do álbum.
3. Arrastar fotos para a área de upload (enviadas uma a uma, resolução intacta).
4. Ativar **Link público** → copiar o link `/a/<token>`.
5. Cliente abre o link, navega no lightbox, baixa foto a foto ou o `.zip`.
6. Desmarcar **Link público** revoga o acesso; **Apagar álbum** remove tudo
   (banco + storage).

## Notas / limites

- O upload passa por `request.formData()`, que carrega o arquivo em memória
  durante o processamento. Para originais muito grandes (RAW de centenas de MB)
  ajuste os recursos do container `app` ou troque por upload direto ao S3
  com URL pré-assinada.
- Cookies de sessão usam `Secure` só quando `COOKIE_SECURE=true` — ligue isso
  ao servir por HTTPS atrás de um proxy.
- Defina `NEXT_PUBLIC_APP_URL` com o domínio público para os links de
  compartilhamento saírem corretos (senão usa o host da requisição).
- Formatos que o `sharp` não decodifica ainda são armazenados e podem ser
  baixados; só não geram miniatura.

## Estrutura

```
src/
  app/
    page.tsx                    landing
    login/  register/           auth
    workspace/                  área logada (álbuns + gestão)
    a/[token]/                  visualização pública do álbum
    api/
      auth/                     register / login / logout
      albums/                   CRUD + upload + zip
      photos/[id]/              delete
      image/[id]/               thumb | preview | full  (proxy do storage)
      download/[id]/            bytes originais (attachment)
      public/[token]/           JSON + zip do álbum público
  components/                   UI client (upload, lightbox, galeria…)
  lib/                          prisma, auth, s3, images, zip, util
prisma/schema.prisma
```
