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
  useEffect(() => {
    let isCurrent = true;
    api.listGoals()
      .then((items) => {
        if (isCurrent) setGoals(items);
      })
      .catch((e: unknown) => {
        if (isCurrent) setError(e instanceof Error ? e.message : 'Could not load goals.');
      });
    return () => {
      isCurrent = false;
    };
  }, []);

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

  return <section className="productivity-page">
    <header className="card page-intro-card">
      <div className="sidebar-section-label">ACADEMIC & CAREER GOALS</div>
      <h1 className="page-title page-title-dark">Goals</h1>
      <p className="page-description">Turn a longer-term aim into milestones that appear in your planner.</p>
    </header>
    <form className="card goal-create-form" onSubmit={(event) => void create(event)}>
      <label className="goals-create-label"><span className="label">New goal</span><input className="input" placeholder="e.g. Prepare for campus placements" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label><span className="label">Category</span><select className="input" value={category} onChange={(e) => setCategory(e.target.value)}><option>Career</option><option>Academics</option><option>DSA</option><option>Personal</option></select></label>
      <label><span className="label">Target date</span><input className="input" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></label>
      <Button type="submit" variant="primary" icon={<Plus size={16} />}>Create goal</Button>
    </form>
    {error && <p role="alert" className="form-error">{error}</p>}
    {goals.length === 0 ? <EmptyState icon={<Target size={28} />} title="No goals yet" description="Choose one academic or career outcome to work toward." /> : goals.map((goal) => <article className="card goal-card" key={goal.id}>
      <div className="goal-header"><div><div className="sidebar-section-label">{goal.category}</div><h2 className="goal-title">{goal.title}</h2>{goal.target_date && <small className="goal-target">Target: {new Date(goal.target_date).toLocaleDateString()}</small>}</div><div className="goal-actions"><strong className="goal-progress-value">{goal.progress_percent}%</strong><Button size="sm" variant="danger" aria-label={`Delete ${goal.title}`} onClick={() => void api.deleteGoal(goal.id).then(load)} icon={<Trash2 size={14} />} /></div></div>
      <div className="goal-progress-track" role="progressbar" aria-label={`${goal.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={goal.progress_percent}><div className="goal-progress-fill" style={{ width: `${goal.progress_percent}%` }} /></div><span className="goal-progress-percent">{goal.progress_percent}%</span>
      <div className="milestone-list">{goal.milestones.length === 0 ? <p className="milestone-empty">Add a milestone to break this goal into a next step.</p> : goal.milestones.map((item) => <div className={`milestone-row ${item.status === 'Completed' || item.task_completed ? 'is-completed' : ''}`} key={item.id}><span className="milestone-title">{item.title}</span>{item.status === 'Completed' || item.task_completed ? <CheckCircle2 className="milestone-complete-icon" aria-label="Completed" size={18} /> : <Button size="sm" variant="outline" onClick={() => void completeMilestone(item.id)}>Complete</Button>}</div>)}</div>
      <div className="milestone-add"><input className="input" aria-label={`Add milestone to ${goal.title}`} placeholder="Add a milestone" value={milestone[goal.id] ?? ''} onChange={(e) => setMilestone((items) => ({ ...items, [goal.id]: e.target.value }))} /><Button size="sm" variant="secondary" onClick={() => void addMilestone(goal)}>Add</Button></div>
    </article>)}
    </section>;
};
