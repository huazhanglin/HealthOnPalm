// lib/domain/entities/health_entity.dart

class HealthEntity {
  final DateTime date;
  final int? steps;
  final int? heartRateAvg;
  final double? sleepHours;
  final int? calories;

  HealthEntity({
    required this.date,
    this.steps,
    this.heartRateAvg,
    this.sleepHours,
    this.calories,
  });
}
