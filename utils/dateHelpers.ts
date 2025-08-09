export const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

export const formatDateForDisplay = (dateString: string): string => {
  // Assume calendar_id is in YYYYMMDD format
  if (dateString.length === 8) {
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    return `${day}/${month}/${year}`;
  }
  return dateString;
};

export const parseCalendarId = (calendarId: number): string => {
  const dateStr = calendarId.toString();
  if (dateStr.length === 8) {
    return formatDateForDisplay(dateStr);
  }
  return dateStr;
};

export const isValidDateRange = (startDate: Date, endDate: Date): boolean => {
  return startDate <= endDate && endDate <= new Date();
};