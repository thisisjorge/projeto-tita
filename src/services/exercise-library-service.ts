import type { EntityId } from '../domain/common/types.js';
import { generateId } from '../domain/common/id.js';
import type { Exercise } from '../domain/entities/exercise.js';
import type { ExerciseRole } from '../domain/enums/exercise-role.js';
import { validateExercise } from '../domain/validators/exercise-validator.js';
import { calculateEpley1RM } from '../domain/math/progress-math.js';
import { SEED_EXERCISES } from '../data/seed-exercises.js';
import { builtinExerciseName } from '../data/builtin-display.js';
import type { TitaDatabase } from '../repositories/interfaces/database.interface.js';
import { IdbExerciseRepository } from '../repositories/indexeddb/idb-exercise-repository.js';
import { IdbMetadataRepository } from '../repositories/indexeddb/idb-metadata-repository.js';
import { IdbWorkoutSnapshotRepository } from '../repositories/indexeddb/idb-workout-repository.js';
import { getAppDatabase } from './db-provider.js';

export interface ExerciseFilterOptions {
  search?: string;
  muscle?: string;
  equipment?: string;
  category?: string;
  source?: 'all' | 'system' | 'custom';
  onlyFavorites?: boolean;
  onlyRecent?: boolean;
}

export interface CreateCustomExerciseInput {
  name: string;
  aliases?: string[];
  primaryMuscle: string;
  secondaryMuscles?: string[];
  equipment: string;
  category?: string;
  instructions?: string[];
  roles?: ExerciseRole[];
  defaultRestSeconds?: number;
  increment?: number;
  license?: string;
  attribution?: string;
}

export interface UpdateCustomExerciseInput {
  name?: string;
  aliases?: string[];
  primaryMuscle?: string;
  secondaryMuscles?: string[];
  equipment?: string;
  category?: string;
  instructions?: string[];
  roles?: ExerciseRole[];
  defaultRestSeconds?: number;
  increment?: number;
}

export interface ExerciseHistorySummary {
  totalSessions: number;
  bestWeight: number | null;
  bestEstimated1RM: number | null;
  bestVolumeSet: { weight: number; reps: number; volume: number } | null;
  recentSessions: Array<{
    date: string;
    workoutId: string;
    completedSets: Array<{ weight: number; reps: number; rpe?: number }>;
  }>;
}

const FAVORITES_METADATA_KEY = 'favorite_exercise_ids';

export class ExerciseLibraryService {
  private readonly db: TitaDatabase;
  private readonly exerciseRepo: IdbExerciseRepository;
  private readonly metadataRepo: IdbMetadataRepository;
  private readonly snapshotRepo: IdbWorkoutSnapshotRepository;

  constructor(db: TitaDatabase = getAppDatabase()) {
    this.db = db;
    this.exerciseRepo = new IdbExerciseRepository(db);
    this.metadataRepo = new IdbMetadataRepository(db);
    this.snapshotRepo = new IdbWorkoutSnapshotRepository(db);
  }

  /**
   * Initializes the exercise library with canonical seed exercises.
   * Idempotent: seeds system exercises if absent, preserving any user custom exercises.
   */
  async initialize(): Promise<void> {
    if (!this.db.isOpen()) {
      await this.db.open();
    }
    const existing = await this.exerciseRepo.getAll(true);
    const existingSystemIds = new Set(existing.map((e) => e.id));

    const toInsert = SEED_EXERCISES.filter((seed) => !existingSystemIds.has(seed.id));
    if (toInsert.length > 0) {
      await this.exerciseRepo.saveMany(toInsert);
    }
  }

  /**
   * Retrieves all exercises matching the specified filters.
   */
  async getExercises(filters?: ExerciseFilterOptions): Promise<Exercise[]> {
    const all = (await this.exerciseRepo.getAll(false)).map((exercise) =>
      exercise.source === 'system'
        ? { ...exercise, name: builtinExerciseName(exercise.id, exercise.name) }
        : exercise,
    );
    const favoriteIds = new Set(await this.getFavoriteIds());
    const recentIds = new Set(await this.getRecentExerciseIds());

    const searchNormalized = filters?.search?.trim().toLowerCase();

    return all.filter((ex) => {
      // 1. Source filter
      if (filters?.source && filters.source !== 'all') {
        if (ex.source !== filters.source) return false;
      }

      // 2. Favorites only
      if (filters?.onlyFavorites && !favoriteIds.has(ex.id)) {
        return false;
      }

      // 3. Recent only
      if (filters?.onlyRecent && !recentIds.has(ex.id)) {
        return false;
      }

      // 4. Muscle filter
      if (filters?.muscle && filters.muscle !== 'all') {
        const muscleTarget = filters.muscle.toLowerCase();
        const primaryMatch = ex.primaryMuscle.toLowerCase().includes(muscleTarget);
        const secondaryMatch = ex.secondaryMuscles.some((m) =>
          m.toLowerCase().includes(muscleTarget),
        );
        if (!primaryMatch && !secondaryMatch) return false;
      }

      // 5. Equipment filter
      if (filters?.equipment && filters.equipment !== 'all') {
        if (ex.equipment.toLowerCase() !== filters.equipment.toLowerCase()) {
          return false;
        }
      }

      // 6. Category filter
      if (filters?.category && filters.category !== 'all') {
        if (ex.category.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }
      }

      // 7. Text search (name + aliases)
      if (searchNormalized && searchNormalized.length > 0) {
        const nameMatch = ex.name.toLowerCase().includes(searchNormalized);
        const aliasMatch = ex.aliases.some((a) => a.toLowerCase().includes(searchNormalized));
        if (!nameMatch && !aliasMatch) return false;
      }

      return true;
    });
  }

