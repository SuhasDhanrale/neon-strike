import React, { useState, useEffect, useRef, useMemo } from 'react';

// Math utilities
const polar = (r, a) => ({ x: r * Math.cos(a), y: r * Math.sin(a) });

// Generates a robust and precise gear tooth path
function createGearPath(N, R) {
    const m = R * 2 / N; // Module
    const Ro = R + m; // Outer radius
    const Ri = R - 1.2 * m; // Inner/Root radius
    const delta = (Math.PI * 2) / N;
    let path = "";

    for (let i = 0; i < N; i++) {
        const angle = i * delta;
        const a1 = angle - 0.2 * delta;
        const a2 = angle - 0.1 * delta;
        const a3 = angle + 0.1 * delta;
        const a4 = angle + 0.2 * delta;
        const aNext = angle + 0.8 * delta;

        const p1 = polar(Ri, a1);
        const p2 = polar(Ro, a2);
        const p3 = polar(Ro, a3);
        const p4 = polar(Ri, a4);
        const pNext = polar(Ri, aNext);

        if (i === 0) path += `M ${p1.x} ${p1.y} `;
        path += `L ${p2.x} ${p2.y} A ${Ro} ${Ro} 0 0 1 ${p3.x} ${p3.y} `;
        path += `L ${p4.x} ${p4.y} A ${Ri} ${Ri} 0 0 1 ${pNext.x} ${pNext.y} `;
    }
    return path + "Z";
}

// Gear Definitions and Layout Topology
const gearsData = [
    { id: 0, key: '1', N: 24, theta: 0, parent: null, color: '#f59e0b' }, // Amber
    { id: 1, key: '2', N: 16, theta: 30, parent: 0, color: '#3b82f6' }, // Blue
    { id: 2, key: '3', N: 32, theta: 150, parent: 0, color: '#ec4899' }, // Pink
    { id: 3, key: '4', N: 12, theta: -45, parent: 1, color: '#10b981' }, // Emerald
    { id: 4, key: '5', N: 20, theta: 270, parent: 0, color: '#8b5cf6' }, // Violet
    { id: 5, key: '6', N: 14, theta: 210, parent: 4, color: '#ef4444' }, // Red
    { id: 6, key: '7', N: 28, theta: 330, parent: 4, color: '#14b8a6' }, // Teal
    { id: 7, key: '8', N: 18, theta: 90, parent: 2, color: '#f97316' }, // Orange
    { id: 8, key: '9', N: 10, theta: 210, parent: 2, color: '#06b6d4' }, // Cyan
    { id: 9, key: '0', N: 22, theta: 0, parent: 7, color: '#eab308' }, // Yellow
    { id: 10, key: '-', N: 16, theta: -45, parent: 9, color: '#6366f1' }, // Indigo
];

function setupGears() {
    const g = JSON.parse(JSON.stringify(gearsData));
    const m = 10;

    g[0].x = 0; g[0].y = 0; g[0].initialRotation = 0;
    g[0].R = (g[0].N * m) / 2; g[0].dir = 1;
    g[0].path = createGearPath(g[0].N, g[0].R);

    for (let i = 1; i < g.length; i++) {
        const parent = g.find(p => p.id === g[i].parent);
        g[i].R = (g[i].N * m) / 2;
        const dist = parent.R + g[i].R;
        const thetaRad = (g[i].theta * Math.PI) / 180;

        g[i].x = parent.x + dist * Math.cos(thetaRad);
        g[i].y = parent.y + dist * Math.sin(thetaRad);
        g[i].initialRotation = g[i].theta + 180 + (180 - (g[i].theta - parent.initialRotation) * parent.N) / g[i].N;
        g[i].dir = -parent.dir;
        g[i].path = createGearPath(g[i].N, g[i].R);
    }
    return g;
}

const bgGears = [
    { id: 'bg1', N: 50, x: -350, y: -250, R: 550, dir: 1 },
    { id: 'bg2', N: 42, x: 450, y: 350, R: 450, dir: -1 },
    { id: 'bg3', N: 64, x: 150, y: -600, R: 700, dir: 1 },
].map(g => ({ ...g, path: createGearPath(g.N, g.R) }));

