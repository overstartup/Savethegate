# 1. creatures.js
with open('game/src/render/creatures.js', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = "    const mult = m.boss ? 3.0 : (m.type === 'troll' ? 2.6 : (m.type === 'imp' ? 2.4 : 2.3));"
replacement1 = "    const mult = (m.boss && m.skin === 'kraken') ? 1.85 : (m.boss ? 2.2 : (m.type === 'troll' ? 2.6 : (m.type === 'imp' ? 2.4 : 2.3)));"

if target1 in text:
    text = text.replace(target1, replacement1, 1)
    with open('game/src/render/creatures.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated creatures.js mult")
else:
    print("Target 1 not found in creatures.js")

# 2. bosses.js
with open('game/src/systems/bosses.js', 'r', encoding='utf-8') as f:
    text = f.read()

target2 = "  miniScale: 1.8,      // captain / warlord size vs the regular species\n  miniHp: 0.6,         // share of the old boss-hp formula a captain gets\n  finalScale: 1.25,    // stage boss size vs before"
replacement2 = "  miniScale: 1.4,      // captain / warlord size vs the regular species\n  miniHp: 0.6,         // share of the old boss-hp formula a captain gets\n  finalScale: 1.0,     // stage boss size vs before"

if target2 not in text and target2.replace('\n', '\r\n') in text:
    target2 = target2.replace('\n', '\r\n')
    replacement2 = replacement2.replace('\n', '\r\n')

if target2 in text:
    text = text.replace(target2, replacement2, 1)
    with open('game/src/systems/bosses.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated bosses.js scales")
else:
    print("Target 2 not found in bosses.js")

# 3. monsters.js
with open('game/src/data/monsters.js', 'r', encoding='utf-8') as f:
    text = f.read()

target3 = "  ogreBoss: { hp: 30, speed: 0.3, coins: 25, size: 92, color: '#7a3fa0', boss: true,"
replacement3 = "  ogreBoss: { hp: 30, speed: 0.3, coins: 25, size: 76, color: '#7a3fa0', boss: true,"

if target3 in text:
    text = text.replace(target3, replacement3, 1)
    with open('game/src/data/monsters.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated monsters.js ogreBoss size")
else:
    print("Target 3 not found in monsters.js")

