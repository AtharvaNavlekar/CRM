import React from 'react';
import {
  Table,
  LayoutDashboard,
  Plus,
  PhoneCall,
  MessageSquare
} from 'lucide-react';

export type BottomNavView = 'leads' | 'dashboard' | 'add' | 'calls' | 'whatsapp';

interface BottomNavBarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onAddLead: () => void;
}

/**
 * BottomNavBar — Mobile-only persistent navigation bar.
 * 
 * Rendered at the bottom of the screen on devices narrower than 640px.
 * Provides quick access to the 5 most-used CRM views.
 * The center "Add" button opens the AddLeadModal instead of navigating.
 * 
 * Follows Material Design 3 Bottom Navigation specifications:
 * - 80px height with 48×48dp touch targets
 * - Active indicator: pill-shaped highlight behind icon
 * - Max 5 destinations
 */
export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentView,
  onViewChange,
  onAddLead
}) => {
  const items: { id: BottomNavView; label: string; icon: React.FC<any>; action?: () => void }[] = [
    { id: 'leads', label: 'Leads', icon: Table },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'add', label: 'Add', icon: Plus, action: onAddLead },
    { id: 'calls', label: 'Calls', icon: PhoneCall },
    { id: 'whatsapp', label: 'Chat', icon: MessageSquare }
  ];

  return (
    <nav
      role="navigation"
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#F8FAF8]/95 dark:bg-[#111413]/95 backdrop-blur-md border-t border-[#BEC9C5]/40 dark:border-[#3F4946]/40 select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-20 max-w-md mx-auto px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isAdd = item.id === 'add';
          const isActive = !isAdd && currentView === item.id;

          if (isAdd) {
            // Elevated center button for primary action
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                aria-label="Add new lead"
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#00695C] text-white flex items-center justify-center shadow-lg hover:bg-[#005449] active:scale-95 transition-all">
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-medium text-[#00695C] dark:text-[#80D5C4] mt-1">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (item.action ? item.action() : onViewChange(item.id))}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-2 py-1 group"
            >
              {/* M3 Active Indicator — pill behind icon */}
              <div
                className={`w-16 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-[#CCE8E1] dark:bg-[#005046]'
                    : 'bg-transparent group-hover:bg-[#ECEFEC] dark:group-hover:bg-[#272B2A]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive
                      ? 'text-[#00695C] dark:text-[#80D5C4]'
                      : 'text-[#6F7976] dark:text-[#89938F] group-hover:text-[#3F4946] dark:group-hover:text-[#BEC9C5]'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] mt-0.5 transition-colors ${
                  isActive
                    ? 'font-semibold text-[#00695C] dark:text-[#80D5C4]'
                    : 'font-medium text-[#6F7976] dark:text-[#89938F]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
