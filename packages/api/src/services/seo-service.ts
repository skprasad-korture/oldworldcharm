import { db } from '../db/connection';
import { pages, seoAnalysis } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  type SEOAnalysis,
  type SEOIssue,
  type SEORecommendation,
  type StructuredData,
  type MetaTags,
} from '@oldworldcharm/shared';

interface ContentAnalysis {
  textContent: string;
  headings: { level: number; text: string }[];
  images: { src: string; alt?: string }[];
  links: { href: string; text: string; isInternal: boolean }[];
  wordCount: number;
  readingTime: number;
}

interface SEOConfig {
  baseUrl: string;
  siteName: string;
  defaultAuthor: string;
  defaultImage: string;
  twitterHandle?: string | undefined;
}

export class SEOService {
  private config: SEOConfig;

  constructor(config: SEOConfig) {
    this.config = config;
  }

  /**
   * Analyze page content for SEO best practices
   */
  async analyzePage(pageId: string, content: any): Promise<SEOAnalysis> {
    try {
      // Get page data
      const [page] = await db
        .select()
        .from(pages)
        .where(eq(pages.id, pageId))
        .limit(1);

      if (!page) {
        throw new Error('Page not found');
      }

      // Extract content for analysis
      const contentAnalysis = this.extractContentFromComponents(content);
      
      // Perform SEO analysis
      const issues: SEOIssue[] = [];
      const recommendations: SEORecommendation[] = [];

      // Analyze title
      this.analyzeTitleTag(page.title, page.seoData, issues, recommendations);

      // Analyze meta description
      this.analyzeMetaDescription(page.description, page.seoData, issues, recommendations);

      // Analyze content structure
      this.analyzeContentStructure(contentAnalysis, issues, recommendations);

      // Analyze images
      this.analyzeImages(contentAnalysis.images, issues, recommendations);

      // Analyze internal linking
      this.analyzeLinks(contentAnalysis.links, issues, recommendations);

      // Analyze keyword usage
      const keywords = this.extractKeywords(contentAnalysis.textContent);
      this.analyzeKeywordUsage(keywords, contentAnalysis, page.title, issues, recommendations);

      // Calculate overall SEO score
      const score = this.calculateSEOScore(issues);

      // Calculate readability score
      const readabilityScore = this.calculateReadabilityScore(contentAnalysis);

      const analysis = {
        score,
        issues,
        recommendations,
        keywords,
        readabilityScore,
        analyzedAt: new Date(),
      } as SEOAnalysis;

      // Store analysis in database
      await this.storeAnalysis(pageId, analysis);

      return analysis;
    } catch (error) {
      console.error('SEO analysis failed:', error);
      throw new Error('Failed to analyze page for SEO');
    }
  }

  /**
   * Generate meta tags for a page
   */
  generateMetaTags(page: any, baseUrl: string): MetaTags {
    const seoData = page.seoData || {};
    const isArticle = !!page.author; // Blog post detection

    const metaTags: MetaTags = {
      title: seoData.metaTitle || page.title,
      description: seoData.metaDescription || page.description,
      canonical: seoData.canonicalUrl || `${baseUrl}/${page.slug}`,
      robots: this.generateRobotsTag(seoData),
    };

    // Open Graph tags
    metaTags['og:title'] = seoData.ogTitle || page.title;
    metaTags['og:description'] = seoData.ogDescription || page.description;
    metaTags['og:url'] = `${baseUrl}/${page.slug}`;
    metaTags['og:type'] = isArticle ? 'article' : 'website';
    metaTags['og:site_name'] = this.config.siteName;
    
    if (seoData.ogImage || page.featuredImage) {
      metaTags['og:image'] = seoData.ogImage || page.featuredImage;
    } else if (this.config.defaultImage) {
      metaTags['og:image'] = this.config.defaultImage;
    }

    // Twitter Card tags
    metaTags['twitter:card'] = seoData.twitterCard || 'summary_large_image';
    metaTags['twitter:title'] = seoData.twitterTitle || page.title;
    metaTags['twitter:description'] = seoData.twitterDescription || page.description;
    
    if (seoData.twitterImage || page.featuredImage) {
      metaTags['twitter:image'] = seoData.twitterImage || page.featuredImage;
    }
    
    if (this.config.twitterHandle) {
      metaTags['twitter:site'] = this.config.twitterHandle;
      metaTags['twitter:creator'] = this.config.twitterHandle;
    }

    // Keywords
    if (seoData.keywords && seoData.keywords.length > 0) {
      metaTags.keywords = seoData.keywords.join(', ');
    }

    return metaTags;
  }

