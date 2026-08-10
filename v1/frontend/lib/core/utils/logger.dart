// lib/core/utils/logger.dart

import 'package:flutter/foundation.dart';

class Logger {
  static void debug(String message) {
    if (kDebugMode) print('[DEBUG] $message');
  }

  static void info(String message) {
    if (kDebugMode) print('[INFO] $message');
  }

  static void warning(String message) {
    print('[WARN] $message');
  }

  static void error(String message, [Object? error, StackTrace? stack]) {
    print('[ERROR] $message');
    if (error != null) print(error);
    if (stack != null) print(stack);
  }
}
