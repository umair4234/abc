import { PortfolioHolding, Transaction, PortfolioMetrics, SectorAllocationData, BuySellTransaction, DividendTransaction } from '../types';

/**
 * Parses a raw text input of stock data into an array of PortfolioHolding objects.
 * Expected format per line: TICKER QUANTITY PRICE [DATE]
 * Example: "MEBL 100 150.50 2023-01-15"
 */
export const parseBulkAddInput = (text: string): PortfolioHolding[] => {
    const lines = text.trim().split('\n');
    const holdingsMap = new Map<string, PortfolioHolding>();
  
    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.trim().split(/\s+/);
      const [ticker, quantityStr, priceStr, dateStr] = parts;
  
      const quantity = parseFloat(quantityStr);
      const price = parseFloat(priceStr);
      const date = dateStr || new Date().toISOString().split('T')[0];
  
      if (!ticker || isNaN(quantity) || isNaN(price) || quantity <= 0 || price <= 0) {
        console.warn(`Skipping invalid line: ${line}`);
        return;
      }
  
      const transaction: BuySellTransaction = {
        id: crypto.randomUUID(),
        date,
        type: 'BUY',
        quantity,
        price,
        cost: quantity * price,
      };
  
      if (holdingsMap.has(ticker.toUpperCase())) {
        const existing = holdingsMap.get(ticker.toUpperCase())!;
        existing.transactions.push(transaction);
      } else {
        holdingsMap.set(ticker.toUpperCase(), {
          ticker: ticker.toUpperCase(),
          companyName: '', // Will be filled by API
          quantity: 0, // Will be calculated
          averageBuyPrice: 0, // Will be calculated
          totalInvestment: 0, // Will be calculated
          transactions: [transaction],
        });
      }
    });
  
    // Calculate final values for each holding
    return Array.from(holdingsMap.values()).map(holding => {
      let totalQuantity = 0;
      let totalCost = 0;
      holding.transactions.forEach(t => {
        if (t.type === 'BUY') {
          totalQuantity += t.quantity;
          totalCost += t.cost;
        }
      });
      return {
        ...holding,
        quantity: totalQuantity,
        totalInvestment: totalCost,
        averageBuyPrice: totalQuantity > 0 ? totalCost / totalQuantity : 0,
      };
    });
};
  
/**
 * Adds new holdings to the existing portfolio or updates them.
 */
export const addHoldings = (
    currentHoldings: PortfolioHolding[],
    newHoldings: PortfolioHolding[],
    isUpdate: boolean = false
): PortfolioHolding[] => {
    const holdingsMap = new Map<string, PortfolioHolding>(
      currentHoldings.map(h => [h.ticker, { ...h }])
    );
  
    newHoldings.forEach(newHolding => {
      if (holdingsMap.has(newHolding.ticker)) {
        const existing = holdingsMap.get(newHolding.ticker)!;
        if (isUpdate) {
          // This is a data refresh, just update live data
          existing.currentPrice = newHolding.currentPrice;
          existing.dayChangeValue = newHolding.dayChangeValue;
          existing.companyName = newHolding.companyName || existing.companyName;
          existing.sector = newHolding.sector || existing.sector;
        } else {
          // This is adding more shares, merge transactions and recalculate
          existing.transactions = [...existing.transactions, ...newHolding.transactions];
          let totalQuantity = 0;
          let totalCost = 0;
          existing.transactions.forEach(t => {
            if (t.type === 'BUY') {
                const buyTx = t as BuySellTransaction;
                totalQuantity += buyTx.quantity;
                totalCost += buyTx.cost;
            } else if (t.type === 'SELL') {
                const sellTx = t as BuySellTransaction;
                totalQuantity -= sellTx.quantity;
            }
          });
          existing.quantity = totalQuantity;
          existing.totalInvestment = totalCost; // This is the total cost of all BUYs
          existing.averageBuyPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
        }
      } else {
        holdingsMap.set(newHolding.ticker, newHolding);
      }
    });
  
    return Array.from(holdingsMap.values());
};

/**
 * Sells a specified quantity of a holding.
 */
export const sellHolding = (
    currentHoldings: PortfolioHolding[],
    ticker: string,
    quantity: number,
    price: number
): PortfolioHolding[] => {
    const holdingToSell = currentHoldings.find(h => h.ticker === ticker);
    if (!holdingToSell || quantity > holdingToSell.quantity) {
        console.error("Cannot sell more than you own.");
        return currentHoldings;
    }

    const transaction: BuySellTransaction = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        type: 'SELL',
        quantity,
        price,
        cost: quantity * price, // Here cost represents proceeds
    };

    holdingToSell.transactions.push(transaction);
    holdingToSell.quantity -= quantity;

    if(holdingToSell.quantity <= 0.0001) { 
        return currentHoldings.filter(h => h.ticker !== ticker);
    } else {
        return [...currentHoldings];
    }
}

