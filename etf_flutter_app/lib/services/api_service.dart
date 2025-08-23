import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/types.dart';
import '../models/etf_data_extension.dart';

const String API_BASE_URL = 'https://wa-etf-analysis-d0enavd0h5e9f5gr.italynorth-01.azurewebsites.net';

class ApiService {
  Future<T?> _getCache<T>(String key, int ttlMs) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(key);
      if (raw == null) return null;
      final parsed = jsonDecode(raw) as Map<String, dynamic>;
      final timestamp = parsed['timestamp'] as int;
      final now = DateTime.now().millisecondsSinceEpoch;
      if (now - timestamp < ttlMs) return parsed['data'] as T;
    } catch (e) {
      // ignore
    }
    return null;
  }

  Future<void> _setCache<T>(String key, T data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, jsonEncode({'data': data, 'timestamp': DateTime.now().millisecondsSinceEpoch}));
    } catch (e) {
      // ignore
    }
  }

  Future<String> _getETFCacheKey(QueryParams params) async => 'etf_data_${params.idTicker}_${params.startDate}_${params.endDate}';

  Future<List<ETFData>> fetchETFData(QueryParams params, {bool useCache = true}) async {
    final cacheKey = await _getETFCacheKey(params);
    if (useCache) {
      final cached = await _getCache<List<dynamic>>(cacheKey, 60 * 60 * 1000);
      if (cached != null) return cached.map((e) => ETFData.fromJson(e as Map<String, dynamic>)).toList();
    }

    final uri = Uri.parse('$API_BASE_URL/api/dati').replace(queryParameters: params.toQueryParams());
    final res = await http.get(uri, headers: {'Accept': 'application/json'});
    if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to fetch ETF data: ${res.statusCode}');
    final body = jsonDecode(res.body) as List<dynamic>;
    final data = body.map((e) => ETFData.fromJson(e as Map<String, dynamic>)).toList();
    await _setCache(cacheKey, data.map((e) => e.toJson()).toList());
    return data;
  }

  Future<List<Map<String, dynamic>>> getGeographicAreas({bool useCache = true}) async {
    const cacheKey = 'areas_all';
    if (useCache) {
      final cached = await _getCache<List<dynamic>>(cacheKey, 24 * 60 * 60 * 1000);
      if (cached != null) return cached.cast<Map<String, dynamic>>();
    }

    final uri = Uri.parse('$API_BASE_URL/api/aree_geografiche');
    final res = await http.get(uri, headers: {'Accept': 'application/json'});
    if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to fetch areas: ${res.statusCode}');
    final body = jsonDecode(res.body) as List<dynamic>;
    final out = body.cast<Map<String, dynamic>>();
    await _setCache(cacheKey, out);
    return out;
  }

  Future<List<Map<String, dynamic>>> getTickersByArea(int idArea, {bool useCache = true}) async {
    final cacheKey = 'tickers_area_$idArea';
    if (useCache) {
      final cached = await _getCache<List<dynamic>>(cacheKey, 6 * 60 * 60 * 1000);
      if (cached != null) return cached.cast<Map<String, dynamic>>();
    }

    final uri = Uri.parse('$API_BASE_URL/api/tickers_by_area').replace(queryParameters: {'id_area_geografica': idArea.toString()});
    final res = await http.get(uri, headers: {'Accept': 'application/json'});
    if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to fetch tickers by area: ${res.statusCode}');
    final body = jsonDecode(res.body) as List<dynamic>;
    final out = body.cast<Map<String, dynamic>>();
    await _setCache('tickers_area_$idArea', out);
    return out;
  }

  Future<CumulativeReturns> fetchCumulativeReturns(QueryParams params, {bool useCache = true}) async {
    final cacheKey = 'cum_returns_${params.idTicker}_${params.startDate}_${params.endDate}';
    if (useCache) {
      final cached = await _getCache<Map<String, dynamic>>(cacheKey, 60 * 60 * 1000);
      if (cached != null) {
        final cd = List<int>.from((cached['calendar_days'] as List<dynamic>).map((e) => e as int));
        final simple = List<double>.from((cached['simple'] as List<dynamic>).map((e) => (e as num).toDouble()));
        final log = List<double>.from((cached['log'] as List<dynamic>).map((e) => (e as num).toDouble()));
        return CumulativeReturns(calendarDays: cd, simple: simple, log: log);
      }
    }

    final uri = Uri.parse('$API_BASE_URL/api/cumulative_returns').replace(queryParameters: params.toQueryParams());
    final res = await http.get(uri, headers: {'Accept': 'application/json'});
    if (res.statusCode < 200 || res.statusCode >= 300) throw Exception('Failed to fetch cumulative returns: ${res.statusCode}');
    final body = jsonDecode(res.body);

    if (body is List && body.length >= 3) {
      final calendarDays = List<int>.from((body[0] as List<dynamic>).map((e) => e as int));
      final simple = List<double>.from((body[1] as List<dynamic>).map((e) => (e as num).toDouble()));
      final log = List<double>.from((body[2] as List<dynamic>).map((e) => (e as num).toDouble()));
      final out = CumulativeReturns(calendarDays: calendarDays, simple: simple, log: log);
      await _setCache(cacheKey, {'calendar_days': calendarDays, 'simple': simple, 'log': log});
      return out;
    }

    if (body is Map) {
      final calendarDays = List<int>.from(((body)['calendar_days'] as List<dynamic>).map((e) => e as int));
      final simple = List<double>.from(((body)['simple'] as List<dynamic>).map((e) => (e as num).toDouble()));
      final log = List<double>.from(((body)['log'] as List<dynamic>).map((e) => (e as num).toDouble()));
      final out = CumulativeReturns(calendarDays: calendarDays, simple: simple, log: log);
      await _setCache(cacheKey, {'calendar_days': calendarDays, 'simple': simple, 'log': log});
      return out;
    }

    throw Exception('Invalid cumulative returns response format');
  }

  Future<void> clearCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys();
      final keysToRemove = keys.where((k) => k.startsWith('etf_data_') || k == 'areas_all' || k.startsWith('tickers_area_')).toList();
      for (final k in keysToRemove) {
        await prefs.remove(k);
      }
    } catch (e) {
      // ignore
    }
  }
}
