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
  zoomPlugin,
);

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

  function getBaseChartOptions(stock) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        zoom: {
          zoom: {
            wheel: { enabled: true, speed: 0.1 },
            pinch: { enabled: true, speed: 0.1 },
            mode: "x",
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

  // Chart subcomponent
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
          <button onClick={handleZoomIn}>Zoom In</button>
          <button onClick={handleZoomOut}>Zoom Out</button>
          <button onClick={handleResetZoom}>Reset Zoom</button>
        </div>
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
          height={400}
          width={800}
        />
      </div>
    );
  }

  return (
    <div>
      <h1>Stock Analysis</h1>
      <div>
        <h2>Select Data Type</h2>
        <label>
          <input
            type="radio"
            name="dataType"
            value="market"
            checked={dataType === "market"}
            onChange={() => setDataType("market")}
          />
          Market Data
        </label>
        <label>
          <input
            type="radio"
            name="dataType"
            value="trade"
            checked={dataType === "trade"}
            onChange={() => setDataType("trade")}
          />
          Trade Data
        </label>
      </div>
      <div>
        <h2>Select Period</h2>
        {periods.map((p) => (
          <label key={p}>
            <input
              type="radio"
              name="period"
              value={p}
              checked={period === p}
              onChange={() => setPeriod(p)}
            />
            {p}
          </label>
        ))}
      </div>
      <div>
        <h2>Select Stocks</h2>
        {stockOptions.map((stock) => (
          <label key={stock}>
            <input
              type="checkbox"
              value={stock}
              checked={selectedStocks.includes(stock)}
              onChange={(e) => {
                const updatedStocks = e.target.checked
                  ? [...selectedStocks, stock]
                  : selectedStocks.filter((s) => s !== stock);
                setSelectedStocks(updatedStocks);
              }}
            />
            {stock}
          </label>
        ))}
      </div>

      <div>
        <h2>Charts</h2>
        {chartsData.length > 0 ? (
          chartsData.map(({ stock, chartData }) => (
            <StockChart key={stock} stock={stock} chartData={chartData} />
          ))
        ) : (
          <p>No charts to display</p>
        )}
      </div>
    </div>
  );
}
