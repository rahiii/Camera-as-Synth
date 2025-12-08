// Optical Flow Canvas Animation
const flowCanvas = document.getElementById('flow-canvas');
if (flowCanvas) {
    const ctx = flowCanvas.getContext('2d');
    flowCanvas.width = window.innerWidth;
    flowCanvas.height = window.innerHeight;
    
    let particles = [];
    const particleCount = 80;
    
    class Particle {
        constructor() {
            this.reset();
            this.y = Math.random() * flowCanvas.height;
        }
        
        reset() {
            this.x = Math.random() * flowCanvas.width;
            this.y = Math.random() * flowCanvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.life = Math.random();
            this.decay = Math.random() * 0.005 + 0.002;
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life -= this.decay;
            
            if (this.life <= 0 || this.x < 0 || this.x > flowCanvas.width || 
                this.y < 0 || this.y > flowCanvas.height) {
                this.reset();
            }
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 217, 255, ${this.life * 0.6})`;
            ctx.fill();
        }
    }
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    // Draw flow lines
    function drawFlow() {
        ctx.clearRect(0, 0, flowCanvas.width, flowCanvas.height);
        
        // Draw particles
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        // Draw flow lines between nearby particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 217, 255, ${(1 - distance / 120) * 0.15})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        
        requestAnimationFrame(drawFlow);
    }
    
    drawFlow();
    
    window.addEventListener('resize', () => {
        flowCanvas.width = window.innerWidth;
        flowCanvas.height = window.innerHeight;
    });
}

// Flow particles around upload icon
function createFlowParticles() {
    const container = document.getElementById('flow-particles');
    if (!container) return;
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'flow-particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 4}s`;
        container.appendChild(particle);
    }
}

createFlowParticles();

// Custom Cursor
let cursor = document.querySelector('.cursor');
let cursorFollower = document.querySelector('.cursor-follower');

if (cursor && cursorFollower && window.innerWidth > 768) {
    let mouseX = 0;
    let mouseY = 0;
    let followerX = 0;
    let followerY = 0;
    let trail = [];

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
        
        // Add to trail
        trail.push({ x: mouseX, y: mouseY });
        if (trail.length > 5) trail.shift();
    });

    function animateFollower() {
        followerX += (mouseX - followerX) * 0.15;
        followerY += (mouseY - followerY) * 0.15;
        
        cursorFollower.style.left = followerX + 'px';
        cursorFollower.style.top = followerY + 'px';
        
        requestAnimationFrame(animateFollower);
    }
    animateFollower();

    // Cursor interactions
    document.querySelectorAll('a, button, label').forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1.3)';
        });
        el.addEventListener('mouseleave', () => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    });
}

// Option switching
function switchOption(option) {
    // Update tabs
    document.querySelectorAll('.option-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.option-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (option === 'upload') {
        document.querySelector('.option-tab:first-child').classList.add('active');
        document.getElementById('upload-option').classList.add('active');
    } else {
        document.querySelector('.option-tab:last-child').classList.add('active');
        document.getElementById('samples-option').classList.add('active');
        loadSamples();
    }
}

// Load sample videos
async function loadSamples() {
    const samplesGrid = document.getElementById('samples-grid');
    if (!samplesGrid || samplesGrid.dataset.loaded === 'true') return;
    
    try {
        const response = await fetch('/samples');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Response is not JSON");
        }
        const data = await response.json();
        
        if (data.samples && data.samples.length > 0) {
            samplesGrid.innerHTML = '';
            data.samples.forEach(sample => {
                const card = document.createElement('div');
                card.className = 'sample-card';
                card.innerHTML = `
                    <div class="sample-card-title">${sample.name}</div>
                    <div class="sample-card-preview">
                        <video preload="metadata" muted>
                            <source src="/sample_preview/${encodeURIComponent(sample.filename)}" type="video/mp4">
                        </video>
                    </div>
                    <button class="sample-card-btn" onclick="processSample('${sample.filename}')">
                        Process This Video
                    </button>
                `;
                samplesGrid.appendChild(card);
                
                // Add hover preview
                const video = card.querySelector('video');
                card.addEventListener('mouseenter', () => {
                    video.play().catch(() => {});
                });
                card.addEventListener('mouseleave', () => {
                    video.pause();
                    video.currentTime = 0;
                });
            });
            samplesGrid.dataset.loaded = 'true';
        } else {
            samplesGrid.innerHTML = '<div class="samples-loading">No sample videos available</div>';
        }
    } catch (error) {
        samplesGrid.innerHTML = '<div class="samples-loading">Error loading samples</div>';
    }
}

