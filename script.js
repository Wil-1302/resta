/* ================================================================
   Calculadora de Resta Binaria
   Lógica: resta con préstamo (borrow), igual que en decimal.
   ================================================================ */

// ── Validación ──────────────────────────────────────────────────

/**
 * Devuelve true si la cadena solo contiene '0' y '1' y no está vacía.
 */
function isValidBinary(str) {
  return str.length > 0 && /^[01]+$/.test(str);
}

// ── Lógica de resta ─────────────────────────────────────────────

/**
 * Resta dos cadenas binarias: rawA - rawB.
 *
 * Algoritmo con préstamo (borrow):
 *   Se procesa de LSB a MSB. Cuando el dígito superior es menor
 *   que el inferior más el préstamo acumulado, se "pide prestado"
 *   a la columna de la izquierda: el dígito sube en 2 (base binaria)
 *   y la columna izquierda queda con 1 menos.
 *
 * Si A < B: el resultado es negativo. Se invierte los operandos
 *   para calcular |B - A| y se marca isNegative = true.
 *
 * Retorna:
 *   { top, bottom, resBits, borrowUsed, needsBorrow, resultStr,
 *     isNegative, decA, decB, decResult }
 */
function subtractBinary(rawA, rawB) {
  const decA = parseInt(rawA, 2);
  const decB = parseInt(rawB, 2);
  const isNegative = decA < decB;

  // Para el procedimiento siempre calculamos mayor - menor
  const topRaw = isNegative ? rawB : rawA;
  const botRaw = isNegative ? rawA : rawB;

  // Igualar longitudes con ceros a la izquierda
  const len = Math.max(topRaw.length, botRaw.length);
  const top = topRaw.padStart(len, '0');
  const bottom = botRaw.padStart(len, '0');

  const topBits = top.split('').map(Number);
  const botBits = bottom.split('').map(Number);

  const resBits    = new Array(len);
  // borrowUsed[i] = cuánto cedió la columna i a su vecina derecha
  const borrowUsed  = new Array(len).fill(0);
  // needsBorrow[i] = si la columna i tuvo que pedir a su vecina izquierda
  const needsBorrow = new Array(len).fill(0);

  let runningBorrow = 0; // préstamo acumulado que la columna actual hereda de la derecha

  // Procesar de derecha (LSB) a izquierda (MSB)
  for (let i = len - 1; i >= 0; i--) {
    borrowUsed[i] = runningBorrow; // cuánto cede esta columna (lo que la derecha le pidió)

    const raw = topBits[i] - botBits[i] - runningBorrow;

    if (raw < 0) {
      resBits[i]    = raw + 2; // pide prestado: suma 2 (base 2)
      needsBorrow[i] = 1;
      runningBorrow  = 1;      // la columna izquierda deberá ceder 1
    } else {
      resBits[i]    = raw;
      needsBorrow[i] = 0;
      runningBorrow  = 0;
    }
  }

  // Resultado como cadena (eliminar ceros a la izquierda, mínimo "0")
  const resultStr = resBits.join('').replace(/^0+/, '') || '0';
  const decResult = Math.abs(decA - decB);

  return {
    top, bottom,
    topBits, botBits,
    resBits, resultStr,
    borrowUsed, needsBorrow,
    isNegative,
    decA, decB, decResult,
  };
}

// ── Renderizado ─────────────────────────────────────────────────

/**
 * Construye la tabla visual de la resta con filas:
 *   Préstamo cedido | top | bottom | divider | resultado
 */
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

  const labelCell = (text) =>
    `<td class="td-label">${text}</td>`;

  const topLabel    = isNegative ? 'B &nbsp;(mayor)'  : 'A &nbsp;(minuendo)';
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

/**
 * Genera la lista de pasos textuales, de LSB a MSB
 * (el orden natural del algoritmo con préstamo).
 */
