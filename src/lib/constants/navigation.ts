export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
      { id: 'chat', label: 'Chat', href: '/chat', icon: 'MessageSquare' },
    ],
  },
  {
    label: 'Workspaces',
    items: [
      { id: 'xtich', label: 'XTICH', href: '/workspaces/xtich', icon: 'Building2' },
      { id: 'college', label: 'College', href: '/workspaces/college', icon: 'GraduationCap' },
      { id: 'build', label: 'Build', href: '/workspaces/build', icon: 'Code2' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'agents', label: 'Agents', href: '/agents', icon: 'Bot' },
      { id: 'projects', label: 'Projects', href: '/projects', icon: 'FolderKanban' },
      { id: 'tasks', label: 'Tasks', href: '/tasks', icon: 'CheckSquare' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'files', label: 'Files', href: '/files', icon: 'Files' },
      { id: 'integrations', label: 'Integrations', href: '/integrations', icon: 'Plug' },
      { id: 'settings', label: 'Settings', href: '/settings', icon: 'Settings' },
    ],
  },
];
