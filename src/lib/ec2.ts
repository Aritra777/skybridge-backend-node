import { EC2Client, DescribeInstancesCommand, DescribeReservedInstancesCommand, Instance, DescribeInstancesCommandInput, DescribeVolumesCommand, DescribeVpcsCommand } from "@aws-sdk/client-ec2";
import { AccountService } from "./account";
import CostexplorerService from "./cost_explorer";

class EC2Service {
    private credentials: AWSCredentials;

    constructor(credentials: AWSCredentials) {
        this.credentials = credentials;
    }

    // Modularized cost mapping
    private async getResourceCostMap(serviceName: string): Promise<Record<string, number>> {
        let costMap: Record<string, number> = {};
        try {
            const costClient = new CostexplorerService(this.credentials);
            const costRes = await costClient.getServiceCost(serviceName);

            if (Array.isArray(costRes)) {
                for (const service of costRes) {
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
            console.error(`Error fetching ${serviceName} cost:`, error);
        }
        return costMap;
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

            // Fetch EC2 cost data using modularized method
            const costMap = await this.getResourceCostMap("Amazon Elastic Compute Cloud - Compute");

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

            // Fetch EBS cost data using modularized method
            const costMap = await this.getResourceCostMap("Amazon Elastic Block Store");

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

    // New: List VPCs with cost
    async listVpcs(): Promise<any[]> {
        try {
            const accClient = new AccountService(this.credentials);
            const regions = await accClient.FetchRegions();
            let allVpcs: any[] = [];
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
                    ec2ClientPerRegion.send(new DescribeVpcsCommand({}))
                        .then(res => res.Vpcs || [])
                        .catch(error => {
                            console.error(`Error describing VPCs in ${region}:`, error);
                            return [];
                        })
                );
            }

            const results = await Promise.all(promises);
            for (const regionVpcs of results) {
                allVpcs = allVpcs.concat(regionVpcs);
            }

            // Fetch VPC cost data using modularized method
            // Note: Replace with the correct AWS service name for VPC cost if available
            const costMap = await this.getResourceCostMap("Amazon Virtual Private Cloud");

            // Attach cost to VPCs
            return allVpcs.map(vpc => ({
                ...vpc,
                cost: costMap[vpc.VpcId ?? ""] ?? 0,
            }));
        } catch (error) {
            console.error("Error listing VPCs:", error);
            throw error;
        }
    }
}

export default EC2Service;