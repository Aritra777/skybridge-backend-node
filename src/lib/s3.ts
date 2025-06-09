import { Bucket, paginateListBuckets, S3Client } from "@aws-sdk/client-s3";
import CostexplorerService from "./cost_explorer";

class S3Service {
    private s3Client: S3Client;
    private credentials: AWSCredentials;

    constructor(credentials: AWSCredentials) {
        this.s3Client = new S3Client({
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
            region: credentials.region,
        });
        this.credentials = credentials;
    }

    async listBuckets(): Promise<{ totalCost: number, buckets: Bucket[] }> {
        try {
            let Buckets: Array<Bucket> = [];
            // Get list of buckets
            const listBucketsCommand = paginateListBuckets({ client: this.s3Client }, {});

            for await (const bucket of listBucketsCommand) {
                Buckets = [...Buckets, ...(bucket.Buckets || [])];
            }

            // Get the cost of each bucket
            // Call the cost api for EC2
            let costMap: Record<string, number> = {};
            let totalCost = 0;
            try {
                const costClient = new CostexplorerService(this.credentials);
                const ec2CostRes = await costClient.getServiceCost("Amazon Simple Storage Service");
                // Flatten all resources and build a map from instance ID to cost
                const service = ec2CostRes[0];
                totalCost = service.totalCost;
                for (const resource of service.resources) {
                    if (resource.id && typeof resource.cost === "number") {
                        costMap[resource.id] = resource.cost;
                    }
                }
            } catch (error) {
                console.error("Error fetching EC2 cost:", error);
            }

            Buckets = Buckets.map(bucket => ({
                ...bucket,
                cost: costMap[bucket.Name ?? ""] ?? 0
            }))

            return {
                totalCost,
                buckets: Buckets
            };
        } catch (error) {
            console.error("Error listing buckets:", error);
            throw error;
        }
    }
}

export default S3Service;