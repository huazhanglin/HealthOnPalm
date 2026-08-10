// lib/data/datasources/local/local_cache.dart

import 'package:hive_flutter/hive_flutter.dart';

class LocalCache {
  static final LocalCache _instance = LocalCache._();
  factory LocalCache() => _instance;
  LocalCache._();

  late Box _chatBox;
  late Box _userBox;

  Future<void> init() async {
    await Hive.initFlutter();
    _chatBox = await Hive.openBox('chat_cache');
    _userBox = await Hive.openBox('user_cache');
  }

  // Chat cache
  Future<void> cacheMessages(String key, List<dynamic> messages) =>
      _chatBox.put(key, messages);

  List<dynamic> getCachedMessages(String key) =>
      _chatBox.get(key, defaultValue: []) as List<dynamic>;

  // User cache
  Future<void> cacheUserProfile(Map<String, dynamic> profile) =>
      _userBox.put('profile', profile);

  Map<String, dynamic>? getCachedUserProfile() =>
      _userBox.get('profile') as Map<String, dynamic>?;
}
