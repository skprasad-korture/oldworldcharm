// Base wrapper interface for shadcn/ui components
import { z } from 'zod';
import { ComponentDefinition, ComponentMetadata, ComponentCategory } from '../types';

// Define React types to avoid dependency
export type ComponentType<P = {}> = (props: P) => any;
export type ReactNode = any;

/**
 * Base interface for wrapped shadcn/ui components
 */
export interface WrappedComponent<TProps = Record<string, unknown>> {
  /** Unique identifier for the component */
  id: string;
  /** Component type/name */
  type: string;
  /** Display name for the component palette */
  displayName: string;
  /** Component category for organization */
  category: ComponentCategory;
  /** The actual React component */
  component: ComponentType<TProps>;
  /** Default props for the component */
  defaultProps: TProps;
  /** JSON Schema for prop validation */
  propSchema: z.ZodSchema<TProps>;
  /** Optional style schema for styling props */
  styleSchema?: z.ZodSchema<Record<string, unknown>> | undefined;
  /** Component metadata */
  metadata: ComponentMetadata;
  /** Whether this component can contain children */
  isContainer: boolean;
  /** Allowed child component types (if container) */
  allowedChildren?: string[] | undefined;
  /** Render function for the component */
  render: (props: TProps, children?: ReactNode) => ReactNode;
}

/**
 * Configuration for creating a wrapped component
 */
export interface ComponentWrapperConfig<TProps = Record<string, unknown>> {
  id: string;
  type: string;
  displayName: string;
  category: ComponentCategory;
  component: ComponentType<TProps>;
  defaultProps: TProps;
  propSchema: z.ZodSchema<TProps>;
  styleSchema?: z.ZodSchema<Record<string, unknown>> | undefined;
  metadata: Omit<ComponentMetadata, 'version'>;
  isContainer?: boolean;
  allowedChildren?: string[] | undefined;
  customRender?: (props: TProps, children?: ReactNode) => ReactNode;
}

/**
 * Creates a wrapped component from a shadcn/ui component
 */
export function createWrappedComponent<TProps = Record<string, unknown>>(
  config: ComponentWrapperConfig<TProps>
): WrappedComponent<TProps> {
  const {
    id,
    type,
    displayName,
    category,
    component: Component,
    defaultProps,
    propSchema,
    styleSchema,
    metadata,
    isContainer = false,
    allowedChildren,
    customRender,
  } = config;

  // Add version to metadata
  const fullMetadata: ComponentMetadata = {
    ...metadata,
    version: '1.0.0', // Default version
  };

  // Default render function
  const defaultRender = (props: TProps, children?: ReactNode) => {
    // This would be implemented in the actual React environment
    return { type: Component, props, children };
  };

  const result: WrappedComponent<TProps> = {
    id,
    type,
    displayName,
    category,
    component: Component,
    defaultProps,
    propSchema,
    styleSchema,
    metadata: fullMetadata,
    isContainer,
    render: customRender || defaultRender,
  };

  if (allowedChildren) {
    result.allowedChildren = allowedChildren;
  }

  return result;
}

/**
 * Validates component props using the component's schema
 */
export function validateComponentProps<TProps>(
  component: WrappedComponent<TProps>,
  props: unknown
): { success: true; data: TProps } | { success: false; error: z.ZodError } {
  const result = component.propSchema.safeParse(props);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, error: result.error };
}

/**
 * Validates component style props using the component's style schema
 */
export function validateComponentStyles(
  component: WrappedComponent,
  styles: unknown
): { success: true; data: Record<string, unknown> } | { success: false; error: z.ZodError } {
  if (!component.styleSchema) {
    return { success: true, data: {} };
  }

  const result = component.styleSchema.safeParse(styles);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, error: result.error };
}

/**
 * Transforms props before passing to the component
 * Useful for converting editor-specific props to component props
 */
export function transformProps<TProps>(
  component: WrappedComponent<TProps>,
  editorProps: Record<string, unknown>
): TProps {
  // Merge with default props
  const mergedProps = { ...component.defaultProps, ...editorProps };
  
  // Validate and return
  const validation = validateComponentProps(component, mergedProps);
  
  if (!validation.success) {
    console.warn(`Invalid props for component ${component.type}:`, validation.error);
    return component.defaultProps;
  }
  
  return validation.data;
}

/**
 * Checks if a component can contain a specific child component
 */
export function canContainChild(
  parent: WrappedComponent,
  childType: string
): boolean {
  if (!parent.isContainer) {
    return false;
  }
  
  if (!parent.allowedChildren) {
    return true; // No restrictions
  }
  
  return parent.allowedChildren.includes(childType);
}

/**
 * Gets the component definition for API serialization
 */
export function getComponentDefinition(
  component: WrappedComponent
): ComponentDefinition {
  return {
    id: component.id,
    type: component.type,
    displayName: component.displayName,
    category: component.category,
    component: component.type, // Use type as component identifier
    defaultProps: component.defaultProps as Record<string, unknown>,
    propSchema: component.propSchema._def as Record<string, unknown>, // Serialize schema
    styleSchema: component.styleSchema?._def as Record<string, unknown>,
    metadata: component.metadata,
  };
}