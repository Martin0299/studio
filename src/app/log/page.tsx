import LogEntryForm from '@/components/log/log-entry-form';
import { parseISO, isValid, startOfDay } from 'date-fns';

export default function LogPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Get date from query params or default to today
  const dateParam = searchParams?.date as string | undefined;
  let selectedDate = startOfDay(new Date()); // Default to today, ensuring time is 00:00:00

  if (dateParam) {
    // Parse the date string, ensuring it's treated as local timezone
    // parseISO handles 'yyyy-MM-dd' correctly
    const parsedDate = parseISO(dateParam);
    if (isValid(parsedDate)) {
      selectedDate = startOfDay(parsedDate); // Use parsed date, ensuring time is 00:00:00
    } else {
      console.warn(`Invalid date parameter received: ${dateParam}. Defaulting to today.`);
    }
  }


  return (
    <div className="container mx-auto py-6 px-4 max-w-md">
      <LogEntryForm selectedDate={selectedDate} />
    </div>
  );
}
