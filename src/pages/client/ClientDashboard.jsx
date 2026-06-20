import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, doc, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  FolderKanban, Clock, FileText, LogOut, Paperclip, IndianRupee,
  Upload, MessageSquare, CheckSquare, Building2, Eye, Calendar, User, Download, Plus, Check, AlertTriangle
} from 'lucide-react';

const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
};

const PROJECT_STATUS_STEPS = ['Planning', 'Building', 'Testing', 'Review', 'Live', 'Completed'];

const STATUS_COLORS = {
  Planning: 'border-violet-500/20 text-violet-400 bg-violet-950/10',
  Building: 'border-blue-500/20 text-blue-400 bg-blue-950/10',
  Testing: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Review: 'border-purple-500/20 text-purple-400 bg-purple-950/10',
  Live: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
  Completed: 'border-cyan-500/20 text-cyan-400 bg-cyan-950/10',
};

const TASK_STATUS_COLORS = {
  Todo: 'border-gray-500/20 text-gray-400 bg-gray-950/10',
  'In Progress': 'border-blue-500/20 text-blue-400 bg-blue-950/10',
  Review: 'border-purple-500/20 text-purple-400 bg-purple-950/10',
  Completed: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
};

const INVOICE_STATUS_COLORS = {
  Draft: 'border-gray-500/20 text-gray-400 bg-gray-950/10',
  Sent: 'border-blue-500/20 text-blue-400 bg-blue-950/10',
  Paid: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
  Overdue: 'border-rose-500/20 text-rose-400 bg-rose-950/10',
};

