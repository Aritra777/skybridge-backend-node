import { EC2Client, DescribeInstancesCommand, DescribeReservedInstancesCommand, Instance, DescribeInstancesCommandInput, DescribeVolumesCommand } from "@aws-sdk/client-ec2";
// import {
//     EC2Client,
//     DescribeInstancesCommand,
//     Instance,
//     DescribeVolumesCommand,
// } from "@aws-sdk/client-ec2";
import { AccountService } from "./account";
import CostexplorerService from "./cost_explorer";

class EC2Service {
    private credentials: AWSCredentials;

    constructor(credentials: AWSCredentials) {
        this.credentials = credentials;
    }

    async listInstances(): Promise<Instance[]> {
        try {
            const accClient = new AccountService(this.credentials);
            const regions = await accClient.FetchRegions();
            let allInstances: Instance[] = [];
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
                    ec2ClientPerRegion.send(new DescribeInstancesCommand({})).catch(error => {
                        console.error(`Error describing instances in ${region}:`, error);
                        return { Reservations: [] };
                    })
                );
            }

            const results = await Promise.all(promises);

            for (const res of results) {
                const instances = res.Reservations?.flatMap(reservation => reservation.Instances || []) || [];
                allInstances = allInstances.concat(instances);
            }

            // Fetch EC2 cost data
            let costMap: Record<string, number> = {};
            try {
                const costClient = new CostexplorerService(this.credentials);
                const ec2CostRes = await costClient.getServiceCost("Amazon Elastic Compute Cloud - Compute");

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

            // Attach cost to instances
            return allInstances.map(instance => ({
                ...instance,
                cost: costMap[instance.InstanceId ?? ""] ?? 0,
            }));
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

            // Attach cost to volumes
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