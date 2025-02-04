// app/layout.js

import "./globals.css"; // Import your global styles

export const metadata = {
  title: "Volatility Vision",
  description: "Chart Visualizer, Statistical Approach, ML Approach",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div className="nav-left">
            <h2 className="site-title">Predictive Optimization Console</h2>
          </div>
          <div className="nav-right">
            {/* Next.js <Link> components: */}
            <a href="/" className="nav-link">
              Chart Visualizer
            </a>
            <a href="/statistical-approach" className="nav-link">
              Statistical Approach
            </a>
            <a href="/ml-approach" className="nav-link">
              ML Approach
            </a>
          </div>
        </nav>

        {/* Main content */}
        <main className="main-content">{children}</main>
      </body>
    </html>
  );
}
