import { ProgressionStrategyType } from '../enums/progression-strategy-type.js';
import type { ProgressionContext, ProgressionRuleConfig, ProgressionSuggestion } from './types.js';
import { progressionStrategies } from './progression-strategies.js';

export class ProgressionEngine {
  /**
   * Generates a progression suggestion for a given exercise context and strategy.
   * Deterministic, explainable, and never executes automatically.
   */
  static evaluate(
    context: ProgressionContext,
    ruleConfig?: ProgressionRuleConfig,
    fallbackStrategy: ProgressionStrategyType = ProgressionStrategyType.DOUBLE_PROGRESSION,
  ): ProgressionSuggestion | null {
    const strategyType = ruleConfig?.type ?? fallbackStrategy;
    const strategy = progressionStrategies[strategyType];
    if (!strategy) {
      return null;
    }

    const config = ruleConfig && 'config' in ruleConfig ? ruleConfig.config : undefined;
    return strategy.evaluate(context, config);
  }

  /**
   * Evaluates multiple exercises and returns suggestions for those with applicable progressions.
   */
  static evaluateBatch(
    contexts: readonly {
      context: ProgressionContext;
      ruleConfig?: ProgressionRuleConfig;
    }[],
  ): readonly ProgressionSuggestion[] {
    const results: ProgressionSuggestion[] = [];
    for (const item of contexts) {
      const suggestion = this.evaluate(item.context, item.ruleConfig);
      if (suggestion) {
        results.push(suggestion);
      }
    }
    return results;
  }
}
