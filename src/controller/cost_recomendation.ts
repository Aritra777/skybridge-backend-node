import { Request, Response } from 'express';
import { GeminiService } from '../lib/gemini';
import fs from 'fs';

export const getCostRecomendation = async (req: Request, res: Response) => {
    try {
        const userInput = req.body;

        const geminiService = new GeminiService();
        const geminiResponse: string = await geminiService.getRecommendations(JSON.stringify(userInput));
        if (!geminiResponse || geminiResponse.trim() === '') {
            return res.status(500).json({ error: 'No response from Gemini.' });
        }
        console.log('Gemini Response:', geminiResponse);
        // Try to parse the response as JSON
        let recommendations;
        try {
            // Remove markdown-style triple backticks and optional "json" after them
            const cleaned = geminiResponse
                .replace(/^```json\s*/i, '') // remove starting ```json
                .replace(/^```/, '')         // in case it's just ```
                .replace(/\s*```$/, '')      // remove ending ```
                .trim();                     // remove leading/trailing whitespace

            // Parse the cleaned JSON string
            recommendations = JSON.parse(cleaned);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to parse Gemini response.' });
        }
        // console.log('Gemini Response:', geminiResponse);

        // Saving the response in a file with the timestamp as the filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = `./gemini_responses/recommendations_${timestamp}.json`;
        fs.writeFileSync(filePath, JSON.stringify(geminiResponse, null, 2), 'utf8');

        res.status(200).json(recommendations);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
}