export * from './mockData';
export * from './theme';

export const APP_CONFIG = {
  name: 'The Impeccables',
  fullName: 'The Impeccables Cultural Society',
  tagline: 'Impeccable Minds. Limitless Creativity.',
  university: 'KIET Group of Institutions (Deemed to be University)',
  location: 'Delhi-NCR, Ghaziabad, UP 201206',
  email: 'contact@theimpeccables.org',
};

export const ROLES = {
  PUBLIC: 'public',
  MEMBER: 'member',
  DOMAIN_ADMIN: 'domain_admin',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const NAV_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Domains', path: '/domains' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'Events', path: '/events' },
  { name: 'Team', path: '/team' },
];

export const MEDIA_TYPES = [
  { label: 'All', value: 'all' },
  { label: 'Events', value: 'Events' },
  { label: 'Performances', value: 'Performances' },
  { label: 'Behind the Scenes', value: 'Behind the Scenes' },
  { label: 'Creations', value: 'Creations' },
];
