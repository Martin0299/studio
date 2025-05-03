import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the calendar page by default
  redirect('/calendar');
}
