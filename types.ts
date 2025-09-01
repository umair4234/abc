export interface StockData {
  ticker: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: string;
  lastUpdated: string;
  sector?: string;
  overview?: OverviewData;
}

export interface OverviewData {
  [key: string]: string | number;
}


export interface GroundingSource {
  web: {
    uri: string;
    title: string;
  };
}

export interface BuySellTransaction {
  id: string; 
  date: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  cost: number;
}

export interface DividendTransaction {
  id: string;
  date: string;
  type: 'DIVIDEND';
  amount: number;
}

export type Transaction = BuySellTransaction | DividendTransaction;

export interface PortfolioHolding {
  ticker: string;
  companyName: string;
  quantity: number;
  averageBuyPrice: number;
  totalInvestment: number;
  transactions: Transaction[];
  sector?: string;
  // Live data, updated on refresh
  currentPrice?: number;
  dayChangeValue?: number; // Price change for the day per share
  overview?: OverviewData;
  dataSource?: 'scraper' | 'ai' | 'manual';
}

export interface PortfolioSnapshot {
    date: string;
    value: number;
}

export interface Portfolio {
  holdings: PortfolioHolding[];
  history: PortfolioSnapshot[];
  lastRefreshed?: string;
}

export interface PortfolioMetrics {
  totalInvestment: number;
  currentValue: number;
  totalDividends: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayGainLoss: number;
  dayGainLossPercent: number;
  lastRefreshed?: string;
}

export interface SectorAllocationData {
  name: string;
  percentage: number;
  investmentValue: number;
  holdings: {
    ticker: string;
    quantity: number;
  }[];
}


// Discriminated union for transaction payloads
export type BuyPayload = { type: 'BUY'; ticker: string; quantity: number; price: number; date: string; };
export type SellPayload = { type: 'SELL'; ticker: string; quantity: number; price: number };
export type UpdatePayload = { type: 'UPDATE'; ticker: string; totalQuantity: number; averagePrice: number };
export type DividendPayload = { type: 'DIVIDEND'; ticker: string; amount: number; date: string };
export type TransactionPayload = BuyPayload | SellPayload | UpdatePayload | DividendPayload;

// AI Analysis Report Types
interface ReportMetric {
    value: number | null;
    date?: string;
    source?: string;
    peer_median?: number;
    percentile?: number;
    trend?: 'up' | 'down' | 'flat';
    peer_comparison_text?: string;
}

interface MarketCap {
    pkr: number;
    usd: number;
    fx_used: {
        rate: number;
        date: string;
        source: string;
    };
}

interface Score {
    financial_health: number;
    profitability: number;
    growth: number;
    valuation: number;
    cash_flow: number;
    governance: number;
    overall_score: number;
}

interface Recommendation {
    action: 'Strong BUY' | 'BUY' | 'HOLD' | 'REDUCE / WEAK SELL' | 'SELL' | string;
    confidence_pct: number;
    rationale_short: string;
    confidence_rationale?: string;
}

interface WeightedRisk {
    description: string;
    impact: 'High' | 'Medium' | 'Low';
}

interface RawSource {
    label: string;
    url: string;
    date: string;
}

export interface AnalysisReport {
    ticker: string;
    company_name: string;
    as_of_date: string;
    last_price: {
        value: number;
        currency: string;
        date: string;
        source: string;
    };
    market_cap: MarketCap;
    key_metrics: {
        PE_TTM: ReportMetric;
        P_B: ReportMetric;
        ROE_TTM: ReportMetric;
        Dividend_Yield_TTM: ReportMetric;
        Revenue_TTM: ReportMetric;
        Net_Income_TTM: ReportMetric;
        [key: string]: ReportMetric;
    };
    score: Score;
    recommendation: Recommendation;
    top_reasons_buy: string[];
    weighted_risks: WeightedRisk[];
    raw_sources: RawSource[];
    executive_summary?: string;
    financial_health_details?: string;
    profitability_details?: string;
    growth_details?: string;
    valuation_details?: string;
    governance_details?: string;
    macro_industry_factors?: string;
    cash_flow_details?: string;
    historical_valuation_details?: string;
    forward_guidance_details?: string;
    visual_data_summary?: {
        profit_trend_comment: string;
        roe_vs_peers_comment: string;
        dividend_history_comment: string;
    };
    extra_sections?: {
        esg_governance?: string;
        stress_test?: string;
        action_plan?: string;
    };
}