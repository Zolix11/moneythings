# Running on the Pi

Ghostfolio beside fitcoach on the Raspberry Pi 3, reachable only over Tailscale
at https://raspberrypi.tailfca142.ts.net:8443.

## Memory

The Pi has ~350 MB free with fitcoach running. Ghostfolio adds one Node
process (heap capped at 256 MB) and a 32 MB Redis; Postgres is shared with
fitcoach. Check after the first start:

```bash
docker stats --no-stream; free -m
```

If it swaps hard, the next lever is moving one of the two apps off the Pi.

## First install

```bash
rsync -a deploy/ zolix@192.168.10.236:~/ghostfolio/
ssh zolix@192.168.10.236
cd ~/ghostfolio && cp .env.example .env && chmod 600 .env   # fill in the secrets
```

Create the role and database in fitcoach's Postgres, once, with the same
password you put in `DATABASE_URL`:

```bash
docker exec -it fitcoach-db-1 psql -U fitcoach -d fitcoach \
  -c "CREATE ROLE ghostfolio LOGIN PASSWORD 'CHANGE_ME';" \
  -c "CREATE DATABASE ghostfolio OWNER ghostfolio;"
```

(`docker ps` shows the real container name if it differs.)

```bash
docker compose up -d
docker compose logs -f ghostfolio    # migrations run on first start, then "Listening"
sudo tailscale serve --bg --https=8443 3333
```

Port 443 stays fitcoach's. Never `tailscale funnel` on this node: it exposed
the whole node once (see fitcoach's CLAUDE.md).

## Two accounts

No code needed, Ghostfolio is multi-user:

1. Open the site, **Get Started**, save the security token in a password
   manager. The first account is the admin.
2. Your friend does the same from their device.
3. Admin Control → Settings → turn off **User Signup**.

## Sharing with the friend

Share the Pi from the Tailscale admin console (Machines → raspberrypi → Share)
to their Tailscale account. Then restrict shared users to Ghostfolio's port so
fitcoach's login-less dashboard stays yours. In Access Controls, replace the
default allow-all with:

```json
"hosts": { "pi": "100.77.41.46" },
"grants": [
  { "src": ["autogroup:member"], "dst": ["*"], "ip": ["*"] },
  { "src": ["autogroup:shared"], "dst": ["pi"], "ip": ["tcp:8443"] }
]
```

Verify from their device: `:8443` loads, `https://raspberrypi.tailfca142.ts.net`
(fitcoach) must not.

## Updating

Bump the image tag in `docker-compose.yml`, then `docker compose pull && docker compose up -d`.
Back up first: `docker exec fitcoach-db-1 pg_dump -U fitcoach ghostfolio | gzip > ~/ghostfolio-$(date +%F).sql.gz`.
