/* ============================================================
   三峡大学 计科2025级5班 · 班级风采展厅（答辩版）
   序厅橱窗 / 风采相册 / 荣誉 / 项目展示 / 放映模式 / 留言 / 聊天
   ============================================================ */

/* ---------- 工具 ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getClientId() {
    let id = localStorage.getItem('c5-client');
    if (!id) { id = uid() + uid(); localStorage.setItem('c5-client', id); }
    return id;
}

function getMyKeys() {
    try { return JSON.parse(localStorage.getItem('c5-keys') || '{}'); } catch { return {}; }
}
function saveMyKey(id, key) {
    const keys = getMyKeys();
    keys[id] = key;
    localStorage.setItem('c5-keys', JSON.stringify(keys));
}

let toastTimer = null;
function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const diff = Date.now() - ts;
    const min = 60 * 1000, hour = 60 * min, day = 24 * hour;
    if (diff < 0) return '刚刚';
    if (diff < min) return '刚刚';
    if (diff < hour) return Math.floor(diff / min) + ' 分钟前';
    if (diff < day) return Math.floor(diff / hour) + ' 小时前';
    if (diff < 2 * day) return '昨天 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (d.getFullYear() === new Date().getFullYear()) return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

async function api(url, opts = {}) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...opts
    });
    if (!res.ok) {
        let msg = '请求失败';
        try { msg = (await res.json()).error || msg; } catch {}
        throw new Error(msg);
    }
    return res.json();
}

/* 离线提示（静态预览 / 服务器未启动时） */
function setOffline(show) {
    const b = $('#offlineBanner');
    if (b) b.hidden = !show;
}
$('#offlineClose')?.addEventListener('click', () => { $('#offlineBanner').hidden = true; });

/* ---------- 照片解说词 ---------- */
const CAPTIONS = {
    '班级志愿活动1': '红马甲集合 · 班级志愿队',
    '养老院1': '养老院陪伴 · 把温暖送到身边',
    '养老院2': '养老院陪伴 · 陪爷爷奶奶聊聊天',
    '宜昌马拉松志愿活动1': '宜昌马拉松 · 赛道边的志愿红',
    '宜昌马拉松志愿活动2': '宜昌马拉松 · 物资分装',
    '帮新生搬行李': '迎新 · 帮学弟学妹搬行李',
    '帮新生搬行李2': '迎新 · 志愿红在行动',
    '志愿活动-运河公园捡垃圾1': '运河公园 · 弯腰拾起文明',
    '运河公园捡垃圾2': '运河公园 · 志愿服务进行时',
    '运河公园捡垃圾3': '运河公园 · 清捡垃圾',
    '织围巾1': '织围巾 · 手写祝福',
    '织围巾2': '织围巾 · 一针一线的心意',
    '织围巾3': '织围巾 · 写给爷爷奶奶的信',
    '织围巾4': '织围巾 · 满满的心意',
    '织围巾5': '织围巾 · 成品出炉',
    '参观春招1': '参观春招 · 走进招聘现场',
    '参观春招2': '参观春招 · 了解就业方向',
    '班委分发书本': '班委分发书本 · 服务同学',
    '班会1': '班会 · 全班到齐',
    '班会2': '班会 · 认真听讲',
    '班会3': '班会 · 讨论交流',
    '班会视频': '班会纪实',
    '团课1': '团课 · 青春心向党',
    '团课2': '团课 · 认真聆听',
    '团课3': '团课 · 一起学习',
    '团课4': '团课 · 思想碰撞',
    '团课5': '团课 · 学习进行时',
    '积极分子发言1': '积极分子发言 · 向党组织靠拢',
    '25秋积极分子投票': '积极分子投票 · 公平公正',
    '26春积极分子投票': '积极分子投票 · 行使权利',
    '竞选班委': '竞选班委 · 为班级服务',
    '青马工程1': '青马工程 · 骨干培训',
    '迎新晚会1': '迎新晚会 · 舞台高光',
    '迎新晚会2': '迎新晚会 · 节目演出',
    '迎新晚会3': '迎新晚会 · 后台合影',
    '打羽毛球1': '羽毛球 · 球场切磋',
    '打羽毛球2': '羽毛球 · 挥拍时刻',
    '体育活动1': '体育活动 · 球场风采',
    '玩桌游1': '桌游之夜 · 一起放松',
    '读书': '草坪读书 · 阳光与书页',
    '课余日常': '课余日常 · 生活切片',
    '运动会拔河1': '运动会 · 拔河起飞',
    '同学过生日': '生日会 · 班级的甜',
    '同学过生日2': '生日会 · 一起长大',
    '探视照顾生病同学': '陪伴 · 生病也不孤单',
    '群像合照': '我们在一起 · 班级群像',
    '团建1': '团建 · 干杯与欢笑',
    '志愿活动视频': '志愿活动纪实',
    '社会实践': '社会实践纪实',
    '邓璇琪项目展示': '邓璇琪 · 项目作品',
    '邓璇琪项目展示1': '邓璇琪 · 项目演示',
    '李季阳同学项目展示': '李季阳 · 项目作品',
    '涂城源同学项目展示': '涂城源 · 项目作品'
};

function captionFor(p) {
    if (p.category === '奖状') {
        const num = String(p.name || '').replace(/[()（）]/g, '').trim();
        if (/^\d+$/.test(num)) return `荣誉证书 · ${num}`;
        return num || '荣誉证书';
    }
    return CAPTIONS[p.name] || p.name || p.category;
}

/* ---------- 序厅橱窗 & 放映素材 ---------- */
const HERO_PHOTOS = [
    ['images/志愿活动/班级志愿活动1.png', '红马甲集合 · 班级志愿队', '志愿服务'],
    ['images/课外活动/迎新晚会1.jpeg', '迎新晚会 · 舞台高光', '校园活动'],
    ['images/课外活动/运动会拔河1.jpg', '运动会 · 拔河起飞', '体育风采'],
    ['images/志愿活动/宜昌马拉松志愿活动1.jpg', '宜昌马拉松 · 赛道边的志愿红', '志愿服务'],
    ['images/班会团课/班会1.png', '班会 · 全班到齐', '班会团课'],
    ['images/课外活动/打羽毛球2.jpg', '羽毛球 · 挥拍时刻', '体育风采'],
    ['images/志愿活动/织围巾2.jpg', '织围巾 · 一针一线的心意', '志愿服务']
];

const CINEMA_EXTRA = [
    ['images/志愿活动/宜昌马拉松志愿活动2.jpg', '宜昌马拉松 · 物资分装', '志愿服务'],
    ['images/志愿活动/养老院1.jpg', '养老院陪伴 · 把温暖送到身边', '志愿服务'],
    ['images/志愿活动/帮新生搬行李.jpg', '迎新 · 帮学弟学妹搬行李', '志愿服务'],
    ['images/志愿活动/志愿活动-运河公园捡垃圾1.jpeg', '运河公园 · 弯腰拾起文明', '志愿服务'],
    ['images/志愿活动/参观春招1.jpg', '参观春招 · 走进招聘现场', '社会实践'],
    ['images/班会团课/团课2.jpeg', '团课 · 青春心向党', '班会团课'],
    ['images/班会团课/积极分子发言1.jpeg', '积极分子发言 · 向党组织靠拢', '班会团课'],
    ['images/课外活动/读书.jpg', '草坪读书 · 阳光与书页', '生活日常'],
    ['images/温馨时刻/同学过生日.jpg', '生日会 · 班级的甜', '温馨时刻'],
    ['images/温馨时刻/探视照顾生病同学.jpg', '陪伴 · 生病也不孤单', '温馨时刻'],
    ['images/班级合照/群像合照.jpg', '我们在一起 · 班级群像', '班级合照'],
    ['images/项目展示/邓璇琪项目展示.jpg', '项目展示 · 五班同学的代码作品', '项目展示']
];

/* ---------- 导航 / 进度条 / 滚动动效 ---------- */
const nav = $('#topNav');
const progressBar = $('#progressBar');
const burger = $('#navBurger');
const navLinks = $('#navLinks');
const navAnchors = $$('.nav-links a');
const spySections = $$('section[id]');

function onScroll() {
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    progressBar.style.width = (total > 0 ? (h.scrollTop / total) * 100 : 0) + '%';

    let current = 'home';
    for (const sec of spySections) {
        if (h.scrollTop >= sec.offsetTop - 280) current = sec.id;
    }
    navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

burger.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') navLinks.classList.remove('open');
});

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('active'); revealObserver.unobserve(en.target); }
    });
}, { threshold: 0.1 });
$$('.reveal').forEach(el => revealObserver.observe(el));

/* ---------- 序厅橱窗轮播 ---------- */
let heroShots = [];
let heroIdx = 0;
let heroTimer = null;

function buildHeroShowcase(list) {
    const existing = new Set(list.map(p => p.path));
    let shots = HERO_PHOTOS.filter(([path]) => existing.has(path))
        .map(([path, caption]) => ({ path, caption }));
    if (shots.length < 3) {
        shots = list.filter(p => p.type === 'image').slice(0, 6)
            .map(p => ({ path: p.path, caption: captionFor(p) }));
    }
    heroShots = shots;
    renderHeroShowcase();
}

