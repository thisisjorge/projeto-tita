import { describe, expect, it } from 'vitest';
import { createTestDatabase } from '../helpers/test-db.js';
import {
  isOptionalRoutine,
  localWeekday,
  sortRoutinesByWeekday,
  WEEKDAYS,
} from '../../src/domain/weekday.js';
import { RoutineService } from '../../src/services/routine-service.js';
import { ExerciseLibraryService } from '../../src/services/exercise-library-service.js';
import { ActiveWorkoutService } from '../../src/services/active-workout-service.js';
import { startRoutineWorkout } from '../../src/services/start-routine-workout.js';
import {
  exportProgramToShareableJson,
  importShareableProgram,
  validateShareableProgram,
  type TitanProgramShareV1,
} from '../../src/backup/program-sharing.js';
import { ProgressionStrategyType } from '../../src/domain/enums/progression-strategy-type.js';
import { SetType } from '../../src/domain/enums/set-type.js';
import type { Program } from '../../src/domain/entities/program.js';
import type { WorkoutSnapshot } from '../../src/domain/entities/workout-snapshot.js';
import { exportWorkoutSnapshot } from '../../src/backup/backup-exporter.js';
import { preflightImport, executeImport } from '../../src/backup/backup-importer.js';

describe('Semana, catálogo e compartilhamento incremental', () => {
  it('ordena todos os dias por um calendário único e usa o dia local', () => {
    const shuffled = WEEKDAYS.map((weekday, index) => ({
      id: String(index),
      name: weekday,
      weekday,
    })).reverse();
    expect(sortRoutinesByWeekday(shuffled).map((routine) => routine.weekday)).toEqual(WEEKDAYS);
    expect(localWeekday(new Date(2026, 8, 28, 0, 30))).toBe('SEGUNDA');
    expect(localWeekday(new Date(2026, 8, 27, 23, 30))).toBe('DOMINGO');
    expect(isOptionalRoutine({ weekday: 'SÁBADO' })).toBe(true);
    expect(isOptionalRoutine({ weekday: 'DOMINGO' })).toBe(true);
    expect(isOptionalRoutine({ weekday: 'SÁBADO', optional: false })).toBe(false);
  });

  it('sugere a rotina do dia sem trocar a sessão ativa escolhida manualmente', async () => {
    const db = createTestDatabase();
    await db.open();
    try {
      const routines = new RoutineService(db);
      const library = new ExerciseLibraryService(db);
      await library.initialize();
      const monday = await routines.createRoutine({
        name: 'Pull A',
        weekday: 'SEGUNDA',
        exercises: [{ exerciseId: '00000000-0000-4000-8000-000000000007' }],
      });
      const tuesday = await routines.createRoutine({
        name: 'Push A',
        weekday: 'TERÇA',
        exercises: [{ exerciseId: '00000000-0000-4000-8000-000000000001' }],
      });
      expect((await routines.getRoutines()).map((routine) => routine.weekday)).toEqual([
        'SEGUNDA',
        'TERÇA',
      ]);
      const workout = new ActiveWorkoutService(db);
      expect((await startRoutineWorkout(tuesday, workout, library)).type).toBe('started');
      expect((await startRoutineWorkout(monday, workout, library)).type).toBe('mustResume');
      expect((await workout.getActiveWorkout())?.sourceRoutineId).toBe(tuesday.id);
    } finally {
      await db.close();
    }
  });

  it('encontra aliases e variações nativas sem fundir IDs ou customs', async () => {
    const db = createTestDatabase();
    await db.open();
    try {
      const library = new ExerciseLibraryService(db);
      await library.initialize();
      const checks = [
        ['row chest', 'Remada Apoiada na Máquina'],
        ['chest-supported row', 'Remada Apoiada na Máquina'],
        ['posterior ombro', 'Crucifixo Inverso com Halteres'],
        ['lat uni', 'Puxada Unilateral na Polia'],
        ['lat onearm', 'Puxada Unilateral na Polia'],
        ['incline db', 'Supino Inclinado com Halteres'],
        ['incline bar', 'Supino Inclinado com Barra'],
        ['frances polia', 'Tríceps Francês na Polia'],
        ['  TRÍCEPS---FRANCES    POLIA  ', 'Tríceps Francês na Polia'],
        ['remadaa apoiada', 'Remada Apoiada na Máquina'],
        ['neutral pulldown', 'Puxada frontal com pegada fechada'],
        ['RDL', 'Levantamento Terra Romeno / Stiff'],
      ] as const;
      for (const [query, expected] of checks)
        expect((await library.getExercises({ search: query }))[0]?.name).toBe(expected);
      const inclines = await library.getExercises({ search: 'supino inclinado' });
      expect(inclines.some((exercise) => exercise.name === 'Supino Inclinado com Barra')).toBe(
        true,
      );
      expect(inclines.some((exercise) => exercise.name === 'Supino Inclinado com Halteres')).toBe(
        true,
      );
      expect(inclines[0]?.id).not.toBe(inclines[1]?.id);
      for (const term of [
        'puxada neutra',
        'rosca inclinada',
        'rosca martelo',
        'supino reto',
        'máquina convergente',
        'desenvolvimento',
        'elevação lateral',
        'crossover',
        'pressdown',
        'hack squat',
        'agachamento',
        'RDL',
        'stiff',
        'leg press',
        'flexora',
        'extensora',
        'panturrilha',
        'terra',
        'búlgaro',
        'hip thrust',
      ]) {
        expect((await library.getExercises({ search: term })).length, term).toBeGreaterThan(0);
      }
      const custom = await library.createCustomExercise({
        name: 'Row Chest pessoal',
        primaryMuscle: 'General',
        equipment: 'Máquina',
      });
      const legacyName = await library.createCustomExercise({
        name: 'Lat Onearm',
        primaryMuscle: 'General',
        equipment: 'Polia',
      });
      expect((await library.getExerciseById(custom.id))?.primaryMuscle).toBe('General');
      const audit = await library.auditCustomExercises();
      expect(audit.find((item) => item.custom.id === legacyName.id)?.possibleNative?.name).toBe(
        'Puxada Unilateral na Polia',
      );
      expect(audit.find((item) => item.custom.id === legacyName.id)?.issues).toContain(
        'Grupo muscular genérico',
      );
      expect((await library.getExerciseById(legacyName.id))?.name).toBe('Lat Onearm');
    } finally {
      await db.close();
    }
  });

  it('exporta e importa a semana ordenada, mantendo dia, séries e estratégia; aceita JSON v1 antigo', async () => {
    const db = createTestDatabase();
    await db.open();
    try {
      const service = new RoutineService(db);
      const monday = await service.createRoutine({
        name: 'Pull A',
        weekday: 'SEGUNDA',
        defaultProgressionStrategy: ProgressionStrategyType.DOUBLE_PROGRESSION,
        exercises: [
          {
            exerciseId: '00000000-0000-4000-8000-000000000007',
            sets: [
              { type: SetType.NORMAL, minReps: 5, maxReps: 8, targetRir: 2, restSeconds: 120 },
            ],
          },
        ],
      });
      const friday = await service.createRoutine({
        name: 'Legs B',
        weekday: 'SEXTA',
        exercises: [{ exerciseId: '00000000-0000-4000-8000-000000000019' }],
      });
      const saturday = await service.createRoutine({
        name: 'Pump',
        weekday: 'SÁBADO',
        optional: true,
        exercises: [],
      });
      const now = new Date().toISOString();
      const program: Program = {
        id: 'week',
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
        name: 'Semana',
        durationWeeks: 1,
        daysPerWeek: 2,
        active: true,
        progressionStrategy: ProgressionStrategyType.DOUBLE_PROGRESSION,
        weeks: [
          {
            id: 'w1',
            programId: 'week',
            schemaVersion: 1,
            createdAt: now,
            updatedAt: now,
            weekNumber: 1,
            routineIds: [saturday.id, friday.id, monday.id],
          },
        ],
      };
      const json = exportProgramToShareableJson(
        program,
        [saturday, friday, monday],
        [],
        '1.0.0',
        'program',
      );
      const parsed = validateShareableProgram(json).shareable!;
      expect(parsed.routines.map((routine) => routine.weekday)).toEqual([
        'SEGUNDA',
        'SEXTA',
        'SÁBADO',
      ]);
      expect(parsed.program.weeks[0]?.routineRefIds).toEqual([monday.id, friday.id, saturday.id]);
      const result = await importShareableProgram(db, parsed);
      const imported = await Promise.all(result.routineIds.map((id) => service.getRoutineById(id)));
      expect(imported.map((routine) => routine?.weekday)).toEqual(['SEGUNDA', 'SEXTA', 'SÁBADO']);
      expect(imported[2]?.optional).toBe(true);
      expect(imported[0]?.exercises[0]?.sets[0]?.maxReps).toBe(8);
      expect(imported[0]?.defaultProgressionStrategy).toBe(
        ProgressionStrategyType.DOUBLE_PROGRESSION,
      );
      const old = JSON.parse(json);
      delete old.kind;
      old.routines.forEach((routine: Record<string, unknown>) => {
        delete routine.weekday;
        delete routine.defaultProgressionStrategy;
      });
      expect(validateShareableProgram(JSON.stringify(old)).valid).toBe(true);
    } finally {
      await db.close();
    }
  });

  it('exporta só uma sessão em backup v1 com checksum e a reimporta por mesclagem', async () => {
    const db = createTestDatabase();
    await db.open();
    try {
      const snapshot: WorkoutSnapshot = {
        id: 'session-one',
        schemaVersion: 1,
        sourceWorkoutId: 'workout-one',
        title: 'Treino',
        startedAt: '2026-09-27T10:00:00.000Z',
        completedAt: '2026-09-27T11:00:00.000Z',
        activeDurationMs: 3600000,
        totalDurationMs: 3600000,
        exercises: [],
        totalVolumeKg: 0,
        totalReps: 0,
        completedSetsCount: 0,
        revision: 1,
      };
      const { json } = await exportWorkoutSnapshot(snapshot);
      const preflight = await preflightImport(db, json);
      expect(preflight.valid).toBe(true);
      expect(preflight.backup?.manifest.categories).toEqual(['workoutSnapshots']);
      const result = await executeImport(db, preflight.backup!, { mode: 'merge' });
      expect(result.success).toBe(true);
      const stored = await db.transaction(['workoutSnapshots'], 'readonly', async (tx) =>
        tx.getStore<WorkoutSnapshot>('workoutSnapshots').get('session-one'),
      );
      expect(stored?.title).toBe('Treino');
      await db.transaction(['workoutSnapshots'], 'readwrite', async (tx) =>
        tx
          .getStore<WorkoutSnapshot>('workoutSnapshots')
          .put({ ...snapshot, title: 'Versão local' }),
      );
      const safe = await executeImport(db, preflight.backup!, { mode: 'merge_keep_existing' });
      expect(safe.importedCounts.workoutSnapshots).toBe(0);
      const preserved = await db.transaction(['workoutSnapshots'], 'readonly', async (tx) =>
        tx.getStore<WorkoutSnapshot>('workoutSnapshots').get('session-one'),
      );
      expect(preserved?.title).toBe('Versão local');
    } finally {
      await db.close();
    }
  });

  it('reutiliza custom equivalente na importação sem alterar seu ID ou histórico', async () => {
    const db = createTestDatabase();
    await db.open();
    try {
      const library = new ExerciseLibraryService(db);
      const existing = await library.createCustomExercise({
        name: 'Row Chest',
        primaryMuscle: 'General',
        equipment: 'Máquina',
      });
      const shareable: TitanProgramShareV1 = {
        format: 'titan-program',
        schemaVersion: 1,
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        program: {
          name: 'Pull',
          progressionStrategy: ProgressionStrategyType.DOUBLE_PROGRESSION,
          durationWeeks: 1,
          daysPerWeek: 1,
          weeks: [{ weekNumber: 1, routineRefIds: ['r1'] }],
        },
        routines: [
          {
            localRefId: 'r1',
            name: 'Pull',
            exercises: [
              { exerciseId: 'foreign-custom', order: 0, sets: [{ setNumber: 1, targetReps: 8 }] },
            ],
          },
        ],
        customExercises: [
          {
            id: 'foreign-custom',
            name: 'Row Chest',
            primaryMuscle: 'General',
            equipment: 'Máquina',
            category: 'Hipertrofia',
          },
        ],
      };
      const result = await importShareableProgram(db, shareable);
      expect(result.customExerciseIds).toEqual([]);
      const routine = await new RoutineService(db).getRoutineById(result.routineIds[0]!);
      expect(routine?.exercises[0]?.exerciseId).toBe(existing.id);
      expect((await library.getExerciseById(existing.id))?.primaryMuscle).toBe('General');
    } finally {
      await db.close();
    }
  });
});
