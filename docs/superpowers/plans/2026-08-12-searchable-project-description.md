# Searchable Bilingual Project Description Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository immediately understandable to Chinese users while improving discovery through accurate Chinese and English search terms.

**Architecture:** Keep the product name stable, then place a plain Chinese explanation and a concise English technical summary at the top of the README. Mirror the English discovery terms in `package.json` metadata without changing application behavior or runtime language logic.

**Tech Stack:** Markdown, JSON, npm, GitHub Actions

## Global Constraints

- The interface defaults to Chinese and currently supports switching between Chinese and English.
- Do not imply support for any language other than Chinese and English.
- Do not change tracking behavior, deployment, runtime assets, dependencies, or application source.
- Preserve all badges, links, privacy statements, and maintenance documentation.
- Use natural phrases; do not repeat keywords unnaturally.

---

### Task 1: Rewrite the README opening for people and search engines

**Files:**
- Modify: `README.md:1-14`
- Reference: `docs/superpowers/specs/2026-08-12-searchable-project-description-design.md`

**Interfaces:**
- Consumes: the approved wording and language claims from the design specification.
- Produces: a stable public title and bilingual opening text used by GitHub and search engines.

- [ ] **Step 1: Record the required text assertions**

The resulting README must contain each exact sentence:

```text
# Finger Frame 3D Avatar — 手势相框实时卡通面捕
用摄像头把自己实时变成卡通角色
界面默认使用中文，并支持中英文一键切换。
A privacy-first real-time webcam cartoon avatar and finger-frame camera effect powered by MediaPipe and Three.js.
```

It must not contain `支持多种语言`, because only Chinese and English are implemented.

- [ ] **Step 2: Replace the title and opening paragraphs**

Keep the existing badges unchanged and replace the existing introduction with:

```markdown
# Finger Frame 3D Avatar — 手势相框实时卡通面捕

[existing badges remain unchanged]

用摄像头把自己实时变成卡通角色：双手比出相框后，网页会追踪眨眼、张嘴、转头和上半身动作，让卡通角色同步表演。无需安装 App，也不需要 AI 视频生成，所有画面都在浏览器本地处理。界面默认使用中文，并支持中英文一键切换。

A privacy-first real-time webcam cartoon avatar and finger-frame camera effect powered by MediaPipe and Three.js. It supports browser-based face, hand and upper-body motion tracking, with a Chinese-first interface and instant Chinese/English switching.

当前为公开发布早期版本。项目已有可运行实现、自动化验证和明确路线图，但尚不宣称已有大规模采用或稳定 API。
```

- [ ] **Step 3: Verify the README wording**

Run:

```bash
rg -n '手势相框实时卡通面捕|用摄像头把自己实时变成卡通角色|默认使用中文|Chinese/English switching|MediaPipe and Three.js' README.md
! rg -n '支持多种语言|supports multiple languages' README.md
```

Expected: five required matches and no unsupported-language match.

- [ ] **Step 4: Commit the README change**

```bash
git add README.md
git commit -m "docs: make project introduction easier to discover"
```

### Task 2: Align package metadata with the public description

**Files:**
- Modify: `package.json:4-24`

**Interfaces:**
- Consumes: English discovery terms approved in the design specification.
- Produces: valid npm-compatible package metadata with normalized search keywords.

- [ ] **Step 1: Define the exact metadata**

Set:

```json
"description": "Privacy-first real-time webcam cartoon avatar with MediaPipe face, hand and upper-body tracking",
"keywords": [
  "webcam",
  "camera-filter",
  "cartoon-avatar",
  "face-tracking",
  "hand-tracking",
  "motion-capture",
  "mediapipe",
  "threejs",
  "web-ar",
  "vrm",
  "privacy-first",
  "typescript",
  "augmented-reality"
]
```

Keep `name`, `version`, `private`, `license`, `homepage`, `repository`, dependencies, engines, and scripts unchanged.

- [ ] **Step 2: Verify JSON and metadata**

Run:

```bash
node -e "const p=require('./package.json'); if(p.description!=='Privacy-first real-time webcam cartoon avatar with MediaPipe face, hand and upper-body tracking') process.exit(1); for(const k of ['webcam','camera-filter','cartoon-avatar','face-tracking','hand-tracking','motion-capture','mediapipe','threejs','web-ar','vrm','privacy-first','typescript']) if(!p.keywords.includes(k)) process.exit(1);"
npm run typecheck
npm run lint
npm run test:run
npm run build -- --base=/finger-frame-3d-avatar/
```

Expected: metadata assertion exits 0; typecheck and lint pass; 63 tests pass; production build succeeds.

- [ ] **Step 3: Commit the package metadata**

```bash
git add package.json
git commit -m "chore: improve repository discovery metadata"
```

### Task 3: Publish through the protected-branch workflow

**Files:**
- No additional source files.
- Review: `README.md`, `package.json`, and the two planning documents.

**Interfaces:**
- Consumes: the completed branch commits.
- Produces: a reviewable pull request whose required checks gate the `main` update.

- [ ] **Step 1: Create the pull request**

Open a PR from `agent/searchable-project-description` to `main` titled:

```text
Make the project description easier to discover
```

The PR body must state:

```markdown
## Summary

- explain the camera effect in plain Chinese
- add an English MediaPipe/Three.js discovery summary
- state that the interface defaults to Chinese and switches between Chinese and English
- align package keywords with webcam avatar, face tracking, hand tracking, and Web AR searches

## Validation

- package metadata JSON assertion
- typecheck
- ESLint
- Vitest
- GitHub Pages production build
```

- [ ] **Step 2: Wait for required checks**

Required checks:

```text
verify
Analyze JavaScript and TypeScript
```

Expected: both checks conclude `success`.

- [ ] **Step 3: Review and merge**

Confirm the PR changes only `README.md`, `package.json`, the approved specification, and this implementation plan. Merge using squash merge after required checks pass.

- [ ] **Step 4: Verify public state**

Verify the default-branch README contains the approved title and language statement, and confirm the GitHub Pages URL still returns the application.
