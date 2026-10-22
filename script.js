'use strict';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d', { alpha: false });

let width;
let height;
let pixelRatio;
let scale;
let textPoints = [];
let particles = [];
let startTime = performance.now();
let lastFrameTime = startTime;

const TAU = Math.PI * 2;
const random = (min, max) => min + Math.random() * (max - min);
const mix = (start, end, amount) => start + (end - start) * amount;

function heart(angle) {
    return {
        x: 16 * Math.pow(Math.sin(angle), 3),
        y: -(
            13 * Math.cos(angle) -
            5 * Math.cos(2 * angle) -
            2 * Math.cos(3 * angle) -
            Math.cos(4 * angle)
        ),
    };
}

function resize() {
    width = innerWidth;
    height = innerHeight;
    pixelRatio = Math.min(devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    scale = Math.min(width * 0.2, height * 0.17, 190) / 16;
    makeText();

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
}

function makeText() {
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 700;
    textCanvas.height = 350;

    const textContext = textCanvas.getContext('2d');
    textContext.fillStyle = '#fff';
    textContext.textAlign = 'center';
    textContext.font = 'bold 91px monospace';
    textContext.fillText('I LOVE', 350, 135);
    textContext.fillText('YOU', 350, 258);

    const pixels = textContext.getImageData(0, 0, 700, 350).data;
    const textScale = Math.min((width * 0.66) / 540, (height * 0.32) / 240, 1);
    textPoints = [];

    for (let y = 30; y < 290; y += 3) {
        for (let x = 60; x < 640; x += 3) {
            const alpha = pixels[(y * 700 + x) * 4 + 3];

            if (alpha > 100) {
                textPoints.push({
                    x: (x - 350) * textScale,
                    y: (y - 174) * textScale,
                });
            }
        }
    }
}

function reset() {
    startTime = performance.now();
    particles = [];

    for (let i = 0; i < 1400; i++) {
        const angle = random(0, TAU);
        const radius = random(0, Math.max(width, height) * 0.7);

        particles.push({
            x: width / 2 + Math.cos(angle) * radius,
            y: height / 2 + Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
            t: random(0, TAU),
            layer: Math.pow(Math.random(), 0.28),
            phase: random(0, TAU),
            speed: random(0.55, 1.3),
            hue: random(338, 355),
            size: random(0.35, 0.95),
            text: Math.floor(random(0, textPoints.length)),
            trail: [],
        });
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
}

const fireworks = [];
let nextFirework = 0;
let fireworksActive = false;

function burst(x, y) {
    const count = 85;
    const hue = random(330, 360);

    for (let i = 0; i < count; i++) {
        const angle = (TAU * i) / count + random(-0.06, 0.06);
        const velocity = random(1.4, 4.5);

        fireworks.push({
            x,
            y,
            px: x,
            py: y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            life: random(42, 78),
            max: 78,
            hue: hue + random(-20, 18),
            size: random(0.7, 1.8),
        });
    }
}

function drawFireworks(now, delta) {
    if (now > nextFirework) {
        burst(random(width * 0.12, width * 0.88), random(height * 0.12, height * 0.82));
        nextFirework = now + random(450, 950);
    }

    ctx.globalCompositeOperation = 'lighter';

    for (let i = fireworks.length - 1; i >= 0; i--) {
        const particle = fireworks[i];
        particle.px = particle.x;
        particle.py = particle.y;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vx *= Math.pow(0.984, delta);
        particle.vy += 0.025 * delta;
        particle.life -= delta;

        const alpha = Math.max(0, Math.min(1, particle.life / 45));
        ctx.strokeStyle = `hsla(${particle.hue}, 100%, 70%, ${alpha})`;
        ctx.lineWidth = particle.size * alpha;
        ctx.beginPath();
        ctx.moveTo(particle.px, particle.py);
        ctx.lineTo(particle.x, particle.y);
        ctx.stroke();

        if (particle.life <= 0) {
            fireworks.splice(i, 1);
        }
    }
}

function frame(now) {
    const delta = Math.min((now - lastFrameTime) / 16.667, 2);
    lastFrameTime = now;

    const time = (now - startTime) / 1000;
    const cycle = time % 19;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.17)';
    ctx.fillRect(0, 0, width, height);

    let morph =
        cycle < 6.4
            ? 0
            : cycle < 8
              ? (cycle - 6.4) / 1.6
              : cycle < 11.8
                ? 1
                : cycle < 13.4
                  ? 1 - (cycle - 11.8) / 1.6
                  : 0;
    morph = morph * morph * (3 - 2 * morph);

    let grow = cycle < 2.5 ? mix(0.08, 1, Math.min(cycle / 2.5, 1)) : 1;

    if (cycle > 16) {
        grow = mix(1, 0.06, Math.min((cycle - 16) / 2.1, 1));
    }

    const beat = 1 + 0.075 * Math.sin(time * 3.6) + 0.025 * Math.sin(time * 7.2);
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        particle.t += 0.004 * particle.speed * delta;

        const heartPosition = heart(particle.t);
        const layer = particle.layer * (0.94 + 0.06 * Math.sin(time + particle.phase));
        const heartX = heartPosition.x * scale * layer * beat * grow;
        const heartY = (heartPosition.y + 1.5) * scale * layer * beat * grow;
        const textPoint = textPoints[particle.text % textPoints.length];
        const jitter = 1.8 * Math.sin(time * 2 + particle.phase);

        let targetX = centerX + mix(heartX, textPoint.x + jitter, morph);
        let targetY =
            centerY + mix(heartY, textPoint.y + Math.cos(time * 2 + particle.phase) * 2, morph);

        if (cycle < 0.8) {
            const scatter = (0.8 - cycle) / 0.8;
            targetX += Math.sin(particle.phase) * width * scatter;
            targetY += Math.cos(particle.phase) * height * scatter;
        }

        const previousX = particle.x;
        const previousY = particle.y;
        const force = 0.009 + 0.009 * particle.speed;

        particle.vx =
            (particle.vx + (targetX - particle.x) * force * delta) *
            Math.pow(0.84, delta);
        particle.vy =
            (particle.vy + (targetY - particle.y) * force * delta) *
            Math.pow(0.84, delta);
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;

        ctx.lineWidth = particle.size * (1 + morph * 1.25);
        ctx.strokeStyle = `hsla(${particle.hue}, 100%, ${random(40, 59)}%, ${
            0.2 + particle.layer * 0.2 + morph * 0.38
        })`;
        ctx.beginPath();
        ctx.moveTo(previousX, previousY);
        ctx.lineTo(particle.x, particle.y);
        ctx.stroke();

        if (i % 5 === 0) {
            ctx.fillStyle =
                morph > 0.5 ? 'rgba(255, 135, 185, 0.9)' : 'rgba(255, 20, 72, 0.48)';
            ctx.fillRect(particle.x, particle.y, 0.9, 0.9);
        }
    }

    const showFireworks = cycle >= 8 && cycle < 11.8;

    if (showFireworks) {
        if (!fireworksActive) {
            fireworksActive = true;
            nextFirework = 0;
        }

        drawFireworks(now, delta);
    } else if (fireworksActive) {
        fireworksActive = false;
        fireworks.length = 0;
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
}

addEventListener('resize', resize);
canvas.addEventListener('pointerdown', (event) => {
    if (fireworksActive) {
        burst(event.clientX, event.clientY);
    }
});

addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        event.preventDefault();
        reset();
    }
});

resize();
reset();
requestAnimationFrame(frame);
