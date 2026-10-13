/* ═══════════════════════════════════════════════════════════
   APEX CALC — Scientific Calculator Engine
   AP KnightYT · 2026
════════════════════════════════════════════════════════════ */

// ── STATE ──────────────────────────────────────────────────────────
let state = {
    current: '0',
    previous: '',
    op: null,
    resetNext: false,
    pendingPow: false,       // for xʸ
    angleMode: 'deg',        // 'deg' | 'rad'
    memory: 0,
    hasMemory: false,
    mode: 'basic',           // 'basic' | 'scientific'
};

let historyLog = [];
try { historyLog = JSON.parse(localStorage.getItem('apexCalcHistory')) || []; } catch (e) { historyLog = []; }

// ── DOM REFS ───────────────────────────────────────────────────────
const mainDisplay = () => document.getElementById('main-display');
const exprDisplay = () => document.getElementById('expr-display');
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');
const histOverlay = document.getElementById('history-overlay');
const memIndicator = document.getElementById('mem-indicator');
const angleBadge = document.getElementById('angle-mode');
const angleBtn = document.getElementById('angle-btn');

// ── THEME ──────────────────────────────────────────────────────────
const themes = ['red', 'blue', 'green', 'purple', 'pink'];

function setTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('apexTheme', name);
    document.querySelectorAll('.tdot').forEach(d => d.classList.remove('active'));
    const btn = document.querySelector(`.tdot-${name}`);
    if (btn) btn.classList.add('active');
}

// Load saved theme
(function loadTheme() {
    const saved = localStorage.getItem('apexTheme') || 'red';
    setTheme(saved);
})();

// ── MODE SWITCH ────────────────────────────────────────────────────
function switchMode(mode) {
    state.mode = mode;
    const sciPanel = document.getElementById('sci-panel');
    const btnBasic = document.getElementById('btn-basic');
    const btnSci = document.getElementById('btn-sci');

    if (mode === 'scientific') {
        sciPanel.classList.add('visible');
        btnSci.classList.add('active');
        btnBasic.classList.remove('active');
    } else {
        sciPanel.classList.remove('visible');
        btnBasic.classList.add('active');
        btnSci.classList.remove('active');
    }
}

// ── DISPLAY ────────────────────────────────────────────────────────
function updateDisplay() {
    const el = mainDisplay();
    el.textContent = state.current;

    // Responsive font sizing
    const len = state.current.length;
    el.className = 'result-line';
    if (len > 18) el.classList.add('shrink-3');
    else if (len > 13) el.classList.add('shrink-2');
    else if (len > 9) el.classList.add('shrink-1');

    // Expression line
    if (state.op && !state.resetNext) {
        exprDisplay().textContent = `${state.previous} ${opSymbol(state.op)}`;
    }
}

function opSymbol(op) {
    return { '/': '÷', '*': 'x', '+': '+', '-': '−', '%': '%', 'pow': 'xʸ' }[op] || op;
}

// ── NUMBER INPUT ───────────────────────────────────────────────────
function numInput(n) {
    if (state.resetNext) {
        state.current = n === '.' ? '0.' : n;
        state.resetNext = false;
    } else {
        if (n === '.' && state.current.includes('.')) return;
        if (state.current === '0' && n !== '.') state.current = n;
        else state.current += n;
    }
    updateDisplay();
}

// ── OPERATORS ──────────────────────────────────────────────────────
function setOp(op) {
    if (state.op && !state.resetNext) calculate(true);
    state.previous = state.current;
    state.op = op;
    state.resetNext = true;
    exprDisplay().textContent = `${state.previous} ${opSymbol(op)}`;
}

