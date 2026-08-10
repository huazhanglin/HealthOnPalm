// lib/services/storage_service.dart

import '../data/datasources/local/secure_storage.dart';
import '../data/datasources/local/local_cache.dart';

class StorageService {
  final _secure = SecureStorage();
  final _cache = LocalCache();

  Future<void> init() async {
    await _cache.init();
  }

  // Secure storage
  Future<String?> getAccessToken() => _secure.getAccessToken();
  Future<String?> getRefreshToken() => _secure.getRefreshToken();
  Future<void> clearSecureData() => _secure.clearAll();

  // Local cache
  Future<void> cacheMessages(String key, List<dynamic> messages) =>
      _cache.cacheMessages(key, messages);
  List<dynamic> getCachedMessages(String key) =>
      _cache.getCachedMessages(key);
}
