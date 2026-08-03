import { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, ExternalLink, Loader2, Play } from 'lucide-react';
import { api } from '../../services/api.service';

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  platform: string;
  isRemote: boolean;
  status: string;
  createdAt: string;
}

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs');
      if (res.data?.jobs) setJobs(res.data.jobs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerSearch = async () => {
    setSearching(true);
    try {
      await api.post('/jobs/search');
      await fetchJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 pt-4">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Search</h1>
          <p className="text-muted-foreground mt-2">
            View jobs collected by the platform based on your profile skills.
          </p>
        </div>
        <button
          onClick={triggerSearch}
          disabled={searching}
          className="btn-primary flex items-center space-x-2"
        >
          {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          <span>{searching ? 'Scraping...' : 'Run Manual Search'}</span>
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : jobs.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border-dashed border-2">
          <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No jobs found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">Click 'Run Manual Search' to scrape jobs using your profile skills and headline.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {jobs.map(job => (
            <div key={job._id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-1 rounded-full border border-primary/30 uppercase tracking-wider">
                  {job.platform}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold leading-tight pr-20">{job.title}</h3>
                <div className="flex items-center space-x-2 mt-3 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm font-medium">{job.company}</span>
                </div>
                <div className="flex items-center space-x-2 mt-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{job.location} {job.isRemote && '(Remote)'}</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Found {new Date(job.createdAt).toLocaleDateString()}</span>
                <a href={job.url} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-foreground transition-colors flex items-center text-sm font-medium">
                  View Job <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
