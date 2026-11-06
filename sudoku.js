'use strict';

/* =========================================================
   Sudoku — A4 yazdırma sayfası üretici
   - Tek çözümlü rastgele bulmacalar
   - İstenen sayıda A4 sayfası
   - Sayfa başına 2 / 4 / 6 bulmaca
   - İsteğe bağlı çözüm sayfaları
   ========================================================= */

const DIFFICULTIES = {
    easy:   { label: 'Kolay', clues: 45 },
    medium: { label: 'Orta',  clues: 34 },
    hard:   { label: 'Zor',   clues: 28 }
};

const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);
const MAX_PAGES = 200;

const els = {};
let isBusy = false;

document.addEventListener('DOMContentLoaded', init);

function init() {
    els.difficulty = document.getElementById('difficulty');
    els.pageCount = document.getElementById('pageCount');
    els.perPage = document.getElementById('perPage');
    els.includeSolutions = document.getElementById('includeSolutions');
    els.generateBtn = document.getElementById('generateBtn');
    els.printBtn = document.getElementById('printBtn');
    els.status = document.getElementById('status');
    els.sheets = document.getElementById('sheets');

    els.generateBtn.addEventListener('click', generate);
    els.printBtn.addEventListener('click', () => window.print());

    // Sayfa sayısını geçerli aralıkta tut
    els.pageCount.addEventListener('change', () => {
        els.pageCount.value = clampPages(els.pageCount.value);
    });

    generate();
}

/* =========================================================
   Üretim akışı
   ========================================================= */

async function generate() {
    if (isBusy) return;

    const pages = clampPages(els.pageCount.value);
    els.pageCount.value = pages;

    const perPage = Number(els.perPage.value);
    const difficultyChoice = els.difficulty.value;
    const withSolutions = els.includeSolutions.checked;

    isBusy = true;
    setBusyState(true);
    els.sheets.innerHTML = '';
    setStatus('Bulmacalar oluşturuluyor…');

    const allPuzzles = [];
    let puzzleNumber = 1;

    try {
        for (let page = 1; page <= pages; page++) {
            const sheet = createSheet({
                pageNumber: page,
                totalPages: pages,
                perPage,
                difficultyChoice,
                isSolution: false
            });

            const container = sheet.querySelector('.puzzles');

            for (let i = 0; i < perPage; i++) {
                const difficultyKey = difficultyChoice === 'mixed'
                    ? DIFFICULTY_KEYS[Math.floor(Math.random() * DIFFICULTY_KEYS.length)]
                    : difficultyChoice;

                const { solution, puzzle } = makePuzzle(DIFFICULTIES[difficultyKey].clues);
                const record = {
                    number: puzzleNumber++,
                    difficultyKey,
                    puzzle,
                    solution
                };

                allPuzzles.push(record);
                container.appendChild(
                    createPuzzleBlock(record, false)
                );
            }

            els.sheets.appendChild(sheet);
            setStatus(`Sayfa ${page}/${pages} hazırlanıyor…`);

            // Arayüzün donmaması için her sayfadan sonra nefes al
            await yieldToUI();
        }

        if (withSolutions) {
            for (let page = 1; page <= pages; page++) {
                const sheet = createSheet({
                    pageNumber: page,
                    totalPages: pages,
                    perPage,
                    difficultyChoice,
                    isSolution: true
                });

                const container = sheet.querySelector('.puzzles');
                const start = (page - 1) * perPage;

                for (let i = 0; i < perPage; i++) {
                    const record = allPuzzles[start + i];
                    if (!record) break;
                    container.appendChild(createPuzzleBlock(record, true));
                }

                els.sheets.appendChild(sheet);
                setStatus(`Çözüm sayfası ${page}/${pages} hazırlanıyor…`);
                await yieldToUI();
            }
        }

        const totalSheets = withSolutions ? pages * 2 : pages;
        const totalPuzzles = pages * perPage;
        setStatus(`${totalPuzzles} bulmaca, ${totalSheets} A4 sayfası hazır. “Yazdır” ile yazdırabilirsin.`);
    } catch (error) {
        console.error(error);
        setStatus('Bir hata oluştu. Lütfen tekrar dene.', true);
    } finally {
        isBusy = false;
        setBusyState(false);
    }
}

/* =========================================================
   Sayfa ve bulmaca DOM'u
   ========================================================= */

