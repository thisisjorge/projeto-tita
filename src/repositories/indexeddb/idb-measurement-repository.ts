import type { EntityId, ISODateTimeString } from '../../domain/common/types.js';
import type { Measurement } from '../../domain/entities/measurement.js';
import type { MeasurementRepository } from '../interfaces/measurement-repository.interface.js';
import type { TitaDatabase } from '../interfaces/database.interface.js';

export class IdbMeasurementRepository implements MeasurementRepository {
  constructor(private readonly db: TitaDatabase) {}

  async getById(id: EntityId): Promise<Measurement | null> {
    return this.db.transaction(['measurements'], 'readonly', async (tx) => {
      return tx.getStore<Measurement>('measurements').get(id);
    });
  }

  async getAll(): Promise<Measurement[]> {
    return this.db.transaction(['measurements'], 'readonly', async (tx) => {
      const records = await tx.getStore<Measurement>('measurements').getAll();
      return records.sort(
        (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      );
    });
  }

  async getByMetric(metric: string): Promise<Measurement[]> {
    const all = await this.getAll();
    return all.filter((m) => m.metric.toUpperCase() === metric.toUpperCase());
  }

  async getByDateRange(
    startDate: ISODateTimeString,
    endDate: ISODateTimeString,
  ): Promise<Measurement[]> {
    const all = await this.getAll();
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    return all.filter((m) => {
      const capMs = new Date(m.capturedAt).getTime();
      return capMs >= startMs && capMs <= endMs;
    });
  }

  async save(measurement: Measurement): Promise<void> {
    return this.db.transaction(['measurements'], 'readwrite', async (tx) => {
      await tx.getStore<Measurement>('measurements').put(measurement);
    });
  }

  async saveMany(measurements: readonly Measurement[]): Promise<void> {
    if (measurements.length === 0) return;
    return this.db.transaction(['measurements'], 'readwrite', async (tx) => {
      const store = tx.getStore<Measurement>('measurements');
      for (const m of measurements) {
        await store.put(m);
      }
    });
  }

  async delete(id: EntityId): Promise<void> {
    return this.db.transaction(['measurements'], 'readwrite', async (tx) => {
      await tx.getStore('measurements').delete(id);
    });
  }
}
