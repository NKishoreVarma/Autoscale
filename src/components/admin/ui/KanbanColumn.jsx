import React, { useCallback } from 'react';

export default function KanbanColumn({ title, count = 0, children, onDrop, columnId }) {
  const hasChildren = React.Children.count(children) > 0;

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    if (!onDrop) return;

    const data = e.dataTransfer.getData('application/json');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        onDrop(parsed, columnId);
      } catch (err) {
        console.error('KanbanColumn drop parse error:', err);
      }
    }
  }, [onDrop, columnId]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <div
      className="w-80 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col h-[calc(100vh-280px)] overflow-hidden flex-shrink-0"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center flex-shrink-0">
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          {title}
        </span>
        <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
          {count}
        </span>
      </div>

      {/* Column Body */}
      <div className="flex-grow overflow-y-auto p-3 flex flex-col gap-3 no-scrollbar">
        {hasChildren ? (
          children
        ) : (
          <div className="py-12 text-center text-xs text-gray-600 uppercase tracking-widest border border-dashed border-white/5 rounded-lg flex-grow flex items-center justify-center">
            Empty Stage
          </div>
        )}
      </div>
    </div>
  );
}
