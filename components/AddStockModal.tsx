import React, { useState } from 'react';
import { PortfolioHolding } from '../types';
import { parseBulkAddInput } from '../services/portfolioService';
import { CloseIcon } from './icons/CloseIcon';

interface AddStockModalProps {
  onClose: () => void;
  onAdd: (holdings: PortfolioHolding[], isUpdate?: boolean) => void;
}

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
);

const AddStockModal: React.FC<AddStockModalProps> = ({ onClose, onAdd }) => {
  const [tab, setTab] = useState<'single' | 'bulk'>('single');
  const [error, setError] = useState<string | null>(null);

  // State for single entry
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // State for bulk entry
  const [bulkInput, setBulkInput] = useState('');
  
  const handleSingleSubmit = () => {
    if (!ticker || !quantity || !price || !date) {
        setError('All fields are required for single entry.');
        return;
    }
    const holdingText = `${ticker} ${quantity} ${price} ${date}`;
    try {
        const newHolding = parseBulkAddInput(holdingText);
        if (newHolding.length === 0) {
            setError('Invalid data. Please check your inputs.');
            return;
        }
        onAdd(newHolding);
        onClose();
    } catch(err) {
        setError('Failed to process entry.');
    }
  };

  const handleBulkSubmit = () => {
     if (!bulkInput.trim()) {
      setError('Input cannot be empty for bulk import.');
      return;
    }
    try {
      const newHoldings = parseBulkAddInput(bulkInput);
      if (newHoldings.length === 0) {
        setError('No valid holdings found. Please check the format.');
        return;
      }
      onAdd(newHoldings);
      onClose();
    } catch (err) {
      setError('Failed to parse input. Please ensure the format is correct.');
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (tab === 'single') {
        handleSingleSubmit();
    } else {
        handleBulkSubmit();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-stock-modal-title"
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg p-6 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="add-stock-modal-title" className="text-2xl font-bold text-white">Add Holdings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-800 rounded-lg mb-6">
            <TabButton active={tab === 'single'} onClick={() => setTab('single')}>Single Entry</TabButton>
            <TabButton active={tab === 'bulk'} onClick={() => setTab('bulk')}>Bulk Import</TabButton>
        </div>
        
        <form onSubmit={handleSubmit}>
          {tab === 'single' ? (
            <div className="space-y-4">
                <div>
                    <label htmlFor="ticker" className="block text-sm font-medium text-gray-300 mb-1">Ticker Symbol</label>
                    <input id="ticker" type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., MEBL" autoFocus/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                        <input id="quantity" type="text" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., 100" />
                    </div>
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1">Buy Price (Rs.)</label>
                        <input id="price" type="text" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., 250.75"/>
                    </div>
                </div>
                 <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">Purchase Date</label>
                    <input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
            </div>
          ) : (
            <div>
                 <p className="text-gray-400 mb-2">
                    Enter each holding on a new line. You can add to existing holdings or add new ones.
                </p>
                <p className="text-sm text-gray-500 mb-4 bg-gray-800 p-2 rounded-md">
                    Format: <code className="font-mono">TICKER QUANTITY PRICE [DATE]</code> (Date is optional, defaults to today)
                </p>
                <textarea
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder={`AIRLINK 500 70.20 2024-01-15\nEFERT 200 112.50\nMTL 150 980.00`}
                    className="w-full h-48 bg-gray-800 border border-gray-600 rounded-md px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow resize-y font-mono"
                    aria-label="Stock input area"
                    autoFocus
                />
            </div>
          )}

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <div className="mt-6 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-md hover:bg-emerald-500 transition-colors"
            >
              Add to Portfolio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockModal;
