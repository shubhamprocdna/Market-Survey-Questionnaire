'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 Welcome!

I can help you generate **pharmaceutical market survey questionnaires**.

Tell me the study objective, disease area, target audience, or any specific requirements to get started.`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check backend health on mount
  useEffect(() => {
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
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to state
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
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
        throw new Error('Server returned an error');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Sorry, I encountered an error communicating with the backend. Please ensure the backend server is running.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `👋 Welcome!

Start describing the survey you'd like to generate.`
      }
    ]);
    setInput('');
  };

  const isChatEmpty = messages.length <= 1;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-800">
      
      {/* Sidebar */}
      <aside className="w-[260px] h-full bg-[#F8FAFC] border-r border-[#E2E8F0] p-6 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-6">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧬</span>
            <span className="font-bold text-xl brand-gradient tracking-tight">Market Survey</span>
          </div>
          
          {/* New Chat Button */}
          <button 
            onClick={handleNewChat}
            className="w-full py-2.5 px-4 bg-white border border-[#CBD5E1] hover:bg-slate-50 hover:border-slate-400 rounded-lg font-medium text-sm text-slate-700 transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <span>➕</span> New Chat
          </button>
        </div>

        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className={`h-2.5 w-2.5 rounded-full ${backendOnline === true ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : backendOnline === false ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-amber-500 anim-pulse'}`}></span>
          {backendOnline === true ? 'Backend Connected' : backendOnline === false ? 'Cannot connect to Backend' : 'Connecting to Backend...'}
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 h-full flex flex-col relative overflow-hidden">
        
        {isChatEmpty ? (
          /* Centered Landing Page View */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="max-w-[800px] w-full flex flex-col items-center gap-6">
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight select-none">
                <span className="brand-gradient">Market Survey Questionnaire</span>
              </h1>
              <p className="text-slate-500 text-lg md:text-xl max-w-[620px] font-normal leading-relaxed">
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
                    className="w-full py-4 pl-6 pr-14 bg-white border border-[#CBD5E1] rounded-2xl shadow-md hover:border-slate-400 focus:border-[#0073CF] focus:outline-none text-slate-800 placeholder-slate-400 transition"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="absolute right-3.5 p-2 bg-[#0073CF] hover:bg-[#1E3A8A] disabled:bg-slate-200 text-white rounded-xl transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow"
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
            <header className="py-4 px-8 border-b border-[#E2E8F0] bg-white flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Market Survey Questionnaire</h2>
                <p className="text-xs text-slate-400 font-medium">Generate pharmaceutical market research questionnaires using AI</p>
              </div>
            </header>

            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              <div className="max-w-[900px] mx-auto space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-4 animate-slide-up ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* Assistant Avatar */}
                    {message.role === 'assistant' && (
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-[#E2E8F0] shrink-0 text-sm">
                        🧬
                      </div>
                    )}

                    {/* Chat Bubble */}
                    <div
                      className={`p-4 rounded-2xl max-w-[75%] whitespace-pre-wrap text-sm leading-relaxed shadow-sm ${
                        message.role === 'user'
                          ? 'user-bubble-gradient text-white rounded-tr-none'
                          : 'bg-white border border-[#E2E8F0] text-slate-800 rounded-tl-none'
                      }`}
                    >
                      {message.content}
                    </div>

                    {/* User Avatar */}
                    {message.role === 'user' && (
                      <div className="w-9 h-9 rounded-full bg-[#E0F2FE] flex items-center justify-center border border-[#BAE6FD] shrink-0 text-sm">
                        👤
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Loader / Skeleton */}
                {loading && (
                  <div className="flex items-start gap-4 justify-start animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-[#E2E8F0] shrink-0 text-sm">
                      🧬
                    </div>
                    <div className="p-4 rounded-2xl rounded-tl-none bg-slate-50 border border-[#E2E8F0] text-slate-400 text-xs font-medium flex items-center gap-1.5 shadow-sm">
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
            <div className="p-6 border-t border-[#E2E8F0] bg-white shrink-0">
              <form onSubmit={handleSend} className="max-w-[900px] mx-auto relative">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe the questionnaire you want to generate..."
                    disabled={loading}
                    className="w-full py-3.5 pl-6 pr-14 bg-white border border-[#CBD5E1] rounded-2xl shadow-sm hover:border-slate-400 focus:border-[#0073CF] focus:outline-none text-slate-800 placeholder-slate-400 transition"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="absolute right-3 p-2.5 bg-[#0073CF] hover:bg-[#1E3A8A] disabled:bg-slate-200 text-white rounded-xl transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-sm"
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
    </div>
  );
}
