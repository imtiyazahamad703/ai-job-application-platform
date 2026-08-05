import React, { useState, useEffect } from 'react';
import { Application, applicationsService } from '../../../services/applications.service';
import ApplicationLogsModal from '../../../components/applications/ApplicationLogsModal';

const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppForLogs, setSelectedAppForLogs] = useState<Application | null>(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await applicationsService.getApplications();
      setApplications(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // Auto-refresh every 10 seconds for real-time status updates
    const interval = setInterval(fetchApplications, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">Pending</span>;
      case 'PROCESSING':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30 animate-pulse">Processing</span>;
      case 'APPLIED':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">Applied</span>;
      case 'FAILED':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">Failed</span>;
      default:
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full border border-gray-500/30">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Application Tracking</h1>
        <button 
          onClick={fetchApplications}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors border border-white/10"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-sm border-b border-white/5">
                <th className="p-4 font-medium">Company</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Platform</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    Loading applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No applications found. Trigger an Auto-Apply from the Jobs page!
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 font-medium text-white">{app.jobId?.company || 'Unknown Company'}</td>
                    <td className="p-4 text-slate-300">{app.jobId?.title || 'Unknown Role'}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-white/5 text-slate-300 text-xs rounded-lg border border-white/10">
                        {app.platform}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedAppForLogs(app)}
                        className="text-sm px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        View Logs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAppForLogs && (
        <ApplicationLogsModal 
          application={selectedAppForLogs} 
          onClose={() => setSelectedAppForLogs(null)} 
        />
      )}
    </div>
  );
};

export default ApplicationsPage;
