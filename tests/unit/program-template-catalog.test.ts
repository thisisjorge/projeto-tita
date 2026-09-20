import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { TemplateService } from '../../src/services/template-service.js';
import { SEED_TEMPLATES } from '../../src/data/seed-templates.js';

describe('Program Template Catalog & Service (REQ-5, Task 7.2)', () => {
  let db: IndexedDBTitaDatabase;
  let service: TemplateService;

  beforeEach(async () => {
    db = new IndexedDBTitaDatabase({ dbName: `test-templates-${Date.now()}-${Math.random()}` });
    await db.open();
    service = new TemplateService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('provides built-in templates covering Full Body, Upper/Lower, and Push/Pull/Legs', () => {
    const templates = service.getTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(3);

    const ids = templates.map((t) => t.id);
    expect(ids).toContain('template-full-body-3x');
    expect(ids).toContain('template-upper-lower-4x');
    expect(ids).toContain('template-ppl-6x');

    for (const tpl of templates) {
      expect(tpl.name).toBeTruthy();
      expect(tpl.routines.length).toBe(tpl.daysPerWeek);
      expect(tpl.routines.every((r) => r.exercises.length > 0)).toBe(true);
      expect(tpl.routines.every((r) => r.exercises.every((e) => e.role !== undefined))).toBe(true);
    }
  });

  it('clones a template into a user-owned Program and Routines with independent Stable_IDs', async () => {
    const result = await service.cloneTemplateToUserProgram(
      'template-full-body-3x',
      'Meu Full Body Personalizado',
    );

    expect(result.program.id).toMatch(/^prog_/);
    expect(result.program.name).toBe('Meu Full Body Personalizado');
    expect(result.program.templateRef).toBe('template-full-body-3x');
    expect(result.program.active).toBe(true);
    expect(result.program.weeks.length).toBe(8);

    expect(result.routines).toHaveLength(3);
    for (const routine of result.routines) {
      expect(routine.id).toMatch(/^rt_/);
      expect(routine.programId).toBe(result.program.id);
      expect(routine.exercises.length).toBeGreaterThan(0);
      for (const slot of routine.exercises) {
        expect(slot.id).toMatch(/^slot_/);
        expect(slot.sets.length).toBeGreaterThan(0);
        for (const st of slot.sets) {
          expect(st.id).toMatch(/^st_/);
        }
      }
    }
  });

  it('throws an error when attempting to clone a non-existent template ID', async () => {
    await expect(service.cloneTemplateToUserProgram('template-inexistente')).rejects.toThrow(
      /não encontrado/,
    );
  });
});
