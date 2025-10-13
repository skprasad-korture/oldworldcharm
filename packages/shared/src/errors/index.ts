// Error handling types and utility classes

// Base error class for all application errors
export abstract class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly timestamp: Date;
  readonly details: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date();
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      stack: this.stack,
    };
  }
}

// Validation errors
export class ValidationError extends AppError {
  readonly field: string | undefined;

  constructor(
    message: string,
    field?: string,
    details: Record<string, unknown> = {}
  ) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.field = field;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      field: this.field,
    };
  }
}

// Component-related errors
export class ComponentError extends AppError {
  readonly componentId: string | undefined;
  readonly componentType: string | undefined;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    componentId?: string,
    componentType?: string,
    details: Record<string, unknown> = {}
  ) {
    super(message, code, statusCode, details);
    this.componentId = componentId;
    this.componentType = componentType;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      componentId: this.componentId,
      componentType: this.componentType,
    };
  }
}

export class ComponentNotFoundError extends ComponentError {
  constructor(componentId: string, componentType?: string) {
    super(
      `Component not found: ${componentId}${componentType ? ` (type: ${componentType})` : ''}`,
      'COMPONENT_NOT_FOUND',
      404,
      componentId,
      componentType
    );
  }
}

export class ComponentRegistrationError extends ComponentError {
  constructor(componentType: string, reason: string) {
    super(
      `Failed to register component ${componentType}: ${reason}`,
      'COMPONENT_REGISTRATION_ERROR',
      500,
      undefined,
      componentType
    );
  }
}

// Theme-related errors
export class ThemeError extends AppError {
  readonly themeId: string | undefined;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    themeId?: string,
    details: Record<string, unknown> = {}
  ) {
    super(message, code, statusCode, details);
    this.themeId = themeId;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      themeId: this.themeId,
    };
  }
}

export class ThemeNotFoundError extends ThemeError {
  constructor(themeId: string) {
    super(`Theme not found: ${themeId}`, 'THEME_NOT_FOUND', 404, themeId);
  }
}

export class ThemeValidationError extends ThemeError {
  constructor(
    message: string,
    themeId?: string,
    details: Record<string, unknown> = {}
  ) {
    super(
      `Theme validation failed: ${message}`,
      'THEME_VALIDATION_ERROR',
      400,
      themeId,
      details
    );
  }
}

// Page and content errors
export class PageError extends AppError {
  readonly pageId: string | undefined;
  readonly slug: string | undefined;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    pageId?: string,
    slug?: string,
    details: Record<string, unknown> = {}
  ) {
    super(message, code, statusCode, details);
    this.pageId = pageId;
    this.slug = slug;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      pageId: this.pageId,
      slug: this.slug,
    };
  }
}

export class PageNotFoundError extends PageError {
  constructor(identifier: string, isSlug = false) {
    super(
      `Page not found: ${identifier}`,
      'PAGE_NOT_FOUND',
      404,
      isSlug ? undefined : identifier,
      isSlug ? identifier : undefined
    );
  }
}

export class SlugConflictError extends PageError {
  constructor(slug: string, existingPageId?: string) {
    super(
      `Slug already exists: ${slug}`,
      'SLUG_CONFLICT',
      409,
      existingPageId,
      slug
    );
  }
}

// Media-related errors
export class MediaError extends AppError {
  readonly mediaId: string | undefined;
  readonly filename: string | undefined;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    mediaId?: string,
    filename?: string,
    details: Record<string, unknown> = {}
  ) {
    super(message, code, statusCode, details);
    this.mediaId = mediaId;
    this.filename = filename;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      mediaId: this.mediaId,
      filename: this.filename,
    };
  }
}

export class MediaNotFoundError extends MediaError {
  constructor(identifier: string, isFilename = false) {
    super(
      `Media not found: ${identifier}`,
      'MEDIA_NOT_FOUND',
      404,
      isFilename ? undefined : identifier,
      isFilename ? identifier : undefined
    );
  }
}

export class MediaUploadError extends MediaError {
  constructor(filename: string, reason: string) {
    super(
      `Failed to upload ${filename}: ${reason}`,
      'MEDIA_UPLOAD_ERROR',
      400,
      undefined,
      filename
    );
  }
}

export class MediaProcessingError extends MediaError {
  constructor(mediaId: string, operation: string, reason: string) {
    super(
      `Failed to process media ${mediaId} (${operation}): ${reason}`,
      'MEDIA_PROCESSING_ERROR',
      500,
      mediaId
    );
  }
}

// Build and deployment errors
export class BuildError extends AppError {
  readonly buildId: string | undefined;
  readonly stage: string | undefined;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    buildId?: string,
    stage?: string,
    details: Record<string, unknown> = {}
  ) {
    super(message, code, statusCode, details);
    this.buildId = buildId;
    this.stage = stage;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      buildId: this.buildId,
      stage: this.stage,
    };
  }
}

