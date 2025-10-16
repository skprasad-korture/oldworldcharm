// Prop validation and transformation utilities
import { z } from 'zod';
import { WrappedComponent } from './wrapper';
import { ComponentInstance } from '../types';

/**
 * Validation result interface
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: ComponentValidationError[];
}

/**
 * Component validation error interface
 */
export interface ComponentValidationError {
  path: string[];
  message: string;
  code: string;
}

/**
 * Prop transformation options
 */
export interface PropTransformOptions {
  /** Whether to merge with default props */
  mergeDefaults?: boolean;
  /** Whether to strip unknown properties */
  stripUnknown?: boolean;
  /** Custom transformation functions */
  transforms?: Record<string, (value: unknown) => unknown>;
}

/**
 * Validates component props against the component's schema
 */
export function validateProps<TProps>(
  component: WrappedComponent<TProps>,
  props: unknown,
  options: PropTransformOptions = {}
): ValidationResult<TProps> {
  try {
    const { mergeDefaults = true } = options;

    // Start with provided props
    let propsToValidate = props as Record<string, unknown>;

    // Merge with defaults if requested
    if (mergeDefaults) {
      propsToValidate = {
        ...component.defaultProps,
        ...propsToValidate,
      };
    }

    // Apply custom transformations
    if (options.transforms) {
      for (const [key, transform] of Object.entries(options.transforms)) {
        if (key in propsToValidate) {
          propsToValidate[key] = transform(propsToValidate[key]);
        }
      }
    }

    // Configure schema options
    let schema = component.propSchema;
    // Note: strip() method would be available in actual Zod usage

    // Validate
    const result = schema.parse(propsToValidate);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: ComponentValidationError[] = error.errors.map(err => ({
        path: err.path.map(String),
        message: err.message,
        code: err.code,
      }));

      return {
        success: false,
        errors: validationErrors,
      };
    }

    return {
      success: false,
      errors: [
        {
          path: [],
          message: 'Unknown validation error',
          code: 'UNKNOWN_ERROR',
        },
      ],
    };
  }
}

/**
 * Validates a component instance structure
 */
export function validateComponentInstanceStructure(
  instance: unknown
): ValidationResult<ComponentInstance> {
  try {
    // Basic structure validation - use any to avoid circular reference issues
    const instanceSchema: any = z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      props: z.record(z.unknown()).default({}),
      children: z.array(z.lazy(() => instanceSchema)).optional(),
      metadata: z.object({
        description: z.string(),
        previewImage: z.string().optional(),
        tags: z.array(z.string()),
        isContainer: z.boolean(),
        version: z.string(),
      }).optional(),
    });

    const result = instanceSchema.parse(instance);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: ComponentValidationError[] = error.errors.map(err => ({
        path: err.path.map(String),
        message: err.message,
        code: err.code,
      }));

      return {
        success: false,
        errors: validationErrors,
      };
    }

    return {
      success: false,
      errors: [
        {
          path: [],
          message: 'Unknown validation error',
          code: 'UNKNOWN_ERROR',
        },
      ],
    };
  }
}

/**
 * Validates component hierarchy (parent-child relationships)
 */
