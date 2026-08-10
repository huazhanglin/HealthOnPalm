// lib/data/models/health_data.dart

import 'package:freezed_annotation/freezed_annotation.dart';

part 'health_data.freezed.dart';
part 'health_data.g.dart';

@freezed
class HealthData with _$HealthData {
  const factory HealthData({
    required String id,
    required DateTime date,
    int? steps,
    int? heartRateAvg,
    double? sleepHours,
    int? calories,
    String? dataSource,
  }) = _HealthData;

  factory HealthData.fromJson(Map<String, dynamic> json) => _$HealthDataFromJson(json);
}
