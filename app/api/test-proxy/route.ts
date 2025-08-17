export async function GET() {
  return Response.json({ 
    message: "Proxy test", 
    timestamp: new Date().toISOString(),
    env: process.env.SERVER_API_BASE_URL || 'not set'
  });
}