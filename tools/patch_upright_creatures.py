with open('game/src/render/creatures.js', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Stop leaning sideways when moving horizontally
target1 = "ctx.rotate(crClamp(m.vx / 320, -0.4, 0.4) * (m.boss ? 0.25 : 1) + extraRot);"
rep1 = """// Keep front-facing creatures upright - no leaning sideways!
  if (extraRot) {
    ctx.rotate(extraRot); // Corpse ragdoll spin
  } else if (!m.frameImg) {
    ctx.rotate(crClamp(m.vx / 320, -0.15, 0.15) * 0.2);
  }"""
assert target1 in c, "target1 not found in creatures.js"
c = c.replace(target1, rep1)

# 2. Remove attack burst banking tilt
target2 = "if (ph === 'burst') ctx.rotate(Math.sign(m.pvx || 1) * 0.18);"
assert target2 in c, "target2 not found in creatures.js"
c = c.replace(target2, "// No sideways tilt during burst")

# 3. Remove eye look rotation tilt
target3 = """    if (look && typeof look.x === 'number') {
      ctx.rotate(look.x * 0.035); // Subtle creature eye/head tracking
    }"""
assert target3 in c, "target3 not found in creatures.js"
c = c.replace(target3, "    // Upright posture - no sideways tilting")

with open('game/src/render/creatures.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)

print("Updated creatures.js: eliminated sideways leaning tilt successfully")
