/**
 * 极简 JSON 数据库
 * 数据存放在 data/db.json，照片/视频文件存放在 uploads/
 * 班级规模（几十人）下同步写入完全够用，且零原生依赖、随处可部署。
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULTS = {
  photos: [],          // { id, path, category, name, type, uploader, time, likesBy, key? }
  messages: [],        // { id, name, content, hue, time, key }
  chat: [],            // { id, name, color, text, time }
  posts: [],           // 社区动态 { id, name, content, emoji, time, key, likesBy, comments: [] }
  photoComments: {},   // 照片弹幕评论 { photoId: [{ id, name, content, time, key }] }
  projectInterests: {},// 项目招揽报名 { projectId: [{ name, time }] }
  reviewFiles: [],     // 期末复习资料 { id, name, path, size, category, uploader, time, key }
  meta: { seeded: false }
};

let db = null;

function load() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    db = { ...structuredClone(DEFAULTS), ...parsed };
  } catch (e) {
    db = structuredClone(DEFAULTS);
  }
}

function persist() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    console.error('[db] 保存失败:', e.message);
  }
}

load();

module.exports = {
  get db() { return db; },
  persist
};