/**
 * Adds a dividend transaction to a holding.
 */
export const addDividend = (
    currentHoldings: PortfolioHolding[],
    ticker: string,
    amount: number,
    date: string
): PortfolioHolding[] => {
    const holding = currentHoldings.find(h => h.ticker === ticker);
    if (!holding) {
        console.error("Cannot add dividend to a holding that doesn't exist.");
        return currentHoldings;
    }

    const transaction: DividendTransaction = {
        id: crypto.randomUUID(),
        date,
        type: 'DIVIDEND',
        amount,
    };

    holding.transactions.push(transaction);
    return [...currentHoldings];
};

/**
 * Directly updates a holding's total quantity and average price.
 */
export const updateHolding = (
    currentHoldings: PortfolioHolding[],
    ticker: string,
    totalQuantity: number,
    averagePrice: number
): PortfolioHolding[] => {
    const holdingsCopy = currentHoldings.map(h => ({ ...h }));
    const holdingToUpdate = holdingsCopy.find(h => h.ticker === ticker);

    if (!holdingToUpdate) {
        console.error("Holding not found for update:", ticker);
        return currentHoldings;
    }

    const syntheticTransaction: BuySellTransaction = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        type: 'BUY',
        quantity: totalQuantity,
        price: averagePrice,
        cost: totalQuantity * averagePrice,
    };
    
    holdingToUpdate.transactions = [syntheticTransaction];
    holdingToUpdate.quantity = totalQuantity;
    holdingToUpdate.averageBuyPrice = averagePrice;
    holdingToUpdate.totalInvestment = totalQuantity * averagePrice;

    return holdingsCopy;
};
  
/**
 * Calculates key metrics for the entire portfolio.
 */
export const calculatePortfolioMetrics = (holdings: PortfolioHolding[], manualPrices: Record<string, number> = {}): PortfolioMetrics => {
    const metrics: PortfolioMetrics = {
      totalInvestment: 0,
      currentValue: 0,
      totalDividends: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      dayGainLoss: 0,
      dayGainLossPercent: 0,
    };
  
    holdings.forEach(h => {
      const price = manualPrices[h.ticker] ?? h.currentPrice;
      const currentValue = price ? price * h.quantity : h.totalInvestment;
      const dayChange = h.dayChangeValue ? h.dayChangeValue * h.quantity : 0;
  
      metrics.totalInvestment += h.totalInvestment;
      metrics.currentValue += currentValue;
      metrics.dayGainLoss += dayChange;

      h.transactions.forEach(t => {
        if(t.type === 'DIVIDEND') {
          metrics.totalDividends += t.amount;
        }
      });
    });
  
    metrics.totalGainLoss = (metrics.currentValue - metrics.totalInvestment) + metrics.totalDividends;
  
    if (metrics.totalInvestment > 0) {
      metrics.totalGainLossPercent = (metrics.totalGainLoss / metrics.totalInvestment) * 100;
    }
  
    const portfolioValueYesterday = metrics.currentValue - metrics.dayGainLoss;
    if (portfolioValueYesterday > 0) {
      metrics.dayGainLossPercent = (metrics.dayGainLoss / portfolioValueYesterday) * 100;
    }
  
    return metrics;
};

/**
 * Calculates the portfolio allocation by sector.
 */
export const calculateSectorAllocation = (holdings: PortfolioHolding[], manualPrices: Record<string, number> = {}): SectorAllocationData[] => {
    const sectorMap = new Map<string, { currentValue: number; investmentValue: number; holdings: { ticker: string, quantity: number }[] }>();
    let totalValue = 0;

    holdings.forEach(h => {
        const sector = h.sector || 'Uncategorized';
        const price = manualPrices[h.ticker] ?? h.currentPrice ?? h.averageBuyPrice;
        const value = price * h.quantity;
        
        if (!sectorMap.has(sector)) {
            sectorMap.set(sector, { currentValue: 0, investmentValue: 0, holdings: [] });
        }
        const sectorData = sectorMap.get(sector)!;
        sectorData.currentValue += value;
        sectorData.investmentValue += h.totalInvestment;
        sectorData.holdings.push({ ticker: h.ticker, quantity: h.quantity });

        totalValue += value;
    });

    if (totalValue === 0) return [];

    return Array.from(sectorMap.entries())
        .map(([name, data]) => ({ 
            name, 
            percentage: (data.currentValue / totalValue) * 100,
            investmentValue: data.investmentValue,
            holdings: data.holdings
        }))
        .sort((a, b) => b.percentage - a.percentage);
};
