import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { api } from '../../services/api.service';

interface JobSearchPreference {
  desiredJobTitles: string[];
  preferredLocations: string[];
  workMode: string[];
  employmentType: string[];
  experienceLevel: string;
  includeKeywords: string[];
}

const WORK_MODES = ['Remote', 'Hybrid', 'Onsite'];
const EMPLOYMENT_TYPES = ['Full Time', 'Contract', 'Internship', 'Part Time'];

export function JobPreferencesPage() {
  const [preferences, setPreferences] = useState<JobSearchPreference>({
    desiredJobTitles: [],
    preferredLocations: [],
    workMode: [],
    employmentType: [],
    experienceLevel: '',
    includeKeywords: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Temporary inputs for array fields
  const [inputs, setInputs] = useState({
    title: '',
    location: '',
    keyword: ''
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await api.get('/jobs/preferences');
      if (res.data) setPreferences(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/jobs/preferences', preferences);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addArrayItem = (field: keyof JobSearchPreference, inputField: keyof typeof inputs) => {
    const val = inputs[inputField].trim();
    if (val && !(preferences[field] as string[]).includes(val)) {
      setPreferences(prev => ({ ...prev, [field]: [...(prev[field] as string[]), val] }));
      setInputs(prev => ({ ...prev, [inputField]: '' }));
    }
  };

  const removeArrayItem = (field: keyof JobSearchPreference, index: number) => {
    setPreferences(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const toggleCheckbox = (field: keyof JobSearchPreference, value: string) => {
    setPreferences(prev => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 pb-12 pt-4 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Job Search Preferences</h1>
        <p className="text-muted-foreground mt-2">
          Configure precisely what kind of jobs the AI recruiter should find for you.
        </p>
      </header>

      <div className="glass-panel p-8 rounded-3xl space-y-8">
        
        {/* Desired Titles */}
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-2">Desired Job Titles</label>
          <div className="flex space-x-2 mb-3">
            <input 
              type="text" 
              value={inputs.title} 
              onChange={e => setInputs(prev => ({ ...prev, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addArrayItem('desiredJobTitles', 'title')}
              placeholder="e.g. React Developer" 
              className="input-field px-3 bg-white/5 flex-1"
            />
            <button onClick={() => addArrayItem('desiredJobTitles', 'title')} className="btn-secondary px-4">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {preferences.desiredJobTitles?.map((t, i) => (
              <span key={i} className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm flex items-center">
                {t} <button onClick={() => removeArrayItem('desiredJobTitles', i)} className="ml-2 hover:text-white">&times;</button>
              </span>
            ))}
          </div>
        </div>

        {/* Preferred Locations */}
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-2">Preferred Locations</label>
          <div className="flex space-x-2 mb-3">
            <input 
              type="text" 
              value={inputs.location} 
              onChange={e => setInputs(prev => ({ ...prev, location: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addArrayItem('preferredLocations', 'location')}
              placeholder="e.g. San Francisco, CA or Worldwide" 
              className="input-field px-3 bg-white/5 flex-1"
            />
            <button onClick={() => addArrayItem('preferredLocations', 'location')} className="btn-secondary px-4">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {preferences.preferredLocations?.map((l, i) => (
              <span key={i} className="bg-white/10 text-white px-3 py-1 rounded-full text-sm flex items-center">
                {l} <button onClick={() => removeArrayItem('preferredLocations', i)} className="ml-2 hover:text-white">&times;</button>
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Work Mode */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-3">Work Mode</label>
            <div className="space-y-2">
              {WORK_MODES.map(mode => (
                <label key={mode} className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={(preferences.workMode || []).includes(mode)}
                    onChange={() => toggleCheckbox('workMode', mode)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-dark-bg"
                  />
                  <span className="text-sm">{mode}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Employment Type */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-3">Employment Type</label>
            <div className="space-y-2">
              {EMPLOYMENT_TYPES.map(type => (
                <label key={type} className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={(preferences.employmentType || []).includes(type)}
                    onChange={() => toggleCheckbox('employmentType', type)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-dark-bg"
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* AI Include Keywords */}
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-2">Must-Have Keywords (AI Filter)</label>
          <div className="flex space-x-2 mb-3">
            <input 
              type="text" 
              value={inputs.keyword} 
              onChange={e => setInputs(prev => ({ ...prev, keyword: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addArrayItem('includeKeywords', 'keyword')}
              placeholder="e.g. Next.js, GraphQL" 
              className="input-field px-3 bg-white/5 flex-1"
            />
            <button onClick={() => addArrayItem('includeKeywords', 'keyword')} className="btn-secondary px-4">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {preferences.includeKeywords?.map((k, i) => (
              <span key={i} className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm flex items-center">
                {k} <button onClick={() => removeArrayItem('includeKeywords', i)} className="ml-2 hover:text-white">&times;</button>
              </span>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex justify-end">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="btn-primary flex items-center space-x-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
