import React, { useState } from 'react';

export interface PropertyGroupProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export function PropertyGroup({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className = '',
}: PropertyGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleToggle = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className={`property-group ${className}`}>
      <div
        className={`flex items-center justify-between py-2 border-b border-gray-200 ${
          collapsible ? 'cursor-pointer hover:bg-gray-50' : ''
        }`}
        onClick={handleToggle}
      >
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {collapsible && (
          <button
            type="button"
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
          >
            <svg
              className={`w-4 h-4 transform transition-transform ${
                isCollapsed ? 'rotate-0' : 'rotate-90'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>

      {(!collapsible || !isCollapsed) && (
        <div className="pt-3">
          {children}
        </div>
      )}
    </div>
  );
}