# Camera-as-Synth: Motion-Driven Spectral Sonification Using Optical Flow

A system that converts human movement into sound by treating video motion as input to a spectral synthesizer. A short video or webcam feed is analyzed to extract body motion, and each frame of movement is transformed into a slice of a spectrogram.

**Motion direction shapes frequency content, motion magnitude determines amplitude, and the resulting time:frequency matrix is resynthesized into audio.** The output is a sound texture tightly coupled to how the performer moves.

The final result is an audiovisual piece: motion-visualized video paired with motion-generated sound.

**Project Documentation**: [Google Doc](https://docs.google.com/document/d/1l9QHwBkSb-fY-Y4fzU58IRbZmelc7PBlWYZpyWMjXnU/edit?usp=sharing)

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
pip install opencv-python numpy mediapipe librosa soundfile scipy moviepy
```

**Required packages:**
- `opencv-python` - Video processing and optical flow
- `numpy` - Numerical operations
- `mediapipe` - Pose detection and segmentation
- `librosa` - Audio analysis and synthesis
- `soundfile` - Audio file I/O
- `scipy` - Scientific computing (filtering, etc.)
- `moviepy` - Video/audio merging

### 3. Download pose model

The `pose_landmarker_full.task` file must be in the project root directory. If missing, download it from [MediaPipe Pose Solutions](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker).

## Usage

### Run the program

```bash
python main.py
```

When prompted:
- **Enter video path**: Type path to video file (e.g., `Samples/dance.mp4`) or press Enter for webcam
- **Press 'q'**: Stop recording early (webcam mode)

### Configuration

Edit `config.py` to customize:

```python
INPUT_SOURCE = None  # Set to video path or None for webcam
CAMERA_ID = 0        # Webcam device ID
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
video_sonification/
├── main.py                 # Main entry point
├── config.py              # Configuration settings
├── pose_landmarker_full.task  # MediaPipe pose model
├── engine/
│   ├── audio.py           # Audio synthesis engine
│   ├── visuals.py         # Visual processing (segmentation, flow)
│   ├── pose.py            # Pose detection
│   └── data.py            # Data collection
└── final_performance.mp4  # Output file (generated)
```

## How It Works

### Pipeline

1. **Video Capture**: Captures from webcam or video file using OpenCV

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
