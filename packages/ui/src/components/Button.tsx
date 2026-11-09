import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  style,
  children,
  ...props
}) => {
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '4px 8px', fontSize: 'var(--text-xs)' },
    md: { padding: '8px 16px', fontSize: 'var(--text-sm)' },
    lg: { padding: '12px 24px', fontSize: 'var(--text-base)' }
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--bg-primary-foreground)',
      border: 'none'
    },
    secondary: {
      backgroundColor: 'var(--bg-secondary)',
      color: 'var(--bg-secondary-foreground)',
      border: '1px solid var(--bg-border)'
    },
    destructive: {
      backgroundColor: 'var(--bg-destructive)',
      color: 'var(--bg-destructive-foreground)',
      border: 'none'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--bg-foreground)',
      border: 'none'
    }
  };

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 500,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
};