function renderHeroShowcase() {
    const stage = $('#heroStage');
    const thumbs = $('#heroThumbs');
    if (!heroShots.length) {
        stage.innerHTML = '<div class="stage-empty">未连接到服务器，请运行 npm start 后访问 http://localhost:3000</div>';
        const cap = $('#heroCaption');
        if (cap) cap.textContent = '未加载到照片';
        return;
    }
    stage.innerHTML = heroShots.map((s, i) =>
        `<img src="${esc(bigOf(s.path))}" alt="" class="${i === 0 ? 'on' : ''}">`
    ).join('');
    thumbs.innerHTML = heroShots.map((s, i) =>
        `<img src="${esc(thumbOf({ path: s.path }))}" alt="" data-i="${i}" class="${i === 0 ? 'active' : ''}">`
    ).join('');
    $('#heroCaption').textContent = heroShots[0].caption;
    $$('#heroStage img').forEach((img, i) => img.addEventListener('click', () => setHero(i)));
    $$('#heroThumbs img').forEach((img) => img.addEventListener('click', () => setHero(+img.dataset.i)));
    setHero(0);
    autoHero();
}

function setHero(i) {
    if (!heroShots.length) return;
    heroIdx = (i + heroShots.length) % heroShots.length;
    $$('#heroStage img').forEach((img, j) => img.classList.toggle('on', j === heroIdx));
    $$('#heroThumbs img').forEach((img, j) => img.classList.toggle('active', j === heroIdx));
    $('#heroCaption').textContent = heroShots[heroIdx].caption;
}

function autoHero() {
    clearInterval(heroTimer);
    if (heroShots.length < 2) return;
    heroTimer = setInterval(() => setHero(heroIdx + 1), 6500);
}

$('#heroPrev').addEventListener('click', () => { setHero(heroIdx - 1); autoHero(); });
$('#heroNext').addEventListener('click', () => { setHero(heroIdx + 1); autoHero(); });
$('.showcase').addEventListener('mouseenter', () => clearInterval(heroTimer));
$('.showcase').addEventListener('mouseleave', autoHero);

/* ---------- 数据 ---------- */
async function loadStats() {
    try {
        const stats = await api('/api/stats');
        const sp = $('#statPhotos');
        if (sp) sp.textContent = stats.photos;
        document.title = `${stats.siteName || '计科2025级5班'} | 班级风采展厅`;
    } catch { /* 服务器未启动时保持默认 */ }
}
loadStats();

/* ---------- 缩略图 ---------- */
function thumbOf(p) {
    if (!p || !p.path) return '';
    if (p.type === 'video' || !p.path.startsWith('images/')) return p.path;
    const ext = p.path.slice(p.path.lastIndexOf('.'));
    return 'thumbs/' + p.path.slice('images/'.length, p.path.length - ext.length) + '.jpg';
}
function bigOf(path) {
    if (!path || !path.startsWith('images/')) return path;
    const ext = path.slice(path.lastIndexOf('.'));
    return 'thumbs-big/' + path.slice('images/'.length, path.length - ext.length) + '.jpg';
}

/* ---------- 班级回忆录 ---------- */
let photos = [];

const ALBUMS = [
    { id: 'yingxin', title: '迎新晚会', desc: '第一次在舞台上一起发光', cover: '迎新晚会1', category: '课外活动', names: ['迎新晚会1', '迎新晚会2', '迎新晚会3'] },
    { id: 'yingxin-help', title: '迎新 · 搬行李与春招', desc: '迎接学弟学妹，也走进春招现场', cover: '帮新生搬行李', category: '志愿活动', names: ['帮新生搬行李', '帮新生搬行李2', '参观春招1', '参观春招2'] },
    { id: 'banhui', title: '班会', desc: '每一次集结，都是一次成长', cover: '班会1', category: '班会团课', names: ['班会1', '班会2', '班会3', '班会视频', '竞选班委'] },
    { id: 'tuanke', title: '团课与积极分子', desc: '青春心向党，向党组织靠拢', cover: '团课2', category: '班会团课', names: ['团课1', '团课2', '团课3', '团课4', '团课5', '积极分子发言1', '25秋积极分子投票', '26春积极分子投票', '青马工程1'] },
    { id: 'marathon', title: '宜昌马拉松', desc: '赛道边的志愿红', cover: '宜昌马拉松志愿活动1', category: '志愿活动', names: ['宜昌马拉松志愿活动1', '宜昌马拉松志愿活动2'] },
    { id: 'yanglaoyuan', title: '养老院陪伴', desc: '把温暖送到爷爷奶奶身边', cover: '养老院1', category: '志愿活动', names: ['养老院1', '养老院2'] },
    { id: 'weijin', title: '织围巾', desc: '一针一线，写给冬天的信', cover: '织围巾2', category: '志愿活动', names: ['织围巾1', '织围巾2', '织围巾3', '织围巾4', '织围巾5'] },
    { id: 'yunhe', title: '运河公园环保', desc: '弯腰拾起文明', cover: '运河公园捡垃圾2', category: '志愿活动', names: ['志愿活动-运河公园捡垃圾1', '运河公园捡垃圾2', '运河公园捡垃圾3'] },
    { id: 'zhiyuan', title: '班级志愿队', desc: '红马甲集合', cover: '班级志愿活动1', category: '志愿活动', names: ['班级志愿活动1', '班委分发书本', '志愿活动视频', '社会实践'] },
    { id: 'yundonghui', title: '运动会', desc: '拔河起飞，一起用力', cover: '运动会拔河1', category: '课外活动', names: ['运动会拔河1', '体育活动1'] },
    { id: 'yumaoqiu', title: '羽毛球', desc: '球场上的挥拍时刻', cover: '打羽毛球2', category: '课外活动', names: ['打羽毛球1', '打羽毛球2'] },
    { id: 'tuanjian', title: '团建与桌游', desc: '松弛的午后与夜晚', cover: '团建1', category: '课外活动', names: ['团建1', '玩桌游1', '课余日常', '读书', '群像合照'] },
    { id: 'shengri', title: '生日与陪伴', desc: '班级的甜，生日的暖', cover: '同学过生日', category: '温馨时刻', names: ['同学过生日', '同学过生日2', '探视照顾生病同学'] },
    { id: 'more', title: '大家上传', desc: '同学们随手拍的班级日常', cover: '', category: '大家上传', names: [] }
];

function albumItems(album) {
    const uploaded = photos.filter(p => !p.seeded && (p.album === album.id || (album.id === 'more' && !p.album)));
    const seeded = album.id === 'more' ? [] : album.names.map(n => photos.find(p => p.name === n)).filter(Boolean);
    return [...uploaded, ...seeded];
}

function albumCover(album, items) {
    if (album.cover) {
        const p = photos.find(x => x.name === album.cover);
        if (p) return p;
    }
    return items.find(p => p.type === 'image') || null;
}

async function loadPhotos() {
    try {
        const data = await api('/api/photos');
        photos = data.photos;
        setOffline(false);
    } catch (e) {
        toast('⚠️ 连不上服务器，请先运行 npm start 再访问');
        setOffline(true);
        photos = [];
    }
    await loadProjects();
    renderAlbums();
    renderHonor();
    buildHeroShowcase(photos);
    buildQuoteStack(photos);
    renderProjects();
    loadStats();
    if (window.initGames) {
        initGames(photos.filter(p => p.type === 'image').map(p => ({ ...p, path: thumbOf(p) })));
    }
}

function photoCard(p) {
    const media = p.type === 'video'
        ? `<video src="${esc(p.path)}" preload="metadata" muted></video>`
        : `<img src="${esc(thumbOf(p))}" alt="${esc(p.name)}" loading="lazy">`;
    const badge = p.type === 'video'
        ? '<span class="photo-badge video-badge">▶ 视频</span>'
        : `<span class="photo-badge">${esc(p.category)}</span>`;
    const liked = p.likesBy && p.likesBy.includes(getClientId()) ? 'liked' : '';
    const cc = p.commentCount || 0;
    return `
    <div class="photo-card" data-id="${esc(p.id)}">
        ${media}
        ${badge}
        <div class="photo-meta">
            <span class="who">${esc(captionFor(p))}</span>
            <span class="meta-right">
                <span class="like ${liked}">❤️ ${p.likesBy ? p.likesBy.length : 0}</span>
                <span class="cmt">💬 ${cc}</span>
            </span>
        </div>
    </div>`;
}

/* ---------- 班级相册 ---------- */
let currentAlbum = null;

