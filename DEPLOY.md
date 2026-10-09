# Colocando o PhotoShare em produção

Guia para publicar o PhotoShare num servidor próprio (VPS), com HTTPS,
backups e as obrigações legais básicas. Siga na ordem.

> **Aviso legal.** Os textos de `/termos` e `/privacidade` são **modelos**.
> Revise-os com um advogado antes de abrir o serviço ao público.

## 1. Servidor

- Uma VPS Linux (Ubuntu 24.04 LTS ou Debian 12), mínimo 2 vCPU e 4 GB de RAM.
  O disco precisa caber as fotos de todos os usuários **mais** os backups
  locais. Prefira um datacenter no Brasil: se for fora, isso é transferência
  internacional de dados e deve constar na Política de Privacidade (LGPD
  art. 33).
- Instale o Docker: <https://docs.docker.com/engine/install/>
- Crie um usuário sem ser root para operar, com acesso SSH **por chave**, e
  desative o login por senha no SSH.

### Firewall

Libere só o SSH, o HTTP e o HTTPS:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

O Postgres não publica porta, e o MinIO só escuta em `127.0.0.1`. Para
abrir o console do MinIO, use um túnel SSH:
`ssh -L 9001:localhost:9001 usuario@servidor` e acesse <http://localhost:9001>.

> O Docker escreve as próprias regras de iptables e ignora o `ufw` para
> portas publicadas. Por isso o `docker-compose.yml` publica para o mundo
> apenas as portas 80 e 443 do Caddy.

### Atualizações automáticas do sistema

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 2. Domínio

Crie um registro **A** (e **AAAA**, se tiver IPv6) apontando o domínio para o
IP do servidor, por exemplo `fotos.seudominio.com.br`. O Caddy só consegue
emitir o certificado depois que o DNS estiver propagado.

## 3. Configuração (`.env`)

```bash
git clone https://github.com/witorsodredev/Photoshare.git photoshare
cd photoshare
cp .env.example .env
chmod 600 .env
```

Preencha no `.env`:

| Variável | O que colocar |
| --- | --- |
| `JWT_SECRET`, `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD` | `openssl rand -hex 32`, um diferente para cada |
| `DOMAIN` | `fotos.seudominio.com.br` |
| `APP_URL` | `https://fotos.seudominio.com.br` |
| `LEGAL_*` | razão social, CNPJ, endereço, cidade do foro e e-mails de contato, privacidade e denúncias |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | crie em dash.cloudflare.com → Turnstile, com o seu domínio |
| `SMTP_*` | dados de um serviço de e-mail (Amazon SES, Resend, Brevo, Zoho…) |
| `BACKUP_REMOTE_*` | um bucket S3 em **outro provedor** (Backblaze B2, Wasabi, R2…) |

Para o SMTP, configure **SPF, DKIM e DMARC** do domínio no painel do
provedor de e-mail. Sem isso, as mensagens caem no spam.

## 4. Subir

```bash
docker compose up -d --build
docker compose ps                  # app deve ficar "healthy"
docker compose logs -f caddy       # acompanhe a emissão do certificado
```

Abra `https://SEU_DOMINIO/register` e crie **a sua conta primeiro**: a
primeira conta vira admin. Depois:

1. Confira o rodapé e as páginas `/termos`, `/privacidade` e `/denuncias`.
   Nenhum campo deve aparecer como **[não configurado]**.
2. Faça um cadastro de teste e aprove-o em **Usuários**.
3. Teste "Esqueci minha senha" para confirmar que o e-mail chega.
4. Rode um backup manual (seção 6).

## 5. Monitoramento

- **Disponibilidade:** cadastre `https://SEU_DOMINIO/api/health` num monitor
  externo (UptimeRobot, Better Stack ou Uptime Kuma em outro servidor). A
  rota responde `200` quando banco e storage estão ok, e `503` quando algo
  falha.
- **Logs:** `docker compose logs -f app`. Os logs são rotacionados (5 × 10 MB
  por serviço).
- **Disco:** acompanhe com `df -h` e `du -sh backups/`. Configure no monitor
  um alerta de disco acima de 80%.

## 6. Backups

O serviço `backup` roda todo dia às `BACKUP_HOUR` (UTC):

- `backups/db/photoshare-AAAAMMDD-HHMMSS.sql.gz`: dump do banco, guardado
  por `BACKUP_KEEP_DAYS` dias.
- `backups/photos/`: espelho do bucket de fotos.
- Com `BACKUP_REMOTE_*` preenchido, tudo isso é copiado também para o bucket
  externo. **Faça isso:** um backup só no mesmo servidor não protege contra
  perda do servidor.

```bash
docker compose run --rm backup once        # backup agora
docker compose logs backup                 # resultado dos backups diários
```

### Restaurar

```bash
docker compose stop app
docker compose run --rm --entrypoint restore.sh backup                 # mais recente
docker compose run --rm --entrypoint restore.sh backup db/photoshare-20261009-030000.sql.gz
docker compose start app
```

**Teste a restauração** pelo menos uma vez por trimestre, num servidor de
teste.

## 7. Atualizar a aplicação

```bash
docker compose run --rm backup once        # sempre faça backup antes
git pull
docker compose up -d --build
```

O schema do banco é atualizado automaticamente no start. De tempos em tempos,
rode `npm audit --omit=dev` e atualize as dependências com correções de
segurança.

## 8. Rotina de operação (LGPD / Marco Civil)

| Quando | O quê |
| --- | --- |
| Diário | Ver **Usuários** (aprovações) e **Denúncias**. Conteúdo íntimo sem consentimento deve sair do ar assim que confirmado (Marco Civil, art. 21). Conteúdo envolvendo crianças: retire e comunique às autoridades. |
| Em até 15 dias | Responder pedidos de titulares que chegarem no e-mail de privacidade (acesso, correção, exclusão). O próprio usuário consegue exportar e excluir a conta sozinho. |
| Incidente de segurança | Conter, registrar o que aconteceu e comunicar a ANPD e os titulares afetados, se houver risco relevante. Prazo da Resolução CD/ANPD nº 15/2024: 3 dias úteis. |
| Ordem judicial | Registros de acesso: tabela `AccessLog` (IP, data/hora, evento), guardada por 190 dias. Forneça apenas mediante ordem judicial (Marco Civil, arts. 10 e 15). |
| Mudança nos textos legais | Atualize `TERMS_VERSION` em `src/lib/legal.ts` e avise os usuários. |

### Consultar registros de acesso (ordem judicial)

```bash
docker compose exec db psql -U photoshare -c \
  "select \"createdAt\", event, ip, \"userAgent\" from \"AccessLog\"
   where email = 'usuario@exemplo.com' order by \"createdAt\";"
```

## 9. Se algo der errado

| Sintoma | Causa provável |
| --- | --- |
| Caddy não emite o certificado | DNS ainda não aponta para o servidor, ou as portas 80/443 estão bloqueadas |
| `app` fica "unhealthy" | `docker compose logs app`; normalmente é senha do banco/MinIO divergente do `.env` |
| E-mails não chegam | Dados `SMTP_*` errados, ou SPF/DKIM ausentes (vão para o spam) |
| Admin bloqueado por senhas erradas | `docker compose exec app node prisma/unlock-user.mjs email@admin` |
| Muitos "Muitas tentativas a partir desta rede" | Usuários atrás do mesmo IP (empresa, faculdade); ajuste `LIMITS` em `src/lib/ratelimit.ts` |
