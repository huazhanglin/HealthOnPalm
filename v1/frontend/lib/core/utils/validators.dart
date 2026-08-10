// lib/core/utils/validators.dart

class Validators {
  static String? email(String? value) {
    if (value == null || value.isEmpty) return '请输入邮箱';
    final regex = RegExp(r'^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$');
    if (!regex.hasMatch(value)) return '邮箱格式不正确';
    return null;
  }

  static String? password(String? value) {
    if (value == null || value.isEmpty) return '请输入密码';
    if (value.length < 8) return '密码至少 8 位';
    if (!RegExp(r'[a-zA-Z]').hasMatch(value)) return '密码需包含字母';
    if (!RegExp(r'[0-9]').hasMatch(value)) return '密码需包含数字';
    return null;
  }

  static String? required(String? value, {String label = '此字段'}) {
    if (value == null || value.isEmpty) return '$label不能为空';
    return null;
  }
}
