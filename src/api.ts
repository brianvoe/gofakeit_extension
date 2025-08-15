export interface ApiResponse {
  success: boolean;
  data?: string;
  error?: string;
  status?: number;
}

// Base HTTP request function
async function makeRequest(method: 'GET' | 'POST', url: string, body?: any): Promise<ApiResponse> {
  try {
    const options: RequestInit = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (method === 'POST' && body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error! status: ${response.status}`,
        status: response.status
      };
    }
    
    const data = await response.text();
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error(`[Gofakeit Autofill] Error in ${method} request to ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Fetch data from gofakeit API
export async function fetchGofakeitData(func: string): Promise<ApiResponse> {
  // Check if the function contains query parameters
  const questionMarkIndex = func.indexOf('?');
  
  if (questionMarkIndex !== -1) {
    // Function has query parameters - use POST with JSON body
    const functionName = func.substring(0, questionMarkIndex);
    const queryString = func.substring(questionMarkIndex + 1);
    
    // Parse query parameters into an object
    const params: Record<string, any> = {};
    const searchParams = new URLSearchParams(queryString);
    
    for (const [key, value] of searchParams.entries()) {
      // Try to parse as number if possible
      const numValue = parseFloat(value);
      params[key] = isNaN(numValue) ? value : numValue;
    }
    
    return makeRequest('POST', `https://api.gofakeit.com/funcs/${functionName}`, params);
  } else {
    // Simple function - use GET request
    return makeRequest('GET', `https://api.gofakeit.com/funcs/${func}`);
  }
}

// Fetch random string from an array of strings using gofakeit API
export async function fetchRandomString(strings: string[]): Promise<ApiResponse> {
  return makeRequest('POST', 'https://api.gofakeit.com/funcs/randomstring', { strs: strings });
}
