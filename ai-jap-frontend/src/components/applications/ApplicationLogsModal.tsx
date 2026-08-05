import React, { useEffect, useRef } from 'react';
import { Application } from '../../services/applications.service';

interface ApplicationLogsModalProps {
  application: Application;
  onClose: () => void;
}

const ApplicationLogsModal: React.FC<ApplicationLogsModalProps> = ({ application, onClose }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [application.logs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-white">Execution Logs</h2>
            <p className="text-sm text-slate-400 mt-1">
              {application.jobId?.company} - {application.jobId?.title}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Logs Terminal */}
        <div className="p-6 overflow-y-auto bg-black font-mono text-sm leading-relaxed flex-1">
          {application.logs.length === 0 ? (
            <div className="text-slate-500 italic">No logs available yet...</div>
          ) : (
            <div className="space-y-2">
              {application.logs.map((log, index) => {
                // Colorize logs slightly based on keywords
                let colorClass = 'text-slate-300';
                if (log.toLowerCase().includes('error') || log.toLowerCase().includes('failed')) colorClass = 'text-red-400';
                else if (log.toLowerCase().includes('success') || log.toLowerCase().includes('applied')) colorClass = 'text-green-400';
                else if (log.toLowerCase().includes('warning')) colorClass = 'text-yellow-400';
                else if (log.includes('---')) colorClass = 'text-blue-400 font-bold';

                return (
                  <div key={index} className={`break-words ${colorClass}`}>
                    <span className="text-slate-600 mr-3">[{String(index + 1).padStart(3, '0')}]</span>
                    {log}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-slate-900 flex justify-between items-center">
          <div className="text-sm text-slate-500">
            Status: <span className="text-white font-medium">{application.status}</span>
          </div>
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationLogsModal;
