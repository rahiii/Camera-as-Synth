# Camera-as-Synth: Motion-Driven Spectral Sonification Using Optical Flow

A system that converts human movement into sound by treating video motion as input to a spectral synthesizer. Upload a video file to analyze body motion, and each frame of movement is transformed into a slice of a spectrogram.

**Motion direction shapes frequency content, motion magnitude determines amplitude, and the resulting time:frequency matrix is resynthesized into audio.** The output is a sound texture tightly coupled to how the performer moves.

The final result is an audiovisual piece: motion-visualized video paired with motion-generated sound.

**Project Documentation**: [Google Doc](https://docs.google.com/document/d/1l9QHwBkSb-fY-Y4fzU58IRbZmelc7PBlWYZpyWMjXnU/edit?usp=sharing)

## Get the code (local only)

1) Open a terminal (macOS/Linux) or PowerShell (Windows).
2) If `git` is not installed:
   - macOS: `xcode-select --install`
   - Windows: install from https://git-scm.com/download/win and restart PowerShell.
3) Clone:
```bash
git clone https://github.com/rahiii/Camera-as-Synth.git
cd Camera-as-Synth
```
If you prefer a zip, download from GitHub, unzip, then `cd` into the folder.

If you have sample videos from Google Drive, place them in `Samples/` (or use the provided ones already in `Samples/`).

## Installation

### 1. Create and activate virtual environment

**Mac/Linux:**
```bash
python3.10 -m venv venv
source venv/bin/activate
```

**Windows:**
```bash
py -m venv venv
venv\Scripts\activate
```

### 2. Install required packages

```bash
pip install -r requirements.txt
```

**Required packages:**
- `Flask` - Web framework (for local web interface)
- `opencv-python` - Video processing and optical flow
- `numpy` - Numerical operations
- `mediapipe` - Pose detection and segmentation
- `librosa` - Audio analysis and synthesis
- `soundfile` - Audio file I/O
- `scipy` - Scientific computing (filtering, etc.)
- `moviepy` - Video/audio merging
- `matplotlib` - Plotting and spectrogram visualization

### 3. Download pose model

The `pose_landmarker_full.task` file must be in the project root directory. If missing, download it from [MediaPipe Pose Solutions](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker).

## Usage

### Command Line Interface

```bash
python main.py
```

When prompted:
- **Enter video path**: Type path to video file (e.g., `Samples/dance.mp4`)
- **Press Enter**: Use webcam as input source

### Local Web Interface (runs only on your machine)

```bash
python app.py
```

Then open in your browser:
```
http://localhost:5000
```

You can upload a video, use sample videos, view/download the processed result, and interact with the spectrogram (click/drag to scrub playback).

### Configuration

Edit `config.py` to customize:

```python
WIDTH = 640          # Video width
HEIGHT = 480         # Video height
SHOW_SKELETON = False  # Display pose skeleton overlay
```

## Output Files

### Final Output
- **`final_performance.mp4`** - Final video with synthesized audio (saved in project root)

### Temporary Files (auto-deleted)
- **`temp_video.avi`** - Temporary video file (deleted after processing)
- **`temp_audio.wav`** - Temporary audio file (deleted after processing)

## Project Structure

```
Camera-as-Synth/
├── main.py                 # CLI entry point
├── app.py                  # Local Flask web application
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── pose_landmarker_full.task  # MediaPipe pose model
├── templates/
│   └── index.html         # Web interface template
├── static/
│   ├── style.css          # Web interface styles
│   └── script.js          # Web interface JavaScript
├── engine/
│   ├── audio.py           # Audio synthesis engine
│   ├── visuals.py         # Visual processing (segmentation, flow)
│   ├── pose.py            # Pose detection
│   └── data.py            # Data collection
├── Samples/               # Sample videos
├── uploads/               # Temporary upload folder
└── outputs/               # Generated videos and spectrograms
```

