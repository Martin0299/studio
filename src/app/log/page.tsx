
import LogEntryForm from '@/components/log/log-entry-form';
import { parseISO, isValid, startOfDay } from 'date-fns';

interface LogPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function LogPage(props: LogPageProps) {
  let dateParam: string | undefined = undefined;

  // Explicitly check if searchParams exists and then access the 'date' property using bracket notation.
  if (props.searchParams && typeof props.searchParams['date'] === 'string') {
    dateParam = props.searchParams['date'];
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
