import { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api.service';

interface Resume {
  _id: string;
  originalFilename: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
}

export function ResumePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resume');
      setResumes(res.data.resumes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('label', 'Default Resume');

    setUploading(true);
    try {
      await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFile(null);
      await fetchResumes();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    try {
      await api.delete(`/resume/${id}`);
      setResumes(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-12 pt-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Resume Management</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage multiple resumes. Our AI will automatically select the best match for each job.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleUpload} className="glass-panel p-6 rounded-3xl sticky top-8">
            <h2 className="text-xl font-semibold mb-6">Upload Resume</h2>
            
            <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:bg-white/5 transition-colors group cursor-pointer relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-10 h-10 mx-auto text-primary mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">PDF, DOCX up to 5MB</p>
              {file && (
                <div className="mt-4 p-2 bg-primary/20 text-primary rounded-lg text-sm truncate font-medium border border-primary/30">
                  Selected: {file.name}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="btn-primary w-full mt-6 h-12"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Upload to Vault'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold mb-6">Your Resumes ({resumes.length})</h2>
          
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : resumes.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl text-center border-dashed border-2">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No resumes found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">Upload your first resume to start matching with jobs and generating tailored cover letters.</p>
            </div>
          ) : (
            resumes.map((resume) => (
              <div key={resume._id} className="glass-panel p-5 rounded-2xl flex items-center justify-between hover:bg-white/[0.08] transition-colors group">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-lg flex items-center">
                      {resume.originalFilename}
                      {resume.isDefault && (
                        <span className="ml-3 inline-flex items-center text-xs font-medium bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Default
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">Uploaded on {new Date(resume.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDelete(resume._id)} className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
