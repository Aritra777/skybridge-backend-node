import {
  EC2Client,
  DescribeVolumesCommand,
} from "@aws-sdk/client-ec2";

export default class EBSService {
  private client: EC2Client;

  constructor({ accessKeyId, secretAccessKey, region }: AWSCredentials) {
    this.client = new EC2Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async listVolumes() {
    const command = new DescribeVolumesCommand({});
    const response = await this.client.send(command);
    return response.Volumes || [];
  }
}
