// lib/presentation/screens/health/health_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_strings.dart';
import '../../providers/health_provider.dart';
import 'widgets/health_card.dart';
import 'widgets/steps_chart.dart';

class HealthScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends ConsumerState<HealthScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(healthProvider.notifier).loadHealthData();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(healthProvider);

    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.navHealth)),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.healthData.isEmpty
              ? _buildEmptyState(context)
              : RefreshIndicator(
                  onRefresh: () => ref.read(healthProvider.notifier).loadHealthData(),
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      HealthCard(
                        title: AppStrings.healthSteps,
                        value: '8,234',
                        unit: '步',
                        icon: Icons.directions_walk,
                        color: Colors.blue,
                      ),
                      const SizedBox(height: 12),
                      HealthCard(
                        title: AppStrings.healthHeartRate,
                        value: '72',
                        unit: 'bpm',
                        icon: Icons.favorite,
                        color: Colors.red,
                      ),
                      const SizedBox(height: 12),
                      HealthCard(
                        title: AppStrings.healthSleep,
                        value: '7.5',
                        unit: '小时',
                        icon: Icons.bedtime,
                        color: Colors.purple,
                      ),
                      const SizedBox(height: 12),
                      HealthCard(
                        title: AppStrings.healthCalories,
                        value: '1,856',
                        unit: 'kcal',
                        icon: Icons.local_fire_department,
                        color: Colors.orange,
                      ),
                      const SizedBox(height: 24),
                      const Text('近 7 天步数趋势', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      const StepsChart(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.health_and_safety_outlined, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          const Text('暂无健康数据'),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () => Navigator.pushNamed(context, '/health/consent'),
            child: const Text('授权健康数据'),
          ),
        ],
      ),
    );
  }
}
