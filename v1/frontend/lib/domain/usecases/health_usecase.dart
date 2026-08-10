// lib/domain/usecases/health_usecase.dart

import '../../data/repositories/health_repository.dart';

class HealthUseCase {
  final HealthRepository _repository;

  HealthUseCase(this._repository);

  Future<List<Map<String, dynamic>>> getHealthData() {
    return _repository.getHealthData();
  }

  Future<Map<String, dynamic>> saveHealthData(Map<String, dynamic> data) {
    return _repository.saveHealthData(data);
  }
}
