import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { SparklesIcon } from 'lucide-react';

// Mock data - replace with actual stock list and images
const AVAILABLE_STOCKS = [
  'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 
  'FB', 'NVDA', 'NFLX', 'INTC', 'CSCO'
];

const TradingStrategyApp = () => {
  const [stock1, setStock1] = useState('');
  const [stock2, setStock2] = useState('');
  const [aiInsight, setAiInsight] = useState('');

  const handleGenerateInsight = () => {
    setAiInsight(`Analyzing trading strategy for ${stock1} and ${stock2}...`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-6">
        Trading Strategy Analyzer
      </h1>

      {/* Stock Selection */}
      <div className="flex space-x-4 mb-6">
        <div className="w-1/2">
          <label className="block mb-2">First Stock</label>
          <Select onValueChange={setStock1} value={stock1}>
            <SelectTrigger>
              <SelectValue placeholder="Select First Stock" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_STOCKS.map(stock => (
                <SelectItem key={stock} value={stock}>
                  {stock}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-1/2">
          <label className="block mb-2">Second Stock</label>
          <Select onValueChange={setStock2} value={stock2}>
            <SelectTrigger>
              <SelectValue placeholder="Select Second Stock" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_STOCKS.map(stock => (
                <SelectItem key={stock} value={stock}>
                  {stock}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Trading Strategy Plots */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">Correlation Plot</h2>
            <img 
              src="/api/placeholder/500/300" 
              alt="Correlation Plot" 
              className="w-full h-72 object-cover"
            />
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">Price Movement</h2>
            <img 
              src="/api/placeholder/500/300" 
              alt="Price Movement Plot" 
              className="w-full h-72 object-cover"
            />
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">Strategy Performance</h2>
            <img 
              src="/api/placeholder/500/300" 
              alt="Strategy Performance" 
              className="w-full h-72 object-cover"
            />
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">Risk Analysis</h2>
            <img 
              src="/api/placeholder/500/300" 
              alt="Risk Analysis Plot" 
              className="w-full h-72 object-cover"
            />
          </div>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <SparklesIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold">AI Strategy Insights</h2>
          </div>
          <div className="min-h-[200px] p-4 bg-gray-50 rounded-lg">
            {aiInsight || 'Select two stocks to generate AI insights'}
          </div>
          <button 
            onClick={handleGenerateInsight}
            disabled={!stock1 || !stock2}
            className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg 
                       hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
          >
            Generate AI Insights
          </button>
        </div>
      </Card>
    </div>
  );
};

export default TradingStrategyApp;