  /**
   * Generate structured data for different content types
   */
  generateStructuredData(page: any, contentType: 'WebPage' | 'Article' | 'BlogPosting' = 'WebPage'): StructuredData {
    const baseUrl = this.config.baseUrl;
    const isArticle = contentType === 'Article' || contentType === 'BlogPosting';

    const structuredData: StructuredData = {
      '@context': 'https://schema.org',
      '@type': contentType,
      name: page.title,
      headline: page.title,
      description: page.description,
      url: `${baseUrl}/${page.slug}`,
    };

    if (isArticle) {
      structuredData.author = {
        '@type': 'Person',
        name: page.author || this.config.defaultAuthor,
      };

      if (page.publishedAt) {
        structuredData.datePublished = page.publishedAt.toISOString();
      }

      if (page.updatedAt) {
        structuredData.dateModified = page.updatedAt.toISOString();
      }

      structuredData.publisher = {
        '@type': 'Organization',
        name: this.config.siteName,
        logo: {
          '@type': 'ImageObject',
          url: this.config.defaultImage,
        },
      };
    }

    if (page.featuredImage) {
      structuredData.image = page.featuredImage;
    }

    return structuredData;
  }

  /**
   * Get latest SEO analysis for a page
   */
  async getPageAnalysis(pageId: string): Promise<SEOAnalysis | null> {
    try {
      const [analysis] = await db
        .select()
        .from(seoAnalysis)
        .where(eq(seoAnalysis.pageId, pageId))
        .orderBy(desc(seoAnalysis.analyzedAt))
        .limit(1);

      if (!analysis) {
        return null;
      }

      return {
        score: analysis.score,
        issues: analysis.issues as SEOIssue[],
        recommendations: analysis.recommendations as SEORecommendation[],
        keywords: analysis.keywords as string[],
        readabilityScore: analysis.readabilityScore || undefined,
        performanceScore: analysis.performanceScore || undefined,
        analyzedAt: analysis.analyzedAt,
      };
    } catch (error) {
      console.error('Failed to get SEO analysis:', error);
      return null;
    }
  }

  /**
   * Extract content from component tree for analysis
   */
  private extractContentFromComponents(components: any[]): ContentAnalysis {
    let textContent = '';
    const headings: { level: number; text: string }[] = [];
    const images: { src: string; alt?: string }[] = [];
    const links: { href: string; text: string; isInternal: boolean }[] = [];

    const extractFromComponent = (component: any) => {
      if (!component) return;

      // Extract text content based on component type
      switch (component.type) {
        case 'heading':
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          const level = component.type === 'heading' 
            ? parseInt(component.props?.level || '1') 
            : parseInt(component.type.slice(1));
          const headingText = component.props?.children || component.props?.text || '';
          headings.push({ level, text: headingText });
          textContent += headingText + ' ';
          break;

        case 'paragraph':
        case 'text':
          const text = component.props?.children || component.props?.text || '';
          textContent += text + ' ';
          break;

        case 'image':
          images.push({
            src: component.props?.src || '',
            alt: component.props?.alt,
          });
          break;

        case 'link':
        case 'a':
          const href = component.props?.href || '';
          const linkText = component.props?.children || component.props?.text || '';
          const isInternal = href.startsWith('/') || href.includes(this.config.baseUrl);
          links.push({ href, text: linkText, isInternal });
          textContent += linkText + ' ';
          break;
      }

      // Recursively process children
      if (component.children && Array.isArray(component.children)) {
        component.children.forEach(extractFromComponent);
      }
    };

    if (Array.isArray(components)) {
      components.forEach(extractFromComponent);
    }

    const wordCount = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    return {
      textContent: textContent.trim(),
      headings,
      images,
      links,
      wordCount,
      readingTime,
    };
  }

