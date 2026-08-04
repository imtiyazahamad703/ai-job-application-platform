import { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, ExternalLink, Loader2, Play, CheckCircle2, XCircle, Info } from 'lucide-react';
import { api } from '../../services/api.service';

interface StructuredExplanation {
  titleMatch: string;
  mandatoryMatches: string[];
  preferredMatches: string[];
  reasoning: string;
}

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  platform: string;
  isRemote: boolean;
  status: string;
  matchScore?: number;
  structuredExplanation?: StructuredExplanation;
  createdAt: string;
}

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchJobs(1);
  }, []);

  const fetchJobs = async (pageNumber: number = 1, append: boolean = false) => {
    if (pageNumber === 1) setLoading(true);
    else setLoadingMore(true);
    
    try {
      const limit = 20;
      const skip = (pageNumber - 1) * limit;
      let url = `/jobs?limit=${limit}&skip=${skip}`;
      if (locationFilter) {
        url += `&location=${encodeURIComponent(locationFilter)}`;
      }
      const res = await api.get(url);
      
      if (res.data) {
        const fetchedJobs = res.data.jobs || [];
        setTotalCount(res.data.totalCount || 0);
        setJobs(fetchedJobs);
        
        if (fetchedJobs.length < limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const triggerSearch = async () => {
    setSearching(true);
    try {
      await api.post('/jobs/search');
      setPage(1);
      setHasMore(true);
      await fetchJobs(1, false);
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
            View jobs collected by the platform based on your active Search Personas.
          </p>
        </div>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Filter by city..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                fetchJobs(1);
              }
            }}
            className="glass-input px-4 py-2 rounded-xl text-sm"
          />
          <button
            onClick={triggerSearch}
            disabled={searching}
            className="btn-primary flex items-center space-x-2"
          >
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            <span>{searching ? 'Searching & Filtering...' : 'Run Manual Search'}</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : jobs.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border-dashed border-2 border-white/20">
          <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No relevant jobs found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">Click 'Run Manual Search' to scrape and filter jobs using your Search Personas.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map(job => (
            <div key={job._id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between group relative overflow-hidden transition-all hover:bg-white/[0.04]">
              {/* Score Badge */}
              {job.matchScore !== undefined && (
                <div className={`absolute top-0 right-0 px-3 py-1.5 rounded-bl-xl font-bold text-sm border-b border-l ${job.matchScore >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/30' : job.matchScore >= 60 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                  {Math.round(job.matchScore)}% Match
                </div>
              )}

              <div>
                <h3 className="text-xl font-semibold leading-tight pr-20 mb-2">{job.title}</h3>
                <div className="flex items-center space-x-4 text-muted-foreground">
                  <div className="flex items-center space-x-1.5">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{job.company}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm">{job.location}</span>
                  </div>
                </div>
              </div>

              {/* Explainability Section */}
              {job.structuredExplanation && (
                <div className="mt-5 pt-4 border-t border-white/10">
                  <button 
                    onClick={() => setExpandedJobId(expandedJobId === job._id ? null : job._id)}
                    className="flex items-center text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Why did this match?
                  </button>
                  
                  {expandedJobId === job._id && (
                    <div className="mt-4 space-y-3 bg-black/40 p-4 rounded-xl border border-white/5 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">Mandatory Tech Met</span>
                        <div className="flex flex-wrap gap-1.5">
                          {job.structuredExplanation.mandatoryMatches?.length > 0 ? (
                            job.structuredExplanation.mandatoryMatches.map((m, i) => (
                              <span key={i} className="flex items-center text-green-300 bg-green-500/10 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> {m}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic">None found</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">Preferred Tech Found</span>
                        <div className="flex flex-wrap gap-1.5">
                          {job.structuredExplanation.preferredMatches?.length > 0 ? (
                            job.structuredExplanation.preferredMatches.map((m, i) => (
                              <span key={i} className="flex items-center text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> {m}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic">None found</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">AI Reasoning</span>
                        <p className="text-gray-300 italic">"{job.structuredExplanation.reasoning}"</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Found {new Date(job.createdAt).toLocaleDateString()}</span>
                <div className="flex space-x-3">
                  <button
                    onClick={async () => {
                      try {
                        // TODO: Add proper state loading per job id
                        alert('Starting auto-application in the background... Watch your backend logs!');
                        const token = localStorage.getItem('token');
                        const res = await fetch(`http://localhost:3000/api/v1/automation/auto-apply/${job._id}`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        if (!res.ok) {
                          const err = await res.json();
                          alert(`Auto-apply failed: ${err.message}`);
                        } else {
                          alert('Auto-apply completed successfully!');
                        }
                      } catch (e) {
                        alert('Failed to trigger auto-apply');
                      }
                    }}
                    className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 px-4 py-1.5 rounded-lg transition-colors flex items-center text-sm font-medium"
                  >
                    Auto Apply 🤖
                  </button>
                  <a href={job.url} target="_blank" rel="noreferrer" className="bg-primary/20 hover:bg-primary/30 text-primary px-4 py-1.5 rounded-lg transition-colors flex items-center text-sm font-medium">
                    Manual Apply <ExternalLink className="w-4 h-4 ml-1.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination: Next/Previous */}
        <div className="flex justify-between items-center mt-10 px-4">
          <button 
            onClick={() => {
              const prevPage = Math.max(1, page - 1);
              setPage(prevPage);
              fetchJobs(prevPage);
            }} 
            disabled={page === 1 || loadingMore}
            className="btn-secondary px-6 py-2 flex items-center space-x-2 border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Previous</span>
          </button>
          
          <span className="text-muted-foreground text-sm font-medium">
            Page {page} (from {totalCount} total jobs)
          </span>
          
          <button 
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchJobs(nextPage);
            }} 
            disabled={!hasMore || loadingMore || (page * 20 >= totalCount)}
            className="btn-secondary px-6 py-2 flex items-center space-x-2 border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loadingMore ? 'Loading...' : 'Next'}</span>
          </button>
        </div>
      </>
      )}
    </div>
  );
}
