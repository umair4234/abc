import { AnalysisReport } from '../types';

const formatCurrency = (value: number | null | undefined, currency: string = 'PKR') => {
  if (value === null || typeof value === 'undefined') return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number | null | undefined, suffix: string = '', digits = 2) => {
    if (value === null || typeof value === 'undefined') return 'N/A';
    return `${value.toFixed(digits)}${suffix}`;
}

const getRiskColor = (impact: 'High' | 'Medium' | 'Low') => {
    switch(impact) {
        case 'High': return 'border-red-500 bg-red-900/30';
        case 'Medium': return 'border-yellow-500 bg-yellow-900/30';
        case 'Low': return 'border-gray-600 bg-gray-800/50';
    }
}

export const generateReportHtml = (report: AnalysisReport): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fundamental Analysis Report: ${report.ticker}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { 
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
                background-color: #111827; /* gray-900 */
                color: #d1d5db; /* gray-300 */
            }
            .container { max-width: 800px; margin: auto; padding: 2rem; }
            h1, h2, h3 { color: #ffffff; font-weight: bold; }
            h1 { font-size: 2.25rem; line-height: 2.5rem; margin-bottom: 0.5rem; }
            h2 { font-size: 1.5rem; line-height: 2rem; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid #374151; padding-bottom: 0.5rem; }
            h3 { font-size: 1.25rem; line-height: 1.75rem; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #9ca3af; }
            p { margin-bottom: 1rem; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
            th, td { text-align: left; padding: 0.75rem; border: 1px solid #374151; }
            th { background-color: #1f2937; color: #9ca3af; }
            .metric-card { background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; padding: 1rem; text-align: center; }
            .score-bar { background-color: #374151; border-radius: 9999px; overflow: hidden; height: 1.5rem; }
            .score-fill { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: bold; color: white; }
            @media print {
              body { background-color: #ffffff; color: #000000; }
              h1, h2, h3 { color: #000000; }
              th { background-color: #f3f4f6; color: #374151; }
              .metric-card, th, td { border-color: #d1d5db; }
              .score-fill { color: black; }
              .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Fundamental Analysis: ${report.company_name} (${report.ticker})</h1>
            <p class="text-sm text-gray-400">Report as of: ${new Date(report.as_of_date).toLocaleString()}</p>

            <h2>Executive Summary</h2>
            <p>${report.executive_summary || 'No summary provided.'}</p>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
                <div class="metric-card">
                    <div class="text-sm text-gray-400">Recommendation</div>
                    <div class="text-2xl font-bold text-white">${report.recommendation.action}</div>
                </div>
                <div class="metric-card">
                    <div class="text-sm text-gray-400">Overall Score</div>
                    <div class="text-2xl font-bold text-white">${report.score.overall_score}/100</div>
                </div>
                 <div class="metric-card">
                    <div class="text-sm text-gray-400">Confidence</div>
                    <div class="text-2xl font-bold text-white">${report.recommendation.confidence_pct}%</div>
                </div>
                 <div class="metric-card">
                    <div class="text-sm text-gray-400">Last Price</div>
                    <div class="text-2xl font-bold text-white">${formatCurrency(report.last_price.value)}</div>
                </div>
            </div>

            <h2>Key Metrics</h2>
            <table>
                <thead>
                    <tr><th>Metric</th><th>Value</th><th>Peer Median</th><th>Peer Comparison</th></tr>
                </thead>
                <tbody>
                    <tr><td>P/E (TTM)</td><td>${formatNumber(report.key_metrics.PE_TTM.value)}</td><td>${formatNumber(report.key_metrics.PE_TTM.peer_median)}</td><td>${report.key_metrics.PE_TTM.peer_comparison_text || 'N/A'}</td></tr>
                    <tr><td>Price to Book (P/B)</td><td>${formatNumber(report.key_metrics.P_B.value)}</td><td>${formatNumber(report.key_metrics.P_B.peer_median)}</td><td>${report.key_metrics.P_B.peer_comparison_text || 'N/A'}</td></tr>
                    <tr><td>Return on Equity (ROE TTM)</td><td>${formatNumber(report.key_metrics.ROE_TTM.value, '%')}</td><td>${formatNumber(report.key_metrics.ROE_TTM.peer_median, '%')}</td><td>${report.key_metrics.ROE_TTM.peer_comparison_text || 'N/A'}</td></tr>
                    <tr><td>Dividend Yield (TTM)</td><td>${formatNumber(report.key_metrics.Dividend_Yield_TTM.value, '%')}</td><td>${formatNumber(report.key_metrics.Dividend_Yield_TTM.peer_median, '%')}</td><td>${report.key_metrics.Dividend_Yield_TTM.peer_comparison_text || 'N/A'}</td></tr>
                    <tr><td>Market Cap (PKR)</td><td colspan="2">${formatCurrency(report.market_cap.pkr)}</td><td>-</td></tr>
                </tbody>
            </table>

            <h2>Weighted Risks</h2>
            <div class="space-y-3">
                ${report.weighted_risks.map(risk => `
                    <div class="border-l-4 p-4 rounded-r-lg ${getRiskColor(risk.impact)}">
                        <strong class="font-bold text-white">${risk.impact} Impact:</strong>
                        <span class="text-gray-300">${risk.description}</span>
                    </div>
                `).join('')}
            </div>

            <h2>Analysis Score Breakdown</h2>
            <div class="space-y-4 my-6">
                ${Object.entries(report.score).filter(([key]) => key !== 'overall_score').map(([key, value]) => `
                    <div>
                        <div class="flex justify-between mb-1">
                            <span class="text-base font-medium capitalize text-white">${key.replace(/_/g, ' ')}</span>
                            <span class="text-sm font-medium text-white">${value}/100</span>
                        </div>
                        <div class="score-bar">
                            <div class="score-fill bg-emerald-600" style="width: ${value}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <h2>Detailed Analysis</h2>
            <h3>Financial Health</h3><p>${report.financial_health_details || 'Not available.'}</p>
            <h3>Profitability</h3><p>${report.profitability_details || 'Not available.'}</p>
            <h3>Growth</h3><p>${report.growth_details || 'Not available.'}</p>
            <h3>Valuation</h3><p>${report.valuation_details || 'Not available.'}</p>
            <h3>Cash Flow</h3><p>${report.cash_flow_details || 'Not available.'}</p>
            <h3>Historical Valuation</h3><p>${report.historical_valuation_details || 'Not available.'}</p>
            <h3>Forward Guidance</h3><p>${report.forward_guidance_details || 'Not available.'}</p>
            <h3>Governance & News</h3><p>${report.governance_details || 'Not available.'}</p>
            <h3>Macro & Industry Factors</h3><p>${report.macro_industry_factors || 'Not available.'}</p>
            
            ${report.visual_data_summary ? `
            <h2>Visual Data Summary</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="metric-card"><h3>Profit Trend</h3><p class="text-gray-300">${report.visual_data_summary.profit_trend_comment}</p></div>
                <div class="metric-card"><h3>ROE vs Peers</h3><p class="text-gray-300">${report.visual_data_summary.roe_vs_peers_comment}</p></div>
                <div class="metric-card"><h3>Dividend History</h3><p class="text-gray-300">${report.visual_data_summary.dividend_history_comment}</p></div>
            </div>
            ` : ''}
            
            ${report.extra_sections ? `
            <h2>Extra Sections</h2>
            ${report.extra_sections.esg_governance ? `<h3>ESG & Governance</h3><p>${report.extra_sections.esg_governance}</p>` : ''}
            ${report.extra_sections.stress_test ? `<h3>Stress Test Scenario</h3><p>${report.extra_sections.stress_test}</p>` : ''}
            ${report.extra_sections.action_plan ? `<h3>Action Plan</h3><p>${report.extra_sections.action_plan}</p>` : ''}
            ` : ''}

            <h2>Sources</h2>
            <ul class="list-disc list-inside text-sm">
                ${report.raw_sources.map(s => `<li><a href="${s.url}" target="_blank" class="text-blue-400 hover:underline">${s.label} (${new Date(s.date).toLocaleDateString()})</a></li>`).join('')}
            </ul>

            <footer class="mt-8 text-center text-xs text-gray-500">
                <p>This report was generated by an AI assistant. It is intended for informational purposes only and does not constitute financial advice. Always conduct your own research before making investment decisions.</p>
                <button onclick="window.print()" class="no-print mt-4 bg-emerald-600 text-white font-bold py-2 px-4 rounded-md hover:bg-emerald-500">Print Report</button>
            </footer>
        </div>
    </body>
    </html>
  `;
};