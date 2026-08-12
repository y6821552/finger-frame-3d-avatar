# Finger Frame 3D Avatar Design

## Goal

Replace the original local Canvas 2D effect inside the tracked finger frame with a locally rendered 3D cartoon world. A fixed, prebuilt avatar follows the user's head, facial expression, shoulders, and upper-body motion in real time. The camera stream never leaves the browser and no generative video service is used.

The application must run on desktop Chrome, Android Chrome, and iPhone Safari. Users manually choose one of eight fixed avatar categories: child, teenager, adult, or senior, each available as male or female.

## Scope

The first release includes:

- the original two-hand finger-frame gesture and tracking behavior;
- eight fixed avatar selections grouped by age and gender;
- face, head, and upper-body motion capture;
- a lightweight 3D cartoon environment rendered only inside the finger frame;
- real camera hands composited above the 3D scene;
- automatic high, medium, and low quality modes;
- graceful fallback when tracking, WebGL, or avatar loading fails;
- deterministic demo mode and automated tests.

It does not include automatic age or gender classification, full-body capture, generated video, server-side processing, accounts, uploaded recordings, or an avatar editor.

## Architecture

The current single-file application is migrated to Vite and TypeScript and divided into bounded modules:

- `CameraController`: camera permission, mirroring, sizing, and camera switching.
- `TrackingPipeline`: schedules MediaPipe hand, face, and pose tasks and exposes the latest immutable tracking snapshot.
- `FingerFrameTracker`: retains the audited quad ordering, gesture hysteresis, teleport rejection, smoothing, and dropout hold from the original application.
- `MotionMapper`: maps face blendshapes and pose landmarks to a renderer-neutral avatar pose.
- `AvatarManager`: loads, switches, caches, and disposes VRM avatars.
- `CartoonScene`: owns the Three.js camera, lighting, environment, and current avatar.
- `ThreeRenderer`: renders the cartoon world to an offscreen canvas.
- `FrameCompositor`: draws the mirrored camera, clips the 3D canvas to the tracked quad, restores real hands above it, and draws the frame decoration.
- `QualityController`: selects and changes high, medium, or low render quality using device hints and measured frame time.
- `AppUI`: age, gender, camera, quality, status, and FPS controls.

MediaPipe output and rendering are decoupled. Tracking updates the most recent motion state at its own cadence; Three.js renders every presentation frame using smoothed state, so a slow inference frame does not freeze animation.

## Avatar and Asset Policy

The visible selector exposes eight fixed roles:

| Age | Male | Female |
| --- | --- | --- |
| Child | Child male | Child female |
| Teenager | Teen male | Teen female |
| Adult | Adult male | Adult female |
| Senior | Senior male | Senior female |

VRM 1.0 is the preferred external avatar format. Every distributed external asset must have an explicit license allowing redistribution and modification. Each asset records its source, author, license, and attribution. Assets with unclear terms, personal-use-only terms, or a no-redistribution restriction are excluded.

The application also includes an original lightweight procedural cartoon avatar for every category. These built-in avatars are the guaranteed offline fallback and make the application independently runnable while licensed VRM assets are loaded or unavailable. The procedural avatars implement the same renderer-neutral pose contract as VRM avatars.

Only the selected avatar is required on mobile. Desktop may retain the two most recently used avatars. Textures and meshes are compressed where licensing and source formats permit.

## Cartoon Environment

A shared lightweight environment supplies the room geometry, with age-specific palettes and decorations:

- child: bright soft colors, cloud and toy motifs;
- teenager: lively cartoon studio;
- adult: warm, uncluttered animated-film interior;
- senior: quiet study with a stylized window view.

The selected avatar is framed from the chest upward. Its arms remain below the main visible area to avoid competing with the user's real hands.

## Motion Mapping

MediaPipe Face Landmarker supplies a facial transform, face landmarks, and blendshape coefficients. Pose Landmarker supplies shoulders and upper torso landmarks.

