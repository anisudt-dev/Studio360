import { Check } from 'lucide-react';
import { PROJECT_FLOW, PROJECT_STATUS_STYLE } from '@/lib/constants';
import type { ProjectStatus } from '@/lib/types';

export function BookingTimeline({ current }: { current: ProjectStatus }) {
  const currentIndex = PROJECT_FLOW.indexOf(current);

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {PROJECT_FLOW.map((status, i) => {
        const style = PROJECT_STATUS_STYLE[status];
        const done = i < currentIndex;
        const active = i === currentIndex;
        const isLast = i === PROJECT_FLOW.length - 1;
        return (
          <div key={status} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-2 w-24">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                done ? 'bg-teal-600 text-white' :
                active ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-600 ring-offset-2' :
                'bg-gray-100 text-gray-400'
              }`}>
                {done ? <Check size={18} /> : <span className="text-sm font-bold">{i + 1}</span>}
              </div>
              <span className={`text-xs font-medium text-center leading-tight ${active ? 'text-teal-700' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                {style.label}
              </span>
            </div>
            {!isLast && (
              <div className={`h-0.5 w-8 sm:w-12 mt-[-24px] rounded ${done ? 'bg-teal-600' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
