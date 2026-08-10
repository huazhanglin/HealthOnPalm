// lib/services/api_service.dart

import '../data/datasources/remote/api_client.dart';
import '../data/datasources/remote/api_endpoints.dart';

class ApiService {
  final _dio = ApiClient().dio;

  Future<Map<String, dynamic>> get(String endpoint, {Map<String, dynamic>? query}) async {
    final response = await _dio.get(endpoint, queryParameters: query);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> post(String endpoint, {Map<String, dynamic>? data}) async {
    final response = await _dio.post(endpoint, data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getList(String endpoint, {Map<String, dynamic>? query}) async {
    final response = await _dio.get(endpoint, queryParameters: query);
    return response.data as List<dynamic>;
  }
}
