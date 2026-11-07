with open('game/src/render/creatures.js', 'r', encoding='utf-8') as f:
    c = f.read()

target = "(m.skin === 'crab' ? 2.7 :"
replacement = "(m.skin === 'crab' || m.skin === 'frostling' ? 2.7 :"

if target in c:
    c = c.replace(target, replacement)
    with open('game/src/render/creatures.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated creatures.js mult!")
else:
    print("Target not found!")
