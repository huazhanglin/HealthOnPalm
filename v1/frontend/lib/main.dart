// lib/main.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/utils/error_reporter.dart';

void main() {
  runZonedGuarded(() {
    FlutterError.onError = (details) {
      FlutterError.presentError(details);
      ErrorReporter.report(details.exception, details.stack);
    };
    runApp(ProviderScope(child: HealthAgentApp()));
  }, (error, stack) {
    ErrorReporter.report(error, stack);
  });
}
