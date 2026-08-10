// lib/core/config/api_config.dart

class ApiConfig {
  // 开发环境
  static const String devBaseUrl = 'http://10.0.2.2:8000';  // Android 模拟器访问本机
  static const String prodBaseUrl = 'https://api.your-domain.com';

  static String get baseUrl => prodBaseUrl;  // TODO: 根据环境切换

  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
