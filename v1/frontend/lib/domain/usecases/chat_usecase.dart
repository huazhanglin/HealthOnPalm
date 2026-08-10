// lib/domain/usecases/chat_usecase.dart

import '../../data/datasources/remote/sse_client.dart';

class ChatUseCase {
  final SseClient _sseClient;

  ChatUseCase(this._sseClient);

  Stream<String> sendMessage(String message, List<Map<String, String>> history) {
    return _sseClient.streamMessage(message: message, history: history);
  }
}
