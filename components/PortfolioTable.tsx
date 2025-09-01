import React, { useState } from 'react';
import { PortfolioHolding } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { BrainIcon } from './icons/BrainIcon';
import StockDetails from './StockDetails';
import { LightningIcon } from './icons/LightningIcon';

interface PortfolioTableProps {
  holdings: PortfolioHolding[];
  onTransactClick: (holding: PortfolioHolding) => void;
  onAnalyzeClick: (ticker: string) => void;
  manualPrices: Record<string, string>;
  onManualPriceChange: (ticker: string, value: string) => void;
}

const formatCurrency = (value: number, digits = 2) => {
    return `Rs. ${new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)}`;
};

const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
}

const TableHeader: React.FC<{ children?: React.ReactNode, className?: string }> = ({ children, className }) => (
    <th className={`p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${className || ''}`}>
        {children}
    </th>
);

const TableCell: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <td className={`p-3 text-sm text-gray-200 whitespace-nowrap ${className || ''}`}>
        {children}
    </td>
);

const ManualPriceInput: React.FC<{ticker: string, value: string, onChange: (ticker: string, value: string) => void}> = ({ ticker, value, onChange }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (/^\d*\.?\d*$/.test(val)) {
            onChange(ticker, val);
        }
    };
    return (
        <input 
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="N/A"
            className="w-24 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
            aria-label={`Manual price for ${ticker}`}
        />
    )
}


const PortfolioTable: React.FC<PortfolioTableProps> = ({ holdings, onTransactClick, onAnalyzeClick, manualPrices, onManualPriceChange }) => {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = (ticker: string) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(ticker)) {
            newSet.delete(ticker);
        } else {
            newSet.add(ticker);
        }
        setExpandedRows(newSet);
    }
    
  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-800/60">
          <tr>
            <TableHeader></TableHeader>
            <TableHeader>Ticker</TableHeader>
            <TableHeader>Quantity</TableHeader>
            <TableHeader>Avg. Buy Price</TableHeader>
            <TableHeader>Current Price</TableHeader>
            <TableHeader>Current Value</TableHeader>
            <TableHeader className="hidden md:table-cell">Day's P/L</TableHeader>
            <TableHeader>Total P/L</TableHeader>
            <TableHeader>Actions</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {holdings.sort((a,b) => a.ticker.localeCompare(b.ticker)).map((holding) => {
            const isExpanded = expandedRows.has(holding.ticker);
            
            const manualPriceNum = parseFloat(manualPrices[holding.ticker]);
            const effectivePrice = !isNaN(manualPriceNum) ? manualPriceNum : holding.currentPrice;

            const currentValue = (effectivePrice ?? holding.averageBuyPrice) * holding.quantity;
            
            const totalDividends = holding.transactions.reduce((acc, t) => {
                return t.type === 'DIVIDEND' ? acc + t.amount : acc;
            }, 0);

            const totalGainLoss = (currentValue - holding.totalInvestment) + totalDividends;
            const totalGainLossPercent = (totalGainLoss / holding.totalInvestment) * 100;
            const dayPL = (holding.dayChangeValue ?? 0) * holding.quantity;
            
            const totalPLColor = totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400';
            const dayPLColor = dayPL >= 0 ? 'text-green-400' : 'text-red-400';
            
            return (
              <React.Fragment key={holding.ticker}>
                <tr className="hover:bg-gray-800/40 transition-colors">
                    <TableCell>
                        <button onClick={() => toggleRow(holding.ticker)} className="p-1 rounded-full hover:bg-gray-700">
                           <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    </TableCell>
                    <TableCell>
                        <div className="font-bold">{holding.ticker}</div>
                        <div className="text-xs text-gray-400 hidden sm:block">{holding.companyName || holding.sector}</div>
                    </TableCell>
                    <TableCell>{formatNumber(holding.quantity)}</TableCell>
                    <TableCell>{formatCurrency(holding.averageBuyPrice)}</TableCell>
                    <TableCell>
                        <div className="flex items-center justify-end gap-2">
                             {holding.currentPrice !== undefined ? 
                                formatCurrency(holding.currentPrice) : 
                                <ManualPriceInput ticker={holding.ticker} value={manualPrices[holding.ticker] || ''} onChange={onManualPriceChange} />
                            }
                            {holding.dataSource === 'scraper' && <span title="Source: Scraper (Fast)" className="text-yellow-400"><LightningIcon /></span>}
                            {holding.dataSource === 'ai' && <span title="Source: AI Fallback" className="text-purple-400"><BrainIcon /></span>}
                        </div>
                    </TableCell>
                    <TableCell>{formatCurrency(currentValue, 0)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                        {holding.dayChangeValue !== undefined ? (
                            <div className={dayPLColor}>{formatCurrency(dayPL, 0)}</div>
                        ) : (
                            <span className="text-gray-500">N/A</span>
                        )}
                    </TableCell>
                    <TableCell>
                        <div className={totalPLColor}>{formatCurrency(totalGainLoss, 0)}</div>
                        {isFinite(totalGainLossPercent) && (
                        <div className={`text-xs ${totalPLColor}`}>
                            {totalGainLossPercent.toFixed(2)}%
                        </div>
                        )}
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => onTransactClick(holding)}
                                className="bg-blue-800/50 text-blue-300 hover:bg-blue-700/50 px-3 py-1 text-xs font-bold rounded-md transition-colors"
                            >
                                Transact
                            </button>
                            <button
                                onClick={() => onAnalyzeClick(holding.ticker)}
                                className="p-2 bg-purple-800/50 text-purple-300 rounded-md hover:bg-purple-700/50 transition-colors"
                                aria-label={`Analyze ${holding.ticker}`}
                                title="AI Analysis"
                            >
                                <BrainIcon />
                            </button>
                        </div>
                    </TableCell>
                </tr>
                {isExpanded && (
                    <tr className="bg-gray-900/50">
                        <td colSpan={9}>
                           <StockDetails 
                            overview={holding.overview} 
                            ticker={holding.ticker}
                            onAnalyzeClick={() => onAnalyzeClick(holding.ticker)}
                           />
                        </td>
                    </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PortfolioTable;