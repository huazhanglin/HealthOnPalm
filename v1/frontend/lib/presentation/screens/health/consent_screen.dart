// lib/presentation/screens/health/consent_screen.dart

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';

class ConsentScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('健康数据授权')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.shield, size: 48, color: AppColors.primary),
            const SizedBox(height: 16),
            Text('隐私保护说明', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 24),
            _buildInfoItem('数据范围', '步数、心率、睡眠、卡路里等运动健康数据'),
            _buildInfoItem('用途', '用于分析健康趋势、提供运动建议'),
            _buildInfoItem('存储期限', '数据存储在加密数据库中，账号注销后 30 天内删除'),
            _buildInfoItem('第三方共享', '仅在生成 AI 回复时与 LLM 服务共享必要数据'),
            const Spacer(),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => context.go('/health'),
                    child: const Text('不同意'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      // TODO: 调用授权 API
                      context.go('/health');
                    },
                    child: const Text('同意并授权'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem(String title, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 4),
          Text(desc, style: TextStyle(color: Colors.grey[600], fontSize: 14)),
        ],
      ),
    );
  }
}
