
import LogEntryForm from '@/components/log/log-entry-form';
import { parseISO, isValid, startOfDay } from 'date-fns';

interface LogPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function LogPage(props: LogPageProps) {
  let dateParam: string | undefined = undefined;
  const currentSearchParams = props.searchParams; // Explicitly assign to a local constant

  // Directly access the 'date' property if currentSearchParams and its 'date' property exist and are strings
  if (currentSearchParams && typeof currentSearchParams['date'] === 'string') {
    dateParam = currentSearchParams['date'];
  }

  let selectedDate = startOfDay(new Date()); // Default to today

  if (dateParam) {
    // Parse the date string, ensuring it's treated as local timezone
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
