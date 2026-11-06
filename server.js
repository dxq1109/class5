/**
 * 班级网站后端服务
 *  - 静态文件托管（本目录即站点根目录）
 *  - 照片 / 视频上传与相册接口
 *  - 留言板接口
 *  - WebSocket 实时聊天室
 *  - 首次启动自动把 images/ 与 videos/ 里的现有素材导入数据库
 *
 * 启动：npm install && npm start
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const express = require('express');
const multer = require('multer');
const { WebSocketServer } = require('ws');

const config = require('./config.json');
const db = require('./db');

const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: '1mb' }));

// 缩略图缺失时自动回退到原图（新加照片还没有生成缩略图也不会 404）
for (const folder of ['thumbs', 'thumbs-big']) {
  app.get(`/${folder}/*`, (req, res, next) => {
    try {
      const rel = decodeURIComponent(req.params[0]);
      const file = path.join(__dirname, folder, rel);
      if (fs.existsSync(file)) return next(); // 存在则交给静态托管
      const base = path.join(__dirname, 'images', rel.replace(/\.jpg$/i, ''));
      for (const ext of ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.JPG', '.JPEG', '.PNG']) {
        if (fs.existsSync(base + ext)) return res.sendFile(base + ext);
      }
    } catch { /* 忽略异常，继续 */ }
    next();
  });
}

app.use(express.static(__dirname, { index: 'index.html' }));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const uid = () => Date.now().toString(36) + crypto.randomBytes(4).toString('hex');

/* ============ 首次启动：导入现有素材 ============ */
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.m4v'];

function toWebPath(abs) {
  return abs.replace(/\\/g, '/').replace(/^\.\//, '');
}

function seedMedia() {
  const baseDir = __dirname;
  const existing = new Set(db.db.photos.map(p => p.path));
  let added = 0;

  const photoDirs = {
    images: 'image',
    videos: 'video'
  };

  for (const [dirName, type] of Object.entries(photoDirs)) {
    const root = path.join(baseDir, dirName);
    if (!fs.existsSync(root)) continue;

    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        const ext = path.extname(entry.name).toLowerCase();
        const isImg = IMAGE_EXTS.includes(ext);
        const isVid = VIDEO_EXTS.includes(ext);
        if (!isImg && !isVid) continue;

        const rel = path.relative(root, full); // e.g. 志愿活动\xx.jpg 或 xx.mp4
        const parts = rel.split(path.sep);
        let category;
        if (parts.length > 1) {
          category = parts[0];
        } else {
          category = entry.name.includes('项目展示') ? '项目展示' : '班级视频';
        }
        if (category === '素材') continue; // 素材文件夹是页面装饰背景，不进相册

        const webPath = toWebPath(path.relative(baseDir, full));
        if (existing.has(webPath)) continue; // 增量导入：只处理新增文件

        let stat;
        try { stat = fs.statSync(full); } catch { continue; }

        db.db.photos.push({
          id: 'seed-' + crypto.createHash('md5').update(rel).digest('hex').slice(0, 10),
          path: webPath,
          category,
          name: entry.name.replace(/\.[^.]+$/, ''),
          type: isVid ? 'video' : 'image',
          uploader: '班级素材',
          time: stat.mtimeMs,
          likesBy: [],
          seeded: true
        });
        existing.add(webPath);
        added++;
      }
    };
    walk(root);
  }

  // 清理已被删除的素材文件记录（不影响同学上传的内容）
  const before = db.db.photos.length;
  db.db.photos = db.db.photos.filter(p => {
    if (!p.seeded) return true;
    return fs.existsSync(path.join(baseDir, p.path));
  });
  const removed = before - db.db.photos.length;

  db.db.photos.sort((a, b) => a.time - b.time);
  db.db.meta.seeded = true;
  if (added || removed) {
    db.persist();
    console.log(`[seed] 增量导入：新增 ${added} 个，移除失效 ${removed} 个，共 ${db.db.photos.length} 个素材。`);
  }
}
seedMedia();

/* ============ 上传 ============ */
const ALLOWED_EXTS = [...IMAGE_EXTS, ...VIDEO_EXTS];
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
    const safe = ALLOWED_EXTS.includes(ext) ? ext : '.jpg';
    cb(null, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: (config.maxUploadMB || 50) * 1024 * 1024 }
});

