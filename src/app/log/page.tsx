
import LogEntryForm from '@/components/log/log-entry-form';
import { parseISO, isValid, startOfDay } from 'date-fns';

interface LogPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function LogPage(props: LogPageProps) {
  // Access searchParams via props.searchParams to minimize direct manipulation
  // of the prop object that might trigger Next.js dev warnings.
  const dateParam = (props.searchParams && typeof props.searchParams.date === 'string')
    ? props.searchParams.date
    : undefined;

  let selectedDate = startOfDay(new Date()); // Default to today, ensuring time is 00:00:00

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
