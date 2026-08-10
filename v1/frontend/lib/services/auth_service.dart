// lib/services/auth_service.dart

import '../data/datasources/local/secure_storage.dart';

class AuthService {
  final _storage = SecureStorage();

  Future<bool> isLoggedIn() async {
    final token = await _storage.getAccessToken();
    return token != null;
  }

  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.setAccessToken(accessToken);
    await _storage.setRefreshToken(refreshToken);
  }

  Future<void> clearTokens() async {
    await _storage.clearAll();
  }
}
