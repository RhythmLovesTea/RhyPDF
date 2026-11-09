/**
 * @rhypdf/edit-core
 * EditSession, EditCommand, undo/redo history, and selection model.
 */

import type { Rect } from '@rhypdf/pdf-model';

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
  apply(): Promise<void> | void;
  revert(): Promise<void> | void;
}

export type EditSessionListener = (session: EditSession) => void;

export class EditSession {
  private undoStack: EditCommand[] = [];
  private redoStack: EditCommand[] = [];
  private _isDirty = false;
  private _selection: SelectionState = {
    pageIndex: 0,
    selectedObjectIds: []
  };
  private listeners: Set<EditSessionListener> = new Set();

  constructor(
    public readonly documentId: string,
    public readonly initialPageCount: number
  ) {}

  get isDirty(): boolean {
    return this._isDirty;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get selection(): SelectionState {
    return this._selection;
  }

  setSelection(selection: SelectionState): void {
    this._selection = selection;
    this.notify();
  }

  selectObject(pageIndex: number, objectId: string): void {
    this._selection = {
      pageIndex,
      selectedObjectIds: [objectId]
    };
    this.notify();
  }

  clearSelection(): void {
    this._selection = {
      pageIndex: this._selection.pageIndex,
      selectedObjectIds: []
    };
    this.notify();
  }

  async execute(command: EditCommand): Promise<void> {
    await command.apply();
    this.undoStack.push(command);
    this.redoStack = [];
    this._isDirty = true;
    this.notify();
  }

  async undo(): Promise<boolean> {
    const command = this.undoStack.pop();
    if (!command) return false;
    await command.revert();
    this.redoStack.push(command);
    if (this.undoStack.length === 0) {
      this._isDirty = false;
    }
    this.notify();
    return true;
  }

  async redo(): Promise<boolean> {
    const command = this.redoStack.pop();
    if (!command) return false;
    await command.apply();
    this.undoStack.push(command);
    this._isDirty = true;
    this.notify();
    return true;
  }

  subscribe(listener: EditSessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this);
    }
  }
}
