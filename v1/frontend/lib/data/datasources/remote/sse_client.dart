// lib/data/datasources/remote/sse_client.dart

import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import '../local/secure_storage.dart';
import '../../../core/config/api_config.dart';

class SseClient {
  final Dio _dio = Dio();
  final SecureStorage _storage = SecureStorage();

  /// 流式发送消息，返回逐 chunk 的 Stream
  Stream<String> streamMessage({
    required String message,
    required List<Map<String, String>> history,
  }) async* {
    final token = await _storage.getAccessToken();

    final response = await _dio.post<ResponseBody>(
      '${ApiConfig.baseUrl}/api/v1/chat/stream',
      data: {
        'message': message,
        'history': history,
      },
      options: Options(
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'text/event-stream',
        },
        responseType: ResponseType.stream,
      ),
    );

    // 解析 SSE 流
    final stream = response.data!.stream
        .transform(utf8.decoder)
        .transform(const LineSplitter());

    String buffer = '';
    await for (final line in stream) {
      if (line.startsWith('data: ')) {
        buffer = line.substring(6);
        try {
          final json = jsonDecode(buffer);
          if (json['done'] == true) return;
          if (json['error'] != null) {
            throw Exception(json['error']);
          }
          if (json['content'] != null) {
            yield json['content'] as String;
          }
        } catch (e) {
          // JSON 不完整，等下一行
          continue;
        }
      }
    }
  }
}

// Provider
final sseClientProvider = Provider<SseClient>((ref) => SseClient());
