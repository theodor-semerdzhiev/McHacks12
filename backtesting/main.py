import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import datetime
import os
from typing import Literal
import glob


def read_and_plot_data(root_dir):
    period_data = {}  # Dictionary to hold data for each period
    files = {}
    
    for period in os.listdir(root_dir):
        period_path = os.path.join(root_dir, period)
        if os.path.isdir(period_path):  # Check if it's a directory
            period_path = os.path.join(period_path, period)
            for folder in os.listdir(period_path):

                folder_path = os.path.join(period_path, folder)
                if os.path.isdir(folder_path):
                    for file in os.listdir(folder_path):
                        if "__" in file and file.endswith(".csv"):  # Check for '__{letter}' files
                            file_path = os.path.join(folder_path, file)
                            # Read the CSV data
                            data = pd.read_csv(file_path)
                            period_data[(folder, period)] = data
                            
                            if period not in files:
                                files[period] = []

                            files[period].append(file_path)

    return period_data, files

def determine_global_time_range(csv_files, date_str, freq='5S'):
    """
    Determines the global start and end datetime across all CSV files.
    """
    min_datetime = None
    max_datetime = None

    for file_path in csv_files:
        try:
            df = pd.read_csv(file_path)
            if df.empty or 'timestamp' not in df.columns:
                continue

            # Process timestamps
            df['timestamp'] = pd.to_datetime(date_str + ' ' + df['timestamp'].astype(str).str[:15])

            if df.empty:
                continue

            file_min = df['timestamp'].min()
            file_max = df['timestamp'].max()

            if min_datetime is None or file_min < min_datetime:
                min_datetime = file_min
            if max_datetime is None or file_max > max_datetime:
                max_datetime = file_max

        except Exception as e:
            print(f"Error processing {file_path} for global time range: {e}")

    if min_datetime is None or max_datetime is None:
        raise ValueError("No valid datetime entries found across all files.")

    # Floor to the previous 5-second mark and ceil to the next 5-second mark
    min_datetime = min_datetime.floor('5S')
    max_datetime = max_datetime.ceil('5S')

    return min_datetime, max_datetime

def read_and_process_stock(file_path, date_str, global_start_datetime, global_end_datetime, freq='5S', output_directory='./processed_data'):
    """
    Processes a stock's CSV file with 5-second intervals and proper filling.
    """
    stock_name = os.path.splitext(os.path.basename(file_path))[0].split('__')[-1]
    print(f"\nProcessing stock: {stock_name}")

    try:
        df = pd.read_csv(file_path)
        if df.empty:
            print(f"Warning: {file_path} is empty. Skipping.")
            return
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return

    required_columns = {'price', 'timestamp'}  # Removed 'volume' from required columns
    if not required_columns.issubset(df.columns):
        print(f"Error: Missing required columns in {file_path}. Skipping.")
        return

    try:
        # Convert timestamps to datetime
        df['datetime'] = pd.to_datetime(date_str + ' ' + df['timestamp'].astype(str).str[:15])

        # Sort by datetime
        df = df.sort_values('datetime')

        # Set datetime as index
        df.set_index('datetime', inplace=True)

        # Create complete time range from global start to end
        full_range = pd.date_range(start=global_start_datetime,
                                 end=global_end_datetime,
                                 freq=freq)

        # Resample to 5-second intervals (removed volume)
        resampled_df = df.resample(freq).agg({
            'price': 'last'
        })

        # Reindex to include all intervals
        resampled_df = resampled_df.reindex(full_range)

        # Forward fill, then backward fill to handle gaps
        resampled_df = resampled_df.ffill().bfill()

        # Reset index
        resampled_df = resampled_df.reset_index().rename(columns={'index': 'datetime'})

        # Ensure output directory exists
        os.makedirs(output_directory, exist_ok=True)

        # Save processed data
        output_file = os.path.join(output_directory, f'resampled_5S_data__{stock_name}.csv')
        resampled_df.to_csv(output_file, index=False)
        print(f"Processed data saved to {output_file}")

        # Print statistics
        print(f"Original records: {len(df)}")
        print(f"Resampled records: {len(resampled_df)}")
        print(f"Time range: {resampled_df['datetime'].min()} to {resampled_df['datetime'].max()}")

    except Exception as e:
        print(f"Error processing {stock_name}: {e}")


root_directory = "../TrainingData"
data, files = read_and_plot_data(root_directory)

def main():
    """
    Main function to process all CSV files.
    """
    for period in files.keys():
        csv_files = files[period]
        if not csv_files:
            print("No CSV files found matching the pattern 'trade_data__*.csv'")
            return

        date_str = '2025-01-25'  # Adjust as needed

        try:
            global_start_datetime, global_end_datetime = determine_global_time_range(csv_files, date_str)
            print(f"\nGlobal time range: {global_start_datetime} to {global_end_datetime}")

            for file in csv_files:
                read_and_process_stock(
                    file_path=file,
                    date_str=date_str,
                    global_start_datetime=global_start_datetime,
                    global_end_datetime=global_end_datetime,
                    freq='5S',
                    output_directory=f'./processed_data_{period}'
                )

            print("\nProcessing completed successfully.")

        except Exception as e:
            print(f"Error in main processing: {e}")

if __name__ == "__main__":
    main()
