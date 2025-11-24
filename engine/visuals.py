import cv2
import numpy as np
import mediapipe as mp
import config  # Import settings from the root config file

class VisualEngine:
    def __init__(self):
        self.w = config.WIDTH
        self.h = config.HEIGHT
        
        # 1. Setup MediaPipe Segmentation
        self.mp_seg = mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=1)
        
        # 2. Setup Optical Flow
        try:
            self.dis = cv2.DISOpticalFlow_create(cv2.DISOpticalFlow_PRESET_MEDIUM)
            print("VisualEngine: Loaded DIS Optical Flow (Fast)")
        except:
            self.dis = None
            print("VisualEngine: Loaded Farneback Flow (Compatible)")

        # 3. Initialize buffers
        self.prev_gray = None
        self.canvas = np.zeros((self.h, self.w, 2), dtype=np.float32)

    def process(self, frame):
        """
        Takes a raw frame, calculates flow, updates canvas, returns composite image.
        """
        # A. Preprocessing
        frame = cv2.resize(frame, (self.w, self.h))
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # B. Segmentation Mask (Remove Background)
        res = self.mp_seg.process(rgb)
        mask = np.zeros((self.h, self.w), dtype=np.float32)
        if res.segmentation_mask is not None:
            bin_mask = (res.segmentation_mask > 0.5).astype(np.uint8)
            mask = cv2.GaussianBlur(bin_mask.astype(np.float32), (5,5), 0)

        # C. Optical Flow Calculation
        if self.prev_gray is None:
            self.prev_gray = gray
            return frame # Return raw frame on first loop
        
        if self.dis:
            flow = self.dis.calc(self.prev_gray, gray, None)
        else:
            flow = cv2.calcOpticalFlowFarneback(self.prev_gray, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        
        # Apply mask to flow
        flow[..., 0] *= mask
        flow[..., 1] *= mask

        # D. Update Canvas (The fluid trail logic)
        mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        mag = np.maximum(0, mag - 0.5) * config.FLOW_SENSITIVITY
        x_flow, y_flow = cv2.polarToCart(mag, ang)
        
        # Add new movement to existing canvas
        self.canvas = cv2.addWeighted(
            np.dstack((x_flow, y_flow)), config.TRAIL_SPEED,
            self.canvas, config.TRAIL_DECAY, 0
        )

        # E. Colorizing
        c_mag, c_ang = cv2.cartToPolar(self.canvas[..., 0], self.canvas[..., 1])
        hsv = np.zeros((self.h, self.w, 3), dtype=np.uint8)
        hsv[..., 0] = c_ang * 180 / np.pi / 2
        hsv[..., 1] = 255
        hsv[..., 2] = np.clip(c_mag * 10, 0, 255)
        
        flow_visual = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        
        # F. Blend and Finish
        final = cv2.add((frame * 0.6).astype(np.uint8), flow_visual)
        self.prev_gray = gray
        
        return final