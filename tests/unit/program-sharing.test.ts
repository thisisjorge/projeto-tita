import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  exportProgramToShareableJson,
  validateShareableProgram,
  importShareableProgram,
  PROGRAM_SHARE_FORMAT,
  CURRENT_PROGRAM_SHARE_SCHEMA_VERSION,
  type TitanProgramShareV1,
} from '../../src/backup/program-sharing.js';
import { ProgressionStrategyType } from '../../src/domain/enums/progression-strategy-type.js';
import { GroupType } from '../../src/domain/enums/group-type.js';
import { SetType } from '../../src/domain/enums/set-type.js';
import { createTestDatabase } from '../helpers/test-db.js';
import type { TitaDatabase } from '../../src/repositories/interfaces/database.interface.js';
import type { Program } from '../../src/domain/entities/program.js';
import type { Routine } from '../../src/domain/entities/routine.js';

describe('Program Sharing Format (titan-program.json / REQ-16 / Task 16.4)', () => {
  let db: TitaDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
  });

  afterEach(async () => {
    await db.close();
  });

  it('rejects malformed JSON payloads', () => {
    const result = validateShareableProgram('invalid { json');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('JSON inválido');
  });

  it('rejects payloads with wrong format or schema version', () => {
    const invalidFormat = JSON.stringify({
      format: 'unknown-format',
      schemaVersion: 1,
      program: { name: 'Test', weeks: [{ weekNumber: 1, routineRefIds: [] }] },
      routines: [{ localRefId: 'r1', name: 'R1', exercises: [] }],
    });
    const res1 = validateShareableProgram(invalidFormat);
    expect(res1.valid).toBe(false);
    expect(res1.errors.some((e) => e.includes('Formato inválido'))).toBe(true);

    const invalidVersion = JSON.stringify({
      format: PROGRAM_SHARE_FORMAT,
      schemaVersion: 999,
      program: { name: 'Test', weeks: [{ weekNumber: 1, routineRefIds: [] }] },
      routines: [{ localRefId: 'r1', name: 'R1', exercises: [] }],
    });
    const res2 = validateShareableProgram(invalidVersion);
    expect(res2.valid).toBe(false);
    expect(res2.errors.some((e) => e.includes('Versão de schema incompatível'))).toBe(true);
  });

  it('strictly rejects payloads containing private workout history (privacy invariant)', () => {
    const leakedPayload = JSON.stringify({
      format: PROGRAM_SHARE_FORMAT,
      schemaVersion: CURRENT_PROGRAM_SHARE_SCHEMA_VERSION,
      program: { name: 'Test', weeks: [{ weekNumber: 1, routineRefIds: ['r1'] }] },
      routines: [{ localRefId: 'r1', name: 'R1', exercises: [] }],
      workoutSnapshots: [{ id: 'snap-1', totalVolumeKg: 5000 }],
    });

    const res = validateShareableProgram(leakedPayload);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Violação de privacidade'))).toBe(true);
  });

  it('exports a program and routines into history-free shareable JSON', () => {
    const program: Program = {
      id: 'prog-orig-1',
      schemaVersion: 1,
      name: 'Upper Lower Hipertrofia',
      description: 'Periodização de 4 dias focada em hipertrofia',
      progressionStrategy: ProgressionStrategyType.DOUBLE_PROGRESSION,
      durationWeeks: 8,
      daysPerWeek: 4,
      active: true,
      weeks: [
        {
          id: 'w1',
          schemaVersion: 1,
          programId: 'prog-orig-1',
          weekNumber: 1,
          routineIds: ['rt-upper-1', 'rt-lower-1'],
          volumeFactor: 1.0,
          targetRir: 2,
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    const routines: Routine[] = [
      {
        id: 'rt-upper-1',
        schemaVersion: 1,
        name: 'Upper A',
        exercises: [
          {
            id: 'slot-1',
            exerciseId: 'bench-press',
            order: 1,
            sets: [
              {
                id: 'st-1',
                type: SetType.NORMAL,
                targetReps: 8,
                targetRpe: 8,
                targetRir: 2,
                restSeconds: 120,
              },
            ],
          },
          {
            id: 'slot-2',
            exerciseId: 'bent-over-row',
            order: 2,
            sets: [
              {
                id: 'st-2',
                type: SetType.NORMAL,
                targetReps: 10,
                restSeconds: 90,
              },
            ],
          },
        ],
        groups: [
          {
            id: 'grp-1',
            type: GroupType.SUPERSET,
            exerciseSlotIds: ['slot-1', 'slot-2'],
            restAfterSeconds: 120,
          },
        ],
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ];

    const json = exportProgramToShareableJson(program, routines);
    expect(json).toBeDefined();

    const parsed = JSON.parse(json) as TitanProgramShareV1;
    expect(parsed.format).toBe(PROGRAM_SHARE_FORMAT);
    expect(parsed.schemaVersion).toBe(CURRENT_PROGRAM_SHARE_SCHEMA_VERSION);
    expect(parsed.program.name).toBe('Upper Lower Hipertrofia');
    expect(parsed.routines.length).toBe(1);
    expect(parsed.routines[0].exercises.length).toBe(2);
    expect(parsed.routines[0].groups?.length).toBe(1);

    // Validate the exported JSON passes validation
    const validation = validateShareableProgram(json);
    expect(validation.valid).toBe(true);
  });

  it('imports a shareable program, cloning it with new IDs and preserving structure', async () => {
    const shareable: TitanProgramShareV1 = {
      format: PROGRAM_SHARE_FORMAT,
      schemaVersion: CURRENT_PROGRAM_SHARE_SCHEMA_VERSION,
      appVersion: '2.0.0',
      exportedAt: new Date().toISOString(),
      program: {
        name: 'Full Body 3x Iniciante',
        description: 'Programa para adaptação neural',
        progressionStrategy: ProgressionStrategyType.LINEAR_PROGRESSION,
        durationWeeks: 4,
        daysPerWeek: 3,
        weeks: [
          {
            weekNumber: 1,
            routineRefIds: ['fb-1'],
          },
        ],
      },
      routines: [
        {
          localRefId: 'fb-1',
          name: 'Full Body A',
          exercises: [
            {
              exerciseId: 'squat',
              order: 1,
              sets: [{ setNumber: 1, targetReps: 10 }],
            },
          ],
        },
      ],
      customExercises: [
        {
          id: 'custom-exercise-1',
          name: 'Agachamento Cossaco Titã',
          primaryMuscle: 'Quadríceps',
          equipment: 'Peso Corporal',
          category: 'Pernas',
        },
      ],
    };

    const importResult = await importShareableProgram(db, shareable, { activate: true });
    expect(importResult.programId).toBeDefined();
    expect(importResult.routineIds.length).toBe(1);
    expect(importResult.customExerciseIds.length).toBe(1);

    // Verify stored Program
    const savedProgram = await db.transaction(['programs'], 'readonly', (tx) =>
      tx.getStore<Program>('programs').get(importResult.programId),
    );
    expect(savedProgram).toBeDefined();
    expect(savedProgram?.name).toBe('Full Body 3x Iniciante');
    expect(savedProgram?.active).toBe(true);
    expect(savedProgram?.weeks[0].routineIds[0]).toBe(importResult.routineIds[0]);

    // Verify stored Routine
    const savedRoutine = await db.transaction(['routines'], 'readonly', (tx) =>
      tx.getStore<Routine>('routines').get(importResult.routineIds[0]),
    );
    expect(savedRoutine).toBeDefined();
    expect(savedRoutine?.name).toBe('Full Body A');
    expect(savedRoutine?.programId).toBe(importResult.programId);

    // Verify stored custom Exercise
    const savedCustomEx = await db.transaction(['exercises'], 'readonly', (tx) =>
      tx.getStore('exercises').get('custom-exercise-1'),
    );
    expect(savedCustomEx).toBeDefined();
  });
});
