import { Request, Response } from "express";
import { handleAWSError } from "../handle_error";
import S3Service from "../lib/s3";
import CostexplorerService from "../lib/cost_explorer"; 

// ─────────────────────────────────────────────
// S3: List Buckets
export const getListOfS3buckets = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;
        const s3Service = new S3Service({ accessKeyId, secretAccessKey, region });
        const buckets = await s3Service.listBuckets();
        res.status(200).json(buckets);
    } catch (error: any) {
        console.error('Error in /api/s3/buckets:', error);
        handleAWSError(error, res);
    }
};

// S3: List Objects
export const getListOfS3Objects = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region, bucketName, bucketRegion } = req.body;

        if (!bucketName || !bucketRegion) {
            throw new Error("Bucket name and region are required.");
        }

        const s3Service = new S3Service({ accessKeyId, secretAccessKey, region });
        const objects = await s3Service.listObjects(bucketName, bucketRegion);

        res.status(200).json(objects);
    } catch (error: any) {
        console.error('Error in /api/s3/objects:', error);
        handleAWSError(error, res);
    }
};

// EC2: List Instances
export const getListOfEC2Instances = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;
        const EC2Service = (await import("../lib/ec2")).default;
        const ec2Service = new EC2Service({ accessKeyId, secretAccessKey, region });

        const instances = await ec2Service.listInstances();
        res.status(200).json(instances);
    } catch (error: any) {
        console.error('Error in /api/ec2/instances:', error);
        handleAWSError(error, res);
    }
};

// EC2: List Volumes
export const getListOfEC2Volumes = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;
        const EC2Service = (await import("../lib/ec2")).default;
        const ec2Service = new EC2Service({ accessKeyId, secretAccessKey, region });

        const volumes = await ec2Service.listVolumes();
        res.status(200).json(volumes);
    } catch (error: any) {
        console.error('Error in /api/ec2/volumes:', error);
        handleAWSError(error, res);
    }
};

// DynamoDB: List Tables
export const getListOfDynamoTables = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;
        const DynamoDBService = (await import("../lib/dynamo_db")).default;
        const dynamoService = new DynamoDBService({ accessKeyId, secretAccessKey, region });

        const tables = await dynamoService.listTables();
        res.status(200).json(tables);
    } catch (error: any) {
        console.error('Error in /api/dynamodb/tables:', error);
        handleAWSError(error, res);
    }
};

// ECS: List Clusters
export const getListOfECSClusters = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;
        const ECSService = (await import("../lib/ecs")).default;
        const ecsService = new ECSService({ accessKeyId, secretAccessKey, region });

        const clusters = await ecsService.listClusters();
        res.status(200).json(clusters);
    } catch (error: any) {
        console.error('Error in /api/ecs/clusters:', error);
        handleAWSError(error, res);
    }
};

// ECS: List Services
export const getListOfECSServices = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region, clusterArn } = req.body;
        const ECSService = (await import("../lib/ecs")).default;
        const ecsService = new ECSService({ accessKeyId, secretAccessKey, region });

        const services = await ecsService.listServices(clusterArn);
        res.status(200).json(services);
    } catch (error: any) {
        console.error('Error in /api/ecs/services:', error);
        handleAWSError(error, res);
    }
};

export const getECSTaskCount = async (req: Request, res: Response) => {
  try {
    const { accessKeyId, secretAccessKey, region } = req.body;
    const ECSService = (await import('../lib/ecs')).default;
    const ecsService = new ECSService({ 
        accessKeyId, 
        secretAccessKey, 
        region 
    });

    const clusters = await ecsService.listClusters();
    let totalTasks = 0;
    const taskDetails: any[] = [];

    for (const cluster of clusters) {
      const tasks = await ecsService.listTasks(cluster.clusterArn as string)
      totalTasks += tasks.length;
      taskDetails.push(...tasks);
    }

    res.status(200).json({
      totalTasks,
      taskDetails
    });
  } catch (error) {
    console.error('Error in /api/ecs/tasks:', error);
    handleAWSError(error, res);
  }
};


// Cost Explorer: List All Cost
export const getAllCost = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;
        const costExplorer = new CostexplorerService({ accessKeyId, secretAccessKey, region });

        const costData = await costExplorer.listAllCost();
        res.status(200).json(costData);
    } catch (error: any) {
        console.error("Error in /api/cost-explorer/tags:", error);
        handleAWSError(error, res);
    }
};