function renderAlbums() {
    const wall = $('#albumWall');
    if (!wall) return;
    wall.innerHTML = ALBUMS.map(a => {
        const items = albumItems(a);
        const cover = albumCover(a, items);
        const cmtTotal = items.reduce((s, p) => s + (p.commentCount || 0), 0);
        return `
        <div class="album-card" data-id="${esc(a.id)}">
            ${cover ? `<img src="${esc(thumbOf(cover))}" alt="${esc(a.title)}" loading="lazy">` : '<div class="album-card-empty">📷 等待第一张照片</div>'}
            <div class="shade"></div>
            <span class="album-card-count">${items.length} 张</span>
            <div class="album-card-info">
                <div class="album-card-title">${esc(a.title)}</div>
                <div class="album-card-desc">${esc(a.desc)}</div>
                <div class="album-card-cmt">💬 ${cmtTotal} 条留言 · 翻开看看 ›</div>
            </div>
        </div>`;
    }).join('');
    $$('.album-card', wall).forEach(card => {
        card.addEventListener('click', () => openAlbum(card.dataset.id));
    });
}

function openAlbum(id) {
    const album = ALBUMS.find(a => a.id === id);
    if (!album) return;
    currentAlbum = album;
    const items = albumItems(album);
    const cover = albumCover(album, items);

    const coverEl = $('#albumViewerCover');
    if (cover) { coverEl.src = thumbOf(cover); coverEl.style.display = ''; }
    else coverEl.style.display = 'none';

    $('#albumViewerTitle').textContent = album.title;
    $('#albumViewerDesc').textContent = album.desc;
    $('#albumViewerMeta').textContent = `共 ${items.length} 张 · 点 ‹ › 或左右方向键翻页，页下可留言`;

    bookPages = [
        { kind: 'cover', album, cover },
        ...items.map(item => ({ kind: 'photo', item }))
    ];
    bookPage = 0;
    renderBook();
    $('#albumViewer').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAlbum() {
    $('#albumViewer').classList.remove('active');
    currentAlbum = null;
    document.body.style.overflow = '';
}

/* ---------- 翻书浏览 ---------- */
let bookPages = [];
let bookPage = 0;
let bookFlipping = false;

function bookPageHtml(page) {
    if (page.kind === 'cover') {
        const img = page.cover ? `<img src="${esc(thumbOf(page.cover))}" alt="">` : '';
        return `
        <div class="book-cover-page">
            ${img}
            <div class="book-cover-title">${esc(page.album.title)}</div>
            <div class="book-cover-desc">${esc(page.album.desc)}</div>
        </div>`;
    }
    const item = page.item;
    const media = item.type === 'video'
        ? `<video src="${esc(item.path)}" preload="metadata" muted></video>`
        : `<img src="${esc(thumbOf(item))}" alt="${esc(captionFor(item))}">`;
    const liked = item.likesBy && item.likesBy.includes(getClientId()) ? 'liked' : '';
    return `
        <div class="book-photo">${media}</div>
        <span class="book-page-no">${bookPage} / ${bookPages.length - 1}</span>
        <div class="book-page-caption">${esc(captionFor(item))}</div>
        <div class="book-page-stats">
            <span class="like ${liked}" data-id="${esc(item.id)}">❤️ ${item.likesBy ? item.likesBy.length : 0}</span>
            <span>💬 ${item.commentCount || 0}</span>
        </div>`;
}

function renderBook() {
    const cur = bookPages[bookPage];
    const next = bookPages[bookPage + 1];
    $('#bookFront').innerHTML = bookPageHtml(cur);
    $('#bookBack').innerHTML = '';
    $('#bookUnder').innerHTML = next ? bookPageHtml(next) : '<div class="book-end">— 完 —</div>';
    $('#bookPageLabel').textContent = `${bookPage + 1} / ${bookPages.length}`;
    loadBookComments(cur);
}

function flipNext() {
    if (bookFlipping || bookPage >= bookPages.length - 1) return;
    bookFlipping = true;
    const sheet = $('#bookSheet');
    $('#bookBack').innerHTML = '';
    sheet.classList.add('flip');
    setTimeout(() => {
        bookPage++;
        sheet.style.transition = 'none';
        sheet.classList.remove('flip');
        renderBook();
        void sheet.offsetWidth;
        sheet.style.transition = '';
        bookFlipping = false;
    }, 680);
}

function flipPrev() {
    if (bookFlipping || bookPage <= 0) return;
    bookPage--;
    renderBook();
}

$('#bookNext').addEventListener('click', flipNext);
$('#bookPrev').addEventListener('click', flipPrev);
$('#book').addEventListener('click', (e) => {
    const likeEl = e.target.closest('.book-page-stats .like');
    if (!likeEl) return;
    const page = bookPages[bookPage];
    if (!page || page.kind !== 'photo') return;
    api(`/api/photos/${page.item.id}/like`, {
        method: 'POST',
        body: JSON.stringify({ clientId: getClientId() })
    }).then((d) => {
        page.item.likesBy = d.liked
            ? [...(page.item.likesBy || []), getClientId()]
            : (page.item.likesBy || []).filter(c => c !== getClientId());
        renderBook();
        updateLikeUI(page.item.id);
    }).catch(() => {});
});

function loadBookComments(page) {
    const box = $('#bookComments');
    $('#bookCmtName').value = localStorage.getItem('c5-nick') || '';
    $('#bookCmtInput').value = '';
    if (!page || page.kind !== 'photo') { box.innerHTML = '<div class="book-cmt-hint">封面页 · 翻到照片页即可留言</div>'; return; }
    api(`/api/photos/${page.item.id}/comments`).then((d) => {
        const cs = d.comments || [];
        box.innerHTML = cs.length
            ? cs.map(c => `<div class="book-cmt"><b>${esc(c.name)}</b>${esc(c.content)}<span>${fmtTime(c.time)}</span></div>`).join('')
            : '<div class="book-cmt-hint">还没有留言，来坐沙发～</div>';
    }).catch(() => { box.innerHTML = ''; });
}

$('#bookCmtSend').addEventListener('click', async () => {
    const page = bookPages[bookPage];
    if (!page || page.kind !== 'photo') return;
    const text = $('#bookCmtInput').value.trim();
    if (!text) return toast('先写条留言吧～');
    const name = $('#bookCmtName').value.trim() || localStorage.getItem('c5-nick') || '匿名同学';
    try {
        const d = await api(`/api/photos/${page.item.id}/comments`, {
            method: 'POST',
            body: JSON.stringify({ name, content: text })
        });
        saveMyKey(d.comment.id, d.comment.key);
        localStorage.setItem('c5-nick', name);
        page.item.commentCount = (page.item.commentCount || 0) + 1;
        toast('💬 留言已发出');
        loadBookComments(page);
        const likeEl = document.querySelector(`.book-page-stats .like[data-id="${page.item.id}"]`);
        if (likeEl) { /* counts refresh via renderBook on page change; update inline */ }
        $('#bookFront .book-page-stats span:last-child').textContent = '💬 ' + page.item.commentCount;
    } catch (e) { toast('❌ ' + e.message); }
});

$('#albumViewerClose').addEventListener('click', closeAlbum);
$('#albumViewer').addEventListener('click', (e) => {
    if (e.target === $('#albumViewer')) closeAlbum();
});
$('#albumViewerUpload').addEventListener('click', () => {
    if (currentAlbum) openUploadModal(currentAlbum.id);
});
$('#albumUploadBtn').addEventListener('click', () => openUploadModal('more'));

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (lightbox.classList.contains('active')) return;
        if ($('#albumViewer').classList.contains('active')) closeAlbum();
        return;
    }
    if ($('#albumViewer').classList.contains('active') && !lightbox.classList.contains('active')) {
        if (e.key === 'ArrowRight') flipNext();
        if (e.key === 'ArrowLeft') flipPrev();
    }
});

function updateLikeUI(id) {
    const p = photos.find(x => x.id === id);
    if (!p) return;
    $$(`.photo-card[data-id="${id}"] .like`).forEach(el => {
        el.textContent = '❤️ ' + (p.likesBy ? p.likesBy.length : 0);
        el.classList.toggle('liked', !!(p.likesBy && p.likesBy.includes(getClientId())));
    });
}

/* ---------- 上传（按相册归档） ---------- */
const uploadModal = $('#uploadModal');
const uploadDrop = $('#uploadDrop');
const uploadInput = $('#uploadInput');

function fillAlbumSelect(selectedId) {
    const sel = $('#uploadCat');
    sel.innerHTML = ALBUMS.map(a =>
        `<option value="${esc(a.id)}" ${a.id === selectedId ? 'selected' : ''}>${esc(a.title)}</option>`
    ).join('');
}

function openUploadModal(albumId) {
    fillAlbumSelect(albumId || 'more');
    uploadModal.hidden = false;
    $('#uploadProgress').hidden = true;
    $('#uploadBar').style.width = '0%';
    $('#uploadStatus').textContent = '';
}

function closeUploadModal() {
    uploadModal.hidden = true;
    uploadInput.value = '';
}

$('#uploadClose').addEventListener('click', closeUploadModal);
uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) closeUploadModal();
});

