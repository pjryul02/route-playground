import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'info';
type ButtonSize = 'small' | 'medium' | 'large';

interface ExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  title?: string;
  icon?: string;
}

const getVariantStyles = (variant: ButtonVariant) => {
  const variants = {
    primary: { backgroundColor: '#007bff', color: 'white' },
    secondary: { backgroundColor: '#6c757d', color: 'white' },
    success: { backgroundColor: '#28a745', color: 'white' },
    danger: { backgroundColor: '#dc3545', color: 'white' },
    info: { backgroundColor: '#17a2b8', color: 'white' }
  };
  return variants[variant];
};

const getSizeStyles = (size: ButtonSize) => {
  const sizes = {
    small: { padding: '6px 8px', fontSize: '11px' },
    medium: { padding: '8px 16px', fontSize: '12px' },
    large: { padding: '12px 24px', fontSize: '16px' }
  };
  return sizes[size];
};

const ExportButton: React.FC<ExportButtonProps> = ({
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  children,
  title,
  icon
}) => {
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...variantStyles,
        ...sizeStyles,
        backgroundColor: disabled ? '#6c757d' : variantStyles.backgroundColor,
        border: 'none',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: variant === 'success' ? 'bold' : 'normal',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

export default ExportButton;