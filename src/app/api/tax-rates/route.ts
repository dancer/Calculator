import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from 'fs/promises';
import path from 'path';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const CACHE_FILE = path.join(process.cwd(), 'tax-rates-cache.json');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheData {
    timestamp: number;
    rates: {
        [key: string]: {
            name: string;
            rate: number;
        };
    };
}

async function readCache(): Promise<CacheData | null> {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

async function writeCache(rates: any) {
    const cacheData: CacheData = {
        timestamp: Date.now(),
        rates
    };
    await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData), 'utf-8');
}

function isCacheValid(cache: CacheData): boolean {
    const now = Date.now();
    return (now - cache.timestamp) < CACHE_DURATION;
}

function cleanJsonResponse(text: string): string {
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : "";
}

async function getTaxRates() {
    const cache = await readCache();
    if (cache && isCacheValid(cache)) {
        console.log("Using cached tax rates");
        return cache.rates;
    }

    console.log("Fetching fresh tax rates from Claude");
    const message = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [{
            role: "user",
            content: `Return a JSON object containing state income tax rates for all US states. Use effective tax rate for $75,000 income. Format as compact JSON with no whitespace or newlines like this: {"AL":{"name":"Alabama","rate":0.05},"AK":{"name":"Alaska","rate":0.0}}`
        }]
    });

    const content = message.content[0].type === "text" ? message.content[0].text : "";
    console.log("Raw Claude response:", content);
    
    const jsonText = cleanJsonResponse(content);
    console.log("Cleaned JSON text:", jsonText);
    
    try {
        const fixedJson = jsonText
            .replace(/,\s*}$/, '}') 
            .replace(/,\s*"$/, '"') 
            .replace(/"\s*$/, '') 
            + (jsonText.endsWith('}') ? '' : '}'); 
        
        const rates = JSON.parse(fixedJson);
        console.log("Parsed tax rates:", rates);
        
        const expectedStates = Object.keys(defaultRates);
        const missingStates = expectedStates.filter(state => !rates[state]);
        if (missingStates.length > 0) {
            console.warn("Missing states in Claude response:", missingStates);
            throw new Error('Missing required state data');
        }
        
        await writeCache(rates);
        return rates;
    } catch (error) {
        console.error("Parse error:", error);
        throw new Error('Failed to parse tax rates');
    }
}

const defaultRates = {
    AL: { name: "Alabama", rate: 0.05 },
    AK: { name: "Alaska", rate: 0.0 },
    AZ: { name: "Arizona", rate: 0.0459 },
    AR: { name: "Arkansas", rate: 0.059 },
    CA: { name: "California", rate: 0.093 },
    CO: { name: "Colorado", rate: 0.0455 },
    CT: { name: "Connecticut", rate: 0.0699 },
    DE: { name: "Delaware", rate: 0.066 },
    FL: { name: "Florida", rate: 0.0 },
    GA: { name: "Georgia", rate: 0.0575 },
    HI: { name: "Hawaii", rate: 0.079 },
    ID: { name: "Idaho", rate: 0.058 },
    IL: { name: "Illinois", rate: 0.0495 },
    IN: { name: "Indiana", rate: 0.0323 },
    IA: { name: "Iowa", rate: 0.0608 },
    KS: { name: "Kansas", rate: 0.057 },
    KY: { name: "Kentucky", rate: 0.05 },
    LA: { name: "Louisiana", rate: 0.0425 },
    ME: { name: "Maine", rate: 0.0715 },
    MD: { name: "Maryland", rate: 0.0575 },
    MA: { name: "Massachusetts", rate: 0.05 },
    MI: { name: "Michigan", rate: 0.0425 },
    MN: { name: "Minnesota", rate: 0.0785 },
    MS: { name: "Mississippi", rate: 0.05 },
    MO: { name: "Missouri", rate: 0.054 },
    MT: { name: "Montana", rate: 0.069 },
    NE: { name: "Nebraska", rate: 0.0684 },
    NV: { name: "Nevada", rate: 0.0 },
    NH: { name: "New Hampshire", rate: 0.05 },
    NJ: { name: "New Jersey", rate: 0.0637 },
    NM: { name: "New Mexico", rate: 0.049 },
    NY: { name: "New York", rate: 0.109 },
    NC: { name: "North Carolina", rate: 0.0499 },
    ND: { name: "North Dakota", rate: 0.029 },
    OH: { name: "Ohio", rate: 0.0399 },
    OK: { name: "Oklahoma", rate: 0.0475 },
    OR: { name: "Oregon", rate: 0.0875 },
    PA: { name: "Pennsylvania", rate: 0.0307 },
    RI: { name: "Rhode Island", rate: 0.0599 },
    SC: { name: "South Carolina", rate: 0.07 },
    SD: { name: "South Dakota", rate: 0.0 },
    TN: { name: "Tennessee", rate: 0.0 },
    TX: { name: "Texas", rate: 0.0 },
    UT: { name: "Utah", rate: 0.0495 },
    VT: { name: "Vermont", rate: 0.0875 },
    VA: { name: "Virginia", rate: 0.0575 },
    WA: { name: "Washington", rate: 0.0 },
    WV: { name: "West Virginia", rate: 0.065 },
    WI: { name: "Wisconsin", rate: 0.0765 },
    WY: { name: "Wyoming", rate: 0.0 }
};

export async function GET() {
    try {
        const rates = await getTaxRates();
        console.log("Final rates being returned:", rates);
        return NextResponse.json(rates);
    } catch (error) {
        console.error("Error in GET:", error);
        console.log("Using default rates:", defaultRates);
        return NextResponse.json(defaultRates);
    }
} 