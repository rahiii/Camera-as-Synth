import cv2
import os
import uuid
import config
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from engine.visuals import VisualEngine
from engine.pose import PoseEngine
from engine.data import DataCollector
from engine.audio import AudioEngine

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['OUTPUT_FOLDER'] = 'outputs'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(404)
def not_found(error):
    if request.path.startswith('/api/') or request.is_json:
        return jsonify({'error': 'Not found'}), 404
    return error

ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def trim_video_to_duration(video_path, max_duration, output_path):
    """Trim video to max_duration seconds using OpenCV"""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Could not open video file for trimming")
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    max_frames = int(max_duration * fps)
    frame_count = 0
    
    while frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        out.write(frame)
        frame_count += 1
    
    cap.release()
    out.release()
    return output_path

def is_web_deployment():
    """Check if running on web deployment (Render, Heroku, etc.)"""
    return os.environ.get('RENDER') is not None or os.environ.get('DYNO') is not None

def process_video(video_path, output_id, max_duration=None):
    if not os.path.exists(config.POSE_MODEL_PATH):
        raise FileNotFoundError(f"Pose model not found: {config.POSE_MODEL_PATH}. Please ensure pose_landmarker_full.task is in the project root.")
    
    # Trim video if max_duration is specified
    original_path = video_path
    temp_trimmed_path = None
    if max_duration is not None:
        temp_trimmed_path = os.path.join(app.config['UPLOAD_FOLDER'], f"trimmed_{output_id}.mp4")
        try:
            trim_video_to_duration(video_path, max_duration, temp_trimmed_path)
            video_path = temp_trimmed_path
        except Exception as e:
            print(f"Warning: Could not trim video: {e}. Processing full video.")
            if temp_trimmed_path and os.path.exists(temp_trimmed_path):
                os.remove(temp_trimmed_path)
            temp_trimmed_path = None
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Could not open video file")
    
    detected_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if detected_fps <= 0 or detected_fps > 120:
        fps = 30.0
        use_processed_frame_count = True
    else:
        fps = detected_fps
        if frame_count > 0 and fps > 0:
            use_processed_frame_count = False
        else:
            use_processed_frame_count = True
    
    delay_time = int(1000 / fps)
    
    temp_video_path = os.path.join(app.config['OUTPUT_FOLDER'], f"temp_{output_id}.avi")
    write_fps = fps
    writer = cv2.VideoWriter(
        temp_video_path,
        cv2.VideoWriter_fourcc(*'MJPG'),
        write_fps,
        (config.WIDTH, config.HEIGHT)
    )
    
    visuals = VisualEngine()
    pose_tracker = PoseEngine()
    collector = DataCollector()
    audio_synth = AudioEngine()
    show_skeleton = config.SHOW_SKELETON
    
    frame_idx = 0
    fps_inv = 1.0 / fps
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        visual_frame, flow_mag, c_ang, c_mag, cx, cy = visuals.process(frame, mirror_mode=False)
        
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pose_result = pose_tracker.process(rgb, frame_idx * fps_inv * 1000.0)
        
        collector.process(flow_mag, c_ang, c_mag, cx, cy, pose_result)
        
        final_output = pose_tracker.draw_overlay(visual_frame, pose_result) if show_skeleton else visual_frame
        
        writer.write(final_output)
        frame_idx += 1
    
    cap.release()
    writer.release()
    
    if not collector.spectral_hist:
        raise ValueError("No motion data collected")
    
    if use_processed_frame_count:
        total_duration = frame_idx * fps_inv
    else:
        total_duration = frame_count / fps if frame_count > 0 else frame_idx * fps_inv
    
    wav_path = os.path.join(app.config['OUTPUT_FOLDER'], f"temp_{output_id}.wav")
    audio_synth.generate(collector, total_duration)
    
    if os.path.exists("temp_audio.wav"):
        os.rename("temp_audio.wav", wav_path)
    
    output_filename = os.path.join(app.config['OUTPUT_FOLDER'], f"final_{output_id}.mp4")
    audio_synth.merge_video(temp_video_path, wav_path, output_filename, total_duration)
    
    spectrogram_path = os.path.join(app.config['OUTPUT_FOLDER'], f"spectrogram_{output_id}.png")
    audio_synth.save_spectrogram(spectrogram_path)
    
    try:
        os.remove(temp_video_path)
        os.remove(wav_path)
        # Clean up trimmed video if it was created
        if temp_trimmed_path and os.path.exists(temp_trimmed_path):
            os.remove(temp_trimmed_path)
    except:
        pass
    
    return output_filename, spectrogram_path

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/healthz')
def health():
    return jsonify({'status': 'ok'}), 200

@app.route('/samples')
def list_samples():
    samples_dir = 'Samples'
    if not os.path.exists(samples_dir):
        return jsonify({'samples': []})
    
    samples = []
    for filename in os.listdir(samples_dir):
        if filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
            samples.append({
                'filename': filename,
                'name': filename.replace('.mp4', '').replace('.avi', '').replace('.mov', '').replace('.mkv', '').replace('.webm', '')
            })
    
    return jsonify({'samples': samples})

