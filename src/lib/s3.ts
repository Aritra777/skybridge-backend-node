import { Bucket, paginateListBuckets, S3Client } from "@aws-sdk/client-s3";

class S3Service {
    private s3Client: S3Client;

    constructor(credentials: AWSCredentials) {
        this.s3Client = new S3Client({
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
            region: credentials.region,
        });
    }

    async listBuckets(): Promise<Bucket[]> {
        try {
            const Buckets: any[] = [];
            // Get list of buckets
            const listBucketsCommand = paginateListBuckets({ client: this.s3Client }, {});

            for await (const bucket of listBucketsCommand) {
                Buckets.push(bucket.Buckets!);
                // console.log(bucket.Buckets!);
            }

            return Buckets;
        } catch (error) {
            console.error("Error listing buckets:", error);
            throw error;
        }
    }
}

export default S3Service;