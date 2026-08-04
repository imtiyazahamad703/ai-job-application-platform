import { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2, History, Sparkles, ChevronDown } from 'lucide-react';
import { api } from '../../services/api.service';

interface TechCategory {
  programmingLanguages: string[];
  backendFrameworks: string[];
  frontendFrameworks: string[];
  databases: string[];
  cloud: string[];
  devOps: string[];
  aiLlm: string[];
}

interface SearchPersona {
  _id: string;
  personaName: string;
  version: number;
  desiredJobTitles: string[];
  locations: string[];
  workMode: string[];
  jobType: string[];
  mandatoryTech: TechCategory;
  minimumRequiredMatch: number;
  preferredTech: TechCategory;
  excludedTech: string[];
  excludedKeywords: string[];
  isActive: boolean;
}

const emptyCategory: TechCategory = {
  programmingLanguages: [],
  backendFrameworks: [],
  frontendFrameworks: [],
  databases: [],
  cloud: [],
  devOps: [],
  aiLlm: [],
};

const emptyPersona: Partial<SearchPersona> = {
  personaName: '',
  desiredJobTitles: [],
  locations: [],
  workMode: [],
  jobType: [],
  mandatoryTech: { ...emptyCategory },
  minimumRequiredMatch: 1,
  preferredTech: { ...emptyCategory },
  excludedTech: [],
  excludedKeywords: [],
};

