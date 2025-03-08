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

    // Remove the "data:image/jpeg;base64," prefix if present
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, '');

    // Validate base64 string
    if (!base64Image || base64Image.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid image data provided' },
        { status: 400 }
      );
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
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
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        console.error('No response content from OpenAI');
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response from GPT-4
      try {
        const parsedResult = JSON.parse(result);
        return NextResponse.json(parsedResult);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        return NextResponse.json(
          { error: 'Failed to parse OpenAI response' },
          { status: 500 }
        );
      }
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      return NextResponse.json(
        { error: 'Error calling OpenAI API' },
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