import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function buildFixtures() {
  const dir = path.resolve('fixtures');
  fs.mkdirSync(dir, { recursive: true });

  // 1. Text-only, single column
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([595.28, 841.89]); // A4
    page.drawText('Sample Contract Agreement', {
      x: 50,
      y: 790,
      size: 20,
      font,
      color: rgb(0.1, 0.1, 0.1)
    });
    page.drawText('1. Scope of Agreement and Terms', {
      x: 50,
      y: 750,
      size: 14,
      font,
      color: rgb(0.2, 0.2, 0.2)
    });
    page.drawText('This agreement constitutes the complete understanding between parties.', {
      x: 50,
      y: 720,
      size: 11,
      font
    });
    page.drawText('All obligations under this contract remain legally binding and enforceable.', {
      x: 50,
      y: 700,
      size: 11,
      font
    });
    page.drawText('The quick brown fox jumps over the lazy dog repeatedly.', {
      x: 50,
      y: 680,
      size: 11,
      font
    });
    fs.writeFileSync(path.join(dir, '01_text_single_column.pdf'), await doc.save());
  }

  // 2. Two-column article / paper
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.TimesRoman);
    const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);
    const page = doc.addPage([595.28, 841.89]);
    page.drawText('Research on Modern Document Layout Algorithms', {
      x: 50,
      y: 800,
      size: 18,
      font: fontBold
    });
    // Left column (x=50..270)
    page.drawText('Abstract - Left Column', { x: 50, y: 760, size: 12, font: fontBold });
    page.drawText('In this section we review the algorithmic foundation', {
      x: 50,
      y: 740,
      size: 10,
      font
    });
    page.drawText('for detecting column boundaries without heuristic failure.', {
      x: 50,
      y: 725,
      size: 10,
      font
    });
    page.drawText('Primary experiments demonstrate 99.8% precision.', {
      x: 50,
      y: 710,
      size: 10,
      font
    });
    // Right column (x=310..530)
    page.drawText('Introduction - Right Column', { x: 310, y: 760, size: 12, font: fontBold });
    page.drawText('Digital document processing has evolved dramatically.', {
      x: 310,
      y: 740,
      size: 10,
      font
    });
    page.drawText('WebAssembly execution offers native-level throughput.', {
      x: 310,
      y: 725,
      size: 10,
      font
    });
    page.drawText('Client-side rendering preserves total user privacy.', {
      x: 310,
      y: 710,
      size: 10,
      font
    });
    fs.writeFileSync(path.join(dir, '02_two_column_article.pdf'), await doc.save());
  }

  // 3. Image-heavy brochure
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([600, 400]);
    // Create simple 1x1 or 4x4 PNG buffer:
    // Minimal valid PNG 2x2 with red/blue pixels
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2P8z8Dwn4GBgYGRgQEAAg8BAfG/7gYAAAAASUVORK5CYII=';
    const pngBytes = Buffer.from(pngBase64, 'base64');
    const image = await doc.embedPng(pngBytes);
    page.drawText('Product Catalogue 2026', {
      x: 40,
      y: 360,
      size: 22,
      font,
      color: rgb(0, 0.4, 0.8)
    });
    page.drawImage(image, { x: 40, y: 100, width: 220, height: 220 });
    page.drawImage(image, { x: 320, y: 100, width: 220, height: 220 });
    fs.writeFileSync(path.join(dir, '03_image_brochure.pdf'), await doc.save());
  }

  // 4. Scanned document (clean)
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Courier);
    const page = doc.addPage([595.28, 841.89]);
    page.drawText('INVOICE #98213 - VERIFIED SCAN', {
      x: 50,
      y: 780,
      size: 14,
      font,
      color: rgb(0.1, 0.1, 0.1)
    });
    page.drawText('BILL TO: Acme Corp Technologies Inc.', { x: 50, y: 750, size: 11, font });
    page.drawText('DATE: 2026-11-09   DUE: Upon Receipt', { x: 50, y: 730, size: 11, font });
    page.drawText('ITEM 1: Client Software License ($1,200.00)', { x: 50, y: 700, size: 11, font });
    page.drawText('ITEM 2: Maintenance & Technical Support ($300.00)', {
      x: 50,
      y: 680,
      size: 11,
      font
    });
    page.drawText('TOTAL BALANCE DUE: $1,500.00 USD', { x: 50, y: 650, size: 12, font });
    fs.writeFileSync(path.join(dir, '04_scanned_clean.pdf'), await doc.save());
  }

  // 5. Scanned document (skewed/noisy)
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.CourierOblique);
    const page = doc.addPage([595.28, 841.89]);
    page.drawText('RECEIPT #4019 - GAS & ELECTRICITY', {
      x: 60,
      y: 770,
      size: 12,
      font,
      rotate: degrees(-1.5)
    });
    page.drawText('METER READ: 492019 kWh   RATE: 0.145/kWh', {
      x: 60,
      y: 740,
      size: 10,
      font,
      rotate: degrees(-1.5)
    });
    page.drawText('SUBTOTAL: $84.20  TAX: $6.74  TOTAL: $90.94', {
      x: 60,
      y: 710,
      size: 10,
      font,
      rotate: degrees(-1.5)
    });
    fs.writeFileSync(path.join(dir, '05_scanned_skewed.pdf'), await doc.save());
  }

  // 6. Password-protected
  // Handled specifically in Spike 0.12 or via test generator
  {
    // Minimal standard PDF
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([400, 300]);
    page.drawText('Confidential Protected File', { x: 40, y: 250, size: 16, font });
    page.drawText('This file is for authorized eyes only.', { x: 40, y: 220, size: 12, font });
    fs.writeFileSync(path.join(dir, '06_standard_before_encrypt.pdf'), await doc.save());
  }

  // 7. Arabic / Hebrew / RTL placeholder
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([500, 400]);
    page.drawText('RTL Text Test Document', { x: 50, y: 350, size: 16, font });
    page.drawText('Arabic & Hebrew shaping fixture', { x: 50, y: 320, size: 12, font });
    fs.writeFileSync(path.join(dir, '07_arabic_hebrew_rtl.pdf'), await doc.save());
  }

  // 8. CJK document
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([500, 400]);
    page.drawText('CJK Document Fixture', { x: 50, y: 350, size: 16, font });
    page.drawText('Chinese, Japanese, Korean unicode text tests', {
      x: 50,
      y: 320,
      size: 12,
      font
    });
    fs.writeFileSync(path.join(dir, '08_cjk.pdf'), await doc.save());
  }

  // 9. Form with fields (AcroForm)
  {
    const doc = await PDFDocument.create();
    const form = doc.getForm();
    const page = doc.addPage([500, 400]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('User Registration Form', { x: 50, y: 350, size: 16, font });
    const nameField = form.createTextField('fullName');
    nameField.setText('Jane Doe');
    nameField.addToPage(page, { x: 50, y: 280, width: 200, height: 25 });
    const emailField = form.createTextField('emailAddress');
    emailField.setText('jane.doe@example.com');
    emailField.addToPage(page, { x: 50, y: 230, width: 200, height: 25 });
    fs.writeFileSync(path.join(dir, '09_acroform.pdf'), await doc.save());
  }

  // 10. Large multipage PDF (e.g. 100 pages)
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 1; i <= 100; i++) {
      const page = doc.addPage([500, 300]);
      page.drawText(`Page Number ${i} of 100`, { x: 50, y: 250, size: 14, font });
      page.drawText(`Large document test suite content for page index ${i}.`, {
        x: 50,
        y: 220,
        size: 10,
        font
      });
    }
    fs.writeFileSync(path.join(dir, '10_large_multipage.pdf'), await doc.save());
  }

  // 11. Rotated pages and unusual crop boxes
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const p1 = doc.addPage([600, 400]);
    p1.setRotation(degrees(90));
    p1.drawText('Rotated 90 degrees text', { x: 50, y: 350, size: 14, font });
    const p2 = doc.addPage([500, 500]);
    p2.setCropBox(50, 50, 400, 400);
    p2.drawText('Cropped area document', { x: 100, y: 400, size: 14, font });
    fs.writeFileSync(path.join(dir, '11_rotated_cropbox.pdf'), await doc.save());
  }

  // 12. Broken / truncated file
  {
    const valid = fs.readFileSync(path.join(dir, '01_text_single_column.pdf'));
    // Truncate halfway
    const broken = valid.subarray(0, Math.floor(valid.length / 3));
    fs.writeFileSync(path.join(dir, '12_corrupt_truncated.pdf'), broken);
  }

  // 13. Text converted to outlines + screenshot containing text
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 300]);
    // Draw vector path rectangle representing outline
    page.drawRectangle({
      x: 50,
      y: 200,
      width: 300,
      height: 50,
      color: rgb(0.9, 0.9, 0.9),
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 2
    });
    fs.writeFileSync(path.join(dir, '13_outlines_image_text.pdf'), await doc.save());
  }

  // 14. Subset-embedded font
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Courier);
    const page = doc.addPage([400, 300]);
    page.drawText('ABC Only Characters', { x: 50, y: 200, size: 14, font });
    fs.writeFileSync(path.join(dir, '14_subset_font.pdf'), await doc.save());
  }

  console.log('All fixtures created successfully!');
}

buildFixtures();
