import { Response } from "express";

export const handleAWSError = (error: any, res: Response) => {
    console.error('AWS Error:', error);

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

    return res.status(500).json({
        error: 'AWS service error',
        message: error.message
    });
};