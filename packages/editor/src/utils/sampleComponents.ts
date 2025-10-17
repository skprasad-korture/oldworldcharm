import { z, componentRegistry } from '@oldworldcharm/shared';

// Sample component definitions for testing
export function registerSampleComponents() {
  // Button component
  componentRegistry.register({
    id: 'button',
    type: 'button',
    displayName: 'Button',
    category: 'forms',
    component: () => null, // Placeholder
    defaultProps: {
      text: 'Click me',
      variant: 'primary',
      size: 'medium',
    },
    propSchema: z.object({
      text: z.string().default('Click me'),
      variant: z.enum(['primary', 'secondary', 'outline']).default('primary'),
      size: z.enum(['small', 'medium', 'large']).default('medium'),
      disabled: z.boolean().default(false),
    }),
    metadata: {
      description: 'A clickable button component',
      tags: ['interactive', 'form', 'action'],
      isContainer: false,
    },
    isContainer: false,
  });

  // Text component
  componentRegistry.register({
    id: 'text',
    type: 'text',
    displayName: 'Text',
    category: 'typography',
    component: () => null,
    defaultProps: {
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      size: 'base',
      weight: 'normal',
    },
    propSchema: z.object({
      text: z.string().default('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
      size: z.enum(['xs', 'sm', 'base', 'lg', 'xl', '2xl']).default('base'),
      weight: z.enum(['light', 'normal', 'medium', 'semibold', 'bold']).default('normal'),
      color: z.string().default('text-gray-900'),
    }),
    metadata: {
      description: 'A text paragraph component',
      tags: ['text', 'content', 'typography'],
      isContainer: false,
    },
    isContainer: false,
  });

  // Heading component
  componentRegistry.register({
    id: 'heading',
    type: 'heading',
    displayName: 'Heading',
    category: 'typography',
    component: () => null,
    defaultProps: {
      text: 'Heading Text',
      level: 1,
      size: '3xl',
    },
    propSchema: z.object({
      text: z.string().default('Heading Text'),
      level: z.number().min(1).max(6).default(1),
      size: z.enum(['lg', 'xl', '2xl', '3xl', '4xl', '5xl']).default('3xl'),
      weight: z.enum(['normal', 'medium', 'semibold', 'bold']).default('bold'),
    }),
    metadata: {
      description: 'A heading component with configurable levels',
      tags: ['heading', 'title', 'typography'],
      isContainer: false,
    },
    isContainer: false,
  });

  // Container component
  componentRegistry.register({
    id: 'container',
    type: 'container',
    displayName: 'Container',
    category: 'layout',
    component: () => null,
    defaultProps: {
      padding: 'medium',
      maxWidth: 'full',
      background: 'transparent',
    },
    propSchema: z.object({
      padding: z.enum(['none', 'small', 'medium', 'large']).default('medium'),
      maxWidth: z.enum(['sm', 'md', 'lg', 'xl', '2xl', 'full']).default('full'),
      background: z.string().default('transparent'),
      border: z.boolean().default(false),
    }),
    metadata: {
      description: 'A flexible container for organizing content',
      tags: ['layout', 'wrapper', 'container'],
      isContainer: true,
    },
    isContainer: true,
  });

  // Card component
  componentRegistry.register({
    id: 'card',
    type: 'card',
    displayName: 'Card',
    category: 'layout',
    component: () => null,
    defaultProps: {
      title: 'Card Title',
      description: 'Card description goes here.',
      padding: 'medium',
      shadow: 'small',
    },
    propSchema: z.object({
      title: z.string().default('Card Title'),
      description: z.string().default('Card description goes here.'),
      padding: z.enum(['small', 'medium', 'large']).default('medium'),
      shadow: z.enum(['none', 'small', 'medium', 'large']).default('small'),
      border: z.boolean().default(true),
    }),
    metadata: {
      description: 'A card component for displaying content',
      tags: ['card', 'content', 'layout'],
      isContainer: true,
    },
    isContainer: true,
  });

  // Image component
  componentRegistry.register({
    id: 'image',
    type: 'image',
    displayName: 'Image',
    category: 'media',
    component: () => null,
    defaultProps: {
      src: '',
      alt: 'Image description',
      width: 'auto',
      height: 'auto',
    },
    propSchema: z.object({
      src: z.string().default(''),
      alt: z.string().default('Image description'),
      width: z.union([z.string(), z.number()]).default('auto'),
      height: z.union([z.string(), z.number()]).default('auto'),
      rounded: z.boolean().default(false),
    }),
    metadata: {
      description: 'An image component with responsive options',
      tags: ['image', 'media', 'visual'],
      isContainer: false,
    },
    isContainer: false,
  });

  // Input component
  componentRegistry.register({
    id: 'input',
    type: 'input',
    displayName: 'Input',
    category: 'forms',
    component: () => null,
    defaultProps: {
      type: 'text',
      placeholder: 'Enter text...',
      label: '',
      required: false,
    },
    propSchema: z.object({
      type: z.enum(['text', 'email', 'password', 'number', 'tel', 'url']).default('text'),
      placeholder: z.string().default('Enter text...'),
      label: z.string().default(''),
      required: z.boolean().default(false),
      disabled: z.boolean().default(false),
    }),
    metadata: {
      description: 'A form input component',
      tags: ['input', 'form', 'field'],
      isContainer: false,
    },
    isContainer: false,
  });

  // Section component
  componentRegistry.register({
    id: 'section',
    type: 'section',
    displayName: 'Section',
    category: 'layout',
    component: () => null,
    defaultProps: {
      padding: 'large',
      background: 'white',
      fullWidth: true,
    },
    propSchema: z.object({
      padding: z.enum(['none', 'small', 'medium', 'large', 'xl']).default('large'),
      background: z.string().default('white'),
      fullWidth: z.boolean().default(true),
      minHeight: z.string().default('auto'),
    }),
    metadata: {
      description: 'A section component for page layout',
      tags: ['section', 'layout', 'page'],
      isContainer: true,
    },
    isContainer: true,
    allowedChildren: ['container', 'card', 'text', 'heading', 'image', 'button'],
  });

  // Card component
  componentRegistry.register({
    id: 'card',
    type: 'card',
    displayName: 'Card',
    category: 'layout',
    component: () => null,
    defaultProps: {
      title: 'Card Title',
      description: 'Card description goes here',
      showHeader: true,
      showFooter: false,
    },
    propSchema: z.object({
      title: z.string().default('Card Title'),
      description: z.string().default('Card description goes here'),
      showHeader: z.boolean().default(true),
      showFooter: z.boolean().default(false),
    }),
    metadata: {
      description: 'A flexible card container component',
      tags: ['layout', 'container', 'content'],
      isContainer: true,
    },
    isContainer: true,
  });

  // Badge component
  componentRegistry.register({
    id: 'badge',
    type: 'badge',
    displayName: 'Badge',
    category: 'data-display',
    component: () => null,
    defaultProps: {
      text: 'Badge',
      variant: 'default',
    },
    propSchema: z.object({
      text: z.string().default('Badge'),
      variant: z.enum(['default', 'secondary', 'destructive', 'outline']).default('default'),
    }),
    metadata: {
      description: 'A small status indicator component',
      tags: ['status', 'indicator', 'label'],
      isContainer: false,
    },
    isContainer: false,
  });

  // Alert component
  componentRegistry.register({
    id: 'alert',
    type: 'alert',
    displayName: 'Alert',
    category: 'feedback',
    component: () => null,
    defaultProps: {
      title: 'Alert Title',
      description: 'This is an alert message',
      variant: 'default',
    },
    propSchema: z.object({
      title: z.string().default('Alert Title'),
      description: z.string().default('This is an alert message'),
      variant: z.enum(['default', 'destructive']).default('default'),
    }),
    metadata: {
      description: 'An alert message component',
      tags: ['feedback', 'notification', 'message'],
      isContainer: false,
    },
    isContainer: false,
  });

  // Separator component
  componentRegistry.register({
    id: 'separator',
    type: 'separator',
    displayName: 'Separator',
    category: 'layout',
    component: () => null,
    defaultProps: {
      orientation: 'horizontal',
    },
    propSchema: z.object({
      orientation: z.enum(['horizontal', 'vertical']).default('horizontal'),
    }),
    metadata: {
      description: 'A visual separator line',
      tags: ['layout', 'divider', 'separator'],
      isContainer: false,
    },
    isContainer: false,
  });

  // Avatar component
  componentRegistry.register({
    id: 'avatar',
    type: 'avatar',
    displayName: 'Avatar',
    category: 'data-display',
    component: () => null,
    defaultProps: {
      src: '',
      alt: 'Avatar',
      fallback: 'A',
      size: 'default',
    },
    propSchema: z.object({
      src: z.string().default(''),
      alt: z.string().default('Avatar'),
      fallback: z.string().default('A'),
      size: z.enum(['sm', 'default', 'lg']).default('default'),
    }),
    metadata: {
      description: 'A user avatar image component',
      tags: ['user', 'profile', 'image'],
      isContainer: false,
    },
    isContainer: false,
  });

  // Progress component
  componentRegistry.register({
    id: 'progress',
    type: 'progress',
    displayName: 'Progress',
    category: 'feedback',
    component: () => null,
    defaultProps: {
      value: 50,
      max: 100,
    },
    propSchema: z.object({
      value: z.number().min(0).default(50),
      max: z.number().min(1).default(100),
    }),
    metadata: {
      description: 'A progress indicator component',
      tags: ['progress', 'loading', 'indicator'],
      isContainer: false,
    },
    isContainer: false,
  });

  // Skeleton component
  componentRegistry.register({
    id: 'skeleton',
    type: 'skeleton',
    displayName: 'Skeleton',
    category: 'feedback',
    component: () => null,
    defaultProps: {
      className: 'h-4 w-full',
    },
    propSchema: z.object({
      className: z.string().default('h-4 w-full'),
    }),
    metadata: {
      description: 'A loading skeleton placeholder',
      tags: ['loading', 'placeholder', 'skeleton'],
      isContainer: false,
    },
    isContainer: false,
  });

  console.log('Sample components registered successfully');
}