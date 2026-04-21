/* ================================================================
   Calculadora Binaria
   - Conversor bidireccional: Bin ↔ Dec
   - Resta binaria con préstamo paso a paso
   ================================================================ */

// ── Validación y conversión ──────────────────────────────────────

function isValidBinary(str) {
  return str.length > 0 && /^[01]+$/.test(str);
}

function isValidDecimalStr(str) {
  const t = str.trim();
  return /^-?\d+$/.test(t) && t !== '-' && t !== '';
}

/**
 * Convierte cadena binaria a decimal. Retorna null si inválida.
 */
function binaryToDecimal(binStr) {
  if (!isValidBinary(binStr)) return null;
  return parseInt(binStr, 2);
}

/**
 * Convierte cadena decimal a binario.
 * Soporta negativos. Retorna { binary, negative, absDecimal } o null.
 */
function decimalToBinary(numStr) {
  const t = numStr.trim();
  if (!t || t === '-') return null;
  const isNeg  = t[0] === '-';
  const absStr = isNeg ? t.slice(1) : t;
  if (!/^\d+$/.test(absStr)) return null;
  const n = parseInt(absStr, 10);
  if (isNaN(n)) return null;
  return { binary: n.toString(2), negative: isNeg, absDecimal: n };
}

// ── Resta binaria ────────────────────────────────────────────────

function subtractBinary(rawA, rawB) {
  const decA = parseInt(rawA, 2);
  const decB = parseInt(rawB, 2);
  const isNegative = decA < decB;

  const topRaw = isNegative ? rawB : rawA;
  const botRaw = isNegative ? rawA : rawB;

  const len    = Math.max(topRaw.length, botRaw.length);
  const top    = topRaw.padStart(len, '0');
  const bottom = botRaw.padStart(len, '0');

  const topBits = top.split('').map(Number);
  const botBits = bottom.split('').map(Number);

  const resBits    = new Array(len);
  const borrowUsed  = new Array(len).fill(0);
  const needsBorrow = new Array(len).fill(0);

  let runningBorrow = 0;

  for (let i = len - 1; i >= 0; i--) {
    borrowUsed[i] = runningBorrow;
    const raw = topBits[i] - botBits[i] - runningBorrow;

    if (raw < 0) {
      resBits[i]     = raw + 2;
      needsBorrow[i] = 1;
      runningBorrow  = 1;
    } else {
      resBits[i]     = raw;
      needsBorrow[i] = 0;
      runningBorrow  = 0;
    }
  }

  const resultStr = resBits.join('').replace(/^0+/, '') || '0';
  const decResult = Math.abs(decA - decB);

  return {
    top, bottom, topBits, botBits,
    resBits, resultStr,
    borrowUsed, needsBorrow,
    isNegative, decA, decB, decResult,
  };
}

// ── Renderizado tabla y pasos ────────────────────────────────────

function renderTable(data) {
  const { top, bottom, topBits, botBits, resBits, borrowUsed, isNegative } = data;
  const len = top.length;

  const makeBits = (arr, rowClass, dotZeros = false) => {
    const cells = arr.map(b => {
      const isDot = dotZeros && b === 0;
      const cls   = isDot ? 'bit zero' : 'bit';
      return `<div class="${cls}">${isDot ? '·' : b}</div>`;
    }).join('');
    return `<td><div class="bits-row ${rowClass}">${cells}</div></td>`;
  };

  const labelCell    = text => `<td class="td-label">${text}</td>`;
  const topLabel     = isNegative ? 'B &nbsp;(mayor)'  : 'A &nbsp;(minuendo)';
  const bottomLabel  = isNegative ? 'A &nbsp;(menor)'  : 'B &nbsp;(sustraendo)';

  return `
    <table class="sub-table">
      <tbody>
        <tr class="row-borrow">
          ${labelCell('Préstamo')}
          ${makeBits(borrowUsed, 'row-borrow', true)}
        </tr>
        <tr class="row-top">
          ${labelCell(topLabel)}
          ${makeBits(topBits, 'row-top')}
        </tr>
        <tr class="row-bottom">
          ${labelCell(bottomLabel)}
          ${makeBits(botBits, 'row-bottom')}
        </tr>
        <tr class="row-divider">
          <td><div class="divider-line"></div></td>
          <td><div class="divider-line"></div></td>
        </tr>
        <tr class="row-result">
          ${labelCell('Resultado')}
          ${makeBits(resBits, 'row-result')}
        </tr>
      </tbody>
    </table>`;
}

