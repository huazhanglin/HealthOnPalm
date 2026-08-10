// lib/data/datasources/local/cache_manager.dart

import 'local_cache.dart';

class CacheManager {
  static final CacheManager _instance = CacheManager._();
  factory CacheManager() => _instance;
  CacheManager._();

  final _cache = LocalCache();

  Future<void> init() async {
    await _cache.init();
  }

  Future<void> clearAll() async {
    await _cache._chatBox.clear();
    await _cache._userBox.clear();
  }
}
