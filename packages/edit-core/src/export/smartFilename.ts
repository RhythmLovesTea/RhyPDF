/**
 * Smart file name generator for downloaded copies and exports (Task 14.2).
 * Protects the original file by generating names like 'name-edited.pdf' or 'name-edited-1.pdf'.
 */
export function getSmartCopyFilename(originalName: string, suffix = '-edited'): string {
  if (!originalName || originalName.trim() === '') {
    return `document${suffix}.pdf`;
  }

  // Strip path if provided (Windows or Unix)
  const base = originalName.replace(/^.*[\\/]/, '');

  const hasPdfExt = /\.pdf$/i.test(base);
  const nameWithoutExt = hasPdfExt ? base.replace(/\.pdf$/i, '') : base;

  // Check if name already has the suffix or an indexed suffix like '-edited-1'
  const escapedSuffix = suffix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`^(.*?)${escapedSuffix}(?:-(\\d+))?$`, 'i');
  const match = nameWithoutExt.match(regex);

  if (match && match[1] !== undefined) {
    const rootName = match[1];
    const currentIndex = match[2] ? parseInt(match[2], 10) : 0;
    const nextIndex = currentIndex + 1;
    return `${rootName}${suffix}-${nextIndex}.pdf`;
  }

  return `${nameWithoutExt}${suffix}.pdf`;
}
