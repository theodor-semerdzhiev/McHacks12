import pandas as pd
import numpy as np
import os
        
    
class PairWiseMomentumStrategy():
    def __init__(self, momentum_diff_threshold=0.8, stop_loss_percentage=0.005, min_momentum_diff_for_signal=0.0000000, min_absolute_momentum_for_signal=0.0000000):
        self.momentum_diff_threshold = momentum_diff_threshold
        self.stop_loss_percentage = stop_loss_percentage 
        self.min_momentum_diff_for_signal = min_momentum_diff_for_signal 
        self.min_absolute_momentum_for_signal = min_absolute_momentum_for_signal 

    def _calculate_target_price(self, current_price:float, slower_momentum:float, faster_momentum:float):

        momentum_difference = faster_momentum - slower_momentum
        target_change_percentage = slower_momentum + (self.momentum_diff_threshold * momentum_difference) 

        target_price = current_price * (1 + target_change_percentage)
        return target_price

    def _calculate_stop_loss_price(self, entry_price: float, trade_type: str):

        if trade_type == 'Long':
            return entry_price * (1 - self.stop_loss_percentage)
        elif trade_type == 'Short':
            return entry_price * (1 + self.stop_loss_percentage)
        return None

    def _check_signal(self, stock1_momentum:float, stock2_momentum:float):
        if np.isnan(stock1_momentum) or np.isnan(stock2_momentum):
            return None, None 
        if (stock1_momentum > 0 and stock2_momentum > 0 and
            stock1_momentum != stock2_momentum and
            abs(stock1_momentum - stock2_momentum) > self.min_momentum_diff_for_signal):

            if abs(stock1_momentum) < abs(stock2_momentum) and abs(stock2_momentum) >= self.min_absolute_momentum_for_signal:
                return "Long", 1 
            elif abs(stock2_momentum) < abs(stock1_momentum) and abs(stock1_momentum) >= self.min_absolute_momentum_for_signal:
                return "Long", 2 
        elif (stock1_momentum < 0 and stock2_momentum < 0 and
              stock1_momentum != stock2_momentum and
              abs(stock1_momentum - stock2_momentum) > self.min_momentum_diff_for_signal):
            if abs(stock1_momentum) < abs(stock2_momentum) and abs(stock2_momentum) >= self.min_absolute_momentum_for_signal:
                return "Short", 2  
            elif abs(stock2_momentum) < abs(stock1_momentum) and abs(stock1_momentum) >= self.min_absolute_momentum_for_signal:
                return "Short", 1

        return "Hold", 0
    

    def _calculate_momentum_1hr(self, stock_series:pd.Series):
        if len(stock_series) < 2:
            return np.nan
        
        vals = []
        for i in range(len(stock_series) - 1):
            previous_value = stock_series.iloc[i]
            current_value = stock_series.iloc[i+1]
            vals.append((current_value - previous_value) / previous_value)

        return sum(vals) / len(vals)

    def analyze_market(self, stock1_data: pd.Series, stock2_data: pd.Series, lookback_periods: int = 3):

        stock1_data = stock1_data[-lookback_periods:]
        stock2_data = stock2_data[-lookback_periods:]

        if len(stock1_data) < lookback_periods or len(stock2_data) < lookback_periods:
            return None

        stock1_momentum = self._calculate_momentum_1hr(stock1_data[-lookback_periods:])
        stock2_momentum = self._calculate_momentum_1hr(stock2_data[-lookback_periods:])
        signal, stock_num = self._check_signal(stock1_momentum, stock2_momentum)

        if signal in ['Long', 'Short']:
            current_price = stock1_data.iloc[-1] if stock_num == 1 else stock2_data.iloc[-1]
            previous_price = stock1_data.iloc[-2] if stock_num == 1 else stock2_data.iloc[-2]

            # Calculate the last period's direction
            last_period_direction = current_price > previous_price

            if signal == 'Long':
                target_price = self._calculate_target_price(
                    current_price,
                    min(stock1_momentum, stock2_momentum),
                    max(stock1_momentum, stock2_momentum)
                )
     
                if not last_period_direction:
                    return None

            elif signal == 'Short':
                target_price = self._calculate_target_price(
                    current_price,
                    max(stock1_momentum, stock2_momentum),
                    min(stock1_momentum, stock2_momentum)
                )
        
                if last_period_direction:  
                    return None

            stop_loss_price = self._calculate_stop_loss_price(current_price, signal)

            return {
                'signal': signal,
                'index': stock_num,
                'entry_price': current_price,
                'target_price': target_price,
                'stop_loss_price': stop_loss_price,
                'index1_momentum': stock1_momentum,
                'index2_momentum': stock2_momentum
            }

        return None

