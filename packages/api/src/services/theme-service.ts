import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, themes } from '../db/index';
import {
  ThemeColorsSchema,
  ThemeTypographySchema,
} from '@oldworldcharm/shared';

// CSS generation types
interface CSSCustomProperties {
  [key: string]: string;
}

interface ThemeConfig {
  colors: z.infer<typeof ThemeColorsSchema>;
  typography: z.infer<typeof ThemeTypographySchema>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
}

// Accessibility validation result
interface AccessibilityValidationResult {
  isValid: boolean;
  issues: AccessibilityIssue[];
  score: number;
}

interface AccessibilityIssue {
  type: 'contrast' | 'color-blindness' | 'readability';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  colors?: {
    foreground: string;
    background: string;
    ratio: number;
  };
}

export class ThemeService {
  /**
   * Generate CSS custom properties from theme configuration
   */
  static generateCSSCustomProperties(themeConfig: ThemeConfig): CSSCustomProperties {
    const cssProperties: CSSCustomProperties = {};

    // Generate color custom properties
    Object.entries(themeConfig.colors).forEach(([key, value]) => {
      cssProperties[`--color-${key}`] = value;
      
      // Generate HSL values for better manipulation
      const hsl = this.hexToHsl(value);
      if (hsl) {
        cssProperties[`--color-${key}-h`] = hsl.h.toString();
        cssProperties[`--color-${key}-s`] = `${hsl.s}%`;
        cssProperties[`--color-${key}-l`] = `${hsl.l}%`;
      }
    });

    // Generate typography custom properties
    cssProperties['--font-family'] = themeConfig.typography.fontFamily;
    if (themeConfig.typography.headingFont) {
      cssProperties['--font-family-heading'] = themeConfig.typography.headingFont;
    }

    Object.entries(themeConfig.typography.fontSize || {}).forEach(([key, value]) => {
      cssProperties[`--font-size-${key}`] = value;
    });

    Object.entries(themeConfig.typography.fontWeight || {}).forEach(([key, value]) => {
      cssProperties[`--font-weight-${key}`] = value.toString();
    });

    Object.entries(themeConfig.typography.lineHeight || {}).forEach(([key, value]) => {
      cssProperties[`--line-height-${key}`] = value;
    });

    if (themeConfig.typography.letterSpacing) {
      Object.entries(themeConfig.typography.letterSpacing).forEach(([key, value]) => {
        cssProperties[`--letter-spacing-${key}`] = value;
      });
    }

    // Generate spacing custom properties
    Object.entries(themeConfig.spacing || {}).forEach(([key, value]) => {
      cssProperties[`--spacing-${key}`] = value;
    });

    // Generate border radius custom properties
    Object.entries(themeConfig.borderRadius || {}).forEach(([key, value]) => {
      cssProperties[`--border-radius-${key}`] = value;
    });

    // Generate shadow custom properties
    Object.entries(themeConfig.shadows || {}).forEach(([key, value]) => {
      cssProperties[`--shadow-${key}`] = value;
    });

    return cssProperties;
  }

  /**
   * Generate complete CSS from theme configuration
   */
  static generateCSS(themeConfig: ThemeConfig, selector: string = ':root'): string {
    const customProperties = this.generateCSSCustomProperties(themeConfig);
    
    let css = `${selector} {\n`;
    Object.entries(customProperties).forEach(([property, value]) => {
      css += `  ${property}: ${value};\n`;
    });
    css += '}\n\n';

    // Add utility classes for common patterns
    css += this.generateUtilityClasses();

    return css;
  }

  /**
   * Generate utility CSS classes
   */
  private static generateUtilityClasses(): string {
    return `
/* Theme-aware utility classes */
.theme-bg-primary { background-color: var(--color-primary); }
.theme-bg-secondary { background-color: var(--color-secondary); }
.theme-bg-accent { background-color: var(--color-accent); }
.theme-bg-background { background-color: var(--color-background); }
.theme-bg-card { background-color: var(--color-card); }
.theme-bg-muted { background-color: var(--color-muted); }

.theme-text-primary { color: var(--color-primary); }
.theme-text-secondary { color: var(--color-secondary); }
.theme-text-accent { color: var(--color-accent); }
.theme-text-foreground { color: var(--color-foreground); }
.theme-text-muted { color: var(--color-muted-foreground); }

.theme-border-primary { border-color: var(--color-primary); }
.theme-border-secondary { border-color: var(--color-secondary); }
.theme-border-border { border-color: var(--color-border); }

.theme-font-body { font-family: var(--font-family); }
.theme-font-heading { font-family: var(--font-family-heading, var(--font-family)); }

/* Responsive spacing utilities */
.theme-p-xs { padding: var(--spacing-xs, 0.25rem); }
.theme-p-sm { padding: var(--spacing-sm, 0.5rem); }
.theme-p-md { padding: var(--spacing-md, 1rem); }
.theme-p-lg { padding: var(--spacing-lg, 1.5rem); }
.theme-p-xl { padding: var(--spacing-xl, 2rem); }

.theme-m-xs { margin: var(--spacing-xs, 0.25rem); }
.theme-m-sm { margin: var(--spacing-sm, 0.5rem); }
.theme-m-md { margin: var(--spacing-md, 1rem); }
.theme-m-lg { margin: var(--spacing-lg, 1.5rem); }
.theme-m-xl { margin: var(--spacing-xl, 2rem); }

/* Border radius utilities */
.theme-rounded-sm { border-radius: var(--border-radius-sm, 0.125rem); }
.theme-rounded-md { border-radius: var(--border-radius-md, 0.375rem); }
.theme-rounded-lg { border-radius: var(--border-radius-lg, 0.5rem); }
.theme-rounded-xl { border-radius: var(--border-radius-xl, 0.75rem); }

/* Shadow utilities */
.theme-shadow-sm { box-shadow: var(--shadow-sm); }
.theme-shadow-md { box-shadow: var(--shadow-md); }
.theme-shadow-lg { box-shadow: var(--shadow-lg); }
.theme-shadow-xl { box-shadow: var(--shadow-xl); }
`;
  }

