# Searchable project description design

Date: 2026-08-12
Status: Approved direction, pending wording review

## Goal

Make the project understandable to non-developers while improving GitHub and search-engine discovery for both Chinese users and international developers.

## Audience

1. People searching for webcam cartoon effects, gesture camera effects, or real-time cartoon avatars.
2. Developers searching for MediaPipe, Three.js, browser face tracking, hand tracking, motion capture, Web AR, or VRM examples.

## Content structure

The public description uses two layers:

1. A plain Chinese sentence that explains the visible result first.
2. A concise English sentence containing accurate technical search terms.

The project title remains recognizable while adding a Chinese functional subtitle.

## Language claim

The product currently supports Chinese and English. Public copy must say:

- the interface defaults to Chinese;
- users can switch between Chinese and English.

It must not imply support for languages that are not implemented.

## Planned wording

### README title

`Finger Frame 3D Avatar — 手势相框实时卡通面捕`

### Chinese introduction

用摄像头把自己实时变成卡通角色：双手比出相框后，网页会追踪眨眼、张嘴、转头和上半身动作，让卡通角色同步表演。无需安装 App，也不需要 AI 视频生成，所有画面都在浏览器本地处理。界面默认使用中文，并支持中英文一键切换。

### English introduction

A privacy-first real-time webcam cartoon avatar and finger-frame camera effect powered by MediaPipe and Three.js. It supports browser-based face, hand and upper-body motion tracking, with a Chinese-first interface and instant Chinese/English switching.

### GitHub About description

摄像头实时卡通角色与手势相框特效，默认中文、支持中英文切换｜MediaPipe face, hand and motion tracking with Three.js

## Search terms

`webcam`, `camera-filter`, `cartoon-avatar`, `face-tracking`, `hand-tracking`, `motion-capture`, `mediapipe`, `threejs`, `web-ar`, `vrm`, `privacy-first`, `typescript`, `摄像头特效`, `实时面捕`, `手势识别`, `卡通角色`.

GitHub topics remain English because GitHub topic names work best as short normalized identifiers. Chinese keywords appear naturally in the README and repository description.

## Files and metadata

- Update the README title and opening paragraphs.
- Update `package.json` description and keywords.
- Update the GitHub About description and repository topics when a supported repository-settings interface is available.
- Do not change tracking behavior, language logic, deployment, or runtime assets.

## Acceptance criteria

- A non-technical reader can understand the project from the first two sentences.
- The copy truthfully states Chinese is the default and English is available.
- Chinese consumer terms and English developer terms are both present.
- Existing links, badges, privacy claims, and technical documentation remain intact.
