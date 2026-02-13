import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// --- CONFIG ---
const SHARD_SPAWN_RATE = 800;
const EARNING_RATE = 0.5;
const SAVE_INTERVAL = 5000;

// --- SUPABASE ---
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const TASKS = [
  "Sentiment Analysis: Verified", "Vector Embedding: Complete", 
  "Node Latency: 12ms", "Hash Validated: 0x8F...2A", 
  "Neural Weight Updated", "Pattern Match: 98.4%", 
  "Swarm Sync: Active", "Data Fragment: Encrypted"
];

function App() {
  const [view, setView] = useState('MINING') // 'MINING' or 'SQUAD'
  const [status, setStatus] = useState('IDLE')
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [shards, setShards] = useState([])
  const [popups, setPopups] = useState([])
  const [referrals, setReferrals] = useState(0) // Count of friends
  
  const balanceRef = useRef(0)
  const miningInterval = useRef(null)
  const shardInterval = useRef(null)

  // 1. INIT & REFERRAL CHECK
  useEffect(() => {
    const init = async () => {
      let currentUser = null
      let startParam = null

      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp
        tg.ready()
        tg.expand()
        tg.setHeaderColor('#000000')
        tg.setBackgroundColor('#000000')
        if (tg.initDataUnsafe?.user) currentUser = tg.initDataUnsafe.user
        if (tg.initDataUnsafe?.start_param) startParam = tg.initDataUnsafe.start_param
      }

      if (!currentUser) {
        currentUser = { id: 999999999, first_name: 'Guest', username: 'browser_test' }
      }
      setUser(currentUser)

      // Database Logic
      if (currentUser) {
        // A. Try to fetch user
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        if (existingUser) {
          setBalance(existingUser.balance)
          balanceRef.current = existingUser.balance
          
          // Count referrals
          const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('referred_by', currentUser.id)
          setReferrals(count || 0)

        } else {
          // B. Create NEW User (with Referral Logic)
          let referrerId = null
          if (startParam && startParam.startsWith('ref_')) {
             referrerId = parseInt(startParam.split('_')[1])
          }

          const { error } = await supabase.from('users').insert({ 
            id: currentUser.id, 
            first_name: currentUser.first_name, 
            balance: 1000,
            referred_by: referrerId // Save who invited them
          })

          if (!error) {
            setBalance(1000)
            balanceRef.current = 1000
          }
        }
      }
    }
    init()
  }, [])

  // 2. AUTO-SAVER
  useEffect(() => {
    const saver = setInterval(async () => {
      if (user && balanceRef.current > 0) {
        await supabase.from('users').update({ balance: balanceRef.current }).eq('id', user.id)
      }
    }, SAVE_INTERVAL)
    return () => clearInterval(saver)
  }, [user])

  // 3. MINING FUNCTIONS
  const toggleMining = () => {
    if (status === 'MINING') {
      setStatus('IDLE')
      clearInterval(miningInterval.current)
      clearInterval(shardInterval.current)
      setShards([])
    } else {
      setStatus('MINING')
      miningInterval.current = setInterval(() => {
        const increment = EARNING_RATE / 10
        const newBal = parseFloat((balanceRef.current + increment).toFixed(3))
        setBalance(newBal)
        balanceRef.current = newBal
      }, 100)
      shardInterval.current = setInterval(() => {
        const id = Math.random()
        const left = Math.random() * 80 + 10;
        const duration = Math.random() * 3 + 2;
        setShards(prev => [...prev, { id, left, duration, created: Date.now() }])
        setTimeout(() => setShards(prev => prev.filter(s => s.id !== id)), duration * 1000)
      }, SHARD_SPAWN_RATE)
    }
  }

  const handleShardClick = (e, shardId) => {
    e.stopPropagation()
    if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
    const task = TASKS[Math.floor(Math.random() * TASKS.length)]
    const popId = Math.random()
    setPopups(prev => [...prev, { id: popId, text: task, x: e.clientX, y: e.clientY }])
    setShards(prev => prev.filter(s => s.id !== shardId))
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== popId)), 1000)
  }

  // 4. INVITE FUNCTION
  const handleInvite = () => {
    if (!user) return
    const inviteLink = `https://t.me/RIM_Protocol_Bot/start?startapp=ref_${user.id}`
    const text = `Join the RIM Intelligence Swarm. Activate your node.`
    
    // Open Telegram Share
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-black text-white font-mono overflow-hidden relative select-none">
      <style>{`
        @keyframes ripple { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(3); opacity: 0; } }
        @keyframes floatUp { 0% { bottom: -20px; opacity: 0; transform: scale(0.5); } 20% { opacity: 1; } 100% { bottom: 60%; opacity: 0; transform: scale(1.2); } }
        .shard-glow { box-shadow: 0 0 10px #06b6d4, 0 0 20px #06b6d4; }
      `}</style>

      {/* BACKGROUND */}
      <div className="absolute inset-0 grid grid-cols-[repeat(20,minmax(0,1fr))] opacity-10 pointer-events-none">
        {[...Array(400)].map((_, i) => <div key={i} className="border-[0.5px] border-gray-800"></div>)}
      </div>

      {/* HEADER */}
      <div className="w-full p-6 z-20 flex justify-between items-start bg-gradient-to-b from-black to-transparent">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">RIM</h1>
          <div className="flex items-center space-x-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${status === 'MINING' ? 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]' : 'bg-gray-500'}`}></div>
            <span className="text-[10px] tracking-widest text-gray-400">{view === 'MINING' ? 'NEURAL LINK' : 'SQUAD LINK'}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Balance</p>
          <p className="text-2xl font-bold text-white tracking-tighter">{balance.toFixed(2)}</p>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 w-full flex items-center justify-center relative z-10">
        
        {view === 'MINING' ? (
          // --- MINING VIEW ---
          <>
            {shards.map(shard => (
              <div key={shard.id} onClick={(e) => handleShardClick(e, shard.id)} className="absolute w-6 h-6 bg-cyan-900/40 border border-cyan-400 rounded-sm flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ left: `${shard.left}%`, animation: `floatUp ${shard.duration}s linear forwards` }}>
                <div className="w-2 h-2 bg-cyan-400 rounded-full shard-glow"></div>
              </div>
            ))}
            {popups.map(pop => (
              <div key={pop.id} className="absolute text-[10px] text-cyan-300 font-bold tracking-wider pointer-events-none z-50 whitespace-nowrap" style={{ left: pop.x, top: pop.y - 40 }}>{pop.text}</div>
            ))}
            <div onClick={toggleMining} className="relative w-48 h-48 flex items-center justify-center cursor-pointer group">
              {status === 'MINING' && <div className="absolute inset-0 border border-cyan-900 rounded-full animate-[ripple_3s_infinite_linear]"></div>}
              {status === 'MINING' && <div className="absolute inset-4 border border-cyan-700 rounded-full animate-[ripple_2s_infinite_linear_0.5s]"></div>}
              <div className={`relative z-20 transition-all duration-500 ${status === 'MINING' ? 'scale-110 drop-shadow-[0_0_30px_#06b6d4]' : 'scale-100 opacity-50 grayscale'}`}>
                <svg width="100" height="100" viewBox="0 0 24 24" fill={status === 'MINING' ? '#fff' : '#444'} xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fillOpacity="0.5"/><path d="M2 17L12 12L22 17L12 22L2 17Z" fillOpacity="0.5"/><path d="M2 7L2 17L12 12L12 2L2 7Z" fillOpacity="0.8"/><path d="M22 7L22 17L12 12L12 2L22 7Z" fillOpacity="0.8"/>
                </svg>
              </div>
            </div>
          </>
        ) : (
          // --- SQUAD VIEW ---
          <div className="w-full max-w-sm p-6">
            <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-lg text-center backdrop-blur-md">
              <h2 className="text-xl font-bold mb-2">INVITE NODES</h2>
              <p className="text-gray-400 text-xs mb-6">Grow the swarm. Earn 10% of all data mined by your squad.</p>
              
              <div className="mb-8">
                <div className="text-4xl font-black text-cyan-400">{referrals}</div>
                <div className="text-[10px] tracking-widest text-gray-500 uppercase">Active Nodes Recruited</div>
              </div>

              <button onClick={handleInvite} className="w-full py-4 bg-white text-black font-bold tracking-widest hover:bg-cyan-400 transition-colors">
                COPY LINK
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER NAV */}
      <div className="w-full grid grid-cols-2 border-t border-gray-900 bg-black z-30">
        <button onClick={() => setView('MINING')} className={`py-6 text-[10px] tracking-widest font-bold ${view === 'MINING' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>
          NEURAL LINK
        </button>
        <button onClick={() => setView('SQUAD')} className={`py-6 text-[10px] tracking-widest font-bold ${view === 'SQUAD' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>
          SQUAD
        </button>
      </div>
    </div>
  )
}

export default App