  /**
   * Retrieves a single exercise by ID.
   */
  async getExerciseById(id: EntityId): Promise<Exercise | null> {
    const exercise = await this.exerciseRepo.getById(id);
    return exercise?.source === 'system'
      ? { ...exercise, name: builtinExerciseName(exercise.id, exercise.name) }
      : exercise;
  }

  /**
   * Creates a user custom exercise.
   * Enforces validation and prevents silent duplication of names.
   */
  async createCustomExercise(input: CreateCustomExerciseInput): Promise<Exercise> {
    const existing = await this.exerciseRepo.getAll(false);
    const normalizedName = input.name.trim().toLowerCase();
    const duplicate = existing.find((e) => e.name.trim().toLowerCase() === normalizedName);
    if (duplicate) {
      throw new Error(`Já existe um exercício com o nome "${input.name.trim()}".`);
    }

    const now = new Date().toISOString();
    const newExercise: Exercise = {
      id: generateId(),
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      name: input.name.trim(),
      aliases: input.aliases ?? [],
      primaryMuscle: input.primaryMuscle.trim(),
      secondaryMuscles: input.secondaryMuscles ?? [],
      equipment: input.equipment.trim(),
      category: input.category?.trim() || 'Hipertrofia',
      instructions:
        input.instructions && input.instructions.length > 0
          ? input.instructions
          : ['Execução personalizada definida pelo usuário.'],
      source: 'custom',
      roles: input.roles ?? [],
      defaultRestSeconds: input.defaultRestSeconds ?? 90,
      increment: input.increment ?? 2.0,
      license: input.license ?? 'User Content',
      attribution: input.attribution ?? 'Personalizado',
    };

    const validation = validateExercise(newExercise);
    if (!validation.valid) {
      throw new Error(`Exercício inválido: ${validation.errors.join(', ')}`);
    }

    await this.exerciseRepo.save(newExercise);
    return newExercise;
  }

  /**
   * Updates an existing user custom exercise.
   * System exercises are protected and will throw an error.
   */
  async updateCustomExercise(id: EntityId, input: UpdateCustomExerciseInput): Promise<Exercise> {
    const existing = await this.exerciseRepo.getById(id);
    if (!existing) {
      throw new Error('Exercício não encontrado.');
    }

    if (existing.source === 'system') {
      throw new Error('Exercícios do sistema são protegidos e não podem ser editados.');
    }

    const updated: Exercise = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      aliases: input.aliases !== undefined ? input.aliases : existing.aliases,
      primaryMuscle:
        input.primaryMuscle !== undefined ? input.primaryMuscle.trim() : existing.primaryMuscle,
      secondaryMuscles:
        input.secondaryMuscles !== undefined ? input.secondaryMuscles : existing.secondaryMuscles,
      equipment: input.equipment !== undefined ? input.equipment.trim() : existing.equipment,
      category: input.category !== undefined ? input.category.trim() : existing.category,
      instructions: input.instructions !== undefined ? input.instructions : existing.instructions,
      roles: input.roles !== undefined ? input.roles : existing.roles,
      defaultRestSeconds:
        input.defaultRestSeconds !== undefined
          ? input.defaultRestSeconds
          : existing.defaultRestSeconds,
      increment: input.increment !== undefined ? input.increment : existing.increment,
      updatedAt: new Date().toISOString(),
    };

    const validation = validateExercise(updated);
    if (!validation.valid) {
      throw new Error(`Atualização inválida: ${validation.errors.join(', ')}`);
    }

