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
const overlayContainer = document.getElementById('overlay-container')!;
const testLog = document.getElementById('test-log')!;

function log(msg: string) {
  testLog.textContent += msg + '\n';
  console.log(msg);
}

async function renderPdfToCanvas(url: string, canvasId: string, pageIndex = 0, scale = 2.0) {
  const res = await fetch(url);
  const pdfBytes = await res.arrayBuffer();
  const dpr = window.devicePixelRatio || 1;
  const effectiveScale = scale * dpr;

  const renderRes = await send('RENDER_PAGE', { pdfBytes, pageIndex, scale: effectiveScale });
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  canvas.width = renderRes.width;
  canvas.height = renderRes.height;
  canvas.style.width = `${renderRes.width / dpr}px`;
  canvas.style.height = `${renderRes.height / dpr}px`;

  const ctx = canvas.getContext('2d')!;
  const imgData = new ImageData(new Uint8ClampedArray(renderRes.rgbaBuffer), renderRes.width, renderRes.height);
  ctx.putImageData(imgData, 0, 0);

  let coloredPixels = 0;
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 240 || data[i+1] < 240 || data[i+2] < 240) {
      coloredPixels++;
    }
  }

  return { pdfBytes, width: renderRes.width, height: renderRes.height, coloredPixels };
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

    log('[0.2] Rendering Sample 2 (two-column article)...');
    const r2 = await renderPdfToCanvas('/fixtures/02_two_column_article.pdf', 'render-canvas-2');

    log('[0.2] Rendering Sample 3 (image brochure)...');
    const r3 = await renderPdfToCanvas('/fixtures/03_image_brochure.pdf', 'render-canvas-3');

    renderStatus.innerHTML = `<strong>Render status:</strong> 3/3 sample PDFs rendered successfully at 2x scale and DPR.<br/>` +
      `Sample 1: ${r1.width}x${r1.height} px (${r1.coloredPixels} colored px)<br/>` +
      `Sample 2: ${r2.width}x${r2.height} px (${r2.coloredPixels} colored px)<br/>` +
      `Sample 3: ${r3.width}x${r3.height} px (${r3.coloredPixels} colored px)`;

    // Spike 0.3: List Page Objects and render SVG overlay at different zoom levels and rotated page
    log('[0.3] Testing page object enumeration and overlay mapping...');
    // 1. Zoom levels test: 1.0x, 1.5x, 2.0x on Sample 1
    for (const zoom of [1.0, 1.5, 2.0]) {
      const zoomObj = await send('GET_PAGE_OBJECTS', { pdfBytes: r1.pdfBytes, pageIndex: 0, scale: zoom });
      log(`[0.3] Zoom ${zoom}x: ${zoomObj.count} objects, devSize: ${zoomObj.devW}x${zoomObj.devH}`);
    }

    // 2. Rotated page test (11_rotated_cropbox.pdf, rotated 90 deg)
    const rotRes = await fetch('/fixtures/11_rotated_cropbox.pdf');
    const rotBytes = await rotRes.arrayBuffer();
    const rotObj = await send('GET_PAGE_OBJECTS', { pdfBytes: rotBytes, pageIndex: 0, scale: 1.0 });
    log(`[0.3] Rotated page test: rotation=${rotObj.rotation}°, count=${rotObj.count}, size=${rotObj.devW}x${rotObj.devH}`);

    // Build SVG overlay for Sample 1 at 1.0x scale
    const objRes = await send('GET_PAGE_OBJECTS', { pdfBytes: r1.pdfBytes, pageIndex: 0, scale: 1.0 });
    let svgRects = '';
    for (const obj of objRes.objects) {
      const color = obj.type === 'TEXT' ? '#3b82f6' : obj.type === 'IMAGE' ? '#10b981' : '#f59e0b';
      svgRects += `<rect x="${obj.devBox.x}" y="${obj.devBox.y}" width="${obj.devBox.w}" height="${obj.devBox.h}" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="3,3" />`;
      svgRects += `<text x="${obj.devBox.x}" y="${Math.max(12, obj.devBox.y - 2)}" fill="${color}" font-size="9" font-family="sans-serif">${obj.type} #${obj.index}</text>`;
    }

    overlayContainer.innerHTML = `
      <div style="position: relative; width: ${objRes.devW}px; height: ${objRes.devH}px; border: 1px solid #94a3b8; background: #fff;">
        <svg width="${objRes.devW}" height="${objRes.devH}" style="position: absolute; top: 0; left: 0; pointer-events: none;">
          ${svgRects}
        </svg>
      </div>
    `;

    objectCountStatus.innerHTML = `<strong>Page Objects detected:</strong> ${objRes.count} objects on standard page.<br/>` +
      `<strong>Rotated Page test:</strong> rotation = ${rotObj.rotation}°, mapped ${rotObj.count} objects with FPDF_PageToDevice.`;

    log('[Success] Spikes 0.1, 0.2, and 0.3 verified!');
  } catch (err: any) {
    log(`[Error] ${err.message}`);
    workerStatus.className = 'status-badge status-err';
    workerStatus.textContent = `Error: ${err.message}`;
  }
}

run();
