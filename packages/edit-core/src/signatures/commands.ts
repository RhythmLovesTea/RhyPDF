import type { AnnotationObject } from '@rhypdf/pdf-model';
import type { EditCommand } from '../types';
import type { SignatureInsertOptions } from './types';
import { DEFAULT_SIGNATURE_COLOR } from './quick-items';

export class InsertSignatureCommand implements EditCommand {
  public readonly id = `cmd-insert-sig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Insert Signature';
  public readonly timestamp = Date.now();
  public readonly annotation: AnnotationObject;

  constructor(
    public readonly pageIndex: number,
    options: SignatureInsertOptions,
    private readonly annotationsList: AnnotationObject[],
    private readonly onStateChanged?: () => void
  ) {
    this.annotation = {
      id: `annot-sig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'annotation',
      subType: 'Signature',
      signatureType: options.mode,
      signatureData: options.data,
      signerName: options.mode === 'type' ? options.data : undefined,
      bounds: { ...options.bounds },
      matrix: [1, 0, 0, 1, 0, 0],
      zIndex: options.zIndex ?? 110,
      color: options.color ?? DEFAULT_SIGNATURE_COLOR,
      rotation: options.rotation ?? 0,
      author: options.author ?? 'User',
      createdAt: new Date().toISOString()
    };
  }

  apply(): void {
    const idx = this.annotationsList.findIndex((a) => a.id === this.annotation.id);
    if (idx === -1) {
      this.annotationsList.push(this.annotation);
    }
    this.onStateChanged?.();
  }

  revert(): void {
    const idx = this.annotationsList.findIndex((a) => a.id === this.annotation.id);
    if (idx !== -1) {
      this.annotationsList.splice(idx, 1);
    }
    this.onStateChanged?.();
  }
}
