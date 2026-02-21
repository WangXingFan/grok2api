# Grok2API (二开版)

> [!NOTE]
> 本项目基于 [chenyme/grok2api](https://github.com/chenyme/grok2api) 二次开发，在原项目基础上新增了管理后台的多项增强功能。
>
> 原项目仅供学习与研究，使用者必须在遵循 Grok 的 **使用条款** 以及 **法律法规** 的情况下使用，不得用于非法用途。

[English](docs/README.en.md) | **中文**

基于 **FastAPI** 重构的 Grok2API，全面适配最新 Web 调用格式，支持流/非流式对话、图像生成/编辑、视频生成、深度思考，号池并发与自动负载均衡一体化。

<br>

## 二开新增功能

### Chat 聊天页面

在 Playground 功能区（`/chat`）新增 **Chat 聊天** 页面，提供可视化的对话交互界面。

- 支持流式/非流式输出
- 对话历史记录
- 多模型切换

---

### Imagine 图片生成/编辑

在 Playground 功能区（`/imagine`）的 **Imagine** 页面新增 **图片编辑** 模式。

| 模式 | 说明 |
| :--- | :--- |
| **生成模式** | 通过提示词从零生成图片（原有功能） |
| **编辑模式** | 上传参考图片 + 提示词，基于图片进行 AI 编辑 |

**编辑模式特性**：

- 生成/编辑模式一键切换
- 支持拖拽或点击上传参考图片（最大 50MB）
- 图片预览与移除
- 调用 `/v1/images/edits` 接口，模型 `grok-imagine-1.0-edit`

**瀑布流增强**：

- 图片状态标签实时显示（生成中/完成/失败）
- 可配置的图片过滤阈值（从服务端配置加载）
- 支持 HTTP URL 和 Base64 两种图片格式
- 客户端 NSFW 参数传递

<img width="518" height="790" alt="image" src="https://github.com/user-attachments/assets/7e1b975c-4c73-454b-91e4-4c5ce2e940fb" />

---

### Video 视频生成页面

在 Playground 功能区（`/video`）的 **Video 视频生成** 页面，提供可视化的视频生成操作界面。

**双模式支持**：

| 模式 | 说明 |
| :--- | :--- |
| **单视频模式** | 单次生成一个视频，适合精细调参和预览 |
| **瀑布流模式** | 批量连续生成，支持并发控制（1-3 路），自动滚动、自动下载 |

**功能特性**：

- 提示词输入，支持 `Ctrl+Enter` 快捷生成
- **图生视频**：上传参考图片，基于图片内容生成视频（单视频模式 & 瀑布流模式均支持）
- 可调节参数面板：
  - 宽高比：`16:9` / `9:16` / `1:1` / `2:3` / `3:2`
  - 视频时长：`6s` / `10s` / `15s`
  - 分辨率：`480p` / `720p`
  - 风格预设：`Custom` / `Normal` / `Fun` / `Spicy`
- 流式/非流式输出切换
- 实时生成状态与参数同步显示
- 视频播放器预览（支持 URL 和 HTML 两种返回格式）
- 生成历史记录（本地持久化，支持点击回放和单条删除）
- **瀑布流专属功能**：
  - 并发数控制（1/2/3 路同时生成）
  - 自动滚动到最新视频
  - 自动下载已完成视频
  - 批量选择、下载、删除
  - Lightbox 大图预览（支持键盘左右切换）
  - 优雅停止：点击停止后等待进行中的视频完成，不会中断生成

<img width="819" height="859" alt="image" src="https://github.com/user-attachments/assets/4b88bf6b-9cd2-44e4-bed9-be77c173dd41" />
<img width="890" height="845" alt="image" src="https://github.com/user-attachments/assets/e30d79be-dc7e-466d-b7a8-6c13f667f19b" />

---

### Token 管理增强

- 新增 **「刷新全部」** 按钮：一键刷新所有 Token 状态，无需手动全选

---

### 缓存管理增强

- 新增 **批量下载**：勾选多个本地图片/视频文件后，点击底部工具栏「下载」按钮，服务端自动打包为 ZIP（`ZIP_STORED` 不压缩）一次性下载；仅选 1 个文件时直接下载，不打包
- 新增 **单文件下载**：每行文件操作列新增下载图标，一键下载单个文件
- 新增 **视频在线预览**：缓存管理页面内嵌视频播放器，点击查看直接播放，无需跳转新页面
- 新增 **图片在线预览**：浏览器打开文件链接可直接显示图片，不再触发下载

<br>

## 架构变化（v1.5.0）

相较于旧版本，v1.5.0 进行了以下架构调整：

### 模块拆分

- **API 路由拆分**：管理 API 从 `admin.py` 单文件（1900+ 行）拆分为 `admin_api/config.py`、`admin_api/token.py`、`admin_api/cache.py` 独立模块
- **公共 API 独立**：新增 `public_api/` 模块，包含 `imagine.py`、`video.py`、`voice.py` 三个独立端点
- **页面路由分离**：新增 `app/api/pages/` 模块，将 HTML 页面服务从 API 路由中分离（`admin.py` + `public.py`）

### 静态资源重组

```
# 旧结构（扁平）
app/static/imagine/imagine.{html,js,css}
app/static/video/video.{html,js,css}

# 新结构（分层）
app/static/public/pages/{chat,imagine,video,voice,login}.html
app/static/public/js/{chat,imagine,video}.js
app/static/public/css/{chat,imagine,video}.css
app/static/admin/pages/{login,token,config,cache}.html
app/static/admin/js/{token,cache}.js
app/static/admin/css/{token,cache}.css
app/static/common/{html,js,css,img}/          # 公共资源
```

### 认证体系重构

- **移除 `SITE_MODE` 环境变量**，改为配置项 `app.public_enabled`（在后台配置管理页面即可切换）
- **新增 `public_key` 配置**：Public 模式下的独立认证密钥，与 `api_key` 分离
- **三层认证架构**：
  - `verify_app_key` — 管理后台认证（`app_key`）
  - `verify_api_key_if_private` — API 认证，`public_enabled=true` 时自动放行
  - `verify_public_key` — 公共 API 认证（`public_key`，可选）

### 新增服务模块

- `app/services/grok/services/video.py` — 视频生成服务
- `app/services/grok/services/voice.py` — LiveKit 语音服务
- `app/services/reverse/video_upscale.py` — 视频升级服务

<br>

## 部署方式

### Docker Compose 部署

```bash
git clone https://github.com/WangXingFan/grok2api.git

cd grok2api

docker compose up -d
```

> 后续更新镜像：
> ```bash
> docker compose pull && docker compose up -d
> ```
>
> 如需从源码构建：
> ```bash
> docker compose up -d --build
> ```

### Vercel 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/WangXingFan/grok2api)

> 请务必设置 `DATA_DIR=/tmp/data`，并关闭文件日志 `LOG_FILE_ENABLED=false`。
>
> 持久化请使用 MySQL / Redis / PostgreSQL，在 Vercel 环境变量中设置：`SERVER_STORAGE_TYPE`（mysql/redis/pgsql）与 `SERVER_STORAGE_URL`。

### Render 部署

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/WangXingFan/grok2api)

