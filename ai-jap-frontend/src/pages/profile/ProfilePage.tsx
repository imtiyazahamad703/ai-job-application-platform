import { useState, useEffect } from 'react';
import { User, Briefcase, Loader2 } from 'lucide-react';
import { api } from '../../services/api.service';

export function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    headline: '',
    linkedinUrl: '',
    githubUrl: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profile');
        if (res.data) setProfile(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/profile', profile);
      // Show success toast here
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 pb-12 pt-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Professional Profile</h1>
        <p className="text-muted-foreground mt-2">
          Complete your profile to help our AI agents find the perfect jobs for you.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-3xl space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-6 flex items-center"><User className="mr-2 text-primary w-5 h-5" /> Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">First Name</label>
              <input type="text" name="firstName" value={profile.firstName || ''} onChange={handleChange} className="input-field px-3 bg-white/5" placeholder="John" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Last Name</label>
              <input type="text" name="lastName" value={profile.lastName || ''} onChange={handleChange} className="input-field px-3 bg-white/5" placeholder="Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
              <input type="tel" name="phone" value={profile.phone || ''} onChange={handleChange} className="input-field px-3 bg-white/5" placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Professional Headline</label>
              <input type="text" name="headline" value={profile.headline || ''} onChange={handleChange} className="input-field px-3 bg-white/5" placeholder="Senior Software Engineer" />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-xl font-semibold mb-6 flex items-center"><Briefcase className="mr-2 text-primary w-5 h-5" /> Social Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">LinkedIn URL</label>
              <input type="url" name="linkedinUrl" value={profile.linkedinUrl || ''} onChange={handleChange} className="input-field px-3 bg-white/5" placeholder="https://linkedin.com/in/johndoe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">GitHub URL</label>
              <input type="url" name="githubUrl" value={profile.githubUrl || ''} onChange={handleChange} className="input-field px-3 bg-white/5" placeholder="https://github.com/johndoe" />
            </div>
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary min-w-[120px]">
            {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
