# Live E2E browser

Engineering users can watch a selected Playwright workflow directly in the Vercel-hosted production UI. Chromium and the streaming stack run on the AWS backend.

## How it works

Engineering → select `WF-NNN` → backend starts headed Chromium → Xvfb renders it → x11vnc captures it → noVNC streams it → Engineering embeds the live screen.

Only one workflow runs at a time. Each run receives a random viewer token. The WebSocket proxy accepts that token only while the matching workflow is running.

Raw VNC (`5900`) and noVNC (`6080`) bind to AWS-container loopback and are never published by Docker. The only public path is the AWS application proxy at `/api/system/dev/e2e/viewer/ws`.

The frontend resolves the viewer URL through `VITE_API_BASE_URL`, so the iframe loads from the public AWS API origin rather than from Vercel. The viewer then opens its WebSocket against that same AWS origin.

## Start

Live viewing is enabled by default in the root Compose deployment:

```bash
docker compose up -d --build backend
```

Deploy the updated Vercel frontend, then open **Engineering → E2E Flows**, choose a workflow, and watch the **Live browser** panel.

Disable the display stack when it is not wanted:

```bash
E2E_LIVE_VIEW_ENABLED=false docker compose up -d --build backend
```

## Environment

- `E2E_LIVE_VIEW_ENABLED`: enables Xvfb, VNC capture, the viewer token, and headed Playwright. Default: `true` in Compose.
- `E2E_DISPLAY`: virtual X display. Default: `:99`.
- `E2E_SCREEN_GEOMETRY`: screen resolution and depth. Default: `1440x900x24`.
- `E2E_NOVNC_INTERNAL_PORT`: internal WebSocket bridge port. Default: `6080`.
- `E2E_SLOW_MO_MS`: optional delay between Playwright operations for easier viewing.
- `E2E_VIEWER_FRAME_ANCESTORS`: CSP origins allowed to embed the AWS viewer. Default permits same-origin and HTTPS Vercel deployments. Set this to the exact production frontend origin when possible.

The AWS load balancer or reverse proxy must forward WebSocket upgrades for `/api/system/dev/e2e/viewer/ws`. Vercel does not proxy this stream; it embeds the AWS viewer directly.

The viewer is read-only. Tokens are random, per-run, removed from browser history, never written to runner output, and invalidated when the run stops.
