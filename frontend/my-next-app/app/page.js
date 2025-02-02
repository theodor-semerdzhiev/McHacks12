"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
// import axios from "axios";
import dynamic from "next/dynamic";

const StockChart = dynamic(() => import("../components/StockChart"), {
  ssr: false,
});

export default function HomePage() {
  // "market" or "trade"
  const [dataType, setDataType] = useState("trade");
  // Which period is selected for the charts
  const [period, setPeriod] = useState("Period1");
  // Which stocks (A–E) are selected
  const [selectedStocks, setSelectedStocks] = useState(["A"]);
  // Final array of chart data, one entry per stock
  const [chartsData, setChartsData] = useState([]);

  // 31 possible periods
  const periods = Array.from({ length: 15 }, (_, i) => `Period${i + 1}`);
  // Our 5 stocks
  const stockOptions = ["A", "B", "C", "D", "E"];

  // If you have up to e.g. 5 chunked files for market data (0..4)
  const chunkFileCount = 5;
  // Sampling step to skip lines
  const STEP = 25;

  // --- CHART LOADING LOGIC ---
  useEffect(() => {
    if (selectedStocks.length === 0) {
      setChartsData([]);
      return;
    }

    const fetchAll = selectedStocks.map(async (stock) => {
      if (dataType === "market") {
        // MARKET DATA => multiple chunk files
        let allRows = [];
        for (let i = 0; i < chunkFileCount; i++) {
          const csvPath = `/TrainingData/${period}/${period}/${stock}/market_data_${stock}_${i}.csv`;
          // const blobName = `${period}_${stock}_market_data_${i}.csv`;
          // const containerName = "volatility-vision-container";
          // let flag = false;
          // const csv = await axios.get("/api/fetch-blob", {
          //    params: { containerName, blobName } 
          //   }).catch((err) => { 
          //     flag = true;
          //     return null;
          //   });

          // if (flag) break;
          // console.log(csv);

          try {
            const rows = await parseCsv(csvPath);
            if (rows.length > 0) {
              allRows = allRows.concat(rows);
            }
          } catch {
            // 404 or parse error => skip
          }
        }
        if (allRows.length === 0) return null;

        // Sample
        const sampled = allRows.filter((_, idx) => idx % STEP === 0);
        const parsedData = sampled
          .filter(
            (r) =>
              r.bidPrice &&
              r.askPrice &&
              r.bidVolume &&
              r.askVolume &&
              r.timestamp
          )
          .map((r) => ({
            timestamp: r.timestamp,
            bidPrice: parseFloat(r.bidPrice),
            askPrice: parseFloat(r.askPrice),
            bidVolume: parseFloat(r.bidVolume),
            askVolume: parseFloat(r.askVolume),
          }));
        if (parsedData.length === 0) return null;

        return {
          stock,
          chartData: buildMarketChartData(parsedData),
        };
      } else {
        // TRADE DATA => single file
        const csvPath = `/TrainingData/${period}/${period}/${stock}/trade_data__${stock}.csv`;
        try {
          const allRows = await parseCsv(csvPath);
          if (allRows.length === 0) return null;

          const sampled = allRows.filter((_, idx) => idx % STEP === 0);
          const parsedData = sampled
            .filter((r) => r.price && r.volume && r.timestamp)
            .map((r) => ({
              timestamp: r.timestamp,
              price: parseFloat(r.price),
              volume: parseInt(r.volume, 10),
            }));
          if (parsedData.length === 0) return null;

          return {
            stock,
            chartData: buildTradeChartData(parsedData),
          };
        } catch {
          // e.g. file not found
          return null;
        }
      }
    });

    Promise.all(fetchAll).then((results) => {
      const valid = results.filter((r) => r && r.chartData);
      setChartsData(valid);
    });
  }, [dataType, period, selectedStocks]);

  function parseCsv(path) {
    return new Promise((resolve, reject) => {
      Papa.parse(path, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || !Array.isArray(results.data)) {
            return resolve([]);
          }
          resolve(results.data);
        },
        error: (err) => reject(err),
      });
    });
  }

  // Build chart data for Market
  function buildMarketChartData(parsed) {
    const labels = parsed.map((d) => d.timestamp);
    return {
      labels,
      datasets: [
        {
          type: "line",
          label: "Bid Price",
          data: parsed.map((d) => d.bidPrice),
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          yAxisID: "yPrice",
          tension: 0.2,
          order: 1,
        },
        {
          type: "line",
          label: "Ask Price",
          data: parsed.map((d) => d.askPrice),
          borderColor: "rgb(192, 75, 192)",
          backgroundColor: "rgba(192, 75, 192, 0.2)",
          yAxisID: "yPrice",
          tension: 0.2,
          order: 1,
        },
        {
          type: "bar",
          label: "Bid Volume",
          data: parsed.map((d) => d.bidVolume),
          borderColor: "rgb(192, 75, 75)",
          backgroundColor: "rgba(192, 75, 75, 0.5)",
          yAxisID: "yVolume",
          order: 0,
        },
        {
          type: "bar",
          label: "Ask Volume",
          data: parsed.map((d) => d.askVolume),
          borderColor: "rgb(75, 75, 192)",
          backgroundColor: "rgba(75, 75, 192, 0.5)",
          yAxisID: "yVolume",
          order: 0,
        },
      ],
    };
  }

  // Build chart data for Trade
  function buildTradeChartData(parsed) {
    const labels = parsed.map((d) => d.timestamp);
    return {
      labels,
      datasets: [
        {
          type: "line",
          label: "Price",
          data: parsed.map((d) => d.price),
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          yAxisID: "yPrice",
          tension: 0.2,
          order: 1,
        },
        {
          type: "bar",
          label: "Volume",
          data: parsed.map((d) => d.volume),
          borderColor: "rgb(192, 75, 75)",
          backgroundColor: "rgba(192, 75, 75, 0.5)",
          yAxisID: "yVolume",
          order: 0,
        },
      ],
    };
  }

  // Toggle stock checkboxes
  const handleStockChange = (stock) => {
    if (selectedStocks.includes(stock)) {
      setSelectedStocks(selectedStocks.filter((s) => s !== stock));
    } else {
      setSelectedStocks([...selectedStocks, stock]);
    }
  };

  // Editable arrays for analysis
  const marketAnalysisTexts = [
    "At 8:30 AM, stocks A B C D E show a noticeable dip, strongly suggest correlation, and a response to a shared external event.",
    "Stock E and D have similar patterns with drops around 9:50",
    "Strong growth ",
    "A wave of volatility hits at 9:15 AM with quick rebounds.",
    "Market opens with consistent upward trends for stocks A, B, and C.",
    "Sharp downturn observed for stock A at 10:05 AM, likely triggered by sector news.",
    "Stocks B and D stabilize around 11:15 AM, showing resilience despite volatility.",
    "A sudden drop for stock E around 1:30 PM mirrors sector-wide contraction.",
    "Stocks A and C experience a synchronized rally near 2:45 PM.",
    "Heavy volatility persists for stock B in the early afternoon.",
    "Stock D consistently outperforms, unaffected by broader market dips.",
    "Market-wide stagnation observed during midday, leading to reduced activity.",
    "Spike in stock A's volume at 10:45 AM hints at significant institutional activity.",
    "Stock E lags the market during late afternoon rallies.",
    "Persistent sell-offs observed in stock C during late morning trades.",
    "Sector divergence emerges around 3:00 PM, isolating stocks A and D.",
    "Stocks B and E exhibit heightened correlation after 2:00 PM."
  ];

  const tradeAnalysisTexts = [
    "At 8:30 AM, stocks A B C D E show a noticeable dip, strongly suggest correlation, and a response to a shared external event.",
    "Stock E and D opposites, thus disconnect between intentions and actions in market.",
    "Low-volume lulled periods around midday—re-entry possible.",
    "Steady buying pressure across stocks A, B, and C during the opening hour.",
    "Sell-off in stock A at 10:05 AM aligns with macroeconomic announcements.",
    "Buyers re-enter stock B and D near 11:15 AM as sentiment stabilizes.",
    "Heavy sell orders dominate stock E around 1:30 PM, pulling it below its moving average.",
    "Profitable scalping opportunities in stocks A and C during a late-day rally.",
    "Stock B shows an optimal shorting opportunity amid persistent afternoon volatility.",
    "Stock D provides a safe long entry amidst market uncertainty.",
    "Scalping opportunities dry up during a midday lull.",
    "Sharp increases in volume for stock A at 10:45 AM signal bullish momentum.",
    "Stock E offers contrarian buying signals in the late afternoon.",
    "Short positions in stock C profit as sell-offs persist throughout the morning.",
    "Sector divergence at 3:00 PM highlights stocks A and D as trading opportunities.",
    "Momentum trading thrives as stocks B and E align post-2:00 PM rally."
  ];

  return (
    <>
      {/* Intro / Hero section */}
      <section className="intro-section">
        <div className="intro-content">
          <div className="intro-text">
            <h2>Stock Analysis & Prediction</h2>
            <p>
              Welcome! This project explores five unknown stocks with historical data
              from National Bank. We’ll visualize how economic and news events impact
              each stock’s prices and volatility, then attempt to predict significant
              market movements before they happen.
            </p>
            <p>
              <strong>Phase 1:</strong> Observe trends and identify which stock might
              lead the others. <br />
              <strong>Phase 2:</strong> Develop statistical or ML models to generate
              alerts for imminent rises or drops.
            </p>
          </div>
          <div className="intro-image">
            <img src="/images/mainpage.jpg" alt="Stock analysis illustration" />
          </div>
        </div>
      </section>

      {/* Main Chart Visualizer content */}
      <main className="main-content">
        <h1>Select Period & Stocks</h1>
        <div className="chart-controls">
          <label>Period:</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Market vs Trade buttons */}
          <button
            style={{
              backgroundColor: dataType === "market" ? "#2f405e" : "",
              color: dataType === "market" ? "#fff" : "",
            }}
            onClick={() => setDataType("market")}
          >
            Market Data
          </button>
          <button
            style={{
              backgroundColor: dataType === "trade" ? "#2f405e" : "",
              color: dataType === "trade" ? "#fff" : "",
            }}
            onClick={() => setDataType("trade")}
          >
            Trade Data
          </button>
        </div>

        {/* Stock checkboxes */}
        <div className="chart-controls">
          {stockOptions.map((stock) => (
            <label key={stock}>
              <input
                type="checkbox"
                checked={selectedStocks.includes(stock)}
                onChange={() => handleStockChange(stock)}
              />
              {stock}
            </label>
          ))}
        </div>

        {/* Render a chart for each selected stock */}
        {chartsData && chartsData.length > 0 ? (
          chartsData.map(({ stock, chartData }) => (
            <StockChart key={stock} stock={stock} chartData={chartData} />
          ))
        ) : (
          <p>Loading or no data...</p>
        )}
      </main>

      {/* Analysis Section for 31 Periods */}
      <section style={{ maxWidth: "1200px", margin: "2rem auto" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
          Analysis for All 31 Periods
        </h2>

        {periods.map((p, idx) => (
          <div
            key={p}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "2rem",
              justifyContent: "space-between",
            }}
          >
            {/* Market Data box */}
            <div
              style={{
                flex: 1,
                minWidth: "300px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "1rem",
                background: "#fafafa",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{p} - Market Data Analysis</h3>
              <p>{marketAnalysisTexts[idx]}</p>
            </div>

            {/* Trade Data box */}
            <div
              style={{
                flex: 1,
                minWidth: "300px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "1rem",
                background: "#fafafa",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{p} - Trade Data Analysis</h3>
              <p>{tradeAnalysisTexts[idx]}</p>
            </div>
          </div>
        ))}

        {/* Full-width Conclusion */}
        <div
          style={{
            marginTop: "2rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "1rem",
            background: "#fafafa",
          }}
        >
          <h2>Overall Conclusion</h2>
          <p>
            This section can summarize your key findings across all 31 periods. 
            For instance, you might note consistent dips around certain times 
            in multiple stocks, or highlight correlations that could be used in 
            future ML or statistical models.
          </p>
          <p>
            Adjust this conclusion once you've populated the above analysis 
            paragraphs with your real data interpretations!
          </p>
        </div>
      </section>
    </>
  );
}
