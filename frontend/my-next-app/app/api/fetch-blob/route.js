import { NextResponse } from "next/server";
import { fetchBlobData } from "../../utils/azure";

export async function GET(request) {
  // Get the full URL from the request
  const url = new URL(request.url);

  // Extract query parameters
  const containerName = url.searchParams.get("containerName");
  const blobName = url.searchParams.get("blobName");

  // Check if required parameters are provided
  if (!containerName || !blobName) {
    return NextResponse.json(
      { error: "containerName and blobName are required" },
      { status: 400 }
    );
  }

  try {
    // Fetch the blob data
    const blobData = await fetchBlobData(containerName, blobName);

    // Return the blob data as a JSON response
    return NextResponse.json({ data: blobData }, { status: 200 });
  } catch (error) {
    console.error("Error fetching blob data:", error);
    return NextResponse.json(
      { error: "Failed to fetch blob data" },
      { status: 500 }
    );
  }
}