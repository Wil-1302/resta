/* ================================================================
   Calculadora Binaria
   - Conversor bidireccional: Bin ↔ Dec (enteros y fracciones)
   - Resta binaria con préstamo paso a paso (enteros y fracciones)
   - Resta decimal con conversión automática a binario
   ================================================================ */

// ── Validación ───────────────────────────────────────────────────

function isValidBinaryFraction(str) {
  return str.length > 0 && /^[01]+(\.[01]+)?$/.test(str);
}

function isValidDecimalStr(str) {
  const t = str.trim();
  return /^-?\d+(\.\d+)?$/.test(t);
}

// ── Conversión ───────────────────────────────────────────────────

/**
 * Convierte binario (con o sin fracción) a decimal. Retorna null si inválido.
 */
function binaryToDecimalFraction(binStr) {
  if (!isValidBinaryFraction(binStr)) return null;
  const dotIdx = binStr.indexOf('.');
  if (dotIdx === -1) return parseInt(binStr, 2);

  const intPart  = binStr.slice(0, dotIdx);
  const fracPart = binStr.slice(dotIdx + 1);

  let result = parseInt(intPart || '0', 2);
  for (let i = 0; i < fracPart.length; i++) {
    result += parseInt(fracPart[i]) * Math.pow(2, -(i + 1));
  }
  return Math.round(result * 1e10) / 1e10;
}

/**
 * Convierte decimal (entero o fraccionario, con signo) a binario.
 * Retorna { binary, negative, absDecimal } o null.
 */
function decimalToBinary(numStr) {
  const t = numStr.trim();
  if (!t || t === '-') return null;

  const isNeg  = t[0] === '-';
  const absStr = isNeg ? t.slice(1) : t;
  if (!/^\d+(\.\d*)?$/.test(absStr) || absStr === '.') return null;

  const num = parseFloat(absStr);
  if (isNaN(num)) return null;

  const intVal  = Math.floor(num);
  let   fracVal = Math.round((num - intVal) * 1e10) / 1e10;
  const intBin  = intVal.toString(2);

  let fracBin = '';
  const MAX_FRAC_BITS = 8;
  for (let i = 0; i < MAX_FRAC_BITS && fracVal > 1e-10; i++) {
    fracVal = Math.round(fracVal * 2 * 1e10) / 1e10;
    if (fracVal >= 1) {
      fracBin += '1';
      fracVal  = Math.round((fracVal - 1) * 1e10) / 1e10;
    } else {
      fracBin += '0';
    }
  }

  const binary = fracBin ? `${intBin}.${fracBin}` : intBin;
  return { binary, negative: isNeg, absDecimal: num };
}

/** Formatea un decimal eliminando ruido de punto flotante */
function formatDecimal(n) {
  if (n === null || n === undefined) return '?';
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toPrecision(10)).toString();
}

// ── Resta binaria ────────────────────────────────────────────────

function subtractBinary(rawA, rawB) {
  const [intA, fracA = ''] = rawA.split('.');
  const [intB, fracB = ''] = rawB.split('.');

  const maxFrac = Math.max(fracA.length, fracB.length);
  const hasFrac = maxFrac > 0;

  const fa = fracA.padEnd(maxFrac, '0');
  const fb = fracB.padEnd(maxFrac, '0');

  const decA = binaryToDecimalFraction(rawA);
  const decB = binaryToDecimalFraction(rawB);
  const isNegative = decA < decB;

  const combinedA = intA + fa;
  const combinedB = intB + fb;

  const topRaw = isNegative ? combinedB : combinedA;
  const botRaw = isNegative ? combinedA : combinedB;

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

  const fracPointPos = hasFrac ? len - maxFrac : null;

  let resultStr;
  if (hasFrac) {
    const intResBits  = resBits.slice(0, fracPointPos);
    const fracResBits = resBits.slice(fracPointPos);
    const intPart  = intResBits.join('').replace(/^0+/, '') || '0';
    const fracPart = fracResBits.join('').replace(/0+$/, '');
    resultStr = fracPart ? `${intPart}.${fracPart}` : intPart;
  } else {
    resultStr = resBits.join('').replace(/^0+/, '') || '0';
  }

  const decResult = Math.round(Math.abs(decA - decB) * 1e10) / 1e10;

  return {
    top, bottom, topBits, botBits,
    resBits, resultStr,
    borrowUsed, needsBorrow,
    isNegative, decA, decB, decResult,
    hasFrac, maxFrac, fracPointPos,
  };
}

