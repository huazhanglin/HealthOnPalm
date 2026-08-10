// lib/presentation/screens/plan/widgets/plan_card.dart

import 'package:flutter/material.dart';

class PlanCard extends StatelessWidget {
  final String title;
  final String goal;
  final int durationWeeks;
  final bool isActive;

  const PlanCard({
    super.key,
    required this.title,
    required this.goal,
    required this.durationWeeks,
    this.isActive = false,
  });

  String get _goalText {
    switch (goal) {
      case 'weight_loss': return '减脂';
      case 'muscle_gain': return '增肌';
      default: return '健康维持';
    }
  }

  Color get _goalColor {
    switch (goal) {
      case 'weight_loss': return Colors.orange;
      case 'muscle_gain': return Colors.red;
      default: return Colors.green;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                ),
                if (isActive)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                    child: const Text('进行中', style: TextStyle(color: Colors.green, fontSize: 12)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: _goalColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                  child: Text(_goalText, style: TextStyle(color: _goalColor, fontSize: 12)),
                ),
                const SizedBox(width: 12),
                Text('$durationWeeks 周', style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
