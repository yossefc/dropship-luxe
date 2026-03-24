// ============================================================================
// Product Score Calculator
// ============================================================================
// Filters products based on profitability, demand, logistics, and compliance.
// Score: 0-49 = Not Recommended | 50-64 = Risky | 65-79 = Good | 80-100 = Strong
// ============================================================================

import { AliExpressProductData, ShippingCostResult } from '@domain/ports/outbound/aliexpress.port.js';

// ============================================================================
// Types
// ============================================================================

export interface ProductScoreInput {
  product: AliExpressProductData;
  shippingCost: number;
  targetSellingPrice: number;
  targetCountry: string;
}

export interface ProductScoreResult {
  totalScore: number;
  recommendation: 'NOT_RECOMMENDED' | 'RISKY' | 'GOOD' | 'STRONG';
  breakdown: ScoreBreakdown;
  profitability: ProfitabilityMetrics;
  riskFactors: string[];
  shouldImport: boolean;
}

export interface ScoreBreakdown {
  profitMarginScore: number;      // Max 20 points
  marketDemandScore: number;      // Max 20 points
  logisticsScore: number;         // Max 10 points
  complianceScore: number;        // Max 10 points
  supplierQualityScore: number;   // Max 20 points
  competitivenessScore: number;   // Max 20 points
}

export interface ProfitabilityMetrics {
  costPrice: number;
  shippingCost: number;
  totalCost: number;
  sellingPrice: number;
  grossProfit: number;
  profitMargin: number; // Percentage
  breakEvenUnits: number;
}

// ============================================================================
// High-Risk Categories for Cosmetics
// ============================================================================

const HIGH_RISK_CATEGORIES = [
  'health', 'santé', 'salud', 'gesundheit',
  'supplements', 'compléments', 'suplementos',
  'medicine', 'médicament', 'medicamento',
  'pharma', 'pharmaceutical',
];

const FRAGILE_MATERIALS = [
  'glass', 'verre', 'vidrio', 'vetro', 'glas',
  'ceramic', 'céramique', 'cerámica', 'ceramica', 'keramik',
  'porcelain', 'porcelaine', 'porcelana', 'porcellana', 'porzellan',
];

const COSMETIC_CATEGORIES = [
  'cosmetics', 'cosmétiques', 'cosméticos', 'cosmetici', 'kosmetik',
  'skincare', 'soins', 'cuidado', 'cura', 'hautpflege',
  'makeup', 'maquillage', 'maquillaje', 'trucco', 'make-up',
  'beauty', 'beauté', 'belleza', 'bellezza', 'schönheit',
];

// ============================================================================
// Calculator Class
// ============================================================================

export class ProductScoreCalculator {
  private readonly minScoreForImport = 65;

  /**
   * Calculate the complete product score
   */
  calculate(input: ProductScoreInput): ProductScoreResult {
    const { product, shippingCost, targetSellingPrice } = input;

    // Calculate profitability metrics
    const profitability = this.calculateProfitability(
      product.price,
      shippingCost,
      targetSellingPrice
    );

    // Calculate individual scores
    const profitMarginScore = this.calculateProfitMarginScore(profitability.profitMargin);
    const marketDemandScore = this.calculateMarketDemandScore(product);
    const logisticsScore = this.calculateLogisticsScore(product);
    const complianceScore = this.calculateComplianceScore(product);
    const supplierQualityScore = this.calculateSupplierQualityScore(product);
    const competitivenessScore = this.calculateCompetitivenessScore(product, profitability);

    // Build breakdown
    const breakdown: ScoreBreakdown = {
      profitMarginScore,
      marketDemandScore,
      logisticsScore,
      complianceScore,
      supplierQualityScore,
      competitivenessScore,
    };

    // Calculate total score
    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

    // Determine recommendation
    const recommendation = this.getRecommendation(totalScore);

    // Collect risk factors
    const riskFactors = this.collectRiskFactors(product, profitability, breakdown);

    return {
      totalScore,
      recommendation,
      breakdown,
      profitability,
      riskFactors,
      shouldImport: totalScore >= this.minScoreForImport && riskFactors.length < 3,
    };
  }

  // ============================================================================
  // Profitability Calculation
  // ============================================================================

