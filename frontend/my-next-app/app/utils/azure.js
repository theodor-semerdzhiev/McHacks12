// utils/azureBlob.js
import { BlobServiceClient } from "@azure/storage-blob";

// Function to fetch data from Azure Blob Storage
export async function fetchBlobData(containerName, blobName) {
  try {
    const connectionString = "https://volatilityvision.blob.core.windows.net/volatility-vision-container";
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    // Download the blob content
    const downloadBlockBlobResponse = await blobClient.download();
    const downloadedContent = await streamToString(downloadBlockBlobResponse.readableStreamBody);

    return downloadedContent;
  } catch (error) {
    console.error("Error fetching data from Azure Blob Storage:", error);
    throw new Error("Failed to fetch data from Azure Blob Storage");
  }
}

// Helper function to convert a readable stream to a string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (chunk) => {
      chunks.push(chunk.toString());
    });
    readableStream.on("end", () => {
      resolve(chunks.join(""));
    });
    readableStream.on("error", reject);
  });
}