  /**
   * Analyze title tag for SEO best practices
   */
  private analyzeTitleTag(
    title: string,
    seoData: any,
    issues: SEOIssue[],
    _recommendations: SEORecommendation[]
  ) {
    const effectiveTitle = seoData?.metaTitle || title;

    if (!effectiveTitle || effectiveTitle.trim().length === 0) {
      issues.push({
        type: 'missing_title',
        severity: 'critical',
        message: 'Page is missing a title tag',
        recommendation: 'Add a descriptive title tag that accurately describes the page content',
        impact: 'Title tags are crucial for search engine rankings and click-through rates',
      });
    } else {
      if (effectiveTitle.length > 60) {
        issues.push({
          type: 'title_too_long',
          severity: 'medium',
          message: `Title tag is ${effectiveTitle.length} characters (recommended: 50-60)`,
          recommendation: 'Shorten the title to 50-60 characters to prevent truncation in search results',
          impact: 'Long titles may be truncated in search results, reducing click-through rates',
        });
      } else if (effectiveTitle.length < 30) {
        issues.push({
          type: 'title_too_short',
          severity: 'low',
          message: `Title tag is ${effectiveTitle.length} characters (recommended: 50-60)`,
          recommendation: 'Consider expanding the title to better describe the page content',
          impact: 'Short titles may not provide enough context for users and search engines',
        });
      }
    }
  }

  /**
   * Analyze meta description for SEO best practices
   */
  private analyzeMetaDescription(
    description: string | null,
    seoData: any,
    issues: SEOIssue[],
    _recommendations: SEORecommendation[]
  ) {
    const effectiveDescription = seoData?.metaDescription || description;

    if (!effectiveDescription || effectiveDescription.trim().length === 0) {
      issues.push({
        type: 'missing_description',
        severity: 'high',
        message: 'Page is missing a meta description',
        recommendation: 'Add a compelling meta description that summarizes the page content',
        impact: 'Meta descriptions influence click-through rates from search results',
      });
    } else {
      if (effectiveDescription.length > 160) {
        issues.push({
          type: 'description_too_long',
          severity: 'medium',
          message: `Meta description is ${effectiveDescription.length} characters (recommended: 150-160)`,
          recommendation: 'Shorten the meta description to 150-160 characters',
          impact: 'Long descriptions may be truncated in search results',
        });
      } else if (effectiveDescription.length < 120) {
        issues.push({
          type: 'description_too_short',
          severity: 'low',
          message: `Meta description is ${effectiveDescription.length} characters (recommended: 150-160)`,
          recommendation: 'Consider expanding the meta description to better describe the page',
          impact: 'Short descriptions may not provide enough context for users',
        });
      }
    }
  }

