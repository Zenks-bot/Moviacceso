import { describe, expect, it } from 'vitest';
import full from '../../data/pilot-dataset.json';
import { toMobilityDataset } from '../../data/demo-dataset';
import type { PilotDataset } from '../../types/domain';
import { lineMidpoint, nearestEdge } from './geo';

describe('nearestEdge / lineMidpoint', () => {
  const ds = toMobilityDataset(full as unknown as PilotDataset);
  it('asocia un punto al tramo más cercano', () => {
    const e = ds.edges.find((x) => x.lengthM > 60)!;
    const mid = lineMidpoint(e.geometry);
    expect(nearestEdge(mid.lat, mid.lng, ds.edges)?.id).toBe(e.id);
  });
  it('no asocia puntos lejanos a ningún tramo', () => {
    expect(nearestEdge(-9.99, -76.30, ds.edges)).toBeNull();
  });
});