export class CodeGenerationError extends BuildError {
  constructor(reason: string, buildId?: string) {
    super(
      `Code generation failed: ${reason}`,
      'CODE_GENERATION_ERROR',
      500,
      buildId,
      'code-generation'
    );
  }
}

export class AssetOptimizationError extends BuildError {
  constructor(assetPath: string, reason: string, buildId?: string) {
    super(
      `Asset optimization failed for ${assetPath}: ${reason}`,
      'ASSET_OPTIMIZATION_ERROR',
      500,
      buildId,
      'asset-optimization'
    );
  }
}

export class DeploymentError extends AppError {
  readonly deploymentId: string | undefined;

  constructor(
    message: string,
    deploymentId?: string,
    details: Record<string, unknown> = {}
  ) {
    super(message, 'DEPLOYMENT_ERROR', 500, details);
    this.deploymentId = deploymentId;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      deploymentId: this.deploymentId,
    };
  }
}

// Authentication and authorization errors
export class AuthError extends AppError {
  constructor(
    message: string,
    code: string = 'AUTH_ERROR',
    statusCode: number = 401
  ) {
    super(message, code, statusCode);
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class TokenExpiredError extends AuthError {
  constructor() {
    super('Authentication token has expired', 'TOKEN_EXPIRED', 401);
  }
}

// Database and external service errors
export class DatabaseError extends AppError {
  readonly operation: string | undefined;

  constructor(
    message: string,
    operation?: string,
    details: Record<string, unknown> = {}
  ) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.operation = operation;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      operation: this.operation,
    };
  }
}

export class ExternalServiceError extends AppError {
  readonly service: string | undefined;

  constructor(
    message: string,
    service?: string,
    details: Record<string, unknown> = {}
  ) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, details);
    this.service = service;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      service: this.service,
    };
  }
}

// Rate limiting errors
export class RateLimitError extends AppError {
  readonly retryAfter: number | undefined;

  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.retryAfter = retryAfter;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

// Generic errors
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(
      `${resource} not found${identifier ? `: ${identifier}` : ''}`,
      'NOT_FOUND',
      404
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class InternalServerError extends AppError {
  constructor(
    message = 'An internal server error occurred',
    details: Record<string, unknown> = {}
  ) {
    super(message, 'INTERNAL_SERVER_ERROR', 500, details);
  }
}

// Error handler utility class
export class ErrorHandler {
  /**
   * Determines if an error is an instance of AppError
   */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }

  /**
   * Converts any error to a standardized format
   */
  static normalize(error: unknown): AppError {
    if (this.isAppError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new InternalServerError(error.message, {
        originalError: error.name,
      });
    }

    return new InternalServerError('An unknown error occurred', {
      originalError: String(error),
    });
  }

  /**
   * Formats error for API response
   */
  static formatForAPI(error: unknown) {
    const normalizedError = this.normalize(error);

    return {
      success: false,
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
        details: normalizedError.details,
        ...(normalizedError instanceof ValidationError && {
          field: normalizedError.field,
        }),
      },
      timestamp: normalizedError.timestamp.toISOString(),
    };
  }

  /**
   * Logs error with appropriate level
   */
  static log(error: unknown, context?: Record<string, unknown>) {
    const normalizedError = this.normalize(error);

    const logData = {
      error: normalizedError.toJSON(),
      context,
    };

    // In a real application, you would use a proper logger like Winston or Pino
    if (normalizedError.statusCode >= 500) {
      console.error('Server Error:', logData);
    } else if (normalizedError.statusCode >= 400) {
      console.warn('Client Error:', logData);
    } else {
      console.info('Error:', logData);
    }
  }

  /**
   * Creates a validation error from Zod error
   */
  static fromZodError(zodError: any, context?: string): ValidationError {
    const firstIssue = zodError.issues?.[0];
    if (!firstIssue) {
      return new ValidationError('Validation failed');
    }

    const field = firstIssue.path?.join('.') || undefined;
    const message = context
      ? `${context}: ${firstIssue.message}`
      : firstIssue.message;

    return new ValidationError(message, field, {
      zodError: zodError.issues,
    });
  }
}

// Type guards for error checking
export const isValidationError = (error: unknown): error is ValidationError =>
  error instanceof ValidationError;

export const isComponentError = (error: unknown): error is ComponentError =>
  error instanceof ComponentError;

export const isThemeError = (error: unknown): error is ThemeError =>
  error instanceof ThemeError;

export const isPageError = (error: unknown): error is PageError =>
  error instanceof PageError;

export const isMediaError = (error: unknown): error is MediaError =>
  error instanceof MediaError;

export const isBuildError = (error: unknown): error is BuildError =>
  error instanceof BuildError;

export const isAuthError = (error: unknown): error is AuthError =>
  error instanceof AuthError;

export const isDatabaseError = (error: unknown): error is DatabaseError =>
  error instanceof DatabaseError;