function renderSteps(data) {
  const { topBits, botBits, resBits, borrowUsed, needsBorrow } = data;
  const len = topBits.length;

  let html = '';
  let num  = 1;

  for (let i = len - 1; i >= 0; i--) {
    const pos     = len - 1 - i;
    const lentOut = borrowUsed[i];
    const borrows = needsBorrow[i];
    const t = topBits[i];
    const b = botBits[i];
    const r = resBits[i];

    let expr = `${t} &minus; ${b}`;
    if (lentOut) expr += ` &minus; 1<sub style="font-size:.75em">(prest.)</sub>`;

    let desc;
    if (borrows) {
      const raw = t - b - lentOut;
      desc =
        `<strong>Bit posición ${pos}:</strong> <code>${t}&minus;${b}${lentOut ? '&minus;1' : ''} = ${raw}</code>
         &rarr; negativo &rarr; <span class="tag-borrow">pide préstamo</span>
         a la izquierda: <code>1${t}&minus;${b}${lentOut ? '&minus;1' : ''} = <strong>${r}</strong></code>`;
    } else if (lentOut && t - b === lentOut) {
      desc =
        `<strong>Bit posición ${pos}:</strong> <code>${t}&minus;${b}&minus;1 = <strong>${r}</strong></code>
         (el préstamo cedido se absorbe)`;
    } else {
      desc =
        `<strong>Bit posición ${pos}:</strong> <code>${expr} = <strong>${r}</strong></code>
         ${lentOut ? '(sin deuda adicional)' : '&mdash; sin préstamo'}`;
    }

    html += `
      <div class="step-item">
        <div class="step-num">${num++}</div>
        <div class="step-text">${desc}</div>
      </div>`;
  }

  return html;
}

// ── UI helpers (calculadora) ─────────────────────────────────────

function showError(msg) {
  const box = document.getElementById('errorBox');
  document.getElementById('errorMsg').textContent = msg;
  box.classList.remove('hidden');
  document.getElementById('resultCard').classList.add('hidden');
  document.getElementById('stepsCard').classList.add('hidden');
}

function hideError() {
  document.getElementById('errorBox').classList.add('hidden');
}

function setFieldState(inputEl, hintEl, state, msg) {
  inputEl.className = state === 'valid' ? 'is-valid' : state === 'invalid' ? 'is-invalid' : '';
  hintEl.textContent = msg;
  hintEl.className = `field-hint ${state === 'valid' ? 'ok' : state === 'invalid' ? 'err' : ''}`;
}

function updateDecimalHint(inputEl, decimalEl) {
  const val = inputEl.value.trim();
  if (!val) {
    decimalEl.textContent = 'Decimal: —';
    decimalEl.className = 'decimal-hint';
    return;
  }
  const dec = binaryToDecimal(val);
  if (dec === null) {
    decimalEl.textContent = 'Decimal: Inválido';
    decimalEl.className = 'decimal-hint err';
  } else {
    decimalEl.textContent = `Decimal: ${dec}`;
    decimalEl.className = 'decimal-hint ok';
  }
}

// ── Conversor UI ─────────────────────────────────────────────────

/**
 * Construye el HTML del resultado de conversión.
 * leftStr/rightStr: cadenas numéricas (sin signo)
 * leftBase/rightBase: número base (2 o 10)
 * isNeg: si el número es negativo
 */
function buildConvResultHTML(leftStr, leftBase, rightStr, rightBase, isNeg) {
  const sign = isNeg ? '−' : '';
  const negClass = isNeg ? ' negative' : '';
  return `
    <div class="conv-result-display${negClass}">
      <span class="conv-num">${sign}${leftStr}<sub>${leftBase}</sub></span>
      <span class="conv-eq">=</span>
      <span class="conv-num">${sign}${rightStr}<sub>${rightBase}</sub></span>
    </div>`;
}

