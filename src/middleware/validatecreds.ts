import express from 'express';

export const validateCredentials = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { accessKeyId, secretAccessKey, region } = req.body;

    if (!accessKeyId || !secretAccessKey || !region) {
        return res.status(400).json({
            error: 'Missing required AWS credentials'
        });
    }

    next();
    // try {
    //     const _encryptedCred = req.body as EncryptionObj;
    //     const encryptionService = new CredentialEncryptionService();
    //     const credsAsString = await encryptionService.decrypt(_encryptedCred!);
    //     const credentials = JSON.parse(credsAsString) as AWSCredentials;
    //     const { accessKeyId, secretAccessKey, region } = credentials;
    //     if (!accessKeyId || !secretAccessKey || !region) {
    //         return res.status(400).json({
    //             error: 'Missing required AWS credentials'
    //         });
    //     }
    //     req.body.credentials = credentials; // Attach decrypted credentials to request body
    //     next();

    // } catch (error: any) {
    //     console.error('Error in validateCredentials middleware:', error);
    //     return res.status(500).json({
    //         error: 'Internal server error',
    //         message: error.message
    //     });
    // }
};

export const validateCostRecommendationInput = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const {
        vCPU,
        RAM_GB,
        machine_count,
        storage,
        region,
        OS,
        duration,
        usage,
        budget_limit,
        workload_type,
        preferred_cloud,
        billing_model
    } = req.body;

    if (
        typeof vCPU !== 'number' ||
        typeof RAM_GB !== 'number' ||
        typeof machine_count !== 'number' ||
        !storage ||
        (storage.type !== 'SSD' && storage.type !== 'HDD') ||
        typeof storage.size_GB !== 'number' ||
        typeof region !== 'string' ||
        (OS !== 'Linux' && OS !== 'Windows') ||
        typeof duration !== 'string' ||
        typeof usage !== 'string' ||
        (budget_limit !== null && typeof budget_limit !== 'number') ||
        typeof workload_type !== 'string' ||
        (preferred_cloud !== 'AWS' && preferred_cloud !== 'Azure' && preferred_cloud !== 'GCP' && preferred_cloud !== 'Any') ||
        (billing_model !== 'OnDemand' && billing_model !== 'Reserved' && billing_model !== 'Spot' && billing_model !== 'Preemptible')
    ) {
        return res.status(400).json({
            error: 'Missing or invalid required fields. Required: vCPU (number), RAM_GB (number), machine_count (number), storage (object with type "SSD"|"HDD" and size_GB number), region (string), OS ("Linux"|"Windows"), duration (string), usage (string), budget_limit (number|null), workload_type (string), preferred_cloud ("AWS"|"Azure"|"GCP"|"Any"), billing_model ("OnDemand"|"Reserved"|"Spot"|"Preemptible")'
        });
    }

    next();
}