import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, Bot, User, Loader2, Sparkles, MessageSquare, X } from 'lucide-react';


const ChatbotFrontend = () => {
  // Add CSS for hiding scrollbar
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "👋 Hello! I'm DocuBot, your AI document assistant. Upload a document and I'll help you analyze it!",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploadedFile(file);
    setIsLoading(true);

    const uploadMessage = {
      id: Date.now(),
      type: 'user',
      content: `📎 Uploaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      timestamp: new Date(),
      isFile: true
    };
    setMessages(prev => [...prev, uploadMessage]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      await response.json();
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: `✅ Successfully processed "${file.name}"! Now you can ask me questions about the document. What would you like to know?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: '❌ Sorry, there was an error uploading your file. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: inputMessage
        }),
      });

      const result = await response.json();
      
      setTimeout(() => {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: result.answer || "I understand your question! Here's what I found in the document...",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
        setIsTyping(false);
      }, 1500);
    } catch {
      setTimeout(() => {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: "🤔 I'm having trouble processing that right now. Could you try rephrasing your question?",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        setIsTyping(false);
      }, 1500);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const clearFile = () => {
    setUploadedFile(null);
  };

  const TypingIndicator = () => (
    <div className="flex items-center space-x-2 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg max-w-xs">
      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
      </div>
    </div>
  );

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center space-x-2 text-purple-600">
      <Loader2 className="w-4 h-4 animate-spin" />
      <Sparkles className="w-4 h-4 animate-pulse" />
      <span className="text-sm font-medium">Processing...</span>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageSquare size={20} color="white" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>DocuBot AI 🤖</h1>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Your intelligent document assistant</p>
            </div>
          </div>
          {uploadedFile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              padding: '8px 16px',
              borderRadius: '20px'
            }}>
              <FileText size={16} color="white" />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>{uploadedFile.name}</span>
              <button 
                onClick={clearFile}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%'
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        minHeight: 0
      }}>
        <div style={{
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
          padding: '20px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          
          {/* File Upload Zone */}
          {!uploadedFile && (
            <div style={{ marginBottom: '20px', flexShrink: 0 }}>
              <div 
                style={{
                  padding: '60px 40px',
                  border: `2px dashed ${isDragOver ? '#8b5cf6' : '#d1d5db'}`,
                  borderRadius: '16px',
                  backgroundColor: isDragOver ? '#faf5ff' : 'white',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={48} color="#8b5cf6" style={{ margin: '0 auto 20px' }} />
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  color: '#374151', 
                  margin: '0 0 12px 0' 
                }}>
                  📄 Drop your document here or click to upload
                </h3>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#6b7280', 
                  margin: '0 0 30px 0' 
                }}>
                  Supports PDF, DOC, DOCX, XLSX, TXT files up to 10MB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '25px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0px)'}
                >
                  Choose File 📁
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.txt"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                />
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div 
            ref={chatContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              paddingBottom: '20px',
              minHeight: 0,
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none' /* Internet Explorer and Edge */
            }}
            className="hide-scrollbar"
          >
            {messages.map((message) => (
              <div key={message.id} style={{
                display: 'flex',
                justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  maxWidth: '70%',
                  flexDirection: message.type === 'user' ? 'row-reverse' : 'row'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: message.type === 'user' 
                      ? 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)' 
                      : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    {message.type === 'user' ? <User size={16} color="white" /> : <Bot size={16} color="white" />}
                  </div>
                  
                  <div style={{
                    background: message.type === 'user' 
                      ? 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)' 
                      : 'white',
                    color: message.type === 'user' ? 'white' : '#1f2937',
                    padding: '16px',
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: message.type === 'bot' ? '1px solid #e5e7eb' : 'none',
                    borderLeft: message.isFile ? '4px solid #8b5cf6' : undefined
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: '1.5' }}>
                      {message.content}
                    </p>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '12px', 
                      opacity: 0.7 
                    }}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <TypingIndicator />
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {isLoading && !isTyping && (
            <div style={{ textAlign: 'center', padding: '16px', flexShrink: 0 }}>
              <LoadingSpinner />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div style={{
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '20px',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 20px'
        }}>
          <div style={{
            position: 'relative',
            width: '100%'
          }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={uploadedFile ? "Ask me anything about your document... 💭" : "Upload a document first to start chatting! 📄"}
              disabled={isLoading || !uploadedFile}
              style={{
                width: '100%',
                padding: '14px 60px 14px 20px',
                border: '2px solid #e5e7eb',
                borderRadius: '25px',
                fontSize: '16px',
                outline: 'none',
                backgroundColor: uploadedFile ? 'white' : '#f9fafb',
                color: '#1f2937',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => uploadedFile && (e.target.style.borderColor = '#8b5cf6')}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <div style={{
              position: 'absolute',
              right: '55px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none'
            }}>
              <Sparkles size={20} color="#a855f7" />
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading || !uploadedFile}
              style={{
                position: 'absolute',
                right: '6px',
                top: '6px',
                bottom: '6px',
                width: '44px',
                borderRadius: '20px',
                border: 'none',
                background: uploadedFile && inputMessage.trim() && !isLoading 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
                color: 'white',
                cursor: uploadedFile && inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
                fontSize: '16px'
              }}
              onMouseOver={(e) => {
                if (uploadedFile && inputMessage.trim() && !isLoading) {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                }
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
              }}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : '➤'}
            </button>
          </div>
          <p style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#6b7280',
            margin: '12px 0 0 0'
          }}>
            🚀 Powered by AI • Upload documents and ask questions instantly
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatbotFrontend;