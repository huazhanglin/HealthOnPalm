// lib/domain/usecases/plan_usecase.dart

import 'package:dio/dio.dart';
import '../../data/datasources/remote/api_client.dart';
import '../../data/datasources/remote/api_endpoints.dart';

class PlanUseCase {
  final _dio = ApiClient().dio;

  Future<Map<String, dynamic>> generatePlan(String goal, int durationWeeks) async {
    final response = await _dio.post(ApiEndpoints.planGenerate, data: {
      'goal': goal,
      'duration_weeks': durationWeeks,
    });
    return response.data;
  }

  Future<List<Map<String, dynamic>>> getPlans() async {
    final response = await _dio.get(ApiEndpoints.plans);
    return List<Map<String, dynamic>>.from(response.data);
  }
}
