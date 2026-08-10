// lib/presentation/screens/profile/privacy_screen.dart

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';

class PrivacyScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.privacyTitle)),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.description),
            title: const Text('隐私政策'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              // TODO: 显示隐私政策
            },
          ),
          ListTile(
            leading: const Icon(Icons.security),
            title: const Text('数据加密'),
            subtitle: const Text('AES-256-GCM'),
            trailing: const Icon(Icons.check_circle, color: AppColors.success),
          ),
          ListTile(
            leading: const Icon(Icons.download),
            title: const Text(AppStrings.dataExport),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.go('/profile/data-export'),
          ),
          const Divider(),
          ListTile(
            leading: Icon(Icons.delete_forever, color: AppColors.error),
            title: Text(AppStrings.deleteAccount, style: TextStyle(color: AppColors.error)),
            onTap: () => _showDeleteDialog(context),
          ),
        ],
      ),
    );
  }

  void _showDeleteDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('注销账号'),
        content: const Text('注销后账号将在 30 天后永久删除，此操作不可撤销。确定要注销吗？'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          TextButton(
            onPressed: () {
              // TODO: 调用注销 API
              Navigator.pop(ctx);
            },
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('确认注销'),
          ),
        ],
      ),
    );
  }
}
