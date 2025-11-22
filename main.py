import cv2
import numpy as np
import sounddevice as sd
from scipy.io.wavfile import write
import matplotlib.pyplot as plt


# =============================
# 1. Record Video From Webcam
# =============================
def record_video(num_frames=120):
    cap = cv2.VideoCapture(0)
    frames = []

    print("Recording... move in front of the camera.")
    for _ in range(num_frames):
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        frames.append(gray)

        cv2.imshow("Recording", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Done recording.\n")
    return frames


# ================================================
# 2. Compute Motion (simple optical flow for now)
#    → RAFT will be plugged in here later
# ================================================
def get_motion_series(frames):
    motion_values = []

    for i in range(len(frames) - 1):
        flow = cv2.calcOpticalFlowFarneback(
            frames[i], frames[i+1],
            None, 0.5, 3, 15, 3, 5, 1.2, 0
        )

        mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        motion_values.append(np.mean(mag))

    motion_values = np.array(motion_values)

    # normalize to 0–1
    mv = (motion_values - motion_values.min()) / (motion_values.max() - motion_values.min() + 1e-6)

    return mv


# =====================================
# 3. Convert motion → audio (sine wave)
# =====================================
def sonify_motion(motion_series, duration=0.1, base_freq=220, spread=440):
    sample_rate = 44100
    audio = []

    for mv in motion_series:
        freq = base_freq + mv * spread
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        tone = 0.3 * np.sin(2 * np.pi * freq * t)
        audio.append(tone)

    audio = np.concatenate(audio)
    return audio, sample_rate


# =======================
# 4. Save & play the audio
# =======================
def save_and_play(audio, sample_rate):
    write("motion_sonification.wav", sample_rate, audio.astype(np.float32))
    print("Saved: motion_sonification.wav")

    sd.play(audio, sample_rate)
    sd.wait()
    print("Audio playback finished.\n")


# =======================
# 5. Plot the dataset
# =======================
def plot_motion(motion_series):
    plt.plot(motion_series)
    plt.title("Motion Magnitude Over Time")
    plt.xlabel("Frame")
    plt.ylabel("Normalized Motion")
    plt.savefig("motion_plot.png")
    plt.show()
    print("Saved: motion_plot.png")


# ==================
# MAIN PROGRAM FLOW
# ==================
if __name__ == "__main__":
    frames = record_video(num_frames=120)
    
    motion_series = get_motion_series(frames)
    print("Example motion values:", motion_series[:10])

    audio, sr = sonify_motion(motion_series)

    save_and_play(audio, sr)

    plot_motion(motion_series)

    print("Done.")
