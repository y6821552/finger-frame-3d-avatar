# Finger Frame 3D Avatar

[![CI](https://github.com/y6821552/finger-frame-3d-avatar/actions/workflows/ci.yml/badge.svg)](https://github.com/y6821552/finger-frame-3d-avatar/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status: early stage](https://img.shields.io/badge/status-early--stage-orange.svg)](ROADMAP.md)

基于浏览器的实时手指取景框与卡通角色面捕体验。用户用双手的食指和拇指组成取景框后，框内会显示由人脸、头部和上半身动作实时驱动的卡通角色。

项目完全在浏览器本地运行，不使用 AI 视频生成模型，也不会上传摄像头画面。年龄段和性别由用户手动选择。

当前为公开发布早期版本。项目已有可运行实现、自动化验证和明确路线图，但尚不宣称已有大规模采用或稳定 API。

## 在线体验

[打开在线版本](https://finger-frame-3d-avatar.y6821552.chatgpt.site)

> 在线版本当前仅对项目所有者开放。摄像头需要 HTTPS 或 localhost 环境。

## 功能

- 双手 L 形手势检测、取景框平滑、瞬移抑制和短时丢失保持；
- MediaPipe Hand、Face、Pose 三路本地跟踪；
- 眨眼、视线、张嘴、微笑、眉毛和头部旋转驱动；
- 肩部、躯干和上半身动作跟随；
- 按人脸宽度估算摄像头距离，角色随远近连续缩放；
- 前置摄像头镜像、后置摄像头非镜像对齐；
- 儿童、青少年、成年人、老年人 × 男/女，共 8 个角色；
- 中文/英文界面切换；
- 自动、高、中、低四档画质；
- WebGL 不可用时自动切换 Canvas 2D 卡通渲染；
- 无摄像头权限的确定性演示模式。

## 技术栈

- TypeScript + Vite
- Three.js + `@pixiv/three-vrm`
- MediaPipe Tasks Vision
- Vitest + Playwright + ESLint

## 本地运行

环境要求：Node.js 20.19+ 或 22.12+。

```bash
npm ci
npm run dev
```

首次执行 `npm ci` 会从 MediaPipe 官方地址下载 3 个模型、校验 SHA-256，并从已安装的 `@mediapipe/tasks-vision` 包复制 WASM 运行时。生成文件不会提交到 Git。

打开终端显示的地址并允许摄像头权限。无需摄像头即可使用演示模式：

```text
http://localhost:5173/?demo=1
```

测试 Canvas 2D 降级：

```text
http://localhost:5173/?demo=1&noWebgl=1
```

## 构建与验证

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

端到端测试需要先安装 Chromium：

```bash
npx playwright install chromium
npm run test:e2e
```

## 工作流程

```text
摄像头帧
  ├─ Hand Landmarker → 手指取景框
  ├─ Face Landmarker → 表情、视线、头部姿态、距离
  └─ Pose Landmarker → 肩部与上半身姿态
           ↓
      MotionMapper
           ↓
 Three.js 角色 / Canvas 2D 降级
           ↓
  摄像头 + 角色 + 真实双手合成
```

## 隐私

- 摄像头帧、关键点和动作数据仅在当前浏览器中处理；
- 安装阶段从官方来源准备并校验 MediaPipe 模型和 WASM；应用运行时只读取本地静态文件，不依赖模型 CDN；
- 角色选择和语言偏好只保存在浏览器本地；
- 项目没有服务端人脸存储或年龄、性别自动识别。

## 资源说明

- MediaPipe 模型版本、来源和 SHA-256：[`public/models/README.md`](public/models/README.md)
- 角色资源许可要求：[`public/avatars/ATTRIBUTION.md`](public/avatars/ATTRIBUTION.md)
- 当前 8 个角色由项目代码程序化生成，不包含第三方商业角色模型。

## 浏览器支持

- Windows：最新版 Chrome / Edge
- Android：最新版 Chrome
- iPhone / iPad：最新版 Safari

低性能设备会自动降低画质；WebGL 不可用时会进入 Canvas 2D 降级模式。

## 当前限制

程序化角色适合实时原型和交互验证，但视觉精度不能达到专业动画电影角色。若需更高质量，应替换为经过专业雕刻、绑定并包含表情 BlendShape 的 GLB/VRM 角色资产。

## 开源维护

- [贡献指南](CONTRIBUTING.md)
- [行为准则](CODE_OF_CONDUCT.md)
- [安全政策](SECURITY.md)
- [治理与维护者](docs/GOVERNANCE.md)
- [架构说明](docs/ARCHITECTURE.md)
- [路线图](ROADMAP.md)
- [更新记录](CHANGELOG.md)
- [第三方声明](NOTICE.md)

项目采用 [MIT License](LICENSE)。欢迎通过 issue 和 pull request 提交兼容性反馈、回归测试、文档改进与许可清晰的角色资产集成。
