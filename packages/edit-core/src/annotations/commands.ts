import type { AnnotationObject } from '@rhypdf/pdf-model';
import type { EditCommand } from '../types';

export class AddAnnotationCommand implements EditCommand {
  public readonly id = `cmd-add-annot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Add Annotation';
  public readonly timestamp = Date.now();

  constructor(
    public readonly pageIndex: number,
    public readonly annotation: AnnotationObject,
    private readonly annotationsList: AnnotationObject[],
    private readonly onStateChanged?: () => void
  ) {}

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

export class UpdateAnnotationCommand implements EditCommand {
  public readonly id = `cmd-update-annot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Update Annotation';
  public readonly timestamp = Date.now();
  private readonly previousState: Partial<AnnotationObject>;

  constructor(
    public readonly pageIndex: number,
    public readonly annotationId: string,
    public readonly updates: Partial<AnnotationObject>,
    private readonly annotationsList: AnnotationObject[],
    private readonly onStateChanged?: () => void
  ) {
    const existing = this.annotationsList.find((a) => a.id === annotationId);
    this.previousState = existing ? { ...existing } : {};
  }

  apply(): void {
    const existing = this.annotationsList.find((a) => a.id === this.annotationId);
    if (existing) {
      Object.assign(existing, this.updates);
      this.onStateChanged?.();
    }
  }

  revert(): void {
    const existing = this.annotationsList.find((a) => a.id === this.annotationId);
    if (existing) {
      Object.assign(existing, this.previousState);
      this.onStateChanged?.();
    }
  }
}

export class DeleteAnnotationCommand implements EditCommand {
  public readonly id = `cmd-del-annot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Delete Annotation';
  public readonly timestamp = Date.now();
  private removedIndex = -1;
  private removedAnnotation?: AnnotationObject;

  constructor(
    public readonly pageIndex: number,
    public readonly annotationId: string,
    private readonly annotationsList: AnnotationObject[],
    private readonly onStateChanged?: () => void
  ) {}

  apply(): void {
    this.removedIndex = this.annotationsList.findIndex((a) => a.id === this.annotationId);
    if (this.removedIndex !== -1) {
      this.removedAnnotation = this.annotationsList[this.removedIndex];
      this.annotationsList.splice(this.removedIndex, 1);
      this.onStateChanged?.();
    }
  }

  revert(): void {
    if (this.removedAnnotation && this.removedIndex !== -1) {
      this.annotationsList.splice(this.removedIndex, 0, this.removedAnnotation);
      this.onStateChanged?.();
    }
  }
}