uploadDrop.addEventListener('click', () => uploadInput.click());
uploadInput.addEventListener('change', () => handleFiles([...uploadInput.files]));
['dragover', 'dragenter'].forEach(ev => uploadDrop.addEventListener(ev, (e) => {
    e.preventDefault();
    uploadDrop.classList.add('dragover');
}));
['dragleave', 'drop'].forEach(ev => uploadDrop.addEventListener(ev, (e) => {
    e.preventDefault();
    uploadDrop.classList.remove('dragover');
}));
uploadDrop.addEventListener('drop', (e) => handleFiles([...e.dataTransfer.files]));

function resizeImage(file) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const MAX = 1800;
            let { width, height } = img;
            if (width <= MAX && height <= MAX) return resolve(file);
            const scale = MAX / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => blob ? resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })) : resolve(file), 'image/jpeg', 0.82);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
}

async function handleFiles(files) {
    if (!files.length) return;
    const name = $('#uploadName').value.trim() || localStorage.getItem('c5-nick') || '';
    const albumId = $('#uploadCat').value || 'more';
    const album = ALBUMS.find(a => a.id === albumId) || ALBUMS.find(a => a.id === 'more');
    const category = album.category || '大家上传';
    const progress = $('#uploadProgress');
    const bar = $('#uploadBar');
    const status = $('#uploadStatus');
    progress.hidden = false;

    let ok = 0;
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        status.textContent = `正在处理 ${file.name} (${i + 1}/${files.length})…`;
        if (file.type.startsWith('image/') && !['image/gif'].includes(file.type)) {
            file = await resizeImage(file);
        }
        try {
            await uploadOne(file, name, category, album.id, (pct) => {
                bar.style.width = pct + '%';
                status.textContent = `上传中 ${Math.round(pct)}%`;
            });
            ok++;
        } catch (e) {
            toast('❌ ' + (file.name) + '：' + e.message);
        }
    }
    bar.style.width = '100%';
    status.textContent = ok ? `✅ 上传完成 ${ok} 个文件` : '上传失败';
    setTimeout(() => { progress.hidden = true; bar.style.width = '0%'; }, 1800);
    uploadInput.value = '';
    if (ok) {
        closeUploadModal();
        const keep = currentAlbum ? currentAlbum.id : null;
        await loadPhotos();
        if (keep) openAlbum(keep);
        toast(`📷 已上传 ${ok} 张到「${album.title}」`);
    }
}

function uploadOne(file, name, category, albumId, onProgress) {
    return new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('uploader', name);
        fd.append('category', category);
        fd.append('album', albumId);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/photos');
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total * 100); };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                if (data.photo.key) saveMyKey(data.photo.id, data.photo.key);
                resolve(data.photo);
            } else {
                let msg = '上传失败';
                try { msg = JSON.parse(xhr.responseText).error || msg; } catch {}
                reject(new Error(msg));
            }
        };
        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.send(fd);
    });
}

/* ---------- 灯箱 ---------- */
const lightbox = $('#lightbox');
let lbList = [];
let lbIndex = 0;
let lbCurrent = null;

function openLightbox(list, index) {
    if (!list || !list.length) return;
    lbList = list;
    lbIndex = index;
    showLightboxItem();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    clearDanmaku();
    const v = $('#lbVideo');
    v.pause();
    v.removeAttribute('src');
}

function showLightboxItem() {
    lbCurrent = lbList[lbIndex];
    const img = $('#lbImg');
    const video = $('#lbVideo');
    $('#lbTitle').textContent = lbCurrent.caption || captionFor(lbCurrent);
    const meta = [lbCurrent.uploader, lbCurrent.category];
    if (lbCurrent.time) meta.push(fmtTime(lbCurrent.time));
    $('#lbMeta').textContent = meta.filter(Boolean).join(' · ');

    if (lbCurrent.type === 'video') {
        img.hidden = true;
        video.hidden = false;
        video.src = lbCurrent.path;
        video.load();
    } else {
        video.hidden = true;
        video.pause();
        video.removeAttribute('src');
        img.hidden = false;
        img.src = lbCurrent.path;
    }
    refreshLikeBtn();
    $('#lbDownload').href = lbCurrent.path;
    $('#lbDownload').setAttribute('download', lbCurrent.name || 'photo');

    const synthetic = !!lbCurrent.synthetic;
    $('#lbLike').style.display = synthetic ? 'none' : '';
    $('#lbDelete').style.display = synthetic ? 'none' : ((getMyKeys()[lbCurrent.id] || !lbCurrent.seeded) ? '' : 'none');
    $('#cmtName').value = localStorage.getItem('c5-nick') || '';
    loadDanmaku(lbCurrent);
}

/* ---------- 照片弹幕 ---------- */
const danmaku = { layer: null, timer: null, comments: [], idx: 0 };

function clearDanmaku() {
    if (danmaku.timer) { clearInterval(danmaku.timer); danmaku.timer = null; }
    if (danmaku.layer) danmaku.layer.innerHTML = '';
    danmaku.comments = [];
    danmaku.idx = 0;
}

function spawnDanmaku(text) {
    if (!danmaku.layer) return;
    if (danmaku.layer.children.length > 14) return;
    const el = document.createElement('span');
    el.className = 'danmaku-item';
    el.textContent = text;
    const dur = Math.min(18, Math.max(9, 8 + text.length * 0.25));
    el.style.top = (6 + Math.random() * 74) + '%';
    el.style.setProperty('--dur', dur + 's');
    danmaku.layer.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
}

function startDanmaku() {
    if (danmaku.timer) clearInterval(danmaku.timer);
    if (!danmaku.comments.length) { danmaku.timer = null; return; }
    danmaku.timer = setInterval(() => {
        if (!lightbox.classList.contains('active')) return;
        const c = danmaku.comments[danmaku.idx % danmaku.comments.length];
        danmaku.idx++;
        spawnDanmaku((c.name ? c.name + '：' : '') + c.content);
    }, 1700);
}

async function loadDanmaku(photo) {
    clearDanmaku();
    if (!danmaku.layer) danmaku.layer = $('#danmakuLayer');
    const canComment = photo && photo.type === 'image' && !photo.synthetic;
    $('#lbCommentBar').style.display = canComment ? '' : 'none';
    $('#lbCmtCount').textContent = '💬 0';
    if (!canComment) return;
    try {
        const d = await api(`/api/photos/${photo.id}/comments`);
        if (lbCurrent !== photo) return;
        danmaku.comments = d.comments || [];
        danmaku.idx = 0;
        $('#lbCmtCount').textContent = `💬 ${danmaku.comments.length}`;
        startDanmaku();
    } catch { /* 忽略 */ }
}

function updateCommentCountUI(id, n) {
    const p = photos.find(x => x.id === id);
    if (p) p.commentCount = n;
    $$(`.photo-card[data-id="${id}"] .cmt`).forEach(el => { el.textContent = `💬 ${n}`; });
}

$('#cmtSend').addEventListener('click', async () => {
    if (!lbCurrent || lbCurrent.synthetic || lbCurrent.type !== 'image') return;
    const input = $('#cmtInput');
    const text = input.value.trim();
    if (!text) return toast('先写条弹幕吧~');
    const name = $('#cmtName').value.trim() || localStorage.getItem('c5-nick') || '匿名同学';
    try {
        const data = await api(`/api/photos/${lbCurrent.id}/comments`, {
            method: 'POST',
            body: JSON.stringify({ name, content: text })
        });
        saveMyKey(data.comment.id, data.comment.key);
        localStorage.setItem('c5-nick', name);
        danmaku.comments.push(data.comment);
        danmaku.idx = 0;
        $('#lbCmtCount').textContent = `💬 ${danmaku.comments.length}`;
        spawnDanmaku(name + '：' + text);
        if (!danmaku.timer) startDanmaku();
        input.value = '';
        updateCommentCountUI(lbCurrent.id, danmaku.comments.length);
        toast('💬 弹幕已发出');
    } catch (e) { toast('❌ ' + e.message); }
});

$('#cmtInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#cmtSend').click();
});

$('#cmtClear').addEventListener('click', async () => {
    if (!lbCurrent || lbCurrent.synthetic || lbCurrent.type !== 'image') return;
    const pw = prompt('清空这张照片的全部弹幕？\n请输入站长密码：');
    if (!pw) return;
    try {
        const d = await api(`/api/photos/${lbCurrent.id}/comments`);
        for (const c of (d.comments || [])) {
            await api(`/api/comments/${c.id}`, { method: 'DELETE', body: JSON.stringify({ adminPassword: pw }) });
        }
        danmaku.comments = [];
        clearDanmaku();
        $('#lbCmtCount').textContent = '💬 0';
        updateCommentCountUI(lbCurrent.id, 0);
        toast('已清空本图弹幕');
    } catch (e) {
        toast('❌ ' + e.message);
    }
});

function refreshLikeBtn() {
    if (!lbCurrent) return;
    const liked = lbCurrent.likesBy && lbCurrent.likesBy.includes(getClientId());
    $('#lbLike').classList.toggle('liked', !!liked);
    $('#lbLikeCount').textContent = lbCurrent.likesBy ? lbCurrent.likesBy.length : 0;
}

