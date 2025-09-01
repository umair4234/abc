import React, { useState, useMemo, useRef, useCallback } from 'react';
import { PortfolioSnapshot } from '../types';

interface PortfolioGraphProps {
  data: PortfolioSnapshot[];
}

const PADDING = { top: 20, right: 20, bottom: 40, left: 60 };
const SVG_WIDTH = 600;
const SVG_HEIGHT = 300;

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1e6) {
        return `Rs. ${(value / 1e6).toFixed(2)}M`;
    }
     if (Math.abs(value) >= 1e3) {
        return `Rs. ${(value / 1e3).toFixed(1)}K`;
    }
    return `Rs. ${value.toFixed(0)}`;
}

const PortfolioGraph: React.FC<PortfolioGraphProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; value: number } | null>(null);

  const processedData = useMemo(() => {
    if (data.length < 2) return [];
    return data.map(d => ({ ...d, date: new Date(d.date) })).sort((a,b) => a.date.getTime() - b.date.getTime());
  }, [data]);

  const { xScale, yScale, linePath, areaPath, yAxisTicks } = useMemo(() => {
    if (processedData.length < 2) return { yAxisTicks: [] };

    const minDate = processedData[0].date;
    const maxDate = processedData[processedData.length - 1].date;
    const values = processedData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    const yRange = maxValue - minValue;
    const yMin = Math.max(0, minValue - yRange * 0.1);
    const yMax = maxValue + yRange * 0.1;
    
    const xScale = (date: Date) => PADDING.left + ((date.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * (SVG_WIDTH - PADDING.left - PADDING.right);
    const yScale = (value: number) => PADDING.top + (1 - (value - yMin) / (yMax - yMin)) * (SVG_HEIGHT - PADDING.top - PADDING.bottom);

    const lineGenerator = (d: { date: Date, value: number}) => `${xScale(d.date)},${yScale(d.value)}`;
    const linePath = "M" + processedData.map(lineGenerator).join("L");

    const areaPath = linePath + ` V ${yScale(yMin)} L ${xScale(minDate)} ${yScale(yMin)} Z`;
    
    const numTicks = 5;
    const tickIncrement = (yMax - yMin) / (numTicks - 1);
    const yAxisTicks = Array.from({ length: numTicks }, (_, i) => yMin + i * tickIncrement);

    return { xScale, yScale, linePath, areaPath, yAxisTicks };
  }, [processedData]);

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || processedData.length < 2 || !xScale || !yScale) return;

    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const { x } = point.matrixTransform(svg.getScreenCTM()?.inverse());
    
    let closestPoint = processedData[0];
    let minDistance = Math.abs(xScale(closestPoint.date) - x);

    for(let i = 1; i < processedData.length; i++) {
        const dist = Math.abs(xScale(processedData[i].date) - x);
        if (dist < minDistance) {
            minDistance = dist;
            closestPoint = processedData[i];
        }
    }

    setTooltip({
      x: xScale(closestPoint.date),
      y: yScale(closestPoint.value),
      date: closestPoint.date.toISOString(),
      value: closestPoint.value
    });
  }, [processedData, xScale, yScale]);

  const handleMouseLeave = () => {
    setTooltip(null);
  };
  
  if (data.length < 2) {
    return (
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-gray-500 text-center">
            Not enough data for a graph. Refresh your portfolio on different days to track performance.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 relative">
      <svg ref={svgRef} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
            </linearGradient>
        </defs>
        
        {/* Y-Axis Grid Lines and Labels */}
        {yAxisTicks?.map((tick, i) => (
            <g key={i}>
                <line x1={PADDING.left} x2={SVG_WIDTH - PADDING.right} y1={yScale?.(tick)} y2={yScale?.(tick)} stroke="#4a5568" strokeDasharray="2,2" />
                <text x={PADDING.left - 8} y={yScale?.(tick)} dy="0.32em" textAnchor="end" fill="#a0aec0" fontSize="10">
                    {formatCurrency(tick)}
                </text>
            </g>
        ))}
        
        {/* X-Axis Labels */}
        {processedData.map((d, i) => {
            if (i === 0 || i === processedData.length -1 || i % Math.ceil(processedData.length / 6) === 0) {
                 return (
                    <text key={i} x={xScale?.(d.date)} y={SVG_HEIGHT - PADDING.bottom + 15} textAnchor="middle" fill="#a0aec0" fontSize="10">
                        {formatDate(d.date.toISOString())}
                    </text>
                 )
            }
            return null;
        })}

        {/* Area and Line */}
        <path d={areaPath} fill="url(#areaGradient)" />
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" />
        
        {/* Tooltip */}
        {tooltip && (
            <g>
                <line x1={tooltip.x} y1={PADDING.top} x2={tooltip.x} y2={SVG_HEIGHT - PADDING.bottom} stroke="#a0aec0" strokeDasharray="3,3" />
                <circle cx={tooltip.x} cy={tooltip.y} r="4" fill="#10b981" stroke="#0d1117" strokeWidth="2" />
            </g>
        )}
      </svg>
      {tooltip && (
         <div className="absolute p-2 text-xs bg-gray-800 border border-gray-600 rounded-md shadow-lg pointer-events-none" 
              style={{ top: `${tooltip.y - 50}px`, left: `${tooltip.x + 10}px`, transform: `translateY(-50%)`}}>
              <div className="font-bold text-white">{formatCurrency(tooltip.value)}</div>
              <div className="text-gray-400">{formatDate(tooltip.date)}</div>
         </div>
      )}
    </div>
  );
};

export default PortfolioGraph;
