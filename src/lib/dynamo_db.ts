import { DynamoDBClient, ListTablesCommand, TableDescription } from "@aws-sdk/client-dynamodb";

class DynamoDBService {
    private dynamoDBClient: DynamoDBClient;

    constructor(credentials: AWSCredentials) {
        this.dynamoDBClient = new DynamoDBClient({
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
            region: credentials.region,
        });
    }

    async listTables(): Promise<string[]> {
        try {
            const command = new ListTablesCommand({});
            const response = await this.dynamoDBClient.send(command);
            return response.TableNames || [];
        } catch (error) {
            console.error("Error listing tables:", error);
            throw error;
        }
    }
}
export default DynamoDBService;