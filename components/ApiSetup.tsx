import React, { useState } from 'react';
import { addApiKey, getApiKeys } from '../services/apiKeyService';
import { BrainIcon } from './icons/BrainIcon';

interface ApiSetupProps {
    onKeysSaved: () => void;
}

const ApiSetup: React.FC<ApiSetupProps> = ({ onKeysSaved }) => {
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey.trim().length < 10) {
            setError('Please enter a valid Gemini API key.');
            return;
        }
        setError('');
        addApiKey(apiKey.trim());
        onKeysSaved();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col justify-center items-center p-4">
            <div className="bg-gray-800/50 border border-gray-700 p-8 rounded-lg max-w-2xl w-full text-center shadow-2xl">
                <div className="mx-auto bg-emerald-900/50 text-emerald-400 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <BrainIcon />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Application Setup</h1>
                <p className="text-lg mb-2 text-gray-300">A Google Gemini API key is required to power the AI features.</p>
                <p className="text-gray-400 mb-6">
                    Your key is stored securely in your browser's local storage and is never sent to any server other than Google's.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Google Gemini API key here"
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center font-mono"
                        autoFocus
                    />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button
                        type="submit"
                        className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-md hover:bg-emerald-500 transition-colors"
                    >
                        Save Key & Start Application
                    </button>
                </form>
                 <p className="text-xs text-gray-500 mt-6">
                    You can obtain a free API key from Google AI Studio. You can add more keys or manage this one later in the application settings.
                </p>
            </div>
        </div>
    );
};

export default ApiSetup;
