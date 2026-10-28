import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Users, DollarSign, Tag, Building2 } from 'lucide-react';
import { VenueItem, CreateEventInput } from '../types/event';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  venues: VenueItem[];
  onSubmit: (data: CreateEventInput) => Promise<void>;
  loading: boolean;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  venues,
  onSubmit,
  loading,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('TECHNICAL');
  const [departmentId, setDepartmentId] = useState('a1111111-1111-1111-1111-111111111111');
  const [venueId, setVenueId] = useState(venues[0]?.id || '');
  const [startTime, setStartTime] = useState('2026-11-20T09:00');
  const [endTime, setEndTime] = useState('2026-11-20T17:00');
  const [regDeadline, setRegDeadline] = useState('2026-11-19T23:59');
  const [capacity, setCapacity] = useState('150');
  const [budget, setBudget] = useState('25000');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const start = new Date(startTime);
    const end = new Date(endTime);
    const deadline = new Date(regDeadline);

    if (start >= end) {
      setFormError('Event start time must precede end time.');
      return;
    }
    if (deadline > start) {
      setFormError('Registration deadline must be before or equal to event start time.');
      return;
    }

    try {
      await onSubmit({
        title,
        description,
        category,
        departmentId,
        venueId: venueId || null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        registrationDeadline: deadline.toISOString(),
        capacity: parseInt(capacity, 10),
        budget: parseFloat(budget) || 0,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit proposal.';
      setFormError(message);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-card)',
          padding: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Create Event Proposal</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Proposals start in DRAFT and route through faculty and HOD sanction.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.5rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {formError && (
          <div
            style={{
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              fontSize: '0.88rem',
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Symposium on Intelligent Robotics"
              style={{
                width: '100%',
                padding: '0.65rem 0.9rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                <Tag size={14} color="var(--accent-primary)" /> Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              >
                <option value="TECHNICAL">TECHNICAL</option>
                <option value="CULTURAL">CULTURAL</option>
                <option value="WORKSHOP">WORKSHOP</option>
                <option value="SYMPOSIUM">SYMPOSIUM</option>
                <option value="SPORTS">SPORTS</option>
                <option value="ACADEMIC">ACADEMIC</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                <Building2 size={14} color="var(--accent-primary)" /> Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              >
                <option value="a1111111-1111-1111-1111-111111111111">Computer Science & Engineering</option>
                <option value="a2222222-2222-2222-2222-222222222222">Mechanical Engineering</option>
                <option value="a3333333-3333-3333-3333-333333333333">Electronics & Communication</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              <MapPin size={14} color="var(--accent-primary)" /> Venue (Campus Resource)
            </label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.9rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            >
              <option value="">No Venue / Online</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.type}) - Cap: {v.capacity} - {v.location}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
              Exclusion constraints enforce half-open [start, end) concurrency protection on confirmed venues.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                <Clock size={14} color="var(--accent-primary)" /> Start Time (Local) *
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                <Clock size={14} color="var(--accent-primary)" /> End Time (Local) *
              </label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                <Calendar size={14} color="var(--accent-primary)" /> Reg. Deadline *
              </label>
              <input
                type="datetime-local"
                required
                value={regDeadline}
                onChange={(e) => setRegDeadline(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                <Users size={14} color="var(--accent-primary)" /> Capacity *
              </label>
              <input
                type="number"
                required
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                <DollarSign size={14} color="var(--accent-primary)" /> Budget (₹)
              </label>
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Description & Objectives
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline event schedule, keynote speakers, target student cohorts..."
              style={{
                width: '100%',
                padding: '0.65rem 0.9rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.65rem 1.25rem',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.65rem 1.5rem',
                backgroundColor: 'var(--accent-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Creating Draft...' : 'Create Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
