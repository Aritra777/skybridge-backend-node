import { Route53ResolverClient, ListResolverRulesCommand, ListResolverEndpointsCommand, ResolverRule, ResolverEndpoint } from "@aws-sdk/client-route53resolver";

class Route53Service {
    private routeClient: Route53ResolverClient;

    constructor(credentials: AWSCredentials) {
        this.routeClient = new Route53ResolverClient({
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
            region: credentials.region,
        });
    }

    async listResolverRules(): Promise<ResolverRule[]> {
        try {
            const command = new ListResolverRulesCommand({});
            const response = await this.routeClient.send(command);
            return response.ResolverRules || [];
        } catch (error) {
            console.error("Error listing resolver rules:", error);
            throw error;
        }
    }

    async listResolverEndpoints(): Promise<ResolverEndpoint[]> {
        try {
            const command = new ListResolverEndpointsCommand({});
            const response = await this.routeClient.send(command);
            return response.ResolverEndpoints || [];
        } catch (error) {
            console.error("Error listing resolver endpoints:", error);
            throw error;
        }
    }
}

export default Route53Service;