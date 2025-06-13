import { EBSClient, ListSnapshotBlocksCommand } from "@aws-sdk/client-ebs";
import { AccountService } from "./account";
import CostexplorerService from "./cost_explorer";

class EBSService {
    private credentials: AWSCredentials;

    constructor(credentials: AWSCredentials) {
        this.credentials = credentials;
    }
}

export default EBSService;