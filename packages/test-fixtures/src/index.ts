/**
 * @rhypdf/test-fixtures
 * Sample PDF fixtures metadata and test constants.
 */

export interface FixtureInfo {
  filename: string;
  description: string;
  features: string[];
  pageCount: number;
  hasPassword?: boolean;
  password?: string;
}

export const SAMPLE_FIXTURES: Record<string, FixtureInfo> = {
  '01_text_single_column': {
    filename: '01_text_single_column.pdf',
    description: 'Single-column contract agreement with standard fonts',
    features: ['Helvetica', 'Times-Roman', 'Coupons', 'Contract'],
    pageCount: 1
  },
  '02_two_column_article': {
    filename: '02_two_column_article.pdf',
    description: 'Academic style two-column article with headers and body',
    features: ['Multi-column', 'Times-Bold', 'Helvetica-Oblique'],
    pageCount: 1
  },
  '03_image_brochure': {
    filename: '03_image_brochure.pdf',
    description: 'Brochure with vector shapes and image elements',
    features: ['Images', 'Vector Shapes', 'Courier'],
    pageCount: 1
  },
  '04_form_tax': {
    filename: '04_form_tax.pdf',
    description: 'Tax document layout with form fields and tables',
    features: ['Forms', 'Tables', 'Lines'],
    pageCount: 1
  },
  '05_cjk_presentation': {
    filename: '05_cjk_presentation.pdf',
    description: 'CJK presentation slides with Tokyo/Beijing headers',
    features: ['CJK', 'Unicode', 'Landscape'],
    pageCount: 1
  },
  '06_complex_shaped': {
    filename: '06_complex_shaped.pdf',
    description: 'Complex scripts with Arabic RTL and Hindi Devanagari ligatures',
    features: ['Arabic', 'Devanagari', 'RTL', 'HarfBuzz'],
    pageCount: 1
  },
  '07_scanned_ocr_clean': {
    filename: '07_scanned_ocr_clean.pdf',
    description: 'Clean scanned document invoice for OCR benchmarking',
    features: ['OCR', 'Invoice', 'High contrast'],
    pageCount: 1
  },
  '08_scanned_ocr_skewed': {
    filename: '08_scanned_ocr_skewed.pdf',
    description: 'Skewed scanned page with slight noise',
    features: ['OCR', 'Skewed', 'Noise'],
    pageCount: 1
  },
  '09_encrypted_userpass': {
    filename: '09_encrypted_userpass.pdf',
    description: 'Password encrypted PDF with Standard 128-bit security',
    features: ['Encrypted', 'Security'],
    pageCount: 1,
    hasPassword: true,
    password: 'secretpassword123'
  },
  '10_large_multipage': {
    filename: '10_large_multipage.pdf',
    description: '100-page document for memory and heap benchmarking',
    features: ['Multipage', '100 pages', 'Memory test'],
    pageCount: 100
  },
  '11_rotated_cropbox': {
    filename: '11_rotated_cropbox.pdf',
    description: 'Document with 90 degree page rotation and explicit crop box',
    features: ['Rotation 90', 'CropBox'],
    pageCount: 1
  },
  '12_embedded_subset_fonts': {
    filename: '12_embedded_subset_fonts.pdf',
    description: 'Document with font subsetting tags',
    features: ['Subset fonts', 'ABCDEF+Helvetica'],
    pageCount: 1
  },
  '13_drawing_annotations': {
    filename: '13_drawing_annotations.pdf',
    description: 'Drawings, highlight annotations, and paths',
    features: ['Annotations', 'Highlights', 'Vectors'],
    pageCount: 1
  },
  '14_transparent_png_overlay': {
    filename: '14_transparent_png_overlay.pdf',
    description: 'Document containing RGBA transparent PNG images',
    features: ['PNG', 'Alpha transparency'],
    pageCount: 1
  }
};
