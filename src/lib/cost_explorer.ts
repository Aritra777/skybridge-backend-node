import { CostExplorerClient, GetCostAndUsageWithResourcesCommand, GetCostAndUsageWithResourcesCommandOutput, GetDimensionValuesCommand } from "@aws-sdk/client-cost-explorer";
import { AccountClient, ListRegionsCommand } from "@aws-sdk/client-account";
import { AccountService } from "./account";
import * as fs from "fs";
import * as path from "path";

class CostexplorerService {
    private costExplorerClient: CostExplorerClient;
    private accountClient: AccountService;
    private accessKeyId: string;

    constructor(credentials: { accessKeyId: string; secretAccessKey: string; region: string }) {
        this.costExplorerClient = new CostExplorerClient({
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
            region: credentials.region,
        });

        this.accountClient = new AccountService(credentials);
        this.accessKeyId = credentials.accessKeyId;
    }

    // async listAllCost(): Promise<GetCostAndUsageWithResourcesCommandOutput> {
    //     let _tenDaysAgo = new Date();
    //     _tenDaysAgo.setDate(new Date().getDate() - 14);
    //     const time_period = {
    //         Start: _tenDaysAgo.toISOString().split("T")[0], // set date of 10 days ago
    //         End: new Date().toISOString().split("T")[0],
    //     };
    //     try {
    //         // Ensure regions are fetched before making the cost query
    //         if (this.regions.length === 0) {
    //             await this.FetchRegions();
    //         }
    //         const dimensions_cmd = new GetDimensionValuesCommand({
    //             Dimension: "SERVICE",
    //             TimePeriod: time_period
    //         })
    //         const dimensions = await this.costExplorerClient.send(dimensions_cmd);
    //         if (!dimensions || !dimensions.DimensionValues) {
    //             throw new Error("No services found for the specified time period.");
    //         }
    //         // Extract the service names from the dimensions
    //         const serviceNames = dimensions.DimensionValues.map(value => value.Value || "").filter(name => name !== "");
    //         const command = new GetCostAndUsageWithResourcesCommand({
    //             Filter: {
    //                 And: [
    //                     {
    //                         "Dimensions": {
    //                             "Key": "REGION", "Values": this.regions // Use the fetched regions
    //                         }
    //                     },
    //                     {
    //                         "Dimensions": {
    //                             "Key": "SERVICE", "Values": serviceNames // Use the service names from dimensions
    //                         }
    //                     }
    //                 ],
    //             },
    //             Granularity: "MONTHLY",
    //             TimePeriod: time_period,
    //             Metrics: ["BlendedCost"], // List of metrics you want to retrieve (e.g., "UnblendedCost", "UsageQuantity")
    //             GroupBy: [
    //                 {
    //                     Type: "DIMENSION",
    //                     Key: "SERVICE", // Group by service name
    //                 },
    //                 {
    //                     Type: "DIMENSION",
    //                     Key: "RESOURCE_ID", // REQUIRED for this command
    //                 },
    //             ]
    //         });
    //         const response = await this.costExplorerClient.send(command);
    //         return response || [];
    //     } catch (error) {
    //         console.error("Error listing cost allocation tags:", error);
    //         throw error;
    //     }
    // }
    // ...existing code...
    async listAllCost(): Promise<any> {
        let _tenDaysAgo = new Date();
        _tenDaysAgo.setDate(new Date().getDate() - 14);
        const time_period = {
            Start: _tenDaysAgo.toISOString().split("T")[0],
            End: new Date().toISOString().split("T")[0],
        };
        try {
            // Ensure regions are fetched before making the cost query
            const AllRegions = await this.accountClient.FetchRegions();

            const dimensions_cmd = new GetDimensionValuesCommand({
                Dimension: "SERVICE",
                TimePeriod: time_period
            });
            const dimensions = await this.costExplorerClient.send(dimensions_cmd);
            if (!dimensions || !dimensions.DimensionValues) {
                throw new Error("No services found for the specified time period.");
            }
            // Extract the service names from the dimensions
            const serviceNames = dimensions.DimensionValues.map(value => value.Value || "").filter(name => name !== "");

            // Query 1: SERVICE + RESOURCE_ID
            const serviceResourceCmd = new GetCostAndUsageWithResourcesCommand({
                Filter: {
                    And: [
                        {
                            "Dimensions": {
                                "Key": "REGION", "Values": AllRegions
                            }
                        },
                        {
                            "Dimensions": {
                                "Key": "SERVICE", "Values": serviceNames
                            }
                        }
                    ],
                },
                Granularity: "MONTHLY",
                TimePeriod: time_period,
                Metrics: ["BlendedCost"],
                GroupBy: [
                    { Type: "DIMENSION", Key: "SERVICE" },
                    { Type: "DIMENSION", Key: "RESOURCE_ID" },
                ]
            });
            const serviceResourceResp = await this.costExplorerClient.send(serviceResourceCmd);

            // Query 2: REGION + RESOURCE_ID
            const regionResourceCmd = new GetCostAndUsageWithResourcesCommand({
                Filter: {
                    And: [
                        {
                            "Dimensions": {
                                "Key": "REGION", "Values": AllRegions
                            }
                        },
                        {
                            "Dimensions": {
                                "Key": "SERVICE", "Values": serviceNames
                            }
                        }
                    ],
                },
                Granularity: "MONTHLY",
                TimePeriod: time_period,
                Metrics: ["BlendedCost"],
                GroupBy: [
                    { Type: "DIMENSION", Key: "REGION" },
                    { Type: "DIMENSION", Key: "RESOURCE_ID" },
                ]
            });
            const regionResourceResp = await this.costExplorerClient.send(regionResourceCmd);

            // Build a map from RESOURCE_ID to REGION
            const resourceIdToRegion = new Map<string, string>();
            for (const result of regionResourceResp.ResultsByTime ?? []) {
                for (const group of result.Groups ?? []) {
                    const [region, resourceId] = group.Keys ?? [];
                    if (resourceId) {
                        resourceIdToRegion.set(resourceId, region);
                    }
                }
            }

            // Organize the final result and aggregate total cost per service
            const serviceMap: Record<string, { totalCost: number, resources: any[] }> = {};

            for (const result of serviceResourceResp.ResultsByTime ?? []) {
                for (const group of result.Groups ?? []) {
                    const [service, resourceId] = group.Keys ?? [];
                    const region = resourceIdToRegion.get(resourceId) || "Unknown";
                    const cost = parseFloat(group.Metrics?.BlendedCost?.Amount ?? "0");

                    if (!serviceMap[service]) {
                        serviceMap[service] = { totalCost: 0, resources: [] };
                    }
                    serviceMap[service].resources.push({
                        id: resourceId,
                        region,
                        cost,
                    });
                    // do not add cost if the cost is negetive
                    if (cost < 0) continue;
                    serviceMap[service].totalCost += cost;
                }
            }

            // Format the response
            const response = Object.entries(serviceMap).map(([service, data]) => ({
                service,
                totalCost: data.totalCost,
                resources: data.resources,
            }));

            return response;
        } catch (error) {
            console.error("Error listing cost allocation tags:", error);
            throw error;
        }
    }

