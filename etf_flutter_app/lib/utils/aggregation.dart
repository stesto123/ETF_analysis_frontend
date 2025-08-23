int fmtYYYYMMDD(DateTime d) {
  final y = d.year;
  final m = (d.month).toString().padLeft(2, '0');
  final day = d.day.toString().padLeft(2, '0');
  return int.parse('${y}${m}${day}');
}

DateTime parseYYYYMMDD(int n) {
  final y = n ~/ 10000;
  final m = (n % 10000) ~/ 100;
  final d = n % 100;
  return DateTime(y, m, d);
}

int daysBetween(DateTime a, DateTime b) => (b.difference(a).inDays).abs().clamp(1, 999999);

int chooseBucketDays(int spanDays, [int maxPoints = 60]) {
  int bucketDays;
  if (spanDays <= 60) bucketDays = 1;
  else if (spanDays <= 180) bucketDays = 7;
  else if (spanDays <= 720) bucketDays = 30;
  else bucketDays = 90;
  final est = (spanDays / bucketDays).ceil();
  return est > maxPoints ? (spanDays / maxPoints).ceil() : bucketDays;
}

class _AccCell {
  double sum = 0;
  int cnt = 0;
}

Map<String, dynamic> aggregateOnBuckets(List rows, DateTime globalStart, int bucketDays, int bucketCount) {
  final sorted = List.of(rows);
  sorted.sort((a, b) => (a.calendarId as int).compareTo(b.calendarId as int));
  final acc = List.generate(bucketCount, (_) => _AccCell());

  for (final r in sorted) {
    final d = parseYYYYMMDD(r.calendarId as int);
    var idx = (daysBetween(globalStart, d) / bucketDays).floor();
    if (idx < 0) idx = 0;
    if (idx >= bucketCount) idx = bucketCount - 1;
    final price = double.tryParse(r.closePrice.toString()) ?? 0.0;
    final cell = acc[idx];
    cell.sum += price;
    cell.cnt += 1;
  }

  final List<double> series = [];
  double prev = sorted.isNotEmpty ? double.tryParse(sorted[0].closePrice.toString()) ?? 0.0 : 0.0;
  for (var i = 0; i < bucketCount; i++) {
    final cell = acc[i];
    if (cell.cnt > 0) {
      prev = cell.sum / cell.cnt;
      series.add(prev);
    } else {
      series.add(prev);
    }
  }

  final first = series.isNotEmpty ? series[0] : 0.0;
  final last = series.isNotEmpty ? series.last : first;
  final upOrDown = last >= first ? 'up' : 'down';
  return {'data': series, 'upOrDown': upOrDown};
}

List<String> buildBucketLabels(DateTime globalStart, int bucketDays, int bucketCount) {
  String buildLabel(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  final labels = <String>[];
  for (var i = 0; i < bucketCount; i++) {
    final dt = globalStart.add(Duration(days: i * bucketDays));
    labels.add(buildLabel(dt));
  }
  return labels;
}
