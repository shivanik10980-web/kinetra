import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { DetectionResult, NormalizedLandmark, PoseProvider } from './types';

export interface MediaPipeConfig {
  wasmPath?: string;
  modelAssetPath?: string;
}

export class MediaPipePoseProvider implements PoseProvider {
  private landmarker: PoseLandmarker | null = null;
  private isInitializing: boolean = false;
  private lastProcessedTimestamp: number = -1;

  public async initialize(config?: MediaPipeConfig): Promise<void> {
    if (this.landmarker) return;
    if (this.isInitializing) return;

    this.isInitializing = true;
    try {
      const wasmPath = config?.wasmPath || '/wasm';
      const modelAssetPath = config?.modelAssetPath || '/models/pose_landmarker_lite.task';

      // Load vision fileset
      const vision = await FilesetResolver.forVisionTasks(wasmPath);

      // Create landmarker instance in VIDEO mode, 1 person
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelAssetPath,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch (err) {
      console.warn('MediaPipe GPU initialization failed, attempting CPU fallback:', err);
      try {
        const wasmPath = config?.wasmPath || '/wasm';
        const modelAssetPath = config?.modelAssetPath || '/models/pose_landmarker_lite.task';
        const vision = await FilesetResolver.forVisionTasks(wasmPath);
        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelAssetPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (fallbackErr) {
        console.error('MediaPipe pose landmarker failed to initialize:', fallbackErr);
        throw fallbackErr;
      }
    } finally {
      this.isInitializing = false;
    }
  }

  public async detectForVideo(video: HTMLVideoElement, timestampMs: number): Promise<DetectionResult | null> {
    if (!this.landmarker) return null;
    if (video.readyState < 2) return null; // HAVE_CURRENT_DATA
    if (timestampMs <= this.lastProcessedTimestamp) {
      // Skip duplicate frame timestamps
      return null;
    }

    try {
      const result = this.landmarker.detectForVideo(video, timestampMs);
      this.lastProcessedTimestamp = timestampMs;

      if (!result || !result.landmarks || result.landmarks.length === 0) {
        return {
          landmarks: [],
          timestampMs,
        };
      }

      // Map to NormalizedLandmark array
      const mappedLandmarks: NormalizedLandmark[][] = result.landmarks.map((list) =>
        list.map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility,
          presence: (lm as any).presence ?? 1.0,
        }))
      );

      return {
        landmarks: mappedLandmarks,
        timestampMs,
      };
    } catch (e) {
      console.error('Error during pose detection:', e);
      return null;
    }
  }

  public close(): void {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
    this.lastProcessedTimestamp = -1;
  }
}
