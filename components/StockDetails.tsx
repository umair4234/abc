import React from 'react';
import { OverviewData } from '../types';

interface StockDetailsProps {
    overview?: OverviewData;
}

const StockDetails: React.FC<StockDetailsProps> = ({ overview }) => {
    if (!overview || Object.keys(overview).length === 0) {
        return (
            <div className="p-4 text-center text-sm text-gray-500 bg-gray-800/30">
                No additional details available for this holding.
            </div>
        );
    }
    
    return (
        <div className="p-4 bg-gray-800/30">
            <h4 className="text-md font-semibold text-white mb-3">Key Information</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Object.entries(overview).map(([key, value]) => (
                    <div key={key}>
                        <p className="text-xs text-gray-400">{key}</p>
                        <p className="text-sm font-medium text-white">{value ?? 'N/A'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StockDetails;
