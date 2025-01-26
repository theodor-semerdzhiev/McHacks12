"use client";

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import zoomPlugin from "chartjs-plugin-zoom";

// Register Chart.js + Zoom
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

export default function HomePage() {
  // "market" or "trade"
  const [dataType, setDataType] = useState("trade"); 
  // Which period is selected
  const [period, setPeriod] = useState("Period1");
  // Which stocks (A–E) are selected
  const [selectedStocks, setSelectedStocks] = useState(["A"]);
  // Final array of chart data, one entry per stock
  const [chartsData, setChartsData] = useState([]);

  // Just an example of 15 periods
  const periods = Array.from({ length: 15 }, (_, i) => `Period${i + 1}`);
  // Our 5 stocks
  const stockOptions = ["A", "B", "C", "D", "E"];

  // If you have up to e.g. 5 chunked files for market data (0..4), set this to 5 or 6
  // We'll attempt each one; if it 404s, we skip it.
  const chunkFileCount = 5;
  // Sampling step: skip lines to avoid huge chart loads
  const STEP = 25;

  useEffect(() => {
    // If no stocks selected, clear out
    if (selectedStocks.length === 0) {
      setChartsData([]);
      return;
    }

    // Build array of Promises for each stock
    const fetchAll = selectedStocks.map(async (stock) => {
      if (dataType === "market") {
        // MARKET DATA -> chunked approach
        let allRows = [];
        for (let i = 0; i < chunkFileCount; i++) {
          const csvPath = `/TrainingData/${period}/${period}/${stock}/market_data_${stock}_${i}.csv`;
          try {
            const rows = await parseCsv(csvPath);
            if (rows.length > 0) {
              allRows = allRows.concat(rows);
            }
          } catch (err) {
            // 404 or parse error => skip
          }
        }
        // If we never found any rows, skip
        if (allRows.length === 0) return null;

        // Sample
        const sampled = allRows.filter((_, idx) => idx % STEP === 0);

        // Convert to numeric
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
        // TRADE DATA -> single file
        // e.g. /TrainingData/Period1/Period1/A/trade_data__A.csv
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
        } catch (err) {
          // e.g. file not found
          return null;
        }
      }
    });

    // Wait for all stocks
    Promise.all(fetchAll).then((results) => {
      const valid = results.filter((r) => r && r.chartData);
      setChartsData(valid);
    });
  }, [dataType, period, selectedStocks]);

  // Papa Parse helper
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
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  // Build chart data for Market CSV (bid/ask)
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

  // Build chart data for Trade CSV (price/volume)
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

  function getBaseChartOptions(stock) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        zoom: {
          zoom: {
            wheel: { enabled: true, speed: 0.1 },
            pinch: { enabled: true, speed: 0.1 },
            mode: "x", // or "x" / "y"
          },
          pan: {
            enabled: true,
            speed: 0.1,
            mode: "x",
          },
        },
        legend: { position: "bottom" },
        title: {
          display: true,
          text: `Period: ${period} - Stock: ${stock} - ${
            dataType === "market" ? "Market Data" : "Trade Data"
          }`,
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Timestamp" },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 20,
          },
        },
        yPrice: {
          type: "linear",
          position: "left",
          title: { display: true, text: "Price" },
        },
        yVolume: {
          type: "linear",
          position: "right",
          title: { display: true, text: "Volume" },
          grid: { drawOnChartArea: false },
        },
      },
    };
  }

  // Renders each chart for each stock
  function StockChart({ stock, chartData }) {
    const chartRef = useRef(null);
    const options = getBaseChartOptions(stock);

    const handleZoomIn = () => {
      if (chartRef.current) chartRef.current.zoom(1.1);
    };
    const handleZoomOut = () => {
      if (chartRef.current) chartRef.current.zoom(0.9);
    };
    const handleResetZoom = () => {
      if (chartRef.current) chartRef.current.resetZoom();
    };

    return (
      <div style={{ margin: "2rem 0" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <button onClick={handleZoomIn}>Zoom In</button>{" "}
          <button onClick={handleZoomOut}>Zoom Out</button>{" "}
          <button onClick={handleResetZoom}>Reset Zoom</button>
        </div>
        <div style={{ height: "600px" }}>
          <Line
            data={chartData}
            options={options}
            ref={(chart) => {
              if (chart) chartRef.current = chart;
            }}
          />
        </div>
      </div>
    );
  }

  // Toggle stock checkboxes
  const handleStockChange = (stock) => {
    if (selectedStocks.includes(stock)) {
      setSelectedStocks(selectedStocks.filter((s) => s !== stock));
    } else {
      setSelectedStocks([...selectedStocks, stock]);
    }
  };

  return (
    <>
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
            <img
              src="/images/mainpage.jpg"
              alt="Stock analysis illustration"
            />
          </div>
        </div>
      </section>

      <main className="main-content">
        <h1>Select Period & Stocks</h1>

        <div className="chart-controls">
          {/* Period Dropdown */}
          <label>Period:</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Market Data vs Trade Data Buttons */}
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
    </>
  );
}
