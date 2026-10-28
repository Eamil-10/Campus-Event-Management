import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertCircle, Calendar, Clock, MapPin, Users, DollarSign, Tag, Building2, Eye } from 'lucide-react';

interface Department { id: string; name: string; code: string; }
interface Venue { id: string; name: string; type: string; capacity: number; location: string; status: string; }

interface FormState {
  title: string;
  description: string;
  category: string;
  departmentId: string;
  organizationId: string;
  venueId: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  capacity: string;
  budget: string;
  visibility: string;
  minCgpa: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  description: '',
  category: 'TECHNICAL',
  departmentId: '',
  organizationId: '',
  venueId: '',
  startTime: '',
  endTime: '',
  registrationDeadline: '',
  capacity: '100',
  budget: '0',
  visibility: 'UNIVERSITY_WIDE',
  minCgpa: '0',
};

const CATEGORIES = ['TECHNICAL', 'CULTURAL', 'WORKSHOP', 'SYMPOSIUM', 'SPORTS', 'ACADEMIC'];
const VISIBILITY_OPTIONS = [
  { value: 'UNIVERSITY_WIDE', label: 'University Wide — visible to all students' },
  { value: 'SELECTED_DEPARTMENT', label: 'Selected Department — restricted to department' },
  { value: 'PRIVATE', label: 'Private — invite only' },
];