// ── Resta decimal ────────────────────────────────────────────────

/**
 * Realiza resta en decimal y convierte cada valor a binario.
 * Retorna objeto con todos los valores, o null si los inputs son inválidos.
 */
function subtractDecimal(strA, strB) {
  const a = parseFloat(strA);
  const b = parseFloat(strB);
  if (isNaN(a) || isNaN(b)) return null;

  const result     = Math.round((a - b) * 1e10) / 1e10;
  const isNegative = result < 0;
  const absResult  = Math.abs(result);

  const absA = Math.abs(a);
  const absB = Math.abs(b);

  const aBin   = decimalToBinary(String(absA));
  const bBin   = decimalToBinary(String(absB));
  const resBin = decimalToBinary(String(absResult));

  return {
    a, b, result, isNegative, absResult,
    aBin, bBin, resBin,
  };
}

// ── Renderizado tabla y pasos (modo binario) ─────────────────────

function renderTable(data) {
  const { top, bottom, topBits, botBits, resBits, borrowUsed, isNegative, fracPointPos } = data;
  const len = top.length;

  const makeBits = (arr, rowClass, dotZeros = false) => {
    const cells = arr.map((b, idx) => {
      const sep    = (fracPointPos !== null && idx === fracPointPos)
        ? `<div class="bit-sep">.</div>` : '';
      const isFrac = fracPointPos !== null && idx >= fracPointPos;
      const isDot  = dotZeros && b === 0;
      const cls    = ['bit', isDot ? 'zero' : '', isFrac ? 'frac' : ''].filter(Boolean).join(' ');
      return `${sep}<div class="${cls}">${isDot ? '·' : b}</div>`;
    }).join('');
    return `<td><div class="bits-row ${rowClass}">${cells}</div></td>`;
  };

  const labelCell   = text => `<td class="td-label">${text}</td>`;
  const topLabel    = isNegative ? 'B &nbsp;(mayor)' : 'A &nbsp;(minuendo)';
  const bottomLabel = isNegative ? 'A &nbsp;(menor)' : 'B &nbsp;(sustraendo)';

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
  const { topBits, botBits, resBits, borrowUsed, needsBorrow, fracPointPos } = data;
  const len = topBits.length;

  const bitLabel = idx => {
    if (fracPointPos === null) return `posición ${len - 1 - idx}`;
    if (idx < fracPointPos) {
      const power = fracPointPos - 1 - idx;
      return `2<sup>${power}</sup>`;
    }
    const power = -(idx - fracPointPos + 1);
    return `2<sup>${power}</sup>`;
  };

  let html = '';
  let num  = 1;

  for (let i = len - 1; i >= 0; i--) {
    const lentOut = borrowUsed[i];
    const borrows = needsBorrow[i];
    const t = topBits[i];
    const b = botBits[i];
    const r = resBits[i];

    let expr = `${t} &minus; ${b}`;
    if (lentOut) expr += ` &minus; 1<sub style="font-size:.75em">(prest.)</sub>`;

    const label = bitLabel(i);

    let desc;
    if (borrows) {
      const raw = t - b - lentOut;
      desc =
        `<strong>Bit ${label}:</strong> <code>${t}&minus;${b}${lentOut ? '&minus;1' : ''} = ${raw}</code>
         &rarr; negativo &rarr; <span class="tag-borrow">pide préstamo</span>
         a la izquierda: <code>1${t}&minus;${b}${lentOut ? '&minus;1' : ''} = <strong>${r}</strong></code>`;
    } else if (lentOut && t - b === lentOut) {
      desc =
        `<strong>Bit ${label}:</strong> <code>${t}&minus;${b}&minus;1 = <strong>${r}</strong></code>
         (el préstamo cedido se absorbe)`;
    } else {
      desc =
        `<strong>Bit ${label}:</strong> <code>${expr} = <strong>${r}</strong></code>
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

// ── Renderizado tabla conversión (modo decimal) ──────────────────

function renderDecimalConversionTable(data) {
  const { a, b, result, aBin, bBin, resBin, isNegative } = data;

  const signA   = a < 0   ? '−' : '';
  const signB   = b < 0   ? '−' : '';
  const signR   = isNegative ? '−' : '';

  const aDecStr  = formatDecimal(Math.abs(a));
  const bDecStr  = formatDecimal(Math.abs(b));
  const rDecStr  = formatDecimal(Math.abs(result));

  const aBinStr  = aBin  ? aBin.binary  : '?';
  const bBinStr  = bBin  ? bBin.binary  : '?';
  const rBinStr  = resBin ? resBin.binary : '?';

  const row = (label, sign, decStr, binStr, isResult = false) => `
    <div class="conv-row${isResult ? ' conv-row--result' : ''}">
      <span class="conv-row-label">${label}</span>
      <span class="conv-row-dec">${sign}${decStr}<sub>10</sub></span>
      <span class="conv-row-arrow">→</span>
      <span class="conv-row-bin">${sign}${binStr}<sub>2</sub></span>
    </div>`;

  return `
    <div class="dec-conv-table">
      ${row('A', signA, aDecStr, aBinStr)}
      ${row('B', signB, bDecStr, bBinStr)}
      <div class="conv-row conv-row--divider" aria-hidden="true"></div>
      ${row('A − B', signR, rDecStr, rBinStr, true)}
    </div>`;
}

// ── UI helpers compartidos ────────────────────────────────────────

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

// ── UI helpers modo binario ───────────────────────────────────────

function updateDecimalHint(inputEl, decimalEl) {
  const val = inputEl.value.trim();
  if (!val) {
    decimalEl.textContent = 'Decimal: —';
    decimalEl.className   = 'decimal-hint';
    return;
  }
  const dec = binaryToDecimalFraction(val);
  if (dec === null) {
    decimalEl.textContent = 'Decimal: Inválido';
    decimalEl.className   = 'decimal-hint err';
  } else {
    decimalEl.textContent = `Decimal: ${formatDecimal(dec)}`;
    decimalEl.className   = 'decimal-hint ok';
  }
}

// ── UI helpers modo decimal ───────────────────────────────────────

function updateBinaryHint(inputEl, hintEl) {
  const val = inputEl.value.trim();
  if (!val || val === '-' || val.endsWith('.')) {
    hintEl.textContent = 'Binario: —';
    hintEl.className   = 'decimal-hint';
    return;
  }
  if (!isValidDecimalStr(val)) {
    hintEl.textContent = 'Binario: Inválido';
    hintEl.className   = 'decimal-hint err';
    return;
  }
  const absVal = Math.abs(parseFloat(val));
  const res = decimalToBinary(String(absVal));
  const sign = parseFloat(val) < 0 ? '−' : '';
  hintEl.textContent = res ? `Binario: ${sign}${res.binary}₂` : 'Binario: ?';
  hintEl.className   = res ? 'decimal-hint ok' : 'decimal-hint err';
}

// ── Conversor UI ─────────────────────────────────────────────────

function buildConvResultHTML(leftStr, leftBase, rightStr, rightBase, isNeg) {
  const sign     = isNeg ? '−' : '';
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
    input.className  = 'conv-input';
    hint.textContent = '';
    hint.className   = 'conv-hint';
    result.innerHTML = '<span class="conv-placeholder">Escribe un número binario para convertir</span>';
    return;
  }
  if (!isValidBinaryFraction(val)) {
    input.className  = 'conv-input is-invalid';
    hint.textContent = 'Solo se permiten dígitos 0, 1 y un punto decimal';
    hint.className   = 'conv-hint err';
    result.innerHTML = '<span class="conv-placeholder">Entrada inválida</span>';
    return;
  }

  const dec     = binaryToDecimalFraction(val);
  const bits    = val.replace('.', '').length;
  const hasFrac = val.includes('.');

  input.className  = 'conv-input is-valid';
  hint.textContent = `${bits} bit${bits !== 1 ? 's' : ''}${hasFrac ? ' · fraccionario' : ''}`;
  hint.className   = 'conv-hint ok';
  result.innerHTML = buildConvResultHTML(val, 2, formatDecimal(dec), 10, false);
}

function updateDec2Bin() {
  const input  = document.getElementById('decConvInput');
  const hint   = document.getElementById('decConvHint');
  const result = document.getElementById('dec2binResult');
  const val    = input.value.trim();

  if (!val || val === '-') {
    input.className  = 'conv-input';
    hint.textContent = '';
    hint.className   = 'conv-hint';
    result.innerHTML = '<span class="conv-placeholder">Escribe un número decimal para convertir</span>';
    return;
  }
  if (val.endsWith('.')) {
    input.className  = 'conv-input';
    hint.textContent = 'Escribe la parte decimal…';
    hint.className   = 'conv-hint';
    result.innerHTML = '<span class="conv-placeholder">Completando número…</span>';
    return;
  }
  if (!isValidDecimalStr(val)) {
    input.className  = 'conv-input is-invalid';
    hint.textContent = 'Solo se permiten números (enteros o decimales)';
    hint.className   = 'conv-hint err';
    result.innerHTML = '<span class="conv-placeholder">Entrada inválida</span>';
    return;
  }

  const res = decimalToBinary(val);
  if (!res) {
    input.className  = 'conv-input is-invalid';
    hint.textContent = 'Número inválido';
    hint.className   = 'conv-hint err';
    result.innerHTML = '<span class="conv-placeholder">Entrada inválida</span>';
    return;
  }

  const bits      = res.binary.replace('.', '').length;
  const hasFrac   = res.binary.includes('.');
  const absDecStr = formatDecimal(res.absDecimal);

  input.className  = 'conv-input is-valid';
  hint.textContent = `${bits} bit${bits !== 1 ? 's' : ''}${hasFrac ? ' · fraccionario' : ''}`;
  hint.className   = 'conv-hint ok';
  result.innerHTML = buildConvResultHTML(absDecStr, 10, res.binary, 2, res.negative);
}

// ── Calculadora modo binario ──────────────────────────────────────

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
  } else if (!isValidBinaryFraction(valA)) {
    setFieldState(inputA, hintA, 'invalid', 'Solo 0, 1 y un punto decimal');
    hasError = true;
  } else {
    const dec = binaryToDecimalFraction(valA);
    setFieldState(inputA, hintA, 'valid', `= ${formatDecimal(dec)} en decimal`);
  }

  if (!valB) {
    setFieldState(inputB, hintB, 'invalid', 'Este campo es obligatorio');
    hasError = true;
  } else if (!isValidBinaryFraction(valB)) {
    setFieldState(inputB, hintB, 'invalid', 'Solo 0, 1 y un punto decimal');
    hasError = true;
  } else {
    const dec = binaryToDecimalFraction(valB);
    setFieldState(inputB, hintB, 'valid', `= ${formatDecimal(dec)} en decimal`);
  }

  if (hasError) {
    showError('Por favor ingresa números binarios válidos (dígitos 0, 1 y opcionalmente un punto decimal).');
    return;
  }

  hideError();

  const data = subtractBinary(valA, valB);

  const sign     = data.isNegative ? '−' : '';
  const badgeTxt = data.isNegative ? 'Negativo' : data.decResult === 0 ? 'Cero' : 'Positivo';
  const aStr     = formatDecimal(data.decA);
  const bStr     = formatDecimal(data.decB);
  const resStr   = formatDecimal(data.decResult);

  const resultCard = document.getElementById('resultCard');
  resultCard.classList.remove('mode-decimal');
  document.getElementById('resultDual').classList.add('hidden');

  document.getElementById('resultSign').textContent       = sign;
  document.getElementById('resultBin').textContent        = data.resultStr;
  document.getElementById('resultBadge').textContent      = badgeTxt;
  document.getElementById('resultDecimal').textContent    = `${aStr} − ${bStr} = ${sign}${resStr}`;
  document.getElementById('resultDecimalVal').textContent = `Decimal: ${sign}${resStr}`;
  resultCard.classList.remove('hidden');
  resultCard.classList.toggle('negative', data.isNegative);

  document.getElementById('negativeNote').classList.toggle('hidden', !data.isNegative);
  document.getElementById('stepsTitle').textContent   = 'Procedimiento paso a paso';
  document.getElementById('stepsIntro').innerHTML     = 'Se usa la resta binaria con <strong>préstamo</strong>, igual que en decimal pero en base 2.';

  document.getElementById('tableWrap').innerHTML = renderTable(data);
  document.getElementById('stepList').innerHTML  = renderSteps(data);
  document.getElementById('stepsCard').classList.remove('hidden');

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Calculadora modo decimal ──────────────────────────────────────

function calculateDecimal() {
  const inputA = document.getElementById('numDecA');
  const inputB = document.getElementById('numDecB');
  const hintA  = document.getElementById('hintDecA');
  const hintB  = document.getElementById('hintDecB');

  const valA = inputA.value.trim();
  const valB = inputB.value.trim();

  let hasError = false;

  const validateDecInput = (input, hint, val) => {
    if (!val || val === '-') {
      setFieldState(input, hint, 'invalid', 'Este campo es obligatorio');
      return false;
    }
    if (val.endsWith('.')) {
      setFieldState(input, hint, 'invalid', 'Número incompleto');
      return false;
    }
    if (!isValidDecimalStr(val)) {
      setFieldState(input, hint, 'invalid', 'Número decimal inválido');
      return false;
    }
    setFieldState(input, hint, 'valid', `válido`);
    return true;
  };

  if (!validateDecInput(inputA, hintA, valA)) hasError = true;
  if (!validateDecInput(inputB, hintB, valB)) hasError = true;

  if (hasError) {
    showError('Por favor ingresa números decimales válidos (pueden ser negativos o fraccionarios).');
    return;
  }

  hideError();

  const data = subtractDecimal(valA, valB);
  if (!data) {
    showError('Error al calcular. Verifica los valores ingresados.');
    return;
  }

  const { result, isNegative, absResult, resBin } = data;
  const sign     = isNegative ? '−' : '';
  const badgeTxt = isNegative ? 'Negativo' : result === 0 ? 'Cero' : 'Positivo';
  const aStr     = formatDecimal(data.a);
  const bStr     = formatDecimal(data.b);
  const resStr   = formatDecimal(absResult);
  const resBinStr = resBin ? resBin.binary : '?';

  const resultCard = document.getElementById('resultCard');
  resultCard.classList.add('mode-decimal');
  resultCard.classList.toggle('negative', isNegative);
  resultCard.classList.remove('hidden');

  document.getElementById('resultSign').textContent       = sign;
  document.getElementById('resultBin').textContent        = `${sign}${resStr}`;
  document.getElementById('resultBadge').textContent      = badgeTxt;
  document.getElementById('resultDecimal').textContent    = `${aStr} − ${bStr} = ${sign}${resStr}`;
  document.getElementById('resultDecimalVal').textContent = `Binario: ${sign}${resBinStr}₂`;

  // Dual display
  const dual = document.getElementById('resultDual');
  document.getElementById('dualDec').textContent = `${sign}${resStr}`;
  document.getElementById('dualBin').textContent = `${sign}${resBinStr}₂`;
  dual.classList.remove('hidden');

  document.getElementById('negativeNote').classList.toggle('hidden', !isNegative);
  document.getElementById('stepsTitle').textContent = 'Equivalencias en binario';
  document.getElementById('stepsIntro').textContent = 'La resta se calcula en decimal y luego cada valor se convierte a su representación binaria.';

  document.getElementById('tableWrap').innerHTML = renderDecimalConversionTable(data);
  document.getElementById('stepList').innerHTML  = '';
  document.getElementById('stepsCard').classList.remove('hidden');

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

function switchCalcTab(targetMode) {
  document.querySelectorAll('.calc-tab').forEach(tab => {
    const active = tab.dataset.calc === targetMode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active);
  });
  document.querySelectorAll('.calc-mode').forEach(mode => {
    const id = targetMode === 'binary' ? 'calcBinaryMode' : 'calcDecimalMode';
    mode.classList.toggle('active', mode.id === id);
  });
  // Limpiar resultados al cambiar modo
  document.getElementById('resultCard').classList.add('hidden');
  document.getElementById('stepsCard').classList.add('hidden');
  document.getElementById('errorBox').classList.add('hidden');
}

// ── Init ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Main tabs
  document.querySelectorAll('.main-tab').forEach(tab => {
    tab.addEventListener('click', () => switchMainTab(tab.dataset.panel));
  });

  // Conv sub-tabs
  document.querySelectorAll('.conv-tab').forEach(tab => {
    tab.addEventListener('click', () => switchConvTab(tab.dataset.conv));
  });

  // Calc sub-tabs
  document.querySelectorAll('.calc-tab').forEach(tab => {
    tab.addEventListener('click', () => switchCalcTab(tab.dataset.calc));
  });

  // Conversor: Bin → Dec
  const binConvInput = document.getElementById('binConvInput');
  binConvInput.addEventListener('input', e => {
    const pos     = e.target.selectionStart;
    const raw     = e.target.value;
    const cleaned = raw.replace(/[^01.]/g, '').replace(/(\..*)\./g, '$1');
    if (cleaned !== raw) {
      e.target.value = cleaned;
      e.target.setSelectionRange(Math.max(0, pos - 1), Math.max(0, pos - 1));
    }
    updateBin2Dec();
  });

  // Conversor: Dec → Bin
  const decConvInput = document.getElementById('decConvInput');
  decConvInput.addEventListener('input', e => {
    const raw     = e.target.value;
    const pos     = e.target.selectionStart;
    const cleaned = raw
      .replace(/(?!^)-/g, '')
      .replace(/[^0-9.\-]/g, '')
      .replace(/(\..*)\./g, '$1');
    if (cleaned !== raw) {
      e.target.value = cleaned;
      e.target.setSelectionRange(Math.max(0, pos - 1), Math.max(0, pos - 1));
    }
    updateDec2Bin();
  });

  // Calculadora binaria: inputs
  const inputA   = document.getElementById('numA');
  const inputB   = document.getElementById('numB');
  const decimalA = document.getElementById('decimalA');
  const decimalB = document.getElementById('decimalB');

  document.getElementById('calcBtn').addEventListener('click', calculate);

  [[inputA, decimalA], [inputB, decimalB]].forEach(([input, decimalEl]) => {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });
    input.addEventListener('input', e => {
      const pos     = e.target.selectionStart;
      const raw     = e.target.value;
      const cleaned = raw.replace(/[^01.]/g, '').replace(/(\..*)\./g, '$1');
      if (cleaned !== raw) {
        e.target.value = cleaned;
        e.target.setSelectionRange(Math.max(0, pos - 1), Math.max(0, pos - 1));
      }
      updateDecimalHint(e.target, decimalEl);
    });
  });

  // Calculadora decimal: inputs
  const inputDecA    = document.getElementById('numDecA');
  const inputDecB    = document.getElementById('numDecB');
  const binaryHintA  = document.getElementById('binaryHintA');
  const binaryHintB  = document.getElementById('binaryHintB');

  document.getElementById('calcDecBtn').addEventListener('click', calculateDecimal);

  [[inputDecA, binaryHintA], [inputDecB, binaryHintB]].forEach(([input, hintEl]) => {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') calculateDecimal(); });
    input.addEventListener('input', e => {
      const raw     = e.target.value;
      const pos     = e.target.selectionStart;
      // Permite: dígitos, punto y un guión al inicio
      const cleaned = raw
        .replace(/(?!^)-/g, '')
        .replace(/[^0-9.\-]/g, '')
        .replace(/(\..*)\./g, '$1');
      if (cleaned !== raw) {
        e.target.value = cleaned;
        e.target.setSelectionRange(Math.max(0, pos - 1), Math.max(0, pos - 1));
      }
      updateBinaryHint(e.target, hintEl);
    });
  });
});
