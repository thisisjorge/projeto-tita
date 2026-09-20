/**
 * Pluggable progression strategy types supported by Projeto Titã.
 * Based on TRAINING_MODEL.md and design.md specifications.
 */
export enum ProgressionStrategyType {
  MANUAL = 'MANUAL',
  LINEAR_PROGRESSION = 'LINEAR_PROGRESSION',
  DOUBLE_PROGRESSION = 'DOUBLE_PROGRESSION',
  DYNAMIC_DOUBLE_PROGRESSION = 'DYNAMIC_DOUBLE_PROGRESSION',
  REP_GOAL = 'REP_GOAL',
  PERCENTAGE_BASED = 'PERCENTAGE_BASED',
  RPE_RIR_BASED = 'RPE_RIR_BASED',
  TOP_SET_BACKOFF = 'TOP_SET_BACKOFF',
  CUSTOM = 'CUSTOM',
}
