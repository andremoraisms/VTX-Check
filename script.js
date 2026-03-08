// ─── ELEMENTOS ───────────────────────────────────────────────
const imageInput     = document.getElementById('imageInput');
const btnUpload      = document.getElementById('btnUpload');
const imagePreview   = document.getElementById('imagePreview');
const placeholderText = document.getElementById('placeholderText');
const btnCapturar    = document.getElementById('btnCapturar');
const scriptTemplate = document.getElementById('scriptTemplate');
const statusBar      = document.getElementById('statusBar');
const statusMsg      = document.getElementById('statusMsg');
const progressWrap   = document.getElementById('progressWrap');
const progressBar    = document.getElementById('progressBar');
const resultBox      = document.getElementById('resultBox');
const resultFields   = document.getElementById('resultFields');
const resultBadge    = document.getElementById('resultBadge');
const btnCopyResult  = document.getElementById('btnCopyResult');
const rawToggle      = document.getElementById('rawToggle');
const rawContent     = document.getElementById('rawContent');
const dropZone       = document.getElementById('dropZone');

let scriptFinal = '';

// ─── STATUS HELPER ───────────────────────────────────────────
function setStatus(msg, type = '') {
  statusMsg.textContent = msg;
  statusBar.className = 'status-bar' + (type ? ' ' + type : '');
}

// ─── ABRIR GALERIA ───────────────────────────────────────────
btnUpload.addEventListener('click', () => imageInput.click());
dropZone.addEventListener('click', () => imageInput.click());

// Drag & drop (desktop)
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadFile(file);
});

// ─── CARREGAR IMAGEM ─────────────────────────────────────────
imageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) loadFile(file);
});

function loadFile(file) {
  const url = URL.createObjectURL(file);
  imagePreview.src = url;
  imagePreview.style.display = 'block';
  placeholderText.style.display = 'none';
  btnCapturar.disabled = false;
  resultBox.style.display = 'none';
  setStatus('Imagem carregada. Clique em Extrair.', 'ready');
}

// ─── PRÉ-PROCESSAR CANVAS ────────────────────────────────────
function preprocessCanvas(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Escala para melhor resolução no OCR (min 1200px de largura)
  const scale = Math.max(1, 1200 / img.naturalWidth);
  canvas.width  = img.naturalWidth  * scale;
  canvas.height = img.naturalHeight * scale;

  // Passo 1: desenha a imagem escalada
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Passo 2: converte para escala de cinza pixel a pixel
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);

  // Passo 3: aplica contraste e brilho via CSS filter
  const canvas2 = document.createElement('canvas');
  canvas2.width  = canvas.width;
  canvas2.height = canvas.height;
  const ctx2 = canvas2.getContext('2d');
  ctx2.filter = 'contrast(180%) brightness(110%)';
  ctx2.drawImage(canvas, 0, 0);

  return canvas2;
}

// ─── EXTRAÇÃO DE DADOS ────────────────────────────────────────
function extractData(text) {
  const t = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ');

  // ── MODELO ──
  let modelo = null;
  const modelPatterns = [
    /Galaxy\s+([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+){0,3})/i,
    /SM[-\s]?([A-Z][0-9]{3,4}[A-Z]?)/i,
    /iPhone\s+([A-Za-z0-9\s]+(?:Pro|Max|Plus|Mini)?)/i,
    /Redmi\s+([A-Za-z0-9\s]+)/i,
    /POCO\s+([A-Za-z0-9\s]+)/i,
    /Xiaomi\s+([A-Za-z0-9\s]+)/i,
    /Motorola\s+(?:Moto\s+)?([A-Za-z0-9\s]+)/i,
  ];
  for (const pat of modelPatterns) {
    const m = t.match(pat);
    if (m) { modelo = m[0].trim().replace(/\s+/g, ' ').substring(0, 40); break; }
  }

  // ── SERIAL / SN ──
  let sn = null;
  const snPatterns = [
    /(?:S\/N|SN|Serial\s*(?:Number|No\.?)|N[uú]mero\s+de\s+[Ss][ée]rie|S[ée]rie|Série)[\s:.\-]*([A-Z0-9]{6,20})/i,
    /\bSN[\s:]*([A-Z0-9]{8,20})\b/i,
    /(?:^|\n)([A-Z0-9]{10,15})(?:\s*$|\s+)/m,
  ];
  for (const pat of snPatterns) {
    const m = t.match(pat);
    if (m && m[1]) { sn = m[1].trim(); break; }
  }

  // ── IMEI ──
  let imei1 = null, imei2 = null;

  const imei1Pat = t.match(/IMEI\s*[1I\/][\s:.\-]*(\d[\d\s]{13,16}\d)/i);
  if (imei1Pat) imei1 = imei1Pat[1].replace(/\s/g, '').substring(0, 15);

  const imei2Pat = t.match(/IMEI\s*2[\s:.\-]*(\d[\d\s]{13,16}\d)/i);
  if (imei2Pat) imei2 = imei2Pat[1].replace(/\s/g, '').substring(0, 15);

  // Fallback: qualquer sequência de exatamente 15 dígitos no texto
  if (!imei1 || !imei2) {
    const allImeis = [];
    const raw15 = [...t.matchAll(/\b(\d[\d ]{13,16}\d)\b/g)];
    for (const m of raw15) {
      const digits = m[1].replace(/\s/g, '');
      if (digits.length === 15 && !allImeis.includes(digits)) {
        allImeis.push(digits);
      }
    }
    if (!imei1 && allImeis[0]) imei1 = allImeis[0];
    if (!imei2 && allImeis[1]) imei2 = allImeis[1];
  }

  return {
    modelo: modelo || null,
    sn:     sn     || null,
    imei1:  imei1  || null,
    imei2:  imei2  || null,
  };
}

