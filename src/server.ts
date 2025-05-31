import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { S3Client, ListBucketsCommand, ListObjectsV2Command, Bucket } from "@aws-sdk/client-s3";
import { rateLimit } from 'express-rate-limit';
import S3Service from './lib/s3';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
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

const validateCredentials = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { accessKeyId, secretAccessKey, region } = req.body;

    if (!accessKeyId || !secretAccessKey || !region) {
        return res.status(400).json({
            error: 'Missing required AWS credentials'
        });
    }

    next();
};

// Routes
app.post('/api/s3/buckets', validateCredentials, async (req, res) => {
    try {
        const { accessKeyId, secretAccessKey, region } = req.body;

        const s3Service = new S3Service({
            accessKeyId,
            secretAccessKey,
            region
        });

        const buckets = await s3Service.listBuckets();

        res.send(buckets.flatMap(bucket => bucket));
    } catch (error: any) {
        console.error('Error in /api/s3/buckets:', error);

        // Handle specific AWS errors
        if (error.name === 'InvalidAccessKeyId') {
            return res.status(401).json({
                error: 'Invalid AWS access key'
            });
        }

        if (error.name === 'SignatureDoesNotMatch') {
            return res.status(401).json({
                error: 'Invalid AWS secret key'
            });
        }

        res.status(500).json({
            error: 'Failed to fetch S3 buckets',
            message: error.message
        });
    }
});

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});