class BackTester():
    def __init__(self, stock1_data, stock2_data, 
                 strategy=PairWiseMomentumStrategy(),
                 perform_end_of_backtest_exit = True,
                 max_consecutive_losses = 3,
                 cooling_period = pd.Timedelta(minutes=1)):
        self.trades = []
        self.trades_df = None
        self.stock1_data = stock1_data
        self.stock2_data = stock2_data
        self.strategy = strategy
        self.perform_end_of_backtest_exit = perform_end_of_backtest_exit
        self.max_consecutive_losses = max_consecutive_losses
        self.cooling_period = cooling_period
        self.last_loss_time = None
        self.recent_trades = []

    def export_trades_to_csv(self, path='./results', filename="trades.csv") -> None:
        if self.trades_df is None:
            raise Exception("Trade History has not been created, backtest first.")
        path = os.path.join(path, filename)
        self.trades_df.to_csv(path)

    def _check_trading_allowed(self, current_time):
   
        self.recent_trades = [trade for trade in self.recent_trades 
                            if current_time - trade['exit_time'] <= self.cooling_period]
        
       
        recent_losses = sum(1 for trade in self.recent_trades 
                          if trade['profit'] is not None and trade['profit'] < 0)
        

        if self.last_loss_time is not None:
            if current_time - self.last_loss_time < self.cooling_period:
                return False
            else:
                self.last_loss_time = None  
        
       
        if recent_losses >= self.max_consecutive_losses:
            self.last_loss_time = current_time
            return False
        
        return True

    def backtest(self):
        print("Starting backtesting...")
        positions = []
        trades = []

        for i in range(1, len(self.stock1_data)):
            current_time = self.stock1_data.index[i]
            sold_positions = []

            for j, trade in enumerate(positions):
                current_price_stock1 = self.stock1_data.iloc[i]
                current_price_stock2 = self.stock2_data.iloc[i]
                current_price = current_price_stock1 if trade['index'] == 1 else current_price_stock2

                # Adjust stop loss to break-even if price moves favorably
                if trade['type'] == 'Long':
                    if current_price > trade['entry_price']:
                        trade['stop_loss_price'] = trade['entry_price']  # Move stop loss to entry price
                else:  # Short position
                    if current_price < trade['entry_price']:
                        trade['stop_loss_price'] = trade['entry_price']  # Move stop loss to entry price

                # Check exit conditions
                if (trade['type'] == 'Long' and current_price >= trade['target_price']) or \
                (trade['type'] == 'Short' and current_price <= trade['target_price']):
                    profit = current_price - trade['entry_price'] if trade['type'] == 'Long' else trade['entry_price'] - current_price
                    trade_to_update = positions[j]
                    trade_to_update.update({
                        'exit_time': current_time,
                        'exit_price': current_price,
                        'profit': profit,
                        'exit_reason': 'Target Price Hit'
                    })
                    trades.append(trade_to_update)
                    sold_positions.append(j)

                elif (trade['type'] == 'Long' and current_price <= trade['stop_loss_price']) or \
                    (trade['type'] == 'Short' and current_price >= trade['stop_loss_price']):
                    loss = current_price - trade['entry_price'] if trade['type'] == 'Long' else trade['entry_price'] - current_price
                    trade_to_update = positions[j]
                    trade_to_update.update({
                        'exit_time': current_time,
                        'exit_price': current_price,
                        'profit': loss,
                        'exit_reason': 'Stop Loss Hit'
                    })
                    trades.append(trade_to_update)
                    sold_positions.append(j)

     
            positions = [item for k, item in enumerate(positions) if k not in sold_positions]

            for trade in trades:
                if trade not in self.recent_trades and trade['exit_time'] is not None:
                    self.recent_trades.append(trade)

           
            trading_allowed = self._check_trading_allowed(current_time)

            if trading_allowed:
               
                cur_stock = self.stock1_data.index < current_time
                signal_data = self.strategy.analyze_market(self.stock1_data[cur_stock], self.stock2_data[cur_stock])

                if signal_data:
                    trade = {
                        'entry_time': current_time,
                        'index': signal_data['index'],
                        'type': signal_data['signal'],
                        'entry_price': signal_data['entry_price'],
                        'target_price': signal_data['target_price'],
                        'stop_loss_price': signal_data['stop_loss_price'],
                        'exit_time': None,
                        'exit_price': None,
                        'profit': None,
                        'exit_reason': None
                    }
                    positions.append(trade)

     
        if self.perform_end_of_backtest_exit:
            for j, trade in enumerate(positions):
                current_price_stock1 = self.stock1_data.iloc[-1]
                current_price_stock2 = self.stock2_data.iloc[-1]
                current_time = self.stock1_data.index[-1]
                current_price = current_price_stock1 if trade['index'] == 1 else current_price_stock2
                profit = current_price - trade['entry_price'] if trade['type'] == 'Long' else trade['entry_price'] - current_price
                trade_to_update = positions[j]
                trade_to_update.update({
                    'exit_time': current_time,
                    'exit_price': current_price,
                    'profit': profit,
                    'exit_reason': 'End of Backtest Exit'
                })
                trades.append(trade_to_update)

        self.trades = trades
        self.trades_df = pd.DataFrame(trades)
        return self.trades_df

    def generate_trading_summary(self, generatecsv=False, path="./results", filename="AlgPerformanceSummary.csv") -> pd.DataFrame:

        trades_df = self.trades_df
        if trades_df.empty or 'profit' not in trades_df.columns:
            return pd.DataFrame({
                'Metric': ['Status'],
                'Value': ['No trades executed'],
                'Additional Info': ['No data available']
            })

        # Calculate basic metrics
        total_trades = len(trades_df)
        profitable_trades = trades_df[trades_df['profit'] > 0]
        losing_trades = trades_df[trades_df['profit'] <= 0]
        total_profit = trades_df['profit'].sum()

        # Calculate maximum and average maximum investment
        trades_df['entry_time'] = pd.to_datetime(trades_df['entry_time'])
        trades_df['exit_time'] = pd.to_datetime(trades_df['exit_time'])

        # Create a timeline of concurrent positions
        timeline = []
        for _, trade in trades_df.iterrows():
            timeline.append((trade['entry_time'], trade['entry_price'], 1))  # 1 for position open
            timeline.append((trade['exit_time'], trade['entry_price'], -1))  # -1 for position close

        timeline_df = pd.DataFrame(timeline, columns=['time', 'investment', 'action'])
        timeline_df = timeline_df.sort_values('time')

        # Calculate running total of concurrent positions
        timeline_df['concurrent_positions'] = timeline_df['action'].cumsum()
        timeline_df['total_investment'] = timeline_df['concurrent_positions'] * timeline_df['investment']

        # Calculate absolute maximum investment
        max_investment = timeline_df['total_investment'].max()

        # Calculate average maximum investment
        timeline_df['date'] = timeline_df['time'].dt.date
        daily_max_investments = timeline_df.groupby('date')['total_investment'].max()
        avg_max_investment = daily_max_investments.mean()

        # Calculate ROI using average maximum investment
        roi = (total_profit / avg_max_investment * 100) if avg_max_investment > 0 else 0

        # Calculate other metrics
        avg_profit_per_trade = total_profit / total_trades if total_trades > 0 else 0
        avg_winning_trade = profitable_trades['profit'].mean() if not profitable_trades.empty else 0
        avg_losing_trade = losing_trades['profit'].mean() if not losing_trades.empty else 0
        profit_factor = (
            abs(profitable_trades['profit'].sum() / losing_trades['profit'].sum())
            if not losing_trades.empty and losing_trades['profit'].sum() != 0
            else float('inf')
        )

        # Calculate stop loss hit rate
        stop_loss_trades = trades_df[trades_df['exit_reason'] == 'Stop Loss Hit']
        stop_loss_rate = len(stop_loss_trades) / total_trades * 100 if total_trades > 0 else 0

        # Calculate Sharpe Ratio for the strategy
        trades_df['date'] = pd.to_datetime(trades_df['entry_time']).dt.date

        # Summary data
        summary_data = {
            'Metric': [
                'Total Trades',
                'Profitable Trades',
                'Losing Trades',
                'Total Profit',
                'Maximum Investment',
                'Average Maximum Investment',
                'Return on Investment (ROI)',
                'Average Profit per Trade',
                'Average Winning Trade',
                'Average Losing Trade',
                'Profit Factor',
                'Stop Loss Hit Rate'
            ],
            'Value': [
                total_trades,
                len(profitable_trades),
                len(losing_trades),
                total_profit,
                max_investment,
                avg_max_investment,
                roi,
                avg_profit_per_trade,
                avg_winning_trade,
                avg_losing_trade,
                profit_factor,
                stop_loss_rate
            ],
            'Additional Info': [
                f'{int(total_trades)} executed trades',
                f'{(len(profitable_trades)/total_trades*100):.1f}% of total trades',
                f'{(len(losing_trades)/total_trades*100):.1f}% of total trades',
                f'${total_profit:.2f}',
                f'${max_investment:.2f}',
                f'${avg_max_investment:.2f}',
                f'{roi:.2f}% (based on avg max investment)',
                f'${avg_profit_per_trade:.2f}',
                f'${avg_winning_trade:.2f}',
                f'${avg_losing_trade:.2f}',
                f'{profit_factor:.2f}x return ratio',
                f'{stop_loss_rate:.1f}% of total trades'
            ]
        }

        summary_df = pd.DataFrame(summary_data)

        # Add monthly breakdown if timestamps are available
        if 'timestamp' in trades_df.columns:
            trades_df['month'] = pd.to_datetime(trades_df['timestamp']).dt.to_period('M')
            monthly_profits = trades_df.groupby('month')['profit'].agg([
                ('total_profit', 'sum'),
                ('num_trades', 'count')
            ]).reset_index()
            monthly_profits['month'] = monthly_profits['month'].astype(str)

            # Add monthly data to summary
            for _, row in monthly_profits.iterrows():
                summary_df = pd.concat([summary_df, pd.DataFrame({
                    'Metric': [f"Month {row['month']}"],
                    'Value': [row['total_profit']],
                    'Additional Info': [f"{row['num_trades']} trades, ${row['total_profit']:.2f} profit"]
                })], ignore_index=True)

        if generatecsv:
            path = os.path.join(path, filename)
            summary_df.to_csv(path)
            print(f"Summary saved to: {path}")

        return summary_df