| Tracking signal | Avatar output |
| --- | --- |
| Facial transformation | Head yaw, pitch, and roll |
| Eye blink coefficients | Independent eyelid closure |
| Eye landmarks | Small eye-gaze offset |
| Jaw open | Mouth opening |
| Smile coefficients | Smile expression |
| Brow coefficients | Brow raise and frown |
| Shoulder landmarks | Shoulder height and torso roll |
| Nose-to-shoulder offset | Upper-body horizontal movement |

All rotations and expressions are clamped, low-pass filtered, and returned toward neutral when tracking is lost. Face loss is held for approximately 300 ms before a gradual neutral transition. Pose loss leaves facial animation active and uses an idle breathing motion for the torso.

## Rendering and Compositing

The composition order is:

1. mirrored live camera frame;
2. 3D scene clipped to the valid finger-frame quad;
3. feathered real-hand overlay derived from hand landmarks;
4. dashed frame outline and animated corner markers;
5. status and selection UI.

The 3D window fades in and out over roughly 200–300 ms. A short hand-tracking dropout holds the previous quad according to the original application's behavior.

The hand overlay uses a filled and feathered landmark hull plus widened finger and forearm strokes. It is intentionally isolated behind a mask interface so a future pixel-accurate hand segmentation model can replace it without changing the compositor.

## Performance

Tracking cadences are independent and adaptive:

| Task | Desktop target | Mobile target |
| --- | ---: | ---: |
| Hand tracking | 24–30 FPS | 18–24 FPS |
| Face tracking | 20–24 FPS | 15–20 FPS |
| Pose tracking | 12–15 FPS | 8–12 FPS |
| 3D rendering | 30–60 FPS | 24–30 FPS |

Quality presets:

| Preset | Approximate render size | Effects |
| --- | --- | --- |
| High | 960x540 | soft shadow, rim light, restrained bloom |
| Medium | 640x360 | lower-resolution shadow, simplified post-processing |
| Low | 480x270 | baked lighting, no real-time shadow |

Automatic mode starts from device capability hints and decreases quality after sustained missed frame targets. It does not automatically oscillate upward during the same session. Manual quality selection overrides adaptation.

MediaPipe inference is placed in a worker where transferable browser primitives are reliable. A main-thread staggered scheduler remains available as a compatibility fallback, particularly for constrained Safari versions. Hidden pages suspend camera inference and rendering.

## UI

The application remains camera-first. A compact toolbar provides:

- four age choices;
- two gender choices;
- front/rear camera selection when supported;
- automatic/high/medium/low quality;
- model loading, permission, tracking, and FPS status.

Selection is stored locally. The initial selection is adult female. No biometric attributes are inferred or stored.

## Failure Handling

- Camera denial shows actionable browser permission guidance and leaves demo mode available.
- External VRM failure activates the matching built-in procedural avatar.
- Face loss holds briefly, then returns to idle.
- Pose loss retains face animation and idle torso movement.
- Hand loss fades the 3D window while the live camera continues.
- WebGL failure falls back to the original Toon effect.
- Sustained low performance lowers render resolution and disables shadows.
- Background tabs suspend processing and safely resume after visibility returns.

## Testing and Acceptance

Automated verification includes:

- Vitest unit tests for quad tracking, expression mapping, clamping, smoothing, role selection, quality adaptation, and loss recovery;
- Playwright tests using deterministic demo video and fake landmarks;
- avatar-manifest validation for all eight roles, asset URLs, licenses, required bones/expressions, and fallback availability;
- screenshot tests for the camera layer, quad clipping, 3D scene, hand overlay, and frame decoration;
- build, type-check, and lint checks.

Manual device acceptance covers Windows Chrome, Android Chrome, and iPhone Safari.

Target outcomes:

- desktop camera rendering remains at or above 30 FPS at the normal 720p input size on a typical modern machine;
- mobile automatic quality aims for at least 24 FPS during the primary interaction;
- visible blink and mouth response is approximately 200 ms or less on target devices;
- every role can be selected without reloading the page;
- an asset or tracker failure does not crash the camera experience;
- no camera frame is uploaded and runtime network activity is limited to application assets.