/* 复习资料上传 */
const REVIEW_EXTS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  '.zip', '.rar', '.7z', '.txt', '.md', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
const reviewStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '').toLowerCase();
    const safe = REVIEW_EXTS.includes(ext) ? ext : '.bin';
    cb(null, 'review-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex') + safe);
  }
});
const reviewUpload = multer({ storage: reviewStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// 中文文件名在 multipart 里可能被按 latin1 解码，这里尽量还原
function decodeName(name) {
  try {
    if (/[\u00C0-\u00FF]/.test(name)) {
      const fixed = Buffer.from(name, 'latin1').toString('utf8');
      if (!fixed.includes('\uFFFD')) return fixed;
    }
  } catch { /* 忽略 */ }
  return name;
}

function checkAdmin(req, res) {
  const pw = (req.body && req.body.adminPassword) || '';
  if (pw && pw === String(config.adminPassword || '')) return true;
  return false;
}
function checkKey(req, res, record) {
  const key = (req.body && req.body.key) || '';
  if (record && record.key && key === record.key) return true;
  return false;
}

/* ============ 照片接口 ============ */
app.get('/api/photos', (req, res) => {
  // 不返回 key（删除码），key 只在本人上传时下发一次
  res.json({
    photos: db.db.photos.map(({ key, ...rest }) => ({
      ...rest,
      commentCount: (db.db.photoComments[rest.id] || []).length
    }))
  });
});

app.post('/api/photos', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有收到文件' });
  const category = String(req.body.category || '大家上传').slice(0, 20);
  const uploader = String(req.body.uploader || '匿名同学').slice(0, 20);
  const type = VIDEO_EXTS.includes(path.extname(req.file.filename).toLowerCase()) ? 'video' : 'image';
  const record = {
    id: uid(),
    path: 'uploads/' + req.file.filename,
    category: category || '大家上传',
    album: String(req.body.album || '').slice(0, 24),
    name: decodeName((req.file.originalname || '未命名')).replace(/\.[^.]+$/, '').slice(0, 60),
    type,
    uploader,
    time: Date.now(),
    likesBy: [],
    key: uid(),
    seeded: false
  };
  db.db.photos.unshift(record);
  db.persist();
  res.json({ photo: record });
});

app.delete('/api/photos/:id', (req, res) => {
  const idx = db.db.photos.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '不存在' });
  const record = db.db.photos[idx];
  if (!checkAdmin(req, res) && !checkKey(req, res, record)) {
    return res.status(403).json({ error: '没有删除权限（需要你的删除码或站长密码）' });
  }
  db.db.photos.splice(idx, 1);
  if (!record.seeded && record.path.startsWith('uploads/')) {
    const full = path.join(__dirname, record.path);
    try { fs.unlinkSync(full); } catch {}
  }
  db.persist();
  res.json({ ok: true });
});

app.post('/api/photos/:id/like', (req, res) => {
  const record = db.db.photos.find(p => p.id === req.params.id);
  if (!record) return res.status(404).json({ error: '不存在' });
  const clientId = String((req.body && req.body.clientId) || req.ip || 'anon').slice(0, 64);
  const liked = record.likesBy.includes(clientId);
  if (liked) {
    record.likesBy = record.likesBy.filter(c => c !== clientId);
  } else {
    record.likesBy.push(clientId);
  }
  db.persist();
  res.json({ likes: record.likesBy.length, liked: !liked });
});

/* ============ 留言板接口 ============ */
app.get('/api/messages', (req, res) => {
  res.json({ messages: db.db.messages.map(({ key, ...rest }) => rest) });
});

app.post('/api/messages', (req, res) => {
  const name = String(req.body.name || '匿名同学').slice(0, 20);
  const content = String(req.body.content || '').trim().slice(0, 500);
  if (!content) return res.status(400).json({ error: '留言内容不能为空' });
  const record = {
    id: uid(),
    name,
    content,
    emoji: String(req.body.emoji || '').slice(0, 8),
    hue: Math.floor(Math.random() * 12),
    time: Date.now(),
    key: uid()
  };
  db.db.messages.unshift(record);
  db.persist();
  res.json({ message: record });
});

app.delete('/api/messages/:id', (req, res) => {
  const idx = db.db.messages.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '不存在' });
  const record = db.db.messages[idx];
  if (!checkAdmin(req, res) && !checkKey(req, res, record)) {
    return res.status(403).json({ error: '没有删除权限（需要你的删除码或站长密码）' });
  }
  db.db.messages.splice(idx, 1);
  db.persist();
  res.json({ ok: true });
});

/* ============ 照片弹幕评论 ============ */
app.get('/api/photos/:id/comments', (req, res) => {
  const list = db.db.photoComments[req.params.id] || [];
  res.json({ comments: list.map(({ key, ...rest }) => rest) });
});

