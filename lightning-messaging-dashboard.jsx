import React, { useState, useEffect, useRef } from 'react';

// Lightning Messaging Hub - Combines LN Node + Nostr Chat + Cashu + L402 AI
const LightningMessagingHub = () => {
  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [messages, setMessages] = useState([
    { id: 1, from: 'satoshi', pubkey: 'npub1...abc', text: 'Welcome to the Lightning realm ⚡', amount: 21, timestamp: Date.now() - 300000, type: 'received' },
    { id: 2, from: 'hal', pubkey: 'npub1...def', text: 'Just sent you some sats for that L402 API access!', amount: 1000, timestamp: Date.now() - 120000, type: 'received' },
    { id: 3, from: 'you', pubkey: 'npub1...xyz', text: 'Thanks! The AI inference is live now 🤖', amount: 0, timestamp: Date.now() - 60000, type: 'sent' },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [zapAmount, setZapAmount] = useState(21);
  const [nodeStats, setNodeStats] = useState({
    capacity: 5420000,
    channels: 12,
    peers: 8,
    pendingHtlcs: 2,
    routedToday: 142000,
    feesEarned: 847,
  });
  const [cashuBalance, setCashuBalance] = useState(50000);
  const [cashuMints, setCashuMints] = useState([
    { url: 'https://mint.your-node.local', balance: 50000, trusted: true },
  ]);
  const [aiServices, setAiServices] = useState([
    { name: 'Gemini-Mini Inference', endpoint: '/v1/chat', pricePerToken: 1, requests: 1247, revenue: 12470 },
    { name: 'BSV Code Assistant', endpoint: '/v1/code', pricePerToken: 2, requests: 543, revenue: 8688 },
    { name: 'Image Generation', endpoint: '/v1/image', pricePerToken: 100, requests: 89, revenue: 8900 },
  ]);
  const [isConnected, setIsConnected] = useState(true);
  const [showZapModal, setShowZapModal] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const chatRef = useRef(null);

  // Simulated real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setNodeStats(prev => ({
        ...prev,
        routedToday: prev.routedToday + Math.floor(Math.random() * 100),
        feesEarned: prev.feesEarned + Math.floor(Math.random() * 5),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = {
      id: Date.now(),
      from: 'you',
      pubkey: 'npub1...xyz',
      text: newMessage,
      amount: zapAmount > 0 ? zapAmount : 0,
      timestamp: Date.now(),
      type: 'sent',
    };
    setMessages([...messages, msg]);
    setNewMessage('');
    if (zapAmount > 0) {
      setCashuBalance(prev => prev - zapAmount);
    }
  };

  const handleZap = (recipient) => {
    setSelectedRecipient(recipient);
    setShowZapModal(true);
  };

  const confirmZap = () => {
    setCashuBalance(prev => prev - zapAmount);
    setShowZapModal(false);
    // Add zap confirmation message
    setMessages(prev => [...prev, {
      id: Date.now(),
      from: 'system',
      text: `⚡ Zapped ${zapAmount} sats to ${selectedRecipient}`,
      amount: zapAmount,
      timestamp: Date.now(),
      type: 'zap',
    }]);
  };

  const formatSats = (sats) => {
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

  return (
    <div style={styles.container}>
      {/* Background Effects */}
      <div style={styles.gridOverlay} />
      <div style={styles.glowOrb1} />
      <div style={styles.glowOrb2} />
      
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⚡</span>
          <span style={styles.logoText}>LIGHTNING HUB</span>
          <span style={styles.versionBadge}>v0.1.0-alpha</span>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.connectionStatus}>
            <span style={{...styles.statusDot, backgroundColor: isConnected ? '#00ff88' : '#ff4444'}} />
            <span style={styles.statusText}>{isConnected ? 'Node Online' : 'Disconnected'}</span>
          </div>
          <div style={styles.balanceDisplay}>
            <span style={styles.balanceLabel}>Cashu Balance</span>
            <span style={styles.balanceAmount}>{formatSats(cashuBalance)} sats</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={styles.nav}>
        {['dashboard', 'messages', 'cashu', 'ai-services', 'settings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.navButton,
              ...(activeTab === tab ? styles.navButtonActive : {}),
            }}
          >
            {tab === 'dashboard' && '📊'}
            {tab === 'messages' && '💬'}
            {tab === 'cashu' && '🥜'}
            {tab === 'ai-services' && '🤖'}
            {tab === 'settings' && '⚙️'}
            <span style={styles.navLabel}>{tab.replace('-', ' ').toUpperCase()}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div style={styles.dashboardGrid}>
            {/* Node Stats */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>⚡ Lightning Node</h3>
              <div style={styles.statsGrid}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{formatSats(nodeStats.capacity)}</span>
                  <span style={styles.statLabel}>Total Capacity</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{nodeStats.channels}</span>
                  <span style={styles.statLabel}>Active Channels</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{nodeStats.peers}</span>
                  <span style={styles.statLabel}>Connected Peers</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{formatSats(nodeStats.routedToday)}</span>
                  <span style={styles.statLabel}>Routed Today</span>
                </div>
              </div>
              <div style={styles.feesDisplay}>
                <span style={styles.feesLabel}>Fees Earned Today:</span>
                <span style={styles.feesAmount}>{formatSats(nodeStats.feesEarned)} sats</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🎯 Quick Actions</h3>
              <div style={styles.actionButtons}>
                <button style={styles.actionBtn} onClick={() => setActiveTab('messages')}>
                  <span style={styles.actionIcon}>💬</span>
                  <span>Open Chat</span>
                </button>
                <button style={styles.actionBtn}>
                  <span style={styles.actionIcon}>🔗</span>
                  <span>Create Invoice</span>
                </button>
                <button style={styles.actionBtn}>
                  <span style={styles.actionIcon}>🥜</span>
                  <span>Mint Ecash</span>
                </button>
                <button style={styles.actionBtn}>
                  <span style={styles.actionIcon}>📡</span>
                  <span>BOLT12 Offer</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📜 Recent Activity</h3>
              <div style={styles.activityList}>
                <div style={styles.activityItem}>
                  <span style={styles.activityIcon}>⬇️</span>
                  <span style={styles.activityText}>Received 1,000 sats via Zap</span>
                  <span style={styles.activityTime}>2m ago</span>
                </div>
                <div style={styles.activityItem}>
                  <span style={styles.activityIcon}>🤖</span>
                  <span style={styles.activityText}>L402 API call: /v1/chat</span>
                  <span style={styles.activityTime}>5m ago</span>
                </div>
                <div style={styles.activityItem}>
                  <span style={styles.activityIcon}>🥜</span>
                  <span style={styles.activityText}>Minted 5,000 sats to Cashu</span>
                  <span style={styles.activityTime}>12m ago</span>
                </div>
                <div style={styles.activityItem}>
                  <span style={styles.activityIcon}>📡</span>
                  <span style={styles.activityText}>Routed 50,000 sats (fee: 12)</span>
                  <span style={styles.activityTime}>18m ago</span>
                </div>
              </div>
            </div>

            {/* L402 API Stats */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🤖 L402 AI Services</h3>
              <div style={styles.aiStatsGrid}>
                {aiServices.map((service, idx) => (
                  <div key={idx} style={styles.aiServiceCard}>
                    <span style={styles.aiServiceName}>{service.name}</span>
                    <div style={styles.aiServiceStats}>
                      <span>{service.requests} requests</span>
                      <span style={styles.aiRevenue}>{formatSats(service.revenue)} sats</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div style={styles.messagesContainer}>
            {/* Contacts Sidebar */}
            <div style={styles.contactsSidebar}>
              <h3 style={styles.sidebarTitle}>Contacts</h3>
              <div style={styles.contactsList}>
                {['satoshi', 'hal', 'adam_back', 'nick_szabo'].map(contact => (
                  <div key={contact} style={styles.contactItem}>
                    <div style={styles.contactAvatar}>
                      {contact[0].toUpperCase()}
                    </div>
                    <div style={styles.contactInfo}>
                      <span style={styles.contactName}>{contact}</span>
                      <span style={styles.contactPubkey}>npub1...{contact.slice(0,3)}</span>
                    </div>
                    <button 
                      style={styles.zapBtn}
                      onClick={() => handleZap(contact)}
                    >
                      ⚡
                    </button>
                  </div>
                ))}
              </div>
              <div style={styles.nostrInfo}>
                <span style={styles.nostrLabel}>Your Nostr ID</span>
                <code style={styles.nostrPubkey}>npub1xyz...789</code>
              </div>
            </div>

            {/* Chat Area */}
            <div style={styles.chatArea}>
              <div style={styles.chatHeader}>
                <h3 style={styles.chatTitle}>💬 Global Chat</h3>
                <div style={styles.chatActions}>
                  <span style={styles.onlineCount}>🟢 42 online</span>
                </div>
              </div>
              
              <div ref={chatRef} style={styles.messagesList}>
                {messages.map(msg => (
                  <div 
                    key={msg.id} 
                    style={{
                      ...styles.messageItem,
                      ...(msg.type === 'sent' ? styles.messageSent : {}),
                      ...(msg.type === 'zap' ? styles.messageZap : {}),
                    }}
                  >
                    {msg.type !== 'sent' && msg.type !== 'zap' && (
                      <div style={styles.messageAvatar}>
                        {msg.from[0].toUpperCase()}
                      </div>
                    )}
                    <div style={styles.messageContent}>
                      {msg.type !== 'zap' && (
                        <div style={styles.messageHeader}>
                          <span style={styles.messageSender}>{msg.from}</span>
                          <span style={styles.messageTime}>{formatTime(msg.timestamp)}</span>
                        </div>
                      )}
                      <p style={styles.messageText}>{msg.text}</p>
                      {msg.amount > 0 && (
                        <span style={styles.messageZapAmount}>⚡ {msg.amount} sats</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div style={styles.messageInput}>
                <div style={styles.zapSelector}>
                  <span style={styles.zapLabel}>⚡</span>
                  <input
                    type="number"
                    value={zapAmount}
                    onChange={(e) => setZapAmount(parseInt(e.target.value) || 0)}
                    style={styles.zapInput}
                    min="0"
                    step="21"
                  />
                  <span style={styles.zapUnit}>sats</span>
                </div>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message... (include sats to zap!)"
                  style={styles.textInput}
                />
                <button onClick={sendMessage} style={styles.sendButton}>
                  Send {zapAmount > 0 ? `⚡${zapAmount}` : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cashu Tab */}
        {activeTab === 'cashu' && (
          <div style={styles.cashuContainer}>
            <div style={styles.cashuHeader}>
              <h2 style={styles.cashuTitle}>🥜 Cashu Ecash Wallet</h2>
              <div style={styles.cashuBalanceLarge}>
                <span style={styles.cashuAmount}>{formatSats(cashuBalance)}</span>
                <span style={styles.cashuUnit}>sats</span>
              </div>
            </div>

            <div style={styles.cashuGrid}>
              {/* Mint Info */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🏦 Connected Mint</h3>
                {cashuMints.map((mint, idx) => (
                  <div key={idx} style={styles.mintCard}>
                    <div style={styles.mintHeader}>
                      <span style={styles.mintUrl}>{mint.url}</span>
                      {mint.trusted && <span style={styles.trustedBadge}>✓ Trusted</span>}
                    </div>
                    <div style={styles.mintBalance}>
                      Balance: {formatSats(mint.balance)} sats
                    </div>
                  </div>
                ))}
              </div>

              {/* Cashu Actions */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>⚡ Actions</h3>
                <div style={styles.cashuActions}>
                  <button style={styles.cashuActionBtn}>
                    <span style={styles.actionIcon}>⬇️</span>
                    <span>Mint from LN</span>
                    <span style={styles.actionDesc}>Convert sats → ecash</span>
                  </button>
                  <button style={styles.cashuActionBtn}>
                    <span style={styles.actionIcon}>⬆️</span>
                    <span>Melt to LN</span>
                    <span style={styles.actionDesc}>Convert ecash → sats</span>
                  </button>
                  <button style={styles.cashuActionBtn}>
                    <span style={styles.actionIcon}>📤</span>
                    <span>Send Token</span>
                    <span style={styles.actionDesc}>Copy ecash token</span>
                  </button>
                  <button style={styles.cashuActionBtn}>
                    <span style={styles.actionIcon}>📥</span>
                    <span>Receive Token</span>
                    <span style={styles.actionDesc}>Paste ecash token</span>
                  </button>
                </div>
              </div>

              {/* Privacy Info */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🔒 Privacy Features</h3>
                <ul style={styles.privacyList}>
                  <li style={styles.privacyItem}>
                    <span style={styles.privacyIcon}>✓</span>
                    Blind signatures - mint can't link tokens
                  </li>
                  <li style={styles.privacyItem}>
                    <span style={styles.privacyIcon}>✓</span>
                    Offline transfers supported
                  </li>
                  <li style={styles.privacyItem}>
                    <span style={styles.privacyIcon}>✓</span>
                    NFC tap-to-pay ready
                  </li>
                  <li style={styles.privacyItem}>
                    <span style={styles.privacyIcon}>✓</span>
                    No balance or transaction history stored
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* AI Services Tab */}
        {activeTab === 'ai-services' && (
          <div style={styles.aiContainer}>
            <div style={styles.aiHeader}>
              <h2 style={styles.aiTitle}>🤖 L402 AI Services</h2>
              <p style={styles.aiSubtitle}>Pay-per-request AI inference powered by Lightning</p>
            </div>

            <div style={styles.aiGrid}>
              {aiServices.map((service, idx) => (
                <div key={idx} style={styles.aiCard}>
                  <div style={styles.aiCardHeader}>
                    <h3 style={styles.aiServiceTitle}>{service.name}</h3>
                    <span style={styles.aiEndpoint}>{service.endpoint}</span>
                  </div>
                  <div style={styles.aiCardBody}>
                    <div style={styles.aiPricing}>
                      <span style={styles.aiPriceLabel}>Price:</span>
                      <span style={styles.aiPrice}>{service.pricePerToken} sat/token</span>
                    </div>
                    <div style={styles.aiMetrics}>
                      <div style={styles.aiMetric}>
                        <span style={styles.metricValue}>{service.requests}</span>
                        <span style={styles.metricLabel}>Requests</span>
                      </div>
                      <div style={styles.aiMetric}>
                        <span style={styles.metricValue}>{formatSats(service.revenue)}</span>
                        <span style={styles.metricLabel}>Revenue (sats)</span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.aiCardFooter}>
                    <button style={styles.aiTestBtn}>Test Endpoint</button>
                    <button style={styles.aiCopyBtn}>Copy BOLT12</button>
                  </div>
                </div>
              ))}

              {/* Add New Service */}
              <div style={{...styles.aiCard, ...styles.aiCardNew}}>
                <div style={styles.addServiceContent}>
                  <span style={styles.addIcon}>+</span>
                  <span style={styles.addText}>Add New AI Service</span>
                  <span style={styles.addDesc}>Deploy your model with L402 gating</span>
                </div>
              </div>
            </div>

            {/* API Documentation */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📚 L402 Integration</h3>
              <pre style={styles.codeBlock}>
{`# Example L402 Request
curl -X POST https://your-node.local/v1/chat \\
  -H "Authorization: L402 <macaroon>:<preimage>" \\
  -d '{"prompt": "Hello, AI!", "max_tokens": 100}'

# Response includes payment proof
{
  "response": "Hello! How can I help you today?",
  "tokens_used": 42,
  "sats_charged": 42,
  "preimage": "abc123..."
}`}
              </pre>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={styles.settingsContainer}>
            <h2 style={styles.settingsTitle}>⚙️ Settings</h2>
            
            <div style={styles.settingsGrid}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🔌 Node Connection</h3>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>LND REST API</label>
                  <input style={styles.settingInput} defaultValue="https://localhost:8080" />
                </div>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>Macaroon Path</label>
                  <input style={styles.settingInput} defaultValue="~/.lnd/admin.macaroon" />
                </div>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🥜 Cashu Mint</h3>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>Mint URL</label>
                  <input style={styles.settingInput} defaultValue="https://mint.your-node.local" />
                </div>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>Auto-mint threshold</label>
                  <input style={styles.settingInput} defaultValue="100000" type="number" />
                </div>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>📡 Nostr Relays</h3>
                <div style={styles.relayList}>
                  <div style={styles.relayItem}>
                    <span>wss://relay.damus.io</span>
                    <span style={styles.relayStatus}>🟢</span>
                  </div>
                  <div style={styles.relayItem}>
                    <span>wss://nos.lol</span>
                    <span style={styles.relayStatus}>🟢</span>
                  </div>
                  <div style={styles.relayItem}>
                    <span>wss://relay.nostr.band</span>
                    <span style={styles.relayStatus}>🟡</span>
                  </div>
                </div>
                <button style={styles.addRelayBtn}>+ Add Relay</button>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🔑 BOLT12 Offer</h3>
                <div style={styles.bolt12Display}>
                  <code style={styles.bolt12Code}>lno1qgs...</code>
                  <button style={styles.copyBtn}>📋 Copy</button>
                </div>
                <p style={styles.bolt12Hint}>Share this static offer to receive payments</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Zap Modal */}
      {showZapModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>⚡ Zap {selectedRecipient}</h3>
            <div style={styles.zapPresets}>
              {[21, 100, 500, 1000, 5000].map(amount => (
                <button
                  key={amount}
                  onClick={() => setZapAmount(amount)}
                  style={{
                    ...styles.zapPresetBtn,
                    ...(zapAmount === amount ? styles.zapPresetActive : {}),
                  }}
                >
                  {amount}
                </button>
              ))}
            </div>
            <div style={styles.customZapInput}>
              <input
                type="number"
                value={zapAmount}
                onChange={(e) => setZapAmount(parseInt(e.target.value) || 0)}
                style={styles.modalInput}
              />
              <span style={styles.modalInputUnit}>sats</span>
            </div>
            <div style={styles.modalButtons}>
              <button onClick={() => setShowZapModal(false)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={confirmZap} style={styles.confirmZapBtn}>
                ⚡ Send Zap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={styles.footer}>
        <span>Lightning Hub • Built on LND + Nostr + Cashu + L402</span>
        <span style={styles.footerVersion}>Young's Node • Branson, MO</span>
      </footer>
    </div>
  );
};

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
    color: '#e0e0e0',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(255,170,0,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,170,0,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '50px 50px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  glowOrb1: {
    position: 'fixed',
    top: '20%',
    left: '10%',
    width: '400px',
    height: '400px',
    background: 'radial-gradient(circle, rgba(255,170,0,0.1) 0%, transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  glowOrb2: {
    position: 'fixed',
    bottom: '10%',
    right: '15%',
    width: '300px',
    height: '300px',
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
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    fontSize: '32px',
    filter: 'drop-shadow(0 0 10px #ffaa00)',
  },
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
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    boxShadow: '0 0 10px currentColor',
  },
  statusText: {
    fontSize: '12px',
    color: '#888',
  },
  balanceDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: '10px',
    color: '#666',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffaa00',
  },
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
  },
  navButtonActive: {
    background: 'rgba(255,170,0,0.1)',
    borderColor: '#ffaa00',
    color: '#ffaa00',
  },
  navLabel: {
    letterSpacing: '1px',
  },
  main: {
    padding: '24px 32px',
    minHeight: 'calc(100vh - 180px)',
    position: 'relative',
    zIndex: 10,
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  card: {
    background: 'rgba(20,20,30,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '20px',
    backdropFilter: 'blur(10px)',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#fff',
    letterSpacing: '1px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffaa00',
  },
  statLabel: {
    fontSize: '11px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  feesDisplay: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feesLabel: {
    color: '#888',
    fontSize: '12px',
  },
  feesAmount: {
    color: '#00ff88',
    fontWeight: '700',
    fontSize: '16px',
  },
  actionButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  actionBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    background: 'rgba(255,170,0,0.1)',
    border: '1px solid rgba(255,170,0,0.3)',
    borderRadius: '8px',
    color: '#ffaa00',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '12px',
  },
  actionIcon: {
    fontSize: '24px',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
  },
  activityIcon: {
    fontSize: '16px',
  },
  activityText: {
    flex: 1,
    fontSize: '12px',
    color: '#ccc',
  },
  activityTime: {
    fontSize: '10px',
    color: '#666',
  },
  aiStatsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  aiServiceCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: 'rgba(138,43,226,0.1)',
    border: '1px solid rgba(138,43,226,0.3)',
    borderRadius: '8px',
  },
  aiServiceName: {
    fontSize: '12px',
    color: '#bb86fc',
  },
  aiServiceStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '11px',
    color: '#888',
  },
  aiRevenue: {
    color: '#00ff88',
    fontWeight: '600',
  },
  // Messages styles
  messagesContainer: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '20px',
    height: 'calc(100vh - 220px)',
  },
  contactsSidebar: {
    background: 'rgba(20,20,30,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarTitle: {
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#888',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  contactsList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    ':hover': {
      background: 'rgba(255,255,255,0.05)',
    },
  },
  contactAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ffaa00, #ff6600)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '14px',
    color: '#000',
  },
  contactInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  contactName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
  },
  contactPubkey: {
    fontSize: '10px',
    color: '#666',
  },
  zapBtn: {
    padding: '6px 10px',
    background: 'rgba(255,170,0,0.2)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  nostrInfo: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  nostrLabel: {
    fontSize: '10px',
    color: '#666',
    display: 'block',
    marginBottom: '4px',
  },
  nostrPubkey: {
    fontSize: '11px',
    color: '#ffaa00',
    background: 'rgba(255,170,0,0.1)',
    padding: '8px',
    borderRadius: '6px',
    display: 'block',
    wordBreak: 'break-all',
  },
  chatArea: {
    background: 'rgba(20,20,30,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
  },
  chatHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: '14px',
    fontWeight: '600',
    margin: 0,
  },
  chatActions: {
    display: 'flex',
    gap: '16px',
  },
  onlineCount: {
    fontSize: '12px',
    color: '#888',
  },
  messagesList: {
    flex: 1,
    padding: '16px 20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  messageItem: {
    display: 'flex',
    gap: '12px',
    maxWidth: '80%',
  },
  messageSent: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  messageZap: {
    alignSelf: 'center',
    background: 'rgba(255,170,0,0.1)',
    padding: '8px 16px',
    borderRadius: '20px',
    maxWidth: '100%',
  },
  messageAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #666, #444)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    flexShrink: 0,
  },
  messageContent: {
    background: 'rgba(255,255,255,0.05)',
    padding: '10px 14px',
    borderRadius: '12px',
    borderTopLeftRadius: '4px',
  },
  messageHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '4px',
  },
  messageSender: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#ffaa00',
  },
  messageTime: {
    fontSize: '10px',
    color: '#666',
  },
  messageText: {
    margin: 0,
    fontSize: '13px',
    lineHeight: '1.4',
    color: '#e0e0e0',
  },
  messageZapAmount: {
    display: 'inline-block',
    marginTop: '6px',
    fontSize: '11px',
    color: '#ffaa00',
    background: 'rgba(255,170,0,0.2)',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  messageInput: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  zapSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(255,170,0,0.1)',
    padding: '0 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,170,0,0.3)',
  },
  zapLabel: {
    fontSize: '16px',
  },
  zapInput: {
    width: '60px',
    background: 'transparent',
    border: 'none',
    color: '#ffaa00',
    fontSize: '14px',
    fontFamily: 'inherit',
    textAlign: 'center',
    outline: 'none',
  },
  zapUnit: {
    fontSize: '10px',
    color: '#888',
  },
  textInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#fff',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  sendButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #ffaa00, #ff6600)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  // Cashu styles
  cashuContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  cashuHeader: {
    textAlign: 'center',
    padding: '32px',
    background: 'rgba(20,20,30,0.8)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  cashuTitle: {
    fontSize: '24px',
    marginBottom: '16px',
    color: '#fff',
  },
  cashuBalanceLarge: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '8px',
  },
  cashuAmount: {
    fontSize: '48px',
    fontWeight: '700',
    color: '#ffaa00',
  },
  cashuUnit: {
    fontSize: '18px',
    color: '#888',
  },
  cashuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  mintCard: {
    padding: '16px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
  },
  mintHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  mintUrl: {
    fontSize: '12px',
    color: '#ccc',
  },
  trustedBadge: {
    fontSize: '10px',
    color: '#00ff88',
    background: 'rgba(0,255,136,0.1)',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  mintBalance: {
    fontSize: '14px',
    color: '#ffaa00',
    fontWeight: '600',
  },
  cashuActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  cashuActionBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '20px 16px',
    background: 'rgba(255,170,0,0.05)',
    border: '1px solid rgba(255,170,0,0.2)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  actionDesc: {
    fontSize: '10px',
    color: '#666',
  },
  privacyList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  privacyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: '12px',
    color: '#ccc',
  },
  privacyIcon: {
    color: '#00ff88',
    fontSize: '14px',
  },
  // AI Services styles
  aiContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  aiHeader: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  aiTitle: {
    fontSize: '24px',
    marginBottom: '8px',
    color: '#fff',
  },
  aiSubtitle: {
    fontSize: '14px',
    color: '#888',
  },
  aiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  aiCard: {
    background: 'rgba(20,20,30,0.8)',
    border: '1px solid rgba(138,43,226,0.3)',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  aiCardHeader: {
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(138,43,226,0.1)',
  },
  aiServiceTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    marginBottom: '4px',
    color: '#fff',
  },
  aiEndpoint: {
    fontSize: '12px',
    color: '#bb86fc',
    fontFamily: 'monospace',
  },
  aiCardBody: {
    padding: '20px',
  },
  aiPricing: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  aiPriceLabel: {
    color: '#888',
    fontSize: '12px',
  },
  aiPrice: {
    color: '#ffaa00',
    fontWeight: '600',
    fontSize: '14px',
  },
  aiMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  aiMetric: {
    display: 'flex',
    flexDirection: 'column',
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
  },
  metricLabel: {
    fontSize: '10px',
    color: '#666',
    textTransform: 'uppercase',
  },
  aiCardFooter: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    gap: '12px',
  },
  aiTestBtn: {
    flex: 1,
    padding: '10px',
    background: 'rgba(138,43,226,0.2)',
    border: '1px solid rgba(138,43,226,0.5)',
    borderRadius: '8px',
    color: '#bb86fc',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'inherit',
  },
  aiCopyBtn: {
    flex: 1,
    padding: '10px',
    background: 'rgba(255,170,0,0.2)',
    border: '1px solid rgba(255,170,0,0.5)',
    borderRadius: '8px',
    color: '#ffaa00',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'inherit',
  },
  aiCardNew: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed rgba(255,255,255,0.2)',
    cursor: 'pointer',
    minHeight: '200px',
  },
  addServiceContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    color: '#666',
  },
  addIcon: {
    fontSize: '36px',
    color: '#444',
  },
  addText: {
    fontSize: '14px',
    fontWeight: '600',
  },
  addDesc: {
    fontSize: '11px',
    color: '#555',
  },
  codeBlock: {
    background: 'rgba(0,0,0,0.5)',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '11px',
    overflow: 'auto',
    color: '#bb86fc',
    lineHeight: '1.6',
  },
  // Settings styles
  settingsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  settingsTitle: {
    fontSize: '24px',
    marginBottom: '8px',
    color: '#fff',
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  settingItem: {
    marginBottom: '16px',
  },
  settingLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#888',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  settingInput: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  relayList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
  },
  relayItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#ccc',
  },
  relayStatus: {
    fontSize: '10px',
  },
  addRelayBtn: {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    border: '1px dashed rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#666',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'inherit',
  },
  bolt12Display: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  bolt12Code: {
    flex: 1,
    padding: '10px',
    background: 'rgba(255,170,0,0.1)',
    borderRadius: '6px',
    color: '#ffaa00',
    fontSize: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  copyBtn: {
    padding: '10px 16px',
    background: 'rgba(255,170,0,0.2)',
    border: 'none',
    borderRadius: '6px',
    color: '#ffaa00',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'inherit',
  },
  bolt12Hint: {
    fontSize: '11px',
    color: '#666',
    margin: 0,
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: 'rgba(30,30,45,0.98)',
    border: '1px solid rgba(255,170,0,0.3)',
    borderRadius: '16px',
    padding: '24px',
    minWidth: '320px',
  },
  modalTitle: {
    fontSize: '18px',
    marginBottom: '20px',
    textAlign: 'center',
    color: '#fff',
  },
  zapPresets: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    justifyContent: 'center',
  },
  zapPresetBtn: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '20px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'inherit',
  },
  zapPresetActive: {
    background: 'rgba(255,170,0,0.2)',
    borderColor: '#ffaa00',
    color: '#ffaa00',
  },
  customZapInput: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  modalInput: {
    width: '120px',
    padding: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,170,0,0.5)',
    borderRadius: '8px',
    color: '#ffaa00',
    fontSize: '20px',
    fontFamily: 'inherit',
    textAlign: 'center',
    outline: 'none',
  },
  modalInputUnit: {
    fontSize: '14px',
    color: '#888',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  confirmZapBtn: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #ffaa00, #ff6600)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  // Footer styles
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    fontSize: '11px',
    color: '#444',
    position: 'relative',
    zIndex: 10,
  },
  footerVersion: {
    color: '#ffaa00',
  },
};

export default LightningMessagingHub;
