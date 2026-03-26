
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Plus, Minus, XCircle, RotateCw, RotateCcw, Trash2, ZoomIn, ZoomOut, Maximize2, Monitor, Copy, ArrowUp, ArrowDown, AlignLeft, AlignRight, AlignStartVertical, AlignEndVertical, AlignCenter, AlignJustify, Group, Ungroup } from 'lucide-react';
import { HallConfig, SeatData, HallElement } from '../types';
import { motion } from 'motion/react';

interface SeatingPlanProps {
  hall: HallConfig;
  seating: Record<string, SeatData>;
  onSeatClick: (id: string) => void;
  isEditable?: boolean;
  onUpdateHall?: (newConfig: HallConfig) => void;
  zoom?: number;
  previewElements?: HallElement[] | null;
  selectedElementIds: Set<string>;
  setSelectedElementIds: (ids: Set<string>) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  getTemplateElements: (tmplId: string, centerX?: number, centerY?: number) => HallElement[];
  blockRows: number;
  blockChairs: number;
  handleRemoveElements: (ids: string[]) => void;
  handleDuplicateElements: (ids: string[]) => void;
  handleReorderElements: (ids: string[], direction: 'front' | 'back') => void;
  handleAlignElements: (direction: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v') => void;
  handleGroupElements: () => void;
  handleUngroupElements: () => void;
  handleUpdateElements: (ids: string[], updater: (el: HallElement) => Partial<HallElement>) => void;
  selectionBoundingBox: { minX: number, minY: number, maxX: number, maxY: number, centerX: number, centerY: number } | null;
}

const SeatingPlan: React.FC<SeatingPlanProps> = ({ 
  hall, seating, onSeatClick, isEditable, onUpdateHall, zoom = 1, previewElements,
  selectedElementIds, setSelectedElementIds, onUndo, onRedo,
  getTemplateElements, blockRows, blockChairs,
  handleRemoveElements, handleDuplicateElements, handleReorderElements,
  handleAlignElements, handleDistributeElements, handleGroupElements, handleUngroupElements, handleUpdateElements,
  selectionBoundingBox
}) => {
  const [selectionBox, setSelectionBox] = React.useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedElementId = selectedElementIds.size === 1 ? Array.from(selectedElementIds)[0] : null;

  // Keyboard listener for deletion and nudge
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditable) return;
      
