import pandas as pd
import matplotlib.pyplot as plt
import os
from matplotlib.lines import Line2D

def plot_stock_comparison(
        indices_df_stock1: pd.DataFrame, 
        indices_df_stock2: pd.DataFrame, 
        iteration = 1,
        period = 1,
        stock1_name: str = "Stock 1", 
        stock2_name: str = "Stock 2", 
        figsize=(15, 10), 
        printinfo=True) -> None:
    # Calculate additional metrics
    normalized_df = pd.DataFrame({
        stock1_name: indices_df_stock1 / indices_df_stock1.iloc[0] * 100,
        stock2_name: indices_df_stock2 / indices_df_stock2.iloc[0] * 100
    })
    
    spread = indices_df_stock1 - indices_df_stock2
    correlation = indices_df_stock1.rolling(window=20).corr(indices_df_stock2)
    
    # Create subplots
    fig = plt.figure(figsize=figsize)
    gs = fig.add_gridspec(3, 1, height_ratios=[2, 1, 1], hspace=0.3)
    
    # Plot 1: Raw prices
    ax1 = fig.add_subplot(gs[0])
    ax1.plot(indices_df_stock1.index, indices_df_stock1, label=stock1_name, linewidth=2)
    ax1.plot(indices_df_stock2.index, indices_df_stock2, label=stock2_name, linewidth=2)
    ax1.set_title('Stock Price Comparison', fontsize=12, pad=15)
    ax1.set_ylabel('Price')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Plot 2: Normalized prices (percentage change)
    ax2 = fig.add_subplot(gs[1])
    ax2.plot(normalized_df.index, normalized_df[stock1_name], label=f'{stock1_name} %', linewidth=2)
    ax2.plot(normalized_df.index, normalized_df[stock2_name], label=f'{stock2_name} %', linewidth=2)
    ax2.set_title('Normalized Price Comparison (Base 100)', fontsize=12, pad=15)
    ax2.set_ylabel('Normalized Price')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # Plot 3: Rolling correlation
    ax3 = fig.add_subplot(gs[2])
    ax3.plot(correlation.index, correlation, color='purple', linewidth=2)
    ax3.set_title('20-Period Rolling Correlation', fontsize=12, pad=15)
    ax3.set_ylabel('Correlation')
    ax3.set_xlabel('Date')
    ax3.grid(True, alpha=0.3)
    
    # Add statistical information as text
    stats_text = (
        f'Statistics:\n'
        f'Correlation: {indices_df_stock1.corr(indices_df_stock2):.3f}\n'
        f'Max Spread: {spread.max():.2f}\n'
        f'Min Spread: {spread.min():.2f}\n'
        f'Spread Std: {spread.std():.2f}'
    )
    plt.figtext(0.02, 0.02, stats_text, fontsize=10, bbox=dict(facecolor='white', alpha=0.8))
    
    plt.tight_layout()
    # Save with high quality
    plt.savefig(f'./results{period}/stocks_comparison_analysis{iteration}.png',
                bbox_inches='tight',
                dpi=300,
                facecolor='white',
                edgecolor='none')
    
    plt.close()
    
    # Print additional statistics
    if printinfo:
        print("\Stock Statistics:")
        print(f"{'Metric':<20} {stock1_name:<15} {stock2_name:<15}")
        print("-" * 50)
        print(f"{'Mean':<20} {indices_df_stock1.mean():<15.2f} {indices_df_stock2.mean():<15.2f}")
        print(f"{'Std Dev':<20} {indices_df_stock1.std():<15.2f} {indices_df_stock2.std():<15.2f}")
        print(f"{'Min':<20} {indices_df_stock1.min():<15.2f} {indices_df_stock2.min():<15.2f}")
        print(f"{'Max':<20} {indices_df_stock1.max():<15.2f} {indices_df_stock2.max():<15.2f}")