export function JobPreferencesPage() {
  const [personas, setPersonas] = useState<SearchPersona[]>([]);
  const [activePersona, setActivePersona] = useState<Partial<SearchPersona> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [showGenerateOptions, setShowGenerateOptions] = useState(false);

  const [targetRole, setTargetRole] = useState('');

  const [inputs, setInputs] = useState({
    title: '',
    location: '',
    mandatoryLang: '',
    mandatoryBack: '',
    prefBack: '',
    exclude: ''
  });

  useEffect(() => {
    fetchPersonas();
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resume');
      setResumes(res.data.resumes || []);
      if (res.data.resumes?.length > 0) {
        setSelectedResumeId(res.data.resumes[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch resumes', err);
    }
  };

  const fetchPersonas = async () => {
    try {
      const res = await api.get('/jobs/personas');
      setPersonas(res.data);
      if (res.data.length > 0) {
        setActivePersona(res.data[0]);
      } else {
        setActivePersona({ ...emptyPersona, personaName: 'Default Persona' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedResumeId) return;
    setGenerating(true);
    try {
      const res = await api.post(`/jobs/personas/generate-from-resume/${selectedResumeId}`, {
        targetRole: targetRole || undefined
      });
      // The backend returns a full object, we merge it over the empty persona
      setActivePersona({
        ...emptyPersona,
        ...res.data,
      });
      setShowGenerateOptions(false);
    } catch (err) {
      console.error('Failed to generate persona', err);
      alert('Failed to generate persona from resume. Please ensure the resume is parsed correctly.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!activePersona) return;
    setSaving(true);
    try {
      if (activePersona._id) {
        // Update (creates new version in backend)
        const res = await api.put(`/jobs/personas/${activePersona._id}`, activePersona);
        setActivePersona(res.data);
      } else {
        // Create
        const res = await api.post('/jobs/personas', activePersona);
        setActivePersona(res.data);
      }
      await fetchPersonas(); // refresh list
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/jobs/personas/${id}`);
      fetchPersonas();
    } catch (err) {
      console.error(err);
    }
  };

  const updateActive = (updates: any) => {
    setActivePersona(prev => ({ ...prev, ...updates }));
  };

  const addArrayItem = (field: keyof SearchPersona, inputField: keyof typeof inputs) => {
    const val = inputs[inputField].trim();
    if (val && activePersona) {
      const current = (activePersona[field] as string[]) || [];
      if (!current.includes(val)) {
        updateActive({ [field]: [...current, val] });
        setInputs(prev => ({ ...prev, [inputField]: '' }));
      }
    }
  };

  const addNestedArrayItem = (parent: 'mandatoryTech' | 'preferredTech', child: keyof TechCategory, inputField: keyof typeof inputs) => {
    const val = inputs[inputField].trim();
    if (val && activePersona && activePersona[parent]) {
      const current = activePersona[parent]![child] || [];
      if (!current.includes(val)) {
        updateActive({ 
          [parent]: {
            ...activePersona[parent],
            [child]: [...current, val]
          }
        });
        setInputs(prev => ({ ...prev, [inputField]: '' }));
      }
    }
  };

  const removeArrayItem = (field: keyof SearchPersona, index: number) => {
    if (activePersona) {
      const current = (activePersona[field] as string[]) || [];
      updateActive({ [field]: current.filter((_, i) => i !== index) });
    }
  };

  const removeNestedArrayItem = (parent: 'mandatoryTech' | 'preferredTech', child: keyof TechCategory, index: number) => {
    if (activePersona && activePersona[parent]) {
      const current = activePersona[parent]![child] || [];
      updateActive({ 
        [parent]: {
          ...activePersona[parent],
          [child]: current.filter((_, i) => i !== index)
        }
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 pb-12 pt-4 max-w-6xl flex flex-col md:flex-row gap-8">
      
      {/* Sidebar: List of Personas */}
      <div className="w-full md:w-64 space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Personas</h2>
        <button 
          onClick={() => setActivePersona({ ...emptyPersona, personaName: 'New Persona' })}
          className="w-full btn-secondary py-2 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Persona
        </button>
        
        <div className="space-y-2">
          {personas.map(p => (
            <div 
              key={p._id} 
              onClick={() => setActivePersona(p)}
              className={`p-3 rounded-xl cursor-pointer border transition-colors ${activePersona?._id === p._id ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{p.personaName}</span>
                {activePersona?._id === p._id && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(p._id); }} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1">
                <History className="w-3 h-3" /> Version {p.version}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Edit Persona */}
      <div className="flex-1 space-y-6">
        {activePersona ? (
          <div className="glass-panel p-8 rounded-3xl space-y-8">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <input 
                type="text" 
                value={activePersona.personaName}
                onChange={e => updateActive({ personaName: e.target.value })}
                className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-white/30 focus:border-primary outline-none px-2 py-1"
                placeholder="Persona Name"
              />
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <button 
                    onClick={() => setShowGenerateOptions(!showGenerateOptions)}
                    className="btn-secondary flex items-center space-x-2 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Auto-Generate</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showGenerateOptions && (
                    <div className="absolute right-0 mt-2 w-72 glass-panel border border-white/10 rounded-xl p-4 z-50 shadow-xl">
                      <p className="text-xs text-muted-foreground mb-1">Select Resume:</p>
                      <select 
                        value={selectedResumeId}
                        onChange={e => setSelectedResumeId(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg text-sm p-2 mb-3 outline-none focus:border-primary"
                      >
                        <option value="" disabled>Select a resume...</option>
                        {resumes.map(r => (
                          <option key={r._id} value={r._id}>{r.label || r.originalFilename}</option>
                        ))}
                      </select>

                      <p className="text-xs text-muted-foreground mb-1">Target Stack / Role (Optional):</p>
                      <input 
                        type="text"
                        placeholder="e.g. Java Backend, MERN Stack"
                        value={targetRole}
                        onChange={e => setTargetRole(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg text-sm p-2 mb-4 outline-none focus:border-primary text-white placeholder-white/30"
                      />

                      <button 
                        onClick={handleGenerate}
                        disabled={generating || !selectedResumeId}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center space-x-2 disabled:opacity-50"
                      >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>{generating ? 'Generating...' : 'Extract Persona'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="btn-primary flex items-center space-x-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? 'Saving...' : (activePersona._id ? 'Save New Version' : 'Create')}</span>
                </button>
              </div>
            </div>

            {/* AI Role Summary */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
              <label className="text-sm font-medium text-primary block mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> AI Role Summary
              </label>
              <textarea
                value={activePersona.aiRoleSummary || ''}
                onChange={e => updateActive({ aiRoleSummary: e.target.value })}
                placeholder="A brief summary of your expertise and domain..."
                className="w-full bg-transparent border border-white/10 hover:border-white/30 focus:border-primary rounded-lg p-3 outline-none text-sm text-white/80 resize-none h-24"
              />
              <p className="text-xs text-muted-foreground mt-2">This summary is used by the AI to evaluate how well your profile aligns with job descriptions semantically.</p>
            </div>

            {/* Broad Search config */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">1. Broad Search</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">Desired Job Titles</label>
                  <div className="flex space-x-2 mb-3">
                    <input 
                      type="text" 
                      list="job-titles"
                      value={inputs.title} 
                      onChange={e => setInputs(prev => ({ ...prev, title: e.target.value }))} 
                      onKeyDown={e => e.key === 'Enter' && addArrayItem('desiredJobTitles', 'title')} 
                      placeholder="e.g. AI Engineer" 
                      className="input-field px-3 bg-white/5 flex-1" 
                    />
                    <datalist id="job-titles">
                      <option value="AI Engineer" />
                      <option value="Full Stack AI Engineer" />
                      <option value="Generative AI Engineer" />
                      <option value="LLM Engineer" />
                      <option value="Full Stack Developer" />
                      <option value="MERN Stack Developer" />
                      <option value="MERN Full Stack Developer" />
                      <option value="Java Full Stack Developer" />
                      <option value="Java Backend Engineer" />
                      <option value="Java Developer" />
                      <option value="Node.js Backend Engineer" />
                      <option value="NestJS Developer" />
                    </datalist>
                    <button onClick={() => addArrayItem('desiredJobTitles', 'title')} className="btn-secondary px-4">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activePersona.desiredJobTitles?.map((t, i) => (
                      <span key={i} className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm flex items-center">
                        {t} <button onClick={() => removeArrayItem('desiredJobTitles', i)} className="ml-2 hover:text-white">&times;</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">Locations</label>
                  <div className="flex space-x-2 mb-3">
                    <input type="text" value={inputs.location} onChange={e => setInputs(prev => ({ ...prev, location: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addArrayItem('locations', 'location')} placeholder="Worldwide" className="input-field px-3 bg-white/5 flex-1" />
                    <button onClick={() => addArrayItem('locations', 'location')} className="btn-secondary px-4">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activePersona.locations?.map((l, i) => (
                      <span key={i} className="bg-white/10 text-white px-3 py-1 rounded-full text-sm flex items-center">
                        {l} <button onClick={() => removeArrayItem('locations', i)} className="ml-2 hover:text-white">&times;</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Core Stack */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">2. Deterministic Filtering (Core Stack)</h3>
              
              <div className="mb-6 p-4 border border-red-500/30 bg-red-500/5 rounded-xl">
                <label className="text-sm font-medium text-red-200 block mb-2">Excluded Technologies (Hard Reject)</label>
                <div className="flex space-x-2 mb-3">
                  <input 
                    type="text" 
                    list="excluded-technologies"
                    value={inputs.exclude} 
                    onChange={e => setInputs(prev => ({ ...prev, exclude: e.target.value }))} 
                    onKeyDown={e => e.key === 'Enter' && addArrayItem('excludedTech', 'exclude')} 
                    placeholder="e.g. PHP, Laravel" 
                    className="input-field px-3 bg-red-500/10 border-red-500/30 flex-1" 
                  />
                  <datalist id="excluded-technologies">
                    <option value="PHP" />
                    <option value="Laravel" />
                    <option value="Ruby" />
                    <option value="Ruby on Rails" />
                    <option value=".NET" />
                    <option value="C#" />
                    <option value="Angular" />
                    <option value="Vue" />
                    <option value="Django" />
                    <option value="C++" />
                  </datalist>
                  <button onClick={() => addArrayItem('excludedTech', 'exclude')} className="btn-secondary px-4 border-red-500/30 text-red-300">Exclude</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activePersona.excludedTech?.map((t, i) => (
                    <span key={i} className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm flex items-center">
                      {t} <button onClick={() => removeArrayItem('excludedTech', i)} className="ml-2 hover:text-white">&times;</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Mandatory */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-green-400">Mandatory Match</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <span>Min req:</span>
                      <input 
                        type="number" 
                        min="1" 
                        value={activePersona.minimumRequiredMatch} 
                        onChange={e => updateActive({ minimumRequiredMatch: parseInt(e.target.value) || 1 })}
                        className="w-16 input-field py-1 px-2 text-center bg-white/5" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Backend Frameworks</label>
                    <div className="flex space-x-2 mb-2">
                      <input 
                        type="text" 
                        list="backend-frameworks"
                        value={inputs.mandatoryBack} 
                        onChange={e => setInputs(prev => ({ ...prev, mandatoryBack: e.target.value }))} 
                        onKeyDown={e => e.key === 'Enter' && addNestedArrayItem('mandatoryTech', 'backendFrameworks', 'mandatoryBack')} 
                        placeholder="e.g. NestJS" 
                        className="input-field py-1 px-3 text-sm bg-white/5 flex-1" 
                      />
                      <datalist id="backend-frameworks">
                        <option value="NestJS" />
                        <option value="Spring Boot" />
                        <option value="Express" />
                        <option value="Django" />
                        <option value="Flask" />
                        <option value="Laravel" />
                        <option value=".NET" />
                      </datalist>
                      <button onClick={() => addNestedArrayItem('mandatoryTech', 'backendFrameworks', 'mandatoryBack')} className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 text-sm">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activePersona.mandatoryTech?.backendFrameworks?.map((t, i) => (
                        <span key={i} className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full text-xs flex items-center">
                          {t} <button onClick={() => removeNestedArrayItem('mandatoryTech', 'backendFrameworks', i)} className="ml-1 hover:text-white">&times;</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Languages</label>
                    <div className="flex space-x-2 mb-2">
                      <input 
                        type="text" 
                        list="programming-languages"
                        value={inputs.mandatoryLang} 
                        onChange={e => setInputs(prev => ({ ...prev, mandatoryLang: e.target.value }))} 
                        onKeyDown={e => e.key === 'Enter' && addNestedArrayItem('mandatoryTech', 'programmingLanguages', 'mandatoryLang')} 
                        placeholder="e.g. TypeScript" 
                        className="input-field py-1 px-3 text-sm bg-white/5 flex-1" 
                      />
                      <datalist id="programming-languages">
                        <option value="TypeScript" />
                        <option value="JavaScript" />
                        <option value="Python" />
                        <option value="Java" />
                        <option value="Go" />
                        <option value="C++" />
                        <option value="Ruby" />
                      </datalist>
                      <button onClick={() => addNestedArrayItem('mandatoryTech', 'programmingLanguages', 'mandatoryLang')} className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 text-sm">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activePersona.mandatoryTech?.programmingLanguages?.map((t, i) => (
                        <span key={i} className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full text-xs flex items-center">
                          {t} <button onClick={() => removeNestedArrayItem('mandatoryTech', 'programmingLanguages', i)} className="ml-1 hover:text-white">&times;</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preferred */}
                <div className="space-y-4">
                  <h4 className="font-medium text-blue-400">Preferred Tech (Ranking Boost)</h4>
                  
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Backend Frameworks</label>
                    <div className="flex space-x-2 mb-2">
                      <input 
                        type="text" 
                        list="backend-frameworks"
                        value={inputs.prefBack} 
                        onChange={e => setInputs(prev => ({ ...prev, prefBack: e.target.value }))} 
                        onKeyDown={e => e.key === 'Enter' && addNestedArrayItem('preferredTech', 'backendFrameworks', 'prefBack')} 
                        placeholder="e.g. Spring Boot" 
                        className="input-field py-1 px-3 text-sm bg-white/5 flex-1" 
                      />
                      <button onClick={() => addNestedArrayItem('preferredTech', 'backendFrameworks', 'prefBack')} className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 text-sm">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activePersona.preferredTech?.backendFrameworks?.map((t, i) => (
                        <span key={i} className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full text-xs flex items-center">
                          {t} <button onClick={() => removeNestedArrayItem('preferredTech', 'backendFrameworks', i)} className="ml-1 hover:text-white">&times;</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="glass-panel p-8 rounded-3xl text-center text-muted-foreground">
            Select a persona to edit or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}
