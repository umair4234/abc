import React, { useState } from 'react';
import { SectorAllocationData } from '../types';

interface PortfolioAllocationProps {
  data: SectorAllocationData[];
}

const COLORS = [
  '#10b981', '#3b82f6', '#ef4444', '#f97316', '#8b5cf6', 
  '#eab308', '#ec4899', '#14b8a6', '#6366f1', '#d946ef'
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value).replace('PKR', 'Rs.');
};


const DonutChart: React.FC<{ data: SectorAllocationData[], hoveredSector: string | null, onHover: (sector: string | null) => void }> = ({ data, hoveredSector, onHover }) => {
    const cx = 50;
    const cy = 50;
    const radius = 40;
    const strokeWidth = 20;

    let accumulatedPercent = 0;

    const getArcPath = (startAngle: number, endAngle: number) => {
        const start = {
            x: cx + radius * Math.cos(startAngle),
            y: cy + radius * Math.sin(startAngle)
        };
        const end = {
            x: cx + radius * Math.cos(endAngle),
            y: cy + radius * Math.sin(endAngle)
        };
        const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
    };

  return (
    <svg viewBox="0 0 100 100" className="w-48 h-48 transform -rotate-90">
      {data.map((item, index) => {
        const startAngle = (accumulatedPercent / 100) * 2 * Math.PI;
        const sliceAngle = (item.percentage / 100) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        const isHovered = item.name === hoveredSector;

        accumulatedPercent += item.percentage;

        return (
          <path
            key={item.name}
            d={getArcPath(startAngle, endAngle)}
            fill="none"
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
            className={`transition-all duration-300 ease-out origin-center`}
            onMouseEnter={() => onHover(item.name)}
            onMouseLeave={() => onHover(null)}
          />
        );
      })}
    </svg>
  );
};

const PortfolioAllocation: React.FC<PortfolioAllocationProps> = ({ data }) => {
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);

  if (data.length === 0) {
    return (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 flex items-center justify-center h-full min-h-[400px]">
            <p className="text-gray-500 text-center">No allocation data available. Add holdings and refresh prices.</p>
        </div>
    );
  }

  const hoveredSectorData = hoveredSector ? data.find(d => d.name === hoveredSector) : null;

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
      <div className="flex flex-col items-center">
        <DonutChart data={data} hoveredSector={hoveredSector} onHover={setHoveredSector}/>
        <div className="mt-6 w-full space-y-2">
          {data.map((item, index) => (
            <div 
                key={item.name} 
                className="flex justify-between items-center text-sm p-1 rounded-md transition-colors"
                onMouseEnter={() => setHoveredSector(item.name)}
                onMouseLeave={() => setHoveredSector(null)}
                style={{ backgroundColor: hoveredSector === item.name ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-gray-300 truncate pr-2" title={item.name}>{item.name}</span>
              </div>
              <span className="font-semibold text-white">{item.percentage.toFixed(2)}%</span>
            </div>
          ))}
        </div>
        {hoveredSectorData && (
            <div className="mt-4 w-full bg-gray-800/50 p-3 rounded-lg border border-gray-700 animate-fade-in">
                <h4 className="font-bold text-white text-sm mb-2">Sector Details: {hoveredSectorData.name}</h4>
                <div className="text-xs text-gray-400 mb-2 flex justify-between">
                    <span>Total Invested:</span>
                    <span className="font-semibold text-gray-200">{formatCurrency(hoveredSectorData.investmentValue)}</span>
                </div>
                <ul className="text-xs space-y-1">
                    {hoveredSectorData.holdings.map(stock => (
                        <li key={stock.ticker} className="flex justify-between text-gray-400">
                           <span>{stock.ticker}</span>
                           <span>{stock.quantity.toLocaleString()} units</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioAllocation;
