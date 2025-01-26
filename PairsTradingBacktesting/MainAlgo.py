import pandas as pd
import datetime
import os
from TradingAlg import BackTester, PairWiseMomentumStrategy
from DataVisual import plot_stock_comparison, plot_longshort_timeseries

# Create directory if it doesn't exist
for i in range(1, 16):
    os.makedirs(f'./results{i}', exist_ok=True)

def get_base_timestamp(tickers, period = 1):
    earliest_timestamps = []
    for ticker in tickers:
        try:
            df = pd.read_csv(f'processed_data/Period{period}/resampled_5S_data__{ticker}.csv')
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            earliest_timestamps.append(df['timestamp'].min())
        except Exception as e:
            print(f"Error reading timestamp for {ticker}: {e}")
            continue
    
    return max(earliest_timestamps) if earliest_timestamps else None

def download_stock_data(tickers, start_date, end_date, period = 1):
    try:
        all_data = []

        for ticker in tickers:
            try:
                # Read CSV file for each ticker
                df = pd.read_csv(f'processed_data/Period{period}/resampled_5S_data__{ticker}.csv')

                df['timestamp'] = pd.to_datetime(df['timestamp'])

                df['ticker'] = ticker

                df = df[['timestamp', 'ticker', 'close']]

                all_data.append(df)

            except Exception as e:
                print(f"Error loading data for {ticker}: {e}")
                continue

        if not all_data:
            return None

        # Combine all data
        combined_df = pd.concat(all_data)

        # Filter data between start_date and end_date
        combined_df = combined_df[
            (combined_df['timestamp'] >= start_date) &
            (combined_df['timestamp'] <= end_date)
        ]

        # Pivot the data
        pivot_df = combined_df.pivot(
            index='timestamp',
            columns='ticker',
            values='close'
        )

        result = pd.DataFrame(
            pivot_df.values,
            index=pivot_df.index,
            columns=pd.MultiIndex.from_product([['close'], pivot_df.columns])
        )

        return result

    except Exception as e:
        print(f"Error processing CSV data: {e}")
        return None

def get_industry_stocks(industry="Technology"):
    """Get stocks from a specific industry"""
    return ["A", "B", "C", "D", "E"]

def calculate_correlations(data):
    """Calculate correlations between all possible stock pairs and return them sorted by correlation strength"""
    stocks = data.columns.get_level_values(1)
    correlations = []

    # Calculate correlations for all possible pairs
    for i in range(len(stocks)):
        for j in range(i + 1, len(stocks)):  # Start from i+1 to avoid duplicate pairs
            stock1, stock2 = stocks[i], stocks[j]
            correlation = data['close'][stock1].corr(data['close'][stock2])

            # Only add if correlation is not NaN
            if pd.notna(correlation):
                correlations.append({
                    'stock1': stock1,
                    'stock2': stock2,
                    'correlation': abs(correlation)  # Use absolute correlation to find strongest relationships
                })

    # Convert to DataFrame and sort by absolute correlation in descending order
    corr_df = pd.DataFrame(correlations)
    if not corr_df.empty:
        corr_df = corr_df.sort_values('correlation', ascending=False)

    return corr_df

def run_iteration(iteration: int, base_datetime: datetime.datetime, period = 1):
    """
    Runs the main workflow once, offsetting each run by 5 minutes per iteration.
    """
    offset_minutes = iteration * 5
    print(f"\n======== Starting iteration {iteration + 1} with offset {offset_minutes} minutes ========")

    # =========================
    #   CORRELATION DATES
    # =========================
    end_date_corr = base_datetime + datetime.timedelta(minutes=offset_minutes)
    start_date_corr = end_date_corr - datetime.timedelta(minutes=5)  # Last 5 minutes for correlation

    # =========================
    #   BACKTEST DATES
    # =========================
    start_date_backtest = end_date_corr
    end_date_backtest = start_date_backtest + datetime.timedelta(minutes=5)  # Next 5 minutes for backtest

    # Get stocks
    tickers = get_industry_stocks()

    # =========================
    #   DOWNLOAD CORR DATA
    # =========================
    print("Downloading stock data for correlation...")
    correlation_data = download_stock_data(tickers, start_date_corr, end_date_corr, period)
    if correlation_data is None:
        print("No data returned for correlation. Skipping iteration.")
        return

    # =========================
    #   CALCULATE CORRELATIONS
    # =========================
    print("Calculating correlations...")
    correlated_pairs = calculate_correlations(correlation_data)

    # =========================
    #   GET STOCK NAMES
    # =========================
    print("Getting stock pairs...")
    if correlated_pairs.empty:
        print("No valid correlations found. Skipping iteration.")
        return

    # Get the most correlated pair
    stock1_name = correlated_pairs.iloc[0]['stock1']
    stock2_name = correlated_pairs.iloc[0]['stock2']
    correlation = correlated_pairs.iloc[0]['correlation']
    print(f"Selected pair: {stock1_name}-{stock2_name} with correlation: {correlation}")

    # =========================
    #   DATA FOR BACKTEST
    # =========================
    print("Downloading stock data for backtesting...")
    backtest_data = download_stock_data(tickers, start_date_backtest, end_date_backtest, period)
    if backtest_data is None:
        print("Could not get backtesting data, skipping iteration.")
        return

    close_prices = backtest_data['close'].ffill().dropna()

    # Get the series for each stock
    stock1_prices = close_prices[stock1_name]
    stock2_prices = close_prices[stock2_name]

    # =========================
    #   PLOTTING & BACKTEST
    # =========================
    iteration_suffix = f"_iteration_{iteration+1}"
    print(iteration)
    plot_stock_comparison(stock1_prices, stock2_prices, iteration, period)

    # PairWiseMomentumStrategy
    backtester = BackTester(
        stock1_data=stock1_prices,
        stock2_data=stock2_prices,
        strategy=PairWiseMomentumStrategy(),
        perform_end_of_backtest_exit=True,
        max_consecutive_losses=1
    )
    backtester.backtest()
    backtester.export_trades_to_csv(path = f"./results{period}", filename=f"PairWiseMomentumStrategy_trades{iteration_suffix}.csv")
    print(backtester.generate_trading_summary(
        generatecsv=True, path = f"./results{period}",
        filename=f"PairWiseMomentumStrategy_AlgPerformnceSummary{iteration_suffix}.csv"
    ))
    plot_longshort_timeseries(
        backtester.trades_df,
        backtester.stock1_data,
        backtester.stock2_data,
        backtester.strategy.momentum_diff_threshold,
        path = f"./results{period}",
        filename=f"PairWiseMomentumTrading_profits_vs_stocks{iteration_suffix}.png"
    )

def main():
    for j in range(15):
        # Get stocks
        tickers = get_industry_stocks()
        
        # Get base timestamp from data files
        base_datetime = get_base_timestamp(tickers, j+1)
        
        if base_datetime is None:
            print("Could not determine base timestamp from data files.")
            return
        
        print(f"Starting analysis from: {base_datetime}")
        
        # Run iterations (12 iterations = 1 hour with 5-minute intervals)
        for i in range(12):
            run_iteration(i, base_datetime, period = j+1)

if __name__ == "__main__":
    main()