$('#lbLike').addEventListener('click', async () => {
    if (!lbCurrent || lbCurrent.synthetic) return;
    try {
        const data = await api(`/api/photos/${lbCurrent.id}/like`, {
            method: 'POST',
            body: JSON.stringify({ clientId: getClientId() })
        });
        lbCurrent.likesBy = data.liked
            ? [...(lbCurrent.likesBy || []), getClientId()]
            : (lbCurrent.likesBy || []).filter(c => c !== getClientId());
        refreshLikeBtn();
        updateLikeUI(lbCurrent.id);
    } catch (e) { toast(e.message); }
});

$('#lbPrev').addEventListener('click', () => { lbIndex = (lbIndex - 1 + lbList.length) % lbList.length; showLightboxItem(); });
$('#lbNext').addEventListener('click', () => { lbIndex = (lbIndex + 1) % lbList.length; showLightboxItem(); });
$('#lbClose').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') $('#lbPrev').click();
    if (e.key === 'ArrowRight') $('#lbNext').click();
});

$('#lbDelete').addEventListener('click', async () => {
    if (!lbCurrent || lbCurrent.synthetic) return;
    const myKey = getMyKeys()[lbCurrent.id];
    let body = { key: myKey || '' };
    if (!myKey) {
        const pw = prompt('只有上传者本人或站长可以删除。\n请输入站长密码：');
        if (pw == null) return;
        body = { adminPassword: pw };
    } else if (!confirm('确定删除这张照片吗？')) {
        return;
    }
    try {
        await api(`/api/photos/${lbCurrent.id}`, { method: 'DELETE', body: JSON.stringify(body) });
        toast('已删除');
        closeLightbox();
        await loadPhotos();
    } catch (e) { toast('❌ ' + e.message); }
});

/* ---------- 荣誉殿堂 · 3D 立体环绕 ---------- */
const honorState = { awards: [], index: 0, timer: null, dragging: false, moved: false };

function renderHonor() {
    const ring = $('#honorRing');
    const stage = $('#honorStage');
    if (!ring || !stage) return;
    const awards = photos.filter(p => p.category === '奖状');
    honorState.awards = awards;
    const sa = $('#statAwards');
    if (sa) sa.textContent = awards.length;
    const hc = $('#honorStatCount');
    if (hc) hc.textContent = awards.length + '+';
    const ac = $('#awardCount');
    if (ac) ac.textContent = awards.length;
    if (!awards.length) { ring.innerHTML = '<p class="album-empty">奖状正在路上……</p>'; return; }
    ring.innerHTML = awards.map((p, i) => `
        <div class="honor-card-3d" data-i="${i}">
            <img src="${esc(thumbOf(p))}" alt="${esc(p.name)}" loading="lazy">
            <span class="hc-label">🏆 ${esc(captionFor(p))}</span>
        </div>`).join('');
    $$('.honor-card-3d', ring).forEach(card => {
        card.addEventListener('click', () => {
            if (honorState.moved) { honorState.moved = false; return; }
            const i = +card.dataset.i;
            if (i === honorState.index) openLightbox(awards, i);
            else setHonor(i);
        });
    });
    setupHonorDrag(stage);
    honorState.index = 0;
    layoutHonor();
    startHonorAuto();
}

function layoutHonor() {
    const stage = $('#honorStage');
    if (!stage) return;
    const ring = $('#honorRing');
    if (!ring) return;
    const n = honorState.awards.length;
    if (!n) return;
    const cs = getComputedStyle(stage);
    const cw = parseFloat(cs.getPropertyValue('--cw')) || 320;
    const isMobile = window.innerWidth < 760;
    const stepX = Math.min(cw * 0.5, isMobile ? 78 : 160);
    const stepZ = isMobile ? 130 : 210;
    const rotY = isMobile ? 34 : 44;
    const cards = $$('.honor-card-3d', ring);
    cards.forEach((el, j) => {
        let off = j - honorState.index;
        if (off > n / 2) off -= n;
        if (off < -n / 2) off += n;
        const abs = Math.abs(off);
        if (abs > 6) {
            el.style.opacity = 0;
            el.style.pointerEvents = 'none';
            el.style.transform = `translateX(${Math.sign(off) * 620}px) translateZ(-900px) rotateY(${off > 0 ? -50 : 50}deg)`;
            return;
        }
        el.style.opacity = abs === 0 ? 1 : Math.max(0.22, 0.72 - abs * 0.09);
        el.style.pointerEvents = 'auto';
        el.style.zIndex = 100 - abs;
        el.classList.toggle('active', abs === 0);
        el.style.transform = `translateX(${off * stepX}px) translateZ(${-abs * stepZ}px) rotateY(${-off * rotY}deg) scale(${abs === 0 ? 1.12 : Math.max(0.7, 0.94 - abs * 0.045)})`;
    });
    const counter = $('#honorCount');
    if (counter) counter.textContent = `${honorState.index + 1} / ${n}`;
}

function setHonor(i) {
    const n = honorState.awards.length;
    if (!n) return;
    honorState.index = (i + n) % n;
    layoutHonor();
}

function startHonorAuto() {
    clearInterval(honorState.timer);
    honorState.timer = setInterval(() => {
        if (document.hidden || honorState.dragging) return;
        setHonor(honorState.index + 1);
    }, 4500);
}