export function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [serverError, setServerError] = useState('');

  // Prefill department from user profile
  useEffect(() => {
    if (user?.departmentId) {
      setForm(f => ({ ...f, departmentId: user.departmentId ?? '' }));
    }
  }, [user]);

  useEffect(() => {
    // Load departments and venues in parallel
    Promise.all([
      fetch('/api/v1/universities/departments', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/v1/events/venues', { credentials: 'include' }).then(r => r.json()),
    ]).then(([deptData, venueData]) => {
      if (deptData.data?.departments) {
        setDepartments(deptData.data.departments);
        if (!form.departmentId && deptData.data.departments.length > 0) {
          setForm(f => ({ ...f, departmentId: deptData.data.departments[0].id }));
        }
      }
      if (venueData.data?.venues) setVenues(venueData.data.venues.filter((v: Venue) => v.status === 'AVAILABLE'));
    }).catch(() => {});
  }, []);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => ({ ...p, [k]: undefined }));
    setServerError('');
  };

  const validate = (): boolean => {
    const errs: Partial<FormState> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    else if (form.title.trim().length < 3) errs.title = 'Title must be at least 3 characters';
    if (!form.departmentId) errs.departmentId = 'Department is required';
    if (!form.startTime) errs.startTime = 'Start time is required';
    if (!form.endTime) errs.endTime = 'End time is required';
    if (!form.registrationDeadline) errs.registrationDeadline = 'Registration deadline is required';
    if (form.startTime && form.endTime && new Date(form.startTime) >= new Date(form.endTime)) {
      errs.endTime = 'End time must be after start time';
    }
    if (form.startTime && form.registrationDeadline && new Date(form.registrationDeadline) > new Date(form.startTime)) {
      errs.registrationDeadline = 'Registration deadline must be on or before event start time';
    }
    const cap = parseInt(form.capacity);
    if (isNaN(cap) || cap < 1) errs.capacity = 'Capacity must be a positive number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, submitForReview = false) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError('');

    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        departmentId: form.departmentId,
        venueId: form.venueId || null,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
        capacity: parseInt(form.capacity),
        budget: parseFloat(form.budget) || 0,
        visibility: form.visibility,
      };
      if (form.minCgpa && parseFloat(form.minCgpa) > 0) {
        payload.minCgpa = parseFloat(form.minCgpa);
      }

      // Create event
      const res = await fetch('/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create event');

      const eventId = json.data.event.id;

      // If "submit for review" was clicked, immediately submit the draft
      if (submitForReview) {
        const submitRes = await fetch(`/api/v1/events/${eventId}/submit`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!submitRes.ok) {
          // Draft created but submit failed — navigate to event detail anyway
          navigate(`/events/${eventId}`);
          return;
        }
      }

      navigate(`/events/${eventId}`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = user?.permissions.includes('event:create');
  if (!canCreate) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You don't have permission to create events. You need a Student Organizer or Faculty Advisor role.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.3rem' }}>
          Propose New Event
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Events start as drafts and go through faculty and HOD approval before opening for registration.
        </p>
      </div>

      {serverError && (
        <div style={{ display: 'flex', gap: '0.65rem', padding: '0.875rem 1rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          {serverError}
        </div>
      )}

      <form noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Basic info */}
          <Card>
            <SectionTitle>Basic Information</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                id="title" label="Event Title *"
                placeholder="e.g. National Hackathon 2026"
                value={form.title} onChange={set('title')} error={errors.title}
              />
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                  Description
                </label>
                <textarea
                  value={form.description} onChange={set('description')}
                  placeholder="Describe the event, its objectives, and what attendees can expect..."
                  rows={4}
                  style={{ width: '100%', padding: '0.6rem 0.875rem', fontSize: '0.9rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', resize: 'vertical', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                    <Tag size={14} color="var(--accent-primary)" /> Category *
                  </label>
                  <select value={form.category} onChange={set('category')} style={selectStyle}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                    <Eye size={14} color="var(--accent-primary)" /> Visibility *
                  </label>
                  <select value={form.visibility} onChange={set('visibility')} style={selectStyle}>
                    {VISIBILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                  <Building2 size={14} color="var(--accent-primary)" /> Department *
                </label>
                <select value={form.departmentId} onChange={set('departmentId')} style={selectStyle}>
                  {departments.length === 0 ? (
                    <option value="">Loading departments…</option>
                  ) : (
                    <>
                      <option value="">Select department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </>
                  )}
                </select>
                {errors.departmentId && <span style={{ fontSize: '0.78rem', color: 'var(--danger)', display: 'block', marginTop: '0.2rem' }}>{errors.departmentId}</span>}
              </div>
            </div>
          </Card>

          {/* Scheduling */}
          <Card>
            <SectionTitle>Date, Time & Venue</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                    <Clock size={14} color="var(--accent-primary)" /> Start Time *
                  </label>
                  <input type="datetime-local" value={form.startTime} onChange={set('startTime')} style={{ ...inputStyle, borderColor: errors.startTime ? 'var(--danger)' : 'var(--border-color)' }} />
                  {errors.startTime && <span style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>{errors.startTime}</span>}
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                    <Clock size={14} color="var(--accent-primary)" /> End Time *
                  </label>
                  <input type="datetime-local" value={form.endTime} onChange={set('endTime')} style={{ ...inputStyle, borderColor: errors.endTime ? 'var(--danger)' : 'var(--border-color)' }} />
                  {errors.endTime && <span style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>{errors.endTime}</span>}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                  <Calendar size={14} color="var(--accent-primary)" /> Registration Deadline *
                </label>
                <input type="datetime-local" value={form.registrationDeadline} onChange={set('registrationDeadline')} style={{ ...inputStyle, borderColor: errors.registrationDeadline ? 'var(--danger)' : 'var(--border-color)' }} />
                {errors.registrationDeadline && <span style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>{errors.registrationDeadline}</span>}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>Must be on or before the event start time.</span>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                  <MapPin size={14} color="var(--accent-primary)" /> Venue (optional)
                </label>
                <select value={form.venueId} onChange={set('venueId')} style={selectStyle}>
                  <option value="">No venue / Online</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.type} — cap: {v.capacity} — {v.location}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                  Venue bookings use transactional range-exclusion conflict prevention.
                </span>
              </div>
            </div>
          </Card>

          {/* Registration settings */}
          <Card>
            <SectionTitle>Registration Settings</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                  <Users size={14} color="var(--accent-primary)" /> Capacity *
                </label>
                <input type="number" min="1" value={form.capacity} onChange={set('capacity')} style={{ ...inputStyle, borderColor: errors.capacity ? 'var(--danger)' : 'var(--border-color)' }} />
                {errors.capacity && <span style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>{errors.capacity}</span>}
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                  <DollarSign size={14} color="var(--accent-primary)" /> Budget (₹)
                </label>
                <input type="number" min="0" value={form.budget} onChange={set('budget')} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                  Min CGPA (0 = none)
                </label>
                <input type="number" min="0" max="10" step="0.1" value={form.minCgpa} onChange={set('minCgpa')} style={inputStyle} />
              </div>
            </div>
          </Card>

          {/* Submit buttons */}
          <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => navigate(-1)} type="button">Cancel</Button>
            <Button
              variant="secondary"
              loading={loading}
              onClick={e => handleSubmit(e as React.FormEvent, false)}
              type="button"
            >
              Save as Draft
            </Button>
            <Button
              loading={loading}
              onClick={e => handleSubmit(e as React.FormEvent, true)}
              type="button"
            >
              Save & Submit for Review
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
      {children}
    </h2>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.875rem',
  fontSize: '0.9rem',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontFamily: 'inherit',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};
