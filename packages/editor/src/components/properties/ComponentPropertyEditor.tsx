import React from 'react';
import { ComponentInstance, componentRegistry } from '@oldworldcharm/shared';
import { PropertyField } from './PropertyField';

export interface ComponentPropertyEditorProps {
  component: ComponentInstance;
  onPropertyChange: (property: string, value: unknown) => void;
}

export function ComponentPropertyEditor({ 
  component, 
  onPropertyChange 
}: ComponentPropertyEditorProps) {
  // Get component definition from registry to understand available properties
  const componentDef = componentRegistry.get(component.type);
  
  if (!componentDef) {
    return (
      <div className="text-sm text-gray-500">
        Component definition not found for type: {component.type}
      </div>
    );
  }

  // Generate property fields based on component type
  const renderPropertyFields = () => {
    const fields: React.ReactNode[] = [];
    
    // Common properties based on component type
    switch (component.type.toLowerCase()) {
      case 'button':
        fields.push(
          <PropertyField
            key="text"
            label="Button Text"
            type="text"
            value={component.props.text || ''}
            onChange={(value) => onPropertyChange('text', value)}
          />,
          <PropertyField
            key="variant"
            label="Variant"
            type="select"
            value={component.props.variant || 'primary'}
            options={[
              { value: 'primary', label: 'Primary' },
              { value: 'secondary', label: 'Secondary' },
              { value: 'outline', label: 'Outline' },
            ]}
            onChange={(value) => onPropertyChange('variant', value)}
          />,
          <PropertyField
            key="size"
            label="Size"
            type="select"
            value={component.props.size || 'medium'}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' },
            ]}
            onChange={(value) => onPropertyChange('size', value)}
          />,
          <PropertyField
            key="disabled"
            label="Disabled"
            type="checkbox"
            value={component.props.disabled || false}
            onChange={(value) => onPropertyChange('disabled', value)}
          />
        );
        break;

      case 'text':
      case 'paragraph':
        fields.push(
          <PropertyField
            key="text"
            label="Text Content"
            type="textarea"
            value={component.props.text || ''}
            onChange={(value) => onPropertyChange('text', value)}
          />,
          <PropertyField
            key="size"
            label="Text Size"
            type="select"
            value={component.props.size || 'base'}
            options={[
              { value: 'xs', label: 'Extra Small' },
              { value: 'sm', label: 'Small' },
              { value: 'base', label: 'Base' },
              { value: 'lg', label: 'Large' },
              { value: 'xl', label: 'Extra Large' },
              { value: '2xl', label: '2X Large' },
            ]}
            onChange={(value) => onPropertyChange('size', value)}
          />,
          <PropertyField
            key="weight"
            label="Font Weight"
            type="select"
            value={component.props.weight || 'normal'}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'normal', label: 'Normal' },
              { value: 'medium', label: 'Medium' },
              { value: 'semibold', label: 'Semibold' },
              { value: 'bold', label: 'Bold' },
            ]}
            onChange={(value) => onPropertyChange('weight', value)}
          />
        );
        break;

      case 'heading':
      case 'h1':
      case 'h2':
      case 'h3':
        fields.push(
          <PropertyField
            key="text"
            label="Heading Text"
            type="text"
            value={component.props.text || ''}
            onChange={(value) => onPropertyChange('text', value)}
          />,
          <PropertyField
            key="level"
            label="Heading Level"
            type="select"
            value={component.props.level || 1}
            options={[
              { value: 1, label: 'H1' },
              { value: 2, label: 'H2' },
              { value: 3, label: 'H3' },
              { value: 4, label: 'H4' },
              { value: 5, label: 'H5' },
              { value: 6, label: 'H6' },
            ]}
            onChange={(value) => onPropertyChange('level', value)}
          />,
          <PropertyField
            key="size"
            label="Size"
            type="select"
            value={component.props.size || '3xl'}
            options={[
              { value: 'lg', label: 'Large' },
              { value: 'xl', label: 'Extra Large' },
              { value: '2xl', label: '2X Large' },
              { value: '3xl', label: '3X Large' },
              { value: '4xl', label: '4X Large' },
              { value: '5xl', label: '5X Large' },
            ]}
            onChange={(value) => onPropertyChange('size', value)}
          />
        );
        break;

      case 'image':
        fields.push(
          <PropertyField
            key="src"
            label="Image URL"
            type="text"
            value={component.props.src || ''}
            onChange={(value) => onPropertyChange('src', value)}
            placeholder="https://example.com/image.jpg"
          />,
          <PropertyField
            key="alt"
            label="Alt Text"
            type="text"
            value={component.props.alt || ''}
            onChange={(value) => onPropertyChange('alt', value)}
            placeholder="Describe the image"
          />,
          <PropertyField
            key="width"
            label="Width"
            type="text"
            value={component.props.width || 'auto'}
            onChange={(value) => onPropertyChange('width', value)}
            placeholder="auto, 100px, 50%"
          />,
          <PropertyField
            key="height"
            label="Height"
            type="text"
            value={component.props.height || 'auto'}
            onChange={(value) => onPropertyChange('height', value)}
            placeholder="auto, 100px, 50%"
          />,
          <PropertyField
            key="rounded"
            label="Rounded"
            type="checkbox"
            value={component.props.rounded || false}
            onChange={(value) => onPropertyChange('rounded', value)}
          />
        );
        break;

      case 'input':
        fields.push(
          <PropertyField
            key="type"
            label="Input Type"
            type="select"
            value={component.props.type || 'text'}
            options={[
              { value: 'text', label: 'Text' },
              { value: 'email', label: 'Email' },
              { value: 'password', label: 'Password' },
              { value: 'number', label: 'Number' },
              { value: 'tel', label: 'Phone' },
              { value: 'url', label: 'URL' },
            ]}
            onChange={(value) => onPropertyChange('type', value)}
          />,
          <PropertyField
            key="placeholder"
            label="Placeholder"
            type="text"
            value={component.props.placeholder || ''}
            onChange={(value) => onPropertyChange('placeholder', value)}
          />,
          <PropertyField
            key="label"
            label="Label"
            type="text"
            value={component.props.label || ''}
            onChange={(value) => onPropertyChange('label', value)}
          />,
          <PropertyField
            key="required"
            label="Required"
            type="checkbox"
            value={component.props.required || false}
            onChange={(value) => onPropertyChange('required', value)}
          />,
          <PropertyField
            key="disabled"
            label="Disabled"
            type="checkbox"
            value={component.props.disabled || false}
            onChange={(value) => onPropertyChange('disabled', value)}
          />
        );
        break;

      case 'card':
        fields.push(
          <PropertyField
            key="title"
            label="Card Title"
            type="text"
            value={component.props.title || ''}
            onChange={(value) => onPropertyChange('title', value)}
          />,
          <PropertyField
            key="description"
            label="Description"
            type="textarea"
            value={component.props.description || ''}
            onChange={(value) => onPropertyChange('description', value)}
          />,
          <PropertyField
            key="shadow"
            label="Shadow"
            type="select"
            value={component.props.shadow || 'small'}
            options={[
              { value: 'none', label: 'None' },
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' },
            ]}
            onChange={(value) => onPropertyChange('shadow', value)}
          />,
          <PropertyField
            key="border"
            label="Show Border"
            type="checkbox"
            value={component.props.border !== false}
            onChange={(value) => onPropertyChange('border', value)}
          />
        );
        break;

      case 'container':
      case 'section':
        fields.push(
          <PropertyField
            key="maxWidth"
            label="Max Width"
            type="select"
            value={component.props.maxWidth || 'full'}
            options={[
              { value: 'sm', label: 'Small (640px)' },
              { value: 'md', label: 'Medium (768px)' },
              { value: 'lg', label: 'Large (1024px)' },
              { value: 'xl', label: 'Extra Large (1280px)' },
              { value: '2xl', label: '2X Large (1536px)' },
              { value: 'full', label: 'Full Width' },
            ]}
            onChange={(value) => onPropertyChange('maxWidth', value)}
          />,
          <PropertyField
            key="background"
            label="Background"
            type="text"
            value={component.props.background || 'transparent'}
            onChange={(value) => onPropertyChange('background', value)}
            placeholder="transparent, white, #ffffff"
          />
        );
        
        if (component.type === 'section') {
          fields.push(
            <PropertyField
              key="fullWidth"
              label="Full Width"
              type="checkbox"
              value={component.props.fullWidth !== false}
              onChange={(value) => onPropertyChange('fullWidth', value)}
            />,
            <PropertyField
              key="minHeight"
              label="Min Height"
              type="text"
              value={component.props.minHeight || 'auto'}
              onChange={(value) => onPropertyChange('minHeight', value)}
              placeholder="auto, 100vh, 500px"
            />
          );
        }
        break;

      default:
        // For unknown components, show a generic property editor
        fields.push(
          <div key="unknown" className="text-sm text-gray-500">
            <p>Generic property editor for {component.type}</p>
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <pre>{JSON.stringify(component.props, null, 2)}</pre>
            </div>
          </div>
        );
        break;
    }

    return fields;
  };

  return (
    <div className="space-y-4">
      {renderPropertyFields()}
    </div>
  );
}