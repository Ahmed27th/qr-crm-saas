# OpenWA (wa-automate) — Local Development

This project integrates [OpenWA](https://github.com/open-wa/wa-automate) to bridge WhatsApp messages with our Convex backend. Below is how to run the service locally.

---

## Prerequisites

- **Docker Desktop** installed and running ([download](https://www.docker.com/products/docker-desktop/))
- `npx convex dev` running in another terminal (so `VITE_CONVEX_SITE_URL` is populated in `.env.local`)
- Git Bash, WSL, or a Unix-like shell on Windows to execute the script

---

## Quick Start

```bash
# 1. Make the script executable
chmod +x run-openwa.sh

# 2. Launch OpenWA (keep this terminal open)
./run-openwa.sh
```

On first run, the script will:
1. Read `VITE_CONVEX_SITE_URL` from `.env.local`
2. Derive the webhook URL (`https://<project>.convex.site/whatsapp-webhook`)
3. Pull the `openwa/wa-automate` Docker image
4. Print a **QR code** in the terminal

---

## Link a WhatsApp Device

1. Open **WhatsApp** on your phone
2. Tap the three dots (⋮) → **Linked devices** → **Link a device**
3. Scan the QR code printed in the terminal
4. The terminal shows a "Client is ready!" message once linked

> The session persists under the ID `test_restaurant_123`. To use a different session, set the `OPENWA_SESSION_ID` environment variable before running the script:
>
> ```bash
> export OPENWA_SESSION_ID=my_restaurant_prod
> ./run-openwa.sh
> ```

---

## Verify Webhook Delivery

Once a device is linked, send a WhatsApp message to the linked number. The OpenWA container POSTs the message payload to your Convex HTTP route at `/whatsapp-webhook`.

To verify delivery:

1. Keep both `npx convex dev` and `./run-openwa.sh` running
2. Send a message from another phone to the linked WhatsApp number
3. Watch the `npx convex dev` terminal — you should see incoming HTTP request logs

Alternatively, check the OpenWA container logs:

```bash
# In a separate terminal, tail the container output:
docker logs --tail 50 -f openwa-wa-automate
```

> If you see **no logs**, confirm the webhook endpoint (`convex/http.ts`) registers a `POST` handler at `/whatsapp-webhook` and is deployed:
> ```bash
> npx convex deploy
> ```

---

## Environment Variables

### Local (`.env.local`) — auto-appended by the script

| Variable | Purpose | Default |
|---|---|---|
| `OPENWA_API_URL` | Base URL of the local OpenWA container | `http://localhost:8080` |
| `OPENWA_API_KEY` | API key required by OpenWA endpoints | `local_dev_secret_key_2026` |
| `OPENWA_WEBHOOK_SECRET` | Shared secret for webhook payload verification | `local_dev_secret_key_2026` |

### Convex Production (set via `npx convex env`)

To replicate these keys in your live Convex deployment, run **each** of these commands:

```bash
npx convex env set OPENWA_API_URL "https://your-production-openwa.example.com"
npx convex env set OPENWA_API_KEY "<your-real-api-key>"
npx convex env set OPENWA_WEBHOOK_SECRET "<your-real-webhook-secret>"
```

These will be available as `process.env.OPENWA_API_URL` (etc.) inside Convex HTTP actions and mutations.

---

## Troubleshooting

| Symptom | Likely Fix |
|---|---|
| `docker: command not found` | Install Docker Desktop and ensure it's on your PATH |
| `VITE_CONVEX_SITE_URL is not set` | Run `npx convex dev` first so `.env.local` is generated |
| `port is already allocated` | Stop other containers using port 8080: `docker stop $(docker ps -q)` |
| QR code doesn't appear | Add `--disable-spins` (already included in the script) |
| Webhook never fires | Confirm `convex/http.ts` has a `POST /whatsapp-webhook` route and is deployed |
| "Session already exists" error | Delete the local session file or use a different `--session-id` |

---

## Reference

- [OpenWA wa-automate docs](https://docs.openwa.dev/)
- [Convex HTTP routes](https://docs.convex.dev/functions/http-routes)
