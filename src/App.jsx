import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  // UI State
  const [showLoader, setShowLoader] = useState(true)
  const [loaderProgress, setLoaderProgress] = useState(0)
  const [loaderStatus, setLoaderStatus] = useState('Loading game engine...')
  const [showEnterBtn, setShowEnterBtn] = useState(false)
  const [showAppHome, setShowAppHome] = useState(false)
  const [showGame, setShowGame] = useState(false)
  
  const [turnText, setTurnText] = useState("Blue's Turn (You)")
  const [turnHint, setTurnHint] = useState('Click your dice panel to roll!')
  const [diceResult, setDiceResult] = useState('')
  const [turnDotColor, setTurnDotColor] = useState('#0088fe')
  const [homeCounts, setHomeCounts] = useState({ blue: 0, red: 0, green: 0, yellow: 0 })
  const [chances, setChances] = useState({ blue: 0, red: 0, green: 0, yellow: 0 })
  const [eliminated, setEliminated] = useState({ blue: false, red: false, green: false, yellow: false })
  const [activeTurnColor, setActiveTurnColor] = useState('blue')
  const [playerRoles, setPlayerRoles] = useState({ blue: '👤 Human', red: '🤖 Bot', green: '🤖 Bot', yellow: '🤖 Bot' })
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [showDisqualified, setShowDisqualified] = useState(false)
  const [showVictory, setShowVictory] = useState(false)
  const [victoryTitle, setVictoryTitle] = useState('🎉 YOU WIN! 🎉')
  const [victoryColor, setVictoryColor] = useState('#0088fe')
  const [winnerName, setWinnerName] = useState('Blue')
  const [toast, setToast] = useState({ show: false, text: '', badge: '', icon: '🎯' })
  const [boardCells, setBoardCells] = useState([])
  const [pawns, setPawns] = useState([])
  const [gameMode, setGameModeState] = useState('4p-bots')
  const [wins, setWins] = useState(() => {
    try {
      const val = localStorage.getItem('ludo_player_wins_count')
      if (val === null) { localStorage.setItem('ludo_player_wins_count', '1'); return 1 }
      const num = parseInt(val, 10)
      return isNaN(num) ? 1 : num
    } catch (_err) { return 1 }
  })

  const gameStateRef = useRef({
    mode: '4p-bots',
    activeOrder: ['blue', 'red', 'green', 'yellow'],
    turnIdx: 0,
    diceValue: null,
    consecutiveSixes: 0,
    isRolling: false,
    isMoving: false,
    canRoll: true,
    activeMovingPawn: null,
    rewindingPawns: new Set(),
    misses: { blue: 0, red: 0, green: 0, yellow: 0 },
    eliminated: { blue: false, red: false, green: false, yellow: false },
    pawns: {
      blue: [0, 1, 2, 3].map(id => ({ id, color: 'blue', state: 'BASE', step: -1 })),
      red: [0, 1, 2, 3].map(id => ({ id, color: 'red', state: 'BASE', step: -1 })),
      green: [0, 1, 2, 3].map(id => ({ id, color: 'green', state: 'BASE', step: -1 })),
      yellow: [0, 1, 2, 3].map(id => ({ id, color: 'yellow', state: 'BASE', step: -1 }))
    },
    winner: null
  })

  const playersRef = useRef({
    blue: { id: 'blue', name: 'Blue', startIndex: 39, isBot: false, color: '#0088fe' },
    red: { id: 'red', name: 'Red', startIndex: 0, isBot: true, color: '#eb2d2d' },
    green: { id: 'green', name: 'Green', startIndex: 13, isBot: true, color: '#0ea152' },
    yellow: { id: 'yellow', name: 'Yellow', startIndex: 26, isBot: true, color: '#f5b800' }
  })

  const turnTimerIntervalRef = useRef(null)
  const turnSecondsLeftRef = useRef(10)
  const TURN_TIME_LIMIT = 10
  const audioCtxRef = useRef(null)
  const soundEnabledRef = useRef(true)
  const confettiCanvasRef = useRef(null)
  const gridRef = useRef(null)
  const pawnsLayerRef = useRef(null)

  const OUTER_TRACK = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7], [0, 8],
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14], [8, 14],
    [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7], [14, 6],
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    [7, 0], [6, 0]
  ]

  const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47]
  const PLAYER_CONFIGS = {
    blue: { startIndex: 39, homePath: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]], centerGoalCoords: {row:8.5,col:7.5}, baseSlots: [{row:10.95,col:1.95},{row:10.95,col:4.05},{row:13.05,col:1.95},{row:13.05,col:4.05}] },
    red: { startIndex: 0, homePath: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]], centerGoalCoords: {row:7.5,col:6.5}, baseSlots: [{row:1.95,col:1.95},{row:1.95,col:4.05},{row:4.05,col:1.95},{row:4.05,col:4.05}] },
    green: { startIndex: 13, homePath: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]], centerGoalCoords: {row:6.5,col:7.5}, baseSlots: [{row:1.95,col:10.95},{row:1.95,col:13.05},{row:4.05,col:10.95},{row:4.05,col:13.05}] },
    yellow: { startIndex: 26, homePath: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]], centerGoalCoords: {row:7.5,col:8.5}, baseSlots: [{row:10.95,col:10.95},{row:10.95,col:13.05},{row:13.05,col:10.95},{row:13.05,col:13.05}] }
  }
  const PLAYER_COLORS = { blue: '#0088fe', red: '#eb2d2d', green: '#0ea152', yellow: '#f5b800' }
  const PLAYER_NAMES = { blue: 'Blue', red: 'Red', green: 'Green', yellow: 'Yellow' }

  // Audio functions
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) audioCtxRef.current = new AudioCtx()
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
  }

  const playSound = (type) => {
    if (!soundEnabledRef.current) return
    initAudio()
    if (!audioCtxRef.current) return
    const osc = audioCtxRef.current.createOscillator()
    const gain = audioCtxRef.current.createGain()
    osc.connect(gain)
    gain.connect(audioCtxRef.current.destination)

    switch(type) {
      case 'dice':
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(240, audioCtxRef.current.currentTime)
        osc.frequency.exponentialRampToValueAtTime(70, audioCtxRef.current.currentTime + 0.12)
        gain.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.12)
        osc.start()
        osc.stop(audioCtxRef.current.currentTime + 0.12)
        break
      case 'step':
        osc.type = 'sine'
        osc.frequency.setValueAtTime(460, audioCtxRef.current.currentTime)
        osc.frequency.exponentialRampToValueAtTime(680, audioCtxRef.current.currentTime + 0.08)
        gain.gain.setValueAtTime(0.22, audioCtxRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.08)
        osc.start()
        osc.stop(audioCtxRef.current.currentTime + 0.08)
        break
      case 'capture':
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(360, audioCtxRef.current.currentTime)
        osc.frequency.exponentialRampToValueAtTime(80, audioCtxRef.current.currentTime + 0.25)
        gain.gain.setValueAtTime(0.35, audioCtxRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.25)
        osc.start()
        osc.stop(audioCtxRef.current.currentTime + 0.25)
        break
      case 'home':
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const o = audioCtxRef.current.createOscillator()
          const g = audioCtxRef.current.createGain()
          o.type = 'sine'
          o.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime + idx * 0.08)
          g.gain.setValueAtTime(0.28, audioCtxRef.current.currentTime + idx * 0.08)
          g.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + idx * 0.08 + 0.45)
          o.connect(g)
          g.connect(audioCtxRef.current.destination)
          o.start(audioCtxRef.current.currentTime + idx * 0.08)
          o.stop(audioCtxRef.current.currentTime + idx * 0.08 + 0.45)
        })
        break
      case 'strike':
        osc.type = 'square'
        osc.frequency.setValueAtTime(180, audioCtxRef.current.currentTime)
        gain.gain.setValueAtTime(0.25, audioCtxRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.2)
        osc.start()
        osc.stop(audioCtxRef.current.currentTime + 0.2)
        break
      case 'start':
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
          const o = audioCtxRef.current.createOscillator()
          const g = audioCtxRef.current.createGain()
          o.type = 'triangle'
          o.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime + idx * 0.09)
          g.gain.setValueAtTime(0.22, audioCtxRef.current.currentTime + idx * 0.09)
          g.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + idx * 0.09 + 0.35)
          o.connect(g)
          g.connect(audioCtxRef.current.destination)
          o.start(audioCtxRef.current.currentTime + idx * 0.09)
          o.stop(audioCtxRef.current.currentTime + idx * 0.09 + 0.35)
        })
        break
    }
  }

  // Helper to update pawns UI
  const getCoordinatesForPawn = (pawn) => {
    const pConfig = PLAYER_CONFIGS[pawn.color]
    if (pawn.state === 'BASE') return pConfig.baseSlots[pawn.id]
    if (pawn.state === 'HOME' || pawn.step >= 56) return pConfig.centerGoalCoords
    if (pawn.step <= 50) {
      const globalIdx = (pConfig.startIndex + pawn.step) % 52
      const [r, c] = OUTER_TRACK[globalIdx]
      return { row: r + 0.90, col: c + 0.50 }
    } else {
      const [r, c] = pConfig.homePath[pawn.step - 51]
      return { row: r + 0.90, col: c + 0.50 }
    }
  }

  const updatePawnsUI = () => {
    const state = gameStateRef.current
    const allPawns = []
    state.activeOrder.forEach(color => allPawns.push(...state.pawns[color]))
    const visiblePawns = allPawns.filter(p => p.state !== 'HOME' || p === state.activeMovingPawn)

    const posMap = {}
    visiblePawns.forEach(p => {
      const coords = getCoordinatesForPawn(p)
      const key = `${coords.row.toFixed(2)}_${coords.col.toFixed(2)}`
      if (!posMap[key]) posMap[key] = []
      posMap[key].push(p)
    })

    const movablePawnIds = new Set()
    if (!state.isMoving && state.diceValue !== null && !state.isRolling) {
      const curPlayer = state.activeOrder[state.turnIdx]
      const validMoves = getValidMoves(curPlayer, state.diceValue)
      validMoves.forEach(p => movablePawnIds.add(`${p.color}_${p.id}`))
    }

    const pawnsList = visiblePawns.map(pawn => {
      const coords = getCoordinatesForPawn(pawn)
      const key = `${coords.row.toFixed(2)}_${coords.col.toFixed(2)}`
      const stack = posMap[key] || [pawn]
      const stackIndex = stack.indexOf(pawn)

      const isMovable = movablePawnIds.has(`${pawn.color}_${pawn.id}`)
      const isHopping = (state.activeMovingPawn === pawn)
      const isRewinding = (state.rewindingPawns && state.rewindingPawns.has(pawn))

      let topPct = (coords.row / 15) * 100
      let leftPct = (coords.col / 15) * 100
      let computedZ = Math.round(coords.row * 20) + 10

      if (stack.length > 1 && pawn.state === 'TRACK') {
        const offset = (stackIndex - (stack.length - 1) / 2) * 1.5
        leftPct += offset
        topPct -= offset
        computedZ += (stackIndex + 1) * 4
      }
      if (isMovable) computedZ += 200
      if (isRewinding) computedZ = 998
      if (isHopping) computedZ = 999

      return {
        ...pawn,
        coords,
        topPct,
        leftPct,
        zIndex: computedZ,
        isMovable,
        isHopping,
        isRewinding,
        stackLength: stack.length,
        stackIndex,
        inBase: pawn.state === 'BASE'
      }
    })

    setPawns(pawnsList)

    const counts = { blue: 0, red: 0, green: 0, yellow: 0 }
    state.activeOrder.forEach(color => {
      counts[color] = state.pawns[color].filter(p => p.state === 'HOME').length
    })
    setHomeCounts(counts)
  }

  const getValidMoves = (color, roll) => {
    const state = gameStateRef.current
    return state.pawns[color].filter(p => {
      if (p.state === 'BASE') return roll === 6
      if (p.state === 'TRACK') return p.step + roll <= 56
      return false
    })
  }

  const showToast = (text, badge, icon = '🎯') => {
    setToast({ show: true, text, badge, icon })
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2400)
  }

  const launchConfetti = () => {
    const canvas = confettiCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = []
    const colors = ['#eb2d2d', '#0ea152', '#f5b800', '#0088fe', '#ffffff']
    for (let i = 0; i < 140; i++) {
      const randColor = colors[Math.floor(Math.random() * colors.length)]
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height * 0.5,
        size: Math.random() * 8 + 4,
        color: randColor,
        speedY: Math.random() * 3 + 2,
        speedX: Math.random() * 4 - 2,
        rot: Math.random() * 360
      })
    }
    let frame = 0
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++
      particles.forEach(p => {
        p.y += p.speedY
        p.x += p.speedX
        p.rot += 3
        if (p.y > canvas.height + 20 && frame < 200) {
          p.y = -20
          p.x = Math.random() * canvas.width
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.7)
        ctx.restore()
      })
      if (frame < 260) requestAnimationFrame(render)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    render()
  }

  const stopTurnTimer = () => {
    if (turnTimerIntervalRef.current) {
      clearInterval(turnTimerIntervalRef.current)
      turnTimerIntervalRef.current = null
    }
    turnSecondsLeftRef.current = TURN_TIME_LIMIT
  }

  const startTurnTimer = () => {
    stopTurnTimer()
    const state = gameStateRef.current
    if (state.winner) return
    const curPlayer = state.activeOrder[state.turnIdx]
    if (!curPlayer || state.eliminated[curPlayer]) return

    turnSecondsLeftRef.current = TURN_TIME_LIMIT
    turnTimerIntervalRef.current = setInterval(() => {
      const s = gameStateRef.current
      if (s.isRolling || s.isMoving || s.winner) return
      turnSecondsLeftRef.current -= 0.1
      if (turnSecondsLeftRef.current <= 0) {
        stopTurnTimer()
        onTurnTimeExpired()
      }
    }, 100)
  }

  const onTurnTimeExpired = () => {
    const state = gameStateRef.current
    if (state.isRolling || state.isMoving || state.winner) return
    const curPlayer = state.activeOrder[state.turnIdx]
    if (!curPlayer || state.eliminated[curPlayer]) return

    state.misses[curPlayer] = (state.misses[curPlayer] || 0) + 1
    setChances({ ...state.misses })

    if (state.misses[curPlayer] < 3) {
      playSound('strike')
      showToast(`⚠️ ${PLAYER_NAMES[curPlayer]} missed turn! (${state.misses[curPlayer]}/3)`, 'Chance Lost', '⏳')
      state.diceValue = null
      setTimeout(() => advanceToNextPlayer(), 800)
    } else {
      state.eliminated[curPlayer] = true
      playSound('strike')
      setEliminated({ ...state.eliminated })
      showToast(`🚫 ${PLAYER_NAMES[curPlayer]} is Disqualified!`, 'Game Over', '❌')
      if (!playersRef.current[curPlayer].isBot) {
        setShowDisqualified(true)
      }
      const remaining = state.activeOrder.filter(c => !state.eliminated[c])
      if (remaining.length <= 1) {
        if (remaining.length === 1) declareWinner(remaining[0])
        return
      }
      setTimeout(() => {
        state.diceValue = null
        advanceToNextPlayer()
      }, 1200)
    }
  }

  const advanceToNextPlayer = () => {
    const state = gameStateRef.current
    state.consecutiveSixes = 0
    state.diceValue = null
    const remaining = state.activeOrder.filter(c => !state.eliminated[c])
    if (remaining.length <= 1) {
      if (remaining.length === 1 && !state.winner) declareWinner(remaining[0])
      return
    }

    let nextIdx = (state.turnIdx + 1) % state.activeOrder.length
    let attempts = 0
    while (state.eliminated[state.activeOrder[nextIdx]] && attempts < state.activeOrder.length) {
      nextIdx = (nextIdx + 1) % state.activeOrder.length
      attempts++
    }
    state.turnIdx = nextIdx
    state.canRoll = true
    updateActiveTurnColor()
    updateTurnUI()
    checkBotTurn()
  }

  const updateTurnUI = () => {
    const state = gameStateRef.current
    const curColor = state.activeOrder[state.turnIdx]
    if (!curColor || state.eliminated[curColor]) return
    const p = playersRef.current[curColor]
    if (!p) return

    setTurnDotColor(p.color)
    updateActiveTurnColor()
    const isHuman = !p.isBot
    setTurnText(`${PLAYER_NAMES[curColor]}'s Turn ${isHuman ? '(You)' : '(🤖 Bot)'}`)
    if (!state.diceValue) {
      setTurnHint(isHuman ? 'Click your dice panel to roll!' : 'Bot is rolling...')
    }

    updatePawnsUI()
    startTurnTimer()
  }

  const checkBotTurn = () => {
    const state = gameStateRef.current
    const curPlayer = state.activeOrder[state.turnIdx]
    if (!curPlayer || state.eliminated[curPlayer]) return
    if (playersRef.current[curPlayer].isBot && !state.winner) {
      setTimeout(() => rollDice(curPlayer), 650)
    }
  }

  const animateCaptureReturn = (capturedPawns, onComplete) => {
    if (!capturedPawns || capturedPawns.length === 0) {
      onComplete()
      return
    }

    let completedCount = 0
    const state = gameStateRef.current
    capturedPawns.forEach(oppPawn => {
      state.rewindingPawns.add(oppPawn)
      const totalSteps = Math.max(1, oppPawn.step)
      const stepDuration = Math.max(55, Math.min(85, Math.round(1300 / totalSteps)))

      const rewindInterval = setInterval(() => {
        if (oppPawn.step > 0) {
          oppPawn.step -= 1
          playSound('step')
          updatePawnsUI()
        } else {
          clearInterval(rewindInterval)
          oppPawn.state = 'BASE'
          oppPawn.step = -1
          state.rewindingPawns.delete(oppPawn)
          playSound('step')
          updatePawnsUI()

          completedCount++
          if (completedCount === capturedPawns.length) {
            setTimeout(onComplete, 220)
          }
        }
      }, stepDuration)
    })
  }

  const evaluateLanding = (pawn) => {
    let gotCapture = false
    const capturedPawns = []
    const capturedPlayerNames = []
    const wasSix = (gameStateRef.current.diceValue === 6)
    const state = gameStateRef.current

    if (pawn.state === 'TRACK' && pawn.step <= 50) {
      const myStart = PLAYER_CONFIGS[pawn.color].startIndex
      const myGlobalIdx = (myStart + pawn.step) % 52
      const isSafeCell = SAFE_INDICES.includes(myGlobalIdx)

      if (!isSafeCell) {
        state.activeOrder.forEach(oppColor => {
          if (oppColor !== pawn.color) {
            state.pawns[oppColor].forEach(oppPawn => {
              if (oppPawn.state === 'TRACK' && oppPawn.step <= 50) {
                const oppStart = PLAYER_CONFIGS[oppColor].startIndex
                const oppGlobalIdx = (oppStart + oppPawn.step) % 52
                if (oppGlobalIdx === myGlobalIdx) {
                  capturedPawns.push(oppPawn)
                  gotCapture = true
                  if (!capturedPlayerNames.includes(PLAYER_NAMES[oppColor])) {
                    capturedPlayerNames.push(PLAYER_NAMES[oppColor])
                  }
                }
              }
            })
          }
        })
      }
    }

    updatePawnsUI()

    if (gotCapture) {
      playSound('capture')
      const oppNames = capturedPlayerNames.join(', ')
      showToast(`💥 ${PLAYER_NAMES[pawn.color]} captured ${oppNames}! Extra Turn!`, 'Goti Captured!', '⚔️')
      setTimeout(() => {
        animateCaptureReturn(capturedPawns, () => {
          const hasBonus = wasSix || gotCapture
          finishMove(pawn, hasBonus, gotCapture)
        })
      }, 240)
    } else {
      const hasBonus = wasSix || gotCapture
      setTimeout(() => finishMove(pawn, hasBonus, gotCapture), 300)
    }
  }

  const movePawn = (pawn, steps) => {
    const state = gameStateRef.current
    if (!pawn || state.isMoving || state.winner || state.isRolling) return
    const curPlayer = state.activeOrder[state.turnIdx]
    if (pawn.color !== curPlayer) return

    stopTurnTimer()
    state.isMoving = true
    state.canRoll = false
    state.activeMovingPawn = pawn

    if (pawn.state === 'BASE') {
      pawn.state = 'TRACK'
      pawn.step = 0
      playSound('step')
      updatePawnsUI()
      setTimeout(() => finishMove(pawn, true, false), 350)
      return
    }

    let remaining = steps
    const stepInterval = setInterval(() => {
      pawn.step += 1
      playSound('step')

      if (pawn.step === 56) {
        clearInterval(stepInterval)
        playSound('home')
        pawn.state = 'HOME'
        state.activeMovingPawn = null
        updatePawnsUI()
        const won = checkVictory(pawn.color)
        if (!won) finishMove(pawn, true, false)
        return
      }

      updatePawnsUI()
      remaining--
      if (remaining === 0) {
        clearInterval(stepInterval)
        evaluateLanding(pawn)
      }
    }, 150)
  }

  const finishMove = (pawn, hasBonus, gotCapture = false) => {
    const state = gameStateRef.current
    state.isMoving = false
    state.activeMovingPawn = null
    const wasSix = (state.diceValue === 6)
    state.diceValue = null
    if (state.winner) return

    const curPlayer = state.activeOrder[state.turnIdx]
    if (!curPlayer || state.eliminated[curPlayer]) return

    if (hasBonus) {
      state.misses[curPlayer] = 0
      setChances({ ...state.misses })
      if (gotCapture) {
        setTurnHint('💥 Captured opponent! Bonus Roll!')
      } else if (wasSix) {
        setTurnHint(`🎉 Rolled a 6 (${state.consecutiveSixes}/2)! Roll again!`)
      } else {
        setTurnHint('🎉 Bonus Roll! Roll again!')
      }
      state.canRoll = true
      updateTurnUI()
      checkBotTurn()
    } else {
      state.consecutiveSixes = 0
      state.misses[curPlayer] = 0
      setChances({ ...state.misses })
      advanceToNextPlayer()
    }
  }

  const checkVictory = (color) => {
    const state = gameStateRef.current
    if (state.pawns[color].filter(p => p.state === 'HOME').length === 4) {
      declareWinner(color)
      return true
    }
    return false
  }

  const declareWinner = (color) => {
    const state = gameStateRef.current
    stopTurnTimer()
    state.winner = color
    const isHuman = !playersRef.current[color].isBot
    if (isHuman) {
      setWins(w => {
        const newWins = w + 1
        try { localStorage.setItem('ludo_player_wins_count', newWins.toString()) } catch (_e) { return newWins }
        return newWins
      })
    }

    setVictoryTitle(isHuman ? '🎉 YOU WIN! 🎉' : `💻 ${PLAYER_NAMES[color].toUpperCase()} BOT WINS!`)
    setVictoryColor(PLAYER_COLORS[color])
    setWinnerName(PLAYER_NAMES[color])
    setShowVictory(true)
    launchConfetti()
  }

  const rollDice = (playerColor) => {
    const state = gameStateRef.current
    const curPlayer = state.activeOrder[state.turnIdx]
    if (curPlayer !== playerColor) return
    if (!state.canRoll || state.isRolling || state.isMoving || state.winner) return

    stopTurnTimer()
    state.isRolling = true
    state.canRoll = false
    playSound('dice')

    const cube = document.getElementById(`dice-cube-${curPlayer}`)
    if (cube) cube.classList.add('rolling')

    setTimeout(() => {
      const rollResult = Math.floor(Math.random() * 6) + 1

      if (cube) {
        cube.classList.remove('rolling')
        const rot = { 1: { x: 0, y: 0 }, 6: { x: 0, y: 180 }, 2: { x: 0, y: 90 }, 5: { x: 0, y: -90 }, 3: { x: -90, y: 0 }, 4: { x: 90, y: 0 } }[rollResult]
        cube.style.transform = `rotateX(${rot.x + 720}deg) rotateY(${rot.y + 720}deg)`
      }

      state.diceValue = rollResult
      state.isRolling = false

      if (rollResult === 6) {
        state.consecutiveSixes += 1
      } else {
        state.consecutiveSixes = 0
      }

      if (state.consecutiveSixes >= 3) {
        state.consecutiveSixes = 0
        state.diceValue = null
        state.canRoll = false
        playSound('strike')
        setDiceResult(`Rolled: 6 (3/3 ❌ Turn Over)`)
        setTurnHint(`🚫 3 Consecutive 6s! Turn forfeited.`)
        showToast(`🚫 3 Consecutive 6s! Turn passed to next player.`, '3 Sixes Rule', '⚠️')
        setTimeout(() => {
          setDiceResult('')
          advanceToNextPlayer()
        }, 1000)
        return
      }

      setDiceResult(rollResult === 6 ? `Rolled: 6 (${state.consecutiveSixes}/2 extra)` : `Rolled: ${rollResult}`)

      const validMoves = getValidMoves(curPlayer, rollResult)
      if (validMoves.length === 0) {
        state.consecutiveSixes = 0
        setTurnHint(`No valid moves with a ${rollResult}.`)
        setTimeout(() => {
          setDiceResult('')
          advanceToNextPlayer()
        }, 850)
      } else if (validMoves.length === 1 && playersRef.current[curPlayer].isBot) {
        setTimeout(() => movePawn(validMoves[0], rollResult), 500)
      } else if (validMoves.length === 1 && !playersRef.current[curPlayer].isBot && validMoves[0].state === 'BASE') {
        setTimeout(() => movePawn(validMoves[0], rollResult), 300)
      } else {
        setTurnHint(playersRef.current[curPlayer].isBot 
          ? `${PLAYER_NAMES[curPlayer]} is selecting a move...` 
          : `Click a highlighted pin to move ${rollResult} steps!`)
        updatePawnsUI()
        if (playersRef.current[curPlayer].isBot) {
          setTimeout(() => {
            validMoves.sort((a, b) => b.step - a.step)
            movePawn(validMoves[0], rollResult)
          }, 650)
        } else {
          startTurnTimer()
        }
      }
    }, 600)
  }

  const updateActiveTurnColor = () => {
    const state = gameStateRef.current
    const curColor = state.activeOrder[state.turnIdx]
    if (!curColor || state.eliminated[curColor]) setActiveTurnColor('')
    else setActiveTurnColor(curColor)
  }

  const handleSetGameMode = (mode) => {
    const state = gameStateRef.current
    state.mode = mode
    setGameModeState(mode)

    if (mode === '4p-bots') {
      state.activeOrder = ['blue', 'red', 'green', 'yellow']
      playersRef.current.blue.isBot = false
      playersRef.current.red.isBot = true
      playersRef.current.green.isBot = true
      playersRef.current.yellow.isBot = true
    } else if (mode === '4p-pass') {
      state.activeOrder = ['blue', 'red', 'green', 'yellow']
      playersRef.current.blue.isBot = false
      playersRef.current.red.isBot = false
      playersRef.current.green.isBot = false
      playersRef.current.yellow.isBot = false
    } else if (mode === '2p') {
      state.activeOrder = ['blue', 'green']
      playersRef.current.blue.isBot = false
      playersRef.current.green.isBot = true
    }
    setPlayerRoles({
      blue: playersRef.current.blue.isBot ? '🤖 Bot' : '👤 Human',
      red: playersRef.current.red.isBot ? '🤖 Bot' : '👤 Human',
      green: playersRef.current.green.isBot ? '🤖 Bot' : '👤 Human',
      yellow: playersRef.current.yellow.isBot ? '🤖 Bot' : '👤 Human'
    })
    resetGame()
  }

  const togglePlayerType = (color) => {
    if (!playersRef.current[color]) return
    playersRef.current[color].isBot = !playersRef.current[color].isBot
    setPlayerRoles({
      ...playerRoles,
      [color]: playersRef.current[color].isBot ? '🤖 Bot' : '👤 Human'
    })
    updateTurnUI()
    checkBotTurn()
  }

  const resetGame = () => {
    const state = gameStateRef.current
    stopTurnTimer()
    state.turnIdx = 0
    state.diceValue = null
    state.consecutiveSixes = 0
    state.isRolling = false
    state.isMoving = false
    state.canRoll = true
    state.activeMovingPawn = null
    state.rewindingPawns = new Set()
    state.winner = null
    state.misses = { blue: 0, red: 0, green: 0, yellow: 0 }
    state.eliminated = { blue: false, red: false, green: false, yellow: false }
    state.pawns = {
      blue: [0, 1, 2, 3].map(id => ({ id, color: 'blue', state: 'BASE', step: -1 })),
      red: [0, 1, 2, 3].map(id => ({ id, color: 'red', state: 'BASE', step: -1 })),
      green: [0, 1, 2, 3].map(id => ({ id, color: 'green', state: 'BASE', step: -1 })),
      yellow: [0, 1, 2, 3].map(id => ({ id, color: 'yellow', state: 'BASE', step: -1 }))
    }
    setShowVictory(false)
    setShowDisqualified(false)
    setDiceResult('')
    setChances({ blue: 0, red: 0, green: 0, yellow: 0 })
    setEliminated({ blue: false, red: false, green: false, yellow: false })
    updateActiveTurnColor()
    updateTurnUI()
    checkBotTurn()
  }

  const showAppHomeScreen = () => {
    stopTurnTimer()
    setShowGame(false)
    setShowAppHome(true)
    setShowVictory(false)
    setShowDisqualified(false)
  }

  const launchLudoGame = (mode) => {
    playSound('start')
    setShowAppHome(false)
    setShowGame(true)
    if (mode) {
      handleSetGameMode(mode)
    } else {
      resetGame()
    }
  }

  const initLoader = () => {
    const steps = [
      'Connecting to Game Arena...',
      'Initializing 3D Board Physics...',
      'Arranging Red, Green, Yellow & Blue Pawns...',
      'Calibrating 3D Dice Engine...',
      'Ready to Roll!'
    ]

    let progress = 0
    const interval = setInterval(() => {
      const inc = Math.floor(Math.random() * 8) + 4
      progress = Math.min(100, progress + inc)
      setLoaderProgress(progress)
      const sIdx = Math.min(steps.length - 1, Math.floor(progress / 25))
      setLoaderStatus(steps[sIdx])
      if (progress >= 100) {
        clearInterval(interval)
        setShowEnterBtn(true)
      }
    }, 110)

    const openAppScreen = () => {
      playSound('start')
      setShowLoader(false)
      setTimeout(() => {
        setShowAppHome(true)
      }, 450)
    }

    return openAppScreen
  }

  const getMapPinSvg = (colorKey) => {
    return `
      <svg class="map-pin-svg" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pin-metal-${colorKey}" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="40%" stop-color="#cbd5e1"/>
            <stop offset="100%" stop-color="#94a3b8"/>
          </linearGradient>
          <radialGradient id="pin-core-${colorKey}" cx="35%" cy="32%" r="68%">
            ${colorKey === 'green' ? '<stop offset="0%" stop-color="#4ade80"/><stop offset="60%" stop-color="#16a34a"/><stop offset="100%" stop-color="#052e16"/>' :
              colorKey === 'red' ? '<stop offset="0%" stop-color="#f87171"/><stop offset="60%" stop-color="#dc2626"/><stop offset="100%" stop-color="#450a0a"/>' :
              colorKey === 'yellow' ? '<stop offset="0%" stop-color="#fef08a"/><stop offset="60%" stop-color="#eab308"/><stop offset="100%" stop-color="#451a03"/>' :
              '<stop offset="0%" stop-color="#60a5fa"/><stop offset="60%" stop-color="#0284c7"/><stop offset="100%" stop-color="#082f49"/>'}
          </radialGradient>
        </defs>
        <path d="M 18 2 C 11.37 2 6 7.37 6 14 C 6 22.5 15.2 34.5 18 40.5 C 20.8 34.5 30 22.5 30 14 C 30 7.37 24.63 2 18 2 Z" 
              fill="url(#pin-metal-${colorKey})" stroke="#475569" stroke-width="1.2"/>
        <circle cx="18" cy="14" r="8.2" fill="url(#pin-core-${colorKey})" stroke="rgba(255,255,255,0.4)" stroke-width="0.7"/>
      </svg>
    `
  }

  // Generate board cells once on mount
  const didInitBoard = useRef(false)
  useEffect(() => {
    if (didInitBoard.current) return
    didInitBoard.current = true

    const cells = []
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if ((r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8) || (r >= 6 && r <= 8 && c >= 6 && c <= 8)) continue

        let extraClass = ''
        let content = ''

        if (c === 7 && r >= 1 && r <= 5) extraClass = 'path-green'
        if (r === 7 && c >= 1 && c <= 5) extraClass = 'path-red'
        if (r === 7 && c >= 9 && c <= 13) extraClass = 'path-yellow'
        if (c === 7 && r >= 9 && r <= 13) extraClass = 'path-blue'

        if (r === 6 && c === 1) { extraClass = 'start-red'; content = '<span class="star-icon">☆</span>' }
        if (r === 1 && c === 8) { extraClass = 'start-green'; content = '<span class="star-icon">☆</span>' }
        if (r === 8 && c === 13) { extraClass = 'start-yellow'; content = '<span class="star-icon">☆</span>' }
        if (r === 13 && c === 6) { extraClass = 'start-blue'; content = '<span class="star-icon">☆</span>' }

        if (r === 6 && c === 0) content = '<span class="arrow-sign arrow-red">→</span>'
        if (r === 0 && c === 7) content = '<span class="arrow-sign arrow-green">↓</span>'
        if (r === 7 && c === 14) content = '<span class="arrow-sign arrow-yellow">←</span>'
        if (r === 14 && c === 7) content = '<span class="arrow-sign arrow-blue">↑</span>'

        if ((r === 2 && c === 6) || (r === 8 && c === 2) || (r === 6 && c === 12) || (r === 12 && c === 8)) content = '<span class="star-icon">☆</span>'

        cells.push({
          r, c,
          className: `grid-cell ${extraClass}`,
          style: { gridRow: `${r + 1} / ${r + 2}`, gridColumn: `${c + 1} / ${c + 2}` },
          content
        })
      }
    }
    setBoardCells(cells)
  }, [])

  // Initialize
  useEffect(() => {
    const openAppScreen = initLoader()
    window.openAppScreen = openAppScreen

    const handleDiceRoll = (color, e) => {
      if (e) e.stopPropagation()
      const state = gameStateRef.current
      if (state.activeOrder[state.turnIdx] === color && !playersRef.current[color].isBot) {
        rollDice(color)
      }
    }

    ['red', 'green', 'blue', 'yellow'].forEach(color => {
      const panel = document.getElementById(`dice-panel-${color}`)
      const pCard = document.getElementById(`pcard-${color}`)
      if (panel) panel.onclick = (e) => handleDiceRoll(color, e)
      if (pCard) {
        pCard.onclick = (e) => {
          if (e.target.closest('.station-role-btn')) return
          handleDiceRoll(color, e)
        }
      }
    })

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        const cur = gameStateRef.current.activeOrder[gameStateRef.current.turnIdx]
        if (showGame && !playersRef.current[cur].isBot && gameStateRef.current.canRoll) {
          e.preventDefault()
          rollDice(cur)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    const toggleAudio = () => {
      soundEnabledRef.current = !soundEnabledRef.current
      setSoundEnabled(soundEnabledRef.current)
    }

    const btnAudio = document.getElementById('btn-audio')
    const btnAppSound = document.getElementById('btn-app-sound')
    if (btnAudio) btnAudio.onclick = toggleAudio
    if (btnAppSound) btnAppSound.onclick = toggleAudio

    const openRules = () => setShowRules(true)
    const closeRules = () => setShowRules(false)
    const btnRules = document.getElementById('btn-rules')
    const btnAppRules = document.getElementById('btn-app-rules')
    const btnCloseRules = document.getElementById('btn-close-rules')
    if (btnRules) btnRules.onclick = openRules
    if (btnAppRules) btnAppRules.onclick = openRules
    if (btnCloseRules) btnCloseRules.onclick = closeRules

    const btnBack = document.getElementById('btn-back-to-home')
    if (btnBack) btnBack.onclick = showAppHomeScreen

    const btnVictoryHome = document.getElementById('btn-victory-home')
    if (btnVictoryHome) btnVictoryHome.onclick = showAppHomeScreen

    const btnDisHome = document.getElementById('btn-disqualified-home')
    if (btnDisHome) btnDisHome.onclick = showAppHomeScreen

    const btnReset = document.getElementById('btn-reset')
    const btnPlayAgain = document.getElementById('btn-play-again')
    const btnDisRestart = document.getElementById('btn-disqualified-restart')
    const btnDisSpectate = document.getElementById('btn-disqualified-spectate')
    if (btnReset) btnReset.onclick = resetGame
    if (btnPlayAgain) btnPlayAgain.onclick = resetGame
    if (btnDisRestart) btnDisRestart.onclick = resetGame
    if (btnDisSpectate) {
      btnDisSpectate.onclick = () => {
        setShowDisqualified(false)
        playersRef.current.blue.isBot = true
        setPlayerRoles({ ...playerRoles, blue: '🤖 Bot' })
        updateTurnUI()
        checkBotTurn()
      }
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      stopTurnTimer()
    }
  }, [])

  // Update sound icon
  useEffect(() => {
    const sIcon = document.getElementById('sound-icon')
    const appSIcon = document.getElementById('app-sound-icon')
    const iconText = soundEnabled ? '🔊' : '🔇'
    if (sIcon) sIcon.innerText = iconText
    if (appSIcon) appSIcon.innerText = iconText
  }, [soundEnabled])

  // Update win counter
  useEffect(() => {
    const label = `${wins} WIN${wins > 1 ? 'S' : ''}`
    const disp = document.getElementById('win-count-display')
    if (disp) disp.innerText = `${wins} WIN`
    const appChip = document.getElementById('app-home-wins-chip')
    if (appChip) appChip.innerText = `🏆 ${label}`
    const modalTag = document.getElementById('modal-win-tag')
    if (modalTag) modalTag.innerText = `🏆 ${label}`
  }, [wins])

  return (
    <>
      <canvas id="confetti-canvas" ref={confettiCanvasRef}></canvas>

      {showLoader && (
        <div id="game-loader">
          <div className="loader-ambient ambient-blue"></div>
          <div className="loader-ambient ambient-amber"></div>
          <div className="loader-ambient ambient-green"></div>
          <div className="loader-card">
            <div className="loader-orbit-wrapper">
              <div className="loader-orbit-ring">
                <div className="orbit-pin pin-blue">📍</div>
                <div className="orbit-pin pin-red">📍</div>
                <div className="orbit-pin pin-green">📍</div>
                <div className="orbit-pin pin-yellow">📍</div>
              </div>
              <div className="loader-dice-core">
                <div className="loader-dice-cube">
                  <div className="loader-pip pip-r"></div><div></div><div className="loader-pip pip-b"></div>
                  <div></div><div className="loader-pip pip-y"></div><div></div>
                  <div className="loader-pip pip-g"></div><div></div><div className="loader-pip pip-r"></div>
                </div>
              </div>
            </div>
            <div className="loader-brand">
              <h1 className="loader-title"><span>🎲</span> <span className="title-grad">LUDO KING</span> <span>👑</span></h1>
              <p className="loader-subtitle">4-PLAYER CLASSIC BATTLE</p>
            </div>
            <div className="loader-progress-track">
              <div id="loader-progress-bar" className="loader-progress-fill" style={{ width: `${loaderProgress}%` }}>
                <div className="loader-progress-shine"></div>
              </div>
            </div>
            <div className="loader-status-row">
              <span className="loader-step-text"><span className="spin-icon">⏳</span> <span id="loader-status-text">{loaderStatus}</span></span>
              <span id="loader-percent" className="loader-percent-num">{loaderProgress}%</span>
            </div>
            <div className="loader-action-box">
              {showEnterBtn && (
                <button id="btn-enter-game" className="btn-start-game" onClick={window.openAppScreen}>
                  <span>📱</span> OPEN APP <span>→</span>
                </button>
              )}
            </div>
            <div className="loader-player-strip">
              <div className="p-strip-item"><span className="p-dot dot-blue"></span><span>BLUE</span></div>
              <div className="p-strip-item"><span className="p-dot dot-red"></span><span>RED</span></div>
              <div className="p-strip-item"><span className="p-dot dot-green"></span><span>GREEN</span></div>
              <div className="p-strip-item"><span className="p-dot dot-yellow"></span><span>YELLOW</span></div>
            </div>
          </div>
        </div>
      )}

      {showAppHome && (
        <div id="app-home-screen">
          <header className="app-header">
            <div className="app-logo-box">
              <span className="app-logo-icon">👑</span>
              <div>
                <div className="app-title-main">LUDO KING SUPREME</div>
                <div className="app-subtitle-main">CLASSIC 4-PLAYER BATTLE</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="app-profile-chip" title="Your Profile">
                <span className="app-avatar">🤴</span>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#93c5fd' }}>Blue Master</span>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#fbbf24' }} id="app-home-wins-chip">🏆 {wins} WIN{wins > 1 ? 'S' : ''}</span>
              </div>
              <button className="action-btn" id="btn-app-sound">
                <span id="app-sound-icon">{soundEnabled ? '🔊' : '🔇'}</span>
              </button>
              <button className="action-btn" id="btn-app-rules">
                <span>📖</span> Rules
              </button>
            </div>
          </header>

          <div className="app-hero-card">
            <div className="hero-badge-pill">✨ SEASON 2026 ARENA</div>
            <h2 className="hero-title">LUDO SUPREME CLASH</h2>
            <p className="hero-desc">
              Roll the 3D physics dice, navigate 4 map-pin pawns safely across 8 star zones, strike opponents, and conquer the center victory triangle!
            </p>
            <div className="hero-dice-showcase">
              <div className="hero-pawn-dot" style={{ background: '#0088fe', color: '#93c5fd' }}>📍</div>
              <div className="hero-pawn-dot" style={{ background: '#eb2d2d', color: '#fca5a5' }}>📍</div>
              <span style={{ fontSize: '26px' }}>🎲</span>
              <div className="hero-pawn-dot" style={{ background: '#0ea152', color: '#86efac' }}>📍</div>
              <div className="hero-pawn-dot" style={{ background: '#f5b800', color: '#fef08a' }}>📍</div>
            </div>
            <button className="btn-main-play" id="btn-quick-play" onClick={() => launchLudoGame('4p-bots')}>
              <span>⚡</span> QUICK PLAY (VS BOTS) <span>🎲</span>
            </button>
          </div>

          <div className="app-modes-grid">
            <div className="app-mode-card" id="card-mode-bots" onClick={() => launchLudoGame('4p-bots')}>
              <div className="mode-card-icon">🤖</div>
              <div className="mode-card-title">Vs Computer</div>
              <div className="mode-card-badge">1 Player + 3 AI Bots</div>
              <button className="mode-card-btn">Play Bots 🎲</button>
            </div>
            <div className="app-mode-card" id="card-mode-pass" onClick={() => launchLudoGame('4p-pass')}>
              <div className="mode-card-icon">👥</div>
              <div className="mode-card-title">Pass & Play</div>
              <div className="mode-card-badge">4-Player Local Clash</div>
              <button className="mode-card-btn">Play 4P 🎮</button>
            </div>
            <div className="app-mode-card" id="card-mode-duel" onClick={() => launchLudoGame('2p')}>
              <div className="mode-card-icon">⚔️</div>
              <div className="mode-card-title">2P Speed Duel</div>
              <div className="mode-card-badge">Fast 1v1 Battle</div>
              <button className="mode-card-btn">Play 2P ⚡</button>
            </div>
          </div>

          <div className="app-features-grid">
            <div className="feature-item-card">
              <span className="feature-icon">🎲</span>
              <div className="feature-text-box">
                <span className="feature-title">Realistic 3D Dice</span>
                <span className="feature-desc">Interactive physics-based rolling</span>
              </div>
            </div>
            <div className="feature-item-card">
              <span className="feature-icon">⏱️</span>
              <div className="feature-text-box">
                <span className="feature-title">10s Timer & 3 Strikes</span>
                <span className="feature-desc">Anti-stall disqualification rule</span>
              </div>
            </div>
            <div className="feature-item-card">
              <span className="feature-icon">📍</span>
              <div className="feature-text-box">
                <span className="feature-title">Map-Pin Pawns</span>
                <span className="feature-desc">Smooth hopping & tile stacking</span>
              </div>
            </div>
            <div className="feature-item-card">
              <span className="feature-icon">⭐</span>
              <div className="feature-text-box">
                <span className="feature-title">8 Star Safe Zones</span>
                <span className="feature-desc">Protected checkpoints from capture</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGame && (
        <div className="game-wrapper">
          <div className="toast-notification" id="game-toast" style={{ opacity: toast.show ? 1 : 0, transform: toast.show ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-24px)' }}>
            <span id="toast-icon">{toast.icon}</span>
            <span className="toast-text" id="toast-text">{toast.text}</span>
            <span className="toast-badge" id="toast-badge" style={{ display: toast.badge ? 'inline-block' : 'none' }}>{toast.badge}</span>
          </div>

          <header className="top-bar">
            <div className="top-bar-branding">
              <button className="action-btn" id="btn-back-to-home" style={{ background: 'rgba(245, 184, 0, 0.2)', borderColor: 'rgba(245, 184, 0, 0.5)', color: '#fef08a' }}>
                <span>🏠</span> App Home
              </button>
              <div className="game-title">
                <span>🎲</span> LUDO 4P
              </div>
              <div className="win-counter-badge" id="win-counter-badge" title="Career Wins">
                <span>🏆</span>
                <span id="win-count-display">{wins} WIN</span>
              </div>
            </div>
            <div className="header-btns">
              <button className="action-btn" id="btn-audio">
                <span id="sound-icon">{soundEnabled ? '🔊' : '🔇'}</span> Sound
              </button>
              <button className="action-btn" id="btn-rules">
                <span>📖</span> Rules
              </button>
              <button className="action-btn" id="btn-reset">
                <span>🔄</span> Reset
              </button>
            </div>
          </header>

          <div className="mode-bar">
            <div className="mode-label">
              <span>🎮</span>
              <span>Mode:</span>
            </div>
            <div className="mode-pills">
              <button className={`mode-pill ${gameMode === '4p-bots' ? 'active' : ''}`} onClick={() => handleSetGameMode('4p-bots')}>
                <span>🤖</span> 4P vs Bots
              </button>
              <button className={`mode-pill ${gameMode === '4p-pass' ? 'active' : ''}`} onClick={() => handleSetGameMode('4p-pass')}>
                <span>👥</span> Pass & Play
              </button>
              <button className={`mode-pill ${gameMode === '2p' ? 'active' : ''}`} onClick={() => handleSetGameMode('2p')}>
                <span>⚔️</span> 2P Duel
              </button>
            </div>
          </div>

          <div className="turn-bar">
            <div className="turn-status">
              <div className="turn-indicator" id="turn-dot" style={{ background: turnDotColor, boxShadow: `0 0 14px ${turnDotColor}` }}></div>
              <div>
                <div className="turn-heading" id="turn-text">{turnText}</div>
                <div className="turn-subtext" id="turn-hint">{turnHint}</div>
              </div>
            </div>
            <div id="dice-result-badge" style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24' }}>{diceResult}</div>
          </div>

          <div className="game-arena">
            <div className="arena-top-row">
              <div className={`player-station station-red ${activeTurnColor === 'red' ? 'active-turn' : ''}`} id="pcard-red">
                <div className="station-info">
                  <div className="station-user-row">
                    <span className="station-color-badge badge-red"></span>
                    <span className="station-name" id="pname-red">Red</span>
                  </div>
                  <div className="station-role-btn" id="ptype-red" onClick={() => togglePlayerType('red')}>{playerRoles.red}</div>
                  <div className="station-goal-tag" id="phome-red">🏠 {homeCounts.red}/4 Home</div>
                  <div className="station-chances-row">
                    <span className="chance-label">Chances:</span>
                    <div className="chance-dots">
                      {[0, 1, 2].map(i => (
                        <span key={`red-${i}`} className={`chance-dot ${i < chances.red ? 'missed' : ''}`} id={`dot-red-${i}`}></span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="station-dice-unit" id="dice-panel-red">
                  <div className="dice-top-half" id="dice-box-red">
                    <div className="panel-dice-3d">
                      <div className="panel-dice-cube" id="dice-cube-red">
                        <div className="panel-face pface-1"><div></div><div></div><div></div><div></div><div className="panel-pip"></div><div></div><div></div><div></div><div></div></div>
                        <div className="panel-face pface-6"><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-2"><div className="panel-pip"></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-5"><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-3"><div className="panel-pip"></div><div></div><div></div><div></div><div className="panel-pip"></div><div></div><div></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-4"><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div></div>
                      </div>
                    </div>
                  </div>
                  <div className="dice-bottom-half">
                    <button className="jewel-button-trigger" id="btn-dice-red">
                      <div className="eye-shaped-shell"></div>
                      <svg className="timer-ring-svg" viewBox="0 0 24 24">
                        <circle className="timer-ring-bg" cx="12" cy="12" r="9.5"></circle>
                        <circle className="timer-ring-progress" id="timer-ring-red" cx="12" cy="12" r="9.5"></circle>
                      </svg>
                      <div className="jewel-orb jewel-red"></div>
                    </button>
                    <span className="dice-action-label" id="label-dice-red">WAIT</span>
                  </div>
                </div>
              </div>

              <div className={`player-station station-green ${activeTurnColor === 'green' ? 'active-turn' : ''}`} id="pcard-green">
                <div className="station-info">
                  <div className="station-user-row">
                    <span className="station-color-badge badge-green"></span>
                    <span className="station-name" id="pname-green">Green</span>
                  </div>
                  <div className="station-role-btn" id="ptype-green" onClick={() => togglePlayerType('green')}>{playerRoles.green}</div>
                  <div className="station-goal-tag" id="phome-green">🏠 {homeCounts.green}/4 Home</div>
                  <div className="station-chances-row">
                    <span className="chance-label">Chances:</span>
                    <div className="chance-dots">
                      {[0, 1, 2].map(i => (
                        <span key={`green-${i}`} className={`chance-dot ${i < chances.green ? 'missed' : ''}`} id={`dot-green-${i}`}></span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="station-dice-unit" id="dice-panel-green">
                  <div className="dice-top-half" id="dice-box-green">
                    <div className="panel-dice-3d">
                      <div className="panel-dice-cube" id="dice-cube-green">
                        <div className="panel-face pface-1"><div></div><div></div><div></div><div></div><div className="panel-pip"></div><div></div><div></div><div></div><div></div></div>
                        <div className="panel-face pface-6"><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-2"><div className="panel-pip"></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-5"><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-3"><div className="panel-pip"></div><div></div><div></div><div></div><div className="panel-pip"></div><div></div><div></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-4"><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div></div>
                      </div>
                    </div>
                  </div>
                  <div className="dice-bottom-half">
                    <button className="jewel-button-trigger" id="btn-dice-green">
                      <div className="eye-shaped-shell"></div>
                      <svg className="timer-ring-svg" viewBox="0 0 24 24">
                        <circle className="timer-ring-bg" cx="12" cy="12" r="9.5"></circle>
                        <circle className="timer-ring-progress" id="timer-ring-green" cx="12" cy="12" r="9.5"></circle>
                      </svg>
                      <div className="jewel-orb jewel-green"></div>
                    </button>
                    <span className="dice-action-label" id="label-dice-green">WAIT</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="board-frame">
              <div className="ludo-grid" id="ludo-grid" ref={gridRef}>
                {boardCells.map((cell, idx) => (
                  <div key={idx} className={cell.className} style={cell.style} dangerouslySetInnerHTML={{ __html: cell.content }}></div>
                ))}
              </div>
              <div className="pawns-layer" id="pawns-layer" ref={pawnsLayerRef}>
                {pawns.map((pawn) => {
                  if (pawn.inBase) {
                    return (
                      <div key={`${pawn.color}-${pawn.id}`} className="pawn-container in-base" style={{ position: 'absolute', width: 'clamp(16px, 5vw, 28px)', height: 'clamp(21px, 6.5vw, 36px)', left: '50%', top: '71%', transform: 'translate(-50%, -96%)' }} dangerouslySetInnerHTML={{ __html: getMapPinSvg(pawn.color) }} />
                    )
                  }
                  return (
                    <div key={`${pawn.color}-${pawn.id}`} className={`pawn-container ${pawn.isMovable ? 'movable' : ''} ${pawn.isHopping ? 'pawn-hopping' : ''} ${pawn.isRewinding ? 'pawn-rewinding' : ''}`} style={{ position: 'absolute', width: '7.2%', height: '9.4%', transform: 'translate(-50%, -96%)', top: `${pawn.topPct}%`, left: `${pawn.leftPct}%`, zIndex: pawn.zIndex }} dangerouslySetInnerHTML={{ __html: getMapPinSvg(pawn.color) }} />
                  )
                })}
              </div>
            </div>

            <div className="arena-bottom-row">
              <div className={`player-station station-blue ${activeTurnColor === 'blue' ? 'active-turn' : ''}`} id="pcard-blue">
                <div className="station-info">
                  <div className="station-user-row">
                    <span className="station-color-badge badge-blue"></span>
                    <span className="station-name" id="pname-blue">Blue (You)</span>
                  </div>
                  <div className="station-role-btn" id="ptype-blue" onClick={() => togglePlayerType('blue')}>{playerRoles.blue}</div>
                  <div className="station-goal-tag" id="phome-blue">🏠 {homeCounts.blue}/4 Home</div>
                  <div className="station-chances-row">
                    <span className="chance-label">Chances:</span>
                    <div className="chance-dots">
                      {[0, 1, 2].map(i => (
                        <span key={`blue-${i}`} className={`chance-dot ${i < chances.blue ? 'missed' : ''}`} id={`dot-blue-${i}`}></span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="station-dice-unit" id="dice-panel-blue">
                  <div className="dice-top-half" id="dice-box-blue">
                    <div className="panel-dice-3d">
                      <div className="panel-dice-cube" id="dice-cube-blue">
                        <div className="panel-face pface-1"><div></div><div></div><div></div><div></div><div className="panel-pip"></div><div></div><div></div><div></div><div></div></div>
                        <div className="panel-face pface-6"><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-2"><div className="panel-pip"></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-5"><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-3"><div className="panel-pip"></div><div></div><div></div><div></div><div className="panel-pip"></div><div></div><div></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-4"><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div></div>
                      </div>
                    </div>
                  </div>
                  <div className="dice-bottom-half">
                    <button className="jewel-button-trigger" id="btn-dice-blue">
                      <div className="eye-shaped-shell"></div>
                      <svg className="timer-ring-svg" viewBox="0 0 24 24">
                        <circle className="timer-ring-bg" cx="12" cy="12" r="9.5"></circle>
                        <circle className="timer-ring-progress" id="timer-ring-blue" cx="12" cy="12" r="9.5"></circle>
                      </svg>
                      <div className="jewel-orb jewel-blue"></div>
                    </button>
                    <span className="dice-action-label" id="label-dice-blue">ROLL</span>
                  </div>
                </div>
              </div>

              <div className={`player-station station-yellow ${activeTurnColor === 'yellow' ? 'active-turn' : ''}`} id="pcard-yellow">
                <div className="station-info">
                  <div className="station-user-row">
                    <span className="station-color-badge badge-yellow"></span>
                    <span className="station-name" id="pname-yellow">Yellow</span>
                  </div>
                  <div className="station-role-btn" id="ptype-yellow" onClick={() => togglePlayerType('yellow')}>{playerRoles.yellow}</div>
                  <div className="station-goal-tag" id="phome-yellow">🏠 {homeCounts.yellow}/4 Home</div>
                  <div className="station-chances-row">
                    <span className="chance-label">Chances:</span>
                    <div className="chance-dots">
                      {[0, 1, 2].map(i => (
                        <span key={`yellow-${i}`} className={`chance-dot ${i < chances.yellow ? 'missed' : ''}`} id={`dot-yellow-${i}`}></span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="station-dice-unit" id="dice-panel-yellow">
                  <div className="dice-top-half" id="dice-box-yellow">
                    <div className="panel-dice-3d">
                      <div className="panel-dice-cube" id="dice-cube-yellow">
                        <div className="panel-face pface-1"><div></div><div></div><div></div><div></div><div className="panel-pip"></div><div></div><div></div><div></div><div></div></div>
                        <div className="panel-face pface-6"><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-2"><div className="panel-pip"></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-5"><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-3"><div className="panel-pip"></div><div></div><div></div><div></div><div className="panel-pip"></div><div></div><div></div><div></div><div className="panel-pip"></div></div>
                        <div className="panel-face pface-4"><div className="panel-pip"></div><div></div><div className="panel-pip"></div><div></div><div></div><div></div><div className="panel-pip"></div><div></div><div className="panel-pip"></div></div>
                      </div>
                    </div>
                  </div>
                  <div className="dice-bottom-half">
                    <button className="jewel-button-trigger" id="btn-dice-yellow">
                      <div className="eye-shaped-shell"></div>
                      <svg className="timer-ring-svg" viewBox="0 0 24 24">
                        <circle className="timer-ring-bg" cx="12" cy="12" r="9.5"></circle>
                        <circle className="timer-ring-progress" id="timer-ring-yellow" cx="12" cy="12" r="9.5"></circle>
                      </svg>
                      <div className="jewel-orb jewel-yellow"></div>
                    </button>
                    <span className="dice-action-label" id="label-dice-yellow">WAIT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`modal-overlay ${showRules ? 'show' : ''}`} id="modal-rules">
        <div className="modal-box">
          <h2 className="modal-header">📖 Ludo Rules</h2>
          <div className="modal-content">
            <p>• <strong>Winning Goal:</strong> Navigate all <strong>4 pins</strong> into the center victory triangle to win the game!</p><br />
            <p>• <strong>Unlock:</strong> Roll a <strong>6</strong> to exit the base onto your colored starting track.</p><br />
            <p>• <strong>Movement:</strong> Click any highlighted pin to advance clockwise along the 52-step path.</p><br />
            <p>• <strong>Safe Zones (☆):</strong> Star tiles protect your pins from being captured.</p><br />
            <p>• <strong>Capturing:</strong> Land on an opponent's pin to send it back to base and get a bonus roll!</p><br />
            <p>• <strong>Three 6s Rule:</strong> Rolling 3 consecutive 6s forfeits the 3rd roll and immediately ends your turn!</p><br />
            <p>• <strong>Turn Timer & 3 Chances Rule:</strong> Each player has 10 seconds per turn. If a player fails to play <strong>3 times</strong>, they are eliminated (Disqualified)!</p>
          </div>
          <button className="modal-btn" id="btn-close-rules" onClick={() => setShowRules(false)}>Got It!</button>
        </div>
      </div>

      <div className={`modal-overlay ${showDisqualified ? 'show' : ''}`} id="modal-disqualified">
        <div className="modal-box" style={{ textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <div style={{ fontSize: '40px' }}>🚫</div>
          <div className="victory-rule-tag" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}>⚠️ 3 MISSED TURNS EXCEEDED</div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#ef4444' }}>GAME OVER / OUT</h2>
          <p style={{ color: '#cbd5e1', fontSize: '13.5px', lineHeight: 1.6 }}>
            आपने 3 बार समय पर चाल नहीं चली, इसलिए आप गेम से बाहर हो गए हैं।
            <br /><br />
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>You missed 3 consecutive turn timers and were disqualified.</span>
          </p>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button className="modal-btn" id="btn-disqualified-restart" style={{ flex: 1, background: '#ef4444' }} onClick={resetGame}>🔄 Restart</button>
            <button className="modal-btn" id="btn-disqualified-home" style={{ flex: 1, background: '#334155' }} onClick={showAppHomeScreen}>🏠 App Home</button>
            <button className="modal-btn" id="btn-disqualified-spectate" style={{ flex: 1, background: '#475569' }} onClick={() => { setShowDisqualified(false); playersRef.current.blue.isBot = true; setPlayerRoles({ ...playerRoles, blue: '🤖 Bot' }); updateTurnUI(); checkBotTurn(); }}>👀 Spectate</button>
          </div>
        </div>
      </div>

      <div className={`modal-overlay ${showVictory ? 'show' : ''}`} id="modal-victory">
        <div className="modal-box victory-card" id="victory-card-box">
          <div className="winner-badge-showcase" id="winner-badge-circle" style={{ borderColor: victoryColor }}>
            <div className="winner-pin-preview" id="winner-pin-svg-container" dangerouslySetInnerHTML={{ __html: getMapPinSvg(winnerName.toLowerCase()) }}></div>
            <span className="winner-trophy-mini">🏆</span>
          </div>
          <div className="victory-rule-tag">🏆 ALL 4 PAWNS HOME!</div>
          <h2 className="victory-title-text" id="victory-title" style={{ color: victoryColor }}>{victoryTitle}</h2>
          <div className="modal-win-box">
            <span className="modal-win-label">Total Career Wins:</span>
            <span className="modal-win-tag" id="modal-win-tag">🏆 {wins} WIN</span>
          </div>
          <p className="modal-content" id="victory-msg">Fantastic victory! You successfully navigated all 4 pins to the center!</p>
          <button className="btn-play-again-styled" id="btn-play-again" onClick={resetGame}><span>🔄</span> PLAY AGAIN</button>
          <button className="modal-btn" id="btn-victory-home" style={{ marginTop: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.12)' }} onClick={showAppHomeScreen}><span>🏠</span> Return to App Menu</button>
        </div>
      </div>
    </>
  )
}

export default App