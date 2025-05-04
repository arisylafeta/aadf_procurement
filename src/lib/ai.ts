import { google } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

export async function rateFile(prompt: string, fileBuffer: Buffer, mimeType: string) {
  try {
    // Convert Buffer to Uint8Array for the AI SDK
    const fileData = new Uint8Array(fileBuffer);

    const text = await generateText({
      model: google('gemini-2.0-flash'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'file',
              data: fileData,
              mimeType: mimeType,
            },
          ],
        },
      ],
    });
    const structuredPrompt = "Return this answer into structured format" + text;

    const result = await generateObject({
        model: google('gemini-2.0-flash'),
        schema: z.object({
          rating: z.number(),
          reasoning: z.string(),
        }),
        prompt: structuredPrompt,
      });

    return result;
  } catch (error) {
    console.error('Error generating file rating:', error);
    throw error; // Re-throw the error after logging
  }
}

export async function rateTotal(prompt: string) {
  return await generateText({
    model: google('gemini-1.5-pro-latest'),
    prompt: prompt,
  });
}