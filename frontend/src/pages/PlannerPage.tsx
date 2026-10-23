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
    <section className="planner-page">
      <header className="card planner-header">
        <div className="planner-header-content">
          <div>
            <div className="sidebar-section-label planner-kicker">ACADEMIC PLANNER</div>
            <h1 className="planner-title">Planner</h1>
          </div>

          <div className="planner-switcher" role="tablist" aria-label="Planner view">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'tasks'}
              className={`planner-tab ${view === 'tasks' ? 'is-active' : ''}`}
              onClick={() => setView('tasks')}
            >
              <CheckSquare size={16} />
              Tasks
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'deadlines'}
              className={`planner-tab planner-tab-deadlines ${view === 'deadlines' ? 'is-active' : ''}`}
              onClick={() => setView('deadlines')}
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
