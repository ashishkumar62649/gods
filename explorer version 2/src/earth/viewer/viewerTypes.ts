export type SidebarSection = 'base' | 'intel' | 'infrastructure' | 'visual' | 'system';

export interface ImageryOption {
  id: string;
  name: string;
  tooltip: string;
  iconUrl: string;
  create: () => unknown;
}
