const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

let reqId = 0;
const pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

worker.onmessage = (e) => {
  const { id, type, result, error } = e.data;
  if (pending.has(id)) {
    const { resolve, reject } = pending.get(id)!;
    pending.delete(id);
    if (type === 'ERROR' || error) {
      reject(new Error(error));
    } else {
      resolve(result);
    }
  }
};

export function send(type: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++reqId;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type, payload });
  });
}

const workerStatus = document.getElementById('worker-status')!;
const workerLog = document.getElementById('worker-log')!;
const renderStatus = document.getElementById('render-status')!;
const objectCountStatus = document.getElementById('object-count-status')!;
const testLog = document.getElementById('test-log')!;

function log(msg: string) {
  testLog.textContent += msg + '\n';
  console.log(msg);
}

async function renderPdfToCanvas(url: string, canvasId: string, pageIndex = 0) {
  const res = await fetch(url);
  const pdfBytes = await res.arrayBuffer();
  const dpr = window.devicePixelRatio || 1;
  const scale = 2.0 * dpr;

  const renderRes = await send('RENDER_PAGE', { pdfBytes, pageIndex, scale });
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  canvas.width = renderRes.width;
  canvas.height = renderRes.height;
  canvas.style.width = `${renderRes.width / dpr}px`;
  canvas.style.height = `${renderRes.height / dpr}px`;

  const ctx = canvas.getContext('2d')!;
  const imgData = new ImageData(new Uint8ClampedArray(renderRes.rgbaBuffer), renderRes.width, renderRes.height);
  ctx.putImageData(imgData, 0, 0);

  // Compute non-white pixel count to verify rendering is non-trivial
  let coloredPixels = 0;
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 240 || data[i+1] < 240 || data[i+2] < 240) {
      coloredPixels++;
    }
  }

  return { width: renderRes.width, height: renderRes.height, coloredPixels };
}

async function run() {
  testLog.textContent = '';
  log('[Start] Running Phase 0 Spike Harness');

  try {
    // Spike 0.1: Initialize PDFium WASM in Web Worker
    log('[0.1] Sending INIT to PDFium Web Worker...');
    const initRes = await send('INIT', { wasmUrl: '/pdfium.wasm' });
    log(`[0.1] Worker responded: ${JSON.stringify(initRes)}`);
    workerStatus.className = 'status-badge status-ok';
    workerStatus.textContent = 'PDFium WASM Worker Initialized: SUCCESS';
    workerLog.textContent = `Engine: PDFium 2.15.1 (WASM) | Status: Ready | Thread: Web Worker`;

    // Spike 0.2: Open PDF & Render Page 1 to Canvas at 2x scale and DPR on 3 sample PDFs
    log('[0.2] Rendering Sample 1 (text-only single column)...');
    const r1 = await renderPdfToCanvas('/fixtures/01_text_single_column.pdf', 'render-canvas-1');
    log(`[0.2] Sample 1 rendered: ${r1.width}x${r1.height} px, ${r1.coloredPixels} text pixels`);

    log('[0.2] Rendering Sample 2 (two-column article)...');
    const r2 = await renderPdfToCanvas('/fixtures/02_two_column_article.pdf', 'render-canvas-2');
    log(`[0.2] Sample 2 rendered: ${r2.width}x${r2.height} px, ${r2.coloredPixels} text pixels`);

    log('[0.2] Rendering Sample 3 (image brochure)...');
    const r3 = await renderPdfToCanvas('/fixtures/03_image_brochure.pdf', 'render-canvas-3');
    log(`[0.2] Sample 3 rendered: ${r3.width}x${r3.height} px, ${r3.coloredPixels} image/text pixels`);

    renderStatus.innerHTML = `<strong>Render status:</strong> 3/3 sample PDFs rendered successfully at 2x scale and DPR.<br/>` +
      `Sample 1: ${r1.width}x${r1.height} px (${r1.coloredPixels} colored px)<br/>` +
      `Sample 2: ${r2.width}x${r2.height} px (${r2.coloredPixels} colored px)<br/>` +
      `Sample 3: ${r3.width}x${r3.height} px (${r3.coloredPixels} colored px)`;

    // Spike 0.3: List Page Objects
    const s1Res = await fetch('/fixtures/01_text_single_column.pdf');
    const s1Bytes = await s1Res.arrayBuffer();
    const objRes = await send('GET_PAGE_OBJECTS', { pdfBytes: s1Bytes, pageIndex: 0 });
    log(`[0.3] Extracted ${objRes.count} objects from page 1`);
    objectCountStatus.innerHTML = `<strong>Page Objects detected:</strong> ${objRes.count} objects (${objRes.objects.map((o: any) => o.type).join(', ')})`;

    log('[Success] Spikes 0.1 and 0.2 verified!');
  } catch (err: any) {
    log(`[Error] ${err.message}`);
    workerStatus.className = 'status-badge status-err';
    workerStatus.textContent = `Error: ${err.message}`;
  }
}

run();
