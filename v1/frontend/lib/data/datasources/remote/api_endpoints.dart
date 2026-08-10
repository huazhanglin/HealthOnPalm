// lib/data/datasources/remote/api_endpoints.dart

class ApiEndpoints {
  static const String prefix = '/api/v1';

  // Auth
  static const String login = '$prefix/auth/login';
  static const String register = '$prefix/auth/register';
  static const String refresh = '$prefix/auth/refresh';
  static const String logout = '$prefix/auth/logout';

  // Chat
  static const String chatStream = '$prefix/chat/stream';
  static const String chatHistory = '$prefix/chat/history';

  // Health
  static const String healthData = '$prefix/health/data';
  static const String healthConsent = '$prefix/health/consent';

  // Plan
  static const String planGenerate = '$prefix/plan/generate';
  static const String plans = '$prefix/plans';

  // Compliance
  static const String deleteAccount = '$prefix/compliance/delete-account';
  static const String exportData = '$prefix/compliance/export-data';
}
