const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
});

const MAX_PARTICLES = 300;
const particles: Particle[] = [];

class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    life: number;
    maxLife: number;
    parent: Particle | null;

    constructor(x: number, y: number, parent: Particle | null = null) {
        this.x = x;
        this.y = y;
        this.parent = parent;

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

    update() {
        this.life--;
        this.x += this.vx;
        this.y += this.vy;

        const dx = this.x - width / 2;
        const dy = this.y - height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 10) {
            const pullForce = 0.002;
            const swirlForce = 0.015;
            // A gentle force pulling towards the center to keep it contained
            this.vx -= (dx / dist) * pullForce;
            this.vy -= (dy / dist) * pullForce;
            // A rotational force to create a swirl
            this.vx += (-dy / dist) * swirlForce;
            this.vy += (dx / dist) * swirlForce;
        }

        // Dampen velocity
        this.vx *= 0.99;
        this.vy *= 0.99;
    }

    draw() {
        ctx.beginPath();
        const lifeRatio = Math.max(0, this.life / this.maxLife);
        // Hue from autumn tones (30) to vibrant green (120) based on life
        const hue = 30 + lifeRatio * 90;

        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 3);
        const opacity = lifeRatio * 0.8 + 0.2;
        const coreColor = `hsla(${hue}, 100%, 85%, ${opacity})`;
        const mainColor = `hsla(${hue}, 100%, 70%, ${opacity})`;
        const glowColor = `hsla(${hue}, 100%, 70%, 0)`;

        gradient.addColorStop(0, coreColor);
        gradient.addColorStop(0.3, mainColor);
        gradient.addColorStop(1, glowColor);

        ctx.fillStyle = gradient;
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function init() {
    particles.push(new Particle(width / 2, height / 2));
}

function grow() {
    if (particles.length < MAX_PARTICLES && Math.random() < 0.7) {
        const parentIndex = Math.floor(Math.random() * particles.length);
        const parent = particles[parentIndex];
        
        if (parent && parent.life > 50) { // Only grow from healthy parents
            const newX = parent.x + (Math.random() - 0.5) * 5;
            const newY = parent.y + (Math.random() - 0.5) * 5;
            
            particles.push(new Particle(newX, newY, parent));
        }
    }
}

let frameCount = 0;

function animate() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 5, 16, 0.15)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.globalCompositeOperation = 'lighter';

    particles.forEach(p => {
        if (p.parent) {
            ctx.beginPath();
            ctx.moveTo(p.parent.x, p.parent.y);
            ctx.lineTo(p.x, p.y);
            
            const lifeRatio = Math.max(0, p.life / p.maxLife);
            const hue = 30 + lifeRatio * 90;
            ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.15)`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
        }
    });

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        
        if (p.life <= 0) {
             if (i > 0) { // Don't remove the root
                particles.splice(i, 1);
             }
        }
    }
    
    if (frameCount % 2 === 0) {
        grow();
    }
    
    frameCount++;
    requestAnimationFrame(animate);
}

init();
animate();