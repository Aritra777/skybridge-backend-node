import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

class CredentialEncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32; // 256 bits
    private readonly ivLength = 12;
    private readonly tagLength = 16;
    private readonly encryptionKey: Buffer;
    private readonly secretKey: string = process.env.ENCRYPTION_KEY || '';
    constructor() {
        // Use a key derivation function in production
        this.encryptionKey = Buffer.from(this.secretKey.padEnd(32, '0').slice(0, 32));
    }

    async decrypt({ encryptedData, iv, tag }: EncryptionObj): Promise<string> {
        try {
            // Convert base64 strings back to buffers
            const ivBuffer = Buffer.from(iv, 'base64');
            const tagBuffer = Buffer.from(tag, 'base64');

            // Create decipher
            const decipher = createDecipheriv(
                this.algorithm,
                this.encryptionKey,
                ivBuffer
            );
            decipher.setAuthTag(tagBuffer);

            // Decrypt the data
            let decrypted = decipher.update(encryptedData, 'base64', 'utf-8');
            console.log('Decrypting data4:', decrypted);
            decrypted += decipher.final('utf-8');

            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt credentials');
        }
    }
}

export default CredentialEncryptionService;