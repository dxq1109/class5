"""
生成展厅风格的装饰素材（梦幻天空 / 云朵精灵）。
用法：python tools/make-art.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(20250605)


def smoothstep(x, a, b):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def noise_layer(h, w, cells, r):
    small = (r.random((cells, cells)) * 255).astype(np.uint8)
    img = Image.fromarray(small).resize((w, h), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32) / 255.0


# ---------- 1. 梦幻天空 ----------
W, H = 2400, 1500
X, Y = np.meshgrid(
    np.linspace(0, 1, W, dtype=np.float32),
    np.linspace(0, 1, H, dtype=np.float32),
)

c_top = np.array([0x9C, 0xC4, 0xE8], dtype=np.float32)
c_mid = np.array([0xD7, 0xE8, 0xF7], dtype=np.float32)
c_bot = np.array([0xFD, 0xFE, 0xFF], dtype=np.float32)

t = smoothstep(Y, 0.0, 0.85)
col = c_top[None, None, :] * (1 - t[..., None]) + c_mid[None, None, :] * t[..., None]
t2 = smoothstep(Y, 0.55, 1.0)
col = col * (1 - t2[..., None]) + c_bot[None, None, :] * t2[..., None]

cloud = (
    noise_layer(H, W, 3, rng) * 0.52
    + noise_layer(H, W, 6, rng) * 0.28
    + noise_layer(H, W, 12, rng) * 0.14
    + noise_layer(H, W, 24, rng) * 0.06
)
cloud = smoothstep(cloud, 0.46, 0.78)
env = 0.42 + 0.58 * (1 - Y)
mask = np.clip(cloud * env, 0, 1)

lav = noise_layer(H, W, 4, rng)
cloud_rgb = np.zeros((H, W, 3), dtype=np.float32)
cloud_rgb[..., 0] = 255.0
cloud_rgb[..., 1] = 252.0 - 4.0 * lav
cloud_rgb[..., 2] = 255.0 - 5.0 * lav

alpha = (mask ** 0.8)[..., None] * 0.96
img = col * (1 - alpha) + cloud_rgb * alpha

# 左上暖阳
r = np.sqrt((X - 0.12) ** 2 + (Y - 0.08) ** 2)
glow = np.exp(-(r * r) / 0.015)[..., None]
img = img + glow * np.array([255, 246, 226], dtype=np.float32) * 0.55
# 右下冷光
r2 = np.sqrt((X - 0.9) ** 2 + (Y - 0.95) ** 2)
glow2 = np.exp(-(r2 * r2) / 0.03)[..., None]
img = img + glow2 * np.array([233, 240, 252], dtype=np.float32) * 0.5

img = np.clip(img, 0, 255)
im = Image.fromarray(img.astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
arr = np.asarray(im, dtype=np.float32)
arr = np.clip(arr + rng.normal(0, 1.2, arr.shape), 0, 255)
Image.fromarray(arr.astype(np.uint8)).save(os.path.join(OUT, 'sky.jpg'), quality=90)
print('sky.jpg ok', W, 'x', H)


# ---------- 2. 云朵精灵（透明 PNG，供漂浮装饰用） ----------
def cloud_sprite(w, h, seed):
    rr = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w]
    base = np.zeros((h, w), dtype=np.float32)
    blobs = [
        (0.28, 0.56, 0.30), (0.47, 0.44, 0.36),
        (0.67, 0.54, 0.29), (0.50, 0.66, 0.33),
        (0.14, 0.64, 0.20), (0.82, 0.64, 0.20),
    ]
    for cx, cy, rad in blobs:
        d = np.sqrt(((xx / w - cx) / rad) ** 2 + ((yy / h - cy) / (rad * 1.25)) ** 2)
        base += np.exp(-(d ** 2) * 2.2)
    base = np.clip(base * 0.52, 0, 1)
    alpha = (base ** 1.05 * 240).astype(np.uint8)
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., 0] = 255
    rgba[..., 1] = 255
    rgba[..., 2] = 255
    rgba[..., 3] = alpha
    return Image.fromarray(rgba, 'RGBA').filter(ImageFilter.GaussianBlur(9))


cloud_sprite(640, 300, seed=1).save(os.path.join(OUT, 'cloud1.png'))
cloud_sprite(460, 220, seed=2).save(os.path.join(OUT, 'cloud2.png'))
print('clouds ok')
