// Custom error handler to suppress redirect errors in console
export function handleRedirectError(error: unknown) {
  if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
    // Don't log redirect errors - they're expected behavior
    return;
  }
  
  // Log other errors normally
  console.error('Error:', error);
}

// Override console.error to filter out redirect errors
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Check if any argument contains NEXT_REDIRECT
  const hasRedirectError = args.some(arg => 
    typeof arg === 'string' && arg.includes('NEXT_REDIRECT')
  );
  
  if (hasRedirectError) {
    // Don't log redirect errors
    return;
  }
  
  // Log other errors normally
  originalConsoleError.apply(console, args);
};
