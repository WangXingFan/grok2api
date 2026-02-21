# Grok2API (Fork)

[中文](../README.md) | **English**

> [!NOTE]
> This project is a fork of [chenyme/grok2api](https://github.com/chenyme/grok2api), with multiple enhanced features added to the admin dashboard and public playground.
>
> This project is for learning and research only. You must comply with Grok's Terms of Use and applicable laws. Do not use it for illegal purposes.

Grok2API rebuilt with **FastAPI**, fully aligned with the latest web call format. Supports streaming and non-streaming chat, image generation/editing, video generation, deep thinking, token pool concurrency, and automatic load balancing.

<br>

## New Features (Fork)

### Chat Page

A new **Chat** page (`/chat`) has been added to the Playground section, providing a visual conversational interface.

- Streaming / non-streaming output
- Conversation history
- Multi-model switching

---

### Imagine Image Generation / Editing

A new **Image Editing** mode has been added to the **Imagine** page (`/imagine`) in the Playground section.

| Mode | Description |
| :--- | :--- |
| **Generate Mode** | Generate images from scratch using prompts (original feature) |
| **Edit Mode** | Upload a reference image + prompt for AI-based image editing |

**Edit Mode Features**:

- One-click toggle between Generate / Edit mode
- Drag-and-drop or click to upload a reference image (max 50MB)
- Image preview and removal
- Calls `/v1/images/edits` endpoint, model `grok-imagine-1.0-edit`

**Waterfall Enhancements**:

- Real-time image status labels (Generating / Done / Failed)
- Configurable image filter threshold (loaded from server config)
- HTTP URL and Base64 image format support
- Client-side NSFW parameter control

<img width="518" height="790" alt="image" src="https://github.com/user-attachments/assets/7e1b975c-4c73-454b-91e4-4c5ce2e940fb" />

---

### Video Generation Page

The **Video Generation** page (`/video`) in the Playground section provides a visual interface for video generation.

**Dual Mode Support**:

| Mode | Description |
| :--- | :--- |
| **Single Video Mode** | Generate one video at a time, ideal for fine-tuning parameters and preview |
| **Waterfall Mode** | Batch continuous generation with concurrency control (1-3 concurrent), auto-scroll, auto-download |

**Features**:

- Prompt input with `Ctrl+Enter` shortcut
- **Image-to-Video**: Upload a reference image to generate video based on image content (both Single and Waterfall modes supported)
- Adjustable parameters:
  - Aspect ratio: `16:9` / `9:16` / `1:1` / `2:3` / `3:2`
  - Video length: `6s` / `10s` / `15s`
  - Resolution: `480p` / `720p`
  - Style preset: `Custom` / `Normal` / `Fun` / `Spicy`
- Stream / non-stream output toggle
- Real-time generation status with parameter sync
- Video player preview (supports both URL and HTML response formats)
- Generation history (local storage, click to replay, per-item deletion)
- **Waterfall Mode Exclusive**:
  - Concurrency control (1/2/3 concurrent generations)
  - Auto-scroll to latest video
  - Auto-download completed videos
  - Batch select, download, and delete
  - Lightbox preview (keyboard left/right navigation)
  - Graceful stop: waits for in-progress videos to finish instead of interrupting

<img width="819" height="859" alt="image" src="https://github.com/user-attachments/assets/4b88bf6b-9cd2-44e4-bed9-be77c173dd41" />
<img width="890" height="845" alt="image" src="https://github.com/user-attachments/assets/e30d79be-dc7e-466d-b7a8-6c13f667f19b" />

---

### Token Management Enhancement

- New **"Refresh All"** button: one-click refresh of all Token statuses without manual selection

---

### Cache Management Enhancement

- New **Batch Download**: select multiple local image/video files and click the "Download" button to get a single ZIP archive (`ZIP_STORED`, no compression overhead); selecting only 1 file downloads it directly without zipping
- New **Single File Download**: a download icon has been added to each file row for quick single-file download
- New **Inline Video Preview**: built-in video player in the cache management page, click to play directly without opening a new tab
- New **Inline Image Preview**: opening an image link in the browser displays it directly instead of triggering a download

<br>

## Architecture Changes (v1.5.0)

Compared to the previous version, v1.5.0 includes the following architectural improvements:

### Module Separation

- **API Route Splitting**: Admin API split from a single `admin.py` (1900+ lines) into separate modules: `admin_api/config.py`, `admin_api/token.py`, `admin_api/cache.py`
- **Public API Module**: New `public_api/` module with `imagine.py`, `video.py`, `voice.py` as independent endpoints
- **Page Route Separation**: New `app/api/pages/` module, separating HTML page serving from API routes (`admin.py` + `public.py`)

### Static Asset Restructuring

```
# Old structure (flat)
app/static/imagine/imagine.{html,js,css}
app/static/video/video.{html,js,css}

# New structure (layered)
app/static/public/pages/{chat,imagine,video,voice,login}.html
app/static/public/js/{chat,imagine,video}.js
app/static/public/css/{chat,imagine,video}.css
app/static/admin/pages/{login,token,config,cache}.html
app/static/admin/js/{token,cache}.js
app/static/admin/css/{token,cache}.css
app/static/common/{html,js,css,img}/          # Shared resources
```

### Authentication Refactoring

- **Removed `SITE_MODE` environment variable**, replaced with config field `app.public_enabled` (toggle via admin panel without restart)
- **New `public_key` config**: independent auth key for Public mode, separate from `api_key`
- **Three-tier authentication**:
  - `verify_app_key` — Admin panel auth (`app_key`)
  - `verify_api_key_if_private` — API auth, auto-bypass when `public_enabled=true`
  - `verify_public_key` — Public API auth (`public_key`, optional)

<br>

## Deployment

### Docker Compose

```bash
git clone https://github.com/WangXingFan/grok2api.git

cd grok2api

docker compose up -d
```

> To update the image:
> ```bash
> docker compose pull && docker compose up -d
> ```
>
> To build from source instead:
> ```bash
> docker compose up -d --build
> ```

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/WangXingFan/grok2api)

