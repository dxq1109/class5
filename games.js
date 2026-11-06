/* ============================================================
   课间游戏角：2048 · 贪吃蛇 · 五子棋 · 翻牌记忆
   ============================================================ */

(function () {
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // 旧浏览器兜底
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) {
            this.rect(x, y, w, h);
            return this;
        };
    }

    let toastTimer = null;
    function toast(text) {
        const el = $('#toast');
        el.textContent = text;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
    }

    /* ---------- 游戏标签切换 ---------- */
    const tabs = $$('#gameTabs .game-tab');
    tabs.forEach(t => t.addEventListener('click', () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        $$('.game-panel').forEach(p => p.classList.remove('active'));
        $('#' + t.dataset.game).classList.add('active');
        if (t.dataset.game !== 'snake') pauseSnake();
    }));

    /* ================= 2048 ================= */
    const b2048 = {
        board: new Array(16).fill(0),
        score: 0,
        best: +(localStorage.getItem('c5-b2048') || 0),
        over: false
    };
    const board2048 = $('#board2048');

    function render2048() {
        $('#g2048Score').textContent = b2048.score;
        if (b2048.score > b2048.best) {
            b2048.best = b2048.score;
            localStorage.setItem('c5-b2048', b2048.best);
        }
        $('#g2048Best').textContent = b2048.best;
        board2048.innerHTML = b2048.board.map((v, i) =>
            `<div class="tile ${v ? '' : 'empty'}" data-v="${v}" data-i="${i}">${v || ''}</div>`
        ).join('');
        board2048.classList.toggle('gameover', b2048.over);
    }

    function add2048Tile() {
        const empties = b2048.board.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
        if (!empties.length) return;
        const idx = empties[Math.floor(Math.random() * empties.length)];
        b2048.board[idx] = Math.random() < 0.9 ? 2 : 4;
        render2048();
        setTimeout(() => {
            const el = board2048.querySelector(`[data-i="${idx}"]`);
            if (el) el.classList.add('pop');
        }, 10);
    }

    function slide2048(row) {
        let arr = row.filter(v => v);
        let gained = 0;
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) {
                arr[i] *= 2;
                gained += arr[i];
                arr.splice(i + 1, 1);
            }
        }
        while (arr.length < 4) arr.push(0);
        return { arr, gained };
    }

    function move2048(dir) {
        if (b2048.over) return;
        const before = b2048.board.join(',');
        let gained = 0;
        for (let i = 0; i < 4; i++) {
            let line = [];
            for (let j = 0; j < 4; j++) {
                const idx = dir === 'left' ? i * 4 + j : dir === 'right' ? i * 4 + 3 - j
                    : dir === 'up' ? j * 4 + i : (3 - j) * 4 + i;
                line.push(b2048.board[idx]);
            }
            const { arr, gained: g } = slide2048(line);
            gained += g;
            for (let j = 0; j < 4; j++) {
                const idx = dir === 'left' ? i * 4 + j : dir === 'right' ? i * 4 + 3 - j
                    : dir === 'up' ? j * 4 + i : (3 - j) * 4 + i;
                b2048.board[idx] = arr[j];
            }
        }
        if (b2048.board.join(',') !== before) {
            b2048.score += gained;
            add2048Tile();
            check2048Over();
        }
    }

    function check2048Over() {
        if (b2048.board.some(v => v === 0)) return;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 3; j++) {
                if (b2048.board[i * 4 + j] === b2048.board[i * 4 + j + 1]) return;
                if (b2048.board[j * 4 + i] === b2048.board[(j + 1) * 4 + i]) return;
            }
        }
        b2048.over = true;
        render2048();
        toast('😵 2048 游戏结束，再来一局？');
    }

    function restart2048() {
        b2048.board = new Array(16).fill(0);
        b2048.score = 0;
        b2048.over = false;
        add2048Tile();
        add2048Tile();
    }

    $('#g2048Restart').addEventListener('click', restart2048);

    document.addEventListener('keydown', (e) => {
        if (!$('#g2048').classList.contains('active')) return;
        const map = {
            ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
            a: 'left', d: 'right', w: 'up', s: 'down'
        };
        if (map[e.key]) { e.preventDefault(); move2048(map[e.key]); }
    });

    let touchStart = null;
    board2048.addEventListener('touchstart', (e) => {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    board2048.addEventListener('touchend', (e) => {
        if (!touchStart) return;
        const dx = e.changedTouches[0].clientX - touchStart.x;
        const dy = e.changedTouches[0].clientY - touchStart.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) {
            move2048(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        }
        touchStart = null;
    });

    restart2048();

    /* ================= 贪吃蛇 ================= */
    const snakeCanvas = $('#snakeCanvas');
    const sctx = snakeCanvas.getContext('2d');
    const S = 480, CELL = 24, N = S / CELL;
    const snake = {
        body: [], dir: { x: 1, y: 0 }, queue: [], food: null,
        score: 0, best: +(localStorage.getItem('c5-bsnake') || 0),
        running: false, over: false, timer: null, speed: 150
    };

    function snakeReset() {
        snake.body = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
        snake.dir = { x: 1, y: 0 };
        snake.queue = [];
        snake.score = 0;
        snake.speed = 150;
        snake.over = false;
        placeFood();
        $('#snakeScore').textContent = 0;
        $('#snakeBest').textContent = snake.best;
        const overlay = $('#snakeOverlay');
        overlay.hidden = true;
        snake.running = true;
    }

    function placeFood() {
        let p;
        do {
            p = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
        } while (snake.body.some(c => c.x === p.x && c.y === p.y));
        snake.food = p;
    }

    function drawSnake() {
        sctx.clearRect(0, 0, S, S);
        sctx.fillStyle = '#EDF5FC';
        sctx.fillRect(0, 0, S, S);
        // 网格
        sctx.strokeStyle = 'rgba(120,150,190,0.12)';
        sctx.lineWidth = 1;
        for (let i = 0; i <= N; i++) {
            sctx.beginPath(); sctx.moveTo(i * CELL, 0); sctx.lineTo(i * CELL, S); sctx.stroke();
            sctx.beginPath(); sctx.moveTo(0, i * CELL); sctx.lineTo(S, i * CELL); sctx.stroke();
        }
        // 食物
        if (snake.food) {
            const fx = snake.food.x * CELL + CELL / 2;
            const fy = snake.food.y * CELL + CELL / 2;
            const grad = sctx.createRadialGradient(fx, fy, 2, fx, fy, CELL / 2 - 2);
            grad.addColorStop(0, '#FFE3EC');
            grad.addColorStop(1, '#F2A6C0');
            sctx.fillStyle = grad;
            sctx.beginPath();
            sctx.arc(fx, fy, CELL / 2 - 3, 0, Math.PI * 2);
            sctx.fill();
        }
        // 蛇身（天空蓝渐变）
        snake.body.forEach((c, i) => {
            const t = i / Math.max(snake.body.length - 1, 1);
            const r = 127 + Math.round(74 * t);
            const g = 169 + Math.round(52 * t);
            const b = 214 + Math.round(28 * t);
            sctx.fillStyle = `rgb(${r},${g},${b})`;
            const x = c.x * CELL, y = c.y * CELL;
            sctx.beginPath();
            sctx.roundRect(x + 1, y + 1, CELL - 2, CELL - 2, i === 0 ? 8 : 6);
            sctx.fill();
            // 眼睛
            if (i === 0) {
                sctx.fillStyle = '#fff';
                const ex = x + CELL / 2 + snake.dir.x * 5;
                const ey = y + CELL / 2 + snake.dir.y * 5;
                sctx.beginPath(); sctx.arc(ex - 3, ey - 3, 3, 0, Math.PI * 2); sctx.fill();
                sctx.beginPath(); sctx.arc(ex + 3, ey + 3, 3, 0, Math.PI * 2); sctx.fill();
                sctx.fillStyle = '#28425F';
                sctx.beginPath(); sctx.arc(ex - 3 + snake.dir.x * 1.5, ey - 3 + snake.dir.y * 1.5, 1.6, 0, Math.PI * 2); sctx.fill();
                sctx.beginPath(); sctx.arc(ex + 3 + snake.dir.x * 1.5, ey + 3 + snake.dir.y * 1.5, 1.6, 0, Math.PI * 2); sctx.fill();
            }
        });
    }

    function snakeStep() {
        if (snake.queue.length) snake.dir = snake.queue.shift();
        const head = { x: snake.body[0].x + snake.dir.x, y: snake.body[0].y + snake.dir.y };
        // 撞墙或撞自己
        if (head.x < 0 || head.x >= N || head.y < 0 || head.y >= N || snake.body.some(c => c.x === head.x && c.y === head.y)) {
            snakeGameOver();
            return;
        }
        snake.body.unshift(head);
        if (snake.food && head.x === snake.food.x && head.y === snake.food.y) {
            snake.score += 10;
            snake.speed = Math.max(70, snake.speed - 3);
            $('#snakeScore').textContent = snake.score;
            placeFood();
        } else {
            snake.body.pop();
        }
        drawSnake();
        clearTimeout(snake.timer);
        snake.timer = setTimeout(snakeStep, snake.speed);
    }

    function snakeGameOver() {
        snake.running = false;
        snake.over = true;
        if (snake.score > snake.best) {
            snake.best = snake.score;
            localStorage.setItem('c5-bsnake', snake.best);
        }
        const overlay = $('#snakeOverlay');
        overlay.innerHTML = `<b>游戏结束 · ${snake.score} 分</b><span>点击重新开始</span>`;
        overlay.hidden = false;
    }

    function pauseSnake() {
        if (snake.running) {
            snake.running = false;
            clearTimeout(snake.timer);
            const overlay = $('#snakeOverlay');
            overlay.innerHTML = '<b>已暂停</b><span>点击继续</span>';
            overlay.hidden = false;
        }
    }

    $('#snakeOverlay').addEventListener('click', () => {
        if (snake.over || snake.body.length < 3) {
            snakeReset();
            snake.timer = setTimeout(snakeStep, snake.speed);
        } else if (!snake.running) {
            snake.running = true;
            $('#snakeOverlay').hidden = true;
            snake.timer = setTimeout(snakeStep, snake.speed);
        }
    });

    $('#snakePause').addEventListener('click', () => {
        if (snake.running) pauseSnake();
        else {
            $('#snakeOverlay').hidden = true;
            snake.running = true;
            snake.timer = setTimeout(snakeStep, snake.speed);
        }
    });

    function setSnakeDir(x, y) {
        if (!snake.running) return;
        const last = snake.queue.length ? snake.queue[snake.queue.length - 1] : snake.dir;
        if (last.x + x === 0 && last.y + y === 0) return;
        if (snake.queue.length < 2) snake.queue.push({ x, y });
    }

    document.addEventListener('keydown', (e) => {
        if (!$('#snake').classList.contains('active')) return;
        const map = {
            ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
            ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
            w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 }
        };
        if (map[e.key]) { e.preventDefault(); setSnakeDir(map[e.key].x, map[e.key].y); }
        if (e.key === ' ') {
            e.preventDefault();
            $('#snakePause').click();
        }
    });

    $$('#snakeDpad button').forEach(btn => btn.addEventListener('click', () => {
        const d = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[btn.dataset.d];
        setSnakeDir(d.x, d.y);
    }));

    // 初始状态：显示开始遮罩
    (function initSnake() {
        snake.body = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
        drawSnake();
        $('#snakeBest').textContent = snake.best;
    })();

    /* ================= 五子棋 ================= */
    const gCanvas = $('#gomokuCanvas');
    const gctx = gCanvas.getContext('2d');
    const GRID = 15, GM = 30, GCELL = (480 - GM * 2) / (GRID - 1);
    const gomoku = { board: [], turn: 1, moves: [], over: false };

    function gomokuReset() {
        gomoku.board = Array.from({ length: GRID }, () => new Array(GRID).fill(0));
        gomoku.turn = 1;
        gomoku.moves = [];
        gomoku.over = false;
        $('#gomokuOverlay').hidden = true;
        updateTurn();
        drawGomoku();
    }

    function updateTurn() {
        $('#gomokuTurn').textContent = gomoku.turn === 1 ? '⚫ 黑棋落子' : '⚪ 白棋落子';
    }

    function drawGomoku(winLine = []) {
        gctx.clearRect(0, 0, 480, 480);
        gctx.fillStyle = '#F7EFE3';
        gctx.fillRect(0, 0, 480, 480);
        // 木纹
        gctx.strokeStyle = 'rgba(190,160,120,0.14)';
        for (let i = 0; i < 18; i++) {
            gctx.beginPath();
            gctx.moveTo(0, i * 30 + Math.sin(i) * 6);
            gctx.lineTo(480, i * 30 + Math.cos(i) * 6);
            gctx.stroke();
        }
        // 网格
        gctx.strokeStyle = '#C9A98A';
        gctx.lineWidth = 1;
        for (let i = 0; i < GRID; i++) {
            const p = GM + i * GCELL;
            gctx.beginPath(); gctx.moveTo(GM, p); gctx.lineTo(480 - GM, p); gctx.stroke();
            gctx.beginPath(); gctx.moveTo(p, GM); gctx.lineTo(p, 480 - GM); gctx.stroke();
        }
        // 星位
        [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]].forEach(([x, y]) => {
            gctx.fillStyle = '#C9A98A';
            gctx.beginPath();
            gctx.arc(GM + x * GCELL, GM + y * GCELL, 4, 0, Math.PI * 2);
            gctx.fill();
        });
        // 棋子
        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                if (!gomoku.board[y][x]) continue;
                drawStone(x, y, gomoku.board[y][x]);
            }
        }
        // 获胜连线
        if (winLine.length) {
            gctx.strokeStyle = '#E8A97F';
            gctx.lineWidth = 5;
            gctx.lineCap = 'round';
            gctx.beginPath();
            gctx.moveTo(GM + winLine[0][0] * GCELL, GM + winLine[0][1] * GCELL);
            gctx.lineTo(GM + winLine[winLine.length - 1][0] * GCELL, GM + winLine[winLine.length - 1][1] * GCELL);
            gctx.stroke();
        }
    }

    function drawStone(x, y, color) {
        const cx = GM + x * GCELL, cy = GM + y * GCELL, r = GCELL / 2 - 2;
        const grad = gctx.createRadialGradient(cx - r / 3, cy - r / 3, r / 6, cx, cy, r);
        if (color === 1) {
            grad.addColorStop(0, '#6A6A6A');
            grad.addColorStop(1, '#0A0A0A');
        } else {
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(1, '#CFCFCF');
        }
        gctx.fillStyle = grad;
        gctx.beginPath();
        gctx.arc(cx, cy, r, 0, Math.PI * 2);
        gctx.fill();
    }

    function checkWin(x, y, color) {
        const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (const [dx, dy] of dirs) {
            let line = [[x, y]];
            for (let s = 1; s < 5; s++) {
                const nx = x + dx * s, ny = y + dy * s;
                if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || gomoku.board[ny][nx] !== color) break;
                line.push([nx, ny]);
            }
            for (let s = 1; s < 5; s++) {
                const nx = x - dx * s, ny = y - dy * s;
                if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || gomoku.board[ny][nx] !== color) break;
                line.unshift([nx, ny]);
            }
            if (line.length >= 5) return line;
        }
        return null;
    }

    let hoverCell = null;
    gCanvas.addEventListener('mousemove', (e) => {
        const rect = gCanvas.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) / rect.width * 480 - GM) / GCELL;
        const y = Math.round((e.clientY - rect.top) / rect.height * 480 - GM) / GCELL;
        const ix = Math.round(x), iy = Math.round(y);
        if (ix < 0 || ix >= GRID || iy < 0 || iy >= GRID) { hoverCell = null; return; }
        if (!gomoku.board[iy][ix] && (hoverCell === null || hoverCell[0] !== ix || hoverCell[1] !== iy)) {
            hoverCell = [ix, iy];
            drawGomoku();
            if (!gomoku.over) {
                gctx.globalAlpha = 0.4;
                drawStone(ix, iy, gomoku.turn);
                gctx.globalAlpha = 1;
            }
        }
    });
    gCanvas.addEventListener('mouseleave', () => { hoverCell = null; drawGomoku(); });

    gCanvas.addEventListener('click', (e) => {
        if (gomoku.over) return;
        const rect = gCanvas.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) / rect.width * 480 - GM) / GCELL;
        const y = Math.round((e.clientY - rect.top) / rect.height * 480 - GM) / GCELL;
        const ix = Math.round(x), iy = Math.round(y);
        if (ix < 0 || ix >= GRID || iy < 0 || iy >= GRID || gomoku.board[iy][ix]) return;
        gomoku.board[iy][ix] = gomoku.turn;
        gomoku.moves.push({ x: ix, y: iy, c: gomoku.turn });
        const winLine = checkWin(ix, iy, gomoku.turn);
        if (winLine) {
            gomoku.over = true;
            drawGomoku(winLine);
            const who = gomoku.turn === 1 ? '黑棋' : '白棋';
            $('#gomokuResult').textContent = `🎉 ${who}获胜！`;
            $('#gomokuOverlay').hidden = false;
        } else {
            gomoku.turn = gomoku.turn === 1 ? 2 : 1;
            updateTurn();
            drawGomoku();
        }
    });

    $('#gomokuUndo').addEventListener('click', () => {
        if (!gomoku.moves.length) return toast('还没有落子哦');
        const times = gomoku.over ? 1 : 2;
        for (let i = 0; i < times && gomoku.moves.length; i++) {
            const m = gomoku.moves.pop();
            gomoku.board[m.y][m.x] = 0;
            gomoku.turn = m.c;
        }
        gomoku.over = false;
        $('#gomokuOverlay').hidden = true;
        updateTurn();
        drawGomoku();
    });
    $('#gomokuRestart').addEventListener('click', gomokuReset);
    $('#gomokuOverlay').addEventListener('click', gomokuReset);

    gomokuReset();

    /* ================= 翻牌记忆 ================= */
    const FALLBACK_EMOJIS = ['🎓', '🏆', '📚', '⚽', '🎤', '🎨', '🌱', '🍀'];
    const memory = {
        deck: [],
        flipped: [],
        moves: 0,
        pairs: 0,
        lock: false,
        pool: []
    };

    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function memoryRestart() {
        const pool = memory.pool.filter(p => p.path).slice();
        let chosen;
        if (pool.length >= 8) {
            chosen = shuffle(pool).slice(0, 8).map(p => ({ type: 'img', src: p.path }));
        } else {
            chosen = shuffle(FALLBACK_EMOJIS).slice(0, 8).map(e => ({ type: 'emoji', char: e }));
        }
        memory.deck = shuffle([...chosen, ...chosen]).map((c, i) => ({ ...c, i }));
        memory.flipped = [];
        memory.moves = 0;
        memory.pairs = 0;
        memory.lock = false;
        $('#memoryMoves').textContent = 0;
        $('#memoryPairs').textContent = '0/8';
        const grid = $('#memoryGrid');
        grid.innerHTML = memory.deck.map(c => `
            <div class="mem-card" data-i="${c.i}">
                <div class="mem-face mem-back">?</div>
                <div class="mem-face mem-front">${c.type === 'img'
                    ? `<img src="${esc(c.src)}" alt="" loading="lazy">`
                    : `<span>${c.char}</span>`}</div>
            </div>`).join('');
        $$('.mem-card', grid).forEach(card => card.addEventListener('click', () => flipCard(card)));
    }

    function flipCard(card) {
        if (memory.lock || card.classList.contains('flip') || card.classList.contains('matched')) return;
        card.classList.add('flip');
        memory.flipped.push(card);
        if (memory.flipped.length === 2) {
            memory.moves++;
            $('#memoryMoves').textContent = memory.moves;
            const [a, b] = memory.flipped;
            const ia = a.dataset.i, ib = b.dataset.i;
            const same = memory.deck[ia].src === memory.deck[ib].src && memory.deck[ia].char === memory.deck[ib].char;
            if (same) {
                a.classList.add('matched');
                b.classList.add('matched');
                memory.flipped = [];
                memory.pairs++;
                $('#memoryPairs').textContent = memory.pairs + '/8';
                if (memory.pairs === 8) {
                    setTimeout(() => toast(`🎉 全部配对成功！共用了 ${memory.moves} 步`), 400);
                }
            } else {
                memory.lock = true;
                setTimeout(() => {
                    a.classList.remove('flip');
                    b.classList.remove('flip');
                    memory.flipped = [];
                    memory.lock = false;
                }, 800);
            }
        }
    }

    $('#memoryRestart').addEventListener('click', memoryRestart);

    /* ---------- 由 app.js 在照片加载完成后调用 ---------- */
    window.initGames = function (photoPool) {
        memory.pool = photoPool || [];
        memoryRestart();
    };
    memoryRestart(); // 先用 emoji 兜底，等照片加载完自动刷新
})();
