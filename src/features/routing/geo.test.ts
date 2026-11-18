import { describe, expect, it } from 'vitest';
import { buildDemoDataset } from '../../data/demo-dataset';
import { lineMidpoint, nearestEdge } from './geo';

describe('nearestEdge / lineMidpoint', () => {
  const ds = buildDemoDataset();
  it('asocia un punto al tramo más cercano', () => {
    const e = ds.edges.find((x) => x.id === 'e-h-r1c1')!;
    const mid = lineMidpoint(e.geometry);
    expect(nearestEdge(mid.lat + 0.00005, mid.lng, ds.edges)?.id).toBe('e-h-r1c1');
  });
  it('no asocia puntos lejanos a ningún tramo', () => {
    expect(nearestEdge(-9.95, -76.26, ds.edges)).toBeNull();
  });
});