// Process sample video
async function processSample(filename) {
    const mainContent = document.getElementById('main-content');
    mainContent.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
    mainContent.style.opacity = '0';
    mainContent.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        mainContent.style.display = 'none';
        showProgress();
    }, 400);
    
    try {
        const response = await fetch('/process_sample', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename: filename })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
        }
        const data = await response.json();
        
        if (data.success) {
            hideProgress();
            showResult(data.output_id, data.spectrogram_filename, data.message);
        } else {
            hideProgress();
            mainContent.style.display = 'block';
            mainContent.style.opacity = '1';
            mainContent.style.transform = 'translateY(0)';
            document.getElementById('upload-status').textContent = 'Error: ' + data.error;
            document.getElementById('upload-status').className = 'status error';
        }
    } catch (error) {
        hideProgress();
        mainContent.style.display = 'block';
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';
        document.getElementById('upload-status').textContent = 'Error: ' + error.message;
        document.getElementById('upload-status').className = 'status error';
    }
}

// File upload handling
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const uploadPreview = document.getElementById('upload-preview');
const uploadVideoPreview = document.getElementById('upload-video-preview');

// Store the current file reference
let currentFile = null;

uploadArea.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        currentFile = file;
        handleFile(file);
    }
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        currentFile = file;
        handleFile(file);
    } else {
        document.getElementById('upload-status').textContent = 'Please drop a video file';
        document.getElementById('upload-status').className = 'status error';
    }
});

function handleFile(file) {
    const url = URL.createObjectURL(file);
    uploadVideoPreview.src = url;
    uploadPreview.style.display = 'block';
    uploadArea.style.display = 'none';
    
    // Animate preview in
    uploadPreview.style.opacity = '0';
    uploadPreview.style.transform = 'translateY(30px)';
    setTimeout(() => {
        uploadPreview.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        uploadPreview.style.opacity = '1';
        uploadPreview.style.transform = 'translateY(0)';
    }, 10);
    
    document.getElementById('upload-status').textContent = 'File ready: ' + file.name;
    document.getElementById('upload-status').className = 'status success';
}

async function processUpload() {
    const file = currentFile || fileInput.files[0];
    if (!file) {
        document.getElementById('upload-status').textContent = 'Please select a file first';
        document.getElementById('upload-status').className = 'status error';
        return;
    }
    
    // Hide upload section with animation
    const mainContent = document.getElementById('main-content');
    mainContent.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
    mainContent.style.opacity = '0';
    mainContent.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        mainContent.style.display = 'none';
        showProgress();
    }, 400);
    
    const formData = new FormData();
    formData.append('video', file);
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
        }
        const data = await response.json();
        
        if (data.success) {
            hideProgress();
            showResult(data.output_id, data.spectrogram_filename, data.message);
        } else {
            hideProgress();
            mainContent.style.display = 'block';
            mainContent.style.opacity = '1';
            mainContent.style.transform = 'translateY(0)';
            document.getElementById('upload-status').textContent = 'Error: ' + data.error;
            document.getElementById('upload-status').className = 'status error';
        }
    } catch (error) {
        hideProgress();
        mainContent.style.display = 'block';
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';
        document.getElementById('upload-status').textContent = 'Error: ' + error.message;
        document.getElementById('upload-status').className = 'status error';
    }
}

function showProgress() {
    const progressSection = document.getElementById('progress-section');
    progressSection.style.display = 'block';
    progressSection.style.opacity = '0';
    progressSection.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
        progressSection.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        progressSection.style.opacity = '1';
        progressSection.style.transform = 'translateY(0)';
    }, 10);
    
    document.getElementById('result-section').style.display = 'none';
    
    let progress = 0;
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    const messages = [
        'Analyzing motion...',
        'Extracting pose data...',
        'Generating spectrogram...',
        'Synthesizing audio...',
        'Merging video and audio...',
        'Finalizing output...'
    ];
    
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 95) progress = 95;
        
        progressFill.style.width = progress + '%';
        const messageIndex = Math.floor((progress / 100) * messages.length);
        progressText.textContent = messages[Math.min(messageIndex, messages.length - 1)];
    }, 500);
    
    window.progressInterval = interval;
}

