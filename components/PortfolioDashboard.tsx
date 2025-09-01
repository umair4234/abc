import React from 'react';
import { PortfolioMetrics } from '../types';
import { RefreshIcon } from './icons/RefreshIcon';

interface PortfolioDashboardProps {
  metrics: PortfolioMetrics;
  onRefresh: () => void;
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value).replace('PKR', 'Rs.');
};

const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
}

const MetricCard: React.FC<{ title: string; value: string; subValue?: string, colorClass?: string }> = ({ title, value, subValue, colorClass = 'text-white' }) => (
  <div className="bg-gray-800/50 p-4 rounded-lg">
    <p className="text-sm text-gray-400 mb-1">{title}</p>
    <p className={`text-2xl font-semibold ${colorClass}`}>{value}</p>
    {subValue && <p className={`text-sm font-medium ${colorClass}`}>{subValue}</p>}
  </div>
);

const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({ metrics, onRefresh, isLoading }) => {
    const totalGainLossColor = metrics.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400';
    const dayGainLossColor = metrics.dayGainLoss >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Portfolio Overview</h2>
            <button
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 bg-gray-700 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
                aria-label="Refresh stock prices"
            >
                {isLoading ? (
                    <div className="animate-spin"><RefreshIcon /></div>
                ) : (
                    <RefreshIcon />
                )}
                {isLoading ? 'Refreshing...' : 'Refresh Prices'}
            </button>
        </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Current Value" value={formatCurrency(metrics.currentValue)} />
        <MetricCard title="Total Investment" value={formatCurrency(metrics.totalInvestment)} />
        <MetricCard title="Total Dividends" value={formatCurrency(metrics.totalDividends)} colorClass="text-blue-400"/>
        <MetricCard 
            title="Total Gain/Loss" 
            value={formatCurrency(metrics.totalGainLoss)} 
            subValue={formatPercent(metrics.totalGainLossPercent)}
            colorClass={totalGainLossColor}
        />
        <MetricCard 
            title="Day's Gain/Loss" 
            value={formatCurrency(metrics.dayGainLoss)} 
            subValue={formatPercent(metrics.dayGainLossPercent)}
            colorClass={dayGainLossColor}
        />
      </div>
    </div>
  );
};

export default PortfolioDashboard;