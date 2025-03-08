import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Determine the correct MIME type
    const mimeType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, '');

    // Validate base64 string
    if (!base64Image || base64Image.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid image data provided' },
        { status: 400 }
      );
    }

    try {
      console.log('Calling OpenAI API...');
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", //NEVER CHANGE THIS MODEL!!!
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are a receipt scanner. Extract the following information from this receipt image and return it in this exact JSON format, with no additional text or explanation: { \"storeName\": string, \"datetime\": string (full date and time if available), \"items\": [{ \"name\": string, \"price\": number, \"category\": string }], \"total\": number }. For each item's category, use one of these options: Groceries, Restaurant, Entertainment, Electronics, Clothing, Health, Transportation, Utilities, Home, Office Supplies, Personal Care, Subscriptions, Other. Base the category on both the item name and store type."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0,
      });

      console.log('Raw OpenAI API response:', JSON.stringify(response, null, 2));
      
      if (!response.choices || !response.choices.length) {
        console.error('Invalid response structure from OpenAI');
        throw new Error('Invalid response from OpenAI');
      }

      const result = response.choices[0]?.message?.content;
      console.log('Response content:', result);

      if (!result) {
        console.error('No response content from OpenAI');
        throw new Error('No response from OpenAI');
      }

      try {
        console.log('Attempting to parse response:', result);
        // Clean the response by removing Markdown code block syntax
        const cleanedResult = result.replace(/^```json\n|\n```$/g, '').trim();
        const parsedResult = JSON.parse(cleanedResult);
        
        // Validate the parsed result structure
        if (!parsedResult.storeName || !parsedResult.datetime || !Array.isArray(parsedResult.items) || typeof parsedResult.total !== 'number') {
          console.error('Invalid data structure in response:', parsedResult);
          throw new Error('Invalid data structure in response');
        }

        // Validate each item has the required fields
        for (const item of parsedResult.items) {
          if (!item.name || typeof item.price !== 'number' || !item.category) {
            console.error('Invalid item structure:', item);
            throw new Error('Invalid item structure in response');
          }
        }

        return NextResponse.json(parsedResult);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError, '\nResponse:', result);
        return NextResponse.json(
          { error: 'Failed to parse OpenAI response' },
          { status: 500 }
        );
      }
    } catch (openaiError: any) {
      console.error('OpenAI API error:', {
        message: openaiError.message,
        response: openaiError.response?.data,
        status: openaiError.response?.status,
        stack: openaiError.stack,
      });
      return NextResponse.json(
        { error: `Error calling OpenAI API: ${openaiError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process receipt' },
      { status: 500 }
    );
  }
} 