> Render 免费实例 15 分钟无访问会休眠，恢复/重启/重新部署会丢失。
>
> 持久化请使用 MySQL / Redis / PostgreSQL，在 Render 环境变量中设置：`SERVER_STORAGE_TYPE`（mysql/redis/pgsql）与 `SERVER_STORAGE_URL`。

### 环境变量

可在 `docker-compose.yml` 的 `environment` 中配置：

| 变量名 | 说明 | 默认值 | 示例 |
| :--- | :--- | :--- | :--- |
| `LOG_LEVEL` | 日志级别 | `INFO` | `DEBUG` |
| `LOG_FILE_ENABLED` | 是否启用文件日志 | `true` | `false` |
| `LOG_DIR` | 日志目录 | `./logs` | `/var/log/grok2api` |
| `DATA_DIR` | 数据目录（配置/Token/锁） | `./data` | `/data` |
| `SERVER_HOST` | 服务监听地址 | `0.0.0.0` | `0.0.0.0` |
| `SERVER_PORT` | 服务端口 | `8000` | `8000` |
| `SERVER_WORKERS` | Uvicorn worker 数量 | `1` | `2` |
| `SERVER_STORAGE_TYPE` | 存储类型（`local`/`redis`/`mysql`/`pgsql`） | `local` | `pgsql` |
| `SERVER_STORAGE_URL` | 存储连接串（local 时可为空） | `""` | `postgresql+asyncpg://user:password@host:5432/db` |

