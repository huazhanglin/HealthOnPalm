// lib/data/datasources/remote/api_client.dart

import 'package:dio/dio.dart';
import '../../core/config/api_config.dart';
import '../local/secure_storage.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._();
  factory ApiClient() => _instance;
  ApiClient._();

  late final Dio dio;

  Future<void> init() async {
    dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      headers: {'Content-Type': 'application/json'},
    ));

    // 添加认证拦截器
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await SecureStorage().getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        // Token 过期自动刷新
        if (error.response?.statusCode == 401) {
          // TODO: 刷新 Token 并重试
        }
        handler.next(error);
      },
    ));
  }
}
