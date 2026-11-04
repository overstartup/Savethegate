with open('game/src/systems/collision.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''      const dx = s.x - m.x, dy = s.y - m.y, rr = s.r + m.r;
      if (dx * dx + dy * dy <= rr * rr) {'''

replacement = '''      const hit = m.hitTest ? m.hitTest(s.x, s.y, s.r) : ((s.x - m.x) ** 2 + (s.y - m.y) ** 2 <= (s.r + m.r) ** 2);
      if (hit) {'''

# Handle CRLF
if target not in text and target.replace('\n', '\r\n') in text:
    target = target.replace('\n', '\r\n')
    replacement = replacement.replace('\n', '\r\n')

if target in text:
    text = text.replace(target, replacement, 1)
    with open('game/src/systems/collision.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated collision.js successfully")
else:
    print("Target not found in collision.js")

