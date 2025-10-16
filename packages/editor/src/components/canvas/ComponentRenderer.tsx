import React from 'react';
import { ComponentInstance } from '@oldworldcharm/shared';

export interface ComponentRendererProps {
  component: ComponentInstance;
}

export function ComponentRenderer({ component }: ComponentRendererProps) {
  // This is a placeholder renderer that will be replaced with actual component rendering
  // In a real implementation, this would:
  // 1. Look up the component definition from the registry
  // 2. Dynamically import and render the actual React component
  // 3. Pass the props and children appropriately

  const renderPlaceholder = () => {
    const { type, props } = component;
    
    // Create a simple placeholder based on component type
    const getPlaceholderContent = () => {
      switch (type.toLowerCase()) {
        case 'button':
          return (
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              disabled
            >
              {String(props.children || props.text || 'Button')}
            </button>
          );
          
        case 'text':
        case 'paragraph':
          return (
            <p className="text-gray-800">
              {String(props.children || props.text || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')}
            </p>
          );
          
        case 'heading':
        case 'h1':
          return (
            <h1 className="text-3xl font-bold text-gray-900">
              {String(props.children || props.text || 'Heading 1')}
            </h1>
          );
          
        case 'h2':
          return (
            <h2 className="text-2xl font-semibold text-gray-900">
              {String(props.children || props.text || 'Heading 2')}
            </h2>
          );
          
        case 'h3':
          return (
            <h3 className="text-xl font-medium text-gray-900">
              {String(props.children || props.text || 'Heading 3')}
            </h3>
          );
          
        case 'image':
          return (
            <div className="bg-gray-200 border-2 border-dashed border-gray-400 rounded p-8 text-center">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-sm">Image Placeholder</div>
                {props.alt && <div className="text-xs mt-1">{String(props.alt)}</div>}
              </div>
            </div>
          );
          
        case 'card':
          return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <div className="text-lg font-semibold mb-2">
                {String(props.title || 'Card Title')}
              </div>
              <div className="text-gray-600">
                {String(props.description || 'Card description goes here. This is a placeholder for card content.')}
              </div>
            </div>
          );
          
        case 'container':
        case 'div':
          return (
            <div className="border border-dashed border-gray-300 rounded p-4 min-h-16">
              <div className="text-xs text-gray-500 mb-2">Container</div>
              {component.children && component.children.length > 0 ? (
                <div className="space-y-2">
                  {component.children.map(child => (
                    <ComponentRenderer key={child.id} component={child} />
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-sm italic">Empty container</div>
              )}
            </div>
          );
          
        case 'section':
          return (
            <section className="border border-dashed border-gray-300 rounded p-6 min-h-24">
              <div className="text-xs text-gray-500 mb-4">Section</div>
              {component.children && component.children.length > 0 ? (
                <div className="space-y-4">
                  {component.children.map(child => (
                    <ComponentRenderer key={child.id} component={child} />
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-sm italic">Empty section</div>
              )}
            </section>
          );
          
        case 'input':
          return (
            <input
              type={props.type as string || 'text'}
              placeholder={props.placeholder as string || 'Enter text...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled
            />
          );
          
        case 'textarea':
          return (
            <textarea
              placeholder={props.placeholder as string || 'Enter text...'}
              rows={props.rows as number || 3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled
            />
          );
          
        case 'select':
          return (
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled>
              <option>{props.placeholder as string || 'Select an option...'}</option>
            </select>
          );
          
        case 'link':
          return (
            <a 
              href="#" 
              className="text-blue-600 hover:text-blue-800 underline"
              onClick={(e) => e.preventDefault()}
            >
              {String(props.children || props.text || 'Link Text')}
            </a>
          );
          
        case 'list':
        case 'ul':
          return (
            <ul className="list-disc list-inside space-y-1">
              {props.items ? (
                (props.items as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))
              ) : (
                <>
                  <li>List item 1</li>
                  <li>List item 2</li>
                  <li>List item 3</li>
                </>
              )}
            </ul>
          );
          
        case 'spacer':
          return (
            <div 
              className="bg-gray-100 border border-dashed border-gray-300"
              style={{ height: String(props.height || '2rem') }}
            >
              <div className="text-xs text-gray-500 p-1">Spacer</div>
            </div>
          );
          
        default:
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <div className="text-sm font-medium text-yellow-800 mb-1">
                Unknown Component: {type}
              </div>
              <div className="text-xs text-yellow-600">
                Component type "{type}" is not recognized. This is a placeholder.
              </div>
              {Object.keys(props).length > 0 && (
                <div className="mt-2 text-xs text-yellow-600">
                  <div className="font-medium">Props:</div>
                  <pre className="mt-1 text-xs">
                    {JSON.stringify(props, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
      }
    };

    return (
      <div 
        className="component-renderer"
        data-component-type={type}
        data-component-id={component.id}
      >
        {getPlaceholderContent()}
      </div>
    );
  };

  return renderPlaceholder();
}