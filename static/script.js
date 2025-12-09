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
            // Check if job was queued (async processing)
            if (data.status === 'queued') {
                // Poll for status
                pollJobStatus(data.job_id);
            } else {
                // Immediate result (synchronous processing)
                hideProgress();
                showResult(data.output_id || data.job_id, data.spectrogram_filename, data.message);
            }
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
            // Check if job was queued (async processing)
            if (data.status === 'queued') {
                // Poll for status
                pollJobStatus(data.job_id);
            } else {
                // Immediate result (synchronous processing)
                hideProgress();
                showResult(data.output_id || data.job_id, data.spectrogram_filename, data.message);
            }
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

// Poll for job status when using queue system
async function pollJobStatus(jobId, attempts = 0, maxAttempts = 60) {
    const progressText = document.getElementById('progress-text');
    if (progressText) {
        progressText.textContent = `Processing video... (checking status)`;
    }
    
    if (attempts >= maxAttempts) {
        hideProgress();
        const mainContent = document.getElementById('main-content');
        mainContent.style.display = 'block';
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';
        document.getElementById('upload-status').textContent = 'Processing timed out. Please check back later.';
        document.getElementById('upload-status').className = 'status error';
        return;
    }
    
    try {
        const response = await fetch(`/status/${jobId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.status === 'complete') {
            hideProgress();
            showResult(jobId, data.spectrogram_filename || `spectrogram_${jobId}.png`, data.message);
        } else if (data.status === 'processing') {
            // Continue polling
            setTimeout(() => pollJobStatus(jobId, attempts + 1, maxAttempts), 2000); // Check every 2 seconds
        } else {
            throw new Error('Unknown status: ' + data.status);
        }
    } catch (error) {
        console.error('Error polling status:', error);
        // Retry after delay
        setTimeout(() => pollJobStatus(jobId, attempts + 1, maxAttempts), 2000);
    }
}

// Poll for job status when using queue system
async function pollJobStatus(jobId, attempts = 0, maxAttempts = 60) {
    const progressText = document.getElementById('progress-text');
    if (progressText) {
        progressText.textContent = `Processing video... (checking status ${attempts + 1}/${maxAttempts})`;
    }
    
    if (attempts >= maxAttempts) {
        hideProgress();
        const mainContent = document.getElementById('main-content');
        mainContent.style.display = 'block';
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';
        document.getElementById('upload-status').textContent = 'Processing timed out. Please check back later.';
        document.getElementById('upload-status').className = 'status error';
        return;
    }
    
    try {
        const response = await fetch(`/status/${jobId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.status === 'complete') {
            hideProgress();
            // Use video_url if available (from GCS), otherwise use local path
            if (data.video_url) {
                showResultWithUrls(jobId, data.video_url, data.spectrogram_url, data.message);
            } else {
                showResult(jobId, data.spectrogram_filename || `spectrogram_${jobId}.png`, data.message);
            }
        } else if (data.status === 'processing') {
            // Continue polling
            setTimeout(() => pollJobStatus(jobId, attempts + 1, maxAttempts), 2000); // Check every 2 seconds
        } else {
            throw new Error('Unknown status: ' + data.status);
        }
    } catch (error) {
        console.error('Error polling status:', error);
        // Retry after delay
        setTimeout(() => pollJobStatus(jobId, attempts + 1, maxAttempts), 2000);
    }
}

// Interactive spectrogram state
let spectrogramData = null;
let spectrogramCanvas = null;
let spectrogramCtx = null;
let indicatorUpdateFunction = null;

// Color map for spectrogram (viridis-like)
function getColorForValue(value, min, max) {
    const normalized = (value - min) / (max - min);
    // Viridis color map approximation
    if (normalized < 0.25) {
        const t = normalized / 0.25;
        return `rgb(${Math.floor(68 * (1-t))}, ${Math.floor(1 + 83*t)}, ${Math.floor(84 + 102*t)})`;
    } else if (normalized < 0.5) {
        const t = (normalized - 0.25) / 0.25;
        return `rgb(${Math.floor(59 + 42*t)}, ${Math.floor(84 + 60*t)}, ${Math.floor(186 - 38*t)})`;
    } else if (normalized < 0.75) {
        const t = (normalized - 0.5) / 0.25;
        return `rgb(${Math.floor(101 + 54*t)}, ${Math.floor(144 + 50*t)}, ${Math.floor(148 - 50*t)})`;
    } else {
        const t = (normalized - 0.75) / 0.25;
        return `rgb(${Math.floor(155 + 100*t)}, ${Math.floor(194 + 61*t)}, ${Math.floor(98 + 157*t)})`;
    }
}

async function loadAndDrawSpectrogram(outputId) {
    const canvas = document.getElementById('result-spectrogram-canvas');
    const loading = document.getElementById('spectrogram-loading');
    const indicator = document.getElementById('spectrogram-indicator');
    
    if (!canvas) return;
    
    spectrogramCanvas = canvas;
    spectrogramCtx = canvas.getContext('2d');
    
    loading.classList.add('show');
    
    try {
        const response = await fetch(`/spectrogram_data/${outputId}`);
        if (!response.ok) {
            throw new Error('Failed to load spectrogram data');
        }
        
        const data = await response.json();
        spectrogramData = data;
        
        // Set canvas size
        const container = canvas.parentElement;
        const containerWidth = container.offsetWidth;
        const aspectRatio = data.shape[0] / data.shape[1];
        const canvasHeight = containerWidth * aspectRatio;
        
        canvas.width = containerWidth;
        canvas.height = canvasHeight;
        
        // Draw spectrogram
        drawSpectrogram(data);
        
        // Setup interactive features
        setupSpectrogramInteractivity();
        
        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (spectrogramData) {
                    const container = canvas.parentElement;
                    const containerWidth = container.offsetWidth;
                    const aspectRatio = spectrogramData.shape[0] / spectrogramData.shape[1];
                    const canvasHeight = containerWidth * aspectRatio;
                    
                    canvas.width = containerWidth;
                    canvas.height = canvasHeight;
                    
                    drawSpectrogram(spectrogramData);
                    if (indicatorUpdateFunction) {
                        indicatorUpdateFunction();
                    }
                }
            }, 250);
        });
        
        loading.classList.remove('show');
        indicator.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading spectrogram:', error);
        loading.textContent = 'Spectrogram data not available';
        // Fallback to PNG if data not available
        const img = document.createElement('img');
        img.id = 'result-spectrogram-fallback';
        img.src = `/spectrogram/${outputId}`;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        canvas.parentElement.appendChild(img);
        canvas.style.display = 'none';
        loading.classList.remove('show');
    }
}

