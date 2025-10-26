export interface APIError {
  message: string;
  code?: string;
}

export interface QueryParams {
  id_ticker: number;
  start_date: string;
  end_date: string;
}

export interface ChartDataPoint {
  date: string;
  price: number;
  volume: number;
}

export type PricePoint = {
  calendar_id: number;
  close_price: number;
  volume: number | null;
};

export type TickerPriceSeries = {
  ticker_id: number;
  points: PricePoint[];
};

export type PriceHistoryResponse = {
  items: PriceHistoryResponseItem[];
};

export type PriceHistoryResponseItem = {
  ticker_id: number | string;
  points?: PriceHistoryResponsePoint[] | null;
};

export type PriceHistoryResponsePoint = {
  calendar_id?: number | string | null;
  close_price?: number | string | null;
  volume?: number | string | null;
};

export type TickerSummary = {
  ticker_id: number;
  symbol: string;
  name?: string;
  asset_class?: string;
};

export type GeographyGroup = {
  geography_id: number;
  geography_name: string;
  continent?: string | null;
  country?: string | null;
  iso_code?: string | null;
  tickers: TickerSummary[];
};

export type GeographyResponse = {
  items: GeographyResponseItem[];
};

export type GeographyResponseItem = {
  geography_id: number | string;
  geography_name?: string | null;
  continent?: string | null;
  country?: string | null;
  iso_code?: string | null;
  tickers?: GeographyResponseTicker[] | null;
};

export type GeographyResponseTicker = {
  ticker_id?: number | string | null;
  symbol?: string | null;
  name?: string | null;
  asset_class?: string | null;
};