import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Users, Building2, FolderKanban, CheckSquare, 
  FileText, CornerDownLeft, X, Terminal, Cpu 
} from 'lucide-react';

export default function CommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Toggle Command Bar on Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch index lists from Firestore when command bar opens
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
      return;
    }

    // Delay focus to allow modal animation to complete
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    const fetchSearchIndex = async () => {
      setLoading(true);
      try {
        const collections = [
          { name: 'leads', type: 'Lead', route: '/admin/leads', icon: Users, labelField: 'name', subField: 'email' },
          { name: 'clients', type: 'Client', route: '/admin/clients', icon: Building2, labelField: 'ownerName', subField: 'companyName' },
          { name: 'projects', type: 'Project', route: '/admin/projects', icon: FolderKanban, labelField: 'name', subField: 'status' },
          { name: 'tasks', type: 'Task', route: '/admin/tasks', icon: CheckSquare, labelField: 'title', subField: 'status' },
          { name: 'invoices', type: 'Invoice', route: '/admin/invoices', icon: FileText, labelField: 'invoiceNumber', subField: 'status' },
          { name: 'proposals', type: 'Proposal', route: '/admin/proposals', icon: FileText, labelField: 'title', subField: 'status' }
        ];

        const allResults = [];
        
        await Promise.all(
          collections.map(async (col) => {
            try {
              const q = query(collection(db, col.name), limit(30));
              const snap = await getDocs(q);
              
              snap.forEach((doc) => {
                const data = doc.data();
                const label = data[col.labelField] || data.name || data.title || 'Untitled';
                const sub = data[col.subField] || '';
                
                allResults.push({
                  id: doc.id,
                  type: col.type,
                  title: label,
                  subtitle: sub,
                  route: col.route,
                  icon: col.icon,
                  searchString: `${label} ${sub} ${col.type}`.toLowerCase()
                });
              });
            } catch (err) {
              console.warn(`CommandBar failed to index collection ${col.name}:`, err);
            }
          })
        );

        setItems(allResults);
      } catch (err) {
        console.error('Failed to compile search indices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchIndex();
  }, [isOpen]);

  // Filter items based on local search string
  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const searchTerms = search.toLowerCase().split(' ');
    return searchTerms.every((term) => item.searchString.includes(term));
  });

  // Keep selected index in bound
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems, selectedIndex]);

  // Handle keyboard navigation inside search list
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  const handleSelect = (item) => {
    setIsOpen(false);
    // Navigate with item id state to support local detail panel opening
    navigate(item.route, { state: { selectId: item.id } });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh] px-4"
          onKeyDown={handleKeyDown}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-[#09090B] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10"
            ref={containerRef}
          >
            {/* Input Wrapper */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
              <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                aria-label="Search items"
                placeholder="Search leads, clients, projects, tasks, invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-0 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-0 normal-case"
              />
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close search panel"
                className="p-1 rounded hover:bg-white/5 transition text-gray-500 hover:text-white focus-visible:ring-1 focus-visible:ring-[#5E0ED7] focus-visible:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results Box */}
            <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
              {loading && filteredItems.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500">
                  <Cpu className="w-6 h-6 animate-spin text-[#5E0ED7]" />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Compiling Indices...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No matching files or commands found.
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const Icon = item.icon || Terminal;
                  const isSelected = selectedIndex === idx;

                  return (
                    <button
                      key={`${item.type}-${item.id}-${idx}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-3.5 py-3 rounded-lg flex items-center justify-between transition-all duration-150 focus-visible:ring-1 focus-visible:ring-[#5E0ED7] focus-visible:outline-none ${
                        isSelected 
                          ? 'bg-[#5E0ED7]/10 border border-[#5E0ED7]/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                          : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-1.5 rounded-md border flex items-center justify-center ${
                          isSelected ? 'border-[#5E0ED7]/20 bg-[#5E0ED7]/10 text-white' : 'border-white/5 bg-white/5 text-gray-500'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs font-semibold uppercase tracking-wide truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                            {item.title}
                          </span>
                          <span className="text-[9px] text-gray-500 truncate mt-0.5">
                            {item.subtitle || 'Active Record'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-bold tracking-widest px-2 py-0.5 rounded uppercase font-mono border ${
                          isSelected ? 'text-[#5E0ED7] bg-[#5E0ED7]/10 border-[#5E0ED7]/20' : 'text-gray-600 bg-white/5 border-white/5'
                        }`}>
                          {item.type}
                        </span>
                        {isSelected && (
                          <CornerDownLeft className="w-3.5 h-3.5 text-purple-400" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Sticky bottom guide */}
            <div className="px-4 py-3 bg-[#0A0A0C] border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-gray-600">
              <div className="flex gap-4">
                <span>↑↓ to navigate</span>
                <span>enter to select</span>
                <span>esc to close</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Quick Access</span>
                <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">⌘K</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