app.post('/api/photos/:id/comments', (req, res) => {
  const photo = db.db.photos.find(p => p.id === req.params.id);
  if (!photo) return res.status(404).json({ error: '照片不存在' });
  const content = String(req.body.content || '').trim().slice(0, 80);
  if (!content) return res.status(400).json({ error: '弹幕内容不能为空' });
  const comment = {
    id: uid(),
    name: String(req.body.name || '匿名同学').slice(0, 20),
    content,
    time: Date.now(),
    key: uid()
  };
  const arr = db.db.photoComments[photo.id] = db.db.photoComments[photo.id] || [];
  arr.push(comment);
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  db.persist();
  res.json({ comment });
});

app.delete('/api/comments/:id', (req, res) => {
  let target = null;
  let photoId = null;
  for (const [pid, arr] of Object.entries(db.db.photoComments)) {
    const idx = arr.findIndex(c => c.id === req.params.id);
    if (idx !== -1) { target = arr[idx]; photoId = pid; break; }
  }
  if (!target) return res.status(404).json({ error: '评论不存在' });
  if (!checkAdmin(req, res) && !checkKey(req, res, target)) {
    return res.status(403).json({ error: '没有删除权限（需要你的删除码或站长密码）' });
  }
  db.db.photoComments[photoId] = db.db.photoComments[photoId].filter(c => c.id !== target.id);
  if (!db.db.photoComments[photoId].length) delete db.db.photoComments[photoId];
  db.persist();
  res.json({ ok: true });
});

/* ============ 社区动态 ============ */
app.get('/api/posts', (req, res) => {
  res.json({
    posts: db.db.posts.map(({ key, ...rest }) => ({
      ...rest,
      comments: (rest.comments || []).map(({ key: ck, ...c }) => c)
    }))
  });
});

app.post('/api/posts', (req, res) => {
  const name = String(req.body.name || '匿名同学').slice(0, 20);
  const content = String(req.body.content || '').trim().slice(0, 1000);
  if (!content) return res.status(400).json({ error: '内容不能为空' });
  const post = {
    id: uid(),
    name,
    content,
    emoji: String(req.body.emoji || '').slice(0, 8),
    time: Date.now(),
    key: uid(),
    likesBy: [],
    comments: []
  };
  db.db.posts.unshift(post);
  if (db.db.posts.length > 300) db.db.posts.length = 300;
  db.persist();
  res.json({ post });
});

app.post('/api/posts/:id/like', (req, res) => {
  const post = db.db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: '动态不存在' });
  const clientId = String((req.body && req.body.clientId) || req.ip || 'anon').slice(0, 64);
  post.likesBy = post.likesBy || [];
  const liked = post.likesBy.includes(clientId);
  post.likesBy = liked ? post.likesBy.filter(c => c !== clientId) : [...post.likesBy, clientId];
  db.persist();
  res.json({ likes: post.likesBy.length, liked: !liked });
});

app.delete('/api/posts/:id', (req, res) => {
  const idx = db.db.posts.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '动态不存在' });
  const record = db.db.posts[idx];
  if (!checkAdmin(req, res) && !checkKey(req, res, record)) {
    return res.status(403).json({ error: '没有删除权限（需要你的删除码或站长密码）' });
  }
  db.db.posts.splice(idx, 1);
  db.persist();
  res.json({ ok: true });
});

app.post('/api/posts/:id/comments', (req, res) => {
  const post = db.db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: '动态不存在' });
  const content = String(req.body.content || '').trim().slice(0, 300);
  if (!content) return res.status(400).json({ error: '评论不能为空' });
  const comment = {
    id: uid(),
    name: String(req.body.name || '匿名同学').slice(0, 20),
    content,
    time: Date.now(),
    key: uid()
  };
  post.comments = post.comments || [];
  post.comments.push(comment);
  db.persist();
  res.json({ comment });
});

app.delete('/api/posts/:id/comments/:cid', (req, res) => {
  const post = db.db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: '动态不存在' });
  const idx = (post.comments || []).findIndex(c => c.id === req.params.cid);
  if (idx === -1) return res.status(404).json({ error: '评论不存在' });
  const comment = post.comments[idx];
  if (!checkAdmin(req, res) && !checkKey(req, res, comment)) {
    return res.status(403).json({ error: '没有删除权限（需要你的删除码或站长密码）' });
  }
  post.comments.splice(idx, 1);
  db.persist();
  res.json({ ok: true });
});

/* ============ 项目互动（招揽报名） ============ */
app.get('/api/projects', (req, res) => {
  res.json({ interests: db.db.projectInterests });
});

