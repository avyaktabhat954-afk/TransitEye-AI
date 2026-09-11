import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  Video, 
  Upload, 
  Play, 
  Pause, 
  Square, 
  CheckSquare, 
  AlertCircle, 
  CheckCircle2, 
  Cpu, 
  Database, 
  Server, 
  Layers, 
  Eye, 
  Zap, 
  Activity, 
  RefreshCw, 
  ShieldAlert, 
  MapPin, 
  Info,
  Sliders,
  Sparkles,
  HelpCircle,
  XCircle
} from 'lucide-react';
import { getHealth, runInference } from '../services/api';

// Six TransitEye models metadata with real Part 2B status
const SYSTEM_MODELS = [
  {
    id: 'road_defect',
    name: 'Road Defect Detection',
    domain: 'road_defect',
    architecture: 'YOLOv8n-Seg (4-class)',
    classes: ['longitudinal_crack', 'transverse_crack', 'alligator_crack', 'pothole'],
    weightsPath: 'ml/road_defects/weights/best.pt',
    status: 'NOT CONNECTED',
    icon: ShieldAlert,
    description: 'Identifies road surface deterioration, potholes, and structural pavement cracking.'
  },
  {
    id: 'missing_infra',
    name: 'Missing Infrastructure',
    domain: 'missing_infrastructure',
    architecture: 'YOLOv8n Detection',
    classes: ['broken_signage', 'missing_guardrail', 'damaged_bollard', 'missing_manhole'],
    weightsPath: 'ml/missing_infrastructure/weights/best.pt',
    status: 'NOT CONNECTED',
    icon: Layers,
    description: 'Detects missing or damaged urban transit signage, guardrails, and street infrastructure.'
  },
  {
    id: 'traffic',
    name: 'Traffic Volume & Density',
    domain: 'vehicle_density',
    architecture: 'YOLOv8 + ByteTrack Flow',
    classes: ['car', 'bus', 'truck', 'motorcycle'],
    weightsPath: 'yolov8n.pt',
    status: 'READY',
    icon: Activity,
    description: 'Monitors vehicle counts, multi-class vehicle density, and flow rates per road segment.'
  },
  {
    id: 'vru_safety',
    name: 'VRU Safety Risk',
    domain: 'vru_safety',
    architecture: 'YOLOv8 VRU Perception',
    classes: ['pedestrian', 'cyclist', 'motorcyclist'],
    weightsPath: 'yolov8n.pt',
    status: 'READY',
    icon: Zap,
    description: 'Assesses vulnerable road user safety (pedestrians, cyclists) in active bus corridors.'
  },
  {
    id: 'anpr',
    name: 'ANPR & Lane Violation',
    domain: 'incident',
    architecture: 'YOLOv8 + OCR Engine',
    classes: ['plate_detection', 'ocr_text_recognition'],
    weightsPath: 'ml/anpr/weights/best.pt',
    status: 'READY',
    icon: Eye,
    description: 'Recognizes license plates and flags unauthorized vehicles obstructing dedicated bus lanes.'
  },
  {
    id: 'waterlogging',
    name: 'Waterlogging & Flood Risk',
    domain: 'waterlogging',
    architecture: 'YOLOv8n-Seg Flood Mask',
    classes: ['shallow_water', 'deep_waterlogging', 'road_submersion'],
    weightsPath: 'ml/waterlogging/weights/best.pt',
    status: 'READY',
    icon: AlertCircle,
    description: 'Measures road surface water accumulation, mask area coverage, and flood severity.'
  }
];

