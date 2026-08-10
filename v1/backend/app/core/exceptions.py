# app/core/exceptions.py

class AppException(Exception):
    """应用基础异常"""

    def __init__(self, message: str = "服务异常", status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class AuthenticationError(AppException):
    def __init__(self, message: str = "认证失败"):
        super().__init__(message, 401)


class AuthorizationError(AppException):
    def __init__(self, message: str = "无权限访问"):
        super().__init__(message, 403)


class NotFoundError(AppException):
    def __init__(self, message: str = "资源不存在"):
        super().__init__(message, 404)


class RateLimitError(AppException):
    def __init__(self, message: str = "请求频率超限"):
        super().__init__(message, 429)


class ComplianceError(AppException):
    def __init__(self, message: str = "合规检查未通过"):
        super().__init__(message, 400)
