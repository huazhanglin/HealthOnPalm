// lib/domain/entities/user_entity.dart

class UserEntity {
  final String id;
  final String email;
  final String? fullName;
  final bool isPremium;

  UserEntity({
    required this.id,
    required this.email,
    this.fullName,
    this.isPremium = false,
  });
}