  /**
   * Analyze content structure for SEO best practices
   */
  private analyzeContentStructure(
    content: ContentAnalysis,
    issues: SEOIssue[],
    _recommendations: SEORecommendation[]
  ) {
    // Check for H1 tag
    const h1Tags = content.headings.filter(h => h.level === 1);
    
    if (h1Tags.length === 0) {
      issues.push({
        type: 'missing_h1',
        severity: 'high',
        message: 'Page is missing an H1 heading',
        recommendation: 'Add a single H1 heading that describes the main topic of the page',
        impact: 'H1 tags help search engines understand the main topic of the page',
      });
    } else if (h1Tags.length > 1) {
      issues.push({
        type: 'multiple_h1',
        severity: 'medium',
        message: `Page has ${h1Tags.length} H1 headings (recommended: 1)`,
        recommendation: 'Use only one H1 heading per page and use H2-H6 for subheadings',
        impact: 'Multiple H1 tags can confuse search engines about the page topic',
      });
    }

    // Check heading hierarchy
    let previousLevel = 0;
    let hasHierarchyIssues = false;
    
    for (const heading of content.headings) {
      if (previousLevel > 0 && heading.level > previousLevel + 1) {
        hasHierarchyIssues = true;
        break;
      }
      previousLevel = heading.level;
    }

    if (hasHierarchyIssues) {
      issues.push({
        type: 'poor_heading_structure',
        severity: 'low',
        message: 'Heading hierarchy has gaps (e.g., H1 followed by H3)',
        recommendation: 'Use proper heading hierarchy (H1 → H2 → H3, etc.) for better structure',
        impact: 'Poor heading structure can affect accessibility and SEO',
      });
    }

    // Check content length
    if (content.wordCount < 300) {
      issues.push({
        type: 'low_text_content',
        severity: 'medium',
        message: `Page has ${content.wordCount} words (recommended: 300+)`,
        recommendation: 'Add more valuable content to provide better user experience',
        impact: 'Pages with little content may not rank well for competitive keywords',
      });
    }
  }