// ── CALCULATE ─────────────────────────────────────────────────────
function calculate(chaining = false) {
    if (state.op === null || state.resetNext) return;

    const prev = parseFloat(state.previous);
    const curr = parseFloat(state.current);
    let result;

    switch (state.op) {
        case '+': result = prev + curr; break;
        case '-': result = prev - curr; break;
        case '*': result = prev * curr; break;
        case '/': result = curr === 0 ? 'Error' : prev / curr; break;
        case '%': result = prev % curr; break;
        case 'pow': result = Math.pow(prev, curr); break;
        default: return;
    }

    const eqStr = `${prev} ${opSymbol(state.op)} ${curr}`;
    exprDisplay().textContent = chaining ? `${eqStr} ${opSymbol(state.op)}` : `${eqStr} =`;

    if (result === 'Error') {
        state.current = 'Error';
        shakeDisplay();
    } else {
        result = parseFloat(result.toPrecision(12));
        if (!chaining) {
            addHistory(eqStr, result);
        }
        state.current = result.toString();
    }

    if (!chaining) {
        state.op = null;
        state.previous = '';
    } else {
        state.previous = state.current;
    }

    state.resetNext = !chaining;
    updateDisplay();
}

// ── SCIENTIFIC FUNCTIONS ───────────────────────────────────────────
function sciFunc(fn) {
    const val = parseFloat(state.current);
    if (isNaN(val)) return;

    let result;
    const toRad = (d) => d * Math.PI / 180;
    const toDeg = (r) => r * 180 / Math.PI;

    switch (fn) {
        case 'sin': result = state.angleMode === 'deg' ? Math.sin(toRad(val)) : Math.sin(val); break;
        case 'cos': result = state.angleMode === 'deg' ? Math.cos(toRad(val)) : Math.cos(val); break;
        case 'tan':
            if (state.angleMode === 'deg' && val % 180 === 90) { result = Infinity; break; }
            result = state.angleMode === 'deg' ? Math.tan(toRad(val)) : Math.tan(val);
            break;
        case 'asin':
            if (val < -1 || val > 1) { result = 'Error'; break; }
            result = state.angleMode === 'deg' ? toDeg(Math.asin(val)) : Math.asin(val);
            break;
        case 'acos':
            if (val < -1 || val > 1) { result = 'Error'; break; }
            result = state.angleMode === 'deg' ? toDeg(Math.acos(val)) : Math.acos(val);
            break;
        case 'atan': result = state.angleMode === 'deg' ? toDeg(Math.atan(val)) : Math.atan(val); break;
        case 'log': result = val <= 0 ? 'Error' : Math.log10(val); break;
        case 'ln': result = val <= 0 ? 'Error' : Math.log(val); break;
        case 'exp': result = Math.exp(val); break;
        case 'pow2': result = Math.pow(val, 2); break;
        case 'pow3': result = Math.pow(val, 3); break;
        case 'powY':
            // sets up xʸ operation
            setOp('pow');
            return;
        case 'sqrt': result = val < 0 ? 'Error' : Math.sqrt(val); break;
        case 'cbrt': result = Math.cbrt(val); break;
        case 'inv': result = val === 0 ? 'Error' : 1 / val; break;
        case 'abs': result = Math.abs(val); break;
        case 'fact': result = factorial(val); break;
        default: return;
    }

    const label = fn === 'pow2' ? `(${val})²` :
        fn === 'pow3' ? `(${val})³` :
            fn === 'inv' ? `1/(${val})` :
                `${fn}(${val})`;

    exprDisplay().textContent = label + ' =';

    if (result === 'Error' || !isFinite(result)) {
        state.current = 'Error';
        shakeDisplay();
    } else {
        result = parseFloat(result.toPrecision(12));
        addHistory(label, result);
        state.current = result.toString();
    }
    state.resetNext = true;
    state.op = null;
    updateDisplay();
}

function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) return 'Error';
    if (n > 170) return Infinity;
    if (n === 0 || n === 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
}

// ── CONSTANTS ──────────────────────────────────────────────────────
function insertConst(c) {
    const map = { pi: Math.PI, e: Math.E };
    state.current = map[c].toString();
    state.resetNext = false;
    updateDisplay();
}

// ── ANGLE TOGGLE ───────────────────────────────────────────────────
function toggleAngle() {
    state.angleMode = state.angleMode === 'deg' ? 'rad' : 'deg';
    angleBadge.textContent = state.angleMode.toUpperCase();
    if (angleBtn) angleBtn.textContent = state.angleMode.toUpperCase();
}