function renderSteps(data) {
  const { topBits, botBits, resBits, borrowUsed, needsBorrow } = data;
  const len = topBits.length;

  let html = '';
  let num  = 1;

  // De derecha (LSB) a izquierda (MSB)
  for (let i = len - 1; i >= 0; i--) {
    const pos      = len - 1 - i;      // posición desde LSB (0 = bit menos significativo)
    const lentOut  = borrowUsed[i];    // cuánto cedió esta columna a la derecha
    const borrows  = needsBorrow[i];   // ¿esta columna pidió a la izquierda?
    const t        = topBits[i];
    const b        = botBits[i];
    const r        = resBits[i];

    // Construir expresión de la columna
    let expr = `${t} &minus; ${b}`;
    if (lentOut) expr += ` &minus; 1<sub style="font-size:.75em">(prest.)</sub>`;

    let desc;
    if (borrows) {
      // Necesitó pedir préstamo
      const raw = t - b - lentOut; // será negativo
      desc =
        `<strong>Bit posición ${pos}:</strong> <code>${t}&minus;${b}${lentOut ? '&minus;1' : ''} = ${raw}</code>
         &rarr; negativo &rarr; <span class="tag-borrow">pide préstamo</span>
         a la izquierda: <code>1${t}&minus;${b}${lentOut ? '&minus;1' : ''} = <strong>${r}</strong></code>`;
    } else if (lentOut && t - b === lentOut) {
      // Exactamente igualado por el préstamo que ya cedió
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

// ── UI helpers ──────────────────────────────────────────────────

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

// ── Acción principal ─────────────────────────────────────────────

function calculate() {
  const inputA = document.getElementById('numA');
  const inputB = document.getElementById('numB');
  const hintA  = document.getElementById('hintA');
  const hintB  = document.getElementById('hintB');

  const valA = inputA.value.trim();
  const valB = inputB.value.trim();

  let hasError = false;

  // Validar A
  if (!valA) {
    setFieldState(inputA, hintA, 'invalid', 'Este campo es obligatorio');
    hasError = true;
  } else if (!isValidBinary(valA)) {
    setFieldState(inputA, hintA, 'invalid', 'Solo se permiten dígitos 0 y 1');
    hasError = true;
  } else {
    setFieldState(inputA, hintA, 'valid', `= ${parseInt(valA, 2)} en decimal`);
  }

  // Validar B
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

  // ── Mostrar resultado ──
  const sign     = data.isNegative ? '−' : '';
  const badgeTxt = data.isNegative ? 'Negativo' : data.decResult === 0 ? 'Cero' : 'Positivo';
  const decLine  = `${data.isNegative ? '−' : ''}${data.decResult} en decimal`;

  document.getElementById('resultSign').textContent    = sign;
  document.getElementById('resultBin').textContent     = data.resultStr;
  document.getElementById('resultBadge').textContent   = badgeTxt;
  document.getElementById('resultDecimal').textContent = decLine;
  document.getElementById('resultCard').classList.remove('hidden');

  // ── Mostrar procedimiento ──
  const negNote = document.getElementById('negativeNote');
  negNote.classList.toggle('hidden', !data.isNegative);

  document.getElementById('tableWrap').innerHTML = renderTable(data);
  document.getElementById('stepList').innerHTML  = renderSteps(data);
  document.getElementById('stepsCard').classList.remove('hidden');

  // Desplazar suavemente al resultado
  document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Eventos ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const inputA = document.getElementById('numA');
  const inputB = document.getElementById('numB');

  // Calcular al hacer clic
  document.getElementById('calcBtn').addEventListener('click', calculate);

  // Calcular al presionar Enter en cualquier campo
  [inputA, inputB].forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') calculate();
    });

    // Filtrar en tiempo real: solo 0 y 1
    input.addEventListener('input', e => {
      const pos     = e.target.selectionStart;
      const cleaned = e.target.value.replace(/[^01]/g, '');
      if (cleaned !== e.target.value) {
        e.target.value = cleaned;
        // Restaurar posición del cursor tras la limpieza
        e.target.setSelectionRange(pos - 1, pos - 1);
      }
    });
  });
});