export default function LiveAI() {
  // Navigation & Input source state
  const [inputSource, setInputSource] = useState('webcam'); // 'webcam' | 'image' | 'video' | 'demo'
  const [selectedModels, setSelectedModels] = useState(['traffic', 'vru_safety', 'anpr', 'waterlogging']);

  // Webcam stream state
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const previewImgRef = useRef(null);
  const containerRef = useRef(null);

  const [webcamState, setWebcamState] = useState({
    status: 'idle', // 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable' | 'error'
    errorMsg: ''
  });

  // Media File State
  const [selectedFile, setSelectedFile] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);

  // Backend Health State
  const [backendHealth, setBackendHealth] = useState({
    status: 'checking',
    timestamp: null
  });

  // Real AI Inference State
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);
  const [activeOverlays, setActiveOverlays] = useState([]);
  const [eventFeed, setEventFeed] = useState([]);
  const [modelStatuses, setModelStatuses] = useState({
    traffic: 'READY',
    vru_safety: 'READY',
    anpr: 'READY',
    waterlogging: 'READY',
    road_defect: 'NOT CONNECTED',
    missing_infra: 'NOT CONNECTED'
  });

  // Perception Statistics State
  const [perceptionStats, setPerceptionStats] = useState({
    totalDetections: 0,
    vehicleCount: 0,
    vruCount: 0,
    anprCount: 0,
    waterloggingSeverity: 'NONE',
    fps: 0,
    lastLatencyMs: 0
  });

  // Check Backend Health
  const checkBackendStatus = useCallback(async () => {
    try {
      const res = await getHealth();
      if (res && res.success) {
        setBackendHealth({ status: 'healthy', timestamp: res.timestamp });
      } else {
        setBackendHealth({ status: 'offline', timestamp: null });
      }
    } catch {
      setBackendHealth({ status: 'offline', timestamp: null });
    }
  }, []);

  useEffect(() => {
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 15000);
    return () => clearInterval(interval);
  }, [checkBackendStatus]);

  // Webcam Control Handlers
  const stopWebcamStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamState({ status: 'idle', errorMsg: '' });
  }, []);

  const startWebcamStream = useCallback(async () => {
    stopWebcamStream();
    setWebcamState({ status: 'requesting', errorMsg: '' });

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setWebcamState({
        status: 'unavailable',
        errorMsg: 'Browser does not support getUserMedia API or insecure HTTP context.'
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setWebcamState({ status: 'active', errorMsg: '' });
    } catch (err) {
      console.warn('Webcam permission / initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setWebcamState({
          status: 'denied',
          errorMsg: 'Camera permission denied. Please enable camera access in your browser settings.'
        });
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setWebcamState({
          status: 'unavailable',
          errorMsg: 'No camera hardware found on this device.'
        });
      } else {
        setWebcamState({
          status: 'error',
          errorMsg: err.message || 'Failed to initialize video capture stream.'
        });
      }
    }
  }, [stopWebcamStream]);

  // Cleanup media stream tracks on unmount
  useEffect(() => {
    return () => {
      stopWebcamStream();
    };
  }, [stopWebcamStream]);

  // Auto-start webcam if switching to webcam tab
  useEffect(() => {
    if (inputSource === 'webcam' && webcamState.status === 'idle') {
      startWebcamStream();
    } else if (inputSource !== 'webcam') {
      stopWebcamStream();
    }
  }, [inputSource, startWebcamStream, stopWebcamStream, webcamState.status]);

  // File Selection Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreviewUrl(url);
    }
  };

  // Model selection toggle handlers
  const toggleModelSelect = (id) => {
    if (id === 'road_defect' || id === 'missing_infra') return; // Cannot toggle un-connected models
    setSelectedModels(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  // Real Frame Capture Helper
  const captureFrameB64 = useCallback(() => {
    if (inputSource === 'webcam' && videoRef.current && videoRef.current.readyState >= 2) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.85);
    }
    return null;
  }, [inputSource]);

  // Real Multi-Model Inference Execution Loop
  const executeInference = useCallback(async () => {
    if (isProcessingFrame) return;

    const connectedModelsToRun = selectedModels.filter(
      id => id !== 'road_defect' && id !== 'missing_infra'
    );

    if (connectedModelsToRun.length === 0) return;

    setIsProcessingFrame(true);
    const startTime = performance.now();

    try {
      const frameB64 = captureFrameB64();
      const payload = {
        models: connectedModelsToRun,
        image_b64: frameB64 || undefined
      };

      const result = await runInference(payload);

      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      if (result && result.success) {
        // Update Model Statuses
        setModelStatuses(prev => ({
          ...prev,
          traffic: connectedModelsToRun.includes('traffic') ? 'RUNNING' : 'READY',
          vru_safety: connectedModelsToRun.includes('vru_safety') ? 'RUNNING' : 'READY',
          anpr: connectedModelsToRun.includes('anpr') ? 'RUNNING' : 'READY',
          waterlogging: connectedModelsToRun.includes('waterlogging') ? 'RUNNING' : 'READY',
          road_defect: 'NOT CONNECTED',
          missing_infra: 'NOT CONNECTED'
        }));

        // Update Overlays
        setActiveOverlays(result.overlays || []);

        // Process Event Logs & Metrics
        let vCount = 0;
        let vruCnt = 0;
        let anprCnt = 0;
        let wlSev = 'NONE';
        const newEvents = [];

        if (result.pipeline_results?.traffic) {
          vCount = result.pipeline_results.traffic.vehicle_count || 0;
          newEvents.push({
            id: `ev-tf-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            pipeline: 'TRAFFIC',
            type: 'vehicle_density',
            message: `Detected ${vCount} vehicles (Breakdown: ${JSON.stringify(result.pipeline_results.traffic.class_breakdown)})`,
            severity: 'info'
          });
        }

        if (result.pipeline_results?.vru_safety) {
          vruCnt = result.pipeline_results.vru_safety.count || 0;
          if (vruCnt > 0) {
            newEvents.push({
              id: `ev-vru-${Date.now()}`,
              time: new Date().toLocaleTimeString(),
              pipeline: 'VRU SAFETY',
              type: 'vru_hazard',
              message: `Detected ${vruCnt} vulnerable road users in bus corridor!`,
              severity: 'warning'
            });
          }
        }

        if (result.pipeline_results?.anpr) {
          const anprData = result.pipeline_results.anpr;
          if (anprData.plate_text && anprData.plate_text !== 'UNKNOWN') {
            anprCnt = 1;
            newEvents.push({
              id: `ev-anpr-${Date.now()}`,
              time: new Date().toLocaleTimeString(),
              pipeline: 'ANPR',
              type: 'bus_lane_violation',
              message: `Plate Recognized: ${anprData.plate_text} (Conf: ${anprData.plate_confidence})`,
              severity: 'critical'
            });
          }
        }

        if (result.pipeline_results?.waterlogging) {
          const wlData = result.pipeline_results.waterlogging;
          if (wlData.severity && wlData.severity !== 'none') {
            wlSev = wlData.severity.toUpperCase();
            newEvents.push({
              id: `ev-wl-${Date.now()}`,
              time: new Date().toLocaleTimeString(),
              pipeline: 'WATERLOGGING',
              type: 'waterlogging',
              message: `Flood Mask Ratio: ${(wlData.total_mask_area_ratio * 100).toFixed(1)}% | Severity: ${wlSev}`,
              severity: wlSev === 'HIGH' || wlSev === 'CRITICAL' ? 'critical' : 'warning'
            });
          }
        }

        setEventFeed(prev => [...newEvents, ...prev].slice(0, 30));
        setPerceptionStats({
          totalDetections: (result.overlays || []).length,
          vehicleCount: vCount,
          vruCount: vruCnt,
          anprCount: anprCnt,
          waterloggingSeverity: wlSev,
          fps: Math.round(1000 / Math.max(100, latencyMs)),
          lastLatencyMs: latencyMs
        });
      }
    } catch (err) {
      console.warn('Real AI inference error:', err);
    } finally {
      setIsProcessingFrame(false);
    }
  }, [captureFrameB64, isProcessingFrame, selectedModels]);

  // Interval loop for AI inference when active
  useEffect(() => {
    let timer = null;
    if (isAiRunning) {
      executeInference(); // immediate run
      timer = setInterval(() => {
        executeInference();
      }, 1500); // execute every 1.5 seconds to balance UI responsiveness and real inference
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAiRunning, executeInference]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* ── TOP HERO HEADER & SYSTEM STATUS ── */}
      <div className="glass-panel p-6 border-l-4 border-l-emerald-500">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white uppercase font-mono">
                LIVE AI <span className="text-emerald-400 font-sans text-lg lowercase font-normal">/ real-time perception pipeline</span>
              </h1>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Connected Real AI Pipelines: Traffic Volume, VRU Safety, ANPR & Waterlogging Flood Risk
            </p>
          </div>

          {/* Real-time System Status Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {/* Camera Status */}
            <div className={`px-3 py-1.5 rounded-md border flex items-center gap-2 ${
              webcamState.status === 'active' 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                : webcamState.status === 'requesting'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                : 'bg-zinc-900/80 border-zinc-800 text-gray-400'
            }`}>
              <Camera className="w-3.5 h-3.5" />
              <span>CAM: {webcamState.status.toUpperCase()}</span>
            </div>

            {/* Backend Status */}
            <div className={`px-3 py-1.5 rounded-md border flex items-center gap-2 ${
              backendHealth.status === 'healthy' 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                : 'bg-red-950/60 border-red-500/40 text-red-300'
            }`}>
              <Server className="w-3.5 h-3.5" />
              <span>BACKEND: {backendHealth.status.toUpperCase()}</span>
            </div>

            {/* Inference Engine Status */}
            <div className={`px-3 py-1.5 rounded-md border flex items-center gap-2 ${
              isAiRunning
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 animate-pulse'
                : 'bg-zinc-900/80 border-emerald-500/30 text-emerald-400'
            }`}>
              <Cpu className="w-3.5 h-3.5" />
              <span>INFERENCE: {isAiRunning ? 'ACTIVE (RUNNING REAL MODELS)' : 'READY'}</span>
            </div>

            {/* Model Pipeline Connection Count */}
            <div className="px-3 py-1.5 rounded-md border bg-zinc-900/80 border-zinc-800 text-gray-300 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>CONNECTED: 4 REAL PIPELINES</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── REAL PERCEPTION METRICS SUMMARY BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border-l-2 border-emerald-500">
          <div className="text-[10px] font-mono text-gray-400 uppercase">Traffic Vehicle Density</div>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{perceptionStats.vehicleCount} Vehicles</div>
          <div className="text-[10px] font-mono text-gray-500">Real YOLOv8 Counting</div>
        </div>

        <div className="glass-panel p-4 border-l-2 border-amber-500">
          <div className="text-[10px] font-mono text-gray-400 uppercase">VRU Hazards</div>
          <div className="text-xl font-bold text-amber-400 font-mono mt-1">{perceptionStats.vruCount} Detected</div>
          <div className="text-[10px] font-mono text-gray-500">Pedestrian / Cyclist</div>
        </div>

        <div className="glass-panel p-4 border-l-2 border-cyan-500">
          <div className="text-[10px] font-mono text-gray-400 uppercase">ANPR Plate Recognitions</div>
          <div className="text-xl font-bold text-cyan-400 font-mono mt-1">{perceptionStats.anprCount} OCR Events</div>
          <div className="text-[10px] font-mono text-gray-500">YOLOv8 + PaddleOCR</div>
        </div>

        <div className="glass-panel p-4 border-l-2 border-blue-500">
          <div className="text-[10px] font-mono text-gray-400 uppercase">Waterlogging Severity</div>
          <div className="text-xl font-bold text-blue-400 font-mono mt-1">{perceptionStats.waterloggingSeverity}</div>
          <div className="text-[10px] font-mono text-gray-500">YOLOv8-Seg Flood Mask</div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE GRID: MEDIA PREVIEW + SIDE INSPECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT 2 COLUMNS: INPUT SELECTION & MEDIA PREVIEW */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Input Source Bar */}
          <div className="glass-panel p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-xs text-gray-300">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>INPUT SOURCE:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setInputSource('webcam')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                  inputSource === 'webcam'
                    ? 'bg-emerald-500 text-zinc-950 font-semibold shadow-lg shadow-emerald-500/20'
                    : 'bg-zinc-900/90 text-gray-300 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Live Webcam
              </button>

              <button
                onClick={() => setInputSource('image')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                  inputSource === 'image'
                    ? 'bg-emerald-500 text-zinc-950 font-semibold shadow-lg shadow-emerald-500/20'
                    : 'bg-zinc-900/90 text-gray-300 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Image
              </button>

              <button
                onClick={() => setInputSource('video')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                  inputSource === 'video'
                    ? 'bg-emerald-500 text-zinc-950 font-semibold shadow-lg shadow-emerald-500/20'
                    : 'bg-zinc-900/90 text-gray-300 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Upload Video
              </button>
            </div>
          </div>

          {/* Media Preview Container */}
          <div ref={containerRef} className="glass-panel p-4 relative overflow-hidden min-h-[440px] flex flex-col justify-between border-zinc-800 bg-zinc-950/90">
            
            {/* Top Canvas Bar Overlay */}
            <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
              <div className="bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-md border border-zinc-800 text-xs font-mono text-emerald-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>SOURCE: {inputSource.toUpperCase()}</span>
              </div>

              <div className="bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-md border border-zinc-800 text-xs font-mono text-gray-400 flex items-center gap-3">
                {isAiRunning && (
                  <span className="text-emerald-400">LATENCY: {perceptionStats.lastLatencyMs}ms</span>
                )}
                <span>1280 × 720 px</span>
              </div>
            </div>

            {/* Main Video / Preview Area */}
            <div className="relative w-full h-[380px] my-auto bg-black rounded-lg overflow-hidden flex items-center justify-center border border-zinc-800">
              
              {/* 1. WEBCAM DISPLAY */}
              {inputSource === 'webcam' && (
                <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${webcamState.status === 'active' ? 'block' : 'hidden'}`}
                  />

                  {/* Scanning HUD Overlay Line when AI is running */}
                  {isAiRunning && webcamState.status === 'active' && (
                    <div className="absolute inset-0 pointer-events-none border border-emerald-500/30 z-10">
                      <div className="w-full h-0.5 bg-emerald-500/70 shadow-[0_0_15px_#10b981] animate-scanline"></div>
                    </div>
                  )}

                  {/* Webcam Status Messages */}
                  {webcamState.status === 'requesting' && (
                    <div className="text-center p-6 space-y-3">
                      <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                      <p className="text-sm font-mono text-gray-300">Requesting camera access...</p>
                    </div>
                  )}

                  {webcamState.status === 'denied' && (
                    <div className="text-center p-6 max-w-md bg-zinc-900/90 border border-red-500/40 rounded-xl space-y-3">
                      <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                      <h3 className="text-base font-semibold text-white">Camera Access Denied</h3>
                      <p className="text-xs text-gray-300">{webcamState.errorMsg}</p>
                      <button
                        onClick={startWebcamStream}
                        className="px-4 py-2 bg-emerald-500 text-zinc-950 font-semibold text-xs rounded-lg hover:bg-emerald-400"
                      >
                        Retry Permission
                      </button>
                    </div>
                  )}

                  {webcamState.status === 'idle' && (
                    <div className="text-center p-6 space-y-3">
                      <Camera className="w-10 h-10 text-gray-500 mx-auto" />
                      <p className="text-sm font-mono text-gray-400">Webcam stream stopped</p>
                      <button
                        onClick={startWebcamStream}
                        className="px-4 py-2 bg-emerald-500 text-zinc-950 font-semibold text-xs rounded-lg hover:bg-emerald-400"
                      >
                        Start Camera
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 2. IMAGE UPLOAD PREVIEW */}
              {inputSource === 'image' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 relative">
                  {mediaPreviewUrl ? (
                    <img ref={previewImgRef} src={mediaPreviewUrl} alt="Uploaded source" className="max-h-full max-w-full object-contain rounded" />
                  ) : (
                    <label className="cursor-pointer text-center p-8 border-2 border-dashed border-zinc-700 hover:border-emerald-500 rounded-xl transition-all w-3/4">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-200">Select Image File</p>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (Max 25MB)</p>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}
                </div>
              )}

              {/* 3. VIDEO UPLOAD PREVIEW */}
              {inputSource === 'video' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 relative">
                  {mediaPreviewUrl ? (
                    <video src={mediaPreviewUrl} controls className="max-h-full max-w-full object-contain rounded" />
                  ) : (
                    <label className="cursor-pointer text-center p-8 border-2 border-dashed border-zinc-700 hover:border-emerald-500 rounded-xl transition-all w-3/4">
                      <Video className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-200">Select Video File</p>
                      <p className="text-xs text-gray-500 mt-1">MP4, WEBM, MOV (Max 100MB)</p>
                      <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}
                </div>
              )}

              {/* ── SVG REAL MODEL BOUNDING BOX & GEOMETRY OVERLAY LAYER ── */}
              {activeOverlays.length > 0 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  {activeOverlays.map((ov, i) => {
                    if (!ov.bbox || ov.bbox.length < 4) return null;
                    const [x1, y1, x2, y2] = ov.bbox;
                    const width = Math.max(10, x2 - x1);
                    const height = Math.max(10, y2 - y1);

                    // Colors based on pipeline domain
                    let strokeColor = '#10b981'; // emerald for traffic
                    let fillColor = 'rgba(16, 185, 129, 0.15)';

                    if (ov.model === 'vru_safety') {
                      strokeColor = '#f59e0b'; // amber for VRU
                      fillColor = 'rgba(245, 158, 11, 0.15)';
                    } else if (ov.model === 'anpr') {
                      strokeColor = '#06b6d4'; // cyan for ANPR
                      fillColor = 'rgba(6, 182, 212, 0.2)';
                    } else if (ov.model === 'waterlogging') {
                      strokeColor = '#3b82f6'; // blue for waterlogging
                      fillColor = 'rgba(59, 130, 246, 0.35)'; // segmentation fill geometry
                    }

                    return (
                      <g key={`ov-${i}`}>
                        {/* Box Geometry */}
                        <rect
                          x={`${(x1 / 1280) * 100}%`}
                          y={`${(y1 / 720) * 100}%`}
                          width={`${(width / 1280) * 100}%`}
                          height={`${(height / 720) * 100}%`}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth="2"
                          rx="4"
                        />
                        {/* Label Badge */}
                        <text
                          x={`${(x1 / 1280) * 100}%`}
                          y={`${Math.max(15, (y1 / 720) * 100 - 1.5)}%`}
                          fill="#ffffff"
                          fontSize="11"
                          fontFamily="monospace"
                          fontWeight="bold"
                          className="drop-shadow-md"
                        >
                          {ov.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}

            </div>

            {/* Bottom Controls Bar */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
              <div className="flex items-center gap-2">
                {inputSource === 'webcam' && (
                  webcamState.status === 'active' ? (
                    <button
                      onClick={stopWebcamStream}
                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-lg text-xs font-medium flex items-center gap-2"
                    >
                      <Square className="w-3.5 h-3.5" /> Stop Camera
                    </button>
                  ) : (
                    <button
                      onClick={startWebcamStream}
                      className="px-3 py-1.5 bg-emerald-500 text-zinc-950 font-semibold rounded-lg text-xs flex items-center gap-2 hover:bg-emerald-400"
                    >
                      <Play className="w-3.5 h-3.5" /> Start Camera
                    </button>
                  )
                )}
              </div>

              {/* Real AI Inference Controls */}
              <div className="flex items-center gap-2">
                {!isAiRunning ? (
                  <button
                    onClick={() => setIsAiRunning(true)}
                    className="px-4 py-1.5 bg-emerald-500 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-2 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Start AI Inference
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAiRunning(false)}
                    className="px-4 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold rounded-lg text-xs flex items-center gap-2 hover:bg-amber-500/30"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" /> Pause AI
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: MODEL SELECTION GRID & LIVE INSPECTOR */}
        <div className="space-y-4">
          
          {/* Model Selection Panel */}
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white uppercase font-mono">Model Pipelines (6)</h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">4 Connected</span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {SYSTEM_MODELS.map((model) => {
                const isConnected = model.status !== 'NOT CONNECTED';
                const isSelected = selectedModels.includes(model.id) && isConnected;
                const currentStatus = modelStatuses[model.id] || model.status;
                const IconComponent = model.icon;

                return (
                  <div
                    key={model.id}
                    onClick={() => toggleModelSelect(model.id)}
                    className={`p-3 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                      !isConnected
                        ? 'bg-zinc-950/40 border-zinc-800/40 opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-zinc-900/90 border-emerald-500/40 shadow-sm cursor-pointer'
                        : 'bg-zinc-950/60 border-zinc-800/80 opacity-70 hover:opacity-100 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-md mt-0.5 ${
                        !isConnected
                          ? 'bg-zinc-900 text-zinc-600'
                          : isSelected
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-gray-400'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-white">{model.name}</h3>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            currentStatus === 'RUNNING'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 animate-pulse'
                              : currentStatus === 'READY'
                              ? 'bg-zinc-800 text-emerald-400'
                              : 'bg-zinc-900 text-gray-500'
                          }`}>
                            {currentStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{model.description}</p>
                        <div className="text-[10px] font-mono text-zinc-500 mt-1">
                          Weight: <span className="text-gray-400">{model.weightsPath}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Detection Stream Panel */}
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white uppercase font-mono">Live Detection Feed</h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">{eventFeed.length} Events</span>
            </div>

            {/* Event List Stream */}
            {eventFeed.length > 0 ? (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 font-mono text-xs">
                {eventFeed.map(ev => (
                  <div key={ev.id} className={`p-2 rounded border flex items-start justify-between gap-2 ${
                    ev.severity === 'critical'
                      ? 'bg-red-950/40 border-red-500/40 text-red-200'
                      : ev.severity === 'warning'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                      : 'bg-zinc-900/60 border-zinc-800 text-gray-300'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-emerald-400">{ev.time}</span>
                        <span className="text-[10px] px-1 bg-zinc-800 text-cyan-300 rounded">{ev.pipeline}</span>
                      </div>
                      <p className="text-[11px] text-gray-200 mt-1">{ev.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-zinc-950/60 rounded-lg border border-zinc-800/60 space-y-2">
                <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin mx-auto opacity-40" />
                <p className="text-xs font-mono text-gray-400">Waiting for AI inference stream...</p>
                <p className="text-[11px] text-zinc-500">Real model detections will populate here when AI is started.</p>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
