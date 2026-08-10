// lib/presentation/providers/chat_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:uuid/uuid.dart';
import '../../data/models/message.dart';
import '../../data/datasources/remote/sse_client.dart';

part 'chat_provider.freezed.dart';

class ChatNotifier extends StateNotifier<ChatState> {
  final Ref _ref;
  final SseClient _sseClient;
  final _uuid = const Uuid();

  ChatNotifier(this._ref, this._sseClient) : super(ChatState.initial());

  /// 发送消息（流式）
  Future<void> sendMessage(String content) async {
    // 1. 添加用户消息（使用 UUID，不用时间戳） (修订 P1-3)
    final userMessage = Message(
      id: _uuid.v4(),
      content: content,
      role: MessageRole.user,
      createdAt: DateTime.now(),
    );

    state = state.copyWith(
      messages: [...state.messages, userMessage],
      isStreaming: true,
      streamingContent: '',
      error: null,
    );

    // 2. 创建占位的 Agent 消息
    final agentMessageId = _uuid.v4();
    state = state.copyWith(
      messages: [...state.messages, Message(
        id: agentMessageId,
        content: '',
        role: MessageRole.agent,
        createdAt: DateTime.now(),
        isStreaming: true,
      )],
    );

    // 3. 通过 SSE 流式接收回复
    try {
      String fullResponse = '';

      await for (final chunk in _sseClient.streamMessage(
        message: content,
        history: _buildHistory(),  // 已截断 (修订 P1-2)
      )) {
        fullResponse += chunk;
        // 更新最后一条消息的内容
        final messages = List<Message>.from(state.messages);
        final lastIdx = messages.length - 1;
        messages[lastIdx] = messages[lastIdx].copyWith(content: fullResponse);
        state = state.copyWith(messages: messages, streamingContent: fullResponse);
      }

      // 4. 流式完成
      final messages = List<Message>.from(state.messages);
      final lastIdx = messages.length - 1;
      messages[lastIdx] = messages[lastIdx].copyWith(isStreaming: false);
      state = state.copyWith(messages: messages, isStreaming: false);

    } catch (e) {
      // 5. 错误处理 -- 移除占位消息，显示错误
      final messages = state.messages.where((m) => m.id != agentMessageId).toList();
      state = state.copyWith(
        messages: messages,
        isStreaming: false,
        error: '生成回复失败，请重试',
      );
    }
  }

  /// 构建历史消息 -- 截断到最近 10 条 (修订 P1-2)
  List<Map<String, String>> _buildHistory() {
    const maxHistory = 10; // 约 5 轮对话
    final recent = state.messages.length > maxHistory
        ? state.messages.sublist(state.messages.length - maxHistory)
        : state.messages;

    return recent
        .where((m) => m.content.isNotEmpty) // 排除空内容（流式占位）
        .map((m) => {
              'role': m.role == MessageRole.user ? 'user' : 'assistant',
              'content': m.content,
            })
        .toList();
  }

  void clearMessages() {
    state = ChatState.initial();
  }
}

// State 定义
@freezed
class ChatState with _$ChatState {
  const factory ChatState({
    @Default([]) List<Message> messages,
    @Default(false) bool isStreaming,
    @Default('') String streamingContent,
    String? error,
  }) = _ChatState;

  factory ChatState.initial() => const ChatState();
}

// Provider
final chatProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  return ChatNotifier(ref, ref.watch(sseClientProvider));
});
