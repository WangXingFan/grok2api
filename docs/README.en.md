# Grok2API (Fork)

[中文](../README.md) | **English**

> [!NOTE]
> This project is a fork of [chenyme/grok2api](https://github.com/chenyme/grok2api), with multiple enhanced features added to the admin dashboard.
>
> This project is for learning and research only. You must comply with Grok's Terms of Use and applicable laws. Do not use it for illegal purposes.

Grok2API rebuilt with **FastAPI**, fully aligned with the latest web call format. Supports streaming and non-streaming chat, image generation/editing, video generation, deep thinking, token pool concurrency, and automatic load balancing.

<br>

## New Features (Fork)

### Imagine Image Generation / Editing

A new **Image Editing** mode has been added to the **Imagine** page (`/admin/imagine`) under the "Features" menu in the admin dashboard.

| Mode | Description |
| :--- | :--- |
| **Generate Mode** | Generate images from scratch using prompts (original feature) |
| **Edit Mode** | Upload a reference image + prompt for AI-based image editing |

**Edit Mode Features**:

- One-click toggle between Generate / Edit mode
- Drag-and-drop or click to upload a reference image (max 50MB)
- Image preview and removal
- Calls `/v1/images/edits` endpoint, model `grok-imagine-1.0-edit`
<img width="518" height="790" alt="image" src="https://github.com/user-attachments/assets/7e1b975c-4c73-454b-91e4-4c5ce2e940fb" />

---

### Video Generation Page

The **Video Generation** page (`/admin/video`) under the "Features" menu provides a visual interface for video generation.

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
| `DATA_DIR` | Data directory (config/tokens/locks) | `./data` | `/data` |
| `SERVER_HOST` | Bind address | `0.0.0.0` | `0.0.0.0` |
| `SERVER_PORT` | Service port | `8000` | `8000` |
| `SERVER_WORKERS` | Uvicorn worker count | `1` | `2` |
| `SERVER_STORAGE_TYPE` | Storage type (`local`/`redis`/`mysql`/`pgsql`) | `local` | `pgsql` |
| `SERVER_STORAGE_URL` | Storage URL (empty for local) | `""` | `postgresql+asyncpg://user:password@host:5432/db` |
| `SITE_MODE` | Site mode (`private`/`public`) | `private` | `public` |

> MySQL example: `mysql+aiomysql://user:password@host:3306/db` (if you set `mysql://`, it will be normalized to `mysql+aiomysql://`)

### Admin Panel

URL: `http://<host>:8000/admin`
Login password comes from `app.app_key` (required, set your own strong value).
If the legacy default `grok2api` is still used, login is rejected (set `ALLOW_INSECURE_DEFAULT_APP_KEY=true` only for temporary backward compatibility).

**Features**:

- **Token Management**: Import/add/delete tokens, view status and quota
- **Status Filtering**: Filter by status (active/rate-limited/invalid) or NSFW status
- **Batch Operations**: Batch refresh, export, delete, enable NSFW
- **Config Management**: Modify system configuration online
- **Cache Management**: View and clean media cache
- **Imagine Generation/Editing**: WebSocket/SSE real-time image generation + image editing mode (fork enhancement)
- **Video Generation**: Visual video generation with image-to-video support (new in fork)
- **Voice Live**: LiveKit voice session

#### Public / Private Site Mode

Control deployment mode via the `SITE_MODE` environment variable:

| Mode | Playground Pages | Admin Panel | API Endpoints |
| :--- | :--------------- | :---------- | :------------ |
| `private` (default) | Login required | Login required | API Key required |
| `public` | Open access | Login required | No API Key needed |

- **`private`** (default): All pages and APIs require authentication, same behavior as before
- **`public`**: Playground pages (`/imagine`, `/video`, `/voice`) are accessible without login; admin panel (`/admin`) still requires authentication

```yaml
# docker-compose.yml
environment:
  SITE_MODE: public  # Set to public to enable open access mode
```

<br>

## Credits

- Original project: [chenyme/grok2api](https://github.com/chenyme/grok2api) - Thanks to [@chenyme](https://github.com/chenyme) for the excellent work
