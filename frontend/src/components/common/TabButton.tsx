import React from 'react';

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  hasIndicator?: boolean;
}

const TabButton: React.FC<TabButtonProps> = ({
  isActive,
  onClick,
  children,
  hasIndicator = false
}) => {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        backgroundColor: isActive ? '#007bff' : '#f8f9fa',
        color: isActive ? 'white' : 'black',
        border: '1px solid #ccc',
        borderBottom: isActive ? '1px solid #007bff' : '1px solid #ccc',
        cursor: 'pointer',
        fontSize: '14px',
        borderRadius: '4px 4px 0 0'
      }}
    >
      {children} {hasIndicator && '✓'}
    </button>
  );
};

export default TabButton;