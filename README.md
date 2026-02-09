# Grok2API (二开版)

> [!NOTE]
> 本项目基于 [chenyme/grok2api](https://github.com/chenyme/grok2api) 二次开发，在原项目基础上新增了管理后台的 **Video 视频生成** 功能页面。
>
> 原项目仅供学习与研究，使用者必须在遵循 Grok 的 **使用条款** 以及 **法律法规** 的情况下使用，不得用于非法用途。

基于 **FastAPI** 重构的 Grok2API，全面适配最新 Web 调用格式，支持流/非流式对话、图像生成/编辑、视频生成、深度思考，号池并发与自动负载均衡一体化。

<br>

## 二开新增功能

### Video 视频生成页面

在管理后台"功能玩法"菜单下新增 **Video 视频生成** 页面（`/admin/video`），提供可视化的视频生成操作界面。

**双模式支持**：

| 模式 | 说明 |
| :--- | :--- |
| **单视频模式** | 单次生成一个视频，适合精细调参和预览 |
| **瀑布流模式** | 批量连续生成，支持并发控制（1-3 路），自动滚动、自动下载 |

**功能特性**：

- 提示词输入，支持 `Ctrl+Enter` 快捷生成
- 可调节参数面板：
  - 宽高比：`16:9` / `9:16` / `1:1` / `2:3` / `3:2`
  - 视频时长：`6s` / `10s` / `15s`
  - 分辨率：`480p` / `720p`
  - 风格预设：`Custom` / `Normal` / `Fun` / `Spicy`
- 流式/非流式输出切换
- 实时生成状态与参数同步显示
- 视频播放器预览（支持 URL 和 HTML 两种返回格式）
- 生成历史记录（本地持久化，支持点击回放）
- **瀑布流专属功能**：
  - 并发数控制（1/2/3 路同时生成）
  - 自动滚动到最新视频
  - 自动下载已完成视频
  - 批量选择、下载、删除
  - Lightbox 大图预览（支持键盘左右切换）
  - 优雅停止：点击停止后等待进行中的视频完成，不会中断生成

<br>

## 部署方式

### Docker Compose 部署

```bash
git clone https://github.com/WangXingFan/grok2api.git

cd grok2api

docker compose up -d --build
```

> 首次启动会自动构建镜像，后续更新执行：
> ```bash
> git pull
> docker compose up -d --build
> ```

### 环境变量

可在 `docker-compose.yml` 的 `environment` 中配置：

| 变量名                  | 说明                                                | 默认值      | 示例                                                |
| :---------------------- | :-------------------------------------------------- | :---------- | :-------------------------------------------------- |
| `LOG_LEVEL`           | 日志级别                                            | `INFO`    | `DEBUG`                                           |
| `LOG_FILE_ENABLED`   | 是否启用文件日志                                    | `true`    | `false`                                           |
| `DATA_DIR`           | 数据目录（配置/Token/锁）                           | `./data`  | `/data`                                           |
| `SERVER_HOST`         | 服务监听地址                                        | `0.0.0.0` | `0.0.0.0`                                         |
| `SERVER_PORT`         | 服务端口                                            | `8000`    | `8000`                                            |
| `SERVER_WORKERS`      | Uvicorn worker 数量                                 | `1`       | `2`                                               |
| `SERVER_STORAGE_TYPE` | 存储类型（`local`/`redis`/`mysql`/`pgsql`） | `local`   | `pgsql`                                           |
| `SERVER_STORAGE_URL`  | 存储连接串（local 时可为空）                        | `""`      | `postgresql+asyncpg://user:password@host:5432/db` |

> MySQL 示例：`mysql+aiomysql://user:password@host:3306/db`（若填 `mysql://` 会自动转为 `mysql+aiomysql://`）

### 管理面板

访问地址：`http://<host>:8000/admin`
默认登录密码：`grok2api`（对应配置项 `app.app_key`，建议修改）。

**功能说明**：

- **Token 管理**：导入/添加/删除 Token，查看状态和配额
- **状态筛选**：按状态（正常/限流/失效）或 NSFW 状态筛选
- **批量操作**：批量刷新、导出、删除、开启 NSFW
- **配置管理**：在线修改系统配置
- **缓存管理**：查看和清理媒体缓存
- **Imagine 瀑布流**：WebSocket/SSE 实时图片生成
- **Video 视频生成**：可视化视频生成（二开新增）
- **Voice Live 陪聊**：LiveKit 语音会话

<br>

## 同步上游更新

本项目会定期同步上游 [chenyme/grok2api](https://github.com/chenyme/grok2api) 的更新：

```bash
# 添加上游远程（仅需一次）
git remote add upstream https://github.com/chenyme/grok2api.git

# 拉取并合并上游更新
git fetch upstream
git merge upstream/main

# 解决冲突后推送
git push origin main
```

<br>

## 致谢

- 原项目：[chenyme/grok2api](https://github.com/chenyme/grok2api) - 感谢 [@chenyme](https://github.com/chenyme) 的出色工作