> MySQL 示例：`mysql+aiomysql://user:password@host:3306/db`（若填 `mysql://` 会自动转为 `mysql+aiomysql://`）

<br>

## 管理面板

访问地址：`http://<host>:8000/admin`

登录密码来自配置项 `app.app_key`（必填，必须自定义强密码）。

**功能说明**：

- **Token 管理**：导入/添加/删除 Token，查看状态和配额，一键刷新全部
- **状态筛选**：按状态（正常/限流/失效）或 NSFW 状态筛选
- **批量操作**：批量刷新、导出、删除、开启 NSFW
- **配置管理**：在线修改系统配置（包括 Public 模式切换）
- **缓存管理**：查看、清理和下载媒体缓存（支持批量下载图片/视频，视频在线预览）
- 右上角 **Playground** 按钮可快速跳转到公共功能页面

### Public 模式 / 私有模式

通过后台 **配置管理** 中的 `app.public_enabled` 控制部署模式（无需重启）：

| 配置项 | Playground 页面 | 管理后台 | API 接口 |
| :--- | :--- | :--- | :--- |
| `public_enabled = false`（默认） | 不可访问（404） | 需要 `app_key` 登录 | 需要 `api_key` |
| `public_enabled = true` + `public_key = ""` | 直接访问 | 需要 `app_key` 登录 | 无需认证 |
| `public_enabled = true` + `public_key = "xxx"` | 需要 `public_key` | 需要 `app_key` 登录 | 无需认证 |

**Playground 功能页面**（`public_enabled = true` 时可用）：

| 页面 | 路径 | 说明 |
| :--- | :--- | :--- |
| Chat 聊天 | `/chat` | 对话交互界面 |
| Imagine 瀑布流 | `/imagine` | 图片生成/编辑，WebSocket/SSE 实时推送 |
| Video 视频生成 | `/video` | 视频生成，支持图生视频 |
| LiveKit 陪聊 | `/voice` | LiveKit 语音实时会话 |

<br>

## API 端点

### OpenAI 兼容接口

| 端点 | 方法 | 说明 |
| :--- | :--- | :--- |
| `/v1/chat/completions` | POST | 聊天补全（支持流式、多模态、视频模型） |
| `/v1/images/generations` | POST | 图像生成 |
| `/v1/images/edits` | POST | 图像编辑（multipart/form-data） |
| `/v1/models` | GET | 可用模型列表 |
| `/v1/files/image/{name}` | GET | 图片文件服务 |
| `/v1/files/video/{name}` | GET | 视频文件服务 |

### 公共 API（`/v1/public/`）

| 端点 | 方法 | 说明 |
| :--- | :--- | :--- |
| `/v1/public/imagine/start` | POST | 创建图片生成任务 |
| `/v1/public/imagine/sse` | GET | 图片生成 SSE 流 |
| `/v1/public/imagine/ws` | WS | 图片生成 WebSocket |
| `/v1/public/imagine/stop` | POST | 停止图片任务 |
| `/v1/public/imagine/config` | GET | 获取图片生成配置 |
| `/v1/public/video/start` | POST | 创建视频生成任务 |
| `/v1/public/video/sse` | GET | 视频生成 SSE 流 |
| `/v1/public/video/stop` | POST | 停止视频任务 |
| `/v1/public/voice/token` | GET | 获取 LiveKit Token |