> You must set `DATA_DIR=/tmp/data` and disable file logging `LOG_FILE_ENABLED=false`.
>
> For persistence, use MySQL / Redis / PostgreSQL by setting `SERVER_STORAGE_TYPE` (mysql/redis/pgsql) and `SERVER_STORAGE_URL` in Vercel environment variables.

### Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/WangXingFan/grok2api)

> Render free instances sleep after 15 minutes of inactivity. Data will be lost on restart/redeploy.
>
> For persistence, use MySQL / Redis / PostgreSQL by setting `SERVER_STORAGE_TYPE` (mysql/redis/pgsql) and `SERVER_STORAGE_URL` in Render environment variables.

### Environment Variables

Configure in the `environment` section of `docker-compose.yml`:

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `LOG_LEVEL` | Log level | `INFO` | `DEBUG` |
| `LOG_FILE_ENABLED` | Enable file logging | `true` | `false` |
| `LOG_DIR` | Log directory | `./logs` | `/var/log/grok2api` |
| `DATA_DIR` | Data directory (config/tokens/locks) | `./data` | `/data` |
| `SERVER_HOST` | Bind address | `0.0.0.0` | `0.0.0.0` |
| `SERVER_PORT` | Service port | `8000` | `8000` |
| `SERVER_WORKERS` | Uvicorn worker count | `1` | `2` |
| `SERVER_STORAGE_TYPE` | Storage type (`local`/`redis`/`mysql`/`pgsql`) | `local` | `pgsql` |
| `SERVER_STORAGE_URL` | Storage URL (empty for local) | `""` | `postgresql+asyncpg://user:password@host:5432/db` |

> MySQL example: `mysql+aiomysql://user:password@host:3306/db` (if you set `mysql://`, it will be normalized to `mysql+aiomysql://`)

<br>

## Admin Panel

URL: `http://<host>:8000/admin`

Login password comes from config field `app.app_key` (required, set your own strong value).

**Features**:

- **Token Management**: Import/add/delete tokens, view status and quota, one-click refresh all
- **Status Filtering**: Filter by status (active/rate-limited/invalid) or NSFW status
- **Batch Operations**: Batch refresh, export, delete, enable NSFW
- **Config Management**: Modify system configuration online (including Public mode toggle)
- **Cache Management**: View, clean, and download media cache (supports batch download, inline video preview)
- **Playground** button in the top-right corner for quick access to public feature pages

### Public Mode / Private Mode

Toggle via **Config Management** in the admin panel (`app.public_enabled`), no restart required:

| Config | Playground Pages | Admin Panel | API Endpoints |
| :--- | :--- | :--- | :--- |
| `public_enabled = false` (default) | Not accessible (404) | Requires `app_key` | Requires `api_key` |
| `public_enabled = true` + `public_key = ""` | Open access | Requires `app_key` | No auth needed |
| `public_enabled = true` + `public_key = "xxx"` | Requires `public_key` | Requires `app_key` | No auth needed |

