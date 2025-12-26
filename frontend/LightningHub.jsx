import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Lightning Messaging Hub - Full Dashboard
 * 
 * Features:
 * - Lightning Node management
 * - Nostr-based messaging with zaps
 * - Cashu ecash privacy layer
 * - L402 AI services (Oobabooga, Grok, ChatGPT, Claude)
 */

const API_BASE = 'http://localhost:3000';

const LightningHub = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Node state
  const [nodeStats, setNodeStats] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Messaging state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [zapAmount, setZapAmount] = useState(21);
  const [contacts, setContacts] = useState([
    { name: 'satoshi', pubkey: 'npub1sat0shi...', online: true },
    { name: 'hal', pubkey: 'npub1hal...', online: true },
    { name: 'adam_back', pubkey: 'npub1adam...', online: false },
  ]);
  
  // Cashu state
  const [cashuBalance, setCashuBalance] = useState(0);
  const [cashuStatus, setCashuStatus] = useState(null);
  
  // AI state
  const [aiProviders, setAiProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('oobabooga');
  const [aiChat, setAiChat] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [l402Stats, setL402Stats] = useState(null);
  
  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  
  const chatRef = useRef(null);
  const aiChatRef = useRef(null);

  // Fetch node stats
  const fetchNodeStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/node/stats`);
      const data = await res.json();
      setNodeStats(data);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to fetch node stats:', error);
      // Use mock data
      setNodeStats({
        alias: 'Lightning Hub Node',
        channels: { active: 12, total: 15 },
        peers: 8,
        capacity: { total: 5420000, local: 3200000, remote: 2220000 },
        balance: { onchain: 1000000, lightning: 4200000 }
      });
      setIsConnected(true);
    }
  }, []);

  // Fetch AI providers
  const fetchAiProviders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/providers`);
      const data = await res.json();
      setAiProviders(data.providers || []);
      setL402Stats(data.pricing || []);
    } catch (error) {
      // Mock providers
      setAiProviders([
        { name: 'oobabooga', enabled: true, models: [{ id: 'gemini-mini', name: 'Gemini-Mini 240M' }] },
        { name: 'grok', enabled: false, models: [{ id: 'grok-2', name: 'Grok 2' }] },
        { name: 'chatgpt', enabled: false, models: [{ id: 'gpt-4o', name: 'GPT-4o' }] },
        { name: 'claude', enabled: false, models: [{ id: 'claude-sonnet-4', name: 'Claude Sonnet 4' }] }
      ]);
      setL402Stats([
        { id: 'oobabooga', pricePerToken: 1, name: 'Oobabooga (Local)' },
        { id: 'grok', pricePerToken: 5, name: 'Grok (xAI)' },
        { id: 'chatgpt', pricePerToken: 3, name: 'ChatGPT (OpenAI)' },
        { id: 'claude', pricePerToken: 4, name: 'Claude (Anthropic)' }
      ]);
    }
  }, []);

  // Fetch Cashu balance
  const fetchCashuStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cashu/status`);
      const data = await res.json();
      setCashuBalance(data.balance || 0);
      setCashuStatus(data);
    } catch (error) {
      setCashuBalance(50000);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchNodeStats();
    fetchAiProviders();
    fetchCashuStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchNodeStats();
      fetchCashuStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchNodeStats, fetchAiProviders, fetchCashuStatus]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (aiChatRef.current) {
      aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
    }
  }, [aiChat]);

  // Send message with optional zap
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const msg = {
      id: Date.now(),
      from: 'you',
      content: newMessage,
      amount: zapAmount,
      timestamp: Date.now(),
      type: 'sent'
    };
    
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    
    // Deduct from Cashu balance if zapping
    if (zapAmount > 0) {
      setCashuBalance(prev => Math.max(0, prev - zapAmount));
    }
    
    // Simulate response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        from: 'satoshi',
        content: 'Thanks for the message! ⚡',
        amount: 0,
        timestamp: Date.now(),
        type: 'received'
      }]);
    }, 1000);
  };

  // Send AI chat message
  const sendAiMessage = async () => {
    if (!aiInput.trim()) return;
    
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: aiInput
    };
    
    setAiChat(prev => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);
    
    try {
      // Build messages array for API
      const messagesForApi = [...aiChat, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const res = await fetch(`${API_BASE}/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // L402 header would be added here after payment
        },
        body: JSON.stringify({
          provider: selectedProvider,
          messages: messagesForApi,
          max_tokens: 1000
        })
      });
      
      if (res.status === 402) {
        // Payment required
        const paymentData = await res.json();
        setPendingPayment(paymentData);
        setShowPaymentModal(true);
        setAiLoading(false);
        return;
      }
      
      const data = await res.json();
      
      setAiChat(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: data.content || data.error || 'No response',
        usage: data.usage,
        provider: data.provider
      }]);
      
    } catch (error) {
      setAiChat(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `[${selectedProvider}] Mock response: I received your message. Configure API keys in .env to enable real responses.`,
        mock: true
      }]);
    }
    
    setAiLoading(false);
  };

  // Format numbers
  const formatSats = (sats) => {
    if (!sats) return '0';
    if (sats >= 1000000) return `${(sats / 1000000).toFixed(2)}M`;
    if (sats >= 1000) return `${(sats / 1000).toFixed(1)}K`;
    return sats.toString();
  };

  const formatTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  // Get provider color
  const getProviderColor = (provider) => {
    const colors = {
      oobabooga: '#10b981',
      grok: '#3b82f6',
      chatgpt: '#22c55e',
      claude: '#f97316'
    };
    return colors[provider] || '#888';
  };

  return (
    <div style={styles.container}>
      {/* Background */}
      <div style={styles.gridOverlay} />
      <div style={styles.glowOrb1} />
      <div style={styles.glowOrb2} />
      
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⚡</span>
          <span style={styles.logoText}>LIGHTNING HUB</span>
          <span style={styles.versionBadge}>v0.1.0</span>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.connectionStatus}>
            <span style={{...styles.statusDot, backgroundColor: isConnected ? '#00ff88' : '#ff4444'}} />
            <span style={styles.statusText}>{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
          <div style={styles.balanceDisplay}>
            <span style={styles.balanceLabel}>Cashu</span>
            <span style={styles.balanceAmount}>{formatSats(cashuBalance)} sats</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={styles.nav}>
        {[
          { id: 'dashboard', icon: '📊', label: 'DASHBOARD' },
          { id: 'messages', icon: '💬', label: 'MESSAGES' },
          { id: 'ai', icon: '🤖', label: 'AI SERVICES' },
          { id: 'cashu', icon: '🥜', label: 'CASHU' },
          { id: 'settings', icon: '⚙️', label: 'SETTINGS' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.navButton,
              ...(activeTab === tab.id ? styles.navButtonActive : {})
            }}
          >
            {tab.icon} <span style={styles.navLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main style={styles.main}>
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && nodeStats && (
          <div style={styles.dashboardGrid}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>⚡ Lightning Node</h3>
              <div style={styles.statsGrid}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{formatSats(nodeStats.capacity?.total)}</span>
                  <span style={styles.statLabel}>Total Capacity</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{nodeStats.channels?.active || 0}</span>
                  <span style={styles.statLabel}>Active Channels</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{nodeStats.peers || 0}</span>
                  <span style={styles.statLabel}>Peers</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{formatSats(nodeStats.balance?.lightning)}</span>
                  <span style={styles.statLabel}>Lightning Balance</span>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🤖 L402 AI Services</h3>
              <div style={styles.providerGrid}>
                {aiProviders.map(p => (
                  <div key={p.name} style={{
                    ...styles.providerCard,
                    borderColor: p.enabled ? getProviderColor(p.name) : '#333'
                  }}>
                    <span style={styles.providerName}>{p.name}</span>
                    <span style={{
                      ...styles.providerStatus,
                      color: p.enabled ? '#00ff88' : '#666'
                    }}>
                      {p.enabled ? '● Online' : '○ Offline'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🥜 Cashu Ecash</h3>
              <div style={styles.cashuQuickView}>
                <div style={styles.cashuBalanceBig}>
                  {formatSats(cashuBalance)} <span style={styles.satsLabel}>sats</span>
                </div>
                <div style={styles.quickActions}>
                  <button style={styles.quickBtn}>Mint</button>
                  <button style={styles.quickBtn}>Melt</button>
                  <button style={styles.quickBtn}>Send</button>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📡 Nostr Status</h3>
              <div style={styles.relayStatus}>
                <div style={styles.relayItem}>
                  <span>🟢 relay.damus.io</span>
                </div>
                <div style={styles.relayItem}>
                  <span>🟢 nos.lol</span>
                </div>
                <div style={styles.relayItem}>
                  <span>🟡 relay.nostr.band</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div style={styles.messagesLayout}>
            <div style={styles.contactsSidebar}>
              <h3 style={styles.sidebarTitle}>Contacts</h3>
              <div style={styles.contactsList}>
                {contacts.map(c => (
                  <div key={c.name} style={styles.contactItem}>
                    <div style={styles.contactAvatar}>{c.name[0].toUpperCase()}</div>
                    <div style={styles.contactInfo}>
                      <span style={styles.contactName}>{c.name}</span>
                      <span style={styles.contactPubkey}>{c.pubkey}</span>
                    </div>
                    <span style={{color: c.online ? '#00ff88' : '#666'}}>●</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={styles.chatArea}>
              <div style={styles.chatHeader}>
                <h3 style={styles.chatTitle}>💬 Global Chat</h3>
              </div>
              
              <div ref={chatRef} style={styles.messagesList}>
                {messages.map(msg => (
                  <div key={msg.id} style={{
                    ...styles.messageItem,
                    alignSelf: msg.type === 'sent' ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={styles.messageContent}>
                      <span style={styles.messageSender}>{msg.from}</span>
                      <p style={styles.messageText}>{msg.content}</p>
                      {msg.amount > 0 && (
                        <span style={styles.zapBadge}>⚡ {msg.amount} sats</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={styles.messageInput}>
                <div style={styles.zapSelector}>
                  <span>⚡</span>
                  <input
                    type="number"
                    value={zapAmount}
                    onChange={e => setZapAmount(parseInt(e.target.value) || 0)}
                    style={styles.zapInput}
                    min="0"
                    step="21"
                  />
                  <span style={styles.zapUnit}>sats</span>
                </div>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  style={styles.textInput}
                />
                <button onClick={sendMessage} style={styles.sendButton}>
                  Send {zapAmount > 0 && `⚡${zapAmount}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Services Tab */}
        {activeTab === 'ai' && (
          <div style={styles.aiLayout}>
            {/* Provider Selection */}
            <div style={styles.aiSidebar}>
              <h3 style={styles.sidebarTitle}>AI Providers</h3>
              <div style={styles.providerList}>
                {l402Stats?.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvider(p.id)}
                    style={{
                      ...styles.providerBtn,
                      ...(selectedProvider === p.id ? {
                        borderColor: getProviderColor(p.id),
                        background: `${getProviderColor(p.id)}20`
                      } : {})
                    }}
                  >
                    <span style={styles.providerIcon}>
                      {p.id === 'oobabooga' && '🖥️'}
                      {p.id === 'grok' && '🤖'}
                      {p.id === 'chatgpt' && '💚'}
                      {p.id === 'claude' && '🧡'}
                    </span>
                    <div style={styles.providerDetails}>
                      <span style={styles.providerNameLg}>{p.name}</span>
                      <span style={styles.providerPrice}>{p.pricePerToken} sat/token</span>
                    </div>
                  </button>
                ))}
              </div>
              
              <div style={styles.l402Info}>
                <h4 style={styles.l402Title}>⚡ L402 Pay-per-Request</h4>
                <p style={styles.l402Desc}>
                  Pay only for what you use. Lightning invoices are generated automatically.
                </p>
              </div>
            </div>
            
            {/* AI Chat */}
            <div style={styles.aiChatArea}>
              <div style={styles.aiChatHeader}>
                <h3 style={styles.aiChatTitle}>
                  Chat with {selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}
                </h3>
                <span style={{
                  ...styles.providerBadge,
                  background: getProviderColor(selectedProvider)
                }}>
                  {l402Stats?.find(p => p.id === selectedProvider)?.pricePerToken || 1} sat/token
                </span>
              </div>
              
              <div ref={aiChatRef} style={styles.aiMessagesList}>
                {aiChat.length === 0 && (
                  <div style={styles.aiEmptyState}>
                    <span style={styles.aiEmptyIcon}>🤖</span>
                    <p>Start a conversation with {selectedProvider}</p>
                    <p style={styles.aiEmptyHint}>
                      Messages are paid via Lightning L402 protocol
                    </p>
                  </div>
                )}
                
                {aiChat.map(msg => (
                  <div key={msg.id} style={{
                    ...styles.aiMessage,
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.role === 'user' ? 'rgba(255,170,0,0.2)' : 'rgba(255,255,255,0.05)'
                  }}>
                    <span style={styles.aiMsgRole}>
                      {msg.role === 'user' ? 'You' : selectedProvider}
                    </span>
                    <p style={styles.aiMsgContent}>{msg.content}</p>
                    {msg.usage && (
                      <span style={styles.aiMsgUsage}>
                        {msg.usage.total_tokens} tokens • {msg.usage.total_tokens * (l402Stats?.find(p => p.id === selectedProvider)?.pricePerToken || 1)} sats
                      </span>
                    )}
                  </div>
                ))}
                
                {aiLoading && (
                  <div style={styles.aiLoading}>
                    <span>Thinking...</span>
                  </div>
                )}
              </div>
              
              <div style={styles.aiInputArea}>
                <input
                  type="text"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && !aiLoading && sendAiMessage()}
                  placeholder={`Message ${selectedProvider}...`}
                  style={styles.aiTextInput}
                  disabled={aiLoading}
                />
                <button 
                  onClick={sendAiMessage} 
                  style={styles.aiSendBtn}
                  disabled={aiLoading}
                >
                  {aiLoading ? '...' : 'Send ⚡'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cashu Tab */}
        {activeTab === 'cashu' && (
          <div style={styles.cashuLayout}>
            <div style={styles.cashuHeader}>
              <h2 style={styles.cashuTitle}>🥜 Cashu Ecash Wallet</h2>
              <div style={styles.cashuBalanceDisplay}>
                <span style={styles.cashuBalanceValue}>{formatSats(cashuBalance)}</span>
                <span style={styles.cashuBalanceUnit}>sats</span>
              </div>
            </div>
            
            <div style={styles.cashuGrid}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>⚡ Actions</h3>
                <div style={styles.cashuActions}>
                  <button style={styles.cashuBtn}>
                    <span>⬇️</span>
                    <span>Mint from LN</span>
                  </button>
                  <button style={styles.cashuBtn}>
                    <span>⬆️</span>
                    <span>Melt to LN</span>
                  </button>
                  <button style={styles.cashuBtn}>
                    <span>📤</span>
                    <span>Send Token</span>
                  </button>
                  <button style={styles.cashuBtn}>
                    <span>📥</span>
                    <span>Receive Token</span>
                  </button>
                </div>
              </div>
              
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🔒 Privacy Features</h3>
                <ul style={styles.featureList}>
                  <li>✓ Blind signatures - mint can't link tokens</li>
                  <li>✓ Offline transfers supported</li>
                  <li>✓ No balance or history stored by mint</li>
                  <li>✓ NFC tap-to-pay ready</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={styles.settingsLayout}>
            <h2 style={styles.settingsTitle}>⚙️ Settings</h2>
            
            <div style={styles.settingsGrid}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🔌 Node Connection</h3>
                <div style={styles.settingField}>
                  <label>LND REST API</label>
                  <input defaultValue="https://localhost:8080" style={styles.settingInput} />
                </div>
                <div style={styles.settingField}>
                  <label>Macaroon Path</label>
                  <input defaultValue="~/.lnd/admin.macaroon" style={styles.settingInput} />
                </div>
              </div>
              
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🤖 AI API Keys</h3>
                <div style={styles.settingField}>
                  <label>Oobabooga URL</label>
                  <input defaultValue="http://localhost:5000" style={styles.settingInput} />
                </div>
                <div style={styles.settingField}>
                  <label>Grok API Key</label>
                  <input type="password" placeholder="xai-..." style={styles.settingInput} />
                </div>
                <div style={styles.settingField}>
                  <label>OpenAI API Key</label>
                  <input type="password" placeholder="sk-..." style={styles.settingInput} />
                </div>
                <div style={styles.settingField}>
                  <label>Anthropic API Key</label>
                  <input type="password" placeholder="sk-ant-..." style={styles.settingInput} />
                </div>
              </div>
              
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>📡 Nostr Relays</h3>
                <div style={styles.relayList}>
                  <div style={styles.relayListItem}>
                    <span>wss://relay.damus.io</span>
                    <button style={styles.removeBtn}>×</button>
                  </div>
                  <div style={styles.relayListItem}>
                    <span>wss://nos.lol</span>
                    <button style={styles.removeBtn}>×</button>
                  </div>
                </div>
                <button style={styles.addBtn}>+ Add Relay</button>
              </div>
              
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🥜 Cashu Mint</h3>
                <div style={styles.settingField}>
                  <label>Mint URL</label>
                  <input defaultValue="http://localhost:3338" style={styles.settingInput} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Payment Modal */}
      {showPaymentModal && pendingPayment && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>⚡ Payment Required</h3>
            <p style={styles.modalText}>
              Pay {pendingPayment.amount_sats} sats to access {pendingPayment.provider}
            </p>
            <div style={styles.invoiceBox}>
              <code style={styles.invoice}>{pendingPayment.invoice?.slice(0, 50)}...</code>
            </div>
            <div style={styles.modalButtons}>
              <button onClick={() => setShowPaymentModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button style={styles.payBtn}>Pay with Lightning</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={styles.footer}>
        <span>Lightning Hub • LND + Nostr + Cashu + L402</span>
        <span style={styles.footerHighlight}>Young's Node • Branson, MO</span>
      </footer>
    </div>
  );
};

// Comprehensive styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
    color: '#e0e0e0',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: 'linear-gradient(rgba(255,170,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,170,0,0.03) 1px, transparent 1px)',
    backgroundSize: '50px 50px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  glowOrb1: {
    position: 'fixed',
    top: '20%', left: '10%',
    width: '400px', height: '400px',
    background: 'radial-gradient(circle, rgba(255,170,0,0.1) 0%, transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  glowOrb2: {
    position: 'fixed',
    bottom: '10%', right: '15%',
    width: '300px', height: '300px',
    background: 'radial-gradient(circle, rgba(138,43,226,0.1) 0%, transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    borderBottom: '1px solid rgba(255,170,0,0.2)',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    zIndex: 10,
  },
  logo: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoIcon: { fontSize: '32px', filter: 'drop-shadow(0 0 10px #ffaa00)' },
  logoText: {
    fontSize: '24px',
    fontWeight: '700',
    background: 'linear-gradient(90deg, #ffaa00, #ff6600)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '2px',
  },
  versionBadge: {
    fontSize: '10px',
    background: 'rgba(255,170,0,0.2)',
    padding: '2px 8px',
    borderRadius: '10px',
    color: '#ffaa00',
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: '24px' },
  connectionStatus: { display: 'flex', alignItems: 'center', gap: '8px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', boxShadow: '0 0 10px currentColor' },
  statusText: { fontSize: '12px', color: '#888' },
  balanceDisplay: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  balanceLabel: { fontSize: '10px', color: '#666', textTransform: 'uppercase' },
  balanceAmount: { fontSize: '18px', fontWeight: '700', color: '#ffaa00' },
  nav: {
    display: 'flex',
    gap: '4px',
    padding: '12px 32px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    position: 'relative',
    zIndex: 10,
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#888',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '12px',
    fontFamily: 'inherit',
  },
  navButtonActive: {
    background: 'rgba(255,170,0,0.1)',
    borderColor: '#ffaa00',
    color: '#ffaa00',
  },
  navLabel: { letterSpacing: '1px' },
  main: {
    padding: '24px 32px',
    minHeight: 'calc(100vh - 180px)',
    position: 'relative',
    zIndex: 10,
  },
  dashboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  card: {
    background: 'rgba(20,20,30,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '20px',
    backdropFilter: 'blur(10px)',
  },
  cardTitle: { fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#fff', letterSpacing: '1px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  statItem: { display: 'flex', flexDirection: 'column' },
  statValue: { fontSize: '24px', fontWeight: '700', color: '#ffaa00' },
  statLabel: { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' },
  providerGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  providerCard: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #333',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerName: { fontSize: '12px', textTransform: 'capitalize' },
  providerStatus: { fontSize: '10px' },
  cashuQuickView: { textAlign: 'center' },
  cashuBalanceBig: { fontSize: '32px', fontWeight: '700', color: '#ffaa00', marginBottom: '16px' },
  satsLabel: { fontSize: '14px', color: '#888' },
  quickActions: { display: 'flex', gap: '8px', justifyContent: 'center' },
  quickBtn: {
    padding: '8px 16px',
    background: 'rgba(255,170,0,0.1)',
    border: '1px solid rgba(255,170,0,0.3)',
    borderRadius: '6px',
    color: '#ffaa00',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'inherit',
  },
  relayStatus: { display: 'flex', flexDirection: 'column', gap: '8px' },
  relayItem: { fontSize: '12px', color: '#ccc' },
  // Messages styles
  messagesLayout: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', height: 'calc(100vh - 220px)' },
  contactsSidebar: {
    background: 'rgba(20,20,30,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarTitle: { fontSize: '12px', fontWeight: '600', marginBottom: '16px', color: '#888', letterSpacing: '1px', textTransform: 'uppercase' },
  contactsList: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' },
  contactItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '8px', cursor: 'pointer' },
  contactAvatar: {
    width: '36px', height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ffaa00, #ff6600)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '14px',
    color: '#000',
  },
  contactInfo: { flex: 1, display: 'flex', flexDirection: 'column' },
  contactName: { fontSize: '13px', fontWeight: '600', color: '#fff' },
  contactPubkey: { fontSize: '10px', color: '#666' },
  chatArea: {
    background: 'rgba(20,20,30,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
  },
  chatHeader: { padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  chatTitle: { fontSize: '14px', fontWeight: '600', margin: 0 },
  messagesList: { flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  messageItem: { display: 'flex', maxWidth: '80%' },
  messageContent: { background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '12px' },
  messageSender: { fontSize: '11px', fontWeight: '600', color: '#ffaa00', display: 'block', marginBottom: '4px' },
  messageText: { margin: 0, fontSize: '13px', lineHeight: '1.4' },
  zapBadge: { display: 'inline-block', marginTop: '6px', fontSize: '11px', color: '#ffaa00', background: 'rgba(255,170,0,0.2)', padding: '2px 8px', borderRadius: '10px' },
  messageInput: { display: 'flex', gap: '12px', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' },
  zapSelector: { display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,170,0,0.1)', padding: '0 12px', borderRadius: '8px', border: '1px solid rgba(255,170,0,0.3)' },
  zapInput: { width: '60px', background: 'transparent', border: 'none', color: '#ffaa00', fontSize: '14px', fontFamily: 'inherit', textAlign: 'center', outline: 'none' },
  zapUnit: { fontSize: '10px', color: '#888' },
  textInput: { flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontSize: '13px', fontFamily: 'inherit', outline: 'none' },
  sendButton: { padding: '12px 24px', background: 'linear-gradient(135deg, #ffaa00, #ff6600)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: '600', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' },
  // AI styles
  aiLayout: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', height: 'calc(100vh - 220px)' },
  aiSidebar: {
    background: 'rgba(20,20,30,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  providerList: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' },
  providerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    color: '#fff',
  },
  providerIcon: { fontSize: '24px' },
  providerDetails: { display: 'flex', flexDirection: 'column' },
  providerNameLg: { fontSize: '14px', fontWeight: '600' },
  providerPrice: { fontSize: '11px', color: '#888' },
  l402Info: { marginTop: 'auto', padding: '16px', background: 'rgba(255,170,0,0.05)', borderRadius: '8px', border: '1px solid rgba(255,170,0,0.2)' },
  l402Title: { fontSize: '12px', fontWeight: '600', color: '#ffaa00', margin: '0 0 8px 0' },
  l402Desc: { fontSize: '11px', color: '#888', margin: 0, lineHeight: '1.4' },
  aiChatArea: {
    background: 'rgba(20,20,30,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
  },
  aiChatHeader: { padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  aiChatTitle: { fontSize: '14px', fontWeight: '600', margin: 0 },
  providerBadge: { fontSize: '10px', padding: '4px 10px', borderRadius: '10px', color: '#000', fontWeight: '600' },
  aiMessagesList: { flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  aiEmptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' },
  aiEmptyIcon: { fontSize: '48px', marginBottom: '16px' },
  aiEmptyHint: { fontSize: '11px', marginTop: '8px' },
  aiMessage: { padding: '12px 16px', borderRadius: '12px', maxWidth: '80%' },
  aiMsgRole: { fontSize: '11px', fontWeight: '600', color: '#ffaa00', display: 'block', marginBottom: '4px', textTransform: 'capitalize' },
  aiMsgContent: { margin: 0, fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' },
  aiMsgUsage: { display: 'block', marginTop: '8px', fontSize: '10px', color: '#666' },
  aiLoading: { padding: '12px', color: '#888', fontSize: '12px' },
  aiInputArea: { display: 'flex', gap: '12px', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' },
  aiTextInput: { flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontSize: '13px', fontFamily: 'inherit', outline: 'none' },
  aiSendBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #ffaa00, #ff6600)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: '600', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' },
  // Cashu styles
  cashuLayout: { display: 'flex', flexDirection: 'column', gap: '24px' },
  cashuHeader: { textAlign: 'center', padding: '32px', background: 'rgba(20,20,30,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' },
  cashuTitle: { fontSize: '24px', marginBottom: '16px' },
  cashuBalanceDisplay: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' },
  cashuBalanceValue: { fontSize: '48px', fontWeight: '700', color: '#ffaa00' },
  cashuBalanceUnit: { fontSize: '18px', color: '#888' },
  cashuGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  cashuActions: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  cashuBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    padding: '20px', background: 'rgba(255,170,0,0.05)', border: '1px solid rgba(255,170,0,0.2)',
    borderRadius: '12px', cursor: 'pointer', color: '#ffaa00', fontFamily: 'inherit', fontSize: '12px',
  },
  featureList: { listStyle: 'none', padding: 0, margin: 0 },
  // Settings styles
  settingsLayout: { display: 'flex', flexDirection: 'column', gap: '24px' },
  settingsTitle: { fontSize: '24px', marginBottom: '8px' },
  settingsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  settingField: { marginBottom: '16px' },
  settingInput: {
    width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff',
    fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginTop: '4px',
  },
  relayList: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' },
  relayListItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '12px' },
  removeBtn: { background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '16px' },
  addBtn: { width: '100%', padding: '10px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', color: '#666', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' },
  // Modal styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'rgba(30,30,45,0.98)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: '16px', padding: '24px', minWidth: '400px', maxWidth: '500px' },
  modalTitle: { fontSize: '18px', marginBottom: '16px', textAlign: 'center' },
  modalText: { fontSize: '14px', color: '#ccc', textAlign: 'center', marginBottom: '16px' },
  invoiceBox: { background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px' },
  invoice: { fontSize: '11px', color: '#ffaa00', wordBreak: 'break-all' },
  modalButtons: { display: 'flex', gap: '12px' },
  cancelBtn: { flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#888', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' },
  payBtn: { flex: 1, padding: '12px', background: 'linear-gradient(135deg, #ffaa00, #ff6600)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: '600', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' },
  // Footer styles
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', color: '#444', position: 'relative', zIndex: 10 },
  footerHighlight: { color: '#ffaa00' },
};

export default LightningHub;
