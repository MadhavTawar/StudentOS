import React, { useEffect, useState } from 'react';
import { Plus, Target, CheckCircle2, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Goal } from '../types';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';

export const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Career');
  const [targetDate, setTargetDate] = useState('');
  const [milestone, setMilestone] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = async () => { try { setGoals(await api.listGoals()); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load goals.'); } };
  useEffect(() => { void load(); }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await api.createGoal({ title: title.trim(), category, target_date: targetDate ? new Date(targetDate).toISOString() : undefined });
    setTitle('');
    setTargetDate('');
    await load();
  };

  const addMilestone = async (goal: Goal) => {
    const value = milestone[goal.id]?.trim();
    if (!value) return;
    await api.addGoalMilestone(goal.id, { title: value, create_task: true });
    setMilestone((items) => ({ ...items, [goal.id]: '' }));
    await load();
  };

  const completeMilestone = async (id: string) => { await api.updateGoalMilestone(id, { status: 'Completed' }); await load(); };

  return <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    <header className="card" style={{ padding: '1.25rem' }}>
      <div className="sidebar-section-label">ACADEMIC & CAREER GOALS</div>
      <h1 style={{ margin: '0.35rem 0', color: 'var(--text-main)' }}>Goals</h1>
      <p style={{ margin: 0, color: 'var(--text-muted)' }}>Turn a longer-term aim into milestones that appear in your planner.</p>
    </header>
    <form className="card" onSubmit={(event) => void create(event)} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
      <label style={{ flex: '1 1 280px' }}><span className="label">New goal</span><input className="input" placeholder="e.g. Prepare for campus placements" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label><span className="label">Category</span><select className="input" value={category} onChange={(e) => setCategory(e.target.value)}><option>Career</option><option>Academics</option><option>DSA</option><option>Personal</option></select></label>
      <label><span className="label">Target date</span><input className="input" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></label>
      <Button type="submit" variant="primary" icon={<Plus size={16} />}>Create goal</Button>
    </form>
    {error && <p role="alert" style={{ color: 'var(--accent-danger)' }}>{error}</p>}
    {goals.length === 0 ? <EmptyState icon={<Target size={28} />} title="No goals yet" description="Choose one academic or career outcome to work toward." /> : goals.map((goal) => <article className="card" key={goal.id}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}><div><div className="sidebar-section-label">{goal.category}</div><h2 style={{ margin: '0.25rem 0', color: 'var(--text-main)' }}>{goal.title}</h2>{goal.target_date && <small style={{ color: 'var(--text-muted)' }}>Target: {new Date(goal.target_date).toLocaleDateString()}</small>}</div><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><strong style={{ color: 'var(--accent-primary)' }}>{goal.progress_percent}%</strong><Button size="sm" variant="danger" aria-label={`Delete ${goal.title}`} onClick={() => void api.deleteGoal(goal.id).then(load)} icon={<Trash2 size={14} />} /></div></div>
      <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 8, margin: '0.75rem 0 1rem' }}><div style={{ width: `${goal.progress_percent}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: 8 }} /></div>
      <div style={{ display: 'grid', gap: '0.5rem' }}>{goal.milestones.map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}><span style={{ color: 'var(--text-main)' }}>{item.title}</span>{item.status === 'Completed' || item.task_completed ? <CheckCircle2 color="var(--accent-success)" size={18} /> : <Button size="sm" variant="outline" onClick={() => void completeMilestone(item.id)}>Complete</Button>}</div>)}</div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}><input className="input" placeholder="Add a milestone" value={milestone[goal.id] ?? ''} onChange={(e) => setMilestone((items) => ({ ...items, [goal.id]: e.target.value }))} /><Button size="sm" variant="secondary" onClick={() => void addMilestone(goal)}>Add</Button></div>
    </article>)}
  </section>;
};
