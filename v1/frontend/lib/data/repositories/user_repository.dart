// lib/data/repositories/user_repository.dart

import 'package:dio/dio.dart';
import '../datasources/remote/api_client.dart';
import '../datasources/remote/api_endpoints.dart';
import '../models/user.dart';

class UserRepository {
  final _dio = ApiClient().dio;

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post(ApiEndpoints.login, data: {
      'email': email,
      'password': password,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> register(String email, String password, String fullName) async {
    final response = await _dio.post(ApiEndpoints.register, data: {
      'email': email,
      'password': password,
      'full_name': fullName,
    });
    return response.data;
  }

  Future<User> getUserProfile() async {
    final response = await _dio.get('${ApiEndpoints.prefix}/user/profile');
    return User.fromJson(response.data);
  }
}
