import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '../db/connection';
import { abTests, abTestResults, userSessions } from '../db/schema';
import { ABTestManager } from '../db/redis';
import type { ABTest, ABTestVariant, ABTestResults } from '@oldworldcharm/shared';


export class ABTestService {
  /**
   * Create a new A/B test
   */
  static async createTest(testData: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ABTest> {
    // Validate traffic split adds up to 100%
    const totalTraffic = Object.values(testData.trafficSplit).reduce((sum, val) => sum + val, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error('Traffic split must add up to 100%');
    }

    // Ensure at least one variant is marked as control
    const hasControl = testData.variants.some(variant => variant.isControl);
    if (!hasControl) {
      throw new Error('At least one variant must be marked as control');
    }

    const [test] = await db
      .insert(abTests)
      .values({
        name: testData.name,
        pageId: testData.pageId,
        variants: testData.variants,
        trafficSplit: testData.trafficSplit,
        status: testData.status || 'draft',
        startDate: testData.startDate || null,
        endDate: testData.endDate || null,
      })
      .returning();

    return this.mapDbTestToABTest(test);
  }

  /**
   * Get A/B test by ID
   */
  static async getTestById(testId: string): Promise<ABTest | null> {
    const [test] = await db
      .select()
      .from(abTests)
      .where(eq(abTests.id, testId))
      .limit(1);

    if (!test) return null;

    return this.mapDbTestToABTest(test);
  }

  /**
   * Get all A/B tests for a page
   */
  static async getTestsByPageId(pageId: string): Promise<ABTest[]> {
    const tests = await db
      .select()
      .from(abTests)
      .where(eq(abTests.pageId, pageId))
      .orderBy(desc(abTests.createdAt));

    return tests.map(test => this.mapDbTestToABTest(test));
  }

  /**
   * Get all A/B tests with optional filtering
   */
  static async getAllTests(filters?: {
    status?: string;
    pageId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ tests: ABTest[]; total: number }> {
    // Apply filters
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(abTests.status, filters.status));
    }
    if (filters?.pageId) {
      conditions.push(eq(abTests.pageId, filters.pageId));
    }

    // Build query with conditions
    const baseQuery = db.select().from(abTests);
    const query = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    // Get total count
    const countQuery = db.select().from(abTests);
    const totalQuery = conditions.length > 0 
      ? countQuery.where(and(...conditions))
      : countQuery;
    const totalResult = await totalQuery;
    const total = totalResult.length;

    // Apply pagination and ordering
    const tests = await query
      .orderBy(desc(abTests.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return {
      tests: tests.map(test => this.mapDbTestToABTest(test)),
      total,
    };
  }

  /**
   * Update A/B test
   */
  static async updateTest(
    testId: string,
    updates: Partial<Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ABTest | null> {
    // Validate traffic split if provided
    if (updates.trafficSplit) {
      const totalTraffic = Object.values(updates.trafficSplit).reduce((sum, val) => sum + val, 0);
      if (Math.abs(totalTraffic - 100) > 0.01) {
        throw new Error('Traffic split must add up to 100%');
      }
    }

    // Ensure at least one variant is marked as control if variants are updated
    if (updates.variants) {
      const hasControl = updates.variants.some(variant => variant.isControl);
      if (!hasControl) {
        throw new Error('At least one variant must be marked as control');
      }
    }

    const [test] = await db
      .update(abTests)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(abTests.id, testId))
      .returning();

    if (!test) return null;

    return this.mapDbTestToABTest(test);
  }

  /**
   * Delete A/B test
   */
  static async deleteTest(testId: string): Promise<boolean> {
    const result = await db
      .delete(abTests)
      .where(eq(abTests.id, testId));

    return result.length > 0;
  }

  /**
   * Start an A/B test
   */
  static async startTest(testId: string): Promise<ABTest | null> {
    const test = await this.getTestById(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status !== 'draft') {
      throw new Error('Only draft tests can be started');
    }

    return this.updateTest(testId, {
      status: 'running',
      startDate: new Date(),
    });
  }

  /**
   * Pause an A/B test
   */
  static async pauseTest(testId: string): Promise<ABTest | null> {
    const test = await this.getTestById(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status !== 'running') {
      throw new Error('Only running tests can be paused');
    }

    return this.updateTest(testId, {
      status: 'paused',
    });
  }

  /**
   * Complete an A/B test
   */
  static async completeTest(testId: string): Promise<ABTest | null> {
    const test = await this.getTestById(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    if (!['running', 'paused'].includes(test.status)) {
      throw new Error('Only running or paused tests can be completed');
    }

    return this.updateTest(testId, {
      status: 'completed',
      endDate: new Date(),
    });
  }

  /**
   * Assign user to A/B test variant
   */
  static async assignUserToVariant(
    testId: string,
    sessionId: string
  ): Promise<{ variantId: string; variant: ABTestVariant } | null> {
    const test = await this.getTestById(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    // Check if user already has an assignment
    const existingVariant = await ABTestManager.getUserVariant(testId, sessionId);
    if (existingVariant) {
      const variant = test.variants.find(v => v.id === existingVariant);
      if (variant) {
        return { variantId: existingVariant, variant };
      }
    }

    // Assign user to variant based on traffic split
    const variantId = this.selectVariantByTrafficSplit(test.trafficSplit);
    const variant = test.variants.find(v => v.id === variantId);
    
    if (!variant) {
      throw new Error('Invalid variant selected');
    }

    // Store assignment in Redis
    await ABTestManager.assignUserToVariant(testId, sessionId, variantId);
    
    // Increment variant count
    await ABTestManager.incrementVariantCount(testId, variantId);

    // Store session assignment in database
    await this.storeSessionAssignment(sessionId, testId, variantId);

    return { variantId, variant };
  }

  /**
   * Record conversion for A/B test
   */
  static async recordConversion(
    testId: string,
    sessionId: string,
    conversionValue?: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const variantId = await ABTestManager.getUserVariant(testId, sessionId);
    if (!variantId) {
      throw new Error('User not assigned to any variant');
    }

    await db.insert(abTestResults).values({
      testId,
      variantId,
      sessionId,
      converted: true,
      conversionValue: conversionValue || 0,
      metadata,
    });
  }

  /**
   * Get detailed A/B test analytics
   */
  static async getDetailedAnalytics(testId: string): Promise<{
    results: ABTestResults;
    timeline: Array<{ date: string; variantId: string; visitors: number; conversions: number }>;
    variantPerformance: Record<string, {
      visitors: number;
      conversions: number;
      conversionRate: number;
      conversionValue: number;
      averageValue: number;
      confidence: number;
    }>;
  } | null> {
    const test = await this.getTestById(testId);
    if (!test) return null;

    // Get conversion data with timeline
    const results = await db
      .select()
      .from(abTestResults)
      .where(eq(abTestResults.testId, testId))
      .orderBy(asc(abTestResults.createdAt));

    // Build timeline data (daily aggregation)
    const timelineMap = new Map<string, Map<string, { visitors: number; conversions: number }>>();
    
    for (const result of results) {
      const date = result.createdAt.toISOString().split('T')[0];
      if (!date) continue;
      
      if (!timelineMap.has(date)) {
        timelineMap.set(date, new Map());
      }
      
      const dayData = timelineMap.get(date);
      if (!dayData) continue;
      
      if (!dayData.has(result.variantId)) {
        dayData.set(result.variantId, { visitors: 0, conversions: 0 });
      }
      
      const variantData = dayData.get(result.variantId);
      if (!variantData) continue;
      variantData.visitors++;
      if (result.converted) {
        variantData.conversions++;
      }
    }

    // Convert timeline to array
    const timeline: Array<{ date: string; variantId: string; visitors: number; conversions: number }> = [];
    for (const [date, variants] of timelineMap) {
      for (const [variantId, data] of variants) {
        timeline.push({
          date,
          variantId,
          visitors: data.visitors,
          conversions: data.conversions,
        });
      }
    }

    // Calculate detailed variant performance
    const variantPerformance: Record<string, {
      visitors: number;
      conversions: number;
      conversionRate: number;
      conversionValue: number;
      averageValue: number;
      confidence: number;
    }> = {};

    for (const variant of test.variants) {
      const variantResults = results.filter(r => r.variantId === variant.id);
      const visitors = await ABTestManager.getVariantCount(testId, variant.id);
      const conversions = variantResults.filter(r => r.converted).length;
      const totalValue = variantResults.reduce((sum, r) => sum + (r.conversionValue || 0), 0);
      
      variantPerformance[variant.id] = {
        visitors,
        conversions,
        conversionRate: visitors > 0 ? conversions / visitors : 0,
        conversionValue: totalValue,
        averageValue: conversions > 0 ? totalValue / conversions : 0,
        confidence: 0, // Will be calculated with statistical analysis
      };
    }

    // Calculate statistical confidence for each variant
    const baselineVariant = test.variants.find(v => v.isControl);
    if (baselineVariant && variantPerformance[baselineVariant.id]) {
      const baseline = variantPerformance[baselineVariant.id];
      
      for (const variant of test.variants) {
        if (variant.id === baselineVariant.id) continue;
        
        const current = variantPerformance[variant.id];
        if (current && baseline) {
          const confidence = this.calculateVariantConfidence(baseline, current);
          current.confidence = confidence;
        }
      }
    }

    const basicResults = await this.getTestResults(testId);
    if (!basicResults) return null;

    return {
      results: basicResults,
      timeline,
      variantPerformance,
    };
  }

  /**
   * Export A/B test results to various formats
   */
  static async exportTestResults(
    testId: string,
    format: 'json' | 'csv' | 'xlsx' = 'json'
  ): Promise<{ data: string | Buffer; filename: string; mimeType: string }> {
    const analytics = await this.getDetailedAnalytics(testId);
    if (!analytics) {
      throw new Error('Test not found');
    }

    const test = await this.getTestById(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `ab-test-${test.name.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}`;

    switch (format) {
      case 'json':
        return {
          data: JSON.stringify({
            test,
            analytics,
            exportedAt: new Date().toISOString(),
          }, null, 2),
          filename: `${baseFilename}.json`,
          mimeType: 'application/json',
        };

      case 'csv':
        const csvData = this.convertToCSV(analytics);
        return {
          data: csvData,
          filename: `${baseFilename}.csv`,
          mimeType: 'text/csv',
        };

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get A/B test summary for dashboard
   */
  static async getTestSummary(testId: string): Promise<{
    test: ABTest;
    status: string;
    duration: number; // in days
    totalVisitors: number;
    totalConversions: number;
    overallConversionRate: number;
    winner?: {
      variantId: string;
      variantName: string;
      improvement: number; // percentage improvement over control
      confidence: number;
    };
    recommendations: string[];
  } | null> {
    const test = await this.getTestById(testId);
    if (!test) return null;

    const analytics = await this.getDetailedAnalytics(testId);
    if (!analytics) return null;

    // Calculate test duration
    const startDate = test.startDate || test.createdAt;
    const endDate = test.endDate || new Date();
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate overall metrics
    const totalVisitors = analytics.results.totalVisitors;
    const totalConversions = Object.values(analytics.results.conversions).reduce((sum, val) => sum + val, 0);
    const overallConversionRate = totalVisitors > 0 ? totalConversions / totalVisitors : 0;

    // Determine winner and improvement
    let winner: {
      variantId: string;
      variantName: string;
      improvement: number;
      confidence: number;
    } | undefined;

    if (analytics.results.winner) {
      const winnerId = analytics.results.winner;
      const winnerVariant = test.variants.find(v => v.id === winnerId);
      const controlVariant = test.variants.find(v => v.isControl);
      
      if (winnerVariant && controlVariant && winnerId) {
        const winnerRate = analytics.results.conversionRates[winnerId];
        const controlRate = analytics.results.conversionRates[controlVariant.id];
        
        if (winnerRate !== undefined && controlRate !== undefined) {
          const improvement = controlRate > 0 ? ((winnerRate - controlRate) / controlRate) * 100 : 0;
          
          winner = {
            variantId: winnerId,
            variantName: winnerVariant.name,
            improvement,
            confidence: analytics.results.confidence,
          };
        }
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(test, analytics);

    const summary = {
      test,
      status: test.status,
      duration,
      totalVisitors,
      totalConversions,
      overallConversionRate,
      recommendations,
    } as any;
    
    if (winner) {
      summary.winner = winner;
    }
    
    return summary;
  }

  /**
   * Get A/B test results and analytics
   */
  static async getTestResults(testId: string): Promise<ABTestResults | null> {
    const test = await this.getTestById(testId);
    if (!test) return null;

    // Get conversion data from database
    const results = await db
      .select()
      .from(abTestResults)
      .where(eq(abTestResults.testId, testId));

    // Calculate metrics per variant
    const variantMetrics: Record<string, { visitors: number; conversions: number; conversionValue: number }> = {};
    
    for (const variant of test.variants) {
      variantMetrics[variant.id] = {
        visitors: await ABTestManager.getVariantCount(testId, variant.id),
        conversions: 0,
        conversionValue: 0,
      };
    }

    // Process results
    for (const result of results) {
      const metrics = variantMetrics[result.variantId];
      if (metrics) {
        if (result.converted) {
          metrics.conversions++;
          metrics.conversionValue += result.conversionValue || 0;
        }
      }
    }

    // Calculate conversion rates and statistical significance
    const totalVisitors = Object.values(variantMetrics).reduce((sum, metrics) => sum + metrics.visitors, 0);
    const conversions: Record<string, number> = {};
    const conversionRates: Record<string, number> = {};

    for (const [variantId, metrics] of Object.entries(variantMetrics)) {
      conversions[variantId] = metrics.conversions;
      conversionRates[variantId] = metrics.visitors > 0 ? metrics.conversions / metrics.visitors : 0;
    }

    // Simple statistical significance calculation (chi-square test)
    const significance = this.calculateStatisticalSignificance(variantMetrics);
    
    // Determine winner (highest conversion rate with sufficient significance)
    let winner: string | undefined;
    let confidence = 0;
    
    if (significance > 0.95) {
      const sortedVariants = Object.entries(conversionRates)
        .sort(([, a], [, b]) => b - a);
      
      if (sortedVariants.length > 1 && sortedVariants[0]) {
        winner = sortedVariants[0][0];
        confidence = significance;
      }
    }

    const testResults: ABTestResults = {
      totalVisitors,
      conversions,
      conversionRates,
      statisticalSignificance: significance,
      confidence,
    };
    
    if (winner) {
      testResults.winner = winner;
    }
    
    return testResults;
  }

  /**
   * Private helper methods
   */
  private static mapDbTestToABTest(dbTest: any): ABTest {
    return {
      id: dbTest.id,
      name: dbTest.name,
      description: dbTest.description,
      pageId: dbTest.pageId,
      variants: dbTest.variants as ABTestVariant[],
      trafficSplit: dbTest.trafficSplit as Record<string, number>,
      status: dbTest.status,
      startDate: dbTest.startDate,
      endDate: dbTest.endDate,
      conversionGoal: dbTest.conversionGoal || 'conversion',
      createdAt: dbTest.createdAt,
      updatedAt: dbTest.updatedAt,
    };
  }

  private static selectVariantByTrafficSplit(trafficSplit: Record<string, number>): string {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const [variantId, percentage] of Object.entries(trafficSplit)) {
      cumulative += percentage;
      if (random <= cumulative) {
        return variantId;
      }
    }

    // Fallback to first variant
    const firstVariant = Object.keys(trafficSplit)[0];
    return firstVariant || 'control';
  }

  private static async storeSessionAssignment(
    sessionId: string,
    testId: string,
    variantId: string
  ): Promise<void> {
    // Check if session exists
    const [existingSession] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionId, sessionId))
      .limit(1);

    if (existingSession) {
      // Update existing session with new test assignment
      const assignments = existingSession.testAssignments as Record<string, string> || {};
      assignments[testId] = variantId;

      await db
        .update(userSessions)
        .set({
          testAssignments: assignments,
          updatedAt: new Date(),
        })
        .where(eq(userSessions.sessionId, sessionId));
    } else {
      // Create new session
      await db.insert(userSessions).values({
        sessionId,
        testAssignments: { [testId]: variantId },
      });
    }
  }

  private static calculateStatisticalSignificance(
    variantMetrics: Record<string, { visitors: number; conversions: number; conversionValue: number }>
  ): number {
    const variants = Object.values(variantMetrics);
    if (variants.length < 2) return 0;

    // Simple chi-square test for statistical significance
    // This is a basic implementation - in production, you might want to use a more sophisticated library
    const totalVisitors = variants.reduce((sum, v) => sum + v.visitors, 0);
    const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);
    
    if (totalVisitors === 0 || totalConversions === 0) return 0;

    const expectedConversionRate = totalConversions / totalVisitors;
    let chiSquare = 0;

    for (const variant of variants) {
      if (variant.visitors === 0) continue;
      
      const expected = variant.visitors * expectedConversionRate;
      const observed = variant.conversions;
      
      if (expected > 0) {
        chiSquare += Math.pow(observed - expected, 2) / expected;
      }
    }

    // Convert chi-square to p-value (simplified)
    // For 1 degree of freedom (2 variants), critical value at 95% confidence is 3.841
    const criticalValue = 3.841; // For 95% confidence with 1 df
    
    return chiSquare > criticalValue ? 0.95 : Math.max(0, 1 - (chiSquare / criticalValue));
  }

  private static calculateVariantConfidence(
    baseline: { visitors: number; conversions: number; conversionRate: number },
    variant: { visitors: number; conversions: number; conversionRate: number }
  ): number {
    // Z-test for difference in proportions
    if (baseline.visitors === 0 || variant.visitors === 0) return 0;

    const p1 = baseline.conversionRate;
    const p2 = variant.conversionRate;
    const n1 = baseline.visitors;
    const n2 = variant.visitors;

    // Pooled proportion
    const pooledP = (baseline.conversions + variant.conversions) / (n1 + n2);
    
    // Standard error
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
    
    if (se === 0) return 0;

    // Z-score
    const z = Math.abs(p2 - p1) / se;
    
    // Convert to confidence level (simplified)
    // Z > 1.96 corresponds to 95% confidence
    if (z > 2.58) return 0.99; // 99% confidence
    if (z > 1.96) return 0.95; // 95% confidence
    if (z > 1.65) return 0.90; // 90% confidence
    if (z > 1.28) return 0.80; // 80% confidence
    
    return Math.min(0.75, z / 1.28 * 0.75); // Scale linearly below 80%
  }

  private static convertToCSV(analytics: any): string {
    const headers = [
      'Variant ID',
      'Variant Name',
      'Visitors',
      'Conversions',
      'Conversion Rate',
      'Conversion Value',
      'Average Value',
      'Confidence'
    ];

    const rows = [headers.join(',')];

    for (const [variantId, performance] of Object.entries(analytics.variantPerformance)) {
      const perf = performance as any;
      const variant = analytics.results.test?.variants?.find((v: any) => v.id === variantId);
      const row = [
        variantId,
        variant?.name || 'Unknown',
        perf.visitors,
        perf.conversions,
        (perf.conversionRate * 100).toFixed(2) + '%',
        perf.conversionValue,
        perf.averageValue.toFixed(2),
        (perf.confidence * 100).toFixed(1) + '%'
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  private static generateRecommendations(test: ABTest, analytics: any): string[] {
    const recommendations: string[] = [];
    const { results, variantPerformance } = analytics;

    // Check if test has enough data
    if (results.totalVisitors < 100) {
      recommendations.push('Collect more data before making decisions. Aim for at least 100 visitors per variant.');
    }

    // Check statistical significance
    if (results.statisticalSignificance < 0.95) {
      recommendations.push('Results are not statistically significant. Continue running the test or increase sample size.');
    }

    // Check for clear winner
    if (results.winner && results.confidence > 0.95) {
      const winner = test.variants.find(v => v.id === results.winner);
      const control = test.variants.find(v => v.isControl);
      
      if (winner && control && results.conversionRates[results.winner] && results.conversionRates[control.id]) {
        const winnerRate = results.conversionRates[results.winner];
        const controlRate = results.conversionRates[control.id];
        const improvement = controlRate > 0 ? ((winnerRate - controlRate) / controlRate) * 100 : 0;
        recommendations.push(`Implement ${winner.name} - it shows ${improvement.toFixed(1)}% improvement with ${(results.confidence * 100).toFixed(1)}% confidence.`);
      }
    }

    // Check test duration
    const duration = test.endDate 
      ? Math.ceil((test.endDate.getTime() - (test.startDate || test.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : Math.ceil((new Date().getTime() - (test.startDate || test.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    if (duration < 7) {
      recommendations.push('Run the test for at least one week to account for weekly patterns in user behavior.');
    }

    // Check for seasonal effects
    if (duration > 30) {
      recommendations.push('Consider seasonal effects - results may vary across different time periods.');
    }

    // Performance recommendations
    const sortedVariants = Object.entries(variantPerformance)
      .sort(([, a], [, b]) => (b as any).conversionRate - (a as any).conversionRate);

    if (sortedVariants.length > 1) {
      const bestEntry = sortedVariants[0];
      const worstEntry = sortedVariants[sortedVariants.length - 1];
      
      if (bestEntry && worstEntry) {
        const [bestId, best] = bestEntry;
        const [, worst] = worstEntry;
        
        if ((best as any).conversionRate > (worst as any).conversionRate * 1.2) {
          const bestVariant = test.variants.find(v => v.id === bestId);
          recommendations.push(`${bestVariant?.name || 'Top variant'} significantly outperforms others. Consider using its elements in future tests.`);
        }
      }
    }

    return recommendations;
  }
}