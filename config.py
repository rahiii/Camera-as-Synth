# If you want to use the WEBCAM, set this to: None
# If you want to use a VIDEO, set this to the filename: "video.mp4"
INPUT_SOURCE = "/Users/rahimitra/Downloads/video_sonification/Samples/KathakDance.mp4" 

# Webcam ID (Only used if INPUT_SOURCE is None)
CAMERA_ID = 0 

WIDTH = 640
HEIGHT = 480

TRAIL_DECAY = 0.85      # How fast trails fade (0.0 - 1.0)
TRAIL_SPEED = 0.15      # How fast new movement appears
FLOW_SENSITIVITY = 5.0  # Sensitivity to movement