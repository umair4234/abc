import React, { useState, useEffect } from 'react';
import * as apiKeyService from '../services/apiKeyService';
import { CloseIcon } from './icons/CloseIcon';

interface ApiKeyManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onKeysUpdated: () => void;
}

const ApiKeyManagerModal: React.FC<ApiKeyManagerModalProps> = ({ isOpen, onClose, onKeysUpdated }) => {
    const [keys, setKeys] = useState<string[]>([]);
    const [newKey, setNewKey] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setKeys(apiKeyService.getApiKeys());
            setNewKey('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const maskKey = (key: string) => {
        if (key.length <= 8) return '****';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };

    const handleAddKey = () => {
        if (newKey.trim().length < 10) {
            setError('Please enter a valid Gemini API key.');
            return;
        }
        if (keys.includes(newKey.trim())) {
             setError('This key has already been added.');
            return;
        }
        setError('');
        apiKeyService.addApiKey(newKey.trim());
        setKeys(apiKeyService.getApiKeys());
        setNewKey('');
        onKeysUpdated();
    };

    const handleRemoveKey = (index: number) => {
        apiKeyService.removeApiKey(index);
        const updatedKeys = apiKeyService.getApiKeys();
        setKeys(updatedKeys);
        onKeysUpdated();
        if(updatedKeys.length === 0) {
            onClose(); // Close modal if all keys are removed
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="api-key-modal-title"
        >
            <div
                className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg p-6 m-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 id="api-key-modal-title" className="text-2xl font-bold text-white">Manage API Keys</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close modal">
                        <CloseIcon />
                    </button>
                </div>

                <p className="text-gray-400 mb-4 text-sm">
                    Add multiple keys to automatically switch if one reaches its rate limit. Keys are stored in your browser.
                </p>

                <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-2">
                    {keys.length > 0 ? (
                        keys.map((key, index) => (
                            <div key={index} className="flex justify-between items-center bg-gray-800 p-3 rounded-md">
                                <span className="font-mono text-gray-300">{maskKey(key)}</span>
                                <button
                                    onClick={() => handleRemoveKey(index)}
                                    className="text-red-500 hover:text-red-400 text-xs font-semibold"
                                >
                                    Remove
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-4">No API keys have been added yet.</p>
                    )}
                </div>

                <div className="flex items-start gap-3">
                    <div className="flex-grow">
                         <input
                            type="password"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            placeholder="Add another Gemini API key"
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                         {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                    </div>
                    <button
                        onClick={handleAddKey}
                        className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-md hover:bg-emerald-500 transition-colors"
                    >
                        Add
                    </button>
                </div>

                 <div className="mt-6 flex justify-end">
                    <button
                    type="button"
                    onClick={onClose}
                    className="bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                    >
                    Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyManagerModal;