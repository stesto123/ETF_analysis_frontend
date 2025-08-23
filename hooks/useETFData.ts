import { useCallback, useState } from 'react';
import { ETFData, QueryParams } from '@/types';
import { apiService } from '@/services/api';
import {
  parseYYYYMMDD,
  daysBetween,
  chooseBucketDays,
  aggregateOnBuckets,
  buildBucketLabels,
} from '@/utils/aggregation';

type MultiDatasetWithLabels = { label: string; data: number[]; colorHint?: 'up' | 'down'; labels?: string[] };

export function useETFData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [multiDatasets, setMultiDatasets] = useState<MultiDatasetWithLabels[] | null>(null);
  const [cumDatasets, setCumDatasets] = useState<MultiDatasetWithLabels[] | null>(null);
  const [lastRange, setLastRange] = useState<{ start_date: string; end_date: string } | null>(null);

  const fetchSelected = useCallback(async (toLoad: { ID_ticker: number; ticker: string }[], range: { start_date: string; end_date: string }, useCache = true) => {
    if (toLoad.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        toLoad.map((t) => apiService.fetchETFData({ id_ticker: t.ID_ticker, start_date: range.start_date, end_date: range.end_date } as QueryParams, useCache).then((rows: ETFData[]) => ({ t, rows })))
      );

      let minCal = Infinity;
      let maxCal = -Infinity;
      results.forEach(({ rows }) => {
        if (!rows.length) return;
        const first = rows.reduce((m, r) => Math.min(m, r.calendar_id), rows[0].calendar_id);
        const last = rows.reduce((m, r) => Math.max(m, r.calendar_id), rows[0].calendar_id);
        minCal = Math.min(minCal, first);
        maxCal = Math.max(maxCal, last);
      });

      if (!isFinite(minCal) || !isFinite(maxCal)) {
        setMultiDatasets(null);
        setLastRange(range);
        return;
      }

      const globalStart = parseYYYYMMDD(minCal);
      const globalEnd = parseYYYYMMDD(maxCal);
      const spanDays = daysBetween(globalStart, globalEnd);
      const bucketDays = chooseBucketDays(spanDays, 60);
      const bucketCount = Math.max(1, Math.ceil(spanDays / bucketDays) + 1);

      const labels = buildBucketLabels(globalStart, bucketDays, bucketCount);

      const datasets: MultiDatasetWithLabels[] = results.map(({ t, rows }) => {
        const agg = aggregateOnBuckets(rows, globalStart, bucketDays, bucketCount);
        return { label: t.ticker, data: agg.data, colorHint: agg.upOrDown, labels };
      });

      setMultiDatasets(datasets);
      setLastRange(range);

      // fetch cumulative returns in background
      try {
        const cumRes = await Promise.all(
          toLoad.map((t) => apiService.fetchCumulativeReturns({ id_ticker: t.ID_ticker, start_date: range.start_date, end_date: range.end_date }, useCache).then((r) => ({ t, r })))
        );
  const cumDatas = cumRes.map(({ t, r }) => ({ label: t.ticker, data: r.simple, colorHint: 'up' as 'up', labels: Array.isArray(r.calendar_days) ? r.calendar_days.map((n: any) => {
          const s = String(n);
          return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s;
        }) : [] }));
        setCumDatasets(cumDatas);
      } catch {
        setCumDatasets(null);
      }
    } catch (e) {
      setMultiDatasets(null);
      setError(e instanceof Error ? e.message : 'Errore inatteso durante il caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    multiDatasets,
    cumDatasets,
    lastRange,
    fetchSelected,
  };
}

export default useETFData;
