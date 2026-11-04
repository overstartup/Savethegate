with open('game/src/main.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '  startLevel(idx);'
replacement = '  window.state = state;\n  startLevel(idx);'

if target in text:
    text = text.replace(target, replacement, 1)
    with open('game/src/main.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Exposed window.state in main.js')
else:
    print('Target not found in main.js')

