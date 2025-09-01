import { useState, useEffect, useCallback } from 'react';
import { Portfolio, PortfolioHolding, Transaction } from '../types';
import { addHoldings as addHoldingsService, sellHolding as sellHoldingService, updateHolding as updateHoldingService, addDividend as addDividendService } from '../services/portfolioService';

const PORTFOLIO_STORAGE_KEY = 'psxPortfolio';

const getInitialState = (): Portfolio => {
  try {
    const storedPortfolio = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (storedPortfolio) {
      const parsed = JSON.parse(storedPortfolio);
      // Basic validation and backward compatibility
      if (parsed && Array.isArray(parsed.holdings)) {
        return {
            holdings: parsed.holdings,
            history: Array.isArray(parsed.history) ? parsed.history : [],
            lastRefreshed: parsed.lastRefreshed
        };
      }
    }
  } catch (error) {
    console.error("Failed to load portfolio from localStorage", error);
  }
  return { holdings: [], history: [] };
};

export const usePortfolio = () => {
  const [portfolio, setPortfolio] = useState<Portfolio>(getInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(portfolio));
    } catch (error) {
      console.error("Failed to save portfolio to localStorage", error);
    }
  }, [portfolio]);

  const addHoldings = useCallback((newHoldings: PortfolioHolding[], isUpdate = false) => {
    setPortfolio(currentPortfolio => {
      const updatedHoldings = addHoldingsService(currentPortfolio.holdings, newHoldings, isUpdate);
      return {
        ...currentPortfolio,
        holdings: updatedHoldings,
        lastRefreshed: isUpdate ? new Date().toISOString() : currentPortfolio.lastRefreshed,
      };
    });
  }, []);

  const sellHolding = useCallback((ticker: string, quantity: number, price: number) => {
    setPortfolio(currentPortfolio => {
      const updatedHoldings = sellHoldingService(currentPortfolio.holdings, ticker, quantity, price);
      return { ...currentPortfolio, holdings: updatedHoldings };
    });
  }, []);

  const updateHolding = useCallback((ticker: string, totalQuantity: number, averagePrice: number) => {
    setPortfolio(currentPortfolio => {
        const updatedHoldings = updateHoldingService(currentPortfolio.holdings, ticker, totalQuantity, averagePrice);
        return { ...currentPortfolio, holdings: updatedHoldings };
    });
  }, []);
  
  const addDividend = useCallback((ticker: string, amount: number, date: string) => {
    setPortfolio(currentPortfolio => {
      const updatedHoldings = addDividendService(currentPortfolio.holdings, ticker, amount, date);
      return { ...currentPortfolio, holdings: updatedHoldings };
    })
  }, []);

  const addPortfolioSnapshot = useCallback((value: number) => {
    setPortfolio(currentPortfolio => {
        const today = new Date().toISOString().split('T')[0];
        const newHistory = [...currentPortfolio.history];
        const todayIndex = newHistory.findIndex(s => s.date.startsWith(today));

        const snapshot = { date: new Date().toISOString(), value };

        if (todayIndex !== -1) {
            // Update today's snapshot
            newHistory[todayIndex] = snapshot;
        } else {
            // Add a new snapshot
            newHistory.push(snapshot);
        }
        
        // Keep history to a reasonable length, e.g., last 365 days
        if (newHistory.length > 365) {
            newHistory.shift();
        }

        return {...currentPortfolio, history: newHistory };
    });
  }, []);

  const clearPortfolio = useCallback(() => {
    setPortfolio({ holdings: [], history: [] });
  }, []);

  return { portfolio, addHoldings, sellHolding, updateHolding, addDividend, clearPortfolio, addPortfolioSnapshot };
};
