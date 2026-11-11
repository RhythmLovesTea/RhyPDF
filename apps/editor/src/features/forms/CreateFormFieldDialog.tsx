import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@rhypdf/ui';
import type { FormFieldType, CreateFormFieldOptions, FormFieldOption } from '@rhypdf/edit-core';

export interface CreateFormFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pageIndex: number;
  onCreateField: (options: CreateFormFieldOptions) => void;
  defaultPosition?: { x: number; y: number };
}

export const CreateFormFieldDialog: React.FC<CreateFormFieldDialogProps> = ({
  isOpen,
  onClose,
  pageIndex,
  onCreateField,
  defaultPosition = { x: 100, y: 500 }
}) => {
  const { t } = useTranslation();
  const [type, setType] = useState<FormFieldType>('text');
  const [name, setName] = useState('');
  const [required, setRequired] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [optionsText, setOptionsText] = useState('Option 1, Option 2, Option 3');

  const handleCreate = () => {
    if (!name.trim()) return;

    let width = 180;
    let height = 24;
    let parsedOptions: FormFieldOption[] | undefined = undefined;

    if (type === 'checkbox' || type === 'radio') {
      width = 20;
      height = 20;
    } else if (type === 'dropdown') {
      width = 180;
      height = 26;
      parsedOptions = optionsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ label: s, value: s }));
    }

    onCreateField({
      pageIndex,
      type,
      name: name.trim().replace(/\s+/g, '_'),
      bounds: {
        left: defaultPosition.x,
        bottom: defaultPosition.y - height,
        right: defaultPosition.x + width,
        top: defaultPosition.y
      },
      defaultValue: type === 'checkbox' ? false : defaultValue,
      required,
      readOnly,
      options: parsedOptions
    });

    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={t('editor.forms.createFieldTitle', { defaultValue: 'Add Form Field' })}
    >
      <div
        data-testid="create-field-dialog"
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
            {t('editor.forms.fieldType', { defaultValue: 'Field Type' })}
          </label>
          <select
            data-testid="select-create-field-type"
            value={type}
            onChange={(e) => setType(e.target.value as FormFieldType)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 4,
              border: '1px solid var(--bg-border)',
              fontSize: 13
            }}
          >
            <option value="text">Text Field</option>
            <option value="checkbox">Checkbox</option>
            <option value="dropdown">Dropdown (Combo Box)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
            {t('editor.forms.fieldName', { defaultValue: 'Field Name (ID)' })}
          </label>
          <input
            data-testid="input-create-field-name"
            type="text"
            placeholder="e.g. employee_signature_date"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 4,
              border: '1px solid var(--bg-border)',
              fontSize: 13,
              boxSizing: 'border-box'
            }}
          />
        </div>

        {type === 'dropdown' && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              {t('editor.forms.optionsList', {
                defaultValue: 'Dropdown Options (comma-separated)'
              })}
            </label>
            <input
              data-testid="input-create-field-options"
              type="text"
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 4,
                border: '1px solid var(--bg-border)',
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        {type === 'text' && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              {t('editor.forms.defaultValue', { defaultValue: 'Default Value' })}
            </label>
            <input
              data-testid="input-create-field-default"
              type="text"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 4,
                border: '1px solid var(--bg-border)',
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 16 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            <input
              data-testid="checkbox-create-field-required"
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />
            <span>{t('editor.forms.requiredField', { defaultValue: 'Required Field' })}</span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            <input
              data-testid="checkbox-create-field-readonly"
              type="checkbox"
              checked={readOnly}
              onChange={(e) => setReadOnly(e.target.checked)}
            />
            <span>{t('editor.forms.readOnlyField', { defaultValue: 'Read Only' })}</span>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-secondary)',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            data-testid="btn-submit-create-field"
            onClick={handleCreate}
            disabled={!name.trim()}
            style={{
              padding: '6px 14px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: 'var(--bg-primary)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 12,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              opacity: name.trim() ? 1 : 0.5
            }}
          >
            {t('common.create', { defaultValue: 'Create Field' })}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
