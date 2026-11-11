import React from 'react';
import type { AcroFormField } from '@rhypdf/edit-core';
import type { RotationAngle } from '@rhypdf/pdf-model';
import { CoordinateMapper } from '@rhypdf/pdf-model';

export interface AcroFormOverlayProps {
  pageWidthPt: number;
  pageHeightPt: number;
  rotation?: RotationAngle;
  scale?: number;
  fields: AcroFormField[];
  onFieldValueChange: (fieldId: string, value: string | boolean | string[]) => void;
  onFieldFocus?: (fieldId: string) => void;
  isReadOnly?: boolean;
}

export const AcroFormOverlay: React.FC<AcroFormOverlayProps> = ({
  pageWidthPt,
  pageHeightPt,
  rotation = 0,
  scale = 1.0,
  fields,
  onFieldValueChange,
  onFieldFocus,
  isReadOnly = false
}) => {
  const mapper = new CoordinateMapper(pageWidthPt, pageHeightPt, rotation, scale);
  const cssWidth = mapper.effectiveWidthPt * scale;
  const cssHeight = mapper.effectiveHeightPt * scale;

  return (
    <div
      data-testid="acro-form-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: cssWidth,
        height: cssHeight,
        pointerEvents: 'none',
        zIndex: 250
      }}
    >
      {fields.map((field) => {
        const topLeft = mapper.pdfPointToCss(field.bounds.left, field.bounds.top);
        const fWidth = (field.bounds.right - field.bounds.left) * scale;
        const fHeight = (field.bounds.top - field.bounds.bottom) * scale;

        const isFieldReadOnly = isReadOnly || field.readOnly;
        const isRequiredEmpty =
          field.required &&
          (field.value === '' ||
            field.value === false ||
            (Array.isArray(field.value) && field.value.length === 0));

        const baseStyle: React.CSSProperties = {
          position: 'absolute',
          left: topLeft.x,
          top: topLeft.y,
          width: Math.max(fWidth, 16),
          height: Math.max(fHeight, 16),
          pointerEvents: isFieldReadOnly ? 'none' : 'auto',
          boxSizing: 'border-box',
          backgroundColor: isFieldReadOnly ? 'transparent' : 'rgba(238, 242, 255, 0.45)', // subtle indigo tint
          border: isRequiredEmpty
            ? '1.5px solid #ef4444' // red outline for empty required
            : '1px solid rgba(99, 102, 241, 0.5)',
          borderRadius: 2,
          fontSize: Math.max(Math.min(fHeight * 0.7, 14), 10),
          fontFamily: 'Helvetica, Arial, sans-serif',
          color: '#0f172a',
          outline: 'none',
          transition: 'background-color 120ms ease, border-color 120ms ease'
        };

        if (field.type === 'checkbox') {
          return (
            <input
              key={field.id}
              data-testid={`form-checkbox-${field.name}`}
              type="checkbox"
              tabIndex={field.tabOrder}
              disabled={isFieldReadOnly}
              checked={Boolean(field.value)}
              onChange={(e) => onFieldValueChange(field.id, e.target.checked)}
              onFocus={() => onFieldFocus?.(field.id)}
              style={{
                ...baseStyle,
                width: Math.max(fWidth, 16),
                height: Math.max(fHeight, 16),
                cursor: isFieldReadOnly ? 'default' : 'pointer',
                accentColor: 'var(--bg-primary)'
              }}
            />
          );
        }

        if (field.type === 'radio') {
          return (
            <input
              key={field.id}
              data-testid={`form-radio-${field.name}`}
              type="radio"
              name={field.groupName ?? field.name}
              tabIndex={field.tabOrder}
              disabled={isFieldReadOnly}
              checked={Boolean(field.value)}
              onChange={(e) => onFieldValueChange(field.id, e.target.checked)}
              onFocus={() => onFieldFocus?.(field.id)}
              style={{
                ...baseStyle,
                width: Math.max(fWidth, 16),
                height: Math.max(fHeight, 16),
                cursor: isFieldReadOnly ? 'default' : 'pointer',
                accentColor: 'var(--bg-primary)'
              }}
            />
          );
        }

        if (field.type === 'dropdown' || field.type === 'list') {
          return (
            <select
              key={field.id}
              data-testid={`form-select-${field.name}`}
              tabIndex={field.tabOrder}
              disabled={isFieldReadOnly}
              value={String(field.value || '')}
              onChange={(e) => onFieldValueChange(field.id, e.target.value)}
              onFocus={() => onFieldFocus?.(field.id)}
              style={{
                ...baseStyle,
                padding: '1px 4px',
                cursor: isFieldReadOnly ? 'default' : 'pointer'
              }}
            >
              <option value="">-- Select --</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        }

        // Text field or multiline textarea
        const isMultiLine = fHeight > 36;
        if (isMultiLine) {
          return (
            <textarea
              key={field.id}
              data-testid={`form-textarea-${field.name}`}
              tabIndex={field.tabOrder}
              disabled={isFieldReadOnly}
              value={String(field.value || '')}
              onChange={(e) => onFieldValueChange(field.id, e.target.value)}
              onFocus={() => onFieldFocus?.(field.id)}
              rows={3}
              style={{
                ...baseStyle,
                padding: '2px 4px',
                resize: 'none'
              }}
            />
          );
        }

        return (
          <input
            key={field.id}
            data-testid={`form-input-${field.name}`}
            type="text"
            tabIndex={field.tabOrder}
            disabled={isFieldReadOnly}
            value={String(field.value || '')}
            onChange={(e) => onFieldValueChange(field.id, e.target.value)}
            onFocus={() => onFieldFocus?.(field.id)}
            style={{
              ...baseStyle,
              padding: '0 4px'
            }}
          />
        );
      })}
    </div>
  );
};
