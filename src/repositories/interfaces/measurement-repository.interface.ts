import type { EntityId, ISODateTimeString } from '../../domain/common/types.js';
import type { Measurement } from '../../domain/entities/measurement.js';

export interface MeasurementRepository {
  getById(id: EntityId): Promise<Measurement | null>;
  getAll(): Promise<Measurement[]>;
  getByMetric(metric: string): Promise<Measurement[]>;
  getByDateRange(startDate: ISODateTimeString, endDate: ISODateTimeString): Promise<Measurement[]>;
  save(measurement: Measurement): Promise<void>;
  saveMany(measurements: readonly Measurement[]): Promise<void>;
  delete(id: EntityId): Promise<void>;
}