### 管理接口（`/v1/admin/`）

| 端点 | 方法 | 说明 |
| :--- | :--- | :--- |
| `/v1/admin/login` | POST | 登录验证 |
| `/v1/admin/config` | GET/PUT | 配置管理 |
| `/v1/admin/tokens` | GET/POST/DELETE | Token 管理 |
| `/v1/admin/tokens/refresh` | POST | Token 刷新 |
| `/v1/admin/cache` | GET/DELETE | 缓存管理 |

<br>

## 支持模型

| 模型 ID | 类型 | 消耗 |
| :--- | :--- | :--- |
| `grok-3`, `grok-3-mini`, `grok-3-thinking` | 对话 | Low |
| `grok-4`, `grok-4-mini`, `grok-4-thinking`, `grok-4-heavy` | 对话 | Low/High |
| `grok-4.1-mini`, `grok-4.1-fast`, `grok-4.1-expert`, `grok-4.1-thinking` | 对话 | Low/High |
| `grok-imagine-1.0` | 图像生成 | High |
| `grok-imagine-1.0-edit` | 图像编辑 | High |
| `grok-imagine-1.0-video` | 视频生成 | High |

<br>

## 配置文件

主配置文件：`data/config.toml`（首次运行自动生成），结构分为：

| 区段 | 说明 | 关键字段 |
| :--- | :--- | :--- |
| `[app]` | 应用设置 | `app_key`, `api_key`, `public_enabled`, `public_key`, `image_format`, `video_format` |
| `[proxy]` | 代理与网络 | `base_proxy_url`, `asset_proxy_url`, `cf_clearance`, `browser`, `user_agent` |
| `[retry]` | 重试策略 | `max_retry`, `retry_status_codes`, `retry_backoff_base/factor/max` |
| `[token]` | Token 池管理 | `auto_refresh`, `refresh_interval_hours`, `fail_threshold` |
| `[cache]` | 缓存管理 | `enable_auto_clean`, `limit_mb` |
| `[chat]` | 对话配置 | `concurrent`, `timeout`, `stream_timeout` |
| `[image]` | 图像配置 | `timeout`, `nsfw`, `final_min_bytes` |
| `[video]` | 视频配置 | `concurrent`, `timeout`, `stream_timeout` |
| `[voice]` | 语音配置 | `timeout` |
| `[asset]` | 资产管理 | `upload_concurrent`, `download_concurrent`, `delete_concurrent` |
| `[nsfw]` | NSFW 批量操作 | `concurrent`, `batch_size`, `timeout` |
| `[usage]` | 用量查询 | `concurrent`, `batch_size`, `timeout` |

<br>

## 本地开发

### 环境要求

- Python >= 3.13
- 包管理器：[uv](https://github.com/astral-sh/uv)

### 启动服务

```bash
# 安装依赖
uv sync

# 启动服务
uv run main.py

# 或使用 uvicorn（支持热重载）
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 关键依赖

| 包 | 用途 |
| :--- | :--- |
| `fastapi` + `uvicorn` | Web 框架 |
| `curl_cffi` | HTTP 客户端（浏览器指纹模拟） |
| `aiohttp` / `aiohttp-socks` | WebSocket 与代理 |
| `sqlalchemy` | 数据库 ORM |
| `redis` | 分布式缓存/存储 |
| `livekit` | LiveKit 语音实时通信 |
| `orjson` | 高性能 JSON 序列化 |
| `loguru` | 日志 |

<br>

## 致谢

- 原项目：[chenyme/grok2api](https://github.com/chenyme/grok2api) - 感谢 [@chenyme](https://github.com/chenyme) 的出色工作