function setupHonorDrag(stage) {
    let startX = 0;
    stage.addEventListener('mousedown', (e) => {
        honorState.dragging = true;
        startX = e.clientX;
        stage.classList.add('dragging');
        clearInterval(honorState.timer);
    });
    stage.addEventListener('touchstart', (e) => {
        honorState.dragging = true;
        startX = e.touches[0].clientX;
        clearInterval(honorState.timer);
    }, { passive: true });
    const onUp = (e) => {
        if (!honorState.dragging) return;
        honorState.dragging = false;
        stage.classList.remove('dragging');
        const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const dx = endX - startX;
        if (Math.abs(dx) > 40) {
            honorState.moved = true;
            setHonor(honorState.index + (dx < 0 ? 1 : -1));
            setTimeout(() => { honorState.moved = false; }, 400);
        }
        startHonorAuto();
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    stage.addEventListener('mouseenter', () => clearInterval(honorState.timer));
    stage.addEventListener('mouseleave', () => startHonorAuto());
    window.addEventListener('resize', () => layoutHonor());
}

$('#honorPrev')?.addEventListener('click', () => setHonor(honorState.index - 1));
$('#honorNext')?.addEventListener('click', () => setHonor(honorState.index + 1));

/* ---------- 项目展示厅 ---------- */
let projectInterests = {};

const PROJECTS = [
    {
        id: 'lijiyang', name: '李季阳', role: '计算机科学与技术 · 2025级5班',
        intro: '喜欢折腾代码与工具，负责项目整体架构和核心功能实现。',
        tags: ['后端', '数据库', '架构'],
        recruit: '项目正在招揽：后端同学 1 名、前端同学 1 名，一起把项目做到能上线。',
        img: 'images/项目展示/李季阳同学项目展示.jpg',
        videos: ['videos/李季阳同学项目展示.mp4']
    },
    {
        id: 'tuchengyuan', name: '涂城源', role: '计算机科学与技术 · 2025级5班',
        intro: '专注界面与实现细节，把需求一步步变成能跑的功能。',
        tags: ['前端', '交互设计'],
        recruit: '项目正在招揽：测试同学 1 名，帮忙找 bug、写用例。',
        img: 'images/项目展示/涂城源同学项目展示.jpg',
        videos: []
    },
    {
        id: 'dengxuanqi', name: '邓璇琪', role: '计算机科学与技术 · 2025级5班',
        intro: '喜欢做网页应用，负责界面、交互与演示视频的完整呈现。',
        tags: ['网页应用', '界面交互', '演示'],
        recruit: '项目正在招揽：设计同学 1 名，一起打磨界面视觉。',
        img: 'images/项目展示/邓璇琪项目展示.jpg',
        videos: ['videos/邓璇琪项目展示.mp4', 'videos/邓璇琪项目展示1.mp4']
    },
    {
        id: 'liuenze', name: '刘恩泽', role: '计算机科学与技术 · 2025级5班',
        intro: '正在把课堂知识落到真实项目里，欢迎一起交流实现思路。',
        tags: ['项目实践'],
        recruit: '项目正在招揽：对项目感兴趣的同学，一起来讨论方案。',
        img: 'images/项目展示/刘恩泽同学项目展示.jpg',
        videos: ['videos/刘恩泽项目展示.mp4']
    }
];

async function loadProjects() {
    try {
        const d = await api('/api/projects');
        projectInterests = d.interests || {};
    } catch { projectInterests = {}; }
}

function renderProjects() {
    const grid = $('#projectGrid');
    if (!grid) return;
    grid.innerHTML = PROJECTS.map(p => {
        const names = (projectInterests[p.id] || []).map(x => x.name);
        const myName = localStorage.getItem('c5-nick') || '';
        const joined = myName && names.includes(myName);
        return `
        <div class="project-card" data-id="${esc(p.id)}">
            <div class="project-poster">
                <img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">
                ${p.videos.length ? '<div class="project-play"><span>▶</span></div>' : ''}
            </div>
            <div class="project-body">
                <div class="project-owner">
                    <span class="po-ava" style="background:${avatarColor(p.name)}">${esc(p.name[0])}</span>
                    <div>
                        <div class="po-name">${esc(p.name)}</div>
                        <div class="po-role">${esc(p.role)}</div>
                    </div>
                </div>
                <p class="project-intro">${esc(p.intro)}</p>
                <div class="project-tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
                <div class="recruit-box">
                    <p><b>项目招揽</b> · ${esc(p.recruit)}</p>
                    <div class="recruit-actions">
                        <button class="recruit-btn ${joined ? 'joined' : ''}">${joined ? '✅ 已报名' : '🙋 我想加入'}（${names.length}）</button>
                    </div>
                    ${names.length ? `<div class="recruit-names">${names.map(n => `<span>${esc(n)}</span>`).join('')}</div>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

    $$('.project-card', grid).forEach(card => {
        const p = PROJECTS.find(x => x.id === card.dataset.id);
        if (!p) return;

        card.querySelector('.project-poster').addEventListener('click', () => {
            const items = p.videos.length
                ? p.videos.map((v, i) => ({
                    id: 'proj-' + p.id + i,
                    type: 'video',
                    path: v,
                    name: `${p.name} · 项目演示${i ? '（' + (i + 1) + '）' : ''}`,
                    uploader: '班级素材',
                    category: '项目展示',
                    time: 0,
                    synthetic: true,
                    seeded: true
                }))
                : [{
                    id: 'proj-' + p.id,
                    type: 'image',
                    path: p.img,
                    name: `${p.name} · 项目作品`,
                    uploader: '班级素材',
                    category: '项目展示',
                    time: 0,
                    synthetic: true,
                    seeded: true
                }];
            openLightbox(items, 0);
        });

        card.querySelector('.recruit-btn').addEventListener('click', () => {
            let name = localStorage.getItem('c5-nick') || '';
            if (!name) {
                name = (prompt('报上名字，一起做项目～') || '').trim().slice(0, 12);
                if (!name) return;
                localStorage.setItem('c5-nick', name);
            }
            api(`/api/projects/${p.id}/interest`, { method: 'POST', body: JSON.stringify({ name }) })
                .then(() => {
                    projectInterests[p.id] = (projectInterests[p.id] || [])
                        .filter(x => x.name !== name)
                        .concat([{ name, time: Date.now() }]);
                    toast('🙋 报名成功，等你来一起做项目！');
                    renderProjects();
                })
                .catch(err => toast('❌ ' + err.message));
        });
    });
    $$('.project-poster', grid).forEach(bindTilt);
}

/* ---------- 诗笺 · 相片堆叠 ---------- */
function buildQuoteStack(list) {
    const stack = $('#quoteStack');
    if (!stack) return;
    const pick = [
        list.find(p => p.type === 'image' && (p.name.includes('课余日常') || p.name.includes('读书'))),
        list.find(p => p.type === 'image' && p.name.includes('同学过生日')),
        list.find(p => p.type === 'image' && p.name.includes('迎新晚会'))
    ].filter(Boolean);
    if (pick.length < 3) {
        for (const p of list.filter(x => x.type === 'image')) {
            if (pick.length >= 3) break;
            if (!pick.includes(p)) pick.push(p);
        }
    }
    stack.innerHTML = pick.slice(0, 3).map(p => `<img src="${esc(thumbOf(p))}" alt="">`).join('');
}

/* ---------- 班级社区 ---------- */
const POST_COLORS = ['#7FA9D6', '#C9A3C4', '#9B93D9', '#7FB8A8', '#C9B08F', '#8E9CD6',
    '#C99BA6', '#8FB6C9', '#A99ED9', '#D6A3B8', '#93BFA3', '#B9A0C9'];

function avatarColor(name) {
    let h = 0;
    for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return POST_COLORS[h % POST_COLORS.length];
}

async function renderCommunity() {
    const list = $('#postList');
    if (!list) return;
    const empty = $('#postEmpty');
    try {
        const data = await api('/api/posts');
        const posts = data.posts || [];
        empty.hidden = posts.length > 0;
        list.innerHTML = posts.map(postCardHtml).join('');
    } catch {
        empty.hidden = false;
        empty.textContent = '⚠️ 连不上服务器，社区暂不可用';
    }
}

function postCardHtml(p) {
    const liked = (p.likesBy || []).includes(getClientId());
    const comments = p.comments || [];
    return `
    <div class="post-card" data-id="${esc(p.id)}">
        <div class="post-head">
            <span class="post-avatar" style="background:${avatarColor(p.name)}">${esc((p.name || '匿')[0])}</span>
            <div>
                <div class="post-name">${esc(p.name)}</div>
                <div class="post-time">${fmtTime(p.time)}</div>
            </div>
            ${p.emoji ? `<span class="note-emoji">${esc(p.emoji)}</span>` : ''}
            <button class="post-del" title="删除动态">删除</button>
        </div>
        <p class="post-content">${esc(p.content)}</p>
        <div class="post-actions">
            <button class="post-like ${liked ? 'liked' : ''}">❤️ <span>${(p.likesBy || []).length}</span></button>
            <button class="post-cmt">💬 <span>${comments.length}</span></button>
        </div>
        <div class="post-comments">
            ${comments.map(c => `
            <div class="post-comment" data-cid="${esc(c.id)}">
                <b>${esc(c.name)}</b>${esc(c.content)}
                <button class="pc-del" title="删除评论">×</button>
            </div>`).join('')}
            <div class="pc-input">
                <input type="text" placeholder="写条评论…" maxlength="300">
                <button>发送</button>
            </div>
        </div>
    </div>`;
}

async function deleteWithKey(url, id, what) {
    const myKey = getMyKeys()[id];
    let body = { key: myKey || '' };
    if (!myKey) {
        const pw = prompt(`输入站长密码可删除这条${what}：`);
        if (pw == null) return false;
        body = { adminPassword: pw };
    } else if (!confirm(`确定删除这条${what}吗？`)) {
        return false;
    }
    try {
        await api(url, { method: 'DELETE', body: JSON.stringify(body) });
        return true;
    } catch (e) {
        toast('❌ ' + e.message);
        return false;
    }
}

$('#postContent').addEventListener('input', () => {
    $('#postCount').textContent = $('#postContent').value.length;
});

$('#postSend').addEventListener('click', async () => {
    const name = $('#postName').value.trim() || localStorage.getItem('c5-nick') || '匿名同学';
    const content = $('#postContent').value.trim();
    if (!content) return toast('写点什么再发布吧~');
    const btn = $('#postSend');
    btn.disabled = true; btn.textContent = '发布中…';
    try {
        const data = await api('/api/posts', { method: 'POST', body: JSON.stringify({ name, content }) });
        saveMyKey(data.post.id, data.post.key);
        localStorage.setItem('c5-nick', name);
        $('#postContent').value = '';
        $('#postCount').textContent = '0';
        toast('✨ 动态已发布');
        renderCommunity();
    } catch (e) {
        toast('❌ ' + e.message);
    }
    btn.disabled = false; btn.textContent = '发布 ✨';
});

$('#postList').addEventListener('click', async (e) => {
    const card = e.target.closest('.post-card');
    if (!card) return;
    const id = card.dataset.id;

    if (e.target.closest('.post-like')) {
        try {
            const data = await api(`/api/posts/${id}/like`, {
                method: 'POST',
                body: JSON.stringify({ clientId: getClientId() })
            });
            renderCommunity();
            toast(data.liked ? '❤️ 已点赞' : '已取消点赞');
        } catch (err) { toast('❌ ' + err.message); }
        return;
    }

    if (e.target.closest('.post-del')) {
        const ok = await deleteWithKey(`/api/posts/${id}`, id, '动态');
        if (ok) { toast('已删除'); renderCommunity(); }
        return;
    }

    if (e.target.closest('.pc-del')) {
        const cid = e.target.closest('.post-comment').dataset.cid;
        const ok = await deleteWithKey(`/api/posts/${id}/comments/${cid}`, cid, '评论');
        if (ok) { toast('已删除'); renderCommunity(); }
        return;
    }

    if (e.target.closest('.pc-input button')) {
        const input = card.querySelector('.pc-input input');
        const content = input.value.trim();
        if (!content) return toast('先写条评论吧~');
        const name = localStorage.getItem('c5-nick') || '匿名同学';
        try {
            const data = await api(`/api/posts/${id}/comments`, {
                method: 'POST',
                body: JSON.stringify({ name, content })
            });
            saveMyKey(data.comment.id, data.comment.key);
            input.value = '';
            toast('💬 评论已发送');
            renderCommunity();
        } catch (err) { toast('❌ ' + err.message); }
    }
});

$('#postList').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('.pc-input input')) {
        e.preventDefault();
        e.target.closest('.pc-input').querySelector('button').click();
    }
});

