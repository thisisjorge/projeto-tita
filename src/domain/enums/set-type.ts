/**
 * Canonical set types supported in Projeto Titã.
 * Based on TRAINING_MODEL.md and design.md specifications.
 */
export enum SetType {
  NORMAL = 'NORMAL',
  WARMUP = 'WARMUP',
  TOP_SET = 'TOP_SET',
  BACKOFF = 'BACKOFF',
  DROP_SET = 'DROP_SET',
  REST_PAUSE = 'REST_PAUSE',
  MYO_REP = 'MYO_REP',
  AMRAP = 'AMRAP',
  FAILURE = 'FAILURE',
  CLUSTER = 'CLUSTER',
  PAUSED = 'PAUSED',
  TEMPO = 'TEMPO',
  ISOMETRIC = 'ISOMETRIC',
}

/**
 * Returns true if the set type represents a working set (counts towards training volume).
 * Warmups generally do not count towards effective working volume.
 */
export function isWorkingSet(type: SetType): boolean {
  return type !== SetType.WARMUP;
}
