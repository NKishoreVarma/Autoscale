import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, ArrowLeft, ArrowRight, Calendar, User, Briefcase, Flag, Clock, GripVertical, Trash2 } from 'lucide-react';

const COLUMNS = [
  { id: 'Todo', name: 'Todo' },
  { id: 'In Progress', name: 'In Progress' },
  { id: 'Review', name: 'Review' },
  { id: 'Completed', name: 'Completed' },
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const PRIORITY_COLORS = {
  Low: 'border-l-gray-500',
  Medium: 'border-l-blue-500',
  High: 'border-l-amber-500',
  Critical: 'border-l-rose-500',
};

const PRIORITY_BADGE = {
  Low: 'border-gray-500/20 text-gray-400 bg-gray-950/10',
  Medium: 'border-blue-500/20 text-blue-400 bg-blue-950/10',
  High: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Critical: 'border-rose-500/20 text-rose-400 bg-rose-950/10',
};

const initialForm = {
  title: '',
  description: '',
  assignedTo: '',
  project: '',
  deadline: '',
  priority: 'Medium',
};

export default function Tasks() {
  const { user: authUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Sync tasks, projects, and team members in real-time
  useEffect(() => {
    const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setTasks(list);
      setLoading(false);
    });

    const unsubProjects = onSnapshot(
      query(collection(db, 'projects'), orderBy('projectName', 'asc')),
      (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    const unsubTeam = onSnapshot(
      query(collection(db, 'teamMembers'), orderBy('name', 'asc')),
      (snapshot) => {
        setTeamMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    return () => {
      unsubscribe();
      unsubProjects();
      unsubTeam();
    };
  }, []);

  // Move task between columns
  const moveTask = async (taskId, currentStatus, direction) => {
    const currentIndex = COLUMNS.findIndex((col) => col.id === currentStatus);
    const newIndex = currentIndex + direction;

    if (newIndex >= 0 && newIndex < COLUMNS.length) {
      const newStatus = COLUMNS[newIndex].id;
      try {
        await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
      } catch (err) {
        console.error('Error moving task:', err);
      }
    }
  };

  // Create task
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);

    try {
      const selectedProj = projects.find(p => p.projectName === form.project);
      
      await addDoc(collection(db, 'tasks'), {
        title: form.title.trim(),
        description: form.description.trim(),
        assignedTo: form.assignedTo.trim(),
        project: form.project.trim(),
        projectId: selectedProj ? selectedProj.id : '',
        deadline: form.deadline,
        priority: form.priority,
        status: 'Todo',
        createdAt: serverTimestamp(),
        createdBy: authUser?.email || 'admin',
      });

      // Write timeline log if project linked
      if (selectedProj) {
        await addDoc(collection(db, 'projectTimelines'), {
          projectId: selectedProj.id,
          stage: selectedProj.status || 'Planning',
          description: `Task created: "${form.title.trim()}" (assigned to ${form.assignedTo})`,
          timestamp: serverTimestamp()
        });
      }

      setForm(initialForm);
      setShowModal(false);
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete task
  const handleDelete = async (taskId) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setSelectedTask(null);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col gap-8 h-full">

      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
            TASK MANAGEMENT
          </span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
            KANBAN BOARD
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Kanban Scroll Wrapper */}
      <div className="flex-grow overflow-x-auto pb-4 no-scrollbar">
        <div className="flex gap-4 min-w-[1200px] h-full items-stretch">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter((t) => (t.status || 'Todo') === column.id);

            return (
              <div
                key={column.id}
                className="w-80 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col h-[calc(100vh-280px)] overflow-hidden"
              >
                {/* Column Header */}
                <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center flex-shrink-0">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {column.name}
                  </span>
                  <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="flex-grow overflow-y-auto p-3 flex flex-col gap-3 no-scrollbar">
                  {columnTasks.length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-600 uppercase tracking-widest border border-dashed border-white/5 rounded-lg flex-grow flex items-center justify-center">
                      Empty Stage
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-4 rounded-lg border border-white/5 bg-black hover:border-white/15 transition-all duration-200 shadow-sm relative group overflow-hidden border-l-2 ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium}`}
                      >
                        <div className="flex flex-col gap-2">
                          {/* Title & Priority */}
                          <div className="flex justify-between items-start gap-2">
                            <span
                              className="text-xs font-bold text-white truncate max-w-[180px] cursor-pointer hover:text-gray-200"
                              onClick={() => setSelectedTask(task)}
                            >
                              {task.title}
                            </span>
                            <span className={`text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded border uppercase flex-shrink-0 ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.Medium}`}>
                              {task.priority || 'Medium'}
                            </span>
                          </div>

                          {/* Assigned To */}
                          {task.assignedTo && (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-gray-500" />
                              <span className="text-[11px] text-gray-400 font-light truncate">{task.assignedTo}</span>
                            </div>
                          )}

                          {/* Project */}
                          {task.project && (
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="w-3 h-3 text-gray-500" />
                              <span className="text-[11px] text-gray-400 font-light truncate">{task.project}</span>
                            </div>
                          )}

                          {/* Deadline */}
                          {task.deadline && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span className="text-[10px] text-gray-500 font-mono">
                                {new Date(task.deadline).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Transition Buttons */}
                        <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                          <button
                            onClick={() => moveTask(task.id, column.id, -1)}
                            disabled={column.id === 'Todo'}
                            className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white disabled:opacity-20 transition"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>

                          <span className="text-[8px] font-bold tracking-widest text-gray-500 uppercase">
                            Move
                          </span>

                          <button
                            onClick={() => moveTask(task.id, column.id, 1)}
                            disabled={column.id === 'Completed'}
                            className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white disabled:opacity-20 transition"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-black p-6 z-10 shadow-2xl mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">New Entry</span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">Create Task</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                  placeholder="Task title"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case resize-none"
                  placeholder="Describe the task..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Assigned To</label>
                  <select
                    value={form.assignedTo}
                    onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                  >
                    <option value="">Select Member</option>
                    {teamMembers.map(tm => (
                      <option key={tm.id} value={tm.name}>{tm.name} ({tm.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Project</label>
                  <select
                    value={form.project}
                    onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.projectName}>{p.projectName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-xs font-semibold tracking-wider text-gray-400 border border-white/10 rounded-lg hover:bg-white/5 transition duration-200 uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Panel */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedTask(null)}
          />

          <div className="relative w-full max-w-2xl bg-black border-l border-white/10 h-full flex flex-col z-10 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Task Details
                </span>
                <h2 className="text-xl font-normal text-white mt-1 normal-case">
                  {selectedTask.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-8 no-scrollbar">

              {/* Status Update */}
              <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Current Stage</span>
                  <span className="text-sm text-white font-medium mt-0.5">Move to column:</span>
                </div>
                <select
                  value={selectedTask.status || 'Todo'}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    try {
                      await updateDoc(doc(db, 'tasks', selectedTask.id), { status: newStatus });
                      setSelectedTask((prev) => ({ ...prev, status: newStatus }));
                    } catch (err) {
                      console.error('Error updating task status:', err);
                    }
                  }}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-white transition duration-200"
                >
                  {COLUMNS.map((col) => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <User className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Assigned To</span>
                      <span className="text-sm text-white">{selectedTask.assignedTo || '—'}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Briefcase className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Project</span>
                      <span className="text-sm text-white">{selectedTask.project || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Deadline</span>
                      <span className="text-sm text-white font-mono">
                        {selectedTask.deadline
                          ? new Date(selectedTask.deadline).toLocaleDateString('en-IN')
                          : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Flag className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Priority</span>
                      <span className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase w-fit mt-0.5 ${PRIORITY_BADGE[selectedTask.priority] || PRIORITY_BADGE.Medium}`}>
                        {selectedTask.priority || 'Medium'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Description</span>
                  <p className="text-xs text-gray-300 font-light leading-relaxed normal-case mt-1.5">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {/* Created */}
              <div className="text-[10px] text-gray-500 font-mono">
                Created: {selectedTask.createdAt?.toDate
                  ? selectedTask.createdAt.toDate().toLocaleDateString('en-IN') + ' • ' + selectedTask.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Recent'}
              </div>

              <hr className="border-white/5" />

              {/* Danger Zone */}
              <div className="p-4 rounded-xl border border-rose-500/10 bg-rose-950/5">
                <span className="text-[9px] font-bold tracking-widest text-rose-400 uppercase block mb-3">Danger Zone</span>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this task?')) {
                      handleDelete(selectedTask.id);
                    }
                  }}
                  className="text-xs font-semibold tracking-wider text-rose-400 border border-rose-500/20 rounded-lg px-4 py-2 hover:bg-rose-950/20 transition duration-200 uppercase flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
