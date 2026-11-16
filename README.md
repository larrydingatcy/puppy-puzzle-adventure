# AI for Future

一款给约 5 岁半孩子的双语学习游戏。好奇森林练提问、追问和比较证据。任务基地用六个家庭挑战练习复述、收集线索、做计划和反思。

| 版本 | 使用方式 | 数据 |
| --- | --- | --- |
| Mac Studio 完整版 | iPad 在同一局域网访问 Next.js PWA，使用本机模型、录音和相机 | Prisma / SQLite，保存在 Mac Studio |
| GitHub Pages 试玩 | 浏览器体验两个模块、星星、家长确认和奖励兑换，使用预设回复和示例评分 | 当前浏览器。输入虚构内容；试玩 PIN 为 1234 |

## Mac Studio 部署

需要 Node.js 22.13 或以上，另装 [Ollama](https://ollama.com/) 和 [whisper.cpp](https://github.com/ggml-org/whisper.cpp)。

```sh
cp .env.example .env
openssl rand -hex 32
```

把输出写进 `.env` 的 `APP_SECRET`，设置独立的 4–12 位数字 `APP_PIN` 和家庭时区 `APP_TIMEZONE`。启动 Ollama 后执行：

```sh
ollama pull qwen3
ollama pull qwen2.5vl
npm install
npm run db:setup
npm run build
npm start
```

在 Mac 打开 `http://localhost:3000`。在 iPad 上，浏览器的麦克风和 PWA 安装需要可信 HTTPS。可以用 Caddy 将 HTTPS 反向代理到 Next.js，示例如下，把 IP 换成 Mac Studio 的固定局域网地址：

```caddyfile
https://192.168.1.20 {
  tls internal
  reverse_proxy 127.0.0.1:3000
}
```

将 Caddy 的本地根证书安全地安装到 iPad 后，在「设置 → 通用 → 关于本机 → 证书信任设置」启用完整信任。用 Safari 打开上面的 HTTPS 地址，在分享菜单选择「添加到主屏幕」。在 Safari 首次点麦克风时授予权限，在中英文都测试一次朗读，确认系统提供相应的本地语音。家长后台用右上角齿轮打开。此单家庭版使用一份档案，允许局域网中打开该地址的设备访问孩子端，适合受信任的家庭网络。

### 本地听写

在 whisper.cpp 源码目录中准备普通多语种模型：

```sh
brew install cmake ffmpeg
sh ./models/download-ggml-model.sh small
cmake -B build
cmake --build build --config Release -j
./build/bin/whisper-server -m models/ggml-small.bin --host 127.0.0.1 --port 8080 --convert
```

`--convert` 使服务可以通过 FFmpeg 接收浏览器的 MP4 / WebM 录音。默认 `WHISPER_URL=http://127.0.0.1:8080/inference`。如果录像或相机出现格式差异，iPad 的照片输入会在上传前转换为 JPEG。Web Speech API 降级由 `WEB_SPEECH_FALLBACK=1` 启用。支持本地识别的浏览器会被要求在设备上处理，其他浏览器可能使用厂商远端听写。要保持严格的本地数据路径，保留默认的关闭设置。APP 在识别不可用时提供文字输入。

### 模型与数据

在家长后台设置 OpenAI 兼容接口的 `Base URL`（例如 `http://127.0.0.1:11434/v1`）、文本模型和视觉模型。地址可以指向 Mac Studio 上的其他兼容服务，只接受回环主机。兼容服务需要密钥时，在 `.env` 中设置 `LLM_API_KEY` 并重启。更新模型无需重建。离线页面可打开，完整问答需要连到 Mac Studio 上运行的服务。

星星、通关、兑换和日志保存在 `prisma/future.db`。数据库包含私人录音和照片。备份时先停止服务，再复制数据库文件及存在的同名 SQLite 辅助文件。任务大星在家长确认之后发放，奖励兑换在确认前不会扣星。

## 新增任务、关卡与奖励

- 新任务复制 [content/missions.json](content/missions.json) 中的一项。设置唯一英文 ID、双语短标题与简述、难度 1–3、先决任务 ID、预计分钟、双语复述检查、线索、计划评分、结果评分、反思题。空先决任务列表表示初始可玩。保存后重新运行 `npm run build` 并重启。家长后台可直接编辑任务 JSON，也可让小星生成草稿后审核发布。
- 森林关卡在 [content/forest.json](content/forest.json) 按列表顺序解锁。使用 `first`、`why`、`follow3`、`if`、`doubtReason`、`compareReason` 之一作为检查条件。新增这些条件的组合或顺序只需改 JSON。引入新行为条件需更新游戏规则。进度按关卡顺序记录，已使用的档案宜在列表末尾新增。
- 家长后台配置奖励名称、星数与图片。孩子在礼物图标处发起兑换，家长在待确认列表审批。

## GitHub Pages 分享

把这个目录作为独立仓库的根目录推送到 GitHub。打开仓库 **Settings → Pages → Source → GitHub Actions**，运行 **Publish AI for Future demo**，从 Actions 的部署结果复制分享地址。发布只包含 `out/` 静态试玩文件。GitHub Pages 不运行 Next.js API、Ollama、Whisper 或 SQLite。

```sh
npm test
npm run pages
python3 -m http.server --directory out 8000
```

本机访问 `http://localhost:8000` 可测试试玩构建。公开版禁用麦克风录音，保留文字、图标、朗读和本地照片操作。试玩数据可通过清除该网站的浏览器数据重置。