app.post('/api/projects/:id/interest', (req, res) => {
  const id = String(req.params.id).slice(0, 40);
  const name = String(req.body.name || '匿名同学').slice(0, 20);
  const arr = db.db.projectInterests[id] = db.db.projectInterests[id] || [];
  if (!arr.some(x => x.name === name)) arr.push({ name, time: Date.now() });
  if (arr.length > 100) arr.length = 100;
  db.persist();
  res.json({ count: arr.length, names: arr.map(x => x.name) });
});

/* ============ 期末复习资料 ============ */
app.get('/api/review/files', (req, res) => {
  res.json({ files: db.db.reviewFiles.map(({ key, ...rest }) => rest) });
});

app.post('/api/review/files', reviewUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有收到文件' });
  const ext = (path.extname(req.file.originalname || '') || '').toLowerCase();
  if (!REVIEW_EXTS.includes(ext)) {
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(400).json({ error: '不支持的文件类型（支持 PDF / Word / PPT / Excel / 图片 / 压缩包）' });
  }
  const record = {
    id: uid(),
    name: decodeName(req.file.originalname || '未命名').slice(0, 120),
    path: 'uploads/' + req.file.filename,
    size: req.file.size,
    category: String(req.body.category || '复习资料').slice(0, 20),
    uploader: String(req.body.uploader || '匿名同学').slice(0, 20),
    time: Date.now(),
    key: uid()
  };
  db.db.reviewFiles.unshift(record);
  db.persist();
  res.json({ file: record });
});

app.delete('/api/review/files/:id', (req, res) => {
  const idx = db.db.reviewFiles.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '文件不存在' });
  const record = db.db.reviewFiles[idx];
  if (!checkAdmin(req, res) && !checkKey(req, res, record)) {
    return res.status(403).json({ error: '没有删除权限（需要你的删除码或站长密码）' });
  }
  db.db.reviewFiles.splice(idx, 1);
  if (record.path.startsWith('uploads/')) {
    try { fs.unlinkSync(path.join(__dirname, record.path)); } catch {}
  }
  db.persist();
  res.json({ ok: true });
});

/* ============ 统计 ============ */
app.get('/api/stats', (req, res) => {
  const byCat = {};
  for (const p of db.db.photos) byCat[p.category] = (byCat[p.category] || 0) + 1;
  res.json({
    photos: db.db.photos.length,
    messages: db.db.messages.length,
    chat: db.db.chat.length,
    byCategory: byCat,
    siteName: config.siteName
  });
});

/* ============ WebSocket 聊天室 ============ */
const CHAT_COLORS = ['#FF6B4A', '#FF4D8D', '#FFB340', '#2BB3A3', '#5B8DEF', '#9B6BEF', '#E8590C'];
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Map(); // ws -> { name, color }

function broadcast(payload) {
  const text = JSON.stringify(payload);
  for (const ws of clients.keys()) {
    if (ws.readyState === 1) ws.send(text);
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'join' && msg.name) {
      const name = String(msg.name).replace(/[<>]/g, '').slice(0, 12) || '同学';
      let color = CHAT_COLORS[crypto.createHash('md5').update(name).digest()[0] % CHAT_COLORS.length];
      clients.set(ws, { name, color });
      ws.send(JSON.stringify({
        type: 'welcome',
        you: { name, color },
        online: clients.size,
        history: db.db.chat.slice(-200)
      }));
      broadcast({ type: 'join', name, online: clients.size, time: Date.now() });
    } else if (msg.type === 'msg' && clients.has(ws)) {
      const c = clients.get(ws);
      const text = String(msg.text || '').replace(/[<>]/g, '').slice(0, 500).trim();
      if (!text) return;
      const record = { id: uid(), name: c.name, color: c.color, text, time: Date.now() };
      db.db.chat.push(record);
      const limit = config.chatHistoryLimit || 1000;
      if (db.db.chat.length > limit) db.db.chat = db.db.chat.slice(-limit);
      db.persist();
      broadcast({ type: 'msg', ...record });
    }
  });

  ws.on('close', () => {
    if (clients.has(ws)) {
      const { name } = clients.get(ws);
      clients.delete(ws);
      broadcast({ type: 'leave', name, online: clients.size, time: Date.now() });
    }
  });
  ws.on('error', () => {});
});

/* ============ 启动 ============ */
const PORT = process.env.PORT || config.port || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ┌──────────────────────────────────────────────┐');
  console.log('  │  ' + config.siteName + ' · 班级网站已启动' + ' '.repeat(Math.max(0, 22 - config.siteName.length)) + '│');
  console.log('  ├──────────────────────────────────────────────┤');
  console.log('  │  本机访问:   http://localhost:' + PORT + '              │');
  console.log('  │  局域网分享: http://<本机IP>:' + PORT + '  (同学用这个)  │');
  console.log('  └──────────────────────────────────────────────┘');
  console.log('');
});
