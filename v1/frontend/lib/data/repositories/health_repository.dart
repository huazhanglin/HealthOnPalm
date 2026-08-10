// lib/data/repositories/health_repository.dart

import 'package:dio/dio.dart';
import '../datasources/remote/api_client.dart';
import '../datasources/remote/api_endpoints.dart';

class HealthRepository {
  final _dio = ApiClient().dio;

  Future<List<Map<String, dynamic>>> getHealthData({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final response = await _dio.get(ApiEndpoints.healthData, queryParameters: {
      if (startDate != null) 'start_date': startDate.toIso8601String().split('T')[0],
      if (endDate != null) 'end_date': endDate.toIso8601String().split('T')[0],
    });
    return List<Map<String, dynamic>>.from(response.data);
  }

  Future<Map<String, dynamic>> saveHealthData(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiEndpoints.healthData, data: data);
    return response.data;
  }
}
