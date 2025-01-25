// app/statistical-approach/page.js
"use client";

import { useState } from "react";

export default function StatisticalApproachPage() {
  // We'll have multiple stocks and multiple periods
  const stockOptions = ["A", "B", "C", "D", "E"];
  const periodOptions = Array.from({ length: 15 }, (_, i) => `Period${i + 1}`);

  // Track which stocks are selected
  const [selectedStocks, setSelectedStocks] = useState([]);
  // Track which periods are selected
  const [selectedPeriods, setSelectedPeriods] = useState([]);

  // If you had images in /public/StatsImages/PeriodX/A/*.png,
  // you can build paths like `/StatsImages/${period}/${stock}/graph1.png`.
  // For now, let's just do a placeholder: `/placeholder.png`
  // But let's build an array of all selected combos for demonstration.
  function getImagePaths() {
    const paths = [];
    selectedPeriods.forEach((p) => {
      selectedStocks.forEach((s) => {
        // Example path: /StatsImages/Period1/A/graph1.png
        const fakePath = `/StatsImages/${p}/${s}/graph1.png`;
        paths.push({
          period: p,
          stock: s,
          src: fakePath,
        });
      });
    });
    return paths;
  }

  const imageData = getImagePaths();

  // Toggling a stock
  const handleToggleStock = (stock) => {
    if (selectedStocks.includes(stock)) {
      setSelectedStocks(selectedStocks.filter((s) => s !== stock));
    } else {
      setSelectedStocks([...selectedStocks, stock]);
    }
  };

  // Toggling a period
  const handleTogglePeriod = (period) => {
    if (selectedPeriods.includes(period)) {
      setSelectedPeriods(selectedPeriods.filter((p) => p !== period));
    } else {
      setSelectedPeriods([...selectedPeriods, period]);
    }
  };

  // Summarize button placeholder
  const handleSummarize = () => {
    alert("We'll implement AI logic later!");
  };

  return (
    <>
      <h1>Statistical Approach</h1>

      <div className="stat-container">
        {/* LEFT COLUMN: images */}
        <div className="stat-left">
          <h2>Charts / Graphs</h2>
          {imageData.length === 0 ? (
            <p>No images selected yet.</p>
          ) : (
            imageData.map(({ src, period, stock }, idx) => (
              <div key={`${src}-${idx}`}>
                <p>
                  {period} - {stock}
                </p>
                <img
                  className="stat-image"
                  src={src}
                  alt={`Chart for ${period} - ${stock}`}
                />
              </div>
            ))
          )}
        </div>

        {/* RIGHT COLUMN: checkboxes + AI Summary */}
        <div className="stat-right">
          <h2>Select Periods & Stocks</h2>
          <div style={{ marginBottom: "1rem" }}>
            <p><strong>Periods:</strong></p>
            {periodOptions.map((period) => (
              <label key={period} style={{ display: "block" }}>
                <input
                  type="checkbox"
                  checked={selectedPeriods.includes(period)}
                  onChange={() => handleTogglePeriod(period)}
                />
                {period}
              </label>
            ))}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <p><strong>Stocks:</strong></p>
            {stockOptions.map((stock) => (
              <label key={stock} style={{ display: "block" }}>
                <input
                  type="checkbox"
                  checked={selectedStocks.includes(stock)}
                  onChange={() => handleToggleStock(stock)}
                />
                {stock}
              </label>
            ))}
          </div>

          {/* AI Summary Button */}
          <div>
            <h3>AI Summary</h3>
            <button onClick={handleSummarize}>Summarize the Charts</button>
          </div>
        </div>
      </div>
    </>
  );
}
