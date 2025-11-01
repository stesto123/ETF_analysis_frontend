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
  cumulative_return: number | null;
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

export type PortfolioSummary = {
  portfolio_id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: string;
  last_modified: string | null;
};

export type PortfolioSummaryResponse = {
  items: PortfolioSummary[];
};

export type PortfolioCompositionEntry = {
  composition_id: number;
  portfolio_id: number;
  ticker_id: number;
  user_id: number;
  weight: number;
  description: string | null;
  created_at: string;
};

export type PortfolioDeleteResponse = {
  portfolio_id: number;
  deleted: boolean;
  removed_compositions?: number | null;
};

export type PortfolioCompositionResponse = {
  portfolio_id: number;
  user_id: number;
  items: PortfolioCompositionEntry[];
};

export type SimulationStrategy = {
  strategy_id: number;
  strategy_name: string;
  strategy_description: string | null;
};

export type SimulationStrategyResponse = {
  items: SimulationStrategy[];
};

export type SimulationRunPayload = {
  user_id: number;
  portfolio_id: number;
  strategy_id: number;
  monthly_investment: number;
  initial_capital?: number;
  start_calendar_id?: number;
  end_calendar_id?: number;
  rebalance_threshold?: number;
};

export type SimulationRunResponse = {
  asset_rows?: any[];
  aggregate_rows?: any[];
  transaction_rows?: any[];
  status: string;
  message?: string;
};

export type SimulationAggregatePoint = {
  calendar_id: number;
  total_value_in_dollars: number;
  invested_value: number | null;
  gain: number | null;
};

export type SimulationAggregateSeries = {
  portfolio_id: number;
  strategy_id: number | null;
  points: SimulationAggregatePoint[];
};

export type SimulationAggregateResultsResponse = {
  items: SimulationAggregateSeries[];
};

export type UserProfile = {
  user_id: number;
  username: string | null;
  email: string | null;
  created_at: string | null;
  last_login: string | null;
  subscription_id: number | null;
  clerk_user_id: string | null;
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