  /**
   * Validate theme accessibility
   */
  static validateAccessibility(themeConfig: ThemeConfig): AccessibilityValidationResult {
    const issues: AccessibilityIssue[] = [];
    let score = 100;

    // Check color contrast ratios
    const contrastChecks = [
      { fg: themeConfig.colors.foreground, bg: themeConfig.colors.background, context: 'main text' },
      { fg: themeConfig.colors['muted-foreground'], bg: themeConfig.colors.muted, context: 'muted text' },
      { fg: themeConfig.colors['card-foreground'], bg: themeConfig.colors.card, context: 'card text' },
      { fg: themeConfig.colors['popover-foreground'], bg: themeConfig.colors.popover, context: 'popover text' },
      { fg: themeConfig.colors.background, bg: themeConfig.colors.primary, context: 'primary button text' },
      { fg: themeConfig.colors.background, bg: themeConfig.colors.secondary, context: 'secondary button text' },
    ];

    contrastChecks.forEach(({ fg, bg, context }) => {
      const ratio = this.calculateContrastRatio(fg, bg);
      
      if (ratio < 4.5) {
        issues.push({
          type: 'contrast',
          severity: ratio < 3 ? 'error' : 'warning',
          message: `Low contrast ratio for ${context}`,
          suggestion: `Consider using darker/lighter colors to improve readability`,
          colors: { foreground: fg, background: bg, ratio },
        });
        score -= ratio < 3 ? 20 : 10;
      }
    });

    // Check for color blindness accessibility
    const colorBlindnessIssues = this.checkColorBlindnessAccessibility(themeConfig.colors);
    issues.push(...colorBlindnessIssues);
    score -= colorBlindnessIssues.length * 5;

    // Check typography readability
    const typographyIssues = this.checkTypographyReadability(themeConfig.typography);
    issues.push(...typographyIssues);
    score -= typographyIssues.length * 5;

    return {
      isValid: issues.filter(issue => issue.severity === 'error').length === 0,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * Calculate contrast ratio between two colors
   */
  private static calculateContrastRatio(color1: string, color2: string): number {
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);
    
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get relative luminance of a color
   */
  private static getLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    if (r === undefined || g === undefined || b === undefined) return 0;

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Convert hex color to RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result && result[1] && result[2] && result[3] ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Convert hex color to HSL
   */
  private static hexToHsl(hex: string): { h: number; s: number; l: number } | null {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return null;

    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  /**
   * Check color blindness accessibility
   */
  private static checkColorBlindnessAccessibility(colors: z.infer<typeof ThemeColorsSchema>): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check if primary and secondary colors are distinguishable for color blind users
    const primaryHsl = this.hexToHsl(colors.primary);
    const secondaryHsl = this.hexToHsl(colors.secondary);
    const errorHsl = this.hexToHsl(colors.error);
    const successHsl = this.hexToHsl(colors.success);

    if (primaryHsl && secondaryHsl) {
      const hueDiff = Math.abs(primaryHsl.h - secondaryHsl.h);
      const lightnessDiff = Math.abs(primaryHsl.l - secondaryHsl.l);
      
      if (hueDiff < 30 && lightnessDiff < 20) {
        issues.push({
          type: 'color-blindness',
          severity: 'warning',
          message: 'Primary and secondary colors may be difficult to distinguish for color blind users',
          suggestion: 'Consider increasing the hue or lightness difference between primary and secondary colors',
        });
      }
    }

    if (errorHsl && successHsl) {
      const hueDiff = Math.abs(errorHsl.h - successHsl.h);
      const lightnessDiff = Math.abs(errorHsl.l - successHsl.l);
      
      if (hueDiff < 60 && lightnessDiff < 30) {
        issues.push({
          type: 'color-blindness',
          severity: 'warning',
          message: 'Error and success colors may be difficult to distinguish for color blind users',
          suggestion: 'Consider using different hues or adding icons/patterns to differentiate states',
        });
      }
    }

    return issues;
  }

  /**
   * Check typography readability
   */
  private static checkTypographyReadability(typography: z.infer<typeof ThemeTypographySchema>): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check if font sizes are accessible
    const fontSizes = typography.fontSize || {};
    Object.entries(fontSizes).forEach(([key, value]) => {
      const sizeInPx = this.convertToPixels(value);
      if (sizeInPx && sizeInPx < 14 && key.includes('body')) {
        issues.push({
          type: 'readability',
          severity: 'warning',
          message: `Font size for ${key} (${value}) may be too small for accessibility`,
          suggestion: 'Consider using at least 14px for body text',
        });
      }
    });

    // Check line height
    const lineHeights = typography.lineHeight || {};
    Object.entries(lineHeights).forEach(([key, value]) => {
      const lineHeight = parseFloat(value);
      if (lineHeight < 1.4 && key.includes('body')) {
        issues.push({
          type: 'readability',
          severity: 'info',
          message: `Line height for ${key} (${value}) may be too tight`,
          suggestion: 'Consider using at least 1.4 for body text line height',
        });
      }
    });

    return issues;
  }

  /**
   * Convert CSS size value to pixels (approximate)
   */
  private static convertToPixels(value: string): number | null {
    const match = value.match(/^(\d+(?:\.\d+)?)(px|rem|em)$/);
    if (!match || !match[1] || !match[2]) return null;

    const [, num, unit] = match;
    const numValue = parseFloat(num);

    switch (unit) {
      case 'px': return numValue;
      case 'rem': return numValue * 16; // Assuming 16px base
      case 'em': return numValue * 16; // Simplified assumption
      default: return null;
    }
  }

  /**
   * Create a theme version for rollback capability
   */
  static async createThemeVersion(themeId: string, changeNote?: string): Promise<string> {
    try {
      // Get current theme
      const [currentTheme] = await db
        .select()
        .from(themes)
        .where(eq(themes.id, themeId))
        .limit(1);

      if (!currentTheme) {
        throw new Error('Theme not found');
      }

      // This would typically go to a theme_versions table
      // For now, we'll simulate versioning by storing in a JSON structure
      const versionData = {
        id: `${themeId}-v${Date.now()}`,
        themeId,
        version: Date.now(),
        config: currentTheme.config,
        createdAt: new Date(),
        changeNote,
      };

      // In a real implementation, you'd store this in a theme_versions table
      // For now, we'll return the version ID
      return versionData.id;
    } catch (error) {
      throw new Error(`Failed to create theme version: ${error}`);
    }
  }

  /**
   * Apply theme to generate preview CSS
   */
  static generatePreviewCSS(themeConfig: ThemeConfig, previewSelector: string = '.theme-preview'): string {
    const css = this.generateCSS(themeConfig, previewSelector);
    
    // Add preview-specific styles
    const previewStyles = `
${previewSelector} {
  transition: all 0.3s ease;
  position: relative;
}

${previewSelector} * {
  transition: color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease;
}

/* Preview component styles */
${previewSelector} .preview-card {
  background-color: var(--color-card);
  color: var(--color-card-foreground);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md, 0.375rem);
  padding: var(--spacing-md, 1rem);
  box-shadow: var(--shadow-sm);
}

${previewSelector} .preview-button-primary {
  background-color: var(--color-primary);
  color: var(--color-background);
  border: none;
  border-radius: var(--border-radius-sm, 0.125rem);
  padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
  font-family: var(--font-family);
  font-weight: var(--font-weight-medium, 500);
}

${previewSelector} .preview-button-secondary {
  background-color: var(--color-secondary);
  color: var(--color-background);
  border: none;
  border-radius: var(--border-radius-sm, 0.125rem);
  padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
  font-family: var(--font-family);
  font-weight: var(--font-weight-medium, 500);
}

${previewSelector} .preview-text {
  color: var(--color-foreground);
  font-family: var(--font-family);
  line-height: var(--line-height-base, 1.5);
}

${previewSelector} .preview-muted {
  color: var(--color-muted-foreground);
  font-size: var(--font-size-sm, 0.875rem);
}
`;

    return css + previewStyles;
  }

  /**
   * Get theme by ID with config parsing
   */
  static async getThemeById(themeId: string): Promise<{ theme: any; config: ThemeConfig } | null> {
    try {
      const [theme] = await db
        .select()
        .from(themes)
        .where(eq(themes.id, themeId))
        .limit(1);

      if (!theme) return null;

      const config = theme.config as ThemeConfig;
      return { theme, config };
    } catch (error) {
      throw new Error(`Failed to get theme: ${error}`);
    }
  }

  /**
   * Get default theme
   */
  static async getDefaultTheme(): Promise<{ theme: any; config: ThemeConfig } | null> {
    try {
      const [theme] = await db
        .select()
        .from(themes)
        .where(eq(themes.isDefault, true))
        .limit(1);

      if (!theme) return null;

      const config = theme.config as ThemeConfig;
      return { theme, config };
    } catch (error) {
      throw new Error(`Failed to get default theme: ${error}`);
    }
  }
}