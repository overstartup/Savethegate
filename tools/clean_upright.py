with open('game/src/render/creatures.js', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Eliminate crClamp rotation
old_rot = """  // Keep front-facing creatures upright - no leaning sideways!
  if (extraRot) {
    ctx.rotate(extraRot); // Corpse ragdoll spin
  } else if (!m.frameImg) {
    ctx.rotate(crClamp(m.vx / 320, -0.15, 0.15) * 0.2);
  }"""

new_rot = """  // Keep front-facing creatures strictly upright - no leaning or tilting sideways!
  if (extraRot) {
    ctx.rotate(extraRot); // Corpse ragdoll spin only when dead
  }"""

if old_rot in c:
    c = c.replace(old_rot, new_rot)
    print("Replaced crClamp rotation")
else:
    print("Warning: old_rot pattern not found directly, checking variations")
    import re
    c = re.sub(
        r'// Keep front-facing creatures[^\n]*\n\s*if\s*\(extraRot\)\s*\{\s*ctx\.rotate\(extraRot\);\s*\}\s*else if\s*\(!m\.frameImg\)\s*\{\s*ctx\.rotate\(crClamp\(m\.vx[^\n]+\);\s*\}',
        new_rot,
        c
    )

# 2. Eliminate waddle rotation
if 'ctx.rotate(waddle);' in c:
    c = c.replace('ctx.rotate(waddle);', '// ctx.rotate(waddle); // disabled to keep front-facing monsters strictly upright')
    print("Replaced waddle rotation")

# 3. Eliminate burst rotation
old_burst = "if (ph === 'burst') ctx.rotate(Math.sign(m.pvx || 1) * 0.5);"
if old_burst in c:
    c = c.replace(old_burst, "// burst rotation disabled to keep upright")
    print("Replaced burst rotation")

with open('game/src/render/creatures.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("Creatures upright patch complete!")
