import type { EntityId, ISODateTimeString } from '../../domain/common/types.js';
import type { ActiveWorkout } from '../../domain/entities/active-workout.js';
import type { WorkoutSnapshot } from '../../domain/entities/workout-snapshot.js';

export interface ActiveWorkoutRepository {
  getActive(): Promise<ActiveWorkout | null>;
  getById(id: EntityId): Promise<ActiveWorkout | null>;
  save(workout: ActiveWorkout): Promise<void>;
  delete(id: EntityId): Promise<void>;
  clear(): Promise<void>;
}

export interface WorkoutSnapshotRepository {
  getById(id: EntityId): Promise<WorkoutSnapshot | null>;
  getAll(): Promise<WorkoutSnapshot[]>;
  getByDateRange(
    startDate: ISODateTimeString,
    endDate: ISODateTimeString,
  ): Promise<WorkoutSnapshot[]>;
  getByRoutineId(routineId: EntityId): Promise<WorkoutSnapshot[]>;
  save(snapshot: WorkoutSnapshot): Promise<void>;
  saveMany(snapshots: readonly WorkoutSnapshot[]): Promise<void>;
  delete(id: EntityId): Promise<void>;
}
