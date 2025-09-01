import React, { useState, useEffect } from 'react';
import { OverviewData } from '../types';
import { BrainIcon } from './icons/BrainIcon';

interface StockDetailsProps {
    overview?: OverviewData;
    ticker: string;
    onAnalyzeClick: (ticker: string) => void;
}

const getRecommendationClass = (action: string) => {
    if(!action) return 'text-gray-400';
    const actionUpper = action.toUpperCase();
    if (actionUpper.includes('BUY')) return 'text-green-400';
    if (actionUpper.includes('SELL') || actionUpper.includes('REDUCE')) return 'text-red-400';
    if (actionUpper.includes('HOLD')) return 'text-yellow-400';
    return 'text-gray-400';
}

const StockDetails: React.FC<StockDetailsProps> = ({ overview, ticker, onAnalyzeClick }) => {
    const [analysisSummary, setAnalysisSummary] = useState<{ action: string; date: string } | null>(null);

    useEffect(() => {
        const cacheKey = `analysis_${ticker}`;
        const cachedItem = localStorage.getItem(cacheKey);
        if (cachedItem) {
            try {
                const { timestamp, report } = JSON.parse(cachedItem);
                if (report && report.recommendation) {
                    setAnalysisSummary({
                        action: report.recommendation.action,
                        date: new Date(timestamp).toLocaleDateString(),
                    });
                }
            } catch(e) {
                console.error("Failed to parse cached analysis", e);
            }
        }
    }, [ticker]);


    const hasOverviewData = overview && Object.keys(overview).length > 0;

    return (
        <div className="p-4 bg-gray-800/30 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                 <h4 className="text-md font-semibold text-white mb-3">Key Information</h4>
                {hasOverviewData ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {Object.entries(overview).map(([key, value]) => (
                            <div key={key}>
                                <p className="text-xs text-gray-400">{key}</p>
                                <p className="text-sm font-medium text-white truncate" title={String(value)}>{value ?? 'N/A'}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">
                        No additional details available for this holding.
                    </div>
                )}
            </div>
            <div className="border-t border-gray-700 md:border-t-0 md:border-l md:pl-6">
                 <h4 className="text-md font-semibold text-white mb-3">AI Analysis</h4>
                 {analysisSummary ? (
                    <div className="space-y-2">
                        <div>
                            <p className="text-xs text-gray-400">Last Recommendation</p>
                            <p className={`text-lg font-bold ${getRecommendationClass(analysisSummary.action)}`}>{analysisSummary.action}</p>
                        </div>
                         <div>
                            <p className="text-xs text-gray-400">As of</p>
                            <p className="text-sm font-medium text-white">{analysisSummary.date}</p>
                        </div>
                        <button 
                            onClick={() => onAnalyzeClick(ticker)}
                            className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 pt-2"
                        >
                            <BrainIcon /> Re-run Analysis
                        </button>
                    </div>
                 ) : (
                    <div>
                        <p className="text-sm text-gray-500">No analysis has been run for this stock yet.</p>
                         <button 
                            onClick={() => onAnalyzeClick(ticker)}
                            className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 pt-2"
                        >
                            <BrainIcon /> Run First Analysis
                        </button>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default StockDetails;