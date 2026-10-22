import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, CheckSquare } from 'lucide-react';
import { TasksPage } from './TasksPage';
import { DeadlinesPage } from './DeadlinesPage';

export const PlannerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'deadlines' ? 'deadlines' : 'tasks';

  const setView = (nextView: 'tasks' | 'deadlines') => {
    setSearchParams(nextView === 'tasks' ? { view: 'tasks' } : { view: 'deadlines' });
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <header className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div className="sidebar-section-label" style={{ marginBottom: '0.35rem' }}>ACADEMIC PLANNER</div>
            <h1 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.75rem' }}>Planner</h1>
          </div>

          <div style={{ display: 'inline-flex', gap: '0.5rem', padding: '0.35rem', borderRadius: '999px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-card)' }}>
            <button
              type="button"
              onClick={() => setView('tasks')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderRadius: '999px',
                padding: '0.55rem 0.9rem',
                border: 'none',
                background: view === 'tasks' ? 'var(--accent-primary)' : 'transparent',
                color: view === 'tasks' ? '#fff' : 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <CheckSquare size={16} />
              Tasks
            </button>
            <button
              type="button"
              onClick={() => setView('deadlines')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderRadius: '999px',
                padding: '0.55rem 0.9rem',
                border: 'none',
                background: view === 'deadlines' ? 'var(--accent-secondary)' : 'transparent',
                color: view === 'deadlines' ? '#fff' : 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <Calendar size={16} />
              Calendar
            </button>
          </div>
        </div>
      </header>

      {view === 'tasks' ? <TasksPage /> : <DeadlinesPage />}
    </section>
  );
};
