export interface ApiResponse {
  success: boolean;
  data?: string;
  error?: string;
  status?: number;
}

// Fetch data from gofakeit API
export async function fetchGofakeitData(func: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`https://api.gofakeit.com/funcs/${func}`);
    
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
    console.error(`[Gofakeit Autofill] Error fetching data for ${func}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
