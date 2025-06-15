import { handleAWSError } from "../handle_error";
import CostexplorerService from "../lib/cost_explorer";
import S3Service from "../lib/s3";
import { Request, Response } from "express";

export const getListOfS3buckets = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;

        const s3Service = new S3Service({
            accessKeyId,
            secretAccessKey,
            region
        });

        const bucketsRes = await s3Service.listBuckets();

        res.status(200).json(bucketsRes);
    } catch (error: any) {
        console.error('Error in /api/s3/buckets:', error);
        handleAWSError(error, res);
    }
}
export const getListOfS3Objects = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region, bucketName, bucketRegion } = req.body;

        if (!bucketName || !bucketRegion) {
            throw new Error("Please provide required Bucket detials.");
        }

        const s3Service = new S3Service({
            accessKeyId,
            secretAccessKey,
            region
        });

        const bucketsRes = await s3Service.listObjects(bucketName, bucketRegion);

        res.status(200).json(bucketsRes);
    } catch (error: any) {
        console.error('Error in /api/s3/objects:', error);
        handleAWSError(error, res);
    }
}

export const getListOfEC2Instances = async (req: Request, res: Response) => {
    console.log('getListOfEC2Instances called');
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;

        const EC2Service = (await import('../lib/ec2')).default;
        const ec2Service = new EC2Service({
            accessKeyId,
            secretAccessKey,
            region
        });

        const instances = await ec2Service.listInstances();
        res.send(instances);
    } catch (error: any) {
        console.error('Error in /api/ec2/instances:', error);
        handleAWSError(error, res);
    }
}
export const getListOfEC2Volumes = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;

        const EC2Service = (await import('../lib/ec2')).default;
        const ec2Service = new EC2Service({
            accessKeyId,
            secretAccessKey,
            region
        });

        const instances = await ec2Service.listVolumes();
        res.send(instances);
    } catch (error: any) {
        console.error('Error in /api/ec2/volumes:', error);
        handleAWSError(error, res);
    }
}

export const getListOfDynamoTables = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;

        const DynamoDBService = (await import('../lib/dynamo_db')).default;
        const dynamoDBService = new DynamoDBService({
            accessKeyId,
            secretAccessKey,
            region
        });

        const tables = await dynamoDBService.listTables();
        res.send(tables);
    } catch (error: any) {
        console.error('Error in /api/dynamodb/tables:', error);
        handleAWSError(error, res);
    }
}

export const getListOfECSClusters = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;

        const ECSService = (await import('../lib/ecs')).default;
        const ecsService = new ECSService({
            accessKeyId,
            secretAccessKey,
            region
        });

        const clusters = await ecsService.listClusters();
        res.send(clusters);
    } catch (error: any) {
        console.error('Error in /api/ecs/clusters:', error);
        handleAWSError(error, res);
    }
};

export const getListOfECSServices = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region, clusterArn } = req.body;

        const ECSService = (await import('../lib/ecs')).default;
        const ecsService = new ECSService({
            accessKeyId,
            secretAccessKey,
            region
        });

        const services = await ecsService.listServices(clusterArn);
        res.send(services);
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


export const getAllCost = async (req: Request, res: Response) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;

        const costExplorerService = new CostexplorerService({
            accessKeyId,
            secretAccessKey,
            region,
        });

        const tags = await costExplorerService.listAllCost();
        res.send(tags);
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