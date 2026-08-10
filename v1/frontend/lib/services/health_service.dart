// lib/services/health_service.dart

import 'package:health/health.dart';

class HealthDataService {
  final _health = Health();

  Future<bool> requestAuthorization() async {
    final types = [
      HealthDataType.STEPS,
      HealthDataType.HEART_RATE,
      HealthDataType.SLEEP_ASLEEP,
      HealthDataType.ACTIVE_ENERGY_BURNED,
    ];

    return await _health.requestAuthorization(types);
  }

  Future<Map<String, dynamic>> getTodayData() async {
    final now = DateTime.now();
    final midnight = DateTime(now.year, now.month, now.day);

    final steps = await _health.getTotalStepsInInterval(midnight, now);

    return {
      'steps': steps ?? 0,
      'date': now.toIso8601String().split('T')[0],
    };
  }
}
