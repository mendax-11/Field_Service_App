import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock3, GripVertical, KanbanSquare, RotateCcw, ShieldAlert } from 'lucide-react';

const STORAGE_KEY = 'timberflow_delivery_roadmap';

const INITIAL_CARDS = [
  { id: 'filters', title: 'Lean order filters and active filter chips', area: 'Dispatcher UX', priority: 'P1', owner: 'Frontend', status: 'done', outcome: 'Faster queue triage with delivery, payment, SLA, date, and location filters.' },
  { id: 'server-pagination', title: 'Move order search, sorting, and pagination server-side', area: 'Performance', priority: 'P0', owner: 'Platform', status: 'in_progress', outcome: 'Keep the UI fast beyond 500 orders and reduce browser memory usage.' },
  { id: 'query-boundary', title: 'Create one React Query data boundary for orders', area: 'Reliability', priority: 'P0', owner: 'Frontend', status: 'todo', outcome: 'Eliminate divergence between PocketBase, localStorage, and optimistic cache updates.' },
  { id: 'state-machine', title: 'Enforce installation state transitions on the server', area: 'Domain safety', priority: 'P0', owner: 'Backend', status: 'todo', outcome: 'Prevent invalid assignment, transit, completion, and payout transitions.' },
  { id: 'conflicts', title: 'Add versioned offline conflict resolution', area: 'Offline', priority: 'P0', owner: 'Platform', status: 'todo', outcome: 'Make stale technician commands visible and recoverable instead of silently overwriting data.' },
  { id: 'dispatcher-queues', title: 'Build operational work queues and KPI strip', area: 'Dispatcher UX', priority: 'P1', owner: 'Product + Frontend', status: 'todo', outcome: 'Surface unassigned, overdue, blocked, rework, and payout queues without manual searching.' },
  { id: 'mobile-actions', title: 'Redesign technician next-action workflow', area: 'Technician UX', priority: 'P1', owner: 'Product + Frontend', status: 'todo', outcome: 'Make start, block, evidence, and completion usable one-handed in the field.' },
  { id: 'scheduling', title: 'Add availability, skills, travel time, and capacity scheduling', area: 'Scheduling', priority: 'P1', owner: 'Product + Backend', status: 'todo', outcome: 'Replace manual assignment with realistic technician capacity planning.' },
  { id: 'inventory-reservation', title: 'Add reserved, dispatched, returned, and damaged stock states', area: 'Inventory', priority: 'P1', owner: 'Backend', status: 'todo', outcome: 'Prevent double allocation and make parts-blocked work operationally trustworthy.' },
  { id: 'observability', title: 'Add production monitoring, audit alerts, and backup drills', area: 'Reliability', priority: 'P0', owner: 'Platform', status: 'todo', outcome: 'Detect failed sync, API errors, migration failures, and data-loss risks early.' }
];

const COLUMNS = [
  { id: 'todo', label: 'Backlog', icon: Circle, color: '#94a3b8' },
  { id: 'in_progress', label: 'In progress', icon: Clock3, color: '#f59e0b' },
  { id: 'blocked', label: 'Blocked', icon: ShieldAlert, color: '#ef4444' },
  { id: 'done', label: 'Done', icon: CheckCircle2, color: '#22c55e' }
];

function loadCards() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    // Fall back to the versioned starter roadmap when storage is unavailable.
  }
  return INITIAL_CARDS;
}

export default function RoadmapBoard() {
  const [cards, setCards] = useState(loadCards);
  const [areaFilter, setAreaFilter] = useState('All');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  const areas = useMemo(() => ['All', ...new Set(cards.map(card => card.area))], [cards]);
  const visibleCards = areaFilter === 'All' ? cards : cards.filter(card => card.area === areaFilter);
  const counts = COLUMNS.reduce((result, column) => {
    result[column.id] = cards.filter(card => card.status === column.id).length;
    return result;
  }, {});

  const moveCard = (id, status) => {
    setCards(current => current.map(card => card.id === id ? { ...card, status } : card));
  };

  const resetBoard = () => {
    if (confirm('Reset the roadmap to the current TimberFlow delivery plan?')) setCards(INITIAL_CARDS);
  };

  return (
    <section className="roadmap-board animate-fade-in">
      <div className="roadmap-header">
        <div>
          <div className="roadmap-kicker"><KanbanSquare size={16} /> Delivery roadmap</div>
          <h2>Build the field-service product in the right order</h2>
          <p>Prioritized against operational risk, dispatcher speed, technician usability, and scale.</p>
        </div>
        <div className="roadmap-controls">
          <label>Area <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>{areas.map(area => <option key={area}>{area}</option>)}</select></label>
          <button type="button" className="template-btn" onClick={resetBoard}><RotateCcw size={14} /> Reset plan</button>
        </div>
      </div>

      <div className="roadmap-summary">
        <span><strong>{counts.done}</strong> done</span>
        <span><strong>{counts.in_progress}</strong> in progress</span>
        <span><strong>{counts.todo}</strong> queued</span>
        <span><strong>{counts.blocked}</strong> blocked</span>
      </div>

      <div className="roadmap-columns">
        {COLUMNS.map(column => {
          const Icon = column.icon;
          const columnCards = visibleCards.filter(card => card.status === column.id);
          return (
            <div className="roadmap-column" key={column.id}>
              <div className="roadmap-column-header">
                <span><Icon size={16} style={{ color: column.color }} /> {column.label}</span>
                <b>{columnCards.length}</b>
              </div>
              <div className="roadmap-card-list">
                {columnCards.map(card => (
                  <article className="roadmap-card" key={card.id}>
                    <div className="roadmap-card-title"><GripVertical size={14} /><h3>{card.title}</h3></div>
                    <p>{card.outcome}</p>
                    <div className="roadmap-card-meta"><span>{card.area}</span><span className={`roadmap-priority ${card.priority.toLowerCase()}`}>{card.priority}</span><span>{card.owner}</span></div>
                    <label className="roadmap-status-control">Move to <select value={card.status} onChange={(event) => moveCard(card.id, event.target.value)}>{COLUMNS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                  </article>
                ))}
                {columnCards.length === 0 && <div className="roadmap-empty">No cards in this column.</div>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
