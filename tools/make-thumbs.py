"""
批量生成两档缩略图，提升页面加载/滚动性能。
  thumbs/      → 最长边 720px，q78，用于照片墙/卡片/小图
  thumbs-big/  → 最长边 1600px，q82，用于序厅大图/放映模式
灯箱与下载仍使用原图。
用法：python tools/make-thumbs.py
"""
import os
from PIL import Image, ImageOps

ROOT = r'E:\班级网站'
SRC = os.path.join(ROOT, 'images')
EXCLUDE = {'素材'}
SIZES = [('thumbs', 720, 78), ('thumbs-big', 1600, 82)]

for folder, maxw, quality in SIZES:
    outdir = os.path.join(ROOT, folder)
    os.makedirs(outdir, exist_ok=True)
    count = 0
    for dirpath, dirnames, files in os.walk(SRC):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE]
        for fn in files:
            ext = os.path.splitext(fn)[1].lower()
            if ext not in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
                continue
            src = os.path.join(dirpath, fn)
            rel = os.path.relpath(src, SRC)
            dst = os.path.join(outdir, os.path.splitext(rel)[0] + '.jpg')
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            try:
                im = Image.open(src)
                im = ImageOps.exif_transpose(im).convert('RGB')
                w, h = im.size
                scale = min(1.0, maxw / max(w, h))
                if scale < 1.0:
                    im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
                im.save(dst, 'JPEG', quality=quality, optimize=True, progressive=True)
                count += 1
            except Exception as e:
                print('ERR', src, e)
    print(f'{folder}: {count} 张')
print('done')
