import React from 'react';

export interface SwitchProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Switch: React.FC<SwitchProps> = ({ label, checked, onChange }) => {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 'var(--radius-full)',
          backgroundColor: checked ? 'var(--bg-primary)' : 'var(--bg-border)',
          position: 'relative',
          transition: 'background-color 0.2s ease'
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 'var(--radius-full)',
            backgroundColor: '#ffffff',
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            transition: 'left 0.2s ease',
            boxShadow: 'var(--shadow-sm)'
          }}
        />
      </div>
      {label && (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--bg-foreground)' }}>{label}</span>
      )}
    </label>
  );
};
