# Architecture

## 设计目标

项目把摄像头、跟踪、动作映射、角色渲染和最终合成分离，使跟踪器或角色资产可以独立替换。运行时不需要服务端推理。

## 组件

| 组件 | 职责 |
| --- | --- |
| `CameraController` / `FrameInput` | 摄像头生命周期、前后摄切换、确定性演示输入 |
| `TrackingPipeline` | MediaPipe Hand、Face、Pose 初始化与采样 |
| `FingerFrameTracker` | 两只手的 L 形识别、四边形计算、平滑与丢失恢复 |
| `MotionMapper` | 将 landmarks、blendshapes 和矩阵映射为渲染器无关姿态 |
| `AvatarManager` | 程序化角色选择及未来许可 VRM 的加载边界 |
| `CartoonScene` | Three.js 透明 AR 场景和角色渲染 |
| `ToonRenderer` | WebGL 不可用时的 Canvas 2D 降级 |
| `HandMask` / `FrameCompositor` | 摄像头、角色、真实手部和取景框的最终合成 |
| `QualityController` | 根据设备与帧耗时选择渲染档位 |

## 数据流

所有跟踪数据只存在于浏览器内存：

```text
FrameInput → TrackingSource → TrackingSnapshot
                              ├─ FingerFrameTracker → FingerFrameState
                              └─ MotionMapper → AvatarPose
AvatarPose → 3D/2D renderer → FrameCompositor → output canvas
```

## 扩展边界

新的角色实现 `Avatar` 接口；新的跟踪实现 `TrackingSource` 接口；渲染器只消费 `AvatarPose`，不依赖 MediaPipe 的原始结构。

## 安全与隐私

- 模型和 WASM 静态托管，不运行远程模型代码；
- 不提供上传摄像头帧的网络路径；
- 角色类别由用户选择，不从人脸推断年龄或性别；
- 新资产必须通过许可和完整性检查。