**Playground Pages** (available when `public_enabled = true`):

| Page | Path | Description |
| :--- | :--- | :--- |
| Chat | `/chat` | Conversational interface |
| Imagine Waterfall | `/imagine` | Image generation/editing, WebSocket/SSE real-time |
| Video Generation | `/video` | Video generation with image-to-video support |
| LiveKit Voice | `/voice` | LiveKit real-time voice session |

<br>

## API Endpoints

### OpenAI-Compatible

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/v1/chat/completions` | POST | Chat completions (streaming, multimodal, video models) |
| `/v1/images/generations` | POST | Image generation |
| `/v1/images/edits` | POST | Image editing (multipart/form-data) |
| `/v1/models` | GET | Available model list |
| `/v1/files/image/{name}` | GET | Image file service |
| `/v1/files/video/{name}` | GET | Video file service |

### Public API (`/v1/public/`)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/v1/public/imagine/start` | POST | Create image generation task |
| `/v1/public/imagine/sse` | GET | Image generation SSE stream |
| `/v1/public/imagine/ws` | WS | Image generation WebSocket |
| `/v1/public/imagine/stop` | POST | Stop image tasks |
| `/v1/public/imagine/config` | GET | Get image generation config |
| `/v1/public/video/start` | POST | Create video generation task |
| `/v1/public/video/sse` | GET | Video generation SSE stream |
| `/v1/public/video/stop` | POST | Stop video tasks |
| `/v1/public/voice/token` | GET | Get LiveKit Token |

### Admin API (`/v1/admin/`)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/v1/admin/login` | POST | Login verification |
| `/v1/admin/config` | GET/PUT | Config management |
| `/v1/admin/tokens` | GET/POST/DELETE | Token management |
| `/v1/admin/tokens/refresh` | POST | Token refresh |
| `/v1/admin/cache` | GET/DELETE | Cache management |

<br>

## Supported Models

| Model ID | Type | Cost |
| :--- | :--- | :--- |
| `grok-3`, `grok-3-mini`, `grok-3-thinking` | Chat | Low |
| `grok-4`, `grok-4-mini`, `grok-4-thinking`, `grok-4-heavy` | Chat | Low/High |
| `grok-4.1-mini`, `grok-4.1-fast`, `grok-4.1-expert`, `grok-4.1-thinking` | Chat | Low/High |
| `grok-imagine-1.0` | Image Generation | High |
| `grok-imagine-1.0-edit` | Image Editing | High |
| `grok-imagine-1.0-video` | Video Generation | High |

<br>

## Configuration

Main config file: `data/config.toml` (auto-generated on first run)

| Section | Description | Key Fields |
| :--- | :--- | :--- |
| `[app]` | Application | `app_key`, `api_key`, `public_enabled`, `public_key`, `image_format`, `video_format` |
| `[proxy]` | Proxy & Network | `base_proxy_url`, `asset_proxy_url`, `cf_clearance`, `browser`, `user_agent` |
| `[retry]` | Retry Strategy | `max_retry`, `retry_status_codes`, `retry_backoff_base/factor/max` |
| `[token]` | Token Pool | `auto_refresh`, `refresh_interval_hours`, `fail_threshold` |
| `[cache]` | Cache | `enable_auto_clean`, `limit_mb` |
| `[chat]` | Chat | `concurrent`, `timeout`, `stream_timeout` |
| `[image]` | Image | `timeout`, `nsfw`, `final_min_bytes` |
| `[video]` | Video | `concurrent`, `timeout`, `stream_timeout` |
| `[voice]` | Voice | `timeout` |
| `[asset]` | Asset Management | `upload_concurrent`, `download_concurrent`, `delete_concurrent` |
| `[nsfw]` | NSFW Batch Ops | `concurrent`, `batch_size`, `timeout` |
| `[usage]` | Usage Query | `concurrent`, `batch_size`, `timeout` |

<br>

## Local Development

### Requirements

- Python >= 3.13
- Package manager: [uv](https://github.com/astral-sh/uv)

### Run

```bash
# Install dependencies
uv sync

# Start service
uv run main.py

# Or with hot reload
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

<br>

## Credits

- Original project: [chenyme/grok2api](https://github.com/chenyme/grok2api) - Thanks to [@chenyme](https://github.com/chenyme) for the excellent work
