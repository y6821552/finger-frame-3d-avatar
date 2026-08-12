# Local MediaPipe runtime assets

The application serves inference models and WASM from its own static origin. Camera frames remain in the browser and are never sent to these source hosts.

| Local file | Official source | SHA-256 |
| --- | --- | --- |
| `hand_landmarker.task` | `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task` | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` |
| `face_landmarker.task` | `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task` | `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` |
| `pose_landmarker_lite.task` | `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task` | `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a` |

The files under `public/wasm/` are copied unchanged from `@mediapipe/tasks-vision@1.0.1`. Their hashes are reproducible from the installed package and are verified by the repository's asset test.

Run `npm ci` or `npm run prepare:assets` to create these ignored runtime files. The bootstrap script rejects any downloaded model whose SHA-256 does not match this table.