function updateBin2Dec() {
  const input  = document.getElementById('binConvInput');
  const hint   = document.getElementById('binConvHint');
  const result = document.getElementById('bin2decResult');
  const val    = input.value.trim();

  if (!val) {
    input.className = 'conv-input';
    hint.textContent = '';
    hint.className = 'conv-hint';
    result.innerHTML = '<span class="conv-placeholder">Escribe un número binario para convertir</span>';
    return;
  }

  if (!isValidBinary(val)) {
    input.className = 'conv-input is-invalid';
    hint.textContent = 'Solo se permiten dígitos 0 y 1';
    hint.className = 'conv-hint err';
    result.innerHTML = '<span class="conv-placeholder">Entrada inválida</span>';
    return;
  }

  const dec = binaryToDecimal(val);
  input.className = 'conv-input is-valid';
  hint.textContent = `${val.length} bit${val.length !== 1 ? 's' : ''}`;
  hint.className = 'conv-hint ok';
  result.innerHTML = buildConvResultHTML(val, 2, dec, 10, false);
}

function updateDec2Bin() {
  const input  = document.getElementById('decConvInput');
  const hint   = document.getElementById('decConvHint');
  const result = document.getElementById('dec2binResult');
  const val    = input.value.trim();

  if (!val || val === '-') {
    input.className = 'conv-input';
    hint.textContent = '';
    hint.className = 'conv-hint';
    result.innerHTML = '<span class="conv-placeholder">Escribe un número decimal para convertir</span>';
    return;
  }

  if (!isValidDecimalStr(val)) {
    input.className = 'conv-input is-invalid';
    hint.textContent = 'Solo se permiten números enteros';
    hint.className = 'conv-hint err';
    result.innerHTML = '<span class="conv-placeholder">Entrada inválida</span>';
    return;
  }

  const res = decimalToBinary(val);
  if (!res) {
    input.className = 'conv-input is-invalid';
    hint.textContent = 'Número inválido';
    hint.className = 'conv-hint err';
    result.innerHTML = '<span class="conv-placeholder">Entrada inválida</span>';
    return;
  }

  const absDecStr = String(res.absDecimal);
  input.className = 'conv-input is-valid';
  hint.textContent = `${res.binary.length} bit${res.binary.length !== 1 ? 's' : ''}`;
  hint.className = 'conv-hint ok';
  result.innerHTML = buildConvResultHTML(absDecStr, 10, res.binary, 2, res.negative);
}

// ── Calculadora ──────────────────────────────────────────────────

