import { Bucket, ListBucketsCommand, S3Client, ListObjectsV2Command, ListBucketsOutput, GetBucketLocationCommand, GetBucketLocationCommandOutput } from "@aws-sdk/client-s3";
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
            const command = new ListBucketsCommand({});
            const listOfBuckets: ListBucketsOutput = await this.s3Client.send(command);

            Buckets = listOfBuckets.Buckets || [];

            for (const [i, bucket] of Buckets.entries()) {
                const command_region = new GetBucketLocationCommand({ Bucket: bucket.Name });
                const bucket_region: GetBucketLocationCommandOutput = await this.s3Client.send(command_region);
                console.log("bucket reg: ", bucket_region);
                Buckets[i].BucketRegion = bucket_region.LocationConstraint || "";
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

    async listObjects(bucketName: string, region: string): Promise<{ totalCost: number, objects: any[] }> {
        try {
            const s3ClientForRegion = new S3Client({
                credentials: {
                    accessKeyId: this.credentials.accessKeyId,
                    secretAccessKey: this.credentials.secretAccessKey,
                },
                region: region
            });

            // List objects in the specified bucket
            const command = new ListObjectsV2Command({ Bucket: bucketName });
            const response = await s3ClientForRegion.send(command);
            const objects = response.Contents || [];

            // Get the cost of each object (if available)
            let costMap: Record<string, number> = {};
            let totalCost = 0;
            try {
                const costClient = new CostexplorerService(this.credentials);
                const s3CostRes = await costClient.getServiceCost("Amazon Simple Storage Service");
                const service = s3CostRes[0];
                totalCost = service.totalCost;
                for (const resource of service.resources) {
                    if (resource.id && typeof resource.cost === "number") {
                        costMap[resource.id] = resource.cost;
                    }
                }
            } catch (error) {
                console.error("Error fetching S3 object cost:", error);
            }

            // Attach cost to each object (using Key as id, if possible)
            const objectsWithCost = objects.map(obj => ({
                ...obj,
                cost: costMap[obj.Key ?? ""] ?? 0
            }));

            return {
                totalCost,
                objects: objectsWithCost
            };
        } catch (error) {
            console.error("Error listing objects:", error);
            throw error;
        }
    }
}

export default S3Service;