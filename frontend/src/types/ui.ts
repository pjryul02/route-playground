// UI-specific type definitions

export type ViewMode = 'json' | 'spreadsheet';
export type ActiveTab = 'input' | 'output';

export interface TabConfig {
  id: ActiveTab;
  label: string;
  hasIndicator?: boolean;
}

export interface ButtonStyle {
  padding: string;
  backgroundColor: string;
  color: string;
  border: string;
  borderRadius: string;
  cursor: string;
  fontSize: string;
  fontWeight?: string;
}

export interface PanelStyle {
  width?: string;
  height?: string;
  padding?: string;
  margin?: string;
  backgroundColor?: string;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
}

export interface RouteCardProps {
  route: any; // Will be properly typed once Route interface is imported
  index: number;
  isSelected: boolean;
  onSelect: (routeId: number | null) => void;
  onExport: (route: any, index: number) => void;
}

export interface ExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'info';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  title?: string;
}