def plot_longshort_timeseries(
        trades_df:pd.DataFrame, 
        stock_data1:pd.Series , 
        stock_data2:pd.Series , 
        momentum_diff_threshold:float,
        savefig=True, path='./results', 
        filename="profits_vs_stocks.png"):
    """Plot the cumulative profits over time along with the stock prices."""

    if trades_df is None or len(trades_df) == 0:
        print("No trades to plot.")
        return
    
    trades_df['entry_time'] = pd.to_datetime(trades_df['entry_time'])
    trades_df['exit_time'] = pd.to_datetime(trades_df['exit_time'])

    # Ensure stock data has datetime stock
    stock_data1.index = pd.to_datetime(stock_data1.index)
    stock_data2.index = pd.to_datetime(stock_data2.index)

    # Normalize the stock prices
    normalized_stock1 = (stock_data1 - stock_data1.min()) / (stock_data1.max() - stock_data1.min())
    normalized_stock2 = (stock_data2 - stock_data2.min()) / (stock_data2.max() - stock_data2.min())

    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(14, 10), sharex=True)

    # Adjust spacing between subplots
    plt.subplots_adjust(hspace=0.4)

    # Plot stock 1 and stock 2 prices
    ax1.set_ylabel('Stock Price')
    ax1.plot(stock_data1.index, stock_data1.values, label='Stock 1')
    ax1.plot(stock_data2.index, stock_data2.values, color='tab:orange', label='Stock 2')
    ax1.tick_params(axis='y')
    ax1.legend(loc='upper right')
    ax1.set_title('Stock Price over Time')

    # Annotate trades on the plot
    for _, trade in trades_df.iterrows():
        if trade['exit_time']:
            if trade['index'] == 1:
                ax1.plot(trade['entry_time'], stock_data1.asof(trade['entry_time']), 'g^' if trade['type'] == 'Long' else 'rv', markersize=6.75)
                ax1.plot(trade['exit_time'], stock_data1.asof(trade['exit_time']), 'go' if trade['type'] == 'Long' else 'ro', markersize=6.75)
            elif trade['index'] == 2:
                ax1.plot(trade['entry_time'], stock_data2.asof(trade['entry_time']), 'g^' if trade['type'] == 'Long' else 'rv', markersize=6.75)
                ax1.plot(trade['exit_time'], stock_data2.asof(trade['exit_time']), 'go' if trade['type'] == 'Long' else 'ro', markersize=6.75)

    # Add legend for trade annotations
    legend_elements = [
        Line2D([0], [0], marker='^', color='g', label='Long Entry', markersize=8, linestyle='None'),
        Line2D([0], [0], marker='v', color='r', label='Short Entry', markersize=8, linestyle='None'),
        Line2D([0], [0], marker='o', color='g', label='Long Exit', markersize=8, linestyle='None'),
        Line2D([0], [0], marker='o', color='r', label='Short Exit', markersize=8, linestyle='None')
    ]

    ax1.legend(handles=legend_elements, loc='best', title='Trade Annotations')

    # Plot normalized Stock 1 and stock 2 prices
    ax2.set_ylabel('Normalized Stock Price')
    ax2.plot(normalized_stock1.index, normalized_stock1.values, color='tab:blue', label='Normalized Stock 1')
    ax2.plot(normalized_stock2.index, normalized_stock2.values, color='tab:orange', label='Normalized Stock 2')
    ax2.legend(loc='lower left')
    ax2.set_title('Normalized Stock Prices over Time')

    for _, trade in trades_df.iterrows():
        if trade['exit_time']:
            if trade['index'] == 1:
                ax2.plot(trade['entry_time'], normalized_stock1.asof(trade['entry_time']), 'g^' if trade['type'] == 'Long' else 'rv', markersize=6.75)
                ax2.plot(trade['exit_time'], normalized_stock1.asof(trade['exit_time']), 'go' if trade['type'] == 'Long' else 'ro', markersize=6.75)
            elif trade['index'] == 2:
                ax2.plot(trade['entry_time'], normalized_stock2.asof(trade['entry_time']), 'g^' if trade['type'] == 'Long' else 'rv', markersize=6.75)
                ax2.plot(trade['exit_time'], normalized_stock2.asof(trade['exit_time']), 'go' if trade['type'] == 'Long' else 'ro', markersize=6.75)

    # Create a DataFrame for cumulative profit
    profit_df = pd.DataFrame(index=stock_data1.index)
    profit_df['cumulative_profit'] = 0.0

    # Calculate cumulative profit
    cumulative_profit = 0
    for stock, row in profit_df.iterrows():
        # Add profits from trades that have completed by this time
        completed_trades = trades_df[(trades_df['exit_time'] <= stock) & (trades_df['profit'].notna())]
        cumulative_profit = completed_trades['profit'].sum()
        profit_df.loc[stock, 'cumulative_profit'] = cumulative_profit

    # Calculate cumulative profit
    cumulative_profit = 0
    for stock, row in profit_df.iterrows():
        # Add profits from trades that have completed by this time
        completed_trades = trades_df[(trades_df['exit_time'] <= stock) & (trades_df['profit'].notna())]
        cumulative_profit = completed_trades['profit'].sum()
        profit_df.loc[stock, 'cumulative_profit'] = cumulative_profit

    ax3.set_ylabel('Cumulative Return')
    ax3.plot(profit_df.index, profit_df['cumulative_profit'], label='Cumulative Return')
    ax3.tick_params(axis='y')
    ax3.legend(loc='lower right')
    ax3.set_title("Cumulative Return over Time")
    ax3.set_xlabel('Time')

    plt.suptitle(f'Stock Prices with Short/Long Positions (Normalized), and Cumulative Return Over Time ({momentum_diff_threshold} Momentum Diff. Threshold)')

    if savefig:
        path = os.path.join(path, filename)
        plt.savefig(path)

    plt.close()