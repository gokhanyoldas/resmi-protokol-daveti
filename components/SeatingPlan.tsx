
import React from 'react';
import { HallConfig, SeatData } from '../types';

interface SeatingPlanProps {
  hall: HallConfig;
  seating: Record<string, SeatData>;
  onSeatClick: (id: string) => void;
}

const SeatingPlan: React.FC<SeatingPlanProps> = ({ hall, seating, onSeatClick }) => {
  return (
    <div className="flex flex-col gap-1 min-w-max pb-40">
      {hall.rows.map((rowConfig, idx) => (
        <div key={idx} className="flex items-center justify-center gap-2 group">
          <div className="w-8 h-10 flex items-center justify-end text-[12px] font-black text-blue-500 transition-colors shrink-0 pr-2">
            {rowConfig.row}
          </div>
          
          <div className="flex items-center gap-[2px]">
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
              
              let bgColor = 'bg-slate-200 hover:bg-slate-300';
              let borderColor = 'border-slate-300';
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

              return (
                <div 
                  key={sIdx}
                  onClick={() => !isStatic && onSeatClick(seatId)}
                  className={`
                    w-[40px] h-11 rounded-t-md rounded-b-xl border flex flex-col items-center justify-center relative 
                    transition-all duration-150 cursor-pointer hover:scale-125 hover:z-50 group/seat
                    ${bgColor} ${borderColor} ${textColor}
                    ${isStatic ? 'opacity-50' : ''}
                  `}
                >
                  <span className="absolute top-0.5 right-1 text-[8px] font-bold opacity-60 leading-none">{seat.number}</span>
                  <span className="text-[10px] font-black leading-tight text-center px-0.5 uppercase overflow-hidden">
                    {isStatic ? seat.number : (data ? (() => {
                      const fullName = data.data?.i || '';
                      const cleanName = fullName.replace(/\(Eşi\)/g, '').trim();
                      const parts = cleanName.split(' ');
                      const initials = (parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '');
                      return initials;
                    })() : '')}
                  </span>
                  
                  {/* Sadece koltuk dolu olduğunda ve statik değilse tooltip göster */}
                  {!isStatic && data && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover/seat:block z-[100] w-max max-w-[200px] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-2xl text-[10px] border border-slate-700">
                        <p className="font-bold opacity-60 mb-0.5 tracking-widest uppercase">{data.data?.u}</p>
                        <p className="font-black text-sm">{data.data?.i}</p>
                      </div>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700" />
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
      ))}
    </div>
  );
};

export default SeatingPlan;
