"use client";

import { useState, useEffect } from "react";

/**
 * A small helper component that:
 *  1) HEAD-fetches the image path to check if it exists.
 *  2) If it does not exist (404), shows "No Trades".
 *  3) Otherwise, shows the labeled image.
 */
function ImageWithCheck({ src, label }) {
  const [exists, setExists] = useState(undefined); // undefined => checking, true => exists, false => not found

  useEffect(() => {
    let cancelled = false;

    // HEAD request to check if file is found
    fetch(src, { method: "HEAD" })
      .then((res) => {
        if (!cancelled) {
          if (res.ok) {
            setExists(true);
          } else {
            setExists(false);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setExists(false);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (exists === undefined) {
    // Still checking
    return (
      <p style={{ marginBottom: "1rem" }}>
        Checking <strong>{label}</strong>...
      </p>
    );
  }
  if (!exists) {
    // Doesn't exist => Show "No Trades"
    return (
      <p style={{ marginBottom: "1rem" }}>
        <strong>{label}:</strong> No Trades
      </p>
    );
  }

  // If we get here, the file was found => show the image
  return (
    <div style={{ marginBottom: "1rem" }}>
      <p>
        <strong>{label}</strong>
      </p>
      <img
        src={src}
        alt={label}
        style={{
          border: "2px solid #ccc",
          borderRadius: "8px",
          maxWidth: "100%",
        }}
      />
    </div>
  );
}

export default function StatisticalApproachPage() {
  // Period1 through Period15
  const periodOptions = Array.from({ length: 15 }, (_, i) => `Period${i + 1}`);

  // Track which periods are selected
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  // A simple "AI Summary" message that appears after Summarize is clicked
  const [aiSummary, setAiSummary] = useState("");

  /**
   * Build the list of "candidate" images for each selected period.
   * We'll generate two sets per period:
   *   1) PairWiseMomentumTrading_profits_vs_stocks_iteration_{i} (i in [1..12])
   *      label => "Period X: Rebalancing i"
   *   2) stocks_comparison_analysis{j} (j in [0..11])
   *      label => "Period X: Correlation of stocks over time for rebalancing j+1"
   */
  function getImageCandidates() {
    const candidates = [];

    selectedPeriods.forEach((periodStr) => {
      // e.g. "Period3" => 3
      const periodNumber = parseInt(periodStr.replace("Period", ""), 10);
      // So the folder is e.g. results3
      const folderName = `results${periodNumber}`;

      // 1) PairWiseMomentumTrading_profits_vs_stocks_iteration_i.png => i=1..12
      for (let i = 1; i <= 12; i++) {
        const fileName = `PairWiseMomentumTrading_profits_vs_stocks_iteration_${i}.png`;
        // path => /results/results3/PairWiseMomentumTrading_profits_vs_stocks_iteration_1.png
        const src = `/results/${folderName}/${fileName}`;
        const label = `${periodStr}: Rebalancing ${i}`;
        candidates.push({ src, label });
      }

      // 2) stocks_comparison_analysis{j}.png => j=0..11 => rebalancing => j+1
      for (let j = 0; j <= 11; j++) {
        const fileName = `stocks_comparison_analysis${j}.png`;
        const src = `/results/${folderName}/${fileName}`;
        const label = `${periodStr}: Correlation of stocks over time for rebalancing ${
          j + 1
        }`;
        candidates.push({ src, label });
      }
    });

    return candidates;
  }

  const imageCandidates = getImageCandidates();

  // Toggle a period on/off
  const handleTogglePeriod = (period) => {
    if (selectedPeriods.includes(period)) {
      setSelectedPeriods(selectedPeriods.filter((p) => p !== period));
    } else {
      setSelectedPeriods([...selectedPeriods, period]);
    }
    // Clear summary if selection changes
    setAiSummary("");
  };

  // Show a static paragraph when Summarize is clicked
  const handleSummarize = () => {
    setAiSummary(
      "This is a placeholder AI summary of the selected periods' charts. We have identified potential trends, momentum shifts, and correlations across the data. Further analysis could incorporate advanced statistical or ML techniques!"
    );
  };

  return (
    <>
      {/* Intro / Explanation at top */}
      <section className="intro-section">
        <div className="intro-content">
          <div className="intro-text">
            <h2>Statistical Approach Overview</h2>
            <p>
    <strong>Our momentum-based pairs trading algorithm</strong> is designed to trade two highly correlated stocks by analyzing their momentum trends and adjusting based on real-time correlation data.
</p>

<p>
    <strong>Stock Selection and Pairing: </strong> 
    The algorithm operates with a pool of five correlated stocks, recalculating their correlations every five minutes. It selects the pair with the highest correlation for the next trading interval.
</p>

<p>
    <strong>Data Processing: </strong> 
    High-frequency data was processed and transformed into 5-second intervals to capture detailed price movements and detect momentum changes.
</p>

<p>
    <strong>Momentum Calculation and Trading Decisions: </strong> 
    The algorithm assesses the momentum of the last three data points (15 seconds) to decide whether to long or short the slower-moving stock based on the trend of the faster-moving stock.
</p>

<p>
    <strong>Risk Management: </strong> 
    Dynamic stop losses, momentum thresholds, correlation thresholds, and cooldown periods after consecutive losses are implemented to protect capital and maintain trading stability.
</p>

<p>
    <strong>Trading Cycles and Rebalancing: </strong> 
    Operating across 15 periods, each consisting of 12 rebalancing intervals, the algorithm continuously reassesses and updates the stock pairs to adapt to market conditions.
</p>

<p>
    <strong>Results: </strong> 
    The algorithm performed very well, consistently having positive returns. It is important to note that the end of each interval is defined by a dip in return due to an intentional exit of all positions at the end of the backtesting. Usually, positions that are forcefully exited in this way haven't hit the target price, meaning they are likely losing trades that haven't hit the stop loss yet.
</p>

          </div>
          <div className="intro-image">
            {/* Placeholder image: adjust path if needed */}
            <img
              src="/images/candles.png"
              alt="Statistical approach illustration"
            />
          </div>
        </div>
      </section>

      <h1>Statistical Approach</h1>

      <div className="stat-container">
        {/* LEFT COLUMN: images */}
        <div className="stat-left">
          <h2>Charts / Graphs</h2>

          {imageCandidates.length === 0 ? (
            <p>No periods selected yet.</p>
          ) : (
            imageCandidates.map(({ src, label }, idx) => (
              <ImageWithCheck key={`${src}-${idx}`} src={src} label={label} />
            ))
          )}
        </div>

        {/* RIGHT COLUMN: periods + AI Summary */}
        <div className="stat-right">
          <h2>Select Periods</h2>
          <div style={{ marginBottom: "1rem" }}>
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

          {/* AI Summary Button & Section */}
          <div>
            <h3>AI Summary</h3>
            <button onClick={handleSummarize}>Summarize the Charts</button>
            {aiSummary && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  background: "#f9f9f9",
                  borderRadius: "8px",
                }}
              >
                <p>{aiSummary}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
