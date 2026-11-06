// 分段截图（回忆录版）：node scripts/shots-sections.js
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'screenshots');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        headless: 'new',
        args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(1600);

    for (const id of ['album', 'honor', 'projects', 'board']) {
        await page.evaluate((id) => document.getElementById(id).scrollIntoView({ behavior: 'instant', block: 'start' }), id);
        await sleep(2400);
        await page.screenshot({ path: path.join(OUT, 'sec-' + id + '.png') });
        console.log('shot', id);
    }

    for (const ch of ['m3', 'm5']) {
        await page.evaluate((id) => document.getElementById(id).scrollIntoView({ behavior: 'instant', block: 'start' }), ch);
        await sleep(2400);
        await page.screenshot({ path: path.join(OUT, 'memoir-' + ch + '.png') });
        console.log('shot', ch);
    }

    await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
