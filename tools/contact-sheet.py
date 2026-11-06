"""
生成照片缩略图拼版（contact sheet），便于快速浏览全部照片内容。
用法：python tools/contact-sheet.py
输出：screenshots/contact-1.png ...（每版 24 张，带编号）
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r'E:\班级网站\images'
OUT = r'E:\班级网站\screenshots'
EXCLUDE = {'素材'}
os.makedirs(OUT, exist_ok=True)

files = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE]
    for fn in filenames:
        if os.path.splitext(fn)[1].lower() in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
            files.append(os.path.relpath(os.path.join(dirpath, fn), ROOT).replace('\\', '/'))
files.sort()
print(f'共 {len(files)} 张')
for i, f in enumerate(files, 1):
    print(f'{i:02d}\t{f}')

try:
    font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 17)
except Exception:
    font = ImageFont.load_default()

COLS, ROWS = 6, 4
TW, TH, M = 296, 222, 10
W = COLS * (TW + M) + M
H = ROWS * (TH + 30 + M) + M

for start in range(0, len(files), COLS * ROWS):
    batch = list(enumerate(files, 1))[start:start + COLS * ROWS]
    sheet = Image.new('RGB', (W, H), (16, 18, 26))
    draw = ImageDraw.Draw(sheet)
    for k, (idx, rel) in enumerate(batch):
        r, c = divmod(k, COLS)
        x = M + c * (TW + M)
        y = M + r * (TH + 30 + M)
        try:
            im = Image.open(os.path.join(ROOT, rel)).convert('RGB')
            im.thumbnail((TW, TH))
            sheet.paste(im, (x + (TW - im.width) // 2, y + (TH - im.height) // 2))
        except Exception:
            pass
        draw.rectangle([x, y + TH, x + TW, y + TH + 30], fill=(28, 32, 46))
        draw.text((x + 6, y + TH + 5), f'#{idx:02d} {os.path.basename(rel)[:26]}', fill=(226, 232, 244), font=font)
    name = f'contact-{start // (COLS * ROWS) + 1}.png'
    sheet.save(os.path.join(OUT, name), quality=88)
    print('saved', name)