export const getCompute = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;

        const EC2Service = (await import('../lib/ec2')).default;
        const ec2Service = new EC2Service({
            accessKeyId,
            secretAccessKey,
            region
        });

        const allInstances = await ec2Service.listInstances();
        const runningInstances = allInstances.filter((i: any) => i.State.Name === "running");
        const stoppedInstances = allInstances.filter((i: any) => i.State.Name === "stopped");
        const terminatedInstances = allInstances.filter((i: any) => i.State.Name === "terminated");

        // Public and private
        const publicInstances = allInstances.filter((i: any) => i.PublicIpAddress);
        const privateInstances = allInstances.filter((i: any) => !i.PublicIpAddress);

        // Reserved Instances
        let reservedInstances: any[] = [];
        const ec2ServiceWithReserved = ec2Service as any;
        if (typeof ec2ServiceWithReserved.listReservedInstances === "function") {
            const reservedInstancesData = await ec2ServiceWithReserved.listReservedInstances();
            reservedInstances = reservedInstancesData || [];
        }

        res.status(200).json({
            totalInstances: allInstances.length,
            runningInstances: runningInstances.length,
            stoppedInstances: stoppedInstances.length,
            terminatedInstances: terminatedInstances.length,
            publicInstances: publicInstances.length,
            privateInstances: privateInstances.length,
            reservedInstances: reservedInstances.length,
            reservedInstancesDetails: reservedInstances
        });
    } catch (error: any) {
        console.error('Error in /api/ec2/compute:', error);
        handleAWSError(error, res);
    }
};
// Combined Storage Info: S3 + EBS
export const getListOfAllStorage = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;

        const s3Service = new S3Service({ accessKeyId, secretAccessKey, region });
        const EBSService = (await import("../lib/ebs")).default;
        const ebsService = new EBSService({ accessKeyId, secretAccessKey, region });

        const { buckets } = await s3Service.listBuckets();

        let totalSize = 0;
        let totalObjects = 0;
        let emptyBucketCount = 0;

        const regionSizeMap: Record<string, number> = {};
        const regionObjectMap: Record<string, number> = {};

        for (const bucket of buckets) {
            const bucketName = bucket.Name!;
            const bucketRegion = bucket.BucketRegion || region;

            const { objects } = await s3Service.listObjects(bucketName, bucketRegion);

            const size = objects.reduce((acc, obj) => acc + (obj.Size || 0), 0);
            const objectCount = objects.length;

            totalSize += size;
            totalObjects += objectCount;
            if (objectCount === 0) emptyBucketCount++;

            regionSizeMap[bucketRegion] = (regionSizeMap[bucketRegion] || 0) + size;
            regionObjectMap[bucketRegion] = (regionObjectMap[bucketRegion] || 0) + objectCount;
        }

        const volumes = await ebsService.listVolumes();
        const totalEBSSize = volumes.reduce((sum, vol) => sum + (vol.Size || 0), 0); // GiB
        const totalEBSUsed = Math.floor(totalEBSSize * 0.7); // mocked used % for now
        const totalEBSVolumes = volumes.length;

        const volumeTypeMap: Record<string, number> = {};
        volumes.forEach(vol => {
            if (vol.VolumeType) {
                volumeTypeMap[vol.VolumeType] = (volumeTypeMap[vol.VolumeType] || 0) + 1;
            }
        });

        const volumeColors: Record<string, string> = {
            gp2: "#3b82f6",
            gp3: "#10b981",
            io1: "#06b6d4",
            io2: "#f59e0b",
            st1: "#8b5cf6",
            sc1: "#ec4899",
            standard: "#9ca3af",
        };

        const ebsVolumeTypes = Object.entries(volumeTypeMap).map(([name, value]) => ({
            name,
            value,
            color: volumeColors[name] || "#6b7280",
        }));

        const s3SizeData = generateTimeSeriesData("size", totalSize);
        const s3ObjectsData = generateTimeSeriesData("objects", totalObjects);

        res.status(200).json({
            totalBuckets: buckets.length,
            emptyBuckets: emptyBucketCount,
            totalSize,
            totalObjects,
            regionSizes: regionSizeMap,
            regionObjects: regionObjectMap,
            s3SizeData,
            s3ObjectsData,
            totalEBSVolumes,
            totalEBSUsed,
            totalEBSSize,
            ebsVolumeTypes,
        });
    } catch (error: any) {
        console.error("Error in /api/s3/all-storage:", error);
        handleAWSError(error, res);
    }
};

// ─────────────────────────────────────────────
// Utilities
function generateTimeSeriesData(type: "size" | "objects", total: number) {
    const days = 7;
    const today = new Date();
    const data = [];

    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (days - i - 1));
        const isoDate = date.toISOString().split("T")[0];

        const type1 = Math.floor(total * 0.6);
        const type2 = total - type1;

        data.push(
            type === "size"
                ? { date: isoDate, size: total, type1, type2 }
                : { date: isoDate, objects: total, type1, type2 }
        );
    }

    return data;
}
