import React from 'react';

export interface PropertyFieldProps {
  label: string;
  type: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'color' | 'range';
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
  options?: Array<{ value: unknown; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  description?: string;
}

export function PropertyField({
  label,
  type,
  value,
  onChange,
  placeholder,
  options,
  min,
  max,
  step,
  disabled = false,
  description,
}: PropertyFieldProps) {
  const renderInput = () => {
    const baseInputClass = "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    
    switch (type) {
      case 'text':
        return (
          <input
            type="text"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClass}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={3}
            className={`${baseInputClass} resize-none`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={Number(value) || 0}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={baseInputClass}
          />
        );

      case 'checkbox':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              {Boolean(value) ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );

      case 'select':
        return (
          <select
            value={String(value || '')}
            onChange={(e) => {
              const selectedOption = options?.find(opt => String(opt.value) === e.target.value);
              onChange(selectedOption?.value);
            }}
            disabled={disabled}
            className={baseInputClass}
          >
            {options?.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'color':
        return (
          <div className="flex space-x-2">
            <input
              type="color"
              value={String(value || '#000000')}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={String(value || '')}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              disabled={disabled}
              className={`${baseInputClass} flex-1`}
            />
          </div>
        );

      case 'range':
        return (
          <div className="space-y-2">
            <input
              type="range"
              value={Number(value) || 0}
              onChange={(e) => onChange(Number(e.target.value))}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{min}</span>
              <span className="font-medium">{String(value)}</span>
              <span>{max}</span>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-red-500">
            Unsupported field type: {type}
          </div>
        );
    }
  };

  return (
    <div className="property-field">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-700">
          {label}
        </label>
        {type === 'checkbox' && (
          <div className="text-xs text-gray-500">
            {Boolean(value) ? 'On' : 'Off'}
          </div>
        )}
      </div>
      
      {renderInput()}
      
      {description && (
        <div className="mt-1 text-xs text-gray-500">
          {description}
        </div>
      )}
    </div>
  );
}