## How It Works

### Pipeline

1. **Video Capture**: Processes uploaded video files using OpenCV

2. **Body + Motion Extraction**: 
   - **MediaPipe Selfie Segmentation**: Isolates human from background to focus analysis on body movement
   - **Optical Flow**: Calculates motion vectors between frames using DIS (Dense Inverse Search) or Farneback algorithm
   - Motion vectors are masked by segmentation (only human movement analyzed)
   - **MediaPipe Pose Detection**: Tracks body landmarks for gesture recognition and synthesis control

3. **Motion → Spectrogram Mapping**:
   - **Motion direction** (0-360°) maps to **frequency bins** via histogram distribution
   - **Motion magnitude** (speed) maps to **amplitude** in each frequency bin
   - Creates a 3-layer spectral representation (low, mid, high) weighted by motion speed
   - Each frame becomes a time slice in the final spectrogram matrix

4. **Audio Resynthesis**:
   - **Griffin-Lim algorithm** converts the spectrogram back to audio waveform
   - **Spectral shaping**: Frequency masking based on musical scales (circle of fifths), selected by horizontal body position
   - **Mode-based synthesis** applies additional effects based on motion patterns (see Audio Modes below)
   - Pose data informs synthesis parameters (torso activity, arm spread, gesture type)
   - Audio is time-stretched to match video duration

5. **Video/Audio Merging**: Combines motion-visualized video with synthesized audio using MoviePy

This structure stays general so you can later replace or swap models (MediaPipe, another segmentation model, different flow algorithms, tracking methods, etc.) without rewriting the core description.

## Context

This project extends existing experimental sonification work by linking embodied motion to spectral sound structures rather than discrete musical events. **Optical flow supplies raw motion energy**, while **MediaPipe segmentation introduces intentionality by focusing only on human movement**.

The result is a fluid, gesture-responsive sonic texture that lives between:
- **Computer vision** (optical flow, segmentation, pose tracking)
- **Spectral music techniques** (Griffin-Lim resynthesis, frequency-domain manipulation)
- **Gesture-controlled performance systems** (real-time motion-to-sound mapping)
- **Contemporary audiovisual art** (synchronized visual and sonic textures)

The system functions as a **"camera synthesizer"**: an instrument where the performer plays sound through full-body motion.

## Audio Modes

The system automatically selects synthesis modes based on motion patterns and detected gestures:
- **FM**: Fast motion with torso activity
- **Rhythmic**: High motion variance creates rhythmic gating patterns
- **Granular**: Wide arm spreads trigger granular processing
- **Harmonic**: Raise-arms gestures generate harmonic arpeggios
- **Doppler FM**: Spin gestures create frequency-shifted effects
- **Ambient**: Low motion, stillness produces ambient textures

## Troubleshooting

### FFmpeg Not Found Error

If you encounter `RuntimeError: No ffmpeg exe could be found`:

- The `imageio-ffmpeg` package should automatically download ffmpeg binaries on first import
- Try running your script again - it should download ffmpeg automatically
- If it still fails, ensure `imageio-ffmpeg` is installed: `pip install imageio-ffmpeg`

### Pose Model Not Found

If you see `FileNotFoundError` for `pose_landmarker_full.task`:
- Download the model from [MediaPipe Pose Solutions](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- Place `pose_landmarker_full.task` in the project root directory

### Video Processing Issues

- **Large video files**: Processing may take significant time and memory. Consider using `MAX_VIDEO_DURATION_LOCAL` in `config.py` to limit processing duration
- **Webcam not working**: Check that your camera is not being used by another application
- **Low frame rate**: Ensure your video has a valid FPS (the system defaults to 30 FPS if detection fails)

### Virtual Environment Issues

If packages aren't found after installation:
- Ensure your virtual environment is activated (you should see `(venv)` in your terminal prompt)
- Try reinstalling: `pip install --upgrade -r requirements.txt`
