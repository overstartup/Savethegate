// ============================================================
// Unified input: touch drag, mouse drag, arrow/WASD keys.
// Free 2D movement: exposes targetX/targetY in design coords.
// ============================================================
export function createInput(canvas, designWidth, designHeight) {
  let pointerX = null;
  let pointerY = null;
  let keys = { left: false, right: false, up: false, down: false };

  // Map screen pixels → fixed design coordinates (canvas.width is
  // physical pixels after DPR scaling, so use design size instead).
  const toLocal = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    return [
      ((clientX - r.left) / r.width) * designWidth,
      ((clientY - r.top) / r.height) * designHeight,
    ];
  };

  const tapHandlers = [];
  const releaseHandlers = [];
  canvas.addEventListener('pointerdown', (e) => {
    [pointerX, pointerY] = toLocal(e.clientX, e.clientY);
    tapHandlers.forEach((fn) => fn(pointerX, pointerY));
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons || e.pointerType === 'touch') {
      [pointerX, pointerY] = toLocal(e.clientX, e.clientY);
    }
  });
  window.addEventListener('pointerup', (e) => {
    // Prefer the release event's own coordinates (works even for a quick
    // tap-and-release with no move events in between); fall back to the
    // last known drag position if the event has no usable client coords.
    let rx = pointerX, ry = pointerY;
    if (e && typeof e.clientX === 'number') [rx, ry] = toLocal(e.clientX, e.clientY);
    releaseHandlers.forEach((fn) => fn(rx, ry));
    pointerX = null; pointerY = null;
  });

  const keymap = {
    ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
    ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
  };
  window.addEventListener('keydown', (e) => {
    const k = keymap[e.key];
    if (k) keys[k] = true;
    if (e.key === ' ' || e.key === 'Enter') tapHandlers.forEach((fn) => fn(null, null));
  });
  window.addEventListener('keyup', (e) => {
    const k = keymap[e.key];
    if (k) keys[k] = false;
  });

  return {
    targetX(currentX) {
      if (pointerX !== null) return pointerX;
      if (keys.left && !keys.right) return currentX - 1000;
      if (keys.right && !keys.left) return currentX + 1000;
      return currentX;
    },
    targetY(currentY) {
      if (pointerY !== null) return pointerY;
      if (keys.up && !keys.down) return currentY - 1000;
      if (keys.down && !keys.up) return currentY + 1000;
      return currentY;
    },
    onTap(fn) { tapHandlers.push(fn); },
    onRelease(fn) { releaseHandlers.push(fn); },
  };
}
