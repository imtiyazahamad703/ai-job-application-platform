import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-dark-bg text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 ml-64 overflow-y-auto h-screen animate-in">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