      // Don't trigger if typing in an input
      if (document.activeElement?.tagName === 'INPUT') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.size > 0) {
        if (!onUpdateHall || !hall.elements) return;
        const newElements = hall.elements.filter(el => !selectedElementIds.has(el.id));
        onUpdateHall({ ...hall, elements: newElements });
        setSelectedElementIds(new Set());
      }

      // Nudge with arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedElementIds.size > 0) {
        e.preventDefault();
        const step = e.ctrlKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

        handleUpdateElements(Array.from(selectedElementIds), (el) => ({
          x: el.x + dx,
          y: el.y + dy
        }));
      }

      // Copy/Paste (Simple implementation)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedElementIds.size > 0) {
        // Store in local storage or state for simple copy
        localStorage.setItem('seating_plan_clipboard', JSON.stringify(
          hall.elements?.filter(el => selectedElementIds.has(el.id))
        ));
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const clipboard = localStorage.getItem('seating_plan_clipboard');
        if (clipboard && onUpdateHall && hall.elements) {
          const elementsToPaste = JSON.parse(clipboard) as HallElement[];
          const newElements = elementsToPaste.map(el => ({
            ...el,
            id: Math.random().toString(36).substr(2, 9),
            x: el.x + 20,
            y: el.y + 20
          }));
          onUpdateHall({ ...hall, elements: [...hall.elements, ...newElements] });
          setSelectedElementIds(new Set(newElements.map(el => el.id)));
        }
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          onRedo?.();
        } else {
          onUndo?.();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        onRedo?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, isEditable, hall.elements, onUpdateHall]);

  const workspaceWidth = hall.width || 1200;
  const workspaceHeight = hall.height || 800;

  const handleAddSeat = (rowIndex: number) => {
    if (!onUpdateHall) return;
    const newRows = [...hall.rows];
    const row = newRows[rowIndex];
    const nextNumber = (row.seats.filter(s => s.type === 'seat').length + 1).toString();
    row.seats.push({ number: nextNumber, type: 'seat' });
    onUpdateHall({ ...hall, rows: newRows });
  };

  const handleRemoveSeat = (rowIndex: number) => {
    if (!onUpdateHall) return;
    const newRows = [...hall.rows];
    const row = newRows[rowIndex];
    if (row.seats.length > 0) {
      row.seats.pop();
      onUpdateHall({ ...hall, rows: newRows });
    }
  };

  const handleAddRow = () => {
    if (!onUpdateHall) return;
    const lastRowChar = hall.rows.length > 0 ? hall.rows[hall.rows.length - 1].row : '@';
    const nextRowChar = String.fromCharCode(lastRowChar.charCodeAt(0) + 1);
    const newRows = [...hall.rows, { row: nextRowChar, seats: Array.from({ length: 10 }, (_, i) => ({ number: (i + 1).toString(), type: 'seat' })) }];
    onUpdateHall({ ...hall, rows: newRows });
  };

  const handleRemoveRow = (rowIndex: number) => {
    if (!onUpdateHall) return;
    const newRows = hall.rows.filter((_, i) => i !== rowIndex);
    onUpdateHall({ ...hall, rows: newRows });
  };

  const handleUpdateElement = (id: string, updates: Partial<HallElement>) => {
    if (!onUpdateHall || !hall.elements) return;
    const newElements = hall.elements.map(el => el.id === id ? { ...el, ...updates } : el);
    onUpdateHall({ ...hall, elements: newElements });
  };

  const selectedElements = useMemo(() => 
    hall.elements?.filter(el => selectedElementIds.has(el.id)) || [], 
  [hall.elements, selectedElementIds]);

  const handleRemoveElement = (id: string) => {
    handleRemoveElements?.([id]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditable || e.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
    
    if (!e.ctrlKey) {
      setSelectedElementIds(new Set());
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setMousePos({ x, y });

    if (selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, x2: x, y2: y } : null);

      // Update selection
      if (hall.elements) {
        const xMin = Math.min(selectionBox.x1, x);
        const xMax = Math.max(selectionBox.x1, x);
        const yMin = Math.min(selectionBox.y1, y);
        const yMax = Math.max(selectionBox.y1, y);

        const newSelected = new Set(e.ctrlKey ? selectedElementIds : []);
        hall.elements.forEach(el => {
          const elWidth = el.width || 40;
          const elHeight = el.height || 40;
          if (el.x < xMax && el.x + elWidth > xMin && el.y < yMax && el.y + elHeight > yMin) {
            newSelected.add(el.id);
          }
        });
        setSelectedElementIds(newSelected);
      }
    }
  };

  const handleMouseUp = () => {
    setSelectionBox(null);
  };

  const handleWorkspaceResize = (e: React.MouseEvent, direction: 'right' | 'bottom' | 'corner') => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = workspaceWidth;
    const startHeight = workspaceHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!onUpdateHall) return;
      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction === 'right' || direction === 'corner') {
        newWidth = Math.max(800, startWidth + (moveEvent.clientX - startX) / zoom);
      }
      if (direction === 'bottom' || direction === 'corner') {
        newHeight = Math.max(600, startHeight + (moveEvent.clientY - startY) / zoom);
      }
      
      onUpdateHall({ ...hall, width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const [isDragOver, setIsDragOver] = React.useState(false);
  const [groupDragOffset, setGroupDragOffset] = React.useState({ x: 0, y: 0 });
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [ghostPos, setGhostPos] = React.useState<{ x: number, y: number } | null>(null);
  const [activeGuides, setActiveGuides] = React.useState<{ x?: number, y?: number } | null>(null);

  const snapSize = 10; // 10px grid snap for professional feel
  const snapToGrid = (val: number) => Math.round(val / snapSize) * snapSize;

  const getMagneticPos = (x: number, y: number, width: number, height: number, excludeIds: Set<string>) => {
    let nx = snapToGrid(x);
    let ny = snapToGrid(y);
    const threshold = 15;
    let guides: { x?: number, y?: number } = {};

    if (!hall.elements) return { x: nx, y: ny, guides };

    for (const el of hall.elements) {
      if (excludeIds.has(el.id)) continue;

      const elWidth = el.width || 40;
      const elHeight = el.height || 40;

      // Vertical alignment
      if (Math.abs(x - el.x) < threshold) { nx = el.x; guides.x = el.x; }
      if (Math.abs((x + width) - (el.x + elWidth)) < threshold) { nx = el.x + elWidth - width; guides.x = el.x + elWidth; }
      if (Math.abs((x + width / 2) - (el.x + elWidth / 2)) < threshold) { nx = el.x + elWidth / 2 - width / 2; guides.x = el.x + elWidth / 2; }

      // Horizontal alignment
      if (Math.abs(y - el.y) < threshold) { ny = el.y; guides.y = el.y; }
      if (Math.abs((y + height) - (el.y + elHeight)) < threshold) { ny = el.y + elHeight - height; guides.y = el.y + elHeight; }
      if (Math.abs((y + height / 2) - (el.y + elHeight / 2)) < threshold) { ny = el.y + elHeight / 2 - height / 2; guides.y = el.y + elHeight / 2; }
    }

    return { x: nx, y: ny, guides };
  };

  const renderElement = (el: HallElement) => {
    if (el.type === 'stage') {
      return (
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          <span className="text-white font-black tracking-[0.3em] text-sm uppercase opacity-80">{el.label || 'SAHNE'}</span>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/30"></div>
        </div>
      );
    }

    if (el.type === 'chair') {
      const chairData = seating[el.id];
      let chairBg = 'bg-slate-100';
      let chairBorder = 'border-slate-200';
      let chairText = 'text-slate-500';

      if (chairData) {
        if (chairData.type === 'ozel') { chairBg = 'bg-amber-400'; chairBorder = 'border-amber-600'; chairText = 'text-black'; }
        else if (chairData.type === 'dolu') { chairBg = 'bg-blue-600'; chairBorder = 'border-blue-800'; chairText = 'text-white'; }
        else if (chairData.type === 'bekliyor') { chairBg = 'bg-slate-400'; chairBorder = 'border-slate-500'; chairText = 'text-white'; }
      }

      return (
        <div className={`w-full h-full ${chairBg} border ${chairBorder} rounded-xl flex flex-col items-center justify-center shadow-sm group-hover:border-blue-400 transition-colors relative overflow-hidden p-1`}>
          <span className={`text-[10px] font-black ${chairText} truncate w-full text-center`}>
            {el.seatNumber || el.label || ''}
          </span>
        </div>
      );
    }

    if (el.type.includes('table')) {
      const isRound = el.type === 'table-round';
      const chairCount = el.chairCount || 8;
      const w = el.width || 120;
      const h = el.height || 120;

      return (
        <>
          <span className="font-black uppercase tracking-tighter select-none text-xs text-slate-400">
            {el.seatNumber || el.label || ''}
          </span>
          {Array.from({ length: chairCount }).map((_, i) => {
            let cx = 0;
            let cy = 0;
            let rotation = 0;

            if (isRound) {
              const angle = (i / chairCount) * Math.PI * 2;
              const radiusX = w / 2 + 25;
              const radiusY = h / 2 + 25;
              cx = Math.cos(angle) * radiusX;
              cy = Math.sin(angle) * radiusY;
              rotation = angle * 180 / Math.PI + 90;
            } else {
              // Rectangular/Square placement logic
              const perimeter = 2 * (w + h);
              const spacing = perimeter / chairCount;
              const pos = i * spacing;

              if (pos < w) { // Top edge
                cx = pos - w / 2;
                cy = -h / 2 - 25;
                rotation = 0;
              } else if (pos < w + h) { // Right edge
                cx = w / 2 + 25;
                cy = (pos - w) - h / 2;
                rotation = 90;
              } else if (pos < 2 * w + h) { // Bottom edge
                cx = w / 2 - (pos - (w + h));
                cy = h / 2 + 25;
                rotation = 180;
              } else { // Left edge
                cx = -w / 2 - 25;
                cy = h / 2 - (pos - (2 * w + h));
                rotation = 270;
              }
            }
            
            const chairId = `${el.id}-${i + 1}`;
            const chairData = seating[chairId];
            
            let chairBg = 'bg-slate-100';
            let chairBorder = 'border-slate-200';
            let chairText = 'text-slate-500';
            
            if (chairData) {
              if (chairData.type === 'ozel') { chairBg = 'bg-amber-400'; chairBorder = 'border-amber-600'; chairText = 'text-black'; }
              else if (chairData.type === 'dolu') { chairBg = 'bg-blue-600'; chairBorder = 'border-blue-800'; chairText = 'text-white'; }
              else if (chairData.type === 'bekliyor') { chairBg = 'bg-slate-400'; chairBorder = 'border-slate-500'; chairText = 'text-white'; }
            }

            return (
              <div 
                key={i}
                className={`absolute w-8 h-8 ${chairBg} border ${chairBorder} rounded-lg flex flex-col items-center justify-center text-[9px] font-bold ${chairText} shadow-sm z-10 p-0.5`}
                style={{
                  left: `calc(50% + ${cx}px - 16px)`,
                  top: `calc(50% + ${cy}px - 16px)`,
                  transform: `rotate(${rotation}deg)`
                }}
              >
                <span className="text-[10px] font-black">{i + 1}</span>
              </div>
            );
          })}
        </>
      );
    }

    if (el.type === 'ui-button') {
      return (
        <div className="w-full h-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg">
          <Plus className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">{el.label || 'YENİ SIRA EKLE'}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col items-center gap-1 min-w-max pb-40 relative transition-all duration-300 ${
        isDragOver ? 'bg-blue-50/50 scale-[1.01] ring-4 ring-blue-500/10 rounded-[40px]' : ''
      } ${isEditable ? 'bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] bg-[size:24px_24px]' : ''}`}
      style={{
        width: workspaceWidth,
        height: workspaceHeight,
        border: isEditable ? '2px dashed #cbd5e1' : 'none',
        borderRadius: '40px',
        position: 'relative',
        ...(hall.backgroundImage ? {
          backgroundImage: `url(${hall.backgroundImage})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        } : {
          backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }),
        backgroundColor: '#f8fafc'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const tmplId = e.dataTransfer.getData('templateId');
          const tmplName = e.dataTransfer.getData('templateName');
          const elementType = e.dataTransfer.getData('elementType');
          const blockRowsData = e.dataTransfer.getData('blockRows');
          const blockChairsData = e.dataTransfer.getData('blockChairs');
          
          const currentBlockRows = blockRowsData ? parseInt(blockRowsData) : blockRows;
          const currentBlockChairs = blockChairsData ? parseInt(blockChairsData) : blockChairs;
          
          if (elementType && onUpdateHall) {
            const rect = e.currentTarget.getBoundingClientRect();
            const dropX = (e.clientX - rect.left) / zoom;
            const dropY = (e.clientY - rect.top) / zoom;

            if (elementType === 'block-row-10') {
              const newElements: HallElement[] = Array.from({ length: currentBlockChairs }).map((_, i) => ({
                id: Math.random().toString(36).substr(2, 9),
                type: 'chair',
                x: snapToGrid(dropX - (currentBlockChairs * 25) + (i * 50)),
                y: snapToGrid(dropY - 20),
                rotation: 0,
                width: 40,
                height: 40
              }));
              onUpdateHall({ ...hall, elements: [...(hall.elements || []), ...newElements] });
              return;
            }

            if (elementType === 'block-table-10') {
              const newElement: HallElement = {
                id: Math.random().toString(36).substr(2, 9),
                type: 'table-round',
                x: snapToGrid(dropX - 75),
                y: snapToGrid(dropY - 75),
                rotation: 0,
                width: 150,
                height: 150,
                chairCount: currentBlockChairs,
              };
              onUpdateHall({ ...hall, elements: [...(hall.elements || []), newElement] });
              return;
            }

          let width = 40;
          let height = 40;
          if (elementType.includes('table')) { width = 120; height = 120; }
          else if (elementType === 'stage') { width = 400; height = 100; }
          else if (elementType === 'ui-button') { width = 160; height = 44; }

          const newElement: HallElement = {
            id: Math.random().toString(36).substr(2, 9),
            type: elementType as any,
            x: snapToGrid(dropX - width / 2),
            y: snapToGrid(dropY - height / 2),
            rotation: 0,
            width,
            height,
            chairCount: elementType.includes('table') ? currentBlockChairs : undefined,
            label: elementType === 'stage' ? 'SAHNE' : elementType === 'ui-button' ? 'YENİ SIRA EKLE' : undefined
          };
          onUpdateHall({ ...hall, elements: [...(hall.elements || []), newElement] });
          return;
        }

        if (tmplId && onUpdateHall) {
          const rect = e.currentTarget.getBoundingClientRect();
          const dropX = (e.clientX - rect.left) / zoom;
          const dropY = (e.clientY - rect.top) / zoom;
          
          if (tmplId.endsWith('_free')) {
            const newElements = getTemplateElements(tmplId, dropX, dropY);
            onUpdateHall({ ...hall, elements: [...(hall.elements || []), ...newElements] });
            return;
          } else {
            // Handle legacy row-based templates
            let newRows: any[] = [];
            if (tmplId === 'theatre') {
              newRows = [
                { row: 'A', seats: Array(10).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'B', seats: Array(10).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'C', seats: Array(10).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
              ];
            } else if (tmplId === 'classroom') {
              newRows = [
                { row: 'A', seats: [
                  { number: '1', type: 'seat' }, { number: '2', type: 'seat' }, { number: 'G1', type: 'gap' },
                  { number: '3', type: 'seat' }, { number: '4', type: 'seat' }, { number: 'G2', type: 'gap' },
                  { number: '5', type: 'seat' }, { number: '6', type: 'seat' }
                ] },
                { row: 'B', seats: [
                  { number: '1', type: 'seat' }, { number: '2', type: 'seat' }, { number: 'G1', type: 'gap' },
                  { number: '3', type: 'seat' }, { number: '4', type: 'seat' }, { number: 'G2', type: 'gap' },
                  { number: '5', type: 'seat' }, { number: '6', type: 'seat' }
                ] },
              ];
            } else if (tmplId === 'ushape') {
              newRows = [
                { row: 'SOL', seats: Array(6).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'ARKA', seats: Array(8).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'SAĞ', seats: Array(6).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
              ];
            } else if (tmplId === 'banquet' || tmplId === 'round') {
              newRows = [
                { row: 'MASA 1', seats: Array(8).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'MASA 2', seats: Array(8).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'MASA 3', seats: Array(8).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
              ];
            } else if (tmplId === 'protocol') {
              newRows = [
                { row: 'PROTOKOL', seats: Array(15).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
              ];
            } else if (tmplId === 'square') {
              newRows = [
                { row: 'KUZEY', seats: Array(6).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'DOĞU', seats: Array(6).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'GÜNEY', seats: Array(6).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'BATI', seats: Array(6).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
              ];
            } else if (tmplId === 'amphi') {
              newRows = [
                { row: 'A', seats: Array(8).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'B', seats: Array(10).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'C', seats: Array(12).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'D', seats: Array(14).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
              ];
            }
            
            onUpdateHall({
              ...hall,
              name: tmplName || hall.name,
              rows: newRows.length > 0 ? newRows as any : hall.rows,
              stage: tmplId === 'banquet' || tmplId === 'round' ? undefined : { label: 'SAHNE', position: 'top', size: 'medium' }
            });
          }
        }
      }}
    >
      {/* Design Area Content Wrapper */}
      <div className="relative w-full h-full flex flex-col items-center pointer-events-none z-[1]">
        <div className="pointer-events-auto flex flex-col items-center">
          {/* SAHNE (STAGE) - ÜST KONUM (Movable) */}
          {hall.stage?.position === 'top' && !hall.elements?.some(el => el.type === 'stage') && (
            <motion.div 
              drag={isEditable}
              dragMomentum={false}
              dragElastic={0}
              onDragEnd={(_, info) => {
                if (!onUpdateHall) return;
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                
                const newX = (info.point.x - rect.left) / zoom;
                const newY = (info.point.y - rect.top) / zoom;
                
                const newElements = [...(hall.elements || []), {
                  id: `stage_${Date.now()}`,
                  type: 'stage',
                  x: newX,
                  y: newY,
                  rotation: 0,
                  label: hall.stage?.label || 'SAHNE',
                  width: hall.stage?.size === 'small' ? 256 : hall.stage?.size === 'large' ? 600 : 384,
                  height: hall.stage?.size === 'small' ? 80 : hall.stage?.size === 'large' ? 128 : 96
                }];
                
                onUpdateHall({ ...hall, stage: undefined, elements: newElements });
              }}
              className={`
                mb-12 rounded-b-[40px] bg-slate-800 border-x-4 border-b-4 border-slate-700 shadow-2xl flex items-center justify-center relative overflow-hidden group cursor-move
                ${hall.stage.size === 'small' ? 'w-64 h-20' : hall.stage.size === 'large' ? 'w-[600px] h-32' : 'w-96 h-24'}
              `}
            >
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
              <span className="text-white font-black tracking-[0.3em] text-sm uppercase opacity-80">{hall.stage.label || 'SAHNE'}</span>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/30"></div>
              
              {isEditable && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateHall?.({ ...hall, stage: undefined }); }}
                    className="p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          <div className={`flex flex-col items-center gap-1 ${hall.stage?.position === 'bottom' ? 'flex-col-reverse' : ''}`}>
            {hall.rows.map((rowConfig, idx) => {
              if (rowConfig.type === 'label') {
                return (
                  <div key={idx} className="w-full py-6 flex items-center justify-center">
                    <div className="bg-rose-500 text-white px-10 py-2.5 rounded-full font-black text-xs tracking-[0.6em] uppercase shadow-2xl animate-in fade-in zoom-in duration-500">
                      {rowConfig.row}
                    </div>
                  </div>
                );
              }

              return (
                <div key={idx} className={`flex items-center justify-center gap-2 group relative ${hall.stage?.position === 'bottom' ? 'flex-row-reverse' : ''}`}>
                  {isEditable && (
                    <div className={`absolute ${hall.stage?.position === 'bottom' ? '-right-20' : '-left-20'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <button 
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1.5 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors"
                        title="Sırayı Sil"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleRemoveSeat(idx)}
                        className="p-1.5 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors"
                        title="Koltuk Çıkar"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleAddSeat(idx)}
                        className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                        title="Koltuk Ekle"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="w-8 h-10 flex items-center justify-end text-[12px] font-black text-blue-500 transition-colors shrink-0 pr-2">
                    {rowConfig.row}
                  </div>
                  
                  <div className={`flex items-center gap-[2px] ${hall.stage?.position === 'bottom' ? 'flex-row-reverse' : ''}`}>
                    {rowConfig.seats.map((seat, sIdx) => {
                      if (seat.type === 'gap') {
                        return (
                          <div key={sIdx} className={`${seat.size === 'large' ? 'w-12' : 'w-4'} h-10 flex items-center justify-center shrink-0`}>
                            <div className="w-[1px] h-4 bg-slate-300 opacity-30" />
                          </div>
                        );
                      }
                      
                      const seatId = `${rowConfig.row}${seat.number}`;
                      const data = seating[seatId];
                      const isStatic = seat.type === 'static';
                      
                      let bgColor = 'bg-slate-100 hover:bg-slate-200';
                      let borderColor = 'border-slate-200';
                      let textColor = 'text-slate-500';
                      
                      if (isStatic) {
                        bgColor = 'bg-slate-400 cursor-default';
                        borderColor = 'border-slate-500';
                        textColor = 'text-white';
                      } else if (data) {
                        if (data.type === 'ozel') { 
                          bgColor = 'bg-amber-400 hover:bg-amber-500'; 
                          borderColor = 'border-amber-600'; 
                          textColor = 'text-black';
                        }
                        else if (data.type === 'dolu') { 
                          bgColor = 'bg-blue-600 hover:bg-blue-700'; 
                          borderColor = 'border-blue-800'; 
                          textColor = 'text-white';
                        }
                        else if (data.type === 'bekliyor') { 
                          bgColor = 'bg-slate-400 hover:bg-slate-500'; 
                          borderColor = 'border-slate-500'; 
                          textColor = 'text-white';
                        }
                      }

                      const seatShape = hall.stage?.position === 'top' ? 'rounded-t-md rounded-b-xl' : 'rounded-b-md rounded-t-xl';

                      return (
                        <div 
                          key={sIdx}
                          onDoubleClick={() => !isStatic && onSeatClick(seatId)}
                          className={`
                            w-[40px] h-11 ${seatShape} border flex flex-col items-center justify-center relative 
                            transition-all duration-150 cursor-pointer hover:scale-125 hover:z-50 group/seat
                            ${bgColor} ${borderColor} ${textColor}
                            ${isStatic ? 'opacity-50' : ''}
                          `}
                        >
                          <span className="absolute top-0.5 right-1 text-[7px] font-bold opacity-60 leading-none">{seat.number}</span>
                          <span className="text-[11px] font-black leading-tight text-center px-0.5 uppercase overflow-hidden truncate w-full">
                            {isStatic ? seat.number : (data ? (() => {
                              const fullName = data.data?.i || '';
                              const cleanName = fullName.replace(/\(Eşi\)/g, '').trim();
                              const parts = cleanName.split(' ');
                              const initials = (parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '');
                              return initials;
                            })() : '')}
                          </span>
                          
                          {!isStatic && data && (
                            <div className={`absolute ${hall.stage?.position === 'top' ? 'top-full mt-3' : 'bottom-full mb-3'} left-1/2 -translate-x-1/2 hidden group-hover/seat:block z-[100] w-max max-w-[200px] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150`}>
                              {hall.stage?.position === 'top' && (
                                <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mb-1 border-l border-t border-slate-700" />
                              )}
                              <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-2xl text-[10px] border border-slate-700">
                                <p className="font-bold opacity-60 mb-0.5 tracking-widest uppercase">{data.data?.u}</p>
                                <p className="font-black text-sm">{data.data?.i}</p>
                              </div>
                              {hall.stage?.position !== 'top' && (
                                <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="w-8 h-10 flex items-center justify-start text-[12px] font-black text-blue-500 transition-colors shrink-0 pl-2">
                    {rowConfig.row}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* SAHNE (STAGE) - ALT KONUM (Movable) */}
          {hall.stage?.position === 'bottom' && !hall.elements?.some(el => el.type === 'stage') && (
            <motion.div 
              drag={isEditable}
              dragMomentum={false}
              dragElastic={0}
              onDragEnd={(_, info) => {
                // When dragged, convert to a regular element to allow full movement
                if (!onUpdateHall) return;
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                
                const newX = (info.point.x - rect.left) / zoom;
                const newY = (info.point.y - rect.top) / zoom;
                
                const newElements = [...(hall.elements || []), {
                  id: `stage_${Date.now()}`,
                  type: 'stage',
                  x: newX,
                  y: newY,
                  rotation: 0,
                  label: hall.stage?.label || 'SAHNE',
                  width: hall.stage?.size === 'small' ? 256 : hall.stage?.size === 'large' ? 600 : 384,
                  height: hall.stage?.size === 'small' ? 80 : hall.stage?.size === 'large' ? 128 : 96
                }];
                
                onUpdateHall({ ...hall, stage: undefined, elements: newElements });
              }}
              className={`
                mt-12 rounded-t-[40px] bg-slate-800 border-x-4 border-t-4 border-slate-700 shadow-2xl flex items-center justify-center relative overflow-hidden group cursor-move
                ${hall.stage.size === 'small' ? 'w-64 h-20' : hall.stage.size === 'large' ? 'w-[600px] h-32' : 'w-96 h-24'}
              `}
            >
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
              <span className="text-white font-black tracking-[0.3em] text-sm uppercase opacity-80">{hall.stage.label || 'SAHNE'}</span>
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/30"></div>
              
              {isEditable && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateHall?.({ ...hall, stage: undefined }); }}
                    className="p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Free-form Elements Layer */}
      <div className="absolute inset-0 pointer-events-none z-[2]">
        {/* Workspace Resize Handles */}
        {isEditable && (
          <>
            {/* Right Edge */}
            <div 
              className="absolute top-0 -right-1 w-2 h-full cursor-e-resize hover:bg-blue-500/30 transition-colors pointer-events-auto"
              onMouseDown={(e) => handleWorkspaceResize(e, 'right')}
            />
            {/* Bottom Edge */}
            <div 
              className="absolute -bottom-1 left-0 w-full h-2 cursor-s-resize hover:bg-blue-500/30 transition-colors pointer-events-auto"
              onMouseDown={(e) => handleWorkspaceResize(e, 'bottom')}
            />
            {/* Corner Handle */}
            <div 
              className="absolute -bottom-2 -right-2 w-8 h-8 cursor-se-resize flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all pointer-events-auto bg-white border-2 border-slate-200 rounded-full shadow-lg hover:scale-110 active:scale-95"
              onMouseDown={(e) => handleWorkspaceResize(e, 'corner')}
            >
              <Maximize2 className="w-5 h-5" />
            </div>
          </>
        )}

      {/* Selection Box (Marquee) */}
      {selectionBox && (
        <div 
          className="absolute border-2 border-blue-500 bg-blue-500/10 z-[1000] pointer-events-none rounded-sm"
          style={{
            left: Math.min(selectionBox.x1, selectionBox.x2),
            top: Math.min(selectionBox.y1, selectionBox.y2),
            width: Math.abs(selectionBox.x2 - selectionBox.x1),
            height: Math.abs(selectionBox.y2 - selectionBox.y1),
          }}
        />
      )}

      {/* Contextual Floating Toolbar */}
      {isEditable && selectedElementIds.size > 0 && selectionBoundingBox && (
        <div 
          className="absolute z-[1001] pointer-events-auto transition-all duration-200"
          style={{
            left: selectionBoundingBox.centerX,
            top: selectionBoundingBox.minY - 80,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1">
              {/* Alignment & Distribution Tools (Only for multi-select) */}
              {selectedElementIds.size > 1 && (
                <>
                  <button onClick={() => handleAlignElements('left')} className="p-2 hover:bg-slate-800 rounded-xl text-white transition-colors" title="Sola Hizala"><AlignLeft className="w-4 h-4" /></button>
                  <button onClick={() => handleAlignElements('top')} className="p-2 hover:bg-slate-800 rounded-xl text-white transition-colors" title="Üste Hizala"><AlignStartVertical className="w-4 h-4" /></button>
                  <button onClick={() => handleAlignElements('center-h')} className="p-2 hover:bg-slate-800 rounded-xl text-white transition-colors" title="Yatay Ortala"><AlignCenter className="w-4 h-4" /></button>
                  <button onClick={() => handleAlignElements('center-v')} className="p-2 hover:bg-slate-800 rounded-xl text-white transition-colors" title="Dikey Ortala"><AlignJustify className="w-4 h-4 rotate-90" /></button>
                  <div className="w-px h-4 bg-slate-700 mx-1" />
                  <button onClick={() => handleDistributeElements('horizontal')} className="p-2 hover:bg-slate-800 rounded-xl text-white transition-colors" title="Yatay Dağıt"><AlignStartVertical className="w-4 h-4" /></button>
                  <button onClick={() => handleDistributeElements('vertical')} className="p-2 hover:bg-slate-800 rounded-xl text-white transition-colors" title="Dikey Dağıt"><AlignEndVertical className="w-4 h-4 rotate-90" /></button>
                  <div className="w-px h-4 bg-slate-700 mx-1" />
                </>
              )}
              
              <button 
                onClick={() => handleUpdateElements(Array.from(selectedElementIds), (el) => ({ rotation: (el.rotation || 0) + 15 }))} 
                className="p-2 hover:bg-slate-800 rounded-xl text-white transition-colors" 
                title="Döndür"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button onClick={() => handleDuplicateElements(Array.from(selectedElementIds))} className="p-2 hover:bg-slate-800 rounded-xl text-white transition-colors" title="Kopyala"><Copy className="w-4 h-4" /></button>
              <button onClick={() => handleReorderElements(Array.from(selectedElementIds), 'front')} className="p-2 hover:bg-slate-800 rounded-xl text-white transition-colors" title="Öne Getir"><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => handleReorderElements(Array.from(selectedElementIds), 'back')} className="p-2 hover:bg-slate-800 rounded-xl text-white transition-colors" title="Arkaya Gönder"><ArrowDown className="w-4 h-4" /></button>
              
              <div className="w-px h-4 bg-slate-700 mx-1" />
              
              {/* Table Specific Controls */}
              {selectedElements.some(el => el.type.includes('table')) && (
                <div className="flex items-center gap-1 bg-slate-800 rounded-xl px-1">
                  <button 
                    onClick={() => handleUpdateElements(Array.from(selectedElementIds), (el) => ({ chairCount: Math.max(0, (el.chairCount || 0) - 1) }))}
                    className="p-2 hover:bg-slate-700 rounded-lg text-white transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] font-bold text-blue-400 min-w-[20px] text-center">
                    {selectedElements.find(el => el.type.includes('table'))?.chairCount || 0}
                  </span>
                  <button 
                    onClick={() => handleUpdateElements(Array.from(selectedElementIds), (el) => ({ chairCount: (el.chairCount || 0) + 1 }))}
                    className="p-2 hover:bg-slate-700 rounded-lg text-white transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="w-px h-4 bg-slate-700 mx-1" />
              
              <button onClick={() => handleRemoveElements(Array.from(selectedElementIds))} className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors" title="Sil"><Trash2 className="w-4 h-4" /></button>
            </div>

            {/* Bulk Labeling Input */}
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-1 shadow-2xl flex items-center gap-2 w-64">
              <div className="bg-blue-600 px-2 py-1 rounded-lg text-[8px] font-black text-white uppercase tracking-tighter shrink-0">
                {selectedElementIds.size === 1 ? 'ETİKET' : 'TOPLU'}
              </div>
              <input 
                type="text"
                placeholder="İSİMLENDİR..."
                value={selectedElementIds.size === 1 ? (selectedElements[0].label || selectedElements[0].seatNumber || '') : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  handleUpdateElements(Array.from(selectedElementIds), (el) => ({
                    [el.type === 'chair' ? 'seatNumber' : 'label']: val
                  }));
                }}
                className="w-full bg-transparent px-2 py-1 text-[10px] font-bold uppercase text-white focus:outline-none placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>
      )}

        {/* Snapping Guides */}
        {activeGuides && (
          <>
            {activeGuides.x !== undefined && (
              <div 
                className="absolute top-0 bottom-0 w-[1px] bg-blue-500/50 z-[200] pointer-events-none"
                style={{ left: activeGuides.x }}
              />
            )}
            {activeGuides.y !== undefined && (
              <div 
                className="absolute left-0 right-0 h-[1px] bg-blue-500/50 z-[200] pointer-events-none"
                style={{ top: activeGuides.y }}
              />
            )}
          </>
        )}

        {/* Ghost Preview */}
        {isEditable && ghostPos && activeDragId && (
          <div 
            className="absolute border-2 border-blue-400/50 bg-blue-400/10 rounded-xl pointer-events-none z-[50]"
            style={{
              left: ghostPos.x,
              top: ghostPos.y,
              width: (hall.elements?.find(el => el.id === activeDragId)?.width || 40),
              height: (hall.elements?.find(el => el.id === activeDragId)?.height || 40),
            }}
          />
        )}

        {/* Template Preview Elements (Hover Ghost) */}
        {previewElements && (
          <div 
            style={{
              position: 'absolute',
              left: mousePos.x,
              top: mousePos.y,
              pointerEvents: 'none',
              zIndex: 200,
              opacity: 0.5
            }}
          >
            {previewElements.map((el) => (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width || 40,
                  height: el.height || 40,
                  rotate: `${el.rotation || 0}deg`,
                  zIndex: 100,
                  pointerEvents: 'none'
                }}
                className="flex items-center justify-center border-2 border-blue-400 border-dashed rounded-lg bg-blue-50/50"
              >
                {renderElement(el)}
              </div>
            ))}
          </div>
        )}

        {/* Selection Bounding Box / Group Container */}
        {selectionBoundingBox && selectedElementIds.size > 1 && (
          <div 
            className="absolute border-2 border-blue-500/40 border-dashed rounded-3xl pointer-events-none z-[150] bg-blue-500/5 animate-[pulse_3s_infinite]"
            style={{
              left: selectionBoundingBox.minX - 20 + groupDragOffset.x,
              top: selectionBoundingBox.minY - 20 + groupDragOffset.y,
              width: (selectionBoundingBox.maxX - selectionBoundingBox.minX) + 40,
              height: (selectionBoundingBox.maxY - selectionBoundingBox.minY) + 40,
            }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
              GRUP SEÇİLİ ({selectedElementIds.size} Öğe)
            </div>
          </div>
        )}

        {/* Contextual Toolbar removed - now in App.tsx */}

        {hall.elements?.map((el) => {
          const isSelected = selectedElementIds.has(el.id);
          const isBeingDragged = activeDragId === el.id;
          const shouldApplyGroupOffset = isSelected && activeDragId !== null && !isBeingDragged;
          const seatId = el.seatNumber;
          const data = seatId ? seating[seatId] : null;
          
          let bgColor = 'bg-slate-200';
          let borderColor = 'border-slate-300';
          let textColor = 'text-slate-500';

          if (el.type === 'chair' && data) {
            if (data.type === 'ozel') { bgColor = 'bg-amber-400'; borderColor = 'border-amber-600'; textColor = 'text-black'; }
            else if (data.type === 'dolu') { bgColor = 'bg-blue-600'; borderColor = 'border-blue-800'; textColor = 'text-white'; }
            else if (data.type === 'bekliyor') { bgColor = 'bg-slate-400'; borderColor = 'border-slate-500'; textColor = 'text-white'; }
          } else if (el.type.includes('table')) {
            bgColor = 'bg-slate-700';
            borderColor = 'border-slate-600';
            textColor = 'text-white';
          } else if (el.type === 'stage') {
            bgColor = 'bg-slate-800';
            borderColor = 'border-slate-700';
            textColor = 'text-white';
          } else if (el.type === 'ui-button') {
            bgColor = 'bg-blue-600';
            borderColor = 'border-blue-500';
            textColor = 'text-white';
          }

          return (
            <motion.div
              key={el.id}
              drag={isEditable}
              dragMomentum={false}
              dragElastic={0}
              dragTransition={{ power: 0, timeConstant: 0 }}
              onDragStart={() => {
                setActiveDragId(el.id);
              }}
              onDrag={(_, info) => {
                const deltaX = info.offset.x / zoom;
                const deltaY = info.offset.y / zoom;
                
                const width = el.width || 40;
                const height = el.height || 40;
                const { x: snappedX, y: snappedY, guides } = getMagneticPos(el.x + deltaX, el.y + deltaY, width, height, selectedElementIds);
                
                setGhostPos({ x: snappedX, y: snappedY });
                setActiveGuides(guides);

                if (selectedElementIds.has(el.id) && selectedElementIds.size > 1) {
                  const dx = snappedX - el.x;
                  const dy = snappedY - el.y;
                  setGroupDragOffset({ x: dx, y: dy });
                }
              }}
              onDragEnd={(_, info) => {
                const deltaX = info.offset.x / zoom;
                const deltaY = info.offset.y / zoom;
                const width = el.width || 40;
                const height = el.height || 40;
                const { x: snappedX, y: snappedY } = getMagneticPos(el.x + deltaX, el.y + deltaY, width, height, selectedElementIds);
                
                const dx = snappedX - el.x;
                const dy = snappedY - el.y;

                if (selectedElementIds.has(el.id) && selectedElementIds.size > 1) {
                  if (!onUpdateHall || !hall.elements) return;
                  const newElements = hall.elements.map(item => {
                    if (selectedElementIds.has(item.id)) {
                      return {
                        ...item,
                        x: item.x + dx,
                        y: item.y + dy
                      };
                    }
                    return item;
                  });
                  onUpdateHall({ ...hall, elements: newElements });
                } else {
                  handleUpdateElement(el.id, { x: snappedX, y: snappedY });
                }

                setActiveDragId(null);
                setGroupDragOffset({ x: 0, y: 0 });
                setGhostPos(null);
                setActiveGuides(null);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (el.type === 'chair' && el.seatNumber) {
                  onSeatClick(el.seatNumber);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (el.type === 'ui-button') {
                  handleAddRow();
                  return;
                }
                
                const newSelected = new Set(selectedElementIds);
                const isAlreadySelected = newSelected.has(el.id);
                const isMultiSelect = e.ctrlKey || e.metaKey;

                if (isAlreadySelected) {
                  if (isMultiSelect) {
                    // Toggle off
                    if (el.groupId) {
                      hall.elements?.filter(e => e.groupId === el.groupId).forEach(e => newSelected.delete(e.id));
                    } else {
                      newSelected.delete(el.id);
                    }
                  } else if (selectedElementIds.size > 1) {
                    // If multiple selected and we click one of them without Ctrl, select ONLY that one/group
                    newSelected.clear();
                    if (el.groupId) {
                      hall.elements?.filter(e => e.groupId === el.groupId).forEach(e => newSelected.add(e.id));
                    } else {
                      newSelected.add(el.id);
                    }
                  }
                  // If only this one is selected and we click it without Ctrl, keep it selected (standard behavior)
                } else {
                  if (!isMultiSelect) {
                    newSelected.clear();
                  }
                  if (el.groupId) {
                    hall.elements?.filter(e => e.groupId === el.groupId).forEach(e => newSelected.add(e.id));
                  } else {
                    newSelected.add(el.id);
                  }
                }
                setSelectedElementIds(newSelected);
              }}
              className={`
                absolute pointer-events-auto cursor-move flex items-center justify-center
                ${bgColor} ${borderColor} ${textColor} border shadow-sm
                ${isSelected ? 'shadow-2xl shadow-blue-500/40 ring-2 ring-blue-500 ring-offset-2' : ''}
                ${isBeingDragged ? 'opacity-50 scale-105 shadow-2xl' : ''}
                ${el.type === 'chair' ? 'rounded-xl border-2' : el.type === 'table-round' ? 'rounded-full border-4' : el.type === 'stage' ? 'rounded-b-[40px] border-x-4 border-b-4' : 'rounded-2xl border-4'}
                transition-shadow duration-200
              `}
              style={{
                left: el.x + (shouldApplyGroupOffset ? groupDragOffset.x : 0),
                top: el.y + (shouldApplyGroupOffset ? groupDragOffset.y : 0),
                width: el.width || (el.type === 'stage' ? 400 : 40),
                height: el.height || (el.type === 'stage' ? 100 : 40),
                rotate: el.rotation,
                zIndex: (el.z || 0) + (isSelected ? 200 : 100),
                scale: 1 + (el.h || 0) * 0.05,
                boxShadow: el.h ? `0 ${el.h * 4}px ${el.h * 8}px rgba(0,0,0,0.2)` : undefined
              }}
            >
              {/* Selection Ring */}
              {isSelected && (
                <div className="absolute -inset-3 border-4 border-blue-500/30 border-dashed rounded-[inherit] animate-[pulse_2s_infinite]" />
              )}

              {/* Quick Delete Button - Only for single selection or hover? User wants it to work. */}
              {isSelected && isEditable && selectedElementIds.size === 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRemoveElement(el.id); }}
                  className="absolute -top-3 -right-3 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-xl z-[301] hover:bg-rose-600 transition-all hover:scale-110 active:scale-90 pointer-events-auto"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Rotation Control - Improved angle-based rotation */}
              {isSelected && isEditable && selectedElementIds.size === 1 && (
                <button 
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;

                    // Calculate center of the element in screen coordinates
                    const centerX = rect.left + (el.x + (el.width || 40) / 2) * zoom;
                    const centerY = rect.top + (el.y + (el.height || 40) / 2) * zoom;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
                      const degrees = (angle * 180) / Math.PI + 90; // +90 to align handle with top
                      handleUpdateElement(el.id, { rotation: Math.round(degrees / 5) * 5 }); // 5 degree steps for precision
                    };
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  className="absolute -bottom-3 -right-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl z-[301] hover:bg-blue-700 transition-all hover:scale-110 active:scale-90 cursor-alias border-2 border-white"
                  title="Hassas Döndür"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              )}

              {/* Element Content */}
              {renderElement(el)}

              {/* Remove the individual toolbars from inside the loop */}
            </motion.div>
          );
        })}
      </div>

    </div>
  );
};

export default SeatingPlan;
