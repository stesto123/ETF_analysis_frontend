import { ETFData } from '@/types';

export const parseYYYYMMDD = (n: number) => {
  const y = Math.floor(n / 10000);
  const m = Math.floor((n % 10000) / 100) - 1;
  const d = n % 100;
  return new Date(y, m, d);
};

export const fmtYYYYMMDD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return Number(`${y}${m}${day}`);
};

export const daysBetween = (a: Date, b: Date) => Math.max(1, Math.round((+b - +a) / 86400000));

export const chooseBucketDays = (spanDays: number, maxPoints = 60) => {
  let bucketDays: number;
  if (spanDays <= 60) bucketDays = 1;
  else if (spanDays <= 180) bucketDays = 7;
  else if (spanDays <= 720) bucketDays = 30;
  else bucketDays = 90;
  const est = Math.ceil(spanDays / bucketDays);
  return est > maxPoints ? Math.ceil(spanDays / maxPoints) : bucketDays;
};

export const aggregateOnBuckets = (
  rows: ETFData[],
  globalStart: Date,
  bucketDays: number,
  bucketCount: number
): { data: number[]; upOrDown: 'up' | 'down' } => {
  const sorted = [...rows].sort((a, b) => a.calendar_id - b.calendar_id);
  const acc = Array.from({ length: bucketCount }, () => ({ sum: 0, cnt: 0 }));

  for (const r of sorted) {
    const d = parseYYYYMMDD(r.calendar_id);
    let idx = Math.floor(daysBetween(globalStart, d) / bucketDays);
    if (idx < 0) idx = 0;
    if (idx >= bucketCount) idx = bucketCount - 1;
    const price = parseFloat(r.close_price);
    const cell = acc[idx];
    cell.sum += price;
    cell.cnt += 1;
  }

  const series: number[] = [];
  let prev = sorted.length ? parseFloat(sorted[0].close_price) : 0;
  for (let i = 0; i < bucketCount; i++) {
    const cell = acc[i];
    if (cell.cnt > 0) {
      prev = cell.sum / cell.cnt;
      series.push(prev);
    } else {
      series.push(prev);
    }
  }

  const first = series[0] ?? 0;
  const last = series[series.length - 1] ?? first;
  const upOrDown: 'up' | 'down' = last >= first ? 'up' : 'down';
  return { data: series, upOrDown };
};

export const buildBucketLabels = (globalStart: Date, bucketDays: number, bucketCount: number) => {
  const buildLabel = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const labels: string[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const dt = new Date(globalStart.getTime() + i * bucketDays * 86400000);
    labels.push(buildLabel(dt));
  }
  return labels;
};

export default {
  parseYYYYMMDD,
  fmtYYYYMMDD,
  daysBetween,
  chooseBucketDays,
  aggregateOnBuckets,
  buildBucketLabels,
};