export default function App() {
    const [activeGears, setActiveGears] = useState(new Set());
    const [showFlash, setShowFlash] = useState(false); // NEW: Controls the shockwave flash
    const [isGlitching, setIsGlitching] = useState(false); // NEW: Controls the mid-way glitch

    const angleRef = useRef(0);
    const speedRef = useRef(0);

    // Refs for direct DOM updates to ensure buttery smooth 60fps animation
    const turbineRef = useRef(null);
    const bgGearsRef = useRef({});
    const frontGearsRef = useRef({});

    const computedGears = useMemo(() => setupGears(), []);

    // Task 3: Pre-calculate forge sparks for performance
    const sparks = useMemo(() => Array.from({ length: 45 }).map((_, i) => ({
        id: i,
        cx: Math.random() * 1100 - 550, // spread across X
        cy: 650 + Math.random() * 200,  // start below the SVG box
        r: Math.random() * 2 + 1,       // size
        delay: Math.random() * -10,     // random start time offset
        duration: Math.random() * 4 + 4,// speed (4s to 8s)
        xDrift: Math.random() * 100 - 50// horizontal sway
    })), []);

    const keyMap = useMemo(() => {
        const map = {};
        gearsData.forEach((g) => { map[g.key] = g.id; });
        return map;
    }, []);

    // Check if all gears are active for Overdrive Mode
    const isOverdrive = activeGears.size === computedGears.length && computedGears.length > 0;

    // Trigger the flash and screen shake when overdrive initiates
    useEffect(() => {
        if (isOverdrive) {
            setShowFlash(true);
            const timer = setTimeout(() => setShowFlash(false), 800);
            return () => clearTimeout(timer);
        }
    }, [isOverdrive]);

    // NEW: Glitch logic when reaching 5+ gears
    useEffect(() => {
        if (isOverdrive || activeGears.size < 5) return;

        // 1. Immediate glitch on activation
        setIsGlitching(true);
        let timeout = setTimeout(() => setIsGlitching(false), 150);

        // 2. Random idle stutter
        const interval = setInterval(() => {
            if (Math.random() > 0.6) { // 40% chance every 1.5s
                setIsGlitching(true);
                setTimeout(() => setIsGlitching(false), 150);
            }
        }, 1500);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [activeGears.size, isOverdrive]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!/^[a-zA-Z0-9-=\[\];,./]$/.test(e.key)) return;
            setActiveGears(prev => {
                const next = new Set(prev);
                if (keyMap[e.key] !== undefined) {
                    next.add(keyMap[e.key]);
                } else {
                    for (let i = 0; i < computedGears.length; i++) {
                        if (!next.has(i)) { next.add(i); break; }
                    }
                }
                return next;
            });
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [computedGears.length, keyMap]);

    useEffect(() => {
        // Overdrive triggers a massive speed multiplier, glitch triggers a short spike
        if (isOverdrive) {
            speedRef.current = 8;
        } else if (isGlitching) {
            speedRef.current = ((activeGears.size / computedGears.length) * 2.5) + 3; // Engine stutter speed spike
        } else {
            speedRef.current = (activeGears.size / computedGears.length) * 2.5;
        }
    }, [activeGears.size, computedGears.length, isOverdrive, isGlitching]);

    useEffect(() => {
        let animationFrame;
        let lastTime = performance.now();
        const loop = (time) => {
            const dt = time - lastTime;
            lastTime = time;

            // Cap dt to prevent massive jumps when switching browser tabs
            const safeDt = Math.min(dt, 50);

            angleRef.current += speedRef.current * (safeDt / 16.66);
            const angle = angleRef.current;

            // 1. Update Turbine Rotation directly in DOM
            if (turbineRef.current) {
                turbineRef.current.setAttribute('transform', `rotate(${angle * 0.02})`);
            }

            // 2. Update Parallax Background Gears
            bgGears.forEach(g => {
                const el = bgGearsRef.current[g.id];
                if (el) el.setAttribute('transform', `translate(${g.x}, ${g.y}) rotate(${g.dir * (angle * 0.08)})`);
            });

            // 3. Update Front Active Gears
            computedGears.forEach(g => {
                const el = frontGearsRef.current[g.id];
                if (el) {
                    const currentRotation = g.initialRotation + g.dir * (angle / g.N * 20);
                    el.setAttribute('transform', `translate(${g.x}, ${g.y}) rotate(${currentRotation})`);
                }
            });

            animationFrame = requestAnimationFrame(loop);
        };
        animationFrame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrame);
    }, [computedGears]);

    return (
        <div className= "relative w-full h-screen bg-[#020617] overflow-hidden font-sans select-none" >
        <style>{`
        @keyframes floatSpark {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          80% { opacity: 0.8; }
          100% { transform: translateY(-1300px) translateX(var(--drift)); opacity: 0; }
        }
        @keyframes powerSurge {
          0%, 100% { transform: translate(0, 0); }
          10%, 30%, 50%, 70%, 90% { transform: translate(-4px, 4px); }
          20%, 40%, 60%, 80% { transform: translate(4px, -4px); }
        }
        @keyframes glitchShake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2px, 2px); }
          50% { transform: translate(2px, -2px); }
          75% { transform: translate(-2px, -2px); }
        }
      `} </style>

{/* Background: Industrial Perforated Metal */ }
<div 
        className="absolute inset-0 opacity-40"
style = {{
    backgroundImage: `radial-gradient(#1e293b 2px, transparent 2px), radial-gradient(#1e293b 2px, transparent 2px)`,
        backgroundSize: '60px 60px',
            backgroundPosition: '0 0, 30px 30px'
}} 
      />

{/* Ambient shadow vignette */ }
<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(2,6,23,0.3)_0%,rgba(0,0,0,0.95)_100%)] pointer-events-none" />

    {/* OVERDRIVE SHOCKWAVE FLASH OVERLAY */ }
    < div
