import { describe, it, expect } from 'vitest';
import { PlateauDetector, DISCLAIMER_TEXT } from '../../src/domain/analytics/plateau-detector.js';
import type { WorkoutSnapshot } from '../../src/domain/entities/workout-snapshot.js';
import { SetType } from '../../src/domain/enums/set-type.js';

describe('PlateauDetector (Deterministic Heuristics)', () => {
  const createSnapshot = (
    id: string,
    completedAt: string,
    exerciseId: string,
    exerciseName: string,
    weight: number,
    reps: number,
  ): WorkoutSnapshot => ({
    id,
    schemaVersion: 1,
    sourceWorkoutId: 'src_' + id,
    title: 'Treino Teste',
    startedAt: completedAt,
    completedAt,
    activeDurationMs: 3600000,
    totalDurationMs: 3600000,
    exercises: [
      {
        exerciseId,
        exerciseName,
        sets: [
          {
            id: 'set_1',
            setNumber: 1,
            type: SetType.NORMAL,
            weight,
            reps,
            completed: true,
            completedAt,
          },
          {
            id: 'set_2',
            setNumber: 2,
            type: SetType.NORMAL,
            weight,
            reps,
            completed: true,
            completedAt,
          },
        ],
        totalVolumeKg: weight * reps * 2,
        totalReps: reps * 2,
      },
    ],
    totalVolumeKg: weight * reps * 2,
    totalReps: reps * 2,
    completedSetsCount: 2,
    revision: 1,
  });

  it('detects STAGNANT_LOAD when an exercise has 4 consecutive exposures with no e1RM progression', () => {
    // 4 sessions with same weight and reps (100kg x 5 reps)
    const snapshots: WorkoutSnapshot[] = [
      createSnapshot('s1', '2026-08-01T10:00:00.000Z', 'ex_bench', 'Supino Reto', 100, 5),
      createSnapshot('s2', '2026-08-08T10:00:00.000Z', 'ex_bench', 'Supino Reto', 100, 5),
      createSnapshot('s3', '2026-08-15T10:00:00.000Z', 'ex_bench', 'Supino Reto', 100, 5),
      createSnapshot('s4', '2026-08-22T10:00:00.000Z', 'ex_bench', 'Supino Reto', 100, 5),
    ];

    const refDate = new Date('2026-08-25T00:00:00.000Z');
    const reports = PlateauDetector.detectPlateausAndAnomalies(snapshots, refDate, 4);

    const stagnant = reports.filter((r) => r.type === 'STAGNANT_LOAD');
    expect(stagnant).toHaveLength(1);
    expect(stagnant[0].exerciseId).toBe('ex_bench');
    expect(stagnant[0].exposuresCount).toBe(4);
    expect(stagnant[0].changePercent).toBe(0);
    expect(stagnant[0].disclaimer).toBe(DISCLAIMER_TEXT);
    expect(stagnant[0].reason).toContain('Sem aumento significativo');
  });

  it('does NOT detect STAGNANT_LOAD when lifter continues to make progress', () => {
    // 4 sessions with progressive overload (100kg -> 102.5kg -> 105kg -> 107.5kg)
    const snapshots: WorkoutSnapshot[] = [
      createSnapshot('s1', '2026-08-01T10:00:00.000Z', 'ex_bench', 'Supino Reto', 100, 5),
      createSnapshot('s2', '2026-08-08T10:00:00.000Z', 'ex_bench', 'Supino Reto', 102.5, 5),
      createSnapshot('s3', '2026-08-15T10:00:00.000Z', 'ex_bench', 'Supino Reto', 105, 5),
      createSnapshot('s4', '2026-08-22T10:00:00.000Z', 'ex_bench', 'Supino Reto', 107.5, 5),
    ];

    const refDate = new Date('2026-08-25T00:00:00.000Z');
    const reports = PlateauDetector.detectPlateausAndAnomalies(snapshots, refDate, 4);

    const stagnant = reports.filter((r) => r.type === 'STAGNANT_LOAD');
    expect(stagnant).toHaveLength(0);
  });

  it('detects EXTENDED_ABSENCE when regular exercise has not been performed for over 28 days', () => {
    const snapshots: WorkoutSnapshot[] = [
      createSnapshot('s1', '2026-06-01T10:00:00.000Z', 'ex_squat', 'Agachamento', 120, 5),
      createSnapshot('s2', '2026-06-08T10:00:00.000Z', 'ex_squat', 'Agachamento', 120, 5),
      createSnapshot('s3', '2026-06-15T10:00:00.000Z', 'ex_squat', 'Agachamento', 120, 5),
    ];

    // Reference date is August 1st (47 days after June 15th)
    const refDate = new Date('2026-08-01T00:00:00.000Z');
    const reports = PlateauDetector.detectPlateausAndAnomalies(snapshots, refDate, 4);

    const absence = reports.filter((r) => r.type === 'EXTENDED_ABSENCE');
    expect(absence).toHaveLength(1);
    expect(absence[0].exerciseId).toBe('ex_squat');
    expect(absence[0].reason).toContain('não executado nos últimos 46');
    expect(absence[0].disclaimer).toBe(DISCLAIMER_TEXT);
  });

  it('detects VOLUME_ANOMALY on acute drop or spike vs rolling sessions', () => {
    // 4 sessions with volume = 100 * 5 * 2 = 1000kg
    // 5th session with volume = 200 * 10 * 2 = 4000kg (spike > 60%)
    const snapshots: WorkoutSnapshot[] = [
      createSnapshot('s1', '2026-08-01T10:00:00.000Z', 'ex_curl', 'Rosca Direta', 30, 10),
      createSnapshot('s2', '2026-08-08T10:00:00.000Z', 'ex_curl', 'Rosca Direta', 30, 10),
      createSnapshot('s3', '2026-08-15T10:00:00.000Z', 'ex_curl', 'Rosca Direta', 30, 10),
      createSnapshot('s4', '2026-08-22T10:00:00.000Z', 'ex_curl', 'Rosca Direta', 30, 10),
      createSnapshot('s5', '2026-08-29T10:00:00.000Z', 'ex_curl', 'Rosca Direta', 70, 15),
    ];

    const refDate = new Date('2026-08-30T00:00:00.000Z');
    const reports = PlateauDetector.detectPlateausAndAnomalies(snapshots, refDate, 4);

    const volumeAnomalies = reports.filter((r) => r.type === 'VOLUME_ANOMALY');
    expect(volumeAnomalies).toHaveLength(1);
    expect(volumeAnomalies[0].typeLabel).toBe('Pico Incomum de Volume');
    expect(volumeAnomalies[0].disclaimer).toBe(DISCLAIMER_TEXT);
  });
});
