/**
 * Optional periodization phase for a program week.
 * Based on TRAINING_MODEL.md and design.md specifications.
 */
export enum WeekPhase {
  NORMAL = 'NORMAL',
  ACCUMULATION = 'ACCUMULATION',
  INTENSIFICATION = 'INTENSIFICATION',
  DELOAD = 'DELOAD',
  TEST = 'TEST',
}
