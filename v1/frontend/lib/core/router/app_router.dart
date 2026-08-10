// lib/core/router/app_router.dart

import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../presentation/providers/auth_provider.dart';
import '../presentation/screens/auth/login_screen.dart';
import '../presentation/screens/auth/register_screen.dart';
import '../presentation/screens/home/home_screen.dart';
import '../presentation/screens/chat/chat_screen.dart';
import '../presentation/screens/health/health_screen.dart';
import '../presentation/screens/health/consent_screen.dart';
import '../presentation/screens/plan/plan_screen.dart';
import '../presentation/screens/profile/profile_screen.dart';
import '../presentation/screens/profile/privacy_screen.dart';
import '../presentation/screens/profile/data_export_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggedIn = authState.isLoggedIn;
      final isOnLogin = state.matchedLocation == '/login';

      if (!isLoggedIn && !isOnLogin) {
        return '/login';
      }
      if (isLoggedIn && isOnLogin) {
        return '/';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (ctx, state) => LoginScreen()),
      GoRoute(path: '/register', builder: (ctx, state) => RegisterScreen()),
      GoRoute(path: '/', builder: (ctx, state) => HomeScreen()),
      GoRoute(path: '/chat', builder: (ctx, state) => ChatScreen()),
      GoRoute(path: '/health', builder: (ctx, state) => HealthScreen()),
      GoRoute(path: '/health/consent', builder: (ctx, state) => ConsentScreen()),
      GoRoute(path: '/plan', builder: (ctx, state) => PlanScreen()),
      GoRoute(path: '/profile', builder: (ctx, state) => ProfileScreen()),
      GoRoute(path: '/profile/privacy', builder: (ctx, state) => PrivacyScreen()),
      GoRoute(path: '/profile/data-export', builder: (ctx, state) => DataExportScreen()),
    ],
  );
});
