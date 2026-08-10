// lib/presentation/screens/profile/data_export_screen.dart

import 'package:flutter/material.dart';

class DataExportScreen extends StatefulWidget {
  @override
  State<DataExportScreen> createState() => _DataExportScreenState();
}

class _DataExportScreenState extends State<DataExportScreen> {
  bool _isExporting = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('导出我的数据')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.download, size: 48),
            const SizedBox(height: 16),
            Text('数据导出', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 16),
            const Text(
              '根据《个人信息保护法》，您有权导出您的全部个人数据，包括：',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 12),
            _buildDataItem('个人资料'),
            _buildDataItem('对话历史'),
            _buildDataItem('健康数据'),
            _buildDataItem('训练计划'),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isExporting ? null : _exportData,
                child: _isExporting
                    ? const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                        SizedBox(width: 8),
                        Text('导出中...'),
                      ])
                    : const Text('导出数据 (JSON)'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDataItem(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [const Icon(Icons.check, size: 16), const SizedBox(width: 8), Text(title)]),
    );
  }

  void _exportData() async {
    setState(() => _isExporting = true);
    // TODO: 调用导出 API
    await Future.delayed(const Duration(seconds: 2));
    setState(() => _isExporting = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('数据导出成功，请检查下载')),
      );
    }
  }
}
