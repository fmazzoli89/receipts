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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "This is a receipt image. Please extract the following information in a structured way: store name, date, all items with their prices, and the total amount. Return the data in JSON format with this structure: { storeName: string, date: string, items: Array<{ name: string, price: number }>, total: number }. Make sure all prices are numbers, not strings. If you can't read something clearly, make your best guess but try to maintain accuracy."
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

      console.log('OpenAI API response received:', response);
      const result = response.choices[0]?.message?.content;
      if (!result) {
        console.error('No response content from OpenAI');
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response from GPT-4
      try {
        console.log('Parsing OpenAI response:', result);
        const parsedResult = JSON.parse(result);
        return NextResponse.json(parsedResult);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError, '\nRaw response:', result);
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