/* ---------- 期末复习 ---------- */
const REVIEW_COURSES = [
    { name: 'C 语言程序设计', icon: '💻', topics: ['指针与数组：多画内存图', '结构体 + 链表是重点', '上机题先写伪代码再动手'] },
    { name: '高等数学', icon: '∫', topics: ['极限与连续：等价无穷小', '导数应用：单调性 / 最值', '积分公式表要背熟'] },
    { name: '线性代数', icon: '🧮', topics: ['行列式与矩阵运算', '向量组线性相关性', '特征值与特征向量'] },
    { name: '大学英语', icon: '📖', topics: ['高频词汇 + 作文模板', '听力每天 20 分钟', '翻译常考句型练习'] },
    { name: '数据结构', icon: '🌳', topics: ['线性表 / 栈 / 队列', '二叉树遍历与复杂度', '排序算法对比记忆'] }
];

function renderReview() {
    const grid = $('#reviewGrid');
    if (!grid) return;
    grid.innerHTML = REVIEW_COURSES.map(c => `
        <div class="review-card">
            <h4>${c.icon} ${esc(c.name)}</h4>
            <ul>${c.topics.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        </div>`).join('');
    updateCheckin();
}

function getCheckin() {
    try { return JSON.parse(localStorage.getItem('c5-checkin') || '{}'); } catch { return {}; }
}
function updateCheckin() {
    const btn = $('#reviewCheckin');
    const status = $('#reviewStatus');
    if (!btn) return;
    const data = getCheckin();
    const today = new Date().toISOString().slice(0, 10);
    const days = Object.keys(data).length;
    if (data[today]) {
        btn.classList.add('done');
        btn.textContent = '今日已打卡 ✓';
    } else {
        btn.classList.remove('done');
        btn.textContent = '今日复习打卡 ✓';
    }
    if (status) status.textContent = `本机累计打卡 ${days} 天`;
}
$('#reviewCheckin')?.addEventListener('click', () => {
    const data = getCheckin();
    const today = new Date().toISOString().slice(0, 10);
    if (data[today]) return;
    data[today] = true;
    localStorage.setItem('c5-checkin', JSON.stringify(data));
    updateCheckin();
    toast('✅ 今日复习打卡成功，继续保持！');
});

/* ---------- 复习资料共享 ---------- */
let reviewFiles = [];

function fmtSize(n) {
    if (!n) return '';
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    if (n >= 1024) return Math.round(n / 1024) + ' KB';
    return n + ' B';
}

function fileIcon(name) {
    const ext = (String(name).split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx', 'txt', 'md'].includes(ext)) return '📝';
    if (['ppt', 'pptx'].includes(ext)) return '📊';
    if (['xls', 'xlsx'].includes(ext)) return '📈';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼';
    if (['zip', 'rar', '7z'].includes(ext)) return '🗜';
    return '📎';
}

async function renderReviewFiles() {
    const list = $('#shareList');
    if (!list) return;
    const empty = $('#shareEmpty');
    try {
        const d = await api('/api/review/files');
        reviewFiles = d.files || [];
    } catch { reviewFiles = []; }
    list.innerHTML = reviewFiles.map(f => `
        <div class="share-item" data-id="${esc(f.id)}">
            <span class="share-icon">${fileIcon(f.name)}</span>
            <div class="share-main">
                <div class="share-name" title="${esc(f.name)}">${esc(f.name)}</div>
                <div class="share-meta">
                    <span>${esc(f.category)}</span><span>${esc(f.uploader)}</span>
                    <span>${fmtTime(f.time)}</span><span>${fmtSize(f.size)}</span>
                </div>
            </div>
            <div class="share-actions">
                <a href="${esc(f.path)}" download="${esc(f.name)}" title="下载">⬇</a>
                <button class="share-del" title="删除">✕</button>
            </div>
        </div>`).join('');
    if (empty) empty.hidden = reviewFiles.length > 0;
}

$('#shareList')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.share-del');
    if (!btn) return;
    const item = btn.closest('.share-item');
    const ok = await deleteWithKey(`/api/review/files/${item.dataset.id}`, item.dataset.id, '资料');
    if (ok) { toast('已删除'); renderReviewFiles(); }
});

function uploadShareOne(file, name, cat) {
    return new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('uploader', name);
        fd.append('category', cat);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/review/files');
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                if (data.file.key) saveMyKey(data.file.id, data.file.key);
                resolve(data.file);
            } else {
                let msg = '上传失败';
                try { msg = JSON.parse(xhr.responseText).error || msg; } catch {}
                reject(new Error(msg));
            }
        };
        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.send(fd);
    });
}

async function uploadShareFiles(files) {
    if (!files.length) return;
    const name = $('#shareName').value.trim() || localStorage.getItem('c5-nick') || '匿名同学';
    const cat = $('#shareCat').value;
    let ok = 0;
    for (const f of files) {
        if (f.size > 20 * 1024 * 1024) { toast(`❌ ${f.name} 超过 20MB`); continue; }
        try {
            await uploadShareOne(f, name, cat);
            ok++;
        } catch (e) {
            toast('❌ ' + (f.name || '') + '：' + e.message);
        }
    }
    $('#shareInput').value = '';
    if (ok) { toast(`📎 已上传 ${ok} 份资料，谢谢分享！`); renderReviewFiles(); }
}

const shareDrop = $('#shareDrop');
if (shareDrop) {
    shareDrop.addEventListener('click', () => $('#shareInput').click());
    $('#shareInput').addEventListener('change', () => uploadShareFiles([...$('#shareInput').files]));
    ['dragover', 'dragenter'].forEach(ev => shareDrop.addEventListener(ev, (e) => {
        e.preventDefault();
        shareDrop.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach(ev => shareDrop.addEventListener(ev, (e) => {
        e.preventDefault();
        shareDrop.classList.remove('dragover');
    }));
    shareDrop.addEventListener('drop', (e) => uploadShareFiles([...e.dataTransfer.files]));
}

/* ---------- 3D 倾斜（鼠标跟随） ---------- */
function bindTilt(el) {
    if (!el || el.dataset.tiltBound) return;
    el.dataset.tiltBound = '1';
    el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
}

/* ---------- 留言墙 ---------- */
const EMOJIS = ['😀', '😂', '🥰', '😎', '🤩', '🥳', '😭', '😴', '👍', '👏', '💪', '❤️', '🔥', '🎉', '🌟', '🍀'];
let myMsgEmoji = '';

function renderEmojiPick() {
    const pick = $('#emojiPick');
    pick.innerHTML = EMOJIS.map(e => `<span class="emoji-item ${e === myMsgEmoji ? 'picked' : ''}" data-e="${e}">${e}</span>`).join('');
    $$('.emoji-item', pick).forEach(el => el.addEventListener('click', () => {
        myMsgEmoji = el.dataset.e;
        renderEmojiPick();
    }));
}
renderEmojiPick();

$('#msgContent').addEventListener('input', () => {
    $('#msgCount').textContent = $('#msgContent').value.length;
});

$('#msgSend').addEventListener('click', sendMessage);
$('#msgContent').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendMessage();
});

async function sendMessage() {
    const name = $('#msgName').value.trim() || localStorage.getItem('c5-nick') || '匿名同学';
    const content = $('#msgContent').value.trim();
    if (!content) return toast('先写点什么再贴上去吧~');
    const btn = $('#msgSend');
    btn.disabled = true; btn.textContent = '贴上中…';
    try {
        const data = await api('/api/messages', { method: 'POST', body: JSON.stringify({ name, content, emoji: myMsgEmoji }) });
        saveMyKey(data.message.id, data.message.key);
        $('#msgContent').value = '';
        $('#msgCount').textContent = '0';
        myMsgEmoji = '';
        renderEmojiPick();
        toast('✨ 留言已上墙');
        renderBoard();
        loadStats();
    } catch (e) {
        toast('❌ ' + e.message);
    }
    btn.disabled = false; btn.textContent = '贴上去 ✨';
}

function noteCard(m, delay) {
    const initial = esc((m.name || '匿')[0]);
    return `
    <div class="note-card" data-hue="${m.hue % 12}" data-id="${esc(m.id)}" style="animation-delay:${delay}ms">
        <div class="note-head">
            <span class="note-avatar" data-hue="${m.hue % 12}">${initial}</span>
            <div>
                <div class="note-who">${esc(m.name)}</div>
                <div class="note-time">${fmtTime(m.time)}</div>
            </div>
            ${m.emoji ? `<span class="note-emoji">${esc(m.emoji)}</span>` : ''}
        </div>
        <p class="note-content">${esc(m.content)}</p>
        <button class="note-delete" title="删除留言">删除</button>
    </div>`;
}

async function renderBoard() {
    const wall = $('#boardWall');
    try {
        const data = await api('/api/messages');
        wall.innerHTML = data.messages.map((m, i) => noteCard(m, Math.min(i, 8) * 40)).join('');
    } catch {
        wall.innerHTML = '<p class="album-empty">⚠️ 连不上服务器，留言墙暂不可用</p>';
        return;
    }
    $$('.note-delete', wall).forEach(btn => btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const card = btn.closest('.note-card');
        const id = card.dataset.id;
        const myKey = getMyKeys()[id];
        let body = { key: myKey || '' };
        if (!myKey) {
            const pw = prompt('只有留言本人或站长可以删除。\n请输入站长密码：');
            if (pw == null) return;
            body = { adminPassword: pw };
        } else if (!confirm('确定删除这条留言吗？')) {
            return;
        }
        try {
            await api(`/api/messages/${id}`, { method: 'DELETE', body: JSON.stringify(body) });
            toast('已删除');
            renderBoard();
            loadStats();
        } catch (err) { toast('❌ ' + err.message); }
    }));
}
renderBoard();

