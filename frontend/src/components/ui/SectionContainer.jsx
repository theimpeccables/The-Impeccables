import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

export const SectionContainer = ({
  children,
  className,
  as: Component = 'section',
  withBorder = false,
  ...props
}) => {
  return (
    <Component
      className={cn(
        'relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto',
        withBorder && 'border-t border-white/5',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

SectionContainer.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  as: PropTypes.elementType,
  withBorder: PropTypes.bool,
};

export default SectionContainer;
