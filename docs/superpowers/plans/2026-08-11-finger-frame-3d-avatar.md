# Finger Frame 3D Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, cross-platform browser application that renders one of eight locally driven 3D cartoon avatars and a themed environment inside the existing tracked finger-frame gesture without using generative video.

**Architecture:** Migrate the original plain JavaScript application to Vite and TypeScript, retain its audited hand-frame algorithm as an isolated module, run MediaPipe hand/face/pose tracking behind a single scheduler, map tracking snapshots to a renderer-neutral pose, and render a VRM-capable Three.js scene into an offscreen canvas composited over the live camera. Include original procedural avatars for all eight roles so the app remains runnable without external assets, while preserving a manifest-driven VRM loading path for licensed models.

**Tech Stack:** Vite 8, TypeScript 6.0.3, Three.js 0.185, `@pixiv/three-vrm` 3.5, `@mediapipe/tasks-vision` 1.0, Vitest 4, Playwright 1.62, ESLint 10.

## Global Constraints

- Run on Windows Chrome, Android Chrome, and iPhone Safari.
- Process camera frames locally; do not upload video or call generative-video services.
- Expose exactly eight fixed roles: child, teenager, adult, and senior, each as male or female.
- Drive only head, face, shoulders, and upper torso; keep rendered avatar hands below the main frame.
- Render a prebuilt cartoon environment with age-specific palettes inside the finger quad.
- Preserve the original gesture hysteresis, quad ordering, jump rejection, smoothing, and dropout behavior.
- Provide automatic high, medium, and low quality modes and a WebGL-to-Toon fallback.
- Keep demo mode deterministic and usable without camera permission.
- Never distribute an external avatar without explicit redistribution and modification rights.

---

## Planned File Structure

```text
index.html                         application shell and controls
package.json                       scripts and runtime dependencies
vite.config.ts                     Vite and Vitest configuration
playwright.config.ts               browser test configuration
eslint.config.js                   TypeScript lint rules
src/main.ts                        application composition root
src/styles.css                     camera-first responsive interface
src/app/AppController.ts           lifecycle and subsystem orchestration
src/camera/CameraController.ts     camera and demo video source
src/tracking/types.ts              landmark and tracking contracts
src/tracking/FingerFrameTracker.ts original quad/gesture state machine
src/tracking/TrackingPipeline.ts    MediaPipe task creation and scheduling
src/tracking/DemoTrackingSource.ts deterministic fake tracking
src/motion/types.ts                renderer-neutral AvatarPose
src/motion/MotionMapper.ts          face/pose conversion and loss recovery
src/avatar/roles.ts                eight-role manifest and persistence
src/avatar/AvatarManager.ts         procedural/VRM avatar switching
src/avatar/ProceduralAvatar.ts      original lightweight cartoon character
src/avatar/VrmAvatar.ts             VRM adapter and expression mapping
src/scene/CartoonScene.ts           Three.js world, themes, and render target
src/performance/QualityController.ts quality selection and adaptation
src/compositor/HandMask.ts          feathered landmark hand mask
src/compositor/FrameCompositor.ts    camera/3D/hand/frame layer composition
src/fallback/ToonRenderer.ts         WebGL failure fallback
src/ui/AppUI.ts                      controls and live status
src/**/*.test.ts                     colocated unit tests
tests/app.spec.ts                    Playwright demo-mode acceptance tests
public/models/*.task                local MediaPipe model bundles
public/avatars/ATTRIBUTION.md        distributed avatar licensing record
```

## Task 1: Vite Migration and Finger-Frame Regression Harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`
- Modify: `index.html`
- Create: `src/main.ts`, `src/styles.css`, `src/tracking/types.ts`, `src/tracking/FingerFrameTracker.ts`
- Create: `src/tracking/FingerFrameTracker.test.ts`
- Remove after migration: `main.js`

**Interfaces:**
- Produces: `FingerFrameTracker.update(hands: HandObservation[], viewport: Size, nowMs: number): FingerFrameState`
- Produces: `FingerFrameState = { quad: Quad | null; opacity: number; hands: HandObservation[]; active: boolean }`

- [ ] **Step 1: Create project scripts and write failing finger-frame tests**

Create `package.json` scripts `dev`, `build`, `typecheck`, `test`, `test:run`, `lint`, and `test:e2e`. Add tests proving that two valid L-shaped hands yield a clockwise four-point quad, a brief dropout holds the quad, a far single-frame jump is rejected, and opacity fades instead of snapping.

