# Optimization Plan (Memory and Speed)

This plan focuses on improving the performance and reducing the memory footprint of the GateWall game on Android.

## Proposed Changes

### 1. Rendering Optimization

#### [MODIFY] [main.js](file:///C:/ov371/prj/Game/Save%20the%20gate/game/src/main.js)
- **Remove Expensive Effects**: Disable `ctx.shadowBlur` on mobile devices. It is extremely slow on many mobile GPUs.
- **Offscreen Canvas for Static UI**: Pre-render the "GateWall" and other static UI elements to an offscreen canvas.
- **Layered Rendering**: If possible, use separate canvases for the background, the game entities, and the HUD to reduce redrawing overhead.

### 2. Particle System Optimization

#### [MODIFY] [particles.js](file:///C:/ov371/prj/Game/Save%20the%20gate/game/src/systems/particles.js)
- **Object Pooling**: Instead of creating and filtering objects every frame, reuse particle objects from a pre-allocated pool to reduce Garbage Collection (GC) pressure.
- **In-place updates**: Update the list array by swapping elements to the end instead of calling `.filter()`.

### 3. Memory & Asset Optimization

#### [MODIFY] [build-standalone.mjs](file:///C:/ov371/prj/Game/Save%20the%20gate/game/build-standalone.mjs)
- **Stop Inlining Large Assets**: Modify the build script to copy images to the `www/assets` folder instead of inlining them as Base64 data URIs in `index.html`. This will significantly reduce the initial load time and memory usage of the WebView.

#### [MODIFY] [main.js](file:///C:/ov371/prj/Game/Save%20the%20gate/game/src/main.js) & [screens.js](file:///C:/ov371/prj/Game/Save%20the%20gate/game/src/ui/screens.js)
- Update image loading to use relative paths (e.g., `assets/env/...`) instead of expecting inlined `BG_DATA`.

### 4. Logic & Collision Optimization

#### [MODIFY] [collision.js](file:///C:/ov371/prj/Game/Save%20the%20gate/game/src/systems/collision.js)
- **Grid-based Partitioning (Broadphase)**: If performance still lags with many entities, implement a simple spatial grid to reduce the number of O(N*M) collision checks.
- **Avoid Object Spread**: Use `.push()` with a loop instead of `...spread` if child monsters are created, to avoid unnecessary array allocations.

## Verification Plan

### Automated Tests
- None.

### Manual Verification
1. Build the project and measure the final `index.html` size (goal: < 500KB).
2. Run on the physical Pixel 4a and monitor frame rate (FPS) during intense scenes (many particles and monsters).
3. Use Chrome DevTools (remote debugging) to check the JS heap size and GC frequency.
