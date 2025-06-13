import { EC2Client, DescribeInstancesCommand, Instance, DescribeInstancesCommandInput, DescribeVolumesCommand } from "@aws-sdk/client-ec2";
import { AccountService } from "./account";
import CostexplorerService from "./cost_explorer";

class EC2Service {
    private credentials: AWSCredentials;
    private ec2Client: EC2Client;

    constructor(credentials: AWSCredentials) {
        this.credentials = credentials;
        this.ec2Client = new EC2Client({
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
            region: credentials.region,
        });
    }

    async listInstances(): Promise<Instance[]> {
        try {
            const accClient = new AccountService(this.credentials);
            const regions = await accClient.FetchRegions();
            let allInstances: Instance[] = [];
            const promises = [];
            for (let i = 0; i < regions.length; i++) {
                const ec2ClientPerRegion = new EC2Client({
                    credentials: {
                        accessKeyId: this.credentials.accessKeyId,
                        secretAccessKey: this.credentials.secretAccessKey,
                    },
                    region: regions[i]
                });

                try {
                    promises.push(ec2ClientPerRegion.send(new DescribeInstancesCommand({})));
                } catch (error) {
                    console.error(`Error describing instances in ${regions[i]}:`, error);
                }
            }
            const res = await Promise.all(promises);
            res.forEach(instance => {
                const instances = instance.Reservations?.flatMap(reservation => reservation.Instances || []) || [];
                allInstances = [...allInstances, ...instances];
            });

            // Call the cost api for EC2
            let costMap: Record<string, number> = {};
            try {
                const costClient = new CostexplorerService(this.credentials);
                const ec2CostRes = await costClient.getServiceCost("Amazon Elastic Compute Cloud - Compute");
                // Flatten all resources and build a map from instance ID to cost
                if (Array.isArray(ec2CostRes)) {
                    for (const service of ec2CostRes) {
                        if (Array.isArray(service.resources)) {
                            for (const resource of service.resources) {
                                if (resource.id && typeof resource.cost === "number") {
                                    costMap[resource.id] = resource.cost;
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching EC2 cost:", error);
            }

            // Attach cost to each instance
            allInstances = allInstances.map(instance => ({
                ...instance,
                cost: costMap[instance.InstanceId ?? ""] ?? 0
            }));

            return allInstances;
        } catch (error) {
            console.error("Error listing instances:", error);
            throw error;
        }
    }

    async listVolumes(): Promise<any[]> {
        try {
            const accClient = new AccountService(this.credentials);
            const regions = await accClient.FetchRegions();
            let allVolumes: any[] = [];
            const promises = [];

            for (const region of regions) {
                const ec2ClientPerRegion = new EC2Client({
                    credentials: {
                        accessKeyId: this.credentials.accessKeyId,
                        secretAccessKey: this.credentials.secretAccessKey,
                    },
                    region,
                });

                promises.push(
                    ec2ClientPerRegion.send(new DescribeVolumesCommand({}))
                        .then(res => res.Volumes || [])
                        .catch(error => {
                            console.error(`Error describing volumes in ${region}:`, error);
                            return [];
                        })
                );
            }

            const results = await Promise.all(promises);
            for (const regionVolumes of results) {
                allVolumes = allVolumes.concat(regionVolumes);
            }

            // Fetch EBS cost data
            let costMap: Record<string, number> = {};
            try {
                const costClient = new CostexplorerService(this.credentials);
                const ebsCostRes = await costClient.getServiceCost("Amazon Elastic Block Store");
                if (Array.isArray(ebsCostRes)) {
                    for (const service of ebsCostRes) {
                        if (Array.isArray(service.resources)) {
                            for (const resource of service.resources) {
                                if (resource.id && typeof resource.cost === "number") {
                                    costMap[resource.id] = resource.cost;
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching EBS cost:", error);
            }

            // Attach cost to each volume
            return allVolumes.map(volume => ({
                ...volume,
                cost: costMap[volume.VolumeId ?? ""] ?? 0,
            }));
        } catch (error) {
            console.error("Error listing volumes:", error);
            throw error;
        }
    }
}
export default EC2Service;