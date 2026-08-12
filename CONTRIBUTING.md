# Contributing

感谢你帮助改进 Finger Frame 3D Avatar。项目欢迎缺陷报告、兼容性反馈、文档改进、测试用例和代码贡献。

## 开始之前

- 搜索现有 issue，避免重复报告；
- 安全漏洞不要创建公开 issue，请遵循 [`SECURITY.md`](SECURITY.md)；
- 新功能先创建 issue，说明使用场景、浏览器和预期行为；
- 不要提交许可不明确的 3D、VRM、GLB、纹理或媒体资源。

## 本地开发

需要 Node.js 20.19+ 或 22.12+。

```bash
npm ci
npm run dev
```

提交前运行：

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

涉及浏览器交互时，还应运行：

```bash
npx playwright install chromium
npm run test:e2e
```

## Pull Request 要求

- 一个 PR 只解决一个明确问题；
- 描述问题、实现方式、用户影响和验证命令；
- 修复缺陷时先添加能复现问题的测试；
- 保持摄像头数据仅在本地处理；
- 保持前置镜像、后置非镜像及 Android Chrome 行为；
- 新增资产必须记录来源、作者、许可证、转载和修改权限。

提交代码即表示你同意按本项目的 MIT License 发布贡献内容。
