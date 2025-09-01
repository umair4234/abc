import React, { useState } from 'react';
import { PortfolioHolding, Transaction, BuySellTransaction, DividendTransaction } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface AllTransactionsHistoryProps {
    holdings: PortfolioHolding[];
}

const formatCurrency = (value: number, digits = 2) => {
    return `Rs. ${new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)}`;
};

const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
}

const getTypeClass = (type: Transaction['type']) => {
    switch(type) {
        case 'BUY': return 'text-green-400';
        case 'SELL': return 'text-red-400';
        case 'DIVIDEND': return 'text-blue-400';
        default: return 'text-gray-400';
    }
};

const AllTransactionsHistory: React.FC<AllTransactionsHistoryProps> = ({ holdings }) => {
    const [isVisible, setIsVisible] = useState(false);

    if (holdings.length === 0) {
        return null;
    }
    
    const allTransactions = holdings.flatMap(h => 
        h.transactions.map(t => ({...t, ticker: h.ticker}))
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg">
             <button
                onClick={() => setIsVisible(!isVisible)}
                className="w-full flex justify-between items-center p-4 text-left"
                aria-expanded={isVisible}
                aria-controls="transaction-history-content"
            >
                <h2 className="text-2xl font-bold text-white">Full Transaction History</h2>
                <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isVisible ? 'rotate-180' : ''}`} />
            </button>
            {isVisible && (
                <div id="transaction-history-content" className="p-4 border-t border-gray-700 overflow-x-auto">
                    {allTransactions.length > 0 ? (
                        <table className="min-w-full text-sm">
                            <thead className="text-left text-xs text-gray-400 uppercase">
                                <tr>
                                    <th className="p-2">Date</th>
                                    <th className="p-2">Ticker</th>
                                    <th className="p-2">Type</th>
                                    <th className="p-2 text-right">Quantity</th>
                                    <th className="p-2 text-right">Price</th>
                                    <th className="p-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {allTransactions.map(t => {
                                    const isBuySell = t.type === 'BUY' || t.type === 'SELL';
                                    const buySellTx = isBuySell ? (t as BuySellTransaction) : null;
                                    const dividendTx = t.type === 'DIVIDEND' ? (t as DividendTransaction) : null;
                                    
                                    return (
                                        <tr key={t.id}>
                                            <td className="p-2 whitespace-nowrap">{new Date(t.date).toLocaleDateString('en-CA')}</td>
                                            <td className="p-2 font-bold">{t.ticker}</td>
                                            <td className={`p-2 font-semibold ${getTypeClass(t.type)}`}>{t.type}</td>
                                            <td className="p-2 text-right whitespace-nowrap">{buySellTx ? formatNumber(buySellTx.quantity) : 'N/A'}</td>
                                            <td className="p-2 text-right whitespace-nowrap">{buySellTx ? formatCurrency(buySellTx.price) : 'N/A'}</td>
                                            <td className="p-2 text-right whitespace-nowrap">{formatCurrency(buySellTx ? buySellTx.cost : dividendTx!.amount, 0)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-500 text-center py-4">No transactions have been recorded yet.</p>
                    )}
                </div>
            )}
        </div>
    )
}

export default AllTransactionsHistory;
