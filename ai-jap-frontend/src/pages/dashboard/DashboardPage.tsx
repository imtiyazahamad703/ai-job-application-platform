import { useAuth } from '../../context/AuthContext';
import { Briefcase, FileCheck2, TrendingUp, Sparkles } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Applications', value: '0', icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'AI Interviews', value: '0', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Resumes Analyzed', value: '0', icon: FileCheck2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Success Rate', value: '0%', icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  ];

  return (
    <div className="space-y-8 pb-12 pt-4">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, <span className="text-foreground font-medium">{user?.email}</span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:bg-white/[0.12] transition-colors cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div>
              <h3 className="text-4xl font-bold mb-1 group-hover:scale-105 transition-transform origin-left">{stat.value}</h3>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Applications Yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              Your AI agent is ready to start applying. Upload a resume and complete your profile to get started.
            </p>
            <button className="btn-primary">Start Job Search</button>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <h3 className="text-lg font-semibold mb-6">Recent Activity</h3>
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-white/5 rounded-xl">
            Activity log empty
          </div>
        </div>
      </div>
    </div>
  );
}
