export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  const base = process.env.SERVER_API_BASE_URL;
  
  if (!base) {
    return Response.json({ error: 'SERVER_API_BASE_URL not configured' }, { status: 500 });
  }
  
  try {
    const response = await fetch(`${base}/${pathString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
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