function calculate() {
  const inputA = document.getElementById('numA');
  const inputB = document.getElementById('numB');
  const hintA  = document.getElementById('hintA');
  const hintB  = document.getElementById('hintB');

  const valA = inputA.value.trim();
  const valB = inputB.value.trim();

  let hasError = false;

  if (!valA) {
    setFieldState(inputA, hintA, 'invalid', 'Este campo es obligatorio');
    hasError = true;
  } else if (!isValidBinary(valA)) {
    setFieldState(inputA, hintA, 'invalid', 'Solo se permiten dígitos 0 y 1');
    hasError = true;
  } else {
    setFieldState(inputA, hintA, 'valid', `= ${parseInt(valA, 2)} en decimal`);
  }

  if (!valB) {
    setFieldState(inputB, hintB, 'invalid', 'Este campo es obligatorio');
    hasError = true;
  } else if (!isValidBinary(valB)) {
    setFieldState(inputB, hintB, 'invalid', 'Solo se permiten dígitos 0 y 1');
    hasError = true;
  } else {
    setFieldState(inputB, hintB, 'valid', `= ${parseInt(valB, 2)} en decimal`);
  }

  if (hasError) {
    showError('Por favor ingresa números binarios válidos (solo dígitos 0 y 1).');
    return;
  }

  hideError();

  const data = subtractBinary(valA, valB);

  const sign       = data.isNegative ? '−' : '';
  const badgeTxt   = data.isNegative ? 'Negativo' : data.decResult === 0 ? 'Cero' : 'Positivo';
  const decLine    = `Binario: ${sign}${data.resultStr}`;
  const decValLine = `Decimal: ${data.isNegative ? '−' : ''}${data.decResult}`;

  const resultCard = document.getElementById('resultCard');
  document.getElementById('resultSign').textContent       = sign;
  document.getElementById('resultBin').textContent        = data.resultStr;
  document.getElementById('resultBadge').textContent      = badgeTxt;
  document.getElementById('resultDecimal').textContent    = decLine;
  document.getElementById('resultDecimalVal').textContent = decValLine;
  resultCard.classList.remove('hidden');
  resultCard.classList.toggle('negative', data.isNegative);

  const negNote = document.getElementById('negativeNote');
  negNote.classList.toggle('hidden', !data.isNegative);

  document.getElementById('tableWrap').innerHTML = renderTable(data);
  document.getElementById('stepList').innerHTML  = renderSteps(data);
  document.getElementById('stepsCard').classList.remove('hidden');

  document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Tab switching ────────────────────────────────────────────────

function switchMainTab(targetPanelId) {
  document.querySelectorAll('.main-tab').forEach(tab => {
    const active = tab.dataset.panel === targetPanelId;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active);
  });

  document.querySelectorAll('.mode-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === targetPanelId);
  });
}

function switchConvTab(targetMode) {
  document.querySelectorAll('.conv-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.conv === targetMode);
  });

  document.querySelectorAll('.conv-mode').forEach(mode => {
    const id = targetMode === 'bin2dec' ? 'bin2decMode' : 'dec2binMode';
    mode.classList.toggle('active', mode.id === id);
  });
}

// ── Init ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // ── Main tabs
  document.querySelectorAll('.main-tab').forEach(tab => {
    tab.addEventListener('click', () => switchMainTab(tab.dataset.panel));
  });

  // ── Conv sub-tabs
  document.querySelectorAll('.conv-tab').forEach(tab => {
    tab.addEventListener('click', () => switchConvTab(tab.dataset.conv));
  });

  // ── Conversor: Bin → Dec
  const binConvInput = document.getElementById('binConvInput');
  binConvInput.addEventListener('input', e => {
    const pos     = e.target.selectionStart;
    const cleaned = e.target.value.replace(/[^01]/g, '');
    if (cleaned !== e.target.value) {
      e.target.value = cleaned;
      e.target.setSelectionRange(pos - 1, pos - 1);
    }
    updateBin2Dec();
  });

  // ── Conversor: Dec → Bin
  const decConvInput = document.getElementById('decConvInput');
  decConvInput.addEventListener('input', e => {
    // Permitir: dígitos y un '-' al inicio
    const raw     = e.target.value;
    const pos     = e.target.selectionStart;
    const cleaned = raw.replace(/(?!^)-/g, '').replace(/[^0-9-]/g, '');
    if (cleaned !== raw) {
      e.target.value = cleaned;
      e.target.setSelectionRange(Math.max(0, pos - 1), Math.max(0, pos - 1));
    }
    updateDec2Bin();
  });

  // ── Calculadora inputs
  const inputA   = document.getElementById('numA');
  const inputB   = document.getElementById('numB');
  const decimalA = document.getElementById('decimalA');
  const decimalB = document.getElementById('decimalB');

  document.getElementById('calcBtn').addEventListener('click', calculate);

  [[inputA, decimalA], [inputB, decimalB]].forEach(([input, decimalEl]) => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') calculate();
    });

    input.addEventListener('input', e => {
      const pos     = e.target.selectionStart;
      const cleaned = e.target.value.replace(/[^01]/g, '');
      if (cleaned !== e.target.value) {
        e.target.value = cleaned;
        e.target.setSelectionRange(pos - 1, pos - 1);
      }
      updateDecimalHint(e.target, decimalEl);
    });
  });
});
