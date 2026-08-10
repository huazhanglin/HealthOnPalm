# app/core/encryption.py

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
import json
import base64

class DataEncryptor:
    """AES-256-GCM 数据加密器"""

    def __init__(self):
        # 密钥从环境变量注入，32 字节 = 256 位
        key = os.getenv("DATA_ENCRYPTION_KEY")
        if not key:
            raise RuntimeError("DATA_ENCRYPTION_KEY 未配置")
        self.aesgcm = AESGCM(key.encode()[:32])

    def encrypt(self, data: dict) -> bytes:
        """加密字典数据，返回 nonce + ciphertext"""
        plaintext = json.dumps(data).encode()
        nonce = os.urandom(12)  # 96-bit nonce
        ciphertext = self.aesgcm.encrypt(nonce, plaintext, None)
        return nonce + ciphertext

    def decrypt(self, encrypted: bytes) -> dict:
        """解密数据"""
        nonce = encrypted[:12]
        ciphertext = encrypted[12:]
        plaintext = self.aesgcm.decrypt(nonce, ciphertext, None)
        return json.loads(plaintext.decode())
