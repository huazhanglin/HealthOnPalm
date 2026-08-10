// lib/presentation/screens/plan/plan_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_strings.dart';
import 'widgets/plan_card.dart';

class PlanScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.navPlan)),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: 生成新计划
        },
        child: const Icon(Icons.add),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          PlanCard(
            title: '减脂训练计划',
            goal: 'weight_loss',
            durationWeeks: 4,
            isActive: true,
          ),
          const SizedBox(height: 12),
          PlanCard(
            title: '健康维持计划',
            goal: 'health',
            durationWeeks: 8,
            isActive: false,
          ),
        ],
      ),
    );
  }
}
