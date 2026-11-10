import type { Rect } from '@rhypdf/pdf-model';
import type { EditCommand, SelectionState, Checkpoint, EditSessionEvent } from './types';
import { BatchCommand } from './commands';

export type EditSessionListener = (session: EditSession, event?: EditSessionEvent) => void;

export interface EditSessionOptions {
  maxHistoryDepth?: number;
  checkpointInterval?: number;
  workingCopyHandle?: unknown;
}

export class EditSession {
  private undoStack: EditCommand[] = [];
  private redoStack: EditCommand[] = [];
  private checkpoints: Checkpoint[] = [];
  private transactionStack: Array<{ name: string; commands: EditCommand[] }> = [];

  private _isDirty = false;
  private _workingCopyHandle: unknown;
  private _selection: SelectionState = {
    pageIndex: 0,
    selectedObjectIds: []
  };

  public readonly maxHistoryDepth: number;
  public readonly checkpointInterval: number;
  private listeners: Set<EditSessionListener> = new Set();

  constructor(
    public readonly documentId: string,
    public readonly initialPageCount: number,
    options: EditSessionOptions = {}
  ) {
    this.maxHistoryDepth = options.maxHistoryDepth ?? 100;
    this.checkpointInterval = options.checkpointInterval ?? 20;
    this._workingCopyHandle = options.workingCopyHandle;
  }

  get isDirty(): boolean {
    return this._isDirty;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoCount(): number {
    return this.undoStack.length;
  }

  get redoCount(): number {
    return this.redoStack.length;
  }

  get selection(): SelectionState {
    return this._selection;
  }

  get workingCopyHandle(): unknown {
    return this._workingCopyHandle;
  }

  setWorkingCopyHandle(handle: unknown): void {
    this._workingCopyHandle = handle;
  }

  markClean(): void {
    this._isDirty = false;
    this.emit({ type: 'dirty:changed', session: this });
  }

  // --- Selection Management ---

  setSelection(selection: SelectionState): void {
    this._selection = selection;
    this.emit({ type: 'selection:changed', session: this });
  }

  selectObject(pageIndex: number, objectId: string, bounds?: Rect): void {
    this._selection = {
      pageIndex,
      selectedObjectIds: [objectId],
      selectionBounds: bounds
    };
    this.emit({ type: 'selection:changed', session: this });
  }

  toggleSelectObject(pageIndex: number, objectId: string, bounds?: Rect): void {
    const current =
      this._selection.pageIndex === pageIndex ? [...this._selection.selectedObjectIds] : [];

    const index = current.indexOf(objectId);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(objectId);
    }

    this._selection = {
      pageIndex,
      selectedObjectIds: current,
      selectionBounds: bounds
    };
    this.emit({ type: 'selection:changed', session: this });
  }

  selectAll(pageIndex: number, objectIds: string[], bounds?: Rect): void {
    this._selection = {
      pageIndex,
      selectedObjectIds: [...objectIds],
      selectionBounds: bounds
    };
    this.emit({ type: 'selection:changed', session: this });
  }

  clearSelection(): void {
    this._selection = {
      pageIndex: this._selection.pageIndex,
      selectedObjectIds: [],
      selectionBounds: undefined
    };
    this.emit({ type: 'selection:changed', session: this });
  }

  // --- Transaction Grouping ---

  beginTransaction(name = 'Transaction'): void {
    this.transactionStack.push({ name, commands: [] });
    this.emit({ type: 'transaction:started', session: this });
  }

  commitTransaction(): void {
    const transaction = this.transactionStack.pop();
    if (!transaction) return;

    if (transaction.commands.length === 0) {
      return;
    }

    const batch: EditCommand =
      transaction.commands.length === 1 && transaction.commands[0]
        ? transaction.commands[0]
        : new BatchCommand(transaction.name, transaction.commands);

    if (this.transactionStack.length > 0) {
      // Nested transaction: add to parent
      const parent = this.transactionStack[this.transactionStack.length - 1];
      if (parent) {
        parent.commands.push(batch);
      }
    } else {
      // Top-level transaction: push onto undo stack
      this.pushUndoCommand(batch);
      this.redoStack = [];
      this._isDirty = true;
      this.checkCheckpointTrigger();
      this.emit({ type: 'transaction:committed', session: this, command: batch });
    }
  }

  async rollbackTransaction(): Promise<void> {
    const transaction = this.transactionStack.pop();
    if (!transaction) return;

    // Revert executed commands in reverse order
    for (let i = transaction.commands.length - 1; i >= 0; i--) {
      const cmd = transaction.commands[i];
      if (cmd) {
        await cmd.revert();
      }
    }

    this.emit({ type: 'transaction:rolledBack', session: this });
  }

  // --- Execution, Undo, and Redo ---

  async execute(command: EditCommand): Promise<void> {
    await command.apply();

    if (this.transactionStack.length > 0) {
      const current = this.transactionStack[this.transactionStack.length - 1];
      if (current) {
        current.commands.push(command);
      }
      return;
    }

    // Coalescing check (e.g. continuous typing or continuous dragging)
    const top = this.undoStack[this.undoStack.length - 1];
    if (top && typeof top.mergeWith === 'function' && top.mergeWith(command)) {
      this._isDirty = true;
      this.emit({ type: 'command:executed', session: this, command });
      return;
    }

    this.pushUndoCommand(command);
    this.redoStack = [];
    this._isDirty = true;

    this.checkCheckpointTrigger();
    this.emit({ type: 'command:executed', session: this, command });
  }

  async undo(): Promise<boolean> {
    const command = this.undoStack.pop();
    if (!command) return false;

    await command.revert();
    this.redoStack.push(command);

    if (this.undoStack.length === 0) {
      this._isDirty = false;
    }

    this.emit({ type: 'command:undone', session: this, command });
    return true;
  }

  async redo(): Promise<boolean> {
    const command = this.redoStack.pop();
    if (!command) return false;

    await command.apply();
    this.undoStack.push(command);
    this._isDirty = true;

    this.emit({ type: 'command:redone', session: this, command });
    return true;
  }

  // --- Checkpoints ---

  createCheckpoint(snapshotState?: unknown): Checkpoint {
    const checkpoint: Checkpoint = {
      id: `cp-${this.documentId}-${Date.now()}-${this.undoStack.length}`,
      commandIndex: this.undoStack.length,
      timestamp: Date.now(),
      state: snapshotState
    };
    this.checkpoints.push(checkpoint);

    // Keep up to 10 latest checkpoints in memory
    if (this.checkpoints.length > 10) {
      this.checkpoints.shift();
    }

    this.emit({ type: 'checkpoint:created', session: this, checkpoint });
    return checkpoint;
  }

  getLatestCheckpoint(): Checkpoint | undefined {
    return this.checkpoints[this.checkpoints.length - 1];
  }

  getCheckpoints(): readonly Checkpoint[] {
    return this.checkpoints;
  }

  private checkCheckpointTrigger(): void {
    if (
      this.checkpointInterval > 0 &&
      this.undoStack.length > 0 &&
      this.undoStack.length % this.checkpointInterval === 0
    ) {
      this.createCheckpoint();
    }
  }

  private pushUndoCommand(command: EditCommand): void {
    this.undoStack.push(command);

    // Cap history depth to bounded memory limit
    if (this.undoStack.length > this.maxHistoryDepth) {
      this.undoStack.shift();
    }
  }

  // --- Subscription & Events ---

  subscribe(listener: EditSessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: EditSessionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(this, event);
      } catch (err) {
        console.error('EditSession listener error:', err);
      }
    }
  }
}
