import React, { useState, useCallback, useMemo } from 'react';
import { PortfolioHolding, TransactionPayload, AnalysisReport, StockData } from './types';
import { usePortfolio } from './hooks/usePortfolio';
import { fetchStockData as fetchStockDataWithAI, fetchFundamentalAnalysis } from './services/geminiService';
import { fetchStockData as fetchStockDataWithScraper } from './services/scraperService';
import { calculatePortfolioMetrics, calculateSectorAllocation, parseBulkAddInput } from './services/portfolioService';
import PortfolioDashboard from './components/PortfolioDashboard';
import PortfolioTable from './components/PortfolioTable';
import AddStockModal from './components/AddStockModal';
import TransactionModal from './components/TransactionModal';
import PortfolioAllocation from './components/PortfolioAllocation';
import PortfolioGraph from './components/PortfolioGraph';
import ErrorMessage from './components/ErrorMessage';
import { PlusIcon } from './components/icons/PlusIcon';
import { RefreshIcon } from './components/icons/RefreshIcon';
import AnalysisModal from './components/AnalysisModal';
import AllTransactionsHistory from './components/AllTransactionsHistory';

const App: React.FC = () => {
  const { portfolio, addHoldings, sellHolding, updateHolding, addDividend, clearPortfolio, addPortfolioSnapshot } = usePortfolio();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [transactionModalState, setTransactionModalState] = useState<{isOpen: boolean; holding: PortfolioHolding | null}>({isOpen: false, holding: null});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshingMissing, setIsRefreshingMissing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [manualPrices, setManualPrices] = useState<Record<string, string>>({});

  // State for AI Analysis Modal
  const [analysisModalState, setAnalysisModalState] = useState<{
    isOpen: boolean;
    ticker: string | null;
    report: AnalysisReport | null;
    isLoading: boolean;
    error: string | null;
  }>({ isOpen: false, ticker: null, report: null, isLoading: false, error: null });

  // State for scrape/fallback mechanism
  const [scrapeFailedTickers, setScrapeFailedTickers] = useState<string[]>([]);

  const updateHoldingsWithNewData = useCallback((data: StockData[]) => {
      // FIX: Add an explicit return type to the map callback to ensure the type guard in the filter is valid.
      const updatedHoldings = data.map((liveData): PortfolioHolding | null => {
        const existingHolding = portfolio.holdings.find(h => h.ticker === liveData.ticker);
        if (!existingHolding) return null;
        return {
          ...existingHolding,
          companyName: liveData.companyName || existingHolding.companyName,
          currentPrice: liveData.price,
          dayChangeValue: liveData.change,
          sector: liveData.sector || existingHolding.sector,
          overview: liveData.overview || existingHolding.overview,
        };
      }).filter((h): h is PortfolioHolding => h !== null);

      if (updatedHoldings.length > 0) {
        addHoldings(updatedHoldings, true);
      }
  }, [addHoldings, portfolio.holdings]);


  const handleRefreshWithScraper = useCallback(async (tickers: string[]) => {
      if (tickers.length === 0) return;
      setIsLoading(true);
      setError(null);
      setScrapeFailedTickers([]);

      const results = await Promise.allSettled(
          tickers.map(ticker => fetchStockDataWithScraper(ticker))
      );

      const successfulData: StockData[] = [];
      const failed: string[] = [];

      results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
              const { ticker, companyName, price, change, overview } = result.value;
              const priceNum = parseFloat(price.replace(/,/g, ''));
              const changeNum = parseFloat(change);

              if (!isNaN(priceNum)) {
                  successfulData.push({
                      ticker,
                      companyName,
                      price: priceNum,
                      change: changeNum,
                      // The scraper doesn't provide all details, so we set defaults
                      changePercent: 0, 
                      dayHigh: 0,
                      dayLow: 0,
                      volume: overview?.Volume?.toString() || 'N/A',
                      lastUpdated: new Date().toISOString(),
                      overview: overview,
                  });
              } else {
                  failed.push(tickers[index]);
              }
          } else {
              failed.push(tickers[index]);
          }
      });
      
      if(successfulData.length > 0) {
        updateHoldingsWithNewData(successfulData);
      }
      if(failed.length > 0) {
        setScrapeFailedTickers(failed);
        setError(`The primary data source failed for ${failed.length} ticker(s). This is common for PSX stocks; try the AI-powered alternative.`);
      }

      setIsLoading(false);
  }, [updateHoldingsWithNewData]);

  const handleRefreshWithAI = useCallback(async (tickers: string[], isFallback: boolean = false) => {
      if (tickers.length === 0) return;
      if (isFallback) {
        setIsLoading(true); // Control main loader for fallback
      }
      setError(null);
      try {
          const result = await fetchStockDataWithAI(tickers);
          if (result && result.stockData.length > 0) {
              updateHoldingsWithNewData(result.stockData);
              // If this was a fallback, clear the failed tickers list
              if (isFallback) {
                setScrapeFailedTickers([]);
              }
          } else {
              setError('AI method could not retrieve fresh market data. Some tickers may be invalid.');
          }
      } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred with the AI method.');
      } finally {
          if (isFallback) {
            setIsLoading(false);
          }
      }
  }, [updateHoldingsWithNewData]);


  const handleRefreshAll = useCallback(() => {
    if (portfolio.holdings.length === 0) return;
    const allTickers = portfolio.holdings.map(h => h.ticker);
    handleRefreshWithScraper(allTickers);
  }, [portfolio.holdings, handleRefreshWithScraper]);

  const handleFallbackRefresh = useCallback(() => {
    handleRefreshWithAI(scrapeFailedTickers, true);
  }, [scrapeFailedTickers, handleRefreshWithAI]);


  const handleRefreshMissing = useCallback(async () => {
    const missingTickers = portfolio.holdings
        .filter(h => h.currentPrice === undefined || h.currentPrice === null)
        .map(h => h.ticker);
    if (missingTickers.length === 0) return;
    setIsRefreshingMissing(true);
    // Use AI for missing as it's more reliable
    await handleRefreshWithAI(missingTickers, false);
    setIsRefreshingMissing(false);
  }, [portfolio.holdings, handleRefreshWithAI]);
  
  const handleAnalyzeStock = useCallback(async (ticker: string) => {
    setAnalysisModalState({ isOpen: true, ticker, report: null, isLoading: true, error: null });

    try {
        const cacheKey = `analysis_${ticker}`;
        const cachedItem = localStorage.getItem(cacheKey);
        const now = new Date().getTime();
        
        if (cachedItem) {
            const { timestamp, report } = JSON.parse(cachedItem);
            // Cache is valid for 24 hours
            if (now - timestamp < 24 * 60 * 60 * 1000) {
                setAnalysisModalState({ isOpen: true, ticker, report, isLoading: false, error: null });
                return;
            }
        }

        const report = await fetchFundamentalAnalysis(ticker);
        
        const newCacheItem = {
            timestamp: now,
            report,
        };
        localStorage.setItem(cacheKey, JSON.stringify(newCacheItem));

        setAnalysisModalState({ isOpen: true, ticker, report, isLoading: false, error: null });

    } catch(err) {
        console.error("Analysis failed:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during analysis.';
        setAnalysisModalState({ isOpen: true, ticker, report: null, isLoading: false, error: errorMessage });
    }
  }, []);

  const handleCloseAnalysisModal = () => {
    setAnalysisModalState({ isOpen: false, ticker: null, report: null, isLoading: false, error: null });
  };


  const handleManualPriceChange = (ticker: string, value: string) => {
    setManualPrices(prev => ({...prev, [ticker]: value}));
  };

  const handleOpenTransactionModal = (holding: PortfolioHolding) => {
    setTransactionModalState({ isOpen: true, holding: holding });
  };

  const handleCloseTransactionModal = () => {
    setTransactionModalState({ isOpen: false, holding: null });
  };

  const handleConfirmTransaction = (payload: TransactionPayload) => {
    switch(payload.type) {
      case 'BUY': {
        const holdingText = `${payload.ticker} ${payload.quantity} ${payload.price} ${payload.date}`;
        const newHolding = parseBulkAddInput(holdingText);
        addHoldings(newHolding);
        break;
      }
      case 'SELL':
        sellHolding(payload.ticker, payload.quantity, payload.price);
        break;
      case 'UPDATE':
        updateHolding(payload.ticker, payload.totalQuantity, payload.averagePrice);
        break;
      case 'DIVIDEND':
        addDividend(payload.ticker, payload.amount, payload.date);
        break;
    }
    handleCloseTransactionModal();
  };

  const numericManualPrices = useMemo(() => {
    return Object.entries(manualPrices).reduce((acc, [ticker, priceStr]) => {
        const priceNum = parseFloat(priceStr);
        if (!isNaN(priceNum)) {
            acc[ticker] = priceNum;
        }
        return acc;
    }, {} as Record<string, number>);
  }, [manualPrices]);

  const portfolioMetrics = useMemo(() => 
    calculatePortfolioMetrics(portfolio.holdings, numericManualPrices),
    [portfolio.holdings, numericManualPrices]
  );
  
  const sectorAllocation = useMemo(() => 
    calculateSectorAllocation(portfolio.holdings, numericManualPrices),
    [portfolio.holdings, numericManualPrices]
  );

  React.useEffect(() => {
    if(!isLoading && portfolio.lastRefreshed) {
        const today = new Date().toISOString().split('T')[0];
        const lastSnapshotDate = portfolio.history.length > 0 ? portfolio.history[portfolio.history.length - 1].date.split('T')[0] : null;
        
        if (today !== lastSnapshotDate || !lastSnapshotDate) {
             addPortfolioSnapshot(portfolioMetrics.currentValue);
        }
    }
  }, [isLoading, portfolio.lastRefreshed, portfolioMetrics.currentValue, addPortfolioSnapshot, portfolio.history]);


  const missingDataTickers = useMemo(() => 
    portfolio.holdings.filter(h => h.currentPrice === undefined || h.currentPrice === null),
    [portfolio.holdings]
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <div className="container mx-auto px-4 py-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">PSX Portfolio Tracker</h1>
            <p className="text-lg text-gray-400">Your personal dashboard for PSX investments.</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white font-bold py-2 px-4 rounded-md hover:bg-emerald-500 transition-colors mt-4 sm:mt-0"
            aria-label="Add new stock holdings"
          >
            <PlusIcon />
            Add Holdings
          </button>
        </header>
        
        <main>
          <PortfolioDashboard metrics={portfolioMetrics} onRefresh={handleRefreshAll} isLoading={isLoading} />
          
          {error && scrapeFailedTickers.length === 0 && <div className="my-4"><ErrorMessage message={error} /></div>}
          
          {scrapeFailedTickers.length > 0 && (
             <div className="my-4 bg-yellow-900/30 border border-yellow-500 text-yellow-300 px-4 py-3 rounded-lg flex justify-between items-center">
                <span>{error}</span>
                <button 
                    onClick={handleFallbackRefresh} 
                    disabled={isLoading}
                    className="bg-emerald-600 text-white font-bold py-1 px-3 rounded-md hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? 'Loading...' : 'Try AI Fallback'}
                </button>
             </div>
          )}


          {portfolio.holdings.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <div className="lg:col-span-2">
                   <div className="flex justify-between items-center mb-4">
                     <h2 className="text-2xl font-bold text-white">Your Holdings</h2>
                     {missingDataTickers.length > 0 && (
                        <button 
                            onClick={handleRefreshMissing}
                            disabled={isRefreshingMissing}
                            className="flex items-center gap-2 text-sm bg-yellow-600/20 text-yellow-300 font-semibold py-2 px-3 rounded-md hover:bg-yellow-600/40 disabled:opacity-50 transition-colors"
                        >
                             {isRefreshingMissing ? (
                                <div className="animate-spin"><RefreshIcon /></div>
                            ) : (
                                <RefreshIcon />
                            )}
                            Refresh {missingDataTickers.length} Missing
                        </button>
                     )}
                   </div>
                   <PortfolioTable 
                    holdings={portfolio.holdings} 
                    onTransactClick={handleOpenTransactionModal}
                    onAnalyzeClick={handleAnalyzeStock}
                    manualPrices={manualPrices}
                    onManualPriceChange={handleManualPriceChange}
                    />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Portfolio Allocation</h2>
                  <PortfolioAllocation data={sectorAllocation} />
                </div>
              </div>
              <div className="mt-8">
                  <h2 className="text-2xl font-bold text-white mb-4">Portfolio Performance</h2>
                  <PortfolioGraph data={portfolio.history} />
              </div>
               <div className="mt-8">
                  <AllTransactionsHistory holdings={portfolio.holdings} />
              </div>
            </>
          ) : (
            <div className="text-center py-20 px-6 bg-gray-800/20 border border-gray-700 rounded-lg mt-8">
              <h2 className="text-2xl font-semibold text-white mb-2">Your Portfolio is Empty</h2>
              <p className="text-gray-400 mb-6">Click on "Add Holdings" to start tracking your investments.</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-600 text-white font-bold py-2 px-5 rounded-md hover:bg-emerald-500 transition-colors"
                aria-label="Add new stock"
              >
                Get Started
              </button>
            </div>
          )}
        </main>

        <footer className="text-center py-8 mt-8">
            {portfolio.holdings.length > 0 && (
                 <button onClick={() => { if(confirm('Are you sure you want to delete your entire portfolio? This action cannot be undone.')) clearPortfolio()}} className="text-red-500 hover:text-red-400 text-sm mb-4">
                     Clear All Data
                 </button>
            )}
            <p className="text-xs text-gray-500">
                Disclaimer: Stock information may not be real-time. Data is stored locally in your browser.
            </p>
        </footer>
      </div>

      {isAddModalOpen && (
        <AddStockModal 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={addHoldings} 
        />
      )}

      {transactionModalState.isOpen && transactionModalState.holding && (
        <TransactionModal
          holding={transactionModalState.holding}
          onClose={handleCloseTransactionModal}
          onConfirm={handleConfirmTransaction}
        />
      )}

      {analysisModalState.isOpen && (
        <AnalysisModal
            isOpen={analysisModalState.isOpen}
            onClose={handleCloseAnalysisModal}
            ticker={analysisModalState.ticker}
            report={analysisModalState.report}
            isLoading={analysisModalState.isLoading}
            error={analysisModalState.error}
        />
      )}
    </div>
  );
};

export default App;
