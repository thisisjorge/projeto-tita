import type { EntityId, ISODateTimeString } from '../../domain/common/types.js';
import type { ActiveWorkout } from '../../domain/entities/active-workout.js';
import type { WorkoutSnapshot } from '../../domain/entities/workout-snapshot.js';
import type {
  ActiveWorkoutRepository,
  WorkoutSnapshotRepository,
} from '../interfaces/workout-repository.interface.js';
import type { TitaDatabase } from '../interfaces/database.interface.js';

export class IdbActiveWorkoutRepository implements ActiveWorkoutRepository {
  constructor(private readonly db: TitaDatabase) {}

  async getActive(): Promise<ActiveWorkout | null> {
    return this.db.transaction(['activeWorkouts'], 'readonly', async (tx) => {
      const all = await tx.getStore<ActiveWorkout>('activeWorkouts').getAll();
      return all.find((w) => w.status === 'IN_PROGRESS' || w.status === 'PAUSED') ?? null;
    });
  }

  async getById(id: EntityId): Promise<ActiveWorkout | null> {
    return this.db.transaction(['activeWorkouts'], 'readonly', async (tx) => {
      return tx.getStore<ActiveWorkout>('activeWorkouts').get(id);
    });
  }

  async save(workout: ActiveWorkout): Promise<void> {
    return this.db.transaction(['activeWorkouts'], 'readwrite', async (tx) => {
      await tx.getStore<ActiveWorkout>('activeWorkouts').put(workout);
    });
  }

  async delete(id: EntityId): Promise<void> {
    return this.db.transaction(['activeWorkouts'], 'readwrite', async (tx) => {
      await tx.getStore('activeWorkouts').delete(id);
    });
  }

  async clear(): Promise<void> {
    return this.db.transaction(['activeWorkouts'], 'readwrite', async (tx) => {
      await tx.getStore('activeWorkouts').clear();
    });
  }
}

export class IdbWorkoutSnapshotRepository implements WorkoutSnapshotRepository {
  constructor(private readonly db: TitaDatabase) {}

  async getById(id: EntityId): Promise<WorkoutSnapshot | null> {
    return this.db.transaction(['workoutSnapshots'], 'readonly', async (tx) => {
      return tx.getStore<WorkoutSnapshot>('workoutSnapshots').get(id);
    });
  }

  async getAll(): Promise<WorkoutSnapshot[]> {
    return this.db.transaction(['workoutSnapshots'], 'readonly', async (tx) => {
      const records = await tx.getStore<WorkoutSnapshot>('workoutSnapshots').getAll();
      // Sort by completedAt descending, tiebreak by id descending
      return records.sort((a, b) => {
        const timeDiff = new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.id.localeCompare(a.id);
      });
    });
  }

  async getByDateRange(
    startDate: ISODateTimeString,
    endDate: ISODateTimeString,
  ): Promise<WorkoutSnapshot[]> {
    const all = await this.getAll();
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    return all.filter((s) => {
      const completedMs = new Date(s.completedAt).getTime();
      return completedMs >= startMs && completedMs <= endMs;
    });
  }

  async getByRoutineId(routineId: EntityId): Promise<WorkoutSnapshot[]> {
    const all = await this.getAll();
    return all.filter((s) => s.sourceRoutineId === routineId);
  }

  async save(snapshot: WorkoutSnapshot): Promise<void> {
    return this.db.transaction(['workoutSnapshots'], 'readwrite', async (tx) => {
      await tx.getStore<WorkoutSnapshot>('workoutSnapshots').put(snapshot);
    });
  }

  async saveMany(snapshots: readonly WorkoutSnapshot[]): Promise<void> {
    if (snapshots.length === 0) return;
    return this.db.transaction(['workoutSnapshots'], 'readwrite', async (tx) => {
      const store = tx.getStore<WorkoutSnapshot>('workoutSnapshots');
      for (const snapshot of snapshots) {
        await store.put(snapshot);
      }
    });
  }

  async delete(id: EntityId): Promise<void> {
    return this.db.transaction(['workoutSnapshots'], 'readwrite', async (tx) => {
      await tx.getStore('workoutSnapshots').delete(id);
    });
  }
}
