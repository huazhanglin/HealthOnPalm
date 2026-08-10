// lib/data/models/message.dart

import 'package:freezed_annotation/freezed_annotation.dart';

part 'message.freezed.dart';
part 'message.g.dart';

enum MessageRole { user, agent }

@freezed
class Message with _$Message {
  const factory Message({
    required String id,
    required String content,
    required MessageRole role,
    required DateTime createdAt,
    @Default(false) bool isStreaming,
  }) = _Message;

  factory Message.fromJson(Map<String, dynamic> json) => _$MessageFromJson(json);
}
