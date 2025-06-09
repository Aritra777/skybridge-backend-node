import { AccountClient, GetRegionOptStatusCommand, ListRegionsCommand } from "@aws-sdk/client-account";
import * as fs from "fs/promises";
import * as path from "path";

export class AccountService {
    private accountClient: AccountClient;
    private regions: string[] = [];
    private accessKeyId: string;

    constructor(credentials: { accessKeyId: string; secretAccessKey: string; region: string }) {
        this.accountClient = new AccountClient({
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
            region: credentials.region,
        });
        this.accessKeyId = credentials.accessKeyId;
    }

    private getCacheFilePath(): string {
        // Save in a 'region_cache' folder in the project root
        return path.join(__dirname, "../../cache/region_cache", `${this.accessKeyId}.json`);
    }

    async FetchRegions(): Promise<string[]> {
        const cacheFile = this.getCacheFilePath();

        // Try reading from cache
        try {
            const data = await fs.readFile(cacheFile, "utf-8");
            this.regions = JSON.parse(data);
            return this.regions;
        } catch {
            // Cache miss, continue to fetch from AWS
            console.log("region cache miss. Continue api calls.")
        }

        try {
            const response = await this.accountClient.send(new ListRegionsCommand());
            const allRegions = response.Regions?.map(region => region.RegionName || "").filter(Boolean) || [];
            const enabledRegions: string[] = [];

            // Check each region's opt status
            for (const regionName of allRegions) {
                const statusResp = await this.accountClient.send(new GetRegionOptStatusCommand({ RegionName: regionName }));
                if (statusResp.RegionOptStatus === "ENABLED_BY_DEFAULT") {
                    enabledRegions.push(regionName);
                }
            }

            this.regions = enabledRegions;

            // Ensure cache directory exists
            await fs.mkdir(path.dirname(cacheFile), { recursive: true });
            await fs.writeFile(cacheFile, JSON.stringify(this.regions), "utf-8");

            return this.regions;
        } catch (error) {
            console.error("Error fetching regions:", error);
            throw error;
        }
    }
}