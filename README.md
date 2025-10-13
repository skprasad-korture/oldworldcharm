# Old World Charm - Visual Website Builder

> **🚧 Work in Progress**: This project is currently under active development. We're building something amazing - stay tuned!

An open-source visual website builder that brings the elegance of old-world craftsmanship to modern web development. Built with cutting-edge technology including Astro, React, and shadcn/ui components, this platform enables anyone to create beautiful, performant websites through an intuitive drag-and-drop interface.

## 🎯 Vision

We're creating a visual website builder that combines:

- **Artisan Quality**: Every component crafted with attention to detail
- **Modern Performance**: Lightning-fast static sites powered by Astro
- **Developer Experience**: Built by developers, for developers
- **Open Source**: Community-driven development and transparency

## ✨ What We're Building

### Core Features

- 🎨 **Visual Drag-and-Drop Editor** - Intuitive interface for building pages without code
- 🧩 **Component Library** - Extensive collection based on shadcn/ui components
- 🎯 **Theme System** - Comprehensive customization with design tokens
- 📝 **Content Management** - Built-in CMS for dynamic content
- 🚀 **Static Site Generation** - Powered by Astro for optimal performance
- 📊 **A/B Testing** - Built-in experimentation framework
- 🔍 **SEO Optimization** - Advanced SEO tools and best practices
- 📱 **Responsive Design** - Mobile-first, responsive layouts
- ⚡ **Performance First** - Optimized for Core Web Vitals

### Target Users

- **Content Creators** - Build beautiful websites without technical knowledge
- **Developers** - Rapid prototyping and client work with extensible architecture
- **Agencies** - White-label solution for client projects
- **Businesses** - Professional websites with built-in CMS capabilities

## 🛠 Tech Stack

### Frontend

- **React 18.2** - Modern UI library with hooks and concurrent features
- **TypeScript 5.x** - Type-safe development with strict configuration
- **Tailwind CSS 3.x** - Utility-first CSS with shadcn/ui design system
- **Vite 5.x** - Lightning-fast build tool and dev server

### Backend

- **Fastify** - High-performance Node.js web framework
- **PostgreSQL** - Robust relational database for content storage
- **Redis** - Caching and session management
- **Drizzle ORM** - Type-safe database operations

### Build & Deploy

- **Astro 5.x** - Static site generation with partial hydration
- **pnpm Workspaces** - Efficient monorepo management
- **GitHub Actions** - Automated CI/CD pipeline
- **Changesets** - Version management and releases

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/skprasad-korture/oldworldcharm.git
cd oldworldcharm

# Install dependencies
pnpm install

# Start database services
docker-compose up -d

# Set up database
cd packages/api
pnpm db:migrate
pnpm db:seed

# Start development servers
cd ../..
pnpm dev
```

### Development Commands

```bash
# Development
pnpm dev              # Start all development servers
pnpm build            # Build all packages
pnpm test             # Run test suite

# Database (from packages/api)
pnpm db:test          # Test database connections
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed with sample data
pnpm db:studio        # Open Drizzle Studio
pnpm db:reset         # Full database reset

# Code Quality
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript type checking
pnpm format           # Format code with Prettier

# Package Management
pnpm changeset        # Create a changeset for releases
```

## 📁 Project Architecture

```
packages/
├── shared/           # Shared types, utilities, and components
│   ├── types/        # TypeScript definitions
│   └── utils/        # Common utilities
├── editor/           # Visual editor interface (React SPA)
│   ├── components/   # UI components
│   ├── stores/       # State management (Zustand)
│   └── hooks/        # Custom React hooks
└── api/              # Backend API server (Fastify)
    ├── routes/       # API endpoints
    ├── services/     # Business logic
    └── db/           # Database schemas and migrations
```

## 🎨 Design Philosophy

### Old World Craftsmanship Meets Modern Technology

- **Attention to Detail**: Every pixel matters, every interaction is thoughtful
- **Quality Over Quantity**: Fewer, better-crafted features
- **Timeless Design**: Classic aesthetics that won't feel dated
- **Artisan Tools**: Professional-grade capabilities for creators

### Developer Experience

- **Type Safety**: Comprehensive TypeScript coverage
- **Modern Tooling**: Latest versions of proven technologies
- **Clear Architecture**: Well-organized, maintainable codebase
- **Extensive Documentation**: Clear guides and API references

## 🗺 Development Roadmap

### Phase 1: Foundation (Current)

- [x] Project setup and monorepo architecture
- [ ] Core type definitions and shared utilities
- [ ] Basic component library integration
- [ ] Visual editor foundation

### Phase 2: Core Features

- [ ] Drag-and-drop functionality
- [ ] Component property editing
- [ ] Page management system
- [ ] Theme customization

### Phase 3: Advanced Features

- [ ] Content management system
- [ ] A/B testing framework
- [ ] SEO optimization tools
- [ ] Performance monitoring

### Phase 4: Production Ready

- [ ] User authentication and authorization
- [ ] Multi-tenant architecture
- [ ] Advanced deployment options
- [ ] Plugin system

## 🤝 Contributing

We welcome contributions from the community! This project is built with love by developers who believe in the power of open source.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper tests
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Use conventional commits
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Astro](https://astro.build/) for the amazing static site generator
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- The open source community for inspiration and support

---

**Built with ❤️ by [Prasad Korture](https://github.com/skprasad-korture)**

_Creating beautiful websites should be as enjoyable as using them._
