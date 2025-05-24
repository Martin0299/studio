
import LogEntryForm from '@/components/log/log-entry-form';
import { parseISO, isValid, startOfDay } from 'date-fns';

export default function LogPage({
  searchParams: initialSearchParams, // Rename to make it clear we're processing it
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Create a new, plain object containing only the 'date' parameter, if it exists.
  // This is a defensive measure to ensure we are not inadvertently working with
  // a proxied 'searchParams' object that might trigger enumeration warnings downstream
  // by Next.js internals or third-party scripts.
  const relevantParams: { date?: string } = {};
  if (initialSearchParams && typeof initialSearchParams.date === 'string') {
    relevantParams.date = initialSearchParams.date;
  }

  const dateParam = relevantParams.date;
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