export default function ClientDashboard() {
  const { logout, user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [notes, setNotes] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs inside project workspace
  const [activeTab, setActiveTab] = useState('overview'); // overview, tasks, files, invoices, communication
  
  // Note creation
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // File upload
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const clientId = userProfile?.clientId;

  useEffect(() => {
    if (!clientId) {
      console.log("[ClientDashboard] No clientId found in userProfile:", userProfile);
      return;
    }

    console.log("[ClientDashboard] Sourcing data for client ID:", clientId);

    // Sync Projects
    const projectsQuery = query(collection(db, 'projects'), where('clientId', '==', clientId), orderBy('createdAt', 'desc'));
    const unsubProjects = onSnapshot(projectsQuery, (snap) => {
      const projs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projs);
      setLoading(false);
      
      // Auto-select first project if none selected
      if (projs.length > 0 && !selectedProject) {
        setSelectedProject(projs[0]);
      }
    }, (err) => {
      console.error("[ClientDashboard] Projects listen error:", err);
      setLoading(false);
    });

    return () => unsubProjects();
  }, [clientId]);

  // Sync child elements when selected project changes
  useEffect(() => {
    if (!selectedProject?.id) return;

    const projId = selectedProject.id;

    // 1. Sync Tasks
    const tasksQuery = query(collection(db, 'tasks'), where('project', '==', selectedProject.projectName));
    const unsubTasks = onSnapshot(tasksQuery, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Sync Files
    const filesQuery = query(collection(db, 'projectFiles'), where('projectId', '==', projId), orderBy('uploadedAt', 'desc'));
    const unsubFiles = onSnapshot(filesQuery, (snap) => {
      setFiles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Sync Invoices
    const invoicesQuery = query(collection(db, 'invoices'), where('projectId', '==', projId), orderBy('createdAt', 'desc'));
    const unsubInvoices = onSnapshot(invoicesQuery, (snap) => {
      setInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Sync Notes (Only client-visible ones)
    const notesQuery = query(
      collection(db, 'notes'), 
      where('leadId', '==', projId), // We use project ID as the target ID for simplicity
      where('clientVisible', '==', true)
    );
    const unsubNotes = onSnapshot(notesQuery, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA; // Descending order
      });
      setNotes(list);
    });

    // 5. Sync Timelines
    const timelineQuery = query(
      collection(db, 'projectTimelines'),
      where('projectId', '==', projId),
      orderBy('timestamp', 'asc')
    );
    const unsubTimeline = onSnapshot(timelineQuery, (snap) => {
      setTimeline(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTasks();
      unsubFiles();
      unsubInvoices();
      unsubNotes();
      unsubTimeline();
    };
  }, [selectedProject]);

  const handleLogout = async () => {
    await logout();
    navigate('/client/login', { replace: true });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedProject) return;

    setUploading(true);
    setUploadError('');

    const storagePath = `projects/${selectedProject.id}/${Date.now()}_${file.name}`;
    
    try {
      // 1. Try real Firebase Storage upload
      const fileRef = ref(storage, storagePath);
      const snap = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snap.ref);

      // 2. Add metadata document to Firestore
      await addDoc(collection(db, 'projectFiles'), {
        projectId: selectedProject.id,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        downloadURL,
        path: storagePath,
        uploadedBy: user?.email || 'Client',
        uploadedAt: serverTimestamp(),
      });

      // 3. Add activity log
      await addDoc(collection(db, 'projectTimelines'), {
        projectId: selectedProject.id,
        stage: selectedProject.status || 'Building',
        description: `Client uploaded document: "${file.name}"`,
        timestamp: serverTimestamp()
      });

    } catch (err) {
      console.error("[ClientDashboard] Storage upload failed:", err);
      setUploadError(`File upload failed: ${err.message || 'Check storage configurations and rules.'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAddClientNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedProject) return;

    setAddingNote(true);
    try {
      await addDoc(collection(db, 'notes'), {
        leadId: selectedProject.id,
        content: newNote.trim(),
        authorName: userProfile?.displayName || user?.email || 'Client',
        role: 'client',
        createdAt: serverTimestamp(),
        clientVisible: true
      });
      
      // Add activity record
      await addDoc(collection(db, 'projectTimelines'), {
        projectId: selectedProject.id,
        stage: selectedProject.status || 'Building',
        description: `Client added feedback comment`,
        timestamp: serverTimestamp()
      });

      setNewNote('');
    } catch (err) {
      console.error("[ClientDashboard] Note add error:", err);
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-t border-r border-white animate-spin" />
          <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
            Loading Client Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Blueprint background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0" />

      {/* Header Navigation */}
      <header className="border-b border-white/10 bg-black/60 backdrop-blur-md px-8 py-4 flex items-center justify-between z-10 relative flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">CLIENT WORKSPACE</span>
            <span className="text-lg font-semibold tracking-tight text-white uppercase">{userProfile?.company || 'AUTOSCALE'}</span>
          </div>
          <span className="h-6 w-px bg-white/15 hidden sm:block" />
          <span className="text-xs text-gray-400 font-light hidden sm:block">Welcome, {userProfile?.displayName || user?.email}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase text-red-400 hover:bg-red-950/20 hover:text-red-300 transition duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-grow flex flex-col md:flex-row relative z-10 overflow-hidden">
        {/* Left Sidebar: Projects List */}
        <aside className="w-full md:w-64 border-r border-white/10 bg-black/40 flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">YOUR PROJECTS</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {projects.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500 uppercase tracking-wider">
                No active projects found.
              </div>
            ) : (
              projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProject(p);
                    setActiveTab('overview');
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${selectedProject?.id === p.id ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  <FolderKanban className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider truncate">{p.projectName}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Center: Selected Project Workspace */}
        {selectedProject ? (
          <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            {/* Project Title Bar */}
            <div className="p-6 md:p-8 border-b border-white/5 bg-white/[0.01] flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <span className="text-[9px] font-bold tracking-[0.2em] text-gray-500 uppercase">PROJECT CONSOLE</span>
                <h1 className="text-2xl font-light text-white uppercase mt-1 tracking-tight">{selectedProject.projectName}</h1>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 font-mono">Status:</span>
                <span className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase ${STATUS_COLORS[selectedProject.status] || 'border-white/15'}`}>
                  {selectedProject.status || 'Planning'}
                </span>
              </div>
            </div>

            {/* Project Workspace Navigation Tabs */}
            <div className="flex border-b border-white/10 px-6 bg-black">
              {['overview', 'tasks', 'files', 'invoices', 'communication'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-xs uppercase tracking-wider font-semibold border-b-2 transition ${activeTab === tab ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab viewports */}
            <div className="p-6 md:p-8 flex-grow">
              
              {/* Tab 1: Overview & Visual Timeline */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Scope card */}
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01]">
                    <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Scope & Description</span>
                    <p className="text-sm text-gray-300 font-light mt-2 leading-relaxed normal-case">
                      {selectedProject.description || 'No detailed scope of work or description specified for this integration.'}
                    </p>
                  </div>

                  {/* Project Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Service Category</span>
                      <span className="text-sm text-white font-medium">{selectedProject.type || 'Custom Automation'}</span>
                    </div>
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Due Date</span>
                      <span className="text-sm text-white font-mono">{selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString('en-IN') : 'TBD'}</span>
                    </div>
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Contract Value</span>
                      <span className="text-sm text-white font-mono">{formatINR(selectedProject.projectValue || selectedProject.budget)}</span>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-400 uppercase tracking-wider">Implementation Progress</span>
                      <span className="text-white font-mono">{selectedProject.progress || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 mt-1">
                      <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${selectedProject.progress || 0}%` }} />
                    </div>
                  </div>

                  {/* Visual Development Timeline (Phase 7) */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold tracking-wider uppercase text-white">Project Milestone Timeline</h3>
                    
                    {/* Progress Bar steps */}
                    <div className="relative flex justify-between items-center w-full py-6">
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/10 z-0" />
                      {PROJECT_STATUS_STEPS.map((step, idx) => {
                        const currentStatusIdx = PROJECT_STATUS_STEPS.indexOf(selectedProject.status || 'Planning');
                        const isDone = idx < currentStatusIdx;
                        const isCurrent = step === (selectedProject.status || 'Planning');
                        return (
                          <div key={step} className="flex flex-col items-center gap-2 z-10 relative">
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${isDone ? 'bg-white border-white text-black' : isCurrent ? 'bg-[#5E0ED7] border-[#5E0ED7] text-white animate-pulse' : 'bg-black border-white/20 text-gray-500'}`}>
                              {isDone ? <Check className="w-4 h-4" /> : <span className="text-xs font-mono">{idx + 1}</span>}
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${isCurrent ? 'text-white' : isDone ? 'text-gray-300' : 'text-gray-500'}`}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Timeline logs */}
                    <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.01] p-4 space-y-3">
                      <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Timeline logs</span>
                      {timeline.length === 0 ? (
                        <div className="text-xs text-gray-500 font-light py-2">No milestone logs registered for this project yet.</div>
                      ) : (
                        timeline.map((item, idx) => (
                          <div key={item.id || idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4 text-xs">
                            <div className="flex flex-col">
                              <span className="font-semibold text-white uppercase tracking-wide">{item.stage}</span>
                              <p className="text-gray-400 font-light mt-0.5 leading-normal">{item.description}</p>
                            </div>
                            <span className="text-[10px] text-gray-600 font-mono flex-shrink-0">
                              {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString('en-IN') : 'Recent'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Tasks List */}
              {activeTab === 'tasks' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wider uppercase text-white">Project Task Board</h3>
                    <p className="text-xs text-gray-500 mt-1 font-light">Current tasks and tasks backlog assigned to this project.</p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
                    {tasks.length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-500 uppercase tracking-widest border border-dashed border-white/5 rounded-xl">
                        No tasks assigned to this project workspace.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                              <th className="px-6 py-4">Task</th>
                              <th className="px-6 py-4">Assignee</th>
                              <th className="px-6 py-4">Priority</th>
                              <th className="px-6 py-4">Stage</th>
                              <th className="px-6 py-4 text-right">Due Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs">
                            {tasks.map(task => (
                              <tr key={task.id} className="hover:bg-white/[0.01] transition">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-white text-sm normal-case">{task.title}</span>
                                    {task.description && <span className="text-gray-500 font-light mt-0.5 normal-case truncate max-w-sm">{task.description}</span>}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-gray-300 font-light truncate">{task.assignedTo || '—'}</td>
                                <td className="px-6 py-4">
                                  <span className="text-[9px] font-semibold tracking-wider text-gray-400 uppercase">{task.priority || 'Medium'}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border uppercase ${TASK_STATUS_COLORS[task.status] || 'border-white/10'}`}>
                                    {task.status || 'Todo'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right text-gray-400 font-mono">
                                  {task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN') : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Deliverables & Shared Files (Phase 3) */}
              {activeTab === 'files' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-sm font-semibold tracking-wider uppercase text-white">Project Deliverables & Files</h3>
                      <p className="text-xs text-gray-500 mt-1 font-light">Contracts, design files, code assets, and media attachments.</p>
                    </div>

                    {/* Upload File Input Button */}
                    <div className="relative">
                      <input
                        type="file"
                        id="client-file-upload"
                        className="sr-only"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <label
                        htmlFor="client-file-upload"
                        className={`bg-white text-black text-xs font-bold tracking-wider rounded-lg px-4 py-2 hover:bg-gray-100 transition uppercase flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? 'Uploading...' : 'Upload File'}
                      </label>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Files Listing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {files.length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-500 uppercase tracking-widest border border-dashed border-white/5 rounded-xl col-span-2">
                        No files shared in this workspace.
                      </div>
                    ) : (
                      files.map(file => (
                        <div
                          key={file.id}
                          className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-gray-400 flex-shrink-0">
                              <Paperclip className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="text-xs font-semibold text-white truncate normal-case">{file.name}</span>
                              <span className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wide">
                                {file.size ? (file.size / 1024).toFixed(1) + ' KB' : '—'} &bull; Uploaded by {file.uploadedBy}
                              </span>
                            </div>
                          </div>
                          <a
                            href={file.downloadURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
                            title="Download Deliverable"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Invoices (Phase 5) */}
              {activeTab === 'invoices' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wider uppercase text-white">Invoices & Billings</h3>
                    <p className="text-xs text-gray-500 mt-1 font-light">Statements, milestone invoices, and payment statuses.</p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
                    {invoices.length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-500 uppercase tracking-widest border border-dashed border-white/5 rounded-xl">
                        No invoices linked to this project.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                              <th className="px-6 py-4">Invoice #</th>
                              <th className="px-6 py-4">Amount</th>
                              <th className="px-6 py-4">Issue Date</th>
                              <th className="px-6 py-4">Due Date</th>
                              <th className="px-6 py-4 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs font-mono">
                            {invoices.map(invoice => (
                              <tr key={invoice.id} className="hover:bg-white/[0.01] transition">
                                <td className="px-6 py-4 text-white font-semibold">{invoice.invoiceNumber || 'INV-TBD'}</td>
                                <td className="px-6 py-4 text-white">{formatINR(invoice.amount)}</td>
                                <td className="px-6 py-4 text-gray-400">{invoice.issueDate || '—'}</td>
                                <td className="px-6 py-4 text-gray-400">{invoice.dueDate || '—'}</td>
                                <td className="px-6 py-4 text-right">
                                  <span className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border uppercase ${INVOICE_STATUS_COLORS[invoice.status] || 'border-white/10'}`}>
                                    {invoice.status || 'Draft'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: Client Communication (Phase 9) */}
              {activeTab === 'communication' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wider uppercase text-white">Client Notes & Feedback</h3>
                    <p className="text-xs text-gray-500 mt-1 font-light">Submit feedback notes and view messages from the engineering team.</p>
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddClientNote} className="space-y-3 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                    <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Submit Comment</span>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                      required
                      placeholder="Post a query, suggest a change, or leave feedback..."
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition normal-case resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={addingNote || !newNote.trim()}
                        className="bg-white text-black text-xs font-bold tracking-wider rounded-lg px-4 py-2 hover:bg-gray-100 disabled:opacity-50 transition uppercase"
                      >
                        {addingNote ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </form>

                  {/* List of comments */}
                  <div className="space-y-4">
                    {notes.length === 0 ? (
                      <div className="text-xs text-gray-500 font-light py-4 text-center">No comments logged in this workspace yet.</div>
                    ) : (
                      notes.map(note => (
                        <div
                          key={note.id}
                          className={`p-4 rounded-xl border border-white/5 ${note.role === 'client' ? 'bg-white/[0.02] ml-8' : 'bg-white/[0.01] mr-8'}`}
                        >
                          <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mb-2">
                            <span className="font-semibold text-white uppercase tracking-wide">
                              {note.authorName} &bull; {note.role === 'client' ? 'Client Partner' : 'Engineering Team'}
                            </span>
                            <span>
                              {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleString('en-IN') : 'Recent'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 font-light normal-case leading-relaxed">
                            {note.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </main>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
            <Building2 className="w-16 h-16 text-gray-600 mb-4 animate-pulse" />
            <h2 className="text-lg font-semibold tracking-wider text-white uppercase">Client Console</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">Select a project from the workspace directory list to check progress details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