```ts
it('holds a stable quad through a short dropout', () => {
  const tracker = new FingerFrameTracker();
  const first = tracker.update(twoOpenLHands(), { width: 1280, height: 720 }, 0);
  const dropout = tracker.update([], { width: 1280, height: 720 }, 33);
  expect(first.quad).not.toBeNull();
  expect(dropout.quad).toEqual(first.quad);
  expect(dropout.opacity).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run `npm run test:run -- src/tracking/FingerFrameTracker.test.ts` and confirm failure because the TypeScript module does not exist.

- [ ] **Step 3: Port the audited algorithm without changing its thresholds**

Move the original gesture spread gate, convex hull ordering, polygon-area gate, exponential smoothing, `FRAME_DROPOUT_HOLD`, `JUMP_CONFIRM_FRAMES`, and presence fade into `FingerFrameTracker`. Use immutable returned snapshots and typed normalized landmarks.

- [ ] **Step 4: Add the minimal Vite application shell**

Replace the script tag with `/src/main.ts`, move CSS into `src/styles.css`, retain the full-screen mirrored canvas and demo query parameter, and render a plain camera placeholder until later tasks connect the subsystems.

- [ ] **Step 5: Verify and commit**

Run `npm install`, `npm run typecheck`, `npm run test:run`, and `npm run build`. Commit as `refactor: migrate finger frame tracker to TypeScript`.

## Task 2: Role Manifest, Motion Mapping, and Quality Adaptation

**Files:**
- Create: `src/avatar/roles.ts`, `src/avatar/roles.test.ts`
- Create: `src/motion/types.ts`, `src/motion/MotionMapper.ts`, `src/motion/MotionMapper.test.ts`
- Create: `src/performance/QualityController.ts`, `src/performance/QualityController.test.ts`

**Interfaces:**
- Produces: `AvatarRole = { id: RoleId; age: AgeGroup; gender: Gender; label: string; theme: SceneTheme; fallback: ProceduralAvatarConfig; vrm?: LicensedAsset }`
- Produces: `MotionMapper.update(snapshot: TrackingSnapshot, nowMs: number): AvatarPose`
- Produces: `QualityController.sample(frameMs: number): QualityProfile`

- [ ] **Step 1: Write failing manifest tests**

Assert there are exactly eight unique role IDs, every age/gender pair exists once, the default is `adult-female`, every role has a procedural fallback, and every configured VRM asset has source, author, license, and redistribution fields.

- [ ] **Step 2: Write failing motion and quality tests**

Test blink/jaw/smile mappings, head rotation clamps, shoulder roll, 300 ms face-loss hold, gradual neutral recovery, low-performance quality downgrade, and manual quality override.

```ts
expect(mapper.update(faceSnapshot({ jawOpen: 0.8 }), 0).mouthOpen).toBeCloseTo(0.8);
expect(mapper.update(noFaceSnapshot(), 200).mouthOpen).toBeGreaterThan(0.5);
expect(mapper.update(noFaceSnapshot(), 900).mouthOpen).toBeLessThan(0.3);
```

- [ ] **Step 3: Run tests and verify they fail**

Run `npm run test:run -- src/avatar/roles.test.ts src/motion/MotionMapper.test.ts src/performance/QualityController.test.ts` and confirm the missing-module failures.

- [ ] **Step 4: Implement the eight-role manifest and local selection**

Define four age groups and two genders, age-specific scene themes, color palettes, body proportions, hair silhouettes, and the fixed default. Export `findRole(age, gender)` and `loadSavedRole(storage)` with invalid-value fallback.

- [ ] **Step 5: Implement deterministic motion mapping**

Map MediaPipe category names to `AvatarPose`, clamp head yaw to 45 degrees, pitch to 30 degrees, roll to 25 degrees, smooth expressions with time-based exponential interpolation, and add a low-amplitude idle breathing phase when pose is absent.

- [ ] **Step 6: Implement adaptive quality**

Define high `960x540`, medium `640x360`, and low `480x270` profiles. Automatic mode downgrades after 90 consecutive over-budget samples and never auto-upgrades in the current session; manual mode returns the requested profile unchanged.

- [ ] **Step 7: Verify and commit**

Run the focused tests, full unit suite, and typecheck. Commit as `feat: add avatar roles motion mapping and quality control`.

## Task 3: Procedural and VRM Avatar Rendering

**Files:**
- Create: `src/avatar/Avatar.ts`
- Create: `src/avatar/ProceduralAvatar.ts`, `src/avatar/ProceduralAvatar.test.ts`
- Create: `src/avatar/VrmAvatar.ts`, `src/avatar/AvatarManager.ts`, `src/avatar/AvatarManager.test.ts`
- Create: `src/scene/CartoonScene.ts`, `src/scene/CartoonScene.test.ts`
- Create: `public/avatars/ATTRIBUTION.md`

**Interfaces:**
- Consumes: `AvatarRole`, `AvatarPose`, `QualityProfile`
- Produces: `Avatar = { object3d: THREE.Object3D; applyPose(pose: AvatarPose): void; dispose(): void }`
- Produces: `AvatarManager.select(role: AvatarRole): Promise<Avatar>`
- Produces: `CartoonScene.render(pose: AvatarPose, role: AvatarRole, quality: QualityProfile, deltaSeconds: number): HTMLCanvasElement`

- [ ] **Step 1: Write failing renderer-domain tests**

Assert each procedural role builds a head, torso, eyes, brows, and mouth; pose application changes head rotation and eyelid scale; selecting a role with a failed VRM URL returns the matching procedural avatar; disposal releases geometries and materials; theme selection changes scene palette without recreating the renderer.

- [ ] **Step 2: Run focused tests and verify failure**

Run `npm run test:run -- src/avatar/ProceduralAvatar.test.ts src/avatar/AvatarManager.test.ts src/scene/CartoonScene.test.ts`.

- [ ] **Step 3: Build eight original procedural role variants**

Use Three.js primitive and lathed geometries, standard/toon materials, separate eyelid and mouth meshes, age-scaled head/body proportions, gender-specific but non-stereotyped silhouette and hair variants, and category palettes. Name every animated node so tests and adapters can address it deterministically.

- [ ] **Step 4: Add the VRM adapter**

Register `VRMLoaderPlugin` on `GLTFLoader`; validate license metadata against the manifest before load; map `AvatarPose` to normalized head, neck, chest bones and VRM expression manager keys; optimize loaded scenes with `VRMUtils.removeUnnecessaryVertices` and `combineSkeletons` (the current replacement for deprecated joint removal); dispose failed partial loads.

- [ ] **Step 5: Implement avatar switching and fallback**

Abort obsolete selections with a monotonically increasing request token, retain at most two desktop avatars and one mobile avatar, and fall back to `ProceduralAvatar` on network, parse, metadata, or WebGL-resource failure.

- [ ] **Step 6: Build the themed cartoon scene**

Create one room shell, orthographic-like portrait camera, ambient and key/rim lights, theme-specific palette/decor groups, a contact shadow plane, and deterministic decorative animation. Apply quality profiles without recreating the WebGL context.

- [ ] **Step 7: Add attribution and verify**

Document that all procedural assets are original project code and list every bundled external VRM with its exact license. Run focused tests, typecheck, build, and commit as `feat: render procedural and VRM cartoon avatars`.

## Task 4: MediaPipe Tracking Pipeline and Deterministic Demo

**Files:**
- Create: `src/tracking/TrackingPipeline.ts`, `src/tracking/TrackingPipeline.test.ts`
- Create: `src/tracking/DemoTrackingSource.ts`, `src/tracking/DemoTrackingSource.test.ts`
- Create: `src/camera/CameraController.ts`, `src/camera/CameraController.test.ts`
- Create: `public/models/README.md`
- Add: locally cached MediaPipe hand, face, and pose model bundles under `public/models/`

**Interfaces:**
- Produces: `TrackingSource.start(video: HTMLVideoElement): Promise<void>`
- Produces: `TrackingSource.sample(nowMs: number): Promise<TrackingSnapshot>`
- Produces: `TrackingSource.stop(): void`
- Produces: `CameraController.start(facingMode: 'user' | 'environment'): Promise<HTMLVideoElement>`

- [ ] **Step 1: Write failing scheduler and camera tests**

Use injected fake trackers and clocks to assert hand, face, and pose sampling cadences; no overlapping calls; latest-snapshot reuse; hidden-page suspension; facing-mode restart; stopped media tracks; and camera-denial error classification.

- [ ] **Step 2: Write failing deterministic demo tests**

At fixed timestamps assert the demo produces two open-L hands, a moving face transform, blink and jaw blendshapes, and shoulder motion. Assert repeatability for the same timestamp.

- [ ] **Step 3: Run focused tests and verify failure**

Run `npm run test:run -- src/tracking/TrackingPipeline.test.ts src/tracking/DemoTrackingSource.test.ts src/camera/CameraController.test.ts`.

- [ ] **Step 4: Implement MediaPipe adapters and scheduler**

Create Hand, Face, and Pose Landmarkers in VIDEO mode with GPU delegation where available. Enable face blendshapes and facial transformation matrices. Stagger calls by target cadence, prevent re-entry, and return the most recent successful result when a task is not due.

- [ ] **Step 5: Add worker capability probe and fallback**

Detect Worker, `createImageBitmap`, and transferable bitmap support. Use the worker path when all are available; otherwise use the staggered main-thread scheduler. Record the chosen mode in status without treating fallback as an error.

- [ ] **Step 6: Implement camera and demo sources**

Request 1280x720 ideal user-facing video, retry with generic video constraints on constraint failure, stop old tracks on camera switch, and implement `?demo` with a generated animated canvas and deterministic tracking source.

- [ ] **Step 7: Cache model bundles locally and verify**

Download the official compatible MediaPipe task bundles into `public/models`, record their source URLs and versions in `public/models/README.md`, run tests and build with network disabled after install, and commit as `feat: add local face pose and hand tracking`.

## Task 5: Hand Mask, Compositor, UI, and Application Lifecycle

**Files:**
- Create: `src/compositor/HandMask.ts`, `src/compositor/HandMask.test.ts`
- Create: `src/compositor/FrameCompositor.ts`, `src/compositor/FrameCompositor.test.ts`
- Create: `src/fallback/ToonRenderer.ts`
- Create: `src/ui/AppUI.ts`, `src/ui/AppUI.test.ts`
- Create: `src/app/AppController.ts`, `src/app/AppController.test.ts`
- Modify: `src/main.ts`, `src/styles.css`, `index.html`

**Interfaces:**
- Consumes: camera video, `FingerFrameState`, scene canvas, role selection, quality selection
- Produces: `FrameCompositor.draw(input: CompositeInput): void`
- Produces: `AppController.start(): Promise<void>` and `AppController.stop(): void`

- [ ] **Step 1: Write failing hand-mask and compositor tests**

Use a recording 2D context to prove the draw order is camera, clipped scene, hand mask, then frame decoration. Assert hand masks include palm hulls, widened finger chains, and a wrist-to-forearm extension. Assert zero opacity skips the 3D draw.

- [ ] **Step 2: Write failing UI and lifecycle tests**

Test the default adult-female role, saved role restoration, invalid storage fallback, quality and camera events, permission errors, WebGL fallback activation, visibility pause/resume, and complete media/renderer disposal.

- [ ] **Step 3: Run focused tests and verify failure**

Run `npm run test:run -- src/compositor src/ui src/app`.

- [ ] **Step 4: Implement hand masking and composition**

Construct a reduced-resolution alpha mask from landmark palm hulls and quadratic finger strokes, blur/feather it, and use `source-in` to restore camera pixels above the 3D scene. Preserve the original dashed outline and pulsing corners.

- [ ] **Step 5: Implement responsive controls**

Add compact segmented controls with 44 px minimum mobile targets, safe-area insets, a collapsed mobile panel, loading progress, current tracker mode, quality, and FPS. Keep controls outside the central face/frame region.

- [ ] **Step 6: Orchestrate the complete application**

Wire camera/demo source, tracking, finger frame, motion mapper, avatar scene, quality controller, compositor, and UI. Add requestAnimationFrame cancellation, page visibility suspension, resize handling, camera switch restart, and error-to-fallback transitions.

- [ ] **Step 7: Verify and commit**

Run all unit tests, lint, typecheck, and build. Start Vite and manually inspect `/?demo` at desktop and mobile viewports. Commit as `feat: integrate realtime 3d finger frame experience`.

## Task 6: Browser Acceptance, Documentation, and Final Hardening

**Files:**
- Create: `playwright.config.ts`, `tests/app.spec.ts`
- Modify: `README.md`
- Create: `docs/ARCHITECTURE.md`, `docs/ASSET_LICENSES.md`
- Modify as failures require: `src/**`

**Interfaces:**
- Consumes: complete built application and deterministic `?demo` mode
- Produces: reproducible acceptance commands and deployment documentation

- [ ] **Step 1: Write Playwright acceptance tests**

Test that demo mode reaches ready state, all eight roles can be selected, the frame becomes active, the 3D canvas is composited, quality modes change, role choice persists after reload, no page errors occur, and narrow iPhone-like viewport controls remain accessible. Capture stable screenshots at desktop and iPhone-like viewports after the deterministic demo clock reaches the framed state; compare camera, quad clip, avatar, hand overlay, and frame-decoration layers with checked-in snapshots.

- [ ] **Step 2: Run tests and capture failures**

Run `npm run build && npm run test:e2e`. Record each failure as a direct implementation defect rather than weakening assertions.

- [ ] **Step 3: Fix browser and lifecycle defects**

Resolve canvas sizing, Safari-safe media calls, model URL base handling, WebGL disposal, mobile control overflow, and race conditions found by the acceptance suite. Re-run the failing test after every fix.

- [ ] **Step 4: Document operation and deployment**

Rewrite README with `npm install`, `npm run dev`, `npm run build`, static hosting requirements, HTTPS camera requirement, demo mode, controls, privacy behavior, quality behavior, browser targets, and known hardware-dependent performance variation. Document module boundaries and exact asset licenses.

- [ ] **Step 5: Run the final verification matrix**

Run `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build`, and `npm run test:e2e`. Start `npm run dev -- --host 0.0.0.0`, open `/?demo`, and confirm there are no console errors.

- [ ] **Step 6: Review diff and commit**

Inspect `git status`, `git diff --check`, and `git diff origin/main...HEAD`. Commit final hardening as `docs: add deployment and acceptance guidance`.