// ─── RENDERIZA RESULTADO ─────────────────────────────────────
function renderResult(dados, rawText) {
  resultFields.innerHTML = '';

  const fields = [
    { key: 'modelo', label: 'Modelo' },
    { key: 'sn',     label: 'Número de Série (SN)' },
    { key: 'imei1',  label: 'IMEI 1' },
    { key: 'imei2',  label: 'IMEI 2' },
  ];

  let found = 0;
  fields.forEach(f => {
    const val = dados[f.key];
    if (val) found++;
    const div = document.createElement('div');
    div.className = 'result-field';
    div.innerHTML = `
      <div class="result-field-name">${f.label}</div>
      <div class="result-field-value ${val ? 'found' : 'not-found'}">${val || 'Não encontrado'}</div>
    `;
    resultFields.appendChild(div);
  });

  // Badge de status
  if (found >= 3) {
    resultBadge.textContent = '✓ OK';
    resultBadge.className = 'result-badge ok';
  } else {
    resultBadge.textContent = `⚠ ${found}/4`;
    resultBadge.className = 'result-badge fail';
  }

  // Monta o script final com os dados extraídos
  scriptFinal = scriptTemplate.value
    .replace('{MODELO DO CELULAR}', dados.modelo || '[NÃO ENCONTRADO]')
    .replace('{SERIE}',             dados.sn     || '[NÃO ENCONTRADO]')
    .replace('{IMEI 1}',            dados.imei1  || '[NÃO ENCONTRADO]')
    .replace('{IMEI 2}',            dados.imei2  || '[NÃO ENCONTRADO]');

  // Texto bruto do OCR (oculto por padrão)
  rawContent.textContent = rawText;
  rawContent.style.display = 'none';
  rawToggle.textContent = '▶ Ver texto bruto do OCR';

  resultBox.style.display = 'block';
}

// ─── TOGGLE TEXTO BRUTO ──────────────────────────────────────
rawToggle.addEventListener('click', () => {
  const open = rawContent.style.display === 'block';
  rawContent.style.display = open ? 'none' : 'block';
  rawToggle.textContent = open ? '▶ Ver texto bruto do OCR' : '▼ Ocultar texto bruto';
});

// ─── COPIAR RESULTADO ────────────────────────────────────────
btnCopyResult.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(scriptFinal);
  } catch {
    // Fallback para navegadores sem suporte à API de clipboard
    const ta = document.createElement('textarea');
    ta.value = scriptFinal;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  btnCopyResult.textContent = '✅ Copiado!';
  setTimeout(() => { btnCopyResult.textContent = '📋 Copiar Script Preenchido'; }, 2000);
});

// ─── BOTÃO PRINCIPAL: EXTRAIR ─────────────────────────────────
btnCapturar.addEventListener('click', async () => {
  btnCapturar.disabled = true;
  btnUpload.disabled   = true;
  resultBox.style.display = 'none';

  progressWrap.classList.add('visible');
  progressBar.style.width = '0%';
  setStatus('Pré-processando imagem...', 'active');

  try {
    // 1. Pré-processamento da imagem
    const canvas = preprocessCanvas(imagePreview);
    progressBar.style.width = '15%';

    // 2. OCR com Tesseract (idioma inglês — ideal para rótulos de hardware)
    setStatus('Executando OCR (pode levar alguns segundos)...', 'active');

    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = 15 + Math.round(m.progress * 75);
          progressBar.style.width = pct + '%';
        }
      }
    });

    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 /-:.\n',
      preserve_interword_spaces: '1',
    });

    const { data: { text } } = await worker.recognize(canvas);
    await worker.terminate();

    console.log('[VTX OCR] Texto bruto:', text);
    progressBar.style.width = '95%';

    // 3. Extração dos dados
    const dados = extractData(text);
    console.log('[VTX OCR] Dados extraídos:', dados);

    // 4. Renderiza os resultados na tela
    renderResult(dados, text);

    const foundCount = Object.values(dados).filter(Boolean).length;
    if (foundCount >= 3) {
      setStatus(`Extração concluída — ${foundCount}/4 campos encontrados.`, 'success');
    } else if (foundCount > 0) {
      setStatus(`Parcial — ${foundCount}/4 encontrados. Tente foto mais nítida.`, 'ready');
    } else {
      setStatus('Nenhum dado encontrado. Use foto mais nítida e bem iluminada.', 'error');
    }

    progressBar.style.width = '100%';
    setTimeout(() => progressWrap.classList.remove('visible'), 800);

  } catch (err) {
    console.error(err);
    setStatus('Erro no OCR. Tente novamente com outra foto.', 'error');
    progressWrap.classList.remove('visible');
  } finally {
    btnCapturar.disabled = false;
    btnUpload.disabled   = false;
  }
});
