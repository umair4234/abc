import React, { useState, useEffect } from 'react';
import { PortfolioHolding, TransactionPayload } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface TransactionModalProps {
  holding: PortfolioHolding;
  onClose: () => void;
  onConfirm: (payload: TransactionPayload) => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ holding, onClose, onConfirm }) => {
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL' | 'UPDATE' | 'DIVIDEND'>('BUY');
  
  // State for BUY/SELL
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [buyDate, setBuyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // State for UPDATE
  const [totalQuantity, setTotalQuantity] = useState<string>('');
  const [averagePrice, setAveragePrice] = useState<string>('');

  // State for DIVIDEND
  const [dividendAmount, setDividendAmount] = useState<string>('');
  const [dividendDate, setDividendDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (holding.currentPrice) {
      setPrice(holding.currentPrice.toString());
    }
    setTotalQuantity(holding.quantity.toString());
    setAveragePrice(holding.averageBuyPrice.toString());
  }, [holding]);

  const handleNumericInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
        setter(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let payload: TransactionPayload | null = null;

    if (transactionType === 'BUY' || transactionType === 'SELL') {
      const numQuantity = parseFloat(quantity);
      const numPrice = parseFloat(price);
      if (isNaN(numQuantity) || numQuantity <= 0) {
        setError('Please enter a valid transaction quantity.'); return;
      }
      if (isNaN(numPrice) || numPrice <= 0) {
        setError('Please enter a valid price.'); return;
      }
      if (transactionType === 'SELL' && numQuantity > holding.quantity) {
        setError(`Cannot sell more than you own (${holding.quantity.toLocaleString()} units).`); return;
      }
      if (transactionType === 'BUY') {
        payload = { type: 'BUY', ticker: holding.ticker, quantity: numQuantity, price: numPrice, date: buyDate };
      } else {
        payload = { type: 'SELL', ticker: holding.ticker, quantity: numQuantity, price: numPrice };
      }

    } else if (transactionType === 'UPDATE') {
      const numTotalQuantity = parseFloat(totalQuantity);
      const numAveragePrice = parseFloat(averagePrice);
       if (isNaN(numTotalQuantity) || numTotalQuantity < 0) {
        setError('Please enter a valid total quantity.'); return;
      }
       if (isNaN(numAveragePrice) || numAveragePrice <= 0) {
        setError('Please enter a valid average price.'); return;
      }
      payload = { type: 'UPDATE', ticker: holding.ticker, totalQuantity: numTotalQuantity, averagePrice: numAveragePrice };
    } else if (transactionType === 'DIVIDEND') {
        const numAmount = parseFloat(dividendAmount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Please enter a valid dividend amount.'); return;
        }
        if (!dividendDate) {
            setError('Please select a valid date for the dividend.'); return;
        }
        payload = { type: 'DIVIDEND', ticker: holding.ticker, amount: numAmount, date: dividendDate };
    }
    
    if (payload) {
      onConfirm(payload);
    }
  };
  
  const TabButton: React.FC<{active: boolean, onClick: () => void, children: React.ReactNode}> = ({ active, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-full py-2.5 text-sm font-semibold rounded-md transition-colors ${
            active ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
    >
        {children}
    </button>
  )

  const confirmButtonColor = transactionType === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500' 
      : transactionType === 'SELL' ? 'bg-red-600 hover:bg-red-500' 
      : transactionType === 'DIVIDEND' ? 'bg-blue-600 hover:bg-blue-500'
      : 'bg-indigo-600 hover:bg-indigo-500';

  const renderContent = () => {
    switch(transactionType) {
        case 'BUY':
        case 'SELL':
            return (
                <div>
                    <p className="text-gray-400 mb-4">You currently own <span className="font-bold text-white">{holding.quantity.toLocaleString()}</span> units.</p>
                    <div className="mb-4">
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                        <input id="quantity" type="text" value={quantity} onChange={handleNumericInputChange(setQuantity)} placeholder="e.g., 100" className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" autoFocus />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1">Price per Unit (Rs.)</label>
                        <input id="price" type="text" value={price} onChange={handleNumericInputChange(setPrice)} placeholder="e.g., 260.50" className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    {transactionType === 'BUY' && (
                        <div className="mb-4">
                            <label htmlFor="buyDate" className="block text-sm font-medium text-gray-300 mb-1">Transaction Date</label>
                            <input id="buyDate" type="date" value={buyDate} onChange={e => setBuyDate(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                    )}
                </div>
            );
        case 'UPDATE':
             return (
                <div>
                    <p className="text-sm text-gray-400 mb-4 bg-gray-800/60 p-3 rounded-md">Directly set the total shares and average cost for this holding. This will replace its existing transaction history.</p>
                    <div className="mb-4">
                        <label htmlFor="totalQuantity" className="block text-sm font-medium text-gray-300 mb-1">Total Quantity</label>
                        <input id="totalQuantity" type="text" value={totalQuantity} onChange={handleNumericInputChange(setTotalQuantity)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="averagePrice" className="block text-sm font-medium text-gray-300 mb-1">New Average Price (Rs.)</label>
                        <input id="averagePrice" type="text" value={averagePrice} onChange={handleNumericInputChange(setAveragePrice)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                </div>
            );
        case 'DIVIDEND':
            return (
                <div>
                    <p className="text-sm text-gray-400 mb-4 bg-gray-800/60 p-3 rounded-md">Record a cash dividend received for this holding. This will be added to your total returns.</p>
                     <div className="mb-4">
                        <label htmlFor="dividendAmount" className="block text-sm font-medium text-gray-300 mb-1">Total Dividend Amount (Rs.)</label>
                        <input id="dividendAmount" type="text" value={dividendAmount} onChange={handleNumericInputChange(setDividendAmount)} placeholder="e.g., 5000" className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="dividendDate" className="block text-sm font-medium text-gray-300 mb-1">Date Received</label>
                        <input id="dividendDate" type="date" value={dividendDate} onChange={e => setDividendDate(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
            );
        default: return null;
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-modal-title"
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-md p-6 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="transaction-modal-title" className="text-2xl font-bold text-white">Transact {holding.ticker}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-2 p-1 bg-gray-800 rounded-lg mb-6">
            <TabButton active={transactionType === 'BUY'} onClick={() => setTransactionType('BUY')}>Buy</TabButton>
            <TabButton active={transactionType === 'SELL'} onClick={() => setTransactionType('SELL')}>Sell</TabButton>
            <TabButton active={transactionType === 'DIVIDEND'} onClick={() => setTransactionType('DIVIDEND')}>Dividend</TabButton>
            <TabButton active={transactionType === 'UPDATE'} onClick={() => setTransactionType('UPDATE')}>Update</TabButton>
        </div>

        <form onSubmit={handleSubmit}>
          {renderContent()}

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button type="submit" className={`${confirmButtonColor} text-white font-bold py-2 px-4 rounded-md transition-colors`}>
              Confirm {transactionType.charAt(0) + transactionType.slice(1).toLowerCase()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