className = {`absolute inset-0 bg-cyan-400 pointer-events-none z-50 mix-blend-overlay ${showFlash ? 'opacity-100 transition-opacity duration-700 ease-out' :
        (isGlitching ? 'opacity-20 transition-opacity duration-75 ease-in' : 'opacity-0 transition-opacity duration-700 ease-out')
    }`} 
      />

{/* Main container with conditional screen shake */ }
<div className={ `w-full h-full flex items-center justify-center ${showFlash ? 'animate-[powerSurge_0.5s_ease-in-out]' : (isGlitching ? 'animate-[glitchShake_0.2s_ease-in-out]' : '')}` }>
    <svg viewBox="-550 -550 1100 1100" className = "w-full h-full max-w-6xl drop-shadow-2xl" >
        <defs>
        {
            computedGears.map(g => (
                <filter id= {`glow-${g.id}`} key = { g.id } >
                    <feGaussianBlur stdDeviation="8" result = "coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /> <feMergeNode in="SourceGraphic" /> </feMerge>
                            </filter>
            ))}
<filter id="glow-spark" >
    <feGaussianBlur stdDeviation="2" result = "coloredBlur" />
        <feMerge><feMergeNode in="coloredBlur" /> <feMergeNode in="SourceGraphic" /> </feMerge>
            </filter>
            </defs>

{/* Task 1: The Reactor Turbine (Deep Background) */ }
<g ref={ turbineRef } transform = {`rotate(${angleRef.current * 0.02})`} opacity = { isOverdrive? 0.3: (isGlitching ? 0.15 : 0.06) } className = {`transition-opacity ${isGlitching ? 'duration-75' : 'duration-1000'}`}>
    <circle cx="0" cy = "0" r = "800" fill = "none" stroke = { isOverdrive? "#06b6d4": (isGlitching ? "#22d3ee" : "#ffffff") } strokeWidth = "20" filter = { isOverdrive || isGlitching ? "url(#glow-spark)" : ""} className = {`transition-colors ${isGlitching ? 'duration-75' : 'duration-1000'}`} />
{
    Array.from({ length: 12 }).map((_, i) => (
        <path 
                key= {`blade-${i}`}
d = "M -40 -100 L -120 -800 A 800 800 0 0 1 120 -800 L 40 -100 Z"
fill = { isOverdrive? "#06b6d4": (isGlitching ? "#22d3ee" : "#ffffff") }
transform = {`rotate(${(i * 360) / 12})`}
className = {`transition-colors ${isGlitching ? 'duration-75' : 'duration-1000'}`}
              />
            ))}
<circle cx="0" cy = "0" r = "120" fill = { isOverdrive? "#06b6d4": (isGlitching ? "#22d3ee" : "#ffffff") } className = {`transition-colors ${isGlitching ? 'duration-75' : 'duration-1000'}`} />
    </g>

{/* Layer: Massive Parallax Background Gears (The Deep Engine) */ }
{
    bgGears.map((g) => (
        <g key= { g.id } ref = { el => bgGearsRef.current[g.id] = el } transform = {`translate(${g.x}, ${g.y}) rotate(${g.dir * (angleRef.current * 0.08)})`}>
            <path d={ g.path } fill = "#000000" fillOpacity = { 0.4} stroke = "#0f172a" strokeWidth = { 3} />
                <circle cx="0" cy = "0" r = { g.R * 0.85 } fill = "none" stroke = "#0f172a" strokeWidth = { 2} opacity = { 0.5} />
                    <circle cx="0" cy = "0" r = { g.R * 0.5 } fill = "none" stroke = "#0f172a" strokeWidth = { 5} opacity = { 0.5} />
                    {
                        [0, 30, 60, 90, 120, 150].map(a => (
                            <line key= { a } x1 = {- g.R * 0.85} y1 = { 0} x2 = { g.R * 0.85 } y2 = { 0} stroke = "#0f172a" strokeWidth = { 4} transform = {`rotate(${a})`} opacity = { 0.5} />
              ))}
</g>
          ))}

