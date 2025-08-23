import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'services/api_service.dart';
import 'utils/aggregation.dart' as agg;
import 'models/types.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiService>(create: (_) => ApiService()),
      ],
      child: MaterialApp(
        title: 'ETF Flutter App',
        theme: ThemeData(primarySwatch: Colors.blue),
        home: const HomePage(),
      ),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  List<ETFData> _rows = [];
  String _status = 'Idle';

  Future<void> _loadSample() async {
    setState(() => _status = 'Loading');
    final svc = ApiService();
    try {
      final params = QueryParams(idTicker: 1, startDate: '20200101', endDate: '20231231');
      final data = await svc.fetchETFData(params);
      setState(() {
        _rows = data;
        _status = 'Loaded ${data.length} rows';
      });
    } catch (e) {
      setState(() => _status = 'Error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final globalStart = DateTime.now().subtract(const Duration(days: 365));
    final bucketDays = agg.chooseBucketDays(365);
    final bucketCount = (365 / bucketDays).ceil();
    final aggRes = agg.aggregateOnBuckets(_rows, globalStart, bucketDays, bucketCount);

    return Scaffold(
      appBar: AppBar(title: const Text('ETF Flutter App')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Status: $_status'),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: _loadSample, child: const Text('Load Data')),
            const SizedBox(height: 12),
            Text('Buckets: ${(aggRes['data'] as List).length}, Trend: ${aggRes['upOrDown']}'),
          ],
        ),
      ),
    );
  }
}