  private calculateProfitability(
    costPrice: number,
    shippingCost: number,
    sellingPrice: number
  ): ProfitabilityMetrics {
    const totalCost = costPrice + shippingCost;
    const grossProfit = sellingPrice - totalCost;
    const profitMargin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

    // Estimate break-even units (assuming 30% marketing cost)
    const marketingCostPerUnit = sellingPrice * 0.30;
    const netProfitPerUnit = grossProfit - marketingCostPerUnit;
    const breakEvenUnits = netProfitPerUnit > 0 ? Math.ceil(100 / netProfitPerUnit) : Infinity;

    return {
      costPrice,
      shippingCost,
      totalCost,
      sellingPrice,
      grossProfit,
      profitMargin,
      breakEvenUnits,
    };
  }

  // ============================================================================
  // Score Components (Total: 100 points)
  // ============================================================================

  /**
   * Profit Margin Score - Max 20 points
   * Based on: (Selling Price - Cost - Shipping) / Selling Price
   */
  private calculateProfitMarginScore(marginPercent: number): number {
    if (marginPercent >= 60) return 20;
    if (marginPercent >= 50) return 16;
    if (marginPercent >= 40) return 12;
    if (marginPercent >= 30) return 8;
    return 4; // Below 30% = high risk for customer acquisition
  }

  /**
   * Market Demand Score - Max 20 points
   * Based on reviews, order count, and rating
   */
  private calculateMarketDemandScore(product: AliExpressProductData): number {
    let score = 0;

    // Review count (max 10 points)
    if (product.reviewCount > 3000) {
      score += 10;
    } else if (product.reviewCount > 1000) {
      score += 8;
    } else if (product.reviewCount > 500) {
      score += 6;
    } else if (product.reviewCount > 100) {
      score += 4;
    } else {
      score += 2;
    }

    // Order volume / Sales ranking proxy (max 10 points)
    if (product.orderCount > 10000) {
      score += 10;
    } else if (product.orderCount > 5000) {
      score += 8;
    } else if (product.orderCount > 1000) {
      score += 6;
    } else if (product.orderCount > 500) {
      score += 4;
    } else {
      score += 2;
    }

    return score;
  }

  /**
   * Logistics Score - Max 10 points
   * Based on weight and dimensions
   */
  private calculateLogisticsScore(product: AliExpressProductData): number {
    let score = 10; // Start with max and deduct

    // Weight penalty (ideally < 0.5kg)
    if (product.weight > 2) {
      score -= 5;
    } else if (product.weight > 1) {
      score -= 3;
    } else if (product.weight > 0.5) {
      score -= 1;
    }

    // Dimensions penalty (longest side < 30cm ideal)
    const longestSide = Math.max(
      product.dimensions.length,
      product.dimensions.width,
      product.dimensions.height
    );

    if (longestSide > 60) {
      score -= 5;
    } else if (longestSide > 40) {
      score -= 3;
    } else if (longestSide > 30) {
      score -= 1;
    }

    return Math.max(0, score);
  }

  /**
   * Compliance & Return Risk Score - Max 10 points
   * Deductions for high-risk categories
   */
  private calculateComplianceScore(product: AliExpressProductData): number {
    let score = 10; // Start with max

    const categoryLower = product.categoryName.toLowerCase();
    const titleLower = product.title.toLowerCase();
    const combinedText = `${categoryLower} ${titleLower}`;

    // Cosmetics/Health category deduction (-3)
    if (HIGH_RISK_CATEGORIES.some(cat => combinedText.includes(cat))) {
      score -= 3;
    }

    // Cosmetics-specific (reduced deduction as it's our niche)
    if (COSMETIC_CATEGORIES.some(cat => combinedText.includes(cat))) {
      score -= 1; // Minor deduction - we specialize in cosmetics
    }

    // Fragile materials deduction (-2)
    if (FRAGILE_MATERIALS.some(mat => combinedText.includes(mat))) {
      score -= 2;
    }

    // Check attributes for fragile/hazardous materials
    const attributeText = product.attributes
      .map(a => `${a.name} ${a.value}`.toLowerCase())
      .join(' ');

    if (FRAGILE_MATERIALS.some(mat => attributeText.includes(mat))) {
      score -= 1;
    }

    return Math.max(0, score);
  }

