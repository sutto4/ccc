export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  const base = process.env.SERVER_API_BASE_URL;
  
  console.log('🔍 Proxy GET request:', { path, pathString, base }); // Debug log
  
  if (!base) {
    console.log('❌ No SERVER_API_BASE_URL found');
    return Response.json({ error: 'SERVER_API_BASE_URL not configured' }, { status: 500 });
  }
  
  try {
    const targetUrl = `${base}/${pathString}`;
    console.log('🔍 Forwarding GET request to:', targetUrl); // Debug log
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('🔍 Bot response status:', response.status); // Debug log
    
    if (!response.ok) {
      console.log('❌ Bot returned error status:', response.status);
      const errorText = await response.text();
      console.log('❌ Bot error response:', errorText);
      return Response.json({ error: `Bot returned ${response.status}` }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('✅ Bot GET response success'); // Debug log
    return Response.json(data);
  } catch (error) {
    console.log('❌ Proxy GET error:', error); // Debug log
    return Response.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  const base = process.env.SERVER_API_BASE_URL;
  
  console.log('🔍 Proxy POST request:', { path, base }); // Debug log
  
  if (!base) {
    console.log('❌ No SERVER_API_BASE_URL found');
    return Response.json({ error: 'SERVER_API_BASE_URL not configured' }, { status: 500 });
  }
  
  try {
    const body = await request.json();
    console.log('🔍 Forwarding request to:', `${base}/${pathString}`); // Debug log
    
    const response = await fetch(`${base}/${pathString}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    console.log('✅ Bot response:', data); // Debug log
    return Response.json(data);
  } catch (error) {
    console.log('❌ Proxy error:', error); // Debug log
    return Response.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  const base = process.env.SERVER_API_BASE_URL;
  
  console.log('🔍 Proxy PUT request:', { path, base }); // Debug log
  
  if (!base) {
    console.log('❌ No SERVER_API_BASE_URL found');
    return Response.json({ error: 'SERVER_API_BASE_URL not configured' }, { status: 500 });
  }
  
  try {
    const body = await request.json();
    console.log('🔍 Forwarding PUT request to:', `${base}/${pathString}`); // Debug log
    
    const response = await fetch(`${base}/${pathString}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    console.log('✅ Bot PUT response:', data); // Debug log
    return Response.json(data);
  } catch (error) {
    console.log('❌ Proxy PUT error:', error); // Debug log
    return Response.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  const base = process.env.SERVER_API_BASE_URL;
  
  console.log('🔍 Proxy DELETE request:', { path, base }); // Debug log
  
  if (!base) {
    console.log('❌ No SERVER_API_BASE_URL found');
    return Response.json({ error: 'SERVER_API_BASE_URL not configured' }, { status: 500 });
  }
  
  try {
    console.log('🔍 Forwarding DELETE request to:', `${base}/${pathString}`); // Debug log
    
    const response = await fetch(`${base}/${pathString}`, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });
    
    const data = await response.json();
    console.log('✅ Bot DELETE response:', data); // Debug log
    return Response.json(data);
  } catch (error) {
    console.log('❌ Proxy DELETE error:', error); // Debug log
    return Response.json({ error: 'Proxy failed' }, { status: 500 });
  }
}
