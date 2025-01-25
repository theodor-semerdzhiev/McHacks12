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
  // We'll still track "period" and "stocks" as before
  const [period, setPeriod] = useState("Period1");
  const [selectedStocks, setSelectedStocks] = useState(["A"]);
  const [chartsData, setChartsData] = useState([]);

  // Now let's also track which fields we want to plot:
  // For example: 'bidPrice', 'askPrice', 'bidVolume', 'askVolume'
  // The user could select them from checkboxes or something
  const [plotBidPrice, setPlotBidPrice] = useState(true);
  const [plotAskPrice, setPlotAskPrice] = useState(true);
  const [plotBidVolume, setPlotBidVolume] = useState(false);
  const [plotAskVolume, setPlotAskVolume] = useState(false);

  const periods = Array.from({ length: 15 }, (_, i) => `Period${i + 1}`);
  const stockOptions = ["A", "B", "C", "D", "E"];

  // We'll define a chunkFileCount for each stock/period. 
  // For instance if we know each stock has up to 5 chunk files: 0..4
  const chunkFileCount = 10; // adjust as needed

  // We'll define a STEP for sampling lines
  const STEP = 500; // bigger skip to handle huge data

  useEffect(() => {
    // If no stocks selected, no chart
    if (selectedStocks.length === 0) {
      setChartsData([]);
      return;
    }

    // We'll fetch multiple chunk files for each selected stock
    // Combine them, then sample
    const fetchAllPromises = selectedStocks.map(async (stock) => {
      let allRows = [];

      // Suppose we have up to 'chunkFileCount' CSVs: market_data_<stock>_0.csv ... _4.csv
      for (let i = 0; i < chunkFileCount; i++) {
        const csvPath = `/TrainingData/${period}/${period}/${stock}/market_data_${stock}_${i}.csv`;

        // We'll attempt to parse each chunk file. If it doesn't exist,
        // we might get a 404. We'll handle that by ignoring or breaking out.
        try {
          const result = await parseCsv(csvPath);
          if (result && result.length > 0) {
            allRows = allRows.concat(result);
          } else {
            // If it's null or empty, likely no more chunk files exist
            // break the loop if you prefer
            // break;
          }
        } catch (error) {
          console.warn("Error parsing chunk file", csvPath, error);
          // Possibly break if you know no more files exist
          // break;
        }
      }

      // Now 'allRows' includes all lines from all chunk files
      // Next, heavily sample them
      const sampled = allRows.filter((_, idx) => idx % STEP === 0);

      // Convert strings -> numbers
      const parsedData = sampled.map((row) => ({
        timestamp: row.timestamp,
        bidPrice: parseFloat(row.bidPrice),
        askPrice: parseFloat(row.askPrice),
        bidVolume: parseFloat(row.bidVolume),
        askVolume: parseFloat(row.askVolume),
      }));

      return { stock, parsedData };
    });

    Promise.all(fetchAllPromises).then((stockResults) => {
      // Filter out any that are null or empty
      const valid = stockResults.filter((s) => s && s.parsedData && s.parsedData.length > 0);

      // Now build a separate chart for each stock
      const newCharts = valid.map(({ stock, parsedData }) => {
        // Build labels from timestamps
        const labels = parsedData.map((item) => item.timestamp);

        const datasets = [];

        // If user wants bidPrice:
        if (plotBidPrice) {
          datasets.push({
            type: "line",
            label: `Bid Price (${stock})`,
            data: parsedData.map((item) => item.bidPrice),
            borderColor: "rgb(75, 192, 192)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            yAxisID: "yPrice",
            tension: 0.2,
            order: 1,
          });
        }

        // If user wants askPrice:
        if (plotAskPrice) {
          datasets.push({
            type: "line",
            label: `Ask Price (${stock})`,
            data: parsedData.map((item) => item.askPrice),
            borderColor: "rgb(192, 75, 192)",
            backgroundColor: "rgba(192, 75, 192, 0.2)",
            yAxisID: "yPrice",
            tension: 0.2,
            order: 1,
          });
        }

        // If user wants bidVolume:
        if (plotBidVolume) {
          datasets.push({
            type: "bar",
            label: `Bid Volume (${stock})`,
            data: parsedData.map((item) => item.bidVolume),
            borderColor: "rgb(192, 75, 75)",
            backgroundColor: "rgba(192, 75, 75, 0.5)",
            yAxisID: "yVolume",
            order: 0,
          });
        }

        // If user wants askVolume:
        if (plotAskVolume) {
          datasets.push({
            type: "bar",
            label: `Ask Volume (${stock})`,
            data: parsedData.map((item) => item.askVolume),
            borderColor: "rgb(75, 75, 192)",
            backgroundColor: "rgba(75, 75, 192, 0.5)",
            yAxisID: "yVolume",
            order: 0,
          });
        }

        return {
          stock,
          chartData: { labels, datasets },
        };
      });

      setChartsData(newCharts);
    });
  }, [
    period, 
    selectedStocks, 
    plotBidPrice, 
    plotAskPrice, 
    plotBidVolume, 
    plotAskVolume
  ]);

  // Helper function to parse a CSV using Papa
  // Returns an array of row objects
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
        error: (err) => {
          reject(err);
        },
      });
    });
  }

  // Base chart options, similar to your code
  function getBaseChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1,
            },
            pinch: {
              enabled: true,
              speed: 0.1,
            },
            mode: "x",
          },
          pan: {
            enabled: true,
            speed: 0.1,
            mode: "x",
          },
        },
        legend: {
          position: "bottom",
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Timestamp",
          },
        },
        yPrice: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Price",
          },
        },
        yVolume: {
          type: "linear",
          position: "right",
          title: {
            display: true,
            text: "Volume",
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    };
  }

  function StockChart({ stock, chartData }) {
    const chartRef = useRef(null);
    const options = {
      ...getBaseChartOptions(),
      plugins: {
        ...getBaseChartOptions().plugins,
        title: {
          display: true,
          text: `Period: ${period} - Stock: ${stock}`,
        },
      },
    };

    const handleZoomIn = () => {
      if (!chartRef.current) return;
      chartRef.current.zoom(1.1);
    };
    const handleZoomOut = () => {
      if (!chartRef.current) return;
      chartRef.current.zoom(0.9);
    };
    const handleResetZoom = () => {
      if (!chartRef.current) return;
      chartRef.current.resetZoom();
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
            <p>/* Intro text... */</p>
          </div>
          <div className="intro-image">
            <img src="/images/mainpage.jpg" alt="Placeholder" />
          </div>
        </div>
      </section>

      <main className="main-content">
        <h1>Select Period & Stocks</h1>
        <div className="chart-controls">
          <label>Period:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {periods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

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

        {/* Example toggles for which fields to plot */}
        <div className="chart-controls">
          <label>
            <input
              type="checkbox"
              checked={plotBidPrice}
              onChange={() => setPlotBidPrice(!plotBidPrice)}
            />
            Bid Price
          </label>
          <label>
            <input
              type="checkbox"
              checked={plotAskPrice}
              onChange={() => setPlotAskPrice(!plotAskPrice)}
            />
            Ask Price
          </label>
          <label>
            <input
              type="checkbox"
              checked={plotBidVolume}
              onChange={() => setPlotBidVolume(!plotBidVolume)}
            />
            Bid Volume
          </label>
          <label>
            <input
              type="checkbox"
              checked={plotAskVolume}
              onChange={() => setPlotAskVolume(!plotAskVolume)}
            />
            Ask Volume
          </label>
        </div>

        {chartsData.length > 0 ? (
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
