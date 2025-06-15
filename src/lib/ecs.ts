import { ECSClient, ListClustersCommand, ListServicesCommand, ListTasksCommand, DescribeTasksCommand, Task, DescribeServicesCommand, Cluster, Service } from "@aws-sdk/client-ecs";

class ECSService {
    private ecsClient: ECSClient;

    constructor(credentials: AWSCredentials) {
        this.ecsClient = new ECSClient({
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
            region: credentials.region,
        });
    }

    async listClusters(): Promise<Cluster[]> {
        try {
            const command = new ListClustersCommand({});
            const response = await this.ecsClient.send(command);
            const clusterArns = response.clusterArns || [];
            return clusterArns.map(arn => ({ clusterArn: arn }));
        } catch (error) {
            console.error("Error listing clusters:", error);
            throw error;
        }
    }

    async listServices(clusterArn: string): Promise<Service[]> {
        try {
            const command = new ListServicesCommand({ cluster: clusterArn });
            const response = await this.ecsClient.send(command);
            const serviceArns = response.serviceArns || [];
            const describeCommand = new DescribeServicesCommand({
                cluster: clusterArn,
                services: serviceArns,
            });
            const describeResponse = await this.ecsClient.send(describeCommand);
            return describeResponse.services || [];
        } catch (error) {
            console.error("Error listing services:", error);
            throw error;
        }
    }

    async listTasks(clusterArn: string): Promise<Task[]> {
    const taskArnsRes = await this.ecsClient.send(new ListTasksCommand({ cluster: clusterArn }));
    const taskArns = taskArnsRes.taskArns || [];

    if (taskArns.length === 0) return [];

    const described = await this.ecsClient.send(
      new DescribeTasksCommand({
        cluster: clusterArn,
        tasks: taskArns,
      })
    );
    return described.tasks || [];
  }
}



export default ECSService;