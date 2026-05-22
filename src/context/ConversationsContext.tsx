import React, { createContext, useContext } from 'react';
import { useConversations } from '../hooks/useConversations';
import { Conversation } from '../types';

interface ConversationsContextValue {
  conversations: Conversation[];
  totalUnreadCount: number;
  loading: boolean;
  findOrCreateConversation: (propertyId: string, tenantId: string, landlordId: string) => Promise<string>;
  refresh: () => Promise<void>;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export const ConversationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useConversations();
  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
};

export const useConversationsContext = () => {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error('useConversationsContext must be used within ConversationsProvider');
  return ctx;
};