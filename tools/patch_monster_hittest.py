with open('game/src/entities/monster.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '  // kick scales the knock-back'
replacement = '''  hitTest(sx, sy, sr = 0) {
    if (this.boss) {
      if (this.skin === 'kraken') {
        // Only the central crowned head/mantle/torso counts as a hit, not the outer tentacles/legs
        const mult = 1.85;
        const h = this.r * mult;
        const w = h * 1.46;
        const bodyY = this.y - h * 0.15;
        const rx = w * 0.17 + sr;
        const ry = h * 0.28 + sr;
        const dx = (sx - this.x) / rx;
        const dy = (sy - bodyY) / ry;
        return dx * dx + dy * dy <= 1.0;
      }
      // General boss body: tighter central core so limb sweeps don't catch bullets prematurely
      const bodyY = this.y - this.r * 0.12;
      const rx = this.r * 0.65 + sr;
      const ry = this.r * 0.75 + sr;
      const dx = (sx - this.x) / rx;
      const dy = (sy - bodyY) / ry;
      return dx * dx + dy * dy <= 1.0;
    }
    const dx = sx - this.x, dy = sy - this.y, rr = sr + this.r;
    return dx * dx + dy * dy <= rr * rr;
  }

  // kick scales the knock-back'''

if target in text:
    text = text.replace(target, replacement, 1)
    with open('game/src/entities/monster.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Added hitTest to monster.js successfully")
else:
    print("Target not found in monster.js")

