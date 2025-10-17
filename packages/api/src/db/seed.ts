import { db } from './connection';
import { pages, themes, mediaAssets, blogPosts } from './schema';

// Default theme configuration
const defaultTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#f59e0b',
    neutral: '#374151',
    base: '#ffffff',
    info: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFont: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
};

// Sample page content structure
const samplePageContent = {
  components: [
    {
      id: 'hero-1',
      type: 'hero',
      props: {
        title: 'Welcome to Old World Charm',
        subtitle: 'Build beautiful websites with our visual editor',
        buttonText: 'Get Started',
        buttonLink: '/editor',
      },
      children: [],
    },
    {
      id: 'features-1',
      type: 'features',
      props: {
        title: 'Why Choose Our Builder?',
        features: [
          {
            title: 'Visual Editor',
            description: 'Drag and drop components to build your site',
            icon: 'edit',
          },
          {
            title: 'SEO Optimized',
            description: 'Built-in SEO tools and best practices',
            icon: 'search',
          },
          {
            title: 'Fast Performance',
            description: 'Static site generation for lightning speed',
            icon: 'zap',
          },
        ],
      },
      children: [],
    },
  ],
};

// Sample SEO data
const sampleSeoData = {
  metaTitle: 'Old World Charm - Visual Website Builder',
  metaDescription:
    'Create beautiful, fast websites with our intuitive visual editor. No coding required.',
  keywords: ['website builder', 'visual editor', 'no code', 'static site'],
  ogImage: '/images/og-image.jpg',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Old World Charm',
    description: 'Visual website builder with drag-and-drop functionality',
  },
};

async function seedDatabase() {
  console.log('🌱 Seeding database...');

  try {
    // Insert default theme
    const [defaultThemeRecord] = await db
      .insert(themes)
      .values({
        name: 'Default Theme',
        config: defaultTheme,
        isDefault: true,
      })
      .returning();

    console.log(
      '✅ Default theme created:',
      defaultThemeRecord?.name || 'Default Theme'
    );

    // Insert sample homepage
    const [homePage] = await db
      .insert(pages)
      .values({
        slug: 'home',
        title: 'Home',
        description:
          'Welcome to Old World Charm - the visual website builder that brings craftsmanship to web development',
        content: samplePageContent,
        seoData: sampleSeoData,
        status: 'published',
        publishedAt: new Date(),
      })
      .returning();

    console.log('✅ Homepage created:', homePage?.title || 'Home');

    // Insert sample about page
    const [aboutPage] = await db
      .insert(pages)
      .values({
        slug: 'about',
        title: 'About Us',
        description: 'Learn more about Old World Charm and our mission',
        content: {
          components: [
            {
              id: 'about-hero-1',
              type: 'hero',
              props: {
                title: 'About Old World Charm',
                subtitle: 'Bringing craftsmanship to modern web development',
              },
              children: [],
            },
            {
              id: 'about-content-1',
              type: 'content',
              props: {
                content:
                  'We believe in combining the best of traditional craftsmanship with modern technology to create beautiful, functional websites.',
              },
              children: [],
            },
          ],
        },
        seoData: {
          metaTitle: 'About Us - Old World Charm',
          metaDescription:
            'Learn about our mission to bring craftsmanship to web development',
          keywords: ['about', 'mission', 'web development'],
        },
        status: 'published',
        publishedAt: new Date(),
      })
      .returning();

    console.log('✅ About page created:', aboutPage?.title || 'About Us');

    // Insert sample blog post
    const [blogPage] = await db
      .insert(pages)
      .values({
        slug: 'getting-started-with-visual-website-builder',
        title: 'Getting Started with Visual Website Builder',
        description:
          'Learn how to create your first website using our visual editor',
        content: {
          components: [
            {
              id: 'blog-hero-1',
              type: 'hero',
              props: {
                title: 'Getting Started with Visual Website Builder',
                subtitle: 'A comprehensive guide to building your first site',
              },
              children: [],
            },
            {
              id: 'blog-content-1',
              type: 'content',
              props: {
                content:
                  "In this guide, we'll walk you through the process of creating your first website using our intuitive visual editor...",
              },
              children: [],
            },
          ],
        },
        seoData: {
          metaTitle: 'Getting Started Guide - Old World Charm',
          metaDescription:
            'Learn how to create your first website with our visual editor',
          keywords: ['tutorial', 'getting started', 'website builder'],
        },
        status: 'published',
        publishedAt: new Date(),
      })
      .returning();

    // Create blog post entry
    if (blogPage?.id) {
      await db.insert(blogPosts).values({
        pageId: blogPage.id,
        excerpt:
          'Learn how to create your first website using our visual editor with this comprehensive guide.',
        featuredImage: '/images/blog/getting-started.jpg',
        categories: ['Tutorial', 'Getting Started'],
        tags: ['beginner', 'tutorial', 'visual editor'],
        author: 'Old World Charm Team',
        readingTime: 5,
      });
    }

    console.log(
      '✅ Sample blog post created:',
      blogPage?.title || 'Getting Started Guide'
    );

    // Insert sample media assets
    const sampleAssets = [
      {
        filename: 'hero-bg.jpg',
        originalName: 'hero-background.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/images/hero-bg.jpg',
        thumbnailUrl: '/images/thumbs/hero-bg.jpg',
        altText: 'Beautiful landscape background for hero section',
        tags: ['background', 'hero', 'landscape'],
        folder: 'backgrounds',
      },
      {
        filename: 'logo.svg',
        originalName: 'company-logo.svg',
        mimeType: 'image/svg+xml',
        size: 5120,
        url: '/images/logo.svg',
        altText: 'Old World Charm company logo',
        tags: ['logo', 'branding'],
        folder: 'branding',
      },
      {
        filename: 'feature-icon-1.svg',
        originalName: 'edit-icon.svg',
        mimeType: 'image/svg+xml',
        size: 2048,
        url: '/images/icons/feature-icon-1.svg',
        altText: 'Edit icon for visual editor feature',
        tags: ['icon', 'feature', 'edit'],
        folder: 'icons',
      },
    ];

    await db.insert(mediaAssets).values(sampleAssets);
    console.log('✅ Sample media assets created');

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedDatabase };
