import { GoogleGenAI } from "@google/genai";
import { StockData, GroundingSource, AnalysisReport } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
  
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function parseJsonFromMarkdown<T>(text: string): T | null {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonRegex);
    let jsonString = text.trim();

    if (match && match[1]) {
        jsonString = match[1];
    }
    
    try {
        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.error("Failed to parse JSON:", error);
        console.error("Original text was:", text);
    }
    
    return null;
}

export const fetchStockData = async (
  tickers: string[]
): Promise<{ stockData: StockData[]; sources: GroundingSource[] } | null> => {
  if (tickers.length === 0) {
    return { stockData: [], sources: [] };
  }
  const tickerList = tickers.map(t => `"${t.toUpperCase()}"`).join(', ');

  const prompt = `
    Fetch the latest stock information for the following tickers from the Pakistan Stock Exchange (PSX): [${tickerList}]
    
    You MUST respond with only a valid JSON array inside a JSON markdown block.
    Each object in the array MUST conform exactly to this structure:
    {
      "ticker": "string",
      "companyName": "string",
      "price": "number",
      "change": "number (positive or negative float)",
      "changePercent": "number (positive or negative float)",
      "dayHigh": "number",
      "dayLow": "number",
      "volume": "string (e.g., '1.2M')",
      "sector": "string (e.g., 'Technology & Communication', 'Cement', 'Commercial Banks')",
      "lastUpdated": "string (e.g., 'YYYY-MM-DD HH:MM:SS')",
      "overview": {
          "Market Cap": "string (e.g., 'PKR 1.2T')",
          "P/E Ratio (TTM)": "number | null",
          "EPS (TTM)": "number | null"
      }
    }

    It is critical that you provide a specific, valid sector for every stock. Do NOT use "Uncategorized". If a precise sector is not available, provide a best-effort classification (e.g., "Financial Services", "Consumer Goods").
    If you cannot find information for a specific ticker, omit it from the array. The array must only contain entries with valid, complete data.
    The 'overview' object is optional, but include it with any data you can find.
    Do not add any text, notes, or explanations outside of the JSON markdown block. Your entire response must be the JSON structure.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0,
      },
    });

    const stockData = parseJsonFromMarkdown<StockData[]>(response.text);
    
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources = (groundingMetadata?.groundingChunks?.filter(chunk => chunk.web) as GroundingSource[] | undefined) || [];

    if (stockData) {
      return { stockData, sources };
    } else {
       throw new Error("Could not parse valid JSON from AI response. The response was: " + response.text);
    }
  } catch (error) {
    console.error(`Error fetching data for tickers [${tickerList}]:`, error);
    throw new Error(`Failed to fetch stock data from the AI model. Please check the console for details.`);
  }
};

export const fetchFundamentalAnalysis = async (ticker: string): Promise<AnalysisReport> => {
    const systemInstruction = `You are a deep-research financial analyst. You will research and produce a fact-checked, source-cited fundamental analysis report for a single Pakistani company listed on PSX. Use the latest official and reliable sources. Always show the date of the data you used (AS_OF_DATE) and include direct source links next to numbers. Use very simple English. Do not give legal/financial advice; give informational analysis only and show assumptions. For every numeric claim include a URL and the exact date of the document. If data is missing, say "DATA NOT FOUND". Your final response MUST be a single JSON object that strictly adheres to the provided schema.`;

    const prompt = `
    Please run a DETAILED report for TICKER=${ticker}, EXCHANGE=PSX. 
    Use latest data and sources. 
    Produce a full report as described in the system instructions. 
    Include score breakdown and all detailed text sections (executive_summary, financial_health_details, etc.).

    Your entire response MUST be a single, valid JSON object inside a JSON markdown block.
    The JSON object MUST conform exactly to this structure:
    {
      "ticker": "string",
      "company_name": "string",
      "as_of_date": "string",
      "last_price": { "value": "number", "currency": "string", "date": "string", "source": "string" },
      "market_cap": { "pkr": "number", "usd": "number", "fx_used": { "rate": "number", "date": "string", "source": "string" } },
      "key_metrics": {
        "PE_TTM": { "value": "number | null", "date": "string", "source": "string", "peer_median": "number", "percentile": "number" },
        "P_B": { "value": "number | null", "date": "string", "source": "string", "peer_median": "number", "percentile": "number" },
        "ROE_TTM": { "value": "number | null", "date": "string", "source": "string", "peer_median": "number", "percentile": "number" },
        "Revenue_TTM": { "value": "number | null", "date": "string", "source": "string", "peer_median": "number", "percentile": "number" },
        "Net_Income_TTM": { "value": "number | null", "date": "string", "source": "string", "peer_median": "number", "percentile": "number" },
        "Free_Cash_Flow": { "value": "number | null", "date": "string", "source": "string", "peer_median": "number", "percentile": "number" }
      },
      "score": { "financial_health": "number", "profitability": "number", "growth": "number", "valuation": "number", "cash_flow": "number", "governance": "number", "overall_score": "number" },
      "recommendation": { "action": "string", "confidence_pct": "number", "rationale_short": "string" },
      "top_reasons_buy": ["string"],
      "top_risks": ["string"],
      "raw_sources": [{ "label": "string", "url": "string", "date": "string" }],
      "executive_summary": "string",
      "financial_health_details": "string",
      "profitability_details": "string",
      "growth_details": "string",
      "valuation_details": "string",
      "governance_details": "string",
      "macro_industry_factors": "string"
    }

    Do not add any text, notes, or explanations outside of the JSON markdown block.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                tools: [{ googleSearch: {} }],
                temperature: 0.2,
            },
        });
        
        const report = parseJsonFromMarkdown<AnalysisReport>(response.text);
        if(report) {
            return report;
        } else {
            throw new Error("Could not parse valid JSON analysis report from AI response.");
        }
    } catch(error) {
        console.error(`Error fetching analysis for ticker [${ticker}]:`, error);
        throw new Error(`Failed to fetch fundamental analysis from the AI model. The model may be unable to find data for this ticker or there was a network issue.`);
    }
};