// ── MEMORY ─────────────────────────────────────────────────────────
function memStore() {
    state.memory = parseFloat(state.current) || 0;
    state.hasMemory = true;
    updateMemBadge();
}
function memRecall() {
    if (!state.hasMemory) return;
    state.current = state.memory.toString();
    state.resetNext = false;
    updateDisplay();
}
function memAdd() {
    state.memory += parseFloat(state.current) || 0;
    state.hasMemory = true;
    updateMemBadge();
}
function memClear() {
    state.memory = 0;
    state.hasMemory = false;
    updateMemBadge();
}
function updateMemBadge() {
    memIndicator.classList.toggle('hidden', !state.hasMemory);
}

// ── BASIC OPERATIONS ───────────────────────────────────────────────
function clearAll() {
    state.current = '0';
    state.previous = '';
    state.op = null;
    state.resetNext = false;
    exprDisplay().textContent = '';
    updateDisplay();
}

function deleteLast() {
    if (state.resetNext || state.current === 'Error') return;
    state.current = state.current.length > 1 ? state.current.slice(0, -1) : '0';
    updateDisplay();
}

function toggleSign() {
    if (state.current === '0' || state.current === 'Error') return;
    state.current = state.current.startsWith('-')
        ? state.current.slice(1)
        : '-' + state.current;
    updateDisplay();
}

// ── HISTORY ────────────────────────────────────────────────────────
function addHistory(eq, result) {
    historyLog.unshift({ eq, result, time: Date.now() });
    if (historyLog.length > 30) historyLog.pop();
    try { localStorage.setItem('apexCalcHistory', JSON.stringify(historyLog)); } catch (e) { }
    renderHistory();
}

function renderHistory() {
    if (historyLog.length === 0) {
        historyList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p>No calculations yet</p>
      </div>`;
        return;
    }
    historyList.innerHTML = historyLog.map((item, i) => `
    <div class="hist-item" onclick="reuseHistory(${i})" title="Click to reuse">
      <div class="hist-eq">${escHtml(item.eq)} =</div>
      <div class="hist-result">${escHtml(item.result.toString())}</div>
    </div>
  `).join('');
}

function reuseHistory(i) {
    const item = historyLog[i];
    if (!item) return;
    state.current = item.result.toString();
    state.resetNext = false;
    updateDisplay();
    toggleHistory();
}

function clearHistory() {
    historyLog = [];
    try { localStorage.removeItem('apexCalcHistory'); } catch (e) { }
    renderHistory();
}

function toggleHistory() {
    const isOpen = historyPanel.classList.contains('open');
    historyPanel.classList.toggle('open', !isOpen);
    histOverlay.classList.toggle('show', !isOpen);
    if (!isOpen) renderHistory();
}

function escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ── UI HELPERS ─────────────────────────────────────────────────────
function shakeDisplay() {
    const el = mainDisplay();
    el.classList.remove('shake');
    void el.offsetWidth; // reflow
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 400);
}

// Ripple effect on buttons
document.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn, .btn-sci');
    if (!btn) return;
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.cssText = `
    width:${size}px; height:${size}px;
    left:${e.clientX - rect.left - size / 2}px;
    top:${e.clientY - rect.top - size / 2}px;
  `;
    btn.appendChild(r);
    setTimeout(() => r.remove(), 500);
});

// ── KEYBOARD SUPPORT ───────────────────────────────────────────────
document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    const k = e.key;

    if (k >= '0' && k <= '9') { numInput(k); return; }
    if (k === '.') { numInput('.'); return; }
    if (k === '+') { setOp('+'); return; }
    if (k === '-') { setOp('-'); return; }
    if (k === '*') { setOp('*'); return; }
    if (k === '/') { e.preventDefault(); setOp('/'); return; }
    if (k === '%') { setOp('%'); return; }
    if (k === 'Enter' || k === '=') { calculate(); return; }
    if (k === 'Backspace') { deleteLast(); return; }
    if (k === 'Escape' || k === 'Delete') { clearAll(); return; }
    if (k === 's') { sciFunc('sin'); return; }
    if (k === 'c') { sciFunc('cos'); return; }
    if (k === 't') { sciFunc('tan'); return; }
    if (k === 'l') { sciFunc('log'); return; }
    if (k === 'n') { sciFunc('ln'); return; }
    if (k === 'r') { sciFunc('sqrt'); return; }
});

// ── INIT ────────────────────────────────────────────────────────────
updateDisplay();
renderHistory();
