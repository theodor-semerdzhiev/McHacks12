"""
Script used to denormalize a dataset in a folder format to just files in a folder.
"""

import os

training_data = os.listdir("TrainingData")
if not os.path.exists("TrainingData1"):
    os.mkdir("TrainingData1")
    
def list_dir_ignore_hidden(path: str):
    return [f for f in os.listdir(path) if not f.startswith(".")]

for period in training_data:
    for folder in list_dir_ignore_hidden(os.path.join("TrainingData", period)):
        stocks = list_dir_ignore_hidden(os.path.join("TrainingData", period, folder))
        for stock in stocks:
            # get all the files in the stock folder
            files = list_dir_ignore_hidden(os.path.join("TrainingData", period, folder, stock))
            for file in files:
                # copy the file to the new folder
                src = os.path.join("TrainingData", period, folder, stock, file)
                dst = ""
                if "market_data" in file:
                    # get the character before .csv
                    i = int(file.split(".")[0][-1])
                    new_file = f"{period}_{stock}_market_data_{i}.csv"
                    dst = os.path.join("TrainingData1", new_file)
                elif "trade_data" in file:
                    new_file = f"{period}_{stock}_trade_data.csv"
                    dst = os.path.join("TrainingData1", new_file)
                
                if dst:
                    os.system(f"cp {src} {dst}")
                    print(f"Copying {src} to {dst}")