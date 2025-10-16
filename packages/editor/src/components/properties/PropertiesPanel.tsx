import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { ComponentPropertyEditor } from './ComponentPropertyEditor';
import { PropertyGroup } from './PropertyGroup';
import { findComponentById } from '../../utils/componentUtils';

export interface PropertiesPanelProps {
  className?: string;
}

export function PropertiesPanel({ className = '' }: PropertiesPanelProps) {
  const { 
    selectedComponentId, 
    components, 
    updateComponent, 
    removeComponent, 
    duplicateComponent,
    selectComponent 
  } = useEditorStore();

  const selectedComponent = selectedComponentId 
    ? findComponentById(components, selectedComponentId)
    : null;

  const handlePropertyChange = (property: string, value: unknown) => {
    if (selectedComponentId) {
      updateComponent(selectedComponentId, { [property]: value });
    }
  };

  const handleDelete = () => {
    if (selectedComponentId) {
      removeComponent(selectedComponentId);
    }
  };

  const handleDuplicate = () => {
    if (selectedComponentId) {
      duplicateComponent(selectedComponentId);
    }
  };

  const handleDeselect = () => {
    selectComponent(null);
  };

  return (
    <div className={`properties-panel h-full flex flex-col bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
          {selectedComponent && (
            <button
              onClick={handleDeselect}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Deselect component"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {selectedComponent ? (
          <div className="mt-2">
            <div className="text-sm font-medium text-gray-700">
              {selectedComponent.type}
            </div>
            <div className="text-xs text-gray-500">
              ID: {selectedComponent.id}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-1">
            Select a component to edit its properties
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedComponent ? (
          <div className="p-4 space-y-6">
            {/* Component Actions */}
            <PropertyGroup title="Actions">
              <div className="flex space-x-2">
                <button
                  onClick={handleDuplicate}
                  className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                >
                  Duplicate
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </PropertyGroup>

            {/* Component Properties */}
            <PropertyGroup title="Properties">
              <ComponentPropertyEditor
                component={selectedComponent}
                onPropertyChange={handlePropertyChange}
              />
            </PropertyGroup>

            {/* Style Properties */}
            <PropertyGroup title="Styling">
              <StylePropertyEditor
                component={selectedComponent}
                onPropertyChange={handlePropertyChange}
              />
            </PropertyGroup>

            {/* Layout Properties */}
            {selectedComponent.children !== undefined && (
              <PropertyGroup title="Layout">
                <LayoutPropertyEditor
                  component={selectedComponent}
                  onPropertyChange={handlePropertyChange}
                />
              </PropertyGroup>
            )}

            {/* Advanced Properties */}
            <PropertyGroup title="Advanced" collapsible defaultCollapsed>
              <AdvancedPropertyEditor
                component={selectedComponent}
                onPropertyChange={handlePropertyChange}
              />
            </PropertyGroup>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-gray-400">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
              </svg>
              <div className="text-sm">No component selected</div>
              <div className="text-xs mt-1">Click on a component to edit its properties</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Placeholder components for different property editors
function StylePropertyEditor({ 
  component, 
  onPropertyChange 
}: { 
  component: any; 
  onPropertyChange: (property: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Background Color
        </label>
        <input
          type="color"
          value={component.props.backgroundColor || '#ffffff'}
          onChange={(e) => onPropertyChange('backgroundColor', e.target.value)}
          className="w-full h-8 border border-gray-300 rounded cursor-pointer"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Text Color
        </label>
        <input
          type="color"
          value={component.props.textColor || '#000000'}
          onChange={(e) => onPropertyChange('textColor', e.target.value)}
          className="w-full h-8 border border-gray-300 rounded cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Border Radius
        </label>
        <select
          value={component.props.borderRadius || 'none'}
          onChange={(e) => onPropertyChange('borderRadius', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">None</option>
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
          <option value="full">Full</option>
        </select>
      </div>
    </div>
  );
}

function LayoutPropertyEditor({ 
  component, 
  onPropertyChange 
}: { 
  component: any; 
  onPropertyChange: (property: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Display
        </label>
        <select
          value={component.props.display || 'block'}
          onChange={(e) => onPropertyChange('display', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="block">Block</option>
          <option value="flex">Flex</option>
          <option value="grid">Grid</option>
          <option value="inline">Inline</option>
          <option value="inline-block">Inline Block</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Padding
        </label>
        <select
          value={component.props.padding || 'medium'}
          onChange={(e) => onPropertyChange('padding', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">None</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Margin
        </label>
        <select
          value={component.props.margin || 'none'}
          onChange={(e) => onPropertyChange('margin', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">None</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
    </div>
  );
}

function AdvancedPropertyEditor({ 
  component, 
  onPropertyChange 
}: { 
  component: any; 
  onPropertyChange: (property: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          CSS Classes
        </label>
        <input
          type="text"
          value={component.props.className || ''}
          onChange={(e) => onPropertyChange('className', e.target.value)}
          placeholder="custom-class another-class"
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Custom ID
        </label>
        <input
          type="text"
          value={component.props.id || ''}
          onChange={(e) => onPropertyChange('id', e.target.value)}
          placeholder="unique-id"
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="flex items-center space-x-2 text-xs font-medium text-gray-700">
          <input
            type="checkbox"
            checked={component.props.hidden || false}
            onChange={(e) => onPropertyChange('hidden', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Hidden</span>
        </label>
      </div>
    </div>
  );
}