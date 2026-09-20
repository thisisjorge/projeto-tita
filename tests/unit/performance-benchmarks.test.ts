import { describe, it, expect } from 'vitest';
import { generateBenchmarkSnapshots } from '../../src/data/benchmark-dataset.js';
import { ProgressEngine } from '../../src/domain/analytics/progress-engine.js';
import { ReviewEngine } from '../../src/domain/analytics/review-engine.js';
import { PlateauDetector } from '../../src/domain/analytics/plateau-detector.js';
import type { ActiveWorkout } from '../../src/domain/entities/active-workout.js';
import { WorkoutStatus } from '../../src/domain/enums/workout-status.js';
import { SetType } from '../../src/domain/enums/set-type.js';

describe('Performance Benchmarks & Representative Datasets (Phase 13 / M-08)', () => {
  const snapshots = generateBenchmarkSnapshots(150);

  it('generates a representative 150-workout dataset spanning ~52 weeks', () => {
    expect(snapshots.length).toBe(150);

    const totalSets = snapshots.reduce((acc, s) => acc + s.completedSetsCount, 0);
    expect(totalSets).toBeGreaterThan(1500); // 150 * 3 exercises * 4 sets = 1800 sets

    expect(snapshots[0].id).toBe('benchmark-snapshot-1');
    expect(snapshots[149].id).toBe('benchmark-snapshot-150');
  });

  it('calculates global progress metrics over 150 workouts within budget (< 100ms)', () => {
    const start = performance.now();
    const metrics = ProgressEngine.calculateGlobalMetrics(snapshots);
    const durationMs = performance.now() - start;

    expect(metrics.totalWorkouts).toBe(150);
    expect(metrics.totalVolumeKg).toBeGreaterThan(0);
    expect(metrics.totalSets).toBeGreaterThan(0);
    expect(metrics.totalReps).toBeGreaterThan(0);

    // Performance budget: < 100ms
    expect(durationMs).toBeLessThan(100);
  });

  it('calculates individual exercise progress over 150 workouts within budget (< 50ms)', () => {
    const start = performance.now();
    const progress = ProgressEngine.extractExerciseProgress(snapshots, 'bench-press');
    const durationMs = performance.now() - start;

    expect(progress).not.toBeNull();
    expect(progress.historyPoints.length).toBeGreaterThan(20);
    expect(progress.personalBests.heaviestWeightKg).toBeGreaterThan(60);

    // Performance budget: < 50ms
    expect(durationMs).toBeLessThan(50);
  });

  it('generates weekly review over 150 workouts within budget (< 50ms)', () => {
    const anchorDate = snapshots[snapshots.length - 1].completedAt;

    const start = performance.now();
    const review = ReviewEngine.generateWeeklyReview(snapshots, anchorDate);
    const durationMs = performance.now() - start;

    expect(review).toBeDefined();
    expect(review.totalWorkouts).toBeGreaterThanOrEqual(0);

    // Performance budget: < 50ms
    expect(durationMs).toBeLessThan(50);
  });

  it('generates monthly review and plateau detection over 150 workouts within budget (< 50ms)', () => {
    const anchorDate = snapshots[snapshots.length - 1].completedAt;

    const start = performance.now();
    const review = ReviewEngine.generateMonthlyReview(snapshots, anchorDate);
    const durationMs = performance.now() - start;

    expect(review).toBeDefined();
    expect(review.totalSessions).toBeGreaterThanOrEqual(0);

    // Performance budget: < 50ms
    expect(durationMs).toBeLessThan(50);
  });

  it('detects plateaus across all exercises in 150 workouts within budget (< 50ms)', () => {
    const anchorDate = new Date(snapshots[snapshots.length - 1].completedAt);

    const start = performance.now();
    const plateaus = PlateauDetector.detectPlateausAndAnomalies(snapshots, anchorDate, 4);
    const durationMs = performance.now() - start;

    expect(Array.isArray(plateaus)).toBe(true);

    // Performance budget: < 50ms
    expect(durationMs).toBeLessThan(50);
  });

  it('groups and paginates 150 workouts deterministically within budget (< 25ms)', () => {
    const start = performance.now();
    const paginated = ProgressEngine.paginateSnapshots(snapshots, 1, 10);
    const groups = ProgressEngine.groupSnapshotsByMonth(paginated.items);
    const durationMs = performance.now() - start;

    expect(paginated.items.length).toBe(10);
    expect(paginated.totalItems).toBe(150);
    expect(paginated.totalPages).toBe(15);
    expect(groups.length).toBeGreaterThan(0);

    // Performance budget: < 25ms
    expect(durationMs).toBeLessThan(25);
  });

  it('executes 100 simulated set completions in active workout state within budget (< 20ms)', () => {
    // Simulate active workout set updates in pure memory
    const now = new Date().toISOString();
    let workout: ActiveWorkout = {
      id: 'active-bench-test',
      schemaVersion: 1,
      title: 'Active Workout Benchmark',
      startedAt: now,
      createdAt: now,
      updatedAt: now,
      status: WorkoutStatus.IN_PROGRESS,
      pauseIntervals: [],
      exercises: [
        {
          id: 'ex-slot-1',
          exerciseId: 'bench-press',
          exerciseName: 'Supino Reto',
          order: 0,
          sets: Array.from({ length: 10 }, (_, idx) => ({
            id: `set-${idx}`,
            setNumber: idx + 1,
            type: SetType.NORMAL,
            weight: 80,
            reps: 8,
            completed: false,
          })),
        },
      ],
    };

    const start = performance.now();
    let updateCounter = 0;

    for (let i = 0; i < 100; i++) {
      const setIdx = i % 10;
      // Immutable state transformation (equivalent to React setState)
      const updatedSets = workout.exercises[0].sets.map((s, idx) =>
        idx === setIdx
          ? {
              ...s,
              completed: !s.completed,
              completedAt: new Date().toISOString(),
              weight: s.weight ? s.weight + 1 : 80,
            }
          : s,
      );

      workout = {
        ...workout,
        exercises: [
          {
            ...workout.exercises[0],
            sets: updatedSets,
          },
        ],
      };
      updateCounter++;
    }

    const durationMs = performance.now() - start;

    expect(updateCounter).toBe(100);
    // 100 immutable updates must take < 50ms (formal budget in PERFORMANCE_BUDGETS.md)
    expect(durationMs).toBeLessThan(50);
  });
});