{/* Task 2: Energy Conduits / Hydraulic Pipes */ }
{
    computedGears.filter(g => g.parent !== null).map(g => {
        const parent = computedGears.find(p => p.id === g.parent);
        const isActive = activeGears.has(g.id);
        return (
            <g key= {`pipe-${g.id}`
    }>
    {/* Thick dark outer pipe */ }
    < line x1 = { parent.x } y1 = { parent.y } x2 = { g.x } y2 = { g.y } stroke = "#020617" strokeWidth = { 22} strokeLinecap = "round" />
    {/* Metallic casing */ }
    < line x1 = { parent.x } y1 = { parent.y } x2 = { g.x } y2 = { g.y } stroke = "#0f172a" strokeWidth = { 14} strokeLinecap = "round" />
    {/* Glowing fluid/energy inner core */ }
    < line 
                  x1 = { parent.x } y1 = { parent.y } x2 = { g.x } y2 = { g.y } 
                  stroke = { isActive? g.color : '#1e293b'} 
                  strokeWidth = { isActive? 6: 4 } 
                  strokeLinecap = "round"
                  filter = { isActive? `url(#glow-${g.id})` : ''}
className = "transition-all duration-500 ease-in-out"
    />
    </g>
            );
          })}

{/* Front Layer: Active Interconnected Gears */ }
{
    computedGears.map((g) => {
        const isActive = activeGears.has(g.id);
        const currentRotation = g.initialRotation + g.dir * (angleRef.current / g.N * 20);
        const m = 10;

        return (
            <g key= { g.id } ref = { el => frontGearsRef.current[g.id] = el } transform = {`translate(${g.x}, ${g.y}) rotate(${currentRotation})`
    }>
    { isActive && (
        <path d={ g.path } fill = "none" stroke = { g.color } strokeWidth = { 4} filter = {`url(#glow-${g.id})`} opacity = { 0.4} />
                )}
<path d={ g.path } fill = { isActive? g.color : '#0f172a'} fillOpacity = { isActive? 0.15: 1 } stroke = { isActive? g.color : '#334155'} strokeWidth = { 1.5} className = "transition-colors duration-300" />

{
    g.N >= 16 ? (
        <>
        <circle cx= "0" cy="0" r={ g.R * 0.7 } fill="none" stroke={ isActive? g.color : '#334155'} strokeWidth={ m * 0.4} opacity={ isActive? 0.8: 1 } className="transition-colors duration-300" />
        {
            [0, 60, 120].map(a => (
                <line key= { a } x1 = {- g.R * 0.7} y1={ 0} x2={ g.R * 0.7 } y2={ 0} stroke={ isActive? g.color : '#334155'} strokeWidth={ m * 0.5} transform={`rotate(${a})`
} opacity = { isActive? 0.8: 1 } className = "transition-colors duration-300" />
                    ))}
<circle cx="0" cy = "0" r = { g.R * 0.4 } fill = "none" stroke = { isActive? g.color : '#334155'} strokeWidth = { 1} className = "transition-colors duration-300" />
    </>
                ) : (
    <circle cx= "0" cy = "0" r = { g.R * 0.5 } fill = "none" stroke = { isActive? g.color : '#334155'} strokeWidth = { 1} opacity = { isActive? 0.8: 1 } className = "transition-colors duration-300" />
                )}

<circle cx="0" cy = "0" r = { m * 1.2} fill = { isActive? g.color : '#1e293b'} stroke = { isActive? '#ffffff': '#334155' } strokeWidth = { 1.5} filter = { isActive? `url(#glow-${g.id})` : ''} className = "transition-colors duration-300" />
    <circle cx="0" cy = "0" r = { m * 0.5} fill = "#020617" />
        </g>
            );
          })}

{/* Task 3: Foreground Forge Sparks */ }
{
    sparks.map(s => (
        <circle 
              key= {`spark-${s.id}`}
cx = { s.cx }
cy = { s.cy }
r = { s.r }
fill = { isOverdrive? "#22d3ee": (isGlitching ? "#38bdf8" : "#fbbf24") } /* Turns Cyan plasma in overdrive/glitch */
className = {`transition-colors ${isGlitching ? 'duration-75' : 'duration-1000'}`}
style = {{
    animation: `floatSpark ${isOverdrive ? s.duration * 0.35 : (isGlitching ? s.duration * 0.7 : s.duration)}s linear ${s.delay}s infinite`,
        '--drift': `${isOverdrive ? s.xDrift * 3 : s.xDrift}px`,
            filter: 'url(#glow-spark)'
}}
            />
          ))}

</svg>
    </div>
    </div>
  );
}