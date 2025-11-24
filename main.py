# main.py
import cv2
import sys
import time
import config
from engine.visuals import VisualEngine

def main():
    print(f"--- INIT PROJECT: Step 1 (Visuals) ---")
    
    # 1. Determine Input Source
    if config.INPUT_SOURCE:
        print(f"Attempting to load video file: {config.INPUT_SOURCE}")
        source = config.INPUT_SOURCE
        is_video_file = True
    else:
        print(f"Attempting to load Webcam ID: {config.CAMERA_ID}")
        source = config.CAMERA_ID
        is_video_file = False

    # 2. Initialize Capture
    cap = cv2.VideoCapture(source)
    
    if not cap.isOpened():
        print("Error: Could not open source. Check file path or webcam connection.")
        sys.exit()

    # Get video FPS (Defaults to 30 if using webcam)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0 or fps is None: fps = 30
    delay_time = int(1000 / fps) # Calculate delay to match video speed

    # 3. Load Engine
    visuals = VisualEngine()
    print("Running... Press 'q' to quit.")

    # 4. Main Loop
    while True:
        ret, frame = cap.read()
        
        # Handle Video End
        if not ret:
            if is_video_file:
                print("Video finished.")
                # Option A: Loop video (Uncomment lines below to loop)
                # cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                # continue
                
                # Option B: Stop
                break
            else:
                print("Error: Camera disconnected.")
                break

        # Pass frame to our engine
        output_frame = visuals.process(frame)

        cv2.imshow("Modular Visuals", output_frame)

        # WaitKey controls playback speed
        # If it's a file, we wait 'delay_time' to match FPS. 
        # If it's a webcam, 1ms is fine.
        wait_ms = delay_time if is_video_file else 1
        
        if cv2.waitKey(wait_ms) == ord('q'):
            break

    # 5. Cleanup
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()