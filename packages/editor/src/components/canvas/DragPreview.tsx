import React from 'react';
import { ComponentInstance } from '@oldworldcharm/shared';

export interface DragPreviewProps {
  component: ComponentInstance;
}

export function DragPreview({ component }: DragPreviewProps) {
  return (
    <div className="bg-white border-2 border-blue-500 rounded-lg shadow-lg p-3 opacity-90 max-w-xs">
      <div className="flex items-center space-x-2">
        {/* Component icon */}
        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
          <ComponentIcon type={component.type} />
        </div>
        
        {/* Component info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {getDisplayName(component.type)}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {component.type}
          </div>
        </div>
      </div>
      
      {/* Preview content */}
      <div className="mt-2 text-xs text-gray-600">
        {getPreviewText(component)}
      </div>
    </div>
  );
}

function ComponentIcon({ type }: { type: string }) {
  const iconClass = "w-4 h-4 text-blue-600";
  
  switch (type.toLowerCase()) {
    case 'button':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
        </svg>
      );
      
    case 'text':
    case 'paragraph':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      );
      
    case 'heading':
    case 'h1':
    case 'h2':
    case 'h3':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      );
      
    case 'image':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
      
    case 'card':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
      
    case 'container':
    case 'div':
    case 'section':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
      
    case 'input':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
      
    case 'link':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
      
    case 'list':
    case 'ul':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      );
      
    default:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
  }
}

function getDisplayName(type: string): string {
  const displayNames: Record<string, string> = {
    'button': 'Button',
    'text': 'Text',
    'paragraph': 'Paragraph',
    'heading': 'Heading',
    'h1': 'Heading 1',
    'h2': 'Heading 2',
    'h3': 'Heading 3',
    'image': 'Image',
    'card': 'Card',
    'container': 'Container',
    'div': 'Div',
    'section': 'Section',
    'input': 'Input',
    'textarea': 'Textarea',
    'select': 'Select',
    'link': 'Link',
    'list': 'List',
    'ul': 'Unordered List',
    'spacer': 'Spacer',
  };
  
  return displayNames[type.toLowerCase()] || type;
}

function getPreviewText(component: ComponentInstance): string {
  const { type, props } = component;
  
  switch (type.toLowerCase()) {
    case 'button':
      return String(props.children || props.text || 'Button');
      
    case 'text':
    case 'paragraph':
      const text = props.children || props.text;
      if (typeof text === 'string') {
        return text.length > 30 ? `${text.substring(0, 30)}...` : text;
      }
      return 'Text content';
      
    case 'heading':
    case 'h1':
    case 'h2':
    case 'h3':
      return String(props.children || props.text || 'Heading');
      
    case 'image':
      return String(props.alt || props.src || 'Image');
      
    case 'card':
      return String(props.title || 'Card');
      
    case 'input':
      return String(props.placeholder || `${props.type || 'text'} input`);
      
    case 'link':
      return String(props.children || props.text || props.href || 'Link');
      
    case 'container':
    case 'div':
    case 'section':
      const childCount = component.children?.length || 0;
      return childCount > 0 ? `${childCount} child${childCount === 1 ? '' : 'ren'}` : 'Empty container';
      
    default:
      return `${type} component`;
  }
}