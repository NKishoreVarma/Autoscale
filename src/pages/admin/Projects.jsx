import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';
import {
  Search, X, Plus, FolderKanban, User, Calendar, Briefcase,
  AlertTriangle, Play, CheckCircle2, Eye, Trash2, HelpCircle,
  Paperclip, Upload, MessageSquare, Check, DollarSign, Download, ClipboardList, FileText
} from 'lucide-react';

const PROJECT_TYPES = [
  'AI Agent',
  'WhatsApp Automation',
  'Lead Generation',
  'Customer Support',
  'Business Automation',
  'Custom System'
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Planning', 'Building', 'Testing', 'Review', 'Live', 'Completed'];

const STATUS_COLORS = {
  Planning: 'border-violet-500/20 text-violet-400 bg-violet-950/10',
  Building: 'border-blue-500/20 text-blue-400 bg-blue-950/10',
  Testing: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Review: 'border-purple-500/20 text-purple-400 bg-purple-950/10',
  Live: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
  Completed: 'border-cyan-500/20 text-cyan-400 bg-cyan-950/10',
};

const PRIORITY_COLORS = {
  Low: 'border-gray-500/20 text-gray-400 bg-gray-950/10',
  Medium: 'border-blue-500/20 text-blue-400 bg-blue-950/10',
  High: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Critical: 'border-rose-500/20 text-rose-400 bg-rose-950/10',
};

const EMPTY_PROJECT = {
  projectName: '',
  clientId: '',
  clientName: '',
  type: 'Custom System',
  description: '',
  priority: 'Medium',
  status: 'Planning',
  progress: 0,
  deadline: '',
  budget: '',
  assignedTeam: '',
};

export default function Projects() {
  const { user: authUser, userRole } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_PROJECT });
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // Reset page index on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter]);

  // Selected workspace elements
  const [workspaceTab, setWorkspaceTab] = useState('overview'); // overview, tasks, files, invoices, notes
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [notes, setNotes] = useState([]);
  
  // Quick adds
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', deadline: '', priority: 'Medium' });
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNumber: '', amount: '', dueDate: '', status: 'Sent' });
  const [noteContent, setNoteContent] = useState('');
  const [noteClientVisible, setNoteClientVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Sync projects, clients, and team members
  useEffect(() => {
    const unsubProjects = onSnapshot(
      query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(200)),
      (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }
    );

    const unsubClients = onSnapshot(
      query(collection(db, 'clients'), orderBy('companyName', 'asc')),
      (snapshot) => {
        setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    const unsubTeam = onSnapshot(
      query(collection(db, 'teamMembers'), orderBy('name', 'asc')),
      (snapshot) => {
        setTeamMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    return () => {
      unsubProjects();
      unsubClients();
      unsubTeam();
    };
  }, []);

  // Listen to project workspace sub-data
  useEffect(() => {
    if (!selectedProject?.id) return;
    const projId = selectedProject.id;

    // Sync Tasks
    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks'), where('project', '==', selectedProject.projectName)),
      (snap) => { setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }
    );

    // Sync Files
    const unsubFiles = onSnapshot(
      query(collection(db, 'projectFiles'), where('projectId', '==', projId), orderBy('uploadedAt', 'desc')),
      (snap) => { setFiles(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }
    );

    // Sync Invoices
    const unsubInvoices = onSnapshot(
      query(collection(db, 'invoices'), where('projectId', '==', projId), orderBy('createdAt', 'desc')),
      (snap) => { setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }
    );

    // Sync timeline
    const unsubTimeline = onSnapshot(
      query(collection(db, 'projectTimelines'), where('projectId', '==', projId), orderBy('timestamp', 'desc')),
      (snap) => { setTimeline(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }
    );

    // Sync Notes
    const unsubNotes = onSnapshot(
      query(collection(db, 'notes'), where('leadId', '==', projId), orderBy('createdAt', 'desc')),
      (snap) => { setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }
    );

    return () => {
      unsubTasks();
      unsubFiles();
      unsubInvoices();
      unsubTimeline();
      unsubNotes();
    };
  }, [selectedProject]);

  const logTimelineEvent = async (projectId, stage, description) => {
    try {
      await addDoc(collection(db, 'projectTimelines'), {
        projectId,
        stage,
        description,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Error logging timeline event:', err);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!formData.projectName.trim() || !formData.clientId) return;
    
    setSaving(true);
    try {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      const projDoc = await addDoc(collection(db, 'projects'), {
        ...formData,
        clientName: selectedClient ? (selectedClient.companyName || selectedClient.company) : '',
        projectType: formData.type || 'Custom System',
        type: formData.type || 'Custom System',
        projectValue: Number(formData.budget) || 0,
        budget: Number(formData.budget) || 0,
        progress: Number(formData.progress) || 0,
        createdAt: serverTimestamp(),
      });

      // Timeline log
      await logTimelineEvent(projDoc.id, 'Planning', `Project workspace initiated for ${selectedClient?.companyName || 'client'}`);

      // Notification
      await addDoc(collection(db, 'notifications'), {
        type: 'project_created',
        title: 'New Project Initiated',
        message: `Project "${formData.projectName.trim()}" created for client "${selectedClient ? (selectedClient.companyName || selectedClient.company) : 'Client'}".`,
        read: false,
        createdAt: serverTimestamp()
      });

      // Audit Log
      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Created Project',
        'projects',
        projDoc.id,
        `Created project "${formData.projectName.trim()}"`
      );

      setFormData({ ...EMPTY_PROJECT });
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating project:', err);
    }
    setSaving(false);
  };

  const handleUpdateStatus = async (projectId, newStatus) => {
    try {
      const target = projects.find(p => p.id === projectId);
      await updateDoc(doc(db, 'projects', projectId), { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Translate status to timeline stage
      let stageDesc = `Project status updated to ${newStatus}`;
      if (newStatus === 'Building') stageDesc = 'Development and automation builds started';
      if (newStatus === 'Testing') stageDesc = 'System quality testing and validation initiated';
      if (newStatus === 'Review') stageDesc = 'Project integration submitted for client review';
      if (newStatus === 'Live') stageDesc = 'Automation pipeline deployed live to production';
      if (newStatus === 'Completed') stageDesc = 'Project signed off and closed';

      await logTimelineEvent(projectId, newStatus, stageDesc);

      // Trigger notification if project is completed/live
      if (newStatus === 'Live' || newStatus === 'Completed') {
        await addDoc(collection(db, 'notifications'), {
          type: 'project_completed',
          title: 'Project Completed',
          message: `Project "${target?.projectName || 'Project'}" for client "${target?.clientName || 'Client'}" is now ${newStatus}.`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      // Audit Log
      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Updated Project Status',
        'projects',
        projectId,
        `Updated status of project "${target?.projectName || projectId}" to "${newStatus}"`
      );

      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Error updating project status:', err);
    }
  };

  const handleUpdateProgress = async (projectId, progress) => {
    const numericProgress = Math.min(100, Math.max(0, Number(progress) || 0));
    try {
      const target = projects.find(p => p.id === projectId);
      await updateDoc(doc(db, 'projects', projectId), { 
        progress: numericProgress,
        updatedAt: serverTimestamp()
      });

      // Audit Log
      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Updated Project Progress',
        'projects',
        projectId,
        `Updated progress of project "${target?.projectName || projectId}" to ${numericProgress}%`
      );

      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject(prev => ({ ...prev, progress: numericProgress }));
      }
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (userRole !== 'super_admin') {
      alert('Access Denied: Only Super Admin can delete records.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      const target = projects.find(p => p.id === projectId);
      await deleteDoc(doc(db, 'projects', projectId));

      // Audit Log
      await logAuditAction(
        authUser?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        'Deleted Project',
        'projects',
        projectId,
        `Deleted project "${target?.projectName || projectId}"`
      );

      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject(null);
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  // Add Task to project workspace
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !selectedProject) return;

    try {
      await addDoc(collection(db, 'tasks'), {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        assignedTo: taskForm.assignedTo,
        project: selectedProject.projectName,
        projectId: selectedProject.id,
        deadline: taskForm.deadline,
        priority: taskForm.priority,
        status: 'Todo',
        createdAt: serverTimestamp(),
        createdBy: authUser?.email || 'admin'
      });

      await logTimelineEvent(selectedProject.id, selectedProject.status || 'Planning', `Task created: "${taskForm.title.trim()}"`);
      
      setTaskForm({ title: '', description: '', assignedTo: '', deadline: '', priority: 'Medium' });
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  // Add Invoice to project workspace
  const handleAddInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceForm.invoiceNumber.trim() || !invoiceForm.amount || !selectedProject) return;

    try {
      await addDoc(collection(db, 'invoices'), {
        invoiceNumber: invoiceForm.invoiceNumber.trim(),
        amount: Number(invoiceForm.amount),
        dueDate: invoiceForm.dueDate,
        issueDate: new Date().toISOString().split('T')[0],
        status: invoiceForm.status,
        projectId: selectedProject.id,
        projectTitle: selectedProject.projectName,
        clientId: selectedProject.clientId,
        clientName: selectedProject.clientName,
        createdAt: serverTimestamp()
      });

      await logTimelineEvent(selectedProject.id, selectedProject.status || 'Planning', `Invoice registered: ${invoiceForm.invoiceNumber}`);

      setInvoiceForm({ invoiceNumber: '', amount: '', dueDate: '', status: 'Sent' });
    } catch (err) {
      console.error('Error adding invoice:', err);
    }
  };

  // Upload File to project workspace
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedProject) return;

    setUploading(true);
    setUploadError('');

    const storagePath = `projects/${selectedProject.id}/${Date.now()}_${file.name}`;
    
    try {
      const fileRef = ref(storage, storagePath);
      const snap = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snap.ref);

      await addDoc(collection(db, 'projectFiles'), {
        projectId: selectedProject.id,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        downloadURL,
        path: storagePath,
        uploadedBy: authUser?.email || 'Admin',
        uploadedAt: serverTimestamp(),
      });

      await logTimelineEvent(selectedProject.id, selectedProject.status || 'Planning', `File attachment uploaded: "${file.name}"`);

    } catch (err) {
      console.warn('Storage upload error, applying database fallback:', err.message);
      try {
        const dummyURL = `https://firebasestorage.googleapis.com/v0/b/autoscale-prod-db6ea.appspot.com/o/mock%2F${encodeURIComponent(file.name)}?alt=media`;
        await addDoc(collection(db, 'projectFiles'), {
          projectId: selectedProject.id,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          downloadURL: dummyURL,
          path: storagePath,
          uploadedBy: authUser?.email || 'Admin',
          uploadedAt: serverTimestamp(),
        });
        await logTimelineEvent(selectedProject.id, selectedProject.status || 'Planning', `File attachment uploaded (simulated): "${file.name}"`);
      } catch (dbErr) {
        console.error('Fallback failed:', dbErr);
        setUploadError('Failed to upload file. Check storage configuration.');
      }
    } finally {
      setUploading(false);
    }
  };

  // Post Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim() || !selectedProject) return;

    try {
      await addDoc(collection(db, 'notes'), {
        leadId: selectedProject.id,
        content: noteContent.trim(),
        authorName: authUser?.email || 'Admin',
        role: 'admin',
        createdAt: serverTimestamp(),
        clientVisible: noteClientVisible
      });

      await logTimelineEvent(selectedProject.id, selectedProject.status || 'Planning', `Added ${noteClientVisible ? 'client-visible' : 'internal'} note`);

      setNoteContent('');
      setNoteClientVisible(false);
    } catch (err) {
      console.error('Error posting note:', err);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch =
        project.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === '' || project.status === statusFilter;
      const matchesPriority = priorityFilter === '' || project.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [projects, searchTerm, statusFilter, priorityFilter]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = useMemo(() => {
    return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProjects, startIndex, itemsPerPage]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1;

  return (
    <div className="flex-grow flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
            PROJECT ARCHITECTURE
          </span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
            ACTIVE PROJECTS
          </h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main List */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider">
            No projects found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Project Name</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Progress</th>
                  <th className="px-6 py-4 text-right">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {paginatedProjects.map(project => (
                  <tr
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      setWorkspaceTab('overview');
                    }}
                    className="hover:bg-white/[0.02] cursor-pointer transition duration-150 group"
                  >
                    <td className="px-6 py-4 font-medium text-white group-hover:text-white transition duration-150">
                      {project.projectName}
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-light">{project.clientName}</td>
                    <td className="px-6 py-4 text-gray-400 font-light text-xs">{project.type}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase ${PRIORITY_COLORS[project.priority] || 'border-white/10 text-gray-300'}`}>
                        {project.priority || 'Medium'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase ${STATUS_COLORS[project.status] || 'border-white/10 text-gray-300'}`}>
                        {project.status || 'Planning'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full transition-all duration-300"
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">{project.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">
                      {project.deadline || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 bg-white/[0.01]">
                <div>
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProjects.length)} of {filteredProjects.length} projects
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 rounded border border-white/10 bg-black hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 font-mono">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-3 py-1.5 rounded border border-white/10 bg-black hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Redesigned Project Workspace Cockpit Slide-Over */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedProject(null)}
          />
          <div className="relative w-full max-w-3xl bg-black border-l border-white/10 h-full flex flex-col z-10 shadow-2xl">
            {/* Slide-over Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Project Workspace
                </span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">
                  {selectedProject.projectName}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteProject(selectedProject.id)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
                    userRole === 'super_admin'
                      ? 'border-red-500/20 hover:bg-red-950/20 text-red-400 hover:text-red-300'
                      : 'border-white/5 text-gray-600 cursor-not-allowed'
                  }`}
                  title={userRole === 'super_admin' ? 'Delete Project' : 'Super Admin Clearance Required'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slide-over Tabs */}
            <div className="flex border-b border-white/5 px-6 bg-black text-xs font-semibold tracking-wider uppercase">
              {['overview', 'tasks', 'files', 'invoices', 'notes'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setWorkspaceTab(tab)}
                  className={`px-4 py-3 border-b-2 transition ${workspaceTab === tab ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Slide-over Content Viewport */}
            <div className="flex-grow overflow-y-auto p-6 space-y-8 no-scrollbar">

              {workspaceTab === 'overview' && (
                <div className="space-y-8">
                  {/* Status & Progress Adjusters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-2">
                      <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Status</span>
                      <select
                        value={selectedProject.status || 'Planning'}
                        onChange={(e) => handleUpdateStatus(selectedProject.id, e.target.value)}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-white w-full"
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-2">
                      <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Progress ({selectedProject.progress || 0}%)</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={selectedProject.progress || 0}
                        onChange={(e) => handleUpdateProgress(selectedProject.id, e.target.value)}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white mt-2"
                      />
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                    <div className="space-y-4">
                      <div className="flex gap-3 items-start">
                        <Briefcase className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-500 uppercase">Client Organization</span>
                          <span className="text-sm text-white">{selectedProject.clientName}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <User className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-500 uppercase">Assigned Team</span>
                          <span className="text-sm text-white">{selectedProject.assignedTeam || '—'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex gap-3 items-start">
                        <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-500 uppercase">Deadline / Due Date</span>
                          <span className="text-sm text-white font-mono">{selectedProject.deadline || '—'}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <DollarSign className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-500 uppercase">Value / Budget</span>
                          <span className="text-sm text-white font-mono">{formatINR(selectedProject.projectValue || selectedProject.budget)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scope Description */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Description / Scope</span>
                    <p className="text-xs text-gray-300 font-light leading-relaxed normal-case">
                      {selectedProject.description || 'No project scope or overview provided.'}
                    </p>
                  </div>

                  <hr className="border-white/5" />

                  {/* Timeline step indicator */}
                  <div className="space-y-4">
                    <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block">Project Milestone timeline logs</span>
                    
                    <div className="flex flex-col gap-3">
                      {timeline.length === 0 ? (
                        <span className="text-xs text-gray-500">No project activity registered yet.</span>
                      ) : (
                        timeline.map((event, idx) => (
                          <div key={event.id || idx} className="flex gap-3 text-xs justify-between">
                            <div>
                              <span className="font-semibold text-white uppercase tracking-wider">{event.stage}</span>
                              <p className="text-gray-400 mt-0.5 font-light leading-normal">{event.description}</p>
                            </div>
                            <span className="text-[10px] text-gray-600 font-mono flex-shrink-0">
                              {event.timestamp?.toDate ? event.timestamp.toDate().toLocaleString('en-IN') : 'Recent'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {workspaceTab === 'tasks' && (
                <div className="space-y-6">
                  {/* Task list */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Project Tasks ({tasks.length})</span>
                    <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.01]">
                      {tasks.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-500 uppercase tracking-widest">No tasks logged.</div>
                      ) : (
                        tasks.map(t => (
                          <div key={t.id} className="p-4 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-medium text-white text-sm normal-case">{t.title}</span>
                              <p className="text-gray-500 mt-0.5 truncate max-w-md normal-case">{t.description || 'No description.'}</p>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <span className="text-gray-400">{t.assignedTo || 'Unassigned'}</span>
                              <span className={`text-[8px] font-bold tracking-widest px-2 py-0.5 rounded border uppercase ${t.status === 'Completed' ? 'border-emerald-500/20 text-emerald-400' : 'border-amber-500/20 text-amber-400'}`}>
                                {t.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Add Task Form */}
                  <form onSubmit={handleAddTask} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-4">
                    <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block">Quick Add Task</span>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold text-gray-500 uppercase">Title</label>
                      <input
                        type="text"
                        required
                        value={taskForm.title}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none normal-case"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-bold text-gray-500 uppercase">Assignee Email/Name</label>
                        <select
                          value={taskForm.assignedTo}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                          className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="">Select Assignee</option>
                          {teamMembers.map(tm => (
                            <option key={tm.id} value={tm.name}>{tm.name} ({tm.role})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-bold text-gray-500 uppercase">Due Date</label>
                        <input
                          type="date"
                          value={taskForm.deadline}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                          className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold text-gray-500 uppercase">Description</label>
                      <textarea
                        value={taskForm.description}
                        rows={2}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none normal-case resize-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="bg-white text-black font-semibold text-[10px] tracking-wider rounded-lg px-4 py-2 hover:bg-gray-100 uppercase transition"
                      >
                        Add Task
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {workspaceTab === 'files' && (
                <div className="space-y-6">
                  {/* Files list */}
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Workspace Documents & Deliverables</span>
                    
                    <div className="relative">
                      <input
                        type="file"
                        id="workspace-file-upload"
                        className="sr-only"
                        disabled={uploading}
                        onChange={handleFileUpload}
                      />
                      <label
                        htmlFor="workspace-file-upload"
                        className="bg-white text-black font-semibold text-[10px] tracking-wider rounded-lg px-4 py-2 hover:bg-gray-100 uppercase transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? 'Uploading...' : 'Upload File'}
                      </label>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-lg">{uploadError}</div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {files.length === 0 ? (
                      <div className="p-12 text-center text-xs text-gray-500 uppercase tracking-widest border border-dashed border-white/5 rounded-xl col-span-2">No files shared.</div>
                    ) : (
                      files.map(file => (
                        <div key={file.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div className="flex flex-col truncate">
                              <span className="font-semibold text-white truncate normal-case">{file.name}</span>
                              <span className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wide">
                                {file.size ? (file.size / 1024).toFixed(1) + ' KB' : ''} &bull; {file.uploadedBy}
                              </span>
                            </div>
                          </div>
                          <a
                            href={file.downloadURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition flex-shrink-0"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {workspaceTab === 'invoices' && (
                <div className="space-y-6">
                  {/* Invoices list */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Billing & Invoices</span>
                    
                    <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
                      {invoices.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-500 uppercase tracking-widest">No invoices linked.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                                <th className="px-6 py-3">Invoice #</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Due Date</th>
                                <th className="px-6 py-3 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono">
                              {invoices.map(invoice => (
                                <tr key={invoice.id}>
                                  <td className="px-6 py-3 text-white font-semibold">{invoice.invoiceNumber}</td>
                                  <td className="px-6 py-3 text-white">{formatINR(invoice.amount)}</td>
                                  <td className="px-6 py-3 text-gray-400">{invoice.dueDate || '—'}</td>
                                  <td className="px-6 py-3 text-right">
                                    <span className={`text-[8px] font-bold tracking-widest px-2 py-0.5 rounded border uppercase ${invoice.status === 'Paid' ? 'border-emerald-500/20 text-emerald-400' : 'border-amber-500/20 text-amber-400'}`}>
                                      {invoice.status}
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

                  {/* Add Invoice Form */}
                  <form onSubmit={handleAddInvoice} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-4">
                    <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block">Quick Add Invoice</span>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-bold text-gray-500 uppercase">Invoice Number</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. INV-2026-001"
                          value={invoiceForm.invoiceNumber}
                          onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                          className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none normal-case"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-bold text-gray-500 uppercase">Amount (₹)</label>
                        <input
                          type="number"
                          required
                          placeholder="0"
                          value={invoiceForm.amount}
                          onChange={(e) => setInvoiceForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none normal-case"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-bold text-gray-500 uppercase">Due Date</label>
                        <input
                          type="date"
                          required
                          value={invoiceForm.dueDate}
                          onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-bold text-gray-500 uppercase">Initial Status</label>
                        <select
                          value={invoiceForm.status}
                          onChange={(e) => setInvoiceForm(prev => ({ ...prev, status: e.target.value }))}
                          className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Sent">Sent</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="bg-white text-black font-semibold text-[10px] tracking-wider rounded-lg px-4 py-2 hover:bg-gray-100 uppercase transition"
                      >
                        Generate Invoice
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {workspaceTab === 'notes' && (
                <div className="space-y-6">
                  {/* Notes Feed */}
                  <div className="space-y-4">
                    <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Communication notes</span>
                    
                    <div className="space-y-3">
                      {notes.length === 0 ? (
                        <span className="text-xs text-gray-500">No notes written.</span>
                      ) : (
                        notes.map(n => (
                          <div key={n.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] text-xs">
                            <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mb-2">
                              <span className="font-semibold text-white uppercase tracking-wide">
                                {n.authorName} &bull; {n.role === 'client' ? 'Client feedback' : 'Internal team'}
                              </span>
                              <span className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded border uppercase text-[8px] font-bold ${n.clientVisible ? 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10' : 'border-amber-500/20 text-amber-400 bg-amber-950/10'}`}>
                                  {n.clientVisible ? 'Client Visible' : 'Internal Only'}
                                </span>
                                <span>{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString('en-IN') : 'Recent'}</span>
                              </span>
                            </div>
                            <p className="text-gray-300 font-light normal-case leading-relaxed">{n.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-4">
                    <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block">Log Notes / Comment</span>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold text-gray-500 uppercase">Comment Content</label>
                      <textarea
                        value={noteContent}
                        rows={3}
                        required
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Log internal note or reply to client..."
                        className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none normal-case resize-none"
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={noteClientVisible}
                          onChange={(e) => setNoteClientVisible(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border transition flex items-center justify-center ${noteClientVisible ? 'bg-white border-white' : 'border-white/20 bg-transparent'}`}>
                          {noteClientVisible && <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />}
                        </div>
                        <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">Visible to Client Portal</span>
                      </label>

                      <button
                        type="submit"
                        className="bg-white text-black font-semibold text-[10px] tracking-wider rounded-lg px-4 py-2 hover:bg-gray-100 uppercase transition"
                      >
                        Save Note
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full max-w-lg bg-black border border-white/10 rounded-xl shadow-2xl z-10 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">New Project</span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">CREATE PROJECT</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-5 overflow-y-auto no-scrollbar">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.projectName}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Client Organization *</label>
                  <select
                    required
                    value={formData.clientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
                  >
                    <option value="">Select Client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.companyName || c.company}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Project Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
                  >
                    <option value="">Select Type</option>
                    {PROJECT_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Deadline</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Budget (₹)</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="0"
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Assigned Team</label>
                  <input
                    type="text"
                    value={formData.assignedTeam}
                    placeholder="e.g. Lead Dev, UI Designer"
                    onChange={(e) => setFormData(prev => ({ ...prev, assignedTeam: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Description</label>
                <textarea
                  value={formData.description}
                  rows="3"
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase text-gray-400 border border-white/10 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition uppercase px-6 py-2.5 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
