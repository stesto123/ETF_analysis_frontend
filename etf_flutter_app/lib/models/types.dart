class ETFData {
  int idTicker;
  int calendarId;
  String closePrice;
  int idEtfData;
  String insertDatetime;
  String ticker;
  int volume;

  ETFData({
    required this.idTicker,
    required this.calendarId,
    required this.closePrice,
    required this.idEtfData,
    required this.insertDatetime,
    required this.ticker,
    required this.volume,
  });

  factory ETFData.fromJson(Map<String, dynamic> json) {
    return ETFData(
      idTicker: json['ID_ticker'] as int,
      calendarId: json['calendar_id'] as int,
      closePrice: json['close_price'].toString(),
      idEtfData: json['id_etf_data'] as int,
      insertDatetime: json['insert_datetime'] as String,
      ticker: json['ticker'] as String,
      volume: json['volume'] as int,
    );
  }
}

class QueryParams {
  int idTicker;
  String startDate;
  String endDate;

  QueryParams({required this.idTicker, required this.startDate, required this.endDate});

  Map<String, String> toQueryParams() => {
        'id_ticker': idTicker.toString(),
        'start_date': startDate,
        'end_date': endDate,
      };
}

class CumulativeReturns {
  List<int> calendarDays;
  List<double> simple;
  List<double> log;

  CumulativeReturns({required this.calendarDays, required this.simple, required this.log});
}
