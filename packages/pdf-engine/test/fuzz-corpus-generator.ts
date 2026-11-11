/**
 * @rhypdf/pdf-engine
 * Task 16.8: Deterministic 200-PDF Robustness & Fuzz Corpus Generator.
 * Generates 200 distinct valid, malformed, truncated, fuzzed, and hostile PDF byte arrays.
 */

export interface CorpusPdf {
  id: number;
  name: string;
  category: string;
  expectedOutcome: 'valid' | 'corrupt' | 'unsupported';
  data: Uint8Array;
}

// Simple deterministic PRNG (Linear Congruential Generator) for reproducible fuzzing
function createPrng(seed = 1337) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Creates a minimal valid PDF 1.4 byte array.
 */
function createValidPdf(pagesCount = 1, rotation: 0 | 90 | 180 | 270 = 0): Uint8Array {
  const enc = new TextEncoder();
  let body = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const kidRefs = Array.from({ length: pagesCount }, (_, i) => `${3 + i} 0 R`).join(' ');
  body += `2 0 obj\n<< /Type /Pages /Kids [${kidRefs}] /Count ${pagesCount} >>\nendobj\n`;

  for (let i = 0; i < pagesCount; i++) {
    const pageNum = 3 + i;
    body += `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Rotate ${rotation} >>\nendobj\n`;
  }

  const xrefOffset = enc.encode(body).length;
  let xref = `xref\n0 ${3 + pagesCount}\n0000000000 65535 f \n`;
  xref += `0000000009 00000 n \n0000000058 00000 n \n`;
  for (let i = 0; i < pagesCount; i++) {
    xref += `0000000120 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${3 + pagesCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return enc.encode(body + xref + trailer);
}

export function generate200PdfCorpus(): CorpusPdf[] {
  const corpus: CorpusPdf[] = [];
  const prng = createPrng(42);
  let id = 1;
  const enc = new TextEncoder();

  // 1. Category 1: Valid Baseline PDFs (20 files)
  for (let i = 1; i <= 20; i++) {
    const pageCount = (i % 5) + 1;
    const rotation = ((i % 4) * 90) as 0 | 90 | 180 | 270;
    corpus.push({
      id: id++,
      name: `valid_sample_${i}_pages_${pageCount}`,
      category: 'valid_baseline',
      expectedOutcome: 'valid',
      data: createValidPdf(pageCount, rotation)
    });
  }

  // 2. Category 2: Zero-byte & Truncated Header PDFs (20 files)
  corpus.push({
    id: id++,
    name: 'empty_buffer_0_bytes',
    category: 'truncated_header',
    expectedOutcome: 'corrupt',
    data: new Uint8Array(0)
  });
  corpus.push({
    id: id++,
    name: 'single_byte_0x25',
    category: 'truncated_header',
    expectedOutcome: 'corrupt',
    data: new Uint8Array([0x25])
  });
  corpus.push({
    id: id++,
    name: 'header_pdf_magic_only',
    category: 'truncated_header',
    expectedOutcome: 'corrupt',
    data: enc.encode('%PDF')
  });
  corpus.push({
    id: id++,
    name: 'header_pdf_1_dot',
    category: 'truncated_header',
    expectedOutcome: 'corrupt',
    data: enc.encode('%PDF-1.')
  });
  corpus.push({
    id: id++,
    name: 'header_pdf_newline_only',
    category: 'truncated_header',
    expectedOutcome: 'corrupt',
    data: enc.encode('%PDF-1.4\n')
  });

  for (let i = 6; i <= 20; i++) {
    const base = createValidPdf(1);
    const cutLen = Math.min(i * 4, base.length - 10);
    corpus.push({
      id: id++,
      name: `header_truncated_len_${cutLen}`,
      category: 'truncated_header',
      expectedOutcome: 'corrupt',
      data: base.slice(0, cutLen)
    });
  }

  // 3. Category 3: Truncated Body & Missing EOF (20 files)
  for (let i = 1; i <= 20; i++) {
    const base = createValidPdf(2);
    // Cut off the last i * 8 bytes (removes %%EOF, startxref, or xref)
    const cutLen = Math.max(20, base.length - i * 8);
    corpus.push({
      id: id++,
      name: `truncated_eof_cutoff_${i * 8}`,
      category: 'truncated_body',
      expectedOutcome: 'corrupt',
      data: base.slice(0, cutLen)
    });
  }

  // 4. Category 4: Corrupted Cross-Reference Tables (20 files)
  for (let i = 1; i <= 20; i++) {
    const baseText = new TextDecoder().decode(createValidPdf(1));
    let corrupted: string;
    if (i % 4 === 0) {
      corrupted = baseText.replace('startxref\n', 'startxref\n999999999\n');
    } else if (i % 4 === 1) {
      corrupted = baseText.replace('xref\n', 'xref\nINVALID_XREF_TEXT\n');
    } else if (i % 4 === 2) {
      corrupted = baseText.replace(/0000000009 00000 n/g, '0000000009 BAD_GEN');
    } else {
      corrupted = baseText.replace('%%EOF', 'GARBAGE_NO_EOF');
    }
    corpus.push({
      id: id++,
      name: `corrupt_xref_variant_${i}`,
      category: 'corrupted_xref',
      expectedOutcome: 'corrupt',
      data: enc.encode(corrupted)
    });
  }

  // 5. Category 5: Hostile & Malformed Dictionaries (20 files)
  for (let i = 1; i <= 20; i++) {
    let hostile = `%PDF-1.4\n1 0 obj\n`;
    if (i % 3 === 0) {
      // Unterminated dictionary
      hostile += `<< /Type /Catalog /Pages 2 0 R /Unclosed true \nendobj\n`;
    } else if (i % 3 === 1) {
      // Cyclic recursive catalog
      hostile += `<< /Type /Catalog /Pages 1 0 R >>\nendobj\n`;
    } else {
      // Deeply nested brackets
      const brackets = '['.repeat(i * 10) + ']'.repeat(Math.max(1, i * 10 - 5));
      hostile += `<< /Type /Catalog /Nested ${brackets} >>\nendobj\n`;
    }
    hostile += `%%EOF`;
    corpus.push({
      id: id++,
      name: `hostile_dict_variant_${i}`,
      category: 'hostile_dictionaries',
      expectedOutcome: 'corrupt',
      data: enc.encode(hostile)
    });
  }

  // 6. Category 6: Hostile & Corrupt Streams (20 files)
  for (let i = 1; i <= 20; i++) {
    let streamPdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
    streamPdf += `3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n`;
    if (i % 3 === 0) {
      // Stream length claims 500,000 bytes, only 10 provided
      streamPdf += `4 0 obj\n<< /Length 500000 >>\nstream\nshort\nendobj\n`;
    } else if (i % 3 === 1) {
      // Negative stream length
      streamPdf += `4 0 obj\n<< /Length -999 >>\nstream\nbytes\nendstream\nendobj\n`;
    } else {
      // Corrupt filter
      streamPdf += `4 0 obj\n<< /Length 10 /Filter /NonExistentCodec >>\nstream\n0123456789\nendstream\nendobj\n`;
    }
    streamPdf += `%%EOF`;
    corpus.push({
      id: id++,
      name: `corrupt_stream_variant_${i}`,
      category: 'corrupt_streams',
      expectedOutcome: 'corrupt',
      data: enc.encode(streamPdf)
    });
  }

  // 7. Category 7: Random Byte Noise / Pure Fuzzed Blobs (20 files)
  const sizes = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
  for (let i = 1; i <= 20; i++) {
    const size = sizes[(i - 1) % sizes.length]!;
    const noise = new Uint8Array(size);
    for (let j = 0; j < size; j++) {
      noise[j] = Math.floor(prng() * 256);
    }
    corpus.push({
      id: id++,
      name: `random_noise_${size}_bytes_${i}`,
      category: 'random_noise',
      expectedOutcome: 'corrupt',
      data: noise
    });
  }

  // 8. Category 8: Single-bit and Multi-bit Flips on Valid PDFs (30 files)
  for (let i = 1; i <= 30; i++) {
    const base = createValidPdf(1);
    const flipped = new Uint8Array(base);
    const flipCount = (i % 10) + 1; // 1 to 10 flips
    for (let f = 0; f < flipCount; f++) {
      const byteIdx = Math.floor(prng() * flipped.length);
      const bitMask = 1 << Math.floor(prng() * 8);
      flipped[byteIdx] ^= bitMask;
    }
    corpus.push({
      id: id++,
      name: `bit_flipped_${flipCount}_bits_sample_${i}`,
      category: 'bit_flips',
      expectedOutcome: 'corrupt',
      data: flipped
    });
  }

  // 9. Category 9: Null Sprays and Byte Overwrites (20 files)
  for (let i = 1; i <= 20; i++) {
    const base = createValidPdf(2);
    const sprayed = new Uint8Array(base);
    const start = Math.floor(prng() * (sprayed.length / 2));
    const len = Math.floor(prng() * 100) + 20;
    const fillVal = i % 2 === 0 ? 0x00 : 0xff;
    for (let j = start; j < Math.min(sprayed.length, start + len); j++) {
      sprayed[j] = fillVal;
    }
    corpus.push({
      id: id++,
      name: `byte_spray_${fillVal === 0 ? 'null' : 'ff'}_len_${len}_sample_${i}`,
      category: 'byte_spray',
      expectedOutcome: 'corrupt',
      data: sprayed
    });
  }

  // 10. Category 10: Structural Corruptions (10 files)
  for (let i = 1; i <= 10; i++) {
    const baseText = new TextDecoder().decode(createValidPdf(1));
    let corrupted: string;
    if (i % 2 === 0) {
      corrupted = baseText.replace('/Type /Catalog', '/Type /CorruptedCatalogType');
    } else {
      corrupted = baseText.replace('/MediaBox [0 0 595 842]', '/MediaBox [NOT_NUMBERS]');
    }
    corpus.push({
      id: id++,
      name: `structural_corruption_sample_${i}`,
      category: 'structural_corruption',
      expectedOutcome: 'corrupt',
      data: enc.encode(corrupted)
    });
  }

  return corpus;
}