function hideProgress() {
    if (window.progressInterval) {
        clearInterval(window.progressInterval);
    }
    const progressSection = document.getElementById('progress-section');
    progressSection.style.transition = 'opacity 0.4s ease-out';
    progressSection.style.opacity = '0';
    
    setTimeout(() => {
        progressSection.style.display = 'none';
        progressSection.style.opacity = '1';
        document.getElementById('progress-fill').style.width = '0%';
    }, 400);
}

function showResult(outputId, spectrogramFilename, message) {
    const resultSection = document.getElementById('result-section');
    const videoElement = document.getElementById('result-video');
    const spectrogramElement = document.getElementById('result-spectrogram');
    const downloadLink = document.getElementById('download-link');
    
    videoElement.src = `/video/${outputId}`;
    
    if (spectrogramFilename) {
        spectrogramElement.src = `/spectrogram/${outputId}`;
    }
    
    downloadLink.href = `/download/${outputId}`;
    
    // Display message if provided (e.g., video trimming notice)
    const messageElement = document.getElementById('result-message');
    if (message && messageElement) {
        messageElement.textContent = message;
        messageElement.style.display = 'block';
    } else if (messageElement) {
        messageElement.style.display = 'none';
    }
    
    resultSection.style.display = 'block';
    resultSection.style.opacity = '0';
    resultSection.style.transform = 'translateY(50px)';
    
    setTimeout(() => {
        resultSection.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        resultSection.style.opacity = '1';
        resultSection.style.transform = 'translateY(0)';
    }, 100);
    
    // Animate result cards
    setTimeout(() => {
        const cards = document.querySelectorAll('.result-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.transitionDelay = `${index * 0.1}s`;
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 200);
        });
    }, 300);
    
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetAndUploadAnother() {
    const resultSection = document.getElementById('result-section');
    const mainContent = document.getElementById('main-content');
    
    resultSection.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
    resultSection.style.opacity = '0';
    resultSection.style.transform = 'translateY(-30px)';
    
    setTimeout(() => {
        resultSection.style.display = 'none';
        hideProgress();
        
        // Reset upload area
        document.getElementById('upload-preview').style.display = 'none';
        uploadArea.style.display = 'block';
        uploadArea.style.opacity = '0';
        uploadArea.style.transform = 'translateY(30px)';
        
        document.getElementById('file-input').value = '';
        currentFile = null;
        document.getElementById('upload-status').textContent = '';
        document.getElementById('upload-status').className = 'status';
        
        // Reset sample grid loaded state
        const samplesGrid = document.getElementById('samples-grid');
        if (samplesGrid) {
            samplesGrid.dataset.loaded = 'false';
        }
        
        // Reset video and spectrogram
        document.getElementById('result-video').src = '';
        document.getElementById('result-spectrogram').src = '';
        const messageElement = document.getElementById('result-message');
        if (messageElement) {
            messageElement.textContent = '';
            messageElement.style.display = 'none';
        }
        
        // Show main content
        mainContent.style.display = 'block';
        setTimeout(() => {
            mainContent.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            mainContent.style.opacity = '1';
            mainContent.style.transform = 'translateY(0)';
            
            setTimeout(() => {
                uploadArea.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                uploadArea.style.opacity = '1';
                uploadArea.style.transform = 'translateY(0)';
            }, 100);
        }, 100);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 400);
}

// Title word animation on load
window.addEventListener('load', () => {
    const titleWords = document.querySelectorAll('.title-word');
    titleWords.forEach((word, index) => {
        word.style.opacity = '0';
        word.style.transform = 'translateY(30px)';
        setTimeout(() => {
            word.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            word.style.transitionDelay = `${index * 0.1}s`;
            word.style.opacity = '1';
            word.style.transform = 'translateY(0)';
        }, 300);
    });
});
