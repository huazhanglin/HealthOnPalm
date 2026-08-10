// lib/data/repositories/chat_repository.dart

import 'package:dio/dio.dart';
import '../datasources/remote/api_client.dart';
import '../datasources/remote/api_endpoints.dart';

class ChatRepository {
  final _dio = ApiClient().dio;

  Future<List<Map<String, dynamic>>> getHistory({int limit = 50, int offset = 0}) async {
    final response = await _dio.get(
      ApiEndpoints.chatHistory,
      queryParameters: {'limit': limit, 'offset': offset},
    );
    return List<Map<String, dynamic>>.from(response.data);
  }
}
