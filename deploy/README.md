# Running on the Pi

Ghostfolio beside fitcoach on the Raspberry Pi 3, reachable only over Tailscale
at https://raspberrypi.tailfca142.ts.net:8443.

## Memory — on hold

Measured on the Mac (arm64, 1 Nov 2026): the app idles at ~355 MB, and with
`--max-old-space-size=256` it died with "heap out of memory" the moment the
first Yahoo security started gathering history. The Pi 3 has ~350 MB free
next to fitcoach, so this setup doesn't fit there. It runs on the Mac for now
(`deploy/local/`); these files stay for a bigger host. Drop the heap cap there.

## Building the image

The Pi can't build Ghostfolio, so build on the Mac (also arm64) and ship the
file. Don't pipe `docker save` into `ssh` — the Wi-Fi drops it (fitcoach's
CLAUDE.md).

```bash
docker build --platform linux/arm64 -t moneythings:latest .
docker save moneythings:latest | gzip > /tmp/moneythings.tar.gz
rsync -P /tmp/moneythings.tar.gz zolix@192.168.10.236:/tmp/
ssh zolix@192.168.10.236 'gunzip -c /tmp/moneythings.tar.gz | docker load'
# both must print the same id
docker image inspect -f '{{.Id}}' moneythings:latest
ssh zolix@192.168.10.236 "docker image inspect -f '{{.Id}}' moneythings:latest"
```

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

## TBSZ and Hungarian securities

- **TBSZ:** one Ghostfolio account per TBSZ. Set its collection year
  (gyűjtőév) in the account dialog. The accounts list shows when it turns
  tax-free (end of the 5th year after the collection year).
- **Állampapír:** search for MÁP+, FixMÁP, BMÁP, PMÁP, EMÁP, Babakötvény
  or KTJ when adding an activity (or `GF_` to list them all). Enter the nominal value as the quantity at
  unit price 1, and interest as an Interest activity (MÁP+ capitalisation:
  a Buy at 1). DKJ and MÁK aren't included: they trade at market prices.

## Updating

Merge upstream (`git fetch upstream && git merge upstream/main`), rebuild and
ship the image as above, then on the Pi: `docker compose up -d --force-recreate`.
Back up first: `docker exec fitcoach-db-1 pg_dump -U fitcoach ghostfolio | gzip > ~/ghostfolio-$(date +%F).sql.gz`.
