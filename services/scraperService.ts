import { OverviewData } from '../types';

interface ScrapedStockData {
    ticker: string;
    companyName: string;
    price: string;
    change: string;
    changePercent: string;
    overview: OverviewData;
}

// Using a CORS proxy to bypass browser security restrictions for fetching cross-origin data.
const CORS_PROXY = 'https://corsproxy.io/?';
const BASE_URL = 'https://stockanalysis.com';

/**
 * Custom error class to carry raw HTML payload for debugging purposes.
 */
export class ScrapingError extends Error {
    constructor(message: string, public details?: string) {
        super(message);
        this.name = 'ScrapingError';
    }
}

/**
 * Fetches content from a URL via a CORS proxy.
 */
const fetchHTML = async (url: string): Promise<string> => {
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    try {
        const response = await fetch(proxyUrl);
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}. Response: ${text}`);
        }
        return text;
    } catch (e: any) {
        throw new Error(`Failed to fetch content from ${url}. Error: ${e.message}`);
    }
};

/**
 * Parses the HTML document of a stock's detail page to extract relevant data.
 */
const parseStockPage = (doc: Document, originalTicker: string): ScrapedStockData => {
    if (doc.title.includes('404 Not Found') || doc.querySelector('h1')?.textContent?.includes('Page Not Found')) {
        throw new Error(`Stock with ticker "${originalTicker}" not found (404 on details page).`);
    }

    let price: string | undefined | null;
    let change = 'N/A';
    let changePercent = 'N/A';
    let companyName = 'N/A';
    let tickerFromPage = originalTicker.toUpperCase();
    let overview: OverviewData = {};

    price = doc.querySelector('[data-test="instrument-price-last"]')?.textContent?.trim();
    if (price && price !== 'N/A') {
        change = doc.querySelector('[data-test="instrument-price-change"]')?.textContent?.trim() ?? 'N/A';
        changePercent = doc.querySelector('[data-test="instrument-price-change-percent"]')?.textContent?.trim()?.replace(/[()]/g, '') ?? 'N/A';
        const headerText = doc.querySelector('[data-test="instrument-name-header"]')?.textContent?.trim() ?? '';
        companyName = headerText.split('(')[0].trim() || 'N/A';
    } else {
        throw new Error(`Primary price element not found for ${originalTicker}. Page structure may have changed.`);
    }

    // --- Overview Data Scraping ---
    const tables = doc.querySelectorAll('main table');
    tables.forEach(table => {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length === 2) {
                const key = cells[0]?.textContent?.trim();
                const value = cells[1]?.textContent?.trim();
                if (key && value) {
                    overview[key] = value;
                }
            } else if (cells.length === 4) {
                [0, 2].forEach(i => {
                    const key = cells[i]?.textContent?.trim();
                    const value = cells[i + 1]?.textContent?.trim();
                    if (key && value) {
                        overview[key] = value;
                    }
                });
            }
        });
    });


    if (!price || price === 'N/A') {
        throw new Error(`Could not parse price data for ticker "${originalTicker}".`);
    }

    return {
        ticker: tickerFromPage,
        companyName,
        price,
        change,
        changePercent,
        overview,
    };
};

/**
 * Fetches and parses stock data.
 * NOTE: This scraper is designed for stockanalysis.com, which primarily covers US markets.
 * It will likely fail for PSX-exclusive tickers, demonstrating the fallback mechanism.
 */
export const fetchStockData = async (ticker: string): Promise<ScrapedStockData> => {
    const parser = new DOMParser();
    let stockPageUrl = `${BASE_URL}/stocks/${ticker.toLowerCase()}/`; // A common URL structure
    
    try {
        const stockPageHtml = await fetchHTML(stockPageUrl);
        const stockDoc = parser.parseFromString(stockPageHtml, 'text/html');
        return parseStockPage(stockDoc, ticker);
    } catch (err: any) {
        // This makes the scraper more resilient by trying a search if the direct URL fails.
        try {
            const searchUrl = `${BASE_URL}/symbol-lookup/?q=${encodeURIComponent(ticker)}`;
            const searchHtml = await fetchHTML(searchUrl);
            const searchDoc = parser.parseFromString(searchHtml, 'text/html');

            const stockLinkElement = searchDoc.querySelector('div.table-wrap tbody tr a');
            if (!stockLinkElement) {
                throw new ScrapingError(`Stock "${ticker}" not found in search results.`);
            }

            const stockPagePath = stockLinkElement.getAttribute('href');
            if (!stockPagePath) {
                throw new ScrapingError(`Found search result for "${ticker}" but it has no link.`);
            }

            stockPageUrl = `${BASE_URL}${stockPagePath}`;
            const stockPageHtml = await fetchHTML(stockPageUrl);
            const stockDoc = parser.parseFromString(stockPageHtml, 'text/html');
            
            return parseStockPage(stockDoc, ticker);
        } catch(searchErr: any) {
            // If the search also fails, throw the more informative search error.
            throw searchErr;
        }
    }
};
