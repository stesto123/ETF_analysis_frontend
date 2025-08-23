import { parseYYYYMMDD, chooseBucketDays, aggregateOnBuckets, buildBucketLabels } from '@/utils/aggregation';

describe('aggregation utils', () => {
  test('parseYYYYMMDD and fmt labels', () => {
    const d = parseYYYYMMDD(20230105);
    expect(d.getFullYear()).toBe(2023);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(5);
  });

  test('chooseBucketDays returns reasonable buckets', () => {
    expect(chooseBucketDays(30)).toBe(1);
    expect(chooseBucketDays(120)).toBeGreaterThanOrEqual(7);
    expect(chooseBucketDays(800)).toBeGreaterThanOrEqual(30);
  });

  test('aggregateOnBuckets forward-fills and computes direction', () => {
    const rows = [
      { calendar_id: 20230101, close_price: '10' },
      { calendar_id: 20230103, close_price: '12' },
      { calendar_id: 20230107, close_price: '14' },
    ];
    const globalStart = parseYYYYMMDD(20230101);
    const bucketDays = 2;
    const bucketCount = 4;
    const res = aggregateOnBuckets(rows as any, globalStart, bucketDays, bucketCount);
    expect(res.data.length).toBe(bucketCount);
    expect(['up', 'down']).toContain(res.upOrDown);
  });

  test('buildBucketLabels returns array of labels', () => {
    const globalStart = parseYYYYMMDD(20230101);
    const labels = buildBucketLabels(globalStart, 7, 5);
    expect(labels.length).toBe(5);
    expect(labels[0]).toMatch(/2023-01-01/);
  });
});
