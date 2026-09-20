import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTestDatabase } from '../helpers/test-db.js';
import { setAppDatabaseForTesting } from '../../src/services/db-provider.js';
import type { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { WorkoutView } from '../../src/features/workout/WorkoutView.js';

describe('WorkoutView Component (REQ-4, Task 5.4)', () => {
  let db: IndexedDBTitaDatabase;

  beforeEach(async () => {
    db = createTestDatabase(`test-ui-workout-${Date.now()}-${Math.random()}`);
    await db.open();
    setAppDatabaseForTesting(db);
  });

  afterEach(() => {
    db.close();
    setAppDatabaseForTesting(null);
  });

  it('renders initial start workout view when no active session is loaded', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkoutView />
      </MemoryRouter>,
    );

    expect(html).toContain('Pronto para treinar?');
    expect(html).toContain('Iniciar Treino Rápido');
    expect(html).toContain('data-testid="start-workout-button"');
    expect(html).toContain('salvos neste aparelho, mesmo offline');
  });
});
