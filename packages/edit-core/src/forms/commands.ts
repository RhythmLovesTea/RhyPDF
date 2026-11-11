import type { EditCommand } from '../types';
import type { AcroFormField, CreateFormFieldOptions } from './types';

export class SetFormFieldValueCommand implements EditCommand {
  public readonly id = `cmd-set-form-val-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Set Form Field Value';
  public readonly timestamp = Date.now();
  private readonly previousValue: string | boolean | string[];

  constructor(
    public readonly pageIndex: number,
    public readonly fieldId: string,
    public readonly newValue: string | boolean | string[],
    private readonly fieldsList: AcroFormField[],
    private readonly onStateChanged?: () => void
  ) {
    const existing = this.fieldsList.find((f) => f.id === fieldId);
    this.previousValue = existing ? existing.value : '';
  }

  apply(): void {
    const existing = this.fieldsList.find((f) => f.id === this.fieldId);
    if (existing) {
      existing.value = this.newValue;
      this.onStateChanged?.();
    }
  }

  revert(): void {
    const existing = this.fieldsList.find((f) => f.id === this.fieldId);
    if (existing) {
      existing.value = this.previousValue;
      this.onStateChanged?.();
    }
  }
}

export class CreateFormFieldCommand implements EditCommand {
  public readonly id = `cmd-create-field-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Create Form Field';
  public readonly timestamp = Date.now();
  public readonly field: AcroFormField;

  constructor(
    public readonly pageIndex: number,
    options: CreateFormFieldOptions,
    private readonly fieldsList: AcroFormField[],
    private readonly onStateChanged?: () => void
  ) {
    this.field = {
      id: `form-field-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pageIndex: options.pageIndex,
      bounds: { ...options.bounds },
      type: options.type,
      name: options.name,
      value: options.defaultValue ?? (options.type === 'checkbox' ? false : ''),
      defaultValue: options.defaultValue,
      required: options.required ?? false,
      readOnly: options.readOnly ?? false,
      options: options.options,
      tabOrder: this.fieldsList.length + 1
    };
  }

  apply(): void {
    const idx = this.fieldsList.findIndex((f) => f.id === this.field.id);
    if (idx === -1) {
      this.fieldsList.push(this.field);
    }
    this.onStateChanged?.();
  }

  revert(): void {
    const idx = this.fieldsList.findIndex((f) => f.id === this.field.id);
    if (idx !== -1) {
      this.fieldsList.splice(idx, 1);
    }
    this.onStateChanged?.();
  }
}

export class DeleteFormFieldCommand implements EditCommand {
  public readonly id = `cmd-del-field-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Delete Form Field';
  public readonly timestamp = Date.now();
  private removedIndex = -1;
  private removedField?: AcroFormField;

  constructor(
    public readonly pageIndex: number,
    public readonly fieldId: string,
    private readonly fieldsList: AcroFormField[],
    private readonly onStateChanged?: () => void
  ) {}

  apply(): void {
    this.removedIndex = this.fieldsList.findIndex((f) => f.id === this.fieldId);
    if (this.removedIndex !== -1) {
      this.removedField = this.fieldsList[this.removedIndex];
      this.fieldsList.splice(this.removedIndex, 1);
      this.onStateChanged?.();
    }
  }

  revert(): void {
    if (this.removedField && this.removedIndex !== -1) {
      this.fieldsList.splice(this.removedIndex, 0, this.removedField);
      this.onStateChanged?.();
    }
  }
}