  /**
   * Analyze images for SEO best practices
   */
  private analyzeImages(
    images: { src: string; alt?: string }[],
    issues: SEOIssue[],
    _recommendations: SEORecommendation[]
  ) {
    const imagesWithoutAlt = images.filter(img => !img.alt || img.alt.trim().length === 0);
    
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'missing_alt_text',
        severity: 'medium',
        message: `${imagesWithoutAlt.length} image(s) missing alt text`,
        recommendation: 'Add descriptive alt text to all images for accessibility and SEO',
        impact: 'Missing alt text affects accessibility and image search rankings',
      });
    }
  }

  /**
   * Analyze links for SEO best practices
   */
  private analyzeLinks(
    links: { href: string; text: string; isInternal: boolean }[],
    issues: SEOIssue[],
    recommendations: SEORecommendation[]
  ) {
    const internalLinks = links.filter(link => link.isInternal);

    if (internalLinks.length === 0 && links.length > 0) {
      recommendations.push({
        type: 'internal_linking',
        priority: 'medium',
        title: 'Add Internal Links',
        description: 'No internal links found on this page',
        action: 'Add relevant internal links to improve site navigation and SEO',
        estimatedImpact: 'Internal links help distribute page authority and improve user engagement',
      });
    }

    // Check for broken or suspicious links
    const suspiciousLinks = links.filter(link => 
      !link.href || 
      link.href === '#' || 
      link.href.startsWith('javascript:')
    );

    if (suspiciousLinks.length > 0) {
      issues.push({
        type: 'broken_links',
        severity: 'low',
        message: `${suspiciousLinks.length} potentially broken or empty link(s) found`,
        recommendation: 'Review and fix broken or empty links',
        impact: 'Broken links provide poor user experience and may affect SEO',
      });
    }
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - in production, you might use more sophisticated NLP
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));

    // Count word frequency
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Return top keywords
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Analyze keyword usage for SEO
   */
  private analyzeKeywordUsage(
    keywords: string[],
    content: ContentAnalysis,
    title: string,
    issues: SEOIssue[],
    recommendations: SEORecommendation[]
  ) {
    if (keywords.length === 0) {
      recommendations.push({
        type: 'keyword_optimization',
        priority: 'medium',
        title: 'Optimize for Keywords',
        description: 'No clear focus keywords identified',
        action: 'Research and target specific keywords relevant to your content',
        estimatedImpact: 'Keyword optimization can improve search engine rankings',
      });
      return;
    }

    // Check if primary keyword appears in title
    const primaryKeyword = keywords[0];
    if (!primaryKeyword) return;
    
    const titleLower = title.toLowerCase();
    
    if (!titleLower.includes(primaryKeyword)) {
      recommendations.push({
        type: 'keyword_in_title',
        priority: 'high',
        title: 'Include Primary Keyword in Title',
        description: `Primary keyword "${primaryKeyword}" not found in title`,
        action: 'Include your primary keyword in the page title for better SEO',
        estimatedImpact: 'Keywords in titles have strong SEO impact',
      });
    }

    // Check keyword density
    const totalWords = content.wordCount;
    const keywordCount = content.textContent.toLowerCase().split(primaryKeyword).length - 1;
    const density = (keywordCount / totalWords) * 100;

    if (density > 3) {
      issues.push({
        type: 'poor_keyword_density',
        severity: 'low',
        message: `Keyword density for "${primaryKeyword}" is ${density.toFixed(1)}% (recommended: 1-2%)`,
        recommendation: 'Reduce keyword usage to avoid over-optimization',
        impact: 'High keyword density may be seen as spam by search engines',
      });
    } else if (density < 0.5 && keywordCount > 0) {
      recommendations.push({
        type: 'keyword_density',
        priority: 'low',
        title: 'Increase Keyword Usage',
        description: `Keyword density for "${primaryKeyword}" is ${density.toFixed(1)}%`,
        action: 'Consider using your primary keyword more naturally throughout the content',
        estimatedImpact: 'Appropriate keyword usage can improve relevance signals',
      });
    }
  }

  /**
   * Calculate overall SEO score based on issues
   */
  private calculateSEOScore(issues: SEOIssue[]): number {
    let score = 100;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  /**
   * Calculate readability score using Flesch Reading Ease formula
   */
  private calculateReadabilityScore(content: ContentAnalysis): number {
    const sentences = content.textContent.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = content.wordCount;
    const syllables = this.countSyllables(content.textContent);

    if (sentences === 0 || words === 0) return 0;

    // Flesch Reading Ease Score
    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    
    // Convert to 0-100 scale where 100 is most readable
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in text (simplified algorithm)
   */
  private countSyllables(text: string): number {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    let syllableCount = 0;

    words.forEach(word => {
      // Count vowel groups
      const vowelGroups = word.match(/[aeiouy]+/g) || [];
      let syllables = vowelGroups.length;

      // Subtract silent e
      if (word.endsWith('e') && syllables > 1) {
        syllables--;
      }

      // Minimum of 1 syllable per word
      syllables = Math.max(1, syllables);
      syllableCount += syllables;
    });

    return syllableCount;
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'among', 'this', 'that', 'these', 'those', 'i',
      'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
      'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
      'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
      'what', 'which', 'who', 'whom', 'whose', 'this', 'that', 'these', 'those', 'am',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having',
      'do', 'does', 'did', 'doing', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'can', 'shall'
    ]);

    return stopWords.has(word);
  }

  /**
   * Generate robots meta tag
   */
  private generateRobotsTag(seoData: any): string {
    const directives: string[] = [];

    if (seoData.noIndex) {
      directives.push('noindex');
    } else {
      directives.push('index');
    }

    if (seoData.noFollow) {
      directives.push('nofollow');
    } else {
      directives.push('follow');
    }

    return directives.join(', ');
  }

  /**
   * Store SEO analysis in database
   */
  private async storeAnalysis(pageId: string, analysis: SEOAnalysis): Promise<void> {
    try {
      await db.insert(seoAnalysis).values({
        pageId,
        score: analysis.score,
        issues: analysis.issues,
        recommendations: analysis.recommendations,
        keywords: analysis.keywords,
        readabilityScore: analysis.readabilityScore || null,
        performanceScore: analysis.performanceScore || null,
        analyzedAt: analysis.analyzedAt,
      });
    } catch (error) {
      console.error('Failed to store SEO analysis:', error);
      // Don't throw error - analysis can still be returned even if storage fails
    }
  }
}

// Export singleton instance
export const seoService = new SEOService({
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  siteName: process.env.SITE_NAME || 'Visual Website Builder',
  defaultAuthor: process.env.DEFAULT_AUTHOR || 'Website Builder',
  defaultImage: process.env.DEFAULT_OG_IMAGE || '/og-image.jpg',
  twitterHandle: process.env.TWITTER_HANDLE || undefined,
});