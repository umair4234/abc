import React from 'react';
import { AnalysisReport } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import { generateReportHtml } from '../utils/reportFormatter';
import { TrendUpIcon } from './icons/TrendUpIcon';
import { TrendDownIcon } from './icons/TrendDownIcon';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string | null;
  report: AnalysisReport | null;
  isLoading: boolean;
  error: string | null;
}

const getRecommendationClass = (action: string) => {
    const actionUpper = action.toUpperCase();
    if (actionUpper.includes('BUY')) return 'text-green-400';
    if (actionUpper.includes('SELL') || actionUpper.includes('REDUCE')) return 'text-red-400';
    if (actionUpper.includes('HOLD')) return 'text-yellow-400';
    return 'text-gray-400';
}

const TrendIcon: React.FC<{trend?: 'up' | 'down' | 'flat'}> = ({ trend }) => {
    if (trend === 'up') return <TrendUpIcon className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendDownIcon className="w-4 h-4 text-red-500" />;
    return null;
}

const Metric: React.FC<{
    label: string, 
    value: string | number | null | undefined, 
    trend?: 'up' | 'down' | 'flat',
    comparison?: string | null
}> = ({ label, value, trend, comparison }) => (
    <div className="bg-gray-800/50 p-3 rounded-lg text-center">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <div className="flex items-center justify-center gap-1">
            <p className="text-lg font-semibold text-white">{value ?? 'N/A'}</p>
            <TrendIcon trend={trend} />
        </div>
        {comparison && <p className="text-xs text-gray-500 truncate" title={comparison}>{comparison}</p>}
    </div>
);

const ReasonPill: React.FC<{ children: React.ReactNode, type: 'buy' | 'risk', impact?: 'High' | 'Medium' | 'Low'}> = ({ children, type, impact }) => {
    const baseClass = "px-3 py-1 text-xs font-medium rounded-full inline-block";
    let typeClass = "bg-gray-700 text-gray-300";
    if(type === 'buy') {
        typeClass = "bg-green-900/50 text-green-300";
    } else if (type === 'risk' && impact) {
        if(impact === 'High') typeClass = "bg-red-900/50 text-red-300";
        if(impact === 'Medium') typeClass = "bg-yellow-900/50 text-yellow-300";
        if(impact === 'Low') typeClass = "bg-gray-800 border border-gray-600 text-gray-400";
    }
    return <span className={`${baseClass} ${typeClass}`}>{impact && `[${impact}] `}{children}</span>
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, ticker, report, isLoading, error }) => {
  if (!isOpen) return null;

  const handleViewFullReport = () => {
    if(!report) return;
    const reportHtml = generateReportHtml(report);
    const newWindow = window.open();
    if (newWindow) {
        newWindow.document.write(reportHtml);
        newWindow.document.close();
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
            <Loader />
            <p className="mt-4 text-lg text-gray-300">AI is performing deep research...</p>
            <p className="text-sm text-gray-500">This may take a moment. Please wait.</p>
        </div>
      );
    }

    if (error) {
      return <div className="py-8"><ErrorMessage message={error} /></div>;
    }

    if (report) {
      const { recommendation, score, key_metrics, top_reasons_buy, weighted_risks } = report;
      return (
         <div className="animate-fade-in">
            <div className="text-center p-4 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400">Recommendation</p>
                <h3 className={`text-3xl font-bold my-1 ${getRecommendationClass(recommendation.action)}`}>
                    {recommendation.action}
                </h3>
                <p className="text-sm text-gray-400">
                    Overall Score: <span className="font-semibold text-white">{score.overall_score}/100</span>
                    <span className="mx-2">|</span>
                    Confidence: <span className="font-semibold text-white">{recommendation.confidence_pct}%</span>
                </p>
                 {recommendation.confidence_rationale && <p className="text-xs text-gray-500 mt-2 italic">"{recommendation.confidence_rationale}"</p>}
                <p className="text-xs text-gray-300 mt-3">{recommendation.rationale_short}</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
                <Metric label="P/E (TTM)" value={key_metrics.PE_TTM?.value?.toFixed(2)} trend={key_metrics.PE_TTM?.trend} comparison={key_metrics.PE_TTM.peer_comparison_text} />
                <Metric label="P/B" value={key_metrics.P_B?.value?.toFixed(2)} trend={key_metrics.P_B?.trend} comparison={key_metrics.P_B.peer_comparison_text} />
                <Metric label="ROE (TTM)" value={key_metrics.ROE_TTM?.value ? `${key_metrics.ROE_TTM.value.toFixed(2)}%` : null} trend={key_metrics.ROE_TTM?.trend} comparison={key_metrics.ROE_TTM.peer_comparison_text} />
                <Metric label="Div. Yield" value={key_metrics.Dividend_Yield_TTM?.value ? `${key_metrics.Dividend_Yield_TTM.value.toFixed(2)}%` : null} trend={key_metrics.Dividend_Yield_TTM?.trend} comparison={key_metrics.Dividend_Yield_TTM.peer_comparison_text} />
            </div>

            <div className="space-y-3">
                <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Top Reasons to Buy</h4>
                    <div className="flex flex-wrap gap-2">
                        {top_reasons_buy.map(r => <ReasonPill key={r} type="buy">{r}</ReasonPill>)}
                    </div>
                </div>
                 <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Weighted Risks</h4>
                    <div className="flex flex-wrap gap-2">
                        {weighted_risks.map(r => <ReasonPill key={r.description} type="risk" impact={r.impact}>{r.description}</ReasonPill>)}
                    </div>
                </div>
            </div>
            
         </div>
      );
    }

    return null;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-modal-title"
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl p-6 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="analysis-modal-title" className="text-2xl font-bold text-white">AI Analysis: {ticker}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>
        
        <div className="max-h-[70vh] overflow-y-auto pr-2">
            {renderContent()}
        </div>

        <div className="mt-6 flex justify-between items-center">
            <p className="text-xs text-gray-500">
                AI-generated analysis. Not financial advice.
            </p>
             <div className="flex gap-4">
                <button
                type="button"
                onClick={onClose}
                className="bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                >
                Close
                </button>
                <button
                type="button"
                onClick={handleViewFullReport}
                disabled={!report}
                className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-md hover:bg-emerald-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                View Full Report
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;