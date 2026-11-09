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

function send(type: string, payload?: any): Promise<any> {
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

    // Spike 0.2: Open PDF & Render Page 1 to Canvas at 2x scale and DPR
    log('[0.2] Fetching sample PDF fixtures/01_text_single_column.pdf...');
    const pdfRes = await fetch('/fixtures/01_text_single_column.pdf');
    const pdfBytes = await pdfRes.arrayBuffer();
    log(`[0.2] Fetched PDF bytes: ${pdfBytes.byteLength} bytes`);

    const dpr = window.devicePixelRatio || 1;
    const scale = 2.0 * dpr;
    log(`[0.2] Rendering page 0 at scale ${scale} (2x scale * DPR ${dpr})...`);
    const renderRes = await send('RENDER_PAGE', { pdfBytes, pageIndex: 0, scale });
    log(`[0.2] Render completed: ${renderRes.width}x${renderRes.height} px`);

    const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
    canvas.width = renderRes.width;
    canvas.height = renderRes.height;
    canvas.style.width = `${renderRes.width / dpr}px`;
    canvas.style.height = `${renderRes.height / dpr}px`;

    const ctx = canvas.getContext('2d')!;
    const imgData = new ImageData(new Uint8ClampedArray(renderRes.rgbaBuffer), renderRes.width, renderRes.height);
    ctx.putImageData(imgData, 0, 0);
    renderStatus.innerHTML = `<strong>Render status:</strong> Rendered page 1 at ${renderRes.width}x${renderRes.height} px (2x scale + DPR ${dpr}).`;

    // Spike 0.3: List Page Objects and Display Count
    log('[0.3] Extracting page objects...');
    const objRes = await send('GET_PAGE_OBJECTS', { pdfBytes, pageIndex: 0 });
    log(`[0.3] Extracted ${objRes.count} objects from page 1`);
    objectCountStatus.innerHTML = `<strong>Page Objects detected:</strong> ${objRes.count} objects (${objRes.objects.map((o: any) => o.type).join(', ')})`;

    log('[Success] Spikes 0.1, 0.2, 0.3 verified in Web Worker!');
  } catch (err: any) {
    log(`[Error] ${err.message}`);
    workerStatus.className = 'status-badge status-err';
    workerStatus.textContent = `Error: ${err.message}`;
  }
}

run();