    async getServiceCost(serviceName: string): Promise<any> {
        let _tenDaysAgo = new Date();
        _tenDaysAgo.setDate(new Date().getDate() - 14);
        const time_period = {
            Start: _tenDaysAgo.toISOString().split("T")[0],
            End: new Date().toISOString().split("T")[0],
        };

        // Cache file setup
        const cacheDir = path.resolve(__dirname, `../../cache/cost_cache/${this.accessKeyId || "unknown"}`);
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        const now = new Date();
        const rounded = new Date(Math.floor(now.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000));
        const cacheFile = path.join(
            cacheDir,
            `${serviceName}_${rounded.getTime()}.json`
        );

        // Try cache
        if (fs.existsSync(cacheFile)) {
            try {
                const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
                return cached;
            } catch { /* ignore cache read errors */ }
        }

        try {
            const AllRegions = await this.accountClient.FetchRegions();

            // Query: SERVICE + RESOURCE_ID
            const serviceResourceCmd = new GetCostAndUsageWithResourcesCommand({
                Filter: {
                    And: [
                        {
                            "Dimensions": {
                                "Key": "REGION", "Values": AllRegions
                            }
                        },
                        {
                            "Dimensions": {
                                "Key": "SERVICE", "Values": [serviceName]
                            }
                        }
                    ],
                },
                Granularity: "MONTHLY",
                TimePeriod: time_period,
                Metrics: ["BlendedCost"],
                GroupBy: [
                    { Type: "DIMENSION", Key: "SERVICE" },
                    { Type: "DIMENSION", Key: "RESOURCE_ID" },
                ]
            });
            const serviceResourceResp = await this.costExplorerClient.send(serviceResourceCmd);

            // Query: REGION + RESOURCE_ID
            const regionResourceCmd = new GetCostAndUsageWithResourcesCommand({
                Filter: {
                    And: [
                        {
                            "Dimensions": {
                                "Key": "REGION", "Values": AllRegions
                            }
                        },
                        {
                            "Dimensions": {
                                "Key": "SERVICE", "Values": [serviceName]
                            }
                        }
                    ],
                },
                Granularity: "MONTHLY",
                TimePeriod: time_period,
                Metrics: ["BlendedCost"],
                GroupBy: [
                    { Type: "DIMENSION", Key: "REGION" },
                    { Type: "DIMENSION", Key: "RESOURCE_ID" },
                ]
            });
            const regionResourceResp = await this.costExplorerClient.send(regionResourceCmd);

            // Build a map from RESOURCE_ID to REGION
            const resourceIdToRegion = new Map<string, string>();
            for (const result of regionResourceResp.ResultsByTime ?? []) {
                for (const group of result.Groups ?? []) {
                    const [region, resourceId] = group.Keys ?? [];
                    if (resourceId) {
                        resourceIdToRegion.set(resourceId, region);
                    }
                }
            }

            // Organize the final result and aggregate total cost per service
            const serviceMap: Record<string, { totalCost: number, resources: any[] }> = {};

            for (const result of serviceResourceResp.ResultsByTime ?? []) {
                for (const group of result.Groups ?? []) {
                    const [service, resourceId] = group.Keys ?? [];
                    const region = resourceIdToRegion.get(resourceId) || "Unknown";
                    const cost = parseFloat(group.Metrics?.BlendedCost?.Amount ?? "0");

                    if (!serviceMap[service]) {
                        serviceMap[service] = { totalCost: 0, resources: [] };
                    }
                    serviceMap[service].resources.push({
                        id: resourceId,
                        region,
                        cost,
                    });
                    if (cost < 0) continue;
                    serviceMap[service].totalCost += cost;
                }
            }

            const response = Object.entries(serviceMap).map(([service, data]) => ({
                service,
                totalCost: data.totalCost,
                resources: data.resources,
            }));

            // Save to cache
            fs.writeFileSync(cacheFile, JSON.stringify(response), "utf-8");

            return response;
        } catch (error) {
            console.error("Error fetching service cost:", error);
            throw error;
        }
    }
}
export default CostexplorerService;