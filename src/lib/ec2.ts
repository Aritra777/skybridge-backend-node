import { EC2Client, DescribeInstancesCommand, Instance, DescribeInstancesCommandInput, } from "@aws-sdk/client-ec2";
import { AccountService } from "./account";

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
            // const command = new DescribeInstancesCommand({});
            // const response = await this.ec2Client.send(command);
            // const instances = response.Reservations?.flatMap(reservation => reservation.Instances || []) || [];
            // return instances;

            const accClient = new AccountService(this.credentials);
            const regions = await accClient.FetchRegions();
            let allInstances: Instance[] = [];
            // console.debug("all regions: ", regions);
            const promises = [];
            for (let i = 0; i < regions.length; i++) {
                const ec2ClientPerRegion = new EC2Client({
                    credentials: {
                        accessKeyId: this.credentials.accessKeyId,
                        secretAccessKey: this.credentials.secretAccessKey,
                    },
                    region: regions[i]
                })
                // console.debug("instance: ", ec2ClientPerRegion);

                try {
                    // const { Reservations } = await ec2ClientPerRegion.send(
                    //     new DescribeInstancesCommand({})
                    // );
                    // console.debug("Reservations: ", Reservations);

                    // if (Reservations) {
                    //     const instances = Reservations?.flatMap(reservation => reservation.Instances || []) || [];
                    //     console.log("instance: ", instances);
                    //     allInstances = [...allInstances, ...instances];
                    // }
                    promises.push(ec2ClientPerRegion.send(new DescribeInstancesCommand({})))

                } catch (error) {
                    console.error(`Error describing instances in ${regions[i]}:`, error);
                }


            }
            const res = await Promise.all(promises);
            res.forEach(instance => {
                const instances = instance.Reservations?.flatMap(reservation => reservation.Instances || []) || [];
                allInstances = [...allInstances, ...instances];
            })


            return allInstances;

        } catch (error) {
            console.error("Error listing instances:", error);
            throw error;
        }
    }
}
export default EC2Service;