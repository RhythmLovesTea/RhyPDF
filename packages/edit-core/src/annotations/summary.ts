import type { AnnotationObject } from '@rhypdf/pdf-model';
import type {
  AnnotationSummaryFormat,
  AnnotationSummaryReport,
  AnnotationSummaryItem
} from './types';

/**
 * Generates a structured summary report of annotations across a document.
 */
export function generateAnnotationSummary(
  annotationsByPage: Map<number, AnnotationObject[]> | AnnotationObject[][],
  format: AnnotationSummaryFormat = 'markdown'
): AnnotationSummaryReport {
  const items: AnnotationSummaryItem[] = [];
  const byType: Record<string, number> = {};
  const pagesWithAnnotations: number[] = [];

  const getEntries = (): [number, AnnotationObject[]][] => {
    if (annotationsByPage instanceof Map) {
      return Array.from(annotationsByPage.entries());
    }
    return annotationsByPage.map((arr, i) => [i, arr] as [number, AnnotationObject[]]);
  };

  const entries = getEntries().sort(([a], [b]) => a - b);

  for (const [pageIndex, annots] of entries) {
    if (!annots || annots.length === 0) continue;
    pagesWithAnnotations.push(pageIndex);

    for (const a of annots) {
      const type = a.subType ?? 'Annotation';
      byType[type] = (byType[type] ?? 0) + 1;

      items.push({
        id: a.id,
        pageIndex,
        type,
        author: a.author ?? 'Anonymous',
        createdAt: a.createdAt ?? new Date().toISOString(),
        contents: a.contents,
        highlightedText: a.customText,
        rect: { ...a.bounds }
      });
    }
  }

  const totalAnnotations = items.length;

  let content = '';

  if (format === 'json') {
    content = JSON.stringify(
      {
        totalAnnotations,
        byType,
        pagesWithAnnotations,
        exportedAt: new Date().toISOString(),
        items
      },
      null,
      2
    );
  } else if (format === 'markdown') {
    const lines: string[] = [];
    lines.push('# Document Annotation Summary');
    lines.push('');
    lines.push(`- **Total Annotations:** ${totalAnnotations}`);
    lines.push(`- **Exported At:** ${new Date().toLocaleString()}`);
    lines.push('- **Breakdown:**');
    for (const [t, count] of Object.entries(byType)) {
      lines.push(`  - ${t}: ${count}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    let currentPage = -1;
    for (const item of items) {
      if (item.pageIndex !== currentPage) {
        currentPage = item.pageIndex;
        lines.push(`## Page ${currentPage + 1}`);
        lines.push('');
      }

      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';
      lines.push(`### [${item.type}] by ${item.author} ${dateStr ? `(${dateStr})` : ''}`);

      if (item.highlightedText) {
        lines.push(`> "${item.highlightedText}"`);
        lines.push('');
      }
      if (item.contents) {
        lines.push(`**Comment:** ${item.contents}`);
        lines.push('');
      }
      lines.push(
        `*Location: [${Math.round(item.rect.left)}, ${Math.round(item.rect.bottom)}] to [${Math.round(item.rect.right)}, ${Math.round(item.rect.top)}]*`
      );
      lines.push('');
    }

    content = lines.join('\n');
  } else {
    // Plain text
    const lines: string[] = [];
    lines.push('DOCUMENT ANNOTATION SUMMARY');
    lines.push('===========================');
    lines.push(`Total Annotations: ${totalAnnotations}`);
    lines.push('');

    let currentPage = -1;
    for (const item of items) {
      if (item.pageIndex !== currentPage) {
        currentPage = item.pageIndex;
        lines.push(`--- PAGE ${currentPage + 1} ---`);
      }
      lines.push(`Type: ${item.type} | Author: ${item.author}`);
      if (item.highlightedText) {
        lines.push(`Quoted text: "${item.highlightedText}"`);
      }
      if (item.contents) {
        lines.push(`Comment: ${item.contents}`);
      }
      lines.push('');
    }

    content = lines.join('\n');
  }

  return {
    totalAnnotations,
    byType,
    pagesWithAnnotations,
    content,
    items
  };
}