  /**
   * Supplier Quality Score - Max 20 points
   * Based on supplier rating and history
   */
  private calculateSupplierQualityScore(product: AliExpressProductData): number {
    let score = 0;

    // Supplier rating (max 10 points)
    if (product.supplierRating >= 4.8) {
      score += 10;
    } else if (product.supplierRating >= 4.5) {
      score += 8;
    } else if (product.supplierRating >= 4.0) {
      score += 6;
    } else if (product.supplierRating >= 3.5) {
      score += 4;
    } else {
      score += 2;
    }

    // Product rating (max 10 points)
    if (product.rating >= 4.8) {
      score += 10;
    } else if (product.rating >= 4.5) {
      score += 8;
    } else if (product.rating >= 4.0) {
      score += 6;
    } else if (product.rating >= 3.5) {
      score += 4;
    } else {
      score += 2;
    }

    return score;
  }

  /**
   * Competitiveness Score - Max 20 points
   * Based on pricing, shipping, and uniqueness
   */
  private calculateCompetitivenessScore(
    product: AliExpressProductData,
    profitability: ProfitabilityMetrics
  ): number {
    let score = 0;

    // Price competitiveness (max 10 points)
    // Lower cost = more room for competitive pricing
    if (product.price < 5) {
      score += 10; // Very low cost = highly competitive
    } else if (product.price < 15) {
      score += 8;
    } else if (product.price < 30) {
      score += 6;
    } else if (product.price < 50) {
      score += 4;
    } else {
      score += 2;
    }

    // Shipping advantage (max 5 points)
    if (product.shippingInfo.freeShippingAvailable) {
      score += 3;
    }
    if (product.shippingInfo.minDays <= 10) {
      score += 2;
    }

    // Margin health for marketing (max 5 points)
    if (profitability.profitMargin >= 50) {
      score += 5; // Healthy margin for paid ads
    } else if (profitability.profitMargin >= 40) {
      score += 3;
    } else if (profitability.profitMargin >= 30) {
      score += 1;
    }

    return score;
  }

  // ============================================================================
  // Recommendation & Risk Assessment
  // ============================================================================

  private getRecommendation(
    score: number
  ): 'NOT_RECOMMENDED' | 'RISKY' | 'GOOD' | 'STRONG' {
    if (score >= 80) return 'STRONG';
    if (score >= 65) return 'GOOD';
    if (score >= 50) return 'RISKY';
    return 'NOT_RECOMMENDED';
  }

  private collectRiskFactors(
    product: AliExpressProductData,
    profitability: ProfitabilityMetrics,
    breakdown: ScoreBreakdown
  ): string[] {
    const risks: string[] = [];

    // Profitability risks
    if (profitability.profitMargin < 30) {
      risks.push('CRITICAL: Profit margin below 30% - unsustainable for paid acquisition');
    } else if (profitability.profitMargin < 40) {
      risks.push('WARNING: Low profit margin may limit marketing budget');
    }

    // Demand risks
    if (product.reviewCount < 100) {
      risks.push('WARNING: Low review count - unproven product demand');
    }

    if (product.orderCount < 500) {
      risks.push('WARNING: Low order volume - limited sales history');
    }

    // Quality risks
    if (product.rating < 4.0) {
      risks.push('CRITICAL: Product rating below 4.0 - quality concerns');
    }

    if (product.supplierRating < 4.0) {
      risks.push('WARNING: Supplier rating below 4.0 - reliability concerns');
    }

    // Logistics risks
    if (product.weight > 2) {
      risks.push('WARNING: Heavy product (>2kg) - high shipping costs');
    }

    if (product.shippingInfo.maxDays > 30) {
      risks.push('WARNING: Long shipping time (>30 days) - customer experience risk');
    }

    // Stock risks
    if (product.stock < 50) {
      risks.push('WARNING: Low stock availability');
    }

    // Compliance risks
    const categoryLower = product.categoryName.toLowerCase();
    if (HIGH_RISK_CATEGORIES.some(cat => categoryLower.includes(cat))) {
      risks.push('COMPLIANCE: High-risk category - requires regulatory review');
    }

    return risks;
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const productScoreCalculator = new ProductScoreCalculator();
