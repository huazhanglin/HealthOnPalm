// lib/presentation/providers/health_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import '../../data/repositories/health_repository.dart';

part 'health_provider.freezed.dart';

class HealthNotifier extends StateNotifier<HealthState> {
  final HealthRepository _repository;

  HealthNotifier(this._repository) : super(HealthState.initial());

  Future<void> loadHealthData() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _repository.getHealthData();
      state = state.copyWith(healthData: data, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: '加载健康数据失败');
    }
  }
}

@freezed
class HealthState with _$HealthState {
  const factory HealthState({
    @Default([]) List<Map<String, dynamic>> healthData,
    @Default(false) bool isLoading,
    String? error,
  }) = _HealthState;

  factory HealthState.initial() => const HealthState();
}

final healthProvider = StateNotifierProvider<HealthNotifier, HealthState>((ref) {
  return HealthNotifier(HealthRepository());
});