function createSheet({ pageNumber, totalPages, perPage, difficultyChoice, isSolution }) {
    const sheet = document.createElement('section');
    sheet.className = isSolution ? 'sheet is-solution' : 'sheet';
    sheet.dataset.per = String(perPage);

    const difficultyLabel = difficultyChoice === 'mixed'
        ? 'Karışık'
        : DIFFICULTIES[difficultyChoice].label;

    const head = document.createElement('div');
    head.className = 'sheet-head';
    head.innerHTML =
        `<span class="sheet-title">${isSolution ? 'ÇÖZÜMLER' : 'SUDOKU'}</span>` +
        `<span class="sheet-meta">${difficultyLabel} · Sayfa ${pageNumber}/${totalPages}</span>`;

    const puzzles = document.createElement('div');
    puzzles.className = 'puzzles';

    const foot = document.createElement('div');
    foot.className = 'sheet-foot';
    foot.innerHTML =
        `<span>${isSolution ? 'Cevap anahtarı' : 'Her satır, sütun ve 3×3 blokta 1–9 rakamları birer kez yer almalıdır.'}</span>` +
        `<span>© Sudoku</span>`;

    sheet.append(head, puzzles, foot);
    return sheet;
}

function createPuzzleBlock(record, isSolution) {
    const wrapper = document.createElement('div');
    wrapper.className = 'puzzle';

    const title = document.createElement('div');
    title.className = 'puzzle-title';

    const name = document.createElement('span');
    name.textContent = `${isSolution ? 'Çözüm' : 'Bulmaca'} ${record.number}`;

    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = DIFFICULTIES[record.difficultyKey].label;

    title.append(name, tag);

    const board = document.createElement('div');
    board.className = 'board';
    if (isSolution) board.classList.add('solution');

    const values = isSolution ? record.solution : record.puzzle;

    for (let i = 0; i < 81; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;

        const cell = document.createElement('div');
        cell.className = 'cell';

        if (col % 3 === 2 && col !== 8) cell.classList.add('br');
        if (row % 3 === 2 && row !== 8) cell.classList.add('bb');

        const value = values[i];
        if (value !== 0) {
            if (isSolution) {
                cell.textContent = String(value);
            } else {
                const strong = document.createElement('strong');
                strong.textContent = String(value);
                cell.appendChild(strong);
            }
        }

        board.appendChild(cell);
    }

    wrapper.append(title, board);
    return wrapper;
}

/* =========================================================
   Yardımcılar
   ========================================================= */

function clampPages(raw) {
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value)) return 4;
    return Math.min(MAX_PAGES, Math.max(1, value));
}

function setStatus(text, isError = false) {
    els.status.textContent = text;
    els.status.classList.toggle('error', isError);
}

function setBusyState(busy) {
    els.generateBtn.disabled = busy;
    els.generateBtn.textContent = busy ? 'Oluşturuluyor…' : 'Oluştur';
}

function yieldToUI() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

/* =========================================================
   Bulmaca üretimi (tek çözümlü)
   ========================================================= */

function makePuzzle(clueCount) {
    const solutionGrid = generateFullGrid();
    const puzzleGrid = solutionGrid.map(row => row.slice());
    const positions = shuffle([...Array(81).keys()]);

    let clues = 81;
    for (const pos of positions) {
        if (clues <= clueCount) break;

        const row = Math.floor(pos / 9);
        const col = pos % 9;
        const backup = puzzleGrid[row][col];
        if (backup === 0) continue;

        puzzleGrid[row][col] = 0;
        const copy = puzzleGrid.map(r => r.slice());

        // Yalnızca tek çözüm kalıyorsa hücreyi boş bırak
        if (countSolutions(copy, 2) !== 1) {
            puzzleGrid[row][col] = backup;
        } else {
            clues--;
        }
    }

    return {
        solution: solutionGrid.flat(),
        puzzle: puzzleGrid.flat()
    };
}

function generateFullGrid() {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillGrid(grid);
    return grid;
}

function fillGrid(grid) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] !== 0) continue;

            for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
                if (isSafe(grid, row, col, n)) {
                    grid[row][col] = n;
                    if (fillGrid(grid)) return true;
                    grid[row][col] = 0;
                }
            }
            return false;
        }
    }
    return true;
}

function countSolutions(grid, limit) {
    let emptyRow = -1;
    let emptyCol = -1;

    outer:
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === 0) {
                emptyRow = row;
                emptyCol = col;
                break outer;
            }
        }
    }

    if (emptyRow === -1) return 1;

    let count = 0;
    for (let n = 1; n <= 9; n++) {
        if (!isSafe(grid, emptyRow, emptyCol, n)) continue;

        grid[emptyRow][emptyCol] = n;
        count += countSolutions(grid, limit - count);
        grid[emptyRow][emptyCol] = 0;

        if (count >= limit) break;
    }
    return count;
}

function isSafe(grid, row, col, n) {
    for (let i = 0; i < 9; i++) {
        if (grid[row][i] === n) return false;
        if (grid[i][col] === n) return false;
    }

    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if (grid[r][c] === n) return false;
        }
    }
    return true;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