function drawSpectrogram(data) {
    if (!spectrogramCtx || !data) return;
    
    const { data: spectrogram, shape, min, max } = data;
    const [freqBins, timeFrames] = shape;
    const canvasWidth = spectrogramCanvas.width;
    const canvasHeight = spectrogramCanvas.height;
    
    const pixelWidth = canvasWidth / timeFrames;
    const pixelHeight = canvasHeight / freqBins;
    
    // Draw background
    spectrogramCtx.fillStyle = '#000';
    spectrogramCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw spectrogram
    for (let t = 0; t < timeFrames; t++) {
        for (let f = 0; f < freqBins; f++) {
            const value = spectrogram[f][t];
            const color = getColorForValue(value, min, max);
            spectrogramCtx.fillStyle = color;
            spectrogramCtx.fillRect(
                t * pixelWidth,
                (freqBins - 1 - f) * pixelHeight, // Flip vertically
                Math.ceil(pixelWidth),
                Math.ceil(pixelHeight)
            );
        }
    }
    
    // Draw axes labels
    spectrogramCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    spectrogramCtx.font = '12px monospace';
    spectrogramCtx.fillText('Frequency (bins)', 10, 20);
    spectrogramCtx.save();
    spectrogramCtx.translate(15, canvasHeight / 2);
    spectrogramCtx.rotate(-Math.PI / 2);
    spectrogramCtx.fillText('Time (frames)', 0, 0);
    spectrogramCtx.restore();
}

