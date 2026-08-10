// lib/presentation/providers/auth_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import '../../data/repositories/user_repository.dart';
import '../../data/datasources/local/secure_storage.dart';

part 'auth_provider.freezed.dart';

class AuthNotifier extends StateNotifier<AuthState> {
  final UserRepository _repository;

  AuthNotifier(this._repository) : super(AuthState.initial());

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _repository.login(email, password);
      await SecureStorage().setAccessToken(result['access_token']);
      await SecureStorage().setRefreshToken(result['refresh_token']);
      state = state.copyWith(isLoggedIn: true, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: '登录失败：$e');
    }
  }

  Future<void> register(String email, String password, String fullName) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _repository.register(email, password, fullName);
      await SecureStorage().setAccessToken(result['access_token']);
      await SecureStorage().setRefreshToken(result['refresh_token']);
      state = state.copyWith(isLoggedIn: true, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: '注册失败：$e');
    }
  }

  Future<void> logout() async {
    await SecureStorage().clearAll();
    state = AuthState.initial();
  }

  Future<void> checkAuthStatus() async {
    final token = await SecureStorage().getAccessToken();
    state = state.copyWith(isLoggedIn: token != null);
  }
}

@freezed
class AuthState with _$AuthState {
  const factory AuthState({
    @Default(false) bool isLoggedIn,
    @Default(false) bool isLoading,
    String? error,
  }) = _AuthState;

  factory AuthState.initial() => const AuthState();
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(UserRepository());
});
