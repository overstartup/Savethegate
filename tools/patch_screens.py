with open('game/src/ui/screens.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '  img.src = `assets/sprites/sea/${name}.webp`;'
replacement = '  SEA_SPRITES[name] = img;\n  if (typeof SPECIES !== "undefined" && SPECIES[name]) SPECIES[name].sprite = img;\n  img.src = `assets/sprites/sea/${name}.webp`;'

if target in text:
    text = text.replace(target, replacement, 1)
    with open('game/src/ui/screens.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Replaced screens.js successfully')
else:
    print('Target not found in screens.js')

