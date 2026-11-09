import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const IconButton: React.FC<IconButtonProps> = ({
  size = 'md',
  variant = 'ghost',
  style,
  children,
  ...props
}) => {
  const sizeMap: Record<string, number> = {
    sm: 28,
    md: 36,
    lg: 44
  };

  const dim = sizeMap[size] ?? 36;

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
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--bg-foreground)',
      border: 'none'
    }
  };

  return (
    <button
      style={{
        width: dim,
        height: dim,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        padding: 0,
        ...variantStyles[variant],
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
};