@app.route('/process_sample', methods=['POST'])
def process_sample():
    data = request.get_json()
    if not data or 'filename' not in data:
        return jsonify({'error': 'No filename provided'}), 400
    
    filename = data['filename']
    filepath = os.path.join('Samples', filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Sample file not found'}), 404
    
    output_id = str(uuid.uuid4())
    
    # Determine max duration based on deployment
    max_duration = config.MAX_VIDEO_DURATION_WEB if is_web_deployment() else config.MAX_VIDEO_DURATION_LOCAL
    
    # Check video duration before processing
    cap_check = cv2.VideoCapture(filepath)
    if cap_check.isOpened():
        fps_check = cap_check.get(cv2.CAP_PROP_FPS) or 30.0
        frame_count_check = int(cap_check.get(cv2.CAP_PROP_FRAME_COUNT))
        video_duration = frame_count_check / fps_check if frame_count_check > 0 and fps_check > 0 else 0
        cap_check.release()
        will_trim = max_duration is not None and video_duration > max_duration
    else:
        will_trim = False
    
    try:
        output_path, spectrogram_path = process_video(filepath, output_id, max_duration=max_duration)
        
        response_data = {
            'success': True,
            'output_id': output_id,
            'filename': os.path.basename(output_path),
            'spectrogram_filename': os.path.basename(spectrogram_path)
        }
        
        if will_trim:
            response_data['message'] = f'Video was trimmed to {max_duration} seconds for web processing. For full-length processing, run locally.'
        
        return jsonify(response_data)
    except Exception as e:
        error_msg = str(e)
        if 'timeout' in error_msg.lower() or 'memory' in error_msg.lower():
            error_msg += ' (Note: Video processing requires significant resources. The free tier may have limitations.)'
        return jsonify({'error': error_msg}), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: mp4, avi, mov, mkv, webm'}), 400
    
    output_id = str(uuid.uuid4())
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"{output_id}_{filename}")
    file.save(filepath)
    
    # Check file size (warn if too large for free tier)
    file_size_mb = os.path.getsize(filepath) / (1024 * 1024)
    if file_size_mb > 50:
        try:
            os.remove(filepath)
        except:
            pass
        return jsonify({'error': f'File too large ({file_size_mb:.1f}MB). Free tier supports files up to 50MB. Please use a smaller video or upgrade your plan.'}), 400
    
    # Determine max duration based on deployment
    max_duration = config.MAX_VIDEO_DURATION_WEB if is_web_deployment() else config.MAX_VIDEO_DURATION_LOCAL
    
    # Check video duration before processing
    cap_check = cv2.VideoCapture(filepath)
    if cap_check.isOpened():
        fps_check = cap_check.get(cv2.CAP_PROP_FPS) or 30.0
        frame_count_check = int(cap_check.get(cv2.CAP_PROP_FRAME_COUNT))
        video_duration = frame_count_check / fps_check if frame_count_check > 0 and fps_check > 0 else 0
        cap_check.release()
        will_trim = max_duration is not None and video_duration > max_duration
    else:
        will_trim = False
    
    try:
        output_path, spectrogram_path = process_video(filepath, output_id, max_duration=max_duration)
        
        try:
            os.remove(filepath)
        except:
            pass
        
        response_data = {
            'success': True,
            'output_id': output_id,
            'filename': os.path.basename(output_path),
            'spectrogram_filename': os.path.basename(spectrogram_path)
        }
        
        if will_trim:
            response_data['message'] = f'Video was trimmed to {max_duration} seconds for web processing. For full-length processing, run locally.'
        
        return jsonify(response_data)
    except Exception as e:
        try:
            os.remove(filepath)
        except:
            pass
        error_msg = str(e)
        if 'timeout' in error_msg.lower() or 'memory' in error_msg.lower():
            error_msg += ' (Note: Video processing requires significant resources. The free tier may have limitations. Try a shorter/smaller video.)'
        return jsonify({'error': error_msg}), 500

@app.route('/video/<output_id>')
def serve_video(output_id):
    filename = f"final_{output_id}.mp4"
    filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(filepath, mimetype='video/mp4')

@app.route('/spectrogram/<output_id>')
def serve_spectrogram(output_id):
    filename = f"spectrogram_{output_id}.png"
    filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Spectrogram not found'}), 404
    
    return send_file(filepath, mimetype='image/png')

@app.route('/sample_preview/<path:filename>')
def serve_sample_preview(filename):
    from urllib.parse import unquote
    filename = unquote(filename)
    filepath = os.path.join('Samples', filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'Sample not found'}), 404
    return send_file(filepath, mimetype='video/mp4')

@app.route('/download/<output_id>')
def download_file(output_id):
    filename = f"final_{output_id}.mp4"
    filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(filepath, as_attachment=True, download_name=f"camera_synth_{output_id}.mp4")

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)

