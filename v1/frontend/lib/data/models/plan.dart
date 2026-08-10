// lib/data/models/plan.dart

import 'package:freezed_annotation/freezed_annotation.dart';

part 'plan.freezed.dart';
part 'plan.g.dart';

@freezed
class TrainingPlan with _$TrainingPlan {
  const factory TrainingPlan({
    required String id,
    required String title,
    String? goal,
    int? durationWeeks,
    Map<String, dynamic>? planContent,
    @Default(true) bool isActive,
    DateTime? createdAt,
  }) = _TrainingPlan;

  factory TrainingPlan.fromJson(Map<String, dynamic> json) => _$TrainingPlanFromJson(json);
}
