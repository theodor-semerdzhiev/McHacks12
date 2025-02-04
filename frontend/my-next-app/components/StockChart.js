"use client";

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
    BarController,
} from "chart.js";
import { Line } from "react-chartjs-2";
import zoomPlugin from "chartjs-plugin-zoom";
import { useRef } from "react";

// Register Chart.js + Zoom
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    BarController,
    Title,
    Tooltip,
    Legend,
    zoomPlugin,
)

export default function StockChart({ stock, chartData, period, dataType}) {
    const chartRef = useRef(null);
    const options = getBaseChartOptions(stock, dataType, period);

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

function getBaseChartOptions(stock, dataType, period) {
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
                text: `Period: ${period} - Stock: ${stock} - ${dataType === "market" ? "Market Data" : "Trade Data"
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