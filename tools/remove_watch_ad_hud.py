with open('game/src/ui/hud.js', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = "  watchAd: { x: CONFIG.width / 2 - 34, y: CONFIG.height - 114, w: 68, h: 44 },\n"
if target1 in text:
    text = text.replace(target1, "")
    print("Removed watchAd from BUTTONS")
else:
    # Try CRLF
    target1_crlf = "  watchAd: { x: CONFIG.width / 2 - 34, y: CONFIG.height - 114, w: 68, h: 44 },\r\n"
    if target1_crlf in text:
        text = text.replace(target1_crlf, "")
        print("Removed watchAd from BUTTONS (CRLF)")
    else:
        print("Could not find watchAd in BUTTONS")

target2 = "  if (adsReady) drawButton(ctx, 'watchAd', state, adsReady);\n"
if target2 in text:
    text = text.replace(target2, "")
    print("Removed drawButton watchAd")
else:
    target2_crlf = "  if (adsReady) drawButton(ctx, 'watchAd', state, adsReady);\r\n"
    if target2_crlf in text:
        text = text.replace(target2_crlf, "")
        print("Removed drawButton watchAd (CRLF)")
    else:
        print("Could not find drawButton watchAd")

with open('game/src/ui/hud.js', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated hud.js successfully")

