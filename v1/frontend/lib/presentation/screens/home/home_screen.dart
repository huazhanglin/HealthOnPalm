// lib/presentation/screens/home/home_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';

class HomeScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.appName)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('你好！', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 8),
            Text('今天想做些什么？', style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 24),
            _buildFeatureCard(
              context,
              icon: Icons.chat,
              title: AppStrings.navChat,
              subtitle: '和 AI 健康顾问聊聊',
              color: AppColors.primary,
              onTap: () => context.go('/chat'),
            ),
            const SizedBox(height: 12),
            _buildFeatureCard(
              context,
              icon: Icons.favorite,
              title: AppStrings.navHealth,
              subtitle: '查看今日健康数据',
              color: AppColors.accent,
              onTap: () => context.go('/health'),
            ),
            const SizedBox(height: 12),
            _buildFeatureCard(
              context,
              icon: Icons.fitness_center,
              title: AppStrings.navPlan,
              subtitle: '查看训练计划',
              color: AppColors.info,
              onTap: () => context.go('/plan'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureCard(BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleMedium),
                    Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}
