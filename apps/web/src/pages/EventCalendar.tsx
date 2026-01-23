import { Navigate } from 'react-router-dom';

/**
 * EventCalendar page - redirects to unified discovery view with calendar view
 * Maintains backward compatibility for /calendar route
 */
export default function EventCalendar() {
  return <Navigate to="/discover?view=calendar" replace />;
}
