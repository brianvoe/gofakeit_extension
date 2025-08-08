/**
 * Fetch data from gofakeit API
 */
export async function fetchGofakeitData(func: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.gofakeit.com/funcs/${func}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.text();
    return data;
  } catch (error) {
    console.error(`[Gofakeit Autofill] Error fetching data for ${func}:`, error);
    return null;
  }
}
