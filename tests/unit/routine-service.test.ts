import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { RoutineService } from '../../src/services/routine-service.js';
import { SetType } from '../../src/domain/enums/set-type.js';

describe('RoutineService (REQ-5, Task 7.1)', () => {
  let db: IndexedDBTitaDatabase;
  let service: RoutineService;

  beforeEach(async () => {
    db = new IndexedDBTitaDatabase({ dbName: `test-routines-${Date.now()}-${Math.random()}` });
    await db.open();
    service = new RoutineService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates a new routine with valid domain invariants and stable IDs', async () => {
    const routine = await service.createRoutine({
      name: 'Upper Força',
      notes: 'Aquecer bem os manguitos',
      exercises: [
        {
          exerciseId: '00000000-0000-4000-8000-000000000001',
          restSeconds: 120,
          sets: [
            { type: SetType.WARMUP, targetReps: 15, targetLoad: 40 },
            { type: SetType.NORMAL, targetReps: 8, targetLoad: 90 },
          ],
        },
      ],
    });

    expect(routine.id).toMatch(/^rt_/);
    expect(routine.name).toBe('Upper Força');
    expect(routine.exercises).toHaveLength(1);
    expect(routine.exercises[0]!.id).toMatch(/^slot_/);
    expect(routine.exercises[0]!.sets).toHaveLength(2);
    expect(routine.exercises[0]!.sets[0]!.id).toMatch(/^st_/);
    expect(routine.exercises[0]!.sets[0]!.type).toBe(SetType.WARMUP);

    const fetched = await service.getRoutineById(routine.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('Upper Força');
  });

  it('updates an existing routine name, notes and exercises', async () => {
    const created = await service.createRoutine({
      name: 'Legs A',
      exercises: [
        {
          exerciseId: '00000000-0000-4000-8000-000000000019',
          sets: [{ type: SetType.NORMAL, targetReps: 8 }],
        },
      ],
    });

    const updated = await service.updateRoutine(created.id, {
      name: 'Legs A — Foco Quadríceps',
      notes: 'Subir carga no leg press',
    });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Legs A — Foco Quadríceps');
    expect(updated.notes).toBe('Subir carga no leg press');
  });

  it('duplicates a routine with independent fresh IDs for slots and set templates', async () => {
    const original = await service.createRoutine({
      name: 'Costas & Bíceps',
      exercises: [
        {
          exerciseId: '00000000-0000-4000-8000-000000000007',
          sets: [
            { type: SetType.NORMAL, targetReps: 10, restSeconds: 90 },
            { type: SetType.NORMAL, targetReps: 10, restSeconds: 90 },
          ],
        },
      ],
    });

    const clone = await service.duplicateRoutine(original.id);

    expect(clone.id).not.toBe(original.id);
    expect(clone.id).toMatch(/^rt_/);
    expect(clone.name).toBe('Costas & Bíceps (Cópia)');
    expect(clone.exercises).toHaveLength(1);
    expect(clone.exercises[0]!.id).not.toBe(original.exercises[0]!.id);
    expect(clone.exercises[0]!.sets[0]!.id).not.toBe(original.exercises[0]!.sets[0]!.id);

    // Verify both exist independently
    const list = await service.getRoutines();
    expect(list).toHaveLength(2);
  });

  it('archives a routine (soft delete) and restores it without breaking references', async () => {
    const routine = await service.createRoutine({
      name: 'Rotina Temporária',
      exercises: [
        {
          exerciseId: '00000000-0000-4000-8000-000000000001',
          sets: [{ targetReps: 10 }],
        },
      ],
    });

    // 1. Archive
    const archived = await service.archiveRoutine(routine.id);
    expect(archived.deletedAt).toBeDefined();

    // Normal list excludes archived
    const activeList = await service.getRoutines({ includeArchived: false });
    expect(activeList.find((r) => r.id === routine.id)).toBeUndefined();

    // Include archived finds it
    const fullList = await service.getRoutines({ includeArchived: true });
    expect(fullList.find((r) => r.id === routine.id)).toBeDefined();

    // 2. Restore
    const restored = await service.restoreRoutine(routine.id);
    expect(restored.deletedAt).toBeUndefined();

    const afterRestore = await service.getRoutines({ includeArchived: false });
    expect(afterRestore.find((r) => r.id === routine.id)).toBeDefined();
  });

  it('reorders exercise slots preserving integrity and order index', async () => {
    const routine = await service.createRoutine({
      name: 'Full Body Ordem',
      exercises: [
        {
          exerciseId: '00000000-0000-4000-8000-000000000001', // Supino
          sets: [{ targetReps: 8 }],
        },
        {
          exerciseId: '00000000-0000-4000-8000-000000000019', // Agachamento
          sets: [{ targetReps: 8 }],
        },
      ],
    });

    const slot1 = routine.exercises[0]!.id;
    const slot2 = routine.exercises[1]!.id;

    // Invert order: slot2 first, then slot1
    const reordered = await service.reorderExercises(routine.id, [slot2, slot1]);

    expect(reordered.exercises[0]!.id).toBe(slot2);
    expect(reordered.exercises[0]!.order).toBe(0);
    expect(reordered.exercises[1]!.id).toBe(slot1);
    expect(reordered.exercises[1]!.order).toBe(1);
  });
});
