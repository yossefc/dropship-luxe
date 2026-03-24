import CryptoJS from 'crypto-js';

export class CryptoService {
  private readonly encryptionKey: string;

  constructor(encryptionKey: string) {
    if (encryptionKey.length !== 64) {
      throw new Error('Encryption key must be 64 hex characters (256 bits)');
    }
    this.encryptionKey = encryptionKey;
  }

  encryptAES256(plaintext: string): string {
    const key = CryptoJS.enc.Hex.parse(this.encryptionKey);
    const iv = CryptoJS.lib.WordArray.random(16);

    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const combined = iv.concat(encrypted.ciphertext);
    return combined.toString(CryptoJS.enc.Base64);
  }

  decryptAES256(ciphertext: string): string {
    const key = CryptoJS.enc.Hex.parse(this.encryptionKey);
    const combined = CryptoJS.enc.Base64.parse(ciphertext);

    const iv = CryptoJS.lib.WordArray.create(
      combined.words.slice(0, 4),
      16
    );
    const encrypted = CryptoJS.lib.WordArray.create(
      combined.words.slice(4),
      combined.sigBytes - 16
    );

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encrypted } as CryptoJS.lib.CipherParams,
      key,
      {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  static generateHmacSha256(data: string, secret: string): string {
    return CryptoJS.HmacSHA256(data, secret).toString(CryptoJS.enc.Hex);
  }

  static verifyHmacSha256(data: string, secret: string, signature: string): boolean {
    const expectedSignature = CryptoService.generateHmacSha256(data, secret);
    return CryptoService.timingSafeEqual(expectedSignature, signature);
  }

  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  static hashSha256(data: string): string {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
  }

  static generateRandomToken(length = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex);
  }
}