function setupSpectrogramInteractivity() {
    const videoElement = document.getElementById('result-video');
    const indicator = document.getElementById('spectrogram-indicator');
    const canvas = spectrogramCanvas;
    
    if (!videoElement || !indicator || !canvas) return;
    
    // Update indicator position based on video playback
    indicatorUpdateFunction = function() {
        if (!videoElement || !indicator || !canvas || !spectrogramData) return;
        
        const duration = videoElement.duration;
        const currentTime = videoElement.currentTime || 0;
        
        if (duration && duration > 0 && canvas.width > 0) {
            const progress = Math.min(Math.max(currentTime / duration, 0), 1);
            const position = progress * canvas.width;
            indicator.style.left = `${position}px`;
            indicator.style.top = '0px';
            indicator.style.height = `${canvas.height}px`;
            indicator.style.display = 'block';
        }
    };
    
    // Add video event listeners
    videoElement.addEventListener('timeupdate', indicatorUpdateFunction);
    videoElement.addEventListener('seeked', indicatorUpdateFunction);
    videoElement.addEventListener('loadedmetadata', indicatorUpdateFunction);
    
    // Click/drag to scrub
    let isDragging = false;
    
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        scrubToPosition(e, canvas, videoElement);
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            scrubToPosition(e, canvas, videoElement);
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });
    
    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        const touch = e.touches[0];
        scrubToPosition({ clientX: touch.clientX }, canvas, videoElement);
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isDragging) {
            const touch = e.touches[0];
            scrubToPosition({ clientX: touch.clientX }, canvas, videoElement);
        }
    });
    
    canvas.addEventListener('touchend', () => {
        isDragging = false;
    });
    
    // Initial update
    setTimeout(indicatorUpdateFunction, 100);
}

function scrubToPosition(e, canvas, videoElement) {
    if (!videoElement || !canvas || !videoElement.duration) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / canvas.width));
    const newTime = progress * videoElement.duration;
    
    videoElement.currentTime = newTime;
    if (indicatorUpdateFunction) {
        indicatorUpdateFunction();
    }
}

function showResultWithUrls(outputId, videoUrl, spectrogramUrl, message) {
    const resultSection = document.getElementById('result-section');
    const videoElement = document.getElementById('result-video');
    const downloadLink = document.getElementById('download-link');
    
    videoElement.src = videoUrl;
    
    downloadLink.href = videoUrl;
    downloadLink.download = `camera_synth_${outputId}.mp4`;
    
    // Display message if provided
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
    
    // Load interactive spectrogram
    setTimeout(() => {
        loadAndDrawSpectrogram(outputId);
    }, 500);
    
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showResult(outputId, spectrogramFilename, message) {
    const resultSection = document.getElementById('result-section');
    const videoElement = document.getElementById('result-video');
    const downloadLink = document.getElementById('download-link');
    const spectrogramCard = document.querySelector('.spectrogram-result');
    
    videoElement.src = `/video/${outputId}`;
    
    // Show spectrogram card by default
    if (spectrogramCard) {
        spectrogramCard.style.display = 'block';
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
    
    // Load interactive spectrogram
    setTimeout(() => {
        loadAndDrawSpectrogram(outputId);
    }, 500);
    
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
        const videoElement = document.getElementById('result-video');
        const canvas = document.getElementById('result-spectrogram-canvas');
        const fallbackImg = document.getElementById('result-spectrogram-fallback');
        const indicator = document.getElementById('spectrogram-indicator');
        const loading = document.getElementById('spectrogram-loading');
        
        if (videoElement) {
            videoElement.pause();
            videoElement.src = '';
            videoElement.load();
        }
        
        // Remove old event listeners
        if (indicatorUpdateFunction && videoElement) {
            videoElement.removeEventListener('timeupdate', indicatorUpdateFunction);
            videoElement.removeEventListener('seeked', indicatorUpdateFunction);
            videoElement.removeEventListener('loadedmetadata', indicatorUpdateFunction);
        }
        
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'block';
        }
        
        if (fallbackImg) {
            fallbackImg.remove();
        }
        
        if (indicator) {
            indicator.style.display = 'none';
            indicator.style.left = '0px';
        }
        
        if (loading) {
            loading.classList.remove('show');
            loading.textContent = 'Loading spectrogram...';
        }
        
        spectrogramData = null;
        indicatorUpdateFunction = null;
        
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
