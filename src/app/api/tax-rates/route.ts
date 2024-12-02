import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

function cleanJsonResponse(text: string): string {
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : "";
}

async function getTaxRates() {
    const message = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 150,
        messages: [{
            role: "user",
            content: `Return the current state income tax rates for California, New York, and Texas as a JSON object. Use the effective tax rate for an average income of $75,000. Format your response as valid JSON like this, with no additional text or explanation: {"CA":{"name":"California","rate":0.093},"NY":{"name":"New York","rate":0.109},"TX":{"name":"Texas","rate":0.0}}`
        }]
    });

    const content = message.content[0].type === "text" ? message.content[0].text : "";
    console.log("Raw Claude response:", content);
    
    const jsonText = cleanJsonResponse(content);
    console.log("Cleaned JSON text:", jsonText);
    
    try {
        const rates = JSON.parse(jsonText);
        console.log("Parsed tax rates:", rates);
        if (!rates.CA || !rates.NY || !rates.TX) {
            throw new Error('Missing required state data');
        }
        return rates;
    } catch (error) {
        console.error("Parse error:", error);
        throw new Error('Failed to parse tax rates');
    }
}

export async function GET() {
    try {
        const rates = await getTaxRates();
        console.log("Final rates being returned:", rates);
        return NextResponse.json(rates);
    } catch (error) {
        console.error("Error in GET:", error);
        // default rates if API fails
        const defaultRates = {
            CA: { name: "California", rate: 0.093 },
            NY: { name: "New York", rate: 0.109 },
            TX: { name: "Texas", rate: 0.0 }
        };
        console.log("Using default rates:", defaultRates);
        return NextResponse.json(defaultRates);
    }
} 