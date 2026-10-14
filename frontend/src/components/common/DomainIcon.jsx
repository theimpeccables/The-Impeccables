import React from 'react';
import {
  Palette,
  Camera,
  Film,
  Layout,
  Feather,
  Sparkles,
  Mic,
  HelpCircle,
} from 'lucide-react';

const iconMap = {
  'creative-arts': Palette,
  Palette: Palette,
  photography: Camera,
  Camera: Camera,
  cinematics: Film,
  Film: Film,
  'graphic-design': Layout,
  Layout: Layout,
  'content-writing': Feather,
  Feather: Feather,
  'personality-dev': Sparkles,
  Sparkles: Sparkles,
  'open-mic': Mic,
  Mic: Mic,
};

export const DomainIcon = ({ nameOrSlug, className = 'w-5 h-5', ...props }) => {
  const IconComponent = iconMap[nameOrSlug] || HelpCircle;
  return <IconComponent className={className} {...props} />;
};

export default DomainIcon;