export function validateComponentHierarchy(
  parentComponent: WrappedComponent,
  childInstances: ComponentInstance[]
): ValidationResult<ComponentInstance[]> {
  const errors: ComponentValidationError[] = [];

  // Check if parent can contain children
  if (!parentComponent.isContainer && childInstances.length > 0) {
    errors.push({
      path: ['children'],
      message: `Component ${parentComponent.type} cannot contain children`,
      code: 'INVALID_CONTAINER',
    });
  }

  // Check allowed children if specified
  if (parentComponent.allowedChildren && childInstances.length > 0) {
    childInstances.forEach((child, index) => {
      if (!parentComponent.allowedChildren!.includes(child.type)) {
        errors.push({
          path: ['children', index.toString(), 'type'],
          message: `Component ${child.type} is not allowed as child of ${parentComponent.type}`,
          code: 'INVALID_CHILD_TYPE',
        });
      }
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: childInstances,
  };
}

/**
 * Transforms editor props to component props
 */
export function transformEditorProps<TProps>(
  component: WrappedComponent<TProps>,
  editorProps: Record<string, unknown>,
  options: PropTransformOptions = {}
): ValidationResult<TProps> {
  // Common transformations for editor-specific props
  const commonTransforms: Record<string, (value: unknown) => unknown> = {
    // Convert color objects to strings
    color: (value) => {
      if (typeof value === 'object' && value !== null && 'hex' in value) {
        return (value as { hex: string }).hex;
      }
      return value;
    },
    
    // Convert spacing objects to CSS values
    spacing: (value) => {
      if (typeof value === 'object' && value !== null) {
        const spacing = value as Record<string, number>;
        return Object.entries(spacing)
          .map(([key, val]) => `${key}: ${val}px`)
          .join('; ');
      }
      return value;
    },
    
    // Convert boolean strings to booleans
    disabled: (value) => {
      if (typeof value === 'string') {
        return value === 'true';
      }
      return value;
    },
  };

  const mergedTransforms = {
    ...commonTransforms,
    ...options.transforms,
  };

  return validateProps(component, editorProps, {
    ...options,
    transforms: mergedTransforms,
  });
}

/**
 * Sanitizes props to remove potentially dangerous values
 */
export function sanitizeProps(props: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...props };

  // Remove function props (security)
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'function') {
      delete sanitized[key];
    }
  });

  // Sanitize string props
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      const value = sanitized[key] as string;
      
      // Remove script tags and javascript: protocols
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '');
    }
  });

  return sanitized;
}

/**
 * Validates and transforms a complete component tree
 */
export function validateComponentTree(
  instances: ComponentInstance[],
  componentRegistry: Map<string, WrappedComponent>
): ValidationResult<ComponentInstance[]> {
  const errors: ComponentValidationError[] = [];
  const validatedInstances: ComponentInstance[] = [];

  function validateInstance(
    instance: ComponentInstance,
    path: string[] = []
  ): ComponentInstance | null {
    // Validate instance structure
    const instanceValidation = validateComponentInstanceStructure(instance);
    if (!instanceValidation.success) {
      errors.push(...(instanceValidation.errors || []).map(err => ({
        ...err,
        path: [...path, ...err.path],
      })));
      return null;
    }

    // Get component definition
    const component = componentRegistry.get(instance.type);
    if (!component) {
      errors.push({
        path: [...path, 'type'],
        message: `Unknown component type: ${instance.type}`,
        code: 'UNKNOWN_COMPONENT',
      });
      return null;
    }

    // Validate props
    const propsValidation = validateProps(component, instance.props);
    if (!propsValidation.success) {
      errors.push(...(propsValidation.errors || []).map(err => ({
        ...err,
        path: [...path, 'props', ...err.path],
      })));
      return null;
    }

    // Validate children
    const validatedChildren: ComponentInstance[] = [];
    if (instance.children) {
      // Validate hierarchy
      const hierarchyValidation = validateComponentHierarchy(component, instance.children);
      if (!hierarchyValidation.success) {
        errors.push(...(hierarchyValidation.errors || []).map(err => ({
          ...err,
          path: [...path, ...err.path],
        })));
      }

      // Recursively validate children
      instance.children.forEach((child, index) => {
        const validatedChild = validateInstance(child, [...path, 'children', index.toString()]);
        if (validatedChild) {
          validatedChildren.push(validatedChild);
        }
      });
    }

    const result: ComponentInstance = {
      ...instance,
      props: propsValidation.data!,
    };
    
    if (validatedChildren.length > 0) {
      result.children = validatedChildren;
    }
    
    return result;
  }

  // Validate each root instance
  instances.forEach((instance, index) => {
    const validated = validateInstance(instance, [index.toString()]);
    if (validated) {
      validatedInstances.push(validated);
    }
  });

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: validatedInstances,
  };
}