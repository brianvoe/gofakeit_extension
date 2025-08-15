import { fetchGofakeitData } from './api';
import { handleError } from './autofill';

// Get ISO week number for a date
function getISOWeek(date: Date): number {
  const d = new Date(date.getTime());
  d.setUTCHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // January 4 is always in week 1
  const week1 = new Date(d.getUTCFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1
  const week = Math.ceil((((d.getTime() - week1.getTime()) / 86400000) - 3 + (week1.getUTCDay() || 7)) / 7);
  return week;
}

// Handle date/time input elements
export async function handleDateTimeInput(element: HTMLInputElement, gofakeitFunc: string): Promise<boolean> {
  const inputType = element.type.toLowerCase();
  
  try {
    switch (inputType) {
      case 'date':
        // Use the provided function or default to 'date'
        const dateFunc = gofakeitFunc === 'true' ? 'date' : gofakeitFunc;
        const dateResponse = await fetchGofakeitData(dateFunc);
        
        if (!dateResponse.success) {
          console.warn(`[Gofakeit Autofill] Error for ${inputType} input:`, dateResponse.error);
          if (dateResponse.status === 400) {
            handleError(element, `Failed to get random ${inputType}`);
          }
          return false;
        }
        
        // Parse the ISO date string (e.g., "1935-03-01T19:02:35Z") and extract just the date part
        try {
          const dateString = dateResponse.data!;
          const dateMatch = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            element.value = dateMatch[1]; // Extract YYYY-MM-DD part
          } else {
            console.warn('[Gofakeit Autofill] Could not parse date from response:', dateString);
            return false;
          }
        } catch (error) {
          console.warn('[Gofakeit Autofill] Error parsing date response:', error);
          return false;
        }
        break;
        
      case 'time':
        // Use gofakeit hour and minute functions to create time format
        const hourResponse = await fetchGofakeitData('hour');
        const minuteResponse = await fetchGofakeitData('minute');
        
        if (!hourResponse.success || !minuteResponse.success) {
          console.warn('[Gofakeit Autofill] Error getting hour or minute:', hourResponse.error || minuteResponse.error);
          if (hourResponse.status === 400 || minuteResponse.status === 400) {
            handleError(element, 'Failed to get random time');
          }
          return false;
        }
        
        // Format time as HH:MM
        const hour = hourResponse.data!.padStart(2, '0');
        const minute = minuteResponse.data!.padStart(2, '0');
        element.value = `${hour}:${minute}`;
        break;
        
      case 'datetime-local':
        // Use the provided function or default to 'date' (which includes time)
        const datetimeFunc = gofakeitFunc === 'true' ? 'date' : gofakeitFunc;
        const datetimeResponse = await fetchGofakeitData(datetimeFunc);
        
        if (!datetimeResponse.success) {
          console.warn(`[Gofakeit Autofill] Error for ${inputType} input:`, datetimeResponse.error);
          if (datetimeResponse.status === 400) {
            handleError(element, `Failed to get random ${inputType}`);
          }
          return false;
        }
        
        // Parse the ISO datetime string (e.g., "1935-03-01T19:02:35Z") and extract datetime-local format
        try {
          const datetimeString = datetimeResponse.data!;
          const datetimeMatch = datetimeString.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):\d{2}/);
          if (datetimeMatch) {
            element.value = datetimeMatch[1]; // Extract YYYY-MM-DDTHH:MM part
          } else {
            console.warn('[Gofakeit Autofill] Could not parse datetime from response:', datetimeString);
            return false;
          }
        } catch (error) {
          console.warn('[Gofakeit Autofill] Error parsing datetime response:', error);
          return false;
        }
        break;
        
      case 'month':
        // Use gofakeit year and month functions
        const yearResponse = await fetchGofakeitData('year');
        const monthResponse = await fetchGofakeitData('month');
        
        if (!yearResponse.success || !monthResponse.success) {
          console.warn('[Gofakeit Autofill] Error getting year or month:', yearResponse.error || monthResponse.error);
          if (yearResponse.status === 400 || monthResponse.status === 400) {
            handleError(element, 'Failed to get random month');
          }
          return false;
        }
        
        // Format month as YYYY-MM
        const month = monthResponse.data!.padStart(2, '0');
        element.value = `${yearResponse.data!}-${month}`;
        break;
        
      case 'week':
        // Use the provided function or default to year + number range
        const weekFunc = gofakeitFunc === 'true' ? 'date' : gofakeitFunc;
        
        if (weekFunc === 'date' || weekFunc.startsWith('daterange')) {
          // Use date/daterange function and extract week from the result
          const weekDateResponse = await fetchGofakeitData(weekFunc);
          
          if (!weekDateResponse.success) {
            console.warn('[Gofakeit Autofill] Error getting date for week:', weekDateResponse.error);
            if (weekDateResponse.status === 400) {
              handleError(element, 'Failed to get random week');
            }
            return false;
          }
          
          // Parse the ISO date string and extract week
          try {
            const dateString = weekDateResponse.data!;
            const dateMatch = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              const date = new Date(dateMatch[1]);
              const year = date.getFullYear();
              const week = getISOWeek(date);
              element.value = `${year}-W${week.toString().padStart(2, '0')}`;
            } else {
              console.warn('[Gofakeit Autofill] Could not parse date for week from response:', dateString);
              return false;
            }
          } catch (error) {
            console.warn('[Gofakeit Autofill] Error parsing date for week:', error);
            return false;
          }
        } else {
          // Use gofakeit year and number range for week (1-53)
          const weekYearResponse = await fetchGofakeitData('year');
          const weekResponse = await fetchGofakeitData('number?min=1&max=53');
          
          if (!weekYearResponse.success || !weekResponse.success) {
            console.warn('[Gofakeit Autofill] Error getting year or week:', weekYearResponse.error || weekResponse.error);
            if (weekYearResponse.status === 400 || weekResponse.status === 400) {
              handleError(element, 'Failed to get random week');
            }
            return false;
          }
          
          // Format week as YYYY-W## (ISO week format)
          const week = weekResponse.data!.padStart(2, '0');
          element.value = `${weekYearResponse.data!}-W${week}`;
        }
        break;
        
      default:
        console.warn('[Gofakeit Autofill] Unknown date/time input type:', inputType);
        return false;
    }
    
    // Trigger events to ensure any listeners are notified
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    return true;
    
  } catch (error) {
    console.warn(`[Gofakeit Autofill] Unexpected error handling ${inputType} input:`, error);
    return false;
  }
}
