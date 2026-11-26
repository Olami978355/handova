import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, MessageSquare, User, LayoutDashboard, Plus } from 'lucide-react';
import { useConversationsContext } from '../context/ConversationsContext';

interface BottomTabBarProps {
  role?: string;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalUnreadCount } = useConversationsContext();

  const isLister = role === 'landlord' || role === 'agent' || role === 'company';

  const dashboardPath = role === 'landlord'
    ? '/landlord/dashboard'
    : role === 'agent'
    ? '/agent/dashboard'
    : role === 'company'
    ? '/company/dashboard'
    : '/dashboard';

  const tenantTabs = [
    { id: 'explore', icon: Search, label: 'Explore', path: '/listings' },
    { id: 'saved', icon: Heart, label: 'Saved', path: '/saved' },
    { id: 'messages', icon: MessageSquare, label: 'Messages', path: '/messages' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'My Deals', path: '/dashboard' },
  ];

  const listerTabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: dashboardPath },
    { id: 'messages', icon: MessageSquare, label: 'Messages', path: '/messages' },
  ];

  const listerRightTabs = [
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  if (isLister) {
    return (
      <div className="bottom-tab-bar lg:hidden relative">
        {listerTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className="flex-1 flex flex-col items-center gap-1 pt-1"
          >
            <span className="relative"><tab.icon className={`w-5 h-5 transition-colors ${isActive(tab.path) ? 'text-gold' : 'text-paper/30'}`} />{tab.id === 'messages' && totalUnreadCount > 0 && (<span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-gold text-ink text-[9px] font-bold flex items-center justify-center">{totalUnreadCount > 9 ? '9+' : totalUnreadCount}</span>)}</span>
            <span className={`text-[10px] font-semibold transition-colors ${isActive(tab.path) ? 'text-gold' : 'text-paper/30'}`}>
              {tab.label}
            </span>
          </button>
        ))}

        <div className="flex-1 flex flex-col items-center justify-start relative">
          <button
            onClick={() => navigate('/add-property')}
            aria-label="Create new listing"
            className="absolute -top-6 w-14 h-14 bg-gold rounded-full flex items-center justify-center shadow-lg shadow-gold/20 hover:bg-gold-dark transition-colors active:scale-95"
          >
            <Plus className="w-6 h-6 text-ink" strokeWidth={2.5} />
          </button>
          <span className="text-[10px] font-semibold text-paper/30 mt-8">List</span>
        </div>

        {listerRightTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className="flex-1 flex flex-col items-center gap-1 pt-1"
          >
            <span className="relative"><tab.icon className={`w-5 h-5 transition-colors ${isActive(tab.path) ? 'text-gold' : 'text-paper/30'}`} />{tab.id === 'messages' && totalUnreadCount > 0 && (<span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-gold text-ink text-[9px] font-bold flex items-center justify-center">{totalUnreadCount > 9 ? '9+' : totalUnreadCount}</span>)}</span>
            <span className={`text-[10px] font-semibold transition-colors ${isActive(tab.path) ? 'text-gold' : 'text-paper/30'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="bottom-tab-bar lg:hidden">
      {tenantTabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => navigate(tab.path)}
          className="flex-1 flex flex-col items-center gap-1 pt-1"
        >
          <span className="relative"><tab.icon className={`w-5 h-5 transition-colors ${isActive(tab.path) ? 'text-gold' : 'text-paper/30'}`} />{tab.id === 'messages' && totalUnreadCount > 0 && (<span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-gold text-ink text-[9px] font-bold flex items-center justify-center">{totalUnreadCount > 9 ? '9+' : totalUnreadCount}</span>)}</span>
          <span className={`text-[10px] font-semibold transition-colors ${isActive(tab.path) ? 'text-gold' : 'text-paper/30'}`}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
};
