import LogEntryForm from '@/components/log/log-entry-form';

export default function LogPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Get date from query params or default to today
  const dateParam = searchParams?.date as string | undefined;
  const selectedDate = dateParam ? new Date(dateParam + 'T00:00:00') : new Date(); // Adjust for potential timezone issues

  return (
    <div className="container mx-auto py-6 px-4 max-w-md">
      <LogEntryForm selectedDate={selectedDate} />
    </div>
  );
}