/* ---------- 聊天室 ---------- */
let ws = null;
let chatJoined = false;
let myChat = null;

function updateOnline(n) {
    $('#onlineCount').textContent = n;
    const so = $('#statOnline');
    if (so) so.textContent = n;
    $('#chatStatus').textContent = n > 0 ? `已连接 · 我是 ${myChat ? myChat.name : '…'}` : '已连接';
    $('#chatDot').classList.add('online');
}

function ensureNickname(cb) {
    const saved = localStorage.getItem('c5-nick');
    if (saved) { cb(saved); return; }
    const modal = $('#nickModal');
    const input = $('#nickInput');
    modal.hidden = false;
    input.focus();
    const done = () => {
        const name = input.value.trim().slice(0, 12);
        if (!name) { toast('起个昵称再进来吧~'); return; }
        localStorage.setItem('c5-nick', name);
        modal.hidden = true;
        cb(name);
    };
    $('#nickOk').onclick = done;
    input.onkeydown = (e) => { if (e.key === 'Enter') done(); };
}

function connectChat() {
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);

    ws.onopen = () => {
        $('#chatDot').classList.add('online');
        $('#chatStatus').textContent = '已连接';
        if (myChat) {
            ws.send(JSON.stringify({ type: 'join', name: myChat.name }));
            chatJoined = true;
        }
    };
    ws.onclose = () => {
        $('#chatDot').classList.remove('online');
        $('#chatStatus').textContent = '连接断开，3 秒后重连…';
        if (chatJoined || myChat) setTimeout(connectChat, 3000);
    };
    ws.onerror = () => {};
    ws.onmessage = (ev) => handleChatMsg(JSON.parse(ev.data));
}

function handleChatMsg(msg) {
    const body = $('#chatBody');
    if (msg.type === 'welcome') {
        myChat = msg.you;
        $('#chatHint').hidden = true;
        updateOnline(msg.online);
        body.querySelectorAll('.chat-row, .chat-sys').forEach(el => el.remove());
        msg.history.forEach(m => appendChatMsg(m, myChat.name));
        appendChatSys('🎉 欢迎加入聊天室，和大家打个招呼吧！');
        scrollChat();
        return;
    }
    if (msg.type === 'join') {
        updateOnline(msg.online);
        appendChatSys(`👋 ${msg.name} 进入了聊天室`);
        return;
    }
    if (msg.type === 'leave') {
        updateOnline(msg.online);
        appendChatSys(`🚪 ${msg.name} 离开了聊天室`);
        return;
    }
    if (msg.type === 'msg') {
        appendChatMsg(msg, myChat ? myChat.name : '');
        scrollChat();
    }
}

function appendChatSys(text) {
    const body = $('#chatBody');
    const el = document.createElement('div');
    el.className = 'chat-sys';
    el.textContent = text;
    body.appendChild(el);
    scrollChat();
}

function appendChatMsg(m, myName) {
    const body = $('#chatBody');
    const mine = m.name === myName;
    const el = document.createElement('div');
    el.className = 'chat-row' + (mine ? ' mine' : '');
    el.innerHTML = `
        <span class="chat-ava" style="background:${esc(m.color || '#93B4DC')}">${esc((m.name || '?')[0])}</span>
        <div class="chat-msg">
            <div class="chat-meta">${esc(m.name)} · ${fmtTime(m.time)}</div>
            <div class="chat-bubble">${esc(m.text)}</div>
        </div>`;
    body.appendChild(el);
    scrollChat();
}

function scrollChat() {
    const body = $('#chatBody');
    body.scrollTop = body.scrollHeight;
}

function sendChat() {
    const input = $('#chatInput');
    const text = input.value.trim();
    if (!text) return;
    if (!myChat) return;
    ws.send(JSON.stringify({ type: 'msg', text }));
    input.value = '';
}

const chatInput = $('#chatInput');
chatInput.addEventListener('focus', () => {
    if (!myChat) {
        chatInput.blur();
        ensureNickname((name) => {
            myChat = { name };
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'join', name }));
                chatJoined = true;
                $('#chatStatus').textContent = '已连接 · 我是 ' + name;
            } else connectChat();
            $('#chatInput').disabled = false;
        });
    }
});
$('#chatSend').addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

const chatObserver = new IntersectionObserver((entries) => {
    entries.forEach(en => {
        if (en.isIntersecting) {
            connectChat();
            chatObserver.disconnect();
        }
    });
}, { threshold: 0.2 });
chatObserver.observe($('#chat'));

/* ---------- 放映模式 ---------- */
const cinema = $('#cinema');
const cinemaImg = $('#cinemaImg');
const cinemaBackdrop = $('#cinemaBackdrop');
let cinemaDeck = [];
let cinemaIdx = 0;
let cinemaPlaying = true;
let cinemaTimer = null;

function buildCinemaDeck() {
    const exist = new Set(photos.map(p => p.path));
    const all = [...HERO_PHOTOS, ...CINEMA_EXTRA];
    const deck = all.filter(([path]) => exist.has(path))
        .map(([path, cap, cat]) => ({ path, caption: cap, cat }));
    if (deck.length < 3) {
        return photos.filter(p => p.type === 'image').slice(0, 20)
            .map(p => ({ path: p.path, caption: captionFor(p), cat: p.category }));
    }
    return deck;
}

function showCinemaItem() {
    const item = cinemaDeck[cinemaIdx];
    if (!item) return;
    cinemaImg.src = bigOf(item.path);
    cinemaBackdrop.style.backgroundImage = `url("${bigOf(item.path)}")`;
    $('#cinemaTitle').textContent = item.caption;
    $('#cinemaCat').textContent = item.cat || '展厅';
    $('#cinemaCount').textContent = `${cinemaIdx + 1} / ${cinemaDeck.length}`;
    $('#cinemaBar').style.width = ((cinemaIdx + 1) / cinemaDeck.length * 100) + '%';
}

function startCinemaTimer() {
    clearInterval(cinemaTimer);
    if (!cinemaPlaying) return;
    cinemaTimer = setInterval(() => {
        if (cinemaIdx >= cinemaDeck.length - 1) {
            cinemaPlaying = false;
            $('#cinemaPlay').textContent = '▶';
            clearInterval(cinemaTimer);
            return;
        }
        cinemaIdx++;
        showCinemaItem();
    }, 5200);
}

function openCinema() {
    if (!photos.length) return toast('照片还在加载中…');
    cinemaDeck = buildCinemaDeck();
    cinemaIdx = 0;
    cinemaPlaying = true;
    $('#cinemaPlay').textContent = '⏸';
    showCinemaItem();
    cinema.classList.add('active');
    document.body.style.overflow = 'hidden';
    startCinemaTimer();
}

function closeCinema() {
    cinema.classList.remove('active');
    document.body.style.overflow = '';
    clearInterval(cinemaTimer);
}

function cinemaStep(dir) {
    if (!cinemaDeck.length) return;
    cinemaIdx = (cinemaIdx + dir + cinemaDeck.length) % cinemaDeck.length;
    showCinemaItem();
    startCinemaTimer();
}

$('#heroCinema').addEventListener('click', openCinema);
$('#cinemaFab').addEventListener('click', openCinema);
$('#cinemaClose').addEventListener('click', closeCinema);
$('#cinemaPrev').addEventListener('click', () => cinemaStep(-1));
$('#cinemaNext').addEventListener('click', () => cinemaStep(1));
$('#cinemaPlay').addEventListener('click', () => {
    cinemaPlaying = !cinemaPlaying;
    $('#cinemaPlay').textContent = cinemaPlaying ? '⏸' : '▶';
    if (cinemaPlaying) startCinemaTimer(); else clearInterval(cinemaTimer);
});
cinema.addEventListener('click', (e) => {
    if (e.target === cinema || e.target === cinemaBackdrop) closeCinema();
});

document.addEventListener('keydown', (e) => {
    if (!cinema.classList.contains('active')) return;
    if (e.key === 'Escape') closeCinema();
    if (e.key === 'ArrowLeft') cinemaStep(-1);
    if (e.key === 'ArrowRight') cinemaStep(1);
    if (e.key === ' ') { e.preventDefault(); $('#cinemaPlay').click(); }
});

/* ---------- 启动 ---------- */
danmaku.layer = $('#danmakuLayer');
renderReview();
renderReviewFiles();
loadPhotos();
renderCommunity();
