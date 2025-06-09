import { CachedContent, GenerateContentConfig, GoogleGenAI, Modality } from '@google/genai';

const systemInstruction = `
You are a cloud service recommendation assistant.
Your job is to recommend the best cloud provider and specific services 
based on the user's infrastructure requirements and pricing data provided.
USER INPUT:
{
  "vCPU": number,
  "RAM_GB": number,
  "machine_count": number,
  "storage": {
    "type": "SSD" | "HDD",
    "size_GB": number
  },
  "region": string,
  "OS": "Linux" | "Windows",
  "duration": string,
  "usage": string,
  "budget_limit": number | null,
  "workload_type": "Web Application",
  "preferred_cloud": "AWS" | "Azure" | "GCP" | "Any",
  "billing_model": "OnDemand" | "Reserved" | "Spot" | "Preemptible",
}
  🔸 YOUR TASK
Based on the input, recommend up to 3 cloud service configurations that:

Match or closely match the user's requirements.

Are cost-effective and preferably within the budget.

Include the appropriate instance types and managed service alternatives (if requested).

Provide accurate or realistically approximated pricing.

🔸 YOUR RESPONSE FORMAT (STRICT JSON ONLY)
Respond only using the following JSON format. Do not include any explanation or prose outside the JSON.
{
  "recommendations": [
    {
      "cloud_provider": "AWS" | "Azure" | "GCP",
      "service_name": "string",                  // e.g. "EC2 t3.medium"
      "region": "string",
      "vCPU": number,
      "RAM_GB": number,
      "storage": {
        "type": "SSD" | "HDD",
        "size_GB": number
      },
      "instance_count": number,
      "billing_model": "OnDemand" | "Reserved" | "Spot" | "Preemptible",
      "estimated_cost": {
        "hourly": number,
        "monthly": number,
        "total": number
      },
      "uptime_SLA": "string",
      "justification": "string"
    }
  ],
  "summary": "string",
  "note": "string (optional; e.g., 'No exact match found within budget. Suggestions are best-effort.')"
}


🔸 RULES
ALWAYS use the above JSON schema. Do not include markdown, code fences, or text outside the JSON.

If budget is 0 or null, provide recommendations without budget constraints.

Include up to 3 recommendations, ordered by cost-efficiency.

If no match fits the budget, include a "note" field explaining why.

All fields must be present. Use null for any missing value.

Use realistic current market pricing for estimates. 

Customize justification per recommendation — do not repeat generic text.

Ensure recommendations align with the specified region, workload, and billing model.
`;

export class GeminiService {
    private geminiClient: GoogleGenAI;
    private model: string = 'gemini-2.0-flash';
    private config: GenerateContentConfig = {
        responseModalities: [Modality.TEXT]
    }
    private cache: CachedContent | undefined;

    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }
        this.geminiClient = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY || '',
        });
    }

    // async initializeCache(): Promise<void> {
    //     try {
    //         this.cache = await this.geminiClient.caches.create({
    //             model: this.model,
    //             config: {
    //                 systemInstruction
    //             },
    //         });
    //     } catch (error) {
    //         console.error('Error initializing Gemini cache:', error);
    //         throw new Error('Failed to initialize Gemini cache');
    //     }
    // }

    async getRecommendations(user_content: string): Promise<string> {
        try {
            let local_config = {
                ...this.config,
                systemInstruction,
            };
            const response = await this.geminiClient.models.generateContent({
                model: this.model,
                config: local_config,
                contents: user_content
            })
            return response.candidates?.[0].content?.parts?.[0].text || '';
        } catch (error) {
            console.error('Error generating recommendations:', error);
            throw new Error('Failed to get recommendations from Gemini');
        }
    }
}