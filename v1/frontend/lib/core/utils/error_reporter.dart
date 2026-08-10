// lib/core/utils/error_reporter.dart

import 'package:flutter/foundation.dart';

class ErrorReporter {
  static Future<void> report(Object error, StackTrace? stack) async {
    // 开发环境：打印到控制台
    if (kDebugMode) {
      print('=== ERROR ===');
      print(error);
      print(stack);
    }
    // 生产环境：上报到错误监控服务（如 Sentry）
    // await Sentry.captureException(error, stackTrace: stack);
  }
}
