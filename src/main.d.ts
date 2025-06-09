interface AWSCredentials {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
}

interface EncryptionObj {
    encryptedData: string;
    iv: string;
    tag: string;
}