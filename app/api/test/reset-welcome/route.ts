import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ 
    message: 'Welcome modal reset. Refresh the page to see it again.',
    instructions: 'Uncomment the localStorage.removeItem line in console-shell.tsx to always show the modal'
  });
}
