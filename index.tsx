

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
const startOverlay = document.getElementById('start-overlay');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
});

// --- Audio Setup ---
let audioCtx: AudioContext;
let noiseNode: AudioBufferSourceNode;
let gainNode: GainNode;
let audioInitialized = false;

function initAudio() {
    if (audioInitialized) return;
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create white noise buffer
    const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    // Create a source node for the noise
    noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;
    
    // Create a gain node to control volume
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

    // Connect nodes and start
    noiseNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noiseNode.start();
    
    audioInitialized = true;
}

if (startOverlay) {
    startOverlay.addEventListener('click', () => {
        initAudio();
        startOverlay.style.opacity = '0';
        setTimeout(() => startOverlay.style.display = 'none', 500);
    }, { once: true });
}


// --- Particle System ---
const MAX_PARTICLES = 300;
const particles: Particle[] = [];
let systemActivity = 0; // A smoothed value from 0 to 1 representing overall system load

class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    life: number;
    maxLife: number;
    parent: Particle | null;
    pulseAngle: number;
    pulseSpeed: number;
    targetPulseAmount: number;
    currentPulseAmount: number;
    history: { x: number, y: number }[] = [];

    constructor(x: number, y: number, parent: Particle | null = null) {
        this.x = x;
        this.y = y;
        this.parent = parent;
        this.pulseAngle = Math.random() * Math.PI * 2;
        this.targetPulseAmount = 0;
        this.currentPulseAmount = 0;

        if (parent) {
            const angle = Math.atan2(parent.vy, parent.vx) + (Math.random() - 0.5) * 0.9;
            this.vx = Math.cos(angle) * 0.7;
            this.vy = Math.sin(angle) * 0.7;
        } else {
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
        }

        this.radius = Math.random() * 1.5 + 1;
        this.life = Math.random() * 200 + 250;
        this.maxLife = this.life;
    }

    update(heartbeat: number) {
        this.life--;

        // Phantom node trails
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 15) {
            this.history.shift();
        }

        this.x += this.vx;
        this.y += this.vy;

        const dx = this.x - width / 2;
        const dy = this.y - height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 10) {
            const pullForce = 0.002;
            const swirlForce = 0.015;
            this.vx -= (dx / dist) * pullForce;
            this.vy -= (dy / dist) * pullForce;
            this.vx += (-dy / dist) * swirlForce;
            this.vy += (dx / dist) * swirlForce;
        }

        this.vx *= 0.99;
        this.vy *= 0.99;

        // Feedback loop: movement drives pulse speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.pulseSpeed = speed * 0.05;
        this.pulseAngle += this.pulseSpeed + 0.01;
        
        // Rhythmic system heartbeat
        this.targetPulseAmount = ((Math.sin(this.pulseAngle) + 1) / 2) * 0.6 + heartbeat * 0.4;

        // Temporal Distortion / Buffering: eased value
        this.currentPulseAmount += (this.targetPulseAmount - this.currentPulseAmount) * 0.1;
    }

    draw(shimmer: number) {
        ctx.beginPath();
        const lifeRatio = Math.max(0, this.life / this.maxLife);
        const hue = 15 + lifeRatio * 105;

        const currentRadius = this.radius * (1 + this.currentPulseAmount * 0.6);
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, currentRadius * 3);
        
        // Cyclical shimmer
        const opacity = (lifeRatio * 0.8 + 0.2) * (0.8 + shimmer * 0.2);
        
        const coreColor = `hsla(${hue}, 100%, 95%, ${opacity})`;
        const mainColor = `hsla(${hue}, 100%, 70%, ${opacity})`;
        const glowColor = `hsla(${hue}, 100%, 70%, 0)`;

        gradient.addColorStop(0, coreColor);
        gradient.addColorStop(0.3, mainColor);
        gradient.addColorStop(1, glowColor);

        ctx.fillStyle = gradient;
        ctx.arc(this.x, this.y, currentRadius * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawPhantoms(shimmer: number) {
        this.history.forEach((pos, index) => {
            const ageRatio = index / this.history.length;
            const radius = this.radius * ageRatio * 1.2;
            // Phantoms are faint and affected by shimmer
            const opacity = (1 - ageRatio) * 0.2 * (this.life / this.maxLife) * (0.5 + shimmer * 0.5);
            
            // Use a cool, shimmering color for phantoms
            const hue = 200 + shimmer * 30; 
            ctx.fillStyle = `hsla(${hue}, 100%, 85%, ${opacity})`;
    
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

function init() {
    particles.push(new Particle(width / 2, height / 2));
}

function grow() {
    if (particles.length < MAX_PARTICLES && Math.random() < 0.7) {
        const parentIndex = Math.floor(Math.random() * particles.length);
        const parent = particles[parentIndex];
        
        if (parent && parent.life > 50) {
            const newX = parent.x + (Math.random() - 0.5) * 5;
            const newY = parent.y + (Math.random() - 0.5) * 5;
            
            particles.push(new Particle(newX, newY, parent));
        }
    }
}

let frameCount = 0;

function animate() {
    const now = performance.now();
    const heartbeat = (Math.sin(now * 0.0008) + 1) / 2; // Slower, rhythmic pulse for "heartbeat"
    const shimmer = (Math.sin(now * 0.002) + 1) / 2;   // Faster, shimmering effect

    ctx.globalCompositeOperation = 'source-over';
    
    const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.8);
    const hue = 40 + systemActivity * 140; 
    const lightness = 20 + systemActivity * 10;
    const midColor = `hsla(${hue}, 50%, ${lightness}%, 0.15)`;
    bgGradient.addColorStop(0, midColor);
    bgGradient.addColorStop(1, 'rgba(0, 5, 16, 0.1)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.globalCompositeOperation = 'lighter';

    let totalActivity = 0;

    // Draw secondary "corrective" network
    if (particles.length > 1) {
        const core = particles[0];
        // Sort particles by speed to find most active
        const activeParticles = particles.slice(1)
            .sort((a, b) => (Math.sqrt(b.vx*b.vx + b.vy*b.vy)) - (Math.sqrt(a.vx*a.vx + a.vy*a.vy)))
            .slice(0, 15); // Connect to top 15 active
        
        activeParticles.forEach(p => {
            ctx.beginPath();
            ctx.moveTo(core.x, core.y);
            ctx.lineTo(p.x, p.y);
            const opacity = 0.15 + heartbeat * 0.2;
            ctx.strokeStyle = `hsla(190, 100%, 60%, ${opacity})`; // Darker, cooler color
            ctx.lineWidth = 0.4;
            ctx.stroke();
        });
    }

    particles.forEach(p => {
        if (p.parent) {
            ctx.beginPath();
            ctx.moveTo(p.parent.x, p.parent.y);
            ctx.lineTo(p.x, p.y);
            
            const opacity = 0.1 + p.currentPulseAmount * 0.2;
            ctx.strokeStyle = `hsla(180, 100%, 70%, ${opacity * (0.8 + shimmer * 0.2)})`;
             // Dynamic "flow" effect
            ctx.lineWidth = 0.5 + p.currentPulseAmount * 0.8;
            ctx.stroke();
        }
    });

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(heartbeat);
        p.drawPhantoms(shimmer);
        p.draw(shimmer);
        
        totalActivity += Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        
        if (p.life <= 0) {
             if (i > 0) {
                particles.splice(i, 1);
             }
        }
    }
    
    // Draw amplified central core bloom
    if (particles.length > 0) {
        const core = particles[0];
        const bloomRadius = 40 + core.currentPulseAmount * 25; // Amplified
        const bloomGradient = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, bloomRadius);
        const bloomOpacity = 0.15 + core.currentPulseAmount * 0.2;
        bloomGradient.addColorStop(0, `hsla(180, 100%, 80%, ${bloomOpacity})`);
        bloomGradient.addColorStop(1, 'hsla(180, 100%, 80%, 0)');
        ctx.fillStyle = bloomGradient;
        ctx.beginPath();
        ctx.arc(core.x, core.y, bloomRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    if (frameCount % 2 === 0) {
        grow();
    }

    const targetActivity = Math.min(1, (totalActivity / particles.length) / 2.5);
    systemActivity += (targetActivity - systemActivity) * 0.02;
    
    if (audioInitialized) {
        const targetGain = Math.min(0.05, systemActivity * 0.03);
        gainNode.gain.linearRampToValueAtTime(targetGain, audioCtx.currentTime + 0.1);

        const targetPlaybackRate = 1.0 + systemActivity * 0.4;
        noiseNode.playbackRate.linearRampToValueAtTime(targetPlaybackRate, audioCtx.currentTime + 0.1);
    }

    frameCount++;
    requestAnimationFrame(animate);
}

init();
animate();