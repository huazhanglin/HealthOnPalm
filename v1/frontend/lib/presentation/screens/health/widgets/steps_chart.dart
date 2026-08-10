// lib/presentation/screens/health/widgets/steps_chart.dart

import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

class StepsChart extends StatelessWidget {
  const StepsChart({super.key});

  final List<double> _data = const [6234, 8567, 7234, 9876, 5432, 10234, 8234];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 200,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: BarChart(
            BarChartData(
              alignment: BarChartAlignment.spaceAround,
              maxY: 12000,
              barTouchData: BarTouchData(enabled: true),
              titlesData: FlTitlesData(
                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                      return Text(days[value.toInt()], style: const TextStyle(fontSize: 10));
                    },
                  ),
                ),
              ),
              borderData: FlBorderData(show: false),
              barGroups: _data.asMap().entries.map((e) {
                return BarChartGroupData(
                  x: e.key,
                  barRods: [
                    BarChartRodData(
                      toY: e.value,
                      color: Theme.of(context).colorScheme.primary,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                      width: 20,
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
        ),
      ),
    );
  }
}
