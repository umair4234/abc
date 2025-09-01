import { GoogleGenAI } from "@google/genai";
import { StockData, GroundingSource, AnalysisReport } from '../types';

// Lazily initialize to avoid crashing the app if API_KEY is missing on load.
// The main App component will handle showing an error message to the user.
let ai: GoogleGenAI | undefined;
function getAi() {
    if (!ai) {
        if (!process.env.API_KEY) {
            // This should ideally not be reached if the App.tsx check is in place,
            // but it's a safeguard.
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

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
    const response = await getAi().models.generateContent({
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
    const systemInstruction = `You are a world-class senior financial analyst specializing in the Pakistan Stock Exchange (PSX). Your task is to produce a deep, fact-checked, and source-cited fundamental analysis report for a single company. Use the latest available official financial reports and reliable market data. Always cite the exact date of the data used (AS_OF_DATE) and include direct source URLs for every numerical claim. Use simple, clear English. You are providing informational analysis only, not financial advice. If data is missing for a specific field, explicitly state "DATA NOT FOUND". Your final response MUST be a single, valid JSON object that strictly adheres to the provided schema.`;

    const prompt = `
    Please conduct a DETAILED fundamental analysis report for TICKER=${ticker}, EXCHANGE=PSX.
    Use the latest available data and sources.
    Produce a full report as described in the system instructions.
    Ensure all fields in the JSON schema are populated, especially the new detailed sections.

    Your entire response MUST be a single, valid JSON object inside a JSON markdown block.
    The JSON object MUST conform exactly to this structure:
    {
      "ticker": "string",
      "company_name": "string",
      "as_of_date": "string (date of data)",
      "last_price": { "value": "number", "currency": "string", "date": "string", "source": "string (URL)" },
      "market_cap": { "pkr": "number", "usd": "number", "fx_used": { "rate": "number", "date": "string", "source": "string (URL)" } },
      "key_metrics": {
        "PE_TTM": { "value": "number | null", "date": "string", "source": "string (URL)", "peer_median": "number", "trend": "'up' | 'down' | 'flat'", "peer_comparison_text": "string (e.g., 'Lower than peer median of X')" },
        "P_B": { "value": "number | null", "date": "string", "source": "string (URL)", "peer_median": "number", "trend": "'up' | 'down' | 'flat'", "peer_comparison_text": "string" },
        "ROE_TTM": { "value": "number | null", "date": "string", "source": "string (URL)", "peer_median": "number", "trend": "'up' | 'down' | 'flat'", "peer_comparison_text": "string" },
        "Dividend_Yield_TTM": { "value": "number | null", "date": "string", "source": "string (URL)", "peer_median": "number", "trend": "'up' | 'down' | 'flat'", "peer_comparison_text": "string" },
        "Revenue_TTM": { "value": "number | null", "date": "string", "source": "string (URL)", "peer_median": "number", "trend": "'up' | 'down' | 'flat'", "peer_comparison_text": "string" },
        "Net_Income_TTM": { "value": "number | null", "date": "string", "source": "string (URL)", "peer_median": "number", "trend": "'up' | 'down' | 'flat'", "peer_comparison_text": "string" }
      },
      "score": { "financial_health": "number (0-100)", "profitability": "number (0-100)", "growth": "number (0-100)", "valuation": "number (0-100)", "cash_flow": "number (0-100)", "governance": "number (0-100)", "overall_score": "number (0-100)" },
      "recommendation": { "action": "string (e.g., 'BUY')", "confidence_pct": "number (0-100)", "rationale_short": "string (1-2 sentences)", "confidence_rationale": "string (e.g., 'Confidence reduced due to X')" },
      "top_reasons_buy": ["string (3-5 reasons)"],
      "weighted_risks": [{ "description": "string", "impact": "'High' | 'Medium' | 'Low'" }],
      "raw_sources": [{ "label": "string", "url": "string (URL)", "date": "string" }],
      "executive_summary": "string",
      "financial_health_details": "string",
      "profitability_details": "string",
      "growth_details": "string",
      "valuation_details": "string",
      "governance_details": "string",
      "macro_industry_factors": "string",
      "cash_flow_details": "string (Detailed breakdown of OCF and FCF with 3-year trend analysis)",
      "historical_valuation_details": "string (Compare current valuation like P/E to its 5-year average)",
      "forward_guidance_details": "string (Incorporate analyst estimates or forward guidance if available)",
      "visual_data_summary": {
        "profit_trend_comment": "string (Brief comment on 5-year profit trend)",
        "roe_vs_peers_comment": "string (Brief comment on ROE vs peers)",
        "dividend_history_comment": "string (Brief comment on dividend history and sustainability)"
      },
      "extra_sections": {
          "esg_governance": "string (Comments on ESG or Shariah compliance)",
          "stress_test": "string (Comment on potential performance in a bad-case macro scenario)",
          "action_plan": "string (Suggested re-check cadence, e.g., 'Revisit after Q3 results')"
      }
    }
    Do not add any text, notes, or explanations outside of the JSON markdown block.
    `;

    try {
        const response = await getAi().models.generateContent({
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