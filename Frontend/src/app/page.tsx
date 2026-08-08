'use client';

import React, { useState, useEffect, useRef } from 'react';
import { exportToDoc, exportToPdf } from '../utils/exportUtils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  
  // UI states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize and load from local storage
  useEffect(() => {
    // Check backend health
    fetch('/api/health')
      .then((res) => {
        if (res.ok) {
          setBackendOnline(true);
        } else {
          setBackendOnline(false);
        }
      })
      .catch(() => {
        setBackendOnline(false);
      });

    // Load theme
    const savedTheme = localStorage.getItem('market_survey_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }
    }

    // Load chats
    const savedChats = localStorage.getItem('market_survey_chats');
    const savedCurrentChatId = localStorage.getItem('market_survey_current_chat_id');

    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);
      setChats(parsedChats);
      if (savedCurrentChatId && parsedChats.some((c: Chat) => c.id === savedCurrentChatId)) {
        setCurrentChatId(savedCurrentChatId);
      } else if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id);
      }
    } else {
      // Default chat
      const defaultId = Date.now().toString();
      const defaultChat: Chat = {
        id: defaultId,
        title: 'New Survey Objective',
        messages: [
          {
            role: 'assistant',
            content: `Welcome to the Market Survey Questionnaire Generator.\n\nI can help you build comprehensive pharmaceutical market research questionnaires.\n\nPlease describe your study objective, target disease area, target audience, or any specific sections you'd like to generate.`
          }
        ]
      };
      setChats([defaultChat]);
      setCurrentChatId(defaultId);
      localStorage.setItem('market_survey_chats', JSON.stringify([defaultChat]));
      localStorage.setItem('market_survey_current_chat_id', defaultId);
    }
  }, []);

  // Sync chats to localStorage
  const saveChatsToStorage = (updatedChats: Chat[]) => {
    setChats(updatedChats);
    localStorage.setItem('market_survey_chats', JSON.stringify(updatedChats));
  };

  // Switch Chat
  const handleSelectChat = (id: string) => {
    setCurrentChatId(id);
    localStorage.setItem('market_survey_current_chat_id', id);
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, currentChatId, loading]);

  const activeChat = chats.find((c) => c.id === currentChatId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !activeChat) return;

    const userMessage = input.trim();
    setInput('');

    // Append user message
    const updatedMessages: Message[] = [...activeChat.messages, { role: 'user', content: userMessage }];
    
    // Auto rename chat title if it's the first user message
    let updatedTitle = activeChat.title;
    if (activeChat.messages.length <= 1) {
      updatedTitle = userMessage.length > 28 ? `${userMessage.substring(0, 25)}...` : userMessage;
    }

    const updatedChats = chats.map((c) => {
      if (c.id === currentChatId) {
        return { ...c, title: updatedTitle, messages: updatedMessages };
      }
      return c;
    });

    saveChatsToStorage(updatedChats);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      const data = await response.json();
      
      // Append assistant message
      const finalChats = updatedChats.map((c) => {
        if (c.id === currentChatId) {
          return {
            ...c,
            messages: [...updatedMessages, { role: 'assistant' as const, content: data.reply }]
          };
        }
        return c;
      });
      saveChatsToStorage(finalChats);
    } catch (error) {
      console.error('API Error:', error);
      const finalChats = updatedChats.map((c) => {
        if (c.id === currentChatId) {
          return {
            ...c,
            messages: [
              ...updatedMessages,
              {
                role: 'assistant' as const,
                content: 'System Error: Connection to backend failed. Please verify the FastAPI service is running.'
              }
            ]
          };
        }
        return c;
      });
      saveChatsToStorage(finalChats);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newChat: Chat = {
      id: newId,
      title: 'New Survey Objective',
      messages: [
        {
          role: 'assistant',
          content: 'Describe the market survey objectives you\'d like to generate.'
        }
      ]
    };
    const updatedChats = [newChat, ...chats];
    saveChatsToStorage(updatedChats);
    setCurrentChatId(newId);
    localStorage.setItem('market_survey_current_chat_id', newId);
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filteredChats = chats.filter((c) => c.id !== id);
    
    if (filteredChats.length === 0) {
      // Re-initialize default chat if list becomes empty
      const defaultId = Date.now().toString();
      const defaultChat: Chat = {
        id: defaultId,
        title: 'New Survey Objective',
        messages: [
          {
            role: 'assistant',
            content: 'Describe the market survey objectives you\'d like to generate.'
          }
        ]
      };
      saveChatsToStorage([defaultChat]);
      setCurrentChatId(defaultId);
      localStorage.setItem('market_survey_current_chat_id', defaultId);
    } else {
      saveChatsToStorage(filteredChats);
      if (currentChatId === id) {
        setCurrentChatId(filteredChats[0].id);
        localStorage.setItem('market_survey_current_chat_id', filteredChats[0].id);
      }
    }
  };

  const toggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('market_survey_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleClearAllChats = () => {
    const defaultId = Date.now().toString();
    const defaultChat: Chat = {
      id: defaultId,
      title: 'New Survey Objective',
      messages: [
        {
          role: 'assistant',
          content: 'Describe the market survey objectives you\'d like to generate.'
        }
      ]
    };
    saveChatsToStorage([defaultChat]);
    setCurrentChatId(defaultId);
    localStorage.setItem('market_survey_current_chat_id', defaultId);
    setSettingsOpen(false);
  };

  const isChatEmpty = activeChat ? activeChat.messages.length <= 1 : true;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      
      {/* Sidebar Container */}
      <aside 
        className={`h-full bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col justify-between shrink-0 transition-all duration-300 ${
          sidebarOpen ? 'w-[260px] p-4' : 'w-0 p-0 overflow-hidden border-r-0'
        }`}
      >
        <div className="flex flex-col gap-4 overflow-hidden h-full">
          {/* Header */}
          <div className="flex items-center justify-between mt-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.0} stroke="currentColor" className="w-6 h-6 text-[#0073CF]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="font-bold text-lg brand-gradient tracking-tight truncate">Market Survey</span>
            </div>
            {/* Collapse Sidebar Button */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 hover:bg-[var(--btn-sidebar-hover)] rounded text-[var(--text-slate)] cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
              </svg>
            </button>
          </div>
          
          {/* New Chat Button */}
          <button 
            onClick={handleNewChat}
            className="w-full py-2 px-3 bg-[var(--btn-sidebar-bg)] border border-[var(--sidebar-border)] hover:bg-[var(--btn-sidebar-hover)] text-[var(--btn-sidebar-color)] rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.0} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Chat
          </button>

          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`group flex items-center justify-between py-2 px-3 rounded-lg text-sm cursor-pointer transition ${
                  chat.id === currentChatId 
                    ? 'bg-[var(--btn-sidebar-hover)] font-medium text-[var(--foreground)]' 
                    : 'text-[var(--text-slate)] hover:bg-[var(--btn-sidebar-hover)] hover:text-[var(--foreground)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="truncate">{chat.title}</span>
                </div>
                
                {/* Delete button, visible on hover */}
                <button
                  onClick={(e) => handleDeleteChat(chat.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500 transition cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.0} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Area */}
        <div className="mt-auto pt-3 border-t border-[var(--sidebar-border)] space-y-3 shrink-0 overflow-hidden">
          {/* Settings Trigger */}
          <button 
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 py-2 px-3 rounded-lg text-sm text-[var(--text-slate)] hover:bg-[var(--btn-sidebar-hover)] hover:text-[var(--foreground)] transition cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2.5 py-1 px-3 text-xs font-medium text-[var(--text-slate)]">
            <span className={`h-2 w-2 rounded-full ${backendOnline === true ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : backendOnline === false ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]' : 'bg-amber-500 anim-pulse'}`}></span>
            <span className="truncate">{backendOnline === true ? 'Connected' : backendOnline === false ? 'Offline' : 'Connecting...'}</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 h-full flex flex-col relative overflow-hidden bg-[var(--background)]">
        
        {/* Floating Sidebar Toggle Button (Only when sidebar is collapsed) */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-4 z-50 p-2 bg-[var(--btn-sidebar-bg)] border border-[var(--sidebar-border)] hover:bg-[var(--btn-sidebar-hover)] rounded-xl shadow text-[var(--foreground)] cursor-pointer transition animate-fade-in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}

        {isChatEmpty ? (
          /* Centered Landing Page View */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="max-w-[800px] w-full flex flex-col items-center gap-6">
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight select-none">
                <span className="brand-gradient">Market Survey Questionnaire</span>
              </h1>
              <p className="text-[var(--text-slate)] text-lg md:text-xl max-w-[620px] font-normal leading-relaxed">
                Generate pharmaceutical market research questionnaires using AI. Describe your study objective, disease area, or target audience to get started.
              </p>
              
              {/* Centered Input Form */}
              <form onSubmit={handleSend} className="w-full max-w-[700px] mt-6 relative">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe the questionnaire you want to generate..."
                    disabled={loading}
                    className="w-full py-4 pl-6 pr-14 bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-color)] rounded-2xl shadow-md hover:border-slate-400 focus:border-[#0073CF] focus:outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="absolute right-3.5 p-2 bg-[#0073CF] hover:bg-[#1E3A8A] disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-xl transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Active Chat View */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Page Header */}
            <header className="py-4 px-8 border-b border-[var(--sidebar-border)] bg-[var(--background)] flex items-center justify-between shrink-0 pl-16 md:pl-8">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">Market Survey Questionnaire</h2>
                <p className="text-xs text-[var(--text-slate)] font-medium">Generate pharmaceutical market research questionnaires using AI</p>
              </div>
            </header>

            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              <div className="max-w-[900px] mx-auto space-y-6">
                {activeChat?.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-4 animate-slide-up ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* Assistant Avatar */}
                    {message.role === 'assistant' && (
                      <div className="w-9 h-9 rounded-full bg-[var(--bubble-ai-bg)] flex items-center justify-center border border-[var(--bubble-ai-border)] text-[var(--foreground)] shrink-0 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#0073CF]">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                    )}

                    {/* Chat Bubble Container */}
                    <div className="flex flex-col gap-1.5 max-w-[75%]">
                      {/* Chat Bubble */}
                      <div
                        className={`p-4 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed shadow-sm ${
                          message.role === 'user'
                            ? 'user-bubble-gradient text-white rounded-tr-none'
                            : 'bg-[var(--bubble-ai-bg)] border border-[var(--bubble-ai-border)] text-[var(--bubble-ai-color)] rounded-tl-none'
                        }`}
                      >
                        {message.content}
                      </div>

                      {/* Export buttons for AI responses (Excluding welcome message index 0) */}
                      {message.role === 'assistant' && index > 0 && (
                        <div className="flex items-center gap-3 px-2 text-xs text-[var(--text-slate)]">
                          <button
                            onClick={() => exportToPdf(message.content, `questionnaire-${activeChat.title.replace(/\s+/g, '_')}`)}
                            className="flex items-center gap-1 hover:text-[#0073CF] transition cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Export PDF
                          </button>
                          <span className="text-[var(--sidebar-border)]">|</span>
                          <button
                            onClick={() => exportToDoc(message.content, `questionnaire-${activeChat.title.replace(/\s+/g, '_')}`)}
                            className="flex items-center gap-1 hover:text-[#0073CF] transition cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            Export Word
                          </button>
                        </div>
                      )}
                    </div>

                    {/* User Avatar */}
                    {message.role === 'user' && (
                      <div className="w-9 h-9 rounded-full bg-[#E0F2FE] dark:bg-slate-800 flex items-center justify-center border border-[#BAE6FD] dark:border-slate-700 shrink-0 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#0073CF]">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Loader / Skeleton */}
                {loading && (
                  <div className="flex items-start gap-4 justify-start animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-[var(--bubble-ai-bg)] flex items-center justify-center border border-[var(--bubble-ai-border)] shrink-0 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#0073CF]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div className="p-4 rounded-2xl rounded-tl-none bg-[var(--bubble-ai-bg)] border border-[var(--bubble-ai-border)] text-slate-400 text-xs font-medium flex items-center gap-1.5 shadow-sm">
                      <span className="dot animate-bounce delay-75">●</span>
                      <span className="dot animate-bounce delay-150">●</span>
                      <span className="dot animate-bounce delay-300">●</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bottom-Pinned Chat Input Area */}
            <div className="p-6 border-t border-[var(--sidebar-border)] bg-[var(--background)] shrink-0">
              <form onSubmit={handleSend} className="max-w-[900px] mx-auto relative">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe the questionnaire you want to generate..."
                    disabled={loading}
                    className="w-full py-3.5 pl-6 pr-14 bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-color)] rounded-2xl shadow-sm hover:border-slate-400 focus:border-[#0073CF] focus:outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="absolute right-3 p-2.5 bg-[#0073CF] hover:bg-[#1E3A8A] disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-xl transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal Dialog Overlay */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 bg-[var(--background)] border border-[var(--sidebar-border)] rounded-2xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Settings</h3>
            
            {/* Close Button */}
            <button 
              onClick={() => setSettingsOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-[var(--btn-sidebar-hover)] rounded text-[var(--text-slate)] cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.0} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="space-y-6 mt-2">
              {/* Theme Settings Selector */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">Theme</div>
                  <div className="text-xs text-[var(--text-slate)]">Switch between light and dark display modes.</div>
                </div>
                <div className="flex bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] rounded-lg p-0.5">
                  <button
                    onClick={() => toggleTheme('light')}
                    className={`py-1.5 px-3 rounded-md text-xs font-semibold cursor-pointer transition ${
                      theme === 'light' 
                        ? 'bg-[#0073CF] text-white shadow-sm' 
                        : 'text-[var(--text-slate)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => toggleTheme('dark')}
                    className={`py-1.5 px-3 rounded-md text-xs font-semibold cursor-pointer transition ${
                      theme === 'dark' 
                        ? 'bg-[#0073CF] text-white shadow-sm' 
                        : 'text-[var(--text-slate)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>

              {/* Data Settings */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--sidebar-border)]">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">Clear All Chats</div>
                  <div className="text-xs text-[var(--text-slate)]">Permanently delete your entire chat history.</div>
                </div>
                <button
                  onClick={handleClearAllChats}
                  className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-900 transition cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
