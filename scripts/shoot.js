// 无头浏览器验证（回忆录版）：node scripts/shoot.js
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        headless: 'new',
        args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1']
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(1800);

    const metrics = await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const thumbs = [...document.querySelectorAll('img')].filter(i => i.src.includes('/thumbs/'));
        return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            chapters: document.querySelectorAll('.chapter').length,
            chapterTitles: [...document.querySelectorAll('.chapter h3')].map(e => e.textContent),
            guideLinks: document.querySelectorAll('.memoir-guide a').length,
            chapterCards: document.querySelectorAll('.chapter-grid .photo-card').length,
            thumbsUsed: thumbs.length,
            thumbsLoaded: thumbs.filter(i => i.naturalWidth > 0).length,
            honorCards: document.querySelectorAll('.honor-card').length,
            projectCards: document.querySelectorAll('.project-card').length,
            heroImgs: document.querySelectorAll('#heroStage img').length,
            heroLoaded: [...document.querySelectorAll('#heroStage img')].filter(i => i.naturalWidth > 0).length,
            captionSample: [...document.querySelectorAll('.chapter-grid .photo-meta .who')].slice(0, 4).map(e => e.textContent),
            sections: [...document.querySelectorAll('section[id]')].map(s => ({ id: s.id, h: Math.round(s.getBoundingClientRect().height) }))
        };
    });
    console.log('METRICS', JSON.stringify(metrics, null, 1));

    // 重新加载计时（含所有图片）
    const t0 = Date.now();
    await page.reload({ waitUntil: 'networkidle0' });
    console.log('RELOAD_MS', Date.now() - t0);

    await page.screenshot({ path: path.join(OUT, 'home-1440.png') });

    // 回忆录章节首屏
    await page.evaluate(() => window.scrollTo(0, document.getElementById('album').offsetTop + 180));
    await sleep(2600);
    await page.screenshot({ path: path.join(OUT, 'memoir-1440.png') });

    // 志愿章节
    await page.evaluate(() => document.getElementById('m3').scrollIntoView({ behavior: 'instant' }));
    await sleep(2200);
    await page.screenshot({ path: path.join(OUT, 'memoir-volunteer.png') });

    // 放映模式
    await page.click('#cinemaFab');
    await sleep(900);
    const cinema = await page.evaluate(() => ({
        active: document.querySelector('#cinema').classList.contains('active'),
        count: document.querySelector('#cinemaCount').textContent,
        imgLoaded: document.querySelector('#cinemaImg').naturalWidth > 0,
        src: document.querySelector('#cinemaImg').getAttribute('src')
    }));
    console.log('CINEMA', JSON.stringify(cinema));
    await page.screenshot({ path: path.join(OUT, 'cinema-1440.png') });
    await page.keyboard.press('Escape');
    await sleep(300);

    // 整页截图 + 移动端
    await page.screenshot({ path: path.join(OUT, 'full-1440.png'), fullPage: true });

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle0' });
    await sleep(1500);
    const mobile = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        chapters: document.querySelectorAll('.chapter').length,
        cards: document.querySelectorAll('.chapter-grid .photo-card').length
    }));
    console.log('MOBILE', JSON.stringify(mobile));
    await page.screenshot({ path: path.join(OUT, 'home-mobile.png') });
    await page.evaluate(() => document.getElementById('album').scrollIntoView({ behavior: 'instant' }));
    await sleep(2000);
    await page.screenshot({ path: path.join(OUT, 'memoir-mobile.png') });

    console.log('CONSOLE_ERRORS', JSON.stringify(errors));
    await browser.close();
})().catch(e => { console.error('SHOOT_FAIL', e.message); process.exit(1); });
