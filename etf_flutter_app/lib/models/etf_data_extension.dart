import 'types.dart';

extension ETFDataToJson on ETFData {
  Map<String, dynamic> toJson() => {
        'ID_ticker': idTicker,
        'calendar_id': calendarId,
        'close_price': closePrice,
        'id_etf_data': idEtfData,
        'insert_datetime': insertDatetime,
        'ticker': ticker,
        'volume': volume,
      };
}