    await this.exerciseRepo.save(updated);
    return updated;
  }

  /**
   * Soft deletes a custom exercise.
   * System exercises are protected and cannot be deleted.
   */
  async deleteCustomExercise(id: EntityId): Promise<void> {
    const existing = await this.exerciseRepo.getById(id);
    if (!existing) {
      throw new Error('Exercício não encontrado.');
    }

    if (existing.source === 'system') {
      throw new Error('Exercícios do sistema são protegidos e não podem ser excluídos.');
    }

    const softDeleted: Exercise = {
      ...existing,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.exerciseRepo.save(softDeleted);
  }

  /**
   * Toggles the favorite status of an exercise.
   * Favorites are stored in user metadata, decoupling user preferences from exercise records.
   */
  async toggleFavorite(exerciseId: EntityId): Promise<boolean> {
    const favorites = await this.getFavoriteIds();
    const set = new Set(favorites);
    let isNowFav: boolean;

    if (set.has(exerciseId)) {
      set.delete(exerciseId);
      isNowFav = false;
    } else {
      set.add(exerciseId);
      isNowFav = true;
    }

    await this.metadataRepo.set(FAVORITES_METADATA_KEY, Array.from(set));
    return isNowFav;
  }

  /**
   * Checks if an exercise is marked as favorite.
   */
  async isFavorite(exerciseId: EntityId): Promise<boolean> {
    const favorites = await this.getFavoriteIds();
    return favorites.includes(exerciseId);
  }

  /**
   * Retrieves all favorite exercise IDs.
   */
  async getFavoriteIds(): Promise<string[]> {
    const stored = await this.metadataRepo.get<string[]>(FAVORITES_METADATA_KEY);
    return Array.isArray(stored) ? stored : [];
  }

  /**
   * Retrieves recently performed exercise IDs ordered by session date (newest first).
   */
  async getRecentExerciseIds(): Promise<string[]> {
    const snapshots = await this.snapshotRepo.getAll();
    // Sort descending by completedAt
    snapshots.sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));

    const recentIds: string[] = [];
    const seen = new Set<string>();

    for (const snap of snapshots) {
      for (const ex of snap.exercises) {
        if (!seen.has(ex.exerciseId)) {
          seen.add(ex.exerciseId);
          recentIds.push(ex.exerciseId);
        }
      }
    }

    return recentIds;
  }

  /**
   * Computes personal historical metrics for a given exercise from completed workout snapshots.
   */
  async getExerciseHistory(exerciseId: EntityId): Promise<ExerciseHistorySummary> {
    const snapshots = await this.snapshotRepo.getAll();
    snapshots.sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));

    let totalSessions = 0;
    let bestWeight: number | null = null;
    let bestEstimated1RM: number | null = null;
    let bestVolumeSet: { weight: number; reps: number; volume: number } | null = null;
    const recentSessions: ExerciseHistorySummary['recentSessions'] = [];

    for (const snap of snapshots) {
      const match = snap.exercises.find((e) => e.exerciseId === exerciseId);
      if (match) {
        totalSessions++;
        const completedSets = match.sets
          .filter(
            (s): s is typeof s & { weight: number; reps: number } =>
              s.completed === true && typeof s.weight === 'number' && typeof s.reps === 'number',
          )
          .map((s) => ({
            weight: s.weight,
            reps: s.reps,
            rpe: s.rpe,
          }));

        if (completedSets.length > 0) {
          recentSessions.push({
            date: snap.completedAt,
            workoutId: snap.id,
            completedSets,
          });

          for (const s of completedSets) {
            // Check best weight
            if (bestWeight === null || s.weight > bestWeight) {
              bestWeight = s.weight;
            }

            // Check best e1RM
            const e1RM = calculateEpley1RM(s.weight, s.reps);
            if (bestEstimated1RM === null || e1RM > bestEstimated1RM) {
              bestEstimated1RM = e1RM;
            }

            // Check best set volume
            const volume = s.weight * s.reps;
            if (bestVolumeSet === null || volume > bestVolumeSet.volume) {
              bestVolumeSet = {
                weight: s.weight,
                reps: s.reps,
                volume,
              };
            }
          }
        }
      }
    }

    return {
      totalSessions,
      bestWeight,
      bestEstimated1RM,
      bestVolumeSet,
      recentSessions: recentSessions.slice(0, 5), // Keep top 5 recent
    };
  }

  /**
   * Finds alternative/substitute exercises based on abstract movement roles and primary muscle.
   */
  async getAlternatives(exercise: Exercise): Promise<Exercise[]> {
    const all = await this.exerciseRepo.getAll(false);
    const candidates = all.filter((e) => e.id !== exercise.id);

    // Score candidates: same roles = 10 pts per role match; same primary muscle = 5 pts; same equipment = 2 pts
    const scored = candidates.map((cand) => {
      let score = 0;
      for (const role of exercise.roles) {
        if (cand.roles.includes(role)) {
          score += 10;
        }
      }
      if (cand.primaryMuscle.toLowerCase() === exercise.primaryMuscle.toLowerCase()) {
        score += 5;
      }
      if (cand.equipment.toLowerCase() === exercise.equipment.toLowerCase()) {
        score += 2;
      }
      return { exercise: cand, score };
    });

    return scored
      .filter((item) => item.score >= 5)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.exercise)
      .slice(0, 6);
  }
}
