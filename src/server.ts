import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { S3Client, ListBucketsCommand, ListObjectsV2Command, Bucket } from "@aws-sdk/client-s3";
import { rateLimit } from 'express-rate-limit';
import S3Service from './lib/s3';
import { validateCostRecommendationInput, validateCredentials } from './middleware/validatecreds';
import { getAllCost, getListOfDynamoTables, getListOfEC2Instances, getListOfEC2Volumes, getListOfECSClusters, getListOfECSServices, getListOfS3buckets, getListOfS3Objects, getCompute, getECSTaskCount, } from './controller/listresources';
import { getCostRecomendation } from './controller/cost_recomendation';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: "*"
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Routes
app.post('/api/s3/buckets', validateCredentials, getListOfS3buckets);
app.post('/api/s3/objects', validateCredentials, getListOfS3Objects);

app.post('/api/ec2/instances', validateCredentials, getListOfEC2Instances);
app.post('/api/ec2/volumes', validateCredentials, getListOfEC2Volumes);
app.post('/api/dynamo/tables', validateCredentials, getListOfDynamoTables);
app.post('/api/ecs/clusters', validateCredentials, getListOfECSClusters);
app.post('/api/ecs/services', validateCredentials, getListOfECSServices);
app.post('/api/ecs/tasks', validateCredentials, getECSTaskCount);

app.post('/api/cost', validateCredentials, getAllCost);
app.post("/api/recommendations", validateCostRecommendationInput, getCostRecomendation);
app.post('/api/compute', validateCredentials, getCompute);

app.get('/api', (req, res) => {
    res.send('Hello, World!');
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});