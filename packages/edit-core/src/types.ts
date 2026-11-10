import type { Rect, PageObject } from '@rhypdf/pdf-model';

export interface SelectionState {
  pageIndex: number;
  selectedObjectIds: string[];
  selectionBounds?: Rect;
}

export interface EditCommand {
  readonly id: string;
  readonly name: string;
  readonly pageIndex: number;
  readonly timestamp: number;
  readonly approximateBytes?: number;
  apply(): Promise<void> | void;
  revert(): Promise<void> | void;
  mergeWith?(other: EditCommand): boolean;
  getSnapshot?(): unknown;
}

export type SnapGuideSource = 'page-center' | 'margin' | 'object-edge' | 'object-center';

export interface SnapGuide {
  readonly type: 'vertical' | 'horizontal';
  readonly position: number; // in PDF points
  readonly source: SnapGuideSource;
  readonly label?: string;
}

export interface SnapResult {
  readonly x: number;
  readonly y: number;
  readonly snappedX: boolean;
  readonly snappedY: boolean;
  readonly guides: SnapGuide[];
}

export interface HitTestResult {
  readonly topmost?: PageObject;
  readonly candidates: PageObject[];
}

export interface Checkpoint<T = unknown> {
  readonly id: string;
  readonly commandIndex: number;
  readonly timestamp: number;
  readonly state: T;
}

export type PageOperationType = 'insert' | 'delete' | 'rotate' | 'move';

export interface PageOperationParams {
  type: PageOperationType;
  pageIndex: number;
  targetIndex?: number;
  rotationDelta?: number;
  pageData?: Uint8Array;
}

export type EditSessionEventType =
  | 'command:executed'
  | 'command:undone'
  | 'command:redone'
  | 'selection:changed'
  | 'transaction:started'
  | 'transaction:committed'
  | 'transaction:rolledBack'
  | 'dirty:changed'
  | 'checkpoint:created';

export interface EditSessionEvent {
  type: EditSessionEventType;
  session: unknown;
  command?: EditCommand;
  checkpoint?: Checkpoint;
}
