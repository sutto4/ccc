import { NextResponse } from "next/server";

// Temporary mock data when bot server is not available
export async function GET() {
  // Return mock guild data for testing
  const mockGuilds = [
    {
      id: "123456789012345678",
      name: "Test Server 1",
      memberCount: 42,
      roleCount: 8,
      iconUrl: null,
      premium: false,
      createdAt: "2023-01-01T00:00:00.000Z"
    },
    {
      id: "987654321098765432", 
      name: "Test Server 2",
      memberCount: 156,
      roleCount: 12,
      iconUrl: null,
      premium: true,
      createdAt: "2023-06-15T00:00:00.000Z"
    }
  ];

  return NextResponse.json(mockGuilds);
}