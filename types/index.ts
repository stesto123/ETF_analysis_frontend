export interface ETFData {
  ID_ticker: number;
  calendar_id: number;
  close_price: string;
  id_etf_data: number;
  insert_datetime: string;
  ticker: string;
  // Optional from backend join on Tickers
  nome?: string;
  volume: number;
}

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